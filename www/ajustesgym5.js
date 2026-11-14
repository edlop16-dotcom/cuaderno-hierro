/* ==========================================================================
   Ajustes del gimnasio 5 (rama ajustes-gym-5, 13-nov-2026)
   1. Quitar un ejercicio durante el entreno: solo de hoy o también de la rutina; aviso si ya tiene series hechas;
      si era de una superserie, el otro queda como ejercicio normal.
   2. Separar una superserie durante el entreno: solo hoy o también en la rutina; cada uno vuelve a su descanso.
   3. Rangos y descansos por tipo de ejercicio (grandes de pierna, grandes de torso, hip thrust, aislamiento,
      pantorrillas y laterales) y el aviso de descansos comparado con lo recomendado para los ejercicios de la sesión.
   4. Pesos que existen en cada gimnasio (`settings.gymW[gymId]` = { db: [mancuernas, cada una], mach: salto de las
      máquinas y poleas }): toda recomendación usa solo esos pesos. Si el peso ideal no existe, se mantiene el peso y
      se piden más reps hasta el tope del rango en todas las series; recién entonces se sube al siguiente peso.
   5. Reloj: quitar, separar y "Unir con el siguiente" en "⋯ Más", con la misma pregunta y confirmación al borrar.
   ========================================================================== */

/* Íconos nuevos (Lucide, como el resto) */
if (typeof ICONS !== 'undefined') {
  ICONS.scissors = ICONS.scissors || '<circle cx="6" cy="6" r="3"/><path d="M8.12 8.12 12 12"/><path d="M20 4 8.12 15.88"/><circle cx="6" cy="18" r="3"/><path d="M14.8 14.8 20 20"/>';
  ICONS['alert-triangle'] = ICONS['alert-triangle'] || '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>';
}

/* ---------- 3. Rangos y descansos por grupo de ejercicio ---------- */
/* [reps pesado], [reps bombeo]; descanso [mín, máx] s en pesado y en bombeo */
const G5_GR = {
  piernaG: { f: [6, 8], b: [10, 12], rf: [120, 180], rb: [90, 90] },
  torsoG: { f: [6, 10], b: [10, 12], rf: [120, 180], rb: [90, 90] },
  hip: { f: [8, 10], b: [12, 15], rf: [120, 180], rb: [90, 90] },
  aisl: { f: [8, 12], b: [12, 15], rf: [90, 90], rb: [60, 60] },
  peq: { f: [10, 15], b: [15, 20], rf: [60, 60], rb: [45, 60] },
};
const G5_GR_NAME = { piernaG: 'Grandes de pierna', torsoG: 'Grandes de torso', hip: 'Hip thrust', aisl: 'Aislamiento', peq: 'Pantorrillas y laterales' };
function g5Group(name) {
  const t = pgTypeOf(name); if (t === 'cardio') return null;
  const x = libFind(name), pat = (x && x.pat) || '', n = normName(exClean(name)), m = pgMain(name);
  if (t === 'comp') return PG_LEGS.indexOf(m) >= 0 ? 'piernaG' : 'torsoG';
  if (/hip thrust/.test(n) || (t === 'glu' && pat === 'hipext')) return 'hip';
  if (pat === 'calf' || pat === 'lat' || m === 'pant' || (!pat && /elevacion(es)? lateral|talon|gemelo|pantorr/.test(n))) return 'peq';
  return 'aisl';
}
const _pgRxG5 = pgRx;
pgRx = function (name, kind, pe) {
  const rx = _pgRxG5.apply(this, arguments), k = rx.t === 'cardio' ? null : g5Group(name); if (!k) return rx;
  const G = G5_GR[k], b = rx.kind === 'bombeo', g = rx.g, o = Object.assign({}, rx, { g5: k });
  /* Los rangos son los de Ganar músculo (y Perder grasa, que usa los mismos); los demás objetivos conservan los suyos.
     Peso corporal con rango propio del catálogo, explosivos y el entreno para completar (fillRx) tampoco cambian */
  if ((g === 'hiper' || g === 'grasa') && !rx.expl && !(rx.bw && pgBwRange(name)) && !(pe && pe.fillRx)) { const r = b ? G.b : G.f; o.rMin = r[0]; o.rMax = r[1]; }
  /* Descansos: para todos, salvo los compuestos del día pesado con el objetivo Ganar fuerza (180-300 s) */
  if (!(g === 'fuerza' && rx.t === 'comp' && !b)) {
    const R = b ? G.rb : G.rf; o.restMin = R[0]; o.restMax = R[1];
    o.rest = b || g === 'grasa' ? R[0] : Math.round((R[0] + R[1]) / 2 / 15) * 15;
    if (pe && +pe.pgRest && (rx.t === 'aisl' || rx.t === 'peq')) o.rest = Math.max(R[0], +pe.pgRest);   /* "Ajustar a mi tiempo" */
  }
  return o;
};
/* Entreno para completar: con Ganar músculo / Perder grasa, los mismos rangos (Fuerza = pesado, Bombeo = bombeo) */
const _g2FillRxG5 = g2FillRx;
g2FillRx = function (name, kind) {
  const r = _g2FillRxG5.apply(this, arguments), g = pgGoal(), k = g5Group(name);
  if (!k || (g !== 'hiper' && g !== 'grasa')) return r;
  const R = kind === 'fuerza' ? G5_GR[k].f : G5_GR[k].b; return Object.assign({}, r, { rMin: R[0], rMax: R[1] });
};
/* Descansos reales frente a lo recomendado PARA ESOS EJERCICIOS (el del ejercicio de la serie anterior, por su tipo y el
   día); el paso de un ejercicio a su pareja de superserie no es un descanso y no cuenta */
pgRests = function (d) {
  const L = []; d.exercises.forEach(e => e.log.forEach((s, j) => { if (s.done && s.at) L.push({ at: s.at, e, j }); }));
  L.sort((a, b) => a.at - b.at);
  const sug = (d.ssSug || []).concat(d.ssT && d.ssT.length === 2 ? [d.ssT] : []), pair = (a, b) => a !== b && ((typeof ssOf === 'function' && ssOf(d, a) && ssOf(d, a) === ssOf(d, b)) || sug.some(p => Array.isArray(p) && p.indexOf(a.name) >= 0 && p.indexOf(b.name) >= 0));
  const out = [];
  for (let i = 1; i < L.length; i++) {
    if (pair(L[i - 1].e, L[i].e) && L[i].j <= L[i - 1].j) continue;   /* misma vuelta: el paso a la pareja */
    const gap = (L[i].at - L[i - 1].at) / 1000 - PG_RX[pgTypeOf(L[i].e.name)].dur, pe = L[i - 1].e;
    if (gap > 0 && gap < 900) out.push({ real: gap, rec: +pe.rest || pgRx(pe.name, d.kind).rest });
  }
  return out;
};
/* Entreno para completar: los botones Fuerza / Bombeo dicen estos rangos */
const g5RangeTxt = kind => { const k = kind === 'fuerza' ? 'f' : 'b', G = G5_GR; return kind === 'fuerza' ? `pierna ${G.piernaG.f.join('-')}, torso ${G.torsoG.f.join('-')}, aislados ${G.aisl.f.join('-')}` : `grandes ${G.torsoG.b.join('-')}, aislados ${G.aisl.b.join('-')}`; };
const _wcFillSheetG5 = wcFillSheet;
wcFillSheet = function () {
  const r = _wcFillSheetG5.apply(this, arguments), g = pgGoal(); if (isWatch() || (g !== 'hiper' && g !== 'grasa')) return r;
  document.querySelectorAll('#sheet .wc-sheet [data-wc="kind"]').forEach(b => { b.textContent = (b.dataset.v === 'fuerza' ? 'Fuerza · ' : 'Bombeo · ') + g5RangeTxt(b.dataset.v) + ' reps'; });
  return r;
};
/* Exportaciones: el sistema del coach con estos rangos y descansos */
const _pgSystemTxtG5 = pgSystemTxt;
pgSystemTxt = function () {
  let t = _pgSystemTxtG5.apply(this, arguments); const g = pgGoal(), sec = s => (s % 60 ? (s >= 60 ? Math.floor(s / 60) + ' min ' + s % 60 + ' s' : s + ' s') : s / 60 + ' min');
  const rest = R => (R[0] === R[1] ? sec(R[0]) : sec(R[0]) + '-' + sec(R[1]));
  const rows = Object.keys(G5_GR).map(k => { const G = G5_GR[k]; return `- ${G5_GR_NAME[k]}: ${g === 'hiper' || g === 'grasa' ? `pesado ${G.f[0]}-${G.f[1]} reps, bombeo ${G.b[0]}-${G.b[1]}; ` : ''}descanso pesado ${rest(G.rf)}, bombeo ${rest(G.rb)}`; }).join('\n');
  t = t.split('\n').filter(l => !/^- (Compuesto|Aislamiento|Glúteo y cadera|Pequeño): /.test(l)).join('\n');
  const at = t.indexOf('\n- Peso corporal y bandas');
  t = at >= 0 ? t.slice(0, at) + '\n' + rows + t.slice(at) : t + '\n' + rows;
  return t + '\n- Pesos que existen en cada gimnasio: en mancuernas el peso es SIEMPRE el de cada mancuerna. Si el peso ideal no existe en ese gimnasio, mantener el peso y buscar el tope del rango en todas las series; recién entonces subir al siguiente peso disponible, aunque las reps bajen al inicio del rango.';
};

/* ---------- 4. Pesos que existen en cada gimnasio ---------- */
const G5 = { gym: null, off: 0 };
const g5Cfg = gid => ((state.settings.gymW || {})[gid]) || null;
const g5Gym = () => G5.gym || (state.draft && state.draft.gymId) || (activeGym() || {}).id;
const g5Fam = name => pgFam(name) || (/mancuerna/.test(normName(String(name || ''))) ? 'manc' : '');
/* Lista ordenada de pesos posibles para ese ejercicio en ese gimnasio; null = sin límite (la app no sabe qué hay) */
function g5List(name, gid) {
  if (G5.off || state.settings.unit === 'lb') return null;
  const C = g5Cfg(gid || g5Gym()); if (!C) return null;
  const f = g5Fam(name);
  if (f === 'manc' && C.db && C.db.length) return C.db;
  if ((f === 'maq' || f === 'polea') && +C.mach > 0) { const s = +C.mach, L = []; for (let v = s; v <= 500 + 1e-6; v += s) L.push(Math.round(v * 100) / 100); return L; }
  return null;
}
const g5Down = (L, w) => { let r = null; for (let i = 0; i < L.length; i++) if (L[i] <= w + 1e-6) r = L[i]; return r; };
const g5Up = (L, w) => { for (let i = 0; i < L.length; i++) if (L[i] > w + 1e-6) return L[i]; return null; };
/* Al peso posible: down = hacia abajo, salvo que eso baje más de un 15 % (entonces el más cercano) */
function g5Snap(L, w, down) {
  if (!(w > 0)) return 0;
  const lo = g5Down(L, w), hi = lo != null && Math.abs(lo - w) < 1e-6 ? lo : g5Up(L, w);
  if (lo == null) return hi; if (hi == null) return lo;
  if (down && lo >= w * 0.85 - 1e-6) return lo;
  return hi - w < w - lo - 1e-6 ? hi : lo;
}
const g5Has = (L, w) => L.some(v => Math.abs(v - w) < 1e-6);
const _pgIncG5 = pgInc;
pgInc = function (name, w) {
  const L = g5List(name); if (!L) return _pgIncG5.apply(this, arguments);
  const lo = g5Down(L, w - 1e-3), hi = g5Up(L, w);
  return lo != null && w - lo > 1e-6 ? w - lo : hi != null ? hi - w : _pgIncG5.apply(this, arguments);
};
const _pgStepG5 = pgStep;
pgStep = function (name, w) { const L = g5List(name), hi = L && g5Up(L, w); return hi != null && L ? hi - w : _pgStepG5.apply(this, arguments); };
const _pgRoundG5 = pgRound;
pgRound = function (name, w, down) { const L = g5List(name); return L ? g5Snap(L, w, down) : _pgRoundG5.apply(this, arguments); };
const _pgNextUpG5 = pgNextUp;
pgNextUp = function (name, w) { const L = g5List(name), hi = L && g5Up(L, w); return hi != null && L ? hi : _pgNextUpG5.apply(this, arguments); };
/* Las mancuernas más pesadas del gimnasio son un peso máximo (más reps, bajada lenta, pausa…) */
const _pgMaxOfG5 = pgMaxOf;
pgMaxOf = function (name, gymId) {
  const c = _pgMaxOfG5.apply(this, arguments), L = g5Fam(name) === 'manc' ? g5List(name, gymId) : null; if (!L) return c;
  const top = L[L.length - 1]; return c > 0 ? Math.min(c, top) : top;
};
/* Lo que justifica una subida: +5 % de la carga (tren superior) o +10 % (piernas), o el peso que da tu 1RM estimado
   para el tope del rango. Si el siguiente peso posible pasa de ahí, el peso ideal no existe en ese gimnasio */
function g5Allowed(name, s, rx) {
  const w = +s.w || 0, legs = PG_LEGS.indexOf(pgMain(name)) >= 0, tot = w + barFor(name);
  return Math.max(w + tot * (legs ? 0.10 : 0.05), pgWFor(name, pgE1(name, s), rx.rMax, rx.rirMax));
}
const g5Reps = h => h.sets.filter(s => +s.r > 0).map(s => s.r).join(', ');
const _pgCoachG5 = pgCoach;
pgCoach = function (ex, gymId, kind) {
  const prev = G5.gym; G5.gym = gymId;
  try {
    const c = _pgCoachG5.apply(this, arguments), L = g5List(ex.name, gymId);
    if (!L || c.bw || !c.rx || c.rx.t === 'cardio') return c;
    return g5Fix(ex, gymId, kind, c, L);
  } finally { G5.gym = prev; }
};
function g5Fix(ex, gymId, kind, c, L) {
  const name = ex.name, rx = c.rx, H = exHistory(name, gymId, kind, 12).filter(h => h.kind === kind), Lh = H[0];
  const s1 = Lh ? pgFirst(Lh) : null, top = s1 ? +s1.w || 0 : 0, r1 = s1 ? +s1.r || 0 : 0;
  const db = g5Fam(name) === 'manc', explicitCap = _pgMaxOfG5(name, gymId) > 0;
  if (c.mode === 'cap' && db && !explicitCap) c.why = c.why.replace(/^Peso máximo \(([^)]+)\): no subo más\./, 'Las mancuernas más pesadas aquí son de $1: no subo más.').replace(/^Llegas a tu peso máximo \(([^)]+)\)/, 'Llegas a las mancuernas más pesadas de aquí ($1)');
  if (c.mode === 'cap') return c;
  if (Lh && top > 0 && (c.mode === 'up' || c.mode === 'hold') && r1 >= rx.rMax) {
    const next = g5Up(L, top);
    if (next != null && next > g5Allowed(name, s1, rx) + 1e-6) {   /* el peso ideal no existe aquí */
      const all = Lh.sets.filter(s => +s.r > 0).every(s => +s.r >= rx.rMax);   /* todas las series, también las de superserie */
      if (!all) {
        c.w = top; c.mode = 'hold'; c.g5 = 'keep'; c.goal = c.goal.map(() => rx.rMax);
        c.why = `Sigue con ${fmtKg(top)} kg y busca ${rx.rMax} en todas las series (la última vez ${g5Reps(Lh)}). Aquí no hay un peso entre ${fmtKg(top)} y ${fmtKg(next)} kg: cuando lo logres, sube a ${fmtKg(next)} kg aunque las reps bajen a ${rx.rMin}.`;
        return c;
      }
      if (c.mode === 'up') {
        c.w = next; c.g5 = 'jump'; c.goal = c.goal.map(() => rx.rMin);
        c.why = `Completaste ${rx.rMax} reps en todas las series con ${fmtKg(top)} kg (${g5Reps(Lh)}): sube a ${fmtKg(next)} kg, el siguiente peso que hay aquí, y empieza con ${rx.rMin} reps.`;
        return c;
      }
    } else if (c.mode === 'up' && next != null && c.w > next + 1e-6) {
      const lim = g5Down(L, g5Allowed(name, s1, rx)); c.w = Math.max(next, Math.min(c.w, lim || next));
    }
  }
  /* Bajar sin un peso un poco menor: se mantiene el peso y se buscan las reps del mínimo en todas las series */
  if (Lh && top > 0 && (c.mode === 'down' || c.mode === 'back') && c.w >= top - 1e-6 && g5Has(L, top)) {
    const lo = g5Down(L, top - 1e-3), dl = typeof pgDlNow === 'function' && pgDlNow(), back = c.mode === 'back';
    c.w = top; c.g5 = 'keep'; c.goal = c.goal.map(() => rx.rMin);
    c.why = dl ? `Semana de descarga: la mitad de series con ${fmtKg(top)} kg (aquí no hay un peso un 10 % menor) y RIR 3.`
      : back ? `Hace tiempo que no lo haces aquí: retoma con ${fmtKg(top)} kg y busca ${rx.rMin} reps, sin forzar (aquí no hay un peso un poco menor${lo ? '; el siguiente es ' + fmtKg(lo) + ' kg' : ''}).`
      : `Sigue con ${fmtKg(top)} kg y busca ${rx.rMin} en todas las series: aquí no hay un peso un poco menor${lo ? ' (el siguiente es ' + fmtKg(lo) + ' kg, demasiado bajo)' : ''}.`;
    if (!back && !dl) c.mode = 'hold';
    return c;
  }
  /* Cualquier otro peso que no exista aquí (primera vez, conversiones): al posible, y el texto lo dice */
  if (c.w > 0 && !g5Has(L, c.w) && !(Lh && Math.abs(c.w - top) < 1e-6)) {
    const old = c.w, nw = g5Snap(L, old, true);
    if (nw > 0 && Math.abs(nw - old) > 1e-6) { c.w = nw; c.why = String(c.why || '').split(fmtKg(old) + ' kg').join(fmtKg(nw) + ' kg'); }
  }
  return c;
}
/* Indicación serie por serie: "sube" solo si el siguiente peso no es un salto mayor que el ideal; al terminar el
   ejercicio, si toca seguir con el mismo peso, lo dice como el coach */
const _agTipG5 = agTip;
agTip = function (d, i) {
  const t = _agTipG5.apply(this, arguments), e = d && d.exercises[i]; if (!t || !e) return t;
  const L = g5List(e.name, d.gymId); if (!L) return t;
  if (t.k === 'up' && t.W) {
    const done = e.log.filter(s => s.done), s = done[done.length - 1], rx = agRxOf(d, e);
    if (s && t.W > g5Allowed(e.name, s, rx) + 1e-6) return { t: `Hiciste ${s.r}${s.rir != null ? ' con RIR ' + s.rir : ''}: sigue con ${agKg(+s.w || 0)} y suma reps hasta ${rx.rMax} en todas las series; aquí no hay un peso entre ${fmtKg(+s.w || 0)} y ${agKg(t.W)}`, k: 'ok' };
  }
  if (t.k === 'end') {
    try { const S = agLive(d), x = S && S.exercises.find(y => y.name === e.name); if (x) { const c = agAfter(S, agPe(S, x)); if (c && c.g5) return { t: 'Ejercicio terminado: ' + c.why.charAt(0).toLowerCase() + c.why.slice(1), k: 'end' }; } } catch (er) {}
  }
  return t;
};
/* Entreno para completar: la misma regla al subir */
const _g2LoadG5 = g2Load;
g2Load = function (name, rx, where, kind) {
  const g = activeGym().id, prev = G5.gym; G5.gym = g;
  try {
    const r = _g2LoadG5.apply(this, arguments), L = g5List(name, g); if (!L || !r || !(r.w > 0)) return r;
    const k = kind === 'fuerza' ? 'fuerza' : 'bombeo', Lh = g2KHist(name, g, k).find(h => h.kind === k); if (!Lh) return r;
    const S = Lh.sets.filter(x => +x.r > 0), end = S[S.length - 1]; if (!end) return r;
    const wEnd = +end.w || 0, atEnd = S.filter(x => Math.abs((+x.w || 0) - wEnd) < 0.01), f = atEnd[0] || end;
    if (r.w > wEnd + 1e-6 && r.w > g5Allowed(name, f, rx) + 1e-6 && !atEnd.every(x => +x.r >= rx.rMax))
      return Object.assign({}, r, { w: wEnd, reps: rx.rMax, note: `sigue con ${fmtKg(wEnd)} kg y busca ${rx.rMax} en todas las series; aquí no hay un peso entre ${fmtKg(wEnd)} y ${fmtKg(r.w)} kg` });
    return r;
  } finally { G5.gym = prev; }
};
/* Próxima sesión (Coach): con "cansado" o la descarga del bloque, el −10 % puede no existir */
const _nsCoachExG5 = nsCoachEx;
nsCoachEx = function (ex, gymId, kind, ctx) {
  const prev = G5.gym; G5.gym = gymId;
  try {
    const r = _nsCoachExG5.apply(this, arguments), L = g5List(ex.name, gymId); if (!L || !r || !r.sets) return r;
    r.sets.forEach(s => { if (+s.w > 0 && !g5Has(L, +s.w)) s.w = g5Snap(L, +s.w, true); });
    const c = pgCoach(ex, gymId, kind), w0 = r.sets[0] && +r.sets[0].w;
    if (/−10 %/.test(r.why) && c.last && w0 >= +c.last.w - 1e-6) r.why = r.why.replace(/ \(−10 %\)/g, ' (aquí no hay un peso un 10 % menor)').replace(/ y −10 %/g, '; aquí no hay un peso un 10 % menor');
    return r;
  } finally { G5.gym = prev; }
};
/* Reemplazos y primeras veces: al peso posible en ese gimnasio */
const g5SnapRes = (name, o) => { const L = o && +o.w > 0 && g5List(name); if (L) o.w = g5Snap(L, +o.w, true); return o; };
const _convertWG5 = convertW;
convertW = function (from, to, w) { return g5SnapRes(to, _convertWG5.apply(this, arguments)); };
const _altConvertG5 = altConvert;
altConvert = function (from, to, w) { return g5SnapRes(to, _altConvertG5.apply(this, arguments)); };
const _startLoadG5 = startLoad;
startLoad = function (ex) { const r = _startLoadG5.apply(this, arguments); return r && ex ? g5SnapRes(ex.name, r) : r; };
/* Calentamiento con mancuernas o máquinas: solo pesos que hay */
const _warmupForG5 = warmupFor;
warmupFor = function (e, i, d) {
  const W = _warmupForG5.apply(this, arguments), L = W && e && g5List(e.name, d && d.gymId); if (!L) return W;
  const seen = {};
  W.sets = W.sets.map(s => (s.bar ? s : Object.assign({}, s, { w: g5Snap(L, s.w, true) }))).filter(s => { if (s.bar) return true; if (!(s.w > 0) || s.w >= W.w - 1e-6 || seen[s.w]) return false; seen[s.w] = 1; return true; });
  return W;
};

/* Pesos de cada gimnasio: valores iniciales del dueño (una vez). La casa: mancuernas de 2,5 y 7,5; los demás:
   mancuernas de 5, 7,5, 10 y 12 y máquinas de 5 en 5. Se editan en "¿Dónde entrenas hoy?" → Pesos que hay */
(function g5Seed() {
  try {
    const S = state.settings; if (!S.owner || S.g5Seed || S.unit === 'lb') return;
    const all = Object.assign({}, S.gymW || {});
    state.gyms.forEach(g => { if (all[g.id]) return; all[g.id] = /casa|home/i.test(g.name || '') ? { db: [2.5, 7.5] } : { db: [5, 7.5, 10, 12], mach: 5 }; });
    S.gymW = all; S.g5Seed = 1; savePlans();
  } catch (e) {}
})();
const g5Num = v => String(v).replace('.', ',');
/* "5; 7,5; 10 12" → [5, 7.5, 10, 12]: punto y coma, espacios, "/" o coma seguida de espacio separan; la coma sola es decimal */
function g5Parse(t) {
  const out = []; String(t || '').split(/[;\/\s]+|,\s+/).forEach(p => { const v = parseFloat(p.replace(',', '.')); if (v > 0 && v <= 200 && !out.some(x => Math.abs(x - v) < 1e-6)) out.push(Math.round(v * 100) / 100); });
  return out.sort((a, b) => a - b);
}
function g5GymSheet(gid) {
  const C = g5Cfg(gid) || {}, lb = state.settings.unit === 'lb';
  openSheet(`<div class="row"><h2 class="grow">Pesos que hay en ${esc(gymName(gid))}</h2><button class="icon-btn" data-act="sheet-close" aria-label="Cerrar">${ic('x', 18)}</button></div>
    <div class="muted" style="font-size:13px">El coach, "Repetir este entreno", el entreno para completar y los reemplazos solo te sugieren estos pesos. Si el peso ideal no existe, sigues con el tuyo y buscas el tope de reps en todas las series antes de subir.</div>
    ${lb ? '<div class="muted g5-lb">Estas listas van en kg: con las pesas en lb, la app no las usa.</div>' : ''}
    <label class="label" for="g5-db">Mancuernas (kg, cada una)</label>
    <input id="g5-db" class="g5-in" inputmode="decimal" autocomplete="off" value="${esc((C.db || []).map(g5Num).join('; '))}" placeholder="Ej. 5; 7,5; 10; 12">
    <div class="muted" style="font-size:12px">Sepáralas con punto y coma. Vacío: la app no limita las mancuernas aquí.</div>
    <label class="label" for="g5-mach">Máquinas y poleas: de cuánto en cuánto (kg)</label>
    <input id="g5-mach" class="g5-in" inputmode="decimal" autocomplete="off" value="${+C.mach > 0 ? g5Num(C.mach) : ''}" placeholder="Ej. 5">
    <div class="muted" style="font-size:12px">Vacío: la app usa los saltos de siempre.</div>
    <div class="g5-err" role="alert"></div>
    <button type="button" class="btn primary block" data-g5="gw-save" data-gym="${esc(gid)}">Guardar</button>`);
}
function g5GymSave(gid) {
  const a = document.getElementById('g5-db'), b = document.getElementById('g5-mach'); if (!a || !b) return;
  const db = g5Parse(a.value), m = parseFloat(String(b.value).replace(',', '.')), err = document.querySelector('#sheet .g5-err');
  if (String(b.value).trim() && !(m > 0 && m <= 50)) { if (err) err.textContent = 'El salto de las máquinas debe ser un número entre 0,5 y 50 kg.'; return; }
  if (String(a.value).trim() && !db.length) { if (err) err.textContent = 'No entendí los pesos de las mancuernas. Escríbelos así: 5; 7,5; 10.'; return; }
  const all = Object.assign({}, state.settings.gymW || {}), o = {};
  if (db.length) o.db = db; if (m > 0) o.mach = Math.round(m * 100) / 100;
  if (o.db || o.mach) all[gid] = o; else delete all[gid];
  state.settings.gymW = all; savePlans(); closeSheet(); render();
  toast(`${gymName(gid)}: ${o.db ? 'mancuernas ' + o.db.map(g5Num).join(', ') + ' kg' : 'mancuernas sin límite'}${o.mach ? ' · máquinas de ' + g5Num(o.mach) + ' en ' + g5Num(o.mach) + ' kg' : ''}.`);
}
/* Botón en "¿Dónde entrenas hoy?", junto a "Equipo que no hay" */
function g5GymDecorate() {
  const sc = document.querySelector('#sheet .sheet-card'); if (!sc || !sc.querySelector('[data-act="gym-set"]') || sc.querySelector('.g5-gw')) return;
  const g = activeGym(), C = g5Cfg(g.id), n = C ? (C.db ? C.db.length : 0) : 0;
  const html = `<button class="btn block g5-gw" data-g5="gw" data-gym="${esc(g.id)}">${ic('dumbbell', 16)} Pesos que hay en ${esc(g.name)}${n ? ` (${n} mancuernas${C.mach ? ', máquinas de ' + g5Num(C.mach) + ' en ' + g5Num(C.mach) : ''})` : C && C.mach ? ` (máquinas de ${g5Num(C.mach)} en ${g5Num(C.mach)})` : ''}</button>`;
  const at = sc.querySelector('.alt-gym') || sc.querySelector('[data-act="gym-new"]');
  if (at) at.insertAdjacentHTML(at.classList.contains('alt-gym') ? 'afterend' : 'beforebegin', html); else sc.insertAdjacentHTML('beforeend', html);
}
document.addEventListener('click', ev => { const b = ev.target.closest && ev.target.closest('[data-act="gym-pick"]'); if (b && !isWatch()) setTimeout(g5GymDecorate, 0); }, true);

/* ---------- 1, 2 y 5. Quitar, separar y unir durante el entreno ---------- */
/* La rutina de la sesión, si es una de verdad (no la temporal de entreno rápido, completar o repetir) */
function g5Plan(d) {
  if (!d || ['quick', 'wcfill', 'rep'].indexOf(d.planId) >= 0) return null;
  const f = findDay(d.planId, d.dayId); return f && f.p && f.d && !f.p.quick ? f : null;
}
const g5PIdx = (f, e) => f.d.exercises.findIndex(p => (e.exId && p.id === e.exId) || exSame(p.name, e.name));
const g5InPlan = (d, e) => { const f = g5Plan(d); return !!(f && e && g5PIdx(f, e) >= 0); };
/* Que vuelva a tener su propio descanso */
function g5RestBack(d, e) { if (e && !(+e.rest > 0)) e.rest = pgRx(e.name, d.kind).rest; }
function g5Pend() { try { if (typeof ssPend !== 'undefined') ssPend = null; } catch (x) {} try { if (typeof g2Pend !== 'undefined') g2Pend = null; } catch (x) {} }
/* Quita el ejercicio i de la sesión (y de la rutina si plan); devuelve { ok, inPlan, other } */
function g5Remove(i, plan) {
  const d = state.draft, e = d && d.exercises[i]; if (!e || d.exercises.length < 2) return { ok: false };
  let inPlan = false;
  if (plan) {
    const f = g5Plan(d), k = f ? g5PIdx(f, e) : -1;
    if (k >= 0) { const L = f.d.exercises, p = L[k]; if (k > 0 && L[k - 1].ss && !p.ss) L[k - 1].ss = 0; L.splice(k, 1); inPlan = true; savePlans(); }
  }
  const m = typeof ssMembers === 'function' ? ssMembers(d, i) : null; let other = null;
  if (d.ssMap && e.exId) delete d.ssMap[e.exId];
  if (m && m.length === 2) { const o = d.exercises[m[0] === i ? m[1] : m[0]]; if (o) { other = o.name; if (o.exId && d.ssMap) delete d.ssMap[o.exId]; g5RestBack(d, o); } }
  g5Pend();
  d.exercises.splice(i, 1);
  const c = d.cur || 0; d.cur = Math.max(0, Math.min(i < c ? c - 1 : c, d.exercises.length - 1));
  if (d.agGo != null) { if (d.agGo === i) delete d.agGo; else if (d.agGo > i) d.agGo--; }
  if (state.pgRegEd != null) state.pgRegEd = null;
  if (state.rest && state.rest.ex != null) { if (state.rest.ex === i) state.rest.ex = null; else if (state.rest.ex > i) state.rest.ex--; }   /* el descanso en marcha sigue apuntando al ejercicio correcto */
  if (typeof pgDraftEst === 'function') d.estSec = pgDraftEst(d);
  d.lastAct = Date.now(); saveDraft();
  return { ok: true, inPlan, other, name: e.name };
}
/* Separa la superserie del ejercicio i (todos sus miembros) */
function g5Split(i, plan) {
  const d = state.draft, m = d && typeof ssMembers === 'function' ? ssMembers(d, i) : null; if (!m) return { ok: false };
  const names = m.map(k => d.exercises[k].name);
  m.forEach(k => { const x = d.exercises[k]; if (x && x.exId && d.ssMap) delete d.ssMap[x.exId]; g5RestBack(d, x); });
  let inPlan = false;
  if (plan) { const f = g5Plan(d); if (f) { m.forEach(k => { const x = d.exercises[k], j = g5PIdx(f, x), p = j >= 0 ? f.d.exercises[j] : null; if (p && p.ss) { p.ss = 0; inPlan = true; } }); const j0 = g5PIdx(f, d.exercises[m[0]]); if (j0 > 0 && f.d.exercises[j0 - 1].ss && m.length) { const pv = f.d.exercises[j0 - 1]; if (d.exercises.some(x => (x.exId && x.exId === pv.id) || exSame(x.name, pv.name)) && m.some(k => exSame(d.exercises[k].name, f.d.exercises[j0].name))) { pv.ss = 0; inPlan = true; } } if (inPlan) savePlans(); } }
  g5Pend(); d.lastAct = Date.now(); saveDraft();
  return { ok: true, inPlan, names };
}
/* ¿Se puede unir el ejercicio i con el siguiente de la lista? */
function g5JoinNext(d, i) {
  const a = d && d.exercises[i], b = d && d.exercises[i + 1];
  if (!a || !b || exComplete(a) || exComplete(b)) return null;
  if (typeof ssOf === 'function' && (ssOf(d, a) || ssOf(d, b))) return null;
  return i + 1;
}
const g5PlanTxt = (p, ok) => (p ? (ok ? ' (también en tu rutina)' : ' (no estaba en tu rutina: solo hoy)') : ' (solo hoy)');

/* Teléfono: hojas con la pregunta */
function g5RmSheet(i) {
  const d = state.draft, e = d && d.exercises[i]; if (!e) return;
  const n = e.log.filter(s => s.done).length, m = typeof ssMembers === 'function' ? ssMembers(d, i) : null, other = m && m.length === 2 ? d.exercises[m[0] === i ? m[1] : m[0]].name : '';
  if (d.exercises.length < 2) return openSheet(`<div class="row"><h2 class="grow">Quitar ${esc(e.name)}</h2><button class="icon-btn" data-act="sheet-close" aria-label="Cerrar">${ic('x', 18)}</button></div>
    <div class="muted">Es el único ejercicio de esta sesión: no se puede quitar. Para salir, termina o descarta el entrenamiento.</div><button class="btn block" data-act="sheet-close">Entendido</button>`);
  const plan = g5InPlan(d, e);
  openSheet(`<div class="row"><h2 class="grow">Quitar ${esc(e.name)}</h2><button class="icon-btn" data-act="sheet-close" aria-label="Cerrar">${ic('x', 18)}</button></div>
    ${n ? `<div class="g5-warn" role="alert">${ic('alert-triangle', 16)}<span>Ya hiciste <b>${n} ${n === 1 ? 'serie' : 'series'}</b> de este ejercicio hoy: ${n === 1 ? 'se borrará' : 'se borrarán'} de esta sesión.</span></div>` : ''}
    ${other ? `<div class="muted" style="font-size:13px">Era parte de una superserie: <b>${esc(other)}</b> queda como ejercicio normal, con su propio descanso.</div>` : ''}
    <div class="label">¿Quitarlo solo de hoy o también de la rutina?</div>
    <button type="button" class="btn block ${n ? 'danger' : ''}" data-g5="rm-go" data-i="${i}" data-p="0">${n ? 'Borrar las series y quitarlo' : 'Quitarlo'} solo de hoy</button>
    ${plan ? `<button type="button" class="btn block ${n ? 'danger' : ''}" data-g5="rm-go" data-i="${i}" data-p="1">${n ? 'Borrar las series y quitarlo' : 'Quitarlo'} también de la rutina</button>` : '<div class="muted" style="font-size:12px">Este ejercicio no está en tu rutina: se quita solo de hoy.</div>'}
    <button type="button" class="btn block" data-act="sheet-close">Cancelar</button>`);
  const c = document.querySelector('#sheet .sheet-card'); if (c) c.classList.add('g5-sheet');
}
function g5SplitSheet(i) {
  const d = state.draft, m = d && typeof ssMembers === 'function' ? ssMembers(d, i) : null; if (!m) return;
  const names = m.map(k => d.exercises[k].name), f = g5Plan(d), plan = !!(f && m.some(k => { const j = g5PIdx(f, d.exercises[k]); return j >= 0 && (f.d.exercises[j].ss || (j > 0 && f.d.exercises[j - 1].ss)); }));
  openSheet(`<div class="row"><h2 class="grow">Separar la superserie</h2><button class="icon-btn" data-act="sheet-close" aria-label="Cerrar">${ic('x', 18)}</button></div>
    <div class="muted" style="font-size:13px"><b>${names.map(esc).join('</b> y <b>')}</b> vuelven a ser ejercicios normales, cada uno con su propio descanso. Tus series hechas no cambian.</div>
    <div class="label">¿Separarla solo hoy o también en la rutina?</div>
    <button type="button" class="btn block" data-g5="split-go" data-i="${i}" data-p="0">Separar solo hoy</button>
    ${plan ? `<button type="button" class="btn block" data-g5="split-go" data-i="${i}" data-p="1">Separar también en la rutina</button>` : '<div class="muted" style="font-size:12px">En tu rutina no están juntos: se separan solo hoy.</div>'}
    <button type="button" class="btn block" data-act="sheet-close">Cancelar</button>`);
  const c = document.querySelector('#sheet .sheet-card'); if (c) c.classList.add('g5-sheet');
}
/* "Quitar la superserie" de la hoja de superserie también pregunta */
g2SsOff = function (i) { g5SplitSheet(i); };
document.addEventListener('click', ev => {
  const b = ev.target.closest && ev.target.closest('[data-g5]'); if (!b) return;
  ev.preventDefault(); ev.stopPropagation();
  const a = b.dataset.g5, i = +b.dataset.i;
  if (a === 'gw') return g5GymSheet(b.dataset.gym);
  if (a === 'gw-save') return g5GymSave(b.dataset.gym);
  if (a === 'rm') return g5RmSheet(i);
  if (a === 'split') return g5SplitSheet(i);
  if (a === 'rm-go') { const p = b.dataset.p === '1', R = g5Remove(i, p); closeSheet(); render(); if (R.ok) toast(`${R.name} quitado${g5PlanTxt(p, R.inPlan)}${R.other ? '. ' + R.other + ' queda como ejercicio normal' : ''}.`); return; }
  if (a === 'split-go') { const p = b.dataset.p === '1', R = g5Split(i, p); closeSheet(); render(); if (R.ok) toast(`Superserie separada${g5PlanTxt(p, R.inPlan)}: cada uno con su propio descanso.`); return; }
}, true);
/* Píldoras "Separar" (junto a la de superserie) y "Quitar" (al final) */
function g5Pills() {
  const d = state.draft; if (!d || isWatch()) return;
  document.querySelectorAll('#sx-pager > .sx-page').forEach(pg => {
    const i = +pg.dataset.i, e = d.exercises[i], P = pg.querySelector('.su-pills'); if (!e || !P) return;
    const m = typeof ssMembers === 'function' && ssMembers(d, i), sb = P.querySelector('.g2-ssb');
    if (m && sb && !P.querySelector('.g5-split')) sb.insertAdjacentHTML('afterend', `<button type="button" class="su-p g5-split" data-g5="split" data-i="${i}">${ic('scissors', 15)} Separar</button>`);
    if (!P.querySelector('.g5-rm')) P.insertAdjacentHTML('beforeend', `<button type="button" class="su-p g5-rm" data-g5="rm" data-i="${i}">${ic('trash-2', 15)} Quitar</button>`);
  });
}
const _renderG5 = render;
render = function () { const r = _renderG5.apply(this, arguments); if (!isWatch()) g5Pills(); return r; };
/* "¿Máquina ocupada?" también ofrece quitarlo */
const _busySheetG5 = busySheet;
busySheet = function (i) {
  _busySheetG5.apply(this, arguments);
  const sc = document.querySelector('#sheet .sheet-card'); if (!sc || isWatch() || sc.querySelector('.g5-busy')) return;
  sc.insertAdjacentHTML('beforeend', `<button type="button" class="btn block g5-busy" data-g5="rm" data-i="${i}">${ic('trash-2', 16)} Quitar este ejercicio</button>`);
};

/* Reloj ("⋯ Más"): Quitar, Separar superserie y Unir con el siguiente, con la misma pregunta */
const _w2MenuG5 = w2Menu;
w2Menu = function () {
  const m = w2.menu, d = state.draft; if (!d) return _w2MenuG5.apply(this, arguments);
  const i = Math.min(d.cur || 0, d.exercises.length - 1), e = d.exercises[i], back = '<button class="w2-mi back" data-act="w2-menu" data-m="main">‹ Volver</button>';
  if (m === 'g5rm') {
    const n = e.log.filter(s => s.done).length, mm = typeof ssMembers === 'function' ? ssMembers(d, i) : null, other = mm && mm.length === 2 ? d.exercises[mm[0] === i ? mm[1] : mm[0]].name : '';
    if (d.exercises.length < 2) return `<div class="w2-mh">Quitar ${esc(e.name)}</div><div class="w2-ms">Es el único ejercicio: no se puede quitar.</div>${back}`;
    const btn = p => `<button class="w2-mi g5w danger" data-g5w="rm" data-p="${p}">${w2.conf === 'g5rm' + p ? '¿Seguro? Toca otra vez' : p ? 'También de la rutina' : 'Solo de hoy'}</button>`;
    return `<div class="w2-mh">Quitar ${esc(e.name)}</div>
      ${n ? `<div class="w2-ms g5w-warn">⚠ Se borrarán ${n} ${n === 1 ? 'serie hecha' : 'series hechas'}.</div>` : ''}
      ${other ? `<div class="w2-ms">${esc(other)} queda como ejercicio normal.</div>` : ''}
      <div class="w2-ms">¿Solo de hoy o también de la rutina?</div>${btn(0)}${g5InPlan(d, e) ? btn(1) : ''}${back}`;
  }
  if (m === 'g5split') {
    const mm = typeof ssMembers === 'function' ? ssMembers(d, i) : null; if (!mm) { w2.menu = 'main'; return _w2MenuG5.apply(this, arguments); }
    const f = g5Plan(d), plan = !!(f && mm.some(k => { const j = g5PIdx(f, d.exercises[k]); return j >= 0 && (f.d.exercises[j].ss || (j > 0 && f.d.exercises[j - 1].ss)); }));
    return `<div class="w2-mh">Separar superserie</div><div class="w2-ms">${mm.map(k => esc(d.exercises[k].name)).join(' y ')} vuelven a ir solos, con su descanso.</div>
      <div class="w2-ms">¿Solo hoy o también en la rutina?</div>
      <button class="w2-mi g5w" data-g5w="split" data-p="0">Solo hoy</button>${plan ? '<button class="w2-mi g5w" data-g5w="split" data-p="1">También en la rutina</button>' : ''}${back}`;
  }
  if (m === 'g5join') {
    const k = g5JoinNext(d, i); if (k == null) { w2.menu = 'main'; return _w2MenuG5.apply(this, arguments); }
    const b = d.exercises[k], plan = g5InPlan(d, e) && g5InPlan(d, b);
    return `<div class="w2-mh">Unir con el siguiente</div><div class="w2-ms">${esc(e.name)} + ${esc(b.name)} en superserie: uno tras otro y descansas al cerrar la vuelta.</div>
      <div class="w2-ms">¿Solo hoy o también en la rutina?</div>
      <button class="w2-mi g5w" data-g5w="join" data-p="0">Solo hoy</button>${plan ? '<button class="w2-mi g5w" data-g5w="join" data-p="1">También en la rutina</button>' : ''}${back}`;
  }
  const h = _w2MenuG5.apply(this, arguments); if (m !== 'main' || !e) return h;
  const inSs = typeof ssMembers === 'function' && ssMembers(d, i), j = g5JoinNext(d, i);
  const add = `<button class="w2-mi g5w" data-act="w2-menu" data-m="g5rm">🗑 Quitar ejercicio</button>`
    + (inSs ? `<button class="w2-mi g5w" data-act="w2-menu" data-m="g5split">✂ Separar superserie</button>` : j != null ? `<button class="w2-mi g5w" data-act="w2-menu" data-m="g5join">🔗 Unir con el siguiente<small>${esc(d.exercises[j].name)}</small></button>` : '');
  const at = h.indexOf('<button class="w2-mi" data-act="w2-away">');
  return at >= 0 ? h.slice(0, at) + add + h.slice(at) : h + add;
};
document.addEventListener('click', ev => {
  const b = ev.target.closest && ev.target.closest('[data-g5w]'); if (!b) return;
  ev.preventDefault(); ev.stopPropagation();
  const d = state.draft; if (!d) return;
  const i = Math.min(d.cur || 0, d.exercises.length - 1), a = b.dataset.g5w, p = b.dataset.p === '1';
  try { HAP && HAP.impact({ style: 'LIGHT' }); } catch (x) {}
  if (a === 'rm') {
    if (w2.conf !== 'g5rm' + (p ? 1 : 0)) { w2.conf = 'g5rm' + (p ? 1 : 0); render(); return; }
    w2.conf = null; const R = g5Remove(i, p); w2.menu = null; render(); if (R.ok) toast(`${R.name} quitado${g5PlanTxt(p, R.inPlan)}.`); return;
  }
  if (a === 'split') { const R = g5Split(i, p); w2.menu = null; w2.conf = null; render(); if (R.ok) toast(`Superserie separada${g5PlanTxt(p, R.inPlan)}.`); return; }
  if (a === 'join') { const k = g5JoinNext(d, i); w2.menu = null; w2.conf = null; if (k == null) return render(); g2SsSet(i, k, p); }
}, true);
bootRender();
