// Phronesis v2 — ¿esta migración se aplica AL MERGE o DESPUÉS del deploy? (protocolo de deploy, F3)
//
// POR QUÉ EXISTE. En el proyecto de origen, cada vez que una migración debía aplicarse al merge o
// después, la sesión que la escribió dejó el orden escrito en el encabezado del archivo o en su deuda,
// y no en el registro que leía el pre-flight. El chequeo fallaba y quien desplegaba la declaraba a
// mano, deploy tras deploy. La decisión ya estaba escrita: este módulo la lee donde la escribieron.
//
// Dos fuentes, en este orden:
//   1. El encabezado del archivo de migración (los comentarios de las primeras 40 líneas):
//      «SE APLICA AL MERGE», «APLICAR DESPUÉS DE QUE EL CÓDIGO ESTÉ EN PRODUCCIÓN», «EN EL MISMO
//      MOMENTO DEL MERGE»... Una línea que nombra OTRA migración no cuenta: «el candado va aparte, en
//      la 0042, y se aplica al merge» habla de la 0042, no de la migración que la contiene.
//   2. Una deuda ABIERTA del registro de deudas que nombre el número de la migración entre comillas
//      invertidas (`0042`) y diga «al merge» o «después del merge/deploy». Nombrarla para decir que
//      ya está aplicada no la declara pendiente.
//
// Lo que no se reconoce acá sigue contando como «por aplicar»: la excepción es una decisión escrita,
// solo que ahora se lee también donde la escribió quien la tomó.
//
// Lo usa inventario-deploy.mjs. Solo lee.

import { readFileSync } from "node:fs";
import { join, basename } from "node:path";

const AL_MERGE = /(se aplica|aplicar|aplica)\b[^.\n]*\bal merge\b|\bal merge\b[^.\n]*\bno antes\b|en el mismo momento del merge|apply (it )?(at|on) merge/i;
const DESPUES = /aplicar despu[eé]s|despu[eé]s de que el c[oó]digo est[eé]|se aplica despu[eé]s del (merge|deploy)|apply after (the )?(merge|deploy)/i;
const CERRADA = /^(✅|🟢)/;

/** El número de una migración: los dígitos con que empieza su nombre (`0042_algo.sql` → `0042`). */
export const numeroDe = (ruta) => basename(ruta).match(/^(\d+)/)?.[1] ?? "";

/** Lee el orden declarado en el encabezado de una migración. Devuelve { orden, detalle } o null. */
export function ordenEnArchivo(texto, numeroPropio) {
  const comentarios = texto.split("\n").slice(0, 40).filter((l) => /^\s*(--|#|\/\/|\/\*|\*)/.test(l));
  for (const l of comentarios) {
    // Otro número del mismo largo que el propio es otra migración: la línea habla de ella.
    const otros = numeroPropio
      ? [...l.matchAll(/\b(\d+)\b/g)].map((m) => m[1]).filter((n) => n.length === numeroPropio.length && n !== numeroPropio)
      : [];
    if (otros.length) continue;
    const limpio = l.replace(/^\s*(--|#|\/\/|\/\*|\*)\s*/, "").trim().slice(0, 140);
    if (DESPUES.test(l)) return { orden: "despues", detalle: limpio };
    if (AL_MERGE.test(l)) return { orden: "al_merge", detalle: limpio };
  }
  return null;
}

/** Deudas abiertas que piden aplicar una migración al merge o después: Map número → { deuda, orden }. */
export function ordenEnDeudas(textoDeudas) {
  const out = new Map();
  for (const fila of (textoDeudas ?? "").split("\n")) {
    if (!/^\| ?D-/.test(fila)) continue;
    const celdas = fila.split(" | ");
    const estado = (celdas[celdas.length - 1] ?? "").replace(/\|\s*$/, "").trim();
    if (CERRADA.test(estado)) continue;
    const alMerge = /\bal merge\b/i.test(fila);
    const despues = /despu[eé]s del (merge|deploy)/i.test(fila);
    if (!alMerge && !despues) continue;
    const id = fila.match(/^\| ?(D-\d+)/)?.[1];
    for (const m of fila.matchAll(/`(\d{3,})`/g)) {
      if (/aplicad/i.test(fila.slice(m.index, m.index + 40))) continue; // «`0041`, ya aplicada»
      if (!out.has(m[1])) out.set(m[1], { deuda: id, orden: despues && !alMerge ? "despues" : "al_merge" });
    }
  }
  return out;
}

/**
 * Para cada migración del lote (ruta relativa a la raíz del repo), ¿tiene orden declarado?
 * Devuelve Map ruta → { orden: "al_merge" | "despues", fuente: "archivo" | "deuda", detalle }.
 */
export function ordenesDeclarados(raiz, rutas, rutaDeudas) {
  let textoDeudas = "";
  try { textoDeudas = rutaDeudas ? readFileSync(rutaDeudas, "utf8") : ""; } catch { /* sin registro */ }
  const deudas = ordenEnDeudas(textoDeudas);
  const out = new Map();
  for (const ruta of rutas) {
    const numero = numeroDe(ruta);
    let texto = "";
    try { texto = readFileSync(join(raiz, ruta), "utf8"); } catch { /* borrada en el lote */ }
    const enArchivo = ordenEnArchivo(texto, numero);
    if (enArchivo) { out.set(ruta, { ...enArchivo, fuente: "archivo" }); continue; }
    const d = numero ? deudas.get(numero) : null;
    if (d) out.set(ruta, { orden: d.orden, fuente: "deuda", detalle: `${d.deuda} nombra \`${numero}\` para aplicar ${d.orden === "despues" ? "después del deploy" : "al merge"}` });
  }
  return out;
}
