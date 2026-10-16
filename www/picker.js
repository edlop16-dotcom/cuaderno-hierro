/* ==========================================================================
   Agregar ejercicios (estilo Hevy)
   - Pantalla completa: buscador, filtros de equipamiento y músculo, "Recientes" y lista completa.
   - Selección múltiple con ✓ y botón "Agregar N ejercicios".
   - Botón ⓘ por ejercicio: fotos en movimiento (con pausa), músculos, tu gráfica y récords,
     historial e indicaciones paso a paso; botón para agregarlo.
   ========================================================================== */
const PK_MUS = ['Cuádriceps', 'Isquiotibiales', 'Glúteos', 'Pantorrillas', 'Pecho', 'Espalda', 'Hombros', 'Bíceps', 'Tríceps', 'Abdomen'];
function pkMusc(x) {
  const t = normName((x.musc || []).join(' ') + ' ' + (x.group || ''));
  return PK_MUS.filter(m => { const n = normName(m); return n === 'espalda' ? /dorsal|espalda|trapecio/.test(t) : n === 'hombros' ? /deltoid|hombro/.test(t) : n === 'abdomen' ? /abdom|core|oblicu/.test(t) : n === 'pantorrillas' ? /pantorr|gemelo|soleo/.test(t) : t.includes(n.slice(0, 6)); });
}
function pkRecent() {
  const out = [];
  state.sessions.forEach(s => s.exercises.forEach(e => { if (out.indexOf(e.name) < 0 && LIB.some(x => x.name === e.name)) out.push(e.name); }));
  return out.slice(0, 8);
}
function pkRow(x, have, sel) {
  const on = sel.indexOf(x.name) >= 0, inR = have.has(x.name), mus = pkMusc(x)[0] || (x.musc || [])[0] || '';
  return `<div class="pk-row t-${x.type} ${on ? 'on' : ''} ${inR ? 'in' : ''}">
    <button class="pk-main" data-act="pk-tog" data-name="${esc(x.name)}" ${inR ? 'disabled' : ''}><span class="pk-th">${thumb(x.name)}${on ? `<i class="pk-ck">${ic('check', 13)}</i>` : ''}</span>
      <span class="grow" style="min-width:0"><b>${esc(x.name)}</b><small>${inR ? 'Ya está en la rutina' : `<span class="rt-ty t-${x.type}">${TYPE_LBL[x.type] || ''}</span> · ${esc(mus)}`}</small></span></button>
    <button class="pk-info" data-act="pk-info" data-name="${esc(x.name)}" aria-label="Información de ${esc(x.name)}">${ic('info', 18)}</button></div>`;
}
function pkList() {
  const P = state.pk, { d } = findDay(P.pid, P.did); if (!d) return '';
  const have = new Set(d.exercises.map(e => e.name)), q = normName(P.q || '');
  const all = LIB.slice().filter(x => (P.eq === 'all' || equipOf(x) === P.eq) && (P.mu === 'all' || pkMusc(x).indexOf(P.mu) >= 0) && (!q || normName(x.name + ' ' + (x.musc || []).join(' ')).includes(q)));
  all.sort((a, b) => a.name.localeCompare(b.name));
  const rec = !q && P.eq === 'all' && P.mu === 'all' ? pkRecent().map(n => LIB.find(x => x.name === n)).filter(Boolean) : [];
  const custom = (P.custom || []).map(n => ({ name: n, type: typeOf(n), musc: [], custom: true }));
  return `${custom.length ? `<div class="pk-sec">Creados por ti</div>${custom.map(x => pkRow(x, have, P.sel)).join('')}` : ''}
    ${rec.length ? `<div class="pk-sec">Ejercicios recientes</div>${rec.map(x => pkRow(x, have, P.sel)).join('')}<div class="pk-sec">Todos los ejercicios</div>` : ''}
    ${all.map(x => pkRow(x, have, P.sel)).join('') || '<div class="muted" style="padding:16px">Sin resultados. Toca "Crear" para agregar uno propio.</div>'}`;
}
function pkView() {
  const P = state.pk; if (!P) return;
  if (P.info) return pkInfoView();
  const n = P.sel.length, { d } = findDay(P.pid, P.did);
  const eqOpts = [['all', 'Todo el equipamiento']].concat(EQUIP), muOpts = [['all', 'Todos los músculos']].concat(PK_MUS.map(m => [m, m]));
  openSheet(`<div class="pk-top"><button class="linkbtn" data-act="pk-cancel">Cancelar</button><b>Agregar ejercicios</b><button class="linkbtn" data-act="pk-create">Crear</button></div>
    ${P.creating ? `<form class="pk-create" id="f-pkc"><input id="pkc-name" placeholder="Nombre del ejercicio" maxlength="40" autocomplete="off"><button class="btn small primary" type="submit">Crear</button></form>` : ''}
    <div class="pk-for muted">${d ? `Para <b>${esc(d.name)}</b> · ${KINDS[d.kind || kindOfName(d.name)] || ''}` : ''}</div>
    <div class="pk-search">${ic('search', 17)}<input id="pk-q" placeholder="Buscar ejercicio" value="${esc(P.q || '')}" autocomplete="off"></div>
    <div class="pk-filters"><select id="pk-eq">${eqOpts.map(([v, l]) => `<option value="${v}" ${P.eq === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
      <select id="pk-mu">${muOpts.map(([v, l]) => `<option value="${v}" ${P.mu === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
    <div class="pk-list" id="pk-list">${pkList()}</div>
    <div class="pk-bottom"><button class="btn primary block" data-act="pk-add" ${n ? '' : 'disabled'}>${n ? `Agregar ${n} ${n === 1 ? 'ejercicio' : 'ejercicios'}` : 'Elige uno o varios ejercicios'}</button></div>`);
  const c = document.querySelector('#sheet .sheet-card'); if (c) c.classList.add('pk-sheet');
  const l = document.getElementById('pk-list'); if (l && P.scroll) l.scrollTop = P.scroll;
  if (P.creating) { const i = document.getElementById('pkc-name'); if (i) i.focus(); }
  else { try { document.activeElement.blur(); } catch (e) {} }
}
function pkInfoView() {
  const P = state.pk, name = P.info, x = libFind(name) || LIB.find(y => y.name === name), pk = photoKey(name), tab = P.itab || 'res';
  const mus = x ? pkMusc(x) : [], prim = x && x.musc ? x.musc[0] : '', sec = x && x.musc ? x.musc.slice(1) : [];
  const stats = typeof exvStatsHtml === 'function' ? exvStatsHtml(name) : '';
  const t = document.createElement('div'); t.innerHTML = stats; const hist = t.querySelector('.st-list'), histLbl = [...t.querySelectorAll('.label')].find(l => /Historial/.test(l.textContent));
  const histHtml = hist ? hist.outerHTML : '<div class="muted">Aún no tienes registros de este ejercicio.</div>';
  if (hist) hist.remove(); if (histLbl) histLbl.remove();
  const on = P.sel.indexOf(name) >= 0;
  openSheet(`<div class="pk-top"><button class="icon-btn" data-act="pk-back" aria-label="Volver">${ic('arrow-left', 18)}</button><b>${esc(name)}</b><span style="width:40px"></span></div>
    <div class="seg pk-tabs"><button class="${tab === 'res' ? 'on' : ''}" data-act="pk-itab" data-v="res">Resumen</button><button class="${tab === 'his' ? 'on' : ''}" data-act="pk-itab" data-v="his">Historial</button><button class="${tab === 'how' ? 'on' : ''}" data-act="pk-itab" data-v="how">Indicaciones</button></div>
    <div class="pk-ibody">
    ${tab === 'res' ? `${pk ? `<div class="pk-media">${exPhoto(pk, 'pk-ph' + (P.paused ? ' paused' : ''))}<button class="pk-pause" data-act="pk-pause" aria-label="${P.paused ? 'Reproducir' : 'Pausar'}">${ic(P.paused ? 'play' : 'pause', 18)}</button></div>` : (x && x.fig ? `<div class="exv-fig">${figSVG(x, 0.5)}</div>` : '')}
      <h2 class="pk-name">${esc(name)}</h2>
      ${prim ? `<div class="muted pk-mus">Primario: ${esc(prim)}${sec.length ? `<br>Secundario: ${esc(sec.join(', '))}` : ''}</div>` : ''}
      <div class="pk-stats">${t.innerHTML || '<div class="muted">Cuando registres este ejercicio verás aquí tu gráfica y tus récords.</div>'}</div>`
    : tab === 'his' ? `<div class="pk-stats">${histHtml}</div>`
    : `${x && x.steps ? `<ol class="pk-steps">${x.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>` : '<div class="muted">Sin indicaciones para este ejercicio.</div>'}
      ${x && x.fig ? `<div class="exv-fig" id="exv-fig">${figSVG(x, 0.5)}</div>` : ''}
      <div class="safe tip">${ic('info', 16)}<span>Baja en 2-3 s, sube en 1 s y mantén la técnica aunque el peso sea menor.</span></div>`}
    </div>
    <div class="pk-bottom"><button class="btn ${on ? '' : 'primary'} block" data-act="pk-pick" data-name="${esc(name)}">${on ? `${ic('check', 16)} Seleccionado · quitar` : 'Agregar ejercicio'}</button></div>`);
  const c = document.querySelector('#sheet .sheet-card'); if (c) c.classList.add('pk-sheet');
  try { document.activeElement.blur(); } catch (e) {}
}
function pkOpen(pid, did) { state.pk = { pid, did, sel: [], q: '', eq: 'all', mu: 'all', custom: [] }; pkView(); }
rtAddSheet = function (pid, did) { pkOpen(pid, did); };

/* Gráfica dentro de la ficha: se re-dibuja aquí */
const _exStatsPk = exStats;
exStats = function (name) {
  if (!exvCapturing && state.pk && state.pk.info === name && document.querySelector('#sheet .pk-sheet')) { const sc = document.querySelector('#sheet .sheet-card'), top = sc ? sc.scrollTop : 0; pkInfoView(); const n = document.querySelector('#sheet .sheet-card'); if (n) n.scrollTop = top; return; }
  return _exStatsPk(name);
};

document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-act^="pk-"]'); if (!b) return;
  ev.stopPropagation(); ev.preventDefault();
  const P = state.pk; if (!P) return;
  const a = b.dataset.act, l = document.getElementById('pk-list'); if (l) P.scroll = l.scrollTop;
  if (a === 'pk-cancel') {
    /* Rutina recién creada con "Nueva rutina" y sin ejercicios: Cancelar no la deja vacía */
    if (state.rtNewDay === P.did) { const { p, d } = findDay(P.pid, P.did); if (p && d && !d.exercises.length) { p.days = p.days.filter(x => x !== d); savePlans(); } }
    state.rtNewDay = null; state.pk = null; closeSheet(); render();
  }
  else if (a === 'pk-tog') { const n = b.dataset.name, i = P.sel.indexOf(n); if (i >= 0) P.sel.splice(i, 1); else P.sel.push(n); pkView(); }
  else if (a === 'pk-info') { P.info = b.dataset.name; P.itab = 'res'; P.paused = false; pkView(); const c = document.querySelector('#sheet .sheet-card'); if (c) c.scrollTop = 0; }
  else if (a === 'pk-back') { P.info = null; pkView(); }
  else if (a === 'pk-itab') { P.itab = b.dataset.v; pkInfoView(); }
  else if (a === 'pk-pause') { P.paused = !P.paused; const ph = document.querySelector('#sheet .pk-ph'); if (ph) ph.classList.toggle('paused', P.paused); b.innerHTML = ic(P.paused ? 'play' : 'pause', 18); }
  else if (a === 'pk-pick') { const n = b.dataset.name, i = P.sel.indexOf(n); if (i >= 0) P.sel.splice(i, 1); else P.sel.push(n); P.info = null; pkView(); }
  else if (a === 'pk-create') { P.creating = !P.creating; pkView(); }
  else if (a === 'pk-add') {
    const { d } = findDay(P.pid, P.did); if (!d) return;
    const k = d.kind || kindOfName(d.name);
    P.sel.forEach(n => { if (!d.exercises.some(e => e.name === n)) d.exercises.push(newEx(n, k)); });
    if (d.autoName && P.sel.length) {   // sin nombre escrito: se nombra según los ejercicios
      const keys = P.sel.map(n => (LIB.find(x => x.name === n) || {}).key).filter(Boolean);
      const nm = keys.length && typeof suggestName === 'function' ? suggestName(keys) : '';
      if (nm) d.name = nm; delete d.autoName;
    }
    const n = P.sel.length; state.rtOpen[d.id] = true; state.rtNewDay = null; state.pk = null; savePlans(); closeSheet(); state.tab = 'plans'; render();
    toast(`${n} ${n === 1 ? 'ejercicio agregado' : 'ejercicios agregados'} a ${d.name}`);
  }
}, true);
document.addEventListener('input', ev => {
  if (ev.target.id !== 'pk-q' || !state.pk) return;
  state.pk.q = ev.target.value; const l = document.getElementById('pk-list'); if (l) { l.innerHTML = pkList(); l.scrollTop = 0; }
});
document.addEventListener('change', ev => {
  if (!state.pk) return;
  if (ev.target.id === 'pk-eq') state.pk.eq = ev.target.value; else if (ev.target.id === 'pk-mu') state.pk.mu = ev.target.value; else return;
  const l = document.getElementById('pk-list'); if (l) { l.innerHTML = pkList(); l.scrollTop = 0; }
});
document.addEventListener('submit', ev => {
  if (ev.target.id !== 'f-pkc' || !state.pk) return; ev.preventDefault();
  const v = String($('#pkc-name').value || '').trim(); if (!v) return;
  const P = state.pk; P.custom = (P.custom || []).concat([v]); if (P.sel.indexOf(v) < 0) P.sel.push(v); P.creating = false; pkView();
  toast(`"${v}" creado y seleccionado`);
}, true);
