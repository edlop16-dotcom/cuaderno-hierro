import { OWNER_SETTINGS, seedOwner } from './owner-fixture.mjs';
// Prueba de los recordatorios de hábitos a la hora real (habalarm.js + stats.js), con Playwright y Edge.
// Uso (desde PowerShell): $env:PW_DIR = "<carpeta con node_modules/playwright>"; node tests/thal.mjs <copia transpilada> [copia transpilada anterior] [capturas]
// La parte nativa (HabitAlarms.java: ventana de 1 px para abrir la pantalla completa con la app cerrada) no se puede
// probar aquí: la compila android-beta.yml. Aquí: rueda de ajustes en "Hábitos de hoy" (lleva a Recordatorios),
// lista de permisos con ✓ / Permitir (plugin simulado), "Probar" a 20 s en el teléfono y reloj sin cambios.
// Desde el 16-oct-2026 (v1.0.48): Agua y los demás también en pantalla completa (dueño por defecto, opción por
// recordatorio), ✓ de agua = +250 ml (en la app y desde la pantalla nativa), "Últimos avisos" con el motivo y reloj igual.
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
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL === 'chromium' ? undefined : 'msedge', headless: process.env.PW_CHANNEL === 'chromium', args: ['--headless=new'] });

/* Capacitor nativo simulado con solo el plugin HabitAlarm (anota las llamadas en window.__ha) */
const NATIVE = cfg => {
  const st = cfg.st || cfg, log = cfg.log || [], events = cfg.events || [];
  window.__ha = { calls: [] };
  const rec = n => o => { window.__ha.calls.push([n, o || null]); return Promise.resolve(n === 'status' ? st : n === 'takeEvents' ? { events: n === 'takeEvents' && !window.__ha.took ? (window.__ha.took = 1, events) : [] } : n === 'log' ? { log } : {}); };
  window.Capacitor = { isNativePlatform: () => true, Plugins: { HabitAlarm: { schedule: rec('schedule'), takeEvents: rec('takeEvents'), dismiss: rec('dismiss'), status: rec('status'), openSettings: rec('openSettings'), test: rec('test'), log: rec('log') } } };
};
async function open(dir, { owner, watch, native } = {}) {
  const srv = await serve(dir);
  const ctx = await browser.newContext(watch ? { viewport: { width: 410, height: 500 }, hasTouch: true } : { viewport: { width: 390, height: 844 }, hasTouch: true });
  await ctx.route(/googleapis|gstatic|google\.com|firebase|github/, r => r.abort());
  const p = await ctx.newPage(); p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message));
  await p.clock.setFixedTime(new Date('2026-10-19T08:00:30'));
  if (native) await p.addInitScript(NATIVE, native);
  /* dueño: inyecta {owner:1}; usuario nuevo: instalación nueva de verdad (sin cdh.settings, la app lo marca como público) */
  await seedOwner(p, owner ? OWNER_SETTINGS : null);
  await p.addInitScript(o => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); if (o.owner && !localStorage.getItem('cdh.settings')) localStorage.setItem('cdh.settings', JSON.stringify(o.settings)); localStorage.setItem('cdh.newsSeen', '"n5"'); } }, { owner, settings: OWNER_SETTINGS });
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
  /* Tanda F: la rueda abre "Tus hábitos" (con ⚙ por hábito) y desde ahí "Ajustes de los recordatorios" */
  await p.click('#habits [data-act="hab-rem"]'); await p.waitForTimeout(300);
  ok(await p.locator('#sheet [data-hf="open"]').count() > 0, `${who}: abre "Tus hábitos" con ⚙ por hábito`);
  await p.click('#sheet [data-hf="remset"]'); await p.waitForTimeout(900);
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

const ALL_OK = { exact: true, overlay: true, fullScreen: true, notif: true, sdk: 35 };
const lastSched = p => p.evaluate(async () => { state.notifPerm = 'granted'; await scheduleAll(); const c = window.__ha.calls.filter(x => x[0] === 'schedule').pop(); return c ? c[1].items : null; });

console.log('E. Dueño en la app: Agua también en pantalla completa (antes solo notificación)');
{
  const p = await open(DIR, { owner: true, native: ALL_OK });
  const items = await lastSched(p);
  const water = items.filter(x => x.kind === 'water'), hab = items.filter(x => x.kind === 'hab');
  console.log(`     avisos programados: ${items.length} (agua ${water.length}, hábitos ${hab.length})`);
  ok(water.length > 0 && water.every(x => x.title === 'Agua' && x.ok === '+250 ml de agua 💧' && !x.habit), 'Agua va por la pantalla completa, con ✓ = +250 ml');
  ok(hab.some(x => x.habit === 'crea'), 'la creatina sigue en pantalla completa');
  ok(await p.evaluate(() => { const r = state.reminders.find(x => x.kind === 'water'), at = new Date(Date.now() + 864e5); return remSkip(r, 1, at); }), 'y ya no se programa también como notificación normal');
  await p.evaluate(() => { state.tab = 'settings'; render(); document.querySelectorAll('details').forEach(d => { d.open = true; }); });
  const S = await p.evaluate(() => ({ tags: [...document.querySelectorAll('.remrow')].map(r => (r.querySelector('.grow > div') || {}).textContent + '|' + !!r.querySelector('.rem-fs')), t1: !!document.querySelector('[data-act="n-test"]') && document.querySelector('[data-act="n-test"]').textContent, t2: document.querySelector('[data-act="ha-test"]').textContent, txt: document.getElementById('app').textContent.includes('Los que dicen «Pantalla completa» aparecen en toda la pantalla') }));
  console.log('     lista: ' + S.tags.join(' · '));
  ok(S.tags.filter(x => /^Agua\|true$/.test(x)).length === 3, 'en Ajustes los 3 de Agua dicen "Pantalla completa"');
  ok(S.t2 === 'Probar pantalla completa' && S.txt, 'botón "Probar pantalla completa" y el texto explica cuáles salen en toda la pantalla');
  if (SHOTS) { const el = await p.$('.remrow'); if (el) await (await el.evaluateHandle(e => e.closest('.card'))).asElement().screenshot({ path: path.join(SHOTS, 'e-recordatorios.png') }); }
  // apagar la pantalla completa de un recordatorio de Agua
  const wi = await p.evaluate(() => state.reminders.findIndex(x => x.kind === 'water'));
  await p.click(`[data-act="r-edit"][data-i="${wi}"]`); await p.waitForSelector('#rm-fs');
  ok(await p.evaluate(() => document.getElementById('rm-fs').checked), 'en Editar, "Aparecer en toda la pantalla" viene marcado');
  if (SHOTS) await p.screenshot({ path: path.join(SHOTS, 'e-editar.png') });
  await p.click('#rm-fs'); await p.click('#f-rem button[type="submit"]'); await p.waitForTimeout(300);
  const R = await p.evaluate(i => state.reminders[i], wi);
  ok(R.fs === false, 'al desmarcarlo se guarda (fs: false)');
  const items2 = await lastSched(p);
  ok(!items2.some(x => x.id >= 3000 + wi * 20 && x.id < 3000 + wi * 20 + 14), 'ese ya no va a pantalla completa');
  ok(await p.evaluate(i => { const at = new Date(Date.now() + 864e5); return !remSkip(state.reminders[i], 1, at); }, wi), 'y vuelve a llegar como notificación normal');
  // si ya tomaste 2,5 L, hoy no suena
  await p.evaluate(() => { const t = today(); t.water = 3000; saveDaily(); });
  const items3 = await lastSched(p);
  ok(!items3.some(x => x.kind === 'water' && x.day === '2026-10-19') && items3.some(x => x.kind === 'water'), 'con 2,5 L ya tomados hoy no suena, mañana sí');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}

console.log('F. Con la app abierta a las 11:00 (web): Agua en pantalla completa y ✓ suma 250 ml');
{
  const p = await open(DIR, { owner: true });
  await p.clock.setFixedTime(new Date('2026-10-19T11:00:20'));
  const w0 = await p.evaluate(() => today().water || 0);
  await p.evaluate(() => haCheck()); await p.waitForTimeout(200);
  const A = await p.evaluate(() => { const el = document.getElementById('hab-alarm'); return el && !el.hidden ? el.querySelector('.ha-title').textContent : ''; });
  ok(A === 'Agua', 'aparece "Agua" en toda la pantalla dentro de la app');
  if (SHOTS) await p.screenshot({ path: path.join(SHOTS, 'f-agua.png') });
  await p.click('#hab-alarm [data-act="ha-yes"]'); await p.waitForTimeout(200);
  const w1 = await p.evaluate(() => today().water || 0), t = await p.evaluate(() => $('#toast').textContent);
  ok(w1 === w0 + 250 && /\+250 ml de agua/.test(t), `✓ suma un vaso (${w0} → ${w1} ml) y lo dice`);
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}

console.log('G. ✓ tocado en la pantalla nativa con la app cerrada (agua y hábito)');
{
  const day = '2026-10-19';
  const p = await open(DIR, { owner: true, native: { st: ALL_OK, events: [{ habit: '', kind: 'water', water: 250, day, at: 1 }, { habit: 'crea', kind: 'hab', day, at: 2 }] } });
  const T = await p.evaluate(d => ({ w: (state.daily[d] || {}).water || 0, c: !!(state.daily[d] || {}).crea, toast: $('#toast').textContent }), day);
  ok(T.w >= 250 && T.c, `al abrir la app: +250 ml de agua y creatina marcada (agua ${T.w} ml)`);
  ok(/Creatina/.test(T.toast) && /\+250 ml de agua/.test(T.toast), 'y lo avisa: ' + T.toast);
  await p.done();
}

console.log('H. Últimos avisos: qué pasó y por qué');
{
  const T = new Date('2026-10-19T08:00:30').getTime(), H = 3600e3;
  const log = [
    { id: 3060, title: 'Agua', kind: 'water', at: T - 22 * H, fired: T - 22 * H + 600000, on: true, locked: false, over: true, fsi: true, exact: false, res: 'act' },
    { id: 3041, title: 'Agua', kind: 'water', at: T - 17 * H, fired: T - 17 * H + 2000, on: true, locked: false, over: true, fsi: true, exact: true, res: 'act' },
    { id: 3021, title: 'Agua', kind: 'water', at: T - 13 * H, fired: T - 13 * H + 2000, on: true, locked: false, over: false, fsi: true, exact: true, res: 'notif' },
    { id: 3000, title: 'Toma tu creatina (5 g)', kind: 'hab', at: T - 30000, fired: T - 28000, on: false, locked: true, over: false, fsi: false, exact: true, res: 'notif' },
  ];
  const p = await open(DIR, { owner: true, native: { st: { exact: false, overlay: false, fullScreen: false, notif: true, sdk: 35 }, log } });
  await p.waitForTimeout(600);
  await p.evaluate(() => { state.tab = 'settings'; render(); document.querySelectorAll('details').forEach(d => { d.open = true; }); });
  const L = await p.evaluate(() => [...document.querySelectorAll('.ha-log-r')].map(r => ({ b: r.querySelector('b').textContent, s: r.querySelector('small').textContent, ok: r.classList.contains('ok'), fix: (r.querySelector('[data-act="ha-perm"]') || { dataset: {} }).dataset.t || '' })));
  L.forEach(x => console.log(`     ${x.ok ? '✓' : '!'} ${x.b} — ${x.s}${x.fix ? ' [Permitir ' + x.fix + ']' : ''}`));
  ok(L.length === 4, 'muestra los 4 avisos, el más nuevo arriba');
  ok(L[0].b === 'Hoy 08:00 · Toma tu creatina (5 g)' && /bloqueado y falta «Notificaciones de pantalla completa»/.test(L[0].s) && L[0].fix === 'fullScreen', 'creatina: bloqueado sin "pantalla completa" → Permitir');
  ok(/en uso Android solo la muestra arriba; falta «Aparecer encima/.test(L[1].s) && L[1].fix === 'overlay', 'agua de las 19:00: en uso sin "Aparecer encima" → Permitir');
  ok(L[2].ok && L[2].s === 'Apareció en toda la pantalla', 'agua de las 15:00: apareció ✓');
  ok(L[3].ok && /llegó 10 min tarde: falta «Alarmas y recordatorios»/.test(L[3].s) && L[3].fix === 'exact', 'agua de ayer: llegó 10 min tarde → Permitir "Alarmas y recordatorios"');
  if (SHOTS) { const el = await p.$('.ha-log'); if (el) await el.screenshot({ path: path.join(SHOTS, 'h-ultimos-avisos.png') }); }
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}

console.log('I. Usuario nuevo en la app: Agua sigue como notificación (puede elegir pantalla completa)');
{
  const p = await open(DIR, { native: ALL_OK });
  const items = await lastSched(p);
  ok(!items.some(x => x.kind === 'water'), 'por defecto el agua no va a pantalla completa');
  await p.evaluate(() => { state.tab = 'settings'; render(); document.querySelectorAll('details').forEach(d => { d.open = true; }); });
  await p.click('[data-act="r-new"]'); await p.waitForSelector('#rm-fs');
  const f0 = await p.evaluate(() => document.getElementById('rm-fs').checked);
  await p.selectOption('#rm-kind', 'hab'); const f1 = await p.evaluate(() => document.getElementById('rm-fs').checked);
  await p.selectOption('#rm-kind', 'water'); const f2 = await p.evaluate(() => document.getElementById('rm-fs').checked);
  ok(!f0 && f1 && !f2, 'en Nuevo: sin marcar; al elegir Hábito se marca; al volver a Agua se desmarca');
  await p.click('#rm-fs'); await p.selectOption('#rm-kind', 'custom');
  ok(await p.evaluate(() => document.getElementById('rm-fs').checked), 'si lo marcas a mano, se respeta al cambiar de tipo');
  await p.fill('#rm-label', 'Estirar'); await p.click('#f-rem button[type="submit"]'); await p.waitForTimeout(300);
  const items2 = await lastSched(p);
  ok(items2.some(x => x.kind === 'custom' && x.title === 'Estirar' && x.ok === 'Listo ✓'), 'el nuevo "Estirar" va a pantalla completa');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}

console.log('J. Reloj: el agua sigue como notificación');
{
  const p = await open(DIR, { owner: true, watch: true, native: ALL_OK });
  const items = await lastSched(p);
  ok(!items.some(x => x.kind === 'water') && items.some(x => x.kind === 'hab'), 'en el reloj solo los hábitos van a pantalla completa, como antes');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}

await browser.close();
console.log(fail ? `\n${fail} FALLAS` : '\nTodo OK');
process.exit(fail ? 1 : 0);
