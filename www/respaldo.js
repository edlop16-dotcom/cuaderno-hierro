/* ==========================================================================
   Respaldo completo (rama respaldo-completo). Solo el teléfono: el reloj no cambia.
   Junto al respaldo de siempre (texto con planes e historial), guarda en UN archivo todo lo que solo vive en este equipo:
   las claves `cdh.*` (Mis finanzas, enlaces, chat con la IA, ajustes del equipo) y las bases `forja-fotos` (fotos de
   progreso), `forja-misej` (fotos de Mis ejercicios) y `cdh-media` (videos).
   - El archivo va por líneas (una por dato; los videos en trozos): se escribe y se lee por partes, sin cargarlo entero.
   - La última línea confirma que está completo: un archivo cortado no se restaura.
   - La sesión de la cuenta no va en el archivo (`KEEP_SKIP`): hay que volver a entrar.
   - Mis finanzas solo va y solo se muestra para el dueño (`finOwner`).
   - Restaurar primero muestra qué trae. "Agregar lo que falta" no borra nada; "Reemplazar todo" pide confirmar y antes
     guarda una copia (`keepSnapshot`).
   ========================================================================== */
const RC_APP = 'forja-respaldo', RC_V = 1, RC_CHUNK = 768 * 1024;
const RC_SKIP = KEEP_SKIP.concat(['cdh.errq', 'cdh.finPrev']);
/* Lo que se combina al agregar; lo demás, si ya existe en este equipo, no se toca */
const RC_ADD = { 'cdh.sessions': 1, 'cdh.daily': 1, 'cdh.links': 1 };
const rcKeys = () => Object.keys(localStorage).filter(k => k.indexOf('cdh.') === 0 && RC_SKIP.indexOf(k) < 0 && (k !== 'cdh.fin' || finOwner()));
const rcAll = db => new Promise(res => db.all(res));
const rcVids = () => VID.open().then(db => new Promise((res, rej) => { const q = db.transaction('videos').objectStore('videos').getAll(); q.onsuccess = () => res(q.result || []); q.onerror = () => rej(q.error); }));
const rcBlob64 = b => new Promise((res, rej) => { const f = new FileReader(); f.onload = () => res(String(f.result).split(',')[1] || ''); f.onerror = () => rej(f.error); f.readAsDataURL(b); });
const rcText = b => new Promise((res, rej) => { const f = new FileReader(); f.onload = () => res(f.result); f.onerror = () => rej(f.error); f.readAsArrayBuffer(b); });
const rcBytes = s => { const t = atob(s), a = new Uint8Array(t.length); for (let i = 0; i < t.length; i++) a[i] = t.charCodeAt(i); return a; };
function rcCount(n) {
  const out = [];
  const add = (v, one, many) => { if (v) out.push(v + ' ' + (v === 1 ? one : many)); };
  add(n.sessions, 'sesión', 'sesiones'); add(n.photos, 'foto de progreso', 'fotos de progreso'); add(n.videos, 'video', 'videos'); add(n.myPhotos, 'foto de ejercicio', 'fotos de ejercicios');
  add(n.links, 'enlace', 'enlaces'); add(n.chat, 'mensaje con la IA', 'mensajes con la IA');
  if (n.fin) out.push('Mis finanzas');
  return out;
}
function rcLocalCounts(ph, my, vd) {
  const J = k => { try { return JSON.parse(localStorage.getItem('cdh.' + k) || 'null'); } catch (e) { return null; } }, L = J('links') || {};
  return { sessions: (J('sessions') || []).length, photos: ph, myPhotos: my, videos: vd, links: Object.keys(L).reduce((a, k) => a + (L[k] || []).length, 0), chat: (J('aichat') || []).length, fin: finOwner() && !!localStorage.getItem('cdh.fin') ? 1 : 0 };
}
/* Escribe el respaldo línea por línea en `put` */
async function rcWrite(put) {
  const P = await rcAll(phDB), M = await rcAll(myDB), V = await rcVids().catch(() => []), K = rcKeys();
  let lines = 0; const line = async o => { lines++; await put(JSON.stringify(o) + '\n'); };
  await line({ t: 'h', app: RC_APP, v: RC_V, at: new Date().toISOString(), owner: finOwner() ? 1 : 0, n: rcLocalCounts(P.length, M.length, V.length) });
  for (const k of K) await line({ t: 'ls', k, v: localStorage.getItem(k) });
  for (const o of P) await line({ t: 'ph', o });
  for (const o of M) await line({ t: 'my', o });
  for (const v of V) {
    const n = Math.ceil(v.blob.size / RC_CHUNK), meta = Object.assign({}, v); delete meta.blob;
    await line({ t: 'vd', o: meta, n });
    for (let i = 0; i < n; i++) await line({ t: 'vc', id: v.id, i, b: await rcBlob64(v.blob.slice(i * RC_CHUNK, (i + 1) * RC_CHUNK)) });
  }
  await line({ t: 'end', lines: lines + 1 });
  return lines;
}
async function rcMake() {
  const name = 'forja-respaldo-' + dk(new Date()) + '.forja', C = typeof CAP !== 'undefined' ? CAP : null;
  toast('Preparando el respaldo…');
  try {
    if (C && C.Filesystem && C.Share) {
      await C.Filesystem.deleteFile({ path: name, directory: 'CACHE' }).catch(() => {});
      await rcWrite(s => C.Filesystem.appendFile({ path: name, data: s, directory: 'CACHE', encoding: 'utf8' }));
      const u = await C.Filesystem.getUri({ path: name, directory: 'CACHE' });
      await C.Share.share({ title: 'Respaldo completo de Forja', files: [u.uri], dialogTitle: 'Guarda el respaldo fuera del teléfono' });
      return;
    }
    const parts = []; await rcWrite(s => { parts.push(s); });
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(parts, { type: 'application/octet-stream' })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => a.remove(), 500);
  } catch (e) { if (!/cancel/i.test(String(e && (e.message || e)))) toast('No se pudo hacer el respaldo: revisa el espacio del teléfono.'); }
}
/* Lee el archivo por partes, una línea cada vez */
async function rcRead(file, on) {
  const dec = new TextDecoder(), STEP = 4 * 1048576; let pos = 0, buf = '';
  while (pos < file.size) {
    const ab = await rcText(file.slice(pos, pos + STEP)); pos += STEP;
    buf += dec.decode(ab, { stream: pos < file.size });
    let i; while ((i = buf.indexOf('\n')) >= 0) { const l = buf.slice(0, i); buf = buf.slice(i + 1); if (l) await on(JSON.parse(l)); }
  }
  if (buf.trim()) await on(JSON.parse(buf));
}
/* ¿Es un respaldo completo y entero? */
async function rcCheck(file) {
  let h = null, end = null, lines = 0;
  await rcRead(file, o => { lines++; if (lines === 1) h = o; if (o.t === 'end') end = o; });
  if (!h || h.app !== RC_APP) throw new Error('ese archivo no es un respaldo de Forja');
  if (h.v > RC_V) throw new Error('es de una versión más nueva: actualiza la app');
  if (!end || end.lines !== lines) throw new Error('el archivo está incompleto');
  return h;
}
const rcUnion = (now, add, key) => { const a = Array.isArray(now) ? now.slice() : [], ids = {}; a.forEach(x => { if (x) ids[x[key]] = 1; }); (add || []).forEach(x => { if (x && !ids[x[key]]) a.push(x); }); return a; };
function rcMerge(k, cur, val) {
  const A = JSON.parse(cur), B = JSON.parse(val);
  if (k === 'cdh.sessions') return JSON.stringify(rcUnion(A, B, 'id').sort((x, y) => String(y.date).localeCompare(String(x.date))));
  const o = Object.assign({}, A);
  Object.keys(B).forEach(d => { if (o[d] == null) o[d] = B[d]; else if (k === 'cdh.links') o[d] = o[d].concat(B[d].filter(u => o[d].indexOf(u) < 0)); });
  return JSON.stringify(o);
}
const rcClear = (db, name, cb) => new Promise(res => { const t = db.transaction(name, 'readwrite'); t.objectStore(name).clear(); t.oncomplete = () => res(); t.onerror = () => res(); });
const rcOpen = o => new Promise(res => o.open(res));
/* all = reemplazar todo; si no, solo se agrega lo que falta y nada se borra */
async function rcApply(file, all, h) {
  const fin = h.owner && (finOwner() || all), ph = await rcAll(phDB), my = await rcAll(myDB), vd = await rcVids().catch(() => []);
  const hasP = {}, hasM = {}, hasV = {}; ph.forEach(x => { hasP[x.id] = 1; }); my.forEach(x => { hasM[x.k] = 1; }); vd.forEach(x => { hasV[x.id] = 1; });
  if (all) {
    keepSnapshot('respaldo');
    Object.keys(localStorage).filter(k => k.indexOf('cdh.') === 0 && RC_SKIP.indexOf(k) < 0).forEach(k => localStorage.removeItem(k));
    const a = await rcOpen(phDB), b = await rcOpen(myDB), c = await VID.open();
    if (a) await rcClear(a, 'p'); if (b) await rcClear(b, 'f'); await rcClear(c, 'videos');
    Object.keys(hasP).forEach(k => delete hasP[k]); Object.keys(hasM).forEach(k => delete hasM[k]); Object.keys(hasV).forEach(k => delete hasV[k]);
  }
  let cur = null;
  await rcRead(file, async o => {
    if (o.t === 'ls') {
      if (o.k === 'cdh.fin' && !fin) return;
      const now = localStorage.getItem(o.k);
      if (now == null) localStorage.setItem(o.k, o.v); else if (RC_ADD[o.k]) localStorage.setItem(o.k, rcMerge(o.k, now, o.v));
    } else if (o.t === 'ph') { if (!hasP[o.o.id]) await new Promise(r => phDB.put(o.o, r)); }
    else if (o.t === 'my') { if (!hasM[o.o.k]) await new Promise(r => myDB.put(o.o, r)); }
    else if (o.t === 'vd') cur = hasV[o.o.id] ? null : { o: o.o, n: o.n, parts: [] };
    else if (o.t === 'vc' && cur && cur.o.id === o.id) {
      cur.parts.push(new Blob([rcBytes(o.b)]));
      if (cur.parts.length === cur.n) { await VID.add(Object.assign({}, cur.o, { blob: new Blob(cur.parts, { type: cur.o.type || '' }) })); cur = null; }
    }
  });
}
let rcFile = null, rcHead = null;
function rcSheet(local, conf) {
  const h = rcHead, n = Object.assign({}, h.n); if (!h.owner || !finOwner()) n.fin = h.owner && !localStorage.getItem('cdh.settings') ? n.fin : 0;
  const has = rcCount(local), when = fmtDate(h.at, true);
  openSheet(`<div class="row"><h2 class="grow">Restaurar respaldo completo</h2><button class="icon-btn" data-act="sheet-close" aria-label="Cerrar">${ic('x', 18)}</button></div>
    <div class="muted" style="font-size:13px">Respaldo del ${esc(when)}. Trae: ${esc(rcCount(n).join(', ') || 'solo ajustes')}, y los ajustes de ese equipo.</div>
    ${has.length ? `<div class="safe warn" style="font-size:13px">Este teléfono ya tiene: ${esc(has.join(', '))}.</div>` : ''}
    <button type="button" class="btn primary block" data-rc="add">Agregar lo que falta (no borra nada)</button>
    ${has.length ? `<button type="button" class="btn danger block" data-rc="all">${conf ? '¿Seguro? Se borra lo de este teléfono. Toca otra vez' : 'Reemplazar todo lo de este teléfono'}</button>` : `<button type="button" class="btn block" data-rc="all" data-go="1">Restaurar todo</button>`}
    <div class="muted" style="font-size:12px">Tu cuenta no va en el respaldo: si usas una, vuelve a entrar.</div>`);
}
async function rcPick(file) {
  if (!file) return;
  toast('Revisando el respaldo…');
  try {
    rcHead = await rcCheck(file); rcFile = file; state.rcConf = false;
    const P = await rcAll(phDB), M = await rcAll(myDB), V = await rcVids().catch(() => []);
    state.rcLocal = rcLocalCounts(P.length, M.length, V.length); rcSheet(state.rcLocal, false);
  } catch (e) { toast('No se puede restaurar: ' + (e && e.message && !/JSON/.test(e.message) ? e.message : 'el archivo está dañado') + '.'); }
}
async function rcGo(all) {
  if (!rcFile) return;
  toast('Restaurando…');
  try { await rcApply(rcFile, all, rcHead); localStorage.setItem('cdh.rcDone', '1'); location.reload(); }
  catch (e) { toast('No se pudo terminar: revisa el espacio del teléfono. Tus datos anteriores siguen en la copia automática.'); }
}
document.addEventListener('click', ev => {
  const b = ev.target.closest && ev.target.closest('[data-rc]'); if (!b) return;
  ev.preventDefault(); ev.stopPropagation();
  const a = b.dataset.rc;
  if (a === 'make') rcMake();
  else if (a === 'load') { const i = document.getElementById('rc-file'); if (i) i.click(); }
  else if (a === 'add') { closeSheet(); rcGo(false); }
  else if (a === 'all') { if (b.dataset.go || state.rcConf) { closeSheet(); rcGo(true); } else { state.rcConf = true; rcSheet(state.rcLocal, true); } }
}, true);
document.addEventListener('change', ev => { if (ev.target.id === 'rc-file') { rcPick(ev.target.files[0]); ev.target.value = ''; } });
const _vSettingsRC = vSettings;
vSettings = function () {
  const h = _vSettingsRC.apply(this, arguments); if (isWatch()) return h;
  const k = '<button class="btn" data-act="bk-imp">Restaurar</button></div>', i = h.indexOf(k); if (i < 0) return h;
  const box = `<div class="rc-box"><b>Respaldo completo</b><div class="muted" style="font-size:12.5px">Todo en un archivo, también lo que solo está en este teléfono: ${finOwner() ? 'Mis finanzas, ' : ''}fotos de progreso, videos y fotos de ejercicios, enlaces, el chat con la IA y los ajustes de este equipo. Hazlo antes de desinstalar la app. Guárdalo en un lugar seguro: lleva tus datos sin cifrar.</div>
    <div class="grid2"><button type="button" class="btn" data-rc="make">Hacer respaldo</button><button type="button" class="btn" data-rc="load">Restaurar</button></div><input type="file" id="rc-file" hidden></div>`;
  return h.slice(0, i + k.length) + box + h.slice(i + k.length);
};
if (localStorage.getItem('cdh.rcDone')) { localStorage.removeItem('cdh.rcDone'); setTimeout(() => toast('Respaldo restaurado.'), 900); }
bootRender();
