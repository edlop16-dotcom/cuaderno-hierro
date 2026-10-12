/* ==========================================================================
   Pareja 8: Pulso en la sesión (sensor del reloj) + Pasos del día
   PULSO
   - Durante la sesión se muestra ❤️ en vivo (arriba a la derecha).
   - En el descanso: avisa cuando el pulso baja a tu "pulso de recuperación"
     (60 % de tu máximo: 220 − edad → 108 lpm a los 40 años). Así descansas lo justo.
   - Al terminar se guardan el promedio, el máximo y las calorías estimadas (fórmula de Keytel
     con tu pulso, peso y edad) y se ven en el historial.
   PASOS
   - Contador de pasos del celular y del reloj (se toma el mayor de los dos, sin sumar doble).
   - Fila en "Hábitos de hoy" con meta (8 000 por defecto), racha y promedio semanal.
   ========================================================================== */
const BS = (CAP && CAP.BodySensors) || null;
state.bs = state.bs || null;
const STEP_KEY = () => isWatch() ? 'stepsW' : 'stepsP';
const stepsOf = t => Math.max(+(t && t.stepsP) || 0, +(t && t.stepsW) || 0, +(t && t.stepsH) || 0, +(t && t.steps) || 0);
const stepGoal = () => +state.settings.stepGoal || 8000;
const hrMax = () => 220 - (+HISTORY.age || 40);
const hrReady = () => +state.settings.hrReady || Math.round(hrMax() * 0.6);
const fmtN = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

function bsInfo() {
  if (!BS) return Promise.resolve(null);
  return BS.info().then(i => { state.bs = i; return i; }).catch(() => null);
}

/* ---------------- Pasos ---------------- */
let stepsBusy = false;
function stepsRefresh(force) {
  if (!BS || stepsBusy || !state.bs || !state.bs.steps || !state.bs.stepsPerm) return;
  stepsBusy = true;
  BS.steps().then(r => {
    stepsBusy = false;
    const n = r && r.today; if (n == null || n < 0) return;
    const t = today(), k = STEP_KEY();
    if (force || Math.abs((t[k] || 0) - n) >= 10) { t[k] = n; saveDaily(); if (!state.draft) render(); }
  }).catch(() => { stepsBusy = false; });
}
function stepStreak() {
  let n = 0; const d = new Date(), g = stepGoal();
  if (stepsOf(state.daily[dk(d)]) < g) d.setDate(d.getDate() - 1);
  while (stepsOf(state.daily[dk(d)]) >= g) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
function stepsWeek() {
  const out = [];
  for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); out.push({ d, n: stepsOf(state.daily[dk(d)]) }); }
  return out;
}
function stepsRow() {
  const n = stepsOf(today()), g = stepGoal(), pct = Math.min(1, n / g), st = stepStreak();
  const need = BS && state.bs && state.bs.steps && !state.bs.stepsPerm;
  const none = !n && !(BS && state.bs && state.bs.steps);
  return `<div class="hab-water hab-steps"><span class="hab-ic s">${ic('footprints', 18)}</span>
    <div class="grow" style="min-width:0"><div class="row" style="justify-content:space-between"><b>Pasos</b><span class="num muted">${fmtN(n)} / ${fmtN(g)}${st ? ` · 🔥 ${st}` : ''}</span></div><div class="wbar2 s"><i style="width:${(pct * 100).toFixed(0)}%"></i></div>
    ${none ? `<small class="muted">Se cuentan en la app del celular o del reloj.</small>` : ''}</div>
    ${need ? `<button class="wbtn" data-act="st-perm">Activar</button>` : `<button class="wbtn" data-act="st-open">Ver</button>`}</div>`;
}
const _habitCardSt = habitCard;
habitCard = function () { const h = _habitCardSt(); const i = h.lastIndexOf('</div>'); return h.slice(0, i) + stepsRow() + h.slice(i); };
dailyPanel = habitCard;

function stepsSheet() {
  const w = stepsWeek(), g = stepGoal(), mx = Math.max(g, ...w.map(x => x.n)), avg = Math.round(w.reduce((a, x) => a + x.n, 0) / 7);
  const t = today();
  openSheet(`<div class="row"><h2 class="grow">Pasos</h2><button class="icon-btn" data-act="sheet-close" aria-label="Cerrar">${ic('x', 18)}</button></div>
    <div class="st-big"><b class="num">${fmtN(stepsOf(t))}</b><span class="muted">hoy · meta ${fmtN(g)}</span></div>
    <div class="st-bars">${w.map(x => `<div class="st-col"><span class="num">${x.n ? (x.n >= 1000 ? (x.n / 1000).toFixed(1).replace('.', ',') + 'k' : x.n) : '–'}</span><i class="${x.n >= g ? 'ok' : ''}" style="height:${Math.max(2, x.n / mx * 78).toFixed(0)}%"></i><small>${WDL[x.d.getDay()].slice(0, 2)}</small></div>`).join('')}</div>
    <div class="muted" style="font-size:12.5px">Promedio de 7 días: <b class="num">${fmtN(avg)}</b> · Racha cumpliendo la meta: <b>${stepStreak()} días</b>${t.stepsP && t.stepsW ? `<br>Hoy: celular ${fmtN(t.stepsP)} · reloj ${fmtN(t.stepsW)} (se toma el mayor)` : ''}</div>
    <form id="f-stg" class="row" style="gap:8px"><label class="label grow" for="stg">Meta diaria</label><input id="stg" inputmode="numeric" value="${g}" style="max-width:110px"><button class="btn small primary" type="submit">Guardar</button></form>
    <div class="muted" style="font-size:11.5px">Cuenta los pasos que das con el teléfono o el reloj encima. Si una app de salud cuenta más, es porque usa otros sensores.</div>`);
}

/* ---------------- Pulso ---------------- */
const hr = { on: false, bpm: 0, at: 0, last: 0, listener: null, readyMsg: false };
function hrWanted() { return !!(BS && state.draft && state.bs && state.bs.hr && state.bs.hrPerm); }
function hrStart() {
  if (hr.on || !hrWanted()) return;
  hr.on = true;
  try { hr.listener = BS.addListener('hr', hrData); } catch (e) {}
  BS.startHr().catch(() => { hr.on = false; });
}
function hrStop() {
  if (!hr.on) return;
  hr.on = false; hr.bpm = 0;
  try { BS.stopHr(); } catch (e) {}
  try { hr.listener && hr.listener.then ? hr.listener.then(l => l.remove()) : hr.listener && hr.listener.remove(); } catch (e) {}
  hr.listener = null; hrChip();
}
function hrData(d) {
  if (!d || !d.bpm) return;
  hr.bpm = d.bpm; hr.at = Date.now();
  const dr = state.draft;
  if (dr) {
    dr.hr = dr.hr || [];
    const sec = Math.round((Date.now() - new Date(dr.start)) / 1000), lastS = dr.hr.length ? dr.hr[dr.hr.length - 1][0] : -99;
    if (sec - lastS >= 5) { dr.hr.push([sec, d.bpm]); if (dr.hr.length % 6 === 0) saveDraft(); }
  }
  hrChip();
  const r = state.rest;
  if (r && !r.rang && !r.hrOk && Date.now() - (r.end - r.total * 1000) > 25000 && d.bpm <= hrReady()) {
    r.hrOk = d.bpm;
    try { navigator.vibrate && navigator.vibrate([120, 80, 120]); } catch (e) {}
  }
}
function hrChip() {
  let el = document.getElementById('hr-chip');
  const show = hr.on && hr.bpm && Date.now() - hr.at < 20000 && state.draft;
  if (!show) { if (el) el.hidden = true; return; }
  if (!el) { el = document.createElement('div'); el.id = 'hr-chip'; el.setAttribute('aria-live', 'off'); document.body.appendChild(el); }
  const z = hr.bpm >= hrMax() * 0.85 ? 'hi' : hr.bpm <= hrReady() ? 'ok' : '';
  el.className = z; el.hidden = false;
  el.innerHTML = `<span class="hb">❤</span><b class="num">${hr.bpm}</b>`;
}
setInterval(hrChip, 5000);

/* En el descanso: cuánto falta para recuperar */
const _tickHr = tick;
tick = function () {
  _tickHr();
  const r = state.rest, el = document.getElementById('rest');
  if (!r || !el || el.hidden || !hr.on || !hr.bpm) return;
  const inner = el.querySelector('.rest-in'); if (!inner) return;
  let line = inner.querySelector('.hr-rest');
  if (!line) { line = document.createElement('div'); line.className = 'hr-rest'; const lab = inner.querySelector('.label'); lab ? lab.insertAdjacentElement('afterend', line) : inner.prepend(line); }
  const ok = r.hrOk || hr.bpm <= hrReady();
  line.className = 'hr-rest' + (ok ? ' ok' : '');
  line.textContent = ok ? `❤ ${hr.bpm} · recuperado, ya puedes seguir` : `❤ ${hr.bpm} → espera a ${hrReady()}`;
};

/* Iniciar / detener según haya sesión */
const _renderHr = render;
render = function () { _renderHr(); hrAskOnce(); if (hrWanted()) hrStart(); else if (!state.draft) hrStop(); hrChip(); };

/* Guardar resumen de pulso y calorías en la sesión */
function hrSummary(samples, durSec) {
  if (!samples || samples.length < 6) return null;
  const v = samples.map(x => x[1]), avg = Math.round(v.reduce((a, b) => a + b, 0) / v.length), max = Math.max(...v), min = Math.min(...v);
  const kg = typeof curWeight === 'function' ? curWeight() : HISTORY.kg, age = +HISTORY.age || 40;
  const perMin = (-55.0969 + 0.6309 * avg + 0.1988 * kg + 0.2017 * age) / 4.184;
  const kcal = Math.max(0, Math.round(perMin * (durSec / 60)));
  const step = Math.max(1, Math.ceil(samples.length / 120));
  return { avg, max, min, kcal, s: samples.filter((_, i) => i % step === 0) };
}
const _finishHr = finishSession;
finishSession = function () {
  const d = state.draft, id = d && d.id, samples = d && d.hr ? d.hr.slice() : null;
  _finishHr();
  const s = id && state.sessions.find(x => x.id === id);
  if (s && samples) {
    const h = hrSummary(samples, s.durationSec);
    if (h) { s.hr = h; saveLocal(); setTimeout(() => toast(`❤ Pulso promedio ${h.avg} · máx ${h.max} · ~${h.kcal} kcal`), 4200); }
  }
  if (!state.draft) hrStop();
};

/* Historial: pulso y calorías */
const _vHistoryHr = vHistory;
vHistory = function () {
  const h = _vHistoryHr(), list = state.sessions.filter(inGf), parts = h.split('<details class="card hist">');
  return parts.map((p, i) => {
    const s = i && list[i - 1]; if (!s || !s.hr) return p;
    return p.replace('</summary>', `<span class="hr-tag num">❤ ${s.hr.avg} prom · ${s.hr.max} máx · ~${s.hr.kcal} kcal</span></summary>`);
  }).join('<details class="card hist">');
};

/* Reloj: pasos en el inicio */
const _vWatchHomeHr = vWatchHome;
vWatchHome = function () {
  const h = _vWatchHomeHr(), n = stepsOf(today());
  return h + (n || (state.bs && state.bs.steps) ? `<div class="w-hint">👣 ${fmtN(n)} / ${fmtN(stepGoal())} pasos</div>` : '');
};

/* Al empezar una sesión con sensor de pulso sin permiso: pedirlo una vez */
function hrAskOnce() {
  if (!(BS && state.draft && state.bs && state.bs.hr && !state.bs.hrPerm) || state.settings.hrAsked) return;
  state.settings.hrAsked = 1; saveLocal();
  BS.request({ what: 'hr' }).then(i => { state.bs = i; if (i.hrPerm) { toast('❤ Pulso activado'); render(); } }).catch(() => {});
}
/* ---------------- Ajustes ---------------- */
const _vSettingsHr = vSettings;
vSettings = function () {
  const i = state.bs;
  const row = (t, sub, btn) => `<div class="row"><div class="grow">${t}<div class="muted" style="font-size:12px">${sub}</div></div>${btn || ''}</div>`;
  const card = `<div class="card bs-card"><h3>${ic('heart-pulse', 17)} Pulso y pasos</h3>
    ${!BS ? `<div class="muted" style="font-size:12.5px">El pulso y los pasos se leen en la app del celular y del reloj. Aquí ves lo que se sincroniza.</div>` : !i ? '<div class="muted">Revisando sensores…</div>' : `
    ${row('Pulso', i.hr ? (i.hrPerm ? 'Se mide durante tus sesiones.' : 'Este equipo tiene sensor de pulso.') : 'Este equipo no tiene sensor de pulso que la app pueda leer.', i.hr && !i.hrPerm ? '<button class="btn small" data-act="hr-perm">Permitir</button>' : i.hr ? '<button class="btn small" data-act="hr-test">Probar</button>' : '')}
    ${row('Pasos', i.steps ? (i.stepsPerm ? 'Contando los pasos del día.' : 'Falta el permiso de actividad física.') : 'Este equipo no tiene contador de pasos.', i.steps && !i.stepsPerm ? '<button class="btn small" data-act="st-perm">Permitir</button>' : '')}`}
    <form id="f-hrr" class="row" style="gap:8px"><label class="grow" for="hrr">Pulso de recuperación<div class="muted" style="font-size:12px">En el descanso te aviso al bajar a este valor (60 % de ${hrMax()}).</div></label><input id="hrr" inputmode="numeric" value="${hrReady()}" style="max-width:76px"><button class="btn small" type="submit">OK</button></form>
    <div class="hr-test-out muted num" style="font-size:13px"></div></div>`;
  return _vSettingsHr() + card;
};

let hrTestT = null;
document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-act="st-perm"],[data-act="st-open"],[data-act="hr-perm"],[data-act="hr-test"]'); if (!b) return;
  ev.stopPropagation(); ev.preventDefault();
  const a = b.dataset.act;
  if (a === 'st-open') stepsSheet();
  if (a === 'st-perm' && BS) BS.request({ what: 'steps' }).then(i => { state.bs = i; if (i.stepsPerm) { stepsRefresh(true); toast('Contador de pasos activado.'); } else toast('Sin permiso. Actívalo en Ajustes de Android → Apps → Forja → Permisos → Actividad física.'); render(); }).catch(() => {});
  if (a === 'hr-perm' && BS) BS.request({ what: 'hr' }).then(i => { state.bs = i; if (i.hrPerm) { toast('Pulso activado.'); render(); } else { state.hrAsk = 'no'; toast('Sin permiso. Actívalo en Ajustes → Apps → Forja → Permisos → Sensores corporales.'); render(); } }).catch(() => {});
  if (a === 'hr-test' && BS) {
    const out = document.querySelector('.hr-test-out'); if (out) out.textContent = 'Midiendo… mantén el reloj quieto en la muñeca.';
    let got = 0;
    const l = BS.addListener('hr', d => { got = d.bpm; const o = document.querySelector('.hr-test-out'); if (o) o.textContent = `❤ ${d.bpm} lpm — ¡el sensor funciona!`; });
    BS.startHr().catch(() => { const o = document.querySelector('.hr-test-out'); if (o) o.textContent = 'No se pudo leer el sensor.'; });
    clearTimeout(hrTestT);
    hrTestT = setTimeout(() => { if (!state.draft) BS.stopHr().catch(() => {}); try { l.then ? l.then(x => x.remove()) : l.remove(); } catch (e) {} const o = document.querySelector('.hr-test-out'); if (o && !got) o.textContent = 'El reloj no envió el pulso en 30 s. Puede que solo su propia app lo pueda leer.'; }, 30000);
  }
}, true);
document.addEventListener('submit', ev => {
  const f = ev.target;
  if (f.id === 'f-stg') { ev.preventDefault(); ev.stopImmediatePropagation(); const v = Math.round(+document.getElementById('stg').value || 0); if (v >= 1000 && v <= 50000) { state.settings.stepGoal = v; savePlans(); stepsSheet(); render(); toast('Meta de pasos guardada.'); } else toast('Pon una meta entre 1.000 y 50.000.'); }
  if (f.id === 'f-hrr') { ev.preventDefault(); ev.stopImmediatePropagation(); const v = Math.round(+document.getElementById('hrr').value || 0); if (v >= 70 && v <= 160) { state.settings.hrReady = v; savePlans(); render(); toast('Pulso de recuperación guardado.'); } else toast('Pon un valor entre 70 y 160.'); }
}, true);

/* Arranque y refresco */
if (BS) {
  bsInfo().then(i => {
    if (!i) return;
    if (i.steps && !i.stepsPerm && !state.settings.stepAsk) { state.settings.stepAsk = 1; saveLocal(); BS.request({ what: 'steps' }).then(j => { state.bs = j; stepsRefresh(true); render(); }).catch(() => {}); }
    else stepsRefresh(true);
    render();
  });
  try { CAP.App.addListener('resume', () => { bsInfo().then(() => stepsRefresh()); }); } catch (e) {}
  setInterval(() => { if (document.visibilityState !== 'hidden') stepsRefresh(); }, 120000);
}
render();
