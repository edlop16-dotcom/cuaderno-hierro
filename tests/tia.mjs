import { OWNER_SETTINGS, seedOwner } from './owner-fixture.mjs';
// Prueba de la Tanda D (aiexport.js): exportar a una IA como coach, formato obligatorio, descanso e importar para entrenar.
// Uso (desde PowerShell): $env:PW_DIR = "<carpeta con node_modules/playwright>"; node tests/tia.mjs <copia transpilada> <copia transpilada anterior> [capturas]
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = createRequire(path.join(process.env.PW_DIR || HERE, 'x.js'))('playwright');
const [DIR, OLD, SHOTS] = process.argv.slice(2);
if (!DIR || !OLD) throw new Error('Faltan las carpetas transpiladas (nueva y anterior)');
const REAL = fs.readFileSync(path.join(HERE, 'importar-ejemplo-sintetico.txt'), 'utf8');
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
const OWNER = OWNER_SETTINGS;
async function open(dir, { seed, watch } = {}) {
  const srv = await serve(dir);
  const ctx = await browser.newContext(watch ? { viewport: { width: 410, height: 500 }, hasTouch: true } : { viewport: { width: 390, height: 844 }, hasTouch: true });
  await ctx.route(/googleapis|gstatic|google\.com|firebase|claude\.ai/, r => r.abort());
  const p = await ctx.newPage(); p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message));
  await p.clock.setFixedTime(new Date('2026-10-19T18:30:00'));
  await seedOwner(p, seed);
  await p.addInitScript(o => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); if (o) { localStorage.setItem('cdh.settings', JSON.stringify(o)); localStorage.setItem('cdh.newsSeen', '"n5"'); } } }, seed || null);
  await p.addInitScript(() => { window.open = () => null; });
  await p.goto(`http://127.0.0.1:${srv.address().port}/index.html`); await p.waitForTimeout(2500);
  await p.evaluate(() => { if (state.settings.pub) state.settings.onb = 1; LS.set('newsSeen', NEWS_KEY); state.settings.healthOk = 1; savePlans(); });
  await p.reload(); await p.waitForTimeout(2200);
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
const clean = t => !/\{[a-záéíóúñ ]+\}|\bundefined\b|\bNaN\b|\bnull\b|no indicado/.test(t.replace(/RECOMENDACIÓN PARA EL PRÓXIMO \{DÍA\}: \{nombre del día de la rutina\}/, ''));
/* Respuesta de ejemplo de una IA: un bloque por día con los nombres exactos */
const ANSWER = (days, opts = {}) => days.map(d => `Análisis… todo bien.\n\nRECOMENDACIÓN PARA EL PRÓXIMO ${d.wd}: ${d.name}\n${opts.nofence ? '' : '```\n'}Ejercicio | Peso | Reps | RIR | Descanso\n` +
  d.ex.map((e, k) => [0, 1, 2].map(j => `${e} | ${100 + k * 5}${j === 2 ? ',5' : ''} | ${k ? '8-10' : 12} | ${2 - j} | ${k ? '1:30' : 120 + j * 10}`).join('\n')).join('\n') + (opts.nofence ? '' : '\n```')).join('\n\n');
const DAYS = n => { const pl = activePlan(); return pl.days.slice(0, n).map(d => ({ id: d.id, pid: pl.id, wd: WDL[d.weekday].toUpperCase(), name: d.name, ex: d.exercises.slice(0, 2).map(e => e.name) })); };
const IMPORT = (txt, sel) => { const pl = activePlan(); nsImportSheet(pl.id, sel || pl.days[pl.days.length - 1].id); document.getElementById('ns-txt').value = txt; state.nsImp.txt = txt; nsRead(); return state.nsEd ? { day: state.nsEd.dayId, n: state.nsEd.n || 1, rows: state.nsEd.rows.map(r => ({ ex: r.exId, sets: r.sets })) } : null; };

console.log('A. Dueño: los tres textos');
{
  const p = await open(DIR, { seed: OWNER });
  const T = await p.evaluate(() => {
    const out = {}; AIX_PER.forEach(([k]) => { const r = aixAllText(k); out[k] = { len: r.txt.length, n: r.n, txt: r.txt }; });
    const s = state.sessions[0]; out.day = sessionPrompt([s]); out.week = wcReportText(); out.sum = wcSumText(); return out;
  });
  console.log(`     todo el historial: 4 semanas ${T['4w'].len} caracteres (${T['4w'].n} sesiones) · 3 meses ${T['3m'].len} (${T['3m'].n}) · todo ${T.all.len} (${T.all.n})`);
  console.log(`     sesión del día: ${T.day.length} caracteres · semana (viernes): ${T.week.length} · resumen del domingo: ${T.sum.length}`);
  const A = T['3m'].txt;
  ok(/^Actúa como mi entrenador personal experto en hipertrofia y fuerza\. Analiza mi historial de últimos 3 meses:/.test(A), 'historial: prompt de coach arriba con el período');
  ok(['MIS DATOS:', 'MI PLAN ACTUAL:', 'MIS SESIONES', 'RÉCORDS Y 1RM ESTIMADO:', 'SERIES POR MÚSCULO Y SEMANA', 'RACHA:', 'FORMATO OBLIGATORIO'].every(k => A.indexOf(k) >= 0), 'datos, plan, sesiones, récords y 1RM, series por músculo, racha y formato');
  ok(/descanso \d/.test(A) && /\(rutina\)/.test(A), 'cada ejercicio con su descanso (en las viejas, el de la rutina)');
  ok(/Considera mi edad \(31 años\)(?:,| y) mi peso \([\d,.]+ kg\)/.test(A), 'edad y peso llenados');
  ok(clean(A) && clean(T.day) && clean(T.week), 'sin {} ni huecos');
  ok(!/[\w.-]+@[\w-]+\.[a-z]{2,}|\bacc\b/i.test(A), 'sin correo ni cuenta');
  const FD = t => ((t.split('FORMATO OBLIGATORIO')[1] || '').split('Ejemplo:')[0].match(/\b(LUNES|MARTES|MIÉRCOLES|JUEVES|VIERNES|SÁBADO|DOMINGO): [^→;]+ → /g) || []).length;
  ok(FD(A) >= 3 && /UN SOLO bloque de código/.test(A) && /'DÍA: nombre'/.test(A), 'formato nuevo: un solo bloque con "DÍA: nombre" y los ejercicios de cada día de la rutina activa');
  ok(/^Actúa como mi entrenador personal experto en hipertrofia y fuerza, con criterio basado en evidencia\./.test(T.day) && FD(T.day) === 0 && /nombre EXACTO de esta lista [^;]+, igual en todas sus filas/.test(T.day), 'sesión del día: su prompt y la lista de un solo día');
  ok(/^Actúa como mi entrenador personal experto en hipertrofia\. Analiza mi semana completa:/.test(T.week) && /entreno \d días en Gimnasio/.test(T.week), 'semana: su prompt con días y gimnasio');
  fs.mkdirSync(SHOTS || '.', { recursive: true }); if (SHOTS) { fs.writeFileSync(path.join(SHOTS, 'historial-3m.txt'), A); fs.writeFileSync(path.join(SHOTS, 'dia.txt'), T.day); fs.writeFileSync(path.join(SHOTS, 'semana.txt'), T.week); }
  /* Sesión editada: sale con sus datos corregidos */
  const ed = await p.evaluate(() => { const s = state.sessions[0]; s.edited = Date.now(); s.exercises[0].sets[0].w = 123.5; saveLocal(); return aixAllText('4w').txt; });
  ok(/editada/.test(ed) && /123[.,]5×/.test(ed), 'la sesión editada sale con sus datos corregidos');
  /* Botones y hoja */
  await p.evaluate(() => { state.tab = 'progress'; state.progSub = 'semana'; render(); });
  ok(await p.locator('#app .aix-row').count() === 1, 'botón "Exportar todo para tu IA" en Progreso');
  await p.locator('#app .aix-row').click(); await p.waitForTimeout(300);
  ok(/3 meses/.test(await p.evaluate(() => document.querySelector('#sheet .gchip.on').textContent)), 'por defecto, 3 meses');
  ok(await p.locator('#sheet [data-aix="txt"]').count() === 1, 'texto largo: "Guardar .txt"');
  await shot(p, 'a1-exportar');
  await p.evaluate(() => closeSheet()); await p.evaluate(() => { state.tab = 'profile'; render(); });
  ok(await p.locator('#app .aix-row').count() === 1, 'y en Perfil');
  /* Ajustes → Coach IA */
  const P = await p.evaluate(() => { state.settings.aiP = { day: 'Hola coach. Mi objetivo es {objetivo}. Revisa esto.' }; const t = sessionPrompt([state.sessions[0]]); state.settings.aiP = {}; return t; });
  ok(/^Hola coach\. Mi objetivo es .+\. Revisa esto\./.test(P) && /FORMATO OBLIGATORIO/.test(P), 'instrucciones editadas en Ajustes y el formato obligatorio sigue al final');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}

console.log('B. Descanso guardado en cada sesión nueva');
{
  const p = await open(DIR, { seed: OWNER });
  const r = await p.evaluate(() => { const pl = activePlan(), d = pl.days[0]; state.settings.nextS = {}; startSession(pl.id, d.id); state.draft.exercises[0].rest = 135; markSet(0, 0, true); state.durOK = true; finishSession(); state.durOK = false; return state.sessions[0].exercises[0].rest; });
  ok(r === 135, 'la sesión guarda el descanso de cada ejercicio (' + r + ' s)');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}

console.log('C. Importar');
{
  const p = await open(DIR, { seed: OWNER });
  const one = await p.evaluate(([A, D, I]) => { const d = (new Function('return ' + D))()(1), r = (new Function('return ' + I))()((new Function('return ' + A))()(d), activePlan().days[2].id); return { want: d[0].id, r }; }, [ANSWER.toString(), DAYS.toString(), IMPORT.toString()]);
  ok(one.r && one.r.day === one.want, 'bloque de 1 día: toma el día del título (aunque elegí otro)');
  const s0 = one.r && one.r.rows[0].sets;
  ok(s0 && s0.length === 3 && s0[0].w === 100 && s0[2].w === 100.5 && s0[0].rMax === 12 && s0[1].rir === 1 && s0[0].rest === 120 && s0[2].rest === 140, 'una fila por serie: peso, reps, RIR y descanso de cada una');
  ok(one.r && one.r.rows[1].sets[0].rest === 90 && one.r.rows[1].sets[0].rMin === 8, 'descanso "1:30" = 90 s y reps 8-10');
  await shot(p, 'c1-vista-previa');
  await p.evaluate(() => nsSaveEd()); await p.waitForTimeout(200);
  ok(await p.locator('#sheet [data-aix="go"]').count() === 1, 'tras guardar: "Entrenar ahora"');
  await shot(p, 'c2-entrenar-ahora');
  await p.locator('#sheet [data-aix="go"]').click(); await p.waitForTimeout(600);
  const dr = await p.evaluate(() => { const d = state.draft; return d.exercises.slice(0, 2).map(e => ({ n: e.name, w: e.log.map(s => s.w), rmax: e.repsMax, rir: e.rirT, rest: e.rest })); });
  ok(dr[0].w.join() === '100,100,100.5' && dr[0].rest === 120 && JSON.stringify(dr[0].rir) === '[2,1,0]', `sesión con la importada: ${dr[0].n} ${dr[0].w.join('/')} kg, RIR ${dr[0].rir.join('·')}, descanso ${dr[0].rest} s`);
  ok(dr[1].rest === 90, 'el temporizador de cada ejercicio usa su descanso importado');
  await p.evaluate(() => { markSet(0, 0, true); }); await p.waitForTimeout(200);
  ok(await p.evaluate(() => state.rest && Math.round(state.rest.total) === 120), 'al marcar, el descanso dura 120 s');
  await p.evaluate(() => discardSession());
  const three = await p.evaluate(([A, D, I]) => { const d = (new Function('return ' + D))()(3); (new Function('return ' + I))()((new Function('return ' + A))()(d)); const days = []; for (let k = 0; k < 3; k++) { days.push(state.nsEd && state.nsEd.dayId); nsSaveEd(); } return { want: d.map(x => x.id), days, ia: d.map(x => !!nsIa(x.id)) }; }, [ANSWER.toString(), DAYS.toString(), IMPORT.toString()]);
  ok(JSON.stringify(three.days) === JSON.stringify(three.want) && three.ia.every(Boolean), 'bloque de 3 días: cada uno a su día, con su vista previa');
  await p.evaluate(() => closeSheet());
  const nf = await p.evaluate(([A, D, I]) => { const d = (new Function('return ' + D))()(1); return (new Function('return ' + I))()((new Function('return ' + A))()(d, { nofence: 1 })); }, [ANSWER.toString(), DAYS.toString(), IMPORT.toString()]);
  ok(nf && nf.rows.length === 2 && nf.rows[0].sets.length === 3, 'bloque sin las comillas: se lee igual');
  await p.evaluate(() => closeSheet());
  const nw = await p.evaluate(([D, I]) => { const d = (new Function('return ' + D))()(1)[0]; const t = `RECOMENDACIÓN PARA EL PRÓXIMO ${d.wd}: ${d.name}\n\`\`\`\nEjercicio | Peso | Reps | RIR | Descanso\n${d.ex[0]} | 100 | 12 | 2 | 120\nElevación de Talones en Prensa | 70 | 15 | 2 | 60\nElevación de Talones en Prensa | 70 | 15 | 1 | 60\n\`\`\``; const r = (new Function('return ' + I))()(t); nsSaveEd(); state.aixGo && document.querySelector('#sheet [data-aix="go"]').click(); const e = state.draft && state.draft.exercises.find(x => x.name === 'Elevación de Talones en Prensa'); return { ex: r.rows.map(x => x.ex), e: e ? { w: e.log.map(s => s.w), rest: e.rest, added: e.added } : null, plan: activePlan().days[0].exercises.some(x => x.name === 'Elevación de Talones en Prensa') }; }, [DAYS.toString(), IMPORT.toString()]);
  ok(nw.ex[1] === 'new:Elevación de Talones en Prensa', 'un ejercicio nuevo se propone "agregar solo esa sesión"');
  ok(nw.e && nw.e.w.join() === '70,70' && nw.e.rest === 60 && !nw.plan, 'entrena con el ejercicio nuevo solo hoy; la rutina no cambia');
  await p.evaluate(() => { if (state.draft) discardSession(); closeSheet(); });
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}

console.log('D. Ejemplo sintético (formato viejo de 4 columnas): igual que antes');
{
  const a = await open(DIR, { seed: OWNER }), b = await open(OLD, { seed: OWNER });
  const f = t => JSON.stringify(nsParse(t));
  const A = await a.evaluate(f.toString().replace('t =>', 't =>') && (t => JSON.stringify(nsParse(t))), REAL), B = await b.evaluate(t => JSON.stringify(nsParse(t)), REAL);
  ok(A === B && JSON.parse(A).rows.length >= 5, 'se lee exactamente igual que antes (' + JSON.parse(A).rows.length + ' ejercicios)');
  const ask = await a.evaluate(() => nsAskText(activePlan().days[0]));
  ok(/FORMATO OBLIGATORIO/.test(ask) && /Ejercicio \| Peso \| Reps \| RIR \| Descanso/.test(ask), '"Copiar instrucción para tu IA" lleva el formato obligatorio');
  await a.done(); await b.done();
}

console.log('E. Usuario nuevo sin sesiones');
{
  const p = await open(DIR, {});
  const T = await p.evaluate(() => ({ all: aixAllText('3m'), day: aixHead('day'), week: aixHead('week') }));
  ok(T.all.n === 0 && /Aún no tengo sesiones registradas/.test(T.all.txt), 'mensaje claro sin sesiones');
  ok(clean(T.all.txt) && clean(T.day) && clean(T.week), 'sin {} ni "no indicado" ni huecos');
  await p.evaluate(() => { state.tab = 'progress'; state.progSub = 'semana'; render(); }); await p.locator('#app .aix-row').click(); await p.waitForTimeout(300);
  ok(/Aún no tienes entrenamientos en este período/.test(await p.evaluate(() => document.getElementById('sheet').innerText)), 'la hoja lo explica');
  await shot(p, 'e1-nuevo');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}

console.log('F. Reloj');
{
  const p = await open(DIR, { seed: OWNER, watch: true }), q = await open(OLD, { seed: OWNER, watch: true });
  const d = await pixDiff(await shot(p, 'f1-reloj'), await shot(q, 'f1-reloj-antes'));
  ok(d === 0, 'inicio del reloj idéntico' + (d ? ` (${d} px)` : ''));
  const r = await p.evaluate(() => { const pl = activePlan(), dd = pl.days[0], e = dd.exercises[0]; const n = nsSet(dd.id); n.ia = { at: Date.now(), plan: pl.id, ex: [{ exId: e.id, name: e.name, sets: [{ w: 50, rMin: 10, rMax: 10, rir: 2, rest: 75 }, { w: 50, rMin: 10, rMax: 10, rir: 1, rest: 75 }] }] }; delete n.pick; savePlans(); startSession(pl.id, dd.id); const x = state.draft.exercises[0]; return { w: x.log.map(s => s.w), rest: x.rest }; });
  ok(r.w.join() === '50,50' && r.rest === 75, 'el reloj entrena con la importada y su descanso');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done(); await q.done();
}

await browser.close();
console.log(fail ? `\n${fail} FALLA(S)` : '\nTodo OK');
process.exit(fail ? 1 : 0);
