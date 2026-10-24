import { OWNER_SETTINGS, seedOwner } from './owner-fixture.mjs';
// Prueba de la tanda I1 (exportar.js, aiexport.js, rimport.js): exportaciones con objetivo y tipo, y la importación por tipo.
// Uso (desde PowerShell): $env:PW_DIR = "<carpeta con node_modules/playwright>"; node tests/texp.mjs <copia transpilada> <copia transpilada anterior> [capturas]
// A. Dueño, lunes: "Exportar" a media sesión (solo lo hecho, objetivo, tipo fuerza, día dentro del bloque), barra a 360 px.
// B. Al terminar: "Exportar" en el resumen. C. Sin objetivo (lo pregunta) y sesión de bombeo.
// D. Semana (lunes): tarjeta en Hoy, hoja, días en cada bloque, formato "DÍA LUNES (FUERZA):", ida y vuelta e Historial.
// E. Domingo: tras la última sesión, "Exportar semana" en el resumen y en Hoy.
// F. Importar: fuerza, bombeo, tipo que no coincide, sin tipo (avisa), tabla vieja con TIPO; pesos solo a días del mismo tipo.
// G. Usuario nuevo. H. Reloj idéntico a la versión anterior y sin botones nuevos.
// Todos los datos (pesos, textos de la IA) son inventados.
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
const MON = '2026-10-19T10:30:30', SUN = '2026-10-18T18:00:00';

async function open(dir, { seed, watch, at, w } = {}) {
  const srv = await serve(dir);
  const ctx = await browser.newContext(watch ? { viewport: { width: 410, height: 500 }, hasTouch: true } : { viewport: { width: w || 390, height: 844 }, hasTouch: true });
  await ctx.route(/googleapis|gstatic|google\.com|firebase/, r => r.abort());
  const p = await ctx.newPage(); p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message));
  await p.clock.setFixedTime(new Date(at || MON));
  await seedOwner(p, seed);
  await p.addInitScript(o => {
    if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); if (o) { localStorage.setItem('cdh.settings', JSON.stringify(o)); localStorage.setItem('cdh.newsSeen', '"n6"'); } localStorage.setItem('cdh.reminders', '[]'); }
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
const clip = p => p.evaluate(() => window.__clip[window.__clip.length - 1] || '');
const nClip = p => p.evaluate(() => window.__clip.length);
/* "Exportar" de la página visible de la sesión (fila de píldoras) */
const tapExp = p => p.evaluate(() => { const b = document.querySelector('#sx .sx-page.cur .ex-exp') || document.querySelector('#sx .ex-exp'); if (b) b.click(); return !!b; });
const toastTxt = p => p.evaluate(() => { const t = document.querySelector('.toast'); return t ? t.textContent : ''; });
/* Empieza un día del plan activo con el plan (sin importada ni coach) */
const start = (p, id, pick) => p.evaluate(([id, pick]) => { const pl = activePlan(); state.settings.nextS = Object.assign({}, state.settings.nextS, { [id]: Object.assign({}, (state.settings.nextS || {})[id], { pick: pick || 'plan' }) }); startSession(pl.id, id); }, [id, pick]);
/* Terminar: primero la racha (si sube) y al cerrarla el resumen, como siempre */
async function finish(p) {
  await p.evaluate(() => { state.durOK = true; finishSession(); state.durOK = false; }); await p.waitForTimeout(600);
  for (let k = 0; k < 10 && await p.evaluate(() => !!document.querySelector('.celebrate')); k++) { await p.evaluate(() => { const c = document.querySelector('.celebrate'); const b = c && (c.querySelector('button') || c); if (b) b.click(); }); await p.waitForTimeout(600); }
}
const sect = (t, a, b) => { const i = t.indexOf(a); if (i < 0) return ''; const j = b ? t.indexOf(b, i + a.length) : -1; return t.slice(i, j < 0 ? undefined : j); };
/* "Importar recomendación": pega y lee; devuelve cada vista previa (y la guarda) o el error */
async function importReco(p, dayId, txt) {
  await p.evaluate(d => { closeSheet(); state.settings.nextS = {}; nsImportSheet(activePlan().id, d); }, dayId);
  await p.waitForTimeout(250); await p.fill('#ns-txt', txt); await p.click('#sheet [data-ns="read"]'); await p.waitForTimeout(350);
  const seen = [];
  for (let k = 0; k < 6; k++) {
    const h = await p.evaluate(() => { const s = document.querySelector('#sheet'); if (s.hidden) return null; const q = c => (s.querySelector(c) || {}).textContent || '';
      return { t: q('h2'), kind: q('.aix-kind'), kindw: q('.aix-kindw'), skipk: q('.aix-skipk'), err: (s.querySelector('#ns-txt-e:not([hidden])') || {}).textContent || '', save: !!s.querySelector('[data-ns="save"]') }; });
    if (!h || (!h.save && !h.err)) break;   // "Recomendación guardada" ya no es una vista previa
    seen.push(h); if (!h.save) break;
    await p.click('#sheet [data-ns="save"]'); await p.waitForTimeout(300);
  }
  return seen;
}
const iaDays = p => p.evaluate(() => Object.keys(state.settings.nextS || {}).filter(k => state.settings.nextS[k].ia));
const TAB = (rows) => 'Ejercicio | Peso | Reps | RIR | Descanso\n' + rows.map(r => r.join(' | ')).join('\n');

console.log('A. Dueño, lunes: Exportar a media sesión');
{
  const p = await open(DIR, { seed: OWNER_SETTINGS });
  await start(p, 'p1-lun'); await p.waitForTimeout(900);
  const D = await p.evaluate(() => state.draft.exercises.map(e => e.name));
  const top = await p.evaluate(() => { const c = document.querySelector('#sx .sx-page.cur') || document, b = c.querySelector('.su-pills .ex-exp'), r = b && b.getBoundingClientRect(); return b ? { txt: b.textContent.trim(), h: r.height, n: document.querySelectorAll('#sx .su-pills').length === document.querySelectorAll('#sx .su-pills .ex-exp').length } : null; });
  ok(top && top.txt === 'Exportar' && top.h >= 44 && top.n, 'píldora "Exportar" en cada ejercicio de la sesión (≥ 44 px)');
  await tapExp(p); await p.waitForTimeout(250);
  ok(/Aún no marcas ninguna serie/.test(await toastTxt(p)) && await nClip(p) === 0, 'sin series marcadas: avisa y no copia nada');
  await p.evaluate(() => { const d = state.draft; d.exercises[0].log[0].w = 50; d.exercises[0].log[0].r = 12; d.exercises[0].log[0].rir = 2; markSet(0, 0, true); d.exercises[0].log[1].w = 50; d.exercises[0].log[1].r = 11; markSet(0, 1, true); d.exercises[1].log[0].w = 30; d.exercises[1].log[0].r = 10; markSet(1, 0, true); state.rest = null; render(); });
  await p.waitForTimeout(300); await shot(p, 'a1-sesion-exportar');
  await tapExp(p); await p.waitForTimeout(300);
  const T = await clip(p), ses = sect(T, 'MI SESIÓN', 'LO QUE TE PIDO');
  ok(/Copiado: 2 ejercicios y 3 series hasta ahora/.test(await toastTxt(p)), 'copia y dice cuánto: 2 ejercicios y 3 series');
  ok(/^MI SESIÓN \(en curso: solo lo hecho hasta ahora\)/.test(ses) && / · en curso/.test(ses), 'el texto dice que la sesión sigue en curso');
  ok(ses.includes(`- ${D[0]}: 50×12 @2, 50×11`) && ses.includes(`- ${D[1]}: 30×10`) && !D.slice(2).some(n => ses.includes(`- ${n}:`)), 'solo los ejercicios hechos, con sus series y RIR');
  const ask = sect(T, 'LO QUE TE PIDO', 'FORMATO OBLIGATORIO');
  ok(/^LO QUE TE PIDO \(sesión de fuerza, todavía en curso\):/.test(ask) && /1\. Un análisis breve/.test(ask) && /2\. Recomendaciones propias de una sesión de fuerza: rangos de 6-10 reps/.test(ask), 'pide análisis breve y recomendaciones de fuerza');
  ok(/3\. Los ejercicios de mi próxima sesión del lunes \(Piernas \+ Torso \(Pesado\), de fuerza\)/.test(ask) && /Mi objetivo: Ganar músculo\./.test(ask), 'pide la próxima sesión de ese día e incluye el objetivo de Tus datos');
  const F = sect(T, 'FORMATO OBLIGATORIO');
  ok(/'DÍA \(TIPO\): nombre'/.test(F) && F.includes('(aquí: LUNES (FUERZA): Piernas + Torso (Pesado))') && /\nLUNES \(FUERZA\): Piernas \+ Torso \(Pesado\)\nEjercicio \| Peso \| Reps \| RIR \| Descanso/.test(F), 'formato con el día y el tipo dentro del bloque');
  ok(T.indexOf('LO QUE TE PIDO') > T.indexOf('MI SESIÓN') && T.indexOf('FORMATO OBLIGATORIO') > T.indexOf('LO QUE TE PIDO') && /^Actúa como mi entrenador/.test(T), 'orden: instrucciones, datos, sesión, lo que te pido y formato');
  ok(await p.evaluate(() => !!state.draft && state.draft.exercises[0].log[0].done), 'exportar no cambia la sesión en curso');
  /* 360 px: la barra cabe y el reloj de la sesión se lee */
  await p.setViewportSize({ width: 360, height: 740 }); await p.evaluate(() => { state.settings.music = 'https://open.spotify.com/playlist/xyz'; render(); }); await p.waitForTimeout(300);
  const L = await p.evaluate(() => { const t = document.querySelector('#sx .sx-top'), c = t.querySelector('.grow'); return { over: t.scrollWidth - t.clientWidth, cw: c.getBoundingClientRect().width, kids: Array.prototype.every.call(t.children, k => k.getBoundingClientRect().right <= 360.5) }; });
  await shot(p, 'a2-barra-360');
  ok(L.over <= 0 && L.kids && await p.evaluate(() => !document.querySelector('#sx .sx-top .ex-exp')), 'a 360 px la barra de arriba queda como antes (Exportar va en las píldoras)');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}

console.log('B. Al terminar: Exportar en el resumen');
{
  const p = await open(DIR, { seed: OWNER_SETTINGS });
  await start(p, 'p1-lun'); await p.waitForTimeout(800);
  await p.evaluate(() => { markSet(0, 0, true); markSet(0, 1, true); state.rest = null; });
  await finish(p); await p.waitForTimeout(1200);
  const S = await p.evaluate(() => { const s = document.querySelector('#sheet .fs-card'); return s ? { exp: !!s.querySelector('[data-xp="fs"]'), wk: !!s.querySelector('[data-xp="week"]'), listo: !!s.querySelector('[data-act="fs-close"]') } : null; });
  await shot(p, 'b1-resumen');
  ok(S && S.exp && S.listo && !S.wk, 'el resumen tiene "Exportar" (y "Listo"); un lunes no ofrece la semana');
  await p.click('#sheet [data-xp="fs"]'); await p.waitForTimeout(300);
  const T = await clip(p);
  ok(/^MI SESIÓN \(peso×reps/m.test(T) && !/en curso/.test(T) && /LO QUE TE PIDO \(sesión de fuerza\):/.test(T) && /FORMATO OBLIGATORIO/.test(T), 'copia la sesión terminada, igual que desde el historial');
  ok(await p.evaluate(() => !!document.querySelector('#sheet .fs-card')), 'el resumen sigue abierto');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}

console.log('C. Sin objetivo en Tus datos y sesión de bombeo');
{
  const seed = structuredClone(OWNER_SETTINGS); delete seed.prof.goal;
  const p = await open(DIR, { seed });
  await start(p, 'p1-mie'); await p.waitForTimeout(800);
  await p.evaluate(() => { markSet(0, 0, true); state.rest = null; });
  await tapExp(p); await p.waitForTimeout(300);
  const T = await clip(p), ask = sect(T, 'LO QUE TE PIDO', 'FORMATO');
  ok(/Aún no te dije mi objetivo: pregúntamelo antes de recomendarme/.test(ask) && !/Mi objetivo:|objetivo: (Ganar|Fuerza|Bajar|Salud)/.test(T), 'sin objetivo: el prompt lo pregunta y no inventa uno');
  ok(/sesión de bombeo/.test(ask) && /Recomendaciones propias de una sesión de bombeo: rangos de 10-15 reps/.test(ask) && /próxima sesión del miércoles \(Full Body \(Bombeo\), de bombeo\)/.test(ask), 'tipo bombeo con sus recomendaciones');
  ok(T.includes('(aquí: MIÉRCOLES (BOMBEO): Full Body (Bombeo))'), 'formato: MIÉRCOLES (BOMBEO) dentro del bloque');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}

console.log('D. Semana: lunes, tarjeta en Hoy, hoja e Historial');
{
  const p = await open(DIR, { seed: OWNER_SETTINGS });
  const H = await p.evaluate(() => { const c = document.querySelector('.wx-card'); return c ? { vis: !c.hidden && !c.closest('[hidden]'), txt: c.textContent } : null; });
  await shot(p, 'd1-hoy-semana');
  ok(H && H.vis && /Terminó tu semana/.test(H.txt) && /6 sesiones de lunes a domingo/.test(H.txt), 'Hoy ofrece "Exportar semana" con las 6 sesiones de la semana que terminó (aviso visible)');
  await p.click('.wx-card [data-xp="week"]'); await p.waitForTimeout(400);
  const W = await p.evaluate(() => ({ sheet: !!document.querySelector('#sheet .wx-sheet'), on: (document.querySelector('#sheet .gchip.on') || {}).textContent, txt: aixWeekText(1).txt, seen: state.settings.wxSeen, card: !!document.querySelector('.wx-card') }));
  await shot(p, 'd2-hoja-semana');
  ok(W.sheet && W.on === 'Semana pasada' && W.seen === '2026-10-12' && !W.card, 'abre la hoja en "Semana pasada" y la tarjeta ya no sale');
  const ses = sect(W.txt, 'MIS SESIONES DE LA SEMANA', 'SERIES POR MÚSCULO'), heads = ses.split('\n').filter(l => /^DÍA /.test(l));
  ok(/^MIS SESIONES DE LA SEMANA \(6;/.test(ses) && heads.length === 6 && heads.every(l => /^DÍA (LUNES|MARTES|MIÉRCOLES|JUEVES|VIERNES|SÁBADO|DOMINGO) · 2026-10-1[2-8] · /.test(l)), 'las 6 sesiones de lunes a domingo, cada una con su día');
  ok(heads[0].startsWith('DÍA LUNES · 2026-10-12') && heads[5].startsWith('DÍA SÁBADO · 2026-10-17') && !ses.includes('2026-10-11'), 'en orden y sin sesiones de otras semanas');
  const ask = sect(W.txt, 'LO QUE TE PIDO', 'FORMATO');
  ok(/semana del lunes .+ al domingo/.test(ask) && /en los de fuerza, rangos de 6-10/.test(ask) && /en los de bombeo, rangos de 10-15/.test(ask) && /LUNES \(FUERZA\): Piernas \+ Torso \(Pesado\); MIÉRCOLES \(BOMBEO\): Full Body \(Bombeo\); VIERNES \(FUERZA\)/.test(ask) && /Mi objetivo: Ganar músculo/.test(ask), 'pide análisis, recomendaciones por tipo y la próxima semana día por día');
  ok(/'DÍA LUNES \(TIPO\): nombre'/.test(W.txt) && /\nDÍA LUNES \(FUERZA\): Piernas \+ Torso \(Pesado\)\nEjercicio/.test(W.txt), 'formato importable con "DÍA LUNES (FUERZA):"');
  await p.click('#sheet [data-xp="wk-copy"]'); await p.waitForTimeout(250);
  ok(await clip(p) === W.txt, '"Copiar" copia la semana');
  await p.click('#sheet [data-xp="wk-off"][data-off="0"]'); await p.waitForTimeout(250);
  ok(await p.evaluate(() => /Esta semana/.test(document.querySelector('#sheet .gchip.on').textContent) && /0 sesiones/.test(document.querySelector('#sheet .aix-meta').textContent)), 'se puede elegir otra semana (esta: 0 sesiones)');
  /* Respuesta inventada de la IA con la próxima semana → Importar recomendación e Importar rutinas */
  const ans = 'Buena semana.\n```\nDÍA LUNES (FUERZA): Piernas + Torso (Pesado)\n' + TAB([['Prensa 45°', 60, 8, 2, 150], ['Prensa 45°', 60, 8, 1, 150]]) + '\n\nDÍA MIÉRCOLES (BOMBEO): Full Body (Bombeo)\n' + TAB([['Prensa 45°', 35, 15, 1, 75]]) + '\n\nDÍA VIERNES (FUERZA): Piernas + Torso (Pesado)\n' + TAB([['Prensa 45°', 62.5, 8, 2, 150]]) + '\n```';
  const seen = await importReco(p, 'p1-lun', ans), ids = await iaDays(p);
  ok(seen.length === 3 && /Lunes/.test(seen[0].t) && /Miércoles/.test(seen[1].t) && /Viernes/.test(seen[2].t) && seen.every(h => /Recomendación de (fuerza|bombeo)/.test(h.kind)) && ids.sort().join() === 'p1-lun,p1-mie,p1-vie', 'la próxima semana se importa: cada día a su día y con su tipo');
  const R = await p.evaluate(t => riBuild(t).map(d => [d.wd, d.name, d.kind]), ans);
  ok(JSON.stringify(R) === JSON.stringify([[1, 'Piernas + Torso (Pesado)', 'fuerza'], [3, 'Full Body (Bombeo)', 'bombeo'], [5, 'Piernas + Torso (Pesado)', 'fuerza']]), 'Importar rutinas también la lee: día, nombre y tipo');
  /* Historial */
  await p.evaluate(() => { closeSheet(); state.tab = 'progress'; state.progSub = 'historial'; render(); }); await p.waitForTimeout(300);
  const hb = await p.evaluate(() => { const b = document.querySelector('.ex-hrow'), seg = document.querySelector('.prog-seg'); return b ? { t: b.textContent.trim(), after: seg && seg.nextElementSibling === b } : null; });
  await shot(p, 'd3-historial');
  ok(hb && /Exportar semana para tu IA/.test(hb.t) && hb.after, 'Historial tiene el botón "Exportar semana para tu IA"');
  await p.click('.ex-hrow'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => !!document.querySelector('#sheet .wx-sheet') && /Semana pasada/.test(document.querySelector('#sheet .gchip.on').textContent)), 'desde Historial abre la última semana con sesiones');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}

console.log('E. Domingo: después de la última sesión');
{
  const p = await open(DIR, { seed: OWNER_SETTINGS, at: SUN });
  ok(await p.evaluate(() => !document.querySelector('.wx-card')), 'domingo sin entrenar todavía: no sale');
  await start(p, 'p1-vie'); await p.waitForTimeout(800);
  await p.evaluate(() => { markSet(0, 0, true); state.rest = null; });
  await finish(p); await p.waitForTimeout(1200);
  ok(await p.evaluate(() => !!document.querySelector('#sheet .fs-card [data-xp="week"]')), 'el resumen del domingo ofrece "Exportar semana"');
  await p.click('#sheet [data-act="fs-close"]'); await p.waitForTimeout(600);
  await p.evaluate(() => { state.tab = 'train'; render(); }); await p.waitForTimeout(300);
  const c = await p.evaluate(() => { const x = document.querySelector('.wx-card'); return x ? x.textContent : ''; });
  ok(/Cerraste tu semana/.test(c) && /7 sesiones/.test(c), 'y Hoy la ofrece con las 7 sesiones de la semana');
  await p.click('.wx-card [data-xp="wx-x"]'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => !document.querySelector('.wx-card') && state.settings.wxSeen === '2026-10-12'), 'la ✕ la cierra para esa semana');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}

console.log('F. Importar por tipo (fuerza / bombeo)');
{
  const p = await open(DIR, { seed: OWNER_SETTINGS });
  let s = await importReco(p, 'p1-lun', 'Te recomiendo esto.\n```\nLUNES (FUERZA): Piernas + Torso (Pesado)\n' + TAB([['Prensa 45°', 60, 8, 2, 150], ['Sentadilla Hack', 45, 8, 2, 150]]) + '\n```');
  ok(s.length === 1 && /Lunes/.test(s[0].t) && /Recomendación de fuerza: se aplica solo a tu lunes de fuerza/.test(s[0].kind) && (await iaDays(p)).join() === 'p1-lun', 'fuerza → lunes (fuerza), con el aviso del tipo');
  s = await importReco(p, 'p1-lun', '```\nMIÉRCOLES (BOMBEO): Full Body (Bombeo)\n' + TAB([['Prensa 45°', 35, 15, 1, 75], ['Jalón al Pecho', 30, 15, 1, 60]]) + '\n```');
  ok(s.length === 1 && /Miércoles/.test(s[0].t) && /Recomendación de bombeo/.test(s[0].kind) && (await iaDays(p)).join() === 'p1-mie', 'bombeo → miércoles (bombeo)');
  s = await importReco(p, 'p1-lun', '```\nLUNES (BOMBEO): Piernas ligero\n' + TAB([['Prensa 45°', 30, 15, 1, 60]]) + '\n```');
  ok(s.length === 1 && !s[0].save && /No guardé nada: Lunes · Piernas ligero: el lunes de tu rutina es de fuerza y esta recomendación es de bombeo/.test(s[0].err) && !(await iaDays(p)).length, 'bombeo para un lunes de fuerza: no se guarda y lo explica');
  s = await importReco(p, 'p1-lun', '```\nLUNES (FUERZA): Piernas + Torso (Pesado)\n' + TAB([['Prensa 45°', 60, 8, 2, 150]]) + '\n\nVIERNES (BOMBEO): Piernas\n' + TAB([['Prensa 45°', 30, 15, 1, 60]]) + '\n```');
  ok(s.length === 1 && /el viernes de tu rutina es de fuerza y esta recomendación es de bombeo/.test(s[0].skipk) && (await iaDays(p)).join() === 'p1-lun', 'dos días: guarda el que coincide y avisa del otro');
  s = await importReco(p, 'p1-vie', '```\nVIERNES: Piernas\n' + TAB([['Prensa 45°', 61, 9, 2, 150]]) + '\n```');
  ok(s.length === 1 && /El texto no dice si es de fuerza o de bombeo: la tomé como fuerza, el tipo de tu viernes/.test(s[0].kindw) && (await iaDays(p)).join() === 'p1-vie', 'sin tipo: usa el del día y avisa');
  s = await importReco(p, 'p1-mie', 'TIPO: FUERZA\nEjercicio | Peso | Reps | RIR\nPrensa 45° | 60 | 8 | 2,1');
  ok(s.length === 1 && !s[0].save && /es de fuerza y el miércoles \(Full Body \(Bombeo\)\) es de bombeo/.test(s[0].err), 'tabla vieja de fuerza con un miércoles de bombeo elegido: pide elegir un día de fuerza');
  s = await importReco(p, 'p1-lun', 'TIPO: FUERZA\nEjercicio | Peso | Reps | RIR\nPrensa 45° | 60 | 8 | 2,1');
  ok(s.length === 1 && /Recomendación de fuerza/.test(s[0].kind) && (await iaDays(p)).join() === 'p1-lun', 'la misma tabla con el lunes elegido: se guarda');
  s = await importReco(p, 'p1-lun', 'Ejercicio | Peso | Reps | RIR\nPrensa 45° | 60 | 8 | 2,1');
  ok(s.length === 1 && /no dice si es de fuerza o de bombeo/.test(s[0].kindw), 'tabla vieja sin tipo: avisa');
  /* Entrenar con la importada del lunes: su peso solo pasa a los días de fuerza */
  await importReco(p, 'p1-lun', '```\nLUNES (FUERZA): Piernas + Torso (Pesado)\n' + TAB([['Prensa 45°', 77.5, 8, 2, 150], ['Prensa 45°', 77.5, 8, 1, 150]]) + '\n```');
  await p.evaluate(() => closeSheet());
  const before = await p.evaluate(() => activePlan().days.map(d => [d.id, (d.exercises.find(e => e.name === 'Prensa 45°') || {}).weight]));
  await start(p, 'p1-lun', 'ia'); await p.waitForTimeout(800);
  await p.evaluate(() => { const e = state.draft.exercises.find(x => x.name === 'Prensa 45°'); const i = state.draft.exercises.indexOf(e); e.log[0].w = 77.5; markSet(i, 0, true); state.rest = null; });
  await finish(p); await p.waitForTimeout(900);
  const after = await p.evaluate(() => activePlan().days.map(d => [d.id, (d.exercises.find(e => e.name === 'Prensa 45°') || {}).weight]));
  const W = (L, id) => (L.find(x => x[0] === id) || [])[1];
  ok(W(after, 'p1-lun') === 77.5 && W(after, 'p1-vie') === 77.5 && W(after, 'p1-mie') === W(before, 'p1-mie') && W(before, 'p1-mie') !== 77.5, `con la importada de fuerza, Prensa 45° pasa a 77,5 en lunes y viernes; el miércoles de bombeo sigue en ${W(after, 'p1-mie')}`);
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}

console.log('G. Usuario nuevo');
{
  const p = await open(DIR, {});
  ok(await p.evaluate(() => !document.querySelector('.wx-card')), 'sin sesiones: Hoy no ofrece la semana');
  const id = await p.evaluate(() => { const pl = activePlan(); return (nextDay(pl) || pl.days[0]).id; });
  await start(p, id); await p.waitForTimeout(800);
  await p.evaluate(() => { markSet(0, 0, true); state.rest = null; });
  await tapExp(p); await p.waitForTimeout(300);
  const T = await clip(p);
  ok(/Aún no te dije mi objetivo/.test(T) && /LO QUE TE PIDO \(sesión de (fuerza|bombeo), todavía en curso\)/.test(T) && !/undefined|NaN|null|\{[a-z ]+\}/.test(T), 'exporta a media sesión, pregunta el objetivo y sin huecos');
  await finish(p); await p.waitForTimeout(1200);
  ok(await p.evaluate(() => !!document.querySelector('#sheet .fs-card [data-xp="fs"]')), 'el resumen tiene "Exportar"');
  await p.evaluate(() => { closeSheet(); state.tab = 'progress'; state.progSub = 'historial'; render(); }); await p.waitForTimeout(300);
  await p.click('.ex-hrow'); await p.waitForTimeout(300);
  const t = await p.evaluate(() => aixWeekText(state.exOff).txt);
  ok(/MIS SESIONES DE LA SEMANA \(1;/.test(t) && /DÍA LUNES · 2026-10-19/.test(t) && !/undefined|NaN/.test(t), 'Historial: exporta su semana con el día en el bloque');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}

console.log('H. Reloj');
{
  const p = await open(DIR, { seed: OWNER_SETTINGS, watch: true }), q = await open(OLD, { seed: OWNER_SETTINGS, watch: true });
  let d = await pixDiff(await shot(p, 'h1-reloj'), await shot(q, 'h1-reloj-antes'));
  ok(d === 0, 'inicio del reloj idéntico' + (d ? ` (${d} px)` : ''));
  await start(p, 'p1-lun'); await start(q, 'p1-lun'); await p.waitForTimeout(800); await q.waitForTimeout(800);
  d = await pixDiff(await shot(p, 'h2-reloj-sesion'), await shot(q, 'h2-reloj-sesion-antes'));
  ok(d === 0 && await p.evaluate(() => !document.querySelector('.ex-exp')), 'sesión del reloj idéntica y sin "Exportar"' + (d ? ` (${d} px)` : ''));
  for (const x of [p, q]) { await x.evaluate(() => { markSet(0, 0, true); state.rest = null; }); await finish(x); await x.waitForTimeout(1200); }
  for (const x of [p, q]) await x.evaluate(() => document.querySelectorAll('#toast, #undo-bar').forEach(e => { e.style.visibility = 'hidden'; }));   // avisos que se van solos
  d = await pixDiff(await shot(p, 'h3-reloj-resumen'), await shot(q, 'h3-reloj-resumen-antes'));
  ok(d === 0 && await p.evaluate(() => !document.querySelector('[data-xp]')), 'resumen del reloj idéntico y sin botones nuevos' + (d ? ` (${d} px)` : ''));
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done(); await q.done();
}

await browser.close();
console.log(fail ? `\n${fail} FALLAS` : '\nTodo OK');
process.exit(fail ? 1 : 0);
