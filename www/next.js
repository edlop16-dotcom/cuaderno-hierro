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
   Parte B (Coach automático): ver la sección "Parte B" más abajo.
   ========================================================================== */
const nsOf = id => (state.settings.nextS || {})[id] || null;
const nsSet = id => { const S = state.settings; S.nextS = S.nextS || {}; return S.nextS[id] = S.nextS[id] || {}; };
const nsIa = id => { const n = nsOf(id); return n && n.ia && !n.ia.used ? n.ia : null; };
/* Qué se entrena ese día: lo que elegiste con un toque; si no elegiste: la importada si hay,
   si no el Coach (solo con "Usar el Coach por defecto" en Ajustes), si no el plan */
function nsPick(id) {
  const n = nsOf(id) || {}, co = nsCoachOn(id);
  if (n.pick === 'plan') return 'plan';
  if (n.pick === 'coach' && co) return 'coach';
  if (n.pick === 'ia' && nsIa(id)) return 'ia';
  if (nsIa(id)) return 'ia';
  return state.settings.coachDef && co ? 'coach' : 'plan';
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
  const co = E.src === 'coach';
  openSheet(`<div class="row"><h2 class="grow">${co ? 'Próxima sesión (Coach)' : 'Próxima sesión'} · ${WDL[d.weekday]}</h2><button class="icon-btn" data-act="sheet-close" aria-label="Cerrar">${ic('x', 18)}</button></div>
    <div class="muted ns-help">${esc(d.name)} · ${co ? (E.edited ? 'Editada por ti' : 'Armada con tu historial, la semana del bloque y cómo llegas hoy') : E.edit ? 'Importada el ' + nsWhen(E.at) : `Leí ${E.rows.length} ${E.rows.length === 1 ? 'ejercicio' : 'ejercicios'}`}. Revisa y guarda: tu plan no cambia.</div>
    ${E.rows.map((r, i) => {
      const bad = E.tried && !r.exId, nm = (d.exercises.find(e => e.id === r.exId) || {}).name || '';
      return `<div class="ns-ed ${r.exId === 'skip' ? 'off' : ''}" data-i="${i}">
      ${r.raw ? `<div class="ns-raw">Leído: «${esc(r.raw)}»</div>` : ''}
      ${co ? `<b class="ns-name">${esc(nm)}</b>${r.why ? `<div class="ns-why">${esc(r.why)}</div>` : ''}` : `<select class="ns-ex" data-ns="ex" data-i="${i}" aria-label="Ejercicio">${r.exId ? '' : '<option value="" selected>¿Cuál es? Elige…</option>'}${d.exercises.map(e => `<option value="${e.id}" ${r.exId === e.id ? 'selected' : ''}>${esc(e.name)}</option>`).join('')}<option value="skip" ${r.exId === 'skip' ? 'selected' : ''}>No usar esta línea</option></select>`}
      ${!co && !r.sure && r.exId !== 'skip' ? `<small class="ns-ask ${bad ? 'bad' : ''}">${r.exId ? 'Lo elegiste tú.' : 'No estoy seguro de cuál es: elígelo.'}</small>` : ''}
      ${r.exId === 'skip' ? '' : `<div class="ns-f">
        <label><span>Series</span><span class="ns-n"><button type="button" class="icon-btn" data-ns="n" data-d="-1" data-i="${i}" aria-label="Menos series">−</button><b class="num">${r.sets.length}</b><button type="button" class="icon-btn" data-ns="n" data-d="1" data-i="${i}" aria-label="Más series">+</button></span></label>
        <label><span>Peso (${u})</span><input inputmode="decimal" data-ns="w" data-i="${i}" value="${String(r.sets[0].w).replace('.', ',')}"></label>
        <label><span>Reps</span><span class="ns-r"><input inputmode="numeric" data-ns="rmin" data-i="${i}" value="${r.sets[0].rMin}" aria-label="Reps mínimo">–<input inputmode="numeric" data-ns="rmax" data-i="${i}" value="${r.sets[0].rMax}" aria-label="Reps máximo"></span></label></div>
      <div class="ns-rir"><span>RIR por serie</span>${r.sets.map((t, j) => `<input inputmode="numeric" maxlength="1" data-ns="rir" data-i="${i}" data-j="${j}" value="${t.rir == null ? '' : t.rir}" placeholder="–" aria-label="RIR serie ${j + 1}">`).join('')}</div>`}
    </div>`; }).join('')}
    ${miss.length ? `<div class="muted ns-help">Sin recomendación (van como en tu plan): ${miss.map(e => esc(e.name)).join(', ')}.</div>` : ''}
    <small class="pb-err" id="ns-save-e" role="alert" ${E.tried && E.rows.some(r => !r.exId) ? '' : 'hidden'}>Elige a qué ejercicio corresponde cada línea, o "No usar esta línea".</small>
    <div class="grid2">${E.edit || co ? '<button type="button" class="btn danger" data-ns="drop">Descartar</button>' : '<button type="button" class="btn" data-act="sheet-close">Cancelar</button>'}<button type="button" class="btn primary" data-ns="save">Guardar próxima sesión</button></div>`);
}
function nsRowsFrom(parsed, d) {
  const m = nsMatch(parsed.rows, d.exercises);
  return parsed.rows.map((r, i) => {
    const ex = m[i].exId && d.exercises.find(e => e.id === m[i].exId);
    const n = Math.max(1, Math.min(8, r.rir ? r.rir.length : ex ? ex.sets : 3));
    return { raw: r.raw, exId: m[i].exId, sure: m[i].sure, sets: Array.from({ length: n }, (_, j) => ({ w: r.w, rMin: r.rMin, rMax: r.rMax, rir: r.rir ? r.rir[j] : null })) };
  });
}
function nsOpenEdit(planId, dayId, src) {
  if (src === 'coach') {
    const C = nsCoachEntry(planId, dayId); if (!C) return;
    state.nsEd = { planId, dayId, src: 'coach', edit: true, edited: !!C.edited, at: C.at, rows: C.ex.map(x => ({ raw: '', exId: x.exId, sure: true, why: x.why, sets: x.sets.map(t => Object.assign({}, t)) })) };
    return nsEditSheet();
  }
  const ia = nsIa(dayId); if (!ia) return;
  state.nsEd = { planId, dayId, edit: true, at: ia.at, rows: ia.ex.map(x => ({ raw: '', exId: x.exId, sure: true, sets: x.sets.map(t => Object.assign({}, t)) })) };
  nsEditSheet();
}
function nsSaveEd() {
  const E = state.nsEd; if (!E) return;
  E.tried = true;
  if (E.rows.some(r => !r.exId)) { nsEditSheet(); const f = document.querySelector('#sheet .ns-ask.bad'); if (f) f.scrollIntoView({ block: 'center' }); return; }
  const { d } = findDay(E.planId, E.dayId); if (!d) return;
  const ex = E.rows.filter(r => r.exId !== 'skip').map(r => { const e = d.exercises.find(x => x.id === r.exId); return { exId: r.exId, name: e ? e.name : '', why: r.why, sets: r.sets.map(t => ({ w: +t.w || 0, rMin: t.rMin, rMax: t.rMax, rir: t.rir == null || t.rir === '' ? null : +t.rir })) }; });
  if (!ex.length) { toast('No quedó ningún ejercicio para guardar.'); return; }
  const n = nsSet(E.dayId);
  if (E.src === 'coach') { n.co = { at: Date.now(), base: nsKey(E.planId, E.dayId), ex }; n.pick = 'coach'; delete n.coOff; }
  else { ex.forEach(x => delete x.why); n.ia = { at: E.edit ? E.at : Date.now(), plan: E.planId, ex }; delete n.pick; }
  savePlans(); closeSheet(); state.nsEd = null; render();
  toast(`Próxima sesión (${E.src === 'coach' ? 'Coach' : 'importada'}) guardada para el ${WDL[d.weekday].toLowerCase()}.`);
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

/* ==========================================================================
   Parte B · Coach automático (experto en hipertrofia), con tu historial del mismo gym y tipo de día:
   - Rango de reps: el de cada ejercicio en tu rutina (Editar ejercicio → Reps mín/máx); si no tiene,
     8-12 en compuestos pesados y 12-15 en aislamiento / máquinas pequeñas.
   - Doble progresión: tope del rango en todas las series con el RIR objetivo (±1) → sube un salto
     (increment: +1 kg hasta 15 kg, +5 kg en piernas desde 50 kg, +2,5 kg en el resto).
   - Mantener o bajar: no llegaste al mínimo (dos veces seguidas con el mismo peso → un salto menos),
     fallo (RIR 0) en una serie que no es la última, bajaste el peso a mitad (empiezas en el punto medio),
     notas "costó mucho" / técnica; dolor −15 %; nota "bajar" −10 %.
   - Estancado (3 sesiones sin superar tu mejor 1RM estimado de antes): −10 % y reconstruir, o una variante.
   Orden: dolor, nota "bajar", bajó el peso a mitad, debajo del mínimo, estancado, fallo temprano, notas, subida, mantener.
   - Sin RIR anotado no se inventa: decide con peso y reps. Ejercicio nuevo: peso prudente (startLoad) y RIR 2+.
   - Bloque: RIR por serie según la semana (rirTarget); descarga: mitad de series, −10 %, RIR 3;
     semanas finales +1 serie. "Cansado" hoy: 1 serie menos y −10 %; "Normal sin forzar": no sube.
   No se guarda: se calcula al momento (cambia sola al terminar una sesión). Si la editas, queda en
   nextS[día].co hasta que cambie tu historial; "Descartar" la oculta (coOff) hasta tu próxima sesión.
   ========================================================================== */
const NS_COMP = /prensa|hack|sentadilla|remo|press|peso muerto|dominad|jalon|zancada|hip thrust|fondos|militar|banca/;
function nsRange(ex) {
  const a = +ex.repsMin, b = +ex.repsMax;
  if (a > 0 && b >= a) return [a, b];
  return NS_COMP.test(normName(ex.name)) ? [8, 12] : [12, 15];
}
const nsRnd = (w, ex) => { const inc = increment(ex, w); return Math.max(0, Math.round(w / inc) * inc); };
const nsCtx = () => { const rp = typeof readyPlan === 'function' ? readyPlan() : null, mi = typeof mesoInfo === 'function' ? mesoInfo() : null; return { ready: rp ? rp.lv : null, meso: mi && !mi.pre ? mi : null }; };
function nsCoachEx(ex, gymId, kind, ctx) {
  const [lo, hi] = nsRange(ex), n0 = Math.max(1, +ex.sets || 3);
  const rirOf = j => Math.min(3, Math.max(0, rirTarget(j)));
  const H = exHistory(ex.name, gymId, kind, 6);
  let n = n0, w, why, up = false, goal = null, first = false, base = 0;
  if (!H.length) {
    const ref = lastPerf(ex.name, gymId, kind);
    if (ref && ref.ref) { w = Math.max.apply(null, ref.sets.map(s => +s.w || 0)); why = `Aún no lo haces aquí: empieza con tu referencia de ${ref.base ? 'tu récord' : gymName(ref.gymId)} (${fmtKg(w)} kg) y ajusta según cómo se sienta.`; }
    else { const s = !(+ex.weight) && typeof startLoad === 'function' ? startLoad(ex) : null; w = s && s.w > 0 ? s.w : +ex.weight || 0; why = 'Ejercicio nuevo: peso prudente, deja 2-3 reps de sobra; con esta sesión el coach aprende tu nivel.'; }
    first = true;
  } else {
    const last = H[0], S = last.sets.filter(s => +s.r > 0), note = normName(last.note || '');
    const top = S.length ? Math.max.apply(null, S.map(s => +s.w || 0)) : +ex.weight || 0, inc = increment(ex, top);
    const topS = S.filter(s => +s.w === top), hasRir = S.some(s => s.rir != null);
    const dropped = S.some((s, j) => j > 0 && +s.w < +S[j - 1].w - 0.01), low = S.length ? Math.min.apply(null, S.map(s => +s.w || 0)) : top;
    const below = topS.some(s => +s.r < lo);
    const prevBelow = below && H[1] && H[1].sets.some(s => +s.w === top && +s.r > 0 && +s.r < lo);
    const earlyFail = S.some((s, j) => j < S.length - 1 && s.rir === 0);
    const allTop = topS.length >= n0 && topS.every(s => +s.r >= hi);
    const rirOk = topS.every((s, j) => s.rir == null || s.rir >= rirOf(j) - 1);   // con el RIR objetivo (±1)
    const stall = H.length >= 4 && Math.max.apply(null, H.slice(0, 3).map(bestE)) <= bestE(H[3]) * 1.005;
    w = top;
    if (PAIN.test(note)) { w = nsRnd(top * 0.85, ex); why = `Tu nota menciona dolor: baja a ${fmtKg(w)} kg y cuida la técnica. Si duele la articulación, para.`; }
    else if (DOWN.test(note)) { w = nsRnd(top * 0.9, ex); why = `Tu nota pedía bajar: ${fmtKg(w)} kg y busca el rango completo (${lo}-${hi}).`; }
    else if (dropped) { w = nsRnd((top + low) / 2, ex); why = `Bajaste de ${fmtKg(top)} a ${fmtKg(low)} kg a mitad del ejercicio: empieza en ${fmtKg(w)} kg en todas las series y busca ${lo}-${hi} reps.`; }
    else if (below) { w = prevBelow ? nsRnd(top - inc, ex) : top; why = prevBelow ? `Dos sesiones sin llegar a ${lo} reps con ${fmtKg(top)} kg: baja a ${fmtKg(w)} kg y entra en el rango.` : `Quedaste debajo de ${lo} reps: repite ${fmtKg(top)} kg y busca entrar en el rango.`; }
    else if (stall) { w = nsRnd(top * 0.9, ex); why = `Llevas 3 sesiones sin mejorar: baja a ${fmtKg(w)} kg y reconstruye hacia ${hi} reps, o cámbialo por una variante (botón "Ocupada" → parecido).`; }
    else if (earlyFail) { why = `Llegaste al fallo antes de la última serie: mantén ${fmtKg(top)} kg y guarda reps de sobra en las primeras.`; }
    else if (HARD.test(note)) { why = `Tu nota dice que costó mucho: consolida ${fmtKg(top)} kg una sesión más.`; }
    else if (TECH.test(note)) { why = `Tu nota habla de técnica: domina ${fmtKg(top)} kg con buena forma antes de subir.`; }
    else if (allTop && rirOk) { base = top; w = top + inc; up = true; why = `Hiciste ${topS.length}×${hi} con ${fmtKg(top)} kg${hasRir ? ' sin pasarte del RIR' : ''}: sube a ${fmtKg(w)} kg y vuelve a empezar desde ${lo} reps.`; }
    else if (allTop) { why = `Llegaste a ${hi} reps pero con menos reserva de la planeada: mantén ${fmtKg(top)} kg.`; }
    else {
      const rs = topS.map(s => +s.r);
      goal = Array.from({ length: n0 }, (_, j) => Math.min(hi, Math.max(lo, (rs[Math.min(j, rs.length - 1)] || lo) + 1)));
      why = `Mantén ${fmtKg(top)} kg y suma 1 rep por serie (hasta ${hi}); cuando hagas ${n0}×${hi}, sube.`;
    }
    if (!hasRir && !/rir|reserva/i.test(why)) why += ' (Sin RIR anotado: decidí con peso y reps.)';
  }
  /* Bloque y Preparación del día */
  const M = ctx.meso;
  if (M && M.deload) {   // la descarga sale de tu peso actual, sin subir antes
    const cur = up ? base : w; n = Math.max(1, Math.ceil(n / 2)); w = nsRnd(cur * 0.9, ex); up = false; goal = null;
    why = (/dolor/.test(why) ? why + ' ' : '') + `Semana de descarga: ${n} ${n === 1 ? 'serie' : 'series'} con ${fmtKg(w)} kg (−10 % de ${fmtKg(cur)}) y RIR 3; te recuperas para el próximo bloque.`;
  }
  else if (M && M.plus) { n += 1; why += ' Semana final del bloque: +1 serie.'; }
  if (ctx.ready === 'low') { n = Math.max(1, n - 1); w = nsRnd(w * 0.9, ex); up = false; why += ' Hoy llegas cansado: 1 serie menos y −10 %.'; }
  else if (ctx.ready === 'mid' && up) { w = w - increment(ex, w); up = false; why += ' Hoy sin forzar: mantienes el peso (la subida queda para la próxima).'; }
  const sets = Array.from({ length: n }, (_, j) => {
    const rir = M && M.deload ? 3 : first ? Math.max(2, rirOf(j)) : rirOf(j);
    return { w, rMin: goal ? goal[Math.min(j, goal.length - 1)] : lo, rMax: hi, rir };
  });
  return { exId: ex.id, name: ex.name, sets, why: why.trim() };
}
/* Clave de lo que usa el coach: si cambia (nueva sesión, otra semana, otra Preparación, otra rutina), se recalcula */
function nsKey(planId, dayId) {
  const { d } = findDay(planId, dayId), c = nsCtx(), s0 = state.sessions[0];
  return [dayId, state.sessions.length, s0 ? s0.id : '', c.ready || '', c.meso ? c.meso.n + '.' + c.meso.wk : '', d ? d.exercises.map(e => e.name + e.sets + e.repsMin + e.repsMax).join() : ''].join('|');
}
const nsCache = {};
function nsCoachEntry(planId, dayId) {
  const { p, d } = findDay(planId, dayId); if (!p || !d || !d.exercises.length) return null;
  const k = nsKey(planId, dayId), n = nsOf(dayId);
  if (n && n.co && n.co.base === k) return { at: n.co.at, ex: n.co.ex, edited: true, key: k };
  if (nsCache[dayId] && nsCache[dayId].key === k) return nsCache[dayId];
  const g = p.gymId || 'rokaz', kind = d.kind || kindOfName(d.name), ctx = nsCtx();
  return nsCache[dayId] = { at: Date.now(), key: k, ex: d.exercises.map(ex => nsCoachEx(ex, g, kind, ctx)) };
}
/* El Coach está disponible salvo que lo hayas descartado para esta sesión */
function nsCoachOn(dayId) {
  const n = nsOf(dayId); if (!n || !n.coOff) return true;
  const day = nsDayRef(dayId); return !day || n.coOff !== nsKey(day.p.id, dayId);
}
function nsDayRef(dayId) { for (const p of state.plans) { const d = p.days.find(x => x.id === dayId); if (d) return { p, d }; } return null; }

/* ---------- 5. Elegir en Hoy y en Mi plan: Plan · Coach · Importada ---------- */
function nsPickHtml(planId, dayId) {
  const ia = nsIa(dayId), co = nsCoachOn(dayId), cur = nsPick(dayId);
  const C = co && cur === 'coach' ? nsCoachEntry(planId, dayId) : null;
  const opt = (v, l) => `<button type="button" class="${cur === v ? 'on' : ''}" data-ns="pick" data-v="${v}" data-day="${dayId}" aria-pressed="${cur === v}">${l}</button>`;
  const meta = cur === 'ia' ? `${ia.ex.length} ${ia.ex.length === 1 ? 'ejercicio' : 'ejercicios'} con peso, reps y RIR de tu IA`
    : cur === 'coach' ? `Coach: ${C ? C.ex.length : 0} ejercicios con peso, reps y RIR${C && C.edited ? ' (editada)' : ''}`
    : ia ? 'Entrenas con tu plan; la importada queda guardada' : 'Entrenas con tu plan';
  const links = (cur === 'ia' || cur === 'coach' ? `<button type="button" class="ns-imp" data-ns="edit" data-src="${cur}" data-plan="${planId}" data-day="${dayId}">${ic('square-pen', 15)} Ver o editar</button>` : '')
    + (!ia && cur !== 'coach' ? `<button type="button" class="ns-imp" data-ns="imp" data-plan="${planId}" data-day="${dayId}">${ic('clipboard-list', 15)} Importar</button>` : '')
    + (!co ? `<button type="button" class="ns-imp" data-ns="coach-on" data-day="${dayId}">${ic('sparkles', 15)} Mostrar Coach</button>` : '');
  return `<div class="ns-box"><div class="ns-pick" role="group" aria-label="Qué vas a entrenar">${opt('plan', 'Plan')}${co ? opt('coach', 'Coach') : ''}${ia ? opt('ia', 'Importada') : ''}</div>
    <div class="ns-meta"><span>${meta}</span><span class="ns-links">${links}</span></div></div>`;
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
  if (a === 'edit') return nsOpenEdit(b.dataset.plan, b.dataset.day, b.dataset.src);
  if (a === 'coach-on') { const n = nsSet(b.dataset.day); delete n.coOff; savePlans(); return render(); }
  if (a === 'coachdef') { state.settings.coachDef = state.settings.coachDef ? 0 : 1; savePlans(); render(); return toast(state.settings.coachDef ? 'El Coach se usará por defecto (salvo que tengas una importada).' : 'Por defecto vuelve a salir tu plan.'); }
  if (a === 'save') return nsSaveEd();
  if (a === 'pick') { nsSet(b.dataset.day).pick = b.dataset.v; savePlans(); return render(); }
  if (a === 'n' && state.nsEd) {
    const r = state.nsEd.rows[+b.dataset.i]; if (!r) return;
    const n = Math.max(1, Math.min(8, r.sets.length + (+b.dataset.d)));
    while (r.sets.length < n) r.sets.push(Object.assign({}, r.sets[r.sets.length - 1], { rir: null }));
    r.sets.length = n; return nsEditSheet();
  }
  if (a === 'drop' && state.nsEd) {
    if (state.nsEd.confirm) {
      const E = state.nsEd, n = nsSet(E.dayId);
      if (E.src === 'coach') { delete n.co; n.coOff = nsKey(E.planId, E.dayId); if (n.pick === 'coach') delete n.pick; }
      else { delete n.ia; if (n.pick === 'ia') delete n.pick; }
      savePlans(); state.nsEd = null; closeSheet(); render(); return toast(E.src === 'coach' ? 'Coach descartado para esta sesión: vuelve después de entrenar.' : 'Próxima sesión importada descartada.');
    }
    state.nsEd.confirm = true; b.textContent = '¿Descartar? Toca otra vez';
  }
}, true);

/* ---------- 6. Entrenar con la elegida (importada o Coach) ---------- */
const _startSessionNS = startSession;
startSession = function (planId, dayId) {
  const r = _startSessionNS.apply(this, arguments);
  const d = state.draft, pick = nsPick(dayId); if (!d || d.dayId !== dayId || d.ns || pick === 'plan') return r;
  const E = pick === 'ia' ? nsIa(dayId) : nsCoachEntry(planId, dayId); if (!E) return r;
  d.ns = { src: pick, at: E.at, edited: !!E.edited };
  const lab = pick === 'ia' ? 'importada' : 'Coach';
  E.ex.forEach(x => {
    const e = d.exercises.find(y => y.exId === x.exId) || d.exercises.find(y => y.name === x.name); if (!e) return;
    const S = x.sets, n = S.length;
    while (e.log.length < n) e.log.push({ w: S[e.log.length].w, r: null, done: false, drops: [] });
    if (e.log.length > n) e.log = e.log.filter((s, j) => j < n || s.done);
    e.log.forEach((s, j) => { const t = S[Math.min(j, n - 1)]; if (s.done) return; s.w = t.w; (s.drops || []).forEach(dr => { if (!dr.done) dr.w = dropW(t.w, e); }); });
    e.target = n; e.repsMin = Math.min.apply(null, S.map(t => t.rMin)); e.repsMax = Math.max.apply(null, S.map(t => t.rMax));
    e.rirT = S.map(t => t.rir); e.ns = pick; delete e.mesoNote;
    e.coach = { w: S[0].w, mode: 'ns', goal: S.map(t => t.rMin === t.rMax ? t.rMax : t.rMin), tips: x.why ? [x.why] : [],
      head: `<b>Próxima sesión (${lab}): ${fmtKg(S[0].w)} kg × ${nsRepTxt(S[0])}</b> · RIR ${nsRirTxt(e.rirT)}` };
  });
  saveDraft(); render();
  return r;
};
const _coachBoxNS = coachBox;
coachBox = function (e, i) {
  if (!e || !e.ns || !e.coach) return _coachBoxNS.apply(this, arguments);
  const d = state.draft, tips = e.ns === 'ia' ? [`Viene de tu IA${d && d.ns ? ' (importada el ' + nsWhen(d.ns.at) + ')' : ''}. Tu plan no cambia.`] : e.coach.tips.map(esc);
  return `<div class="coach ns"><div class="coach-h"><span class="coach-ic">${ic(e.ns === 'ia' ? 'clipboard-list' : 'sparkles', 18)}</span><span>${e.coach.head}</span></div>
    ${tips.length ? `<ul>${tips.map(t => `<li>${t}</li>`).join('')}</ul>` : ''}</div>`;
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
/* Al terminar: la importada queda usada (vuelve "Plan" o el Coach por defecto); el Coach se recalcula solo */
const _finishNS = finishSession;
finishSession = function () {
  const d = state.draft, ns = d && d.ns, day = d && d.dayId, id = d && d.id;
  const r = _finishNS.apply(this, arguments);
  if (ns && day && !state.draft && state.sessions.some(x => x.id === id)) {
    const n = nsOf(day);
    if (ns.src === 'ia' && n && n.ia && n.ia.at === ns.at) { n.ia.used = Date.now(); delete n.pick; savePlans(); }
    /* Coach: la versión editada queda usada; con el historial nuevo el coach prepara la siguiente */
    if (ns.src === 'coach' && n && (n.co || n.coOff)) { delete n.co; delete n.coOff; savePlans(); }
  }
  return r;
};

/* ---------- 7. Ajustes → Entreno: "Usar el Coach por defecto" (apagado al inicio) ---------- */
const _vSettingsNS = vSettings;
vSettings = function () {
  const h = _vSettingsNS.apply(this, arguments); if (isWatch()) return h;
  const on = !!state.settings.coachDef;
  return h + `<div class="card ns-set"><h3>${ic('sparkles', 17)} Próxima sesión</h3>
    <div class="row"><div class="grow"><b>Usar el Coach por defecto</b><div class="muted" style="font-size:12.5px">El Coach arma cada día con tu historial: peso, series, reps y RIR por serie, y por qué. Si hay una recomendación importada, se usa esa. Siempre puedes elegir Plan, Coach o Importada con un toque en Hoy o en Mi plan.</div></div>
    <button type="button" class="switch ${on ? 'on' : ''}" data-ns="coachdef" role="switch" aria-checked="${on}" aria-label="Usar el Coach por defecto"><i></i></button></div></div>`;
};
(function () { const g = typeof SET_GRP !== 'undefined' && SET_GRP.find(x => x[0] === 'entreno'); if (g && g[4].indexOf('.ns-set') < 0) { g[4].push('.ns-set'); g[3] = g[3].replace('Coach semanal', 'Coach semanal, Próxima sesión'); } })();
