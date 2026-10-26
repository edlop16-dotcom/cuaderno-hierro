/* ==========================================================================
   Tanda J (24-oct-2026)
   1. Reemplazar ejercicio (teléfono): TODAS las alternativas del mismo músculo, con todo tipo de equipo, buscador,
      filtro por equipo y marca de las que no hay en el gimnasio de hoy (se pueden elegir igual).
   3. Importar de la IA: el nombre se lee sin las notas de la exportación ("(kg en discos + barra 20)").
   4-5. Durante la sesión (teléfono): bajo cada ejercicio, tu semana en vivo (mapa y series por músculo, contando
      cada serie que marcas) y, al terminar todas las series de un ejercicio, qué conviene priorizar después.
   6. Reloj: aviso si te pasas del descanso recomendado o de la duración recomendada de la sesión; si el exceso
      crece, el aviso sube (más vibración y sonido). Ajustes → Fin del descanso (`settings.wOver`, activado).
   8. Exportaciones para la IA: en qué gimnasio fue cada sesión y qué equipo hay en ese gimnasio.
   ========================================================================== */

/* ---------- 3. Importar: nombres sin las notas de la exportación ---------- */
if (typeof riMatch === 'function') { const _riMatchJ = riMatch; riMatch = function (raw) { return _riMatchJ(exClean(raw)); }; }
if (typeof nsMatch === 'function') {
  const _nsMatchJ = nsMatch;
  nsMatch = function (rows, dayEx) { (rows || []).forEach(r => { if (r && typeof r.raw === 'string') r.raw = exClean(r.raw); }); return _nsMatchJ(rows, dayEx); };
}

/* ---------- 1. Reemplazar ejercicio: todas las alternativas ---------- */
function altJAll(e, d) {
  const x = libFind(e.name); if (!x) return [];
  const m = catMain(x), fam = ALT_FAM[x.pat], inDay = new Set(d.exercises.map(y => y.name)), out = [];
  LIB.forEach(y => {
    if (y === x || y.hidden || inDay.has(y.name) || catMain(y) !== m) return;
    let s = 0;
    const same = y.pat === x.pat || (!!fam && ALT_FAM[y.pat] === fam);
    if (y.pat === x.pat) s += 40; else if (same) s += 20; else if (!!y.iso !== !!x.iso) s -= 30;
    if (!!y.iso === !!x.iso) s += 10;
    if (!!y.uni === !!x.uni) s += 4;
    if (y.eq !== x.eq) s += 15; if (equipOf(y) !== equipOf(x)) s += 5;
    const last = lastPerf(y.name, d.gymId, d.kind, true), done = doneBefore(y.name);
    if (last) s += 12; else if (done) s += 5;
    if (!y.cat) s += 6;
    if ((y.bw || y.eq === 'banda') && !(x.bw || x.eq === 'banda')) s -= 25;
    out.push({ n: y.name, y, s, same, other: y.eq !== x.eq, no: !exAvail(y.name, d.gymId), inj: altInjured(y), fam: equipOf(y), last, done, cv: altConvert(e.name, y.name, workW(e)) });
  });
  return out.sort((a, b) => (a.no - b.no) || (a.inj - b.inj) || (b.s - a.s) || a.n.localeCompare(b.n));
}
function altJList() {
  const A = state.altJ, d = state.draft, e = d && A && d.exercises[A.i], box = document.getElementById('alt-list'); if (!e || !box) return;
  const q = normName(A.q || '').trim().split(/\s+/).filter(Boolean);
  const L = A.all.filter(c => (A.f === 'all' || c.fam === A.f) && q.every(t => catHay(c.y).indexOf(t) >= 0));
  const row = c => altRow(c, A.i, e, d).replace('class="sw-row"', `class="sw-row${c.no ? ' alt-off' : ''}"`)
    .replace('</small>', `${c.no ? ` · <span class="alt-tag no">No hay en ${esc(gymName(d.gymId))}</span>` : ''}${c.inj ? ' · <span class="alt-tag inj">Ojo con tu molestia</span>' : ''}</small>`);
  const mov = L.filter(c => c.same && !c.no), rest = L.filter(c => !c.same && !c.no), no = L.filter(c => c.no);
  const mus = (CAT_MUS.find(m => m[0] === catMain(libFind(e.name))) || [0, 'ese músculo'])[1].toLowerCase();
  box.innerHTML = L.length ? (mov.length ? `<div class="label">Mismo movimiento (${mov.length})</div>${mov.map(row).join('')}` : '')
    + (rest.length ? `<div class="label">Otros para ${esc(mus)} (${rest.length})</div>${rest.map(row).join('')}` : '')
    + (no.length ? `<div class="label">No hay en ${esc(gymName(d.gymId))} (${no.length})</div>${no.map(row).join('')}` : '')
    : `<div class="muted">Ningún ejercicio coincide${A.q ? ` con «${esc(A.q)}»` : ''}.</div>`;
  document.querySelectorAll('#alt-f [data-altf]').forEach(b => b.classList.toggle('on', b.dataset.altf === A.f));
}
const _swapSheetJ = swapSheet;
swapSheet = function (i) {
  const d = state.draft, e = d && d.exercises[i]; if (!e) return;
  if (isWatch() || !libFind(e.name)) return _swapSheetJ(i);
  const all = altJAll(e, d), doneN = e.log.filter(s => s.done).length, fams = CAT_FAM.filter(f => all.some(c => c.fam === f[0]));
  state.altJ = { i, q: '', f: 'all', all };
  openSheet(`<div class="row"><h2 class="grow">Cambiar ejercicio</h2><button class="icon-btn" data-act="sheet-close" aria-label="Cerrar">${ic('x', 18)}</button></div>
    <div class="muted" style="font-size:12.5px">En lugar de <b>${esc(e.name)}</b>: todos los del mismo músculo, con cualquier equipo; primero el mismo movimiento. ${doneN ? `Tus ${doneN} ${doneN === 1 ? 'serie hecha queda' : 'series hechas quedan'} guardada${doneN === 1 ? '' : 's'}; el nuevo lleva las ${e.log.length - doneN} que faltan.` : ''}</div>
    <input id="alt-q" class="alt-q" type="search" placeholder="Buscar: mancuernas, polea, Smith…" aria-label="Buscar alternativa" autocomplete="off">
    <div class="qk-chips alt-f" id="alt-f" role="group" aria-label="Filtrar por equipo"><button type="button" class="qk-chip on" data-altf="all">Todos (${all.length})</button>${fams.map(f => `<button type="button" class="qk-chip" data-altf="${f[0]}">${esc(f[1])} (${all.filter(c => c.fam === f[0]).length})</button>`).join('')}</div>
    <div class="sw-list" id="alt-list"></div>
    <label class="sw-keep"><input type="checkbox" id="sw-keep" ${doneN ? 'disabled' : ''}> Cambiarlo también en mi rutina</label>
    ${altNoBtn(e, i, d.gymId)}
    <div class="muted" style="font-size:11.5px">El peso con “~” es una conversión prudente (un 10 % menos y redondeado hacia abajo): ajústalo en la 1.ª serie. Si ya hiciste ese ejercicio, se usa tu historial. Lo que dice «No hay en …» lo marcaste como equipo que falta; puedes elegirlo igual.</div>`);
  altJList();
};
window.addEventListener('input', ev => { if (ev.target && ev.target.id === 'alt-q' && state.altJ) { state.altJ.q = ev.target.value; altJList(); } }, true);
window.addEventListener('click', ev => {
  const b = ev.target.closest && ev.target.closest('[data-altf]'); if (!b || !state.altJ) return;
  ev.preventDefault(); ev.stopPropagation(); state.altJ.f = b.dataset.altf; altJList();
}, true);

/* ---------- 4-5. Tu semana en vivo bajo cada ejercicio (teléfono) ---------- */
function lvNext(d, i) {
  const V = wcVolume(), sore = soreMap();
  const low = V.rows.filter(r => r.st === 'low' && !(sore[r.k] && sore[r.k].lvl >= 2)).sort((a, b) => a.t - b.t);
  if (!low.length) return { ok: 1 };
  const open = (x, k) => k !== i && !x.log.every(s => s.done);
  for (const r of low) {
    const j = d.exercises.findIndex((x, k) => open(x, k) && wcMain(x.name) === r.k);
    if (j >= 0) return { k: r.k, need: Math.ceil(WC_MIN - r.t), j, low };
  }
  const r = low[0], add = wcCands(r.k).find(n => !d.exercises.some(x => exSame(x.name, n)));
  return { k: r.k, need: Math.ceil(WC_MIN - r.t), add, low };
}
function lvNextHtml(d, i) {
  const N = lvNext(d, i);
  if (N.ok) return `<div class="lv-next ok">${ic('check', 16)}<span>Vas bien: contando lo que te queda de la semana, ningún músculo queda bajo ${WC_MIN} series.</span></div>`;
  const what = `<b>${zoneName(N.k)}</b> (faltan ${N.need} series esta semana)`;
  const more = N.low.filter(r => r.k !== N.k).slice(0, 2).map(r => zoneName(r.k).toLowerCase());
  return `<div class="lv-next">${ic('target', 16)}<span>Ahora conviene priorizar ${what}${more.length ? `; después ${more.join(' y ')}` : ''}.
    ${N.j != null ? `<button type="button" class="btn small" data-lv="go" data-j="${N.j}">Ir a ${esc(d.exercises[N.j].name)}</button>` : N.add ? `<button type="button" class="btn small" data-lv="add" data-n="${esc(N.add)}" data-i="${i}">Agregar ${esc(N.add)}</button>` : ''}</span></div>`;
}
function lvBox(d, i, W) {
  const e = d.exercises[i], sh = zoneShares(e.name), ks = Object.keys(sh).sort((a, b) => sh[b] - sh[a]);
  const done = e.log.every(s => s.done), just = state.lvJust && Date.now() - state.lvJust.at < 90000 && state.lvJust.to === i;
  const mus = ks.map(k => `<span class="lv-m lv${mmLvl(W[k])}"><i style="background:${MM_COL[mmLvl(W[k])]}"></i> ${zoneName(k)} <b class="num">${wcR(W[k])}${MM_MAIN.indexOf(k) >= 0 ? `/${WC_MIN}` : ''}</b> <small>${sh[k] === 1 ? '· principal' : '· ½ por serie'}</small></span>`).join('');
  return `<div class="lv-box" data-lvi="${i}">${done || just ? lvNextHtml(d, done ? i : state.lvJust.from) : ''}
    <div class="lv-in">${bodySVG(W)}<div class="lv-txt"><div class="label">Tu semana en vivo</div><div class="lv-ms">${mus || '<span class="muted">Sin músculo asignado</span>'}</div>
    <div class="muted lv-f">Series de esta semana con lo que llevas hoy. Meta ${WC_MIN}-${WC_MAX} por músculo.</div></div></div></div>`;
}
const _renderLv = render;
render = function () {
  _renderLv();
  const d = state.draft; if (!d || isWatch() || !document.getElementById('sx')) return;
  const W = weekSets(0).sets;
  document.querySelectorAll('#sx-pager > .sx-page').forEach(pg => {
    const card = pg.querySelector('.card.ex'), i = +pg.dataset.i; if (!card || !d.exercises[i] || card.querySelector('.lv-box')) return;
    card.insertAdjacentHTML('beforeend', lvBox(d, i, W));
  });
};
/* Al cerrar un ejercicio (todas sus series), la sugerencia también sale en el que sigue */
const _markSetLv = markSet;
markSet = function (i, j, v, k) {
  const d = state.draft, e = d && d.exercises[i], was = e && e.log.every(s => s.done);
  const r = _markSetLv.apply(this, arguments);
  const D = state.draft, E = D && D.exercises[i];
  if (!isWatch() && E && !was && E.log.every(s => s.done)) {
    state.lvJust = { from: i, to: D.cur, at: Date.now() };
    const N = lvNext(D, i);
    if (!N.ok) setTimeout(() => toast(`Ahora conviene: ${zoneName(N.k).toLowerCase()} (faltan ${N.need} series)${N.j != null ? ` · ${D.exercises[N.j].name}` : N.add ? ` · puedes agregar ${N.add}` : ''}`), 900);
    render();
  }
  return r;
};
window.addEventListener('click', ev => {
  const b = ev.target.closest && ev.target.closest('[data-lv]'), d = state.draft; if (!b || !d) return;
  ev.preventDefault(); ev.stopPropagation();
  if (b.dataset.lv === 'go') { const j = +b.dataset.j; if (!d.exercises[j]) return; d.cur = j; saveDraft(); render(); setTimeout(() => pagerGo(j, true), 50); }
  else if (b.dataset.lv === 'add') { addToDraft([b.dataset.n], +b.dataset.i); render(); setTimeout(() => pagerGo(d.cur, true), 50); toast(`Agregado: ${b.dataset.n} (solo hoy)`); }
}, true);

/* ---------- 6. Reloj: te pasaste del descanso o de la duración ---------- */
const wovOn = () => state.settings.wOver !== false;
const WOV = { rid: 0, rEnd: 0, rLv: 0, rAt: 0, sLv: 0, sAt: 0, sid: null };
/* Duración recomendada: series × (45 s + descanso) + 1,5 min por ejercicio + 5 min de calentamiento (como la vista previa) */
/* Con el coach de progresión: la misma duración estimada que muestra la sesión (series, descansos y tipo de ejercicio) */
const wovEst = d => (typeof pgDraftEst === 'function' ? d.estSec || pgDraftEst(d) : d.exercises.reduce((a, e) => a + e.log.length * (45 + (+e.rest || 90)) + 90, 0) + 300);
const wovClock = s => { s = Math.max(0, Math.round(s)); return s >= 3600 ? `${Math.floor(s / 3600)} h ${String(Math.floor(s % 3600 / 60)).padStart(2, '0')} min` : clock(s); };
function wovFire(lv) {
  const c = alertCfg(), n = lv >= 3 ? 4 : lv;
  if (typeof playAlert === 'function') playAlert({ sound: c.sound === 'silencio' ? 'silencio' : lv >= 3 ? 'alarma' : lv === 2 ? 'largo' : 'corto', rep: lv >= 3 ? 2 : 1, vib: n });
}
function wovTick() {
  const el = document.getElementById('w2-ov'), d = state.draft, now = Date.now();
  if (!isWatch() || !d || !wovOn()) { if (el) el.hidden = true; return; }
  if (WOV.sid !== d.id) { WOV.sid = d.id; WOV.sLv = 0; WOV.rEnd = 0; WOV.rLv = 0; }
  const r = state.rest;
  if (r && (r.hold || !r.rang)) { if (WOV.rid !== r.end || r.hold) { WOV.rid = r.end; WOV.rEnd = r.hold ? now : r.end; WOV.rLv = 0; } }
  const allDone = d.exercises.every(e => e.log.every(s => s.done));
  let msg = '', lv = 0;
  /* Descanso: desde que terminó el recomendado, sin marcar otra serie */
  if (WOV.rEnd && !allDone && !(r && !r.rang)) {
    const over = (now - WOV.rEnd) / 1000, L = over >= 120 ? 3 : over >= 60 ? 2 : over >= 30 ? 1 : 0;
    if (L > WOV.rLv || (L === 3 && now - WOV.rAt >= 60000)) { WOV.rLv = L; WOV.rAt = now; wovFire(L); }
    if (L) { msg = `⏱ Te pasaste ${wovClock(over)} del descanso`; lv = L; }
  }
  /* Sesión: desde que pasa la duración recomendada */
  const est = wovEst(d), over = (now - new Date(d.start)) / 1000 - est, S = over >= 1200 ? 3 : over >= 600 ? 2 : over >= 0 ? 1 : 0;
  if (S > WOV.sLv || (S === 3 && now - WOV.sAt >= 600000)) { if (now - WOV.rAt > 5000) wovFire(S); WOV.sLv = S; WOV.sAt = now; }
  if (S && !msg) { msg = `⌛ Sesión: ${wovClock(over + est)} · recomendado ${Math.round(est / 60)} min`; lv = S; }
  if (el) { el.hidden = !msg; el.textContent = msg; el.className = 'w2-ov lv' + lv; }
}
setInterval(wovTick, 1000);
const _markSetWov = markSet;
markSet = function () { if (isWatch()) { WOV.rEnd = 0; WOV.rLv = 0; } return _markSetWov.apply(this, arguments); };
const _vWatchSessJ = vWatchSession;
vWatchSession = function () { const h = _vWatchSessJ.apply(this, arguments); return h.indexOf('<div class="w2">') === 0 ? '<div class="w2"><div class="w2-ov" id="w2-ov" hidden></div>' + h.slice(16) : h; };
const _alertCardJ = alertSettingsCard;
alertSettingsCard = function () {
  const h = _alertCardJ.apply(this, arguments), on = wovOn(), k = h.lastIndexOf('</div>'); if (k < 0) return h;
  const row = `<div class="row wov-row"><div class="grow"><b>Avisar si me paso del tiempo${isWatch() ? '' : ' (en el reloj)'}</b><div class="muted" style="font-size:12px">En el reloj: vibra y suena si te pasas del descanso recomendado (desde 30 s) o de la duración recomendada de la sesión; si el exceso crece, el aviso sube.</div></div>
    <button type="button" class="switch ${on ? 'on' : ''}" data-wov="tog" role="switch" aria-checked="${on}" aria-label="Avisar si me paso del tiempo"><i></i></button></div>`;
  return h.slice(0, k) + row + h.slice(k);
};
window.addEventListener('click', ev => {
  const b = ev.target.closest && ev.target.closest('[data-wov="tog"]'); if (!b) return;
  ev.preventDefault(); ev.stopPropagation();
  state.settings.wOver = !wovOn(); savePlans(); render();
  toast(wovOn() ? 'Listo: el reloj te avisa si te pasas del descanso o de la duración.' : 'El reloj ya no avisa si te pasas del tiempo.');
}, true);

/* ---------- 8. Exportaciones: gimnasio de cada sesión y su equipo ---------- */
function aixGymEq(gid) {
  const no = gymNoOf(gid), used = {};
  LIB.forEach(x => { if (x.eq && CAT_EQ[x.eq]) used[x.eq] = 1; });
  const miss = Object.keys(no).filter(k => CAT_EQ[k]).map(eqName);
  const fams = CAT_FAM.filter(f => f[0] !== 'otros' && Object.keys(used).some(k => CAT_EQ[k][1] === f[0] && !no[k])).map(f => f[1].toLowerCase());
  return `- ${gymName(gid)}: hay ${fams.join(', ')}${miss.length ? `. NO hay: ${miss.join(', ')}` : ' (no marqué equipo que falte)'}.`;
}
function aixGymBlock(list, days) {
  const ids = [];
  (list || []).forEach(s => { const g = sGym(s); if (ids.indexOf(g) < 0) ids.push(g); });
  (days || []).forEach(d => { const p = d && state.plans.find(x => x.days.indexOf(d) >= 0), g = p && (p.gymId || 'rokaz'); if (g && ids.indexOf(g) < 0) ids.push(g); });
  if (!ids.length) { const p = activePlan(); ids.push(p ? p.gymId || 'rokaz' : activeGym().id); }
  return `GIMNASIO Y EQUIPO (cada sesión dice en qué gimnasio la hice):\n${ids.map(aixGymEq).join('\n')}\nRecomiéndame solo ejercicios con el equipo que hay en el gimnasio de ese día.`;
}
const aixPutGym = (txt, block) => { const k = txt.indexOf('LO QUE TE PIDO'); return k < 0 ? txt + '\n\n' + block : txt.slice(0, k) + block + '\n\n' + txt.slice(k); };
const _sessionPromptJ = sessionPrompt;
sessionPrompt = function (list) {
  const days = []; (list || []).forEach(s => { const d = aixDayOf(s); if (d && days.indexOf(d) < 0) days.push(d); });
  return aixPutGym(_sessionPromptJ.apply(this, arguments), aixGymBlock(list, days.slice(0, 1)));
};
const _aixWeekTextJ = aixWeekText;
aixWeekText = function (off) { const R = _aixWeekTextJ.apply(this, arguments); R.txt = aixPutGym(R.txt, aixGymBlock(R.W.list, aixWeekDays(R.W))); return R; };
const _aixAllTextJ = aixAllText;
aixAllText = function (per) {
  const R = _aixAllTextJ.apply(this, arguments), from = aixFrom(per);
  const list = state.sessions.filter(s => !from || new Date(s.date).getTime() >= from);
  const k = R.txt.indexOf('RACHA: ');
  R.txt = k < 0 ? R.txt + '\n\n' + aixGymBlock(list, aixPlanDays()) : R.txt.slice(0, k) + aixGymBlock(list, aixPlanDays()) + '\n\n' + R.txt.slice(k);
  return R;
};
bootRender();
