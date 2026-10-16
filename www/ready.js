/* ==========================================================================
   Preparación del día: antes de entrenar, 2 toques (sueño y energía) + el dolor
   muscular que ya existe. Si llegas mal, la rutina se ajusta sola.
   ========================================================================== */
const READY_Q = [
  ['sleep', 'Sueño', [[-1, 'Mal', 'menos de 6 h'], [0, 'Normal', '6-7 h'], [1, 'Bien', '7-9 h']]],
  ['energy', 'Energía', [[-1, 'Baja', ''], [0, 'Normal', ''], [1, 'Alta', '']]],
];
function readyToday() { const r = state.settings.ready; return r && r.d === dk(new Date()) ? r : null; }
function readyScore() { const r = readyToday(); if (!r) return null; return (r.sleep || 0) + (r.energy || 0) - (Object.values(soreMap()).some(s => s.lvl >= 2) ? 1 : 0); }
/* Título con punto final, salvo que ya termine en signo ("¡Llegas fuerte!" no lleva "!.") */
const rpTitle = t => /[.!?…]$/.test(t) ? t : t + '.';
function readyPlan() {
  const s = readyScore(); if (s == null) return null;
  if (s <= -2) return { lv: 'low', t: 'Día de recuperación', m: 'Hoy haremos <b>1 serie menos</b> por ejercicio y <b>−10 % de peso</b>, dejando 2 reps de sobra. Entrenar suave también suma y te recuperas mejor.' };
  if (s === -1) return { lv: 'mid', t: 'Día normal, sin forzar', m: 'Mantén tus pesos de la última vez (<b>no subas hoy</b>) y no vayas al fallo.' };
  if (s >= 2) return { lv: 'top', t: '¡Llegas fuerte!', m: 'Buen día para buscar un <b>récord</b> en tu ejercicio principal, con buena técnica.' };
  return { lv: 'ok', t: 'Todo listo', m: 'Entrena según tu plan.' };
}
function readyCard() {
  const r = readyToday() || {}, p = readyPlan();
  return `<div class="card readycard" id="readycard"><h3>${ic('battery', 17)} ¿Cómo llegas hoy?</h3>
    ${READY_Q.map(([k, l, opts]) => `<div class="rd-q"><span class="label">${l}</span><div class="rd-opts">${opts.map(([v, t, sub]) => `<button type="button" class="rd ${r[k] === v ? 'on v' + (v + 1) : ''}" data-act="ready" data-k="${k}" data-v="${v}" aria-pressed="${r[k] === v}">${t}${sub ? `<small>${sub}</small>` : ''}</button>`).join('')}</div></div>`).join('')}
    ${p ? `<div class="rd-plan ${p.lv}"><b>${rpTitle(p.t)}</b> ${p.m}</div>` : '<div class="muted" style="font-size:12px">Marca cómo dormiste y tu energía: la rutina se ajusta sola si llegas cansado.</div>'}</div>`;
}
document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-act="ready"]'); if (!b) return;
  ev.stopPropagation();
  const r = Object.assign({}, readyToday() || { d: dk(new Date()) }), k = b.dataset.k, v = +b.dataset.v;
  r[k] = r[k] === v ? undefined : v; state.settings.ready = r; savePlans();
  const c = document.getElementById('readycard'); if (c) c.outerHTML = readyCard();
}, true);

/* Vista previa: tarjeta antes del dolor muscular */
const _previewReady = previewSheet;
previewSheet = function (pid, did) {
  _previewReady(pid, did);
  if (isWatch()) return;
  const list = document.querySelector('#sheet .pv-list'); if (list) list.insertAdjacentHTML('afterend', readyCard());
};

/* Al empezar: aplicar el ajuste */
const _startReady = startSession;
startSession = function (planId, dayId) {
  _startReady(planId, dayId);
  const d = state.draft, p = readyPlan(); if (!d || !p || d.readied || d.planId === 'quick') return;   // el Entreno rápido ya es corto
  d.readied = p.lv;
  d.exercises.forEach(e => {
    const inc = w => increment(e, w);
    if (p.lv === 'low') {
      if (e.log.length > 2) { e.log = e.log.slice(0, e.log.length - 1); e.target = e.log.length; }
      e.log.forEach(s => { if (!s.done) { const w = +s.w || 0; s.w = Math.max(0, Math.round(w * 0.9 / inc(w)) * inc(w)); } });
      e.readyNote = `Día de recuperación: ${e.log.length} series con ${fmtKg(+e.log[0].w || 0)} kg (−10 %), dejando 2 reps de sobra.`;
    } else if (p.lv === 'mid' && e.coach && e.coach.mode === 'up' && e.coach.last) {
      const w = e.coach.last.w; e.log.forEach(s => { if (!s.done) s.w = w; });
      e.readyNote = `Hoy no subimos: repite ${fmtKg(w)} kg y sin llegar al fallo.`;
    } else if (p.lv === 'mid') e.readyNote = 'Hoy sin forzar: deja 1-2 reps de sobra.';
  });
  saveDraft(); render();
  toast(p.t + (p.lv === 'low' ? ': rutina ajustada' : ''));
};
function decorateReady() {
  const d = state.draft; if (!d || isWatch() || !d.readied) return;
  const cards = document.querySelectorAll('#app .card.ex');
  d.exercises.forEach((e, i) => {
    const c = cards[i]; if (!c || !e.readyNote || c.querySelector('.safe.ready')) return;
    const top = c.querySelector('.ex-top'); (top || c.firstElementChild).insertAdjacentHTML('afterend', `<div class="safe ready ${d.readied}">${ic('battery', 16)}<span>${e.readyNote}</span></div>`);
  });
}
const _renderReady = render;
render = function () { _renderReady(); decorateReady(); };
bootRender();
