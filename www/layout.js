/* ==========================================================================
   Navegación de 4 botones: Entrenar · Rutinas · Ejercicios · Perfil
   - Entrenar: racha, hábitos y tus rutinas en lista para empezar.
   - Rutinas: tus programas y rutinas (antes "Planes").
   - Ejercicios: biblioteca con filtros (músculo, equipo, favoritos); desde
     cualquier ejercicio creas una rutina nueva o lo agregas a una existente.
   - Perfil: tu cuenta, Progreso, Historial y Ajustes.
   - Barra "Entrenando" sobre la navegación mientras hay una sesión en curso.
   ========================================================================== */

/* Títulos y vistas incrustadas (sin su propio encabezado) */
const _headerL = header;
const TITLE_MAP = { Planes: 'Rutinas', 'Técnica': 'Ejercicios' };
header = function (t, s) { return header.skip ? '' : _headerL(TITLE_MAP[t] || t, s); };


/* ---------- Marca: logo + nombre de la app + tu usuario ---------- */
const LOGO_INNER = '<defs><linearGradient id="lgA" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff4d1f"/><stop offset=".55" stop-color="#ff7a1a"/><stop offset="1" stop-color="#ffb020"/></linearGradient><linearGradient id="lgB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe9a8"/><stop offset="1" stop-color="#ffb020"/></linearGradient></defs><rect width="64" height="64" rx="16" fill="url(#lgA)"/><g transform="translate(0 -2.5)"><path fill="#160a02" d="M32 7c2.2 7.6 11.5 11.6 11.5 22.4a11.5 11.5 0 0 1-23 0c0-5.6 3.4-8.8 4.6-13.4 1.4 3.6 3 5.2 4.6 6.2C30.9 18 32.4 13 32 7z"/><path fill="url(#lgB)" d="M32.2 21.5c1 4.8 5.6 6.8 5.6 11.4a5.8 5.8 0 0 1-11.6 0c0-2.9 1.8-4.8 2.6-7.4.9 1.9 1.9 2.9 2.9 3.3.4-2.4.6-4.8.5-7.3z"/></g><path fill="#160a02" d="M7 41h48v6h-7l-3.5 3.5V52l5.5 4.5V58H20v-1.5l5.5-4.5v-1.5L22 47c-7 0-11.5-2-15-6z"/>';
const LOGO = (s = 34) => `<svg class="logo" width="${s}" height="${s}" viewBox="0 0 64 64" aria-hidden="true">${LOGO_INNER}</svg>`;
header = function (t, s) {
  if (header.skip) return '';
  const name = HISTORY.name || 'Atleta';
  return `<div class="brandbar"><div class="brand">${LOGO(34)}<span class="wordmark">FORJA</span></div>
    <div class="row" style="gap:8px"><button class="userchip" data-act="tab" data-tab="profile" aria-label="Perfil de ${esc(name)}"><span class="avatar xs" aria-hidden="true">${esc(name[0])}</span><span class="un">${esc(name)}</span></button>
    <button class="icon-btn" data-act="tab" data-tab="settings" id="btn-settings" aria-label="Ajustes">${ic('settings', 19)}</button></div></div>
    <div class="pagehead"><div class="label">${s}</div><h1>${TITLE_MAP[t] || t}</h1></div>`;
};

/* ---------- Perfil ---------- */
function vProfile(sub) {
  sub = ['progress', 'history', 'settings'].includes(sub) ? sub : 'progress';
  state.profSub = sub;
  const a = typeof fb !== 'undefined' ? fb.auth : null, logged = !!(a && a.acc);
  const st = streakInfo();
  const ws = weekStartOf(new Date());
  const week = state.sessions.filter(s => new Date(s.date) >= ws).length;
  const tabs = [['progress', 'Progreso', 'trending-up'], ['history', 'Historial', 'history'], ['settings', 'Ajustes', 'settings']];
  let body = '';
  header.skip = true;
  try { body = (sub === 'progress' ? vProgress : sub === 'history' ? vHistory : vSettings)(); }
  finally { header.skip = false; }
  return `${header('Perfil', a && a.email ? esc(a.email) : 'Tu cuenta y tu progreso')}
  <div class="card pcard">
    <div class="row" style="gap:14px"><div class="avatar lg" aria-hidden="true">${esc((HISTORY.name || 'E')[0])}</div>
      <div class="grow" style="min-width:0"><h2>${esc(HISTORY.name || 'Atleta')}</h2>
        <div class="muted" style="font-size:12.5px">${logged ? (a.watch ? 'Reloj vinculado a tu cuenta' : 'Cuenta conectada · celular y reloj sincronizados') : 'Sin cuenta: tus datos solo están en este equipo'}</div></div></div>
    ${logged || typeof FIREBASE === 'undefined' || !FIREBASE ? '' : `<button class="btn primary small" data-act="tab" data-tab="settings" style="align-self:flex-start">${ic('shield', 15)} Crear cuenta o iniciar sesión</button>`}
    <div class="pstats">
      <div><b class="num">${state.sessions.length}</b><span>Entrenamientos</span></div>
      <div><b class="num">${st.count}</b><span>En racha</span></div>
      <div><b class="num">${week}/${st.target}</b><span>Esta semana</span></div>
    </div>
  </div>
  <div class="seg seg3" role="tablist">${tabs.map(([k, l, i]) => `<button role="tab" class="${sub === k ? 'on' : ''}" aria-selected="${sub === k}" data-act="tab" data-tab="${k}">${ic(i, 15)} ${l}</button>`).join('')}</div>
  ${body}`;
}

/* ---------- Entrenar: rutinas en lista ---------- */
const _vTrainL = vTrain;
vTrain = function () {
  let h = _vTrainL();
  if (state.draft || isWatch()) return h;
  h = h.replace(`<div class="label">${WDL[new Date().getDay()]} · ${esc(activeGym().name)}</div>`, `<div class="label">${WDL[new Date().getDay()]}</div>`);
  h = h.replace(/<div class="gymbar" role="group" aria-label="Gimnasio">[\s\S]*?<\/div>/, `<button class="gympill" data-act="gym-pick" aria-label="Cambiar de gimnasio">${ic('map-pin', 14)} ${esc(activeGym().name)} ${ic('chevron-down', 14)}</button>`);
  h = h.replace(/<div class="row" style="justify-content:space-between"><h3>([^<]*)<\/h3><button class="btn small" data-act="tab" data-tab="plans">Cambiar plan<\/button><\/div>/,
    (m, name) => `<div class="row" style="justify-content:space-between;align-items:flex-end"><div><h3>Tus rutinas</h3><div class="muted" style="font-size:12.5px">${name}</div></div><button class="btn small" data-act="tab" data-tab="plans">Ver todas</button></div>`);
  const act = activePlan(), lastOf = id => state.sessions.find(s => s.dayId === id);
  const mine = gymPlans().filter(p => p.custom && (!act || p.id !== act.id) && p.days.length);
  if (mine.length) h += mine.map(p => `<div class="grp"><div class="grp-h"><span class="kind k-mine">${esc(p.name)}</span><span class="muted">${p.days.length} ${p.days.length === 1 ? 'rutina' : 'rutinas'}</span></div>${p.days.map(d => dayCard(p, d, null, lastOf)).join('')}</div>`).join('');
  h += `<button class="btn block" data-act="rt-from-ex">${ic('plus', 16)} Crear una rutina nueva</button>`;
  return h;
};

/* ---------- Rutinas ---------- */
const _vPlansL = vPlans;
vPlans = function () {
  const h = _vPlansL();
  const at = h.indexOf('<div class="gymbar"');
  const btn = `<button class="btn primary block" data-act="rt-from-ex">${ic('plus', 16)} Nueva rutina desde Ejercicios</button>`;
  return at < 0 ? btn + h : h.slice(0, at) + btn + h.slice(at);
};

/* ---------- Ejercicios ---------- */
const EQUIP = [['maq', 'Máquina'], ['manc', 'Mancuernas'], ['barra', 'Barra'], ['polea', 'Polea'], ['cuerpo', 'Peso corporal']];
const EQUIP_L = Object.fromEntries(EQUIP);
function equipOf(x) {
  const n = normName(x.name);
  if (/polea|cable|cruce|jalon|face pull|cuerda/.test(n)) return 'polea';
  if (/flexiones|dominadas|fondos|plancha|crunch abdominal|elevacion de piernas|hiperextension|puente de gluteo|rueda abdominal/.test(n)) return 'cuerpo';
  if (/mancuerna|goblet|martillo|concentrado|arnold|elevaciones laterales|elevaciones frontales|pajaros|encogimientos|bulgara|zancadas|curl biceps/.test(n)) return 'manc';
  if (/barra|peso muerto|hip thrust|remo en t|press frances|predicador/.test(n)) return 'barra';
  return 'maq';
}
const favs = () => state.settings.favs || [];
const isFav = k => favs().includes(k);
function toggleFav(k) { state.settings.favs = isFav(k) ? favs().filter(x => x !== k) : favs().concat([k]); savePlans(); }
state.sel = state.sel || [];
function exFilter() {
  const g = state.exG || 'all', e = state.exE || 'all', q = normName(state.guideQ || '');
  const plan = activePlan();
  const inPlan = new Set(plan ? plan.days.flatMap(d => d.exercises.map(x => (libFind(x.name) || {}).key)).filter(Boolean) : []);
  return LIB.filter(x => {
    if (q) return normName(x.name + ' ' + x.musc.join(' ') + ' ' + (x.group || '') + ' ' + EQUIP_L[equipOf(x)]).includes(q);
    if (g === 'fav' && !isFav(x.key)) return false;
    if (g === 'plan' && !inPlan.has(x.key)) return false;
    if (!['all', 'fav', 'plan'].includes(g) && x.group !== g) return false;
    if (e !== 'all' && equipOf(x) !== e) return false;
    return true;
  });
}
vGuide = function () {
  const g = state.exG || 'all', e = state.exE || 'all', q = state.guideQ || '';
  const list = exFilter(), sel = state.sel;
  const card = x => `<button class="card exc ${sel.includes(x.key) ? 'sel' : ''}" data-act="ex-tap" data-key="${x.key}" aria-pressed="${sel.includes(x.key)}">
    <div class="fig">${figSVG(x, 1)}</div>
    ${isFav(x.key) ? `<span class="fav-on" aria-label="Favorito">${ic('star', 14)}</span>` : ''}
    ${sel.includes(x.key) ? `<span class="sel-on">${ic('check', 14)}</span>` : ''}
    <div class="row" style="gap:6px"><span class="dot t-${x.type}"></span><span class="nm">${esc(x.name)}</span></div>
    <div class="muted" style="font-size:11.5px">${esc(x.group)} · ${EQUIP_L[equipOf(x)]}</div></button>`;
  const chips = (arr, cur, act) => arr.map(([v, l]) => `<button class="gchip ${cur === v ? 'on' : ''}" data-act="${act}" data-v="${v}">${l}</button>`).join('');
  return `${header('Ejercicios', LIB.length + ' ejercicios')}
  <input id="guide-q" type="search" placeholder="Buscar ejercicio, músculo o equipo…" value="${esc(q)}" autocomplete="off">
  <div class="gymbar">${chips([['all', 'Todos'], ['fav', '★ Favoritos'], ['plan', 'Mi plan'], ...GROUPS.map(x => [x, x])], g, 'ex-g')}</div>
  <div class="gymbar">${chips([['all', 'Todo equipo'], ...EQUIP], e, 'ex-e')}</div>
  <div class="muted" style="font-size:12.5px">${sel.length ? 'Toca más ejercicios para sumarlos a tu nueva rutina.' : 'Toca un ejercicio para ver su técnica, marcarlo como favorito o crear una rutina con él.'}</div>
  ${list.length ? `<div class="guide">${list.map(card).join('')}</div>` : `<div class="card empty">${g === 'fav' ? 'Aún no tienes favoritos. Toca un ejercicio y elige ★ Favorito.' : 'No encontré ejercicios con esos filtros.'}</div>`}
  ${sel.length ? `<div class="selbar"><button class="icon-btn" data-act="sel-clear" aria-label="Quitar selección">${ic('x', 18)}</button>
    <div class="grow"><b>${sel.length} ${sel.length === 1 ? 'ejercicio' : 'ejercicios'}</b><small>${esc(sel.map(k => (LIB.find(x => x.key === k) || {}).name).filter(Boolean).slice(0, 3).join(', '))}${sel.length > 3 ? '…' : ''}</small></div>
    <button class="btn small" data-act="sel-add">Agregar a…</button><button class="btn primary small" data-act="sel-new">Crear rutina</button></div>` : ''}`;
};

function exActions(key) {
  const x = LIB.find(y => y.key === key); if (!x) return;
  openSheet(`<div class="row"><div class="grow"><div class="label">${esc(x.group)} · ${EQUIP_L[equipOf(x)]}</div><h2>${esc(x.name)}</h2></div><button class="icon-btn" data-act="sheet-close" aria-label="Cerrar">${ic('x', 18)}</button></div>
    <div class="row" style="gap:12px"><div class="fig" style="width:120px;padding:2px;flex:none">${figSVG(x, 1)}</div>
      <div class="target" style="align-content:flex-start">${x.musc.map(m => `<span class="chip"><span class="dot t-${x.type}"></span>${esc(m)}</span>`).join('')}${x.reps ? `<span class="chip">${esc(x.reps)} reps</span>` : ''}</div></div>
    <div class="ex-actions">
      <button class="btn primary block" data-act="ex-new1" data-key="${key}">${ic('plus', 16)} Crear rutina nueva con este ejercicio</button>
      <button class="btn block" data-act="ex-add1" data-key="${key}">${ic('list-plus', 16)} Agregar a una rutina existente</button>
      <button class="btn block" data-act="ex-sel" data-key="${key}">${ic('check-square', 16)} Elegir varios para una rutina</button>
      <div class="grid2"><button class="btn" data-act="how" data-name="${esc(x.name)}">${ic('book-open', 16)} Ver técnica</button>
      <button class="btn ${isFav(key) ? 'fav' : ''}" data-act="ex-fav" data-key="${key}">${ic('star', 16)} ${isFav(key) ? 'Favorito' : 'Favorito'}</button></div>
    </div>`);
}

/* Ejercicio de rutina a partir de la biblioteca, con el último peso que usaste */
function exFromLib(x) {
  const [a, b] = String(x.reps || '8-12').split('-').map(n => parseInt(n, 10));
  let w = 0;
  for (const s of state.sessions) { if (sGym(s) !== activeGym().id) continue; const e = s.exercises.find(y => y.name === x.name); if (e && e.sets.length) { w = Math.max.apply(null, e.sets.map(z => z.w)); break; } }
  if (!w) for (const p of gymPlans()) for (const d of p.days) for (const e of d.exercises) if (!w && e.name === x.name) w = e.weight;
  const bar = BAR_DEFAULT[x.name];
  return Object.assign({ id: uid(), name: x.name, type: x.type, weight: w || 0, sets: 3, repsMin: a || 8, repsMax: b || a || 12, rest: Math.min(600, Math.max(10, Math.round((x.rest || 90) / 10) * 10)) }, bar ? { bar } : {});
}
function suggestName(keys) {
  const gs = [...new Set(keys.map(k => (LIB.find(x => x.key === k) || {}).group).filter(Boolean))];
  return gs.length ? gs.slice(0, 3).join(' + ') : 'Mi rutina';
}
function rtSheet(keys) {
  state.rtKeys = keys.slice();
  const today = new Date().getDay();
  openSheet(`<div class="row"><h2 class="grow">Nueva rutina</h2><button class="icon-btn" data-act="sheet-close" aria-label="Cerrar">${ic('x', 18)}</button></div>
    <form id="f-rt" class="grid2" style="grid-template-columns:1fr">
      <div class="field"><label class="label" for="rt-name">Nombre</label><input id="rt-name" name="name" required maxlength="40" value="${esc(suggestName(keys))}"></div>
      <div class="grid2"><div class="field"><label class="label" for="rt-day">Día</label><select id="rt-day" name="weekday">${[1, 2, 3, 4, 5, 6, 0].map(d => `<option value="${d}" ${d === today ? 'selected' : ''}>${WDL[d]}</option>`).join('')}</select></div>
        <div class="field"><label class="label" for="rt-kind">Tipo</label><select id="rt-kind" name="kind">${Object.keys(KINDS).map(k => `<option value="${k}">${KINDS[k]}</option>`).join('')}</select></div></div>
      <div class="field"><span class="label">Ejercicios (${keys.length})</span>
        <div class="rt-list">${keys.map((k, i) => { const x = LIB.find(y => y.key === k); return x ? `<div class="rt-row"><span class="o">${i + 1}</span><span class="dot t-${x.type}"></span><span class="grow">${esc(x.name)}</span><small class="muted">3 × ${esc(x.reps || '8-12')}</small></div>` : ''; }).join('')}</div>
        <div class="muted" style="font-size:12px">Se guarda en Rutinas → "Mis rutinas" de ${esc(activeGym().name)}. Ahí puedes ajustar pesos, series y orden.</div></div>
      <div class="grid2"><button type="button" class="btn" data-act="sheet-close">Cancelar</button><button class="btn primary" type="submit">Guardar rutina</button></div>
    </form>`);
}
function addToSheet(keys) {
  state.rtKeys = keys.slice();
  const plans = gymPlans().filter(p => p.days.length);
  openSheet(`<div class="row"><h2 class="grow">Agregar a una rutina</h2><button class="icon-btn" data-act="sheet-close" aria-label="Cerrar">${ic('x', 18)}</button></div>
    <div class="muted" style="font-size:13px">${keys.length === 1 ? esc((LIB.find(x => x.key === keys[0]) || {}).name || '') : keys.length + ' ejercicios'} · ${esc(activeGym().name)}</div>
    ${plans.map(p => `<div class="label" style="margin-top:4px">${esc(p.name)}</div>${p.days.map(d => `<button class="pick" data-act="rt-addto" data-plan="${p.id}" data-day="${d.id}"><span class="wd" style="width:36px;height:36px;font-size:14px">${WD[d.weekday]}</span><span class="grow" style="text-align:left"><b>${esc(d.name)}</b><small class="muted">${d.exercises.length} ejercicios</small></span>${ic('plus', 16)}</button>`).join('')}`).join('') || '<div class="muted">Aún no tienes rutinas en este gimnasio.</div>'}
    <button class="btn block" data-act="sheet-close">Cancelar</button>`);
}
function saveRoutine(f) {
  const fd = new FormData(f), keys = state.rtKeys || [];
  const gid = activeGym().id;
  let mine = state.plans.find(p => p.gymId === gid && p.custom);
  if (!mine) { mine = { id: uid(), name: 'Mis rutinas', gymId: gid, custom: true, days: [] }; state.plans.push(mine); }
  const day = { id: uid(), name: String(fd.get('name')).trim() || 'Mi rutina', weekday: +fd.get('weekday'), kind: fd.get('kind') || 'fuerza',
    exercises: keys.map(k => LIB.find(x => x.key === k)).filter(Boolean).map(exFromLib) };
  mine.days.push(day);
  savePlans(); state.sel = []; state.rtKeys = null; closeSheet();
  state.tab = 'plans'; render(); scrollTo(0, 0);
  toast(`Rutina "${day.name}" guardada en Rutinas.`);
}

document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-act]'); if (!b) return;
  const a = b.dataset.act;
  const mine = ['gym-pick', 'gym-set', 'ex-g', 'ex-e', 'ex-tap', 'ex-new1', 'ex-add1', 'ex-sel', 'ex-fav', 'sel-clear', 'sel-new', 'sel-add', 'rt-addto', 'rt-from-ex', 'live-open'];
  if (!mine.includes(a)) return;
  ev.stopPropagation(); ev.preventDefault();
  const k = b.dataset.key;
  if (a === 'gym-pick') openSheet(`<div class="row"><h2 class="grow">¿Dónde entrenas hoy?</h2><button class="icon-btn" data-act="sheet-close" aria-label="Cerrar">${ic('x', 18)}</button></div>
    ${state.gyms.map(g => `<button class="pick ${g.id === activeGym().id ? 'on' : ''}" data-act="gym-set" data-gym="${g.id}">${ic('map-pin', 18)}<span class="grow" style="text-align:left"><b>${esc(g.name)}</b><small class="muted">${gymPlans(g.id).length} planes</small></span>${g.id === activeGym().id ? ic('check', 18) : ''}</button>`).join('')}
    <button class="btn block" data-act="gym-new">+ Agregar gimnasio</button>`);
  if (a === 'gym-set') { state.settings.activeGymId = b.dataset.gym; state.editPlan = null; saveLocal(); closeSheet(); render(); toast('Entrenando en ' + activeGym().name); }
  if (a === 'ex-g') { state.exG = b.dataset.v; state.guideQ = ''; render(); }
  if (a === 'ex-e') { state.exE = b.dataset.v; render(); }
  if (a === 'ex-tap') {
    if (state.sel.length) { state.sel = state.sel.includes(k) ? state.sel.filter(x => x !== k) : state.sel.concat([k]); render(); }
    else exActions(k);
  }
  if (a === 'ex-new1') rtSheet([k]);
  if (a === 'ex-add1') addToSheet([k]);
  if (a === 'ex-sel') { state.sel = [k]; closeSheet(); render(); toast('Toca otros ejercicios para sumarlos.'); }
  if (a === 'ex-fav') { toggleFav(k); toast(isFav(k) ? 'Agregado a favoritos ★' : 'Quitado de favoritos'); exActions(k); }
  if (a === 'sel-clear') { state.sel = []; render(); }
  if (a === 'sel-new') rtSheet(state.sel);
  if (a === 'sel-add') addToSheet(state.sel);
  if (a === 'rt-addto') {
    const { d } = findDay(b.dataset.plan, b.dataset.day); if (!d) return;
    const keys = state.rtKeys || [];
    const add = keys.map(x => LIB.find(y => y.key === x)).filter(Boolean).filter(x => !d.exercises.some(e => e.name === x.name)).map(exFromLib);
    d.exercises.push.apply(d.exercises, add); savePlans(); state.sel = []; closeSheet(); render();
    toast(add.length ? `Agregado a "${d.name}".` : 'Ya estaba en esa rutina.');
  }
  if (a === 'rt-from-ex') { state.tab = 'guide'; state.sel = []; render(); scrollTo(0, 0); toast('Elige un ejercicio y toca "Crear rutina nueva", o "Elegir varios".'); }
  if (a === 'live-open') { state.tab = 'train'; render(); scrollTo(0, 0); }
}, true);
document.addEventListener('submit', ev => {
  if (ev.target.id !== 'f-rt') return;
  ev.preventDefault(); ev.stopImmediatePropagation();
  saveRoutine(ev.target);
}, true);

/* ---------- Barra "Entrenando" ---------- */
function liveInfo() {
  const d = state.draft; if (!d) return null;
  for (const e of d.exercises) {
    const j = e.log.findIndex(s => !s.done);
    if (j >= 0) { const s = e.log[j]; return { name: e.name, w: s.w != null && s.w !== '' ? +s.w : (e.sugg ? e.sugg.w : 0), r: s.r != null && s.r !== '' ? s.r : e.repsMax, set: j + 1, of: e.log.length }; }
  }
  return { name: '¡Todo listo! Toca para terminar', w: null };
}
function liveBar() {
  let el = document.getElementById('livebar');
  const show = state.draft && !isWatch() && state.tab !== 'train';
  document.body.classList.toggle('has-live', !!show);
  if (!show) { if (el) el.hidden = true; return; }
  if (!el) { el = document.createElement('button'); el.id = 'livebar'; el.className = 'livebar'; el.dataset.act = 'live-open'; el.setAttribute('aria-label', 'Volver al entrenamiento'); document.body.appendChild(el); }
  const i = liveInfo(), d = state.draft;
  el.hidden = false;
  el.innerHTML = `<span class="lv-ic">${ic('timer', 18)}</span>
    <span class="grow" style="min-width:0;text-align:left"><small><span class="lv-dot"></span>Entrenando · <span class="num" id="lv-time">${clock(Math.floor((Date.now() - new Date(d.start)) / 1000))}</span></small>
      <b>${esc(i.name)}</b>${i.w != null ? `<span class="num">${fmtKg(i.w)} kg × ${esc(i.r)} · serie ${i.set}/${i.of}</span>` : ''}</span>
    <span class="lv-up">${ic('chevron-up', 20)}</span>`;
}
setInterval(() => { const t = document.getElementById('lv-time'); if (t && state.draft) t.textContent = clock(Math.floor((Date.now() - new Date(state.draft.start)) / 1000)); }, 1000);

/* "Antes" en todas las series: si la vez anterior tuvo menos series (o es un récord de una sola), se repite la última */
function padPrev() {
  const d = state.draft; if (!d) return;
  d.exercises.forEach(e => {
    if (!e.prev || !e.prev.length) return;
    while (e.prev.length < e.log.length) { const l = e.prev[e.prev.length - 1]; e.prev.push({ w: l.w, r: l.r, drops: [] }); }
  });
}

const _renderL = render;
render = function () { padPrev(); _renderL(); liveBar(); };

/* Tu sesión de piernas del 5 de octubre en Roka'z (Symmetry): se repone si falta */
if (!state.settings.importSym2) {
  const SID = 'sym-rokaz-2026-10-05';
  if (!state.sessions.some(s => s.id === SID)) {
    state.sessions.push({ id: SID, date: new Date('2026-10-05T19:00:00-05:00').toISOString(), planId: 'plan2', planName: 'Torso / Pierna · 4 días', dayId: 'p2-lun', dayName: 'Piernas (Pesado)', gymId: 'rokaz', gymName: gymName('rokaz'), kind: 'fuerza', durationSec: 7080, source: 'Symmetry',
      exercises: [
        { name: 'Prensa 45°', type: P, sets: [{ w: 160, r: 18 }, { w: 170, r: 18 }, { w: 170, r: 18 }] },
        { name: 'Sentadilla Hack', type: P, note: 'Con mala técnica, dominar 60', sets: [{ w: 60, r: 12 }, { w: 60, r: 12 }, { w: 60, r: 12 }] },
        { name: 'Hip Thrust', type: P, sets: [{ w: 30, r: 15 }, { w: 30, r: 10 }, { w: 30, r: 11 }] },
        { name: 'Extensión de Pierna', type: P, sets: [{ w: 45, r: 14 }, { w: 45, r: 12 }, { w: 45, r: 12 }] },
        { name: 'Abducción de Cadera', type: P, sets: [{ w: 20, r: 10 }, { w: 20, r: 10 }, { w: 20, r: 10 }] },
      ] });
    state.sessions.sort((a, b) => b.date.localeCompare(a.date));
    if (typeof sync !== 'undefined') sync.revive([SID]);
    /* Si había una sesión recién empezada (sin series marcadas), se rehace con tus datos de Roka'z */
    const d = state.draft;
    if (d && !d.exercises.some(e => e.log.some(x => x.done)) && findDay(d.planId, d.dayId).d) { state.draft = null; startSession(d.planId, d.dayId); }
  }
  state.settings.importSym2 = 1; saveLocal();
}
render();
