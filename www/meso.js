/* ==========================================================================
   Mesociclos con descarga
   Bloques de 4-6 semanas: el esfuerzo sube poco a poco (RIR 3 → 2 → 1 → 0-1) y en las
   semanas finales se suma 1 serie a los ejercicios principales. La última semana es de
   descarga: la mitad de series, −10 % de peso y sin fallo. Si la app detecta estancamiento
   o fatiga, te propone adelantar la descarga.
   ========================================================================== */
const MESO_RIR = { 4: [3, 2, 1], 5: [3, 2, 1, 1], 6: [3, 2, 2, 1, 1] };
const mondayOf = d => weekStartOf(d);
function meso() {
  let m = state.settings.meso;
  if (!m) {
    const d = new Date(), dow = (d.getDay() + 6) % 7, st = mondayOf(d); if (dow >= 5) st.setDate(st.getDate() + 7);
    m = state.settings.meso = { on: true, weeks: 5, start: dk(st), n: 1 }; saveLocal();   // sin savePlans: no pisa ajustes de otro equipo
  }
  return m;
}
/* at (opcional): otra fecha, p. ej. el lunes de la semana siguiente para la propuesta del coach semanal */
function mesoInfo(at) {
  const m = meso(); if (!m.on) return null;
  const now = mondayOf(at || new Date()), st = new Date(m.start + 'T00:00:00');
  const W = 7 * 864e5;
  let wk = Math.round((now - st) / W), n = m.n || 1, from = st;
  let deloadWk = m.deloadFrom ? Math.round((new Date(m.deloadFrom + 'T00:00:00') - st) / W) : m.weeks - 1;
  /* El bloque terminó: los siguientes se calculan solos (sin guardar, para no pisar la sincronización) */
  if (wk > deloadWk) { wk -= deloadWk + 1; from = new Date(st.getTime() + (deloadWk + 1) * W + 3 * 36e5); n += 1 + Math.floor(wk / m.weeks); wk = wk % m.weeks; deloadWk = m.weeks - 1; }
  if (wk < 0) return { pre: true, m, start: st };
  const deload = wk === deloadWk, acc = MESO_RIR[m.weeks] || MESO_RIR[5];
  return { m, n, wk, total: deloadWk + 1, deload, rir: deload ? 3 : acc[Math.min(wk, acc.length - 1)], plus: !deload && wk >= Math.max(2, deloadWk - 2) ? 1 : 0, early: !!m.deloadFrom };
}
/* RIR objetivo por serie según la semana del bloque */
rirTarget = function (j) {
  const I = mesoInfo(); if (!I || I.pre) return Math.max(0, 2 - j);
  if (I.deload) return 3;
  return Math.max(I.rir === 3 ? 2 : 0, I.rir - (j >= 2 ? 1 : 0));
};

/* ¿Conviene adelantar la descarga? */
function fatigueSigns() {
  const out = [], now = Date.now();
  const recent = state.sessions.filter(s => !s.approx && now - new Date(s.date) < 21 * 864e5);
  const names = {}; recent.forEach(s => s.exercises.forEach(e => names[e.name] = 1));
  let stalled = 0;
  Object.keys(names).forEach(n => {
    const H = state.sessions.filter(s => !s.approx && s.exercises.some(e => e.name === n && e.sets.length)).slice(0, 4).map(s => Math.max.apply(null, s.exercises.find(e => e.name === n).sets.map(x => e1rm(x.w, x.r))));
    if (H.length >= 4 && Math.max(H[0], H[1], H[2]) <= H[3] * 1.005) stalled++;
  });
  if (stalled >= 3) out.push(`${stalled} ejercicios llevan 3 sesiones sin mejorar`);
  const fail = state.sessions.filter(s => now - new Date(s.date) < 10 * 864e5).filter(s => { const all = [].concat.apply([], s.exercises.map(e => e.sets)); return all.length && all.every(x => x.rir === 0); }).length;
  if (fail >= 2) out.push('2 sesiones seguidas al fallo en todas las series');
  if (Object.values(soreMap()).some(s => s.lvl >= 2)) out.push('dolor muscular fuerte');
  return out;
}

function mesoStrip() {
  const I = mesoInfo(); if (!I) return '';
  if (I.pre) return `<button class="meso-strip" data-act="meso-open">${ic('layers', 16)}<span class="grow">Tu bloque de entrenamiento empieza el <b>lunes ${fmtDate(I.start)}</b></span>${ic('chevron-right', 16)}</button>`;
  const dots = Array.from({ length: I.total }, (_, i) => `<i class="${i < I.wk ? 'done' : i === I.wk ? 'cur' : ''} ${i === I.total - 1 ? 'dl' : ''}"></i>`).join('');
  const sig = !I.deload && I.wk >= 1 ? fatigueSigns() : [];
  return `<button class="meso-strip ${I.deload ? 'deload' : ''}" data-act="meso-open">
    <span class="grow" style="min-width:0"><span class="ms-t">${I.deload ? `${ic('battery', 15)} Semana de descarga` : `${ic('layers', 15)} Bloque ${I.n} · Semana ${I.wk + 1} de ${I.total}`}</span>
    <small>${I.deload ? 'Mitad de series, −10 % de peso, sin fallo. Tu cuerpo se recupera y vuelves más fuerte.' : `Esfuerzo: deja <b>${I.rir === 3 ? '2-3' : I.rir === 2 ? '2' : '0-1'}</b> reps de sobra${I.plus ? ' · +1 serie en los ejercicios principales' : ''}`}</small></span>
    <span class="ms-dots">${dots}</span></button>${sig.length ? `<div class="safe warn">${ic('battery', 16)}<span>Señales de fatiga: ${sig.join(', ')}. <button class="linkbtn" data-act="meso-deload">Hacer descarga esta semana</button></span></div>` : ''}`;
}
function mesoSheet() {
  const m = meso(), I = mesoInfo();
  openSheet(`<div class="row"><h2 class="grow">Mesociclo</h2><button class="icon-btn" data-act="sheet-close" aria-label="Cerrar">${ic('x', 18)}</button></div>
    <div class="muted" style="font-size:13px;line-height:1.5">Entrenas en bloques: varias semanas subiendo el esfuerzo poco a poco y luego <b>1 semana de descarga</b> para recuperarte. Así evitas estancarte y lesionarte.</div>
    <div class="ms-weeks">${Array.from({ length: m.weeks }, (_, i) => { const last = i === m.weeks - 1, r = (MESO_RIR[m.weeks] || [])[i]; return `<div class="${I && !I.pre && i === I.wk ? 'cur' : ''} ${last ? 'dl' : ''}"><b>Sem ${i + 1}</b><small>${last ? 'Descarga' : `RIR ${r === 3 ? '2-3' : r === 2 ? '2' : '0-1'}${i >= Math.max(2, m.weeks - 3) ? ' · +1 serie' : ''}`}</small></div>`; }).join('')}</div>
    <div class="field"><span class="label">Duración del bloque</span><div class="seg seg3">${[4, 5, 6].map(w => `<button class="${m.weeks === w ? 'on' : ''}" data-act="meso-weeks" data-v="${w}">${w} semanas</button>`).join('')}</div></div>
    <div class="row" style="flex-wrap:wrap;gap:8px">
      ${I && !I.pre && !I.deload ? '<button class="btn small" data-act="meso-deload">Descarga esta semana</button>' : ''}
      <button class="btn small" data-act="meso-restart">Empezar bloque nuevo el lunes</button>
      <button class="btn small ghost" data-act="meso-off">${m.on ? 'Desactivar' : 'Activar'}</button></div>
    <div class="muted" style="font-size:11.5px">El RIR objetivo de cada semana aparece en tus series al entrenar (borde punteado al elegir "¿Reps de sobra?").</div>`);
}

/* Al empezar: aplicar semana del bloque */
const _startMeso = startSession;
startSession = function (planId, dayId) {
  _startMeso(planId, dayId);
  const d = state.draft, I = mesoInfo(); if (!d || !I || I.pre || d.meso || d.planId === 'quick') return;   // el Entreno rápido no sigue el bloque
  d.meso = { wk: I.wk, deload: I.deload };
  let plusN = 0;
  d.exercises.forEach(e => {
    if (I.deload) {
      const n = Math.max(1, Math.ceil(e.log.length / 2)); e.log = e.log.slice(0, n); e.target = n;
      if (d.readied !== 'low') e.log.forEach(s => { const w = +s.w || 0, inc = increment(e, w); s.w = Math.max(0, Math.round(w * 0.9 / inc) * inc); });
      e.mesoNote = `Semana de descarga: ${n} ${n === 1 ? 'serie' : 'series'} con ${fmtKg(+e.log[0].w || 0)} kg, dejando 3 reps de sobra.`;
    } else if (I.plus && e.rest >= 90 && d.readied !== 'low' && plusN++ < 3) {
      const l = e.log[e.log.length - 1]; e.log.push({ w: l.w, r: null, done: false, drops: [] }); e.target = e.log.length;
      e.mesoNote = `Semana ${I.wk + 1} del bloque: +1 serie (${e.log.length} en total).`;
    }
  });
  saveDraft(); render();
};
function decorateMeso() {
  const d = state.draft; if (!d || isWatch() || !d.meso) return;
  const cards = document.querySelectorAll('#app .card.ex'), I = mesoInfo();
  d.exercises.forEach((e, i) => {
    const c = cards[i]; if (!c) return;
    if (e.mesoNote && !c.querySelector('.safe.meso')) { const top = c.querySelector('.ex-top'); (top || c.firstElementChild).insertAdjacentHTML('afterend', `<div class="safe meso ${d.meso.deload ? 'dl' : ''}">${ic('layers', 16)}<span>${e.mesoNote}</span></div>`); }
    if (I && !I.pre) c.querySelectorAll('.sets .n .rir').forEach((r, j) => { if (r.textContent !== 'DROP') r.textContent = 'RIR ' + (rirTarget(j) >= 3 ? '3' : rirTarget(j)); });
  });
}
const _renderMeso = render;
render = function () { _renderMeso(); decorateMeso(); };

const _vTrainMeso = vTrain;
vTrain = function () {
  const h = _vTrainMeso();
  if (h.indexOf('id="sx"') >= 0 || isWatch() || state.draft) return h;
  const at = h.indexOf('<div class="card habits2"'), s = mesoStrip();
  return at < 0 ? h + s : h.slice(0, at) + s + h.slice(at);
};
document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-act^="meso-"]'); if (!b) return;
  ev.stopPropagation();
  const a = b.dataset.act, m = meso();
  if (a === 'meso-open') { mesoSheet(); return; }
  if (a === 'meso-weeks') m.weeks = +b.dataset.v;
  if (a === 'meso-deload') { const I = mesoInfo(); if (I && !I.pre && I.wk > 0) { m.start = dk(new Date(mondayOf(new Date()).getTime() - I.wk * 7 * 864e5 + 3 * 36e5)); m.n = I.n; } m.deloadFrom = dk(mondayOf(new Date())); toast('Esta semana es de descarga. ¡Recupérate!'); }
  if (a === 'meso-restart') { const st = mondayOf(new Date()); st.setDate(st.getDate() + 7); const I0 = mesoInfo(); m.start = dk(st); delete m.deloadFrom; m.n = ((I0 && I0.n) || m.n || 1) + 1; toast('Tu bloque nuevo empieza el lunes'); }
  if (a === 'meso-off') m.on = !m.on;
  savePlans(); if (!$('#sheet').hidden) mesoSheet(); render();
}, true);
meso(); bootRender();
