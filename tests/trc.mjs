import { OWNER_SETTINGS } from './owner-fixture.mjs';
// Prueba del respaldo completo (rama respaldo-completo), con datos inventados.
// Uso (desde PowerShell): $env:PW_DIR = "<carpeta con node_modules/playwright>"; node tests/trc.mjs <copia transpilada>
// Hace el respaldo, borra los datos, restaura y compara: Mis finanzas, fotos, videos (byte a byte), enlaces, chat y ajustes.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = createRequire(path.join(process.env.PW_DIR || HERE, 'x.js'))('playwright');
const [DIR] = process.argv.slice(2);
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
const SET = extra => Object.assign(structuredClone(OWNER_SETTINGS), { newsSeen: 'n6', healthOk: 1 }, extra || {});
const SESS = [{ id: 's1', date: '2026-11-01T18:00:00.000Z', planId: 'x', planName: '', dayId: 'd', dayName: 'Pierna', gymId: 'rokaz', gymName: 'Gimnasio A', kind: 'fuerza', exercises: [{ name: 'Prensa 45°', sets: [{ w: 80, r: 10 }] }] }];
async function open({ watch, settings, first } = {}) {
  const srv = await serve(DIR);
  const ctx = await browser.newContext(watch ? { viewport: { width: 410, height: 500 }, hasTouch: true } : { viewport: { width: 390, height: 844 }, hasTouch: true, acceptDownloads: true });
  await ctx.route(/googleapis|gstatic|google\.com|firebase|github/, r => r.abort());
  const p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
  if (!first) await p.addInitScript(([s, ss]) => { if (localStorage.getItem('cdh.seeded')) return; localStorage.setItem('cdh.seeded', '1'); localStorage.setItem('cdh.settings', JSON.stringify(s)); localStorage.setItem('cdh.sessions', JSON.stringify(ss)); localStorage.setItem('cdh.newsSeen', '"n6"'); }, [settings || SET(), SESS]);
  await p.goto(`http://127.0.0.1:${srv.address().port}/index.html`); await p.waitForTimeout(1500);
  p.done = async () => { await ctx.close(); srv.close(); };
  return p;
}
const noErr = p => ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
/* Datos que solo viven en el teléfono. El video pesa más de 2 trozos para probar la unión */
const seed = p => p.evaluate(async () => {
  const b = new Uint8Array(1800000); for (let i = 0; i < b.length; i++) b[i] = (i * 31 + (i >> 8)) & 255;
  await VID.add({ id: 'v1', ex: 'prensa', name: 'tecnica.mp4', type: 'video/mp4', size: b.length, blob: new Blob([b], { type: 'video/mp4' }), added: 5 });
  await new Promise(r => phDB.put({ id: '2026-11-01|front', d: '2026-11-01', pose: 'front', img: 'data:image/jpeg;base64,AAAA', at: 7 }, r));
  await new Promise(r => myDB.put({ k: 'my-1', img: 'data:image/jpeg;base64,BBBB' }, r));
  LS.set('fin', { app: 'forja-finanzas', v: 1, cats: [{ id: 'c', name: 'Gustos' }], ex: [{ id: 'e', d: '2026-11-01', c: 'Café', cat: 'c', amt: 1250 }], tpl: { pays: [] }, m: {} });
  LS.set('links', { prensa: ['https://example.com/a'] }); LS.set('aichat', [{ r: 'u', t: 'Hola coach' }]); LS.set('equipo', { brillo: 1 }); localStorage.setItem('cdh.auth', '"secreto-de-prueba"'); localStorage.setItem('cdh.syncMeta', '{"a":1}');
});
const shot = p => p.evaluate(async () => {
  const sum = async bl => { const a = new Uint8Array(await bl.arrayBuffer()); let h = 0; for (let i = 0; i < a.length; i++) h = (h * 33 + a[i]) >>> 0; return a.length + ':' + h; };
  const V = await rcVids(), o = {}; Object.keys(localStorage).sort().filter(k => /^cdh\.(fin|links|aichat|equipo|sessions)$/.test(k)).forEach(k => { o[k] = localStorage.getItem(k); });
  return JSON.stringify({ o, ph: await rcAll(phDB), my: await rcAll(myDB), v: await Promise.all(V.map(async x => [x.id, x.ex, x.name, x.type, await sum(x.blob)])) });
});
const build = p => p.evaluate(async () => { window.__parts = []; await rcWrite(s => { window.__parts.push(s); }); window.__file = new Blob(window.__parts); return window.__parts.join('').length; });
const wipe = p => p.evaluate(async () => {
  Object.keys(localStorage).filter(k => /^cdh\.(fin|links|aichat|equipo|sessions)$/.test(k)).forEach(k => localStorage.removeItem(k));
  await rcClear(await rcOpen(phDB), 'p'); await rcClear(await rcOpen(myDB), 'f'); await rcClear(await VID.open(), 'videos');
});

console.log('A. Dueño: respaldo, borrar y restaurar');
{
  const p = await open(); await seed(p); const before = await shot(p);
  const size = await build(p); console.log('      tamaño del archivo:', Math.round(size / 1024), 'KB');
  const txt = await p.evaluate(() => window.__parts.join(''));
  ok(!/secreto-de-prueba/.test(txt) && !/cdh\.syncMeta/.test(txt), 'la sesión de la cuenta no va en el archivo');
  const h = await p.evaluate(() => rcCheck(window.__file)); ok(h.owner === 1 && h.n.videos === 1 && h.n.fin === 1, 'el archivo se reconoce y dice qué trae');
  ok(txt.split('\n').every(l => l.length < 1200000), 'los videos van en trozos: nunca una línea enorme');
  await wipe(p); ok((await shot(p)) !== before, 'datos borrados');
  await p.evaluate(h => rcApply(window.__file, false, h), h);
  ok((await shot(p)) === before, 'restaurado: todo queda igual (finanzas, fotos, video byte a byte, enlaces, chat y ajustes)');
  ok(await p.evaluate(() => localStorage.getItem('cdh.auth') === '"secreto-de-prueba"'), 'restaurar no toca tu sesión actual');
  noErr(p); await p.done();
}

console.log('B. No borra sin avisar');
{
  const p = await open(); await seed(p); await build(p); const h = await p.evaluate(() => rcCheck(window.__file));
  await p.evaluate(async () => {
    const s = JSON.parse(localStorage.getItem('cdh.sessions')); s.unshift({ id: 'nueva', date: '2026-11-05T18:00:00.000Z', exercises: [] }); localStorage.setItem('cdh.sessions', JSON.stringify(s));
    LS.set('links', { prensa: ['https://example.com/b'], otro: ['https://example.com/c'] }); LS.set('aichat', [{ r: 'u', t: 'Más nuevo' }]);
    await new Promise(r => phDB.put({ id: '2026-11-05|front', d: '2026-11-05', pose: 'front', img: 'x', at: 9 }, r));
    await rcClear(await VID.open(), 'videos');
  });
  await p.evaluate(h => rcApply(window.__file, false, h), h);
  const r = await p.evaluate(async () => ({ s: JSON.parse(localStorage.getItem('cdh.sessions')).map(x => x.id), l: LS.get('links'), c: LS.get('aichat')[0].t, ph: (await rcAll(phDB)).length, v: (await rcVids()).length }));
  ok(r.s.join() === 'nueva,s1', 'agregar: conserva la sesión nueva y repone la del respaldo, sin repetir');
  ok(r.l.prensa.length === 2 && r.l.otro.length === 1, 'agregar: une los enlaces');
  ok(r.c === 'Más nuevo', 'agregar: lo que ya existe no se pisa');
  ok(r.ph === 2 && r.v === 1, 'agregar: fotos nuevas se quedan y el video que faltaba vuelve');
  await p.evaluate(() => { rcHead = { at: new Date().toISOString(), owner: 1, n: { sessions: 1, videos: 1, fin: 1 } }; state.rcLocal = { sessions: 2, photos: 2 }; rcSheet(state.rcLocal, false); }); await p.waitForTimeout(120);
  const t1 = await p.evaluate(() => document.querySelector('#sheet').innerText.replace(/\s+/g, ' ')); console.log('      aviso:', t1.slice(0, 170));
  ok(/ya tiene: 2 sesiones/.test(t1) && /Agregar lo que falta/.test(t1) && /Reemplazar todo/.test(t1), 'avisa qué hay en este teléfono antes de tocar nada');
  await p.evaluate(() => { window.__go = null; const g = rcGo; rcGo = a => { window.__go = a; }; document.querySelector('[data-rc="all"]').click(); }); await p.waitForTimeout(100);
  ok(await p.evaluate(() => window.__go === null && /Toca otra vez/.test(document.querySelector('[data-rc="all"]').textContent)), 'reemplazar pide confirmar: el primer toque no borra');
  await p.evaluate(() => document.querySelector('[data-rc="all"]').click()); await p.waitForTimeout(100);
  ok(await p.evaluate(() => window.__go === true), 'con el segundo toque, sigue');
  await p.evaluate(h => rcApply(window.__file, true, h), h);
  const q = await p.evaluate(async () => ({ s: JSON.parse(localStorage.getItem('cdh.sessions')).map(x => x.id), snap: !!localStorage.getItem('cdh.preupd'), ph: (await rcAll(phDB)).length }));
  ok(q.s.join() === 's1' && q.ph === 1, 'reemplazar: queda igual al respaldo'); ok(q.snap, 'y antes guardó una copia de lo anterior');
  noErr(p); await p.done();
}

console.log('C. Archivos malos');
{
  const p = await open(); await seed(p); await build(p);
  const cut = await p.evaluate(async () => { const t = window.__parts.slice(0, -2).join(''); try { await rcCheck(new Blob([t])); return 'pasó'; } catch (e) { return e.message; } });
  ok(/incompleto/.test(cut), 'archivo cortado: no se restaura (' + cut + ')');
  const other = await p.evaluate(async () => { try { await rcCheck(new Blob(['{"t":"x"}\n'])); return 'pasó'; } catch (e) { return e.message; } });
  ok(/no es un respaldo/.test(other), 'otro archivo: lo rechaza');
  noErr(p); await p.done();
}

console.log('D. Mis finanzas solo para el dueño');
{
  const p = await open({ settings: SET({ owner: 0, pub: 1, onb: 1 }) }); await seed(p);
  const t = await p.evaluate(() => { state.tab = 'settings'; return vSettings(); });
  ok(/Respaldo completo/.test(t) && !/Mis finanzas/.test(t.slice(t.indexOf('Respaldo completo'), t.indexOf('Respaldo completo') + 500)), 'usuario normal: el texto no habla de Mis finanzas');
  await build(p); ok(await p.evaluate(() => !/cdh\.fin"/.test(window.__parts.join(''))), 'usuario normal: no va en el archivo');
  noErr(p); await p.done();
  const o = await open(); const t2 = await o.evaluate(() => vSettings()); ok(/Mis finanzas/.test(t2.slice(t2.indexOf('Respaldo completo'), t2.indexOf('Respaldo completo') + 500)), 'dueño: sí aparece'); noErr(o); await o.done();
}

console.log('E. Usuario nuevo y reloj');
{
  const p = await open({ first: true }); ok(await p.evaluate(() => /Respaldo completo/.test(vSettings())), 'usuario nuevo: disponible'); noErr(p); await p.done();
  const w = await open({ watch: true }); ok(await w.evaluate(() => !/Respaldo completo/.test(vSettings())), 'reloj: no cambia'); noErr(w); await w.done();
}

await browser.close();
console.log(fail ? `\n${fail} FALLAS` : '\nTodo OK');
process.exit(fail ? 1 : 0);
