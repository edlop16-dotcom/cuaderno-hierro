/* ================== Arreglos de la sesión (rama login, 19-nov-2026) ==================
   Solo el teléfono: el reloj no cambia.
   1. Superserie creada durante el entreno ("Superserie con…"): los ejercicios del grupo se ponen seguidos en ese
      momento (antes solo se agrupaban y, si estaban lejos, la fila de arriba los mostraba separados como A1 … A2,
      sin el marco). Lo mismo al "Hacer ahora" un ejercicio de una superserie: su pareja va con él.
   2. Marcar una serie cuyo peso se ve en la casilla pero aún no se había guardado (por ejemplo, escrito y tocado el
      check sin salir del campo): primero se guarda lo que se ve y luego se marca, en vez de pedir "Escribe el peso".
   3. "Anterior" del mismo tipo de día: si cambia el tipo de día de la sesión se vuelve a buscar, y un día cuyo nombre
      dice "Pesado" o "Bombeo" cuenta como ese tipo aunque se haya guardado con el otro. */

/* ---------- 1. Superserie: miembros seguidos ---------- */
/* Pone a los demás miembros del grupo de `anchor` justo después de él, en su orden. Devuelve si movió algo. */
function ssJoinAround(d, anchor) {
  if (!d || !d.ssMap || !anchor || typeof ssOf !== 'function') return false;
  const l = ssOf(d, anchor); if (!l) return false;
  const G = d.exercises.filter(e => e !== anchor && ssOf(d, e) === l); if (!G.length) return false;
  let at = d.exercises.indexOf(anchor), moved = false;
  G.forEach(e => {
    const k = d.exercises.indexOf(e);
    if (k === at + 1) { at++; return; }
    d.exercises.splice(k, 1); at = d.exercises.indexOf(anchor) + (G.indexOf(e) + 1);
    d.exercises.splice(at, 0, e); moved = true;
  });
  return moved;
}
function ssJoinFix(d, anchor) {
  const cur = d.exercises[Math.min(d.cur || 0, d.exercises.length - 1)];
  if (!ssJoinAround(d, anchor)) return false;
  d.cur = Math.max(0, d.exercises.indexOf(cur));
  if (typeof g5Pend === 'function') g5Pend();   // avisos pendientes guardaban posiciones viejas
  saveDraft();
  return true;
}
if (typeof g2SsSet === 'function') {
  const _g2SsSetFx = g2SsSet;
  g2SsSet = function (i, k, keep) {
    const d = state.draft, a = d && d.exercises[i];
    const r = _g2SsSetFx.apply(this, arguments);
    if (d && a && state.draft === d && !isWatch() && ssJoinFix(d, a)) { d.cur = d.exercises.indexOf(a); saveDraft(); render(); }
    return r;
  };
}
const _doNowFx = doNow;
doNow = function (i, k) {
  const at = _doNowFx.apply(this, arguments), d = state.draft;
  if (at == null || !d || isWatch()) return at;
  const x = d.exercises[at];
  if (ssJoinFix(d, x)) { d.cur = d.exercises.indexOf(x); saveDraft(); return d.cur; }
  return at;
};

/* ---------- 2. El peso que se ve cuenta al marcar ---------- */
const _markSetFx = markSet;
markSet = function (i, j, v, k) {
  const d = state.draft, e = d && d.exercises[i], s = e && e.log[j], t = s && (k == null ? s : (s.drops || [])[k]);
  if (t && !t.done && v !== false && (t.w === '' || t.w == null) && !isWatch()) {
    const n = document.getElementById(k == null ? `w-${i}-${j}` : `w-${i}-${j}-${k}`), raw = n && String(n.value || '').replace(',', '.').trim();
    if (raw && isFinite(+raw)) n.dispatchEvent(new Event('input', { bubbles: true }));
  }
  return _markSetFx.apply(this, arguments);
};

/* ---------- 3. "Anterior" del mismo tipo de día ---------- */
const fxNameKind = n => (/\bbombeo\b/i.test(n || '') ? 'bombeo' : /\b(pesado|fuerza)\b/i.test(n || '') ? 'fuerza' : null);
if (typeof msLastKind === 'function') {
  msLastKind = function (name, gymId, kind) {
    let other = null;
    for (const s of state.sessions) {
      if (s.approx || sGym(s) !== gymId) continue;
      const x = exIn(s, name); if (!x || !x.sets.length) continue;
      const k = fxNameKind(s.dayName) || sKind(s);
      if (k === kind) return { date: s.date, sets: x.sets, kind: k, same: true };
      if (!other) other = { date: s.date, sets: x.sets, kind: k, same: false };
    }
    return other;
  };
}
if (typeof msPrevPass === 'function') {
  const _msPrevPassFx = msPrevPass;
  msPrevPass = function () {
    const d = state.draft;
    if (d && d.msP && !isWatch()) d.exercises.forEach(e => { if (e.msPk !== d.kind) { if (e.msPk != null) delete e.msPn; e.msPk = d.kind; } });
    return _msPrevPassFx.apply(this, arguments);
  };
}
bootRender();
