/* ==========================================================================
   Nueva organización, tanda 2 (15-oct-2026)
   - Barra de 4 pestañas: Hoy · Rutinas · Progreso · Perfil. Ejercicios sale de la barra
     y pasa a Rutinas → Biblioteca (sigue siendo el id interno 'guide': todos los enlaces
     viejos a Ejercicios llegan a la Biblioteca). Se migra el orden guardado (`navMig3`).
   - Rutinas · Mi plan: bloque del mesociclo, plan activo con el día que toca abierto,
     "+ Ejercicio · + Día", Equilibrio de tu semana plegado (abierto si hay aviso) y
     "Otros planes y gimnasios" plegado (plantillas, plan nuevo, gimnasios, otros planes).
   - Perfil completo: accesos arriba y secciones Tu cuerpo · Nutrición · Logros · Amigos
     (con el modo entrenador, que sale de Ajustes) y ⚙ Ajustes al final.
   - Ajustes en 5 grupos plegables: Cuenta, Avisos y sonidos, Entreno, Sensores, Datos.
     Los enlaces que llevan a una tarjeta abren su grupo (scrollIntoView).
   El reloj no cambia: todo esto se salta con isWatch().
   ========================================================================== */

/* Iconos Lucide (ISC) que faltaban */
Object.assign(ICONS, {
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /> <circle cx="9" cy="7" r="4" /> <path d="M22 21v-2a4 4 0 0 0-3-3.87" /> <path d="M16 3.13a4 4 0 0 1 0 7.75" />',
  database: '<ellipse cx="12" cy="5" rx="9" ry="3" /> <path d="M3 5V19A9 3 0 0 0 21 19V5" /> <path d="M3 12A9 3 0 0 0 21 12" />',
  utensils: '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" /> <path d="M7 2v20" /> <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />',
  'calendar-plus': '<path d="M8 2v4" /> <path d="M16 2v4" /> <path d="M21 13V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8" /> <path d="M3 10h18" /> <path d="M16 19h6" /> <path d="M19 16v6" />'
});

/* ---------- Barra: 4 pestañas ---------- */
(function () {
  const i = NAV_ALL.indexOf('guide'); if (i >= 0) NAV_ALL.splice(i, 1);
  const g = document.getElementById('nav-guide'); if (g) g.hidden = true;
  const S = state.settings; if (S.navMig3) return;
  const o = Array.isArray(S.navOrder) ? S.navOrder.filter(k => NAV_ALL.indexOf(k) >= 0) : [];
  NAV_ALL.forEach(k => { if (o.indexOf(k) < 0) o.push(k); });
  S.navOrder = o; S.navMig3 = 1; savePlans();
})();

/* ---------- Plegables: se recuerdan mientras la app está abierta ---------- */
state.n3Open = state.n3Open || {};
function n3Fold(key, open, cls, summary, inner) {
  const o = state.n3Open[key] != null ? state.n3Open[key] : open;
  return `<details class="n3f ${cls}" data-k="${key}" ${o ? 'open' : ''}><summary>${summary}${ic('chevron-down', 18)}</summary><div class="n3f-b">${inner || ''}</div></details>`;
}
document.addEventListener('toggle', ev => { const d = ev.target; if (d && d.classList && d.classList.contains('n3f')) state.n3Open[d.dataset.k] = d.open; }, true);
/* Un enlace que lleva a una tarjeta plegada abre su grupo */
(function () {
  const siv = Element.prototype.scrollIntoView;
  Element.prototype.scrollIntoView = function () {
    for (let d = this.closest ? this.closest('details.n3f') : null; d; d = d.parentElement && d.parentElement.closest('details.n3f')) {
      if (!d.open) { d.open = true; state.n3Open[d.dataset.k] = true; }
    }
    return siv.apply(this, arguments);
  };
})();
function n3Move(box, els) { els.forEach(el => { if (el) box.appendChild(el); }); }

/* ---------- Rutinas: Mi plan · Biblioteca ---------- */
function rtSeg(cur) {
  return `<div class="seg rt-seg" role="tablist">${[['plans', 'Mi plan', 'calendar-days'], ['guide', 'Biblioteca', 'book-open']].map(([k, l, i]) =>
    `<button role="tab" class="${cur === k ? 'on' : ''}" aria-selected="${cur === k}" data-act="tab" data-tab="${k}">${ic(i, 14)} ${l}</button>`).join('')}</div>`;
}
function rtTodayDay() { const p = activePlan(); return p ? { p, d: nextDay(p) } : null; }
function miPlanLayout(app) {
  if (app.querySelector('.rt-seg')) return;
  const ph = app.querySelector(':scope > .pagehead'); if (!ph) return;
  const kid = s => app.querySelector(':scope > ' + s);
  const act = activePlan(), t = rtTodayDay();
  const cards = Array.prototype.slice.call(app.querySelectorAll(':scope > .rt-plan'));
  const actCard = act ? cards.find(c => c.querySelector(`[data-act="edit-plan"][data-plan="${act.id}"]`)) : null;
  const bal = kid('.rt-bal'), leg = kid('.rt-leg'), tpl = kid('.pb-tplbar'), gym = kid('.gymbar'), meso = kid('.meso-strip'), empty = kid('.card.empty'), more = kid('.rt-more');
  const newRow = Array.prototype.find.call(app.querySelectorAll(':scope > .grid2'), x => x.querySelector('[data-act="rt-new"]'));
  if (newRow) { const fx = newRow.querySelector('[data-act="rt-from-ex"]'); if (fx) fx.innerHTML = `${ic('book-open', 16)} Desde la Biblioteca`; }
  /* El día que toca: abierto y marcado */
  if (actCard && t && t.d) {
    const h = actCard.querySelector(`.rt-head[data-day="${t.d.id}"]`);
    if (h) { h.closest('.rt-day').classList.add('rt-now'); const b = h.querySelector('b'); if (b) b.insertAdjacentHTML('beforebegin', '<span class="rt-tag-now">Te toca</span>'); }
  }
  const quick = actCard && t && t.d ? `<div class="rt-quick"><button type="button" class="btn" data-act="rt-add" data-plan="${t.p.id}" data-day="${t.d.id}">${ic('plus', 16)} Ejercicio</button><button type="button" class="btn" data-act="rt-new">${ic('calendar-plus', 16)} Día</button></div>` : '';
  const balSum = bal ? `<span class="n3f-i ${bal.classList.contains('warn') ? 'warn' : 'ok'}">${ic('activity', 17)}</span><span class="grow"><b>Equilibrio de tu semana</b><small>${bal.classList.contains('warn') ? 'Hay algo para revisar' : 'Bien equilibrado'}</small></span>` : '';
  const others = cards.filter(c => c !== actCard);
  const moreSum = `<span class="n3f-i">${ic('layers', 17)}</span><span class="grow"><b>Otros planes y gimnasios</b><small>${[others.length ? `${others.length} ${others.length === 1 ? 'plan más' : 'planes más'}` : '', 'plantillas', 'plan nuevo', state.gyms.length > 1 ? `${state.gyms.length} gimnasios` : 'gimnasios'].filter(Boolean).join(' · ')}</small></span>`;
  ph.insertAdjacentHTML('afterend', rtSeg('plans') + quick + (bal ? n3Fold('rt-bal', bal.classList.contains('warn'), 'rt-balf', balSum) : '') + n3Fold('rt-more', !actCard, 'rt-moref', moreSum));
  const seg = app.querySelector(':scope > .rt-seg'), qk = app.querySelector(':scope > .rt-quick');
  /* Orden: pestañas → bloque → plan activo (o vacío) → + Ejercicio · + Día → plegables */
  const after = (ref, el) => { if (el && ref) ref.insertAdjacentElement('afterend', el); return el || ref; };
  let ref = after(seg, meso);
  /* + Nueva rutina: el mismo flujo que la Biblioteca (rt-from-ex → elegir ejercicios → rtSheet → saveRoutine vuelve aquí).
     Va al final de los días del plan activo; sin plan activo, arriba */
  const nb = `<button type="button" class="btn block rt-newr" data-act="rt-from-ex">${ic('plus', 18)} Nueva rutina</button>`;
  if (!actCard) { ref.insertAdjacentHTML('afterend', nb); ref = ref.nextElementSibling; }
  ref = after(ref, actCard || empty);
  if (actCard) { const days = actCard.querySelector('.rt-days'); if (days) days.insertAdjacentHTML('afterend', nb); else actCard.insertAdjacentHTML('beforeend', nb); }
  if (actCard && leg) actCard.appendChild(leg);
  if (qk) after(ref, qk);
  const fb = app.querySelector('details.rt-balf > .n3f-b'); if (fb) fb.appendChild(bal);
  const mb = app.querySelector('details.rt-moref > .n3f-b');
  n3Move(mb, [gym, newRow, tpl].concat(others));
  if (!actCard && leg) mb.appendChild(leg);
  if (more) { const o = more.querySelector('.rt-opts'); if (o) mb.appendChild(o); more.remove(); }
}
function bibliotecaLayout(app) {
  if (app.querySelector('.rt-seg')) return;
  const ph = app.querySelector(':scope > .pagehead'); if (!ph) return;
  const h = ph.querySelector('h1'), l = ph.querySelector('.label');
  if (h) h.textContent = 'Rutinas'; if (l) l.textContent = `Biblioteca · ${LIB.length} ejercicios`;
  ph.insertAdjacentHTML('afterend', rtSeg('guide'));
  const pl = app.querySelector('[data-act="ex-g"][data-v="plan"]'); if (pl) pl.textContent = 'En mi plan';
}

/* ---------- Perfil completo ---------- */
const PF_SECS = [['cuerpo', 'Tu cuerpo', 'activity'], ['nutri', 'Nutrición', 'utensils'], ['logros', 'Logros', 'trophy'], ['amigos', 'Amigos', 'users']];
function perfilLayout2(app) {
  if (app.querySelector('.pf-jump')) return;
  const pc = app.querySelector(':scope > .pcard'); if (!pc) return;
  const all = Array.prototype.slice.call(app.children), title = el => { const h = el.querySelector('h3'); return h ? h.textContent.trim() : ''; };
  const body = all.filter(el => el.matches('.bd-card:not(.nu-card):not(.plate-card)'));
  const photos = body.find(el => el.id === 'bd-photos' || /^Fotos de progreso/.test(title(el)));
  const meds = body.find(el => /^Medidas/.test(title(el)));
  if (photos && meds) { body.splice(body.indexOf(photos), 1); body.splice(body.indexOf(meds) + 1, 0, photos); }   // fotos junto a las medidas
  const nutri = all.filter(el => el.matches('.nu-card, .plate-card'));
  const logros = all.filter(el => el.matches('.bd-badges'));
  if (!app.querySelector('.coachmode-card') && typeof coachModeCard === 'function') app.insertAdjacentHTML('beforeend', coachModeCard());
  const amigos = Array.prototype.filter.call(app.children, el => el.matches('.cl-card, .soc-card, .tr-card, .coachmode-card'));
  const used = [pc].concat(body, nutri, logros, amigos);
  const rest = Array.prototype.filter.call(app.children, el => used.indexOf(el) < 0 && !el.matches('.brandbar, .pagehead'));
  const groups = { cuerpo: body, nutri, logros, amigos };
  const secs = PF_SECS.filter(([k]) => groups[k].length);
  pc.insertAdjacentHTML('afterend', `<div class="pf-jump" role="navigation" aria-label="Ir a">${secs.map(([k, l, i]) => `<button type="button" data-act="pf-go" data-s="${k}">${ic(i, 15)} ${l}</button>`).join('')}</div>`);
  secs.forEach(([k, l, i]) => {
    app.insertAdjacentHTML('beforeend', `<h2 class="pf-sec" id="pf-${k}">${ic(i, 18)} ${l}</h2>`);
    n3Move(app, groups[k]);
  });
  n3Move(app, rest);
  app.insertAdjacentHTML('beforeend', `<button type="button" class="card pf-set" data-act="tab" data-tab="settings">${ic('settings', 18)}<span class="grow"><b>Ajustes</b><small>Cuenta, avisos y sonidos, entreno, sensores y datos</small></span>${ic('chevron-right', 18)}</button>`);
}
document.addEventListener('click', ev => {
  const b = ev.target.closest && ev.target.closest('[data-act="pf-go"]'); if (!b) return;
  ev.stopPropagation(); ev.preventDefault();
  const s = document.getElementById('pf-' + b.dataset.s); if (s) s.scrollIntoView({ block: 'start', behavior: 'smooth' });
}, true);

/* ---------- Ajustes en 5 grupos plegables ---------- */
const SET_GRP = [
  ['cuenta', 'Cuenta', 'user', 'Iniciar sesión, vincular reloj, objetivo y plan, kg/lb, Forja Pro', ['Tu cuenta', '.pb-card', '.pro-card']],
  ['avisos', 'Avisos y sonidos', 'bell', 'Recordatorios, ding dong, fin del descanso, música', ['.remind', 'Recordatorios', 'Fin del descanso', '.fs-set']],
  ['entreno', 'Entreno', 'dumbbell', 'Coach semanal, pantalla, figura animada, orden de la barra', ['.wc-set', 'Pantalla', '.no-card']],
  ['sensores', 'Sensores', 'heart-pulse', 'Sueño, pulso y pasos, Samsung Health', ['.ps-card', '.bs-card', '.hc-card']],
  ['datos', 'Datos', 'database', 'Importar, respaldo, novedades, actualizaciones, privacidad', ['Importar historial', 'Respaldo', '.nw-set', 'Actualizaciones', '.err-card', '.priv-card']],
];
function setGroupOf(el) {
  const h = el.querySelector(':scope > h3, :scope > .row > h3'), t = h ? h.textContent.trim() : '';
  for (let g = 0; g < SET_GRP.length; g++) if (SET_GRP[g][4].some(k => k[0] === '.' ? el.matches(k) : t.indexOf(k) === 0)) return SET_GRP[g][0];
  return 'datos';   // una tarjeta que no conocemos no se pierde: va a Datos
}
function hasAccount() { return typeof fb !== 'undefined' && !!(fb.auth && fb.auth.acc); }
function settingsGroups(app) {
  if (app.querySelector('.sg')) return;
  const ph = app.querySelector(':scope > .pagehead'); if (!ph) return;
  const items = Array.prototype.filter.call(app.children, el => !el.matches('.brandbar, .pagehead') && !(el.classList.contains('muted') && !el.classList.contains('card')));
  items.forEach(el => { if (el.matches('.coachmode-card')) el.remove(); });   // el modo entrenador vive en Perfil → Amigos
  const by = {}; items.forEach(el => { if (!el.parentNode) return; const g = setGroupOf(el); (by[g] = by[g] || []).push(el); });
  ph.insertAdjacentHTML('afterend', SET_GRP.filter(g => by[g[0]]).map(([k, l, i, sub]) =>
    n3Fold('sg-' + k, k === 'cuenta' && !hasAccount(), 'sg', `<span class="n3f-i">${ic(i, 18)}</span><span class="grow"><b>${l}</b><small>${sub}</small></span>`)).join(''));
  SET_GRP.forEach(([k]) => { const box = app.querySelector(`details[data-k="sg-${k}"] > .n3f-b`); if (box) n3Move(box, by[k]); });
}

/* ---------- Dibujo ---------- */
/* Día recién creado (p. ej. "+ Nueva rutina" o la Biblioteca, que lo guardan en "Mis rutinas"): se abre y se muestra;
   si no es del plan activo, también se abre "Otros planes" */
function n3DayIds() { const s = {}; state.plans.forEach(p => p.days.forEach(d => { s[d.id] = p.id; })); return s; }
const _renderN3 = render;
render = function () {
  const w = isWatch(), ids = n3DayIds(), prev = state.n3Days; state.n3Days = ids;
  let fresh = null;
  if (!w && state.tab === 'plans') {
    const t = rtTodayDay(); if (t && t.d && state.rtOpen[t.d.id] == null) state.rtOpen[t.d.id] = true;
    const act = activePlan();
    if (prev) for (const k in ids) if (!prev[k]) fresh = k;
    if (fresh) { state.rtOpen[fresh] = true; if (!act || ids[fresh] !== act.id) state.n3Open['rt-more'] = true; }
  }
  _renderN3();
  const app = $('#app'); if (!app || w || state.draft && app.querySelector('#sx')) return;
  if (fresh) setTimeout(() => { const h = document.querySelector(`.rt-head[data-day="${fresh}"]`); if (h) h.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, 150);
  if (state.tab === 'plans') miPlanLayout(app);
  else if (state.tab === 'guide') bibliotecaLayout(app);
  else if (state.tab === 'profile') perfilLayout2(app);
  else if (state.tab === 'settings') settingsGroups(app);
  const cur = state.tab === 'guide' ? 'plans' : state.tab === 'settings' ? '' : state.tab;
  document.querySelectorAll('#nav button').forEach(b => b.setAttribute('aria-current', b.dataset.tab === cur ? 'page' : 'false'));
};
render();
