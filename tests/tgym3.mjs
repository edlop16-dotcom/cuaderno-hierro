import { OWNER_SETTINGS } from './owner-fixture.mjs';
// Prueba de la rama ajustes-gym-3, con datos inventados. Solo teléfono; el reloj se compara aparte (treloj.mjs).
// Uso (desde PowerShell): $env:PW_DIR = "<carpeta con node_modules/playwright>"; node tests/tgym3.mjs <copia transpilada>
// La parte nativa no corre en el navegador: se simula el plugin HabitAlarm (brillo, bloqueo con patrón y su confirmación).
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
const T0 = Date.parse('2026-11-12T18:00:00');   /* jueves */
const DAY = n => n * 864e5;
let N = 0;
const X = (name, sets, w, extra) => Object.assign({ id: 'x' + (++N), name, type: 'Piernas', weight: w, sets, repsMin: 8, repsMax: 12, rest: 90 }, extra);
const PLAN = (kind, ex) => ({ id: 'pA', name: 'Rutina A', gymId: 'rokaz', days: [{ id: 'dA', name: 'Pierna', weekday: 4, kind, exercises: ex }] });
const SET = extra => { const s = Object.assign(structuredClone(OWNER_SETTINGS), { activePlanId: 'pA', activeGymId: 'rokaz', planByGym: { rokaz: 'pA' }, newsSeen: 'n6' }, extra || {}); s.prof = Object.assign({}, s.prof, { goal: 'musculo', exp: 2, mins: 75 }); return s; };
const SES = (id, ago, kind, ex, extra) => Object.assign({ id, date: new Date(T0 - DAY(ago)).toISOString(), planId: 'pA', planName: 'Rutina A', dayId: 'dA', dayName: 'Pierna', gymId: 'rokaz', gymName: 'Gimnasio A', kind, durationSec: 3600, exercises: ex.map(([name, sets, more]) => Object.assign({ name, type: 'Piernas', sets: sets.map(([w, r, rir, dur]) => Object.assign({ w, r }, rir != null ? { rir } : {}, dur ? { dur } : {})) }, more || {})) }, extra || {});

/* Capacitor simulado: HabitAlarm con brillo, bloqueo con patrón y confirmación de tu patrón */
const NATIVE = () => {
  window.__ha = []; window.__locked = false; window.__confirm = true;
  const rec = n => o => { window.__ha.push([n, o || null]); if (n === 'sessionLock') return Promise.resolve({ locked: window.__locked }); if (n === 'confirmUnlock') return Promise.resolve({ ok: window.__confirm, secure: true }); return Promise.resolve(n === 'status' ? { fullScreen: true, exact: true, overlay: true } : n === 'takeEvents' ? { events: [] } : {}); };
  const H = {}; ['schedule', 'takeEvents', 'dismiss', 'status', 'openSettings', 'test', 'log', 'rest', 'restCancel', 'sessionLock', 'dim', 'confirmUnlock'].forEach(n => { H[n] = rec(n); });
  const L = { schedule: () => Promise.resolve({}), cancel: () => Promise.resolve(), checkPermissions: () => Promise.resolve({ display: 'granted' }), requestPermissions: () => Promise.resolve({ display: 'granted' }), getPending: () => Promise.resolve({ notifications: [] }), addListener: () => ({ remove() {} }) };
  const KA = { keepAwake: () => { window.__ha.push(['keepAwake']); return Promise.resolve(); }, allowSleep: () => { window.__ha.push(['allowSleep']); return Promise.resolve(); } };
  window.navigator.vibrate = p => { window.__ha.push(['vibrate', p]); return true; };
  window.Capacitor = { isNativePlatform: () => true, getPlatform: () => 'android', Plugins: { HabitAlarm: H, LocalNotifications: L, KeepAwake: KA, App: { addListener: () => ({ remove() {} }), getInfo: () => Promise.resolve({ version: '1.0.61', build: '61' }) } } };
};
async function open({ watch, settings, sessions, plans, native, first } = {}) {
  const srv = await serve(DIR);
  const ctx = await browser.newContext(watch ? { viewport: { width: 410, height: 500 }, hasTouch: true } : { viewport: { width: 390, height: 844 }, hasTouch: true });
  await ctx.route(/googleapis|gstatic|google\.com|firebase|github/, r => r.abort());
  const p = await ctx.newPage(); p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message));
  p.T = ms => p.clock.setFixedTime(new Date(T0 + ms));
  await p.T(0);
  if (native) await p.addInitScript(NATIVE);
  if (!first) await p.addInitScript(([s, pl, ss]) => { if (localStorage.getItem('cdh.seeded')) return; localStorage.setItem('cdh.seeded', '1');
    localStorage.setItem('cdh.settings', JSON.stringify(s)); localStorage.setItem('cdh.plans', JSON.stringify(pl)); localStorage.setItem('cdh.sessions', JSON.stringify(ss));
    localStorage.setItem('cdh.gyms', JSON.stringify([{ id: 'rokaz', name: 'Gimnasio A' }])); localStorage.setItem('cdh.newsSeen', '"n6"'); }, [settings || SET(), plans || [], sessions || []]);
  await p.goto(`http://127.0.0.1:${srv.address().port}/index.html`); await p.waitForTimeout(1500);
  if (!first) await p.evaluate(() => { state.settings.healthOk = 1; state.notifPerm = 'granted'; closeSheet(); render(); });
  p.done = async () => { await ctx.close(); srv.close(); };
  return p;
}
const noErr = p => ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
const start = p => p.evaluate(() => { state.settings.nextS = { dA: { pick: 'plan' } }; startSession('pA', 'dA'); render(); });
const calls = (p, n) => p.evaluate(n => window.__ha.filter(c => c[0] === n).map(c => c[1]), n);
const act = (p, sel) => p.evaluate(s => { const b = document.querySelector(s); if (!b) return false; b.click(); return true; }, sel);
const dimmed = p => p.evaluate(() => { const d = document.getElementById('g3-dim'); return !!d && !d.hidden && getComputedStyle(d).display !== 'none'; });
const mark = (p, n, j, w, r, rir) => p.evaluate(([n, j, w, r, rir]) => { const d = state.draft, i = d.exercises.findIndex(e => e.name === n), s = d.exercises[i].log[j]; s.w = w; s.r = r; if (rir != null) s.rir = rir; markSet(i, j, true); }, [n, j, w, r, rir]);
const covered = p => p.evaluate(() => document.documentElement.classList.contains('g2-cover'));

/* ---------- 1. Pantalla automática ---------- */
console.log('1. Pantalla automática en la sesión');
const HIST = [SES('h1', 3, 'bombeo', [['Extensión de Pierna', [[40, 15, 2, 40], [40, 14, 1, 44], [40, 13, 1, 42]]], ['Curl Femoral Tumbado', [[30, 12, 2, 50], [30, 12, 1, 52]]]])];
{
  const p = await open({ native: true, sessions: HIST, plans: [PLAN('bombeo', [X('Extensión de Pierna', 3, 40), X('Curl Femoral Tumbado', 3, 30), X('Prensa 45°', 3, 80)])] });
  ok(await p.evaluate(() => state.settings.autoScr !== true), 'viene apagada');
  await p.evaluate(() => { state.tab = 'settings'; render(); document.querySelectorAll('details').forEach(d => { d.open = true; }); }); await p.waitForTimeout(200);
  ok(await p.evaluate(() => /Pantalla automática en la sesión/.test(document.body.innerText) && !!document.querySelector('[data-g3="auto"]')), 'en Ajustes: "Pantalla automática en la sesión"');
  /* Apagada: nada cambia */
  await p.evaluate(() => { state.tab = 'train'; render(); }); await start(p); await p.waitForTimeout(400);
  await p.T(60000); await p.waitForTimeout(1300);
  ok(!(await dimmed(p)) && !(await calls(p, 'dim')).length, 'apagada: la pantalla no se oscurece');
  await p.evaluate(() => discardSession());
  /* Encendida */
  await p.evaluate(() => { state.tab = 'settings'; render(); document.querySelectorAll('details').forEach(d => { d.open = true; }); }); await act(p, '[data-g3="auto"]'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => state.settings.autoScr === true), 'se activa con su interruptor');
  await p.evaluate(() => { state.tab = 'train'; render(); }); await p.T(100000); await start(p); await p.waitForTimeout(400);
  await p.evaluate(() => document.dispatchEvent(new Event('pointerdown', { bubbles: true }))); await p.waitForTimeout(1100);
  ok(!(await dimmed(p)), 'recién tocada: sigue visible');
  ok((await calls(p, 'keepAwake')).length > 0, 'durante la sesión no se bloquea sola (así puede volver a verse sin tu patrón)');
  await p.T(121000); await p.waitForTimeout(1300);
  ok(await dimmed(p), 'sin tocar nada 20 s: pantalla negra');
  let D = await calls(p, 'dim'); ok(D.length && D[D.length - 1].on === true, 'y el brillo al mínimo');
  /* Tocar la cancela para esta serie */
  await p.evaluate(() => document.getElementById('g3-dim').dispatchEvent(new Event('pointerdown', { bubbles: true }))); await p.waitForTimeout(100);
  ok(!(await dimmed(p)), 'al tocarla vuelve a verse');
  D = await calls(p, 'dim'); ok(D[D.length - 1].on === false, 'con el brillo normal');
  await p.T(160000); await p.waitForTimeout(1300);
  ok(!(await dimmed(p)), 'y ya no se apaga en esta serie');
  /* Serie hecha: descanso, fin del descanso y lo que sueles tardar */
  await p.T(170000); await mark(p, 'Extensión de Pierna', 0, 40, 15, 2); await p.waitForTimeout(200);
  const rest = await p.evaluate(() => state.rest ? Math.round((state.rest.end - Date.now()) / 1000) : 0); console.log('      descanso: ' + rest + ' s');
  await p.T(170000 + 25000); await p.waitForTimeout(1300);
  ok(await dimmed(p), 'en el descanso, sin tocar nada: se oscurece');
  await p.T(170000 + (rest - 1) * 1000); await p.waitForTimeout(1300);
  ok(!(await dimmed(p)), 'vuelve a verse justo antes de que termine el descanso');
  await p.T(170000 + rest * 1000 + 500); await p.waitForTimeout(400);
  await p.T(170000 + rest * 1000 + 8000); await p.waitForTimeout(400);
  ok(await p.evaluate(() => !!state.rest && !document.getElementById('rest').hidden), '"¡A la siguiente serie!" sigue a los 8 s');
  await p.T(170000 + rest * 1000 + 10500); await p.waitForTimeout(600);
  ok(await p.evaluate(() => !state.rest), 'y se cierra sola a los 10 s: vuelves a la pantalla de la sesión');
  const est = await p.evaluate(() => { const e = state.draft.exercises[0]; return g3SetSec(e, 1); }); console.log('      lo que sueles tardar en Extensión de Pierna: ' + JSON.stringify(est));
  ok(est.src === 'hist' && est.s === 42, 'usa tu historial: la mediana del fin del descanso a marcar la serie (42 s)');
  const reEnd = 170000 + rest * 1000;
  await p.T(reEnd + 21000); await p.waitForTimeout(1300);
  ok(await dimmed(p), 'haciendo la serie, sin tocar nada 20 s: se oscurece');
  await p.T(reEnd + 43000); await p.waitForTimeout(1300);
  ok(!(await dimmed(p)), 'pasado lo que sueles tardar, se vuelve a ver sola, sin patrón');
  ok((await calls(p, 'vibrate')).length > 0, 'con una vibración corta para avisarte');
  await p.T(reEnd + 50000); await mark(p, 'Extensión de Pierna', 1, 40, 14, 1); await p.waitForTimeout(200);
  ok(await p.evaluate(() => state.draft.exercises[0].log[1].dur === 50), 'guarda cuánto tardaste en esa serie (50 s) para la próxima');
  const noHist = await p.evaluate(() => g3SetSec(state.draft.exercises[2], 0)); console.log('      sin historial (Prensa 45°): ' + JSON.stringify(noHist));
  ok(noHist.src === 'reps' && noHist.s > 15, 'sin historial: lo estima con las repeticiones');
  /* Aviso nativo con la pantalla apagada: se cierra solo a los 10 s */
  await p.T(reEnd + 60000); await mark(p, 'Extensión de Pierna', 2, 40, 13, 1); await p.waitForTimeout(150);
  await p.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  const R = (await calls(p, 'rest')).pop(); ok(R && R.auto === true, 'la pantalla nativa de "Descanso terminado" se cierra sola a los 10 s (va marcada)');
  await p.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  const src = fs.readFileSync(path.join(HERE, '..', 'ci', 'native', 'HabitAlarms.java'), 'utf8'), pl = fs.readFileSync(path.join(HERE, '..', 'ci', 'native', 'HabitAlarmPlugin.java'), 'utf8');
  ok(/optBoolean\("auto", false\)\) root\.postDelayed/.test(src) && /10000\)/.test(src), 'nativo: a los 10 s vuelve a la sesión');
  ok(/screenBrightness = on \? 0\.01f/.test(pl) && /createConfirmDeviceCredentialIntent/.test(pl) && !/DevicePolicyManager|lockNow|BIND_DEVICE_ADMIN/.test(pl + src), 'nativo: brillo de la ventana y tu patrón con la pantalla de Android; sin pedir administrador del dispositivo');
  /* Salir de la sesión después de oscurecerla: tu patrón */
  await p.T(reEnd + 175000); await p.waitForTimeout(1300);
  ok(await dimmed(p), 'otra vez a oscuras');
  await p.evaluate(() => { window.__confirm = false; });
  await p.evaluate(() => document.getElementById('g3-dim').dispatchEvent(new Event('pointerdown', { bubbles: true })));
  await p.evaluate(() => { state.tab = 'profile'; render(); if (typeof finSheet === 'function') finSheet(); }); await p.waitForTimeout(900);
  ok((await calls(p, 'confirmUnlock')).length === 1, 'al salir de la sesión: pide tu patrón (el celular no llegó a bloquearse)');
  ok(await p.evaluate(() => !document.querySelector('.fin-sheet') && state.tab === 'train' && sxOpenNow()), 'si no lo confirmas: de vuelta a la sesión, Mis finanzas no se abre');
  await p.waitForTimeout(900);
  await p.evaluate(() => { window.__confirm = true; state.tab = 'profile'; render(); }); await p.waitForTimeout(900);
  ok((await calls(p, 'confirmUnlock')).length === 2 && !(await covered(p)) && await p.evaluate(() => state.tab === 'profile'), 'con tu patrón: ya puedes ir a otra parte');
  await p.evaluate(() => { state.sessMin = false; state.tab = 'train'; render(); }); await p.waitForTimeout(900);
  await p.evaluate(() => { state.tab = 'profile'; render(); }); await p.waitForTimeout(900);
  ok((await calls(p, 'confirmUnlock')).length === 2, 'sin volver a oscurecerla, no lo pide otra vez');
  noErr(p); await p.done();
  /* Celular bloqueado de verdad: lo pide Android, no la app */
  const q = await open({ native: true, settings: SET({ autoScr: true }), plans: [PLAN('bombeo', [X('Extensión de Pierna', 3, 40)])] }); await start(q); await q.waitForTimeout(900);
  await q.T(30000); await q.waitForTimeout(1300); ok(await dimmed(q), 'otra sesión: se oscurece');
  await q.evaluate(() => { window.__locked = true; document.querySelector('[data-act="sx-min"]').click(); }); await q.waitForTimeout(900);
  ok(!(await calls(q, 'confirmUnlock')).length && await covered(q), 'si Android ya lo bloqueó: Android pide tu patrón y nada se ve');
  noErr(q); await q.done();
  /* Reloj: sin cambios */
  const w = await open({ native: true, watch: true, settings: SET({ autoScr: true }), plans: [PLAN('bombeo', [X('Extensión de Pierna', 3, 40)])] }); await start(w); await w.waitForTimeout(400);
  await w.T(40000); await w.waitForTimeout(1300);
  ok(!(await dimmed(w)) && !(await calls(w, 'dim')).length && !(await calls(w, 'keepAwake')).length, 'reloj: no cambia nada');
  noErr(w); await w.done();
}

/* ---------- 2. Tu semana en Hoy ---------- */
console.log('2. Tu semana en Hoy');
{
  const W = [SES('w1', 2, 'fuerza', [['Press Banca Plano (Barra)', [[60, 8], [60, 8], [60, 7]]], ['Sentadilla Hack', [[80, 10], [80, 10], [80, 9], [80, 9]]]], { durationSec: 3300 }), SES('w2', 1, 'bombeo', [['Extensión de Pierna', [[40, 15], [40, 14]]]], { durationSec: 2400 })];
  const p = await open({ sessions: W, plans: [PLAN('fuerza', [X('Prensa 45°', 3, 80)])] });
  await p.evaluate(() => { state.tab = 'train'; render(); }); await p.waitForTimeout(300);
  const C = await p.evaluate(() => { const c = document.querySelector('#app .g3-hoy'); return c ? { txt: c.innerText.replace(/\s+/g, ' '), svg: !!c.querySelector('.mm-svg'), fill: !!c.querySelector('[data-wc="fill"]'), h: Math.round(c.getBoundingClientRect().height) } : null; });
  console.log('      ' + (C && C.txt) + ' · ' + (C && C.h) + ' px');
  ok(C && C.svg && /Te faltan/.test(C.txt) && C.fill, 'Hoy: mapa de la semana, músculos que faltan y "Crear entreno para completar"');
  ok(C && /2 entrenos · 1 h 35 min/.test(C.txt), 'con entrenos de la semana y el tiempo entrenado');
  ok(C && C.h <= 260, 'compacta (' + (C && C.h) + ' px)');
  ok(await p.evaluate(() => (document.body.innerHTML.match(/class="card g3-hoy[" ]/g) || []).length === 1), 'una sola vez');
  await act(p, '#app .g3-hoy .g3-hl'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => /Reporte de la semana/.test(document.getElementById('sheet').innerText)), 'al tocarla: el reporte completo (el mismo de Progreso)');
  await p.evaluate(() => closeSheet()); await act(p, '#app .g3-hoy [data-wc="fill"]'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => !!document.querySelector('#sheet .wc-sheet')), 'el botón abre "Crear entreno para completar"');
  noErr(p); await p.done();
  const n = await open({ first: true }); await n.evaluate(() => { closeSheet(); state.tab = 'train'; render(); }); await n.waitForTimeout(200);
  ok(await n.evaluate(() => !document.querySelector('.g3-hoy')), 'usuario nuevo sin entrenos: no sale todavía'); noErr(n); await n.done();
  const w = await open({ watch: true, sessions: W }); ok(await w.evaluate(() => !document.querySelector('.g3-hoy')), 'reloj: no sale'); noErr(w); await w.done();
}

/* ---------- 3. Hoy vs anterior ---------- */
console.log('3. Cuadro "Hoy vs anterior"');
const EX7 = ['Sentadilla con Mancuernas', 'Sentadilla Hack', 'Patada de Glúteo en Polea', 'Curl Femoral Tumbado', 'Extensión de Pierna', 'Abducción de Cadera', 'Elevación de Talones en Hack'];
{
  const ANT = SES('ant', 7, 'bombeo', EX7.slice(0, 6).map(n => [n, [[30, 12, 2], [30, 12, 1], [30, 11, 1]]]));
  const p = await open({ native: true, sessions: [ANT], plans: [PLAN('bombeo', EX7.map((n, k) => X(n, 3, 30, k === 4 ? { ss: 1 } : {})))] });
  await start(p); await p.waitForTimeout(300);
  let t = 0;
  for (const n of [EX7[1], EX7[0]].concat(EX7.slice(2))) for (let j = 0; j < 3; j++) { t += 120000; await p.T(t); await mark(p, n, j, n === EX7[3] ? 27.5 : 30, n === EX7[2] ? 10 : 13, 2 - Math.min(j, 1)); }
  await p.T(t + 120000); await act(p, '[data-act="fin-ask"]'); await p.waitForTimeout(200); await act(p, '[data-act="fin-save"]'); await p.waitForTimeout(800);
  const S = await p.evaluate(() => { const c = document.querySelector('#sheet .g3-cmp'); if (!c) return null; const r = c.getBoundingClientRect(); return { head: c.querySelector('.g3-ch').innerText.replace(/\s+/g, ' '), rows: [...c.querySelectorAll('tbody tr')].map(tr => [...tr.children].map(td => td.innerText.replace(/\s+/g, ' ').trim())), h: Math.round(r.height), w: Math.round(r.width), list: !!document.querySelector('#sheet .g2-exl') }; });
  console.log('      ' + S.head); S.rows.forEach(r => console.log('      ' + r.join(' | ')));
  ok(S && /Pierna · Bombeo · Gimnasio A/.test(S.head) && /min/.test(S.head) && /frente a/.test(S.head), 'arriba: día, tipo, gimnasio, fecha, duración y con qué sesión se compara');
  ok(S.rows.length === 7 && S.rows[0][0].indexOf(EX7[1]) === 0 && S.rows[1][0].indexOf(EX7[0]) === 0, 'una fila por ejercicio, en el orden real');
  ok(S.rows.every(r => /×/.test(r[1])) && /@/.test(S.rows[0][1]), 'hoy: peso×reps @RIR por serie');
  ok(S.rows.find(r => r[0].indexOf(EX7[6]) === 0)[2] === 'Primera vez aquí', 'sin anterior en este gimnasio: "Primera vez aquí"');
  ok(S.rows.find(r => r[0].indexOf(EX7[0]) === 0)[3] === '↑' && S.rows.find(r => r[0].indexOf(EX7[3]) === 0)[3] === '↓' && S.rows.find(r => r[0].indexOf(EX7[2]) === 0)[3] === '↓', 'cambio con ↑ y ↓');
  ok(/SS/.test(S.rows.find(r => r[0].indexOf(EX7[4]) === 0)[0]) && /SS/.test(S.rows.find(r => r[0].indexOf(EX7[5]) === 0)[0]), 'la superserie va marcada');
  ok(!S.list, 'reemplaza la lista de antes (no se repite)');
  ok(S.h <= 700 && S.w <= 390, `compacto para una captura: ${S.w}×${S.h} px con 7 ejercicios`);
  await p.evaluate(() => { window.__clip = ''; ddCopy = t => { window.__clip = t; return Promise.resolve(true); }; });
  await act(p, '#sheet [data-g3="copy"]'); await p.waitForTimeout(100);
  const txt = await p.evaluate(() => window.__clip); console.log('\n' + txt.split('\n').map(l => '      ' + l).join('\n'));
  ok(/^Pierna · Bombeo · Gimnasio A/.test(txt) && /Ejercicio \| Hoy \| Anterior \| Cambio/.test(txt) && txt.split('\n').length === 10 && /superserie/.test(txt), '"Copiar como texto" con el mismo contenido');
  /* Al abrirla después */
  await p.evaluate(() => { closeSheet(); document.querySelectorAll('.celebrate').forEach(x => x.remove()); daySheet(dk(state.sessions[0].date)); }); await p.waitForTimeout(200);
  await act(p, '#sheet [data-g3="cmp"]'); await p.waitForTimeout(150);
  ok(await p.evaluate(() => document.querySelectorAll('#sheet .g3-box:not([hidden]) .g3-cmp tbody tr').length === 7), 'al abrir el día después: el mismo cuadro');
  noErr(p); await p.done();
}

/* ---------- 4. Análisis de sesiones guardadas (también las de antes de la v1.0.61) ---------- */
console.log('4. Análisis de sesiones guardadas');
{
  const OLD = [SES('o1', 6, 'bombeo', [['Sentadilla Hack', [[50, 15], [50, 14]]], ['Extensión de Pierna', [[40, 20, 0], [40, 12, 0]]]], { dayName: 'Piernas (Bombeo)', durationSec: 5400 }),
    SES('o2', 6, 'fuerza', [['Mi ejercicio raro', [[10, 10]]]], { planId: 'pX', dayId: 'dX', dayName: 'Otra rutina', gymId: undefined })];
  const p = await open({ sessions: OLD, plans: [PLAN('bombeo', [X('Sentadilla Hack', 2, 50)])] });
  await p.evaluate(() => daySheet(dk(state.sessions[0].date))); await p.waitForTimeout(200);
  const A = await p.evaluate(() => [...document.querySelectorAll('#sheet .dd-ses')].map(n => ({ details: !!n.querySelector('details.ag-an'), btn: !!n.querySelector('[data-g3="an"]') })));
  ok(A.length === 2 && A.every(a => !a.details), 'ya no depende del plegable del sistema');
  ok(A.every(a => a.btn), 'las sesiones de antes también tienen su análisis');
  await act(p, '#sheet .dd-ses [data-g3="an"]'); await p.waitForTimeout(150);
  const T = await p.evaluate(() => { const b = document.querySelector('#sheet .g3-box:not([hidden])'); return b ? { txt: b.innerText.replace(/\s+/g, ' '), tb: !!b.querySelector('.ag-tb'), h: Math.round(b.getBoundingClientRect().height) } : null; });
  console.log('      ' + (T && T.txt.slice(0, 220)));
  ok(T && T.tb && /Para tu próxima sesión/i.test(T.txt) && T.h > 60, 'al tocarlo se arma y se ve completo');
  await act(p, '#sheet .dd-ses [data-g3="an"]'); await p.waitForTimeout(100);
  ok(await p.evaluate(() => !document.querySelector('#sheet .g3-box:not([hidden])')), 'otro toque lo cierra');
  /* Si no hay nada que analizar, el título no sale */
  await p.evaluate(() => { const o = agAnalysisHtml; agAnalysisHtml = () => ''; closeSheet(); daySheet(dk(state.sessions[0].date)); agAnalysisHtml = o; }); await p.waitForTimeout(150);
  ok(await p.evaluate(() => !document.querySelector('#sheet [data-g3="an"]') && !/Análisis de la sesión/.test(document.getElementById('sheet').innerText)), 'sin análisis: no sale el título vacío');
  noErr(p); await p.done();
  const w = await open({ watch: true, sessions: OLD }); await w.evaluate(() => daySheet(dk(state.sessions[0].date))); await w.waitForTimeout(150);
  ok(await w.evaluate(() => !document.querySelector('#sheet [data-g3]')), 'reloj: su detalle del día no cambia'); noErr(w); await w.done();
}

await browser.close();
console.log(fail ? `\n${fail} FALLA(S)` : '\nTodo OK');
process.exit(fail ? 1 : 0);
