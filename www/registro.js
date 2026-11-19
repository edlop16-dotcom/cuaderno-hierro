/* ================== Entrada y registro de cuenta nueva (rama login) ==================
   Solo teléfono (el reloj no cambia). Ideas de otras apps, con textos y estilo propios de Forja.
   1. Pantalla de entrada (#ent) en una instalación nueva: 3 tarjetas, Empezar, Google, correo, Iniciar sesión, usar sin cuenta.
   2. Entrar con correo dentro de la entrada y "Trayendo tus datos" mientras sincroniza.
   3. Bienvenida por pasos con nombre: lista `rgSteps()` en vez de los 9 pasos fijos de pub.js. Usa el mismo `pb.o`,
      `pbErr`, `genPlan` y `pbFinish`. Pasos nuevos: sexo (con "Prefiero no decir"), qué te frena, peso meta,
      compromiso, plan inicial con cambiar ejercicio y "Crear mi rutina", cuenta y Health Connect.
   Nada de reseñas ni cifras inventadas, ofertas, curvas "sin la app", teléfono ni mapa de gente. */

/* Iconos Lucide (ISC) que faltaban */
Object.assign(ICONS, Object.assign({
  shuffle: '<path d="m18 14 4 4-4 4"/><path d="m18 2 4 4-4 4"/><path d="M2 18h1.973a4 4 0 0 0 3.3-1.7l5.454-8.6a4 4 0 0 1 3.3-1.7H22"/><path d="M2 6h1.972a4 4 0 0 1 3.6 2.2"/><path d="M22 18h-6.041a4 4 0 0 1-3.3-1.8l-.359-.45"/>',
  mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
  eye: '<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/>',
  'eye-off': '<path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/><path d="m2 2 20 20"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  watch: '<circle cx="12" cy="12" r="6"/><polyline points="12 10 12 12 13 13"/><path d="m16.13 7.66-.81-4.05a2 2 0 0 0-2-1.61h-2.68a2 2 0 0 0-2 1.61l-.78 4.05"/><path d="m7.88 16.36.8 4a2 2 0 0 0 2 1.61h2.72a2 2 0 0 0 2-1.61l.81-4.05"/>',
  meh: '<circle cx="12" cy="12" r="10"/><line x1="8" x2="16" y1="15" y2="15"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/>',
  'battery-low': '<rect width="16" height="10" x="2" y="7" rx="2" ry="2"/><line x1="22" x2="22" y1="11" y2="13"/><line x1="6" x2="6" y1="11" y2="13"/>',
  'shield-check': '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
  'trending-down': '<polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/>',
}, ICONS));

/* ---------- 1. Pantalla de entrada ---------- */
const en = { v: 'home', mail: '', err: '', eye: false, busy: '' };
const EN_SLIDES = [
  ['trending-up', 'Tu coach sube el peso por ti', 'Cuando completas todas las reps, Forja te dice cuánto subir la próxima vez.', '<div class="en-demo"><span>Press de banca</span><b class="num">40 kg</b>' + '<i>→</i><b class="num on">42,5 kg</b></div>'],
  ['trophy', 'Sube de rango en cada músculo', 'Tus récords suben el nivel de pecho, espalda, piernas y más. Ves en qué vas fuerte y qué te falta.', '<div class="en-demo col"><span>Pecho <b>Oro</b></span><span>Espalda <b>Plata</b></span><span>Piernas <b>Bronce</b></span></div>'],
  ['watch', 'Entrena también desde tu reloj', 'Anota tus series en el reloj; con tu cuenta, todo queda guardado y sincronizado con el celular.', '<div class="en-demo"><span>Serie 2 de 3</span><b class="num on">12 reps</b></div>'],
];
const enWant = () => !isWatch() && pubUser() && !state.settings.onb && !hasAccount() && !(pb && pb.edit);
function enRender() {
  let el = $('#ent');
  if (!el) { el = document.createElement('div'); el.id = 'ent'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); document.body.appendChild(el); }
  document.body.classList.add('onb-open');
  const g = typeof FIREBASE !== 'undefined' && FIREBASE && CAP && FIREBASE.googleClientId;
  if (en.v === 'busy') { el.innerHTML = `<div class="en-busy"><div class="pb-logo">${ic('refresh-cw', 30)}</div><h2>${esc(en.busy || 'Trayendo tus datos…')}</h2><p class="pb-sub">Tus entrenos, rutinas y ajustes están llegando desde tu cuenta.</p><div class="en-prog"><i></i></div></div>`; return; }
  if (en.v === 'mail') {
    el.innerHTML = `<div class="pb-top"><button type="button" class="icon-btn" data-en="home" aria-label="Atrás">${ic('arrow-left', 20)}</button><b class="grow">Iniciar sesión</b></div>
      <div class="pb-body"><form id="en-form" novalidate>
        <label class="pb-f"><span>Correo</span><input id="en-mail" type="email" autocomplete="email" autocapitalize="off" spellcheck="false" placeholder="tucorreo@gmail.com" value="${esc(en.mail)}"></label>
        <label class="pb-f"><span>Contraseña</span><span class="pb-in"><input id="en-pass" type="${en.eye ? 'text' : 'password'}" autocomplete="current-password" placeholder="Mínimo 6 caracteres"><button type="button" class="en-eye" data-en="eye" aria-label="${en.eye ? 'Ocultar' : 'Mostrar'} contraseña">${ic(en.eye ? 'eye-off' : 'eye', 18)}</button></span></label>
        ${en.err ? `<p class="pb-note bad" role="alert">${esc(en.err)}</p>` : ''}
        <button type="submit" class="btn primary block" style="margin-top:18px">Entrar</button>
        <button type="button" class="pb-link" data-en="forgot">¿Olvidaste tu contraseña?</button>
        ${g ? `<div class="divider"><span>o</span></div><button type="button" class="btn gbtn block" data-en="google">${G_LOGO} Continuar con Google</button>` : ''}
      </form></div>`;
    return;
  }
  el.innerHTML = `<div class="en-top">${LOGO(38)}<span class="wordmark">FORJA</span></div>
    <div class="en-slides" id="en-slides">${EN_SLIDES.map(([i, t, p, d]) => `<section class="en-slide"><div class="en-art"><span class="en-ic">${ic(i, 30)}</span>${d}</div><h1>${t}</h1><p>${p}</p></section>`).join('')}</div>
    <div class="en-dots">${EN_SLIDES.map((_, i) => `<i class="${i ? '' : 'on'}"></i>`).join('')}</div>
    <div class="en-foot">
      <button type="button" class="btn primary block" data-en="start">Empezar</button>
      ${g ? `<button type="button" class="btn gbtn block" data-en="google">${G_LOGO} Continuar con Google</button>` : ''}
      ${typeof FIREBASE !== 'undefined' && FIREBASE ? `<button type="button" class="btn block" data-en="mail">${ic('mail', 17)} Continuar con correo</button>
      <div class="en-have">¿Ya tienes cuenta? <button type="button" data-en="mail">Inicia sesión</button></div>` : ''}
      <button type="button" class="en-skip" data-en="skip">Usar sin cuenta</button>
      <div class="en-legal">Al continuar aceptas la <a href="#" data-pb="priv">Política de privacidad</a> y los <a href="#" data-pb="terms">Términos de uso</a>.</div>
    </div>`;
  const sl = $('#en-slides'); if (sl) sl.addEventListener('scroll', () => { const i = Math.round(sl.scrollLeft / Math.max(1, sl.clientWidth)); el.querySelectorAll('.en-dots i').forEach((d, j) => d.classList.toggle('on', i === j)); }, { passive: true });
}
function enClose() { const el = $('#ent'); if (el) el.remove(); if (!$('#onb')) document.body.classList.remove('onb-open'); }
/* Después de entrar desde la entrada: la bienvenida ya no hace falta */
async function enAfterLogin(fn) {
  en.v = 'busy'; en.busy = 'Trayendo tus datos…'; en.err = ''; enRender();
  try { await fn(); }
  catch (e) { if (e && e.silent) { en.v = 'home'; return enRender(); } en.v = 'mail'; en.err = (e && e.message) || 'No se pudo entrar.'; return enRender(); }
  state.settings.onb = 1; if (!state.settings.healthOk && state.settings.owner) state.settings.healthOk = 1; savePlans();
  enClose(); pbClose(); state.tab = 'train'; render();
  const n = (state.settings.prof || {}).name; toast(n ? `¡Hola de nuevo, ${n}!` : '¡Hola de nuevo! Tus datos están al día.');
}
document.addEventListener('click', ev => {
  const b = ev.target.closest && ev.target.closest('[data-en]'); if (!b) return;
  ev.preventDefault(); ev.stopPropagation();
  const a = b.dataset.en, mi = $('#en-mail'); if (mi) en.mail = mi.value.trim();
  if (a === 'home' || a === 'mail') { en.v = a; en.err = ''; return enRender(); }
  if (a === 'eye') { const pi = $('#en-pass'), v = pi ? pi.value : ''; en.eye = !en.eye; enRender(); const p2 = $('#en-pass'); if (p2) { p2.value = v; p2.focus(); } return; }
  if (a === 'start') { en.go = true; enClose(); return pbStart(0); }
  if (a === 'skip') { state.settings.onb = 1; savePlans(); enClose(); pbClose(); state.tab = 'train'; render(); toast('Listo. Puedes crear tu plan en Rutinas → Plantillas.'); if (!state.settings.healthOk) setTimeout(() => healthSheet(true), 400); return; }
  if (a === 'google') return enAfterLogin(() => account.google());
  if (a === 'forgot') { if (!/^\S+@\S+\.\S+$/.test(en.mail)) { en.err = 'Escribe tu correo arriba y vuelve a tocar.'; return enRender(); } account.reset(en.mail).then(() => toast('Te enviamos un correo para cambiar tu contraseña.')).catch(e => { en.err = e.message; enRender(); }); }
}, true);
document.addEventListener('submit', ev => {
  if (!ev.target || ev.target.id !== 'en-form') return;
  ev.preventDefault(); ev.stopPropagation();
  en.mail = $('#en-mail').value.trim(); const pass = $('#en-pass').value;
  if (!/^\S+@\S+\.\S+$/.test(en.mail)) { en.err = 'Escribe un correo válido.'; return enRender(); }
  if (pass.length < 6) { en.err = 'La contraseña tiene al menos 6 caracteres.'; return enRender(); }
  enAfterLogin(() => account.signIn(en.mail, pass, false));
}, true);
/* Mensajes más claros al entrar con correo */
Object.assign(AUTH_ERR, { INVALID_LOGIN_CREDENTIALS: 'Correo o contraseña incorrectos.', INVALID_PASSWORD: 'Esa contraseña no coincide.', EMAIL_NOT_FOUND: 'Ese correo no tiene cuenta. Toca Empezar para crear una.', TOO_MANY_ATTEMPTS_TRY_LATER: 'Demasiados intentos. Espera unos minutos.' });

/* ---------- 3. Bienvenida por pasos ---------- */
const RG_BLOCK = [['time', 'Falta de tiempo', 'clock'], ['know', 'No sé qué hacer en el gimnasio', 'book-open'], ['mot', 'Me cuesta mantener la motivación', 'battery-low'], ['pain', 'Molestias o lesiones', 'heart-pulse'], ['equip', 'Tengo poco equipo', 'dumbbell'], ['new', 'Nunca lo he intentado', 'meh']];
const rgHasHC = () => !!(typeof HCN !== 'undefined' && HCN);
function rgSteps() {
  const o = pb.o || {}, L = ['name', 'sex', 'goal'];
  if (!pb.edit) L.push('block');
  L.push('exp', 'data');
  if (o.goal === 'grasa' || o.goal === 'musculo') L.push('meta');
  L.push('days', 'equip', 'inj', 'health');
  if (!pb.edit) L.push('commit');
  L.push('plan');
  if (!pb.edit && !hasAccount() && typeof FIREBASE !== 'undefined' && FIREBASE) L.push('account');
  if (!pb.edit && rgHasHC()) L.push('hc');
  return L;
}
const rgCur = () => rgSteps()[pb.step] || 'name';
const rgU = () => (pb.o.unit === 'lb' ? 'lb' : 'kg');
const rgShow = kg => (pb.o.unit === 'lb' ? r1(kg * PB_LB) : r1(kg));
const rgFmt = v => String(v).replace('.', ',');
function rgMetaInit() {
  const o = pb.o, kg = +o.kg; if (!kg) return;
  const lo = o.goal === 'grasa' ? Math.round(kg * 0.7) : Math.round(kg), hi = o.goal === 'grasa' ? Math.round(kg * 10) / 10 : Math.round(kg * 1.25);
  if (!(+o.goalKg >= lo && +o.goalKg <= hi)) o.goalKg = Math.round(kg * (o.goal === 'grasa' ? 0.95 : 1.03) * 2) / 2;
  o.metaLo = lo; o.metaHi = hi;
}
function rgMetaCard() {
  const o = pb.o, kg = +o.kg, d = r1(+o.goalKg - kg), ad = Math.abs(d);
  if (!kg || !ad) return '<div class="rg-card"><b>Mantener tu peso</b><small>Nos enfocamos en ganar fuerza y mejorar tu forma física.</small></div>';
  const loss = d < 0, slow = kg * (loss ? 0.005 : 0.0025), fast = kg * (loss ? 0.01 : 0.005);
  const w1 = Math.max(1, Math.round(ad / fast)), w2 = Math.max(w1, Math.round(ad / slow)), pct = ad / kg;
  const tag = pct <= 0.05 ? ['Meta realista para empezar', 'ok'] : pct <= 0.12 ? ['Meta exigente: vamos paso a paso', 'mid'] : ['Meta grande: mejor por etapas', 'hi'];
  return `<div class="rg-card ${tag[1]}"><b>${tag[0]} <span class="num">${d > 0 ? '+' : '−'}${rgFmt(rgShow(ad))} ${rgU()}</span></b>
    <small>A un ritmo sano (${loss ? '0,5 a 1 %' : '0,25 a 0,5 %'} de tu peso por semana) serían unas <b>${w1 === w2 ? w1 : w1 + ' a ' + w2} semanas</b>. Es una estimación, no una promesa: cada cuerpo responde distinto.</small></div>`;
}
/* Ejercicio con alternativas: las otras opciones del mismo hueco del generador, según equipo y molestias */
function rgAlts(name, used) {
  const o = pb.o, out = [];
  Object.keys(PB_SLOTS).forEach(k => { const S = PB_SLOTS[k]; ['str', 'beg', o.equip, 'gym'].forEach(x => { const l = S[x]; if (Array.isArray(l) && l.includes(name)) l.forEach(n => { if (n !== name && !used.includes(n) && !out.includes(n) && !(o.inj || []).some(j => PB_AVOID[j] && PB_AVOID[j].test(normName(n)))) out.push(n); }); }); });
  return out;
}
function rgPlanBody() {
  const o = pb.o;
  if (!pb.plan || pb.planFor !== JSON.stringify([o.goal, o.exp, o.days, o.mins, o.equip, o.inj])) { pb.plan = genPlan(o); pb.planFor = JSON.stringify([o.goal, o.exp, o.days, o.mins, o.equip, o.inj]); }
  const plan = pb.plan, d = plan.days[0], used = d.exercises.map(e => e.name);
  return `<h2>Tu plan está listo${o.name ? ', ' + esc(o.name) : ''}</h2><p class="pb-sub">${PB_GOALS[o.goal][0]} · ${PB_EQ[o.equip][0]} · ${plan.days.length} días por semana</p>
    ${o.parq.length ? '<p class="pb-note">Respondiste que sí en el cuestionario de salud: habla con un médico antes de subir la intensidad. Mientras tanto, entrena suave y deja 3-4 reps de sobra.</p>' : ''}
    <div class="rg-first"><div class="label">Tu primer entreno · ${esc(d.name)}</div>
    ${d.exercises.map((e, i) => `<div class="rg-ex"><span class="grow"><small>${e.sets} series × ${e.repsMax && e.repsMax !== e.repsMin ? e.repsMin + '-' + e.repsMax : e.repsMin} reps</small><b>${esc(e.name)}</b></span>${rgAlts(e.name, used).length ? `<button type="button" class="icon-btn" data-rg="swap" data-i="${i}" aria-label="Cambiar ${esc(e.name)}">${ic('shuffle', 18)}</button>` : ''}</div>`).join('')}</div>
    <div class="pb-plan">${plan.days.slice(1).map(x => `<div class="pb-day"><b>${WDL[x.weekday]} · ${esc(x.name)}</b><small>${x.exercises.map(e => esc(e.name)).join(' · ')}</small></div>`).join('')}</div>
    <p class="pb-fine">La primera semana es para aprender: elige pesos con los que te sobren 2-3 reps. La app sube el peso cuando completes todas las reps.</p>
    <div class="rg-alt"><button type="button" class="btn block" data-rg="after" data-v="mine">${ic('plus', 16)} Prefiero crear mi rutina</button><button type="button" class="btn block" data-rg="after" data-v="tpl">${ic('clipboard-list', 16)} Elegir una plantilla</button></div>`;
}
function rgBody(k) {
  const o = pb.o;
  if (k === 'name') return `<div class="pb-hero"><div class="pb-logo">${ic('dumbbell', 34)}</div><h1>${pb.edit ? 'Tu plan' : 'Empecemos'}</h1>
    <p>Responde unas preguntas cortas y armamos un plan para tu objetivo, tu tiempo y tu equipo.</p></div>
    <label class="pb-f"><span>¿Cómo te llamas?</span><input id="pb-name" maxlength="24" autocomplete="given-name" placeholder="Tu nombre" value="${esc(o.name || '')}"></label>
    ${pb.edit || hasAccount() ? '' : '<button type="button" class="pb-link" data-pb="have">Ya tengo cuenta: iniciar sesión</button>'}`;
  if (k === 'sex') return `<h2>¿Cuál es tu sexo?</h2><p class="pb-sub">Lo usamos para estimar tus calorías y comparar tu fuerza con estándares de tu grupo.</p>
    <div class="pb-list">${[['m', 'Hombre'], ['f', 'Mujer'], ['x', 'Prefiero no decirlo', 'Usaremos los estándares generales. Puedes cambiarlo en Tus datos.']].map(([v, l, s]) => pbChip(o.sex === v, `data-pb="set" data-k="sex" data-v="${v}"`, l, s || '')).join('')}</div>`;
  if (k === 'block') return `<h2>¿Qué te ha frenado hasta ahora?</h2><p class="pb-sub">Elige las que quieras (o ninguna). Ajustamos el plan a eso.</p>
    <div class="pb-list">${RG_BLOCK.map(([v, l, i]) => pbChip((o.block || []).includes(v), `data-rg="block" data-v="${v}"`, l, '', i)).join('')}</div>`;
  if (k === 'meta') { rgMetaInit(); const st = o.unit === 'lb' ? 0.5 : 0.5; return `<h2>${o.goal === 'grasa' ? '¿A qué peso quieres llegar?' : '¿Hasta qué peso quieres subir?'}</h2><p class="pb-sub">Hoy pesas ${rgFmt(rgShow(+o.kg))} ${rgU()}. Desliza para elegir tu meta.</p>
    <div class="rg-big num" id="rg-meta-v">${rgFmt(rgShow(+o.goalKg))} <small>${rgU()}</small></div>
    <input type="range" class="rg-range" id="rg-meta" min="${o.metaLo}" max="${o.metaHi}" step="${st}" value="${o.goalKg}" aria-label="Peso meta">
    <div class="rg-steps"><button type="button" class="btn small" data-rg="meta" data-v="-0.5">− 0,5</button><button type="button" class="btn small" data-rg="meta" data-v="0.5">+ 0,5</button></div>
    <div id="rg-meta-card">${rgMetaCard()}</div>`; }
  if (k === 'commit') return `<h2>Tu compromiso</h2><p class="pb-sub">Opcional. Decirlo en voz alta ayuda a cumplirlo.</p>
    <div class="rg-commit ${o.commit ? 'on' : ''}"><div class="rg-cbig">Entrenaré <b>${+o.days} días</b> por semana</div><div class="muted">Sin excusas, a mi ritmo.</div>
    <button type="button" class="rg-hold ${o.commit ? 'done' : ''}" id="rg-hold" aria-label="Mantén presionado para comprometerte">${o.commit ? ic('check', 30) : ic('target', 28)}<i></i></button>
    <small class="muted">${o.commit ? '¡Hecho! Ese es tu compromiso con Forja.' : 'Mantén presionado para comprometerte'}</small></div>`;
  if (k === 'plan') return rgPlanBody();
  if (k === 'account') return `<div class="pb-hero"><div class="pb-logo">${ic('shield-check', 32)}</div><h1>Guarda tu progreso</h1>
    <p>Con una cuenta, tus entrenos se guardan en la nube, pasan a tu reloj y no se pierden si cambias de teléfono.</p></div>
    ${CAP && FIREBASE.googleClientId ? `<button type="button" class="btn gbtn block" data-rg="google">${G_LOGO} Continuar con Google</button><div class="divider"><span>o con tu correo</span></div>` : ''}
    <form id="rg-acc" novalidate><label class="pb-f"><span>Correo</span><input id="rg-mail" type="email" autocomplete="email" autocapitalize="off" spellcheck="false" placeholder="tucorreo@gmail.com" value="${esc(pb.mail || '')}"></label>
    <label class="pb-f"><span>Contraseña</span><input id="rg-pass" type="password" autocomplete="new-password" placeholder="Mínimo 6 caracteres"></label>
    ${pb.accErr ? `<p class="pb-note bad" role="alert">${esc(pb.accErr)}</p>` : ''}
    <button type="submit" class="btn primary block" style="margin-top:14px">Crear cuenta</button></form>`;
  if (k === 'hc') return `<div class="pb-hero"><div class="pb-logo">${ic('heart-pulse', 32)}</div><h1>Conecta Health Connect</h1>
    <p>Así Forja lee tus pasos, sueño y pulso para ajustar tus días de descanso. Puedes hacerlo después en Ajustes.</p></div>
    <button type="button" class="btn primary block" data-act="hc-conn">Conectar</button>`;
  /* Los demás pasos son los de pub.js: pbBody los arma con su número de paso original */
  const old = { goal: 1, exp: 2, days: 3, equip: 4, data: 5, inj: 6, health: 7 }[k], keep = pb.step;
  pb.step = old; let h = '';
  try { h = _pbBodyRg(); } finally { pb.step = keep; }
  if (k === 'data') {
    h = h.replace(/<div class="pb-lab">Sexo[\s\S]*?<\/div><div class="pb-pills">[\s\S]*?<\/div>/, '');
    const kg = +o.kg || (o.sex === 'f' ? 62 : 72), lo = o.unit === 'lb' ? 66 : 30, hi = o.unit === 'lb' ? 660 : 300;
    h += `<div class="pb-lab">O desliza tu peso</div><input type="range" class="rg-range" id="rg-kgr" min="${lo}" max="${Math.min(hi, o.unit === 'lb' ? 400 : 180)}" step="0.5" value="${o.unit === 'lb' ? r1(kg * PB_LB) : kg}" aria-label="Peso corporal">
      <p class="pb-fine">${ic('shield-check', 14)} Solo lo usa tu coach. No se comparte con nadie.</p>`;
  }
  return h;
}
const _pbBodyRg = pbBody, _pbStartRg = pbStart;
pbStart = function (step, edit) {
  _pbStartRg(step, edit);
  if (!pb.edit && !body().sex && !(pbProf() || {}).sex) pb.o.sex = null;
  pb.o.block = pb.o.block || []; pb.after = '';
  if (edit) pb.step = Math.max(0, rgSteps().indexOf('goal'));
  if (!edit && enWant() && !step && !en.go) { pbClose(); return enRender(); }
  pbRender();
};
pbOk = function () {
  const o = pb.o, k = rgCur();
  if (k === 'sex') return !!o.sex;
  if (k === 'goal') return !!o.goal;
  if (k === 'exp') return o.exp != null;
  if (k === 'health') return !!o.consent;
  if (k === 'data') return !pbErr('age') && !pbErr('cm') && !pbErr('kg');
  return true;
};
pbNextState = function () { const btn = $('#onb [data-pb="next"]'); if (!btn) return; if (rgCur() === 'data') { btn.disabled = false; btn.dataset.off = pbOk() ? 0 : 1; } else btn.disabled = !pbOk(); };
pbRender = function () {
  let el = $('#onb');
  if (!el) { el = document.createElement('div'); el.id = 'onb'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); document.body.appendChild(el); }
  document.body.classList.add('onb-open');
  const L = rgSteps(); pb.step = Math.min(pb.step, L.length - 1);
  const s = pb.step, k = L[s], n = L.length;
  const foot = k === 'plan' ? `<button type="button" class="btn primary block" data-rg="after" data-v="${pb.edit ? 'use' : 'start'}">${pb.edit ? 'Usar este plan' : 'Empezar mi primer entreno'}</button>${pb.edit ? '' : '<button type="button" class="btn block" data-rg="after" data-v="week" style="margin-top:8px">Ver el plan de la semana</button>'}`
    : k === 'account' ? '<button type="button" class="btn block" data-rg="skip">Ahora no</button>'
    : k === 'hc' ? '<button type="button" class="btn block" data-rg="skip">Saltar</button>'
    : `<button type="button" class="btn primary block" data-pb="next" ${k === 'data' ? `data-off="${pbOk() ? 0 : 1}"` : pbOk() ? '' : 'disabled'}>${s === 0 ? 'Empezar' : k === 'commit' && !pb.o.commit ? 'Saltar' : 'Continuar'}</button>`;
  el.innerHTML = `<div class="pb-top">${s ? `<button type="button" class="icon-btn" data-pb="back" aria-label="Atrás">${ic('arrow-left', 20)}</button>` : (pb.edit ? `<button type="button" class="icon-btn" data-pb="x" aria-label="Cerrar">${ic('x', 20)}</button>` : '<span></span>')}
    <div class="pb-bar"><i style="width:${Math.round((s + 1) / n * 100)}%"></i></div><small class="num">${s + 1}/${n}</small></div>
    <div class="pb-body" data-k="${k}">${rgBody(k)}</div>
    <div class="pb-foot">${foot}</div>`;
  const sc = el.querySelector('.pb-body'); if (sc) sc.scrollTop = 0;
  if (k === 'data') ['age', 'cm', 'kg'].forEach(x => pbShowErr(x));
  if (k === 'commit') rgHoldBind();
};
/* Compromiso: mantener presionado 1,2 s */
function rgHoldBind() {
  const b = $('#rg-hold'); if (!b || pb.o.commit) return;
  let t = null;
  const stop = () => { clearTimeout(t); b.classList.remove('hold'); };
  b.addEventListener('pointerdown', e => { e.preventDefault(); b.classList.add('hold'); t = setTimeout(() => { pb.o.commit = true; try { navigator.vibrate && navigator.vibrate(40); } catch (x) {} pbRender(); }, 1200); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(x => b.addEventListener(x, stop));
}
function rgNext() {
  const L = rgSteps(), k = L[pb.step];
  if (k === 'data') { if (!pbOk()) { pb.showErr = true; const bad = ['age', 'cm', 'kg'].filter(x => pbErr(x)); bad.forEach(x => pbShowErr(x, true)); const f = $('#pb-' + bad[0]); if (f) f.focus(); return; } }
  else if (!pbOk()) return;
  if (k === 'block' && (pb.o.block || []).includes('time') && !pb.minsSet) pb.o.mins = Math.min(+pb.o.mins || 60, 45);
  if (k === 'block' && (pb.o.block || []).includes('pain')) pb.painHint = true;
  if (pb.step >= L.length - 1) return rgDone();
  pb.step++; pbRender();
}
/* Termina la bienvenida y hace lo que se eligió en el plan */
function rgDone() {
  const o = pb.o, after = pb.after || 'start', plan = pb.plan, edit = pb.edit;
  pbFinish();
  const P = state.settings.prof || {};
  if (o.block && o.block.length) P.block = o.block.slice(); else delete P.block;
  if ((o.goal === 'grasa' || o.goal === 'musculo') && +o.goalKg) P.goalKg = +o.goalKg; else delete P.goalKg;
  if (o.commit) P.commit = { days: +o.days, at: Date.now() };
  state.settings.prof = P; savePlans();
  if (edit) return;
  const np = state.plans.find(p => p.id === state.settings.activePlanId);
  if (after === 'start' && np && np.days[0]) { try { startSession(np.id, np.days[0].id); } catch (e) {} }
  else if (after === 'week') { state.tab = 'plans'; render(); }
  else if (after === 'mine') { state.tab = 'plans'; render(); setTimeout(() => { try { rtNewSheet(); } catch (e) {} toast('Crea tu rutina. El plan sugerido queda en Rutinas por si lo quieres usar.'); }, 200); }
  else if (after === 'tpl') setTimeout(() => pbTemplates(), 200);
}
function rgSkipTo(after) {
  const L = rgSteps(), i = L.indexOf('plan');
  pb.after = after;
  if (pb.edit || i >= L.length - 1) return rgDone();
  pb.step = i + 1; pbRender();
}
/* En window (antes que el manejador de pub.js, que también escucha en captura sobre document) */
window.addEventListener('click', ev => {
  const hv = ev.target.closest && ev.target.closest('#onb [data-pb="have"]');
  if (hv && typeof FIREBASE !== 'undefined' && FIREBASE) { ev.preventDefault(); ev.stopImmediatePropagation(); pbClose(); en.v = 'mail'; en.err = ''; return enRender(); }
  const nb = ev.target.closest && ev.target.closest('#onb [data-pb="next"], #onb [data-pb="back"]');
  if (nb) { ev.preventDefault(); ev.stopImmediatePropagation(); if (nb.dataset.pb === 'next') rgNext(); else { pb.step = Math.max(0, pb.step - 1); pbRender(); } return; }
}, true);
document.addEventListener('click', ev => {
  const b = ev.target.closest && ev.target.closest('[data-rg]'); if (!b) return;
  ev.preventDefault(); ev.stopPropagation();
  const a = b.dataset.rg, o = pb.o;
  if (a === 'block') { const v = b.dataset.v; o.block = o.block.includes(v) ? o.block.filter(x => x !== v) : o.block.concat([v]); return pbRender(); }
  if (a === 'meta') { o.goalKg = Math.min(o.metaHi, Math.max(o.metaLo, Math.round((+o.goalKg + +b.dataset.v) * 2) / 2)); return pbRender(); }
  if (a === 'swap') {
    const d = pb.plan.days[0], e = d.exercises[+b.dataset.i], alts = rgAlts(e.name, d.exercises.map(x => x.name)); if (!alts.length) return;
    const n = alts[0]; e.name = n; e.type = pbType(n); delete e.bar;
    if ((o.equip === 'gym' || o.equip === 'basic') && BAR_DEFAULT[n] != null) e.bar = pbLb() ? 45 : BAR_DEFAULT[n];
    return pbRender();
  }
  if (a === 'after') { const v = b.dataset.v; if (v === 'use') { pb.after = 'use'; return rgDone(); } return rgSkipTo(v); }
  if (a === 'skip') { const L = rgSteps(); if (pb.step >= L.length - 1) return rgDone(); pb.step++; return pbRender(); }
  if (a === 'google') { pb.accErr = ''; account.google().then(() => rgAccOk()).catch(e => { if (e && e.silent) return; pb.accErr = e.message; pbRender(); }); }
}, true);
function rgAccOk() {
  toast('¡Cuenta creada! Tu progreso queda guardado.');
  const L = rgSteps(), i = L.indexOf('hc');   // "account" ya no está en la lista
  if (i < 0) return rgDone();
  pb.step = i; pbRender();
}
document.addEventListener('submit', ev => {
  if (!ev.target || ev.target.id !== 'rg-acc') return;
  ev.preventDefault(); ev.stopPropagation();
  const mail = $('#rg-mail').value.trim(), pass = $('#rg-pass').value; pb.mail = mail;
  if (!/^\S+@\S+\.\S+$/.test(mail)) { pb.accErr = 'Escribe un correo válido.'; return pbRender(); }
  if (pass.length < 6) { pb.accErr = 'La contraseña debe tener al menos 6 caracteres.'; return pbRender(); }
  pb.accErr = ''; const btn = ev.target.querySelector('[type="submit"]'); if (btn) { btn.disabled = true; btn.textContent = 'Creando…'; }
  account.signIn(mail, pass, true).then(() => rgAccOk()).catch(e => { pb.accErr = e.message; pbRender(); });
}, true);
document.addEventListener('input', ev => {
  const t = ev.target; if (!pb.o || !t || !t.closest || !t.closest('#onb')) return;
  if (t.id === 'rg-meta') { pb.o.goalKg = +t.value; const v = $('#rg-meta-v'), c = $('#rg-meta-card'); if (v) v.innerHTML = `${rgFmt(rgShow(+t.value))} <small>${rgU()}</small>`; if (c) c.innerHTML = rgMetaCard(); }
  if (t.id === 'rg-kgr') { const i = $('#pb-kg'); if (i) { i.value = rgFmt(t.value); i.dispatchEvent(new Event('input', { bubbles: true })); } }
  if (t.id === 'pb-kg') { const r = $('#rg-kgr'), g = pbKg(t.value, pb.o.unit); if (r && g) r.value = pb.o.unit === 'lb' ? r1(g * PB_LB) : g; }
});
document.addEventListener('click', ev => { const b = ev.target.closest && ev.target.closest('#onb [data-k="mins"]'); if (b) pb.minsSet = true; }, true);

/* Instalación nueva: entrada en vez de la bienvenida directa (pub.js ya la abrió al cargar) */
if (enWant() && $('#onb')) { pbClose(); enRender(); }
bootRender();
