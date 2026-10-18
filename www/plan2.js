/* Compatibilidad: la corrección histórica de planes fue retirada; los planes guardados se conservan. */
function planFix2() { return false; }

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
bootRender();
