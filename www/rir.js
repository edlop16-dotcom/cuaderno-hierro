/* ==========================================================================
   RIR por serie: al marcar una serie eliges cuántas reps te sobraban (0, 1, 2, 3+).
   Se guarda con la serie y el coach lo usa para decidir si subir peso.
   ========================================================================== */
const RIR_OPTS = [[0, '0', 'Al fallo'], [1, '1', ''], [2, '2', ''], [3, '3+', 'Fácil']];
var rirTarget = j => Math.max(0, 2 - j);
const rirTxt = v => v == null ? '' : v >= 3 ? '3+' : String(v);

function rirPick(i, j, s) {
  const plan = Math.min(3, rirTarget(j));
  return `<div class="rirpick" data-ex="${i}" data-set="${j}"><span class="rp-q">¿Reps de sobra?</span>${RIR_OPTS.map(([v, l]) =>
    `<button type="button" class="rp ${s.rir === v ? 'on' : ''} ${s.rir == null && v === plan ? 'plan' : ''}" data-act="rir" data-ex="${i}" data-set="${j}" data-v="${v}" aria-pressed="${s.rir === v}" aria-label="RIR ${l}">${l}</button>`).join('')}</div>`;
}
function decorateRir() {
  const d = state.draft; if (!d || isWatch()) return;
  d.exercises.forEach((e, i) => e.log.forEach((s, j) => {
    const chk = document.querySelector(`#app .check[data-act="set"][data-ex="${i}"][data-set="${j}"]:not([data-k])`);
    if (!chk) return;
    const nx = chk.nextElementSibling, has = nx && nx.classList.contains('rirpick');
    if (s.done && !has) chk.insertAdjacentHTML('afterend', rirPick(i, j, s));
    else if (!s.done && has) nx.remove();
  }));
}
const _renderRir = render;
render = function () { _renderRir(); decorateRir(); };

document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-act="rir"]'); if (!b) return;
  ev.stopPropagation();
  const d = state.draft; if (!d) return;
  const s = d.exercises[+b.dataset.ex] && d.exercises[+b.dataset.ex].log[+b.dataset.set]; if (!s) return;
  const v = +b.dataset.v;
  s.rir = s.rir === v ? null : v; d.lastAct = Date.now(); saveDraft();
  const box = b.closest('.rirpick');
  box.querySelectorAll('.rp').forEach(x => { const on = +x.dataset.v === s.rir; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); x.classList.remove('plan'); });
  try { HAP && HAP.impact({ style: 'LIGHT' }); } catch (e) {}
}, true);

/* Guardar el RIR con cada serie de la sesión */
const _finishRir = finishSession;
finishSession = function () {
  const d = state.draft, id = d && d.id;
  const rirs = d ? d.exercises.map(e => ({ name: e.name, r: e.log.filter(s => s.done).map(s => s.rir) })) : [];
  _finishRir();
  const s = id && state.sessions.find(x => x.id === id);
  if (!s) return;
  let any = false;
  rirs.forEach(x => {
    const e = s.exercises.find(y => y.name === x.name); if (!e) return;
    e.sets.forEach((z, k) => { if (x.r[k] != null) { z.rir = x.r[k]; any = true; } });
  });
  if (any) saveLocal();
};

/* El coach usa el RIR de la última sesión */
const _coachRir = coachFor;
coachFor = function (ex, gymId, kind) {
  const c = _coachRir(ex, gymId, kind);
  if (!c || !c.last || c.mode === 'pain' || c.mode === 'down' || c.mode === 'back') return c;
  const H = exHistory(ex.name, gymId, kind, 3); if (!H.length) return c;
  const last = H[0], top = Math.max.apply(null, last.sets.map(x => x.w));
  const ts = last.sets.filter(x => x.w === top), rs = ts.map(x => x.rir).filter(v => v != null);
  if (!rs.length) return c;
  const minR = Math.min.apply(null, rs), maxR = Math.max.apply(null, rs);
  const inc = increment(ex, top);
  if (c.mode === 'hold' && minR >= 3 && ts.every(x => x.r >= ex.repsMin)) {
    const jump = ts.every(x => x.r >= ex.repsMax) ? 2 : 1;
    c.w = top + inc * jump; c.mode = 'up'; c.goal = Array(ex.sets).fill(ex.repsMin);
    c.head = `<b>Sube a ${fmtKg(c.w)} kg</b> y busca ${ex.repsMin}+ reps en cada serie.`;
    c.tips.unshift(`La última vez te sobraban 3 o más reps en todas las series: el peso te quedó liviano. Sube${jump > 1 ? ' dos saltos' : ''} aunque no hayas llegado al tope de reps.`);
  } else if (c.mode === 'hold' && minR >= 2) {
    c.tips.unshift('Te sobraban 2 o más reps en cada serie. Hoy acércate más al límite en la última serie (RIR 0-1, con buena técnica): así creces más.');
  } else if (c.mode === 'up' && maxR === 0) {
    c.tips.unshift('Completaste el rango, pero llegando al fallo en todas las series. Sube, y si la 1ª serie se siente muy pesada, vuelve al peso anterior una sesión más.');
  }
  if (H[1] && c.mode !== 'up') {
    const allZero = h => h.sets.length && h.sets.every(x => x.rir === 0);
    const best = h => Math.max.apply(null, h.sets.map(x => e1rm(x.w, x.r)));
    if (allZero(H[0]) && allZero(H[1]) && best(H[0]) <= best(H[1]) * 1.005)
      c.tips.unshift('Dos sesiones al fallo en todas las series sin mejorar: estás acumulando fatiga. Deja 1-2 reps de sobra en las primeras series y solo la última al límite.');
  }
  return c;
};

/* RIR en el texto para analizar con Claude y en el historial */
const _fmtSetsRir = typeof claudePrompt === 'function' ? claudePrompt : null;
if (_fmtSetsRir) claudePrompt = function () {
  return _fmtSetsRir().replace('(peso×reps por serie, ↓ = drop set)', '(peso×reps por serie, ↓ = drop set; RIR = reps que me sobraban)') +
    (state.sessions.some(s => s.exercises.some(e => e.sets.some(x => x.rir != null))) ? '\nRIR de mis últimas series: ' + state.sessions.filter(s => s.exercises.some(e => e.sets.some(x => x.rir != null))).slice(0, 6).map(s => dk(s.date) + ' ' + s.exercises.map(e => e.name + ' ' + e.sets.map(x => rirTxt(x.rir) || '?').join('/')).join(', ')).join(' | ') : '');
};
bootRender();
