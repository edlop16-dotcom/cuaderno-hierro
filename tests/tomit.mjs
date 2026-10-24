import { OWNER_SETTINGS, seedOwner } from './owner-fixture.mjs';
// Prueba de "Omitir hoy" en los hábitos (omitir.js, habalarm.js). Datos inventados.
// Uso (desde PowerShell): $env:PW_DIR = "<carpeta con node_modules/playwright>"; node tests/tomit.mjs <copia transpilada> <copia transpilada anterior> [capturas]
// La parte nativa (HabitAlarms.skip: botón en la notificación y en la pantalla completa) no corre en el navegador: se simula
// el plugin HabitAlarm y se comprueba lo que la app le manda (items con skipBtn, sin los avisos de hoy del omitido) y lee (eventos skip).
// A. Dueño: botón y lista "Omitir hoy", no cuenta como hecho, cancela los avisos de hoy (no los de mañana), deshacer,
//    racha en pausa, "Tus rachas" con "–", resumen semanal aparte, aviso dentro de la app, evento del nativo.
// B. Usuario nuevo. C. Reloj: pantalla idéntica, sin botón en sus avisos, pero respeta lo omitido.
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
const TODAY = '2026-10-19';
/* Plugin HabitAlarm simulado: anota las llamadas; takeEvents devuelve una vez los eventos dados */
const NATIVE = cfg => {
  window.__ha = { calls: [] }; let took = 0;
  const rec = n => o => { window.__ha.calls.push([n, o || null]); return Promise.resolve(n === 'status' ? { exact: true, fullScreen: true, notif: true, overlay: true, sdk: 35 } : n === 'takeEvents' ? { events: took++ ? [] : (cfg.events || []) } : n === 'log' ? { log: [] } : {}); };
  const H = {}; ['schedule', 'takeEvents', 'dismiss', 'status', 'openSettings', 'test', 'log', 'rest', 'restCancel'].forEach(n => { H[n] = rec(n); });
  window.Capacitor = { isNativePlatform: () => true, Plugins: { HabitAlarm: H } };
};
/* Recordatorio inventado: Creatina a las 21:00 todos los días, ✕ repite cada 30 min */
const REM = [{ id: 'r-test-crea', kind: 'hab', hab: 'crea', label: 'Creatina', time: '21:00', days: [0, 1, 2, 3, 4, 5, 6], on: true, again: 30 }];
async function open(dir, { seed, watch, events, rems } = {}) {
  const srv = await serve(dir);
  const ctx = await browser.newContext(watch ? { viewport: { width: 410, height: 500 }, hasTouch: true } : { viewport: { width: 390, height: 844 }, hasTouch: true });
  await ctx.route(/googleapis|gstatic|google\.com|firebase|github/, r => r.abort());
  const p = await ctx.newPage(); p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message));
  await p.clock.setFixedTime(new Date(TODAY + 'T10:30:30'));
  await p.addInitScript(NATIVE, { events: events || [] });
  await seedOwner(p, seed);
  await p.addInitScript(([o, rems]) => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); if (o) localStorage.setItem('cdh.settings', JSON.stringify(o)); localStorage.setItem('cdh.newsSeen', '"n6"'); localStorage.setItem('cdh.reminders', JSON.stringify(rems)); } }, [seed || null, rems || REM]);
  await p.goto(`http://127.0.0.1:${srv.address().port}/index.html`); await p.waitForTimeout(2000);
  await p.evaluate(() => { if (state.settings.pub) { state.settings.onb = 1; if (typeof pbClose === 'function') pbClose(); } state.settings.healthOk = 1; state.notifPerm = 'granted'; LS.set('newsSeen', NEWS_KEY); savePlans(); closeSheet(); state.tab = 'train'; render(); });
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
/* Lo último que la app mandó a programar al nativo */
const sched = async p => { await p.evaluate(() => scheduleAll()); await p.waitForTimeout(200); return p.evaluate(() => { const c = window.__ha.calls.filter(x => x[0] === 'schedule').pop(); return c ? c[1] : null; }); };
const habItems = (S, k, day) => (S.items || []).filter(x => x.habit === k && (!day || x.day === day));
const day = (o) => p => p.evaluate(o => { const d = new Date(); d.setDate(d.getDate() + o); return dk(d); }, o);

console.log('A. Dueño');
{
  const p = await open(DIR, { seed: OWNER_SETTINGS });
  let S = await sched(p);
  ok(habItems(S, 'crea', TODAY).length === 1 && habItems(S, 'crea', TODAY)[0].skipBtn === true, 'antes: Creatina avisa hoy a las 21:00 y el aviso del teléfono lleva "Omitir hoy"');
  const H = await p.evaluate(() => { const c = document.getElementById('habits'), b = c && c.querySelector('[data-om="open"]'); return b ? { t: b.textContent.trim(), h: b.getBoundingClientRect().height } : null; });
  ok(H && H.t === 'Omitir hoy', '"Hábitos de hoy" tiene el botón "Omitir hoy"');
  await p.click('#habits [data-om="open"]'); await p.waitForTimeout(250);
  const L = await p.evaluate(() => [...document.querySelectorAll('#sheet .om-row')].map(r => ({ n: r.querySelector('b').textContent, btn: (r.querySelector('[data-om]') || {}).textContent || '' })));
  await shot(p, 'a1-lista-omitir');
  ok(L.length >= 3 && L.every(r => r.btn === 'Omitir hoy'), `lista con cada hábito por hacer y su "Omitir hoy" (${L.map(r => r.n).join(', ')})`);
  await p.click('#sheet [data-om="skip"][data-k="crea"]'); await p.waitForTimeout(300);
  const D = await p.evaluate(d => { const t = state.daily[d] || {}; return { skip: !!(t.skip && t.skip.crea), done: !!t.crea, row: document.querySelector('#sheet [data-om="undo"][data-k="crea"]') ? 'Deshacer' : '' }; }, TODAY);
  ok(D.skip && !D.done && D.row === 'Deshacer', 'Creatina queda omitida, no hecha, y se puede deshacer');
  await p.evaluate(() => closeSheet()); await p.waitForTimeout(200);
  const T = await p.evaluate(() => { const b = document.querySelector('#habits [data-act="sup"][data-k="crea"]'); return b ? { om: b.classList.contains('om'), on: b.classList.contains('on'), t: b.querySelector('small').textContent } : null; });
  await p.evaluate(() => document.getElementById('habits').scrollIntoView({ block: 'center' })); await shot(p, 'a2-habitos-omitido');
  ok(T && T.om && !T.on && T.t === 'Omitido hoy', 'en "Hábitos de hoy" sale en gris: "Omitido hoy"');
  S = await sched(p);
  ok(!habItems(S, 'crea', TODAY).length && habItems(S, 'crea', await day(1)(p)).length === 1 && S.done.indexOf('crea') >= 0, 'se cancelan los avisos de hoy (y sus repeticiones en el nativo); mañana avisa normal');
  /* Deshacer el mismo día */
  await p.click('#habits [data-om="open"]'); await p.waitForTimeout(200);
  await p.click('#sheet [data-om="undo"][data-k="crea"]'); await p.waitForTimeout(300);
  S = await sched(p);
  ok(await p.evaluate(d => !((state.daily[d] || {}).skip || {}).crea, TODAY) && habItems(S, 'crea', TODAY).length === 1 && S.done.indexOf('crea') < 0, 'deshacer: vuelve a avisar hoy');
  await p.evaluate(() => closeSheet());
  /* Racha en pausa: ayer omitido, antes 4 días hechos y hoy hecho → 5 */
  const R = await p.evaluate(() => {
    const k = d => { const x = new Date(); x.setDate(x.getDate() - d); return dk(x); };
    for (let i = 0; i < 9; i++) { const t = state.daily[k(i)] = state.daily[k(i)] || { water: 0 }; delete t.crea; delete t.skip; }
    [2, 3, 4, 5].forEach(i => { state.daily[k(i)].crea = true; });
    habSkip('crea', k(1), true, true);
    const pause = supStreak('crea');          // hoy sin marcar: 4 (ayer en pausa)
    state.daily[k(0)].crea = true; const today = supStreak('crea');   // hoy hecho: 5
    habSkip('crea', k(1), false, true); const cut = supStreak('crea');   // sin el omitido, ayer vacío corta: 1
    habSkip('crea', k(1), true, true); habSkip('crea', k(0), true, true); delete state.daily[k(0)].crea; const omToday = supStreak('crea');   // hoy y ayer omitidos: 4
    saveDaily(); return { pause, today, cut, omToday };
  });
  ok(R.pause === 4 && R.today === 5 && R.cut === 1 && R.omToday === 4, `racha en pausa: ${R.pause} → ${R.today} al hacerlo hoy; sin la pausa se cortaría (${R.cut}); con hoy omitido sigue en ${R.omToday}`);
  /* "Tus rachas": el día omitido con "–" */
  await p.evaluate(() => habSheet()); await p.waitForTimeout(250);
  const G = await p.evaluate(() => { const y = new Date(); y.setDate(y.getDate() - 1); const b = document.querySelector(`#sheet .hd[data-k="crea"][data-d="${dk(y)}"]`); return b ? { om: b.classList.contains('om'), t: b.querySelector('span').textContent, al: b.getAttribute('aria-label') } : null; });
  await shot(p, 'a3-tus-rachas');
  ok(G && G.om && G.t === '–' && / · omitido$/.test(G.al), '"Tus rachas": el día omitido sale aparte con "–"');
  await p.evaluate(() => closeSheet());
  /* Resumen semanal: omitidos aparte, sin bajar el porcentaje */
  const W = await p.evaluate(() => { const r = weekReport(0), h = reportHTML(r, "", false); return { hskip: r.hskip, hab: r.hab, lbl: /hábitos · \d+ omitidos?/.test(h) }; });
  ok(W.hskip === 1 && W.hab === 0 && W.lbl, `resumen semanal (hoy lunes): el omitido de hoy va aparte (${W.hskip}) y no cuenta para el ${W.hab} %`);
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}
{
  /* Aviso dentro de la app (pantalla completa web/app abierta) */
  const p = await open(DIR, { seed: OWNER_SETTINGS });
  await p.evaluate(() => { const r = state.reminders[0], at = new Date(); at.setHours(21, 0, 0, 0); haShow(haItemFor(r, 0, at, 0)); });
  await p.waitForTimeout(200); await shot(p, 'a4-aviso-app');
  ok(await p.evaluate(() => !!document.querySelector('#hab-alarm .ha-skipb')), 'el aviso dentro de la app tiene "Omitir hoy"');
  await p.click('#hab-alarm .ha-skipb'); await p.waitForTimeout(300);
  ok(await p.evaluate(d => document.getElementById('hab-alarm').hidden && !!((state.daily[d] || {}).skip || {}).crea && !(state.daily[d] || {}).crea, TODAY), 'tocarlo cierra el aviso y omite Creatina hoy (sin marcarla hecha)');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}
{
  /* "Omitir hoy" tocado en la notificación o la pantalla nativa con la app cerrada: llega como evento al abrir */
  const p = await open(DIR, { seed: OWNER_SETTINGS, events: [{ habit: 'prot', kind: 'hab', day: TODAY, skip: true, at: 1 }] });
  await p.waitForTimeout(500);
  ok(await p.evaluate(d => !!((state.daily[d] || {}).skip || {}).prot && !(state.daily[d] || {}).prot, TODAY), 'el evento del nativo deja Proteína omitida hoy (no hecha)');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}

console.log('B. Usuario nuevo');
{
  const p = await open(DIR, { rems: [] });
  const k = await p.evaluate(() => habList()[0].k);
  await p.click('#habits [data-om="open"]'); await p.waitForTimeout(200);
  await p.click(`#sheet [data-om="skip"][data-k="${k}"]`); await p.waitForTimeout(200);
  ok(await p.evaluate(([d, k]) => !!((state.daily[d] || {}).skip || {})[k], [TODAY, k]), 'puede omitir sus hábitos');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}

console.log('C. Reloj');
{
  const p = await open(DIR, { seed: OWNER_SETTINGS, watch: true }), q = await open(OLD, { seed: OWNER_SETTINGS, watch: true });
  const d = await pixDiff(await shot(p, 'c1-reloj'), await shot(q, 'c1-reloj-antes'));
  ok(d === 0 && await p.evaluate(() => !document.querySelector('[data-om]')), 'inicio del reloj idéntico y sin "Omitir hoy"' + (d ? ` (${d} px)` : ''));
  let S = await sched(p);
  ok(habItems(S, 'crea', TODAY).length === 1 && habItems(S, 'crea', TODAY)[0].skipBtn === false, 'sus avisos no llevan el botón');
  await p.evaluate(d => { habSkip('crea', d, true); }, TODAY);   // como si llegara omitido del celular
  S = await sched(p);
  ok(!habItems(S, 'crea', TODAY).length, 'pero respeta lo omitido en el celular: no lo avisa hoy');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done(); await q.done();
}

await browser.close();
console.log(fail ? `\n${fail} FALLAS` : '\nTodo OK');
process.exit(fail ? 1 : 0);
