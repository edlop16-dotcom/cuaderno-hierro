import { OWNER_SETTINGS } from './owner-fixture.mjs';
// Prueba de la rama repetir-entreno, con datos inventados. Solo teléfono; el reloj se compara con la versión anterior.
// Uso: $env:PW_DIR = "<carpeta con node_modules/playwright>"; node tests/trp.mjs <copia transpilada> [<copia anterior para comparar el reloj>]
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
const HACK = 'Sentadilla Hack', CF = 'Curl Femoral Tumbado', TAL = 'Elevación de Talones de Pie', EXT = 'Extensión de Pierna', PB = 'Press Banca con Mancuernas', REMO = 'Remo Sentado con Cable';
const SES = (id, at, kind, dayName, ex) => ({ id, date: new Date(Date.parse(at)).toISOString(), planId: 'pA', planName: 'Rutina A', dayId: 'd-' + id, dayName, gymId: 'rokaz', gymName: 'Gimnasio A', kind, durationSec: 3600, exercises: ex.map(([name, sets, ss]) => Object.assign({ name, type: 'Piernas', sets: sets.map(([w, r, rir]) => Object.assign({ w, r }, rir != null ? { rir } : {})) }, ss ? { ss } : {})) });
const HIST = [
  /* ayer: pecho al fallo (descansa hoy) */
  SES('jue', '2026-11-12T19:00:00', 'bombeo', 'Torso (Bombeo)', [[PB, [[20, 15, 0], [20, 14, 0], [20, 12, 0]]], [REMO, [[40, 15, 2]]]]),
  /* el último día pesado: de aquí sale la recomendación */
  SES('mar', '2026-11-10T19:00:00', 'fuerza', 'Piernas (Pesado)', [[HACK, [[70, 10, 2], [70, 9, 2]]], [CF, [[40, 10, 2], [40, 10, 2]]], [TAL, [[45, 12, 2]]]]),
  /* el que se repite: orden real guardado, con la superserie A (curl femoral + talones) */
  SES('lun', '2026-11-02T19:00:00', 'fuerza', 'Piernas (Pesado)', [[HACK, [[60, 12, 2], [60, 11, 2]]], [CF, [[35, 12, 2], [35, 11, 2]], 'A'], [EXT, [[30, 12, 2], [30, 12, 2]]], [TAL, [[40, 15, 2], [40, 14, 2]], 'A'], [PB, [[18, 10, 2], [18, 10, 2]]]])];
const PLANS = [{ id: 'pA', name: 'Rutina A', gymId: 'rokaz', days: [{ id: 'd1', name: 'Piernas (Pesado)', weekday: 1, kind: 'fuerza', exercises: [{ id: 'e1', name: HACK, type: 'Piernas', weight: 70, sets: 3, repsMin: 6, repsMax: 10, rest: 120 }] }] }];
const SET = () => { const s = Object.assign(structuredClone(OWNER_SETTINGS), { activePlanId: 'pA', activeGymId: 'rokaz', planByGym: { rokaz: 'pA' }, newsSeen: 'n6' }); s.prof = Object.assign({}, s.prof, { goal: 'musculo', exp: 2, mins: 75 }); return s; };
async function open({ watch, first, dir } = {}) {
  const srv = await serve(dir || DIR);
  const ctx = await browser.newContext(watch ? { viewport: { width: 410, height: 500 }, hasTouch: true } : { viewport: { width: 390, height: 844 }, hasTouch: true });
  await ctx.route(/googleapis|gstatic|google\.com|firebase|github/, r => r.abort());
  const p = await ctx.newPage(); p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message));
  await p.clock.setFixedTime(new Date(T0));
  if (!first) await p.addInitScript(([s, pl, ss]) => { if (localStorage.getItem('cdh.seeded')) return; localStorage.setItem('cdh.seeded', '1');
    localStorage.setItem('cdh.settings', JSON.stringify(s)); localStorage.setItem('cdh.plans', JSON.stringify(pl)); localStorage.setItem('cdh.sessions', JSON.stringify(ss));
    localStorage.setItem('cdh.gyms', JSON.stringify([{ id: 'rokaz', name: 'Gimnasio A' }])); localStorage.setItem('cdh.newsSeen', '"n6"'); }, [SET(), PLANS, HIST]);
  await p.goto(`http://127.0.0.1:${srv.address().port}/index.html`); await p.waitForTimeout(1500);
  if (!first) await p.evaluate(() => { state.settings.healthOk = 1; state.notifPerm = 'granted'; closeSheet(); render(); });
  p.done = async () => { await ctx.close(); srv.close(); };
  return p;
}
const noErr = p => ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
const act = (p, sel) => p.evaluate(s => { const b = document.querySelector(s); if (!b) return false; b.click(); return true; }, sel);
const summary = p => p.evaluate(() => ({ rows: [...document.querySelectorAll('#sheet .rp-ex')].map(r => r.innerText.replace(/\s+/g, ' ').trim()), off: [...document.querySelectorAll('#sheet .rp-ex.off')].length, rest: (document.querySelector('#sheet .rp-rest') || {}).innerText || '', go: (document.querySelector('#sheet [data-rp="go"]') || {}).textContent || '', goOff: !!(document.querySelector('#sheet [data-rp="go"]') || {}).disabled, kind: (document.querySelector('#sheet [data-rp="kind"].on') || {}).textContent || '', head: (document.querySelector('#sheet .rp-sheet > .muted') || {}).textContent || '' }));

console.log('1. Dueño: desde la Racha (semana anterior) → Repetir este entreno');
{
  const p = await open();
  await p.evaluate(e => gymNoSet('rokaz', libFind(e).eq, true), EXT);   /* no hay máquina de extensión en este gimnasio */
  await p.evaluate(() => { state.tab = 'train'; render(); }); await p.waitForTimeout(300);
  /* Racha → semana anterior → el entreno del lunes 2 */
  await act(p, '.streak-card.hoy-st [data-ms="wk"][data-d="1"]'); await p.waitForTimeout(250);
  await act(p, '.streak-card.hoy-st .ms-ses[data-k="2026-11-02"]'); await p.waitForTimeout(400);
  ok(await p.evaluate(() => !!document.querySelector('#sheet .rp-open[data-id="lun"]')), 'el detalle del entreno pasado tiene "Repetir este entreno"');
  /* También desde la Racha de esta semana (día con llama) */
  const k = await p.evaluate(() => { closeSheet(); daySheet('2026-11-10'); return !!document.querySelector('#sheet .rp-open[data-id="mar"]'); });
  ok(k, 'y en un día de esta semana (Racha)');
  await p.evaluate(() => { closeSheet(); daySheet('2026-11-02'); }); await p.waitForTimeout(200);
  await act(p, '#sheet .rp-open[data-id="lun"]'); await p.waitForTimeout(300);
  let S = await summary(p);
  console.log('      ' + S.rows.join('\n      '));
  ok(S.kind === 'Pesado' && /Piernas \(Pesado\)/.test(S.head), 'resumen: el tipo de ese día (Pesado), con opción de cambiarlo');
  ok(S.rows.length === 5 && /^Sentadilla Hack/.test(S.rows[0]) && /^A1 Curl Femoral/.test(S.rows[1]) && /^A2 Elevación de Talones/.test(S.rows[2]), 'mismo orden y la superserie junta (A1 curl femoral, A2 talones)');
  const C = await p.evaluate(h => { const c = pgCoach({ name: h, sets: 2 }, 'rokaz', 'fuerza'); return { w: c.w, txt: fmtKg(c.w) + ' kg × ' + c.goal[0] }; }, HACK);
  ok(S.rows[0].indexOf('Hoy: ' + C.txt) >= 0 && C.w >= 70 && /Ese día: 60×12 · 60×11/.test(S.rows[0]), 'Hack: lo de hoy sale del coach con tu último pesado (70×10 → ' + C.txt + '), y "ese día: 60×12 · 60×11" de referencia');
  ok(/No hay [a-záéíóúñ ]{4,} en Gimnasio A: va .+ en vez de Extensión de Pierna/.test(S.rows[3]) && !/No hay ext /.test(S.rows[3]), 'Extensión de Pierna (sin su máquina aquí): propone el reemplazo de siempre');
  ok(/Ayer entrenaste pecho fuerte/.test(S.rest) && /Mantener/.test(S.rest) && /Quitar/.test(S.rest), 'aviso: pecho en sus 48 h de descanso, con Mantener o Quitar');
  ok(/Empezar \(5 ejercicios\)/.test(S.go) && !S.goOff, 'Empezar (5 ejercicios)');
  /* Quitar el pecho */
  await act(p, '#sheet [data-rp="drop"][data-v="pecho"]'); await p.waitForTimeout(150); S = await summary(p);
  ok(S.off === 1 && /Quitado: pecho descansa hoy/.test(S.rows[4]) && /Empezar \(4 ejercicios\)/.test(S.go), 'Quitar: el press de banca queda fuera (4 ejercicios)');
  await act(p, '#sheet [data-rp="keep"][data-v="pecho"]'); await p.waitForTimeout(150); S = await summary(p);
  ok(S.off === 0, 'Mantener lo vuelve a poner');
  await act(p, '#sheet [data-rp="drop"][data-v="pecho"]'); await p.waitForTimeout(150);
  /* Empezar */
  const plansBefore = await p.evaluate(() => JSON.stringify(state.plans));
  await act(p, '#sheet [data-rp="go"]'); await p.waitForTimeout(800);
  const D = await p.evaluate(([h, cf, tal]) => { const d = state.draft; if (!d) return null; const g = n => d.exercises.find(e => e.name === n); return { names: d.exercises.map(e => e.name), kind: d.kind, plan: d.planId, day: d.dayName, rep: d.repFrom, ss: !!(ssOf(d, g(cf)) && ssOf(d, g(cf)) === ssOf(d, g(tal))), hackW: +g(h).log[0].w, hackN: g(h).log.length, noEq: d.exercises.filter(e => e.noEq).map(e => e.swappedFrom + '→' + e.name), ref: (document.querySelector('.sx-page[data-i="0"] .rp-cref') || {}).textContent || '', plans: JSON.stringify(state.plans) }; }, [HACK, CF, TAL]);
  console.log('      sesión: ' + (D && D.names.join(' · ')) + ' | ' + (D && D.noEq.join(', ')));
  ok(D && D.plan === 'rep' && D.rep === 'lun' && D.kind === 'fuerza' && /Piernas \(Pesado\) \(repetido\)/.test(D.day), 'empieza la sesión repetida, tipo Pesado');
  ok(D && D.names.length === 4 && D.names[0] === HACK && D.names[1] === CF && D.names[2] === TAL && D.names.indexOf(PB) < 0, 'mismos ejercicios y orden, sin el pecho que quitaste');
  ok(D && D.ss, 'curl femoral y talones siguen en superserie');
  ok(D && D.hackW === C.w && D.hackN === 2, 'Hack: el peso de la sesión es el del resumen (' + (D && D.hackW) + ' kg) y las 2 series de ese día');
  ok(D && D.noEq.length === 1 && /^Extensión de Pierna→/.test(D.noEq[0]), 'la extensión se cambió por su reemplazo, solo hoy');
  ok(D && /Ese día \(2 nov\.?\): 60×12 · 60×11/.test(D.ref), 'en la tarjeta: "Ese día (2 nov): 60×12 · 60×11"');
  ok(D && D.plans === plansBefore, 'tus rutinas no cambian (la rutina temporal se quita)');
  /* Con una sesión en marcha no se puede empezar otra */
  await p.evaluate(() => { daySheet('2026-11-02'); document.querySelector('#sheet .rp-open[data-id="lun"]').click(); }); await p.waitForTimeout(250); S = await summary(p);
  ok(S.goOff && /Ya tienes una sesión en marcha/.test(await p.evaluate(() => document.getElementById('sheet').innerText)), 'con una sesión en marcha: lo avisa y no deja empezar otra');
  /* Terminar: queda en el historial como Pesado, con su superserie */
  await p.evaluate(() => { closeSheet(); const d = state.draft; d.exercises.forEach(e => e.log.forEach(s => { s.w = s.w || 10; s.r = 10; s.rir = 2; s.done = true; s.at = Date.now(); })); finishSession(); }); await p.waitForTimeout(700);
  const F = await p.evaluate(() => { const s = state.sessions[0]; return { kind: sKind(s), plan: s.planId, n: s.exercises.length, ss: s.exercises.filter(e => e.ss).length }; });
  ok(F.plan === 'rep' && F.kind === 'fuerza' && F.n === 4 && F.ss === 2, 'al terminar: se guarda como un día pesado, con sus 4 ejercicios y la superserie');
  noErr(p); await p.done();
}

console.log('2. Cambiar el tipo de día antes de empezar');
{
  const p = await open();
  await p.evaluate(() => { daySheet('2026-11-02'); document.querySelector('#sheet .rp-open[data-id="lun"]').click(); }); await p.waitForTimeout(250);
  const A = (await summary(p)).rows[0];
  await act(p, '#sheet [data-rp="kind"][data-v="bombeo"]'); await p.waitForTimeout(200);
  const S = await summary(p), B = S.rows[0];
  const C = await p.evaluate(h => { const c = pgCoach({ name: h, sets: 2 }, 'rokaz', 'bombeo'); return fmtKg(c.w) + ' kg × ' + c.goal[0]; }, HACK);
  console.log('      Hack pesado: ' + A.replace(/.*Hoy: /, '').replace(/ Ese día.*/, '') + ' | bombeo: ' + B.replace(/.*Hoy: /, '').replace(/ Ese día.*/, ''));
  ok(S.kind === 'Bombeo' && B.indexOf('Hoy: ' + C) >= 0 && A !== B && /día bombeo/.test(await p.evaluate(() => document.getElementById('sheet').innerText)), 'Bombeo: la recomendación cambia a la regla de bombeo (' + C + ')');
  await act(p, '#sheet [data-rp="go"]'); await p.waitForTimeout(700);
  ok(await p.evaluate(() => state.draft && state.draft.kind === 'bombeo'), 'y la sesión empieza como Bombeo');
  noErr(p); await p.done();
}

console.log('3. Usuario nuevo');
{
  const p = await open({ first: true });
  await p.evaluate(() => { state.settings.onb = 1; closeSheet(); const o = document.getElementById('onb'); if (o) o.remove(); const P = activePlan(); startSession(P.id, P.days[0].id); render(); }); await p.waitForTimeout(500);
  await p.evaluate(() => { const d = state.draft; d.exercises.slice(0, 2).forEach(e => e.log.forEach(s => { s.w = 20; s.r = 10; s.done = true; s.at = Date.now(); })); finishSession(); }); await p.waitForTimeout(700);
  await p.evaluate(() => { closeSheet(); daySheet(dk(new Date())); }); await p.waitForTimeout(300);
  const id = await p.evaluate(() => { const b = document.querySelector('#sheet .rp-open'); return b && b.dataset.id; });
  ok(!!id, 'usuario nuevo: su primer entreno tiene "Repetir este entreno"');
  await act(p, '#sheet .rp-open'); await p.waitForTimeout(250);
  const S = await summary(p);
  ok(S.rows.length === 2 && S.rows.every(r => /Hoy: .* × \d+/.test(r) && /Ese día: 20×10/.test(r)), 'resumen con sus 2 ejercicios, la recomendación y "ese día"');
  await act(p, '#sheet [data-rp="go"]'); await p.waitForTimeout(700);
  ok(await p.evaluate(() => !!state.draft && state.draft.exercises.length === 2 && state.draft.planId === 'rep'), 'y la sesión empieza');
  noErr(p); await p.done();
}

console.log('4. Reloj');
{
  const p = await open({ watch: true });
  const W = await p.evaluate(() => { daySheet('2026-11-02'); return { reloj: isWatch(), btn: !!document.querySelector('#sheet .rp-open') }; });
  ok(W.reloj && !W.btn, 'reloj: el detalle del día no tiene "Repetir este entreno"');
  await p.evaluate(() => { closeSheet(); rpSheet('lun'); }); await p.waitForTimeout(150);
  ok(await p.evaluate(() => document.getElementById('sheet').hidden), 'reloj: el resumen no se abre aunque se llame');
  noErr(p); await p.done();
  if (BASE) {
    const shots = async dir => { const q = await open({ watch: true, dir }); const a = await q.screenshot(); const sh = await q.evaluate(() => { daySheet('2026-11-02'); return document.getElementById('sheet').innerHTML; }); await q.evaluate(() => { closeSheet(); startSession('pA', 'd1'); render(); }); await q.waitForTimeout(600); const b = await q.screenshot(); const e = q.errs.slice(); await q.done(); return { a, b, sh, e }; };
    const A = await shots(DIR), B = await shots(BASE);
    ok(A.a.equals(B.a) && A.sh === B.sh && A.b.equals(B.b), 'reloj: inicio, detalle del día y sesión idénticos a la versión anterior');
    ok(!A.e.length, 'reloj: sin errores de JS');
  }
}

await browser.close();
console.log(fail ? `\n${fail} FALLA(S)` : '\nTodo OK');
process.exit(fail ? 1 : 0);
