/* ==========================================================================
   Cuidado de lesiones:
   - Avisos de "ejercicio nuevo" y "músculo nuevo": entra suave (RIR 3-4, sin fallo)
     porque lo nuevo produce mucho dolor muscular (DOMS) 24-72 h después.
   - Registro de dolor muscular por zona (leve / fuerte). Los ejercicios que usan esa
     zona muestran qué hacer: bajar peso, no ir al fallo o saltarlo hoy.
   ========================================================================== */
const ZONES = [
  { k: 'pant', name: 'Pantorrillas', re: /pantorr|soleo|talones|gemelo/, sec: /prensa|hack|sentadilla|zancada|bulgara|goblet|peso muerto/ },
  { k: 'cuad', name: 'Cuádriceps', re: /cuadriceps|extension de pierna/ },
  { k: 'isq', name: 'Isquiotibiales', re: /isquio|femoral|rumano/ },
  { k: 'glu', name: 'Glúteos', re: /glute|hip thrust|abduccion/ },
  { k: 'pecho', name: 'Pecho', re: /pecho/ },
  { k: 'esp', name: 'Espalda', re: /dorsal|espalda media|espalda alta|trapecio|remo|jalon|dominada/ },
  { k: 'lumb', name: 'Espalda baja', re: /espalda baja|lumbar|peso muerto|hiperext/ },
  { k: 'homb', name: 'Hombros', re: /hombro|deltoid/ },
  { k: 'bic', name: 'Bíceps', re: /biceps|braquial|curl (biceps|martillo|con barra|predicador|concentrado)/ },
  { k: 'tri', name: 'Tríceps', re: /triceps|press frances|fondos/ },
  { k: 'abd', name: 'Abdomen', re: /abdomen|core|crunch|plancha/ },
];
const SORE_DAYS = 5;
function exText(name) { const x = libFind(name); return normName(name + ' ' + (x ? x.musc.join(' ') : '')); }
function zonesOf(name) { const t = exText(name), n = normName(name); return ZONES.filter(z => z.re.test(t)).map(z => z.k).concat(ZONES.filter(z => z.sec && !z.re.test(t) && z.sec.test(n)).map(z => '~' + z.k)); }
function soreMap() {
  const s = state.settings.sore || {}, out = {}, now = Date.now();
  for (const k in s) if (s[k] && s[k].lvl && now - s[k].at < SORE_DAYS * 864e5) out[k] = s[k];
  return out;
}
function setSore(k, lvl) { state.settings.sore = Object.assign({}, state.settings.sore || {}); if (lvl) state.settings.sore[k] = { lvl, at: Date.now() }; else delete state.settings.sore[k]; savePlans(); }
const zoneName = k => (ZONES.find(z => z.k === k) || {}).name || k;
const LVL = { 1: 'leve', 2: 'fuerte' };

/* Historial por ejercicio y por zona (sin contar registros aproximados) */
function doneBefore(name) { return state.sessions.some(s => s.exercises.some(e => exSame(e.name, name) && e.sets.length)) || !!(typeof baseRec === 'function' && baseRec(name)); }
function zoneTrained(k) { return state.sessions.some(s => s.exercises.some(e => zonesOf(e.name).includes(k))) || (HISTORY.records || []).some(r => zonesOf(r.name).includes(k)); }
function timesDone(name) { return state.sessions.filter(s => !s.approx && s.exercises.some(e => exSame(e.name, name) && e.sets.length)).length; }

function safetyNotes(name) {
  const notes = [], sore = soreMap(), zs = zonesOf(name);
  zs.filter(z => z[0] !== '~' && sore[z]).forEach(z => {
    notes.push(sore[z].lvl >= 2
      ? { lv: 'stop', t: `Te duelen fuerte las <b>${zoneName(z).toLowerCase()}</b>. Hoy mejor <b>sáltalo</b> o haz 1-2 series muy livianas solo para mover la zona. Si el dolor es punzante o en la articulación, no lo entrenes y consulta.` }
      : { lv: 'warn', t: `Aún te duelen un poco las <b>${zoneName(z).toLowerCase()}</b>: baja el peso un 20-30 % y <b>no llegues al fallo</b>. Moverte suave ayuda a recuperarte.` });
  });
  zs.filter(z => z[0] === '~' && sore[z.slice(1)]).forEach(z => notes.push({ lv: 'tip', t: `Este ejercicio también carga las ${zoneName(z.slice(1)).toLowerCase()} (que te duelen): empuja con todo el pie, apoyando el talón, no con las puntas.` }));
  if (!doneBefore(name)) {
    const nz = zs.filter(z => z[0] !== '~' && !zoneTrained(z));
    notes.push({ lv: 'new', t: `<b>Ejercicio nuevo para ti.</b> Haz solo <b>2 series</b> con un peso que podrías mover 15 veces (te sobran 3-4 reps) y <b>no vayas al fallo</b>.${nz.length ? ` Trabaja un músculo que nunca entrenaste (${nz.map(zoneName).join(', ').toLowerCase()}): mañana y pasado puede doler mucho; sube poco a poco durante 2-3 semanas.` : ' Lo nuevo suele dejar dolor 24-72 h después.'}` });
  } else if (timesDone(name) < 3 && zs.some(z => z[0] !== '~' && ['pant'].includes(z))) {
    notes.push({ lv: 'new', t: 'Aún te estás adaptando a este ejercicio: quédate 2-3 reps antes del fallo las primeras semanas.' });
  }
  return notes;
}
const NOTE_IC = { stop: 'shield', warn: 'heart-pulse', tip: 'info', new: 'sparkles' };
const notesHtml = name => safetyNotes(name).map(n => `<div class="safe ${n.lv}">${ic(NOTE_IC[n.lv], 16)}<span>${n.t}</span></div>`).join('');

/* En la sesión: aviso en cada ejercicio */
function decorateSafety() {
  const d = state.draft; if (!d) return;
  const cards = document.querySelectorAll('#app .card.ex');
  d.exercises.forEach((e, i) => {
    const c = cards[i]; if (!c || c.querySelector('.safe')) return;
    const h = notesHtml(e.name); if (!h) return;
    const top = c.querySelector('.ex-top'); (top || c.firstElementChild).insertAdjacentHTML('afterend', h);
  });
}
const _renderSafe = render;
render = function () { _renderSafe(); decorateSafety(); };

/* Tarjeta de dolor muscular (Entrenar y vista previa) */
function soreCard(compact) {
  const sore = soreMap(), act = Object.keys(sore);
  return `<div class="card sorecard ${compact ? 'compact' : ''}" id="sorecard"><div class="row" style="justify-content:space-between"><h3>${ic('heart-pulse', 17)} ¿Te duele algún músculo?</h3>${act.length ? `<span class="chip">${act.length} ${act.length === 1 ? 'zona' : 'zonas'}</span>` : ''}</div>
    <div class="muted" style="font-size:12.5px">Toca para marcar: una vez = leve, dos = fuerte, tres = ya no duele. Los ejercicios que usan esa zona te dirán qué hacer. Se borra solo en ${SORE_DAYS} días.</div>
    <div class="sore-chips">${ZONES.map(z => { const s = sore[z.k]; return `<button class="sore ${s ? 'l' + s.lvl : ''}" data-act="sore" data-k="${z.k}" aria-pressed="${!!s}">${z.name}${s ? ` · ${LVL[s.lvl]}` : ''}</button>`; }).join('')}</div></div>`;
}
const _vTrainSafe = vTrain;
vTrain = function () {
  const h = _vTrainSafe();
  if (h.indexOf('id="sx"') >= 0 || isWatch()) return h;
  const act = Object.keys(soreMap());
  const card = act.length ? soreCard() : `<button class="sore-mini" data-act="sore-open">${ic('heart-pulse', 16)} ¿Te duele algún músculo? <span class="muted">Márcalo</span></button>`;
  const at = h.indexOf('<div class="card habits2"');
  return at < 0 ? h + card : h.slice(0, at) + card + h.slice(at);
};
/* Vista previa: avisos por ejercicio + dolor */
const _previewSafe = previewSheet;
previewSheet = function (pid, did) {
  _previewSafe(pid, did);
  const { d } = findDay(pid, did); if (!d) return;
  const rows = document.querySelectorAll('#sheet .pv-row');
  d.exercises.forEach((e, i) => {
    const r = rows[i]; if (!r) return;
    const ns = safetyNotes(e.name), sore = ns.some(n => n.lv === 'stop' || n.lv === 'warn'), nw = ns.some(n => n.lv === 'new' && !doneBefore(e.name));
    if (sore || nw) r.querySelector('b').insertAdjacentHTML('beforeend', ` ${sore ? '<span class="pv-tag sore">Dolor</span>' : ''}${nw ? '<span class="pv-tag new">Nuevo</span>' : ''}`);
  });
  const list = document.querySelector('#sheet .pv-list');
  if (list) list.insertAdjacentHTML('afterend', soreCard(true));
};

document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-act="sore"],[data-act="sore-open"]'); if (!b) return;
  ev.stopPropagation();
  if (b.dataset.act === 'sore-open') { openSheet(`<div class="row"><h2 class="grow">Dolor muscular</h2><button class="icon-btn" data-act="sheet-close" aria-label="Cerrar">${ic('x', 18)}</button></div>${soreCard(true)}<button class="btn primary block" data-act="sheet-close">Listo</button>`); return; }
  const k = b.dataset.k, cur = (soreMap()[k] || {}).lvl || 0, nx = (cur + 1) % 3;
  setSore(k, nx);
  const box = b.closest('#sorecard'); if (box) box.outerHTML = soreCard(box.classList.contains('compact'));
  if ($('#sheet').hidden) render();
}, true);

/* Los registros aproximados cuentan para la racha y el historial, no para gráficas ni récords */
const _exPointsSafe = exPoints;
exPoints = function (name, gym) { return _exPointsSafe(name, gym).filter(p => !p.s.approx); };
const _bestSafe = bestE1rm;
bestE1rm = function (name, gymId) { const keep = state.sessions; state.sessions = keep.filter(s => !s.approx); try { return _bestSafe(name, gymId); } finally { state.sessions = keep; } };

bootRender();
