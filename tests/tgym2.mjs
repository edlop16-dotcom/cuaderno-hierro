import { OWNER_SETTINGS } from './owner-fixture.mjs';
// Prueba de la rama ajustes-gym-2, con datos inventados. Solo teléfono; el reloj se compara aparte (treloj.mjs).
// Uso (desde PowerShell): $env:PW_DIR = "<carpeta con node_modules/playwright>"; node tests/tgym2.mjs <copia transpilada>
// La parte nativa no corre en el navegador: se simula el plugin HabitAlarm (con un bloqueo con patrón simulado).
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
const T0 = Date.parse('2026-11-08T18:00:00');   /* domingo: queda 1 día de la semana */
const DAY = n => n * 864e5;
let N = 0;
const X = (name, sets, w, extra) => Object.assign({ id: 'x' + (++N), name, type: 'Piernas', weight: w, sets, repsMin: 8, repsMax: 12, rest: 90 }, extra);
const PLAN = (kind, ex) => ({ id: 'pA', name: 'Rutina A', gymId: 'rokaz', days: [{ id: 'dA', name: 'Pierna', weekday: 0, kind, exercises: ex }] });
const SET = extra => { const s = Object.assign(structuredClone(OWNER_SETTINGS), { activePlanId: 'pA', activeGymId: 'rokaz', planByGym: { rokaz: 'pA' }, newsSeen: 'n6' }, extra || {}); s.prof = Object.assign({}, s.prof, { goal: 'musculo', exp: 2, mins: 75 }); return s; };
const SES = (id, ago, kind, ex) => ({ id, date: new Date(T0 - DAY(ago)).toISOString(), planId: 'pA', planName: 'Rutina A', dayId: 'dA', dayName: 'Pierna', gymId: 'rokaz', gymName: 'Gimnasio A', kind, durationSec: 3600, exercises: ex.map(([name, sets]) => ({ name, type: 'Piernas', sets: sets.map(([w, r, rir]) => Object.assign({ w, r }, rir != null ? { rir } : {})) })) });

/* Capacitor simulado: HabitAlarm con sessionLock y un bloqueo con patrón que se puede activar */
const NATIVE = () => {
  window.__ha = []; window.__locked = false;
  const rec = n => o => { window.__ha.push([n, o || null]); if (n === 'sessionLock') return Promise.resolve({ locked: window.__locked }); return Promise.resolve(n === 'status' ? { fullScreen: true, exact: true, overlay: true } : n === 'takeEvents' ? { events: [] } : {}); };
  const H = {}; ['schedule', 'takeEvents', 'dismiss', 'status', 'openSettings', 'test', 'log', 'rest', 'restCancel', 'sessionLock'].forEach(n => { H[n] = rec(n); });
  const L = { schedule: () => Promise.resolve({}), cancel: () => Promise.resolve(), checkPermissions: () => Promise.resolve({ display: 'granted' }), requestPermissions: () => Promise.resolve({ display: 'granted' }), getPending: () => Promise.resolve({ notifications: [] }), addListener: () => ({ remove() {} }) };
  window.Capacitor = { isNativePlatform: () => true, getPlatform: () => 'android', Plugins: { HabitAlarm: H, LocalNotifications: L, App: { addListener: () => ({ remove() {} }), getInfo: () => Promise.resolve({ version: '1.0.60', build: '60' }) } } };
};
async function open({ watch, settings, sessions, plans, native, gyms, first, at } = {}) {
  const srv = await serve(DIR);
  const ctx = await browser.newContext(watch ? { viewport: { width: 410, height: 500 }, hasTouch: true } : { viewport: { width: 390, height: 844 }, hasTouch: true });
  await ctx.route(/googleapis|gstatic|google\.com|firebase|github/, r => r.abort());
  const p = await ctx.newPage(); p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message));
  p.T = ms => p.clock.setFixedTime(new Date((at || T0) + ms));
  await p.T(0);
  if (native) await p.addInitScript(NATIVE);
  if (!first) await p.addInitScript(([s, pl, ss, g]) => { if (localStorage.getItem('cdh.seeded')) return; localStorage.setItem('cdh.seeded', '1');
    localStorage.setItem('cdh.settings', JSON.stringify(s)); localStorage.setItem('cdh.plans', JSON.stringify(pl)); localStorage.setItem('cdh.sessions', JSON.stringify(ss));
    localStorage.setItem('cdh.gyms', JSON.stringify(g)); localStorage.setItem('cdh.newsSeen', '"n6"'); }, [settings || SET(), plans || [], sessions || [], gyms || [{ id: 'rokaz', name: 'Gimnasio A' }]]);
  await p.goto(`http://127.0.0.1:${srv.address().port}/index.html`); await p.waitForTimeout(1500);
  if (!first) await p.evaluate(() => { state.settings.healthOk = 1; state.notifPerm = 'granted'; closeSheet(); render(); });
  p.done = async () => { await ctx.close(); srv.close(); };
  return p;
}
const noErr = p => ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
const start = p => p.evaluate(() => { state.settings.nextS = { dA: { pick: 'plan' } }; startSession('pA', 'dA'); render(); });
const ix = (p, n) => p.evaluate(n => state.draft.exercises.findIndex(e => e.name === n), n);
/* Marca como en el teléfono: el peso y las reps, el ✓ y luego el RIR con su botón */
async function doSet(p, n, j, w, r, rir) {
  const i = await ix(p, n);
  await p.evaluate(([i, j, w, r]) => { const s = state.draft.exercises[i].log[j]; s.w = w; s.r = r; saveDraft(); markSet(i, j, true); }, [i, j, w, r]);
  await p.waitForTimeout(200);
  if (rir != null) { const hit = await p.evaluate(([i, j, v]) => { const b = document.querySelector(`[data-act="rir"][data-ex="${i}"][data-set="${j}"][data-v="${v}"]`); if (!b) return false; b.click(); return true; }, [i, j, rir]); if (!hit) await p.evaluate(([i, j, v]) => { state.draft.exercises[i].log[j].rir = v; saveDraft(); }, [i, j, rir]); }
  await p.waitForTimeout(900);
  return i;
}
const calls = (p, n) => p.evaluate(n => window.__ha.filter(c => c[0] === n).map(c => c[1]), n);
const act = (p, sel) => p.evaluate(s => { const b = document.querySelector(s); if (!b) return false; b.click(); return true; }, sel);
const covered = p => p.evaluate(() => document.documentElement.classList.contains('g2-cover') && getComputedStyle(document.getElementById('app')).visibility === 'hidden');
const vis = (p, v) => p.evaluate(v => { Object.defineProperty(document, 'visibilityState', { value: v, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); }, v);

/* ---------- 1. Sin desbloquear: solo la sesión ---------- */
console.log('1. Aviso de descanso y sesión sin desbloquear');
{
  const src = fs.readFileSync(path.join(HERE, '..', 'ci', 'native', 'HabitAlarmPlugin.java'), 'utf8'), al = fs.readFileSync(path.join(HERE, '..', 'ci', 'native', 'HabitAlarms.java'), 'utf8');
  ok(/public void sessionLock/.test(src) && /setShowWhenLocked\(on\)/.test(src) && /FLAG_SHOW_WHEN_LOCKED/.test(src) && /isKeyguardLocked/.test(src), 'nativo: la app se ve encima del bloqueo solo mientras la app lo pide, y dice si está bloqueado');
  ok(/if \(sessShow\) open\.run\(\);/.test(al), 'nativo: "Volver a la sesión" no pide el patrón con la sesión en curso');
  const p = await open({ native: true, plans: [PLAN('bombeo', [X('Extensión de Pierna', 2, 40), X('Curl Femoral Tumbado', 2, 30)])] });
  ok(!(await calls(p, 'sessionLock')).length, 'sin sesión no pide nada');
  await start(p); await p.waitForTimeout(900);
  let L = await calls(p, 'sessionLock'); ok(L.length && L[L.length - 1].on === true, 'con la sesión en pantalla: se ve encima del bloqueo');
  await p.evaluate(() => { window.__locked = true; });   /* apagas la pantalla: queda bloqueado con patrón */
  await p.evaluate(() => { document.querySelector('[data-act="sx-min"]').click(); g2LockSync(); });   /* la revisión periódica justo mientras la sesión se desliza */
  await p.waitForTimeout(80);
  ok(await covered(p), 'salir de la sesión (a Hoy) con el celular bloqueado: la pantalla se tapa al instante');
  L = await calls(p, 'sessionLock'); ok(L[L.length - 1].on === false, 'y Android vuelve a pedir el patrón');
  await p.waitForTimeout(500);
  await p.evaluate(() => { state.tab = 'profile'; render(); if (typeof finSheet === 'function') finSheet(); });
  await p.waitForTimeout(300);
  ok(await covered(p) && await p.evaluate(() => getComputedStyle(document.getElementById('sheet')).visibility === 'hidden'), 'Mis finanzas no se ve sin desbloquear');
  await p.evaluate(() => { window.__locked = false; }); await vis(p, 'visible'); await p.waitForTimeout(200);
  ok(!(await covered(p)), 'al desbloquear con tu patrón, se ve otra vez');
  await p.evaluate(() => { closeSheet(); state.sessMin = false; state.tab = 'train'; render(); }); await p.waitForTimeout(900);
  L = await calls(p, 'sessionLock'); ok(L[L.length - 1].on === true, 'vuelves a la sesión: otra vez sin patrón');
  await p.evaluate(() => { window.__locked = true; finSheet(); }); await p.waitForTimeout(900);
  L = await calls(p, 'sessionLock'); ok(L[L.length - 1].on === false && await covered(p), 'aunque algo abriera Mis finanzas encima de la sesión: se pide el patrón');
  await p.evaluate(() => { window.__locked = false; closeSheet(); render(); }); await vis(p, 'visible'); await p.waitForTimeout(900);
  await p.evaluate(() => { window.__locked = true; });
  await p.T(60000); await doSet(p, 'Extensión de Pierna', 0, 40, 16, 2);
  await act(p, '[data-act="fin-ask"]'); await p.waitForTimeout(200); await act(p, '[data-act="fin-save"]'); await p.waitForTimeout(900);
  L = await calls(p, 'sessionLock'); ok(L[L.length - 1].on === false && await covered(p), 'al terminar la sesión, vuelve a pedir el desbloqueo como siempre');
  noErr(p); await p.done();
  const w = await open({ native: true, watch: true, plans: [PLAN('bombeo', [X('Extensión de Pierna', 2, 40)])] }); await start(w); await w.waitForTimeout(900);
  ok(!(await calls(w, 'sessionLock')).length, 'reloj: no cambia nada'); noErr(w); await w.done();
  const web = await open({ plans: [PLAN('bombeo', [X('Extensión de Pierna', 2, 40)])] }); await start(web); await web.waitForTimeout(900);
  ok(!(await covered(web)), 'web (sin la app instalada): nada que tapar'); noErr(web); await web.done();
}

/* ---------- 2-4 y 7. Tu sesión inventada, serie por serie, y el resumen al terminar ---------- */
console.log('2-4 y 7. Sesión inventada: indicaciones, paso al siguiente y resumen al terminar');
const SAMPLE = [['Sentadilla con Mancuernas', 30, [15, 15, 15], [2, 1, 0]], ['Sentadilla Hack', 50, [15, 15, 15], [1, 1, 0]], ['Patada de Glúteo en Polea', 30, [20, 20, 20], [2, 1, 0]], ['Curl Femoral Tumbado', 25, [18, 15, 14], [1, 0, 0]], ['Extensión de Pierna', 40, [20, 12], [0, 0]], ['Abducción de Cadera', 25, [20, 20, 20], [1, 0, 0]], ['Elevación de Talones en Hack', 30, [20, 25, 20], [2, 1, 0]]];
const PIERNAS = () => { const P = PLAN('bombeo', SAMPLE.map(x => X(x[0], x[2].length, x[1]))); const ex = P.days[0].exercises; const k = ex.findIndex(e => e.name === 'Extensión de Pierna'); const ab = ex.splice(ex.findIndex(e => e.name === 'Abducción de Cadera'), 1)[0]; ex.splice(k + 1, 0, ab); ex[k].ss = 1; return P; };
const ANTES = SES('antes', 7, 'bombeo', SAMPLE.map(x => [x[0], x[2].map(() => [x[1], Math.max(8, x[2][0] - 2), 2])]));
{
  const p = await open({ native: true, sessions: [ANTES], plans: [PIERNAS()] }); await start(p); await p.waitForTimeout(400);
  const order = await p.evaluate(() => state.draft.exercises.map(e => e.name));
  ok(await p.evaluate(() => { const d = state.draft, a = d.exercises.find(e => e.name === 'Extensión de Pierna'), b = d.exercises.find(e => e.name === 'Abducción de Cadera'); return ssOf(d, a) && ssOf(d, a) === ssOf(d, b); }), 'superserie de la prueba: Extensión de Pierna con Abducción de Cadera');
  const rec = await p.evaluate(() => { const pg = document.querySelector('.sx-page[data-i="0"]'), r = pg && pg.querySelector('.g2-rec'); return r ? r.innerText.replace(/\s+/g, ' ') : ''; });
  console.log('      arriba del 1.er ejercicio:', rec);
  ok(/^Hoy (\d+(\.\d+)?×\d+@\d ?){3}/.test(rec) && rec.length > 40, 'al llegar: recomendación arriba, con peso, reps y RIR por serie, y la razón');
  ok(await p.evaluate(() => { const e = state.draft.exercises[0]; return e.log.every(s => +s.w > 0 && +s.r > 0); }), 'los campos traen esa recomendación');
  let t = 0; const said = {};
  console.log('      Lo que dice la app después de cada serie (con su RIR):');
  for (const n of order) {
    const x = SAMPLE.find(y => y[0] === n); if (!x) continue;
    for (let j = 0; j < x[2].length; j++) {
      t += n === 'Extensión de Pierna' || n === 'Abducción de Cadera' ? 50000 : 160000; await p.T(t);
      const i = await doSet(p, n, j, x[1], x[2][j], x[3][j]);
      const shown = await p.evaluate(i => { const pg = document.querySelector('.sx-page[data-i="' + i + '"]'), tip = pg && pg.querySelector('.ag-tip'); if (!tip) return null; const nx = tip.nextElementSibling; return { t: tip.innerText.replace(/\s+/g, ' ').trim(), nearSet: !!(nx && nx.classList.contains('n')) || !!(tip.previousElementSibling && tip.previousElementSibling.classList.contains('sets')) }; }, i);
      said[n] = shown && shown.t;
      console.log(`      ${n} ${x[1]}×${x[2][j]} RIR ${x[3][j]} → ${shown ? shown.t : '(nada)'}`);
      if (!shown || !shown.nearSet) ok(false, 'la indicación va junto a la serie siguiente: ' + n + ' ' + (j + 1));
    }
  }
  ok(Object.values(said).every(v => v && v.length > 25), 'después de cada serie hay una indicación con su razón, nunca vacía');
  ok(!/baja/.test(said['Extensión de Pierna'] || ''), 'superserie: la caída de la Extensión no pide bajar el peso');
  const dum = await p.evaluate(() => { const s = exDraftSession(), r = agTable(Object.assign(s, { exercises: s.exercises })).find(x => x.n === 'Sentadilla con Mancuernas'); return r; });
  console.log('      Sentadilla con Mancuernas para la próxima:', JSON.stringify(dum));
  ok(dum && (dum.w === 30 || dum.w === 32.5) && dum.reps >= 12 && dum.reps <= 15, 'Sentadilla con Mancuernas en bombeo: un peso posible (30 o 32,5) y reps del rango de bombeo (12-15)');
  /* Deja que la pantalla siga sola, sin tocar nada */
  ok(await p.evaluate(() => !document.querySelector('#toast:not([hidden])') || !/Ahora conviene/.test(document.getElementById('toast').textContent)), '"Ahora conviene…" ya no flota encima del tiempo ni de Terminar');
  await p.T(t + 300000);
  await act(p, '[data-act="fin-ask"]'); await p.waitForTimeout(200); await act(p, '[data-act="fin-save"]');
  await p.waitForTimeout(700);
  const S = await p.evaluate(() => ({ fs: !!document.querySelector('#sheet .fs-card'), cel: !!document.querySelector('.celebrate'), txt: document.querySelector('#sheet').innerText }));
  ok(S.fs && !S.cel, 'al tocar Terminar sale el resumen en ese momento (la racha espera)');
  /* Desde ajustes-gym-3 la lista es el cuadro "Hoy vs anterior" */
  ok(/Hoy vs anterior/i.test(S.txt) && /Primera vez aquí|frente a/.test(S.txt) && /Lo que salió bien/i.test(S.txt) && /Lo que conviene ajustar/i.test(S.txt) && /Para tu próxima sesión/i.test(S.txt), 'con tus ejercicios en orden real, la última vez de cada uno, lo que salió bien, lo que ajustar y la tabla');
  console.log('\n      RESUMEN AL TERMINAR\n' + S.txt.split('\n').filter(Boolean).map(l => '      ' + l).join('\n'));
  const real = await p.evaluate(() => state.sessions[0].exercises.map(e => e.name)), shownOrder = await p.evaluate(() => [...document.querySelectorAll('#sheet .g3-cmp tbody tr td:first-child')].map(td => td.textContent.replace(/ SS \w+$/, '').trim()));
  ok(JSON.stringify(real) === JSON.stringify(shownOrder), 'el orden del resumen es el real');
  await act(p, '[data-act="fs-close"]'); await p.waitForTimeout(700);
  ok(await p.evaluate(() => !!document.querySelector('.celebrate')), 'al cerrarlo, sale la racha');
  noErr(p); await p.done();
}

/* ---------- 4. Al terminar un ejercicio, al siguiente (o al elegido con Ir) ---------- */
console.log('4. Paso al siguiente ejercicio');
{
  const ex = [X('Prensa 45°', 2, 80), X('Extensión de Pierna', 2, 40), X('Curl Femoral Tumbado', 2, 30), X('Elevación de Talones de Pie', 2, 40)];
  const p = await open({ native: true, plans: [PLAN('fuerza', ex)] }); await start(p); await p.waitForTimeout(400);
  await p.T(60000); await doSet(p, 'Prensa 45°', 0, 80, 10, 2);
  ok(await p.evaluate(() => state.draft.cur) === 0, 'a mitad del ejercicio no se mueve');
  await p.T(200000); await doSet(p, 'Prensa 45°', 1, 80, 9, 1);
  ok(await p.evaluate(() => state.draft.cur) === 1, 'última serie + RIR: pasa sola al siguiente de la lista');
  const go = await p.evaluate(() => { const d = state.draft; d.agNo = null; return agPick(d) ? agPick(d).i : null; });
  await p.T(260000); await doSet(p, 'Extensión de Pierna', 0, 40, 12, 2);
  const target = await p.evaluate(() => { const b = document.querySelector('#ag-next [data-ag="go"]'); if (!b) return null; b.click(); return +b.dataset.i; });
  await p.waitForTimeout(300);
  if (target != null) {
    ok(await p.evaluate(() => state.draft.cur) === 1 && await p.evaluate(t => state.draft.agGo === t, target), '"Ir" a mitad del ejercicio lo deja elegido, sin sacarte de lo que haces');
    await p.T(400000); await doSet(p, 'Extensión de Pierna', 1, 40, 12, 1);
    ok(await p.evaluate(() => state.draft.cur) === target, 'al terminar, pasa al que elegiste con "Ir" (' + target + ')');
  } else ok(go == null, 'sin sugerencia que elegir');
  const recNow = await p.evaluate(() => { const pg = document.querySelector('.sx-page[data-i="' + state.draft.cur + '"]'); return pg && pg.querySelector('.g2-rec') ? pg.querySelector('.g2-rec').innerText.replace(/\s+/g, ' ') : ''; });
  ok(/^Hoy \d/.test(recNow), 'en el ejercicio nuevo: su recomendación arriba');
  const i2 = await p.evaluate(() => state.draft.cur);
  await p.evaluate(i => { const s = state.draft.exercises[i].log[0]; s.w = 22.5; s.r = 9; saveDraft(); }, i2);
  ok(await p.evaluate(i => +state.draft.exercises[i].log[0].w === 22.5, i2), 'tú decides: puedes cambiar el peso y las reps');
  noErr(p); await p.done();
}

/* ---------- 3. Indicación visible hasta la serie siguiente, con Aplicar ---------- */
console.log('3. Indicación junto a la serie siguiente');
{
  const p = await open({ native: true, plans: [PLAN('fuerza', [X('Extensión de Pierna', 3, 9), X('Prensa 45°', 3, 100)])] }); await start(p); await p.waitForTimeout(300);
  await p.T(60000); await doSet(p, 'Extensión de Pierna', 0, 9, 16, 2);
  const tip = () => p.evaluate(() => { const n = document.querySelector('.sx-page[data-i="0"] .ag-tip'); return n ? n.innerText.replace(/\s+/g, ' ').trim() : ''; });
  const t1 = await tip(); console.log('      ' + t1);
  ok(/Hiciste 16 con RIR 2: sube a/.test(t1) && /Aplicar/.test(t1), 'como un entrenador: "Hiciste 16 con RIR 2: sube a … en la próxima", con Aplicar');
  await p.waitForTimeout(4000); ok((await tip()) === t1, 'sigue visible varios segundos después');
  await p.evaluate(() => document.querySelectorAll('.ag-tip').forEach(n => n.remove())); await p.waitForTimeout(900);
  ok((await tip()) === t1, 'si algo redibuja la tarjeta, vuelve');
  await act(p, '.sx-page[data-i="0"] [data-ag="apply"]'); await p.waitForTimeout(200);
  const W = await p.evaluate(() => state.draft.exercises[0].log.map(s => +s.w)); ok(W[1] > 9 && W[2] > 9, 'Aplicar pone el peso nuevo en las series que faltan (' + W.join(', ') + ')');
  await p.T(200000); await doSet(p, 'Extensión de Pierna', 1, W[1], 12, 2);
  const t2 = await tip(); console.log('      ' + t2); ok(/^Bien: mantén/.test(t2), 'sin nada nuevo: "Bien: mantén …"');
  ok(await p.evaluate(() => { const b = document.querySelector('.lv-next'); return !b || !!b.closest('.card.ex'); }), '"Ahora conviene…" va dentro de la pantalla del ejercicio');
  noErr(p); await p.done();
}

/* ---------- 5. Reemplazar queda en la rutina ---------- */
console.log('5. Reemplazar un ejercicio');
{
  const plan = PLAN('fuerza', [X('Prensa 45°', 3, 80), X('Extensión de Pierna', 3, 40), X('Curl Femoral Tumbado', 3, 30)]);
  const p = await open({ native: true, plans: [plan] }); await start(p); await p.waitForTimeout(300);
  await p.evaluate(() => { const i = state.draft.exercises.findIndex(e => e.name === 'Extensión de Pierna'); swapSheet(i); }); await p.waitForTimeout(200);
  ok(await p.evaluate(() => !document.getElementById('sw-keep') && /queda también en tu rutina/.test(document.getElementById('sheet').innerText)), 'el teléfono ya no pregunta: el cambio queda en tu rutina');
  await p.evaluate(() => { closeSheet(); swapDo(1, 'Sentadilla Búlgara', false); }); await p.waitForTimeout(300);
  let D = await p.evaluate(() => state.plans.find(x => x.id === 'pA').days[0].exercises.map(e => e.name));
  ok(JSON.stringify(D) === JSON.stringify(['Prensa 45°', 'Sentadilla Búlgara', 'Curl Femoral Tumbado']), 'en la misma posición y sin duplicar el original: ' + D.join(', '));
  await p.evaluate(() => { swapDo(2, 'Prensa 45°', false); }); await p.waitForTimeout(300);
  D = await p.evaluate(() => state.plans.find(x => x.id === 'pA').days[0].exercises.map(e => e.name));
  ok(D.filter(n => n === 'Prensa 45°').length === 1, 'si el reemplazo ya estaba en la rutina, no se duplica');
  noErr(p); await p.done();
  const q = await open({ native: true, plans: [plan] });
  await q.evaluate(() => { qkStart ? 0 : 0; }).catch(() => {});
  await q.evaluate(() => { const P = JSON.parse(JSON.stringify(state.plans[0])); P.id = 'quick'; P.days[0].id = 'dq'; state.plans.push(P); startSession('quick', 'dq'); state.plans = state.plans.filter(x => x.id !== 'quick'); render(); });
  await q.waitForTimeout(300); const before = await q.evaluate(() => JSON.stringify(state.plans));
  await q.evaluate(() => swapDo(0, 'Sentadilla Hack', false)); await q.waitForTimeout(200);
  ok(before === await q.evaluate(() => JSON.stringify(state.plans)), 'Entreno rápido: solo hoy'); noErr(q); await q.done();
  const w = await open({ native: true, watch: true, plans: [plan] }); await start(w); await w.waitForTimeout(300);
  const wb = await w.evaluate(() => JSON.stringify(state.plans)); await w.evaluate(() => swapDo(1, 'Sentadilla Búlgara', false)); await w.waitForTimeout(200);
  ok(wb === await w.evaluate(() => JSON.stringify(state.plans)), 'reloj: solo hoy'); noErr(w); await w.done();
}

/* ---------- 6. Superserie con… ---------- */
console.log('6. Superserie fácil de encontrar');
{
  const p = await open({ native: true, plans: [PLAN('bombeo', [X('Prensa 45°', 3, 80), X('Extensión de Pierna', 3, 40), X('Curl Femoral Tumbado', 3, 30), X('Abducción de Cadera', 3, 25)])] }); await start(p); await p.waitForTimeout(300);
  const pill = await p.evaluate(() => { const b = document.querySelector('.sx-page[data-i="1"] .su-pills .g2-ssb'); return b ? b.innerText.trim() : ''; });
  ok(/Superserie con/.test(pill), 'botón "Superserie con…" en la tarjeta del ejercicio');
  await act(p, '.sx-page[data-i="1"] .g2-ssb'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => /Elige la pareja/.test(document.getElementById('sheet').innerText)), 'deja elegir el ejercicio pareja');
  await p.evaluate(() => { const b = [...document.querySelectorAll('[data-g2="ss-pick"]')].find(x => /Abducción/.test(x.innerText)); b.click(); }); await p.waitForTimeout(300);
  const R = await p.evaluate(() => { const d = state.draft, a = d.exercises[1], b = d.exercises.find(e => e.name === 'Abducción de Cadera'), P = state.plans[0].days[0].exercises; return { same: ssOf(d, a) && ssOf(d, a) === ssOf(d, b), plan: P.map(e => e.name + (e.ss ? '+' : '')) }; });
  ok(R.same, 'en la sesión de hoy queda la superserie');
  ok(JSON.stringify(R.plan) === JSON.stringify(['Prensa 45°', 'Extensión de Pierna+', 'Abducción de Cadera', 'Curl Femoral Tumbado']), 'y en tu rutina, juntos: ' + R.plan.join(', '));
  ok(await p.evaluate(() => /Superserie con Abducción/.test(document.querySelector('.sx-page[data-i="1"] .g2-ssb').innerText)), 'el botón dice con quién');
  await act(p, '.sx-page[data-i="1"] .g2-ssb'); await p.waitForTimeout(150); await act(p, '[data-g2="ss-off"]'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => !ssOf(state.draft, state.draft.exercises[1]) && !state.plans[0].days[0].exercises.some(e => e.ss)), 'y se puede quitar');
  noErr(p); await p.done();
}

/* ---------- 7. Rango del coach con una rutina importada de otra IA ---------- */
console.log('7. Rango del coach frente al de tu IA');
{
  const ses = [SES('h1', 3, 'bombeo', [['Extensión de Pierna', [[40, 16, 2], [40, 14, 1]]]])];
  const p = await open({ native: true, sessions: ses, plans: [PLAN('bombeo', [X('Extensión de Pierna', 2, 40), X('Curl Femoral Tumbado', 2, 30)])] });
  await p.evaluate(() => { state.settings.nextS = { dA: { pick: 'ia', ia: { at: Date.now(), plan: 'pA', ex: [{ exId: state.plans[0].days[0].exercises[0].id, name: 'Extensión de Pierna', sets: [{ w: 40, rMin: 12, rMax: 16, rir: 1 }, { w: 40, rMin: 12, rMax: 16, rir: 0 }] }, { exId: state.plans[0].days[0].exercises[1].id, name: 'Curl Femoral Tumbado', sets: [{ w: 30, rMin: 12, rMax: 16, rir: 1 }] }] } } }; startSession('pA', 'dA'); render(); });
  await p.waitForTimeout(400);
  const R = await p.evaluate(() => state.draft.exercises.map(e => ({ n: e.name, ia: e.ns, r: e.repsMin + '-' + e.repsMax, rx: agRxOf(state.draft, e).rMin + '-' + agRxOf(state.draft, e).rMax })));
  console.log('      ' + JSON.stringify(R));
  const ext = R.find(x => x.n === 'Extensión de Pierna'), cf = R.find(x => x.n === 'Curl Femoral Tumbado');
  ok(ext && ext.r === '15-20' && ext.rx === '15-20', 'con tus datos: el rango del coach para bombeo (15-20), no el 12-16 de la IA');
  ok(cf && cf.rx === '12-16', 'sin datos tuyos aquí: se respeta el de tu IA');
  noErr(p); await p.done();
}

/* ---------- 8. Crear entreno para completar ---------- */
console.log('8. Crear entreno para completar (tu semana)');
/* Números inventados con la misma forma que el caso real (el repositorio es público): un día, 7 músculos cortos, un ejercicio con el peso bajado a mitad */
const WEEK = { cuad: 17, glu: 14, homb: 8, pecho: 7, esp: 6.5, tri: 7, isq: 8, bic: 5.5, pant: 2.5 };
const LASTW = SES('ult', 2, 'fuerza', [['Curl Bíceps', [[17.5, 8], [12.5, 10], [12.5, 10]]], ['Curl Femoral Tumbado', [[40, 12], [40, 12], [40, 11]]], ['Remo Sentado con Cable', [[55, 9], [55, 9], [55, 9]]], ['Press de Banca en Smith', [[35, 10], [35, 10], [35, 9]]], ['Tríceps Polea', [[27.5, 12], [27.5, 10], [27.5, 8]]], ['Elevación de Talones en Hack', [[45, 15], [45, 15]]], ['Elevación de Talones en Smith', [[35, 15]]], ['Elevaciones Laterales', [[7, 15], [7, 15]]]]);
const stubWeek = p => p.evaluate(W => { wcVolume = () => ({ rows: Object.keys(W).map(k => ({ k, t: W[k], st: W[k] < WC_MIN ? 'low' : W[k] > WC_MAX ? 'high' : 'ok' })), dl: false, pend: [] }); }, WEEK);
{
  const p = await open({ native: true, sessions: [LASTW], plans: [PLAN('fuerza', [X('Prensa 45°', 3, 80)])] });
  const names = await p.evaluate(() => ['Curl Bíceps', 'Curl Femoral Tumbado', 'Remo Sentado con Cable', 'Press de Banca en Smith', 'Tríceps Polea', 'Elevación de Talones en Hack', 'Elevación de Talones en Smith'].map(n => [n, !!libFind(n) && libFind(n).name]));
  ok(names.every(x => x[1] === x[0]), 'los nombres de la prueba son del catálogo: ' + names.filter(x => x[1] !== x[0]).map(x => x[0]).join(', '));
  await stubWeek(p);
  for (const kind of ['bombeo', 'fuerza']) {
    const B = await p.evaluate(k => { wc.kind = k; wc.where = 'gym'; const B = wcBuild(k, 0); return { list: B.list.map(e => ({ n: e.name, s: e.sets, w: e.weight, r: e.repsMin + '-' + e.repsMax, rir: e.rirT.join(','), z: e.wcZ, why: e.g2Why, t: pgTypeOf(e.name) })), left: B.left, min: B.min }; }, kind);
    console.log(`\n      ENTRENO PARA COMPLETAR · ${kind === 'fuerza' ? 'Fuerza' : 'Bombeo'} (≈ ${B.min} min)`);
    B.list.forEach(e => console.log(`      ${e.n} · ${e.s} × ${e.r} · ${e.w} kg · RIR ${e.rir}\n         ${e.why}`));
    if (B.left.length) console.log('      Sin cubrir: ' + B.left.map(x => x.k + ' ' + x.n + ' (' + x.why + ')').join('; '));
    const by = z => B.list.filter(e => e.z === z);
    ok(by('pant').length <= 1, kind + ': no junta dos variantes casi iguales de talones');
    ok(by('tri').length === 1, kind + ': cubre tríceps');
    ok(['pant', 'bic', 'pecho', 'esp', 'tri', 'isq', 'homb'].every(z => by(z).length || B.left.some(x => x.k === z)), kind + ': cubre todos los que faltan, o dice cuáles quedan');
    ok(Object.keys(WEEK).every(z => by(z).reduce((a, e) => a + e.s, 0) <= 6), kind + ': máximo 6 series por músculo');
    const firstIso = B.list.findIndex(e => e.t !== 'comp'), lastComp = B.list.map(e => e.t).lastIndexOf('comp');
    ok(lastComp < firstIso || firstIso < 0, kind + ': primero los grandes');
    ok(B.list[B.list.length - 1].z === 'pant', kind + ': pantorrillas al final');
    ok(B.list.every(e => /^(1,)*1$|^(2,)*1$|^2(,2)*,1$/.test(e.rir) || /^[12](,[12])*$/.test(e.rir)), kind + ': RIR 1-2');
    ok(B.list.every(e => e.why && /^Te falta(n \d+ series| 1 serie) de /.test(e.why)), kind + ': cada uno con su razón');
    const W = n => (B.list.find(e => e.n === n) || {}).w;
    if (kind === 'bombeo') {
      ok(W('Curl Bíceps') === 12.5, 'Curl Bíceps: el peso con el que terminaste (12,5 kg), no 17,5');
      ok(W('Remo Sentado con Cable') >= 55 && W('Press de Banca en Smith') >= 35, 'Remo y Press Smith: no por debajo de lo que hiciste');
      /* Ajustes del gimnasio 4: solo hay un día pesado, así que en Bombeo cada peso sale convertido de ese día y lo dice */
      ok(B.list.every(e => /lo convertí desde tu sesión pesada/.test(e.why)), 'Bombeo sin una sesión de bombeo: cada peso dice que viene convertido del día pesado');
      const g = B.list.filter(e => e.t === 'comp').map(e => e.r), i = B.list.filter(e => e.t !== 'comp' && e.t !== 'cardio').map(e => e.r);
      ok(g.every(r => r === '8-10') && i.every(r => r === '12-15'), 'Bombeo: grandes 8-10 y aislados 12-15 (la parte alta de 6-10 y 10-15)');
    } else {
      const g = B.list.filter(e => e.t === 'comp').map(e => e.r), i = B.list.filter(e => e.t !== 'comp' && e.t !== 'cardio').map(e => e.r);
      ok(g.every(r => r === '6-8') && i.every(r => r === '10-12'), 'Fuerza: grandes 6-8 y aislados 10-12 (la parte baja)');
      ok(W('Curl Femoral Tumbado') > 40, 'Curl Femoral: hiciste 40×12, en tope del rango: sube');
    }
  }
  /* Poco tiempo: dice qué queda y que no es grave */
  await p.evaluate(() => { state.settings.prof.mins = 30; wc.kind = 'bombeo'; wc.where = 'gym'; wcFillSheet(); }); await p.waitForTimeout(200);
  const sh = await p.evaluate(() => document.getElementById('sheet').innerText);
  ok(/Quedan sin cubrir/.test(sh) && /No es grave/.test(sh), 'si el tiempo no alcanza, dice cuáles quedan y que no es grave');
  ok(/Te faltan/.test(sh) && /Gimnasio de hoy/.test(sh) && /grandes 8-10, aislados 12-15/.test(sh), 'la hoja muestra la razón, el lugar y el rango que da cada tipo');
  /* Al empezar: los mismos pesos, reps y RIR que viste */
  await p.evaluate(() => { state.settings.prof.mins = 75; wc.kind = 'bombeo'; wcFillSheet(); }); await p.waitForTimeout(150);
  const L = await p.evaluate(() => wc.list.map(e => [e.name, e.weight, e.g2Reps]));
  await act(p, '[data-wc="go"]'); await p.waitForTimeout(500);
  const D = await p.evaluate(() => state.draft.exercises.map(e => [e.name, +e.log[0].w, +e.log[0].r, e.rirT.join(',')]));
  ok(L.every(x => { const y = D.find(z => z[0] === x[0]); return y && y[1] === x[1] && y[2] === x[2]; }), 'al empezar, la sesión trae los mismos pesos y reps');
  noErr(p); await p.done();
}

/* ---------- 9. Mapa del cuerpo ---------- */
console.log('9. Mapa del cuerpo');
{
  const p = await open({ sessions: [SES('m1', 1, 'fuerza', [['Press de Banca en Smith', [[30, 10], [30, 10], [30, 10], [30, 10], [30, 10]]], ['Sentadilla Hack', Array.from({ length: 22 }, () => [50, 10])]])], plans: [PLAN('fuerza', [X('Prensa 45°', 3, 80)])] });
  await p.evaluate(() => { state.tab = 'progress'; state.progSub = 'semana'; render(); }); await p.waitForTimeout(300);
  const C = await p.evaluate(() => { const st = n => getComputedStyle(document.body).getPropertyValue(n).trim(); return { warn: st('--warn'), mm4: st('--mm4'), core: st('--core'), leg: [...document.querySelectorAll('.mm-leg span')].map(s => getComputedStyle(s.querySelector('i')).backgroundColor) }; });
  ok(C.mm4 && C.leg[4] !== C.leg[2], '"Mucho (>20)" con un color distinto de "Poco (5-9)": ' + C.leg[4] + ' frente a ' + C.leg[2]);
  const F = await p.evaluate(() => ({ t: parseFloat(getComputedStyle(document.querySelector('.mm-card .mm-svg text')).fontSize), l: parseFloat(getComputedStyle(document.querySelector('.mm-leg')).fontSize) }));
  ok(F.t >= 13 && F.l >= 13, 'Frente, Espalda y la leyenda más grandes (' + F.t + ' y ' + F.l + ' px)');
  await p.evaluate(() => { const z = document.querySelector('.mm-card .mm-svg [data-z="pecho"]'); z.dispatchEvent(new MouseEvent('click', { bubbles: true })); }); await p.waitForTimeout(100);
  const tip = await p.evaluate(() => (document.querySelector('.mm-card .g2-mmt') || {}).textContent || '');
  console.log('      al tocar el pecho: ' + tip); ok(/^Pecho: [\d,]+ de 10 series/.test(tip), 'al tocar un músculo: su nombre y sus series');
  ok(await p.evaluate(() => !/Quedan 1 día/.test(document.body.innerText)), 'nunca "Quedan 1 día"');
  await p.T(-DAY(1)); await p.evaluate(() => { render(); }); await p.waitForTimeout(200);
  ok(await p.evaluate(() => /Queda 1 día|Quedan \d+ días|Te faltan/.test(document.querySelector('.mm-card').innerText) && !/Quedan 1 día/.test(document.querySelector('.mm-card').innerText)), 'con un día: "Queda 1 día"');
  noErr(p); await p.done();
}

/* ---------- 10. De viaje ---------- */
console.log('10. Sesión de viaje');
{
  const p = await open({ native: true, sessions: [LASTW], plans: [PLAN('fuerza', [X('Prensa 45°', 3, 80)])], gyms: [{ id: 'rokaz', name: 'Gimnasio A' }, { id: 'hotel', name: 'Hotel' }] });
  await stubWeek(p);
  await p.evaluate(() => { state.settings.activeGymId = 'hotel'; delete wc.where; wc.kind = 'bombeo'; wcFillSheet(); }); await p.waitForTimeout(200);
  const R = await p.evaluate(() => ({ on: (document.querySelector('[data-g2="where"].on') || {}).dataset.v, fam: wc.list.map(e => pgFam(e.name)), n: wc.list.map(e => e.name) }));
  console.log('      sin equipos registrados: ' + R.n.join(', '));
  ok(R.on === 'bw' && R.fam.length && R.fam.every(f => /^(cuerpo|banda)$/.test(f)), 'gimnasio sin equipos registrados: solo peso corporal y bandas, sin editar el gimnasio');
  await act(p, '[data-g2="where"][data-v="casa"]'); await p.waitForTimeout(200);
  const C = await p.evaluate(() => wc.list.map(e => pgFam(e.name)));
  ok(C.every(f => /^(cuerpo|banda|manc)$/.test(f)) && C.includes('manc'), 'con tus mancuernas de casa también: ' + C.join(', '));
  ok(await p.evaluate(() => state.settings.activeGymId === 'hotel' && !(state.settings.gymNo || {}).hotel), 'el gimnasio no se cambió');
  await act(p, '[data-g2="where"][data-v="gym"]'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => (document.querySelector('[data-g2="where"].on') || {}).dataset.v === 'gym'), 'y puedes volver al gimnasio');
  noErr(p); await p.done();
}

/* ---------- Usuario nuevo y dueño sin perfil ---------- */
console.log('Usuario nuevo');
{
  const p = await open({ native: true, first: true });
  await p.evaluate(() => { closeSheet(); }); await p.waitForTimeout(200);
  const pl = await p.evaluate(() => { const P = activePlan(); return P && P.days[0] ? [P.id, P.days[0].id] : null; });
  if (pl) { await p.evaluate(([a, b]) => { startSession(a, b); render(); }, pl); await p.waitForTimeout(400); ok(await p.evaluate(() => !!state.draft && !!document.querySelector('.g2-rec,.coach,.su-coach')), 'usuario nuevo: empieza su sesión con su recomendación'); }
  await p.evaluate(() => { wc.kind = 'bombeo'; wcFillSheet(); }); await p.waitForTimeout(200);
  ok(await p.evaluate(() => !!document.querySelector('.wc-sheet')), 'usuario nuevo: crear entreno para completar abre');
  noErr(p); await p.done();
}

await browser.close();
console.log(fail ? `\n${fail} FALLA(S)` : '\nTodo OK');
process.exit(fail ? 1 : 0);
