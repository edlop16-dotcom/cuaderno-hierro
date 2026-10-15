/* ==========================================================================
   Nueva organización, tanda 1 (15-oct-2026)
   Una pestaña = un propósito; lo de todos los días a un toque.
   - Hoy (antes Entrenar, id interno 'train'): tu entreno con Empezar directo y
     "¿Cómo llegas hoy?" en un toque, hábitos de hoy, tu semana, un solo aviso a la vez
     ("N avisos más") y la fila "Otro entreno" (rápido, cardio, dolor muscular).
   - Progreso es pestaña propia (id 'progress'): Semana · Ejercicios · Historial.
   - Perfil: tu cuenta, tu cuerpo, logros y amigos (sin las subpestañas viejas).
   - Ajustes sale de la barra: se abre con ⚙ arriba. Ejercicios sigue en la barra hasta
     la tanda 2 (pasará a Rutinas → Biblioteca).
   - Se migra el orden guardado de la barra (settings.navOrder, `navMig2`) y los enlaces
     viejos (Perfil → Hoy / Progreso / Historial, "Ver mapa") llevan a su lugar nuevo.
   El reloj no cambia: todo esto se salta con isWatch().
   ========================================================================== */

/* ---------- Barra ---------- */
NAV_ALL.length = 0;
['train', 'plans', 'progress', 'guide', 'profile'].forEach(k => NAV_ALL.push(k));
Object.assign(NAV_NAME, { train: 'Hoy', progress: 'Progreso' });
Object.assign(NAV_ICO, { train: 'calendar-check', progress: 'trending-up' });
(function () {
  const box = document.querySelector('#nav .nav-in'); if (!box) return;
  if (!document.getElementById('nav-progress')) box.insertAdjacentHTML('beforeend', `<button data-act="tab" data-tab="progress" id="nav-progress">${ic('trending-up', 22)}Progreso</button>`);
  const t = document.getElementById('nav-train'); if (t) t.innerHTML = ic('calendar-check', 22) + 'Hoy';
  const s = document.getElementById('nav-settings'); if (s) s.hidden = true;   // Ajustes: ⚙ arriba
})();
/* Orden guardado: el de fábrica pasa al nuevo (Hoy primero); uno propio se respeta y Progreso entra antes de Perfil */
(function () {
  const S = state.settings; if (S.navMig2) return;
  const OLD = ['profile', 'train', 'plans', 'guide'];
  const old = Array.isArray(S.navOrder) ? S.navOrder.filter(k => OLD.indexOf(k) >= 0) : [];
  let o;
  if (!old.length || old.join() === OLD.join()) o = NAV_ALL.slice();
  else { o = old.slice(); const i = o.indexOf('profile'); o.splice(i < 0 ? o.length : i, 0, 'progress'); }
  S.navOrder = o; S.navMig2 = 1; savePlans();
})();
const _vSettingsN2 = vSettings;
vSettings = function () { return _vSettingsN2().replace('Restablecer (Perfil primero)', 'Restablecer (Hoy primero)'); };

/* ---------- Pestañas y enlaces viejos ---------- */
if (state.profSub === 'hoy' || state.profSub === 'progress' || state.profSub === 'history') state.profSub = 'body';
function navNorm() {
  if (isWatch()) return;
  if (state.tab === 'history') { state.tab = 'progress'; state.progSub = 'historial'; }
  if (state.tab === 'profile') {
    const s = state.profSub;
    if (s === 'hoy') state.tab = 'train';
    else if (s === 'progress') { state.tab = 'progress'; state.progSub = state.progSub || 'ejercicios'; }
    else if (s === 'history') { state.tab = 'progress'; state.progSub = 'historial'; }
    state.profSub = 'body';
  }
  if (state.tab === 'progress' && ['semana', 'ejercicios', 'historial'].indexOf(state.progSub) < 0) state.progSub = 'semana';
}
/* Antes que los demás: tocar Perfil abre Perfil; "Ver mapa" abre Progreso · Semana */
window.addEventListener('click', ev => {
  if (isWatch()) return;
  const b = ev.target.closest && ev.target.closest('[data-act="tab"],[data-act="mm-open"],[data-act="prog-sub"]'); if (!b) return;
  if (b.dataset.act === 'tab') { if (b.dataset.tab === 'profile') state.profSub = 'body'; return; }
  ev.stopPropagation(); ev.preventDefault();
  if (b.dataset.act === 'prog-sub') { state.progSub = b.dataset.sub; render(); scrollTo(0, 0); return; }
  state.tab = 'progress'; state.progSub = 'semana'; render(); scrollTo(0, 0);
  setTimeout(() => { const c = document.querySelector('.mm-card'); if (c) c.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, 80);
}, true);

/* ---------- Progreso: Semana · Ejercicios · Historial ---------- */
const PROG_SUB = [['semana', 'Semana', 'calendar-days'], ['ejercicios', 'Ejercicios', 'trending-up'], ['historial', 'Historial', 'history']];
function n2Frag(html) { const d = document.createElement('div'); d.innerHTML = html; return d; }
function n2HabCard(d) { return Array.prototype.find.call(d.querySelectorAll(':scope > .card'), c => { const h = c.querySelector('h3'); return h && /^Hábitos y agua/.test(h.textContent.trim()); }); }
function progWeek() {
  const ex = n2Frag(vProgress()), hw = n2HabCard(ex);
  const ai = `<button class="ai-fab-row" data-act="ai-open">${ic('brain', 18)}<span class="grow">Analiza tu semana con el coach IA</span>${typeof proBadge === 'function' ? proBadge() : ''}</button>`;
  return (typeof weekCard === 'function' ? weekCard() : '') + (typeof mmCard === 'function' ? mmCard() : '') + (typeof wcLinks === 'function' ? wcLinks() : '') +
    (typeof cdCard === 'function' ? cdCard() : '') + ai + (hw ? hw.outerHTML : '');
}
function progEx() {
  const d = n2Frag(vProgress()), hw = n2HabCard(d);
  if (hw) hw.remove();
  d.querySelectorAll(':scope > .mm-card').forEach(x => x.remove());   // el mapa muscular está en Semana
  return d.innerHTML;
}
function vProgreso() {
  const sub = state.progSub;
  let body = ''; header.skip = true;
  try { body = sub === 'historial' ? vHistory() : sub === 'ejercicios' ? progEx() : progWeek(); }
  finally { header.skip = false; }
  return `${header('Progreso', sub === 'semana' ? 'Cómo va tu semana' : sub === 'historial' ? 'Tus sesiones' : 'Tus ejercicios y récords')}
    <div class="seg seg3 prog-seg" role="tablist">${PROG_SUB.map(([k, l, i]) => `<button role="tab" class="${sub === k ? 'on' : ''}" aria-selected="${sub === k}" data-act="prog-sub" data-sub="${k}">${ic(i, 14)} ${l}</button>`).join('')}</div>
    ${body}`;
}

/* ---------- Perfil: cuenta, cuerpo, logros y amigos ---------- */
function perfilLayout(app) {
  app.querySelectorAll(':scope > .prof-seg, :scope > .seg.seg4').forEach(x => x.remove());
  if (!app.querySelector('.bd-badges') && typeof badgeCard === 'function') app.insertAdjacentHTML('beforeend', badgeCard());
  if (!app.querySelector('.soc-card')) app.insertAdjacentHTML('beforeend', (typeof clientsCard === 'function' ? clientsCard() : '') + (typeof socialCard === 'function' ? socialCard() : '') + (typeof trainerCard === 'function' ? trainerCard() : ''));
}

/* ---------- Hoy ---------- */
const HOY_AVISOS = ['.upd', '.pb-warn', '.tr-card', '.ret-card', '.wc-card:not(.fill)', '.stall-card', '.recap', '.safe', '.qs-card', '.mm-mini', '.nudge', '.web-hint'];
const HOY_FUERA = ['.qk-card', '.cd-card', '.sorecard', '.sore-mini:not(.mm-mini)', '.meso-strip', '.ai-fab-row', '.remind:not(.upd)', '.grp', '.coach-card'];
const HOY_READY = [[-1, 'Cansado', 'battery'], [0, 'Normal', 'check'], [1, 'Con todo', 'zap']];
const HOY_RP = { low: '1 serie menos y −10 % de peso.', mid: 'Hoy no subas peso ni vayas al fallo.', ok: 'Entrena según tu plan.', top: 'Buen día para buscar un récord.' };   // el detalle completo sigue en la vista previa
function hoyReady() {
  const r = (typeof readyToday === 'function' && readyToday()) || {}, p = typeof readyPlan === 'function' ? readyPlan() : null;
  const on = v => r.sleep === v && r.energy === v;
  return `<div class="hoy-ready"><span class="hoy-rq">¿Cómo llegas hoy?</span><div class="hoy-chips">${HOY_READY.map(([v, l, i]) => `<button type="button" class="hoy-chip ${on(v) ? 'on' : ''}" data-act="hoy-ready" data-v="${v}" aria-pressed="${on(v)}">${ic(i, 15)} ${l}</button>`).join('')}</div>
    ${p ? `<div class="hoy-rp ${p.lv}"><b>${p.t}.</b> ${HOY_RP[p.lv] || ''}</div>` : ''}</div>`;
}
function hoyAlt() {
  const n = typeof soreMap === 'function' ? Object.keys(soreMap()).length : 0;
  return `<div class="hoy-alt"><span class="label">Otro entreno</span><div class="hoy-altr">
    <button type="button" class="hoy-ab" data-qk="open">${ic('zap', 18)}<span>Entreno rápido</span></button>
    <button type="button" class="hoy-ab" data-sm="cd-new">${ic('heart-pulse', 18)}<span>Cardio</span></button>
    <button type="button" class="hoy-ab ${n ? 'on' : ''}" data-act="hoy-sore">${ic('activity', 18)}<span>${n ? `Dolor: ${n} ${n === 1 ? 'zona' : 'zonas'}` : '¿Te duele algo?'}</span></button></div></div>`;
}
function hoyLayout(app) {
  const kids = Array.prototype.slice.call(app.children), hero = app.querySelector(':scope > .hero');
  const is = (el, sels) => sels.some(s => el.matches(s));
  /* Fuera de Hoy: van a Rutinas, Progreso o a la fila "Otro entreno" */
  kids.forEach(el => {
    if (is(el, HOY_FUERA)) el.remove();
    else if (el.matches('.row') && el.querySelector('[data-tab="plans"]')) el.remove();            // "Tus rutinas" → Rutinas
    else if (el.matches('.btn.block') && !el.closest('.hero')) el.remove();                         // "Crear una rutina nueva"
  });
  /* Avisos: uno a la vez, por importancia */
  const avisos = [];
  HOY_AVISOS.forEach(s => app.querySelectorAll(':scope > ' + s).forEach(el => { if (avisos.indexOf(el) < 0) avisos.push(el); }));
  avisos.forEach(el => el.remove());
  const streak = app.querySelector(':scope > .streak-card'); if (streak) { streak.remove(); streak.classList.add('hoy-st'); }
  const fill = app.querySelector(':scope > .wc-card.fill'); if (fill) fill.remove();
  const rest = Array.prototype.filter.call(app.children, el => !el.matches('.brandbar,.pagehead,.gympill,.geo-card,.gymbar,.hero,.card.empty'));
  rest.forEach(el => el.remove());
  /* Tarjeta de hoy: Empezar arranca directo; tocar la tarjeta abre la vista previa */
  if (hero) {
    hero.classList.add('hoy-hero');
    const go = hero.querySelector('#btn-start');
    if (go) { go.dataset.go = '1'; go.insertAdjacentHTML('beforebegin', hoyReady()); go.insertAdjacentHTML('afterend', `<button type="button" class="hoy-pv" data-act="hoy-pv">${ic('list-checks', 15)} Ver ejercicios y ajustar</button>`); }
  }
  let html = (fill ? fill.outerHTML : '') + habitCard() + (streak ? streak.outerHTML : '');
  if (avisos.length) {
    const more = state.hoyMore, n = avisos.length - 1;
    html += `<div class="hoy-avisos">${avisos.map((el, i) => { if (i && !more) el.hidden = true; return el.outerHTML; }).join('')}
      ${n ? `<button type="button" class="hoy-more" data-act="hoy-more" aria-expanded="${!!more}">${more ? 'Ver menos' : `${n} ${n === 1 ? 'aviso más' : 'avisos más'}`} ${ic(more ? 'chevron-up' : 'chevron-down', 15)}</button>` : ''}</div>`;
  }
  html += hoyAlt() + rest.map(el => el.outerHTML).join('');
  const anchor = hero || app.querySelector(':scope > .card.empty') || app.querySelector(':scope > .pagehead');
  if (anchor) anchor.insertAdjacentHTML('afterend', html); else app.insertAdjacentHTML('beforeend', html);
}
/* Rutinas: el bloque del mesociclo vive con el plan */
function rutinasLayout(app) {
  if (app.querySelector('.meso-strip') || typeof mesoStrip !== 'function') return;
  const ph = app.querySelector(':scope > .pagehead'); if (ph) ph.insertAdjacentHTML('afterend', mesoStrip());
}

/* ---------- Dibujo ---------- */
const _renderN2 = render;
render = function () {
  navNorm();
  _renderN2();
  const app = $('#app'); if (!app) return;
  const w = isWatch();
  app.classList.toggle('v-hoy', !w && state.tab === 'train' && !state.draft);
  if (w) return;
  if (state.tab === 'progress') { app.innerHTML = vProgreso(); }
  else if (state.tab === 'profile') perfilLayout(app);
  else if (state.tab === 'plans') rutinasLayout(app);
  else if (state.tab === 'train' && !state.draft && !app.querySelector('#sx')) hoyLayout(app);
  const cur = state.tab === 'settings' ? '' : state.tab;
  document.querySelectorAll('#nav button').forEach(b => b.setAttribute('aria-current', b.dataset.tab === cur ? 'page' : 'false'));
};

/* ---------- Toques de Hoy ---------- */
document.addEventListener('click', ev => {
  const t = ev.target;
  const b = t.closest && t.closest('[data-act="hoy-ready"],[data-act="hoy-more"],[data-act="hoy-sore"],[data-act="hoy-pv"]');
  if (!b) {
    /* Tocar la tarjeta de hoy (fuera de sus botones) abre la vista previa */
    const hero = t.closest && t.closest('#app.v-hoy .hoy-hero');
    if (hero && !t.closest('button,a,input,select')) { const go = hero.querySelector('#btn-start'); if (go) previewSheet(go.dataset.plan, go.dataset.day); }
    return;
  }
  ev.stopPropagation(); ev.preventDefault();
  const a = b.dataset.act;
  if (a === 'hoy-more') { state.hoyMore = !state.hoyMore; render(); return; }
  if (a === 'hoy-pv') { const go = document.getElementById('btn-start'); if (go) previewSheet(go.dataset.plan, go.dataset.day); return; }
  if (a === 'hoy-sore') { openSheet(`<div class="row"><h2 class="grow">¿Te duele algún músculo?</h2><button class="icon-btn" data-act="sheet-close" aria-label="Cerrar">${ic('x', 18)}</button></div>${soreCard(false)}<button type="button" class="btn primary block" data-act="sheet-close">Listo</button>`); return; }
  if (a === 'hoy-ready') {
    const v = +b.dataset.v, r = (typeof readyToday === 'function' && readyToday()) || {};
    state.settings.ready = r.sleep === v && r.energy === v ? { d: dk(new Date()) } : Object.assign({}, r, { d: dk(new Date()), sleep: v, energy: v });
    savePlans(); render();
  }
}, true);
/* Al cerrar la hoja del dolor, la fila "Otro entreno" muestra las zonas marcadas */
const _closeSheetN2 = closeSheet;
closeSheet = function () { const sore = !!document.querySelector('#sheet #sorecard'); _closeSheetN2(); if (sore && state.tab === 'train' && !state.draft) render(); };
render();
