import { OWNER_SETTINGS, seedOwner } from './owner-fixture.mjs';
// Prueba del arranque en un solo dibujo (bootRender / bootEnd en index.html), con Playwright y Edge.
// Uso (desde PowerShell): $env:PW_DIR = "<carpeta con node_modules/playwright>"; node tests/tboot.mjs <copia transpilada> [copia transpilada anterior] [capturas]
// Cuenta cuántas veces se reescribe #app al abrir y qué se ve en cada cuadro (dueño, usuario nuevo, reloj; apertura diaria
// y primera apertura), y comprueba: fondo #0b0d12 mientras carga, primer cuadro visible ya final (Hoy, barra de 4, fuentes
// cargadas), sin fuentes no se queda en blanco, el aviso "Versión nueva lista" de keep.js y que un redibujo tardío
// con los mismos datos no cambia ni un píxel. Con la copia anterior compara la pantalla final (debe ser idéntica).
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
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL === 'chromium' ? undefined : 'msedge', headless: process.env.PW_CHANNEL === 'chromium', args: ['--headless=new'] });
const OWNER = OWNER_SETTINGS;

/* Se inyecta antes que todo: cuenta las escrituras de #app y guarda cada estado distinto que llega a un cuadro */
const SPY = () => {
  const log = window.__boot = { renders: 0, frames: [] };
  const d = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
  Object.defineProperty(Element.prototype, 'innerHTML', { configurable: true, get: d.get, set(v) { if (this.id === 'app') log.renders++; return d.set.call(this, v); } });
  const fam = f => { let n = 0; document.fonts.forEach(x => { if (x.family.replace(/"/g, '') === f && x.status === 'loaded') n++; }); return n; };
  let last = '';
  const f = () => {
    const a = document.getElementById('app'), n = document.getElementById('nav'), b = document.body;
    const s = { hidden: document.documentElement.classList.contains('boot'), app: a ? a.innerHTML.length : 0, hoy: !!(a && a.classList.contains('v-hoy')), enter: !!(a && a.classList.contains('enter')),
      nav: n ? Array.prototype.filter.call(n.querySelectorAll('button'), x => x.offsetParent).map(x => x.textContent.trim()).join('|') : '',
      bg: b ? getComputedStyle(b).backgroundColor : '', watch: !!(b && b.classList.contains('watch')), poppins: fam('Poppins'), barlow: fam('Barlow'), inter: fam('Inter') };
    const k = JSON.stringify(s); if (k !== last) { last = k; log.frames.push(s); }
    if (log.frames.length < 400) requestAnimationFrame(f);
  };
  // Registrar el muestreo después de instalar el reloj de Playwright: el orden de init scripts no es estable.
  window.addEventListener('DOMContentLoaded', () => requestAnimationFrame(f), { once: true });
};

async function open(dir, { seed, watch, first, init, block } = {}) {
  const srv = await serve(dir);
  const ctx = await browser.newContext(watch ? { viewport: { width: 410, height: 500 }, hasTouch: true } : { viewport: { width: 390, height: 844 }, hasTouch: true });
  await ctx.route(/googleapis|gstatic|google\.com|firebase/, r => r.abort());
  if (block) await ctx.route(block, r => r.abort());
  const p = await ctx.newPage(); p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message));
  await p.clock.setFixedTime(new Date('2026-10-19T08:00:30'));
  await seedOwner(p, seed);
  await p.addInitScript(o => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); if (o) { localStorage.setItem('cdh.settings', JSON.stringify(o)); localStorage.setItem('cdh.newsSeen', '"n4"'); } } }, seed || null);
  const url = `http://127.0.0.1:${srv.address().port}/index.html`;
  if (first) { await p.addInitScript(SPY); if (init) await p.addInitScript(init); await p.goto(url); await p.bringToFront(); await p.waitForTimeout(2500); }
  else {
    await p.goto(url); await p.bringToFront(); await p.waitForTimeout(2500);   /* 1.ª apertura: migraciones de una vez */
    await p.evaluate(() => { if (state.settings.pub) state.settings.onb = 1; LS.set('newsSeen', NEWS_KEY); state.settings.healthOk = 1; savePlans(); });
    await p.addInitScript(SPY); if (init) await p.addInitScript(init);
    await p.reload(); await p.bringToFront(); await p.waitForTimeout(2500);  /* la de todos los días */
  }
  p.B = await p.evaluate(() => window.__boot);
  p.done = async () => { await ctx.close(); srv.close(); };
  return p;
}
const shot = async (p, n, top) => { if (top) await p.evaluate(() => scrollTo(0, 0)); const b = await p.screenshot({ animations: 'disabled' }); if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); fs.writeFileSync(path.join(SHOTS, n + '.png'), b); } return b; };
/* Cuántos píxeles distintos hay entre dos capturas (se decodifican en el navegador) */
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
const firstShown = B => B.frames.find(f => !f.hidden);
const report = (B, label) => console.log(`     ${label}: #app se dibujó ${B.renders} ${B.renders === 1 ? 'vez' : 'veces'}; ${B.frames.filter(f => !f.hidden).length} estado(s) visible(s)`);
const counts = {};

console.log('A. Dueño: apertura de todos los días');
{
  const p = await open(DIR, { seed: OWNER });
  report(p.B, 'ahora'); counts.duenio = p.B.renders;
  ok(p.B.renders === 1, 'Hoy se dibuja una sola vez');
  ok(p.B.frames.filter(f => f.hidden).every(f => f.bg === 'rgb(11, 13, 18)'), 'mientras carga el fondo es #0b0d12 (el de la pantalla nativa)');
  ok(p.B.frames.filter(f => f.hidden).every(f => !f.app || f.hidden), 'nada se ve antes de estar listo');
  const F = firstShown(p.B);
  ok(F && F.hoy && F.nav === 'Hoy|Rutinas|Progreso|Perfil', 'el primer cuadro visible ya es Hoy con la barra de 4 (' + (F && F.nav) + ')');
  ok(F && F.poppins >= 2 && F.barlow >= 2, 'y con Poppins y Barlow ya cargadas (sin salto de fuente)');
  ok(F && !F.enter, 'sin animación de entrada');
  ok(p.B.frames.filter(f => !f.hidden).every(f => f.hoy && f.nav === F.nav), 'después no cambia de diseño ni de barra');
  ok(await p.evaluate(() => getComputedStyle(document.body).backgroundColor) === 'rgb(21, 23, 26)', 'al mostrarse, el fondo es el de siempre (#15171a)');
  ok(await p.evaluate(() => scrollY) === 0, 'abre arriba del todo (antes podía quedar bajado 14 px)');
  const now = await shot(p, 'a-duenio');
  console.log('G. Redibujo tardío con los mismos datos (como los avisos nativos al abrir)');
  await p.evaluate(() => { safeRender(); render(); }); await p.waitForTimeout(300);
  ok(await pixDiff(now, await shot(p, 'g-duenio-redibujo')) === 0, 'no cambia ni un píxel');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  if (OLD) {
    const q = await open(OLD, { seed: OWNER }); report(q.B, 'antes'); counts.duenioAntes = q.B.renders;
    const d = await pixDiff(now, await shot(q, 'a-duenio-antes', 1));
    ok(d === 0, 'pantalla final idéntica a la versión anterior' + (d ? ` (${d} píxeles distintos)` : ''));
    await q.done();
  }
  await p.done();
}

console.log('B. Dueño: primera apertura (migraciones de una vez)');
{
  const p = await open(DIR, { seed: OWNER, first: true });
  report(p.B, 'ahora');
  ok(p.B.renders === 1, 'también una sola vez');
  ok(firstShown(p.B) && firstShown(p.B).hoy, 'se muestra Hoy');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}

console.log('C. Usuario nuevo');
{
  const p = await open(DIR, { first: true });
  report(p.B, 'primera apertura (bienvenida)');
  ok(p.B.renders === 1, 'primera apertura: una sola vez');
  ok(await p.evaluate(() => !!document.getElementById('onb') && document.body.classList.contains('onb-open')), 'sale la bienvenida');
  await p.done();
  const q = await open(DIR);
  report(q.B, 'apertura de todos los días'); counts.nuevo = q.B.renders;
  ok(q.B.renders === 1, 'apertura diaria: una sola vez');
  const F = firstShown(q.B);
  ok(F && F.hoy && F.nav === 'Hoy|Rutinas|Progreso|Perfil' && F.poppins >= 2 && F.barlow >= 2, 'primer cuadro visible final, con fuentes');
  ok(await q.evaluate(() => scrollY) === 0, 'abre arriba del todo');
  const now = await shot(q, 'c-nuevo');
  ok(!q.errs.length, 'sin errores de JS ' + q.errs.join(' | '));
  if (OLD) {
    const o = await open(OLD); report(o.B, 'antes'); counts.nuevoAntes = o.B.renders;
    const d = await pixDiff(now, await shot(o, 'c-nuevo-antes', 1));
    ok(d === 0, 'pantalla final idéntica a la versión anterior' + (d ? ` (${d} píxeles distintos)` : ''));
    await o.done();
  }
  await q.done();
}

console.log('D. Reloj');
{
  const p = await open(DIR, { seed: OWNER, watch: true });
  report(p.B, 'ahora'); counts.reloj = p.B.renders;
  ok(p.B.renders === 1, 'una sola vez');
  const F = firstShown(p.B);
  ok(F && F.watch && F.bg === 'rgb(11, 13, 18)' && !F.nav, 'primer cuadro visible: modo reloj, fondo #0b0d12, sin barra');
  ok(p.B.frames.every(f => f.bg === 'rgb(11, 13, 18)'), 'el fondo nunca cambia');
  const now = await shot(p, 'd-reloj');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  if (OLD) {
    const q = await open(OLD, { seed: OWNER, watch: true }); report(q.B, 'antes'); counts.relojAntes = q.B.renders;
    ok(await pixDiff(now, await shot(q, 'd-reloj-antes', 1)) === 0, 'idéntico a la versión anterior');
    await q.done();
  }
  await p.done();
}

console.log('E. Sin fuentes (no se queda en blanco)');
{
  const p = await open(DIR, { seed: OWNER, block: /\/fonts\// });
  const t = await p.evaluate(() => ({ hidden: document.documentElement.classList.contains('boot'), ms: BOOT.ms, vis: getComputedStyle(document.getElementById('app')).visibility }));
  ok(!t.hidden && t.vis === 'visible', 'se muestra igual');
  ok(p.B.renders === 1, 'una sola vez');
  await p.done();
}

console.log('F. keep.js: "Versión nueva lista" tras reponer y recargar');
{
  const p = await open(DIR, { seed: OWNER, init: () => { if (!sessionStorage.getItem('kmDone')) { sessionStorage.setItem('kmDone', '1'); sessionStorage.setItem('keepMsg', 'ajustes'); sessionStorage.setItem('keepReload', '1'); } } });
  const t = await p.evaluate(() => ({ toast: (document.getElementById('toast') || {}).textContent || '', hidden: document.documentElement.classList.contains('boot') }));
  ok(/Versión nueva lista\. Repuse lo que faltaba \(ajustes\)/.test(t.toast), 'sale el aviso: ' + t.toast.slice(0, 70));
  ok(!t.hidden && p.B.renders === 1, 'y la app se ve, dibujada una vez');
  await p.done();
}

if (OLD) console.log(`\nDibujos al abrir — antes: dueño ${counts.duenioAntes}, nuevo ${counts.nuevoAntes}, reloj ${counts.relojAntes} · ahora: dueño ${counts.duenio}, nuevo ${counts.nuevo}, reloj ${counts.reloj}`);
await browser.close();
console.log(fail ? `\n${fail} FALLAS` : '\nTodo OK');
process.exit(fail ? 1 : 0);
