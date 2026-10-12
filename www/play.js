/* ==========================================================================
   Importar desde Strong + requisitos de Google Play
   - Importador único: detecta si el CSV es de Hevy o de Strong.
   - Aviso de salud (una vez) y en Ajustes.
   - Política de privacidad dentro de la app.
   - Borrar los datos del teléfono y eliminar la cuenta (con sus datos en la nube).
   ========================================================================== */
const STRONG_MAP = {
  'bench press (barbell)': 'Press Banca Plano (Barra)', 'incline bench press (barbell)': 'Press Banca Inclinado (Barra)',
  'bench press (dumbbell)': 'Press Banca con Mancuernas', 'incline bench press (dumbbell)': 'Press Inclinado con Mancuernas',
  'squat (barbell)': 'Sentadilla con Barra', 'leg press': 'Prensa 45°', 'leg press (machine)': 'Prensa 45°', 'hack squat': 'Sentadilla Hack', 'hack squat (machine)': 'Sentadilla Hack',
  'leg extension (machine)': 'Extensión de Pierna', 'seated leg curl (machine)': 'Curl Femoral Sentado', 'lying leg curl (machine)': 'Curl Femoral Tumbado',
  'hip thrust (barbell)': 'Hip Thrust', 'deadlift (barbell)': 'Peso Muerto Convencional', 'romanian deadlift (barbell)': 'Peso Muerto Rumano',
  'overhead press (barbell)': 'Press Militar con Barra', 'bent over row (barbell)': 'Remo con Barra', 't bar row': 'Remo en T', 't-bar row': 'Remo en T',
  'seated row (cable)': 'Remo Sentado con Cable', 'lat pulldown (cable)': 'Jalón al Pecho', 'pull up': 'Dominadas', 'chin up': 'Dominadas',
  'bicep curl (barbell)': 'Curl con Barra', 'bicep curl (dumbbell)': 'Curl Bíceps', 'hammer curl (dumbbell)': 'Curl Martillo', 'preacher curl (barbell)': 'Curl Predicador (Scott)',
  'skullcrusher (barbell)': 'Press Francés', 'triceps pushdown (cable - straight bar)': 'Tríceps Polea', 'triceps extension (cable)': 'Tríceps Polea', 'triceps rope pushdown': 'Tríceps con Cuerda',
  'lateral raise (dumbbell)': 'Elevaciones Laterales', 'chest fly (dumbbell)': 'Aperturas con Mancuernas', 'cable crossover': 'Cruce de Poleas', 'pec deck (machine)': 'Pec Deck (Contractora)',
  'chest press (machine)': 'Press de Pecho en Máquina', 'calf raise (machine)': 'Elevación de Talones de Pie', 'standing calf raise (machine)': 'Elevación de Talones de Pie',
  'seated calf raise (machine)': 'Elevación de Talones Sentado', 'crunch': 'Crunch Abdominal', 'plank': 'Plancha', 'face pull (cable)': 'Face Pull', 'face pull': 'Face Pull',
  'shrug (dumbbell)': 'Encogimientos (Trapecio)', 'hip abductor (machine)': 'Abducción de Cadera', 'hip adductor (machine)': 'Aducción de Cadera',
  'lunge (dumbbell)': 'Zancadas', 'bulgarian split squat': 'Sentadilla Búlgara', 'goblet squat (kettlebell)': 'Sentadilla Goblet', 'goblet squat (dumbbell)': 'Sentadilla Goblet',
  'dip': 'Fondos en Paralelas', 'push up': 'Flexiones', 'arnold press (dumbbell)': 'Press Arnold', 'shoulder press (dumbbell)': 'Press Militar (Mancuernas)',
};
const mapStrong = n => STRONG_MAP[normName(n).trim()] || mapExName(n);
function parseDur(s) {
  s = String(s || '').trim(); if (/^\d+$/.test(s)) return +s;
  const h = (s.match(/(\d+)\s*h/) || [])[1] || 0, m = (s.match(/(\d+)\s*m(?!s)/) || [])[1] || 0, sc = (s.match(/(\d+)\s*s/) || [])[1] || 0;
  return (+h) * 3600 + (+m) * 60 + (+sc);
}
function isStrong(text) { const l = text.split(/\r?\n/)[0] || ''; return /exercise name/i.test(l) && /set order/i.test(l); }
function strongSessions(text, gymFor, lb) {
  const first = text.split(/\r?\n/)[0], delim = (first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ';' : ',';
  const rows = parseCSV(text, delim); if (!rows.length) return [];
  const H = rows[0].map(h => normName(h).trim()), col = n => H.indexOf(n);
  const ci = { d: col('date'), wn: col('workout name'), du: col('duration'), ex: col('exercise name'), so: col('set order'), w: col('weight'), r: col('reps'), n: col('notes'), u: col('weight unit') };
  if (ci.d < 0 || ci.ex < 0 || ci.w < 0 || ci.r < 0) throw new Error('No reconozco el archivo de Strong.');
  const by = new Map(), k = lb ? 0.4536 : 1;
  rows.slice(1).forEach(r => {
    const st = new Date(String(r[ci.d]).trim().replace(' ', 'T')); if (isNaN(st)) return;
    const key = st.toISOString();
    if (!by.has(key)) {
      const title = r[ci.wn] || 'Entrenamiento', g = gymFor(st);
      by.set(key, { id: 'strong-' + key, date: key, planId: 'strong', planName: 'Strong', dayId: 'strong-' + normName(title).replace(/\W+/g, '-'), dayName: title,
        gymId: g, gymName: gymName(g), kind: 'fuerza', durationSec: Math.max(60, parseDur(r[ci.du]) || 3600), source: 'Strong', exercises: [] });
    }
    const s = by.get(key), name = mapStrong(r[ci.ex] || ''), so = String(r[ci.so] || '').trim().toUpperCase();
    if (!name || so === 'W') return;
    const unitK = ci.u >= 0 ? (/lb/i.test(r[ci.u]) ? 0.4536 : 1) : k;
    const bar = BAR_DEFAULT[name] || 0, raw = Math.round((parseFloat(String(r[ci.w]).replace(',', '.')) || 0) * unitK * 4) / 4;
    const w = bar && raw >= bar ? raw - bar : raw, reps = parseInt(r[ci.r], 10) || 0; if (!reps) return;
    let e = s.exercises.find(x => x.name === name);
    if (!e) { e = { name, type: typeOf(name), sets: [] }; const nt = ci.n >= 0 ? String(r[ci.n] || '').trim() : ''; if (nt) e.note = nt.slice(0, 280); s.exercises.push(e); }
    if (so === 'D' && e.sets.length) { const l = e.sets[e.sets.length - 1]; (l.drops = l.drops || []).push({ w, r: reps }); }
    else e.sets.push({ w, r: reps });
  });
  return Array.from(by.values()).filter(s => s.exercises.length);
}
/* Hoja de importación única (Hevy o Strong) */
importHevySheet = function () {
  openSheet(`<div class="row"><h2 class="grow">Importar historial</h2><button class="icon-btn" data-act="sheet-close" aria-label="Cerrar">${ic('x', 18)}</button></div>
    <div class="imp-apps"><div><b>Hevy</b><small>Perfil → ⚙️ Configuración → Exportar e importar datos → Exportar entrenamientos</small></div>
      <div><b>Strong</b><small>Perfil → ⚙️ Ajustes → Exportar datos de Strong (archivo .csv)</small></div>
      <div><b>Symmetry</b><small>No permite exportar: mándale capturas a Claude y las agrega.</small></div></div>
    <div class="field"><span class="label">¿En qué gimnasio hiciste esos entrenamientos?</span><div class="gymbar">${state.gyms.map(g => `<label class="gchip ${g.id === activeGym().id ? 'on' : ''}"><input type="radio" name="imp-gym" value="${g.id}" ${g.id === activeGym().id ? 'checked' : ''} hidden>${esc(g.name)}</label>`).join('')}</div></div>
    <label class="sw-keep"><input type="checkbox" id="imp-lb"> Mis pesos de Strong están en libras (lb)</label>
    <label class="btn primary block" style="text-align:center">${ic('download', 16)} Elegir archivo .csv<input type="file" id="imp-file2" accept=".csv,text/csv,text/plain" hidden></label>
    <div id="imp-res" class="muted" style="font-size:13px">La app reconoce sola si el archivo es de Hevy o de Strong. Si un entrenamiento ya existe, no se duplica. De Strong, en los ejercicios con barra se resta la barra (Forja anota solo los discos).</div>`);
};
document.addEventListener('click', ev => { const l = ev.target.closest('.gymbar label.gchip'); if (!l || !l.querySelector('input[name="imp-gym"]')) return; l.parentNode.querySelectorAll('.gchip').forEach(x => x.classList.toggle('on', x === l)); }, true);
document.addEventListener('change', ev => {
  if (ev.target.id !== 'imp-file2') return;
  const f = ev.target.files && ev.target.files[0]; if (!f) return;
  const gid = (document.querySelector('input[name="imp-gym"]:checked') || {}).value || activeGym().id, lb = !!(document.getElementById('imp-lb') || {}).checked;
  const rd = new FileReader();
  rd.onload = () => {
    const out = document.getElementById('imp-res');
    try {
      const t = String(rd.result), strong = isStrong(t);
      const list = strong ? strongSessions(t, () => gid, lb) : hevySessions(t, () => gid);
      if (!list.length) throw new Error('El archivo no tiene entrenamientos que pueda leer.');
      const r = importSessions(list);
      if (typeof learnWeights === 'function') list.slice().sort((a, b) => a.date.localeCompare(b.date)).forEach(s => { const x = state.sessions.find(y => y.id === s.id); if (x) learnWeights(x); });
      out.innerHTML = `<b style="color:var(--ok)">Listo (${strong ? 'Strong' : 'Hevy'}):</b> ${list.length} entrenamientos leídos · ${r.add} nuevos · ${r.upd} actualizados.`;
      render();
    } catch (e) { out.textContent = e.message; }
  };
  rd.readAsText(f);
});

/* ---------- Aviso de salud ---------- */
const HEALTH_TXT = `<p><b>Forja no es un servicio médico.</b> Las rutinas, pesos sugeridos, estimaciones de grasa, calorías, proteína y niveles son orientativos y se calculan con fórmulas generales.</p>
  <p>Antes de empezar un programa de ejercicio o cambiar tu alimentación, sobre todo si tienes alguna lesión, condición médica, estás embarazada o tomas medicamentos, <b>consulta a un médico o profesional de la salud</b>.</p>
  <p>Detén el ejercicio si sientes dolor en el pecho, mareo, falta de aire anormal o dolor en una articulación. Usa siempre una técnica correcta y, si puedes, entrena con supervisión.</p>`;
function healthSheet(first) {
  openSheet(`<div class="row"><h2 class="grow" style="display:flex;align-items:center;gap:8px">${ic('heart-pulse', 20)} Aviso de salud</h2>${first ? '' : `<button class="icon-btn" data-act="sheet-close" aria-label="Cerrar">${ic('x', 18)}</button>`}</div>
    <div class="legal">${HEALTH_TXT}</div>
    <button class="btn primary block" data-act="health-ok">Entendido</button>`);
}

/* ---------- Política de privacidad ---------- */
const PRIVACY_CONTACT = '';
const PRIVACY_TXT = `<p class="muted">Última actualización: 11 de octubre de 2026</p>
  <h4>Qué datos guarda Forja</h4>
  <ul><li><b>Entrenamientos:</b> ejercicios, series, pesos, repeticiones, notas, rutinas y gimnasios.</li>
  <li><b>Hábitos y nutrición:</b> agua, suplementos que marcas y gramos de proteína.</li>
  <li><b>Cuerpo:</b> peso, medidas y datos que escribes (estatura, muñeca, tobillo).</li>
  <li><b>Fotos de progreso:</b> se guardan <b>solo en tu teléfono</b>. Nunca se suben a internet.</li>
  <li><b>Cuenta (opcional):</b> tu correo electrónico y un identificador de usuario.</li></ul>
  <h4>Dónde se guardan</h4>
  <p>Sin cuenta, todo queda solo en tu teléfono. Si creas una cuenta, tus datos (excepto las fotos) se guardan cifrados en tránsito en Google Firebase (Firestore y Firebase Authentication) para sincronizar tu celular y tu reloj.</p>
  <h4>Para qué se usan</h4>
  <p>Solo para que la app funcione: mostrar tu historial, calcular sugerencias y sincronizar tus dispositivos. <b>No vendemos tus datos, no mostramos publicidad y no usamos analítica de terceros.</b> No compartimos tus datos con nadie.</p>
  <h4>Tus derechos</h4>
  <p>Puedes exportar un respaldo, borrar los datos del teléfono o <b>eliminar tu cuenta y todos sus datos en la nube</b> desde Perfil → Ajustes → Privacidad y datos. La eliminación es inmediata y no se puede deshacer.</p>
  <h4>Menores de edad</h4><p>Forja no está dirigida a menores de 13 años.</p>
  <h4>Contacto</h4><p>${PRIVACY_CONTACT ? esc(PRIVACY_CONTACT) : 'Escríbenos desde la ficha de la app en Google Play.'}</p>`;
function privacySheet() {
  openSheet(`<div class="row"><h2 class="grow">Política de privacidad</h2><button class="icon-btn" data-act="sheet-close" aria-label="Cerrar">${ic('x', 18)}</button></div><div class="legal">${PRIVACY_TXT}</div>`);
}

/* ---------- Borrar datos / eliminar cuenta ---------- */
function wipeLocal() {
  try { Object.keys(localStorage).filter(k => k.indexOf('cdh.') === 0).forEach(k => localStorage.removeItem(k)); } catch (e) {}
  try { if (window.indexedDB) indexedDB.deleteDatabase('forja-fotos'); } catch (e) {}
}
function delSheet(kind) {
  const a = typeof fb !== 'undefined' && fb.auth, acc = kind === 'acc';
  openSheet(`<div class="row"><h2 class="grow">${acc ? 'Eliminar mi cuenta' : 'Borrar datos de este teléfono'}</h2><button class="icon-btn" data-act="sheet-close" aria-label="Cerrar">${ic('x', 18)}</button></div>
    <div class="safe stop">${ic('shield', 16)}<span>${acc ? `Se eliminarán <b>tu cuenta (${esc(a && a.email || '')}) y todos tus datos en la nube</b>: entrenamientos, rutinas, hábitos y medidas. Tus relojes vinculados dejarán de sincronizar. <b>No se puede deshacer.</b>` : `Se borrarán de este teléfono tus entrenamientos, rutinas, hábitos, medidas y fotos.${a && a.acc ? ' Tu cuenta y tus datos en la nube <b>no</b> se borran: al volver a entrar se recuperan.' : ' Como no tienes cuenta, <b>se perderán para siempre</b>.'}`}</span></div>
    ${acc ? `<label class="sw-keep"><input type="checkbox" id="del-local" checked> Borrar también los datos de este teléfono</label>
      <div class="field"><span class="label">Por seguridad, confirma tu identidad</span>
      <input type="password" id="del-pass" placeholder="Tu contraseña (si entras con correo)" autocomplete="current-password">
      <small class="muted">Si entras con Google, deja la contraseña vacía: te pediremos elegir tu cuenta de Google.</small></div>` : ''}
    <div class="field"><span class="label">Escribe <b>BORRAR</b> para confirmar</span><input id="del-conf" autocomplete="off" autocapitalize="characters"></div>
    <button class="btn danger block" data-act="${acc ? 'del-acc-go' : 'del-local-go'}">${acc ? 'Eliminar cuenta y datos' : 'Borrar datos del teléfono'}</button>
    <div id="del-msg" class="muted" style="font-size:12.5px"></div>`);
}
async function deleteAccount() {
  const msg = document.getElementById('del-msg'), say = t => { if (msg) msg.innerHTML = t; };
  const a = fb.auth; if (!a || !a.acc || a.watch) { say('Esta opción se usa desde el celular con tu cuenta.'); return; }
  const pass = (document.getElementById('del-pass') || {}).value || '', local = !!(document.getElementById('del-local') || {}).checked;
  try {
    say('Confirmando tu identidad…');
    if (pass) { const j = await fb.idt('signInWithPassword', { email: a.email, password: pass, returnSecureToken: true }); fb.setSession(j); }
    else if (typeof CAP !== 'undefined' && CAP && CAP.SocialLogin) {
      if (!account.glReady) { await CAP.SocialLogin.initialize({ google: { webClientId: FIREBASE.googleClientId } }); account.glReady = true; }
      const res = await CAP.SocialLogin.login({ provider: 'google', options: {} }), idt = res && res.result && res.result.idToken;
      if (!idt) throw new Error('Google no devolvió la sesión.');
      const j = await fb.idt('signInWithIdp', { postBody: 'id_token=' + encodeURIComponent(idt) + '&providerId=google.com', requestUri: 'http://localhost', returnSecureToken: true });
      if ((j.localId || '') !== a.uid) throw new Error('Esa cuenta de Google no es la de esta sesión.');
      fb.setSession(j);
    } else throw new Error('Escribe tu contraseña para confirmar.');
    say('Borrando tus datos en la nube…');
    const acc = a.acc;
    try { await fb.fs('DELETE', 'accounts/' + acc); }
    catch (e) { await fb.fs('PATCH', 'accounts/' + acc, 'updateMask.fieldPaths=data&updateMask.fieldPaths=members&updateMask.fieldPaths=at', { fields: { data: fb.str('{}'), members: fb.arr([]), at: { integerValue: String(Date.now()) } } }); }
    say('Eliminando tu cuenta…');
    await fb.idt('delete', { idToken: await fb.token() });
    account.logout();
    if (local) { wipeLocal(); toast('Cuenta y datos eliminados'); setTimeout(() => location.reload(), 900); }
    else { closeSheet(); render(); toast('Cuenta eliminada. Tus datos siguen en este teléfono.'); }
  } catch (e) {
    if (e && e.silent) { say(''); return; }
    say(`<span style="color:var(--bad)">${esc(e.code === 'CREDENTIAL_TOO_OLD_LOGIN_AGAIN' ? 'Por seguridad, cierra sesión, vuelve a entrar y repite.' : (e.message || 'No se pudo eliminar.'))}</span>`);
  }
}

/* ---------- Ajustes: Privacidad y datos ---------- */
const _vSettingsPlay = vSettings;
vSettings = function () {
  const h = _vSettingsPlay(), a = typeof fb !== 'undefined' && fb.auth;
  const card = `<div class="card priv-card"><h3 style="display:flex;align-items:center;gap:8px">${ic('lock', 17)} Privacidad y datos</h3>
    <button class="set-row" data-act="priv-open">${ic('shield', 16)}<span class="grow">Política de privacidad</span>${ic('chevron-right', 16)}</button>
    <button class="set-row" data-act="health-open">${ic('heart-pulse', 16)}<span class="grow">Aviso de salud</span>${ic('chevron-right', 16)}</button>
    <button class="set-row" data-act="del-local">${ic('trash-2', 16)}<span class="grow">Borrar datos de este teléfono</span>${ic('chevron-right', 16)}</button>
    ${a && a.acc && !a.watch ? `<button class="set-row bad" data-act="del-acc">${ic('trash-2', 16)}<span class="grow">Eliminar mi cuenta y mis datos</span>${ic('chevron-right', 16)}</button>` : ''}
    <div class="muted" style="font-size:11.5px">Forja no muestra publicidad ni vende tus datos. Tus fotos nunca salen de tu teléfono.</div></div>`;
  return h + card;
};
document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-act="priv-open"],[data-act="health-open"],[data-act="health-ok"],[data-act="del-local"],[data-act="del-acc"],[data-act="del-acc-go"],[data-act="del-local-go"]'); if (!b) return;
  ev.stopPropagation();
  const a = b.dataset.act, ok = () => String((document.getElementById('del-conf') || {}).value || '').trim().toUpperCase() === 'BORRAR';
  if (a === 'priv-open') privacySheet();
  else if (a === 'health-open') healthSheet(false);
  else if (a === 'health-ok') { state.settings.healthOk = 1; saveLocal(); closeSheet(); }
  else if (a === 'del-local') delSheet('local');
  else if (a === 'del-acc') delSheet('acc');
  else if (!ok()) { const m = document.getElementById('del-msg'); if (m) m.innerHTML = '<span style="color:var(--bad)">Escribe BORRAR para confirmar.</span>'; }
  else if (a === 'del-local-go') { if (typeof account !== 'undefined' && fb.auth) account.logout(); wipeLocal(); toast('Datos borrados'); setTimeout(() => location.reload(), 700); }
  else if (a === 'del-acc-go') deleteAccount();
}, true);

/* Primera vez: aviso de salud */
if (!state.settings.healthOk && !isWatch()) setTimeout(() => { if ($('#sheet').hidden) healthSheet(true); }, 600);
render();
