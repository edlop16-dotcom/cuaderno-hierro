import { OWNER_SETTINGS } from './owner-fixture.mjs';
// Prueba de la rama cu-total, con datos inventados: anotar mancuernas "c/u" o "Total", corregir una o dos mancuernas en la
// sesión, aviso de pesos que no existen, la nota en una línea y el reloj (solo el texto y lo que se escribe).
// Uso: $env:PW_DIR = "<carpeta con node_modules/playwright>"; node tests/tct.mjs <copia transpilada> [<copia anterior>]
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = createRequire(path.join(process.env.PW_DIR || HERE, 'x.js'))('playwright');
const [DIR, BASE] = process.argv.slice(2);
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

/* ---------- Datos inventados (ya convertidos a c/u, como quedó el dueño tras la v1.0.68) ---------- */
const T0 = Date.parse('2026-11-14T11:00:00'), AT = T0 - 3600e3;
const PJ = 'Pájaros (Deltoide Posterior)', PMR = 'Peso Muerto Rumano con Mancuernas', TAL = 'Elevación de Talones con Mancuernas', RM = 'Remo con Mancuerna a una Mano', CMa = 'Curl Martillo', PR = 'Prensa 45°';
const S = (w, r, rir) => Object.assign({ w, r }, rir != null ? { rir } : {});
const EX = (name, sets, cu) => Object.assign({ name, type: 'Hombros', sets }, cu ? { cu: 1 } : {});
const SES = (id, at, ex) => ({ id, date: new Date(at).toISOString(), planId: 'pA', planName: 'Rutina A', dayId: 'd1', dayName: 'Torso', gymId: 'gA', gymName: 'Gimnasio A', kind: 'bombeo', durationSec: 3600, cuv: 1, cuc: AT, exercises: ex });
const HIST = [SES('s2', T0 - 2 * 864e5, [EX(PJ, [S(2.5, 15, 1), S(2.5, 15, 1), S(2.5, 15, 1)], 1), EX(PMR, [S(3.75, 10, 2)], 1), EX(TAL, [S(5.5, 15, 1)], 1), EX(RM, [S(20, 10, 2)]), EX(CMa, [S(10, 10, 1), S(10, 9, 1)], 1), EX(PR, [S(200, 10, 2)])])];
const PLANS = [{ id: 'pA', name: 'Rutina A', gymId: 'gA', days: [{ id: 'd1', name: 'Torso (Bombeo)', weekday: 6, kind: 'bombeo', exercises: [
  { id: 'e1', name: PJ, type: 'Hombros', weight: 2.5, sets: 3, repsMin: 12, repsMax: 15, rest: 60, cu: 1 },
  { id: 'e2', name: PMR, type: 'Piernas', weight: 3.75, sets: 2, repsMin: 10, repsMax: 12, rest: 90, cu: 1 },
  { id: 'e3', name: TAL, type: 'Piernas', weight: 5.5, sets: 2, repsMin: 15, repsMax: 20, rest: 45, cu: 1 },
  { id: 'e4', name: RM, type: 'Espalda', weight: 20, sets: 2, repsMin: 10, repsMax: 12, rest: 90 },
  { id: 'e5', name: CMa, type: 'Brazos', weight: 10, sets: 2, repsMin: 12, repsMax: 15, rest: 60, cu: 1 },
  { id: 'e6', name: PR, type: 'Piernas', weight: 200, sets: 2, repsMin: 10, repsMax: 12, rest: 90 }] }] }];
const GYMS = [{ id: 'gA', name: 'Gimnasio A' }];
const key = n => n.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const SET = () => { const s = Object.assign(structuredClone(OWNER_SETTINGS), { activePlanId: 'pA', activeGymId: 'gA', planByGym: { gA: 'pA' }, newsSeen: 'n6', g5Seed: 1, gymW: { gA: { db: [2.5, 5, 7.5, 10, 12], mach: 5 } } }); s.prof = Object.assign({}, s.prof, { goal: 'musculo', exp: 2, mins: 75 }); return s; };
async function open({ watch, first, dir } = {}) {
  const srv = await serve(dir || DIR);
  const ctx = await browser.newContext(watch ? { viewport: { width: 410, height: 500 }, hasTouch: true } : { viewport: { width: 390, height: 844 }, hasTouch: true });
  await ctx.route(/googleapis|gstatic|google\.com|firebase|github/, r => r.abort());
  const p = await ctx.newPage(); p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message));
  await p.clock.setFixedTime(new Date(T0));
  if (!first) await p.addInitScript(([s, pl, ss, g]) => { if (localStorage.getItem('cdh.seeded')) return; localStorage.setItem('cdh.seeded', '1');
    localStorage.setItem('cdh.settings', JSON.stringify(s)); localStorage.setItem('cdh.plans', JSON.stringify(pl)); localStorage.setItem('cdh.sessions', JSON.stringify(ss));
    localStorage.setItem('cdh.gyms', JSON.stringify(g)); localStorage.setItem('cdh.newsSeen', '"n6"'); }, [SET(), PLANS, HIST, GYMS]);
  await p.goto(`http://127.0.0.1:${srv.address().port}/index.html`); await p.waitForTimeout(1500);
  if (!first) await p.evaluate(([at, PJ, PMR, TAL, CMa]) => { state.settings.healthOk = 1; state.notifPerm = 'granted'; state.settings.cuConv = { v: 1, at, two: [PJ, PMR, TAL, CMa].map(exHKey), one: [exHKey('Remo con Mancuerna a una Mano')], max: [] }; savePlans(); closeSheet(); state.tab = 'train'; render(); }, [AT, PJ, PMR, TAL, CMa]);
  p.done = async () => { await ctx.close(); srv.close(); };
  return p;
}
const noErr = p => ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
const act = (p, sel) => p.evaluate(s => { const b = document.querySelector(s); if (!b) return false; b.click(); return true; }, sel);
const sheetTxt = p => p.evaluate(() => { const s = document.getElementById('sheet'); return s && !s.hidden ? s.innerText.replace(/\s+/g, ' ') : ''; });
const start = async p => { await p.evaluate(() => { startSession('pA', 'd1'); render(); }); await p.waitForTimeout(500); };
const idx = (p, n) => p.evaluate(n => state.draft.exercises.findIndex(e => e.name === n), n);
const stored = p => p.evaluate(() => JSON.stringify({ s: state.sessions.map(s => s.exercises.map(e => e.sets.map(x => x.w))), p: state.plans[0].days[0].exercises.map(e => e.weight), d: state.draft ? state.draft.exercises.map(e => e.log.map(x => x.w)) : null }));
const card = (p, i) => p.evaluate(i => { const c = document.querySelector(`#sx-pager .sx-page[data-i="${i}"] .card.ex`); if (!c) return null;
  return { hd: (c.querySelectorAll(':scope > .sets > .h')[2] || {}).textContent || '', inp: [...c.querySelectorAll(':scope > .sets input[data-f="w"]')].map(x => x.value), prev: [...c.querySelectorAll(':scope > .sets .prev')].map(b => b.innerText.replace(/\s+/g, ' ')), coach: [...c.querySelectorAll('.coach, .sugg, .g2-rec')].map(x => x.innerText.replace(/\s+/g, ' ')).join(' | '), hint: c.querySelector('.cu-hint') ? { txt: c.querySelector('.cu-hint').innerText.replace(/\s+/g, ' ').trim(), kids: c.querySelector('.cu-hint').children.length, h: c.querySelector('.cu-hint').getBoundingClientRect().height } : null, odd: (c.querySelector('.ct-odd') || {}).innerText || '', pill: (c.querySelector('.ct-n') || {}).textContent || '' }; }, i);

console.log('1. Pájaros (2,5 c/u × 15): modo c/u y modo Total');
{
  const p = await open(); await start(p);
  const i = await idx(p, PJ);
  let C = await card(p, i), K = await p.evaluate(n => { const c = coachFor({ name: n, sets: 3 }, 'gA', 'bombeo'); return { w: c.w, g: c.goal[0], head: c.head.replace(/<[^>]+>/g, '') }; }, PJ);
  ok(/kg c\/u/.test(C.hd) && C.inp.every(v => v === '5' || v === '2.5') && /2\.5/.test(C.prev[0]), 'modo c/u: encabezado "kg c/u", Anterior 2.5 (' + C.inp.join(',') + ' · ' + C.prev[0] + ')');
  ok(K.w === 5 && K.g === 12 && /Sube a 5 kg c\/u/.test(K.head), 'modo c/u: sugiere 5 kg c/u × 12 (' + K.head + ')');
  const before = await stored(p), w0 = C.inp.slice();
  await act(p, `#sx-pager .sx-page[data-i="${i}"] .cu-sw`); await p.waitForTimeout(200);
  C = await card(p, i); K = await p.evaluate(n => { const c = coachFor({ name: n, sets: 3 }, 'gA', 'bombeo'); return { w: c.w, g: c.goal[0], head: c.head.replace(/<[^>]+>/g, '') }; }, PJ);
  ok(await p.evaluate(() => state.settings.cuMode === 'tot') && /kg total/.test(C.hd), 'tocar el botón: modo Total ("kg total")');
  ok(C.inp.every((v, k) => +v === +w0[k] * 2) && /^5 /.test(C.prev[0]), 'los números cambian al instante: casillas ' + w0.join(',') + ' → ' + C.inp.join(',') + ', Anterior ' + C.prev[0]);
  ok(K.w === 5 && K.g === 12 && /Sube a 10 kg total/.test(K.head), 'modo Total: sugiere 10 kg total × 12 (el doble de 5, que existe) · ' + K.head);
  ok(/kg total/.test(C.coach) && !/c\/u/.test(C.coach), 'la recomendación de la tarjeta, en total: ' + C.coach.slice(0, 120));
  for (let k = 0; k < 4; k++) { await act(p, `#sx-pager .sx-page[data-i="${i}"] .cu-sw`); await p.waitForTimeout(120); }
  ok((await stored(p)) === before, 'cambiar de modo varias veces no altera nada guardado');
  /* Escribir en Total: 10 se guarda como 5 c/u; las series siguientes copian */
  const T = await p.evaluate(i => { const inp = document.getElementById('w-' + i + '-0'); inp.focus(); inp.value = '10'; inp.dispatchEvent(new Event('input', { bubbles: true })); const e = state.draft.exercises[i]; return { s: e.log.map(x => x.w), v: [...document.querySelectorAll(`#sx-pager .sx-page[data-i="${i}"] .sets input[data-f="w"]`)].map(x => x.value) }; }, i);
  ok(T.s.every(w => w === 5) && T.v.every(v => v === '10'), 'en Total escribes 10 → se guarda 5 c/u (también en las series siguientes, que muestran 10)');
  const iR = await idx(p, RM);
  const R = await p.evaluate(i => { const inp = document.getElementById('w-' + i + '-0'); inp.value = '22'; inp.dispatchEvent(new Event('input', { bubbles: true })); const c = document.querySelector(`#sx-pager .sx-page[data-i="${i}"] .card.ex`); return { w: state.draft.exercises[i].log[0].w, hd: c.querySelectorAll(':scope > .sets > .h')[2].textContent, sw: !!c.querySelector('.cu-sw') }; }, iR);
  ok(R.w === 22 && R.hd === 'Kg' && !R.sw, 'remo a una mano: sin botón, se guarda lo que escribes (22)');
  const iP = await idx(p, PR); ok(!(await p.evaluate(i => !!document.querySelector(`#sx-pager .sx-page[data-i="${i}"] .cu-sw, #sx-pager .sx-page[data-i="${i}"] .ct-n`), iP)), 'prensa: sin botón ni "¿cuántas mancuernas?"');
  /* La nota en una línea, según el modo */
  ok(C.hint && C.hint.kids <= 2 && /Anota el peso de las dos juntas/.test(C.hint.txt) && C.hint.h < 40, 'la nota en una línea: "' + (C.hint && C.hint.txt) + '"');
  /* Repetir y récords */
  await p.evaluate(() => discardSession());
  const Rp = await p.evaluate(PJ => { state.settings.cuMode = 'tot'; daySheet(new Date(Date.now() - 2 * 864e5).toISOString().slice(0, 10)); const b = document.querySelector('#sheet .rp-open'); if (b) b.click(); return [...document.querySelectorAll('#sheet .rp-ex')].map(r => r.innerText.replace(/\s+/g, ' ')).find(r => r.indexOf(PJ) >= 0) || ''; }, PJ);
  ok(/Hoy: 10 kg total × 12/.test(Rp) && /Ese día: 5×15/.test(Rp), 'Repetir en Total: "Hoy: 10 kg total × 12", "Ese día: 5×15" (' + Rp + ')');
  await p.evaluate(() => closeSheet());
  const toastT = await p.evaluate(PJ => { toast(`¡Récord en ${PJ}: 2.5×16!`); return document.getElementById('toast').textContent; }, PJ);
  ok(/5×16/.test(toastT), 'aviso de récord en Total: ' + toastT);
  const vol = await p.evaluate(() => { const a = sessStats(state.sessions[0]).vol; state.settings.cuMode = 'cu'; const b = sessStats(state.sessions[0]).vol; return [a, b]; });
  ok(vol[0] === vol[1], 'el volumen no depende del modo (' + vol.join(' = ') + ')');
  noErr(p); await p.done();
}

console.log('2. Ajustes → Entreno');
{
  const p = await open();
  await p.evaluate(() => { state.tab = 'settings'; render(); });
  const A = await p.evaluate(() => { const c = document.querySelector('.ct-set'); return c && { grp: (c.closest('details') || {}).dataset ? c.closest('details').dataset.k : '', btn: [...c.querySelectorAll('[data-ct="set"]')].map(b => b.textContent + (b.classList.contains('on') ? '*' : '')) }; });
  ok(A && A.grp === 'sg-entreno' && A.btn.join('|') === 'Cada una (c/u)*|Las dos juntas (total)', 'Ajustes → Entreno: "Cada una (c/u)" o "Las dos juntas (total)"');
  await act(p, '.ct-set [data-ct="set"][data-v="tot"]');
  ok(await p.evaluate(() => state.settings.cuMode === 'tot' && document.querySelector('.ct-set [data-v="tot"]').classList.contains('on')), 'elegir "Las dos juntas" lo guarda');
  noErr(p); await p.done();
}

console.log('3. ¿Cuántas mancuernas usas aquí? (Curl Martillo: dos → una → dos)');
{
  const p = await open(); await start(p);
  const i = await idx(p, CMa), before = await stored(p);
  ok(/Dos mancuernas/.test((await card(p, i)).pill), 'la píldora dice "Dos mancuernas"');
  await act(p, `#sx-pager .sx-page[data-i="${i}"] .ct-n`); await p.waitForTimeout(150);
  await act(p, '#sheet [data-ct="n-pick"][data-v="one"]'); await p.waitForTimeout(150);
  let t = await sheetTxt(p);
  ok(/10 kg c\/u × 10 → 20 kg × 10 \(una mancuerna\)/.test(t), 'de dos a una: muestra antes → después ("10 kg c/u × 10 → 20 kg × 10") y pide confirmar');
  await act(p, '#sheet [data-ct="n-go"][data-v="one"]'); await p.waitForTimeout(250);
  let D = await p.evaluate(n => ({ h: state.sessions[0].exercises.find(e => e.name === n).sets.map(x => x.w).join(','), pl: state.plans[0].days[0].exercises.find(e => e.name === n).weight, two: cuTwo(n), ex: state.settings.cuEx[exHKey(n)], marks: !!state.sessions[0].exercises.find(e => e.name === n).cu }), CMa);
  ok(D.h === '20,20' && D.pl === 20 && !D.two && D.ex === 'one' && !D.marks, 'confirmado: historial 20, rutina 20 y queda "una mancuerna" para este ejercicio');
  ok(/Una mancuerna/.test((await card(p, i)).pill) && !/c\/u/.test((await card(p, i)).hd), 'la tarjeta ya no dice c/u');
  /* Deshacer y volver a hacer, y luego de una a dos con "Sí, era el total" */
  await act(p, `#sx-pager .sx-page[data-i="${i}"] .ct-n`); await p.waitForTimeout(150);
  ok(/Último cambio/.test(await sheetTxt(p)), 'la hoja ofrece "Deshacer ese cambio"');
  await act(p, '#sheet [data-ct="n-undo"]'); await p.waitForTimeout(250);
  ok((await stored(p)) === before && await p.evaluate(n => cuTwo(n), CMa), 'deshacer: todo como al inicio');
  await act(p, `#sx-pager .sx-page[data-i="${i}"] .ct-n`); await act(p, '#sheet [data-ct="n-pick"][data-v="one"]'); await act(p, '#sheet [data-ct="n-go"][data-v="one"]'); await p.waitForTimeout(200);
  await act(p, `#sx-pager .sx-page[data-i="${i}"] .ct-n`); await act(p, '#sheet [data-ct="n-pick"][data-v="two"]'); await p.waitForTimeout(150);
  t = await sheetTxt(p);
  ok(/¿Lo que anotaste antes era el total de las dos\?/.test(t) && /Sí, era el total: 20 kg → 10 kg c\/u/.test(t) && /No, era de cada una: 20 kg → 20 kg c\/u/.test(t), 'de una a dos: pregunta si era el total, con antes → después');
  await act(p, '#sheet [data-ct="n-go"][data-v="two-yes"]'); await p.waitForTimeout(250);
  ok((await stored(p)) === before && await p.evaluate(n => cuTwo(n) && state.sessions[0].exercises.find(e => e.name === n).cu === 1, CMa), 'dos → una → dos ("sí, era el total"): los números quedan como al inicio');
  /* "No, era de cada una": cambia a dos sin tocar pesos */
  await act(p, `#sx-pager .sx-page[data-i="${await idx(p, RM)}"] .ct-n`); await act(p, '#sheet [data-ct="n-pick"][data-v="two"]'); await act(p, '#sheet [data-ct="n-go"][data-v="two-no"]'); await p.waitForTimeout(200);
  ok(await p.evaluate(n => cuTwo(n) && state.sessions[0].exercises.find(e => e.name === n).sets[0].w === 20, RM), 'remo: "No, era de cada una" → dos mancuernas y 20 igual');
  noErr(p); await p.done();
}

console.log('4. Pesos que no existen aquí');
{
  const p = await open(); await start(p);
  const i = await idx(p, PMR), j = await idx(p, TAL);
  let C = await card(p, i);
  ok(/Este peso no existe aquí/.test(C.odd) && /3\.8 kg c\/u/.test(C.odd) && /Era por mano, no el total \(3\.8 kg c\/u → 7\.5 kg c\/u\)/.test(C.odd), 'Peso muerto rumano 3,8 c/u: "Este peso no existe aquí… ¿Corregir?" con "Era por mano (3.8 → 7.5)"');
  await act(p, `#sx-pager .sx-page[data-i="${i}"] [data-ct="odd-x2"]`); await p.waitForTimeout(250);
  const D = await p.evaluate(n => ({ pl: state.plans[0].days[0].exercises.find(e => e.name === n).weight, h: state.sessions[0].exercises.find(e => e.name === n).sets[0].w, d: state.draft.exercises.find(e => e.name === n).log.filter(x => !x.done).map(x => x.w) }), PMR);
  C = await card(p, i);
  ok(D.pl === 7.5 && D.h === 7.5 && !C.odd, '"Era por mano": queda 7.5 c/u (rutina e historial) y el aviso desaparece (sesión: ' + D.d.join(',') + ')');
  C = await card(p, j);
  ok(/5\.5 kg c\/u/.test(C.odd), 'Talones 5,5 c/u: también avisa');
  await act(p, `#sx-pager .sx-page[data-i="${j}"] [data-ct="odd-ed"]`); await p.waitForTimeout(150);
  await p.evaluate(() => { document.getElementById('ct-odd-in').value = '5'; });
  await act(p, `#sx-pager .sx-page[data-i="${j}"] [data-ct="odd-set"]`); await p.waitForTimeout(250);
  ok(await p.evaluate(n => state.plans[0].days[0].exercises.find(e => e.name === n).weight === 5 && state.draft.exercises.find(e => e.name === n).log.every(x => x.done || x.w === 5), TAL), '"Cambiar el peso": escribiste 5 → la rutina y la sesión quedan en 5 c/u');
  /* "Está bien, no volver a avisar" */
  await p.evaluate(() => discardSession());
  await p.evaluate(TAL => { state.plans[0].days[0].exercises.find(e => e.name === TAL).weight = 5.5; savePlans(); }, TAL); await start(p);
  ok(!!(await card(p, j)).odd, 'vuelve a avisar con 5,5');
  await act(p, `#sx-pager .sx-page[data-i="${j}"] [data-ct="odd-ok"]`); await p.waitForTimeout(200);
  ok(!(await card(p, j)).odd && await p.evaluate(n => state.settings.cuOk['gA|' + exHKey(n)] === 1, TAL), '"Está bien, no volver a avisar": desaparece y se recuerda para ese ejercicio en este gimnasio');
  ok(!(await card(p, await idx(p, RM))).odd && !(await card(p, await idx(p, PR))).odd, 'remo a una mano (una sola mancuerna) y prensa: sin aviso');
  noErr(p); await p.done();
}

console.log('5. Usuario nuevo: la pregunta de la primera vez');
{
  const p = await open({ first: true });
  await p.evaluate(() => { state.settings.onb = 1; closeSheet(); const o = document.getElementById('onb'); if (o) o.remove(); const P = activePlan(); P.days[0].exercises.unshift({ id: 'nx1', name: 'Elevaciones Laterales', type: 'Hombros', weight: 0, sets: 2, repsMin: 12, repsMax: 15, rest: 60 }); startSession(P.id, P.days[0].id); render(); }); await p.waitForTimeout(500);
  const Q = await p.evaluate(() => { const c = document.querySelector('#sx-pager .sx-page[data-i="0"] .card.ex'); return { ask: (c.querySelector('.ct-ask') || {}).innerText || '', n: document.querySelectorAll('.ct-ask').length }; });
  ok(/¿Cómo anotas las mancuernas\?/.test(Q.ask) && /Cada una/.test(Q.ask) && /Las dos juntas/.test(Q.ask), 'primer ejercicio de dos mancuernas: "¿Cómo anotas las mancuernas? Cada una / Las dos juntas"');
  await act(p, '.ct-ask [data-ct="ask"][data-v="tot"]'); await p.waitForTimeout(200);
  const A = await p.evaluate(() => { const c = document.querySelector('#sx-pager .sx-page[data-i="0"] .card.ex'); return { mode: state.settings.cuMode, ask: document.querySelectorAll('.ct-ask').length, hd: c.querySelectorAll(':scope > .sets > .h')[2].textContent }; });
  ok(A.mode === 'tot' && A.ask === 0 && /total/.test(A.hd), 'eligió "Las dos juntas": no vuelve a preguntar y la columna dice "kg total"');
  const W = await p.evaluate(() => { const inp = document.getElementById('w-0-0'); inp.value = '10'; inp.dispatchEvent(new Event('input', { bubbles: true })); return state.draft.exercises[0].log[0].w; });
  ok(W === 5, 'escribe 10 (las dos) → se guarda 5 c/u');
  noErr(p); await p.done();
}

console.log('6. Reloj: solo el texto y lo que se escribe');
{
  const p = await open({ watch: true });
  await p.evaluate(() => { state.settings.cuMode = 'tot'; startSession('pA', 'd1'); const d = state.draft; d.cur = 0; d.exercises[0].wuSkip = true; d.exercises[0].log.forEach(s => { s.w = 2.5; }); render(); }); await p.waitForTimeout(400);
  let H = await p.evaluate(() => document.getElementById('app').innerHTML);
  ok(/<b class="num">5<\/b><small>kg total<\/small>/.test(H), 'reloj en Total, Pájaros: "5 kg total" (2.5 c/u guardado)');
  ok(!/cu-sw|ct-n|ct-odd|ct-ask/.test(H), 'reloj: sin botón nuevo ni avisos');
  await act(p, '[data-act="w2-pad"][data-f="w"]'); await p.waitForTimeout(100);
  await p.evaluate(() => { w2.pad.v = '15'; }); await act(p, '[data-act="w2-padok"]'); await p.waitForTimeout(150);
  ok(await p.evaluate(() => state.draft.exercises[0].log[0].w === 7.5), 'reloj: escribes 15 en total → se guarda 7.5 c/u');
  await p.evaluate(() => { state.settings.cuMode = 'cu'; render(); });
  H = await p.evaluate(() => document.getElementById('app').innerHTML);
  ok(/<b class="num">7.5<\/b><small>kg c\/u<\/small>/.test(H), 'reloj en c/u: "7.5 kg c/u"');
  noErr(p); await p.done();
  if (BASE) {
    const shot = async dir => { const q = await open({ watch: true, dir }); const a = await q.evaluate(() => document.getElementById('app').innerHTML); await q.evaluate(() => { startSession('pA', 'd1'); state.draft.cur = 0; render(); }); await q.waitForTimeout(400); const b = await q.evaluate(() => document.getElementById('app').innerHTML); await q.evaluate(() => { w2.menu = 'main'; render(); }); const m = await q.evaluate(() => document.getElementById('app').innerHTML); const e = q.errs.slice(); await q.done(); return { a, b, m, e }; };
    const A = await shot(DIR), B = await shot(BASE);
    ok(A.a === B.a && A.b === B.b && A.m === B.m, 'reloj en c/u: inicio, serie y "⋯ Más" idénticos a la versión anterior');
    ok(!A.e.length, 'reloj: sin errores de JS');
  }
}

await browser.close();
console.log(fail ? `\n${fail} FALLA(S)` : '\nTodo OK');
process.exit(fail ? 1 : 0);
