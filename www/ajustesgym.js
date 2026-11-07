/* ==========================================================================
   Ajustes del gimnasio (rama ajustes-gym). Solo el teléfono: el reloj no cambia.
   1. Series sin descanso completo (`q`): se calculan al terminar y van con la sesión, junto a la hora de cada serie.
      El coach (progresion.js) no toma esas series como falta de fuerza.
   2. Siguiente ejercicio: una sugerencia en una línea que puedes ignorar. Usa las series que faltan de Completar la
      semana (`wcVolume`) y el tiempo del aviso de atraso (`pgAvail`, `pgExSec`). No reordena nada: lo que hagas queda en
      el orden real (mejoras.js) por la hora de cada serie.
   3. Recordatorio cancelado u omitido 3 días seguidos: se desactiva y Hoy ofrece volver a activarlo con un toque.
      Cuentan el ✕ y "Omitir hoy"; deslizar la notificación y aplazar no. Hacerlo, o un día sin cancelar, vuelve a cero.
   Recordatorios juntos (`agGroups`, hasta `AG_WIN` min entre el primero y el último): un solo aviso con Hecho todo, Omitir
      todo y cada uno por separado; si alguno es de pantalla completa, el grupo también. Cada uno guarda su resultado.
   4-6. Indicación serie por serie (`agTip`) y análisis al terminar (`agAnalysisHtml`): lo que dicen de la próxima vez sale
      del mismo cálculo (`agAfter` = el coach con esa sesión como la última), así coinciden. Sin internet ni IA.
   ========================================================================== */

/* ---------- 1. Series sin descanso completo ---------- */
const AG_REST = 0.6;   /* menos del 60 % del descanso recomendado no es un descanso completo */
function agFlags(d) {
  const L = []; d.exercises.forEach(e => e.log.forEach((s, j) => { if (s.done && s.at) L.push({ s, e, j }); }));
  L.sort((a, b) => a.s.at - b.s.at);
  const out = new Map(), tip = d.ssT || [];
  L.forEach((x, n) => {
    const p = L[n - 1], inSs = (typeof ssOf === 'function' && ssOf(d, x.e)) || tip.indexOf(x.e.name) >= 0;
    let q = !!inSs && x.j > 0;   /* en superserie la fatiga se acumula: la primera vuelta sí mide tu fuerza */
    if (!q && p) {
      const gap = (x.s.at - p.s.at) / 1000 - PG_RX[pgTypeOf(x.e.name)].dur;
      q = gap < pgRx(p.e.name, d.kind).rest * AG_REST;
    }
    out.set(x.s, q);
  });
  return out;
}
const _finishAG = finishSession;
finishSession = function () {
  const d = state.draft, id = d && d.id;
  if (!d || isWatch()) return _finishAG.apply(this, arguments);
  const F = agFlags(d), rows = d.exercises.map(e => ({ name: e.name, sets: e.log.filter(s => s.done).map(s => ({ at: s.at, q: F.get(s) })) }));
  const r = _finishAG.apply(this, arguments);
  const s = !state.draft && state.sessions.find(x => x.id === id);
  if (s) {
    rows.forEach(x => {
      const e = s.exercises.find(y => y.name === x.name); if (!e) return;
      e.sets.forEach((t, j) => { const v = x.sets[j]; if (!v) return; if (v.at) t.at = v.at; if (v.q) t.q = 1; });
    });
    saveLocal();
  }
  return r;
};

/* ---------- 2. Siguiente ejercicio ---------- */
const AG_LATEWK = [4, 5, 6];   /* jueves, viernes y sábado: queda poca semana, las series que faltan pesan más */
const AG_HEAVY = { comp: 3, glu: 2, aisl: 1, peq: 0, cardio: 0 };
/* Series que aún faltan por músculo esta semana, sin contar las que tienes pendientes hoy */
function agNeed(d) {
  const today = {}, need = {};
  d.exercises.forEach(e => { const n = e.log.filter(s => !s.done).length, sh = zoneShares(e.name); for (const k in sh) today[k] = (today[k] || 0) + sh[k] * n; });
  wcVolume().rows.forEach(r => { const v = WC_MIN - (r.t - (today[r.k] || 0)); if (v > 0) need[r.k] = v; });
  return need;
}
function agPick(d) {
  if (!d || isWatch()) return null;
  const cur = Math.min(d.cur || 0, d.exercises.length - 1), f = ssInfo(d, cur);
  if (f && !exComplete(d.exercises[cur])) return null;   /* en plena superserie ya sabes qué sigue */
  const pend = d.exercises.map((e, i) => ({ e, i, n: e.log.filter(s => !s.done).length })).filter(o => o.n > 0 && o.i !== cur);
  if (pend.length < 2) return null;
  const need = agNeed(d), late = AG_LATEWK.indexOf(new Date().getDay()) >= 0 ? 1.5 : 1;
  const left = pgAvail() * 60 - (Date.now() - new Date(d.start)) / 1000;
  const sec = o => pgExSec(o.e.name, o.n, +o.e.rest || 90, false), short = pend.reduce((a, o) => a + sec(o), 0) > left;
  const L = pend.map(o => {
    const sh = zoneShares(o.e.name); let gain = 0, zone = null, faltan = 0;
    for (const k in sh) { const g = sh[k] * Math.min(o.n, need[k] || 0); gain += g; if (need[k] && (!zone || need[k] > faltan)) { zone = k; faltan = need[k]; } }
    const heavy = AG_HEAVY[pgTypeOf(o.e.name)] || 0, fits = sec(o) <= left;
    return Object.assign(o, { gain, zone, faltan, heavy, fits, score: gain * late * (short ? 1.5 : 1) + heavy * 1.2 - (fits ? 0 : 3) });
  }).sort((a, b) => b.score - a.score || a.i - b.i);
  const top = L[0], nx = pend.filter(o => o.i > cur)[0] || pend[0], m = Math.max(0, Math.round(left / 60));
  let why = '';
  if (top.gain > 0) why = `Te faltan ${Math.ceil(top.faltan)} ${Math.ceil(top.faltan) === 1 ? 'serie' : 'series'} de ${zoneName(top.zone).toLowerCase()} esta semana`;
  else if (short && top.fits) why = `Te quedan ${m} min y este alcanza a entrar`;
  else if (top.i !== nx.i && top.heavy > nx.heavy) why = 'Es el más pesado que te queda: mejor antes de cansarte';
  return why ? { i: top.i, name: top.e.name, why } : null;
}
function agNextHtml(d) {
  /* Sale cuando ya empezaste el ejercicio: antes no hace falta y empujaría la 1.ª serie fuera de la pantalla */
  const cur = d.exercises[Math.min(d.cur || 0, d.exercises.length - 1)]; if (!cur || !cur.log.some(s => s.done)) return '';
  const P = agPick(d); if (!P || d.agNo === P.name) return '';
  return `<div class="ag-next" id="ag-next"><div class="grow"><b>Después: ${esc(P.name)}</b><small>${esc(P.why)}</small></div>
    <button type="button" class="btn small" data-ag="go" data-i="${P.i}">Ir</button><button type="button" class="icon-btn sm" data-ag="no" data-n="${esc(P.name)}" aria-label="Ignorar esta sugerencia">${ic('x', 15)}</button></div>`;
}
function agNextPut() {
  const d = state.draft, sx = document.getElementById('sx'), old = document.getElementById('ag-next');
  if (old) old.remove();
  if (!d || !sx || isWatch()) return;
  const at = sx.querySelector('.pg-late:last-of-type') || sx.querySelector('#sx-strip') || sx.querySelector('.sx-top');
  const h = agNextHtml(d); if (h && at) at.insertAdjacentHTML('afterend', h);
  /* "Ahora conviene priorizar" dice lo mismo: si hay sugerencia, no salen los dos */
  document.querySelectorAll('.lv-next').forEach(n => n.classList.toggle('ag-hide', !!h));
}
/* Deslizar no redibuja: la línea se actualiza al cambiar de ejercicio */
const _setCurAG = setCur;
setCur = function () { const r = _setCurAG.apply(this, arguments); agNextPut(); return r; };
const _markSetAG = markSet;
markSet = function () { if (state.draft) delete state.draft.agNo; return _markSetAG.apply(this, arguments); };
document.addEventListener('click', ev => {
  const b = ev.target.closest && ev.target.closest('[data-ag]'); if (!b) return;
  ev.preventDefault(); ev.stopPropagation();
  const d = state.draft, a = b.dataset.ag;
  if (a === 'on' || a === 'bye') return agRemAnswer(b.dataset.rk, a === 'on');
  if (a === 'g1' || a === 'gall') return agGroupAnswer(b);
  if (!d) return;
  if (a === 'no') { d.agNo = b.dataset.n; saveDraft(); agNextPut(); return; }
  if (a === 'go') { const i = +b.dataset.i; setCur(i); pagerGo(i, true); }
  if (a === 'apply') { const e = d.exercises[+b.dataset.i], n = e && e.log.find(x => !x.done); if (n) { n.w = +b.dataset.w; saveDraft(); render(); } }
}, true);

/* ---------- 3. Recordatorio cancelado 3 días seguidos ---------- */
const AG_DAYS = 3;
const agRk = r => [r.kind, r.hab || '', r.time, r.label || ''].join('|');
const agRem = rk => state.reminders.find(r => agRk(r) === rk) || null;
const agRemName = r => { const k = habKeyOf(r); return r.label || (k && habOf(k).name) || 'Recordatorio'; };
const _haItemForAG = haItemFor;
haItemFor = function (r) { const it = _haItemForAG.apply(this, arguments); if (it && !isWatch()) it.rk = agRk(r); return it; };
/* El día anterior en que tocaba ese recordatorio (uno de lunes, miércoles y viernes sigue su propio calendario) */
function agPrev(r, day) {
  const t = new Date(day + 'T12:00:00');
  for (let i = 0; i < 7; i++) { t.setDate(t.getDate() - 1); if (r.days.indexOf(t.getDay()) >= 0) return dk(t); }
  return '';
}
function agHit(r, day) {
  if (!r || !r.on || !day || isWatch()) return;
  const S = state.settings, C = S.remCx = S.remCx || {}, rk = agRk(r), c = C[rk] || { n: 0, last: '' }, k = habKeyOf(r);
  if (c.last === day) return;   /* varias veces el mismo día cuentan una */
  const did = x => !!(k && (state.daily[x] || {})[k]);
  if (did(day)) return;
  const prev = agPrev(r, day), n = c.last === prev && !did(prev) ? c.n + 1 : 1;
  if (n < AG_DAYS) { C[rk] = { n, last: day, was: { n: c.n, last: c.last } }; savePlans(); return; }
  delete C[rk]; r.on = false;
  S.remOff = (S.remOff || []).filter(x => x.rk !== rk).concat([{ rk, name: agRemName(r) }]);
  saveReminders(); savePlans(); if (typeof scheduleSoon === 'function') scheduleSoon();
  bootRender();
}
function agClear(rk) { const C = state.settings.remCx; if (C && C[rk]) { delete C[rk]; savePlans(); } }
/* Lo que llegó del nativo: `cancel` (✕) cuenta; un ✓ pone el contador a cero */
function agEvents(ev) {
  if (isWatch()) return;
  ev.forEach(e => { if (e.cancel || (e.skip && !e.habit)) agHit(agRem(e.rk), e.day); else if (e.rk && !e.skip) agClear(e.rk); });
}
/* "Omitir hoy" (notificación, pantalla completa u Hábitos de hoy): cuenta para los recordatorios de ese hábito; deshacerlo el mismo día lo devuelve */
const _habSkipAG = habSkip;
habSkip = function (k, day, on) {
  const r = _habSkipAG.apply(this, arguments);
  if (isWatch()) return r;
  const R = state.reminders.filter(x => habKeyOf(x) === k);
  if (on) R.forEach(x => agHit(x, day));
  else R.forEach(x => { const C = state.settings.remCx || {}, rk = agRk(x), c = C[rk]; if (c && c.last === day) { if (c.was && c.was.n) C[rk] = c.was; else delete C[rk]; savePlans(); } });
  return r;
};
/* Dentro de la app: el ✕ cuenta; ✓ vuelve a cero (se lee antes de que se cierre la pantalla) */
window.addEventListener('click', ev => {
  const b = ev.target.closest && ev.target.closest('[data-act="ha-no"],[data-act="ha-yes"]'), it = b && haCur; if (!it || !it.rk) return;
  if (b.dataset.act === 'ha-no') agHit(agRem(it.rk), it.day || dk(new Date())); else agClear(it.rk);
}, true);
function agRemAnswer(rk, on) {
  const S = state.settings, x = (S.remOff || []).find(y => y.rk === rk), r = agRem(rk);
  S.remOff = (S.remOff || []).filter(y => y.rk !== rk);
  if (on && r) { r.on = true; agClear(rk); saveReminders(); if (typeof scheduleSoon === 'function') scheduleSoon(); toast(`Listo: «${x ? x.name : agRemName(r)}» vuelve a avisarte.`); }
  savePlans(); render();
}
function agRemCards() {
  return (state.settings.remOff || []).map(x => `<div class="card ag-rem"><div><b>Desactivé «${esc(x.name)}»</b><small class="muted">Lo cancelaste u omitiste ${AG_DAYS} días seguidos, así que ya no te avisa.</small></div>
    <div class="row" style="gap:8px"><button type="button" class="btn small primary" data-ag="on" data-rk="${esc(x.rk)}">Volver a activar</button><button type="button" class="btn small" data-ag="bye" data-rk="${esc(x.rk)}">Dejarlo así</button></div></div>`).join('');
}

/* ---------- 3b. Recordatorios juntos y cómo avisarme ---------- */
const AG_WIN = 5;   /* minutos: lo que cabe en "a la misma hora" */
/* Sin el permiso de Android 14+, Android la deja como notificación normal: no falla, solo no enciende la pantalla */
function agFsHint() {
  const st = state.haStatus; if (isWatch() || !st || st.fullScreen !== false) return '';
  return '<small class="muted" style="display:block;margin-top:6px">Android pide «Notificaciones de pantalla completa». Sin ese permiso llegará como notificación normal. <button type="button" class="btn small" data-act="ha-perm" data-t="fullScreen">Permitir</button></small>';
}
/* Todos los avisos de los próximos días (pantalla completa y solo notificación), agrupados por cercanía */
function agGroups(past) {
  if (isWatch() || !HA) return [];
  const now = Date.now(), all = [];
  state.reminders.forEach((r, ri) => {
    if (!r.on) return;
    const hm = r.time.split(':').map(Number);
    for (let d = 0; d < 14; d++) {
      const at = new Date(); at.setDate(at.getDate() + d); at.setHours(hm[0], hm[1], 0, 0);
      if (at.getTime() <= now + (past ? -past : 5000) || r.days.indexOf(at.getDay()) < 0) continue;
      const it = haItemFor(r, ri, at, d); if (it) all.push(Object.assign({}, it, { full: haFull(r), hk: ri + '@' + dk(at) + r.time }));
    }
  });
  all.sort((a, b) => a.at - b.at);
  const out = []; let k = 0;
  while (k < all.length) {
    const L = [all[k]]; let j = k + 1;
    while (j < all.length && all[j].at - all[k].at <= AG_WIN * 60000) L.push(all[j++]);
    k = j;
    if (L.length < 2) continue;
    const names = L.map(x => x.title), full = L.some(x => x.full);
    out.push({ id: L[0].id, at: L[0].at, title: L.length + ' recordatorios', body: names.join(', '), time: L[0].time, day: L[0].day, kind: 'group', habit: '', name: L.length + ' recordatorios', again: 0, skipBtn: true, ok: '¡Hecho todo!', full,
      group: L.map(x => ({ id: x.id, habit: x.habit, kind: x.kind, day: x.day, name: x.title, rk: x.rk, hk: x.hk })) });
  }
  return out;
}
const _haItemsAG = haItems;
haItems = function () {
  const base = _haItemsAG.apply(this, arguments); if (isWatch()) return base;
  const G = agGroups(), inG = {}, ring = haRing();
  G.forEach(g => g.group.forEach(x => { inG[x.id] = 1; }));
  return base.filter(x => !inG[x.id]).map(x => Object.assign(x, { skipBtn: true })).concat(G.map(g => Object.assign({}, g, { ring: g.full ? ring : 3 })));
};
/* Los que van en grupo no salen además como notificación suelta */
let agGC = null;
const _remSkipAG = remSkip;
remSkip = function (r, d, at) {
  if (!isWatch() && HA) { agGC = agGC || agGroups(); const rk = agRk(r), day = dk(at); if (agGC.some(g => g.group.some(x => x.rk === rk && x.day === day))) return true; }
  return _remSkipAG.apply(this, arguments);
};
const _scheduleAllAG = scheduleAll;
scheduleAll = function () { agGC = null; return _scheduleAllAG.apply(this, arguments); };
/* Con la app abierta: la misma lista */
const agGShown = {};
const _haCheckAG = haCheck;
haCheck = function () {
  if (!isWatch() && HA && !haCur && document.visibilityState !== 'hidden') {
    const t = Date.now();
    agGroups(130000).forEach(g => {
      const key = g.id + '@' + g.day; if (haCur || agGShown[key] || t < g.at || t - g.at > 120000) return;
      agGShown[key] = 1; g.group.forEach(x => { haShown[x.hk] = 1; }); haShow(g);
    });
  }
  return _haCheckAG.apply(this, arguments);
};
const _haShowAG = haShow;
haShow = function (it) {
  const r = _haShowAG.apply(this, arguments); if (!it.group) return r;
  const el = document.querySelector('#hab-alarm .ha-bottom');
  if (el) el.innerHTML = '<div class="ag-gl">' + it.group.map((x, k) => '<div class="ag-gr" data-k="' + k + '"><span class="grow">' + esc(x.name) + '</span><button type="button" class="btn small" data-ag="g1" data-k="' + k + '" data-v="1">Hecho</button><button type="button" class="btn small" data-ag="g1" data-k="' + k + '" data-v="0">Omitir</button></div>').join('') + '</div><button type="button" class="btn primary block" data-ag="gall" data-v="1">Hecho todo</button><button type="button" class="btn block" data-ag="gall" data-v="0">Omitir todo</button>';
  return r;
};
/* Cada recordatorio guarda su propio resultado; omitir cuenta para la regla de los 3 días */
function agSub(x, done) {
  if (x.res) return; x.res = 1;
  const day = x.day || dk(new Date());
  if (done) {
    if (x.habit) { if (haMark(x.habit, day)) saveDaily(); } else if (x.kind === 'water') { haWater(day, 250); saveDaily(); }
    agClear(x.rk);
  } else if (x.habit) habSkip(x.habit, day, true); else agHit(agRem(x.rk), day);
}
function agGroupAnswer(b) {
  const it = haCur; if (!it || !it.group) return;
  const done = b.dataset.v === '1';
  if (b.dataset.ag === 'gall') it.group.forEach(x => agSub(x, done));
  else { const k = +b.dataset.k; agSub(it.group[k], done); const row = b.closest('.ag-gr'); if (row) row.classList.add('ag-off'); }
  if (it.group.every(x => x.res)) { haHide(); render(); toast(b.dataset.ag === 'gall' ? (done ? '¡Hecho todo!' : 'Omitidos por hoy.') : 'Listo.'); }
}

/* ---------- 4. Próxima vez: una sola respuesta para las indicaciones y el análisis ---------- */
/* El coach con esta sesión como la última hecha (la guardada, o la que va en curso) */
function agAfter(s, ex) {
  const keep = state.sessions, k = keep.findIndex(x => x.id === s.id);
  state.sessions = k >= 0 ? keep.slice(k) : [s].concat(keep);
  try { return pgCoach(ex, sGym(s), sKind(s)); } finally { state.sessions = keep; }
}
function agDayOf(s) { return s.planId && s.planId !== 'quick' ? findDay(s.planId, s.dayId).d : null; }
function agPe(s, e) {
  const day = agDayOf(s);
  return (day && day.exercises.find(x => exSame(x.name, e.name))) || { id: 'ag-' + e.name, name: e.name, type: e.type, sets: e.target || e.sets.length, weight: 0 };
}
/* La sesión en curso como una guardada, con sus series sin descanso completo */
function agLive(d) {
  const s = exDraftSession(); if (!s) return null;
  const F = agFlags(d);
  s.exercises.forEach(e => { const x = d.exercises.find(y => y.name === e.name), L = x ? x.log.filter(t => t.done) : []; e.sets.forEach((t, j) => { if (F.get(L[j])) t.q = 1; }); });
  return s;
}
const agKg = w => fmtKg(w) + ' ' + (state.settings.unit === 'lb' ? 'lb' : 'kg');
const agList = L => (L.length > 1 ? L.slice(0, -1).join(', ') + ' y ' + L[L.length - 1] : L[0] || '');
const agLow = k => zoneName(k).toLowerCase();

/* ---------- 5. Indicación serie por serie ---------- */
function agRxOf(d, e) {
  const rx = (e.coach && e.coach.rx) || pgRx(e.name, d.kind);
  return e.ns === 'ia' && +e.repsMin && +e.repsMax ? Object.assign({}, rx, { rMin: +e.repsMin, rMax: +e.repsMax }) : rx;
}
/* Después de la última serie marcada de ese ejercicio. El peso nunca se cambia solo: W es lo que escribiría "Aplicar" */
function agTip(d, i) {
  const e = d && d.exercises[i]; if (!e) return null;
  let j = -1; e.log.forEach((s, k) => { if (s.done) j = k; });
  if (j < 0) return null;
  const s = e.log[j], r = +s.r || 0, rir = s.rir != null ? +s.rir : null, w = +s.w || 0, load = w > 0, rx = agRxOf(d, e), name = e.name;
  const left = e.log.filter(x => !x.done), next = left[0];
  if (!next) {
    const L = agLive(d), x = L && L.exercises.find(y => y.name === name); if (!x) return null;
    const c = agAfter(L, agPe(L, x)), nw = +c.w || 0;
    return { t: nw ? (nw === w ? 'La próxima vez repite ' + agKg(nw) : 'La próxima vez empieza con ' + agKg(nw)) : 'La próxima vez busca ' + c.goal[0] + (rx.sec ? ' s' : ' reps'), k: 'end' };
  }
  const quick = !!agFlags(d).get(s), tired = quick || !!((typeof ssOf === 'function' && ssOf(d, e)) || (d.ssT || []).indexOf(name) >= 0);   /* en superserie nunca pide bajar */
  if (r > rx.rMax && (rir == null || rir >= 2)) {
    const did = 'Hiciste ' + r + (rir != null ? ' con RIR ' + rir : '');
    if (!load) return { t: did + ': vas sobrado, sigue con esa técnica', k: 'ok' };
    const W = pgRound(name, w + pgStep(name, w));
    return { t: did + ': sube a ' + agKg(W) + ' en la próxima', W, k: 'up' };
  }
  if (!tired) {
    if (r > 0 && (r < rx.rMin || (j === 0 && rir === 0 && r < rx.rMax))) {
      if (!load) return { t: 'Muy duro (' + r + ' reps): descansa un poco más', k: 'down' };
      const W = Math.max(0, Math.min(w - pgInc(name, w), pgRound(name, w * (1 - 0.04 * Math.max(1, rx.rMin - r)), true)));
      return { t: 'Muy pesado (' + r + ' reps' + (rir === 0 ? ', RIR 0' : '') + '): baja a ' + agKg(W), W, k: 'down' };
    }
    const p = j > 0 ? +e.log[j - 1].r || 0 : 0;
    if (p && p - r >= Math.max(4, Math.ceil(p * 0.3))) return { t: 'Cayeron de ' + p + ' a ' + r + ' reps: descansa 30 s más antes de la siguiente', k: 'rest' };
  }
  if (quick) return { t: 'Sin descanso completo: ' + (load ? 'mantén ' + agKg(w) : 'sigue igual') + ', no cuenta en tu contra', k: 'ok' };
  if (left.length === 1 && e.log.length > 1 && pgTypeOf(name) === 'comp') return { t: 'Última serie: deja 1 repetición en reserva', k: 'ok' };
  return { t: 'Bien: ' + (load ? 'mantén ' + agKg(w) : 'sigue así'), k: 'ok' };
}
function agTipPut() {
  const d = state.draft; if (!d || isWatch()) return;
  document.querySelectorAll('#sx-pager > .sx-page').forEach(pg => {
    const card = pg.querySelector('.card.ex'), i = +pg.dataset.i; if (!card) return;
    const old = card.querySelector('.ag-tip'); if (old) old.remove();
    const T = agTip(d, i), e = d.exercises[i], next = e && e.log.find(x => !x.done);
    /* La indicación ocupa el lugar del consejo fijo: nunca los dos a la vez */
    card.querySelectorAll('.coach,.su-coach').forEach(n => n.classList.toggle('ag-hide', !!T));
    if (!T) return;
    const btn = T.W != null && next && +next.w !== T.W ? '<button type="button" class="btn small" data-ag="apply" data-i="' + i + '" data-w="' + T.W + '">Aplicar</button>' : '';
    const h = '<div class="ag-tip ' + T.k + '"><span class="grow">' + esc(T.t) + '</span>' + btn + '</div>';
    const at = card.querySelector('.su-pills'); if (at) at.insertAdjacentHTML('afterend', h); else card.insertAdjacentHTML('afterbegin', h);
  });
}
/* La pantalla completa de fin de descanso dice lo mismo, junto a "Sigue: ..." */
function agTipLast() {
  const d = state.draft; if (!d) return null;
  let at = 0, i = -1; d.exercises.forEach((e, k) => e.log.forEach(s => { if (s.done && (s.at || 0) >= at) { at = s.at || 0; i = k; } }));
  return i < 0 ? null : agTip(d, i);
}
const _rfNextAG = rfNext;
rfNext = function () {
  const b = _rfNextAG.apply(this, arguments), T = agTipLast();
  return T ? (b ? b + '\n' : '') + T.t : b;
};
document.addEventListener('click', ev => {
  if (!(ev.target.closest && ev.target.closest('[data-act="rir"]'))) return;
  setTimeout(() => { agTipPut(); if (typeof rfAt !== 'undefined' && rfAt) rfArm(); }, 0);
});

/* ---------- 6. Análisis de la sesión, como un entrenador. Sin internet ni IA ---------- */
function agGood(s) {
  const out = [], kind = sKind(s), wins = s.wins || {}, day = agDayOf(s);
  const pr = Object.keys(wins).filter(n => wins[n] === 'pr');
  if (pr.length) out.push(pr.length === 1 ? 'Récord en ' + pr[0] + ': tu mejor marca aquí.' : 'Récords en ' + agList(pr.slice(0, 3)) + '.');
  const steady = s.exercises.filter(e => {
    const R = e.sets.map(x => +x.r || 0), I = e.sets.map(x => x.rir), rx = pgRx(e.name, kind);
    return e.sets.length > 1 && Math.max.apply(null, R) - Math.min.apply(null, R) <= 1 && R[0] >= rx.rMin && I.every(v => v != null) && I[0] > I[I.length - 1] && I.every((v, k) => !k || v <= I[k - 1]);
  }).map(e => e.name);
  if (steady.length) out.push(agList(steady.slice(0, 3)) + ': mantuviste las repeticiones y el RIR bajó poco a poco, el peso estuvo bien elegido.');
  const q = s.exercises.filter(e => e.sets.some(x => x.q) && +e.sets[0].r > +e.sets[e.sets.length - 1].r);
  if (q.length) out.push(q.map(e => e.name + ' (' + e.sets.map(x => x.r).join(' y ') + ')')[0] + ': la caída fue por la superserie o por descansar menos, no es falta de fuerza. No cuenta en tu contra.');
  if (kind === 'bombeo') {
    const low = s.exercises.filter(e => { const h = state.sessions.find(x => x.date < s.date && sGym(x) === sGym(s) && sKind(x) === 'fuerza' && exIn(x, e.name)), f = h && +pgFirst(exIn(h, e.name)).w, w = +pgFirst(e).w; return f && w && w < f * 0.9 && w >= f * 0.6; }).map(e => e.name);
    if (low.length) out.push('Bajaste el peso de forma razonable para el día de bombeo en ' + agList(low.slice(0, 2)) + '.');
  }
  if (day && day.exercises.every(p => { const e = exIn(s, p.name); return e && e.sets.length >= pgSets(p); })) out.push('Completaste todas las series planeadas.');
  return out.slice(0, 3);
}
function agBalance(s) {
  const off = Math.round((weekStartOf(new Date()) - weekStartOf(new Date(s.date))) / (7 * 864e5)), S = {};
  if (off === 0) wcVolume().rows.forEach(r => { S[r.k] = r.t; }); else { const w = weekSets(off).sets; for (const k in w) S[k] = w[k]; }
  const hit = {}; s.exercises.forEach(e => { const z = zoneShares(e.name); for (const k in z) hit[k] = 1; });
  for (const p of PG_SS_OPP) {
    const a = S[p[0]] || 0, b = S[p[1]] || 0, hi = a >= b ? p[0] : p[1], lo = a >= b ? p[1] : p[0], H = Math.max(a, b), L = Math.min(a, b);
    if ((hit[p[0]] || hit[p[1]]) && H >= 6 && L < H * 0.6) return 'Esta semana van ' + wcR(L) + ' series de ' + agLow(lo) + ' frente a ' + wcR(H) + ' de ' + agLow(hi) + ': suma ' + agLow(lo) + ' para equilibrar.';
  }
  return null;
}
function agFix(s) {
  const kind = sKind(s), out = [], day = agDayOf(s);
  const zero = s.exercises.filter(e => pgTypeOf(e.name) === 'comp').map(e => ({ n: e.name, c: e.sets.filter(x => x.rir === 0).length })).filter(x => x.c);
  if (zero.reduce((a, x) => a + x.c, 0) >= 2) out.push('Llegaste al fallo en ' + agList(zero.map(x => x.n).slice(0, 3)) + ': en los ejercicios pesados deja la última en RIR 1, cuidas las articulaciones y rindes igual.');
  const bal = agBalance(s); if (bal) out.push(bal);
  const min = Math.round((s.durationSec || 0) / 60), goal = pgAvail();
  if (min > goal + 2) {
    const E = s.exercises.filter(e => pgSsOk(e.name) && !e.sets.some(x => x.q)).map(e => e.name), a = E[E.length - 1], b = E.slice(0, -1).reverse().find(n => pgMain(n) !== pgMain(a));
    out.push('Duró ' + min + ' min y tu meta son ' + goal + (a && b ? ': junta ' + b + ' con ' + a + ' en superserie, trabajan músculos distintos.' : ': acorta los descansos de los ejercicios pequeños.'));
  }
  const irr = s.exercises.filter(e => { const C = e.sets.filter(x => !x.q).map(x => +x.r); return C.length > 1 && C.slice(1).some(r => r - C[0] >= 3); })[0];
  if (irr) out.push(irr.name + ': repeticiones irregulares (' + irr.sets.map(x => x.r).join(', ') + '), el peso está bajo.');
  const top = s.exercises.filter(e => +pgFirst(e).r > pgRx(e.name, kind).rMax).map(e => e.name);
  if (top.length) out.push('Pasaste el tope del rango en ' + agList(top.slice(0, 2)) + ': toca subir el peso.');
  const few = (day ? day.exercises : []).map(p => { const e = exIn(s, p.name); return { n: p.name, d: e ? e.sets.length : 0, t: pgSets(p) }; }).filter(x => x.d && x.d < x.t)[0];
  if (few) out.push(few.n + ': hiciste ' + few.d + ' de ' + few.t + ' series planeadas.');
  return out.slice(0, 3);
}
function agNote(e, c) {
  if (c.bw && c.bw.label) return c.bw.label;
  if (e) {
    const C = e.sets.filter(x => !x.q).map(x => +x.r);
    if (e.sets.some(x => x.q)) return 'Sin superserie, para medirlo bien';
    if (C.length > 1 && C.slice(1).some(r => r - C[0] >= 3)) return 'Reps irregulares: peso bajo';
  }
  return '';
}
function agTable(s) {
  const day = agDayOf(s), L = s.exercises.map(e => ({ e, p: agPe(s, e) }));
  if (day) day.exercises.forEach(p => { if (!exIn(s, p.name)) L.push({ e: null, p }); });
  return L.map(o => {
    const c = agAfter(s, o.p), n = Math.max(1, c.n || pgSets(o.p));
    return { n: o.p.name, w: +c.w || 0, reps: c.goal[0], rir: c.rx.t === 'cardio' ? '—' : c.rirT.slice(0, n).join(', '), note: agNote(o.e, c) };
  });
}
function agAnalysisHtml(s) {
  const G = agGood(s), F = agFix(s), T = agTable(s), li = L => '<ul class="ag-ul">' + L.map(t => '<li>' + esc(t) + '</li>').join('') + '</ul>', u = state.settings.unit === 'lb' ? 'lb' : 'kg';
  return (G.length ? '<div class="fs-sec">' + ic('check', 15) + ' Lo que salió bien</div>' + li(G) : '')
    + (F.length ? '<div class="fs-sec">' + ic('target', 15) + ' Lo que conviene ajustar</div>' + li(F) : '')
    + '<div class="fs-sec">' + ic('trending-up', 15) + ' Para tu próxima sesión</div>'
    + '<div class="ag-tbw"><table class="ag-tb"><thead><tr><th>Ejercicio</th><th>Peso (' + u + ')</th><th>Reps</th><th>RIR por serie</th></tr></thead><tbody>'
    + T.map(r => '<tr><td>' + esc(r.n) + (r.note ? '<small>' + esc(r.note) + '</small>' : '') + '</td><td class="num">' + (r.w ? fmtKg(r.w) : '—') + '</td><td class="num">' + r.reps + '</td><td class="num">' + r.rir + '</td></tr>').join('')
    + '</tbody></table></div>';
}
/* Al terminar: reemplaza la lista "Para tu próxima sesión" del resumen; el reloj sigue con la suya */
const _fsHtmlAG = fsHtml;
fsHtml = function (s) {
  const h = _fsHtmlAG.apply(this, arguments); if (isWatch()) return h;
  const k = h.indexOf('Para tu próxima sesión'), a = h.lastIndexOf('<div class="fs-sec">', k);
  /* Solo la lista: lo que viene después (duración, Exportar, Listo) se queda */
  const b = ['<div class="muted pg-time', '<div class="dd-acts', '<button'].map(m => h.indexOf(m, k)).filter(x => x >= 0).sort((x, y) => x - y)[0];
  return k < 0 || a < 0 || b == null ? h : h.slice(0, a) + agAnalysisHtml(s) + h.slice(b);
};
/* En cualquier sesión guardada: en el detalle del día */
const _daySheetAG = daySheet;
daySheet = function (k) {
  const r = _daySheetAG.apply(this, arguments); if (isWatch()) return r;
  const list = state.sessions.filter(s => dk(s.date) === k);
  document.querySelectorAll('#sheet .dd-ses').forEach((n, i) => { if (list[i]) n.insertAdjacentHTML('beforeend', '<details class="ag-an"><summary>Análisis de la sesión</summary>' + agAnalysisHtml(list[i]) + '</details>'); });
  return r;
};

/* ---------- Dibujo ---------- */
const _renderAG = render;
render = function () {
  const r = _renderAG.apply(this, arguments);
  if (isWatch()) return r;
  agNextPut(); agTipPut();
  const hero = !state.draft && state.tab === 'train' && document.querySelector('#app .hoy-hero');
  if (hero && (state.settings.remOff || []).length && !document.querySelector('.ag-rem')) hero.insertAdjacentHTML('beforebegin', agRemCards());
  return r;
};
bootRender();
