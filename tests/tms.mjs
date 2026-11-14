import { OWNER_SETTINGS } from './owner-fixture.mjs';
// Prueba de la rama mejoras-sesion, con datos inventados. Solo teléfono; el reloj se compara con la versión anterior.
//  A. "Anterior" y "Hoy vs anterior" por tipo de día   B. Superserie (descanso, vuelta, botón en 4.º lugar)
//  C. Pareja recomendada   D. Fila de arriba en el orden real   E. Mapa: ejercicios recomendados
//  F. Semanas anteriores en Racha y Tu semana   G. Plan para completar la semana   H. Usuario nuevo y reloj
// Uso: $env:PW_DIR = "<carpeta con node_modules/playwright>"; node tests/tms.mjs <copia transpilada> [<copia anterior para comparar el reloj>]
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
const JUE = Date.parse('2026-11-12T10:00:00');   /* jueves */
let N = 0;
const X = (name, sets, w, type, extra) => Object.assign({ id: 'x' + (++N), name, type: type || 'Piernas', weight: w, sets, repsMin: 8, repsMax: 12, rest: 90 }, extra);
const HACK = 'Sentadilla Hack', CF = 'Curl Femoral Tumbado', TAL = 'Elevación de Talones de Pie', PRE = 'Prensa 45°', PB = 'Press Banca con Mancuernas', APE = 'Aperturas con Mancuernas', REMO = 'Remo Sentado con Cable', CB = 'Curl Bíceps', TP = 'Tríceps Polea', LAT = 'Elevaciones Laterales';
const PLAN = (ss) => [{ id: 'pA', name: 'Rutina A', gymId: 'rokaz', days: [
  { id: 'dP', name: 'Piernas (Pesado)', weekday: 1, kind: 'fuerza', exercises: [X(HACK, 3, 70), X(CF, 3, 40), X(TAL, 3, 40)] },
  { id: 'dT', name: 'Torso (Bombeo)', weekday: 3, kind: 'bombeo', exercises: [X(PB, 3, 20, 'Empuje', ss ? { ss: 1 } : {}), X(REMO, 3, 40, 'Tracción'), X(CB, 3, 12, 'Tracción'), X(TP, 3, 25, 'Empuje'), X(APE, 3, 10, 'Empuje')] },
  { id: 'dB', name: 'Piernas (Bombeo)', weekday: 5, kind: 'bombeo', exercises: [X(PRE, 3, 100), X(CF, 3, 25), X(TAL, 3, 30)] },
  { id: 'dX', name: 'Prensa (Pesado)', weekday: 6, kind: 'fuerza', exercises: [X(PRE, 3, 120), X(LAT, 3, 7, 'Empuje')] }] }];
const SES = (id, at, kind, dayId, dayName, ex, min) => ({ id, date: new Date(Date.parse(at)).toISOString(), planId: 'pA', planName: 'Rutina A', dayId, dayName, gymId: 'rokaz', gymName: 'Gimnasio A', kind, durationSec: (min || 60) * 60, exercises: ex.map(([name, sets]) => ({ name, type: 'Piernas', sets: sets.map(([w, r, rir]) => Object.assign({ w, r }, rir != null ? { rir } : {})) })) });
/* Más reciente primero. Ayer (miércoles): pecho al fallo. Lunes: pesado. Viernes pasado: bombeo. Lunes pasado: pesado */
const HIST = [
  SES('mie', '2026-11-11T19:00:00', 'bombeo', 'dT', 'Torso (Bombeo)', [[PB, [[20, 15, 1], [20, 14, 0], [20, 12, 0]]], [REMO, [[40, 15, 2], [40, 14, 2]]]], 55),
  SES('lun', '2026-11-09T19:00:00', 'fuerza', 'dP', 'Piernas (Pesado)', [[HACK, [[72.5, 8, 2], [72.5, 8, 2], [72.5, 7, 2]]], [CF, [[42.5, 10, 2], [42.5, 9, 2]]]], 62),
  SES('vie', '2026-11-06T19:00:00', 'bombeo', 'dB', 'Piernas (Bombeo)', [[PRE, [[100, 15, 2], [100, 15, 2]]], [CF, [[22.5, 18, 2], [22.5, 16, 2]]]], 48),
  SES('lu0', '2026-11-02T19:00:00', 'fuerza', 'dP', 'Piernas (Pesado)', [[HACK, [[70, 8, 2], [70, 8, 2]]], [CF, [[40, 10, 2], [40, 10, 2]]]], 60)];
const SET = () => { const s = Object.assign(structuredClone(OWNER_SETTINGS), { activePlanId: 'pA', activeGymId: 'rokaz', planByGym: { rokaz: 'pA' }, newsSeen: 'n6' }); s.prof = Object.assign({}, s.prof, { goal: 'musculo', exp: 2, mins: 75 }); return s; };

async function open({ watch, sessions, plans, first, at, dir } = {}) {
  const srv = await serve(dir || DIR);
  const ctx = await browser.newContext(watch ? { viewport: { width: 410, height: 500 }, hasTouch: true } : { viewport: { width: 390, height: 844 }, hasTouch: true });
  await ctx.route(/googleapis|gstatic|google\.com|firebase|github/, r => r.abort());
  const p = await ctx.newPage(); p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message));
  p.T = ms => p.clock.setFixedTime(new Date((at || JUE) + ms));
  await p.T(0);
  if (!first) await p.addInitScript(([s, pl, ss]) => { if (localStorage.getItem('cdh.seeded')) return; localStorage.setItem('cdh.seeded', '1');
    localStorage.setItem('cdh.settings', JSON.stringify(s)); localStorage.setItem('cdh.plans', JSON.stringify(pl)); localStorage.setItem('cdh.sessions', JSON.stringify(ss));
    localStorage.setItem('cdh.gyms', JSON.stringify([{ id: 'rokaz', name: 'Gimnasio A' }])); localStorage.setItem('cdh.newsSeen', '"n6"'); }, [SET(), plans || PLAN(), sessions || HIST]);
  await p.goto(`http://127.0.0.1:${srv.address().port}/index.html`); await p.waitForTimeout(1500);
  if (!first) await p.evaluate(() => { state.settings.healthOk = 1; state.notifPerm = 'granted'; closeSheet(); render(); });
  p.done = async () => { await ctx.close(); srv.close(); };
  return p;
}
const noErr = p => ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
const act = (p, sel) => p.evaluate(s => { const b = document.querySelector(s); if (!b) return false; b.click(); return true; }, sel);
const start = (p, day) => p.evaluate(d => { state.settings.nextS = { [d]: { pick: 'plan' } }; startSession('pA', d); render(); }, day);
const ix = (p, n) => p.evaluate(n => state.draft.exercises.findIndex(e => e.name === n), n);
/* Marca como en el teléfono: ✓ y, si se pide, el RIR con su botón */
async function mark(p, i, j, rir, w) {
  await p.evaluate(([i, j, w]) => { const s = state.draft.exercises[i].log[j]; s.w = w || 20; s.r = 10; saveDraft(); document.querySelector(`.check[data-act="set"][data-ex="${i}"][data-set="${j}"]`).click(); }, [i, j, w]);
  await p.waitForTimeout(250);
  if (rir != null) await p.evaluate(([i, j, v]) => { const b = document.querySelector(`[data-act="rir"][data-ex="${i}"][data-set="${j}"][data-v="${v}"]`); if (b) b.click(); }, [i, j, rir]);
  await p.waitForTimeout(1300);
}
const snap = p => p.evaluate(() => ({ cur: state.draft.cur, rest: state.rest ? Math.round((state.rest.end - Date.now()) / 1000) : null, page: Math.round(document.getElementById('sx-pager').scrollLeft / document.getElementById('sx-pager').clientWidth) }));
const strip = p => p.evaluate(() => [...document.querySelectorAll('#sx-strip .sx-th')].map(b => ({ i: +b.dataset.i, x: b.getBoundingClientRect().left })).sort((a, b) => a.x - b.x).map(o => o.i).join(''));

/* ---------- A. "Anterior" por tipo de día ---------- */
console.log('A. "Anterior" y "Hoy vs anterior" por tipo de día');
{
  const p = await open(); await start(p, 'dB'); await p.waitForTimeout(500);
  const A = await p.evaluate(n => { const d = state.draft, e = d.exercises.find(x => x.name === n), pg = document.querySelector(`.sx-page[data-i="${d.exercises.indexOf(e)}"]`); return { prev: e.prev.slice(0, 2).map(s => s.w + '×' + s.r).join(','), pk: e.prevKind, hd: pg.querySelectorAll('.sets > .h')[1].textContent, cell: (pg.querySelector('.sets .prev') || {}).textContent, line: [...pg.querySelectorAll('div.muted')].map(x => x.textContent).find(t => /Anterior en/.test(t)) || '' }; }, CF);
  console.log('      Curl Femoral en día de bombeo → ' + JSON.stringify(A));
  ok(A.prev === '22.5×18,22.5×16' && !A.pk, 'día de bombeo: "Anterior" es el último bombeo (22,5×18), no el pesado del lunes (42,5×10), aunque sea más reciente');
  ok(/22[.,]5/.test(A.cell) && /× 18/.test(A.cell) && A.hd === 'Anterior' && /último día de bombeo/.test(A.line), 'la tabla lo muestra y la línea dice que es tu último día de bombeo');
  await p.evaluate(() => { discardSession(); }); await start(p, 'dP'); await p.waitForTimeout(400);
  const B = await p.evaluate(n => { const e = state.draft.exercises.find(x => x.name === n); return e.prev.slice(0, 2).map(s => s.w + '×' + s.r).join(','); }, CF);
  ok(B === '42.5×10,42.5×9', 'día pesado: "Anterior" es el último pesado (42,5×10)');
  await p.evaluate(() => { discardSession(); }); await start(p, 'dX'); await p.waitForTimeout(400);
  const C = await p.evaluate(n => { const d = state.draft, e = d.exercises.find(x => x.name === n), pg = document.querySelector(`.sx-page[data-i="${d.exercises.indexOf(e)}"]`); return { prev: e.prev.slice(0, 1).map(s => s.w + '×' + s.r).join(','), pk: e.prevKind, hd: pg.querySelectorAll('.sets > .h')[1].textContent, line: [...pg.querySelectorAll('div.muted')].map(x => x.textContent).find(t => /Anterior en/.test(t)) || '' }; }, PRE);
  console.log('      Prensa en día pesado, solo con bombeo antes → ' + JSON.stringify(C));
  ok(C.prev === '100×15' && C.pk === 'bombeo' && /bombeo/.test(C.hd) && /Fue un día de bombeo/.test(C.line), 'sin ninguna del mismo tipo: muestra la última que hay y dice que fue de bombeo');
  /* Hoy vs anterior */
  const H = await p.evaluate(([cf, pre]) => { const lun = state.sessions.find(s => s.id === 'lun'), r = g3Rows(lun).find(x => x.n === cf); const fake = { id: 'f', date: new Date().toISOString(), gymId: 'rokaz', kind: 'fuerza', dayId: 'dX', dayName: 'Prensa (Pesado)', exercises: [{ name: pre, sets: [{ w: 120, r: 8 }] }] }; const q = g3Rows(fake)[0]; return { cf: r.prev, cfk: r.pk, pre: q.prev, prek: q.pk, html: g3CmpHtml(fake).replace(/<[^>]+>/g, ' '), txt: g3CmpText(fake) }; }, [CF, PRE]);
  ok(/^40×10/.test(H.cf) && !H.cfk, '"Hoy vs anterior" del lunes pesado: compara con el pesado anterior (40×10), no con el bombeo del viernes');
  ok(/^100×15/.test(H.pre) && H.prek === 'bombeo' && /fue bombeo/.test(H.html) && /\(fue bombeo\)/.test(H.txt), 'sin una vez del mismo tipo: compara con la última y dice "(fue bombeo)", también al copiar');
  noErr(p); await p.done();
}

/* ---------- B. Superserie ---------- */
console.log('B. Superserie: sin descanso de A1 a A2, descanso tras A2 y vuelta a A1');
for (const mode of ['rutina', 'a mano empezando por el segundo']) {
  const p = await open({ plans: PLAN(mode === 'rutina') }); await start(p, 'dT'); await p.waitForTimeout(500);
  let a = 0, b = 1;
  if (mode !== 'rutina') { a = 3; b = 2; await p.evaluate(() => { state.draft.cur = 3; g2SsSet(3, 2, false); }); await p.waitForTimeout(400); await p.evaluate(() => pagerGo(3, false)); await p.waitForTimeout(300); }
  const pos = await p.evaluate(a => { const P = document.querySelector(`.sx-page[data-i="${a}"] .su-pills`); return [...P.children].findIndex(x => x.classList.contains('g2-ssb')); }, a);
  ok(pos === 3, mode + ': el botón Superserie está en 4.º lugar');
  const ban = await p.evaluate(([a, b]) => [a, b].map(i => (document.querySelector(`.sx-page[data-i="${i}"] .ss-ban`) || {}).innerText || ''), [a, b]);
  ok(/sin descanso/.test(ban[0]), mode + ': el aviso del primero dice que pasas al otro sin descanso');
  const log = []; let clk = 0;
  for (let j = 0; j < 2; j++) {
    await p.T(clk += 40000); await mark(p, a, j, 2); const s1 = await snap(p);
    await p.T(clk += 40000); await mark(p, b, j, 2); const s2 = await snap(p);
    log.push([s1, s2]);
    ok(s1.rest == null && s1.cur === b && s1.page === b, `${mode}, vuelta ${j + 1}: tras la serie del primero, sin descanso y pasa al segundo`);
    ok(s2.rest > 30 && s2.cur === a && s2.page === a, `${mode}, vuelta ${j + 1}: tras la serie del segundo, empieza el descanso (${s2.rest} s) y vuelve al primero`);
  }
  /* Sin elegir el RIR: el descanso sigue y, al terminar, vuelve al primero (también con la pantalla automática) */
  await p.evaluate(() => { state.settings.autoScr = true; });
  await p.T(clk += 40000); await mark(p, a, 2, 2); await p.T(clk += 40000); await mark(p, b, 2, null);
  let s = await snap(p); ok(s.rest > 30 && s.page === b, mode + ': sin RIR elegido, el descanso corre y sigues en el segundo');
  await p.T(clk += 95000); await p.evaluate(() => { tick(); }); await p.waitForTimeout(900);
  s = await snap(p);
  /* como en un ejercicio normal: el siguiente pendiente hacia abajo; si no hay, el primero que falte */
  const nx = await p.evaluate(b => { const d = state.draft, open = x => !exComplete(d.exercises[x]); for (let x = b + 1; x < d.exercises.length; x++) if (open(x)) return x; for (let x = 0; x < b; x++) if (open(x)) return x; return -1; }, b);
  ok(s.cur === nx && s.page === nx, mode + ': al terminar el descanso pasa solo al siguiente pendiente (grupo terminado)');
  ok(await p.evaluate(() => { const N = g3Next(state.draft); return !!N && N.e === state.draft.exercises[state.draft.cur]; }), mode + ': la pantalla automática ya cuenta para el ejercicio al que volviste');
  noErr(p); await p.done();
}
{
  /* Sin RIR a media superserie: al acabar el descanso vuelve a A1 */
  const p = await open({ plans: PLAN(true) }); await start(p, 'dT'); await p.waitForTimeout(500);
  await mark(p, 0, 0, 2); await mark(p, 1, 0, null);
  let s = await snap(p); ok(s.rest > 30 && s.page === 1, 'sin RIR tras A2: descanso en marcha');
  await p.T(95000); await p.evaluate(() => { tick(); }); await p.waitForTimeout(900);
  s = await snap(p); ok(s.cur === 0 && s.page === 0, 'y al terminar el descanso vuelve a A1');
  noErr(p); await p.done();
}

/* ---------- C. Pareja recomendada ---------- */
console.log('C. Con quién emparejar');
{
  const p = await open({ at: Date.parse('2026-11-18T10:00:00') }); await start(p, 'dT'); await p.waitForTimeout(500);   /* miércoles siguiente: nada descansa */
  const sheet = async n => { const i = await ix(p, n); await p.evaluate(i => g2SsSheet(i), i); await p.waitForTimeout(150); return p.evaluate(() => ({ rec: [...document.querySelectorAll('#sheet .g2-ssrec .qk-ex')].map(b => b.querySelector('b').textContent + ' | ' + b.querySelector('small').textContent + (b.dataset.g2 === 'ss-add' ? ' [agregar]' : '')), others: [...document.querySelectorAll('#sheet .qk-list:not(.g2-ssrec) .qk-ex')].map(b => b.querySelector('b').textContent + ' | ' + b.querySelector('small').textContent) })); };
  let S = await sheet(PB); console.log('      Press Banca → ' + JSON.stringify(S.rec));
  ok(/^Remo Sentado con Cable \| Músculo opuesto: espalda/.test(S.rec[0]), 'pecho: primero el de espalda, por músculo opuesto');
  ok(S.others.some(t => /^Aperturas con Mancuernas \| Mismo músculo/.test(t)) && !S.rec.some(t => /Aperturas/.test(t)), 'otro de pecho: no se recomienda ("mismo músculo")');
  S = await sheet(CB); ok(/^Tríceps Polea \| Músculo opuesto: tríceps/.test(S.rec[0]), 'bíceps: primero tríceps');
  await p.evaluate(() => { discardSession(); }); await start(p, 'dB'); await p.waitForTimeout(400);
  S = await sheet(CF); console.log('      Curl Femoral → ' + JSON.stringify(S.rec));
  ok(S.rec.some(t => /^Prensa 45° \| Músculo opuesto: cuádriceps/.test(t)) && S.rec.some(t => /Talones/.test(t) && /pantorrillas/.test(t)), 'isquiotibiales: cuádriceps y pantorrillas');
  noErr(p); await p.done();
  /* Jueves: ayer pecho al fallo. Para el remo no se sugiere agregar uno de pecho; para la prensa sí uno de isquiotibiales o pantorrillas del gimnasio */
  const q = await open(); await start(q, 'dX'); await q.waitForTimeout(500);
  const R = await q.evaluate(([remo, pre]) => { const d = state.draft, R = g2PairRest(); return { rest: Object.keys(R), remo: g2PairAdd(d, remo, R).map(x => x.k), pre: g2PairAdd(d, pre, R).map(x => x.n + ':' + x.k + ':' + exAvail(x.n, 'rokaz')), score: g2PairScore(remo, 'Press Banca con Mancuernas', R) }; }, [REMO, PRE]);
  console.log('      descansan: ' + R.rest.join(',') + ' | para la prensa: ' + R.pre.join(', '));
  ok(R.rest.indexOf('pecho') >= 0 && R.remo.indexOf('pecho') < 0 && R.score.s < 0 && /Ayer entrenaste pecho fuerte/.test(R.score.why), 'pecho entrenado fuerte ayer: no se recomienda como pareja y dice por qué');
  ok(R.pre.length && R.pre.every(t => /:(isq|pant):true$/.test(t)), 'para agregar: del músculo opuesto y con equipo que hay en el gimnasio');
  const i = await ix(q, PRE); await q.evaluate(i => g2SsSheet(i), i); await q.waitForTimeout(150);
  const nm = await q.evaluate(() => { const b = document.querySelector('#sheet [data-g2="ss-add"]'); const n = b && b.dataset.n; if (b) b.click(); return n; }); await q.waitForTimeout(400);
  const D = await q.evaluate(([nm, pre]) => { const d = state.draft, a = d.exercises.find(e => e.name === pre), b = d.exercises.find(e => e.name === nm); return { added: !!b, pair: !!(a && b && ssOf(d, a) && ssOf(d, a) === ssOf(d, b)) }; }, [nm, PRE]);
  ok(nm && D.added && D.pair, 'tocar un recomendado para agregar: entra a la sesión y queda emparejado (' + nm + ')');
  noErr(q); await q.done();
}

/* ---------- D. Fila de arriba en el orden real ---------- */
console.log('D. La fila de ejercicios sigue el orden en que los haces');
{
  const p = await open({ plans: PLAN(true), at: Date.parse('2026-11-18T10:00:00') }); await start(p, 'dT'); await p.waitForTimeout(500);
  ok(await strip(p) === '01234', 'al empezar: el orden de la rutina');
  await p.T(60000); await mark(p, 3, 0, 2);
  ok(await strip(p) === '30124', 'empiezas por el 4.º: pasa al primer lugar de la fila');
  await p.T(120000); await mark(p, 0, 0, 2); await p.T(180000); await mark(p, 1, 0, 2);
  const st = await strip(p); ok(st === '30124', 'luego la superserie (A1 y A2): quedan juntos después (' + st + ')');
  ok(await p.evaluate(() => { const w = document.querySelector('#sx-strip .ss-pair'); return !!w && w.querySelectorAll('.sx-th').length === 2; }), 'la pareja sigue unida en la fila');
  await p.T(240000); await mark(p, 2, 0, 2);
  ok(await strip(p) === '30124', 'y el siguiente va detrás');
  await p.T(300000); await p.evaluate(() => { finishSession(); }); await p.waitForTimeout(700);
  const sv = await p.evaluate(() => state.sessions[0].exercises.map(e => e.name + (e.ss ? '[' + e.ss + ']' : '')));
  console.log('      guardado: ' + sv.join(' · '));
  ok(sv.join('|') === [TP, PB + '[A]', REMO + '[A]', CB].join('|'), 'la sesión se guarda en ese mismo orden, con la superserie marcada');
  const ex = await p.evaluate(() => sessionText(state.sessions[0]));
  ok(ex.indexOf(TP) < ex.indexOf(PB) && ex.indexOf(PB) < ex.indexOf(REMO) && ex.indexOf(REMO) < ex.indexOf(CB), 'y la exportación sale en ese orden');
  noErr(p); await p.done();
}

/* ---------- E. Mapa: ejercicios recomendados ---------- */
console.log('E. Tocar un músculo en el mapa');
{
  const p = await open();
  await p.evaluate(() => { state.tab = 'progress'; state.progSub = 'semana'; render(); }); await p.waitForTimeout(300);
  const tap = z => p.evaluate(z => { const n = document.querySelector('.mm-card .mm-svg [data-z="' + z + '"], .lv-box .mm-svg [data-z="' + z + '"]'); if (n) n.dispatchEvent(new MouseEvent('click', { bubbles: true })); return !!n; }, z);
  const read = () => p.evaluate(() => ({ t: (document.querySelector('#sheet h2') || {}).textContent || '', txt: document.getElementById('sheet').innerText, rows: [...document.querySelectorAll('#sheet .ms-mrow')].map(r => r.querySelector('b').textContent), add: document.querySelectorAll('#sheet [data-ms="madd"]').length, avail: [...document.querySelectorAll('#sheet .ms-mrow b')].every(b => exAvail(b.textContent, 'rokaz')), main: [...document.querySelectorAll('#sheet .ms-mrow b')].every(b => true) }));
  ok(await tap('isq'), 'el mapa de Progreso tiene el músculo');
  await p.waitForTimeout(200); let S = await read();
  console.log('      isquiotibiales: ' + S.rows.join(', '));
  ok(/Isquiotibiales/.test(S.t) && S.rows.length >= 2 && S.rows[0] === CF && S.avail && /de 10 series esta semana/.test(S.txt), 'lista de ejercicios recomendados, primero los que ya haces, con el equipo del gimnasio');
  ok(S.add === 0 && /Con una sesión en marcha/.test(S.txt), 'sin sesión: no hay botón de agregar y lo explica');
  /* Sin la máquina de curl en este gimnasio: ese ejercicio ya no sale */
  await p.evaluate(n => { closeSheet(); gymNoSet('rokaz', libFind(n).eq, true); }, CF); await tap('isq'); await p.waitForTimeout(200); S = await read();
  ok(S.rows.indexOf(CF) < 0 && S.avail, 'si marcaste que esa máquina no hay aquí, no la recomienda');
  await p.evaluate(n => { closeSheet(); gymNoSet('rokaz', libFind(n).eq, false); }, CF);
  /* En la sesión: pecho descansa (ayer al fallo); hombros se puede agregar */
  await start(p, 'dB'); await p.waitForTimeout(500);
  ok(await tap('pecho'), 'el mapa de "Tu semana en vivo" de la sesión tiene el músculo'); await p.waitForTimeout(200); S = await read();
  ok(/Ayer entrenaste pecho fuerte/.test(S.txt) && /48 h/.test(S.txt) && S.add === 0 && S.rows.length > 0, 'pecho (ayer al fallo): avisa de las 48 h y no deja agregar');
  await p.evaluate(() => closeSheet()); await tap('homb'); await p.waitForTimeout(200); S = await read();
  ok(S.add > 0, 'hombros: se pueden agregar');
  const before = await p.evaluate(() => state.draft.exercises.length);
  const nm = await p.evaluate(() => { const b = document.querySelector('#sheet [data-ms="madd"]'); const n = b.dataset.n; b.click(); return n; }); await p.waitForTimeout(400);
  const A = await p.evaluate(nm => ({ n: state.draft.exercises.length, has: state.draft.exercises.some(e => e.name === nm), sheet: !document.getElementById('sheet').hidden, toast: document.getElementById('toast').textContent }), nm);
  ok(A.n === before + 1 && A.has && !A.sheet && /Agregado/.test(A.toast), 'al tocar Agregar: entra a la sesión (' + nm + ')');
  await tap('homb'); await p.waitForTimeout(200);
  ok(await p.evaluate(nm => [...document.querySelectorAll('#sheet .ms-mrow')].some(r => r.querySelector('b').textContent === nm && r.querySelector('[data-ms="mgo"]')), nm), 'y la lista ya dice que está en tu sesión, con "Ir"');
  noErr(p); await p.done();
}

/* ---------- F. Semanas anteriores ---------- */
console.log('F. Racha y Tu semana: semanas anteriores');
{
  const p = await open();
  await p.evaluate(() => { state.tab = 'train'; render(); }); await p.waitForTimeout(400);
  const R = () => p.evaluate(() => { const st = document.querySelector('.streak-card.hoy-st'), tw = document.querySelector('.g3-hoy'); return { st: st ? { lab: (st.querySelector('.ms-wl') || {}).textContent, rows: [...st.querySelectorAll('.ms-ses')].map(b => b.innerText.replace(/\s+/g, ' ')), flames: [...st.querySelectorAll('.wkd.on')].map(b => b.dataset.k || ''), next: (st.querySelector('[data-d="-1"]') || {}).disabled } : null, tw: tw ? { lab: (tw.querySelector('.ms-wl') || {}).textContent, rows: [...tw.querySelectorAll('.ms-ses')].map(b => b.innerText.replace(/\s+/g, ' ')), past: tw.classList.contains('ms-past'), map: !!tw.querySelector('.mm-svg'), txt: tw.innerText } : null }; });
  let S = await R();
  ok(S.st && S.st.lab === 'Esta semana' && S.st.next === true && S.tw && S.tw.lab === 'Esta semana' && !S.tw.past, 'Racha y Tu semana empiezan en esta semana, con sus flechas');
  await act(p, '.streak-card.hoy-st [data-ms="wk"][data-d="1"]'); await p.waitForTimeout(250); S = await R();
  console.log('      Racha, semana pasada: ' + JSON.stringify(S.st.rows));
  ok(S.st.lab === 'Semana pasada' && S.st.rows.length === 2 && /Lun 2 .*Piernas \(Pesado\).*60 min/.test(S.st.rows[0]) && /Vie 6 .*Piernas \(Bombeo\).*48 min/.test(S.st.rows[1]), 'Racha → semana pasada: sus dos entrenos con día, nombre y duración');
  ok(S.st.flames.join() === '2026-11-02,2026-11-06' && S.tw.lab === 'Esta semana', 'con sus días marcados (y Tu semana no se mueve)');
  await act(p, '.streak-card.hoy-st .ms-ses'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => !document.getElementById('sheet').hidden && /Sentadilla Hack/.test(document.getElementById('sheet').innerText)), 'tocar un entreno abre lo que hiciste ese día');
  await p.evaluate(() => closeSheet());
  /* Deslizar con el dedo en Tu semana */
  const swipe = (sel, dx) => p.evaluate(([sel, dx]) => { const el = document.querySelector(sel), r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + 20; const T = (x, y) => new Touch({ identifier: 1, target: el, clientX: x, clientY: y }); el.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, touches: [T(x, y)], changedTouches: [T(x, y)] })); el.dispatchEvent(new TouchEvent('touchend', { bubbles: true, touches: [], changedTouches: [T(x + dx, y + 4)] })); }, [sel, dx]);
  await swipe('.g3-hoy', 120); await p.waitForTimeout(250); S = await R();
  console.log('      Tu semana, deslizando: ' + S.tw.lab + ' · ' + JSON.stringify(S.tw.rows));
  ok(S.tw.past && /Semana pasada/.test(S.tw.lab) && S.tw.rows.length === 2 && S.tw.map && /2 entrenos/.test(S.tw.txt), 'deslizar Tu semana a la derecha: la semana pasada, con su mapa y sus entrenos');
  await swipe('.g3-hoy', 120); await p.waitForTimeout(250); S = await R();
  ok(S.tw.past && /Semana pasada/.test(S.tw.lab), 'no pasa de la primera semana con entrenos');
  await swipe('.g3-hoy', -120); await p.waitForTimeout(250); S = await R();
  ok(!S.tw.past && S.tw.lab === 'Esta semana', 'deslizar a la izquierda vuelve a esta semana');
  /* Las flechas de Tu semana no abren el reporte: cambian de semana */
  await act(p, '.g3-hoy [data-ms="wk"][data-d="1"]'); await p.waitForTimeout(250); S = await R();
  ok(S.tw.past && await p.evaluate(() => document.getElementById('sheet').hidden), 'la flecha ‹ de Tu semana cambia de semana (y no abre el reporte)');
  await act(p, '.g3-hoy [data-ms="wk"][data-d="-1"]'); await p.waitForTimeout(250); S = await R();
  ok(!S.tw.past && S.tw.lab === 'Esta semana', 'deslizar a la izquierda vuelve a esta semana');
  noErr(p); await p.done();
}

/* ---------- G. Plan para completar la semana ---------- */
console.log('G. Plan para completar la semana');
{
  const p = await open();
  /* Jueves. Queda el viernes de la rutina (Piernas Bombeo: prensa, curl femoral, talones). Faltan: isquiotibiales 1, pantorrillas 3, hombros 4 y pecho 5 (ayer al fallo) */
  await p.evaluate(() => { const W = { cuad: 12, glu: 11, pecho: 5, esp: 11, homb: 6, bic: 10, tri: 10, isq: 9, pant: 7 }, day = state.plans[0].days.find(d => d.id === 'dB'); wcVolume = () => ({ rows: Object.keys(W).map(k => ({ k, t: W[k], st: W[k] < WC_MIN ? 'low' : W[k] > WC_MAX ? 'high' : 'ok' })), dl: false, pend: [day] }); });
  const P = await p.evaluate(() => { const P = msPlan(null); return { slots: P.slots.map(s => s.k + ':' + s.type + ':' + s.items.map(x => x.k + x.n).join('+')), out: P.out.map(x => x.k + x.n) }; });
  console.log('      plan: ' + P.slots.join(' | ') + (P.out.length ? ' | sin día: ' + P.out.join(',') : ''));
  ok(P.slots.some(s => /^2026-11-13:rut:/.test(s) && /isq1/.test(s) && /pant3/.test(s)), 'isquiotibiales +1 y pantorrillas +3 van al viernes, en la rutina que ya los trabaja');
  ok(!P.slots.some(s => /^2026-11-12:.*pecho/.test(s)) && P.slots.some(s => /:libre:.*pecho5/.test(s) && s >= '2026-11-13'), 'pecho (ayer al fallo) no va hoy: va a un día libre con las 48 h cumplidas');
  ok(P.slots.some(s => /:libre:.*homb4/.test(s)) && !P.out.length, 'hombros va a un entreno para completar y no queda nada sin día');
  /* En Hoy: la tarjeta Tu semana lo muestra */
  await p.evaluate(() => { state.tab = 'train'; render(); }); await p.waitForTimeout(400);
  const B2 = await p.evaluate(() => { const g = document.querySelector('.g3-hoy'), b = g && g.querySelector('[data-ms="plan"]'), f = g && g.querySelector('[data-wc="fill"]'); return { both: !!(b && f && b.parentNode === f.parentNode), inCard: !!(g && g.querySelector('.ms-plan')) }; });
  ok(B2.both && !B2.inCard, 'en Tu semana: "Cómo repartirlo" va junto a "Crear entreno para completar" (la tarjeta sigue compacta)');
  await act(p, '.g3-hoy [data-ms="plan"]'); await p.waitForTimeout(250);
  const H = await p.evaluate(() => ((document.querySelector('#sheet .ms-plan') || {}).innerText || '') + ((document.querySelector('#sheet [data-wc="fill"]') ? ' CON-BOTON' : '')));
  console.log('      en Hoy: ' + H.replace(/\n+/g, ' / '));
  ok(/Cómo queda repartida tu semana/.test(H) && /CON-BOTON/.test(H) && /En tu rutina \(Piernas \(Bombeo\)\), suma/.test(H) && /isquiotibiales \+1/.test(H) && /pantorrillas \+3/.test(H) && /Entreno para completar/.test(H) && /48 h/.test(H), 'al tocarlo: el reparto y el botón para crear el entreno');
  await p.evaluate(() => closeSheet());
  /* La hoja de hoy dice lo mismo: isquiotibiales y pantorrillas van el viernes; pecho pasa a otro día por descanso */
  await p.evaluate(() => { wc.kind = 'bombeo'; wc.where = 'gym'; wc.day = null; wc.seed = 0; wcFillSheet(); }); await p.waitForTimeout(250);
  const F = await p.evaluate(() => ({ list: wc.list.map(e => e.wcZ + e.sets), moved: wcBuild.last.moved.map(x => x.k + ':' + x.n + ':' + x.to + (x.plan ? ':plan' : '')), txt: document.getElementById('sheet').innerText, plan: (document.querySelector('#sheet .ms-plan') || {}).innerText || '' }));
  console.log('      hoja de hoy: ' + F.list.join(', ') + ' | ' + F.moved.join(' | '));
  ok(F.list.join() === 'homb4' && !F.moved.some(m => /^homb/.test(m)), 'la hoja de hoy trae hombros 4: lo que cabe hoy se hace hoy');
  ok(F.moved.some(m => /^isq:1:el viernes, en tu rutina/.test(m)) && F.moved.some(m => /^pant:3:el viernes, en tu rutina/.test(m)) && F.moved.some(m => /^pecho:5:/.test(m) && !/plan/.test(m)), 'y dice a dónde va lo demás: viernes en tu rutina; pecho, a otro día por el descanso');
  ok(/Cómo queda repartida tu semana/.test(F.plan) && /isquiotibiales \+1/.test(F.plan) && /hombros 4/.test(F.plan) && /pecho 5/.test(F.plan), 'con el mismo reparto escrito en la hoja');
  const same = await p.evaluate(() => { const P = msPlan(wc.day), me = P.slots.find(s => s.k === wc.day && s.type === 'libre'), B = wcBuild.last; return me.items.every(x => B.list.filter(e => e.wcZ === x.k).reduce((a, e) => a + e.sets, 0) === x.n); });
  ok(same, 'las series de la hoja coinciden con las del plan para ese día');
  noErr(p); await p.done();
}

/* ---------- H. Usuario nuevo y reloj ---------- */
console.log('H. Usuario nuevo y reloj');
{
  const p = await open({ first: true });
  await p.evaluate(() => { state.settings.onb = 1; state.settings.healthOk = 1; closeSheet(); const o = document.getElementById('onb'); if (o) o.remove(); state.tab = 'train'; render(); }); await p.waitForTimeout(300);
  ok(await p.evaluate(() => !document.querySelector('.ms-wn') && msPlan(null) && msMaxOff() === 0), 'usuario nuevo en Hoy: sin flechas de semanas (aún no tiene entrenos) y sin errores');
  await p.evaluate(() => { const P = activePlan(); startSession(P.id, P.days[0].id); render(); }); await p.waitForTimeout(500);
  const U = await p.evaluate(() => ({ draft: !!state.draft, strip: document.querySelectorAll('#sx-strip .sx-th').length, pill: [...document.querySelector('.sx-page[data-i="0"] .su-pills').children].findIndex(x => x.classList.contains('g2-ssb')), prev: state.draft.exercises[0].prev.length }));
  ok(U.draft && U.strip > 0 && U.pill === 3 && U.prev === 0, 'usuario nuevo: empieza su sesión; Superserie en 4.º lugar; sin "Anterior" inventado');
  await p.evaluate(() => g2SsSheet(0)); await p.waitForTimeout(200);
  ok(await p.evaluate(() => document.querySelectorAll('#sheet .g2-ssp').length > 0), 'usuario nuevo: la hoja de superserie recomienda parejas');
  await p.evaluate(() => { closeSheet(); const z = document.querySelector('.lv-box .mm-svg [data-z]'); if (z) z.dispatchEvent(new MouseEvent('click', { bubbles: true })); }); await p.waitForTimeout(200);
  ok(await p.evaluate(() => !!document.querySelector('#sheet .ms-mlist')), 'usuario nuevo: tocar un músculo muestra ejercicios');
  noErr(p); await p.done();
}
if (BASE) {
  const shots = async dir => { const p = await open({ watch: true, dir, plans: PLAN(true) }); const a = await p.screenshot(); await p.evaluate(() => { if (typeof _pgRxG5 !== 'undefined') pgRx = _pgRxG5; });   /* ajustes-gym-5: rangos y descansos de antes, para comparar solo la pantalla del reloj */ await start(p, 'dT'); await p.waitForTimeout(700); const b = await p.screenshot(); const t = await p.evaluate(() => document.body.innerText); await p.evaluate(() => { markSet(0, 0, true); }); await p.waitForTimeout(500); const c = await p.screenshot(); const c1 = await p.evaluate(() => ({ cur: state.draft.cur, rest: !!state.rest })); await p.evaluate(() => { markSet(1, 0, true); }); await p.waitForTimeout(500); const d = await p.screenshot(); const c2 = await p.evaluate(() => ({ cur: state.draft.cur, rest: !!state.rest, prev: state.draft.exercises[0].prev.length })); const e = p.errs.slice(); await p.done(); return { a, b, c, d, t, c1, c2, e }; };
  const A = await shots(DIR), B = await shots(BASE);
  ok(A.a.equals(B.a), 'reloj: inicio idéntico a la versión anterior');
  ok(A.b.equals(B.b) && A.t === B.t, 'reloj: sesión idéntica (con su "Anterior" de siempre)');
  ok(A.c.equals(B.c) && A.d.equals(B.d) && JSON.stringify([A.c1, A.c2]) === JSON.stringify([B.c1, B.c2]), 'reloj: la superserie se comporta igual que antes (' + JSON.stringify([A.c1, A.c2]) + ')');
  ok(!A.e.length, 'reloj: sin errores de JS ' + A.e.join(' | '));
}

await browser.close();
console.log(fail ? `\n${fail} FALLA(S)` : '\nTodo OK');
process.exit(fail ? 1 : 0);
