/* ==========================================================================
   Días de bombeo: en qué repetición debe empezar a arder el músculo.
   Regla: el ardor debe aparecer en las ÚLTIMAS 5 reps de la serie (como pide tu entrenador).
   - Si arde antes → el peso está alto o descansaste poco: baja un poco.
   - Si no arde ni en las 2 últimas → el peso está liviano: súbelo la próxima serie.
   ========================================================================== */
const BURN_LAST = 5;
const burnTarget = (e, j) => { const g = e.coach && e.coach.goal && e.coach.goal[j]; return Math.max(e.repsMin || 1, Math.min(e.repsMax || 15, g || e.repsMax || 15)); };
const burnFrom = (e, j) => Math.max(1, burnTarget(e, j) - (BURN_LAST - 1));
const isPump = d => d && (d.kind || kindOfName(d.dayName || '')) === 'bombeo';

function burnBox(e, i) {
  const per = e.log.map((_, j) => [burnFrom(e, j), burnTarget(e, j)]), same = per.every(x => x[0] === per[0][0] && x[1] === per[0][1]);
  const head = same ? `<b>Debe arder desde la rep ${per[0][0]}</b> hasta la ${per[0][1]}.` : `<b>Debe arder en las últimas 5 reps:</b> ${per.map((x, j) => `serie ${j + 1} desde la <b>${x[0]}</b>`).join(' · ')} (el 🔥 junto a cada serie).`;
  return `<div class="burn" data-ex="${i}"><span class="burn-ic">🔥</span><span>${head}
    <small>Si arde 3 reps antes de lo indicado, baja un poco el peso. Si no arde ni en la penúltima rep, súbelo en la próxima serie. Baja en 2 s, sin pausas arriba: tensión continua.</small></span></div>`;
}
function decorateBurn() {
  const d = state.draft; if (!d || isWatch() || !isPump(d)) return;
  const cards = document.querySelectorAll('#app .card.ex');
  d.exercises.forEach((e, i) => {
    const c = cards[i]; if (!c) return;
    if (!c.querySelector('.burn')) { const sets = c.querySelector('.warm') || c.querySelector('.sets'); if (sets) sets.insertAdjacentHTML('beforebegin', burnBox(e, i)); }
    c.querySelectorAll('.sets .n:not(.drop-n)').forEach((n, j) => { const r = n.querySelector('.rir'); if (r && r.textContent !== 'DROP' && j < e.log.length) r.textContent = '🔥' + burnFrom(e, j); });
  });
}
const _renderBurn = render;
render = function () { _renderBurn(); decorateBurn(); };

/* Reloj: indicación en la serie actual */
const _vWatchBurn = vWatchSession;
vWatchSession = function () {
  const h = _vWatchBurn(), d = state.draft; if (!isPump(d)) return h;
  const i = Math.min(d.cur, d.exercises.length - 1), e = d.exercises[i], st = watchStep(e); if (!st || st.k != null) return h;
  const line = `<div class="w-burn">🔥 Arde desde la <b>${burnFrom(e, st.j)}</b> → ${burnTarget(e, st.j)}</div>`;
  const at = h.indexOf('<div class="w-fig">');
  return at < 0 ? h + line : h.slice(0, at) + line + h.slice(at);
};
bootRender();
