/* ==========================================================================
   Ajuste de tu rutina Full Body · 3 días (Roka'z), 12-oct-2026
   - Días pesados de verdad: prensa 8-12, hack 8-10, hip thrust 8-12, con más descanso.
   - Isquiotibiales: curl femoral tumbado (lunes y viernes) y sentado (miércoles), sin cargar la lumbar.
   - Viernes: remo en T en lugar de remo con barra (cuida la lumbar).
   - Hombro lateral: elevaciones laterales también lunes y viernes.
   - Abdomen: crunch en polea el miércoles.
   Se aplica una sola vez por cuenta (después de sincronizar, para no pisar otros cambios).
   El coach, además, sube el peso de golpe cuando te sobran muchas reps para el nuevo rango.
   ========================================================================== */
function planFix2() {
  if (state.settings.planFix2 || isWatch()) return false;
  const p = state.plans.find(x => x.name === 'Full Body · 3 días' && (x.gymId || 'rokaz') === 'rokaz'); if (!p) { state.settings.planFix2 = 1; saveLocal(); return false; }
  const find = (d, n) => d.exercises.find(e => e.name === n);
  const mk = (name, type, sets, a, b, rest, weight, extra) => Object.assign({ id: uid(), name, type, sets, repsMin: a, repsMax: b, rest, weight }, extra || {});
  const set = (e, o) => e && Object.assign(e, o);
  const heavy = d => {
    set(find(d, 'Prensa 45°'), { repsMin: 8, repsMax: 12, rest: 150, weight: 190 });
    set(find(d, 'Sentadilla Hack'), { repsMin: 8, repsMax: 10, rest: 150, weight: 65 });
    set(find(d, 'Hip Thrust'), { repsMin: 8, repsMax: 12, rest: 120, weight: 40 });
  };
  const ins = (d, after, ex) => { if (find(d, ex.name)) return; const i = d.exercises.findIndex(e => e.name === after); d.exercises.splice(i < 0 ? d.exercises.length : i + 1, 0, ex); };
  p.days.forEach(d => {
    const k = d.kind || kindOfName(d.name);
    if (k === 'fuerza' && d.weekday === 1) {
      heavy(d);
      ins(d, 'Hip Thrust', mk('Curl Femoral Tumbado', P, 3, 10, 12, 90, 25));
      d.exercises = d.exercises.filter(e => e.name !== 'Face Pull');
      ins(d, 'Remo Sentado con Cable', mk('Elevaciones Laterales', EM, 3, 12, 15, 60, 8));
    } else if (k === 'fuerza') {
      heavy(d);
      const rb = d.exercises.findIndex(e => e.name === 'Remo con Barra');   // remo inclinado carga la lumbar: remo en T con apoyo
      if (rb >= 0 && !find(d, 'Remo en T')) d.exercises.splice(rb, 1, mk('Remo en T', TR, 3, 8, 10, 120, 30));
      ins(d, 'Curl Femoral Tumbado', mk('Elevaciones Laterales', EM, 3, 12, 15, 60, 8));
    } else if (k === 'bombeo') {
      const pr = d.exercises.findIndex(e => e.name === 'Prensa 45°');
      if (pr >= 0 && !find(d, 'Curl Femoral Sentado')) d.exercises.splice(pr, 1, mk('Curl Femoral Sentado', P, 3, 12, 15, 60, 40));   // isquios sin cargar la lumbar
      const el = find(d, 'Elevaciones Laterales'); if (el) set(el, { repsMin: 15, repsMax: 20 });
      if (!find(d, 'Crunch en Polea')) d.exercises.push(mk('Crunch en Polea', 'Core', 2, 12, 15, 60, 15));
    }
  });
  state.settings.planFix2 = 1; savePlans();
  return true;
}
/* Aplicar después de sincronizar (o ya, si no hay cuenta) */
if (typeof sync !== 'undefined') {
  const _runP2 = sync.run.bind(sync);
  sync.run = async function () { await _runP2(); if (this.status === 'ok' && planFix2()) { render(); toast('Tu rutina se ajustó: días pesados de verdad, más isquios y hombro lateral'); } };
  if (!sync.on() && planFix2()) render();
} else if (planFix2()) render();

/* Coach: si te sobran muchas reps para el rango nuevo, sube el peso de una vez (calculado con tu 1RM) */
const _coachP2 = coachFor;
coachFor = function (ex, gymId, kind) {
  const c = _coachP2(ex, gymId, kind);
  if (!c || !c.last || !['up', 'hold'].includes(c.mode)) return c;
  const reps = c.last.reps || [], avg = reps.reduce((a, r) => a + (r || 0), 0) / Math.max(1, reps.length);
  if (avg < ex.repsMax + 4) return c;
  const bar = ex.bar || 0, top = c.last.w, est = e1rm(top + bar, Math.min(20, avg));
  const inc = increment(ex, top), target = Math.min(top * 1.25, est / (1 + ex.repsMax / 30) - bar);
  const w = Math.max(top + inc, Math.floor(target / inc) * inc);
  if (w <= c.w) return c;
  c.w = w; c.mode = 'up'; c.goal = Array(ex.sets).fill(ex.repsMin);
  c.head = `<b>Sube a ${fmtKg(w)} kg</b> y busca ${ex.repsMin}-${ex.repsMax} reps.`;
  c.tips.unshift(`La última vez hiciste ${Math.round(avg)} reps con ${fmtKg(top)} kg: para el rango de ${ex.repsMin}-${ex.repsMax} ese peso te queda liviano. Calculé ${fmtKg(w)} kg con tu 1RM estimado; si la 1ª serie se siente muy pesada, baja 5-10 %.`);
  return c;
};
render();
