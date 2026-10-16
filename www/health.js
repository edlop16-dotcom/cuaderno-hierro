/* ==========================================================================
   Pareja 9: Samsung Health (vía Health Connect) + gimnasio automático
   SAMSUNG HEALTH (solo lectura, en el celular)
   - Sueño → "¿Cómo llegas hoy?" se llena solo (menos de 6 h = mal, 6-7 = normal, 7+ = bien).
   - Pulso en reposo → si hoy está 5+ lpm sobre tu promedio, el día cuenta como más cansado.
   - Peso → se agrega a Perfil → Cuerpo los días que no lo anotaste a mano.
   - Pasos → los de Samsung Health (con reloj Galaxy o el teléfono) cuentan en "Pasos".
   GIMNASIO AUTOMÁTICO
   - En "¿Dónde entrenas hoy?" guardas la ubicación de cada gimnasio estando allí.
   - Al abrir la app cerca de un gimnasio guardado, cambia sola a ese gimnasio y te
     ofrece empezar la rutina del día. La ubicación no se guarda ni se envía a ningún lado.
   ========================================================================== */
const HCN = (CAP && CAP.Health) || null;
state.hc = null;
let hcBusy = false;
const hcLast = () => +LS.get('hcLast', 0) || 0;
const fmtHM = m => `${Math.floor(m / 60)} h${m % 60 ? ' ' + (m % 60) + ' min' : ''}`;

function hcStatus() {
  if (!HCN) return Promise.resolve(null);
  return HCN.status().then(s => { state.hc = s; return s; }).catch(() => null);
}
function hcSync(force) {
  if (!HCN || hcBusy || !state.hc || !state.hc.any) return Promise.resolve(false);
  if (!force && Date.now() - hcLast() < 30 * 60000) return Promise.resolve(false);
  hcBusy = true;
  return HCN.read({ days: force ? 30 : 14 }).then(r => { hcBusy = false; LS.set('hcLast', Date.now()); hcApply(r || {}); return true; }).catch(() => { hcBusy = false; return false; });
}
function hcApply(r) {
  let dch = false, bch = false;
  LS.set('hcCounts', { sleep: (r.sleep || []).length, weight: (r.weight || []).length, steps: (r.steps || []).filter(x => x.n > 0).length, rhr: (r.rhr || []).length, lastSleep: (r.sleep || []).map(x => x.day).sort().pop() || '' });
  const D = k => (state.daily[k] = state.daily[k] || { water: 0 });
  (r.steps || []).forEach(x => { const t = D(x.day); if (t.stepsH !== x.n) { t.stepsH = x.n; dch = true; } });
  const sl = {};
  (r.sleep || []).forEach(x => { if (x.min >= 30) sl[x.day] = (sl[x.day] || 0) + x.min; });
  Object.keys(sl).forEach(k => { const t = D(k); if (t.sleepMin !== sl[k] || t.sleepSrc !== 'sh') { t.sleepMin = sl[k]; t.sleepSrc = 'sh'; dch = true; } });
  (r.rhr || []).forEach(x => { const t = D(x.day); if (t.rhr !== x.bpm) { t.rhr = x.bpm; dch = true; } });
  if ((r.weight || []).length && typeof body === 'function') {
    const b = body(), byDay = {};
    (r.weight || []).forEach(x => { byDay[x.day] = Math.round(x.kg * 10) / 10; });
    Object.keys(byDay).forEach(d => {
      const e = b.w.find(x => x.d === d);
      if (!e) { b.w.push({ d, kg: byDay[d], src: 'sh' }); bch = true; }
      else if (e.src === 'sh' && e.kg !== byDay[d]) { e.kg = byDay[d]; bch = true; }
    });
    if (bch) { b.w.sort((x, y) => x.d.localeCompare(y.d)); saveBody(); }
  }
  if (dch) saveDaily();
  hcReadyAuto();
  if (dch || bch) render();
}

/* ---------- Preparación del día con el sueño y el pulso en reposo ---------- */
function rhrInfo() {
  const t = today(); if (!t.rhr) return null;
  const prev = [];
  for (let i = 1; i <= 14; i++) { const d = new Date(); d.setDate(d.getDate() - i); const v = (state.daily[dk(d)] || {}).rhr; if (v) prev.push(v); }
  if (prev.length < 3) return { bpm: t.rhr, avg: null, high: false };
  const avg = Math.round(prev.reduce((a, b) => a + b, 0) / prev.length);
  return { bpm: t.rhr, avg, high: t.rhr >= avg + 5 };
}
function hcReadyAuto() {
  const m = today().sleepMin; if (!m) return;
  const v = m < 360 ? -1 : m < 420 ? 0 : 1, cur = readyToday();
  if (cur && cur.sleep != null && !cur.sleepAuto) return;
  if (cur && cur.sleep === v) return;
  state.settings.ready = Object.assign({}, cur || { d: dk(new Date()) }, { sleep: v, sleepAuto: true });
  savePlans();
}
const _readyScoreHC = readyScore;
readyScore = function () { const s = _readyScoreHC(); if (s == null) return s; const r = rhrInfo(); return r && r.high ? s - 1 : s; };
const _readyCardHC = readyCard;
readyCard = function () {
  const h = _readyCardHC(), t = today(), r = rhrInfo();
  if (!t.sleepMin && !r) {
    /* Decir siempre qué pasa con Samsung Health, para que se sepa si está leyendo */
    if (!HCN || isWatch()) return h;
    const s = state.hc;
    const msg = !s ? 'Revisando Samsung Health…'
      : s.available !== 'yes' ? 'Samsung Health no está disponible en este teléfono. Marca tu sueño a mano.'
      : !s.any ? `Samsung Health no está conectado. <button type="button" class="btn small" data-act="hc-go">Conectar</button>`
      : !s.sleep ? `Samsung Health está conectado, pero sin permiso para leer el sueño. <button type="button" class="btn small" data-act="hc-perm">Permisos</button>`
      : `Samsung Health conectado, pero no tiene registro de sueño de anoche${hcLast() ? ' (leído ' + ago(new Date(hcLast()).toISOString()) + ')' : ''}. Marca tu sueño a mano.`;
    return h.replace(/(<\/h3>)/, `$1<div class="hc-ready none">${msg}</div>`);
  }
  const bits = [];
  const ph = t.sleepSrc === 'ph' && t.sleepPh, hm = x => new Date(x).toTimeString().slice(0, 5);
  if (t.sleepMin) bits.push(`😴 Dormiste <b>${fmtHM(t.sleepMin)}</b>${ph ? ` (${hm(ph.s)} → ${hm(ph.e)})` : ''}`);
  if (ph && ph.w && ph.w.length) bits.push(`${ph.w.length} ${ph.w.length === 1 ? 'despertar' : 'despertares'} (${ph.w.map(w => hm(w[0]) + ', ' + w[1] + ' min').join(' · ')})`);
  if (r) bits.push(`❤ Reposo <b>${r.bpm}</b>${r.avg ? ` (tu media ${r.avg})` : ''}${r.high ? ' · <b>alto: tu cuerpo viene cansado</b>' : ''}`);
  const line = `<div class="hc-ready">${bits.join(' · ')} <small>${ph ? 'según el uso del celular' : 'Samsung Health'}</small></div>`;
  return h.replace(/(<\/h3>)/, '$1' + line);
};

/* ---------- Ajustes: tarjeta Samsung Health ---------- */
function hcCard() {
  const s = state.hc;
  if (!HCN) return `<div class="card hc-card"><h3>${ic('activity', 17)} Samsung Health</h3><div class="muted" style="font-size:12.5px">Se conecta desde la app del celular. Aquí ves el sueño, peso y pasos que se sincronizan.</div></div>`;
  if (!s) return '';
  if (s.available === 'no') return isWatch() ? '' : `<div class="card hc-card"><h3>${ic('activity', 17)} Samsung Health</h3><div class="muted" style="font-size:12.5px">Este equipo no tiene Health Connect (necesita Android 9 o más nuevo).</div></div>`;
  if (s.available === 'update') return `<div class="card hc-card"><h3>${ic('activity', 17)} Samsung Health</h3><div class="muted" style="font-size:12.5px">Para leer tu sueño, peso y pasos de Samsung Health hace falta la app <b>Health Connect</b> de Google.</div><button class="btn primary small" data-act="hc-store">Instalar Health Connect</button></div>`;
  const ok = (k, l) => `<span class="hc-pill ${s[k] ? 'on' : ''}">${s[k] ? '✓' : '·'} ${l}</span>`;
  const last = hcLast();
  return `<div class="card hc-card"><h3>${ic('activity', 17)} Samsung Health</h3>
    ${s.any ? `<div class="hc-pills">${ok('sleep', 'Sueño')}${ok('weight', 'Peso')}${ok('steps', 'Pasos')}${ok('rhr', 'Pulso en reposo')}</div>
      <div class="muted" style="font-size:12px">${last ? 'Última lectura: ' + new Date(last).toTimeString().slice(0, 5) + ' · ' + ago(new Date(last).toISOString()) + '.' : 'Aún sin leer.'} Solo se leen datos, nunca se escriben.</div>
      ${(() => { const c = LS.get('hcCounts', null); if (!c) return ''; return `<div class="hc-got">Recibido de los últimos días: <b>${c.sleep}</b> noches de sueño${c.lastSleep ? ' (última: ' + c.lastSleep.split('-').reverse().slice(0, 2).join('/') + ')' : ''} · <b>${c.steps}</b> días con pasos · <b>${c.weight}</b> pesos · <b>${c.rhr}</b> pulsos en reposo</div>${!c.sleep ? '<div class="muted" style="font-size:12px">Samsung Health no está compartiendo tu sueño. Revisa: app <b>Health Connect</b> → Permisos de apps → <b>Samsung Health</b> → que pueda escribir <b>Sueño</b>; y que en Samsung Health → Sueño haya registros.</div>' : ''}`; })()}
      <div class="grid2"><button class="btn small" data-act="hc-sync">Leer ahora</button><button class="btn small" data-act="hc-perm">Permisos</button></div>`
    : `<ol class="hc-steps"><li>Abre <b>Samsung Health</b> → Ajustes → <b>Health Connect</b> y activa que comparta sueño, peso y pasos.</li><li>Vuelve aquí y toca <b>Conectar</b>: elige qué puede leer Forja.</li></ol>
      <button class="btn primary small" data-act="hc-conn">Conectar</button>`}</div>`;
}
const _vSettingsHC = vSettings;
vSettings = function () { return _vSettingsHC() + hcCard(); };

/* ---------- Gimnasio automático por ubicación ---------- */
const gymLocs = () => (state.settings.gymLoc = state.settings.gymLoc || {});
function getPos(opt) {
  return new Promise((res, rej) => {
    if (!navigator.geolocation) return rej(new Error('sin GPS'));
    navigator.geolocation.getCurrentPosition(p => res(p.coords), rej, Object.assign({ enableHighAccuracy: false, timeout: 30000, maximumAge: 600000 }, opt || {}));
  });
}
function distM(a, b) {
  const R = 6371000, rad = x => x * Math.PI / 180, dLa = rad(b.lat - a.lat), dLo = rad(b.lng - a.lng);
  const h = Math.sin(dLa / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
let geoBusy = false, geoAt = 0;
function autoGym(force) {
  const L = gymLocs(), ids = Object.keys(L).filter(id => state.gyms.some(g => g.id === id));
  /* en el reloj (tiene sensor de pulso) no se usa el GPS: gasta mucha batería */
  /* en la web (computadora o navegador) no se pide la ubicación sola: solo en la app */
  if (!ids.length || state.settings.autoGym === false || (typeof IS_WEB !== 'undefined' && IS_WEB) || isWatch() || (state.bs && state.bs.hr) || state.draft || geoBusy) return;
  if (!force && Date.now() - geoAt < 10 * 60000) return;
  geoBusy = true; geoAt = Date.now();
  getPos().then(c => {
    geoBusy = false;
    const me = { lat: c.latitude, lng: c.longitude }, slack = Math.min(c.accuracy || 0, 150);
    let best = null;
    ids.forEach(id => { const d = distM(me, L[id]) - slack; if (d < 200 && (!best || d < best.d)) best = { id, d }; });
    if (!best) { state.atGym = null; return; }
    state.atGym = { id: best.id, at: Date.now() };
    if (best.id !== state.settings.activeGymId) {
      state.settings.activeGymId = best.id; state.editPlan = null; saveLocal();
      toast(`📍 Estás en ${activeGym().name}: cambié tu gimnasio.`);
    }
    if (!state.draft) render();
  }).catch(() => { geoBusy = false; });
}
/* Aviso en Entrenar al llegar */
const _vTrainGeo = vTrain;
vTrain = function () {
  const h = _vTrainGeo(), a = state.atGym;
  if (state.draft || isWatch() || !a || Date.now() - a.at > 3 * 3600000 || a.id !== activeGym().id) return h;
  if (state.sessions.some(s => dk(s.date) === dk(new Date()))) return h;
  const plan = activePlan(), nd = plan && nextDay(plan);
  if (!nd) return h;
  const card = `<div class="card geo-card"><span class="geo-ic">${ic('map-pin', 20)}</span><div class="grow" style="min-width:0"><b>Estás en ${esc(activeGym().name)}</b><small class="muted">Hoy toca ${esc(nd.name)}</small></div><button class="btn primary small" data-act="start" data-plan="${plan.id}" data-day="${nd.id}">Empezar</button></div>`;
  const g = h.indexOf('class="gympill"'), end = g < 0 ? -1 : h.indexOf('</button>', g);
  return end < 0 ? card + h : h.slice(0, end + 9) + card + h.slice(end + 9);
};
/* En "¿Dónde entrenas hoy?": guardar la ubicación */
function geoDecorate() {
  const sc = document.querySelector('#sheet .sheet-card'); if (!sc || !sc.querySelector('[data-act="gym-set"]')) return;
  if (sc.querySelector('.geo-box')) sc.querySelector('.geo-box').remove();
  const g = activeGym(), L = gymLocs(), has = !!L[g.id], any = Object.keys(L).length;
  const box = `<div class="geo-box"><div class="label">Cambio automático</div>
    <button class="btn block" data-act="geo-save">${ic('map-pin', 16)} ${has ? `Actualizar ubicación de ${esc(g.name)}` : `Estoy en ${esc(g.name)}: guardar ubicación`}</button>
    ${has ? `<div class="row" style="gap:8px"><span class="muted grow" style="font-size:12px">✓ Ubicación de ${esc(g.name)} guardada</span><button class="btn small" data-act="geo-del">Quitar</button></div>` : ''}
    ${any ? `<div class="row"><div class="grow" style="font-size:13px">Cambiar de gimnasio solo<div class="muted" style="font-size:11.5px">Al abrir la app cerca de un gimnasio guardado.</div></div><button class="switch ${state.settings.autoGym !== false ? 'on' : ''}" data-act="geo-auto" role="switch" aria-checked="${state.settings.autoGym !== false}" aria-label="Cambiar de gimnasio automáticamente"><i></i></button></div>` : '<div class="muted" style="font-size:11.5px">Guárdala estando dentro del gimnasio. La ubicación queda solo en tu cuenta y la app la mira únicamente al abrirse.</div>'}</div>`;
  sc.insertAdjacentHTML('beforeend', box);
}

document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-act]'); if (!b) return;
  const a = b.dataset.act;
  if (a === 'gym-pick') { setTimeout(geoDecorate, 0); return; }
  if (!/^(hc-|geo-)/.test(a)) return;
  if (a === 'hc-go') { ev.stopPropagation(); ev.preventDefault(); closeSheet(); state.tab = 'settings'; render(); setTimeout(() => { const c = document.querySelector('.hc-card'); c && c.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, 80); return; }
  ev.stopPropagation(); ev.preventDefault();
  if (a === 'hc-store') HCN.openStore().catch(() => {});
  if (a === 'hc-perm') HCN.openSettings().catch(() => {});
  if (a === 'hc-conn') HCN.request().then(s => { state.hc = s; if (s.any) { toast('Samsung Health conectado.'); hcSync(true); } else toast('No se dio permiso. Revisa que Samsung Health comparta con Health Connect.'); render(); }).catch(e => toast(String(e && e.message || e)));
  if (a === 'hc-sync') { b.disabled = true; b.textContent = 'Leyendo…'; hcSync(true).then(ok => { toast(ok ? 'Datos de Samsung Health actualizados.' : 'No se pudo leer.'); render(); }); }
  if (a === 'geo-save') {
    b.disabled = true; b.textContent = 'Buscando señal GPS… (sin internet puede tardar hasta 1 min)';
    getPos({ enableHighAccuracy: true, timeout: 60000, maximumAge: 0 }).then(c => {
      gymLocs()[activeGym().id] = { lat: +c.latitude.toFixed(6), lng: +c.longitude.toFixed(6), at: Date.now() };
      if (state.settings.autoGym == null) state.settings.autoGym = true;
      state.atGym = { id: activeGym().id, at: Date.now() };
      savePlans(); geoDecorate(); toast(`📍 Ubicación de ${activeGym().name} guardada (±${Math.round(c.accuracy || 0)} m).`);
    }).catch(e => { b.disabled = false; b.textContent = 'Reintentar'; toast(e && e.code === 1 ? 'Sin permiso de ubicación. Actívalo en Ajustes → Apps → Forja → Permisos.' : 'No se pudo obtener tu ubicación. Prueba cerca de una ventana.'); });
  }
  if (a === 'geo-del') { delete gymLocs()[activeGym().id]; savePlans(); geoDecorate(); }
  if (a === 'geo-auto') { state.settings.autoGym = state.settings.autoGym === false; savePlans(); geoDecorate(); }
}, true);

/* Arranque y al volver a la app */
function hcBoot() { hcStatus().then(s => { if (s && s.any) hcSync(); if (state.tab === 'settings') render(); }); }
if (HCN) hcBoot();
setTimeout(() => autoGym(true), 2500);
try { if (CAP && CAP.App) CAP.App.addListener('resume', () => { if (HCN) hcBoot(); autoGym(); }); } catch (e) {}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') autoGym(); });
bootRender();
