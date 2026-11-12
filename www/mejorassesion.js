/* ==========================================================================
   Mejoras de la sesión (rama mejoras-sesion). Solo el teléfono: el reloj no cambia.
   1. Mapa del cuerpo: al tocar un músculo, ejercicios recomendados de tu gimnasio (respeta el descanso de 48 h)
      y, con una sesión en marcha, se agregan a ella.
   3. "Anterior": la última sesión del mismo tipo de día (Pesado o Bombeo); si no hay, la última que haya y lo dice.
   6. Racha y Tu semana: deslizar (o las flechas) para ver las semanas anteriores con sus días y entrenos.
   7. La fila de ejercicios de arriba sigue el orden en que los vas haciendo (el mismo que se guarda, mjFirstAt).
   8. Plan para completar la semana: cómo repartir lo que falta en los entrenos que quedan (msPlan). "Crear entreno para
      completar" usa ese mismo reparto (wcBuild lo consulta), así las dos pantallas dicen lo mismo.
   (2, 4 y 5, la superserie, están en superset.js y ajustesgym2.js.)
   ========================================================================== */
const msKindTxt = k => (k === 'fuerza' ? 'pesado' : 'bombeo');
const msNS = n => n + ' ' + (n === 1 ? 'serie' : 'series');
const msLow = k => (zoneName(k) || '').toLowerCase();

/* ---------- 3. "Anterior" del mismo tipo de día ---------- */
/* La última vez de ese ejercicio en ese gimnasio en un día del mismo tipo; si no hay, la última de cualquier tipo (same: false) */
function msLastKind(name, gymId, kind) {
  let other = null;
  for (const s of state.sessions) {
    if (s.approx || sGym(s) !== gymId) continue;
    const x = exIn(s, name); if (!x || !x.sets.length) continue;
    const k = sKind(s);
    if (k === kind) return { date: s.date, sets: x.sets, kind: k, same: true };
    if (!other) other = { date: s.date, sets: x.sets, kind: k, same: false };
  }
  return other;
}
function msPrevPass() {
  const d = state.draft; if (!d || !d.msP || isWatch()) return false;
  let ch = false;
  d.exercises.forEach(e => {
    if (e.msPn === e.name) return;
    e.msPn = e.name; ch = true;
    if (e.refGym) return;   /* referencia de otro gimnasio: no es un "anterior" de aquí */
    const L = msLastKind(e.name, d.gymId || 'rokaz', d.kind); if (!L) return;
    e.prev = L.sets.map(s => ({ w: s.w, r: s.r, drops: (s.drops || []).map(x => ({ w: x.w, r: x.r })) }));
    e.prevN = e.prev.length; e.lastDate = L.date; e.prevKind = L.same ? '' : L.kind; e.prevSame = L.same ? 1 : 0;
  });
  return ch;
}
const _startSessionMS = startSession;
startSession = function (planId, dayId) {
  const r = _startSessionMS.apply(this, arguments), d = state.draft;
  if (d && d.dayId === dayId && !d.msP && !isWatch()) { d.msP = 1; if (msPrevPass()) { saveDraft(); render(); } }
  return r;
};
/* En la tarjeta: el encabezado de la columna y la línea "Anterior en…" dicen de qué tipo de día fue */
function msPrevDecor() {
  const d = state.draft; if (!d || !d.msP || isWatch()) return;
  document.querySelectorAll('#sx-pager > .sx-page').forEach(pg => {
    const e = d.exercises[+pg.dataset.i], card = pg.querySelector('.card.ex'); if (!e || !card || card.querySelector('.ms-pk')) return;
    if (!e.lastDate || e.refGym || (!e.prevKind && !e.prevSame)) return;
    const hd = card.querySelectorAll('.sets > .h')[1];
    if (hd && e.prevKind) hd.innerHTML = 'Anterior<small class="ms-pk">' + msKindTxt(e.prevKind) + '</small>';
    const ln = Array.prototype.filter.call(card.querySelectorAll('div.muted'), n => /^\s*Anterior en /.test(n.textContent))[0];
    if (ln) ln.insertAdjacentHTML('beforeend', e.prevKind ? ` <b class="ms-pk ms-pko">Fue un día de ${msKindTxt(e.prevKind)}: aquí aún no lo haces en un día de ${msKindTxt(d.kind)}.</b>` : ` <span class="ms-pk">Es tu último día de ${msKindTxt(d.kind)}.</span>`);
  });
}

/* ---------- 7. La fila de arriba, en el orden en que haces los ejercicios ---------- */
/* Empezados primero, por la hora de su primera serie (la misma regla con la que se guarda la sesión, mjFirstAt); los que faltan, en su orden */
function msStripOrder(d) {
  const now = Date.now(), T = d.exercises.map((e, i) => ({ i, t: mjFirstAt(e, now) }));
  return T.filter(o => o.t < Infinity).sort((a, b) => a.t - b.t || a.i - b.i).concat(T.filter(o => o.t === Infinity)).map(o => o.i);
}
function msStripPut() {
  const d = state.draft, st = document.getElementById('sx-strip'); if (!d || !st || isWatch()) return;
  const rank = {}; msStripOrder(d).forEach((i, r) => { rank[i] = r; });
  const R = b => (rank[+b.dataset.i] == null ? 999 : rank[+b.dataset.i]);
  Array.prototype.forEach.call(st.querySelectorAll('.sx-th'), b => { b.style.order = R(b) * 2; });
  Array.prototype.forEach.call(st.querySelectorAll('.ss-pair'), w => {
    const rs = Array.prototype.map.call(w.querySelectorAll('.sx-th'), R).sort((a, b) => a - b);
    w.style.order = rs[0] * 2;
    Array.prototype.forEach.call(w.querySelectorAll('.ss-link'), (l, n) => { l.style.order = rs[n] * 2 + 1; });
  });
  const add = st.querySelector('.sx-th-add'); if (add) add.style.order = 99999;
}
const _markSetMS = markSet;
markSet = function () { const r = _markSetMS.apply(this, arguments); if (!isWatch()) msStripPut(); return r; };

/* ---------- 1. Mapa del cuerpo: ejercicios recomendados para ese músculo ---------- */
function msMuscleSheet(k) {
  const z = zoneName(k); if (!z || isWatch()) return;
  const d = state.draft, g = activeGym().id, v = weekSets(0).sets[k] || 0, R = (typeof restMap === 'function' ? restMap() : {})[k];
  const cands = (typeof wcCands === 'function' ? wcCands(k) : []).slice(0, 8), big = REST_BIG.indexOf(k) >= 0;
  const row = n => {
    const L = lastHere(n, g), inS = d ? d.exercises.findIndex(x => exSame(x.name, n)) : -1, eq = typeof suEqLabel === 'function' ? suEqLabel(n) : '';
    const last = L ? 'Última vez: ' + L.sets.slice(0, 3).map(s => (+s.w ? fmtKg(+s.w) + '×' + s.r : s.r + ' reps')).join(', ') + ' · ' + ago(L.date) : 'Nuevo para ti en este gimnasio';
    const btn = !d ? '' : inS >= 0 ? `<button type="button" class="btn small" data-ms="mgo" data-j="${inS}">Ir</button>` : R && R.block ? '' : `<button type="button" class="btn small primary" data-ms="madd" data-n="${esc(n)}">${ic('plus', 15)} Agregar</button>`;
    return `<div class="qk-ex ms-mrow">${thumb(n)}<span class="grow"><b>${esc(n)}</b><small class="muted">${esc((eq ? eq + ' · ' : '') + last)}${inS >= 0 ? ' · ya está en tu sesión' : ''}</small></span>${btn}</div>`;
  };
  const rest = R && R.block ? `<div class="safe warn ms-mrest">${ic('timer', 16)}<span><b>${esc(restWhy(k, R))}.</b> Necesita ${big ? 48 : 24} h de descanso: mejor no lo cargues hoy. Estos son para cuando toque.</span></div>`
    : R && R.soft ? `<div class="safe tip ms-mrest">${ic('timer', 16)}<span>${esc(restWhy(k, R))}: con 24 h basta, pero hoy deja 1-2 repeticiones de sobra (RIR 1-2).</span></div>` : '';
  openSheet(`<div class="row"><h2 class="grow">${esc(z)}</h2><button class="icon-btn" data-act="sheet-close" aria-label="Cerrar">${ic('x', 18)}</button></div>
    <div class="muted" style="font-size:13px"><b class="num">${wcR(v)}</b> de ${WC_MIN} series esta semana${MM_MAIN.indexOf(k) >= 0 && v < WC_MIN ? ` · te faltan ${Math.ceil(WC_MIN - v)}` : ''}. Con el equipo de ${esc(gymName(g))}.</div>
    ${rest}
    <div class="label">Ejercicios recomendados</div>
    <div class="qk-list ms-mlist">${cands.length ? cands.map(row).join('') : '<div class="muted">No encontré ejercicios de este músculo con el equipo de este gimnasio.</div>'}</div>
    ${d ? '' : '<div class="muted" style="font-size:12.5px">Con una sesión en marcha, aquí mismo podrás agregarlos (toca el músculo en «Tu semana en vivo»).</div>'}`);
  const c = document.querySelector('#sheet .sheet-card'); if (c) c.classList.add('ms-msheet');
}
document.addEventListener('click', ev => {
  if (isWatch() || !ev.target.closest) return;
  const z = ev.target.closest('.mm-card .mm-svg [data-z], .lv-box .mm-svg [data-z]');
  if (z) { msMuscleSheet(z.dataset.z); return; }
});

/* ---------- 6. Semanas anteriores en Racha y Tu semana ---------- */
const msW = { st: 0, tw: 0 };
function msWeek(off) {
  const ws = weekStartOf(new Date()); ws.setDate(ws.getDate() - 7 * off);
  const we = new Date(ws); we.setDate(we.getDate() + 7);
  const L = state.sessions.filter(s => { const t = new Date(s.date); return !s.approx && t >= ws && t < we; }).sort((a, b) => (a.date < b.date ? -1 : 1));
  const days = []; for (let i = 0; i < 7; i++) { const d = new Date(ws); d.setDate(d.getDate() + i); const k = dk(d); days.push({ k, label: 'LMMJVSD'[i], trained: L.some(s => dk(s.date) === k) }); }
  const end = new Date(we); end.setDate(end.getDate() - 1);
  const mon = d => fmtDate(d.toISOString()).replace(/\.$/, '');
  return { ws, L, days, min: Math.round(L.reduce((a, s) => a + (+s.durationSec || 0), 0) / 60), label: off === 0 ? 'Esta semana' : off === 1 ? 'Semana pasada' : `Semana del ${mon(ws)} al ${mon(end)}`, range: `${mon(ws)} al ${mon(end)}` };
}
function msMaxOff() {
  if (!state.sessions.length) return 0;
  const first = state.sessions.reduce((a, s) => (s.date < a ? s.date : a), state.sessions[0].date);
  return Math.max(0, Math.min(104, Math.round((weekStartOf(new Date()) - weekStartOf(new Date(first))) / (7 * 864e5))));
}
const msNav = (c, off, label) => `<div class="ms-wn" data-msc="${c}"><button type="button" class="icon-btn sm" data-ms="wk" data-c="${c}" data-d="1" aria-label="Semana anterior" ${off >= msMaxOff() ? 'disabled' : ''}>‹</button><span class="grow ms-wl">${esc(label)}</span><button type="button" class="icon-btn sm" data-ms="wk" data-c="${c}" data-d="-1" aria-label="Semana siguiente" ${off <= 0 ? 'disabled' : ''}>›</button></div>`;
const msSesRows = W => (W.L.length ? W.L.map(s => `<button type="button" class="ms-ses" data-act="day-open" data-k="${dk(s.date)}"><b>${WD[new Date(s.date).getDay()]} ${new Date(s.date).getDate()}</b><span class="grow">${esc(s.dayName || 'Sesión')}${s.planId === 'quick' ? ' · rápido' : ''}</span><span class="muted num">${s.durationSec ? Math.round(s.durationSec / 60) + ' min' : ''}</span></button>`).join('') : '<div class="muted" style="font-size:13px">Esa semana no registraste entrenos.</div>');
function msWeeksPut() {
  if (isWatch() || state.draft || state.tab !== 'train') return;
  const app = document.querySelector('#app.v-hoy'); if (!app || !state.sessions.some(s => !s.approx)) return;
  /* Racha */
  const st = app.querySelector('.streak-card.hoy-st');
  if (st && !st.querySelector('.ms-wn')) {
    const off = Math.min(msW.st, msMaxOff()), W = msWeek(off); msW.st = off;
    st.classList.add('ms-swipe'); st.dataset.msc = 'st';
    if (off > 0) {
      const wk = st.querySelector('.wk'), msg = wk && wk.nextElementSibling;
      const strip = `<div class="wk">${W.days.map(d => (d.trained ? `<div class="wkd on" data-act="day-open" data-k="${d.k}" role="button" tabindex="0" aria-label="Ver lo registrado ese día"><span>${d.label}</span><i>${FLAME('mini')}</i></div>` : `<div class="wkd"><span>${d.label}</span><i></i></div>`)).join('')}</div>`;
      if (wk) wk.outerHTML = strip;
      if (msg && msg.classList.contains('muted')) msg.outerHTML = `<div class="muted" style="font-size:12.5px"><b class="num">${W.L.length}</b> ${W.L.length === 1 ? 'entreno' : 'entrenos'}${W.min ? ' · ' + g3Hm(W.min) : ''} esa semana. Toca un día con llama o un entreno para verlo.</div><div class="ms-sl">${msSesRows(W)}</div>`;
    }
    const at = st.querySelector('.wk'); if (at) at.insertAdjacentHTML('beforebegin', msNav('st', off, W.label));
  }
  /* Tu semana */
  const tw = app.querySelector('.g3-hoy');
  if (tw && !tw.querySelector('.ms-wn')) {
    const off = Math.min(msW.tw, msMaxOff()), W = msWeek(off); msW.tw = off;
    if (off > 0) {
      const S = weekSets(off).sets, short = MM_MAIN.filter(k => S[k] < WC_MIN).sort((a, b) => S[a] - S[b]);
      tw.outerHTML = `<div class="card g3-hoy ms-past ms-swipe" data-msc="tw"><div class="row g3-hh"><h3 class="grow">${ic('person-standing', 17)} Tu semana</h3><span class="muted num">${W.L.length} ${W.L.length === 1 ? 'entreno' : 'entrenos'}${W.min ? ' · ' + g3Hm(W.min) : ''}</span></div>
        ${msNav('tw', off, W.label === 'Semana pasada' ? 'Semana pasada · ' + W.range : W.label)}
        <div class="g3-hb">${bodySVG(S)}<div class="g3-hl">${short.length ? `<div class="label">Quedaron bajo ${WC_MIN}</div><div class="g3-low">${short.slice(0, 4).map(k => `<span class="wc-chip low"><b>${zoneName(k)}</b> <span class="num">${wcR(S[k])}</span></span>`).join('')}${short.length > 4 ? `<span class="muted">y ${short.length - 4} más</span>` : ''}</div>` : `<div class="muted">Todos los músculos llegaron a ${WC_MIN} series.</div>`}</div></div>
        <div class="ms-sl">${msSesRows(W)}</div></div>`;
    } else {
      tw.classList.add('ms-swipe'); tw.dataset.msc = 'tw';
      const hh = tw.querySelector('.g3-hh'); if (hh) hh.insertAdjacentHTML('afterend', msNav('tw', 0, W.label));
      /* 8. Cómo repartir lo que falta */
      const h = msPlanHtml(msPlan(null), true), btn = tw.querySelector('[data-wc="fill"]');
      if (h) { if (btn) btn.insertAdjacentHTML('beforebegin', h); else tw.insertAdjacentHTML('beforeend', h); }
    }
  }
}
function msWkMove(c, dir) {
  const max = msMaxOff(), v = Math.max(0, Math.min(max, (msW[c] || 0) + dir));
  if (v === msW[c]) return false;
  msW[c] = v; render(); return true;
}
/* Flechas (también valen con ratón o lector de pantalla) y deslizar con el dedo */
window.addEventListener('click', ev => {
  const b = ev.target.closest && ev.target.closest('[data-ms]'); if (!b || isWatch()) return;
  const a = b.dataset.ms;
  if (a === 'wk') { ev.preventDefault(); ev.stopPropagation(); msWkMove(b.dataset.c, +b.dataset.d); return; }
  const d = state.draft;
  if (a === 'mgo' && d) { ev.preventDefault(); ev.stopPropagation(); const j = +b.dataset.j; closeSheet(); if (d.exercises[j]) { d.cur = j; saveDraft(); state.sessMin = false; state.tab = 'train'; render(); setTimeout(() => pagerGo(j, true), 60); } return; }
  if (a === 'madd' && d) {
    ev.preventDefault(); ev.stopPropagation();
    const n = b.dataset.n, at = Math.min(d.cur || 0, d.exercises.length - 1);
    closeSheet(); addToDraft([n], at); state.sessMin = false; state.tab = 'train'; render(); setTimeout(() => pagerGo(state.draft ? state.draft.cur : 0, true), 60);
    toast(`Agregado: ${n}${typeof mjLast !== 'undefined' && mjLast ? ' (también en tu rutina)' : ' (solo hoy)'}`);
  }
}, true);
let msTouch = null;
document.addEventListener('touchstart', ev => { const c = ev.target.closest && ev.target.closest('.ms-swipe'); msTouch = c && ev.touches.length === 1 ? { c: c.dataset.msc, x: ev.touches[0].clientX, y: ev.touches[0].clientY } : null; }, { passive: true });
document.addEventListener('touchend', ev => {
  const T = msTouch; msTouch = null; if (!T || isWatch() || !ev.changedTouches.length) return;
  const dx = ev.changedTouches[0].clientX - T.x, dy = ev.changedTouches[0].clientY - T.y;
  if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.8) return;
  msWkMove(T.c, dx > 0 ? 1 : -1);   /* deslizar a la derecha trae la semana anterior */
}, { passive: true });

/* ---------- 8. Plan para completar la semana ---------- */
/* Reparte las series que faltan (las mismas de "Crear entreno para completar": wcVolume) entre los entrenos que quedan:
   - los días de tu rutina que aún tocan (wcPending): primero el que ya trabaja ese músculo, sin pasar de G2_MAX_MUS;
   - los días libres de la hoja (wcFillDays), tantos como entrenos te quedan (g2DaysLeft);
   y siempre con el descanso muscular (restMap): un músculo grande no va al día siguiente de cargarlo fuerte, ni pegado
   a otro día que ya lo trabaja. `force` = día que sí o sí lleva un entreno para completar (el elegido en la hoja). */
const MS_RUT_MAX = 6;
function msPlan(force, V0) {
  if (isWatch() || typeof wcVolume !== 'function' || typeof restMap !== 'function') return null;
  const V = V0 || wcVolume(), sore = soreMap(), today = dk(new Date()), ws = weekStartOf(new Date());
  const need = V.rows.filter(r => r.st === 'low' && !(sore[r.k] && sore[r.k].lvl >= 2)).map(r => ({ k: r.k, n: Math.ceil(WC_MIN - r.t) })).sort((a, b) => b.n - a.n || WC_BIG.indexOf(a.k) - WC_BIG.indexOf(b.k));
  const P = { need, slots: [], out: [], at: () => null };
  if (!need.length) return P;
  const dayTxt = k => (k === today ? 'hoy' : 'el ' + WDL[new Date(k + 'T12:00:00').getDay()].toLowerCase());
  const rut = (V.pend || []).map(dy => {
    const d = new Date(ws); d.setDate(d.getDate() + wcIdx(dy.weekday));
    const vol = {}; dy.exercises.forEach(e => { const sh = zoneShares(e.name); for (const k in sh) vol[k] = (vol[k] || 0) + sh[k] * (+e.sets || 0); });
    return { k: dk(d), type: 'rut', name: dy.name, vol, label: `${dayTxt(dk(d))}, en tu rutina (${dy.name})` };
  }).filter(s => s.k >= today).sort((a, b) => (a.k < b.k ? -1 : 1));
  const trainedToday = state.sessions.some(s => !s.approx && dk(s.date) === today);
  const RC = {}, restOf = k => RC[k] || (RC[k] = restMap(k)), gap = (a, b) => Math.abs(restDays(a + 'T12:00:00', b + 'T12:00:00'));
  /* Un músculo que aún descansa el día base (hoy, o el elegido en la hoja) va al último día libre en que ya descansó: la misma
     regla de wcBuild ("pasa al domingo"). `pin[k]` = ese día, o 'none' si no queda ninguno */
  const base = force || today, FD = wcFillDays(), pin = {};
  need.forEach(x => { const R = restOf(base)[x.k]; if (!(R && R.block)) return; const to = FD.filter(d => d.k > base).reverse().find(d => !((restOf(d.k)[x.k] || {}).block)); pin[x.k] = to ? to.k : 'none'; });
  const pinned = k => Object.keys(pin).some(z => pin[z] === k);
  const free = FD.filter(d => d.k === force || pinned(d.k) || (!rut.some(r => r.k === d.k) && !(d.k === today && trainedToday))).map(d => ({ k: d.k, type: 'libre', vol: {}, label: `${dayTxt(d.k)}, en un entreno para completar` }));
  const sim = S => {
    const hard = {}; S.forEach(s => { s.items = {}; s.extra = 0; for (const k in s.vol) if (s.vol[k] >= 3) (hard[k] = hard[k] || []).push(s.k); });
    const big = k => REST_BIG.indexOf(k) >= 0;
    const ok = (k, s) => { const R = restOf(s.k)[k]; if (R && R.block) return false; return !big(k) || !(hard[k] || []).some(dt => dt !== s.k && gap(dt, s.k) < 2); };
    const put = (s, k, n) => { if (!(n > 0)) return 0; s.items[k] = (s.items[k] || 0) + n; s.extra += n; if (s.items[k] + (s.vol[k] || 0) >= 3) { hard[k] = hard[k] || []; if (hard[k].indexOf(s.k) < 0) hard[k].push(s.k); } return n; };
    const out = []; let placed = 0;
    need.forEach(x => {
      let left = x.n; const k = x.k, fix = pin[k], lib = S.filter(s => s.type === 'libre' && (!fix || s.k === fix));
      if (!fix) S.forEach(s => { if (s.type === 'rut' && (s.vol[k] || 0) >= 1 && left > 0 && ok(k, s)) left -= put(s, k, Math.min(left, G2_MAX_MUS - Math.ceil(s.vol[k]), MS_RUT_MAX - s.extra)); });
      lib.forEach((s, n) => { if (left <= 0 || !ok(k, s)) return; const more = lib.slice(n + 1).filter(z => ok(k, z) && (!big(k) || gap(z.k, s.k) >= 2)).length; left -= put(s, k, Math.min(G2_MAX_MUS, Math.ceil(left / (1 + more)))); });
      if (!fix) S.forEach(s => { if (s.type === 'rut' && !((s.vol[k] || 0) >= 1) && left > 0 && ok(k, s)) left -= put(s, k, Math.min(left, 4, MS_RUT_MAX - s.extra)); });
      placed += x.n - left;
      if (left > 0) { const R = restOf(today)[k]; out.push({ k, n: left, why: left < x.n ? 'más de ' + G2_MAX_MUS + ' series de un músculo en una sesión ya no suman' : R && R.block ? restWhy(k, R).toLowerCase() + ' y no queda un día con descanso suficiente' : 'no queda un día con descanso suficiente esta semana' }); }
    });
    return { placed, out, S };
  };
  const clone = L => L.map(s => Object.assign({}, s));
  /* Días libres: tantos como entrenos te quedan (g2DaysLeft), más los que piden los músculos que descansan. Entre las
     combinaciones posibles, la que deja más series colocadas; a igualdad, menos días y los más cercanos */
  const must = free.filter(s => s.k === force || pinned(s.k)), opt = free.filter(s => must.indexOf(s) < 0);
  const want = Math.max(0, Math.min(opt.length, Math.max(1, typeof g2DaysLeft === 'function' ? g2DaysLeft(V) : 1) - (force ? 1 : 0)));
  const combos = n => { const out = []; const rec = (i, cur) => { if (cur.length === n) { out.push(cur.slice()); return; } for (let j = i; j < opt.length; j++) { cur.push(opt[j]); rec(j + 1, cur); cur.pop(); } }; rec(0, []); return out; };
  let best = null;
  const tryS = L => { L = must.concat(L); const r = sim(clone(rut).concat(clone(L)).sort((a, b) => (a.k < b.k ? -1 : a.k > b.k ? 1 : a.type === 'rut' ? -1 : 1))); if (!best || r.placed > best.placed || (r.placed === best.placed && L.length < best.n)) { best = r; best.n = L.length; } };
  tryS([]);
  for (let n = 1; n <= want && best.out.some(x => !pin[x.k] || pin[x.k] !== 'none'); n++) combos(n).forEach(tryS);
  if (!best) return P;
  P.slots = best.S.filter(s => s.extra > 0 || s.k === force).map(s => ({ k: s.k, type: s.type, name: s.name || '', label: s.label, items: need.filter(x => s.items[x.k]).map(x => ({ k: x.k, n: s.items[x.k] })) }));
  P.out = best.out;
  /* Para "Crear entreno para completar" del día `day`: cuántas series de ese músculo van ahí y a dónde va el resto */
  P.at = (day, k) => {
    const me = P.slots.find(s => s.k === day && s.type === 'libre'), n = me ? ((me.items.find(x => x.k === k) || {}).n || 0) : 0;
    const more = P.slots.filter(s => s !== me && s.items.some(x => x.k === k)).map(s => ({ to: s.label, n: s.items.find(x => x.k === k).n, rut: s.type === 'rut' }));
    return me || more.length ? { n, more } : null;
  };
  return P;
}
function msPlanHtml(P, short) {
  if (!P || !P.need.length || (!P.slots.some(s => s.items.length) && !P.out.length)) return '';
  const cap = t => t.charAt(0).toUpperCase() + t.slice(1);
  const rows = P.slots.filter(s => s.items.length).map(s => `<div class="ms-pr ${s.type}"><b>${esc(cap(s.label.split(',')[0]))}</b><span class="grow">${s.type === 'rut' ? `En tu rutina (${esc(s.name)}), suma ` : 'Entreno para completar: '}${(short ? s.items.slice(0, 4) : s.items).map(x => `${msLow(x.k)} <b class="num">${s.type === 'rut' ? '+' : ''}${x.n}</b>`).join(', ')}${short && s.items.length > 4 ? ' y ' + (s.items.length - 4) + ' más' : ''}</span></div>`).join('');
  const out = P.out.length ? `<div class="ms-pr out"><b>Sin día</b><span class="grow">${P.out.map(x => `${msLow(x.k)} ${x.n} (${esc(x.why)})`).join('; ')}. No es grave: lo compensas la semana que viene.</span></div>` : '';
  return `<div class="ms-plan"><div class="label">${short ? 'Cómo repartirlo' : 'Cómo queda repartida tu semana'}</div>${rows}${out}<div class="muted ms-pn">Respeta el descanso: un músculo grande necesita 48 h después de cargarlo fuerte.</div></div>`;
}
/* En la hoja "Entreno para completar": el mismo reparto, con el día elegido */
const _wcFillSheetMS = wcFillSheet;
wcFillSheet = function () {
  const r = _wcFillSheetMS.apply(this, arguments); if (isWatch()) return r;
  const c = document.querySelector('#sheet .wc-sheet'); if (!c || c.querySelector('.ms-plan')) return r;
  const h = msPlanHtml(msPlan(wc.day), false); if (!h) return r;
  const at = c.querySelector('.grid2'); if (at) at.insertAdjacentHTML('beforebegin', h); else c.insertAdjacentHTML('beforeend', h);
  return r;
};

/* ---------- Dibujo ---------- */
const _renderMS = render;
render = function () {
  const ch = msPrevPass(); if (ch) saveDraft();
  const r = _renderMS.apply(this, arguments);
  if (isWatch()) return r;
  msPrevDecor(); msStripPut(); msWeeksPut();
  return r;
};
bootRender();
