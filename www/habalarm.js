/* ==========================================================================
   Hábitos en tus recordatorios, a pantalla completa (como "Recordatorios" de Samsung)
   - Nuevo tipo de recordatorio "Hábito": eliges cuál (creatina, espirulina, …).
   - A la hora programada aparece una pantalla completa, aun con el teléfono bloqueado:
     ✕ descartar · ✓ hecho (marca el hábito) · Aplazar 15 min (− / + para cambiarlo).
   - En Android lo hace el plugin nativo HabitAlarm (ci/native). Si la app está abierta,
     o en la web, se muestra la misma pantalla dentro de la app.
   - No suena si ese hábito ya está marcado hoy.
   - Cada recordatorio elige qué hace la ✕ (`r.again`, minutos): 0 = una vez al día (no vuelve a avisar),
     o avisar de nuevo en 30 min a 4 h, solo ese mismo día hasta las 23:00 y mientras el hábito no esté hecho.
   ========================================================================== */
const HA = (CAP && CAP.HabitAlarm) || null;   // solo existe en la app con el plugin nativo
REM_KINDS.hab = { label: 'Hábito', hint: 'Aparece en toda la pantalla, como un despertador. Toca ✓ para marcarlo hecho, o aplázalo. No suena si ya lo marcaste ese día.' };
const HA_OLD = ['crea', 'prot', 'omega'];
const habOf = k => habList().find(h => h.k === k);
function habKeyOf(r) {
  const k = r.kind === 'hab' ? r.hab : (HA_OLD.indexOf(r.kind) >= 0 ? r.kind : null);
  return k && habOf(k) ? k : null;
}
const habDoneOn = (k, date) => !!((state.daily[dk(date)] || {})[k]);
function habBody(k) {
  const h = habOf(k), st = typeof supStreak === 'function' ? supStreak(k) : 0;
  return [h && h.dose, st ? `🔥 ${st} ${st === 1 ? 'día' : 'días'} seguidos, ¡no cortes la racha!` : '¡Empieza tu racha hoy!'].filter(Boolean).join(' · ');
}

/* Notificaciones normales: los hábitos van por la pantalla completa */
const _remSkipHA = remSkip;
remSkip = function (r, d, at) {
  const k = habKeyOf(r);
  if (k && HA) return true;
  if (k) return d === 0 && habDoneOn(k, at);
  return _remSkipHA(r, d, at);
};
const _remTextHA = remText;
remText = function (r, d, at) { const k = habKeyOf(r); return k ? { title: r.label || habOf(k).name, body: habBody(k) } : _remTextHA(r, d, at); };

/* Lista de alarmas de los próximos 14 días */
state.haSnz = [];
/* Sonido del recordatorio (`ring` de cada item; HabitAlarms.isDing = menos de 30): ding dong corto por defecto,
   o alarma en bucle de 30 s / 1 min. El valor viejo 10 ("Breve") pasa solo a ding dong. */
const HA_DUR = [[3, 'Ding dong (corto)'], [30, 'Alarma 30 s'], [60, 'Alarma 1 min']];
const haRing = () => { const v = +state.settings.alarmSec; return HA_DUR.some(d => d[0] === v) ? v : 3; };
/* Ding dong en la web (en la app lo toca el lado nativo por el canal de alarma): Mi5 → Do5 con caída suave */
function haDing() {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.resume) actx.resume();
    const t0 = actx.currentTime + 0.03;
    [[659.25, 0, 1.3], [523.25, 0.55, 2]].forEach(([f, d, len]) => [[1, 0.3], [2.76, 0.08], [2, 0.06]].forEach(([m, g0]) => {
      const o = actx.createOscillator(), g = actx.createGain(), end = m === 2.76 ? 0.5 : len;
      o.type = 'sine'; o.frequency.value = f * m;
      g.gain.setValueAtTime(0.0001, t0 + d); g.gain.exponentialRampToValueAtTime(g0, t0 + d + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d + end);
      o.connect(g); g.connect(actx.destination); o.start(t0 + d); o.stop(t0 + d + end + 0.05);
    }));
  } catch (e) {}
}
/* ✕: no volver a avisar hoy, o repetir cada N minutos: cada ✕ lo reprograma otra vez (varias veces), solo ese día,
   hasta las 23:00 y mientras el hábito no esté hecho */
const HA_AGAIN = [[0, 'No volver a avisar hoy (una vez al día)'], [30, 'Repetir cada 30 min hasta que lo marques'], [60, 'Repetir cada 1 hora hasta que lo marques'], [120, 'Repetir cada 2 horas hasta que lo marques'], [180, 'Repetir cada 3 horas hasta que lo marques'], [240, 'Repetir cada 4 horas hasta que lo marques']];
const haAgainTxt = m => m >= 60 ? (m / 60) + (m === 60 ? ' hora' : ' horas') : m + ' min';
const haBodyR = (r, k) => [habBody(k), +r.again > 0 ? `✕ te lo vuelve a recordar cada ${haAgainTxt(+r.again)}` : ''].filter(Boolean).join(' · ');
function haAgainAt(it) {
  const m = +it.again || 0; if (m <= 0) return 0;
  const nx = new Date(Date.now() + m * 60000);
  return dk(nx) === (it.day || dk(new Date())) && nx.getHours() < 23 ? nx.getTime() : 0;
}
function haItems() {
  const now = Date.now(), out = [];
  state.reminders.forEach((r, ri) => {
    const k = habKeyOf(r); if (!r.on || !k) return;
    const [hh, mm] = r.time.split(':').map(Number);
    for (let d = 0; d < 14; d++) {
      const at = new Date(); at.setDate(at.getDate() + d); at.setHours(hh, mm, 0, 0);
      if (at.getTime() <= now + 5000 || r.days.indexOf(at.getDay()) < 0) continue;
      if (d === 0 && habDoneOn(k, at)) continue;
      out.push({ id: 3000 + ri * 20 + d, at: at.getTime(), title: r.label || habOf(k).name, body: haBodyR(r, k), habit: k, day: dk(at), name: habOf(k).name, time: r.time, again: +r.again || 0 });
    }
  });
  state.haSnz = state.haSnz.filter(x => x.at > now && !habDoneOn(x.habit, new Date(x.at)));
  const ring = haRing();
  return out.concat(state.haSnz).slice(0, 200).map(x => Object.assign({}, x, { ring }));
}
const _schedHA = scheduleAll;
scheduleAll = async function () {
  await _schedHA();
  if (!HA) return;
  /* done: hábitos ya hechos hoy, para que el lado nativo borre las repeticiones (✕ o Aplazar) que creó él */
  const done = habList().map(h => h.k).filter(k => habDoneOn(k, new Date()));
  try { await HA.schedule({ items: state.notifPerm === 'granted' ? haItems() : [], done }); } catch (e) { console.warn('HabitAlarm', e); }
};

/* Lo que marcaste desde la pantalla completa con la app cerrada */
function haMark(k, day, quiet) {
  state.daily[day] = state.daily[day] || { water: 0 };
  if (state.daily[day][k]) return false;
  state.daily[day][k] = true; state.daily[day].edited = Date.now();
  return true;
}
async function haTake() {
  if (!HA) return;
  try {
    const r = await HA.takeEvents(), ev = (r && r.events) || [];
    const done = ev.filter(e => e.habit && e.day && haMark(e.habit, e.day));
    if (done.length) { saveDaily(); render(); toast(`Marcado: ${done.map(e => (habOf(e.habit) || {}).name || e.habit).join(', ')} ✓`); }
  } catch (e) {}
}
if (HA) {
  haTake();
  try { CAP.App.addListener('resume', () => { haTake(); haCheck(); }); } catch (e) {}
  try { CAP.App.addListener('appStateChange', s => { if (s && s.isActive) haTake(); }); } catch (e) {}
  setTimeout(() => { try { HA.status().then(s => { state.haStatus = s; if (state.tab === 'settings') render(); }); } catch (e) {} }, 1200);
}

/* ---------- Pantalla completa dentro de la app ---------- */
let haCur = null, haMin = 15;
const haShown = {};
function haShow(it) {
  haCur = it; haMin = 15;
  let el = document.getElementById('hab-alarm');
  if (!el) { el = document.createElement('div'); el.id = 'hab-alarm'; document.body.appendChild(el); }
  el.innerHTML = `<div class="ha-top"><div class="ha-title">${esc(it.title)}</div><div class="ha-sub">Hoy · ${esc(it.time || '')}</div>${it.body ? `<div class="ha-body">${esc(it.body)}</div>` : ''}</div>
    <div class="ha-bottom"><div class="ha-row"><button type="button" class="ha-c ha-no" data-act="ha-no" aria-label="Descartar">${ic('x', 34)}</button><button type="button" class="ha-c ha-yes" data-act="ha-yes" aria-label="Hecho">${ic('check', 34)}</button></div>
    <div class="ha-snz"><button type="button" class="ha-pm" data-act="ha-min" data-d="-5" aria-label="Menos minutos">—</button><button type="button" class="ha-pill" data-act="ha-snooze">Aplazar ${haMin} min</button><button type="button" class="ha-pm" data-act="ha-min" data-d="5" aria-label="Más minutos">+</button></div></div>`;
  el.hidden = false;
  try { navigator.vibrate && navigator.vibrate(450); } catch (e) {}   // una sola vibración
  if (!HA) haDing();
  if (HA && it.id) HA.dismiss({ id: it.id }).catch(() => {});
}
function haHide() { const el = document.getElementById('hab-alarm'); if (el) { el.hidden = true; el.innerHTML = ''; } haCur = null; }
function haCheck() {
  if (haCur || document.visibilityState === 'hidden') return;
  const now = new Date(), t = now.getTime();
  state.reminders.forEach((r, ri) => {
    const k = habKeyOf(r); if (!r.on || !k || r.days.indexOf(now.getDay()) < 0) return;
    const [hh, mm] = r.time.split(':').map(Number), at = new Date(now); at.setHours(hh, mm, 0, 0);
    const key = ri + '@' + dk(at) + r.time;
    if (haCur || haShown[key] || t < at.getTime() || t - at.getTime() > 120000 || habDoneOn(k, at)) return;
    haShown[key] = 1;
    haShow({ id: 3000 + ri * 20, title: r.label || habOf(k).name, body: haBodyR(r, k), habit: k, day: dk(at), name: habOf(k).name, time: r.time, again: +r.again || 0 });
  });
  state.haSnz.forEach(x => {
    if (haCur || x.shown || t < x.at || t - x.at > 120000 || habDoneOn(x.habit, new Date(x.at))) return;
    x.shown = 1; haShow(x);
  });
}
setInterval(haCheck, 15000);
document.addEventListener('visibilitychange', haCheck);

document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-act^="ha-"]'); if (!b) return;
  ev.stopPropagation(); ev.preventDefault();
  const a = b.dataset.act;
  if (a === 'ha-no') {
    const it = haCur, at = it && it.habit ? haAgainAt(it) : 0;
    haHide();
    if (at) { state.haSnz.push(Object.assign({}, it, { at, id: 3990 + (state.haSnz.length % 9), shown: 0 })); scheduleSoon(); toast(`Te lo recuerdo en ${haAgainTxt(+it.again)}`); }
  }
  if (a === 'ha-yes' && haCur) {
    const it = haCur; haHide();
    if (it.habit && haMark(it.habit, it.day || dk(new Date()))) { saveDaily(); render(); }
    toast(`¡Hecho! ${it.name || ''} ✓`);
  }
  if (a === 'ha-min') { haMin = Math.max(5, Math.min(120, haMin + (+b.dataset.d))); const p = document.querySelector('#hab-alarm .ha-pill'); if (p) p.textContent = `Aplazar ${haMin} min`; }
  if (a === 'ha-snooze' && haCur) {
    const it = Object.assign({}, haCur, { at: Date.now() + haMin * 60000, id: 3990 + (state.haSnz.length % 9), shown: 0 });
    state.haSnz.push(it); haHide(); scheduleSoon(); toast(`Te lo recuerdo en ${haMin} min`);
  }
  if (a === 'ha-test') {
    if (HA) HA.test({ sec: 8, ring: haRing(), title: 'Tomar suplementos, ¡no fallar!', body: 'Así se verá tu recordatorio de hábito', time: new Date(Date.now() + 8000).toTimeString().slice(0, 5) }).then(() => toast('Bloquea el teléfono: en 8 segundos aparece la pantalla.')).catch(() => toast('No se pudo programar la prueba.'));
    else haShow({ title: 'Tomar suplementos, ¡no fallar!', body: 'Así se verá tu recordatorio de hábito', time: new Date().toTimeString().slice(0, 5), habit: '', name: '' });
  }
  if (a === 'ha-dur') { state.settings.alarmSec = +b.dataset.v; savePlans(); scheduleSoon(); render(); toast(`Sonido del recordatorio: ${(HA_DUR.find(d => d[0] === haRing()) || [0, ''])[1].toLowerCase()}.`); if (haRing() < 30 && !HA) haDing(); }
  if (a === 'ha-perm' && HA) HA.openSettings({ type: b.dataset.t }).catch(() => {});
  if (a === 'ha-rem') {   // la campanita: si ese hábito ya tiene recordatorio, se edita ese; si no, uno nuevo
    const k = b.dataset.k, ri = haRemOf(k); closeSheet(); state.confirm = null;
    if (ri >= 0) remSheet(ri); else { remSheet(null); haPrefill(k); }
  }
}, true);

/* ---------- Formulario del recordatorio: elegir el hábito ---------- */
/* Recordatorio que ya tiene ese hábito (el activo primero); -1 si no hay */
function haRemOf(k) {
  const L = state.reminders.map((r, i) => ({ r, i })).filter(x => habKeyOf(x.r) === k);
  const on = L.find(x => x.r.on); return on ? on.i : L.length ? L[0].i : -1;
}
function haField(r) {
  const cur = r && habKeyOf(r), list = habList().filter(h => !h.hidden || h.k === cur), ag = r ? +r.again || 0 : 0, hid = cur ? '' : 'hidden';
  return `<div class="field" id="rm-hab-f" ${hid}><label class="label" for="rm-hab">¿Qué hábito?</label>
    <select id="rm-hab">${list.map(h => `<option value="${h.k}" ${h.k === cur ? 'selected' : ''}>${esc(h.name)}</option>`).join('')}</select></div>
    <div class="field" id="rm-again-f" ${hid}><label class="label" for="rm-again">Si lo cierras con ✕</label>
    <select id="rm-again">${HA_AGAIN.map(([v, l]) => `<option value="${v}" ${v === ag ? 'selected' : ''}>${l}</option>`).join('')}</select>
    <small class="muted" style="font-size:12px">Cada vez que lo cierras con ✕ vuelve a sonar después de ese tiempo, las veces que haga falta. Solo ese día, hasta las 23:00; si lo marcas como hecho, ya no vuelve.</small></div>`;
}
const _remSheetHA = remSheet;
remSheet = function (i) {
  _remSheetHA(i);
  const r = i != null ? state.reminders[i] : null, kf = document.getElementById('rm-kind');
  if (kf) kf.closest('.field').insertAdjacentHTML('afterend', haField(r));
  /* Los viejos Creatina / Proteína / Omega 3 se editan como "Hábito" (así eligen qué hace la ✕); al guardar quedan como hábito */
  if (r && kf && r.kind !== 'hab' && habKeyOf(r)) {
    kf.value = 'hab';
    const hint = document.getElementById('rm-hint'); if (hint) hint.textContent = REM_KINDS.hab.hint;
  }
};
function haPrefill(k) {
  const kind = document.getElementById('rm-kind'), hab = document.getElementById('rm-hab');
  if (!kind || !hab) return;
  kind.value = 'hab'; hab.value = k; haSync(true);
}
let haAuto = '';
function haSync(force) {
  const kind = document.getElementById('rm-kind'), f = document.getElementById('rm-hab-f'), hab = document.getElementById('rm-hab'), lab = document.getElementById('rm-label');
  if (!kind || !f) return;
  f.hidden = kind.value !== 'hab';
  const fa = document.getElementById('rm-again-f'); if (fa) fa.hidden = kind.value !== 'hab';
  const hint = document.getElementById('rm-hint'); if (hint) hint.textContent = REM_KINDS[kind.value].hint;
  if (kind.value === 'hab' && hab && lab) { const h = habOf(hab.value); if (h && (force || !lab.value.trim() || lab.value === haAuto)) { lab.value = haAuto = 'Toma tu ' + h.name.toLowerCase(); } }
}
document.addEventListener('change', ev => { if (ev.target.id === 'rm-kind' || ev.target.id === 'rm-hab') haSync(false); });

/* Guardar el hábito elegido junto con el recordatorio */
let haPending = null;
window.addEventListener('submit', ev => {
  const f = ev.target; if (!f || f.id !== 'f-rem') return;
  const kind = document.getElementById('rm-kind'), hab = document.getElementById('rm-hab'), ag = document.getElementById('rm-again');
  haPending = { i: f.dataset.i === '' ? null : +f.dataset.i, n: state.reminders.length, hab: kind && kind.value === 'hab' && hab ? hab.value : null, again: ag ? +ag.value || 0 : 0 };
}, true);
const _saveRemHA = saveReminders;
saveReminders = function () {
  if (haPending) {
    const p = haPending; haPending = null;
    const r = p.i != null ? state.reminders[p.i] : (state.reminders.length > p.n ? state.reminders[state.reminders.length - 1] : null);
    if (r) { if (p.hab) r.hab = p.hab; else delete r.hab; if (p.hab && p.again) r.again = p.again; else delete r.again; }
  }
  _saveRemHA();
};

/* ---------- Ajustes: estado y prueba ---------- */
const _vSettingsHA = vSettings;
vSettings = function () {
  let h = _vSettingsHA();
  const s = state.haStatus || {};
  const warn = !HA ? '' : [
    s.exact === false ? `<div class="remind"><span>⏰</span><span>Para que suene a la hora exacta, permite <b>Alarmas y recordatorios</b>. <button class="btn small" data-act="ha-perm" data-t="exact">Permitir</button></span></div>` : '',
    s.overlay === false ? `<div class="remind"><span>🔔</span><span>Para verlo en toda la pantalla <b>aunque estés usando el celular</b>, permite <b>Aparecer encima de otras apps</b>. <button class="btn small" data-act="ha-perm" data-t="overlay">Permitir</button></span></div>` : '',
    s.fullScreen === false ? `<div class="remind"><span>📱</span><span>Para verlo en toda la pantalla, permite <b>Notificaciones de pantalla completa</b>. <button class="btn small" data-act="ha-perm" data-t="fullScreen">Permitir</button></span></div>` : '',
  ].join('');
  const box = `<div class="ha-set">${warn}<div class="row"><div class="grow"><b>Hábitos a pantalla completa</b><div class="muted" style="font-size:12px">Los recordatorios de hábitos aparecen como en la app Recordatorios: ✓ hecho, ✕ descartar o aplazar.</div></div>
    <button class="btn small" data-act="ha-test">Probar</button></div>
    <div class="ha-durrow"><span class="label">Sonido del recordatorio</span><div class="seg ha-dur" role="group" aria-label="Sonido del recordatorio">${HA_DUR.map(([v, l]) => `<button type="button" class="${haRing() === v ? 'on' : ''}" data-act="ha-dur" data-v="${v}" aria-pressed="${haRing() === v}">${l}</button>`).join('')}</div>
    <div class="muted" style="font-size:12px">${haRing() < 30 ? 'Suena una vez (2-3 s) y vibra una vez, aunque el celular esté en silencio.' : 'Suena en bucle aunque el celular esté en silencio; se calla antes si tocas un botón o las teclas de volumen.'}</div></div></div>`;
  return h.replace('<button class="btn block" data-act="r-new">', box + '<button class="btn block" data-act="r-new">')
    .replace('Son notificaciones normales, no alarmas.', 'Los de hábitos aparecen en toda la pantalla; los demás son notificaciones normales.');
};

/* En "Tus hábitos": campanita para crear su recordatorio */
const _habManageHA = habManage;
habManage = function (edit) {
  _habManageHA(edit);
  document.querySelectorAll('#sheet .hm-row').forEach(row => {
    const e = row.querySelector('[data-act="hm-edit"]'); if (!e) return;
    const k = e.dataset.k, has = state.reminders.some(r => r.on && habKeyOf(r) === k);
    e.insertAdjacentHTML('beforebegin', `<button class="icon-btn sm ${has ? 'ha-on' : ''}" data-act="ha-rem" data-k="${k}" aria-label="Recordatorio de ${esc(habOf(k) ? habOf(k).name : '')}">${ic('bell', 16)}</button>`);
  });
};
scheduleSoon();

/* Al volver de los ajustes del sistema (o reabrir la app), releer los permisos: el aviso desaparece si ya se dieron */
function haRefresh() { if (!HA) return; try { HA.status().then(s => { const ch = JSON.stringify(s) !== JSON.stringify(state.haStatus || {}); state.haStatus = s; if (ch && state.tab === 'settings' && $('#sheet').hidden) render(); }).catch(() => {}); } catch (e) {} }
document.addEventListener('visibilitychange', () => { if (!document.hidden) setTimeout(haRefresh, 600); });
try { if (CAP && CAP.App) CAP.App.addListener('resume', () => setTimeout(haRefresh, 600)); } catch (e) {}
