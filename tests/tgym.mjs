import { OWNER_SETTINGS } from './owner-fixture.mjs';
// Prueba de los ajustes del gimnasio (rama ajustes-gym), con datos inventados.
// Uso (desde PowerShell): $env:PW_DIR = "<carpeta con node_modules/playwright>"; node tests/tgym.mjs <copia transpilada>
// La parte nativa no corre en el navegador: se simula el plugin HabitAlarm y se comprueba lo que la app le pide.
// 1. Descanso: misma hora de fin en la app y en el aviso (+15/−15, RIR, pantalla apagada, segundo plano, Saltar, superserie, agregado).
// 2. Orden real: historial, exportaciones, Compartir, reloj, sesión editada. 3. Siguiente ejercicio. 4. Coach sin descanso completo.
// 5. Recordatorio cancelado 3 días seguidos. 6. Usuario nuevo, dueño sin datos y reloj.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = createRequire(path.join(process.env.PW_DIR || HERE, 'x.js'))('playwright');
const [DIR] = process.argv.slice(2);
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
const T0 = Date.parse('2026-11-05T18:00:00');   /* jueves */
let N = 0;
const X = (name, sets, w, extra) => Object.assign({ id: 'x' + (++N), name, type: 'Piernas', weight: w, sets, repsMin: 8, repsMax: 12, rest: 90 }, extra);
const planDay = () => [X('Prensa 45°', 2, 80), X('Extensión de Pierna', 2, 40), X('Curl Femoral Tumbado', 2, 30), X('Elevación de Talones de Pie', 2, 40)];
const PLAN = (kind = 'bombeo', ex = planDay()) => ({ id: 'pA', name: 'Rutina A', gymId: 'rokaz', days: [{ id: 'dA', name: 'Pierna', weekday: 4, kind, exercises: ex }] });
const SET = extra => { const s = Object.assign(structuredClone(OWNER_SETTINGS), { activePlanId: 'pA', activeGymId: 'rokaz', planByGym: { rokaz: 'pA' }, newsSeen: 'n6' }, extra || {}); s.prof = Object.assign({}, s.prof, { goal: 'musculo', exp: 2, mins: 75 }); return s; };

/* Capacitor simulado: anota lo que la app le pide al plugin y a las notificaciones */
const NATIVE = () => {
  window.__ha = []; window.__ev = [];
  const rec = n => o => { window.__ha.push([n, o || null]); if (n === 'takeEvents') { const e = window.__ev; window.__ev = []; return Promise.resolve({ events: e }); } return Promise.resolve(n === 'status' ? { fullScreen: true, exact: true, overlay: true } : n === 'log' ? { log: [] } : {}); };
  const H = {}; ['schedule', 'takeEvents', 'dismiss', 'status', 'openSettings', 'test', 'log', 'rest', 'restCancel'].forEach(n => { H[n] = rec(n); });
  const L = { schedule: o => { window.__ha.push(['ln', o]); return Promise.resolve({}); }, cancel: o => { window.__ha.push(['lnCancel', o]); return Promise.resolve(); }, checkPermissions: () => Promise.resolve({ display: 'granted' }), requestPermissions: () => Promise.resolve({ display: 'granted' }), createChannel: () => Promise.resolve(), addListener: () => ({ remove() {} }), getPending: () => Promise.resolve({ notifications: [] }) };
  window.Capacitor = { isNativePlatform: () => true, getPlatform: () => 'android', Plugins: { HabitAlarm: H, LocalNotifications: L, App: { addListener: () => ({ remove() {} }), getInfo: () => Promise.resolve({ version: '1.0.59', build: '59' }) } } };
};
async function open({ watch, settings, sessions, plans, reminders, first, native, daily } = {}) {
  const srv = await serve(DIR);
  const ctx = await browser.newContext(watch ? { viewport: { width: 410, height: 500 }, hasTouch: true } : { viewport: { width: 390, height: 844 }, hasTouch: true });
  await ctx.route(/googleapis|gstatic|google\.com|firebase|github/, r => r.abort());
  const p = await ctx.newPage(); p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message));
  p.T = ms => p.clock.setFixedTime(new Date(T0 + ms));
  await p.T(0);
  if (native) await p.addInitScript(NATIVE);
  if (!first) await p.addInitScript(([s, pl, ss, rm, dl]) => { if (localStorage.getItem('cdh.seeded')) return; localStorage.setItem('cdh.seeded', '1');
    localStorage.setItem('cdh.settings', JSON.stringify(s)); localStorage.setItem('cdh.plans', JSON.stringify(pl)); localStorage.setItem('cdh.sessions', JSON.stringify(ss));
    localStorage.setItem('cdh.gyms', JSON.stringify([{ id: 'rokaz', name: 'Gimnasio A' }])); localStorage.setItem('cdh.newsSeen', '"n6"'); localStorage.setItem('cdh.reminders', JSON.stringify(rm)); localStorage.setItem('cdh.daily', JSON.stringify(dl)); }, [settings || SET(), plans || [PLAN()], sessions || [], reminders || [], daily || {}]);
  await p.goto(`http://127.0.0.1:${srv.address().port}/index.html`); await p.waitForTimeout(1600);
  if (!first) await p.evaluate(() => { state.settings.healthOk = 1; state.notifPerm = 'granted'; closeSheet(); render(); });
  p.done = async () => { await ctx.close(); srv.close(); };
  return p;
}
const noErr = p => ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
const start = p => p.evaluate(() => { state.settings.nextS = { dA: { pick: 'plan' } }; startSession('pA', 'dA'); render(); });
const mark = (p, n, j, w, r, rir) => p.evaluate(([n, j, w, r, rir]) => { const d = state.draft, i = d.exercises.findIndex(e => e.name === n), s = d.exercises[i].log[j]; s.w = w; s.r = r; if (rir != null) s.rir = rir; markSet(i, j, true); }, [n, j, w, r, rir]);
const vis = (p, v) => p.evaluate(v => { Object.defineProperty(document, 'visibilityState', { value: v, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); }, v);
const calls = (p, n) => p.evaluate(n => window.__ha.filter(c => c[0] === n).map(c => c[1]), n);
const clear = p => p.evaluate(() => { window.__ha.length = 0; });
const end = p => p.evaluate(() => (state.rest ? state.rest.end : 0));
const act = (p, sel) => p.evaluate(s => { const b = document.querySelector(s); if (!b) return false; b.click(); return true; }, sel);
const lastAt = async p => { const c = await calls(p, 'rest'); return c.length ? c[c.length - 1].at : 0; };

/* ---------- 1. Descanso ---------- */
console.log('1. Descanso sincronizado');
{
  const src = fs.readFileSync(path.join(HERE, '..', 'ci', 'native', 'HabitAlarmPlugin.java'), 'utf8');
  ok(!/getDouble\("at"\)/.test(src) && /optLong\("at"/.test(src), 'nativo: la hora de fin ya no se pierde (antes getDouble devolvía vacío y el aviso salía al instante)');
  ok(/at <= 0/.test(src), 'nativo: sin hora de fin no programa nada "para ahora"');
  const p = await open({ native: true }); await start(p); await p.waitForTimeout(150);
  await mark(p, 'Prensa 45°', 0, 80, 12, 2); await p.waitForTimeout(120);
  let e = await end(p); ok(e > T0 && await lastAt(p) === e, `al empezar: el aviso usa la misma hora que la app (${(e - T0) / 1000} s)`);
  await act(p, '[data-act="rest-add"][data-d="15"]'); await p.waitForTimeout(100);
  let e2 = await end(p); ok(e2 === e + 15000 && await lastAt(p) === e2, '+15 s: se reprograma a la hora nueva');
  await act(p, '[data-act="rest-add"][data-d="-15"]'); await act(p, '[data-act="rest-add"][data-d="-15"]'); await p.waitForTimeout(100);
  e2 = await end(p); ok(e2 === e - 15000 && await lastAt(p) === e2, '−15 s dos veces: se reprograma, no queda el aviso viejo');
  await p.evaluate(() => { const b = document.querySelector('[data-act="rest-step"][data-d="-15"],[data-act="rest-step"]'); if (b) b.click(); }); await p.waitForTimeout(100);
  ok(await lastAt(p) === await end(p), 'cambiar el descanso del ejercicio: sigue igual en los dos');
  await clear(p); e = await end(p); await p.evaluate(() => { const b = document.querySelector('.rp[data-ex="0"][data-set="0"][data-v="2"]'); if (b) b.click(); }); await p.waitForTimeout(100);
  ok(await end(p) === e && !(await calls(p, 'restCancel')).length, 'elegir el RIR no mueve la hora de fin');
  await clear(p); await p.T(5000); await vis(p, 'hidden'); await p.waitForTimeout(100);
  e = await end(p); ok(await lastAt(p) === e, 'pantalla apagada o segundo plano: se programa con la misma hora');
  const ln = await calls(p, 'ln'); ok(ln.length === 1 && new Date(ln[0].notifications[0].schedule.at).getTime() === e, 'la notificación normal también usa esa hora');
  await clear(p); await p.T(e - T0 - 1000); await p.evaluate(() => tick()); await p.waitForTimeout(80);
  ok(!(await calls(p, 'restCancel')).length, 'en segundo plano, faltando 1 s: no se cancela el aviso');
  await p.T(e - T0 + 500); await p.evaluate(() => tick()); await p.waitForTimeout(80);
  ok(!(await calls(p, 'restCancel')).length, 'recién terminado en segundo plano: no se le cierra la pantalla completa');
  await p.T(e - T0 + 7000); await p.evaluate(() => tick()); await p.waitForTimeout(80);
  ok(!(await calls(p, 'restCancel')).length, 'a los 7 s, aunque el descanso se quite solo, la pantalla completa sigue');
  await vis(p, 'visible'); await p.waitForTimeout(80);
  ok((await calls(p, 'restCancel')).length >= 1 && (await calls(p, 'lnCancel')).length >= 1, 'al volver a la app: se cancela lo que quedaba');
  await clear(p); await p.T(60000); await mark(p, 'Prensa 45°', 1, 80, 12, 2); await p.waitForTimeout(100);
  e = await end(p); await vis(p, 'hidden'); await p.T(60000 + 20000); await vis(p, 'visible');
  const txt = await p.evaluate(() => (document.querySelector('#rest .t') || {}).textContent || '');
  const left = Math.ceil((e - T0 - 80000) / 1000);
  ok(txt === `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`, `al volver, la cuenta correcta al instante (${txt})`);
  await clear(p); await act(p, '[data-act="rest-skip"]'); await p.waitForTimeout(100);
  ok((await calls(p, 'restCancel')).length === 1 && !(await end(p)), 'Saltar: cancela el aviso');
  await p.evaluate(() => addToDraft(['Sentadilla Goblet'], 1)); await mark(p, 'Sentadilla Goblet', 0, 20, 10, 2); await p.waitForTimeout(100);
  ok(await lastAt(p) === await end(p), 'ejercicio agregado a mitad de sesión: misma hora');
  noErr(p); await p.done();

  const q = await open({ native: true, plans: [PLAN('bombeo', [X('Extensión de Pierna', 2, 40, { ss: 1 }), X('Curl Femoral Tumbado', 2, 30), X('Prensa 45°', 2, 80)])] });
  await start(q); await q.waitForTimeout(100); await mark(q, 'Extensión de Pierna', 0, 40, 15, 2); await q.waitForTimeout(100);
  ok(!(await end(q)), 'superserie: sin descanso a mitad de vuelta');
  await clear(q); await mark(q, 'Curl Femoral Tumbado', 0, 30, 14, 2); await q.waitForTimeout(100);
  const r = await end(q); ok(r > 0 && await lastAt(q) === r, 'superserie: al cerrar la vuelta, misma hora en los dos');
  await clear(q); await mark(q, 'Extensión de Pierna', 1, 40, 12, 2); await q.waitForTimeout(100);
  ok((await calls(q, 'restCancel')).length === 1 && !(await end(q)), 'superserie: seguir antes de tiempo cancela el aviso');
  noErr(q); await q.done();

  const w = await open({ native: true, settings: SET({ restFull: false }) }); await start(w); await mark(w, 'Prensa 45°', 0, 80, 12, 2); await vis(w, 'hidden'); await w.waitForTimeout(80);
  ok(!(await calls(w, 'rest')).length, 'con la pantalla completa apagada en Ajustes no se programa'); noErr(w); await w.done();
}

/* ---------- 2. Orden real ---------- */
console.log('2. Orden real');
const lines = t => String((t && t.txt) || t || '').split('\n').filter(l => /^- (Curl Femoral|Extensión de Pierna)[^:]*: \d/.test(l)).map(l => l.slice(2).split(':')[0]);
const curlFirst = L => L.length === 2 && L[0].startsWith('Curl');
{
  const p = await open(); await start(p);
  await mark(p, 'Prensa 45°', 0, 80, 12, 2); await p.T(180000); await mark(p, 'Prensa 45°', 1, 80, 12, 2); await p.T(360000);
  await mark(p, 'Curl Femoral Tumbado', 0, 30, 14, 2); await p.T(420000); await mark(p, 'Extensión de Pierna', 0, 40, 20, 0);
  await p.T(480000); await mark(p, 'Curl Femoral Tumbado', 1, 30, 12, 2); await p.T(540000); await mark(p, 'Extensión de Pierna', 1, 40, 12, 0);
  ok(curlFirst(lines(await p.evaluate(() => sessionPrompt([exDraftSession()])))), 'exportación 1, a media sesión: Curl antes que Extensión');
  const screen = await p.evaluate(() => state.draft.exercises.map(e => e.name).join());
  await p.reload(); await p.waitForTimeout(1400);
  ok(await p.evaluate(() => !!state.draft && state.draft.exercises.every(e => e.log.every(s => !s.done || s.at))), 'cerrar y abrir la app a media sesión: las horas siguen');
  ok(await p.evaluate(() => state.draft.exercises.map(e => e.name).join()) === screen, 'la pantalla de la sesión no se reordena');
  await p.T(600000); await p.evaluate(() => { finishSession(); }); await p.waitForTimeout(700);
  const o = await p.evaluate(() => { const s = state.sessions[0]; return { ex: s.exercises.map(e => e.name), at: s.exercises.every(e => e.sets.every(x => x.at)), hist: sessionText(s), pr: sessionPrompt([s]), wk: aixWeekText(0), all: aixAllText('3m') }; });
  ok(o.ex.join(' · ') === 'Prensa 45° · Curl Femoral Tumbado · Extensión de Pierna', `guardado: ${o.ex.join(' · ')}`);
  ok(o.at, 'cada serie guardada conserva su hora');
  ok(curlFirst(lines(o.hist)), 'historial y Copiar'); ok(curlFirst(lines(o.pr)), 'exportación de la sesión y Compartir con tu IA'); ok(curlFirst(lines(o.wk)), 'exportación de la semana'); ok(curlFirst(lines(o.all)), 'exportación de todo y Analizar con Claude');
  const card = await p.evaluate(() => new Promise(res => { const seen = [], f = CanvasRenderingContext2D.prototype.fillText; CanvasRenderingContext2D.prototype.fillText = function (t) { seen.push(String(t)); return f.apply(this, arguments); }; Promise.resolve(drawShare(state.sessions[0])).then(() => { CanvasRenderingContext2D.prototype.fillText = f; res(seen); }, () => { CanvasRenderingContext2D.prototype.fillText = f; res(seen); }); }));
  const ic = card.findIndex(t => /^Curl Femoral/.test(t)), ie = card.findIndex(t => /^Extensi/.test(t));
  ok(ic >= 0 && ie > ic, 'tarjeta de Compartir: Curl antes que Extensión');
  await p.evaluate(() => { closeSheet(); const s = state.sessions[0]; seOpen ? seOpen(s.id, dk(s.date)) : 0; }).catch(() => {});
  /* Sesión editada después: se corrige un peso */
  const ed = await p.evaluate(() => { const s = state.sessions[0]; state.sEd = { id: s.id, k: dk(s.date), ex: JSON.parse(JSON.stringify(s.exercises)).map(e => { e.sets = e.sets.map(x => Object.assign({}, x, { w: String(x.w), r: String(x.r) })); return e; }), err: null, bad: {} }; state.sEd.ex[1].sets[0].w = '32.5'; seSave(); const t = state.sessions[0]; return { n: t.exercises.map(e => e.name).join(), at: !!t.exercises[1].sets[0].at, w: t.exercises[1].sets[0].w }; });
  ok(ed.w === 32.5 && ed.n.indexOf('Curl') < ed.n.indexOf('Extensión') && ed.at, 'sesión editada después: el orden y las horas se conservan');
  noErr(p); await p.done();

  /* Ejercicios sin hora (sesión empezada con una versión vieja): se quedan en su lugar */
  const q = await open(); await start(q);
  await q.evaluate(() => { const d = state.draft, m = (n, at) => { const s = d.exercises.find(e => e.name === n).log[0]; s.w = 30; s.r = 10; s.done = true; if (at) s.at = at; }; m('Prensa 45°', 0); m('Curl Femoral Tumbado', 5000); m('Extensión de Pierna', 3000); });
  ok((await q.evaluate(() => mjOrder(state.draft.exercises).map(e => e.name).join())) === 'Prensa 45°,Extensión de Pierna,Curl Femoral Tumbado,Elevación de Talones de Pie', 'sin hora: el ejercicio se queda donde estaba, no se va al final');
  noErr(q); await q.done();

  /* Superserie de la rutina empezando por el segundo, y agregado a mitad */
  const r = await open({ plans: [PLAN('bombeo', [X('Extensión de Pierna', 2, 40, { ss: 1 }), X('Curl Femoral Tumbado', 2, 30), X('Prensa 45°', 2, 80)])] }); await start(r);
  await mark(r, 'Curl Femoral Tumbado', 0, 30, 14, 2); await r.T(60000); await mark(r, 'Extensión de Pierna', 0, 40, 18, 1); await r.T(120000);
  await r.evaluate(() => addToDraft(['Sentadilla Goblet'], 2)); await mark(r, 'Sentadilla Goblet', 0, 20, 10, 2); await r.T(180000); await mark(r, 'Prensa 45°', 0, 80, 12, 2);
  await r.T(240000); await r.evaluate(() => { finishSession(); }); await r.waitForTimeout(600);
  const g = await r.evaluate(() => state.sessions[0].exercises.map(e => e.name).join(' · '));
  ok(g === 'Curl Femoral Tumbado · Extensión de Pierna · Sentadilla Goblet · Prensa 45°', `superserie y agregado: ${g}`);
  noErr(r); await r.done();

  /* Reloj */
  const w = await open({ watch: true }); await start(w);
  await mark(w, 'Curl Femoral Tumbado', 0, 30, 14); await w.T(60000); await mark(w, 'Extensión de Pierna', 0, 40, 20);
  await w.T(120000); await w.evaluate(() => { finishSession(); }); await w.waitForTimeout(600);
  const wr = await w.evaluate(() => { const s = state.sessions[0]; return { n: s.exercises.map(e => e.name).join(), extra: s.exercises.some(e => e.sets.some(x => 'at' in x || 'q' in x)) }; });
  ok(wr.n.indexOf('Curl') < wr.n.indexOf('Extensión'), 'reloj: series marcadas ahí, en el orden real');
  ok(!wr.extra, 'reloj: lo que guarda no cambia');
  noErr(w); await w.done();

  const nat = fs.readFileSync(path.join(HERE, '..', 'ci', 'native', 'HabitAlarms.java'), 'utf8');
  ok(!/markSet|A_SET|serie/.test(nat.slice(nat.indexOf('buildRestUi'), nat.indexOf('buildRestUi') + 1800).replace(/serie N|\bserie\b \d/g, '')) , 'pantalla completa y notificación del descanso no marcan series: solo la app y el reloj');
}

/* ---------- 3. Siguiente ejercicio ---------- */
console.log('3. Siguiente ejercicio');
{
  const big = () => [X('Curl Femoral Tumbado', 3, 30), X('Elevación de Talones de Pie', 3, 40), X('Prensa 45°', 3, 80), X('Extensión de Pierna', 3, 40)];
  const p = await open({ plans: [PLAN('fuerza', big())] }); await start(p); await p.waitForTimeout(200);
  const ln = () => p.evaluate(() => { const n = document.getElementById('ag-next'); return n ? n.innerText.replace(/\s+/g, ' ') : ''; });
  const before = await p.evaluate(() => state.draft.exercises.map(e => e.name).join());
  ok(!(await ln()), 'antes de empezar el ejercicio no estorba: la 1.ª serie queda a la vista');
  await mark(p, 'Curl Femoral Tumbado', 0, 30, 12, 2); await p.waitForTimeout(150);
  let t = await ln(); console.log('      sugerencia:', t);
  ok(/^Después: /.test(t), 'hay una sugerencia en una línea');
  ok(/Te faltan \d+ series? de /.test(t), 'con la razón: las series que faltan esta semana');
  ok(await p.evaluate(() => { const P = agPick(state.draft), L = wcVolume(); return !!P && !!L.rows; }), 'usa las series de Completar la semana (wcVolume)');
  ok(await p.evaluate(() => { const d = state.draft; d.exercises.forEach(e => { e.log.forEach(s => { s.done = false; }); }); const a = agPick(d); const dn = Date.prototype.getDay; Date.prototype.getDay = () => 1; const b = agPick(d); Date.prototype.getDay = dn; return !!a && !!b; }), 'calcula también el lunes (jueves a sábado pesan más)');
  await act(p, '[data-ag="no"]'); await p.waitForTimeout(60);
  ok(!(await ln()), 'se puede ignorar con la ✕');
  ok(await p.evaluate(() => state.draft.exercises.map(e => e.name).join()) === before, 'ignorarla no cambia nada');
  await p.T(120000); await mark(p, 'Curl Femoral Tumbado', 1, 30, 12, 2); await p.waitForTimeout(150);
  t = await ln(); ok(!!t, 'vuelve a sugerir al marcar una serie');
  const to = await p.evaluate(() => { const b = document.querySelector('[data-ag="go"]'); const i = +b.dataset.i; b.click(); return i; }); await p.waitForTimeout(700);
  ok(await p.evaluate(() => state.draft.cur) === to, '"Ir" te lleva a ese ejercicio');
  ok(await p.evaluate(() => state.draft.exercises.map(e => e.name).join()) === before, 'la rutina del día no se reordena');
  const nm = await p.evaluate(i => state.draft.exercises[i].name, to);
  await p.T(300000); await mark(p, nm, 0, 40, 10, 2); await p.T(400000); await p.evaluate(() => { finishSession(); }); await p.waitForTimeout(600);
  const sv = await p.evaluate(() => state.sessions[0].exercises.map(e => e.name));
  ok(sv[0] === 'Curl Femoral Tumbado' && sv[1] === nm, `lo que hiciste queda en el orden real: ${sv.join(' · ')}`);
  noErr(p); await p.done();

  /* Cansancio: sin series pendientes por músculo, lo pesado primero */
  const full = []; for (let i = 0; i < 6; i++) full.push({ id: 's' + i, date: new Date(T0 - (3 - i % 3) * 864e5).toISOString(), planId: 'pA', planName: '', dayId: 'old' + i, dayName: 'x', gymId: 'rokaz', gymName: 'Gimnasio A', kind: 'fuerza', durationSec: 3000, exercises: ['Prensa 45°', 'Extensión de Pierna', 'Curl Femoral Tumbado', 'Elevación de Talones de Pie', 'Peso Muerto Rumano', 'Sentadilla Hack'].map(n => ({ name: n, sets: [1, 2, 3, 4].map(() => ({ w: 40, r: 10, rir: 2 })) })) });
  const q = await open({ sessions: full, plans: [PLAN('fuerza', [X('Curl Femoral Tumbado', 2, 30), X('Elevación de Talones de Pie', 2, 40), X('Extensión de Pierna', 2, 40), X('Prensa 45°', 2, 80)])] }); await start(q); await q.waitForTimeout(200);
  const P = await q.evaluate(() => agPick(state.draft)); console.log('      sugerencia:', JSON.stringify(P));
  ok(P && P.name === 'Prensa 45°' && /pesado/.test(P.why), 'músculos cubiertos: primero el pesado, los aislados al final');
  await q.evaluate(() => { state.draft.start = new Date(Date.now() - 73 * 60000).toISOString(); }); const P2 = await q.evaluate(() => agPick(state.draft)); console.log('      con poco tiempo:', JSON.stringify(P2));
  ok(!!P2 && P2.why.length > 0, 'con poco tiempo sigue siendo una línea');
  noErr(q); await q.done();

  const r = await open({ plans: [PLAN('fuerza', [X('Prensa 45°', 2, 80), X('Extensión de Pierna', 2, 40)])] }); await start(r); await r.waitForTimeout(150);
  ok(await r.evaluate(() => !document.getElementById('ag-next')), 'sin nada que elegir no estorba'); noErr(r); await r.done();
}

/* ---------- 4. Coach ---------- */
console.log('4. Coach sin descanso completo');
const sess = (id, sets, ago, kind = 'fuerza') => ({ id, date: new Date(T0 - ago * 864e5).toISOString(), planId: 'pA', planName: '', dayId: 'dA', dayName: 'Pierna', gymId: 'rokaz', gymName: 'Gimnasio A', kind, durationSec: 3000, exercises: [{ name: 'Extensión de Pierna', sets }] });
const coach = (p, kind) => p.evaluate(k => { const c = pgCoach({ name: 'Extensión de Pierna', sets: 2 }, 'rokaz', k); return { w: c.w, mode: c.mode, why: c.why, goal: c.goal[0], rMin: c.rx.rMin, rMax: c.rx.rMax }; }, kind);
{
  const yours = q => [{ w: 40, r: 20, rir: 0 }, Object.assign({ w: 40, r: 12, rir: 0 }, q ? { q: 1 } : {})];
  for (const kind of ['fuerza', 'bombeo']) {
    const a = await open({ sessions: [sess('a', yours(true), 2, kind)], plans: [PLAN(kind)] });
    const c = await coach(a, kind); console.log(`      ${kind} ${c.rMin}-${c.rMax}: ${c.mode} ${c.w} kg × ${c.goal} · ${c.why}`);
    if (kind === 'fuerza') ok(c.mode === 'up' && c.w > 40, 'tu caso en día pesado: 20 pasa el tope y propone subir, sin mirar la caída de la superserie');
    else ok(c.w >= 40 && c.mode !== 'down', 'tu caso en bombeo: no baja el peso por la caída');
    await a.done();
  }
  const nv = await open({ settings: (() => { const s = SET(); s.prof.exp = 1; return s; })(), sessions: [sess('a', [{ w: 40, r: 20, rir: 2 }, { w: 40, r: 12, rir: 2, q: 1 }], 2)] });
  let c = await coach(nv, 'fuerza'); console.log('      principiante:', c.mode, c.w, c.why); ok(c.mode === 'up', 'principiante: la 2.ª serie sin descanso no le impide subir'); await nv.done();
  const nv2 = await open({ settings: (() => { const s = SET(); s.prof.exp = 1; return s; })(), sessions: [sess('a', [{ w: 40, r: 20, rir: 2 }, { w: 40, r: 12, rir: 2 }], 2)] });
  c = await coach(nv2, 'fuerza'); ok(c.mode !== 'down', 'principiante con descanso normal: nunca baja por haber subido de más en la 1.ª'); await nv2.done();
  const b = await open({ sessions: [sess('a', [{ w: 40, r: 7, rir: 0, q: 1 }, { w: 40, r: 5, rir: 0, q: 1 }], 2)] });
  c = await coach(b, 'fuerza'); console.log('     ', c.mode, c.w, c.why); ok(c.mode === 'hold' && c.w === 40, 'bajo el mínimo sin descanso completo: mantiene, no baja'); await b.done();
  const b2 = await open({ sessions: [sess('a', [{ w: 40, r: 7, rir: 0 }, { w: 40, r: 6, rir: 0 }], 2), sess('z', [{ w: 40, r: 6, rir: 0, q: 1 }, { w: 40, r: 6, rir: 0, q: 1 }], 4)] });
  c = await coach(b2, 'fuerza'); ok(c.mode !== 'down' || !/dos sesiones/.test(c.why), 'una sesión sin descanso completo no cuenta como "dos sesiones bajo el mínimo"'); await b2.done();
  const d = await open({ sessions: [sess('a', [{ w: 40, r: 11, rir: 2 }, { w: 40, r: 6, rir: 0 }], 2)] });
  c = await coach(d, 'fuerza'); console.log('     ', c.mode, c.w, c.why); ok(c.mode === 'down' && c.w < 40 && c.w >= 35 && /Ajuste moderado/.test(c.why), `caída fuerte con descanso normal: ajuste moderado (${c.w} kg)`); await d.done();
  const d2 = await open({ sessions: [sess('a', [{ w: 40, r: 16, rir: 2 }, { w: 40, r: 9, rir: 1 }], 2)] });
  c = await coach(d2, 'fuerza'); console.log('     ', c.mode, c.w, c.why); ok(c.mode === 'up' && /Sube poco/.test(c.why), 'pasa el tope pero cae mucho con descanso normal: sube solo el paso mínimo'); await d2.done();
  const e = await open({ sessions: [sess('a', [{ w: 40, r: 12, rir: 2 }, { w: 40, r: 11, rir: 1 }], 2)] });
  c = await coach(e, 'fuerza'); ok(c.mode === 'up' && !/moderado|Sube poco/.test(c.why), 'sin caída: las reglas de siempre'); await e.done();

  /* De la sesión a la marca: superserie sugerida por tiempo y sin descanso */
  const f = await open({ plans: [PLAN('fuerza')] }); await start(f);
  await f.evaluate(() => { state.draft.ssT = ['Extensión de Pierna', 'Curl Femoral Tumbado']; });
  await mark(f, 'Prensa 45°', 0, 80, 10, 2); await f.T(240000); await mark(f, 'Prensa 45°', 1, 80, 10, 2); await f.T(480000);
  await mark(f, 'Extensión de Pierna', 0, 40, 20, 0); await f.T(540000); await mark(f, 'Curl Femoral Tumbado', 0, 30, 14, 1); await f.T(720000); await mark(f, 'Extensión de Pierna', 1, 40, 12, 0);
  await f.T(760000); await mark(f, 'Elevación de Talones de Pie', 0, 40, 12, 1); await f.T(900000); await f.evaluate(() => { finishSession(); }); await f.waitForTimeout(600);
  const m = await f.evaluate(() => { const o = {}; state.sessions[0].exercises.forEach(e => { o[e.name] = e.sets.map(s => s.q || 0).join(); }); return { o, line: aixSessLine(state.sessions[0]) }; });
  console.log('      marcas:', JSON.stringify(m.o));
  ok(m.o['Prensa 45°'] === '0,0' && m.o['Extensión de Pierna'] === '0,1', 'superserie sugerida: la primera vuelta cuenta; la segunda serie no mide tu fuerza');
  ok(m.o['Curl Femoral Tumbado'] === '1', 'serie hecha enseguida de otra: sin descanso completo');
  ok(m.o['Elevación de Talones de Pie'] === '1', 'cambiar de ejercicio sin descansar también cuenta');
  ok(/superserie o sin descanso completo/.test(m.line), 'tu IA lo ve y no lo toma como falta de fuerza');
  noErr(f); await f.done();
}

/* ---------- 5. Recordatorios ---------- */
console.log('5. Recordatorio cancelado 3 días seguidos');
const REM = (o) => Object.assign({ id: 'r1', on: true, kind: 'hab', hab: 'hagua', label: 'Leer 20 min', time: '21:00', days: [0, 1, 2, 3, 4, 5, 6], fs: true }, o);
const HAB = { habits: [{ k: 'hagua', name: 'Leer', ic: 'book' }] };
const DAY = n => n * 864e5;
const fire = (p, ev) => p.evaluate(async ev => { window.__ev.push(...ev); await haTake(); }, ev);
const cx = p => p.evaluate(() => { const r = state.reminders[0]; return { on: r.on, n: (state.settings.remCx || {})[agRk(r)] ? state.settings.remCx[agRk(r)].n : 0, off: (state.settings.remOff || []).length }; });
const rk = p => p.evaluate(() => agRk(state.reminders[0]));
const dayKey = n => { const t = new Date(T0 + DAY(n)); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`; };
{
  const nat = fs.readFileSync(path.join(HERE, '..', 'ci', 'native', 'HabitAlarms.java'), 'utf8');
  ok(/cancelEvent\(c, item\);/.test(nat) && (nat.match(/cancelEvent\(/g) || []).length === 2, 'nativo: solo el ✕ avisa a la app');
  ok(/setDeleteIntent\(actionPI\(c, A_DISMISS/.test(nat) && !/A_DISMISS\.equals\(a\)\) \{[^}]*cancelEvent/.test(fs.readFileSync(path.join(HERE, '..', 'ci', 'native', 'HabitAlarmReceiver.java'), 'utf8')), 'nativo: deslizar la notificación no cuenta');

  const p = await open({ native: true, settings: SET(HAB), reminders: [REM()] }); const k = await rk(p);
  ok(await p.evaluate(() => { const it = haItems()[0]; return !!it && !!it.rk; }), 'cada aviso lleva a qué recordatorio pertenece');
  await fire(p, [{ cancel: true, rk: k, day: dayKey(0) }]); let c = await cx(p); ok(c.n === 1 && c.on, 'día 1: ✕ cuenta 1');
  ok(await p.evaluate(() => !(state.daily[Object.keys(state.daily).sort().pop()] || {}).hagua), 'el ✕ no marca el hábito como hecho');
  await fire(p, [{ cancel: true, rk: k, day: dayKey(0) }]); c = await cx(p); ok(c.n === 1, 'el mismo día dos veces cuenta una');
  await fire(p, [{ cancel: true, rk: k, day: dayKey(1) }]); c = await cx(p); ok(c.n === 2 && c.on, 'día 2: cuenta 2');
  await p.T(DAY(2)); await p.evaluate(d => { habSkip('hagua', d, true); }, dayKey(2)); await p.waitForTimeout(100); c = await cx(p);
  ok(!c.on && c.off === 1 && c.n === 0, 'día 3 con "Omitir hoy": se desactiva');
  await clear(p); await p.evaluate(() => { state.tab = 'train'; render(); }); await p.waitForTimeout(150);
  const card = await p.evaluate(() => { const n = document.querySelector('.ag-rem'); return n ? n.innerText.replace(/\s+/g, ' ') : ''; }); console.log('      mensaje:', card);
  ok(/Desactivé «Leer 20 min»/.test(card) && /Volver a activar/.test(card), 'te avisa en Hoy, con el botón para activarlo');
  ok(await p.evaluate(() => haItems().length === 0), 'ya no se programa');
  await act(p, '[data-ag="on"]'); await p.waitForTimeout(150); c = await cx(p);
  ok(c.on && c.off === 0 && c.n === 0, 'un toque: vuelve a estar activo y el contador en cero');
  ok(await p.evaluate(() => !document.querySelector('.ag-rem') && haItems().length > 0), 'el mensaje se va y vuelve a programarse');
  noErr(p); await p.done();

  const q = await open({ native: true, settings: SET(HAB), reminders: [REM()] }); const k2 = await rk(q);
  await fire(q, [{ cancel: true, rk: k2, day: dayKey(0) }, { cancel: true, rk: k2, day: dayKey(1) }]);
  await fire(q, [{ habit: 'hagua', kind: 'hab', day: dayKey(1), rk: k2 }]); let d = await cx(q);
  ok(d.n === 0 && d.on, 'hacerlo pone el contador a cero');
  await fire(q, [{ cancel: true, rk: k2, day: dayKey(2) }]); d = await cx(q); ok(d.n === 1 && d.on, 'y vuelve a empezar desde 1');
  await fire(q, [{ cancel: true, rk: k2, day: dayKey(4) }]); d = await cx(q); ok(d.n === 1 && d.on, 'un día sin cancelar (ni deslizar cuenta) vuelve a empezar');
  await q.evaluate(([a, b]) => { habSkip('hagua', a, true); habSkip('hagua', a, false); }, [dayKey(5), 0]); d = await cx(q); ok(d.n === 1, 'deshacer "Omitir hoy" el mismo día no cuenta');
  noErr(q); await q.done();

  /* Lunes, miércoles y viernes: sigue su propio calendario. Sin ser hábito (agua): el ✕ dentro de la app */
  const r = await open({ native: true, settings: SET(HAB), reminders: [REM({ days: [1, 3, 5] })] }); const k3 = await rk(r);
  await fire(r, [{ cancel: true, rk: k3, day: '2026-11-02' }, { cancel: true, rk: k3, day: '2026-11-04' }, { cancel: true, rk: k3, day: '2026-11-06' }]);
  ok(!(await cx(r)).on, 'lunes, miércoles y viernes: cuentan como seguidos en su calendario'); noErr(r); await r.done();
  const a = await open({ native: true, settings: SET(HAB), reminders: [REM({ kind: 'water', hab: undefined, label: 'Agua' })] });
  const ka = await rk(a);
  const inApp = async (n, sel) => { await a.T(DAY(n)); await a.evaluate(k => { haShow({ id: 3000, title: 'Agua', body: '', time: '21:00', habit: '', kind: 'water', day: dk(new Date()), name: 'Agua', rk: k }); }, ka); await a.waitForTimeout(80); return act(a, sel); };
  ok(await inApp(0, '[data-act="ha-no"]'), 'pantalla dentro de la app: ✕'); await inApp(1, '[data-act="ha-no"]'); ok((await cx(a)).n === 2, 'cuenta igual que la nativa');
  await inApp(2, '[data-act="ha-yes"]'); ok((await cx(a)).n === 0, '✓ vuelve a cero'); noErr(a); await a.done();
}

/* ---------- 6 y 7. Tu sesión inventada, serie por serie y análisis final ---------- */
console.log('7. Indicaciones serie por serie (sesión inventada)');
const SAMPLE = [['Sentadilla con Mancuernas', 30, [15, 15, 15], [2, 1, 0]], ['Sentadilla Hack', 50, [15, 15, 15], [1, 1, 0]], ['Patada de Glúteo en Polea', 30, [20, 20, 20], [2, 1, 0]], ['Curl Femoral Tumbado', 25, [18, 15, 14], [1, 0, 0]], ['Extensión de Pierna', 40, [20, 12], [0, 0]], ['Abducción de Cadera', 25, [20, 20, 20], [1, 0, 0]], ['Elevación de Talones en Hack', 30, [20, 25, 20], [2, 0, 0]]];
const piernas = () => PLAN('bombeo', SAMPLE.map(x => X(x[0], x[2].length, x[1])));
{
  const p = await open({ native: true, plans: [piernas()] }); await start(p); await p.waitForTimeout(200);
  await p.evaluate(() => { state.draft.ssT = ['Extensión de Pierna', 'Curl Femoral Tumbado']; });
  let t = 0; const said = {}; const tipText = n => p.evaluate(n => { const d = state.draft, i = d.exercises.findIndex(e => e.name === n), T = agTip(d, i); return T ? { t: T.t, W: T.W } : null; }, n);
  for (const [n, w, R, I] of SAMPLE) for (let j = 0; j < R.length; j++) {
    t += n === 'Extensión de Pierna' ? 75000 : 160000; await p.T(t);
    await p.evaluate(([n, j, w, r]) => { const d = state.draft, i = d.exercises.findIndex(e => e.name === n), s = d.exercises[i].log[j]; s.w = w; s.r = r; markSet(i, j, true); }, [n, j, w, R[j]]);
    const noRir = await tipText(n);
    await p.evaluate(([n, j, v]) => { const d = state.draft, i = d.exercises.findIndex(e => e.name === n); d.exercises[i].log[j].rir = v; saveDraft(); }, [n, j, I[j]]);
    const T = await tipText(n); said[n] = T; console.log('      ' + n + ' ' + w + '×' + R[j] + ' RIR ' + I[j] + ' → ' + (T ? T.t : '(nada)') + (T && T.W != null ? ' [Aplicar]' : ''));
    if (j === 0 && n === SAMPLE[0][0]) ok(!!noRir, 'sin RIR también hay indicación, solo con las repeticiones');
  }
  ok(!/baja/.test(said['Extensión de Pierna'].t), 'superserie sugerida: no pide bajar el peso');
  const sum = await p.evaluate(() => { const L = agLive(state.draft); return agTable(L).map(r => [r.n, r.w, r.reps, r.rir, r.note]); });
  for (const [n] of SAMPLE) { const T = said[n], row = sum.find(r => r[0] === n), m = /(?:con|repite) ([\d,.]+)/.exec(T.t); ok(row && m && Math.abs(parseFloat(m[1].replace(',', '.')) - row[1]) < 0.01, 'la indicación final coincide con la tabla: ' + n + ' ' + (row && row[1])); }
  noErr(p); await p.done();

  const q = await open({ native: true, plans: [PLAN('fuerza', [X('Prensa 45°', 3, 100), X('Extensión de Pierna', 3, 40)])] }); await start(q); await q.waitForTimeout(150);
  await mark(q, 'Extensión de Pierna', 0, 40, 16, 2); await q.waitForTimeout(150);
  const tip = () => q.evaluate(() => { const n = document.querySelector('.sx-page[data-i="1"] .ag-tip'); return n ? n.innerText.replace(/\s+/g, ' ') : ''; });
  const t1 = await tip(); console.log('      en pantalla:', t1);
  ok(/sube a/.test(t1) && /Aplicar/.test(t1), 'en la tarjeta del ejercicio, con Aplicar');
  ok(await q.evaluate(() => { const c = document.querySelector('.sx-page[data-i="1"] .coach'); return !c || getComputedStyle(c).display === 'none'; }), 'no se repite con el consejo fijo');
  const was = await q.evaluate(() => +state.draft.exercises[1].log[1].w);
  await act(q, '.sx-page[data-i="1"] [data-ag="apply"]'); await q.waitForTimeout(120);
  const now = await q.evaluate(() => +state.draft.exercises[1].log[1].w); ok(now > was, 'no cambia solo el peso: Aplicar lo escribe en la siguiente serie (' + was + ' → ' + now + ' kg)');
  await clear(q); await vis(q, 'hidden'); await q.waitForTimeout(80);
  const b = (await calls(q, 'rest')).pop(); console.log('      pantalla completa:', JSON.stringify(b && b.body));
  ok(b && /^Sigue: /.test(b.body) && /sube a/.test(b.body), 'también en la pantalla completa, junto a "Sigue: ..."'); await vis(q, 'visible');
  await q.T(200000); await mark(q, 'Prensa 45°', 0, 100, 5, 1); await q.waitForTimeout(100);
  const lo = await q.evaluate(() => agTip(state.draft, 0)); console.log('      ', lo.t); ok(/Muy pesado/.test(lo.t) && lo.W < 100, 'menos que el mínimo: propone bajar');
  await q.T(400000); await mark(q, 'Prensa 45°', 1, 90, 8, 1); await q.waitForTimeout(100);
  const he = await q.evaluate(() => agTip(state.draft, 0)); console.log('      ', he.t); ok(/reserva/.test(he.t), 'ejercicio pesado antes de la última: deja 1 en reserva');
  noErr(q); await q.done();
}

console.log('6. Análisis de la sesión');
{
  const at = (n, j) => T0 + n * 600000 + j * 160000;
  const S = { id: 'hoy', date: new Date(T0).toISOString(), planId: 'pA', planName: 'Rutina A', dayId: 'dA', dayName: 'Piernas Bombeo', gymId: 'rokaz', gymName: 'Gimnasio A', kind: 'bombeo', durationSec: 93 * 60, exercises: SAMPLE.map((x, n) => ({ name: x[0], type: 'Piernas', sets: x[2].map((r, j) => Object.assign({ w: x[1], r, rir: x[3][j], at: at(n, j) }, x[0] === 'Extensión de Pierna' && j > 0 ? { q: 1 } : {})) })) };
  const p = await open({ sessions: [S], plans: [(() => { const P = piernas(); P.days[0].exercises.find(e => e.name === 'Extensión de Pierna').sets = 3; return P; })()] });
  const A = await p.evaluate(() => { const s = state.sessions[0]; return { g: agGood(s), f: agFix(s), t: agTable(s) }; });
  console.log('\n      LO QUE SALIÓ BIEN'); A.g.forEach(x => console.log('      · ' + x));
  console.log('      LO QUE CONVIENE AJUSTAR'); A.f.forEach(x => console.log('      · ' + x));
  console.log('      PRÓXIMA SESIÓN'); A.t.forEach(r => console.log('      ' + [r.n, r.w, r.reps, r.rir, r.note].join(' | ')));
  ok(A.g.length && A.g.length <= 3 && A.f.length <= 3, 'máximo 3 puntos por parte');
  ok(!A.f.some(x => /Extensión/.test(x) && /fuerza/.test(x)) && A.g.some(x => /Extensión/.test(x)), 'la superserie no cuenta en tu contra');
  ok(A.f.some(x => /RIR 1/.test(x)), 'pesados al fallo: deja la última en RIR 1');
  ok(A.f.some(x => /93 min/.test(x) && /superserie/.test(x)), 'pasó de tu tiempo: propone una superserie de músculos distintos');
  const talon = A.t.find(r => /Talones/.test(r.n)); ok(talon.w > 30 && /irregulares/.test(talon.note), 'reps irregulares: sube y lo explica');
  ok(A.t.length === 7 && A.t.every(r => /^\d(, \d)*$/.test(r.rir)), 'tabla con los 7 ejercicios y RIR por serie');
  await p.evaluate(k => { state.tab = 'train'; daySheet(k); }, await p.evaluate(() => dk(state.sessions[0].date))); await p.waitForTimeout(200);
  ok(await p.evaluate(() => !!document.querySelector('#sheet details.ag-an .ag-tb')), 'también en cualquier sesión guardada (detalle del día)');
  const h = await p.evaluate(() => { state.sessions[0].estSec = 4500; return fsHtml(state.sessions[0], {}); });
  ok(/pg-time/.test(h) && /data-xp="fs"/.test(h) && /dd-acts ex-fs/.test(h) && /data-act="fs-close"/.test(h), 'el resumen conserva la duración, Exportar y Listo');
  ok(/Lo que salió bien/.test(h) && !/fs-nx/.test(h) && (h.match(/Para tu próxima sesión/g) || []).length === 1, 'al terminar: reemplaza la lista de antes, sin repetirla');
  await p.evaluate(() => { const b = window.fetch; window.__net = 0; window.fetch = function () { window.__net++; return b.apply(this, arguments); }; agAnalysisHtml(state.sessions[0]); window.fetch = b; });
  ok(await p.evaluate(() => window.__net === 0), 'funciona sin internet ni IA');
  const before = await p.evaluate(() => JSON.stringify(state.sessions)); await p.evaluate(() => agAnalysisHtml(state.sessions[0]));
  ok(before === await p.evaluate(() => JSON.stringify(state.sessions)), 'mirar el análisis no cambia nada guardado');
  noErr(p); await p.done();
  const w = await open({ watch: true, sessions: [S] }); const hw = await w.evaluate(() => fsHtml(state.sessions[0], {}));
  ok(/fs-nx/.test(hw) && !/Lo que salió bien/.test(hw), 'reloj: su resumen no cambia'); noErr(w); await w.done();
}

/* ---------- 9. Recordatorios juntos y cómo avisarme ---------- */
console.log('9. Recordatorios juntos y cómo avisarme');
{
  const R3 = () => [REM({ id: 'a', label: 'Creatina', hab: 'hagua', time: '21:00', fs: true }), { id: 'b', on: true, kind: 'water', label: 'Agua', time: '21:03', days: [0, 1, 2, 3, 4, 5, 6], fs: false }, { id: 'c', on: true, kind: 'custom', label: 'Estirar', time: '21:05', days: [0, 1, 2, 3, 4, 5, 6], fs: false }];
  const p = await open({ native: true, settings: SET(HAB), reminders: R3() }); await p.waitForTimeout(100);
  const G = await p.evaluate(() => { const L = haItems(), g = L.filter(x => x.group); return { n: L.length, g: g.length, g0: g[0], lone: L.filter(x => !x.group).length }; });
  ok(G.g >= 13 && G.lone === 0, 'tres a las 21:00, 21:03 y 21:05: un solo aviso por día, ninguno suelto');
  ok(G.g0.title === '3 recordatorios' && G.g0.body === 'Creatina, Agua, Estirar', 'dice: ' + G.g0.title + ': ' + G.g0.body);
  ok(G.g0.full === true, 'hay uno de pantalla completa: el grupo va en pantalla completa');
  ok(G.g0.group.every(x => x.rk) && G.g0.skipBtn, 'lleva cada recordatorio con su identidad y Omitir');
  ok(await p.evaluate(() => { agGC = null; const at = new Date(); at.setDate(at.getDate() + 1); at.setHours(21, 3, 0, 0); return remSkip(state.reminders[1], 1, at); }), 'los del grupo no salen además como notificación suelta');
  await p.T(3 * 3600e3 + 30000); await p.evaluate(() => { state.notifPerm = 'granted'; }); await p.done();

  const s = await open({ native: true, settings: SET(HAB), reminders: R3().map(r => Object.assign(r, { fs: false })) });
  const q0 = await s.evaluate(() => haItems().filter(x => x.group)[0]);
  ok(q0.full === false && q0.ring === 3, 'todos "Solo notificación": el grupo no enciende la pantalla'); await s.done();

  const one = await open({ native: true, settings: SET(HAB), reminders: [REM({ time: '21:00', fs: true }), { id: 'b', on: true, kind: 'custom', label: 'Estirar', time: '21:06', days: [0, 1, 2, 3, 4, 5, 6], fs: false }] });
  ok(await one.evaluate(() => haItems().filter(x => x.group).length === 0), 'a 6 min de diferencia ya no se juntan'); await one.done();

  /* Con la app abierta, a la hora: cada uno por separado y Omitir todo */
  const a = await open({ native: true, settings: SET(HAB), reminders: R3() });
  const when = await a.evaluate(() => { const t = new Date(); t.setHours(21, 0, 30, 0); return t.getTime(); });
  await a.clock.setFixedTime(new Date(when)); await a.evaluate(() => haCheck()); await a.waitForTimeout(100);
  const box = await a.evaluate(() => { const n = document.querySelector('#hab-alarm'); return n && !n.hidden ? n.innerText.replace(/\s+/g, ' ') : ''; }); console.log('      en la app:', box.slice(0, 120));
  ok(/3 recordatorios/.test(box) && /Creatina/.test(box) && /Hecho todo/.test(box) && /Omitir todo/.test(box), 'un solo aviso con la lista, Hecho todo y Omitir todo');
  await a.evaluate(() => { const b = document.querySelector('[data-ag="g1"][data-k="0"][data-v="1"]'); b.click(); }); await a.waitForTimeout(80);
  ok(await a.evaluate(() => !!(state.daily[dk(new Date())] || {}).hagua), 'marcar uno guarda solo ese');
  await act(a, '[data-ag="gall"][data-v="0"]'); await a.waitForTimeout(120);
  const res = await a.evaluate(() => { const C = state.settings.remCx || {}; return state.reminders.map(r => (C[agRk(r)] || {}).n || 0); });
  ok(res[0] === 0 && res[1] === 1 && res[2] === 1, 'Omitir todo cuenta para cada uno (' + res.join(', ') + ') y no para el que ya hiciste');
  ok(await a.evaluate(() => document.getElementById('hab-alarm').hidden), 'el aviso se cierra');
  await a.evaluate(() => haCheck()); await a.waitForTimeout(60);
  ok(await a.evaluate(() => document.getElementById('hab-alarm').hidden), 'no vuelve a salir ni salen sueltos'); noErr(a); await a.done();

  /* Con la app cerrada: lo que llega del nativo al abrir */
  const c = await open({ native: true, settings: SET(HAB), reminders: R3() }); const ks = await c.evaluate(() => state.reminders.map(agRk));
  await fire(c, [{ habit: 'hagua', kind: 'hab', day: dayKey(0), skip: true, rk: ks[0] }, { habit: '', kind: 'hab', day: dayKey(0), skip: true, rk: ks[1] }, { habit: '', kind: 'hab', day: dayKey(0), skip: true, rk: ks[2] }]);
  const r2 = await c.evaluate(() => { const C = state.settings.remCx || {}; return state.reminders.map(r => (C[agRk(r)] || {}).n || 0); });
  ok(r2.join() === '1,1,1', 'Omitir todo con la app cerrada: cuenta para cada uno al abrir');
  ok(await c.evaluate(() => !(state.daily[Object.keys(state.daily).sort().pop()] || {}).water), 'omitir el agua no suma agua'); noErr(c); await c.done();

  const nat = fs.readFileSync(path.join(HERE, '..', 'ci', 'native', 'HabitAlarms.java'), 'utf8');
  ok(/if \(!onlyNotif\) b\.setFullScreenIntent/.test(nat) && /"Hecho todo"/.test(nat) && /"Omitir todo"/.test(nat) && /buildGroupUi/.test(nat), 'nativo: el grupo tiene sus botones y respeta "Solo notificación"');

  /* Cómo avisarme */
  const f = await open({ native: true, settings: SET(HAB), reminders: [{ id: 'v', on: true, kind: 'water', label: 'Agua vieja', time: '10:00', days: [1] }, REM({ id: 'h', fs: undefined, time: '12:00' })] });
  ok(await f.evaluate(() => haFull(state.reminders[0]) === true && haFull(state.reminders[1]) === true), 'los que ya existen siguen igual');
  await f.evaluate(() => { remSheet(null); }); await f.waitForTimeout(100);
  const sel = await f.evaluate(() => { const n = document.getElementById('rm-fs'); return { v: n.value, t: Array.prototype.map.call(n.options, o => o.text).join(' / '), l: document.querySelector('label[for="rm-fs"]').textContent }; });
  ok(sel.l === 'Cómo avisarme' && sel.t === 'Solo notificación / Pantalla completa' && sel.v === '0', 'al crear: ' + sel.l + ': ' + sel.t + ', por defecto solo notificación');
  await f.evaluate(() => { state.haStatus = { fullScreen: false }; closeSheet(); remSheet(null); }); await f.waitForTimeout(80);
  ok(await f.evaluate(() => /Sin ese permiso llegará como notificación normal/.test(document.getElementById('rm-fs-f').innerText) && !!document.querySelector('#rm-fs-f [data-act="ha-perm"]')), 'sin el permiso de Android: lo explica y ofrece Permitir');
  noErr(f); await f.done();
}

/* ---------- 8. Usuario nuevo, dueño sin datos y reloj ---------- */
console.log('8. Usuario nuevo, dueño sin datos y reloj');
{
  const p = await open({ first: true }); ok(await p.evaluate(() => typeof agPick === 'function'), 'usuario nuevo: la app abre con todo cargado');
  await p.evaluate(() => { state.settings.onb = 1; try { closeSheet(); } catch (e) {} render(); }); noErr(p); await p.done();
  const s = SET(); delete s.prof;
  const q = await open({ settings: s }); await start(q); await q.waitForTimeout(200); await mark(q, 'Prensa 45°', 0, 80, 12, 2); await q.T(200000); await q.evaluate(() => { finishSession(); }); await q.waitForTimeout(500);
  ok(await q.evaluate(() => state.sessions.length === 1 && !state.settings.prof), 'dueño sin datos: entrena y guarda, sin inventar nada'); noErr(q); await q.done();
  const w = await open({ watch: true, native: true, settings: SET(HAB), reminders: [REM()] }); await start(w); await w.waitForTimeout(250);
  ok(await w.evaluate(() => !document.getElementById('ag-next') && agPick(state.draft) === null), 'reloj: sin sugerencia');
  await mark(w, 'Prensa 45°', 0, 80, 12); await vis(w, 'hidden'); await w.waitForTimeout(100);
  ok(!(await calls(w, 'rest')).length, 'reloj: el aviso de pantalla completa no cambia (no se programa)');
  ok(await w.evaluate(() => { const it = haItems()[0]; return (!it || !it.rk) && agGroups().length === 0; }), 'reloj: sus avisos no cambian ni se agrupan');
  const k = await rk(w); await fire(w, [{ cancel: true, rk: k, day: dayKey(0) }]);
  ok((await cx(w)).n === 0, 'reloj: no cuenta recordatorios'); noErr(w); await w.done();
}

await browser.close();
console.log(fail ? `\n${fail} FALLAS` : '\nTodo OK');
process.exit(fail ? 1 : 0);
