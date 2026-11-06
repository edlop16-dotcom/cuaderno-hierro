import { OWNER_SETTINGS } from './owner-fixture.mjs';
// Prueba de las mejoras del entrenamiento (rama mejoras-entrenamiento), con datos inventados.
// Uso (desde PowerShell): $env:PW_DIR = "<carpeta con node_modules/playwright>"; node tests/tmejoras.mjs <copia transpilada>
// 1. Últimas series por gimnasio (dos gimnasios). 2. Ejercicios agregados a mano y cerrar la app a mitad de sesión.
// 3. Orden real, historial, exportaciones y sesiones antiguas. 4. Deslizar después del RIR y superseries. Dueño, nuevo y reloj.
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

/* ---------- Datos inventados: Gimnasio A (rokaz) y Gimnasio B (raydac) ---------- */
const NOW = '2026-10-25T10:00:00';
let N = 0;
const X = (name, type, sets, w) => ({ id: 'x' + (++N), name, type, weight: w, sets, repsMin: 8, repsMax: 12, rest: 90 });
const planB = () => ({ id: 'pB', name: 'Rutina B', gymId: 'raydac', days: [{ id: 'dB', name: 'Cuerpo completo (Pesado)', weekday: 0, kind: 'fuerza', exercises: [X('Prensa 45°', 'Piernas', 2, 80), X('Press Banca Plano (Barra)', 'Empuje', 2, 40), X('Extensión de Pierna', 'Piernas', 2, 30), X('Flexiones', 'Empuje', 2, 0)] }, { id: 'dB2', name: 'Otro día', weekday: 3, kind: 'fuerza', exercises: [X('Curl Bíceps', 'Tracción', 3, 10)] }] });
const planA = () => ({ id: 'pA', name: 'Rutina A', gymId: 'rokaz', days: [{ id: 'dA', name: 'Piernas (Pesado)', weekday: 1, kind: 'fuerza', exercises: [X('Prensa 45°', 'Piernas', 3, 150)] }] });
const GYMS = [{ id: 'rokaz', name: 'Gimnasio A' }, { id: 'raydac', name: 'Gimnasio B' }];
const S = (w, reps, rir = 2) => reps.map(r => ({ w, r, rir }));
const SS = (id, date, gymId, ex, kind = 'fuerza') => ({ id, date: new Date(date).toISOString(), planId: gymId === 'rokaz' ? 'pA' : 'pB', planName: '', dayId: gymId === 'rokaz' ? 'dA' : 'dB', dayName: 'x', gymId, gymName: gymId === 'rokaz' ? 'Gimnasio A' : 'Gimnasio B', kind, durationSec: 3600, exercises: ex.map(([name, sets]) => ({ name, type: 'Piernas', sets })) });
const SESS = [
  SS('b1', '2026-10-22T19:00', 'raydac', [['Prensa 45°', S(90, [9, 8])]]),
  SS('a1', '2026-10-20T19:00', 'rokaz', [['Prensa 45°', S(150, [10, 10])], ['Press Banca Plano (Barra)', S(60, [8, 8])]]),
];
const SET = extra => { const s = Object.assign(structuredClone(OWNER_SETTINGS), { activePlanId: 'pB', activeGymId: 'raydac', planByGym: { rokaz: 'pA', raydac: 'pB' }, newsSeen: 'n6' }, extra || {}); s.prof = Object.assign({}, s.prof, { goal: 'musculo', mins: 75 }); return s; };

async function open({ watch, settings, sessions, plans, first, ctx: keep } = {}) {
  const srv = await serve(DIR);
  const ctx = keep || await browser.newContext(watch ? { viewport: { width: 410, height: 500 }, hasTouch: true } : { viewport: { width: 390, height: 844 }, hasTouch: true });
  await ctx.route(/googleapis|gstatic|google\.com|firebase|github/, r => r.abort());
  const p = await ctx.newPage(); p.errs = []; p.ctx = ctx;
  p.on('pageerror', e => p.errs.push(e.message));
  await p.clock.setFixedTime(new Date(NOW));
  if (!first && !keep) await p.addInitScript(([s, pl, ss, g]) => { if (localStorage.getItem('cdh.seeded')) return; localStorage.setItem('cdh.seeded', '1');
    localStorage.setItem('cdh.settings', JSON.stringify(s)); localStorage.setItem('cdh.plans', JSON.stringify(pl)); localStorage.setItem('cdh.sessions', JSON.stringify(ss));
    localStorage.setItem('cdh.gyms', JSON.stringify(g)); localStorage.setItem('cdh.newsSeen', '"n6"'); localStorage.setItem('cdh.reminders', '[]'); }, [settings || SET(), plans || [planA(), planB()], sessions || SESS, GYMS]);
  await p.goto(`http://127.0.0.1:${srv.address().port}/index.html`); await p.waitForTimeout(1800);
  if (!first) await p.evaluate(() => { state.settings.healthOk = 1; closeSheet(); render(); });
  p.done = async () => { await ctx.close(); srv.close(); };
  return p;
}
const noErr = p => ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
const start = (p, plan = 'pB', day = 'dB') => p.evaluate(([plan, day]) => { state.settings.nextS = { [day]: { pick: 'plan' } }; startSession(plan, day); render(); }, [plan, day]);
const ex = (p, i) => p.evaluate(i => { const e = state.draft.exercises[i]; return { n: e.name, w: e.log.map(s => s.w), r: e.log.map(s => s.r), prev: (e.prev || []).map(s => s.w + 'x' + s.r), ref: e.refGym, date: e.lastDate, head: e.coach ? String(e.coach.head) + (e.coach.tips || []).join(' ') : '', goal: e.coach && e.coach.goal, cw: e.coach && e.coach.w, msg: e.sugg && e.sugg.msg }; }, i);

console.log('1. Últimas series del mismo ejercicio y gimnasio');
{
  const p = await open(); await start(p);
  const pr = await ex(p, 0), bn = await ex(p, 1), xt = await ex(p, 2);
  ok(pr.w.every(v => v === pr.cw) && pr.r.every((v, j) => v === pr.goal[j]), `con recomendación: los campos traen la del coach (${pr.w.join(',')} kg × ${pr.r.join(',')})`);
  ok(pr.prev.join() === '90x9,90x8' && !pr.ref, `y tu última vez en ESTE gimnasio como referencia (${pr.prev.join(', ')}; nunca los 150 kg del otro)`);
  ok(bn.w.every(v => v === '') && bn.r.every(v => v == null), `solo hecho en el otro gimnasio: campos vacíos (Press Banca: "${bn.w.join('","')}")`);
  ok(!bn.prev.length && !bn.ref && !bn.date, 'y sin ninguna referencia de otro gimnasio');
  ok(!/Gimnasio A|60/.test(bn.head + bn.msg), `el texto del coach tampoco lo menciona: ${bn.head.replace(/<[^>]+>/g, '').slice(0, 80)}`);
  ok(xt.w.every(v => v === '') && !xt.prev.length, 'nunca hecho en ningún gimnasio: campos vacíos');
  const page = await p.evaluate(() => { const c = document.querySelectorAll('#sx-pager > .sx-page')[1]; const i = c.querySelector('input[data-f="w"]'); return { txt: c.textContent, v: i.value, ph: !!i }; });
  ok(page.ph && page.v === '' && !/Referencia de|Gimnasio A/.test(page.txt), 'en pantalla: casilla vacía y sin referencia');
  const ed = await p.evaluate(() => { const i = document.getElementById('w-0-0'); i.value = '95'; i.dispatchEvent(new Event('input', { bubbles: true })); const r = document.getElementById('r-0-0'); r.value = '7'; r.dispatchEvent(new Event('input', { bubbles: true })); const s = state.draft.exercises[0].log[0]; return [s.w, s.r]; });
  ok(+ed[0] === 95 && +ed[1] === 7, 'puedes editar peso y reps');
  const blk = await p.evaluate(() => { markSet(1, 0); const a = state.draft.exercises[1].log[0].done; const t = (document.querySelector('#toast') || {}).textContent || ''; const i = document.getElementById('w-1-0'); i.value = '45'; i.dispatchEvent(new Event('input', { bubbles: true })); markSet(1, 0); return { a, t, b: state.draft.exercises[1].log[0].done }; });
  ok(!blk.a && /peso/.test(blk.t) && blk.b, `peso vacío: pide escribirlo en vez de guardar 0 kg ("${blk.t}") y después marca`);
  const bw = await p.evaluate(() => { markSet(3, 0); const s = state.draft.exercises[3].log[0]; return { done: s.done, r: s.r }; });
  ok(bw.done && bw.r > 0, `peso corporal: se marca sin escribir kilos (reps ${bw.r})`);
  const fin = await p.evaluate(() => { markSet(0, 0); const id = state.draft.id; finishSession(); const s = state.sessions.find(x => x.id === id); return s.exercises.map(e => e.name + ':' + e.sets.map(x => x.w + 'x' + x.r).join()); });
  ok(fin.includes('Prensa 45°:95x7') && fin.some(x => /^Press Banca.*:45x/.test(x)), `se guarda lo que escribiste: ${fin.join(' · ')}`);
  noErr(p); await p.done();

  const q = await open(); await start(q);
  const nc = await q.evaluate(() => { const d = state.draft, e = d.exercises[0]; delete e.coach; delete e.mjF; e.log.forEach(s => { s.r = null; }); mjFill(d, e); return e.log.map(s => s.w + 'x' + s.r); });
  ok(nc.join() === '90x9,90x8', `sin recomendación del coach: tu última vez en este gimnasio (${nc.join(', ')})`);
  noErr(q); await q.done();
  const a = await open({ settings: SET({ activePlanId: 'pA', activeGymId: 'rokaz' }) }); await start(a, 'pA', 'dA');
  const pa = await ex(a, 0);
  ok(pa.prev[0] === '150x10' && pa.w[0] >= 140, `el mismo ejercicio en el otro gimnasio usa lo suyo (${pa.prev.join(', ')})`);
  noErr(a); await a.done();
  const o = await open();
  const old = await o.evaluate(() => { state.settings.nextS = { dB: { pick: 'plan' } }; startSession('pB', 'dB'); const d = state.draft; delete d.mj; d.exercises.forEach(e => { delete e.mjF; e.log.forEach(s => { s.w = 33; s.r = null; }); }); saveDraft(); render(); return d.exercises[1].log.map(s => s.w + ':' + s.r).join(); });
  ok(old === '33:null,33:null', 'una sesión ya empezada antes de esta versión no se toca'); noErr(o); await o.done();
}

console.log('2. Ejercicios agregados a mano');
{
  const p = await open(); await start(p);
  const before = await p.evaluate(() => JSON.stringify(state.plans.find(x => x.id === 'pA')) + JSON.stringify(state.plans.find(x => x.id === 'pB').days[1]));
  const A = await p.evaluate(() => { const ids = state.plans[1].days[0].exercises.map(e => e.id); addToDraft(['Curl Bíceps'], 0); const day = state.plans[1].days[0], e = state.draft.exercises[1]; return { names: day.exercises.map(x => x.name), same: ids.every(id => day.exercises.some(x => x.id === id)), exId: e.exId === day.exercises[1].id, cur: state.draft.cur, sets: day.exercises[1].sets }; });
  ok(A.names.join() === 'Prensa 45°,Curl Bíceps,Press Banca Plano (Barra),Extensión de Pierna,Flexiones', `en el lugar donde lo agregaste: ${A.names.join(' · ')}`);
  ok(A.same && A.exId, 'los demás no cambian y la sesión queda enlazada con la rutina');
  const B = await p.evaluate(() => { addToDraft(['Curl Bíceps'], 3); return state.plans[1].days[0].exercises.filter(x => x.name === 'Curl Bíceps').length; });
  ok(B === 1, 'no se duplica');
  const C = await p.evaluate(() => { addToDraft(['Elevación Lateral con Mancuernas', 'Sentadilla Hack'], state.draft.exercises.length - 1); return state.plans[1].days[0].exercises.map(x => x.name).slice(-3); });
  ok(C.join() === 'Flexiones,Elevación Lateral con Mancuernas,Sentadilla Hack', `al final y en el orden elegido: ${C.join(' · ')}`);
  ok(await p.evaluate(b => JSON.stringify(state.plans.find(x => x.id === 'pA')) + JSON.stringify(state.plans.find(x => x.id === 'pB').days[1]) === b, before), 'las otras rutinas y días quedan igual');
  const empty = await ex(p, 1);
  ok(empty.w.every(v => v === ''), 'el agregado también sigue la regla: sin datos aquí, campos vacíos');
  /* Cerrar la app a mitad de sesión */
  await p.reload(); await p.waitForTimeout(1800);
  const R = await p.evaluate(() => ({ n: state.plans[1].days[0].exercises.filter(x => x.name === 'Curl Bíceps').length, d: state.draft && state.draft.exercises.map(e => e.name).join(), pos: state.plans[1].days[0].exercises[1].name }));
  ok(R.n === 1 && R.pos === 'Curl Bíceps' && /Curl Bíceps/.test(R.d), 'cerrar la app a mitad: sigue en la rutina y en la sesión');
  const D = await p.evaluate(() => { discardSession(); return state.plans[1].days[0].exercises.some(x => x.name === 'Curl Bíceps'); });
  ok(D, 'si descartas o terminas antes, no se pierde');
  const nx = await p.evaluate(() => { state.settings.nextS = { dB: { pick: 'plan' } }; startSession('pB', 'dB'); const n = state.draft.exercises.map(e => e.name); discardSession(); return n; });
  ok(nx[1] === 'Curl Bíceps', `la próxima vez sale en su lugar: ${nx.slice(0, 3).join(' · ')}`);
  noErr(p); await p.done();

  const q = await open();
  const T = await q.evaluate(() => { const n0 = JSON.stringify(state.plans); const plan = { id: 'quick', name: 'Entreno rápido', gymId: 'raydac', quick: 1, days: [{ id: 'q1', name: 'Rápido', weekday: 0, kind: 'fuerza', exercises: [Object.assign(newEx('Prensa 45°', 'fuerza'), { sets: 2 })] }] }; state.plans.push(plan); state.settings.nextS = { q1: { pick: 'plan' } }; startSession('quick', 'q1'); addToDraft(['Curl Bíceps'], 0); const has = plan.days[0].exercises.length; discardSession(); state.plans.pop(); return { has, same: JSON.stringify(state.plans) === n0 }; });
  ok(T.has === 1 && T.same, 'Entreno rápido: lo agregado sigue siendo solo de hoy');
  noErr(q); await q.done();
  const w = await open({ watch: true }); await start(w);
  const W = await w.evaluate(() => { addToDraft(['Curl Bíceps'], 0); return { w: isWatch(), day: state.plans[1].days[0].exercises.length, dr: state.draft.exercises.length, mj: !!state.draft.mj }; });
  ok(W.w && W.day === 4 && W.dr === 5 && !W.mj, 'reloj: agregar sigue siendo solo para hoy, como siempre');
  noErr(w); await w.done();
}

console.log('3. Orden real de la sesión');
{
  const p = await open(); await start(p);
  const at = t => p.clock.setFixedTime(new Date(t));
  await p.evaluate(() => { state.draft.exercises.forEach(e => e.log.forEach(s => { if (s.w === '') s.w = 20; })); });
  await at('2026-10-25T10:05:00'); await p.evaluate(() => markSet(2, 0));
  await at('2026-10-25T10:10:00'); await p.evaluate(() => markSet(0, 0));
  await at('2026-10-25T10:15:00'); await p.evaluate(() => markSet(3, 0));
  await at('2026-10-25T10:20:00'); await p.evaluate(() => markSet(2, 1));
  const live = await p.evaluate(() => exDraftSession().exercises.map(e => e.name));
  ok(live.join() === 'Extensión de Pierna,Prensa 45°,Flexiones', `exportar a mitad de sesión: ${live.join(' · ')}`);
  const draftSame = await p.evaluate(() => state.draft.exercises[0].name);
  ok(draftSame === 'Prensa 45°', 'la pantalla de la sesión no se reordena');
  const F = await p.evaluate(() => { const id = state.draft.id, before = JSON.stringify(state.plans); finishSession(); const s = state.sessions.find(x => x.id === id); return { n: s.exercises.map(e => e.name), plan: JSON.stringify(state.plans) === before || state.plans[1].days[0].exercises.map(e => e.name), txt: sessionPrompt([s]), line: aixSessLine(s), week: (aixWeekText(0) || {}).txt || '' }; });
  ok(F.n.join() === 'Extensión de Pierna,Prensa 45°,Flexiones', `guardado en el orden real, por la primera serie: ${F.n.join(' · ')}`);
  const order = (t, a, b) => t.indexOf(a) >= 0 && t.indexOf(a) < t.indexOf(b);
  ok(order(F.line, 'Extensión de Pierna', 'Prensa 45°'), 'exportación de sesión en ese orden');
  ok(order(F.txt, 'Extensión de Pierna', 'Prensa 45°'), 'exportación para la IA en ese orden');
  const plan = await p.evaluate(() => state.plans[1].days[0].exercises.map(e => e.name));
  ok(plan[0] === 'Prensa 45°' && plan[1] === 'Press Banca Plano (Barra)', `la rutina no cambia de orden: ${plan.slice(0, 3).join(' · ')}`);
  const sec = F.week.slice(F.week.indexOf('MIS SESIONES')), wk = sec.slice(sec.indexOf('2026-10-25')); console.log('      semana: ' + wk.slice(0, 260).split('\n').join(' ⏎ '));
  ok(wk.indexOf('Extensión de Pierna') > 0 && wk.indexOf('Extensión de Pierna') < wk.indexOf('Prensa 45°') && wk.indexOf('Prensa 45°') < wk.indexOf('Flexiones'), 'exportación de la semana: esa sesión va en el orden real');
  const hist = await p.evaluate(() => { state.tab = 'progress'; state.progSub = 'historial'; render(); const t = document.getElementById('app').textContent; return t.indexOf('Extensión de Pierna') >= 0 ? t.indexOf('Extensión de Pierna') < t.indexOf('Prensa 45°') : null; });
  ok(hist !== false, `historial: ${hist === null ? 'la lista muestra el resumen del día' : 'en el orden real'}`);
  noErr(p); await p.done();

  const q = await open(); await start(q);
  const redo = await q.evaluate(() => { const d = state.draft; d.exercises.forEach(e => e.log.forEach(s => { if (s.w === '') s.w = 20; })); return 1; });
  await q.clock.setFixedTime(new Date('2026-10-25T10:05:00')); await q.evaluate(() => markSet(0, 0));
  await q.clock.setFixedTime(new Date('2026-10-25T10:06:00')); await q.evaluate(() => markSet(2, 0));
  await q.clock.setFixedTime(new Date('2026-10-25T10:07:00')); await q.evaluate(() => { markSet(0, 0); });   /* la desmarca */
  await q.clock.setFixedTime(new Date('2026-10-25T10:08:00')); await q.evaluate(() => markSet(0, 0));
  const R = await q.evaluate(() => { const id = state.draft.id; finishSession(); return state.sessions.find(x => x.id === id).exercises.map(e => e.name); });
  ok(redo && R[0] === 'Extensión de Pierna', `una serie desmarcada y vuelta a marcar cuenta su hora nueva: ${R.join(' · ')}`);
  noErr(q); await q.done();

  /* Sin horas (sesión a medias de una versión anterior) y sin series */
  const o = await open(); await start(o);
  const N1 = await o.evaluate(() => { const d = state.draft; d.exercises.forEach(e => e.log.forEach(s => { s.w = 20; s.r = 8; s.done = true; delete s.at; })); const id = d.id; finishSession(); return state.sessions.find(x => x.id === id).exercises.map(e => e.name); });
  ok(N1[0] === 'Prensa 45°' && N1[1] === 'Press Banca Plano (Barra)', 'sin horas guardadas: se queda el orden de la sesión');
  const old = await o.evaluate(() => { const s = state.sessions.find(x => x.id === 'a1'); const a = aixSessLine(s), b = sessionPrompt([s]), c = (aixWeekText(0) || {}).txt; state.tab = 'progress'; state.progSub = 'historial'; render(); return { a: /Prensa/.test(a), b: /Prensa/.test(b), c: typeof c, h: /Prensa|Piernas|x/.test(document.getElementById('app').textContent) }; });
  ok(old.a && old.b && old.c === 'string' && old.h, 'las sesiones antiguas se abren y exportan sin errores');
  noErr(o); await o.done();
  const z = await open(); await start(z);
  const Z = await z.evaluate(() => { const d = state.draft, n = d.exercises.map(e => e.name).join(); finishSession(); return { gone: !state.draft, n }; });
  ok(Z.gone, 'terminar sin series: se descarta como siempre, sin errores'); noErr(z); await z.done();
}

console.log('4. Deslizar después del RIR');
const pos = p => p.evaluate(() => { const n = document.getElementById('sx-pager'); return { page: Math.round(n.scrollLeft / n.clientWidth), cur: state.draft.cur, rest: !!state.rest }; });
const rir = (p, i, j, v = 2) => p.evaluate(([i, j, v]) => { const b = document.querySelector(`.rp[data-ex="${i}"][data-set="${j}"][data-v="${v}"]`); if (!b) return false; b.click(); return true; }, [i, j, v]);
{
  const p = await open(); await start(p);
  await p.evaluate(() => { markSet(0, 0); }); await p.waitForTimeout(250);
  let a = await pos(p); ok(a.page === 0 && a.rest, 'serie intermedia: no se mueve y empieza el descanso');
  ok(await rir(p, 0, 0), 'sale el selector de RIR'); await p.waitForTimeout(900);
  a = await pos(p); ok(a.page === 0, 'RIR de una serie intermedia: tampoco se mueve, igual que antes');
  await p.evaluate(() => { markSet(0, 1); }); await p.waitForTimeout(1200);
  a = await pos(p); ok(a.page === 0 && a.cur === 0 && a.rest, `última serie sin RIR: la pantalla se queda y el descanso sigue (página ${a.page})`);
  await rir(p, 0, 1); await p.waitForTimeout(1300);
  a = await pos(p); ok(a.page === 1 && a.cur === 1, `con el RIR: pasa al siguiente como siempre (página ${a.page})`);
  noErr(p); await p.done();

  const q = await open(); await start(q);
  await q.evaluate(() => { markSet(0, 0); markSet(0, 1); }); await q.waitForTimeout(900);
  await q.evaluate(() => pagerGo(2, false)); await q.waitForTimeout(300);
  let b = await pos(q); ok(b.page === 2 && b.cur === 2, 'sin RIR puedes moverte a mano');
  await q.evaluate(() => pagerGo(0, false)); await q.waitForTimeout(300); await rir(q, 0, 1); await q.waitForTimeout(1200);
  b = await pos(q); ok(b.page === 0, 'te moviste a mano: elegir el RIR después ya no te arrastra');
  noErr(q); await q.done();

  const u = await open(); await start(u);
  await u.evaluate(() => { markSet(0, 0); const e = state.draft.exercises[0]; e.log[1].rir = 2; markSet(0, 1); }); await u.waitForTimeout(1300);
  let c = await pos(u); ok(c.page === 1, 'si esa serie ya tenía RIR, se mueve sola como antes');
  noErr(u); await u.done();

  const v = await open(); await start(v);
  await v.evaluate(() => { markSet(0, 0); markSet(0, 1); }); await v.waitForTimeout(300);
  await v.evaluate(() => { markSet(0, 1); }); await v.waitForTimeout(300);   /* la desmarca */
  const stay = await v.evaluate(() => sxWait === null);
  ok(stay, 'si desmarcas la serie, deja de esperar'); noErr(v); await v.done();

  /* Cerrar la app con el RIR pendiente */
  const z = await open(); await start(z);
  await z.evaluate(() => { markSet(0, 0); markSet(0, 1); }); await z.waitForTimeout(300);
  await z.reload(); await z.waitForTimeout(1800);
  const Z = await z.evaluate(() => ({ d: !!state.draft, done: state.draft.exercises[0].log.every(s => s.done), cur: state.draft.cur }));
  ok(Z.d && Z.done && Z.cur === 0, 'cerrar la app con el RIR pendiente: la sesión sigue y no se traba'); noErr(z); await z.done();

  /* Superserie: Prensa + Press Banca */
  const pl = [planA(), planB()]; pl[1].days[0].exercises[0].ss = 1;
  const s = await open({ plans: pl }); await start(s);
  await s.evaluate(() => { state.draft.exercises.forEach(e => e.log.forEach(x => { if (x.w === '') x.w = 40; })); });
  const m = await s.evaluate(() => { const ss = ssMembers(state.draft, 0); markSet(0, 0); return { ss, rest: !!state.rest }; }); await s.waitForTimeout(1100);
  let g = await pos(s); ok(m.ss && g.page === 0 && g.cur === 0, `superserie: espera el RIR antes de ir al compañero (página ${g.page})`);
  await rir(s, 0, 0); await s.waitForTimeout(1300);
  g = await pos(s); ok(g.page === 1 && g.cur === 1 && !g.rest, 'con el RIR va al compañero, sin descanso en mitad de la vuelta, como siempre');
  noErr(s); await s.done();

  /* Reloj: no hay paginador ni espera */
  const w = await open({ watch: true }); await start(w);
  const W = await w.evaluate(() => { markSet(0, 0); markSet(0, 1); return { w: isWatch(), cur: state.draft.cur, wait: sxWait, pager: !!document.getElementById('sx-pager'), done: state.draft.exercises[0].log.every(s => s.done) }; });
  ok(W.w && W.cur === 1 && W.wait === null && !W.pager && W.done, 'reloj: al completar pasa al siguiente como siempre y nada se queda esperando');
  noErr(w); await w.done();
}

console.log('5. Usuario nuevo y dueño sin perfil');
{
  const p = await open({ first: true });
  ok(await p.evaluate(() => !!document.getElementById('onb')), 'usuario nuevo: sale la bienvenida'); noErr(p); await p.done();
  const s = SET({ owner: 0 }); s.onb = 1;
  const q = await open({ settings: s, sessions: [], plans: [planB()] }); await start(q);
  const n = await ex(q, 0);
  ok(n.w.every(v => v === '') && !n.prev.length, 'primera sesión de un usuario nuevo: campos vacíos');
  ok(await q.evaluate(() => { state.draft.exercises[0].log.forEach(x => { x.w = 40; }); markSet(0, 0); markSet(0, 1); return state.draft.exercises[0].log.every(x => x.done && x.r > 0); }), 'escribe su peso, marca y las reps salen del objetivo');
  noErr(q); await q.done();
  const o = SET(); delete o.prof;
  const r = await open({ settings: o }); await start(r);
  ok((await ex(r, 0)).prev.join() === '90x9,90x8' && await r.evaluate(() => state.settings.prof === undefined), 'dueño sin perfil: funciona y no se crea un perfil');
  noErr(r); await r.done();
  const w = await open({ watch: true }); await start(w);
  const W = await w.evaluate(() => { const e = state.draft.exercises; return { mj: !!state.draft.mj, w1: e[1].log[0].w, ov: !!document.getElementById('w2-ov') }; });
  ok(!W.mj && W.w1 !== '' && W.ov, 'reloj: la sesión abre exactamente como antes (sus campos no cambian)');
  noErr(w); await w.done();
}

await browser.close();
console.log(fail ? `\n${fail} FALLAS` : '\nTodo OK');
process.exit(fail ? 1 : 0);
