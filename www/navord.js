/* ==========================================================================
   Barra de navegación ordenable + hábitos solo en Perfil
   - El orden de los 4 botones se guarda en state.settings.navOrder (se sincroniza).
   - Por defecto: Perfil · Entrenar · Rutinas · Ejercicios.
   - Se cambia en Perfil → Ajustes → "Orden de la barra", o manteniendo
     presionado cualquier botón de la barra.
   - La tarjeta de hábitos ya no aparece en Entrenar; queda solo en Perfil.
   ========================================================================== */
const NAV_ALL = ['profile', 'train', 'plans', 'guide', 'settings'];
const NAV_NAME = { profile: 'Perfil', train: 'Entrenar', plans: 'Rutinas', guide: 'Ejercicios', settings: 'Ajustes' };
const NAV_ICO = { profile: 'user', train: 'dumbbell', plans: 'clipboard-list', guide: 'book-open', settings: 'settings' };
function navOrder() {
  const o = Array.isArray(state.settings.navOrder) ? state.settings.navOrder.filter(k => NAV_ALL.indexOf(k) >= 0) : [];
  NAV_ALL.forEach(k => { if (o.indexOf(k) < 0) o.push(k); });
  return o;
}
function applyNavOrder() {
  const box = document.querySelector('#nav .nav-in'); if (!box) return;
  navOrder().forEach(k => { const b = document.getElementById('nav-' + k); if (b) box.appendChild(b); });
  /* Ajustes tiene su propio botón: se ilumina él y no Perfil */
  const st = state.tab === 'settings', bp = document.getElementById('nav-profile'), bs = document.getElementById('nav-settings');
  if (bs) bs.setAttribute('aria-current', st ? 'page' : 'false');
  if (bp && st) bp.setAttribute('aria-current', 'false');
}
(function () { const b = document.getElementById('nav-settings'), s = b && b.querySelector('svg'); if (s) s.outerHTML = ic('settings', 22); })();
if (!state.settings.navOrder) { state.settings.navOrder = NAV_ALL.slice(); saveLocal(); }
applyNavOrder();

const _renderNav = render;
render = function () { _renderNav(); applyNavOrder(); };

/* Hábitos fuera de Entrenar */
const _vTrainNav = vTrain;
vTrain = function () {
  const h = _vTrainNav();
  if (state.draft || isWatch() || h.indexOf('id="sx"') >= 0) return h;
  const hc = habitCard();
  return h.indexOf(hc) >= 0 ? h.replace(hc, '') : h;
};

/* Lista para ordenar */
function navListHtml() {
  const o = navOrder();
  return o.map((k, i) => `<div class="no-row"><span class="no-n num">${i + 1}</span>${ic(NAV_ICO[k], 18)}<b class="grow">${NAV_NAME[k]}</b>
    <button type="button" class="icon-btn" data-act="nav-mv" data-k="${k}" data-d="-1" ${i === 0 ? 'disabled' : ''} aria-label="Subir ${NAV_NAME[k]}">${ic('chevron-up', 18)}</button>
    <button type="button" class="icon-btn" data-act="nav-mv" data-k="${k}" data-d="1" ${i === o.length - 1 ? 'disabled' : ''} aria-label="Bajar ${NAV_NAME[k]}">${ic('chevron-down', 18)}</button></div>`).join('');
}
function navCardHtml() {
  return `<div class="card no-card"><h3>${ic('columns-2', 17)} Orden de la barra</h3>
    <div class="muted" style="font-size:12.5px">Mueve los botones de abajo a tu gusto. El 1 queda a la izquierda.</div>
    <div class="no-list">${navListHtml()}</div>
    <button type="button" class="btn small" data-act="nav-reset" style="align-self:flex-start">Restablecer (Perfil primero)</button></div>`;
}
const _vSettingsNav = vSettings;
vSettings = function () { return navCardHtml() + _vSettingsNav(); };

function navSheet() {
  openSheet(`<div class="row"><h2 class="grow">Orden de la barra</h2><button type="button" class="icon-btn" data-act="sheet-close" aria-label="Cerrar">${ic('x', 18)}</button></div>
    <div class="muted" style="font-size:12.5px">El 1 queda a la izquierda.</div><div class="no-list">${navListHtml()}</div>
    <button type="button" class="btn primary block" data-act="sheet-close">Listo</button>`);
}
function navSet(o) {
  state.settings.navOrder = o; savePlans(); applyNavOrder();
  document.querySelectorAll('.no-list').forEach(l => { l.innerHTML = navListHtml(); });
}
document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-act="nav-mv"],[data-act="nav-reset"]'); if (!b) return;
  ev.stopPropagation(); ev.preventDefault();
  if (b.dataset.act === 'nav-reset') { navSet(NAV_ALL.slice()); toast('Barra restablecida'); return; }
  const o = navOrder(), i = o.indexOf(b.dataset.k), j = i + (+b.dataset.d);
  if (i < 0 || j < 0 || j >= o.length) return;
  o.splice(i, 1); o.splice(j, 0, b.dataset.k); navSet(o);
}, true);

/* Mantener presionado un botón de la barra → ordenar */
(function () {
  let t = null, fired = false;
  const nav = document.getElementById('nav'); if (!nav) return;
  const start = ev => { if (!ev.target.closest('#nav button')) return; fired = false; clearTimeout(t); t = setTimeout(() => { fired = true; try { navigator.vibrate && navigator.vibrate(20); } catch (e) {} navSheet(); }, 600); };
  const stop = () => clearTimeout(t);
  nav.addEventListener('touchstart', start, { passive: true });
  nav.addEventListener('mousedown', start);
  ['touchend', 'touchmove', 'touchcancel', 'mouseup', 'mouseleave'].forEach(e => nav.addEventListener(e, stop));
  nav.addEventListener('contextmenu', ev => ev.preventDefault());
  nav.addEventListener('click', ev => { if (fired) { fired = false; ev.stopPropagation(); ev.preventDefault(); } }, true);
})();
render();
