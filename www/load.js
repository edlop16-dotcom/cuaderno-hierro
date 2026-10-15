/* ==========================================================================
   Fase 5 · Peso inicial sugerido (15-oct-2026)
   Antes, una rutina nueva empezaba con 0 kg y el coach decía "elige un peso".
   Ahora se calcula un punto de partida prudente:
   1. 1RM estimado = coeficiente del ejercicio × tu peso corporal (por experiencia).
      Coeficientes propios de Forja: los del nivel Bronce/Plata de level.js y, para
      el resto, valores conservadores para un adulto que empieza.
   2. Mujeres: ×0,72 en pierna y ×0,58 en torso. Edad 50+ y movilidad: más suave.
   3. Peso de trabajo con Epley dejando reps en reserva: 1RM / (1 + (reps + reserva) / 30).
   4. Redondeo a lo que existe: mancuernas y kettlebells reales, discos de 2,5 por lado
      (se anotan solo los discos; la barra va aparte) y pasos de 5 kg en máquinas.
   Manda siempre lo tuyo: historial > peso escrito en la rutina > sugerido.
   ========================================================================== */
/* [implemento, 1RM/peso corporal principiante, con experiencia]  (mancuernas: por mano) */
const SL_COEF = {
  'Remo en Polea Baja': ['cable', 0.45, 0.65], 'Elevaciones Laterales': ['db', 0.09, 0.13], 'Curl Bíceps': ['db', 0.14, 0.2],
  'Tríceps Polea': ['cable', 0.25, 0.38], 'Abducción de Cadera': ['machine', 0.5, 0.8], 'Press Militar (Mancuernas)': ['db', 0.15, 0.22],
  'Face Pull': ['cable', 0.2, 0.3], 'Curl Femoral Tumbado': ['machine', 0.3, 0.45], 'Press Inclinado con Mancuernas': ['db', 0.17, 0.28],
  'Aperturas con Mancuernas': ['db', 0.1, 0.15], 'Cruce de Poleas': ['cable', 0.15, 0.22], 'Pec Deck (Contractora)': ['machine', 0.35, 0.55],
  'Remo con Mancuerna a una Mano': ['db', 0.22, 0.35], 'Pullover en Polea': ['cable', 0.2, 0.3], 'Elevaciones Frontales': ['db', 0.08, 0.12],
  'Pájaros (Deltoide Posterior)': ['db', 0.06, 0.1], 'Encogimientos (Trapecio)': ['db', 0.35, 0.5], 'Press Arnold': ['db', 0.13, 0.2],
  'Curl Predicador (Scott)': ['machine', 0.18, 0.28], 'Curl Concentrado': ['db', 0.1, 0.15], 'Extensión de Tríceps sobre la Cabeza': ['db1', 0.15, 0.22],
  'Tríceps con Cuerda': ['cable', 0.22, 0.33], 'Sentadilla Goblet': ['db1', 0.25, 0.4], 'Sentadilla Búlgara': ['db', 0.12, 0.2],
  'Zancadas': ['db', 0.12, 0.2], 'Elevación de Talones de Pie': ['machine', 0.8, 1.2], 'Elevación de Talones Sentado': ['machine', 0.5, 0.8],
  'Aducción de Cadera': ['machine', 0.45, 0.7], 'Patada de Glúteo en Polea': ['cable', 0.12, 0.2], 'Crunch en Polea': ['cable', 0.4, 0.6],
  'Peso Muerto a una Pierna': ['db1', 0.15, 0.25], 'Swing con Kettlebell': ['kb', 0.22, 0.32], 'Press de Hombro en Máquina': ['machine', 0.3, 0.45],
  'Remo en Máquina': ['machine', 0.45, 0.65], 'Sentadilla en Multipower (Smith)': ['plates', 0.45, 0.8], 'Subida al Cajón': ['db', 0.08, 0.14],
};
/* Implemento de los que tienen estándar en level.js */
const SL_IMPL = { 'Prensa 45°': 'plates', 'Sentadilla Hack': 'plates', 'Remo en T': 'plates', 'Extensión de Pierna': 'machine', 'Curl Femoral Sentado': 'machine',
  'Remo Sentado con Cable': 'cable', 'Jalón al Pecho': 'cable', 'Press de Pecho en Máquina': 'machine', 'Press Banca con Mancuernas': 'db', 'Curl Martillo': 'db' };
const SL_DB_KG = [2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40];
const SL_DB_LB = [5, 8, 10, 12, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90];
const SL_KB_KG = [4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32];

function slInfo(name) {
  if (typeof isBodyweight === 'function' ? isBodyweight(name) : PB_BW.test(normName(name))) return null;
  const c = SL_COEF[name]; if (c) return { impl: c[0], nov: c[1], exp: c[2] };
  const std = typeof lvStd === 'function' && lvStd(name);
  if (!std) return null;
  const impl = BAR_DEFAULT[name] != null ? 'bar' : SL_IMPL[name] || 'machine';
  /* Los estándares de level.js incluyen la barra: principiante ≈ 85 % de Bronce, con experiencia ≈ 90 % de Plata */
  return { impl, nov: std[0] * 0.85, exp: std[1] * 0.9 };
}
/* Perfil para el cálculo: el de la bienvenida o, si no hay, lo que se sabe del cuerpo */
function slProfile() {
  const p = (typeof pbProf === 'function' && pbProf()) || {}, b = typeof body === 'function' ? body() : {};
  const sex = p.sex || b.sex || 'm';
  let kg = typeof curWeight === 'function' ? +curWeight() : 0, est = false;
  if (!(kg > 25)) { kg = +p.kg || 0; }
  if (!(kg > 25)) { kg = sex === 'f' ? 62 : 72; est = true; }
  const exp = p.exp != null ? +p.exp : 2;
  return { sex, kg: Math.max(45, Math.min(115, kg)), est, exp, age: +p.age || +HISTORY.age || 30, goal: p.goal || (typeof goalNow === 'function' ? goalNow() : 'musculo'), parq: (p.parq || []).length > 0 && !p.parqOk };
}
const slNear = (grid, v) => grid.reduce((a, b) => Math.abs(b - v) < Math.abs(a - v) || (Math.abs(b - v) === Math.abs(a - v) && b < a) ? b : a);
const slStep = (v, st, min) => Math.max(min, Math.round(v / st) * st);
/* Peso de trabajo sugerido para un ejercicio de la rutina (en la unidad del usuario). null = sin peso externo o sin datos. */
function startLoad(ex) {
  const inf = slInfo(ex.name); if (!inf) return null;
  const P = slProfile(), legs = ex.type === 'Piernas' || /gluteo|sentadilla|prensa|femoral|talones|cadera|zancada|swing|peso muerto/.test(normName(ex.name));
  let k = P.exp >= 2 ? inf.exp : inf.nov;
  if (P.sex === 'f') k *= legs ? 0.72 : 0.58;
  if (P.age >= 65) k *= 0.7; else if (P.age >= 50) k *= 0.85; else if (P.age < 16) k *= 0.75;
  if (P.goal === 'mayor') k *= 0.8;
  if (P.parq) k *= 0.85;
  const rm = k * P.kg, reps = +ex.repsMax || +ex.repsMin || 10, reserve = P.exp === 0 ? 4 : P.exp === 1 ? 3 : 2;
  let w = rm / (1 + (Math.min(20, reps) + reserve) / 30);
  const lb = typeof pbLb === 'function' && pbLb(), U = lb ? LB : 1;
  let out, bar = 0, onlyBar = false;
  if (inf.impl === 'bar') {
    bar = ex.bar != null ? +ex.bar : BAR_DEFAULT[ex.name] || 20;
    const barKg = lb ? bar / LB : bar;
    out = slStep((w - barKg) * U, lb ? 5 : 5, 0); onlyBar = out === 0;
  } else if (inf.impl === 'db' || inf.impl === 'db1') out = slNear(lb ? SL_DB_LB : SL_DB_KG, w * U);
  else if (inf.impl === 'kb') out = lb ? slStep(w * U, 5, 10) : slNear(SL_KB_KG, w);
  else if (inf.impl === 'plates') out = slStep(w * U, lb ? 10 : 5, 0);
  else out = slStep(w * U, lb ? 10 : 5, lb ? 10 : 5);
  return { w: out, impl: inf.impl, bar, onlyBar, est: P.est, rm: Math.round(rm * U) };
}
const SL_HOW = { db: 'en cada mano', db1: 'una mancuerna con las dos manos', kb: 'kettlebell', bar: 'en discos', plates: 'en discos', machine: 'en la máquina', cable: 'en la polea' };
function startLoadMsg(ex, s) {
  const u = typeof pbLb === 'function' && pbLb() ? 'lb' : 'kg';
  const what = s.onlyBar ? `<b>solo la barra</b> (${fmtKg(s.bar)} ${u})` : `<b>${fmtKg(s.w)} ${u}</b> ${SL_HOW[s.impl] || ''}${s.impl === 'bar' ? ` + barra ${fmtKg(s.bar)}` : ''}`;
  return `Peso inicial sugerido: ${what}. Es un cálculo prudente${s.est ? ' (sin tu peso corporal: regístralo en Perfil → Cuerpo para afinarlo)' : ''}. Si en la 1.ª serie te sobran más de 4 reps, sube; si no llegas al rango, baja.`;
}

/* Rutinas nuevas (bienvenida, plantillas, entreno rápido): llegan con el peso sugerido */
const _pbDayExSl = pbDayEx;
pbDayEx = function (o, key) {
  const out = _pbDayExSl(o, key);
  out.forEach(e => { if (+e.weight) return; const s = startLoad(e); if (s && s.w > 0) { e.weight = s.w; e.startLoad = 1; } });
  return out;
};
/* Primera vez con un ejercicio sin peso en la rutina: la sesión propone el peso inicial */
const _suggestSl = suggest;
suggest = function (gymId, kind, ex) {
  const r = _suggestSl(gymId, kind, ex);
  if (!r || r.ref || r.up) return r;
  const fresh = !lastPerf(ex.name, gymId, kind);
  if (!fresh) return r;
  const s = startLoad(ex);
  if (!s) return r;
  if (+ex.weight && !ex.startLoad) return r;            /* lo escribió el usuario: manda lo suyo */
  return Object.assign({}, r, { w: +ex.weight || s.w, start: 1, msg: startLoadMsg(ex, Object.assign({}, s, { w: +ex.weight || s.w })) });
};
/* Si cambias el peso en Rutinas → Editar, deja de ser "sugerido" y manda lo tuyo
   (se escucha antes que el guardado de index.html) */
document.addEventListener('submit', ev => {
  const f = ev.target; if (!f || f.id !== 'f-ex' || f.dataset.k === '') return;
  const fd = findDay(f.dataset.plan, f.dataset.day), e = fd && fd.d && fd.d.exercises[+f.dataset.k]; if (!e || !e.startLoad) return;
  const v = parseFloat(String(new FormData(f).get('weight')).replace(',', '.'));
  if (isFinite(v) && v !== +e.weight) delete e.startLoad;
}, true);
/* Agregar un ejercicio de la biblioteca a la rutina: propone el peso sugerido en lugar de 10 kg fijos */
const _exSheetSl = exSheet;
exSheet = function (pid, did, k, preset) {
  if (preset && k == null && preset.weight === 10 && preset.name) {
    const s = startLoad({ name: preset.name, type: preset.type, repsMin: preset.repsMin, repsMax: preset.repsMax, bar: preset.bar });
    if (s) preset = Object.assign({}, preset, { weight: s.w });
  }
  return _exSheetSl(pid, did, k, preset);
};
/* El coach de la sesión explica el peso sugerido la primera vez */
const _coachForSl = coachFor;
coachFor = function (ex, gymId, kind) {
  const c = _coachForSl(ex, gymId, kind);
  if (c && c.mode === 'first') { const sg = suggest(gymId, kind, ex); if (sg && sg.start) { c.head = sg.msg; c.w = sg.w; } }
  return c;
};
