import { OWNER_SETTINGS, seedOwner } from './owner-fixture.mjs';
// Prueba de la Tanda E (myex.js): crear mis propios ejercicios, con Playwright y Edge.
// Uso (desde PowerShell): $env:PW_DIR = "<carpeta con node_modules/playwright>"; node tests/tmy.mjs <copia transpilada> <copia transpilada anterior> [capturas]
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
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEklEQVR4nGP4z8CAFWEXHbQSACj/P8Fu7N9hAAAAAElFTkSuQmCC', 'base64');
async function open(dir, { seed, watch } = {}) {
  const srv = await serve(dir);
  const ctx = await browser.newContext(watch ? { viewport: { width: 410, height: 500 }, hasTouch: true } : { viewport: { width: 390, height: 844 }, hasTouch: true });
  await ctx.route(/googleapis|gstatic|google\.com|firebase/, r => r.abort());
  const p = await ctx.newPage(); p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message));
  await p.clock.setFixedTime(new Date('2026-10-19T18:30:00'));
  await seedOwner(p, seed);
  await p.addInitScript(o => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); if (o) { localStorage.setItem('cdh.settings', JSON.stringify(o)); localStorage.setItem('cdh.newsSeen', '"n5"'); } } }, seed || null);
  p.url0 = `http://127.0.0.1:${srv.address().port}/index.html`;
  await p.goto(p.url0); await p.waitForTimeout(2500);
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
const tap = async (p, sel) => { await p.locator(sel).first().click(); await p.waitForTimeout(200); };
const NAME = 'Elevación de talones en máquina de mi gym';

console.log('A. Dueño');
{
  const p = await open(DIR, { seed: OWNER });
  const before = await p.evaluate(() => JSON.stringify(state.sessions.map(cleanSess)));
  await p.evaluate(() => { const d = activePlan().days[0]; d.exercises.push(Object.assign(newEx('Movimiento raro del gym', 'fuerza'), { name: 'Movimiento raro del gym' })); savePlans(); state.tab = 'guide'; render(); });
  await p.waitForTimeout(300);
  ok(await p.locator('#app .my-create').count() === 1 && await p.locator('#app [data-act="ex-g"][data-v="mine"]').count() === 1, 'Biblioteca: "+ Crear ejercicio" y filtro "Mis ejercicios"');
  ok(await p.locator('#app .my-unc').count() === 1 && /Movimiento raro del gym/.test(await p.locator('#app .my-unc').textContent()), '"Sin clasificar" muestra lo escrito a mano');
  /* Crear con la interfaz, con foto */
  await tap(p, '#app .my-create');
  await p.locator('#my-name').fill(NAME);
  await tap(p, '#sheet [data-my="zm"][data-v="pant"]');
  await p.locator('#my-eq').selectOption('gem_pie'); await p.waitForTimeout(150);
  await p.locator('#my-pat').selectOption('calf');
  await p.locator('#my-ph').setInputFiles({ name: 'f.png', mimeType: 'image/png', buffer: PNG }); await p.waitForTimeout(500);
  ok(await p.locator('#sheet .my-prev').count() === 1, 'foto de la galería o la cámara, con vista previa');
  await shot(p, 'a1-formulario');
  await tap(p, '#sheet .pk-bottom [data-my="save"]'); await p.waitForTimeout(400);
  const c = await p.evaluate(n => { const x = libFind(n); return x && { k: x.key, mine: x.mine, z: JSON.stringify(zoneShares(n)), eq: equipOf(x), ph: !!MYPH[x.key], fig: !!x.fig }; }, NAME);
  ok(c && c.mine && c.z === '{"pant":1}' && c.eq === 'maq' && c.fig, 'creado: cuenta como pantorrillas, máquina, con la figura de su patrón');
  ok(c && c.ph, 'la foto queda solo en el teléfono');
  const synced = await p.evaluate(() => JSON.stringify(sync.shared().myEx || []));
  ok(/talones en m/.test(synced) && !/data:image/.test(synced), 'se sincroniza sin la foto');
  await p.evaluate(() => { state.exG = 'mine'; render(); }); await p.waitForTimeout(400);
  const cards = await p.evaluate(() => [...document.querySelectorAll('#lu-list .exc')].map(x => ({ n: x.querySelector('.nm').textContent, tag: !!x.querySelector('.my-tag'), img: !!x.querySelector('img') })));
  ok(cards.length === 1 && cards[0].n === NAME && cards[0].tag && cards[0].img, '"Mis ejercicios": con la etiqueta "Mío" y su foto');
  await shot(p, 'a2-mis-ejercicios');
  await p.evaluate(() => { state.exG = 'all'; state.exM = 'pant'; render(); }); await p.waitForTimeout(300);
  ok((await p.evaluate(() => [...document.querySelectorAll('#lu-list .exc .nm')].map(x => x.textContent))).includes(NAME), 'sale también al filtrar por Pantorrillas');
  await p.evaluate(() => { state.exM = 'all'; render(); });
  /* ¿Es este? desde el selector, con lo que busqué */
  await p.evaluate(() => { const pl = activePlan(); pkOpen(pl.id, pl.days[0].id); });
  await p.locator('#pk-q').fill('press inclinado smith xyz'); await p.waitForTimeout(400);
  ok(await p.locator('#pk-list [data-my="new"]').count() === 1, '"¿No está? Créalo" con lo que busqué');
  await tap(p, '#pk-list [data-my="new"]');
  ok(await p.locator('#my-name').inputValue() === 'press inclinado smith xyz', 'el nombre ya viene puesto');
  await p.locator('#my-name').fill('press inclinado smith'); await tap(p, '#sheet [data-my="zm"][data-v="pecho"]');
  await tap(p, '#sheet .pk-bottom [data-my="save"]');
  ok(/Press Inclinado en Smith/.test(await p.locator('#sheet .my-sim').innerText().catch(() => '')), '"¿Es este? Press Inclinado en Smith"');
  await shot(p, 'a3-es-este');
  await tap(p, '#sheet [data-my="use"]');
  ok(await p.evaluate(() => state.pk && state.pk.sel.includes('Press Inclinado en Smith')), '"Usar este" lo marca en el selector');
  /* Usarlo en una sesión: el coach cuenta pantorrillas */
  await p.evaluate(n => { state.pk.sel = [n]; }, NAME); await tap(p, '#sheet [data-act="pk-add"]');
  const w0 = await p.evaluate(() => weekSets(0).sets.pant);
  await p.evaluate(n => { const pl = activePlan(), d = pl.days[0]; state.settings.nextS = {}; startSession(pl.id, d.id); const i = state.draft.exercises.findIndex(e => e.name === n); state.draft.exercises[i].log.forEach((s, j) => { s.w = 80; s.r = 15; markSet(i, j, true); }); state.durOK = true; finishSession(); state.durOK = false; }, NAME);
  await p.waitForTimeout(500); await p.evaluate(() => document.querySelectorAll('.celebrate').forEach(x => x.remove())); await p.waitForTimeout(1500); await p.evaluate(() => closeSheet());
  const w1 = await p.evaluate(() => weekSets(0).sets.pant);
  ok(w1 - w0 >= 3, `el coach semanal cuenta pantorrillas (+${w1 - w0} series)`);
  ok(await p.evaluate(n => bestE1rm(n, activeGym().id) > 0, NAME), 'tiene récord como cualquier ejercicio');
  /* Editar y borrar con el historial intacto */
  const k = c.k;
  await p.evaluate(k => { closeSheet(); mySheet({ k }); }, k);
  await p.locator('#my-name').fill('Otro nombre'); await tap(p, '#sheet .pk-bottom [data-my="save"]');
  ok(/no se cambia/.test(await p.evaluate(() => document.getElementById('sheet').innerText)), 'si ya está en tu historial, el nombre no se cambia');
  await p.locator('#my-notes').fill('Pies en el borde\nPausa abajo'); await tap(p, '#sheet .pk-bottom [data-my="save"]');
  ok(await p.evaluate(n => libFind(n).steps.length === 2, NAME), 'editado (notas como pasos)');
  await p.evaluate(k => mySheet({ k }), k); await tap(p, '#sheet [data-my="del"]'); await tap(p, '#sheet [data-my="del"]');
  const del = await p.evaluate(n => ({ hid: (state.settings.myEx.find(x => x.name === n) || {}).hidden, find: !!libFind(n), z: JSON.stringify(zoneShares(n)), inSess: state.sessions.some(s => s.exercises.some(e => e.name === n)) }), NAME);
  ok(del.hid && del.find && del.z === '{"pant":1}' && del.inSess, 'borrar uno usado lo oculta: el historial lo conserva y sigue contando');
  await p.evaluate(() => { state.tab = 'guide'; state.exG = 'all'; state.guideQ = 'talones en maquina de mi gym'; render(); }); await p.waitForTimeout(300);
  ok(!(await p.evaluate(() => document.getElementById('lu-list').innerText)).includes('de mi gym'), 'y ya no sale en la Biblioteca');
  await p.evaluate(() => { state.guideQ = ''; render(); });
  /* Sin clasificar → Asignar sin cambiar el nombre */
  await tap(p, '#app .my-unc summary'); await tap(p, '#app [data-my="assign"]');
  ok(await p.locator('#my-name').getAttribute('readonly') !== null, 'Asignar: el nombre viene fijo');
  await tap(p, '#sheet [data-my="zm"][data-v="pant"]'); await tap(p, '#sheet .pk-bottom [data-my="save"]');
  ok(await p.evaluate(() => JSON.stringify(zoneShares('Movimiento raro del gym')) === '{"pant":1}' && !myUnclassified().length), 'clasificado: ya cuenta en el coach');
  /* Por tiempo: "Seg" en la sesión */
  await p.evaluate(() => { state.settings.myEx = state.settings.myEx.concat([{ k: 'my-t1', name: 'Plancha de mi gym', zm: 'abd', zs: [], eq: '', pat: 'antiext', kind: 'time' }]); savePlans(); const d = activePlan().days[0]; d.exercises.unshift(newEx('Plancha de mi gym', 'fuerza')); savePlans(); render(); startSession(activePlan().id, d.id); state.draft.cur = 0; render(); });
  await p.waitForTimeout(500);
  ok(await p.evaluate(() => [...document.querySelectorAll('#sx-pager > .sx-page')[0].querySelectorAll('.sets > .h')].map(h => h.textContent).includes('Seg')), 'por tiempo: la columna dice "Seg"');
  await p.evaluate(() => discardSession());
  const after = await p.evaluate(() => JSON.stringify(state.sessions.slice(1).map(cleanSess)));
  ok(after === before, 'el resto de tu historial no cambia');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}

console.log('B. Usuario nuevo');
{
  const p = await open(DIR, {});
  await p.evaluate(() => { state.tab = 'guide'; render(); }); await tap(p, '#app .my-create');
  await p.locator('#my-name').fill('Mi remo en la máquina del parque'); await tap(p, '#sheet [data-my="zm"][data-v="esp"]'); await tap(p, '#sheet [data-my="kind"][data-v="bw"]');
  await tap(p, '#sheet .pk-bottom [data-my="save"]'); await p.waitForTimeout(300);
  const x = await p.evaluate(() => { const x = libFind('Mi remo en la máquina del parque'); return x && { z: JSON.stringify(zoneShares(x.name)), bw: isBodyweight(x.name), fig: figSVG(x, 1).indexOf('my-ic') >= 0 }; });
  ok(x && x.z === '{"esp":1}' && x.bw && x.fig, 'su primer ejercicio: espalda, peso corporal y sin patrón → ícono del músculo');
  await shot(p, 'b1-nuevo');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}

console.log('C. Reloj');
{
  const p = await open(DIR, { seed: OWNER, watch: true }), q = await open(OLD, { seed: OWNER, watch: true });
  const d = await pixDiff(await shot(p, 'c1-reloj'), await shot(q, 'c1-reloj-antes'));
  ok(d === 0, 'inicio del reloj idéntico' + (d ? ` (${d} px)` : ''));
  const r = await p.evaluate(() => { state.settings.myEx = [{ k: 'my-w1', name: 'Gemelos de mi gym', zm: 'pant', zs: [], eq: 'gem_pie', pat: 'calf', kind: 'w' }]; savePlans(); render(); const pl = activePlan(), dd = pl.days[0]; dd.exercises.unshift(newEx('Gemelos de mi gym', 'fuerza')); startSession(pl.id, dd.id); const e = state.draft.exercises[0]; e.log[0].w = 60; e.log[0].r = 15; markSet(0, 0, true); state.durOK = true; finishSession(); state.durOK = false; const s = state.sessions[0]; return { n: s.exercises[0].name, z: JSON.stringify(zoneShares('Gemelos de mi gym')) }; });
  ok(r.n === 'Gemelos de mi gym' && r.z === '{"pant":1}', 'el reloj registra tu ejercicio por nombre (y cuenta)');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done(); await q.done();
}

await browser.close();
console.log(fail ? `\n${fail} FALLA(S)` : '\nTodo OK');
process.exit(fail ? 1 : 0);
