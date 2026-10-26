import { OWNER_SETTINGS, seedOwner } from './owner-fixture.mjs';
// Prueba: exportar la semana con dos días de rutinas distintas (lunes fuerza de otro plan, miércoles bombeo del plan activo),
// sustitutos, objetivo ausente, edad y último peso, instrucciones solo de la semana / solo del día, y el reporte semanal
// ("Copiar" solo el reporte; "Exportar semana para IA" aparte). Datos inventados.
// Uso (desde PowerShell): $env:PW_DIR = "<carpeta con node_modules/playwright>"; node tests/tsem.mjs <copia transpilada> <copia transpilada anterior> [capturas]
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = createRequire(path.join(process.env.PW_DIR || HERE, 'x.js'))('playwright');
const [DIR, , SHOTS] = process.argv.slice(2);   // la copia anterior no se usa (mismo uso que las demás)
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

async function open(seed) {
  const srv = await serve(DIR);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  await ctx.route(/googleapis|gstatic|google\.com|firebase|github/, r => r.abort());
  const p = await ctx.newPage(); p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message));
  await p.clock.setFixedTime(new Date('2026-10-22T18:00:00'));   // jueves
  await seedOwner(p, seed);
  await p.addInitScript(o => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('cdh.settings', JSON.stringify(o)); localStorage.setItem('cdh.newsSeen', '"n6"'); localStorage.setItem('cdh.reminders', '[]'); }
    window.__clip = []; try { Object.defineProperty(navigator, 'clipboard', { value: { writeText: t => { window.__clip.push(t); return Promise.resolve(); } } }); } catch (e) {} }, seed);
  await p.goto(`http://127.0.0.1:${srv.address().port}/index.html`); await p.waitForTimeout(2000);
  p.done = async () => { await ctx.close(); srv.close(); };
  return p;
}
/* La semana inventada: lunes 19 con "Piernas + Torso" de otro plan (fuerza) y miércoles 21 con el Full Body (Bombeo) del activo */
const SETUP = () => {
  const E = (name, w) => ({ id: uid(), name, type: typeOf(name), weight: w, sets: 3, repsMin: 6, repsMax: 8, rest: 150 });
  const B = { id: 'planB', name: 'Rutinas de prueba', gymId: 'rokaz', days: [{ id: 'pB-lun', name: 'Piernas + Torso', weekday: 1, kind: 'fuerza', exercises: [E('Prensa 45°', 100), E('Press Banca Plano (Barra)', 40), E('Remo Sentado con Cable', 45), E('Elevaciones Laterales', 8)] }] };
  state.plans.push(B); savePlans();
  const S = (id, date, planId, dayId, dayName, kind, ex) => ({ id, date: new Date(date).toISOString(), planId, planName: '', dayId, dayName, gymId: 'rokaz', gymName: 'Gimnasio de prueba', kind, durationSec: 3600,
    exercises: ex.map(([name, w, r, of]) => Object.assign({ name, type: typeOf(name), sets: [{ w, r, rir: 2 }, { w, r: r - 1, rir: 1 }] }, of ? { of } : {})) });
  state.sessions.unshift(
    S('t-mie', '2026-10-21T19:00:00', 'plan1', 'p1-mie', 'Full Body (Bombeo)', 'bombeo', [['Prensa 45°', 60, 15], ['Press Militar en Smith', 20, 12], ['Jalón al Pecho', 35, 12]]),
    S('t-lun', '2026-10-19T19:00:00', 'planB', 'pB-lun', 'Piernas + Torso', 'fuerza', [['Prensa 45°', 110, 8], ['Press de Banca en Smith', 30, 8, 'Press Banca Plano (Barra)'], ['Remo Sentado con Cable', 50, 8], ['Pec Deck Inverso', 25, 12]]));
  saveLocal();
};

console.log('A. Semana con lunes (fuerza, otro plan) y miércoles (bombeo, plan activo)');
{
  const seed = structuredClone(OWNER_SETTINGS); delete seed.prof.goal;
  seed.body = Object.assign({}, seed.body, { w: [{ d: '2026-10-01', kg: 76 }, { d: '2026-10-20', kg: 75.4 }] });
  const p = await open(seed);
  await p.evaluate(SETUP);
  const T = await p.evaluate(() => aixWeekText(0).txt);
  if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); fs.writeFileSync(path.join(SHOTS, 'semana.txt'), T); }
  const sec = (a, b) => { const i = T.indexOf(a); if (i < 0) return ''; const j = b ? T.indexOf(b, i + a.length) : -1; return T.slice(i, j < 0 ? undefined : j); };
  const rut = sec('MI RUTINA', 'MIS SESIONES');
  ok(/- Lunes · Piernas \+ Torso \(Fuerza\): Prensa 45°.*Press Banca Plano \(Barra\).*Elevaciones Laterales/.test(rut) && /Rutinas de prueba \(/.test(rut), 'MI RUTINA: el lunes (Piernas + Torso, de otro plan) con sus ejercicios');
  ok(/- Miércoles · Full Body \(Bombeo\) \(Bombeo\): Prensa 45°/.test(rut) && /· plan activo/.test(rut), 'MI RUTINA: el miércoles (bombeo) del plan activo');
  const ses = sec('MIS SESIONES DE LA SEMANA', 'LO QUE TE PIDO');
  ok(/^DÍA LUNES · 2026-10-19 · .* · Piernas \+ Torso · fuerza/m.test(ses) && /^DÍA MIÉRCOLES · 2026-10-21 · .* · Full Body \(Bombeo\) · bombeo/m.test(ses), 'las dos sesiones, cada una con su día y su tipo');
  ok(ses.includes('- Press de Banca en Smith (en lugar de Press Banca Plano (Barra)):'), 'sustituto guardado: "Press de Banca en Smith (en lugar de Press Banca Plano (Barra))"');
  const F = sec('FORMATO OBLIGATORIO'), list = F.split('Ejemplo:')[0];
  ok(list.includes('LUNES (FUERZA): Piernas + Torso → Prensa 45°, Press Banca Plano (Barra), Remo Sentado con Cable, Elevaciones Laterales, Press de Banca en Smith (en lugar de Press Banca Plano (Barra)), Pec Deck Inverso'), 'nombres exactos del lunes: los del plan y los que hice (con su sustituto)');
  ok(/MIÉRCOLES \(BOMBEO\): Full Body \(Bombeo\) → [^;]*Prensa 45°[^;]*Press Militar en Smith/.test(list), 'nombres exactos del miércoles: los del plan y Press Militar en Smith');
  ok(/Es para la semana: un bloque con todos los días de la lista\./.test(F) && !/Para la sesión del día/.test(F), 'semana: solo la instrucción de la semana');
  ok(/Mi objetivo: hipertrofia \(el de la app por defecto/.test(T), 'sin objetivo en Tus datos: el prompt dice Hipertrofia por defecto (no elegido)');
  ok(/MIS DATOS: 31 años · último peso 75[.,]4 kg \(20 oct\.?\)/.test(T), 'MIS DATOS con la edad y el último peso (con su fecha)');
  /* Exportar sesión: al revés */
  const D = await p.evaluate(() => sessionPrompt([state.sessions.find(s => s.id === 't-lun')]));
  const FD = D.slice(D.indexOf('FORMATO OBLIGATORIO'));
  ok(/Es para la sesión del día: un solo día/.test(FD) && !/Para la semana|Es para la semana/.test(FD), 'sesión: solo la instrucción del día');
  ok(FD.includes('Press de Banca en Smith (en lugar de Press Banca Plano (Barra))') && FD.includes('Pec Deck Inverso'), 'sesión: también los nombres que hice');
  /* Reporte de la semana: Copiar solo el reporte; botón aparte para la IA */
  await p.evaluate(() => { state.tab = 'progress'; state.progSub = 'semana'; render(); wcSheet('f'); }); await p.waitForTimeout(300);
  const R = await p.evaluate(() => ({ btn: (document.querySelector('#sheet [data-xp="week"]') || {}).textContent || '', claude: !!document.querySelector('#sheet [data-aix^="claude"]') }));
  if (SHOTS) await p.screenshot({ path: path.join(SHOTS, 'reporte.png') });
  ok(/Exportar semana para IA/.test(R.btn) && !R.claude, 'el reporte tiene "Exportar semana para IA"');
  await p.click('#sheet [data-wc="copy-f"]'); await p.waitForTimeout(300);
  const C = await p.evaluate(() => window.__clip[window.__clip.length - 1] || '');
  ok(C.length > 20 && !/FORMATO OBLIGATORIO|MIS DATOS|MI RUTINA|LO QUE TE PIDO/.test(C), '"Copiar" copia solo el reporte de la semana');
  await p.click('#sheet [data-xp="week"]'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => !!document.querySelector('#sheet .wx-sheet') && /Esta semana/.test(document.querySelector('#sheet .gchip.on').textContent)), '"Exportar semana para IA" abre la exportación de esa semana');
  await p.evaluate(() => { closeSheet(); wcSheet('s'); }); await p.waitForTimeout(300);
  await p.click('#sheet [data-wc="copy-s"]'); await p.waitForTimeout(300);
  ok(!/FORMATO OBLIGATORIO|LO QUE TE PIDO/.test(await p.evaluate(() => window.__clip[window.__clip.length - 1] || '')) && await p.evaluate(() => !!document.querySelector('#sheet [data-xp="week"]')), 'el resumen del domingo: "Copiar" solo el resumen y el botón aparte');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}

console.log('B. El sustituto se guarda al terminar la sesión');
{
  const p = await open(OWNER_SETTINGS);
  const r = await p.evaluate(() => {
    const pl = activePlan(); state.settings.nextS = { 'p1-lun': { pick: 'plan' } }; startSession(pl.id, 'p1-lun');
    const d = state.draft, e = d.exercises[0], was = e.name; e.name = 'Prensa Horizontal'; markSet(0, 0, true); state.rest = null;
    const live = exDraftSession().exercises[0];
    state.durOK = true; finishSession(); state.durOK = false;
    const s = state.sessions.find(x => x.id === d.id), x = s && s.exercises.find(y => y.name === 'Prensa Horizontal');
    return { was, live: live.of, saved: x && x.of, txt: s ? sessionPrompt([s]) : '' };
  });
  ok(r.live === r.was && r.saved === r.was, `cambiar ${r.was} por Prensa Horizontal queda guardado como su sustituto`);
  ok(r.txt.includes(`- Prensa Horizontal (en lugar de ${r.was})`), 'y la exportación lo dice');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}

await browser.close();
console.log(fail ? `\n${fail} FALLAS` : '\nTodo OK');
process.exit(fail ? 1 : 0);
