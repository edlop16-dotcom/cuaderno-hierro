/* ==========================================================================
   Tanda E · Crear mis propios ejercicios
   - `settings.myEx` (se sincroniza): [{ k, name, zm, zs, eq ('otro' + eqo), pat, bar, uni, kind ('w' | 'bw' | 'time'),
     notes, hidden, at }]. Entran a LIB como los del catálogo (`mine:1`, `cat:1`): cuentan en el coach semanal,
     el mapa muscular, los récords, el Coach de Próxima sesión y las alternativas, y libFind los reconoce por nombre
     (también en el reloj y al importar de la IA).
   - Foto opcional solo en el teléfono (IndexedDB 'forja-misej', JPEG de 600 px; no se sincroniza). Sin foto: la
     figura de su patrón; sin patrón: un ícono con el músculo.
   - Borrar: si está en una rutina o en el historial, se oculta (`hidden`) y sigue contando; si no, se borra.
   - "Sin clasificar": nombres escritos a mano que libFind no reconoce; se les asigna músculo y equipo sin cambiar
     el nombre ni el historial.
   - "Por tiempo": en la sesión del teléfono la columna Reps dice "Seg" y anota segundos.
   ========================================================================== */
const MY_PAT_BASE = { hpush: 'bench', ipush: 'incline', dpush: 'declbench', fly: 'dbfly', dip: 'dips', pullover: 'cablepullover', vpull: 'pulldown', row: 'machrow', shrug: 'shrug', vpush: 'ohp',
  lat: 'lateral', front: 'frontraise', rear: 'reardelt', upright: 'bbupright', rot: 'cableextrot', curl: 'curl', triext: 'triceps', wrist: 'wristcurl', grip: 'deadhang', squat: 'squat', lunge: 'lunge',
  kext: 'legext', kflex: 'legcurl', hinge: 'rdl', hipext: 'hipthrust', abd: 'abduct', add: 'adduct', calf: 'calfstand', tib: 'tibraise', flex: 'crunch', legraise: 'legraise', antiext: 'plank',
  rotc: 'russian', lumbar: 'hyperext', carry: 'farmer', full: 'powerclean', sled: 'sledpush', cardio: 'burpee', balance: 'balance' };
const MY_TYPE = { pecho: 'Empuje', homb: 'Empuje', tri: 'Empuje', esp: 'Tracción', bic: 'Tracción', ante: 'Tracción', lumb: 'Tracción', cuad: 'Piernas', isq: 'Piernas', glu: 'Piernas', adu: 'Piernas', pant: 'Piernas', abd: 'Core' };
const MY_MUS = CAT_MUS.filter(m => m[0] !== 'full');
const myList = () => state.settings.myEx || [];
const myMusName = k => (MY_MUS.find(m => m[0] === k) || [])[1] || '';
const MYPH = {};   // fotos en memoria: { clave: dataURL }

/* ---------- Fotos (solo en el teléfono) ---------- */
const myDB = {
  db: null,
  open(cb) { if (this.db) return cb(this.db); if (!window.indexedDB) return cb(null);
    try { const rq = indexedDB.open('forja-misej', 1); rq.onupgradeneeded = () => rq.result.createObjectStore('f', { keyPath: 'k' }); rq.onsuccess = () => { this.db = rq.result; cb(this.db); }; rq.onerror = () => cb(null); } catch (e) { cb(null); } },
  all(cb) { this.open(db => { if (!db) return cb([]); const out = [], c = db.transaction('f').objectStore('f').openCursor(); c.onsuccess = () => { const cu = c.result; if (cu) { out.push(cu.value); cu.continue(); } else cb(out); }; c.onerror = () => cb(out); }); },
  put(o, cb) { this.open(db => { if (!db) return cb && cb(false); const t = db.transaction('f', 'readwrite'); t.objectStore('f').put(o); t.oncomplete = () => cb && cb(true); t.onerror = () => cb && cb(false); }); },
  del(k, cb) { this.open(db => { if (!db) return cb && cb(); const t = db.transaction('f', 'readwrite'); t.objectStore('f').delete(k); t.oncomplete = () => cb && cb(); }); },
};
function myShrink(file, cb) {
  const fr = new FileReader();
  fr.onload = () => { const im = new Image(); im.onload = () => { const M = 600, k = Math.min(1, M / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); cb(c.toDataURL('image/jpeg', 0.75)); }; im.onerror = () => cb(null); im.src = fr.result; };
  fr.onerror = () => cb(null); fr.readAsDataURL(file);
}

/* ---------- Mis ejercicios dentro de la biblioteca ---------- */
function myToLib(m) {
  const kind = m.kind || 'w', x = { key: m.k, name: m.name, mine: 1, cat: 1, re: /(?!)/, eq: m.eq && m.eq !== 'otro' ? m.eq : null, eqo: m.eq === 'otro' ? (m.eqo || 'Otro') : '', pat: m.pat || '',
    zm: m.zm, zs: (m.zs || []).filter(z => z !== m.zm), musc: [myMusName(m.zm)].concat((m.zs || []).filter(z => z !== m.zm).map(myMusName)).filter(Boolean),
    type: m.pat ? catType({ pat: m.pat, zm: m.zm }) : MY_TYPE[m.zm] || 'Core', group: CAT_GROUP[m.zm] || 'Core', reps: kind === 'time' ? '20-40 s' : '8-12', rest: 90,
    steps: String(m.notes || '').split('\n').map(s => s.trim()).filter(Boolean), errs: [], bw: kind !== 'w', time: kind === 'time', uni: m.uni ? 1 : 0, hidden: m.hidden ? 1 : 0 };
  if (m.pat && MY_PAT_BASE[m.pat]) { x.f = MY_PAT_BASE[m.pat]; catFigOf(x); }
  return x;
}
let myHash = null;
function mySync() {
  const h = JSON.stringify(myList()); if (h === myHash) return false;
  myHash = h;
  for (let i = LIB.length - 1; i >= 0; i--) if (LIB[i].mine) LIB.splice(i, 1);
  myList().forEach(m => { if (m && m.k && m.name) LIB.push(myToLib(m)); });
  try { LF_CACHE.m = {}; LF_CACHE.n = -1; } catch (e) {}
  myList().forEach(m => { const n = normName(m.name).trim(); if (BAR_DEFAULT[m.name] == null && m.bar) BAR_DEFAULT[m.name] = +m.bar; if (!m.bar && BAR_DEFAULT[m.name] != null && !LIB.some(y => !y.mine && y.name === m.name)) delete BAR_DEFAULT[m.name]; void n; });
  return true;
}
/* Sin figura de patrón: un ícono con el músculo */
const _figSVGMy = figSVG;
figSVG = function (item, t, ghost) {
  if (item && item.fig) return _figSVGMy.apply(this, arguments);
  const lab = item ? (myMusName(item.zm) || item.group || '') : '';
  return `<svg viewBox="0 0 200 150" class="fig-svg my-ic t-${item ? item.type : ''}" role="img" aria-label="${esc(item ? item.name : '')}"><circle cx="100" cy="68" r="44" fill="var(--surface2)" stroke="var(--line)" stroke-width="2"/><text x="100" y="62" text-anchor="middle" font-size="30" font-weight="700" fill="var(--fg)">${esc(lab.slice(0, 2).toUpperCase())}</text><text x="100" y="86" text-anchor="middle" font-size="13" fill="var(--muted)">${esc(lab)}</text><text x="100" y="138" text-anchor="middle" font-size="12" fill="var(--muted)">Mío</text></svg>`;
};
/* Foto propia en Biblioteca y selector */
const _luThumbMy = luThumb;
luThumb = function (x, small) {
  if (x && x.mine && MYPH[x.key]) return small ? `<img class="th-img" src="${MYPH[x.key]}" alt="">` : `<div class="ph card-ph"><img src="${MYPH[x.key]}" alt=""></div>`;
  return _luThumbMy(x, small);
};
/* Ocultos: siguen reconociéndose por nombre, pero no salen en las listas. Filtro "Mis ejercicios" */
const _luFilterMy = luFilter;
luFilter = function (o) {
  let L = _luFilterMy(o).filter(x => !x.hidden);
  if (!state.pk && state.tab === 'guide' && state.exG === 'mine' && !o.fn) L = L.filter(x => x.mine);
  return L;
};
/* Etiqueta "Mío" en el selector */
const _luPkRowMy = luPkRow;
luPkRow = function (x, have, sel) { const h = _luPkRowMy(x, have, sel); return x && x.mine ? h.replace('<small>', '<small><span class="my-tag">Mío</span> ') : h; };
/* "¿No está? Créalo" en el selector */
const _pkListMy = pkList;
pkList = function () {
  const P = state.pk, h = _pkListMy(); if (!P) return h;
  const q = String(P.q || '').trim(), btn = `<button type="button" class="btn block my-new" data-my="new" data-q="${esc(q)}">${ic('plus', 16)} ${q ? `¿No está? Crea «${esc(q)}»` : 'Crear un ejercicio propio'}</button>`;
  if (/Sin resultados\. Toca "Crear"/.test(h)) return h.replace(/<div class="muted" style="padding:16px">Sin resultados\. Toca "Crear" para agregar uno propio\.<\/div>/, `<div class="muted" style="padding:16px 4px 8px">No encontré «${esc(q)}».</div>${btn}`);
  return q ? h + btn : h;
};

/* ---------- Usos y "Sin clasificar" ---------- */
const myUsed = name => state.plans.some(p => p.days.some(d => d.exercises.some(e => e.name === name))) || state.sessions.some(s => s.exercises.some(e => e.name === name));
function myUnclassified() {
  const seen = {}, out = [];
  const add = n => { const k = normName(n).trim(); if (!n || seen[k]) return; seen[k] = 1; if (!libFind(n)) out.push(n); };
  state.plans.forEach(p => p.days.forEach(d => d.exercises.forEach(e => add(e.name))));
  state.sessions.forEach(s => s.exercises.forEach(e => add(e.name)));
  return out;
}

/* ---------- Formulario ---------- */
function mySheet(o) {
  o = o || {};
  const m = o.k ? myList().find(x => x.k === o.k) : null;
  state.myF = m ? Object.assign({ ret: o.ret }, JSON.parse(JSON.stringify(m)), { edit: 1 }) : { ret: o.ret, name: o.name || '', lock: !!o.lock, zm: '', zs: [], eq: '', eqo: '', pat: '', bar: 0, uni: 0, kind: 'w', notes: '' };
  state.myF.ph = m ? MYPH[m.k] || null : null;
  myView();
}
function mySimilar(name) {
  if (!name || name.trim().length < 3) return null;
  const L = luFilter({ q: name }).filter(x => !x.mine); if (!L.length) return null;
  const x = L[0], n = normName(x.name), q = normName(name).trim(), words = q.split(/\s+/).filter(w => w.length > 2);
  return n === q || (words.length && words.every(w => n.indexOf(w) >= 0)) ? x : null;
}
function myView() {
  const F = state.myF; if (!F) return;
  const chips = (arr, sel, act) => arr.map(([v, l]) => `<button type="button" class="gchip ${sel(v) ? 'on' : ''}" data-my="${act}" data-v="${v}">${l}</button>`).join('');
  const fams = CAT_FAM.map(f => [f, Object.keys(CAT_EQ).filter(k => CAT_EQ[k][1] === f[0] && k !== 'cuerpo')]).filter(x => x[1].length);
  openSheet(`<div class="pk-top"><button class="linkbtn" data-my="cancel">Cancelar</button><b>${F.edit ? 'Editar mi ejercicio' : 'Crear ejercicio'}</b><button class="linkbtn" data-my="save">Guardar</button></div>
    ${F.err ? `<div class="se-err" role="alert">${esc(F.err)}</div>` : ''}
    ${F.sim ? `<div class="card my-sim"><b>¿Es este?</b> <span>${esc(F.sim)}</span><div class="row" style="gap:8px;margin-top:8px"><button type="button" class="btn small primary" data-my="use" data-name="${esc(F.sim)}">Usar este</button><button type="button" class="btn small" data-my="force">Crear el mío igual</button></div></div>` : ''}
    <label class="field"><span class="label">Nombre *</span><input id="my-name" maxlength="60" autocomplete="off" value="${esc(F.name)}" ${F.lock ? 'readonly' : ''} placeholder="Ej. Elevación de talones en máquina de mi gym">${F.lock ? '<small class="muted">Viene de tu rutina o historial: el nombre no cambia.</small>' : ''}</label>
    <div class="label">Músculo principal *</div><div class="gymbar my-wrap">${chips(MY_MUS, v => F.zm === v, 'zm')}</div>
    <div class="label">Secundarios (opcional)</div><div class="gymbar my-wrap">${chips(MY_MUS.filter(m => m[0] !== F.zm), v => F.zs.indexOf(v) >= 0, 'zs')}</div>
    <label class="field"><span class="label">Equipo o máquina</span><select id="my-eq"><option value="" ${!F.eq ? 'selected' : ''}>Sin equipo / peso corporal</option>${fams.map(([f, ks]) => `<optgroup label="${esc(f[1])}">${ks.map(k => `<option value="${k}" ${F.eq === k ? 'selected' : ''}>${esc(CAT_EQ[k][0])}</option>`).join('')}</optgroup>`).join('')}<option value="otro" ${F.eq === 'otro' ? 'selected' : ''}>Otro…</option></select></label>
    ${F.eq === 'otro' ? `<label class="field"><span class="label">¿Qué equipo?</span><input id="my-eqo" maxlength="40" value="${esc(F.eqo || '')}" placeholder="Ej. Máquina de gemelos inclinada"></label>` : ''}
    <label class="field"><span class="label">Patrón de movimiento (opcional)</span><select id="my-pat"><option value="">No sé / ninguno</option>${Object.keys(CAT_PT).map(k => `<option value="${k}" ${F.pat === k ? 'selected' : ''}>${esc(CAT_PT[k][0])}</option>`).join('')}</select></label>
    <div class="label">Cómo se anota</div><div class="seg my-seg">${[['w', 'Con peso'], ['bw', 'Peso corporal'], ['time', 'Por tiempo (seg)']].map(([v, l]) => `<button type="button" class="${F.kind === v ? 'on' : ''}" data-my="kind" data-v="${v}">${l}</button>`).join('')}</div>
    ${F.kind === 'w' ? `<div class="row my-row"><span class="grow">Usa barra (se anotan solo los discos)</span><button type="button" class="switch ${F.bar ? 'on' : ''}" data-my="bar" role="switch" aria-checked="${!!F.bar}" aria-label="Usa barra"><i></i></button></div>
      ${F.bar ? `<label class="field"><span class="label">Peso de la barra (kg)</span><input id="my-bar" inputmode="decimal" value="${String(F.bar).replace('.', ',')}"></label>` : ''}` : ''}
    <div class="row my-row"><span class="grow">Unilateral (un brazo o una pierna)</span><button type="button" class="switch ${F.uni ? 'on' : ''}" data-my="uni" role="switch" aria-checked="${!!F.uni}" aria-label="Unilateral"><i></i></button></div>
    <label class="field"><span class="label">Notas o pasos (opcional)</span><textarea id="my-notes" class="note-in" rows="3" placeholder="Un paso por línea">${esc(F.notes || '')}</textarea></label>
    <div class="label">Foto (opcional, solo en este teléfono)</div>
    <div class="row my-row">${F.ph ? `<img class="my-prev" src="${F.ph}" alt="Foto del ejercicio"><button type="button" class="btn small" data-my="phdel">Quitar foto</button>` : `<label class="btn small my-phbtn">${ic('camera', 15) || ''} Galería o cámara<input id="my-ph" type="file" accept="image/*" hidden></label>`}</div>
    ${F.edit ? `<button type="button" class="btn danger block" data-my="del">${state.confirm === 'my-del' ? '¿Seguro? Toca otra vez' : ic('trash-2', 15) + ' Borrar ejercicio'}</button>` : ''}
    <div class="pk-bottom"><button class="btn primary block" data-my="save">${F.edit ? 'Guardar cambios' : 'Crear ejercicio'}</button></div>`);
  const c = document.querySelector('#sheet .sheet-card'); if (c) { c.classList.add('pk-sheet', 'my-sheet'); if (F.scroll) c.scrollTop = F.scroll; }
  if (!F.name) { const i = document.getElementById('my-name'); if (i) i.focus(); } else { try { document.activeElement.blur(); } catch (e) {} }
}
function myKeep() { const c = document.querySelector('#sheet .my-sheet'); if (c && state.myF) state.myF.scroll = c.scrollTop; }
function mySave() {
  const F = state.myF; if (!F) return;
  const name = String(F.name || '').replace(/\s+/g, ' ').trim();
  F.err = !name ? 'Escribe el nombre del ejercicio.' : !F.zm ? 'Elige el músculo principal.' : null;
  if (!F.err && !F.edit && !F.lock) {
    const dup = LIB.find(x => normName(x.name) === normName(name) && !x.hidden);
    if (dup) F.err = `"${dup.name}" ya existe: búscalo en la lista.`;
  }
  if (!F.err && F.edit && myList().some(x => x.k !== F.k && normName(x.name) === normName(name))) F.err = 'Ya tienes otro ejercicio con ese nombre.';
  if (F.err) { F.scroll = 0; return myView(); }
  if (!F.edit && !F.lock && !F.force) { const s = mySimilar(name); if (s) { F.sim = s.name; F.scroll = 0; return myView(); } }
  const old = F.edit ? myList().find(x => x.k === F.k) : null;
  const m = { k: F.k || 'my-' + uid(), name, zm: F.zm, zs: F.zs.filter(z => z !== F.zm), eq: F.eq || '', eqo: F.eq === 'otro' ? String(F.eqo || '').trim() : '', pat: F.pat || '', bar: F.kind === 'w' && F.bar ? +F.bar || 20 : 0, uni: F.uni ? 1 : 0, kind: F.kind || 'w', notes: String(F.notes || '').trim(), at: old ? old.at : Date.now() };
  /* Renombrar: rutinas y borrador siguen al ejercicio (el historial guarda el nombre de entonces) */
  if (old && old.name !== name) {
    if (myUsed(old.name) && state.sessions.some(s => s.exercises.some(e => e.name === old.name))) { F.err = 'Ya lo usaste en tu historial: el nombre no se cambia para no perderlo.'; F.name = old.name; F.scroll = 0; return myView(); }
    state.plans.forEach(p => p.days.forEach(d => d.exercises.forEach(e => { if (e.name === old.name) e.name = name; })));
  }
  state.settings.myEx = myList().filter(x => x.k !== m.k).concat([m]);
  if (F.ph) { MYPH[m.k] = F.ph; myDB.put({ k: m.k, img: F.ph }); } else if (old && MYPH[m.k]) { delete MYPH[m.k]; myDB.del(m.k); }
  savePlans(); mySync();
  const ret = F.ret; state.myF = null;
  toast(F.edit ? 'Ejercicio guardado.' : `"${name}" creado.`);
  myReturn(ret, name);
}
function myReturn(ret, name) {
  const P = state.pk;
  if (ret === 'pk' && P) {
    if (P.sedit && P.sedit.mode === 'swap' && typeof seApplyPick === 'function') return seApplyPick([name]);
    if (P.sel.indexOf(name) < 0) P.sel.push(name); P.q = ''; P.more = {}; return pkView();
  }
  closeSheet(); render();
}
function myDelete(k) {
  const m = myList().find(x => x.k === k); if (!m) return;
  if (myUsed(m.name)) { state.settings.myEx = myList().map(x => (x.k === k ? Object.assign({}, x, { hidden: 1 }) : x)); toast('Oculto de la lista: tu historial y tus rutinas lo conservan.'); }
  else { state.settings.myEx = myList().filter(x => x.k !== k); delete MYPH[k]; myDB.del(k); toast('Ejercicio borrado.'); }
  savePlans(); mySync(); state.myF = null; state.confirm = null; closeSheet(); render();
}

/* ---------- Biblioteca: crear, "Mis ejercicios", "Mío", "Sin clasificar" ---------- */
const _vGuideMy = vGuide;
vGuide = function () {
  let h = _vGuideMy(); if (isWatch()) return h;
  h = h.replace(/(<button class="gchip[^"]*" data-act="ex-g" data-v="plan">[^<]*<\/button>)/, `$1<button class="gchip ${state.exG === 'mine' ? 'on' : ''}" data-act="ex-g" data-v="mine">Mis ejercicios</button>`);
  const unc = myUnclassified();
  const top = `<button type="button" class="btn block my-create" data-my="new">${ic('plus', 16)} Crear ejercicio</button>` +
    (unc.length ? `<details class="card my-unc"><summary><b>Sin clasificar</b> <span class="muted">${unc.length}</span></summary><div class="muted" style="font-size:12.5px">Los escribiste a mano en tus rutinas o tu historial. Asígnales músculo y equipo para que cuenten en el coach; el nombre no cambia.</div>${unc.map(n => `<div class="row my-unc-r"><span class="grow">${esc(n)}</span><button type="button" class="btn small" data-my="assign" data-name="${esc(n)}">Asignar</button></div>`).join('')}</details>` : '');
  const at = h.indexOf('<div class="gymbar">'); return at < 0 ? h + top : h.slice(0, at) + top + h.slice(at);
};
const _exActionsMy = exActions;
exActions = function (key) {
  _exActionsMy(key);
  const x = LIB.find(y => y.key === key); if (!x || !x.mine) return;
  const sc = document.querySelector('#sheet .sheet-card'); if (!sc) return;
  if (MYPH[key]) { const f = sc.querySelector('.fig'); if (f) f.outerHTML = `<img class="my-prev big" src="${MYPH[key]}" alt="">`; }
  const lab = sc.querySelector('.label'); if (lab) lab.textContent = `${myMusName(x.zm)} · ${x.eq ? CAT_EQ[x.eq][0] : x.eqo || 'Sin equipo'} · Mío`;
  const acts = sc.querySelector('.ex-actions');
  if (acts) acts.insertAdjacentHTML('beforeend', `${x.steps.length ? `<ol class="pk-steps">${x.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>` : ''}<div class="grid2"><button class="btn" data-my="edit" data-k="${key}">${ic('square-pen', 16)} Editar</button><button class="btn danger" data-my="del1" data-k="${key}">${ic('trash-2', 16)} Borrar</button></div>`);
};

/* ---------- Después de dibujar: "Mío" en las tarjetas, foto en la sesión y "Seg" para los de tiempo ---------- */
const _renderMy = render;
render = function () {
  mySync();
  _renderMy();
  if (isWatch()) return;
  document.querySelectorAll('#app .exc[data-key^="my-"]').forEach(c => { if (!c.querySelector('.my-tag')) { const n = c.querySelector('.nm'); if (n) n.insertAdjacentHTML('afterend', '<span class="my-tag">Mío</span>'); } });
  const d = state.draft; if (!d || !document.getElementById('sx')) return;
  document.querySelectorAll('#sx-pager > .sx-page').forEach(pg => {
    const e = d.exercises[+pg.dataset.i], x = e && libFind(e.name); if (!x || !x.mine) return;
    const hero = pg.querySelector('.sx-hero'); if (hero && MYPH[x.key] && !hero.querySelector('.my-hero')) { const f = hero.firstElementChild; if (f) f.outerHTML = `<img class="my-hero" src="${MYPH[x.key]}" alt="">`; }
    if (x.time) { const hd = pg.querySelectorAll('.sets > .h'); if (hd[3]) hd[3].textContent = 'Seg'; pg.querySelectorAll('.sets input[data-f="r"]').forEach(i => { i.setAttribute('aria-label', 'Segundos'); }); }
  });
};

/* ---------- Eventos ---------- */
document.addEventListener('input', ev => {
  const t = ev.target, F = state.myF; if (!F || !t.id) return;
  if (t.id === 'my-name') { F.name = t.value; F.sim = null; F.force = false; }
  else if (t.id === 'my-eqo') F.eqo = t.value;
  else if (t.id === 'my-bar') F.bar = parseFloat(t.value.replace(',', '.')) || 0;
  else if (t.id === 'my-notes') F.notes = t.value;
});
document.addEventListener('change', ev => {
  const t = ev.target, F = state.myF; if (!F || !t.id) return;
  if (t.id === 'my-eq') { F.eq = t.value; if (F.eq === 'barra' && F.kind === 'w' && !F.bar) F.bar = 20; myKeep(); myView(); }
  else if (t.id === 'my-pat') F.pat = t.value;
  else if (t.id === 'my-ph' && t.files && t.files[0]) myShrink(t.files[0], url => { if (!url) { toast('No se pudo leer la foto.'); return; } F.ph = url; myKeep(); myView(); });
});
window.addEventListener('click', ev => {
  /* El "Crear" de arriba del selector abre el formulario completo */
  const pc = ev.target.closest && ev.target.closest('[data-act="pk-create"]');
  if (pc && state.pk) { ev.preventDefault(); ev.stopPropagation(); const l = document.getElementById('pk-list'); if (l) state.pk.scroll = l.scrollTop; mySheet({ ret: 'pk', name: String(state.pk.q || '').trim() }); return; }
  const b = ev.target.closest && ev.target.closest('[data-my]'); if (!b) return;
  ev.preventDefault(); ev.stopPropagation();
  const a = b.dataset.my, F = state.myF;
  if (a === 'new') { mySheet({ ret: state.pk ? 'pk' : null, name: b.dataset.q || '' }); return; }
  if (a === 'assign') { mySheet({ name: b.dataset.name, lock: true }); return; }
  if (a === 'edit') { mySheet({ k: b.dataset.k }); return; }
  if (a === 'del1') { mySheet({ k: b.dataset.k }); state.confirm = 'my-del'; myView(); return; }
  if (!F) return;
  myKeep();
  if (a === 'cancel') { const ret = F.ret; state.myF = null; state.confirm = null; if (ret === 'pk' && state.pk) pkView(); else closeSheet(); return; }
  if (a === 'save') { mySave(); return; }
  if (a === 'use') { const ret = F.ret; state.myF = null; myReturn(ret, b.dataset.name); return; }
  if (a === 'force') { F.force = true; F.sim = null; mySave(); return; }
  if (a === 'del') { if (state.confirm === 'my-del') myDelete(F.k); else { state.confirm = 'my-del'; myView(); } return; }
  if (a === 'zm') { F.zm = b.dataset.v; F.zs = F.zs.filter(z => z !== F.zm); }
  else if (a === 'zs') { const v = b.dataset.v, i = F.zs.indexOf(v); if (i >= 0) F.zs.splice(i, 1); else F.zs.push(v); }
  else if (a === 'kind') F.kind = b.dataset.v;
  else if (a === 'bar') F.bar = F.bar ? 0 : 20;
  else if (a === 'uni') F.uni = F.uni ? 0 : 1;
  else if (a === 'phdel') F.ph = null;
  else return;
  F.err = null; myView();
}, true);

/* Al abrir: mis ejercicios a la biblioteca y sus fotos a memoria */
mySync();
myDB.all(list => { let n = 0; list.forEach(o => { if (o && o.k && o.img) { MYPH[o.k] = o.img; n++; } }); if (n && !isWatch() && typeof BOOT !== 'undefined' && !BOOT.on && $('#sheet').hidden) render(); });
bootRender();
