import { OWNER_SETTINGS } from './owner-fixture.mjs';
// Prueba de "Tu plan de la semana" (Tanda K, rama tanda-k), con datos inventados.
// Uso (desde PowerShell): $env:PW_DIR = "<carpeta con node_modules/playwright>"; node tests/tk.mjs <copia transpilada>
// Notificación con Capacitor simulado (día, hora, ya visto, permiso, apagada, al tocarla), distribución muscular,
// Aplicar a mi rutina y Deshacer, usuario nuevo, dueño sin perfil y reloj.
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

/* ---------- Datos inventados. 25-oct-2026 es domingo ---------- */
const NOW = '2026-10-25T10:00:00';
let N = 0;
const X = (name, type, sets, w) => ({ id: 'x' + (++N), name, type, weight: w, sets, repsMin: 8, repsMax: 12, rest: 90 });
const PLANS = [{ id: 'p1', name: 'Rutina de prueba', gymId: 'rokaz', days: [
  { id: 'd1', name: 'Pecho y espalda', weekday: 1, kind: 'fuerza', exercises: [X('Press Banca Plano (Barra)', 'Empuje', 4, 40), X('Remo Sentado con Cable', 'Tracción', 4, 40), X('Curl Bíceps', 'Tracción', 3, 10)] },
  { id: 'd2', name: 'Piernas', weekday: 4, kind: 'fuerza', exercises: [X('Prensa 45°', 'Piernas', 4, 100), X('Curl Femoral Sentado', 'Piernas', 3, 30), X('Elevación de Talones en Prensa', 'Piernas', 3, 60)] }] }];
const GYMS = [{ id: 'rokaz', name: 'Gimnasio A' }];
const S = (w, r, rir) => [0, 1, 2].map(() => ({ w, r, rir }));
const SESS = [{ id: 's1', date: new Date('2026-10-22T19:00').toISOString(), planId: 'p1', planName: '', dayId: 'd2', dayName: 'Piernas', gymId: 'rokaz', gymName: 'Gimnasio A', kind: 'fuerza', durationSec: 3600, exercises: [{ name: 'Prensa 45°', type: 'Piernas', sets: S(100, 10, 3) }] }];
const SET = (extra, prof) => { const s = Object.assign(structuredClone(OWNER_SETTINGS), { activePlanId: 'p1', activeGymId: 'rokaz', planByGym: { rokaz: 'p1' }, newsSeen: 'n6', wcoach: { on: true, fri: 5, sun: 0 } }, extra || {}); s.prof = Object.assign({}, s.prof, { goal: 'musculo', mins: 75, exp: 2 }, prof || {}); return s; };

async function open({ watch, settings, sessions, first, native = true, perm = 'granted' } = {}) {
  const srv = await serve(DIR);
  const ctx = await browser.newContext(watch ? { viewport: { width: 410, height: 500 }, hasTouch: true } : { viewport: { width: 390, height: 844 }, hasTouch: true });
  await ctx.route(/googleapis|gstatic|google\.com|firebase|github/, r => r.abort());
  const p = await ctx.newPage(); p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message));
  await p.clock.setFixedTime(new Date(NOW));
  if (native) await p.addInitScript(perm => {
    const q = window.__ln = { pending: [], listeners: {}, log: [] };
    window.Capacitor = { isNativePlatform: () => true, getPlatform: () => 'android', Plugins: { LocalNotifications: {
      createChannel: async () => ({}), checkPermissions: async () => ({ display: perm }), requestPermissions: async () => ({ display: perm }),
      getPending: async () => ({ notifications: q.pending.slice() }),
      cancel: async o => { const ids = o.notifications.map(n => n.id); q.pending = q.pending.filter(n => ids.indexOf(n.id) < 0); },
      schedule: async o => { o.notifications.forEach(n => { q.pending = q.pending.filter(x => x.id !== n.id); q.pending.push(Object.assign({}, n, { at: new Date(n.schedule.at).toISOString() })); }); return {}; },
      addListener: (n, f) => { (q.listeners[n] = q.listeners[n] || []).push(f); return { remove() {} }; },
    } } };
  }, perm);
  if (!first) await p.addInitScript(([s, pl, ss, g]) => { if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    localStorage.setItem('cdh.settings', JSON.stringify(s)); localStorage.setItem('cdh.plans', JSON.stringify(pl)); localStorage.setItem('cdh.sessions', JSON.stringify(ss));
    localStorage.setItem('cdh.gyms', JSON.stringify(g)); localStorage.setItem('cdh.newsSeen', '"n6"'); localStorage.setItem('cdh.reminders', JSON.stringify([{ id: 'r1', kind: 'train', label: 'Entrenar', time: '07:00', days: [1, 2, 3, 4, 5], on: true }])); }, [settings, PLANS, sessions || [], GYMS]);
  await p.goto(`http://127.0.0.1:${srv.address().port}/index.html`); await p.waitForTimeout(1800);
  if (!first) await p.evaluate(() => { state.settings.healthOk = 1; closeSheet(); render(); });
  p.done = async () => { await ctx.close(); srv.close(); };
  return p;
}
const noErr = p => ok(!p.errs.length, 'sin errores de JS ' + p.errs.join(' | '));
const tk = p => p.evaluate(async () => { await scheduleAll(); return window.__ln.pending.filter(n => n.id >= 9100 && n.id < 9110).map(n => ({ id: n.id, at: n.at, t: n.title })); });
const loc = s => { const d = new Date(s); return `${d.getDate()}/${d.getMonth() + 1} ${d.getHours()}:00`; };

console.log('A. Notificación');
{
  let p = await open({ settings: SET(), sessions: SESS });
  let L = await tk(p);
  ok(L.length === 2 && loc(L[0].at) === '25/10 19:00' && loc(L[1].at) === '1/11 19:00' && L[0].t === 'Tu plan de la semana', `el día del resumen a las 19:00: ${L.map(x => loc(x.at)).join(' y ')}`);
  ok(await p.evaluate(() => window.__ln.pending.some(n => n.id >= 1000 && n.id < 9000)), 'los recordatorios de siempre siguen programados');
  const o = await p.evaluate(async () => { const bt = document.createElement('button'); bt.dataset.wc = 'open-s'; document.body.appendChild(bt); bt.click(); bt.remove(); await new Promise(r => setTimeout(r, 700)); await scheduleAll(); closeSheet(); return window.__ln.pending.filter(n => n.id >= 9100 && n.id < 9110).map(n => n.at); });
  ok(o.length === 1 && loc(o[0]) === '1/11 19:00', `ya viste el resumen: solo queda el de la semana siguiente (${o.map(loc).join()})`);
  noErr(p); await p.done();
  p = await open({ settings: SET({ wcoach: { on: true, fri: 5, sun: 6, hour: 8 } }), sessions: SESS });
  L = await tk(p);
  ok(loc(L[0].at) === '31/10 8:00' && loc(L[1].at) === '7/11 8:00', `con otro día y hora: ${L.map(x => loc(x.at)).join(' y ')}`); noErr(p); await p.done();
  p = await open({ settings: SET({ wcoach: { on: true, fri: 5, sun: 0, notif: false } }), sessions: SESS });
  ok(!(await tk(p)).length, 'con el aviso apagado no se programa'); noErr(p); await p.done();
  p = await open({ settings: SET({ wcoach: { on: false, fri: 5, sun: 0 } }), sessions: SESS });
  ok(!(await tk(p)).length, 'con el Coach semanal apagado no se programa'); noErr(p); await p.done();
  p = await open({ settings: SET(), sessions: SESS, perm: 'denied' });
  ok(!(await tk(p)).length, 'sin permiso de notificaciones no se programa ni falla'); noErr(p); await p.done();
  p = await open({ settings: SET(), sessions: [] });
  ok(!(await tk(p)).length, 'sin ninguna sesión todavía no avisa de una semana vacía'); noErr(p); await p.done();
  p = await open({ settings: SET(), sessions: SESS, native: false });
  ok(await p.evaluate(async () => { await scheduleAll(); return !!document.getElementById('app'); }), 'en la web no hay notificaciones y nada falla'); noErr(p); await p.done();

  p = await open({ settings: SET(), sessions: SESS });
  const tap = await p.evaluate(async () => { window.__ln.listeners.localNotificationActionPerformed.forEach(f => f({ notification: { id: 9100 } })); await new Promise(r => setTimeout(r, 700)); const c = document.querySelector('#sheet .sheet-card'); return { t: c ? c.textContent : '', seen: wcSeen().s === wcSumKey() }; });
  ok(/Tu plan de la semana/.test(tap.t) && tap.seen, 'al tocarla abre el plan y queda visto');
  const tap2 = await p.evaluate(async () => { closeSheet(); state.settings.nextS = { d1: { pick: 'plan' } }; startSession('p1', 'd1'); window.__ln.listeners.localNotificationActionPerformed.forEach(f => f({ notification: { id: 9100 } })); await new Promise(r => setTimeout(r, 700)); const c = document.querySelector('#sheet .sheet-card'); const o = { open: !!(c && /Tu plan/.test(c.textContent)), draft: !!state.draft }; discardSession(); return o; });
  ok(!tap2.open && tap2.draft, 'si estás entrenando no te interrumpe');
  noErr(p); await p.done();

  p = await open({ settings: SET(), sessions: SESS });
  const cfg = await p.evaluate(async () => { state.tab = 'profile'; state.profSub = 'settings'; const h = wcSetCard(); const box = document.createElement('div'); box.innerHTML = h; document.body.appendChild(box);
    const s = box.querySelector('#tk-hour'); s.value = '20'; s.dispatchEvent(new Event('change', { bubbles: true })); await new Promise(r => setTimeout(r, 600)); const w = state.settings.wcoach.hour, at = window.__ln.pending.filter(n => n.id === 9100).map(n => n.at);
    box.querySelector('[data-tk="notif"]').click(); await new Promise(r => setTimeout(r, 600)); const left = window.__ln.pending.filter(n => n.id >= 9100 && n.id < 9110).length; box.remove(); return { w, at, left, off: state.settings.wcoach.notif }; });
  ok(cfg.w === 20 && loc(cfg.at[0]) === '25/10 20:00', `Ajustes: cambiar la hora reprograma (${loc(cfg.at[0])})`);
  ok(cfg.off === false && cfg.left === 0, 'Ajustes: apagarlo quita los avisos');
  noErr(p); await p.done();
}

console.log('B. Distribución muscular y aplicar');
{
  let p = await open({ settings: SET(), sessions: SESS });
  const D = await p.evaluate(() => { wcSheet('s'); const c = document.querySelector('#sheet .sheet-card'), t = c.querySelector('.tk-dist'), P = wcProposal(wcSumOff()), d = tkDist(P);
    const sum = MM_MAIN.reduce((a, k) => a + d.tot[k], 0), want = P.items.reduce((a, it) => { const sh = zoneShares(it.n); return a + Object.keys(sh).filter(k => MM_MAIN.indexOf(k) >= 0).reduce((x, k) => x + sh[k] * it.s1, 0); }, 0);
    return { heads: [...t.querySelectorAll('thead th')].map(x => x.textContent), rows: t.querySelectorAll('tbody tr').length, sum, want, txt: c.textContent, one: d.one, dw: t.scrollWidth, cw: c.clientWidth, text: wcSumText(), btn: !!c.querySelector('[data-wc="apply"]') && c.querySelector('[data-wc="apply"]').textContent, before: !!(t.compareDocumentPosition(c.querySelector('[data-wc="apply"]')) & 4) }; });
  ok(D.heads.join() === 'Músculo,Lun,Jue,Total' && D.rows === 9, `tabla por día: ${D.heads.join(' · ')} y ${D.rows} músculos`);
  ok(Math.abs(D.sum - D.want) < 0.01, `los totales cuadran con el plan (${D.sum} series)`);
  ok(/Tu plan de la semana del/.test(D.txt) && /Distribución muscular/.test(D.txt), 'el título y la distribución están en la hoja');
  ok(D.one.length > 0 && /todo en un solo día/.test(D.txt), `avisa cuando un músculo cae en un solo día (${D.one.join(', ')})`);
  ok(D.dw <= D.cw, `cabe a lo ancho del teléfono (${D.dw} de ${D.cw})`);
  ok(D.before, 'la distribución está antes del botón de aplicar');
  ok(/Distribución muscular \(series por semana\)/.test(D.text) && /Lun · Pecho y espalda/.test(D.text), 'Compartir y Copiar la incluyen');
  if (D.btn) {
    ok(/Aplicar a mi rutina/.test(D.btn) && !/mi semana/.test(D.txt), `botón: ${D.btn.trim()}`);
    ok(/Después puedes deshacerlo/.test(D.txt), 'antes de aplicar avisa que se puede deshacer');
    const A = await p.evaluate(() => { const before = JSON.stringify(state.plans); const P = wcProposal(wcSumOff()); document.querySelector('[data-wc="apply"]').click(); const after = JSON.stringify(state.plans), done = /hasta que lo deshagas/.test((document.querySelector('#sheet .wc-done') || {}).textContent || '') && !!document.querySelector('#sheet .wc-done [data-wc="undo"]'); document.querySelector('[data-wc="undo"]').click(); return { ch: before !== after, done, back: JSON.stringify(state.plans) === before, n: P.items.length }; });
    ok(A.ch && A.done, 'Aplicar escribe el plan en la rutina y ofrece Deshacer');
    ok(A.back, 'Deshacer deja la rutina exactamente como estaba');
  } else ok(false, 'con estos datos debía haber cambios que aplicar');
  noErr(p); await p.done();
  p = await open({ settings: SET({}, { exp: 0 }), sessions: SESS });
  const nov = await p.evaluate(() => { const P = wcProposal(wcSumOff()), d = tkDist(P); return { pecho: d.days[0].v.pecho, rutina: state.plans[0].days[0].exercises[0].sets }; });
  ok(nov.rutina === 4 && nov.pecho === 3, `principiante: la rutina dice ${nov.rutina} series de press y la distribución cuenta las ${nov.pecho} que hará`);
  noErr(p); await p.done();
  p = await open({ settings: SET(), sessions: SESS });
  const dl = await p.evaluate(() => { const P = wcProposal(wcSumOff()), a = tkDist(P).tot.pecho; P.dl = true; const b = tkDist(P).tot.pecho; return { a, b }; });
  ok(dl.b < dl.a, `semana de descarga: la distribución cuenta la mitad de series (pecho ${dl.a} → ${dl.b})`);
  noErr(p); await p.done();
}

console.log('C. Usuario nuevo, dueño sin perfil y reloj');
{
  let p = await open({ first: true });
  ok(await p.evaluate(() => !!document.getElementById('onb')), 'usuario nuevo: sale la bienvenida'); ok(!(await tk(p)).length, 'y no se programa nada'); noErr(p); await p.done();
  const noProf = SET(); delete noProf.prof;
  p = await open({ settings: noProf, sessions: SESS });
  const q = await p.evaluate(() => { wcSheet('s'); const c = document.querySelector('#sheet .sheet-card'); return !!c.querySelector('.tk-dist') && state.settings.prof === undefined; });
  ok(q, 'dueño sin perfil: el plan se ve y no se crea un perfil'); noErr(p); await p.done();
  p = await open({ watch: true, settings: SET(), sessions: SESS });
  const w = await p.evaluate(async () => { await scheduleAll(); return { w: isWatch(), n: window.__ln.pending.filter(n => n.id >= 9100 && n.id < 9110).length, h: /Tu plan|tk-set/.test(wcSetCard()) }; });
  ok(w.w && !w.n && !w.h, 'reloj: sin aviso nuevo y sin ajustes nuevos'); noErr(p); await p.done();
}

await browser.close();
console.log(fail ? `\n${fail} FALLAS` : '\nTodo OK');
process.exit(fail ? 1 : 0);
