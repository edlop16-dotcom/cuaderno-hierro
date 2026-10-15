/* ==========================================================================
   Fase 5 · Rangos por músculo y animación al subir (15-oct-2026)
   1. Más ejercicios con rango (Bronce → Diamante): los que tienen coeficiente en
      load.js obtienen estándares propios (Bronce ≈ principiante, Plata ≈ con experiencia).
   2. Rango de cada músculo = el mejor rango de sus ejercicios principales en los últimos
      4 meses. Se pinta en la silueta (frente y espalda), como el cuerpo por rangos de Symmetry.
   3. Al terminar una sesión en la que subes de rango (de un ejercicio o de un músculo),
      aparece una medalla animada.
   ========================================================================== */
(function () {
  for (const n in SL_COEF) {
    if (LV_STD[n] || isBodyweight(n)) continue;
    const c = SL_COEF[n], br = c[1] / 0.85, pl = c[2] / 0.9;
    LV_STD[n] = [br, pl, pl * 1.3, pl * 1.85, pl * 2.4].map(v => Math.round(v * 1000) / 1000);
  }
})();
const RK_ZONES = ['pecho', 'esp', 'homb', 'bic', 'tri', 'abd', 'cuad', 'isq', 'glu', 'pant', 'lumb'];
const RK_NONE = '#3a4152';
const rkName = s => s < 0 ? 'Sin rango' : LV_NAMES[Math.min(4, Math.floor(s / 3))][0] + ' ' + LV_ROM[Math.min(2, s % 3)];
const rkColor = s => s < 0 ? RK_NONE : LV_NAMES[Math.min(4, Math.floor(s / 3))][1];
/* { zona: { s: puntaje 0-14, ex: ejercicio, L } } con los ejercicios hechos en 4 meses */
function muscleRanks() {
  const cut = Date.now() - 120 * 864e5, names = new Set();
  state.sessions.forEach(s => { if (!s.approx && new Date(s.date) >= cut) s.exercises.forEach(e => names.add(e.name)); });
  const out = {};
  names.forEach(n => {
    if (!lvStd(n)) return;
    const b = lvBest(n), L = b && lvOf(n, b.v); if (!L) return;
    const sh = zoneShares(n), sc = L.i < 0 ? -1 : L.score;
    for (const k in sh) if (sh[k] === 1 && (!out[k] || sc > out[k].s)) out[k] = { s: sc, ex: n, L };
  });
  return out;
}
function rkBodySVG(R) {
  return bodySVG({}).replace(/fill="[^"]*" data-z="(\w+)"/g, (m, k) => `fill="${R[k] ? rkColor(R[k].s) : RK_NONE}" data-z="${k}" data-act="rk-open" data-k="${k}"`)
    .replace('aria-label="Mapa de series por músculo"', 'aria-label="Rango de cada músculo"');
}
function rkOverall(R) {
  const v = Object.keys(R).map(k => Math.max(0, R[k].s));
  return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : -1;
}
function rankCard() {
  const R = muscleRanks(), ks = RK_ZONES.filter(k => R[k]);
  if (!ks.length) return '';
  const all = rkOverall(R), miss = RK_ZONES.filter(k => !R[k] && k !== 'lumb' && k !== 'abd');
  return `<div class="card rk-card">
    <div class="row" style="justify-content:space-between"><h3>${ic('crown', 17)} Tu cuerpo por rangos</h3>${lvBadge({ i: Math.floor(all / 3), name: rkName(all), color: rkColor(all) })}</div>
    <div class="muted" style="font-size:12.5px">Cada músculo toma el mejor rango de sus ejercicios principales (4 meses). Toca un músculo.</div>
    <div class="rk-body">${rkBodySVG(R)}</div>
    <div class="rk-list">${ks.sort((a, b) => R[b].s - R[a].s).map(k => `<button class="rk-row" data-act="rk-open" data-k="${k}"><span class="grow"><b>${zoneName(k)}</b><small class="muted">${esc(R[k].ex)}</small></span>${lvBadge({ i: Math.max(-1, Math.floor(R[k].s / 3)), name: rkName(R[k].s), color: rkColor(R[k].s) }, true)}</button>`).join('')}</div>
    ${miss.length ? `<div class="muted" style="font-size:12px">Sin rango aún: ${miss.map(k => zoneName(k).toLowerCase()).join(', ')}. Entrénalos con un ejercicio de pesas para ver su rango.</div>` : ''}
    <div class="rk-leg">${LV_NAMES.map(([n, c]) => `<span><i style="background:${c}"></i>${n}</span>`).join('')}</div></div>`;
}
function rkSheet(k) {
  const R = muscleRanks(), r = R[k];
  const cut = Date.now() - 120 * 864e5, names = new Set();
  state.sessions.forEach(s => { if (!s.approx && new Date(s.date) >= cut) s.exercises.forEach(e => names.add(e.name)); });
  const list = [...names].filter(n => lvStd(n) && zoneShares(n)[k] === 1).map(n => { const b = lvBest(n); return { n, L: b && lvOf(n, b.v) }; }).filter(x => x.L).sort((a, b) => (b.L.score != null ? b.L.score : -1) - (a.L.score != null ? a.L.score : -1));
  const opts = LIB.filter(x => lvStd(x.name) && zoneShares(x.name)[k] === 1 && !names.has(x.name)).slice(0, 4).map(x => x.name);
  openSheet(`<div class="row"><h2 class="grow">${zoneName(k)}</h2><button class="icon-btn" data-act="sheet-close" aria-label="Cerrar">${ic('x', 18)}</button></div>
    ${r ? `<div class="lv-hero">${lvBadge({ i: Math.floor(Math.max(0, r.s) / 3), name: rkName(r.s), color: rkColor(r.s) })}<div class="muted">Por tu mejor ejercicio: <b>${esc(r.ex)}</b>.</div></div>` : '<div class="muted">Aún no tiene rango.</div>'}
    ${list.length ? `<div class="label">Tus ejercicios</div><div class="lv-list">${list.map(({ n, L }) => `<button class="lv-row" data-act="lv-open" data-name="${esc(n)}"><span class="grow"><b>${esc(n)}</b>${L.next > 0 ? `<small class="muted">Siguiente rango: +${Math.ceil(L.next)} kg de 1RM</small>` : ''}</span>${lvBadge(L, true)}</button>`).join('')}</div>` : ''}
    ${opts.length ? `<div class="muted" style="font-size:12.5px">También cuentan: ${opts.map(esc).join(', ')}.</div>` : ''}
    <div class="muted" style="font-size:11.5px">Estimación orientativa con tu 1RM y tu peso corporal. Compárate sobre todo contigo.</div>`);
}
document.addEventListener('click', ev => { const b = ev.target.closest('[data-act="rk-open"]'); if (!b) return; ev.stopPropagation(); rkSheet(b.dataset.k); }, true);
/* Progreso: después de "Nivel de fuerza" */
const _vProgressRk = vProgress;
vProgress = function () { const h = _vProgressRk(), k = h.indexOf('<div class="card lv-card">'), c = rankCard(); return k < 0 ? c + h : h.slice(0, k) + c + h.slice(k); };

/* ---------- Medalla animada al subir de rango ---------- */
function rkReveal(ups, tries) {
  if (!ups.length) return;
  /* Espera a que se cierre la celebración de la racha (y la hoja de logros) para no taparse */
  if (document.querySelector('.celebrate, .rk-reveal') && (tries || 0) < 60) { setTimeout(() => rkReveal(ups, (tries || 0) + 1), 500); return; }
  if (isWatch()) { toast(`🏅 ${ups[0].what}: ${ups[0].name}`); return; }
  let reduce = false; try { reduce = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  const u = ups[0], rays = Array.from({ length: 12 }, (_, i) => `<path d="M60 60 L${60 + 70 * Math.cos(i * Math.PI / 6 - 0.13)} ${60 + 70 * Math.sin(i * Math.PI / 6 - 0.13)} L${60 + 70 * Math.cos(i * Math.PI / 6 + 0.13)} ${60 + 70 * Math.sin(i * Math.PI / 6 + 0.13)}Z"/>`).join('');
  const el = document.createElement('div');
  el.className = 'rk-reveal' + (reduce ? ' still' : ''); el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Subiste de rango');
  el.innerHTML = `<div class="rk-rv-in" style="--lc:${u.color}">
    <svg class="rk-rays" viewBox="0 0 120 120" aria-hidden="true">${rays}</svg>
    <div class="rk-medal">${ic(u.i >= 3 ? 'crown' : 'medal', 54)}<i class="rk-shine"></i></div>
    <div class="rk-up">¡Subiste de rango!</div>
    <div class="rk-name">${esc(u.name)}</div>
    <div class="rk-what">${esc(u.what)}${ups.length > 1 ? ` · y ${ups.length - 1} más` : ''}</div>
    <div class="rk-tap">Toca para continuar</div></div>`;
  document.body.appendChild(el);
  try { navigator.vibrate && navigator.vibrate([60, 40, 120]); } catch (e) {}
  const close = () => { if (!el.parentNode) return; el.classList.add('out'); setTimeout(() => el.remove(), 260); };
  el.addEventListener('click', close); setTimeout(close, 5200);
}
const _finishRk = finishSession;
finishSession = function () {
  const d = state.draft, before = d ? muscleRanks() : null, exB = {};
  if (d) d.exercises.forEach(e => { const b = lvStd(e.name) && lvBest(e.name), L = b && lvOf(e.name, b.v); exB[e.name] = L && L.i >= 0 ? L.score : -1; });
  const r = _finishRk.apply(this, arguments);
  if (d && !state.draft) {
    const after = muscleRanks(), ups = [];
    for (const k in after) if (after[k].s >= 0 && after[k].s > (before[k] ? before[k].s : -1)) ups.push({ what: zoneName(k), name: rkName(after[k].s), color: rkColor(after[k].s), i: Math.floor(after[k].s / 3), s: after[k].s });
    if (!ups.length) Object.keys(exB).forEach(n => { const b = lvStd(n) && lvBest(n), L = b && lvOf(n, b.v); if (L && L.i >= 0 && L.score > exB[n]) ups.push({ what: n, name: L.name, color: L.color, i: L.i, s: L.score }); });
    ups.sort((a, b) => b.s - a.s);
    if (ups.length) setTimeout(() => rkReveal(ups), 2600);
  }
  return r;
};
