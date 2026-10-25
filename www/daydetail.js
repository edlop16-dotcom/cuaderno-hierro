/* ==========================================================================
   Detalle de un día de entrenamiento (tarjeta de racha → tocar un día)
   - Todos los ejercicios con sus series (peso × reps, RIR, drop sets), notas, duración y pulso.
   - Copiar, compartir (WhatsApp, Claude, ChatGPT…) o abrir en Claude para analizarlo.
   Reloj: la pantalla ya no se mantiene encendida por defecto (native.js, awakeMode) y una
   migración local (`cdh.watchAwake1`) quita el "siempre encendida" que tuviera el reloj.
   ========================================================================== */
(function () { try { if (isWatch() && !LS.get('watchAwake1', 0)) { if (state.settings.awake && state.settings.awake !== 'off') { state.settings.awake = 'off'; saveLocal(); if (typeof applyAwake === 'function') applyAwake(); } LS.set('watchAwake1', 1); } } catch (e) {} })();

const ddUnit = () => (state.settings.unit === 'lb' ? 'lb' : 'kg');
function ddSetTxt(x, e) {
  const w = +x.w || 0, bar = e && e.bar ? '' : '';
  return `${fmtKg(w)}×${x.r || 0}${x.rir != null ? ' @' + x.rir : ''}${(x.drops || []).map(dr => ' ↓' + fmtKg(+dr.w || 0) + '×' + (dr.r || 0)).join('')}` + bar;
}
/* Tipo de día (fuerza o bombeo) y objetivo, para que el texto se entienda fuera de la app */
const DD_KIND = { fuerza: 'Día de fuerza (pesado, pocas reps, descansos largos)', bombeo: 'Día de bombeo (más reps, descansos cortos)' };
/* El objetivo que elegiste (Tus datos o Tu objetivo y plan: es el mismo dato); vacío si no elegiste */
function ddGoal() {
  const g = typeof goalSet === 'function' ? goalSet() : '';
  return g ? PB_GOALS[g][0] : '';
}
function ddKindLine(s, noGoal) {
  const k = sKind(s), t = s.planId === 'quick' ? 'Entreno rápido' : (DD_KIND[k] || KINDS[k] || ''), g = noGoal ? '' : ddGoal();
  return [t, g ? 'Objetivo: ' + g : ''].filter(Boolean).join(' · ');
}
/* Texto completo de una sesión (para copiar o enviar a una IA) */
function sessionText(s, noGoal) {
  const d = new Date(s.date), u = ddUnit();
  const head = `${fmtDate(s.date, true)} · ${s.dayName}${s.gymName ? ' · ' + s.gymName : ''}${s.durationSec ? ' · ' + Math.round(s.durationSec / 60) + ' min' : ''}${s.hr && s.hr.avg ? ` · pulso ${s.hr.avg} prom / ${s.hr.max} máx · ~${s.hr.kcal} kcal` : ''}`;
  const lines = s.exercises.map(e => {
    const bar = BAR_DEFAULT && BAR_DEFAULT[e.name] && e.sets.length ? ` (${u} en discos, + barra)` : '';
    return `- ${e.name}${bar}: ${e.sets.length ? e.sets.map(x => ddSetTxt(x, e)).join(', ') : 'sin series'}${e.note ? `\n  Nota: ${e.note}` : ''}`;
  });
  const kl = ddKindLine(s, noGoal);
  return `${head}${kl ? '\n' + kl : ''}\n${lines.join('\n')}${s.note ? '\nNota de la sesión: ' + s.note : ''}`;
}
function sessionPrompt(list) {
  const p = state.settings.prof || {}, G = typeof goalNow === 'function' ? goalNow() : '';
  return `Eres mi entrenador personal. Analiza mi entrenamiento (peso×reps por serie, @ = reps en reserva, ↓ = drop set, pesos en ${ddUnit()}).\n` +
    `Sobre mí: ${HISTORY.age} años, ${HISTORY.kg} kg, ${HISTORY.cm} cm, objetivo: ${ddGoal() || 'sin elegir'}.\n\n` +
    list.map(s => sessionText(s, true)).join('\n\n') +
    `\n\nDime: 1) qué hice bien, 2) qué peso y reps hacer la próxima vez en cada ejercicio, 3) si algo indica fatiga o riesgo de lesión, 4) un consejo concreto de técnica o recuperación. Sé breve.`;
}
const _daySheetDD = daySheet;
daySheet = function (k) {
  _daySheetDD(k);
  const list = state.sessions.filter(s => dk(s.date) === k); if (!list.length) return;
  const sh = $('#sheet .sheet-card'); if (!sh) return;
  const det = list.map(s => `<div class="dd-ses">
      <div class="dd-h"><b>${esc(s.dayName)}</b><small class="muted">${esc(s.gymName || gymName(sGym(s)))}${s.durationSec ? ' · ' + Math.round(s.durationSec / 60) + ' min' : ''}${s.hr && s.hr.avg ? ` · ❤ ${s.hr.avg} prom · ~${s.hr.kcal} kcal` : ''}</small></div>
      ${s.exercises.map(e => `<div class="dd-ex"><div class="dd-en">${esc(e.name)}</div>
        <div class="dd-sets">${e.sets.length ? e.sets.map((x, j) => `<span class="dd-s"><i>${j + 1}</i><b class="num">${fmtKg(+x.w || 0)}</b>×<b class="num">${x.r || 0}</b>${x.rir != null ? `<small>@${x.rir}</small>` : ''}${(x.drops || []).map(dr => `<small>↓${fmtKg(+dr.w || 0)}×${dr.r || 0}</small>`).join('')}</span>`).join('') : '<span class="muted">Sin series</span>'}</div>
        ${e.note ? `<div class="dd-note">📝 ${esc(e.note)}</div>` : ''}</div>`).join('')}
      ${s.note ? `<div class="dd-note">📝 ${esc(s.note)}</div>` : ''}</div>`).join('');
  const acts = `<div class="dd-acts"><button type="button" class="btn small primary" data-dd="claude" data-k="${k}">${ic('sparkles', 15)} Analizar con Claude</button><button type="button" class="btn small" data-dd="share" data-k="${k}">${ic('share-2', 15)} Compartir</button><button type="button" class="btn small" data-dd="copy" data-k="${k}">${ic('copy', 15)} Copiar</button></div>
    <div class="muted" style="font-size:11.5px">"Compartir" te deja elegir la app: Claude, ChatGPT, Gemini, WhatsApp o tu entrenador.</div>`;
  const first = sh.querySelector('.day-row');
  if (first) first.insertAdjacentHTML('beforebegin', `<div class="dd-wrap">${det}</div>${acts}<div class="label" style="margin-top:6px">Quitar del registro</div>`);
};
function ddCopy(txt) {
  try { if (navigator.clipboard) return navigator.clipboard.writeText(txt).then(() => true, () => false); } catch (e) {}
  return Promise.resolve(false);
}
document.addEventListener('click', ev => {
  const b = ev.target.closest && ev.target.closest('[data-dd]'); if (!b) return;
  ev.preventDefault(); ev.stopPropagation();
  const list = state.sessions.filter(s => dk(s.date) === b.dataset.k); if (!list.length) return;
  const txt = sessionPrompt(list), plain = list.map(s => sessionText(s)).join('\n\n');
  if (b.dataset.dd === 'copy') ddCopy(plain).then(ok => toast(ok ? 'Entrenamiento copiado.' : 'No se pudo copiar.'));
  else if (b.dataset.dd === 'share') {
    const S = typeof CAP !== 'undefined' && CAP && CAP.Share;
    if (S) S.share({ title: 'Mi entrenamiento', text: txt }).catch(() => {});
    else if (navigator.share) navigator.share({ title: 'Mi entrenamiento', text: txt }).catch(() => {});
    else ddCopy(txt).then(ok => toast(ok ? 'Copiado: pégalo en tu IA o en WhatsApp.' : 'No se pudo compartir.'));
  } else if (b.dataset.dd === 'claude') {
    ddCopy(txt); toast('Abriendo Claude… (también quedó copiado)');
    setTimeout(() => openExt('https://claude.ai/new?q=' + encodeURIComponent(txt.slice(0, 6000))), 300);
  }
}, true);
