// Prueba en la app de "Importar recomendación" (next.js) con Playwright y Edge, sobre la copia transpilada.
// Uso (desde PowerShell; desde Git Bash Edge se cierra al arrancar):
//   node ci/legacy.mjs <copia de www>      (antes: copiar www/ a esa carpeta)
//   $env:PW_DIR = "<carpeta con node_modules/playwright>"; node tests/tnsimp.mjs <copia transpilada> [copia transpilada anterior] [carpeta de capturas]
// Escenarios: dueño (texto real, aviso de día, vista previa, sin dato, guardar, entrenar, copiar instrucción, tabla con "|",
// textos sin datos), usuario nuevo y reloj (sin cambios: captura igual a la versión anterior si se pasa).
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const req = createRequire(path.join(process.env.PW_DIR || HERE, 'x.js'));
const { chromium } = req('playwright');
const [DIR, OLD, SHOTS] = process.argv.slice(2);
if (!DIR) throw new Error('Falta la carpeta transpilada');
const REAL = fs.readFileSync(path.join(HERE, 'importar-ejemplo-real-1.txt'), 'utf8');
const PIPE = '**Recomendación para el próximo viernes**\n\n| Ejercicio | Peso | Reps | RIR |\n|---|---|---|---|\n| Prensa 45° | 195 kg | 15 | 2,1,0 |\n| Hack | 60 | 12 | 1-2 |\n| Ext. pierna | 45 | 14-16 | 2 |\n| Remo Cable | 35,5 | 10 a 12 | 2,1 |\n';
const NADA = '¡Buen trabajo, campeón! Sigue así.\nDescansa bien y come proteína.';
const ANALISIS = 'Serie\tPeso\tReps\tRIR\tAnálisis\n1\t180 kg\t15\t@2\tBien.\n2\t190 kg\t12\t@?\tSubiste.';

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.webp': 'image/webp', '.woff2': 'font/woff2', '.woff': 'font/woff', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const serve = dir => new Promise(res => {
  const s = http.createServer((q, r) => {
    let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
    fs.readFile(path.join(dir, p), (e, b) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); r.end(b); });
  }).listen(0, '127.0.0.1', () => res(s));
});

let fail = 0;
const ok = (c, msg) => { if (c) console.log('  ok  ', msg); else { fail++; console.log('  FALLA', msg); } };
const MON = new Date('2026-10-19T09:00:00');   // lunes

const browser = await chromium.launch({ channel: 'msedge', headless: false, args: ['--headless=new'] });
async function open(dir, { owner, watch } = {}) {
  const srv = await serve(dir);
  const ctx = await browser.newContext(watch ? { viewport: { width: 410, height: 500 }, hasTouch: true } : { viewport: { width: 390, height: 844 }, hasTouch: true });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: `http://127.0.0.1:${srv.address().port}` });
  await ctx.route(/googleapis|gstatic|google\.com|firebase|spotify|youtube/, r => r.abort());
  const p = await ctx.newPage(); p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message));
  await p.clock.install({ time: MON });
  await p.addInitScript(o => {
    if (o.owner && !localStorage.getItem('cdh.settings')) { localStorage.setItem('cdh.settings', JSON.stringify({ owner: 1, healthOk: 1 })); localStorage.setItem('cdh.newsSeen', '"n5"'); }
  }, { owner });
  await p.goto(`http://127.0.0.1:${srv.address().port}/index.html`);
  await p.waitForTimeout(1500);
  if (!owner && !watch) await p.evaluate(() => { state.settings.onb = 1; state.settings.healthOk = 1; if (typeof pbClose === 'function') pbClose(); LS.set('newsSeen', NEWS_KEY); savePlans(); closeSheet(); render(); });
  await p.evaluate(() => { if (!$('#sheet').hidden) closeSheet(); });
  p.done = async () => { await ctx.close(); srv.close(); };
  return p;
}
const shot = async (p, name) => { if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await p.screenshot({ path: path.join(SHOTS, name + '.png') }); } };
const openImport = async p => { await p.click('.hoy-hero [data-ns="imp"]'); await p.waitForSelector('#ns-txt'); };
const rows = p => p.$$eval('#sheet .ns-ed:not(.nd)', els => els.map(el => {
  const sel = el.querySelector('select.ns-ex'), o = sel && sel.options[sel.selectedIndex];
  const v = s => (el.querySelector(s) || {}).value;
  return { raw: (el.querySelector('.ns-raw') || {}).textContent, ex: o ? o.textContent : '', w: v('[data-ns="w"]'), rmin: v('[data-ns="rmin"]'), rmax: v('[data-ns="rmax"]'),
    rir: Array.prototype.map.call(el.querySelectorAll('[data-ns="rir"]'), x => x.value).join(','), ask: !!el.querySelector('.ns-ask') };
}));

/* ---------------- Dueño ---------------- */
console.log('A. Dueño, lunes: texto real');
{
  const p = await open(DIR, { owner: true });
  ok(await p.$('.hoy-hero .ns-box [data-ns="imp"]'), 'Hoy muestra "Importar" en la tarjeta del lunes');
  await openImport(p);
  ok(await p.$eval('#ns-day', s => s.value) === 'plan1|p1-lun', '"Para el día" empieza en el lunes · Piernas + Torso (Pesado)');
  await p.fill('#ns-txt', REAL);
  const tabs = await p.$eval('#ns-txt', t => (t.value.match(/\t/g) || []).length);
  ok(tabs === (REAL.match(/\t/g) || []).length, `el cuadro conserva las ${tabs} tabulaciones`);
  ok(await p.$eval('#ns-dayw', b => b.hidden), 'sin aviso de día (el texto dice lunes y está el lunes)');
  await p.selectOption('#ns-day', 'plan1|p1-vie');
  ok(!(await p.$eval('#ns-dayw', b => b.hidden)) && /habla del lunes y elegiste el viernes/.test(await p.textContent('#ns-dayw')), 'al elegir el viernes avisa: "El texto habla del lunes y elegiste el viernes"');
  ok(await p.$eval('#ns-day', s => s.value) === 'plan1|p1-vie', 'no cambia el día solo');
  await shot(p, 'a1-aviso-dia');
  await p.click('#ns-dayw [data-ns="setday"]');
  ok(await p.$eval('#ns-day', s => s.value) === 'plan1|p1-lun' && await p.$eval('#ns-dayw', b => b.hidden), '"Cambiar a lunes" lo cambia y el aviso se va');
  await p.click('[data-ns="read"]'); await p.waitForSelector('#sheet .ns-ed');
  const R = await rows(p);
  console.log('     ' + R.map(r => `${r.raw} → ${r.ex} · ${r.w} kg · ${r.rmin}-${r.rmax} · RIR ${r.rir}`).join('\n     '));
  const W = [['Prensa 45°', 'Prensa 45°', '190', '15', '15'], ['Sentadilla Hack', 'Sentadilla Hack', '60', '11', '12'], ['Hip Thrust', 'Hip Thrust', '30', '15', '18'],
    ['Curl Femoral', 'Curl Femoral Tumbado', '25', '15', '18'], ['Remo Cable', 'Remo Sentado con Cable', '35', '10', '12'], ['Extensión', 'Extensión de Pierna', '45', '14', '16']];
  ok(R.length === 6, `vista previa con 6 ejercicios (hay ${R.length})`);
  W.forEach(([raw, ex, w, a, b], i) => { const r = R[i] || {}; ok(r.raw === `Leído: «${raw}»` && r.ex === ex && r.w === w && r.rmin === a && r.rmax === b && r.rir === '2,1,0' && !r.ask, `${raw} → ${ex} · ${w} · ${a}-${b} · RIR 2,1,0`); });
  const nd = await p.$$eval('#sheet .ns-ed.nd .ns-name', e => e.map(x => x.textContent));
  ok(nd.join('|') === 'Press Banca Inclinado (Barra)|Elevaciones Laterales', `sin dato: ${nd.join(', ')}`);
  await shot(p, 'a2-vista-previa');
  await p.click('#sheet .ns-ed.nd [data-ex]');   // Press Banca Inclinado: ponerle datos
  ok((await rows(p)).length === 7 && (await p.$$('#sheet .ns-ed.nd')).length === 1, '"Poner peso, reps y RIR" lo vuelve editable');
  await p.selectOption('#sheet .ns-ed:not(.nd) >> nth=6 >> select', 'skip');
  await p.fill('#sheet .ns-ed:not(.nd) >> nth=0 >> [data-ns="w"]', '192,5');
  await p.click('[data-ns="save"]'); await p.waitForTimeout(300);
  const ia = await p.evaluate(() => state.settings.nextS['p1-lun'].ia);
  ok(ia && ia.ex.length === 6 && ia.ex.map(x => x.name).join('|') === 'Prensa 45°|Sentadilla Hack|Hip Thrust|Curl Femoral Tumbado|Remo Sentado con Cable|Extensión de Pierna', 'guardada con los 6 (la línea descartada no)');
  ok(ia && ia.ex[0].sets.map(s => s.w + '×' + s.rMin + '-' + s.rMax + '@' + s.rir).join(' ') === '192.5×15-15@2 192.5×15-15@1 192.5×15-15@0', 'Prensa editada: 192,5 × 15, RIR 2·1·0');
  ok(ia && ia.ex[4].sets.length === 3 && ia.ex[4].sets.every(s => s.w === 35 && s.rMin === 10 && s.rMax === 12), 'Remo 35 × 10-12 en 3 series');
  const plan = await p.evaluate(() => JSON.stringify(state.plans.find(x => x.id === 'plan1').days[0].exercises.map(e => [e.name, e.weight, e.sets])));
  ok(/"Prensa 45°",190,3/.test(plan) && /"Remo Sentado con Cable",40,3/.test(plan), 'el plan no cambia');
  ok(await p.$eval('.hoy-hero .ns-pick .on', b => b.textContent) === 'Importada', 'Hoy queda en "Importada"');
  await p.click('.hoy-hero #btn-start'); await p.waitForTimeout(800);
  const dr = await p.evaluate(() => state.draft && state.draft.exercises.slice(0, 6).map(e => [e.name, e.log.map(s => s.w).join('/'), e.repsMin + '-' + e.repsMax, (e.rirT || []).join('')]));
  console.log('     sesión: ' + JSON.stringify(dr));
  ok(dr && dr[0][1] === '192.5/192.5/192.5' && dr[0][3] === '210' && dr[1][2] === '11-12' && dr[5][0] === 'Remo Sentado con Cable' && dr[5][1] === '35/35/35', 'al entrenar usa los pesos, reps y RIR importados');
  await p.evaluate(() => { state.draft = null; saveDraft(); render(); });
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}
console.log('B. Dueño: copiar instrucción, tabla con "|", textos sin datos');
{
  const p = await open(DIR, { owner: true });
  await openImport(p);
  await p.click('[data-ns="ask"]'); await p.waitForTimeout(300);
  const clip = (await p.evaluate(() => navigator.clipboard.readText())).replace(/\r/g, '');   // Windows devuelve CRLF

  console.log('     ' + clip.split('\n').join('\n     '));
  ok(/Ejercicio \| Peso \| Reps \| RIR/.test(clip) && /del lunes \(Piernas \+ Torso \(Pesado\)\)/.test(clip), 'copia la instrucción con el formato y el día');
  ok(['Prensa 45°', 'Sentadilla Hack', 'Hip Thrust', 'Curl Femoral Tumbado', 'Press Banca Inclinado (Barra)', 'Remo Sentado con Cable', 'Elevaciones Laterales', 'Extensión de Pierna'].every(n => clip.indexOf('- ' + n + '\n') >= 0), 'con los nombres exactos de los 8 ejercicios del lunes');
  await p.fill('#ns-txt', NADA); await p.click('[data-ns="read"]'); await p.waitForTimeout(200);
  ok(!(await p.$eval('#ns-txt-e', e => e.hidden)) && /No encontré una recomendación/.test(await p.textContent('#ns-txt-e')), 'texto sin datos: mensaje claro');
  ok(await p.$eval('#ns-txt', t => t.value) === NADA, 'el cuadro no se cierra ni se borra');
  await shot(p, 'b1-sin-datos');
  await p.fill('#ns-txt', ANALISIS); await p.click('[data-ns="read"]'); await p.waitForTimeout(200);
  ok(/tablas de análisis/.test(await p.textContent('#ns-txt-e')), 'solo análisis: lo dice');
  await p.fill('#ns-txt', PIPE);
  ok(/habla del viernes y elegiste el lunes/.test(await p.textContent('#ns-dayw')), 'tabla con "|" del viernes: avisa');
  await p.click('[data-ns="read"]'); await p.waitForSelector('#sheet .ns-ed');
  const R = await rows(p);
  console.log('     ' + R.map(r => `${r.raw} → ${r.ex} · ${r.w} · ${r.rmin}-${r.rmax} · RIR ${r.rir}`).join('\n     '));
  ok(R.length === 4 && R.map(r => r.ex).join('|') === 'Prensa 45°|Sentadilla Hack|Extensión de Pierna|Remo Sentado con Cable', 'tabla con "|": 4 emparejados (Hack, Ext. pierna)');
  ok(R[1].rir === '2,2,2' && R[2].rir === '2,2,2' && R[3].rir === '2,1' && R[3].w === '35,5', 'RIR "1-2" → 2 en las 3 series de tu rutina; "2" en todas; "2,1" = 2 series; 35,5 kg');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}
/* ---------------- Usuario nuevo ---------------- */
console.log('C. Usuario nuevo (Cuerpo completo A el lunes)');
{
  const p = await open(DIR, {});
  ok(await p.evaluate(() => pubUser()), 'es usuario público');
  await openImport(p);
  await p.fill('#ns-txt', REAL); await p.click('[data-ns="read"]'); await p.waitForSelector('#sheet .ns-ed');
  const R = await rows(p);
  console.log('     ' + R.map(r => `${r.raw} → ${r.ex || '¿?'}${r.ask ? ' (pregunta)' : ''}`).join('\n     '));
  ok(R[0].ex === 'Prensa 45°' && R[3].ex === 'Curl Femoral Sentado' && !R[0].ask && !R[3].ask, 'Prensa 45° y Curl Femoral → Curl Femoral Sentado');
  ok([1, 2, 4, 5].every(i => R[i].ex === '¿Cuál es? Elige…' && R[i].ask), 'los que no están en su día piden elegir (no inventa)');
  const nd = await p.$$eval('#sheet .ns-ed.nd .ns-name', e => e.map(x => x.textContent));
  ok(nd.length === 4, `sin dato: ${nd.join(', ')}`);
  await p.click('[data-ns="save"]'); await p.waitForTimeout(200);
  ok(!(await p.$eval('#ns-save-e', e => e.hidden)), 'guardar sin elegir: pide elegir o descartar');
  for (const i of [1, 2, 4, 5]) await p.selectOption(`#sheet .ns-ed:not(.nd) >> nth=${i} >> select`, 'skip');
  await shot(p, 'c1-nuevo');
  await p.click('[data-ns="save"]'); await p.waitForTimeout(300);
  const ia = await p.evaluate(() => { const n = state.settings.nextS || {}; const k = Object.keys(n)[0]; return k && n[k].ia; });
  ok(ia && ia.ex.length === 2 && ia.ex[1].sets.length === 3 && ia.ex[1].sets[0].w === 25, 'guardada con 2 (Prensa y Curl Femoral Sentado 25 × 15-18)');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}
/* ---------------- Reloj ---------------- */
console.log('D. Reloj 410×500');
{
  const p = await open(DIR, { owner: true, watch: true });
  ok(await p.evaluate(() => isWatch()), 'modo reloj');
  ok(!(await p.$('.ns-box')) && !(await p.$('[data-ns="imp"]')), 'no muestra importar ni elegir');
  await shot(p, 'd1-reloj');
  const img = await p.screenshot();
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
  if (OLD) {
    const q = await open(OLD, { owner: true, watch: true });
    const old = await q.screenshot(); await q.done();
    ok(Buffer.compare(img, old) === 0, 'la pantalla del reloj es idéntica a la versión anterior');
  }
}
await browser.close();
console.log(fail ? `\n${fail} FALLAS` : '\nTodo OK');
process.exit(fail ? 1 : 0);
