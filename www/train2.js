/* ==========================================================================
   Ajustes después del primer entreno real (12-oct-2026)
   1. Al tocar un peso o unas reps se selecciona todo: lo que escribas reemplaza el valor.
   2. Lo que escribes en una serie se copia a las series siguientes que aún no hiciste
      (solo a las que tenían el mismo valor o estaban vacías).
   3. En la fila de ejercicios de arriba se ve el avance (anillo) y los terminados (✓ verde).
   4. "¿Máquina ocupada?": hacer ahora otro ejercicio de la rutina, cambiarlo por uno parecido
      o agregar otro ejercicio de la lista (solo para hoy).
   5. El coach ya no dice "sube" cuando la Preparación del día dice que hoy no se sube.
   6. Calentamiento explicado: series ligeras, cuántos kilos y qué discos poner en cada lado.
   7. Si el descanso termina y el pulso sigue alto, avisa y espera (máx. 75 s) a que baje.
   ========================================================================== */

/* ---------- 1 y 2: seleccionar al tocar y copiar a las series siguientes ---------- */
const SET_INPUT = 'input[data-f="w"],input[data-f="r"]';
document.addEventListener('focusin', ev => {
  const t = ev.target; if (!t.matches || !t.matches(SET_INPUT) || !state.draft) return;
  t._pv = t.value;
  const sel = () => { try { if (document.activeElement === t) t.select(); } catch (e) {} };
  setTimeout(sel, 0); setTimeout(sel, 150);
  const mu = e => { e.preventDefault(); t.removeEventListener('mouseup', mu); };
  t.addEventListener('mouseup', mu);
});
function followVal(cur, pv) { return cur == null || cur === '' || (pv != null && pv !== '' && +cur === +pv); }
function copyForward(e, i, j, f, pv, nv) {
  for (let x = j + 1; x < e.log.length; x++) {
    const s = e.log[x]; if (s.done || !followVal(s[f], pv)) continue;
    s[f] = nv;
    const inp = document.getElementById((f === 'w' ? 'w-' : 'r-') + i + '-' + x);
    if (inp && inp !== document.activeElement) inp.value = nv == null ? '' : nv;
  }
}
document.addEventListener('input', ev => {
  const t = ev.target; if (!t.matches || !t.matches(SET_INPUT) || t.dataset.k != null || !state.draft) return;
  const i = +t.dataset.ex, j = +t.dataset.set, f = t.dataset.f, e = state.draft.exercises[i]; if (!e) return;
  const pv = t._pv == null ? null : String(t._pv).replace(',', '.'), raw = t.value.replace(',', '.');
  const nv = raw === '' ? null : (isFinite(+raw) ? +raw : null);
  copyForward(e, i, j, f, pv, nv);
  t._pv = t.value; saveDraft();
});

/* ---------- 3: avance de cada ejercicio en la fila de arriba ---------- */
function stripRings() {
  const d = state.draft; if (!d || isWatch()) return;
  document.querySelectorAll('.sx-th').forEach((b, i) => {
    const e = d.exercises[i]; if (!e || b.querySelector('.th-ring')) return;
    const done = e.log.filter(stepDone).length, all = e.log.length, f = all ? done / all : 0, C = 2 * Math.PI * 29;
    if (f > 0 && f < 1) b.classList.add('half');
    b.insertAdjacentHTML('beforeend', `<svg class="th-ring" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="29" fill="none" stroke-width="4" stroke-linecap="round" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C * (1 - f)).toFixed(1)}" transform="rotate(-90 32 32)"/></svg>`);
    b.setAttribute('aria-label', `${e.name}: ${done} de ${all} series`);
  });
}

/* ---------- 4: máquina ocupada / agregar ejercicio ---------- */
function draftExFrom(name) {
  const d = state.draft, ex = newEx(name, d.kind);
  const sg = suggest(d.gymId, d.kind, ex), last = lastHere(name, d.gymId) || lastPerf(name, d.gymId, d.kind), ln = lastNote(name, d.gymId);
  let c = null; try { c = coachFor(ex, d.gymId, d.kind); } catch (e) {}
  const W = c && c.w != null ? c.w : sg.w;
  return { name, type: ex.type, target: ex.sets, repsMin: ex.repsMin, repsMax: ex.repsMax, rest: ex.rest, inc: increment(ex, W), exId: ex.id, dropLast: false, bar: barOf(ex), note: '', prevNote: ln, sugg: sg,
    lastDate: last ? (last.date || 'base') : null, refGym: last && last.ref ? gymName(last.gymId) + (last.base ? ' · tu récord' : '') : null,
    prev: last ? last.sets.map(s => ({ w: s.w, r: s.r, drops: [] })) : [], log: Array.from({ length: ex.sets }, () => ({ w: W, r: null, done: false, drops: [] })), coach: c, added: true };
}
function addToDraft(names, at) {
  const d = state.draft; if (!d || !names.length) return;
  const list = names.filter(n => !d.exercises.some(x => x.name === n)).map(draftExFrom);
  if (!list.length) { toast('Ese ejercicio ya está en tu entrenamiento.'); return; }
  d.exercises.splice.apply(d.exercises, [at + 1, 0].concat(list));
  d.cur = at + 1; d.lastAct = Date.now(); saveDraft();
}
/* Hacer ahora otro ejercicio de la rutina: se pone en el lugar del ocupado, que queda justo después */
function doNow(i, k) {
  const d = state.draft; if (!d || k === i) return null;
  const x = d.exercises.splice(k, 1)[0], at = k < i ? i - 1 : i;
  d.exercises.splice(at, 0, x); d.cur = at; d.lastAct = Date.now(); saveDraft();
  return at;
}
const nextPending = (d, i) => { for (let s = 1; s <= d.exercises.length; s++) { const k = (i + s) % d.exercises.length; if (!exComplete(d.exercises[k])) return k; } return null; };
function zoneTxt(name) { const x = libFind(name); return x && x.musc && x.musc[0] ? x.musc[0] : (TYPE_LBL && TYPE_LBL[typeOf(name)]) || ''; }

function busySheet(i) {
  const d = state.draft, e = d && d.exercises[i]; if (!e) return;
  const pend = d.exercises.map((x, k) => ({ x, k })).filter(o => o.k !== i && !exComplete(o.x));
  const sw = typeof swapCandidates === 'function' ? swapCandidates(e).slice(0, 4) : [];
  openSheet(`<div class="row"><h2 class="grow">¿Máquina ocupada?</h2><button class="icon-btn" data-act="sheet-close" aria-label="Cerrar">${ic('x', 18)}</button></div>
    <div class="muted" style="font-size:13px">Mientras se libera <b>${esc(e.name)}</b>, elige una opción:</div>
    ${pend.length ? `<div class="label">1 · Haz ahora otro de tu rutina</div>
      <div class="sw-list">${pend.map(o => `<button class="sw-row" data-act="busy-now" data-ex="${i}" data-k="${o.k}"><span class="pv-th">${thumb(o.x.name)}</span>
        <span class="grow" style="min-width:0"><b>${esc(o.x.name)}</b><small class="muted">${o.x.log.filter(stepDone).length}/${o.x.log.length} series · ${esc(zoneTxt(o.x.name))}</small></span>${ic('chevron-right', 16)}</button>`).join('')}</div>
      <div class="muted" style="font-size:12px">Al terminarlo vuelves a ${esc(e.name)}.</div>` : ''}
    <div class="label">${pend.length ? '2' : '1'} · Cámbialo por uno parecido</div>
    ${sw.length ? `<div class="sw-list">${sw.map(c => `<button class="sw-row" data-act="swap-do" data-ex="${i}" data-name="${esc(c.n)}"><span class="pv-th">${thumb(c.n)}</span>
      <span class="grow" style="min-width:0"><b>${esc(c.n)}</b><small class="muted">${c.last ? 'Ya lo hiciste' : c.done ? 'Lo hiciste en otro gimnasio' : 'Nuevo para ti'}</small></span>
      <span class="sw-w"><b class="num">${c.cv.how === 'body' ? 'Corporal' : '~' + fmtKg(c.cv.w) + ' kg'}</b></span></button>`).join('')}</div>` : '<div class="muted">No encontré otro parecido.</div>'}
    <button class="btn block" data-act="swap" data-ex="${i}">Ver más parecidos</button>
    <div class="label">${pend.length ? '3' : '2'} · Agrega otro ejercicio (solo hoy)</div>
    <button class="btn block" data-act="add-ex" data-ex="${i}">${ic('plus', 16)} Elegir de la lista</button>`);
}

/* Selector de ejercicios en modo "entrenamiento de hoy" */
function pkOpenDraft(i) {
  const d = state.draft; if (!d) return;
  state.pk = { pid: d.planId, did: d.dayId, sel: [], q: '', eq: 'all', mu: 'all', custom: [], draft: true, at: i };
  pkView();
}
const _pkListT2 = pkList;
pkList = function () {
  const P = state.pk; if (!P || !P.draft) return _pkListT2();
  const d = state.draft; if (!d) return '';
  const have = new Set(d.exercises.map(e => e.name)), q = normName(P.q || ''), e = d.exercises[P.at];
  const fil = x => (P.eq === 'all' || equipOf(x) === P.eq) && (P.mu === 'all' || pkMusc(x).indexOf(P.mu) >= 0) && (!q || normName(x.name + ' ' + (x.musc || []).join(' ')).includes(q));
  const all = LIB.slice().filter(fil).sort((a, b) => a.name.localeCompare(b.name));
  const plain = !q && P.eq === 'all' && P.mu === 'all';
  const sim = plain && e && typeof swapCandidates === 'function' ? swapCandidates(e).map(c => LIB.find(x => x.name === c.n)).filter(Boolean).slice(0, 6) : [];
  const rec = plain ? pkRecent().map(n => LIB.find(x => x.name === n)).filter(x => x && sim.indexOf(x) < 0) : [];
  const custom = (P.custom || []).map(n => ({ name: n, type: typeOf(n), musc: [], custom: true }));
  return (`${custom.length ? `<div class="pk-sec">Creados por ti</div>${custom.map(x => pkRow(x, have, P.sel)).join('')}` : ''}
    ${sim.length ? `<div class="pk-sec">Parecidos a ${esc(e.name)}</div>${sim.map(x => pkRow(x, have, P.sel)).join('')}` : ''}
    ${rec.length ? `<div class="pk-sec">Ejercicios recientes</div>${rec.map(x => pkRow(x, have, P.sel)).join('')}` : ''}
    ${plain ? '<div class="pk-sec">Todos los ejercicios</div>' : ''}${all.map(x => pkRow(x, have, P.sel)).join('') || '<div class="muted" style="padding:16px">Sin resultados. Toca "Crear" para agregar uno propio.</div>'}`)
    .replace(/Ya está en la rutina/g, 'Ya está en tu entrenamiento');
};
const _pkViewT2 = pkView;
pkView = function () {
  _pkViewT2();
  const P = state.pk; if (!P || !P.draft || P.info) return;
  const d = state.draft, e = d && d.exercises[P.at];
  const f = document.querySelector('#sheet .pk-for'); if (f) f.innerHTML = `Para tu entrenamiento de hoy${e ? ` · va después de <b>${esc(e.name)}</b>` : ''}. Tu rutina no cambia.`;
};
/* "Agregar" en modo entrenamiento: va antes que el manejador del selector (que lo agregaría a la rutina) */
window.addEventListener('click', ev => {
  const b = ev.target.closest && ev.target.closest('[data-act="pk-add"]'); if (!b) return;
  const P = state.pk; if (!P || !P.draft) return;
  ev.stopPropagation(); ev.preventDefault();
  const n = P.sel.length; if (!n) return;
  addToDraft(P.sel.slice(), P.at);
  state.pk = null; closeSheet(); render();
  if (typeof pagerGo === 'function' && document.getElementById('sx-pager')) setTimeout(() => pagerGo(state.draft.cur, true), 60);
  toast(`${n} ${n === 1 ? 'ejercicio agregado' : 'ejercicios agregados'} a tu entrenamiento de hoy`);
}, true);

function decorateBusy() {
  const d = state.draft; if (!d || isWatch()) return;
  const cards = document.querySelectorAll('#app .card.ex');
  d.exercises.forEach((e, i) => {
    const c = cards[i]; if (!c || c.dataset.busy) return;
    c.dataset.busy = '1';
    const sw = c.querySelector('.sw-btn');
    if (sw) { sw.dataset.act = 'busy'; sw.setAttribute('aria-label', 'Máquina ocupada o cambiar ejercicio'); sw.innerHTML = `${ic('refresh-cw', 15)}<span class="sw-lbl">Ocupada</span>`; }
    const row = c.querySelector('[data-act="add-set"]'); const r = row && row.parentElement;
    if (r) r.insertAdjacentHTML('beforeend', `<button class="btn small" data-act="add-ex" data-ex="${i}">${ic('plus', 14)} Ejercicio</button>`);
    if (e.added && !c.querySelector('.add-tag')) { const h = c.querySelector('h3'); if (h) h.insertAdjacentHTML('beforeend', ' <span class="sw-tag add-tag">agregado hoy</span>'); }
  });
}

document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-act="busy"],[data-act="busy-now"],[data-act="add-ex"]'); if (!b) return;
  ev.stopPropagation(); ev.preventDefault();
  const a = b.dataset.act, i = +b.dataset.ex;
  if (a === 'busy') busySheet(i);
  if (a === 'add-ex') { closeSheet(); pkOpenDraft(i); }
  if (a === 'busy-now') {
    const d = state.draft, busyName = d.exercises[i].name, at = doNow(i, +b.dataset.k); if (at == null) return;
    closeSheet(); render();
    if (typeof pagerGo === 'function' && document.getElementById('sx-pager')) setTimeout(() => pagerGo(at, true), 60);
    toast(`Haz ${d.exercises[at].name} ahora; luego vuelves a ${busyName}.`);
  }
}, true);

/* ---------- 5: coach coherente con la Preparación del día ---------- */
const _coachBoxT2 = coachBox;
coachBox = function (e, i) {
  const d = state.draft, c = e.coach;
  if (d && c && c.mode !== 'pain' && c.mode !== 'first' && ((d.readied === 'mid' && c.mode === 'up') || d.readied === 'low')) {
    const s = e.log.find(x => !x.done) || e.log[0], w = +(s && s.w) || 0;
    const was = String(c.head || '').replace(/<[^>]+>/g, '');
    return `<div class="coach hold"><div class="coach-h"><span class="coach-ic">${ic('battery', 18)}</span><span>${d.readied === 'low' ? `<b>Hoy suave: ${fmtKg(w)} kg</b>, dejando 2 reps de sobra.` : `<b>Hoy repite ${fmtKg(w)} kg</b> y busca ${reps(e)} reps.`}</span></div>
      <ul><li>Lo que proponía el coach (“${esc(was)}”) queda para tu próxima sesión: hoy no llegas al 100 %.</li></ul></div>`;
  }
  return _coachBoxT2(e, i);
};

/* ---------- 6: calentamiento explicado ---------- */
warmBox = function (e, i, d) {
  const W = warmupFor(e, i, d); if (!W || !W.sets.length) return '';
  e.wu = e.wu || [];
  const n = W.sets.length, allDone = W.sets.every((s, k) => e.wu[k]);
  const head = W.warmBefore ? 'Calentamiento · 1 serie de aproximación' : `Calentamiento · ${n} ${n === 1 ? 'serie suave' : 'series suaves'}`;
  const open = e.wuo != null ? e.wuo : !(allDone || e.log.some(s => s.done));
  return `<details class="warm ${allDone ? 'done' : ''}" data-ex="${i}" ${open ? 'open' : ''}>
    <summary>${ic('flame', 15)} <span class="grow">${head}</span>${allDone ? `<span class="chip ok">${ic('check', 12)} Listo</span>` : ''}${ic('chevron-down', 15)}</summary>
    <div class="wu-help">${W.warmBefore ? 'Ya calentaste este músculo en un ejercicio anterior: basta una serie ligera antes de las fuertes.' : 'Antes de tus series fuertes, haz estas series <b>ligeras</b> para preparar músculo y articulaciones. <b>No cuentan</b> como series. Toca cada una al terminarla.'}</div>
    <div class="wu-list">${W.sets.map((s, k) => `<button type="button" class="wu wu2 ${e.wu[k] ? 'on' : ''}" data-act="wu" data-ex="${i}" data-k="${k}" aria-pressed="${!!e.wu[k]}">
      <span class="wu-k num">${k + 1}</span>
      <span class="wu-main"><b>${s.bar ? 'Solo la barra' : `<span class="num">${fmtKg(s.w)}</span> kg`} × ${s.r} reps</b>
        <small>${s.bar ? `${fmtKg(e.bar)} kg, sin discos` : W.plates ? `Pon en <b>cada lado</b>: ${platesTxt(s.w)}` : `${Math.round((s.pc || 0) * 100)} % del peso de hoy`}</small></span>
      <span class="wu-c">${e.wu[k] ? ic('check', 14) : ''}</span></button>`).join('')}</div>
    <div class="muted wu-tip">Descansa 1 min entre estas series. Después empiezan tus series de verdad.</div>
  </details>
  ${W.plates ? `<div class="plates-live" data-ex="${i}">${ic('layers', 14)} <span>Tus series de hoy · en cada lado:</span> <span class="pl-chips">${plateChips(W.w)}</span></div>` : ''}`;
};

/* ---------- 7: el pulso sigue alto al terminar el descanso ---------- */
const hrNow = () => (typeof hr !== 'undefined' && hr.on && hr.bpm && Date.now() - hr.at < 20000) ? hr.bpm : 0;
const hrHigh = () => { const b = hrNow(); return !!b && typeof hrReady === 'function' && b > hrReady(); };
const HOLD_MAX = 75000;
function restHold(r, now) {   // true mientras haya que esperar al pulso (o mostrar "listo")
  if (!r || r.end > now) return false;
  if (!r.hold && !r.holdDone && hrHigh() && now - r.end < HOLD_MAX) r.hold = true;
  if (r.hold && (!hrHigh() || now - r.end >= HOLD_MAX)) {
    r.hold = false; r.holdDone = now;
    try { navigator.vibrate && navigator.vibrate([120, 70, 120]); } catch (e) {}
  }
  return !!(r.hold || (r.holdDone && now - r.holdDone < 3000));
}
const _tickT2 = tick;
tick = function () {
  const r = state.rest, now = Date.now(), el = $('#rest');
  if (r && !isWatch() && restHold(r, now)) {
    if (!r.rang) { r.rang = true; beep(); }
    el.hidden = false;
    if (!el.querySelector('.hrhold')) el.innerHTML = `<div class="rest-in hrhold"><span class="hh-ic">❤</span><div class="grow"><div class="label" id="hh-l"></div><div id="hh-v"></div><small class="muted" id="hh-s"></small></div><button class="btn small" data-act="rest-skip">Seguir</button></div>`;
    const b = hrNow(), ok = !r.hold;
    el.querySelector('.hrhold').classList.toggle('ok', ok);
    $('#hh-l').textContent = ok ? '¡Pulso recuperado!' : 'Descanso terminado, pero tu pulso sigue alto';
    $('#hh-v').innerHTML = ok ? `<b class="num">${b || ''}</b> lpm · ya puedes seguir` : `<b class="num">${b}</b> lpm → espera a <b class="num">${hrReady()}</b>`;
    $('#hh-s').textContent = ok ? '' : 'Respira hondo por la nariz. Como máximo 1 minuto más; si no baja, sigue igual.';
    return;
  }
  if (el && el.querySelector('.hrhold') && !(r && restHold(r, now))) el.innerHTML = '';
  _tickT2();
};

/* ---------- Decoración tras cada dibujo ---------- */
const _renderT2 = render;
render = function () { _renderT2(); stripRings(); decorateBusy(); };

/* En un reloj con la vista completa: atajo para volver al modo reloj */
const _vTrainT2 = vTrain;
vTrain = function () {
  const h = _vTrainT2();
  if (state.draft || isWatch() || state.settings.watch !== false || typeof watchGeom !== 'function' || !watchGeom()) return h;
  return `<button class="card w2-back-watch" data-act="watch">⌚ <b>Usar el modo reloj</b><small class="muted">Botones grandes, una serie por pantalla</small></button>` + h;
};
bootRender();
