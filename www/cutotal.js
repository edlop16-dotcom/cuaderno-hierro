/* ==========================================================================
   Mancuernas: anotar "c/u" o "Total" y corregir en el momento (rama cu-total, 14-nov-2026)
   Por dentro la app guarda SIEMPRE el peso de cada mancuerna (mancuernas.js). Aquí:
   1. Modo de anotar (`settings.cuMode`: 'cu' por defecto o 'tot'), para todos. Solo cambia cómo se escribe y se muestra
      en los ejercicios de DOS mancuernas: en "Total", escribir 10 guarda 5 c/u y todo se muestra como "10 kg total".
      Botón en el encabezado de la columna de peso de la sesión, en Ajustes → Entreno y, para un usuario que no es el
      dueño, una pregunta la primera vez ("¿Cómo anotas las mancuernas?"). Cambiar de modo nunca toca lo guardado.
   2. "¿Cuántas mancuernas usas aquí?" en la sesión (píldora de cada ejercicio con mancuernas), con antes → después y
      confirmación; deshacer el último cambio de ese ejercicio. La elección vale para ese ejercicio en todas las rutinas
      (`settings.cuEx[clave]`, manda sobre la conversión).
   3. Aviso de pesos que no existen en el gimnasio de hoy (rutina, sugerencia o "Anterior"): "Era por mano, no el total"
      (×2 ese peso), "Cambiar el peso" o "Está bien, no volver a avisar" (`settings.cuOk[gym|clave]`).
   4. La nota "Anota el peso…" en una línea y según el modo.
   5. Reloj: solo el texto ("kg c/u" o "kg total") y lo que se escribe en su teclado respeta el modo.
   ========================================================================== */
const cuMode = () => (state.settings.cuMode === 'tot' ? 'tot' : 'cu');
/* Elección por ejercicio: manda sobre todo lo demás */
const _cuTwoT = cuTwo;
cuTwo = function (name) { if (!cuKind(name)) return false; const v = (state.settings.cuEx || {})[exHKey(name)]; return v ? v === 'two' : _cuTwoT(name); };
const cuTot = name => cuMode() === 'tot' && cuTwo(name) && !cuPending();
const ctN = s => parseFloat(String(s).replace(',', '.'));
const ctD = s => fmtKg(Math.round(ctN(s) * 2 * 100) / 100);
const ctIn = v => (v == null || v === '' ? '' : String(Math.round(+v * 100) / 100));
const ctU = () => (state.settings.unit === 'lb' ? 'lb' : 'kg');
/* Peso guardado (c/u) como se muestra en el modo de ese ejercicio */
const ctShow = (name, w) => (cuTot(name) ? `${fmtKg(Math.round(+w * 2 * 100) / 100)} ${ctU()} total` : cuTwo(name) && !cuPending() ? `${fmtKg(+w)} ${ctU()} c/u` : `${fmtKg(+w)} ${ctU()}`);
/* Un texto con pesos c/u → pesos totales ("2.5 kg c/u" → "5 kg total", "2.5×15" → "5×15", "entre 10 y 12 kg" → "entre 20 y 24 kg") */
function ctTotStr(s) {
  return String(s).replace(/entre (\d+(?:[.,]\d+)?) y (\d+(?:[.,]\d+)?) (kg|lb)(?: c\/u)?/g, (m, a, b, u) => `entre ${ctD(a)} y ${ctD(b)} ${u} total`)
    .replace(/(\d+(?:[.,]\d+)?)(<\/b>)? (kg|lb)(?: c\/u)?\b(?! total)/g, (m, a, b, u) => `${ctD(a)}${b || ''} ${u} total`)
    .replace(/(\d+(?:[.,]\d+)?)(?: c\/u)?×(\d)/g, (m, a, r) => `${ctD(a)}×${r}`);
}
/* Recorre los textos una sola vez (los ya convertidos no se vuelven a duplicar) */
const ctDone = new WeakSet();
function ctWalk(root) {
  const W = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), L = []; let x; while ((x = W.nextNode())) L.push(x);
  L.forEach(nd => { if (ctDone.has(nd) || (nd.parentNode && nd.parentNode.closest && nd.parentNode.closest('button.cu-sw, input, .cu-tg'))) return; const v = nd.nodeValue, u = ctTotStr(v); if (u !== v) nd.nodeValue = u; ctDone.add(nd); });
}

/* ---------- Textos del coach, indicaciones, Repetir, récords y ficha ---------- */
const _coachForT = coachFor;
coachFor = function (ex) { const c = _coachForT.apply(this, arguments); if (c && ex && cuTot(ex.name)) { c.head = ctTotStr(c.head); c.tips = (c.tips || []).map(ctTotStr); } return c; };
const _agTipT = agTip;
agTip = function (d, i) { const t = _agTipT.apply(this, arguments), e = d && d.exercises[i]; if (t && e && cuTot(e.name)) { t.t = ctTotStr(t.t); if (t.W) t.wTot = 1; } return t; };
if (typeof rpSheet === 'function') {
  const _rpSheetT = rpSheet;
  rpSheet = function () {
    const r = _rpSheetT.apply(this, arguments); if (isWatch() || cuMode() !== 'tot') return r;
    document.querySelectorAll('#sheet .rp-ex').forEach(row => { const b = row.querySelector('b'), n = b && b.textContent.replace(/^[A-Z]\d\s*/, '').trim(); if (n && cuTot(n)) ctWalk(row); });
    return r;
  };
}
const _toastT = toast;
toast = function (msg) {
  const m = typeof msg === 'string' && cuMode() === 'tot' && /Récord en ([^:!]+)[:!]/.exec(msg);
  return _toastT.call(this, m && cuTot(m[1].trim()) ? ctTotStr(msg) : msg);
};
const _exStatsT = exStats;
exStats = function (name) {
  const r = _exStatsT.apply(this, arguments);
  if (!isWatch() && cuTot(name)) { const sc = document.querySelector('#sheet .sheet-card'); if (sc) { ctWalk(sc); if (!sc.querySelector('.ct-note')) sc.insertAdjacentHTML('afterbegin', '<div class="muted ct-note" style="font-size:12px">Pesos en total (las dos mancuernas).</div>'); } }
  return r;
};

/* ---------- 1. Sesión en el teléfono: escribir en total, botón y pregunta ---------- */
/* Lo que se escribe en la casilla de peso de un ejercicio de dos mancuernas en modo "Total" se guarda a la mitad.
   Va antes que los demás (captura en window) y hace lo mismo que ellos: guardar, copiar a las series siguientes y la hora */
window.addEventListener('input', ev => {
  const t = ev.target; if (!t || !t.matches || !t.matches('input[data-f="w"]') || t.dataset.ex == null || !state.draft || isWatch()) return;
  const i = +t.dataset.ex, e = state.draft.exercises[i]; if (!e || !cuTot(e.name)) return;
  ev.stopImmediatePropagation();
  const j = +t.dataset.set, m = e.log[j]; const s = t.dataset.k != null ? (m && (m.drops || [])[+t.dataset.k]) : m; if (!s) return;
  const raw = t.value.replace(',', '.'); if (raw !== '' && !isFinite(+raw)) return;
  const nv = raw === '' ? null : Math.round(+raw / 2 * 1000) / 1000;
  const pv = t._pv == null ? null : String(t._pv).replace(',', '.'), pvS = pv == null || pv === '' ? pv : +pv / 2;
  s.w = nv;
  if (t.dataset.k == null) for (let x = j + 1; x < e.log.length; x++) {
    const o = e.log[x]; if (o.done || !(o.w == null || o.w === '' || (pvS != null && pvS !== '' && Math.abs(+o.w - +pvS) < 1e-6))) continue;
    o.w = nv; const inp = document.getElementById('w-' + i + '-' + x); if (inp && inp !== document.activeElement) inp.value = nv == null ? '' : ctIn(nv * 2);
  }
  t._pv = t.value; state.draft.lastAct = Date.now(); saveDraft();
}, true);
function ctCard(d, i, card) {
  const e = d.exercises[i]; if (!e || !card || card.dataset.ctok) return; card.dataset.ctok = '1';
  const kind = cuKind(e.name); if (!kind) return;
  const two = cuTwo(e.name), tot = cuTot(e.name);
  if (two && !cuPending()) {
    const hd = card.querySelectorAll(':scope > .sets > .h')[2];
    if (hd) hd.innerHTML = `<button type="button" class="cu-sw" data-ct="mode" aria-label="Peso ${tot ? 'total de las dos' : 'de cada mancuerna'}; toca para cambiar">${ctU()} ${tot ? 'total' : 'c/u'} ⇄</button>`;
    if (tot) {
      card.querySelectorAll(':scope > .sets input[data-f="w"]').forEach(inp => { if (inp === document.activeElement) return; const S = e.log[+inp.dataset.set], s = inp.dataset.k != null ? S && (S.drops || [])[+inp.dataset.k] : S; if (s && s.w != null && s.w !== '') inp.value = ctIn(+s.w * 2); });
      card.querySelectorAll(':scope > .sets .prev').forEach(b => { const n = b.querySelector('.num'), sm = b.querySelector('small'); if (n && !b.dataset.ctok) { b.dataset.ctok = '1'; n.textContent = ctD(n.textContent); if (sm) sm.textContent = sm.textContent.replace(/^c\/u /, ''); } });
      card.querySelectorAll('.coach, .sugg, .g2-rec, details.warm').forEach(ctWalk);
    }
    /* La nota, en una línea y según el modo */
    const h = card.querySelector('.cu-hint'); if (h) h.innerHTML = `${ic('dumbbell', 14)} <span>${tot ? 'Anota el peso de <b>las dos juntas</b> (total).' : 'Anota el peso de <b>cada mancuerna</b> (c/u).'}</span>`;
    /* Usuario nuevo: la primera vez, cómo anota */
    if (!state.settings.owner && !state.settings.cuMode && !card.querySelector('.ct-ask')) {
      const sets = card.querySelector(':scope > .sets');
      if (sets) sets.insertAdjacentHTML('beforebegin', `<div class="ct-ask"><b>¿Cómo anotas las mancuernas?</b><div class="row" style="gap:8px"><button type="button" class="btn small" data-ct="ask" data-v="cu">Cada una</button><button type="button" class="btn small" data-ct="ask" data-v="tot">Las dos juntas</button></div></div>`);
    }
  }
  /* Píldora "¿Cuántas mancuernas?" */
  const P = card.querySelector('.su-pills'); if (P && !P.querySelector('.ct-n')) P.insertAdjacentHTML('beforeend', `<button type="button" class="su-p ct-n" data-ct="n" data-i="${i}">${ic('dumbbell', 15)} ${two ? 'Dos mancuernas' : 'Una mancuerna'}</button>`);
  ctOdd(d, i, card);
}
const _renderT = render;
render = function () {
  const r = _renderT.apply(this, arguments), d = state.draft;
  if (d && !isWatch()) document.querySelectorAll('#sx-pager > .sx-page').forEach(pg => ctCard(d, +pg.dataset.i, pg.querySelector('.card.ex')));
  return r;
};

/* ---------- 2. ¿Cuántas mancuernas usas aquí? ---------- */
const ctKey = n => exHKey(n);
function ctSetKind(name, two) {
  const S = state.settings, k = ctKey(name);
  S.cuEx = Object.assign({}, S.cuEx || {}); S.cuEx[k] = two ? 'two' : 'one';
  if (S.cuConv && S.cuConv.at) { const C = S.cuConv; C.two = (C.two || []).filter(x => x !== k); C.one = (C.one || []).filter(x => x !== k); (two ? C.two : C.one).push(k); }
}
/* Todos los pesos guardados de ese ejercicio (para contar, dar un ejemplo y cambiar): sesiones, rutinas, próxima sesión,
   propuesta semanal, entreno para completar, peso máximo y la sesión abierta (solo series no hechas y "Anterior") */
function ctEach(name, fn) {
  const S = state.settings, same = n => exSame(n, name) || ctKey(n) === ctKey(name);
  state.sessions.forEach(s => s.exercises.forEach((e, q) => { if (same(e.name)) fn({ t: 's', s, e, id: 's' + s.id + '#' + q }); }));
  state.plans.forEach(p => p.days.forEach(dd => dd.exercises.forEach(e => { if (same(e.name)) fn({ t: 'p', e, id: 'p' + p.id + '|' + dd.id + '|' + e.id }); })));
  Object.keys(S.nextS || {}).forEach(id => { const N = S.nextS[id]; ((N && N.ia && N.ia.ex) || []).forEach((x, q) => { if (same(x.name)) fn({ t: 'n', e: x, N, id: 'n' + id + '#' + q }); }); });
  if (S.wcProp && S.wcProp.items) S.wcProp.items.forEach((it, q) => { if (it.n && same(it.n)) fn({ t: 'w', e: it, id: 'w' + (S.wcProp.wk || '') + '#' + q }); });
  if (S.wcFill && S.wcFill.list) S.wcFill.list.forEach((e, q) => { if (same(e.name)) fn({ t: 'f', e, id: 'f' + (S.wcFill.id || '') + '#' + q }); });
  Object.keys(S.exMax || {}).forEach(g => { const m = S.exMax[g]; if (m && +m[ctKey(name)] > 0) fn({ t: 'm', m, g, k: ctKey(name), id: 'm' + g }); });
  const d = state.draft; if (d) d.exercises.forEach(e => { if (same(e.name)) fn({ t: 'd', e, id: 'd' + d.id + '|' + e.name }); });
}
/* Multiplica por f los pesos de un dato */
function ctScale(o, f) {
  const r = w => (+w > 0 ? Math.round(+w * f * 1000) / 1000 : w);
  if (o.t === 's') (o.e.sets || []).forEach(x => { x.w = r(x.w); (x.drops || []).forEach(y => { y.w = r(y.w); }); });
  else if (o.t === 'p' || o.t === 'f') o.e.weight = r(o.e.weight);
  else if (o.t === 'n') { (o.e.sets || []).forEach(x => { x.w = r(x.w); }); delete o.N.co; }
  else if (o.t === 'w') ['w0', 'w1', 'pw'].forEach(k => { if (+o.e[k] > 0) o.e[k] = r(o.e[k]); });
  else if (o.t === 'm') o.m[o.k] = r(o.m[o.k]);
  else if (o.t === 'd') { o.e.log.forEach(x => { if (!x.done) x.w = r(x.w); }); (o.e.prev || []).forEach(x => { x.w = r(x.w); }); }
}
const ctMarked = o => (o.t === 'm' ? ((state.settings.cuConv || {}).max || []).some(gk => gk.slice(gk.indexOf('|') + 1) === o.k) : o.t === 'd' ? false : !!o.e.cu);
/* Ejemplo: el último peso con carga de ese ejercicio en el historial (o en la rutina) */
function ctExample(name, onlyMarked) {
  let ex = null; ctEach(name, o => { if (ex || (onlyMarked && !ctMarked(o))) return; if (o.t === 's') { const x = (o.e.sets || []).find(z => +z.w > 0); if (x) ex = { w: +x.w, r: x.r }; } else if (o.t === 'p' && +o.e.weight > 0) ex = { w: +o.e.weight, r: '' }; });
  return ex;
}
/* Cambiar el número de mancuernas de un ejercicio. mode: 'one' (de dos a una: ×2 lo que la conversión dividió),
   'two-yes' (de una a dos y lo anotado era el total: ÷2 todo su historial), 'two-no' (de una a dos, sin cambiar pesos) */
function ctApply(name, mode) {
  const S = state.settings, k = ctKey(name), log = { k, n: exClean(name), mode, prev: cuTwo(name) ? 'two' : 'one', at: Date.now(), ids: [] };
  let marked = false; ctEach(name, o => { if (ctMarked(o)) marked = true; });
  ctEach(name, o => {
    const id = o.id;
    if (mode === 'one' && o.t === 'd' && marked) { ctScale(o, 2); log.ids.push(id); return; }   /* la sesión abierta vino de esos pesos */
    if (mode === 'one' && ctMarked(o)) { ctScale(o, 2); if (o.t === 'm') S.cuConv.max = (S.cuConv.max || []).filter(gk => gk !== o.g + '|' + o.k); else delete o.e.cu; log.ids.push(id); }
    else if (mode === 'two-yes' && o.t !== 'm' && !o.e.cu) { ctScale(o, 0.5); if (o.t !== 'd') o.e.cu = 1; log.ids.push(id); }
    else if (mode === 'two-yes' && o.t === 'm') { ctScale(o, 0.5); log.ids.push(id); }
  });
  ctSetKind(name, mode !== 'one');
  S.cuFixLog = Object.assign({}, S.cuFixLog || {}); S.cuFixLog[k] = log;
  if (typeof cuPendReset === 'function') cuPendReset();
  saveLocal(); savePlans(); if (state.draft) saveDraft();
  return log;
}
/* Deshacer el último cambio de ese ejercicio: lo inverso sobre los mismos datos (mismo orden de recorrido) */
function ctUndo(name) {
  const S = state.settings, k = ctKey(name), log = (S.cuFixLog || {})[k]; if (!log) return null;
  const ids = {}; log.ids.forEach(x => { ids[x] = 1; });
  ctEach(name, o => {
    const id = o.id; if (!ids[id]) return;
    if (log.mode === 'one') { ctScale(o, 0.5); if (o.t === 'm') { if (S.cuConv) S.cuConv.max = (S.cuConv.max || []).concat([o.g + '|' + o.k]); } else if (o.t !== 'd') o.e.cu = 1; }
    else if (log.mode === 'two-yes') { ctScale(o, 2); if (o.t !== 'd' && o.t !== 'm') delete o.e.cu; }
  });
  S.cuEx = Object.assign({}, S.cuEx || {}); delete S.cuEx[k];
  if (S.cuConv && S.cuConv.at) { const C = S.cuConv; C.two = (C.two || []).filter(x => x !== k); C.one = (C.one || []).filter(x => x !== k); (log.prev === 'two' ? C.two : C.one).push(k); }
  else { S.cuEx[k] = log.prev; }
  const L = Object.assign({}, S.cuFixLog); delete L[k]; S.cuFixLog = L;
  if (typeof cuPendReset === 'function') cuPendReset();
  saveLocal(); savePlans(); if (state.draft) saveDraft();
  return log;
}
function ctNSheet(i, step) {
  const d = state.draft, e = d && d.exercises[i]; if (!e) return;
  const name = e.name, two = cuTwo(name), u = ctU(), log = (state.settings.cuFixLog || {})[ctKey(name)];
  const head = `<div class="row"><h2 class="grow">¿Cuántas mancuernas usas aquí?</h2><button class="icon-btn" data-act="sheet-close" aria-label="Cerrar">${ic('x', 18)}</button></div><div class="muted" style="font-size:13px"><b>${esc(exClean(name))}</b> · ahora: ${two ? 'dos mancuernas' : 'una mancuerna'}. La elección vale para este ejercicio en todas tus rutinas.</div>`;
  let body = '';
  if (!step) body = `<div class="cu-tg ct-big" role="group"><button type="button" class="${two ? '' : 'on'}" data-ct="n-pick" data-i="${i}" data-v="one">Una</button><button type="button" class="${two ? 'on' : ''}" data-ct="n-pick" data-i="${i}" data-v="two">Dos</button></div>`
    + (log ? `<div class="label">Último cambio</div><div class="muted" style="font-size:13px">${log.mode === 'one' ? 'De dos a una' : 'De una a dos'}${log.ids.length ? ` (${log.ids.length} ${log.ids.length === 1 ? 'dato cambiado' : 'datos cambiados'})` : ' (sin cambiar pesos)'}.</div><button type="button" class="btn block" data-ct="n-undo" data-i="${i}">Deshacer ese cambio</button>` : '');
  else if (step === 'one') {
    const ex = ctExample(name, true);
    body = ex ? `<div class="muted" style="font-size:13px">La conversión dividió entre 2 los pesos de este ejercicio, y aquí usas una sola mancuerna: vuelven a como los anotaste.</div><div class="ct-ba num">${fmtKg(ex.w)} ${u} c/u${ex.r ? ' × ' + ex.r : ''} → <b>${fmtKg(ex.w * 2)} ${u}${ex.r ? ' × ' + ex.r : ''}</b> (una mancuerna)</div>`
      : `<div class="muted" style="font-size:13px">Los pesos no cambian: solo deja de mostrarse "c/u" y el volumen cuenta una mancuerna.</div>`;
    body += `<button type="button" class="btn primary block" data-ct="n-go" data-i="${i}" data-v="one">Sí, uso una</button><button type="button" class="btn block" data-ct="n" data-i="${i}">Cancelar</button>`;
  } else if (step === 'two') {
    const ex = ctExample(name, false);
    body = `<div class="label">¿Lo que anotaste antes era el total de las dos?</div>`
      + (ex ? `<button type="button" class="btn block" data-ct="n-go" data-i="${i}" data-v="two-yes">Sí, era el total: ${fmtKg(ex.w)} ${u} → <b>${fmtKg(Math.round(ex.w / 2 * 100) / 100)} ${u} c/u</b></button><button type="button" class="btn block" data-ct="n-go" data-i="${i}" data-v="two-no">No, era de cada una: ${fmtKg(ex.w)} ${u} → <b>${fmtKg(ex.w)} ${u} c/u</b></button>`
        : `<button type="button" class="btn primary block" data-ct="n-go" data-i="${i}" data-v="two-no">Uso dos (no hay pesos que cambiar)</button>`)
      + `<button type="button" class="btn block" data-ct="n" data-i="${i}">Cancelar</button>`;
  }
  openSheet(head + body);
  const c = document.querySelector('#sheet .sheet-card'); if (c) c.classList.add('ct-sheet');
}

/* ---------- 3. Pesos que no existen en el gimnasio de hoy ---------- */
function ctOddOf(d, e) {
  if (!cuTwo(e.name) || cuPending()) return null;   /* solo dos mancuernas: "era por mano" no aplica a una sola */
  const L = typeof g5List === 'function' ? g5List(e.name, d.gymId) : null; if (!L) return null;
  if (((state.settings.cuOk || {})[(d.gymId || '') + '|' + ctKey(e.name)])) return null;
  const f = typeof findDay === 'function' ? findDay(d.planId, d.dayId) : null, pe = f && f.d && f.d.exercises.find(x => x.id === e.exId || exSame(x.name, e.name));
  const has = w => L.some(v => Math.abs(v - w) < 0.01);
  const C = [[pe && +pe.weight, 'en tu rutina'], [e.coach && +e.coach.w, 'en la sugerencia'], [+((e.log.find(s => !s.done) || {}).w), 'en la sugerencia'], [+((e.prev || [])[0] || {}).w, 'en "Anterior"']];
  const o = C.find(c => c[0] > 0 && !has(c[0]));
  return o ? { w: o[0], where: o[1] } : null;
}
function ctOdd(d, i, card) {
  const e = d.exercises[i], o = e && ctOddOf(d, e); if (!o || card.querySelector('.ct-odd')) return;
  const sh = w => ctShow(e.name, w), ed = state.ctOddEd === i;
  const html = `<div class="ct-odd" role="alert">${ic('alert-triangle', 16)}<div class="grow"><b>Este peso no existe aquí</b> <span class="muted">(${esc(sh(o.w))} ${o.where})</span>. ¿Corregir?
    ${ed ? `<div class="row" style="gap:8px;margin-top:6px"><input id="ct-odd-in" inputmode="decimal" class="g5-in" style="max-width:110px" placeholder="${cuTot(e.name) ? 'total' : 'kg'}"><button type="button" class="btn small primary" data-ct="odd-set" data-i="${i}" data-w="${o.w}">Guardar</button></div>`
      : `<div class="ct-oddb"><button type="button" class="btn small" data-ct="odd-x2" data-i="${i}" data-w="${o.w}">Era por mano, no el total (${esc(sh(o.w))} → ${esc(sh(Math.round(o.w * 2 * 100) / 100))})</button><button type="button" class="btn small" data-ct="odd-ed" data-i="${i}">Cambiar el peso</button><button type="button" class="btn small" data-ct="odd-ok" data-i="${i}">Está bien, no volver a avisar</button></div>`}</div></div>`;
  const sets = card.querySelector(':scope > .sets'); if (sets) sets.insertAdjacentHTML('beforebegin', html);
}
/* "Era por mano": ×2 ese peso donde esté (rutina, sesión abierta, próxima sesión e historial de ese ejercicio) */
function ctOddX2(name, w) {
  let n = 0; const eq = x => Math.abs(+x - w) < 0.01, r = x => Math.round(+x * 2 * 1000) / 1000;
  ctEach(name, o => {
    if (o.t === 's') (o.e.sets || []).forEach(x => { if (eq(x.w)) { x.w = r(x.w); n++; } });
    else if (o.t === 'p' || o.t === 'f') { if (eq(o.e.weight)) { o.e.weight = r(o.e.weight); n++; } }
    else if (o.t === 'n') (o.e.sets || []).forEach(x => { if (eq(x.w)) { x.w = r(x.w); n++; } });
    else if (o.t === 'd') { o.e.log.forEach(x => { if (!x.done && eq(x.w)) { x.w = r(x.w); n++; } }); (o.e.prev || []).forEach(x => { if (eq(x.w)) x.w = r(x.w); }); if (o.e.coach && eq(o.e.coach.w)) o.e.coach.w = r(o.e.coach.w); }
  });
  saveLocal(); savePlans(); if (state.draft) saveDraft();
  return n;
}
/* "Cambiar el peso": el escrito (en el modo de ese ejercicio) reemplaza ese peso en la rutina, la sesión abierta y la próxima sesión */
function ctOddSet(name, w, nv) {
  const eq = x => Math.abs(+x - w) < 0.01;
  ctEach(name, o => {
    if (o.t === 'p' || o.t === 'f') { if (eq(o.e.weight)) o.e.weight = nv; }
    else if (o.t === 'n') (o.e.sets || []).forEach(x => { if (eq(x.w)) x.w = nv; });
    else if (o.t === 'd') { o.e.log.forEach(x => { if (!x.done && eq(x.w)) x.w = nv; }); if (o.e.coach && eq(o.e.coach.w)) o.e.coach.w = nv; }
  });
  saveLocal(); savePlans(); if (state.draft) saveDraft();
}

/* ---------- Ajustes → Entreno ---------- */
const _vSettingsT = vSettings;
vSettings = function () {
  const h = _vSettingsT.apply(this, arguments); if (isWatch()) return h;
  const m = cuMode();
  return h + `<div class="card ct-set"><div class="row"><span class="cu-ic">${ic('dumbbell', 18)}</span><h3 class="grow">Mancuernas: cómo anotas el peso</h3></div>
    <div class="muted" style="font-size:12.5px">Solo en los ejercicios con dos mancuernas. La app guarda siempre el peso de cada una: esto solo cambia cómo lo escribes y lo ves.</div>
    <div class="cu-tg ct-big" role="group"><button type="button" class="${m === 'cu' ? 'on' : ''}" data-ct="set" data-v="cu">Cada una (c/u)</button><button type="button" class="${m === 'tot' ? 'on' : ''}" data-ct="set" data-v="tot">Las dos juntas (total)</button></div></div>`;
};
if (typeof SET_GRP !== 'undefined') { const g = SET_GRP.find(x => x[0] === 'entreno'); if (g) g[4].push('.ct-set'); }
if (typeof SET_ORDER !== 'undefined') { SET_ORDER.push(['ct-set', 8.5]); SET_ORDER.sort((a, b) => a[1] - b[1]); }

/* ---------- 5. Reloj: el texto y lo que se escribe ---------- */
const _vWatchSessT = vWatchSession;
vWatchSession = function () {
  const h = _vWatchSessT.apply(this, arguments), d = state.draft; if (!d || typeof h !== 'string') return h;
  const e = d.exercises[Math.min(d.cur || 0, d.exercises.length - 1)]; if (!e || !cuTot(e.name)) return h;
  return h.replace(/<b class="num">([\d.,]+)<\/b><small>kg c\/u<\/small><\/button>/, (m, v) => `<b class="num">${ctD(v)}</b><small>kg total</small></button>`)
    .replace(/data-cur="([\d.,]+)"><b class="num">([\d.,]+)<\/b><small>kg c\/u × /, (m, a, b) => `data-cur="${ctD(a)}"><b class="num">${ctD(b)}</b><small>kg total × `);
};
const _w2PadT = w2Pad;
w2Pad = function () {
  const h = _w2PadT.apply(this, arguments), P = w2.pad, d = state.draft, e = d && d.exercises[Math.min(d.cur || 0, d.exercises.length - 1)];
  return P && P.f === 'w' && !P.v && e && cuTot(e.name) ? h.replace(/<span class="ph">([\d.,]+)<\/span>/, (m, v) => `<span class="ph">${ctD(v)}</span>`).replace('Peso en kg', 'Peso total en kg') : h;
};
/* OK del teclado del reloj: lo escrito en total se guarda a la mitad (antes que el manejador del reloj) */
window.addEventListener('click', ev => {
  const b = ev.target.closest && ev.target.closest('[data-act="w2-padok"]'), P = typeof w2 !== 'undefined' && w2.pad, d = state.draft; if (!b || !P || !d) return;
  const e = d.exercises[Math.min(d.cur || 0, d.exercises.length - 1)];
  if (e && cuTot(e.name) && /^(w|wu|tw)$/.test(P.f) && P.v !== '' && isFinite(+P.v)) P.v = String(Math.round(+P.v / 2 * 1000) / 1000);
}, true);

/* ---------- Toques ---------- */
document.addEventListener('click', ev => {
  const b = ev.target.closest && ev.target.closest('[data-ct]'); if (!b) return;
  ev.preventDefault(); ev.stopPropagation();
  const a = b.dataset.ct, i = +b.dataset.i, d = state.draft, e = d && d.exercises[i];
  if (a === 'mode') { state.settings.cuMode = cuMode() === 'tot' ? 'cu' : 'tot'; savePlans(); render(); return toast(cuMode() === 'tot' ? 'Mancuernas: escribes y ves el total de las dos.' : 'Mancuernas: escribes y ves el peso de cada una.'); }
  if (a === 'set' || a === 'ask') { state.settings.cuMode = b.dataset.v === 'tot' ? 'tot' : 'cu'; savePlans(); render(); return; }
  if (a === 'n') return ctNSheet(i);
  if (a === 'n-pick') { const v = b.dataset.v; if ((v === 'two') === cuTwo(e.name)) return closeSheet(); return ctNSheet(i, v); }
  if (a === 'n-go') { const L = ctApply(e.name, b.dataset.v); closeSheet(); render(); return toast(`${exClean(e.name)}: ${b.dataset.v === 'one' ? 'una mancuerna' : 'dos mancuernas'}${L.ids.length ? ' (' + L.ids.length + (L.ids.length === 1 ? ' dato cambiado)' : ' datos cambiados)') : ''}. Puedes deshacerlo en "¿Cuántas mancuernas?".`); }
  if (a === 'n-undo') { ctUndo(e.name); closeSheet(); render(); return toast('Cambio deshecho.'); }
  if (a === 'odd-x2') { const n = ctOddX2(e.name, +b.dataset.w); render(); return toast(`Corregido: ×2 (${n} ${n === 1 ? 'dato' : 'datos'}).`); }
  if (a === 'odd-ed') { state.ctOddEd = i; render(); const n = document.getElementById('ct-odd-in'); if (n) n.focus(); return; }
  if (a === 'odd-set') { const inp = document.getElementById('ct-odd-in'), v = inp && ctN(inp.value); if (!(v > 0)) return toast('Escribe un peso.'); ctOddSet(e.name, +b.dataset.w, cuTot(e.name) ? Math.round(v / 2 * 1000) / 1000 : v); state.ctOddEd = null; render(); return toast('Peso cambiado.'); }
  if (a === 'odd-ok') { const S = state.settings; S.cuOk = Object.assign({}, S.cuOk || {}); S.cuOk[(d.gymId || '') + '|' + ctKey(e.name)] = 1; savePlans(); render(); return; }
}, true);
bootRender();
