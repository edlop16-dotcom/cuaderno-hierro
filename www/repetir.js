/* ==========================================================================
   Repetir un entreno de otro día (repetir.js, rama repetir-entreno)
   - En la tarjeta de racha tocas un día (también en semanas anteriores con ‹ ›) y, en su detalle,
     "Repetir este entreno": una vista previa con cada ejercicio de ese día, lo que hiciste ESE día y lo
     que el coach te recomienda HOY (peso × reps, RIR y por qué), según cómo te fue y tu historial.
   - Tipo de día (Pesado / Bombeo, por defecto el de ese día) y gimnasio (por defecto donde estás) se
     pueden cambiar; se puede quitar un ejercicio.
   - Empieza como el Entreno rápido: rutina temporal 'redo' que se quita al instante. La sesión queda en
     el historial ("Repetido · nombre del día"); tus rutinas NO cambian (ni los pesos al terminar,
     ni lo que agregues o reemplaces durante la sesión).
   - La recomendación es la del mismo motor del coach (pgCoach): lo que ves en la vista previa es lo que
     trae la sesión.
   - Solo teléfono: el reloj no cambia.
   ========================================================================== */
const RP_ID = 'redo';
const rpOn = () => !isWatch();

/* Ejercicios de esa sesión con series (si ninguno tiene, todos) */
function rpExOf(s) {
  const L = s.exercises.filter(e => e.sets && e.sets.length);
  return (L.length ? L : s.exercises).map(e => ({ name: e.name, n: Math.max(1, (e.sets || []).length || 3), sets: e.sets || [] }));
}
/* Lo que el coach propone hoy para ese ejercicio (mismo motor que la sesión) */
function rpCoach(x, gym, kind) {
  try { return pgCoach({ name: x.name, sets: x.n, type: typeOf(x.name) }, gym, kind); } catch (e) { return null; }
}
const rpRange = c => { const g = (c.goal || []).filter(v => v != null); const lo = c.rx ? c.rx.rMin : null, hi = c.rx ? c.rx.rMax : null;
  if (g.length && g.every(v => v === g[0])) return String(g[0]);
  return lo != null && hi != null ? (lo === hi ? String(hi) : `${lo}-${hi}`) : ''; };
const rpWhen = d => { try { return new Date(d).toLocaleDateString('es', { day: 'numeric', month: 'short' }); } catch (e) { return ''; } };

function rpSheet() {
  const R = state.rp; if (!R) return;
  const s = state.sessions.find(x => x.id === R.sid); if (!s) { state.rp = null; return closeSheet(); }
  const L = rpExOf(s), gyms = state.gyms || [];
  const chip = (on, attrs, label) => `<button type="button" class="qk-chip ${on ? 'on' : ''}" ${attrs}>${label}</button>`;
  const rows = L.map((x, i) => {
    const off = R.off.indexOf(x.name) >= 0, c = off ? null : rpCoach(x, R.gym, R.kind);
    const that = x.sets.length ? x.sets.map(z => ddSetTxt(z)).join(' · ') : 'sin series anotadas';
    let hoy = '';
    if (c) {
      const peso = c.bw && c.bw.label ? c.bw.label : fmtKg(c.w || 0) + ' kg';
      const rir = (c.rirT || []).length ? ' · RIR ' + c.rirT.map(v => (v == null ? '?' : v)).join('·') : '';
      const later = c.last && c.last.date && dk(c.last.date) !== dk(s.date) && new Date(c.last.date) > new Date(s.date);
      hoy = `<div class="rp-hoy"><span class="rp-ic">${typeof PG_IC !== 'undefined' && PG_IC[c.mode] ? PG_IC[c.mode] : '→'}</span><span class="grow"><b>Hoy: ${c.n || x.n} × ${rpRange(c)} con ${peso}</b>${rir}
        ${c.why ? `<small>${esc(c.why)}</small>` : ''}${later ? `<small class="rp-later">Lo hiciste otra vez el ${rpWhen(c.last.date)}: el coach parte de esa vez, la más reciente.</small>` : ''}</span></div>`;
    }
    return `<div class="rp-ex ${off ? 'off' : ''}">
      <div class="row"><b class="grow">${esc(x.name)}</b><button type="button" class="rp-tg" data-rp="tg" data-i="${i}" aria-pressed="${!off}">${off ? 'Incluir' : 'Quitar'}</button></div>
      <div class="rp-that"><span class="muted">Ese día:</span> <span class="num">${esc(that)}</span></div>${hoy}</div>`;
  }).join('');
  const n = L.filter(x => R.off.indexOf(x.name) < 0).length;
  const otherGym = R.gym !== sGym(s);
  openSheet(`<div class="row"><h2 class="grow">Repetir entreno</h2><button class="icon-btn" data-rp="back" aria-label="Volver">${ic('x', 18)}</button></div>
    <div class="muted rp-sub">${esc(s.dayName || 'Sesión')} · ${esc(fmtDate(s.date, true))}${s.gymName || sGym(s) ? ' · ' + esc(s.gymName || gymName(sGym(s))) : ''}</div>
    <div class="label">Tipo de día</div><div class="qk-chips">${Object.keys(KINDS).map(k => chip(R.kind === k, `data-rp="kind" data-v="${k}"`, k === 'fuerza' ? 'Pesado' : 'Bombeo')).join('')}</div>
    ${gyms.length > 1 ? `<div class="label">Gimnasio</div><div class="qk-chips">${gyms.map(g => chip(R.gym === g.id, `data-rp="gym" data-v="${esc(g.id)}"`, esc(g.name))).join('')}</div>` : ''}
    ${otherGym ? `<div class="muted rp-note">Ese día fue en ${esc(gymName(sGym(s)))}: los pesos de otro gimnasio no se copian tal cual (las máquinas cambian); el coach los ajusta.</div>` : ''}
    <div class="rp-list">${rows}</div>
    <div class="muted rp-note">Mismos ejercicios y series que ese día. Tu rutina no cambia y la sesión queda en tu historial como «Repetido».</div>
    <div class="grid2"><button type="button" class="btn" data-rp="back">Volver</button><button type="button" class="btn primary" data-rp="go" ${n ? '' : 'disabled'}>${ic('play', 16)} Empezar (${n})</button></div>`);
  const c = $('#sheet .sheet-card'); if (c) c.classList.add('rp-sheet');
}
function rpOpen(sid) {
  const s = state.sessions.find(x => x.id === sid); if (!s) return;
  if (state.draft) return toast('Ya tienes un entreno en curso: termínalo o descártalo primero.');
  const g = activeGym();
  state.rp = { sid, k: dk(s.date), kind: sKind(s) === 'fuerza' ? 'fuerza' : 'bombeo', gym: (g && g.id) || sGym(s), off: [] };
  rpSheet();
}
function rpStart() {
  const R = state.rp; if (!R) return;
  const s = state.sessions.find(x => x.id === R.sid); if (!s) return;
  if (state.draft) return toast('Ya tienes un entreno en curso: termínalo o descártalo primero.');
  const L = rpExOf(s).filter(x => R.off.indexOf(x.name) < 0); if (!L.length) return;
  const exercises = L.map(x => { const pe = newEx(x.name, R.kind); pe.sets = x.n; return pe; });
  /* Rutina temporal: startSession la lee y se quita enseguida (la sesión queda en el historial, la rutina no) */
  const plan = { id: RP_ID, name: 'Repetir entreno', gymId: R.gym, days: [{ id: 'rp-' + uid(), name: `Repetido · ${s.dayName || 'Sesión'}`, weekday: new Date().getDay(), kind: R.kind, exercises }] };
  state.plans.push(plan);
  state.rp = null;
  try { closeSheet(); startSession(plan.id, plan.days[0].id); } finally { state.plans = state.plans.filter(p => p !== plan); LS.set('plans', state.plans); }
  const d = state.draft; if (d && d.planId === RP_ID) { d.redoOf = s.id; saveDraft(); }
}
document.addEventListener('click', ev => {
  const b = ev.target.closest && ev.target.closest('[data-rp]'); if (!b) return;
  ev.preventDefault(); ev.stopPropagation();
  const a = b.dataset.rp, R = state.rp;
  if (a === 'open') return rpOpen(b.dataset.id);
  if (!R) return;
  if (a === 'back') { const k = R.k; state.rp = null; return daySheet(k); }
  if (a === 'go') return rpStart();
  if (a === 'kind') R.kind = b.dataset.v;
  else if (a === 'gym') R.gym = b.dataset.v;
  else if (a === 'tg') {
    const s = state.sessions.find(x => x.id === R.sid), x = s && rpExOf(s)[+b.dataset.i]; if (!x) return;
    const k = R.off.indexOf(x.name); if (k >= 0) R.off.splice(k, 1); else R.off.push(x.name);
  }
  rpSheet();
}, true);

/* Botón en el detalle del día (tarjeta de racha → tocar un día) */
const _daySheetRP = daySheet;
daySheet = function (k) {
  const r = _daySheetRP.apply(this, arguments);
  if (!rpOn()) return r;
  const list = state.sessions.filter(s => dk(s.date) === k); if (!list.length) return r;
  const sh = $('#sheet .sheet-card'); if (!sh || sh.querySelector('.rp-acts')) return r;
  const html = `<div class="rp-acts">${list.map(s => `<button type="button" class="btn small primary rp-btn" data-rp="open" data-id="${esc(s.id)}">${ic('refresh-cw', 15)} ${list.length > 1 ? 'Repetir: ' + esc(s.dayName || 'Sesión') : 'Repetir este entreno'}</button>`).join('')}
    <div class="muted" style="font-size:11.5px">Mismos ejercicios, con lo que el coach te recomienda hoy según cómo te fue.</div></div>`;
  const acts = sh.querySelector('.dd-acts'), first = sh.querySelector('.day-row');
  if (acts) acts.insertAdjacentHTML('beforebegin', html);
  else if (first) first.insertAdjacentHTML('beforebegin', html);
  else sh.insertAdjacentHTML('beforeend', html);
  return r;
};

/* Durante la sesión repetida nada se escribe en tus rutinas */
const _learnRP = learnWeights;
learnWeights = function (s) { if (s && s.planId === RP_ID) return; return _learnRP.apply(this, arguments); };
const _openSheetRP = openSheet;
openSheet = function () {
  const r = _openSheetRP.apply(this, arguments), d = state.draft;
  if (d && d.planId === RP_ID && rpOn()) {
    const n = document.querySelector('#sheet .g2-swn'); if (n) n.textContent = 'Solo para hoy: es un entreno repetido y tu rutina no cambia.';
  }
  return r;
};
