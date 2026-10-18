/* ==========================================================================
   Novedades (15-oct-2026)
   Al actualizar sale una vez (por equipo) una hoja "Lo nuevo en Forja" con cada función
   nueva y un botón "Ver" que te lleva a ella. Se vuelve a abrir desde Ajustes → Novedades.
   Para la próxima versión: cambiar NEWS_KEY y la lista NEWS.
   No sale en el reloj, en una instalación nueva (tiene la bienvenida) ni durante una sesión.
   ========================================================================== */
const NEWS_KEY = 'n6';   // se guarda en cdh.newsSeen (local: el celular y el reloj van por separado). n1 = 1.0.39, n2 = nueva organización (tanda 1), n3 = tanda 2, n4 = Próxima sesión (Coach e importada) y la ✕ de los hábitos, n5 = recordatorios en toda la pantalla (también agua) y últimos avisos, n6 = editar sesión, catálogo, alternativas, pantalla del ejercicio, exportar a la IA, mis ejercicios, hábitos con ⚙ y fotos (tandas 0 y A-G)
const NEWS = [
  ['square-pen', 'Edita una sesión terminada', 'Toca un día de tu racha y luego Editar sesión: corrige pesos, reps, series o ejercicios. Récords, progreso y coach se recalculan solos.', 'sed'],
  ['book-open', '414 ejercicios y búsqueda', 'La Biblioteca y el selector buscan por nombre, músculo o máquina, y filtran por músculo, tipo de equipo y máquina concreta.', 'guide', 'Ver Biblioteca'],
  ['refresh-cw', '¿No está esa máquina?', 'En la sesión, Reemplazar te da alternativas con el peso ya convertido. Marca el equipo que no hay en tu gimnasio y el coach lo respeta.', 'gymno'],
  ['timer', 'Nueva pantalla del ejercicio', 'Cronómetro, tabla Serie · Anterior · Kg · Reps, + Añadir serie, descanso abajo con −15 / +15 y un sonido al marcar cada serie (se apaga en Música y sonidos).', 'fs', 'Sonidos'],
  ['download', 'Exporta todo a tu IA', 'En Progreso y Perfil mandas tus datos, plan y sesiones a tu IA como coach. Su recomendación se importa y entrenas con ella con Entrenar ahora.', 'aix'],
  ['plus', 'Crea tus ejercicios', 'Con + Crear ejercicio en la Biblioteca eliges músculo, equipo y una foto si quieres. Cuentan en el coach, el mapa y tus récords.', 'myex', 'Crear'],
  ['settings', 'Hábitos con ⚙', 'En Tus hábitos, ⚙ abre el hábito con su recordatorio en una sola pantalla. Repetir con la ✕ y Aplazar, de 1 min a 12 h.', 'habf', 'Abrir'],
  ['camera', '195 ejercicios con foto', 'Los ejercicios nuevos traen foto real. Toca uno, luego Ver técnica, y Ver esquema del movimiento para la figura.', 'guide', 'Ver'],
];
/* Quien no vio la n5 la ve también */
const NEWS_N5 = [
  ['bell', 'Recordatorios en toda la pantalla', 'Ahora también los de agua: aparecen como un despertador, con ✓, ✕ y aplazar. En cada recordatorio eliges si sale en toda la pantalla o como notificación normal.', 'rem', 'Ver'],
  ['droplet', 'Agua con un toque', 'En el recordatorio de agua, ✓ suma un vaso de 250 ml, aunque la app esté cerrada.', null],
  ['shield', 'Revisa los permisos', 'En Ajustes → Recordatorios ves si falta algún permiso para que salgan en toda la pantalla, y en «Últimos avisos» qué pasó con cada uno y por qué.', 'remperm', 'Revisar'],
];
/* Quien no vio la n4 la ve también */
const NEWS_N4 = [
  ['sparkles', 'Próxima sesión: el Coach', 'En Hoy y en Mi plan eliges Plan o Coach con un toque. El Coach arma cada ejercicio con peso, reps y RIR por serie según tu historial, y te dice por qué. Tu plan no cambia.', 'ns', 'Ver en Hoy'],
  ['clipboard-list', 'Importa la recomendación de tu IA', 'Al analizar con Claude o compartir, se pide un formato fijo. Pega la respuesta en "Importar": la revisas, la editas y queda como Próxima sesión de ese día.', 'nsi', 'Importar'],
  ['bell', 'Hábitos: qué hace la ✕', 'En cada recordatorio de hábito eliges si al cerrarlo te avisa de nuevo en 30 min a 4 h, o solo una vez al día.', 'hab'],
  ['dumbbell', 'Coach por defecto', 'Si quieres que el Coach salga siempre, actívalo en Ajustes → Entreno → Próxima sesión.', 'nsset'],
];
/* Quien no vio la tanda 2 (n3) la ve también */
const NEWS_N3 = [
  ['clipboard-list', 'Rutinas: Mi plan', 'Rutinas abre tu plan activo con el día que te toca desplegado. Toca un ejercicio para cambiar series, peso o superserie; + Ejercicio y + Día a un toque.', 'rt', 'Ver mi plan'],
  ['book-open', 'Biblioteca', 'Los ejercicios ahora están en Rutinas → Biblioteca. La barra queda con 4 pestañas: Hoy, Rutinas, Progreso y Perfil.', 'guide', 'Ver Biblioteca'],
  ['user', 'Perfil completo', 'Tu cuerpo, nutrición, logros y amigos en una pantalla, con accesos arriba. El modo entrenador está en Amigos.', 'perfil'],
  ['settings', 'Ajustes en 5 grupos', 'Cuenta, Avisos y sonidos, Entreno, Sensores y Datos. Toca un grupo para abrirlo.', 'set2'],
];
const NEWS_PUB = ['target', 'Peso inicial sugerido y misiones', 'Las rutinas nuevas llegan con un peso prudente para empezar, y tienes misiones de inicio en Hoy.', null];

function newsSheet(all) {
  const seen = LS.get('newsSeen', ''), n5 = all || ['n5', NEWS_KEY].indexOf(seen) < 0, n4 = all || ['n4', 'n5', NEWS_KEY].indexOf(seen) < 0, old = all || ['n3', 'n4', 'n5', NEWS_KEY].indexOf(seen) < 0;
  const list = NEWS.concat(n5 ? NEWS_N5 : [], n4 ? NEWS_N4 : [], old ? NEWS_N3 : [], pubUser() ? [NEWS_PUB] : []);
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
  if (k === 'open') return newsSheet(true);
  if (k === 'wc') { closeSheet(); return typeof wcSheet === 'function' && wcSheet('f'); }
  if (k === 'qk') { closeSheet(); return typeof qkSheet === 'function' && qkSheet(); }
  if (k === 'fs') return nwGo('settings', null, '.fs-set');
  if (k === 'ss') return nwGo('plans', null, null, 'Toca un día para abrirlo, luego el nombre del ejercicio, y marca "Superserie con el siguiente".');
  if (k === 'guide') return nwGo('guide', null, null, 'Busca un ejercicio o filtra por músculo y equipo.');
  if (k === 'rk') return nwGo('progress', 'ejercicios', '.rk-card');
  if (k === 'al') return nwGo('settings', null, '.ha-durrow');
  if (k === 'dd') return nwGo('train', null, '.streak-card', 'Toca un día con llama en tu racha.');
  if (k === 'hoy') return nwGo('train', null, '.hoy-hero');
  if (k === 'hoy-r') return nwGo('train', null, '.hoy-ready');
  if (k === 'prog') return nwGo('progress', 'semana');
  if (k === 'set') return nwGo('settings', null, '#btn-settings', 'Ajustes se abre con ⚙ arriba a la derecha.');
  if (k === 'perfil') return nwGo('profile', 'body');
  if (k === 'rt') return nwGo('plans', null, '.rt-now');
  if (k === 'set2') return nwGo('settings', null, '.sg');
  if (k === 'ns') return nwGo('train', null, '.hoy-hero .ns-box', 'Toca Coach para ver la Próxima sesión; "Ver o editar" muestra el porqué.');
  if (k === 'nsi') { nwGo('train'); const g = document.querySelector('#btn-start'); if (g && typeof nsImportSheet === 'function') nsImportSheet(g.dataset.plan, g.dataset.day); return; }
  if (k === 'hab') return nwGo('settings', null, '.ha-set', 'Abre un recordatorio de hábito y elige "Si lo cierras con ✕".');
  if (k === 'nsset') return nwGo('settings', null, '.ns-set');
  if (k === 'rem') return nwGo('settings', null, '.ha-set', 'Los que dicen «Pantalla completa» salen como despertador. Toca Editar para cambiarlo.');
  if (k === 'sed') return nwGo('train', null, '.streak-card', 'Toca un día con llama en tu racha y luego «Editar sesión».');
  if (k === 'gymno') return nwGo('train', null, null, 'Toca tu gimnasio arriba («¿Dónde entrenas hoy?») y luego «Equipo que no hay».');
  if (k === 'aix') return nwGo('progress', 'semana', '.aix-row');
  if (k === 'myex') return nwGo('guide', null, '.my-create');
  if (k === 'habf') { closeSheet(); return typeof habManage === 'function' && habManage(); }
  if (k === 'remperm') return nwGo('settings', null, '.ha-set', 'Revisa que los permisos digan «Listo». Si alguno dice «Permitir», tócalo.');
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
