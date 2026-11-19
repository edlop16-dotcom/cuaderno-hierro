import { OWNER_SETTINGS, seedOwner } from './owner-fixture.mjs';
// Prueba del inicio de sesión (login.js, sync.js, respaldo.js y pub.js). Cuentas, nombres y datos inventados.
// Uso (desde PowerShell): $env:PW_DIR = "<carpeta con node_modules/playwright>"; node tests/tlogin.mjs <copia transpilada> [copia anterior] [capturas]
// La nube es simulada dentro de la prueba (nada sale a internet).
// A. Primer inicio de sesión desde un teléfono nuevo: el perfil de la bienvenida no pisa ni se sube solo a una cuenta
//    que ya tiene datos; se pregunta (Usar / Descartar). Si la cuenta tiene perfil, gana el de la cuenta. Cuenta nueva: se queda.
// B. Mis finanzas de un respaldo restaurado antes de iniciar sesión: quedan ocultas y aparecen al entrar como dueño.
// C. Cambiar el nombre desde Perfil y desde Tu cuenta (dueño sin perfil: solo se guarda el nombre). Reloj sin cambios.
// D. "Ya tengo cuenta" abre la pantalla de Entrar.
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

/* Nube de mentira: solo accounts/u1 (documento con el campo data en texto) */
function cloud(doc) {
  const C = { doc: doc ? JSON.stringify(doc) : null, log: [] };
  C.get = () => (C.doc ? JSON.parse(C.doc) : null);
  C.handle = async route => {
    const q = route.request(), u = new URL(q.url()), m = q.method();
    const json = (st, o) => route.fulfill({ status: st, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(o) });
    if (m === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
    if (u.hostname === 'identitytoolkit.googleapis.com') { const op = u.pathname.split(':').pop(); C.log.push('auth:' + op); return json(200, { localId: 'u1', email: 'prueba@example.com', idToken: 'ficha-de-prueba', refreshToken: 'r', expiresIn: '3600' }); }
    if (u.hostname === 'securetoken.googleapis.com') return json(200, { user_id: 'u1', id_token: 'ficha-de-prueba', refresh_token: 'r', expires_in: '3600' });
    if (u.hostname !== 'firestore.googleapis.com') return route.abort();
    const p = decodeURIComponent(u.pathname.split('/documents/')[1] || '');
    if (p !== 'accounts/u1') return json(200, {});
    if (m === 'GET') return C.doc ? json(200, { name: 'x/' + p, fields: { data: { stringValue: C.doc } }, updateTime: 't' + C.log.length }) : json(404, { error: { status: 'NOT_FOUND' } });
    let body = {}; try { body = JSON.parse(q.postData() || '{}'); } catch (e) {}
    if (body.fields && body.fields.data) { C.doc = body.fields.data.stringValue; C.log.push('write'); }
    return json(200, { name: 'x/' + p, fields: body.fields || {}, updateTime: 't' + C.log.length });
  };
  return C;
}
/* Cuenta del dueño ya usada: ajustes con owner y, si se pide, su perfil */
const ACC = prof => ({ app: 'forja', v: 1, profile: { stamp: 5, ts: Object.assign({ owner: 1000, unit: 1000 }, prof ? { prof: 1000 } : {}), settings: Object.assign({ owner: 1, unit: 'kg' }, prof ? { prof } : {}) }, sessions: [], daily: {}, tomb: {} });
/* Teléfono recién instalado que ya hizo la bienvenida de prueba */
const FRESH_PUB = { pub: 1, onb: 1, healthOk: 1, consent: { v: 1, at: 1 }, prof: { name: 'Prueba Uno', goal: 'salud', exp: 1, days: 3, mins: 60, equip: 'gym', age: 30, sex: 'm', cm: 170, kg: 70, at: 1 } };
let FIN = '';

async function open(C, { settings, owner, watch, extra, empty } = {}) {
  const srv = await serve(DIR);
  const ctx = await browser.newContext({ viewport: watch ? { width: 410, height: 500 } : { width: 390, height: 844 }, hasTouch: true });
  await ctx.route(/googleapis\.com/, r => C.handle(r));
  await ctx.route(/gstatic|google\.com|firebase|github/, r => r.abort());
  const p = await ctx.newPage(); p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message));
  await p.clock.setFixedTime(new Date('2026-11-19T11:00:00'));
  if (owner) await seedOwner(p, settings);
  if (!empty) await p.addInitScript(([o, x]) => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('cdh.settings', JSON.stringify(o)); localStorage.setItem('cdh.newsSeen', '"n6"'); localStorage.setItem('cdh.reminders', '[]'); Object.keys(x || {}).forEach(k => localStorage.setItem(k, x[k])); } }, [settings, extra]);
  await p.goto(`http://127.0.0.1:${srv.address().port}/index.html`); await p.waitForTimeout(2000);
  p.done = async () => { await ctx.close(); srv.close(); };
  return p;
}
const shot = async (p, n) => { if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); fs.writeFileSync(path.join(SHOTS, n + '.png'), await p.screenshot({ animations: 'disabled' })); } };
const login = async (p, create) => { await p.evaluate(c => { closeSheet(); return account.signIn('prueba@example.com', 'clave-de-prueba', c); }, !!create); await p.waitForTimeout(900); };
const sheetText = p => p.evaluate(() => (document.getElementById('sheet').hidden ? '' : document.getElementById('sheet').textContent));

{ const p = await open(cloud(null), { settings: FRESH_PUB }); FIN = await p.evaluate(() => JSON.stringify(Object.assign(finNew(), { marca: 'finanzas-de-prueba' }))); await p.done(); }
const FIN2 = FIN.replace('finanzas-de-prueba', 'las-de-ahora');

console.log('A. Primer inicio de sesión desde un teléfono nuevo');
{
  const C = cloud(ACC(null)), p = await open(C, { settings: FRESH_PUB });
  ok(await p.evaluate(() => pubUser() && HISTORY.name === 'Prueba Uno'), 'antes de entrar: usuario nuevo con el nombre de la bienvenida');
  await login(p); await shot(p, 'a1-pregunta');
  const R = await p.evaluate(() => ({ prof: state.settings.prof, pub: pubUser(), name: HISTORY.name, ask: LS.get('profAsk', null) }));
  ok(!R.prof && !R.pub && R.name === '' && R.ask && R.ask.name === 'Prueba Uno', 'cuenta del dueño sin perfil: el nombre de prueba ya no se usa y queda aparte para preguntar');
  ok(!(C.get().profile.settings || {}).prof, 'y no se sube a la cuenta');
  const t = await sheetText(p);
  ok(/¿Usar los datos de este teléfono\?/.test(t) && /Prueba Uno/.test(t) && /30 años/.test(t), 'pregunta si usar los datos de la bienvenida: ' + t.slice(0, 120));
  await p.click('#sheet [data-lg="prof-drop"]'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => !LS.get('profAsk', null) && !!document.getElementById('lg-name')), 'Descartar: se borra lo retenido y se abre "Tu nombre"');
  await p.fill('#lg-name', 'Nombre Nuevo'); await p.click('#f-lgname button[type="submit"]'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => JSON.stringify(state.settings.prof) === '{"name":"Nombre Nuevo"}' && HISTORY.name === 'Nombre Nuevo'), 'guarda solo el nombre, sin suponer los demás datos');
  await p.evaluate(() => sync.run()); await p.waitForTimeout(600);
  ok(((C.get().profile.settings || {}).prof || {}).name === 'Nombre Nuevo', 'el nombre nuevo llega a la cuenta');
  await p.reload(); await p.waitForTimeout(1800);
  ok(await p.evaluate(() => document.getElementById('sheet').hidden && HISTORY.name === 'Nombre Nuevo'), 'al volver a abrir no pregunta otra vez');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}
{
  const C = cloud(ACC(null)), p = await open(C, { settings: FRESH_PUB });
  await login(p); await p.click('#sheet [data-lg="prof-use"]'); await p.waitForTimeout(300);
  const R = await p.evaluate(() => ({ prof: state.settings.prof, name: HISTORY.name, ask: LS.get('profAsk', null) }));
  ok(R.prof && R.prof.name === 'Prueba Uno' && R.prof.goal === 'salud' && R.prof.age === 30 && R.name === 'Prueba Uno' && !R.ask, 'Usar estos datos: el perfil de la bienvenida pasa a la cuenta');
  await p.evaluate(() => sync.run()); await p.waitForTimeout(600);
  ok(((C.get().profile.settings || {}).prof || {}).name === 'Prueba Uno', 'y se sube');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}
{
  const C = cloud(ACC({ name: 'Atleta Cuenta', goal: 'fuerza', age: 40 })), p = await open(C, { settings: FRESH_PUB });
  await login(p);
  const R = await p.evaluate(() => ({ prof: state.settings.prof, name: HISTORY.name, ask: LS.get('profAsk', null), sh: document.getElementById('sheet').hidden }));
  ok(R.prof.name === 'Atleta Cuenta' && R.prof.goal === 'fuerza' && R.name === 'Atleta Cuenta' && !R.ask && R.sh, 'cuenta con perfil: gana el de la cuenta y no pregunta nada');
  ok(C.get().profile.settings.prof.name === 'Atleta Cuenta', 'la cuenta conserva su nombre');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}
{
  const C = cloud(null), p = await open(C, { settings: FRESH_PUB });
  await login(p, true);
  const R = await p.evaluate(() => ({ prof: state.settings.prof, ask: LS.get('profAsk', null), sh: document.getElementById('sheet').hidden }));
  ok(R.prof && R.prof.name === 'Prueba Uno' && !R.ask && R.sh && C.get().profile.settings.prof.name === 'Prueba Uno', 'cuenta nueva: se queda el perfil de la bienvenida y se sube, sin preguntar');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}
{
  /* Dueño que cierra sesión y vuelve a entrar en su mismo teléfono: nada cambia */
  const S = Object.assign({}, OWNER_SETTINGS, { prof: { name: 'Dueño Prueba' } });
  const C = cloud(ACC({ name: 'Dueño Prueba' })), p = await open(C, { settings: S, owner: true });
  await login(p);
  ok(await p.evaluate(() => state.settings.prof.name === 'Dueño Prueba' && !LS.get('profAsk', null) && document.getElementById('sheet').hidden), 'dueño que vuelve a entrar en su teléfono: sin preguntas ni cambios');
  await p.done();
}

console.log('B. Mis finanzas de un respaldo restaurado antes de iniciar sesión');
{
  const C = cloud(ACC(null)), p = await open(C, { settings: FRESH_PUB });
  /* Respaldo del dueño, "Agregar lo que falta" en el teléfono nuevo */
  const A = await p.evaluate(async fin => {
    const L = [{ t: 'h', app: RC_APP, v: RC_V, at: '2026-11-18T10:00:00Z', owner: 1, n: { sessions: 0, fin: 1 } }, { t: 'ls', k: 'cdh.fin', v: fin }, { t: 'ls', k: 'cdh.marcaRc', v: '"x"' }];
    L.push({ t: 'end', lines: L.length + 1 });
    const f = new File([L.map(x => JSON.stringify(x)).join('\n') + '\n'], 'r.forja');
    rcHead = await rcCheck(f); rcSheet(rcLocalCounts(0, 0, 0), false);
    const txt = document.getElementById('sheet').textContent;
    await rcApply(f, false, rcHead); closeSheet();
    return { txt, fin: localStorage.getItem('cdh.fin'), pend: localStorage.getItem('cdh.finPend'), marca: localStorage.getItem('cdh.marcaRc'), own: finOwner() };
  }, FIN);
  ok(/Mis finanzas aparecerán cuando inicies sesión/.test(A.txt), 'la hoja de restaurar avisa que Mis finanzas aparecen al iniciar sesión');
  ok(A.fin == null && A.pend === FIN && A.marca === '"x"' && !A.own, '"Agregar lo que falta" sin sesión: Mis finanzas quedan aparte y ocultas (el resto sí se restaura)');
  const bk = await p.evaluate(() => rcKeys().some(k => /^cdh\.fin/.test(k)));
  ok(!bk, 'un respaldo hecho en este teléfono antes de entrar no las lleva');
  await login(p); await p.evaluate(() => { closeSheet(); render(); });
  ok(await p.evaluate(f => finOwner() && localStorage.getItem('cdh.fin') === f && localStorage.getItem('cdh.finPend') == null && fin().marca === 'finanzas-de-prueba', FIN), 'al entrar como dueño aparecen solas en Mis finanzas');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}
{
  /* Otra persona (cuenta sin owner) no las ve nunca */
  const C = cloud(null), p = await open(C, { settings: FRESH_PUB, extra: { 'cdh.finPend': FIN } });
  await login(p, true); await p.evaluate(() => render());
  ok(await p.evaluate(() => !finOwner() && localStorage.getItem('cdh.fin') == null && !!localStorage.getItem('cdh.finPend')), 'con una cuenta que no es del dueño siguen ocultas');
  await p.done();
}
{
  /* El dueño que ya tiene Mis finanzas en el teléfono: no se pisan */
  const C = cloud(null), p = await open(C, { settings: OWNER_SETTINGS, owner: true, extra: { 'cdh.fin': FIN2, 'cdh.finPend': FIN } });
  ok(await p.evaluate(() => fin().marca === 'las-de-ahora' && !!localStorage.getItem('cdh.finPend')), 'si ya hay Mis finanzas en el teléfono, se quedan las de ahora (y no se borra nada)');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}

console.log('C. Cambiar el nombre');
{
  const NOPROF = Object.assign({}, OWNER_SETTINGS); delete NOPROF.prof;
  const C = cloud(null), p = await open(C, { settings: NOPROF, owner: true });
  await p.evaluate(() => { closeSheet(); state.tab = 'profile'; state.profSub = 'body'; render(); }); await p.waitForTimeout(300); await shot(p, 'c1-perfil');
  ok(await p.evaluate(() => { const b = document.querySelector('.pcard .lg-name'); return !!b && /Ponte un nombre/.test(b.textContent); }), 'dueño sin perfil: en Perfil hay "Ponte un nombre" junto al nombre');
  await p.click('.pcard .lg-name'); await p.waitForTimeout(200);
  await p.fill('#lg-name', 'Dueño Prueba'); await p.click('#f-lgname button[type="submit"]'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => JSON.stringify(state.settings.prof) === '{"name":"Dueño Prueba"}' && document.querySelector('.pcard h2').textContent === 'Dueño Prueba' && /Cambiar nombre/.test(document.querySelector('.pcard .lg-name').textContent)), 'se guarda solo el nombre y se ve al momento');
  await p.evaluate(() => { fb.auth = { uid: 'u1', acc: 'u1', email: 'prueba@example.com', token: 'ficha-de-prueba', refresh: 'r', exp: Date.now() + 3e6 }; fb.saveAuth(); state.tab = 'settings'; render(); }); await p.waitForTimeout(300); await shot(p, 'c2-cuenta');
  ok(await p.evaluate(() => /Nombre: Dueño Prueba/.test((document.querySelector('.lg-row') || {}).textContent || '') && !!document.querySelector('.lg-row [data-lg="name"]')), 'en Tu cuenta se ve el nombre con su botón Cambiar');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}
{
  const C = cloud(null), p = await open(C, { settings: OWNER_SETTINGS, owner: true, watch: true });
  await p.evaluate(() => { closeSheet(); state.tab = 'profile'; render(); }); await p.waitForTimeout(300);
  ok(await p.evaluate(() => isWatch() && !document.querySelector('.lg-name') && !document.querySelector('.lg-row')), 'reloj: sin botones nuevos');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}

console.log('D. "Ya tengo cuenta" abre Entrar');
{
  const C = cloud(null), p = await open(C, { empty: true });
  ok(await p.evaluate(() => !!document.getElementById('ent') && !document.getElementById('onb')), 'instalación nueva: sale la pantalla de entrada');
  await p.click('#ent [data-en="start"]'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => !!document.querySelector('#onb [data-pb="have"]')), 'Empezar abre la bienvenida, que tiene "Ya tengo cuenta"');
  await p.click('#onb [data-pb="have"]'); await p.waitForTimeout(300); await shot(p, 'd1-entrar');
  ok(await p.evaluate(() => !document.getElementById('onb') && !!document.getElementById('en-form') && /^Entrar$/.test(document.querySelector('#en-form [type="submit"]').textContent)), '"Ya tengo cuenta" abre Iniciar sesión con el botón Entrar');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}

console.log('E. Cerrar sesión');
{
  /* Dueño con sesión: Mis finanzas, una foto de progreso y un enlace solo en el teléfono */
  const S = Object.assign({}, OWNER_SETTINGS, { prof: { name: 'Dueño Prueba' } });
  const SES = JSON.stringify([{ id: 'tel-1', date: '2026-11-17T10:00:00.000Z', exercises: [] }, { id: 'tel-2', date: '2026-11-18T10:00:00.000Z', exercises: [] }]);
  const C = cloud(ACC({ name: 'Dueño Prueba' })), p = await open(C, { settings: S, extra: { 'cdh.sessions': SES, 'cdh.fin': FIN, 'cdh.links': '{"x":["https://example.com/v"]}', 'cdh.auth': JSON.stringify({ uid: 'u1', acc: 'u1', email: 'prueba@example.com', token: 'ficha-de-prueba', refresh: 'r', exp: 4102444800000 }) } });
  await p.evaluate(() => new Promise(r => phDB.put({ id: 'foto-prueba', d: '2026-11-18', pose: 'front', data: 'x' }, r)));
  const nS = await p.evaluate(() => state.sessions.length);
  await p.evaluate(() => { closeSheet(); state.draft = { planId: 'x' }; });
  await p.evaluate(() => lgOutStart()); await p.waitForTimeout(300);
  ok(/entreno en curso/.test(await sheetText(p)), 'con un entreno en curso no deja cerrar sesión');
  await p.evaluate(() => { state.draft = null; closeSheet(); });
  /* Sin internet: avisa y no borra */
  await p.route(/firestore\.googleapis\.com/, r => r.abort('internetdisconnected'));
  await p.evaluate(() => lgOutStart()); await p.waitForTimeout(1200); await shot(p, 'e1-sin-internet');
  ok(/No cerré la sesión/.test(await sheetText(p)) && await p.evaluate(() => !!localStorage.getItem('cdh.sessions') && !!fb.auth), 'sin internet: avisa y no borra nada');
  await p.unroute(/firestore\.googleapis\.com/);
  await p.evaluate(() => { closeSheet(); return lgOutStart(); }); await p.waitForTimeout(1200); await shot(p, 'e2-listo');
  const t = await sheetText(p);
  ok(/ya están guardados en tu cuenta/.test(t) && /Mis finanzas/.test(t) && /foto de progreso/.test(t) && !!(await p.$('[data-lo="bk"]')), 'después de sincronizar: dice qué solo está en el teléfono y ofrece el Respaldo completo');
  ok((C.get().sessions || []).length === nS, 'las sesiones quedaron en la cuenta (' + nS + ')');
  await p.click('[data-lo="go"]'); await p.waitForTimeout(200);
  ok(/¿Seguro\?/.test(await sheetText(p)), 'pide un segundo toque');
  await p.click('[data-lo="go"]'); await p.waitForTimeout(2500);
  const A = await p.evaluate(async () => ({ cdh: Object.keys(localStorage).filter(k => k.indexOf('cdh.') === 0).filter(k => !/^cdh\.(settings|plans|gyms|newsSeen|reminders)$/.test(k)), lck: Object.keys(localStorage).filter(k => k.indexOf('lck.u1.') === 0), ent: !!document.getElementById('ent'), fotos: (await rcAll(phDB)).length, auth: !!fb.auth, ses: state.sessions.length }));
  ok(!A.auth && A.ses === 0 && A.fotos === 0 && A.ent, 'queda sin sesión, sin entrenos ni fotos, en la pantalla de entrada: ' + JSON.stringify(A.cdh));
  ok(A.lck.includes('lck.u1.fin') && A.lck.includes('lck.u1.links'), 'Mis finanzas y los enlaces quedan guardados bloqueados para esa cuenta');
  ok(await p.evaluate(() => !finOwner() && localStorage.getItem('cdh.fin') == null), 'otra persona en este teléfono no los ve');
  /* Volver a entrar con la misma cuenta: todo regresa */
  await p.evaluate(() => account.signIn('prueba@example.com', 'clave-de-prueba', false)).catch(() => {}); await p.waitForTimeout(3000);
  const B = await p.evaluate(async () => ({ fin: localStorage.getItem('cdh.fin'), links: localStorage.getItem('cdh.links'), fotos: (await rcAll(phDB)).length, ses: state.sessions.length, lck: Object.keys(localStorage).filter(k => k.indexOf('lck.') === 0).length, own: finOwner() }));
  ok(B.fin === FIN && !!B.links && B.fotos === 1 && B.ses === nS && !B.lck && B.own, 'al volver a entrar con la misma cuenta vuelven entrenos, Mis finanzas, enlaces y fotos ' + JSON.stringify(Object.assign({}, B, { fin: !!B.fin })));
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}
{
  /* Teléfono usado sin cuenta que entra a una cuenta con entrenos: elegir */
  const acc = ACC(null); acc.sessions = [{ id: 'nube-1', date: '2026-11-10T10:00:00.000Z', exercises: [] }];
  const C = cloud(acc), p = await open(C, { settings: OWNER_SETTINGS, owner: true });
  const nL = await p.evaluate(() => state.sessions.length);
  const go = p.evaluate(() => account.signIn('prueba@example.com', 'clave-de-prueba', false)); await p.waitForTimeout(800);
  ok(/Tu cuenta ya tiene datos/.test(await sheetText(p)), 'pregunta: usar lo de mi cuenta o unir');
  await p.click('[data-lo="mix"]'); await go; await p.waitForTimeout(600);
  ok(await p.evaluate(n => state.sessions.length === n + 1, nL), 'Unir: quedan las del teléfono y las de la cuenta');
  await p.done();
}
{
  const acc = ACC(null); acc.sessions = [{ id: 'nube-1', date: '2026-11-10T10:00:00.000Z', exercises: [] }];
  const C = cloud(acc), p = await open(C, { settings: OWNER_SETTINGS, owner: true });
  const go = p.evaluate(() => account.signIn('prueba@example.com', 'clave-de-prueba', false)); await p.waitForTimeout(800);
  await p.click('[data-lo="acc"]'); await go; await p.waitForTimeout(600);
  ok(await p.evaluate(() => state.sessions.length === 1 && state.sessions[0].id === 'nube-1' && !!localStorage.getItem('cdh.preupd')), 'Usar lo de mi cuenta: solo quedan las de la cuenta (con copia automática)');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}

await browser.close();
console.log(fail ? `\n${fail} FALLAS` : '\nTodo OK');
process.exit(fail ? 1 : 0);
