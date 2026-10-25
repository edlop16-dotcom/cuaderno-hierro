/* ==========================================================================
   Reemplazo de ejercicio: si la máquina está ocupada, cambia por otro que trabaje
   el mismo músculo, con el peso convertido (con tu historial si lo tienes).
   ========================================================================== */
const BODYW = /dominada|fondos|flexion|plancha|crunch abdominal|elevacion de piernas colgado|rueda abdominal|hiperext|puente de gluteo/;
/* Carga relativa aproximada de cada ejercicio para la misma fuerza (barra = 1, incluye la barra) */
function loadFactor(name) {
  const n = normName(name);
  if (/prensa/.test(n)) return 2.6;
  if (/bulgara|zancada/.test(n)) return 0.25;
  if (/goblet/.test(n)) return 0.45;
  if (/mancuerna|martillo|concentrado|arnold|elevaciones frontales|pajaros/.test(n)) return 0.42;
  if (/polea|cable|cuerda|cruce/.test(n)) return 0.8;
  if (/peso muerto/.test(n)) return 1.2;
  return 1;
}
const perHand = name => /mancuerna|bulgara|zancada|martillo|concentrado|arnold|elevaciones frontales|pajaros/.test(normName(name));
const barFor = name => BAR_DEFAULT[name] != null ? BAR_DEFAULT[name] : 0;
function bestAny(name) {
  let b = 0; const bar = barFor(name);
  state.sessions.forEach(s => { if (s.approx) return; s.exercises.forEach(e => { if (exSame(e.name, name)) e.sets.forEach(x => { const v = e1rm((+x.w || 0) + bar, x.r); if (v > b) b = v; }); }); });
  const rec = typeof baseRec === 'function' && baseRec(name); if (rec) b = Math.max(b, e1rm(rec.w + bar, rec.r));
  return b;
}
function convertW(from, to, w) {
  if (BODYW.test(normName(to))) return { w: 0, how: 'body' };
  const total = (+w || 0) + barFor(from), a = bestAny(from), b = bestAny(to);
  let ratio, how;
  if (a > 0 && b > 0) { ratio = b / a; how = 'hist'; } else { ratio = loadFactor(to) / loadFactor(from); how = 'aprox'; }
  let x = total * ratio - barFor(to);
  const inc = increment({ type: typeOf(to) }, x);
  x = Math.max(0, Math.round(x / inc) * inc);
  return { w: x, how };
}
function swapCandidates(e) {
  const sh = zoneShares(e.name); const main = Object.keys(sh).find(k => sh[k] === 1);
  if (!main) return [];
  const names = new Set(LIB.map(x => x.name));
  state.sessions.forEach(s => s.exercises.forEach(x => names.add(x.name)));
  const d = state.draft, inDay = new Set(d.exercises.map(x => x.name));
  return Array.from(names).filter(n => n !== e.name && !inDay.has(n) && zoneShares(n)[main] === 1).map(n => {
    const last = lastPerf(n, d.gymId, d.kind, true);
    return { n, last, done: doneBefore(n), cv: convertW(e.name, n, workW(e)) };
  }).sort((a, b) => (!!b.last - !!a.last) || (b.done - a.done) || a.n.localeCompare(b.n)).slice(0, 12);
}
const workW = e => { const s = e.log.find(x => !x.done) || e.log[0]; return +(s && s.w) || (e.sugg && e.sugg.w) || 0; };

function swapSheet(i) {
  const d = state.draft, e = d && d.exercises[i]; if (!e) return;
  const list = swapCandidates(e), doneN = e.log.filter(s => s.done).length;
  openSheet(`<div class="row"><h2 class="grow">Cambiar ejercicio</h2><button class="icon-btn" data-act="sheet-close" aria-label="Cerrar">${ic('x', 18)}</button></div>
    <div class="muted" style="font-size:12.5px">En lugar de <b>${esc(e.name)}</b>, otros que trabajan el mismo músculo. ${doneN ? `Tus ${doneN} ${doneN === 1 ? 'serie hecha queda' : 'series hechas quedan'} guardada${doneN === 1 ? '' : 's'}; el nuevo ejercicio lleva las ${e.log.length - doneN} que faltan.` : ''}</div>
    ${list.length ? `<div class="sw-list">${list.map(c => `<button class="sw-row" data-act="swap-do" data-ex="${i}" data-name="${esc(c.n)}">
      <span class="pv-th">${thumb(c.n)}</span>
      <span class="grow" style="min-width:0"><b>${esc(c.n)}</b><small class="muted">${c.last ? `Tu última vez: ${fmtKg(Math.max.apply(null, c.last.sets.map(s => s.w)))} kg${c.last.date ? ' · ' + ago(c.last.date) : ''}` : c.done ? 'Lo hiciste en otro gimnasio' : '<span class="sw-new">Nuevo para ti</span>'}</small></span>
      <span class="sw-w"><b class="num">${c.last ? '' : c.cv.how === 'body' ? '' : '~'}${c.cv.how === 'body' ? 'Peso corporal' : fmtKg(c.last ? coachFor({ name: c.n, type: typeOf(c.n), sets: e.target, repsMin: e.repsMin, repsMax: e.repsMax, rest: e.rest, weight: c.cv.w }, d.gymId, d.kind).w : c.cv.w) + ' kg'}</b>${perHand(c.n) && c.cv.how !== 'body' ? '<small class="muted">por mano</small>' : ''}</span></button>`).join('')}</div>`
      : '<div class="muted">No encontré otro ejercicio para ese músculo.</div>'}
    <label class="sw-keep"><input type="checkbox" id="sw-keep" ${doneN ? 'disabled' : ''}> Cambiarlo también en mi rutina</label>
    <div class="muted" style="font-size:11.5px">El peso con “~” es una conversión aproximada: ajústalo en la 1ª serie. Si ya lo hiciste aquí, se usa tu historial.</div>`);
}

function swapDo(i, name, keep) {
  const d = state.draft, e = d.exercises[i]; if (!e) return;
  const doneN = e.log.filter(s => s.done).length, left = Math.max(1, e.log.length - doneN);
  const cv = convertW(e.name, name, workW(e));
  const ex = { id: e.exId, name, type: typeOf(name), sets: left, repsMin: e.repsMin, repsMax: e.repsMax, rest: e.rest, weight: cv.w };
  const bar = barFor(name); if (bar) ex.bar = bar;
  const last = lastHere(name, d.gymId) || lastPerf(name, d.gymId, d.kind), sg = suggest(d.gymId, d.kind, ex), ln = lastNote(name, d.gymId);
  const own = !!(last && !last.ref);
  const c = own ? coachFor(ex, d.gymId, d.kind) : { w: cv.w, mode: 'first', goal: null,
    head: `<b>Reemplazo de ${esc(e.name)}</b>: ${cv.how === 'body' ? 'con tu peso corporal' : `empieza con ${fmtKg(cv.w)} kg${perHand(name) ? ' por mano' : ''}`} y busca ${reps(ex)} reps.`,
    tips: [cv.how === 'hist' ? 'Peso calculado con tu historial de ambos ejercicios.' : 'El peso es una conversión aproximada: si la 1ª serie se siente muy fácil o muy pesada, ajusta antes de la 2ª.'] };
  const W = c.w;
  const ne = { name, type: ex.type, target: left, repsMin: e.repsMin, repsMax: e.repsMax, rest: e.rest, inc: increment(ex, W), exId: e.exId, dropLast: false, bar,
    note: '', prevNote: ln, sugg: own ? sg : { w: W, msg: c.head }, lastDate: last ? (last.date || 'base') : null,
    refGym: last && last.ref ? gymName(last.gymId) + (last.base ? ' · tu récord' : '') : null,
    prev: last ? last.sets.map(s => ({ w: s.w, r: s.r, drops: [] })) : [],
    log: Array.from({ length: left }, () => ({ w: W, r: null, done: false, drops: [] })), coach: c, swappedFrom: e.name };
  if (doneN) { e.log = e.log.filter(s => s.done); e.target = e.log.length; d.exercises.splice(i + 1, 0, ne); d.cur = i + 1; }
  else { d.exercises[i] = ne; d.cur = i; }
  if (keep && !doneN) {
    const p = state.plans.find(x => x.id === d.planId), day = p && p.days.find(x => x.id === d.dayId), pe = day && day.exercises.find(x => x.id === e.exId);
    if (pe) { pe.name = name; pe.type = ex.type; pe.weight = W; if (bar) pe.bar = bar; else delete pe.bar; savePlans(); }
  }
  d.lastAct = Date.now(); saveDraft(); closeSheet(); render();
  if (typeof pagerGo === 'function' && document.getElementById('sx-pager')) setTimeout(() => pagerGo(d.cur, true), 50);
  toast(`Cambiado por ${name}${keep && !doneN ? ' (también en tu rutina)' : ''}`);
}

function decorateSwap() {
  const d = state.draft; if (!d || isWatch()) return;
  const cards = document.querySelectorAll('#app .card.ex');
  d.exercises.forEach((e, i) => {
    const c = cards[i]; if (!c || c.querySelector('.sw-btn')) return;
    const how = c.querySelector('.how-btn'); if (!how || e.log.every(s => s.done)) return;
    how.insertAdjacentHTML('beforebegin', `<button class="btn small sw-btn" data-act="swap" data-ex="${i}" aria-label="Cambiar ejercicio">${ic('refresh-cw', 15)}</button>`);
    if (e.swappedFrom) { const h = c.querySelector('h3'); if (h && !h.querySelector('.sw-tag')) h.insertAdjacentHTML('beforeend', ` <span class="sw-tag">en vez de ${esc(e.swappedFrom)}</span>`); }
  });
}
const _renderSwap = render;
render = function () { _renderSwap(); decorateSwap(); };
document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-act="swap"],[data-act="swap-do"]'); if (!b) return;
  ev.stopPropagation();
  if (b.dataset.act === 'swap') swapSheet(+b.dataset.ex);
  else { const k = document.getElementById('sw-keep'); swapDo(+b.dataset.ex, b.dataset.name, !!(k && k.checked)); }
}, true);
bootRender();
