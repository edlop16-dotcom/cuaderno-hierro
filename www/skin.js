/* ==========================================================================
   Skin "Forja": capa visual sobre la lógica de la app (no cambia datos).
   Iconos, encabezado, hábitos, anillo de descanso, progreso de sesión,
   transiciones entre pestañas, micro-interacciones y confeti.
   ========================================================================== */

/* Iconos de la barra inferior */
const NAV_IC = { train: 'dumbbell', plans: 'clipboard-list', guide: 'book-open', profile: 'user' };
document.querySelectorAll('.nav button').forEach(b => { const s = b.querySelector('svg'); if (s) s.outerHTML = ic(NAV_IC[b.dataset.tab] || 'dumbbell', 22); });

/* Encabezado con avatar */
header = function (title, sub) {
  return `<div class="top"><div class="hdr"><div class="avatar" aria-hidden="true">${esc((HISTORY.name || '?')[0])}</div><div style="min-width:0"><div class="label">${sub}</div><h1>${title}</h1></div></div>
    <button class="icon-btn" data-act="tab" data-tab="settings" id="btn-settings" aria-label="Ajustes">${ic('settings', 20)}</button></div>`;
};

/* Hábitos del día: suplementos + anillo de agua */
const HAB_IC = { crea: 'zap', prot: 'coffee', omega: 'fish' };
dailyPanel = function () {
  const t = today(), ml = t.water || 0, st = creaStreak();
  const pct = Math.min(1, ml / WATER_MIN), R = 40, C = 2 * Math.PI * R;
  return `<div class="card daily">
    <div class="row" style="justify-content:space-between"><h3>Hábitos de hoy</h3><span class="chip">${ic('flame', 14)} ${st} ${st === 1 ? 'día' : 'días'} de creatina</span></div>
    <div class="habits">${SUPS.map(s => `<button class="habit ${t[s.k] ? 'on' : ''}" data-act="sup" data-k="${s.k}" aria-pressed="${!!t[s.k]}" id="sup-${s.k}">
      <span class="hi">${ic(HAB_IC[s.k] || 'pill', 18)}</span><span class="tick">${t[s.k] ? ic('check', 12) : ''}</span>
      <span><b>${s.name}</b><small>${s.dose}</small></span></button>`).join('')}</div>
    <div class="water2">
      <div class="wring" role="img" aria-label="Agua ${fmtKg(ml / 1000)} de 2,5 litros">
        <svg viewBox="0 0 96 96" width="96" height="96"><defs><linearGradient id="wg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#22d3ee"/><stop offset="1" stop-color="#3b82f6"/></linearGradient></defs>
          <circle cx="48" cy="48" r="${R}" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="9"/>
          <circle cx="48" cy="48" r="${R}" fill="none" stroke="url(#wg)" stroke-width="9" stroke-linecap="round" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C * (1 - pct)).toFixed(1)}" style="transition:stroke-dashoffset .6s var(--ease)"/></svg>
        <div class="c">${ic('droplet', 16)}<b class="num">${fmtKg(ml / 1000)}</b><small>de 2,5 L</small></div></div>
      <div class="wbtns"><div class="label" style="color:#7fe3f5">Hidratación</div>
        <div class="muted" style="font-size:12.5px">${ml >= WATER_MIN ? '¡Meta cumplida! Hasta 3 L es ideal con creatina.' : `Te faltan ${fmtKg((WATER_MIN - ml) / 1000)} L para la meta.`}</div>
        <div class="row"><button class="wbtn minus" data-act="water" data-ml="-250" aria-label="Quitar 250 ml">${ic('minus', 16)}</button><button class="wbtn" data-act="water" data-ml="250">${ic('plus', 15)} 250 ml</button><button class="wbtn" data-act="water" data-ml="500">${ic('plus', 15)} 500 ml</button></div></div>
    </div></div>`;
};

/* Inicio: estadísticas con iconos y botón con icono */
const _vTrainSkin = vTrain;
vTrain = function () {
  let h = _vTrainSkin();
  if (state.draft) return h;
  const icons = ['calendar-days', 'dumbbell', 'layers', 'history'];
  h = h.replace(/<div class="row muted" style="flex-wrap:wrap;gap:6px 14px;font-size:13px">([\s\S]*?)<\/div>/, (m, inner) => {
    let i = 0; return `<div class="stats">${inner.replace(/<span>([\s\S]*?)<\/span>/g, (mm, t) => `<span class="stat">${ic(icons[i++] || 'info', 14)}${t}</span>`)}</div>`;
  });
  h = h.replace('id="btn-start">Empezar entrenamiento</button>', `id="btn-start">${ic('play', 18)} Empezar entrenamiento</button>`);
  h = h.replace(/<h3>🧠 Coach · /, `<h3>${ic('brain', 18)} Coach · `);
  h = h.replace(/<span aria-hidden="true">⏰<\/span>/g, ic('bell', 18));
  return h;
};

/* Sesión: barra de progreso, iconos */
const _vSessionSkin = vSession;
vSession = function () {
  let h = _vSessionSkin();
  const d = state.draft; if (!d || isWatch()) return h;
  const done = d.exercises.reduce((a, e) => a + e.log.filter(stepDone).length, 0), all = d.exercises.reduce((a, e) => a + e.log.length, 0);
  const i = h.indexOf('</div></div>', h.indexOf('class="sess-head"'));
  if (i > 0) h = h.slice(0, i + 6) + `<div class="sess-prog" aria-hidden="true"><i style="width:${all ? Math.round(done / all * 100) : 0}%"></i></div>` + h.slice(i + 6);
  return h.replace(/<span aria-hidden="true">📝<\/span>/g, ic('notebook-pen', 16));
};
coachBox = function (e) {
  const c = e.coach;
  return `<div class="coach ${c.mode}"><div class="coach-h"><span class="coach-ic">${ic('brain', 18)}</span><span>${c.head}</span></div>
    ${c.tips.length ? `<ul>${c.tips.map(t => `<li>${t}</li>`).join('')}</ul>` : ''}</div>`;
};

/* Descanso con anillo */
tick = function () {
  const el = $('#rest'); const r = state.rest;
  if (!r) { el.hidden = true; el.innerHTML = ''; return; }
  const left = Math.max(0, (r.end - Date.now()) / 1000);
  if (left <= 0 && !r.rang) { r.rang = true; beep(); }
  if (left <= 0 && Date.now() - r.end > 6000) { state.rest = null; el.hidden = true; return; }
  const go = left <= 0, pct = Math.min(1, left / Math.max(1, r.total)), R = 29, C = 2 * Math.PI * R;
  el.hidden = false;
  if (isWatch()) {
    el.innerHTML = `<div class="rest-in ${go ? 'go' : ''} w-rest"><div class="label">${go ? '¡A la siguiente serie!' : 'Descanso'}</div><div class="t num">${go ? '0:00' : clock(Math.ceil(left))}</div>
      <div class="row" style="justify-content:center"><button class="btn" data-act="rest-add" data-d="-10">−10 s</button><button class="btn" data-act="rest-add" data-d="10">+10 s</button><button class="btn" data-act="rest-skip">${go ? 'Cerrar' : 'Saltar'}</button></div></div>`;
    return;
  }
  el.innerHTML = `<div class="rest-in ${go ? 'go' : ''}">
    <div class="rring"><svg viewBox="0 0 68 68" width="68" height="68"><defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${go ? '#2ee59d' : '#ff4d1f'}"/><stop offset="1" stop-color="${go ? '#22d3ee' : '#ffb020'}"/></linearGradient></defs>
      <circle cx="34" cy="34" r="${R}" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="6"/>
      <circle cx="34" cy="34" r="${R}" fill="none" stroke="url(#rg)" stroke-width="6" stroke-linecap="round" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${go ? 0 : (C * (1 - pct)).toFixed(1)}"/></svg>
      <div class="t num">${go ? ic('check', 22) : clock(Math.ceil(left))}</div></div>
    <div class="grow"><div class="label">${go ? '¡A la siguiente serie!' : 'Descanso'}</div>
      <div class="row" style="margin-top:6px;gap:6px"><button class="btn small" data-act="rest-add" data-d="-10" aria-label="Quitar 10 segundos">−10 s</button><button class="btn small" data-act="rest-add" data-d="10" aria-label="Agregar 10 segundos">+10 s</button><button class="btn small" data-act="rest-skip">${go ? 'Cerrar' : 'Saltar'}</button></div></div></div>`;
};

/* Micro-interacción al marcar una serie */
const _markSetSkin = markSet;
markSet = function (i, j, v, k) { state.justKey = { i, j, k }; _markSetSkin(i, j, v, k); };

/* Transición al cambiar de pestaña + pop del check */
let lastTabSkin = null;
const _renderSkin = render;
render = function () {
  _renderSkin();
  const app = $('#app');
  const key = state.tab + (state.draft ? ':s' : '');
  if (key !== lastTabSkin) { lastTabSkin = key; app.classList.remove('enter'); void app.offsetWidth; app.classList.add('enter'); clearTimeout(render.t); render.t = setTimeout(() => app.classList.remove('enter'), 900); }
  const jk = state.justKey;
  if (jk) {
    state.justKey = null;
    const sel = `.check[data-ex="${jk.i}"][data-set="${jk.j}"]` + (jk.k != null ? `[data-k="${jk.k}"]` : ':not([data-k])');
    const b = document.querySelector(sel); if (b && b.classList.contains('on')) b.classList.add('just');
  }
};

/* Confeti al terminar la sesión */
function confetti() {
  try { if (matchMedia('(prefers-reduced-motion: reduce)').matches) return; } catch (e) {}
  const cv = document.createElement('canvas'); cv.className = 'confetti'; document.body.appendChild(cv);
  const dpr = Math.min(2, devicePixelRatio || 1), W = innerWidth, H = innerHeight;
  cv.width = W * dpr; cv.height = H * dpr; const c = cv.getContext('2d'); c.scale(dpr, dpr);
  const cols = ['#ff4d1f', '#ff7a1a', '#ffb020', '#2ee59d', '#22d3ee', '#b48cff', '#f3f5f9'];
  const P = Array.from({ length: 140 }, () => ({ x: W / 2 + (Math.random() - .5) * 60, y: H * .42, vx: (Math.random() - .5) * 11, vy: -Math.random() * 13 - 4, s: 4 + Math.random() * 6, r: Math.random() * 6, vr: (Math.random() - .5) * .3, col: cols[Math.random() * cols.length | 0], sh: Math.random() < .5 }));
  const t0 = performance.now();
  (function fr(t) {
    const el = t - t0; c.clearRect(0, 0, W, H);
    P.forEach(p => { p.vy += .32; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      c.save(); c.translate(p.x, p.y); c.rotate(p.r); c.globalAlpha = Math.max(0, 1 - el / 2600); c.fillStyle = p.col;
      if (p.sh) c.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); else { c.beginPath(); c.arc(0, 0, p.s / 2.4, 0, 7); c.fill(); } c.restore(); });
    if (el < 2600) requestAnimationFrame(fr); else cv.remove();
  })(t0);
}
const _finishSkin = finishSession;
finishSession = function () { const had = !!state.draft; _finishSkin(); if (had && !state.draft) setTimeout(confetti, 380); };

bootRender();
