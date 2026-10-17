// Prueba de la Tanda B (alts.js): alternativas cuando una máquina no está y equipo por gimnasio, con Playwright y Edge.
// Uso (desde PowerShell): $env:PW_DIR = "<carpeta con node_modules/playwright>"; node tests/talt.mjs <copia transpilada> <copia transpilada anterior> [capturas]
// A. Dueño: en plena sesión, "Remo Sentado con Cable" → ¿Máquina ocupada? / Cambiar ejercicio: mismo músculo y patrón, primero con
//    otro equipo, peso prudente; cambiarlo; "No hay Remo sentado en polea en Roka'z": ya no se propone en las alternativas, el
//    coach semanal, el Coach de Próxima sesión ni al empezar (se cambia solo hoy); "Equipo que no hay aquí" lo deshace. Historial intacto.
// B. Usuario nuevo: cambiar un ejercicio y Entreno rápido sin la máquina que falta.
// C. Reloj: inicio idéntico y su lista de "Máquina ocupada" igual a la de la versión anterior.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = createRequire(path.join(process.env.PW_DIR || HERE, 'x.js'))('playwright');
const [DIR, OLD, SHOTS] = process.argv.slice(2);
if (!DIR || !OLD) throw new Error('Faltan las carpetas transpiladas (nueva y anterior)');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.webp': 'image/webp', '.woff2': 'font/woff2', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const serve = dir => new Promise(res => {
  const s = http.createServer((q, r) => {
    let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
    fs.readFile(path.join(dir, p), (e, b) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); r.end(b); });
  }).listen(0, '127.0.0.1', () => res(s));
});
let fail = 0;
const ok = (c, msg) => { if (c) console.log('  ok  ', msg); else { fail++; console.log('  FALLA', msg); } };
const browser = await chromium.launch({ channel: 'msedge', headless: false, args: ['--headless=new'] });
const OWNER = { owner: 1, healthOk: 1 };
const MON = new Date('2026-10-19T18:30:00');

async function open(dir, { seed, watch, at } = {}) {
  const srv = await serve(dir);
  const ctx = await browser.newContext(watch ? { viewport: { width: 410, height: 500 }, hasTouch: true } : { viewport: { width: 390, height: 844 }, hasTouch: true });
  await ctx.route(/googleapis|gstatic|google\.com|firebase/, r => r.abort());
  const p = await ctx.newPage(); p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message));
  await p.clock.setFixedTime(at || MON);
  await p.addInitScript(o => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); if (o) { localStorage.setItem('cdh.settings', JSON.stringify(o)); localStorage.setItem('cdh.newsSeen', '"n5"'); } } }, seed || null);
  await p.goto(`http://127.0.0.1:${srv.address().port}/index.html`); await p.waitForTimeout(2500);
  await p.evaluate(() => { if (state.settings.pub) state.settings.onb = 1; LS.set('newsSeen', NEWS_KEY); state.settings.healthOk = 1; savePlans(); });
  await p.reload(); await p.waitForTimeout(2200);
  p.done = async () => { await ctx.close(); srv.close(); };
  return p;
}
const shot = async (p, n) => { const b = await p.screenshot({ animations: 'disabled' }); if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); fs.writeFileSync(path.join(SHOTS, n + '.png'), b); } return b; };
async function pixDiff(a, b) {
  if (a.equals(b)) return 0;
  const p = await browser.newPage();
  const n = await p.evaluate(async ([x, y]) => {
    const load = s => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = 'data:image/png;base64,' + s; });
    const [A, B] = await Promise.all([load(x), load(y)]); if (A.width !== B.width || A.height !== B.height) return -1;
    const px = I => { const c = document.createElement('canvas'); c.width = I.width; c.height = I.height; const g = c.getContext('2d'); g.drawImage(I, 0, 0); return g.getImageData(0, 0, I.width, I.height).data; };
    const da = px(A), db = px(B); let d = 0; for (let i = 0; i < da.length; i += 4) if (da[i] !== db[i] || da[i + 1] !== db[i + 1] || da[i + 2] !== db[i + 2]) d++; return d;
  }, [a.toString('base64'), b.toString('base64')]);
  await p.close(); return n;
}
const tap = async (p, sel) => { await p.locator(sel).first().click(); await p.waitForTimeout(200); };
/* Día del plan activo que tiene "Remo Sentado con Cable" (en Roka'z) */
const DAY = () => { const pl = activePlan(), d = pl.days.find(x => x.exercises.some(e => e.name === 'Remo Sentado con Cable')); return { pid: pl.id, did: d.id, gym: pl.gymId || 'rokaz' }; };
const startPlan = r => { state.settings.nextS = Object.assign({}, state.settings.nextS, { [r.did]: { pick: 'plan' } }); savePlans(); startSession(r.pid, r.did); const d = state.draft; return d.exercises.findIndex(e => e.name === 'Remo Sentado con Cable'); };

console.log('A. Dueño en Roka\'z: Remo Sentado con Cable');
{
  const p = await open(DIR, { seed: OWNER });
  const snap0 = await p.evaluate(() => JSON.stringify(state.sessions.map(cleanSess)) + JSON.stringify(state.plans));
  const r = await p.evaluate(DAY);
  ok(r.gym === 'rokaz', 'la rutina activa es de Roka\'z');
  const i = await p.evaluate(startPlan, r); await p.waitForTimeout(300);
  ok(i >= 0, 'sesión empezada con Remo Sentado con Cable (ejercicio ' + (i + 1) + ')');
  await p.evaluate(i => busySheet(i), i); await p.waitForTimeout(200);
  const bt = await p.evaluate(() => document.getElementById('sheet').innerText);
  ok(/No hay Remo sentado en polea en Roka'z/.test(bt), '"¿Máquina ocupada?" ofrece "No hay Remo sentado en polea en Roka\'z"');
  await shot(p, 'a1-ocupada');
  await p.evaluate(i => swapSheet(i), i); await p.waitForTimeout(200);
  const L = await p.evaluate(i => { const e = state.draft.exercises[i]; return { w: workW(e), list: swapCandidates(e).map(c => ({ n: c.n, other: c.other, w: c.cv.w, how: c.cv.how, pat: libFind(c.n).pat, eq: libFind(c.n).eq, main: catMain(libFind(c.n)) })) }; }, i);
  console.log('     alternativas: ' + L.list.map(c => `${c.n} (${c.eq}, ${c.how === 'body' ? 'corporal' : '~' + c.w + ' kg'})`).join(' · '));
  ok(L.list.length >= 6 && L.list.every(c => c.main === 'esp'), 'todas trabajan espalda (mismo músculo principal)');
  ok(L.list.slice(0, 4).every(c => c.pat === 'row'), 'las primeras son remos (mismo patrón)');
  ok(L.list[0].other && L.list[0].eq !== 'remo_polea', 'primero con otro equipo');
  const db = L.list.find(c => c.eq === 'manc' && c.how === 'aprox');
  if (db) ok(db.w <= Math.floor((L.w * 0.42 / 0.8) * 0.9), `peso prudente: ${L.w} kg en polea → ~${db.w} kg por mano en ${db.n} (−10 % y hacia abajo)`);
  const txt = await p.evaluate(() => document.getElementById('sheet').innerText);
  ok(/Con otro equipo/.test(txt) && /conversión prudente/.test(txt), 'la hoja agrupa "Con otro equipo" y explica el peso');
  await shot(p, 'a2-cambiar');
  const pick = L.list[0].n;
  await tap(p, `#sheet [data-act="swap-do"][data-name="${pick}"]`);
  const sw = await p.evaluate(i => { const e = state.draft.exercises[i]; return { n: e.name, from: e.swappedFrom, w: e.log[0].w }; }, i);
  ok(sw.n === pick && sw.from === 'Remo Sentado con Cable', `cambiado en plena sesión por ${sw.n} con ${sw.w} kg`);
  /* Marcar que no hay la máquina */
  await p.evaluate(() => { discardSession(); });
  const i2 = await p.evaluate(startPlan, r); await p.waitForTimeout(300);
  const swapped = await p.evaluate(i => state.draft.exercises[i].name, i2);
  ok(swapped === 'Remo Sentado con Cable', 'sin marcar nada, la sesión trae Remo Sentado con Cable como siempre');
  await p.evaluate(i => swapSheet(i), i2); await p.waitForTimeout(200);
  await tap(p, '#sheet [data-act="alt-no"]');
  const after = await p.evaluate(i => ({ no: state.settings.gymNo, list: swapCandidates(state.draft.exercises[i]).map(c => c.n) }), i2);
  ok(after.no && after.no.rokaz && after.no.rokaz.remo_polea, 'Roka\'z: "Remo sentado en polea" marcado como que no hay');
  ok(!after.list.some(n => /Polea Baja|Remo en Polea|Remo Sentado/.test(n)), 'las alternativas ya no proponen remos en esa máquina');
  await shot(p, 'a3-marcado');
  await p.evaluate(() => { discardSession(); });
  const wc = await p.evaluate(() => wcCands('esp'));
  ok(!wc.some(n => /Remo Sentado con Cable|Remo en Polea Baja/.test(n)) && wc.length >= 4, 'el coach semanal ya no la propone: ' + wc.slice(0, 5).join(' · '));
  const wb = await p.evaluate(() => { const b = wcBuild('bombeo', 1); return b.list.map(e => e.name); });
  ok(!wb.some(n => /Remo Sentado con Cable|Remo en Polea Baja/.test(n)), '"Crear entreno para completar" tampoco: ' + wb.join(' · '));
  const co = await p.evaluate(r => { const E = nsCoachEntry(r.pid, r.did); const x = E.ex.find(x => x.swapFrom === 'Remo Sentado con Cable'); return x ? { n: x.name, why: x.why, w: x.sets[0].w } : null; }, r);
  ok(co && /No hay Remo sentado en polea en Roka'z/.test(co.why), 'Coach de Próxima sesión: ' + (co ? `${co.n} ${co.w} kg — ${co.why.slice(0, 90)}…` : 'sin cambio'));
  const st = await p.evaluate(r => { state.settings.nextS = Object.assign({}, state.settings.nextS, { [r.did]: { pick: 'coach' } }); savePlans(); startSession(r.pid, r.did); return state.draft.exercises.map(e => [e.name, e.swappedFrom || '', e.noEq || 0, e.log[0].w]); }, r);
  const rep = st.find(e => e[1] === 'Remo Sentado con Cable');
  ok(rep && rep[2] && rep[0] === co.n && rep[3] === co.w, 'al empezar con el Coach: ' + (rep ? `${rep[0]} ${rep[3]} kg en vez de Remo Sentado con Cable` : 'no se cambió'));
  await p.waitForTimeout(500);
  ok(await p.evaluate(() => [...document.querySelectorAll('#app .sw-tag')].some(t => /no hay aquí/.test(t.textContent))), 'la tarjeta dice "en vez de … (no hay aquí)"');
  await shot(p, 'a4-sesion');
  await p.evaluate(() => discardSession());
  const plan = await p.evaluate(r => findDay(r.pid, r.did).d.exercises.map(e => e.name), r);
  ok(plan.includes('Remo Sentado con Cable'), 'la rutina no cambia');
  /* Deshacer desde "¿Dónde entrenas hoy?" */
  await p.evaluate(() => { state.tab = 'train'; render(); });
  await p.evaluate(() => { const b = document.createElement('button'); b.dataset.act = 'gym-pick'; document.body.appendChild(b); b.click(); b.remove(); }); await p.waitForTimeout(200);
  ok(await p.locator('#sheet [data-act="alt-eq"]').count() === 1, '"¿Dónde entrenas hoy?" tiene "Equipo que no hay en Roka\'z (1)"');
  await tap(p, '#sheet [data-act="alt-eq"]');
  ok(await p.locator('#sheet [data-act="alt-eqt"]').count() > 40, 'lista de equipo por tipo con interruptores');
  await shot(p, 'a5-equipo');
  await tap(p, '#sheet [data-act="alt-eqt"][data-eq="remo_polea"]');
  const undo = await p.evaluate(r => ({ no: Object.keys((state.settings.gymNo || {}).rokaz || {}), co: nsCoachEntry(r.pid, r.did).ex.some(x => x.swapFrom) }), r);
  ok(!undo.no.length && !undo.co, 'marcarlo como que sí hay lo deshace (el Coach vuelve a Remo Sentado con Cable)');
  const snap1 = await p.evaluate(() => JSON.stringify(state.sessions.map(cleanSess)) + JSON.stringify(state.plans));
  ok(snap0 === snap1, 'tu historial y tus rutinas quedan intactos');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}

console.log('B. Usuario nuevo');
{
  const p = await open(DIR, {});
  const r = await p.evaluate(() => { const pl = activePlan(), d = pl.days[0]; startSession(pl.id, d.id); const e = state.draft.exercises[0]; return { n: e.name, list: swapCandidates(e).map(c => c.n + ' ~' + c.cv.w) }; });
  ok(r.list.length >= 4, `alternativas para ${r.n}: ${r.list.slice(0, 4).join(' · ')}`);
  await p.evaluate(() => swapSheet(0)); await p.waitForTimeout(200);
  await tap(p, '#sheet [data-act="swap-do"]');
  ok(await p.evaluate(() => !!state.draft.exercises[0].swappedFrom), 'cambiado');
  await p.evaluate(() => { discardSession(); gymNoSet(activeGym().id, 'prensa', true); gymNoSet(activeGym().id, 'press_pecho', true); });
  const q = await p.evaluate(() => { const out = []; for (let s = 1; s <= 12; s++) { qkBuild({ focus: 'full', mins: 45, seed: s, equip: 'gym' }).forEach(e => out.push(e.name)); qkBuild({ focus: 'legs', mins: 45, seed: s, equip: 'gym' }).forEach(e => out.push(e.name)); } return out; });
  console.log('     entreno rápido: ' + [...new Set(q)].slice(0, 12).join(' · '));
  ok(q.length > 20 && !q.includes('Prensa 45°') && !q.includes('Press de Pecho en Máquina'), 'el Entreno rápido no usa la prensa ni el press de pecho marcados');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}

console.log('C. Reloj');
{
  const at = new Date('2026-10-19T08:00:30');
  const p = await open(DIR, { seed: OWNER, watch: true, at }), q = await open(OLD, { seed: OWNER, watch: true, at });
  const d = await pixDiff(await shot(p, 'c-reloj'), await shot(q, 'c-reloj-antes'));
  ok(d === 0, 'inicio del reloj idéntico a la versión anterior' + (d ? ` (${d} píxeles)` : ''));
  const W = pg => pg.evaluate(() => { const pl = activePlan(), d = pl.days.find(x => x.exercises.some(e => e.name === 'Remo Sentado con Cable')) || pl.days[0]; startSession(pl.id, d.id); return state.draft.exercises.map(e => swapCandidates(e).slice(0, 5).map(c => c.n + ':' + c.cv.w).join(',')).join(' | '); });
  const a = await W(p), b = await W(q);
  ok(a === b, 'la lista de "Máquina ocupada" del reloj es la misma de antes');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done(); await q.done();
}

await browser.close();
console.log(fail ? `\n${fail} FALLA(S)` : '\nTodo OK');
process.exit(fail ? 1 : 0);
