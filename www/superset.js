/* ==========================================================================
   Superseries (15-oct-2026)
   - Rutinas → Editar ejercicio: "Superserie con el siguiente" (campo `ss:1` en el
     ejercicio del plan). Varios seguidos con `ss` forman un grupo (A1, A2, A3…).
   - En la sesión: al marcar una serie de A1 no hay descanso y pasas a A2; al marcar
     la de A2 (el último de la vuelta) descansas lo de A2 y vuelves a A1.
   - El borrador guarda los grupos por exId (`d.ssMap`): reordenar, cambiar por otro
     parecido o agregar ejercicios no rompe la pareja.
   - Franja `#sx-strip` con las parejas unidas; en el reloj, puntos unidos y aviso.
   ========================================================================== */
const SS_L = n => String.fromCharCode(65 + (n % 26));
/* Grupos de una lista de ejercicios del plan: [{l, n, size, first, last}] por índice */
function ssChain(list) {
  const out = []; let L = 0, k = 0;
  while (k < list.length) {
    let j = k; while (j < list.length - 1 && list[j].ss) j++;
    if (j > k) { const l = SS_L(L++); for (let x = k; x <= j; x++) out[x] = { l, n: x - k + 1, size: j - k + 1, first: k, last: j }; }
    k = j + 1;
  }
  return out;
}

/* ---------- Borrador: miembros del grupo de un ejercicio ---------- */
const ssOf = (d, e) => (d && d.ssMap && e && e.exId && d.ssMap[e.exId]) || null;
function ssMembers(d, i) {
  const e = d && d.exercises[i], l = ssOf(d, e); if (!l) return null;
  const m = []; d.exercises.forEach((x, k) => { if (ssOf(d, x) === l) m.push(k); });
  return m.length > 1 ? m : null;
}
function ssInfo(d, i) {
  const m = ssMembers(d, i); if (!m) return null;
  const pos = m.indexOf(i);
  return { l: ssOf(d, d.exercises[i]), m, pos, tag: ssOf(d, d.exercises[i]) + (pos + 1), lastOfRound: pos === m.length - 1 };
}

const _startSessionSs = startSession;
startSession = function (pid, did) {
  _startSessionSs(pid, did);
  const d = state.draft, fd = findDay(pid, did), day = fd && fd.d;
  if (!d || !day || d.planId !== pid || d.dayId !== did || d.ssMap) return;
  const ch = ssChain(day.exercises), map = {};
  day.exercises.forEach((e, k) => { if (ch[k] && e.id) map[e.id] = ch[k].l; });
  if (!Object.keys(map).length) return;
  d.ssMap = map; saveDraft(); render();
};

/* ---------- Marcar serie: A1 → A2 sin descanso; al cerrar la vuelta, descanso y a A1 ---------- */
let ssHold = null;
const _startRestSs = startRest;
startRest = function (sec) { if (ssHold) { ssHold.want = sec; return; } _startRestSs(sec); };

const _markSetSs = markSet;
markSet = function (i, j, v, k) {
  const d = state.draft, e = d && d.exercises[i], m = e && ssMembers(d, i);
  const main = e && e.log[j], s = main && (k == null ? main : (main.drops || [])[k]);
  const willDone = s ? (v == null ? !s.done : !!v) : false;
  if (!m || !s || s.done || !willDone) return _markSetSs(i, j, v, k);
  const hold = ssHold = { want: null };
  try { _markSetSs(i, j, v, k); } finally { ssHold = null; }
  const d2 = state.draft; if (!d2 || d2 !== d) return;
  const mm = main.drops || [];
  if (!s.done || mm.some(x => !x.done)) { if (hold.want != null) startRest(hold.want); return; }   // drop pendiente: como siempre
  const pend = x => !exComplete(d.exercises[x]), pos = m.indexOf(i);
  const later = m.slice(pos + 1).filter(pend)[0], first = m.filter(pend)[0];
  let to = null;
  if (later != null) { to = later; if (state.rest) { state.rest = null; tick(); } }        // mitad de la vuelta: sin descanso
  else if (first != null) { to = first; d.cur = to; startRest(e.rest); }                     // vuelta cerrada: descanso y al primero
  else {                                                                                   // grupo terminado: como un ejercicio normal
    for (let x = i + 1; x < d.exercises.length; x++) if (pend(x)) { to = x; break; }
    if (to == null && typeof nextPending === 'function') to = nextPending(d, i);
    if (to != null) d.cur = to;
    if (hold.want != null) startRest(hold.want);
  }
  if (to == null) return;
  d.cur = to; saveDraft(); render();
  if (document.getElementById('sx-pager')) setTimeout(() => { if (state.draft === d) pagerGo(to, true); }, 700);
};

/* Agregar en la sesión: nunca en medio de una pareja (va después del grupo) */
const _addToDraftSs = addToDraft;
addToDraft = function (names, at) {
  const d = state.draft, m = d && ssMembers(d, at);
  if (m && m.indexOf(at) < m.length - 1) { let x = at; while (x + 1 < d.exercises.length && m.indexOf(x + 1) >= 0) x++; at = x; }
  _addToDraftSs(names, at);
};

/* ---------- Teléfono: franja unida y aviso en cada página ---------- */
function ssDecorSession() {
  const d = state.draft; if (!d || !d.ssMap || isWatch()) return;
  const st = document.getElementById('sx-strip');
  if (st && !st.querySelector('.ss-pair')) {
    const ths = Array.prototype.slice.call(st.querySelectorAll('.sx-th'));
    ths.forEach((b, i) => { const f = ssInfo(d, i); if (f && !b.querySelector('.ss-b')) { b.insertAdjacentHTML('beforeend', `<span class="ss-b">${f.tag}</span>`); b.classList.add('ss-in'); } });
    let i = 0;
    while (i < ths.length) {
      const l = ssOf(d, d.exercises[i]); let j = i;
      while (l && j + 1 < ths.length && ssOf(d, d.exercises[j + 1]) === l) j++;
      if (j > i) {
        const w = document.createElement('span'); w.className = 'ss-pair'; w.setAttribute('role', 'group'); w.setAttribute('aria-label', 'Superserie ' + l);
        st.insertBefore(w, ths[i]);
        for (let x = i; x <= j; x++) { if (x > i) w.insertAdjacentHTML('beforeend', '<i class="ss-link" aria-hidden="true"></i>'); w.appendChild(ths[x]); }
      }
      i = j + 1;
    }
  }
  document.querySelectorAll('#sx-pager .sx-page').forEach(p => {
    const i = +p.dataset.i, f = ssInfo(d, i); if (!f || p.querySelector('.ss-ban')) return;
    const hero = p.querySelector('.sx-hero'); if (!hero) return;
    const e = d.exercises[i], nx = f.m[f.pos + 1], first = d.exercises[f.m[0]];
    const how = !f.lastOfRound ? `Al marcar una serie pasas a <b>${esc(d.exercises[nx].name)}</b> sin descanso.`
      : `Al marcar una serie descansas <b class="num">${clock(e.rest)}</b> y vuelves a <b>${esc(first.name)}</b>.`;
    hero.insertAdjacentHTML('afterend', `<div class="ss-ban"><span class="ss-tag">${ic('refresh-cw', 14)} Superserie ${f.tag}</span><span>${how}</span></div>`);
  });
}

/* ---------- Reloj: aviso bajo el nombre y puntos unidos ---------- */
const _vWatchSessionSs = vWatchSession;
vWatchSession = function () {
  const h = _vWatchSessionSs(), d = state.draft;
  if (!d || !d.ssMap || !isWatch()) return h;
  const i = Math.min(d.cur || 0, d.exercises.length - 1), f = ssInfo(d, i); if (!f) return h;
  const a = h.indexOf('<div class="w2-name">'); if (a < 0) return h;
  const b = h.indexOf('</div>', a); if (b < 0) return h;
  const nx = f.m[f.pos + 1], e = d.exercises[i];
  const line = `<div class="w2-ss">Superserie ${f.tag} · ${!f.lastOfRound ? 'sigue ' + esc(d.exercises[nx].name) + ' sin descanso' : 'luego descansas ' + clock(e.rest)}</div>`;
  return h.slice(0, b + 6) + line + h.slice(b + 6);
};
function ssDecorWatch() {
  const d = state.draft; if (!d || !d.ssMap || !isWatch()) return;
  const box = document.querySelector('.w2-dots'); if (!box || box.querySelector('.w2-ssd')) return;
  const dots = Array.prototype.slice.call(box.querySelectorAll('.w2-dot'));
  let i = 0;
  while (i < dots.length) {
    const l = ssOf(d, d.exercises[i]); let j = i;
    while (l && j + 1 < dots.length && ssOf(d, d.exercises[j + 1]) === l) j++;
    if (j > i) { const w = document.createElement('span'); w.className = 'w2-ssd'; box.insertBefore(w, dots[i]); for (let x = i; x <= j; x++) w.appendChild(dots[x]); }
    i = j + 1;
  }
}

/* ---------- Rutinas y vista previa: A1 / A2 ---------- */
function ssWrap(rows, ch, head) {
  let i = 0;
  while (i < rows.length) {
    const c = ch[i];
    if (c && c.first === i && rows[c.last]) {
      const w = document.createElement('div'); w.className = 'ss-box';
      w.innerHTML = `<div class="ss-h">${ic('refresh-cw', 13)} Superserie ${c.l}${head ? ' · ' + head : ''}</div>`;
      rows[i].parentNode.insertBefore(w, rows[i]);
      for (let x = c.first; x <= c.last; x++) w.appendChild(rows[x]);
      i = c.last + 1;
    } else i++;
  }
}
function ssDecorPlans() {
  document.querySelectorAll('.rt-body').forEach(body => {
    if (body.querySelector('.ss-box')) return;
    const btn = body.querySelector('.rt-exm[data-act="ex-edit"]'); if (!btn) return;
    const fd = findDay(btn.dataset.plan, btn.dataset.day), day = fd && fd.d; if (!day) return;
    const ch = ssChain(day.exercises); if (!ch.length) return;
    const rows = Array.prototype.slice.call(body.querySelectorAll('.rt-ex'));
    rows.forEach((r, k) => { const c = ch[k], b = r.querySelector('.rt-exm b'); if (c && b && !r.querySelector('.ss-b')) b.insertAdjacentHTML('afterbegin', `<span class="ss-b">${c.l}${c.n}</span>`); });
    ssWrap(rows, ch, 'sin descanso entre ellos');
  });
}
const _previewSs = previewSheet;
previewSheet = function (pid, did) {
  _previewSs(pid, did);
  const fd = findDay(pid, did), day = fd && fd.d; if (!day) return;
  const ch = ssChain(day.exercises); if (!ch.length) return;
  const rows = Array.prototype.slice.call(document.querySelectorAll('#sheet .pv-list .pv-row'));
  rows.forEach((r, k) => { const c = ch[k], b = r.querySelector('b'); if (c && b) b.insertAdjacentHTML('afterbegin', `<span class="ss-b">${c.l}${c.n}</span> `); });
  ssWrap(rows, ch, '');
};

const _renderSs = render;
render = function () { _renderSs(); try { ssDecorSession(); ssDecorWatch(); ssDecorPlans(); } catch (e) {} };

/* ---------- Editar ejercicio: casilla "Superserie con el siguiente" ---------- */
const _exSheetSs = exSheet;
exSheet = function (pid, did, k, preset) {
  _exSheetSs(pid, did, k, preset);
  if (k == null || k === '') return;
  const fd = findDay(pid, did), day = fd && fd.d, ex = day && day.exercises[+k]; if (!ex) return;
  const f = document.getElementById('f-ex'), drop = f && f.querySelector('#fx-drop'), lab = drop && drop.closest('label'); if (!lab) return;
  const nx = day.exercises[+k + 1], pv = day.exercises[+k - 1];
  const on = preset && preset.ss != null ? !!preset.ss : !!ex.ss;
  const prevTxt = pv && pv.ss ? `<div class="muted ss-prev">${ic('refresh-cw', 13)} Ya va en superserie con <b>${esc(pv.name)}</b> (el anterior).</div>` : '';
  lab.insertAdjacentHTML('afterend', nx ? `<label class="row ss-opt" style="gap:10px"><input type="checkbox" id="fx-ss" name="ss" ${on ? 'checked' : ''} style="width:20px;height:20px"><span><b>Superserie con el siguiente</b><br><span class="muted" style="font-size:12.5px">Con <b>${esc(nx.name)}</b>: haces una serie de cada uno sin descanso y descansas al terminar la pareja.</span></span></label>${prevTxt}`
    : prevTxt || `<div class="muted ss-prev">Para hacer una superserie, agrega otro ejercicio después de este.</div>`);
};
const _exvPresetSs = exvPreset;
exvPreset = function () { const p = _exvPresetSs(), t = document.getElementById('fx-ss'); if (p && t) p.ss = t.checked ? 1 : 0; return p; };
/* Guardar (después del guardado de index.html, que no conoce este campo) */
document.addEventListener('submit', ev => {
  const f = ev.target; if (!f || f.id !== 'f-ex' || f.dataset.k === '') return;
  const t = f.querySelector('#fx-ss'); if (!t) return;
  const fd = findDay(f.dataset.plan, f.dataset.day), e = fd && fd.d && fd.d.exercises[+f.dataset.k]; if (!e) return;
  if (!!e.ss === t.checked) return;
  if (t.checked) e.ss = 1; else delete e.ss;
  savePlans(); render();
  if (t.checked) toast('Superserie guardada.');
});
/* Subir un ejercicio: la superserie queda en su lugar; quitarlo: la pareja no se pega al siguiente */
window.addEventListener('click', ev => {
  const b = ev.target.closest && ev.target.closest('[data-act="ex-up"],[data-act="rt-del"],[data-act="ex-del"]'); if (!b) return;
  const fd = findDay(b.dataset.plan, b.dataset.day), day = fd && fd.d, k = +b.dataset.k; if (!day || !day.exercises[k]) return;
  const L = day.exercises, a = b.dataset.act;
  if (a === 'ex-up') { if (k < 1) return; const x = !!L[k - 1].ss, y = !!L[k].ss; if (x === y) return; if (y) L[k - 1].ss = 1; else delete L[k - 1].ss; if (x) L[k].ss = 1; else delete L[k].ss; return; }
  const sure = a === 'rt-del' ? state.rtDel === b.dataset.day + ':' + k : state.confirm === 'exdel';
  if (sure && k > 0 && L[k - 1].ss && !L[k].ss) delete L[k - 1].ss;
}, true);
render();
