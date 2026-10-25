import { OWNER_SETTINGS } from './owner-fixture.mjs';
// Prueba de la Tanda J (24-oct-2026), con datos inventados de un dueño con dos gimnasios.
// Uso (desde PowerShell): $env:PW_DIR = "<carpeta con node_modules/playwright>"; node tests/tj.mjs <copia transpilada> [<anterior>] [capturas]
// A. Historial con una sola regla: mismo ejercicio aunque cambie el alias o el texto entre paréntesis, en el mismo
//    gimnasio, sin importar el tipo de día ni la rutina (normal, importada, "Completar semana", sustituto). Incluye el
//    caso real: "Completar semana · Bombeo" con Elevación de Talones Sentado 20×20 y, 20 min después, otro "Completar
//    semana" (fuerza) en el mismo gimnasio debe mostrar "Anterior" y no "Primera vez aquí". Sesiones sin gymId.
// B. Punto 0: un solo objetivo (Tus datos = Tu objetivo y plan = exportaciones).
// C. Punto 1: reemplazar con todas las alternativas, buscador, filtro y las que no hay.
// D. Punto 2: el aviso de fin del descanso se reprograma con cada cambio. E. Puntos 4-5: semana en vivo y qué priorizar.
// F. Punto 6: reloj, avisos de tiempo pasado. G. Punto 7: ✓ derecho. H. Punto 8: gimnasio y equipo en las exportaciones.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = createRequire(path.join(process.env.PW_DIR || HERE, 'x.js'))('playwright');
const [DIR, , SHOTS] = process.argv.slice(2);
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

/* ---------- Datos inventados: Gimnasio A (rokaz) y Gimnasio B (raydac) ---------- */
const X = (id, name, type, sets, rMin, rMax, rest, weight) => ({ id, name, type, weight, sets, repsMin: rMin, repsMax: rMax, rest });
const PLANS = [
  { id: 'planA', name: 'Rutina A', gymId: 'rokaz', days: [{ id: 'a-lun', name: 'Piernas (Pesado)', weekday: 1, kind: 'fuerza', exercises: [X('xa1', 'Hip Thrust', 'Piernas', 3, 8, 10, 120, 100), X('xa2', 'Prensa 45°', 'Piernas', 3, 8, 10, 120, 150), X('xa3', 'Remo Sentado con Cable', 'Tracción', 3, 8, 10, 90, 50)] }] },
  { id: 'planB', name: 'Rutina B', gymId: 'raydac', days: [
    { id: 'b-lun', name: 'Piernas (Pesado)', weekday: 1, kind: 'fuerza', exercises: [X('xb1', 'Hip Thrust', 'Piernas', 3, 8, 10, 120, 40), X('xb2', 'Prensa 45°', 'Piernas', 3, 6, 8, 120, 160), X('xb3', 'Peso Muerto Rumano', 'Piernas', 3, 6, 8, 120, 60), X('xb4', 'Elevación de Talones Sentado', 'Piernas', 3, 8, 10, 60, 20), X('xb5', 'Remo Sentado con Cable', 'Tracción', 3, 8, 10, 90, 40)] },
    { id: 'b-mie', name: 'Piernas (Bombeo)', weekday: 3, kind: 'bombeo', exercises: [X('xb6', 'Prensa 45°', 'Piernas', 3, 12, 15, 60, 120), X('xb7', 'Hip Thrust', 'Piernas', 3, 12, 15, 60, 40)] }] },
  { id: 'ri-x', name: 'Rutinas de Claude', gymId: 'raydac', days: [{ id: 'ri-d1', name: 'Brazos', weekday: 6, kind: 'fuerza', src: { n: 'Claude', c: '#d97757' }, imp: 1, exercises: [X('xr1', 'Curl Bíceps', 'Tracción', 3, 8, 10, 60, 14)] }] },
];
const set3 = (w, r, rir) => [0, 1, 2].map(k => ({ w, r, rir: rir == null ? null : Math.max(0, rir - (k === 2 ? 1 : 0)) }));
const SS = (id, date, gymId, gymName, planId, dayId, dayName, kind, ex, extra) => Object.assign({ id, date: new Date(date).toISOString(), planId, planName: '', dayId, dayName, gymId, gymName, kind, durationSec: 3600, exercises: ex }, extra || {});
const SESSIONS = [
  /* el caso real: "Completar semana · Bombeo" hoy en el Gimnasio B (89 min) */
  SS('s1', '2026-10-24T20:51:00', 'raydac', 'Gimnasio B', 'wcfill', 'wf-1', 'Completar semana · Bombeo', 'bombeo', [{ name: 'Elevación de Talones Sentado', type: 'Piernas', sets: set3(20, 20, 1) }, { name: 'Hip Thrust', type: 'Piernas', sets: set3(40, 15, 1) }], { durationSec: 5340 }),
  SS('s7', '2026-10-23T19:00:00', 'raydac', 'Gimnasio B', 'planB', 'b-mie', 'Piernas (Bombeo)', 'bombeo', [{ name: 'Peso Muerto Rumano', type: 'Piernas', sets: set3(50, 12, 2) }]),
  SS('s2', '2026-10-22T19:00:00', 'rokaz', 'Gimnasio A', 'planA', 'a-lun', 'Piernas (Pesado)', 'fuerza', [{ name: 'Hip Thrust', type: 'Piernas', sets: set3(100, 8, 2) }, { name: 'Remo Sentado con Cable', type: 'Tracción', sets: set3(50, 10, 2) }]),
  /* nombre con la nota de la exportación (lo copió una IA) */
  SS('s3', '2026-10-21T19:00:00', 'raydac', 'Gimnasio B', 'planB', 'b-mie', 'Piernas (Bombeo)', 'bombeo', [{ name: 'Prensa 45°', type: 'Piernas', sets: set3(120, 15, 2) }, { name: 'Hip Thrust (kg en discos + barra 20)', type: 'Piernas', sets: set3(60, 12, 2) }]),
  /* sustituto: Remo con Mancuerna en lugar de Remo Sentado con Cable */
  SS('s4', '2026-10-19T19:00:00', 'raydac', 'Gimnasio B', 'planB', 'b-lun', 'Piernas (Pesado)', 'fuerza', [{ name: 'Prensa 45°', type: 'Piernas', sets: set3(160, 8, 2) }, { name: 'Remo con Mancuerna', type: 'Tracción', of: 'Remo Sentado con Cable', sets: set3(30, 10, 2) }]),
  /* rutina importada con un alias del catálogo */
  SS('s5', '2026-10-17T19:00:00', 'raydac', 'Gimnasio B', 'ri-x', 'ri-d1', 'Brazos', 'fuerza', [{ name: 'Curl Alterno', type: 'Tracción', sets: set3(14, 10, 2) }]),
  /* 108 días antes del 24-oct, fuerza (y el 23-oct hay una de bombeo) */
  SS('s6', '2026-07-08T19:00:00', 'raydac', 'Gimnasio B', 'planB', 'b-lun', 'Piernas (Pesado)', 'fuerza', [{ name: 'Peso Muerto Rumano', type: 'Piernas', sets: set3(60, 8, 2) }]),
  /* sesiones antiguas sin gymId */
  SS('s8', '2026-06-01T19:00:00', undefined, 'Gimnasio B', 'planB', 'b-lun', 'Piernas (Pesado)', 'fuerza', [{ name: 'Sentadilla Hack', type: 'Piernas', sets: set3(70, 10) }]),
  SS('s9', '2026-05-30T19:00:00', undefined, 'Gimnasio A', 'plan-borrado', 'x-1', 'Viejo', 'fuerza', [{ name: 'Sentadilla Hack', type: 'Piernas', sets: set3(50, 10) }]),
  SS('s10', '2026-05-29T19:00:00', undefined, '', 'zz', 'zz-1', 'Viejo', 'fuerza', [{ name: 'Sentadilla Hack', type: 'Piernas', sets: set3(40, 10) }]),
  SS('s11', '2026-05-28T19:00:00', undefined, '', 'zz2', 'b-mie', 'Piernas (Bombeo)', 'bombeo', [{ name: 'Sentadilla Hack', type: 'Piernas', sets: set3(45, 15) }]),
].map(s => { if (s.gymId === undefined) delete s.gymId; return s; });
const GYMS = [{ id: 'rokaz', name: 'Gimnasio A' }, { id: 'raydac', name: 'Gimnasio B' }];
const SETTINGS = Object.assign(structuredClone(OWNER_SETTINGS), { activePlanId: 'planB', activeGymId: 'raydac', planByGym: { rokaz: 'planA', raydac: 'planB' }, newsSeen: 'n6' });

const NATIVE = () => {
  window.__ha = { calls: [] };
  const rec = n => o => { window.__ha.calls.push([n, o || null]); return Promise.resolve(n === 'status' ? { exact: true, fullScreen: true, notif: true, overlay: true, sdk: 35 } : n === 'takeEvents' ? { events: [] } : n === 'log' ? { log: [] } : {}); };
  const H = {}; ['schedule', 'takeEvents', 'dismiss', 'status', 'openSettings', 'test', 'log', 'rest', 'restCancel'].forEach(n => { H[n] = rec(n); });
  window.Capacitor = { isNativePlatform: () => true, Plugins: { HabitAlarm: H } };
};
async function open({ watch, native, settings } = {}) {
  const srv = await serve(DIR);
  const ctx = await browser.newContext(watch ? { viewport: { width: 410, height: 500 }, hasTouch: true } : { viewport: { width: 390, height: 844 }, hasTouch: true });
  await ctx.route(/googleapis|gstatic|google\.com|firebase|github/, r => r.abort());
  const p = await ctx.newPage(); p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message));
  await p.clock.setFixedTime(new Date('2026-10-24T22:40:00'));
  if (native) await p.addInitScript(NATIVE);
  await p.addInitScript(([s, pl, ss, g]) => { if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    localStorage.setItem('cdh.settings', JSON.stringify(s)); localStorage.setItem('cdh.plans', JSON.stringify(pl)); localStorage.setItem('cdh.sessions', JSON.stringify(ss));
    localStorage.setItem('cdh.gyms', JSON.stringify(g)); localStorage.setItem('cdh.newsSeen', '"n6"'); localStorage.setItem('cdh.reminders', '[]'); }, [settings || SETTINGS, PLANS, SESSIONS, GYMS]);
  await p.goto(`http://127.0.0.1:${srv.address().port}/index.html`); await p.waitForTimeout(2000);
  await p.evaluate(() => { state.settings.healthOk = 1; closeSheet(); render(); });
  p.done = async () => { await ctx.close(); srv.close(); };
  return p;
}
const shot = async (p, n) => { if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await p.screenshot({ path: path.join(SHOTS, n + '.png') }); } };
const noErr = p => ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));

console.log('A. Historial: una sola regla en toda la app');
{
  const p = await open();
  /* El caso real de los gemelos */
  const G = await p.evaluate(() => {
    const f = { id: 'wf-2', wk: wkKey(new Date()), date: dk(new Date()), kind: 'fuerza', gym: 'raydac', list: [E('Elevación de Talones Sentado', 'Piernas', 20, 4, '8-10', 1.5)] };
    wcStart(f); const d = state.draft, e = d.exercises[0];
    return { gym: d.gymId, kind: d.kind, prev: e.prev.map(s => s.w + 'x' + s.r).join(','), last: e.lastDate, refGym: e.refGym, head: (e.coach && e.coach.head || '') + ' ' + (e.coach && (e.coach.tips || []).join(' ')), txt: document.getElementById('sx') ? document.getElementById('sx').textContent : '' };
  });
  ok(G.gym === 'raydac' && G.kind === 'fuerza', '"Completar semana" (fuerza) empieza en el Gimnasio B');
  ok(/^20x20,20x20,20x20/.test(G.prev) && G.last === new Date('2026-10-24T20:51:00').toISOString() && !G.refGym, `"Anterior": 20×20 ×3 de la sesión de bombeo de hace 20 min (${G.prev})`);
  ok(!/Primera vez/.test(G.head) && /Tu última vez aquí/.test(G.head) && !/Primera vez aquí/.test(G.txt), 'no dice "Primera vez aquí": ' + G.head.replace(/<[^>]+>/g, '').slice(0, 110));
  await shot(p, 'a-gemelos');
  /* (b) la sesión de "Completar semana" se guarda con su gimnasio y la siguiente la encuentra */
  const B = await p.evaluate(() => { markSet(0, 0, true); markSet(0, 1, true); state.rest = null; finishSession(); closeSheet(); const s = state.sessions[0];
    const f = { id: 'wf-3', wk: wkKey(new Date()), date: dk(new Date()), kind: 'fuerza', gym: 'raydac', list: [E('Elevación de Talones Sentado', 'Piernas', 20, 4, '8-10', 1.5)] };
    wcStart(f); const e = state.draft.exercises[0], r = { gym: s.gymId, plan: s.planId, prev: e.prev[0] ? e.prev[0].w + 'x' + e.prev[0].r : '', last: e.lastDate === s.date }; discardSession(); return r; });
  ok(B.gym === 'raydac' && B.plan === 'wcfill' && B.prev === '20x10' && B.last, '"Completar semana" se guarda con gymId del Gimnasio B y la siguiente sesión la usa como "Anterior"');
  /* Funciones de historial */
  const H = await p.evaluate(() => {
    const t = (l) => l ? l.sets.map(s => s.w + 'x' + s.r).join(',') + '@' + l.gymId + (l.kref ? '/' + l.kref : '') + (l.ref ? '/ref' : '') : null;
    const ex = { name: 'Peso Muerto Rumano', type: 'Piernas', sets: 3, repsMin: 6, repsMax: 8, rest: 120, weight: 60 }, c = coachFor(ex, 'raydac', 'fuerza');
    const prensa = coachFor({ name: 'Prensa 45°', type: 'Piernas', sets: 3, repsMin: 6, repsMax: 8, rest: 120, weight: 160 }, 'raydac', 'fuerza');
    const remoB = coachFor({ name: 'Remo Sentado con Cable', type: 'Tracción', sets: 3, repsMin: 8, repsMax: 10, rest: 90, weight: 40 }, 'raydac', 'fuerza');
    const nunca = coachFor({ name: 'Zancada con Mancuernas', type: 'Piernas', sets: 3, repsMin: 8, repsMax: 10, rest: 90, weight: 10 }, 'raydac', 'fuerza');
    return {
      htB: t(lastHere('Hip Thrust', 'raydac')), htA: t(lastHere('Hip Thrust', 'rokaz')), htBf: t(lastPerf('Hip Thrust', 'raydac', 'fuerza')),
      histHT: exHistory('Hip Thrust', 'raydac', 'fuerza', 12).map(h => h.kind + ':' + h.sets[0].w).join(','),
      same1: exSame('Hip Thrust (kg en discos + barra 20)', 'Hip Thrust'), same2: exSame('Remo Gironda', 'Remo Sentado con Cable'), same3: exSame('Elevación de Talones Sentado (Gemelos sentado)', 'Elevación de Talones Sentado'),
      diff1: exSame('Press Militar (Mancuernas)', 'Press Militar con Barra'), diff2: exSame('Curl Femoral Sentado', 'Curl Femoral Tumbado'), diff3: exSame('Hip Thrust', 'Hip Thrust en Máquina'),
      best: Math.round(bestE1rm('Hip Thrust', 'raydac')), curl: t(lastHere('Curl Bíceps', 'raydac')), done: doneBefore('Curl Bíceps') && timesDone('Hip Thrust'),
      subNew: t(lastHere('Remo con Mancuerna', 'raydac')), subOld: t(lastHere('Remo Sentado con Cable', 'raydac')), subA: t(lastHere('Remo Sentado con Cable', 'rokaz')),
      gapMode: c.mode, gapTxt: c.head + ' ' + c.tips.join(' '), prensaW: prensa.w, remoB: remoB.head, nunca: nunca.head,
      gyms: ['s8', 's9', 's10', 's11'].map(id => sGym(state.sessions.find(s => s.id === id))).join(','),
      pts: exPoints('Hip Thrust', 'raydac').length, note: !!lastNote,
    };
  });
  ok(H.htB === '40x15,40x15,40x15@raydac' && H.htA === '100x8,100x8,100x8@rokaz', `"Anterior" por gimnasio: B ${H.htB} · A ${H.htA}`);
  ok(H.htBf === '40x15,40x15,40x15@raydac/bombeo/ref', 'sin sesiones de fuerza aquí, la de bombeo es la referencia del coach (no "primera vez"): ' + H.htBf);
  ok(H.histHT === 'bombeo:40,bombeo:60', 'el historial del Gimnasio B junta el nombre con "(kg en discos + barra 20)" y no trae el del Gimnasio A: ' + H.histHT);
  ok(H.same1 && H.same2 && H.same3, 'mismo ejercicio con la nota de la exportación, con un alias del catálogo y con "(Gemelos sentado)"');
  ok(!H.diff1 && !H.diff2 && !H.diff3, 'ejercicios distintos no se mezclan (Press Militar mancuernas/barra, curl sentado/tumbado, hip thrust/máquina)');
  ok(H.best === 84, 'mejor marca (1RM) del Gimnasio B cuenta el nombre con nota: ' + H.best);
  ok(H.curl === '14x10,14x10,14x10@raydac' && H.done === 3, 'rutina importada con alias ("Curl Alterno") = Curl Bíceps; récords y veces hechas con la misma regla');
  ok(H.subNew === '30x10,30x10,30x10@raydac' && H.subOld === null && H.subA === '50x10,50x10,50x10@rokaz', 'sustituto: cuenta para el que hiciste, no para el que reemplazó');
  ok(H.gapMode !== 'back' && !/Hace \d+ días/.test(H.gapTxt), 'Peso Muerto Rumano: no dice "Hace 108 días" (lo hiciste ayer en un día de bombeo aquí): ' + H.gapTxt.replace(/<[^>]+>/g, '').slice(0, 90));
  ok(H.prensaW >= 160, 'el coach sigue progresando con tu último día del mismo tipo (Prensa 160 kg de fuerza): ' + H.prensaW);
  ok(/Referencia de Gimnasio A/.test(H.remoB), 'nunca hecho en el Gimnasio B pero sí en el A: referencia del A, no "primera vez"');
  ok(/Primera vez/.test(H.nunca), 'nunca hecho en ningún gimnasio: "Primera vez"');
  ok(H.gyms === 'raydac,rokaz,rokaz,raydac', 'sesiones sin gymId: por su rutina, el día de su rutina, el nombre del gimnasio guardado o el principal: ' + H.gyms);
  ok(H.pts === 2, 'progreso / gráficos del ejercicio en el Gimnasio B con la misma regla');
  /* Sesión normal en el Gimnasio B (fuerza) */
  const N = await p.evaluate(() => { startSession('planB', 'b-lun'); const d = state.draft, g = n => d.exercises.find(e => e.name === n);
    const r = { ht: g('Hip Thrust').prev.map(s => s.w + 'x' + s.r).join(','), pr: g('Prensa 45°').prev.map(s => s.w + 'x' + s.r).join(','), prW: g('Prensa 45°').coach.w, remo: g('Remo Sentado con Cable').refGym, txt: document.getElementById('sx').textContent };
    discardSession(); return r; });
  ok(N.ht === '40x15,40x15,40x15' && N.pr === '120x15,120x15,120x15', `rutina normal: "Anterior" = tu última vez aquí sin importar el tipo (Hip Thrust ${N.ht}, Prensa ${N.pr})`);
  ok(N.prW >= 160 && N.remo === 'Gimnasio A', 'y el peso sugerido de fuerza sale de tu última sesión de fuerza; Remo usa la referencia del Gimnasio A');
  /* Récords, progreso y exportaciones */
  const R = await p.evaluate(() => { state.tab = 'progress'; state.progSub = 'ejercicios'; state.gf = 'all'; render();
    const rows = Array.prototype.map.call(document.querySelectorAll('#app table.rec td:first-child b'), b => b.textContent);
    const opts = Array.prototype.map.call(document.querySelectorAll('#sel-ex option'), o => o.textContent);
    const all = aixAllText('all').txt, rec = all.slice(all.indexOf('RÉCORDS'), all.indexOf('SERIES POR'));
    return { ht: rows.filter(n => /^Hip Thrust/.test(n)), curl: rows.filter(n => /^Curl (Bíceps|Alterno)/.test(n)), opts: opts.filter(n => /^Hip Thrust/.test(n)), recHT: (rec.match(/^- Hip Thrust/mg) || []).length, s3: sessionPrompt([state.sessions.find(s => s.id === 's3')]) };
  });
  ok(R.ht.length === 1 && R.opts.length === 1, 'Récords personales y Progreso: una sola entrada de Hip Thrust (' + R.ht.join(' | ') + ')');
  ok(R.recHT === 1, 'exportación: RÉCORDS con un solo Hip Thrust');
  ok(/- Hip Thrust \(kg en discos \+ barra 20\): /.test(R.s3) || /- Hip Thrust/.test(R.s3), 'la sesión vieja se exporta');
  ok(!/Hip Thrust \(kg en discos/.test(await p.evaluate(() => sessionPrompt([state.sessions.find(s => s.id === 's1')]))), 'la exportación ya no pone "(kg en discos …)" pegado al nombre');
  ok(await p.evaluate(() => riMatch('Hip Thrust (kg en discos + barra 20)').name === 'Hip Thrust'), 'Importar rutinas: "Hip Thrust (kg en discos + barra 20)" se lee como Hip Thrust');
  noErr(p); await p.done();
}

console.log('A2. Reloj: "Antes" con la misma regla');
{
  const p = await open({ watch: true });
  const W = await p.evaluate(() => { const f = { id: 'wf-9', wk: wkKey(new Date()), date: dk(new Date()), kind: 'fuerza', gym: 'raydac', list: [E('Elevación de Talones Sentado', 'Piernas', 20, 4, '8-10', 1.5)] };
    wcStart(f); render(); const sk = document.querySelector('[data-act="w2-wuskip"]'); if (sk) sk.click(); render(); return { w: isWatch(), prev: state.draft.exercises[0].prev.length, txt: document.getElementById('app').textContent }; });
  ok(W.w && W.prev >= 3 && /Antes: 20 × 20/.test(W.txt), 'en el reloj, "Completar semana" muestra "Antes: 20 × 20"');
  noErr(p); await p.done();
}

console.log('B. Punto 0: un solo objetivo');
{
  const p = await open({ settings: Object.assign(structuredClone(SETTINGS), { prof: { name: 'Atleta de prueba', age: 31, goal: null } }) });
  const B = await p.evaluate(async () => {
    const out = {};
    out.empty = { exp: /Aún no te dije mi objetivo/.test(sessionPrompt([state.sessions[0]])), plate: /Para tu objetivo/.test(plateCard()), dd: ddGoal() };
    dataSheet(); document.getElementById('bd-goal').value = 'fuerza'; document.getElementById('f-bdd').requestSubmit(); await new Promise(r => setTimeout(r, 100));
    state.tab = 'settings'; render(); document.querySelectorAll('#app details').forEach(d => { d.open = true; });
    const name = PB_GOALS.fuerza[0];
    out.tus = { goal: state.settings.prof.goal, card: document.querySelector('#app .pb-card').textContent.indexOf(name) >= 0, btn: /Cambiar objetivo/.test(document.querySelector('#app .pb-card').textContent), exp: sessionPrompt([state.sessions[0]]).indexOf('Mi objetivo: ' + name) >= 0, week: aixWeekText(0).txt.indexOf('Mi objetivo: ' + name) >= 0, all: aixAllText('3m').txt.indexOf(name) >= 0 };
    const b = document.createElement('button'); b.dataset.pb = 'redo'; document.body.appendChild(b); b.click(); b.remove();
    out.redo = typeof pb !== 'undefined' && pb.o ? pb.o.goal : null; if (typeof pbClose === 'function') pbClose();
    state.settings.prof = Object.assign({}, state.settings.prof, { goal: 'grasa' }); applyProf();   /* como lo guarda "Tu objetivo y plan" */
    dataSheet(); out.sel = document.getElementById('bd-goal').value; closeSheet();
    out.after = sessionPrompt([state.sessions[0]]).indexOf('Mi objetivo: ' + PB_GOALS.grasa[0]) >= 0 && ddGoal() === PB_GOALS.grasa[0] && HISTORY.goal === PB_GOALS.grasa[0];
    return out;
  });
  ok(B.empty.exp && B.empty.plate && B.empty.dd === '', 'sin objetivo: la exportación lo pregunta, "Tu plato" dice "tu objetivo" y no se supone ninguno');
  ok(B.tus.goal === 'fuerza' && B.tus.card && B.tus.btn, 'elegido en "Tus datos": "Tu objetivo y plan" muestra el mismo y ofrece cambiarlo');
  ok(B.tus.exp && B.tus.week && B.tus.all, 'las exportaciones (sesión, semana, todo) usan ese objetivo');
  ok(B.redo === 'fuerza', '"Cambiar objetivo" abre con el mismo objetivo elegido');
  ok(B.sel === 'grasa' && B.after, 'cambiado en "Tu objetivo y plan": "Tus datos" y las exportaciones muestran el nuevo');
  noErr(p); await p.done();
}

console.log('C. Punto 1: reemplazar con todas las alternativas');
{
  const p = await open();
  const C = await p.evaluate(async () => {
    startSession('planB', 'b-lun'); const i = state.draft.exercises.findIndex(e => e.name === 'Peso Muerto Rumano'); state.draft.cur = i;
    swapSheet(i);
    const names = () => Array.prototype.map.call(document.querySelectorAll('#alt-list .sw-row'), b => b.dataset.name);
    const out = { all: names(), chips: Array.prototype.map.call(document.querySelectorAll('#alt-f [data-altf]'), b => b.dataset.altf), labels: Array.prototype.map.call(document.querySelectorAll('#alt-list .label'), l => l.textContent) };
    const q = document.getElementById('alt-q'); q.value = 'smith'; q.dispatchEvent(new Event('input', { bubbles: true })); out.smith = names();
    q.value = ''; q.dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('#alt-f [data-altf="manc"]').click(); out.manc = names(); out.mancF = out.manc.map(n => equipOf(libFind(n)));
    gymNoSet('raydac', 'smith', true); swapSheet(i);
    const sm = document.querySelector('#alt-list .sw-row[data-name="Peso Muerto Rumano en Smith"]');
    out.no = sm ? { off: sm.classList.contains('alt-off'), tag: /No hay en Gimnasio B/.test(sm.textContent), last: names().indexOf('Peso Muerto Rumano en Smith') > names().indexOf('Peso Muerto Rumano con Mancuernas') } : null;
    out.noLbl = Array.prototype.some.call(document.querySelectorAll('#alt-list .label'), l => /^No hay en Gimnasio B/.test(l.textContent));
    sm.click(); await new Promise(r => setTimeout(r, 100));
    out.swapped = state.draft.exercises[i].name;
    return out;
  });
  const has = n => C.all.indexOf(n) >= 0;
  ok(['Peso Muerto Rumano con Mancuernas', 'Peso Muerto Rumano en Smith', 'Peso Muerto Rumano en Polea', 'Peso Muerto Rumano con Kettlebell', 'Curl Femoral Tumbado'].every(has) && C.all.length >= 15, `todas las del mismo músculo con todo tipo de equipo (${C.all.length}): mancuernas, Smith, polea, kettlebell, máquina de femoral…`);
  ok(C.all.indexOf('Peso Muerto Rumano con Mancuernas') < C.all.indexOf('Curl Femoral Tumbado') && /^Mismo movimiento/.test(C.labels[0]), 'primero el mismo movimiento: ' + C.labels.join(' · '));
  ok(['barra', 'manc', 'smith', 'polea', 'maq'].every(f => C.chips.indexOf(f) >= 0), 'filtro por equipo: ' + C.chips.join(', '));
  ok(C.smith.length >= 1 && C.smith.every(n => /Smith/.test(n)), 'buscador "smith": ' + C.smith.join(', '));
  ok(C.manc.length >= 2 && C.mancF.every(t => t === 'manc') && C.manc.indexOf('Peso Muerto Rumano con Mancuernas') >= 0, 'filtro Mancuernas: ' + C.manc.join(', '));
  ok(C.no && C.no.off && C.no.tag && C.no.last && C.noLbl, 'lo que no hay en el Gimnasio B sale marcado y al final ("No hay en Gimnasio B")');
  ok(C.swapped === 'Peso Muerto Rumano en Smith', 'y se puede elegir igual');
  await shot(p, 'c-reemplazar');
  noErr(p); await p.done();
}

console.log('D. Punto 2: el aviso con la pantalla apagada sigue al descanso');
{
  const p = await open({ native: true });
  const calls = n => p.evaluate(n => window.__ha.calls.filter(c => c[0] === n).map(c => c[1]), n);
  const clear = () => p.evaluate(() => { window.__ha.calls = []; });
  const vis = v => p.evaluate(v => { Object.defineProperty(document, 'visibilityState', { value: v, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); }, v);
  const R0 = await p.evaluate(() => { startSession('planB', 'b-lun'); markSet(0, 0, true); return { end: state.rest.end, total: state.rest.total }; });
  await p.waitForTimeout(400);
  let c = await calls('rest');
  ok(c.length >= 1 && c[c.length - 1].at === R0.end, 'al empezar el descanso queda programado a su hora');
  await clear(); await p.evaluate(() => { const b = document.createElement('button'); b.dataset.act = 'rest-add'; b.dataset.d = '15'; document.body.appendChild(b); b.click(); b.remove(); }); await p.waitForTimeout(400);
  c = await calls('rest');
  ok(c.length === 1 && c[0].at === R0.end + 15000, '+15 s: se reprograma con la hora nueva');
  await clear(); await p.evaluate(() => { const b = document.createElement('button'); b.dataset.act = 'rest-add'; b.dataset.d = '-15'; document.body.appendChild(b); b.click(); b.remove(); }); await p.waitForTimeout(400);
  c = await calls('rest');
  ok(c.length === 1 && c[0].at === R0.end, '−15 s: se reprograma');
  await clear(); const R1 = await p.evaluate(() => { const b = document.createElement('button'); b.dataset.act = 'rest-step'; b.dataset.ex = '0'; b.dataset.d = '10'; document.body.appendChild(b); b.click(); b.remove(); return state.draft.exercises[0].rest; }); await p.waitForTimeout(400);
  c = await calls('rest');
  ok(R1 === 130 && c.length === 1 && c[0].at === R0.end + 10000, 'editar el descanso del ejercicio que descansa (+10 s): el descanso en marcha y el aviso cambian');
  await clear(); await vis('hidden'); c = await calls('rest');
  ok(c.length === 1 && c[0].at === R0.end + 10000, 'al apagar la pantalla queda con la hora nueva (no la predeterminada)');
  await vis('visible'); await clear();
  await p.evaluate(() => { const b = document.createElement('button'); b.dataset.act = 'rest-skip'; document.body.appendChild(b); b.click(); b.remove(); }); await p.waitForTimeout(400);
  ok((await calls('restCancel')).length === 1 && !(await calls('rest')).length, 'Saltar el descanso: se cancela');
  noErr(p); await p.done();
}

console.log('E. Puntos 4 y 5: tu semana en vivo durante la sesión');
{
  const p = await open();
  const E1 = await p.evaluate(() => {
    startSession('planB', 'b-lun'); const d = state.draft, i = d.exercises.findIndex(e => e.name === 'Hip Thrust');
    const sh = zoneShares('Hip Thrust'), m = Object.keys(sh).find(k => sh[k] === 1);
    const w0 = weekSets(0).sets[m], v0 = wcVolume().rows.find(r => r.k === m);
    markSet(i, 0, true); state.rest = null;
    const w1 = weekSets(0).sets[m], v1 = wcVolume().rows.find(r => r.k === m);
    render();
    const boxes = document.querySelectorAll('#sx-pager .sx-page .card.ex .lv-box').length;
    const card = document.querySelector(`#sx-pager .sx-page[data-i="${i}"] .lv-box`);
    /* una serie de más (no estaba en el plan) sube el total de la semana */
    const t0 = wcVolume().rows.find(r => r.k === m).t; d.exercises[i].log.push({ w: 40, r: null, done: false, drops: [] }); markSet(i, 3, true); state.rest = null; const t1 = wcVolume().rows.find(r => r.k === m).t;
    return { m, w0, w1, d0: v0.d, d1: v1.d, p0: v0.p, p1: v1.p, boxes, n: d.exercises.length, txt: card ? card.textContent : '', svg: !!(card && card.querySelector('.mm-svg')), t0, t1 };
  });
  ok(E1.w1 === E1.w0 + 1 && E1.d1 === E1.d0 + 1 && E1.p1 === E1.p0 - 1, `mapa muscular y "Completar semana" en vivo: ${E1.m} ${E1.w0} → ${E1.w1} al marcar una serie (lo que falta de hoy baja)`);
  ok(E1.t1 === E1.t0 + 1, 'una serie de más sube el total de la semana al marcarla');
  ok(E1.boxes === E1.n && E1.svg && /Tu semana en vivo/.test(E1.txt), 'bajo cada ejercicio: el mapa muscular de la semana en vivo');
  const E2 = await p.evaluate(async () => {
    const d = state.draft, i = d.exercises.findIndex(e => e.name === 'Prensa 45°'); d.cur = i;
    d.exercises[i].log.forEach((s, j) => markSet(i, j, true)); state.rest = null; render();
    const to = state.lvJust && state.lvJust.to, box = document.querySelector(`#sx-pager .sx-page[data-i="${to}"] .lv-next`), done = document.querySelector(`#sx-pager .sx-page[data-i="${i}"] .lv-next`);
    const go = box && box.querySelector('[data-lv]'), r = { from: state.lvJust && state.lvJust.from, txt: box ? box.textContent.replace(/\s+/g, ' ') : '', done: !!done, btn: go ? go.dataset.lv : null };
    if (go) { go.click(); await new Promise(x => setTimeout(x, 200)); r.cur = state.draft.cur; r.n = state.draft.exercises.length; }
    return r;
  });
  ok(E2.done && E2.txt && /(Ahora conviene priorizar|Vas bien)/.test(E2.txt), 'al terminar todas las series de un ejercicio, sugiere qué priorizar: ' + E2.txt.slice(0, 120));
  ok(!E2.btn || E2.cur != null, 'y su botón lleva al ejercicio (o lo agrega solo para hoy)');
  await shot(p, 'e-semana-en-vivo');
  noErr(p); await p.done();
}

console.log('F. Punto 6: reloj, te pasaste del descanso o de la duración');
{
  const p = await open({ watch: true });
  const F = await p.evaluate(() => {
    const al = []; window.playAlert = c => al.push(c.sound + ':' + c.vib);
    startSession('planB', 'b-lun'); render(); const now = Date.now(), out = { w: isWatch() };
    state.rest = null; WOV.rEnd = now - 20000; WOV.rLv = 0; wovTick(); out.l0 = al.length;
    WOV.rEnd = now - 40000; wovTick(); out.l1 = al.slice(); const ov = () => { const e = document.getElementById('w2-ov'); return e && !e.hidden ? e.className + '|' + e.textContent : ''; }; out.b1 = ov();
    WOV.rEnd = now - 70000; wovTick(); out.l2 = al.slice(); out.b2 = ov();
    WOV.rEnd = now - 130000; wovTick(); out.l3 = al.slice(); out.b3 = ov();
    markSet(0, 0, true); state.rest = null; wovTick(); out.reset = ov();
    al.length = 0; WOV.rEnd = 0; state.draft.start = new Date(now - (wovEst(state.draft) + 700) * 1000).toISOString(); WOV.sLv = 0; WOV.rAt = 0; wovTick(); out.s = al.slice(); out.bs = ov();
    state.settings.wOver = false; al.length = 0; WOV.rEnd = now - 200000; WOV.rLv = 0; WOV.sLv = 0; wovTick(); out.off = al.length + '|' + ov();
    state.settings.wOver = true; discardSession(); state.tab = 'settings'; render(); out.set = !!document.querySelector('.wov-row [data-wov="tog"]');
    return out;
  });
  ok(F.w && F.l0 === 0, 'menos de 30 s pasado el descanso: nada');
  ok(F.l1.length === 1 && /^corto:1$/.test(F.l1[0]) && /lv1\|⏱ Te pasaste 0:40 del descanso/.test(F.b1), '30 s: aviso corto, 1 vibración y "Te pasaste 0:40 del descanso"');
  ok(F.l2.length === 2 && /^largo:2$/.test(F.l2[1]) && /lv2/.test(F.b2), '1 min: sube (más largo, 2 vibraciones)');
  ok(F.l3.length === 3 && /^alarma:4$/.test(F.l3[2]) && /lv3/.test(F.b3), '2 min: alarma y 4 vibraciones');
  ok(F.reset === '', 'al marcar la serie siguiente se quita');
  ok(F.s.length === 1 && /^largo:2$/.test(F.s[0]) && /lv2\|⌛ Sesión: .* · recomendado \d+ min/.test(F.bs), 'sesión 10+ min pasada de la duración recomendada: aviso nivel 2 · ' + F.bs);
  ok(F.off === '0|', 'desactivado en Ajustes: sin avisos');
  ok(F.set, 'el interruptor está en los Ajustes del reloj');
  noErr(p); await p.done();
  const q = await open();
  const P = await q.evaluate(() => { const al = []; window.playAlert = c => al.push(c); startSession('planB', 'b-lun'); render(); WOV.rEnd = Date.now() - 200000; wovTick(); const r = { n: al.length, ov: !!document.getElementById('w2-ov') }; discardSession(); state.tab = 'settings'; render(); r.set = !!document.querySelector('.wov-row'); return r; });
  ok(P.n === 0 && !P.ov && P.set, 'en el teléfono no suena ni aparece; el interruptor sale en Ajustes (para el reloj)');
  noErr(q); await q.done();
}

console.log('G. Punto 7: el ✓ del aviso "¡A la siguiente serie!" va derecho');
{
  const p = await open();
  const G = await p.evaluate(() => { startSession('planB', 'b-lun'); state.rest = { end: Date.now() - 1000, total: 90, rang: true }; tick();
    const ring = document.querySelector('#rest .rring > svg'), chk = document.querySelector('#rest .rring .t svg');
    return { lbl: document.getElementById('rest').textContent.indexOf('¡A la siguiente serie!') >= 0, ring: ring && getComputedStyle(ring).transform, chk: chk && getComputedStyle(chk).transform, pos: chk && getComputedStyle(chk).position }; });
  ok(G.lbl && G.ring && G.ring !== 'none' && G.chk === 'none' && G.pos !== 'absolute', `el anillo sigue girado y el ✓ no (anillo ${G.ring}, ✓ ${G.chk})`);
  await shot(p, 'g-check');
  noErr(p); await p.done();
}

console.log('H. Punto 8: gimnasio y equipo en las exportaciones');
{
  const p = await open();
  const H = await p.evaluate(() => { gymNoSet('raydac', 'smith', true); gymNoSet('raydac', 'prensa', true);
    const s = sessionPrompt([state.sessions.find(x => x.id === 's1')]), w = aixWeekText(0).txt, a = aixAllText('3m').txt;
    return { s, w, a, eqS: eqName('smith'), eqP: eqName('prensa') }; });
  ok(/· gimnasio Gimnasio B · Completar semana/.test(H.s), 'sesión: dice en qué gimnasio fue');
  ok(H.s.indexOf('GIMNASIO Y EQUIPO') >= 0 && H.s.indexOf(`- Gimnasio B: hay `) >= 0 && H.s.indexOf('NO hay: ') >= 0 && H.s.indexOf(H.eqS) >= 0 && H.s.indexOf(H.eqP) >= 0 && H.s.indexOf('GIMNASIO Y EQUIPO') < H.s.indexOf('LO QUE TE PIDO'), 'sesión: el equipo que hay y el que no hay en ese gimnasio, antes de lo que se pide');
  ok(/· gimnasio Gimnasio A ·/.test(H.w) && /· gimnasio Gimnasio B ·/.test(H.w) && /- Gimnasio A: hay .*\(no marqué equipo que falte\)/.test(H.w) && /- Gimnasio B: hay .*NO hay: /.test(H.w), 'semana con sesiones de los dos gimnasios: cada sesión con su gimnasio y el equipo de los dos');
  ok(H.a.indexOf('GIMNASIO Y EQUIPO') >= 0, 'también en "Exportar todo"');
  noErr(p); await p.done();
}

if (SHOTS) {   /* capturas para revisar a ojo (no cuentan como prueba) */
  const p = await open();
  await p.evaluate(() => { startSession('planB', 'b-lun'); const i = state.draft.exercises.findIndex(e => e.name === 'Peso Muerto Rumano'); state.draft.cur = i; swapSheet(i); });
  await p.waitForTimeout(300); await shot(p, 'x-reemplazar-hoja');
  await p.evaluate(() => { closeSheet(); markSet(0, 0, true); state.rest = null; render(); const b = document.querySelector('#sx-pager .sx-page[data-i="0"] .lv-box'); b.scrollIntoView({ block: 'end' }); });
  await p.waitForTimeout(300); await shot(p, 'x-semana-en-vivo');
  await p.evaluate(() => { const d = state.draft; d.exercises[0].log.forEach((s, j) => { if (!s.done) markSet(0, j, true); }); state.rest = null; render(); const b = document.querySelector(`#sx-pager .sx-page[data-i="${d.cur}"] .lv-box`); b.scrollIntoView({ block: 'end' }); });
  await p.waitForTimeout(300); await shot(p, 'x-priorizar'); await p.done();
  const w = await open({ watch: true });
  await w.evaluate(() => { window.playAlert = () => {}; startSession('planB', 'b-lun'); render(); const sk = document.querySelector('[data-act="w2-wuskip"]'); if (sk) sk.click(); render(); state.rest = null; wovTick(); WOV.rEnd = Date.now() - 75000; wovTick(); });
  await w.waitForTimeout(200); await shot(w, 'x-reloj-aviso'); await w.done();
}
await browser.close();
console.log(fail ?`\n${fail} FALLAS` : '\nTodo OK');
process.exit(fail ? 1 : 0);
