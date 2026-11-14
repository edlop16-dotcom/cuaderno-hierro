import { OWNER_SETTINGS } from './owner-fixture.mjs';
// El reloj sigue igual: abre la copia nueva y la anterior en tamaño reloj con los mismos datos inventados y compara el
// contenido de cada pantalla (inicio, sesión, serie marcada, descanso, Ajustes y Perfil). Sin perfil de principiante.
// Uso (desde PowerShell): $env:PW_DIR = "<carpeta con node_modules/playwright>"; node tests/treloj.mjs <copia transpilada> <copia transpilada anterior>
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = createRequire(path.join(process.env.PW_DIR || HERE, 'x.js'))('playwright');
const [NEW, OLD] = process.argv.slice(2);
if (!NEW || !OLD) throw new Error('Faltan las dos carpetas transpiladas');
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

let N = 0;
const X = (name, type, sets, w) => ({ id: 'x' + (++N), name, type, weight: w, sets, repsMin: 8, repsMax: 12, rest: 90 });
const PLANS = [{ id: 'p1', name: 'Rutina de prueba', gymId: 'rokaz', days: [{ id: 'd1', name: 'Cuerpo completo (Pesado)', weekday: 0, kind: 'fuerza', exercises: [X('Prensa 45°', 'Piernas', 4, 100), X('Press Banca Plano (Barra)', 'Empuje', 3, 40), X('Curl Bíceps', 'Tracción', 3, 10)] }] }];
const GYMS = [{ id: 'rokaz', name: 'Gimnasio A' }];
const S = (w, r, rir) => [0, 1, 2].map(() => ({ w, r, rir }));
const SESS = [{ id: 's1', date: new Date('2026-10-22T19:00').toISOString(), planId: 'p1', planName: '', dayId: 'd1', dayName: 'x', gymId: 'rokaz', gymName: 'Gimnasio A', kind: 'fuerza', durationSec: 3600, exercises: [{ name: 'Prensa 45°', type: 'Piernas', sets: S(100, 10, 3) }, { name: 'Curl Bíceps', type: 'Tracción', sets: S(10, 9, 1) }] }];
const SET = prof => { const s = Object.assign(structuredClone(OWNER_SETTINGS), { activePlanId: 'p1', activeGymId: 'rokaz', planByGym: { rokaz: 'p1' }, newsSeen: 'n6' }); s.prof = Object.assign({}, s.prof, { goal: 'musculo', mins: 75 }, prof); if (prof.exp == null) delete s.prof.exp; return s; };

const ids = h => h.replace(/\b(id|for|aria-controls|data-id|data-exid)="[^"]*\d[^"]*"/g, '$1="#"')
  .replace(/class="w2-ov[^"]*"/g, 'class="w2-ov"')                                     /* capa oculta: su clase depende del instante */
  .replace(/<div id="bd-ph-list">.*?<\/div><\/div>/, '<div id="bd-ph-list"></div>');   /* fotos: carga asíncrona */
async function screens(dir, settings, classic) {
  const srv = await serve(dir);
  const ctx = await browser.newContext({ viewport: { width: 410, height: 500 }, hasTouch: true });
  await ctx.route(/googleapis|gstatic|google\.com|firebase|github/, r => r.abort());
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.clock.setFixedTime(new Date('2026-10-25T10:00:00'));
  await p.addInitScript(() => { let n = 0; Math.random = () => (n = (n * 9301 + 49297) % 233280) / 233280; });   /* mismo azar en las dos copias */
  await p.addInitScript(([s, pl, ss, g]) => { if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    localStorage.setItem('cdh.settings', JSON.stringify(s)); localStorage.setItem('cdh.plans', JSON.stringify(pl)); localStorage.setItem('cdh.sessions', JSON.stringify(ss));
    localStorage.setItem('cdh.gyms', JSON.stringify(g)); localStorage.setItem('cdh.newsSeen', '"n6"'); localStorage.setItem('cdh.reminders', '[]'); }, [settings, PLANS, SESS, GYMS]);
  await p.goto(`http://127.0.0.1:${srv.address().port}/index.html`); await p.waitForTimeout(1800);
  if (classic) await p.evaluate(() => { if (typeof _pgRxG5 !== 'undefined') pgRx = _pgRxG5; });   /* ajustes-gym-5: rangos y descansos de antes, para comparar solo la pantalla */
  const shot = () => p.evaluate(() => document.getElementById('app').innerHTML);
  const out = {};
  await p.evaluate(() => { state.settings.healthOk = 1; closeSheet(); state.tab = 'train'; render(); });
  out.watch = await p.evaluate(() => isWatch());
  out.inicio = await shot();
  await p.evaluate(() => { state.tab = 'settings'; render(); }); out.ajustes = await shot();
  await p.evaluate(() => { state.tab = 'profile'; render(); }); out.perfil = await shot();
  await p.evaluate(() => { state.tab = 'train'; state.settings.nextS = { d1: { pick: 'plan' } }; startSession('p1', 'd1'); state.draft.exercises.forEach(e => { delete e.id; }); render(); });
  await p.waitForTimeout(300); out.sesion = await shot();
  out.datos = await p.evaluate(() => JSON.stringify(state.draft.exercises.map(e => [e.name, e.repsMin, e.repsMax, e.rest, e.log.map(s => [s.w, s.r]), e.rirT])));
  await p.evaluate(() => { markSet(0, 0, true); render(); }); await p.waitForTimeout(300); out.serie = await shot();
  await p.evaluate(() => { markSet(0, 1, true); render(); }); await p.waitForTimeout(300); out.serie2 = await shot();
  out.errs = errs;
  await ctx.close(); srv.close();
  return out;
}
for (const [t, prof] of [['intermedio', { exp: 2 }], ['avanzado', { exp: 3 }], ['sin experiencia', { exp: null }]]) {
  console.log('Reloj · ' + t);
  const a = await screens(NEW, SET(prof), true), b = await screens(OLD, SET(prof)), g = await screens(NEW, SET(prof));
  ok(a.watch && b.watch, 'las dos copias abren en modo reloj');
  for (const k of ['inicio', 'ajustes', 'perfil', 'sesion', 'serie', 'serie2']) { const x = ids(a[k]), y = ids(b[k]); let i = 0; while (i < x.length && x[i] === y[i]) i++; ok(x === y && a[k].length > 50, `${k}: igual (${a[k].length} caracteres)${x === y ? '' : ` · nueva: ${x.slice(Math.max(0, i - 40), i + 60)} · anterior: ${y.slice(Math.max(0, i - 40), i + 60)}`}`); }
  ok(a.datos === b.datos, 'con los rangos y descansos de antes: las series, rangos, descansos y RIR de la sesión son los mismos');
  console.log('      con los de ajustes-gym-5: ' + g.datos);
  const G = JSON.parse(g.datos);
  ok(G[0][1] === 6 && G[0][2] === 8 && G[0][3] === 150 && g.ajustes === b.ajustes && g.perfil === b.perfil, 'con los rangos nuevos: el reloj recibe los del coach (Prensa pesado 6-8, 2 min 30 s); Ajustes y Perfil no cambian');
  ok(!g.errs.length, 'sin errores de JS con los rangos nuevos');
  ok(!a.errs.length, 'sin errores de JS ' + a.errs.join(' | '));
}
await browser.close();
console.log(fail ? `\n${fail} FALLAS` : '\nTodo OK');
process.exit(fail ? 1 : 0);
