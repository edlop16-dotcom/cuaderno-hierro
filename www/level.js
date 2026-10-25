/* ==========================================================================
   Nivel de fuerza: tu 1RM estimado (con la barra incluida) dividido entre tu peso
   corporal, comparado con estándares aproximados para hombres adultos.
   Niveles: Bronce (principiante), Plata (novato), Oro (intermedio), Platino (avanzado),
   Diamante (élite); cada uno con divisiones III, II, I.
   ========================================================================== */
const LV_STD = {
  'Sentadilla con Barra': [0.75, 1.25, 1.5, 2.25, 2.75], 'Press Banca Plano (Barra)': [0.5, 0.75, 1, 1.5, 2],
  'Press Banca Inclinado (Barra)': [0.45, 0.65, 0.9, 1.3, 1.7], 'Peso Muerto Convencional': [1, 1.5, 2, 2.5, 3],
  'Peso Muerto Rumano': [0.75, 1.15, 1.6, 2.1, 2.6], 'Press Militar con Barra': [0.35, 0.55, 0.8, 1.05, 1.35],
  'Remo con Barra': [0.5, 0.75, 1, 1.5, 1.75], 'Hip Thrust': [0.5, 1, 1.75, 2.5, 3.5],
  'Prensa 45°': [1, 2, 2.75, 4, 5.25], 'Sentadilla Hack': [0.75, 1.25, 1.75, 2.5, 3.25],
  'Extensión de Pierna': [0.5, 0.75, 1.1, 1.6, 2.1], 'Curl Femoral Sentado': [0.4, 0.6, 0.9, 1.25, 1.6],
  'Curl con Barra': [0.2, 0.4, 0.6, 0.85, 1.15], 'Press Francés': [0.15, 0.3, 0.5, 0.75, 1],
  'Remo en T': [0.5, 0.75, 1, 1.5, 2], 'Remo Sentado con Cable': [0.5, 0.75, 1, 1.5, 1.75],
  'Jalón al Pecho': [0.5, 0.75, 1, 1.5, 1.75], 'Press de Pecho en Máquina': [0.5, 0.8, 1.1, 1.6, 2.1],
  'Press Banca con Mancuernas': [0.2, 0.35, 0.5, 0.7, 0.95], 'Curl Martillo': [0.1, 0.17, 0.27, 0.4, 0.55],
};
const LV_NAMES = [['Bronce', '#cd7f32'], ['Plata', '#c0c7d4'], ['Oro', '#ffb020'], ['Platino', '#5eead4'], ['Diamante', '#a78bfa']];
const LV_ROM = ['III', 'II', 'I'];
const lvStd = name => LV_STD[name] || null;
/* 1RM estimado prudente: reps limitadas a 12 (con muchas reps Epley exagera) */
const e1Safe = (w, r) => e1rm(w, Math.min(12, r));
function lvBest(name, days) {
  const bar = typeof barFor === 'function' ? barFor(name) : (BAR_DEFAULT[name] || 0), cut = Date.now() - (days || 120) * 864e5;
  let b = null;
  state.sessions.forEach(s => { if (s.approx || new Date(s.date) < cut) return; s.exercises.forEach(e => { if (exSame(e.name, name)) e.sets.forEach(x => { const v = e1Safe((+x.w || 0) + bar, x.r); if (!b || v > b.v) b = { v, s, x }; }); }); });
  return b;
}
function lvOf(name, v) {
  const std = lvStd(name); if (!std || !v) return null;
  const bw = curWeight(); if (!bw) return null;
  const ratio = v / bw;
  let i = -1; while (i + 1 < std.length && ratio >= std[i + 1]) i++;
  if (i < 0) return { i: -1, name: 'Sin rango', pct: ratio / std[0], next: std[0] * bw - v, ratio, std, bw };
  const lo = std[i], hi = i + 1 < std.length ? std[i + 1] : std[i] * 1.25, f = Math.min(0.999, (ratio - lo) / (hi - lo));
  const div = Math.min(2, Math.floor(f * 3));
  const nextR = i + 1 < std.length || div < 2 ? lo + (hi - lo) * (div + 1) / 3 : null;
  return { i, div, name: LV_NAMES[i][0] + ' ' + LV_ROM[div], color: LV_NAMES[i][1], pct: f, next: nextR ? nextR * bw - v : 0, ratio, std, bw, score: i * 3 + div };
}
function lvBadge(L, small) { return L ? `<span class="lvb ${small ? 'sm' : ''}" style="--lc:${L.i >= 0 ? L.color : '#5d6579'}">${ic(L.i >= 3 ? 'crown' : 'medal', small ? 12 : 14)} ${L.name}</span>` : ''; }

function levelCard() {
  const names = Object.keys(LV_STD).map(n => ({ n, b: lvBest(n) })).filter(x => x.b).map(x => Object.assign(x, { L: lvOf(x.n, x.b.v) })).filter(x => x.L).sort((a, b) => (b.L.score || -1) - (a.L.score || -1));
  if (!names.length) return '';
  const avg = names.reduce((a, x) => a + Math.max(0, x.L.score || 0), 0) / names.length, oi = Math.min(4, Math.floor(avg / 3)), od = Math.min(2, Math.floor(avg - oi * 3));
  return `<div class="card lv-card">
    <div class="row" style="justify-content:space-between"><h3>${ic('medal', 17)} Nivel de fuerza</h3>${lvBadge({ i: oi, name: LV_NAMES[oi][0] + ' ' + LV_ROM[od], color: LV_NAMES[oi][1] })}</div>
    <div class="muted" style="font-size:12.5px">Tu 1RM estimado de los últimos 4 meses comparado con tu peso (${fmtKg(r1(curWeight()))} kg). Toca un ejercicio para ver cuánto te falta.</div>
    <div class="lv-list">${names.map(({ n, b, L }) => `<button class="lv-row" data-act="lv-open" data-name="${esc(n)}"><span class="grow" style="min-width:0"><b>${esc(n)}</b><small class="muted">1RM ≈ ${fmtKg(Math.round(b.v))} kg · ${fmtKg(Math.round(L.ratio * 100) / 100)}× tu peso</small>
      <span class="lv-bar"><i style="width:${Math.round(Math.min(1, L.pct) * 100)}%;background:${L.i >= 0 ? L.color : '#5d6579'}"></i></span></span>${lvBadge(L, true)}</button>`).join('')}</div>
    <div class="muted" style="font-size:11.5px">Estándares aproximados para hombres adultos. Las máquinas pesan distinto en cada gimnasio: compárate sobre todo contigo mismo.</div></div>`;
}
function lvSheet(name) {
  const b = lvBest(name), L = b && lvOf(name, b.v); if (!L) return;
  const bar = typeof barFor === 'function' ? barFor(name) : 0;
  const tiers = L.std.map((r, i) => `<div class="lv-t ${i === L.i ? 'on' : ''}" style="--lc:${LV_NAMES[i][1]}"><span>${LV_NAMES[i][0]}</span><b class="num">${fmtKg(Math.round(r * L.bw - bar))} kg</b><small>${fmtKg(r)}×</small></div>`).join('');
  const nextW = L.next > 0 ? Math.round(L.next) : 0;
  openSheet(`<div class="row"><h2 class="grow">${esc(name)}</h2><button class="icon-btn" data-act="sheet-close" aria-label="Cerrar">${ic('x', 18)}</button></div>
    <div class="lv-hero">${lvBadge(L)}<div class="muted">Tu mejor serie: <b>${fmtKg(b.x.w)} kg × ${b.x.r}</b>${bar ? ` (+ barra ${fmtKg(bar)})` : ''} · ${fmtDate(b.s.date)}</div>
      ${nextW ? `<div>Te faltan <b>${nextW} kg</b> de 1RM para el siguiente rango: por ejemplo ${fmtKg(Math.ceil((b.v + nextW) / (1 + 8 / 30) - bar))} kg × 8 reps.</div>` : '<div>¡Estás en el rango máximo!</div>'}</div>
    <div class="label">1RM necesario para cada nivel (en ${bar ? 'discos' : 'kg'})</div><div class="lv-tiers">${tiers}</div>
    <div class="muted" style="font-size:11.5px">El 1RM se estima con tus series (máximo 12 reps contadas), no hace falta probarlo.</div>`);
}
document.addEventListener('click', ev => { const b = ev.target.closest('[data-act="lv-open"]'); if (!b) return; ev.stopPropagation(); lvSheet(b.dataset.name); }, true);

/* Progreso: tarjeta de nivel después del mapa muscular */
const _vProgressLv = vProgress;
vProgress = function () { const h = _vProgressLv(), k = h.indexOf('<h3 style="margin-top:4px">Por gimnasio</h3>'), c = levelCard(); return k < 0 ? h + c : h.slice(0, k) + c + h.slice(k); };
/* Estadísticas del ejercicio: insignia de nivel */
const _exStatsLv = exStats;
exStats = function (name) {
  _exStatsLv(name);
  const b = lvBest(name), L = b && lvOf(name, b.v); if (!L) return;
  const h = document.querySelector('#sheet h2'); if (h) h.insertAdjacentHTML('afterend', `<button class="lvb-btn" data-act="lv-open" data-name="${esc(name)}">${lvBadge(L, true)}</button>`);
};
/* Subir de nivel al terminar: lo anuncia la medalla de ranks.js (rkReveal; en el reloj, un toast) */
bootRender();
