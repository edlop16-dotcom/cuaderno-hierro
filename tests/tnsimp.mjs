import { OWNER_SETTINGS, seedOwner } from './owner-fixture.mjs';
// Prueba en la app de "Importar recomendación" (next.js) con Playwright y Edge, sobre la copia transpilada.
// Uso (desde PowerShell; desde Git Bash Edge se cierra al arrancar):
//   node ci/legacy.mjs <copia de www>      (antes: copiar www/ a esa carpeta)
//   $env:PW_DIR = "<carpeta con node_modules/playwright>"; node tests/tnsimp.mjs <copia transpilada> [copia transpilada anterior] [carpeta de capturas]
// Escenarios: dueño (texto sintético, aviso de día, vista previa, sin dato, guardar, entrenar, copiar instrucción, tabla con "|",
// textos sin datos), usuario nuevo y reloj (sin cambios: captura igual a la versión anterior si se pasa).
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const req = createRequire(path.join(process.env.PW_DIR || HERE, 'x.js'));
const { chromium } = req('playwright');
const [DIR, OLD, SHOTS] = process.argv.slice(2);
if (!DIR) throw new Error('Falta la carpeta transpilada');
const REAL = fs.readFileSync(path.join(HERE, 'importar-ejemplo-sintetico.txt'), 'utf8');
const PIPE = '**Recomendación para el próximo viernes**\n\n| Ejercicio | Peso | Reps | RIR |\n|---|---|---|---|\n| Prensa 45° | 195 kg | 15 | 2,1,0 |\n| Hack | 60 | 12 | 1-2 |\n| Ext. pierna | 45 | 14-16 | 2 |\n| Remo Cable | 35,5 | 10 a 12 | 2,1 |\n';
const NADA = '¡Buen trabajo, campeón! Sigue así.\nDescansa bien y come proteína.';
const ANALISIS = 'Serie\tPeso\tReps\tRIR\tAnálisis\n1\t180 kg\t15\t@2\tBien.\n2\t190 kg\t12\t@?\tSubiste.';

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.webp': 'image/webp', '.woff2': 'font/woff2', '.woff': 'font/woff', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const serve = dir => new Promise(res => {
  const s = http.createServer((q, r) => {
    let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
    fs.readFile(path.join(dir, p), (e, b) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); r.end(b); });
  }).listen(0, '127.0.0.1', () => res(s));
});

let fail = 0;
const ok = (c, msg) => { if (c) console.log('  ok  ', msg); else { fail++; console.log('  FALLA', msg); } };
const MON = new Date('2026-10-19T09:00:00');   // lunes

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL === 'chromium' ? undefined : 'msedge', headless: process.env.PW_CHANNEL === 'chromium', args: ['--headless=new'] });
async function open(dir, { owner, watch } = {}) {
  const srv = await serve(dir);
  const ctx = await browser.newContext(watch ? { viewport: { width: 410, height: 500 }, hasTouch: true } : { viewport: { width: 390, height: 844 }, hasTouch: true });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: `http://127.0.0.1:${srv.address().port}` });
  await ctx.route(/googleapis|gstatic|google\.com|firebase|spotify|youtube/, r => r.abort());
  const p = await ctx.newPage(); p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message));
  await p.clock.install({ time: MON });
  await seedOwner(p, owner ? OWNER_SETTINGS : null);
  await p.addInitScript(o => {
    if (o.owner && !localStorage.getItem('cdh.settings')) { localStorage.setItem('cdh.settings', JSON.stringify(o.settings)); localStorage.setItem('cdh.newsSeen', '"n5"'); }
  }, { owner, settings: OWNER_SETTINGS });
  await p.goto(`http://127.0.0.1:${srv.address().port}/index.html`);
  await p.waitForTimeout(1500);
  if (!owner && !watch) await p.evaluate(() => { state.settings.onb = 1; state.settings.healthOk = 1; if (typeof pbClose === 'function') pbClose(); LS.set('newsSeen', NEWS_KEY); savePlans(); closeSheet(); render(); });
  await p.evaluate(() => { if (!$('#sheet').hidden) closeSheet(); });
  p.done = async () => { await ctx.close(); srv.close(); };
  return p;
}
const shot = async (p, name) => { if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await p.screenshot({ path: path.join(SHOTS, name + '.png') }); } };
const openImport = async p => { await p.click('.hoy-hero [data-ns="imp"]'); await p.waitForSelector('#ns-txt'); };

// La vista previa actual edita peso y reps por serie; conservar la cobertura del formato antiguo.
const rows = p => p.evaluate(() => {
 const E = state.nsEd, d = findDay(E.planId, E.dayId).d;
 return E.rows.map(r => ({ raw:r.raw, id:r.exId, name:(d.exercises.find(e=>e.id===r.exId)||{}).name, sets:r.sets }));
});
console.log('A. Dueño: formato de cuatro columnas, día y edición por serie');
{
 const p=await open(DIR,{owner:true});
 const before=await p.evaluate(()=>JSON.stringify(state.plans));
 await openImport(p); await p.fill('#ns-txt',REAL);
 ok(await p.$eval('#ns-day',s=>s.value)==='plan1|p1-lun','día inicial correcto');
 await p.selectOption('#ns-day','plan1|p1-vie');
 ok(/habla del lunes y elegiste el viernes/.test(await p.textContent('#ns-dayw')),'avisa del día distinto');
 ok(await p.$eval('#ns-day',s=>s.value)==='plan1|p1-vie','no cambia el día sin pedirlo');
 await p.click('#ns-dayw [data-ns="setday"]');
 ok(await p.$eval('#ns-day',s=>s.value)==='plan1|p1-lun','cambiar a lunes funciona');
 await p.click('[data-ns="read"]'); await p.waitForSelector('#sheet .ns-ed');
 const R=await rows(p);
 const expected=[['Prensa 45°',82.5,10,10],['Sentadilla Hack',27.5,8,10],['Hip Thrust',42.5,9,11],['Curl Femoral Tumbado',17.5,11,13],['Remo Sentado con Cable',32.5,8,10],['Extensión de Pierna',22.5,12,14]];
 ok(R.length===6 && expected.every(([n,w,a,b],i)=>R[i].name===n && R[i].sets.length===3 && R[i].sets.every(t=>t.w===w&&t.rMin===a&&t.rMax===b) && R[i].sets.map(t=>t.rir).join()==='2,1,0'),'nombres, peso, reps y RIR de las seis filas sintéticas');
 const miss=await p.locator('#sheet .ns-ed.nd').count();
 ok(miss===1,'el ejercicio restante queda Sin dato');
 await p.click('#sheet .ns-ed.nd [data-ns="add"]');
 ok((await rows(p)).length===7,'permite poner datos al ejercicio restante');
 await p.selectOption('#sheet .ns-ed[data-i="6"] select','skip');
 await p.fill('#sheet [data-ns="sw"][data-i="0"][data-j="0"]','84,5');
 await p.click('#sheet [data-ns="save"]');
 const ia=await p.evaluate(()=>state.settings.nextS['p1-lun'].ia);
 ok(ia.ex.length===6 && ia.ex[0].sets.map(t=>t.w).join()==='84.5,82.5,82.5','guarda la edición por serie y omite la descartada');
 ok(await p.evaluate(()=>JSON.stringify(state.plans))===before,'no modifica el plan');
 await p.evaluate(()=>{closeSheet(); startSession('plan1','p1-lun');});
 const dr=await p.evaluate(()=>state.draft.exercises.find(e=>e.name==='Prensa 45°'));
 ok(dr.log.map(t=>t.w).join()==='84.5,82.5,82.5' && dr.rirT.join()==='2,1,0','entrena con los pesos y RIR importados');
 ok(!p.errs.length,'sin errores de JS '+p.errs.join(' | '));await p.done();
}
console.log('B. Instrucción, texto inválido y análisis');
{
 const p=await open(DIR,{owner:true}); await openImport(p);
 const ask=await p.evaluate(()=>nsAskText(activePlan().days[0]));
 ok(/UN SOLO bloque de código/.test(ask)&&/'DÍA: nombre'/.test(ask)&&/Ejercicio \| Peso \| Reps \| RIR \| Descanso/.test(ask),'instrucción con día dentro y nombres exactos');
 for(const [text,pattern] of [[NADA,/No encontré una recomendación/],[ANALISIS,/tablas de análisis/]]){
  await p.fill('#ns-txt',text);await p.click('[data-ns="read"]');
  ok(pattern.test(await p.textContent('#ns-txt-e')),'mensaje específico para texto sin recomendación');
  ok(await p.inputValue('#ns-txt')===text,'conserva el texto para corregirlo');
 }
 await p.fill('#ns-txt',PIPE);await p.click('[data-ns="read"]');await p.waitForSelector('#sheet .ns-ed');
 const R=await rows(p);ok(R.length===4&&R.every(r=>r.id),'tabla markdown con cuatro columnas y alias');
 ok(R[1].sets.every(t=>t.rir===2)&&R[3].sets.length===2,'rangos RIR y cantidad de series');
 ok(!p.errs.length,'sin errores de JS '+p.errs.join(' | '));await p.done();
}
console.log('C. Usuario nuevo: resolver las líneas ambiguas');
{
 const p=await open(DIR);await openImport(p);await p.fill('#ns-txt',REAL);await p.click('[data-ns="read"]');await p.waitForSelector('#sheet .ns-ed');
 const R=await rows(p),doubts=R.map((r,i)=>!r.id?i:-1).filter(i=>i>=0);
 ok(R[0].name==='Prensa 45°' && doubts.length>0,'empareja las seguras y pregunta las dudosas');
 await p.click('#sheet [data-ns="save"]');ok(await p.$eval('#ns-save-e',e=>!e.hidden),'no guarda sin resolver dudas');
 for(const i of doubts)await p.selectOption(`#sheet .ns-ed[data-i="${i}"] select`,'skip');
 await p.click('#sheet [data-ns="save"]');
 const ia=await p.evaluate(()=>Object.values(state.settings.nextS).find(x=>x.ia).ia);
 ok(ia.ex.length===R.length-doubts.length,'guarda únicamente las resueltas');
 ok(!p.errs.length,'sin errores de JS '+p.errs.join(' | '));await p.done();
}
console.log('D. Reloj');
{
 const p=await open(DIR,{owner:true,watch:true});
 ok(await p.evaluate(()=>isWatch()) && !(await p.$('.ns-box')),'reloj sin UI de importación');
 const shot0=await p.screenshot();ok(!p.errs.length,'sin errores de JS');await p.done();
 if(OLD){const q=await open(OLD,{owner:true,watch:true});ok(Buffer.compare(shot0,await q.screenshot())===0,'reloj idéntico');await q.done();}
}
await browser.close();console.log(fail?`${fail} FALLAS`:'Todo OK');process.exit(fail?1:0);
