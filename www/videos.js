/* ==========================================================================
   Videos de tus ejercicios (rama videos-ejercicios). Solo el teléfono: el reloj no muestra esta lista.
   1. Lista de todos los ejercicios que hiciste (de tu historial): cuántas veces, la última fecha y si ya tiene
      video de muestra. Filtros Todos · Sin video · Con video y un buscador. Tocar uno abre "Cómo se hace", donde
      ya se agregan los videos (media.js: guardados solo en este teléfono, o un enlace de YouTube/TikTok).
   La subida de videos a la nube NO está aquí: espera el plan aprobado.
   ========================================================================== */
const vx = { q: '', f: 'all' };
/* Un ejercicio por clave (exHKey: el mismo ejercicio aunque cambie el alias), con su nombre de la última vez */
function vxList() {
  const M = new Map();
  state.sessions.forEach(s => {   /* las sesiones van de la más reciente a la más antigua */
    if (s.approx) return;
    const seen = {};
    s.exercises.forEach(e => {
      if (!e || !e.name || !(e.sets || []).length) return;
      const k = exHKey(e.name); if (seen[k]) return; seen[k] = 1;
      let o = M.get(k);
      if (!o) { const x = libFind(e.name); M.set(k, o = { k, name: x ? x.name : e.name, n: 0, last: s.date }); }
      o.n++; if (s.date > o.last) o.last = s.date;
    });
  });
  return Array.from(M.values()).map(o => Object.assign(o, vxHas(o.name)));
}
/* ¿Tiene video de muestra? En el teléfono (VID.index) o un enlace guardado (LINKS) */
function vxHas(name) {
  const key = exKey(name), loc = !!(VID.index && VID.index.has(key)), lnk = ((LINKS()[key] || []).length) > 0;
  return { loc, lnk, has: loc || lnk };
}
const vxHay = o => { const x = libFind(o.name); return normName(o.name + ' ' + (x && typeof catHay === 'function' ? catHay(x) : '')); };
function vxRows() {
  const L = vxList(), q = normName(vx.q.trim()).split(/\s+/).filter(Boolean);
  const all = L.length, sin = L.filter(o => !o.has).length;
  const show = L.filter(o => (vx.f === 'sin' ? !o.has : vx.f === 'con' ? o.has : true) && q.every(w => vxHay(o).indexOf(w) >= 0))
    .sort((a, b) => b.n - a.n || (a.last < b.last ? 1 : -1));
  return { all, sin, show };
}
function vxListHtml() {
  const R = vxRows();
  const badge = o => (o.loc ? `<span class="vx-b ok">${ic('play', 12)} Video</span>` : o.lnk ? `<span class="vx-b link">${ic('play', 12)} Enlace</span>` : '<span class="vx-b no">Sin video</span>');
  const rows = R.show.map(o => `<button type="button" class="qk-ex vx-row" data-vx="open" data-n="${esc(o.name)}">${thumb(o.name)}<span class="grow"><b>${esc(o.name)}</b><small class="muted">${o.n} ${o.n === 1 ? 'vez' : 'veces'} · última: ${fmtDate(o.last)} (${ago(o.last)})</small></span>${badge(o)}</button>`).join('');
  return `<div class="muted vx-sum">${R.all} ${R.all === 1 ? 'ejercicio hecho' : 'ejercicios hechos'} · <b>${R.sin}</b> sin video${R.show.length !== R.all ? ` · mostrando ${R.show.length}` : ''}</div>
    <div class="qk-list vx-list">${rows || `<div class="muted">${!R.all ? 'Aún no hay ejercicios en tu historial. Cuando termines tu primer entreno aparecerán aquí.' : vx.f === 'sin' && !vx.q ? '¡Todos tus ejercicios tienen video!' : 'Ningún ejercicio coincide con tu búsqueda.'}</div>`}</div>`;
}
function vxSheet() {
  if (isWatch()) return;
  const chip = (v, l) => `<button type="button" class="qk-chip ${vx.f === v ? 'on' : ''}" data-vx="f" data-v="${v}" aria-pressed="${vx.f === v}">${l}</button>`;
  openSheet(`<div class="row"><h2 class="grow">Videos de tus ejercicios</h2><button class="icon-btn" data-act="sheet-close" aria-label="Cerrar">${ic('x', 18)}</button></div>
    <div class="muted" style="font-size:13px">Todos los ejercicios de tu historial. Toca uno para ver su técnica y agregarle un video de muestra.</div>
    <input id="vx-q" type="search" placeholder="Buscar: prensa, curl, pecho…" autocomplete="off" aria-label="Buscar ejercicio" value="${esc(vx.q)}">
    <div class="qk-chips vx-f" role="group" aria-label="Filtro">${chip('all', 'Todos')}${chip('sin', 'Sin video')}${chip('con', 'Con video')}</div>
    <div id="vx-box">${vxListHtml()}</div>`);
  const c = document.querySelector('#sheet .sheet-card'); if (c) c.classList.add('pk-sheet', 'vx-sheet');
  const i = document.getElementById('vx-q'); if (i && !vx.q) i.blur();   /* sin abrir el teclado al entrar */
}
const vxPut = () => { const b = document.getElementById('vx-box'); if (b) b.innerHTML = vxListHtml(); };
/* Buscar sin redibujar la hoja (el teclado no se cierra) */
document.addEventListener('input', ev => { if (ev.target && ev.target.id === 'vx-q') { vx.q = ev.target.value; vxPut(); } });
let vxBack = false;
window.addEventListener('click', ev => {
  const b = ev.target.closest && ev.target.closest('[data-vx]'); if (!b || isWatch()) return;
  ev.preventDefault(); ev.stopPropagation();
  const a = b.dataset.vx;
  if (a === 'open-list') return vxSheet();
  if (a === 'f') { vx.f = b.dataset.v; document.querySelectorAll('#sheet [data-vx="f"]').forEach(x => { const on = x.dataset.v === vx.f; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); }); return vxPut(); }
  if (a === 'open') { vxBack = true; howSheet(b.dataset.n); }
}, true);
/* Al cerrar "Cómo se hace" que abriste desde la lista, vuelves a la lista (ya con el video nuevo) */
const _closeSheetVX = closeSheet;
closeSheet = function () {
  const back = vxBack; vxBack = false;
  const r = _closeSheetVX.apply(this, arguments);
  if (back && !isWatch()) setTimeout(vxSheet, 0);
  return r;
};

/* Entrada: Progreso · Ejercicios, arriba */
function vxCardHtml() {
  const L = vxList(), sin = L.filter(o => !o.has).length;
  return `<div class="card vx-card"><div class="row"><span class="pb-ic">${ic('play', 18)}</span><div class="grow"><b>Videos de tus ejercicios</b><div class="muted" style="font-size:12.5px">${L.length} ${L.length === 1 ? 'ejercicio hecho' : 'ejercicios hechos'} · ${sin ? `<b>${sin}</b> sin video` : 'todos con video'}</div></div></div>
    <button type="button" class="btn small block" data-vx="open-list">${ic('search', 15)} Ver la lista</button></div>`;
}
const _renderVX = render;
render = function () {
  const r = _renderVX.apply(this, arguments);
  if (isWatch() || state.tab !== 'progress' || state.progSub !== 'ejercicios' || state.draft && !state.sessMin) return r;
  const app = document.getElementById('app'); if (!app || app.querySelector('.vx-card') || !state.sessions.some(s => !s.approx)) return r;
  const seg = app.querySelector('.prog-seg'); if (seg) seg.insertAdjacentHTML('afterend', vxCardHtml());
  return r;
};
/* Cuando termina de leer qué ejercicios tienen video (es asíncrono), la lista abierta se actualiza */
const _vidLoadVX = VID.loadIndex.bind(VID);
VID.loadIndex = function () { return Promise.resolve(_vidLoadVX()).then(() => { setTimeout(() => { if (document.querySelector('#sheet .vx-sheet')) vxPut(); }, 50); }); };
bootRender();
