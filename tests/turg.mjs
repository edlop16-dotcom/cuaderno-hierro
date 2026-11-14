import { OWNER_SETTINGS } from './owner-fixture.mjs';
// Prueba de la rama arreglos-urgentes, con datos inventados:
//  1. Entreno para completar entre semana: "Hoy" siempre está y el descanso muscular se calcula para hoy.
//  2. Lo que llega de otra persona (amigos, alumnos, entrenador) se limpia antes de mostrarse o guardarse.
//  3. El teclado no pone el teléfono en modo reloj; el reloj sigue igual.
//  4. Una superserie solo sugerida no cuenta como hecha.
//  5. Una sesión con 0 repeticiones no rompe el entreno para completar.
// Uso: $env:PW_DIR = "<carpeta con node_modules/playwright>"; node tests/turg.mjs <copia transpilada> [<copia anterior para comparar el reloj>]
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
const MAR = Date.parse('2026-11-10T10:00:00');   /* martes */
const SAB = Date.parse('2026-11-14T10:00:00');   /* sábado */
let N = 0;
const X = (name, sets, w, extra) => Object.assign({ id: 'x' + (++N), name, type: 'Piernas', weight: w, sets, repsMin: 8, repsMax: 12, rest: 90 }, extra);
const SES = (id, at, kind, ex) => ({ id, date: new Date(Date.parse(at)).toISOString(), planId: 'pA', planName: 'Rutina A', dayId: kind === 'fuerza' ? 'dP' : 'dB', dayName: 'Piernas', gymId: 'rokaz', gymName: 'Gimnasio A', kind, durationSec: 3600, exercises: ex.map(([name, sets]) => ({ name, type: 'Piernas', sets: sets.map(([w, r, rir]) => Object.assign({ w, r }, rir != null ? { rir } : {})) })) });
const CF = 'Curl Femoral Tumbado', LAT = 'Elevaciones Laterales', CB = 'Curl Bíceps', TP = 'Tríceps Polea';
const PLAN = () => [{ id: 'pA', name: 'Rutina A', gymId: 'rokaz', days: [
  { id: 'dP', name: 'Piernas (Pesado)', weekday: 1, kind: 'fuerza', exercises: [X(CF, 3, 40), X('Prensa 45°', 3, 120)] },
  { id: 'dB', name: 'Brazos (Bombeo)', weekday: 4, kind: 'bombeo', exercises: [X('Prensa 45°', 3, 100), X(CB, 3, 12, { type: 'Tracción' }), X(TP, 3, 25, { type: 'Empuje' }), X(LAT, 3, 7, { type: 'Empuje' })] }] }];
const SET = () => { const s = Object.assign(structuredClone(OWNER_SETTINGS), { activePlanId: 'pA', activeGymId: 'rokaz', planByGym: { rokaz: 'pA' }, newsSeen: 'n6' }); s.prof = Object.assign({}, s.prof, { goal: 'musculo', exp: 2, mins: 75 }); return s; };
/* Lunes: isquiotibiales al fallo (ayer para el martes) */
const LUN = SES('lun', '2026-11-09T19:00:00', 'bombeo', [[CF, [[22.5, 19, 1], [22.5, 16, 0], [22.5, 14, 0]]]]);

async function open({ watch, sessions, plans, first, at, dir, vp } = {}) {
  const srv = await serve(dir || DIR);
  const ctx = await browser.newContext(watch ? { viewport: { width: 410, height: 500 }, hasTouch: true } : { viewport: vp || { width: 390, height: 844 }, hasTouch: true });
  await ctx.route(/googleapis|gstatic|google\.com|firebase|github/, r => r.abort());
  const p = await ctx.newPage(); p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message));
  await p.clock.setFixedTime(new Date(at || MAR));
  if (!first) await p.addInitScript(([s, pl, ss]) => { if (localStorage.getItem('cdh.seeded')) return; localStorage.setItem('cdh.seeded', '1');
    localStorage.setItem('cdh.settings', JSON.stringify(s)); localStorage.setItem('cdh.plans', JSON.stringify(pl)); localStorage.setItem('cdh.sessions', JSON.stringify(ss));
    localStorage.setItem('cdh.gyms', JSON.stringify([{ id: 'rokaz', name: 'Gimnasio A' }])); localStorage.setItem('cdh.newsSeen', '"n6"'); }, [SET(), plans || PLAN(), sessions || [LUN]]);
  await p.goto(`http://127.0.0.1:${srv.address().port}/index.html`); await p.waitForTimeout(1500);
  if (!first) await p.evaluate(() => { state.settings.healthOk = 1; state.notifPerm = 'granted'; closeSheet(); render(); });
  p.done = async () => { await ctx.close(); srv.close(); };
  return p;
}
const noErr = p => ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
const act = (p, sel) => p.evaluate(s => { const b = document.querySelector(s); if (!b) return false; b.click(); return true; }, sel);
/* La semana: solo faltan isquiotibiales y hombros */
const stubWeek = p => p.evaluate(() => { const W = { cuad: 12, glu: 11, pecho: 10, esp: 11, homb: 7, bic: 10, tri: 10, isq: 6, pant: 10 }; wcVolume = () => ({ rows: Object.keys(W).map(k => ({ k, t: W[k], st: W[k] < WC_MIN ? 'low' : W[k] > WC_MAX ? 'high' : 'ok' })), dl: false, pend: [] }); });
const sheet = p => p.evaluate(() => ({ chips: [...document.querySelectorAll('#sheet [data-wc="day"]')].map(b => b.textContent.trim() + (b.classList.contains('on') ? '*' : '')), list: (wc.list || []).map(e => e.wcZ), moved: (wcBuild.last.moved || []).map(x => x.k + '>' + x.to), txt: document.getElementById('sheet').innerText, save: (document.querySelector('#sheet [data-wc="save"]') || {}).textContent || '', day: wc.day }));

/* ---------- 1. Entreno para completar entre semana ---------- */
console.log('1. Entreno para completar un martes (ayer isquiotibiales al fallo)');
{
  const p = await open(); await stubWeek(p);
  await p.evaluate(() => { wc.kind = 'bombeo'; wc.where = 'gym'; wc.day = null; wc.seed = 0; wcFillSheet(); }); await p.waitForTimeout(200);
  let S = await sheet(p);
  console.log('      días: ' + S.chips.join(' · ') + ' | lista: ' + S.list.join(', ') + ' | pasan: ' + S.moved.join(', '));
  ok(S.chips[0] === 'Hoy*' && S.chips.length === 3 && /^Sábado 14$/.test(S.chips[1]) && /^Domingo 15$/.test(S.chips[2]), 'martes: Hoy (elegido), Sábado y Domingo');
  ok(S.day === '2026-11-10' && S.list.indexOf('isq') < 0 && S.list.indexOf('homb') >= 0, 'hoy: sin isquiotibiales (ayer fuerte), con lo demás');
  ok(S.moved.indexOf('isq>domingo') >= 0 && /Ayer entrenaste isquiotibiales fuerte/.test(S.txt), 'y dice que pasan al domingo, con la razón');
  ok(/Guardar para hoy/.test(S.save), 'el botón dice "Guardar para hoy"');
  /* Sábado elegido y "Empezar ahora": se recalcula para hoy y se muestra antes de empezar */
  await act(p, '#sheet [data-wc="day"][data-v="2026-11-14"]'); await p.waitForTimeout(200);
  S = await sheet(p);
  ok(S.day === '2026-11-14' && S.list.indexOf('isq') >= 0 && /Guardar para el sábado/.test(S.save), 'eligiendo el sábado: isquiotibiales sí (ya pasaron 48 h)');
  await act(p, '#sheet [data-wc="go"]'); await p.waitForTimeout(300);
  S = await sheet(p);
  const T = await p.evaluate(() => ({ draft: !!state.draft, toast: document.getElementById('toast').hidden ? '' : document.getElementById('toast').textContent }));
  ok(!T.draft && S.day === '2026-11-10' && S.list.indexOf('isq') < 0 && /calculé para hoy/.test(T.toast), '"Empezar ahora" con el sábado elegido: la recalcula para hoy y te la muestra (' + T.toast + ')');
  await act(p, '#sheet [data-wc="go"]'); await p.waitForTimeout(600);
  const D = await p.evaluate(() => state.draft && state.draft.exercises.map(e => e.name));
  ok(D && D.length && D.indexOf('Curl Femoral Tumbado') < 0, 'al tocar Empezar otra vez: empieza, sin isquiotibiales (' + (D || []).join(', ') + ')');
  noErr(p); await p.done();
}
{
  /* Si la lista para hoy es la misma, empieza sin más. Y el sábado: Hoy y Domingo */
  const p = await open({ sessions: [SES('old', '2026-11-03T19:00:00', 'bombeo', [[CF, [[22.5, 15, 2], [22.5, 14, 2], [22.5, 13, 2]]]])] }); await stubWeek(p);
  await p.evaluate(() => { wc.kind = 'bombeo'; wc.where = 'gym'; wc.day = null; wc.seed = 0; wcFillSheet(); }); await p.waitForTimeout(150);
  await act(p, '#sheet [data-wc="day"][data-v="2026-11-14"]'); await p.waitForTimeout(150);
  await act(p, '#sheet [data-wc="go"]'); await p.waitForTimeout(600);
  ok(await p.evaluate(() => !!state.draft && state.draft.exercises.some(e => e.name === 'Curl Femoral Tumbado')), 'sin nada que descanse: "Empezar ahora" empieza directo con la misma lista');
  noErr(p); await p.done();
  const q = await open({ at: SAB }); await stubWeek(q);
  await q.evaluate(() => { wc.kind = 'bombeo'; wc.where = 'gym'; wc.day = null; wcFillSheet(); }); await q.waitForTimeout(150);
  const S = await sheet(q);
  ok(S.chips.length === 2 && S.chips[0] === 'Hoy*' && /^Domingo 15$/.test(S.chips[1]), 'sábado: Hoy y Domingo, como antes (' + S.chips.join(' · ') + ')');
  noErr(q); await q.done();
}

/* ---------- 2. Datos de otra persona ---------- */
console.log('2. Lo que llega de amigos, alumnos y entrenador');
{
  const p = await open();
  const R = await p.evaluate(async () => {
    const EVIL = '<img src=x onerror="window.__x=(window.__x||0)+1">', J = o => ({ stringValue: JSON.stringify(o) }), Sv = v => ({ stringValue: v });
    const ws = dk(weekStartOf(new Date()));
    const docs = {
      'social/malo': { fields: { name: Sv(EVIL), j: J({ ws, n: EVIL, sets: EVIL, cd: EVIL, streak: EVIL, badges: EVIL, prs: { a: 1 } }) } },
      'social/bueno': { fields: { name: Sv('Amiga de prueba'), j: J({ ws, n: 3, sets: 42, cd: 60, streak: 5, badges: 7 }) } },
      'share/malo': { fields: { j: J({ name: EVIL, goal: EVIL, plan: EVIL, unit: EVIL, kg: EVIL, inj: [EVIL], at: EVIL, week: { n: EVIL, t: EVIL, sets: EVIL, cd: EVIL, sleep: EVIL }, last: [{ d: EVIL, n: EVIL, m: EVIL, x: [{ n: EVIL, no: EVIL, s: [[EVIL, EVIL, EVIL]] }] }] }) } },
      'share/bueno': { fields: { j: J({ name: 'Alumno de prueba', goal: 'musculo', plan: 'Rutina B', unit: 'kg', kg: 70.5, inj: ['rodilla'], at: Date.now(), week: { n: 2, t: 3, sets: 30, cd: 45, sleep: 420 }, last: [{ d: new Date().toISOString(), n: 'Pierna', m: 55, x: [{ n: 'Prensa 45°', no: 'bien', s: [[100, 10, 2], [100, 9, null]] }] }] }) } },
      inbox: { documents: [
        { name: 'x/inbox/yo/items/p"><img src=x onerror="window.__x=9">', fields: { type: Sv('plan'), from: Sv('malo"><i>'), name: Sv(EVIL), j: J({ name: EVIL, days: [{ name: EVIL, weekday: EVIL, kind: EVIL, exercises: [{ name: 'Prensa 45°', type: EVIL, weight: EVIL, sets: EVIL, repsMin: EVIL, repsMax: EVIL, rest: EVIL, bar: EVIL, note: EVIL, id: 'zz', extra: EVIL }, { name: '', sets: 3 }] }, 'basura'] }) } },
        { name: 'x/inbox/yo/items/ok1', fields: { type: Sv('plan'), from: Sv('entrenador1'), name: Sv('Entrenadora de prueba'), j: J({ name: 'Fuerza 2 días', days: [{ name: 'Día A', weekday: 2, kind: 'bombeo', exercises: [{ name: 'Prensa 45°', type: 'Piernas', weight: 80, sets: 4, repsMin: 10, repsMax: 12, rest: 120, note: 'lento', ss: 1 }] }] }) } },
        { name: 'x/inbox/yo/items/vacio', fields: { type: Sv('plan'), from: Sv('otro'), name: Sv('X'), j: Sv('{"name":"N","days":"no"}') } }] },
    };
    fb.auth = { acc: 'yo', uid: 'yo', token: 't', exp: Date.now() + 9e6 };
    fb.fs = async (m, path) => (m === 'GET' ? (/^inbox\//.test(path) ? docs.inbox : docs[path] || null) : {});
    const out = {};
    /* Amigos */
    state.settings.social = 1; state.settings.friends = [{ acc: 'malo', name: 'M' }, { acc: 'bueno', name: 'B' }];
    await socFeed();
    const box = document.createElement('div'); document.body.appendChild(box); box.innerHTML = socialCard();
    out.feed = SOC.feed.map(r => r.s && [r.name.slice(0, 12), r.s.n, r.s.sets, r.s.streak, r.s.badges]);
    out.cardImgs = box.querySelectorAll('img').length; out.cardTxt = box.innerText;
    box.remove();
    /* Alumnos */
    state.settings.clients = [{ acc: 'malo', name: 'M' }, { acc: 'bueno', name: 'B' }];
    await clientSheet('malo'); await new Promise(r => setTimeout(r, 50));
    out.shImgs = document.querySelectorAll('#sheet img[src="x"]').length; out.shTxt = document.getElementById('sheet').innerText.slice(0, 400);
    await clientSheet('bueno'); await new Promise(r => setTimeout(r, 50));
    out.shOk = document.getElementById('sheet').textContent;   /* las series van dentro de un plegable cerrado */
    closeSheet();
    /* Entrenador */
    await socInbox();
    out.inbox = SOC.inbox.map(o => ({ id: o.id, from: o.from, name: o.name.slice(0, 10), plan: o.plan }));
    const bad = SOC.inbox[0]; acceptPlan(bad.id);
    out.accepted = state.plans[state.plans.length - 1];
    state.tab = 'plans'; render();
    out.planImgs = document.querySelectorAll('#app img[src="x"]').length;
    out.x = window.__x || 0;
    return out;
  });
  await p.waitForTimeout(300);
  const x2 = await p.evaluate(() => window.__x || 0);
  ok(R.x === 0 && x2 === 0, 'ningún código ajeno llegó a ejecutarse');
  ok(R.cardImgs === 0 && R.shImgs === 0 && R.planImgs === 0, 'ni quedó dibujado en Amigos, en la ficha del alumno ni en Rutinas');
  const m = R.feed[0], b = R.feed[1];
  ok(m && m.slice(1).every(v => v === 0), 'amigo con datos raros: sus números quedan en 0 (' + JSON.stringify(m.slice(1)) + ')');
  ok(b && b[0] === 'Amiga de pru' && b[1] === 3 && b[2] === 42 && b[3] === 5 && b[4] === 7, 'amigo normal: nombre y números intactos');
  ok(/Amiga de prueba/.test(R.cardTxt) && /5 sem/.test(R.cardTxt) && /7 logros/.test(R.cardTxt), 'y el reto se ve como siempre');
  ok(/0\/0/.test(R.shTxt), 'ficha del alumno con datos raros: números en 0');
  ok(/Alumno de prueba/.test(R.shOk) && /2\/3/.test(R.shOk) && /30/.test(R.shOk) && /Rutina B/.test(R.shOk) && /70[.,]5 kg/.test(R.shOk) && /100×10 @2 · 100×9/.test(R.shOk) && /“bien”/.test(R.shOk), 'ficha del alumno normal: todo como siempre');
  ok(R.inbox.length === 2 && R.inbox[1].name === 'Entrenador' && R.inbox[1].plan.days[0].exercises[0].sets === 4, 'bandeja: llegan la rutina rara (limpia) y la normal; la que no trae días se descarta');
  const e = R.accepted.days[0].exercises[0], d = R.accepted.days[0];
  ok(R.accepted.days.length === 1 && d.exercises.length === 1 && d.weekday === 1 && d.kind === 'fuerza', 'rutina rara aceptada: 1 día válido, día de la semana y tipo corregidos, sin el ejercicio sin nombre');
  ok(e.type === 'Piernas' && e.weight === 0 && e.sets === 3 && e.repsMin === 8 && e.repsMax === 12 && e.rest === 90 && !('extra' in e) && e.id !== 'zz' && !('bar' in e), 'sus ejercicios: tipo, peso, series, reps y descanso son números válidos; nada de más');
  const g = R.inbox[1].plan.days[0].exercises[0];
  ok(g.name === 'Prensa 45°' && g.weight === 80 && g.repsMin === 10 && g.repsMax === 12 && g.rest === 120 && g.note === 'lento' && g.ss === 1 && R.inbox[1].plan.days[0].kind === 'bombeo' && R.inbox[1].plan.days[0].weekday === 2, 'rutina normal del entrenador: intacta');
  noErr(p); await p.done();
}

/* ---------- 3. El teclado no activa el modo reloj ---------- */
console.log('3. Teclado abierto en un teléfono (usuario nuevo)');
for (const [w, h, kb] of [[390, 844, 300], [360, 780, 290], [412, 915, 340]]) {
  const p = await open({ first: true, vp: { width: w, height: h } });
  await p.evaluate(() => { state.settings.onb = 1; state.settings.healthOk = 1; closeSheet(); const o = document.getElementById('onb'); if (o) o.remove(); const P = activePlan(); startSession(P.id, P.days[0].id); render(); });
  await p.waitForTimeout(400);
  const a = await p.evaluate(() => ({ set: state.settings.watch, w: isWatch(), i: (() => { const i = document.querySelector('input[id^="w-"]'); if (i) i.focus(); return !!i; })() }));
  await p.setViewportSize({ width: w, height: h - kb }); await p.waitForTimeout(250);
  const c = await p.evaluate(() => { const s = state.draft.exercises[0].log[0]; s.w = 20; s.r = 10; const k = document.querySelector('.check[data-act="set"][data-ex="0"][data-set="0"]'); if (k) k.click(); else markSet(0, 0, true); return { w: isWatch() }; });
  await p.waitForTimeout(300);
  const d = await p.evaluate(() => ({ cls: document.body.classList.contains('watch'), w2: !!document.querySelector('[class^="w2-"],.w2'), done: state.draft.exercises[0].log[0].done }));
  ok(a.set == null && !a.w && a.i && !c.w && !d.cls && !d.w2 && d.done, `${w}×${h} con teclado de ${kb} px: sigue siendo teléfono al tocar ✓`);
  await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(200);
  ok(await p.evaluate(() => !isWatch() && !document.body.classList.contains('watch')), `${w}×${h}: y al cerrar el teclado también`);
  noErr(p); await p.done();
}
{
  /* El reloj: lo sigue siendo, también si su alto se achica; y un teléfono en pantalla dividida no pasa a reloj */
  const p = await open({ watch: true, first: true });
  const a = await p.evaluate(() => ({ w: isWatch(), cls: document.body.classList.contains('watch') }));
  await p.setViewportSize({ width: 410, height: 260 }); await p.waitForTimeout(200);
  const b = await p.evaluate(() => { render(); return isWatch() && document.body.classList.contains('watch'); });
  ok(a.w && a.cls && b, 'reloj (410×500): modo reloj, también con el alto reducido');
  await p.done();
  const q = await open({ first: true });
  await q.setViewportSize({ width: 390, height: 420 }); await q.waitForTimeout(200);
  ok(await q.evaluate(() => { render(); return !isWatch(); }), 'teléfono en pantalla dividida (390×420): sigue siendo teléfono');
  await q.setViewportSize({ width: 300, height: 420 }); await q.waitForTimeout(200);
  ok(await q.evaluate(() => isWatch()), 'una pantalla de verdad muy angosta (300 px) sí es reloj, como antes');
  await q.done();
}

/* ---------- 4. Superserie solo sugerida ---------- */
console.log('4. Superserie sugerida por ir atrasado');
{
  const p = await open({ at: Date.parse('2026-11-12T18:00:00'), sessions: [] });
  await p.evaluate(() => { state.settings.nextS = { dB: { pick: 'plan' } }; startSession('pA', 'dB'); render(); }); await p.waitForTimeout(400);
  const R = await p.evaluate(() => {
    const d = state.draft, now = Date.now(), ix = n => d.exercises.findIndex(e => e.name === n), out = {};
    d.start = new Date(now - 100 * 60000).toISOString();   /* muy atrasado */
    const mark = (n, j, at) => { const s = d.exercises[ix(n)].log[j]; s.w = 10; s.r = 15; s.rir = 2; s.done = true; s.at = at; };
    mark('Prensa 45°', 0, now - 30 * 60000);
    const L = pgLate(d); out.tip = (L.tips.find(t => t.k === 'ss') || {}).t || '';
    out.sug = JSON.stringify(d.ssSug || null); out.ssT = d.ssT === undefined;
    const pair = (d.ssSug || [[]])[0], A = pair[0], B = pair[1]; out.pair = pair;
    if (!A || !B) return out;
    /* No le haces caso: los haces uno tras otro, con su descanso */
    [0, 1, 2].forEach(j => mark(A, j, now - (20 - j * 3) * 60000)); [0, 1, 2].forEach(j => mark(B, j, now - (10 - j * 3) * 60000));
    const F = agFlags(d), q = n => d.exercises[ix(n)].log.map(s => (F.get(s) ? 1 : 0)).join('');
    out.seq = { done: agSsDone(d), qA: q(A), qB: q(B) };
    const S1 = exDraftSession ? agLive(d) : null; out.seqSaved = S1 ? S1.exercises.filter(e => e.name === A || e.name === B).map(e => e.sets.map(s => (s.q ? 1 : 0)).join('')) : null;
    /* Sí la haces: A, B, A, B… sin descanso entre los dos */
    [0, 1, 2].forEach(j => { mark(A, j, now - (20 - j * 4) * 60000); mark(B, j, now - (20 - j * 4) * 60000 + 50000); });
    const G = agFlags(d), q2 = n => d.exercises[ix(n)].log.map(s => (G.get(s) ? 1 : 0)).join('');
    out.alt = { done: agSsDone(d), qA: q2(A), qB: q2(B) };
    return out;
  });
  console.log('      sugerencia: ' + R.tip + ' | sin hacerla: ' + JSON.stringify(R.seq) + ' | haciéndola: ' + JSON.stringify(R.alt));
  ok(/en superserie/.test(R.tip) && R.pair && R.pair.length === 2 && R.ssT, 'la app la sugiere y solo la anota como sugerencia');
  ok(R.seq && R.seq.done.length === 0 && R.seq.qA === '000' && R.seq.qB === '000', 'si no la haces: ninguna serie queda como "sin descanso completo"');
  ok(R.seqSaved && R.seqSaved.every(x => x === '000'), 'y el coach cuenta esas series normalmente');
  ok(R.alt && R.alt.done.length === 2 && /^0?11$|^011$/.test(R.alt.qA) && /11$/.test(R.alt.qB), 'si de verdad los alternas: desde la 2.ª vuelta cuentan como superserie');
  noErr(p); await p.done();
}

/* ---------- 5. Sesión con 0 repeticiones ---------- */
console.log('5. Una sesión anterior con 0 repeticiones');
{
  const p = await open({ sessions: [SES('z', '2026-11-05T19:00:00', 'fuerza', [[CF, [[40, 0], [40, 0]]]])] }); await stubWeek(p);
  const R = await p.evaluate(() => { try { const rx = g2FillRx('Curl Femoral Tumbado', 'bombeo'), L = g2Load('Curl Femoral Tumbado', rx, 'gym', 'bombeo'); wc.kind = 'bombeo'; wc.where = 'gym'; wc.day = null; wcFillSheet(); return { note: L.note, w: L.w, sheet: !!document.querySelector('#sheet .wc-sheet'), n: (wc.list || []).length }; } catch (e) { return { err: e.message }; } });
  ok(!R.err && R.sheet && R.n > 0 && /primera vez/.test(R.note), 'no falla: lo trata como primera vez (' + (R.err || R.note) + ')');
  noErr(p); await p.done();
}

/* ---------- 6. Reloj idéntico a la versión anterior ---------- */
if (BASE) {
  console.log('6. Reloj frente a la versión anterior');
  const shots = async dir => { const p = await open({ watch: true, dir }); const a = await p.screenshot(); await p.evaluate(() => { if (typeof _pgRxG5 !== 'undefined') pgRx = _pgRxG5; });   /* ajustes-gym-5: rangos y descansos de antes, para comparar solo la pantalla del reloj */ await p.evaluate(() => { state.settings.nextS = { dP: { pick: 'plan' } }; startSession('pA', 'dP'); render(); }); await p.waitForTimeout(700); const b = await p.screenshot(); const t = await p.evaluate(() => document.body.innerText); await p.evaluate(() => { markSet(0, 0, true); }); await p.waitForTimeout(500); const c = await p.screenshot(); const e = p.errs.slice(); await p.done(); return { a, b, c, t, e }; };
  const A = await shots(DIR), B = await shots(BASE);
  ok(A.a.equals(B.a), 'reloj: inicio idéntico');
  ok(A.b.equals(B.b) && A.t === B.t, 'reloj: sesión idéntica');
  ok(A.c.equals(B.c), 'reloj: descanso tras marcar una serie idéntico');
  ok(!A.e.length, 'reloj: sin errores de JS ' + A.e.join(' | '));
}

await browser.close();
console.log(fail ? `\n${fail} FALLA(S)` : '\nTodo OK');
process.exit(fail ? 1 : 0);
