import { OWNER_SETTINGS } from './owner-fixture.mjs';
// Prueba de la rama importar-plan, con rutinas de ejemplo inventadas: nombre del plan (línea "Plan:", vacío, repetido),
// columna Superserie (vista previa, quitarla, unidos al guardar), Pesado/Bombeo por el nombre, peso c/u sin cambios,
// RIR por serie, tus nombres exactos, el formato para tu IA, usuario nuevo y el reloj entrenando lo importado.
// Uso: $env:PW_DIR = "<carpeta con node_modules/playwright>"; node tests/tip.mjs <copia transpilada> [<copia anterior>]
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
const T0 = Date.parse('2026-11-14T12:00:00');
const SES = [{ id: 'h1', date: new Date(T0 - 3 * 864e5).toISOString(), planId: 'pA', planName: 'Rutina A', dayId: 'dA', dayName: 'Torso', gymId: 'gA', gymName: 'Gimnasio A', kind: 'fuerza', durationSec: 3000, cuv: 1,
  exercises: [{ name: 'Remo Unilateral en Polea Baja Arrodillado', type: 'Tracción', sets: [{ w: 25, r: 10, rir: 2 }] }] }];
const PLANS = [{ id: 'pA', name: 'Rutina A', gymId: 'gA', days: [{ id: 'dA', name: 'Torso', weekday: 1, kind: 'fuerza', exercises: [{ id: 'x1', name: 'Remo Unilateral en Polea Baja Arrodillado', type: 'Tracción', weight: 25, sets: 3, repsMin: 8, repsMax: 10, rest: 90 }] }] },
  { id: 'pB', name: 'Equilibrio · 4 días', gymId: 'gA', days: [] }];
const MYEX = [{ k: 'my1', name: 'Curl Araña en Banco Bajo', zm: 'bic', zs: [], eq: 'manc', pat: 'curl', kind: 'w', at: 1 }];
const SET = () => Object.assign(structuredClone(OWNER_SETTINGS), { activePlanId: 'pA', activeGymId: 'gA', planByGym: { gA: 'pA' }, newsSeen: 'n6', g5Seed: 1, cuConv: { v: 1, at: 1, two: [], one: [] }, myEx: MYEX });
const TXT = `Aquí tienes tu plan.

\`\`\`
Plan: Equilibrio · 4 días

LUNES: Torso Pesado
Ejercicio | Peso | Reps | RIR | Descanso | Superserie
Press Inclinado con Mancuernas | 12 | 8 | 2 | 120 |
Press Inclinado con Mancuernas | 12 | 8 | 1 | 120 |
Remo Unilateral en Polea Baja Arrodillado | 27.5 | 10 | 2 | 90 |
Curl Araña en Banco Bajo | 7.5 | 12 | 1 | 60 | A
Tríceps Polea | 20 | 12 | 1 | 60 | A
Elevaciones Laterales | 7.5 | 15 | 1 | 60 | B
Pájaros (Deltoide Posterior) | 5 | 15 | 1 | 60 | B

MIÉRCOLES: Pierna mantenimiento (Bombeo)
Ejercicio | Peso | Reps | RIR | Descanso | SS
Prensa 45° | 120 | 12 | 2 | 120 |
Curl Femoral Tumbado | 35 | 12 | 1 | 90 |

VIERNES: Torso
Ejercicio | Peso | Reps | RIR | Descanso
Press de Banca en Smith | 40 | 6 | 2 | 150
Jalón al Pecho | 50 | 6 | 2 | 150
\`\`\``;
async function open({ watch, first, dir } = {}) {
  const srv = await serve(dir || DIR);
  const ctx = await browser.newContext(watch ? { viewport: { width: 410, height: 500 }, hasTouch: true } : { viewport: { width: 390, height: 844 }, hasTouch: true });
  await ctx.route(/googleapis|gstatic|google\.com|firebase|github/, r => r.abort());
  const p = await ctx.newPage(); p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message));
  await p.clock.setFixedTime(new Date(T0));
  if (!first) await p.addInitScript(([s, pl, ss]) => { if (localStorage.getItem('cdh.seeded')) return; localStorage.setItem('cdh.seeded', '1');
    localStorage.setItem('cdh.settings', JSON.stringify(s)); localStorage.setItem('cdh.plans', JSON.stringify(pl)); localStorage.setItem('cdh.sessions', JSON.stringify(ss));
    localStorage.setItem('cdh.gyms', JSON.stringify([{ id: 'gA', name: 'Gimnasio A' }])); localStorage.setItem('cdh.newsSeen', '"n6"'); }, [SET(), PLANS, SES]);
  await p.goto(`http://127.0.0.1:${srv.address().port}/index.html`); await p.waitForTimeout(1500);
  await p.evaluate(() => { if (state.settings.pub) { state.settings.onb = 1; const o = document.getElementById('onb'); if (o) o.remove(); } state.settings.healthOk = 1; closeSheet(); render(); });
  p.done = async () => { await ctx.close(); srv.close(); };
  return p;
}
const noErr = p => ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
const act = (p, sel) => p.evaluate(s => { const b = document.querySelector(s); if (!b) return false; b.click(); return true; }, sel);
const importTxt = async (p, txt) => { await p.evaluate(t => { state.riT = { txt: t, err: '' }; riPaste(); }, txt); await act(p, '#sheet [data-ri="read"]'); await p.waitForTimeout(300); };
const prev = p => p.evaluate(() => ({ opt: (document.querySelector('#ri-plan option[value="new"]') || {}).textContent || '', pn: (document.getElementById('ri-pn') || {}).value, ph: (document.getElementById('ri-pn') || {}).placeholder,
  days: state.rI.days.map(d => ({ n: d.name, ex: d.ex.map(e => (e.name || '?' + e.raw) + (e.ss ? '[' + e.ss + ']' : '')) })), ss: [...document.querySelectorAll('#sheet .ri-ss')].map(x => x.textContent) }));
const plan = (p, name) => p.evaluate(n => { const P = state.plans.filter(x => x.name === n).pop(); return P && { id: P.id, name: P.name, days: P.days.map(d => ({ n: d.name, k: d.kind, ex: d.exercises.map(e => ({ n: e.name, w: e.weight, ss: e.ss, rir: e.rirT, sets: e.sets })) })) }; }, name);

console.log('1. Dueño: nombre del plan, superseries, Pesado/Bombeo y peso c/u');
{
  const p = await open();
  await importTxt(p, TXT);
  let V = await prev(p);
  console.log('      ' + V.days.map(d => d.n + ': ' + d.ex.join(', ')).join('\n      '));
  ok(V.pn === 'Equilibrio · 4 días' && /Plan nuevo «Equilibrio · 4 días 2»/.test(V.opt), 'la línea "Plan:" propone el nombre; como ya existe en el gimnasio, queda "Equilibrio · 4 días 2"');
  ok(V.days.length === 3 && !V.days.some(d => /plan/i.test(d.n)), 'la línea "Plan:" no se lee como un día (3 rutinas)');
  ok(V.days[0].ex.join(',') === 'Press Inclinado con Mancuernas,Remo Unilateral en Polea Baja Arrodillado,Curl Araña en Banco Bajo[A],Tríceps Polea[A],Elevaciones Laterales[B],Pájaros (Deltoide Posterior)[B]', 'superseries leídas de la columna (A y B) y tus nombres exactos (remo del historial, curl araña propio)');
  ok(V.ss.join(',') === 'Superserie A,Superserie A,Superserie B,Superserie B', 'la vista previa muestra la letra de cada superserie');
  /* Quitar la superserie B de las laterales: los pájaros quedan solos */
  await act(p, '#sheet [data-ri="ssoff"][data-d="0"][data-e="4"]'); await p.waitForTimeout(150);
  V = await prev(p); ok(V.days[0].ex[4] === 'Elevaciones Laterales' && V.ss.length === 3, 'se puede quitar la letra en la vista previa');
  await p.evaluate(() => { const i = document.getElementById('ri-pn'); i.value = 'Equilibrio · 4 días'; i.dispatchEvent(new Event('input', { bubbles: true })); });
  await act(p, '#sheet .pk-bottom [data-ri="save"]'); await p.waitForTimeout(400);
  const P = await plan(p, 'Equilibrio · 4 días 2');
  ok(!!P && (await p.evaluate(() => state.plans.filter(x => x.name === 'Equilibrio · 4 días').length)) === 1, 'se guardó como "Equilibrio · 4 días 2" sin tocar el plan que ya existía');
  const L = P.days.find(d => /Torso Pesado/.test(d.n)), M = P.days.find(d => /Pierna/.test(d.n)), V2 = P.days.find(d => d.n === 'Torso' || d.n === 'Torso (Claude)');
  console.log('      ' + P.days.map(d => d.n + ' (' + d.k + '): ' + d.ex.map(e => e.n + (e.ss ? '+' : '') + ' ' + e.w).join(', ')).join('\n      '));
  ok(L.k === 'fuerza' && M.k === 'bombeo', '"Torso Pesado" queda Pesado y "Pierna mantenimiento (Bombeo)" queda Bombeo (aunque sus reps digan otra cosa)');
  ok(V2.k === 'fuerza', '"Torso" (sin decir el tipo): la regla de siempre por las reps (6 → pesado)');
  const ssOf = n => L.ex.find(e => e.n === n).ss;
  ok(ssOf('Curl Araña en Banco Bajo') === 1 && !ssOf('Tríceps Polea') && !ssOf('Elevaciones Laterales') && !ssOf('Pájaros (Deltoide Posterior)'), 'al guardar: curl araña + extensión unidos (ss en el primero, como "Unir con el siguiente"); laterales y pájaros, solos');
  ok(L.ex.find(e => /Press Inclinado/.test(e.n)).w === 12 && L.ex.find(e => /Laterales/.test(e.n)).w === 7.5 && L.ex.find(e => /Pájaros/.test(e.n)).w === 5, 'peso de mancuernas c/u sin cambios (12, 7.5 y 5)');
  ok(JSON.stringify(L.ex.find(e => /Press Inclinado/.test(e.n)).rir) === '[2,1]' && L.ex.find(e => /Press Inclinado/.test(e.n)).sets === 2, 'RIR por serie (2, 1) guardado serie por serie');
  ok(L.ex.find(e => /Remo Unilateral/.test(e.n)) && (await p.evaluate(() => !LIB.some(x => x.name === 'Remo Unilateral en Polea Baja Arrodillado'))), 'el remo con tu nombre del historial (que no está en el catálogo) conserva ese nombre: su historial sigue');
  /* Sin nombre: "Rutinas de Claude"; repetido otra vez: " 2" */
  await importTxt(p, TXT.replace('Plan: Equilibrio · 4 días\n', ''));
  V = await prev(p);
  ok(V.pn === '' && V.ph === 'Rutinas de Claude' && /Plan nuevo «Rutinas de Claude»/.test(V.opt), 'sin línea "Plan:" y sin escribir nombre: "Rutinas de Claude"');
  await act(p, '#sheet .pk-bottom [data-ri="save"]'); await p.waitForTimeout(400);
  await importTxt(p, TXT.replace('Plan: Equilibrio · 4 días\n', ''));
  V = await prev(p); ok(/Plan nuevo «Rutinas de Claude 2»/.test(V.opt), 'la segunda vez: "Rutinas de Claude 2" (nunca reemplaza)');
  await p.evaluate(() => { state.rI = null; closeSheet(); });
  /* El formato para tu IA */
  const fmt = await p.evaluate(() => riFormat());
  ok(/Plan: nombre del plan/.test(fmt) && /Columna Superserie/.test(fmt) && /Ejercicio \| Peso \| Reps \| RIR \| Descanso \| Superserie/.test(fmt) && /\| A\n/.test(fmt) && /CADA mancuerna \(c\/u\)/.test(fmt), '"Copiar formato para tu IA" menciona "Plan:", la columna Superserie y el peso c/u');
  ok((await p.evaluate(f => riBuild(f.split('```')[1] || '').length, fmt)) >= 2, 'y su ejemplo se puede importar');
  /* Entrenar el día importado: la superserie funciona */
  const S = await p.evaluate(id => { const P = state.plans.find(x => x.id === id), d = P.days.find(x => /Torso Pesado/.test(x.name)); startSession(P.id, d.id); const D = state.draft, i = D.exercises.findIndex(e => /Curl Araña/.test(e.name)); return { m: (ssMembers(D, i) || []).map(k => D.exercises[k].name), w: D.exercises.find(e => /Laterales/.test(e.name)).log[0].w }; }, P.id);
  ok(S.m.join(',') === 'Curl Araña en Banco Bajo,Tríceps Polea' && S.w === 7.5, 'al entrenarlo: curl araña y extensión en superserie; laterales con 7.5 c/u');
  noErr(p); await p.done();
}

console.log('2. Usuario nuevo');
{
  const p = await open({ first: true });
  await importTxt(p, TXT);
  const V = await prev(p);
  ok(/Plan nuevo «Equilibrio · 4 días»/.test(V.opt) && V.days.length === 3, 'usuario nuevo: plan "Equilibrio · 4 días" con 3 rutinas');
  ok(V.days[0].ex.some(e => /^\?Remo Unilateral/.test(e) || /Remo/.test(e)), 'sin tu historial, el remo se busca en el catálogo (o pide elegir)');
  await p.evaluate(() => { state.rI.days.forEach(d => d.ex.forEach(e => { if (!e.name) e.on = false; })); });
  await act(p, '#sheet .pk-bottom [data-ri="save"]'); await p.waitForTimeout(400);
  const P = await plan(p, 'Equilibrio · 4 días');
  ok(P && P.days.length === 3 && P.days.find(d => /Pesado/.test(d.n)).k === 'fuerza' && P.days.find(d => /Bombeo/.test(d.n)).k === 'bombeo', 'guardado con sus tipos (Pesado y Bombeo)');
  noErr(p); await p.done();
}

console.log('3. Reloj: entrena el plan importado como cualquier otro');
{
  const p = await open({ watch: true });
  const W = await p.evaluate(t => {
    const days = riBuild(t); const F = state.rI = { days, src: 'claude', on: '', oc: RI_COLORS[0], plan: 'new', pname: days.plan, gym: 'gA', at: Date.now() }; riSave();
    const P = state.plans.find(x => x.name === 'Equilibrio · 4 días 2'), d = P.days.find(x => /Torso Pesado/.test(x.name)); startSession(P.id, d.id); state.draft.cur = 0; render();
    const D = state.draft, i = D.exercises.findIndex(e => /Curl Araña/.test(e.name));
    return { watch: isWatch(), n: D.exercises.length, ss: (ssMembers(D, i) || []).length, html: document.getElementById('app').innerHTML.length };
  }, TXT);
  ok(W.watch && W.n === 6 && W.ss === 2 && W.html > 500, 'reloj: el día importado se entrena (6 ejercicios, la superserie unida)');
  noErr(p); await p.done();
  if (BASE) {
    const shot = async dir => { const q = await open({ watch: true, dir }); const a = await q.screenshot(); const e = q.errs.slice(); await q.done(); return { a, e }; };
    const A = await shot(DIR), B = await shot(BASE);
    ok(A.a.equals(B.a), 'reloj: inicio idéntico a la versión anterior');
    ok(!A.e.length, 'reloj: sin errores de JS');
  }
}

await browser.close();
console.log(fail ? `\n${fail} FALLA(S)` : '\nTodo OK');
process.exit(fail ? 1 : 0);
