import { OWNER_SETTINGS, seedOwner } from './owner-fixture.mjs';
// Prueba de "Mis finanzas en Hoy" (finrapido.js): barra delgada y registro rápido. Montos y conceptos inventados.
// Uso (desde PowerShell): $env:PW_DIR = "<carpeta con node_modules/playwright>"; node tests/tfq.mjs <copia transpilada> <copia transpilada anterior> [capturas]
// A. Dueño en el teléfono: la barra (una línea, bajo la tarjeta del entrenamiento, solo en Hoy), abrir Mis finanzas,
//    la hoja rápida (monto enfocado, categorías en botones, última usada, vale, validación), guarda igual que el
//    formulario normal, alertas del presupuesto, "Más opciones", datos solo en cdh.fin, no sale durante una sesión.
// B. Dueño sin vales y dueño sin "Tus datos". C. Usuario nuevo: nada. D. Reloj: nada y sus pantallas idénticas.
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

/* Finanzas inventadas: sueldo 1,445.00, un vale, presupuesto por categoría y dos gastos de noviembre (245.00) */
const FIN = (funds = true) => ({ app: 'forja-finanzas', v: 1, cats: ['Alimentación', 'Servicios', 'Transporte', 'Gustos', 'Imprevistos'].map((n, i) => ({ id: 'c' + (i + 1), name: n })),
  tpl: { pays: [{ id: 'p1', name: 'Sueldo', amt: 144500 }], funds: funds ? [{ id: 'f1', name: 'Vale de alimentos', amt: 40000, cat: 'c1' }] : [], bud: { c1: 80000, c2: 30000, c3: 20000, c4: 15000, c5: 10000 } }, m: {},
  ex: [{ id: 'g1', at: 1, d: '2026-11-03', c: 'Mercado ficticio', cat: 'c1', amt: 20000, fund: null, note: '' }, { id: 'g2', at: 2, d: '2026-11-10', c: 'Taxi ficticio', cat: 'c3', amt: 4500, fund: null, note: '' }] });

async function open(dir, { seed, watch, w, fin } = {}) {
  const srv = await serve(dir);
  const ctx = await browser.newContext(watch ? { viewport: { width: 410, height: 500 }, hasTouch: true } : { viewport: { width: w || 390, height: 844 }, hasTouch: true });
  await ctx.route(/googleapis|gstatic|google\.com|firebase|github/, r => r.abort());
  const p = await ctx.newPage(); p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message));
  await p.clock.setFixedTime(new Date('2026-11-16T11:00:00'));
  await seedOwner(p, seed);
  await p.addInitScript(([o, F]) => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); if (o) localStorage.setItem('cdh.settings', JSON.stringify(o)); if (F) localStorage.setItem('cdh.fin', JSON.stringify(F)); localStorage.setItem('cdh.newsSeen', '"n6"'); localStorage.setItem('cdh.reminders', '[]'); } }, [seed || null, fin || null]);
  await p.goto(`http://127.0.0.1:${srv.address().port}/index.html`); await p.waitForTimeout(2000);
  await p.evaluate(() => { if (state.settings.pub) { state.settings.onb = 1; if (typeof pbClose === 'function') pbClose(); } state.settings.healthOk = 1; LS.set('newsSeen', NEWS_KEY); savePlans(); closeSheet(); state.tab = 'train'; render(); });
  await p.waitForTimeout(200);
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
/* La barra: texto, alto, si el texto se corta y entre qué bloques está */
const bar = p => p.evaluate(() => {
  const L = document.querySelectorAll('#app .fq-bar'), b = L[0]; if (!b) return null;
  const r = b.getBoundingClientRect(), t = b.querySelector('.fq-txt'), a = document.getElementById('app').getBoundingClientRect();
  return { n: L.length, txt: b.innerText.replace(/\s+/g, ' ').trim(), h: Math.round(r.height), cut: t.scrollWidth - t.clientWidth, out: Math.round(r.right - a.right), lines: Math.round(t.getBoundingClientRect().height / (parseFloat(getComputedStyle(t).lineHeight) || parseFloat(getComputedStyle(t).fontSize) * 1.3)), prev: b.previousElementSibling ? b.previousElementSibling.className : '', next: b.nextElementSibling ? b.nextElementSibling.className : '' };
});
const goTab = async (p, t) => { await p.evaluate(x => { state.tab = x; if (x === 'profile') state.profSub = 'body'; render(); }, t); await p.waitForTimeout(150); };
const openQuick = async p => { await p.click('#app .fq-add'); await p.waitForTimeout(250); };
const toastTxt = p => p.evaluate(() => { const t = document.getElementById('toast'); return t.hidden ? '' : t.textContent; });
const exLast = p => p.evaluate(() => { const e = fin().ex[fin().ex.length - 1]; return e ? JSON.parse(JSON.stringify(e)) : null; });
const sinId = e => { const o = Object.assign({}, e); delete o.id; delete o.at; return JSON.stringify(o); };

console.log('A. Dueño (teléfono)');
{
  const p = await open(DIR, { seed: OWNER_SETTINGS, fin: FIN() });
  /* La barra */
  let B = await bar(p);
  await shot(p, 'a1-hoy');
  ok(B && B.n === 1, 'Hoy (dueño): sale la barra de finanzas, una sola');
  ok(B && /^Nov(iembre)?: S\/ 245\.00( gastado)? · ahorro S\/ 1,200\.00 Gasto$/.test(B.txt), 'dice el mes, lo gastado y el ahorro, con el botón "+ Gasto": ' + (B && B.txt));
  ok(B && B.h >= 40 && B.h <= 48 && B.lines === 1 && B.cut <= 0 && B.out <= 0, `una sola línea, de la altura de un botón (${B && B.h} px), sin cortarse ni salirse`);
  ok(B && /hoy-hero/.test(B.prev), 'va justo debajo de la tarjeta del entrenamiento (' + (B && B.prev) + ')');
  for (const t of ['plans', 'progress', 'profile']) { await goTab(p, t); ok(await p.evaluate(() => !document.querySelector('.fq-bar')), `en ${t === 'plans' ? 'Rutinas' : t === 'progress' ? 'Progreso' : 'Perfil'} no sale la barra`); }
  ok(await p.evaluate(() => !!document.querySelector('.fin-card')), 'Perfil conserva su tarjeta "Mis finanzas"');
  await goTab(p, 'train');
  /* Tocar el texto abre Mis finanzas completo */
  await p.click('#app .fq-open'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => { const c = document.querySelector('#sheet .fin-sheet'); return !!c && c.dataset.t === 'res' && /noviembre 2026/.test(c.querySelector('.fin-mes b').textContent); }), 'tocar el resto de la barra abre "Mis finanzas" completo (Resumen de noviembre)');
  await p.click('#sheet [data-act="sheet-close"]'); await p.waitForTimeout(200);
  /* La hoja rápida */
  const keys0 = await p.evaluate(() => Object.keys(localStorage).sort().join());
  await openQuick(p); await shot(p, 'a2-hoja');
  const Q = await p.evaluate(() => { const c = document.querySelector('#sheet .sheet-card'), a = document.getElementById('fin-amt'), d = document.getElementById('fin-d');
    return { quick: c.classList.contains('fq-sheet'), full: c.classList.contains('pk-sheet') || c.classList.contains('fin-sheet'), h: Math.round(c.getBoundingClientRect().height), vh: innerHeight, foco: document.activeElement === a, mode: a.inputMode, val: a.value,
      dType: d.type, dVal: d.value, dates: document.querySelectorAll('#sheet input[type="date"]').length, chips: [...document.querySelectorAll('#sheet .fq-chip')].map(x => x.textContent), on: [...document.querySelectorAll('#sheet .fq-chip.on')].map(x => x.textContent).join(),
      rows: new Set([...document.querySelectorAll('#sheet .fq-chip')].map(x => Math.round(x.getBoundingClientRect().top))).size, vale: !!document.getElementById('fin-vale') && !document.getElementById('fin-vale').checked, valeTxt: (document.querySelector('#sheet .fq-vale') || {}).textContent || '', note: !!document.getElementById('fin-note'), btn: document.querySelector('#f-fin-q [type="submit"]').textContent.trim() }; });
  ok(Q.quick && !Q.full && Q.h < Q.vh * 0.62, `"+ Gasto" abre una hoja pequeña desde abajo (${Q.h} de ${Q.vh} px), no la pantalla completa`);
  ok(Q.foco && Q.mode === 'decimal' && Q.val === '', 'el monto ya tiene el cursor y pide el teclado numérico');
  ok(Q.chips.join() === 'Alimentación,Servicios,Transporte,Gustos,Imprevistos' && Q.rows === 1, 'las categorías son botones en una fila');
  ok(Q.on === 'Transporte', 'viene marcada la del último gasto anotado (Transporte): ' + Q.on);
  ok(Q.dType === 'hidden' && Q.dVal === '2026-11-16' && Q.dates === 0 && !Q.note, 'la fecha es hoy y no se muestra; sin campo de nota');
  ok(Q.vale && /¿Pagado con vale\?/.test(Q.valeTxt) && /Vale de alimentos/.test(Q.valeTxt), 'con vales en el mes: interruptor "¿Pagado con vale?" apagado');
  ok(Q.btn === 'Guardar' && await p.evaluate(() => /Más opciones/.test(document.querySelector('#sheet .fq-more').textContent)), 'botón "Guardar" y enlace "Más opciones"');
  /* Validación: la misma del formulario normal */
  await p.click('#f-fin-q [type="submit"]'); await p.waitForTimeout(150);
  ok(await p.evaluate(() => /monto mayor que 0/.test(document.getElementById('fin-err').textContent) && !document.getElementById('fin-err').hidden && fin().ex.length === 2 && !!document.querySelector('#sheet .fq-sheet')), 'sin monto: no guarda, lo explica y la hoja sigue abierta');
  await p.fill('#fin-amt', 'abc'); await p.click('#f-fin-q [type="submit"]'); await p.waitForTimeout(150);
  ok(await p.evaluate(() => fin().ex.length === 2 && !!document.querySelector('#sheet .fq-sheet')), 'un monto que no es número tampoco se guarda');
  /* Guardar: monto, categoría con un toque y listo */
  await p.fill('#fin-amt', '12,5'); await p.focus('#fin-amt');
  await p.click('#sheet .fq-chip[data-id="c4"]'); await p.waitForTimeout(100);
  ok(await p.evaluate(() => document.activeElement.id === 'fin-amt' && document.getElementById('fin-cat').value === 'c4' && [...document.querySelectorAll('#sheet .fq-chip.on')].map(x => x.textContent).join() === 'Gustos' && document.querySelector('#sheet .fq-chip[data-id="c4"]').getAttribute('aria-checked') === 'true'), 'elegir la categoría la marca y no quita el cursor del monto (el teclado sigue abierto)');
  await p.click('#f-fin-q [type="submit"]'); await p.waitForTimeout(250);
  const e1 = await exLast(p);
  ok(await p.evaluate(() => document.getElementById('sheet').hidden && fin().ex.length === 3), 'Guardar: la hoja se cierra sola');
  ok(await toastTxt(p) === 'Gasto agregado: S/ 12.50.', 'aviso "Gasto agregado: S/ 12.50." → ' + await toastTxt(p));
  ok(e1 && e1.d === '2026-11-16' && e1.c === '' && e1.cat === 'c4' && e1.amt === 1250 && e1.fund === null && e1.note === '' && /^g/.test(e1.id) && e1.at > 2, 'el gasto: fecha de hoy, 12.50, Gustos, sin concepto ni vale ' + JSON.stringify(e1));
  B = await bar(p);
  ok(B && /S\/ 257\.50/.test(B.txt) && /ahorro S\/ 1,187\.50/.test(B.txt), 'la barra se actualiza sola: ' + (B && B.txt));
  ok(await p.evaluate(() => Object.keys(localStorage).sort().join()) === keys0, 'no aparece ninguna clave nueva guardada en el celular');
  /* La última categoría usada */
  await openQuick(p);
  ok(await p.evaluate(() => [...document.querySelectorAll('#sheet .fq-chip.on')].map(x => x.textContent).join() === 'Gustos' && document.activeElement.id === 'fin-amt'), 'al volver a abrir, viene marcada la última que usé (Gustos)');
  /* Con concepto, vale y la tecla Intro */
  await p.fill('#fin-amt', '30'); await p.fill('#fin-c', 'Menú ficticio'); await p.click('#sheet .fq-chip[data-id="c1"]'); await p.check('#fin-vale'); await shot(p, 'a3-hoja-llena');
  await p.press('#fin-amt', 'Enter'); await p.waitForTimeout(250);
  const e2 = await exLast(p);
  ok(e2 && e2.c === 'Menú ficticio' && e2.cat === 'c1' && e2.amt === 3000 && e2.fund === 'f1' && await p.evaluate(() => document.getElementById('sheet').hidden), 'con concepto y vale, y la tecla Intro también guarda ' + JSON.stringify(e2));
  ok(await p.evaluate(() => { const S = finSum('2026-11'); return S.byFund === 3000 && S.saving === 144500 - 25750; }), 'lo pagado con vale no toca el sueldo (igual que siempre)');
  /* Igual que el formulario normal: los mismos datos, campo por campo */
  await p.click('#app .fq-open'); await p.waitForTimeout(250); await p.click('#sheet [data-fin="tab"][data-t="gas"]'); await p.waitForTimeout(200);
  await p.fill('#fin-amt', '12,5'); await p.selectOption('#fin-cat', 'c4'); await p.click('#f-fin-ex [type="submit"]'); await p.waitForTimeout(200);
  const n1 = await exLast(p);
  await p.fill('#fin-amt', '30'); await p.fill('#fin-c', 'Menú ficticio'); await p.selectOption('#fin-cat', 'c1'); await p.check('#fin-vale'); await p.click('#f-fin-ex [type="submit"]'); await p.waitForTimeout(200);
  const n2 = await exLast(p);
  ok(sinId(e1) === sinId(n1) && sinId(e2) === sinId(n2) && Object.keys(e1).join() === Object.keys(n1).join(), 'el gasto rápido queda guardado igual que el del formulario normal (mismos campos y valores) ' + sinId(n1) + ' ' + sinId(n2));
  ok(await p.evaluate(() => !!document.querySelector('#sheet .fin-sheet') && fin().ex.length === 6), 'el formulario normal sigue funcionando igual (se queda en Mis finanzas)');
  await p.click('#sheet [data-act="sheet-close"]'); await p.waitForTimeout(200);
  B = await bar(p);
  ok(B && /S\/ 330\.00/.test(B.txt), 'al cerrar Mis finanzas la barra queda al día: ' + (B && B.txt));
  /* Alertas del presupuesto: 80 % y 100 % */
  await openQuick(p); await p.fill('#fin-amt', '85'); await p.click('#sheet .fq-chip[data-id="c5"]'); await p.click('#f-fin-q [type="submit"]'); await p.waitForTimeout(250);
  let T = await toastTxt(p);
  ok(/^Gasto agregado: S\/ 85\.00\. Imprevistos llegó al 85 % de su presupuesto \(S\/ 85\.00 de S\/ 100\.00\)\.$/.test(T), 'alerta del 80 % junto al aviso: ' + T);
  await openQuick(p); await p.fill('#fin-amt', '20'); await p.click('#f-fin-q [type="submit"]'); await p.waitForTimeout(250);
  T = await toastTxt(p);
  ok(/^Gasto agregado: S\/ 20\.00\. Imprevistos pasó su presupuesto: 105 % \(S\/ 105\.00 de S\/ 100\.00\)\.$/.test(T), 'alerta del 100 %: ' + T);
  await openQuick(p); await p.fill('#fin-amt', '1'); await p.click('#f-fin-q [type="submit"]'); await p.waitForTimeout(250);
  ok(await toastTxt(p) === 'Gasto agregado: S/ 1.00.', 'cada nivel avisa una sola vez');
  /* Más opciones: el formulario completo con lo escrito */
  await openQuick(p); await p.fill('#fin-amt', '33'); await p.fill('#fin-c', 'Café ficticio'); await p.click('#sheet .fq-chip[data-id="c3"]'); await p.check('#fin-vale');
  await p.click('#sheet .fq-more'); await p.waitForTimeout(300);
  const M = await p.evaluate(() => { const c = document.querySelector('#sheet .fin-sheet'); return c ? { t: c.dataset.t, amt: document.getElementById('fin-amt').value, c: document.getElementById('fin-c').value, cat: document.getElementById('fin-cat').value, vale: document.getElementById('fin-vale').checked, d: document.getElementById('fin-d').type + ' ' + document.getElementById('fin-d').value, note: !!document.getElementById('fin-note'), al: !!document.querySelector('#sheet .fin-alert'), n: fin().ex.length } : null; });
  await shot(p, 'a4-mas-opciones');
  ok(M && M.t === 'gas' && M.amt === '33' && M.c === 'Café ficticio' && M.cat === 'c3' && M.vale && M.d === 'date 2026-11-16' && M.note && !M.al && M.n === 9, '"Más opciones" abre el formulario completo (fecha y nota) con lo que ya había escrito, sin guardar nada ' + JSON.stringify(M));
  await p.fill('#fin-d', '2026-11-12'); await p.fill('#fin-note', 'Nota ficticia'); await p.click('#f-fin-ex [type="submit"]'); await p.waitForTimeout(200);
  const e3 = await exLast(p);
  ok(e3 && e3.d === '2026-11-12' && e3.note === 'Nota ficticia' && e3.amt === 3300 && e3.cat === 'c3' && e3.fund === 'f1', 'y desde ahí se guarda con otra fecha y nota');
  await p.click('#sheet [data-act="sheet-close"]'); await p.waitForTimeout(200);
  /* Solo en el celular */
  const N = await p.evaluate(() => ({ ls: localStorage.getItem('cdh.fin'), set: JSON.stringify(state.settings), sh: JSON.stringify(sync.shared()), bk: backupJSON(), daily: JSON.stringify(state.daily), plans: JSON.stringify(state.plans), ses: JSON.stringify(state.sessions) }));
  ok(/Menú ficticio/.test(N.ls) && ![N.set, N.sh, N.bk, N.daily, N.plans, N.ses].some(t => /ficticio|forja-finanzas|Vale de alimentos|finLastCat/.test(t)), 'los gastos siguen solo en cdh.fin: nada en los ajustes, la sincronización ni el respaldo de la cuenta');
  ok(await p.evaluate(() => Object.keys(localStorage).sort().join()) === keys0, 'y sin claves nuevas en el celular');
  /* Durante una sesión no aparece */
  await p.evaluate(() => { const P = activePlan(); startSession(P.id, P.days[0].id); render(); }); await p.waitForTimeout(500);
  ok(await p.evaluate(() => !!state.draft && !document.querySelector('.fq-bar')), 'con una sesión en curso la barra no aparece');
  await p.evaluate(() => { const b = document.querySelector('[data-act="sx-min"]'); if (b) b.click(); }); await p.waitForTimeout(700);
  await p.evaluate(() => { state.tab = 'train'; render(); }); await p.waitForTimeout(200);
  ok(await p.evaluate(() => !!state.draft && !document.querySelector('.fq-bar')), 'ni con la sesión minimizada (Hoy con el entreno en curso)');
  await p.evaluate(() => fqOpen()); await p.waitForTimeout(150);
  ok(await p.evaluate(() => !document.querySelector('#sheet .fq-sheet')), 'y la hoja rápida no se abre a media sesión');
  await p.evaluate(() => { closeSheet(); discardSession(); state.tab = 'train'; render(); }); await p.waitForTimeout(300);
  ok(await p.evaluate(() => !state.draft && document.querySelectorAll('#app .fq-bar').length === 1), 'al terminar la sesión la barra vuelve');
  /* Recién abierta la app: la última categoría sale del último gasto guardado */
  await p.reload(); await p.waitForTimeout(2000); await p.evaluate(() => { closeSheet(); state.tab = 'train'; render(); }); await p.waitForTimeout(200);
  B = await bar(p);
  ok(B && B.n === 1 && await p.evaluate(() => fin().ex.length === 10), 'tras recargar la app: la barra y los 10 gastos siguen');
  await openQuick(p);
  ok(await p.evaluate(() => !state.finLastCat) && await p.evaluate(() => [...document.querySelectorAll('#sheet .fq-chip.on')].map(x => x.textContent).join()) === 'Transporte', 'recién abierta la app, la categoría marcada es la del último gasto anotado (Transporte)');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}
{
  /* 360 px y montos grandes: sigue en una línea */
  for (const w of [360, 412]) {
    const p = await open(DIR, { seed: OWNER_SETTINGS, fin: FIN(), w });
    const B = await bar(p); await shot(p, 'a5-' + w);
    ok(B && B.lines === 1 && B.cut <= 0 && B.out <= 0 && B.h <= 48 && /S\/ 245\.00/.test(B.txt) && /ahorro S\/ 1,200\.00/.test(B.txt), `a ${w} px cabe en una línea con los dos montos: ${B && B.txt}`);
    await p.evaluate(() => { const F = fin(); F.m['2026-11'] = { pays: [{ id: 'p1', name: 'Sueldo', amt: 1234567 }], funds: [], bud: {} }; F.ex.push({ id: 'g9', at: 9, d: '2026-11-02', c: 'Prueba', cat: 'c1', amt: 2345678, fund: null, note: '' }); finSave(); render(); fqRefresh(); });
    const C = await bar(p);
    ok(C && C.lines === 1 && C.h <= 48 && C.out <= 0 && /−S\/ 11,356\.11/.test(C.txt), `a ${w} px con montos grandes y ahorro negativo no se rompe la línea: ${C && C.txt}`);
    await openQuick(p);
    ok(await p.evaluate(() => { const c = document.querySelector('#sheet .sheet-card'); return c.scrollWidth - c.clientWidth <= 0 && !document.getElementById('fin-vale') && !/vale/i.test(c.textContent); }), `a ${w} px la hoja no se desborda; sin vales en el mes no aparece nada del vale`);
    ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
    await p.done();
  }
}

console.log('B. Dueño sin finanzas guardadas y sin "Tus datos"');
{
  const s = JSON.parse(JSON.stringify(OWNER_SETTINGS)); delete s.prof;
  const p = await open(DIR, { seed: s });
  const B = await bar(p);
  ok(B && B.n === 1 && /S\/ 0\.00( gastado)? · ahorro S\/ 0\.00 Gasto$/.test(B.txt), 'sale la barra, todo en 0: ' + (B && B.txt));
  await openQuick(p);
  ok(await p.evaluate(() => [...document.querySelectorAll('#sheet .fq-chip.on')].map(x => x.textContent).join() === 'Alimentación' && !document.getElementById('fin-vale') && !/vale/i.test(document.querySelector('#sheet .sheet-card').textContent) && document.activeElement.id === 'fin-amt'), 'hoja rápida: primera categoría marcada y nada de vales');
  await p.fill('#fin-amt', '7.5'); await p.click('#f-fin-q [type="submit"]'); await p.waitForTimeout(250);
  ok(await p.evaluate(() => fin().ex.length === 1 && fin().ex[0].amt === 750 && fin().ex[0].fund === null && !!fin().m['2026-11']), 'guarda el primer gasto (y el mes queda con su configuración)');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}

console.log('C. Usuario nuevo');
{
  const p = await open(DIR, { fin: FIN() });   /* aunque el celular tuviera finanzas guardadas */
  ok(await p.evaluate(() => !document.querySelector('.fq-bar') && !/finanzas|gastado|ahorro S\//i.test(document.getElementById('app').textContent)), 'en su Hoy no sale la barra ni nada de finanzas');
  await p.evaluate(() => { fqOpen(); }); await p.waitForTimeout(150);
  ok(await p.evaluate(() => !document.querySelector('#sheet .fq-sheet') && document.getElementById('sheet').hidden), 'la hoja rápida no se abre');
  await p.evaluate(() => { document.body.insertAdjacentHTML('beforeend', '<button id="x-q" data-fin="quick">x</button><button id="x-o" data-fin="open">x</button>'); document.getElementById('x-q').click(); document.getElementById('x-o').click(); }); await p.waitForTimeout(150);
  ok(await p.evaluate(() => document.getElementById('sheet').hidden), 'ni aunque algo intentara abrirla');
  for (const t of ['plans', 'progress', 'profile']) { await goTab(p, t); }
  ok(await p.evaluate(() => !document.querySelector('.fq-bar,.fin-card')), 'tampoco en las otras pestañas');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}

console.log('D. Reloj');
{
  const p = await open(DIR, { seed: OWNER_SETTINGS, watch: true, fin: FIN() }), q = await open(OLD, { seed: OWNER_SETTINGS, watch: true, fin: FIN() });
  ok(await p.evaluate(() => isWatch() && !document.querySelector('.fq-bar') && !/finanzas|gastado/i.test(document.getElementById('app').textContent)), 'en el inicio del reloj no sale la barra ni nada de finanzas');
  let d = await pixDiff(await shot(p, 'd1-reloj-inicio'), await shot(q, 'd1-reloj-inicio-antes'));
  ok(d === 0, 'inicio del reloj idéntico a la versión anterior' + (d ? ` (${d} px)` : ''));
  await p.evaluate(() => { fqOpen(); }); await p.waitForTimeout(150);
  ok(await p.evaluate(() => !document.querySelector('#sheet .fq-sheet')), 'la hoja rápida no se abre en el reloj');
  for (const t of ['profile', 'settings']) {
    for (const x of [p, q]) { await x.evaluate(k => { closeSheet(); state.tab = k; render(); scrollTo(0, 0); }, t); await x.waitForTimeout(250); }
    d = await pixDiff(await shot(p, 'd2-reloj-' + t), await shot(q, 'd2-reloj-' + t + '-antes'));
    ok(d === 0 && await p.evaluate(() => !document.querySelector('.fq-bar,.fin-card')), `${t === 'profile' ? 'Perfil' : 'Ajustes'} del reloj idéntico y sin finanzas` + (d ? ` (${d} px)` : ''));
  }
  for (const x of [p, q]) { await x.evaluate(() => { const P = activePlan(); state.tab = 'train'; startSession(P.id, P.days[0].id); render(); }); await x.waitForTimeout(500); }
  d = await pixDiff(await shot(p, 'd3-reloj-sesion'), await shot(q, 'd3-reloj-sesion-antes'));
  ok(d === 0, 'sesión del reloj idéntica' + (d ? ` (${d} px)` : ''));
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done(); await q.done();
}

await browser.close();
console.log(fail ? `\n${fail} FALLAS` : '\nTodo OK');
process.exit(fail ? 1 : 0);
