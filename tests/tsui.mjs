// Prueba de la Tanda C (sessui.js): pantalla del ejercicio en la sesión, con Playwright y Edge.
// Uso (desde PowerShell): $env:PW_DIR = "<carpeta con node_modules/playwright>"; node tests/tsui.mjs <copia transpilada> <copia transpilada anterior> [capturas]
// A. Dueño con su rutina: barra con cronómetro, franja, nombre con equipo, píldoras, tabla primero (Serie · Anterior · Kg · Reps · ✓),
//    marcar / desmarcar con sonido y vibración (contados), última serie con otro sonido, sonido y vibración apagados, modo silencio,
//    copiar la serie anterior, añadir serie, Reemplazar / Ocupada, descanso ±15 s, terminar con el resumen.
// B. Usuario nuevo. C. Pantalla de 360 px sin desbordes. D. Reloj idéntico a la versión anterior y sin sonido al marcar.
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
const browser = await chromium.launch({ channel: 'msedge', headless: false, args: ['--headless=new'] });
const OWNER = { owner: 1, healthOk: 1 };
/* Sonido y vibración simulados: se cuentan */
const SPY = () => {
  window.__snd = { osc: 0, vib: [] };
  const AC = window.AudioContext || window.webkitAudioContext;
  if (AC) { const co = AC.prototype.createOscillator; AC.prototype.createOscillator = function () { window.__snd.osc++; return co.call(this); }; }
  try { Object.defineProperty(navigator, 'vibrate', { configurable: true, value: p => { window.__snd.vib.push(p); return true; } }); } catch (e) {}
};
async function open(dir, { seed, watch, w, h } = {}) {
  const srv = await serve(dir);
  const ctx = await browser.newContext(watch ? { viewport: { width: 410, height: 500 }, hasTouch: true } : { viewport: { width: w || 390, height: h || 844 }, hasTouch: true });
  await ctx.route(/googleapis|gstatic|google\.com|firebase/, r => r.abort());
  const p = await ctx.newPage(); p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message));
  await p.clock.setFixedTime(new Date('2026-10-19T18:30:00'));
  await p.addInitScript(o => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); if (o) { localStorage.setItem('cdh.settings', JSON.stringify(o)); localStorage.setItem('cdh.newsSeen', '"n5"'); } } }, seed || null);
  await p.addInitScript(SPY);
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
const START = () => { const pl = activePlan(), d = nextDay(pl) || pl.days[0]; state.settings.nextS = Object.assign({}, state.settings.nextS, { [d.id]: { pick: 'plan' } }); startSession(pl.id, d.id); };
const cur = '#sx-pager > .sx-page.cur ';
const snd = p => p.evaluate(() => ({ osc: window.__snd.osc, vib: window.__snd.vib.length }));
const tapCur = async (p, sel) => { await p.locator(cur + sel).first().click(); await p.waitForTimeout(250); };

console.log('A. Dueño: sesión de su rutina');
{
  const p = await open(DIR, { seed: OWNER });
  await p.evaluate(START); await p.waitForTimeout(900);
  const L = await p.evaluate(c => {
    const pg = document.querySelector(c.trim()), card = pg.querySelector('.card.ex'), kids = [...card.children];
    const idx = sel => kids.findIndex(k => k.matches(sel));
    const th = document.querySelector('.sx-th'), ck = card.querySelector('.check');
    return { sw: !!document.querySelector('#sx .sx-top .su-sw'), fin: !!document.querySelector('#sx .sx-fin'), add: !!document.querySelector('#sx-strip .sx-th-add'),
      th: [th.offsetWidth, getComputedStyle(th).borderRadius], name: card.querySelector('h3').textContent, pills: [...card.querySelectorAll('.su-pills .su-p')].map(b => b.textContent.replace(/\s+/g, ' ').trim()),
      order: { pills: idx('.su-pills'), coach: idx('.su-co, .su-coach'), sets: idx('.sets'), ctl: idx('.st-ctl'), note: idx('.field'), cbox: idx('.coach, .sugg') },
      heads: [...card.querySelectorAll('.sets > .h')].map(h => h.textContent), ck: [ck.offsetWidth, getComputedStyle(ck).borderRadius], addTxt: (card.querySelector('.st-ctl .st-b.add') || {}).textContent };
  }, cur);
  ok(L.sw && L.fin, 'barra de arriba con tiempo, cronómetro y Terminar');
  ok(L.th[0] === 64 && L.th[1] === '50%' && L.add, 'franja de círculos de 64 px con el "+" al final');
  console.log('     ejercicio: ' + L.name.trim() + ' · píldoras: ' + L.pills.join(' | '));
  ok(/\(.+\)/.test(L.name), 'nombre con el equipo entre paréntesis');
  ok(['Técnica', 'Reemplazar', 'Ocupada', 'Notas', 'Progreso'].every(t => L.pills.some(x => x.indexOf(t) >= 0)) && L.pills.some(x => /Descanso/.test(x)), 'píldoras: Técnica, Reemplazar, Ocupada, Notas, Descanso y Progreso');
  ok(L.order.pills < L.order.coach && L.order.coach < L.order.sets && L.order.sets < L.order.ctl && L.order.ctl < L.order.note && L.order.coach === L.order.cbox, 'orden: píldoras → recomendación del coach (arriba) → tabla → Añadir serie → resto (notas)');
  ok(JSON.stringify(L.heads) === JSON.stringify(['Serie', 'Anterior', 'Kg', 'Reps', '✓']) || JSON.stringify(L.heads) === JSON.stringify(['Serie', 'Anterior', 'Discos', 'Reps', '✓']), 'tabla: ' + L.heads.join(' · '));
  ok(L.ck[0] === 52 && L.ck[1] === '50%', 'check redondo de 52 px');
  ok(/Añadir serie/.test(L.addTxt), '"+ Añadir serie" a lo ancho');
  await shot(p, 'a1-ejercicio');
  /* Copiar la serie anterior */
  if (await p.locator(cur + '.sets .prev[data-act="use-prev"]').count()) { const v0 = await p.locator(cur + '#r-0-0, ' + cur + 'input[data-f="r"]').first().inputValue(); await tapCur(p, '.sets .prev[data-act="use-prev"]'); const v1 = await p.locator(cur + 'input[data-f="r"]').first().inputValue(); ok(v1 !== '' && v1 !== null, `copiar la serie anterior sigue funcionando (${v0 || 'vacío'} → ${v1})`); }
  /* Marcar con sonido y vibración */
  let s0 = await snd(p);
  await tapCur(p, '.sets .check[data-set="0"]:not(.drop-c)');
  let s1 = await snd(p);
  ok(s1.osc - s0.osc === 2 && s1.vib - s0.vib === 1, `al marcar: clic corto (${s1.osc - s0.osc} osciladores) y vibración`);
  const done = await p.evaluate(c => document.querySelectorAll(c + '.sets .su-done').length, cur);
  ok(done === 5, 'la fila hecha se pinta (5 celdas)');
  const rest = await p.evaluate(() => ({ on: !!state.rest, b: [...document.querySelectorAll('#rest [data-act="rest-add"]')].map(b => b.textContent), pos: getComputedStyle(document.getElementById('rest')).bottom }));
  ok(rest.on && rest.b.join() === '−15 s,+15 s' && rest.pos === '0px', 'descanso fijo abajo con −15 s y +15 s');
  await shot(p, 'a2-marcada');
  const e0 = await p.evaluate(() => state.rest.end); await p.locator('#rest [data-act="rest-add"][data-d="15"]').click(); const e1 = await p.evaluate(() => state.rest.end);
  ok(e1 - e0 === 15000, '+15 s suma 15 segundos');
  await p.locator('#rest [data-act="rest-add"][data-d="-15"]').click(); ok(await p.evaluate(() => state.rest.end) === e0, '−15 s los quita');
  s0 = await snd(p); await tapCur(p, '.sets .check[data-set="0"]:not(.drop-c)'); s1 = await snd(p);
  ok(s1.osc === s0.osc && s1.vib === s0.vib, 'al desmarcar no suena ni vibra');
  /* Última serie: otro sonido */
  const n = await p.evaluate(() => state.draft.exercises[state.draft.cur || 0].log.length);
  for (let j = 0; j < n - 1; j++) await p.evaluate(j => { const i = state.draft.cur || 0; markSet(i, j, true); }, j);
  s0 = await snd(p); await p.evaluate(n => { const i = state.draft.cur || 0; state.rest = null; markSet(i, n - 1, true); }, n); s1 = await snd(p);
  ok(s1.osc - s0.osc === 4, `la última serie del ejercicio suena distinto (${s1.osc - s0.osc} osciladores, más largo)`);
  /* Apagados y silencio */
  await p.evaluate(() => { state.settings.setSound = false; state.settings.setVibe = false; const i = 1; state.draft.cur = i; render(); });
  s0 = await snd(p); await p.evaluate(() => markSet(1, 0, true)); s1 = await snd(p);
  ok(s1.osc === s0.osc && s1.vib === s0.vib, 'con sonido y vibración apagados: nada');
  await p.evaluate(() => { state.settings.setSound = true; state.settings.setVibe = true; setAlertCfg({ sound: 'silencio' }); state.rest = null; });
  s0 = await snd(p); await p.evaluate(() => markSet(1, 1, true)); s1 = await snd(p);
  ok(s1.osc === s0.osc && s1.vib === s0.vib + 1, 'en modo silencio: sin sonido, solo vibración');
  await p.evaluate(() => setAlertCfg({ sound: 'largo' }));
  /* Añadir serie, Reemplazar, Ocupada, cronómetro */
  await p.evaluate(() => { state.draft.cur = 2; render(); if (typeof pagerGo === 'function') pagerGo(2, false); }); await p.waitForTimeout(400);
  const l0 = await p.evaluate(() => state.draft.exercises[2].log.length); await p.waitForTimeout(800); await p.locator('#sx-pager .st-ctl .st-b.add[data-ex="2"]').click(); await p.waitForTimeout(250); const l1 = await p.evaluate(() => state.draft.exercises[2].log.length);
  ok(l1 === l0 + 1, 'Añadir serie suma una serie');
  await tapCur(p, '.su-pills [data-act="swap"]'); ok(/Cambiar ejercicio/.test(await p.evaluate(() => document.getElementById('sheet').innerText)), 'Reemplazar abre las alternativas (Tanda B)');
  await p.evaluate(() => closeSheet()); await tapCur(p, '.su-pills [data-act="busy"]'); ok(/Máquina ocupada/.test(await p.evaluate(() => document.getElementById('sheet').innerText)), 'Ocupada conserva sus opciones');
  await p.evaluate(() => closeSheet());
  await p.locator('#sx .su-sw').click(); ok(await p.evaluate(() => state.suSw.run), 'el cronómetro arranca');
  await p.locator('#sx .su-sw').click(); ok(await p.evaluate(() => !state.suSw.run), 'y se pausa');
  const box = await p.locator('#sx .su-sw').boundingBox(); await p.mouse.move(box.x + 10, box.y + 10); await p.mouse.down(); await p.waitForTimeout(800); await p.mouse.up();
  ok(await p.evaluate(() => state.suSw.acc === 0 && !state.suSw.run), 'mantener presionado lo vuelve a cero');
  await tapCur(p, '.su-pills [data-act="su-notes"]'); await p.waitForTimeout(500); ok(await p.evaluate(() => document.activeElement && document.activeElement.classList.contains('note-in')), 'Notas lleva a la nota del ejercicio');
  /* Terminar: el resumen sigue */
  await p.evaluate(() => { state.durOK = true; finishSession(); state.durOK = false; }); await p.waitForTimeout(900);
  /* primero la racha (si sube), como siempre; al cerrarla sale el resumen */
  for (let k = 0; k < 10 && await p.evaluate(() => !!document.querySelector('.celebrate')); k++) { await p.evaluate(() => { const c = document.querySelector('.celebrate'); const b = c && (c.querySelector('button') || c); if (b) b.click(); }); await p.waitForTimeout(600); }
  await p.waitForTimeout(900);
  ok(await p.evaluate(() => !!document.querySelector('#sheet .fs-card')), 'al terminar sale el resumen como antes');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}

console.log('B. Usuario nuevo');
{
  const p = await open(DIR, {});
  await p.evaluate(START); await p.waitForTimeout(800);
  ok(await p.locator(cur + '.su-pills').count() === 1 && await p.locator(cur + '.sets').count() === 1, 'misma pantalla para un usuario nuevo');
  await tapCur(p, '.sets .check[data-set="0"]:not(.drop-c)');
  ok(await p.evaluate(() => state.draft.exercises[0].log[0].done), 'marca la serie');
  await shot(p, 'b1-nuevo');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}

console.log('C. Pantalla de 360 px');
{
  const p = await open(DIR, { seed: OWNER, w: 360 });
  await p.evaluate(START); await p.waitForTimeout(800);
  const r = await p.evaluate(c => { const card = document.querySelector(c + '.card.ex'), sets = card.querySelector('.sets'); return { doc: document.documentElement.scrollWidth, card: card.getBoundingClientRect().right, sets: sets.scrollWidth <= sets.clientWidth + 1 }; }, cur);
  ok(r.doc <= 360 && r.card <= 360 && r.sets, 'sin desbordes a 360 px (la tabla cabe)');
  await shot(p, 'c1-360');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}
/* Recomendación del coach arriba (18-oct-2026): compacta, "Ver más" y la 1.ª serie a la vista sin deslizar */
for (const [w, h] of [[360, 740], [360, 640], [390, 844]]) {
  console.log(`C2. Coach arriba a ${w}×${h}`);
  const p = await open(DIR, { seed: OWNER, w, h });
  await p.evaluate(START); await p.waitForTimeout(800);
  const c = await p.evaluate(c => {
    const card = document.querySelector(c + '.card.ex'), box = card.querySelector('.su-co'), kids = [...card.children], b = box.getBoundingClientRect(), ck = card.querySelector('.sets .check').getBoundingClientRect();
    const lh = parseFloat(getComputedStyle(box).lineHeight) || 18;
    return { after: kids.indexOf(box) === kids.indexOf(card.querySelector('.su-pills')) + 1, h: Math.round(b.height), top: Math.round(b.top), ck: Math.round(ck.bottom), vh: innerHeight, icon: !!box.querySelector('.coach-ic svg, .coach-ic'),
      head: box.querySelector('.coach-h').textContent.trim(), more: (box.querySelector('.su-more') || {}).textContent || '', lines: Math.round((b.height - 18) / lh), sw: document.documentElement.scrollWidth };
  }, cur);
  console.log(`     coach: «${c.head}» · ${c.h} px · 1.ª serie termina en ${c.ck} de ${c.vh}`);
  ok(c.after && c.icon, 'el recuadro del coach va justo bajo las píldoras, antes de la tabla');
  ok(c.h <= 90, `compacto: ${c.h} px (máx. 90, unas 3 líneas)`);
  ok(c.ck <= c.vh, '1.ª serie (con su ✓) visible sin deslizar');
  ok(c.sw <= w, 'sin desbordes');
  if (c.more) {
    await p.locator(cur + '.su-co').first().click(); await p.waitForTimeout(200);
    const o = await p.evaluate(c => { const box = document.querySelector(c + '.su-co'); return { open: box.classList.contains('su-open'), h: Math.round(box.getBoundingClientRect().height), more: box.querySelector('.su-more').textContent, lis: [...box.querySelectorAll('li')].filter(l => l.offsetHeight).length }; }, cur);
    ok(o.open && o.h > c.h && o.more === 'Ver menos', `"Ver más" lo abre ahí mismo (${c.h} → ${o.h} px)`);
    await p.evaluate(() => render()); await p.waitForTimeout(200);
    ok(await p.evaluate(c => document.querySelector(c + '.su-co').classList.contains('su-open'), cur), 'sigue abierto después de redibujar');
    await p.locator(cur + '.su-co').first().click(); await p.waitForTimeout(200);
    ok(await p.evaluate(c => !document.querySelector(c + '.su-co').classList.contains('su-open'), cur), '"Ver menos" lo cierra');
  }
  await shot(p, `c2-coach-${w}x${h}`);
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}

console.log('D. Reloj');
{
  const p = await open(DIR, { seed: OWNER, watch: true }), q = await open(OLD, { seed: OWNER, watch: true });
  let d = await pixDiff(await shot(p, 'd1-reloj'), await shot(q, 'd1-reloj-antes'));
  ok(d === 0, 'inicio del reloj idéntico' + (d ? ` (${d} px)` : ''));
  await p.evaluate(START); await q.evaluate(START); await p.waitForTimeout(800); await q.waitForTimeout(800);
  d = await pixDiff(await shot(p, 'd2-reloj-sesion'), await shot(q, 'd2-reloj-sesion-antes'));
  ok(d === 0, 'sesión del reloj idéntica' + (d ? ` (${d} px)` : ''));
  const s0 = await snd(p); await p.evaluate(() => markSet(0, 0, true)); const s1 = await snd(p);
  ok(s1.osc === s0.osc, 'en el reloj marcar no suena (como antes)');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done(); await q.done();
}

await browser.close();
console.log(fail ? `\n${fail} FALLA(S)` : '\nTodo OK');
process.exit(fail ? 1 : 0);
