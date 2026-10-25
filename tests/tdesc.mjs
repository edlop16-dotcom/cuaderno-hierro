import { OWNER_SETTINGS, seedOwner } from './owner-fixture.mjs';
// Prueba de la tanda I2 (descanso.js): fin del descanso a pantalla completa con el celular apagado.
// Uso (desde PowerShell): $env:PW_DIR = "<carpeta con node_modules/playwright>"; node tests/tdesc.mjs <copia transpilada> <copia transpilada anterior> [capturas]
// La parte nativa (HabitAlarms.showRest: encender la pantalla, HabitAlarmActivity con "Descanso terminado") no corre en el
// navegador: aquí se simula el plugin HabitAlarm y se comprueba lo que la app le pide (rest / restCancel / openSettings).
// A. Dueño: al quedar en segundo plano durante un descanso se programa con la hora de fin, qué sigue y el sonido; al volver
//    se cancela; sin descanso, ya terminado o apagado en Ajustes no se programa; "Sin sonido" → sin ding.
// B. Ajustes → Fin del descanso: interruptor (activado por defecto) y permisos que faltan. "No bloquear la pantalla" igual.
// C. Usuario nuevo. D. Web sin la app instalada. E. Reloj: no programa nada y Ajustes/sesión idénticos a la versión anterior.
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

/* Capacitor nativo simulado con el plugin HabitAlarm (anota las llamadas en window.__ha) */
const NATIVE = st => {
  window.__ha = { calls: [] };
  const rec = n => o => { window.__ha.calls.push([n, o || null]); return Promise.resolve(n === 'status' ? st : n === 'takeEvents' ? { events: [] } : n === 'log' ? { log: [] } : {}); };
  const H = {}; ['schedule', 'takeEvents', 'dismiss', 'status', 'openSettings', 'test', 'log', 'rest', 'restCancel'].forEach(n => { H[n] = rec(n); });
  window.Capacitor = { isNativePlatform: () => true, Plugins: { HabitAlarm: H } };
};
async function open(dir, { seed, watch, native } = {}) {
  const srv = await serve(dir);
  const ctx = await browser.newContext(watch ? { viewport: { width: 410, height: 500 }, hasTouch: true } : { viewport: { width: 390, height: 844 }, hasTouch: true });
  await ctx.route(/googleapis|gstatic|google\.com|firebase|github/, r => r.abort());
  const p = await ctx.newPage(); p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message));
  await p.clock.setFixedTime(new Date('2026-10-19T10:30:30'));
  if (native) await p.addInitScript(NATIVE, native);
  await seedOwner(p, seed);
  await p.addInitScript(o => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); if (o) localStorage.setItem('cdh.settings', JSON.stringify(o)); localStorage.setItem('cdh.newsSeen', '"n6"'); localStorage.setItem('cdh.reminders', '[]'); } }, seed || null);
  await p.goto(`http://127.0.0.1:${srv.address().port}/index.html`); await p.waitForTimeout(2000);
  await p.evaluate(() => { if (state.settings.pub) { state.settings.onb = 1; if (typeof pbClose === 'function') pbClose(); } state.settings.healthOk = 1; LS.set('newsSeen', NEWS_KEY); savePlans(); closeSheet(); render(); });
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
const ST = { exact: false, fullScreen: false, notif: true, overlay: false, sdk: 35 };
const calls = (p, n) => p.evaluate(n => window.__ha.calls.filter(c => c[0] === n).map(c => c[1]), n);
const clearCalls = p => p.evaluate(() => { window.__ha.calls = []; });
/* Pantalla apagada / encendida: la app ve "hidden" / "visible" (como cuando Android pausa el WebView) */
const vis = (p, v) => p.evaluate(v => { Object.defineProperty(document, 'visibilityState', { value: v, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); }, v);
/* Empieza el lunes con el plan y marca la primera serie: arranca el descanso */
const startRest = p => p.evaluate(() => { const pl = activePlan(); state.settings.nextS = { 'p1-lun': { pick: 'plan' } }; startSession(pl.id, 'p1-lun'); markSet(0, 0, true); return state.rest ? { end: state.rest.end, ex: state.draft.exercises[0].name, n: state.draft.exercises[0].log.length } : null; });
const openSettings = p => p.evaluate(() => { closeSheet(); state.tab = 'settings'; render(); document.querySelectorAll('details').forEach(d => { d.open = true; }); });

console.log('A. Dueño: fin del descanso con la pantalla apagada');
{
  const p = await open(DIR, { seed: OWNER_SETTINGS, native: ST });
  const R = await startRest(p); await p.waitForTimeout(300); await clearCalls(p);
  ok(R && R.end > Date.parse('2026-10-19T10:30:30'), 'al marcar la serie empieza el descanso');
  await vis(p, 'hidden'); await p.waitForTimeout(200);
  let c = await calls(p, 'rest');
  ok(c.length === 1 && c[0].at === R.end && c[0].title === 'Descanso terminado' && c[0].body === `Sigue: ${R.ex} · serie 2 de ${R.n}` && c[0].snd === true && c[0].vib === true, 'al apagarse la pantalla: se programa "Descanso terminado" a la hora de fin, con qué sigue y sonido');
  await vis(p, 'visible'); await p.waitForTimeout(200);
  /* Tanda J: el aviso sigue al descanso (se reprograma con cada cambio y se cancela al terminar o saltar); volver a la app no lo toca */
  ok(!(await calls(p, 'restCancel')).length && (await calls(p, 'rest')).length === 1, 'al volver a la app sigue programado a la misma hora (sin cambios)');
  /* "Sin sonido" en Fin del descanso: sin ding (vibra si la vibración está activa) */
  await clearCalls(p); await p.evaluate(() => { state.settings.alert = Object.assign({}, state.settings.alert, { sound: 'silencio', vib: 0 }); });
  await vis(p, 'hidden'); c = await calls(p, 'rest'); await vis(p, 'visible');
  ok(c.length === 1 && c[0].snd === false && c[0].vib === false, '"Sin sonido" y "No vibrar" se respetan');
  /* Descanso ya terminado o sin descanso: nada */
  await clearCalls(p); await p.evaluate(() => { state.rest.rang = true; });
  await vis(p, 'hidden'); await vis(p, 'visible');
  ok(!(await calls(p, 'rest')).length, 'si el descanso ya terminó, no se programa');
  await clearCalls(p); await p.evaluate(() => { state.rest = null; });
  await vis(p, 'hidden'); await vis(p, 'visible');
  ok(!(await calls(p, 'rest')).length, 'sin descanso en marcha, no se programa');
  /* Apagado en Ajustes */
  await p.evaluate(() => { markSet(0, 1, true); state.settings.restFull = false; }); await clearCalls(p);
  await vis(p, 'hidden'); await vis(p, 'visible');
  ok(!(await calls(p, 'rest')).length && await p.evaluate(() => rfAt === 0), 'desactivado en Ajustes: no se programa (solo el aviso normal) y se cancela lo que había');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}

console.log('B. Ajustes → Fin del descanso');
{
  const p = await open(DIR, { seed: OWNER_SETTINGS, native: ST });
  await openSettings(p); await p.waitForTimeout(400); await openSettings(p); await p.waitForTimeout(300);
  const S = await p.evaluate(() => { const r = document.querySelector('.rf-row'), card = r && r.closest('.card'), sw = r && r.querySelector('[data-rf="tog"]'); return r ? { card: card.querySelector('h3').textContent, on: sw.getAttribute('aria-checked'), perm: [...document.querySelectorAll('[data-rf="perm"]')].map(b => b.dataset.t), awake: [...document.querySelectorAll('#awake-mode option')].map(o => o.value).join(','), sel: (document.querySelector('#awake-mode') || {}).value } : null; });
  await p.evaluate(() => { const r = document.querySelector('.rf-row'); if (r) r.scrollIntoView({ block: 'center' }); }); await shot(p, 'b1-ajustes-fin-descanso');
  ok(S && S.card === 'Fin del descanso' && S.on === 'true', 'interruptor en "Fin del descanso", activado por defecto');
  ok(S && S.perm.join() === 'fullScreen,exact', 'sin permisos: botones para pantalla completa y alarmas exactas');
  ok(S && S.awake === 'app,train,off' && S.sel === 'app', '"No bloquear la pantalla" sigue igual (sin interruptor nuevo)');
  await p.click('[data-rf="perm"][data-t="fullScreen"]');
  ok((await calls(p, 'openSettings')).some(o => o && o.type === 'fullScreen'), '"Permitir pantalla completa" abre el ajuste de Android');
  await p.click('[data-rf="tog"]'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => state.settings.restFull === false && document.querySelector('[data-rf="tog"]').getAttribute('aria-checked') === 'false' && !document.querySelector('[data-rf="perm"]')), 'se puede desactivar (y se guarda)');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}
{
  const p = await open(DIR, { seed: OWNER_SETTINGS, native: Object.assign({}, ST, { exact: true, fullScreen: true }) });
  await openSettings(p); await p.waitForTimeout(400);
  ok(await p.evaluate(() => !!document.querySelector('.rf-row') && !document.querySelector('[data-rf="perm"]')), 'con los permisos dados no pide nada');
  await p.done();
}

console.log('C. Usuario nuevo');
{
  const p = await open(DIR, { native: ST });
  const R = await p.evaluate(() => { const pl = activePlan(), d = nextDay(pl) || pl.days[0]; state.settings.nextS = { [d.id]: { pick: 'plan' } }; startSession(pl.id, d.id); markSet(0, 0, true); return !!state.rest; });
  await clearCalls(p); await vis(p, 'hidden'); await vis(p, 'visible');
  ok(R && (await calls(p, 'rest')).length === 1, 'también está activado por defecto');
  await openSettings(p); await p.waitForTimeout(300);
  ok(await p.evaluate(() => !!document.querySelector('.rf-row')), 'y sale en sus Ajustes');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}

console.log('D. Web (sin la app instalada)');
{
  const p = await open(DIR, { seed: OWNER_SETTINGS });
  await startRest(p); await vis(p, 'hidden'); await vis(p, 'visible');
  await openSettings(p); await p.waitForTimeout(300);
  ok(await p.evaluate(() => /Funciona en la app instalada en Android/.test(document.querySelector('.rf-row').parentElement.textContent)), 'en la web lo dice y no falla');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}

console.log('E. Reloj');
{
  const p = await open(DIR, { seed: OWNER_SETTINGS, watch: true, native: ST }), q = await open(OLD, { seed: OWNER_SETTINGS, watch: true, native: ST });
  for (const x of [p, q]) { await x.evaluate(() => { state.tab = 'settings'; render(); window.scrollTo(0, 0); }); await x.waitForTimeout(300); }
  ok(await p.evaluate(() => { const r = document.querySelector('.wov-row'); if (r) r.remove(); return !!r; }), 'Ajustes del reloj: "Avisar si me paso del tiempo" (Tanda J)');
  let d = await pixDiff(await shot(p, 'e1-reloj-ajustes'), await shot(q, 'e1-reloj-ajustes-antes'));
  ok(d === 0 && await p.evaluate(() => !document.querySelector('.rf-row')), 'Ajustes del reloj idénticos y sin el interruptor' + (d ? ` (${d} px)` : ''));
  for (const x of [p, q]) { await x.evaluate(() => { state.tab = 'train'; render(); }); await startRest(x); await x.waitForTimeout(500); }
  d = await pixDiff(await shot(p, 'e2-reloj-descanso'), await shot(q, 'e2-reloj-descanso-antes'));
  ok(d === 0, 'descanso del reloj idéntico' + (d ? ` (${d} px)` : ''));
  await clearCalls(p); await vis(p, 'hidden'); await vis(p, 'visible');
  ok(!(await calls(p, 'rest')).length, 'en el reloj no se programa nada');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done(); await q.done();
}

await browser.close();
console.log(fail ? `\n${fail} FALLAS` : '\nTodo OK');
process.exit(fail ? 1 : 0);
