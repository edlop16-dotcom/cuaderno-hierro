import { OWNER_SETTINGS } from './owner-fixture.mjs';
// Prueba de la rama ajustes-gym-4 (descanso muscular, peso del mismo tipo de día y "sube" que sube), con datos inventados.
// Uso: $env:PW_DIR = "<carpeta con node_modules/playwright>"; node tests/tgym4.mjs <copia transpilada> [<copia anterior para comparar el reloj>]
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

/* ---------- Datos inventados con la forma del caso real ---------- */
const T0 = Date.parse('2026-11-07T10:00:00');   /* sábado por la mañana */
const AT = s => new Date(Date.parse(s)).toISOString();
let N = 0;
const X = (name, sets, w, extra) => Object.assign({ id: 'x' + (++N), name, type: 'Piernas', weight: w, sets, repsMin: 8, repsMax: 12, rest: 90 }, extra);
const SES = (id, at, kind, dayId, ex) => ({ id, date: AT(at), planId: 'pA', planName: 'Rutina A', dayId, dayName: kind === 'fuerza' ? 'Piernas (Pesado)' : 'Piernas (Bombeo)', gymId: 'rokaz', gymName: 'Gimnasio A', kind, durationSec: 3600, exercises: ex.map(([name, sets]) => ({ name, type: 'Piernas', sets: sets.map(([w, r, rir]) => Object.assign({ w, r }, rir != null ? { rir } : {})) })) });
const CF = 'Curl Femoral Tumbado', TAL = 'Elevación de Talones de Pie';
/* Números inventados (el repositorio es público). TG4_CASE (JSON) permite probar otros con la misma forma, fuera del repositorio.
   Viernes: Piernas Bombeo (curl femoral al RIR 0-1; talones sin RIR). Día pesado anterior (lunes): curl femoral en el tope del rango */
const CASE = Object.assign({ cfB: [22.5, [19, 16, 14]], tal: [32.5, [20, 24, 20]], cfP: [37.5, [12, 12, 11]], pm: [12.5, 12] }, process.env.TG4_CASE ? JSON.parse(process.env.TG4_CASE) : {});
const TXT = ([w, R]) => R.map(r => w + '×' + r).join(', ');
const VIE = SES('vie', '2026-11-06T19:00:00', 'bombeo', 'dB', [[CF, CASE.cfB[1].map((r, j) => [CASE.cfB[0], r, j ? 0 : 1])], [TAL, CASE.tal[1].map(r => [CASE.tal[0], r])]]);
const LUN = SES('lun', '2026-11-02T19:00:00', 'fuerza', 'dP', [[CF, CASE.cfP[1].map(r => [CASE.cfP[0], r])], ['Prensa 45°', [[120, 10, 2], [120, 10, 2], [120, 9, 1]]]]);
const PLAN = () => [{ id: 'pA', name: 'Rutina A', gymId: 'rokaz', days: [
  { id: 'dP', name: 'Piernas (Pesado)', weekday: 1, kind: 'fuerza', exercises: [X(CF, 3, 40), X('Prensa 45°', 3, 120)] },
  { id: 'dB', name: 'Piernas (Bombeo)', weekday: 5, kind: 'bombeo', exercises: [X(CF, 3, 20), X(TAL, 3, 35)] }] }];
const SET = extra => { const s = Object.assign(structuredClone(OWNER_SETTINGS), { activePlanId: 'pA', activeGymId: 'rokaz', planByGym: { rokaz: 'pA' }, newsSeen: 'n6' }, extra || {}); s.prof = Object.assign({}, s.prof, { goal: 'musculo', exp: 2, mins: 75 }); return s; };

async function open({ watch, settings, sessions, plans, first, at, dir } = {}) {
  const srv = await serve(dir || DIR);
  const ctx = await browser.newContext(watch ? { viewport: { width: 410, height: 500 }, hasTouch: true } : { viewport: { width: 390, height: 844 }, hasTouch: true });
  await ctx.route(/googleapis|gstatic|google\.com|firebase|github/, r => r.abort());
  const p = await ctx.newPage(); p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message));
  await p.clock.setFixedTime(new Date(at || T0));
  if (!first) await p.addInitScript(([s, pl, ss]) => { if (localStorage.getItem('cdh.seeded')) return; localStorage.setItem('cdh.seeded', '1');
    localStorage.setItem('cdh.settings', JSON.stringify(s)); localStorage.setItem('cdh.plans', JSON.stringify(pl)); localStorage.setItem('cdh.sessions', JSON.stringify(ss));
    localStorage.setItem('cdh.gyms', JSON.stringify([{ id: 'rokaz', name: 'Gimnasio A' }])); localStorage.setItem('cdh.newsSeen', '"n6"'); }, [settings || SET(), plans || PLAN(), sessions || [VIE, LUN]]);
  await p.goto(`http://127.0.0.1:${srv.address().port}/index.html`); await p.waitForTimeout(1500);
  if (!first) await p.evaluate(() => { state.settings.healthOk = 1; state.notifPerm = 'granted'; closeSheet(); render(); });
  p.done = async () => { await ctx.close(); srv.close(); };
  return p;
}
const noErr = p => ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
const build = (p, kind, day) => p.evaluate(([k, d]) => {
  wc.kind = k; wc.where = 'gym'; wc.day = d; wc.seed = 0; wcFillSheet();
  const B = wcBuild.last, sh = document.getElementById('sheet').innerText;
  return { sheet: sh, moved: B.moved, left: B.left, list: B.list.map(e => ({ n: e.name, z: e.wcZ, s: e.sets, r: e.repsMin + '-' + e.repsMax, w: e.weight, reps: e.g2Reps, rir: e.rirT.join(','), why: e.g2Why, fw: fmtKg(e.weight) })) };
}, [kind, day]);
const show = (t, B) => {
  console.log(`\n      ${t}`);
  console.log('      Ejercicio | Series × reps | Peso | RIR');
  B.list.forEach(e => console.log(`      ${e.n} | ${e.s} × ${e.reps} (${e.r}) | ${e.w} kg | ${e.rir}\n         ${e.why}`));
  (B.moved || []).forEach(x => console.log(`      → pasa al ${x.to}: ${x.k} ${x.n} series (${x.why})`));
  (B.left || []).forEach(x => console.log(`      sin cubrir: ${x.k} ${x.n} (${x.why})`));
};

/* ---------- 1. El caso: sábado, entreno para completar ---------- */
console.log('1. Sábado: entreno para completar (Fuerza y Bombeo, Hoy y Domingo)');
{
  const p = await open();
  /* La semana: casi todo en la meta; faltan hombros, isquiotibiales y pantorrillas (como en el caso real) */
  await p.evaluate(() => { const W = { cuad: 12, glu: 11, pecho: 10, esp: 11, homb: 7, bic: 10, tri: 10, isq: 6, pant: 3 }; wcVolume = () => ({ rows: Object.keys(W).map(k => ({ k, t: W[k], st: W[k] < WC_MIN ? 'low' : W[k] > WC_MAX ? 'high' : 'ok' })), dl: false, pend: [] }); });
  ok(await p.evaluate(([a, b]) => !!libFind(a) && libFind(a).name === a && !!libFind(b) && libFind(b).name === b, [CF, TAL]), 'los nombres de la prueba son del catálogo');
  const R = await p.evaluate(() => { const r = restMap('2026-11-07'), s = restMap('2026-11-08'); return { isq: r.isq, pant: r.pant, isqD: s.isq, pantD: s.pant }; });
  ok(R.isq && R.isq.block && R.isq.big && R.isq.dd === 1, 'hoy (sábado): isquiotibiales aún descansan (ayer fuerte, menos de 48 h)');
  ok(!R.pant || !R.pant.block, 'hoy: pantorrillas no se bloquean (3 series sin RIR anotado no cuentan como fuerte; y con 24 h basta)');
  ok(!R.isqD || !R.isqD.block, 'domingo: isquiotibiales ya pasaron 48 h');
  const C = {};
  for (const [kind, day, lab] of [['fuerza', '2026-11-07', 'FUERZA · HOY (sábado)'], ['bombeo', '2026-11-07', 'BOMBEO · HOY (sábado)'], ['fuerza', '2026-11-08', 'FUERZA · DOMINGO'], ['bombeo', '2026-11-08', 'BOMBEO · DOMINGO']]) {
    const B = C[kind + day] = await build(p, kind, day); show(lab, B);
  }
  const cf = B => B.list.find(e => e.n === CF), tl = B => B.list.find(e => e.n === TAL);
  for (const k of ['fuerza', 'bombeo']) {
    const H = C[k + '2026-11-07'], D = C[k + '2026-11-08'];
    ok(!H.list.some(e => e.z === 'isq'), k + ' hoy: sin isquiotibiales (ayer fuerte)');
    ok(H.moved.some(x => x.k === 'isq' && x.to === 'domingo' && /^Ayer entrenaste isquiotibiales fuerte/.test(x.why)), k + ' hoy: sus series pasan al domingo, con la razón');
    ok(/Ayer entrenaste isquiotibiales fuerte: isquiotibiales \(\d+ series\) pasa al domingo/.test(H.sheet), k + ' hoy: la hoja lo dice');
    ok(D.list.some(e => e.z === 'isq'), k + ' domingo: isquiotibiales sí (ya pasaron 48 h)');
    const t = tl(H); ok(!t || /RIR 1-2|^Te falta/.test(t.why) && t.rir.split(',').every(v => v === '1' || v === '2'), k + ' hoy: pantorrillas con RIR 1-2');
  }
  /* Si los talones también fueron al fallo: con 24 h basta, pero la razón lo dice y va con RIR 1-2 */
  await p.evaluate(t => { const s = state.sessions.find(x => x.id === 'vie'); s.exercises.find(e => e.name === t).sets.forEach(x => { x.rir = 0; }); }, TAL);
  const SF = await build(p, 'bombeo', '2026-11-07'); const st = tl(SF);
  console.log('      talones al fallo el viernes → sábado: ' + (st ? st.s + ' × ' + st.reps + ' · ' + st.w + ' kg · RIR ' + st.rir + ' · ' + st.why : 'no salen'));
  ok(st && /^Ayer entrenaste pantorrillas fuerte: con 24 h basta, hoy RIR 1-2/.test(st.why) && st.rir.split(',').every(v => v === '1' || v === '2'), 'talones al fallo ayer: salen hoy (24 h bastan) con RIR 1-2 y la razón');
  /* 2. El peso sale del mismo tipo de día */
  const fD = cf(C['fuerza2026-11-08']), bD = cf(C['bombeo2026-11-08']);
  ok(fD && fD.w > CASE.cfP[0] && fD.why.indexOf('tu última sesión pesada ' + TXT(CASE.cfP)) >= 0, 'Fuerza: Curl Femoral sale de tu último día pesado (' + TXT(CASE.cfP) + '), no del bombeo: ' + (fD && fD.w) + ' kg');
  ok(bD && bD.w > CASE.cfB[0] && bD.why.indexOf('tu última sesión de bombeo ' + TXT(CASE.cfB)) >= 0, 'Bombeo: sale de tu último bombeo (' + TXT(CASE.cfB) + ') y sube: ' + (bD && bD.w) + ' kg');
  ok(bD && /sube a /.test(bD.why) && bD.why.indexOf('sube a ' + bD.fw + ' kg') >= 0, 'Bombeo: el texto "sube" dice el mismo peso que la tabla');
  noErr(p); await p.done();
}

/* ---------- 2. Sin datos del mismo tipo: se convierte y se explica ---------- */
console.log('2. Sin una sesión del mismo tipo: conversión por 1RM estimado');
{
  const p = await open({ sessions: [VIE] });
  await p.evaluate(() => { const W = { cuad: 12, glu: 11, pecho: 10, esp: 11, homb: 10, bic: 10, tri: 10, isq: 6, pant: 10 }; wcVolume = () => ({ rows: Object.keys(W).map(k => ({ k, t: W[k], st: W[k] < WC_MIN ? 'low' : W[k] > WC_MAX ? 'high' : 'ok' })), dl: false, pend: [] }); });
  const B = await build(p, 'fuerza', '2026-11-08'); show('FUERZA · DOMINGO (sin día pesado guardado)', B);
  const e = B.list.find(x => x.n === CF);
  ok(e && /no hay una sesión pesada de este ejercicio, así que lo convertí desde tu sesión de bombeo \(1RM estimado ≈ [\d,]+ kg\)/.test(e.why), 'explica la conversión desde el bombeo: ' + (e && e.why));
  ok(e && e.w >= CASE.cfB[0] && e.w <= CASE.cfB[0] + 5.01, 'peso convertido prudente para menos reps: ' + (e && e.w) + ' kg');
  noErr(p); await p.done();
}

/* ---------- 3. "Sube" siempre sube ---------- */
console.log('3. "Sube" sube el peso (y el texto coincide con la tabla)');
{
  const PM = 'Press Militar (Mancuernas)';
  const p = await open({ sessions: [SES('pm', '2026-11-04T19:00:00', 'fuerza', 'dP', [[PM, [[CASE.pm[0], CASE.pm[1]], [CASE.pm[0], CASE.pm[1]], [CASE.pm[0], CASE.pm[1] - 1]]]]), LUN] });
  const ex = await p.evaluate(n => !!libFind(n) && libFind(n).name, PM); ok(ex === PM, 'Press Militar (Mancuernas) está en el catálogo');
  const L = await p.evaluate(n => ['fuerza', 'bombeo'].map(k => { const rx = g2FillRx(n, k); const L = g2Load(n, rx, 'gym', k); return { k, w: L.w, note: L.note, r: rx.rMin + '-' + rx.rMax }; }), PM);
  L.forEach(x => console.log(`      ${x.k} (${x.r}): ${x.w} kg · ${x.note}`));
  const F = L[0], nx = CASE.pm[0] + 2.5; ok(F.w === nx && F.note.indexOf('sube a ' + nx + ' kg') >= 0, 'Fuerza: hiciste ' + CASE.pm[0] + '×' + CASE.pm[1] + ' → sube al siguiente escalón, ' + nx + ' kg (no ' + CASE.pm[0] + ')');
  /* Barrido: miles de historias inventadas; si el texto dice "sube", el peso sube; si mantiene, dice "mantén" */
  const S = await p.evaluate(() => {
    const names = ['Press Militar (Mancuernas)', 'Curl Femoral Tumbado', 'Prensa 45°', 'Press Banca con Mancuernas', 'Remo Sentado con Cable', 'Curl Bíceps', 'Elevación de Talones de Pie', 'Sentadilla con Barra', 'Extensión de Pierna', 'Elevaciones Laterales'].filter(n => libFind(n));
    const keep = state.sessions, bad = [], seen = { g2: 0, pg: 0, tip: 0 }; let seed = 7;
    const rnd = n => { seed = (seed * 9301 + 49297) % 233280; return Math.floor(seed / 233280 * n); };
    try {
      for (let i = 0; i < 1500; i++) {
        const n = names[i % names.length], kind = i % 2 ? 'fuerza' : 'bombeo', w0 = [5, 7.5, 10, 12.5, 15, 17.5, 20, 25, 35, 40, 60, 120][rnd(12)], r0 = 4 + rnd(22), rir = rnd(4) - 1;
        const sets = [0, 1, 2].map(j => Object.assign({ w: w0, r: Math.max(1, r0 - j * rnd(3)) }, rir >= 0 ? { rir: Math.max(0, rir - j) } : {}));
        state.sessions = [{ id: 's' + i, date: new Date(Date.now() - 3 * 864e5).toISOString(), gymId: 'rokaz', kind, exercises: [{ name: n, sets }] }];
        const rx = g2FillRx(n, kind), L = g2Load(n, rx, 'gym', kind); seen.g2++;
        if (/sube/.test(L.note) && !(L.w > w0)) bad.push(['g2', n, kind, w0, r0, L.w, L.note]);
        if (!/sube|baja|convert|primera/.test(L.note) && L.w !== w0) bad.push(['g2-sin-texto', n, kind, w0, r0, L.w, L.note]);
        const c = pgCoach({ name: n, sets: 3 }, 'rokaz', kind); seen.pg++;
        if ((c.mode === 'up' || /^Sube/.test(c.why)) && !(c.w > w0)) bad.push(['pg', n, kind, w0, r0, c.w, c.why]);
        if (c.mode === 'hold' && c.w !== w0) bad.push(['pg-hold', n, kind, w0, r0, c.w, c.why]);
      }
    } finally { state.sessions = keep; }
    return { bad: bad.slice(0, 6), n: bad.length, seen };
  });
  ok(!S.n, `barrido: ${S.seen.g2} recomendaciones del entreno para completar y ${S.seen.pg} del coach; "sube" siempre sube y "mantén" mantiene` + (S.n ? ' — ' + JSON.stringify(S.bad) : ''));
  /* Indicación serie por serie: "sube a X" con X mayor */
  const T = await p.evaluate(([n, w]) => { const d = { exercises: [{ name: n, log: [{ w, r: 14, rir: 3, done: 1 }, { w, r: '', done: 0 }], coach: { rx: pgRx(n, 'fuerza') } }], kind: 'fuerza', gymId: 'rokaz' }; const r = agTip(d, 0); r.fw = fmtKg(r.W); return r; }, [PM, CASE.pm[0]]);
  console.log('      serie por serie: ' + T.t);
  ok(T.k === 'up' && T.W > CASE.pm[0] && T.t.indexOf(T.fw + ' kg') >= 0, 'serie por serie: "sube a ' + T.W + ' kg" y Aplicar pone ese peso');
  /* Peso máximo: no dice sube */
  const T2 = await p.evaluate(([n, w]) => { state.settings.exMax = { rokaz: { [exHKey(n)]: w } }; const d = { exercises: [{ name: n, log: [{ w, r: 14, rir: 3, done: 1 }, { w, r: '', done: 0 }], coach: { rx: pgRx(n, 'fuerza') } }], kind: 'fuerza', gymId: 'rokaz' }; const r = agTip(d, 0); delete state.settings.exMax; return r; }, [PM, CASE.pm[0]]);
  ok(T2.k !== 'up' && T2.t.indexOf('mantén ' + CASE.pm[0] + ' kg, es tu peso máximo') >= 0, 'en tu peso máximo: "mantén" con la razón (' + T2.t + ')');
  /* Coach "Próxima sesión" con la Preparación: si hoy no sube, el texto no dice "Sube" */
  const NS = await p.evaluate(n => ['mid', 'low'].map(r => { const c = nsCoachEx({ id: 'q', name: n, sets: 3 }, 'rokaz', 'fuerza', { ready: r }); return { r, w: c.sets[0].w, why: c.why, mode: c.mode }; }), PM);
  NS.forEach(x => console.log(`      Preparación ${x.r}: ${x.w} kg · ${x.why}`));
  ok(NS.every(x => !/^Sube/.test(x.why) && x.mode !== 'up' && x.w <= CASE.pm[0]), 'Preparación "sin forzar" o "cansado": mantiene o baja y el texto lo dice');
  noErr(p); await p.done();
}

/* ---------- 4. En la sesión: el coach no mezcla tipos y el siguiente ejercicio respeta el descanso ---------- */
console.log('4. En la sesión');
{
  const p = await open();
  await p.evaluate(() => { state.settings.nextS = { dP: { pick: 'plan' } }; startSession('pA', 'dP'); render(); }); await p.waitForTimeout(600);
  const S = await p.evaluate(n => { const e = state.draft.exercises.find(x => x.name === n); return { w: +e.log[0].w, why: String((e.coach && (e.coach.why || (e.coach.pg && e.coach.pg.why))) || (e.coach && e.coach.tips && e.coach.tips[0]) || '') }; }, CF);
  console.log('      día pesado, Curl Femoral: ' + S.w + ' kg · ' + S.why.replace(/<[^>]+>/g, ''));
  ok(S.w >= CASE.cfP[0] && S.why.indexOf(CASE.cfB[0] + '×') < 0, 'día pesado: el coach usa tu último día pesado (' + TXT(CASE.cfP) + '), no el bombeo del viernes');
  /* Siguiente ejercicio: con Prensa y Curl Femoral pendientes y un tercero, no prioriza isquiotibiales por "te faltan series" */
  await p.evaluate(() => { const d = state.draft; d.exercises.push(Object.assign(JSON.parse(JSON.stringify(d.exercises[0])), { name: 'Press Banca con Mancuernas', exId: 'xb' })); d.exercises[1].log[0].done = true; d.exercises[1].log[0].r = 10; d.exercises[1].log[0].w = 120; d.cur = 1; saveDraft(); });
  const P = await p.evaluate(() => { const P = agPick(state.draft); return P && { n: P.name, why: P.why }; });
  console.log('      después: ' + JSON.stringify(P));
  ok(!P || P.n !== 'Curl Femoral Tumbado' || !/isquiotibiales/.test(P.why), 'el siguiente ejercicio no prioriza isquiotibiales (ayer fuerte)');
  const LV = await p.evaluate(() => { const N = lvNext(state.draft, 1); return { k: N.k, rest: N.rest, html: lvNextHtml(state.draft, 1).replace(/<[^>]+>/g, ' ') }; });
  ok(LV.k !== 'isq' && (LV.rest || []).indexOf('isq') >= 0 && /Ayer entrenaste isquiotibiales fuerte/.test(LV.html), '"Ahora conviene priorizar" deja fuera isquiotibiales y dice por qué');
  noErr(p); await p.done();
}

/* ---------- 5. Entreno para completar → sesión: mismos pesos, reps y RIR ---------- */
console.log('5. Al empezar el entreno para completar');
{
  const p = await open({ sessions: [VIE, LUN] });
  /* Solo faltan isquiotibiales y no hay otro día (domingo): máximo 2 series con RIR 2 */
  await p.clock.setFixedTime(new Date('2026-11-08T10:00:00'));
  const VIE2 = await p.evaluate(() => { const s = JSON.parse(JSON.stringify(state.sessions.find(x => x.id === 'vie'))); s.id = 'sab'; s.date = new Date('2026-11-07T19:00:00').toISOString(); state.sessions.unshift(s); wcVolume = () => ({ rows: [{ k: 'isq', t: 6, st: 'low' }, { k: 'pecho', t: 12, st: 'ok' }], dl: false, pend: [] }); return 1; });
  const B = await build(p, 'bombeo', '2026-11-08'); show('BOMBEO · DOMINGO (solo faltan isquiotibiales, entrenados fuerte el sábado)', B);
  const e = B.list.find(x => x.z === 'isq');
  ok(B.list.length === 1 && e && e.s === 2 && e.rir === '2,2' && /^Ayer entrenaste isquiotibiales fuerte: solo 2 series con RIR 2/.test(e.why), 'único músculo que falta y sin otro día: 2 series con RIR 2 y la razón');
  await p.evaluate(() => { const b = document.querySelector('[data-wc="go"]'); b && b.click(); }); await p.waitForTimeout(600);
  const D = await p.evaluate(() => state.draft && state.draft.exercises.map(x => ({ n: x.name, w: +x.log[0].w, n2: x.log.length, rir: (x.rirT || []).join(','), rec: (document.querySelector('.g2-rec') || {}).innerText || '' })));
  ok(D && D[0] && D[0].w === e.w && D[0].n2 === 2 && D[0].rir === '2,2', 'al empezar: el mismo peso, 2 series y RIR 2');
  noErr(p); await p.done();
}

/* ---------- 6. Tu plan de la semana ---------- */
console.log('6. Tu plan de la semana: descanso entre días');
{
  const PL = [{ id: 'pA', name: 'Rutina A', gymId: 'rokaz', days: [
    { id: 'd1', name: 'Pierna A', weekday: 1, kind: 'fuerza', exercises: [X(CF, 3, 40)] },
    { id: 'd2', name: 'Pierna B', weekday: 2, kind: 'bombeo', exercises: [X('Peso Muerto Rumano', 3, 40)] },
    { id: 'd5', name: 'Pierna C', weekday: 5, kind: 'bombeo', exercises: [X(CF, 3, 20)] }] }];
  const p = await open({ plans: PL, sessions: [] });
  const R = await p.evaluate(() => { const P = wcProposal(0), D = tkDist(P); return { up: P.items.filter(i => i.s1 > i.s0).map(i => i.dn), close: D.close.map(c => [c.k, c.a.wd, c.b.wd]), html: tkDistHtml(P).replace(/<[^>]+>/g, ' ') }; });
  console.log('      +1 serie en: ' + R.up.join(', ') + ' · aviso: ' + JSON.stringify(R.close));
  ok(R.up[0] === 'Pierna C', 'la serie de más de isquiotibiales va al día con más descanso (viernes), no al lunes que va pegado al martes');
  ok(R.close.some(c => c[0] === 'isq' && c[1] === 1 && c[2] === 2) && /Isquiotibiales: lunes y martes seguidos/.test(R.html) && /48 h/.test(R.html), 'avisa: isquiotibiales lunes y martes seguidos, necesitan 48 h');
  noErr(p); await p.done();
}

/* ---------- 7. Usuario nuevo y reloj ---------- */
console.log('7. Usuario nuevo y reloj');
{
  const p = await open({ first: true });
  await p.evaluate(() => { closeSheet(); wc.kind = 'bombeo'; wc.day = null; wcFillSheet(); }); await p.waitForTimeout(300);
  ok(await p.evaluate(() => !!document.querySelector('.wc-sheet')), 'usuario nuevo: crear entreno para completar abre');
  ok(await p.evaluate(() => Object.keys(restMap()).length === 0), 'usuario nuevo: sin entrenos, nada descansa');
  noErr(p); await p.done();
}
if (BASE) {
  const shots = async dir => { const p = await open({ watch: true, dir }); const a = await p.screenshot(); await p.evaluate(() => { state.settings.nextS = { dB: { pick: 'plan' } }; startSession('pA', 'dB'); render(); }); await p.waitForTimeout(700); const b = await p.screenshot(); const t = await p.evaluate(() => document.body.innerText); const e = p.errs.slice(); await p.done(); return { a, b, t, e }; };
  const A = await shots(DIR), Bs = await shots(BASE);
  ok(A.a.equals(Bs.a), 'reloj: inicio idéntico a la versión anterior');
  ok(A.b.equals(Bs.b) && A.t === Bs.t, 'reloj: sesión idéntica a la versión anterior');
  ok(!A.e.length, 'reloj: sin errores de JS ' + A.e.join(' | '));
}

await browser.close();
console.log(fail ? `\n${fail} FALLA(S)` : '\nTodo OK');
process.exit(fail ? 1 : 0);
