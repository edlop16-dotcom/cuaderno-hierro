import { OWNER_SETTINGS } from './owner-fixture.mjs';
// Prueba del coach por experiencia (rama coach-experiencia), con datos inventados.
// Uso (desde PowerShell): $env:PW_DIR = "<carpeta con node_modules/playwright>"; node tests/tnivel.mjs <copia transpilada>
// Principiante (nunca / menos de 6 meses), intermedio y sin dato (el sistema de siempre), avanzado (descarga cada 6-8 semanas
// si hay estancamiento), usuario nuevo por la bienvenida, dueño sin perfil y reloj.
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
const NOW = '2026-10-25T10:00:00';
let N = 0;
const X = (name, type, sets, w) => ({ id: 'x' + (++N), name, type, weight: w, sets, repsMin: 10, repsMax: 12, rest: 90 });
const PLANS = [{ id: 'p1', name: 'Rutina de prueba', gymId: 'rokaz', days: [
  { id: 'd1', name: 'Cuerpo completo (Pesado)', weekday: 1, kind: 'fuerza', exercises: [X('Prensa 45°', 'Piernas', 5, 100), X('Press Banca Plano (Barra)', 'Empuje', 4, 40), X('Curl Bíceps', 'Tracción', 3, 10), X('Extensión de Pierna', 'Piernas', 3, 30)] }] }];
const GYMS = [{ id: 'rokaz', name: 'Gimnasio A' }];
const S = (w, reps, rir) => reps.map((r, k) => ({ w, r, rir: Array.isArray(rir) ? rir[k] : rir }));
const SS = (id, date, ex) => ({ id, date: new Date(date).toISOString(), planId: 'p1', planName: '', dayId: 'd1', dayName: 'x', gymId: 'rokaz', gymName: 'Gimnasio A', kind: 'fuerza', durationSec: 3600, exercises: ex.map(([name, sets]) => ({ name, type: 'Piernas', sets })) });
const daysAgo = n => new Date(new Date(NOW).getTime() - n * 864e5).toISOString().slice(0, 16);
const SET = (prof, extra) => { const s = Object.assign(structuredClone(OWNER_SETTINGS), { activePlanId: 'p1', activeGymId: 'rokaz', planByGym: { rokaz: 'p1' }, newsSeen: 'n6' }, extra || {}); s.prof = prof === null ? undefined : Object.assign({}, s.prof, { goal: 'musculo', mins: 75 }, prof); if (prof === null) delete s.prof; return s; };

async function open({ watch, settings, sessions, first } = {}) {
  const srv = await serve(DIR);
  const ctx = await browser.newContext(watch ? { viewport: { width: 410, height: 500 }, hasTouch: true } : { viewport: { width: 390, height: 844 }, hasTouch: true });
  await ctx.route(/googleapis|gstatic|google\.com|firebase|github/, r => r.abort());
  const p = await ctx.newPage(); p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message));
  await p.clock.setFixedTime(new Date(NOW));
  if (!first) await p.addInitScript(([s, pl, ss, g]) => { if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    localStorage.setItem('cdh.settings', JSON.stringify(s)); localStorage.setItem('cdh.plans', JSON.stringify(pl)); localStorage.setItem('cdh.sessions', JSON.stringify(ss));
    localStorage.setItem('cdh.gyms', JSON.stringify(g)); localStorage.setItem('cdh.newsSeen', '"n6"'); localStorage.setItem('cdh.reminders', '[]'); }, [settings, PLANS, sessions || [], GYMS]);
  await p.goto(`http://127.0.0.1:${srv.address().port}/index.html`); await p.waitForTimeout(1800);
  if (!first) await p.evaluate(() => { state.settings.healthOk = 1; closeSheet(); render(); });
  p.done = async () => { await ctx.close(); srv.close(); };
  return p;
}
const noErr = p => ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
const CO = (p, name, kind = 'fuerza', sets = 3) => p.evaluate(([name, kind, sets]) => { const c = pgCoach({ name, sets, type: typeOf(name), weight: 0 }, 'rokaz', kind); return { w: c.w, mode: c.mode, why: c.why, goal: c.goal[0], rx: c.rx, rir: c.rirT, n: c.n }; }, [name, kind, sets]);
const card = p => p.evaluate(() => { state.tab = 'train'; render(); const c = document.querySelector('.pg-dl'); return c ? c.textContent : ''; });

/* Prensa (pesado 6-10, RIR 1-3) y Curl (pesado 8-12, RIR 0-2 → 2 para principiante) */
const TOP = [SS('s1', daysAgo(3), [['Prensa 45°', S(100, [10, 10, 10], 2)], ['Curl Bíceps', S(10, [12, 12, 12], 2)], ['Press Banca Plano (Barra)', S(40, [10, 9, 8], 3)], ['Extensión de Pierna', S(30, [12, 12, 12], 1)]])];

for (const exp of [0, 1]) {
  console.log(`A${exp}. Principiante (experiencia ${exp})`);
  const p = await open({ settings: SET({ exp }), sessions: TOP });
  const curlF = await CO(p, 'Curl Bíceps'), curlB = await CO(p, 'Curl Bíceps', 'bombeo'), pr = await CO(p, 'Prensa 45°'), prB = await CO(p, 'Prensa 45°', 'bombeo');
  ok(curlF.rx.rirMin === 2 && curlB.rx.rirMin === 2 && pr.rx.rirMin === 2 && prB.rx.rirMin === 2, `RIR mínimo 2 en todos los tipos (aislamiento pesado y bombeo, compuesto)`);
  ok([curlF, curlB, pr, prB].every(c => c.rir.every(x => x >= 2)), `ninguna serie pide menos de RIR 2 (Curl ${curlB.rir.join(',')}, Prensa ${pr.rir.join(',')})`);
  ok(await p.evaluate(() => [0, 1, 2, 3].every(j => rirTarget(j) >= 2)), 'el RIR que se muestra por serie tampoco baja de 2');
  ok(pr.mode === 'up' && pr.w > 100, `sube: completó 6-10 en todas las series aunque con RIR 2 → ${pr.w} kg · ${pr.why}`);
  ok(curlF.mode === 'up', `sube en aislamiento: 10×12 en las tres series → ${curlF.w} kg`);
  const inc = await CO(p, 'Press Banca Plano (Barra)');
  ok(inc.mode === 'hold' && inc.w === 40, `no sube si no completó (10, 9, 8) aunque la 1.ª serie llegara al tope · ${inc.why}`);
  const fallo = await CO(p, 'Extensión de Pierna');
  ok(fallo.mode === 'hold' && fallo.w === 30 && /fallo/.test(fallo.why), `no sube si completó yendo más cerca del fallo que RIR 2 · ${fallo.why}`);
  const big = await CO(p, 'Prensa 45°', 'fuerza', 5);
  ok(big.n === 3, `máximo 3 series aunque la rutina diga 5 (${big.n})`);
  const ses = await p.evaluate(() => { state.settings.nextS = { d1: { pick: 'plan' } }; startSession('p1', 'd1'); const d = state.draft, n = d.exercises.map(e => e.log.length), rir = d.exercises.map(e => e.rirT.join('')); discardSession(); return { n, rir, saved: state.plans[0].days[0].exercises[0].sets }; });
  ok(ses.n.every(x => x <= 3) && ses.saved === 5, `la sesión empieza con máximo 3 series (${ses.n.join(',')}) y la rutina guardada no cambia (${ses.saved})`);
  ok(ses.rir.every(t => /^[2-3]+$/.test(t)), `las series de la sesión piden RIR 2 o más (${ses.rir.join(' ')})`);
  const pl = await p.evaluate(() => { state.tab = 'plans'; state.rtOpen = { d1: true }; render(); const b = document.querySelector('.rt-exm small'); return { t: b ? b.textContent : '', est: pgDayEst(state.plans[0].days[0]) }; });
  ok(/· 3 × /.test(pl.t), `Mi plan muestra 3 series: ${pl.t.trim().slice(0, 60)}`);
  ok(/Reglas de principiante/.test(await p.evaluate(() => pgSystemTxt())), 'las exportaciones explican las reglas de principiante');
  noErr(p); await p.done();
}

console.log('B. Principiante: descarga');
{
  /* Dos ejercicios dos veces bajo el mínimo */
  const LOW = a => [SS('l2', daysAgo(a), [['Prensa 45°', S(100, [3, 3, 3], 2)], ['Curl Bíceps', S(10, [4, 4, 4], 2)]]), SS('l1', daysAgo(a + 3), [['Prensa 45°', S(100, [3, 3, 3], 2)], ['Curl Bíceps', S(10, [4, 4, 4], 2)]])];
  const early = await open({ settings: SET({ exp: 0 }), sessions: LOW(3).concat([SS('l0', daysAgo(30), [['Prensa 45°', S(90, [8, 8, 8], 3)]])]) });
  ok(!(await card(early)), 'semana 4 con estancamiento: sin tarjeta de descarga');
  const D = await early.evaluate(() => { const m = state.settings.meso = { on: true, weeks: 5, start: dk(new Date(weekStartOf(new Date()).getTime() - 4 * 7 * 864e5 + 3 * 36e5)), n: 1 }; void m; return { I: mesoInfo(), sig: fatigueSigns().length, st: stallCard() }; });
  ok(D.I.wk === 4 && !D.I.deload, `el bloque llega a su semana de descarga (semana ${D.I.wk + 1}) pero no descarga en las primeras 8 semanas`);
  ok(!D.sig && !D.st, 'tampoco salen los avisos de fatiga ni de estancamiento que proponen descarga');
  const se = await early.evaluate(() => { state.settings.nextS = { d1: { pick: 'plan' } }; startSession('p1', 'd1'); const d = state.draft, o = { n: d.exercises.map(e => e.log.length), m: d.meso }; discardSession(); return o; });
  ok(se.n[0] === 3 && !se.m.deload, `la sesión no parte las series a la mitad (${se.n.join(',')})`);
  const plus = await early.evaluate(() => { state.settings.meso.start = dk(new Date(weekStartOf(new Date()).getTime() - 3 * 7 * 864e5 + 3 * 36e5)); const I = mesoInfo(); state.settings.nextS = { d1: { pick: 'plan' } }; startSession('p1', 'd1'); const n = state.draft.exercises.map(e => e.log.length); discardSession(); return { plus: I.plus, n, rir: I.rir }; });
  ok(!plus.plus && plus.n.every(x => x <= 3) && plus.rir >= 2, `las semanas finales del bloque no suman la serie extra (${plus.n.join(',')})`);
  noErr(early); await early.done();
  const late = await open({ settings: SET({ exp: 0 }), sessions: LOW(3).concat([SS('l0', daysAgo(60), [['Prensa 45°', S(90, [8, 8, 8], 3)]])]) });
  ok(/no llegaron al mínimo/.test(await card(late)), 'semana 9: ya puede proponer la descarga');
  noErr(late); await late.done();
}

console.log('C. Salud y energía o Movilidad con principiante');
{
  const p = await open({ settings: SET({ exp: 1, goal: 'salud' }), sessions: [SS('h1', daysAgo(3), [['Prensa 45°', S(100, [15, 15, 15], 3)]])] });
  const c = await CO(p, 'Prensa 45°');
  ok(c.mode === 'up', `Salud: la regla de experiencia manda: sube tras una sola sesión completa · ${c.why}`);
  noErr(p); await p.done();
  const q = await open({ settings: SET({ exp: 1, goal: 'mayor' }), sessions: [SS('h1', daysAgo(3), [['Press Banca Plano (Barra)', S(40, [20, 20, 20], 3)]])] });
  const m = await CO(q, 'Press Banca Plano (Barra)');
  ok(m.mode === 'up' && m.w === 42.5, `Movilidad: sigue subiendo 2,5 kg como máximo (${m.w} kg)`);
  noErr(q); await q.done();
}

console.log('D. Intermedio y sin dato: el sistema de siempre');
{
  const out = {};
  for (const [k, s] of [['exp2', SET({ exp: 2 })], ['sinexp', SET({ exp: undefined })], ['sinprof', SET(null)]]) {
    const p = await open({ settings: s, sessions: TOP });
    out[k] = await p.evaluate(() => ['Prensa 45°', 'Curl Bíceps', 'Press Banca Plano (Barra)', 'Extensión de Pierna'].map(n => ['fuerza', 'bombeo'].map(k => { const c = pgCoach({ name: n, sets: 5, type: typeOf(n), weight: 0 }, 'rokaz', k); return [c.w, c.mode, c.n, c.rx.rirMin, c.rx.rirMax, c.rirT.join(''), c.why]; })));
    out[k + 't'] = await p.evaluate(() => /Experiencia/.test(pgSystemTxt()));
    out[k + 'r'] = await p.evaluate(() => [0, 1, 2].map(j => rirTarget(j)).join(''));
    noErr(p); await p.done();
  }
  ok(JSON.stringify(out.exp2) === JSON.stringify(out.sinexp) && JSON.stringify(out.exp2) === JSON.stringify(out.sinprof), 'intermedio, sin experiencia y sin perfil reciben exactamente lo mismo');
  ok(out.exp2[0][0][2] === 5, 'respeta las 5 series de la rutina');
  ok(out.exp2[0][0][1] === 'hold' && out.exp2[2][0][1] === 'up', 'sigue decidiendo con la 1.ª serie y el RIR (Prensa RIR 2 mantiene; Press 10@3 sube aunque las otras bajen)');
  ok(!out.exp2t && !out.sinexpt && !out.sinproft, 'las exportaciones no agregan nada');
  ok(out.exp2r === out.sinexpr, `RIR por serie sin cambios (${out.exp2r})`);
}

console.log('E. Avanzado: descarga cada 6-8 semanas si hay estancamiento');
{
  /* Tres sesiones sin mejorar dentro del rango (no bajo el mínimo: la tarjeta de siempre no sale) */
  const PLAT = [3, 6, 9, 12].map((a, i) => SS('e' + i, daysAgo(a), [['Prensa 45°', S(100, [8, 8, 8], 2)], ['Curl Bíceps', S(10, [10, 10, 10], 1)]]));
  const old = SS('e9', daysAgo(50), [['Prensa 45°', S(90, [8, 8, 8], 2)]]);
  const OFF = { meso: { on: false, weeks: 5, start: '2026-01-05', n: 1 } };
  let p = await open({ settings: SET({ exp: 3 }, OFF), sessions: PLAT.concat([old]) });
  const t = await card(p);
  ok(/7 semanas sin descarga/.test(t) && /Prensa/.test(t) && /Curl/.test(t), `7 semanas y estancado: propone la descarga · ${t.trim().slice(0, 90)}`);
  ok(/descarga sugerida cada 6-8 semanas/.test(await p.evaluate(() => pgSystemTxt())), 'las exportaciones lo explican');
  const acc = await p.evaluate(() => { document.querySelector('[data-pg="dl-on"]').click(); const n = pgDlNow(), c = pgCoach({ name: 'Prensa 45°', sets: 4, type: 'Piernas' }, 'rokaz', 'fuerza'); return { n, w: c.w, rir: c.rirT }; });
  ok(acc.n && acc.w < 100 && acc.rir.every(x => x === 3), `aceptada: −10 % y RIR 3 (${acc.w} kg)`);
  noErr(p); await p.done();
  p = await open({ settings: SET({ exp: 3 }, OFF), sessions: PLAT });
  ok(!(await card(p)), 'menos de 6 semanas entrenando: no la propone'); noErr(p); await p.done();
  p = await open({ settings: SET({ exp: 3 }, Object.assign({ pgDl: '2026-10-05' }, OFF)), sessions: PLAT.concat([old]) });
  ok(!(await card(p)), 'descarga hace 3 semanas: no la propone otra vez'); noErr(p); await p.done();
  p = await open({ settings: SET({ exp: 3 }, Object.assign({ pgDl: '2026-09-07' }, OFF)), sessions: PLAT.concat([old]) });
  ok(/semanas sin descarga/.test(await card(p)), 'descarga hace 7 semanas: la vuelve a proponer'); noErr(p); await p.done();
  p = await open({ settings: SET({ exp: 3 }, OFF), sessions: PLAT.slice(0, 3).concat([SS('e8', daysAgo(12), [['Prensa 45°', S(80, [8, 8, 8], 2)], ['Curl Bíceps', S(8, [10, 10, 10], 1)]]), old]) });
  ok(!(await card(p)), 'si sigue mejorando, no la propone'); noErr(p); await p.done();
  p = await open({ settings: SET({ exp: 3, goal: 'grasa' }, OFF), sessions: PLAT.concat([old]) });
  ok(!(await card(p)), 'Perder grasa: sin descarga por eso, como siempre'); noErr(p); await p.done();
  p = await open({ settings: SET({ exp: 3 }, { meso: { on: true, weeks: 5, start: '2026-10-12', n: 1 } }), sessions: PLAT.concat([old]) });
  ok(!(await card(p)), 'con los Bloques activos no se repite: ya traen su descarga'); noErr(p); await p.done();
  p = await open({ settings: SET({ exp: 2 }, OFF), sessions: PLAT.concat([old]) });
  ok(!(await card(p)), 'intermedio con los mismos datos: no aparece'); noErr(p); await p.done();
}

console.log('F. Usuario nuevo por la bienvenida');
{
  const p = await open({ first: true });
  const r = await p.evaluate(() => {
    const out = [];
    for (const exp of [0, 1, 2, 3]) for (const goal of Object.keys(PB_GOALS)) for (const equip of Object.keys(PB_EQ)) for (const days of [2, 3, 4, 5, 6]) {
      const plan = genPlan({ goal, exp, days, mins: 60, equip, inj: [] });
      out.push([exp, Math.max.apply(null, plan.days.map(d => Math.max.apply(null, d.exercises.map(e => +e.sets))))]);
    }
    return out;
  });
  const worst = e => Math.max(...r.filter(x => x[0] === e).map(x => x[1]));
  ok(worst(0) <= 3 && worst(1) <= 3, `las rutinas nuevas de principiante traen máximo 3 series (nunca: ${worst(0)}, menos de 6 meses: ${worst(1)})`);
  noErr(p); await p.done();
  const q = await open({ settings: Object.assign(SET({ exp: 0, goal: 'salud', equip: 'gym', days: 3 }), { owner: 0 }), sessions: [] });
  const c = await CO(q, 'Prensa 45°');
  ok(c.rx.rirMin >= 2 && c.mode === 'first', `primera sesión de un principiante: ${c.why}`);
  ok(await q.evaluate(() => { state.tab = 'train'; render(); return !!document.querySelector('#app .hoy-hero, #app #btn-start'); }), 'Hoy se dibuja');
  noErr(q); await q.done();
}

console.log('G. Dueño sin perfil y reloj');
{
  const p = await open({ settings: SET(null), sessions: TOP });
  ok(await p.evaluate(() => pgExp() === null && !pgNov() && !pgNoDl()), 'sin perfil: no se supone ningún nivel');
  ok(await p.evaluate(() => state.settings.prof === undefined), 'y no se crea un perfil');
  noErr(p); await p.done();
  const w = await open({ watch: true, settings: SET({ exp: 2 }), sessions: TOP });
  const W = await w.evaluate(() => { state.settings.nextS = { d1: { pick: 'plan' } }; startSession('p1', 'd1'); render(); const d = state.draft; return { w: isWatch(), n: d.exercises.map(e => e.log.length).join(','), rest: d.exercises.every(e => e.rest === pgRx(e.name, d.kind).rest), ov: !!document.getElementById('w2-ov') }; });
  ok(W.w && W.n === '5,4,3,3' && W.rest && W.ov, `reloj, intermedio: igual que siempre (${W.n} series)`);
  noErr(w); await w.done();
  const v = await open({ watch: true, settings: SET({ exp: 0 }), sessions: TOP });
  const V = await v.evaluate(() => { state.settings.nextS = { d1: { pick: 'plan' } }; startSession('p1', 'd1'); render(); const d = state.draft; return { w: isWatch(), n: d.exercises.map(e => e.log.length).join(','), ov: !!document.getElementById('w2-ov') }; });
  ok(V.w && V.n === '3,3,3,3' && V.ov, `reloj, principiante: la pantalla es la misma y recibe las series del coach (${V.n})`);
  noErr(v); await v.done();
}

await browser.close();
console.log(fail ? `\n${fail} FALLAS` : '\nTodo OK');
process.exit(fail ? 1 : 0);
