/* ================== Capa nativa: recordatorios, respaldo, botón atrás ================== */
const CAP = window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform() ? window.Capacitor.Plugins : null;
const LN = CAP && CAP.LocalNotifications;
const HAP = CAP && CAP.Haptics;

const REM_KINDS = {
  crea: { label: 'Creatina', hint: 'No suena si ya marcaste la creatina ese día.' },
  prot: { label: 'Proteína', hint: 'No suena si ya marcaste la proteína ese día.' },
  omega: { label: 'Omega 3', hint: 'No suena si ya marcaste el omega 3 ese día.' },
  water: { label: 'Agua', hint: 'No suena si ya llegaste a 2,5 L ese día.' },
  train: { label: 'Entrenamiento', hint: 'Solo en los días de tu plan activo y si aún no entrenaste.' },
  custom: { label: 'Personalizado', hint: 'Suena siempre en los días elegidos.' },
};
function defaultReminders() {
  const all = [0, 1, 2, 3, 4, 5, 6];
  return [
    { id: 'r-crea', kind: 'crea', label: 'Toma tu creatina (5 g)', time: '08:00', days: all, on: true },
    { id: 'r-w1', kind: 'water', label: 'Agua', time: '11:00', days: all, on: true },
    { id: 'r-w2', kind: 'water', label: 'Agua', time: '15:00', days: all, on: true },
    { id: 'r-w3', kind: 'water', label: 'Agua', time: '19:00', days: all, on: true },
    { id: 'r-gym', kind: 'train', label: 'Hoy toca entrenar', time: '17:00', days: all, on: false },
  ];
}
state.reminders = LS.get('reminders', null) || defaultReminders();
state.notifPerm = 'unknown';
function saveReminders() { LS.set('reminders', state.reminders); scheduleSoon(); }

function remText(r, dayOffset, date) {
  const isToday = dayOffset === 0;
  const t = state.daily[dk(date)] || {};
  if (r.kind === 'crea') { const st = creaStreak(); return { title: r.label, body: st ? `Llevas ${st} días seguidos. ¡No cortes la racha!` : 'La creatina funciona por acumulación: tómala todos los días.' }; }
  if (r.kind === 'prot') return { title: r.label, body: 'Meta: 145-150 g de proteína al día.' };
  if (r.kind === 'omega') return { title: r.label, body: 'Una cápsula con una comida.' };
  if (r.kind === 'water') return { title: r.label, body: isToday ? `Llevas ${fmtKg((t.water || 0) / 1000)} L de 2,5–3 L. Toma un vaso ahora.` : 'Meta de hoy: 2,5–3 L. Toma un vaso ahora.' };
  if (r.kind === 'train') { const p = activePlan(); const d = p.days.find(x => x.weekday === date.getDay()); return { title: r.label, body: d ? `${d.name} en ${HISTORY.gym}.` : 'Revisa tu plan.' }; }
  return { title: r.label, body: 'Recordatorio de Forja' };
}
function remSkip(r, dayOffset, date) {
  const t = state.daily[dk(date)] || {};
  if (r.kind === 'train') {
    const p = activePlan(); if (!p.days.some(x => x.weekday === date.getDay())) return true;
    if (dayOffset === 0 && state.sessions.some(s => dk(s.date) === dk(date))) return true;
  }
  if (dayOffset !== 0) return false;
  if (r.kind === 'crea' && t.crea) return true;
  if (r.kind === 'prot' && t.prot) return true;
  if (r.kind === 'omega' && t.omega) return true;
  if (r.kind === 'water' && (t.water || 0) >= WATER_MIN) return true;
  return false;
}
let schedT = null;
function scheduleSoon() { clearTimeout(schedT); schedT = setTimeout(scheduleAll, 400); }
async function scheduleAll() {
  if (!LN) return;
  try {
    const pend = await LN.getPending();
    const old = (pend.notifications || []).filter(n => n.id >= 1000 && n.id < 9000).map(n => ({ id: n.id }));
    if (old.length) await LN.cancel({ notifications: old });
    if (state.notifPerm !== 'granted') return;
    const now = Date.now(), list = [];
    state.reminders.forEach((r, ri) => {
      if (!r.on) return;
      const [hh, mm] = r.time.split(':').map(Number);
      for (let d = 0; d < 14; d++) {
        const at = new Date(); at.setDate(at.getDate() + d); at.setHours(hh, mm, 0, 0);
        if (at.getTime() <= now + 5000) continue;
        if (!r.days.includes(at.getDay())) continue;
        if (remSkip(r, d, at)) continue;
        const tx = remText(r, d, at);
        list.push({ id: 1000 + ri * 20 + d, title: tx.title, body: tx.body, channelId: 'recordatorios', smallIcon: 'ic_stat_notify', schedule: { at, allowWhileIdle: true } });
      }
    });
    if (list.length) await LN.schedule({ notifications: list.slice(0, 60) });
  } catch (e) { console.warn('schedule', e); }
}
async function initNotifications() {
  if (!LN) return;
  try {
    await LN.createChannel({ id: 'recordatorios', name: 'Recordatorios', description: 'Creatina, agua y entrenamiento', importance: 4, vibration: true });
    await LN.createChannel({ id: 'descanso', name: 'Fin del descanso', description: 'Aviso cuando termina el descanso entre series', importance: 5, vibration: true });
    let p = await LN.checkPermissions();
    if (p.display === 'prompt' || p.display === 'prompt-with-rationale') p = await LN.requestPermissions();
    state.notifPerm = p.display;
    LN.addListener('localNotificationActionPerformed', ev => { if (ev.notification && ev.notification.id >= 1000 && ev.notification.id < 9000) { state.tab = 'train'; render(); } });
  } catch (e) { state.notifPerm = 'denied'; }
  scheduleAll(); safeRender();
}

/* Aviso de fin de descanso cuando la app queda en segundo plano */
const REST_ID = 9001;
function restNotify() {
  if (!LN || !state.rest || state.notifPerm !== 'granted') return;
  const at = new Date(state.rest.end); if (at.getTime() < Date.now() + 1500) return;
  LN.schedule({ notifications: [{ id: REST_ID, title: '¡A la siguiente serie!', body: 'Terminó tu descanso.', channelId: 'descanso', smallIcon: 'ic_stat_notify', schedule: { at, allowWhileIdle: true } }] }).catch(() => {});
}
function restCancel() { if (LN) LN.cancel({ notifications: [{ id: REST_ID }] }).catch(() => {}); }
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') restNotify();
  else { restCancel(); scheduleSoon(); safeRender(); }
});

/* Enganches a funciones existentes */
const _saveDaily = saveDaily; saveDaily = function () { _saveDaily(); scheduleSoon(); };
const _finish = finishSession; finishSession = function () { _finish(); scheduleSoon(); };
const _savePlans = savePlans; savePlans = function () { _savePlans(); scheduleSoon(); };
const _markSet = markSet; markSet = function (i, j, v, k) { try { HAP && HAP.impact({ style: 'MEDIUM' }); } catch (e) {} _markSet(i, j, v, k); };
if (HAP) window.nativeVibrate = n => { for (let i = 0; i < n; i++) setTimeout(() => { try { HAP.vibrate({ duration: 400 }); } catch (e) {} }, i * 650); };

/* ================== Pantalla siempre encendida ================== */
const KA = CAP && CAP.KeepAwake;
const AWAKE = { app: 'Mientras la app está abierta', train: 'Solo durante el entrenamiento', off: 'Nunca (usa el ajuste del teléfono)' };
const awakeMode = () => state.settings.awake || 'app';
let webLock = null, awakeOn = null;
async function applyAwake() {
  const want = document.visibilityState === 'visible' && (awakeMode() === 'app' || (awakeMode() === 'train' && !!state.draft));
  if (KA) {
    if (want === awakeOn) return; awakeOn = want;
    try { want ? await KA.keepAwake() : await KA.allowSleep(); } catch (e) {}
    return;
  }
  try {
    if (want && !webLock && navigator.wakeLock) { webLock = await navigator.wakeLock.request('screen'); webLock.addEventListener('release', () => { webLock = null; }); }
    if (!want && webLock) { await webLock.release(); webLock = null; }
  } catch (e) {}
}
wake = () => applyAwake();
unwake = () => applyAwake();
document.addEventListener('visibilitychange', () => { awakeOn = null; applyAwake(); });
document.addEventListener('change', ev => { if (ev.target.id === 'awake-mode') { state.settings.awake = ev.target.value; saveLocal(); awakeOn = null; applyAwake(); toast(ev.target.value === 'off' ? 'La pantalla se apagará según el ajuste de tu teléfono.' : 'Listo: la pantalla no se bloqueará.'); } });

/* ================== Vista de Ajustes ================== */
const WD1 = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
function vSettings() {
  const perm = !LN ? `<div class="remind"><span>ℹ️</span><span>Las notificaciones funcionan en la app instalada en Android.</span></div>`
    : state.notifPerm === 'granted' ? '' : `<div class="remind"><span>🔕</span><span>Las notificaciones están desactivadas. <button class="btn small" data-act="n-perm">Activarlas</button></span></div>`;
  return `${header('Ajustes', 'Recordatorios y datos')}
  ${perm}
  <div class="card"><div class="row" style="justify-content:space-between"><h3>Recordatorios</h3>${LN && state.notifPerm === 'granted' ? '<button class="btn small" data-act="n-test">Probar</button>' : ''}</div>
    <div class="muted" style="font-size:12.5px">Son notificaciones normales, no alarmas. Los de creatina, proteína y agua no suenan si ya cumpliste ese día.</div>
    ${state.reminders.map((r, i) => `<div class="remrow ${r.on ? '' : 'off'}">
      <div class="row"><div class="grow"><div style="font-weight:700">${esc(r.label)}</div><div class="muted" style="font-size:12px">${REM_KINDS[r.kind].label} · ${r.days.length === 7 ? 'todos los días' : r.days.map(d => WDL[d].slice(0, 3)).join(', ')}</div></div>
        <span class="num" style="font-size:20px;font-weight:700">${r.time}</span>
        <button class="switch ${r.on ? 'on' : ''}" data-act="r-tog" data-i="${i}" role="switch" aria-checked="${r.on}" aria-label="Activar ${esc(r.label)}"><i></i></button></div>
      <button class="btn small" data-act="r-edit" data-i="${i}" style="align-self:flex-start">Editar</button></div>`).join('')}
    <button class="btn block" data-act="r-new">+ Nuevo recordatorio</button></div>
  ${typeof alertSettingsCard === 'function' ? alertSettingsCard() : ''}
  <div class="card"><h3>Pantalla</h3>
    <div class="field"><label class="label" for="awake-mode">No bloquear la pantalla</label><select id="awake-mode">${Object.entries(AWAKE).map(([k, v]) => `<option value="${k}" ${k === awakeMode() ? 'selected' : ''}>${v}</option>`).join('')}</select>
    <div class="muted" style="font-size:12px">Evita que el teléfono se bloquee y te pida la clave entre series. Gasta un poco más de batería.</div></div>
    <div class="row"><div class="grow">Figura animada al entrenar<div class="muted" style="font-size:12px">Muestra el muñequito de cada ejercicio dentro de la sesión. Tócalo para ver la técnica y tus videos.</div></div>
    <button class="switch ${typeof alertCfg === 'function' && alertCfg().fig ? 'on' : ''}" data-act="fig-tog" role="switch" aria-checked="${typeof alertCfg === 'function' && alertCfg().fig}" aria-label="Figura animada al entrenar"><i></i></button></div>
    <div class="row"><div class="grow">Modo reloj<div class="muted" style="font-size:12px">Una serie por pantalla con botones grandes. En pantallas pequeñas se activa solo.</div></div>
    <button class="switch ${isWatch() ? 'on' : ''}" data-act="watch" role="switch" aria-checked="${isWatch()}" aria-label="Modo reloj"><i></i></button></div></div>
  <div class="card"><h3>Respaldo</h3>
    <div class="muted" style="font-size:12.5px">Tus datos se guardan solo en este teléfono. Copia un respaldo de vez en cuando y guárdalo en tus notas o en WhatsApp; con él puedes pasar tus datos a otro equipo, como tu reloj. Los videos guardados no se incluyen.</div>
    <div class="grid2"><button class="btn" data-act="bk-copy">Copiar respaldo</button><button class="btn" data-act="bk-imp">Restaurar</button></div></div>
  <div class="card"><h3>Actualizaciones</h3>
    <div class="row"><div class="grow">Versión instalada<div class="muted num" style="font-size:12px">${upd.current ? upd.current.name : (CAP ? '…' : 'Vista previa web')}</div></div>
    ${CAP ? `<button class="btn small" data-act="upd-check" ${upd.checking ? 'disabled' : ''}>${upd.checking ? 'Buscando…' : 'Buscar ahora'}</button>` : ''}</div>
    ${upd.latest && upd.latest.build > (upd.current ? upd.current.build : 0) ? updBanner(true) : (upd.checked && CAP ? `<div class="muted" style="font-size:12.5px">${upd.error ? 'No se pudo revisar: ' + esc(upd.error) : 'Tienes la versión más reciente.'}</div>` : '')}
  </div>
  <div class="muted" style="font-size:12px;text-align:center">Forja</div>`;
}
function remSheet(i) {
  const r = i != null ? state.reminders[i] : { kind: 'custom', label: '', time: '09:00', days: [0, 1, 2, 3, 4, 5, 6], on: true };
  openSheet(`<h2>${i != null ? 'Editar recordatorio' : 'Nuevo recordatorio'}</h2>
  <form id="f-rem" class="grid2" style="grid-template-columns:1fr" data-i="${i ?? ''}">
    <div class="field"><label class="label" for="rm-kind">Tipo</label><select id="rm-kind" name="kind">${Object.entries(REM_KINDS).map(([k, v]) => `<option value="${k}" ${k === r.kind ? 'selected' : ''}>${v.label}</option>`).join('')}</select></div>
    <div class="field"><label class="label" for="rm-label">Texto</label><input id="rm-label" name="label" required value="${esc(r.label)}" placeholder="Ej. Estirar la espalda"></div>
    <div class="field"><label class="label" for="rm-time">Hora</label><input id="rm-time" name="time" type="time" required value="${r.time}"></div>
    <div class="field"><span class="label">Días</span><div class="daypick">${[1, 2, 3, 4, 5, 6, 0].map(d => `<label><input type="checkbox" name="d" value="${d}" ${r.days.includes(d) ? 'checked' : ''}><span>${WD1[d]}</span></label>`).join('')}</div></div>
    <div class="muted" style="font-size:12.5px" id="rm-hint">${REM_KINDS[r.kind].hint}</div>
    <div class="grid2"><button type="button" class="btn" data-act="sheet-close">Cancelar</button><button class="btn primary" type="submit">Guardar</button></div>
    ${i != null ? `<button type="button" class="btn danger" data-act="r-del" data-i="${i}">${state.confirm === 'rdel' ? '¿Borrar? Toca otra vez' : 'Borrar recordatorio'}</button>` : ''}
  </form>`);
}
function backupJSON() {
  return JSON.stringify({ app: 'cuaderno-hierro', v: 2, at: new Date().toISOString(), gyms: state.gyms, plans: state.plans, settings: state.settings, sessions: state.sessions, daily: state.daily, reminders: state.reminders });
}
async function copyText(txt) {
  try { await navigator.clipboard.writeText(txt); return true; } catch (e) { return false; }
}
function importSheet() {
  openSheet(`<h2>Restaurar respaldo</h2><div class="muted" style="font-size:13px">Pega el texto del respaldo. Reemplaza los planes, el historial y los registros de este equipo.</div>
  <form id="f-imp" class="grid2" style="grid-template-columns:1fr"><textarea id="imp-txt" rows="7" style="width:100%;font-family:var(--f-num);font-size:12px;background:var(--surface2);color:var(--fg);border:1px solid var(--line);border-radius:8px;padding:8px" placeholder='{"app":"cuaderno-hierro", ...}'></textarea>
  <div class="grid2"><button type="button" class="btn" data-act="sheet-close">Cancelar</button><button class="btn primary" type="submit">Restaurar</button></div></form>`);
}

document.addEventListener('click', async ev => {
  const b = ev.target.closest('[data-act]'); if (!b) return;
  const a = b.dataset.act, i = b.dataset.i != null && b.dataset.i !== '' ? +b.dataset.i : null;
  if (/^(r-|n-|bk-)/.test(a)) ev.stopPropagation();
  if (a === 'r-tog') { state.reminders[i].on = !state.reminders[i].on; saveReminders(); render(); }
  if (a === 'r-edit') { state.confirm = null; remSheet(i); }
  if (a === 'r-new') remSheet(null);
  if (a === 'r-del') { if (state.confirm === 'rdel') { state.reminders.splice(i, 1); state.confirm = null; saveReminders(); closeSheet(); render(); } else { state.confirm = 'rdel'; b.textContent = '¿Borrar? Toca otra vez'; } }
  if (a === 'n-perm' && LN) { try { const p = await LN.requestPermissions(); state.notifPerm = p.display; } catch (e) {} if (state.notifPerm !== 'granted') toast('Actívalas en Ajustes de Android → Apps → Forja → Notificaciones.'); scheduleAll(); render(); }
  if (a === 'n-test' && LN) { LN.schedule({ notifications: [{ id: 9002, title: 'Así se verán tus recordatorios', body: 'Llegó en 5 segundos. ¡Todo listo! 💪', channelId: 'recordatorios', smallIcon: 'ic_stat_notify', schedule: { at: new Date(Date.now() + 5000), allowWhileIdle: true } }] }).then(() => toast('Te llegará en 5 segundos.')).catch(() => toast('No se pudo programar la prueba.')); }
  if (a === 'bk-copy') { const ok = await copyText(backupJSON()); toast(ok ? 'Respaldo copiado. Pégalo en tus notas o WhatsApp.' : 'No se pudo copiar.'); }
  if (a === 'bk-imp') importSheet();
}, true);
document.addEventListener('change', ev => { if (ev.target.id === 'rm-kind') { const h = document.getElementById('rm-hint'); if (h) h.textContent = REM_KINDS[ev.target.value].hint; } });
document.addEventListener('submit', ev => {
  const f = ev.target;
  if (f.id === 'f-rem') {
    ev.preventDefault(); ev.stopImmediatePropagation();
    const fd = new FormData(f); const days = fd.getAll('d').map(Number);
    if (!days.length) { toast('Elige al menos un día.'); return; }
    const r = { kind: fd.get('kind'), label: String(fd.get('label')).trim(), time: fd.get('time'), days, on: true };
    if (f.dataset.i !== '') Object.assign(state.reminders[+f.dataset.i], r); else state.reminders.push(Object.assign({ id: 'r-' + uid() }, r));
    saveReminders(); closeSheet(); render(); toast('Recordatorio guardado.');
  }
  if (f.id === 'f-imp') {
    ev.preventDefault(); ev.stopImmediatePropagation();
    try {
      const d = JSON.parse(document.getElementById('imp-txt').value.trim());
      if (d.app !== 'cuaderno-hierro' || !Array.isArray(d.plans)) throw 0;
      state.plans = d.plans; if (Array.isArray(d.gyms)) { state.gyms = d.gyms; LS.set('gyms', d.gyms); } state.settings = Object.assign(state.settings, d.settings || {}); state.sessions = d.sessions || []; state.daily = d.daily || {};
      if (Array.isArray(d.reminders)) state.reminders = d.reminders;
      migrateGyms(); saveLocal(); LS.set('daily', state.daily); saveReminders(); closeSheet(); render(); toast('Datos restaurados.');
    } catch (e) { toast('Ese texto no es un respaldo válido.'); }
  }
}, true);

/* Botón atrás de Android */
if (CAP && CAP.App) CAP.App.addListener('backButton', () => {
  if (!$('#sheet').hidden) { figAnim.item = null; closeSheet(); return; }
  if (state.tab !== 'train') { state.tab = 'train'; render(); return; }
  if (state.draft) { toast('Tienes una sesión en curso. Termínala o descártala.'); return; }
  CAP.App.minimizeApp ? CAP.App.minimizeApp() : CAP.App.exitApp();
});

/* ================== Actualizaciones (GitHub Releases) ================== */
const REPO = 'edlop16-dotcom/cuaderno-hierro';
const upd = { current: null, latest: null, checking: false, checked: false, error: '' };
const buildOf = tag => { const m = String(tag || '').match(/(\d+)\s*$/); return m ? +m[1] : 0; };
function updBanner(inSettings) {
  const l = upd.latest; if (!l) return '';
  return `<div class="remind upd" ${inSettings ? '' : 'id="upd-banner"'}><span aria-hidden="true">⬇️</span>
    <span class="grow"><b>Nueva versión ${esc(l.name)}</b> disponible.${l.notes ? `<br><span class="muted" style="font-size:12.5px">${esc(l.notes)}</span>` : ''}
    <span class="row" style="margin-top:8px;gap:8px;flex-wrap:wrap"><button class="btn small primary" data-act="upd-go">Actualizar</button>${inSettings ? '' : '<button class="btn small" data-act="upd-later">Más tarde</button>'}</span></span></div>`;
}
async function checkUpdates(manual) {
  if (!CAP || upd.checking) return;
  const last = LS.get('updCheckedAt', 0);
  if (!manual && Date.now() - last < 3 * 3600e3 && LS.get('updLatest', null)) { upd.latest = LS.get('updLatest', null); upd.checked = true; safeRender(); return; }
  upd.checking = true; upd.error = ''; if (manual) render();
  try {
    const r = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { headers: { Accept: 'application/vnd.github+json' }, cache: 'no-store' });
    if (!r.ok) throw new Error(r.status === 403 ? 'demasiadas consultas, intenta en una hora' : 'error ' + r.status);
    const j = await r.json();
    const apk = (j.assets || []).find(a => /\.apk$/i.test(a.name));
    upd.latest = apk ? { name: String(j.tag_name || '').replace(/^v/, ''), build: buildOf(j.tag_name), url: apk.browser_download_url, notes: String(j.body || '').split('\n').filter(x => x.trim() && !/Descarga .*apk|Co-Authored-By|Claude-Session|^Merge /i.test(x)).slice(0, 3).join(' · ') } : null;
    LS.set('updLatest', upd.latest); LS.set('updCheckedAt', Date.now());
  } catch (e) { upd.error = e.message || 'sin conexión'; }
  upd.checking = false; upd.checked = true;
  render();
  if (manual && !upd.error) toast(upd.latest && upd.current && upd.latest.build > upd.current.build ? 'Hay una versión nueva.' : 'Ya tienes la versión más reciente.');
}
async function initUpdates() {
  if (!CAP || !CAP.App) return;
  try { const i = await CAP.App.getInfo(); upd.current = { name: i.version, build: +i.build || buildOf(i.version) }; } catch (e) {}
  checkUpdates(false);
}
document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-act]'); if (!b) return;
  const a = b.dataset.act;
  if (a === 'upd-check') { ev.stopPropagation(); checkUpdates(true); }
  if (a === 'upd-later') { ev.stopPropagation(); LS.set('updSnooze', upd.latest ? upd.latest.build : 0); render(); }
  if (a === 'upd-go' && upd.latest) {
    ev.stopPropagation();
    toast('Descargando… al terminar, abre el archivo y toca Instalar. Tus datos se conservan.');
    setTimeout(() => { location.href = upd.latest.url; }, 600);
  }
}, true);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkUpdates(false); });
/* Banner en la pantalla de inicio */
const _vTrain = vTrain;
vTrain = function () {
  const html = _vTrain();
  const show = !state.draft && upd.latest && upd.current && upd.latest.build > upd.current.build && LS.get('updSnooze', 0) !== upd.latest.build;
  if (!show) return html;
  const i = html.indexOf('<div class="hero">');
  return i < 0 ? updBanner(false) + html : html.slice(0, i) + updBanner(false) + html.slice(i);
};

render();
applyAwake();
initNotifications();
initUpdates();
