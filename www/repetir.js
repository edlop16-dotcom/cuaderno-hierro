/* ==========================================================================
   Repetir un entreno (rama repetir-entreno). Solo el teléfono: el reloj no cambia.
   Al abrir un entreno pasado (Racha, semanas anteriores: el detalle del día, daySheet) → "Repetir este entreno":
   1. Un resumen para revisar antes de empezar (rpSheet): los mismos ejercicios, en el mismo orden y con las mismas
      superseries de ese día, con su tipo de día (Pesado o Bombeo) y la opción de cambiarlo.
   2. Peso y reps: los del coach de siempre (pgCoach, la misma regla que una sesión normal: tu última vez en ese
      ejercicio y ese gimnasio en el mismo tipo de día), nunca los pesos de ese día. Ese día se muestra de referencia.
   3. Sin el equipo en este gimnasio: el reemplazo de siempre (altBest; alts.js lo aplica al empezar).
   4. Músculos en sus 48 h de descanso (restMap): aviso con Quitar o Mantener.
   La sesión empieza como el entreno para completar: una rutina temporal 'rep' que se quita enseguida (rpStart);
   sus cambios (reemplazar, agregar, superserie) son solo para hoy y no tocan tus rutinas.
   ========================================================================== */
const rp = { sid: null, kind: null, drop: {} };
const rpKindTxt = k => (k === 'fuerza' ? 'Pesado' : 'Bombeo');
const rpSetTxt = x => (+x.w ? fmtKg(+x.w) + '×' + (x.r || 0) : (x.r || 0) + ' reps');
const rpRefTxt = sets => sets.map(rpSetTxt).join(' · ');
/* Los ejercicios de ese día, en su orden, con las superseries juntas (e.ss = letra guardada al terminar) */
function rpExercises(s) {
  const L = s.exercises.filter(e => e && e.name && (e.sets || []).length);
  const out = []; L.forEach(e => { if (out.indexOf(e) >= 0) return; out.push(e); if (e.ss) L.forEach(f => { if (f !== e && f.ss === e.ss && out.indexOf(f) < 0) out.push(f); }); });
  return out;
}
/* Lo que quedará: sin los músculos que decidiste quitar; las superseries se recalculan con los que quedan */
function rpPlanList(s, gid) {
  const R = typeof restMap === 'function' ? restMap() : {};
  return rpExercises(s).map(e => {
    const k = typeof wcMain === 'function' ? wcMain(e.name) : null, rest = k && R[k] && R[k].block ? R[k] : null;
    const m = typeof exMissing === 'function' ? exMissing(e.name, gid) : null, miss = m ? (typeof eqName === 'function' ? eqName(m) : m).toLowerCase() : null;
    const alt = miss && typeof altBest === 'function' ? altBest(e.name, gid, new Set(s.exercises.map(x => x.name)), rp.kind) : null;
    return { e, k, rest, drop: !!(rest && rp.drop[k]), miss, alt };
  });
}
function rpSsTags(list) {
  const kept = list.filter(o => !o.drop), cnt = {}; kept.forEach(o => { if (o.e.ss) cnt[o.e.ss] = (cnt[o.e.ss] || 0) + 1; });
  const pos = {}; return list.map(o => { if (o.drop || !o.e.ss || cnt[o.e.ss] < 2) return ''; pos[o.e.ss] = (pos[o.e.ss] || 0) + 1; return (o.e.ss === 'S' ? 'SS' : o.e.ss) + pos[o.e.ss]; });
}
/* Recomendación de hoy: el coach de siempre con el tipo elegido (la sesión usa exactamente este cálculo) */
function rpRec(name, sets, gid) {
  try {
    const c = pgCoach({ name, sets }, gid, rp.kind), rx = c.rx, bw = c.bw || (typeof pgIsBw === 'function' && pgIsBw(name) && !c.w);
    return { txt: `${bw ? 'peso corporal' : fmtKg(c.w) + ' kg'} × ${c.goal[0]}${rx.sec ? ' s' : ''} · ${c.n} ${c.n === 1 ? 'serie' : 'series'} · RIR ${pgRirTxt(rx)}`, why: String(c.why || '').replace(/<[^>]+>/g, ''), w: c.w, n: c.n };
  } catch (e) { return { txt: '', why: '' }; }
}
function rpSheet(sid) {
  if (isWatch()) return;
  const s = state.sessions.find(x => x.id === sid); if (!s) return;
  if (rp.sid !== sid) { rp.sid = sid; rp.kind = sKind(s) === 'bombeo' ? 'bombeo' : 'fuerza'; rp.drop = {}; }
  const g = activeGym().id, L = rpPlanList(s, g), tags = rpSsTags(L), busy = !!state.draft, keep = L.filter(o => !o.drop).length;
  const restKs = []; L.forEach(o => { if (o.rest && restKs.indexOf(o.k) < 0) restKs.push(o.k); });
  const chip = (on, a, v, l) => `<button type="button" class="qk-chip ${on ? 'on' : ''}" data-rp="${a}" data-v="${v}" aria-pressed="${on}">${l}</button>`;
  const row = (o, i) => {
    if (o.drop) return `<div class="rp-ex off"><span class="grow"><b>${esc(o.e.name)}</b><small class="muted">Quitado: ${esc(zoneName(o.k).toLowerCase())} descansa hoy</small></span></div>`;
    const name = o.alt || o.e.name, R = o.alt ? null : rpRec(name, o.e.sets.length, g);
    return `<div class="rp-ex">${thumb(name)}<span class="grow"><b>${tags[i] ? `<span class="rp-ss">${esc(tags[i])}</span> ` : ''}${esc(name)}</b>
      ${o.alt ? `<small class="rp-alt">No hay ${esc(o.miss)} en ${esc(gymName(g))}: va ${esc(o.alt)} en vez de ${esc(o.e.name)} (el peso se ajusta al empezar)</small>` : o.miss ? `<small class="rp-alt">No hay ${esc(o.miss)} en ${esc(gymName(g))} y no encontré un reemplazo: lo verás al empezar</small>` : ''}
      ${R && R.txt ? `<small class="rp-rec">Hoy: <b>${esc(R.txt)}</b></small>` : ''}
      <small class="muted rp-ref">Ese día: ${esc(rpRefTxt(o.e.sets))}</small></span></div>`;
  };
  openSheet(`<div class="row"><h2 class="grow">Repetir este entreno</h2><button class="icon-btn" data-act="sheet-close" aria-label="Cerrar">${ic('x', 18)}</button></div>
    <div class="muted" style="font-size:13px"><b>${esc(s.dayName || 'Entreno')}</b> · ${fmtDate(s.date, true)}${sGym(s) !== g ? ` · ese día fue en ${esc(s.gymName || gymName(sGym(s)))}; hoy, en ${esc(gymName(g))}` : ` · ${esc(gymName(g))}`}</div>
    <div class="label">Tipo de día</div><div class="qk-chips">${chip(rp.kind === 'fuerza', 'kind', 'fuerza', 'Pesado')}${chip(rp.kind === 'bombeo', 'kind', 'bombeo', 'Bombeo')}</div>
    ${restKs.length ? `<div class="safe warn rp-rest">${ic('timer', 16)}<div class="grow"><b>Músculos en sus 48 h de descanso</b>${restKs.map(k => { const R = L.find(o => o.k === k).rest; return `<div class="rp-rk"><span class="grow">${esc(restWhy(k, R))}</span>${chip(!rp.drop[k], 'keep', k, 'Mantener')}${chip(!!rp.drop[k], 'drop', k, 'Quitar')}</div>`; }).join('')}</div></div>` : ''}
    <div class="muted" style="font-size:12.5px">Peso y reps: el coach con tu última vez en cada ejercicio en un día ${rpKindTxt(rp.kind).toLowerCase()}, no los pesos de ese día (los ves de referencia).</div>
    <div class="qk-list rp-list">${L.map(row).join('')}</div>
    ${busy ? '<div class="safe tip">Ya tienes una sesión en marcha: termínala o descártala para repetir este entreno.</div>' : ''}
    <button type="button" class="btn primary block" data-rp="go" ${busy || !keep ? 'disabled' : ''}>${ic('play', 16)} Empezar${keep ? ` (${keep} ${keep === 1 ? 'ejercicio' : 'ejercicios'})` : ''}</button>
    <button type="button" class="btn block" data-act="sheet-close">Cancelar</button>`);
  const c = document.querySelector('#sheet .sheet-card'); if (c) c.classList.add('rp-sheet');
}
/* Empieza: rutina temporal con el orden, las series y las superseries de ese día; el resto lo hace la sesión de siempre */
function rpStart() {
  const s = state.sessions.find(x => x.id === rp.sid); if (!s || state.draft || isWatch()) return;
  const g = activeGym().id, L = rpPlanList(s, g).filter(o => !o.drop); if (!L.length) return;
  const tags = rpSsTags(L), ex = L.map((o, i) => {
    const pe = typeof wcPlanEx === 'function' ? wcPlanEx(o.e.name) : null;
    const x = { id: 'rp' + uid(), name: o.e.name, type: pe ? pe.type : typeOf(o.e.name), weight: 0, sets: o.e.sets.length, repsMin: 8, repsMax: 12, rest: 90, repRef: { date: s.date, sets: o.e.sets.map(z => ({ w: z.w, r: z.r })), name: o.e.name } };
    const bar = pe && pe.bar != null ? +pe.bar : BAR_DEFAULT[o.e.name] != null ? BAR_DEFAULT[o.e.name] : null; if (bar != null) x.bar = bar;
    /* superserie: todos los de un grupo menos el último llevan ss (como en Rutinas) */
    if (tags[i] && tags[i + 1] && tags[i + 1].replace(/\d+$/, '') === tags[i].replace(/\d+$/, '')) x.ss = 1;
    return x;
  });
  const day = { id: 'rp-' + uid(), name: (s.dayName || 'Entreno') + ' (repetido)', weekday: new Date().getDay(), kind: rp.kind, exercises: ex };
  const plan = { id: 'rep', name: 'Repetir entreno', gymId: g, days: [day] };
  state.plans.push(plan);
  try { closeSheet(); startSession(plan.id, day.id); } finally { state.plans = state.plans.filter(p => p !== plan); LS.set('plans', state.plans); }
  const d = state.draft; if (!d || d.dayId !== day.id) return;
  d.repFrom = s.id;
  d.exercises.forEach(e => { const pe = ex.find(x => x.id === e.exId); if (pe) e.repRef = pe.repRef; });
  saveDraft(); render();
}
window.addEventListener('click', ev => {
  const b = ev.target.closest && ev.target.closest('[data-rp]'); if (!b || isWatch()) return;
  ev.preventDefault(); ev.stopPropagation();
  const a = b.dataset.rp;
  if (a === 'open') { rp.sid = null; return rpSheet(b.dataset.id); }
  if (a === 'kind') { rp.kind = b.dataset.v; return rpSheet(rp.sid); }
  if (a === 'drop' || a === 'keep') { rp.drop[b.dataset.v] = a === 'drop'; return rpSheet(rp.sid); }
  if (a === 'go') return rpStart();
}, true);

/* ---------- El botón en el detalle del día ---------- */
const _daySheetRP = daySheet;
daySheet = function (k) {
  const r = _daySheetRP.apply(this, arguments); if (isWatch()) return r;
  const list = state.sessions.filter(s => dk(s.date) === k);
  document.querySelectorAll('#sheet .dd-ses').forEach((n, i) => {
    const s = list[i]; if (!s || n.querySelector('.rp-open') || !s.exercises.some(e => (e.sets || []).length)) return;
    n.insertAdjacentHTML('beforeend', `<button type="button" class="btn small block rp-open" data-rp="open" data-id="${esc(s.id)}">${ic('refresh-cw', 15)} Repetir este entreno</button>`);
  });
  return r;
};

/* ---------- En la sesión: "Ese día" de referencia en cada ejercicio ---------- */
const _renderRP = render;
render = function () {
  const r = _renderRP.apply(this, arguments);
  const d = state.draft; if (!d || isWatch() || !d.repFrom) return r;
  document.querySelectorAll('#sx-pager > .sx-page').forEach(pg => {
    const e = d.exercises[+pg.dataset.i], card = pg.querySelector('.card.ex'); if (!e || !e.repRef || !card || card.querySelector('.rp-cref')) return;
    const at = card.querySelector('.su-pills');
    const h = `<div class="muted rp-cref">${ic('refresh-cw', 13)} Ese día (${fmtDate(e.repRef.date)})${exSame(e.repRef.name, e.name) ? '' : ', con ' + esc(e.repRef.name)}: <b class="num">${esc(rpRefTxt(e.repRef.sets))}</b></div>`;
    if (at) at.insertAdjacentHTML('afterend', h); else card.insertAdjacentHTML('afterbegin', h);
  });
  return r;
};
bootRender();
