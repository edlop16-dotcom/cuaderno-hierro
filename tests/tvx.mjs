import { OWNER_SETTINGS } from './owner-fixture.mjs';
// Prueba de la rama videos-ejercicios: lista de los ejercicios hechos con sus videos de muestra. Datos inventados.
// Uso: $env:PW_DIR = "<carpeta con node_modules/playwright>"; node tests/tvx.mjs <copia transpilada> [<copia anterior para comparar el reloj>]
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
const T0 = Date.parse('2026-11-12T10:00:00');
const SES = (id, at, ex, extra) => Object.assign({ id, date: new Date(Date.parse(at)).toISOString(), planId: 'pA', planName: 'A', dayId: 'd1', dayName: 'Pierna', gymId: 'rokaz', gymName: 'Gimnasio A', kind: 'fuerza', durationSec: 3000, exercises: ex.map(n => ({ name: n, type: 'Piernas', sets: [{ w: 40, r: 10 }] })) }, extra || {});
const HIST = [
  SES('s5', '2026-11-11T19:00:00', ['Prensa 45°', 'Curl Femoral Tumbado']),
  SES('s4', '2026-11-09T19:00:00', ['Prensa 45°', 'Mi ejercicio raro']),
  SES('s3', '2026-11-06T19:00:00', ['Prensa 45°', 'Press Banca con Mancuernas']),
  SES('s2', '2026-11-02T19:00:00', ['Curl Femoral Tumbado', 'Elevaciones Laterales']),
  SES('s1', '2026-10-20T19:00:00', ['Elevaciones Laterales', 'Prensa 45°']),
  SES('ap', '2026-10-01T19:00:00', ['Sentadilla Hack'], { approx: true })];
const SET = () => { const s = Object.assign(structuredClone(OWNER_SETTINGS), { activeGymId: 'rokaz', newsSeen: 'n6' }); return s; };
async function open({ watch, sessions, first, dir } = {}) {
  const srv = await serve(dir || DIR);
  const ctx = await browser.newContext(watch ? { viewport: { width: 410, height: 500 }, hasTouch: true } : { viewport: { width: 390, height: 844 }, hasTouch: true });
  await ctx.route(/googleapis|gstatic|google\.com|firebase|github|youtube|tiktok/, r => r.abort());
  const p = await ctx.newPage(); p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message));
  await p.clock.setFixedTime(new Date(T0));
  if (!first) await p.addInitScript(([s, ss]) => { if (localStorage.getItem('cdh.seeded')) return; localStorage.setItem('cdh.seeded', '1');
    localStorage.setItem('cdh.settings', JSON.stringify(s)); localStorage.setItem('cdh.sessions', JSON.stringify(ss)); localStorage.setItem('cdh.plans', '[]');
    localStorage.setItem('cdh.gyms', JSON.stringify([{ id: 'rokaz', name: 'Gimnasio A' }])); localStorage.setItem('cdh.newsSeen', '"n6"'); }, [SET(), sessions || HIST]);
  await p.goto(`http://127.0.0.1:${srv.address().port}/index.html`); await p.waitForTimeout(1500);
  if (!first) await p.evaluate(() => { state.settings.healthOk = 1; closeSheet(); render(); });
  p.done = async () => { await ctx.close(); srv.close(); };
  return p;
}
const noErr = p => ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
const act = (p, sel) => p.evaluate(s => { const b = document.querySelector(s); if (!b) return false; b.click(); return true; }, sel);
const rows = p => p.evaluate(() => [...document.querySelectorAll('#sheet .vx-row')].map(r => r.querySelector('b').textContent + ' | ' + r.querySelector('small').textContent + ' | ' + r.querySelector('.vx-b').textContent.trim()));
const sum = p => p.evaluate(() => (document.querySelector('#sheet .vx-sum') || {}).textContent || '');

console.log('1. Dueño: la lista');
{
  const p = await open();
  /* Un video guardado en el teléfono (Prensa) y un enlace (Curl Femoral) */
  await p.evaluate(async () => { await VID.add({ id: 'v1', ex: exKey('Prensa 45°'), name: 'prensa.mp4', type: 'video/mp4', size: 1000, blob: new Blob(['x'], { type: 'video/mp4' }), added: Date.now() }); const L = LINKS(); L[exKey('Curl Femoral Tumbado')] = ['https://www.youtube.com/watch?v=ejemplo']; LS.set('links', L); });
  await p.evaluate(() => { state.tab = 'progress'; state.progSub = 'ejercicios'; render(); }); await p.waitForTimeout(300);
  const C = await p.evaluate(() => (document.querySelector('#app .vx-card') || {}).innerText || '');
  ok(/Videos de tus ejercicios/.test(C) && /5 ejercicios hechos/.test(C) && /3 sin video/.test(C), 'Progreso · Ejercicios: tarjeta con 5 ejercicios hechos y 3 sin video (' + C.replace(/\s+/g, ' ') + ')');
  await act(p, '[data-vx="open-list"]'); await p.waitForTimeout(250);
  let R = await rows(p);
  console.log('      ' + R.join('\n      '));
  ok(R.length === 5 && /^Prensa 45° \| 4 veces · última: 11 nov\.? \(ayer\) \| Video$/.test(R[0]), 'Prensa: 4 veces, la última ayer, con video en el teléfono (va primero: la más hecha)');
  ok(R.some(t => /^Curl Femoral Tumbado \| 2 veces .* \| Enlace$/.test(t)) && R.some(t => /^Mi ejercicio raro \| 1 vez .* \| Sin video$/.test(t)), 'Curl Femoral con enlace; un ejercicio escrito a mano también sale, sin video');
  ok(!R.some(t => /Sentadilla Hack/.test(t)), 'las sesiones aproximadas (importadas) no cuentan, como en el resto de la app');
  ok(/5 ejercicios hechos · 3 sin video/.test(await sum(p)), 'resumen arriba: 5 hechos, 3 sin video');
  ok(await p.evaluate(() => document.activeElement && document.activeElement.id !== 'vx-q'), 'al abrir no salta el teclado');
  /* Filtro Sin video */
  await act(p, '[data-vx="f"][data-v="sin"]'); await p.waitForTimeout(150); R = await rows(p);
  ok(R.length === 3 && R.every(t => /Sin video$/.test(t)), 'filtro "Sin video": solo los 3 que no tienen');
  await act(p, '[data-vx="f"][data-v="con"]'); await p.waitForTimeout(150); R = await rows(p);
  ok(R.length === 2 && R.every(t => /(Video|Enlace)$/.test(t)), 'filtro "Con video": los 2 que sí');
  /* Buscador: sin tildes ni mayúsculas, por músculo también */
  await act(p, '[data-vx="f"][data-v="all"]');
  const type = async q => { await p.evaluate(q => { const i = document.getElementById('vx-q'); i.focus(); i.value = q; i.dispatchEvent(new Event('input', { bubbles: true })); }, q); await p.waitForTimeout(150); return rows(p); };
  R = await type('FEMORAL'); ok(R.length === 1 && /^Curl Femoral/.test(R[0]), 'buscar "FEMORAL": Curl Femoral');
  R = await type('pecho'); ok(R.length === 1 && /^Press Banca/.test(R[0]), 'buscar "pecho" (músculo): Press Banca');
  ok(await p.evaluate(() => document.activeElement && document.activeElement.id === 'vx-q'), 'mientras escribes, el buscador no pierde el foco');
  R = await type('zzz'); ok(!R.length && /coincide/.test(await p.evaluate(() => document.getElementById('vx-box').innerText)), 'sin resultados: lo dice');
  /* Buscar + Sin video juntos */
  R = await type('la'); await act(p, '[data-vx="f"][data-v="sin"]'); await p.waitForTimeout(150); R = await rows(p);
  ok(R.length === 1 && /^Elevaciones Laterales/.test(R[0]), 'búsqueda y filtro se combinan');
  /* Tocar uno: abre su técnica con "Mis videos"; al cerrar vuelve a la lista */
  await type(''); await act(p, '[data-vx="f"][data-v="sin"]'); await p.waitForTimeout(100);
  await act(p, '.vx-row[data-n="Elevaciones Laterales"]'); await p.waitForTimeout(350);
  ok(await p.evaluate(() => !!document.getElementById('my-vids') && /Elevaciones Laterales/.test(document.querySelector('#sheet h2').textContent)), 'tocar uno abre su técnica con "Mis videos" para agregarle uno');
  /* Le agrega un video y cierra: vuelve a la lista, que ya lo cuenta */
  await p.evaluate(async () => { await VID.add({ id: 'v2', ex: exKey('Elevaciones Laterales'), name: 'lat.mp4', type: 'video/mp4', size: 1000, blob: new Blob(['y'], { type: 'video/mp4' }), added: Date.now() }); });
  await act(p, '#sheet [data-act="sheet-close"]'); await p.waitForTimeout(300);
  const S = await sum(p); R = await rows(p);
  ok(/vx-sheet/.test(await p.evaluate(() => document.querySelector('#sheet .sheet-card').className)) && /2 sin video/.test(S) && !R.some(t => /Elevaciones/.test(t)), 'al cerrar vuelve a la lista: ya no sale en "Sin video" (' + S + ')');
  await act(p, '#sheet [data-act="sheet-close"]'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => document.getElementById('sheet').hidden), 'y la lista se cierra con la ✕');
  /* Al volver a abrir la app, el video sigue contando (se lee del teléfono) */
  await p.reload(); await p.waitForTimeout(1500);
  await p.evaluate(() => { closeSheet(); state.tab = 'progress'; state.progSub = 'ejercicios'; render(); }); await p.waitForTimeout(400);
  ok(/2 sin video/.test(await p.evaluate(() => document.querySelector('#app .vx-card').innerText)), 'al reabrir la app, la tarjeta sigue contando ese video');
  noErr(p); await p.done();
}

console.log('2. Usuario nuevo');
{
  const p = await open({ first: true });
  await p.evaluate(() => { state.settings.onb = 1; closeSheet(); const o = document.getElementById('onb'); if (o) o.remove(); state.tab = 'progress'; state.progSub = 'ejercicios'; render(); }); await p.waitForTimeout(300);
  ok(await p.evaluate(() => !document.querySelector('#app .vx-card')), 'sin entrenos: no sale la tarjeta');
  await p.evaluate(() => vxSheet()); await p.waitForTimeout(200);
  ok(/Aún no hay ejercicios en tu historial/.test(await p.evaluate(() => document.getElementById('sheet').innerText)), 'si abre la lista: explica que aparecerán al terminar su primer entreno');
  noErr(p); await p.done();
}

console.log('3. Reloj');
{
  const p = await open({ watch: true });
  await p.evaluate(() => { state.tab = 'progress'; state.progSub = 'ejercicios'; render(); }); await p.waitForTimeout(300);
  ok(await p.evaluate(() => isWatch() && !document.querySelector('.vx-card')), 'reloj: no sale la tarjeta de videos');
  await p.evaluate(() => vxSheet()); await p.waitForTimeout(150);
  ok(await p.evaluate(() => document.getElementById('sheet').hidden && !document.querySelector('.vx-sheet')), 'reloj: la lista no se abre aunque se llame');
  noErr(p); await p.done();
  if (BASE) {
    const shots = async dir => { const q = await open({ watch: true, dir }); const a = await q.screenshot(); await q.evaluate(() => { state.tab = 'progress'; state.progSub = 'ejercicios'; render(); }); await q.waitForTimeout(400); const b = await q.screenshot(); await q.evaluate(() => { state.tab = 'train'; render(); }); await q.waitForTimeout(300); const c = await q.screenshot(); const e = q.errs.slice(); await q.done(); return { a, b, c, e }; };
    const A = await shots(DIR), B = await shots(BASE);
    ok(A.a.equals(B.a) && A.b.equals(B.b) && A.c.equals(B.c), 'reloj: pantallas idénticas a la versión anterior (inicio, progreso, entrenar)');
    ok(!A.e.length, 'reloj: sin errores de JS');
  }
}

await browser.close();
console.log(fail ? `\n${fail} FALLA(S)` : '\nTodo OK');
process.exit(fail ? 1 : 0);
