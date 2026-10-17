// Prueba de "Editar sesión" (sessedit.js) y de los dos ejercicios nuevos (catalog.js), con Playwright y Edge.
// Uso (desde PowerShell): $env:PW_DIR = "<carpeta con node_modules/playwright>"; node tests/tses.mjs <copia transpilada> <copia transpilada anterior> [capturas]
// A. Dueño (sábado 17-oct, Roka'z): la sesión "Completar semana · Bombeo" con datos falsos se corrige desde el detalle del día
//    (cambiar, agregar, quitar, ordenar, series, peso con coma), Cancelar no cambia nada, errores de datos, y al guardar se
//    recalculan series por músculo, récords, logros y Coach; el resto del historial, las rutinas y la racha no cambian.
// B. Pesos de la rutina: si la sesión editada fue la que puso el peso (learnWeights), se corrige; si lo cambiaste a mano, no.
// C. Usuario nuevo: edita su sesión y encuentra los ejercicios nuevos por alias.
// D. Reloj: inicio igual que antes, sin botón de editar, y una rutina con los ejercicios nuevos se ve y se registra.
// E. Emparejamiento: todos los nombres conocidos (historial de Hevy y Symmetry, récords, rutinas, plantillas) siguen igual.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = createRequire(path.join(process.env.PW_DIR || HERE, 'x.js'))('playwright');
const [DIR, OLD, SHOTS] = process.argv.slice(2);
if (!DIR || !OLD) throw new Error('Faltan las carpetas transpiladas (nueva y anterior)');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.webp': 'image/webp', '.woff2': 'font/woff2', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const serve = dir => new Promise(res => {
  const s = http.createServer((q, r) => {
    let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
    fs.readFile(path.join(dir, p), (e, b) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); r.end(b); });
  }).listen(0, '127.0.0.1', () => res(s));
});
let fail = 0;
const ok = (c, msg) => { if (c) console.log('  ok  ', msg); else { fail++; console.log('  FALLA', msg); } };
const browser = await chromium.launch({ channel: 'msedge', headless: false, args: ['--headless=new'] });
const OWNER = { owner: 1, healthOk: 1 };
const SAT = new Date('2026-10-17T20:30:00');

async function open(dir, { seed, watch, at } = {}) {
  const srv = await serve(dir);
  const ctx = await browser.newContext(watch ? { viewport: { width: 410, height: 500 }, hasTouch: true } : { viewport: { width: 390, height: 844 }, hasTouch: true });
  await ctx.route(/googleapis|gstatic|google\.com|firebase/, r => r.abort());
  const p = await ctx.newPage(); p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message));
  await p.clock.setFixedTime(at || SAT);
  await p.addInitScript(o => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); if (o) { localStorage.setItem('cdh.settings', JSON.stringify(o)); localStorage.setItem('cdh.newsSeen', '"n5"'); } } }, seed || null);
  const url = `http://127.0.0.1:${srv.address().port}/index.html`;
  await p.goto(url); await p.waitForTimeout(2500);
  await p.evaluate(() => { if (state.settings.pub) state.settings.onb = 1; LS.set('newsSeen', NEWS_KEY); state.settings.healthOk = 1; savePlans(); });
  await p.reload(); await p.waitForTimeout(2200);
  p.done = async () => { await ctx.close(); srv.close(); };
  return p;
}
const shot = async (p, n) => { const b = await p.screenshot({ animations: 'disabled' }); if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); fs.writeFileSync(path.join(SHOTS, n + '.png'), b); } return b; };
async function pixDiff(a, b) {
  if (a.equals(b)) return 0;
  const p = await browser.newPage();
  const n = await p.evaluate(async ([x, y]) => {
    const load = s => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = 'data:image/png;base64,' + s; });
    const [A, B] = await Promise.all([load(x), load(y)]); if (A.width !== B.width || A.height !== B.height) return -1;
    const px = I => { const c = document.createElement('canvas'); c.width = I.width; c.height = I.height; const g = c.getContext('2d'); g.drawImage(I, 0, 0); return g.getImageData(0, 0, I.width, I.height).data; };
    const da = px(A), db = px(B); let d = 0; for (let i = 0; i < da.length; i += 4) if (da[i] !== db[i] || da[i + 1] !== db[i + 1] || da[i + 2] !== db[i + 2]) d++; return d;
  }, [a.toString('base64'), b.toString('base64')]);
  await p.close(); return n;
}
const tap = async (p, sel) => { await p.locator(sel).first().click(); await p.waitForTimeout(120); };
const fill = async (p, i, j, f, v) => { const l = p.locator(`#sheet input[data-se-i="${i}"][data-se-j="${j}"][data-se-f="${f}"]`); await l.fill(String(v)); };
const sheetText = p => p.evaluate(() => document.getElementById('sheet').innerText);
/* La sesión falsa del sábado (lo que se anotó para no perder la racha) */
const FAKE = () => {
  const s = { id: 'wcfill-test-1017', date: new Date('2026-10-17T18:10:00-05:00').toISOString(), planId: 'wcfill', planName: 'Completar semana', dayId: 'wcfill-2026-10-17', dayName: 'Completar semana · Bombeo',
    gymId: 'rokaz', gymName: gymName('rokaz'), kind: 'bombeo', durationSec: 3300, exercises: [
      { name: 'Elevación de Talones de Pie', type: 'Piernas', repsMin: 12, repsMax: 15, target: 3, sets: [{ w: 50, r: 20 }, { w: 50, r: 20 }, { w: 50, r: 20 }] },
      { name: 'Tríceps Polea', type: 'Empuje', repsMin: 12, repsMax: 15, target: 3, sets: [{ w: 20, r: 15 }, { w: 20, r: 15 }, { w: 20, r: 15 }] },
      { name: 'Press Banca Plano (Barra)', type: 'Empuje', repsMin: 10, repsMax: 12, target: 3, sets: [{ w: 20, r: 12 }, { w: 20, r: 12 }, { w: 20, r: 12 }] },
      { name: 'Curl Concentrado', type: 'Tracción', repsMin: 12, repsMax: 15, target: 3, sets: [{ w: 10, r: 12 }, { w: 10, r: 12 }, { w: 10, r: 12 }] },
      { name: 'Elevaciones Laterales', type: 'Empuje', repsMin: 12, repsMax: 15, target: 3, sets: [{ w: 8, r: 15 }, { w: 8, r: 15 }, { w: 8, r: 15 }] }],
    wins: { 'Curl Concentrado': 'pr' }, synced: true };
  state.sessions.unshift(s); state.sessions.sort((a, b) => b.date.localeCompare(a.date)); saveLocal();
};
/* Foto de todo lo que no debe cambiar */
const SNAP = () => {
  const other = state.sessions.filter(s => s.id !== 'wcfill-test-1017');
  return { other: JSON.stringify(other.map(cleanSess)), plans: JSON.stringify(state.plans), streak: JSON.stringify(streakInfo()), n: state.sessions.length };
};
const EXPECT = [
  ['Elevación de Talones en Prensa', [[70, 25], [70, 25], [70, 25]]],
  ['Elevación de Talones Sentado', [[35, 15], [35, 15], [35, 15]]],
  ['Extensión de Tríceps con Barra V en Polea', [[25, 15], [25, 15], [25, 15]]],
  ['Press Banca Plano (Barra)', [[20, 10], [20, 10], [20, 7]]],
  ['Curl Concentrado', [[7.5, 12], [7.5, 12], [7.5, 12]]],
];

console.log('A. Dueño: corregir la sesión del sábado 17-oct');
{
  const p = await open(DIR, { seed: OWNER });
  await p.evaluate(FAKE);
  const before = await p.evaluate(SNAP);
  const pre = await p.evaluate(() => ({ ws: weekSets(0).sets, curl: bestE1rm('Curl Concentrado', 'rokaz'), bd: JSON.stringify(badgeStats()), nk: nsKey(activePlan().id, activePlan().days[0].id) }));
  await p.evaluate(() => daySheet('2026-10-17')); await p.waitForTimeout(200);
  ok(await p.locator('#sheet .se-open').count() === 1, 'el detalle del día tiene "Editar sesión"');
  await shot(p, 'a0-detalle');

  /* Cancelar no cambia nada */
  await tap(p, '#sheet .se-open');
  ok(await p.locator('#sheet .se-sheet').count() === 1, 'abre la pantalla de edición');
  await fill(p, 0, 0, 'w', 99); await tap(p, '#sheet [data-se="del-ex"][data-i="4"]');
  await tap(p, '#sheet [data-se="cancel"]');
  const afterCancel = await p.evaluate(() => JSON.stringify(state.sessions.find(s => s.id === 'wcfill-test-1017').exercises));
  ok(afterCancel.includes('"w":50') && afterCancel.includes('Elevaciones Laterales') && !afterCancel.includes('99'), 'Cancelar no cambia nada');
  ok(await p.locator('#sheet .se-open').count() === 1, 'y vuelve al detalle del día');

  /* Edición completa con la interfaz */
  await tap(p, '#sheet .se-open');
  await tap(p, '#sheet [data-se="swap"][data-i="0"]');
  ok((await sheetText(p)).includes('Cambiar ejercicio'), 'Cambiar ejercicio abre la biblioteca');
  await p.locator('#pk-q').fill('gemelos en prensa'); await p.waitForTimeout(150);
  ok(await p.locator('#pk-list [data-act="pk-tog"][data-name="Elevación de Talones en Prensa"]').count() === 1, 'buscar "gemelos en prensa" encuentra Elevación de Talones en Prensa');
  await p.locator('#pk-q').fill('talones prensa'); await p.waitForTimeout(150);
  await tap(p, '#pk-list [data-act="pk-tog"][data-name="Elevación de Talones en Prensa"]');
  ok((await sheetText(p)).includes('Elevación de Talones en Prensa') && (await p.locator('#sheet .se-sheet').count()) === 1, 'vuelve a la edición con el ejercicio cambiado y sus 3 series');
  for (let j = 0; j < 3; j++) { await fill(p, 0, j, 'w', 70); await fill(p, 0, j, 'r', 25); }
  await tap(p, '#sheet [data-se="swap"][data-i="1"]');
  await p.locator('#pk-q').fill('barra v'); await p.waitForTimeout(150);
  ok(await p.locator('#pk-list [data-act="pk-tog"][data-name="Extensión de Tríceps con Barra V en Polea"]').count() === 1, 'buscar "barra v" encuentra Extensión de Tríceps con Barra V en Polea');
  await tap(p, '#pk-list [data-act="pk-tog"][data-name="Extensión de Tríceps con Barra V en Polea"]');
  for (let j = 0; j < 3; j++) { await fill(p, 1, j, 'w', 25); await fill(p, 1, j, 'r', 15); }
  await fill(p, 2, 0, 'r', 10); await fill(p, 2, 1, 'r', 10); await fill(p, 2, 2, 'r', 7);
  for (let j = 0; j < 3; j++) await fill(p, 3, j, 'w', '7,5');
  await tap(p, '#sheet [data-se="del-ex"][data-i="4"]');
  /* Agregar Elevación de Talones Sentado y subirlo al 2.º lugar */
  await tap(p, '#sheet [data-se="add-ex"]');
  await p.locator('#pk-q').fill('talones sentado'); await p.waitForTimeout(150);
  await tap(p, '#pk-list [data-act="pk-tog"][data-name="Elevación de Talones Sentado"]');
  await tap(p, '#sheet [data-act="pk-add"]');
  ok(await p.locator('#sheet [data-se-ex]').count() === 5, 'se agregó con una serie');
  /* Sin reps: no deja guardar */
  await tap(p, '#sheet .pk-bottom [data-se="save"]');
  ok((await sheetText(p)).includes('escribe las reps'), 'sin reps no se guarda y dice qué falta');
  ok(await p.locator('#sheet input.se-in.bad').count() === 1, 'marca el campo');
  await fill(p, 4, 0, 'w', 35); await fill(p, 4, 0, 'r', 15);
  await tap(p, '#sheet [data-se="add-set"][data-i="4"]'); await tap(p, '#sheet [data-se="add-set"][data-i="4"]');
  for (let k = 0; k < 3; k++) await tap(p, '#sheet [data-se="up"][data-i="' + (4 - k) + '"]');
  await shot(p, 'a1-edicion');
  /* Quitar una serie y volverla a agregar */
  await tap(p, '#sheet [data-se="del-set"][data-i="3"][data-j="2"]');
  ok(await p.locator('#sheet input[data-se-i="3"][data-se-f="w"]').count() === 2, 'quitar serie');
  await tap(p, '#sheet [data-se="add-set"][data-i="3"]'); await fill(p, 3, 2, 'r', 7);
  await tap(p, '#sheet .pk-bottom [data-se="save"]'); await p.waitForTimeout(300);
  const s = await p.evaluate(() => state.sessions.find(s => s.id === 'wcfill-test-1017'));
  const got = s.exercises.map(e => [e.name, e.sets.map(x => [x.w, x.r])]);
  ok(JSON.stringify(got) === JSON.stringify(EXPECT), 'queda exactamente como debe:\n         ' + got.map(e => e[0] + ': ' + e[1].map(x => x.join('×')).join(', ')).join('\n         '));
  ok(s.edited > 0 && s.mt === s.edited && s.synced === false, 'marcada editada, con fecha de cambio (gana la más reciente al sincronizar) y pendiente de subir');
  ok(s.date === new Date('2026-10-17T18:10:00-05:00').toISOString() && s.dayName === 'Completar semana · Bombeo', 'misma fecha y nombre');
  ok(!(s.wins && s.wins['Curl Concentrado']) , 'el escudo de récord falso del curl ya no está');
  const txt = await sheetText(p);
  ok(txt.includes('editada') && txt.includes('Elevación de Talones en Prensa'), 'el detalle del día muestra los datos nuevos y "editada"');
  await shot(p, 'a2-detalle-editado');
  const after = await p.evaluate(SNAP);
  ok(after.other === before.other, 'el resto de tu historial no cambia (' + (before.n - 1) + ' sesiones)');
  ok(after.plans === before.plans, 'las rutinas no cambian (era un entreno para completar)');
  ok(after.streak === before.streak, 'la racha sigue igual');
  const post = await p.evaluate(() => ({ ws: weekSets(0).sets, curl: bestE1rm('Curl Concentrado', 'rokaz'), bd: JSON.stringify(badgeStats()), nk: nsKey(activePlan().id, activePlan().days[0].id), wc: wcVolume().rows, rk: Object.keys(muscleRanks()).length, saved: JSON.parse(localStorage.getItem('cdh.sessions')).find(x => x.id === 'wcfill-test-1017').exercises.length }));
  const d = k => Math.round((post.ws[k] - pre.ws[k]) * 10) / 10;
  /* la sesión falsa ya tenía 3 series de talones de pie: ahora son 6 */
  ok(d('pant') === 3 && d('tri') === 0 && d('homb') === -3 && d('pecho') === 0 && d('bic') === 0, `series de la semana: pantorrillas +${d('pant')}, tríceps ${d('tri')}, hombros ${d('homb')}, pecho ${d('pecho')}, bíceps ${d('bic')}`);
  ok(post.curl < pre.curl, `récord del curl concentrado recalculado (${pre.curl.toFixed(1)} → ${post.curl.toFixed(1)})`);
  ok(post.bd !== pre.bd, 'logros recalculados (toneladas)');
  ok(post.nk !== pre.nk, 'el Coach de Próxima sesión se recalcula');
  ok(post.wc.find(r => r.k === 'pant').d === post.ws.pant, 'el coach semanal ya cuenta las series corregidas');
  ok(post.saved === 5, 'guardado en el teléfono');
  /* Progreso · Historial con la marca */
  await p.evaluate(() => { closeSheet(); state.tab = 'progress'; state.progSub = 'historial'; render(); }); await p.waitForTimeout(200);
  ok(await p.locator('#app .se-tag').count() >= 1, 'Progreso · Historial marca la sesión como editada');
  await shot(p, 'a3-historial');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}

console.log('B. Pesos de la rutina');
{
  const p = await open(DIR, { seed: OWNER });
  const r = await p.evaluate(() => {
    const plan = state.plans.find(x => x.gymId === 'rokaz' && x.days.some(d => d.exercises.some(e => e.name === 'Prensa 45°')));
    const day = plan.days.find(d => d.exercises.some(e => e.name === 'Prensa 45°')), pe = day.exercises.find(e => e.name === 'Prensa 45°');
    const mk = (id, date, w) => ({ id, date, planId: plan.id, planName: plan.name, dayId: day.id, dayName: day.name, gymId: 'rokaz', gymName: gymName('rokaz'), kind: 'fuerza', durationSec: 3000, exercises: [{ name: 'Prensa 45°', type: 'Piernas', sets: [{ w, r: 12 }, { w, r: 12 }] }, { name: 'Extensión de Pierna', type: 'Piernas', sets: [{ w: 50, r: 12 }] }] });
    const a = mk('t-b1', new Date('2026-10-14T19:00:00-05:00').toISOString(), 180), b = mk('t-b2', new Date('2026-10-16T19:00:00-05:00').toISOString(), 205);
    state.sessions.push(a, b); state.sessions.sort((x, y) => y.date.localeCompare(x.date)); learnWeights(a); learnWeights(b); saveLocal();
    const w0 = pe.weight;
    state.sEd = null; seStart('t-b2', '2026-10-16'); state.sEd.ex[0].sets.forEach(x => { x.w = '190'; }); seSave();
    const w1 = pe.weight;
    seStart('t-b2', '2026-10-16'); state.sEd.ex.splice(0, 1); seSave();
    const w2 = pe.weight;
    pe.weight = 150; savePlans();
    seStart('t-b1', '2026-10-14'); state.sEd.ex[0].sets.forEach(x => { x.w = '170'; }); seSave();
    return { w0, w1, w2, w3: pe.weight, ext: day.exercises.find(e => e.name === 'Extensión de Pierna') };
  });
  ok(r.w0 === 205, 'antes: la rutina tomó 205 de la sesión del viernes');
  ok(r.w1 === 190, 'corriges el viernes a 190 → la rutina queda en 190');
  ok(r.w2 === 180, 'quitas la prensa del viernes → la rutina vuelve a tu vez anterior (180)');
  ok(r.w3 === 150, 'si después cambiaste el peso a mano, editar una sesión vieja no lo toca');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}

console.log('C. Usuario nuevo');
{
  const p = await open(DIR, { at: new Date('2026-10-17T20:30:00') });
  await p.evaluate(() => {
    const plan = state.plans[0], day = plan.days[0];
    state.sessions.unshift({ id: 't-c1', date: new Date('2026-10-17T18:00:00-05:00').toISOString(), planId: plan.id, planName: plan.name, dayId: day.id, dayName: day.name, gymId: 'rokaz', gymName: gymName('rokaz'), kind: 'fuerza', durationSec: 2400,
      exercises: day.exercises.slice(0, 2).map(e => ({ name: e.name, type: e.type, sets: [{ w: 10, r: 10 }, { w: 10, r: 10 }] })) });
    saveLocal(); daySheet('2026-10-17');
  });
  await p.waitForTimeout(200);
  ok(await p.locator('#sheet .se-open').count() === 1, 'también tiene "Editar sesión"');
  await tap(p, '#sheet .se-open');
  await tap(p, '#sheet [data-se="add-ex"]');
  await p.locator('#pk-q').fill('gemelos en prensa'); await p.waitForTimeout(150);
  await tap(p, '#pk-list [data-act="pk-tog"][data-name="Elevación de Talones en Prensa"]');
  await p.locator('#pk-q').fill('V-bar pushdown'); await p.waitForTimeout(150);
  ok(await p.locator('#pk-list [data-act="pk-tog"]').count() >= 1, 'el alias en inglés "V-bar pushdown" encuentra la barra V');
  await tap(p, '#pk-list [data-act="pk-tog"][data-name="Extensión de Tríceps con Barra V en Polea"]');
  await tap(p, '#sheet [data-act="pk-add"]');
  await fill(p, 2, 0, 'w', 40); await fill(p, 2, 0, 'r', 20); await fill(p, 3, 0, 'w', 15); await fill(p, 3, 0, 'r', 12);
  await tap(p, '#sheet .pk-bottom [data-se="save"]'); await p.waitForTimeout(250);
  const s = await p.evaluate(() => state.sessions.find(s => s.id === 't-c1'));
  ok(s.exercises.length === 4 && s.exercises[2].name === 'Elevación de Talones en Prensa' && s.exercises[3].sets[0].w === 15, 'guardado con los ejercicios agregados');
  const z = await p.evaluate(() => [zoneShares('Elevación de Talones en Prensa'), zoneShares('Extensión de Tríceps con Barra V en Polea'), equipOf(libFind('Elevación de Talones en Prensa')), equipOf(libFind('Extensión de Tríceps con Barra V en Polea'))]);
  ok(JSON.stringify(z[0]) === '{"pant":1}' && JSON.stringify(z[1]) === '{"tri":1}', 'cuentan como pantorrillas y tríceps en el coach');
  ok(z[2] === 'maq' && z[3] === 'polea', 'equipo: máquina y polea');
  await shot(p, 'c-nuevo');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}

console.log('D. Reloj');
{
  const at = new Date('2026-10-19T08:00:30');
  const p = await open(DIR, { seed: OWNER, watch: true, at }), q = await open(OLD, { seed: OWNER, watch: true, at });
  const a = await shot(p, 'd-reloj'), b = await shot(q, 'd-reloj-antes');
  const dd = await pixDiff(a, b);
  ok(dd === 0, 'inicio del reloj idéntico a la versión anterior' + (dd ? ` (${dd} píxeles)` : ''));
  await q.done();
  await p.done();
}
console.log('D2. Reloj con los ejercicios nuevos en la rutina');
{
  const at = new Date('2026-10-19T08:00:30');
  const p = await open(DIR, { seed: OWNER, watch: true, at });
  const r = await p.evaluate(() => {
    const plan = activePlan(), day = nextDay(plan);
    day.exercises.unshift(newEx('Extensión de Tríceps con Barra V en Polea', 'fuerza')); day.exercises.unshift(newEx('Elevación de Talones en Prensa', 'fuerza'));
    savePlans(); startSession(plan.id, day.id); render();
    const d = state.draft; return { a: d.exercises[0].name, b: d.exercises[1].name, html: document.getElementById('app').innerText };
  });
  await p.waitForTimeout(300);
  ok(r.a === 'Elevación de Talones en Prensa' && r.b === 'Extensión de Tríceps con Barra V en Polea', 'la sesión del reloj empieza con los dos ejercicios nuevos');
  ok(r.html.toLowerCase().includes('elevación de talones en prensa'), 'se ve el nombre en el reloj');
  await shot(p, 'd2-reloj-sesion');
  const s = await p.evaluate(() => { const d = state.draft; d.exercises[0].log.forEach((x, j) => { x.w = 60; x.r = 20; markSet(0, j, true); }); d.exercises[1].log[0].w = 20; d.exercises[1].log[0].r = 12; markSet(1, 0, true); state.durOK = true; finishSession(); state.durOK = false; return state.sessions[0]; });
  ok(s.exercises[0].name === 'Elevación de Talones en Prensa' && s.exercises[0].sets.length >= 3 && s.exercises[1].sets[0].w === 20, 'se registra bien en el historial');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}

console.log('E. Emparejamiento de nombres conocidos (antes = después)');
{
  const names = async dir => {
    const p = await open(dir, { seed: OWNER });
    const r = await p.evaluate(() => {
      const set = new Set();
      state.sessions.forEach(s => s.exercises.forEach(e => set.add(e.name)));
      state.plans.forEach(pl => pl.days.forEach(d => d.exercises.forEach(e => set.add(e.name))));
      (HISTORY.records || []).forEach(x => set.add(x.name));
      Object.keys(HEVY_MAP).forEach(k => { set.add(k); set.add(HEVY_MAP[k]); });
      MY_HEVY.split('\n').slice(1).forEach(l => { const c = l.split('","'); if (c[4]) { set.add(c[4]); set.add(mapExName(c[4])); } });
      MY_SYM.forEach(r => r[2].forEach(e => set.add(e[0])));
      Object.keys(PB_SLOTS).forEach(k => Object.keys(PB_SLOTS[k]).forEach(q => Array.isArray(PB_SLOTS[k][q]) && PB_SLOTS[k][q].forEach(n => set.add(n))));
      (typeof PB_TPL !== 'undefined' ? JSON.stringify(PB_TPL) : '').replace(/"name":"([^"]+)"/g, (m, n) => set.add(n));
      LIB.filter(x => !x.cat).forEach(x => set.add(x.name));
      ['Press de Banca (Máquina Smith)', 'Sentadilla (Máquina Smith)', 'Gemelos', 'Pantorrilla', 'Tríceps', 'Press de Hombro (Máquina)', 'Remo con cable'].forEach(n => set.add(n));
      const out = {}; [...set].sort().forEach(n => { const x = libFind(n); out[n] = [x ? x.key : null, JSON.stringify(zoneShares(n)), typeOf(n), mapExName(n)]; });
      return out;
    });
    await p.done(); return r;
  };
  const A = await names(DIR), B = await names(OLD);
  const diff = Object.keys(B).filter(n => JSON.stringify(A[n]) !== JSON.stringify(B[n]));
  ok(Object.keys(B).length > 100 && !diff.length, `${Object.keys(B).length} nombres: mismo ejercicio, mismas zonas del coach, mismo tipo y mismo emparejamiento de Hevy` + (diff.length ? ': ' + diff.map(n => `${n} ${B[n]} → ${A[n]}`).join('; ') : ''));
}

await browser.close();
console.log(fail ? `\n${fail} FALLA(S)` : '\nTodo OK');
process.exit(fail ? 1 : 0);
