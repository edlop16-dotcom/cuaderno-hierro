/* ==========================================================================
   Editar una sesión ya terminada (detalle del día → "Editar sesión")
   - Cambiar un ejercicio por otro (selector de la biblioteca), peso y reps de cada serie,
     agregar o quitar series y ejercicios, cambiar el orden. Solo el teléfono.
   - Se trabaja sobre una copia (`state.sEd`): "Cancelar" no cambia nada.
   - Al guardar: la sesión queda marcada `edited` (y `mt`, para que en la nube y el reloj gane
     la edición más reciente), se recalculan sus escudos (`wins`) y se vacían las cachés
     (logros, estancamiento y el Coach de Próxima sesión). Récords, progreso, mapa muscular,
     coach semanal, rangos y nivel se leen de las sesiones, así que salen ya corregidos.
     La fecha no cambia: la racha se mantiene.
   - Rutinas: si al terminar esa sesión `learnWeights` copió su peso a la rutina y nadie lo
     cambió después, se copia el peso corregido (o el de tu sesión anterior si quitaste el ejercicio).
   ========================================================================== */
const seNum = v => { const n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isFinite(n) ? n : NaN; };
const seShow = v => (v == null || v === '' ? '' : String(Math.round(+v * 100) / 100).replace('.', ','));
const seBarTxt = name => (typeof barFor === 'function' ? barFor(name) : (BAR_DEFAULT[name] || 0)) ? ' · sin la barra' : '';

function seStart(id, k) {
  const s = state.sessions.find(x => x.id === id); if (!s) return;
  state.sEd = { id, k, ex: JSON.parse(JSON.stringify(s.exercises)).map(e => { e.sets = (e.sets || []).map(x => Object.assign({}, x, { w: seShow(x.w), r: x.r == null ? '' : String(x.r) })); return e; }), err: null, bad: {} };
  seView();
}
function seRow(e, i, j, x) {
  const bw = state.sEd.bad[i + '.' + j] || {};
  return `<div class="se-set"><span class="se-sn">${j + 1}</span>
    <input class="se-in${bw.w ? ' bad' : ''}" data-se-i="${i}" data-se-j="${j}" data-se-f="w" inputmode="decimal" autocomplete="off" value="${esc(x.w)}" aria-label="Peso de la serie ${j + 1}">
    <span class="se-x">×</span>
    <input class="se-in${bw.r ? ' bad' : ''}" data-se-i="${i}" data-se-j="${j}" data-se-f="r" inputmode="numeric" autocomplete="off" value="${esc(x.r)}" placeholder="reps" aria-label="Reps de la serie ${j + 1}">
    ${x.rir != null ? `<small class="se-rir">@${x.rir}</small>` : ''}${(x.drops || []).map(dr => `<small class="se-rir">↓${fmtKg(+dr.w || 0)}×${dr.r || 0}</small>`).join('')}
    <button type="button" class="se-del" data-se="del-set" data-i="${i}" data-j="${j}" aria-label="Quitar la serie ${j + 1}">${ic('x', 16)}</button></div>`;
}
function seView() {
  const E = state.sEd, s = E && state.sessions.find(x => x.id === E.id); if (!s) return;
  const u = typeof ddUnit === 'function' ? ddUnit() : 'kg', n = E.ex.length;
  openSheet(`<div class="pk-top"><button class="linkbtn" data-se="cancel">Cancelar</button><b>Editar sesión</b><button class="linkbtn se-save-t" data-se="save">Guardar</button></div>
    <div class="se-sub muted">${esc(fmtDate(s.date, true))} · ${esc(s.dayName)} · ${esc(s.gymName || gymName(sGym(s)))}</div>
    ${E.err ? `<div class="se-err" role="alert">${esc(E.err)}</div>` : ''}
    <div class="se-list">${E.ex.map((e, i) => `<div class="se-ex" data-se-ex="${i}">
      <div class="se-eh"><span class="se-num">${i + 1}</span><b class="grow">${esc(e.name)}</b>
        <button type="button" class="se-mv" data-se="up" data-i="${i}" ${i ? '' : 'disabled'} aria-label="Subir ${esc(e.name)}">${ic('chevron-up', 18)}</button>
        <button type="button" class="se-mv" data-se="down" data-i="${i}" ${i < n - 1 ? '' : 'disabled'} aria-label="Bajar ${esc(e.name)}">${ic('chevron-down', 18)}</button></div>
      <div class="se-hd muted"><span>Serie</span><span>Peso (${u}${seBarTxt(e.name)}) × reps</span></div>
      ${e.sets.map((x, j) => seRow(e, i, j, x)).join('') || '<div class="muted se-none">Sin series: agrega una o quita el ejercicio.</div>'}
      <div class="se-acts"><button type="button" class="btn small" data-se="add-set" data-i="${i}">${ic('plus', 15)} Serie</button>
        <button type="button" class="btn small" data-se="swap" data-i="${i}">${ic('refresh-cw', 15)} Cambiar ejercicio</button>
        <button type="button" class="btn small danger" data-se="del-ex" data-i="${i}">${ic('trash-2', 15)} Quitar</button></div></div>`).join('')}</div>
    <button type="button" class="btn block se-add" data-se="add-ex">${ic('plus', 16)} Agregar ejercicio</button>
    <div class="muted se-foot">Los cambios solo se guardan al tocar Guardar. La fecha no cambia, así que tu racha sigue igual.</div>
    <div class="pk-bottom"><button class="btn primary block" data-se="save">Guardar cambios</button></div>`);
  const c = document.querySelector('#sheet .sheet-card'); if (c) { c.classList.add('pk-sheet', 'se-sheet'); if (E.scroll) c.scrollTop = E.scroll; }
  try { document.activeElement.blur(); } catch (e) {}
}
function seKeepScroll() { const c = document.querySelector('#sheet .se-sheet'); if (c && state.sEd) state.sEd.scroll = c.scrollTop; }

/* ---------- Selector de la biblioteca en modo "editar sesión" ---------- */
function sePick(mode, i) {
  seKeepScroll();
  state.pk = { pid: null, did: null, sel: [], q: '', eq: 'all', mu: 'all', custom: [], sedit: { mode, i } };
  pkView();
}
const _pkListSe = pkList;
pkList = function () {
  const P = state.pk; if (!P || !P.sedit || !state.sEd) return _pkListSe();
  const E = state.sEd, have = new Set(E.ex.map(e => e.name)), q = normName(P.q || '').trim(), words = q.split(/\s+/).filter(Boolean), cur = P.sedit.mode === 'swap' ? E.ex[P.sedit.i] : null;
  const fil = x => (P.eq === 'all' || equipOf(x) === P.eq) && (P.mu === 'all' || pkMusc(x).indexOf(P.mu) >= 0) && (!words.length || (h => words.every(w => h.includes(w)))(normName(x.name + ' ' + (x.musc || []).join(' ') + ' ' + (x.al || []).join(' '))));
  const all = LIB.slice().filter(fil).sort((a, b) => a.name.localeCompare(b.name));
  const plain = !q && P.eq === 'all' && P.mu === 'all';
  let sim = [];
  if (plain && cur) {
    const sh = zoneShares(cur.name), main = Object.keys(sh).find(k => sh[k] === 1);
    if (main) sim = LIB.filter(x => x.name !== cur.name && zoneShares(x.name)[main] === 1).sort((a, b) => (equipOf(b) === equipOf(libFind(cur.name) || { name: cur.name })) - (equipOf(a) === equipOf(libFind(cur.name) || { name: cur.name })) || a.name.localeCompare(b.name)).slice(0, 8);
  }
  const custom = (P.custom || []).map(n => ({ name: n, type: typeOf(n), musc: [], custom: true }));
  const out = `${custom.length ? `<div class="pk-sec">Creados por ti</div>${custom.map(x => pkRow(x, have, P.sel)).join('')}` : ''}
    ${sim.length ? `<div class="pk-sec">Mismo músculo que ${esc(cur.name)}</div>${sim.map(x => pkRow(x, have, P.sel)).join('')}` : ''}
    ${plain ? '<div class="pk-sec">Todos los ejercicios</div>' : ''}${all.map(x => pkRow(x, have, P.sel)).join('') || '<div class="muted" style="padding:16px">Sin resultados. Toca "Crear" para agregar uno propio.</div>'}`;
  return out.replace(/Ya está en la rutina/g, 'Ya está en esta sesión');
};
const _pkViewSe = pkView;
pkView = function () {
  _pkViewSe();
  const P = state.pk; if (!P || !P.sedit || P.info) return;
  const E = state.sEd, cur = P.sedit.mode === 'swap' && E ? E.ex[P.sedit.i] : null;
  const f = document.querySelector('#sheet .pk-for'); if (f) f.innerHTML = cur ? `Cambiar <b>${esc(cur.name)}</b> en esta sesión: toca el ejercicio que hiciste de verdad. Sus series se conservan.` : 'Agregar a esta sesión (con una serie para que pongas peso y reps).';
  const t = document.querySelector('#sheet .pk-top b'); if (t) t.textContent = cur ? 'Cambiar ejercicio' : 'Agregar ejercicios';
  if (cur) { const bt = document.querySelector('#sheet .pk-bottom'); if (bt) bt.remove(); }
};
function seLastSet(name, s) {
  const g = sGym(s);
  for (const x of state.sessions) { if (x.id === s.id || sGym(x) !== g) continue; const e = x.exercises.find(y => y.name === name); if (e && e.sets.length) return e.sets[e.sets.length - 1]; }
  return null;
}
function seApplyPick(names) {
  const P = state.pk, E = state.sEd, s = E && state.sessions.find(x => x.id === E.id); if (!P || !E || !s) return;
  if (P.sedit.mode === 'swap') {
    const e = E.ex[P.sedit.i], n = names[0];
    if (e && n && n !== e.name) { if (E.ex.some((x, k) => k !== P.sedit.i && x.name === n)) { toast(`${n} ya está en esta sesión.`); return; } e.name = n; e.type = typeOf(n); delete e.note; }
  } else {
    names.filter(n => !E.ex.some(e => e.name === n)).forEach(n => {
      const l = seLastSet(n, s), [a, b] = String((libFind(n) || {}).reps || '10-12').split('-').map(Number);
      E.ex.push({ name: n, type: typeOf(n), repsMin: a || 10, repsMax: b || a || 12, sets: [{ w: l ? seShow(l.w) : '', r: '' }], added: 1 });
    });
  }
  E.err = null; state.pk = null; seView();
}
window.addEventListener('click', ev => {
  const b = ev.target.closest && ev.target.closest('[data-act="pk-tog"],[data-act="pk-pick"],[data-act="pk-add"],[data-act="pk-cancel"]'); if (!b) return;
  const P = state.pk; if (!P || !P.sedit) return;
  ev.stopPropagation(); ev.preventDefault();
  const a = b.dataset.act;
  if (a === 'pk-cancel') { state.pk = null; seView(); return; }
  if (P.sedit.mode === 'swap' && (a === 'pk-tog' || a === 'pk-pick')) { seApplyPick([b.dataset.name]); return; }
  if (a === 'pk-add') { if (P.sel.length) seApplyPick(P.sel.slice()); return; }
  const n = b.dataset.name, k = P.sel.indexOf(n); if (k >= 0) P.sel.splice(k, 1); else P.sel.push(n);
  if (a === 'pk-pick') P.info = null;
  const l = document.getElementById('pk-list'); if (l) P.scroll = l.scrollTop;
  pkView();
}, true);

/* ---------- Guardar ---------- */
function seWins(s) {
  const out = {};
  s.exercises.forEach(e => {
    let best = null, last = null;
    for (const p of exPoints(e.name, sGym(s))) {
      if (p.s === s) {
        let w = null;
        if (best != null && p.e > best + 0.01) w = 'pr';
        else if (last && (p.top.w > last.top.w || (p.top.w === last.top.w && p.top.r > last.top.r) || p.sets.length > last.sets.length || p.vol > last.vol * 1.03)) w = 'up';
        if (w) out[e.name] = w;
        break;
      }
      best = Math.max(best || 0, p.e); last = p;
    }
  });
  return out;
}
const seTop = e => (e && e.sets.length ? Math.max.apply(null, e.sets.map(x => +x.w || 0)) : 0);
function seLatest(name, g) { return state.sessions.find(x => sGym(x) === g && x.planId !== 'wcfill' && x.exercises.some(e => e.name === name && e.sets.length)); }
/* Pesos de las rutinas que vinieron de esta sesión (learnWeights) */
function seFixPlans(s, oldEx, latestBefore) {
  if (s.planId === 'wcfill') return;
  const g = sGym(s); let ch = false;
  Object.keys(latestBefore).forEach(name => {
    if (latestBefore[name] !== s) return;
    const was = seTop(oldEx.find(e => e.name === name)); if (!was) return;
    const L = seLatest(name, g), now = L ? seTop(L.exercises.find(e => e.name === name)) : 0; if (!now || now === was) return;
    state.plans.filter(p => (p.gymId || 'rokaz') === g).forEach(p => p.days.forEach(d => d.exercises.forEach(x => { if (x.name === name && +x.weight === was) { x.weight = now; ch = true; } })));
  });
  /* Ejercicio nuevo en la sesión y es tu vez más reciente: pasa como si lo hubieras terminado */
  s.exercises.forEach(e => {
    if (oldEx.some(o => o.name === e.name) || seLatest(e.name, g) !== s) return;
    const top = seTop(e); if (!top) return;
    state.plans.filter(p => (p.gymId || 'rokaz') === g).forEach(p => p.days.forEach(d => d.exercises.forEach(x => { if (x.name === e.name && +x.weight !== top) { x.weight = top; ch = true; } })));
  });
  if (ch) savePlans();
}
function seCheck() {
  const E = state.sEd; E.bad = {}; E.err = null;
  if (!E.ex.length) return 'La sesión necesita al menos un ejercicio. Si no entrenaste ese día, ciérrala y usa «Quitar» en el detalle del día.';
  for (let i = 0; i < E.ex.length; i++) {
    const e = E.ex[i];
    if (!e.sets.length) return `${e.name} no tiene series: agrega una o quita el ejercicio.`;
    for (let j = 0; j < e.sets.length; j++) {
      const x = e.sets[j], w = String(x.w).trim() === '' ? 0 : seNum(x.w), r = seNum(x.r);
      if (!(w >= 0 && w <= 1500)) { E.bad[i + '.' + j] = { w: 1 }; return `${e.name}, serie ${j + 1}: el peso no es válido.`; }
      if (!(r >= 1 && r <= 300 && Math.round(r) === r)) { E.bad[i + '.' + j] = { r: 1 }; return `${e.name}, serie ${j + 1}: escribe las reps (un número entero).`; }
    }
  }
  return null;
}
function seSave() {
  const E = state.sEd, s = E && state.sessions.find(x => x.id === E.id); if (!s) return;
  const err = seCheck();
  if (err) { E.err = err; E.scroll = 0; seView(); return; }
  const g = sGym(s), oldEx = JSON.parse(JSON.stringify(s.exercises));
  const ex = E.ex.map(e => {
    const o = Object.assign({}, e); delete o.added;
    o.sets = e.sets.map(x => { const y = Object.assign({}, x, { w: String(x.w).trim() === '' ? 0 : seNum(x.w), r: Math.round(seNum(x.r)) }); if (!(y.drops || []).length) delete y.drops; return y; });
    if (e.added || o.target == null) o.target = o.sets.length;
    return o;
  });
  if (JSON.stringify(ex) === JSON.stringify(oldEx)) { state.sEd = null; daySheet(E.k); toast('Sin cambios.'); return; }
  const latestBefore = {};
  oldEx.forEach(e => { latestBefore[e.name] = seLatest(e.name, g); });
  s.exercises = ex; s.edited = s.mt = Date.now(); s.synced = false;
  const w = seWins(s); if (Object.keys(w).length) s.wins = w; else delete s.wins;
  seFixPlans(s, oldEx, latestBefore);
  seFlush();
  saveLocal(); if (typeof cloud !== 'undefined' && cloud.addSession) cloud.addSession(s);
  state.sEd = null; daySheet(E.k); render();
  toast('Sesión corregida: récords, progreso y coach ya la usan.');
}
/* Cachés que dependen de las sesiones y no notan una edición (mismo número de sesiones y misma fecha) */
function seFlush() {
  try { if (typeof bdCache !== 'undefined') bdCache.k = ''; } catch (e) {}
  try { if (typeof stallCache !== 'undefined') stallCache.k = ''; } catch (e) {}
  try { if (typeof nsCache !== 'undefined') Object.keys(nsCache).forEach(k => delete nsCache[k]); } catch (e) {}
}
/* El Coach de Próxima sesión se recalcula si se edita una sesión (sin ediciones la clave no cambia) */
if (typeof nsKey === 'function') {
  const _nsKeySe = nsKey;
  nsKey = function (planId, dayId) {
    let ed = 0; state.sessions.forEach(s => { if (s.edited > ed) ed = s.edited; });
    const k = _nsKeySe(planId, dayId); return ed ? k + '|e' + ed : k;
  };
}

/* ---------- Eventos ---------- */
document.addEventListener('click', ev => {
  const b = ev.target.closest && ev.target.closest('[data-se]'); if (!b) return;
  ev.preventDefault(); ev.stopPropagation();
  const a = b.dataset.se, E = state.sEd;
  if (a === 'open') { seStart(b.dataset.id, b.dataset.k); return; }
  if (!E) return;
  const i = +b.dataset.i, e = E.ex[i];
  seKeepScroll();
  if (a === 'cancel') { state.sEd = null; daySheet(E.k); return; }
  if (a === 'save') { seSave(); return; }
  if (a === 'add-ex') { sePick('add', -1); return; }
  if (a === 'swap' && e) { sePick('swap', i); return; }
  if (a === 'up' && i > 0) E.ex.splice(i - 1, 0, E.ex.splice(i, 1)[0]);
  else if (a === 'down' && i < E.ex.length - 1) E.ex.splice(i + 1, 0, E.ex.splice(i, 1)[0]);
  else if (a === 'del-ex' && e) E.ex.splice(i, 1);
  else if (a === 'add-set' && e) { const l = e.sets[e.sets.length - 1]; e.sets.push(l ? { w: l.w, r: l.r } : { w: '', r: '' }); }
  else if (a === 'del-set' && e) e.sets.splice(+b.dataset.j, 1);
  else return;
  E.err = null; E.bad = {}; seView();
}, true);
document.addEventListener('input', ev => {
  const t = ev.target, E = state.sEd; if (!E || !t.dataset || t.dataset.seI == null) return;
  const x = E.ex[+t.dataset.seI] && E.ex[+t.dataset.seI].sets[+t.dataset.seJ]; if (!x) return;
  x[t.dataset.seF] = t.value; t.classList.remove('bad');
});
document.addEventListener('focusin', ev => { const t = ev.target; if (t && t.classList && t.classList.contains('se-in')) { try { t.select(); } catch (e) {} } });

/* Botón "Editar sesión" y la marca "editada" en el detalle del día */
const _daySheetSe = daySheet;
daySheet = function (k) {
  _daySheetSe(k);
  if (isWatch()) return;
  const list = state.sessions.filter(s => dk(s.date) === k);
  document.querySelectorAll('#sheet .dd-ses').forEach((el, i) => {
    const s = list[i], h = el.querySelector('.dd-h'); if (!s || !h || h.querySelector('.se-open')) return;
    if (s.edited) { const sm = h.querySelector('small'); if (sm) sm.insertAdjacentHTML('beforeend', ' · <span class="se-tag">editada</span>'); }
    h.insertAdjacentHTML('beforeend', `<button type="button" class="btn small se-open" data-se="open" data-id="${esc(s.id)}" data-k="${esc(k)}">${ic('square-pen', 15)} Editar sesión</button>`);
  });
};
/* Historial: la marca "editada" */
const _vHistorySe = vHistory;
vHistory = function () {
  const h = _vHistorySe(); if (isWatch()) return h;
  const list = state.sessions.filter(inGf);
  if (!list.some(s => s.edited)) return h;
  const parts = h.split('<details class="card hist">');
  return parts.map((p, i) => { const s = i && list[i - 1]; return s && s.edited ? p.replace('</summary>', '<span class="se-tag">editada</span></summary>') : p; }).join('<details class="card hist">');
};
bootRender();
