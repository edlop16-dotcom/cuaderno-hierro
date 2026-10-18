import { OWNER_SETTINGS, seedOwner } from './owner-fixture.mjs';
// Prueba de la Tanda G: fotos de Free Exercise DB para los ejercicios nuevos (photos.js), con Playwright y Edge.
// Uso (desde PowerShell): $env:PW_DIR = "<carpeta con node_modules/playwright>"; node tests/tph.mjs <copia transpilada> <copia transpilada anterior> [capturas]
// A. Dueño: los 84 de antes iguales; Biblioteca con fotos y sin lentitud (carga diferida); ficha, selector y sesión con foto;
//    un toque muestra la figura; Ajustes → Acerca de con el crédito; tamaño de la app antes y después.
// B. Usuario nuevo: búsqueda con fotos nuevas.
// C. Reloj: sin fotos nuevas, inicio y Ajustes idénticos a la versión anterior.
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
  await p.clock.setFixedTime(at || new Date('2026-10-19T10:30:30'));
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

const dirKB = d => { let n = 0; const walk = x => fs.readdirSync(x, { withFileTypes: true }).forEach(e => { const f = path.join(x, e.name); if (e.isDirectory()) walk(f); else n += fs.statSync(f).size; }); walk(d); return n / 1024; };
const exImgs = p => p.evaluate(() => [...document.querySelectorAll('#app img[src^="ex/"]')].filter(i => i.complete && i.naturalWidth > 0).map(i => i.getAttribute('src')));
const howCheck = async (p, who) => {
  ok(await p.locator('#sheet [data-act="fig-tog2"]').count() === 1, `${who}: "Cómo se hace" con la foto y "Ver esquema del movimiento"`);
  await p.click('#sheet [data-act="fig-tog2"]'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => { const f = document.querySelector('#sheet svg.fig-svg'); return !!f && f.getBoundingClientRect().height > 0; }), `${who}: un toque muestra la figura`);
};

console.log('A. Dueño');
{
  const p = await open(DIR, { seed: OWNER, cpu: 4 }), q = await open(OLD, { seed: OWNER });
  const K = await p.evaluate(() => ({ n: PHOTO_KEYS.size, cat: CAT_PHOTOS.length, newOnly: CAT_PHOTOS.every(k => { const x = LIB.find(y => y.key === k); return x && x.cat; }) }));
  const K0 = await q.evaluate(() => PHOTO_KEYS.size);
  const oldCat = await q.evaluate(() => typeof CAT_PHOTOS === 'undefined' ? 0 : CAT_PHOTOS.length);
  console.log(`     fotos: antes ${K0}, ahora ${K.n} (+${K.cat} de ejercicios nuevos)`);
  ok(K.n === K0 + K.cat - oldCat && K.newOnly, 'solo se suman fotos a ejercicios nuevos del catálogo');
  ok(fs.readdirSync(path.join(DIR, 'ex')).length === K.n * 2, 'cada foto tiene sus dos webp (inicio y final)');
  const old84 = pg => pg.evaluate(() => LIB.filter(x => !x.cat).map(x => x.key + ':' + luThumb(x, false)).join('\n'));
  ok(await old84(p) === await old84(q), 'los 84 de antes se dibujan igual (foto o figura)');
  /* Biblioteca: carga diferida y velocidad */
  const t0 = Date.now(); await p.evaluate(() => { state.tab = 'guide'; render(); }); const t = Date.now() - t0;
  await p.waitForTimeout(1500);
  const vis = await exImgs(p), total = await p.evaluate(() => document.querySelectorAll('#app img[src^="ex/"]').length);
  console.log(`     Biblioteca con la CPU ×4: ${t} ms; ${total} fotos en la lista, ${vis.length} descargadas al abrir`);
  ok(t < 400, 'la Biblioteca se abre rápido (< 400 ms con la CPU ×4)');
  ok(vis.length < total, 'las fotos de abajo esperan a que bajes (carga diferida)');
  await shot(p, 'a-biblioteca');
  await p.locator('#guide-q').fill('curl con barra z'); await p.waitForTimeout(600);
  ok(await p.evaluate(() => !!document.querySelector('#app img[src="ex/ezcurl-0.webp"]')), 'Curl con Barra Z sale con su foto');
  await shot(p, 'a-buscar');
  await p.locator('#guide-q').fill('sentadilla pendulo'); await p.waitForTimeout(600);
  ok(await p.evaluate(() => !document.querySelector('#app img[src^="ex/pendulum"]') && !!document.querySelector('#lu-list svg')), 'Sentadilla Péndulo (sin foto exacta) sigue con su figura');
  /* Ficha desde la Biblioteca */
  await p.locator('#guide-q').fill('curl con barra z'); await p.waitForTimeout(600);
  await p.locator('#lu-list .exc').first().click(); await p.waitForTimeout(400);
  ok(await p.evaluate(() => !!document.querySelector('#sheet img[src="ex/ezcurl-0.webp"]') && !!document.querySelector('#sheet img[src="ex/ezcurl-1.webp"]')), 'la ficha muestra las dos fotos que se alternan');
  await shot(p, 'a-ficha');
  await p.click('#sheet [data-act="how"]'); await p.waitForTimeout(500);
  await howCheck(p, 'Biblioteca');
  await p.evaluate(() => closeSheet());
  /* Selector */
  await p.evaluate(() => { const pl = activePlan(), d = pl.days[0]; pkOpen(pl.id, d.id); }); await p.waitForTimeout(400);
  await p.locator('#pk-q').fill('press frances con mancuernas'); await p.waitForTimeout(600);
  ok(await p.evaluate(() => !!document.querySelector('img[src="ex/dbskull-0.webp"]')), 'el selector muestra la foto de Press Francés con Mancuernas');
  await shot(p, 'a-selector');
  await p.evaluate(() => { closeSheet(); state.pk = null; });
  /* Sesión con un ejercicio nuevo con foto */
  await p.evaluate(() => { const pl = activePlan(), d = pl.days[0]; d.exercises.unshift({ id: 'tg1', name: 'Curl con Barra Z', sets: 3, repsMin: 10, repsMax: 12, weight: 20, rest: 90 }); savePlans(); state.tab = 'train'; render(); startSession(pl.id, d.id); });
  await p.waitForTimeout(1000);
  ok(await p.evaluate(() => !!document.querySelector('#sx img[src="ex/ezcurl-0.webp"]')), 'en la sesión, la foto del ejercicio');
  await shot(p, 'a-sesion');
  await p.locator('#sx .sx-page.cur .ph-btn, #sx .ph-btn').first().click(); await p.waitForTimeout(600);
  await howCheck(p, 'sesión');
  await p.evaluate(() => { closeSheet(); state.draft = null; render(); });
  /* Ajustes → Acerca de */
  await p.evaluate(() => { state.tab = 'settings'; render(); document.querySelectorAll('details').forEach(d => { d.open = true; }); }); await p.waitForTimeout(300);
  const A = await p.evaluate(() => { const c = document.querySelector('.ab-set'); const g = c && c.closest('details'); return { txt: c ? c.innerText : '', grp: g ? g.dataset.k : '', dup: [...document.querySelectorAll('#app .muted')].filter(x => /^Forja · Fotos de ejercicios/.test(x.textContent)).length }; });
  ok(/Acerca de/.test(A.txt) && /Fotos de ejercicios: Free Exercise DB \(dominio público\)/.test(A.txt), 'Ajustes → Acerca de: "Fotos de ejercicios: Free Exercise DB (dominio público)"');
  ok(A.grp === 'sg-datos' && A.dup === 0, `en el grupo Datos, sin el renglón repetido (${A.grp})`);
  await p.locator('.ab-set').scrollIntoViewIfNeeded(); await shot(p, 'a-acerca');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done(); await q.done();
}
console.log('B. Usuario nuevo');
{
  const p = await open(DIR, {});
  ok(await p.evaluate(() => pubUser()), 'usuario público');
  await p.evaluate(() => { state.tab = 'guide'; render(); }); await p.waitForTimeout(400);
  await p.locator('#guide-q').fill('puente de gluteo'); await p.waitForTimeout(600);
  const B = await p.evaluate(() => [...document.querySelectorAll('#app img[src^="ex/"]')].map(i => i.getAttribute('src')));
  ok(B.includes('ex/smithbridge-0.webp') && B.includes('ex/bbbridge-0.webp'), 'búsqueda con fotos nuevas (puente de glúteo con barra y en Smith)');
  await shot(p, 'b-biblioteca');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}
console.log('C. Reloj 410×500');
{
  const p = await open(DIR, { seed: OWNER, watch: true }), q = await open(OLD, { seed: OWNER, watch: true });
  const w = await p.evaluate(() => [isWatch(), PHOTO_KEYS.size]), w0 = await q.evaluate(() => PHOTO_KEYS.size);
  ok(w[0] && w[1] === w0, 'el reloj no suma fotos');
  ok((await shot(p, 'c-reloj')).equals(await shot(q, 'c-reloj-antes')), 'inicio del reloj idéntico a la versión anterior');
  await p.evaluate(() => { state.tab = 'settings'; render(); }); await q.evaluate(() => { state.tab = 'settings'; render(); }); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.getElementById('app').innerHTML) === await q.evaluate(() => document.getElementById('app').innerHTML), 'Ajustes del reloj idénticos (con su renglón de crédito de siempre)');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done(); await q.done();
}
const kb = [dirKB(OLD), dirKB(DIR)], ex = [dirKB(path.join(OLD, 'ex')), dirKB(path.join(DIR, 'ex'))];
console.log(`     tamaño de www: antes ${(kb[0] / 1024).toFixed(2)} MB, ahora ${(kb[1] / 1024).toFixed(2)} MB (+${((kb[1] - kb[0]) / 1024).toFixed(2)} MB; fotos ${(ex[0] / 1024).toFixed(2)} → ${(ex[1] / 1024).toFixed(2)} MB)`);
await browser.close();
console.log(fail ? `${fail} FALLAS` : 'Todo OK');
process.exit(fail ? 1 : 0);
