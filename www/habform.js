/* ==========================================================================
   Tanda F · Ajustes de hábitos y recordatorios (no cambia cómo suenan ni la pantalla completa)
   1. ⚙ en vez de la campanita: en "Tus hábitos" cada hábito tiene ⚙ que abre "Editar hábito" (hábito + su
      recordatorio); la rueda de "Hábitos de hoy" abre "Tus hábitos". Nunca duplica: usa los recordatorios
      que ya tienen ese hábito (`habKeyOf`).
   2. Un solo formulario para crear y editar: nombre, ícono, meta y "Recordarme" (una o varias horas, días,
      pantalla completa, sonido, "Si lo cierras con ✕" y "Aplazar"); un solo Guardar. Cada hora es un recordatorio.
   3. Tiempos libres de 1 min a 12 h: `r.again` (✕: 0 = no volver a avisar hoy) y `r.snz` (Aplazar, por defecto
      15). En el aviso: "Aplazar X min" y −/+ solo esa vez (de 1 en 1 hasta 10 y luego de 5 en 5). Agua, Entrenar
      y Personalizado también. El lado nativo lee `snz` de cada aviso (HabitAlarms.snzOf).
   ========================================================================== */
const HF_MIN = 1, HF_MAX = 720;
const hfClamp = m => Math.max(HF_MIN, Math.min(HF_MAX, Math.round(+m || 0)));
/* "7 min", "1 hora", "1 h 30 min", "2 horas" (igual que el nativo) */
const hfTxt = m => { m = Math.round(+m || 0); if (m < 60) return m + ' min'; const h = Math.floor(m / 60), r = m % 60; return r ? `${h} h ${r} min` : h + (h === 1 ? ' hora' : ' horas'); };
const HF_QUICK = [1, 3, 5, 10, 15, 30, 60];
const hfStep = (m, d) => (d < 0 ? (m <= 10 ? Math.max(1, m - 1) : m - 5) : (m < 10 ? m + 1 : Math.min(HF_MAX, m + 5)));

/* ---------- Cada aviso lleva su "Aplazar" y su ✕ (también agua, entrenar y personalizado) ---------- */
const _haItemForHF = haItemFor;
haItemFor = function (r, ri, at, d) {
  const it = _haItemForHF(r, ri, at, d); if (!it) return it;
  it.snz = r.snz ? hfClamp(r.snz) : 15;
  it.again = +r.again > 0 ? hfClamp(r.again) : 0;
  if (it.habit) it.body = [habBody(it.habit), it.again > 0 ? `✕ te lo vuelve a recordar cada ${hfTxt(it.again)}` : ''].filter(Boolean).join(' · ');   // haAgainTxt es const: el texto se rehace aquí
  if (r.ring) it.ring = +r.ring;
  return it;
};
const _haItemsHF = haItems;
haItems = function () {
  const ring = haRing();
  return _haItemsHF().map(x => { const r = x.id >= 3000 && x.id < 3990 ? state.reminders[Math.floor((x.id - 3000) / 20)] : null; return r && r.ring ? Object.assign({}, x, { ring: +r.ring }) : x.ring == null ? Object.assign({}, x, { ring }) : x; });
};
/* En la app (pantalla completa propia): Aplazar con el tiempo del recordatorio */
const _haShowHF = haShow;
haShow = function (it) {
  _haShowHF(it);
  haMin = it && it.snz ? hfClamp(it.snz) : 15;
  const p = document.querySelector('#hab-alarm .ha-pill'); if (p) p.textContent = 'Aplazar ' + hfTxt(haMin);
};
window.addEventListener('click', ev => {
  const b = ev.target.closest && ev.target.closest('#hab-alarm [data-act="ha-min"], #hab-alarm [data-act="ha-snooze"], #hab-alarm [data-act="ha-no"]'); if (!b) return;
  const a = b.dataset.act;
  if (a === 'ha-min') {
    ev.stopPropagation(); ev.preventDefault();
    haMin = hfStep(haMin, +b.dataset.d < 0 ? -1 : 1);
    const p = document.querySelector('#hab-alarm .ha-pill'); if (p) p.textContent = 'Aplazar ' + hfTxt(haMin);
  } else if (a === 'ha-snooze' && haCur) {
    ev.stopPropagation(); ev.preventDefault();
    const it = Object.assign({}, haCur, { at: Date.now() + haMin * 60000, id: 3990 + (state.haSnz.length % 9), shown: 0 });
    state.haSnz.push(it); haHide(); scheduleSoon(); toast('Te lo recuerdo en ' + hfTxt(haMin));
  } else if (a === 'ha-no' && haCur && +haCur.again > 0) {   // ✕ también repite en agua, entrenar y personalizado
    ev.stopPropagation(); ev.preventDefault();
    const it = haCur, at = haAgainAt(it); haHide();
    if (at) { state.haSnz.push(Object.assign({}, it, { at, id: 3990 + (state.haSnz.length % 9), shown: 0 })); scheduleSoon(); toast('Te lo recuerdo en ' + hfTxt(it.again)); }
  }
}, true);

/* ---------- Campos de tiempo libre (se usan en los dos formularios) ---------- */
function hfAgainHtml(ag) {
  const on = +ag > 0, h = on && +ag % 60 === 0 && +ag >= 60;
  return `<div class="field hf-ag"><span class="label">Si lo cierras con ✕</span>
    <div class="seg hf-seg"><button type="button" class="${on ? '' : 'on'}" data-hf="ag-off">No volver a avisar hoy</button><button type="button" class="${on ? 'on' : ''}" data-hf="ag-on">Repetir cada…</button></div>
    <div class="hf-time" ${on ? '' : 'hidden'}><input id="hf-ag-n" inputmode="numeric" value="${on ? (h ? ag / 60 : ag) : 10}" aria-label="Cada cuánto"><select id="hf-ag-u" aria-label="Unidad"><option value="1" ${h ? '' : 'selected'}>min</option><option value="60" ${h ? 'selected' : ''}>h</option></select></div>
    <div class="hf-quick" ${on ? '' : 'hidden'}>${HF_QUICK.map(m => `<button type="button" class="gchip ${+ag === m ? 'on' : ''}" data-hf="ag-q" data-v="${m}">${m < 60 ? m + ' min' : '1 h'}</button>`).join('')}</div>
    <input type="hidden" id="rm-again" value="${on ? ag : 0}">
    <small class="muted">Cada ✕ lo vuelve a programar después de ese tiempo, las veces que haga falta. Solo ese día, hasta las 23:00; si lo marcas como hecho, ya no vuelve.</small></div>`;
}
function hfSnzHtml(snz) {
  const s = snz ? hfClamp(snz) : 15, h = s % 60 === 0 && s >= 60;
  return `<div class="field hf-sz"><span class="label">Aplazar</span>
    <div class="hf-time"><input id="hf-sz-n" inputmode="numeric" value="${h ? s / 60 : s}" aria-label="Tiempo de Aplazar"><select id="hf-sz-u" aria-label="Unidad"><option value="1" ${h ? '' : 'selected'}>min</option><option value="60" ${h ? 'selected' : ''}>h</option></select></div>
    <small class="muted">El aviso dice "Aplazar ${hfTxt(s)}". Con − / + lo cambias solo esa vez.</small></div>`;
}
const hfRead = (n, u) => { const a = document.getElementById(n), b = document.getElementById(u); const v = parseFloat(String(a ? a.value : '').replace(',', '.')); return isFinite(v) && v > 0 ? hfClamp(v * (b ? +b.value : 1)) : null; };
function hfSyncAgain() {
  const box = document.querySelector('#sheet .hf-ag'); if (!box) return;
  const on = box.querySelector('[data-hf="ag-on"]').classList.contains('on'), v = on ? hfRead('hf-ag-n', 'hf-ag-u') || 10 : 0;
  const hid = document.getElementById('rm-again'); if (hid) hid.value = v;
  box.querySelectorAll('[data-hf="ag-q"]').forEach(c => c.classList.toggle('on', +c.dataset.v === v));
  if (state.hF) state.hF.again = v;
}

/* ---------- 3b. Formulario de recordatorio (agua, entrenar, personalizado y los viejos): tiempos libres ---------- */
const _haFieldHF = haField;
haField = function (r) {
  const h = _haFieldHF(r), a = h.indexOf('<div class="field" id="rm-again-f"');
  const base = a < 0 ? h : h.slice(0, a);
  return base + `<div id="rm-again-f">${hfAgainHtml(r ? +r.again || 0 : 0)}${hfSnzHtml(r ? r.snz : 15)}</div>`;
};
/* La ✕ y Aplazar valen para todos los tipos: el campo no se oculta */
const _haSyncHF = haSync;
haSync = function (force) { _haSyncHF(force); const fa = document.getElementById('rm-again-f'); if (fa) fa.hidden = false; };
let hfPend = null;
window.addEventListener('submit', ev => {
  const f = ev.target; if (!f || f.id !== 'f-rem') return;
  hfSyncAgain();
  hfPend = { i: f.dataset.i === '' ? null : +f.dataset.i, n: state.reminders.length, again: +(document.getElementById('rm-again') || {}).value || 0, snz: hfRead('hf-sz-n', 'hf-sz-u') || 15 };
}, true);
const _saveRemHF = saveReminders;
saveReminders = function () {
  const p = hfPend; hfPend = null;
  _saveRemHF();
  if (!p) return;
  const r = p.i != null ? state.reminders[p.i] : (state.reminders.length > p.n ? state.reminders[state.reminders.length - 1] : null);
  if (!r) return;
  if (p.again > 0) r.again = p.again; else delete r.again;
  if (p.snz && p.snz !== 15) r.snz = p.snz; else delete r.snz;
  _saveRemHF();
};

/* ---------- 2. Formulario único: hábito + recordatorio ---------- */
const hfRems = k => state.reminders.filter(r => habKeyOf(r) === k);
function habForm(k) {
  const h = k ? habList().find(x => x.k === k) : null, L = k ? hfRems(k) : [], on = L.filter(r => r.on), r0 = on[0] || L[0];
  state.hF = { k: k || null, name: h ? h.name : '', dose: h ? h.dose || '' : '', icon: h ? h.icon || 'pill' : 'pill',
    rem: !!on.length, times: (on.length ? on : L).map(r => r.time).filter(Boolean), days: r0 ? r0.days.slice() : [1, 2, 3, 4, 5, 6, 0],
    fs: r0 ? haFull(r0) : true, again: r0 ? +r0.again || 0 : 0, snz: r0 && r0.snz ? +r0.snz : 15, ring: r0 && r0.ring ? +r0.ring : 0, label: r0 ? r0.label || '' : '' };
  if (!state.hF.times.length) state.hF.times = ['21:00'];
  hfView();
}
function hfView() {
  const F = state.hF; if (!F) return;
  const ringOpts = [[0, 'Como en Ajustes']].concat(HA_DUR);
  openSheet(`<div class="row"><h2 class="grow">${F.k ? 'Editar hábito' : 'Nuevo hábito'}</h2><button class="icon-btn" data-act="sheet-close" aria-label="Cerrar">${ic('x', 18)}</button></div>
    ${F.err ? `<div class="se-err" role="alert">${esc(F.err)}</div>` : ''}
    <label class="field"><span class="label">Nombre</span><input id="hf-name" maxlength="22" placeholder="Ej. Leer 20 min, Vitamina D" value="${esc(F.name)}"></label>
    <label class="field"><span class="label">Meta o dosis (opcional)</span><input id="hf-dose" maxlength="22" placeholder="Ej. 20 min, 1 cápsula" value="${esc(F.dose)}"></label>
    <div class="hm-icons">${HAB_ICONS.map(i => `<label><input type="radio" name="hf-icon" value="${i}" ${F.icon === i ? 'checked' : ''}><span>${ic(i, 18)}</span></label>`).join('')}</div>
    <div class="row hf-row"><span class="grow"><b>Recordarme</b><br><small class="muted">Un aviso a la hora que elijas.</small></span><button type="button" class="switch ${F.rem ? 'on' : ''}" data-hf="rem" role="switch" aria-checked="${F.rem}" aria-label="Recordarme"><i></i></button></div>
    ${F.rem ? `<div class="hf-rem">
      <div class="field"><span class="label">Hora${F.times.length > 1 ? 's' : ''}</span>${F.times.map((t, i) => `<div class="row hf-trow"><input type="time" class="hf-t" data-i="${i}" value="${t}" aria-label="Hora ${i + 1}">${F.times.length > 1 ? `<button type="button" class="icon-btn sm" data-hf="t-del" data-i="${i}" aria-label="Quitar esta hora">${ic('x', 16)}</button>` : ''}</div>`).join('')}
        ${F.times.length < 6 ? `<button type="button" class="btn small" data-hf="t-add">${ic('plus', 15)} Otra hora</button>` : ''}</div>
      <div class="field"><span class="label">Días</span><div class="daypick">${[1, 2, 3, 4, 5, 6, 0].map(d => `<label><input type="checkbox" class="hf-d" value="${d}" ${F.days.indexOf(d) >= 0 ? 'checked' : ''}><span>${WD1[d]}</span></label>`).join('')}</div></div>
      ${isWatch() ? '' : `<div class="row hf-row"><span class="grow"><b>Aparecer en toda la pantalla</b><br><small class="muted">Como un despertador: ✓ hecho, ✕ o aplazar.</small></span><button type="button" class="switch ${F.fs ? 'on' : ''}" data-hf="fs" role="switch" aria-checked="${F.fs}" aria-label="Aparecer en toda la pantalla"><i></i></button></div>`}
      <div class="field"><span class="label">Sonido</span><div class="seg hf-ring">${ringOpts.map(([v, l]) => `<button type="button" class="${F.ring === v ? 'on' : ''}" data-hf="ring" data-v="${v}">${esc(l)}</button>`).join('')}</div></div>
      ${hfAgainHtml(F.again)}${hfSnzHtml(F.snz)}
    </div>` : ''}
    ${F.k && !SUPS_BASE.includes(F.k) ? `<button type="button" class="btn danger block" data-hf="del">${state.confirm === 'hf-del' ? '¿Borrar el hábito? Toca otra vez' : ic('trash-2', 15) + ' Borrar hábito'}</button>` : ''}
    <div class="grid2"><button type="button" class="btn" data-hf="back">Cancelar</button><button type="button" class="btn primary" data-hf="save">Guardar</button></div>`);
  const c = document.querySelector('#sheet .sheet-card'); if (c && F.scroll) c.scrollTop = F.scroll;
  try { document.activeElement.blur(); } catch (e) {}
}
function hfKeep() {
  const F = state.hF, c = document.querySelector('#sheet .sheet-card'); if (!F) return;
  if (c) F.scroll = c.scrollTop;
  const n = document.getElementById('hf-name'), d = document.getElementById('hf-dose'), ic0 = document.querySelector('#sheet input[name="hf-icon"]:checked');
  if (n) F.name = n.value; if (d) F.dose = d.value; if (ic0) F.icon = ic0.value;
  const ts = document.querySelectorAll('#sheet .hf-t'); if (ts.length) F.times = Array.prototype.map.call(ts, t => t.value || '21:00');
  const ds = document.querySelectorAll('#sheet .hf-d'); if (ds.length) F.days = Array.prototype.filter.call(ds, x => x.checked).map(x => +x.value);
  if (document.querySelector('#sheet .hf-ag')) hfSyncAgain();
  const sz = hfRead('hf-sz-n', 'hf-sz-u'); if (sz) F.snz = sz;
}
function hfSave() {
  hfKeep();
  const F = state.hF, name = String(F.name || '').trim();
  F.err = !name ? 'Escribe el nombre del hábito.' : F.rem && !F.days.length ? 'Elige al menos un día.' : F.rem && !F.times.every(t => /^\d{2}:\d{2}$/.test(t)) ? 'Revisa la hora.' : null;
  if (F.err) { F.scroll = 0; return hfView(); }
  /* El hábito */
  const list = habList();
  let k = F.k;
  if (k) { const h = list.find(x => x.k === k); if (h) Object.assign(h, { name, dose: String(F.dose || '').trim(), icon: F.icon }); }
  else { k = 'h' + uid(); list.push({ k, name, dose: String(F.dose || '').trim(), icon: F.icon }); }
  /* Su recordatorio: una entrada por hora; se reutilizan las que ya tiene ese hábito (nunca se duplica) */
  const mine = state.reminders.map((r, i) => ({ r, i })).filter(x => habKeyOf(x.r) === k);
  if (F.rem) {
    const times = F.times.filter((t, i, a) => a.indexOf(t) === i);
    times.forEach((t, j) => {
      let r = mine[j] && mine[j].r;
      if (!r) { r = { kind: 'hab', hab: k, label: '', time: t, days: [], on: true }; state.reminders.push(r); }
      Object.assign(r, { kind: 'hab', hab: k, time: t, days: F.days.slice().sort(), on: true, fs: !!F.fs, label: r.label && F.k ? r.label : name });
      if (F.again > 0) r.again = hfClamp(F.again); else delete r.again;
      if (F.snz && F.snz !== 15) r.snz = hfClamp(F.snz); else delete r.snz;
      if (F.ring) r.ring = F.ring; else delete r.ring;
    });
    const extra = mine.slice(times.length).map(x => x.r);
    state.reminders = state.reminders.filter(r => extra.indexOf(r) < 0);
  } else mine.forEach(x => { x.r.on = false; });
  savePlans(); saveReminders();
  const nw = !F.k; state.hF = null; state.confirm = null;
  habManage(); render();
  toast(nw ? `"${name}" agregado${F.rem ? ' con su recordatorio' : ''}. ¡A sumar racha!` : 'Hábito guardado.');
}

/* ---------- 1. "Tus hábitos" con ⚙ por hábito y "+ Nuevo hábito" ---------- */
const _habManageHF = habManage;
habManage = function (edit) {
  if (edit) return habForm(edit);
  _habManageHF();
  const sc = document.querySelector('#sheet .sheet-card'); if (!sc) return;
  sc.querySelectorAll('[data-act="ha-rem"]').forEach(b => b.remove());
  sc.querySelectorAll('.hm-row [data-act="hm-edit"]').forEach(b => {
    const k = b.dataset.k, has = state.reminders.some(r => r.on && habKeyOf(r) === k), h = habOf(k);
    b.outerHTML = `<button class="icon-btn sm ${has ? 'ha-on' : ''}" data-hf="open" data-k="${k}" aria-label="Ajustes de ${esc(h ? h.name : '')}">${ic('settings', 16)}</button>`;
  });
  const fm = sc.querySelector('#f-hab'); if (fm) fm.outerHTML = `<button type="button" class="btn primary block" data-hf="new">${ic('plus', 16)} Nuevo hábito</button>
    <button type="button" class="btn block" data-hf="remset">${ic('bell', 16)} Ajustes de los recordatorios</button>`;
};
/* "Hábitos de hoy": la rueda abre "Tus hábitos" (ahí está el ⚙ de cada uno) */
window.addEventListener('click', ev => {
  const b = ev.target.closest && ev.target.closest('#habits [data-act="hab-rem"]'); if (!b || isWatch()) return;
  ev.stopPropagation(); ev.preventDefault(); state.confirm = null; habManage();
}, true);

document.addEventListener('click', ev => {
  const b = ev.target.closest && ev.target.closest('[data-hf]'); if (!b) return;
  ev.preventDefault(); ev.stopPropagation();
  const a = b.dataset.hf, F = state.hF;
  if (a === 'open') { state.confirm = null; habForm(b.dataset.k); return; }
  if (a === 'new') { state.confirm = null; habForm(null); return; }
  if (a === 'remset') { closeSheet(); state.tab = 'settings'; render(); setTimeout(() => { const t = [...document.querySelectorAll('#app h3')].find(x => /Recordatorios/.test(x.textContent)); if (t) { const c = t.closest('.card') || t; c.style.scrollMarginTop = '12px'; c.scrollIntoView({ block: 'start' }); const top = t.getBoundingClientRect().top; if (top < 12) window.scrollBy(0, top - 12); } }, 60); return; }
  /* Campos de tiempo (también en el formulario de recordatorio) */
  if (a === 'ag-off' || a === 'ag-on') {
    const box = b.closest('.hf-ag'); box.querySelector('[data-hf="ag-off"]').classList.toggle('on', a === 'ag-off'); box.querySelector('[data-hf="ag-on"]').classList.toggle('on', a === 'ag-on');
    box.querySelector('.hf-time').hidden = box.querySelector('.hf-quick').hidden = a === 'ag-off'; hfSyncAgain(); return;
  }
  if (a === 'ag-q') { const n = document.getElementById('hf-ag-n'), u = document.getElementById('hf-ag-u'), v = +b.dataset.v; if (n) n.value = v % 60 === 0 ? v / 60 : v; if (u) u.value = v % 60 === 0 ? '60' : '1'; hfSyncAgain(); return; }
  if (!F) return;
  hfKeep();
  if (a === 'back') { state.hF = null; state.confirm = null; habManage(); return; }
  if (a === 'save') { hfSave(); return; }
  if (a === 'del') {
    if (state.confirm !== 'hf-del') { state.confirm = 'hf-del'; return hfView(); }
    state.settings.habits = habList().filter(x => x.k !== F.k); state.reminders = state.reminders.filter(r => habKeyOf(r) !== F.k);
    savePlans(); saveReminders(); state.hF = null; state.confirm = null; habManage(); render(); toast('Hábito borrado.'); return;
  }
  if (a === 'rem') F.rem = !F.rem;
  else if (a === 'fs') F.fs = !F.fs;
  else if (a === 'ring') F.ring = +b.dataset.v;
  else if (a === 't-add') F.times.push(F.times[F.times.length - 1] || '21:00');
  else if (a === 't-del') F.times.splice(+b.dataset.i, 1);
  else return;
  F.err = null; hfView();
}, true);
document.addEventListener('input', ev => { if (ev.target && (ev.target.id === 'hf-ag-n')) hfSyncAgain(); });
document.addEventListener('change', ev => { if (ev.target && (ev.target.id === 'hf-ag-u')) hfSyncAgain(); });
bootRender();
