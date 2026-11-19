// Prueba de la pantalla de entrada y del registro por pasos (registro.js). Nombres y datos inventados.
// Uso (desde PowerShell): $env:PW_DIR = "<carpeta con node_modules/playwright>"; node tests/tregistro.mjs <copia transpilada> [copia anterior] [capturas]
// A. Entrada en una instalación nueva; usar sin cuenta. B. Registro completo (sexo "Prefiero no decirlo", qué te frena,
//    peso meta, compromiso, plan con cambiar ejercicio, cuenta "Ahora no"). C. Cambiar objetivo (modo edición) no pide
//    cuenta ni compromiso. D. Entrar con correo: error claro y entrada correcta. E. Reloj sin cambios.
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

/* Cuentas de mentira: contraseña correcta = "clave-de-prueba" */
async function handle(route, st) {
  const q = route.request(), u = new URL(q.url()), m = q.method();
  const json = (s, o) => route.fulfill({ status: s, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(o) });
  if (m === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
  if (u.hostname === 'identitytoolkit.googleapis.com') {
    let b = {}; try { b = JSON.parse(q.postData() || '{}'); } catch (e) {}
    if (b.password && b.password !== 'clave-de-prueba') return json(400, { error: { message: 'INVALID_LOGIN_CREDENTIALS' } });
    return json(200, { localId: 'u1', email: b.email, idToken: 't', refreshToken: 'r', expiresIn: '3600' });
  }
  if (u.hostname === 'firestore.googleapis.com') {
    if (m === 'GET') return st.doc ? json(200, { fields: { data: { stringValue: st.doc } }, updateTime: 't' }) : json(404, { error: { status: 'NOT_FOUND' } });
    let b = {}; try { b = JSON.parse(q.postData() || '{}'); } catch (e) {}
    if (b.fields && b.fields.data) st.doc = b.fields.data.stringValue;
    return json(200, { fields: b.fields || {}, updateTime: 't2' });
  }
  return route.abort();
}
async function open({ watch, doc, settings } = {}) {
  const srv = await serve(DIR), st = { doc: doc ? JSON.stringify(doc) : null };
  const ctx = await browser.newContext({ viewport: watch ? { width: 410, height: 500 } : { width: 390, height: 844 }, hasTouch: true });
  await ctx.route(/googleapis\.com/, r => handle(r, st));
  await ctx.route(/gstatic|google\.com|firebase|github/, r => r.abort());
  const p = await ctx.newPage(); p.errs = []; p.st = st;
  p.on('pageerror', e => p.errs.push(e.message));
  await p.clock.setFixedTime(new Date('2026-11-19T11:00:00'));
  if (settings) await p.addInitScript(o => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('cdh.settings', JSON.stringify(o)); localStorage.setItem('cdh.newsSeen', '"n6"'); } }, settings);
  await p.goto(`http://127.0.0.1:${srv.address().port}/index.html`); await p.waitForTimeout(1800);
  p.done = async () => { await ctx.close(); srv.close(); };
  return p;
}
const shot = async (p, n) => { if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); fs.writeFileSync(path.join(SHOTS, n + '.png'), await p.screenshot({ animations: 'disabled' })); } };
const cur = p => p.evaluate(() => rgCur());
const next = async p => { await p.click('#onb [data-pb="next"]'); await p.waitForTimeout(150); };

console.log('A. Pantalla de entrada');
{
  const p = await open(); await shot(p, 'a1-entrada');
  const A = await p.evaluate(() => ({ ent: !!document.getElementById('ent'), onb: !!document.getElementById('onb'), slides: document.querySelectorAll('.en-slide').length, txt: document.getElementById('ent').textContent }));
  ok(A.ent && !A.onb && A.slides === 3, 'instalación nueva: entrada con 3 tarjetas (sin la bienvenida encima)');
  ok(/Empezar/.test(A.txt) && /Continuar con correo/.test(A.txt) && /Inicia sesión/.test(A.txt) && /Usar sin cuenta/.test(A.txt) && /Política de privacidad/.test(A.txt), 'botones: Empezar, correo, Inicia sesión, usar sin cuenta y enlaces legales');
  ok(!/reseña|estrellas|oferta|descuento|\d+ ?% de (usuarios|personas)/i.test(A.txt), 'sin reseñas, ofertas ni cifras inventadas');
  await p.click('[data-en="skip"]'); await p.waitForTimeout(400);
  ok(await p.evaluate(() => !document.getElementById('ent') && !document.getElementById('onb') && state.settings.onb === 1 && state.plans.length > 0), 'Usar sin cuenta: entra a la app con un plan de inicio');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}

console.log('B. Registro completo');
{
  const p = await open();
  await p.click('[data-en="start"]'); await p.waitForTimeout(300);
  ok(await cur(p) === 'name', 'Empezar abre el primer paso (nombre)');
  await p.fill('#pb-name', 'Ana Prueba'); await next(p);
  ok(await cur(p) === 'sex' && await p.evaluate(() => document.querySelector('#onb [data-pb="next"]').disabled), 'sexo: sin elegir no se puede seguir');
  ok(await p.evaluate(() => /Prefiero no decirlo/.test(document.getElementById('onb').textContent)), 'tiene "Prefiero no decirlo"');
  await p.click('[data-k="sex"][data-v="x"]'); await next(p);
  await p.click('[data-k="goal"][data-v="grasa"]'); await next(p);
  ok(await cur(p) === 'block', 'qué te frena (opcional)');
  await p.click('[data-rg="block"][data-v="time"]'); await p.click('[data-rg="block"][data-v="know"]'); await next(p);
  await p.click('[data-k="exp"][data-v="0"]'); await next(p);
  ok(await cur(p) === 'data' && await p.evaluate(() => !/Sexo \(para/.test(document.getElementById('onb').textContent) && !!document.getElementById('rg-kgr')), 'tus datos: sin el sexo repetido y con el peso deslizable');
  await p.fill('#pb-age', '28'); await p.fill('#pb-cm', '1,62'); await p.fill('#pb-kg', '80'); await next(p);
  ok(await cur(p) === 'meta', 'perder grasa: pregunta el peso meta');
  const M = await p.evaluate(() => document.getElementById('rg-meta-card').textContent);
  ok(/76 kg|−4 kg/.test(M) && /semanas/.test(M) && /estimación/.test(M), 'tarjeta del peso meta con semanas estimadas y sin promesas: ' + M.trim().slice(0, 90));
  await p.click('[data-rg="meta"][data-v="-0.5"]');
  ok(await p.evaluate(() => pb.o.goalKg === 75.5), 'botón −0,5');
  await next(p);
  ok(await cur(p) === 'days' && await p.evaluate(() => pb.o.mins === 45), 'con "falta de tiempo" propone sesiones de 45 min');
  await next(p); await next(p); await next(p);
  ok(await cur(p) === 'health', 'cuestionario de salud');
  await p.click('[data-pb="consent"]'); await next(p);
  ok(await cur(p) === 'commit', 'compromiso (opcional)');
  const bx = await (await p.$('#rg-hold')).boundingBox(); await p.mouse.move(bx.x + 40, bx.y + 40); await p.mouse.down(); await p.waitForTimeout(1400); await p.mouse.up(); await p.waitForTimeout(150);
  ok(await p.evaluate(() => pb.o.commit === true), 'mantener presionado marca el compromiso');
  await next(p);
  ok(await cur(p) === 'plan', 'plan inicial'); await shot(p, 'b1-plan');
  const before = await p.evaluate(() => pb.plan.days[0].exercises[0].name);
  await p.click('[data-rg="swap"][data-i="0"]');
  const after = await p.evaluate(() => pb.plan.days[0].exercises[0].name);
  ok(before !== after, 'cambiar ejercicio: ' + before + ' → ' + after);
  ok(await p.evaluate(() => !/undefined/.test(document.getElementById('onb').textContent) && /Prefiero crear mi rutina/.test(document.getElementById('onb').textContent)), 'series × reps correctas y opción "Prefiero crear mi rutina"');
  await p.click('[data-rg="after"][data-v="week"]'); await p.waitForTimeout(200);
  ok(await cur(p) === 'account', 'después del plan: guardar tu progreso con una cuenta');
  await p.click('[data-rg="skip"]'); await p.waitForTimeout(500);
  const R = await p.evaluate(() => ({ prof: state.settings.prof, tab: state.tab, onb: !!document.getElementById('onb'), first: state.plans.find(x => x.id === state.settings.activePlanId).days[0].exercises[0].name, sex: body().sex }));
  ok(!R.onb && R.tab === 'plans' && R.prof.name === 'Ana Prueba' && R.prof.sex === 'x' && R.sex === 'x' && R.prof.cm === 162 && R.prof.kg === 80, 'Ahora no: termina, guarda el perfil y abre Rutinas');
  ok(R.prof.goalKg === 75.5 && R.prof.block.join() === 'time,know' && R.prof.commit && R.prof.commit.days === 3 && R.first === after, 'guarda peso meta, lo que te frena, el compromiso y el ejercicio cambiado');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}

console.log('C. Cambiar objetivo (modo edición)');
{
  const p = await open({ settings: { pub: 1, onb: 1, healthOk: 1, prof: { name: 'Ana Prueba', goal: 'salud', exp: 1, days: 3, mins: 60, equip: 'home', age: 30, sex: 'f', cm: 160, kg: 60 } } });
  await p.evaluate(() => pbStart(1, true)); await p.waitForTimeout(200);
  const L = await p.evaluate(() => rgSteps());
  ok(await cur(p) === 'goal' && !L.includes('account') && !L.includes('commit') && !L.includes('block'), 'empieza en el objetivo y no pide cuenta, compromiso ni qué te frena: ' + L.join(','));
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}

console.log('D. Entrar con correo desde la entrada');
{
  const doc = { app: 'forja', v: 1, profile: { stamp: 5, ts: { owner: 1000, prof: 1000 }, settings: { owner: 1, prof: { name: 'Dueña Prueba' } } }, sessions: [{ id: 'nube-1', date: '2026-11-10T10:00:00.000Z', exercises: [] }], daily: {}, tomb: {} };
  const p = await open({ doc });
  await p.click('[data-en="mail"]'); await p.waitForTimeout(150);
  await p.fill('#en-mail', 'prueba@example.com'); await p.fill('#en-pass', 'mala-clave'); await p.click('#en-form [type="submit"]'); await p.waitForTimeout(700); await shot(p, 'd1-error');
  ok(await p.evaluate(() => /Correo o contraseña incorrectos/.test(document.getElementById('ent').textContent) && document.getElementById('en-mail').value === 'prueba@example.com'), 'contraseña mala: mensaje claro y el correo sigue escrito');
  await p.click('[data-en="eye"]');
  ok(await p.evaluate(() => document.getElementById('en-pass').type === 'text'), 'el ojo muestra la contraseña');
  await p.evaluate(() => { window.__t = []; const t0 = toast; toast = function (m) { __t.push(String(m)); return t0.apply(this, arguments); }; });
  await p.fill('#en-pass', 'clave-de-prueba'); await p.click('#en-form [type="submit"]'); await p.waitForTimeout(1500);
  const R = await p.evaluate(() => ({ ent: !!document.getElementById('ent'), onb: !!document.getElementById('onb'), tab: state.tab, ses: state.sessions.map(s => s.id), name: HISTORY.name, owner: !pubUser(), t: (window.__t || []).join(' | ') }));
  ok(!R.ent && !R.onb && R.tab === 'train' && R.ses.includes('nube-1') && R.owner && R.name === 'Dueña Prueba', 'entra, trae los datos de la cuenta y va a Hoy');
  ok(/Hola de nuevo, Dueña Prueba/.test(R.t), 'saluda con el nombre: ' + R.t);
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}

console.log('E. Reloj');
{
  const p = await open({ watch: true });
  ok(await p.evaluate(() => isWatch() && !document.getElementById('ent')), 'reloj: sin pantalla de entrada');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}

await browser.close();
console.log(fail ? `\n${fail} FALLAS` : '\nTodo OK');
process.exit(fail ? 1 : 0);
