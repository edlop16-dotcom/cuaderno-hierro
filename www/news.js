/* ==========================================================================
   Novedades (15-oct-2026)
   Al actualizar sale una vez (por equipo) una hoja "Lo nuevo en Forja" con cada función
   nueva y un botón "Ver" que te lleva a ella. Se vuelve a abrir desde Ajustes → Novedades.
   Para la próxima versión: cambiar NEWS_KEY y la lista NEWS.
   No sale en el reloj, en una instalación nueva (tiene la bienvenida) ni durante una sesión.
   ========================================================================== */
const NEWS_KEY = 'n2';   // se guarda en cdh.newsSeen (local: el celular y el reloj van por separado). n1 = 1.0.39, n2 = nueva organización
const NEWS = [
  ['calendar-check', 'Hoy es tu inicio', 'Al abrir la app ves tu entreno, tus hábitos para marcar en un toque, tu semana y un solo aviso a la vez.', 'hoy', 'Ver Hoy'],
  ['battery', '¿Cómo llegas hoy? en un toque', 'Cansado, Normal o Con todo, en la tarjeta de hoy: la rutina se ajusta sola. Empezar arranca directo; «Ver ejercicios y ajustar» abre la vista previa.', 'hoy-r'],
  ['trending-up', 'Progreso tiene su pestaña', 'Semana (resumen, mapa muscular y coach semanal), Ejercicios (curvas, récords y rangos) e Historial.', 'prog'],
  ['settings', 'Ajustes en ⚙', 'Arriba a la derecha en todas las pantallas. La barra queda para lo que usas cada día.', 'set'],
  ['user', 'Perfil', 'Tu cuenta, tu cuerpo, tus logros y tus amigos.', 'perfil'],
  ['clipboard-list', 'Coach semanal', 'El viernes, músculos que faltan o sobran y un entreno para completar el fin de semana; el domingo, propuesta para la semana siguiente.', 'wc', 'Ver reporte'],
  ['alarm-clock', 'Ding dong en los hábitos', 'El recordatorio suena una vez (2-3 s) y vibra una vez, aunque el celular esté en silencio. En Ajustes puedes poner alarma de 30 s o 1 min.', 'al'],
];
const NEWS_PUB = ['target', 'Peso inicial sugerido y misiones', 'Las rutinas nuevas llegan con un peso prudente para empezar, y tienes misiones de inicio en Hoy.', null];

function newsSheet() {
  const list = NEWS.concat(pubUser() ? [NEWS_PUB] : []);
  openSheet(`<div class="row"><span class="nw-ic">${ic('sparkles', 22)}</span><h2 class="grow">Lo nuevo en Forja</h2><button class="icon-btn" data-act="sheet-close" aria-label="Cerrar">${ic('x', 18)}</button></div>
    <div class="muted nw-sub">Toca <b>Ver</b> para ir a cada función. Algunas salen en su momento: el reporte el viernes y el resumen al terminar una sesión.</div>
    <div class="nw-list">${list.map(([icon, t, d, k, b]) => `<div class="nw-it"><span class="nw-i">${ic(icon, 18)}</span><span class="grow"><b>${t}</b><small>${d}</small></span>${k ? `<button type="button" class="btn small" data-nw="${k}">${b || 'Ver'}</button>` : ''}</div>`).join('')}</div>
    <button type="button" class="btn primary block" data-act="sheet-close">Listo</button>`);
  const c = $('#sheet .sheet-card'); if (c) { c.classList.add('nw-sheet'); c.scrollTop = 0; }
  LS.set('newsSeen', NEWS_KEY);
}
/* Ir a una pantalla y resaltar la tarjeta */
function nwGo(tab, sub, sel, msg) {
  closeSheet(); state.tab = tab; if (sub) { if (tab === 'progress') state.progSub = sub; else state.profSub = sub; } render(); scrollTo(0, 0);
  if (msg) toast(msg); else { const t = $('#toast'); if (t) t.hidden = true; }
  if (sel) setTimeout(() => { const el = document.querySelector(sel); if (!el) return; el.scrollIntoView({ block: 'center', behavior: 'smooth' }); el.classList.add('nw-hl'); setTimeout(() => el.classList.remove('nw-hl'), 2400); }, 150);
}
document.addEventListener('click', ev => {
  const b = ev.target.closest && ev.target.closest('[data-nw]'); if (!b) return;
  ev.preventDefault(); ev.stopPropagation();
  const k = b.dataset.nw;
  if (k === 'open') return newsSheet();
  if (k === 'wc') { closeSheet(); return typeof wcSheet === 'function' && wcSheet('f'); }
  if (k === 'qk') { closeSheet(); return typeof qkSheet === 'function' && qkSheet(); }
  if (k === 'fs') return nwGo('settings', null, '.fs-set');
  if (k === 'ss') return nwGo('plans', null, null, 'Toca un día para abrirlo, luego el nombre del ejercicio, y marca "Superserie con el siguiente".');
  if (k === 'guide') return nwGo('guide', null, null, 'Busca Burpees, Remo invertido o Sentarse y pararse de la silla.');
  if (k === 'rk') return nwGo('progress', 'ejercicios', '.rk-card');
  if (k === 'al') return nwGo('settings', null, '.ha-durrow');
  if (k === 'dd') return nwGo('train', null, '.streak-card', 'Toca un día con llama en tu racha.');
  if (k === 'hoy') return nwGo('train', null, '.hoy-hero');
  if (k === 'hoy-r') return nwGo('train', null, '.hoy-ready');
  if (k === 'prog') return nwGo('progress', 'semana');
  if (k === 'set') return nwGo('settings', null, '#btn-settings', 'Ajustes se abre con ⚙ arriba a la derecha.');
  if (k === 'perfil') return nwGo('profile', 'body');
}, true);

/* Ajustes → Novedades */
const _vSettingsNw = vSettings;
vSettings = function () {
  return _vSettingsNw() + `<div class="card nw-set"><div class="row"><span class="nw-ic">${ic('sparkles', 18)}</span><h3 class="grow">Novedades</h3><button type="button" class="btn small" data-nw="open">Ver</button></div><div class="muted" style="font-size:12.5px">Qué hay de nuevo en esta versión y dónde encontrarlo.</div></div>`;
};
SET_ORDER.push(['nw-set', 12.9]);
SET_ORDER.sort((a, b) => a[1] - b[1]);

/* Sale una vez al abrir tras actualizar: espera a que no haya otra hoja, la racha, la bienvenida ni una sesión */
(function () {
  if (LS.get('newsSeen', '') === NEWS_KEY) return;
  if (FRESH) { LS.set('newsSeen', NEWS_KEY); return; }
  let n = 0;
  const tryShow = () => {
    if (LS.get('newsSeen', '') === NEWS_KEY || n++ > 60) return;
    const onb = document.getElementById('onb');
    const busy = isWatch() || state.draft || !$('#sheet').hidden || document.querySelector('.celebrate') || (onb && !onb.hidden) || (pubUser() && !state.settings.onb);
    if (busy) { setTimeout(tryShow, 2000); return; }
    newsSheet();
  };
  setTimeout(tryShow, 1500);
})();
