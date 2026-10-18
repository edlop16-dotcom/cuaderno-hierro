import { OWNER_SETTINGS, seedOwner } from './owner-fixture.mjs';
// Prueba de las Novedades n6 (news.js): editar sesión y tandas A-G, con Playwright y Edge.
// Uso (desde PowerShell): $env:PW_DIR = "<carpeta con node_modules/playwright>"; node tests/tnw6.mjs <copia transpilada> <copia transpilada anterior> [capturas]
// A. Dueño que vio la n5: sale una vez con 8 novedades, cada "Ver" llega a su sitio, no vuelve a salir, Ajustes → Novedades.
// B. Quien venía de la n4 ve además la n5. C. No interrumpe una sesión. D. Instalación nueva: no sale. E. Reloj: no sale, inicio idéntico.
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
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL === 'chromium' ? undefined : 'msedge', headless: process.env.PW_CHANNEL === 'chromium', args: ['--headless=new'] });
const OWNER = OWNER_SETTINGS;

async function open(dir, { seed, watch, at, cpu } = {}) {
  const srv = await serve(dir);
  const ctx = await browser.newContext(watch ? { viewport: { width: 410, height: 500 }, hasTouch: true } : { viewport: { width: 390, height: 844 }, hasTouch: true });
  await ctx.route(/googleapis|gstatic|google\.com|firebase/, r => r.abort());
  const p = await ctx.newPage(); p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message));
  await p.clock.setFixedTime(at || new Date('2026-10-19T08:00:30'));
  await seedOwner(p, seed);
  await p.addInitScript(o => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); if (o) { localStorage.setItem('cdh.settings', JSON.stringify(o)); localStorage.setItem('cdh.newsSeen', '"n5"'); } } }, seed || null);
  p.url0 = `http://127.0.0.1:${srv.address().port}/index.html`;
  await p.goto(p.url0); await p.waitForTimeout(2500);
  await p.evaluate(() => { if (state.settings.pub) state.settings.onb = 1; LS.set('newsSeen', NEWS_KEY); state.settings.healthOk = 1; savePlans(); });
  if (cpu) { p.cdp = await ctx.newCDPSession(p); await p.cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu }); }
  await p.reload(); await p.waitForTimeout(2500);
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
const lib = p => p.evaluate(() => ({ heads: [...document.querySelectorAll('#lu-list .lu-gh')].map(h => h.innerText.replace(/\s+/g, ' ')), cards: [...document.querySelectorAll('#lu-list .exc .nm')].map(n => n.textContent), svgs: document.querySelectorAll('#app svg.fig-svg').length }));
const typeQ = async (p, sel, v) => { await p.locator(sel).fill(v); await p.waitForTimeout(400); };

/* Abre la app como quien actualiza: newsSeen = lo que vio antes (no lo pisa como open()) */
async function openSeen(dir, seen, { seed, watch, draft } = {}) {
  const srv = await serve(dir);
  const ctx = await browser.newContext(watch ? { viewport: { width: 410, height: 500 }, hasTouch: true } : { viewport: { width: 390, height: 844 }, hasTouch: true });
  await ctx.route(/googleapis|gstatic|google\.com|firebase/, r => r.abort());
  const p = await ctx.newPage(); p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message));
  await p.clock.setFixedTime(new Date('2026-10-19T10:30:30'));
  await seedOwner(p, seed);
  await p.addInitScript(([o, s]) => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); if (o) localStorage.setItem('cdh.settings', JSON.stringify(o)); if (s) localStorage.setItem('cdh.newsSeen', JSON.stringify(s)); } }, [seed || null, seen]);
  await p.goto(`http://127.0.0.1:${srv.address().port}/index.html`); await p.waitForTimeout(2500);
  if (draft) {   // sesión en curso guardada y Novedades sin ver: se vuelve a abrir la app
    await p.evaluate(s => { closeSheet(); const pl = activePlan(), d = pl.days[0]; startSession(pl.id, d.id); LS.set('newsSeen', s); }, seen);
    await p.waitForTimeout(500); await p.reload(); await p.waitForTimeout(2500);
  }
  p.done = async () => { await ctx.close(); srv.close(); };
  return p;
}
const items = p => p.evaluate(() => [...document.querySelectorAll('#sheet .nw-it b')].map(b => b.textContent));
const N6 = ['Edita una sesión terminada', '414 ejercicios y búsqueda', '¿No está esa máquina?', 'Nueva pantalla del ejercicio', 'Exporta todo a tu IA', 'Crea tus ejercicios', 'Hábitos con ⚙', '195 ejercicios con foto'];

console.log('A. Dueño que actualiza desde la v1.0.49 (vio la n5)');
{
  const p = await openSeen(DIR, 'n5', { seed: OWNER });
  await p.waitForTimeout(3000);
  const L = await items(p);
  console.log('     ' + L.join(' · '));
  ok(L.length === 8 && N6.every((t, i) => L[i] === t), 'sale "Lo nuevo en Forja" con las 8 novedades (0 y A-G), sin repetir la n5');
  await shot(p, 'a-n6');
  ok(await p.evaluate(() => LS.get('newsSeen', '') === 'n6'), 'queda vista (n6)');
  const go = async (k, i, check, msg) => {
    await p.evaluate(() => newsSheet(true)); await p.waitForTimeout(250);
    await p.locator(`#sheet [data-nw="${k}"]`).nth(i || 0).click(); await p.waitForTimeout(700);
    ok(await p.evaluate(check), msg);
  };
  await go('sed', 0, () => state.tab === 'train' && !!document.querySelector('.streak-card'), 'Editar sesión → Hoy, en tu racha (toca un día)');
  await go('guide', 0, () => state.tab === 'guide', 'Catálogo → Biblioteca');
  await go('gymno', 0, () => state.tab === 'train' && /Equipo que no hay/.test(document.getElementById('toast').textContent), 'Alternativas → Hoy, con la pista del gimnasio');
  await go('fs', 0, () => state.tab === 'settings' && !!document.querySelector('.fs-set .su-set'), 'Pantalla del ejercicio → Música y sonidos (sonido al marcar)');
  await go('aix', 0, () => state.tab === 'progress' && !!document.querySelector('.aix-row'), 'Exportar → Progreso con "Exportar todo para tu IA"');
  await go('myex', 0, () => state.tab === 'guide' && !!document.querySelector('.my-create'), 'Mis ejercicios → Biblioteca con "Crear ejercicio"');
  await go('habf', 0, () => !!document.querySelector('#sheet [data-hf="open"]'), 'Hábitos → "Tus hábitos" con ⚙');
  await go('guide', 1, () => state.tab === 'guide', 'Fotos → Biblioteca');
  await p.evaluate(() => closeSheet());
  await p.reload(); await p.waitForTimeout(4500);
  ok(await p.evaluate(() => $('#sheet').hidden), 'no vuelve a salir al abrir otra vez');
  await p.evaluate(() => { state.tab = 'settings'; render(); document.querySelectorAll('details').forEach(d => { d.open = true; }); });
  await p.click('.nw-set [data-nw="open"]'); await p.waitForTimeout(300);
  ok((await items(p)).length >= 8 + 3 + 4 + 4, 'Ajustes → Novedades muestra la n6 y las anteriores');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}
console.log('B. Quien no vio la n5 (venía de la n4)');
{
  const p = await openSeen(DIR, 'n4', { seed: OWNER }); await p.waitForTimeout(3000);
  const L = await items(p);
  ok(L.length === 11 && L[8] === 'Recordatorios en toda la pantalla', 've la n6 y además la n5');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}
console.log('C. Con una sesión en curso');
{
  const p = await openSeen(DIR, 'n5', { seed: OWNER, draft: true }); await p.waitForTimeout(3500);
  ok(await p.evaluate(() => $('#sheet').hidden && LS.get('newsSeen', '') === 'n5'), 'no interrumpe la sesión (espera a que termine)');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}
console.log('D. Usuario nuevo (instalación nueva)');
{
  const p = await openSeen(DIR, null, {}); await p.waitForTimeout(3000);
  ok(await p.evaluate(() => LS.get('newsSeen', '') === 'n6' && !document.querySelector('#sheet .nw-sheet')), 'no ve Novedades (tiene la bienvenida) y queda marcada');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}
console.log('E. Reloj 410×500');
{
  const p = await openSeen(DIR, 'n5', { seed: OWNER, watch: true }), q = await openSeen(OLD, 'n5', { seed: OWNER, watch: true });
  await p.waitForTimeout(3000);
  ok(await p.evaluate(() => isWatch() && $('#sheet').hidden), 'el reloj no muestra Novedades');
  ok((await shot(p, 'e-reloj')).equals(await shot(q, 'e-reloj-antes')), 'inicio del reloj idéntico a la versión anterior');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done(); await q.done();
}
await browser.close();
console.log(fail ? `${fail} FALLAS` : 'Todo OK');
process.exit(fail ? 1 : 0);
