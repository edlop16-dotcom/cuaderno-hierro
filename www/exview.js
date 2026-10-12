/* ==========================================================================
   Ventana de ejercicio (desde Rutinas): fotos reales en movimiento, opción de ver
   el muñequito animado y pestañas "Editar" / "Mis estadísticas".
   ========================================================================== */
state.exvTab = state.exvTab || 'edit';
let exvCapturing = false, exvAnim = null;

/* HTML de las estadísticas del ejercicio, sin cabecera ni botones (para incrustar) */
function exvStatsHtml(name) {
  const keep = openSheet; let html = '';
  exvCapturing = true;
  openSheet = h => { html = h; };
  try { exStats(name); } catch (e) { html = ''; } finally { openSheet = keep; exvCapturing = false; }
  const t = document.createElement('div'); t.innerHTML = html;
  const head = t.firstElementChild; if (head && head.classList.contains('row')) head.remove();
  const last = t.lastElementChild; if (last && last.classList.contains('grid2')) last.remove();
  return t.innerHTML;
}
function exvMedia(name) {
  const x = libFind(name), pk = photoKey(name);
  if (!x && !pk) return '';
  const fig = x ? `<div class="exv-fig ${pk ? 'fig-hide' : ''}" id="exv-fig">${figSVG(x, 0)}</div>` : '';
  return `<div class="exv-media">${pk ? exPhoto(pk, 'exv-ph') : ''}${fig}
    ${pk && x ? `<button type="button" class="btn small fig-tog" data-act="exv-fig">${ic('person-standing', 15)} Ver muñequito</button>` : ''}
    ${x ? `<div class="muted exv-musc">${esc(x.musc.join(' · '))}</div>` : ''}</div>`;
}
function exvAnimate(on) {
  cancelAnimationFrame(exvAnim); exvAnim = null;
  const el = document.getElementById('exv-fig'), name = state.exvCtx && state.exvCtx.name, x = name && libFind(name);
  if (!on || !el || !x) return;
  const t0 = performance.now();
  const loop = now => {
    const box = document.getElementById('exv-fig'); if (!box || box.classList.contains('fig-hide')) { exvAnim = null; return; }
    const ph = ((now - t0) / 2400) % 1, t = ph < 0.5 ? ph * 2 : 2 - ph * 2;
    box.innerHTML = figSVG(x, t * t * (3 - 2 * t));
    exvAnim = requestAnimationFrame(loop);
  };
  exvAnim = requestAnimationFrame(loop);
}

const _exSheetV = exSheet;
exSheet = function (pid, did, k, preset) {
  _exSheetV(pid, did, k, preset);
  if (k == null || k === '') { state.exvCtx = null; return; }
  const { d } = findDay(pid, did), e = d && d.exercises[+k]; if (!e) return;
  const name = (preset && preset.name) || e.name;
  state.exvCtx = { pid, did, k: +k, name };
  const card = document.querySelector('#sheet .sheet-card'); if (!card) return;
  /* quitar la figura pequeña original */
  const oldFig = card.querySelector('.fig'); if (oldFig) { const r = oldFig.closest('.row'); if (r) r.remove(); }
  const h2 = card.querySelector('h2');
  const tab = state.exvTab === 'stats' ? 'stats' : 'edit';
  h2.insertAdjacentHTML('afterend', exvMedia(name) + `<div class="seg exv-seg"><button type="button" class="${tab === 'edit' ? 'on' : ''}" data-act="exv-tab" data-v="edit">${ic('square-pen', 15)} Editar</button><button type="button" class="${tab === 'stats' ? 'on' : ''}" data-act="exv-tab" data-v="stats">${ic('trending-up', 15)} Mis estadísticas</button></div>
    <div class="exv-stats" ${tab === 'stats' ? '' : 'hidden'}>${exvStatsHtml(name)}</div>`);
  const lib = card.querySelector('[data-act="lib-pick"]'), form = card.querySelector('#f-ex');
  [lib, form].forEach(x => { if (x) x.hidden = tab === 'stats'; });
  h2.textContent = name;
  h2.insertAdjacentHTML('beforebegin', `<div class="row exv-top"><div class="label grow">Ejercicio · ${esc(d.name)}</div><button type="button" class="icon-btn" data-act="sheet-close" aria-label="Cerrar">${ic('x', 18)}</button></div>`);
};

/* Datos del formulario (para no perder cambios al re-dibujar) */
function exvPreset() {
  const f = document.getElementById('f-ex'); if (!f) return undefined;
  const v = id => { const el = f.querySelector('#' + id); return el ? el.value : undefined; };
  const n = id => { const x = parseFloat(String(v(id) || '').replace(',', '.')); return isFinite(x) ? x : undefined; };
  const t = f.querySelector('#fx-drop');
  return { name: v('fx-name'), type: v('fx-type'), weight: n('fx-w'), sets: n('fx-s'), repsMin: n('fx-a'), repsMax: n('fx-b'), rest: n('fx-r'), bar: n('fx-bar'), dropLast: t ? t.checked : undefined };
}
function exvRedraw() {
  const c = state.exvCtx; if (!c) return;
  const sc = document.querySelector('#sheet .sheet-card'), top = sc ? sc.scrollTop : 0;
  exSheet(c.pid, c.did, c.k, exvPreset());
  const n = document.querySelector('#sheet .sheet-card'); if (n) n.scrollTop = top;
}
/* Las estadísticas incrustadas se re-dibujan aquí mismo */
const _exStatsV = exStats;
exStats = function (name) {
  if (!exvCapturing && state.exvCtx && state.exvCtx.name === name && document.getElementById('f-ex')) { exvRedraw(); return; }
  return _exStatsV(name);
};

document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-act="exv-tab"],[data-act="exv-fig"]'); if (!b) return;
  ev.stopPropagation(); ev.preventDefault();
  if (b.dataset.act === 'exv-tab') {
    state.exvTab = b.dataset.v;
    const card = document.querySelector('#sheet .sheet-card'); if (!card) return;
    card.querySelectorAll('.exv-seg button').forEach(x => x.classList.toggle('on', x === b));
    const st = state.exvTab === 'stats';
    card.querySelector('.exv-stats').hidden = !st;
    const lib = card.querySelector('[data-act="lib-pick"]'), form = card.querySelector('#f-ex');
    [lib, form].forEach(x => { if (x) x.hidden = st; });
  } else {
    const f = document.getElementById('exv-fig'), ph = document.querySelector('#sheet .exv-ph'); if (!f) return;
    const show = f.classList.contains('fig-hide');
    f.classList.toggle('fig-hide', !show); if (ph) ph.classList.toggle('fig-hide', show);
    b.innerHTML = `${ic(show ? 'camera' : 'person-standing', 15)} ${show ? 'Ver fotos' : 'Ver muñequito'}`;
    exvAnimate(show);
  }
}, true);
/* Si no hay foto, el muñequito se anima solo */
const _exSheetV2 = exSheet;
exSheet = function (pid, did, k, preset) {
  _exSheetV2(pid, did, k, preset);
  const f = document.getElementById('exv-fig'); if (f && !f.classList.contains('fig-hide')) exvAnimate(true);
  if (state.exvCtx) { try { document.activeElement && document.activeElement.blur(); } catch (e) {} }   // sin teclado al abrir
};
