/* ==========================================================================
   Fase 5 · Entreno rápido y más plantillas (15-oct-2026)
   1. Entreno rápido (como los "quick workouts" de Symmetry, pero generado aquí,
      sin IA y sin internet): eliges enfoque, minutos y equipo; la app arma la sesión
      con los patrones del generador, tu objetivo, experiencia y molestias, y la
      empiezas al momento. "Otra opción" cambia los ejercicios.
   2. Más plantillas: enfoque glúteos, exprés de 30 min, calistenia, en casa 4 días,
      fuerza en los básicos, movilidad, perder grasa y E/T/P en 3 días.
   ========================================================================== */
const QK_FOCUS = [
  ['full', 'Cuerpo completo', ['squat', 'hpush', 'hpull', 'hinge', 'vpush', 'vpull', 'core', 'lat']],
  ['upper', 'Torso', ['hpush', 'hpull', 'vpush', 'vpull', 'lat', 'rear', 'bi', 'tri']],
  ['lower', 'Pierna', ['squat', 'hinge', 'quad', 'ham', 'glute', 'calf', 'core']],
  ['push', 'Empuje', ['hpush', 'vpush', 'ipush', 'lat', 'tri', 'core']],
  ['pull', 'Tracción', ['vpull', 'hpull', 'rear', 'bi', 'hpull', 'core2']],
  ['chest', 'Pecho', ['hpush', 'ipush', 'hpush', 'ipush', 'tri']],
  ['back', 'Espalda', ['vpull', 'hpull', 'hpull', 'vpull', 'rear', 'bi']],
  ['shoulders', 'Hombros', ['vpush', 'lat', 'rear', 'vpush', 'lat', 'rear']],
  ['arms', 'Brazos', ['bi', 'tri', 'bi', 'tri', 'bi', 'tri']],
  ['glutes', 'Glúteos', ['glute', 'hinge', 'squat', 'quad', 'glute', 'ham']],
  ['core', 'Abdomen', ['core', 'core2', 'core', 'core2', 'core']],
  ['hiit', 'Cardio exprés', null],
];
const QK_HIIT = ['Saltos de Tijera', 'Sentadilla con peso corporal', 'Escaladores', 'Flexiones', 'Burpees', 'Zancadas', 'Plancha', 'Sentadilla con Salto', 'Bicho Muerto'];
const QK_MINS = [10, 15, 20, 30, 45];
const qkState = () => state.qk || (state.qk = Object.assign({ focus: 'full', mins: 20, equip: (pbProf() || {}).equip || (pubUser() ? 'body' : 'gym'), seed: 0 }, state.settings.qkLast || {}));
/* Mezcla estable según la semilla: "Otra opción" cambia el orden de las alternativas */
function qkShuffle(list, seed) {
  if (!seed) return list.slice();
  let s = seed * 9301 + 49297; const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) { s = (s * 9301 + 49297) % 233280; const j = Math.floor(s / 233280 * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
  return a;
}
function qkAllowed(name, o) {
  if ((o.inj || []).some(k => PB_AVOID[k] && PB_AVOID[k].test(normName(name)))) return false;
  if (o.goal === 'mayor' && /con salto|burpees|saltos de tijera|escaladores/.test(normName(name))) return false;
  return !!libFind(name);
}
/* Arma la lista de ejercicios: [{ name, sets, reps, rest }] */
function qkBuild(q) {
  const base = pbBase(), o = Object.assign({}, base, { equip: q.equip, mins: q.mins }), out = [], used = [];
  if (q.focus === 'hiit') {
    const list = qkShuffle(QK_HIIT, q.seed).filter(n => qkAllowed(n, o));
    const rounds = q.mins <= 10 ? 2 : q.mins <= 20 ? 3 : 4, per = Math.max(4, Math.min(list.length, Math.floor(q.mins * 60 / rounds / 60)));
    return list.slice(0, per).map(n => E(n, pbType(n), 0, rounds, /plancha|escaladores|tijera|bicho/.test(normName(n)) ? '30-40' : '10-15', 0.5));
  }
  /* Tamaño fijo según los minutos: cuántos ejercicios, series y descanso máximo */
  const T = { 10: [3, 2, 0.5], 15: [3, 2, 1], 20: [4, 2, 1], 30: [4, 3, 1], 45: [5, 3, 1.5] }[q.mins] || [4, 3, 1];
  const F = QK_FOCUS.find(f => f[0] === q.focus) || QK_FOCUS[0];
  const pre = o.goal === 'mayor' ? { squat: ['Sentarse y Pararse de la Silla'], core: ['Equilibrio en un Pie'], core2: ['Equilibrio en un Pie'] } : {};
  for (const slot of F[2].concat(F[0] === 'full' ? PB_FILL : [])) {
    if (out.length >= T[0]) break;
    const S = PB_SLOTS[slot]; if (!S || qkSkip(slot, o)) continue;
    const pool = (pre[slot] || []).concat(o.equip === 'body' && o.exp <= 1 && S.bodyBeg ? S.bodyBeg : [], S[o.equip] || [], o.equip === 'gym' || o.equip === 'basic' ? (S.gym || []) : []);
    const cand = qkShuffle([...new Set(pool)], q.seed + out.length).filter(n => !used.includes(n) && qkAllowed(n, o));
    if (!cand.length) continue;
    const name = (pre[slot] && cand.includes(pre[slot][0])) ? pre[slot][0] : cand[0];
    const it = { name, c: !!S.c, slot }, d = pbDose(o, it, out.length);
    d.sets = Math.min(d.sets, T[1]); d.rest = Math.min(d.rest, T[2]);
    used.push(name);
    const e = E(name, pbType(name), 0, d.sets, d.reps, d.rest);
    delete e.bar; if ((o.equip === 'gym' || o.equip === 'basic') && BAR_DEFAULT[name] != null) e.bar = pbLb() ? 45 : BAR_DEFAULT[name];
    out.push(e);
  }
  out.forEach(e => { if (!(+e.weight)) { const s = typeof startLoad === 'function' && startLoad(e); if (s && s.w > 0) { e.weight = s.w; e.startLoad = 1; } } });
  return out;
}
/* Patrones muy difíciles sin equipo para quien empieza o busca movilidad */
function qkSkip(slot, o) {
  if (o.equip !== 'body') return false;
  if (o.goal === 'mayor') return ['vpull', 'ipush', 'vpush'].includes(slot);
  return o.exp === 0 && ['vpull', 'ipush'].includes(slot);
}
/* Igual que la duración estimada de la app: 45 s por serie + descanso, 90 s por ejercicio y 5 min de calentamiento desde 30 min */
const qkMinsOf = (list, mins) => Math.round(list.reduce((a, e) => a + e.sets * (45 + e.rest) + 90, 0) / 60) + (mins >= 30 ? 5 : 0);
function qkSheet() {
  const q = qkState(); q.list = qkBuild(q);
  const chip = (on, attrs, label) => `<button type="button" class="qk-chip ${on ? 'on' : ''}" ${attrs}>${label}</button>`;
  openSheet(`<div class="row"><h2 class="grow">Entreno rápido</h2><button class="icon-btn" data-act="sheet-close" aria-label="Cerrar">${ic('x', 18)}</button></div>
    <div class="label">Enfoque</div><div class="qk-chips">${QK_FOCUS.map(f => chip(q.focus === f[0], `data-qk="focus" data-v="${f[0]}"`, f[1])).join('')}</div>
    <div class="label">Minutos</div><div class="qk-chips">${QK_MINS.map(m => chip(q.mins === m, `data-qk="mins" data-v="${m}"`, m + ' min')).join('')}</div>
    <div class="label">Equipo</div><div class="qk-chips">${Object.keys(PB_EQ).map(k => chip(q.equip === k, `data-qk="equip" data-v="${k}"`, PB_EQ[k][0])).join('')}</div>
    <div class="qk-list">${q.list.length ? q.list.map(e => `<div class="qk-ex">${thumb(e.name)}<span class="grow"><b>${esc(e.name)}</b><small class="muted">${e.sets} × ${e.repsMin === e.repsMax ? e.repsMax : e.repsMin + '-' + e.repsMax}${/plancha|escaladores|tijera|isometrica|equilibrio/.test(normName(e.name)) ? ' s' : ''}${+e.weight ? ' · ' + fmtKg(e.weight) + (pbLb() ? ' lb' : ' kg') : ''}</small></span></div>`).join('')
      : '<div class="muted">No hay ejercicios para ese enfoque con este equipo. Prueba otro equipo.</div>'}</div>
    <div class="muted" style="font-size:12px">≈ ${qkMinsOf(q.list, q.mins)} min${q.focus === 'hiit' ? ' · en circuito: haz una serie de cada uno y repite la vuelta' : ''}. Se ajusta a tu objetivo, tu experiencia y tus molestias.</div>
    <div class="grid2"><button type="button" class="btn" data-qk="again">${ic('refresh-cw', 16)} Otra opción</button><button type="button" class="btn primary" data-qk="go" ${q.list.length ? '' : 'disabled'}>${ic('play', 16)} Empezar</button></div>`);
}
function qkStart() {
  const q = qkState(); if (!q.list || !q.list.length) return;
  state.settings.qkLast = { focus: q.focus, mins: q.mins, equip: q.equip }; saveLocal();
  const F = QK_FOCUS.find(f => f[0] === q.focus) || QK_FOCUS[0];
  /* Rutina temporal: startSession la lee y se quita enseguida (la sesión queda en el historial, la rutina no) */
  const plan = { id: 'quick', name: 'Entreno rápido', gymId: activeGym().id, quick: 1, days: [{ id: 'q-' + uid(), name: `Rápido · ${F[1]} ${q.mins} min`, weekday: new Date().getDay(), kind: 'fuerza', exercises: q.list }] };
  state.plans.push(plan);
  try { closeSheet(); startSession(plan.id, plan.days[0].id); } finally { state.plans = state.plans.filter(p => p !== plan); LS.set('plans', state.plans); }
}
document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-qk]'); if (!b) return;
  ev.stopPropagation(); const q = qkState(), a = b.dataset.qk;
  if (a === 'open') return qkSheet();
  if (a === 'go') return qkStart();
  if (a === 'again') q.seed = (q.seed || 0) + 1;
  else { q[a] = a === 'mins' ? +b.dataset.v : b.dataset.v; q.seed = 0; }
  qkSheet();
}, true);
/* Tarjeta en Entrenar, justo después de "Te toca" */
function qkCard() {
  return `<button type="button" class="card qk-card" data-qk="open">${ic('zap', 20)}<span class="grow"><b>Entreno rápido</b><small class="muted">Elige enfoque y minutos; la app arma la sesión al momento.</small></span>${ic('chevron-right', 18)}</button>`;
}
const _renderQk = render;
render = function () {
  _renderQk();
  if (state.tab !== 'train' || state.draft || isWatch()) return;
  const app = $('#app'); if (!app || app.querySelector('.qk-card')) return;
  const hero = app.querySelector(':scope > .hero');
  if (hero) hero.insertAdjacentHTML('afterend', qkCard());
};

/* ---------- Más plantillas ---------- */
PB_DAY.gl = ['Glúteos y femoral', ['glute', 'hinge', 'ham', 'glute', 'quad', 'calf', 'core']];
const _pbSplitQk = pbSplit;
pbSplit = function (o) {
  const n = Math.max(2, Math.min(6, +o.days || 3));
  if (o.split === 'glute') return ['gl', 'ua', 'la', 'ub', 'gl', 'lb'].slice(0, n);
  if (o.split === 'ppl' && n === 3 && o.exp > 0) return ['push', 'pull', 'legs'];
  return _pbSplitQk(o);
};
PB_TPL.push(
  ['glute4', 'Enfoque glúteos · 4 días', 'Dos días de glúteo y femoral, más torso y pierna', { days: 4, split: 'glute' }],
  ['express3', 'Exprés 30 min · 3 días', 'Cuerpo completo para días con poco tiempo', { days: 3, split: 'fb', mins: 30 }],
  ['ppl3', 'Empuje / Tracción / Pierna · 3 días', 'Un día para cada patrón', { days: 3, split: 'ppl', exp: 1 }],
  ['str3', 'Fuerza en los básicos · 3 días', 'Sentadilla, press, peso muerto y remo pesados', { days: 3, split: 'fb', goal: 'fuerza', equip: 'basic' }],
  ['fat4', 'Perder grasa · 4 días', 'Más reps y descansos cortos', { days: 4, split: 'ul', goal: 'grasa' }],
  ['home4', 'En casa con mancuernas · 4 días', 'Torso y pierna con mancuernas', { days: 4, split: 'ul', equip: 'home' }],
  ['cal4', 'Calistenia · 4 días', 'Solo tu cuerpo: flexiones, remo invertido, dominadas', { days: 4, split: 'ul', equip: 'body', exp: 2 }],
  ['mob3', 'Movilidad y equilibrio · 3 días', 'Fuerza suave y equilibrio, 40 min', { days: 3, split: 'fb', goal: 'mayor', mins: 40 }],
);
