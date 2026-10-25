import { OWNER_SETTINGS, seedOwner } from './owner-fixture.mjs';
// Prueba: un dueño que viene de la v1.0.52 (sin los campos nuevos) abre Ajustes y todas las pantallas principales.
// Bug de la v1.0.53/54: Ajustes fallaba ("Cannot read properties of undefined (reading '0')", pub.js) cuando "Tus datos"
// había creado settings.prof a medias (nombre y edad, objetivo vacío) en un dueño que nunca hizo la bienvenida.
// Uso (desde PowerShell): $env:PW_DIR = "<carpeta con node_modules/playwright>"; node tests/tvieja.mjs <copia transpilada> <copia transpilada anterior> [capturas]
// Variantes (datos inventados): A. sin prof · B. prof a medias de "Tus datos" (goal null) · C. prof con objetivo y nada más.
// En cada una: Ajustes (todos los grupos), Hoy, Rutinas, Biblioteca, Progreso, Perfil, Tus datos, Plantillas, sesión,
// reportes semanales, exportaciones, hábitos, Mis finanzas (todas las pestañas) y Novedades, sin errores de JS y sin
// cambiar sesiones, rutinas, gimnasios, registros diarios, recordatorios ni el perfil. D. Reloj con los mismos datos.
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

/* Ajustes de un dueño de la v1.0.52: sin prof (o el que dejan las variantes), sin finanzas, sin wxSeen, restFull ni skip */
const V052 = prof => { const s = structuredClone(OWNER_SETTINGS); delete s.prof; s.alert = { sound: 'largo', rep: 2, vib: 3, fig: true }; s.alarmSec = 3; s.coachDef = false; if (prof) s.prof = prof; return s; };
/* Recordatorios de la v1.0.52 (los viejos tipo crea/agua y uno de hábito) */
const REMS = [{ id: 'r-crea', kind: 'crea', label: 'Creatina', time: '21:00', days: [0, 1, 2, 3, 4, 5, 6], on: true }, { id: 'r-agua', kind: 'water', label: 'Agua', time: '10:00', days: [1, 2, 3, 4, 5], on: true }, { id: 'r-hab', kind: 'hab', hab: 'omega', label: 'Omega 3', time: '13:00', days: [0, 1, 2, 3, 4, 5, 6], on: true, again: 60 }];
async function open(seed, { watch } = {}) {
  const srv = await serve(DIR);
  const ctx = await browser.newContext(watch ? { viewport: { width: 410, height: 500 }, hasTouch: true } : { viewport: { width: 390, height: 844 }, hasTouch: true });
  await ctx.route(/googleapis|gstatic|google\.com|firebase|github/, r => r.abort());
  const p = await ctx.newPage(); p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message));
  await p.clock.setFixedTime(new Date('2026-10-19T10:30:30'));
  await seedOwner(p, seed);
  await p.addInitScript(([o, rems]) => { if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1'); localStorage.setItem('cdh.settings', JSON.stringify(o)); localStorage.setItem('cdh.newsSeen', '"n6"'); localStorage.setItem('cdh.reminders', JSON.stringify(rems));
    localStorage.setItem('cdh.daily', JSON.stringify({ '2026-10-18': { water: 1500, crea: true }, '2026-10-17': { water: 2500, omega: true } })); }, [seed, REMS]);
  await p.goto(`http://127.0.0.1:${srv.address().port}/index.html`); await p.waitForTimeout(2000);
  p.done = async () => { await ctx.close(); srv.close(); };
  return p;
}
/* Lo guardado que no debe cambiar al mirar pantallas */
const snap = p => p.evaluate(() => JSON.stringify({ sessions: state.sessions, plans: state.plans, gyms: state.gyms, daily: state.daily, reminders: state.reminders, prof: state.settings.prof || null, body: state.settings.body || null }));
const step = async (p, name, fn, check, arg) => {
  const n0 = p.errs.length;
  try { await p.evaluate(fn, arg); } catch (e) { p.errs.push(name + ': ' + e.message); }
  await p.waitForTimeout(250);
  const extra = check ? await p.evaluate(check) : true;
  const errs = p.errs.slice(n0);
  ok(!errs.length && extra, `${name}${errs.length ? ' → ' + errs.join(' | ') : ''}`);
};
async function screens(p, tag) {
  const before = await snap(p);
  await step(p, 'Ajustes (⚙) con todos los grupos abiertos', () => { closeSheet(); state.tab = 'settings'; render(); document.querySelectorAll('#app details').forEach(d => { d.open = true; }); },
    () => !!document.querySelector('#app .pb-card') && /Tu objetivo y plan/.test(document.getElementById('app').textContent) && !/undefined|NaN/.test(document.querySelector('#app .pb-card').textContent));
  if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await p.evaluate(() => document.querySelector('#app .pb-card').scrollIntoView({ block: 'center' })); await p.screenshot({ path: path.join(SHOTS, tag + '-ajustes.png') }); }
  await step(p, 'Hoy', () => { state.tab = 'train'; render(); }, () => !!document.getElementById('btn-start'));
  await step(p, 'Rutinas · Mi plan', () => { state.tab = 'plans'; render(); }, () => !!document.querySelector('#app .rt-plan, #app .rt-newr'));
  await step(p, 'Rutinas · Biblioteca', () => { state.tab = 'guide'; render(); });
  for (const sub of ['semana', 'ejercicios', 'historial']) await step(p, 'Progreso · ' + sub, s => { state.tab = 'progress'; state.progSub = s; render(); }, null, sub);
  await step(p, 'Perfil', () => { state.tab = 'profile'; state.profSub = 'body'; render(); }, () => !!document.querySelector('#app .pcard'));
  await step(p, 'Tus datos', () => { dataSheet(); }, () => !!document.getElementById('f-bdd'));
  await step(p, 'Plantillas', () => { closeSheet(); pbTemplates(); }, () => /Se ajustan a tu objetivo \(/.test(document.getElementById('sheet').textContent) && !/undefined/.test(document.getElementById('sheet').textContent));
  await step(p, 'Elegir/cambiar objetivo (bienvenida en modo edición)', () => { closeSheet(); const b = document.createElement('button'); b.dataset.pb = 'redo'; document.body.appendChild(b); b.click(); b.remove(); });
  await step(p, 'Reporte y resumen de la semana', () => { if (typeof pbClose === 'function') pbClose(); closeSheet(); wcSheet('f'); closeSheet(); wcSheet('s'); });
  await step(p, 'Exportar semana / todo / sesión para la IA', () => { closeSheet(); exWeekSheet(1); closeSheet(); aixSheet(); closeSheet(); return [aixWeekText(1).txt, aixAllText('3m').txt, sessionPrompt([state.sessions[0]])].join('').length; });
  await step(p, 'Hábitos: rachas y Omitir hoy', () => { closeSheet(); habSheet(); closeSheet(); habSkipSheet(); });
  await step(p, 'Importar recomendación y entreno rápido', () => { closeSheet(); nsImportSheet(activePlan().id, activePlan().days[0].id); closeSheet(); if (typeof qkSheet === 'function') qkSheet(); });
  await step(p, 'Mis finanzas (todas las pestañas)', () => { closeSheet(); finOpen(); ['gas', 'mes', 'sue', 'cfg', 'res'].forEach(t => { state.finT = t; finSheet(); }); }, () => !!document.querySelector('#sheet .fin-sheet'));
  await step(p, 'Novedades', () => { closeSheet(); newsSheet(true); });
  await step(p, 'Sesión: empezar, marcar y terminar', () => { closeSheet(); const pl = activePlan(); state.settings.nextS = Object.assign({}, state.settings.nextS, { [pl.days[0].id]: { pick: 'plan' } }); startSession(pl.id, pl.days[0].id); markSet(0, 0, true); state.rest = null; render(); }, () => !!document.getElementById('sx'));
  const after = await p.evaluate(() => JSON.stringify({ sessions: state.sessions, plans: state.plans, gyms: state.gyms, daily: state.daily, reminders: state.reminders, prof: state.settings.prof || null, body: state.settings.body || null }));
  ok(after === before, 'mirar las pantallas no cambió sesiones, rutinas, gimnasios, registros, recordatorios, perfil ni cuerpo');
  ok(await p.evaluate(() => !localStorage.getItem('cdh.fin') || JSON.parse(localStorage.getItem('cdh.fin')).ex.length === 0), 'Mis finanzas no aparece con datos inventados (empieza vacío)');
}

console.log('A. Dueño de la v1.0.52 sin prof');
{ const p = await open(V052(null)); await screens(p, 'a'); await p.done(); }
console.log('B. Prof a medias de "Tus datos" (nombre y edad, objetivo vacío)');
{
  const p = await open(V052({ name: 'Atleta de prueba', age: 31, goal: null, cm: 178 }));
  const card = await p.evaluate(() => { state.tab = 'settings'; render(); return document.querySelector('#app .pb-card').textContent.replace(/\s+/g, ' '); }).catch(e => 'ERROR ' + e.message);
  ok(/Aún no elegiste un objetivo\./.test(card) && /Elegir objetivo/.test(card), '"Tu objetivo y plan": sin objetivo lo dice y ofrece elegirlo');
  await screens(p, 'b'); await p.done();
}
console.log('C. Prof con objetivo y nada más');
{
  const p = await open(V052({ name: 'Atleta de prueba', goal: 'fuerza' }));
  const card = await p.evaluate(() => { state.tab = 'settings'; render(); return document.querySelector('#app .pb-card').textContent.replace(/\s+/g, ' '); }).catch(e => 'ERROR ' + e.message);
  ok(/Tu objetivo y plan Ganar fuerza Cambiar objetivo/.test(card) || /Fuerza/i.test(card) && /Cambiar objetivo/.test(card), '"Tu objetivo y plan": muestra solo el objetivo, sin "undefined" ' + card.slice(0, 80));
  ok(await p.evaluate(() => pbBase().goal === 'fuerza' && pbBase().exp === 2 && pbBase().equip === 'gym'), 'Plantillas usan su objetivo y completan lo que falta');
  await screens(p, 'c'); await p.done();
}
console.log('D. Reloj con los mismos datos');
for (const prof of [null, { name: 'Atleta de prueba', age: 31, goal: null }]) {
  const p = await open(V052(prof), { watch: true });
  await step(p, `reloj ${prof ? 'con prof a medias' : 'sin prof'}: inicio, Ajustes y sesión`, () => { state.tab = 'settings'; render(); state.tab = 'train'; render(); const pl = activePlan(); state.settings.nextS = Object.assign({}, state.settings.nextS, { [pl.days[0].id]: { pick: 'plan' } }); startSession(pl.id, pl.days[0].id); render(); }, () => isWatch());
  await p.done();
}

await browser.close();
console.log(fail ? `\n${fail} FALLAS` : '\nTodo OK');
process.exit(fail ? 1 : 0);
