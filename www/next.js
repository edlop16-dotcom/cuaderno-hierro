/* ==========================================================================
   Próxima sesión · Parte A: recomendación importada de otra IA (16-oct-2026)
   - Exportar (Analizar / Compartir) pide a la IA las recomendaciones en un formato fijo:
     "Ejercicio | peso | reps o rango | RIR por serie" (ej. "Prensa 45° | 190 | 15 | 2,1,0").
   - "Importar recomendación": pegas la respuesta. Se leen esas líneas y también tablas
     (Ejercicio / Peso / Reps / RIR, con rangos "11-12" y RIR "2,1,0" = 3 series).
   - Cada nombre se empareja con los ejercicios de ese día; si hay duda, se pregunta (nunca se inventa).
   - Vista previa editable (series, peso, reps y RIR por serie) → settings.nextS[díaId].ia.
     No toca los planes ni las sesiones guardadas.
   - Hoy y Mi plan: el día elige "Plan" o "Próxima sesión (importada)" (por defecto la importada si hay).
     Al empezar, las series llevan ese peso, reps y RIR; al terminar, la importada queda usada.
   - El reloj entrena con la elegida, sin crear ni editar.
   ========================================================================== */
const nsOf = id => (state.settings.nextS || {})[id] || null;
const nsSet = id => { const S = state.settings; S.nextS = S.nextS || {}; return S.nextS[id] = S.nextS[id] || {}; };
const nsIa = id => { const n = nsOf(id); return n && n.ia && !n.ia.used ? n.ia : null; };
/* Qué se entrena ese día: lo que elegiste con un toque; si no elegiste, la importada si hay, si no el plan */
function nsPick(id) {
  const n = nsOf(id) || {};
  if (n.pick === 'plan') return 'plan';
  return nsIa(id) ? 'ia' : 'plan';
}
const nsRirTxt = a => a.map(v => v == null ? '?' : v).join('·');
const nsRepTxt = t => t.rMin === t.rMax ? String(t.rMax) : `${t.rMin}-${t.rMax}`;
const nsWhen = at => { try { return new Date(at).toLocaleDateString('es', { day: 'numeric', month: 'short' }); } catch (e) { return ''; } };

/* ---------- 1. Exportar: pedir el formato fijo ---------- */
const _sessionPromptNS = sessionPrompt;
sessionPrompt = function (list) {
  const u = typeof ddUnit === 'function' ? ddUnit() : 'kg';
  return _sessionPromptNS(list) + `\n\n5) Al final, escribe RECOMENDACIONES PARA LA PRÓXIMA SESIÓN con este formato exacto, una línea por ejercicio y sin texto extra en esas líneas (las importo en mi app):\n` +
    `Ejercicio | peso (${u}) | reps o rango | RIR por serie\nEjemplo: Prensa 45° | 190 | 15 | 2,1,0\n` +
    `Usa los mismos nombres de ejercicio que te mandé. El RIR lleva un valor por serie (3 valores = 3 series).`;
};

/* ---------- 2. Leer el texto pegado ---------- */
const NS_DAYS = WDL.map(normName);
function nsParse(txt) {
  const out = [], seen = {};
  let day = null;
  String(txt || '').replace(/\r/g, '').split('\n').forEach(L => {
    const l = L.trim(); if (!l) return;
    const nl = normName(l);
    /* "Recomendaciones para el próximo lunes" → ese día */
    if (/recomend|proxim/.test(nl)) NS_DAYS.forEach((n, i) => { if (new RegExp('(^|[^a-z])' + n + '([^a-z]|$)').test(nl)) day = i; });
    let cells = l.indexOf('|') >= 0 ? l.split('|') : l.indexOf('\t') >= 0 ? l.split('\t') : l.split(/\s{2,}/);
    cells = cells.map(c => c.trim());
    while (cells.length && cells[0] === '') cells.shift();
    while (cells.length && cells[cells.length - 1] === '') cells.pop();
    if (cells.length < 3) return;
    const name = cells[0].replace(/^[-*•\d.)\s]+(?=[a-záéíóúñ])/i, '').trim();
    if (!/[a-záéíóúñ]/i.test(name) || /^ejercicio/i.test(normName(name))) return;
    const wm = cells[1].replace(/\s+/g, '').match(/^~?(\d+(?:[.,]\d+)?)(kg|lb|lbs)?$/i); if (!wm) return;
    const rm = cells[2].replace(/\s+/g, '').match(/^(\d{1,2})(?:(?:-|–|a)(\d{1,2}))?(?:reps?)?$/i); if (!rm) return;
    let rir = null;
    if (cells[3] != null && cells[3] !== '') {
      const s = cells[3].replace(/[@\s]/g, '');
      if (/^\d(?:[,;/·-]\d)*$/.test(s)) rir = s.split(/[,;/·-]/).map(Number);
      else if (!/^[-–?]+$/.test(s)) return;   // la cuarta columna no es un RIR: no es una línea de recomendación
    }
    let w = parseFloat(wm[1].replace(',', '.'));
    const lb = /^lb/i.test(wm[2] || ''), unit = state.settings.unit === 'lb' ? 'lb' : 'kg';
    if (lb && unit === 'kg') w = Math.round(w / 2.20462 * 2) / 2; else if (!lb && wm[2] && unit === 'lb') w = Math.round(w * 2.20462);
    const a = +rm[1], b = +(rm[2] || rm[1]);
    const row = { raw: name, w, rMin: Math.min(a, b), rMax: Math.max(a, b), rir };
    const k = normName(name);
    if (seen[k] != null) out[seen[k]] = row; else { seen[k] = out.length; out.push(row); }   // si se repite, vale la última
  });
  return { day, rows: out };
}

/* ---------- 3. Emparejar con los ejercicios del día (nunca inventa) ---------- */
const nsNorm = s => normName(s).replace(/\(.*?\)/g, ' ').replace(/[°º]/g, ' ').replace(/[^a-z0-9ñ ]/g, ' ')
  .replace(/\b(con|de|del|en|la|el|los|las|al|a|y|kg)\b/g, ' ').replace(/\s+/g, ' ').trim();
function nsScore(raw, name) {
  const rn = nsNorm(raw), cn = nsNorm(name); if (!rn) return 0;
  if (rn === cn) return 3;
  const lx = typeof libFind === 'function' ? libFind(raw) : null, lc = lx && libFind(name);
  if (lx && lc && lx.key === lc.key) return 3;
  const rt = rn.split(' '), ct = cn.split(' ');
  return rt.every(t => ct.some(x => x === t || (t.length >= 4 && x.indexOf(t) === 0))) ? 2 : 0;
}
function nsMatch(rows, dayEx) {
  const taken = {};
  const res = rows.map(r => {
    const sc = dayEx.map(e => ({ e, s: nsScore(r.raw, e.name) })).filter(x => x.s).sort((a, b) => b.s - a.s);
    const sure = sc.length && (sc.length === 1 || sc[0].s > sc[1].s) ? sc[0].e : null;
    return { sure, opts: sc.map(x => x.e.id) };
  });
  /* Primero los seguros; si dos líneas caen en el mismo ejercicio, ninguna es segura */
  res.forEach(x => { if (x.sure) taken[x.sure.id] = (taken[x.sure.id] || 0) + 1; });
  return res.map(x => (x.sure && taken[x.sure.id] === 1 ? { exId: x.sure.id, sure: true, opts: x.opts } : { exId: '', sure: false, opts: x.opts }));
}

/* ---------- 4. Hojas: pegar el texto y vista previa editable ---------- */
function nsDays(planId, dayId) {
  const act = activePlan(), list = [];
  const add = p => p && p.days.forEach(d => { if (!list.some(x => x.d.id === d.id)) list.push({ p, d }); });
  add(state.plans.find(p => p.id === planId)); add(act);
  return list.filter(x => x.d.id === dayId).concat(list.filter(x => x.d.id !== dayId));
}
function nsImportSheet(planId, dayId) {
  state.nsImp = { planId, dayId, touched: false, txt: state.nsImp && state.nsImp.dayId === dayId ? state.nsImp.txt : '' };
  const days = nsDays(planId, dayId);
  openSheet(`<div class="row"><h2 class="grow">Importar recomendación</h2><button class="icon-btn" data-act="sheet-close" aria-label="Cerrar">${ic('x', 18)}</button></div>
    <div class="muted ns-help">Pega la respuesta de tu IA. Leo las líneas <b>Ejercicio | peso | reps | RIR por serie</b> y tablas como Ejercicio / Peso / Reps / RIR. Tu plan no cambia.</div>
    <textarea id="ns-txt" class="ns-txt" rows="8" placeholder="Prensa 45° | 190 | 15 | 2,1,0&#10;Sentadilla Hack | 60 | 11-12 | 2,1,0">${esc(state.nsImp.txt)}</textarea>
    <small class="pb-err" id="ns-txt-e" role="alert" hidden></small>
    <label class="field"><span class="label">Para el día</span><select id="ns-day">${days.map(x => `<option value="${x.p.id}|${x.d.id}" ${x.d.id === dayId ? 'selected' : ''}>${WDL[x.d.weekday]} · ${esc(x.d.name)}</option>`).join('')}</select></label>
    <div class="grid2"><button type="button" class="btn" data-act="sheet-close">Cancelar</button><button type="button" class="btn primary" data-ns="read">Leer</button></div>`);
}
function nsEditSheet() {
  const E = state.nsEd; if (!E) return;
  const { p, d } = findDay(E.planId, E.dayId); if (!d) return closeSheet();
  const used = {}; E.rows.forEach(r => { if (r.exId && r.exId !== 'skip') used[r.exId] = 1; });
  const miss = d.exercises.filter(e => !used[e.id]);
  const u = state.settings.unit === 'lb' ? 'lb' : 'kg';
  openSheet(`<div class="row"><h2 class="grow">Próxima sesión · ${WDL[d.weekday]}</h2><button class="icon-btn" data-act="sheet-close" aria-label="Cerrar">${ic('x', 18)}</button></div>
    <div class="muted ns-help">${esc(d.name)} · ${E.edit ? 'Importada el ' + nsWhen(E.at) : `Leí ${E.rows.length} ${E.rows.length === 1 ? 'ejercicio' : 'ejercicios'}`}. Revisa y guarda: tu plan no cambia.</div>
    ${E.rows.map((r, i) => {
      const bad = E.tried && !r.exId;
      return `<div class="ns-ed ${r.exId === 'skip' ? 'off' : ''}" data-i="${i}">
      ${r.raw ? `<div class="ns-raw">Leído: «${esc(r.raw)}»</div>` : ''}
      <select class="ns-ex" data-ns="ex" data-i="${i}" aria-label="Ejercicio">${r.exId ? '' : '<option value="" selected>¿Cuál es? Elige…</option>'}${d.exercises.map(e => `<option value="${e.id}" ${r.exId === e.id ? 'selected' : ''}>${esc(e.name)}</option>`).join('')}<option value="skip" ${r.exId === 'skip' ? 'selected' : ''}>No usar esta línea</option></select>
      ${!r.sure && r.exId !== 'skip' ? `<small class="ns-ask ${bad ? 'bad' : ''}">${r.exId ? 'Lo elegiste tú.' : 'No estoy seguro de cuál es: elígelo.'}</small>` : ''}
      ${r.exId === 'skip' ? '' : `<div class="ns-f">
        <label><span>Series</span><span class="ns-n"><button type="button" class="icon-btn" data-ns="n" data-d="-1" data-i="${i}" aria-label="Menos series">−</button><b class="num">${r.sets.length}</b><button type="button" class="icon-btn" data-ns="n" data-d="1" data-i="${i}" aria-label="Más series">+</button></span></label>
        <label><span>Peso (${u})</span><input inputmode="decimal" data-ns="w" data-i="${i}" value="${String(r.sets[0].w).replace('.', ',')}"></label>
        <label><span>Reps</span><span class="ns-r"><input inputmode="numeric" data-ns="rmin" data-i="${i}" value="${r.sets[0].rMin}" aria-label="Reps mínimo">–<input inputmode="numeric" data-ns="rmax" data-i="${i}" value="${r.sets[0].rMax}" aria-label="Reps máximo"></span></label></div>
      <div class="ns-rir"><span>RIR por serie</span>${r.sets.map((t, j) => `<input inputmode="numeric" maxlength="1" data-ns="rir" data-i="${i}" data-j="${j}" value="${t.rir == null ? '' : t.rir}" placeholder="–" aria-label="RIR serie ${j + 1}">`).join('')}</div>`}
    </div>`; }).join('')}
    ${miss.length ? `<div class="muted ns-help">Sin recomendación (van como en tu plan): ${miss.map(e => esc(e.name)).join(', ')}.</div>` : ''}
    <small class="pb-err" id="ns-save-e" role="alert" ${E.tried && E.rows.some(r => !r.exId) ? '' : 'hidden'}>Elige a qué ejercicio corresponde cada línea, o "No usar esta línea".</small>
    <div class="grid2">${E.edit ? '<button type="button" class="btn danger" data-ns="drop">Descartar</button>' : '<button type="button" class="btn" data-act="sheet-close">Cancelar</button>'}<button type="button" class="btn primary" data-ns="save">Guardar próxima sesión</button></div>`);
}
function nsRowsFrom(parsed, d) {
  const m = nsMatch(parsed.rows, d.exercises);
  return parsed.rows.map((r, i) => {
    const ex = m[i].exId && d.exercises.find(e => e.id === m[i].exId);
    const n = Math.max(1, Math.min(8, r.rir ? r.rir.length : ex ? ex.sets : 3));
    return { raw: r.raw, exId: m[i].exId, sure: m[i].sure, sets: Array.from({ length: n }, (_, j) => ({ w: r.w, rMin: r.rMin, rMax: r.rMax, rir: r.rir ? r.rir[j] : null })) };
  });
}
function nsOpenEdit(planId, dayId) {
  const ia = nsIa(dayId); if (!ia) return;
  state.nsEd = { planId, dayId, edit: true, at: ia.at, rows: ia.ex.map(x => ({ raw: '', exId: x.exId, sure: true, sets: x.sets.map(t => Object.assign({}, t)) })) };
  nsEditSheet();
}
function nsSaveEd() {
  const E = state.nsEd; if (!E) return;
  E.tried = true;
  if (E.rows.some(r => !r.exId)) { nsEditSheet(); const f = document.querySelector('#sheet .ns-ask.bad'); if (f) f.scrollIntoView({ block: 'center' }); return; }
  const { d } = findDay(E.planId, E.dayId); if (!d) return;
  const ex = E.rows.filter(r => r.exId !== 'skip').map(r => { const e = d.exercises.find(x => x.id === r.exId); return { exId: r.exId, name: e ? e.name : '', sets: r.sets.map(t => ({ w: +t.w || 0, rMin: t.rMin, rMax: t.rMax, rir: t.rir == null || t.rir === '' ? null : +t.rir })) }; });
  if (!ex.length) { toast('No quedó ningún ejercicio para guardar.'); return; }
  const n = nsSet(E.dayId); n.ia = { at: E.edit ? E.at : Date.now(), plan: E.planId, ex }; delete n.pick;
  savePlans(); closeSheet(); state.nsEd = null; render();
  toast(`Próxima sesión (importada) guardada para el ${WDL[d.weekday].toLowerCase()}.`);
}
function nsRead() {
  const txt = ($('#ns-txt') || {}).value || '', sel = ($('#ns-day') || {}).value || '';
  const [planId, dayId] = sel.split('|');
  const P = nsParse(txt), err = $('#ns-txt-e');
  if (!P.rows.length) { if (err) { err.textContent = 'No encontré líneas con el formato "Ejercicio | peso | reps | RIR". Pega la parte de las recomendaciones.'; err.hidden = false; } return; }
  const { d } = findDay(planId, dayId); if (!d) return;
  state.nsEd = { planId, dayId, rows: nsRowsFrom(P, d) };
  nsEditSheet();
}

/* Al pegar: si el texto dice "próximo lunes", se elige ese día (si no lo cambiaste a mano) */
document.addEventListener('input', ev => {
  const t = ev.target;
  if (t.id === 'ns-txt' && state.nsImp) {
    state.nsImp.txt = t.value;
    const P = nsParse(t.value), sel = $('#ns-day'); if (P.day == null || !sel || state.nsImp.touched) return;
    const o = Array.prototype.find.call(sel.options, op => { const r = findDay.apply(null, op.value.split('|')); return r.d && r.d.weekday === P.day; });
    if (o) sel.value = o.value;
    return;
  }
  const E = state.nsEd, k = t.dataset && t.dataset.ns; if (!E || !k || !t.closest('#sheet')) return;
  const r = E.rows[+t.dataset.i]; if (!r) return;
  const v = t.value.replace(',', '.');
  if (k === 'w') r.sets.forEach(s => { s.w = parseFloat(v) || 0; });
  if (k === 'rmin' || k === 'rmax') { const n = parseInt(v, 10); if (n > 0 && n < 60) r.sets.forEach(s => { s[k === 'rmin' ? 'rMin' : 'rMax'] = n; if (s.rMin > s.rMax) { if (k === 'rmin') s.rMax = s.rMin; else s.rMin = s.rMax; } }); }
  if (k === 'rir') { const n = parseInt(v, 10); r.sets[+t.dataset.j].rir = isFinite(n) && n >= 0 && n <= 5 ? n : null; }
});
document.addEventListener('change', ev => {
  const t = ev.target;
  if (t.id === 'ns-day' && state.nsImp) { state.nsImp.touched = true; return; }
  if (t.dataset && t.dataset.ns === 'ex' && state.nsEd) { const r = state.nsEd.rows[+t.dataset.i]; if (r) { r.exId = t.value; r.sure = r.sure && false; } nsEditSheet(); }
});

/* ---------- 5. Elegir en Hoy y en Mi plan ---------- */
function nsPickHtml(planId, dayId) {
  const ia = nsIa(dayId), cur = nsPick(dayId);
  if (!ia) return `<div class="ns-box"><button type="button" class="ns-imp" data-ns="imp" data-plan="${planId}" data-day="${dayId}">${ic('clipboard-list', 16)} Importar recomendación</button></div>`;
  return `<div class="ns-box"><div class="ns-pick" role="group" aria-label="Qué vas a entrenar">
      <button type="button" class="${cur === 'plan' ? 'on' : ''}" data-ns="pick" data-v="plan" data-day="${dayId}" aria-pressed="${cur === 'plan'}">Plan</button>
      <button type="button" class="${cur === 'ia' ? 'on' : ''}" data-ns="pick" data-v="ia" data-day="${dayId}" aria-pressed="${cur === 'ia'}">Próxima sesión <small>(importada)</small></button></div>
    <div class="ns-meta"><span>${cur === 'ia' ? `${ia.ex.length} ${ia.ex.length === 1 ? 'ejercicio' : 'ejercicios'} con peso, reps y RIR de tu IA` : 'Entrenas con tu plan; la importada queda guardada'}</span>
      <button type="button" class="ns-imp" data-ns="edit" data-plan="${planId}" data-day="${dayId}">${ic('square-pen', 15)} Ver o editar</button></div></div>`;
}
const _renderNS = render;
render = function () {
  const r = _renderNS.apply(this, arguments);
  if (isWatch()) return r;
  const app = $('#app'); if (!app || (state.draft && app.querySelector('#sx'))) return r;
  if (state.tab === 'train') {
    const go = app.querySelector('.hoy-hero #btn-start');
    if (go && !app.querySelector('.hoy-hero .ns-box')) go.insertAdjacentHTML('beforebegin', nsPickHtml(go.dataset.plan, go.dataset.day));
  }
  if (state.tab === 'plans') app.querySelectorAll('.rt-actions').forEach(a => {
    const st = a.querySelector('[data-act="start"]'); if (!st || a.previousElementSibling && a.previousElementSibling.classList.contains('ns-box')) return;
    a.insertAdjacentHTML('beforebegin', nsPickHtml(st.dataset.plan, st.dataset.day));
  });
  return r;
};

document.addEventListener('click', ev => {
  const b = ev.target.closest && ev.target.closest('[data-ns]'); if (!b || b.tagName === 'SELECT' || b.tagName === 'INPUT') return;
  ev.stopPropagation(); ev.preventDefault();
  const a = b.dataset.ns;
  if (a === 'imp') return nsImportSheet(b.dataset.plan, b.dataset.day);
  if (a === 'read') return nsRead();
  if (a === 'edit') return nsOpenEdit(b.dataset.plan, b.dataset.day);
  if (a === 'save') return nsSaveEd();
  if (a === 'pick') { nsSet(b.dataset.day).pick = b.dataset.v; savePlans(); return render(); }
  if (a === 'n' && state.nsEd) {
    const r = state.nsEd.rows[+b.dataset.i]; if (!r) return;
    const n = Math.max(1, Math.min(8, r.sets.length + (+b.dataset.d)));
    while (r.sets.length < n) r.sets.push(Object.assign({}, r.sets[r.sets.length - 1], { rir: null }));
    r.sets.length = n; return nsEditSheet();
  }
  if (a === 'drop' && state.nsEd) {
    if (state.nsEd.confirm) { const n = nsSet(state.nsEd.dayId); delete n.ia; delete n.pick; savePlans(); state.nsEd = null; closeSheet(); render(); return toast('Próxima sesión importada descartada.'); }
    state.nsEd.confirm = true; b.textContent = '¿Descartar? Toca otra vez';
  }
}, true);

/* ---------- 6. Entrenar con la importada ---------- */
const _startSessionNS = startSession;
startSession = function (planId, dayId) {
  const r = _startSessionNS.apply(this, arguments);
  const d = state.draft; if (!d || d.dayId !== dayId || d.ns || nsPick(dayId) !== 'ia') return r;
  const ia = nsIa(dayId); if (!ia) return r;
  d.ns = { src: 'ia', at: ia.at };
  ia.ex.forEach(x => {
    const e = d.exercises.find(y => y.exId === x.exId) || d.exercises.find(y => y.name === x.name); if (!e) return;
    const S = x.sets, n = S.length;
    while (e.log.length < n) e.log.push({ w: S[e.log.length].w, r: null, done: false, drops: [] });
    if (e.log.length > n) e.log = e.log.filter((s, j) => j < n || s.done);
    e.log.forEach((s, j) => { const t = S[Math.min(j, n - 1)]; if (s.done) return; s.w = t.w; (s.drops || []).forEach(dr => { if (!dr.done) dr.w = dropW(t.w, e); }); });
    e.target = n; e.repsMin = Math.min.apply(null, S.map(t => t.rMin)); e.repsMax = Math.max.apply(null, S.map(t => t.rMax));
    e.rirT = S.map(t => t.rir); e.ns = 1; delete e.mesoNote;
    e.coach = { w: S[0].w, mode: 'ns', goal: S.map(t => t.rMax), tips: [],
      head: `<b>Próxima sesión (importada): ${fmtKg(S[0].w)} kg × ${nsRepTxt(S[0])}</b> · RIR ${nsRirTxt(e.rirT)}` };
  });
  saveDraft(); render();
  return r;
};
const _coachBoxNS = coachBox;
coachBox = function (e, i) {
  if (!e || !e.ns || !e.coach) return _coachBoxNS.apply(this, arguments);
  const d = state.draft;
  return `<div class="coach ns"><div class="coach-h"><span class="coach-ic">${ic('clipboard-list', 18)}</span><span>${e.coach.head}</span></div>
    <ul><li>Viene de tu IA${d && d.ns ? ' (importada el ' + nsWhen(d.ns.at) + ')' : ''}. Tu plan no cambia.</li></ul></div>`;
};
/* RIR objetivo de cada serie: el de la importada */
function nsWithRir(e, j, fn) {
  const t = e && e.rirT; if (!t || t[j] == null) return fn();
  const keep = rirTarget; rirTarget = () => t[j];
  try { return fn(); } finally { rirTarget = keep; }
}
const _rirPickNS = rirPick;
rirPick = function (i, j, s) { const d = state.draft, e = d && d.exercises[i]; return nsWithRir(e, j, () => _rirPickNS(i, j, s)); };
if (typeof w2RirBlock === 'function') {
  const _w2RirNS = w2RirBlock;
  w2RirBlock = function () { const L = state.wLast, d = state.draft, e = L && d && d.exercises[L.i]; return nsWithRir(e, L ? L.j : 0, () => _w2RirNS()); };
}
const _renderNSrir = render;
render = function () {
  const r = _renderNSrir.apply(this, arguments);
  const d = state.draft; if (!d || isWatch()) return r;
  const cards = document.querySelectorAll('#app .card.ex');
  d.exercises.forEach((e, i) => {
    const c = cards[i]; if (!c || !e.rirT) return;
    c.querySelectorAll('.sets .n .rir').forEach((x, j) => { if (x.textContent !== 'DROP' && e.rirT[j] != null) x.textContent = 'RIR ' + e.rirT[j]; });
  });
  return r;
};
/* Al terminar: la importada queda usada (la próxima vez vuelve a salir "Plan" hasta que importes otra) */
const _finishNS = finishSession;
finishSession = function () {
  const d = state.draft, ns = d && d.ns, day = d && d.dayId, id = d && d.id;
  const r = _finishNS.apply(this, arguments);
  if (ns && day && !state.draft && state.sessions.some(x => x.id === id)) {
    const n = nsOf(day); if (n && n.ia && n.ia.at === ns.at) { n.ia.used = Date.now(); delete n.pick; savePlans(); }
  }
  return r;
};
