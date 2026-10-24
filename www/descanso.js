/* ==========================================================================
   Tanda I2 · Fin del descanso con la pantalla apagada (24-oct-2026). Solo teléfono con la app instalada.
   - Al quedar la app en segundo plano durante un descanso (pantalla apagada o se fue a otra app), se programa
     en el nativo (HabitAlarm.rest) un aviso a la hora en que termina. Si a esa hora la pantalla está apagada,
     HabitAlarmActivity la enciende con "Descanso terminado", qué sigue y "Volver a la sesión"; si está
     encendida, queda solo la notificación normal de siempre (native.js, id 9001). Al volver, se cancela.
   - Ajustes → Fin del descanso: "Pantalla completa con el celular apagado" (`settings.restFull`, activado por
     defecto) y los permisos que faltan (pantalla completa en Android 14+, alarmas exactas).
   - Sonido: el ding dong de los hábitos (sale aunque el celular esté en silencio) salvo "Sin sonido"; si no
     suena, vibra si la vibración está activa. El reloj no cambia.
   ========================================================================== */
const RF = (typeof CAP !== 'undefined' && CAP && CAP.HabitAlarm) || null;
const rfOn = () => state.settings.restFull !== false;
/* Qué sigue: el ejercicio de la página actual y su próxima serie sin hacer */
function rfNext() {
  const d = state.draft; if (!d) return '';
  const e = d.exercises[Math.min(d.cur || 0, d.exercises.length - 1)]; if (!e) return '';
  const n = e.log.findIndex(s => !s.done);
  return n >= 0 ? `Sigue: ${e.name} · serie ${n + 1} de ${e.log.length}` : `Sigue: ${e.name}`;
}
function rfArm() {
  if (!RF || isWatch() || !rfOn() || !state.draft) return;
  const r = state.rest; if (!r || r.rang || r.end < Date.now() + 1500) return;
  const c = typeof alertCfg === 'function' ? alertCfg() : {};
  RF.rest({ at: r.end, title: 'Descanso terminado', body: rfNext(), snd: c.sound !== 'silencio', vib: +c.vib !== 0 }).catch(() => {});
}
function rfCancel() { if (RF) RF.restCancel().catch(() => {}); }
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') rfArm(); else { rfCancel(); rfStatus(); } });

/* ---------- Ajustes → Fin del descanso ---------- */
function rfStatus() { if (RF && !isWatch() && RF.status) RF.status().then(s => { const ch = JSON.stringify(s) !== JSON.stringify(state.rfSt); state.rfSt = s; if (ch && state.tab === 'settings') render(); }).catch(() => {}); }
function rfRow() {
  const on = rfOn(), st = state.rfSt;
  const need = on && RF && st ? [!st.fullScreen && ['fullScreen', 'Permitir pantalla completa'], !st.exact && ['exact', 'Permitir alarmas exactas']].filter(Boolean) : [];
  return `<div class="row rf-row"><div class="grow"><b>Pantalla completa con el celular apagado</b><div class="muted" style="font-size:12px">Si la pantalla está apagada cuando termina el descanso, se enciende con «Descanso terminado» y un botón para volver a la sesión. Con la pantalla encendida, solo el aviso normal.</div></div>
    <button type="button" class="switch ${on ? 'on' : ''}" data-rf="tog" role="switch" aria-checked="${on}" aria-label="Pantalla completa con el celular apagado"><i></i></button></div>
    ${need.length ? `<div class="rf-perm"><div class="muted" style="font-size:12px">${!st.fullScreen ? 'Android pide «Notificaciones de pantalla completa» para encender la pantalla.' : ''}${!st.exact ? ' Con «Alarmas y recordatorios» el aviso llega a la hora exacta.' : ''}</div><div class="row" style="gap:8px;flex-wrap:wrap">${need.map(([t, l]) => `<button type="button" class="btn small" data-rf="perm" data-t="${t}">${l}</button>`).join('')}</div></div>` : ''}
    ${on && !RF ? '<div class="muted" style="font-size:12px">Funciona en la app instalada en Android.</div>' : ''}`;
}
const _alertCardRF = alertSettingsCard;
alertSettingsCard = function () {
  const h = _alertCardRF.apply(this, arguments); if (isWatch()) return h;
  const k = h.lastIndexOf('</div>'); return k < 0 ? h : h.slice(0, k) + rfRow() + h.slice(k);
};
document.addEventListener('click', ev => {
  const b = ev.target.closest && ev.target.closest('[data-rf]'); if (!b) return;
  ev.preventDefault(); ev.stopPropagation();
  if (b.dataset.rf === 'tog') { state.settings.restFull = !rfOn(); savePlans(); render(); toast(rfOn() ? 'Listo: si la pantalla está apagada, se enciende al terminar el descanso.' : 'El fin del descanso será solo el aviso normal.'); }
  else if (b.dataset.rf === 'perm' && RF) RF.openSettings({ type: b.dataset.t }).catch(() => {});
}, true);
rfStatus();
bootRender();
