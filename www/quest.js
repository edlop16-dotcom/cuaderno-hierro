/* ==========================================================================
   Fase 5 · Misiones de inicio y aviso de peso raro (15-oct-2026)
   1. Misiones de inicio (usuarios nuevos): una lista corta en Entrenar que se marca
      sola y enseña lo principal de la app. Al completarlas, confeti.
   2. Aviso de peso raro: si escribes un peso muy distinto a tu referencia del
      ejercicio (p. ej. 100 en vez de 10), la app pregunta antes de que lo guardes.
   ========================================================================== */
const QS_LIST = [
  ['prof', 'Completa tu perfil', 'user', () => !!pbProf()],
  ['weight', 'Registra tu peso corporal', 'activity', () => { const b = body(); return !!(b.w && b.w.length); }],
  ['first', 'Haz tu primer entrenamiento', 'dumbbell', () => state.sessions.length > 0],
  ['quick', 'Prueba un entreno rápido', 'zap', () => state.sessions.some(s => s.planId === 'quick')],
  ['hab', 'Marca un hábito del día', 'check-square', () => { const ks = habList().map(h => h.k); return Object.keys(state.daily || {}).some(k => { const d = state.daily[k]; return d && ks.some(x => d[x]); }); }],
  ['week3', 'Entrena 3 veces en una semana', 'calendar-check', () => { const c = {}; return state.sessions.some(s => { const k = dk(weekStartOf(new Date(s.date))); c[k] = (c[k] || 0) + 1; return c[k] >= 3; }); }],
  ['rank', 'Consigue tu primer rango', 'medal', () => { const R = muscleRanks(); return Object.keys(R).some(k => R[k].s >= 0); }],
];
const qsShow = () => pubUser() && !state.settings.questOff && !state.settings.questDone && !isWatch();
function qsDone() { return QS_LIST.map(q => { let ok = false; try { ok = !!q[3](); } catch (e) {} return ok; }); }
function questCard() {
  const ok = qsDone(), n = ok.filter(Boolean).length;
  if (n === QS_LIST.length) {
    if (!state.settings.questDone) { state.settings.questDone = Date.now(); savePlans(); setTimeout(() => { if (typeof confetti === 'function') confetti(); toast('¡Completaste las misiones de inicio! Ya dominas Forja.'); }, 300); }
    return '';
  }
  const next = ok.indexOf(false);
  return `<div class="card qs-card">
    <div class="row" style="justify-content:space-between"><h3>${ic('target', 17)} Misiones de inicio</h3><span class="qs-n num">${n}/${QS_LIST.length}</span></div>
    <div class="qs-bar"><i style="width:${Math.round(n / QS_LIST.length * 100)}%"></i></div>
    <div class="qs-list">${QS_LIST.map((q, i) => `<div class="qs-it ${ok[i] ? 'ok' : ''} ${i === next ? 'next' : ''}">${ic(ok[i] ? 'circle-check' : q[2], 17)}<span>${q[1]}</span></div>`).join('')}</div>
    <button type="button" class="qs-hide" data-act="qs-hide">Ocultar</button></div>`;
}
document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-act="qs-hide"]'); if (!b) return;
  ev.stopPropagation(); state.settings.questOff = 1; savePlans(); render();
}, true);
const _renderQs = render;
render = function () {
  _renderQs();
  if (state.tab !== 'train' || state.draft || !qsShow()) return;
  const app = $('#app'); if (!app || app.querySelector('.qs-card')) return;
  const after = app.querySelector(':scope > .qk-card') || app.querySelector(':scope > .hero');
  const h = questCard(); if (!h) return;
  if (after) after.insertAdjacentHTML('afterend', h); else app.insertAdjacentHTML('beforeend', h);
};

/* ---------- Aviso de peso raro ---------- */
function wgRef(ex) {
  const p = (ex.prev || []).map(s => +s.w || 0).filter(Boolean);
  if (p.length) return Math.max.apply(null, p);
  return ex.sugg && +ex.sugg.w || 0;
}
function wgCheck(ex, v) {
  /* En libras los pesos guardados ya están en lb: los márgenes (en kg) se pasan a lb y el texto dice "lb" */
  const lb = typeof pbLb === 'function' && pbLb(), f = lb ? LB : 1, u = lb ? 'lb' : 'kg';
  const ref = wgRef(ex); if (!(ref >= 4 * f) || !(v > 0)) return null;
  if (v >= ref * 2.2 && v - ref >= 15 * f) return `¿${fmtKg(v)} ${u} en ${ex.name}? Tu referencia es ${fmtKg(ref)} ${u}. Revisa que no sobre un número.`;
  if (v <= ref / 3 && ref - v >= 10 * f) return `¿${fmtKg(v)} ${u} en ${ex.name}? Tu referencia es ${fmtKg(ref)} ${u}. Revisa que no falte un número.`;
  return null;
}
document.addEventListener('change', ev => {
  const t = ev.target; if (!t || !t.matches || !t.matches('input[data-f="w"][data-ex]') || !state.draft) return;
  const ex = state.draft.exercises[+t.dataset.ex]; if (!ex) return;
  const msg = wgCheck(ex, +String(t.value).replace(',', '.'));
  if (!msg) return;
  const key = t.dataset.ex + ':' + t.value;
  if (ex.wgSeen === key) return;
  ex.wgSeen = key; saveDraft(); toast(msg);
  t.classList.add('wg-warn'); setTimeout(() => t.classList.remove('wg-warn'), 2600);
}, true);
