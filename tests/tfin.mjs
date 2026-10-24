import { OWNER_SETTINGS, seedOwner } from './owner-fixture.mjs';
// Prueba de "Mis finanzas" (finanzas.js). Todos los montos y conceptos son inventados.
// Uso (desde PowerShell): $env:PW_DIR = "<carpeta con node_modules/playwright>"; node tests/tfin.mjs <copia transpilada> <copia transpilada anterior> [capturas]
// A. Dueño: acceso en Perfil, valores por defecto en 0, sueldo en dos pagos, vale de alimentos, categorías (agregar,
//    renombrar, borrar), gastos (agregar, validar, editar, borrar), resumen con semáforo y totales, meses anteriores,
//    datos solo en el celular (fuera de la sincronización y del respaldo de la cuenta), exportar e importar, 360 px.
// B. Usuario nuevo: no la ve. C. Reloj: no la ve y su Perfil queda idéntico.
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

async function open(dir, { seed, watch, w } = {}) {
  const srv = await serve(dir);
  const ctx = await browser.newContext(Object.assign(watch ? { viewport: { width: 410, height: 500 }, hasTouch: true } : { viewport: { width: w || 390, height: 844 }, hasTouch: true }, { acceptDownloads: true }));
  await ctx.route(/googleapis|gstatic|google\.com|firebase|github/, r => r.abort());
  const p = await ctx.newPage(); p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message));
  await p.clock.setFixedTime(new Date('2026-10-24T11:00:00'));
  await seedOwner(p, seed);
  await p.addInitScript(o => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); if (o) localStorage.setItem('cdh.settings', JSON.stringify(o)); localStorage.setItem('cdh.newsSeen', '"n6"'); localStorage.setItem('cdh.reminders', '[]'); } }, seed || null);
  await p.goto(`http://127.0.0.1:${srv.address().port}/index.html`); await p.waitForTimeout(2000);
  await p.evaluate(() => { if (state.settings.pub) { state.settings.onb = 1; if (typeof pbClose === 'function') pbClose(); } state.settings.healthOk = 1; LS.set('newsSeen', NEWS_KEY); savePlans(); closeSheet(); state.tab = 'profile'; state.profSub = 'body'; render(); });
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
const tab = async (p, t) => { await p.click(`#sheet [data-fin="tab"][data-t="${t}"]`); await p.waitForTimeout(150); };
/* Fila de la tabla del resumen: [categoría, presupuesto, gastado, saldo, %, color] */
const table = p => p.evaluate(() => [...document.querySelectorAll('#sheet .fin-t tbody tr')].map(r => [...r.children].map(td => td.textContent.trim()).concat([(r.className.match(/fin-([gyrn])\b/) || [])[1]])));
async function addEx(p, { d, c, cat, amt, vale, note }) {
  if (d) await p.fill('#fin-d', d);
  await p.fill('#fin-c', c); await p.selectOption('#fin-cat', { label: cat }); await p.fill('#fin-amt', amt);
  if (vale != null && await p.$('#fin-vale')) await p.setChecked('#fin-vale', !!vale);
  if (note) await p.fill('#fin-note', note);
  await p.click('#f-fin-ex [type="submit"]'); await p.waitForTimeout(200);
}

console.log('A. Dueño');
{
  const p = await open(DIR, { seed: OWNER_SETTINGS });
  /* Montos */
  const P = await p.evaluate(() => ['12,5', '12.50', '1,234.50', '1.234,50', 'S/ 1 500', '0', 'abc', '-5', '3,456', '12.345'].map(finParse));
  ok(JSON.stringify(P) === JSON.stringify([1250, 1250, 123450, 123450, 150000, 0, null, null, 345600, null]), 'montos: coma o punto decimal, miles, "S/"; inválidos rechazados ' + JSON.stringify(P));
  ok(await p.evaluate(() => finS(123450) === 'S/ 1,234.50' && finS(-1000) === '−S/ 10.00' && finS(0) === 'S/ 0.00'), 'formato: S/ con 2 decimales');
  /* Acceso y valores por defecto */
  const C = await p.evaluate(() => { const c = document.querySelector('.fin-card'); return c ? c.textContent.replace(/\s+/g, ' ').trim() : null; });
  ok(C && /^Mis finanzas ?Octubre: gastado S\/ 0\.00 · ahorro S\/ 0\.00$/.test(C), 'Perfil (dueño): tarjeta "Mis finanzas" ' + C);
  await p.click('.fin-card'); await p.waitForTimeout(300);
  let T = await table(p);
  await shot(p, 'a1-vacio');
  ok(T.length === 6 && T.slice(0, 5).map(r => r[0]).join() === 'Alimentación,Servicios,Transporte,Gustos,Imprevistos' && T.every(r => r[1] === '0.00' && r[2] === '0.00'), 'por defecto: 5 categorías, todo en 0');
  ok(await p.evaluate(() => /octubre 2026/.test(document.querySelector('#sheet .fin-mes b').textContent) && document.querySelector('#sheet [data-fin="ym"][data-d="1"]').disabled), 'mes actual (octubre); no deja ir a meses futuros');
  /* Ajustes: sueldo en dos quincenas, vale, presupuestos, nueva categoría y renombrar */
  await tab(p, 'cfg');
  await p.fill('[data-row="pay"][data-i="0"] .fin-nm', 'Quincena 1'); await p.fill('[data-row="pay"][data-i="0"] .fin-am', '1500');
  await p.click('[data-fin="pay-add"]'); await p.waitForTimeout(100);
  await p.fill('[data-row="pay"][data-i="1"] .fin-nm', 'Quincena 2'); await p.fill('[data-row="pay"][data-i="1"] .fin-am', '1500,50');
  await p.click('[data-fin="fund-add"]'); await p.waitForTimeout(100);
  ok(await p.evaluate(() => document.querySelector('[data-row="fund"] .fin-nm').value === 'Vale de alimentos' && document.querySelector('[data-row="fund"] .fin-ct').selectedOptions[0].textContent === 'Alimentación'), 'agregar fondo: "Vale de alimentos" para Alimentación');
  await p.fill('[data-row="fund"] .fin-am', '400');
  for (const [i, v] of [[0, '800'], [1, '300'], [2, '200'], [3, '150'], [4, '100']]) await p.fill(`[data-row="cat"][data-i="${i}"] .fin-am`, v);
  await p.fill('[data-row="cat"][data-i="3"] .fin-nm', 'Gustos y salidas');
  await p.click('[data-fin="cat-add"]'); await p.waitForTimeout(100);
  await p.fill('[data-row="cat"][data-i="5"] .fin-nm', 'Mascota'); await p.fill('[data-row="cat"][data-i="5"] .fin-am', '50');
  await p.fill('[data-row="cat"][data-i="2"] .fin-am', 'diez'); await p.click('#f-fin-cfg [type="submit"]'); await p.waitForTimeout(150);
  ok(await p.evaluate(() => /no entiendo/.test(document.getElementById('fin-cfg-err').textContent)), 'un monto inválido no se guarda y lo explica');
  await p.fill('[data-row="cat"][data-i="2"] .fin-am', '200'); await shot(p, 'a2-ajustes');
  await p.click('#f-fin-cfg [type="submit"]'); await p.waitForTimeout(200);
  const M = await p.evaluate(() => { const F = fin(), m = F.m['2026-10']; return { pays: m.pays.map(x => [x.name, x.amt]), funds: m.funds.map(x => [x.name, x.amt, finCat(x.cat).name]), cats: F.cats.map(c => [c.name, m.bud[c.id]]), tpl: JSON.stringify(F.tpl) === JSON.stringify(m) }; });
  ok(JSON.stringify(M.pays) === '[["Quincena 1",150000],["Quincena 2",150050]]' && JSON.stringify(M.funds) === '[["Vale de alimentos",40000,"Alimentación"]]', 'guardado: sueldo en dos pagos y el vale');
  ok(JSON.stringify(M.cats) === '[["Alimentación",80000],["Servicios",30000],["Transporte",20000],["Gustos y salidas",15000],["Imprevistos",10000],["Mascota",5000]]' && M.tpl, 'guardado: categorías (una renombrada, una nueva) con su presupuesto; queda también para los meses siguientes');
  /* Gastos */
  await tab(p, 'gas');
  ok(await p.evaluate(() => document.getElementById('fin-d').value === '2026-10-24'), 'fecha de hoy por defecto');
  await p.fill('#fin-c', 'Nada'); await p.fill('#fin-amt', ''); await p.click('#f-fin-ex [type="submit"]'); await p.waitForTimeout(100);
  ok(await p.evaluate(() => /monto mayor que 0/.test(document.getElementById('fin-err').textContent)), 'sin monto: no se guarda y lo explica');
  await addEx(p, { c: 'Mercado', cat: 'Alimentación', amt: '250,40', vale: true, note: 'Semana' });
  await addEx(p, { d: '2026-10-05', c: 'Luz', cat: 'Servicios', amt: '120' });
  await addEx(p, { d: '2026-10-08', c: 'Taxi', cat: 'Transporte', amt: '35.5' });
  await addEx(p, { d: '2026-10-10', c: 'Cine', cat: 'Gustos y salidas', amt: '160' });
  await addEx(p, { d: '2026-10-12', c: 'Medicina', cat: 'Imprevistos', amt: '85' });
  await addEx(p, { d: '2026-10-13', c: 'Comida', cat: 'Mascota', amt: '20' });
  let L = await p.evaluate(() => [...document.querySelectorAll('#sheet .fin-ex')].map(r => r.querySelector('b').textContent + ' ' + r.querySelector('.num').textContent));
  ok(L.length === 6 && L[0] === 'Mercado S/ 250.40' && L.includes('Taxi S/ 35.50'), 'agregar: 6 gastos, el más reciente arriba');
  ok(await p.evaluate(() => /Vale de alimentos/.test(document.querySelector('#sheet .fin-ex').textContent)), 'el pagado con vale lo dice');
  /* Editar y borrar */
  const taxi = await p.evaluate(() => fin().ex.find(e => e.c === 'Taxi').id);
  await p.click(`[data-fin="ex-edit"][data-id="${taxi}"]`); await p.waitForTimeout(150);
  ok(await p.evaluate(() => document.getElementById('fin-amt').value === '35.50' && /Editar gasto/.test(document.querySelector('#f-fin-ex h3').textContent)), 'editar: el formulario trae el gasto');
  await p.fill('#fin-amt', '45.50'); await p.click('#f-fin-ex [type="submit"]'); await p.waitForTimeout(150);
  const com = await p.evaluate(() => fin().ex.find(e => e.c === 'Comida').id);
  await p.click(`[data-fin="ex-del"][data-id="${com}"]`); await p.waitForTimeout(100);
  ok(await p.evaluate(() => fin().ex.length === 6), 'borrar pide confirmar (primer toque no borra)');
  await p.click(`[data-fin="ex-del"][data-id="${com}"]`); await p.waitForTimeout(150);
  ok(await p.evaluate(() => fin().ex.length === 5 && fin().ex.find(e => e.c === 'Taxi').amt === 4550), 'editado (Taxi 45.50) y borrado (Comida)');
  await shot(p, 'a3-gastos');
  /* Resumen */
  await tab(p, 'res'); T = await table(p);
  await shot(p, 'a4-resumen');
  const want = [['Alimentación', '800.00', '250.40', '549.60', '31 %', 'g'], ['Servicios', '300.00', '120.00', '180.00', '40 %', 'g'], ['Transporte', '200.00', '45.50', '154.50', '23 %', 'g'], ['Gustos y salidas', '150.00', '160.00', '−10.00', '107 %', 'r'], ['Imprevistos', '100.00', '85.00', '15.00', '85 %', 'y'], ['Mascota', '50.00', '0.00', '50.00', '0 %', 'g'], ['Total', '1,600.00', '660.90', '939.10', '41 %', 'g']];
  ok(JSON.stringify(T) === JSON.stringify(want), 'tabla: presupuesto, gastado, saldo, % y semáforo (verde, amarillo 85 %, rojo 107 %) ' + (JSON.stringify(T) === JSON.stringify(want) ? '' : JSON.stringify(T)));
  const R = await p.evaluate(() => ({ tiles: [...document.querySelectorAll('#sheet .fin-tiles b')].map(b => b.textContent), fund: document.querySelector('#sheet .fin-fund').textContent.replace(/\s+/g, ' ').trim() }));
  ok(JSON.stringify(R.tiles) === '["S/ 3,400.50","S/ 660.90","S/ 2,590.00"]', 'ingreso total (sueldo + vale) 3,400.50 · gastado 660.90 · ahorro = sueldo − gastos con sueldo = 2,590.00');
  ok(/Vale de alimentos \(Alimentación\) ?S\/ 400\.00 · usado S\/ 250\.40 · queda S\/ 149\.60/.test(R.fund), 'el vale: usado y lo que queda');
  /* Mes anterior: su gasto y su presupuesto aparte */
  await p.click('#sheet [data-fin="ym"][data-d="-1"]'); await p.waitForTimeout(150);
  await tab(p, 'gas');
  ok(await p.evaluate(() => document.getElementById('fin-d').value === '2026-09-01' && /Aún no hay gastos en septiembre 2026/.test(document.querySelector('#sheet .fin-body').textContent)), 'septiembre: vacío, la fecha propone el 1');
  await addEx(p, { d: '2026-09-20', c: 'Mercado', cat: 'Alimentación', amt: '300', vale: false });
  await tab(p, 'cfg'); await p.fill('[data-row="cat"][data-i="0"] .fin-am', '700');
  ok(await p.evaluate(() => /Se guarda solo para septiembre 2026/.test(document.querySelector('#f-fin-cfg').textContent)), 'un mes pasado se cambia solo a sí mismo');
  await p.click('#f-fin-cfg [type="submit"]'); await p.waitForTimeout(150); await tab(p, 'res');
  const S9 = await table(p);
  ok(S9[0][1] === '700.00' && S9[0][2] === '300.00', 'septiembre: presupuesto 700 y su gasto de 300');
  await p.click('#sheet [data-fin="ym"][data-d="1"]'); await p.waitForTimeout(150);
  const S10 = await table(p);
  ok(S10[0][1] === '800.00' && S10[0][2] === '250.40', 'octubre no cambió');
  /* Categorías: no se borra una con gastos; sí una sin gastos */
  await tab(p, 'cfg');
  await p.click('[data-fin="cat-rm"][data-i="3"]'); await p.waitForTimeout(150);
  ok(/tiene 1 gasto/.test(await p.evaluate(() => document.getElementById('toast').textContent)) && await p.evaluate(() => fin().cats.length === 6), 'no deja borrar "Gustos y salidas" (tiene un gasto)');
  await p.click('[data-fin="cat-rm"][data-i="5"]'); await p.waitForTimeout(100); await p.click('[data-fin="cat-rm"][data-i="5"]'); await p.waitForTimeout(100);
  await p.click('#f-fin-cfg [type="submit"]'); await p.waitForTimeout(150);
  ok(await p.evaluate(() => fin().cats.map(c => c.name).join() === 'Alimentación,Servicios,Transporte,Gustos y salidas,Imprevistos'), 'borrar "Mascota" (sin gastos) con dos toques');
  /* Solo en el celular: fuera de settings, de la sincronización y del respaldo de la cuenta */
  const N = await p.evaluate(() => ({ ls: !!localStorage.getItem('cdh.fin'), set: JSON.stringify(state.settings), sh: JSON.stringify(sync.shared()), bk: backupJSON(), daily: JSON.stringify(state.daily), plans: JSON.stringify(state.plans) }));
  ok(N.ls && ![N.set, N.sh, N.bk, N.daily, N.plans].some(t => /Mercado|Quincena|forja-finanzas|Vale de alimentos/.test(t)), 'los datos están en cdh.fin y no en settings, la sincronización ni el respaldo de la cuenta');
  /* Respaldo: exportar el archivo, borrar, importarlo */
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('[data-fin="exp"]')]);
  const file = path.join(SHOTS || HERE, 'tfin-respaldo.json'); await dl.saveAs(file);
  const J = JSON.parse(fs.readFileSync(file, 'utf8'));
  ok(dl.suggestedFilename() === 'forja-finanzas-2026-10-24.json' && J.app === 'forja-finanzas' && J.ex.length === 6 && J.cats.length === 5 && J.m['2026-09'] && J.m['2026-10'], `exportar: ${dl.suggestedFilename()} con todo (6 gastos, 5 categorías, 2 meses)`);
  await p.evaluate(() => { LS.del('fin'); FIN = null; state.finCfg = null; finSheet(); });
  ok(await p.evaluate(() => fin().ex.length === 0), '(se borran los datos)');
  await p.setInputFiles('#fin-file', { name: 'otro.json', mimeType: 'application/json', buffer: Buffer.from('{"hola":1}') }); await p.waitForTimeout(300);
  ok(/no es un respaldo/.test(await p.evaluate(() => document.getElementById('toast').textContent)) && await p.evaluate(() => !document.querySelector('.fin-impw')), 'un archivo que no es respaldo se rechaza');
  await p.setInputFiles('#fin-file', file); await p.waitForTimeout(300);
  ok(await p.evaluate(() => /6 gastos y 5 categorías/.test(document.querySelector('.fin-impw').textContent) && fin().ex.length === 0), 'importar: avisa qué trae y que reemplaza todo, y espera la confirmación');
  await p.click('[data-fin="imp-yes"]'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => fin().ex.length === 6 && fin().m['2026-10'].pays.length === 2 && !!localStorage.getItem('cdh.finPrev')), 'importado (y lo de antes queda copiado en cdh.finPrev)');
  await p.reload(); await p.waitForTimeout(2000);
  ok(await p.evaluate(() => fin().ex.length === 6 && fin().cats.length === 5), 'tras recargar la app, los datos siguen');
  if (!SHOTS) fs.unlinkSync(file);
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}
{
  /* 360 px: el resumen cabe sin desplazarse a lo ancho */
  const p = await open(DIR, { seed: OWNER_SETTINGS, w: 360 });
  await p.evaluate(() => { const F = fin(); F.m['2026-10'] = { pays: [{ id: 'p1', name: 'Sueldo', amt: 1234567 }], funds: [], bud: { c1: 123456, c2: 99999 } }; F.ex.push({ id: 'g1', d: '2026-10-02', c: 'Prueba', cat: 'c1', amt: 1234567, fund: null, note: '' }); finSave(); finOpen(); });
  await p.waitForTimeout(300); await shot(p, 'a5-360');
  const W = await p.evaluate(() => { const t = document.querySelector('#sheet .fin-tw'), c = document.querySelector('#sheet .fin-sheet'); return { tw: t.scrollWidth - t.clientWidth, sheet: c.scrollWidth - c.clientWidth }; });
  ok(W.tw <= 0 && W.sheet <= 0, `a 360 px con montos grandes la tabla cabe (${W.tw}, ${W.sheet})`);
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}

console.log('B. Usuario nuevo');
{
  const p = await open(DIR, {});
  ok(await p.evaluate(() => !document.querySelector('.fin-card')), 'en su Perfil no sale "Mis finanzas"');
  await p.evaluate(() => finSheet()); await p.waitForTimeout(150);
  ok(await p.evaluate(() => !document.querySelector('#sheet .fin-sheet')), 'y la pantalla no se abre');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}

console.log('C. Reloj');
{
  const p = await open(DIR, { seed: OWNER_SETTINGS, watch: true }), q = await open(OLD, { seed: OWNER_SETTINGS, watch: true });
  const d = await pixDiff(await shot(p, 'c1-reloj-perfil'), await shot(q, 'c1-reloj-perfil-antes'));
  ok(d === 0 && await p.evaluate(() => !document.querySelector('.fin-card')), 'Perfil del reloj idéntico y sin "Mis finanzas"' + (d ? ` (${d} px)` : ''));
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done(); await q.done();
}

await browser.close();
console.log(fail ? `\n${fail} FALLAS` : '\nTodo OK');
process.exit(fail ? 1 : 0);
