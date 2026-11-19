import { OWNER_SETTINGS } from './owner-fixture.mjs';
// Prueba de arreglos.js (datos inventados): superserie creada en el entreno queda seguida y enmarcada; "Hacer ahora"
// lleva a su pareja; marcar con el peso escrito sin guardar; "Anterior" del mismo tipo de día. El reloj no cambia.
// Uso: $env:PW_DIR = "<carpeta con node_modules/playwright>"; node tests/tfix.mjs <copia transpilada> [<copia anterior>]




import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = createRequire(path.join(process.env.PW_DIR || HERE, 'x.js'))('playwright');
const [DIR, BASE] = process.argv.slice(2);
if (!DIR) throw new Error('Falta la carpeta transpilada');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.webp': 'image/webp', '.woff2': 'font/woff2', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const serve = dir => new Promise(res => {
  const s = http.createServer((q, r) => {
    let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
    fs.readFile(path.join(dir, p), (e, b) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); r.end(b); });
  }).listen(0, '127.0.0.1', () => res(s));
});
let fail = 0;
const ok = (c, msg) => { if (c) console.log('  ok  ', msg); else { fail++; console.log('  FALLA', msg); } };
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL === 'chromium' ? undefined : 'msedge', headless: process.env.PW_CHANNEL === 'chromium', args: ['--headless=new'] });

/* ---------- Datos inventados ---------- */
const T0 = Date.parse('2026-11-14T10:00:00');
const PJ = 'Pájaros (Deltoide Posterior)', PI = 'Press Inclinado con Mancuernas', RM = 'Remo con Mancuerna a una Mano', PR = 'Prensa 45°', JA = 'Jalón al Pecho', CMa = 'Curl Martillo', SB = 'Sentadilla Búlgara', PM1 = 'Peso Muerto a una Pierna';
const S = (w, r, rir) => Object.assign({ w, r }, rir != null ? { rir } : {});
const SES = (id, at, kind, ex) => ({ id, date: new Date(Date.parse(at)).toISOString(), planId: 'pA', planName: 'Rutina A', dayId: 'd1', dayName: 'Torso', gymId: 'gA', gymName: 'Gimnasio A', kind, durationSec: 3600, exercises: ex.map(([name, sets]) => ({ name, type: 'Hombros', sets })) });
const HIST = [
  SES('s2', '2026-11-12T19:00:00', 'bombeo', [[PJ, [S(5, 15, 1), S(5, 15, 1), S(5, 15, 1)]], [PI, [Object.assign(S(30, 10, 2), { drops: [S(20, 6)] })]], [RM, [S(20, 10, 2)]], [PR, [S(200, 10, 2)]], [JA, [S(50, 10, 2)]], [CMa, [S(20, 10, 1)]], [SB, [S(16, 10, 2)]], [PM1, [S(12, 10, 2)]]]),
  SES('s1', '2026-11-05T19:00:00', 'bombeo', [[PJ, [S(5, 13, 2), S(5, 12, 1)]], [PI, [S(28, 10, 2)]]]),
];
const PLANS = [{ id: 'pA', name: 'Rutina A', gymId: 'gA', days: [{ id: 'd1', name: 'Torso (Bombeo)', weekday: 6, kind: 'bombeo', exercises: [
  { id: 'e1', name: PJ, type: 'Hombros', weight: 5, sets: 3, repsMin: 12, repsMax: 15, rest: 60 },
  { id: 'e2', name: PI, type: 'Pecho', weight: 30, sets: 2, repsMin: 10, repsMax: 12, rest: 90 },
  { id: 'e3', name: RM, type: 'Espalda', weight: 20, sets: 2, repsMin: 10, repsMax: 12, rest: 90 },
  { id: 'e4', name: PR, type: 'Piernas', weight: 200, sets: 2, repsMin: 10, repsMax: 12, rest: 90 }] }] }];
const GYMS = [{ id: 'gA', name: 'Gimnasio A' }];
const SET = () => { const s = Object.assign(structuredClone(OWNER_SETTINGS), { activePlanId: 'pA', activeGymId: 'gA', planByGym: { gA: 'pA' }, newsSeen: 'n6', g5Seed: 1, gymW: { gA: { db: [2.5, 5, 7.5, 10, 12], mach: 5 } }, exMax: { gA: { 'press inclinado con mancuernas': 40 } }, nextS: { d1: { pick: 'ia', ia: { at: T0 - 864e5, plan: 'pA', ex: [{ exId: 'e1', name: PJ, sets: [{ w: 5, rMin: 12, rMax: 15, rir: 1 }] }] } } } }); s.prof = Object.assign({}, s.prof, { goal: 'musculo', exp: 2, mins: 75 }); return s; };
async function open({ watch, first, dir, ls } = {}) {
  const srv = await serve(dir || DIR);
  const ctx = await browser.newContext(watch ? { viewport: { width: 410, height: 500 }, hasTouch: true } : { viewport: { width: 390, height: 844 }, hasTouch: true });
  await ctx.route(/googleapis|gstatic|google\.com|firebase|github/, r => r.abort());
  const p = await ctx.newPage(); p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message));
  await p.clock.setFixedTime(new Date(T0));
  if (!first) await p.addInitScript(([s, pl, ss, g, ls]) => { if (localStorage.getItem('cdh.seeded')) return; localStorage.setItem('cdh.seeded', '1');
    if (ls) { Object.keys(ls).forEach(k => localStorage.setItem(k, ls[k])); return; }
    localStorage.setItem('cdh.settings', JSON.stringify(s)); localStorage.setItem('cdh.plans', JSON.stringify(pl)); localStorage.setItem('cdh.sessions', JSON.stringify(ss));
    localStorage.setItem('cdh.gyms', JSON.stringify(g)); localStorage.setItem('cdh.newsSeen', '"n6"'); }, [SET(), PLANS, HIST, GYMS, ls || null]);
  await p.goto(`http://127.0.0.1:${srv.address().port}/index.html`); await p.waitForTimeout(1500);
  if (!first) await p.evaluate(() => { state.settings.healthOk = 1; state.notifPerm = 'granted'; closeSheet(); state.tab = 'train'; render(); });
  p.reload2 = async () => { await p.reload(); await p.waitForTimeout(1500); await p.evaluate(() => { closeSheet(); state.tab = 'train'; render(); }); };
  p.done = async () => { await ctx.close(); srv.close(); };
  return p;
}
const noErr = p => ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
const order = p => p.evaluate(() => state.draft.exercises.map(e => e.name));

console.log('A. Superserie creada durante el entreno');
{
  const p = await open();
  await p.evaluate(() => { startSession('pA', 'd1'); state.draft.cur = 0; g2SsSet(0, 3, false); });
  await p.waitForTimeout(400);
  const O = await order(p);
  ok(O[0] === PJ && O[1] === PR, 'la pareja queda justo después: ' + O.join(' · '));
  ok(await p.evaluate(() => { const w = document.querySelector('#sx-strip .ss-pair'); return !!w && w.querySelectorAll('.sx-th').length === 2; }), 'la fila de arriba los muestra juntos en el marco de la superserie');
  ok(await p.evaluate(() => state.draft.cur === 0 && ssMembers(state.draft, 0).join() === '0,1'), 'sigues en el mismo ejercicio y el grupo es A1-A2');
  /* Marcar toda la superserie y luego el siguiente ejercicio, con toques reales */
  for (const [i, j] of [[0, 0], [1, 0], [1, 1], [2, 0]]) {
    await p.evaluate(i => { state.draft.cur = i; render(); }, i); await p.waitForTimeout(250);
    const sel = `#app [data-act="set"][data-ex="${i}"][data-set="${j}"]`;
    await p.evaluate(s => document.querySelector(s).scrollIntoView({ block: 'center' }), sel); await p.waitForTimeout(150);
    await p.tap(sel); await p.waitForTimeout(350);
  }
  ok(await p.evaluate(() => { const x = state.draft.exercises; return x[0].log[0].done && x[1].log.every(s => s.done) && x[2].log[0].done; }), 'todas las series se pueden marcar, también después de la superserie');
  noErr(p); await p.done();
}
{
  /* La pareja elegida estaba antes: el ejercicio que estás haciendo queda primero */
  const p = await open();
  await p.evaluate(() => { startSession('pA', 'd1'); state.draft.cur = 3; g2SsSet(3, 1, false); });
  await p.waitForTimeout(300);
  const O = await order(p), cur = await p.evaluate(() => state.draft.exercises[state.draft.cur].name);
  ok(O.indexOf(PI) === O.indexOf(PR) + 1 && cur === PR, 'pareja lejana hacia atrás: quedan seguidos y sigues en el tuyo: ' + O.join(' · '));
  noErr(p); await p.done();
}
{
  /* Hacer ahora un ejercicio de una superserie: su pareja va con él */
  const p = await open();
  await p.evaluate(() => { startSession('pA', 'd1'); g2SsSet(2, 3, false); state.draft.cur = 0; const at = doNow(0, 2); render(); return at; });
  await p.waitForTimeout(300);
  const O = await order(p);
  ok(O[0] === RM && O[1] === PR && await p.evaluate(() => state.draft.cur === 0), 'Hacer ahora: el ejercicio y su pareja pasan juntos adelante: ' + O.join(' · '));
  noErr(p); await p.done();
}

console.log('B. Marcar con el peso escrito');
{
  const p = await open();
  await p.evaluate(() => { startSession('pA', 'd1'); const d = state.draft; d.cur = 1; d.exercises[1].log[0].w = ''; saveDraft(); render(); });
  await p.waitForTimeout(300);
  /* El peso aparece en la casilla pero no llegó a guardarse */
  await p.evaluate(() => { document.getElementById('w-1-0').value = '14'; markSet(1, 0); });
  await p.waitForTimeout(300);
  const s = await p.evaluate(() => state.draft.exercises[1].log[0]);
  ok(s.done && +s.w === 14, 'marca la serie con el peso que se veía (' + s.w + ')');
  noErr(p); await p.done();
}

console.log('C. "Anterior" del mismo tipo de día');
{
  const p = await open();
  const R = await p.evaluate(([PJ]) => {
    /* Un día Pesado guardado antes con el tipo equivocado (bombeo) pero con "Pesado" en el nombre */
    state.sessions.unshift({ id: 'sp', date: '2026-11-10T19:00:00.000Z', planId: 'pA', dayId: 'dP', dayName: 'Piernas (Pesado)', gymId: 'gA', kind: 'bombeo', exercises: [{ name: PJ, type: 'Hombros', sets: [{ w: 7.5, r: 8 }, { w: 7.5, r: 8 }] }] });
    state.sessions.sort((a, b) => String(b.date).localeCompare(String(a.date)));
    state.plans[0].days.push({ id: 'dP', name: 'Piernas (Pesado)', weekday: 1, kind: 'fuerza', exercises: [{ id: 'eP', name: PJ, type: 'Hombros', weight: 7.5, sets: 2, repsMin: 6, repsMax: 8, rest: 90 }] });
    saveLocal(); savePlans(); startSession('pA', 'dP'); render();
    const e = state.draft.exercises[0]; return { prev: e.prev.map(s => s.w + '×' + s.r).join(' '), pk: e.prevKind, kind: state.draft.kind };
  }, [PJ]);
  ok(R.kind === 'fuerza' && R.prev === '7.5×8 7.5×8' && !R.pk, 'día Pesado: "Anterior" es el último Pesado (no el Bombeo más reciente): ' + JSON.stringify(R));
  noErr(p); await p.done();
}

console.log('D. Reloj');
{
  const p = await open({ watch: true });
  await p.evaluate(() => { startSession('pA', 'd1'); g2SsSet(0, 3, false); });
  ok(await p.evaluate(() => isWatch() && state.draft.exercises[1].name !== state.draft.exercises[3].name), 'reloj: sin cambios (no aplica)');
  noErr(p); await p.done();
}

await browser.close();
console.log(fail ? `\n${fail} FALLAS` : '\nTodo OK');
process.exit(fail ? 1 : 0);
