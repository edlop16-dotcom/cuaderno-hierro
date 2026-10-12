/* ==========================================================================
   Conservar tus ajustes al actualizar la app
   1. Antes de descargar una versión nueva se guarda una copia de todo (hábitos, recordatorios,
      rutinas, ajustes, sesiones) y se sincroniza con tu cuenta.
   2. Al abrir la versión nueva, la app compara con esa copia y repone lo que falte
      (sin borrar nada nuevo), vuelve a programar los recordatorios y te muestra un resumen.
   3. Los recordatorios y el sonido también se guardan en tu cuenta, para recuperarlos
      si reinstalas o cambias de teléfono.
   ========================================================================== */
const KEEP_SKIP = ['cdh.preupd', 'cdh.auth', 'cdh.syncMeta', 'cdh.updLatest', 'cdh.updCheckedAt'];
function keepSnapshot(reason) {
  try {
    const o = {};
    Object.keys(localStorage).forEach(k => { if (k.indexOf('cdh.') === 0 && KEEP_SKIP.indexOf(k) < 0) o[k] = localStorage.getItem(k); });
    localStorage.setItem('cdh.preupd', JSON.stringify({ at: Date.now(), reason: reason || '', build: (typeof upd !== 'undefined' && upd.current && upd.current.build) || 0, data: o }));
  } catch (e) {}
}
const unionBy = (a, b, key) => { a = Array.isArray(a) ? a.slice() : []; (Array.isArray(b) ? b : []).forEach(x => { if (x && !a.some(y => y && y[key] === x[key])) a.push(x); }); return a; };

/* Reponer lo que falte respecto de la copia */
function keepRestore() {
  let snap; try { snap = JSON.parse(localStorage.getItem('cdh.preupd') || 'null'); } catch (e) { snap = null; }
  if (!snap || !snap.data) return null;
  const fixed = [];
  Object.keys(snap.data).forEach(k => {
    const cur = localStorage.getItem(k), old = snap.data[k];
    if (cur == null) { localStorage.setItem(k, old); fixed.push(k.slice(4)); return; }
    if (k === 'cdh.settings') {
      let c, o; try { c = JSON.parse(cur); o = JSON.parse(old); } catch (e) { return; }
      let ch = false;
      Object.keys(o || {}).forEach(x => { if (!(x in c)) { c[x] = o[x]; ch = true; } });
      const hu = unionBy(c.habits, o && o.habits, 'k'); if (o && o.habits && hu.length > (c.habits || []).length) { c.habits = hu; ch = true; }
      if (ch) { localStorage.setItem(k, JSON.stringify(c)); fixed.push('ajustes'); }
    } else if (k === 'cdh.reminders') {
      let c, o; try { c = JSON.parse(cur); o = JSON.parse(old); } catch (e) { return; }
      const u = unionBy(c, o, 'id'); if (u.length > (c || []).length) { localStorage.setItem(k, JSON.stringify(u)); fixed.push('recordatorios'); }
    } else if (k === 'cdh.sessions') {
      let c, o; try { c = JSON.parse(cur); o = JSON.parse(old); } catch (e) { return; }
      const u = unionBy(c, o, 'id'); if (u.length > (c || []).length) { u.sort((a, b) => String(b.date).localeCompare(String(a.date))); localStorage.setItem(k, JSON.stringify(u)); fixed.push('entrenamientos'); }
    }
  });
  return fixed;
}

/* Recordatorios y sonido en tu cuenta (se recuperan al reinstalar) */
if (typeof saveReminders === 'function') {
  const _saveRemK = saveReminders;
  saveReminders = function () { _saveRemK(); state.settings.remBackup = state.reminders; savePlans(); };
}
if (!LS.get('reminders', null) && Array.isArray(state.settings.remBackup) && state.settings.remBackup.length) {
  state.reminders = state.settings.remBackup; LS.set('reminders', state.reminders); if (typeof scheduleSoon === 'function') scheduleSoon();
}
if (!state.settings.remBackup && state.reminders) { state.settings.remBackup = state.reminders; saveLocal(); }

/* Antes de actualizar: copia + sincronizar */
document.addEventListener('click', ev => {
  if (!ev.target.closest('[data-act="upd-go"]')) return;
  keepSnapshot('actualizar');
  try { if (typeof sync !== 'undefined' && sync.on()) sync.run(); } catch (e) {}
}, true);

/* Al abrir una versión nueva: revisar y reponer */
(function keepCheck() {
  const C = typeof CAP !== 'undefined' && CAP && CAP.App;
  try { const m = sessionStorage.getItem('keepMsg'); if (m) { sessionStorage.removeItem('keepMsg'); sessionStorage.removeItem('keepReload'); const habs = typeof habList === 'function' ? habList().length : 0; setTimeout(() => toast(`Versión nueva lista. Repuse lo que faltaba (${m}); tienes ${habs} hábitos y tus recordatorios.`), 1500); if (typeof scheduleSoon === 'function') scheduleSoon(); keepSnapshot('repuesto'); return; } } catch (e) {}
  const run = build => {
    const last = LS.get('lastBuild', 0);
    if (!last) { LS.set('lastBuild', build); keepSnapshot('primera vez'); return; }
    if (build && build !== last) {
      LS.set('lastBuild', build);
      const fixed = keepRestore();
      if (fixed && fixed.length && !sessionStorage.getItem('keepReload')) { try { sessionStorage.setItem('keepReload', '1'); sessionStorage.setItem('keepMsg', fixed.join(', ')); } catch (e) {} location.reload(); return; }
      const habs = typeof habList === 'function' ? habList().length : 0, rems = (state.reminders || []).filter(r => r.on).length;
      if (typeof scheduleSoon === 'function') scheduleSoon();
      setTimeout(() => toast(`Actualizada a la versión ${build}. Se conservaron tus ajustes: ${habs} hábitos, ${rems} recordatorios activos y tus rutinas.`), 1500);
      keepSnapshot('versión ' + build);
    } else if (Date.now() - ((JSON.parse(localStorage.getItem('cdh.preupd') || '{}').at) || 0) > 864e5) keepSnapshot('diaria');   // copia diaria por si acaso
  };
  if (C) C.getInfo().then(i => run(+i.build || 0)).catch(() => {});
  else run(0);
})();
