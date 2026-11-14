import { OWNER_SETTINGS } from './owner-fixture.mjs';
// Prueba de la rama ajustes-gym-5, con datos inventados: quitar y separar en el entreno, rangos y descansos por tipo,
// pesos que existen en cada gimnasio y el reloj (quitar, separar, unir; lo demás igual que la versión anterior).
// Uso: $env:PW_DIR = "<carpeta con node_modules/playwright>"; node tests/tgym5.mjs <copia transpilada> [<copia anterior>]
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
const T0 = Date.parse('2026-11-13T10:00:00');   /* viernes */
const PI = 'Press Inclinado con Mancuernas', AP = 'Aperturas con Mancuernas', CM = 'Curl Martillo', TP = 'Tríceps Polea', EL = 'Elevaciones Laterales';
const SES = (id, at, kind, dayName, ex, gymId) => ({ id, date: new Date(Date.parse(at)).toISOString(), planId: 'pA', planName: 'Rutina A', dayId: 'd1', dayName, gymId: gymId || 'gA', gymName: 'Gimnasio A', kind, durationSec: 3600, exercises: ex.map(([name, sets]) => ({ name, type: 'Pecho', sets: sets.map(([w, r, rir]) => Object.assign({ w, r }, rir != null ? { rir } : {})) })) });
/* El caso: Torso (Bombeo), 10 kg × 15, 15, 11 (RIR 0 al final) */
const HIST = [SES('h1', '2026-11-11T19:00:00', 'bombeo', 'Torso (Bombeo)', [[AP, [[10, 15, 1], [10, 15, 1], [10, 11, 0]]], [CM, [[10, 14, 1], [10, 12, 0]]], [PI, [[10, 12, 2], [10, 11, 1]]], [TP, [[30, 15, 1], [30, 14, 0]]]]),
  SES('c1', '2026-11-09T19:00:00', 'bombeo', 'Casa', [[CM, [[7.5, 15, 1], [7.5, 15, 1], [7.5, 15, 1]]]], 'gC')];
const PLANS = [{ id: 'pA', name: 'Rutina A', gymId: 'gA', days: [{ id: 'd1', name: 'Torso (Bombeo)', weekday: 5, kind: 'bombeo', exercises: [
  { id: 'e1', name: PI, type: 'Pecho', weight: 10, sets: 3, repsMin: 10, repsMax: 12, rest: 90 },
  { id: 'e2', name: AP, type: 'Pecho', weight: 10, sets: 3, repsMin: 12, repsMax: 15, rest: 60, ss: 1 },
  { id: 'e3', name: CM, type: 'Brazos', weight: 10, sets: 3, repsMin: 12, repsMax: 15, rest: 60 },
  { id: 'e4', name: TP, type: 'Brazos', weight: 30, sets: 3, repsMin: 12, repsMax: 15, rest: 60 },
  { id: 'e5', name: EL, type: 'Hombros', weight: 7.5, sets: 3, repsMin: 15, repsMax: 20, rest: 45 }] }] }];
const GYMS = [{ id: 'gA', name: 'Gimnasio A' }, { id: 'gB', name: 'Gimnasio B' }, { id: 'gC', name: 'Casa' }];
const SET = (extra) => { const s = Object.assign(structuredClone(OWNER_SETTINGS), { activePlanId: 'pA', activeGymId: 'gA', planByGym: { gA: 'pA' }, newsSeen: 'n6' }, extra || {}); delete s.g5Seed; s.prof = Object.assign({}, s.prof, { goal: 'musculo', exp: 2, mins: 75 }); return s; };
async function open({ watch, first, dir, settings } = {}) {
  const srv = await serve(dir || DIR);
  const ctx = await browser.newContext(watch ? { viewport: { width: 410, height: 500 }, hasTouch: true } : { viewport: { width: 390, height: 844 }, hasTouch: true });
  await ctx.route(/googleapis|gstatic|google\.com|firebase|github/, r => r.abort());
  const p = await ctx.newPage(); p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message));
  await p.clock.setFixedTime(new Date(T0));
  if (!first) await p.addInitScript(([s, pl, ss, g]) => { if (localStorage.getItem('cdh.seeded')) return; localStorage.setItem('cdh.seeded', '1');
    localStorage.setItem('cdh.settings', JSON.stringify(s)); localStorage.setItem('cdh.plans', JSON.stringify(pl)); localStorage.setItem('cdh.sessions', JSON.stringify(ss));
    localStorage.setItem('cdh.gyms', JSON.stringify(g)); localStorage.setItem('cdh.newsSeen', '"n6"'); }, [settings || SET(), PLANS, HIST, GYMS]);
  await p.goto(`http://127.0.0.1:${srv.address().port}/index.html`); await p.waitForTimeout(1500);
  if (!first) await p.evaluate(() => { state.settings.healthOk = 1; state.notifPerm = 'granted'; closeSheet(); render(); });
  p.done = async () => { await ctx.close(); srv.close(); };
  return p;
}
const noErr = p => ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
const act = (p, sel) => p.evaluate(s => { const b = document.querySelector(s); if (!b) return false; b.click(); return true; }, sel);
const sheetTxt = p => p.evaluate(() => { const s = document.getElementById('sheet'); return s && !s.hidden ? s.innerText.replace(/\s+/g, ' ') : ''; });
const startA = p => p.evaluate(() => { startSession('pA', 'd1'); render(); });
const idx = (p, n) => p.evaluate(n => state.draft.exercises.findIndex(e => e.name === n), n);

console.log('1. Dueño: pesos de cada gimnasio (valores iniciales y edición)');
{
  const p = await open();
  const W = await p.evaluate(() => JSON.stringify(state.settings.gymW));
  ok(W === JSON.stringify({ gA: { db: [5, 7.5, 10, 12], mach: 5 }, gB: { db: [5, 7.5, 10, 12], mach: 5 }, gC: { db: [2.5, 7.5] } }), 'dueño: los gimnasios traen sus pesos (mancuernas 5-7,5-10-12 y máquinas de 5 en 5; Casa 2,5 y 7,5) ' + W);
  await act(p, '[data-act="gym-pick"]'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => /Pesos que hay en Gimnasio A \(4 mancuernas, máquinas de 5 en 5\)/.test(document.querySelector('#sheet .g5-gw').textContent)), '"¿Dónde entrenas hoy?" tiene "Pesos que hay en Gimnasio A (4 mancuernas, máquinas de 5 en 5)"');
  await act(p, '#sheet .g5-gw'); await p.waitForTimeout(200);
  const v = await p.evaluate(() => [document.getElementById('g5-db').value, document.getElementById('g5-mach').value]);
  ok(v[0] === '5; 7,5; 10; 12' && v[1] === '5', 'la hoja muestra la lista para editar (5; 7,5; 10; 12 y 5)');
  await p.evaluate(() => { document.getElementById('g5-db').value = 'abc'; }); await act(p, '#sheet [data-g5="gw-save"]'); await p.waitForTimeout(150);
  ok(/No entendí los pesos/.test(await sheetTxt(p)) && (await p.evaluate(() => state.settings.gymW.gA.db.length)) === 4, 'un texto que no son pesos: lo dice y no guarda');
  await p.evaluate(() => { document.getElementById('g5-db').value = '12 ; 5, 7,5;10; 14'; document.getElementById('g5-mach').value = '2,5'; }); await act(p, '#sheet [data-g5="gw-save"]'); await p.waitForTimeout(150);
  ok(await p.evaluate(() => JSON.stringify(state.settings.gymW.gA) === JSON.stringify({ db: [5, 7.5, 10, 12, 14], mach: 2.5 })), 'guardar: "12 ; 5, 7,5;10; 14" → 5, 7,5, 10, 12 y 14; máquinas de 2,5 en 2,5');
  await p.evaluate(() => { state.settings.gymW.gA = { db: [5, 7.5, 10, 12], mach: 5 }; savePlans(); });
  noErr(p); await p.done();
}

console.log('2. El caso: Torso (Bombeo) 10 kg × 15, 15, 11');
{
  const p = await open();
  const C = await p.evaluate(n => { const c = pgCoach({ name: n, sets: 3 }, 'gA', 'bombeo'); return { w: c.w, g: c.goal[0], why: c.why, r: c.rx.rMin + '-' + c.rx.rMax }; }, AP);
  console.log('      ' + C.why);
  ok(C.w === 10 && C.g === 15 && /^Sigue con 10 kg y busca 15 en todas las series/.test(C.why) && /sube a 12 kg/.test(C.why) && C.r === '12-15', 'Aperturas: "Sigue con 10 kg y busca 15 en todas las series" (antes: 9 kg o 12,5 kg que no existen)');
  /* La indicación al terminar el ejercicio en la sesión dice lo mismo */
  await startA(p); await p.waitForTimeout(500);
  const T = await p.evaluate(n => { const d = state.draft, i = d.exercises.findIndex(e => e.name === n), e = d.exercises[i]; [15, 15, 11].forEach((r, j) => { e.log[j].w = 10; e.log[j].r = r; e.log[j].rir = j === 2 ? 0 : 1; e.log[j].done = true; e.log[j].at = Date.now() - (3 - j) * 120000; }); saveDraft(); const t = agTip(d, i); return t && t.t; }, AP);
  ok(/^Ejercicio terminado: sigue con 10 kg y busca 15 en todas las series/.test(T || ''), 'al terminar el ejercicio en la sesión: "Ejercicio terminado: sigue con 10 kg y busca 15 en todas las series"');
  await p.evaluate(() => discardSession());
  /* Repetir este entreno y el entreno para completar tampoco sugieren pesos que no hay */
  const R = await p.evaluate(() => { daySheet('2026-11-11'); const b = document.querySelector('#sheet .rp-open[data-id="h1"]'); if (b) b.click(); return [...document.querySelectorAll('#sheet .rp-ex')].map(r => r.innerText.replace(/\s+/g, ' ')); });
  const rAP = R.find(r => r.indexOf(AP) >= 0) || '';
  ok(/Hoy: 10 kg × 15/.test(rAP), 'Repetir este entreno: "Hoy: 10 kg × 15" (' + rAP.replace(/.*Hoy: /, '').replace(/ Ese día.*/, '') + ')');
  await p.evaluate(() => closeSheet());
  const F = await p.evaluate(n => { const rx = pgRx(n, 'bombeo', { fillRx: g2FillRx(n, 'bombeo') }); const r = g2Load(n, rx, 'gym', 'bombeo'); return { w: r.w, reps: r.reps, note: r.note, rx: rx.rMin + '-' + rx.rMax }; }, AP);
  ok(F.w === 10 && F.reps === 15 && /sigue con 10 kg y busca 15 en todas las series/.test(F.note) && F.rx === '12-15', 'entreno para completar: ' + F.note);
  /* Todas las series en el tope: recién sube al siguiente peso que hay, aunque las reps bajen al mínimo */
  const U = await p.evaluate(n => { state.sessions[0].exercises[0].sets.forEach(s => { s.r = 15; s.rir = 1; }); const c = pgCoach({ name: n, sets: 3 }, 'gA', 'bombeo'); return { w: c.w, g: c.goal[0], why: c.why }; }, AP);
  ok(U.w === 12 && U.g === 12 && /sube a 12 kg, el siguiente peso que hay aquí, y empieza con 12 reps/.test(U.why), 'con 15, 15, 15: "sube a 12 kg, el siguiente peso que hay aquí, y empieza con 12 reps"');
  /* En casa las mancuernas más pesadas son de 7,5 kg: no sube más */
  const K = await p.evaluate(n => { const c = pgCoach({ name: n, sets: 3 }, 'gC', 'bombeo'); return { w: c.w, mode: c.mode, why: c.why }; }, CM);
  ok(K.w === 7.5 && K.mode === 'cap' && /Las mancuernas más pesadas aquí son de 7[.,]5 kg: no subo más/.test(K.why), 'Casa (2,5 y 7,5): ' + K.why);
  /* Máquinas de 5 en 5: Tríceps Polea 30 × 15, 14 → mantener 30 y buscar 15 en todas (no hay 31,5) */
  const M = await p.evaluate(n => { const c = pgCoach({ name: n, sets: 2 }, 'gA', 'bombeo'); return { w: c.w, why: c.why }; }, TP);
  ok(M.w === 30 && /Sigue con 30 kg y busca 15 en todas las series/.test(M.why) && /entre 30 y 35 kg/.test(M.why), 'polea de 5 en 5: ' + M.why);
  noErr(p); await p.done();
}

console.log('3. Solo pesos que existen: barrido de historias, cansado, descarga, reemplazos y calentamiento');
{
  const p = await open();
  const B = await p.evaluate(([AP, CM, PI, EL, TP]) => {
    let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const L = state.settings.gymW.gA.db, bad = [], keep = state.sessions;
    for (let k = 0; k < 600; k++) {
      const n = [AP, CM, PI, EL][k % 4], kind = k % 3 ? 'bombeo' : 'fuerza', w = L[Math.floor(rnd() * L.length)], sets = [0, 1, 2].map(j => ({ w, r: 4 + Math.floor(rnd() * 18), rir: Math.floor(rnd() * 4) }));
      state.sessions = [{ id: 'x' + k, date: new Date(Date.now() - (1 + Math.floor(rnd() * 20)) * 864e5).toISOString(), planId: 'pA', dayId: 'd1', gymId: 'gA', kind, exercises: [{ name: n, sets }] }];
      const c = pgCoach({ name: n, sets: 3 }, 'gA', kind);
      if (c.w > 0 && L.indexOf(c.w) < 0) bad.push(n + ' ' + JSON.stringify(sets.map(s => s.r)) + ' → ' + c.w + ' (' + c.mode + ')');
      const ns = nsCoachEx({ id: 'e', name: n, sets: 3 }, 'gA', kind, { ready: k % 2 ? 'low' : 'mid', meso: k % 5 === 0 ? { deload: 1 } : null });
      ns.sets.forEach(s => { if (+s.w > 0 && L.indexOf(+s.w) < 0) bad.push('próxima ' + n + ' → ' + s.w); });
      const g = g2Load(n, pgRx(n, kind), 'gym', kind); if (g.w > 0 && L.indexOf(g.w) < 0) bad.push('completar ' + n + ' → ' + g.w);
    }
    state.sessions = keep;
    const cv = [convertW('Press Banca', PI, 60), convertW('Press Banca', AP, 40), convertW('Curl con Barra', CM, 30)].map(o => o.w).filter(w => w > 0 && L.indexOf(w) < 0);
    const W = warmupFor({ name: 'Press Francés con Mancuernas', log: [{ w: 12 }], rest: 60, bar: 0 }, 0, { exercises: [], gymId: 'gA' });
    return { bad: bad.slice(0, 5), n: bad.length, cv, plates: W && W.plates, wu: W ? W.sets.map(s => s.w) : null, side: typeof sidePlates === 'function' ? sidePlates({ name: 'Press Francés con Mancuernas', bar: 0 }, 12) : '' };
  }, [AP, CM, PI, EL, TP]);
  ok(B.n === 0, '600 historias × (coach, próxima sesión con cansado/descarga, entreno para completar): solo pesos que hay ' + B.bad.join(' | '));
  ok(!B.cv.length, 'reemplazos (de barra a mancuernas): solo pesos que hay ' + B.cv.join(', '));
  ok(B.plates === false && !B.side && B.wu && B.wu.every(w => [5, 7.5, 10, 12].indexOf(w) >= 0), 'Press francés con mancuernas: nunca "en cada lado" (antes 12 kg salía como 6 por lado) y calentamiento con mancuernas que hay (' + (B.wu || []).join(', ') + ')');
  /* Usuario nuevo / sin listas: nada se limita */
  const N = await p.evaluate(n => { const keep = state.settings.gymW; state.settings.gymW = {}; const c = pgCoach({ name: n, sets: 3 }, 'gA', 'bombeo'); state.settings.gymW = keep; return c.w; }, AP);
  ok(N === 12.5 || N === 12, 'sin lista de pesos, el coach sigue como siempre (' + N + ' kg)');
  noErr(p); await p.done();
}

console.log('4. Rangos y descansos por tipo de ejercicio');
{
  const p = await open();
  const R = await p.evaluate(() => {
    const t = (n, k) => { const r = pgRx(n, k); return r.rMin + '-' + r.rMax + '/' + r.rest; };
    return ['Sentadilla Hack', 'Press Inclinado con Mancuernas', 'Hip Thrust con Mancuerna', 'Curl Martillo', 'Elevación de Talones de Pie', 'Elevaciones Laterales'].map(n => n + ' ' + t(n, 'fuerza') + ' · ' + t(n, 'bombeo'));
  });
  console.log('      ' + R.join('\n      '));
  ok(R[0] === 'Sentadilla Hack 6-8/150 · 10-12/90', 'grande de pierna: pesado 6-8 (2-3 min) · bombeo 10-12 (1 min 30 s)');
  ok(R[1] === 'Press Inclinado con Mancuernas 6-10/150 · 10-12/90', 'grande de torso: pesado 6-10 (2-3 min) · bombeo 10-12 (1 min 30 s)');
  ok(R[2] === 'Hip Thrust con Mancuerna 8-10/150 · 12-15/90', 'hip thrust: pesado 8-10 · bombeo 12-15');
  ok(R[3] === 'Curl Martillo 8-12/90 · 12-15/60', 'aislamiento: pesado 8-12 (1 min 30 s) · bombeo 12-15 (1 min)');
  ok(R[4] === 'Elevación de Talones de Pie 10-15/60 · 15-20/45' && R[5] === 'Elevaciones Laterales 10-15/60 · 15-20/45', 'pantorrillas y laterales: pesado 10-15 (1 min) · bombeo 15-20 (45 s)');
  /* Aviso de descansos: contra lo recomendado para los ejercicios de la sesión; el paso a la pareja de superserie no cuenta */
  await startA(p); await p.waitForTimeout(500);
  const A = await p.evaluate(([PI, AP, CM, EL]) => {
    const d = state.draft, g = n => d.exercises.find(e => e.name === n), t0 = Date.now() - 3600e3; let t = t0;
    const mark = (n, j, gap) => { t += gap * 1000; const s = g(n).log[j]; s.w = s.w || 10; s.r = 12; s.done = true; s.at = t; };
    mark(PI, 0, 0); mark(PI, 1, 55 + 100); mark(PI, 2, 55 + 100);              /* press: 100 s (recomendado 90) */
    mark(AP, 0, 55 + 100); mark(CM, 0, 45 + 5); mark(AP, 1, 45 + 70); mark(CM, 1, 45 + 5);   /* superserie: 5 s al pasar a la pareja (no cuenta), 70 s al cerrar la vuelta */
    const R = pgRests(d), L = pgLate(d);
    return { n: R.length, short: R.filter(x => x.real < 20).length, recs: R.map(x => x.rec).join(','), warn: L.restWarn };
  }, [PI, AP, CM, EL]);
  ok(A.short === 0 && A.n === 4, 'pgRests: el paso a la pareja de la superserie no cuenta como descanso (' + A.n + ' descansos: ' + A.recs + ')');
  ok(!A.warn, 'descansos de 70-100 s con lo recomendado de 60-90 s: sin aviso');
  const A2 = await p.evaluate(([EL]) => { const d = state.draft, e = d.exercises.find(x => x.name === EL); let t = Date.now() - 600e3; e.log.forEach(s => { t += 150e3; s.w = 7.5; s.r = 16; s.done = true; s.at = t; }); const L = pgLate(d); return L.restWarn; }, [EL]);
  ok(A2 && A2.b === 50 && A2.a === 97, 'laterales con 110 s de descanso: el aviso compara con lo recomendado de esos ejercicios (45 s las laterales y 60 s el anterior = 50 s de media), no con 1 min fijo ' + JSON.stringify(A2));
  await p.evaluate(() => { state.tab = 'train'; render(); }); await p.waitForTimeout(300);
  const txt = await p.evaluate(() => (document.querySelector('.pg-late.rest') || {}).textContent || '');
  ok(/lo recomendado para estos ejercicios es 0:50/.test(txt), 'el aviso dice "lo recomendado para estos ejercicios es 0:50": ' + txt.trim());
  noErr(p); await p.done();
}

console.log('5. Teléfono: quitar un ejercicio durante el entreno');
{
  const p = await open();
  await startA(p); await p.waitForTimeout(500);
  const P0 = await p.evaluate(() => ({ rm: document.querySelectorAll('#sx-pager .g5-rm').length, split: [...document.querySelectorAll('#sx-pager .g5-split')].map(b => +b.dataset.i), n: state.draft.exercises.length }));
  ok(P0.rm === P0.n && P0.split.length === 2, 'cada ejercicio tiene la píldora "Quitar" y los de la superserie "Separar"');
  /* Aperturas (en superserie con el curl), con 2 series hechas → solo de hoy */
  const iA = await idx(p, AP);
  await p.evaluate(i => { const e = state.draft.exercises[i]; [0, 1].forEach(j => { e.log[j].w = 10; e.log[j].r = 14; e.log[j].done = true; e.log[j].at = Date.now(); }); saveDraft(); render(); }, iA);
  await act(p, `#sx-pager .sx-page[data-i="${iA}"] .g5-rm`); await p.waitForTimeout(200);
  let t = await sheetTxt(p);
  ok(/Quitar Aperturas con Mancuernas/.test(t) && /Ya hiciste 2 series de este ejercicio hoy: se borrarán/.test(t) && /Curl Martillo queda como ejercicio normal, con su propio descanso/.test(t) && /¿Quitarlo solo de hoy o también de la rutina\?/.test(t), 'la hoja avisa de las 2 series hechas, del curl que queda normal y pregunta solo hoy o también la rutina');
  await act(p, '#sheet [data-g5="rm-go"][data-p="0"]'); await p.waitForTimeout(300);
  let D = await p.evaluate(([AP, CM]) => { const d = state.draft, i = d.exercises.findIndex(e => e.name === CM); return { has: d.exercises.some(e => e.name === AP), ss: !!ssMembers(d, i), rest: d.exercises[i].rest, plan: state.plans[0].days[0].exercises.map(e => e.name + (e.ss ? '+' : '')).join(','), pages: document.querySelectorAll('#sx-pager .sx-page').length }; }, [AP, CM]);
  ok(!D.has && !D.ss && D.rest > 0 && D.pages === 4, 'solo de hoy: sale de la sesión, el curl queda normal con su descanso (' + D.rest + ' s)');
  ok(D.plan === `${PI},${AP}+,${CM},${TP},${EL}`, 'y la rutina no cambia (' + D.plan + ')');
  /* Tríceps polea → también de la rutina */
  const iT = await idx(p, TP);
  await act(p, `#sx-pager .sx-page[data-i="${iT}"] .g5-rm`); await p.waitForTimeout(200);
  t = await sheetTxt(p);
  ok(!/Ya hiciste/.test(t) && /Quitarlo también de la rutina/.test(t), 'sin series hechas: sin aviso de borrar, con "también de la rutina"');
  await act(p, '#sheet [data-g5="rm-go"][data-p="1"]'); await p.waitForTimeout(300);
  D = await p.evaluate(TP => ({ has: state.draft.exercises.some(e => e.name === TP), plan: state.plans[0].days[0].exercises.map(e => e.name + (e.ss ? '+' : '')).join(','), stored: JSON.parse(localStorage.getItem('cdh.plans'))[0].days[0].exercises.length }), TP);
  ok(!D.has && D.plan === `${PI},${AP}+,${CM},${EL}` && D.stored === 4, 'también de la rutina: sale de la sesión y de la rutina guardada');
  /* Quitar de la rutina un miembro de la superserie: el otro queda normal también en la rutina */
  await p.evaluate(() => discardSession()); await startA(p); await p.waitForTimeout(500);
  const iC = await idx(p, CM);
  await act(p, `#sx-pager .sx-page[data-i="${iC}"] .g5-rm`); await p.waitForTimeout(200); await act(p, '#sheet [data-g5="rm-go"][data-p="1"]'); await p.waitForTimeout(300);
  D = await p.evaluate(() => state.plans[0].days[0].exercises.map(e => e.name + (e.ss ? '+' : '')).join(','));
  ok(D === `${PI},${AP},${EL}`, 'quitar el curl de la rutina: las aperturas quedan como ejercicio normal en la rutina (' + D + ')');
  /* "¿Máquina ocupada?" también ofrece quitarlo; con un solo ejercicio no se puede */
  await act(p, `#sx-pager .sx-page[data-i="0"] [data-act="busy"]`); await p.waitForTimeout(200);
  ok(await p.evaluate(() => !!document.querySelector('#sheet .g5-busy[data-g5="rm"]')), '"¿Máquina ocupada?" tiene "Quitar este ejercicio"');
  await p.evaluate(() => { closeSheet(); const d = state.draft; d.exercises.splice(1); saveDraft(); render(); });
  await act(p, `#sx-pager .sx-page[data-i="0"] .g5-rm`); await p.waitForTimeout(200);
  ok(/Es el único ejercicio de esta sesión: no se puede quitar/.test(await sheetTxt(p)) && !(await p.evaluate(() => !!document.querySelector('#sheet [data-g5="rm-go"]'))), 'con un solo ejercicio: lo explica y no lo quita');
  noErr(p); await p.done();
}

console.log('6. Teléfono: separar una superserie durante el entreno');
{
  const p = await open();
  await startA(p); await p.waitForTimeout(500);
  const iC = await idx(p, CM);
  await act(p, `#sx-pager .sx-page[data-i="${iC}"] .g5-split`); await p.waitForTimeout(200);
  let t = await sheetTxt(p);
  ok(/Separar la superserie/.test(t) && /Aperturas con Mancuernas y Curl Martillo vuelven a ser ejercicios normales, cada uno con su propio descanso/.test(t) && /¿Separarla solo hoy o también en la rutina\?/.test(t), 'la hoja dice qué pasa y pregunta solo hoy o también en la rutina');
  await act(p, '#sheet [data-g5="split-go"][data-p="0"]'); await p.waitForTimeout(300);
  let D = await p.evaluate(([AP, CM]) => { const d = state.draft, a = d.exercises.find(e => e.name === AP), c = d.exercises.find(e => e.name === CM); return { ss: !!(ssOf(d, a) || ssOf(d, c)), rest: [a.rest, c.rest], plan: state.plans[0].days[0].exercises[1].ss, pills: document.querySelectorAll('#sx-pager .g5-split').length }; }, [AP, CM]);
  ok(!D.ss && D.rest.every(r => r > 0) && D.plan === 1 && D.pills === 0, 'solo hoy: ya no van juntos (cada uno con su descanso: ' + D.rest.join(' y ') + ' s) y la rutina sigue con la superserie');
  /* Marcar una serie de aperturas: ahora descansa (antes pasaba al curl sin descanso) */
  const R = await p.evaluate(AP => { const d = state.draft, i = d.exercises.findIndex(e => e.name === AP), s = d.exercises[i].log[0]; s.w = 10; s.r = 14; markSet(i, 0, true); return !!state.rest; }, AP);
  ok(R, 'al marcar una serie de aperturas, empieza su propio descanso');
  await p.evaluate(() => discardSession()); await startA(p); await p.waitForTimeout(500);
  /* Desde la hoja "Superserie con…": "Quitar la superserie" también pregunta; también en la rutina */
  const iA = await idx(p, AP);
  await act(p, `#sx-pager .sx-page[data-i="${iA}"] .g2-ssb`); await p.waitForTimeout(200); await act(p, '#sheet [data-g2="ss-off"]'); await p.waitForTimeout(200);
  ok(/¿Separarla solo hoy o también en la rutina\?/.test(await sheetTxt(p)), '"Quitar la superserie" de la hoja de superserie también pregunta');
  await act(p, '#sheet [data-g5="split-go"][data-p="1"]'); await p.waitForTimeout(300);
  D = await p.evaluate(() => ({ plan: state.plans[0].days[0].exercises.map(e => e.ss ? 1 : 0).join(''), stored: JSON.parse(localStorage.getItem('cdh.plans'))[0].days[0].exercises[1].ss }));
  ok(D.plan === '00000' && !D.stored, 'también en la rutina: la rutina guardada ya no tiene la superserie');
  noErr(p); await p.done();
}

console.log('7. Usuario nuevo');
{
  const p = await open({ first: true });
  await p.evaluate(() => { state.settings.onb = 1; closeSheet(); const o = document.getElementById('onb'); if (o) o.remove(); const P = activePlan(); startSession(P.id, P.days[0].id); render(); }); await p.waitForTimeout(500);
  const U = await p.evaluate(() => ({ gw: state.settings.gymW, rm: document.querySelectorAll('#sx-pager .g5-rm').length, n: state.draft.exercises.length }));
  ok(!U.gw && U.rm === U.n, 'usuario nuevo: sin listas de pesos (la app no limita) y con "Quitar" en cada ejercicio');
  const n0 = U.n;
  await act(p, '#sx-pager .sx-page[data-i="1"] .g5-rm'); await p.waitForTimeout(200);
  const plan = await p.evaluate(() => !!document.querySelector('#sheet [data-g5="rm-go"][data-p="1"]'));
  await act(p, '#sheet [data-g5="rm-go"][data-p="0"]'); await p.waitForTimeout(300);
  ok(plan && (await p.evaluate(() => state.draft.exercises.length)) === n0 - 1, 'quita uno solo de hoy');
  await p.evaluate(() => { discardSession(); state.tab = 'train'; render(); }); await act(p, '[data-act="gym-pick"]'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => /^Pesos que hay en Mi gimnasio$/.test(document.querySelector('#sheet .g5-gw').textContent.trim())), 'puede anotar los pesos de su gimnasio ("Pesos que hay en Mi gimnasio")');
  noErr(p); await p.done();
}

console.log('8. Reloj: quitar, separar y unir desde "⋯ Más"');
{
  const p = await open({ watch: true });
  await startA(p); await p.waitForTimeout(500);
  ok(await p.evaluate(() => isWatch()), 'modo reloj');
  const iA = await idx(p, AP);
  await p.evaluate(i => { const d = state.draft; d.cur = i; d.exercises[i].log[0].w = 10; d.exercises[i].log[0].r = 14; d.exercises[i].log[0].done = true; saveDraft(); w2.menu = 'main'; render(); }, iA);
  let M = await p.evaluate(() => [...document.querySelectorAll('.w2-menu .w2-mi')].map(b => b.textContent.trim()));
  ok(M.some(t => /Quitar ejercicio/.test(t)) && M.some(t => /Separar superserie/.test(t)) && !M.some(t => /Unir con el siguiente/.test(t)), 'aperturas (en superserie): "Quitar ejercicio" y "Separar superserie"');
  /* Separar también en la rutina */
  await act(p, '.w2-menu [data-m="g5split"]'); await p.waitForTimeout(150);
  M = await p.evaluate(() => document.querySelector('.w2-menu').innerText.replace(/\s+/g, ' '));
  ok(/¿Solo hoy o también en la rutina\?/.test(M) && /También en la rutina/.test(M), 'separar: pregunta solo hoy o también en la rutina');
  await act(p, '.w2-menu [data-g5w="split"][data-p="1"]'); await p.waitForTimeout(200);
  let D = await p.evaluate(i => ({ ss: !!ssMembers(state.draft, i), plan: state.plans[0].days[0].exercises.map(e => e.ss ? 1 : 0).join(''), menu: w2.menu }), iA);
  ok(!D.ss && D.plan === '00000' && !D.menu, 'separada en la sesión y en la rutina; vuelve a la serie');
  /* Unir con el siguiente (aperturas + curl) solo hoy */
  await p.evaluate(() => { w2.menu = 'main'; render(); });
  M = await p.evaluate(() => [...document.querySelectorAll('.w2-menu .w2-mi')].map(b => b.textContent.trim()));
  ok(M.some(t => /Unir con el siguiente\s*Curl Martillo/.test(t)), 'sin superserie: "Unir con el siguiente · Curl Martillo"');
  await act(p, '.w2-menu [data-m="g5join"]'); await p.waitForTimeout(150); await act(p, '.w2-menu [data-g5w="join"][data-p="0"]'); await p.waitForTimeout(200);
  D = await p.evaluate(i => ({ m: (ssMembers(state.draft, i) || []).length, plan: state.plans[0].days[0].exercises.map(e => e.ss ? 1 : 0).join('') }), iA);
  ok(D.m === 2 && D.plan === '00000', 'unidas solo hoy (la rutina no cambia)');
  /* Unir el tríceps con las laterales también en la rutina */
  const iT = await idx(p, TP);
  await p.evaluate(i => { state.draft.cur = i; w2.menu = 'g5join'; render(); }, iT); await act(p, '.w2-menu [data-g5w="join"][data-p="1"]'); await p.waitForTimeout(200);
  D = await p.evaluate(i => ({ m: (ssMembers(state.draft, i) || []).length, plan: state.plans[0].days[0].exercises.map(e => e.name + (e.ss ? '+' : '')).join(',') }), iT);
  ok(D.m === 2 && D.plan === `${PI},${AP},${CM},${TP}+,${EL}`, 'tríceps + laterales también en la rutina (' + D.plan + ')');
  /* Quitar con confirmación: las aperturas tienen 1 serie hecha */
  await p.evaluate(i => { state.draft.cur = i; w2.menu = 'g5rm'; render(); }, iA);
  M = await p.evaluate(() => document.querySelector('.w2-menu').innerText.replace(/\s+/g, ' '));
  ok(/Se borrarán 1 serie hecha/.test(M) && /Curl Martillo queda como ejercicio normal/.test(M) && /Solo de hoy/.test(M) && /También de la rutina/.test(M), 'quitar: avisa de la serie hecha y del curl, y pregunta');
  await act(p, '.w2-menu [data-g5w="rm"][data-p="0"]'); await p.waitForTimeout(150);
  D = await p.evaluate(AP => ({ has: state.draft.exercises.some(e => e.name === AP), txt: document.querySelector('.w2-menu').innerText }), AP);
  ok(D.has && /¿Seguro\? Toca otra vez/.test(D.txt), 'primer toque: pide confirmación y no borra');
  await act(p, '.w2-menu [data-g5w="rm"][data-p="0"]'); await p.waitForTimeout(200);
  D = await p.evaluate(([AP, CM]) => { const d = state.draft, i = d.exercises.findIndex(e => e.name === CM); return { has: d.exercises.some(e => e.name === AP), ss: !!ssMembers(d, i), plan: state.plans[0].days[0].exercises.length, menu: w2.menu }; }, [AP, CM]);
  ok(!D.has && !D.ss && D.plan === 5 && !D.menu, 'segundo toque: quitado solo de hoy, el curl queda normal y la rutina sigue con 5');
  const big = await p.evaluate(() => { w2.menu = 'g5rm'; render(); const b = document.querySelector('.w2-menu [data-g5w="rm"]'); const r = b.getBoundingClientRect(); return r.height; });
  ok(big >= 40, 'botones grandes (' + Math.round(big) + ' px de alto)');
  noErr(p); await p.done();
  if (BASE) {
    const strip = h => h.replace(/<button class="w2-mi g5w"[^>]*>.*?<\/button>/g, '');
    const shots = async dir => { const q = await open({ watch: true, dir, settings: SET({ g5Seed: 1 }) }); const a = await q.screenshot(); await q.evaluate(() => { startSession('pA', 'd1'); state.draft.cur = 4; w2.menu = 'main'; render(); }); await q.waitForTimeout(300); const m = await q.evaluate(() => document.querySelector('.w2-menu').innerHTML); const e = q.errs.slice(); await q.done(); return { a, m, e }; };
    const A = await shots(DIR), Bs = await shots(BASE);
    ok(A.a.equals(Bs.a), 'reloj: el inicio es idéntico a la versión anterior');
    ok(strip(A.m) === Bs.m, 'reloj: "⋯ Más" es el de antes más los botones nuevos');
    ok(!A.e.length, 'reloj: sin errores de JS');
  }
}

await browser.close();
console.log(fail ? `\n${fail} FALLA(S)` : '\nTodo OK');
process.exit(fail ? 1 : 0);
