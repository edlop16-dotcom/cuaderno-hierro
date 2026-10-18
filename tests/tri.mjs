// Prueba: importar rutinas de otra IA (rimport.js), con Playwright y Edge.
// Uso (desde PowerShell): $env:PW_DIR = "<carpeta con node_modules/playwright>"; node tests/tri.mjs <copia transpilada> <copia transpilada anterior> [capturas]
// A. Dueño: elegir crear/importar, texto en español con markdown, dudosos, buscar otro, nombres repetidos, guardar sin tocar lo de antes,
//    etiqueta y chip, segunda importación, inglés en el plan activo con Otra IA, archivo, tabla, crear uno nuevo, historial compartido.
// B. Usuario nuevo: tabla de DeepSeek. C. Reloj: inicio idéntico, rutinas importadas se entrenan. Textos en tests/rutinas/.
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
  await p.clock.setFixedTime(at || new Date('2026-10-19T10:30:30'));
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

const TXT = f => fs.readFileSync(path.join(HERE, 'rutinas', f + '.txt'), 'utf8');
const snapPlans = p => p.evaluate(() => JSON.stringify(state.plans.map(x => ({ id: x.id, name: x.name, days: x.days }))));
const pv = p => p.evaluate(() => { const F = state.rI; return F ? { days: F.days.map(d => ({ name: d.name, wd: d.wd, n: d.ex.length, ex: d.ex.map(e => ({ raw: e.raw, name: e.name })) })), pend: riPend(F) } : null; });
const sheetOn = p => p.evaluate(() => !$('#sheet').hidden);
async function goImport(p, txt) {
  await p.evaluate(() => { closeSheet(); state.tab = 'plans'; render(); scrollTo(0, 0); });
  await p.locator('#app [data-act="rt-new"]').first().click(); await p.waitForTimeout(250);
  await p.click('#sheet [data-ri="import"]'); await p.waitForTimeout(250);
  if (txt != null) await p.fill('#ri-txt', txt);
  await p.click('#sheet [data-ri="read"]'); await p.waitForTimeout(400);
}

console.log('A. Dueño');
{
  const p = await open(DIR, { seed: OWNER });
  const before = await snapPlans(p), nSess = await p.evaluate(() => state.sessions.length), nMy = await p.evaluate(() => (state.settings.myEx || []).length);
  await p.evaluate(() => { state.tab = 'plans'; render(); scrollTo(0, 0); });
  await p.locator('#app [data-act="rt-new"]').first().click(); await p.waitForTimeout(250);
  const ch = await p.evaluate(() => [...document.querySelectorAll('#sheet .ri-opt b')].map(b => b.textContent));
  ok(ch.join('|') === 'Crear desde cero|Importar rutinas', '"Nueva rutina" pregunta: Crear desde cero o Importar rutinas');
  await shot(p, 'a1-elegir');
  await p.click('#sheet [data-ri="scratch"]'); await p.waitForTimeout(250);
  ok(await p.locator('#f-rtnew').count() === 1, '"Crear desde cero" abre la hoja de siempre');
  await p.evaluate(() => closeSheet());
  /* Importar el texto en español con markdown */
  await goImport(p, '');
  ok(await p.evaluate(() => /Pega el texto/.test(document.querySelector('#sheet .se-err') ? document.querySelector('#sheet .se-err').textContent : '')), 'sin texto: avisa y no avanza');
  await p.fill('#ri-txt', 'hola, ¿cómo estás?'); await p.click('#sheet [data-ri="read"]'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => /No encontré ejercicios/.test((document.querySelector('#sheet .se-err') || {}).textContent || '')), 'texto sin ejercicios: lo dice');
  await p.fill('#ri-txt', TXT('es-markdown')); await p.click('#sheet [data-ri="read"]'); await p.waitForTimeout(400);
  let V = await pv(p);
  console.log('     ' + V.days.map(d => `${d.name} [${d.n}]`).join(' · '));
  ok(V.days.length === 4 && V.days.map(d => d.n).join(',') === '5,5,5,4', 'detecta 4 rutinas (Día 1-4) con sus ejercicios; ignora Notas y calentamiento');
  ok(V.days[0].ex[0].name === 'Press Banca Plano (Barra)' && V.days[2].ex[0].name === 'Sentadilla con Barra' && V.days[3].ex[3].name === 'Pájaros (Deltoide Posterior)', 'empareja con el catálogo (Press banca con barra, Sentadilla, Pájaros…)');
  const E0 = await p.evaluate(() => state.rI.days[0].ex[0]);
  ok(E0.sets === 4 && E0.rMin === 6 && E0.rMax === 8 && E0.rir.join() === '2' && E0.rest === 180, 'lee series, reps, RIR y descanso (4 × 6-8, RIR 2, 3 min)');
  ok(await p.evaluate(() => state.rI.days[1].ex[1].rir.join() === '2'), 'RPE 8 → RIR 2');
  ok(V.pend === 1 && V.days[1].ex[2].name === null, 'marca el dudoso: «Jalón al pecho agarre neutro»');
  ok(await p.locator('#sheet .ri-ex.doubt [data-ri="pick"]').first().textContent() === 'Jalón Agarre Neutro', 'propone el más parecido primero (Jalón Agarre Neutro)');
  await shot(p, 'a2-vista-previa');
  /* Guardar con dudas: no guarda */
  await p.locator('#sheet .pk-bottom [data-ri="save"]').click(); await p.waitForTimeout(400);
  ok(await snapPlans(p) === before && await sheetOn(p), 'con un dudoso sin elegir no guarda (lo señala)');
  await p.locator('#sheet .ri-ex.doubt [data-ri="pick"]').first().click(); await p.waitForTimeout(250);
  ok((await pv(p)).pend === 0, 'elegido de la lista');
  /* Cambiar uno con "Buscar otro" */
  await p.locator('#ri-0-4 [data-ri="search"]').click(); await p.waitForTimeout(250);
  await p.fill('#ri-q', 'fondos maquina'); await p.waitForTimeout(400);
  await p.locator('#ri-list [data-name="Fondos en Máquina"]').click(); await p.waitForTimeout(250);
  ok((await pv(p)).days[0].ex[4].name === 'Fondos en Máquina', '"Cambiar" → buscar → elegir otro ejercicio');
  /* Editar: nombre repetido, series, quitar un ejercicio */
  const exist = await p.evaluate(() => gymPlans(activeGym().id)[0].days[0].name);
  await p.fill('#sheet .ri-dn[data-d="2"]', exist);
  await p.fill('#sheet .ri-in[data-d="0"][data-e="1"][data-f="sets"]', '4');
  await p.fill('#sheet .ri-in[data-d="0"][data-e="1"][data-f="rir"]', '2,1,0');
  await p.locator('#ri-3-2 [data-ri="xtog"]').click(); await p.waitForTimeout(250);
  ok(await p.evaluate(() => state.rI.days[3].ex[2].on === false && state.rI.days[0].ex[1].sets === 4), 'edita series/RIR y quita un ejercicio');
  /* Guardar */
  await p.locator('#sheet .pk-bottom [data-ri="save"]').click(); await p.waitForTimeout(600);
  const R = await p.evaluate(ex => { const P = state.plans.filter(p => p.src); const p = P[P.length - 1]; return { name: p && p.name, days: p ? p.days.map(d => ({ name: d.name, src: d.src, n: d.exercises.length, ex: d.exercises })) : [], allLib: p && p.days.every(d => d.exercises.every(e => LIB.some(x => x.name === e.name))), dup: p && p.days.some(d => d.name === ex) }; }, exist);
  console.log('     guardado: ' + R.name + ' → ' + R.days.map(d => `${d.name} (${d.n})`).join(' · '));
  ok(R.name === 'Rutinas de Claude' && R.days.length === 4, 'crea un plan nuevo «Rutinas de Claude» con 4 rutinas');
  ok(await p.evaluate(b => { const now = JSON.parse(JSON.stringify(state.plans.map(x => ({ id: x.id, name: x.name, days: x.days })))); const old = JSON.parse(b); return old.every(o => JSON.stringify(now.find(n => n.id === o.id)) === JSON.stringify(o)); }, before), 'las rutinas que ya tenías quedan idénticas (nada se reemplaza ni se borra)');
  ok(R.days.some(d => d.name === exist + ' (Claude)') && !R.dup, `nombre repetido → «${exist} (Claude)»`);
  ok(R.allLib && await p.evaluate(n => (state.settings.myEx || []).length === n, nMy), 'todos los ejercicios son del catálogo (sin duplicados)');
  const pb = R.days[0].ex[0], dbi = R.days[0].ex[1];
  ok(pb.sets === 4 && pb.repsMin === 6 && pb.repsMax === 8 && pb.rest === 180 && pb.rirT.join() === '2,2,2,2', 'Press banca: 4 × 6-8, RIR 2 en cada serie, descanso 3 min');
  ok(dbi.sets === 4 && dbi.rirT.join() === '2,1,0,0', 'RIR por serie editado (2,1,0)');
  ok(R.days[0].src.n === 'Claude' && R.days[0].src.c === '#d97757', 'etiqueta Claude en naranja');
  ok(await p.evaluate(() => state.sessions.length) === nSess, 'el historial no cambia');
  /* Chip de color en Rutinas y cambiarlo */
  await p.evaluate(() => { state.tab = 'plans'; render(); document.querySelectorAll('#app details').forEach(d => { d.open = true; }); render(); });
  await p.waitForTimeout(300);
  const chips = await p.evaluate(() => [...document.querySelectorAll('#app .ri-chip')].map(c => c.textContent));
  ok(chips.length >= 4 && chips.every(t => t === 'Claude'), `chip de color en la lista de rutinas (${chips.length})`);
  await p.locator('#app .ri-chip').first().scrollIntoViewIfNeeded(); await shot(p, 'a3-rutinas-chip');
  await p.locator('#app .ri-chip').first().click(); await p.waitForTimeout(250);
  ok(await p.evaluate(() => /Origen de/.test(document.querySelector('#sheet h2').textContent)), 'tocar el chip abre "Origen de …"');
  await p.click('#sheet [data-ri="ssrc"][data-v="deepseek"]'); await p.click('#sheet [data-ri="ssave"]'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => state.plans.some(p => p.days.some(d => d.src && d.src.n === 'DeepSeek' && d.src.c === '#4d6bfe'))), 'cambiada a DeepSeek (azul)');
  /* Otra vez lo mismo como ChatGPT: no pisa, agrega sufijo */
  await goImport(p, TXT('es-markdown'));
  await p.locator('#sheet .ri-ex.doubt [data-ri="pick"]').first().click(); await p.waitForTimeout(200);
  await p.click('#sheet [data-ri="src"][data-v="chatgpt"]'); await p.waitForTimeout(200);
  await p.locator('#sheet .pk-bottom [data-ri="save"]').click(); await p.waitForTimeout(500);
  const R2 = await p.evaluate(() => { const p = state.plans[state.plans.length - 1]; return { name: p.name, days: p.days.map(d => d.name), c: p.days[0].src.c }; });
  const taken1 = await p.evaluate(() => state.plans.filter(p => p.name !== 'Rutinas de ChatGPT').flatMap(p => p.days.map(d => d.name)));
  console.log('     [' + R2.name + '] ' + R2.days.join(' · ') + ' / ' + R2.c + ' / ' + R2.days.filter(n => taken1.indexOf(n) >= 0).join('; '));
  ok(R2.name === 'Rutinas de ChatGPT' && R2.days.filter(n => / \(ChatGPT\)$/.test(n)).length >= 3 && R2.days.every(n => taken1.indexOf(n) < 0) && R2.c === '#000000', 'segunda importación (ChatGPT, negro): los nombres repetidos llevan «(ChatGPT)», nada se pisa');
  /* Otra IA con nombre y color, guardada en el plan activo */
  await goImport(p, TXT('en-list'));
  V = await pv(p);
  ok(V.days.length === 4 && V.pend === 0 && V.days[0].ex[0].name === 'Press Banca Plano (Barra)' && V.days[0].wd === 1 && V.days[3].wd === 5, 'texto en inglés: 4 rutinas, todo reconocido (Bench Press = Press Banca…), Lunes a Viernes');
  await p.click('#sheet [data-ri="src"][data-v="other"]'); await p.waitForTimeout(200);
  await p.fill('#ri-on', 'Gemini'); await p.click('#sheet [data-ri="col"][data-v="#9b6bff"]'); await p.waitForTimeout(200);
  const act = await p.evaluate(() => activePlan().id); await p.selectOption('#ri-plan', act);
  await shot(p, 'a4-otra-ia');
  const actBefore = await p.evaluate(() => JSON.stringify(activePlan().days));
  await p.locator('#sheet .pk-bottom [data-ri="save"]').click(); await p.waitForTimeout(500);
  const R3 = await p.evaluate(b => { const a = activePlan(), old = JSON.parse(b); return { kept: old.every(o => JSON.stringify(a.days.find(d => d.id === o.id)) === JSON.stringify(o)), add: a.days.filter(d => d.src && d.src.n === 'Gemini').map(d => d.src.c) }; }, actBefore);
  ok(R3.kept && R3.add.length === 4 && R3.add[0] === '#9b6bff', 'Otra IA «Gemini» (morado) en el plan activo: suma 4 rutinas sin tocar las suyas');
  /* Subir archivo */
  await goImport(p, null);
  await p.evaluate(() => { const T = state.riT; T.txt = ''; });
  await p.setInputFiles('#ri-file', path.join(HERE, 'rutinas', 'tabla.txt')); await p.waitForTimeout(500);
  ok(await p.evaluate(() => /Full body A/.test(document.getElementById('ri-txt').value)), 'subir un archivo .txt llena el texto');
  await p.click('#sheet [data-ri="read"]'); await p.waitForTimeout(400);
  V = await pv(p);
  ok(V.days.length === 2 && V.days[0].wd === 1 && V.days[1].wd === 3 && V.pend === 1, 'tabla: 2 rutinas (Lunes y Miércoles) y un dudoso');
  ok(await p.evaluate(() => { const e = state.rI.days[0].ex[2]; return e.rir.join() === '2' && e.rest === 90; }), 'tabla: RIR 1-2 → 2 (el más prudente), descanso 90 s');
  /* Crearlo nuevo: Cancelar vuelve, Crear lo asigna */
  await p.locator('#sheet .ri-ex.doubt [data-ri="create"]').click(); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.getElementById('my-name').value === 'Máquina de gemelos inclinada rara'), '"Crear «…»" abre Crear ejercicio con el nombre');
  await p.click('#sheet [data-my="cancel"]'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => !!document.querySelector('#sheet .ri-sheet') && riPend(state.rI) === 1), 'Cancelar vuelve a la vista previa');
  await p.locator('#sheet .ri-ex.doubt [data-ri="create"]').click(); await p.waitForTimeout(300);
  await p.click('#sheet [data-my="zm"][data-v="pant"]'); await p.waitForTimeout(150);
  await p.locator('#sheet .pk-bottom [data-my="save"]').click(); await p.waitForTimeout(400);
  if (await p.locator('#sheet [data-my="force"]').count()) { await p.click('#sheet [data-my="force"]'); await p.waitForTimeout(400); }
  ok(await p.evaluate(() => !!state.rI && riPend(state.rI) === 0 && state.rI.days[1].ex[3].name === 'Máquina de gemelos inclinada rara' && LIB.some(x => x.mine && x.name === 'Máquina de gemelos inclinada rara')), 'creado como ejercicio mío y asignado');
  await p.click('#sheet [data-ri="src"][data-v="deepseek"]');
  await p.locator('#sheet .pk-bottom [data-ri="save"]').click(); await p.waitForTimeout(500);
  /* Historial compartido: entrenar Press banca desde la rutina importada */
  const H = await p.evaluate(() => {
    const p = state.plans.find(x => x.name === 'Rutinas de Claude'), d = p.days[0], g = p.gymId, kind = d.kind;
    const lp = lastPerf('Press Banca Plano (Barra)', g, kind);
    startSession(p.id, d.id);
    const e = state.draft.exercises[0];
    return { name: e.name, prev: JSON.stringify(e.prev), lp: lp ? JSON.stringify(lp.sets.map(s => ({ w: s.w, r: s.r }))) : null, rirT: e.rirT, sugg: e.sugg && e.sugg.w };
  });
  console.log('     ' + JSON.stringify(H));
  ok(H.name === 'Press Banca Plano (Barra)' && H.lp && H.prev && JSON.parse(H.prev)[0].w === JSON.parse(H.lp)[0].w && H.sugg === JSON.parse(H.lp)[0].w, 'la sesión importada usa tu historial de Press Banca (último peso y sugerencia)');
  ok(H.rirT && H.rirT.join() === '2,2,2,2', 'y el RIR importado por serie');
  await shot(p, 'a5-sesion');
  await p.evaluate(() => { const e = state.draft.exercises[0]; e.log[0].w = 101; e.log[0].r = 8; e.log[0].done = true; saveDraft(); finishSession(); });
  await p.waitForTimeout(800);
  ok(await p.evaluate(() => { const s = state.sessions[0]; const lp = lastPerf('Press Banca Plano (Barra)', s.gymId || 'rokaz', 'fuerza', true) || lastPerf('Press Banca Plano (Barra)', s.gymId || 'rokaz', 'bombeo', true); return s.exercises[0].name === 'Press Banca Plano (Barra)' && s.exercises[0].sets[0].w === 101; }), 'se guarda como siempre, con el mismo nombre del catálogo (mismo historial y récords)');
  ok(await p.evaluate(() => exFromLib(LIB.find(x => x.name === 'Press Banca Plano (Barra)')).weight === 101), 'y el peso nuevo se ve también desde una rutina normal');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}
console.log('B. Usuario nuevo');
{
  const p = await open(DIR, {});
  ok(await p.evaluate(() => pubUser()), 'usuario público');
  const before = await snapPlans(p);
  await goImport(p, TXT('tabla'));
  await p.locator('#ri-1-3 [data-ri="xtog"]').click(); await p.waitForTimeout(200);
  await p.click('#sheet [data-ri="src"][data-v="deepseek"]'); await p.waitForTimeout(200);
  await shot(p, 'b1-vista');
  await p.locator('#sheet .pk-bottom [data-ri="save"]').click(); await p.waitForTimeout(500);
  const R = await p.evaluate(() => { const p = state.plans[state.plans.length - 1]; return { name: p.name, n: p.days.map(d => d.exercises.length).join(','), c: p.days[0].src.c }; });
  ok(R.name === 'Rutinas de DeepSeek' && R.n === '4,3' && R.c === '#4d6bfe', 'importa 2 rutinas (DeepSeek, azul)');
  ok(await p.evaluate(b => JSON.parse(b).every(o => JSON.stringify(state.plans.find(n => n.id === o.id).days) === JSON.stringify(o.days)), before), 'su plan de inicio no cambia');
  await p.evaluate(() => { state.tab = 'plans'; render(); }); await shot(p, 'b2-rutinas');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}
console.log('C. Reloj 410×500');
{
  const p = await open(DIR, { seed: OWNER, watch: true }), q = await open(OLD, { seed: OWNER, watch: true });
  ok(await p.evaluate(() => isWatch()), 'modo reloj');
  ok((await shot(p, 'c-reloj')).equals(await shot(q, 'c-reloj-antes')), 'inicio del reloj idéntico a la versión anterior');
  await q.done();
  /* Rutinas importadas (llegan por sincronización): se ven y se entrenan igual */
  await p.evaluate(t => { state.rI = { days: riBuild(t), src: 'claude', on: '', oc: '#35b26a', plan: 'new' }; riSave(); const pl = state.plans[state.plans.length - 1]; state.settings.planByGym = Object.assign({}, state.settings.planByGym, { [activeGym().id]: pl.id }); state.settings.activePlanId = pl.id; savePlans(); state.tab = 'train'; render(); }, TXT('en-list'));
  await p.waitForTimeout(400);
  ok(await p.evaluate(() => !document.querySelector('.ri-chip')), 'sin chips nuevos en el reloj');
  await shot(p, 'c-reloj-importadas');
  await p.evaluate(() => { const pl = activePlan(); startSession(pl.id, pl.days[0].id); }); await p.waitForTimeout(600);
  ok(await p.evaluate(() => !!state.draft && /Press Banca Plano/.test(document.getElementById('app').textContent + document.body.textContent)), 'entrena una rutina importada en el reloj');
  await shot(p, 'c-reloj-sesion');
  ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
  await p.done();
}
await browser.close();
console.log(fail ? `${fail} FALLAS` : 'Todo OK');
process.exit(fail ? 1 : 0);
