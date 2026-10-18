// Actualización con datos ficticios existentes. Firestore simulado: nunca toca una cuenta real.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { OWNER_SETTINGS, seedOwner } from './owner-fixture.mjs';
const { chromium } = createRequire(path.join(process.env.PW_DIR || process.cwd(), 'x.js'))('playwright');
const dir = process.argv[2];
if (!dir) throw new Error('Falta la copia web de pruebas');
const server = http.createServer((q, r) => {
  const file = path.join(dir, q.url.split('?')[0] === '/' ? 'index.html' : q.url.split('?')[0]);
  fs.readFile(file, (e, bytes) => { if (e) { r.writeHead(404); r.end(); return; } r.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : file.endsWith('.woff2') ? 'font/woff2' : 'text/html'); r.end(bytes); });
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL === 'chromium' ? undefined : 'msedge', headless: true });
// Casos ficticios: cuenta anterior a la bienvenida, sin settings.prof.
let fail = 0;
try {
 for (const savedBody of [false, true]) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.route(/googleapis|gstatic|google\.com|firebase/, route => route.abort());
  const page = await context.newPage(), errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.clock.setFixedTime(new Date('2026-10-19T12:00:00Z'));
  await seedOwner(page, OWNER_SETTINGS);
  const settings = structuredClone(OWNER_SETTINGS); delete settings.prof;
  if (!savedBody) delete settings.body;
  else settings.body = { h: 181, sex: 'f', w: [{ d: '2026-10-01', kg: 61.5 }], m: [] };
  await page.addInitScript(settings => {
   if (sessionStorage.getItem('empty-seeded')) return;
   sessionStorage.setItem('empty-seeded', '1'); localStorage.setItem('cdh.settings', JSON.stringify(settings));
   localStorage.setItem('cdh.newsSeen', JSON.stringify('n6')); localStorage.setItem('cdh.reminders', '[]');
  }, settings);
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html`); await page.waitForTimeout(1000);
  const before = await page.evaluate(() => JSON.stringify({ plans: state.plans, sessions: state.sessions, gyms: state.gyms }));
  const data = await page.evaluate(() => ({ prof: state.settings.prof || null, history: HISTORY, body: body(), calc: nutriCalc(), goal: ddGoal(), kg: curWeight(), greet: document.querySelector('.pagehead h1').textContent, export: aixAllText('all').txt, ctx: aiContext(), fill: aixFill('Mi edad es {edad}. Mi peso es {peso}. Mi objetivo es {objetivo}. Analiza mis sesiones.', aixProfile()) }));
  assert.equal(data.prof, null); assert.equal(data.history.name, ''); assert.equal(data.history.age, null); assert.equal(data.goal, '');
  assert.equal(data.calc.complete, false); assert.equal(data.calc.kcal, null); assert.ok(!data.greet.includes('Atleta'));
  assert.ok(!/Mi edad es|Mi objetivo es|\{edad\}|\{peso\}|\{objetivo\}/.test(data.fill));
  assert.ok(!/null|undefined|NaN|Infinity/.test(data.ctx));
  if (savedBody) {
   assert.equal(data.kg, 61.5); assert.equal(data.history.cm, 181); assert.ok(/61[.,]5 kg/.test(data.fill)); assert.deepEqual(data.body, settings.body);
  } else {
   assert.equal(data.kg, null); assert.equal(data.history.kg, null); assert.equal(data.history.cm, null);
   assert.equal(data.body.h, undefined); assert.equal(data.body.sex, undefined); assert.equal(data.fill, 'Analiza mis sesiones.');
   assert.ok(!/MIS DATOS:/.test(data.export));
  }
  await page.evaluate(() => { state.tab = 'profile'; render(); });
  assert.ok(await page.locator('#app .pcard [data-act="bd-data"]').count());
  const profile = await page.locator('#app').innerText();
  assert.ok(!/Atleta|30 años|70 kg|170 cm|NaN|Infinity|undefined|null/.test(profile));
  assert.ok(await page.locator('.nu-card [data-act="bd-data"]').count());
  if (process.argv[3]) { fs.mkdirSync(process.argv[3], { recursive: true }); await page.waitForTimeout(1000); await page.screenshot({ animations: 'disabled', path: path.join(process.argv[3], savedBody ? 'sin-prof-con-medidas.png' : 'sin-prof-sin-datos.png') }); }
  await page.locator('.pcard [data-act="bd-data"]').click();
  assert.equal(await page.inputValue('#bd-name'), ''); assert.equal(await page.inputValue('#bd-age'), ''); assert.equal(await page.inputValue('#bd-goal'), '');
  assert.equal(await page.inputValue('#bd-h'), savedBody ? '181' : '');
  if (!savedBody) assert.equal(await page.locator('[data-act="bd-sex"].on').count(), 0);
  await page.evaluate(() => closeSheet());
  assert.equal(await page.evaluate(() => JSON.stringify({ plans: state.plans, sessions: state.sessions, gyms: state.gyms })), before);
  if (savedBody) {
   await page.evaluate(() => dataSheet()); await page.fill('#bd-name', 'Persona de prueba'); await page.fill('#bd-age', '29'); await page.selectOption('#bd-goal', 'salud');
   await page.locator('#f-bdd button[type="submit"]').click();
   const after = await page.evaluate(() => ({ p: state.settings.prof, c: nutriCalc(), goal: ddGoal(), plans: JSON.stringify({ plans: state.plans, sessions: state.sessions, gyms: state.gyms }) }));
   assert.equal(after.p.age, 29); assert.equal(after.p.name, 'Persona de prueba'); assert.equal(after.c.complete, true); assert.equal(after.goal, 'Salud y energía'); assert.equal(after.plans, before);
  } else {
   await page.reload(); await page.waitForTimeout(500); assert.equal(await page.evaluate(() => state.settings.prof || null), null);
   assert.equal(await page.evaluate(() => curWeight()), null);
  }
  assert.deepEqual(errors, []); console.log(`ok: dueño sin prof, ${savedBody ? 'con datos corporales guardados' : 'sin datos corporales'}: saludo, Perfil, nutrición, IA, ddGoal y almacenamiento`);
  await context.close();
 }
} catch (e) { fail++; console.error(e); }
finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
console.log(fail ? 'FALLA' : 'Todo OK'); process.exitCode = fail ? 1 : 0;
