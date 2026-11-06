/* ==========================================================================
   Mejoras del entrenamiento (rama mejoras-entrenamiento). Solo el teléfono, salvo el orden real al guardar.
   1. Al abrir un ejercicio: peso y reps del coach en los campos y tu última vez como referencia, siempre del mismo
      ejercicio y del mismo gimnasio. Sin datos de ese gimnasio, los campos quedan vacíos y no sale ninguna referencia
      de otro. Si el ejercicio lleva peso, hay que escribirlo antes de marcar la serie (si no, se guardaría 0 kg).
   2. Un ejercicio agregado a mano queda también en la rutina, en ese lugar, en cuanto lo agregas.
   3. La sesión se guarda en el orden real: por la hora de la primera serie completada de cada ejercicio.
   (El punto 4, esperar el RIR para deslizar, está en session.js y superset.js.)
   ========================================================================== */

/* ---------- 1. Últimas series del mismo ejercicio y gimnasio ---------- */
function mjFill(d, e) {
  e.mjF = 1;
  const here = lastHere(e.name, d.gymId), g = e.coach && Array.isArray(e.coach.goal) ? e.coach.goal : null;
  const goalOf = j => (g && g.length ? +g[Math.min(j, g.length - 1)] || 0 : 0);
  if (!here) {
    e.prev = []; e.prevN = 0; e.refGym = null; e.lastDate = null;
    /* Lo que trae tu IA y los reemplazos (conversión desde lo que hacías aquí) son una recomendación, no datos de otro gimnasio */
    if (e.ns === 'ia' || e.swappedFrom) { e.log.forEach((s, j) => { if (!s.done && s.r == null && goalOf(j)) s.r = goalOf(j); }); return; }
    e.log.forEach(s => { if (s.done) return; s.w = ''; s.r = null; (s.drops || []).forEach(x => { if (!x.done) x.w = ''; }); });
    const c = e.coach, rx = c && c.rx;
    if (e.sugg) e.sugg = Object.assign({}, e.sugg, { w: 0, up: false, msg: 'Primera vez en este gimnasio: elige tu peso y anótalo.' });
    if (c && c.pg && /^(gym|base)$/.test(c.pg.src)) e.coach = Object.assign({}, c, { w: 0, head: `<b>Primera vez en este gimnasio</b>${rx ? ` · ${rx.rMin}-${rx.rMax} reps` : ''}`, tips: ['Elige tu peso y anótalo; con esta sesión el coach aprende tu nivel aquí.'] });
    return;
  }
  e.log.forEach((s, j) => {
    if (s.done) return;
    const h = here.sets[Math.min(j, here.sets.length - 1)], v = goalOf(j);
    if (v) s.r = v;
    else if (h) { s.r = +h.r || null; if (!e.coach || e.coach.w == null) s.w = +h.w || 0; }
  });
}
function mjPass() {
  const d = state.draft; if (!d || !d.mj || isWatch()) return false;
  let ch = false; d.exercises.forEach(e => { if (!e.mjF) { mjFill(d, e); ch = true; } });
  return ch;
}
const _startSessionMJ = startSession;
startSession = function (planId, dayId) {
  const r = _startSessionMJ.apply(this, arguments), d = state.draft;
  if (d && d.dayId === dayId && !d.mj && !isWatch()) { d.mj = 1; mjPass(); saveDraft(); render(); }
  return r;
};
/* Un ejercicio que entra después (agregado, cambiado por otro): al dibujarlo. Una sesión ya empezada antes no cambia */
const _renderMJ = render;
render = function () { if (mjPass()) saveDraft(); return _renderMJ.apply(this, arguments); };
/* ¿Lleva peso? Peso corporal, bandas y cardio se pueden marcar sin escribir kilos */
function mjNeedsW(name) {
  const x = libFind(name);
  if (typeof pgTypeOf === 'function' && pgTypeOf(name) === 'cardio') return false;
  if (!x) return !(typeof PB_BW !== 'undefined' && PB_BW.test(normName(exClean(name))));
  return !x.bw && !/^(cuerpo|banda)$/.test(equipOf(x));
}
const _markSetMJ = markSet;
markSet = function (i, j, v, k) {
  const d = state.draft, e = d && d.exercises[i], s = e && e.log[j], t = s && (k == null ? s : (s.drops || [])[k]);
  if (d && d.mj && !isWatch() && t && !t.done && v !== false && (t.w === '' || t.w == null) && mjNeedsW(e.name)) {
    toast('Escribe el peso de esta serie.');
    const n = document.getElementById(k == null ? `w-${i}-${j}` : `w-${i}-${j}-${k}`); if (n) n.focus();
    return;
  }
  return _markSetMJ.apply(this, arguments);
};

/* ---------- 2. Ejercicios agregados a mano: también en la rutina ---------- */
/* Se escribe al agregarlo, no al terminar: así no se pierde si cierras la app o terminas antes. El reloj sigue "solo hoy"
   y las rutinas temporales (Entreno rápido, Completar la semana) no guardan nada */
function mjKeep(d, before, at) {
  if (isWatch() || d.planId === 'quick' || d.planId === 'wcfill') return 0;
  const f = findDay(d.planId, d.dayId); if (!f.p || !f.d || f.p.quick) return 0;
  const inPlan = x => f.d.exercises.findIndex(p => (x.exId && p.id === x.exId) || exSame(p.name, x.name));
  let k = -1; for (let i = Math.min(at, before.length - 1); i >= 0 && k < 0; i--) k = inPlan(before[i]);   /* detrás del último que sí está en la rutina */
  let n = 0;
  d.exercises.filter(e => before.indexOf(e) < 0).forEach(e => {
    const was = inPlan(e); if (was >= 0) { k = was; return; }                                              /* ya estaba: no se duplica */
    const pe = newEx(e.name, d.kind); if (e.exId) pe.id = e.exId; else e.exId = pe.id;
    if (+e.target > 0) pe.sets = +e.target;
    f.d.exercises.splice(++k, 0, pe); n++;
  });
  if (n) { d.mjKept = 1; savePlans(); }
  return n;
}
var mjLast = 0;   /* cuántos quedaron en la rutina la última vez (para el aviso) */
const _addToDraftMJ = addToDraft;
addToDraft = function (names, at) {
  const d = state.draft, before = d ? d.exercises.slice() : [];
  const r = _addToDraftMJ.apply(this, arguments);
  mjLast = 0;
  if (d && d.exercises.length > before.length) { mjLast = mjKeep(d, before, at); mjPass(); saveDraft(); }
  return r;
};

/* ---------- 3. Orden real de la sesión ---------- */
/* Por la hora de la primera serie completada; sin hora (sesiones de antes), donde estaban */
function mjOrder(list) {
  const t = e => e.log.reduce((m, s) => (s.done && s.at && s.at < m ? s.at : m), Infinity);
  return list.map((e, i) => ({ e, i, t: t(e) })).sort((a, b) => (a.t === b.t ? a.i - b.i : a.t - b.t)).map(o => o.e);
}
const _finishMJ = finishSession;
finishSession = function () {
  const d = state.draft, keep = d && d.exercises, cur = d && d.cur;
  if (d) d.exercises = mjOrder(keep);
  const r = _finishMJ.apply(this, arguments);
  if (d && state.draft === d) { d.exercises = keep; d.cur = cur; saveDraft(); }   /* no se terminó: todo sigue como estaba */
  return r;
};
/* Exportar a mitad de sesión: el mismo orden, sin tocar la pantalla */
const _exDraftSessionMJ = exDraftSession;
exDraftSession = function () {
  const d = state.draft; if (!d) return _exDraftSessionMJ.apply(this, arguments);
  const keep = d.exercises; d.exercises = mjOrder(keep);
  try { return _exDraftSessionMJ.apply(this, arguments); } finally { d.exercises = keep; }
};
bootRender();
