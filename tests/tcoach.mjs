import { OWNER_SETTINGS } from './owner-fixture.mjs';
// Prueba del coach con doble progresión autorregulada (rama coach-progresion), con datos inventados.
// Uso (desde PowerShell): $env:PW_DIR = "<carpeta con node_modules/playwright>"; node tests/tcoach.mjs <copia transpilada> [<anterior>] [capturas]
// Subir al tope, mantener, bajar tras dos fallos, descarga, pesado y bombeo por separado, dos gimnasios (Hack muy distinta,
// Prensa parecida, máquina solo en un gimnasio → primera vez en el otro, peso libre tal cual), Hipertrofia frente a Fuerza,
// ejercicio importado desconocido, el plan con los valores del coach, un día que pasa del tiempo y sus ajustes, una
// sesión atrasada, tipos del catálogo y ficha, volumen por músculo, exportaciones, reloj y un dueño de versiones antiguas.
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
let N = 0;
const X = (name, type, sets, w) => ({ id: 'x' + (++N), name, type, weight: w, sets, repsMin: 10, repsMax: 12, rest: 90 });
const DAY_B = [X('Prensa 45°', 'Piernas', 3, 100), X('Sentadilla Hack', 'Piernas', 3, 40), X('Press Banca Plano (Barra)', 'Empuje', 3, 40), X('Extensión de Pierna', 'Piernas', 3, 30), X('Curl Bíceps', 'Tracción', 3, 10), X('Elevaciones Laterales', 'Empuje', 3, 5), X('Tríceps Polea', 'Empuje', 3, 20), X('Remo Sentado con Cable', 'Tracción', 3, 40), X('Press Militar con Barra', 'Empuje', 3, 20)];
const PLANS = [
  { id: 'planA', name: 'Rutina A', gymId: 'rokaz', days: [{ id: 'a-pes', name: 'Piernas (Pesado)', weekday: 1, kind: 'fuerza', exercises: [X('Sentadilla Hack', 'Piernas', 3, 40), X('Prensa 45°', 'Piernas', 3, 100)] }] },
  { id: 'planB', name: 'Rutina B', gymId: 'raydac', days: [
    { id: 'b-pes', name: 'Cuerpo completo (Pesado)', weekday: 1, kind: 'fuerza', exercises: DAY_B },
    { id: 'b-bom', name: 'Piernas (Bombeo)', weekday: 4, kind: 'bombeo', exercises: [X('Sentadilla Hack', 'Piernas', 3, 40), X('Prensa 45°', 'Piernas', 3, 100), X('Curl Bíceps', 'Tracción', 3, 8)] }] },
];
const S = (w, r, rir, n = 3) => Array.from({ length: n }, (_, k) => ({ w, r, rir: rir == null ? null : Math.max(0, rir - k) }));
const SS = (id, date, gymId, dayId, kind, ex) => ({ id, date: new Date(date).toISOString(), planId: gymId === 'rokaz' ? 'planA' : 'planB', planName: '', dayId, dayName: 'x', gymId, gymName: gymId === 'rokaz' ? 'Gimnasio A' : 'Gimnasio B', kind, durationSec: 3600, exercises: ex.map(([name, sets]) => ({ name, type: 'Piernas', sets })) });
const SESSIONS = [
  SS('b3', '2026-10-23T19:00', 'raydac', 'b-bom', 'bombeo', [['Sentadilla Hack', S(50, 15, 2)], ['Curl Bíceps', S(8, 20, 1)]]),
  SS('b2', '2026-10-21T19:00', 'raydac', 'b-pes', 'fuerza', [['Prensa 45°', S(160, 10, 3)], ['Sentadilla Hack', S(80, 10, 2)], ['Press Banca Plano (Barra)', S(60, 8, 2)], ['Extensión de Pierna', S(50, 7, 1)], ['Curl Bíceps', S(15, 6, 0)]]),
  SS('a2', '2026-10-20T19:00', 'rokaz', 'a-pes', 'fuerza', [['Sentadilla Hack', S(55, 10, 2)], ['Prensa 45°', S(155, 10, 3)], ['Remo Sentado con Cable', S(60, 10, 2)], ['Elevación de Talones en Prensa', S(100, 15, 2)], ['Press Militar con Barra', S(40, 8, 2)]]),
  SS('b1', '2026-10-19T19:00', 'raydac', 'b-pes', 'fuerza', [['Extensión de Pierna', S(50, 6, 1)], ['Curl Bíceps', S(15, 6, 0)], ['Prensa 45°', S(150, 10, 2)]]),
];
const GYMS = [{ id: 'rokaz', name: 'Gimnasio A' }, { id: 'raydac', name: 'Gimnasio B' }];
const SETTINGS = Object.assign(structuredClone(OWNER_SETTINGS), { activePlanId: 'planB', activeGymId: 'raydac', planByGym: { rokaz: 'planA', raydac: 'planB' }, newsSeen: 'n6' });
SETTINGS.prof = Object.assign({}, SETTINGS.prof, { goal: 'musculo', mins: 75 });

async function open({ watch, settings, plans, sessions } = {}) {
  const srv = await serve(DIR);
  const ctx = await browser.newContext(watch ? { viewport: { width: 410, height: 500 }, hasTouch: true } : { viewport: { width: 390, height: 844 }, hasTouch: true });
  await ctx.route(/googleapis|gstatic|google\.com|firebase|github/, r => r.abort());
  const p = await ctx.newPage(); p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message));
  await p.clock.setFixedTime(new Date('2026-10-25T10:00:00'));
  await p.addInitScript(([s, pl, ss, g]) => { if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    localStorage.setItem('cdh.settings', JSON.stringify(s)); localStorage.setItem('cdh.plans', JSON.stringify(pl)); localStorage.setItem('cdh.sessions', JSON.stringify(ss));
    localStorage.setItem('cdh.gyms', JSON.stringify(g)); localStorage.setItem('cdh.newsSeen', '"n6"'); localStorage.setItem('cdh.reminders', '[]'); }, [settings || SETTINGS, plans || PLANS, sessions || SESSIONS, GYMS]);
  await p.goto(`http://127.0.0.1:${srv.address().port}/index.html`); await p.waitForTimeout(2000);
  await p.evaluate(() => { state.settings.healthOk = 1; closeSheet(); render(); });
  p.done = async () => { await ctx.close(); srv.close(); };
  return p;
}
const shot = async (p, n) => { if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await p.screenshot({ path: path.join(SHOTS, n + '.png') }); } };
const noErr = p => ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
/* Coach de un ejercicio de la rutina (como lo usa la app) */
const CO = (p, gym, kind, name, sets = 3) => p.evaluate(([gym, kind, name, sets]) => { const c = pgCoach({ name, sets, type: typeOf(name), weight: 0 }, gym, kind); return { w: c.w, mode: c.mode, why: c.why, goal: c.goal[0], rx: c.rx, rir: c.rirT, src: c.src }; }, [gym, kind, name, sets]);

console.log('A. Reglas de progresión');
{
  const p = await open();
  const up = await CO(p, 'raydac', 'fuerza', 'Prensa 45°');
  ok(up.mode === 'up' && up.w === 165 && up.goal === 6 && up.rx.rMin === 6 && up.rx.rMax === 10, `subir: 1.ª serie 160×10 @3 (tope 10, RIR 3) → ${up.w} kg y vuelve a ${up.goal} reps · ${up.why}`);
  const hold = await CO(p, 'raydac', 'fuerza', 'Press Banca Plano (Barra)');
  ok(hold.mode === 'hold' && hold.w === 60 && hold.goal === 9, `mantener: 60×8 @2 dentro del rango → 60 kg y busca 9 · ${hold.why}`);
  const down = await CO(p, 'raydac', 'fuerza', 'Extensión de Pierna');
  ok(down.mode === 'down' && down.w < 50, `bajar: dos sesiones bajo 8 reps (50×6, 50×7) → ${down.w} kg · ${down.why}`);
  const adj = await p.evaluate(() => { const L = state.sessions.find(s => s.id === 'b2'); const e = L.exercises.find(x => x.name === 'Press Banca Plano (Barra)'); e.sets = [{ w: 60, r: 13, rir: 3 }, { w: 60, r: 12, rir: 2 }]; const c = pgCoach({ name: 'Press Banca Plano (Barra)', sets: 3, type: 'Empuje' }, 'raydac', 'fuerza'); e.sets = [{ w: 60, r: 8, rir: 2 }]; return { w: c.w, why: c.why }; });
  ok(adj.w === 62.5 && /tope de subida/.test(adj.why), `3 reps sobre el tope (60×13): por el 1RM estimado y con tope de +5 % en tren superior → ${adj.w} kg · ${adj.why}`);
  const pes = await CO(p, 'raydac', 'fuerza', 'Sentadilla Hack'), bom = await CO(p, 'raydac', 'bombeo', 'Sentadilla Hack');
  ok(pes.w === 80 && bom.w === 55 && bom.mode === 'up' && bom.rx.rMin === 12, `pesado y bombeo por separado: Hack pesado ${pes.w} kg (${pes.mode}), bombeo ${bom.w} kg (${bom.mode}, ${bom.rx.rMin}-${bom.rx.rMax})`);
  const rirC = await CO(p, 'raydac', 'bombeo', 'Prensa 45°'), rirA = await CO(p, 'raydac', 'bombeo', 'Curl Bíceps');
  ok(Math.min(...rirC.rir) >= 1 && rirA.rir.includes(0) && rirC.rx.restMin >= 90, `RIR 0 solo en aislamiento: Prensa bombeo RIR ${rirC.rir.join(',')}, Curl ${rirA.rir.join(',')}; compuestos con 90 s mínimo (${rirC.rx.restMin} s)`);
  noErr(p); await p.done();
}

console.log('B. Descarga');
{
  const p = await open();
  const D = await p.evaluate(() => { state.tab = 'train'; render(); const card = document.querySelector('.pg-dl'), stalls = pgStalls(activePlan());
    card.querySelector('[data-pg="dl-on"]').click(); const c = pgCoach({ name: 'Prensa 45°', sets: 4, type: 'Piernas' }, 'raydac', 'fuerza');
    state.settings.nextS = { 'b-pes': { pick: 'plan' } }; startSession('planB', 'b-pes'); const n = state.draft.exercises[0].log.length; discardSession();
    return { card: !!card, stalls, w: c.w, rir: c.rirT, mode: c.mode, n }; });
  ok(D.card && D.stalls.length >= 2, `varios ejercicios dos veces bajo el mínimo (${D.stalls.join(', ')}): propone semana de descarga`);
  ok(D.mode === 'down' && D.w < 165 && D.rir.every(x => x === 3) && D.n === 2, `aceptada: −10 %, RIR 3 y la mitad de series (Prensa ${D.w} kg, ${D.n} series)`);
  noErr(p); await p.done();
}

console.log('C. Por gimnasio');
{
  const p = await open();
  const hA = await CO(p, 'rokaz', 'fuerza', 'Sentadilla Hack'), hB = await CO(p, 'raydac', 'fuerza', 'Sentadilla Hack');
  ok(hA.w === 55 && hB.w === 80, `Hack muy distinta: Gimnasio A ${hA.w} kg, Gimnasio B ${hB.w} kg (cada uno con lo suyo)`);
  const pA = await CO(p, 'rokaz', 'fuerza', 'Prensa 45°'), pB = await CO(p, 'raydac', 'fuerza', 'Prensa 45°');
  ok(pA.w === 160 && pB.w === 165, `Prensa parecida: A ${pA.w} kg, B ${pB.w} kg (sin mezclar)`);
  const m = await CO(p, 'raydac', 'fuerza', 'Remo Sentado con Cable');
  ok(m.w === 47.5 && /Primera vez en esta máquina/.test(m.why) && /ajusta tras la primera serie/.test(m.why), `máquina hecha solo en A (60×10) → B por primera vez: ${m.w} kg (−20 %) · ${m.why}`);
  const rt = await CO(p, 'raydac', 'fuerza', 'Elevación de Talones en Prensa');
  ok(/proporción entre gimnasios/.test(rt.why) && rt.w >= 100, `misma máquina (prensa) hecha en los dos: usa la proporción · ${rt.why}`);
  const fr = await CO(p, 'raydac', 'fuerza', 'Press Militar con Barra');
  ok(fr.w === 40 && /Peso libre/.test(fr.why), `peso libre: el del otro gimnasio tal cual (${fr.w} kg)`);
  const F = await p.evaluate(() => { const x = LIB.find(y => y.name === 'Sentadilla Hack'); exActions(x.key); const t = document.getElementById('sheet').textContent; return { a: /Gimnasio A.*Mejor: 55×10/s.test(t), b: /Gimnasio B.*Mejor: 80×10/s.test(t), last: /Última: 55×10 @2/.test(t), warn: /no se comparan entre gimnasios/.test(t), type: !!document.querySelector('#sheet .pg-type') }; });
  ok(F.a && F.b && F.last && F.warn, 'ficha: mejor marca y última vez por gimnasio, y que la máquina no se compara entre gimnasios');
  await shot(p, 'c-ficha');
  noErr(p); await p.done();
}

console.log('D. Objetivo: Hipertrofia frente a Fuerza');
{
  const p = await open();
  const h = await CO(p, 'raydac', 'fuerza', 'Prensa 45°');
  await p.evaluate(() => { state.settings.prof = Object.assign({}, state.settings.prof, { goal: 'fuerza' }); });
  const f = await CO(p, 'raydac', 'fuerza', 'Prensa 45°'), fi = await CO(p, 'raydac', 'fuerza', 'Curl Bíceps'), fb = await CO(p, 'raydac', 'bombeo', 'Prensa 45°');
  ok(h.rx.rMin === 6 && h.rx.rMax === 10 && f.rx.rMin === 3 && f.rx.rMax === 6 && f.rx.rirMin === 2 && f.rx.rest >= 180, `compuesto pesado: hipertrofia ${h.rx.rMin}-${h.rx.rMax}, fuerza ${f.rx.rMin}-${f.rx.rMax} RIR ${f.rx.rirMin}-${f.rx.rirMax} descanso ${f.rx.rest} s`);
  ok(fi.rx.rMin === 8 && fb.rx.rMin === 12, 'con Fuerza, el aislamiento y el bombeo siguen como en hipertrofia');
  const T = await p.evaluate(async () => { state.settings.prof = Object.assign({}, state.settings.prof); delete state.settings.prof.goal; delete state.settings.prof.mins;
    dataSheet(); const sel = document.getElementById('bd-goal'), opts = Array.prototype.map.call(sel.options, o => o.textContent), r = { g: pgGoal(), sel: sel.value, opts, ph: document.getElementById('bd-mins').placeholder, avail: pgAvail() };
    sel.value = 'grasa'; document.getElementById('bd-mins').value = '60'; document.getElementById('f-bdd').requestSubmit(); await new Promise(x => setTimeout(x, 80));
    r.after = { g: pgGoal(), mins: state.settings.prof.mins, avail: pgAvail(), rest: pgRx('Curl Bíceps', 'fuerza').rest }; return r; });
  ok(T.g === 'hiper' && T.sel === '' && T.opts.join('|') === 'Ganar músculo (por defecto)|Ganar músculo|Ganar fuerza|Perder grasa|Salud y energía|Movilidad y equilibrio' && T.ph === '75' && T.avail === 75, 'Tus datos: los 5 objetivos de la bienvenida (Ganar músculo por defecto); tiempo disponible 75 min por defecto');
  ok(T.after.g === 'grasa' && T.after.mins === 60 && T.after.avail === 60 && T.after.rest === 90, 'Perder grasa y 60 min se guardan; con Perder grasa los descansos van al mínimo del rango');
  noErr(p); await p.done();
}

console.log('E. Catálogo, ejercicios importados y ficha');
{
  const p = await open();
  const E = await p.evaluate(() => {
    const n = {}; LIB.forEach(x => { n[x.ptype] = (n[x.ptype] || 0) + 1; });
    const t = nm => pgTypeOf(nm);
    const r = { n, total: LIB.length, all: LIB.every(x => PG_T[x.ptype]),
      ej: [t('Prensa 45°'), t('Sentadilla Hack'), t('Peso Muerto Rumano'), t('Extensión de Pierna'), t('Curl Femoral Tumbado'), t('Curl Bíceps'), t('Tríceps Polea'), t('Hip Thrust'), t('Abducción de Cadera'), t('Elevaciones Laterales'), t('Face Pull'), t('Elevación de Talones Sentado'), t('Crunch Abdominal'), t('Jalón al Pecho'), t('Dominadas')].join(','),
      imp: [t('Remo Pendlay con Pausa Larga'), t('Gemelo Raro en Aparato'), t('Movimiento Inventado XYZ')].join(',') };
    const x = LIB.find(y => y.name === 'Remo al Mentón con Barra'); exActions(x.key);
    document.querySelector('#sheet .pg-type [data-pg-t="peq"]').click(); r.man = t('Remo al Mentón con Barra'); r.saved = state.settings.exType && Object.values(state.settings.exType).indexOf('peq') >= 0;
    document.querySelector('#sheet .pg-type [data-pg-t="auto"]').click(); r.auto = t('Remo al Mentón con Barra');
    return r; });
  ok(E.all && E.total >= 400, `los ${E.total} ejercicios del catálogo tienen tipo: ${JSON.stringify(E.n)}`);
  ok(E.ej === 'comp,comp,comp,aisl,aisl,aisl,aisl,glu,glu,peq,peq,peq,peq,comp,comp', 'ejemplos por movimiento y músculo: ' + E.ej);
  ok(E.imp === 'comp,peq,aisl', 'importados o escritos a mano: por músculo y equipo del nombre; si no se puede, aislamiento: ' + E.imp);
  ok(E.man === 'peq' && E.saved && E.auto === 'aisl', 'el tipo se cambia a mano desde la ficha y se puede volver al automático');
  noErr(p); await p.done();
}

console.log('F. El plan muestra los valores del coach; la opción Coach explica cada cambio');
{
  const p = await open();
  const P = await p.evaluate(() => { state.tab = 'plans'; state.rtOpen = { 'b-pes': true }; render();
    const row = n => { const b = Array.prototype.find.call(document.querySelectorAll('.rt-exm'), x => x.querySelector('b').textContent === n); return b ? b.querySelector('small').textContent.replace(/\s+/g, ' ') : ''; };
    const r = { prensa: row('Prensa 45°'), curl: row('Curl Bíceps') };
    state.settings.nextS = { 'b-pes': { pick: 'coach' } }; state.tab = 'train'; render();
    const why = document.querySelector('.pg-why'); r.why = why ? Array.prototype.map.call(why.querySelectorAll('.pg-wr'), x => x.textContent.replace(/\s+/g, ' ')).slice(0, 3) : [];
    state.settings.nextS = { 'b-pes': { pick: 'plan' } }; startSession('planB', 'b-pes'); const e = state.draft.exercises[0]; r.ses = { w: e.log[0].w, min: e.repsMin, max: e.repsMax, rest: e.rest, rir: e.rirT.join(',') }; discardSession();
    return r; });
  ok(/Compuesto · 3 × 6-10 · 165 kg/.test(P.prensa) && /RIR 1-3/.test(P.prensa) && /2:30/.test(P.prensa), 'Mi plan: Prensa con el tipo, el rango, el peso y el descanso del coach: ' + P.prensa);
  ok(/Aislamiento/.test(P.curl) && !/ 10 kg/.test(P.curl), 'y no los valores viejos de la rutina: ' + P.curl);
  ok(P.why.length === 3 && /Prensa 45°.*165 kg.*Sube/.test(P.why[0]), 'opción Coach: una línea por ejercicio con el porqué · ' + P.why[0]);
  ok(P.ses.w === 165 && P.ses.min === 6 && P.ses.max === 10 && P.ses.rest === 150 && P.ses.rir === '3,2,1', `al entrenar con el plan, la sesión usa los valores del coach (${JSON.stringify(P.ses)})`);
  await shot(p, 'f-plan');
  noErr(p); await p.done();
}

console.log('G. Tiempo: un día que pasa del tiempo disponible');
{
  const s = structuredClone(SETTINGS); s.prof.mins = 45;
  const p = await open({ settings: s });
  const G = await p.evaluate(() => { state.tab = 'plans'; state.rtOpen = { 'b-pes': true }; render();
    const est = pgDayEst(findDay('planB', 'b-pes').d), fitb = !!document.querySelector('.pg-fitb'), dur = (document.querySelector('.rt-head[data-day="b-pes"] .pg-dur') || {}).textContent;
    document.querySelector('[data-pg="fit-open"]').click();
    const F = pgFit(findDay('planB', 'b-pes').p, findDay('planB', 'b-pes').d), ks = F.props.map(x => x.k);
    const vol0 = pgPlanVol(activePlan());
    document.querySelector('#sheet [data-pg="fit"][data-i="0"]').click();
    const d = findDay('planB', 'b-pes').d, ss = d.exercises.filter(e => e.ss).map(e => e.name);
    const del = F.props.find(x => x.k === 'del'); let delOk = null;
    if (del) { const i = F.props.indexOf(del); const i2 = pgFit(findDay('planB', 'b-pes').p, d).props.findIndex(x => x.k === 'del'); const b = document.querySelector(`#sheet [data-pg="fit"][data-i="${i2}"]`); b.click(); const ask = /Toca otra vez/.test(document.querySelector(`#sheet [data-pg="fit"][data-i="${i2}"]`).textContent); const n0 = d.exercises.length; document.querySelector(`#sheet [data-pg="fit"][data-i="${i2}"]`).click(); delOk = ask && findDay('planB', 'b-pes').d.exercises.length === n0 - 1; void i; }
    const vol1 = pgPlanVol(activePlan()), keep = Object.keys(vol0).every(k => vol0[k] < 10 || vol1[k] >= 10);
    return { est: Math.round(est / 60), fitb, dur, ks, ss, delOk, keep, est1: Math.round(pgDayEst(findDay('planB', 'b-pes').d) / 60) }; });
  ok(G.est > 45 && G.fitb && /≈ \d+ min/.test(G.dur), `duración estimada en el día (${G.dur}) y aviso de que pasa de 45 min`);
  const order = ['ss', 'rest', 'move', 'del'], idx = G.ks.map(k => order.indexOf(k));
  ok(G.ks.length && G.ks[0] === 'ss' && idx.every((v, i) => !i || v >= idx[i - 1]), 'ajustes en orden: superseries → descansos → mover una serie → quitar: ' + G.ks.join(', '));
  ok(G.ss.length === 1 && G.ss.every(n => ['Curl Bíceps', 'Tríceps Polea', 'Elevaciones Laterales', 'Extensión de Pierna'].indexOf(n) >= 0), 'superserie aplicada solo en aislamiento/pequeños: ' + G.ss.join(', '));
  ok(G.delOk !== false && G.keep, 'quitar un ejercicio pide confirmación y ningún músculo baja de 10 series por eso');
  ok(G.est1 < G.est, `el día queda más corto (${G.est} → ${G.est1} min)`);
  noErr(p); await p.done();
}

console.log('H. Sesión atrasada y descansos largos');
{
  const p = await open();
  const H = await p.evaluate(() => {
    state.settings.nextS = { 'b-pes': { pick: 'plan' } }; startSession('planB', 'b-pes'); const d = state.draft, now = Date.now();
    const est = d.estSec; d.start = new Date(now - 40 * 60000).toISOString();
    [0, 1].forEach(j => markSet(0, j, true)); state.rest = null;
    d.exercises[0].log[0].at = now - 12 * 60000; d.exercises[0].log[1].at = now - 6 * 60000; markSet(0, 2, true); d.exercises[0].log[2].at = now; state.rest = null; render();
    const L = pgLate(d), box = Array.prototype.map.call(document.querySelectorAll('#sx .pg-late'), x => x.textContent.replace(/\s+/g, ' '));
    const btn = document.querySelector('[data-pg="late-rest"]'); let cut = null; if (btn) { const before = d.exercises.find(e => e.name === 'Curl Bíceps').rest; btn.click(); cut = [before, state.draft.exercises.find(e => e.name === 'Curl Bíceps').rest]; }
    state.rest = null; const at = Date.now(); d.exercises.forEach(e => e.log.forEach(s => { if (!s.done) { s.done = true; s.r = 10; } }));
    finishSession(); closeSheet(); const s = state.sessions[0];
    return { est: Math.round(est / 60), late: Math.round(L.late / 60), tips: L.tips.map(t => t.k), rw: L.restWarn, box, cut, saved: { est: s.estSec, rr: s.restReal, rc: s.restRec }, exp: aixSessLine(s), fs: typeof fsHtml === 'function' ? fsHtml(s, {}) : '' };
  });
  ok(H.late >= 5 && H.tips.length >= 1 && H.box.some(t => /Vas \d+ min atrasado/.test(t)), `atrasado ${H.late} min: sugiere ${H.tips.join(', ')}`);
  ok(H.rw && H.rw.a > H.rw.b && H.box.some(t => /Tus descansos van en/.test(t)), `descansos reales mucho más largos: ${H.rw && H.rw.a} s de media frente a ${H.rw && H.rw.b} s`);
  ok(H.cut && H.cut[1] < H.cut[0], `"Acortar descansos" deja el aislamiento en su mínimo (${H.cut && H.cut.join(' → ')} s)`);
  ok(H.saved.est && H.saved.rr && /estimada \d+ min/.test(H.exp) && /descanso medio .* \(recomendado /.test(H.exp) && /estimada/.test(H.fs), 'resumen y exportación: duración real frente a la estimada y descanso medio frente al recomendado');
  noErr(p); await p.done();
}

console.log('I. Volumen semanal del plan');
{
  const p = await open();
  const V = await p.evaluate(() => { state.tab = 'plans'; render(); const card = document.querySelector('.pg-vol'), t = card ? card.textContent.replace(/\s+/g, ' ') : '';
    const v0 = pgPlanVol(activePlan()), add = document.querySelector('.pg-vol [data-pg="vol-add"],.pg-vol [data-pg="vol-more"]'); let after = null;
    if (add) { const k = add.dataset.k; add.click(); after = pgPlanVol(activePlan()); return { t, low: Object.keys(v0).filter(x => v0[x] < 10), grew: Object.keys(v0).some(x => after[x] > v0[x]) }; }
    return { t, low: Object.keys(v0).filter(x => v0[x] < 10), grew: false }; });
  ok(/Series por músculo en tu plan/.test(V.t) && V.low.length && /Pantorrillas/.test(V.t), 'avisa de los músculos bajo 10 series (p. ej. pantorrillas) y sugiere qué agregar');
  ok(V.grew, 'el botón agrega series al plan');
  noErr(p); await p.done();
}

console.log('J. Exportaciones');
{
  const p = await open();
  const X1 = await p.evaluate(() => ({ s: sessionPrompt([state.sessions[0]]), w: aixWeekText(0).txt }));
  for (const [n, t] of [['sesión', X1.s], ['semana', X1.w]]) ok(/SISTEMA DE MI COACH/.test(t) && /Objetivo: Ganar músculo: /.test(t) && /Compuesto: pesado 6-10 reps/.test(t) && /Subir: si en la 1\.ª serie/.test(t) && /Tiempo disponible por sesión: 75 min/.test(t) && /NO son comparables entre gimnasios/.test(t) && /gimnasio Gimnasio B/.test(t), `${n}: objetivo, rangos por tipo, RIR, regla de subida, descansos, tiempo y que las máquinas no se comparan entre gimnasios`);
  ok(/\[compuesto\] 3×6-10 165 kg RIR 1-3/.test(X1.w), 'la rutina exportada lleva los valores del coach');
  noErr(p); await p.done();
}

console.log('K. Reloj: misma duración y descansos del coach');
{
  const p = await open({ watch: true });
  const W = await p.evaluate(() => { state.settings.nextS = { 'b-pes': { pick: 'plan' } }; startSession('planB', 'b-pes'); const d = state.draft; render();
    return { w: isWatch(), est: wovEst(d) === pgDraftEst(d), rest: d.exercises.map(e => e.rest).join(','), rx: d.exercises.map(e => pgRx(e.name, d.kind).rest).join(','), ov: !!document.getElementById('w2-ov') }; });
  ok(W.w && W.est && W.rest === W.rx && W.ov, 'el aviso de tiempo del reloj usa la duración y los descansos recomendados por el coach');
  noErr(p); await p.done();
}

console.log('L. Dueño de versiones antiguas (sin prof ni campos nuevos)');
{
  const s = structuredClone(SETTINGS); delete s.prof; delete s.planByGym;
  const p = await open({ settings: s });
  const L = await p.evaluate(() => { const r = { g: pgGoal(), a: pgAvail() }; state.tab = 'plans'; render(); state.tab = 'settings'; render(); document.querySelectorAll('#app details').forEach(d => { d.open = true; }); state.tab = 'train'; render(); dataSheet(); closeSheet();
    state.settings.nextS = {}; startSession(activePlan().id, activePlan().days[0].id); markSet(0, 0, true); state.rest = null; render(); r.ok = !!document.getElementById('sx'); discardSession(); return r; });
  ok(L.g === 'hiper' && L.a === 75 && L.ok, 'sin prof: Hipertrofia y 75 min por defecto; plan, Ajustes, Hoy, Tus datos y sesión funcionan');
  noErr(p); await p.done();
}

console.log('M. Peso máximo por ejercicio y gimnasio');
{
  const p = await open();
  const M = await p.evaluate(() => {
    const base = state.sessions.slice(), key = exHKey('Prensa 45°');
    const run = (reps, cap) => {   /* sesiones de Prensa de fuerza en el Gimnasio B, de la más vieja a la más nueva */
      state.sessions = reps.map((r, i) => ({ id: 'm' + i, date: new Date(Date.UTC(2026, 9, 12 + i, 18)).toISOString(), planId: 'planB', dayId: 'b-pes', dayName: 'x', gymId: 'raydac', kind: 'fuerza', exercises: [{ name: 'Prensa 45°', sets: [{ w: cap, r, rir: 1 }, { w: cap, r: r - 1, rir: 1 }, { w: cap, r: r - 2, rir: 0 }] }, { name: 'Sentadilla Hack', sets: [{ w: 80, r: 8, rir: 2 }] }] })).reverse();
      const c = pgCoach({ name: 'Prensa 45°', sets: 3, type: 'Piernas' }, 'raydac', 'fuerza'); return { w: c.w, mode: c.mode, why: c.why, goal: c.goal[0], n: c.n, rMin: c.rx.rMin, rMax: c.rx.rMax, alt: c.alt };
    };
    state.settings.exMax = { raydac: { [key]: 200 } };
    const out = { reps: run([14, 16], 200), tempo: run([16, 16, 16], 200), pausa: run([16, 16, 16, 16, 16], 200), serie: run([16, 16, 16, 16, 16, 16, 16], 200), t30: run([30], 200) };
    state.sessions = base;
    state.settings.exMax = { raydac: { [key]: 162.5 } }; const cl = pgCoach({ name: 'Prensa 45°', sets: 3, type: 'Piernas' }, 'raydac', 'fuerza'); out.clamp = { w: cl.w, mode: cl.mode, why: cl.why };
    const oa = pgCoach({ name: 'Prensa 45°', sets: 3, type: 'Piernas' }, 'rokaz', 'fuerza'); out.otro = oa.w;
    /* ficha: editar el peso máximo por gimnasio */
    state.settings.exMax = {}; const x = LIB.find(y => y.name === 'Prensa 45°'); exActions(x.key);
    const ins = document.querySelectorAll('#sheet .pg-max [data-pg-mx]'); out.inputs = ins.length;
    document.querySelector('#sheet .pg-max [data-pg-mx="raydac"]').value = '200'; document.querySelector('#sheet [data-pg-mxs]').click();
    out.saved = JSON.stringify(state.settings.exMax); out.k = key;
    /* sesión con "una serie más" */
    state.sessions = [16, 16, 16, 16, 16, 16, 16].map((r, i) => ({ id: 'q' + i, date: new Date(Date.UTC(2026, 9, 12 + i, 18)).toISOString(), planId: 'planB', dayId: 'b-pes', dayName: 'x', gymId: 'raydac', kind: 'fuerza', exercises: [{ name: 'Prensa 45°', sets: [{ w: 200, r, rir: 1 }, { w: 200, r: r - 1, rir: 1 }, { w: 200, r: r - 2, rir: 0 }] }] })).reverse();
    closeSheet(); state.settings.nextS = { 'b-pes': { pick: 'plan' } }; startSession('planB', 'b-pes'); const e = state.draft.exercises.find(z => z.name === 'Prensa 45°');
    out.ses = { n: e.log.length, w: e.log[0].w, min: e.repsMin, max: e.repsMax, head: e.coach.head.replace(/<[^>]+>/g, '') }; discardSession();
    state.tab = 'plans'; state.rtOpen = { 'b-pes': true }; render(); const b = Array.prototype.find.call(document.querySelectorAll('.rt-exm'), y => y.querySelector('b').textContent === 'Prensa 45°'); out.plan = b ? b.querySelector('small').textContent.replace(/\s+/g, ' ') : '';
    state.sessions = base; return out;
  });
  ok(M.reps.mode === 'cap' && M.reps.w === 200 && M.reps.goal === 17 && /más reps/.test(M.reps.why), `en el máximo (200 kg) no sube: más reps → ${M.reps.goal} · ${M.reps.why}`);
  ok(M.reps.rMin === 12 && M.reps.rMax === 30, `usa rangos de bombeo (hasta 30) también en el día pesado (${M.reps.rMin}-${M.reps.rMax})`);
  ok(/bajada lenta/.test(M.tempo.why) && /Cambié de método/.test(M.tempo.why), 'estancado en reps (dos sesiones sin mejorar): bajada lenta de 3-4 s · ' + M.tempo.why);
  ok(/pausa/.test(M.pausa.why), 'estancado con la bajada lenta: pausa abajo · ' + M.pausa.why);
  ok(/una serie más/.test(M.serie.why) && M.serie.n === 4, 'estancado con la pausa: una serie más (4 series)');
  ok(/bajada lenta/.test(M.t30.why), 'al llegar a 30 reps pasa a la bajada lenta');
  ok(M.reps.alt === 'Sentadilla Hack' && /usa Sentadilla Hack/.test(M.reps.why), 'sugiere otro del mismo músculo para lo pesado: ' + M.reps.alt);
  ok(M.clamp.w === 162.5 && M.clamp.mode === 'cap' && /Llegas a tu peso máximo/.test(M.clamp.why), 'si la subida pasaría del máximo, se queda en el máximo y lo avisa · ' + M.clamp.why);
  ok(M.otro === 160, 'el máximo es por gimnasio: en el Gimnasio A no cambia (' + M.otro + ' kg)');
  ok(M.inputs === 2 && M.saved === JSON.stringify({ rokaz: {}, raydac: { [M.k]: 200 } }), 'la ficha edita el peso máximo de cada gimnasio: ' + M.saved);
  ok(M.ses.n === 4 && M.ses.w === 200 && M.ses.min === 12 && M.ses.max === 30 && /Peso máximo: 200 kg/.test(M.ses.head), `la sesión lo aplica: ${M.ses.n} series de 200 kg, ${M.ses.min}-${M.ses.max} · ${M.ses.head}`);
  ok(/peso máximo/.test(M.plan) && /200 kg/.test(M.plan), 'Mi plan lo muestra: ' + M.plan);
  noErr(p); await p.done();
}

console.log('Q. Saltos grandes (caso real: Prensa 190×15 @3 → el coach proponía 230 kg × 10)');
{
  const p = await open();
  const Q = await p.evaluate(() => {
    const base = state.sessions.slice(), out = {};
    const one = (name, sets, kind) => { state.sessions = [{ id: 'q', date: new Date(Date.UTC(2026, 9, 24, 18)).toISOString(), planId: 'planB', dayId: kind === 'bombeo' ? 'b-bom' : 'b-pes', dayName: 'x', gymId: 'raydac', kind: kind || 'fuerza', exercises: [{ name, sets }] }]; };
    const C = (name, kind) => { const c = pgCoach({ name, sets: 3, type: typeOf(name) }, 'raydac', kind || 'fuerza'); return { w: c.w, goal: c.goal[0], mode: c.mode, why: c.why }; };
    one('Prensa 45°', [{ w: 190, r: 15, rir: 3 }, { w: 190, r: 14, rir: 2 }, { w: 190, r: 13, rir: 1 }]); out.real = C('Prensa 45°');
    state.settings.nextS = { 'b-pes': { pick: 'plan' } }; startSession('planB', 'b-pes'); render();
    const i = state.draft.exercises.findIndex(e => e.name === 'Prensa 45°'), e = state.draft.exercises[i];
    out.ses = { w: e.log[0].w, ph: (document.getElementById('r-' + i + '-0') || {}).placeholder, head: e.coach.head.replace(/<[^>]+>/g, '') };
    markSet(i, 0, true); out.marked = state.draft.exercises[i].log[0].r; state.rest = null; discardSession();
    one('Sentadilla Hack', [{ w: 80, r: 20, rir: 2 }]); out.hack = C('Sentadilla Hack');
    one('Press Banca Plano (Barra)', [{ w: 60, r: 16, rir: 2 }]); out.banca = C('Press Banca Plano (Barra)');
    one('Prensa 45°', [{ w: 160, r: 11, rir: 3 }]); out.uno = C('Prensa 45°');
    one('Prensa 45°', [{ w: 160, r: 10, rir: 3 }]); out.normal = C('Prensa 45°');
    state.settings.nextS = { 'b-pes': { pick: 'plan' } }; startSession('planB', 'b-pes'); render();
    out.normalPh = (document.getElementById('r-' + state.draft.exercises.findIndex(x => x.name === 'Prensa 45°') + '-0') || {}).placeholder; discardSession();
    one('Sentadilla Hack', [{ w: 50, r: 15, rir: 2 }], 'bombeo'); out.kref = C('Sentadilla Hack', 'fuerza');
    one('Prensa 45°', [{ w: 160, r: 3, rir: 1 }]); out.bajo = C('Prensa 45°');
    state.sessions = base; return out;
  });
  ok(Q.real.w === 200 && Q.real.w - 190 <= 10 && Q.real.mode === 'up', `caso real 190×15 @3: sube a ${Q.real.w} kg (tope de piernas +10 kg), no a 230`);
  ok(Q.real.goal === 10 && /1RM estimado ≈ 304 kg/.test(Q.real.why) && /tope de subida/.test(Q.real.why) && /Primera vez con este rango: empieza conservador y ajusta tras la 1\.ª serie/.test(Q.real.why), 'reps coherentes (10), por el 1RM estimado y con el aviso de rango nuevo · ' + Q.real.why);
  ok(Q.ses.w === 200 && Q.ses.ph === '10' && Q.marked === 10 && /Sube a 200 kg/.test(Q.ses.head), `en la sesión: ${Q.ses.w} kg y las casillas proponen ${Q.ses.ph} reps (marcar sin escribir guarda ${Q.marked})`);
  ok(Q.hack.w === 85 && Q.hack.w <= 88 && Q.hack.goal === 10 && /Primera vez con este rango/.test(Q.hack.why), `80×20 → rango 6-10: ${Q.hack.w} kg × ${Q.hack.goal} (+10 % como máximo en piernas)`);
  ok(Q.banca.w === 62.5 && (Q.banca.w + 20) <= 80 * 1.05 + 0.01, `tren superior 60×16 → ${Q.banca.w} kg (+5 % como máximo de la carga total)`);
  ok(Q.uno.w === 165 && Q.uno.goal === 6, `1 rep sobre el tope (160×11): ~4 % → ${Q.uno.w} kg y vuelve a ${Q.uno.goal}`);
  ok(Q.normal.w === 165 && Q.normal.goal === 6 && /vuelve a 6 reps/.test(Q.normal.why) && Q.normalPh === '6', 'subida normal: "vuelve a 6 reps" y las casillas proponen 6, no 10');
  ok(Q.kref.w <= 55 && Q.kref.goal >= 6 && Q.kref.goal <= 10 && /Primera vez con este rango/.test(Q.kref.why), `de bombeo (50×15) a pesado: ${Q.kref.w} kg × ${Q.kref.goal}, con tope y aviso · ${Q.kref.why}`);
  ok(Q.bajo.mode === 'down' && Q.bajo.w < 160 && /1RM estimado/.test(Q.bajo.why), `3+ reps bajo el rango: por el 1RM estimado → ${Q.bajo.w} kg · ${Q.bajo.why}`);
  noErr(p); await p.done();
}

console.log('P. Los 5 objetivos con sus reglas');
{
  const p = await open();
  const P = await p.evaluate(() => {
    const out = {}, ex = { name: 'Prensa 45°', sets: 3, type: 'Piernas' }, base = state.sessions.slice();
    const set = g => { state.settings.prof = Object.assign({}, state.settings.prof, { goal: g }); };
    const add = (id, day, sets) => state.sessions.unshift({ id, date: new Date(Date.UTC(2026, 9, day, 18)).toISOString(), planId: 'planB', dayId: 'b-pes', dayName: 'x', gymId: 'raydac', kind: 'fuerza', exercises: [{ name: 'Prensa 45°', sets }] });
    const S = (w, r, rir) => [0, 1, 2].map(() => ({ w, r, rir }));
    ['musculo', 'fuerza', 'grasa', 'salud', 'mayor'].forEach(g => { set(g); const rx = pgRx('Prensa 45°', 'fuerza'), ri = pgRx('Curl Bíceps', 'fuerza'); out[g] = { g: pgGoal(), rx: [rx.rMin, rx.rMax, rx.rirMin, rx.rirMax, rx.rest].join(','), ri: [ri.rMin, ri.rMax, ri.rirMin, ri.rirMax, ri.rest].join(','), exp: sessionPrompt([state.sessions[0]]) }; });
    /* Perder grasa: dos sesiones bajo el mínimo no bajan el peso; aviso de proteína */
    set('grasa'); const eg = pgCoach({ name: 'Extensión de Pierna', sets: 3, type: 'Piernas' }, 'raydac', 'fuerza'), hg = coachFor({ name: 'Extensión de Pierna', sets: 3, type: 'Piernas' }, 'raydac', 'fuerza');
    out.grasa.c = [eg.w, eg.mode].join(':'); out.grasa.why = eg.why; out.grasa.prot = hg.tips.some(t => /proteína/.test(t)); out.grasa.dl = pgStalls(activePlan()).length;
    state.tab = 'train'; render(); out.grasa.hoy = !!document.querySelector('.pg-prot');
    /* Salud: sube solo tras 2 sesiones completas en el tope (15 en todas) */
    set('salud'); state.sessions = base.slice(); add('s1', 24, S(150, 15, 3)); const s1 = pgCoach(ex, 'raydac', 'fuerza');
    add('s2', 25, S(150, 15, 3)); state.sessions.sort((a, b) => b.date.localeCompare(a.date)); const s2 = pgCoach(ex, 'raydac', 'fuerza');
    out.salud.c = [s1.w, s1.mode, s2.w, s2.mode].join(':'); out.salud.why = s1.why;
    /* Movilidad: subida de 2,5 kg como máximo (en pierna sería 5) y primero máquinas/equilibrio */
    set('mayor'); state.sessions = base.slice(); add('m1', 24, S(150, 20, 3)); const m = pgCoach(ex, 'raydac', 'fuerza');
    out.mayor.c = [m.w, m.mode].join(':');
    const cands = pgPrefer(['Sentadilla con Barra', 'Prensa 45°', 'Equilibrio en un Pie']); out.mayor.pref = cands.join(',');
    set('musculo'); state.sessions = base.slice(); add('h1', 24, S(150, 20, 3)); const h = pgCoach(ex, 'raydac', 'fuerza'); out.musculo.c = [h.w, h.mode].join(':');
    state.sessions = base; return out;
  });
  const G = { musculo: 'Ganar músculo', fuerza: 'Ganar fuerza', grasa: 'Perder grasa', salud: 'Salud y energía', mayor: 'Movilidad y equilibrio' };
  for (const g of Object.keys(G)) ok(P[g].exp.indexOf('Mi objetivo: ' + G[g]) >= 0 && P[g].exp.indexOf('Objetivo: ' + G[g] + ':') >= 0, `${G[g]}: la exportación dice el objetivo elegido y su regla`);
  ok(P.musculo.rx === '6,10,1,3,150' && P.musculo.ri === '8,12,0,2,105', 'Ganar músculo: el sistema de hipertrofia (Prensa 6-10 RIR 1-3; Curl 8-12 RIR 0-2)');
  ok(P.fuerza.rx === '3,6,2,3,240' && P.fuerza.ri === '8,12,0,2,105', 'Ganar fuerza: compuestos pesados 3-6 RIR 2-3 y 240 s; el resto como hipertrofia');
  ok(P.grasa.rx === '6,10,1,3,120' && P.grasa.ri === '8,12,0,2,90', 'Perder grasa: rangos de hipertrofia con los descansos al mínimo');
  ok(P.grasa.c === '50:hold' && /mantener ya es ganar/.test(P.grasa.why) && P.grasa.prot && P.grasa.hoy && P.grasa.dl === 0, 'Perder grasa: no baja el peso aunque rinda menos (mantener ya es ganar), sin descarga por eso y con aviso de proteína (coach y Hoy) · ' + P.grasa.why);
  ok(P.salud.rx === '10,15,2,3,150' && P.salud.ri === '10,15,2,3,105', 'Salud y energía: 10-15 reps, RIR 2-3, nunca al fallo');
  ok(P.salud.c === '150:hold:155:up' && /2 sesiones completas en el tope/.test(P.salud.why), 'Salud y energía: sube solo tras 2 sesiones completas en el tope · ' + P.salud.c);
  ok(P.mayor.rx === '12,20,3,3,150' && P.mayor.ri === '12,20,3,3,105', 'Movilidad y equilibrio: 12-20 reps, RIR 3, nunca al fallo');
  ok(P.mayor.c === '152.5:up' && P.musculo.c.split(':')[0] > 152.5, `Movilidad: sube como máximo 2,5 kg (${P.mayor.c}; con Ganar músculo ${P.musculo.c})`);
  ok(P.mayor.pref === 'Equilibrio en un Pie,Prensa 45°,Sentadilla con Barra', 'Movilidad: primero equilibrio y máquinas al sugerir ejercicios: ' + P.mayor.pref);
  noErr(p); await p.done();
}

console.log('N. Cardio / acondicionamiento, Plancha Copenhague y explosivos (revisados por el usuario)');
{
  const p = await open();
  const N = await p.evaluate(() => {
    const t = n => pgTypeOf(n);
    const cardio = ['Escaladores', 'Burpees', 'Saltos de Tijera', 'Cuerdas de Batalla', 'Paseo del Granjero', 'Equilibrio en un Pie', 'Empuje de Trineo', 'Arrastre de Trineo'].map(t);
    const ex = ['Cargada de Potencia', 'Thruster con Mancuernas', 'Thruster con Barra', 'Cargada con Kettlebell', 'Arranque con Kettlebell'].map(n => { const a = pgRx(n, 'fuerza'), b = pgRx(n, 'bombeo'); return [t(n), a.rMin, a.rMax, a.rirMin, b.rMin, b.rMax, b.rirMin].join(':'); });
    state.sessions.unshift({ id: 'c1', date: new Date(Date.UTC(2026, 9, 24, 18)).toISOString(), planId: 'planB', dayId: 'b-pes', dayName: 'x', gymId: 'raydac', kind: 'fuerza', exercises: [{ name: 'Burpees', sets: [{ w: 0, r: 15 }, { w: 0, r: 14 }] }, { name: 'Paseo del Granjero', sets: [{ w: 24, r: 40 }] }] });
    const cb = pgCoach({ name: 'Burpees', sets: 3, type: 'Core' }, 'raydac', 'fuerza'), cg = pgCoach({ name: 'Paseo del Granjero', sets: 2, type: 'Core' }, 'raydac', 'fuerza');
    const head = coachFor({ name: 'Burpees', sets: 3, type: 'Core' }, 'raydac', 'fuerza').head.replace(/<[^>]+>/g, '');
    state.sessions.shift();
    return { cardio, cop: t('Plancha Copenhague'), ex, doubt: LIB.filter(x => x.pdoubt).length, n: (() => { const o = {}; LIB.forEach(x => { o[x.ptype] = (o[x.ptype] || 0) + 1; }); return o; })(), cb: [cb.w, cb.goal[0], cb.mode].join(':'), cg: [cg.w, cg.goal[0]].join(':'), why: cg.why, head, sys: sessionPrompt([state.sessions[0]]) };
  });
  ok(N.cardio.every(x => x === 'cardio'), 'Cardio / acondicionamiento: escaladores, burpees, saltos de tijera, cuerdas, paseo del granjero, equilibrio y trineo');
  ok(N.cop === 'peq', 'Plancha Copenhague: Pequeño');
  ok(N.ex.every(x => x === 'comp:3:6:2:3:6:2'), 'explosivos: Compuesto con 3-6 reps y RIR 2 o más en los dos tipos de día: ' + N.ex[0]);
  ok(N.doubt === 0, `los dudosos quedan fijos en el catálogo (${JSON.stringify(N.n)})`);
  ok(N.cb === '0:17:hold' && N.cg === '24:44' && /mismo peso \(24 kg\)/.test(N.why) && !/RIR/.test(N.head), `cardio sin progresión de peso: Burpees 15 → ${N.cb.split(':')[1]}, Paseo del Granjero 24 kg × 40 → ${N.cg} · ${N.head}`);
  ok(/Cardio \/ acondicionamiento .*sin progresión de peso/.test(N.sys) && /Explosivos .*nunca al fallo/.test(N.sys), 'la exportación explica el cardio y los explosivos');
  noErr(p); await p.done();
}

console.log('O. Regulación de la máquina por gimnasio');
{
  const p = await open();
  const O = await p.evaluate(() => {
    state.settings.nextS = { 'b-pes': { pick: 'plan' } }; startSession('planB', 'b-pes'); render();
    const d = state.draft, iP = d.exercises.findIndex(e => e.name === 'Prensa 45°'), iB = d.exercises.findIndex(e => e.name === 'Press Banca Plano (Barra)');
    const card = i => document.querySelector(`#sx-pager .sx-page[data-i="${i}"] .card.ex`);
    const r = { add: !!card(iP).querySelector('.pg-reg.add'), free: !card(iB).querySelector('.pg-reg') };
    card(iP).querySelector('[data-pg-reg="edit"]').click();
    document.getElementById('pg-reg-in').value = 'asiento 4, rodillo 3, respaldo 2'; document.querySelector('[data-pg-reg="save"]').click();
    r.saved = ((state.settings.exReg || {}).raydac || {})[exHKey('Prensa 45°')];
    r.shown = card(iP).querySelector('.pg-reg').getAttribute('aria-label'); r.first = card(iP).querySelector('.su-pills').firstElementChild.classList.contains('pg-reg');
    card(iP).querySelector('[data-pg-reg="edit"]').click(); document.getElementById('pg-reg-in').value = 'asiento 5, rodillo 3'; document.querySelector('[data-pg-reg="save"]').click();
    r.edited = state.settings.exReg.raydac[exHKey('Prensa 45°')];
    discardSession();
    state.settings.nextS = { 'b-pes': { pick: 'plan' } }; startSession('planB', 'b-pes'); render(); r.again = card(iP).querySelector('.pg-reg') ? card(iP).querySelector('.pg-reg').getAttribute('aria-label') : ''; discardSession();
    state.settings.activeGymId = 'rokaz'; state.settings.nextS = { 'a-pes': { pick: 'plan' } }; startSession('planA', 'a-pes'); render();
    const iA = state.draft.exercises.findIndex(e => e.name === 'Prensa 45°'); r.other = !!document.querySelector(`#sx-pager .sx-page[data-i="${iA}"] .pg-reg.add`); discardSession();
    state.settings.activeGymId = 'raydac';
    const x = LIB.find(y => y.name === 'Prensa 45°'); exActions(x.key); r.ficha = document.querySelector('#sheet [data-pg-rg="raydac"]').value;
    const xb = LIB.find(y => y.name === 'Press Banca Plano (Barra)'); exActions(xb.key); r.fichaFree = !document.querySelector('#sheet [data-pg-rg]');
    return r;
  });
  ok(O.add && O.free, 'en una máquina se puede anotar la regulación; en peso libre no aparece');
  ok(O.saved === 'asiento 4, rodillo 3, respaldo 2' && /Regulación en Gimnasio B: asiento 4, rodillo 3, respaldo 2/.test(O.shown) && O.first, 'se guarda por gimnasio y se muestra en el ejercicio (primera píldora): ' + O.shown);
  ok(O.edited === 'asiento 5, rodillo 3' && /asiento 5, rodillo 3/.test(O.again), 'se edita durante la sesión y sale al volver a empezar ese ejercicio en ese gimnasio');
  ok(O.other, 'en el otro gimnasio no se muestra (cada gimnasio la suya)');
  ok(O.ficha === 'asiento 5, rodillo 3' && O.fichaFree, 'la ficha también la muestra y la deja editar por gimnasio');
  await shot(p, 'o-regulacion');
  noErr(p); await p.done();
  const s = structuredClone(SETTINGS); s.exReg = { raydac: { 'prensa 45°': 'asiento 4, rodillo 3' } };
  const w = await open({ watch: true, settings: s });
  const W = await w.evaluate(() => { state.settings.nextS = { 'b-pes': { pick: 'plan' } }; startSession('planB', 'b-pes'); render(); const sk = document.querySelector('[data-act="w2-wuskip"]'); if (sk) sk.click(); render(); return { w: isWatch(), t: document.getElementById('app').textContent }; });
  ok(W.w && /⚙ asiento 4, rodillo 3/.test(W.t), 'en el reloj se ve al empezar ese ejercicio');
  noErr(w); await w.done();
}

if (SHOTS) {   /* capturas para revisar a ojo (no cuentan como prueba) */
  const p = await open();
  await p.evaluate(() => { state.settings.nextS = { 'b-pes': { pick: 'coach' } }; state.tab = 'train'; render(); });
  await p.waitForTimeout(900); await shot(p, 'x-hoy-coach');
  ok(await p.evaluate(() => !!document.querySelector('#app .hoy-hero #btn-start') && !!document.querySelector('#app .pg-why')), 'Hoy se dibuja con la opción Coach y sus porqués');
  await p.evaluate(() => { state.tab = 'plans'; state.rtOpen = { 'b-pes': true }; render(); const r = document.querySelector('.rt-exm'); if (r) r.scrollIntoView({ block: 'start' }); });
  await p.waitForTimeout(900); await shot(p, 'x-plan');
  await p.evaluate(() => { const c = document.querySelector('.pg-vol'); if (c) c.scrollIntoView({ block: 'start' }); }); await p.waitForTimeout(300); await shot(p, 'x-volumen');
  await p.evaluate(() => { state.settings.prof.mins = 45; render(); pgFitSheet('planB', 'b-pes'); }); await p.waitForTimeout(400); await shot(p, 'x-ajustar');
  await p.evaluate(() => { closeSheet(); state.settings.exReg = { raydac: { [exHKey('Prensa 45°')]: 'asiento 4, rodillo 3, respaldo 2' } }; state.settings.nextS = { 'b-pes': { pick: 'plan' } }; startSession('planB', 'b-pes'); render(); });
  await p.waitForTimeout(1200); await p.evaluate(() => { const r = document.querySelector('.pg-reg'); if (r) r.scrollIntoView({ block: 'center' }); }); await p.waitForTimeout(300); await shot(p, 'x-regulacion-sesion');
  await p.done();
}
await browser.close();
console.log(fail ?`\n${fail} FALLAS` : '\nTodo OK');
process.exit(fail ? 1 : 0);
