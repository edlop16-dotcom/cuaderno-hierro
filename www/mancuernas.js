/* ==========================================================================
   Mancuernas: el peso es SIEMPRE el de cada mancuerna (c/u) (rama mancuernas-cu, 14-nov-2026)
   Antes el dueño anotaba en los ejercicios con DOS mancuernas el TOTAL de las dos. Desde ajustes-gym-5 la app las toma
   por mancuerna, así que su historial se convierte una sola vez (dividir entre 2), con su visto bueno:
   1. Clasificación (`cuKind`): dos mancuernas, una sola, o "Revisar" (se pueden hacer con una o dos). Su elección manda
      (`settings.cuPick` antes de convertir; `settings.cuConv.two/one` después).
   2. Pantalla de conversión (`cuSheet`, solo teléfono y solo el dueño): la lista con un ejemplo antes → después, lo que no
      cambia, pedir sincronizar el reloj, copia automática (`keepSnapshot`) y "Convertir". Con una sesión abierta no deja.
   3. `cuConvert`: sesiones (series y drops), rutinas, la próxima sesión importada de tu IA, la propuesta del coach semanal,
      el entreno para completar guardado y el peso máximo. Cada dato convertido queda marcado (`e.cu`, `s.cuc`), y cada
      sesión ya en la escala nueva lleva `s.cuv`. `settings.cuConv` = { at, two, one, max } (se sincroniza: nunca se repite).
   4. Lo que llegue después (reloj, nube o "Agregar lo que falta" de un respaldo) con fecha anterior a la conversión y sin
      `s.cuv` se convierte solo (`cuLate`). Un respaldo "Reemplazar todo" anterior trae ajustes sin `cuConv`: vuelve a ofrecerse.
   5. Deshacer (`cuUndo`, Ajustes, con confirmación): ×2 solo lo marcado; después se puede volver a convertir.
   6. "c/u" junto al peso de los de dos mancuernas: sesión, "Anterior", coach, indicaciones, Repetir y el reloj (solo ese texto).
   7. Volumen: con dos mancuernas cuenta peso c/u × 2 × reps (`cuMul`, en finsum, session, share, social, stats e index).
   ========================================================================== */
const CU_ONE = /goblet|concentrado|una mano|un brazo|pullover|tate|kroc|rotacion externa|flexion lateral|pronacion|sobre la cabeza/;
const CU_REV = /una pierna|bulgara|zancada|peso muerto|sentadilla|martillo|subida al cajon|step|thruster|renegado/;
/* 'two' | 'one' | 'rev' | null (no es de mancuernas) */
function cuKind(name) {
  const x = libFind(name), n = normName(exClean(name)), f = x ? equipOf(x) : (/mancuerna/.test(n) ? 'manc' : '');
  if (f !== 'manc') return null;
  if (CU_ONE.test(n) || (/\bmancuerna\b/.test(n) && !/dos mancuernas/.test(n))) return /dos mancuernas/.test(n) ? 'two' : 'one';
  if (CU_REV.test(n) || (x && (x.uni || /^(lunge|hinge|squat)$/.test(x.pat || '')))) return 'rev';
  return 'two';
}
const cuDefault = name => { const k = cuKind(name); return k === 'two' || (k === 'rev' && !/una pierna/.test(normName(exClean(name)))); };
const cuActive = () => { const C = state.settings.cuConv; return !!(C && C.at && !C.undone); };
/* ¿Dos mancuernas? Lo que eligió el dueño manda */
function cuTwo(name) {
  if (!cuKind(name)) return false;
  const k = exHKey(name), C = state.settings.cuConv, P = state.settings.cuPick || {};
  if (C && C.at && !C.undone) { if ((C.two || []).indexOf(k) >= 0) return true; if ((C.one || []).indexOf(k) >= 0) return false; }
  if (P[k] != null) return !!P[k];
  return cuDefault(name);
}
/* Sesión en la escala nueva (por mancuerna): marcada, o cualquier sesión de un usuario que no sea el dueño */
const cuPer = s => !s || !!s.cuv || !state.settings.owner;
/* Sesión vieja del dueño con algún ejercicio de dos mancuernas con peso: hay que convertirla */
const cuOld = s => !!(s && !s.cuv && s.exercises && s.exercises.some(e => cuTwo(e.name) && (e.sets || []).some(x => +x.w > 0)));
/* Con memoria corta: se consulta muchas veces en cada dibujo */
let cuPC = null;
const cuPendReset = () => { cuPC = null; };
function cuPending() {
  const S = state.settings, C = S.cuConv || {}, k = state.sessions.length + '|' + (S.owner ? 1 : 0) + '|' + (C.at || 0) + '|' + (C.undone || 0) + '|' + JSON.stringify(S.cuPick || {}) + '|' + JSON.stringify(S.cuEx || {});
  const now = Date.now(); if (cuPC && now - cuPC.t < 400 && cuPC.k === k) return cuPC.v;   /* se recalcula si cambia la conversión o una elección */
  const v = !!S.owner && !cuActive() && state.sessions.some(cuOld); cuPC = { t: now, k, v }; return v;
}
/* Multiplicador del volumen: dos mancuernas en la escala nueva = ×2 (s = null: la sesión en curso) */
function cuMul(name, s) { if (!cuTwo(name)) return 1; if (s == null) return cuPending() ? 1 : 2; return cuPer(s) ? 2 : 1; }
const cuHalf = w => Math.round((+w || 0) / 2 * 100) / 100;
const cuDbl = w => Math.round((+w || 0) * 2 * 100) / 100;

/* ---------- Lista para la pantalla de conversión ---------- */
function cuItems() {
  const seen = {}, out = [];
  const add = (name, ex) => { if (!cuKind(name)) return; const k = exHKey(name); if (!seen[k]) { seen[k] = { k, n: exClean(name), kind: cuKind(name), ex: null, cnt: 0 }; out.push(seen[k]); } const o = seen[k]; if (ex) { o.cnt++; if (!o.ex) o.ex = ex; } };
  state.sessions.forEach(s => { if (s.cuv) return; s.exercises.forEach(e => { const x = (e.sets || []).filter(t => +t.w > 0)[0]; add(e.name, x ? { w: +x.w, r: x.r, date: s.date } : null); }); });
  state.plans.forEach(p => p.days.forEach(d => d.exercises.forEach(e => { add(e.name, +e.weight > 0 ? { w: +e.weight, r: e.repsMax || e.repsMin || '', plan: 1 } : null); })));
  return out.filter(o => o.ex);
}
const cuExTxt = (o, two) => { const r = o.ex.r ? ' × ' + o.ex.r : '', u = state.settings.unit === 'lb' ? 'lb' : 'kg';
  return two ? `${fmtKg(o.ex.w)} ${u}${r} → <b>${fmtKg(cuHalf(o.ex.w))} ${u} c/u${r}</b>` : `${fmtKg(o.ex.w)} ${u}${r} (sin cambio)`; };
function cuRow(o) {
  const two = cuTwo(o.n);
  return `<div class="cu-row ${o.kind === 'rev' ? 'rev' : ''}" data-k="${esc(o.k)}"><span class="grow"><b>${esc(o.n)}</b>${o.kind === 'rev' ? ' <span class="cu-tag">Revisar</span>' : ''}<small class="muted num">${cuExTxt(o, two)}${o.ex.plan ? ' · rutina' : ''}</small></span>
    <span class="cu-tg" role="group" aria-label="¿Cuántas mancuernas en ${esc(o.n)}?"><button type="button" class="${two ? 'on' : ''}" data-cu="pick" data-k="${esc(o.k)}" data-v="1" aria-pressed="${two}">Dos</button><button type="button" class="${two ? '' : 'on'}" data-cu="pick" data-k="${esc(o.k)}" data-v="0" aria-pressed="${!two}">Una</button></span></div>`;
}
function cuSheet() {
  const L = cuItems(), rev = L.filter(o => o.kind === 'rev'), two = L.filter(o => o.kind !== 'rev' && cuTwo(o.n)), one = L.filter(o => o.kind !== 'rev' && !cuTwo(o.n));
  const busy = !!state.draft, acc = typeof sync !== 'undefined' && sync.on && sync.on(), ok = !acc || !!state.cuSynced;
  openSheet(`<div class="row"><h2 class="grow">Mancuernas: peso de cada una</h2><button class="icon-btn" data-act="sheet-close" aria-label="Cerrar">${ic('x', 18)}</button></div>
    <div class="muted" style="font-size:13px">Desde ahora el peso de las mancuernas es <b>por cada mancuerna (c/u)</b>. En los ejercicios con <b>dos</b> mancuernas anotabas el total de las dos: los divido entre 2, una sola vez. Los de <b>una</b> mancuerna no cambian. Máquinas, poleas, prensa y barra tampoco.</div>
    ${busy ? `<div class="g5-warn" role="alert">${ic('alert-triangle', 16)}<span>Tienes una sesión abierta: termínala o descártala antes de convertir.</span></div>` : ''}
    ${acc ? `<div class="label">1 · Antes, sincroniza tu reloj</div><div class="muted" style="font-size:13px">Abre Forja en el reloj con internet y espera a que sincronice; luego toca "Sincronizar ahora" aquí.</div>
      <button type="button" class="btn block" data-cu="sync">${ic('refresh-cw', 16)} Sincronizar ahora</button>
      <label class="row cu-ck" style="gap:10px"><input type="checkbox" id="cu-sync" ${state.cuSynced ? 'checked' : ''} style="width:20px;height:20px"><span>Ya sincronicé el reloj (o no uso reloj)</span></label>` : ''}
    ${rev.length ? `<div class="label">Revisar: ¿una o dos mancuernas?</div><div class="cu-list">${rev.map(cuRow).join('')}</div>` : ''}
    <div class="label">Voy a dividir entre 2 (${two.length + rev.filter(o => cuTwo(o.n)).length})</div><div class="cu-list">${two.map(cuRow).join('') || '<div class="muted">Ninguno.</div>'}</div>
    <div class="label">No cambio: una sola mancuerna (${one.length + rev.filter(o => !cuTwo(o.n)).length})</div><div class="cu-list">${one.map(cuRow).join('') || '<div class="muted">Ninguno.</div>'}</div>
    <div class="muted" style="font-size:12.5px">También se dividen tus rutinas, los pesos sugeridos guardados y los pesos máximos de esos ejercicios. Antes guardo una copia automática de tus datos, y en Ajustes queda "Deshacer conversión de mancuernas".</div>
    <button type="button" class="btn primary block" data-cu="go" ${busy || !ok ? 'disabled' : ''}>Convertir</button>
    <button type="button" class="btn block" data-act="sheet-close">Ahora no</button>`);
  const c = document.querySelector('#sheet .sheet-card'); if (c) c.classList.add('cu-sheet');
}

/* ---------- Convertir y deshacer ---------- */
/* Copia automática antes de convertir: todo cdh.* en su propia clave (no en cdh.preupd, que la app usa al actualizarse para
   reponer lo que falte; ni dentro del respaldo .forja). Devuelve false si no se pudo guardar (sin espacio): entonces no convierte */
if (typeof KEEP_SKIP !== 'undefined') KEEP_SKIP.push('cdh.cuBackup');
if (typeof RC_SKIP !== 'undefined') RC_SKIP.push('cdh.cuBackup');
function cuBackup() {
  try {
    const o = {}; Object.keys(localStorage).forEach(k => { if (k.indexOf('cdh.') === 0 && (typeof KEEP_SKIP === 'undefined' || KEEP_SKIP.indexOf(k) < 0)) o[k] = localStorage.getItem(k); });
    localStorage.setItem('cdh.cuBackup', JSON.stringify({ at: Date.now(), data: o }));
    return !!localStorage.getItem('cdh.cuBackup');
  } catch (e) { return false; }
}
function cuConvSess(s, two) {
  let any = false;
  s.exercises.forEach(e => { if (e.cu || two.indexOf(exHKey(e.name)) < 0) return; (e.sets || []).forEach(x => { x.w = cuHalf(x.w); (x.drops || []).forEach(y => { y.w = cuHalf(y.w); }); }); e.cu = 1; any = true; });
  s.cuv = 1; if (any) s.cuc = state.settings.cuConv ? state.settings.cuConv.at : Date.now(); s.mt = Date.now();
  return any;
}
function cuConvert() {
  if (state.draft || cuActive()) return null;
  if (!cuBackup()) return { err: 'copia' };
  const at = Date.now(), L = cuItems(), keyOf = n => exHKey(n), all = {};
  state.sessions.forEach(s => s.exercises.forEach(e => { if (cuKind(e.name)) all[keyOf(e.name)] = e.name; }));
  state.plans.forEach(p => p.days.forEach(d => d.exercises.forEach(e => { if (cuKind(e.name)) all[keyOf(e.name)] = e.name; })));
  L.forEach(o => { all[o.k] = o.n; });
  const two = Object.keys(all).filter(k => cuTwo(all[k])), one = Object.keys(all).filter(k => !cuTwo(all[k]));
  const isTwo = n => two.indexOf(keyOf(n)) >= 0, S = state.settings, max = [];
  S.cuConv = { v: 1, at, two, one, max };
  let n = 0;
  state.sessions.forEach(s => { if (!s.cuv && cuConvSess(s, two)) n++; else if (!s.cuv) { s.cuv = 1; s.mt = Date.now(); } });
  state.plans.forEach(p => p.days.forEach(d => d.exercises.forEach(e => { if (isTwo(e.name) && !e.cu) { if (+e.weight > 0) e.weight = cuHalf(e.weight); e.cu = 1; } })));
  Object.keys(S.nextS || {}).forEach(id => { const N = S.nextS[id]; if (!N) return; delete N.co; ((N.ia && N.ia.ex) || []).forEach(x => { if (isTwo(x.name) && !x.cu) { (x.sets || []).forEach(t => { if (+t.w > 0) t.w = cuHalf(t.w); }); x.cu = 1; } }); });
  Object.keys(S.exMax || {}).forEach(g => { const m = S.exMax[g] || {}; Object.keys(m).forEach(k => { if (two.indexOf(k) >= 0 && +m[k] > 0) { m[k] = cuHalf(m[k]); max.push(g + '|' + k); } }); });
  if (S.wcProp && S.wcProp.items) S.wcProp.items.forEach(it => { if (it.n && isTwo(it.n) && !it.cu) { ['w0', 'w1', 'pw'].forEach(f => { if (+it[f] > 0) it[f] = cuHalf(it[f]); }); it.cu = 1; } });
  if (S.wcFill && S.wcFill.list) S.wcFill.list.forEach(e => { if (isTwo(e.name) && !e.cu) { if (+e.weight > 0) e.weight = cuHalf(e.weight); e.cu = 1; } });
  delete S.cuPick; cuPendReset();
  saveLocal(); savePlans();
  try { if (typeof sync !== 'undefined' && sync.soon) sync.soon(500); } catch (e) {}
  return { n, two: two.length, one: one.length };
}
function cuUndo() {
  const S = state.settings, C = S.cuConv; if (!C || !C.at || C.undone || state.draft) return null;
  let n = 0;
  state.sessions.forEach(s => {
    let any = false; s.exercises.forEach(e => { if (!e.cu) return; (e.sets || []).forEach(x => { x.w = cuDbl(x.w); (x.drops || []).forEach(y => { y.w = cuDbl(y.w); }); }); delete e.cu; any = true; });
    if (any || s.cuc) { delete s.cuc; delete s.cuv; s.mt = Date.now(); if (any) n++; }
  });
  state.plans.forEach(p => p.days.forEach(d => d.exercises.forEach(e => { if (e.cu) { if (+e.weight > 0) e.weight = cuDbl(e.weight); delete e.cu; } })));
  Object.keys(S.nextS || {}).forEach(id => { const N = S.nextS[id]; if (!N) return; delete N.co; ((N.ia && N.ia.ex) || []).forEach(x => { if (x.cu) { (x.sets || []).forEach(t => { if (+t.w > 0) t.w = cuDbl(t.w); }); delete x.cu; } }); });
  (C.max || []).forEach(gk => { const i = gk.indexOf('|'), g = gk.slice(0, i), k = gk.slice(i + 1), m = (S.exMax || {})[g]; if (m && +m[k] > 0) m[k] = cuDbl(m[k]); });
  if (S.wcProp && S.wcProp.items) S.wcProp.items.forEach(it => { if (it.cu) { ['w0', 'w1', 'pw'].forEach(f => { if (+it[f] > 0) it[f] = cuDbl(it[f]); }); delete it.cu; } });
  if (S.wcFill && S.wcFill.list) S.wcFill.list.forEach(e => { if (e.cu) { if (+e.weight > 0) e.weight = cuDbl(e.weight); delete e.cu; } });
  S.cuConv = Object.assign({}, C, { undone: Date.now() }); cuPendReset();
  saveLocal(); savePlans();
  try { if (typeof sync !== 'undefined' && sync.soon) sync.soon(500); } catch (e) {}
  return { n };
}
/* Lo que llega después con fecha anterior a la conversión y sin marca (reloj, nube, respaldo): se convierte solo */
function cuLate() {
  if (!cuActive()) return 0;
  const C = state.settings.cuConv, at = +C.at, two = C.two || []; let n = 0;
  state.sessions.forEach(s => { if (s.cuv || !(+new Date(s.date) < at)) return; cuConvSess(s, two); n++; });
  if (n) { saveLocal(); cuPendReset(); }
  return n;
}
/* Las sesiones nuevas ya van por mancuerna (salvo mientras el dueño no haya convertido: entran en la conversión) */
const _finishSessionCu = finishSession;
finishSession = function () {
  const id = state.draft && state.draft.id, r = _finishSessionCu.apply(this, arguments);
  if (id && !cuPending()) { const s = state.sessions.find(x => x.id === id); if (s && !s.cuv) { s.cuv = 1; saveLocal(); } }
  return r;
};

/* ---------- "c/u" junto al peso ---------- */
const cuTxt = (name, t) => (cuTwo(name) && !cuPending() && typeof t === 'string' ? t.replace(/(\d+(?:[.,]\d+)?)(<\/b>)? (kg|lb)\b(?! c\/u)/g, '$1$2 $3 c/u') : t);
const _coachForCu = coachFor;
coachFor = function (ex) {
  const c = _coachForCu.apply(this, arguments); if (!c || !ex || !cuTwo(ex.name)) return c;
  c.head = cuTxt(ex.name, c.head); c.tips = (c.tips || []).map(t => cuTxt(ex.name, t)); return c;
};
const _agTipCu = agTip;
agTip = function (d, i) { const t = _agTipCu.apply(this, arguments), e = d && d.exercises[i]; if (t && e) t.t = cuTxt(e.name, t.t); return t; };
/* Teléfono: encabezado "Kg c/u", "Anterior" con c/u y una nota mientras no hay series hechas */
function cuSessDecor() {
  const d = state.draft; if (!d || isWatch() || cuPending()) return;
  document.querySelectorAll('#sx-pager > .sx-page').forEach(pg => {
    const i = +pg.dataset.i, e = d.exercises[i], card = pg.querySelector('.card.ex'); if (!e || !card || !cuTwo(e.name) || card.dataset.cu) return;
    card.dataset.cu = '1';
    const hd = card.querySelectorAll(':scope > .sets > .h'); if (hd[2] && /^kg$/i.test(hd[2].textContent.trim())) hd[2].textContent = 'Kg c/u';
    card.querySelectorAll(':scope > .sets .prev small').forEach(sm => { if (!/c\/u/.test(sm.textContent)) sm.textContent = 'c/u ' + sm.textContent; });
    const co = card.querySelectorAll('.coach, .sugg, .g2-rec, .ag-tip'); co.forEach(x => cuWalk(x, s => s.replace(/(\d+(?:[.,]\d+)?) (kg|lb)\b/g, '$1 $2 c/u')));
    const sets = card.querySelector(':scope > .sets');
    if (sets && !e.log.some(s => s.done)) sets.insertAdjacentHTML('beforebegin', `<div class="cu-hint">${ic('dumbbell', 14)} Anota el peso de <b>cada mancuerna</b> (c/u), no la suma de las dos.</div>`);
  });
}
/* Cambia solo los textos de un elemento (sin tocar botones ni la estructura); no repite "c/u" */
function cuWalk(root, fn) {
  const W = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), L = []; let x; while ((x = W.nextNode())) L.push(x);
  L.forEach(nd => { if (nd.parentNode && nd.parentNode.closest && nd.parentNode.closest('button, input, .cu-tg')) return; const v = nd.nodeValue; if (/c\/u/.test(v)) return; const u = fn(v); if (u !== v) nd.nodeValue = u; });
  /* "5" en negrita y " kg" en el texto siguiente */
  L.forEach(nd => { const p = nd.previousSibling; if (p && p.nodeType === 1 && /\d$/.test(p.textContent) && /^ (kg|lb)\b(?! c\/u)/.test(nd.nodeValue)) nd.nodeValue = nd.nodeValue.replace(/^ (kg|lb)\b/, ' $1 c/u'); });
}
/* Repetir este entreno: "Hoy" y "Ese día" con c/u */
const _rpSheetCu = typeof rpSheet === 'function' ? rpSheet : null;
if (_rpSheetCu) rpSheet = function () {
  const r = _rpSheetCu.apply(this, arguments); if (isWatch() || cuPending()) return r;
  document.querySelectorAll('#sheet .rp-ex').forEach(row => {
    const b = row.querySelector('b'), n = b && b.textContent.replace(/^[A-Z]\d\s*/, '').trim(); if (!n || !cuTwo(n)) return;
    cuWalk(row, s => s.replace(/(\d+(?:[.,]\d+)?) (kg|lb)\b(?! c\/u)/g, '$1 $2 c/u').replace(/(\d+(?:[.,]\d+)?)×(\d)/g, '$1 c/u×$2'));
  });
  return r;
};
/* Reloj: solo el texto "kg" del peso (serie y calentamiento) pasa a "kg c/u" */
const _vWatchSessCu = vWatchSession;
vWatchSession = function () {
  const h = _vWatchSessCu.apply(this, arguments), d = state.draft; if (!d || typeof h !== 'string' || cuPending()) return h;
  const e = d.exercises[Math.min(d.cur || 0, d.exercises.length - 1)];
  return e && cuTwo(e.name) ? h.replace('<small>kg</small></button>', '<small>kg c/u</small></button>').replace('<small>kg × ', '<small>kg c/u × ') : h;
};

/* ---------- Tarjeta en Hoy y en Ajustes ---------- */
function cuCardHtml() {
  return `<div class="card cu-card"><div class="row" style="gap:10px"><span class="cu-ic">${ic('dumbbell', 18)}</span><div class="grow"><b>Mancuernas: peso de cada una</b><div class="muted" style="font-size:12.5px">Antes anotabas el total de las dos. Revisa la lista y convierte tu historial una sola vez.</div></div></div>
    <button type="button" class="btn primary block" data-cu="open">Revisar y convertir</button></div>`;
}
const _vSettingsCu = vSettings;
vSettings = function () {
  const h = _vSettingsCu.apply(this, arguments), S = state.settings; if (isWatch() || !S.owner) return h;
  const C = S.cuConv, act = cuActive();
  return h + `<div class="card cu-set"><div class="row"><span class="cu-ic">${ic('dumbbell', 18)}</span><h3 class="grow">Mancuernas (c/u)</h3></div>
    <div class="muted" style="font-size:12.5px">${act ? `Convertiste tu historial el ${fmtDate(new Date(C.at).toISOString())}: el peso de las mancuernas es por cada una.` : cuPending() ? 'Tu historial aún tiene el total de las dos mancuernas.' : 'El peso de las mancuernas es por cada una.'}</div>
    ${act ? `<button type="button" class="btn block ${state.cuUndoAsk ? 'danger' : ''}" data-cu="undo">${state.cuUndoAsk ? '¿Seguro? Multiplica por 2 lo convertido. Toca otra vez' : 'Deshacer conversión de mancuernas'}</button>` : cuPending() ? '<button type="button" class="btn block" data-cu="open">Revisar y convertir</button>' : ''}</div>`;
};
if (typeof SET_ORDER !== 'undefined') { SET_ORDER.push(['cu-set', 12.5]); SET_ORDER.sort((a, b) => a[1] - b[1]); }
const _renderCu = render;
render = function () {
  if (cuActive() && !state.cuLateBusy) { state.cuLateBusy = 1; try { cuLate(); } finally { state.cuLateBusy = 0; } }
  const r = _renderCu.apply(this, arguments);
  if (!isWatch()) {
    cuSessDecor();
    if (state.tab === 'train' && !state.draft && cuPending()) {
      const app = document.getElementById('app'), first = app && app.querySelector(':scope > .card');
      if (app && !app.querySelector('.cu-card')) { if (first) first.insertAdjacentHTML('beforebegin', cuCardHtml()); else app.insertAdjacentHTML('beforeend', cuCardHtml()); }
    }
  }
  return r;
};
document.addEventListener('change', ev => { if (ev.target && ev.target.id === 'cu-sync') { state.cuSynced = !!ev.target.checked; const b = document.querySelector('#sheet [data-cu="go"]'); if (b) b.disabled = !state.cuSynced || !!state.draft; } }, true);
document.addEventListener('click', ev => {
  const b = ev.target.closest && ev.target.closest('[data-cu]'); if (!b) return;
  ev.preventDefault(); ev.stopPropagation();
  const a = b.dataset.cu;
  if (a === 'open') return cuSheet();
  if (a === 'pick') { const P = state.settings.cuPick = Object.assign({}, state.settings.cuPick || {}); P[b.dataset.k] = b.dataset.v === '1' ? 1 : 0; cuPendReset(); savePlans(); const c = document.querySelector('#sheet .sheet-card'), top = c ? c.scrollTop : 0; cuSheet(); const n = document.querySelector('#sheet .sheet-card'); if (n) n.scrollTop = top; return; }
  if (a === 'sync') { try { if (sync.on()) sync.run().then(() => toast('Sincronizado.')).catch(() => toast('No se pudo sincronizar: revisa tu internet.')); } catch (e) {} return; }
  if (a === 'go') { const R = cuConvert(); if (R && R.err) return toast('No pude guardar la copia de tus datos (poco espacio): no convertí nada.'); closeSheet(); render(); if (R) toast(`Listo: ${R.n} ${R.n === 1 ? 'sesión convertida' : 'sesiones convertidas'} a peso por mancuerna. Se guardó una copia antes.`); return; }
  if (a === 'undo') { if (!state.cuUndoAsk) { state.cuUndoAsk = 1; render(); return; } state.cuUndoAsk = 0; const R = cuUndo(); render(); if (R) toast(`Conversión deshecha en ${R.n} ${R.n === 1 ? 'sesión' : 'sesiones'}.`); return; }
}, true);
bootRender();
