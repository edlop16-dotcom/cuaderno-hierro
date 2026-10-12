/* ==========================================================================
   Rutinas (rediseño)
   - Solo se ven los nombres de las rutinas; al tocar una se despliegan sus ejercicios.
   - Dentro: agregar ejercicios (buscador por tipo) y quitarlos.
   - Al crear una rutina se elige Fuerza o Bombeo (y se ajustan reps y descansos).
   - Colores por tipo: Empuje (rojo), Tracción (azul), Piernas (verde), Core (morado).
   - Revisión de equilibrio empuje / tracción según tu objetivo (p. ej. corregir postura).
   ========================================================================== */
const TYPE_ORDER = [EM, TR, P, 'Core'];
const TYPE_LBL = { [EM]: 'Empuje', [TR]: 'Tracción', [P]: 'Piernas', Core: 'Core' };
state.rtOpen = state.rtOpen || {};

/* --- Clasificación fina para la postura --- */
function moveOf(name, type) {
  const n = normName(name);
  if (/face pull|pajaros|deltoide posterior|reverse|y-raise|t-raise/.test(n)) return 'post';      // hombro posterior / escápulas
  if (/remo/.test(n)) return 'rowH';                                                              // tracción horizontal
  if (/jalon|dominada|pullover|pull ?down/.test(n)) return 'rowV';                                // tracción vertical
  if (/press (banca|de pecho|inclinado)|pecho|aperturas|pec deck|cruce|fondos en paralelas|flexiones/.test(n)) return 'chest';
  if (/press militar|arnold|elevaciones frontales/.test(n)) return 'shoulderF';
  if (type === TR) return 'armPull';
  if (type === EM) return 'armPush';
  return 'other';
}
function goals() { const g = state.settings.goals; return Array.isArray(g) ? g : (/postur/i.test(HISTORY.goal || '') ? ['postura'] : []); }
function planBalance(days) {
  const t = { [EM]: 0, [TR]: 0, [P]: 0, Core: 0 }, m = {};
  days.forEach(d => d.exercises.forEach(e => { const ty = e.type || typeOf(e.name); t[ty] = (t[ty] || 0) + (+e.sets || 0); const mv = moveOf(e.name, ty); m[mv] = (m[mv] || 0) + (+e.sets || 0); }));
  const pushUpper = (m.chest || 0) + (m.shoulderF || 0), pullBack = (m.rowH || 0) + (m.rowV || 0) + (m.post || 0);
  return { t, m, pushUpper, pullBack, ratio: pushUpper ? pullBack / pushUpper : (pullBack ? 9 : 0) };
}
function balanceAdvice(b, scope) {
  const per = scope === 'day' ? 'en esta rutina' : 'por semana';
  const post = goals().includes('postura'), target = post ? 1.5 : 1, out = [];
  if (!b.pushUpper && !b.pullBack) return { ok: true, target, out };
  if (b.ratio < target) out.push(`Por cada serie de empuje de pecho/hombro haz al menos <b>${post ? '1,5' : '1'}</b> de espalda. Te faltan unas <b>${Math.ceil(b.pushUpper * target - b.pullBack)} series de tracción</b> ${per}.`);
  if (post && (b.m.post || 0) < 6) out.push(`Para no estar encorvado necesitas <b>hombro posterior y escápulas</b>: unas 6-9 series por semana de Face Pull o Pájaros (tienes ${b.m.post || 0}).`);
  if (post && (b.m.rowH || 0) < (b.m.rowV || 0)) out.push('Prioriza <b>remos</b> (tracción horizontal) sobre jalones: son los que llevan los hombros hacia atrás.');
  if (post && (b.m.chest || 0) > 12) out.push('Tienes mucho volumen de pecho: un pecho fuerte y acortado tira los hombros hacia adelante. Mantén el pecho en 9-12 series.');
  return { ok: !out.length, target, out };
}
const POSTURE_PICKS = ['Face Pull', 'Pájaros (Deltoide Posterior)', 'Remo Sentado con Cable', 'Remo con Mancuerna a una Mano'];

/* --- Barra de composición --- */
function compBar(days) {
  const b = planBalance(days), tot = TYPE_ORDER.reduce((a, k) => a + (b.t[k] || 0), 0) || 1;
  return `<span class="rt-comp">${TYPE_ORDER.filter(k => b.t[k]).map(k => `<i class="t-${k}" style="width:${(b.t[k] / tot * 100).toFixed(1)}%"></i>`).join('')}</span>`;
}
const legend = () => `<div class="rt-leg">${TYPE_ORDER.map(k => `<span><i class="dot t-${k}"></i>${TYPE_LBL[k]}</span>`).join('')}</div>`;

/* --- Vista --- */
vPlans = function () {
  const g = activeGym(), act = activePlan(), list = gymPlans(g.id), others = state.gyms.filter(x => x.id !== g.id);
  const b = act ? planBalance(act.days) : null, adv = b ? balanceAdvice(b) : null, post = goals().includes('postura');
  const balCard = !b ? '' : `<div class="card rt-bal ${adv.ok ? 'ok' : 'warn'}">
    <div class="row" style="justify-content:space-between"><h3>${ic('activity', 17)} Equilibrio de tu semana</h3><button class="chip rt-goal ${post ? 'on' : ''}" data-act="rt-goal">${post ? '✓ ' : ''}Corregir postura</button></div>
    <div class="rt-pp"><div class="t-${EM}"><b class="num">${b.t[EM] || 0}</b><span>series de empuje</span></div><div class="vs">vs</div><div class="t-${TR}"><b class="num">${b.t[TR] || 0}</b><span>series de tracción</span></div></div>
    <div class="rt-ratio"><span>Espalda : pecho/hombro</span><b class="num ${b.ratio >= adv.target ? 'okc' : 'badc'}">${b.pushUpper ? fmtKg(Math.round(b.ratio * 10) / 10) : '—'} : 1</b><small class="muted">meta ${post ? '1,5 a 2' : '1'} : 1</small></div>
    ${adv.ok ? `<div class="muted" style="font-size:12.5px">¡Bien equilibrado${post ? ' para tu postura' : ''}! Sigue así.</div>` : `<ul class="rt-adv">${adv.out.map(x => `<li>${x}</li>`).join('')}</ul>
      <div class="label">Recomendados ${post ? 'para tu postura' : ''}</div><div class="rt-recs">${POSTURE_PICKS.filter(n => !act.days.some(d => d.exercises.some(e => e.name === n))).slice(0, 3).map(n => `<button class="rt-rec t-${TR}" data-act="rt-rec" data-name="${esc(n)}"><i class="dot t-${TR}"></i>${esc(n)} <span>+ Agregar</span></button>`).join('') || '<span class="muted" style="font-size:12.5px">Sube las series de los remos y face pull que ya tienes.</span>'}</div>`}
  </div>`;
  const dayRow = (p, d) => {
    const open = !!state.rtOpen[d.id], k = d.kind || kindOfName(d.name), db = planBalance([d]), dadv = balanceAdvice(db, 'day');
    return `<div class="rt-day ${open ? 'open' : ''}">
      <button class="rt-head" data-act="rt-toggle" data-day="${d.id}" aria-expanded="${open}">
        <span class="wd">${WD[d.weekday]}</span>
        <span class="grow" style="min-width:0"><b>${esc(d.name)}</b><small><span class="kind k-${k}">${KINDS[k] || ''}</span> · ${d.exercises.length} ejercicios · ${d.exercises.reduce((a, e) => a + (+e.sets || 0), 0)} series</small>${compBar([d])}</span>
        ${ic(open ? 'chevron-up' : 'chevron-down', 18)}</button>
      ${open ? `<div class="rt-body">
        ${d.exercises.map((e, i) => { const ty = e.type || typeOf(e.name), del = state.rtDel === d.id + ':' + i; return `<div class="rt-ex t-${ty}">
          <button class="rt-exm" data-act="ex-edit" data-plan="${p.id}" data-day="${d.id}" data-k="${i}"><b>${esc(e.name)}</b><small class="num"><span class="rt-ty t-${ty}">${TYPE_LBL[ty] || ty}</span> · ${e.sets} × ${reps(e)} · ${fmtKg(e.weight)} kg${e.bar ? ' + barra' : ''} · ${restTxt(e.rest)}</small></button>
          ${i ? `<button class="icon-btn sm" data-act="ex-up" data-plan="${p.id}" data-day="${d.id}" data-k="${i}" aria-label="Subir">${ic('chevron-up', 15)}</button>` : ''}
          <button class="icon-btn sm rt-x ${del ? 'confirm' : ''}" data-act="rt-del" data-plan="${p.id}" data-day="${d.id}" data-k="${i}" aria-label="Quitar ${esc(e.name)}">${del ? '¿Quitar?' : ic('x', 15)}</button></div>`; }).join('') || '<div class="muted" style="font-size:13px">Esta rutina aún no tiene ejercicios.</div>'}
        ${!dadv.ok && db.pushUpper >= 3 ? `<div class="safe tip">${ic('info', 16)}<span>${dadv.out[0]}</span></div>` : ''}
        <div class="rt-actions"><button class="btn small primary" data-act="rt-add" data-plan="${p.id}" data-day="${d.id}">${ic('plus', 15)} Agregar ejercicio</button>
          <button class="btn small" data-act="start" data-plan="${p.id}" data-day="${d.id}">${ic('play', 15)} Entrenar</button>
          <button class="btn small" data-act="edit-day" data-plan="${p.id}" data-day="${d.id}">${ic('square-pen', 15)} Nombre y tipo</button></div>
      </div>` : ''}</div>`;
  };
  return `${header('Planes', esc(g.name))}
  ${gymBar()}
  <div class="grid2"><button class="btn primary" data-act="rt-new">${ic('plus', 16)} Nueva rutina</button><button class="btn" data-act="rt-from-ex">${ic('list-plus', 16)} Desde Ejercicios</button></div>
  ${legend()}
  ${balCard}
  ${list.map(p => { const optsOpen = state.editPlan === p.id;
    return `<div class="card rt-plan">
    <div class="row"><div class="grow" style="min-width:0"><h2>${esc(p.name)}</h2><div class="muted" style="font-size:12.5px">${p.days.length} rutinas · ${p.days.map(d => WD[d.weekday]).join(', ')}</div></div>
      ${act && p.id === act.id ? '<span class="pill">Activo</span>' : `<button class="btn small" data-act="activate" data-plan="${p.id}">Usar</button>`}
      <button class="icon-btn sm" data-act="edit-plan" data-plan="${p.id}" aria-label="Opciones del plan">${ic(optsOpen ? 'x' : 'settings', 16)}</button></div>
    ${optsOpen ? `<div class="rt-opts"><button class="btn small" data-act="day-new" data-plan="${p.id}">+ Rutina vacía</button><button class="btn small" data-act="plan-rename" data-plan="${p.id}">Renombrar</button><button class="btn small" data-act="plan-dup" data-plan="${p.id}">Duplicar</button>
      ${others.map(o => `<button class="btn small" data-act="plan-copy" data-plan="${p.id}" data-gym="${o.id}">Copiar a ${esc(o.name)}</button>`).join('')}
      <button class="btn small danger" data-act="plan-del" data-plan="${p.id}">${state.confirm === 'pdel-' + p.id ? '¿Borrar? Toca otra vez' : 'Borrar plan'}</button></div>` : ''}
    <div class="rt-days">${p.days.map(d => dayRow(p, d)).join('') || '<div class="muted" style="font-size:13px">Sin rutinas. Toca ⚙️ → "+ Rutina vacía" o "Nueva rutina".</div>'}</div>
    </div>`; }).join('')}
  ${list.length ? '' : `<div class="card empty"><h3>Sin planes en ${esc(g.name)}</h3><div>Crea una rutina nueva o copia un plan desde otro gimnasio.</div>
    ${others.flatMap(o => gymPlans(o.id).map(p => `<button class="btn small" data-act="plan-copy" data-plan="${p.id}" data-gym="${g.id}">Copiar “${esc(p.name)}” de ${esc(o.name)}</button>`)).join('')}</div>`}
  <details class="rt-more"><summary>Más opciones</summary><div class="rt-opts">
    <button class="btn small" data-act="plan-new">+ Plan nuevo</button><button class="btn small" data-act="gym-rename">Renombrar gimnasio</button>
    ${state.gyms.length > 1 ? `<button class="btn small danger" data-act="gym-del">${state.confirm === 'gdel-' + g.id ? `¿Borrar ${esc(g.name)}? Toca otra vez` : 'Borrar gimnasio'}</button>` : ''}
    <button class="btn small" data-act="reset-plans" style="color:var(--muted)">${state.confirm === 'reset' ? '¿Restaurar planes originales? Toca otra vez' : 'Restaurar planes originales'}</button></div></details>`;
};

/* --- Ajustar reps y descanso según Fuerza o Bombeo --- */
function fitKind(ex, kind) {
  const x = libFind(ex.name), compound = (x ? x.rest || 90 : ex.rest || 90) >= 90 && ex.type !== 'Core';
  if (kind === 'bombeo') Object.assign(ex, compound ? { repsMin: 12, repsMax: 15, rest: 60 } : { repsMin: 15, repsMax: 20, rest: 60 });
  else Object.assign(ex, compound ? { repsMin: 6, repsMax: 10, rest: 120 } : { repsMin: 8, repsMax: 12, rest: 90 });
  return ex;
}
function newEx(name, kind) {
  const x = libFind(name) || LIB.find(y => y.name === name);
  const ex = x ? exFromLib(x) : { id: uid(), name, type: typeOf(name), weight: 0, sets: 3, repsMin: 8, repsMax: 12, rest: 90 };
  return fitKind(ex, kind);
}

/* --- Hoja: nueva rutina --- */
function rtNewSheet() {
  const g = activeGym(), act = activePlan(), plans = gymPlans(g.id);
  state.rtKind = state.rtKind || 'fuerza';
  openSheet(`<div class="row"><h2 class="grow">Nueva rutina</h2><button class="icon-btn" data-act="sheet-close" aria-label="Cerrar">${ic('x', 18)}</button></div>
    <form id="f-rtnew" class="bd-form">
      <label class="field"><span class="label">Nombre</span><input id="rn-name" maxlength="40" placeholder="Opcional · se nombra sola según los ejercicios"></label>
      <div class="field"><span class="label">Tipo</span><div class="rt-kinds">
        <button type="button" class="rt-kind ${state.rtKind === 'fuerza' ? 'on' : ''}" data-act="rt-kind" data-k="fuerza"><b>💪 Fuerza</b><small>Pesado · 6-10 reps · descanso 2 min</small></button>
        <button type="button" class="rt-kind ${state.rtKind === 'bombeo' ? 'on' : ''}" data-act="rt-kind" data-k="bombeo"><b>🔥 Bombeo</b><small>12-20 reps · descanso 1 min · ardor</small></button></div></div>
      <div class="grid2"><label class="field"><span class="label">Día</span><select id="rn-wd">${[1, 2, 3, 4, 5, 6, 0].map(d => `<option value="${d}" ${d === new Date().getDay() ? 'selected' : ''}>${WDL[d]}</option>`).join('')}</select></label>
        <label class="field"><span class="label">En el plan</span><select id="rn-plan">${plans.map(p => `<option value="${p.id}" ${act && p.id === act.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}<option value="__mine">Mis rutinas (aparte)</option></select></label></div>
      <button class="btn primary block" type="submit">Crear y agregar ejercicios</button></form>`);
  try { document.activeElement.blur(); } catch (e) {}
}
/* --- Hoja: agregar ejercicios --- */
function rtAddSheet(pid, did) {
  const { d } = findDay(pid, did); if (!d) return;
  const k = d.kind || kindOfName(d.name), f = state.rtF || 'all', q = normName(state.rtQ || ''), post = goals().includes('postura');
  const have = new Set(d.exercises.map(e => e.name));
  let list = LIB.slice();
  if (f !== 'all') list = list.filter(x => x.type === f);
  if (q) list = list.filter(x => normName(x.name + ' ' + (x.musc || []).join(' ')).includes(q));
  const rec = n => post && POSTURE_PICKS.includes(n);
  list.sort((a, b) => (rec(b.name) - rec(a.name)) || TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type) || a.name.localeCompare(b.name));
  openSheet(`<div class="row"><h2 class="grow">Agregar a ${esc(d.name)}</h2><button class="icon-btn" data-act="rt-done" aria-label="Cerrar">${ic('x', 18)}</button></div>
    <div class="muted" style="font-size:12.5px">${KINDS[k]}: se agregan con ${k === 'bombeo' ? '12-20 reps y 1 min de descanso' : '6-12 reps y 1½-2 min de descanso'}. Puedes ajustarlos después.</div>
    <input id="rt-q" placeholder="Buscar ejercicio o músculo" value="${esc(state.rtQ || '')}" autocomplete="off">
    <div class="rt-filt">${[['all', 'Todos']].concat(TYPE_ORDER.map(t => [t, TYPE_LBL[t]])).map(([v, l]) => `<button class="gchip ${f === v ? 'on' : ''} ${v !== 'all' ? 't-' + v : ''}" data-act="rt-f" data-v="${v}" data-plan="${pid}" data-day="${did}">${v !== 'all' ? '<i class="dot t-' + v + '"></i>' : ''}${l}</button>`).join('')}</div>
    <div class="rt-pick" id="rt-pick">${list.map(x => `<button class="rt-pk t-${x.type} ${have.has(x.name) ? 'in' : ''}" data-act="rt-pk" data-plan="${pid}" data-day="${did}" data-name="${esc(x.name)}" ${have.has(x.name) ? 'disabled' : ''}>
      <span class="pv-th">${thumb(x.name)}</span><span class="grow" style="min-width:0"><b>${esc(x.name)}</b><small>${esc((x.musc || []).slice(0, 2).join(', '))}${rec(x.name) ? ' · <span class="rt-star">⭐ para tu postura</span>' : ''}</small></span>
      <span class="rt-tag t-${x.type}">${have.has(x.name) ? '✓ Ya está' : TYPE_LBL[x.type] || x.type}</span></button>`).join('') || '<div class="muted">Sin resultados.</div>'}</div>
    <button class="btn primary block" data-act="rt-done">Listo</button>`);
  state.rtAdd = { pid, did };
}

document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-act^="rt-"]'); if (!b) return;
  const a = b.dataset.act; if (['rt-from-ex', 'rt-addto'].includes(a)) return;   // los maneja layout.js
  ev.stopPropagation(); ev.preventDefault();
  const pid = b.dataset.plan, did = b.dataset.day;
  if (a === 'rt-toggle') { state.rtOpen[did] = !state.rtOpen[did]; state.rtDel = null; render(); }
  else if (a === 'rt-goal') { const g = goals(); state.settings.goals = g.includes('postura') ? g.filter(x => x !== 'postura') : g.concat(['postura']); savePlans(); render(); }
  else if (a === 'rt-new') rtNewSheet();
  else if (a === 'rt-kind') { state.rtKind = b.dataset.k; document.querySelectorAll('.rt-kind').forEach(x => x.classList.toggle('on', x === b)); }
  else if (a === 'rt-add') { state.rtF = 'all'; state.rtQ = ''; rtAddSheet(pid, did); }
  else if (a === 'rt-f') { state.rtF = b.dataset.v; rtAddSheet(pid, did); }
  else if (a === 'rt-pk') {
    const { d } = findDay(pid, did); if (!d) return;
    d.exercises.push(newEx(b.dataset.name, d.kind || kindOfName(d.name))); savePlans();
    b.classList.add('in'); b.disabled = true; const t = b.querySelector('.rt-tag'); if (t) t.textContent = '✓ Agregado';
    toast(`${b.dataset.name} agregado`);
  }
  else if (a === 'rt-done') { closeSheet(); state.rtAdd = null; render(); }
  else if (a === 'rt-del') {
    const key = did + ':' + b.dataset.k;
    if (state.rtDel === key) { const { d } = findDay(pid, did); const x = d.exercises.splice(+b.dataset.k, 1)[0]; state.rtDel = null; savePlans(); render(); toast(`${x ? x.name : 'Ejercicio'} quitado`); }
    else { state.rtDel = key; render(); }
  }
  else if (a === 'rt-rec') {
    const act = activePlan(); if (!act || !act.days.length) return;
    /* a la rutina con menos tracción de espalda */
    const d = act.days.slice().sort((x, y) => planBalance([x]).pullBack - planBalance([y]).pullBack)[0];
    d.exercises.push(newEx(b.dataset.name, d.kind || kindOfName(d.name))); savePlans(); state.rtOpen[d.id] = true; render();
    toast(`${b.dataset.name} agregado a ${d.name}`);
  }
}, true);
document.addEventListener('input', ev => {
  if (ev.target.id !== 'rt-q' || !state.rtAdd) return;
  state.rtQ = ev.target.value; const pos = ev.target.selectionStart;
  rtAddSheet(state.rtAdd.pid, state.rtAdd.did);
  const i = document.getElementById('rt-q'); if (i) { i.focus(); try { i.setSelectionRange(pos, pos); } catch (e) {} }
});
document.addEventListener('submit', ev => {
  if (ev.target.id !== 'f-rtnew') return; ev.preventDefault();
  const typed = $('#rn-name').value.trim(), wd = +$('#rn-wd').value, sel = $('#rn-plan').value, g = activeGym().id;
  let p = sel === '__mine' ? state.plans.find(x => x.gymId === g && x.custom) : state.plans.find(x => x.id === sel);
  if (!p) { p = { id: uid(), name: 'Mis rutinas', gymId: g, custom: true, days: [] }; state.plans.push(p); }
  const kd = state.rtKind || 'fuerza', d = { id: uid(), name: typed || `${KINDS[kd]} · ${WDL[wd]}`, weekday: wd, kind: kd, exercises: [] };
  if (!typed) d.autoName = true;
  p.days.push(d); p.days.sort((x, y) => ((x.weekday + 6) % 7) - ((y.weekday + 6) % 7));
  savePlans(); state.rtOpen[d.id] = true; state.tab = 'plans'; render();
  state.rtF = 'all'; state.rtQ = ''; rtAddSheet(p.id, d.id);
}, true);
render();
