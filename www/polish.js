/* ==========================================================================
   Revisión completa (12-oct-2026): orden, claridad y ahorro de batería
   1. Entrenar: "Te toca" + Empezar justo bajo el saludo (lo principal, sin bajar).
   2. Perfil con pestañas Hoy · Progreso · Cuerpo · Historial. "Hoy" reúne tus hábitos
      con un resumen del día. Ajustes (botón de la barra) es su propia página.
   3. En el entrenamiento solo se anima la foto del ejercicio que estás viendo.
   4. El consejo del coach para ejercicios nuevos usa el RIR de la semana del bloque.
   ========================================================================== */

/* ---------- 1. Entrenar: lo principal primero ---------- */
function trainOrder() {
  if (state.tab !== 'train' || state.draft || isWatch()) return;
  const app = $('#app'), hero = app && app.querySelector(':scope > .hero'); if (!hero) return;
  const anchor = app.querySelector(':scope > .geo-card') || app.querySelector(':scope > .gympill');
  if (anchor && anchor.nextElementSibling !== hero) anchor.insertAdjacentElement('afterend', hero);
}

/* ---------- 2. Perfil: Hoy · Progreso · Cuerpo · Historial; Ajustes aparte ---------- */
const PROF_TABS = [['hoy', 'Hoy', 'calendar-check'], ['progress', 'Progreso', 'trending-up'], ['body', 'Cuerpo', 'activity'], ['history', 'Historial', 'history']];
if (!state.profSub || state.profSub === 'settings') state.profSub = 'hoy';
function dayStrip() {
  const t = today(), habs = (typeof habList === 'function' ? habList() : []).filter(h => !h.hidden);
  const done = habs.filter(h => t[h.k]).length, trained = state.sessions.some(s => dk(s.date) === dk(new Date()));
  const steps = typeof stepsOf === 'function' ? stepsOf(t) : 0;
  const it = (v, l, ok) => `<span class="ds-i ${ok ? 'ok' : ''}"><b class="num">${v}</b><small>${l}</small></span>`;
  return `<div class="day-strip">${it(done + '/' + habs.length, 'hábitos', habs.length && done === habs.length)}${it(trained ? '✓' : '—', 'entreno', trained)}${steps ? it(typeof fmtN === 'function' ? fmtN(steps) : steps, 'pasos', typeof stepGoal === 'function' && steps >= stepGoal()) : ''}${t.sleepMin && typeof fmtHM === 'function' ? it(fmtHM(t.sleepMin), 'sueño', t.sleepMin >= 420) : ''}</div>`;
}
const _vProfileP = vProfile;
vProfile = function (sub) {
  if (sub === 'settings') {
    let body = ''; header.skip = true;
    try { body = vSettings(); } finally { header.skip = false; }
    return header('Ajustes', 'Tu cuenta, recordatorios y la app') + body;
  }
  const want = PROF_TABS.some(x => x[0] === sub) ? sub : 'hoy';
  let h;
  if (want === 'hoy') { const keep = vProgress; vProgress = () => ''; try { h = _vProfileP('progress'); } finally { vProgress = keep; } }
  else h = _vProfileP(want);
  state.profSub = want;
  const i = h.indexOf('<div class="seg seg4"'); if (i < 0) return h;
  const j = h.indexOf('</div>', i) + 6, hc = habitCard();
  const seg = `<div class="seg seg4 prof-seg" role="tablist">${PROF_TABS.map(([k, l, n]) => `<button role="tab" class="${want === k ? 'on' : ''}" aria-selected="${want === k}" data-act="prof-sub" data-sub="${k}">${ic(n, 14)} ${l}</button>`).join('')}</div>`;
  return h.slice(0, i).replace(hc, '') + seg + (want === 'hoy' ? dayStrip() + hc : h.slice(j));
};

/* ---------- 3. Animar solo la foto del ejercicio actual ---------- */
function sxCur() {
  const d = state.draft; if (!d) return;
  document.querySelectorAll('#sx-pager > .sx-page').forEach((p, i) => p.classList.toggle('cur', i === (d.cur || 0)));
}
const _setCurP = setCur;
setCur = function (i) { _setCurP(i); sxCur(); };

/* ---------- 4. Coach: RIR de la semana para ejercicios nuevos ---------- */
function rirTipNow() {
  const I = typeof mesoInfo === 'function' ? mesoInfo() : null;
  if (!I || I.pre) return 'Deja 2 reps de sobra en las primeras series y 1 en la última, con buena técnica. Así la app aprende tu nivel.';
  if (I.deload) return 'Semana de descarga: deja 3 reps de sobra en todas las series.';
  const t = [0, 1, 2].map(j => rirTarget(j));
  return `Esta semana deja ${t[0]} reps de sobra en la serie 1, ${t[1]} en la 2 y ${t[2]} en la última, con buena técnica. Así la app aprende tu nivel.`;
}
const _coachForP = coachFor;
coachFor = function (ex, g, k) {
  const c = _coachForP(ex, g, k);
  if (c && c.tips) c.tips = c.tips.map(x => /^Serie 1 con 2 reps en reserva/.test(x) ? rirTipNow() : x);
  return c;
};

/* ---------- 5. Ajustes en un orden lógico: cuenta y recordatorios primero ---------- */
const SET_ORDER = [['Tu cuenta', 1], ['remind', 2], ['Recordatorios', 3], ['ps-card', 4], ['bs-card', 5], ['hc-card', 6], ['Fin del descanso', 7], ['Pantalla', 8], ['no-card', 9], ['pro-card', 10], ['Importar historial', 11], ['Respaldo', 12], ['Actualizaciones', 13], ['priv-card', 14]];
function settingsOrder() {
  if (state.tab !== 'settings') return;
  const app = $('#app'); if (!app) return;
  const rank = el => {
    if (el.classList.contains('w2-home')) return -3;
    if (el.classList.contains('brandbar')) return -2;
    if (el.classList.contains('pagehead')) return -1;
    const h = el.querySelector(':scope > h3, :scope > .row > h3'), t = h ? h.textContent.trim() : '';
    for (let k = 0; k < SET_ORDER.length; k++) { const key = SET_ORDER[k][0]; if (el.classList.contains(key) || (t && t.indexOf(key) === 0)) return SET_ORDER[k][1]; }
    return el.classList.contains('muted') && !el.classList.contains('card') ? 99 : 50;
  };
  Array.prototype.map.call(app.children, (el, i) => ({ el, r: rank(el), i })).sort((a, b) => a.r - b.r || a.i - b.i).forEach(x => app.appendChild(x.el));
}

/* ---------- Tras cada dibujo ---------- */
const _renderP = render;
render = function () { _renderP(); trainOrder(); settingsOrder(); sxCur(); };
bootRender();
