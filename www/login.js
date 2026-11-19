/* ================== Inicio de sesión más claro (rama login) ==================
   1. Mis finanzas de un respaldo restaurado antes de iniciar sesión: respaldo.js las deja en `cdh.finPend`
      (solo en este teléfono, ocultas). Cuando finOwner() se cumple (al entrar a la cuenta del dueño) pasan a `cdh.fin`.
   2. Primer inicio de sesión desde una instalación nueva: sync.js no sube el perfil de la bienvenida a una cuenta
      que ya tiene datos y no tiene perfil; lo deja en `cdh.profAsk` y aquí se pregunta si usarlo o descartarlo.
   3. Cambiar el nombre: botón junto al nombre en Perfil y en Tu cuenta, con una hoja corta.
   El reloj no cambia. */

function finPendAdopt() {
  if (isWatch() || typeof finOwner !== 'function' || !finOwner()) return false;
  const p = localStorage.getItem('cdh.finPend'); if (p == null) return false;
  if (localStorage.getItem('cdh.fin') != null) return false;   // ya hay Mis finanzas: no se pisan ni se borra la copia
  localStorage.setItem('cdh.fin', p); FIN = null;
  localStorage.removeItem('cdh.finPend');
  return true;
}

/* ---------- Perfil de la bienvenida retenido al entrar ---------- */
const profAsk = () => (isWatch() ? null : LS.get('profAsk', null));
function profAskSheet() {
  const p = profAsk(); if (!p) return;
  const bits = [p.name ? esc(p.name) : '', p.age ? esc(p.age) + ' años' : '', typeof PB_GOALS !== 'undefined' && PB_GOALS[p.goal] ? esc(PB_GOALS[p.goal][0]) : ''].filter(Boolean);
  openSheet(`<div class="row"><h2 class="grow">¿Usar los datos de este teléfono?</h2></div>
    <div class="muted" style="font-size:13px">Tu cuenta no tiene nombre ni datos personales. En este teléfono llenaste la bienvenida${bits.length ? ': <b>' + bits.join(' · ') + '</b>' : ''}.</div>
    <button type="button" class="btn primary block" data-lg="prof-use">Usar estos datos</button>
    <button type="button" class="btn block" data-lg="prof-drop">Descartar</button>
    <div class="muted" style="font-size:12px">Puedes cambiar tu nombre cuando quieras desde Perfil.</div>`);
}

/* ---------- Cambiar el nombre ---------- */
function nameSheet() {
  const p = state.settings.prof || {};
  openSheet(`<div class="row"><h2 class="grow">Tu nombre</h2><button class="icon-btn" data-act="sheet-close" aria-label="Cerrar">${ic('x', 18)}</button></div>
    <form id="f-lgname" class="bd-form">
      <label class="field"><span class="label">Cómo quieres que te llame la app</span><input id="lg-name" maxlength="24" autocomplete="given-name" placeholder="Tu nombre" value="${esc(p.name || '')}"></label>
      <button class="btn primary block" type="submit">Guardar</button>
    </form>`);
}
function nameSave(v) {
  /* Solo cambia el nombre: si no hay perfil, se crea con el nombre y nada más (no se suponen otros datos) */
  state.settings.prof = Object.assign({}, state.settings.prof || {}, { name: v });
  applyProf(); savePlans();
}
const lgNameBtn = (t) => `<button type="button" class="btn small lg-name" data-lg="name">${ic('square-pen', 14)} ${t}</button>`;

document.addEventListener('submit', ev => {
  if (!ev.target || ev.target.id !== 'f-lgname') return;
  ev.preventDefault(); ev.stopPropagation();
  const v = ($('#lg-name').value || '').trim();
  nameSave(v); closeSheet(); toast(v ? 'Nombre guardado.' : 'Nombre borrado.'); render();
}, true);
document.addEventListener('click', ev => {
  const b = ev.target.closest && ev.target.closest('[data-lg]'); if (!b) return;
  ev.preventDefault(); ev.stopPropagation();
  const a = b.dataset.lg;
  if (a === 'name') return nameSheet();
  if (a === 'prof-use') { const p = profAsk(); LS.del('profAsk'); if (p) { state.settings.prof = Object.assign({}, p, state.settings.prof || {}); applyProf(); savePlans(); } closeSheet(); toast('Datos guardados en tu cuenta.'); render(); return; }
  if (a === 'prof-drop') { LS.del('profAsk'); applyProf(); closeSheet(); render(); nameSheet(); return; }
}, true);

/* Al entrar con correo o con Google: preguntar si quedó un perfil retenido */
['signIn', 'google'].forEach(k => {
  const f = account[k];
  account[k] = async function () { const r = await f.apply(this, arguments); setTimeout(() => { finPendAdopt(); if (profAsk()) profAskSheet(); }, 300); return r; };
});

/* Tu cuenta: el nombre a la vista, con su botón para cambiarlo */
const _accountCardLg = accountCard;
accountCard = function () {
  const h = _accountCardLg.apply(this, arguments);
  if (isWatch() || !hasAccount() || fb.auth.watch) return h;
  const nm = (state.settings.prof || {}).name || '';
  const row = `<div class="row lg-row"><div class="grow muted" style="font-size:12.5px">Nombre: <b>${nm ? esc(nm) : 'sin nombre'}</b></div>${lgNameBtn('Cambiar')}</div>`;
  const i = h.indexOf('<span id="sync-status"'); return i < 0 ? h : h.slice(0, i) + row + h.slice(i);
};

const _renderLg = render;
render = function () {
  if (!isWatch()) {
    finPendAdopt();
    const pn = (state.settings.prof || {}).name || '';
    if (HISTORY.name !== pn) applyProf();
  }
  _renderLg();
  if (isWatch()) return;
  const app = $('#app'); if (!app) return;
  const h2 = app.querySelector('.pcard h2');
  if (h2 && !app.querySelector('.pcard .lg-name')) h2.insertAdjacentHTML('afterend', lgNameBtn((state.settings.prof || {}).name ? 'Cambiar nombre' : 'Ponte un nombre'));
};
if (profAsk() && hasAccount()) setTimeout(profAskSheet, 1200);
bootRender();
