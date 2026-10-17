/* ==========================================================================
   Biblioteca y selector de ejercicios con el catálogo completo (catalog.js)
   - Búsqueda por palabras en nombre, alias, músculo y equipo, sin tildes ni mayúsculas (`catHay`),
     con un pequeño retardo al escribir y sin redibujar toda la pantalla.
   - Filtros combinables: músculo principal, tipo de equipo y máquina o equipo concreto.
   - Sin búsqueda: agrupado por músculo con su conteo; cada grupo muestra 12 y "Ver N más".
     Con búsqueda: los más parecidos primero.
   - Las figuras se dibujan solo cuando se ven (IntersectionObserver): con ~420 ejercicios no se
     generan cientos de SVG al abrir. En el reloj no cambia nada.
   ========================================================================== */
const LU_PAGE = 12;
const luWords = q => normName(q || '').trim().split(/\s+/).filter(Boolean);
/* Más parecido primero: el nombre empieza o contiene lo buscado > todas las palabras en el nombre > en los alias > en lo demás */
function luScore(x, q, words) {
  const n = normName(x.name), nq = normName(q).trim();
  if (n === nq) return 0;
  if (n.indexOf(nq) === 0) return 1;
  if (n.indexOf(nq) >= 0) return 2;
  if (words.every(w => n.indexOf(w) >= 0)) return 3;
  if ((x.al || []).some(a => normName(a).indexOf(nq) >= 0)) return 4;
  return 5;
}
/* o = { q, m: músculo, f: tipo de equipo, s: equipo concreto, fn: filtro extra } */
function luFilter(o) {
  const words = luWords(o.q);
  const out = LIB.filter(x => (!o.m || o.m === 'all' || catMain(x) === o.m) && (!o.f || o.f === 'all' || equipOf(x) === o.f)
    && (!o.s || o.s === 'all' || x.eq === o.s || String(x.req || '').split(',').indexOf(o.s) >= 0)
    && (!words.length || (h => words.every(w => h.indexOf(w) >= 0))(catHay(x))) && (!o.fn || o.fn(x)));
  if (words.length) { const sc = {}; out.forEach(x => { sc[x.key] = luScore(x, o.q, words); }); out.sort((a, b) => sc[a.key] - sc[b.key] || (a.cat ? 1 : 0) - (b.cat ? 1 : 0) || a.name.length - b.name.length || a.name.localeCompare(b.name)); }
  else out.sort((a, b) => (a.cat ? 1 : 0) - (b.cat ? 1 : 0) || a.name.localeCompare(b.name));   /* los de siempre primero */
  return out;
}
function luGroups(list) {
  const by = {}; list.forEach(x => { const m = catMain(x); (by[m] = by[m] || []).push(x); });
  return CAT_MUS.filter(m => by[m[0]]).map(m => ({ m: m[0], label: m[1], items: by[m[0]] }));
}
const luMusName = m => (CAT_MUS.find(x => x[0] === m) || [])[1] || '';
const luEqName = x => (CAT_EQ[x.eq] ? CAT_EQ[x.eq][0] : (EQUIP_L[equipOf(x)] || ''));
/* Equipo concreto dentro de un tipo (los que de verdad usa algún ejercicio) */
function luSpecific(fam) {
  const used = {}; LIB.forEach(x => { if (x.eq) used[x.eq] = 1; String(x.req || '').split(',').forEach(r => { if (r) used[r] = 1; }); });
  return Object.keys(CAT_EQ).filter(k => CAT_EQ[k][1] === fam && used[k] && k !== 'cuerpo').map(k => [k, CAT_EQ[k][0]]);
}

/* ---------- Figuras diferidas ---------- */
const luIO = typeof IntersectionObserver === 'function' ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { luFill(e.target); luIO.unobserve(e.target); } }), { rootMargin: '200px' }) : null;
function luFill(el) {
  if (el.dataset.done) return; el.dataset.done = 1;
  const x = LIB.find(y => y.key === el.dataset.k); if (!x) return;
  el.innerHTML = el.dataset.t ? figSVG(x, 1, false) : figSVG(x, 1);
}
function luLazy(root) {
  luChipsShow(document);
  const els = (root || document).querySelectorAll('.lu-fig:not([data-done])');
  for (let i = 0; i < els.length; i++) { if (luIO) luIO.observe(els[i]); else luFill(els[i]); }
}
/* La fila de chips se desliza hasta el filtro elegido */
function luChipsShow(root) {
  const rows = root.querySelectorAll('.lu-row');
  for (let i = 0; i < rows.length; i++) { const on = rows[i].querySelector('.gchip.on'); if (on && on.offsetLeft + on.offsetWidth > rows[i].clientWidth) rows[i].scrollLeft = on.offsetLeft - 16; }
}
/* Miniatura: foto si la hay; si no, la figura cuando se vea */
function luThumb(x, small) {
  if (typeof PHOTO_KEYS !== 'undefined' && PHOTO_KEYS.has(x.key)) return small ? `<img class="th-img" src="ex/${x.key}-0.webp" alt="" loading="lazy" decoding="async">` : `<div class="ph card-ph"><img src="ex/${x.key}-0.webp" alt="" loading="lazy" decoding="async"></div>`;
  return small ? `<span class="lu-fig lu-th" data-k="${x.key}" data-t="1"></span>` : `<div class="fig lu-fig" data-k="${x.key}"></div>`;
}

/* ---------- Chips de filtros (los usan la Biblioteca y el selector) ---------- */
const luChips = (arr, cur, act) => arr.map(([v, l]) => `<button class="gchip ${cur === v ? 'on' : ''}" data-act="${act}" data-v="${v}">${l}</button>`).join('');
function luFilterRows(m, f, s, pre) {
  const spec = f && f !== 'all' ? luSpecific(f) : [];
  return `<div class="gymbar lu-row" aria-label="Músculo">${luChips([['all', 'Todos los músculos']].concat(CAT_MUS), m || 'all', pre + 'm')}</div>
    <div class="gymbar lu-row" aria-label="Equipo">${luChips([['all', 'Todo equipo']].concat(CAT_FAM), f || 'all', pre + 'f')}</div>
    ${spec.length > 1 ? `<div class="gymbar lu-row lu-spec" aria-label="Máquina o equipo">${luChips([['all', 'Cualquiera']].concat(spec), s || 'all', pre + 's')}</div>` : ''}`;
}

/* =========================== Biblioteca (Rutinas → Biblioteca) =========================== */
function luGuideList() {
  const g = state.exG || 'all', plan = activePlan(), sel = state.sel, more = state.exMore || {};
  const inPlan = g === 'plan' ? new Set(plan ? plan.days.flatMap(d => d.exercises.map(x => (libFind(x.name) || {}).key)).filter(Boolean) : []) : null;
  const list = luFilter({ q: state.guideQ, m: state.exM, f: state.exE, s: state.exS, fn: g === 'fav' ? x => isFav(x.key) : g === 'plan' ? x => inPlan.has(x.key) : null });
  const card = x => `<button class="card exc ${sel.includes(x.key) ? 'sel' : ''}" data-act="ex-tap" data-key="${x.key}" aria-pressed="${sel.includes(x.key)}">
    ${luThumb(x)}
    ${isFav(x.key) ? `<span class="fav-on" aria-label="Favorito">${ic('star', 14)}</span>` : ''}
    ${sel.includes(x.key) ? `<span class="sel-on">${ic('check', 14)}</span>` : ''}
    <div class="row" style="gap:6px"><span class="dot t-${x.type}"></span><span class="nm">${esc(x.name)}</span></div>
    <div class="muted" style="font-size:11.5px">${esc(luMusName(catMain(x)))} · ${esc(luEqName(x))}</div></button>`;
  if (!list.length) return `<div class="card empty">${g === 'fav' && !state.guideQ ? 'Aún no tienes favoritos. Toca un ejercicio y elige ★ Favorito.' : 'No encontré ejercicios con esos filtros.'}</div>`;
  if (luWords(state.guideQ).length) {
    const n = more.q ? list.length : Math.min(list.length, 40);
    return `<div class="lu-gh"><b>Resultados</b><span>${list.length}</span></div><div class="guide">${list.slice(0, n).map(card).join('')}</div>
      ${n < list.length ? `<button class="btn block lu-more" data-act="lu-more" data-m="q">Ver ${list.length - n} más</button>` : ''}`;
  }
  const one = state.exM && state.exM !== 'all';
  return luGroups(list).map(G => {
    const n = one || more[G.m] ? G.items.length : Math.min(G.items.length, LU_PAGE);
    return `<div class="lu-gh" id="lu-g-${G.m}"><b>${esc(G.label)}</b><span>${G.items.length}</span></div><div class="guide">${G.items.slice(0, n).map(card).join('')}</div>
      ${n < G.items.length ? `<button class="btn block lu-more" data-act="lu-more" data-m="${G.m}">Ver ${G.items.length - n} más de ${esc(G.label)}</button>` : ''}`;
  }).join('');
}
const _vGuideLu = vGuide;
vGuide = function () {
  if (isWatch()) return _vGuideLu();
  const g = state.exG || 'all', q = state.guideQ || '', sel = state.sel;
  return `${header('Ejercicios', LIB.length + ' ejercicios')}
  <input id="guide-q" type="search" placeholder="Buscar: nombre, músculo, máquina…" value="${esc(q)}" autocomplete="off">
  <div class="gymbar">${luChips([['all', 'Todos'], ['fav', '★ Favoritos'], ['plan', 'Mi plan']], g, 'ex-g')}</div>
  ${luFilterRows(state.exM, state.exE, state.exS, 'lu-')}
  <div class="muted" style="font-size:12.5px">${sel.length ? 'Toca más ejercicios para sumarlos a tu nueva rutina.' : 'Toca un ejercicio para ver su técnica, marcarlo como favorito o crear una rutina con él.'}</div>
  <div id="lu-list">${luGuideList()}</div>
  ${sel.length ? `<div class="selbar"><button class="icon-btn" data-act="sel-clear" aria-label="Quitar selección">${ic('x', 18)}</button>
    <div class="grow"><b>${sel.length} ${sel.length === 1 ? 'ejercicio' : 'ejercicios'}</b><small>${esc(sel.map(k => (LIB.find(x => x.key === k) || {}).name).filter(Boolean).slice(0, 3).join(', '))}${sel.length > 3 ? '…' : ''}</small></div>
    <button class="btn small" data-act="sel-add">Agregar a…</button><button class="btn primary small" data-act="sel-new">Crear rutina</button></div>` : ''}`;
};
function luGuideRefresh() { const l = document.getElementById('lu-list'); if (l) { l.innerHTML = luGuideList(); luLazy(l); } }
/* Después de cada dibujo, las figuras visibles */
const _renderLu = render;
render = function () { _renderLu(); if (state.tab === 'guide' && !isWatch()) luLazy(document.getElementById('app')); };

/* =========================== Selector de ejercicios (picker.js, modo entreno y editar sesión) =========================== */
function luPkHave(P) {
  if (P.sedit && state.sEd) return new Set(state.sEd.ex.map(e => e.name));
  if (P.draft && state.draft) return new Set(state.draft.exercises.map(e => e.name));
  const r = findDay(P.pid, P.did); return new Set(r.d ? r.d.exercises.map(e => e.name) : []);
}
function luPkRow(x, have, sel) {
  const on = sel.indexOf(x.name) >= 0, inR = have.has(x.name);
  const sub = x.custom ? 'Creado por ti' : `${esc(luMusName(catMain(x)))} · ${esc(luEqName(x))}`;
  return `<div class="pk-row t-${x.type} ${on ? 'on' : ''} ${inR ? 'in' : ''}">
    <button class="pk-main" data-act="pk-tog" data-name="${esc(x.name)}" ${inR ? 'disabled' : ''}><span class="pk-th">${x.custom ? `<span class="th-l">${esc(String(x.name)[0])}</span>` : luThumb(x, 1)}${on ? `<i class="pk-ck">${ic('check', 13)}</i>` : ''}</span>
      <span class="grow" style="min-width:0"><b>${esc(x.name)}</b><small>${inR ? (P_IN_LBL()) : sub}</small></span></button>
    ${x.custom ? '' : `<button class="pk-info" data-act="pk-info" data-name="${esc(x.name)}" aria-label="Información de ${esc(x.name)}">${ic('info', 18)}</button>`}</div>`;
}
const P_IN_LBL = () => (state.pk && state.pk.sedit ? 'Ya está en esta sesión' : state.pk && state.pk.draft ? 'Ya está en tu entrenamiento' : 'Ya está en la rutina');
pkList = function () {
  const P = state.pk; if (!P) return '';
  const have = luPkHave(P), more = P.more || {}, plain = !luWords(P.q).length && (P.mu || 'all') === 'all' && (P.eq || 'all') === 'all' && (P.sp || 'all') === 'all';
  const row = x => luPkRow(x, have, P.sel);
  let head = '';
  const custom = (P.custom || []).map(n => ({ name: n, type: typeOf(n), musc: [], custom: true }));
  if (custom.length) head += `<div class="pk-sec">Creados por ti</div>${custom.map(row).join('')}`;
  /* Parecidos: al cambiar en "editar sesión" o al agregar en plena sesión */
  const cur = P.sedit && P.sedit.mode === 'swap' && state.sEd ? state.sEd.ex[P.sedit.i] : P.draft && state.draft ? state.draft.exercises[P.at] : null;
  if (plain && cur) {
    let sim = [];
    if (P.draft && typeof swapCandidates === 'function') sim = swapCandidates(cur).map(c => libFind(c.n)).filter(Boolean).slice(0, 6);
    else { const m = catMain(libFind(cur.name) || { name: cur.name }); sim = LIB.filter(x => x.name !== cur.name && catMain(x) === m).slice(0, 8); }
    if (sim.length) head += `<div class="pk-sec">${P.sedit ? 'Mismo músculo que' : 'Parecidos a'} ${esc(cur.name)}</div>${sim.map(row).join('')}`;
  }
  if (plain && !P.sedit) {
    const rec = pkRecent().map(n => libFind(n)).filter(Boolean).slice(0, 8);
    if (rec.length) head += `<div class="pk-sec">Ejercicios recientes</div>${rec.map(row).join('')}`;
  }
  const list = luFilter({ q: P.q, m: P.mu, f: P.eq, s: P.sp });
  if (!list.length) return head + '<div class="muted" style="padding:16px">Sin resultados. Toca "Crear" para agregar uno propio.</div>';
  if (luWords(P.q).length) {
    const n = more.q ? list.length : Math.min(list.length, 40);
    return head + `<div class="pk-sec">Resultados · ${list.length}</div>${list.slice(0, n).map(row).join('')}${n < list.length ? `<button class="btn block lu-more" data-act="lu-pkmore" data-m="q">Ver ${list.length - n} más</button>` : ''}`;
  }
  const one = (P.mu || 'all') !== 'all';
  return head + luGroups(list).map(G => {
    const n = one || more[G.m] ? G.items.length : Math.min(G.items.length, LU_PAGE);
    return `<div class="pk-sec lu-pks">${esc(G.label)} · ${G.items.length}</div>${G.items.slice(0, n).map(row).join('')}${n < G.items.length ? `<button class="btn block lu-more" data-act="lu-pkmore" data-m="${G.m}">Ver ${G.items.length - n} más de ${esc(G.label)}</button>` : ''}`;
  }).join('');
};
const _pkViewLu = pkView;
pkView = function () {
  const P = state.pk; if (P && (P.mu === undefined || PK_MUS.indexOf(P.mu) >= 0)) P.mu = 'all';
  if (P && P.eq && P.eq !== 'all' && !CAT_FAM.some(f => f[0] === P.eq)) P.eq = 'all';
  _pkViewLu();
  if (!state.pk || state.pk.info) return;
  const fl = document.querySelector('#sheet .pk-filters');
  if (fl) { fl.className = 'pk-filters lu-pkf'; fl.innerHTML = luFilterRows(P.mu, P.eq, P.sp, 'lu-pk'); }
  const s = document.getElementById('pk-q'); if (s) s.placeholder = 'Buscar: nombre, músculo, máquina…';
  luLazy(document.getElementById('pk-list'));
};
function luPkRefresh(top) { const l = document.getElementById('pk-list'); if (l) { l.innerHTML = pkList(); if (top) l.scrollTop = 0; luLazy(l); } }

/* ---------- Eventos ---------- */
let luT = null;
window.addEventListener('input', ev => {
  const t = ev.target;
  if (t.id === 'guide-q' && !isWatch()) {
    ev.stopPropagation(); state.guideQ = t.value; state.exMore = {};
    clearTimeout(luT); luT = setTimeout(luGuideRefresh, 120);
  } else if (t.id === 'pk-q' && state.pk) {
    ev.stopPropagation(); state.pk.q = t.value; state.pk.more = {};
    clearTimeout(luT); luT = setTimeout(() => luPkRefresh(true), 100);
  }
}, true);
window.addEventListener('click', ev => {
  const b = ev.target.closest && ev.target.closest('[data-act^="lu-"]'); if (!b) return;
  ev.stopPropagation(); ev.preventDefault();
  const a = b.dataset.act, v = b.dataset.v;
  if (a === 'lu-m') { state.exM = v; state.exMore = {}; render(); }
  else if (a === 'lu-f') { state.exE = v; state.exS = 'all'; state.exMore = {}; render(); }
  else if (a === 'lu-s') { state.exS = v; state.exMore = {}; render(); }
  else if (a === 'lu-more') { state.exMore = Object.assign({}, state.exMore, { [b.dataset.m]: 1 }); luGuideRefresh(); }
  else if (state.pk) {
    const P = state.pk, l = document.getElementById('pk-list');
    if (a === 'lu-pkm') { P.mu = v; P.more = {}; }
    else if (a === 'lu-pkf') { P.eq = v; P.sp = 'all'; P.more = {}; }
    else if (a === 'lu-pks') { P.sp = v; P.more = {}; }
    else if (a === 'lu-pkmore') { P.more = Object.assign({}, P.more, { [b.dataset.m]: 1 }); if (l) P.scroll = l.scrollTop; luPkRefresh(false); return; }
    P.scroll = 0; pkView();
  }
}, true);
bootRender();
