import { OWNER_SETTINGS } from './owner-fixture.mjs';
// Prueba de la rama mancuernas-cu, con datos inventados: el peso de las mancuernas pasa a ser por cada una (c/u).
// Conversión del historial del dueño (una sola vez, con lista y confirmación), deshacer, lo que llega tarde (reloj, nube,
// respaldo), "c/u" en pantalla, volumen y el reloj (solo el texto "kg c/u").
// Uso: $env:PW_DIR = "<carpeta con node_modules/playwright>"; node tests/tcu.mjs <copia transpilada> [<copia anterior>]
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
const act = (p, sel) => p.evaluate(s => { const b = document.querySelector(s); if (!b) return false; b.click(); return true; }, sel);
const sheetTxt = p => p.evaluate(() => { const s = document.getElementById('sheet'); return s && !s.hidden ? s.innerText.replace(/\s+/g, ' ') : ''; });
const W = (p, id, n) => p.evaluate(([id, n]) => { const s = state.sessions.find(x => x.id === id), e = s && s.exercises.find(x => x.name === n); return e ? e.sets.map(x => x.w + (x.drops ? '/' + x.drops.map(y => y.w).join('/') : '')).join(',') : null; }, [id, n]);
const lsAll = p => p.evaluate(() => { const o = {}; Object.keys(localStorage).forEach(k => { if (k.indexOf('cdh.') === 0) o[k] = localStorage.getItem(k); }); return o; });

console.log('1. Antes de convertir: la lista para revisar');
let PRE = null;
{
  const p = await open();
  PRE = await lsAll(p);
  ok(await p.evaluate(() => !!document.querySelector('#app .cu-card') && cuPending()), 'Hoy muestra "Mancuernas: peso de cada una" con "Revisar y convertir"');
  await act(p, '#app .cu-card [data-cu="open"]'); await p.waitForTimeout(200);
  const L = await p.evaluate(() => { const sec = {}; let cur = ''; document.querySelectorAll('#sheet .sheet-card > *').forEach(el => { if (el.classList.contains('label')) cur = el.textContent; else if (el.classList.contains('cu-list')) sec[cur] = [...el.querySelectorAll('.cu-row')].map(r => r.innerText.replace(/\s+/g, ' ')); }); return sec; });
  const key = k => Object.keys(L).find(x => x.indexOf(k) === 0) || '', rev = L[key('Revisar')] || [], two = L[key('Voy a dividir')] || [], one = L[key('No cambio')] || [];
  console.log('      Revisar: ' + rev.join(' | ') + '\n      Dividir: ' + two.join(' | ') + '\n      No cambio: ' + one.join(' | '));
  ok(rev.length === 3 && [CMa, SB, PM1].every(n => rev.some(r => r.indexOf(n) === 0 && /Revisar/.test(r))), 'arriba, "Revisar": Curl Martillo, Sentadilla Búlgara y Peso Muerto a una Pierna con la etiqueta');
  ok(two.some(r => r.indexOf(PJ) === 0 && /5 kg × 15 → 2\.5 kg c\/u × 15/.test(r)) && two.some(r => r.indexOf(PI) === 0 && /30 kg × 10 → 15 kg c\/u × 10/.test(r)), 'dividir entre 2, con ejemplo: Pájaros 5 kg × 15 → 2.5 kg c/u × 15; Press inclinado 30 → 15');
  ok(one.some(r => r.indexOf(RM) === 0 && /20 kg × 10 \(sin cambio\)/.test(r)), 'no cambio (una sola mancuerna): Remo con Mancuerna a una Mano');
  ok(![...rev, ...two, ...one].some(r => /Prensa|Jalón/.test(r)), 'prensa y jalón (máquinas) ni aparecen');
  ok(await p.evaluate(() => cuTwo('Curl Martillo') && cuTwo('Sentadilla Búlgara') && !cuTwo('Peso Muerto a una Pierna')), 'por defecto en Revisar: martillo y búlgara con dos; peso muerto a una pierna con una');
  /* El dueño cambia uno: Curl Martillo con una mancuerna */
  await act(p, `#sheet [data-cu="pick"][data-k="${await p.evaluate(n => exHKey(n), CMa)}"][data-v="0"]`); await p.waitForTimeout(200);
  ok(await p.evaluate(n => !cuTwo(n) && state.settings.cuPick[exHKey(n)] === 0, CMa), 'tocar "Una" en Curl Martillo lo deja sin cambio');
  /* Con cuenta: pide sincronizar el reloj antes */
  await p.evaluate(() => { sync.on = () => true; sync.run = async () => { window.__synced = (window.__synced || 0) + 1; }; cuSheet(); });
  ok(await p.evaluate(() => /Antes, sincroniza tu reloj/.test(document.getElementById('sheet').innerText) && document.querySelector('#sheet [data-cu="go"]').disabled), 'con cuenta: "Antes, sincroniza tu reloj" y Convertir apagado hasta confirmarlo');
  await act(p, '#sheet [data-cu="sync"]'); await p.waitForTimeout(150);
  await p.evaluate(() => { const c = document.getElementById('cu-sync'); c.checked = true; c.dispatchEvent(new Event('change', { bubbles: true })); });
  ok(await p.evaluate(() => window.__synced === 1 && !document.querySelector('#sheet [data-cu="go"]').disabled), '"Sincronizar ahora" sincroniza y, al marcar "Ya sincronicé el reloj", se puede convertir');
  /* Con una sesión abierta no convierte */
  await p.evaluate(() => { closeSheet(); startSession('pA', 'd1'); }); await p.waitForTimeout(300);
  const busy = await p.evaluate(() => { cuSheet(); return { off: document.querySelector('#sheet [data-cu="go"]').disabled, txt: document.getElementById('sheet').innerText, r: cuConvert() }; });
  ok(busy.off && /Tienes una sesión abierta/.test(busy.txt) && busy.r === null && (await W(p, 's2', PJ)) === '5,5,5', 'con una sesión abierta: lo dice, Convertir apagado y nada cambia');
  await p.evaluate(() => { closeSheet(); discardSession(); });
  noErr(p); await p.done();
}

console.log('2. Convertir (tu caso: Pájaros 5 kg × 15 en total → 2,5 kg c/u)');
{
  const p = await open();
  const before = await p.evaluate(() => state.sessions.map(s => sessStats(s).vol));
  await p.evaluate(n => { state.settings.cuPick = { [exHKey(n)]: 0 }; savePlans(); cuSheet(); }, CMa);
  await act(p, '#sheet [data-cu="go"]'); await p.waitForTimeout(300);
  const R = await p.evaluate(() => ({ C: state.settings.cuConv, bk: JSON.parse(localStorage.getItem('cdh.cuBackup') || 'null'), pre: localStorage.getItem('cdh.preupd'), card: !!document.querySelector('#app .cu-card') }));
  ok(R.bk && R.bk.data && /"w":5,"r":15/.test(R.bk.data['cdh.sessions']) && !/"reason":"mancuernas"/.test(R.pre || ''), 'antes de convertir guardó sola una copia de tus datos (con los pesos de antes), aparte de la copia de actualizaciones');
  ok(R.C && R.C.at === T0 && !R.card, 'convertido: queda anotado y la tarjeta desaparece');
  ok((await W(p, 's2', PJ)) === '2.5,2.5,2.5' && (await W(p, 's1', PJ)) === '2.5,2.5', 'Pájaros: 5 → 2.5 c/u en todo el historial');
  ok((await W(p, 's2', PI)) === '15/10', 'Press inclinado: 30 → 15 y su drop 20 → 10');
  ok((await W(p, 's2', RM)) === '20' && (await W(p, 's2', PR)) === '200' && (await W(p, 's2', JA)) === '50' && (await W(p, 's2', PM1)) === '12' && (await W(p, 's2', CMa)) === '20', 'no cambian: remo a una mano (20), prensa (200), jalón (50), peso muerto a una pierna (12) ni el curl martillo que marcaste con una (20)');
  ok((await W(p, 's2', SB)) === '8', 'Sentadilla Búlgara (Revisar, con dos): 16 → 8');
  const P = await p.evaluate(() => ({ plan: state.plans[0].days[0].exercises.map(e => e.weight).join(','), max: state.settings.exMax.gA['press inclinado con mancuernas'], ia: state.settings.nextS.d1.ia.ex[0].sets[0].w }));
  ok(P.plan === '2.5,15,20,200' && P.max === 20 && P.ia === 2.5, 'también la rutina (2.5, 15; remo y prensa igual), el peso máximo (40 → 20) y la próxima sesión de tu IA (5 → 2.5)');
  const after = await p.evaluate(() => state.sessions.map(s => sessStats(s).vol));
  ok(JSON.stringify(after) === JSON.stringify(before), 'volumen total igual que antes (peso c/u × 2 × reps): ' + after.join(', ') + ' kg');
  /* Sugerencia con los pesos que existen: 2.5 c/u × 15 en todas → 5 kg c/u, empezando con 12 */
  const C = await p.evaluate(n => { const c = coachFor({ name: n, sets: 3 }, 'gA', 'bombeo'); return { w: c.w, g: c.goal[0], head: c.head.replace(/<[^>]+>/g, ''), why: c.tips[0] }; }, PJ);
  console.log('      ' + C.head + ' · ' + C.why);
  ok(C.w === 5 && C.g === 12 && /5 kg c\/u/.test(C.head) && /sube a 5 kg c\/u/.test(C.why), 'Pájaros: sugiere 5 kg c/u (el siguiente que existe) empezando con 12 reps, y dice "c/u"');
  /* Nunca se repite: ni llamándola otra vez ni al volver a abrir la app */
  ok(await p.evaluate(() => cuConvert() === null), 'convertir otra vez no hace nada');
  await p.reload2();
  ok((await W(p, 's2', PJ)) === '2.5,2.5,2.5' && (await p.evaluate(() => !document.querySelector('#app .cu-card'))), 'al volver a abrir: sigue en 2.5 y no vuelve a ofrecerlo');
  noErr(p); await p.done();
}

console.log('3. Lo que llega después (reloj, nube, respaldo) y la sesión abierta');
{
  const p = await open();
  await p.evaluate(() => { cuSheet(); document.querySelector('#sheet [data-cu="go"]').click(); });
  await p.evaluate(() => { startSession('pA', 'd1'); const d = state.draft, e = d.exercises.find(x => /Pájaros/.test(x.name)); e.log[0].w = 5; saveDraft(); });
  /* Llega del reloj una sesión de antes de la conversión, sin marca; y otra de después */
  const L = await p.evaluate(([PJ, PI]) => {
    const mk = (id, at, w) => ({ id, date: new Date(at).toISOString(), planId: 'pA', dayId: 'd1', gymId: 'gA', kind: 'bombeo', exercises: [{ name: PJ, sets: [{ w, r: 12 }] }, { name: 'Remo con Mancuerna a una Mano', sets: [{ w: 22, r: 10 }] }] });
    state.sessions.push(mk('w1', Date.now() - 3 * 864e5, 6)); state.sessions.push(mk('w2', Date.now() + 3600e3, 3)); render();
    const g = id => state.sessions.find(s => s.id === id);
    return { a: g('w1').exercises.map(e => e.sets[0].w).join(','), am: !!(g('w1').cuc && g('w1').cuv), b: g('w2').exercises.map(e => e.sets[0].w).join(','), draft: state.draft.exercises.find(x => x.name === PJ).log[0].w };
  }, [PJ, PI]);
  ok(L.a === '3,22' && L.am, 'una sesión anterior a la conversión que llega sin marca se convierte sola (Pájaros 6 → 3; el remo a una mano igual)');
  ok(L.b === '3,22', 'una sesión de después no se toca');
  ok(L.draft === 5, 'la sesión abierta no se toca');
  /* Terminar: la sesión nueva ya queda en la escala nueva */
  const F = await p.evaluate(() => { const d = state.draft, id = d.id; d.exercises.forEach(e => e.log.forEach(s => { s.w = s.w || 5; s.r = 12; s.done = true; s.at = Date.now(); })); finishSession(); closeSheet(); const s = state.sessions.find(x => x.id === id); return { cuv: !!(s && s.cuv), w: s && s.exercises.find(e => /Pájaros/.test(e.name)).sets[0].w }; });
  ok(F.cuv && F.w === 5, 'la sesión que terminas queda marcada como "por mancuerna" (5 kg c/u, sin dividir)');
  noErr(p); await p.done();
}

console.log('4. Respaldo .forja de antes de la conversión');
{
  /* "Reemplazar todo" con un respaldo de antes: vuelven los ajustes sin la conversión → la app lo nota y la ofrece otra vez */
  const p = await open();
  await p.evaluate(() => { cuSheet(); document.querySelector('#sheet [data-cu="go"]').click(); });
  ok(await p.evaluate(() => cuActive()), 'convertido');
  await p.evaluate(pre => { Object.keys(localStorage).filter(k => k.indexOf('cdh.') === 0 && RC_SKIP.indexOf(k) < 0).forEach(k => localStorage.removeItem(k)); Object.keys(pre).forEach(k => localStorage.setItem(k, pre[k])); }, PRE);
  await p.reload2();
  const R = await p.evaluate(() => ({ act: cuActive(), pend: cuPending(), card: !!document.querySelector('#app .cu-card'), w: state.sessions.find(s => s.id === 's2').exercises[0].sets[0].w, bk: !!localStorage.getItem('cdh.cuBackup') }));
  ok(!R.act && R.pend && R.card && R.w === 5, '"Reemplazar todo" con un respaldo de antes: vuelve a ofrecer convertir (5 kg en total), la marca no lo bloquea');
  ok(R.bk, 'la copia automática no se borra al restaurar ni va dentro del respaldo (RC_SKIP)');
  /* "Agregar lo que falta": entra una sesión vieja que faltaba, sin marca → se convierte sola */
  await p.evaluate(() => { cuSheet(); document.querySelector('#sheet [data-cu="go"]').click(); });
  const A = await p.evaluate(PJ => { state.sessions.push({ id: 'old9', date: new Date(Date.now() - 20 * 864e5).toISOString(), planId: 'pA', dayId: 'd1', gymId: 'gA', kind: 'bombeo', exercises: [{ name: PJ, sets: [{ w: 5, r: 14 }] }] }); render(); const s = state.sessions.find(x => x.id === 'old9'); return s.exercises[0].sets[0].w + (s.cuv ? ' marcada' : ''); }, PJ);
  ok(A === '2.5 marcada', '"Agregar lo que falta": la sesión vieja que entra se convierte sola (5 → 2.5)');
  noErr(p); await p.done();
}

console.log('5. Deshacer conversión (Ajustes)');
{
  const p = await open();
  await p.evaluate(() => { cuSheet(); document.querySelector('#sheet [data-cu="go"]').click(); });
  await p.evaluate(() => { state.tab = 'settings'; render(); });
  const b1 = await p.evaluate(() => { const b = document.querySelector('.cu-set [data-cu="undo"]'); return b && b.textContent; });
  ok(/Deshacer conversión de mancuernas/.test(b1 || ''), 'Ajustes tiene "Deshacer conversión de mancuernas"');
  await act(p, '.cu-set [data-cu="undo"]'); await p.waitForTimeout(150);
  ok(/¿Seguro\?/.test(await p.evaluate(() => document.querySelector('.cu-set [data-cu="undo"]').textContent)) && (await W(p, 's2', PJ)) === '2.5,2.5,2.5', 'primer toque: pide confirmación y no cambia nada');
  await act(p, '.cu-set [data-cu="undo"]'); await p.waitForTimeout(300);
  const U = await p.evaluate(() => ({ plan: state.plans[0].days[0].exercises.map(e => e.weight).join(','), max: state.settings.exMax.gA['press inclinado con mancuernas'], ia: state.settings.nextS.d1.ia.ex[0].sets[0].w, act: cuActive(), undo: !!document.querySelector('.cu-set [data-cu="undo"]'), marks: state.sessions.some(s => s.cuc || s.exercises.some(e => e.cu)) }));
  ok((await W(p, 's2', PJ)) === '5,5,5' && (await W(p, 's2', PI)) === '30/20' && (await W(p, 's2', RM)) === '20' && (await W(p, 's2', PR)) === '200', 'deshacer: ×2 solo lo convertido (Pájaros 5, press 30 y drop 20); remo y prensa igual');
  ok(U.plan === '5,30,20,200' && U.max === 40 && U.ia === 5 && !U.marks, 'también rutina, peso máximo y la próxima sesión; sin marcas');
  ok(!U.act && !U.undo, 'funciona una sola vez: ya no aparece el botón de deshacer');
  await p.evaluate(() => { state.tab = 'train'; render(); });
  ok(await p.evaluate(() => !!document.querySelector('#app .cu-card')), 'y se puede volver a revisar y convertir');
  noErr(p); await p.done();
}

console.log('6. "c/u" en pantalla');
{
  const p = await open();
  await p.evaluate(() => { cuSheet(); document.querySelector('#sheet [data-cu="go"]').click(); startSession('pA', 'd1'); render(); }); await p.waitForTimeout(500);
  const D = await p.evaluate(([PJ, RM, PR]) => { const d = state.draft, pg = n => document.querySelector(`#sx-pager .sx-page[data-i="${d.exercises.findIndex(e => e.name === n)}"] .card.ex`), hd = c => c.querySelectorAll(':scope > .sets > .h')[2].textContent;
    const a = pg(PJ), b = pg(RM), c = pg(PR); return { a: hd(a), prev: (a.querySelector('.sets .prev small') || {}).textContent, hint: !!a.querySelector('.cu-hint'), b: hd(b), bh: !!b.querySelector('.cu-hint'), c: hd(c), coach: [...a.querySelectorAll('.coach, .sugg, .g2-rec')].map(x => x.textContent).join(' ') }; }, [PJ, RM, PR]);
  ok(/^kg c\/u/i.test(D.a) && /^c\/u × 15/.test(D.prev || '') && D.hint, 'sesión, Pájaros: "Kg c/u", "Anterior" con c/u y la nota "Anota el peso de cada mancuerna"');
  ok(/kg c\/u/.test(D.coach), 'el coach de la tarjeta dice "kg c/u"');
  ok(D.b === 'Kg' && !D.bh && D.c === 'Kg', 'remo a una mano y prensa: sin "c/u"');
  const T = await p.evaluate(PJ => { const d = state.draft, i = d.exercises.findIndex(e => e.name === PJ), e = d.exercises[i]; e.log[0].w = 2.5; e.log[0].r = 20; e.log[0].rir = 3; e.log[0].done = true; e.log[0].at = Date.now(); return (agTip(d, i) || {}).t; }, PJ);
  ok(/kg c\/u/.test(T || ''), 'la indicación serie por serie también: ' + T);
  await p.evaluate(() => discardSession());
  const R = await p.evaluate(PJ => { daySheet('2026-11-12'); document.querySelector('#sheet .rp-open[data-id="s2"]').click(); return [...document.querySelectorAll('#sheet .rp-ex')].map(r => r.innerText.replace(/\s+/g, ' ')).find(r => r.indexOf(PJ) >= 0) || ''; }, PJ);
  ok(/Hoy: 5 kg c\/u × 12/.test(R) && /Ese día: 2\.5 c\/u×15/.test(R), 'Repetir: "Hoy: 5 kg c/u × 12" y "Ese día: 2.5 c/u×15" (' + R + ')');
  noErr(p); await p.done();
}

console.log('7. Usuario nuevo');
{
  const p = await open({ first: true });
  await p.evaluate(() => { state.settings.onb = 1; closeSheet(); const o = document.getElementById('onb'); if (o) o.remove(); const P = activePlan(); P.days[0].exercises.unshift({ id: 'nx1', name: 'Elevaciones Laterales', type: 'Hombros', weight: 0, sets: 2, repsMin: 12, repsMax: 15, rest: 60 }); startSession(P.id, P.days[0].id); render(); }); await p.waitForTimeout(500);
  const N = await p.evaluate(() => { const c = document.querySelector('#sx-pager .sx-page[data-i="0"] .card.ex'); return { h: c.querySelectorAll(':scope > .sets > .h')[2].textContent, hint: (c.querySelector('.cu-hint') || {}).textContent || '', pend: cuPending(), owner: !!state.settings.owner }; });
  ok(/^kg c\/u/i.test(N.h) && /cada mancuerna/.test(N.hint) && !N.pend && !N.owner, 'usuario nuevo: "Kg c/u" y "Anota el peso de cada mancuerna"; nada que convertir');
  const V = await p.evaluate(() => { const d = state.draft; d.exercises[0].log.forEach(s => { s.w = 5; s.r = 12; s.done = true; s.at = Date.now(); }); const id = d.id; finishSession(); closeSheet(); const s = state.sessions.find(x => x.id === id); return { cuv: !!s.cuv, vol: sessStats(s).vol, card: !!document.querySelector('#app .cu-card') }; });
  ok(V.cuv && V.vol === 5 * 2 * 12 * 2 && !V.card, 'su sesión queda por mancuerna y el volumen cuenta las dos (5 c/u × 2 × 12 × 2 series = 240 kg); sin tarjeta de conversión');
  noErr(p); await p.done();
}

console.log('8. Reloj');
{
  const p = await open({ watch: true });
  ok(await p.evaluate(() => isWatch() && !document.querySelector('.cu-card')), 'reloj: sin tarjeta ni pantalla de conversión');
  await p.evaluate(() => { cuConvert(); startSession('pA', 'd1'); state.draft.cur = 0; render(); }); await p.waitForTimeout(400);
  const H = await p.evaluate(() => ({ a: document.getElementById('app').innerHTML, n: state.draft.exercises[0].name }));
  ok(/<small>kg c\/u<\/small>/.test(H.a) && H.n === PJ, 'reloj, Pájaros: el peso dice "kg c/u"');
  await p.evaluate(() => { state.draft.cur = 2; render(); });
  ok(await p.evaluate(() => !/c\/u/.test(document.getElementById('app').innerHTML)), 'reloj, remo a una mano: sin "c/u"');
  noErr(p); await p.done();
  if (BASE) {
    /* Igual que la versión anterior salvo el texto "kg c/u" (mismos datos ya convertidos en las dos copias) */
    const shot = async dir => { const q = await open({ watch: true, dir }); const a = await q.evaluate(() => document.getElementById('app').innerHTML); await q.evaluate(() => { const s = state.sessions; s.forEach(x => x.exercises.forEach(e => { if (/Pájaros|Press Inclinado/.test(e.name)) e.sets.forEach(t => { t.w = t.w / 2; }); x.cuv = 1; })); state.settings.cuConv = { v: 1, at: Date.now(), two: [exHKey('Pájaros (Deltoide Posterior)'), exHKey('Press Inclinado con Mancuernas')], one: [] }; startSession('pA', 'd1'); state.draft.cur = 0; render(); }); await q.waitForTimeout(400); const b = await q.evaluate(() => document.getElementById('app').innerHTML); const e = q.errs.slice(); await q.done(); return { a, b, e }; };
    const A = await shot(DIR), B = await shot(BASE);
    ok(A.a === B.a, 'reloj: inicio idéntico a la versión anterior');
    /* Se quita "c/u" en las dos copias: la anterior puede ser de antes (sin c/u) o la v1.0.68 (con c/u) */
    const nc = h => h.replace('<small>kg c/u</small>', '<small>kg</small>').replace('<small>kg c/u × ', '<small>kg × '); B.b = nc(B.b);
    { const x = nc(A.b); let i = 0; while (i < x.length && x[i] === B.b[i]) i++; ok(x === B.b && /kg c\/u/.test(A.b), 'reloj: la serie es idéntica salvo "kg c/u"' + (x === B.b ? '' : ' · nueva: ' + x.slice(Math.max(0, i - 60), i + 80) + ' · anterior: ' + B.b.slice(Math.max(0, i - 60), i + 80))); }
    ok(!A.e.length, 'reloj: sin errores de JS');
  }
}

await browser.close();
console.log(fail ? `\n${fail} FALLA(S)` : '\nTodo OK');
process.exit(fail ? 1 : 0);
