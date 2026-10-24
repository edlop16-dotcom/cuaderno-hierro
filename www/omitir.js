/* ==========================================================================
   "Omitir hoy" en los hábitos (24-oct-2026, después de la I2). Decisiones del usuario:
   - No cuenta como hecho y la racha queda en PAUSA: el día omitido no suma ni corta (5 días, omites hoy, mañana lo
     haces → 6). Se guarda en `daily[día].skip[k]` (se sincroniza con el día); mañana avisa normalmente.
   - Se ve aparte: en "Tus rachas" el día sale con "–" (gris) y el resumen semanal cuenta los omitidos aparte, sin
     bajar el porcentaje. El logro "7 días seguidos con todos tus hábitos" también queda en pausa ese día.
   - Cancela todos los avisos de ese hábito por el resto del día (habalarm.js: `habDoneOn` lo trata como hecho para
     avisar; nativo: HabitAlarms.skip). Se deshace ese mismo día en "Hábitos de hoy" → "Omitir hoy".
   - Dónde: "Hábitos de hoy" (botón "Omitir hoy" y la lista), la pantalla del recordatorio (nativa y dentro de la app)
     y la notificación. El reloj no muestra el botón, pero respeta lo omitido (no le programa esos avisos).
   ========================================================================== */
/* habSkipped y habSkip están en habalarm.js (los usa al leer los eventos del nativo al abrir la app) */

/* ---------- Racha en pausa: los días omitidos se saltan sin cortarla ---------- */
supStreak = function (k) {
  let n = 0; const d = new Date();
  for (let i = 0; i < 1000; i++) {
    const t = state.daily[dk(d)] || {};
    if (t[k]) n++;
    else if (i > 0 && !(t.skip && t.skip[k])) break;   // hoy sin marcar todavía no la corta
    d.setDate(d.getDate() - 1);
  }
  return n;
};

/* ---------- Hábitos de hoy: botón "Omitir hoy" y los omitidos en gris ---------- */
const _habitCardOm = habitCard;
habitCard = function () {
  let h = _habitCardOm.apply(this, arguments); if (isWatch()) return h;
  const now = new Date();
  habList().filter(x => !x.hidden && habSkipped(x.k, now)).forEach(x => {
    h = h.replace(new RegExp(`(<button class="hab )([^"]*)(" data-act="sup" data-k="${x.k}"[^>]*>)([\\s\\S]*?)<small>[\\s\\S]*?</small>`), (m, a, cls, b, mid) => `${a}${cls} om${b}${mid}<small>Omitido hoy</small>`);
  });
  return h.replace('<button class="icon-btn sm" data-act="hab-edit"', `<button type="button" class="hab-omb" data-om="open">Omitir hoy</button>$&`);
};
dailyPanel = habitCard;
function habSkipSheet() {
  const now = new Date(), t = state.daily[dk(now)] || {}, L = habList().filter(x => !x.hidden);
  openSheet(`<div class="row"><h2 class="grow">Omitir hoy</h2><button class="icon-btn" data-act="sheet-close" aria-label="Cerrar">${ic('x', 18)}</button></div>
    <div class="muted" style="font-size:13px">Si hoy no toca un hábito, omítelo: no te avisa más hoy, no cuenta como hecho y tu racha queda en pausa (no suma ni se corta). Mañana vuelve a avisar solo. Puedes deshacerlo hoy.</div>
    <div class="om-list">${L.map(x => { const done = !!t[x.k], sk = habSkipped(x.k, now), st = supStreak(x.k);
      return `<div class="row om-row ${sk ? 'om' : ''}"><span class="hab-ic">${ic(x.icon || 'pill', 18)}</span><div class="grow" style="min-width:0"><b>${esc(x.name)}</b><small class="muted">${done ? 'Hecho hoy ✓' : sk ? 'Omitido hoy · racha en pausa' : st ? `🔥 ${st} ${st === 1 ? 'día' : 'días'}` : 'Por hacer'}</small></div>
        ${done ? '' : `<button type="button" class="btn small" data-om="${sk ? 'undo' : 'skip'}" data-k="${x.k}">${sk ? 'Deshacer' : 'Omitir hoy'}</button>`}</div>`; }).join('')}</div>
    <button type="button" class="btn block" data-act="sheet-close">Listo</button>`);
}

/* ---------- La pantalla del recordatorio dentro de la app ---------- */
const _haShowOm = haShow;
haShow = function (it) {
  _haShowOm.apply(this, arguments);
  if (!it || !it.habit || isWatch()) return;
  const b = document.querySelector('#hab-alarm .ha-bottom');
  if (b && !b.querySelector('.ha-skipb')) b.insertAdjacentHTML('beforeend', '<button type="button" class="ha-skipb" data-om="alarm">Omitir hoy</button>');
};

/* ---------- "Tus rachas": el día omitido con "–" ---------- */
const _habSheetOm = habSheet;
habSheet = function () {
  _habSheetOm.apply(this, arguments);
  document.querySelectorAll('#sheet .hd[data-k][data-d]').forEach(b => {
    const t = state.daily[b.dataset.d] || {};
    if (!t[b.dataset.k] && t.skip && t.skip[b.dataset.k]) { b.classList.add('om'); b.setAttribute('aria-label', b.getAttribute('aria-label') + ' · omitido'); const s = b.querySelector('span'); if (s) s.textContent = '–'; }
  });
};

/* ---------- Toques ---------- */
document.addEventListener('click', ev => {
  const b = ev.target.closest && ev.target.closest('[data-om]'); if (!b) return;
  ev.preventDefault(); ev.stopPropagation();
  const a = b.dataset.om, day = dk(new Date());
  if (a === 'open') habSkipSheet();
  else if (a === 'skip' || a === 'undo') {
    habSkip(b.dataset.k, day, a === 'skip'); render(); habSkipSheet();
    const n = (habOf(b.dataset.k) || {}).name || '';
    toast(a === 'skip' ? `${n}: omitido hoy. No te aviso más hoy; mañana sí.` : `${n}: vuelve a avisarte hoy.`);
  }
  else if (a === 'alarm' && haCur) {
    const it = haCur; haHide(); habSkip(it.habit, it.day || day, true); render();
    toast(`${it.name || ''}: omitido hoy. Mañana vuelve a avisar.`);
  }
}, true);

/* ---------- Lo omitido en otro equipo (llega al sincronizar): reprogramar para no avisarlo ---------- */
if (typeof sync !== 'undefined' && sync.run) {
  const _runOm = sync.run.bind(sync);
  sync.run = async function () {
    const before = JSON.stringify((state.daily[dk(new Date())] || {}).skip || {});
    const r = await _runOm.apply(this, arguments);
    if (JSON.stringify((state.daily[dk(new Date())] || {}).skip || {}) !== before && typeof scheduleSoon === 'function') scheduleSoon();
    return r;
  };
}
bootRender();
