/* ==========================================================================
   Sueño automático con el uso del celular + recordatorio "Hora de dormir"
   - Android anota cuándo se prende y se apaga la pantalla (permiso "Acceso a datos de uso").
   - Dormiste = el bloque más largo con la pantalla apagada entre las 20:00 y las 12:00.
     Si prendes el celular en la madrugada (2 min o más) y vuelves a dormir antes de 45 min
     (10 min después de las 5:30), cuenta como un despertar y se resta. Los vistazos de menos
     de 2 min no cuentan.
   - Llena solo "¿Cómo llegas hoy?" (si no hay datos de Samsung Health, que tienen prioridad).
   - Hábito "Dormir a tiempo" con recordatorio a pantalla completa a las 22:30. Se marca solo
     si el celular muestra que te dormiste antes de las 23:15.
   ========================================================================== */
const PS = (CAP && CAP.PhoneSleep) || null;
state.ps = null;
const BED_LIMIT = { h: 23, m: 15 };
const MIN = 60000, HOUR = 3600000;

/* ---------- Cálculo ---------- */
function sleepNight(events, dayKey, now) {
  const D = new Date(dayKey + 'T00:00:00').getTime();
  const W0 = D - 4 * HOUR, W1 = Math.min(D + 12 * HOUR, now || Date.now());
  if (W1 - W0 < 3 * HOUR) return null;
  let st = 1;
  events.forEach(e => { if (e[0] <= W0) st = e[1]; });
  let t = W0, offs = [];
  events.forEach(e => {
    if (e[0] <= W0 || e[0] >= W1) return;
    if (st === 0 && e[1] === 1) offs.push([t, e[0]]);
    if (st === 1 && e[1] === 0) t = e[0];
    st = e[1];
  });
  if (st === 0) offs.push([t, W1]);
  /* vistazos de menos de 2 min: no cortan el sueño */
  const merged = [];
  offs.forEach(o => { const l = merged[merged.length - 1]; if (l && o[0] - l[1] < 2 * MIN) l[1] = o[1]; else merged.push(o.slice()); });
  const blocks = merged.filter(o => o[1] - o[0] >= 20 * MIN);
  if (!blocks.length) return null;
  /* preferir el bloque que cubre la madrugada (2:00-4:00); si no hay, el más largo */
  const night = blocks.map((b, i) => i).filter(i => blocks[i][0] <= D + 4 * HOUR && blocks[i][1] >= D + 2 * HOUR);
  const pool = night.length ? night : blocks.map((b, i) => i);
  let li = pool[0]; pool.forEach(i => { if (blocks[i][1] - blocks[i][0] > blocks[li][1] - blocks[li][0]) li = i; });
  if (blocks[li][1] - blocks[li][0] < 90 * MIN) return null;
  let s = blocks[li][0], e = blocks[li][1];
  /* despierto en la madrugada (antes de 5:30) puede durar hasta 45 min; después solo 10 min,
     porque al levantarte el celular también queda apagado un rato */
  const gapOk = (from, gap) => { const d = new Date(from), h = d.getHours() + d.getMinutes() / 60; return gap <= ((h >= 5.5 && h < 12) ? 10 : 45) * MIN; };
  const wakes = [];
  for (let j = li - 1; j >= 0 && gapOk(blocks[j][1], s - blocks[j][1]); j--) { wakes.unshift([blocks[j][1], Math.round((s - blocks[j][1]) / MIN)]); s = blocks[j][0]; }
  for (let j = li + 1; j < blocks.length && gapOk(e, blocks[j][0] - e); j++) { wakes.push([e, Math.round((blocks[j][0] - e) / MIN)]); e = blocks[j][1]; }
  const min = Math.round((e - s) / MIN) - wakes.reduce((a, w) => a + w[1], 0);
  if (min < 180) return null;
  return { s, e, min, w: wakes };
}

/* ---------- Leer y guardar ---------- */
let psBusy = false;
function psStatus() { if (!PS) return Promise.resolve(null); return PS.status().then(s => { state.ps = s; return s; }).catch(() => null); }
function psSync() {
  if (!PS || psBusy || !state.ps || !state.ps.access || isWatch()) return Promise.resolve(false);
  psBusy = true;
  const now = Date.now();
  return PS.screen({ from: Math.round(now - 8 * 86400000), to: Math.round(now) }).then(r => {
    psBusy = false;
    const ev = ((r && r.events) || []).map(x => [+x[0], +x[1]]).sort((a, b) => a[0] - b[0]);
    let ch = false;
    for (let i = 0; i < 7; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const k = dk(d), n = sleepNight(ev, k, now);
      if (!n) continue;
      const t = state.daily[k] = state.daily[k] || { water: 0 };
      if (JSON.stringify(t.sleepPh) !== JSON.stringify(n)) { t.sleepPh = n; ch = true; }
      if (t.sleepSrc !== 'sh' && t.sleepMin !== n.min) { t.sleepMin = n.min; t.sleepSrc = 'ph'; ch = true; }
      /* "Dormir a tiempo": la noche anterior, si te dormiste antes de las 23:15 */
      const night = new Date(n.s - 6 * HOUR), nk = dk(night), lim = new Date(night); lim.setHours(BED_LIMIT.h, BED_LIMIT.m, 0, 0);
      if (habList().some(h => h.k === 'hsleep') && n.s <= lim.getTime()) {
        const tn = state.daily[nk] = state.daily[nk] || { water: 0 };
        if (!tn.hsleep) { tn.hsleep = true; tn.edited = Date.now(); ch = true; }
      }
    }
    LS.set('psLast', Date.now());
    if (ch) saveDaily();
    if (typeof hcReadyAuto === 'function') hcReadyAuto();
    if (ch) render();
    return true;
  }).catch(() => { psBusy = false; return false; });
}

/* ---------- Tarjeta "¿Cómo llegas hoy?": pedir el permiso si falta ---------- */
const _readyCardPS = readyCard;
readyCard = function () {
  const h = _readyCardPS();
  if (!PS || isWatch() || today().sleepMin || !state.ps || !state.ps.supported || state.ps.access) return h;
  const msg = `<div class="hc-ready none">Para medir tu sueño solo, activa <b>Acceso a datos de uso</b> para Forja. <button type="button" class="btn small" data-act="ps-access">Activar</button></div>`;
  return h.indexOf('class="hc-ready none"') >= 0 ? h.replace(/<div class="hc-ready none">[\s\S]*?<\/div>/, msg) : h.replace(/(<\/h3>)/, '$1' + msg);
};

/* ---------- Ajustes ---------- */
function psCard() {
  if (isWatch()) return '';
  if (!PS) return `<div class="card ps-card"><h3>${ic('moon', 17)} Sueño con el celular</h3><div class="muted" style="font-size:12.5px">Se mide en la app del celular: Android anota cuándo apagas y prendes la pantalla.</div></div>`;
  const s = state.ps; if (!s) return '';
  if (!s.supported) return `<div class="card ps-card"><h3>${ic('moon', 17)} Sueño con el celular</h3><div class="muted" style="font-size:12.5px">Necesita Android 9 o más nuevo.</div></div>`;
  const hm = x => new Date(x).toTimeString().slice(0, 5);
  const rows = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const t = state.daily[dk(d)] || {}, p = t.sleepPh;
    rows.push(`<div class="ps-row"><span class="ps-d">${WDL[d.getDay()].slice(0, 2)} ${d.getDate()}</span>${p ? `<span class="num">${hm(p.s)} → ${hm(p.e)}</span><b class="num">${fmtHM(p.min)}</b>${p.w && p.w.length ? `<small>${p.w.length} desp.</small>` : '<small></small>'}` : '<span class="muted">sin datos</span><b></b><small></small>'}</div>`);
  }
  return `<div class="card ps-card"><h3>${ic('moon', 17)} Sueño con el celular</h3>
    ${s.access ? `<div class="muted" style="font-size:12.5px">Se calcula con la hora en que apagas y vuelves a prender el celular. Si en la madrugada lo usas más de 2 min, cuenta como despertar.</div>
      <div class="ps-list">${rows.join('')}</div>
      <button class="btn small" data-act="ps-sync" style="align-self:flex-start">Recalcular</button>`
    : `<div class="muted" style="font-size:12.5px">Forja puede saber cuánto dormiste mirando cuándo apagas y prendes el celular. Solo se lee la hora de la pantalla, no qué apps usas.</div>
      <ol class="hc-steps"><li>Toca <b>Activar</b>.</li><li>Busca <b>Forja</b> en la lista y activa <b>Permitir acceso de uso</b>.</li><li>Vuelve a Forja.</li></ol>
      <button class="btn primary small" data-act="ps-access" style="align-self:flex-start">Activar</button>`}</div>`;
}
const _vSettingsPS = vSettings;
vSettings = function () { return _vSettingsPS() + psCard(); };

document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-act="ps-access"],[data-act="ps-sync"]'); if (!b) return;
  ev.stopPropagation(); ev.preventDefault();
  if (b.dataset.act === 'ps-access' && PS) { closeSheet(); PS.openAccess().catch(() => {}); toast('Busca Forja en la lista y activa el acceso. Luego vuelve.'); }
  if (b.dataset.act === 'ps-sync') { b.disabled = true; psStatus().then(() => psSync()).then(ok => { toast(ok ? 'Sueño recalculado.' : 'No se pudo leer.'); render(); }); }
}, true);

/* ---------- Hábito "Dormir a tiempo" + recordatorio 22:30 (una sola vez) ---------- */
if (!state.settings.bedtime1 && !isWatch()) {
  const list = habList();
  if (!list.some(h => h.k === 'hsleep')) list.push({ k: 'hsleep', name: 'Dormir a tiempo', dose: 'Antes de 23:15', icon: 'moon' });
  if (!state.reminders.some(r => r.kind === 'hab' && r.hab === 'hsleep')) {
    state.reminders.push({ id: 'r-bed', kind: 'hab', hab: 'hsleep', label: 'Hora de dormir: deja el celular 😴', time: '22:30', days: [0, 1, 2, 3, 4, 5, 6], on: true });
  }
  state.settings.bedtime1 = 1;
  savePlans(); saveReminders();
}

/* ---------- Arranque ---------- */
function psBoot() { psStatus().then(s => { if (s && s.access) psSync(); else if (state.tab === 'settings') render(); }); }
if (PS) {
  psBoot();
  try { CAP.App.addListener('resume', psBoot); } catch (e) {}
}
bootRender();
