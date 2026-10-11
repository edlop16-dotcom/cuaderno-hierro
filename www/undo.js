/* ==========================================================================
   Deshacer un día registrado por error:
   - Al terminar una sesión aparece "Deshacer" durante unos segundos.
   - En la racha, toca un día con llama para ver y quitar lo que registraste.
   - En Historial sigue estando "Borrar sesión".
   Los borrados se sincronizan con el otro equipo.
   ========================================================================== */
function undoBar(msg, label, fn, ms) {
  let el = document.getElementById('undo-bar');
  if (!el) { el = document.createElement('div'); el.id = 'undo-bar'; el.className = 'undo-bar'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
  el.innerHTML = `<span class="grow">${msg}</span><button type="button" class="undo-btn">${ic('rotate-ccw', 16)} ${label}</button>`;
  el.hidden = false;
  el.querySelector('.undo-btn').onclick = () => { el.hidden = true; clearTimeout(undoBar.t); fn(); };
  clearTimeout(undoBar.t); undoBar.t = setTimeout(() => { el.hidden = true; }, ms || 9000);
}
function removeSessions(ids) {
  const set = new Set(ids);
  state.sessions = state.sessions.filter(s => !set.has(s.id));
  state.confirm = null; saveLocal();
}
const _finishUndo = finishSession;
finishSession = function () {
  const id = state.draft && state.draft.id;
  _finishUndo();
  if (!id || !state.sessions.some(s => s.id === id)) return;
  setTimeout(() => undoBar('Sesión guardada.', 'Deshacer', () => {
    removeSessions([id]);
    document.querySelectorAll('.celebrate,.confetti').forEach(n => n.remove());
    render(); toast('Listo, ese día ya no cuenta.');
  }), 2700);
};

/* Días de la racha tocables */
const _streakCardUndo = streakCard;
streakCard = function () {
  const h = _streakCardUndo();
  const ws = weekStartOf(new Date()); let i = 0;
  return h.replace(/<div class="wkd ([^"]*)">/g, (m, cls) => {
    const d = new Date(ws); d.setDate(d.getDate() + i++);
    return /\bon\b/.test(cls) ? `<div class="wkd ${cls}" data-act="day-open" data-k="${dk(d)}" role="button" tabindex="0" aria-label="Ver lo registrado el ${fmtDate(d.toISOString(), true)}">` : m;
  });
};
function daySheet(k) {
  const list = state.sessions.filter(s => dk(s.date) === k);
  if (!list.length) { closeSheet(); render(); return; }
  const d = new Date(list[0].date);
  const t = fmtDate(d.toISOString(), true);
  openSheet(`<h2>${t.charAt(0).toUpperCase() + t.slice(1)}</h2>
    <div class="muted" style="font-size:13px">Si registraste esto por error o mientras probabas la app, quítalo y ya no contará en tu racha, tu progreso ni el coach.</div>
    ${list.map(s => { const ns = s.exercises.reduce((a, e) => a + e.sets.length, 0);
      return `<div class="day-row"><div class="grow"><b>${esc(s.dayName)}</b><div class="muted" style="font-size:12.5px">${esc(s.gymName || gymName(sGym(s)))} · ${s.exercises.length} ejercicios · ${ns} series · ${new Date(s.date).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</div></div>
        <button type="button" class="btn small danger" data-act="day-del" data-id="${s.id}" data-k="${k}">${state.confirm === 'ddel-' + s.id ? '¿Seguro? Toca otra vez' : ic('trash-2', 15) + ' Quitar'}</button></div>`; }).join('')}
    ${list.length > 1 ? `<button type="button" class="btn danger block" data-act="day-del-all" data-k="${k}">${state.confirm === 'ddel-all' ? '¿Seguro? Toca otra vez' : 'Quitar todo este día'}</button>` : ''}
    <button type="button" class="btn block" data-act="sheet-close">Cerrar</button>`);
}
document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-act^="day-"]'); if (!b) return;
  ev.stopPropagation();
  const a = b.dataset.act, k = b.dataset.k;
  if (a === 'day-open') { state.confirm = null; daySheet(k); }
  if (a === 'day-del') {
    const id = b.dataset.id;
    if (state.confirm === 'ddel-' + id) {
      const s = state.sessions.find(x => x.id === id);
      removeSessions([id]); daySheet(k); if ($('#sheet').hidden) render();
      undoBar('Día quitado.', 'Deshacer', () => { if (s) { sync.revive([s.id]); state.sessions.push(s); state.sessions.sort((x, y) => y.date.localeCompare(x.date)); saveLocal(); render(); } });
    } else { state.confirm = 'ddel-' + id; daySheet(k); }
  }
  if (a === 'day-del-all') {
    if (state.confirm === 'ddel-all') {
      const gone = state.sessions.filter(s => dk(s.date) === k);
      removeSessions(gone.map(s => s.id)); closeSheet(); render();
      undoBar('Día quitado.', 'Deshacer', () => { sync.revive(gone.map(s => s.id)); state.sessions = state.sessions.concat(gone).sort((x, y) => y.date.localeCompare(x.date)); saveLocal(); render(); });
    } else { state.confirm = 'ddel-all'; daySheet(k); }
  }
}, true);
document.addEventListener('click', ev => { if (ev.target.closest('[data-act="sheet-close"]')) state.confirm = null; }, true);

render();
