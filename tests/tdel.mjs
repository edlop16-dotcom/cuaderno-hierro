import { OWNER_SETTINGS, seedOwner } from './owner-fixture.mjs';
// Prueba de "Eliminar mi cuenta" (play.js) y del correo de contacto (legal.js). Cuentas, códigos y correos inventados.
// Uso (desde PowerShell): $env:PW_DIR = "<carpeta con node_modules/playwright>"; node tests/tdel.mjs <copia transpilada> [copia anterior] [capturas]
// La nube es simulada: un Firestore y un servicio de cuentas de mentira dentro de la prueba (nada sale a internet).
// A. Elimina accounts, social, share, su código y toda su bandeja (también con más de una página), antes de borrar la
//    cuenta; no toca lo de otras cuentas. B. Si la nube no deja borrar algo, la cuenta se elimina igual y se avisa qué
//    quedó y a qué correo escribir. C. Sin código ni datos de amigos no falla. D. Correo de contacto en la app y la web.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = createRequire(path.join(process.env.PW_DIR || HERE, 'x.js'))('playwright');
const [DIR, , SHOTS] = process.argv.slice(2);
if (!DIR) throw new Error('Falta la carpeta transpilada');
const MAIL = 'forjacontactapp@gmail.com';
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

/* Nube de mentira: documentos por ruta; `deny` = rutas que la nube no deja borrar; `log` = lo que pidió la app, en orden */
function cloud(docs, deny) {
  const C = { docs: Object.assign({}, docs), log: [], deny: deny || (() => false) };
  C.handle = async route => {
    const q = route.request(), u = new URL(q.url()), m = q.method();
    const json = (st, o) => route.fulfill({ status: st, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(o) });
    if (m === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
    if (u.hostname === 'identitytoolkit.googleapis.com') {
      const op = u.pathname.split(':').pop(); C.log.push('auth:' + op);
      return json(200, op === 'delete' ? {} : { localId: 'u1', idToken: 'ficha-de-prueba', refreshToken: 'r', expiresIn: '3600' });
    }
    if (u.hostname === 'securetoken.googleapis.com') return json(200, { user_id: 'u1', id_token: 'ficha-de-prueba', refresh_token: 'r', expires_in: '3600' });
    if (u.hostname !== 'firestore.googleapis.com') return route.abort();
    const p = decodeURIComponent(u.pathname.split('/documents/')[1] || ''), isCol = p.split('/').length % 2 === 1, full = k => 'projects/x/databases/(default)/documents/' + k;
    if (m === 'GET' && isCol) {
      const n = +(u.searchParams.get('pageSize') || 20), all = Object.keys(C.docs).filter(k => k.indexOf(p + '/') === 0 && k.slice(p.length + 1).indexOf('/') < 0).sort();
      C.log.push('LIST ' + p);
      return json(200, Object.assign({ documents: all.slice(0, n).map(k => ({ name: full(k), fields: C.docs[k] })) }, all.length > n ? { nextPageToken: 'mas' } : {}));
    }
    if (m === 'GET') return C.docs[p] ? json(200, { name: full(p), fields: C.docs[p] }) : json(404, { error: { status: 'NOT_FOUND' } });
    if (m === 'DELETE') {
      C.log.push('DELETE ' + p);
      if (C.deny(p)) return json(403, { error: { status: 'PERMISSION_DENIED' } });
      delete C.docs[p]; return json(200, {});
    }
    let body = {}; try { body = JSON.parse(q.postData() || '{}'); } catch (e) {}
    if (m === 'POST') { const k = p + '/n' + Object.keys(C.docs).length; C.docs[k] = body.fields || {}; return json(200, { name: full(k), fields: C.docs[k] }); }
    C.docs[p] = Object.assign({}, C.docs[p], body.fields || {}); return json(200, { name: full(p), fields: C.docs[p] });
  };
  return C;
}
const S = v => ({ stringValue: v });
/* La cuenta u1 con todo lo suyo, y lo de otra cuenta (u2), que no debe tocarse */
const DOCS = nInbox => { const d = { 'accounts/u1': { data: S('{}') }, 'social/u1': { name: S('Atleta de prueba') }, 'share/u1': { j: S('{}') }, 'codes/ABC234': { acc: S('u1') },
  'accounts/u2': { data: S('{}') }, 'social/u2': { name: S('Otra persona') }, 'share/u2': { j: S('{}') }, 'codes/ZZZ999': { acc: S('u2') }, 'inbox/u2/items/x1': { type: S('client'), from: S('u1') } };
  for (let i = 0; i < nInbox; i++) d['inbox/u1/items/i' + String(i).padStart(3, '0')] = { type: S('client'), from: S('u2') }; return d; };
const mine = C => Object.keys(C.docs).filter(k => /^(accounts|social|share)\/u1$|^codes\/ABC234$|^inbox\/u1\//.test(k));
const others = C => ['accounts/u2', 'social/u2', 'share/u2', 'codes/ZZZ999', 'inbox/u2/items/x1'].every(k => !!C.docs[k]);

async function open(C, { code = true, watch } = {}) {
  const srv = await serve(DIR);
  const ctx = await browser.newContext({ viewport: watch ? { width: 410, height: 500 } : { width: 390, height: 844 }, hasTouch: true });
  await ctx.route(/googleapis\.com/, r => C.handle(r));
  await ctx.route(/gstatic|google\.com|firebase|github/, r => r.abort());
  const p = await ctx.newPage(); p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message));
  await p.clock.setFixedTime(new Date('2026-11-16T11:00:00'));
  await seedOwner(p, OWNER_SETTINGS);
  await p.addInitScript(o => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('cdh.settings', JSON.stringify(o)); localStorage.setItem('cdh.newsSeen', '"n6"'); localStorage.setItem('cdh.reminders', '[]'); } }, OWNER_SETTINGS);
  await p.goto(`http://127.0.0.1:${srv.address().port}/index.html`); await p.waitForTimeout(2000);
  /* Sesión de mentira ya iniciada (cuenta u1) */
  await p.evaluate(([code, watch]) => { closeSheet(); fb.auth = { uid: 'u1', acc: 'u1', email: 'prueba@example.com', token: 'ficha-de-prueba', refresh: 'r', exp: Date.now() + 3e6, watch: watch ? 1 : undefined }; fb.saveAuth();
    if (code) { state.settings.myCode = 'ABC234'; state.settings.myCodeAcc = 'u1'; } LS.set('marca', 'dato-solo-del-telefono'); state.settings.healthOk = 1; savePlans(); state.tab = 'train'; render(); }, [code, !!watch]);
  p.done = async () => { await ctx.close(); srv.close(); };
  return p;
}
const shot = async (p, n) => { if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); fs.writeFileSync(path.join(SHOTS, n + '.png'), await p.screenshot({ animations: 'disabled' })); } };
async function borrar(p, { local = true } = {}) {
  await p.evaluate(() => delSheet('acc')); await p.waitForTimeout(200);
  if (!local) await p.uncheck('#del-local');
  await p.fill('#del-pass', 'clave-de-prueba'); await p.fill('#del-conf', 'borrar');
  await p.click('#sheet [data-act="del-acc-go"]'); await p.waitForTimeout(1500);
}

console.log('A. Eliminar la cuenta borra también social, share, su código y su bandeja');
{
  const C = cloud(DOCS(3)), p = await open(C);
  await p.evaluate(() => delSheet('acc')); await p.waitForTimeout(200); await shot(p, 'a1-hoja');
  ok(await p.evaluate(() => /amigos y entrenador/.test(document.querySelector('#sheet .safe').textContent) && /tu código y tu bandeja/.test(document.querySelector('#sheet .safe').textContent)), 'el aviso dice que también se borra lo de amigos y entrenador');
  await p.click('#sheet [data-act="del-acc-go"]'); await p.waitForTimeout(300);
  ok(mine(C).length === 7 && !C.log.some(x => /^DELETE|auth:delete/.test(x)), 'sin escribir BORRAR no se borra nada');
  await p.evaluate(() => closeSheet());
  await borrar(p);
  ok(mine(C).length === 0, 'no queda nada de la cuenta en la nube: accounts, social, share, codes ni inbox ' + JSON.stringify(mine(C)));
  ok(others(C), 'lo de la otra cuenta (su resumen, lo compartido, su código y su bandeja) sigue intacto');
  const del = C.log.filter(x => /^DELETE/.test(x)), iAuth = C.log.indexOf('auth:delete'), last = Math.max(...C.log.map((x, i) => (/^DELETE/.test(x) ? i : -1)));
  ok(['accounts/u1', 'social/u1', 'share/u1', 'codes/ABC234', 'inbox/u1/items/i000', 'inbox/u1/items/i001', 'inbox/u1/items/i002'].every(k => del.includes('DELETE ' + k)) && del.length === 7, 'borra exactamente esos 7 documentos (ninguno de otra cuenta) ' + del.length);
  ok(iAuth > last && C.log.filter(x => x === 'auth:delete').length === 1, 'y solo después elimina la cuenta (con la sesión ya no se podría borrar nada)');
  await p.waitForTimeout(1500);
  ok(await p.evaluate(() => !localStorage.getItem('cdh.auth') && !fb.auth && !localStorage.getItem('cdh.marca') && !state.settings.myCode), 'con "Borrar también los datos de este teléfono": el teléfono queda limpio y sin sesión');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}
{
  /* Bandeja de más de una página (230 avisos) y sin borrar los datos del teléfono */
  const C = cloud(DOCS(230)), p = await open(C);
  await borrar(p, { local: false }); await p.waitForTimeout(2500);
  ok(mine(C).length === 0 && others(C), 'una bandeja de 230 avisos se borra entera, página por página');
  ok(C.log.filter(x => x === 'LIST inbox/u1/items').length >= 3 && C.log.indexOf('auth:delete') > C.log.lastIndexOf('DELETE inbox/u1/items/i229'), 'la cuenta se elimina cuando la bandeja ya está vacía');
  ok(await p.evaluate(() => !fb.auth && document.getElementById('sheet').hidden && state.sessions.length > 0 && !!localStorage.getItem('cdh.marca') && /Cuenta eliminada/.test(document.getElementById('toast').textContent)), 'sin marcar la casilla: se cierra la sesión y los datos del teléfono siguen');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}

console.log('B. Si la nube no deja borrar algo');
{
  const C = cloud(DOCS(2), k => /^share\/|^codes\//.test(k)), p = await open(C);
  await borrar(p); await shot(p, 'b1-aviso');
  ok(!C.docs['accounts/u1'] && !C.docs['social/u1'] && !Object.keys(C.docs).some(k => /^inbox\/u1\//.test(k)) && C.log.includes('auth:delete'), 'la cuenta se elimina igual, con lo que sí se pudo borrar');
  const M = await p.evaluate(() => ({ msg: document.getElementById('del-msg').textContent, btn: (document.querySelector('#sheet [data-act="del-done"]') || {}).textContent || '', open: !document.getElementById('sheet').hidden }));
  ok(M.open && /lo que compartías con tu entrenador, tu código/.test(M.msg) && !/resumen|bandeja/.test(M.msg) && M.msg.includes(MAIL) && M.btn === 'Entendido', 'avisa qué quedó sin borrar y a qué correo escribir, y espera a que lo leas: ' + M.msg);
  await p.waitForTimeout(1500);
  ok(await p.evaluate(() => !document.getElementById('sheet').hidden), 'el aviso no se cierra solo');
  await p.click('#sheet [data-act="del-done"]'); await p.waitForTimeout(2000);
  ok(await p.evaluate(() => !localStorage.getItem('cdh.auth') && !fb.auth && !localStorage.getItem('cdh.marca') && !state.settings.myCode), 'al tocar "Entendido" la app se reinicia con el teléfono limpio');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}

console.log('C. Cuenta sin código ni datos de amigos');
{
  const C = cloud({ 'accounts/u1': { data: S('{}') }, 'codes/ABC234': { acc: S('u2') } }), p = await open(C, { code: false });
  await borrar(p, { local: false });
  ok(!C.docs['accounts/u1'] && C.log.includes('auth:delete') && !C.log.some(x => /^DELETE codes\//.test(x)) && !!C.docs['codes/ABC234'], 'se elimina sin fallar y no toca ningún código (no tenía uno propio)');
  ok(await p.evaluate(() => document.getElementById('sheet').hidden && !fb.auth), 'termina normal, sin avisos de más');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}
{
  const C = cloud(DOCS(1)), p = await open(C, { watch: true });
  await p.evaluate(() => { delSheet('acc'); document.getElementById('del-conf').value = 'BORRAR'; return deleteAccount(); }); await p.waitForTimeout(500);
  ok(await p.evaluate(() => isWatch()) && mine(C).length === 5 && !C.log.some(x => /^DELETE|auth:delete/.test(x)), 'reloj: desde el reloj no se elimina la cuenta ni se borra nada (igual que antes)');
  await p.done();
}

console.log('D. Correo de contacto');
{
  const C = cloud({}), p = await open(C);
  const L = await p.evaluate(() => ({ c: LEGAL.contact, e: CONTACT_EMAIL, priv: LEGAL.privacy, terms: LEGAL.terms || '' }));
  ok(L.c === MAIL && L.e === MAIL, 'legal.js: CONTACT_EMAIL = ' + L.c);
  ok(L.priv.includes(MAIL) && !/example\.com/.test(L.priv + L.terms), 'la política de privacidad muestra ese correo y ya no el de ejemplo');
  await p.evaluate(() => privacySheet()); await p.waitForTimeout(200);
  ok(await p.evaluate(m => document.getElementById('sheet').textContent.includes(m), MAIL), 'en la app: Política de privacidad con el correo');
  const base = p.url().replace(/index\.html.*/, '');
  await p.goto(base + 'eliminar-cuenta.html'); await p.waitForTimeout(300);
  ok(await p.evaluate(m => document.getElementById('mail').textContent === m, MAIL), 'en la web: eliminar-cuenta.html dice a qué correo escribir');
  await p.goto(base + 'privacidad.html'); await p.waitForTimeout(300);
  ok(await p.evaluate(m => document.body.textContent.includes(m) && !/example\.com/.test(document.body.textContent), MAIL), 'en la web: privacidad.html con el correo');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}

await browser.close();
console.log(fail ? `\n${fail} FALLAS` : '\nTodo OK');
process.exit(fail ? 1 : 0);
