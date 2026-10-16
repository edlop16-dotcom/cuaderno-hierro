// Prueba de editar recordatorios de hábitos y de la ✕ que repite (habalarm.js), con Playwright y Edge.
// Uso (desde PowerShell): $env:PW_DIR = "<carpeta con node_modules/playwright>"; node tests/trem.mjs <copia transpilada> [copia transpilada anterior] [capturas]
// Escenarios: dueño (editar su "Toma tu creatina" viejo, campanita que edita, ✕ que repite varias veces hasta las 23:00 y
// se corta al marcarlo), usuario nuevo (campanita: nuevo y luego editar) y reloj (idéntico a la versión anterior).
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = createRequire(path.join(process.env.PW_DIR || HERE, 'x.js'))('playwright');
const [DIR, OLD, SHOTS] = process.argv.slice(2);
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
const browser = await chromium.launch({ channel: 'msedge', headless: false, args: ['--headless=new'] });
async function open(dir, { owner, watch, time = '2026-10-19T08:00:30' } = {}) {
  const srv = await serve(dir);
  const ctx = await browser.newContext(watch ? { viewport: { width: 410, height: 500 }, hasTouch: true } : { viewport: { width: 390, height: 844 }, hasTouch: true });
  await ctx.route(/googleapis|gstatic|google\.com|firebase/, r => r.abort());
  const p = await ctx.newPage(); p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message));
  await p.clock.install({ time: new Date(time) });
  await p.addInitScript(o => {
    if (o.owner && !localStorage.getItem('cdh.settings')) { localStorage.setItem('cdh.settings', JSON.stringify({ owner: 1, healthOk: 1 })); localStorage.setItem('cdh.newsSeen', '"n4"'); }
  }, { owner });
  await p.goto(`http://127.0.0.1:${srv.address().port}/index.html`);
  await p.waitForTimeout(1500);
  if (!owner && !watch) await p.evaluate(() => { state.settings.onb = 1; state.settings.healthOk = 1; if (typeof pbClose === 'function') pbClose(); LS.set('newsSeen', NEWS_KEY); savePlans(); closeSheet(); render(); });
  await p.evaluate(() => { if (!$('#sheet').hidden) closeSheet(); });
  p.done = async () => { await ctx.close(); srv.close(); };
  return p;
}
const shot = async (p, n) => { if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await p.screenshot({ path: path.join(SHOTS, n + '.png') }); } };
const form = p => p.evaluate(() => ({
  title: ($('#sheet h2') || {}).textContent, kind: ($('#rm-kind') || {}).value, hab: ($('#rm-hab') || {}).value,
  habShown: !!$('#rm-hab-f') && !$('#rm-hab-f').hidden, again: ($('#rm-again') || {}).value, againShown: !!$('#rm-again-f') && !$('#rm-again-f').hidden,
  label: ($('#rm-label') || {}).value, time: ($('#rm-time') || {}).value, opts: Array.prototype.map.call(document.querySelectorAll('#rm-again option'), o => o.textContent),
}));

console.log('A. Dueño: editar su recordatorio viejo de creatina en Ajustes');
{
  const p = await open(DIR, { owner: true });
  const i = await p.evaluate(() => state.reminders.findIndex(r => r.id === 'r-crea'));
  const before = await p.evaluate(i => JSON.stringify(state.reminders[i]), i);
  console.log('     antes: ' + before);
  ok(i >= 0 && JSON.parse(before).kind === 'crea', 'tiene el recordatorio viejo tipo "Creatina"');
  await p.click('#btn-settings'); await p.waitForTimeout(300);
  await p.evaluate(() => document.querySelectorAll('details').forEach(d => { d.open = true; }));
  await p.click(`[data-act="r-edit"][data-i="${i}"]`); await p.waitForSelector('#f-rem');
  let F = await form(p);
  ok(F.title === 'Editar recordatorio', 'abre "Editar recordatorio"');
  ok(F.kind === 'hab' && F.hab === 'crea' && F.habShown, 'se muestra como Hábito · Creatina');
  ok(F.againShown && F.again === '0', 'aparece "Si lo cierras con ✕" (una vez al día)');
  ok(F.label === 'Toma tu creatina (5 g)' && F.time === '08:00', 'conserva el texto y la hora');
  ok(F.opts.join('|') === 'No volver a avisar hoy (una vez al día)|Repetir cada 30 min hasta que lo marques|Repetir cada 1 hora hasta que lo marques|Repetir cada 2 horas hasta que lo marques|Repetir cada 3 horas hasta que lo marques|Repetir cada 4 horas hasta que lo marques', 'opciones "Repetir cada …"');
  await p.selectOption('#rm-again', '120');
  await shot(p, 'a1-editar-creatina');
  await p.click('#f-rem button[type="submit"]'); await p.waitForTimeout(300);
  const R = await p.evaluate(i => state.reminders[i], i);
  console.log('     después: ' + JSON.stringify(R));
  ok(R.id === 'r-crea' && R.kind === 'hab' && R.hab === 'crea' && R.again === 120 && R.time === '08:00' && R.days.length === 7 && R.on, 'guardado: Hábito creatina, repite cada 2 h, misma hora y días');
  ok(await p.evaluate(() => state.reminders.filter(r => habKeyOf(r) === 'crea').length) === 1, 'no se duplicó');
  await p.click(`[data-act="r-edit"][data-i="${i}"]`); await p.waitForSelector('#f-rem');
  F = await form(p);
  ok(F.again === '120' && F.kind === 'hab', 'al volver a editar sigue "Repetir cada 2 horas"');
  await p.evaluate(() => closeSheet());
  console.log('B. Dueño: la campanita de "Tus hábitos"');
  await p.evaluate(() => habManage());
  await p.click('#sheet [data-act="ha-rem"][data-k="crea"]'); await p.waitForSelector('#f-rem');
  F = await form(p);
  ok(F.title === 'Editar recordatorio' && F.hab === 'crea' && F.again === '120', 'creatina: abre el que ya existe para editarlo');
  await p.evaluate(() => closeSheet()); await p.evaluate(() => habManage());
  await p.click('#sheet [data-act="ha-rem"][data-k="prot"]'); await p.waitForSelector('#f-rem');
  F = await form(p);
  ok(F.title === 'Nuevo recordatorio' && F.kind === 'hab' && F.hab === 'prot' && F.againShown, 'proteína (sin recordatorio): abre uno nuevo');
  await p.evaluate(() => closeSheet());
  console.log('C. Dueño: la ✕ repite varias veces (pantalla dentro de la app)');
  await p.evaluate(() => { state.tab = 'train'; render(); });
  await p.clock.runFor(60000);   // 08:01:30: sale el de las 08:00
  ok(await p.evaluate(() => !!haCur && haCur.habit === 'crea' && /cada 2 horas/.test(haCur.body)), 'a las 08:00 aparece, y dice "✕ te lo vuelve a recordar cada 2 horas"');
  const times = [];
  for (let k = 0; k < 8; k++) {
    if (!(await p.evaluate(() => !!haCur))) break;
    times.push(await p.evaluate(() => new Date().toTimeString().slice(0, 5)));
    await p.click('#hab-alarm [data-act="ha-no"]');
    await p.clock.fastForward(2 * 3600000); await p.clock.runFor(30000);
  }
  console.log('     sonó a las: ' + times.join(', '));
  ok(times.length === 8 && times[0] === '08:01' && /^22:/.test(times[7]), `repite cada 2 h tras cada ✕ (${times.length} veces, la última antes de las 23:00)`);
  ok(await p.evaluate(() => !haCur && !state.haSnz.some(x => x.at > Date.now())), 'después de las 23:00 ya no vuelve');
  /* Marcado como hecho: se corta */
  const toEight = await p.evaluate(() => { const t = new Date(); t.setHours(8, 0, 20, 0); if (t.getTime() <= Date.now()) t.setDate(t.getDate() + 1); return t.getTime() - Date.now(); });
  await p.clock.fastForward(toEight);   // día siguiente, 08:00
  await p.clock.runFor(30000);
  ok(await p.evaluate(() => !!haCur), 'al día siguiente vuelve a las 08:00');
  await p.click('#hab-alarm [data-act="ha-no"]');
  await p.evaluate(() => { haMark('crea', dk(new Date())); saveDaily(); });
  await p.clock.fastForward(2 * 3600000); await p.clock.runFor(30000);
  ok(await p.evaluate(() => !haCur), 'si lo marcas hecho, la repetición no sale');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}
console.log('D. Usuario nuevo: campanita crea uno nuevo y luego lo edita');
{
  const p = await open(DIR, {});
  ok(await p.evaluate(() => pubUser() && !state.reminders.some(r => habKeyOf(r))), 'usuario público sin recordatorios de hábitos');
  const k = await p.evaluate(() => habList().filter(h => !h.hidden)[0].k);
  await p.evaluate(() => habManage());
  await p.click(`#sheet [data-act="ha-rem"][data-k="${k}"]`); await p.waitForSelector('#f-rem');
  let F = await form(p);
  ok(F.title === 'Nuevo recordatorio' && F.kind === 'hab' && F.hab === k && F.againShown, `nuevo para "${k}" con la opción de la ✕`);
  await p.selectOption('#rm-again', '30');
  await p.click('#f-rem button[type="submit"]'); await p.waitForTimeout(300);
  await p.evaluate(() => habManage());
  await p.click(`#sheet [data-act="ha-rem"][data-k="${k}"]`); await p.waitForSelector('#f-rem');
  F = await form(p);
  ok(F.title === 'Editar recordatorio' && F.again === '30', 'la campanita ahora abre ese para editarlo (cada 30 min)');
  ok(await p.evaluate(k => state.reminders.filter(r => habKeyOf(r) === k).length, k) === 1, 'uno solo');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}
console.log('E. Reloj 410×500');
{
  const p = await open(DIR, { owner: true, watch: true });
  ok(await p.evaluate(() => isWatch()), 'modo reloj');
  const img = await p.screenshot(); await shot(p, 'e1-reloj');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
  if (OLD) { const q = await open(OLD, { owner: true, watch: true }); const old = await q.screenshot(); await q.done(); ok(Buffer.compare(img, old) === 0, 'idéntico a la versión anterior'); }
}
await browser.close();
console.log(fail ? `\n${fail} FALLAS` : '\nTodo OK');
process.exit(fail ? 1 : 0);
