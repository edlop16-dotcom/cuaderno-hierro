/* ==========================================================================
   Forja para el reloj (modo reloj rediseñado tras el primer entreno con el M99)
   - Se activa solo en pantallas de reloj (casi cuadradas y pequeñas, o < 330 px).
   - Una cosa por pantalla, botones grandes, sin teclado del sistema:
       · Serie: peso y reps con − / + (o toca el número para un teclado propio grande).
       · Calentamiento paso a paso: "70 kg × 10 · por lado 20 + 15".
       · Descanso a pantalla completa con: tiempo, pulso, "¿cuántas reps te sobraron?"
         y qué sigue. Si el pulso sigue alto al terminar, espera a que baje (máx. 75 s).
   - Puntos arriba: verde = ejercicio terminado, medio = empezado.
   - "⋯ Más": cómo se hace, máquina ocupada (hacer otro / cambiar), agregar ejercicio,
     ± serie, vista completa y terminar.
   ========================================================================== */
(function watchMigrate() {
  try {
    if (!LS.get('watchMig1', 0)) {
      if (state.settings.watch === false && watchGeom()) { state.settings.watch = null; saveLocal(); }
      LS.set('watchMig1', 1);
    }
    /* v1.0.34: el reloj había quedado en vista completa; volver al modo reloj una vez más */
    if (!LS.get('watchMig2', 0)) {
      if (state.settings.watch === false && watchGeom()) { state.settings.watch = null; saveLocal(); }
      LS.set('watchMig2', 1);
    }
  } catch (e) {}
})();

const w2 = { menu: null, pad: null, conf: null };
const w2Ex = () => { const d = state.draft, i = Math.min(d.cur || 0, d.exercises.length - 1); return { d, i, e: d.exercises[i] }; };
const goalReps = (e, j) => { const g = e.coach && e.coach.goal && e.coach.goal[j]; return g || e.repsMax; };
const hrTxt = () => { const b = typeof hrNow === 'function' ? hrNow() : 0; return b ? `❤ ${b}` : ''; };
function w2Warm(e, i, d) {
  if (typeof warmupFor !== 'function' || e.wuSkip || e.log.some(s => s.done)) return null;
  const W = warmupFor(e, i, d); if (!W || !W.sets.length) return null;
  e.wu = e.wu || [];
  for (let k = 0; k < W.sets.length; k++) if (!e.wu[k]) return { W, k, s: W.sets[k] };
  return null;
}
const sidePlates = (e, w) => (typeof loadsPlates === 'function' && loadsPlates(e) && +w > 0) ? platesTxt(w) : '';

/* ---------- Pantallas ---------- */
function w2Head(d, i, e) {
  return `<div class="w2-top"><span class="w2-n num">${i + 1}/${d.exercises.length}</span><span class="w2-clock num" id="elapsed">0:00</span><span class="w2-hr num" id="w2-hr">${hrTxt()}</span></div>
    <div class="w2-dots">${d.exercises.map((x, k) => `<button class="w2-dot ${exComplete(x) ? 'ok' : x.log.some(s => s.done) ? 'half' : ''} ${k === i ? 'on' : ''}" data-act="w2-go" data-i="${k}" aria-label="${esc(x.name)}"></button>`).join('')}</div>
    <div class="w2-name">${esc(e.name)}</div>`;
}
function w2Nav(i, n) {
  return `<div class="w2-nav"><button data-act="w2-go" data-i="${i - 1}" ${i === 0 ? 'disabled' : ''} aria-label="Ejercicio anterior">‹</button><button class="w2-more" data-act="w2-menu" data-m="main">⋯ Más</button><button data-act="w2-go" data-i="${i + 1}" ${i >= n - 1 ? 'disabled' : ''} aria-label="Ejercicio siguiente">›</button></div>`;
}
function w2Pad() {
  const P = w2.pad, { e } = w2Ex(), st = watchStep(e), s = st && st.s;
  const cur = !s ? '' : P.f === 'w' ? fmtKg(+s.w || 0) : String(s.r != null ? s.r : goalReps(e, st.j));
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', P.f === 'w' ? '.' : '', '0', '⌫'];
  return `<div class="w2-pad"><div class="w2-padv"><small>${P.f === 'w' ? 'Peso en kg' + (e.bar ? ' (solo discos)' : '') : 'Repeticiones'}</small><b class="num" id="w2-padv">${P.v ? esc(P.v) : `<span class="ph">${esc(cur)}</span>`}</b></div>
    <div class="w2-keys">${keys.map(k => k ? `<button data-act="w2-k" data-k="${k}">${k}</button>` : '<span></span>').join('')}</div>
    <div class="w2-padok"><button data-act="w2-padx">Cancelar</button><button class="ok" data-act="w2-padok">OK</button></div></div>`;
}
function w2Menu() {
  const { d, i, e } = w2Ex(), m = w2.menu, back = `<button class="w2-mi back" data-act="w2-menu" data-m="${m === 'main' ? '' : 'main'}">‹ Volver</button>`;
  if (m === 'busy') {
    const pend = d.exercises.map((x, k) => ({ x, k })).filter(o => o.k !== i && !exComplete(o.x));
    const sw = typeof swapCandidates === 'function' ? swapCandidates(e).slice(0, 5) : [];
    return `<div class="w2-mh">Máquina ocupada</div>
      ${pend.length ? `<div class="w2-ms">Haz ahora otro de tu rutina:</div>${pend.map(o => `<button class="w2-mi" data-act="w2-now" data-k="${o.k}">${esc(o.x.name)}<small>${o.x.log.filter(stepDone).length}/${o.x.log.length} series</small></button>`).join('')}` : ''}
      ${sw.length ? `<div class="w2-ms">O cámbialo por uno parecido:</div>${sw.map(c => `<button class="w2-mi" data-act="w2-swap" data-name="${esc(c.n)}">${esc(c.n)}<small>${c.cv.how === 'body' ? 'peso corporal' : '~' + fmtKg(c.cv.w) + ' kg'}</small></button>`).join('')}` : ''}
      ${back}`;
  }
  if (m === 'add') {
    const have = new Set(d.exercises.map(x => x.name));
    const sim = typeof swapCandidates === 'function' ? swapCandidates(e).map(c => c.n).slice(0, 5) : [];
    const rec = (typeof pkRecent === 'function' ? pkRecent() : []).filter(n => !have.has(n) && sim.indexOf(n) < 0).slice(0, 5);
    const row = n => `<button class="w2-mi" data-act="w2-add" data-name="${esc(n)}">${esc(n)}</button>`;
    return `<div class="w2-mh">Agregar ejercicio</div><div class="w2-ms">Solo para hoy; va después de ${esc(e.name)}.</div>
      ${sim.length ? `<div class="w2-ms">Parecidos:</div>${sim.map(row).join('')}` : ''}
      ${rec.length ? `<div class="w2-ms">Recientes:</div>${rec.map(row).join('')}` : ''}
      <button class="w2-mi" data-act="add-ex" data-ex="${i}">🔎 Buscar en la lista</button>${back}`;
  }
  if (m === 'fin') {
    const done = d.exercises.reduce((a, x) => a + x.log.filter(stepDone).length, 0), all = d.exercises.reduce((a, x) => a + x.log.length, 0);
    const mins = Math.round((Date.now() - new Date(d.start).getTime()) / 60000);
    return `<div class="w2-mh">¿Terminar?</div><div class="w2-ms">${done} de ${all} series · ${mins} min</div>
      ${done ? `<button class="w2-go" data-act="w2-save">✓ Guardar entrenamiento</button>` : '<div class="w2-ms">Aún no marcas ninguna serie.</div>'}
      <button class="w2-mi" data-act="w2-menu" data-m="">Seguir entrenando</button>
      <button class="w2-mi danger" data-act="w2-discard">${w2.conf === 'discard' ? '¿Seguro? Toca otra vez' : 'Descartar'}</button>`;
  }
  const canWarm = typeof warmupFor === 'function' && !e.log.some(s => s.done) && warmupFor(e, i, d);
  return `<div class="w2-mh">${esc(e.name)}</div>
    ${libFind(e.name) ? `<button class="w2-mi" data-act="how" data-name="${esc(e.name)}">📖 Cómo se hace</button>` : ''}
    ${canWarm ? `<button class="w2-mi" data-act="w2-wuagain">🔥 Ver calentamiento</button>` : ''}
    <button class="w2-mi" data-act="w2-menu" data-m="busy">⏳ Máquina ocupada</button>
    <button class="w2-mi" data-act="w2-menu" data-m="add">➕ Agregar ejercicio</button>
    <div class="w2-row2"><button class="w2-mi" data-act="w2-set" data-d="1">+ Serie</button><button class="w2-mi" data-act="w2-set" data-d="-1" ${e.log.length < 2 || e.log[e.log.length - 1].done ? 'disabled' : ''}>− Serie</button></div>
    <button class="w2-mi" data-act="w2-away">🏠 Ir al inicio (la sesión sigue)</button>
    <button class="w2-mi" data-act="w2-full">📱 Vista completa</button>
    <button class="w2-mi fin" data-act="w2-menu" data-m="fin">🏁 Terminar entrenamiento</button>
    ${back}`;
}
function w2Hint(d, i, e, j) {
  const out = [];
  if (typeof isPump === 'function' && isPump(d) && typeof burnFrom === 'function') out.push(`🔥 Debe arder desde la rep <b>${burnFrom(e, j)}</b>`);
  const pv = (e.prev || [])[j];
  if (pv) out.push(`<button class="w2-prev" data-act="use-prev" data-ex="${i}" data-set="${j}">Antes: <b class="num">${fmtKg(pv.w)} × ${pv.r}</b></button>`);
  else if (e.coach && e.coach.mode === 'up' && j === 0 && d.readied !== 'mid' && d.readied !== 'low') out.push(`⬆ Hoy subes de peso`);
  return out.length ? `<div class="w2-hint">${out.join('')}</div>` : '';
}
vWatchSession = function () {
  const d = state.draft; if (!d) return '';
  if (w2.pad) return w2Pad();
  if (w2.menu) return `<div class="w2 w2-menu">${w2Menu()}</div>`;
  const { i, e } = w2Ex(), n = d.exercises.length, head = w2Head(d, i, e);
  const wu = w2Warm(e, i, d);
  if (wu) {
    const s = wu.s;
    return `<div class="w2">${head}
      <div class="w2-sub w2-wu">🔥 Calentamiento ${wu.k + 1} de ${wu.W.sets.length} · no cuenta</div>
      <div class="w2-big"><b class="num">${s.bar ? fmtKg(e.bar) : fmtKg(s.w)}</b> kg × <b class="num">${s.r}</b></div>
      <div class="w2-pl">${s.bar ? 'Solo la barra, sin discos' : wu.W.plates ? `En cada lado: <b>${platesTxt(s.w)}</b>` : 'Serie ligera'}</div>
      <div class="w2-tip">Serie suave para preparar el músculo. Después descansa 1 min.</div>
      <button class="w2-go" data-act="w2-wu" data-k="${wu.k}">✓ Hecho</button>
      <button class="w2-link" data-act="w2-wuskip">Saltar calentamiento</button>
      ${w2Nav(i, n)}</div>`;
  }
  const st = watchStep(e);
  if (!st) {
    const nx = nextPending(d, i);
    return `<div class="w2">${head}
      <div class="w2-big ok">✓ Ejercicio completo</div>
      ${nx != null ? `<button class="w2-go" data-act="w2-go" data-i="${nx}">Sigue: ${esc(d.exercises[nx].name)} ›</button>` : `<div class="w2-tip">¡Hiciste todo! 💪</div><button class="w2-go fin" data-act="w2-menu" data-m="fin">🏁 Terminar entrenamiento</button>`}
      ${w2Nav(i, n)}</div>`;
  }
  const s = st.s, drop = st.k != null, r = s.r != null && s.r !== '' ? s.r : (drop ? Math.max(1, Math.round(e.repsMax * 0.6)) : goalReps(e, st.j));
  const pl = sidePlates(e, s.w);
  return `<div class="w2">${head}
    <div class="w2-sub">${drop ? '<b class="drop">DROP SET</b> · baja el peso, sin descanso' : `Serie ${st.j + 1} de ${e.log.length} · ${reps(e)} reps`}</div>
    <div class="w2-val"><button data-act="w2-adj" data-f="w" data-d="-1" aria-label="Menos peso">−</button><button class="w2-num" data-act="w2-pad" data-f="w"><b class="num">${fmtKg(+s.w || 0)}</b><small>kg${e.bar ? ' discos' : ''}</small></button><button data-act="w2-adj" data-f="w" data-d="1" aria-label="Más peso">+</button></div>
    ${pl ? `<div class="w2-pl">En cada lado: <b>${pl}</b></div>` : ''}
    <div class="w2-val"><button data-act="w2-adj" data-f="r" data-d="-1" aria-label="Menos reps">−</button><button class="w2-num" data-act="w2-pad" data-f="r"><b class="num">${r}</b><small>reps</small></button><button data-act="w2-adj" data-f="r" data-d="1" aria-label="Más reps">+</button></div>
    ${drop ? '' : w2Hint(d, i, e, st.j)}
    <button class="w2-go" data-act="w2-done">✓ ${drop ? 'Drop hecho' : 'Serie hecha'}</button>
    ${w2Nav(i, n)}</div>`;
};

/* ---------- Inicio en el reloj ---------- */
const _vWatchHomeW2 = vWatchHome;
vWatchHome = function () {
  if (!state.draft) w2.away = false;
  if (state.draft) return `<div class="w2-homebtns"><button class="w2-go" data-act="w2-back">▶ Volver al entrenamiento</button><div class="w2-tip">${esc(state.draft.dayName || '')} sigue abierto.</div><button class="w2-mi" data-act="tab" data-tab="settings">⚙ Ajustes</button><button class="w2-mi" data-act="tab" data-tab="profile">👤 Perfil</button><button class="w2-mi" data-act="w2-full">📱 Vista completa</button></div>`;
  return _vWatchHomeW2().replace(/<button class="btn small" data-act="watch-off">Ver completo<\/button>/g, '') +
    `<div class="w2-homebtns"><button class="w2-mi" data-act="tab" data-tab="settings">⚙ Ajustes</button><button class="w2-mi" data-act="tab" data-tab="profile">👤 Perfil</button><button class="w2-mi" data-act="w2-full">📱 Vista completa</button></div>`;
};
/* Fuera de Entrenar (Ajustes, Perfil…) en modo reloj no hay barra: botón para volver */
const _renderW2 = render;
render = function () {
  _renderW2();
  document.body.classList.toggle('w2-on', isWatch() && !!state.draft);
  if (isWatch() && !state.draft && state.tab !== 'train') {
    const app = $('#app'); if (app && !app.querySelector('.w2-home')) app.insertAdjacentHTML('afterbegin', `<button class="w2-home" data-act="tab" data-tab="train">‹ Inicio</button>`);
  }
};

/* ---------- Descanso a pantalla completa ---------- */
function w2NextTxt() {
  const d = state.draft; if (!d) return '';
  const { i, e } = w2Ex(), wu = w2Warm(e, i, d);
  if (wu) return `Sigue: calentamiento ${wu.k + 1}/${wu.W.sets.length} · <b class="num">${wu.s.bar ? 'barra sola' : fmtKg(wu.s.w) + ' kg'}</b> × ${wu.s.r}`;
  const st = watchStep(e);
  if (!st) { const nx = nextPending(d, i); return nx == null ? '¡Terminaste todo! Toca Terminar.' : `Sigue: <b>${esc(d.exercises[nx].name)}</b>`; }
  const r = st.s.r != null && st.s.r !== '' ? st.s.r : goalReps(e, st.j);
  return `Sigue: ${esc(e.name)} · serie ${st.j + 1}/${e.log.length}<br><b class="num">${fmtKg(+st.s.w || 0)} kg × ${r}</b>`;
}
function w2RirBlock() {
  const L = state.wLast, d = state.draft; if (!L || L.k != null || !d) return '';
  const e = d.exercises[L.i], s = e && e.log[L.j]; if (!s || !s.done) return '';
  const plan = typeof rirTarget === 'function' ? Math.min(3, rirTarget(L.j)) : null;
  return `<div class="wr-rir"><span>¿Cuántas reps te sobraron?</span><div>${[0, 1, 2, 3].map(v => `<button class="${s.rir === v ? 'on' : ''} ${s.rir == null && v === plan ? 'plan' : ''}" data-act="w2-rir" data-v="${v}">${v === 3 ? '3+' : v}</button>`).join('')}</div></div>`;
}
const _tickW2 = tick;
tick = function () {
  if (!isWatch()) return _tickW2();
  const el = $('#rest'), r = state.rest, now = Date.now();
  if (!r) { if (!el.hidden || el.innerHTML) { el.hidden = true; el.innerHTML = ''; el.classList.remove('w2-rest'); } return; }
  const left = Math.max(0, (r.end - now) / 1000), go = left <= 0;
  if (go && !r.rang) { r.rang = true; beep(); }
  const hold = go && typeof restHold === 'function' && restHold(r, now);
  if (go && !hold && now - Math.max(r.end, r.holdDone || 0) > 6000) { state.rest = null; el.hidden = true; el.innerHTML = ''; el.classList.remove('w2-rest'); render(); return; }
  if (!r.wid) r.wid = String(Math.random()).slice(2);
  if (el.dataset.rid !== r.wid || !el.querySelector('.wr')) {
    el.dataset.rid = r.wid; el.classList.add('w2-rest'); el.hidden = false;
    el.innerHTML = `<div class="wr"><div class="wr-top"><span class="wr-l" id="wr-l">Descanso</span><span class="wr-hr num" id="wr-hr"></span></div>
      <div class="wr-t num" id="wr-t"></div><div class="wr-bar"><i id="wr-bar"></i></div>
      <div class="wr-msg" id="wr-msg"></div>
      <div id="wr-rir">${w2RirBlock()}</div>
      <div class="wr-next" id="wr-next">${w2NextTxt()}</div>
      <div class="wr-btns"><button data-act="rest-add" data-d="-10">−10 s</button><button data-act="rest-add" data-d="10">+10 s</button><button class="skip" data-act="rest-skip" id="wr-skip">Saltar</button></div></div>`;
  }
  const wr = el.querySelector('.wr'), b = typeof hrNow === 'function' ? hrNow() : 0, ready = typeof hrReady === 'function' ? hrReady() : 0;
  wr.className = 'wr' + (go ? (r.hold ? ' hold' : ' go') : '');
  $('#wr-l').textContent = go ? (r.hold ? 'Pulso alto' : '¡A la siguiente!') : 'Descanso';
  $('#wr-t').textContent = go ? (r.hold ? '❤ ' + (b || '') : '0:00') : clock(Math.ceil(left));
  $('#wr-bar').style.width = (go ? 100 : Math.min(100, (1 - left / Math.max(1, r.total)) * 100)).toFixed(1) + '%';
  $('#wr-hr').textContent = b ? `❤ ${b}${ready ? ' → ' + ready : ''}` : '';
  $('#wr-msg').innerHTML = !go ? (b && ready && b <= ready && now - (r.end - r.total * 1000) > 25000 ? '<span class="okc">Pulso recuperado: ya puedes seguir</span>' : '')
    : r.hold ? `Respira hondo por la nariz. Sigue cuando baje a <b>${ready}</b> (máx. 1 min).` : (r.holdDone ? '<span class="okc">¡Pulso recuperado! Sigue.</span>' : '');
  $('#wr-skip').textContent = go ? 'Seguir' : 'Saltar';
};
setInterval(() => { const el = document.getElementById('w2-hr'); if (el) el.textContent = hrTxt(); }, 1000);

/* Al marcar una serie en el reloj: recordar cuál fue (para preguntar el RIR en el descanso) */
const _markSetW2 = markSet;
markSet = function (i, j, v, k) {
  if (isWatch()) state.wLast = (v !== false) ? { i, j, k: k == null ? null : k } : null;
  _markSetW2(i, j, v, k);
};

/* ---------- Acciones ---------- */
function w2Apply(e, st, f, nv) {
  const s = st.s, old = f === 'w' ? (+s.w || 0) : (s.r != null && s.r !== '' ? +s.r : goalReps(e, st.j));
  s[f] = nv;
  if (st.k == null) for (let x = st.j + 1; x < e.log.length; x++) { const o = e.log[x]; if (!o.done && (o[f] == null || o[f] === '' || +o[f] === old)) o[f] = nv; }
}
document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-act^="w2-"]'); if (!b) return;
  ev.stopPropagation(); ev.preventDefault();
  const a = b.dataset.act, d = state.draft;
  if (a === 'w2-away') { w2.away = true; w2.menu = null; state.tab = 'train'; render(); return; }
  if (a === 'w2-back') { w2.away = false; state.tab = 'train'; render(); return; }
  if (a === 'w2-full') { state.settings.watch = false; w2.menu = null; saveLocal(); render(); toast('Vista completa. Para volver: Ajustes → Modo reloj.'); return; }
  if (!d) return;
  const { i, e } = w2Ex();
  try { HAP && HAP.impact({ style: 'LIGHT' }); } catch (x) {}
  if (a === 'w2-go') { const k = +b.dataset.i; if (k >= 0 && k < d.exercises.length) { d.cur = k; saveDraft(); } w2.menu = null; render(); }
  else if (a === 'w2-adj') {
    const st = watchStep(e); if (!st) return;
    const f = b.dataset.f, dd = +b.dataset.d, s = st.s;
    if (f === 'w') { const w = +s.w || 0, inc = e.inc || increment(e, w); w2Apply(e, st, 'w', Math.max(0, Math.round((w + inc * dd) * 100) / 100)); }
    else { const r = s.r != null && s.r !== '' ? +s.r : (st.k != null ? Math.max(1, Math.round(e.repsMax * 0.6)) : goalReps(e, st.j)); w2Apply(e, st, 'r', Math.max(0, r + dd)); }
    d.lastAct = Date.now(); saveDraft(); render();
  }
  else if (a === 'w2-pad') { w2.pad = { f: b.dataset.f, v: '' }; render(); }
  else if (a === 'w2-k') {
    const P = w2.pad; if (!P) return; const k = b.dataset.k;
    if (k === '⌫') P.v = P.v.slice(0, -1);
    else if (k === '.') { if (P.v.indexOf('.') < 0) P.v = (P.v || '0') + '.'; }
    else if (P.v.length < 6) P.v = P.v === '0' ? k : P.v + k;
    const el = document.getElementById('w2-padv'); if (el) el.innerHTML = P.v ? esc(P.v) : '<span class="ph">0</span>';
  }
  else if (a === 'w2-padx') { w2.pad = null; render(); }
  else if (a === 'w2-padok') {
    const P = w2.pad, st = watchStep(e); w2.pad = null;
    if (P && st && P.v !== '' && isFinite(+P.v)) { w2Apply(e, st, P.f, P.f === 'r' ? Math.round(+P.v) : +P.v); d.lastAct = Date.now(); saveDraft(); }
    render();
  }
  else if (a === 'w2-done') {
    const st = watchStep(e); if (!st) return;
    if (st.s.r == null || st.s.r === '') st.s.r = st.k != null ? Math.max(1, Math.round(e.repsMax * 0.6)) : goalReps(e, st.j);
    markSet(i, st.j, true, st.k);
  }
  else if (a === 'w2-wu') { e.wu = e.wu || []; e.wu[+b.dataset.k] = true; state.wLast = null; d.lastAct = Date.now(); saveDraft(); startRest(60); render(); }
  else if (a === 'w2-wuskip') { e.wuSkip = true; saveDraft(); render(); }
  else if (a === 'w2-wuagain') { e.wuSkip = false; e.wu = []; w2.menu = null; saveDraft(); render(); }
  else if (a === 'w2-menu') { w2.menu = b.dataset.m || null; w2.conf = null; render(); }
  else if (a === 'w2-set') {
    if (+b.dataset.d > 0) { const l = e.log[e.log.length - 1]; e.log.push({ w: l ? l.w : e.sugg.w, r: null, done: false, drops: [] }); }
    else if (e.log.length > 1 && !e.log[e.log.length - 1].done) e.log.pop();
    e.target = e.log.length; w2.menu = null; saveDraft(); render();
  }
  else if (a === 'w2-now') { const busy = e.name, at = doNow(i, +b.dataset.k); w2.menu = null; render(); if (at != null) toast(`Ahora ${d.exercises[at].name}; luego vuelves a ${busy}.`); }
  else if (a === 'w2-swap') { w2.menu = null; swapDo(i, b.dataset.name, false); }
  else if (a === 'w2-add') { addToDraft([b.dataset.name], i); w2.menu = null; render(); toast('Agregado a tu entrenamiento de hoy.'); }
  else if (a === 'w2-save') { w2.menu = null; finishSession(); }
  else if (a === 'w2-discard') { if (w2.conf === 'discard') { w2.conf = null; w2.menu = null; discardSession(); toast('Entrenamiento descartado.'); } else { w2.conf = 'discard'; render(); } }
  else if (a === 'w2-rir') {
    const L = state.wLast, s = L && d.exercises[L.i] && d.exercises[L.i].log[L.j]; if (!s) return;
    const v = +b.dataset.v; s.rir = s.rir === v ? null : v; d.lastAct = Date.now(); saveDraft();
    b.parentNode.querySelectorAll('button').forEach(x => { x.classList.toggle('on', +x.dataset.v === s.rir); x.classList.remove('plan'); });
  }
}, true);
/* Tras "Agregar" desde la lista completa en el reloj, volver a la pantalla de la serie */
const _addToDraftW2 = addToDraft;
addToDraft = function (names, at) { _addToDraftW2(names, at); w2.menu = null; };
render();
