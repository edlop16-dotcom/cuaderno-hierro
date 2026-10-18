// Prueba de la Tanda F (habform.js): hábito + recordatorio en un formulario, ⚙ y tiempos libres de ✕ y Aplazar.
// Uso (desde PowerShell): $env:PW_DIR = "<carpeta con node_modules/playwright>"; node tests/thf.mjs <copia transpilada> <copia transpilada anterior> [capturas]
// La parte nativa (HabitAlarms.java) no corre en el navegador: aquí se comprueba lo que la app le manda (snz, again)
// y la pantalla completa propia de la app (#hab-alarm), que usa las mismas reglas.
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
const NOW = new Date('2026-10-19T21:00:30');   // lunes 21:00
async function open(dir, { seed, watch } = {}) {
  const srv = await serve(dir);
  const ctx = await browser.newContext(watch ? { viewport: { width: 410, height: 500 }, hasTouch: true } : { viewport: { width: 390, height: 844 }, hasTouch: true });
  await ctx.route(/googleapis|gstatic|google\.com|firebase/, r => r.abort());
  const p = await ctx.newPage(); p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message));
  await p.clock.setFixedTime(NOW);
  await p.addInitScript(o => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); if (o) { localStorage.setItem('cdh.settings', JSON.stringify(o)); localStorage.setItem('cdh.newsSeen', '"n5"'); } } }, seed || null);
  await p.goto(`http://127.0.0.1:${srv.address().port}/index.html`); await p.waitForTimeout(2500);
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
const tap = async (p, sel) => { await p.locator(sel).first().click(); await p.waitForTimeout(150); };

console.log('A. Dueño');
{
  const p = await open(DIR, { seed: OWNER });
  const old = await p.evaluate(() => JSON.stringify(state.reminders));
  /* ⚙ en "Tus hábitos" y desde "Hábitos de hoy" */
  await p.evaluate(() => { state.tab = 'train'; render(); });
  await tap(p, '#habits [data-act="hab-rem"]');
  ok(await p.locator('#sheet [data-hf="open"]').count() >= 3 && await p.locator('#sheet [data-act="ha-rem"]').count() === 0, '"Hábitos de hoy" → "Tus hábitos", con ⚙ en cada hábito (sin campanita)');
  await shot(p, 'a1-tus-habitos');
  /* Crear "Leer 20 min" con todo en un solo Guardar */
  await tap(p, '#sheet [data-hf="new"]');
  await p.locator('#hf-name').fill('Leer 20 min');
  await tap(p, '#sheet [data-hf="rem"]');
  await p.locator('#sheet .hf-t').first().fill('21:00');
  for (const d of [6, 0]) await p.locator(`#sheet .hf-d[value="${d}"]`).uncheck({ force: true });
  await tap(p, '#sheet [data-hf="ag-on"]'); await tap(p, '#sheet [data-hf="ag-q"][data-v="1"]');
  await p.locator('#hf-sz-n').fill('4');
  await shot(p, 'a2-nuevo-habito');
  await tap(p, '#sheet [data-hf="save"]'); await p.waitForTimeout(200);
  const c = await p.evaluate(() => { const h = habList().find(x => x.name === 'Leer 20 min'); const R = state.reminders.filter(r => habKeyOf(r) === (h && h.k)); return { h: !!h, R }; });
  ok(c.h && c.R.length === 1, 'un solo Guardar crea el hábito y su recordatorio');
  const r = c.R[0] || {};
  ok(r.time === '21:00' && JSON.stringify(r.days) === '[1,2,3,4,5]' && r.fs === true && r.again === 1 && r.snz === 4 && r.on, `recordatorio: 21:00 lun-vie, pantalla completa, ✕ cada 1 min, Aplazar 4 min`);
  const it = await p.evaluate(() => { const h = habList().find(x => x.name === 'Leer 20 min'); const L = haItems().filter(x => x.habit === h.k); return L[0]; });
  ok(it && it.snz === 4 && it.again === 1 && /cada 1 min/.test(it.body), 'el aviso lleva Aplazar 4 min y ✕ cada 1 min (lo que recibe el lado nativo)');
  /* El aviso en la app: Aplazar 4 min, tres veces seguidas; −/+; ✕ cada 1 min; ✓ lo corta */
  const show = () => p.evaluate(() => { const h = habList().find(x => x.name === 'Leer 20 min'), it = haItems().find(x => x.habit === h.k); haShow(Object.assign({}, it, { day: dk(new Date()), at: Date.now() })); return document.querySelector('#hab-alarm .ha-pill').textContent; });
  ok(await show() === 'Aplazar 4 min', 'el botón dice "Aplazar 4 min"');
  await shot(p, 'a3-aviso');
  for (let k = 0; k < 3; k++) {
    if (k) await p.evaluate(() => { const x = state.haSnz[state.haSnz.length - 1]; haShow(Object.assign({}, x)); });
    await tap(p, '#hab-alarm [data-act="ha-snooze"]');
  }
  const sn = await p.evaluate(() => state.haSnz.map(x => Math.round((x.at - Date.now()) / 60000)));
  ok(sn.length === 3 && sn.every(m => m === 4), 'aplazar 3 veces seguidas: cada una a los 4 min de tocar');
  await p.evaluate(() => { state.haSnz = []; }); await show();
  const steps = []; for (const d of ['-5', '-5', '-5', '-5', '5', '5', '5', '5', '5', '5', '5', '5']) { await p.locator(`#hab-alarm [data-act="ha-min"][data-d="${d}"]`).click(); steps.push(await p.evaluate(() => haMin)); }
  ok(steps.join() === '3,2,1,1,2,3,4,5,6,7,8,9', '−/+ de 1 en 1 (mínimo 1): ' + steps.join(','));
  for (let k = 0; k < 2; k++) await p.locator('#hab-alarm [data-act="ha-min"][data-d="5"]').click();
  ok(await p.evaluate(() => haMin) === 15 && /Aplazar 15 min/.test(await p.locator('#hab-alarm .ha-pill').textContent()), 'después de 10, de 5 en 5 (10 → 15), solo esa vez');
  await tap(p, '#hab-alarm [data-act="ha-snooze"]');
  ok(await p.evaluate(() => Math.round((state.haSnz[0].at - Date.now()) / 60000)) === 15 && await p.evaluate(() => state.reminders.find(r => r.snz === 4) != null), 'esa vez a los 15 min; el configurado sigue en 4');
  await p.evaluate(() => { state.haSnz = []; }); await show(); await tap(p, '#hab-alarm [data-act="ha-no"]');
  ok(await p.evaluate(() => state.haSnz.length === 1 && Math.round((state.haSnz[0].at - Date.now()) / 60000) === 1), '✕ lo repite al minuto');
  await p.evaluate(() => { haShow(Object.assign({}, state.haSnz[0])); }); await tap(p, '#hab-alarm [data-act="ha-snooze"]'); await p.evaluate(() => { haShow(Object.assign({}, state.haSnz[state.haSnz.length - 1])); }); await tap(p, '#hab-alarm [data-act="ha-no"]');
  ok(await p.evaluate(() => Math.round((state.haSnz[state.haSnz.length - 1].at - Date.now()) / 60000)) === 1, 'tras aplazar, la ✕ aplica su regla (cada 1 min)');
  await p.evaluate(() => { const h = habList().find(x => x.name === 'Leer 20 min'); state.daily[dk(new Date())] = Object.assign(state.daily[dk(new Date())] || {}, { [h.k]: true }); saveDaily(); });
  ok(await p.evaluate(() => { const h = habList().find(x => x.name === 'Leer 20 min'); return !haItems().some(x => x.habit === h.k && x.day === dk(new Date())); }), 'al marcar ✓ (desde la app) ya no vuelve a sonar hoy');
  /* Editar con ⚙: cambiar todo sin duplicar */
  await p.evaluate(() => { const h = habList().find(x => x.name === 'Leer 20 min'); habManage(); }); await p.waitForTimeout(100);
  const k = await p.evaluate(() => habList().find(x => x.name === 'Leer 20 min').k);
  await tap(p, `#sheet [data-hf="open"][data-k="${k}"]`);
  ok(await p.locator('#sheet .hf-t').first().inputValue() === '21:00' && await p.locator('#hf-sz-n').inputValue() === '4', '⚙ abre "Editar hábito" con lo guardado');
  await p.locator('#hf-name').fill('Leer 30 min'); await p.locator('#sheet .hf-t').first().fill('20:30');
  await tap(p, '#sheet [data-hf="t-add"]'); await p.locator('#sheet .hf-t').nth(1).fill('07:00');
  await tap(p, '#sheet [data-hf="ag-off"]'); await p.locator('#hf-sz-n').fill('1'); await p.locator('#hf-sz-u').selectOption('60');
  await tap(p, '#sheet [data-hf="save"]');
  const e = await p.evaluate(k => state.reminders.filter(r => habKeyOf(r) === k).map(r => ({ t: r.time, ag: r.again || 0, sz: r.snz })), k);
  ok(e.length === 2 && e[0].t === '20:30' && e[1].t === '07:00' && e.every(x => x.ag === 0 && x.sz === 60), 'editado: 2 horas, sin repetir con ✕, Aplazar 1 h, sin duplicar');
  await tap(p, `#sheet [data-hf="open"][data-k="${k}"]`); await tap(p, '#sheet [data-hf="save"]');
  ok(await p.evaluate(k => state.reminders.filter(r => habKeyOf(r) === k).length, k) === 2, 'guardar otra vez no duplica');
  /* Viejos intactos y el formulario de Agua con tiempos libres */
  const oldR = JSON.parse(old), nowAll = await p.evaluate(() => state.reminders);
  ok(oldR.every(o => nowAll.some(n => n.time === o.time && JSON.stringify(n.days) === JSON.stringify(o.days) && n.kind === o.kind && (n.again || 0) === (o.again || 0))), 'cada uno sigue igual');
  const wi = await p.evaluate(() => state.reminders.findIndex(r => r.kind === 'water'));
  if (wi >= 0) {
    await p.evaluate(i => { closeSheet(); remSheet(i); }, wi);
    ok(await p.locator('#sheet .hf-ag').count() === 1 && await p.locator('#sheet .hf-sz').count() === 1, 'Agua también tiene "Si lo cierras con ✕" y "Aplazar" libres');
    await tap(p, '#sheet [data-hf="ag-on"]'); await tap(p, '#sheet [data-hf="ag-q"][data-v="3"]'); await p.locator('#hf-sz-n').fill('7');
    await p.locator('#f-rem button[type="submit"]').click(); await p.waitForTimeout(200);
    ok(await p.evaluate(i => state.reminders[i].again === 3 && state.reminders[i].snz === 7, wi), 'Agua: ✕ cada 3 min y Aplazar 7 min guardados');
  }
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}

console.log('B. Usuario nuevo');
{
  const p = await open(DIR, {});
  await p.evaluate(() => habManage()); await tap(p, '#sheet [data-hf="new"]');
  await p.locator('#hf-name').fill('Estirar'); await tap(p, '#sheet [data-hf="rem"]'); await tap(p, '#sheet [data-hf="save"]');
  const r = await p.evaluate(() => { const h = habList().find(x => x.name === 'Estirar'); return { h: !!h, n: state.reminders.filter(r => habKeyOf(r) === h.k).length }; });
  ok(r.h && r.n === 1, 'crea su primer hábito con recordatorio');
  await shot(p, 'b1-nuevo');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}

console.log('C. Reloj');
{
  const at = new Date('2026-10-19T08:00:30');
  const p = await open(DIR, { seed: OWNER, watch: true }), q = await open(OLD, { seed: OWNER, watch: true });
  await p.clock.setFixedTime(at); await q.clock.setFixedTime(at); await p.reload(); await q.reload(); await p.waitForTimeout(2200); await q.waitForTimeout(2200);
  const d = await pixDiff(await shot(p, 'c1-reloj'), await shot(q, 'c1-reloj-antes'));
  ok(d === 0, 'inicio del reloj idéntico' + (d ? ` (${d} px)` : ''));
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done(); await q.done();
}

await browser.close();
console.log(fail ? `\n${fail} FALLA(S)` : '\nTodo OK');
process.exit(fail ? 1 : 0);
