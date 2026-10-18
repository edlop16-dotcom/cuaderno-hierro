/* ==========================================================================
   Tanda B · Alternativas cuando una máquina no está, y equipo que no hay en cada gimnasio
   - `settings.gymNo[gymId][equipo] = fecha`: equipo que no hay en ese gimnasio (se sincroniza con settings).
     Un ejercicio no está disponible si falta su equipo (`eq`) o algo que necesita (`req`).
   - Alternativas (teléfono): mismo músculo principal, ordenadas por parecido (patrón, aislamiento,
     unilateral) y primero con otro equipo; fuera las del día, las que no hay en el gimnasio y las
     que van mal con tus molestias. Peso: con tu historial de ambos si lo hay; si no, conversión por
     equipo con −10 % y redondeo hacia abajo (`altConvert`).
   - "No hay esta máquina en este gym" en "¿Máquina ocupada?" y en "Cambiar ejercicio"; la lista se
     revisa en "¿Dónde entrenas hoy?" → "Equipo que no hay aquí".
   - Coach semanal (wcCands), Coach de Próxima sesión (nsCoachEntry), Entreno rápido y el inicio de
     la sesión respetan el equipo que no hay. El plan no cambia.
   - Reloj: su lista de "Máquina ocupada" es la de antes (mismos ejercicios de antes, sin el catálogo).
   ========================================================================== */
const gymNoOf = gid => (state.settings.gymNo || {})[gid || activeGym().id] || {};
const gymHasEq = (eq, gid) => !eq || eq === 'cuerpo' || !gymNoOf(gid)[eq];
function exAvail(name, gid) {
  const x = libFind(name); if (!x || !x.eq) return true;
  return gymHasEq(x.eq, gid) && String(x.req || '').split(',').every(r => !r || gymHasEq(r, gid));
}
/* El equipo que falta (para decir "No hay Prensa 45° en Mi gimnasio") */
function exMissing(name, gid) { const x = libFind(name); if (!x || !x.eq) return null; if (!gymHasEq(x.eq, gid)) return x.eq; return String(x.req || '').split(',').find(r => r && !gymHasEq(r, gid)) || null; }
const eqName = k => (CAT_EQ[k] ? CAT_EQ[k][0] : k);
function gymNoSet(gid, eq, on) {
  const all = Object.assign({}, state.settings.gymNo || {}), m = Object.assign({}, all[gid] || {});
  if (on) m[eq] = Date.now(); else delete m[eq];
  all[gid] = m; state.settings.gymNo = all; savePlans();
  try { Object.keys(nsCache).forEach(k => delete nsCache[k]); } catch (e) {}
}

/* ---------- Parecido entre ejercicios ---------- */
const ALT_FAM = { hpush: 'push', ipush: 'push', dpush: 'push', dip: 'push', fly: 'fly', vpush: 'vpush', vpull: 'vpull', pullover: 'vpull', row: 'row', rear: 'rear', upright: 'lat', lat: 'lat',
  front: 'front', shrug: 'shrug', rot: 'rot', curl: 'curl', triext: 'tri', squat: 'knee', lunge: 'knee', sled: 'knee', kext: 'kext', kflex: 'kflex', hinge: 'hip', hipext: 'hip', lumbar: 'hip',
  abd: 'abd', add: 'add', calf: 'calf', tib: 'calf', flex: 'core', legraise: 'core', antiext: 'core', rotc: 'core', carry: 'carry', full: 'full', cardio: 'cardio', wrist: 'wrist', grip: 'wrist', balance: 'bal' };
/* Molestias (bienvenida): además de los nombres de PB_AVOID, por patrón en los del catálogo */
const ALT_AVOID = { knee: x => /^(squat|lunge|kext|sled)$/.test(x.pat), shoulder: x => /^(vpush|dip|upright|front)$/.test(x.pat), back: x => (x.eq === 'barra' || x.eq === 'smith') && /^(hinge|row|squat)$/.test(x.pat), hip: x => x.pat === 'lunge', wrist: x => x.pat === 'hpush' && x.eq === 'cuerpo' };
function altInjured(x) {
  const inj = (typeof pbBase === 'function' ? pbBase().inj : []) || [], n = normName(x.name);
  return inj.some(k => (PB_AVOID[k] && PB_AVOID[k].test(n)) || (x.cat && ALT_AVOID[k] && ALT_AVOID[k](x)));
}
/* Mejor primero. o = { gid, skip: Set de nombres, kind } */
function altList(name, o) {
  const x = libFind(name); if (!x) return [];
  const m = catMain(x), fam = ALT_FAM[x.pat], gid = o.gid, skip = o.skip || new Set();
  const out = [];
  LIB.forEach(y => {
    if (y === x || skip.has(y.name) || catMain(y) !== m || !exAvail(y.name, gid) || altInjured(y)) return;
    let s = 0;
    if (y.pat === x.pat) s += 40; else if (ALT_FAM[y.pat] === fam) s += 20; else if (!!y.iso !== !!x.iso) s -= 30;
    if (!!y.iso === !!x.iso) s += 10;
    if (!!y.uni === !!x.uni) s += 4;
    const other = y.eq !== x.eq; if (other) s += 15; if (equipOf(y) !== equipOf(x)) s += 5;
    const here = lastPerf(y.name, gid, o.kind || 'fuerza', true), any = doneBefore(y.name);
    if (here) s += 12; else if (any) s += 5;
    if (!y.cat) s += 6;
    if ((y.bw || y.eq === 'banda') && !(x.bw || x.eq === 'banda')) s -= 25;   /* con carga: banda o peso corporal al final */
    out.push({ y, s, other });
  });
  return out.sort((a, b) => b.s - a.s || a.y.name.localeCompare(b.y.name));
}
const altBest = (name, gid, skip, kind) => { const l = altList(name, { gid, skip, kind }); return l.length ? l[0].y.name : null; };

/* ---------- Peso convertido de forma prudente ---------- */
const ALT_LF_EQ = { prensa: 2.6, prensa_h: 2.2, hack: 1.5, pendulo: 1.4, vsquat: 1.4, beltsq: 1.2, ht_maq: 1.2, hexbar: 1.1, landmine: 0.55, disco: 0.3, banda: 0, cuerpo: 0 };
const ALT_LF_FAM = { barra: 1, smith: 0.95, manc: 0.42, kb: 0.4, polea: 0.8, maq: 0.9, cuerpo: 0, banda: 0, otros: 0.6 };
function altLf(name) {
  const x = libFind(name); if (!x || !x.eq) return loadFactor(name);
  let f = ALT_LF_EQ[x.eq] != null ? ALT_LF_EQ[x.eq] : (ALT_LF_FAM[equipOf(x)] != null ? ALT_LF_FAM[equipOf(x)] : 1);
  if (x.uni && ['manc', 'kb'].indexOf(equipOf(x)) < 0) f *= 0.55;   // a una pierna/brazo en máquina o barra: la mitad, aprox.
  return f;
}
const altBw = name => { const x = libFind(name); return x && x.cat ? !!x.bw : BODYW.test(normName(name)); };
function altConvert(from, to, w) {
  if (altBw(to)) return { w: 0, how: 'body' };
  const total = (+w || 0) + barFor(from), a = bestAny(from), b = bestAny(to);
  let ratio, how;
  if (a > 0 && b > 0) { ratio = b / a; how = 'hist'; }
  else {
    const lf = altLf(from); ratio = lf > 0 ? altLf(to) / lf * 0.9 : 0; how = 'aprox';   // −10 % por prudencia
    const fx = libFind(from), tx = libFind(to); if (fx && tx && !!fx.iso !== !!tx.iso) ratio *= 0.85;
  }
  let x = total * ratio - barFor(to);
  const inc = increment({ type: typeOf(to) }, Math.max(0, x));
  x = Math.max(0, how === 'hist' ? Math.round(x / inc) * inc : Math.floor(x / inc) * inc);
  return { w: x, how };
}

/* ---------- Candidatos: teléfono con el catálogo; reloj como antes ---------- */
const _swapCandAlt = swapCandidates, _convertWAlt = convertW;
/* Por mano: mancuernas y kettlebells (perHand de swap.js es por nombre y no se puede reemplazar) */
const altPerHand = name => { const x = libFind(name); return x && x.eq ? ['manc', 'kb'].indexOf(equipOf(x)) >= 0 && !/^(squat|hinge|calf)$/.test(x.pat) : perHand(name); };
convertW = function (from, to, w) { return isWatch() ? _convertWAlt(from, to, w) : altConvert(from, to, w); };
swapCandidates = function (e) {
  const d = state.draft;
  if (isWatch()) {   // la lista de siempre: los ejercicios de antes y los de tu historial
    const sh = zoneShares(e.name), main = Object.keys(sh).find(k => sh[k] === 1); if (!main || !d) return [];
    const names = new Set(LIB.filter(x => !x.cat).map(x => x.name));
    state.sessions.forEach(s => s.exercises.forEach(x => names.add(x.name)));
    const inDay = new Set(d.exercises.map(x => x.name));
    return Array.from(names).filter(n => n !== e.name && !inDay.has(n) && zoneShares(n)[main] === 1).map(n => ({ n, last: lastPerf(n, d.gymId, d.kind, true), done: doneBefore(n), cv: _convertWAlt(e.name, n, workW(e)) }))
      .sort((a, b) => (!!b.last - !!a.last) || (b.done - a.done) || a.n.localeCompare(b.n)).slice(0, 12);
  }
  if (!d || !libFind(e.name)) return _swapCandAlt(e);
  const L = altList(e.name, { gid: d.gymId, skip: new Set(d.exercises.map(x => x.name)), kind: d.kind }).slice(0, 10);
  return L.map(o => ({ n: o.y.name, other: o.other, last: lastPerf(o.y.name, d.gymId, d.kind, true), done: doneBefore(o.y.name), cv: altConvert(e.name, o.y.name, workW(e)) }));
};

/* ---------- "Cambiar ejercicio" (teléfono) ---------- */
const altNoBtn = (e, i, gid) => { const x = libFind(e.name); if (!x || !x.eq || x.eq === 'cuerpo') return ''; return `<button class="btn block alt-no" data-act="alt-no" data-ex="${i}" data-eq="${x.eq}">${ic('x', 15)} No hay ${esc(eqName(x.eq))} en ${esc(gymName(gid))}</button>`; };
const altRow = (c, i, e, d) => `<button class="sw-row" data-act="swap-do" data-ex="${i}" data-name="${esc(c.n)}">
      <span class="pv-th">${thumb(c.n)}</span>
      <span class="grow" style="min-width:0"><b>${esc(c.n)}</b><small class="muted">${esc(eqName((libFind(c.n) || {}).eq) || '')} · ${c.last ? `tu última vez: ${fmtKg(Math.max.apply(null, c.last.sets.map(s => s.w)))} kg${c.last.date ? ' · ' + ago(c.last.date) : ''}` : c.done ? 'lo hiciste en otro gimnasio' : '<span class="sw-new">nuevo para ti</span>'}</small></span>
      <span class="sw-w"><b class="num">${c.cv.how === 'body' ? 'Peso corporal' : (c.last ? '' : '~') + fmtKg(c.last ? coachFor({ name: c.n, type: typeOf(c.n), sets: e.target, repsMin: e.repsMin, repsMax: e.repsMax, rest: e.rest, weight: c.cv.w }, d.gymId, d.kind).w : c.cv.w) + ' kg'}</b>${altPerHand(c.n) && c.cv.how !== 'body' ? '<small class="muted">por mano</small>' : ''}</span></button>`;
const _swapSheetAlt = swapSheet;
swapSheet = function (i) {
  const d = state.draft, e = d && d.exercises[i]; if (!e) return;
  if (isWatch() || !libFind(e.name)) return _swapSheetAlt(i);
  const list = swapCandidates(e), doneN = e.log.filter(s => s.done).length, oth = list.filter(c => c.other), same = list.filter(c => !c.other);
  openSheet(`<div class="row"><h2 class="grow">Cambiar ejercicio</h2><button class="icon-btn" data-act="sheet-close" aria-label="Cerrar">${ic('x', 18)}</button></div>
    <div class="muted" style="font-size:12.5px">En lugar de <b>${esc(e.name)}</b>, los más parecidos para el mismo músculo, primero con otro equipo. ${doneN ? `Tus ${doneN} ${doneN === 1 ? 'serie hecha queda' : 'series hechas quedan'} guardada${doneN === 1 ? '' : 's'}; el nuevo lleva las ${e.log.length - doneN} que faltan.` : ''}</div>
    ${list.length ? `<div class="sw-list">${oth.length ? `<div class="label">Con otro equipo</div>${oth.map(c => altRow(c, i, e, d)).join('')}` : ''}${same.length ? `<div class="label">Con el mismo equipo</div>${same.map(c => altRow(c, i, e, d)).join('')}` : ''}</div>`
      : '<div class="muted">No encontré otro ejercicio para ese músculo con el equipo de este gimnasio.</div>'}
    <label class="sw-keep"><input type="checkbox" id="sw-keep" ${doneN ? 'disabled' : ''}> Cambiarlo también en mi rutina</label>
    ${altNoBtn(e, i, d.gymId)}
    <div class="muted" style="font-size:11.5px">El peso con “~” es una conversión prudente (un 10 % menos y redondeado hacia abajo): ajústalo en la 1.ª serie. Si ya hiciste ese ejercicio, se usa tu historial.</div>`);
};
/* "¿Máquina ocupada?": también "No hay esta máquina en este gym" */
const _busySheetAlt = busySheet;
busySheet = function (i) {
  _busySheetAlt(i);
  const d = state.draft, e = d && d.exercises[i]; if (!e || isWatch()) return;
  const more = document.querySelector('#sheet [data-act="swap"]'); if (more) more.insertAdjacentHTML('afterend', altNoBtn(e, i, d.gymId));
};
document.addEventListener('click', ev => {
  const b = ev.target.closest && ev.target.closest('[data-act="alt-no"]'); if (!b) return;
  ev.preventDefault(); ev.stopPropagation();
  const d = state.draft, i = +b.dataset.ex, e = d && d.exercises[i], eq = b.dataset.eq; if (!e) return;
  gymNoSet(d.gymId, eq, true);
  toast(`Listo: en ${gymName(d.gymId)} ya no te propongo ejercicios con ${eqName(eq)}. Lo cambias en "¿Dónde entrenas hoy?".`);
  swapSheet(i);
}, true);

/* ---------- "¿Dónde entrenas hoy?" → Equipo que no hay aquí ---------- */
function altGymDecorate() {
  const sc = document.querySelector('#sheet .sheet-card'); if (!sc || !sc.querySelector('[data-act="gym-set"]') || sc.querySelector('.alt-gym')) return;
  const g = activeGym(), n = Object.keys(gymNoOf(g.id)).length;
  const nw = sc.querySelector('[data-act="gym-new"]');
  const html = `<button class="btn block alt-gym" data-act="alt-eq" data-gym="${g.id}">${ic('settings', 16)} Equipo que no hay en ${esc(g.name)}${n ? ` (${n})` : ''}</button>`;
  if (nw) nw.insertAdjacentHTML('beforebegin', html); else sc.insertAdjacentHTML('beforeend', html);
}
function altEqSheet(gid) {
  const no = gymNoOf(gid), used = {};
  LIB.forEach(x => { if (x.eq) used[x.eq] = 1; String(x.req || '').split(',').forEach(r => { if (r) used[r] = 1; }); });
  const rows = fam => Object.keys(CAT_EQ).filter(k => CAT_EQ[k][1] === fam[0] && used[k] && k !== 'cuerpo');
  openSheet(`<div class="row"><h2 class="grow">Equipo en ${esc(gymName(gid))}</h2><button class="icon-btn" data-act="sheet-close" aria-label="Cerrar">${ic('x', 18)}</button></div>
    <div class="muted" style="font-size:12.5px">Apaga lo que no hay en este gimnasio: las alternativas, el coach y el entreno rápido dejan de proponerlo aquí. Tus rutinas no cambian.</div>
    ${CAT_FAM.map(f => { const r = rows(f); return r.length ? `<div class="label">${esc(f[1])}</div><div class="alt-eqs">${r.map(k => `<button type="button" class="alt-eq-r" data-act="alt-eqt" data-gym="${gid}" data-eq="${k}" role="switch" aria-checked="${!no[k]}"><span class="grow">${esc(CAT_EQ[k][0])}</span><small class="muted">${no[k] ? 'No hay' : 'Hay'}</small><span class="switch ${no[k] ? '' : 'on'}"><i></i></span></button>`).join('')}</div>` : ''; }).join('')}
    <button class="btn block" data-act="sheet-close">Listo</button>`);
  const c = document.querySelector('#sheet .sheet-card'); if (c) c.classList.add('alt-eq-sheet');
}
document.addEventListener('click', ev => {
  const b = ev.target.closest && ev.target.closest('[data-act="gym-pick"],[data-act="alt-eq"],[data-act="alt-eqt"]'); if (!b) return;
  const a = b.dataset.act;
  if (a === 'gym-pick') { setTimeout(altGymDecorate, 0); return; }
  ev.preventDefault(); ev.stopPropagation();
  if (a === 'alt-eq') { altEqSheet(b.dataset.gym); return; }
  const gid = b.dataset.gym, eq = b.dataset.eq, on = !!gymNoOf(gid)[eq];
  gymNoSet(gid, eq, !on);
  const sc = document.querySelector('#sheet .sheet-card'), top = sc ? sc.scrollTop : 0; altEqSheet(gid); const n = document.querySelector('#sheet .sheet-card'); if (n) n.scrollTop = top;
}, true);

/* ---------- Coach semanal: sin el equipo que falta y, si hace falta, con el catálogo ---------- */
const ALT_EQUIP_OK = { gym: null, basic: ['barra', 'manc', 'kb', 'cuerpo', 'banda', 'otros'], home: ['manc', 'kb', 'cuerpo', 'banda'], body: ['cuerpo', 'banda'] };
const _wcCandsAlt = wcCands;
wcCands = function (k) {
  const g = activeGym().id, base = _wcCandsAlt(k).filter(n => exAvail(n, g));
  if (base.length >= 3) return base;   /* con opciones de tu historial, rutinas y plantillas no cambia lo de siempre */
  const o = pbBase(), okF = ALT_EQUIP_OK[o.equip || 'gym'], have = new Set(base);
  const extra = LIB.filter(x => !have.has(x.name) && wcMain(x.name) === k && exAvail(x.name, g) && !altInjured(x) && (okF ? okF.indexOf(equipOf(x)) >= 0 : !x.bw && x.eq !== 'banda') && x.pat !== 'full' && x.pat !== 'cardio')
    .sort((a, b) => (a.cat ? 1 : 0) - (b.cat ? 1 : 0) || (a.iso ? 1 : 0) - (b.iso ? 1 : 0) || a.name.localeCompare(b.name)).slice(0, 6).map(x => x.name);
  return base.concat(extra);
};

/* ---------- Coach de Próxima sesión: cambia lo que no hay en ese gimnasio ---------- */
const _nsKeyAlt = nsKey;
nsKey = function (planId, dayId) {
  const k = _nsKeyAlt(planId, dayId), { p } = findDay(planId, dayId), no = gymNoOf(p ? p.gymId || 'rokaz' : null), ks = Object.keys(no);
  return ks.length ? k + '|n' + ks.sort().join(',') : k;
};
const _nsEntryAlt = nsCoachEntry;
nsCoachEntry = function (planId, dayId) {
  const E = _nsEntryAlt(planId, dayId); if (!E || E.edited || E.altDone) return E;
  const { p, d } = findDay(planId, dayId), g = p.gymId || 'rokaz';
  E.altDone = 1;
  if (E.ex.every(x => exAvail(x.name, g))) return E;
  const kind = d.kind || kindOfName(d.name), ctx = nsCtx(), skip = new Set(d.exercises.map(e => e.name));
  E.ex = E.ex.map(x => {
    if (exAvail(x.name, g)) return x;
    const ex = d.exercises.find(e => e.id === x.exId), miss = exMissing(x.name, g), alt = ex && altBest(ex.name, g, skip, kind);
    if (!alt) return Object.assign({}, x, { why: `No hay ${eqName(miss)} en ${gymName(g)} y no encontré otro para ese músculo: hazlo como puedas o quítalo hoy. ` + x.why });
    skip.add(alt);
    const cv = altConvert(ex.name, alt, +ex.weight || (x.sets[0] || {}).w || 0);
    const y = nsCoachEx(Object.assign({}, ex, { name: alt, type: typeOf(alt), weight: cv.w, bar: barFor(alt) || undefined }), g, kind, ctx);
    y.exId = ex.id; y.swapFrom = ex.name;
    y.why = `No hay ${eqName(miss)} en ${gymName(g)}: va ${alt}${cv.how === 'aprox' && !lastPerf(alt, g, kind) ? ' (peso aproximado)' : ''}. ` + y.why;
    return y;
  });
  return E;
};

/* ---------- Al empezar: lo que no hay en este gimnasio se cambia por su mejor alternativa (solo hoy) ---------- */
function altSwapDraft(d, i, name, coachX) {
  const e = d.exercises[i], cv = altConvert(e.name, name, workW(e)), bar = barFor(name), last = lastPerf(name, d.gymId, d.kind);
  const ne = Object.assign({}, e, { name, type: typeOf(name), bar, inc: increment({ type: typeOf(name) }, cv.w), swappedFrom: e.name, noEq: 1, prevNote: lastNote(name, d.gymId),
    lastDate: last ? (last.date || 'base') : null, prev: last ? last.sets.map(s => ({ w: s.w, r: s.r, drops: [] })) : [] });
  if (!coachX) {
    const ex = { id: e.exId, name, type: ne.type, sets: e.target, repsMin: e.repsMin, repsMax: e.repsMax, rest: e.rest, weight: cv.w }; if (bar) ex.bar = bar;
    const own = !!(last && !last.ref), c = own ? coachFor(ex, d.gymId, d.kind) : null, W = c && c.w != null ? c.w : cv.w;
    ne.log = e.log.map(s => (s.done ? s : Object.assign({}, s, { w: W })));
    ne.sugg = own ? suggest(d.gymId, d.kind, ex) : { w: W, msg: `Reemplazo de ${e.name}` };
    ne.coach = c || { w: W, mode: 'first', goal: null, head: `<b>Reemplazo de ${esc(e.name)}</b>: no hay ${esc(eqName(exMissing(e.name, d.gymId)))} aquí. ${cv.how === 'body' ? 'Con tu peso corporal' : `Empieza con ${fmtKg(W)} kg${altPerHand(name) ? ' por mano' : ''}`} y busca ${reps(ex)} reps.`,
      tips: ['Peso aproximado y prudente: si la 1.ª serie se siente muy fácil o muy pesada, ajusta antes de la 2.ª.'] };
  }
  d.exercises[i] = ne;
}
const _startSessionAlt = startSession;
startSession = function (planId, dayId) {
  const r = _startSessionAlt.apply(this, arguments);
  const d = state.draft; if (!d || d.dayId !== dayId || d.altDone) return r;
  d.altDone = 1;
  const E = d.ns && d.ns.src === 'coach' ? nsCoachEntry(planId, dayId) : null, skip = new Set(d.exercises.map(e => e.name)), done = [];
  d.exercises.forEach((e, i) => {
    if (e.log.some(s => s.done) || exAvail(e.name, d.gymId)) return;
    const cx = E && E.ex.find(x => x.exId === e.exId && x.swapFrom === e.name);
    const alt = cx ? cx.name : altBest(e.name, d.gymId, skip, d.kind); if (!alt) return;
    skip.add(alt); done.push(e.name + ' → ' + alt); altSwapDraft(d, i, alt, cx);
  });
  if (done.length) { saveDraft(); render(); setTimeout(() => toast(`No hay ese equipo en ${gymName(d.gymId)}: ${done.join(', ')}. Tu rutina no cambia.`), 400); }
  return r;
};
/* Etiqueta en la tarjeta del ejercicio */
const _renderAlt = render;
render = function () {
  _renderAlt();
  const d = state.draft; if (!d || isWatch()) return;
  document.querySelectorAll('#app .sw-tag').forEach(t => { const h = t.closest('h3'); if (!h) return; const e = d.exercises.find(x => x.name && h.textContent.indexOf(x.name) === 0); if (e && e.noEq && !t.dataset.no) { t.dataset.no = 1; t.textContent = `en vez de ${e.swappedFrom} (no hay aquí)`; } });
};

/* ---------- Entreno rápido: sin el equipo que falta ---------- */
if (typeof qkAllowed === 'function') {
  const _qkAllowedAlt = qkAllowed;
  qkAllowed = function (n, o) { return _qkAllowedAlt(n, o) && exAvail(n, activeGym().id); };
}
bootRender();
