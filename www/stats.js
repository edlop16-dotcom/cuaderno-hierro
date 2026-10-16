/* ==========================================================================
   Estadísticas por ejercicio, hábitos a la mano y escudos de mejora.
   - Toca un ejercicio → gráfica de tu historial con tendencia (subiendo/estable/bajando).
   - Hábitos (creatina, proteína, omega 3, agua) arriba en Entrenar y en Perfil,
     con rachas editables día por día.
   - Escudos: verde = superaste la vez anterior (más peso, más reps o más series);
     dorado = récord (mejor 1RM estimado en ese gimnasio).
   ========================================================================== */

/* ---------- Hábitos ---------- */
function supStreak(k) {
  let n = 0; const d = new Date();
  if (!(state.daily[dk(d)] || {})[k]) d.setDate(d.getDate() - 1);
  while ((state.daily[dk(d)] || {})[k]) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
creaStreak = () => supStreak('crea');
const HAB_IC2 = { crea: 'zap', prot: 'coffee', omega: 'fish' };
function habitCard() {
  const t = today(), ml = t.water || 0, pct = Math.min(1, ml / WATER_MIN);
  return `<div class="card habits2" id="habits">
    <div class="row" style="justify-content:space-between"><h3>Hábitos de hoy</h3>
      <div class="row" style="gap:6px"><button class="icon-btn sm" data-act="hab-edit" aria-label="Editar rachas">${ic('calendar-check', 17)}</button><button class="icon-btn sm" data-act="hab-rem" aria-label="Recordatorios">${ic('bell', 17)}</button></div></div>
    <div class="hab-row">${SUPS.map(s => { const on = !!t[s.k], st = supStreak(s.k);
      return `<button class="hab ${on ? 'on' : ''}" data-act="sup" data-k="${s.k}" aria-pressed="${on}"><span class="hab-ic">${on ? ic('check', 18) : ic(HAB_IC2[s.k] || 'pill', 18)}</span><b>${s.name}</b><small>${st ? `🔥 ${st} ${st === 1 ? 'día' : 'días'}` : esc(s.dose)}</small></button>`; }).join('')}</div>
    <div class="hab-water"><span class="hab-ic w">${ic('droplet', 18)}</span>
      <div class="grow" style="min-width:0"><div class="row" style="justify-content:space-between"><b>Agua</b><span class="num muted">${fmtKg(ml / 1000)} / 2,5 L</span></div><div class="wbar2"><i style="width:${(pct * 100).toFixed(0)}%"></i></div></div>
      <button class="wbtn minus" data-act="water" data-ml="-250" aria-label="Quitar 250 ml">${ic('minus', 16)}</button><button class="wbtn" data-act="water" data-ml="250">+250</button></div>
  </div>`;
}
dailyPanel = habitCard;

function habSheet() {
  const dates = []; for (let i = 13; i >= 0; i--) { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - i); dates.push(d); }
  const tk = dk(new Date());
  openSheet(`<div class="row"><h2 class="grow">Tus rachas</h2><button class="icon-btn" data-act="sheet-close" aria-label="Cerrar">${ic('x', 18)}</button></div>
    <div class="muted" style="font-size:13px">Toca un día para marcarlo o desmarcarlo. Si perdiste la cuenta, escribe cuántos días seguidos llevas y toca Aplicar.</div>
    ${SUPS.map(s => `<div class="hab-ed"><div class="row" style="justify-content:space-between"><b>${ic(HAB_IC2[s.k] || 'pill', 16)} ${s.name}</b><span class="chip">🔥 ${supStreak(s.k)} ${supStreak(s.k) === 1 ? 'día' : 'días'}</span></div>
      <div class="hab-days">${dates.map(d => { const k = dk(d), on = !!(state.daily[k] || {})[s.k]; return `<button class="hd ${on ? 'on' : ''} ${k === tk ? 'today' : ''}" data-act="hab-day" data-k="${s.k}" data-d="${k}" aria-pressed="${on}" aria-label="${s.name} ${fmtDate(d.toISOString(), true)}"><small>${'DLMMJVS'[d.getDay()]}</small><span>${d.getDate()}</span></button>`; }).join('')}</div>
      <div class="hab-set"><span class="muted">Llevo</span><input type="number" inputmode="numeric" min="0" max="180" id="hs-${s.k}" value="${supStreak(s.k)}" aria-label="Días seguidos de ${s.name}"><span class="muted">días seguidos</span><button class="btn small" data-act="hab-streak" data-k="${s.k}">Aplicar</button></div></div>`).join('')}
    <div class="grid2"><button class="btn" data-act="hab-newrem">${ic('bell', 16)} Recordatorio</button><button class="btn primary" data-act="sheet-close">Listo</button></div>`);
}
function setStreak(k, n) {
  const d = new Date(); d.setHours(12, 0, 0, 0);
  if (!(state.daily[dk(d)] || {})[k]) d.setDate(d.getDate() - 1);
  for (let i = 0; i < n; i++) { const key = dk(d); state.daily[key] = state.daily[key] || { water: 0 }; state.daily[key][k] = true; d.setDate(d.getDate() - 1); }
  const key = dk(d); if ((state.daily[key] || {})[k]) state.daily[key][k] = false;   // la racha queda exactamente en n
  saveDaily();
}

/* ---------- Estadísticas por ejercicio ---------- */
const avg = a => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
function exPoints(name, gym) {
  return state.sessions.slice().reverse().filter(s => gym === 'all' || sGym(s) === gym).map(s => {
    const e = s.exercises.find(x => x.name === name); if (!e || !e.sets.length) return null;
    const top = e.sets.reduce((a, x) => x.w > a.w || (x.w === a.w && x.r > a.r) ? x : a, e.sets[0]);
    return { s, d: s.date, gym: sGym(s), sets: e.sets, top, e: Math.max.apply(null, e.sets.map(x => e1rm(x.w, x.r))), vol: e.sets.reduce((a, x) => a + x.w * x.r, 0) };
  }).filter(Boolean);
}
function histWins(pts, name) {   // escudo por sesión comparando con la anterior en el mismo gimnasio
  const best = {}, last = {};
  return pts.map(p => {
    const stored = p.s.wins && p.s.wins[name];
    let w = null; const b = best[p.gym], l = last[p.gym];
    if (b != null && p.e > b + 0.01) w = 'pr';
    else if (l && (p.top.w > l.top.w || (p.top.w === l.top.w && p.top.r > l.top.r) || p.sets.length > l.sets.length || p.vol > l.vol * 1.03)) w = 'up';
    best[p.gym] = Math.max(b || 0, p.e); last[p.gym] = p;
    return stored || w;
  });
}
function trendOf(pts) {
  if (pts.length < 2) return null;
  const k = Math.max(1, Math.min(3, Math.floor(pts.length / 2)));
  const a = avg(pts.slice(-k).map(p => p.e)), b = avg(pts.slice(-2 * k, -k).map(p => p.e));
  const pct = b ? (a - b) / b * 100 : 0;
  return { pct, dir: pct > 1.5 ? 'up' : pct < -1.5 ? 'down' : 'flat' };
}
function exStats(name) {
  const used = [...new Set(state.sessions.filter(s => s.exercises.some(e => e.name === name)).map(sGym))];
  let gym = state.statsGym || 'all'; if (gym !== 'all' && !used.includes(gym)) gym = 'all';
  const pts = exPoints(name, gym), wins = histWins(pts, name), tr = trendOf(pts), rec = typeof baseRec === 'function' ? baseRec(name) : null;
  const chart = pts.length ? stChart(name, pts) : '';
  const best = pts.reduce((a, p) => !a || p.e > a.e ? p : a, null), lastP = pts[pts.length - 1], first = pts[0];
  const TR = { up: ['Subiendo', 'arrow-up', 'up'], flat: ['Estable', 'arrow-right', 'flat'], down: ['Bajando', 'arrow-down', 'down'] };
  const t = tr ? TR[tr.dir] : null;
  const x = libFind(name);
  openSheet(`<div class="row"><div class="grow" style="min-width:0"><div class="label">${x ? esc(x.group) + ' · ' : ''}Tu progreso</div><h2>${esc(name)}</h2></div><button class="icon-btn" data-act="sheet-close" aria-label="Cerrar">${ic('x', 18)}</button></div>
    ${used.length > 1 ? `<div class="gymbar">${[['all', 'Todos']].concat(used.map(g => [g, gymName(g)])).map(([v, l]) => `<button class="gchip ${gym === v ? 'on' : ''}" data-act="st-gym" data-g="${v}" data-name="${esc(name)}">${esc(l)}</button>`).join('')}</div>` : ''}
    ${pts.length ? `
    <div class="trend ${t ? t[2] : 'flat'}">${t ? `${ic(t[1], 18)}<b>${t[0]}</b><span>${tr.pct >= 0 ? '+' : ''}${fmtKg(tr.pct)} % en tu 1RM estimado (últimas sesiones vs anteriores)` : `${ic('info', 18)}<b>Primera sesión registrada</b><span>Con la próxima verás si vas subiendo.`}</span></div>
    ${chart}
    <div class="stat3"><div><b class="num">${pts.length}</b><span>Sesiones</span></div><div><b class="num">${fmtKg(best.top.w)}×${best.top.r}</b><span>Mejor serie</span></div><div><b class="num">${first !== lastP ? (lastP.top.w - first.top.w >= 0 ? '+' : '') + fmtKg(lastP.top.w - first.top.w) : '—'}</b><span>kg desde el inicio</span></div></div>
    ${rec ? `<div class="muted" style="font-size:12.5px">Récord previo (Raydac · Hevy / Symmetry): <b class="num">${fmtKg(rec.w)} kg × ${rec.r}</b></div>` : ''}
    ${stRecords(pts)}
    <div class="label">Historial</div>
    <div class="st-list">${pts.map((p, i) => [p, wins[i]]).reverse().slice(0, 10).map(([p, w]) => `<div class="st-row"><div class="grow" style="min-width:0"><b>${fmtDate(p.d, true)}</b><small class="muted">${esc(gymName(p.gym))}</small></div>
      <div class="num st-sets">${p.sets.map(z => `${fmtKg(z.w)}×${z.r}`).join(' · ')}</div>${w ? `<span class="win ${w}" title="${w === 'pr' ? 'Récord' : 'Mejoraste'}">${ic('shield', 15)}</span>` : '<span class="win none"></span>'}</div>`).join('')}</div>`
    : `<div class="card empty">${rec ? `Tu récord previo: <b>${fmtKg(rec.w)} kg × ${rec.r}</b> (Raydac). ` : ''}Cuando registres este ejercicio en Forja verás aquí tu gráfica.</div>`}
    <div class="grid2">${x ? `<button class="btn" data-act="how" data-name="${esc(name)}">${ic('book-open', 16)} Ver técnica</button>` : '<span></span>'}<button class="btn primary" data-act="sheet-close">Cerrar</button></div>`);
}

/* ---------- Gráfica tocable (como Hevy): medida, rango y récords ---------- */
const ST_METRICS = { w: ['Mayor peso', 'kg'], e: ['1RM estimado', 'kg'], vol: ['Volumen', 'kg'], reps: ['Reps totales', 'reps'] };
const ST_RANGES = [['1', '1 mes'], ['3', '3 meses'], ['6', '6 meses'], ['all', 'Todo']];
const stVal = (p, m) => m === 'w' ? p.top.w : m === 'e' ? p.e : m === 'vol' ? p.vol : p.sets.reduce((a, x) => a + x.r, 0);
function stChart(name, all) {
  const m = state.stMetric || 'w', rg = state.stRange || 'all';
  const cut = rg === 'all' ? 0 : Date.now() - (+rg) * 30.5 * 864e5;
  let pts = all.filter(p => new Date(p.d).getTime() >= cut); if (!pts.length) pts = all.slice(-1);
  const W = 340, H = 170, L = 40, R = 12, T = 14, B = 22;
  const vals = pts.map(p => stVal(p, m)); let lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
  const pad = Math.max(1, (hi - lo) * 0.15); lo = Math.max(0, Math.floor(lo - pad)); hi = Math.ceil(hi + pad);
  const t0 = new Date(pts[0].d).getTime(), t1 = new Date(pts[pts.length - 1].d).getTime();
  const x = p => pts.length === 1 ? (L + W - R) / 2 : L + (new Date(p.d).getTime() - t0) / Math.max(1, t1 - t0) * (W - L - R);
  const y = v => T + (1 - (v - lo) / Math.max(1, hi - lo)) * (H - T - B);
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p).toFixed(1)},${y(stVal(p, m)).toFixed(1)}`).join('');
  const ticks = [lo, Math.round((lo + hi) / 2), hi];
  const lastP = pts[pts.length - 1];
  state.stPts = pts.map(p => ({ x: x(p), y: y(stVal(p, m)), v: stVal(p, m), d: p.d, top: p.top }));
  return `<div class="st-head"><b class="num" id="st-val">${fmtKg(stVal(lastP, m))} ${ST_METRICS[m][1]}</b><span id="st-date">${fmtDate(lastP.d)}</span>
      <div class="st-range">${ST_RANGES.map(([v, l]) => `<button class="${rg === v ? 'on' : ''}" data-act="st-range" data-v="${v}" data-name="${esc(name)}">${l}</button>`).join('')}</div></div>
    <svg class="chart st-chart" id="st-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${ST_METRICS[m][0]} de ${esc(name)}">
      ${ticks.map(t => `<line x1="${L}" x2="${W - R}" y1="${y(t)}" y2="${y(t)}" stroke="var(--line)" stroke-width="1"/><text x="${L - 6}" y="${y(t) + 3}" text-anchor="end">${fmtKg(t)}</text>`).join('')}
      <path d="${path}L${x(lastP).toFixed(1)},${H - B}L${x(pts[0]).toFixed(1)},${H - B}Z" fill="url(#stg)" stroke="none"/>
      <defs><linearGradient id="stg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity=".28"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>
      <path d="${path}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
      ${state.stPts.map(p => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3" fill="var(--accent)" stroke="var(--surface)" stroke-width="1.5"/>`).join('')}
      <line id="st-cur" x1="${x(lastP)}" x2="${x(lastP)}" y1="${T}" y2="${H - B}" stroke="var(--accent2)" stroke-width="1.2" opacity=".9"/>
      <circle id="st-dot" cx="${x(lastP)}" cy="${y(stVal(lastP, m))}" r="6" fill="var(--accent2)" stroke="#0b0d12" stroke-width="2"/>
      <text x="${L}" y="${H - 5}">${fmtDate(pts[0].d)}</text>${pts.length > 1 ? `<text x="${W - R}" y="${H - 5}" text-anchor="end">${fmtDate(lastP.d)}</text>` : ''}
    </svg>
    <div class="st-metrics">${Object.keys(ST_METRICS).map(k => `<button class="gchip ${m === k ? 'on' : ''}" data-act="st-metric" data-v="${k}" data-name="${esc(name)}">${ST_METRICS[k][0]}</button>`).join('')}</div>`;
}
function stRecords(pts) {
  const by = f => pts.reduce((a, p) => !a || f(p) > f(a) ? p : a, null);
  const bw = by(p => p.top.w * 1000 + p.top.r), be = by(p => p.e), bv = by(p => p.vol);
  let bs = null, br = null;
  pts.forEach(p => p.sets.forEach(z => { if (!bs || z.w * z.r > bs.z.w * bs.z.r) bs = { z, p }; if (!br || z.r > br.z.r || (z.r === br.z.r && z.w > br.z.w)) br = { z, p }; }));
  const row = (l, v, d) => `<div class="rec-row"><span>${l}</span><b class="num">${v}</b><small class="muted">${fmtDate(d)}</small></div>`;
  return `<div class="label rec-h">${ic('trophy', 15)} Récords personales</div><div class="recs">
    ${row('Mayor peso', `${fmtKg(bw.top.w)} kg × ${bw.top.r}`, bw.d)}
    ${row('Mejor 1RM estimado', `${fmtKg(be.e)} kg`, be.d)}
    ${row('Mejor serie (peso × reps)', `${fmtKg(bs.z.w)} × ${bs.z.r} = ${fmtKg(bs.z.w * bs.z.r)} kg`, bs.p.d)}
    ${row('Más repeticiones', `${br.z.r} reps con ${fmtKg(br.z.w)} kg`, br.p.d)}
    ${row('Mayor volumen en una sesión', `${fmtKg(bv.vol)} kg`, bv.d)}</div>`;
}
function stPointer(ev) {
  const svg = document.getElementById('st-chart'); if (!svg || !state.stPts) return;
  const r = svg.getBoundingClientRect(), cx = (('touches' in ev && ev.touches.length ? ev.touches[0].clientX : ev.clientX) - r.left) * (340 / r.width);
  const p = state.stPts.reduce((a, q) => Math.abs(q.x - cx) < Math.abs(a.x - cx) ? q : a, state.stPts[0]);
  const m = state.stMetric || 'w';
  document.getElementById('st-cur').setAttribute('x1', p.x); document.getElementById('st-cur').setAttribute('x2', p.x);
  document.getElementById('st-dot').setAttribute('cx', p.x); document.getElementById('st-dot').setAttribute('cy', p.y);
  document.getElementById('st-val').textContent = `${fmtKg(p.v)} ${ST_METRICS[m][1]}${m === 'w' ? ' × ' + p.top.r : ''}`;
  document.getElementById('st-date').textContent = fmtDate(p.d, true);
}
document.addEventListener('pointerdown', ev => { if (ev.target.closest && ev.target.closest('#st-chart')) { state.stDrag = true; stPointer(ev); } });
document.addEventListener('pointermove', ev => { if (state.stDrag) stPointer(ev); });
document.addEventListener('pointerup', () => { state.stDrag = false; });
document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-act="st-metric"],[data-act="st-range"]'); if (!b) return;
  ev.stopPropagation();
  if (b.dataset.act === 'st-metric') state.stMetric = b.dataset.v; else state.stRange = b.dataset.v;
  const sc = document.querySelector('#sheet .sheet-card'), top = sc ? sc.scrollTop : 0;
  exStats(b.dataset.name);
  const n = document.querySelector('#sheet .sheet-card'); if (n) n.scrollTop = top;
}, true);

/* Botón "Ver mi progreso" en las opciones de cada ejercicio */
const _exActionsSt = exActions;
exActions = function (key) {
  _exActionsSt(key);
  const x = LIB.find(y => y.key === key), box = document.querySelector('#sheet .ex-actions');
  if (x && box) box.insertAdjacentHTML('afterbegin', `<button class="btn block st-btn" data-act="ex-stats" data-name="${esc(x.name)}">${ic('trending-up', 16)} Ver mi progreso</button>`);
};

/* ---------- Escudos de mejora ---------- */
function exBase(e, d) {
  if (e.bestE == null) e.bestE = bestE1rm(e.name, d.gymId || 'rokaz') || 0;
  if (e.prevN == null) e.prevN = (e.prev || []).length;
  return e;
}
function setWin(e, j, d) {
  exBase(e, d);
  const s = e.log[j]; if (!s || !s.done) return null;
  const w = +s.w || 0, r = +s.r || 0;
  if (e.bestE > 0 && e1rm(w, r) > e.bestE + 0.01) return 'pr';
  if (e.refGym || j >= e.prevN) return null;
  const pv = e.prev[j]; if (pv && (w > pv.w || (w === pv.w && r > pv.r))) return 'up';
  return null;
}
function exWin(e, d) {
  exBase(e, d);
  let lvl = null;
  e.log.forEach((s, j) => { const w = setWin(e, j, d); if (w === 'pr') lvl = 'pr'; else if (w === 'up' && !lvl) lvl = 'up'; });
  if (!lvl && !e.refGym && e.prevN > 0 && e.log.filter(stepDone).length > e.prevN) lvl = 'up';    // más series que la vez anterior
  return lvl;
}
function decorateWins() {
  const d = state.draft; if (!d) return;
  const cards = document.querySelectorAll('#app .card.ex');
  d.exercises.forEach((e, i) => {
    const c = cards[i]; if (!c) return;
    const ns = c.querySelectorAll('.sets > span.n:not(.drop-n)');
    e.log.forEach((s, j) => { const w = setWin(e, j, d); if (w && ns[j] && !ns[j].querySelector('.win')) ns[j].insertAdjacentHTML('beforeend', `<span class="win ${w}" title="${w === 'pr' ? 'Récord' : 'Mejoraste'}">${ic('shield', 13)}</span>`); });
    const lvl = exWin(e, d), h = c.querySelector('h3');
    if (lvl && h && !h.querySelector('.winb')) h.insertAdjacentHTML('beforeend', ` <span class="winb ${lvl}">${ic('shield', 12)} ${lvl === 'pr' ? 'Récord' : 'Mejora'}</span>`);
  });
}
const _renderSt = render;
render = function () { _renderSt(); decorateWins(); };

const _markSetSt = markSet;
markSet = function (i, j, v, k) {
  const d = state.draft, e = d && d.exercises[i];
  const before = e && k == null ? setWin(e, j, d) : null, was = e && e.log[j] && e.log[j].done;
  _markSetSt(i, j, v, k);
  const d2 = state.draft, e2 = d2 && d2.exercises[i];
  if (e2 && k == null && !was && e2.log[j] && e2.log[j].done) {
    const w = setWin(e2, j, d2);
    if (w && w !== before) toast(w === 'pr' ? `🛡️ ¡Récord en ${e2.name}! ${fmtKg(+e2.log[j].w || 0)} kg × ${e2.log[j].r}` : `🛡️ ¡Mejoraste! Superaste tu serie ${j + 1} de la vez anterior.`);
  }
};
const _finishSt = finishSession;
finishSession = function () {
  const d = state.draft; const id = d && d.id;
  const wins = {};
  if (d) d.exercises.forEach(e => { const w = exWin(e, d); if (w) wins[e.name] = w; });
  _finishSt();
  const s = id && state.sessions.find(x => x.id === id);
  if (s && Object.keys(wins).length) {
    s.wins = wins; saveLocal();
    const pr = Object.values(wins).filter(w => w === 'pr').length, up = Object.keys(wins).length - pr;
    setTimeout(() => toast(`🛡️ Hoy: ${up ? up + (up === 1 ? ' mejora' : ' mejoras') : ''}${up && pr ? ' · ' : ''}${pr ? pr + (pr === 1 ? ' récord' : ' récords') : ''}`), 2900);
  }
};
/* Historial con escudos */
const _vHistorySt = vHistory;
vHistory = function () {
  const h = _vHistorySt(), list = state.sessions.filter(inGf);
  const parts = h.split('<details class="card hist">');
  return parts.map((p, i) => {
    if (!i) return p;
    const s = list[i - 1], w = s && s.wins ? Object.values(s.wins) : [];
    if (!w.length) return p;
    const pr = w.filter(x => x === 'pr').length, up = w.length - pr;
    return p.replace('</summary>', `<span class="winb ${pr ? 'pr' : 'up'}" style="align-self:flex-start">${ic('shield', 12)} ${pr ? pr + ' récord' + (pr > 1 ? 's' : '') : ''}${pr && up ? ' · ' : ''}${up ? up + ' mejora' + (up > 1 ? 's' : '') : ''}</span></summary>`);
  }).join('<details class="card hist">');
};

/* ---------- Ubicar hábitos arriba ---------- */
const _vTrainSt = vTrain;
vTrain = function () {
  let h = _vTrainSt();
  if (h.indexOf('id="sx"') >= 0 || isWatch()) return h;
  const hc = habitCard(); if (h.indexOf(hc) < 0) return h;
  h = h.replace(hc, '');
  const g = h.indexOf('class="gympill"'), end = g < 0 ? -1 : h.indexOf('</button>', g);
  return end < 0 ? hc + h : h.slice(0, end + 9) + hc + h.slice(end + 9);
};
const _vProfileSt = vProfile;
vProfile = function (sub) {
  const h = _vProfileSt(sub), at = h.indexOf('<div class="seg seg3"');
  return at < 0 ? h : h.slice(0, at) + habitCard() + h.slice(at);
};

document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-act]'); if (!b) return;
  const a = b.dataset.act;
  if (!/^(hab-|ex-stats|st-gym)/.test(a)) return;
  ev.stopPropagation();
  if (a === 'ex-stats') exStats(b.dataset.name);
  if (a === 'st-gym') { state.statsGym = b.dataset.g; exStats(b.dataset.name); }
  if (a === 'hab-edit') habSheet();
  if (a === 'hab-day') { const k = b.dataset.d; state.daily[k] = state.daily[k] || { water: 0 }; state.daily[k][b.dataset.k] = !state.daily[k][b.dataset.k]; state.daily[k].edited = Date.now(); saveDaily(); const sc = document.querySelector('#sheet .sheet-card'), top = sc ? sc.scrollTop : 0; habSheet(); const n = document.querySelector('#sheet .sheet-card'); if (n) n.scrollTop = top; render(); }
  if (a === 'hab-streak') { const n = Math.max(0, Math.min(180, +document.getElementById('hs-' + b.dataset.k).value || 0)); setStreak(b.dataset.k, n); habSheet(); render(); toast(`Racha de ${SUPS.find(s => s.k === b.dataset.k).name}: ${n} ${n === 1 ? 'día' : 'días'}.`); }
  if (a === 'hab-rem') { closeSheet(); state.tab = 'settings'; render(); setTimeout(() => { const t = [...document.querySelectorAll('#app h3')].find(x => /Recordatorios/.test(x.textContent)); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 60); }
  if (a === 'hab-newrem') { if (typeof remSheet === 'function') remSheet(null); }
}, true);

bootRender();

/* ---------- Hábitos personalizados (con racha cada uno) ---------- */
const HAB_ICONS = ['pill', 'zap', 'coffee', 'fish', 'droplet', 'sun', 'moon', 'book-open', 'heart-pulse', 'activity', 'dumbbell', 'star', 'target', 'brain'];
function habList() {
  if (!state.settings.habits) state.settings.habits = pubUser()
    ? [{ k: 'prot', name: 'Proteína', dose: 'en cada comida', icon: 'beef' }, { k: 'hwalk', name: 'Caminar 30 min', dose: 'o tu meta de pasos', icon: 'activity' }, { k: 'hveg', name: 'Frutas y verduras', dose: '5 porciones', icon: 'sun' }, { k: 'hsleep', name: 'Dormir a tiempo', dose: '7-8 horas', icon: 'moon' }]
    : SUPS.map(s => ({ k: s.k, name: s.name, dose: s.dose, icon: HAB_IC2[s.k] || 'pill' }));
  return state.settings.habits;
}
function applyHabits() {
  const list = habList().filter(h => !h.hidden);
  SUPS.length = 0; list.forEach(h => { SUPS.push(h); HAB_IC2[h.k] = h.icon || 'pill'; });
}
applyHabits();
const _renderHab = render;
render = function () { applyHabits(); _renderHab(); };
const _habitCardX = habitCard;
habitCard = function () {
  applyHabits();
  const h = _habitCardX(), a = h.indexOf('<div class="hab-row">'), e = a < 0 ? -1 : h.indexOf('</div>', a);
  const add = `<button class="hab hab-add" data-act="hab-manage" aria-label="Agregar o editar hábitos"><span class="hab-ic">${ic('plus', 18)}</span><b>Hábito</b><small>Agregar</small></button>`;
  return e < 0 ? h : h.slice(0, e) + add + h.slice(e);
};
dailyPanel = habitCard;
function habManage(edit) {
  const list = habList(), h = edit ? list.find(x => x.k === edit) : null;
  openSheet(`<div class="row"><h2 class="grow">Tus hábitos</h2><button class="icon-btn" data-act="sheet-close" aria-label="Cerrar">${ic('x', 18)}</button></div>
    <div class="muted" style="font-size:13px">Cada hábito tiene su propia racha 🔥. Puedes ocultar los que no uses.</div>
    <div class="hm-list">${list.map(x => `<div class="hm-row ${x.hidden ? 'off' : ''}"><span class="hab-ic">${ic(x.icon || 'pill', 18)}</span><div class="grow" style="min-width:0"><b>${esc(x.name)}</b><small class="muted">${esc(x.dose || '')}${x.hidden ? ' · oculto' : ` · 🔥 ${supStreak(x.k)}`}</small></div>
      <button class="icon-btn sm" data-act="hm-edit" data-k="${x.k}" aria-label="Editar ${esc(x.name)}">${ic('square-pen', 16)}</button>
      <button class="switch ${x.hidden ? '' : 'on'}" data-act="hm-tog" data-k="${x.k}" role="switch" aria-checked="${!x.hidden}" aria-label="Mostrar ${esc(x.name)}"><i></i></button></div>`).join('')}</div>
    <form id="f-hab" class="hm-form" data-k="${h ? h.k : ''}">
      <div class="label">${h ? 'Editar hábito' : 'Nuevo hábito'}</div>
      <div class="grid2"><input id="hb-name" required maxlength="22" placeholder="Ej. Vitamina D, Leer, Dormir 8 h" value="${h ? esc(h.name) : ''}">
        <input id="hb-dose" maxlength="22" placeholder="Meta o dosis (opcional)" value="${h ? esc(h.dose || '') : ''}"></div>
      <div class="hm-icons">${HAB_ICONS.map(i => `<label><input type="radio" name="hb-icon" value="${i}" ${(h ? h.icon : 'pill') === i ? 'checked' : ''}><span>${ic(i, 18)}</span></label>`).join('')}</div>
      <div class="grid2">${h && !SUPS_BASE.includes(h.k) ? `<button type="button" class="btn danger" data-act="hm-del" data-k="${h.k}">${state.confirm === 'hm-del' ? '¿Borrar? Toca otra vez' : 'Borrar'}</button>` : (h ? '<button type="button" class="btn" data-act="hab-manage">Cancelar</button>' : '<span></span>')}<button class="btn primary" type="submit">${h ? 'Guardar' : '+ Agregar hábito'}</button></div>
    </form>`);
}
const SUPS_BASE = ['crea', 'prot', 'omega'];
document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-act^="hm-"],[data-act="hab-manage"]'); if (!b) return;
  ev.stopPropagation();
  const a = b.dataset.act, k = b.dataset.k, list = habList();
  if (a === 'hab-manage') { state.confirm = null; habManage(); }
  if (a === 'hm-edit') { state.confirm = null; habManage(k); }
  if (a === 'hm-tog') { const h = list.find(x => x.k === k); if (h) { h.hidden = !h.hidden; savePlans(); habManage(); render(); } }
  if (a === 'hm-del') {
    if (state.confirm === 'hm-del') { state.confirm = null; state.settings.habits = list.filter(x => x.k !== k); savePlans(); habManage(); render(); toast('Hábito borrado.'); }
    else { state.confirm = 'hm-del'; b.textContent = '¿Borrar? Toca otra vez'; }
  }
}, true);
document.addEventListener('submit', ev => {
  if (ev.target.id !== 'f-hab') return;
  ev.preventDefault(); ev.stopImmediatePropagation();
  const f = ev.target, name = document.getElementById('hb-name').value.trim(), dose = document.getElementById('hb-dose').value.trim();
  const icon = (f.querySelector('input[name="hb-icon"]:checked') || {}).value || 'pill';
  if (!name) return;
  const list = habList();
  if (f.dataset.k) { const h = list.find(x => x.k === f.dataset.k); if (h) Object.assign(h, { name, dose, icon }); toast('Hábito actualizado.'); }
  else { list.push({ k: 'h' + uid(), name, dose, icon }); toast(`"${name}" agregado. ¡A sumar racha!`); }
  savePlans(); habManage(); render();
}, true);

/* ---------- La rutina aprende tus pesos: al guardar, cada ejercicio queda con el peso que usaste ---------- */
function learnWeights(s) {
  if (!s) return;
  const gid = sGym(s); let ch = false;
  s.exercises.forEach(e => {
    const top = e.sets.length ? Math.max.apply(null, e.sets.map(x => +x.w || 0)) : 0; if (!top) return;
    state.plans.filter(p => (p.gymId || 'rokaz') === gid).forEach(p => p.days.forEach(d => d.exercises.forEach(x => { if (x.name === e.name && x.weight !== top) { x.weight = top; ch = true; } })));
  });
  if (ch) savePlans();
}
const _finishLearn = finishSession;
finishSession = function () {
  const id = state.draft && state.draft.id;
  _finishLearn();
  if (id) learnWeights(state.sessions.find(x => x.id === id));
};

/* ---------- Tu sesión de piernas en Roka'z (5 oct, Symmetry): asegurar que esté y que la rutina de Roka'z use esos pesos ---------- */
if (!state.settings.importSym3) {
  const SID = 'sym-rokaz-2026-10-05';
  let s = state.sessions.find(x => x.id === SID);
  if (!s) {
    s = { id: SID, date: new Date('2026-10-09T19:00:00-05:00').toISOString(), planId: 'plan2', planName: 'Torso / Pierna · 4 días', dayId: 'p2-lun', dayName: 'Piernas (Pesado)', gymId: 'rokaz', gymName: gymName('rokaz'), kind: 'fuerza', durationSec: 7080, source: 'Symmetry',
      exercises: [
        { name: 'Prensa 45°', type: P, sets: [{ w: 160, r: 18 }, { w: 170, r: 18 }, { w: 170, r: 18 }] },
        { name: 'Sentadilla Hack', type: P, note: 'Con mala técnica, dominar 60', sets: [{ w: 60, r: 12 }, { w: 60, r: 12 }, { w: 60, r: 12 }] },
        { name: 'Hip Thrust', type: P, sets: [{ w: 30, r: 15 }, { w: 30, r: 10 }, { w: 30, r: 11 }] },
        { name: 'Extensión de Pierna', type: P, sets: [{ w: 45, r: 14 }, { w: 45, r: 12 }, { w: 45, r: 12 }] },
        { name: 'Abducción de Cadera', type: P, sets: [{ w: 20, r: 10 }, { w: 20, r: 10 }, { w: 20, r: 10 }] },
      ] };
    state.sessions.push(s); state.sessions.sort((a, b) => b.date.localeCompare(a.date));
    if (typeof sync !== 'undefined') sync.revive([SID]);
  }
  /* Solo piernas: los ejercicios de torso de Roka'z siguen con la referencia de Raydac hasta que los hagas allí */
  learnWeights(s);
  state.settings.importSym3 = 1; saveLocal();
}
bootRender();

/* Corrección: tu sesión de piernas en Roka'z fue el viernes 9 de octubre (no el lunes 5) */
if (!state.settings.symDate9) {
  const SID = 'sym-rokaz-2026-10-05', when = new Date('2026-10-09T19:00:00-05:00').toISOString();
  const s = state.sessions.find(x => x.id === SID);
  if (s && s.date !== when) { s.date = when; state.sessions.sort((a, b) => b.date.localeCompare(a.date)); }
  state.settings.symDate9 = 1; saveLocal(); bootRender();
}
