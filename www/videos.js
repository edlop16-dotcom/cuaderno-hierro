/* ==========================================================================
   Videos de tus ejercicios (rama videos-ejercicios). Solo el teléfono: el reloj no muestra esta lista.
   1. Lista de todos los ejercicios que hiciste (de tu historial): cuántas veces, la última fecha y si ya tiene
      video de muestra. Filtros Todos · Sin video · Con video y un buscador. Tocar uno abre "Cómo se hace", donde
      ya se agregan los videos (media.js: guardados solo en este teléfono, o un enlace de YouTube/TikTok).
   2. Dónde se guardan (VXS): por ahora solo en este teléfono (decisión del usuario, opción A). Todo pasa por VXS para
      poder cambiar a la nube (opción C, pendiente: Cloudflare R2, comprimidos y solo los grabados por ti) sin rehacerlo.
   3. "Lo grabé yo" al agregar un video (rec.own) y su duración y tamaño de imagen (rec.dur, w, h), que pedirá la nube.
   4. "Ver en YouTube": la búsqueda de ese ejercicio ordenada por más vistas (no elige un video concreto).
   El reloj no cambia: su "Cómo se hace" sigue con el código de siempre (media.js).
   ========================================================================== */

/* ---------- 2. Dónde se guardan tus videos ----------
   Un "lugar" (backend) con estas funciones: list(ex) → videos de un ejercicio, get(id), add(rec), put(rec), del(id),
   has(ex) → ¿tiene alguno? (sin cargarlos), src(rec) → dirección para reproducirlo.
   Hoy: VX_LOCAL (IndexedDB 'cdh-media' de media.js; también lo usa el Respaldo completo).
   Para la opción C se agrega un VX_R2 con las mismas funciones (subir comprimido solo si rec.own, guardar en rec.remote
   la dirección en la nube) y se cambia VXS.backend; la lista, "Cómo se hace" y el borrado no cambian. */
const VX_LOCAL = {
  id: 'local',
  list: ex => VID.list(ex),
  get: id => VID.tx('readonly', s => s.get(id)),
  add: rec => VID.add(rec),
  put: rec => VID.tx('readwrite', s => s.put(rec)),
  del: id => VID.del(id),
  has: ex => !!(VID.index && VID.index.has(ex)),
  src: rec => (rec && rec.blob ? URL.createObjectURL(rec.blob) : ''),
};
const VXS = { backend: VX_LOCAL };
['list', 'get', 'add', 'put', 'del', 'has', 'src'].forEach(k => { VXS[k] = function () { return VXS.backend[k].apply(VXS.backend, arguments); }; });
/* Un video nuevo, con todo lo que la nube va a necesitar (v: 2). Los guardados antes no tienen own/dur: "sin indicar" */
const vxRecord = (file, name, meta, own) => ({ v: 2, id: uid(), ex: exKey(name), exName: name, name: file.name, type: file.type, size: file.size, blob: file, added: Date.now(), own: !!own, dur: meta.dur || 0, w: meta.w || 0, h: meta.h || 0, remote: null });
/* Duración y tamaño de imagen, leídos del propio video (si el teléfono no puede, quedan en 0) */
function vxMeta(file) {
  return new Promise(res => {
    let done = false, u = '';
    const end = o => { if (done) return; done = true; try { if (u) URL.revokeObjectURL(u); } catch (e) {} res(o); };
    try {
      const v = document.createElement('video'); v.preload = 'metadata'; v.muted = true; u = URL.createObjectURL(file);
      v.onloadedmetadata = () => end({ dur: isFinite(v.duration) ? Math.round(v.duration * 10) / 10 : 0, w: v.videoWidth || 0, h: v.videoHeight || 0 });
      v.onerror = () => end({}); v.src = u;
    } catch (e) { end({}); }
    setTimeout(() => end({}), 4000);
  });
}

/* ---------- 4. Ver en YouTube: la búsqueda ordenada por más vistas ---------- */
const vxYt = name => 'https://www.youtube.com/results?search_query=' + encodeURIComponent(name + ' técnica') + '&sp=CAM%253D';

/* ---------- "Cómo se hace" en el teléfono: tus videos, "Lo grabé yo" y Ver en YouTube ---------- */
const vxDur = s => (s >= 60 ? Math.floor(s / 60) + ' min ' + String(Math.round(s % 60)).padStart(2, '0') + ' s' : Math.round(s) + ' s');
const _renderVideosVX = renderVideos;
renderVideos = async function (name) {
  if (isWatch()) return _renderVideosVX.apply(this, arguments);   /* el reloj: lo de siempre */
  const box = document.getElementById('my-vids'); if (!box) return;
  const key = exKey(name);
  let vids = [];
  try { vids = await VXS.list(key); } catch (e) { box.innerHTML = '<div class="muted">No se pudo abrir el almacenamiento de videos en este equipo.</div>'; return; }
  freeVidUrls();
  const links = LINKS()[key] || [];
  const own = v => (v.own === true ? `<button type="button" class="vx-own on" data-act="vx-own" data-id="${esc(v.id)}" data-name="${esc(name)}" aria-pressed="true">${ic('check', 13)} Lo grabé yo</button>`
    : `<button type="button" class="vx-own" data-act="vx-own" data-id="${esc(v.id)}" data-name="${esc(name)}" aria-pressed="false">${v.own === false ? 'De otra fuente' : '¿Lo grabaste tú?'}</button>`);
  box.innerHTML = `
    ${vids.length ? vids.map(v => { const u = VXS.src(v); if (u) vidUrls.push(u); return `<div class="vidcard"><video src="${u}" controls playsinline preload="metadata" loop data-vid="${esc(v.id)}"></video>
      <div class="speeds" role="group" aria-label="Velocidad">${SPEEDS.map(r => `<button class="spd ${r === 1 ? 'on' : ''}" data-act="vid-rate" data-id="${esc(v.id)}" data-rate="${r}" aria-pressed="${r === 1}">${r === 1 ? 'Normal' : r + '×'}</button>`).join('')}</div>
      <div class="row vx-vrow"><span class="grow muted vx-vname">${esc(v.name)} · ${fmtMB(v.size)}${v.dur ? ' · ' + vxDur(v.dur) : ''}</span>${own(v)}
      <button class="btn small danger" data-act="vid-del" data-id="${esc(v.id)}" data-name="${esc(name)}">${state.confirm === 'vdel-' + v.id ? '¿Borrar?' : 'Borrar'}</button></div></div>`; }).join('')
      : '<div class="muted" style="font-size:13px">Aún no guardas videos de este ejercicio. Se guardan solo en este teléfono y se ven sin internet.</div>'}
    <label class="row vx-ownq"><input type="checkbox" id="vid-own"><span>Lo grabé yo <small class="muted">(más adelante, solo los grabados por ti se podrán subir a la nube)</small></span></label>
    <label class="btn block" for="vid-file">+ Agregar video del teléfono</label>
    <input type="file" id="vid-file" accept="video/*" data-name="${esc(name)}" hidden>
    ${links.length ? `<div class="label" style="margin-top:4px">Enlaces guardados (necesitan internet)</div>${links.map((l, i) => `<div class="row"><a class="vid grow" href="${esc(l)}" target="_blank" rel="noopener" style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(l.replace(/^https?:\/\/(www\.)?/, ''))}</a><button class="icon-btn" data-act="link-del" data-i="${i}" data-name="${esc(name)}" aria-label="Quitar enlace">✕</button></div>`).join('')}` : ''}
    <div class="row" style="flex-wrap:wrap;gap:8px"><a class="btn small vx-yt" href="${vxYt(name)}" target="_blank" rel="noopener">${ic('play', 15)} Ver en YouTube ↗</a><a class="btn small" href="https://www.tiktok.com/search?q=${encodeURIComponent(name + ' técnica')}" target="_blank" rel="noopener">Buscar en TikTok ↗</a></div>
    <div class="muted" style="font-size:12.5px">"Ver en YouTube" abre los videos de este ejercicio con más vistas. Para tener uno sin internet, guárdalo en tu galería o grábate, y agrégalo aquí.</div>
    <form id="f-link" class="row" data-name="${esc(name)}"><input id="link-url" type="url" placeholder="Pega un enlace de YouTube o TikTok" inputmode="url"><button class="btn small" type="submit">Guardar</button></form>`;
};
const _addVideoVX = addVideo;
addVideo = async function (file, name) {
  if (isWatch()) return _addVideoVX.apply(this, arguments);
  if (!file) return;
  if (!/^video\//.test(file.type) && !/\.(mp4|webm|mov|3gp|mkv)$/i.test(file.name)) { toast('Ese archivo no es un video.'); return; }
  if (file.size > 150 * 1048576) { toast('El video pesa más de 150 MB. Recórtalo o elige uno más corto.'); return; }
  const ownBox = document.getElementById('vid-own'), own = !!(ownBox && ownBox.checked);
  toast('Guardando video…');
  try {
    await VXS.add(vxRecord(file, name, await vxMeta(file), own));
    toast('Video guardado en este teléfono. Ya puedes verlo sin internet.');
  } catch (e) { toast('No se pudo guardar: el teléfono no tiene espacio suficiente.'); }
  renderVideos(name);
};
/* Cambiar "Lo grabé yo" de un video ya guardado (los de antes quedan "¿Lo grabaste tú?" hasta que lo digas) */
window.addEventListener('click', async ev => {
  const b = ev.target.closest && ev.target.closest('[data-act="vx-own"]'); if (!b || isWatch()) return;
  ev.preventDefault(); ev.stopPropagation();
  try { const r = await VXS.get(b.dataset.id); if (!r) return; r.own = !(r.own === true); await VXS.put(r); } catch (e) { toast('No se pudo cambiar.'); return; }
  renderVideos(b.dataset.name);
}, true);

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
/* ¿Tiene video de muestra? Guardado (VXS: hoy en el teléfono) o un enlace guardado (LINKS) */
function vxHas(name) {
  const key = exKey(name), loc = VXS.has(key), lnk = ((LINKS()[key] || []).length) > 0;
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
