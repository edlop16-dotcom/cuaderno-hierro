import { OWNER_SETTINGS, seedOwner } from './owner-fixture.mjs';
// Prueba de la tanda H2 de "Mis finanzas" (finanzas2.js). Todos los montos y conceptos son inventados.
// Uso (desde PowerShell): $env:PW_DIR = "<carpeta con node_modules/playwright>"; node tests/tfin2.mjs <copia transpilada> <copia transpilada anterior> [capturas]
// A. Gráficos del mes (torta en el orden fijo de las categorías y "Otras"; barras presupuesto vs gastado con semáforo).
// B. Alertas al 80 % y al 100 % (una vez por nivel) y como notificación opcional (plugin simulado, sin montos).
// C. Meses: ahorro y gasto por categoría de 6 meses, tabla y nota "lecciones del mes".
// D. Exportar para IA. E. Importar recomendación: vista previa y se aplica al mes siguiente solo al confirmar. F. 360 px.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
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
/* Notificaciones locales simuladas (cualquier método resuelve; schedule se anota en window.__ln) */
const NATIVE_LN = () => {
  window.__ln = [];
  const LN = new Proxy({}, { get: (t, k) => k === 'then' ? undefined : (o => { if (k === 'schedule') window.__ln.push(o); return Promise.resolve({ display: 'granted', notifications: [] }); }) });
  window.Capacitor = { isNativePlatform: () => true, Plugins: { LocalNotifications: LN } };
};
async function open({ w, native } = {}) {
  const srv = await serve(DIR);
  const ctx = await browser.newContext({ viewport: { width: w || 390, height: 844 }, hasTouch: true });
  await ctx.route(/googleapis|gstatic|google\.com|firebase|github/, r => r.abort());
  const p = await ctx.newPage(); p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message));
  await p.clock.setFixedTime(new Date('2026-10-24T11:00:00'));
  if (native) await p.addInitScript(NATIVE_LN);
  await seedOwner(p, OWNER_SETTINGS);
  await p.addInitScript(o => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('cdh.settings', JSON.stringify(o)); localStorage.setItem('cdh.newsSeen', '"n6"'); localStorage.setItem('cdh.reminders', '[]'); }
    window.__clip = []; try { Object.defineProperty(navigator, 'clipboard', { value: { writeText: t => { window.__clip.push(t); return Promise.resolve(); } } }); } catch (e) {} }, OWNER_SETTINGS);
  await p.goto(`http://127.0.0.1:${srv.address().port}/index.html`); await p.waitForTimeout(2000);
  /* Texto de una fila o un elemento de leyenda: sus celdas separadas por un espacio */
  await p.evaluate(() => { window.__cells = el => [...el.children].map(c => c.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean).join(' '); });
  /* Finanzas inventadas: septiembre y octubre de 2026 */
  await p.evaluate(() => {
    const M = (s1, s2, v) => ({ pays: [{ id: 'p1', name: 'Quincena 1', amt: s1 }, { id: 'p2', name: 'Quincena 2', amt: s2 }], funds: [{ id: 'f1', name: 'Vale de alimentos', amt: v, cat: 'c1' }], bud: { c1: 80000, c2: 30000, c3: 20000, c4: 15000, c5: 10000 } });
    const E = (d, c, cat, amt, fund) => ({ id: 'g' + d + c, at: 1, d, c, cat, amt, fund: fund || null, note: '' });
    const F = finNew(); F.m['2026-09'] = M(150000, 150000, 40000); F.m['2026-10'] = M(150000, 150050, 40000); F.tpl = JSON.parse(JSON.stringify(F.m['2026-10']));
    F.ex = [E('2026-09-05', 'Mercado', 'c1', 32000, 'f1'), E('2026-09-10', 'Luz', 'c2', 11000), E('2026-09-12', 'Cine', 'c4', 9000), E('2026-09-20', 'Pasajes', 'c3', 18000),
      E('2026-10-03', 'Mercado', 'c1', 25040, 'f1'), E('2026-10-05', 'Luz', 'c2', 12000), E('2026-10-08', 'Taxi', 'c3', 4550), E('2026-10-12', 'Medicina', 'c5', 8500)];
    FIN = F; finSave(); state.tab = 'profile'; render(); finOpen();
  });
  await p.waitForTimeout(300);
  p.done = async () => { await ctx.close(); srv.close(); };
  return p;
}
const shot = async (p, n) => { if (!SHOTS) return; fs.mkdirSync(SHOTS, { recursive: true }); await p.screenshot({ path: path.join(SHOTS, n + '.png'), fullPage: false }); };
const tab = async (p, t) => { await p.click(`#sheet [data-fin="tab"][data-t="${t}"]`); await p.waitForTimeout(150); };
async function addEx(p, c, cat, amt) { await tab(p, 'gas'); await p.fill('#fin-c', c); await p.selectOption('#fin-cat', { label: cat }); await p.fill('#fin-amt', amt); await p.click('#f-fin-ex [type="submit"]'); await p.waitForTimeout(200); }

console.log('A. Gráficos del mes');
{
  const p = await open();
  const G = await p.evaluate(() => ({ sl: [...document.querySelectorAll('#sheet .fin-pie path')].map(x => x.getAttribute('fill')), leg: [...document.querySelectorAll('#sheet .fin-pie .fin-legend li')].map(li => __cells(li)), bars: [...document.querySelectorAll('#sheet .fin-bar')].map(b => ({ c: b.className, s: b.querySelector('.s').style.width, b: b.querySelector('.b').style.width, t: b.querySelector('small').textContent.trim() })) }));
  await shot(p, 'a1-graficos');
  ok(JSON.stringify(G.sl) === '["#3987e5","#199e70","#9085e9","#d55181"]', 'torta: un sector por categoría con gasto, color fijo por categoría (Alimentación azul, Servicios aqua, Transporte violeta, Imprevistos magenta) ' + G.sl.join(','));
  ok(G.leg.length === 4 && /^Alimentación 250\.40 50 %$/.test(G.leg[0]) && /^Imprevistos 85\.00 17 %$/.test(G.leg[3]), 'leyenda con nombre, monto y % ' + G.leg.join(' | '));
  ok(G.bars.length === 5 && G.bars[0].b === '100%' && G.bars[0].s === '31.3%' && /fin-g/.test(G.bars[0].c) && /fin-y/.test(G.bars[4].c) && /85\.00 \/ 100\.00 · 85 %/.test(G.bars[4].t), 'barras: riel = presupuesto, barra = gastado, color del semáforo y el % escrito ' + JSON.stringify(G.bars[0]) + ' ' + G.bars[4].t);
  /* Más de 5 categorías con gasto: la 6.ª va como "Otras" (gris) */
  await p.evaluate(() => { const F = fin(); F.cats.push({ id: 'c6', name: 'Mascota' }); F.ex.push({ id: 'gx', at: 2, d: '2026-10-15', c: 'Comida', cat: 'c6', amt: 3000, fund: null, note: '' }, { id: 'gy', at: 3, d: '2026-10-16', c: 'Café', cat: 'c4', amt: 2000, fund: null, note: '' }); finSave(); finSheet(); });
  const O = await p.evaluate(() => [...document.querySelectorAll('#sheet .fin-pie .fin-legend li')].map(li => li.children[1].textContent.trim()).concat([...document.querySelectorAll('#sheet .fin-pie path')].map(x => x.getAttribute('fill')).slice(-1)));
  ok(O.indexOf('Otras') === 5 && O[O.length - 1] === '#6b7079' && O[3] === 'Gustos', 'la 6.ª categoría va en "Otras" (gris); Gustos conserva su color ámbar ' + O.join(','));
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}

console.log('B. Alertas');
{
  const p = await open({ native: true });
  await p.evaluate(() => { state.notifPerm = 'granted'; });
  await addEx(p, 'Cine', 'Gustos', '125');
  let A = await p.evaluate(() => ({ al: (document.querySelector('#sheet .fin-alert') || {}).textContent || '', toast: document.getElementById('toast').textContent }));
  ok(/Gustos llegó al 83 % de su presupuesto \(S\/ 125\.00 de S\/ 150\.00\)/.test(A.al) && /83 %/.test(A.toast), 'al registrar: aviso del 80 % (banner y toast)');
  ok(await p.evaluate(() => window.__ln.length === 0), 'sin activar la notificación: no se envía');
  await tab(p, 'cfg'); await p.click('#sheet [data-fin="notif"]'); await p.waitForTimeout(150);
  ok(await p.evaluate(() => fin().opt.notif === true && document.querySelector('#sheet [data-fin="notif"]').getAttribute('aria-checked') === 'true'), 'Ajustes → Alertas: se activa la notificación');
  await addEx(p, 'Concierto', 'Gustos', '40');
  A = await p.evaluate(() => ({ al: (document.querySelector('#sheet .fin-alert') || {}).textContent || '', ln: window.__ln.map(o => o.notifications[0].body) }));
  ok(/Gustos pasó su presupuesto: 110 %/.test(A.al) && A.ln.length === 1 && A.ln[0] === 'Gustos pasó el 100 % de su presupuesto.', 'al pasar el 100 %: aviso y notificación (sin montos)');
  await addEx(p, 'Helado', 'Gustos', '5');
  ok(await p.evaluate(() => !document.querySelector('#sheet .fin-alert') && window.__ln.length === 1), 'un gasto más en el mismo nivel no vuelve a avisar');
  await addEx(p, 'Pan', 'Alimentación', '10');
  ok(await p.evaluate(() => !document.querySelector('#sheet .fin-alert')), 'una categoría lejos del límite no avisa');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}

console.log('C. Meses y lecciones');
{
  const p = await open();
  await tab(p, 'mes');
  const C = await p.evaluate(() => ({ svgs: document.querySelectorAll('#sheet .fin-cols').length, sav: [...document.querySelectorAll('#sheet .fin-cols')[0].querySelectorAll('rect')].map(r => r.querySelector('title').textContent), rows: [...document.querySelectorAll('#sheet .fin-mt tbody tr')].map(r => __cells(r)), leg: [...document.querySelectorAll('#sheet .fin-legend.row li')].map(li => li.textContent.trim()) }));
  await shot(p, 'c1-meses');
  ok(C.svgs === 2 && C.sav.length === 2 && /^septiembre 2026: ahorro S\/ 2,620\.00$/.test(C.sav[0]) && /^octubre 2026: ahorro S\/ 2,750\.00$/.test(C.sav[1]), 'ahorro de los meses con datos de los últimos 6 (sep 2,620.00 · oct 2,750.00) ' + C.sav.join(' | '));
  ok(C.rows.length === 2 && /^oct 2026 3,400\.50 500\.90 2,750\.00$/.test(C.rows[0]) && /^sep 2026 3,400\.00 700\.00 2,620\.00$/.test(C.rows[1]), 'tabla: ingreso, gastado y ahorro por mes ' + C.rows.join(' | '));
  ok(C.leg.join() === 'Alimentación,Servicios,Transporte,Gustos,Imprevistos', 'leyenda de las columnas apiladas');
  await p.fill('#fin-nota', 'Comí mucho fuera la segunda quincena.'); await p.click('#sheet [data-fin="nota"]'); await p.waitForTimeout(150);
  ok(await p.evaluate(() => fin().notes['2026-10'] === 'Comí mucho fuera la segunda quincena.' && /✎/.test(document.querySelector('#sheet .fin-mt tbody tr').textContent)), 'la nota del mes se guarda y se marca en la tabla');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}

console.log('D. Exportar para IA');
{
  const p = await open();
  await p.evaluate(() => { fin().notes = { '2026-10': 'Comí mucho fuera.' }; fin().ex.push({ id: 'gz', at: 4, d: '2026-10-18', c: 'Cena', cat: 'c4', amt: 17000, fund: null, note: 'cumpleaños' }); finSave(); finSheet(); });
  await p.click('#sheet [data-fin="ai"]'); await p.waitForTimeout(200);
  const T = await p.evaluate(() => window.__clip[window.__clip.length - 1] || '');
  if (SHOTS) fs.writeFileSync(path.join(SHOTS, 'finanzas-ia.txt'), T);
  ok(/^Actúa como mi asesor de finanzas personales/.test(T) && /MIS FINANZAS · OCTUBRE 2026/.test(T), 'copia el texto con su prompt arriba');
  ok(/INGRESOS: sueldo S\/ 3,000\.50 \(Quincena 1 S\/ 1,500\.00, Quincena 2 S\/ 1,500\.50\); fondos aparte: Vale de alimentos S\/ 400\.00 \(solo Alimentación\)\. Ingreso total S\/ 3,400\.50\./.test(T), 'ingresos con sus pagos y el vale');
  ok(/- Gustos: presupuesto S\/ 150\.00 · gastado S\/ 170\.00 \(113 %\) · saldo −S\/ 20\.00 · EXCEDIDO/.test(T) && /TOTAL: presupuesto S\/ 1,550\.00/.test(T), 'presupuesto vs real por categoría (marca lo excedido) y totales');
  ok(/GASTOS DEL MES \(5\):\n- 2026-10-03 · Alimentación · Mercado · S\/ 250\.40 · con Vale de alimentos/.test(T) && /Cena · S\/ 170\.00 · nota: cumpleaños/.test(T), 'gastos detallados con el vale y la nota');
  ok(/MI NOTA DEL MES \(lecciones\): Comí mucho fuera\./.test(T), 'la nota del mes');
  ok(/COMPARACIÓN CON SEPTIEMBRE 2026:\n- Alimentación: S\/ 320\.00 → S\/ 250\.40 \(−S\/ 69\.60\)/.test(T) && /- Gustos: S\/ 90\.00 → S\/ 170\.00 \(\+S\/ 80\.00\)/.test(T), 'comparación con el mes anterior');
  ok(/Dónde me excedí/.test(T) && /presupuesto realista para noviembre 2026/.test(T) && /```\nPRESUPUESTO 2026-11\nCategoría \| Monto\nAlimentación \| 800\.00\n/.test(T) && /nombre EXACTO de esta lista: Alimentación, Servicios, Transporte, Gustos, Imprevistos/.test(T), 'pide análisis, excesos y el presupuesto de noviembre en el formato importable');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}

console.log('E. Importar recomendación');
{
  const p = await open();
  await p.click('#sheet [data-fin="rec"]'); await p.waitForTimeout(150);
  await p.fill('#fin-rec-t', 'Hola'); await p.click('#sheet [data-fin="rec-read"]'); await p.waitForTimeout(150);
  ok(await p.evaluate(() => /No encontré filas/.test(document.getElementById('fin-rec-e').textContent) && !document.querySelector('.fin-recp')), 'sin presupuesto en el texto: lo explica');
  const ANS = 'Análisis: te pasaste en Gustos.\n\n| Categoría | Gastado | Presupuesto |\n|---|---|---|\n| Gustos | 170 | 150 |\n\n```\nPRESUPUESTO 2026-11\nCategoría | Monto\nAlimentación | 750.00\nGustos | 120.00\nAhorro programado | 200.00\n```\nSuerte.';
  await p.fill('#fin-rec-t', ANS); await p.click('#sheet [data-fin="rec-read"]'); await p.waitForTimeout(150);
  const V = await p.evaluate(() => ({ rows: [...document.querySelectorAll('#sheet .fin-recp tbody tr')].map(r => __cells(r)), nov: JSON.stringify(finM('2026-11').bud), cats: fin().cats.length }));
  await shot(p, 'e1-vista-previa');
  ok(V.rows.length === 6 && V.rows[0] === 'Alimentación 800.00 750.00 −50.00' && V.rows[1] === 'Gustos 150.00 120.00 −30.00' && V.rows[2] === 'Ahorro programado (nueva) 0.00 200.00 +200.00' && /^Servicios \(sin cambio\) 300\.00 300\.00 =$/.test(V.rows[3]), 'vista previa: cambios, categoría nueva y las que quedan igual (lee el bloque, no la tabla del análisis) ' + JSON.stringify(V.rows));
  ok(V.nov === JSON.stringify({ c1: 80000, c2: 30000, c3: 20000, c4: 15000, c5: 10000 }) && V.cats === 5, 'antes de confirmar no cambia nada');
  await p.click('#sheet [data-fin="rec-apply"]'); await p.waitForTimeout(200);
  const Z = await p.evaluate(() => { const F = fin(), nov = F.m['2026-11'], nueva = F.cats.find(c => c.name === 'Ahorro programado'); return { nov: nov.bud, oct: F.m['2026-10'].bud, ym: state.finYM, nueva: nueva && nov.bud[nueva.id], tpl: F.tpl.bud.c1, next: document.querySelector('#sheet [data-fin="ym"][data-d="1"]').disabled }; });
  ok(Z.nov.c1 === 75000 && Z.nov.c4 === 12000 && Z.nov.c2 === 30000 && Z.nueva === 20000 && Z.ym === '2026-11', 'aplicado a noviembre (y muestra noviembre): cambia lo propuesto, crea la nueva y deja el resto');
  ok(Z.oct.c1 === 80000 && Z.oct.c4 === 15000 && Z.tpl === 75000, 'octubre no cambia; noviembre queda para los meses siguientes');
  ok(Z.next, 'desde noviembre no se puede ir más allá');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}

console.log('F. 360 px');
{
  const p = await open({ w: 360 });
  const W1 = await p.evaluate(() => { const c = document.querySelector('#sheet .fin-sheet'); return c.scrollWidth - c.clientWidth; });
  await tab(p, 'mes');
  const W2 = await p.evaluate(() => { const c = document.querySelector('#sheet .fin-sheet'); return c.scrollWidth - c.clientWidth; });
  await shot(p, 'f1-meses-360');
  ok(W1 <= 0 && W2 <= 0, `resumen con gráficos y meses caben a 360 px (${W1}, ${W2})`);
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}

await browser.close();
console.log(fail ? `\n${fail} FALLAS` : '\nTodo OK');
process.exit(fail ? 1 : 0);
