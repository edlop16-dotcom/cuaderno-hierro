import { OWNER_SETTINGS } from './owner-fixture.mjs';
// Prueba de la rama progreso, con datos inventados: récords en vivo, meta de peso, equilibrio y agua.
// Uso (desde PowerShell): $env:PW_DIR = "<carpeta con node_modules/playwright>"; node tests/tprog.mjs <copia transpilada>
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
const T0 = Date.parse('2026-11-05T18:00:00');
let N = 0; const X = (name, sets, w) => ({ id: 'x' + (++N), name, type: 'Piernas', weight: w, sets, repsMin: 8, repsMax: 12, rest: 90 });
const PLAN = ex => ({ id: 'pA', name: 'Rutina A', gymId: 'rokaz', days: [{ id: 'dA', name: 'Pierna', weekday: 4, kind: 'fuerza', exercises: ex }] });
const SET = (extra, prof) => { const s = Object.assign(structuredClone(OWNER_SETTINGS), { activePlanId: 'pA', activeGymId: 'rokaz', planByGym: { rokaz: 'pA' }, newsSeen: 'n6', healthOk: 1 }, extra || {}); s.prof = Object.assign({}, s.prof, { goal: 'musculo', exp: 2 }, prof); return s; };
const S = (id, ago, ex) => ({ id, date: new Date(T0 - ago * 864e5).toISOString(), planId: 'pA', planName: '', dayId: 'dA', dayName: 'x', gymId: 'rokaz', gymName: 'Gimnasio A', kind: 'fuerza', durationSec: 3000, exercises: ex.map(([n, sets]) => ({ name: n, sets })) });
const R = (w, r, c) => Array.from({ length: c || 1 }, () => ({ w, r, rir: 2 }));
async function open({ watch, settings, sessions, plans, first } = {}) {
  const srv = await serve(DIR);
  const ctx = await browser.newContext(watch ? { viewport: { width: 410, height: 500 }, hasTouch: true } : { viewport: { width: 390, height: 844 }, hasTouch: true });
  await ctx.route(/googleapis|gstatic|google\.com|firebase|github/, r => r.abort());
  const p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
  await p.clock.setFixedTime(new Date(T0));
  if (!first) await p.addInitScript(([s, pl, ss]) => { if (localStorage.getItem('cdh.seeded')) return; localStorage.setItem('cdh.seeded', '1'); localStorage.setItem('cdh.settings', JSON.stringify(s)); localStorage.setItem('cdh.plans', JSON.stringify(pl)); localStorage.setItem('cdh.sessions', JSON.stringify(ss)); localStorage.setItem('cdh.gyms', JSON.stringify([{ id: 'rokaz', name: 'Gimnasio A' }])); localStorage.setItem('cdh.newsSeen', '"n6"'); localStorage.setItem('cdh.reminders', '[]'); }, [settings || SET(), plans || [PLAN([X('Sentadilla Hack', 3, 50)])], sessions || []]);
  await p.goto(`http://127.0.0.1:${srv.address().port}/index.html`); await p.waitForTimeout(1500);
  if (!first) await p.evaluate(() => { closeSheet(); window.__t = []; const f = toast; toast = function (m) { window.__t.push(m); return f.apply(this, arguments); }; render(); });
  p.done = async () => { await ctx.close(); srv.close(); };
  return p;
}
const noErr = p => ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
const start = p => p.evaluate(() => { state.settings.nextS = { dA: { pick: 'plan' } }; startSession('pA', 'dA'); render(); });
const mark = (p, n, j, w, r) => p.evaluate(([n, j, w, r]) => { const d = state.draft, i = d.exercises.findIndex(e => e.name === n), s = d.exercises[i].log[j]; s.w = w; s.r = r; s.rir = 2; markSet(i, j, true); }, [n, j, w, r]);
const toasts = p => p.evaluate(() => window.__t.slice());

console.log('1. Récords en vivo');
{
  const p = await open({ sessions: [S('a', 3, [['Sentadilla Hack', R(50, 15, 3)]])] }); await start(p); await p.waitForTimeout(150);
  await mark(p, 'Sentadilla Hack', 0, 50, 14); ok(!(await toasts(p)).some(t => /Récord/.test(t)), 'sin superar tu marca: no avisa');
  await mark(p, 'Sentadilla Hack', 1, 50, 16); let t = await toasts(p); console.log('      aviso:', t.filter(x => /Récord/.test(x)).join(' | '));
  ok(t.some(x => x === '¡Récord en Sentadilla Hack: 50×16!'), 'misma carga, más repeticiones: avisa');
  await mark(p, 'Sentadilla Hack', 2, 50, 16); t = await toasts(p); ok(t.filter(x => /Récord/.test(x)).length === 1, 'igualarlo en la siguiente serie no repite el aviso');
  noErr(p); await p.done();
  const q = await open({ sessions: [S('a', 3, [['Sentadilla Hack', R(50, 15, 1)]])] }); await start(q); await q.waitForTimeout(100); await mark(q, 'Sentadilla Hack', 0, 60, 15);
  ok((await toasts(q)).some(x => /Récord en Sentadilla Hack: 60×15/.test(x)), 'más peso, mismas repeticiones: avisa'); noErr(q); await q.done();
  const n = await open(); await start(n); await n.waitForTimeout(100); await mark(n, 'Sentadilla Hack', 0, 60, 15);
  ok(!(await toasts(n)).some(x => /Récord/.test(x)), 'la primera vez no es récord: no hay marca que superar'); noErr(n); await n.done();
  const o = await open({ sessions: [Object.assign(S('a', 3, [['Sentadilla Hack', R(90, 15, 1)]]), { gymId: 'otro', gymName: 'Otro' }), S('b', 2, [['Sentadilla Hack', R(50, 15, 1)]])] }); await start(o); await o.waitForTimeout(100); await mark(o, 'Sentadilla Hack', 0, 55, 15);
  ok((await toasts(o)).some(x => /Récord/.test(x)), 'compara solo con ese gimnasio'); noErr(o); await o.done();
}

console.log('2. Meta de peso corporal');
{
  const W = list => list.map(([ago, kg]) => { const t = new Date(T0 - ago * 864e5); return { d: `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`, kg }; });
  const flat = W([[28, 75], [21, 75], [14, 75], [7, 74.9], [0, 75]]);
  const p = await open({ settings: SET({ body: { w: flat, m: [], goalKg: 78 } }) });
  await p.evaluate(() => { state.tab = 'profile'; state.profSub = 'body'; render(); }); await p.waitForTimeout(200);
  const t = await p.evaluate(() => { const n = document.querySelector('.pr-w'); return n ? n.innerText.replace(/\s+/g, ' ') : ''; }); console.log('      en Perfil:', t);
  ok(/Te faltan 3 kg para tu meta de 78 kg/.test(t), 'cuánto falta, con el peso que ya registras');
  ok(/Esta semana: \+0,1 kg|Esta semana: \+0.1 kg/.test(t), 'tendencia semanal');
  ok(/come un poco más/.test(t), 'objetivo ganar músculo y 3 semanas sin subir: sugiere comer un poco más');
  ok(!/kcal|calor/i.test(t), 'sin calorías');
  ok(await p.evaluate(() => document.querySelectorAll('.pr-w').length === 1 && document.querySelectorAll('#f-bdw').length === 1), 'no crea otro lugar para anotar el peso');
  await p.evaluate(() => { document.getElementById('pr-goal').value = '500'; document.querySelector('[data-pr="goal"]').click(); }); await p.waitForTimeout(80);
  ok((await p.evaluate(() => body().goalKg)) === 78, 'una meta imposible no se guarda');
  await p.evaluate(() => { document.getElementById('pr-goal').value = '80,5'; document.querySelector('[data-pr="goal"]').click(); }); await p.waitForTimeout(100);
  ok((await p.evaluate(() => body().goalKg)) === 80.5, 'guarda la meta (acepta coma)');
  noErr(p); await p.done();
  const up = await open({ settings: SET({ body: { w: W([[28, 74], [21, 74.5], [14, 75], [7, 75.5], [0, 76]]), m: [] } }) }); ok(await up.evaluate(() => !prWeightInfo().stuck), 'si subes: no dice nada'); noErr(up); await up.done();
  const fat = await open({ settings: SET({ body: { w: flat, m: [] } }, { goal: 'grasa' }) }); ok(await fat.evaluate(() => !prWeightInfo().stuck), 'con otro objetivo: no sugiere comer más'); noErr(fat); await fat.done();
  const s = SET({ body: { w: flat, m: [] } }); delete s.prof;
  const no = await open({ settings: s }); ok(await no.evaluate(() => !prWeightInfo().stuck), 'sin objetivo elegido: no supone nada'); noErr(no); await no.done();
}

console.log('3. Equilibrio para la postura');
{
  const push = [['Press Banca Plano (Barra)', R(60, 10, 4)], ['Press Inclinado con Mancuernas', R(20, 10, 4)], ['Press Militar (Mancuernas)', R(16, 10, 3)]], pull = [['Remo Sentado con Cable', R(50, 10, 3)]];
  const plan = PLAN([X('Press Banca Plano (Barra)', 3, 60), X('Remo Sentado con Cable', 3, 50)]);
  const p = await open({ sessions: [S('a', 1, push.concat(pull))], plans: [plan] });
  const B = await p.evaluate(() => { const b = prBalance(0), f = wcSumOff; wcSumOff = () => 0; const s = wcSumHtml(); wcSumOff = f; return b && { t: b.txt, s, r: wcReportHtml() }; });
  console.log('      aviso:', B && B.t);
  ok(B && /11 series de empuje frente a 3 de jalón/.test(B.t), 'cuenta empuje y jalón de la semana');
  ok(B && /suma /.test(B.t), 'sugiere un ejercicio');
  ok(B && B.s.includes('pr-bal') && B.r.includes('pr-bal'), 'sale en el resumen y en el reporte semanal');
  const off = await p.evaluate(() => { const g = activeGym().id; const n = prBalance(0).ex, e = (libFind(n) || {}); gymNoSet(g, e.eq, true); return { n, now: prBalance(0).ex }; }); console.log('      sin esa máquina:', JSON.stringify(off));
  ok(off.n !== off.now, 'solo sugiere lo disponible en tu gimnasio');
  noErr(p); await p.done();
  const q = await open({ sessions: [S('a', 1, [['Press Banca Plano (Barra)', R(60, 10, 4)], ['Remo Sentado con Cable', R(50, 10, 4)]])], plans: [plan] });
  ok(await q.evaluate(() => prBalance(0) === null), 'equilibrado: no dice nada'); noErr(q); await q.done();
}

console.log('4. Agua en sesiones largas');
{
  const p = await open(); await start(p); await p.waitForTimeout(100);
  await p.evaluate(() => tick()); ok(!(await toasts(p)).some(t => /Toma agua/.test(t)), 'antes de 60 min: nada');
  await p.clock.setFixedTime(new Date(T0 + 61 * 60000)); await p.evaluate(() => { tick(); tick(); }); await p.waitForTimeout(50);
  let t = await toasts(p); ok(t.filter(x => x === 'Toma agua; si sudas mucho, con una pizca de sal').length === 1, 'a los 61 min: una sola vez');
  await p.reload(); await p.waitForTimeout(1200); await p.evaluate(() => { window.__t = []; const f = toast; toast = function (m) { window.__t.push(m); return f.apply(this, arguments); }; tick(); });
  ok(!(await toasts(p)).some(x => /Toma agua/.test(x)), 'cerrar y abrir la app no lo repite'); noErr(p); await p.done();
  const q = await open(); await q.evaluate(() => { state.tab = 'settings'; render(); document.querySelectorAll('details').forEach(d => { d.open = true; }); }); await q.waitForTimeout(100);
  ok(await q.evaluate(() => { const b = document.querySelector('[data-pr="water"]'); if (!b) return false; b.click(); return state.settings.waterTip === false; }), 'se apaga en Ajustes');
  await start(q); await q.clock.setFixedTime(new Date(T0 + 61 * 60000)); await q.evaluate(() => tick());
  ok(!(await toasts(q)).some(x => /Toma agua/.test(x)), 'apagado: no sale'); noErr(q); await q.done();
}

console.log('5. Usuario nuevo y reloj');
{
  const p = await open({ first: true }); ok(await p.evaluate(() => typeof prBalance === 'function' && prBalance(0) === null), 'usuario nuevo: abre sin datos'); noErr(p); await p.done();
  const w = await open({ watch: true, sessions: [S('a', 3, [['Sentadilla Hack', R(50, 15, 1)]])] }); await start(w); await w.waitForTimeout(150); await mark(w, 'Sentadilla Hack', 0, 90, 15);
  await w.clock.setFixedTime(new Date(T0 + 61 * 60000)); await w.evaluate(() => tick()); const t = await toasts(w);
  ok(!t.some(x => /Récord en Sentadilla Hack: 90|Toma agua/.test(x)) && t.some(x => /🛡️ ¡Récord en Sentadilla Hack! 90 kg × 15/.test(x)), 'reloj: su aviso sigue igual y no hay ninguno nuevo'); ok(await w.evaluate(() => !alertSettingsCard().includes('pr-wat')), 'reloj: Ajustes igual'); noErr(w); await w.done();
}

await browser.close();
console.log(fail ? `\n${fail} FALLAS` : '\nTodo OK');
process.exit(fail ? 1 : 0);
