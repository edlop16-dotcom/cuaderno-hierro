// Prueba de la Tanda A: catálogo (catalog.js) y búsqueda (libui.js), con Playwright y Edge.
// Uso (desde PowerShell): $env:PW_DIR = "<carpeta con node_modules/playwright>"; node tests/tcat.mjs <copia transpilada> <copia transpilada anterior> [capturas]
// A. Dueño: Biblioteca agrupada con conteos, filtros por músculo, equipo y máquina (combinables), búsqueda con alias,
//    tildes y mayúsculas, "Ver más", favoritos y "En mi plan"; selector de ejercicios; velocidad con la CPU ×4.
//    Cuántas sesiones de Hevy "Press de Banca (Máquina Smith)" quedaron como Press Banca Plano (Barra).
// B. Usuario nuevo: buscar por músculo y por máquina y agregar a una rutina.
// C. Reloj: inicio idéntico y tiempo de arranque (CPU ×6) frente a la versión anterior.
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

async function open(dir, { seed, watch, at, cpu } = {}) {
  const srv = await serve(dir);
  const ctx = await browser.newContext(watch ? { viewport: { width: 410, height: 500 }, hasTouch: true } : { viewport: { width: 390, height: 844 }, hasTouch: true });
  await ctx.route(/googleapis|gstatic|google\.com|firebase/, r => r.abort());
  const p = await ctx.newPage(); p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message));
  await p.clock.setFixedTime(at || new Date('2026-10-19T08:00:30'));
  await p.addInitScript(o => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); if (o) { localStorage.setItem('cdh.settings', JSON.stringify(o)); localStorage.setItem('cdh.newsSeen', '"n5"'); } } }, seed || null);
  p.url0 = `http://127.0.0.1:${srv.address().port}/index.html`;
  await p.goto(p.url0); await p.waitForTimeout(2500);
  await p.evaluate(() => { if (state.settings.pub) state.settings.onb = 1; LS.set('newsSeen', NEWS_KEY); state.settings.healthOk = 1; savePlans(); });
  if (cpu) { p.cdp = await ctx.newCDPSession(p); await p.cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu }); }
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
const tap = async (p, sel) => { await p.locator(sel).first().click(); await p.waitForTimeout(150); };
const lib = p => p.evaluate(() => ({ heads: [...document.querySelectorAll('#lu-list .lu-gh')].map(h => h.innerText.replace(/\s+/g, ' ')), cards: [...document.querySelectorAll('#lu-list .exc .nm')].map(n => n.textContent), svgs: document.querySelectorAll('#app svg.fig-svg').length }));
const typeQ = async (p, sel, v) => { await p.locator(sel).fill(v); await p.waitForTimeout(400); };

console.log('A. Dueño: Biblioteca');
{
  const p = await open(DIR, { seed: OWNER, cpu: 4 });
  const t0 = Date.now(); await p.evaluate(() => { state.tab = 'guide'; render(); }); const t = Date.now() - t0;
  await p.waitForTimeout(400);
  let L = await lib(p);
  console.log(`     Biblioteca con la CPU ×4: ${t.toFixed(0)} ms para dibujarla; ${L.cards.length} tarjetas y ${L.svgs} figuras dibujadas al abrir`);
  ok(t < 400, 'se abre rápido en el teléfono (< 400 ms con la CPU ×4)');
  ok(L.svgs < 40, 'solo se dibujan las figuras que se ven (carga diferida)');
  const lbl = await p.evaluate(() => (document.querySelector('#app .pagehead .label') || {}).textContent || '');
  ok(/414 ejercicios/.test(lbl), 'encabezado: ' + lbl);
  ok(L.heads[0] && /Pecho \d+/.test(L.heads[0]) && L.heads.length >= 13, 'agrupado por músculo con su conteo: ' + L.heads.join(' · '));
  await shot(p, 'a1-biblioteca');
  await tap(p, '#app [data-act="lu-m"][data-v="pant"]'); L = await lib(p);
  ok(L.heads.length === 1 && /Pantorrillas 17/.test(L.heads[0]) && L.cards.length === 17, 'filtro Pantorrillas: ' + L.heads[0] + ' (se ven todas)');
  ok(['Elevación de Talones en Prensa', 'Elevación de Talones en Hack', 'Elevación de Talones en Smith', 'Elevación de Talones con Mancuernas', 'Elevación de Talones a una Pierna con Mancuerna', 'Elevación de Talones en Escalón', 'Elevación de Talones de Pie', 'Elevación de Talones Sentado'].every(n => L.cards.includes(n)), 'pantorrillas: de pie, sentado, prensa, hack, Smith, mancuernas, a una pierna y escalón');
  await tap(p, '#app [data-act="lu-f"][data-v="maq"]'); L = await lib(p);
  ok(L.cards.length >= 5 && L.cards.every(n => !/mancuerna|smith|barra|escalon/i.test(n.normalize('NFD').replace(/[̀-ͯ]/g, ''))), 'Pantorrillas + Máquina: ' + L.cards.join(', '));
  ok(await p.locator('#app .lu-spec [data-act="lu-s"]').count() > 10, 'con "Máquina" aparece la fila de máquinas concretas');
  await tap(p, '#app [data-act="lu-s"][data-v="prensa"]'); L = await lib(p);
  ok(L.cards.length === 2 && L.cards.includes('Elevación de Talones en Prensa'), 'Pantorrillas + Máquina + Prensa 45°: ' + L.cards.join(', '));
  await tap(p, '#app [data-act="lu-m"][data-v="all"]'); L = await lib(p);
  ok(L.cards.includes('Prensa 45°') && L.cards.includes('Prensa a una Pierna') && L.cards.includes('Elevación de Talones en Prensa'), 'todos los de la prensa 45°: ' + L.cards.length);
  await tap(p, '#app [data-act="lu-f"][data-v="smith"]'); await tap(p, '#app [data-act="lu-m"][data-v="pecho"]'); L = await lib(p);
  ok(['Press de Banca en Smith', 'Press Inclinado en Smith', 'Press Declinado en Smith'].every(n => L.cards.includes(n)), 'Pecho + Smith: ' + L.cards.join(', '));
  await shot(p, 'a2-filtros');
  await tap(p, '#app [data-act="lu-m"][data-v="all"]'); await tap(p, '#app [data-act="lu-f"][data-v="all"]');
  const search = async (q, want) => { await typeQ(p, '#guide-q', q); const c = (await lib(p)).cards; ok(c[0] === want, `buscar "${q}" → ${c.slice(0, 3).join(' · ')}`); return c; };
  await search('contractora', 'Pec Deck (Contractora)');
  await search('PAJAROS', 'Pájaros (Deltoide Posterior)');
  await search('scott', 'Curl Predicador (Scott)');
  await search('gemelos prensa', 'Elevación de Talones en Prensa');
  await search('barra v', 'Extensión de Tríceps con Barra V en Polea');
  await search('press inclinado smith', 'Press Inclinado en Smith');
  await search('Remo Seal con Barra', 'Remo Foca');
  await search('navaja', 'Abdominal en V');
  await typeQ(p, '#guide-q', 'bíceps polea'); const c = (await lib(p)).cards;
  ok(c.length >= 6 && c.every(n => n), '"bíceps polea" con tilde: ' + c.length + ' resultados');
  const ae = await p.evaluate(() => document.activeElement && document.activeElement.id);
  ok(ae === 'guide-q', 'al escribir no se pierde el foco del buscador');
  await typeQ(p, '#guide-q', 'xyzzy'); ok((await p.evaluate(() => document.getElementById('lu-list').innerText)).includes('No encontré'), 'sin resultados lo dice');
  await typeQ(p, '#guide-q', '');
  const more = await p.locator('#app [data-act="lu-more"]').first(); const before = (await lib(p)).cards.length; await more.click(); await p.waitForTimeout(200);
  ok((await lib(p)).cards.length > before, '"Ver más" muestra el resto del grupo');
  await p.evaluate(() => { state.exG = 'plan'; render(); }); L = await lib(p);
  ok(L.cards.includes('Prensa 45°') && L.cards.length < 30, '"En mi plan": ' + L.cards.length);
  await p.evaluate(() => { state.exG = 'all'; render(); });
  await tap(p, '#app [data-act="ex-tap"]');
  ok(await p.locator('#sheet').isVisible(), 'tocar un ejercicio abre su ficha como antes');
  await p.evaluate(() => closeSheet());
  console.log('A2. Selector de ejercicios');
  const tq = Date.now(); await p.evaluate(() => { const pl = activePlan(), d = pl.days[0]; pkOpen(pl.id, d.id); }); const tp = Date.now() - tq;
  await p.waitForTimeout(300);
  console.log(`     selector con la CPU ×4: ${tp.toFixed(0)} ms`);
  ok(tp < 400, 'el selector abre rápido');
  ok(await p.locator('#sheet .lu-pkf [data-act="lu-pkm"]').count() === 15, 'filtros por músculo en el selector');
  ok(await p.locator('#pk-list .lu-pks').count() >= 13, 'agrupado por músculo');
  await tap(p, '#sheet [data-act="lu-pkf"][data-v="polea"]'); await tap(p, '#sheet [data-act="lu-pkm"][data-v="tri"]');
  const names = await p.evaluate(() => [...document.querySelectorAll('#pk-list .pk-main b')].map(b => b.textContent));
  ok(names.includes('Extensión de Tríceps con Barra V en Polea') && names.includes('Tríceps con Cuerda') && names.includes('Tríceps Polea'), 'Tríceps + Polea: ' + names.length + ' (barra V, cuerda, barra recta…)');
  await shot(p, 'a3-selector');
  await typeQ(p, '#pk-q', 'cuerda');
  const n2 = await p.evaluate(() => [...document.querySelectorAll('#pk-list .pk-main b')].map(b => b.textContent));
  ok(n2[0] === 'Tríceps con Cuerda', 'buscar dentro de un filtro ("cuerda" en Tríceps + Polea): ' + n2.slice(0, 3).join(' · '));
  await p.evaluate(() => { closeSheet(); state.pk = null; });
  console.log('A3. Tu Press de Banca (Máquina Smith) de Hevy');
  const sm = await p.evaluate(() => {
    const days = {}; MY_HEVY.split('\n').slice(1).forEach(l => { const c = l.split('","'); if (c[4] && c[4].indexOf('Press de Banca (Máquina Smith)') === 0) days[c[1]] = (days[c[1]] || 0) + 1; });
    return { days, mapped: mapExName('Press de Banca (Máquina Smith)'), now: libFind('Press de Banca (Máquina Smith)').name, smith: !!libFind('Press de Banca en Smith') };
  });
  console.log(`     Hevy lo trae en ${Object.keys(sm.days).length} sesión(es): ${Object.keys(sm.days).map(d => d + ' (' + sm.days[d] + ' series)').join(', ')}; se guardó como "${sm.mapped}" y sigue igual ("${sm.now}"). Ya existe "Press de Banca en Smith": ${sm.smith}`);
  ok(sm.mapped === 'Press Banca Plano (Barra)' && sm.smith, 'no se movió nada (decides tú)');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}

console.log('B. Usuario nuevo');
{
  const p = await open(DIR, {});
  await p.evaluate(() => { state.tab = 'guide'; render(); }); await p.waitForTimeout(300);
  await tap(p, '#app [data-act="lu-m"][data-v="glu"]');
  let L = await lib(p);
  ok(L.cards.length === 32 && L.cards.includes('Hip Thrust'), 'Glúteos: ' + L.cards.length);
  await tap(p, '#app [data-act="lu-f"][data-v="maq"]'); await tap(p, '#app [data-act="lu-s"][data-v="abductor"]'); L = await lib(p);
  ok(L.cards.length >= 2 && L.cards.includes('Abducción de Cadera'), 'Glúteos + Abductor: ' + L.cards.join(', '));
  await shot(p, 'b1-nuevo');
  const r = await p.evaluate(() => { const pl = state.plans[0], d = pl.days[0]; pkOpen(pl.id, d.id); return { pid: pl.id, did: d.id }; });
  await typeQ(p, '#pk-q', 'hack gemelos');
  await tap(p, '#pk-list [data-act="pk-tog"][data-name="Elevación de Talones en Hack"]');
  await tap(p, '#sheet [data-act="pk-add"]');
  const has = await p.evaluate(r => findDay(r.pid, r.did).d.exercises.some(e => e.name === 'Elevación de Talones en Hack'), r);
  ok(has, 'agregar "Elevación de Talones en Hack" a una rutina desde la búsqueda');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}

console.log('C. Reloj');
{
  const at = new Date('2026-10-19T08:00:30');
  const p = await open(DIR, { seed: OWNER, watch: true, at }), q = await open(OLD, { seed: OWNER, watch: true, at });
  const d = await pixDiff(await shot(p, 'c-reloj'), await shot(q, 'c-reloj-antes'));
  ok(d === 0, 'inicio del reloj idéntico a la versión anterior' + (d ? ` (${d} píxeles)` : ''));
  const time = async (pg) => { const cdp = await pg.context().newCDPSession(pg); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 }); const v = []; for (let i = 0; i < 5; i++) { const t0 = Date.now(); await pg.reload({ waitUntil: 'domcontentloaded' }); v.push(Date.now() - t0); await pg.waitForTimeout(1500); } return Math.round(v.sort((a, b) => a - b)[2]); };
  const tn = await time(p), to = await time(q);
  console.log(`     arranque del reloj con la CPU ×6: ahora ${tn} ms, antes ${to} ms (${tn - to >= 0 ? '+' : ''}${tn - to} ms)`);
  ok(tn - to < 150, 'el arranque del reloj no se vuelve notablemente más lento (< 150 ms de diferencia con la CPU ×6)');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done(); await q.done();
}

await browser.close();
console.log(fail ? `\n${fail} FALLA(S)` : '\nTodo OK');
process.exit(fail ? 1 : 0);
