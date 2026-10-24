import { OWNER_SETTINGS, seedOwner } from './owner-fixture.mjs';
// Prueba: formato de exportación con el día DENTRO del bloque, ida y vuelta (aiexport.js, next.js, rimport.js).
// Uso (desde PowerShell): $env:PW_DIR = "<carpeta con node_modules/playwright>"; node tests/tfmt.mjs <copia transpilada> <copia transpilada anterior> [capturas]
// A. Dueño: exportar día, semana, historial y "Copiar instrucción" con el formato nuevo → respuesta inventada → "Importar
//    recomendación" (cada día a su día; series, peso, reps, RIR y descanso) y "Importar rutinas" (nombre tras los dos puntos,
//    día, series, RIR por serie, descanso); variantes: título viejo fuera del bloque, sin bloque, con espacios, día que no está
//    en el plan, "Entrenar ahora". Formato viejo (tests/importar-ejemplo-sintetico.txt) igual que la versión anterior.
// B. "Importar rutinas" con otros formatos: espacios, una celda por línea, columna Día, "DÍA LUNES:" largo, nada → "Copiar formato".
// C. Usuario nuevo: ida y vuelta con su rutina. D. Reloj: inicio y sesión idénticos a la versión anterior.
// Todos los datos (pesos, nombres de rutinas, textos de la IA) son inventados.
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
const OWNER = OWNER_SETTINGS;

async function open(dir, { seed, watch } = {}) {
  const srv = await serve(dir);
  const ctx = await browser.newContext(watch ? { viewport: { width: 410, height: 500 }, hasTouch: true } : { viewport: { width: 390, height: 844 }, hasTouch: true });
  await ctx.route(/googleapis|gstatic|google\.com|firebase/, r => r.abort());
  const p = await ctx.newPage(); p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message));
  await p.clock.setFixedTime(new Date('2026-10-19T10:30:30'));
  await seedOwner(p, seed);
  await p.addInitScript(o => {
    if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); if (o) { localStorage.setItem('cdh.settings', JSON.stringify(o)); localStorage.setItem('cdh.newsSeen', '"n6"'); } }
    window.__clip = []; try { Object.defineProperty(navigator, 'clipboard', { value: { writeText: t => { window.__clip.push(t); return Promise.resolve(); } } }); } catch (e) {}
  }, seed || null);
  p.url0 = `http://127.0.0.1:${srv.address().port}/index.html`;
  await p.goto(p.url0); await p.waitForTimeout(2500);
  await p.evaluate(() => { if (state.settings.pub) state.settings.onb = 1; LS.set('newsSeen', NEWS_KEY); state.settings.healthOk = 1; savePlans(); });
  await p.reload(); await p.waitForTimeout(2500);
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

/* Días de la rutina activa (ordenados de lunes a domingo) y una respuesta inventada de la IA */
const planDays = p => p.evaluate(() => { const pl = activePlan(); return pl.days.slice().sort((a, b) => ((a.weekday + 6) % 7) - ((b.weekday + 6) % 7)).map(d => ({ id: d.id, wd: d.weekday, WD: WDL[d.weekday].toUpperCase(), name: d.name, ex: d.exercises.map(e => e.name) })); });
const SETS = [[[52.5, '10', 2, 120], [52.5, '10', 1, 120]], [[22, '12-15', 2, 90], [22, '12-15', 1, 90], [22, '12-15', 0, 90]]];   // inventado
const block = (d, sep = ' | ') => `${d.WD}: ${d.name}\n${['Ejercicio', 'Peso', 'Reps', 'RIR', 'Descanso'].join(sep)}\n` +
  d.ex.slice(0, 2).map((n, i) => SETS[i].map(s => [n, String(s[0]).replace('.', ','), s[1], s[2], s[3]].join(sep)).join('\n')).join('\n');
const answer = (days, o = {}) => `Buen trabajo esta semana. Sube poco a poco y cuida la técnica.\n\n` +
  (o.old ? days.map(d => `RECOMENDACIÓN PARA EL PRÓXIMO ${d.WD}: ${d.name}\n\`\`\`\n${block(d, o.sep).split('\n').slice(1).join('\n')}\n\`\`\``).join('\n\n')
    : `${o.nofence ? '' : '```\n'}${days.map(d => block(d, o.sep)).join('\n\n')}${o.nofence ? '' : '\n```'}`) + '\n\nCualquier duda, me dices.';
/* Comprueba lo guardado por "Importar recomendación" en settings.nextS */
const iaOf = (p, ids) => p.evaluate(ids => ids.map(id => { const n = (state.settings.nextS || {})[id]; return n && n.ia ? n.ia.ex.map(x => ({ name: x.name, sets: x.sets.map(t => [t.w, t.rMin, t.rMax, t.rir, t.rest]) })) : null; }), ids);
const wantIa = d => d.ex.slice(0, 2).map((n, i) => ({ name: n, sets: SETS[i].map(s => { const r = s[1].split('-').map(Number); return [s[0], r[0], r[r.length - 1], s[2], s[3]]; }) }));
async function importReco(p, d0, txt) {
  await p.evaluate(d => { closeSheet(); Object.keys(state.settings.nextS || {}).forEach(k => delete state.settings.nextS[k].ia); nsImportSheet(activePlan().id, d); }, d0.id);
  await p.waitForTimeout(250); await p.fill('#ns-txt', txt); await p.click('#sheet [data-ns="read"]'); await p.waitForTimeout(350);
  const seen = [];
  for (let k = 0; k < 8; k++) {
    const h = await p.evaluate(() => { const s = document.querySelector('#sheet'); return s.hidden ? null : { t: s.querySelector('h2').textContent, help: (s.querySelector('.ns-help') || {}).textContent || '', skip: (s.querySelector('.aix-skip') || {}).textContent || '', save: !!s.querySelector('[data-ns="save"]') }; });
    if (!h || !h.save) break;
    seen.push(h); await p.click('#sheet [data-ns="save"]'); await p.waitForTimeout(300);
  }
  return seen;
}

console.log('A. Dueño: ida y vuelta');
{
  const p = await open(DIR, { seed: OWNER }), D = await planDays(p);
  console.log('     rutina activa: ' + D.map(d => `${d.WD} ${d.name}`).join(' · '));
  /* 1. Exportar */
  const X = await p.evaluate(() => { const s = state.sessions[0], d = aixDayOf(s); return { day: sessionPrompt([s]), dayName: d.name, dayEx: d.exercises.map(e => e.name), week: wcReportText(), sum: wcSumText(), all: aixAllText('3m').txt, ask: nsAskText(activePlan().days[0]), askEx: activePlan().days[0].exercises.map(e => e.name), rut: aixFormat([]) }; });
  const F = t => t.slice(t.indexOf('FORMATO OBLIGATORIO'));
  const groups = t => (F(t).split('Ejemplo:')[0].match(/\b(LUNES|MARTES|MIÉRCOLES|JUEVES|VIERNES|SÁBADO|DOMINGO) \((FUERZA|BOMBEO)\): [^→;]+ → /g) || []).length;
  const core = /UN SOLO bloque de código con todo lo que debo importar\. Dentro del bloque, antes de cada tabla, una línea con el día, el tipo de sesión y el nombre de la rutina: 'DÍA \(TIPO\): nombre' \(DÍA: LUNES, MARTES, MIÉRCOLES, JUEVES, VIERNES, SÁBADO o DOMINGO; TIPO: FUERZA o BOMBEO, el de ese día en mi rutina\)(?: \(aquí: .+?\))?\. Debajo, el encabezado exacto 'Ejercicio \| Peso \| Reps \| RIR \| Descanso' y una fila por SERIE en el orden en que se hacen\./;
  const tail = /Peso: solo el número en kg \(0 = peso corporal; mancuernas = una\)\. Reps: número o rango\. RIR: 0 a 4\. Descanso: segundos\. Una línea en blanco entre días\. Nada de texto, notas, emojis ni negritas dentro del bloque\. Para la sesión del día: un solo día \(el próximo de esa rutina\)\. Para la semana: un bloque con todos los días de la rutina activa\./;
  const ex = /Ejemplo:\n```\nLUNES \(FUERZA\): Piernas \+ Torso \(Pesado\)\nEjercicio \| Peso \| Reps \| RIR \| Descanso\nPrensa 45° \| 180 \| 12 \| 2 \| 150\nPrensa 45° \| 180 \| 12 \| 1 \| 150\n\nMIÉRCOLES \(BOMBEO\): Full Body \(Bombeo\)\nEjercicio \| Peso \| Reps \| RIR \| Descanso\nHip Thrust \| 45 \| 12 \| 2 \| 120\n```$/;
  for (const [k, t] of [['día', X.day], ['semana (viernes)', X.week], ['resumen (domingo)', X.sum], ['historial', X.all], ['Copiar instrucción', X.ask]]) ok(core.test(t) && tail.test(t) && ex.test(t) && !/RECOMENDACIÓN PARA EL PRÓXIMO/.test(F(t)), `${k}: formato nuevo completo con el ejemplo y sin el título viejo`);
  ok(groups(X.day) === 0 && F(X.day).indexOf(`nombre EXACTO de esta lista ${X.dayEx.join(', ')}, igual en todas sus filas; si es nuevo, nombre completo con el equipo.`) >= 0, `día: los nombres exactos de «${X.dayName}»`);
  ok(groups(X.week) === D.length && D.every(d => F(X.week).indexOf(`${d.WD} (`) >= 0 && F(X.week).indexOf(`): ${d.name} → ${d.ex.join(', ')}`) >= 0), `semana: los ${D.length} días de la rutina activa, cada uno con sus ejercicios`);
  ok(groups(X.all) === D.length, 'historial: también todos los días');
  ok(groups(X.ask) === 0 && F(X.ask).indexOf(X.askEx.join(', ')) >= 0, '"Copiar instrucción para tu IA": el día elegido');
  ok(/nombre completo con el equipo \(por ejemplo/.test(X.rut) && !/esta lista/.test(X.rut), 'formato para importar rutinas: sin lista, nombre completo con el equipo');
  if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); fs.writeFileSync(path.join(SHOTS, 'export-dia.txt'), X.day); fs.writeFileSync(path.join(SHOTS, 'export-semana.txt'), X.week); }

  /* 2. Importar recomendación: formato nuevo (varios días, cada uno a su día) */
  const R = D.slice(0, 3), ids = R.map(d => d.id), TXT = answer(R);
  if (SHOTS) fs.writeFileSync(path.join(SHOTS, 'respuesta-ia.txt'), TXT);
  let seen = await importReco(p, D[D.length - 1], TXT);
  ok(seen.length === R.length && seen.every((h, i) => h.t.indexOf(WDL(R[i].wd)) >= 0), `una vista previa por día y cada una a su día (${seen.map(h => h.t).join(' / ')})`);
  let G = await iaOf(p, ids);
  ok(R.every((d, i) => JSON.stringify(G[i]) === JSON.stringify(wantIa(d))), 'cada día con sus ejercicios, series, peso, reps, RIR y descanso por serie');
  if (JSON.stringify(G[0]) !== JSON.stringify(wantIa(R[0]))) console.log('     leído: ' + JSON.stringify(G[0]) + '\n     quería: ' + JSON.stringify(wantIa(R[0])));
  /* Variantes */
  for (const [lbl, txt] of [['título viejo fuera del bloque', answer(R, { old: 1 })], ['sin bloque de código', answer(R, { nofence: 1 })], ['tabla con espacios en vez de "|"', answer(R, { sep: ' ' })],
    ['título viejo fuera + línea del día dentro', answer(R).replace('```\n' + R[0].WD, 'RECOMENDACIÓN PARA EL PRÓXIMO ' + R[0].WD + ': ' + R[0].name + '\n```\n' + R[0].WD)]]) {
    seen = await importReco(p, D[D.length - 1], txt); G = await iaOf(p, ids);
    ok(seen.length === R.length && R.every((d, i) => JSON.stringify(G[i]) === JSON.stringify(wantIa(d))), `${lbl}: igual (${seen.length} días)`);
  }
  /* Un bloque con tres días SIN Descanso: conservar tanto filas por serie como listas RIR. */
  const four = '```\n' + R.map(d => block(d).split('\n').map(line => line.includes('|') ? line.split('|').slice(0, 4).join('|').trim() : line).join('\n')).join('\n\n') + '\n```';
  const fourLists = '```\n' + R.map(d => `${d.WD}: ${d.name}\nEjercicio | Peso | Reps | RIR\n` + d.ex.slice(0, 2).map((n, i) => `${n} | ${SETS[i][0][0]} | ${SETS[i][0][1]} | ${SETS[i].map(t => t[2]).join(',')}`).join('\n')).join('\n\n') + '\n```';
  const withoutRest = rows => rows && rows.map(e => ({ name: e.name, sets: e.sets.map(t => t.slice(0, 4)) }));
  for (const [label, text] of [['filas por serie', four], ['listas RIR', fourLists], ['tabla con espacios', four.replace(/ *\| */g, '  ')]]) {
    seen = await importReco(p, R[2], text); G = await iaOf(p, ids);
    ok(seen.length === 3 && seen.every((h, i) => h.t.includes(WDL(R[i].wd))), `cuatro columnas, ${label}: tres vistas previas, cada día en su lugar`);
    ok(R.every((d, i) => JSON.stringify(withoutRest(G[i])) === JSON.stringify(withoutRest(wantIa(d)))), `cuatro columnas, ${label}: tres días con ejercicios, series, peso, reps y RIR intactos`);
  }
  ok(await p.evaluate(t => riBuild(t).length, four) === 3, 'Importar rutinas también reconoce los tres días sin Descanso');
  /* Un día que no está en el plan: se avisa y no se pierde en silencio */
  const free = [0, 1, 2, 3, 4, 5, 6].find(w => !D.some(d => d.wd === w));
  if (free != null) {
    const FREE = { WD: ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'][free], name: 'Brazos extra', ex: R[0].ex };
    seen = await importReco(p, D[0], answer([R[0], FREE]));
    ok(seen.length === 1 && /no está en tu plan/i.test(seen[0].skip) && seen[0].skip.indexOf('Brazos extra') >= 0, `día que no está en el plan (${FREE.WD}): «${seen[0] && seen[0].skip.trim()}»`);
  }
  /* Entrenar ahora con la importada: peso, RIR y descanso; la recomendación del coach queda arriba */
  await importReco(p, D[0], answer([R[0]]));
  await p.click('#sheet [data-aix="go"]'); await p.waitForTimeout(900);
  const S = await p.evaluate(n => { const e = state.draft.exercises.find(x => x.name === n), pg = document.querySelector('#sx-pager > .sx-page.cur .card.ex'); return { w: e.log.map(s => s.w), rir: e.rirT, rest: e.rest, restT: e.restT, top: pg && !!pg.querySelector(':scope > .su-pills + .su-co') }; }, R[0].ex[0]);
  ok(S.w.join() === '52.5,52.5' && S.rir.join() === '2,1' && S.rest === 120, `"Entrenar ahora": ${R[0].ex[0]} 52,5 kg ×2, RIR 2·1, descanso 120 s`);
  ok(S.top, 'en la sesión, la recomendación (importada) va arriba, bajo las píldoras');
  await shot(p, 'a1-sesion-importada');
  await p.evaluate(() => { state.draft = null; render(); });

  /* 3. Importar rutinas con la misma respuesta */
  const before = await p.evaluate(() => JSON.stringify(state.plans.map(x => ({ id: x.id, name: x.name, days: x.days }))));
  await p.evaluate(() => { closeSheet(); state.draft = null; state.tab = 'plans'; render(); scrollTo(0, 0); });
  await p.evaluate(() => { state.riT = { txt: '', err: '' }; riPaste(); }); await p.waitForTimeout(200);
  await p.fill('#ri-txt', TXT); await p.click('#sheet [data-ri="read"]'); await p.waitForTimeout(400);
  const V = await p.evaluate(() => state.rI.days.map(d => ({ name: d.name, wd: d.wd, ex: d.ex.map(e => ({ n: e.name, s: e.sets, r: [e.rMin, e.rMax], rir: e.rir.join(','), w: e.w, rest: e.rest })) })));
  ok(V.length === R.length && V.every((v, i) => v.name === R[i].name && v.wd === R[i].wd), 'una rutina por día, con el nombre de después de los dos puntos y su día: ' + V.map(v => `${WDL(v.wd).slice(0, 3)} «${v.name}»`).join(', '));
  ok(V.every((v, i) => v.ex.length === 2 && v.ex[0].n === R[i].ex[0] && v.ex[0].s === 2 && v.ex[0].rir === '2,1' && v.ex[0].w === 52.5 && v.ex[0].rest === 120 && v.ex[1].n === R[i].ex[1] && v.ex[1].s === 3 && v.ex[1].r.join() === '12,15' && v.ex[1].rir === '2,1,0' && v.ex[1].rest === 90), 'ejercicios, series, reps, RIR por serie, peso y descanso');
  await p.locator('#sheet .pk-bottom [data-ri="save"]').click(); await p.waitForTimeout(500);
  const NP = await p.evaluate(() => { const p = state.plans.filter(x => x.src).pop(); return p ? p.days.map(d => ({ name: d.name, wd: d.weekday, ex: d.exercises.map(e => ({ n: e.name, sets: e.sets, rirT: (e.rirT || []).join(','), rest: e.rest, w: e.weight })) })) : []; });
  ok(NP.length === R.length && NP.every((d, i) => d.name.indexOf(R[i].name) === 0 && d.wd === R[i].wd && d.ex[0].sets === 2 && d.ex[0].rirT === '2,1' && d.ex[0].rest === 120 && d.ex[1].rirT === '2,1,0'), 'guardadas: ' + NP.map(d => `${WDL(d.wd).slice(0, 3)} «${d.name}»`).join(', '));
  ok(await p.evaluate(b => { const now = state.plans.map(x => ({ id: x.id, name: x.name, days: x.days })); return JSON.parse(b).every(o => JSON.stringify(now.find(n => n.id === o.id)) === JSON.stringify(o)); }, before), 'las rutinas de antes no cambian');

  /* 4. Formato viejo: tu ejemplo sintético se lee igual que en la versión anterior */
  const q = await open(OLD, { seed: OWNER }), REAL = fs.readFileSync(path.join(HERE, 'importar-ejemplo-sintetico.txt'), 'utf8');
  for (const [lbl, t] of [['tabulaciones', REAL], ['espacios', REAL.replace(/\t/g, ' ')], ['una celda por línea', REAL.replace(/\t/g, '\n')], ['2 espacios y \\r\\n', REAL.replace(/\t/g, '  ').replace(/\n/g, '\r\n')]]) {
    const f = pg => pg.evaluate(t => JSON.stringify(nsParse(t)), t), a = await f(p), b = await f(q);
    ok(a === b && JSON.parse(a).rows.length === 6, `formato viejo (${lbl}): igual que antes (${JSON.parse(a).rows.length} ejercicios, día ${JSON.parse(a).day})`);
  }
  for (const f of ['en-list', 'es-markdown', 'prosa-3dias', 'reco-3dias', 'tabla-series', 'tabla', 'un-encabezado'].map(x => x + '.txt')) {   // los textos de antes
    const t = fs.readFileSync(path.join(HERE, 'rutinas', f), 'utf8'), g = pg => pg.evaluate(t => JSON.stringify(riBuild(t).map(d => ({ n: d.name, wd: d.wd, ex: d.ex.map(e => [e.name, e.sets, e.rMin, e.rMax, e.rir, e.w, e.rest]) }))), t);
    const a = await g(p), b = await g(q);
    ok(a === b, `importar rutinas, ${f}: igual que antes` + (a === b ? '' : `\n       ahora ${a.slice(0, 300)}\n       antes ${b.slice(0, 300)}`));
  }
  await q.done();
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}

console.log('B. "Importar rutinas" con otros formatos');
{
  const p = await open(DIR, { seed: OWNER });
  const T = f => fs.readFileSync(path.join(HERE, 'rutinas', f + '.txt'), 'utf8');
  const rb = t => p.evaluate(t => riBuild(t).map(d => ({ name: d.name, wd: d.wd, ex: d.ex.map(e => ({ n: e.name, raw: e.raw, s: e.sets, r: [e.rMin, e.rMax], rir: e.rir.join(','), w: e.w, rest: e.rest })) })), t);
  const sum = V => V.map(v => `${WDL(v.wd).slice(0, 3)} «${v.name}» [${v.ex.map(e => `${e.n || '¿' + e.raw + '?'} ${e.s}×${e.r[0]}${e.r[1] !== e.r[0] ? '-' + e.r[1] : ''}${e.rir ? ' RIR ' + e.rir : ''}${e.w != null ? ' ' + e.w + ' kg' : ''}${e.rest ? ' ' + e.rest + ' s' : ''}`).join('; ')}]`).join(' · ');
  const nueva = await rb(T('formato-nuevo'));
  console.log('     formato nuevo: ' + sum(nueva));
  ok(nueva.length === 2 && nueva[0].name === 'Pierna y glúteo' && nueva[0].wd === 1 && nueva[1].name === 'Espalda y hombro (Bombeo)' && nueva[1].wd === 4, 'formato nuevo: «Pierna y glúteo» el lunes y «Espalda y hombro (Bombeo)» el jueves');
  ok(nueva[0].ex.length === 3 && nueva[0].ex[0].n === 'Prensa 45°' && nueva[0].ex[0].s === 3 && nueva[0].ex[0].rir === '2,1,0' && nueva[0].ex[0].rest === 150 && nueva[0].ex[0].w === 140, 'Prensa 45°: 3 series, RIR 2,1,0, 140 kg, 150 s');
  const esp = await rb(T('espacios'));
  console.log('     espacios: ' + sum(esp));
  ok(JSON.stringify(esp) === JSON.stringify(nueva), 'tabla separada por espacios: igual que con "|"');
  const cel = await rb(T('una-celda'));
  console.log('     una celda por línea: ' + sum(cel));
  ok(JSON.stringify(cel) === JSON.stringify(nueva), 'una celda por línea: igual que con "|"');
  const col = await rb(T('columna-dia'));
  console.log('     columna Día: ' + sum(col));
  ok(col.length === 3 && col.map(d => d.wd).join() === '1,3,5' && col.map(d => d.name).join('|') === 'Empuje|Tirón|Pierna', 'una tabla con columna Día → 3 rutinas (lun, mié, vie) con su nombre');
  ok(col[0].ex.length === 2 && col[0].ex[0].n === 'Press Banca Plano (Barra)' && col[0].ex[0].s === 4 && col[0].ex[0].r.join() === '6,8' && col[0].ex[0].rest === 180 && col[1].ex.length === 2 && col[2].ex.length === 2, 'filas con el día vacío siguen en el día de arriba; series, reps y descanso');
  const cole = await rb(T('columna-dia').split('\n').filter(l => !/^\|?\s*[-:|\s]+$/.test(l)).map(l => l.replace(/^\|\s*|\s*\|$/g, '').split(/\s*\|\s*/).map(c => c || '').join('  ')).join('\n'));
  ok(JSON.stringify(cole.map(d => [d.name, d.wd, d.ex.length])) === JSON.stringify(col.map(d => [d.name, d.wd, d.ex.length])), 'columna Día con 2 espacios en vez de "|": igual');
  const largo = await rb('DÍA MARTES: Torso completo, con énfasis en espalda alta y hombro posterior (Pesado)\nEjercicio | Peso | Reps | RIR | Descanso\nRemo con Barra | 40 | 8 | 2 | 120');
  ok(largo.length === 1 && largo[0].name === 'Torso completo' && largo[0].wd === 2, `"DÍA MARTES: …" largo → «${largo[0] && largo[0].name}» el martes`);
  /* Nada que leer: mensaje y "Copiar formato para tu IA" */
  await p.evaluate(() => { state.riT = { txt: '', err: '' }; riPaste(); }); await p.waitForTimeout(200);
  await p.fill('#ri-txt', 'Gracias por tu mensaje. Descansa bien y toma agua.'); await p.click('#sheet [data-ri="read"]'); await p.waitForTimeout(300);
  const M = await p.evaluate(() => ({ err: (document.querySelector('#sheet .se-err') || {}).textContent || '', btn: !!document.querySelector('#sheet [data-ri="fmt"]') }));
  ok(/No encontré rutinas/.test(M.err) && /LUNES: Piernas/.test(M.err) && M.btn, 'sin nada: mensaje claro y botón "Copiar formato para tu IA"');
  await p.click('#sheet [data-ri="fmt"]'); await p.waitForTimeout(300);
  const clip = await p.evaluate(() => window.__clip.pop() || '');
  ok(/FORMATO OBLIGATORIO/.test(clip) && /'DÍA \(TIPO\): nombre'/.test(clip) && /nombre completo con el equipo/.test(clip), 'copia el formato del punto 1');
  await shot(p, 'b1-sin-nada');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}

console.log('C. Usuario nuevo');
{
  const p = await open(DIR), D = await planDays(p);
  ok(D.length >= 2, `rutina inicial con ${D.length} días: ` + D.map(d => `${d.WD} ${d.name}`).join(' · '));
  const X = await p.evaluate(() => ({ week: wcReportText(), ask: nsAskText(activePlan().days[0]) }));
  ok(/'DÍA \(TIPO\): nombre'/.test(X.week) && !/\{[a-záéíóúñ ]+\}|undefined|NaN/.test(X.week.slice(X.week.indexOf('FORMATO'))), 'semana: formato nuevo sin huecos');
  const R = D.slice(0, 2), ids = R.map(d => d.id), seen = await importReco(p, D[0], answer(R)), G = await iaOf(p, ids);
  ok(seen.length === 2 && R.every((d, i) => JSON.stringify(G[i]) === JSON.stringify(wantIa(d))), 'importar recomendación: cada día con lo suyo');
  await p.evaluate(() => { closeSheet(); state.riT = { txt: '', err: '' }; riPaste(); }); await p.waitForTimeout(200);
  await p.fill('#ri-txt', answer(R)); await p.click('#sheet [data-ri="read"]'); await p.waitForTimeout(400);
  const V = await p.evaluate(() => state.rI.days.map(d => ({ name: d.name, wd: d.wd, n: d.ex.length })));
  ok(V.length === 2 && V.every((v, i) => v.name === R[i].name && v.wd === R[i].wd && v.n === 2), 'importar rutinas: nombre y día de cada una');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}

console.log('D. Reloj');
{
  const p = await open(DIR, { seed: OWNER, watch: true }), q = await open(OLD, { seed: OWNER, watch: true });
  let d = await pixDiff(await shot(p, 'd1-reloj'), await shot(q, 'd1-reloj-antes'));
  ok(d === 0, 'inicio del reloj idéntico' + (d ? ` (${d} px)` : ''));
  const ST = () => { const pl = activePlan(), dd = nextDay(pl) || pl.days[0]; state.settings.nextS = Object.assign({}, state.settings.nextS, { [dd.id]: { pick: 'plan' } }); startSession(pl.id, dd.id); };
  await p.evaluate(ST); await q.evaluate(ST); await p.waitForTimeout(800); await q.waitForTimeout(800);
  d = await pixDiff(await shot(p, 'd2-reloj-sesion'), await shot(q, 'd2-reloj-sesion-antes'));
  ok(d === 0, 'sesión del reloj idéntica' + (d ? ` (${d} px)` : ''));
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done(); await q.done();
}

await browser.close();
console.log(fail ? `${fail} FALLA(S)` : 'Todo bien');
process.exit(fail ? 1 : 0);

function WDL(i) { return ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][i]; }
