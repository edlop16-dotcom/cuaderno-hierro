/* ==========================================================================
   Entrenamiento a pantalla completa (como Symmetry):
   - Vista previa de la rutina antes de empezar.
   - Un ejercicio por pantalla con figura grande animada; deslizas a los lados.
   - Fila de ejercicios arriba (círculos) para saltar a cualquiera.
   - Flecha ↓ minimiza: queda la barra "Entrenando" sobre la navegación.
   Reutiliza la tarjeta de cada ejercicio (series, coach, notas, drop sets).
   ========================================================================== */
const TYPE_RGB = { Piernas: '52,211,153', Empuje: '255,107,107', 'Tracción': '77,163,255', Core: '180,140,255' };
const typeRgb = t => TYPE_RGB[t] || '255,122,26';
const sxOpenNow = () => !!(state.draft && !state.sessMin && !isWatch() && state.tab === 'train');
const exComplete = e => e.log.every(stepDone);
const bigFig = (name, cls) => { const x = libFind(name); return x ? `<button class="fig-mini ${cls || ''}" data-act="how" data-name="${esc(name)}" data-fig="${x.key}" aria-label="Ver cómo se hace ${esc(name)}">${figSVG(x, 0, false)}</button>` : `<div class="${cls || ''} sx-nofig">${ic('dumbbell', 48)}</div>`; };
const thumb = name => { const x = libFind(name); return x ? figSVG(x, 1, false) : `<span class="th-l">${esc(String(name)[0])}</span>`; };

/* ---------- Vista previa antes de empezar ---------- */
function previewSheet(pid, did) {
  const { p, d } = findDay(pid, did); if (!p || !d) return;
  const secs = d.exercises.reduce((a, e) => a + e.sets * (45 + (e.rest || 90)), 0);
  const groups = [...new Set(d.exercises.map(e => (libFind(e.name) || {}).group || e.type))].slice(0, 3).join(' · ');
  const first = d.exercises[0];
  openSheet(`<div class="pv-hero" style="--tc:${typeRgb(first ? first.type : '')}">${first ? bigFig(first.name, 'pv-fig') : ''}<button class="icon-btn pv-x" data-act="sheet-close" aria-label="Cerrar">${ic('x', 18)}</button></div>
    <div class="label">${esc(p.name)} · ${KINDS[d.kind || kindOfName(d.name)] || ''}</div>
    <h2 class="pv-t">${esc(d.name)}</h2>
    <div class="row muted pv-meta"><span>${ic('timer', 16)} ~${Math.round(secs / 60)} min</span><span>${ic('target', 16)} ${esc(groups)}</span></div>
    <div class="label">Ejercicios (${d.exercises.length})</div>
    <div class="pv-list">${d.exercises.map(e => `<div class="pv-row"><span class="pv-th">${thumb(e.name)}</span><span class="grow" style="min-width:0"><small class="muted">${e.sets} series × ${reps(e)} reps${e.weight ? ' · ' + fmtKg(e.weight) + ' kg' : ''}</small><b>${esc(e.name)}</b></span></div>`).join('')}</div>
    <div class="muted" style="font-size:12.5px">Calienta 5 min en bicicleta. Ritmo: baja en 2-3 s, sube en 1 s.</div>
    <button class="btn primary block pv-go" data-act="start" data-go="1" data-plan="${pid}" data-day="${did}">${ic('play', 18)} Empezar entrenamiento</button>`);
  const s = document.querySelector('#sheet .sheet-card'); if (s) s.classList.add('pv');
}

/* ---------- Sesión a pantalla completa ---------- */
const _vSessionSx = vSession;
vSession = function () {
  if (isWatch()) return _vSessionSx();
  const d = state.draft, h = _vSessionSx();
  const starts = []; let k = h.indexOf('<div class="card ex ');
  while (k >= 0) { starts.push(k); k = h.indexOf('<div class="card ex ', k + 10); }
  const endAll = h.lastIndexOf('<div class="grid2">');
  if (!starts.length || endAll < 0) return h;
  const cards = starts.map((s, i) => h.slice(s, i + 1 < starts.length ? starts[i + 1] : endAll));
  const tail = h.slice(endAll);
  const cur = Math.min(d.cur || 0, d.exercises.length - 1), last = d.exercises.length - 1;
  const done = d.exercises.reduce((a, e) => a + e.log.filter(stepDone).length, 0), all = d.exercises.reduce((a, e) => a + e.log.length, 0);
  const anim = state.sxAnim ? 'sx-in' : ''; state.sxAnim = false;
  return `<div class="sx ${anim}" id="sx" style="--tc:${typeRgb(d.exercises[cur].type)}">
    <div class="sx-top">
      <button class="sx-ic" data-act="sx-min" aria-label="Minimizar entrenamiento">${ic('chevron-down', 26)}</button>
      <div class="grow" style="min-width:0"><div class="num sx-clock" id="elapsed">0:00</div><div class="sx-sub">${esc(d.dayName)} · ${done}/${all} series</div></div>
      <button class="btn primary small sx-fin" data-act="finish">${state.confirm === 'finish' ? 'Confirmar' : 'Terminar'}</button>
    </div>
    <div class="sx-prog"><i style="width:${all ? Math.round(done / all * 100) : 0}%"></i></div>
    <div class="sx-strip" id="sx-strip">${d.exercises.map((e, i) => `<button class="sx-th ${i === cur ? 'on' : ''} ${exComplete(e) ? 'done' : ''}" data-act="sx-go" data-i="${i}" aria-label="${esc(e.name)}" style="--tc:${typeRgb(e.type)}">${thumb(e.name)}${exComplete(e) ? `<span class="ok">${ic('check', 12)}</span>` : ''}</button>`).join('')}</div>
    <div class="sx-pager" id="sx-pager">${cards.map((c, i) => { const e = d.exercises[i]; return `<section class="sx-page" data-i="${i}" style="--tc:${typeRgb(e.type)}">
      <div class="sx-hero">${bigFig(e.name, 'sx-fig')}<span class="sx-n num">${i + 1}/${d.exercises.length}</span></div>
      ${c}
      ${i < last ? `<button class="sx-next" data-act="sx-go" data-i="${i + 1}">Siguiente: <b>${esc(d.exercises[i + 1].name)}</b> ${ic('chevron-right', 16)}</button>` : tail}
    </section>`; }).join('')}</div>
  </div>`;
};

/* Al minimizar, Entrenar muestra el inicio normal */
const _vTrainSx = vTrain;
vTrain = function () {
  if (state.draft && state.sessMin && !isWatch()) { const d = state.draft; state.draft = null; try { return _vTrainSx(); } finally { state.draft = d; } }
  return _vTrainSx();
};

const _startSx = startSession;
startSession = function (pid, did) { state.sessMin = false; state.sxAnim = true; _startSx(pid, did); };

/* Mantener la posición (ejercicio y scroll) entre redibujos */
function pagerGo(i, smooth) {
  const n = document.getElementById('sx-pager'); if (!n) return;
  n.scrollTo({ left: i * n.clientWidth, behavior: smooth ? 'smooth' : 'auto' });
}
function setCur(i) {
  const d = state.draft; if (!d || i === d.cur) return;
  d.cur = i; saveDraft();
  document.querySelectorAll('.sx-th').forEach((b, j) => b.classList.toggle('on', j === i));
  const sx = document.getElementById('sx'); if (sx) sx.style.setProperty('--tc', typeRgb(d.exercises[i].type));
  const th = document.querySelector('.sx-th.on'), st = document.getElementById('sx-strip');
  if (th && st) st.scrollTo({ left: th.offsetLeft - st.clientWidth / 2 + th.clientWidth / 2, behavior: 'smooth' });
}
function bindPager(n) {
  let t = null;
  n.addEventListener('scroll', () => { clearTimeout(t); t = setTimeout(() => setCur(Math.round(n.scrollLeft / Math.max(1, n.clientWidth))), 60); }, { passive: true });
}
const _renderSx = render;
render = function () {
  const open = sxOpenNow();
  document.body.classList.toggle('sx-open', open);
  const pg = document.getElementById('sx-pager');
  const pos = pg ? { left: pg.scrollLeft, tops: Array.prototype.map.call(pg.children, c => c.scrollTop) } : null;
  _renderSx();
  const n = document.getElementById('sx-pager');
  if (n) {
    if (pos) { n.scrollLeft = pos.left; Array.prototype.forEach.call(n.children, (c, i) => { if (pos.tops[i] != null) c.scrollTop = pos.tops[i]; }); }
    else n.scrollLeft = (state.draft.cur || 0) * n.clientWidth;
    bindPager(n);
    const th = document.querySelector('.sx-th.on'), st = document.getElementById('sx-strip');
    if (th && st && !pos) st.scrollLeft = th.offsetLeft - st.clientWidth / 2 + th.clientWidth / 2;
  }
};
addEventListener('resize', () => { if (document.getElementById('sx-pager') && state.draft) pagerGo(state.draft.cur || 0, false); });

/* Al completar un ejercicio, pasa solo al siguiente */
const _markSetSx = markSet;
markSet = function (i, j, v, k) {
  const d = state.draft, before = d && d.exercises[i] ? exComplete(d.exercises[i]) : true;
  _markSetSx(i, j, v, k);
  const e = state.draft && state.draft.exercises[i];
  if (e && !before && exComplete(e) && i < state.draft.exercises.length - 1 && document.getElementById('sx-pager')) setTimeout(() => pagerGo(i + 1, true), 650);
};

document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-act]'); if (!b) return;
  const a = b.dataset.act;
  if (a === 'start') {
    if (isWatch()) return;
    if (state.draft) { ev.stopPropagation(); closeSheet(); state.sessMin = false; state.sxAnim = true; state.tab = 'train'; render(); return; }
    if (b.dataset.go) { closeSheet(); return; }            // deja que la app empiece la sesión
    ev.stopPropagation(); previewSheet(b.dataset.plan, b.dataset.day); return;
  }
  if (a === 'sx-go') { ev.stopPropagation(); pagerGo(+b.dataset.i, true); return; }
  if (a === 'sx-min') {
    ev.stopPropagation();
    const sx = document.getElementById('sx'); if (sx) sx.classList.add('sx-out');
    setTimeout(() => { state.sessMin = true; render(); }, 240);
    return;
  }
  if (a === 'live-open') { ev.stopPropagation(); state.sessMin = false; state.sxAnim = true; state.tab = 'train'; render(); return; }
  if (a === 'live-discard') {
    ev.stopPropagation();
    if (state.confirm === 'live-discard') { discardSession(); state.sessMin = false; toast('Entrenamiento descartado.'); }
    else { state.confirm = 'live-discard'; b.classList.add('arm'); b.setAttribute('aria-label', 'Toca otra vez para descartar'); toast('Toca otra vez la papelera para descartar.'); setTimeout(() => { if (state.confirm === 'live-discard') { state.confirm = null; b.classList.remove('arm'); } }, 3000); }
  }
}, true);

/* Animar la figura de la vista previa */
let pvT0 = performance.now();
(function pvLoop(now) {
  requestAnimationFrame(pvLoop);
  const el = document.querySelector('#sheet .pv-fig[data-fig]'); if (!el || document.hidden || reduceMotion()) return;
  const x = LIB.find(l => l.key === el.dataset.fig); if (x) el.innerHTML = figSVG(x, figT(now - pvT0), false);
})(performance.now());


/* ---------- Entrenamiento olvidado: preguntar y ajustar la duración ---------- */
const STALE_MIN = 45;             // sin registrar series durante 45 min → preguntar
const LONG_MIN = 150;             // sesiones de más de 2 h 30 → confirmar duración al terminar
const lastAct = d => d.lastAct || new Date(d.start).getTime();
const hm = mins => { mins = Math.max(1, Math.round(mins)); const h = Math.floor(mins / 60), m = mins % 60; return h ? `${h} h ${m ? m + ' min' : ''}`.trim() : `${m} min`; };
const hhmm = t => new Date(t).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
function suggestedMin(d) {
  const any = d.exercises.some(e => e.log.some(x => x.done));
  return any ? (lastAct(d) - new Date(d.start).getTime()) / 60000 + 2 : (Date.now() - new Date(d.start).getTime()) / 60000;
}
function staleSheet(reason) {
  const d = state.draft; if (!d) return;
  const any = d.exercises.some(e => e.log.some(x => x.done));
  const gap = (Date.now() - lastAct(d)) / 60000, total = (Date.now() - new Date(d.start).getTime()) / 60000;
  const sug = Math.max(1, Math.round(suggestedMin(d)));
  openSheet(`<div class="row"><span class="stale-ic">${ic('alarm-clock', 22)}</span><h2 class="grow">${reason === 'finish' ? '¿Cuánto duró tu entrenamiento?' : '¿Sigues entrenando?'}</h2></div>
    <div class="muted" style="font-size:13.5px">${any ? `Tu última serie fue hace <b>${hm(gap)}</b> (a las ${hhmm(lastAct(d))}). El cronómetro lleva <b>${hm(total)}</b>.` : `Empezaste hace <b>${hm(total)}</b> y aún no marcas ninguna serie.`}</div>
    ${any ? `<button class="btn primary block" data-act="stale-end" data-min="${sug}">${ic('check', 16)} Terminar con ${hm(sug)} <small style="opacity:.75">(hasta tu última serie)</small></button>` : ''}
    <div class="field"><span class="label">O escribe la duración real</span>
      <div class="dur-row"><input id="dur-h" type="number" inputmode="numeric" min="0" max="6" value="${Math.floor(sug / 60)}" aria-label="Horas"><span>h</span><input id="dur-m" type="number" inputmode="numeric" min="0" max="59" value="${sug % 60}" aria-label="Minutos"><span>min</span>
      <button class="btn" data-act="stale-custom">Guardar</button></div></div>
    <div class="grid2">${reason === 'finish' ? `<button class="btn" data-act="stale-real">Dejar ${hm(total)}</button>` : `<button class="btn" data-act="stale-keep">Sigo entrenando</button>`}
      <button class="btn danger" data-act="stale-discard">${state.confirm === 'stale-discard' ? '¿Seguro? Toca otra vez' : 'Descartar'}</button></div>`);
}
function finishWith(mins) {
  const d = state.draft; if (!d) return;
  const id = d.id; state.durOK = true; closeSheet();
  try { finishSession(); } finally { state.durOK = false; }
  const s = state.sessions.find(x => x.id === id);
  if (s && mins) { s.durationSec = Math.round(mins * 60); saveLocal(); render(); }
}
const _finishSx = finishSession;
finishSession = function () {
  const d = state.draft;
  if (d && !state.durOK && !isWatch()) {
    const total = (Date.now() - new Date(d.start).getTime()) / 60000, gap = (Date.now() - lastAct(d)) / 60000;
    if (total > LONG_MIN || (gap > 25 && d.exercises.some(e => e.log.some(x => x.done)))) { state.confirm = null; staleSheet('finish'); return; }
  }
  _finishSx();
};
function checkStale() {
  const d = state.draft; if (!d || isWatch() || !$('#sheet').hidden) return;
  if ((Date.now() - lastAct(d)) / 60000 < STALE_MIN) return;
  if (d.staleAsk && Date.now() - d.staleAsk < STALE_MIN * 60000) return;
  d.staleAsk = Date.now(); saveDraft(); staleSheet('stale');
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') setTimeout(checkStale, 700); });
setInterval(checkStale, 5 * 60000);
setTimeout(checkStale, 1500);
/* Cada serie marcada o dato escrito cuenta como actividad */
const _markSetStale = markSet;
markSet = function (i, j, v, k) { if (state.draft) state.draft.lastAct = Date.now(); _markSetStale(i, j, v, k); };
document.addEventListener('input', ev => { if (state.draft && ev.target.closest && ev.target.closest('.sx-page')) state.draft.lastAct = Date.now(); }, true);
document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-act^="stale-"]'); if (!b) return;
  ev.stopPropagation();
  const a = b.dataset.act;
  if (a === 'stale-end') finishWith(+b.dataset.min);
  if (a === 'stale-custom') { const h = +document.getElementById('dur-h').value || 0, m = +document.getElementById('dur-m').value || 0; if (h * 60 + m < 1) { toast('Escribe una duración.'); return; } finishWith(h * 60 + m); }
  if (a === 'stale-real') finishWith(0);
  if (a === 'stale-keep') { closeSheet(); toast('¡Dale! Seguimos.'); }
  if (a === 'stale-discard') { if (state.confirm === 'stale-discard') { closeSheet(); discardSession(); toast('Entrenamiento descartado.'); } else { state.confirm = 'stale-discard'; b.textContent = '¿Seguro? Toca otra vez'; } }
}, true);

if (state.draft && !isWatch()) state.sessMin = state.tab !== 'train';
render();
