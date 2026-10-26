/* ==========================================================================
   Coach con doble progresión autorregulada (rama coach-progresion, 25-oct-2026)
   1. Objetivo (Tus datos): Hipertrofia (por defecto), Fuerza o Recomposición (settings.prof.goal: musculo/fuerza/grasa).
   2. Cada ejercicio tiene un tipo (Compuesto, Aislamiento, Glúteo y cadera, Pequeño) y, según el tipo de día
      (pesado = fuerza, bombeo) y el objetivo, un rango de reps, un RIR objetivo y un descanso (`pgRx`).
      Subir: 1.ª serie al tope del rango con el RIR objetivo más alto → siguiente escalón y vuelta al mínimo.
      Ajustar: fuera del rango, ~4 % por rep de diferencia. Bajar: dos sesiones bajo el mínimo → bajar.
      Varios ejercicios así a la vez → propone una semana de descarga. RIR 0 solo en máquinas y aislamiento.
      Pesado y bombeo progresan por separado; el punto de partida es tu último rendimiento real en ese gimnasio
      (historial con la regla única de la Tanda J); si nunca aquí, el otro gimnasio de referencia, avisando.
   3. Todo el catálogo clasificado (`x.ptype`), los míos y los importados también; se cambia a mano en la ficha
      (`settings.exType[clave]`).
   5. Volumen del plan por músculo (10-20 series): avisos y qué agregar o quitar.
   6. Mi plan muestra los valores del coach; la opción Coach explica cada cambio en una línea.
   7. Tiempo disponible (Tus datos, `prof.mins`, 75 min por defecto): duración estimada de cada día y de la sesión,
      ajustes si se pasa (superseries, descansos, mover una serie, quitar un ejercicio con aviso), atraso en vivo,
      descansos reales, y duración y descanso reales frente a los recomendados en el resumen y la exportación.
   9. Las exportaciones explican este sistema a la IA.
   ========================================================================== */

/* ---------- Tipos y prescripción ---------- */
const PG_T = { comp: 'Compuesto', aisl: 'Aislamiento', glu: 'Glúteo y cadera', peq: 'Pequeño', cardio: 'Cardio / acondicionamiento' };
/* [reps mín, reps máx, RIR mín, RIR máx]; descanso [mín, máx] s; duración de una serie (s) */
const PG_RX = {
  comp: { f: [6, 10, 1, 3], b: [12, 15, 1, 2], rest: [120, 180], restB: [90, 120], dur: 55 },
  aisl: { f: [8, 12, 0, 2], b: [15, 20, 0, 1], rest: [90, 120], restB: [90, 120], dur: 45 },
  glu: { f: [10, 15, 1, 2], b: [15, 20, 0, 1], rest: [90, 120], restB: [90, 120], dur: 50 },
  peq: { f: [12, 15, 0, 2], b: [15, 25, 0, 1], rest: [60, 90], restB: [60, 90], dur: 40 },
  /* Cardio / acondicionamiento: sin progresión de peso; reps, segundos o metros (lo que anotes) y el coach suma un poco */
  cardio: { f: [10, 20, 2, 2], b: [10, 20, 2, 2], rest: [60, 90], restB: [60, 90], dur: 45 },
};
/* Explosivos (cargadas, thrusters, arranques): compuestos con 3-6 reps, RIR 2 o más y nunca al fallo, en cualquier día */
const PG_EXPL = [3, 6, 2, 3];
const PG_FUERZA = [3, 6, 2, 3], PG_FUERZA_REST = [180, 300];
/* Los 5 objetivos de la bienvenida y de Tus datos (un solo dato, settings.prof.goal), cada uno con sus reglas */
const PG_GOALS = { hiper: 'Ganar músculo', fuerza: 'Ganar fuerza', grasa: 'Perder grasa', salud: 'Salud y energía', mov: 'Movilidad y equilibrio' };
const PG_GOAL_KEY = { musculo: 'hiper', fuerza: 'fuerza', grasa: 'grasa', salud: 'salud', mayor: 'mov' };
const pgGoal = () => PG_GOAL_KEY[typeof goalSet === 'function' ? goalSet() : ''] || 'hiper';
/* Lo propio de cada objetivo, en una línea (Coach, exportaciones) */
const PG_GOAL_RULE = {
  hiper: 'rangos de hipertrofia por tipo de ejercicio (abajo)',
  fuerza: 'los compuestos del día pesado a 3-6 reps, RIR 2-3 y 180-300 s de descanso; el resto como hipertrofia',
  grasa: 'rangos de hipertrofia con los descansos al mínimo; no bajar el peso aunque baje el rendimiento por la dieta (mantener ya es ganar) y llegar a la proteína del día',
  salud: '10-15 reps, RIR 2-3, nunca al fallo; subir peso solo tras 2 sesiones completas en el tope',
  mov: '12-20 reps, RIR 3, nunca al fallo; subidas de 2,5 kg como máximo, sin cargas altas; primero máquinas y ejercicios de equilibrio',
};
const pgAvail = () => { const m = +((state.settings.prof || {}).mins); return m >= 20 && m <= 300 ? m : 75; };

/* Clasificación por movimiento (patrón del catálogo) y músculo principal, no por el nombre exacto */
const PG_PAT = {
  cardio: /^(cardio|carry|balance|sled)$/,
  comp: /^(squat|lunge|hinge|hpush|ipush|dpush|dip|vpush|vpull|row|full)$/,
  glu: /^(hipext|abd|add)$/,
  peq: /^(lat|rear|front|calf|tib|wrist|grip|flex|legraise|antiext|rotc|rot|shrug)$/,
  aisl: /^(fly|pullover|curl|triext|kext|kflex|lumbar|upright)$/,
};
const PG_DUDA = { upright: 'remo al mentón: multiarticular de hombro', shrug: 'encogimientos: pueden ir muy pesados', carry: 'cargar y caminar', full: 'cuerpo completo / explosivo', cardio: 'acondicionamiento', sled: 'trineo', add: 'aducción (cadera)', lumbar: 'extensión lumbar (podría ser glúteo)', pullover: 'pullover (brazos rectos)', dip: 'fondos con peso corporal', balance: 'equilibrio' };
const PG_COMP_RE = /prensa|hack|sentadilla|press|remo|jalon|dominad|peso muerto|zancada|fondos|banca|militar|buenos dias/;
function pgByMuscle(m, n) {
  if (m === 'glu' || m === 'adu') return 'glu';
  if (/^(pant|abd|ante|obl|core)$/.test(m)) return 'peq';
  if (m === 'homb') return /press|militar|arnold|push press/.test(n) ? 'comp' : 'peq';
  if (m === 'bic' || m === 'tri') return 'aisl';
  if (/^(cuad|isq|pecho|esp|lumb)$/.test(m)) return PG_COMP_RE.test(n) ? 'comp' : 'aisl';
  return null;
}
/* { t, doubt } para una entrada del catálogo */
function pgClassify(x) {
  const n = normName(x.name), m = catMain(x), pat = x.pat;
  if (pat) {
    let t = PG_PAT.cardio.test(pat) ? 'cardio' : PG_PAT.comp.test(pat) ? 'comp' : PG_PAT.glu.test(pat) ? 'glu' : PG_PAT.peq.test(pat) ? 'peq' : PG_PAT.aisl.test(pat) ? 'aisl' : null;
    let doubt = PG_DUDA[pat] || '';
    if (t === 'comp' && x.iso) { t = 'aisl'; doubt = doubt || 'movimiento compuesto marcado como aislamiento en el catálogo'; }
    if (t === 'glu' && pat === 'hipext' && m !== 'glu') { t = m === 'isq' ? 'aisl' : t; doubt = doubt || 'extensión de cadera con músculo principal ' + m; }
    if (t === 'glu' && /patada/.test(n)) doubt = doubt || 'patada de glúteo: podría ser aislamiento';
    if (t === 'comp' && x.uni && /pierna|unilateral|una mano|un brazo/.test(n)) doubt = doubt || 'compuesto a una pierna o un brazo';
    if (t) return { t, doubt };
  }
  const t = pgByMuscle(m, n);
  return { t: t || 'aisl', doubt: t ? 'sin patrón: por músculo (' + m + ')' : 'sin patrón ni músculo claro: aislamiento por defecto' };
}
/* Ejercicio que no está en el catálogo (escrito a mano o importado): por músculo y equipo del nombre */
function pgByName(name) {
  const n = normName(exClean(name)), zs = typeof zoneShares === 'function' ? zoneShares(name) : {}, m = Object.keys(zs).find(k => zs[k] === 1);
  const t = m ? pgByMuscle(m, n) : null;
  if (t) return t;
  if (PG_COMP_RE.test(n)) return 'comp';
  if (/hip thrust|puente|abduc|aduc|gluteo/.test(n)) return 'glu';
  if (/elevacion(es)? lateral|face pull|pajaro|talon|gemelo|pantorr|antebrazo|muneca|abdom|crunch|plancha/.test(n)) return 'peq';
  return 'aisl';
}
/* Revisado por el usuario (25-oct-2026): los dudosos quedan fijos como los clasifica pgClassify, salvo estos por nombre;
   los de patrón cardio/carry/balance/sled son Cardio y los "full" (cargadas, thrusters, arranques) son explosivos */
const PG_FIX = { 'Plancha Copenhague': 'peq' };
LIB.forEach(x => { x.ptype = PG_FIX[x.name] || pgClassify(x).t; if (x.pat === 'full') x.pexpl = 1; delete x.pdoubt; });
function pgTypeOf(name) {
  const o = (state.settings.exType || {})[exHKey(name)]; if (o && PG_T[o]) return o;
  const x = libFind(name);
  if (x) { if (!x.ptype) { x.ptype = PG_FIX[x.name] || pgClassify(x).t; if (x.pat === 'full') x.pexpl = 1; } return x.ptype; }
  return pgByName(name);
}
const pgMain = name => { const sh = zoneShares(name); for (const k in sh) if (sh[k] === 1) return k; return null; };
const pgFam = name => { const x = libFind(name); return x ? equipOf(x) : ''; };
/* pe: ejercicio de la rutina (opcional), por si acortaste su descanso con "Ajustar a mi tiempo" */
function pgRx(name, kind, pe) {
  const t = pgTypeOf(name), g = pgGoal(), b = kind === 'bombeo', R = PG_RX[t];
  let [rMin, rMax, rirMin, rirMax] = b ? R.b : R.f, rest = (b ? R.restB : R.rest).slice();
  if (g === 'fuerza' && t === 'comp' && !b) { [rMin, rMax, rirMin, rirMax] = PG_FUERZA; rest = PG_FUERZA_REST.slice(); }
  if (t !== 'cardio' && g === 'salud') [rMin, rMax, rirMin, rirMax] = [10, 15, 2, 3];   /* nunca al fallo */
  if (t !== 'cardio' && g === 'mov') [rMin, rMax, rirMin, rirMax] = [12, 20, 3, 3];      /* nunca al fallo */
  const xl = libFind(name); if (t === 'comp' && xl && xl.pexpl) [rMin, rMax, rirMin, rirMax] = PG_EXPL;
  const fam = pgFam(name), mach = fam === 'maq' || fam === 'polea';
  if (t === 'comp') { rirMin = Math.max(1, rirMin); rest[0] = Math.max(90, rest[0]); }       /* nunca al fallo en compuestos; 90 s mínimo */
  else if (rirMin === 0 && t === 'glu' && !mach) rirMin = 1;                                  /* RIR 0 solo en máquinas y aislamiento */
  rirMax = Math.max(rirMin, rirMax);
  let rec = b || g === 'grasa' ? rest[0] : Math.round((rest[0] + rest[1]) / 2 / 15) * 15;
  if (pe && +pe.pgRest && (t === 'aisl' || t === 'peq')) rec = Math.max(rest[0], +pe.pgRest);
  return { t, g, kind: b ? 'bombeo' : 'fuerza', rMin, rMax, rirMin, rirMax, rest: rec, restMin: rest[0], restMax: rest[1], dur: R.dur, expl: !!(xl && xl.pexpl && t === 'comp') };
}
const pgRir = (rx, j, n) => (n <= 1 ? rx.rirMax : Math.round(rx.rirMax - (rx.rirMax - rx.rirMin) * j / (n - 1)));
const pgRirTxt = rx => (rx.t === 'cardio' ? '—' : rx.rirMin === rx.rirMax ? String(rx.rirMin) : `${rx.rirMin}-${rx.rirMax}`);
const pgRirPart = rx => (rx.t === 'cardio' ? '' : ` · RIR ${pgRirTxt(rx)}`);
const pgRestTxt = s => (s % 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : `${s / 60} min`);

/* ---------- Escalones de carga ---------- */
const PG_LEGS = ['cuad', 'isq', 'glu', 'pant', 'adu'];
function pgInc(name, w) {
  const fam = pgFam(name), lb = state.settings.unit === 'lb', ex = { type: typeOf(name) };
  if (fam === 'manc' || fam === 'kb') return lb ? 5 : (w < 10 ? 1 : 2);
  if (fam === 'maq' || fam === 'polea') return increment(ex, w);
  return Math.min(increment(ex, w), lb ? 5 : 2.5);
}
function pgStep(name, w) {
  const fam = pgFam(name), lb = state.settings.unit === 'lb', legs = PG_LEGS.indexOf(pgMain(name)) >= 0;
  if (fam === 'manc' || fam === 'kb') return lb ? 5 : 2;
  if (fam === 'maq' || fam === 'polea') return Math.max(increment({ type: typeOf(name) }, w), legs ? (lb ? 10 : 5) : 0);   /* el siguiente disco de la máquina */
  return legs ? (lb ? 10 : 5) : (lb ? 5 : 2.5);
}
const pgRound = (name, w, down) => { const i = pgInc(name, w); return Math.max(0, (down ? Math.floor(w / i + 1e-9) : Math.round(w / i)) * i); };
/* Tope de subida por sesión, también al cambiar de rango: piernas +10 % (o +10 kg si es menor), tren superior +5 %
   (sobre la carga total, con la barra); nunca menos que un escalón */
function pgUpMax(name, from) {
  const legs = PG_LEGS.indexOf(pgMain(name)) >= 0, lb = state.settings.unit === 'lb', tot = (+from || 0) + barFor(name);
  return Math.max(pgStep(name, from), legs ? Math.min(tot * 0.10, lb ? 20 : 10) : tot * 0.05);
}
/* 1RM estimado de una serie con sus reps en reserva; peso para unas reps y un RIR; reps que salen con un peso */
const pgE1 = (name, s) => e1rm((+s.w || 0) + barFor(name), (+s.r || 0) + (+s.rir || 0));
const pgWFor = (name, e1, reps, rir) => e1 / (1 + (reps + rir) / 30) - barFor(name);
const pgRepsFor = (name, e1, w, rx) => Math.max(rx.rMin, Math.min(rx.rMax, Math.floor(30 * (e1 / ((+w || 0) + barFor(name)) - 1) - rx.rirMax)));
/* Reps que proponen las casillas de la sesión: el objetivo del coach para esa serie (si no, el máximo del rango) */
function pgGoalReps(e, j) { const g = e && e.coach && e.coach.goal; const v = g && +g[Math.min(j, g.length - 1)]; return v > 0 ? v : e.repsMax; }

/* ---------- Motor ---------- */
/* Sesión completa en el tope: todas sus series llegan al máximo del rango (Salud y energía) */
const pgFull = (h, rx) => !!(h && h.sets.length && h.sets.every(s => +s.r >= rx.rMax));
/* Perder grasa: aviso de proteína (la meta de Perfil → Nutrición, si está) */
function pgProtTip() { let g = 0; try { g = typeof protGoal === 'function' ? protGoal() : 0; } catch (e) {} return `Perder grasa: llega a tu proteína del día${g ? ' (' + g + ' g)' : ' (unos 2 g por kg de peso)'} para no perder músculo con la dieta.`; }
const pgFirst = h => (h.sets.filter(s => +s.r > 0)[0] || h.sets[0] || { w: 0, r: 0 });
const pgSetTxt = s => `${fmtKg(+s.w || 0)}×${s.r}${s.rir != null ? ' @' + s.rir : ''}`;
/* ---------- Por gimnasio: nunca se mezclan pesos de máquina entre gimnasios ---------- */
const PG_FREE = /^(barra|manc|kb|cuerpo|banda|otros)$/;   /* peso libre; máquinas, poleas y Smith no */
/* Tu última vez en otro gimnasio (primero con el mismo tipo de día) */
function pgOtherGym(name, gymId, kind) {
  let any = null;
  for (const s of state.sessions) {
    const g = sGym(s); if (g === gymId) continue;
    const x = exIn(s, name); if (!x || !x.sets.length) continue;
    const o = { sets: x.sets, date: s.date, gymId: g, kind: sKind(s) };
    if (o.kind === kind) return o; if (!any) any = o;
  }
  return any;
}
/* Proporción entre dos gimnasios para una máquina: la de ese mismo ejercicio si lo hiciste en los dos, si no la de
   otros ejercicios con la misma máquina hechos en los dos (p. ej. la prensa) */
function pgGymRatio(name, from, to) {
  const top = (n, g) => { const h = lastHere(n, g); return h ? +pgFirst(h).w || 0 : 0; };
  const one = n => { const a = top(n, from), b = top(n, to); return a > 0 && b > 0 ? b / a : 0; };
  let r = one(name); if (r) return { r, by: name };
  const x = libFind(name); if (!x || !x.eq) return null;
  const L = LIB.filter(y => y !== x && y.eq === x.eq).map(y => ({ n: y.name, r: one(y.name) })).filter(o => o.r).slice(0, 3);
  if (!L.length) return null;
  r = L.reduce((a, o) => a + o.r, 0) / L.length;
  return { r, by: L.map(o => o.n).join(', ') };
}
/* ---------- Regulación de la máquina por gimnasio: nota corta y opcional (máquinas, poleas y Smith) ---------- */
const pgIsMach = name => /^(maq|polea|smith)$/.test(pgFam(name));
const pgRegOf = (name, gymId) => (((state.settings.exReg || {})[gymId] || {})[exHKey(name)]) || '';
function pgRegSet(name, gymId, txt) {
  const all = Object.assign({}, state.settings.exReg || {}), m = Object.assign({}, all[gymId] || {}), k = exHKey(name);
  txt = String(txt || '').replace(/\s+/g, ' ').trim().slice(0, 80);
  if (txt) m[k] = txt; else delete m[k];
  all[gymId] = m; state.settings.exReg = all; savePlans();
}
/* En la sesión (teléfono): una píldora más, la primera de la fila (no ocupa alto: la tabla queda donde estaba);
   se ve al empezar el ejercicio en ese gimnasio y al tocarla se edita ahí mismo */
function pgRegPill(d, i) {
  const e = d.exercises[i]; if (!e || !pgIsMach(e.name)) return '';
  const t = pgRegOf(e.name, d.gymId), g = esc(gymName(d.gymId));
  return t ? `<button type="button" class="su-p pg-reg" data-pg-reg="edit" data-i="${i}" aria-label="Regulación en ${g}: ${esc(t)} (toca para editar)" title="Regulación en ${g}: ${esc(t)}">${ic('settings', 15)}<span class="pg-reg-t">${esc(t)}</span></button>`
    : `<button type="button" class="su-p pg-reg add" data-pg-reg="edit" data-i="${i}" aria-label="Anotar la regulación de esta máquina en ${g}">${ic('settings', 15)} Regulación</button>`;
}
function pgRegHtml(d, i) {
  const e = d.exercises[i]; if (!e || !pgIsMach(e.name)) return '';
  const t = pgRegOf(e.name, d.gymId), g = esc(gymName(d.gymId));
  if (state.pgRegEd === i) return `<div class="pg-reg-ed" data-i="${i}"><label class="label" for="pg-reg-in">Regulación en ${g}</label><input id="pg-reg-in" maxlength="80" value="${esc(t)}" placeholder="Ej. asiento 4, rodillo 3, respaldo 2" autocomplete="off">
    <div class="row" style="gap:8px"><button type="button" class="btn small primary" data-pg-reg="save" data-i="${i}">Guardar</button><button type="button" class="btn small" data-pg-reg="cancel">Cancelar</button></div></div>`;
  return t ? `<div class="pg-reg" data-i="${i}">${ic('settings', 15)}<span class="grow"><b>Regulación en ${g}:</b> ${esc(t)}</span><button type="button" class="pg-reg-b" data-pg-reg="edit" data-i="${i}">Editar</button></div>`
    : `<button type="button" class="pg-reg add" data-pg-reg="edit" data-i="${i}">${ic('settings', 15)} Anotar la regulación de esta máquina en ${g}</button>`;
}
window.addEventListener('click', ev => {
  const b = ev.target.closest && ev.target.closest('[data-pg-reg]'), d = state.draft; if (!b || !d) return;
  ev.preventDefault(); ev.stopPropagation();
  const a = b.dataset.pgReg, i = +b.dataset.i;
  if (a === 'edit') { state.pgRegEd = i; render(); const n = document.getElementById('pg-reg-in'); if (n) n.focus(); return; }
  if (a === 'save') { const e = d.exercises[i], n = document.getElementById('pg-reg-in'); if (e && n) { pgRegSet(e.name, d.gymId, n.value); toast(n.value.trim() ? 'Regulación guardada para ' + gymName(d.gymId) + '.' : 'Regulación borrada.'); } }
  state.pgRegEd = null; render();
}, true);
/* Reloj: solo se muestra (si hay nota), sin cambiar nada más */
const _vWatchSessPG = vWatchSession;
vWatchSession = function () {
  const h = _vWatchSessPG.apply(this, arguments), d = state.draft; if (!d) return h;
  const e = d.exercises[Math.min(d.cur || 0, d.exercises.length - 1)], t = e && pgIsMach(e.name) ? pgRegOf(e.name, d.gymId) : '', k = h.indexOf('<div class="w2-sub');
  return t && k > 0 ? h.slice(0, k) + `<div class="w2-reg">⚙ ${esc(t)}</div>` + h.slice(k) : h;
};

/* Ficha: peso máximo en cada gimnasio (vacío = sin máximo) */
function pgMaxRow(name) {
  return `<div class="pg-max" data-name="${esc(name)}"><div class="label">Peso máximo${pgIsMach(name) ? ' y regulación de la máquina' : ''} por gimnasio</div>
    <div class="muted" style="font-size:12px">Si la máquina no da más (p. ej. la prensa llega a 200 kg): el coach no sube más y progresa con reps, bajada lenta, pausa y una serie más.</div>
    ${state.gyms.map(g => { const v = pgMaxOf(name, g.id); return `<div class="pg-mr"><span class="grow">${esc(g.name)}</span>${pgIsMach(name) ? `<input class="pg-rgi" data-pg-rg="${g.id}" maxlength="80" value="${esc(pgRegOf(name, g.id))}" placeholder="regulación" aria-label="Regulación de la máquina en ${esc(g.name)}">` : ''}<span class="bd-in"><input inputmode="decimal" data-pg-mx="${g.id}" value="${v ? String(v).replace('.', ',') : ''}" placeholder="sin máximo" aria-label="Peso máximo en ${esc(g.name)}"><i class="pb-u" aria-hidden="true">${state.settings.unit === 'lb' ? 'lb' : 'kg'}</i></span></div>`; }).join('')}
    <button type="button" class="btn small" data-pg-mxs="1">Guardar${pgIsMach(name) ? ' peso máximo y regulación' : ' peso máximo'}</button></div>`;
}
window.addEventListener('click', ev => {
  const b = ev.target.closest && ev.target.closest('[data-pg-mxs]'); if (!b) return;
  ev.preventDefault(); ev.stopPropagation();
  const box = b.closest('.pg-max'), name = box && box.dataset.name; if (!name) return;
  const k = exHKey(name), all = Object.assign({}, state.settings.exMax || {}), said = [];
  box.querySelectorAll('[data-pg-mx]').forEach(inp => {
    const g = inp.dataset.pgMx, v = parseFloat(String(inp.value).replace(',', '.')), m = Object.assign({}, all[g] || {});
    if (v > 0 && v < 2000) { m[k] = v; said.push(`${gymName(g)} ${fmtKg(v)}`); } else delete m[k];
    all[g] = m;
  });
  state.settings.exMax = all;
  box.querySelectorAll('[data-pg-rg]').forEach(inp => pgRegSet(name, inp.dataset.pgRg, inp.value));
  savePlans(); render();
  toast(said.length ? `Peso máximo de ${name}: ${said.join(', ')}.` : `${name}: sin peso máximo.`);
}, true);
/* Ficha: mejor marca y última vez en cada gimnasio, por separado */
function pgGymRow(name) {
  const bar = barFor(name), rows = state.gyms.map(g => {
    let best = null, last = null;
    state.sessions.forEach(s => { if (sGym(s) !== g.id) return; const e = exIn(s, name); if (!e || !e.sets.length) return; if (!last) last = { s, e };
      e.sets.forEach(x => { const v = e1rm((+x.w || 0) + bar, +x.r || 0); if (!best || v > best.v) best = { v, x, d: s.date }; }); });
    return last ? `<div class="pg-gr"><b>${esc(g.name)}</b><small>Mejor: ${pgSetTxt(best.x)} · 1RM ≈ ${fmtKg(Math.round(best.v))} kg (${fmtDate(best.d)})</small><small>Última: ${last.e.sets.map(pgSetTxt).join(', ')} · ${ago(last.s.date)} (${(KINDS[sKind(last.s)] || '').toLowerCase()})</small></div>` : '';
  }).filter(Boolean);
  return rows.length ? `<div class="pg-gyms"><div class="label">Por gimnasio</div>${rows.join('')}${PG_FREE.test(pgFam(name)) ? '' : '<div class="muted" style="font-size:12px">Máquina: los pesos no se comparan entre gimnasios.</div>'}</div>` : '';
}

/* Semana de descarga propuesta y aceptada (settings.pgDl = lunes de esa semana) */
const pgDlNow = () => state.settings.pgDl === wkKey(new Date());
/* ---------- Peso máximo por ejercicio y gimnasio (settings.exMax[gymId][clave] = kg) ---------- */
const pgMaxOf = (name, gymId) => +(((state.settings.exMax || {})[gymId] || {})[exHKey(name)]) || 0;
/* Al llegar al máximo: más reps (hasta 30) → bajada lenta → pausa abajo → una serie más; cambia de método tras dos
   sesiones seguidas sin mejorar (las reps de la 1.ª serie en el primero, el total de reps en los demás) */
const PG_CAP_M = ['más reps (hasta 30)', 'bajada lenta de 3-4 s en cada rep', 'pausa de 1-2 s abajo en cada rep', 'una serie más'];
function pgCapState(H, cap) {
  const C = H.filter(h => (+pgFirst(h).w || 0) >= cap - 0.01).reverse();
  let m = 0, stall = 0, best = -1;
  C.forEach(h => {
    const r = +pgFirst(h).r || 0, tot = h.sets.reduce((a, s) => a + (+s.r || 0), 0), v = m === 0 ? r : tot;
    if (m === 0 && r >= 30) { m = 1; stall = 0; best = tot; return; }
    if (best < 0 || v > best) { best = v; stall = 0; }
    else if (++stall >= 2 && m < 3) { m++; stall = 0; best = m === 0 ? r : tot; }
  });
  return { m, stall };
}
/* Otro ejercicio del mismo músculo para el trabajo pesado (compuesto, sin máximo alcanzado, que haya en ese gimnasio) */
function pgHeavyAlt(name, gymId) {
  const m = pgMain(name); if (!m) return null;
  const seen = {}, L = [];
  const add = n => { if (!n || seen[n] || exSame(n, name)) return; seen[n] = 1; if (pgMain(n) === m && pgTypeOf(n) === 'comp' && !(pgMaxOf(n, gymId) && lastHere(n, gymId) && +pgFirst(lastHere(n, gymId)).w >= pgMaxOf(n, gymId)) && (typeof exAvail !== 'function' || exAvail(n, gymId))) L.push(n); };
  state.sessions.forEach(s => { if (sGym(s) === gymId) s.exercises.forEach(e => add(exClean(e.name))); });
  state.plans.filter(p => (p.gymId || 'rokaz') === gymId).forEach(p => p.days.forEach(d => d.exercises.forEach(e => add(e.name))));
  (typeof wcCands === 'function' ? wcCands(m) : []).forEach(add);
  return pgPrefer(L)[0] || null;
}
/* Con Movilidad y equilibrio: primero máquinas y equilibrio (orden estable para el resto) */
function pgPrefer(L) {
  if (pgGoal() !== 'mov') return L;
  const sc = n => { const x = libFind(n), f = pgFam(n); return x && x.pat === 'balance' ? 0 : f === 'maq' || f === 'polea' ? 1 : 2; };
  return L.map((n, i) => ({ n, i })).sort((a, b) => sc(a.n) - sc(b.n) || a.i - b.i).map(o => o.n);
}
function pgCoach(ex, gymId, kind) {
  const name = ex.name, bar = barFor(name), cap = pgMaxOf(name, gymId);
  let n = Math.max(1, +ex.sets || +ex.target || 3), rx = pgRx(name, kind, ex);
  const HA = exHistory(name, gymId, kind, 12), H = HA.filter(h => h.kind === kind);
  let w, mode, why, goal = null, src = 'own', alt = null;
  if (rx.t === 'cardio') {   /* mismo peso (si lleva); suma un poco de reps, segundos o metros a tu última vez aquí */
    const L = HA[0], s1 = L ? pgFirst(L) : null, r = s1 ? +s1.r || 0 : 0;
    w = s1 ? +s1.w || 0 : +ex.weight || 0; goal = r ? r + Math.max(1, Math.round(r * 0.1)) : Math.max(1, +ex.repsMin || rx.rMin);
    rx = Object.assign({}, rx, { rMin: goal, rMax: goal });
    mode = s1 ? 'hold' : 'first';
    why = s1 ? `Cardio: ${w ? 'mismo peso (' + fmtKg(w) + ' kg) y ' : ''}suma un poco: ${goal} (la última vez ${r}; reps, segundos o metros, lo que anotes).` : `Cardio: empieza cómodo y anota reps, segundos o metros; la próxima vez sumamos un poco.`;
    return { w, mode, why, goal: Array.from({ length: n }, () => goal), src: s1 ? 'own' : 'new', rx, n, alt: null, cap: 0, rest: rx.rest, rirT: Array.from({ length: n }, () => 2), last: L ? { date: L.date, reps: L.sets.map(z => z.r), w } : null };
  }
  /* En su peso máximo: rangos de bombeo (hasta 30 reps) también en los días pesados */
  const capped = cap > 0 && H.length && (+pgFirst(H[0]).w || 0) >= cap - 0.01;
  if (capped) rx = Object.assign({}, pgRx(name, 'bombeo', ex), { kind: rx.kind, rMax: 30, cap });
  /* Peso para el rango de hoy a partir de una vez de otro tipo de día (por el 1RM estimado con sus reps en reserva) */
  const conv = sets => { const top = sets.reduce((a, s) => (pgE1(name, s) > pgE1(name, a) ? s : a), sets[0]), e1 = pgE1(name, top);
    return { top, e1, w: Math.min(pgWFor(name, e1, rx.rMax, rx.rirMax), (+top.w || 0) + pgUpMax(name, +top.w || 0)) }; };
  const rangeNew = sets => { const f = sets.filter(s => +s.r > 0)[0]; return !!(f && +f.r >= rx.rMax + 3); };
  const RANGE_TIP = ' Primera vez con este rango: empieza conservador y ajusta tras la 1.ª serie.';
  if (!H.length && HA.length) {   /* en este gimnasio, solo en el otro tipo de día */
    const C = conv(HA[0].sets); w = pgRound(name, C.w, true); mode = 'first'; src = 'kref'; goal = pgRepsFor(name, C.e1, w, rx);
    why = `Aquí solo lo hiciste en un día de ${(KINDS[HA[0].kind] || '').toLowerCase()} (${pgSetTxt(C.top)}): ${fmtKg(w)} kg y busca ${goal} reps (${rx.rMin}-${rx.rMax}).${rangeNew(HA[0].sets) ? RANGE_TIP : ''}`;
  } else if (!H.length) {
    /* Nunca en este gimnasio: nunca se copian pesos de máquina entre gimnasios */
    const O = pgOtherGym(name, gymId, kind), rec = !O && typeof baseRec === 'function' ? baseRec(name) : null;
    if (O) {
      const fam = pgFam(name), free = PG_FREE.test(fam), f1 = pgFirst(O), base = O.kind === kind ? +f1.w || 0 : Math.max(0, conv(O.sets).w);
      mode = 'first'; src = 'gym';
      if (free) { w = pgRound(name, base); why = `Peso libre: el de ${gymName(O.gymId)} tal cual (${pgSetTxt(f1)}) → ${fmtKg(w)} kg.`; }
      else {
        const R = pgGymRatio(name, O.gymId, gymId);
        if (R) { w = pgRound(name, base * R.r, true); why = `Primera vez en esta máquina aquí: ${gymName(O.gymId)} ${pgSetTxt(f1)} × tu proporción entre gimnasios (${Math.round(R.r * 100)} %, por ${R.by}) → ${fmtKg(w)} kg. Ajusta tras la primera serie.`; }
        else { w = pgRound(name, base * 0.8, true); why = `Primera vez en esta máquina: ajusta tras la primera serie. Empieza conservador, un 20 % menos que en ${gymName(O.gymId)} (${pgSetTxt(f1)}) → ${fmtKg(w)} kg.`; }
      }
    } else if (rec) { const C = conv([{ w: rec.w, r: rec.r }]); w = pgRound(name, C.w, true); mode = 'first'; src = 'base'; why = `Referencia de tu récord (${fmtKg(rec.w)}×${rec.r}): ${fmtKg(w)} kg y ajusta en la 1.ª serie.`; }
    else {
      const sl = !(+ex.weight) && typeof startLoad === 'function' ? startLoad(ex) : null;
      w = sl && sl.w > 0 ? sl.w : +ex.weight || 0; mode = 'first'; src = 'new';
      why = `Primera vez: ${w ? fmtKg(w) + ' kg, ' : ''}deja ${rx.rirMax + 1} reps de sobra y busca ${rx.rMin}-${rx.rMax}; con esta sesión el coach aprende tu nivel.`;
    }
  } else {
    const L = H[0], s1 = pgFirst(L), top = +s1.w || 0, r1 = +s1.r || 0, rir1 = s1.rir != null ? +s1.rir : null, note = normName(L.note || '');
    const below = h => { const f = pgFirst(h); return +f.r > 0 && +f.r < rx.rMin; };
    w = top; mode = 'hold';
    if (PAIN.test(note)) { w = pgRound(name, top * 0.85, true); mode = 'pain'; why = `Tu nota menciona dolor: baja a ${fmtKg(w)} kg y cuida la técnica.`; }
    else if (capped && !DOWN.test(note)) {
      const st = pgCapState(H, cap); w = cap; mode = 'cap';
      if (st.m === 3) n += 1;
      goal = st.m === 0 ? Math.min(30, Math.max(rx.rMin, r1 + 1)) : Math.min(30, Math.max(rx.rMin, r1));
      why = `Peso máximo (${fmtKg(cap)} kg): no subo más. Toca ${PG_CAP_M[st.m]}${st.m === 0 ? `: busca ${goal} reps` : st.m === 3 ? ` (${n} series de ${goal})` : ` con ${goal} reps`}.${st.m ? ' Cambié de método porque te estancaste con el anterior.' : ''}`;
    }
    else if (DOWN.test(note)) { w = pgRound(name, top * 0.9, true); mode = 'down'; why = `Tu nota pedía bajar: ${fmtKg(w)} kg.`; }
    else if (rx.g === 'salud' && r1 >= rx.rMax && !(pgFull(L, rx) && pgFull(H[1], rx))) {   /* Salud: sube solo tras 2 sesiones completas en el tope */
      goal = rx.rMax; why = `Salud y energía: subes solo tras 2 sesiones completas en el tope (${rx.rMax} reps en todas las series); ${pgFull(L, rx) ? 'llevas 1' : 'aún no'}. Mantén ${fmtKg(top)} kg.`;
    }
    /* 3+ reps por encima del rango: el peso es bajo aunque el RIR sea menor que el objetivo */
    else if (r1 >= rx.rMax && (rir1 == null || rir1 >= rx.rirMax || rx.g === 'salud' || r1 - rx.rMax >= 3)) {
      const extra = r1 - rx.rMax, lb = state.settings.unit === 'lb', soft = rx.g === 'mov' || rx.g === 'salud';
      const step = rx.g === 'mov' ? Math.min(pgStep(name, top), lb ? 5 : 2.5) : pgStep(name, top);   /* Movilidad: máximo 2,5 kg por subida */
      const e1 = pgE1(name, s1), lim = rx.g === 'mov' ? step : pgUpMax(name, top);
      let by = '';
      w = top + step; goal = rx.rMin;
      if (!soft && extra >= 1 && extra <= 2) w = Math.max(w, pgRound(name, top * (1 + 0.04 * extra)));   /* 1-2 reps de más: ~4 % por rep */
      else if (!soft && extra >= 3) { w = Math.max(w, pgRound(name, pgWFor(name, e1, rx.rMax, rx.rirMax), true)); by = 'e1'; }   /* 3+: por el 1RM estimado */
      if (w > top + lim) { w = Math.max(top + step, pgRound(name, top + lim, true)); by = by ? by + '+tope' : 'tope'; }
      if (by) goal = pgRepsFor(name, e1, w, rx);   /* reps coherentes con el peso nuevo */
      mode = 'up';
      why = `Sube: 1.ª serie ${pgSetTxt(s1)} (${extra >= 3 ? `muy por encima de ${rx.rMin}-${rx.rMax}; 1RM estimado ≈ ${fmtKg(Math.round(e1))} kg` : `tope ${rx.rMax}${rir1 == null ? '' : ', RIR ' + rx.rirMax}`}) → ${fmtKg(w)} kg${/tope/.test(by) ? ` (tope de subida: +${fmtKg(w - top)} kg por sesión)` : ''} y ${goal === rx.rMin ? 'vuelve a ' + rx.rMin + ' reps' : 'busca ' + goal + ' reps'}.${rir1 == null ? ' (Sin RIR anotado: decidí por las reps.)' : ''}${extra >= 3 && !H.slice(1).some(h => { const f = pgFirst(h); return +f.r > 0 && +f.r <= rx.rMax + 2; }) ? RANGE_TIP : ''}`;
    } else if (r1 >= rx.rMax) {
      why = `Mantén: llegaste al tope (${pgSetTxt(s1)}) con menos reserva que el RIR ${rx.rirMax}; repite ${fmtKg(top)} kg.`; goal = rx.rMax;
    } else if (r1 > 0 && r1 < rx.rMin) {
      const diff = rx.rMin - r1;
      if (rx.g === 'grasa' && (diff >= 2 || (H[1] && below(H[1])))) { goal = rx.rMin; why = `Perder grasa: mantén ${fmtKg(top)} kg aunque hoy rindas menos (${pgSetTxt(s1)}) por la dieta; mantener ya es ganar.`; }
      else if (H[1] && below(H[1])) { w = Math.min(top - pgInc(name, top), pgRound(name, top * (1 - 0.04 * Math.max(1, diff)), true)); mode = 'down'; goal = rx.rMin; why = `Baja: dos sesiones sin llegar a ${rx.rMin} reps (${pgSetTxt(pgFirst(H[1]))}, ${pgSetTxt(s1)}) → ${fmtKg(w)} kg.`; }
      else if (diff === 2) { w = pgRound(name, top * (1 - 0.04 * diff), true); mode = 'down'; goal = rx.rMin; why = `Ajusta: ${pgSetTxt(s1)} quedó ${diff} reps bajo el rango (−4 % por rep) → ${fmtKg(w)} kg.`; }
      else if (diff >= 3) { const e1 = pgE1(name, s1); w = Math.min(top, pgRound(name, pgWFor(name, e1, rx.rMin, rx.rirMax), true)); mode = 'down'; goal = rx.rMin; why = `Ajusta: ${pgSetTxt(s1)} quedó ${diff} reps bajo el rango; por tu 1RM estimado (≈ ${fmtKg(Math.round(e1))} kg) → ${fmtKg(w)} kg para ${rx.rMin} reps.`; }
      else { goal = rx.rMin; why = `Mantén ${fmtKg(top)} kg: te faltó 1 rep para el mínimo (${rx.rMin}).`; }
    } else if (rir1 != null && rir1 < rx.rirMin) {
      goal = Math.max(rx.rMin, r1); why = `Mantén ${fmtKg(top)} kg: llegaste más cerca del fallo (RIR ${rir1}) que lo planeado (${pgRirTxt(rx)}).`;
    } else {
      goal = Math.min(rx.rMax, r1 + 1); why = `Mantén ${fmtKg(top)} kg y busca ${goal} reps (${pgSetTxt(s1)}); al llegar a ${rx.rMax} con RIR ${rx.rirMax}, sube.`;
    }
    const gap = daysSince(HA[0].date);
    if (gap >= 14 && mode !== 'down' && mode !== 'pain') { w = pgRound(name, w * 0.9, true); mode = 'back'; why = `Hace ${gap} días que no lo haces aquí: retoma con ${fmtKg(w)} kg (−10 %).`; }
  }
  /* Nunca por encima del peso máximo; al llegar, desde la próxima progresa con reps */
  if (cap > 0 && w > cap) { w = cap; if (mode === 'up' || mode === 'first') { mode = 'cap'; goal = rx.rMin; why = `Llegas a tu peso máximo (${fmtKg(cap)} kg): no subo más; desde ahora progresas con más reps.`; } }
  if (mode === 'cap' && kind === 'fuerza') { alt = pgHeavyAlt(name, gymId); if (alt) why += ` Para lo pesado de ${zoneName(pgMain(name)).toLowerCase()}, usa ${alt}.`; }
  if (pgDlNow()) { w = pgRound(name, w * 0.9, true); mode = 'down'; why = `Semana de descarga: la mitad de series con ${fmtKg(w)} kg (−10 %) y RIR 3.`; }
  const last = H[0] ? { date: H[0].date, reps: H[0].sets.map(s => s.r), w: +pgFirst(H[0]).w || 0 } : null;
  const gl = Array.from({ length: n }, () => goal || rx.rMin);
  return { w, mode, why, goal: gl, src, rx, n, alt, cap, rest: rx.rest, rirT: Array.from({ length: n }, (_, j) => (pgDlNow() ? 3 : pgRir(rx, j, n))), last };
}
const PG_IC = { up: '⬆', down: '⬇', hold: '→', back: '↺', pain: '⚠', first: '•', cap: '■' };
/* coachFor de toda la app (sesión, alternativas, resumen al terminar, coach semanal…) */
coachFor = function (ex, gymId, kind) {
  const c = pgCoach(ex, gymId, kind), rx = c.rx;
  const head = c.mode === 'cap' ? `<b>Peso máximo: ${fmtKg(c.w)} kg</b> · ${c.goal[0]} reps (hasta ${rx.rMax})${pgRirPart(rx)} · descanso ${pgRestTxt(rx.rest)}` : `<b>${c.mode === 'up' ? 'Sube a' : c.mode === 'down' ? 'Baja a' : c.mode === 'back' ? 'Retoma con' : c.mode === 'pain' ? 'Prudencia:' : c.mode === 'first' ? 'Empieza con' : 'Mantén'} ${fmtKg(c.w)} kg</b> · ${rx.t === 'cardio' ? c.goal[0] + ' (reps, s o m)' : rx.rMin + '-' + rx.rMax + ' reps'}${pgRirPart(rx)} · descanso ${pgRestTxt(rx.rest)}`;
  const tips = [c.why]; if (rx.g === 'grasa') tips.push(pgProtTip());
  return { w: c.w, mode: c.mode, head, goal: c.goal, tips, last: c.last ? { date: c.last.date, reps: c.last.reps, w: c.last.w } : undefined, rx, pg: c };
};
/* Coach de Próxima sesión: mismo motor, con el bloque y la Preparación del día */
nsCoachEx = function (ex, gymId, kind, ctx) {
  const c = pgCoach(ex, gymId, kind), rx = c.rx; let n = c.n, w = c.w, why = c.why, up = c.mode === 'up', rirs = c.rirT.slice(), goal = c.goal.slice();
  const M = ctx && ctx.meso;
  if (M && M.deload && !pgDlNow()) { n = Math.max(1, Math.ceil(n / 2)); w = pgRound(ex.name, (up ? w - pgStep(ex.name, w) : w) * 0.9, true); up = false; why = `Semana de descarga del bloque: ${n} ${n === 1 ? 'serie' : 'series'} con ${fmtKg(w)} kg y RIR 3.`; rirs = rirs.map(() => 3); }
  else if (M && M.plus) { n += 1; why += ' Semana final del bloque: +1 serie.'; }
  if (pgDlNow()) n = Math.max(1, Math.ceil(n / 2));
  if (ctx && ctx.ready === 'low') { n = Math.max(1, n - 1); w = pgRound(ex.name, w * 0.9, true); up = false; why += ' Hoy llegas cansado: 1 serie menos y −10 %.'; }
  else if (ctx && ctx.ready === 'mid' && up) { w = Math.max(0, w - pgStep(ex.name, w)); up = false; why += ' Hoy sin forzar: la subida queda para la próxima.'; }
  const sets = Array.from({ length: n }, (_, j) => ({ w, rMin: goal[Math.min(j, goal.length - 1)] || rx.rMin, rMax: rx.rMax, rir: rirs[Math.min(j, rirs.length - 1)] != null ? rirs[Math.min(j, rirs.length - 1)] : pgRir(rx, j, n), rest: rx.rest }));
  return { exId: ex.id, name: ex.name, sets, why: why.trim(), mode: up ? 'up' : c.mode === 'up' ? 'hold' : c.mode };
};
const _nsKeyPG = nsKey;
nsKey = function () { return _nsKeyPG.apply(this, arguments) + '|pg' + pgGoal() + (state.settings.pgDl || '') + JSON.stringify(state.settings.exType || {}).length + '|' + JSON.stringify(state.settings.exMax || {}); };

/* ---------- Duración ---------- */
const PG_WARM = 360, PG_CHANGE = 60;
/* Un ejercicio: series × (duración de la serie + descanso), sin el descanso en una superserie con el siguiente */
const pgExSec = (name, sets, rest, ss) => sets * (PG_RX[pgTypeOf(name)].dur + (ss ? 0 : rest)) + PG_CHANGE;
function pgDayEst(d) {
  const k = d.kind || kindOfName(d.name);
  return PG_WARM + d.exercises.reduce((a, e) => a + pgExSec(e.name, +e.sets || 3, pgRx(e.name, k, e).rest, !!e.ss), 0);
}
function pgDraftEst(d) { return PG_WARM + d.exercises.reduce((a, e) => a + pgExSec(e.name, e.log.length, +e.rest || pgRx(e.name, d.kind).rest, false), 0); }
const pgMin = s => Math.round(s / 60);

/* ---------- Al empezar: rangos, RIR, descansos y tiempo del coach en la sesión ---------- */
const _startSessionPG = startSession;
startSession = function (planId, dayId) {
  const r = _startSessionPG.apply(this, arguments);
  const d = state.draft; if (!d || d.dayId !== dayId || d.pgDone) return r;
  d.pgDone = 1;
  const found = findDay(planId, dayId), day = found.d;
  d.exercises.forEach(e => {
    if (e.ns === 'ia') return;   /* la importada de tu IA trae sus propios valores */
    const pe = day && day.exercises.find(x => x.id === e.exId), c = pgCoach(Object.assign({}, pe || { type: e.type }, { name: e.name, sets: e.log.length }), d.gymId, d.kind), rx = c.rx;
    e.ptype = rx.t;
    /* En su peso máximo con "una serie más": la serie extra */
    if (c.mode === 'cap' && c.n > e.log.length && e.ns !== 'coach') { const l = e.log[e.log.length - 1]; e.log.push({ w: l ? l.w : c.w, r: null, done: false, drops: [] }); e.target = e.log.length; }
    /* El RIR por serie que trae una rutina importada de tu IA se respeta; si no, el del coach */
    if (e.ns !== 'coach') { e.repsMin = rx.rMin; e.repsMax = rx.rMax; if (!(pe && Array.isArray(pe.rirT) && pe.rirT.length) || pgDlNow()) e.rirT = e.log.map((s, j) => (pgDlNow() ? 3 : pgRir(rx, j, e.log.length))); }
    e.rest = rx.rest;
    if (pgDlNow() && !(d.meso && d.meso.deload) && e.ns !== 'coach') { const keep = Math.max(1, Math.ceil(e.log.length / 2)); e.log = e.log.filter((s, j) => j < keep || s.done); e.target = e.log.length; }
  });
  d.estSec = pgDraftEst(d);
  saveDraft(); render();
  if (!isWatch()) setTimeout(() => toast(`Duración estimada: ${pgMin(d.estSec)} min (tienes ${pgAvail()})`), 600);
  return r;
};
/* Hora de cada serie marcada (para medir tus descansos reales) */
const _markSetPG = markSet;
markSet = function (i, j, v, k) {
  const d = state.draft, s = d && d.exercises[i] && d.exercises[i].log[j];
  const r = _markSetPG.apply(this, arguments);
  if (s && k == null) { if (s.done && !s.at) s.at = Date.now(); else if (!s.done) delete s.at; saveDraft(); }
  return r;
};
/* Descansos reales: entre una serie marcada y la siguiente, menos lo que dura la serie */
function pgRests(d) {
  const L = []; d.exercises.forEach(e => e.log.forEach(s => { if (s.done && s.at) L.push({ at: s.at, e }); }));
  L.sort((a, b) => a.at - b.at);
  const out = [];
  for (let i = 1; i < L.length; i++) {
    const gap = (L[i].at - L[i - 1].at) / 1000 - PG_RX[pgTypeOf(L[i].e.name)].dur;
    if (gap > 0 && gap < 900) out.push({ real: gap, rec: +L[i - 1].e.rest || pgRx(L[i - 1].e.name, d.kind).rest });
  }
  return out;
}
const pgAvg = (L, k) => (L.length ? Math.round(L.reduce((a, x) => a + x[k], 0) / L.length) : 0);
/* Lo esperado hasta ahora según lo marcado: para saber si vas atrasado */
function pgExpected(d) {
  let t = PG_WARM;
  d.exercises.forEach(e => { const n = e.log.filter(s => s.done).length; if (n) t += n * (PG_RX[pgTypeOf(e.name)].dur + (+e.rest || 90)) + PG_CHANGE; });
  return t;
}
const PG_SS_OPP = [['bic', 'tri'], ['cuad', 'isq'], ['pecho', 'esp'], ['homb', 'esp']];
const pgSsOk = name => { const t = pgTypeOf(name); return t === 'aisl' || t === 'peq' || (t === 'glu' && /^(abd|add)$/.test((libFind(name) || {}).pat || '')); };
function pgLate(d) {
  const real = (Date.now() - new Date(d.start)) / 1000, exp = pgExpected(d), late = real - exp;
  const left = d.exercises.filter(e => e.log.some(s => !s.done)), R = pgRests(d).slice(-3);
  const out = { late, real, est: d.estSec || pgDraftEst(d), tips: [], restWarn: null };
  if (R.length >= 2) { const a = pgAvg(R, 'real'), b = pgAvg(R, 'rec'); if (a > b * 1.5 && a - b > 30) out.restWarn = { a, b }; }
  if (late < 300 || !left.length) return out;
  const cut = left.filter(e => pgSsOk(e.name) && (+e.rest || 0) > pgRx(e.name, d.kind).restMin);
  if (cut.length) out.tips.push({ k: 'rest', t: `Acorta el descanso de ${cut.map(e => e.name).slice(0, 2).join(' y ')}${cut.length > 2 ? '…' : ''} a su mínimo` });
  const ss = left.filter(e => pgSsOk(e.name) && !e.log.some(s => s.done));
  if (ss.length >= 2) out.tips.push({ k: 'ss', t: `Haz ${ss[0].name} y ${ss[1].name} en superserie` });
  const small = left.filter(e => pgTypeOf(e.name) === 'peq' && e.log.filter(s => !s.done).length >= 2);
  if (small.length) out.tips.push({ k: 'drop', t: `Deja la última serie de ${small[0].name}` });
  return out;
}

/* ---------- Al terminar: duración y descansos reales frente a los recomendados ---------- */
const _finishPG = finishSession;
finishSession = function () {
  const d = state.draft, id = d && d.id, est = d ? d.estSec || pgDraftEst(d) : 0, R = d ? pgRests(d) : [];
  const r = _finishPG.apply(this, arguments);
  const s = id && !state.draft && state.sessions.find(x => x.id === id);
  if (s && est) { s.estSec = est; if (R.length) { s.restReal = pgAvg(R, 'real'); s.restRec = pgAvg(R, 'rec'); } saveLocal(); }
  return r;
};
const pgTimeLine = s => (s && s.estSec ? `Duración ${Math.round((s.durationSec || 0) / 60)} min (estimada ${pgMin(s.estSec)} min)${s.restReal ? ` · descanso medio ${pgRestTxt(Math.round(s.restReal / 5) * 5)} (recomendado ${pgRestTxt(Math.round(s.restRec / 5) * 5)})` : ''}` : '');
const _fsHtmlPG = fsHtml;
fsHtml = function (s) {
  const h = _fsHtmlPG.apply(this, arguments), t = pgTimeLine(s); if (!t || isWatch()) return h;
  const k = h.indexOf('<div class="dd-acts'); const line = `<div class="muted pg-time">${ic('timer', 15)} ${t}</div>`;
  return k < 0 ? h + line : h.slice(0, k) + line + h.slice(k);
};
const _aixSessLinePG = aixSessLine;
aixSessLine = function (s) {
  const t = _aixSessLinePG.apply(this, arguments), x = pgTimeLine(s); if (!x) return t;
  const k = t.indexOf('\n'); return k < 0 ? t + ' · ' + x : t.slice(0, k) + ' · ' + x + t.slice(k);
};

/* ---------- Volumen del plan por músculo (10-20 series) ---------- */
function pgPlanVol(plan) {
  const v = {}; MM_MAIN.forEach(k => { v[k] = 0; });
  (plan ? plan.days : []).forEach(d => d.exercises.forEach(e => { const sh = zoneShares(e.name), n = +e.sets || 0; for (const k in sh) if (v[k] != null) v[k] += sh[k] * n; }));
  return v;
}
function pgVolAdvice(plan) {
  const v = pgPlanVol(plan), low = MM_MAIN.filter(k => v[k] < WC_MIN).sort((a, b) => v[a] - v[b]), high = MM_MAIN.filter(k => v[k] > WC_MAX);
  const inPlan = n => plan.days.some(d => d.exercises.some(e => exSame(e.name, n)));
  const adds = low.map(k => {
    const need = Math.ceil(WC_MIN - v[k]), own = [];
    plan.days.forEach(d => d.exercises.forEach(e => { if (pgMain(e.name) === k) own.push({ d, e }); }));
    if (own.length && need <= 2 * own.length) return { k, need, more: own[0], v: v[k] };
    const name = pgPrefer(typeof wcCands === 'function' ? wcCands(k) : []).find(n => !inPlan(n));
    return { k, need, add: name || null, v: v[k] };
  });
  const cuts = high.map(k => { let big = null; plan.days.forEach(d => d.exercises.forEach(e => { if (pgMain(e.name) === k && (!big || +e.sets > +big.e.sets)) big = { d, e }; })); return { k, over: Math.floor(v[k] - WC_MAX), big, v: v[k] }; });
  return { v, adds, cuts };
}
function pgVolCard(plan) {
  if (!plan || !plan.days.length) return '';
  const A = pgVolAdvice(plan), v = A.v;
  const chip = k => `<span class="pg-vc ${v[k] < WC_MIN ? 'low' : v[k] > WC_MAX ? 'high' : 'ok'}">${zoneName(k)} <b class="num">${wcR(v[k])}</b></span>`;
  const lines = A.adds.map(a => `<li>${zoneName(a.k)}: ${wcR(a.v)}/${WC_MIN} → ${a.more ? `suma ${a.need} ${a.need === 1 ? 'serie' : 'series'} a ${esc(a.more.e.name)} <button type="button" class="btn small" data-pg="vol-more" data-plan="${plan.id}" data-day="${a.more.d.id}" data-ex="${a.more.e.id}" data-n="${Math.min(a.need, 2)}">+${Math.min(a.need, 2)} ${Math.min(a.need, 2) === 1 ? 'serie' : 'series'}</button>` : a.add ? `agrega ${esc(a.add)} (${Math.min(4, Math.max(2, a.need))} series) <button type="button" class="btn small" data-pg="vol-add" data-plan="${plan.id}" data-k="${a.k}" data-name="${esc(a.add)}" data-n="${Math.min(4, Math.max(2, a.need))}">Agregar</button>` : 'agrega un ejercicio para ese músculo'}</li>`)
    .concat(A.cuts.map(c => `<li>${zoneName(c.k)}: ${wcR(c.v)} (más de ${WC_MAX}) → ${c.big ? `quita ${c.over} ${c.over === 1 ? 'serie' : 'series'} de ${esc(c.big.e.name)} <button type="button" class="btn small" data-pg="vol-cut" data-plan="${plan.id}" data-day="${c.big.d.id}" data-ex="${c.big.e.id}">−1 serie</button>` : ''}</li>`));
  return `<div class="card pg-vol"><h3>${ic('person-standing', 17)} Series por músculo en tu plan</h3>
    <div class="muted" style="font-size:12.5px">Meta: ${WC_MIN}-${WC_MAX} series por semana (principal = 1, los que ayudan = ½).</div>
    <div class="pg-vcs">${MM_MAIN.map(chip).join('')}</div>
    ${lines.length ? `<ul class="pg-vl">${lines.join('')}</ul>` : `<div class="muted" style="font-size:12.5px">Todos los músculos entre ${WC_MIN} y ${WC_MAX}. ¡Bien!</div>`}</div>`;
}

/* ---------- Ajustar un día a tu tiempo (en orden y sin bajar de 10 series por músculo) ---------- */
function pgFit(plan, day) {
  const avail = pgAvail() * 60, k = day.kind || kindOfName(day.name), est0 = pgDayEst(day), props = [];
  let est = est0;
  if (est <= avail) return { est0, est, props, avail };
  const ex = day.exercises, inSs = i => !!(ex[i].ss || (i > 0 && ex[i - 1].ss));
  /* 1. Superseries: aislamiento o músculos opuestos, nunca compuestos pesados */
  const free = ex.map((e, i) => i).filter(i => pgSsOk(ex[i].name) && !inSs(i)), used = {};
  const pair = (a, b) => { used[a] = used[b] = 1; const sv = Math.min(+ex[a].sets || 3, +ex[b].sets || 3) * pgRx(ex[a].name, k, ex[a]).rest; props.push({ k: 'ss', a: ex[a].id, b: ex[b].id, save: sv, t: `Superserie: ${ex[a].name} + ${ex[b].name}` }); est -= sv; };
  PG_SS_OPP.forEach(([m1, m2]) => { const a = free.find(i => !used[i] && pgMain(ex[i].name) === m1), b = free.find(i => !used[i] && i !== a && pgMain(ex[i].name) === m2); if (est > avail && a != null && b != null) pair(a, b); });
  while (est > avail) { const L = free.filter(i => !used[i]); if (L.length < 2) break; pair(L[0], L[1]); }
  /* 2. Acortar descansos (solo aislamiento y pequeños, nunca bajo el mínimo del tipo) */
  if (est > avail) ex.forEach(e => { const t = pgTypeOf(e.name), rx = pgRx(e.name, k, e); if (est > avail && (t === 'aisl' || t === 'peq') && rx.rest > rx.restMin) { const sv = (+e.sets || 3) * (rx.rest - rx.restMin); props.push({ k: 'rest', e: e.id, v: rx.restMin, save: sv, t: `Descanso de ${e.name}: ${pgRestTxt(rx.rest)} → ${pgRestTxt(rx.restMin)}` }); est -= sv; } });
  /* 3. Pasar una serie a otro día con menos carga (mismo músculo: la semana no cambia) */
  if (est > avail) {
    const others = plan.days.filter(d => d !== day).map(d => ({ d, t: pgDayEst(d) })).sort((a, b) => a.t - b.t);
    for (const e of ex.slice().sort((a, b) => (pgTypeOf(a.name) === 'comp') - (pgTypeOf(b.name) === 'comp'))) {
      if (est <= avail || (+e.sets || 0) < 3) continue;
      const m = pgMain(e.name), T = others.find(o => o.t + 180 < avail && o.d.exercises.some(x => pgMain(x.name) === m));
      if (!T) continue;
      const to = T.d.exercises.find(x => pgMain(x.name) === m && pgTypeOf(x.name) === pgTypeOf(e.name)) || T.d.exercises.find(x => pgMain(x.name) === m), sv = PG_RX[pgTypeOf(e.name)].dur + pgRx(e.name, k, e).rest;
      props.push({ k: 'move', e: e.id, to: T.d.id, toEx: to.id, save: sv, t: `1 serie de ${e.name} → ${to.name} (${WD[T.d.weekday]} · ${T.d.name})` }); est -= sv; T.t += sv;
    }
  }
  /* 4. Quitar el menos prioritario, si sus músculos siguen en 10+ (con aviso) */
  if (est > avail) {
    const v = pgPlanVol(plan), prio = { peq: 0, aisl: 1, glu: 2, comp: 3 };
    const ok = e => { const sh = zoneShares(e.name); return Object.keys(sh).every(m => v[m] == null || v[m] - sh[m] * (+e.sets || 0) >= WC_MIN); };
    const c = ex.filter(e => pgTypeOf(e.name) !== 'comp' && ok(e)).sort((a, b) => prio[pgTypeOf(a.name)] - prio[pgTypeOf(b.name)])[0];
    if (c) { const sv = pgExSec(c.name, +c.sets || 3, pgRx(c.name, k, c).rest, false); props.push({ k: 'del', e: c.id, save: sv, t: `Quitar ${c.name} de este día (sus músculos siguen en ${WC_MIN}+ series)` }); est -= sv; }
  }
  return { est0, est, props, avail };
}
function pgFitSheet(planId, dayId) {
  const { p, d } = findDay(planId, dayId); if (!p || !d) return;
  const F = pgFit(p, d);
  state.pgFitC = state.pgFitC && state.pgFitC.day === dayId ? state.pgFitC : { day: dayId };
  openSheet(`<div class="row"><h2 class="grow">Ajustar a tu tiempo</h2><button class="icon-btn" data-act="sheet-close" aria-label="Cerrar">${ic('x', 18)}</button></div>
    <div class="muted" style="font-size:13px"><b>${esc(d.name)}</b>: ≈ ${pgMin(F.est0)} min; tienes ${pgMin(F.avail)} min (Tus datos). En este orden, sin bajar de ${WC_MIN} series por músculo a la semana:</div>
    ${F.props.length ? `<div class="pg-fits">${F.props.map((x, i) => `<div class="pg-fit-r"><span class="grow">${i + 1}. ${esc(x.t)} <small class="muted">(−${pgMin(x.save)} min)</small></span>
      <button type="button" class="btn small ${x.k === 'del' && state.pgFitC.del === x.e ? 'danger' : ''}" data-pg="fit" data-i="${i}" data-plan="${planId}" data-day="${dayId}">${x.k === 'del' ? (state.pgFitC.del === x.e ? '¿Quitar? Toca otra vez' : 'Quitar…') : 'Aplicar'}</button></div>`).join('')}</div>
      <div class="muted" style="font-size:12.5px">Con todo: ≈ ${pgMin(F.est)} min.</div>` : `<div class="muted">${F.est0 <= F.avail ? 'Ya cabe en tu tiempo.' : 'No encontré ajustes que respeten tus series semanales: sube tu tiempo disponible o divide el día.'}</div>`}
    <button type="button" class="btn block" data-act="sheet-close">Listo</button>`);
}
function pgFitApply(planId, dayId, i) {
  const { p, d } = findDay(planId, dayId); if (!p || !d) return;
  const x = pgFit(p, d).props[i]; if (!x) return;
  const byId = id => d.exercises.find(e => e.id === id);
  if (x.k === 'ss') { const a = d.exercises.findIndex(e => e.id === x.a), b = d.exercises.findIndex(e => e.id === x.b), B = d.exercises.splice(b, 1)[0]; d.exercises.splice(d.exercises.findIndex(e => e.id === x.a) + 1, 0, B); d.exercises[d.exercises.findIndex(e => e.id === x.a)].ss = 1; void a; }
  else if (x.k === 'rest') { const e = byId(x.e); if (e) e.pgRest = x.v; }
  else if (x.k === 'move') { const e = byId(x.e), T = p.days.find(z => z.id === x.to), t = T && T.exercises.find(z => z.id === x.toEx); if (e && t) { e.sets = +e.sets - 1; t.sets = +t.sets + 1; } }
  else if (x.k === 'del') {
    if (state.pgFitC.del !== x.e) { state.pgFitC.del = x.e; return pgFitSheet(planId, dayId); }
    d.exercises = d.exercises.filter(e => e.id !== x.e); state.pgFitC.del = null;
  }
  savePlans(); toast('Listo: ' + x.t); pgFitSheet(planId, dayId); render();
}

/* ---------- Semana de descarga: varios ejercicios bajo el mínimo dos sesiones seguidas ---------- */
function pgStalls(plan) {
  if (!plan || pgGoal() === 'grasa') return [];   /* perder grasa: no se baja el peso por rendir menos */
  const g = plan.gymId || 'rokaz', out = [], seen = {};
  plan.days.forEach(d => { const k = d.kind || kindOfName(d.name); d.exercises.forEach(e => {
    const key = exHKey(e.name) + k; if (seen[key]) return; seen[key] = 1;
    const rx = pgRx(e.name, k, e); if (rx.t === 'cardio') return;
    const H = exHistory(e.name, g, k, 12).filter(h => h.kind === k);
    if (H.length >= 2 && H.slice(0, 2).every(h => { const f = pgFirst(h); return +f.r > 0 && +f.r < rx.rMin; })) out.push(e.name);
  }); });
  return out;
}
function pgDlCard() {
  const plan = activePlan(), L = pgStalls(plan), key = wkKey(new Date()) + ':' + L.join(',');
  if (L.length < 2 || pgDlNow() || state.settings.pgDlOff === key) return '';
  return `<div class="card pg-dl">${ic('battery', 18)}<div class="grow"><b>Semana de descarga recomendada</b><div class="muted" style="font-size:12.5px">${L.length} ejercicios no llegaron al mínimo de su rango dos sesiones seguidas: ${esc(L.slice(0, 4).join(', '))}${L.length > 4 ? '…' : ''}. Esta semana: la mitad de series, −10 % de peso y RIR 3.</div>
    <div class="row" style="gap:8px;margin-top:8px"><button type="button" class="btn small primary" data-pg="dl-on">Hacer descarga esta semana</button><button type="button" class="btn small" data-pg="dl-off" data-k="${esc(key)}">Ahora no</button></div></div></div>`;
}

/* ---------- Pantallas (teléfono): Mi plan, Hoy, opción Coach y la sesión ---------- */
function pgCoachWhy(planId, dayId) {
  const C = nsCoachEntry(planId, dayId); if (!C) return '';
  return `<div class="pg-why">${C.ex.map(x => { const s = x.sets[0] || {}; return `<div class="pg-wr ${x.mode || ''}"><span class="pg-wi">${PG_IC[x.mode] || '→'}</span><span class="grow"><b>${esc(x.name)}</b> · ${fmtKg(s.w || 0)} kg × ${s.rMin === s.rMax ? s.rMax : s.rMin + '-' + s.rMax}<small>${esc(x.why || '')}</small></span></div>`; }).join('')}</div>`;
}
const _renderPG = render;
render = function () {
  const r = _renderPG.apply(this, arguments);
  if (isWatch()) return r;
  const app = $('#app'); if (!app) return r;
  const d = state.draft;
  if (d && app.querySelector('#sx')) {   /* sesión: atraso y descansos */
    const sx = app.querySelector('#sx'), at = sx.querySelector('#sx-strip') || sx.querySelector('.sx-top');
    sx.querySelectorAll('#sx-pager > .sx-page').forEach(pg => {
      const card = pg.querySelector('.card.ex'), i = +pg.dataset.i, pills = card && card.querySelector('.su-pills'); if (!pills || pills.querySelector('.pg-reg')) return;
      const h = pgRegPill(d, i); if (!h) return; pills.insertAdjacentHTML('afterbegin', h);
      if (state.pgRegEd === i) pills.insertAdjacentHTML('afterend', pgRegHtml(d, i));   /* el formulario solo mientras editas */
    });
    if (at && !sx.querySelector('.pg-late')) {
      const L = pgLate(d);
      const html = (L.late >= 300 && L.tips.length ? `<div class="pg-late">${ic('timer', 16)}<div class="grow"><b>Vas ${pgMin(L.late)} min atrasado</b> (≈ ${pgMin(L.real + (L.est - pgExpected(d)))} de ${pgAvail()} min). Para terminar a tiempo: ${L.tips.map(t => esc(t.t)).join('; ')}.${L.tips.some(t => t.k === 'rest') ? ` <button type="button" class="btn small" data-pg="late-rest">Acortar descansos</button>` : ''}</div></div>` : '')
        + (L.restWarn ? `<div class="pg-late rest">${ic('timer', 16)}<div class="grow">Tus descansos van en <b>${pgRestTxt(Math.round(L.restWarn.a / 5) * 5)}</b> de media; lo recomendado es ${pgRestTxt(Math.round(L.restWarn.b / 5) * 5)}.</div></div>` : '');
      if (html) at.insertAdjacentHTML('afterend', html);
    }
    return r;
  }
  if (state.tab === 'train') {
    const go = app.querySelector('.hoy-hero #btn-start'), box = app.querySelector('.hoy-hero .ns-box');
    if (go && box && nsPick(go.dataset.day) === 'coach' && !app.querySelector('.hoy-hero .pg-why')) box.insertAdjacentHTML('afterend', pgCoachWhy(go.dataset.plan, go.dataset.day));
    if (go && !app.querySelector('.pg-est')) { const f = findDay(go.dataset.plan, go.dataset.day); if (f.d) go.insertAdjacentHTML('afterend', `<div class="muted pg-est">${ic('timer', 14)} ≈ ${pgMin(pgDayEst(f.d))} min de ${pgAvail()} disponibles</div>${pgGoal() === 'grasa' ? `<div class="muted pg-est pg-prot">${ic('beef', 14)} ${esc(pgProtTip())}</div>` : ''}`); }
    const dl = pgDlCard(); if (dl && !app.querySelector('.pg-dl')) { const at = app.querySelector('.hoy-avisos') || app.querySelector('.hoy-hero'); if (at) at.insertAdjacentHTML(at.classList.contains('hoy-avisos') ? 'afterbegin' : 'afterend', dl); }
  }
  if (state.tab === 'plans') {
    app.querySelectorAll('.rt-exm[data-plan][data-day][data-k]').forEach(b => {
      const { p, d: day } = findDay(b.dataset.plan, b.dataset.day), e = day && day.exercises[+b.dataset.k]; if (!e || b.dataset.pg) return;
      b.dataset.pg = 1;
      const k = day.kind || kindOfName(day.name), c = pgCoach(e, p.gymId || 'rokaz', k), rx = c.rx, sm = b.querySelector('small'); if (!sm) return;
      sm.innerHTML = `<span class="pg-ty">${PG_T[rx.t]}</span> · ${e.sets} × ${c.goal[0] && c.goal[0] !== rx.rMin ? c.goal[0] + ' (' + rx.rMin + '-' + rx.rMax + ')' : rx.rMin + '-' + rx.rMax} · <b>${fmtKg(c.w)} kg</b>${e.bar || barFor(e.name) ? ' + barra' : ''}${pgRirPart(rx)} · ${pgRestTxt(rx.rest)}${e.ss ? ' · superserie' : ''}${c.mode === 'cap' ? ' · peso máximo' : ''} <span class="pg-mi">${PG_IC[c.mode] || ''}</span>`;
    });
    app.querySelectorAll('.rt-head[data-day]').forEach(h => {
      const sm = h.querySelector('small'); if (!sm || sm.querySelector('.pg-dur')) return;
      let day = null, plan = null; for (const p of state.plans) { const x = p.days.find(z => z.id === h.dataset.day); if (x) { day = x; plan = p; break; } }
      if (!day) return;
      const est = pgDayEst(day), over = est > pgAvail() * 60;
      sm.insertAdjacentHTML('beforeend', ` · <span class="pg-dur ${over ? 'over' : ''}">≈ ${pgMin(est)} min</span>`);
      const body = h.parentNode && h.parentNode.querySelector('.rt-body .rt-actions');
      if (over && body && !h.parentNode.querySelector('.pg-fitb')) body.insertAdjacentHTML('beforebegin', `<div class="pg-fitb safe warn">${ic('timer', 16)}<span>≈ ${pgMin(est)} min: pasa de tus ${pgAvail()} min. <button type="button" class="btn small" data-pg="fit-open" data-plan="${plan.id}" data-day="${day.id}">Ver cómo ajustarlo</button></span></div>`);
    });
    app.querySelectorAll('.rt-actions').forEach(a => {
      const st = a.querySelector('[data-act="start"]'), box = a.previousElementSibling; if (!st || !box || !box.classList.contains('ns-box') || nsPick(st.dataset.day) !== 'coach' || (box.nextElementSibling && box.nextElementSibling.classList.contains('pg-why'))) return;
      box.insertAdjacentHTML('afterend', pgCoachWhy(st.dataset.plan, st.dataset.day));
    });
    if (state.tab === 'plans' && !app.querySelector('.pg-vol')) { const plan = activePlan(), html = pgVolCard(plan), at = app.querySelector('.rt-quick') || app.querySelector('.rt-plan'); if (html && at) at.insertAdjacentHTML('afterend', html); }
    const dl = pgDlCard(); if (dl && !app.querySelector('.pg-dl')) { const at = app.querySelector('.rt-plan'); if (at) at.insertAdjacentHTML('beforebegin', dl); }
  }
  return r;
};
window.addEventListener('click', ev => {
  const b = ev.target.closest && ev.target.closest('[data-pg]'); if (!b) return;
  ev.preventDefault(); ev.stopPropagation();
  const a = b.dataset.pg;
  if (a === 'fit-open') return pgFitSheet(b.dataset.plan, b.dataset.day);
  if (a === 'fit') return pgFitApply(b.dataset.plan, b.dataset.day, +b.dataset.i);
  if (a === 'dl-on') { state.settings.pgDl = wkKey(new Date()); savePlans(); render(); return toast('Semana de descarga: la mitad de series, −10 % y RIR 3. La próxima semana vuelves a progresar.'); }
  if (a === 'dl-off') { state.settings.pgDlOff = b.dataset.k; savePlans(); return render(); }
  if (a === 'late-rest') { const d = state.draft; if (!d) return; let n = 0; d.exercises.forEach(e => { if (pgSsOk(e.name) && e.log.some(s => !s.done)) { const m = pgRx(e.name, d.kind).restMin; if (+e.rest > m) { e.rest = m; n++; } } }); saveDraft(); render(); return toast(n ? `Descansos al mínimo en ${n} ${n === 1 ? 'ejercicio' : 'ejercicios'} (solo hoy).` : 'Ya están al mínimo.'); }
  const { p, d } = findDay(b.dataset.plan, b.dataset.day || ''), e = d && d.exercises.find(x => x.id === b.dataset.ex);
  if (a === 'vol-more' && e) { e.sets = +e.sets + (+b.dataset.n || 1); savePlans(); render(); return toast(`${e.name}: ${e.sets} series.`); }
  if (a === 'vol-cut' && e) { e.sets = Math.max(1, +e.sets - 1); savePlans(); render(); return toast(`${e.name}: ${e.sets} series.`); }
  if (a === 'vol-add') {
    const plan = state.plans.find(x => x.id === b.dataset.plan), x = libFind(b.dataset.name); if (!plan || !x) return;
    const day = plan.days.slice().sort((u, v) => pgDayEst(u) - pgDayEst(v))[0], ne = exFromLib(x); ne.sets = +b.dataset.n || 3;
    day.exercises.push(ne); savePlans(); render(); return toast(`Agregado a ${day.name}: ${x.name} (${ne.sets} series).`);
  }
  void p;
}, true);

/* ---------- Ficha del ejercicio: tipo para el coach (se puede cambiar a mano) ---------- */
function pgTypeRow(name) {
  const o = (state.settings.exType || {})[exHKey(name)], auto = (() => { const x = libFind(name); return x ? x.ptype : pgByName(name); })(), cur = o || auto;
  return `<div class="pg-type" data-name="${esc(name)}"><div class="label">Tipo para el coach${o ? '' : ' (automático)'}</div>
    <div class="seg pg-tseg">${Object.keys(PG_T).map(t => `<button type="button" class="${cur === t ? 'on' : ''}" data-pg-t="${t}">${PG_T[t]}</button>`).join('')}</div>
    <div class="muted" style="font-size:12px">${(() => { const rx = pgRx(name, 'fuerza'), rb = pgRx(name, 'bombeo'); return rx.t === 'cardio' ? `Sin progresión de peso: el coach suma un poco de reps, segundos o metros. Descanso ${pgRestTxt(rx.rest)}` : `Pesado ${rx.rMin}-${rx.rMax} reps, RIR ${pgRirTxt(rx)}, ${pgRestTxt(rx.rest)} · Bombeo ${rb.rMin}-${rb.rMax}, RIR ${pgRirTxt(rb)}, ${pgRestTxt(rb.rest)}${rx.expl ? ' · explosivo: nunca al fallo' : ''}`; })()}${o ? ` · <button type="button" class="pg-tauto" data-pg-t="auto">Volver a ${PG_T[auto]}</button>` : ''}</div></div>`;
}
const _exActionsPG = exActions;
exActions = function (key) {
  const r = _exActionsPG.apply(this, arguments), x = LIB.find(y => y.key === key), sc = document.querySelector('#sheet .sheet-card');
  if (x && sc && !sc.querySelector('.pg-type')) { const h = pgGymRow(x.name) + pgTypeRow(x.name) + pgMaxRow(x.name), at = sc.querySelector('.ex-actions'); if (at) at.insertAdjacentHTML('beforebegin', h); else sc.insertAdjacentHTML('beforeend', h); }
  return r;
};
const _exSheetPG = exSheet;
exSheet = function (pid, did, k, preset) {
  const r = _exSheetPG.apply(this, arguments), f = findDay(pid, did), e = preset || (f.d && f.d.exercises[k]), sc = document.querySelector('#sheet .sheet-card');
  if (e && e.name && sc && !sc.querySelector('.pg-type')) { const form = sc.querySelector('form'); if (form) form.insertAdjacentHTML('afterend', pgTypeRow(e.name) + pgMaxRow(e.name) + pgGymRow(e.name)); }
  return r;
};
window.addEventListener('click', ev => {
  const b = ev.target.closest && ev.target.closest('[data-pg-t]'); if (!b) return;
  ev.preventDefault(); ev.stopPropagation();
  const box = b.closest('.pg-type'), name = box && box.dataset.name; if (!name) return;
  const T = Object.assign({}, state.settings.exType || {}), k = exHKey(name);
  if (b.dataset.pgT === 'auto') delete T[k]; else T[k] = b.dataset.pgT;
  state.settings.exType = T; savePlans();
  box.outerHTML = pgTypeRow(name);
  toast(b.dataset.pgT === 'auto' ? 'Tipo automático.' : `${name}: ${PG_T[b.dataset.pgT]} para el coach.`);
}, true);

/* ---------- 9. Exportaciones: el sistema del coach para la IA ---------- */
function pgSystemTxt() {
  const g = pgGoal(), set = goalSet && goalSet(), row = t => { const f = PG_RX[t].f, b = PG_RX[t].b; return `- ${PG_T[t]}: pesado ${f[0]}-${f[1]} reps (RIR ${f[2]}-${f[3]}), bombeo ${b[0]}-${b[1]} (RIR ${b[2]}-${b[3]}), descanso ${PG_RX[t].rest[0]}-${PG_RX[t].rest[1]} s`; };
  return [`SISTEMA DE MI COACH (doble progresión autorregulada; recomiéndame con esta misma lógica):`,
    `- Objetivo: ${PG_GOALS[g]}${set ? '' : ' (por defecto: no lo elegí)'}: ${PG_GOAL_RULE[g]}. Tiempo disponible por sesión: ${pgAvail()} min.`,
    row('comp'), row('aisl'), row('glu'), row('peq'),
    `- Cardio / acondicionamiento (escaladores, burpees, trineo, paseo del granjero…): sin progresión de peso; sumar un poco de tiempo, reps o metros. Explosivos (cargadas, thrusters, arranques): 3-6 reps, RIR 2 o más, nunca al fallo.`,

    `- Subir: si en la 1.ª serie llego al tope del rango con el RIR más alto, la próxima vez sube al siguiente escalón (+2,5 kg tren superior, +5 kg piernas, o el siguiente disco de la máquina) y vuelvo al mínimo de reps.`,
    `- Fuera del rango: ajusta la carga ~4 % por rep de diferencia. Dos sesiones bajo el mínimo: mantener o bajar; si pasa en varios ejercicios, semana de descarga.`,
    `- RIR 0 solo en máquinas y aislamiento (nunca en prensa, hack, sentadilla ni peso muerto pesados). Descanso mínimo de 90 s en compuestos, también en bombeo.`,
    `- El día pesado y el de bombeo de un mismo ejercicio progresan por separado. Meta: ${WC_MIN}-${WC_MAX} series por músculo a la semana.`,
    `- Cada sesión dice en qué gimnasio fue y el punto de partida es mi última vez en ESE gimnasio. Los pesos en máquinas, poleas y Smith NO son comparables entre gimnasios (la misma máquina en otro gimnasio puede pesar muy distinto); en peso libre (barra, mancuernas) sí.`].filter(Boolean).join('\n');
}
const _sessionPromptPG = sessionPrompt;
sessionPrompt = function () { return aixPutGym(_sessionPromptPG.apply(this, arguments), pgSystemTxt()); };
const _aixWeekTextPG = aixWeekText;
aixWeekText = function () { const R = _aixWeekTextPG.apply(this, arguments); R.txt = aixPutGym(R.txt, pgSystemTxt()); return R; };
bootRender();
