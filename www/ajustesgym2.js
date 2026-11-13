/* ==========================================================================
   Ajustes del gimnasio 2 (rama ajustes-gym-2). Solo el teléfono: el reloj no cambia (`isWatch()` en cada envoltura).
   1. Sesión encima del bloqueo: con la sesión en pantalla, la app se ve sin pedir el patrón (como un cronómetro). Cualquier
      otra parte (Mis finanzas, Perfil, Hoy…) o terminar la sesión: Android vuelve a pedir el desbloqueo (`g2Lock*`).
   2. Resumen al terminar: sale al instante (la racha espera a que lo cierres), con tus ejercicios en el orden real y la
      última vez de cada uno en ese gimnasio, más el análisis (ajustesgym.js).
   3. Indicación junto a la serie siguiente, con su razón y Aplicar; se queda hasta la próxima serie. Sin "Ahora conviene"
      flotando encima del tiempo y de Terminar.
   4. Al cerrar un ejercicio (última serie + RIR) pasa solo al siguiente pendiente, o al que elegiste con "Ir". Arriba de cada
      ejercicio sin empezar: la recomendación (peso, reps y RIR por serie, con la razón); los campos ya la traen.
   5. Reemplazar un ejercicio queda en la rutina, en el mismo lugar (como los agregados a mano). Reloj y temporales: solo hoy.
   6. "Superserie con…" en la tarjeta del ejercicio.
   7. Mancuernas de 2,5 en 2,5 (o lo que muestre tu historial en ese gimnasio); con datos del coach, su rango manda.
   8. Crear entreno para completar: por objetivo, un ejercicio por músculo, máx. 6 series por músculo, grandes primero,
      peso de tu última vez (la de cierre si bajaste) y una razón por ejercicio.
   9. Mapa del cuerpo: otro color para "Mucho", textos más grandes y el nombre al tocar.
   10. De viaje: peso corporal, bandas o tus mancuernas de casa.
   ========================================================================== */

/* ---------- 1. Sesión encima del bloqueo ---------- */
const g2HA = () => { const C = window.Capacitor, H = C && C.Plugins && C.Plugins.HabitAlarm; return H && typeof H.sessionLock === 'function' ? H : null; };
let g2Lock = false;
/* Solo la pantalla de la sesión en curso. Mis finanzas nunca, aunque algo la abriera encima */
function g2LockWant() {
  if (isWatch() || !state.draft || typeof sxOpenNow !== 'function' || !sxOpenNow()) return false;
  if (document.querySelector('#sx.sx-out')) return false;   /* minimizando: la sesión ya se va, aunque Hoy aún no se dibuje */
  return !document.querySelector('.fin-sheet');
}
const g2Uncover = () => document.documentElement.classList.remove('g2-cover');
function g2LockAsk(on) {
  const H = g2HA(); if (!H) return;
  Promise.resolve(H.sessionLock({ on })).then(r => { if (on || !(r && r.locked)) g2Uncover(); }, g2Uncover);
}
function g2LockSync() {
  if (!g2HA()) return;
  const want = g2LockWant(); if (want === g2Lock) return;
  g2Lock = want;
  /* Al salir de la sesión, nada se ve hasta que Android confirme que no está bloqueado (o lo desbloquees) */
  if (!want) document.documentElement.classList.add('g2-cover');
  g2LockAsk(want);
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible' || !g2HA()) return;
  if (document.documentElement.classList.contains('g2-cover')) g2LockAsk(false);
  g2LockSync();
});
/* Minimizar la sesión la desliza antes de dibujar Hoy: se tapa al instante, sin esperar */
window.addEventListener('click', ev => {
  if (!g2Lock || !(ev.target.closest && ev.target.closest('[data-act="sx-min"]'))) return;
  g2Lock = false; document.documentElement.classList.add('g2-cover'); g2LockAsk(false);
}, true);
document.addEventListener('resume', () => { if (g2HA() && document.documentElement.classList.contains('g2-cover')) g2LockAsk(false); });
setInterval(g2LockSync, 700);

/* ---------- 2. Resumen al terminar ---------- */
let g2FsAt = 0, g2FsShown = false, g2Cel = null;
const _celebrateG2 = celebrateStreak;
celebrateStreak = function () {
  if (!isWatch() && g2FsAt && Date.now() - g2FsAt < 120000) { g2Cel = Array.prototype.slice.call(arguments); return; }   /* después del resumen */
  return _celebrateG2.apply(this, arguments);
};
function g2CelGo() { const a = g2Cel; g2Cel = null; g2FsAt = 0; g2FsShown = false; if (a) _celebrateG2.apply(null, a); }
const _finishG2 = finishSession;
finishSession = function () {
  const d = state.draft, id = d && d.id;
  if (d && !isWatch()) { g2FsAt = Date.now(); g2FsShown = false; }
  const r = _finishG2.apply(this, arguments);
  if (!(id && !state.draft && state.sessions.some(x => x.id === id))) g2FsAt = 0;   /* no se guardó (pregunta la duración o se descartó) */
  return r;
};
const _fsShowG2 = fsShow;
fsShow = function () { const r = _fsShowG2.apply(this, arguments); if (fsOpen()) g2FsShown = true; return r; };
window.addEventListener('click', ev => { if (g2Cel && ev.target.closest && ev.target.closest('[data-act="fs-close"]')) setTimeout(g2CelGo, 0); }, true);
setInterval(() => { if (g2Cel && ((g2FsShown && !fsOpen()) || (!g2FsShown && Date.now() - g2FsAt > 4000))) g2CelGo(); }, 400);
/* La última vez de ese ejercicio en ese gimnasio, antes de esta sesión (cualquier día de la rutina) */
/* Mejoras de la sesión: primero la última del MISMO tipo de día (Pesado con Pesado, Bombeo con Bombeo); si no hay ninguna,
   la última que haya, con su tipo (`other`) para decirlo */
function g2Prev(s, name) {
  const g = sGym(s), kind = sKind(s); let same = null, any = null;
  state.sessions.forEach(x => {
    if (x.id === s.id || x.approx || x.date >= s.date || sGym(x) !== g) return;
    const e = exIn(x, name); if (!e || !e.sets.length) return;
    const k = sKind(x), o = { date: x.date, sets: e.sets, kind: k };
    if (k === kind && (!same || x.date > same.date)) same = o;
    if (!any || x.date > any.date) any = o;
  });
  return same || (any ? Object.assign(any, { other: any.kind !== kind ? any.kind : '' }) : null);
}
const g2SetTxt = x => (+x.w ? fmtKg(+x.w) + '×' + x.r : x.r + ' reps') + (x.rir != null ? ' @' + x.rir : '');
function g2ExList(s) {
  const ICO = { up: '⬆', down: '⬇', same: '＝', new: '✦' };
  return `<div class="fs-sec">${ic('dumbbell', 15)} Tus ejercicios, en el orden en que los hiciste</div><div class="g2-exl">` + s.exercises.map((e, n) => {
    const p = g2Prev(s, e.name), now = fsBest(e.sets), bef = p && fsBest(p.sets);
    const t = !p ? 'new' : now.v > bef.v + 0.05 ? 'up' : now.v < bef.v - 0.05 ? 'down' : 'same';
    return `<div class="g2-ex ${t}"><div class="g2-exh"><span class="g2-n num">${n + 1}</span><b class="grow">${esc(e.name)}</b><span class="fs-t">${ICO[t]}</span></div>
      <div class="g2-l"><span class="muted">Hoy</span> <span class="num">${e.sets.map(g2SetTxt).join(' · ')}</span></div>
      <div class="g2-l">${p ? `<span class="muted">La última vez (${fmtDate(p.date, true)})</span> <span class="num">${p.sets.map(g2SetTxt).join(' · ')}</span>` : '<span class="muted">Primera vez en este gimnasio</span>'}</div></div>`;
  }).join('') + '</div>';
}
const _fsHtmlG2 = fsHtml;
fsHtml = function (s) {
  const h = _fsHtmlG2.apply(this, arguments); if (isWatch()) return h;
  const k = h.indexOf('Frente a la última vez'), a = h.lastIndexOf('<div class="fs-sec">', k), b = h.indexOf('<div class="fs-sec">', k);
  return k < 0 || a < 0 || b < 0 ? h : h.slice(0, a) + g2ExList(s) + h.slice(b);
};

/* ---------- 3. Indicación serie por serie, junto a la serie siguiente ---------- */
const g2Rng = rx => rx.rMin + '-' + rx.rMax;
agTip = function (d, i) {
  const e = d && d.exercises[i]; if (!e) return null;
  let j = -1; e.log.forEach((s, k) => { if (s.done) j = k; });
  if (j < 0) return null;
  const s = e.log[j], r = +s.r || 0, rir = s.rir != null ? +s.rir : null, w = +s.w || 0, load = w > 0, rx = agRxOf(d, e), name = e.name;
  const did = 'Hiciste ' + r + (rir != null ? ' con RIR ' + rir : ''), left = e.log.filter(x => !x.done), next = left[0];
  if (!next) {
    const L = agLive(d), x = L && L.exercises.find(y => y.name === name); if (!x) return null;
    const c = agAfter(L, agPe(L, x)), nw = +c.w || 0, g = c.goal && c.goal[0];
    const why = nw > w ? 'llegaste al tope del rango' : nw && nw < w ? 'te costó más de la cuenta' : 'suma repeticiones con el mismo peso';
    return { t: 'Ejercicio terminado: ' + (nw ? (nw === w ? 'la próxima vez repite ' + agKg(nw) : 'la próxima vez empieza con ' + agKg(nw)) + (g ? ' × ' + g : '') : 'la próxima vez busca ' + g + (rx.sec ? ' s' : ' reps')) + ' (' + why + ')', k: 'end' };
  }
  const quick = !!agFlags(d).get(s), tired = quick || !!((typeof ssOf === 'function' && ssOf(d, e)) || agSsDone(d).indexOf(name) >= 0);
  if (r > rx.rMax && (rir == null || rir >= 2)) {
    if (!load) return { t: did + ', más que tu rango ' + g2Rng(rx) + ': vas sobrado, sigue con esa técnica', k: 'ok' };
    /* "Sube" siempre sube: el siguiente escalón; en tu peso máximo, mantén y suma reps */
    const cap = pgMaxOf(name, d.gymId || 'rokaz'), W = pgNextUp(name, w);
    if (cap > 0 && W > cap + 0.01) return { t: did + ': mantén ' + agKg(w) + ', es tu peso máximo aquí; suma reps o baja más lento', k: 'ok' };
    return { t: did + ': sube a ' + agKg(W) + ' en la próxima (pasaste tu rango ' + g2Rng(rx) + ')', W, k: 'up' };
  }
  if (!tired) {
    if (r > 0 && (r < rx.rMin || (j === 0 && rir === 0 && r < rx.rMax))) {
      if (!load) return { t: 'Muy duro (' + r + ' reps, tu rango es ' + g2Rng(rx) + '): descansa un poco más', k: 'down' };
      const W = Math.max(0, Math.min(w - pgInc(name, w), pgRound(name, w * (1 - 0.04 * Math.max(1, rx.rMin - r)), true)));
      return { t: 'Muy pesado (' + r + ' reps' + (rir === 0 ? ', RIR 0' : '') + ', tu rango es ' + g2Rng(rx) + '): baja a ' + agKg(W) + ' en la próxima', W, k: 'down' };
    }
    const p = j > 0 ? +e.log[j - 1].r || 0 : 0;
    if (p && p - r >= Math.max(4, Math.ceil(p * 0.3))) return { t: 'Cayeron de ' + p + ' a ' + r + ' reps: descansa 30 s más antes de la siguiente' + (load ? ' y mantén ' + agKg(w) : ''), k: 'rest' };
  }
  if (quick) return { t: 'Sin descanso completo (' + r + ' reps): ' + (load ? 'mantén ' + agKg(w) : 'sigue igual') + ', no cuenta en tu contra', k: 'ok' };
  if (left.length === 1 && e.log.length > 1 && pgTypeOf(name) === 'comp') return { t: did + '. Última serie: deja 1 repetición en reserva' + (load ? ' con ' + agKg(w) : ''), k: 'ok' };
  return { t: 'Bien: ' + (load ? 'mantén ' + agKg(w) : 'sigue así') + ' — ' + did.charAt(0).toLowerCase() + did.slice(1) + ', dentro de tu rango ' + g2Rng(rx), k: 'ok' };
};
/* Recomendación de un ejercicio que aún no empiezas: lo que traen los campos, serie por serie, con la razón */
function g2RecHtml(d, e) {
  const c = e.coach || {}, rirT = (e.rirT && e.rirT.length ? e.rirT : c.rirT) || [], bw = !!(c.bw || (typeof pgIsBw === 'function' && pgIsBw(e.name)));
  const rows = e.log.map((s, j) => {
    const w = s.w !== '' && s.w != null ? +s.w : null, r = +s.r || pgGoalReps(e, j), rr = rirT[j];
    return `<span class="g2-rs"><b class="num">${w == null ? '¿kg?' : bw && !w ? 'p. corporal' : fmtKg(w)}×${r}</b>${rr != null ? `<small>@${rr}</small>` : ''}</span>`;
  }).join('');
  const why = String(e.g2Why || c.why || c.head || '').replace(/<[^>]+>/g, '').trim();
  const noW = e.log.some(s => s.w === '' || s.w == null) && !bw;
  const open = !!(state.g2Open && state.g2Open[e.exId || e.name]);
  return `<div class="g2-rec ${open ? 'g2-open' : ''}" role="button" tabindex="0" data-g2="rec" data-k="${esc(e.exId || e.name)}" aria-expanded="${open}" aria-label="Recomendación para hoy"><div class="g2-rss"><span class="g2-rh">${ic('target', 14)} Hoy</span>${rows}</div>
    <div class="g2-rw">${esc(noW ? 'Escribe el peso de la 1.ª serie: aquí aún no hay una marca tuya. ' + why : why || 'Los campos ya lo traen; cámbialo si quieres.')}</div></div>`;
}
function g2TipCard(d, pg) {
  const card = pg && pg.querySelector('.card.ex'), i = pg ? +pg.dataset.i : -1, e = d.exercises[i]; if (!card || !e) return;
  card.querySelectorAll('.ag-tip,.g2-rec').forEach(n => n.remove());
  const started = e.log.some(x => x.done), T = started ? agTip(d, i) : null;
  const rec = !started && !(typeof ssInfo === 'function' && ssInfo(d, i) && e.log.some(x => x.done)) ? g2RecHtml(d, e) : '';
  card.querySelectorAll('.coach,.su-coach').forEach(n => n.classList.toggle('ag-hide', !!(T || rec)));
  if (rec) { const at = card.querySelector('.su-pills'); if (at) at.insertAdjacentHTML('afterend', rec); else card.insertAdjacentHTML('afterbegin', rec); return; }
  if (!T) return;
  const nj = e.log.findIndex(x => !x.done), next = e.log[nj];
  const btn = T.W != null && next && +next.w !== T.W ? `<button type="button" class="btn small" data-ag="apply" data-i="${i}" data-w="${T.W}">Aplicar</button>` : '';
  const h = `<div class="ag-tip g2-tip ${T.k}"><span class="grow">${esc(T.t)}</span>${btn}</div>`;
  const inp = nj >= 0 && card.querySelector('#w-' + i + '-' + nj), cell = inp && inp.previousElementSibling && inp.previousElementSibling.previousElementSibling;
  if (cell && cell.classList.contains('n')) cell.insertAdjacentHTML('beforebegin', h);
  else { const sets = card.querySelector('.sets'); if (sets) sets.insertAdjacentHTML('afterend', h); else card.insertAdjacentHTML('afterbegin', h); }
}
agTipPut = function () {
  const d = state.draft; if (!d || isWatch()) return;
  document.querySelectorAll('#sx-pager > .sx-page').forEach(pg => g2TipCard(d, pg));
};
/* rir.js detiene el toque del RIR: la indicación se actualiza aquí (antes se quedaba con lo de antes del RIR) */
window.addEventListener('click', ev => { if (!isWatch() && state.draft && ev.target.closest && ev.target.closest('[data-act="rir"]')) setTimeout(() => { agTipPut(); if (typeof rfAt !== 'undefined' && rfAt) rfArm(); }, 30); }, true);
/* Se queda visible hasta la serie siguiente: si algo redibuja la tarjeta sin ella, vuelve */
setInterval(() => {
  const d = state.draft; if (!d || isWatch() || !document.getElementById('sx-pager')) return;
  const pg = document.querySelector('#sx-pager > .sx-page[data-i="' + (d.cur || 0) + '"]');
  if (pg && !pg.querySelector('.ag-tip,.g2-rec')) g2TipCard(d, pg);
}, 600);
/* "Ahora conviene…" ya va dentro de la tarjeta: en la sesión no flota encima del tiempo ni de Terminar */
const _toastG2 = toast;
toast = function (m) { if (!isWatch() && state.draft && /^Ahora conviene/.test(String(m))) return; return _toastG2.apply(this, arguments); };

/* ---------- 4. Al cerrar un ejercicio, al siguiente ---------- */
function g2NextOf(d, i) {
  const open = k => d.exercises[k] && !exComplete(d.exercises[k]);
  if (d.agGo != null && d.agGo !== i && open(d.agGo)) return d.agGo;
  for (let k = i + 1; k < d.exercises.length; k++) if (open(k)) return k;
  for (let k = 0; k < i; k++) if (open(k)) return k;
  return null;
}
function g2GoTo(d, to) {
  if (state.draft !== d || !d.exercises[to]) return;
  delete d.agGo; d.cur = to; saveDraft(); render(); pagerGo(to, true);
}
const _markSetG2 = markSet;
markSet = function (i, j, v, k) {
  const d = state.draft, e = d && d.exercises[i], was = !!(e && exComplete(e));
  const r = _markSetG2.apply(this, arguments);
  const D = state.draft, E = D && D.exercises[i];
  if (g2Pend && g2Pend.i === i && g2Pend.j === j && E && !(E.log[j] || {}).done) g2Pend = null;   /* la desmarcaste */
  if (!D || D !== d || isWatch() || k != null || !E || was || !exComplete(E) || !document.getElementById('sx-pager')) return r;
  if (typeof ssInfo === 'function' && ssInfo(D, i)) return r;   /* superserie: superset.js ya sabe a dónde ir */
  const to = g2NextOf(D, i); if (to == null) return r;
  const s = E.log[j];
  /* Espera tu RIR con su propio aviso: el de session.js se perdía cuando un redibujo movía la página un instante */
  const P = g2Pend = { d: D, i, j, to };
  /* session.js también programa su salto al de al lado: si el destino es otro, ese salto no se hace */
  if (to !== i + 1) { const H = g2Hold = { skip: i + 1, to }; setTimeout(() => { if (g2Hold === H) g2Hold = null; }, 1500); }
  if (s && s.rir == null) sxWait = null;
  else setTimeout(() => { if (g2Pend !== P) return; g2Pend = null; if (!P.moved) g2GoTo(D, to); }, 700);   /* si ya te moviste (p. ej. con "Ir"), no te saca de ahí */
  return r;
};
let g2Pend = null, g2Quiet = 0;
const _setCurG2 = setCur;
setCur = function (k) { if (g2Pend && k !== g2Pend.i && !g2Quiet) g2Pend.moved = true; return _setCurG2.apply(this, arguments); };
/* "Ir": durante un momento nada te saca del ejercicio que elegiste (session.js también programa su salto) */
let g2Hold = null;
const _pagerGoG2 = pagerGo;
pagerGo = function (i) { if (g2Hold && i !== g2Hold.to && (g2Hold.skip == null || i === g2Hold.skip)) return; return _pagerGoG2.apply(this, arguments); };
window.addEventListener('click', ev => {
  const b = ev.target.closest && ev.target.closest('[data-act="rir"]'), P = g2Pend; if (!b || !P || isWatch()) return;
  if (+b.dataset.ex !== P.i || +b.dataset.set !== P.j) return;
  setTimeout(() => { const s = P.d.exercises[P.i] && P.d.exercises[P.i].log[P.j]; if (g2Pend !== P) return; g2Pend = null; if (s && s.done && s.rir != null && !P.moved) g2GoTo(P.d, P.to); }, 260);
}, true);
/* "Ir" en la sugerencia: si aún no terminas el ejercicio, lo deja elegido para cuando termines */
agNextHtml = function (d) {
  const cur = d.exercises[Math.min(d.cur || 0, d.exercises.length - 1)]; if (!cur || !cur.log.some(s => s.done)) return '';
  const P = agPick(d); if (!P || d.agNo === P.name) return '';
  const on = d.agGo === P.i;
  return `<div class="ag-next" id="ag-next"><div class="grow"><b>Después: ${esc(P.name)}</b><small>${esc(on ? 'Elegido: al terminar este ejercicio pasas ahí' : P.why)}</small></div>
    <button type="button" class="btn small ${on ? 'on' : ''}" data-ag="go" data-i="${P.i}">${on ? '✓ Elegido' : 'Ir'}</button><button type="button" class="icon-btn sm" data-ag="no" data-n="${esc(P.name)}" aria-label="Ignorar esta sugerencia">${ic('x', 15)}</button></div>`;
};
window.addEventListener('click', ev => {
  const b = ev.target.closest && ev.target.closest('[data-ag="go"],[data-ag="apply"]'), d = state.draft; if (!b || !d || isWatch()) return;
  if (b.dataset.ag === 'go') {
    const i = +b.dataset.i, cur = d.exercises[Math.min(d.cur || 0, d.exercises.length - 1)];
    g2Pend = null;
    if (!cur || exComplete(cur) || !d.exercises[i]) { const H = g2Hold = { to: i }; setTimeout(() => { if (g2Hold === H) g2Hold = null; }, 1500); return; }   /* ya terminaste: va ahora, como antes */
    ev.preventDefault(); ev.stopPropagation();
    if (d.agGo === i) delete d.agGo; else { d.agGo = i; _toastG2('Al terminar este ejercicio pasas a ' + d.exercises[i].name); }
    saveDraft(); agNextPut(); return;
  }
  /* Aplicar: el peso nuevo en las series que faltan y tenían el mismo peso que la siguiente */
  ev.preventDefault(); ev.stopPropagation();
  const e = d.exercises[+b.dataset.i], n = e && e.log.find(x => !x.done); if (!n) return;
  const old = n.w, W = +b.dataset.w;
  e.log.forEach(x => { if (!x.done && (x === n || x.w === old || x.w === '' || x.w == null)) x.w = W; });
  saveDraft(); render(); _toastG2('Listo: ' + agKg(W) + ' en ' + (e.log.filter(x => !x.done).length === 1 ? 'la serie que falta' : 'las series que faltan'));
}, true);

/* ---------- 5. Reemplazar un ejercicio queda en la rutina ---------- */
function g2KeepSwap(d, exId, old, name) {
  if (isWatch() || !d || d.planId === 'quick' || d.planId === 'wcfill' || d.planId === 'rep') return 0;
  const f = findDay(d.planId, d.dayId); if (!f.p || !f.d || f.p.quick) return 0;
  const L = f.d.exercises, k = L.findIndex(p => (exId && p.id === exId) || exSame(p.name, old)); if (k < 0) return 0;
  if (L.some((p, n) => n !== k && exSame(p.name, name))) return -1;   /* ya está en la rutina: no se duplica */
  const pe = L[k], ne = d.exercises.find(x => x.name === name && x.swappedFrom === old) || {};
  pe.name = name; pe.type = typeOf(name);
  const w = ne.log && ne.log[0] && +ne.log[0].w; if (w >= 0 && ne.log[0].w !== '') pe.weight = w;
  const bar = barFor(name); if (bar) pe.bar = bar; else delete pe.bar;
  delete pe.startLoad; savePlans(); return 1;
}
const _swapDoG2 = swapDo;
swapDo = function (i, name, keep) {
  const d = state.draft, e = d && d.exercises[i];
  if (!e || isWatch() || d.planId === 'quick' || d.planId === 'wcfill' || d.planId === 'rep') return _swapDoG2.apply(this, arguments);
  const exId = e.exId, old = e.name;
  const r = _swapDoG2.call(this, i, name, false);
  const k = g2KeepSwap(d, exId, old, name);
  _toastG2(`Cambiado por ${name}` + (k > 0 ? ' (también en tu rutina)' : k < 0 ? ' (ya estaba en tu rutina)' : ''));
  return r;
};
/* La casilla "Cambiarlo también en mi rutina" ya no hace falta en el teléfono */
const _openSheetG2 = openSheet;
openSheet = function () {
  const r = _openSheetG2.apply(this, arguments), k = document.getElementById('sw-keep'), d = state.draft;
  if (k && !isWatch() && d && d.planId !== 'quick' && d.planId !== 'wcfill' && d.planId !== 'rep') { const l = k.closest('label'); if (l) l.outerHTML = '<div class="muted g2-swn">El cambio queda también en tu rutina, en el mismo lugar.</div>'; }
  return r;
};

/* ---------- 6. Superserie con… ---------- */
const G2_SSL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
/* Con quién emparejar (mejoras de la sesión): músculos opuestos primero, luego los que no compiten; dos del mismo músculo, no.
   Un músculo entrenado fuerte hace menos de 48 h (24 h los pequeños) no se recomienda (restMap, ajustesgym.js) */
const G2_OPP = (typeof PG_SS_OPP !== 'undefined' ? PG_SS_OPP : []).concat([['cuad', 'pant'], ['isq', 'pant'], ['glu', 'pant']]);
const g2PairMain = n => (typeof wcMain === 'function' ? wcMain(n) : null);
const g2PairRest = () => { const R = typeof restMap === 'function' ? restMap() : {}, o = {}; for (const k in R) if (R[k].block) o[k] = R[k]; return o; };
const g2Opp = (a, b) => G2_OPP.some(p => (p[0] === a && p[1] === b) || (p[0] === b && p[1] === a));
function g2PairScore(a, b, R) {
  const ka = g2PairMain(a), kb = g2PairMain(b), za = zoneShares(a), zb = zoneShares(b), low = k => (zoneName(k) || '').toLowerCase();
  if (kb && R && R[kb]) return { s: -100, why: restWhy(kb, R[kb]) + ': hoy descansa' };
  if (ka && kb && ka === kb) return { s: -50, why: 'Mismo músculo (' + low(kb) + '): mejor no juntarlos' };
  const light = typeof pgSsOk === 'function' && pgSsOk(b) ? 5 : 0;
  if (ka && kb && g2Opp(ka, kb) && !za[kb] && !zb[ka]) return { s: 100 + light, why: 'Músculo opuesto: ' + low(kb) };
  if ((kb && za[kb]) || (ka && zb[ka])) return { s: 10 + light, why: 'Comparten músculo: te cansará antes' };
  return { s: 60 + light, why: 'No compite: ' + (kb ? low(kb) : 'otro músculo') };
}
/* Ejercicios de tu gimnasio para agregar como pareja: del músculo opuesto, con el equipo que hay aquí (wcCands) y descansado */
function g2PairAdd(d, name, R) {
  const ka = g2PairMain(name); if (!ka || typeof wcCands !== 'function') return [];
  const ks = []; G2_OPP.forEach(p => { const o = p[0] === ka ? p[1] : p[1] === ka ? p[0] : null; if (o && ks.indexOf(o) < 0 && !(R && R[o])) ks.push(o); });
  const out = [], free = x => !d.exercises.some(y => exSame(y.name, x));
  ks.forEach(k => {
    const C = wcCands(k).filter(free), n = C.filter(x => typeof pgSsOk !== 'function' || pgSsOk(x))[0] || C[0]; if (!n) return;
    const P = g2PairScore(name, n, R); if (P.s >= 60) out.push({ n, k, why: P.why, s: P.s });
  });
  return out.sort((a, b) => b.s - a.s);
}
/* Agrega el ejercicio a la sesión (como cualquier agregado a mano) y lo empareja */
function g2SsAdd(i, name, keep) {
  const d = state.draft, a = d && d.exercises[i]; if (!a) return;
  addToDraft([name], i);
  const ia = d.exercises.indexOf(a), ib = d.exercises.findIndex(x => exSame(x.name, name));
  if (ib < 0 || ia < 0) return;
  d.cur = ia; g2SsSet(ia, ib, keep);
}
function g2SsSheet(i) {
  const d = state.draft, e = d && d.exercises[i]; if (!e) return;
  const cur = typeof ssMembers === 'function' && ssMembers(d, i);
  const R = g2PairRest(), L = d.exercises.map((x, k) => ({ x, k })).filter(o => o.k !== i && !exComplete(o.x) && !(typeof ssOf === 'function' && ssOf(d, o.x)))
    .map(o => Object.assign(o, { P: g2PairScore(e.name, o.x.name, R) })).sort((a, b) => b.P.s - a.P.s || a.k - b.k);
  const f = findDay(d.planId, d.dayId), plan = !!(f.p && f.d && !f.p.quick && d.planId !== 'quick' && d.planId !== 'wcfill' && d.planId !== 'rep');
  /* Recomendados: de los de hoy, los que no compiten; y hasta 3 de tu gimnasio para agregar (músculo opuesto, descansado) */
  const rec = L.filter(o => o.P.s >= 60).slice(0, 3), others = L.filter(o => rec.indexOf(o) < 0), add = g2PairAdd(d, e.name, R).slice(0, Math.max(1, 3 - rec.length));
  const row = (o, top) => `<button type="button" class="qk-ex g2-ssp ${top ? 'g2-ssr' : ''}" data-g2="ss-pick" data-i="${i}" data-k="${o.k}">${thumb(o.x.name)}<span class="grow"><b>${esc(o.x.name)}</b><small class="muted">${esc(o.P.why)} · ${o.x.log.filter(s => !s.done).length} series por hacer</small></span></button>`;
  openSheet(`<div class="row"><h2 class="grow">Superserie con ${esc(e.name)}</h2><button class="icon-btn" data-act="sheet-close" aria-label="Cerrar">${ic('x', 18)}</button></div>
    <div class="muted" style="font-size:13px">Haces una serie de cada uno sin descanso entre ellos y descansas al cerrar la vuelta. Mejor con músculos opuestos o que no compiten (pecho con espalda, cuádriceps con isquiotibiales o pantorrillas).</div>
    ${cur ? `<button type="button" class="btn block" data-g2="ss-off" data-i="${i}">Quitar la superserie</button>` : ''}
    ${rec.length || add.length ? `<div class="label">Recomendados para ${esc(zoneName(g2PairMain(e.name) || '') || 'este ejercicio').toLowerCase()}</div>
    <div class="qk-list g2-ssrec">${rec.map(o => row(o, 1)).join('')}${add.map(a => `<button type="button" class="qk-ex g2-ssp g2-ssr" data-g2="ss-add" data-i="${i}" data-n="${esc(a.n)}">${thumb(a.n)}<span class="grow"><b>${esc(a.n)}</b><small class="muted">${esc(a.why)} · lo agrega a la sesión</small></span>${ic('plus', 16)}</button>`).join('')}</div>` : ''}
    <div class="label">${rec.length || add.length ? 'Otros de hoy' : 'Elige la pareja'}</div>
    <div class="qk-list">${others.length ? others.map(o => row(o, 0)).join('') : `<div class="muted">${L.length ? 'No hay más ejercicios libres en esta sesión.' : 'No queda otro ejercicio libre en esta sesión.'}</div>`}</div>
    ${plan ? '<label class="row g2-ssk" style="gap:10px"><input type="checkbox" id="g2-ss-keep" checked style="width:20px;height:20px"><span>Guardarla también en mi rutina (quedan juntos)</span></label>' : ''}`);
}
function g2SsSet(i, k, keep) {
  const d = state.draft, a = d.exercises[i], b = d.exercises[k]; if (!a || !b) return;
  [a, b].forEach(x => { if (!x.exId) x.exId = 'g2' + uid(); });
  const M = d.ssMap = d.ssMap || {}, used = {}; Object.keys(M).forEach(id => { used[M[id]] = 1; });
  const l = G2_SSL.split('').find(c => !used[c]) || 'Z'; M[a.exId] = l; M[b.exId] = l;
  let saved = false;
  if (keep) {
    const f = findDay(d.planId, d.dayId), L = f.d && f.d.exercises, ia = L ? L.findIndex(p => p.id === a.exId || exSame(p.name, a.name)) : -1;
    let ib = L ? L.findIndex(p => p.id === b.exId || exSame(p.name, b.name)) : -1;
    if (ia >= 0 && ib >= 0) {
      const pb = L.splice(ib, 1)[0]; const at = L.indexOf(f.d.exercises[ia > ib ? ia - 1 : ia]);
      L.splice(at + 1, 0, pb); L[at].ss = 1; pb.ss = 0; saved = true; savePlans();
    }
  }
  saveDraft(); closeSheet(); render();
  _toastG2(`Superserie: ${a.name} + ${b.name}${saved ? ' (también en tu rutina)' : ' (solo hoy)'}`);
}
function g2SsOff(i) {
  const d = state.draft, m = typeof ssMembers === 'function' && ssMembers(d, i); if (!m) return;
  m.forEach(k => { const x = d.exercises[k]; if (x && x.exId) delete d.ssMap[x.exId]; });
  const f = findDay(d.planId, d.dayId); if (f.d) { m.forEach(k => { const x = d.exercises[k], p = x && f.d.exercises.find(q => q.id === x.exId || exSame(q.name, x.name)); if (p && p.ss) p.ss = 0; }); savePlans(); }
  saveDraft(); closeSheet(); render(); _toastG2('Superserie quitada.');
}
function g2SsPills() {
  const d = state.draft; if (!d || isWatch()) return;
  document.querySelectorAll('#sx-pager > .sx-page').forEach(pg => {
    const i = +pg.dataset.i, e = d.exercises[i], P = pg.querySelector('.su-pills'); if (!e || !P || P.querySelector('.g2-ssb')) return;
    const m = typeof ssMembers === 'function' && ssMembers(d, i), other = m && m.filter(k => k !== i).map(k => d.exercises[k].name)[0];
    /* En 4.º lugar de la fila (antes iba al final y había que deslizar para verlo) */
    const h = `<button type="button" class="su-p g2-ssb ${m ? 'on' : ''}" data-g2="ss" data-i="${i}">${ic('layers', 15)} ${m ? 'Superserie con ' + esc(other || '') : 'Superserie con…'}</button>`, at = P.children[3];
    if (at) at.insertAdjacentHTML('beforebegin', h); else P.insertAdjacentHTML('beforeend', h);
  });
}
window.addEventListener('click', ev => {
  const b = ev.target.closest && ev.target.closest('[data-g2]'); if (!b) return;
  ev.preventDefault(); ev.stopPropagation();
  const a = b.dataset.g2, i = +b.dataset.i;
  if (a === 'ss') return g2SsSheet(i);
  if (a === 'ss-pick') { const k = document.getElementById('g2-ss-keep'); return g2SsSet(i, +b.dataset.k, !!(k && k.checked)); }
  if (a === 'ss-add') { const k = document.getElementById('g2-ss-keep'); return g2SsAdd(i, b.dataset.n, !!(k && k.checked)); }
  if (a === 'ss-off') return g2SsOff(i);
  if (a === 'where') { wc.where = b.dataset.v; return wcFillSheet(); }
  if (a === 'rec') { const O = state.g2Open = state.g2Open || {}; O[b.dataset.k] = !O[b.dataset.k]; b.classList.toggle('g2-open', !!O[b.dataset.k]); b.setAttribute('aria-expanded', !!O[b.dataset.k]); return; }
}, true);

/* ---------- 7. Mancuernas y rango del coach ---------- */
/* Paso de las mancuernas en ese gimnasio según tu historial: 12,5 / 17,5… = de 2,5 en 2,5; 12 / 14 / 16… = de 2 en 2.
   Sin pistas, de 2,5 en 2,5 desde 10 kg (lo más común) */
let g2DbC = null;
function g2DbStep() {
  const g = (state.draft && state.draft.gymId) || activeGym().id, key = g + '|' + state.sessions.length;
  if (g2DbC && g2DbC.key === key) return g2DbC.v;
  let a = 0, b = 0;
  state.sessions.forEach(s => { if (sGym(s) !== g) return; s.exercises.forEach(e => { if (pgFam(e.name) !== 'manc') return; e.sets.forEach(x => { const w = +x.w || 0; if (w < 10) return; const q = w / 2.5, h = w / 2; if (Math.abs(q - Math.round(q)) < 1e-6 && Math.abs(h - Math.round(h)) > 1e-6) a++; else if (Math.abs(h - Math.round(h)) < 1e-6 && Math.abs(q - Math.round(q)) > 1e-6) b++; }); }); });
  g2DbC = { key, v: b > a ? 2 : 2.5 }; return g2DbC.v;
}
const _pgIncG2 = pgInc;
pgInc = function (name, w) { if (pgFam(name) === 'manc' && state.settings.unit !== 'lb' && w >= 10) return g2DbStep(); return _pgIncG2.apply(this, arguments); };
const _pgStepG2 = pgStep;
pgStep = function (name, w) { if (pgFam(name) === 'manc' && state.settings.unit !== 'lb') return g2DbStep(); return _pgStepG2.apply(this, arguments); };
/* El rango de una rutina importada de otra IA vale solo sin historial tuyo aquí: con datos, el del coach (pesado o bombeo) */
const g2Hist = (d, e) => !!lastHere(e.name, d.gymId || 'rokaz');
agRxOf = function (d, e) {
  const rx = (e.coach && e.coach.rx) || pgRx(e.name, d.kind, e.fillRx ? e : undefined);
  return e.ns === 'ia' && +e.repsMin && +e.repsMax && !g2Hist(d, e) ? Object.assign({}, rx, { rMin: +e.repsMin, rMax: +e.repsMax }) : rx;
};
const _pgRxG2 = pgRx;
pgRx = function (name, kind, pe) {
  const rx = _pgRxG2.apply(this, arguments), F = pe && pe.fillRx;
  return F ? Object.assign({}, rx, { rMin: F.rMin, rMax: F.rMax, rirMin: Math.min(F.rirMin, rx.rirMax), rirMax: Math.max(F.rirMax, rx.rirMin) }) : rx;
};

/* ---------- 8 y 10. Crear entreno para completar ---------- */
/* Repeticiones por objetivo y tipo de ejercicio. "Fuerza" toma la parte baja del rango y "Bombeo" la alta: lo ajustan, no lo cambian */
const G2_GOAL_R = { hiper: { big: [6, 10], iso: [10, 15] }, grasa: { big: [6, 10], iso: [10, 15] }, fuerza: { big: [4, 6], iso: [8, 12] }, salud: { big: [10, 15], iso: [10, 15] }, mov: { big: [12, 20], iso: [12, 20] } };
const G2_MAX_MUS = 6, G2_MAX_EX = 4;
const g2Big = n => { const t = pgTypeOf(n); return t === 'comp' || (t === 'glu' && !pgIsBw(n) && pgFam(n) !== 'maq'); };
const g2Last = k => (k === 'pant' || k === 'abd' || k === 'core');
function g2FillRx(name, kind) {
  const R = G2_GOAL_R[pgGoal()] || G2_GOAL_R.hiper, b = g2Big(name), r = b ? R.big : R.iso;
  const mid = Math.floor((r[0] + r[1]) / 2), rng = kind === 'fuerza' ? [r[0], mid] : [mid, r[1]];
  return { rMin: rng[0], rMax: rng[1], rirMin: b ? 1 : 1, rirMax: 2 };
}
const g2RangeTxt = kind => { const R = G2_GOAL_R[pgGoal()] || G2_GOAL_R.hiper, h = r => { const m = Math.floor((r[0] + r[1]) / 2); return kind === 'fuerza' ? r[0] + '-' + m : m + '-' + r[1]; }; return `grandes ${h(R.big)}, aislados ${h(R.iso)}`; };
/* Dónde: el gimnasio de hoy o de viaje (peso corporal y bandas, o tus mancuernas de casa) */
function g2GymEmpty(g) { return !state.sessions.some(s => !s.approx && sGym(s) === g) && !gymPlans(g).some(p => p.days.some(d => d.exercises.length)); }
const g2Where = () => wc.where || (g2GymEmpty(activeGym().id) ? 'bw' : 'gym');
const G2_TRAVEL = { bw: /^(cuerpo|banda)$/, casa: /^(cuerpo|banda|manc)$/ };
function g2Cands(k, where) {
  if (where === 'gym') return wcCands(k);
  const ok = n => { const x = libFind(n); return x && G2_TRAVEL[where].test(pgFam(n)) && wcMain(n) === k && !(pbBase().inj || []).some(j => PB_AVOID[j] && PB_AVOID[j].test(normName(n))); };
  const seen = {}, out = [], add = n => { if (n && !seen[n] && ok(n)) { seen[n] = 1; out.push(n); } };
  state.sessions.forEach(s => { if (!s.approx) s.exercises.forEach(e => add(e.name)); });
  (WC_SLOTS[k] || []).forEach(sl => { const S = PB_SLOTS[sl]; if (S) (S.body || []).concat(where === 'casa' ? S.home || [] : []).forEach(add); });
  LIB.forEach(x => { if (!x.hidden) add(x.name); });
  return out;
}
/* Peso: tu última vez en ese ejercicio y gimnasio (la serie con la que terminaste, si bajaste el peso a mitad), con las reglas
   del coach: en el tope del rango sube un escalón, dentro del rango mantiene, fuera del rango se calcula por tu 1RM estimado */
/* Ajustes del gimnasio 4: el peso sale del MISMO tipo de día (Fuerza = tu última sesión pesada, Bombeo = la última de bombeo)
   en ese gimnasio; si no hay de ese tipo, se convierte desde el otro con tu 1RM estimado y se explica. "Sube" siempre sube. */
const g2KindTxt = k => (k === 'fuerza' ? 'pesada' : 'de bombeo');
/* El siguiente peso disponible por encima de w (en máquinas el escalón puede cambiar con el peso: 15 → 20, no 16 redondeado a 15) */
function pgNextUp(name, w) {
  let x = w + Math.max(pgStep(name, w), 0.5);
  for (let i = 0; i < 30; i++) { const c = pgRound(name, x); if (c > w + 1e-9) return c; x += pgInc(name, x) || 1; }
  return w + pgStep(name, w);
}
function g2KHist(name, g, kind, any) {
  const H = [];
  for (const s of state.sessions) { if (s.approx || (!any && sGym(s) !== g)) continue; const x = exIn(s, name); if (x && x.sets.some(t => +t.r > 0)) H.push({ date: s.date, sets: x.sets, kind: sKind(s), gymId: sGym(s) }); }   /* una sesión sin ninguna repetición anotada no sirve de referencia */
  return H;
}
function g2Load(name, rx, where, kind) {
  const g = activeGym().id, free = PG_FREE.test(pgFam(name)), k = kind === 'fuerza' ? 'fuerza' : 'bombeo';
  let H = g2KHist(name, g, k);
  if (!H.length && (free || where !== 'gym')) H = g2KHist(name, g, k, true);
  let L = H.find(h => h.kind === k);
  if (!L && H.length) {
    /* Solo del otro tipo de día: por tu 1RM estimado (reps + RIR; sin RIR anotado, 1) al rango de hoy con RIR 2 */
    const O = H[0], S = O.sets.filter(x => +x.r > 0), bar = barFor(name), e1s = S.map(x => e1rm((+x.w || 0) + bar, (+x.r || 0) + (x.rir != null && x.rir !== '' ? +x.rir : 1)));
    const e1 = Math.max.apply(null, e1s), top = S[e1s.indexOf(e1)] || S[0], last = S.map(x => (+x.w ? fmtKg(+x.w) + '×' + x.r : x.r + ' reps')).join(', '), tw = +top.w || 0;
    if (!tw) return { w: 0, reps: rx.rMin, last, note: 'tu última vez fue ' + g2KindTxt(O.kind) + '; busca ' + rx.rMin + '-' + rx.rMax + ' reps' };
    let w = pgRound(name, pgWFor(name, e1, rx.rMax, 2), true);
    w = Math.max(pgInc(name, tw), Math.min(w, tw + pgUpMax(name, tw)));
    /* Si esas reps ya caen en el rango de hoy, el mismo peso (no se baja algo que ya te sale aquí) */
    const fr = +(S.find(x => (+x.w || 0) === tw) || top).r || 0; if (fr >= rx.rMin && fr <= rx.rMax) w = tw;
    const cap = pgMaxOf(name, g); if (cap > 0 && w > cap) w = cap;
    const reps = pgRepsFor(name, e1, w, rx);
    return { w, reps, last, conv: 1, kind: O.kind, note: 'no hay una sesión ' + g2KindTxt(k) + ' de este ejercicio, así que lo convertí desde tu sesión ' + g2KindTxt(O.kind) + ' (1RM estimado ≈ ' + fmtKg(Math.round(e1 - bar)) + ' kg): para ' + rx.rMin + '-' + rx.rMax + ' reps, ' + fmtKg(w) + ' kg' + (w < tw ? ' (menos peso, más reps)' : w > tw ? ' (más peso, menos reps)' : ' (el mismo peso: esas reps ya están en el rango de hoy)') };
  }
  if (!L) {
    const st = typeof startLoad === 'function' ? startLoad({ name, type: typeOf(name), repsMin: rx.rMin, repsMax: rx.rMax }) : null, w = pgIsBw(name) ? 0 : st && st.w > 0 ? st.w : 0;
    return { w, reps: rx.rMin, last: '', note: w ? 'primera vez: empieza cómodo y ajusta tras la 1.ª serie' : 'primera vez: elige un peso cómodo' };
  }
  const S = L.sets.filter(x => +x.r > 0), end = S[S.length - 1] || L.sets[0], wEnd = +end.w || 0, atEnd = S.filter(x => Math.abs((+x.w || 0) - wEnd) < 0.01), f = atEnd[0] || end;
  const last = S.map(x => (+x.w ? fmtKg(+x.w) + '×' + x.r : x.r + ' reps')).join(', ');
  const lowered = S.some(x => (+x.w || 0) > wEnd + 0.01);
  if (!wEnd) { const r = Math.min(rx.rMax, (+f.r || rx.rMin) + 1); return { w: 0, reps: Math.max(rx.rMin, r), last, note: 'suma 1 repetición' }; }
  const e1 = Math.max.apply(null, atEnd.map(x => e1rm(wEnd + barFor(name), (+x.r || 0) + (x.rir != null ? +x.rir : 1)))), r1 = +f.r || 0;
  /* Subir = como mínimo el siguiente escalón disponible (nunca el mismo peso con el texto "sube") */
  const upTo = W => Math.max(W, pgNextUp(name, wEnd));
  let w = wEnd, note;
  if (r1 >= rx.rMax + 3) { w = upTo(Math.min(pgRound(name, pgWFor(name, e1, rx.rMax, 2), true), wEnd + pgUpMax(name, wEnd))); note = 'hiciste muchas más reps que ' + rx.rMin + '-' + rx.rMax + ': sube a ' + fmtKg(w) + ' kg'; }
  else if (r1 >= rx.rMax && (f.rir == null || +f.rir >= 1)) { w = upTo(Math.min(pgRound(name, wEnd + pgStep(name, wEnd)), wEnd + pgUpMax(name, wEnd))); note = 'llegaste al tope del rango: sube un escalón, a ' + fmtKg(w) + ' kg'; }
  else if (r1 >= rx.rMax) note = 'llegaste al tope pero al fallo (RIR 0): mantén ' + fmtKg(wEnd) + ' kg hasta hacerlo con 1 rep de sobra';
  else if (r1 >= rx.rMin) note = lowered ? 'terminaste con ' + fmtKg(wEnd) + ' kg: sigue ahí y suma reps' : 'mantén el peso y suma reps';
  else if (rx.rMin - r1 === 1) note = (lowered ? 'terminaste con ' + fmtKg(wEnd) + ' kg; ' : '') + 'a 1 rep del rango: mantén el peso';
  else if (rx.rMin - r1 === 2) { w = Math.min(wEnd, pgRound(name, wEnd * 0.92)); note = (lowered ? 'terminaste con ' + fmtKg(wEnd) + ' kg; ' : '') + (w < wEnd ? 'baja un poco para entrar en ' + rx.rMin + '-' + rx.rMax + ' reps' : 'mantén el peso'); }
  else { w = Math.min(wEnd, pgRound(name, pgWFor(name, e1, rx.rMin, 2), true)); note = w < wEnd ? 'baja para entrar en ' + rx.rMin + '-' + rx.rMax + ' reps' : 'mantén el peso'; }
  const cap = pgMaxOf(name, g); if (cap > 0 && w > cap + 0.01) { w = Math.max(wEnd, cap); note = 'mantén ' + fmtKg(w) + ' kg: es tu peso máximo aquí; suma reps'; }
  w = Math.max(0, w);
  const reps = Math.max(rx.rMin, Math.min(rx.rMax, w === wEnd ? r1 + (r1 < rx.rMax ? 1 : 0) : pgRepsFor(name, e1, w, rx)));
  return { w, reps, last, note, kind: L.kind };
}
const g2Sets = (name, sets, kind) => pgExSec(name, sets, pgRx(name, kind).rest, false);
/* Entrenos que te quedan esta semana para completar: tu meta de días menos lo hecho y lo que aún toca de la rutina, sin pasar de los días que quedan */
function g2DaysLeft(V) {
  const t = new Date(), cal = Math.max(1, 7 - (t.getDay() + 6) % 7);
  let st = null; try { st = streakInfo(); } catch (e) {}
  const rem = st && st.target ? st.target - (st.thisWeek || 0) - (V && V.pend ? V.pend.length : 0) : cal;
  return Math.max(1, Math.min(cal, rem));
}
wcBuild = function (kind, seed) {
  if (isWatch()) return { list: [], skipped: [], dl: false };
  const V = wcVolume(), sore = soreMap(), where = g2Where(), days = g2DaysLeft(V), avail = pgAvail() * 60 - 6 * 60;
  const need = V.rows.filter(r => r.st === 'low').map(r => ({ k: r.k, n: Math.ceil(WC_MIN - r.t) })).sort((a, b) => b.n - a.n || WC_BIG.indexOf(a.k) - WC_BIG.indexOf(b.k));
  const skipped = [], left = [], later = [], picks = [], used = {}, moved = [], tired = [];
  /* Descanso muscular desde el día elegido (Hoy o el siguiente): lo entrenado fuerte hace menos de 48 h (24 h los pequeños) no se carga */
  const day = wc.day || dk(new Date()), R = restMap(day), after = typeof wcFillDays === 'function' ? wcFillDays().filter(d => d.k > day) : [];
  const wdOf = k => WDL[new Date(k + 'T12:00:00').getDay()].toLowerCase();
  const PL = typeof msPlan === 'function' ? msPlan(day, V) : null;
  let sec = 0;
  /* Un ejercicio por músculo; un segundo solo si faltan más de 5 y es un movimiento distinto (no dos variantes casi iguales) */
  const take = (x, T, tag) => {
    const cands = qkShuffle(g2Cands(x.k, where), seed).filter(n => !used[exHKey(n)]);
    if (!cands.length) return null;
    const pat = n => (libFind(n) || {}).pat || n, a = cands[0], sa = Math.min(T, G2_MAX_EX);
    const b = x.n > 5 && T - sa >= 2 ? cands.find(n => n !== a && pat(n) !== pat(a)) : null;
    const plan = b ? [{ n: a, s: sa }, { n: b, s: Math.min(G2_MAX_EX, T - sa) }] : [{ n: a, s: Math.min(T, 5) }];
    let got = 0, cut = false;
    plan.forEach(c => {
      let s = Math.max(2, c.s); while (s >= 2 && sec + g2Sets(c.n, s, kind) > avail) { s--; cut = true; }
      if (s < 2) return;
      sec += g2Sets(c.n, s, kind); used[exHKey(c.n)] = 1; got += s;
      picks.push(Object.assign({ name: c.n, sets: s, k: x.k, need: x.n }, tag || {}));
    });
    return { got, cut };
  };
  need.forEach(x => {
    if (sore[x.k] && sore[x.k].lvl >= 2) { skipped.push(x.k); return; }
    const F = R[x.k], pk = PL ? PL.at(day, x.k) : null;
    if (F && F.block) {
      /* Con el plan de la semana: van a los días que dice el plan (los mismos números que "Cómo queda repartida tu semana") */
      if (pk && pk.more.length) {
        let lack = x.n; pk.more.forEach(m => { const n = Math.min(lack, m.n); if (n > 0) { moved.push({ k: x.k, n, to: m.rut ? m.to : wdOf(m.k), why: restWhy(x.k, F), h: F.big ? 48 : 24, rut: m.rut }); lack -= n; } });
        if (lack > 0) left.push({ k: x.k, n: lack, why: PL.whyOut(x.k) || 'no queda un día con descanso suficiente', rest: 1 });
        return;
      }
      /* Si queda otro día, sus series van al que tenga más descanso (el último), siempre que allí ya se cumplan las 48 h (24 h los pequeños) */
      const to = after.slice().reverse().find(d => restDays(F.date, d.k + 'T12:00:00') >= (F.big ? 2 : 1));
      if (to) moved.push({ k: x.k, n: x.n, to: wdOf(to.k), why: restWhy(x.k, F), h: F.big ? 48 : 24 });
      else tired.push(x);
      return;
    }
    /* Plan de la semana (msPlan): si este músculo va entero a otro entreno, aquí no sale y se dice a dónde va */
    if (pk && !pk.n && pk.more.length) { pk.more.forEach(m => moved.push({ k: x.k, n: m.n, to: m.to, plan: 1 })); return; }
    const T = Math.max(1, (pk && pk.n ? pk.n : Math.min(G2_MAX_MUS, Math.ceil(x.n / days))) - (sore[x.k] ? 1 : 0));
    const soft = F && F.soft ? restWhy(x.k, F) : '';
    const tk = take(x, T, soft ? { soft } : null);
    if (!tk) { left.push({ k: x.k, n: x.n, why: 'no hay un ejercicio para hacerlo aquí' }); return; }
    const got = tk.got, cut = tk.cut;
    let lack = x.n - got; if (lack <= 0) return;
    /* Lo que el plan ya puso en otro entreno no es "sin cubrir" (aunque hoy entre algo menos de lo planeado) */
    if (pk && pk.more.length) { pk.more.forEach(m => { const n = Math.min(lack, m.n); if (n > 0) { moved.push({ k: x.k, n, to: m.to, plan: 1 }); lack -= n; } }); if (lack <= 0) return; }
    /* Lo que el plan no pudo poner en ningún día: con su razón */
    if (pk && !cut && got >= T && PL.whyOut(x.k)) { left.push({ k: x.k, n: lack, why: PL.whyOut(x.k) }); return; }
    if (days > 1 && !cut && got >= T) later.push({ k: x.k, n: lack });
    else left.push({ k: x.k, n: lack, why: cut || !got ? 'no entra en tu tiempo' : got < T ? 'un segundo ejercicio sería casi igual al primero' : 'más de ' + G2_MAX_MUS + ' series de un músculo en una sesión ya no suman' });
  });
  /* Músculos que aún descansan y no hay otro día: si son lo único que falta, como máximo 2 series con RIR 2 y la razón; si no, quedan fuera */
  const only = !picks.length;
  tired.forEach(x => {
    const F = R[x.k], txt = restWhen(F) + ' lo entrenaste fuerte y necesita ' + (F.big ? 48 : 24) + ' h';
    if (!only || !F.big) { left.push({ k: x.k, n: x.n, why: txt, rest: 1 }); return; }
    const tk = take(x, 2, { r2: restWhy(x.k, F) });
    if (!tk || !tk.got) { left.push({ k: x.k, n: x.n, why: txt, rest: 1 }); return; }
    if (x.n > tk.got) left.push({ k: x.k, n: x.n - tk.got, why: txt, rest: 1 });
  });
  /* Orden: grandes primero (press, remo, sentadilla), luego los aislados; pantorrillas y abdomen al final */
  const rank = p => (g2Last(p.k) ? 3 : g2Big(p.name) ? 0 : pgTypeOf(p.name) === 'glu' ? 1 : 2);
  picks.sort((a, b) => rank(a) - rank(b) || b.need - a.need);
  const list = picks.map(p => {
    let rx = g2FillRx(p.name, kind); if (p.r2) rx = Object.assign({}, rx, { rirMin: 2, rirMax: 2 });
    const L = g2Load(p.name, rx, where, kind), pe = wcPlanEx(p.name);
    const e = E(p.name, pe ? pe.type : pbType(p.name), L.w, p.sets, rx.rMin + '-' + rx.rMax, kind === 'fuerza' ? 2 : 1.5);
    delete e.bar; const bar = pe && pe.bar != null ? +pe.bar : BAR_DEFAULT[p.name] != null ? (pbLb() ? 45 : BAR_DEFAULT[p.name]) : null; if (bar != null) e.bar = bar;
    e.repsMin = rx.rMin; e.repsMax = rx.rMax; e.weight = L.w; e.wcZ = p.k; e.fillRx = rx; e.g2Reps = L.reps;
    e.rirT = Array.from({ length: p.sets }, (z, j) => (p.r2 ? 2 : j === p.sets - 1 ? 1 : 2));
    e.rest = pgRx(p.name, kind).rest;
    const lastTxt = !L.last ? ' · ' + L.note : L.conv ? ' · ' + L.note + ' (tu última vez: ' + L.last + ')' : ' · tu última sesión ' + g2KindTxt(L.kind || kind) + ' ' + L.last + ': ' + L.note;
    const restTxt = p.r2 ? p.r2 + ': solo 2 series con RIR 2, porque es lo único que te falta · ' : p.soft ? p.soft + ': con 24 h basta, hoy RIR 1-2 · ' : '';
    e.g2Why = `${restTxt}${p.need === 1 ? 'Te falta 1 serie' : 'Te faltan ' + p.need + ' series'} de ${zoneName(p.k).toLowerCase()}${lastTxt}`;
    if (p.r2) e.g4R2 = 1;
    if (!L.last) e.wcNew = 1;
    return e;
  });
  return { list, skipped, dl: V.dl, left, later, moved, where, days, day, min: Math.round((sec + 6 * 60) / 60) };
};
wcPreview = function (e, kind) {
  if (!e.fillRx) return { w: +e.weight || 0, sets: e.sets };
  const I = wcDl(), dl = !!(I && I.deload);
  return { w: dl ? pgRound(e.name, (+e.weight || 0) * 0.9, true) : +e.weight || 0, sets: dl ? Math.ceil(e.sets / 2) : e.sets };
};
const _wcFillSheetG2 = wcFillSheet;
wcFillSheet = function () {
  const r = _wcFillSheetG2.apply(this, arguments); if (isWatch()) return r;
  const c = document.querySelector('#sheet .wc-sheet'); if (!c) return r;
  const B = { list: wc.list || [] }, where = g2Where();
  c.querySelectorAll('[data-wc="kind"]').forEach(b => { b.textContent = (b.dataset.v === 'fuerza' ? 'Fuerza · ' : 'Bombeo · ') + g2RangeTxt(b.dataset.v) + ' reps'; });
  const kindLab = Array.from(c.querySelectorAll('.label')).find(n => n.textContent.trim() === 'Tipo');
  const chip = (v, l) => `<button type="button" class="qk-chip ${where === v ? 'on' : ''}" data-g2="where" data-v="${v}">${l}</button>`;
  if (kindLab) kindLab.insertAdjacentHTML('beforebegin', `<div class="label">Dónde</div><div class="qk-chips">${chip('gym', 'Gimnasio de hoy')}${chip('bw', 'De viaje: peso corporal y bandas')}${chip('casa', 'Con mis mancuernas de casa')}</div>
    ${where !== 'gym' ? '<div class="muted wc-sub">De viaje: solo ejercicios sin máquinas. Tu gimnasio no cambia.</div>' : ''}`);
  c.querySelectorAll('.wc-sub').forEach(n => { n.innerHTML = n.innerHTML.replace('El peso sale de tu historial; en la sesión el coach lo afina.', 'El peso sale de tu última vez en cada ejercicio; en la sesión lo ves igual y puedes cambiarlo.'); });
  c.querySelectorAll('.qk-list .qk-ex').forEach((n, k) => { const e = B.list[k]; if (e && e.g2Why) { const sm = n.querySelector('small'); if (sm) sm.insertAdjacentHTML('afterend', `<small class="g2-why">${esc(e.g2Why)}</small>`); } });
  const Bx = wcBuild.last, list = c.querySelector('.qk-list'), nS = n => n + ' ' + (n === 1 ? 'serie' : 'series');
  if (list && Bx && Bx.later && Bx.later.length) list.insertAdjacentHTML('afterend', `<div class="muted wc-sub g2-later">Te quedan ${Bx.days} entrenos esta semana: lo demás va en los otros (${Bx.later.map(x => `${zoneName(x.k).toLowerCase()} ${nS(x.n)}`).join(', ')}), como máximo ${G2_MAX_MUS} series de un músculo por sesión.</div>`);
  /* Descanso muscular: lo que pasa a otro día, con la razón */
  if (list && Bx && Bx.moved && Bx.moved.length) {
    /* Lo que el plan de la semana reparte en otros entrenos (x.plan) se ve en "Cómo queda repartida tu semana" (mejorassesion.js): aquí solo lo que pasa por descanso */
    const byRest = Bx.moved.filter(x => !x.plan);
    if (!(Bx.list || []).length) list.innerHTML = `<div class="muted">${byRest.length ? 'Hoy no conviene completar nada: lo que falta aún necesita descanso.' : 'Hoy no hace falta: lo que falta va en tus otros entrenos de la semana (mira abajo).'}</div>`;
    if (byRest.length) list.insertAdjacentHTML('afterend', `<div class="safe tip g4-moved">${ic('timer', 16)}<span>${byRest.map(x => `${esc(x.why)}: ${zoneName(x.k).toLowerCase()} (${nS(x.n)}) ${x.rut ? 'va ' + esc(x.to) : 'pasa al ' + x.to}, cuando ya habrán pasado ${x.h} h.`).join(' ')}${byRest.some(x => !x.rut) ? ' Guarda otro entreno para completar ese día.' : ''}</span></div>`);
  }
  if (list && Bx && Bx.left && Bx.left.length) list.insertAdjacentHTML('afterend', `<div class="safe tip g2-left">${ic('info', 16)}<span>Quedan sin cubrir: ${Bx.left.map(x => `${zoneName(x.k).toLowerCase()} (${nS(x.n)}, ${x.why})`).join('; ')}. No es grave: lo compensas la semana que viene.</span></div>`);
  return r;
};
/* La hoja necesita saber lo que quedó fuera: se guarda el último cálculo */
const _wcBuildG2 = wcBuild;
wcBuild = function () { const B = _wcBuildG2.apply(this, arguments); wcBuild.last = B; return B; };
/* En la sesión: el peso, las reps, el RIR y la razón que viste al crearlo (el coach no los recalcula) */
const _startSessionG2 = startSession;
startSession = function (planId, dayId) {
  const fd = findDay(planId, dayId), day = fd && fd.d;
  const r = _startSessionG2.apply(this, arguments);
  const d = state.draft; if (!d || isWatch() || d.dayId !== dayId || d.g2Done) return r;
  d.g2Done = 1;
  d.exercises.forEach(e => {
    const pe = day && day.exercises.find(x => x.id === e.exId);
    if (planId === 'wcfill' && pe && pe.fillRx) {
      const rx = Object.assign({}, pgRx(e.name, d.kind, pe));
      e.repsMin = rx.rMin; e.repsMax = rx.rMax; e.g2Why = pe.g2Why; e.rest = pe.rest || e.rest;
      e.rirT = e.log.map((s, j) => (pe.g4R2 ? 2 : j === e.log.length - 1 ? 1 : 2));
      const goal = e.log.map(() => pe.g2Reps || rx.rMin);
      e.coach = Object.assign({}, e.coach || {}, { w: +pe.weight || 0, goal, rirT: e.rirT, rx, why: pe.g2Why });
      e.log.forEach((s, j) => { if (s.done) return; s.w = +pe.weight || 0; s.r = goal[j]; });
    } else if (e.ns === 'ia' && g2Hist(d, e)) {
      /* Importada de tu IA con historial tuyo aquí: rango del coach para el día pesado o de bombeo */
      const rx = pgRx(e.name, d.kind); e.repsMin = rx.rMin; e.repsMax = rx.rMax;
      e.log.forEach(s => { if (!s.done && +s.r) s.r = Math.max(rx.rMin, Math.min(rx.rMax, +s.r)); });
    }
  });
  saveDraft(); render();
  return r;
};

/* ---------- 9. Mapa del cuerpo ---------- */
MM_COL[4] = 'var(--mm4, var(--core))';
document.addEventListener('click', ev => {
  const z = ev.target.closest && ev.target.closest('.mm-card .mm-svg [data-z], .lv-box .mm-svg [data-z]'); if (!z || isWatch()) return;
  const svg = z.closest('.mm-svg'), k = z.dataset.z, W = weekSets(state.mmWeek || 0).sets, v = W[k] || 0;
  let tip = svg.parentNode.querySelector('.g2-mmt'); if (!tip) { svg.insertAdjacentHTML('afterend', '<div class="g2-mmt" role="status"></div>'); tip = svg.parentNode.querySelector('.g2-mmt'); }
  tip.textContent = `${zoneName(k)}: ${wcR(v)} de ${WC_MIN} series` + (v > WC_MAX ? ' (más de ' + WC_MAX + ')' : '');
  svg.querySelectorAll('.g2-on').forEach(n => n.classList.remove('g2-on'));
  svg.querySelectorAll('[data-z="' + k + '"]').forEach(n => n.classList.add('g2-on'));
});
const _mmCardG2 = mmCard;
mmCard = function () { const h = _mmCardG2.apply(this, arguments); return isWatch() ? h : h.replace(/Quedan 1 día\./, 'Queda 1 día.').replace('<div class="mm-leg">', '<div class="muted g2-mmh">Toca un músculo para ver sus series.</div><div class="mm-leg">'); };

/* ---------- Dibujo ---------- */
const _renderG2 = render;
render = function () {
  const r = _renderG2.apply(this, arguments);
  if (isWatch()) return r;
  g2SsPills(); g2LockSync();
  if (state.draft) { g2Quiet++; setTimeout(() => { g2Quiet = Math.max(0, g2Quiet - 1); }, 450); }
  return r;
};
bootRender();
