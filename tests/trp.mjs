import { OWNER_SETTINGS } from './owner-fixture.mjs';
// Prueba de la rama repetir-entreno (repetir.js), con datos inventados. Solo teléfono; el reloj se compara con la versión anterior.
//  A. Botón en el detalle del día   B. Vista previa: "Ese día" y "Hoy" del coach, tipo de día, gimnasio, quitar
//  C. Empezar: sesión con esos ejercicios y series; lo propuesto = lo que trae la sesión   D. Al terminar: historial sí, rutinas no
//  E. Día viejo con una vez más reciente   F. Entreno en curso   G. Dueño sin perfil   H. Usuario nuevo   I. Reloj igual a la versión anterior
// Uso: PW_CHANNEL=chromium node tests/trp.mjs <copia transpilada> [<copia anterior para comparar el reloj>]
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = process.env.TRP_OUT || os.tmpdir();   /* capturas fuera del repo */
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
const JUE = Date.parse('2026-11-12T10:00:00');   /* jueves */
let N = 0;
const X = (name, sets, w, type, extra) => Object.assign({ id: 'x' + (++N), name, type: type || 'Piernas', weight: w, sets, repsMin: 8, repsMax: 12, rest: 90 }, extra);
const HACK = 'Sentadilla Hack', CF = 'Curl Femoral Tumbado', TAL = 'Elevación de Talones de Pie', PRE = 'Prensa 45°';
const PLAN = () => [{ id: 'pA', name: 'Rutina A', gymId: 'rokaz', days: [
  { id: 'dP', name: 'Piernas (Pesado)', weekday: 1, kind: 'fuerza', exercises: [X(HACK, 3, 70), X(CF, 3, 40), X(TAL, 3, 40)] },
  { id: 'dB', name: 'Piernas (Bombeo)', weekday: 5, kind: 'bombeo', exercises: [X(PRE, 3, 100), X(CF, 3, 25), X(TAL, 3, 30)] }] }];
const SES = (id, at, kind, dayId, dayName, ex, gym) => ({ id, date: new Date(Date.parse(at)).toISOString(), planId: 'pA', planName: 'Rutina A', dayId, dayName, gymId: gym || 'rokaz', gymName: gym === 'g2' ? 'Gimnasio B' : 'Gimnasio A', kind, durationSec: 3600,
  exercises: ex.map(([name, sets]) => ({ name, type: 'Piernas', sets: sets.map(([w, r, rir]) => Object.assign({ w, r }, rir != null ? { rir } : {})) })) });
/* Más reciente primero. Lunes: pesado (Hack 3 series al tope del rango → sube; Curl con fallo temprano → mantiene) */
const HIST = [
  SES('lun', '2026-11-09T19:00:00', 'fuerza', 'dP', 'Piernas (Pesado)', [[HACK, [[72.5, 12, 3], [72.5, 12, 2], [72.5, 12, 1]]], [CF, [[42.5, 10, 0], [42.5, 9, 0]]]]),
  SES('vie', '2026-11-06T19:00:00', 'bombeo', 'dB', 'Piernas (Bombeo)', [[PRE, [[100, 15, 2], [100, 15, 2]]], [CF, [[22.5, 18, 2], [22.5, 16, 2]]]]),
  SES('lu0', '2026-11-02T19:00:00', 'fuerza', 'dP', 'Piernas (Pesado)', [[HACK, [[70, 8, 2], [70, 8, 2]]], [CF, [[40, 10, 2], [40, 10, 2]]]])];
const GYMS = [{ id: 'rokaz', name: 'Gimnasio A' }, { id: 'g2', name: 'Gimnasio B' }];
const SET = (noProf) => { const s = Object.assign(structuredClone(OWNER_SETTINGS), { activePlanId: 'pA', activeGymId: 'rokaz', planByGym: { rokaz: 'pA' }, newsSeen: 'n6' });
  if (noProf) delete s.prof; else s.prof = Object.assign({}, s.prof, { goal: 'musculo', exp: 2, mins: 75 }); return s; };

async function open({ watch, sessions, plans, first, dir, noProf } = {}) {
  const srv = await serve(dir || DIR);
  const ctx = await browser.newContext(watch ? { viewport: { width: 410, height: 500 }, hasTouch: true } : { viewport: { width: 390, height: 844 }, hasTouch: true });
  await ctx.route(/googleapis|gstatic|google\.com|firebase|github/, r => r.abort());
  const p = await ctx.newPage(); p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message));
  await p.clock.setFixedTime(new Date(JUE));
  if (!first) await p.addInitScript(([s, pl, ss, g]) => { if (localStorage.getItem('cdh.seeded')) return; localStorage.setItem('cdh.seeded', '1');
    localStorage.setItem('cdh.settings', JSON.stringify(s)); localStorage.setItem('cdh.plans', JSON.stringify(pl)); localStorage.setItem('cdh.sessions', JSON.stringify(ss));
    localStorage.setItem('cdh.gyms', JSON.stringify(g)); localStorage.setItem('cdh.newsSeen', '"n6"'); }, [SET(noProf), plans || PLAN(), sessions || HIST, GYMS]);
  await p.goto(`http://127.0.0.1:${srv.address().port}/index.html`); await p.waitForTimeout(1500);
  if (!first) await p.evaluate(() => { state.settings.healthOk = 1; state.notifPerm = 'granted'; closeSheet(); render(); });
  p.done = async () => { await ctx.close(); srv.close(); };
  return p;
}
const noErr = p => ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
const day = (p, sid) => p.evaluate(id => { const s = state.sessions.find(x => x.id === id); daySheet(dk(s.date)); }, sid);
const click = (p, sel) => p.evaluate(s => { const b = document.querySelector(s); if (!b) return false; b.click(); return true; }, sel);
const sheetTxt = p => p.evaluate(() => (document.querySelector('#sheet .sheet-card') || {}).innerText || '');

/* ---------- A-D ---------- */
console.log('A. Botón en el detalle del día');
{
  const p = await open();
  await day(p, 'lun'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => !!document.querySelector('#sheet .rp-btn[data-rp="open"]')), 'el detalle del día trae "Repetir este entreno"');
  ok(/Repetir este entreno/.test(await sheetTxt(p)), 'con su texto');
  ok(await p.evaluate(() => { const a = document.querySelector('#sheet .rp-acts'), d = document.querySelector('#sheet .dd-acts'); return !!(a && d && (a.compareDocumentPosition(d) & Node.DOCUMENT_POSITION_FOLLOWING)); }), 'va antes de Analizar / Compartir / Copiar');
  await p.screenshot({ path: path.join(OUT, 'trp-dia.png') });

  console.log('B. Vista previa');
  await click(p, '#sheet .rp-btn'); await p.waitForTimeout(250);
  let t = await sheetTxt(p);
  ok(/Repetir entreno/.test(t) && /Piernas \(Pesado\)/.test(t), 'abre la vista previa del día');
  ok(/Ese día:[\s\S]*72[.,]5×12/.test(t), '"Ese día" muestra las series de ese día');
  const pv = await p.evaluate(() => [...document.querySelectorAll('#sheet .rp-ex')].map(x => ({ name: x.querySelector('b').textContent, hoy: (x.querySelector('.rp-hoy') || {}).innerText || '' })));
  ok(pv.length === 2 && pv[0].name === 'Sentadilla Hack' && pv[1].name === 'Curl Femoral Tumbado', 'los mismos ejercicios y en el mismo orden');
  ok(/Hoy: 3 ×/.test(pv[0].hoy), 'Hack: "Hoy" con las 3 series de ese día');
  const coach = await p.evaluate(() => { const c = pgCoach({ name: 'Sentadilla Hack', sets: 3, type: typeOf('Sentadilla Hack') }, 'rokaz', 'fuerza'); const c2 = pgCoach({ name: 'Curl Femoral Tumbado', sets: 2, type: typeOf('Curl Femoral Tumbado') }, 'rokaz', 'fuerza'); return { w: c.w, mode: c.mode, why: c.why, w2: c2.w, m2: c2.mode, why2: c2.why }; });
  ok(coach.w > 72.5 && /⬆/.test(pv[0].hoy) && pv[0].hoy.indexOf(coach.why.slice(0, 25)) >= 0, `Hack llegó al tope: el coach sube (${coach.w} kg) y la vista previa lo explica`);
  ok(coach.w2 <= 42.5 && pv[1].hoy.indexOf(coach.why2.slice(0, 25)) >= 0, `Curl con fallo antes de la última serie: no sube (${coach.w2} kg, ${coach.m2})`);
  console.log('     Hack →', pv[0].hoy.replace(/\s+/g, ' ').slice(0, 170));
  console.log('     Curl →', pv[1].hoy.replace(/\s+/g, ' ').slice(0, 170));
  await p.screenshot({ path: path.join(OUT, 'trp-vista.png'), fullPage: false });
  /* tipo de día */
  ok(await p.evaluate(() => document.querySelector('#sheet [data-rp="kind"][data-v="fuerza"]').classList.contains('on')), 'por defecto el tipo de ese día (Pesado)');
  await click(p, '#sheet [data-rp="kind"][data-v="bombeo"]'); await p.waitForTimeout(150);
  const bo = await p.evaluate(() => { const c = pgCoach({ name: 'Curl Femoral Tumbado', sets: 2, type: typeOf('Curl Femoral Tumbado') }, 'rokaz', 'bombeo'); return { w: c.w, txt: document.querySelectorAll('#sheet .rp-hoy')[1].innerText }; });
  ok(bo.txt.indexOf(fmtKgN(bo.w)) >= 0, 'en Bombeo el Curl sale con el peso del coach para bombeo (' + bo.w + ' kg)');
  await click(p, '#sheet [data-rp="kind"][data-v="fuerza"]'); await p.waitForTimeout(150);
  /* gimnasio */
  await click(p, '#sheet [data-rp="gym"][data-v="g2"]'); await p.waitForTimeout(150);
  ok(/Ese día fue en Gimnasio A/.test(await sheetTxt(p)), 'otro gimnasio: avisa que los pesos no se copian tal cual');
  await click(p, '#sheet [data-rp="gym"][data-v="rokaz"]'); await p.waitForTimeout(150);
  /* quitar */
  await click(p, '#sheet .rp-tg[data-i="1"]'); await p.waitForTimeout(150);
  ok(await p.evaluate(() => document.querySelectorAll('#sheet .rp-ex.off').length === 1 && /Empezar \(1\)/.test(document.querySelector('#sheet [data-rp="go"]').textContent)), 'quitar un ejercicio: Empezar (1)');
  await click(p, '#sheet .rp-tg[data-i="1"]'); await p.waitForTimeout(150);
  ok(/Empezar \(2\)/.test(await sheetTxt(p)), 'incluirlo otra vez: Empezar (2)');
  /* Volver */
  await click(p, '#sheet [data-rp="back"]'); await p.waitForTimeout(150);
  ok(await p.evaluate(() => !!document.querySelector('#sheet .rp-btn') && !state.rp), 'Volver regresa al detalle del día');

  console.log('C. Empezar');
  const plansBefore = await p.evaluate(() => JSON.stringify(state.plans));
  await click(p, '#sheet .rp-btn'); await p.waitForTimeout(200);
  await click(p, '#sheet [data-rp="go"]'); await p.waitForTimeout(900);
  const d = await p.evaluate(() => { const d = state.draft; return d && { planId: d.planId, dayName: d.dayName, gymId: d.gymId, kind: d.kind, ex: d.exercises.map(e => ({ name: e.name, n: e.log.length, w: e.log[0].w })), redoOf: d.redoOf }; });
  ok(d && d.planId === 'redo' && d.dayName === 'Repetido · Piernas (Pesado)' && d.kind === 'fuerza' && d.gymId === 'rokaz', 'sesión "Repetido · Piernas (Pesado)", pesado, en el gimnasio A');
  ok(d && d.ex.map(e => e.name + ':' + e.n).join() === 'Sentadilla Hack:3,Curl Femoral Tumbado:2', 'mismos ejercicios y las mismas series que ese día (3 y 2)');
  ok(d && +d.ex[0].w === coach.w && +d.ex[1].w === coach.w2, `el peso de la sesión es el de la vista previa (${d && d.ex[0].w} / ${d && d.ex[1].w})`);
  ok(await p.evaluate(() => !state.plans.some(p => p.id === 'redo') && !JSON.parse(localStorage.getItem('cdh.plans')).some(p => p.id === 'redo')), 'la rutina temporal no queda guardada');
  ok(await p.evaluate(b => JSON.stringify(state.plans) === b, plansBefore), 'tus rutinas no cambiaron al empezar');
  await p.waitForTimeout(700);
  await p.screenshot({ path: path.join(OUT, 'trp-sesion.png') });

  console.log('D. Al terminar');
  await p.evaluate(() => { const d = state.draft; d.exercises.forEach(e => e.log.forEach(s => { s.w = +s.w + 50; s.r = 10; s.done = true; s.rir = 2; })); saveDraft(); finishSession(); });
  await p.waitForTimeout(900);
  const fin = await p.evaluate(() => { const s = state.sessions[0]; return { planId: s.planId, dayName: s.dayName, n: s.exercises.length }; });
  ok(fin.planId === 'redo' && fin.dayName === 'Repetido · Piernas (Pesado)' && fin.n === 2, 'queda en el historial como «Repetido»');
  ok(await p.evaluate(b => JSON.stringify(state.plans) === b, plansBefore), 'los pesos de tu rutina no cambiaron al terminar (aunque subiste 50 kg)');
  ok(await p.evaluate(() => { closeSheet(); render(); return state.sessions.filter(s => dk(s.date) === dk(new Date())).length === 1; }), 'cuenta en la racha de hoy');
  noErr(p); await p.done();
}

console.log('E. Día viejo con una vez más reciente');
{
  const p = await open();
  await day(p, 'lu0'); await p.waitForTimeout(200); await click(p, '#sheet .rp-btn'); await p.waitForTimeout(250);
  const t = await sheetTxt(p);
  ok(/Ese día:[\s\S]*70×8/.test(t), '"Ese día" son las series de ese día viejo');
  ok(/Lo hiciste otra vez el/.test(t), 'avisa que el coach parte de la vez más reciente');
  noErr(p); await p.done();
}

console.log('F. Entreno en curso');
{
  const p = await open();
  await p.evaluate(() => { state.settings.nextS = { dB: { pick: 'plan' } }; startSession('pA', 'dB'); });
  await p.waitForTimeout(500);
  await p.evaluate(() => { daySheet(dk(state.sessions.find(x => x.id === 'lun').date)); });
  await p.waitForTimeout(150);
  await click(p, '#sheet .rp-btn'); await p.waitForTimeout(250);
  ok(await p.evaluate(() => state.draft.dayId === 'dB' && !state.rp && !document.querySelector('#sheet .rp-sheet')), 'no pisa el entreno en curso: pide terminarlo primero');
  noErr(p); await p.done();
}

console.log('G. Dueño sin perfil (sin settings.prof)');
{
  const p = await open({ noProf: true });
  await day(p, 'lun'); await p.waitForTimeout(200); await click(p, '#sheet .rp-btn'); await p.waitForTimeout(250);
  ok(/Hoy: /.test(await sheetTxt(p)), 'vista previa con recomendaciones');
  await click(p, '#sheet [data-rp="go"]'); await p.waitForTimeout(800);
  ok(await p.evaluate(() => state.draft && state.draft.planId === 'redo'), 'empieza la sesión');
  ok(await p.evaluate(() => !state.settings.prof || !state.settings.prof.goal), 'no inventa un objetivo');
  noErr(p); await p.done();
}

console.log('H. Usuario nuevo');
{
  const p = await open({ first: true });
  await p.evaluate(() => { state.settings.onb = 1; });
  ok(await p.evaluate(() => typeof rpOpen === 'function' && !state.sessions.length), 'sin sesiones: no hay días que repetir');
  await p.evaluate(() => { state.sessions.unshift({ id: 'n1', date: new Date().toISOString(), planId: 'quick', dayName: 'Rápido · Piernas 20 min', gymId: activeGym().id, kind: 'fuerza', exercises: [{ name: 'Sentadilla con Peso Corporal', type: 'Piernas', sets: [{ w: 0, r: 15 }, { w: 0, r: 15 }] }] }); saveLocal(); daySheet(dk(new Date())); });
  await p.waitForTimeout(200);
  await click(p, '#sheet .rp-btn'); await p.waitForTimeout(250);
  ok(/Sentadilla con Peso Corporal/.test(await sheetTxt(p)), 'repite un entreno rápido (peso corporal)');
  await click(p, '#sheet [data-rp="go"]'); await p.waitForTimeout(800);
  ok(await p.evaluate(() => state.draft && state.draft.exercises.length === 1 && state.draft.exercises[0].log.length === 2), 'sesión con 1 ejercicio y 2 series');
  noErr(p); await p.done();
}

console.log('I. Reloj');
{
  const p = await open({ watch: true });
  ok(await p.evaluate(() => isWatch()), 'modo reloj');
  await day(p, 'lun'); await p.waitForTimeout(1200);
  ok(await p.evaluate(() => !document.querySelector('#sheet .rp-btn')), 'el reloj no muestra "Repetir este entreno"');
  const a = await p.screenshot(); await p.evaluate(() => { closeSheet(); render(); }); await p.waitForTimeout(1200); const a2 = await p.screenshot();
  noErr(p); await p.done();
  if (BASE) {
    const q = await open({ watch: true, dir: BASE });
    await day(q, 'lun'); await q.waitForTimeout(1200); const b = await q.screenshot();
    await q.evaluate(() => { closeSheet(); render(); }); await q.waitForTimeout(1200); const b2 = await q.screenshot();
    if (Buffer.compare(a, b)) { fs.writeFileSync(path.join(OUT, 'trp-reloj-nuevo.png'), a); fs.writeFileSync(path.join(OUT, 'trp-reloj-antes.png'), b); }
    ok(Buffer.compare(a, b) === 0, 'detalle del día en el reloj idéntico a la versión anterior');
    ok(Buffer.compare(a2, b2) === 0, 'inicio del reloj idéntico a la versión anterior');
    await q.done();
  }
}
function fmtKgN(n) { const v = Math.round(n * 10) / 10; return v.toLocaleString('es-PE'); }

await browser.close();
console.log(fail ? `\n${fail} prueba(s) fallaron` : '\nTodo OK');
process.exit(fail ? 1 : 0);
