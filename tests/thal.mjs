// Prueba de los recordatorios de hábitos a la hora real (habalarm.js + stats.js), con Playwright y Edge.
// Uso (desde PowerShell): $env:PW_DIR = "<carpeta con node_modules/playwright>"; node tests/thal.mjs <copia transpilada> [copia transpilada anterior] [capturas]
// La parte nativa (HabitAlarms.java: ventana de 1 px para abrir la pantalla completa con la app cerrada) no se puede
// probar aquí: la compila android-beta.yml. Aquí: rueda de ajustes en "Hábitos de hoy" (lleva a Recordatorios),
// lista de permisos con ✓ / Permitir (plugin simulado), "Probar" a 20 s en el teléfono y reloj sin cambios.
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
const browser = await chromium.launch({ channel: 'msedge', headless: false, args: ['--headless=new'] });

/* Capacitor nativo simulado con solo el plugin HabitAlarm (anota las llamadas en window.__ha) */
const NATIVE = st => {
  window.__ha = { calls: [] };
  const rec = n => o => { window.__ha.calls.push([n, o || null]); return Promise.resolve(n === 'status' ? st : n === 'takeEvents' ? { events: [] } : {}); };
  window.Capacitor = { isNativePlatform: () => true, Plugins: { HabitAlarm: { schedule: rec('schedule'), takeEvents: rec('takeEvents'), dismiss: rec('dismiss'), status: rec('status'), openSettings: rec('openSettings'), test: rec('test') } } };
};
async function open(dir, { owner, watch, native } = {}) {
  const srv = await serve(dir);
  const ctx = await browser.newContext(watch ? { viewport: { width: 410, height: 500 }, hasTouch: true } : { viewport: { width: 390, height: 844 }, hasTouch: true });
  await ctx.route(/googleapis|gstatic|google\.com|firebase|github/, r => r.abort());
  const p = await ctx.newPage(); p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message));
  await p.clock.setFixedTime(new Date('2026-10-19T08:00:30'));
  if (native) await p.addInitScript(NATIVE, native);
  await p.addInitScript(o => { if (!localStorage.getItem('cdh.settings')) { localStorage.setItem('cdh.settings', JSON.stringify(o.owner ? { owner: 1, healthOk: 1 } : {})); localStorage.setItem('cdh.newsSeen', '"n4"'); } }, { owner });
  await p.goto(`http://127.0.0.1:${srv.address().port}/index.html`);
  await p.waitForTimeout(1800);
  if (!owner && !watch) await p.evaluate(() => { state.settings.onb = 1; state.settings.healthOk = 1; if (typeof pbClose === 'function') pbClose(); LS.set('newsSeen', NEWS_KEY); savePlans(); closeSheet(); render(); });
  await p.evaluate(() => { if (!$('#sheet').hidden) closeSheet(); });
  p.done = async () => { await ctx.close(); srv.close(); };
  return p;
}
const shot = async (p, n) => { const b = await p.screenshot({ animations: 'disabled' }); if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); fs.writeFileSync(path.join(SHOTS, n + '.png'), b); } return b; };
const GEAR = 'M12.22 2h-.44';   // trazo del icono "settings"
const BELL = 'M6 8a6 6 0 0 1 12 0';

async function gearCheck(p, who) {
  const g = await p.evaluate(([GEAR, BELL]) => { const b = document.querySelector('#habits [data-act="hab-rem"]'); return b && { label: b.getAttribute('aria-label'), gear: b.innerHTML.includes(GEAR), bell: b.innerHTML.includes(BELL), cal: !!document.querySelector('#habits [data-act="hab-edit"]') }; }, [GEAR, BELL]);
  ok(g && g.gear && !g.bell, `${who}: "Hábitos de hoy" muestra la rueda de ajustes en vez de la campana`);
  ok(g && g.label === 'Ajustes de los recordatorios', `${who}: dice "Ajustes de los recordatorios"`);
  ok(g && g.cal, `${who}: el calendario sigue igual`);
  await p.click('#habits [data-act="hab-rem"]'); await p.waitForTimeout(900);
  const r = await p.evaluate(() => { const h = [...document.querySelectorAll('#app h3')].find(x => /Recordatorios/.test(x.textContent)); const b = h && h.getBoundingClientRect(); return { tab: state.tab, seen: !!b && b.top >= 0 && b.top < innerHeight && b.height > 0 }; });
  ok(r.tab === 'settings' && r.seen, `${who}: al tocarla se abren los ajustes de Recordatorios, a la vista`);
}

console.log('A. Dueño (web): rueda de ajustes');
{
  const p = await open(DIR, { owner: true });
  await shot(p, 'a-hoy');
  await gearCheck(p, 'dueño');
  await shot(p, 'a-recordatorios');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}

console.log('B. Dueño en la app (plugin simulado, Android 15 sin "pantalla completa")');
{
  const p = await open(DIR, { owner: true, native: { exact: true, overlay: true, fullScreen: false, notif: true, sdk: 35 } });
  await gearCheck(p, 'app');
  await p.waitForTimeout(800); await p.evaluate(() => { render(); });
  await p.evaluate(() => document.querySelectorAll('details').forEach(d => { d.open = true; }));
  const L = await p.evaluate(() => [...document.querySelectorAll('.ha-ck-r')].map(r => ({ t: r.querySelector('b').textContent, no: r.classList.contains('no'), btn: (r.querySelector('[data-act="ha-perm"]') || {}).dataset ? r.querySelector('[data-act="ha-perm"]').dataset.t : '' })));
  console.log('     permisos: ' + L.map(x => `${x.t} ${x.no ? '✗' : '✓'}`).join(' · '));
  ok(L.length === 3 && L.map(x => x.t).join('|') === 'Alarmas y recordatorios|Aparecer encima de otras apps|Notificaciones de pantalla completa', 'lista con los 3 permisos');
  ok(!L[0].no && !L[1].no && L[2].no && L[2].btn === 'fullScreen', 'dos listos y "Pantalla completa" con Permitir');
  const el = await p.$('.ha-ck'); if (el && SHOTS) await el.screenshot({ path: path.join(SHOTS, 'b-permisos.png') });
  await p.click('.ha-ck-r.no [data-act="ha-perm"]'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => window.__ha.calls.some(c => c[0] === 'openSettings' && c[1] && c[1].type === 'fullScreen')), 'Permitir abre el ajuste de Android de pantalla completa');
  await p.click('[data-act="ha-test"]'); await p.waitForTimeout(300);
  const T = await p.evaluate(() => ({ c: window.__ha.calls.filter(c => c[0] === 'test').pop(), toast: $('#toast').textContent }));
  ok(T.c && T.c[1].sec === 20, '"Probar" se programa a 20 s (como con la app cerrada), antes 8 s');
  ok(/Sal de Forja o bloquea el celular: en 20 segundos/.test(T.toast), 'y lo explica: ' + T.toast);
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}

console.log('C. Usuario nuevo');
{
  const p = await open(DIR, {});
  await gearCheck(p, 'nuevo');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}

console.log('D. Reloj (en la app): sin cambios');
{
  const ST = { exact: true, overlay: false, fullScreen: false, notif: true, sdk: 35 };
  const p = await open(DIR, { owner: true, watch: true, native: ST });
  const now = await shot(p, 'd-reloj');
  await p.evaluate(() => { state.tab = 'settings'; render(); }); await p.waitForTimeout(300);
  const W = await p.evaluate(() => ({ ck: !!document.querySelector('.ha-ck'), warn: document.querySelectorAll('.ha-set .remind').length }));
  ok(!W.ck && W.warn === 2, 'Ajustes del reloj: los avisos de siempre, sin la lista nueva');
  await p.evaluate(() => document.querySelector('[data-act="ha-test"]').click()); await p.waitForTimeout(300);
  ok(await p.evaluate(() => (window.__ha.calls.filter(c => c[0] === 'test').pop() || [0, {}])[1].sec === 8), '"Probar" en el reloj sigue a 8 s');
  if (OLD) {
    const q = await open(OLD, { owner: true, watch: true, native: ST });
    ok((await shot(q, 'd-reloj-antes')).equals(now), 'inicio del reloj idéntico a la versión anterior');
    await q.evaluate(() => { state.tab = 'settings'; render(); }); await q.waitForTimeout(300);
    const a = await p.evaluate(() => document.getElementById('app').innerHTML), b = await q.evaluate(() => document.getElementById('app').innerHTML);
    ok(a === b, 'Ajustes del reloj idénticos a la versión anterior');
    await q.done();
  }
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}

await browser.close();
console.log(fail ? `\n${fail} FALLAS` : '\nTodo OK');
process.exit(fail ? 1 : 0);
