import { OWNER_SETTINGS, seedOwner } from './owner-fixture.mjs';
// Prueba de la tanda H3 de "Mis finanzas" (finanzas3.js, xlsxw.js). Todos los montos y conceptos son inventados.
// Uso (desde PowerShell): $env:PW_DIR = "<carpeta con node_modules/playwright>"; node tests/tfin3.mjs <copia transpilada> <copia transpilada anterior> [capturas]
// A. Forja mis sueños: meta con 3 escenarios (sin préstamo, con préstamo, cuota mayor que el ahorro), cuota del sistema
//    francés, proyección mes a mes con el ahorro real promedio, validación, editar y borrar.
// B. Exportar a Excel: el .xlsx se desarma aquí (zip sin compresión) y se revisan las 4 hojas, fórmulas, listas,
//    formato condicional, CRC y que cada XML esté bien formado. C. Importar gastos antiguos. D. 360 px.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import zlib from 'node:zlib';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = createRequire(path.join(process.env.PW_DIR || HERE, 'x.js'))('playwright');
const [DIR, , SHOTS] = process.argv.slice(2);
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

async function open({ w } = {}) {
  const srv = await serve(DIR);
  const ctx = await browser.newContext({ viewport: { width: w || 390, height: 844 }, hasTouch: true, acceptDownloads: true });
  await ctx.route(/googleapis|gstatic|google\.com|firebase|github/, r => r.abort());
  const p = await ctx.newPage(); p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message));
  await p.clock.setFixedTime(new Date('2026-10-24T11:00:00'));
  await seedOwner(p, OWNER_SETTINGS);
  await p.addInitScript(o => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('cdh.settings', JSON.stringify(o)); localStorage.setItem('cdh.newsSeen', '"n6"'); localStorage.setItem('cdh.reminders', '[]'); } }, OWNER_SETTINGS);
  await p.goto(`http://127.0.0.1:${srv.address().port}/index.html`); await p.waitForTimeout(2000);
  await p.evaluate(() => { window.__cells = el => [...el.children].map(c => c.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean).join(' '); });
  /* Agosto ahorra 2,000.00 y septiembre 1,600.00 (sueldo 3,000.00): promedio 1,800.00. Octubre está a medias. */
  await p.evaluate(() => {
    const M = { pays: [{ id: 'p1', name: 'Sueldo', amt: 300000 }], funds: [], bud: { c1: 80000, c2: 30000, c3: 20000, c4: 15000, c5: 10000 } };
    const E = (d, c, cat, amt) => ({ id: 'g' + d + c, at: 1, d, c, cat, amt, fund: null, note: '' });
    const F = finNew(); ['2026-08', '2026-09', '2026-10'].forEach(m => { F.m[m] = JSON.parse(JSON.stringify(M)); }); F.tpl = JSON.parse(JSON.stringify(M));
    F.ex = [E('2026-08-03', 'Luz', 'c2', 100000), E('2026-09-04', 'Mercado', 'c1', 90000), E('2026-09-20', 'Pasajes', 'c3', 50000), E('2026-10-02', 'Mercado', 'c1', 25040), E('2026-10-05', 'Luz', 'c2', 12000)];
    FIN = F; finSave(); state.tab = 'profile'; render(); finOpen();
  });
  await p.waitForTimeout(300);
  p.done = async () => { await ctx.close(); srv.close(); };
  return p;
}
const shot = async (p, n) => { if (!SHOTS) return; fs.mkdirSync(SHOTS, { recursive: true }); await p.screenshot({ path: path.join(SHOTS, n + '.png') }); };
const tab = async (p, t) => { await p.click(`#sheet [data-fin="tab"][data-t="${t}"]`); await p.waitForTimeout(150); };
/* Cuota del sistema francés calculada aquí, aparte de la app (en céntimos) */
const cuota = (amt, tea, n) => { const i = Math.pow(1 + tea / 100, 1 / 12) - 1; return Math.round(amt * i / (1 - Math.pow(1 + i, -n))); };
const fmt = c => (c / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const ymAdd = (ym, k) => { const [y, m] = ym.split('-').map(Number), d = new Date(y, m - 1 + k, 1); return MES[d.getMonth()].slice(0, 3) + ' ' + d.getFullYear(); };
/* Meses para juntar lo necesario con el algoritmo descrito (independiente de la app) */
const months = (need, init, avg, q, n) => { let acc = init; if (acc >= need) return 0; for (let k = 1; k <= 120; k++) { acc += avg - (k <= n ? q : 0); if (acc >= need) return k; } return null; };

async function fillSc(p, i, { name, target, init, loan }) {
  const S = `#f-fin-goal .fin-scf[data-sc="${i}"]`;
  await p.fill(S + ' .fs-name', name); await p.fill(S + ' .fs-target', target); await p.fill(S + ' .fs-init', init);
  await p.setChecked(S + ' .fs-loan', !!loan);
  if (loan) { await p.fill(S + ' .fs-lamt', loan[0]); await p.fill(S + ' .fs-tea', loan[1]); await p.fill(S + ' .fs-n', loan[2]); }
}

console.log('A. Forja mis sueños');
{
  const p = await open();
  await tab(p, 'sue');
  ok(await p.evaluate(() => /Ahorro real promedio: S\/ 1,800\.00 al mes \(ago 26, sep 26\)/.test(document.querySelector('#sheet .fin-body').textContent)), 'ahorro real promedio: agosto y septiembre (octubre está a medias)');
  await p.click('#sheet [data-fin="goal-new"]'); await p.waitForTimeout(150);
  await p.click('#f-fin-goal [type="submit"]'); await p.waitForTimeout(100);
  ok(await p.evaluate(() => /Ponle nombre a la meta/.test(document.getElementById('fg-err').textContent)), 'sin nombre no se guarda');
  await p.fill('#fg-name', 'Auto'); await p.fill('#fg-date', '2027-12');
  await fillSc(p, 0, { name: 'Contado', target: '40000', init: '5000' });
  await p.click('#sheet [data-fin="sc-add"]'); await p.waitForTimeout(100);
  await fillSc(p, 1, { name: 'Con préstamo', target: '40000', init: '5000', loan: ['20000', '14.5', '36'] });
  await p.click('#sheet [data-fin="sc-add"]'); await p.waitForTimeout(100);
  ok(await p.evaluate(() => !document.querySelector('#sheet [data-fin="sc-add"]') && document.querySelectorAll('#f-fin-goal .fin-scf').length === 3), 'hasta 3 escenarios');
  await fillSc(p, 2, { name: 'Cuota alta', target: '35000', init: '5000', loan: ['25000', '20', '12'] });
  await p.fill('#f-fin-goal .fin-scf[data-sc="1"] .fs-n', '0'); await p.click('#f-fin-goal [type="submit"]'); await p.waitForTimeout(100);
  ok(await p.evaluate(() => /revisa el préstamo/.test(document.getElementById('fg-err').textContent)), 'un préstamo sin plazo no se guarda y lo explica');
  await p.fill('#f-fin-goal .fin-scf[data-sc="1"] .fs-n', '36'); await shot(p, 'a1-meta-form');
  await p.click('#f-fin-goal [type="submit"]'); await p.waitForTimeout(200);
  const q2 = cuota(2000000, 14.5, 36), q3 = cuota(2500000, 20, 12), m1 = months(4000000, 500000, 180000, 0, 0), m2 = months(2000000, 500000, 180000, q2, 36), m3 = months(1000000, 500000, 180000, q3, 12);
  const T = await p.evaluate(() => [...document.querySelectorAll('#sheet .fin-sc tbody tr')].map(r => __cells(r)));
  await p.evaluate(() => document.querySelector('#sheet .fin-goal').scrollIntoView()); await shot(p, 'a2-escenarios');
  ok(T[0] === 'Objetivo 40,000.00 40,000.00 35,000.00' && T[2] === `Cuota — ${fmt(q2)} ${fmt(q3)}`, `cuota por el sistema francés: ${fmt(q2)} (20,000 a 14.5 % TEA, 36 m) y ${fmt(q3)}`);
  ok(T[3] === 'Por juntar 35,000.00 15,000.00 5,000.00' && T[4] === `Ahorro del mes 1,800.00 ${fmt(180000 - q2)} −${fmt(q3 - 180000)}`, 'por juntar (objetivo − préstamo − inicial) y ahorro del mes (promedio − cuota)');
  T[5] = T[5].replace(/(\d{4})(\d)/g, '$1 $2');   // "junio 2028" y "20 meses" van en la misma celda
  ok(T[5] === `Llegas ${ymAdd('2026-11', m1 - 1)} ${m1} meses ${ymAdd('2026-11', m2 - 1)} ${m2} meses ${ymAdd('2026-11', m3 - 1)} ${m3} meses`, `cuándo llegas: ${m1}, ${m2} y ${m3} meses ` + T[5]);
  const lateCls = await p.evaluate(() => [...document.querySelectorAll('#sheet .fin-sc tbody tr:last-child td b')].map(b => b.className));
  ok(lateCls[0] === 'neg' && lateCls[1] === (m2 <= 14 ? 'pos' : 'neg'), 'en rojo si no llega a la fecha deseada (dic 2027)');
  /* Proyección del escenario elegido */
  await p.click('#sheet .fin-scb >> text=Con préstamo'); await p.waitForTimeout(150);
  const P = await p.evaluate(() => [...document.querySelectorAll('#sheet .fin-pj tbody tr')].slice(0, 3).map(r => __cells(r)).concat([document.querySelector('#sheet .fin-pj tr.fin-goalm') ? __cells(document.querySelector('#sheet .fin-pj tr.fin-goalm')) : '']));
  ok(P[0] === 'Ahora inicial 5,000.00 15,000.00' && P[1] === `nov 26 ${fmt(q2)} ${fmt(180000 - q2)} ${fmt(500000 + 180000 - q2)} ${fmt(2000000 - 500000 - 180000 + q2)}` && P[2].startsWith(`dic 26 ${fmt(q2)} ${fmt(180000 - q2)} ${fmt(500000 + 2 * (180000 - q2))}`), 'proyección mes a mes: ahorro inicial, cuota, ahorro del mes, acumulado y falta ' + P.slice(0, 2).join(' | '));
  P.splice(0, 1);
  ok(P[2].endsWith(' 0.00'), 'la fila en que llegas queda marcada (falta 0)');
  ok(await p.evaluate(() => fin().goals[0].sel === fin().goals[0].sc[1].id), 'el escenario elegido se recuerda');
  /* Editar y borrar */
  await p.click('#sheet [data-fin="goal-edit"]'); await p.waitForTimeout(150);
  ok(await p.evaluate(() => document.getElementById('fg-name').value === 'Auto' && document.querySelectorAll('#f-fin-goal .fin-scf').length === 3), 'editar trae la meta');
  await p.click('#sheet [data-fin="goal-del"]'); await p.waitForTimeout(100);
  ok(await p.evaluate(() => fin().goals.length === 1), 'borrar pide confirmar');
  await p.click('#sheet [data-fin="goal-cancel"]'); await p.waitForTimeout(100);
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  /* B. Excel con esta meta */
  console.log('B. Exportar a Excel');
  await tab(p, 'res');
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#sheet [data-fin="xlsx"]')]);
  const file = path.join(SHOTS || HERE, 'tfin3-finanzas.xlsx'); await dl.saveAs(file);
  const buf = fs.readFileSync(file), Z = {}; let o = 0, crcOk = true;
  while (buf.readUInt32LE(o) === 0x04034b50) { const nl = buf.readUInt16LE(o + 26), el = buf.readUInt16LE(o + 28), sz = buf.readUInt32LE(o + 18), crc = buf.readUInt32LE(o + 14), name = buf.slice(o + 30, o + 30 + nl).toString('utf8'), data = buf.slice(o + 30 + nl + el, o + 30 + nl + el + sz); if (zlib.crc32 && zlib.crc32(data) !== crc) crcOk = false; Z[name] = data.toString('utf8'); o += 30 + nl + el + sz; }
  ok(dl.suggestedFilename() === 'forja-finanzas-2026-10.xlsx' && Object.keys(Z).length === 9 && crcOk, `archivo ${dl.suggestedFilename()}: 9 partes y CRC correctos`);
  const wf = await p.evaluate(Z => Object.keys(Z).filter(k => new DOMParser().parseFromString(Z[k], 'application/xml').getElementsByTagName('parsererror').length), Z);
  ok(!wf.length, 'cada XML está bien formado ' + wf.join(','));
  ok(/<sheet name="DASHBOARD" sheetId="1".*<sheet name="REGISTRO".*<sheet name="PROYECCIONES".*<sheet name="CONFIG"/.test(Z['xl/workbook.xml']) && /fullCalcOnLoad="1"/.test(Z['xl/workbook.xml']), '4 hojas en orden y cálculo al abrir');
  const [D1, R2, P3, C4] = [1, 2, 3, 4].map(i => Z[`xl/worksheets/sheet${i}.xml`]);
  ok(/<f>SUMIF\(REGISTRO!\$C:\$C,\$A9,REGISTRO!\$D:\$D\)<\/f>/.test(D1) && /<f>SUMIF\(REGISTRO!\$C:\$C,\$A13,REGISTRO!\$D:\$D\)<\/f>/.test(D1) && /<f>IF\(B9=0,0,C9\/B9\)<\/f>/.test(D1), 'DASHBOARD: gastado por categoría con SUMIF (SUMAR.SI) desde el registro y % ejecutado');
  ok(/operator="greaterThan"><formula>1<\/formula>/.test(D1) && /operator="between"><formula>0.8<\/formula><formula>1<\/formula>/.test(D1) && /operator="lessThan"><formula>0.8<\/formula>/.test(D1) && /type="dataBar"/.test(D1), 'DASHBOARD: formato condicional del semáforo (y barras en la celda)');
  ok(/SUMIF\(REGISTRO!\$E:\$E,&quot;No&quot;,REGISTRO!\$D:\$D\)|SUMIF\(REGISTRO!\$E:\$E,"No",REGISTRO!\$D:\$D\)/.test(D1) && /<f>CONFIG!B6<\/f>/.test(D1) && /Instrucciones/.test(D1), 'DASHBOARD: ahorro del mes, cuota, saldo e instrucciones');
  ok(/<dataValidation type="list"[^>]*sqref="C2:C1000"><formula1>CONFIG!\$A\$14:\$A\$18<\/formula1>/.test(R2) && /sqref="E2:E1000"><formula1>&quot;Sí,No&quot;<\/formula1>/.test(R2), 'REGISTRO: listas desplegables de categoría y vale');
  ok((R2.match(/<row /g) || []).length === 3 && /<c r="A2" s="3"><v>46297<\/v>/.test(R2) && /<t xml:space="preserve">Mercado<\/t>/.test(R2) && /<c r="D2" s="2"><v>250.4<\/v>/.test(R2), 'REGISTRO: los 2 gastos de octubre (fecha de Excel, concepto, monto)');
  ok(/<f>E4\+D5<\/f>/.test(P3) && /<f>IF\(1&lt;=CONFIG!\$B\$12,CONFIG!\$B\$6,0\)<\/f>/.test(P3) && /<f>MAX\(0,CONFIG!\$B\$8-CONFIG!\$B\$10-E4\)<\/f>/.test(P3) && /Con préstamo/.test(P3), 'PROYECCIONES: acumulado y falta con fórmulas, del escenario elegido');
  ok(/<c r="B4" s="2"><v>3000<\/v>/.test(C4) && new RegExp(`<c r="B6" s="2"><v>${q2 / 100}</v>`).test(C4) && /<c r="B11" s="2"><v>1800<\/v>/.test(C4) && /<c r="B12"><v>36<\/v>/.test(C4) && /Alimentación/.test(C4), 'CONFIG: sueldo, cuota, ahorro promedio, plazo y categorías');
  if (!SHOTS) fs.unlinkSync(file);
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}

console.log('C. Importar gastos antiguos');
{
  const p = await open();
  await tab(p, 'gas'); await p.click('#sheet [data-fin="old"]'); await p.waitForTimeout(150);
  const CSV = 'fecha;concepto;categoría;monto;vale;nota\n05/08/2026;"Mercado; feria";Alimentación;"1.234,50";sí;quincena\n2026-08-07;Pasaje;Transporte;12,50;;\n31/02/2026;Malo;Gustos;10;;\n10/08/2026;Consulta;Salud;80;;\n12/08/2026;Comida;Mascota;45;;\n03/08/2026;Luz;Servicios;1000;;';
  await p.fill('#fin-old-t', CSV); await p.click('#sheet [data-fin="old-read"]'); await p.waitForTimeout(150);
  const V = await p.evaluate(() => ({ rows: [...document.querySelectorAll('#sheet .fin-oldt tbody tr')].map(r => __cells(r)), map: [...document.querySelectorAll('#sheet .fin-umap')].map(s => s.dataset.u), btn: (document.querySelector('#sheet [data-fin="old-save"]') || {}).textContent, n: fin().ex.length }));
  await shot(p, 'c1-importar');
  ok(V.rows.length === 6 && V.rows[0] === '05/08/26 Mercado; feria vale Alimentación 1,234.50 ✓' && V.rows[1] === '07/08/26 Pasaje Transporte 12.50 ✓', 'vista previa: comillas, coma decimal, miles y vale ' + V.rows.slice(0, 2).join(' | '));
  ok(/revisa fecha/.test(V.rows[2]) && /repetido/.test(V.rows[5]), 'una fecha imposible (31/02) y un gasto que ya existe no se guardan');
  ok(V.map.join() === 'Salud,Mascota' && /Guardar 4 gastos/.test(V.btn) && V.n === 5, 'pregunta por las categorías que no tienes; nada se guarda todavía');
  await p.selectOption('#sheet .fin-umap[data-u="Salud"]', { label: 'Usar Imprevistos' });
  await p.click('#sheet [data-fin="old-save"]'); await p.waitForTimeout(200);
  const S = await p.evaluate(() => { const F = fin(), by = c => F.ex.find(e => e.c === c); return { n: F.ex.length, cats: F.cats.map(c => c.name).join(), con: finCat(by('Consulta').cat).name, mas: finCat(by('Comida').cat).name, mer: by('Mercado; feria').amt, note: by('Mercado; feria').note, tab: state.finT }; });
  ok(S.n === 9 && S.con === 'Imprevistos' && S.mas === 'Mascota' && /Mascota$/.test(S.cats) && S.mer === 123450 && S.note === 'quincena' && S.tab === 'gas', 'guardados 4: Salud → Imprevistos, Mascota creada; monto y nota correctos');
  /* Desde un archivo CSV con comas */
  await p.click('#sheet [data-fin="old"]'); await p.waitForTimeout(150);
  await p.setInputFiles('#fin-old-f', { name: 'gastos.csv', mimeType: 'text/csv', buffer: Buffer.from('15/07/2026,Taxi,Transporte,12,50\n16/07/2026,Cine,Gustos,30\n') }); await p.waitForTimeout(400);
  const W = await p.evaluate(() => [...document.querySelectorAll('#sheet .fin-oldt tbody tr')].map(r => __cells(r)));
  ok(W.length === 2 && W[0] === '15/07/26 Taxi Transporte 12.50 ✓', 'archivo CSV con comas (y "12,50" partido en dos celdas) ' + W.join(' | '));
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}

console.log('D. 360 px');
{
  const p = await open({ w: 360 });
  await p.evaluate(() => { const F = fin(); F.goals = [{ id: 'm1', name: 'Casa', date: '2028-06', sel: 's2', sc: [{ id: 's1', name: 'Contado', target: 12000000, init: 1500000, loan: null }, { id: 's2', name: 'Hipoteca', target: 12000000, init: 1500000, loan: { amt: 9000000, tea: 11.9, n: 240 } }, { id: 's3', name: 'Más barata', target: 9500000, init: 1500000, loan: { amt: 7000000, tea: 11.9, n: 180 } }] }]; finSave(); state.finT = 'sue'; finSheet(); });
  await p.waitForTimeout(200); await shot(p, 'd1-suenos-360');
  const W = await p.evaluate(() => { const c = document.querySelector('#sheet .fin-sheet'), t = [...document.querySelectorAll('#sheet .fin-tw')].map(x => x.scrollWidth - x.clientWidth); return { sheet: c.scrollWidth - c.clientWidth, tw: Math.max(...t), all: t.join('/') }; });
  ok(W.sheet <= 0 && W.tw <= 0, `Sueños a 360 px con montos grandes: sin desbordes (${W.sheet}, ${W.all})`);
  ok(await p.evaluate(() => document.querySelectorAll('#sheet .fin-seg button').length === 5 && [...document.querySelectorAll('#sheet .fin-seg button')].every(b => b.scrollWidth <= b.clientWidth + 1)), 'las 5 pestañas caben');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}

await browser.close();
console.log(fail ? `\n${fail} FALLAS` : '\nTodo OK');
process.exit(fail ? 1 : 0);
