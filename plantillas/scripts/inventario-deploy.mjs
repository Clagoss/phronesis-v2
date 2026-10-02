#!/usr/bin/env node
// Phronesis v2 — inventario de deploy: ¿queda algo fuera del merge? (protocolo de deploy, F1)
//
// POR QUÉ EXISTE. Un protocolo que dice QUÉ revisar —worktrees, ramas, sueltos— y confía en que
// quien lo corre se acuerde de mirar todo, falla de dos formas: trabajo hecho que nunca llega al
// repo, y trabajo que queda fuera del deploy sin que nadie lo decida. Este script hace el barrido
// completo, de forma determinista, y CLASIFICA cada cosa pendiente: o va en el lote, o está
// declarada fuera con su motivo en el registro de exclusiones, o es un hallazgo que frena.
//
// Solo lee. No escribe, no commitea, no mergea, no borra.
//
// Uso (desde cualquier carpeta del repo):
//   node scripts/ops/inventario-deploy.mjs                      sale 1 si algo frena
//   node scripts/ops/inventario-deploy.mjs --json
//   node scripts/ops/inventario-deploy.mjs --config otra/ruta.json
//
// Configuración: docs/ops/deploy.json (ver plantillas/deploy.json de Phronesis v2). Lo que no esté
// configurado se reporta como "no consultado"; nunca se da por bueno en silencio.
// Requiere `git`, y `gh` autenticado para PRs y CI.

import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const JSON_OUT = args.includes("--json");
const iCfg = args.indexOf("--config");

const sh = (cmd, a, cwd) => {
  try {
    return execFileSync(cmd, a, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null;
  }
};
const RAIZ = sh("git", ["rev-parse", "--show-toplevel"], process.cwd());
if (!RAIZ) { console.error("✗ no estoy dentro de un repo git"); process.exit(2); }

const CFG_PATH = resolve(RAIZ, iCfg >= 0 ? args[iCfg + 1] : "docs/ops/deploy.json");
if (!existsSync(CFG_PATH)) {
  console.error(`✗ falta la configuración ${CFG_PATH}\n  Copia plantillas/deploy.json de Phronesis v2 y ajústala.`);
  process.exit(2);
}
const cfg = JSON.parse(readFileSync(CFG_PATH, "utf8"));
const PROD = cfg.rama_produccion ?? "main";
const INTEG = cfg.rama_integracion ?? "staging";
const SALUD = process.env.PH_HEALTH_URL || cfg.url_salud || null;
const CAMPO_COMMIT = cfg.campo_commit ?? "commit";
const RUTAS_CODIGO = cfg.rutas_codigo ?? ["src/"];
const RE_MIGRACION = cfg.patron_migraciones ? new RegExp(cfg.patron_migraciones) : null;
const SENSIBLES = (cfg.rutas_sensibles ?? []).map((s) => ({ nivel: s.nivel, area: s.area, re: new RegExp(s.patron, s.flags ?? "") }));
const RE_AJENOS = cfg.proyectos_ajenos?.length ? new RegExp(cfg.proyectos_ajenos.join("|"), "i") : null;
const ruta = (k, def) => (cfg[k] === null ? null : resolve(RAIZ, cfg[k] ?? def));

const git = (...a) => sh("git", a, RAIZ);
const gitIn = (dir, ...a) => sh("git", ["-C", dir, ...a], RAIZ);
const gh = (...a) => sh("gh", a, RAIZ);
const lineas = (s) => (s ? s.split("\n").filter(Boolean) : []);
const leerJson = (p) => { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; } };

// ── Registro de lo que queda fuera a propósito ─────────────────────────────────────────
// Lo que NO está acá y está pendiente, frena. Que "fuera del lote" sea una decisión escrita con
// motivo, y no algo que se olvidó.
const LEDGER_PATH = ruta("registro_exclusiones", "docs/ops/fuera-del-lote.json");
const ledger = (LEDGER_PATH && existsSync(LEDGER_PATH) && leerJson(LEDGER_PATH)) || { ramas: [], prs: [] };
const ramaDeclarada = (n) => (ledger.ramas ?? []).find((r) => r.nombre === n);
const prDeclarado = (n) => (ledger.prs ?? []).find((p) => Number(p.numero) === Number(n));

const hallazgos = []; // { nivel: "frena" | "revisar" | "info", area, que, detalle? }
const frena = (area, que, detalle) => hallazgos.push({ nivel: "frena", area, que, detalle });
const revisar = (area, que, detalle) => hallazgos.push({ nivel: "revisar", area, que, detalle });
const info = (area, que, detalle) => hallazgos.push({ nivel: "info", area, que, detalle });

if (LEDGER_PATH && existsSync(LEDGER_PATH) && !leerJson(LEDGER_PATH)) revisar("exclusiones", `${LEDGER_PATH} no se pudo leer`);
git("fetch", "--all", "--prune", "--quiet");

// ── A. Las dos ramas ───────────────────────────────────────────────────────────────────
const faltan = [PROD, INTEG].filter((r) => git("rev-parse", "--verify", "--quiet", `origin/${r}`) === null);
if (faltan.length) frena("ramas", `no existe en el remoto: ${faltan.map((r) => `origin/${r}`).join(", ")}`, "revisa rama_produccion y rama_integracion en la configuración, o haz el primer push");
const [soloProd, soloInteg] = (git("rev-list", "--left-right", "--count", `origin/${PROD}...origin/${INTEG}`) ?? "? ?")
  .split(/\s+/).map(Number);
const integContieneProd = git("merge-base", "--is-ancestor", `origin/${PROD}`, `origin/${INTEG}`) !== null;
const ramas = { soloProd, soloInteg, integContieneProd };
if (!faltan.length && !integContieneProd) {
  // Normal entre deploys si hay rutinas que empujan a producción. Se resuelve mergeando producción
  // en integración (F7). Solo frena si producción trae CÓDIGO que integración no tiene.
  const codigoSoloEnProd = git("diff", "--stat", `origin/${INTEG}...origin/${PROD}`, "--", ...RUTAS_CODIGO);
  if (codigoSoloEnProd) frena("ramas", `${PROD} tiene código que ${INTEG} no tiene`, codigoSoloEnProd.split("\n").pop());
  else info("ramas", `${PROD} tiene ${soloProd} commit(s) fuera del código que ${INTEG} no tiene — se bajan en F7`);
}

// ── B. Worktrees: sueltos y sin pushear ────────────────────────────────────────────────
const worktrees = [];
for (const bloque of (git("worktree", "list", "--porcelain") ?? "").split("\n\n").filter(Boolean)) {
  const dir = bloque.match(/^worktree (.+)$/m)?.[1];
  const rama = bloque.match(/^branch refs\/heads\/(.+)$/m)?.[1] ?? null;
  const detached = /^detached$/m.test(bloque);
  if (!dir) continue;
  const nombre = dir.replace(/^.*\//, "");
  // Una carpeta movida o borrada a mano deja el worktree registrado en una ruta que ya no existe:
  // `git status` ahí no devuelve nada y se leería como "0 sueltos", con todo en orden.
  if (/^prunable/m.test(bloque) || !existsSync(dir)) {
    worktrees.push({ ruta: dir, rama, detached, perdido: true, sueltos: 0, sinPushear: 0, archivos: [] });
    frena("worktrees", `${nombre} [${rama ?? "detached"}] no está en disco`,
      "git lo tiene registrado en una ruta que ya no existe: lo que tenga sin commitear no se ve. Ubica la carpeta y corre `git worktree repair <ruta nueva>`, o `git worktree prune` si se descartó");
    continue;
  }
  // `sh` recorta la salida: la primera línea pierde su espacio inicial (" M x" → "M x"), así que
  // cortar tres caracteres fijos se come la primera letra del archivo. Se corta el código de estado.
  const st = lineas(gitIn(dir, "status", "--porcelain"));
  const archivo = (l) => l.replace(/^\s*\S{1,2}\s+/, "");
  const sinPushear = rama ? Number(gitIn(dir, "rev-list", "--count", "@{u}..HEAD") ?? 0) : 0;
  const w = { ruta: dir, rama, detached, sueltos: st.length, sinPushear, archivos: st.map(archivo) };
  worktrees.push(w);
  if (st.length) frena("worktrees", `${nombre} [${rama ?? "detached"}]: ${st.length} archivo(s) sin commitear`, w.archivos.slice(0, 4).join(", "));
  if (sinPushear) frena("worktrees", `${nombre} [${rama}]: ${sinPushear} commit(s) sin pushear`);
  if (detached) frena("worktrees", `${nombre} está en HEAD separado`, "un worktree sin rama no tiene adónde empujar su trabajo");
}

// ── C. Stashes ─────────────────────────────────────────────────────────────────────────
const stashes = lineas(git("stash", "list"));
if (stashes.length) revisar("stashes", `${stashes.length} stash(es) guardado(s)`, stashes.slice(0, 3).join(" · "));

// ── D. Commits locales que no están en ningún remoto ───────────────────────────────────
const huerfanos = lineas(git("log", "--branches", "--not", "--remotes", "--oneline"));
if (huerfanos.length) frena("commits", `${huerfanos.length} commit(s) local(es) que no están en ningún remoto`, huerfanos.slice(0, 3).join(" · "));

// ── E. Ramas remotas con trabajo que no está en el lote ────────────────────────────────
const remotas = [];
for (const r of lineas(git("branch", "-r", "--no-merged", `origin/${INTEG}`, "--format=%(refname:short)"))) {
  const nombre = r.replace(/^origin\//, "");
  if (nombre === "HEAD" || nombre === PROD || r === "origin") continue;
  const propios = Number(git("rev-list", "--count", `origin/${INTEG}..${r}`) ?? 0);
  const ultimo = git("log", "-1", "--format=%cs %s", r) ?? "";
  const declarada = ramaDeclarada(nombre);
  remotas.push({ nombre, propios, ultimo, declarada: !!declarada });
  if (declarada) info("ramas", `${nombre}: ${propios} commit(s) fuera del lote, declarado`, declarada.motivo);
  else frena("ramas", `${nombre}: ${propios} commit(s) que no están en ${INTEG} y nadie declaró fuera`, ultimo);
}
const borrables = lineas(git("branch", "-r", "--merged", `origin/${INTEG}`, "--format=%(refname:short)"))
  .map((r) => r.replace(/^origin\//, ""))
  .filter((n) => n && n !== "HEAD" && n !== PROD && n !== INTEG && n !== "origin");
if (borrables.length) info("ramas", `${borrables.length} rama(s) ya mergeada(s), se pueden borrar con permiso`, borrables.join(", "));

// ── F. PRs abiertos ────────────────────────────────────────────────────────────────────
const prsRaw = gh("pr", "list", "--state", "open", "--json", "number,headRefName,baseRefName,title,mergeable");
let prs = [];
if (prsRaw === null) revisar("prs", "no se pudo consultar GitHub (¿gh autenticado?)");
else {
  prs = JSON.parse(prsRaw);
  for (const p of prs) {
    if (p.headRefName === INTEG && p.baseRefName === PROD) continue;
    if (prDeclarado(p.number)) info("prs", `#${p.number} [${p.headRefName}] fuera del lote, declarado`, prDeclarado(p.number).motivo);
    else frena("prs", `#${p.number} [${p.headRefName}→${p.baseRefName}] abierto y no declarado`, p.title);
  }
}

// ── G. CI del PR y despliegue de integración ───────────────────────────────────────────
const shaInteg = git("rev-parse", `origin/${INTEG}`);
const ci = (() => {
  const raw = gh("pr", "list", "--state", "open", "--base", PROD, "--head", INTEG, "--json", "number,headRefOid,statusCheckRollup");
  if (raw === null) return { consultado: false };
  const pr = JSON.parse(raw)[0];
  if (!pr) return { consultado: true, sinPR: true };
  const checks = (pr.statusCheckRollup ?? []).map((c) => ({ nombre: c.name ?? c.context, status: c.status ?? c.state, conclusion: c.conclusion ?? c.state }));
  const enCurso = checks.filter((c) => c.status && !/COMPLETED|SUCCESS|FAILURE|ERROR/i.test(c.status));
  const fallidos = checks.filter((c) => /FAILURE|ERROR|CANCELLED|TIMED_OUT/i.test(c.conclusion ?? ""));
  return { consultado: true, pr: pr.number, alDia: pr.headRefOid === shaInteg, checks: checks.length, enCurso: enCurso.length, fallidos: fallidos.map((c) => c.nombre) };
})();
if (!ci.consultado) revisar("ci", "no se pudo consultar el CI del PR");
else if (ci.sinPR) revisar("ci", `no hay PR ${INTEG}→${PROD} abierto todavía — se abre en F7 y sus checks se esperan ahí`);
else if (!ci.alDia) revisar("ci", `el PR #${ci.pr} todavía no tiene la punta de ${INTEG} (${shaInteg?.slice(0, 7)})`);
else if (ci.fallidos.length) frena("ci", `el PR #${ci.pr} tiene checks en rojo: ${ci.fallidos.join(", ")}`);
else if (ci.enCurso) revisar("ci", `el PR #${ci.pr} tiene ${ci.enCurso} check(s) todavía corriendo`);

// El workflow que despliega integración suele ignorar la documentación: se compara contra el
// último commit que toca otra cosa, o daría "sin corrida" cada vez que lo último fue un .md.
const WF_INTEG = cfg.workflow_integracion ?? null;
const ignorados = (cfg.ignorar_en_integracion ?? ["docs/**", "*.md", "**/*.md"]).map((p) => `:(exclude)${p}`);
const ultimoCodigo = git("log", "-1", "--format=%H", `origin/${INTEG}`, "--", ".", ...ignorados);
let stg = { consultado: false };
if (!WF_INTEG) info("integración", "sin workflow_integracion configurado: no se verifica el despliegue del ambiente de integración");
else if (ultimoCodigo) {
  const raw = gh("run", "list", "--workflow", WF_INTEG, "--branch", INTEG, "--limit", "30", "--json", "headSha,status,conclusion");
  if (raw !== null) {
    const r = JSON.parse(raw).find((x) => x.headSha === ultimoCodigo);
    stg = { consultado: true, existe: !!r, status: r?.status, conclusion: r?.conclusion };
  }
  if (!stg.consultado) revisar("integración", `no se pudo consultar ${WF_INTEG}`);
  else if (!stg.existe) revisar("integración", `el ambiente de integración no se desplegó con el último commit de código (${ultimoCodigo.slice(0, 7)})`,
    "los pushes hechos con GITHUB_TOKEN no disparan workflows: si lo empujó una rutina, verifica en local");
  else if (stg.status === "completed" && stg.conclusion !== "success") frena("integración", `${WF_INTEG} sobre ${ultimoCodigo.slice(0, 7)} terminó ${stg.conclusion}`);
}

// ── H. Deudas abiertas que esperan este merge ──────────────────────────────────────────
// Un paso que depende del merge y vive solo en prosa es un paso que se olvida. No frena —el patrón
// da falsos positivos— pero cada una se LEE antes de la puerta.
const esperanMerge = [];
{
  const p = ruta("registro_deudas", "docs/DEUDAS.md");
  const deudas = p && existsSync(p) ? readFileSync(p, "utf8") : "";
  const pat = /listo para (el )?deploy|orden del merge|al mergear|despu[eé]s del (merge|deploy)|esper\w* (el|al) (merge|deploy)|cuando (esto )?llegue a prod|aplicar .{0,40}despu[eé]s/i;
  for (const l of deudas.split("\n")) {
    if (!/^\| ?D-/.test(l)) continue;
    const c = l.split(" | ");
    const estado = (c[c.length - 1] ?? "").replace(/\|\s*$/, "").trim();
    if (/^(⏳|🔴|🟡|Abierta|Pendiente)/.test(estado) && pat.test(l)) {
      esperanMerge.push({ id: c[0].replace("|", "").trim(), tema: (c[1] ?? "").replace(/[*`~]/g, "").trim().slice(0, 90) });
    }
  }
  if (esperanMerge.length) revisar("deudas", `${esperanMerge.length} deuda(s) abiertas hablan del merge — leerlas antes de la puerta`, esperanMerge.map((d) => d.id).join(", "));
}

// ── I. El lote: tamaño, riesgo y antigüedad ────────────────────────────────────────────
const commits = lineas(git("log", "--no-merges", "--format=%h%x09%ct%x09%s", `origin/${PROD}..origin/${INTEG}`))
  .map((l) => { const [h, t, ...s] = l.split("\t"); return { h, t: Number(t), s: s.join("\t") }; });
const archivos = lineas(git("diff", "--name-only", `origin/${PROD}...origin/${INTEG}`));
const codigo = archivos.filter((f) => RUTAS_CODIGO.some((r) => f.startsWith(r)));
const migraciones = RE_MIGRACION ? archivos.filter((f) => RE_MIGRACION.test(f)) : [];
if (!RE_MIGRACION) info("migraciones", "sin patron_migraciones configurado: no se detectan migraciones en el lote");
if (!SENSIBLES.length) revisar("riesgo", "sin rutas_sensibles configuradas: el riesgo del lote se calcula solo como nulo o bajo");

const tocadas = {};
for (const f of archivos) {
  for (const s of SENSIBLES) if (s.re.test(f)) { (tocadas[s.area] ??= { nivel: s.nivel, archivos: [] }).archivos.push(f); break; }
}
const orden = { alto: 3, medio: 2, bajo: 1, nulo: 0 };
const riesgo = Object.values(tocadas).reduce((m, t) => (orden[t.nivel] > orden[m] ? t.nivel : m), codigo.length ? "bajo" : "nulo");
const masViejo = commits.length ? Math.min(...commits.map((c) => c.t)) : null;
const leadTimeHoras = masViejo ? Math.round((Date.now() / 1000 - masViejo) / 3600) : null;

// Otros proyectos: nada de un proyecto paralelo entra al merge de este.
const ajenos = RE_AJENOS ? archivos.filter((f) => RE_AJENOS.test(f)) : [];
if (ajenos.length) frena("ajenos", `${ajenos.length} archivo(s) de otro proyecto en el diff`, ajenos.slice(0, 4).join(", "));

// ── J. Punto de retorno: a qué se vuelve si F8 sale mal ────────────────────────────────
// Se registra ANTES del merge. Saber adónde volver después de que algo se rompió, bajo presión,
// es tarde.
let vivo = null;
if (SALUD) {
  try {
    const r = await fetch(SALUD, { headers: { "user-agent": "phronesis-v2-inventario" } });
    if (r.ok) vivo = (await r.json())[CAMPO_COMMIT] ?? null;
  } catch { /* se reporta abajo */ }
}
const retorno = { shaVivo: vivo, idDespliegue: null, run: null };
const WF_PROD = cfg.workflow_produccion ?? null;
if (WF_PROD) {
  const ultimoRun = gh("run", "list", "--workflow", WF_PROD, "--status", "success", "--limit", "1", "--json", "databaseId,headSha,createdAt");
  const r = ultimoRun ? JSON.parse(ultimoRun)[0] : null;
  if (r) {
    retorno.run = r.databaseId;
    if (cfg.patron_id_despliegue) {
      const log = gh("run", "view", String(r.databaseId), "--log") ?? "";
      const re = new RegExp(cfg.patron_id_despliegue, "g");
      let m, ultimo = null;
      while ((m = re.exec(log))) ultimo = m[1] ?? m[0];
      retorno.idDespliegue = ultimo;
    }
  }
}
if (!SALUD) revisar("retorno", "sin url_salud configurada: no se puede confirmar qué versión está viva");
else if (!vivo) revisar("retorno", `no se pudo leer la versión viva en ${SALUD}`);
if (cfg.patron_id_despliegue && !retorno.idDespliegue) revisar("retorno", "no se encontró el identificador del último despliegue: el rollback tendrá que listar versiones a mano");

// ── K. ¿Toca revisar el protocolo? ─────────────────────────────────────────────────────
// La revisión se dispara sola por la primera de dos condiciones: N deploys con esta versión, o una
// fecha. Va acá porque el inventario corre en CADA deploy: es el único lugar donde un recordatorio
// no se puede perder.
let revisionProtocolo = null;
{
  const rp = ruta("revision_protocolo", "docs/ops/protocolo-revision.json");
  const mk = ruta("marcador_ultimo_deploy", "docs/ops/ultimo-deploy.json");
  if (rp && existsSync(rp)) {
    const r = leerJson(rp);
    if (!r) revisar("protocolo", `${rp} no se pudo leer`);
    else {
      const ultimo = mk && existsSync(mk) ? Number(leerJson(mk)?.numero ?? 0) : 0;
      const corridos = Math.max(0, ultimo - Number(r.ultimo_deploy_al_aprobar ?? ultimo));
      const vencePorFecha = r.revisar_el && new Date() >= new Date(`${r.revisar_el}T00:00:00`);
      const vencePorUso = corridos >= Number(r.revisar_tras_deploys ?? Infinity);
      revisionProtocolo = { version: r.version, corridos, faltan: Math.max(0, Number(r.revisar_tras_deploys) - corridos), revisarEl: r.revisar_el, toca: !!(vencePorFecha || vencePorUso) };
      if (revisionProtocolo.toca) {
        revisar("protocolo", `toca revisar el protocolo v${r.version}: ${vencePorUso ? `${corridos} deploys corridos con esta versión` : `llegó el ${r.revisar_el}`}`,
          `ver ${rp.replace(RAIZ + "/", "")} → que_revisar. Proponérselo al dueño en la puerta.`);
      }
    }
  }
}

// ── Veredicto ──────────────────────────────────────────────────────────────────────────
const nFrena = hallazgos.filter((h) => h.nivel === "frena").length;
const nRevisar = hallazgos.filter((h) => h.nivel === "revisar").length;
const veredicto = nFrena ? "INCOMPLETO" : "COMPLETO";
const resultado = {
  veredicto, frena: nFrena, revisar: nRevisar,
  ramas, worktrees, stashes: stashes.length, commitsHuerfanos: huerfanos.length,
  remotasFuera: remotas, prs: prs.map((p) => ({ numero: p.number, rama: p.headRefName, mergeable: p.mergeable })),
  lote: { commits: commits.length, archivos: archivos.length, codigo: codigo.length, migraciones, riesgo, tocadas, leadTimeHoras },
  ci, integracion: { ultimoCodigo: ultimoCodigo?.slice(0, 7), ...stg },
  esperanMerge, retorno, revisionProtocolo, hallazgos,
};

if (JSON_OUT) {
  console.log(JSON.stringify(resultado, null, 2));
  process.exit(nFrena ? 1 : 0);
}

const ico = { frena: "❌", revisar: "⚠️ ", info: "·" };
console.log(`\nINVENTARIO DE DEPLOY — ${veredicto}${nFrena ? ` (${nFrena} cosa(s) frenan)` : ""}\n`);
console.log(`Lote        ${commits.length} commits · ${codigo.length} archivos de código · ${migraciones.length} migración(es) · riesgo ${riesgo.toUpperCase()}`);
if (leadTimeHoras !== null) console.log(`Antigüedad  el commit más viejo del lote tiene ${leadTimeHoras < 48 ? leadTimeHoras + " h" : Math.round(leadTimeHoras / 24) + " días"}`);
console.log(`Ramas       ${faltan.length ? `falta ${faltan.map((r) => `origin/${r}`).join(", ")}` : `${PROD}...${INTEG} = ${soloProd} ${soloInteg} · ${INTEG} contiene ${PROD}: ${integContieneProd ? "sí" : "no"}`}`);
console.log(`Worktrees   ${worktrees.map((w) => `${w.ruta.replace(/^.*\//, "")}[${w.rama ?? "detached"}] ${w.perdido ? "NO ESTÁ EN DISCO" : `${w.sueltos} sueltos`}`).join(" · ")}`);
console.log(`Retorno     vivo ${retorno.shaVivo ?? "?"} · despliegue ${retorno.idDespliegue ?? "?"}`);
if (revisionProtocolo && !revisionProtocolo.toca) console.log(`Protocolo   v${revisionProtocolo.version} · revisión en ${revisionProtocolo.faltan} deploy(s) o el ${revisionProtocolo.revisarEl}`);
if (Object.keys(tocadas).length) {
  console.log(`\nZonas sensibles tocadas:`);
  for (const [area, t] of Object.entries(tocadas)) console.log(`  [${t.nivel}] ${area}: ${t.archivos.slice(0, 3).join(", ")}${t.archivos.length > 3 ? ` (+${t.archivos.length - 3})` : ""}`);
}
if (esperanMerge.length) {
  console.log(`\nDeudas abiertas que hablan del merge (leer cada una):`);
  for (const d of esperanMerge) console.log(`  ${d.id}  ${d.tema}`);
}
for (const nivel of ["frena", "revisar", "info"]) {
  const hs = hallazgos.filter((h) => h.nivel === nivel);
  if (!hs.length) continue;
  console.log(`\n${{ frena: "FRENAN", revisar: "REVISAR", info: "INFORMACIÓN" }[nivel]}:`);
  for (const h of hs) console.log(`  ${ico[nivel]} [${h.area}] ${h.que}${h.detalle ? `\n      ${h.detalle}` : ""}`);
}
console.log(nFrena
  ? `\nNo se mergea: cada cosa que frena se incorpora al lote, se resuelve o se declara fuera con motivo\nen el registro de exclusiones.\n`
  : `\nNada queda fuera sin una decisión escrita.\n`);
process.exit(nFrena ? 1 : 0);
