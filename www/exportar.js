/* ==========================================================================
   Tanda I1 · Exportaciones (24-oct-2026). Solo teléfono: el reloj no cambia.
   1. "Exportar" en la sesión en curso: copia lo hecho hasta ese momento (sessionPrompt, con el día dentro
      del bloque y "LO QUE TE PIDO" con objetivo y tipo). El mismo botón en el resumen al terminar.
   2. "Exportar semana": de lunes a domingo, el día en cada bloque y la próxima semana en formato importable
      ("DÍA LUNES (FUERZA): …"). Se ofrece al cerrar la semana (resumen de una sesión del domingo y tarjeta en
      Hoy el domingo después de entrenar o desde el lunes) y con un botón en Progreso · Historial.
   3. Una sesión hecha con la recomendación importada solo copia sus pesos a los días de su mismo tipo.
   ========================================================================== */

/* ---------- 1. La sesión en curso como sesión guardada (solo las series marcadas) ---------- */
/* Ejercicio del plan que reemplaza cada uno de la sesión (mismo exId y otro nombre): { nombre: nombre del plan } */
function exSubsOfDraft(d) {
  const out = {}, day = d && findDay(d.planId, d.dayId).d; if (!day) return out;
  d.exercises.forEach(e => { const x = e.exId && day.exercises.find(y => y.id === e.exId); if (x && x.name !== e.name) out[e.name] = x.name; });
  return out;
}
function exDraftSession() {
  const d = state.draft; if (!d) return null;
  const of = exSubsOfDraft(d);
  const exs = d.exercises.map(e => ({ name: e.name, type: e.type, rest: e.rest, ...(of[e.name] ? { of: of[e.name] } : {}), ...(String(e.note || '').trim() ? { note: String(e.note).trim() } : {}),
    sets: e.log.filter(s => s.done).map(s => { const o = { w: +s.w || 0, r: +s.r || 0 }; if (s.rir != null) o.rir = s.rir; const dd = (s.drops || []).filter(x => x.done).map(x => ({ w: +x.w || 0, r: +x.r || 0 })); if (dd.length) o.drops = dd; return o; }) }))
    .filter(e => e.sets.length);
  return { id: d.id, live: 1, date: d.start, planId: d.planId, planName: d.planName, dayId: d.dayId, dayName: d.dayName, gymId: d.gymId || 'rokaz', gymName: d.gymName || gymName(d.gymId),
    kind: d.kind || kindOfName(d.dayName), durationSec: Math.round((Date.now() - new Date(d.start)) / 1000), exercises: exs };
}
function exLive() {
  const s = exDraftSession(); if (!s) return;
  if (!s.exercises.length) { toast('Aún no marcas ninguna serie: no hay nada que exportar.'); return; }
  const n = s.exercises.reduce((a, e) => a + e.sets.length, 0);
  nsCopy(sessionPrompt([s])).then(ok => toast(ok ? `Copiado: ${s.exercises.length} ${s.exercises.length === 1 ? 'ejercicio' : 'ejercicios'} y ${n} ${n === 1 ? 'serie' : 'series'} hasta ahora. Pégalo en tu IA.` : 'No se pudo copiar.'));
}
/* En la fila de píldoras de la sesión (la barra de arriba no tiene sitio a 360 px: el reloj se quedaba sin espacio) */
const exBtnLive = () => `<button type="button" class="su-p ex-exp" data-xp="live" aria-label="Exportar lo hecho hasta ahora para tu IA">${ic('copy', 15)} Exportar</button>`;

/* ---------- 2. Semana: ¿toca ofrecerla? ---------- */
/* Domingo después de entrenar: esta semana. De lunes a sábado: la que terminó, hasta exportarla o cerrar la tarjeta. */
function exWeekDue() {
  if (isWatch() || !state.sessions.length) return null;
  const now = new Date();
  if (now.getDay() === 0 && !state.sessions.some(s => dk(s.date) === dk(now))) return null;
  const W = aixWeekOf(now.getDay() === 0 ? 0 : 1);
  return W.list.length && state.settings.wxSeen !== W.key ? W : null;
}
const exSeen = key => { if (state.settings.wxSeen !== key) { state.settings.wxSeen = key; savePlans(); } };
function exWeekCard() {
  const W = exWeekDue(); if (!W) return '';
  return `<div class="card wx-card"><div class="row"><span class="pb-ic">${ic('calendar-check', 18)}</span><b class="grow">${W.off ? 'Terminó tu semana' : 'Cerraste tu semana'}</b><button type="button" class="icon-btn" data-xp="wx-x" data-k="${W.key}" aria-label="Cerrar">${ic('x', 16)}</button></div>
    <div class="muted wc-sub">${W.list.length} ${W.list.length === 1 ? 'sesión' : 'sesiones'} de lunes a domingo. Expórtalas para que tu IA te arme la próxima semana, lista para importar.</div>
    <button type="button" class="btn primary small" data-xp="week" data-off="${W.off}">${ic('download', 15)} Exportar semana</button></div>`;
}
/* Hoja: la semana elegida, vista previa y Claude / Compartir / Copiar / .txt */
const EX_WEEKS = [[0, 'Esta semana'], [1, 'Semana pasada'], [2, 'Hace 2 semanas']];
function exWeekSheet(off) {
  state.exOff = off;
  const R = aixWeekText(off), long = R.txt.length > AIX_LONG, last = new Date(R.W.we.getTime() - 864e5);
  openSheet(`<div class="row"><h2 class="grow">Exportar semana</h2><button class="icon-btn" data-act="sheet-close" aria-label="Cerrar">${ic('x', 18)}</button></div>
    <div class="muted" style="font-size:12.5px">Tus sesiones de lunes a domingo, cada una con su día, tu rutina y lo que le pides a tu IA: un análisis breve, recomendaciones según fuerza o bombeo y tu próxima semana en el formato que lee "Importar recomendación" (o "Importar rutinas"). No incluye tu correo ni tu cuenta.</div>
    <div class="gymbar">${EX_WEEKS.map(([o, l]) => `<button class="gchip ${o === off ? 'on' : ''}" data-xp="wk-off" data-off="${o}">${l}</button>`).join('')}</div>
    <div class="aix-meta muted">Del lunes ${fmtDate(R.W.ws.toISOString())} al domingo ${fmtDate(last.toISOString())} · ${R.n} ${R.n === 1 ? 'sesión' : 'sesiones'} · ${R.txt.length.toLocaleString('es-PE')} caracteres</div>
    ${R.n ? '' : '<div class="card aix-empty">Esa semana no tienes sesiones. El texto lleva tus datos y tu rutina para que la IA te arme la próxima.</div>'}
    <pre class="aix-pre">${esc(R.txt.slice(0, 1500))}${R.txt.length > 1500 ? '\n…' : ''}</pre>
    <button class="btn primary block" data-xp="wk-claude">${ic('sparkles', 16)} Analizar con Claude</button>
    <div class="dd-acts"><button class="btn small" data-xp="wk-share">${ic('share-2', 15)} Compartir</button><button class="btn small" data-xp="wk-copy">${ic('copy', 15)} Copiar</button>${long ? `<button class="btn small" data-xp="wk-txt">${ic('download', 15)} Guardar .txt</button>` : ''}</div>`);
  const c = $('#sheet .sheet-card'); if (c) c.classList.add('wx-sheet');
}
const exHistBtn = () => `<button type="button" class="ai-fab-row ex-hrow" data-xp="week" data-off="${aixWeekOf(0).list.length ? 0 : 1}">${ic('download', 18)}<span class="grow">Exportar semana para tu IA</span>${ic('chevron-right', 16)}</button>`;

/* ---------- Dónde salen los botones ---------- */
const _vTrainEx = vTrain;
vTrain = function () {
  const h = _vTrainEx.apply(this, arguments);
  return state.draft || isWatch() ? h : h + exWeekCard();
};
/* Un aviso a la vez en Hoy: la semana va justo antes del coach semanal */
(function () { if (typeof HOY_AVISOS === 'undefined' || HOY_AVISOS.indexOf('.wx-card') >= 0) return; const i = HOY_AVISOS.indexOf('.wc-card:not(.fill)'); HOY_AVISOS.splice(i < 0 ? HOY_AVISOS.length : i, 0, '.wx-card'); })();
const _renderEx = render;
render = function () {
  _renderEx();
  if (isWatch()) return;
  if (state.draft) document.querySelectorAll('#sx .su-pills').forEach(p => { if (!p.querySelector('.ex-exp')) p.insertAdjacentHTML('beforeend', exBtnLive()); });
  const app = document.getElementById('app');
  if (app && !state.draft && state.tab === 'progress' && state.progSub === 'historial' && !app.querySelector('.ex-hrow')) {
    const seg = app.querySelector('.prog-seg'); if (seg) seg.insertAdjacentHTML('afterend', exHistBtn()); else app.insertAdjacentHTML('beforeend', exHistBtn());
  }
};
/* Resumen al terminar: "Exportar" (y "Exportar semana" si es domingo) antes de "Listo" */
const _fsHtmlEx = fsHtml;
fsHtml = function (s) {
  const h = _fsHtmlEx.apply(this, arguments); if (isWatch() || !s) return h;
  const sun = new Date().getDay() === 0;
  const b = `<div class="dd-acts ex-fs"><button type="button" class="btn small" data-xp="fs" data-id="${esc(s.id)}">${ic('copy', 15)} Exportar</button>${sun ? `<button type="button" class="btn small" data-xp="week" data-off="0">${ic('download', 15)} Exportar semana</button>` : ''}</div>`;
  return h.replace('<button type="button" class="btn primary block" data-act="fs-close">', b + '$&');
};

/* ---------- 3. Con la recomendación importada: sus pesos solo pasan a los días de su tipo ---------- */
let exIaKind = null;
const _finishEx = finishSession;
finishSession = function () {
  const d = state.draft, id = d && d.id, of = exSubsOfDraft(d); exIaKind = d && d.ns && d.ns.src === 'ia' ? (d.kind || kindOfName(d.dayName)) : null;
  try { return _finishEx.apply(this, arguments); }
  finally {
    exIaKind = null;
    /* Guardar en la sesión a qué ejercicio del plan reemplazó cada sustituto (lo usan las exportaciones) */
    const s = id && !state.draft && state.sessions.find(x => x.id === id);
    if (s && Object.keys(of).length) { s.exercises.forEach(e => { if (of[e.name]) e.of = of[e.name]; }); saveLocal(); }
  }
};
const _learnWeightsEx = learnWeights;
learnWeights = function (s) {
  if (!exIaKind || !s) return _learnWeightsEx(s);
  const gid = sGym(s); let ch = false;
  s.exercises.forEach(e => {
    const top = e.sets.length ? Math.max.apply(null, e.sets.map(x => +x.w || 0)) : 0; if (!top) return;
    state.plans.filter(p => (p.gymId || 'rokaz') === gid).forEach(p => p.days.filter(d => aixDayKind(d) === exIaKind).forEach(d => d.exercises.forEach(x => { if (x.name === e.name && x.weight !== top) { x.weight = top; ch = true; } })));
  });
  if (ch) savePlans();
};

/* ---------- Toques ---------- */
document.addEventListener('click', ev => {
  const b = ev.target.closest && ev.target.closest('[data-xp]'); if (!b) return;
  ev.preventDefault(); ev.stopPropagation();
  const a = b.dataset.xp, off = state.exOff || 0;
  if (a === 'live') exLive();
  else if (a === 'fs') { const s = state.sessions.find(x => x.id === b.dataset.id); if (s) nsCopy(sessionPrompt([s])).then(ok => toast(ok ? 'Copiado: pégalo en tu IA.' : 'No se pudo copiar.')); }
  else if (a === 'week') { const o = +b.dataset.off || 0, W = exWeekDue(); if (W && W.off === o) exSeen(W.key); exWeekSheet(o); render(); }   // abrirla = ya ofrecida
  else if (a === 'wk-off') exWeekSheet(+b.dataset.off || 0);
  else if (a === 'wx-x') { exSeen(b.dataset.k); render(); }
  else {
    const txt = aixWeekText(off).txt;
    if (a === 'wk-claude') aixOpenClaude(txt);
    else if (a === 'wk-share') aixShare('Mi semana en Forja', txt);
    else if (a === 'wk-copy') nsCopy(txt).then(ok => toast(ok ? 'Semana copiada: pégala en tu IA.' : 'No se pudo copiar.'));
    else if (a === 'wk-txt') aixSaveTxt(txt);
  }
}, true);
bootRender();
