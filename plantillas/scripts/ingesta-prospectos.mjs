#!/usr/bin/env node
// Puerta de ingesta de prospectos (Phronesis, plugin growth). La ÚNICA forma de agregar filas a la
// lista maestra.
//
// POR QUÉ. El prospector lee páginas de negocios desconocidos. Si además pudiera escribir la lista
// que decide a quién se le escribe, una página con una orden escondida podría meter ahí la
// dirección que quisiera, y el loop le escribiría desde tu dominio, con tu reputación. Por eso el
// prospector solo DEVUELVE candidatos en JSON, y esta puerta —código, no criterio de un modelo— los
// revisa antes de que toquen la lista (OWASP LLM01:2025: validar la salida del modelo con código).
//
// QUÉ REVISA, por candidato:
//   · la forma: campos de texto cortos, sin saltos de línea, sin el delimitador ni comillas, sin
//     caracteres invisibles, y sin marcas de instrucciones («ignora tus instrucciones», etiquetas de
//     sistema, comandos, secretos);
//   · el correo: formato válido, y del dominio del negocio o de un proveedor público (gmail…);
//   · que no esté repetido (nombre, correo o dominio) en la lista ni en la misma tanda;
//   · el tope diario;
//   · el MX del dominio: «pendiente» si recibe correo, «no» si no. Nunca escribe «sí»: eso lo
//     decide el verificador de casillas;
//   · que el correo aparezca de verdad en la página citada como fuente. Si la página no se deja
//     leer, entra como «revisar», que no se envía.
//
// Uso (la rutina guarda el JSON del prospector en un archivo; nunca lo pega en la línea de comandos):
//   node scripts/ops/ingesta-prospectos.mjs <candidatos.json> [--config=docs/ops/outreach/ingesta.json] [--dry] [--sin-red]
// El JSON es una lista (o {"candidatos": [...]}) de objetos con: nombre, rubro, zona, sitio, correo,
// fuente (la URL donde aparece el correo) y descripcion. Sale 0 aunque rechace candidatos (es lo
// normal); 2 si no puede leer la configuración, los candidatos o la lista.

import { lookup as dnsLookup } from "node:dns";
import { promises as dns } from "node:dns";
import { existsSync, readFileSync, writeFileSync, appendFileSync, mkdirSync } from "node:fs";
import http from "node:http";
import https from "node:https";
import { isIP } from "node:net";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const POR_DEFECTO = {
  lista: "docs/ops/outreach/prospectos.csv",
  delimitador: ";",
  prefijo_id: "p",
  tope_diario: 5,
  verificar_en_fuente: true,
  // Columna de la lista → de dónde sale: un campo del candidato, «$id» (correlativo), «$mx» (lo que
  // dijo el MX), «$fecha» (hoy, AAAA-MM-DD) o «=texto» (un valor fijo).
  columnas: {
    id: "$id",
    nombre: "nombre",
    rubro: "rubro",
    zona: "zona",
    sitio: "sitio",
    correo: "correo",
    fuente: "fuente",
    descripcion: "descripcion",
    email_verificado: "$mx",
    estado: "=nuevo",
    opt_out: "=no",
    agregado: "$fecha",
  },
  proveedores_publicos: ["gmail.com", "googlemail.com", "outlook.com", "hotmail.com", "live.com", "yahoo.com", "icloud.com", "me.com", "proton.me", "protonmail.com", "gmx.com", "aol.com", "zoho.com"],
};

const LARGOS = { nombre: 120, rubro: 60, zona: 80, sitio: 200, correo: 120, fuente: 300, descripcion: 300 };
const INVISIBLES = new RegExp(`[${[[0xad], [0x34f], [0x61c], [0x200b, 0x200f], [0x202a, 0x202e], [0x2060, 0x2064], [0x2066, 0x2069], [0xfeff], [0xe0000, 0xe007f]].map(([a, b]) => (b ? `${String.fromCodePoint(a)}-${String.fromCodePoint(b)}` : String.fromCodePoint(a))).join("")}]`, "u");
const CONTROL = new RegExp(`[${String.fromCharCode(0)}-${String.fromCharCode(31)}${String.fromCharCode(127)}]`);
const MARCAS = [
  /<\s*\/?\s*(system|system-reminder|instructions?|assistant|function_calls|invoke)\b/i,
  /\b(ignore|disregard|forget|override)\b.{0,40}\b(previous|prior|above|all|earlier|your)\b.{0,20}\b(instructions?|rules|prompts?)/i,
  /\b(ignora|olvida|desobedece|omite|anula)\b.{0,40}\b(instrucciones|reglas|indicaciones|órdenes|ordenes)\b/i,
  /bypass\s*(de\s*)?permis|bypasspermissions|dangerously-skip/i,
  /\b(you are now|from now on you|ahora eres|a partir de ahora (eres|debes))\b/i,
  /\b(run|execute|ejecuta|corre)\b.{0,30}\b(this|the following|el siguiente|este)\b.{0,20}\b(command|comando|script|bash)\b|curl\s+[^\n]{0,200}\|\s*(ba)?sh\b/i,
  /(\.env\b|service[_ ]role|api[_ ]?key|secret[_ ]?key|private[_ ]?key|access[_ ]?token)/i,
];
const CORREO = /^[a-z0-9._%+-]+@((?:[a-z0-9-]+\.)+[a-z]{2,})$/i;

const DIACRITICOS = new RegExp(`[${String.fromCharCode(0x300)}-${String.fromCharCode(0x36f)}]`, "g");
const sinTildes = (t) => t.normalize("NFD").replace(DIACRITICOS, "");
const claveNombre = (t) => sinTildes(String(t ?? "").toLowerCase()).replace(/[^a-z0-9]/g, "");
const hostDe = (url) => {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
};

/** Un campo de texto limpio, o un motivo de rechazo. */
function campo(nombreCampo, valor, delimitador) {
  if (valor == null || valor === "") return { valor: "" };
  if (typeof valor !== "string") return { error: `${nombreCampo} no es texto` };
  const t = valor.normalize("NFC").trim();
  if (CONTROL.test(t)) return { error: `${nombreCampo} trae saltos de línea o caracteres de control` };
  if (INVISIBLES.test(t)) return { error: `${nombreCampo} trae caracteres invisibles` };
  if (t.includes(delimitador) || t.includes('"')) return { error: `${nombreCampo} trae el delimitador o comillas` };
  if (t.length > (LARGOS[nombreCampo] ?? 200)) return { error: `${nombreCampo} es demasiado largo` };
  if (MARCAS.some((re) => re.test(t))) return { error: `${nombreCampo} trae texto que intenta dar órdenes`, sospechoso: true };
  return { valor: t };
}

/** Revisa la forma de un candidato. Devuelve {fila} con los campos limpios o {error}. */
export function revisarCandidato(c, cfg) {
  if (!c || typeof c !== "object" || Array.isArray(c)) return { error: "no es un objeto" };
  const fila = {};
  for (const k of Object.keys(LARGOS)) {
    const r = campo(k, c[k], cfg.delimitador);
    if (r.error) return { error: r.error, sospechoso: r.sospechoso };
    fila[k] = r.valor;
  }
  if (!fila.nombre) return { error: "falta el nombre" };
  if (!fila.correo) return { error: "falta el correo (sin correo no hay a quién escribir)" };
  fila.correo = fila.correo.toLowerCase();
  const m = CORREO.exec(fila.correo);
  if (!m) return { error: "el correo no tiene un formato válido" };
  const dominio = m[1];
  for (const u of [fila.sitio, fila.fuente].filter(Boolean)) {
    let url;
    try {
      url = new URL(u);
    } catch {
      return { error: "el sitio o la fuente no es una URL" };
    }
    if (!/^https?:$/.test(url.protocol) || url.username || url.password || isIP(url.hostname.replace(/^\[|\]$/g, "")) || /^(localhost|.*\.local|.*\.internal)$/i.test(url.hostname)) {
      return { error: "el sitio o la fuente no es una dirección pública http(s)" };
    }
  }
  if (cfg.verificar_en_fuente && !fila.fuente) return { error: "falta la fuente (la página donde aparece el correo)" };
  const publico = cfg.proveedores_publicos.includes(dominio);
  const host = fila.sitio ? hostDe(fila.sitio) : null;
  const delNegocio = host && (host === dominio || host.endsWith(`.${dominio}`) || dominio.endsWith(`.${host}`));
  if (!publico && !delNegocio) return { error: "el correo no es del dominio del negocio ni de un proveedor público" };
  return { fila, dominio, publico };
}

// ---- red: MX y la fuente, sin dejar que una URL apunte a la red interna ----

/** ¿Es una IP de uso privado, local o reservado? */
export function ipPrivada(ip) {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224;
  }
  const x = ip.toLowerCase();
  if (x.startsWith("::ffff:")) return ipPrivada(x.slice(7));
  return x === "::" || x === "::1" || /^f[cd]/.test(x) || /^fe[89ab]/.test(x) || x.startsWith("ff");
}

// La IP se revisa al conectar (no antes): así un DNS que cambia entre la revisión y la conexión no
// la puede llevar a la red interna. Si el nombre resuelve a varias IP y alguna es privada, se niega.
// Node pide todas las direcciones (`all: true`) para probar IPv4 e IPv6: se le contesta igual.
const lookupSeguro = (host, opts, cb) => {
  const o = opts && typeof opts === "object" ? opts : {};
  dnsLookup(host, { ...o, all: true }, (err, lista) => {
    if (err) return cb(err);
    if (!lista.length || lista.some((x) => ipPrivada(x.address))) return cb(new Error(`${host} apunta a una IP privada`));
    if (o.all) return cb(null, lista);
    cb(null, lista[0].address, lista[0].family);
  });
};

function bajar(url, saltos = 3) {
  return new Promise((ok, mal) => {
    let u;
    try {
      u = new URL(url);
    } catch {
      return mal(new Error("URL inválida"));
    }
    if (!/^https?:$/.test(u.protocol)) return mal(new Error("solo http(s)"));
    const lib = u.protocol === "https:" ? https : http;
    const req = lib.get(u, { lookup: lookupSeguro, timeout: 8000, headers: { "user-agent": "Mozilla/5.0 (compatible; verificador de prospectos)" } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        if (!saltos) return mal(new Error("demasiadas redirecciones"));
        return bajar(new URL(res.headers.location, u).href, saltos - 1).then(ok, mal);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return mal(new Error(`HTTP ${res.statusCode}`));
      }
      let cuerpo = "";
      res.setEncoding("utf8");
      res.on("data", (d) => {
        cuerpo += d;
        if (cuerpo.length > 1_000_000) req.destroy(new Error("página demasiado grande"));
      });
      res.on("end", () => ok(cuerpo));
      res.on("error", mal);
    });
    req.on("timeout", () => req.destroy(new Error("tiempo agotado")));
    req.on("error", mal);
  });
}

async function mx(dominio) {
  try {
    return (await dns.resolveMx(dominio)).length > 0;
  } catch {
    return false;
  }
}

async function correoEnFuente(correo, fuente) {
  try {
    const html = await bajar(fuente);
    const texto = html.replace(/&#64;|&#x40;|\[at\]|\(at\)/gi, "@").toLowerCase();
    return texto.includes(correo) ? "sí" : "no";
  } catch {
    return "no se pudo leer";
  }
}

// ---- la lista ----

function leerLista(ruta, cfg) {
  if (!existsSync(ruta)) return { columnas: Object.keys(cfg.columnas), filas: [] };
  const lineas = readFileSync(ruta, "utf8").split(/\r?\n/).filter((l) => l.trim());
  if (!lineas.length) return { columnas: Object.keys(cfg.columnas), filas: [] };
  const columnas = lineas[0].split(cfg.delimitador).map((c) => c.trim());
  const filas = lineas.slice(1).map((l) => Object.fromEntries(l.split(cfg.delimitador).map((v, i) => [columnas[i], v])));
  return { columnas, filas };
}

function siguienteId(filas, prefijo) {
  let max = 0;
  for (const f of filas) {
    const m = new RegExp(`^${prefijo}(\\d+)$`).exec(String(f.id ?? ""));
    if (m) max = Math.max(max, Number(m[1]));
  }
  return () => `${prefijo}${++max}`;
}

/** Corre la puerta sobre una lista de candidatos. Devuelve lo agregado y lo rechazado. */
export async function ingresar(candidatos, cfg, { raiz = process.cwd(), dry = false, sinRed = false, hoy = new Date().toISOString().slice(0, 10) } = {}) {
  const ruta = resolve(raiz, cfg.lista);
  const { columnas, filas } = leerLista(ruta, cfg);
  const nombres = new Set(filas.map((f) => claveNombre(f.nombre)));
  const correos = new Set(filas.map((f) => String(f.correo ?? "").toLowerCase()).filter(Boolean));
  const dominios = new Set(filas.map((f) => String(f.correo ?? "").toLowerCase().split("@")[1]).filter((d) => d && !cfg.proveedores_publicos.includes(d)));
  const columnaFecha = Object.entries(cfg.columnas).find(([, v]) => v === "$fecha")?.[0];
  const deHoy = columnaFecha ? filas.filter((f) => f[columnaFecha] === hoy).length : 0;
  let cupo = Math.max(0, cfg.tope_diario - deHoy);
  const nuevoId = siguienteId(filas, cfg.prefijo_id);
  const agregados = [];
  const rechazados = [];
  for (const [i, c] of candidatos.entries()) {
    const etiqueta = typeof c?.nombre === "string" && !MARCAS.some((re) => re.test(c.nombre)) ? c.nombre.slice(0, 60) : `candidato ${i + 1}`;
    const r = revisarCandidato(c, cfg);
    if (r.error) {
      rechazados.push({ etiqueta: r.sospechoso ? `candidato ${i + 1}` : etiqueta, motivo: r.error });
      continue;
    }
    const { fila, dominio, publico } = r;
    if (nombres.has(claveNombre(fila.nombre)) || correos.has(fila.correo) || (!publico && dominios.has(dominio))) {
      rechazados.push({ etiqueta, motivo: "ya está en la lista (nombre, correo o dominio)" });
      continue;
    }
    if (cupo <= 0) {
      rechazados.push({ etiqueta, motivo: `se llegó al tope diario (${cfg.tope_diario})` });
      continue;
    }
    let estadoCorreo = "pendiente";
    if (!sinRed) {
      if (!(await mx(dominio))) estadoCorreo = "no";
      else if (cfg.verificar_en_fuente) {
        const visto = await correoEnFuente(fila.correo, fila.fuente);
        if (visto === "no") {
          rechazados.push({ etiqueta, motivo: "el correo no aparece en la página citada como fuente" });
          continue;
        }
        if (visto === "no se pudo leer") estadoCorreo = "revisar";
      }
    }
    const id = nuevoId();
    const valores = Object.fromEntries(
      Object.entries(cfg.columnas).map(([col, de]) => [col, de === "$id" ? id : de === "$mx" ? estadoCorreo : de === "$fecha" ? hoy : de.startsWith("=") ? de.slice(1) : fila[de] ?? ""]),
    );
    agregados.push({ id, etiqueta, correo: estadoCorreo, linea: columnas.map((col) => valores[col] ?? "").join(cfg.delimitador) });
    nombres.add(claveNombre(fila.nombre));
    correos.add(fila.correo);
    if (!publico) dominios.add(dominio);
    cupo -= 1;
  }
  if (!dry && agregados.length) {
    mkdirSync(dirname(ruta), { recursive: true });
    if (!existsSync(ruta) || !readFileSync(ruta, "utf8").trim()) writeFileSync(ruta, `${columnas.join(cfg.delimitador)}\n`);
    const actual = readFileSync(ruta, "utf8");
    appendFileSync(ruta, `${actual.endsWith("\n") ? "" : "\n"}${agregados.map((a) => a.linea).join("\n")}\n`);
  }
  return { agregados, rechazados, cupoRestante: cupo };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const archivo = args.find((a) => !a.startsWith("--"));
  const rutaConfig = args.find((a) => a.startsWith("--config="))?.slice(9) ?? "docs/ops/outreach/ingesta.json";
  if (!archivo) {
    console.error("Uso: ingesta-prospectos.mjs <candidatos.json> [--config=…] [--dry] [--sin-red]");
    process.exit(2);
  }
  let cfg;
  let candidatos;
  try {
    const propia = existsSync(rutaConfig) ? JSON.parse(readFileSync(rutaConfig, "utf8")) : {};
    cfg = { ...POR_DEFECTO, ...propia, columnas: propia.columnas ?? POR_DEFECTO.columnas };
    const datos = JSON.parse(readFileSync(archivo, "utf8"));
    candidatos = Array.isArray(datos) ? datos : datos?.candidatos;
    if (!Array.isArray(candidatos)) throw new Error("el JSON no trae una lista de candidatos");
  } catch (e) {
    console.error(`No se pudo leer: ${e.message}`);
    process.exit(2);
  }
  const r = await ingresar(candidatos, cfg, { dry: args.includes("--dry"), sinRed: args.includes("--sin-red") });
  console.log(`Puerta de ingesta · ${candidatos.length} candidatos${args.includes("--dry") ? " (sin escribir)" : ""}`);
  for (const a of r.agregados) console.log(`  ✓ ${a.id} · ${a.etiqueta} · correo ${a.correo}`);
  for (const x of r.rechazados) console.log(`  ✗ ${x.etiqueta} · ${x.motivo}`);
  console.log(`Agregados: ${r.agregados.length} · rechazados: ${r.rechazados.length} · cupo que queda hoy: ${r.cupoRestante}`);
}
