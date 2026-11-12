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

console.log('1b. Dueño: dónde se guardan, "Lo grabé yo" y Ver en YouTube');
{
  const p = await open();
  /* Un video guardado con la versión anterior (sin "own" ni duración) */
  await p.evaluate(async () => { await VID.add({ id: 'viejo', ex: exKey('Prensa 45°'), name: 'viejo.mp4', type: 'video/mp4', size: 2048, blob: new Blob(['x'], { type: 'video/mp4' }), added: Date.now() }); });
  ok(await p.evaluate(() => VXS.backend.id === 'local'), 'los videos se guardan en este teléfono (VXS → local)');
  await p.evaluate(() => howSheet('Prensa 45°')); await p.waitForTimeout(400);
  const H = await p.evaluate(() => { const yt = document.querySelector('#my-vids a.vx-yt'), own = document.querySelector('#my-vids [data-act="vx-own"]'); return { yt: yt && yt.getAttribute('href'), ytTxt: yt && yt.textContent, own: own && own.textContent.trim(), box: !!document.getElementById('vid-own'), box0: document.getElementById('vid-own') && document.getElementById('vid-own').checked, txt: document.getElementById('my-vids').innerText }; });
  ok(H.ytTxt && /Ver en YouTube/.test(H.ytTxt) && /search_query=Prensa%2045%C2%B0%20t%C3%A9cnica/.test(H.yt) && /sp=CAM%253D$/.test(H.yt), '"Ver en YouTube": la búsqueda del ejercicio ordenada por más vistas (' + H.yt + ')');
  ok(H.own === '¿Lo grabaste tú?', 'un video guardado antes: "¿Lo grabaste tú?" (sin suponer)');
  ok(H.box && H.box0 === false && /solo los grabados por ti se podrán subir a la nube/.test(H.txt), 'al agregar: casilla "Lo grabé yo", sin marcar por defecto, con la razón');
  /* Marca "Lo grabé yo" en el video viejo */
  await p.evaluate(() => document.querySelector('#my-vids [data-act="vx-own"]').click()); await p.waitForTimeout(300);
  const O = await p.evaluate(async () => ({ rec: (await VXS.get('viejo')).own, btn: document.querySelector('#my-vids [data-act="vx-own"]').textContent.trim() }));
  ok(O.rec === true && /Lo grabé yo/.test(O.btn), 'tocarlo lo marca como grabado por ti (queda guardado)');
  /* Agrega uno nuevo con la casilla marcada: guarda todo lo que pedirá la nube */
  await p.evaluate(async () => { document.getElementById('vid-own').checked = true; await addVideo(new File([new Uint8Array(3000)], 'nuevo.mp4', { type: 'video/mp4' }), 'Prensa 45°'); });
  await p.waitForTimeout(300);
  const N = await p.evaluate(async () => { const L = await VXS.list(exKey('Prensa 45°')); const r = L.find(x => x.name === 'nuevo.mp4'); return r && { v: r.v, own: r.own, exName: r.exName, size: r.size, hasDur: 'dur' in r && 'w' in r && 'h' in r, remote: r.remote, n: L.length }; });
  ok(N && N.v === 2 && N.own === true && N.exName === 'Prensa 45°' && N.size === 3000 && N.hasDur && N.remote === null && N.n === 2, 'video nuevo: grabado por ti, con ejercicio, tamaño, duración y lugar en la nube vacío (listo para la opción C)');
  /* Sin marcar: queda "De otra fuente" */
  await p.evaluate(async () => { document.getElementById('vid-own').checked = false; await addVideo(new File([new Uint8Array(10)], 'tiktok.mp4', { type: 'video/mp4' }), 'Prensa 45°'); }); await p.waitForTimeout(300);
  ok(await p.evaluate(() => [...document.querySelectorAll('#my-vids [data-act="vx-own"]')].some(b => b.textContent.trim() === 'De otra fuente')), 'sin marcar la casilla: "De otra fuente"');
  /* Borrar pasa por el mismo lugar */
  await p.evaluate(async () => { const id = (await VXS.list(exKey('Prensa 45°'))).find(x => x.name === 'tiktok.mp4').id; const b = document.querySelector('#my-vids [data-act="vid-del"][data-id="' + id + '"]'); b.click(); await new Promise(r => setTimeout(r, 50)); b.click(); }); await p.waitForTimeout(400);
  ok(await p.evaluate(async () => (await VXS.list(exKey('Prensa 45°'))).length === 2), 'borrar (dos toques) quita ese video');
  /* Un ejercicio del catálogo que nunca hiciste también tiene su "Ver en YouTube" */
  await p.evaluate(() => { closeSheet(); howSheet('Remo en T'); }); await p.waitForTimeout(300);
  ok(await p.evaluate(() => /search_query=Remo%20en%20T%20t%C3%A9cnica&sp=CAM%253D/.test((document.querySelector('#my-vids a.vx-yt') || {}).href || '')), 'cualquier ejercicio de la app (Remo en T, nunca hecho): "Ver en YouTube"');
  ok(await p.evaluate(() => LIB.filter(x => !x.hidden).length >= 400), 'y "Cómo se hace" existe para los ' + await p.evaluate(() => LIB.filter(x => !x.hidden).length) + ' ejercicios de la app');
  noErr(p); await p.done();
}

console.log('1c. Respaldo completo con los videos nuevos (respaldo.js sin cambios)');
{
  const p = await open();
  const R = await p.evaluate(async () => {
    await VXS.add({ v: 2, id: 'rv', ex: exKey('Prensa 45°'), exName: 'Prensa 45°', name: 'mio.mp4', type: 'video/mp4', size: 4, blob: new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'video/mp4' }), added: 5, own: true, dur: 31.5, w: 1280, h: 720, remote: null });
    await VXS.add({ id: 'rold', ex: exKey('Curl Bíceps'), name: 'viejo.mp4', type: 'video/mp4', size: 2, blob: new Blob([new Uint8Array([9, 9])], { type: 'video/mp4' }), added: 6 });
    const parts = []; await rcWrite(s => { parts.push(s); }); const file = new Blob(parts);
    const vd = parts.map(l => { try { return JSON.parse(l); } catch (e) { return null; } }).filter(o => o && o.t === 'vd').map(o => o.o);
    const h = await rcCheck(file);
    await VXS.del('rv'); await VXS.del('rold');
    await rcApply(file, false, h);
    const a = await VXS.get('rv'), b = await VXS.get('rold'), bytes = a && new Uint8Array(await a.blob.arrayBuffer());
    return { inFile: vd.find(o => o.id === 'rv'), n: h.n.videos, a: a && { v: a.v, own: a.own, dur: a.dur, w: a.w, h: a.h, remote: a.remote, exName: a.exName, size: a.size }, bytes: bytes && Array.from(bytes).join(','), b: b && { own: b.own, size: b.size } };
  });
  ok(R.inFile && R.inFile.own === true && R.inFile.dur === 31.5 && R.inFile.v === 2 && !('blob' in R.inFile), 'el respaldo guarda los datos nuevos del video ("Lo grabé yo", duración…) y el video aparte');
  ok(R.n >= 2, 'y cuenta los videos (' + R.n + ')');
  ok(R.a && R.a.own === true && R.a.dur === 31.5 && R.a.w === 1280 && R.a.h === 720 && R.a.remote === null && R.a.exName === 'Prensa 45°' && R.a.v === 2 && R.bytes === '1,2,3,4', 'al restaurar vuelve igual: datos y video byte a byte');
  ok(R.b && R.b.own === undefined && R.b.size === 2, 'un video de antes (sin esos datos) también se restaura igual');
  noErr(p); await p.done();
}

console.log('2. Usuario nuevo');
{
  const p = await open({ first: true });
  await p.evaluate(() => { state.settings.onb = 1; closeSheet(); const o = document.getElementById('onb'); if (o) o.remove(); state.tab = 'progress'; state.progSub = 'ejercicios'; render(); }); await p.waitForTimeout(300);
  ok(await p.evaluate(() => !document.querySelector('#app .vx-card')), 'sin entrenos: no sale la tarjeta');
  await p.evaluate(() => vxSheet()); await p.waitForTimeout(200);
  ok(/Aún no hay ejercicios en tu historial/.test(await p.evaluate(() => document.getElementById('sheet').innerText)), 'si abre la lista: explica que aparecerán al terminar su primer entreno');
  await p.evaluate(() => { closeSheet(); howSheet('Prensa 45°'); }); await p.waitForTimeout(300);
  ok(await p.evaluate(() => !!document.querySelector('#my-vids a.vx-yt') && !!document.getElementById('vid-own')), 'usuario nuevo: "Ver en YouTube" y "Lo grabé yo" en Cómo se hace');
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
    /* "Cómo se hace" del reloj: la técnica de siempre, sin "Mis videos" (pedido del usuario) */
    const how = async dir => { const q = await open({ watch: true, dir }); const r = await q.evaluate(async () => { await VID.add({ id: 'w1', ex: exKey('Prensa 45°'), name: 'p.mp4', type: 'video/mp4', size: 100, blob: new Blob(['x'], { type: 'video/mp4' }), added: 1 }); howSheet('Prensa 45°'); await new Promise(z => setTimeout(z, 500)); const sh = document.getElementById('sheet'), v = document.getElementById('my-vids'), had = !!v || /Mis videos/i.test(sh.innerText), video = sh.querySelectorAll('video').length; if (v) v.parentNode.remove(); return { vids: had, video, txt: sh.innerText }; }); const e = q.errs.slice(); await q.done(); return Object.assign(r, { e }); };
    const hA = await how(DIR), hB = await how(BASE);
    ok(!hA.vids && !hA.video && hB.vids === true && /Paso a paso/i.test(hA.txt), 'reloj: "Cómo se hace" ya no muestra "Mis videos" (la versión anterior sí), y conserva su técnica');
    ok(hA.txt === hB.txt, 'reloj: el resto de "Cómo se hace" igual que antes');
    ok(!hA.e.length, 'reloj: sin errores al abrir "Cómo se hace"');
    ok(!A.e.length, 'reloj: sin errores de JS');
  }
}

await browser.close();
console.log(fail ? `\n${fail} FALLA(S)` : '\nTodo OK');
process.exit(fail ? 1 : 0);
