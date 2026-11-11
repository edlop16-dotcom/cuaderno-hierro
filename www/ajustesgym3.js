/* ==========================================================================
   Ajustes del gimnasio 3 (rama ajustes-gym-3). Solo el teléfono: el reloj no cambia (`isWatch()` en cada envoltura).
   1. Pantalla automática en la sesión (`settings.autoScr`, apagada por defecto): sin tocar nada 20 s, pantalla negra con
      el brillo al mínimo (Android no deja apagarla sin permisos de administrador); se vuelve a ver sola cuando toca marcar
      la serie (lo que sueles tardar con ese ejercicio, `g3SetSec`). Tocarla cancela el apagado de esa serie. La pantalla de
      "Descanso terminado" se cierra sola a los 10 s. Salir de la sesión después de oscurecerla pide tu patrón.
   2. Tu semana en Hoy: mapa, músculos que faltan y "Crear entreno para completar"; al tocarla, el reporte completo.
   3. Hoy vs anterior: un cuadro compacto para captura, con "Copiar como texto", al terminar y en el detalle del día.
   4. El análisis de una sesión guardada se arma al tocarlo (sin depender del plegable del sistema) y no sale vacío.
   ========================================================================== */

/* ---------- 1. Pantalla automática ---------- */
const G3_IDLE = 20000, G3_REST_TXT = 10000;
const g3On = () => !isWatch() && state.settings.autoScr === true;
const g3HA = () => { const C = window.Capacitor, H = C && C.Plugins && C.Plugins.HabitAlarm; return H || null; };
const g3 = { touch: Date.now(), dim: false, cancel: false, guard: false, re: 0, rEnd: 0, wake: 0 };
/* Lo que sueles tardar en una serie de ese ejercicio: del fin del descanso a marcarla (mediana de tus últimas 20);
   sin datos, por las repeticiones: unos 3 s por rep más 5 s para acomodarte */
function g3SetSec(e, j) {
  const L = [];
  for (const s of state.sessions) { if (L.length >= 20) break; const x = !s.approx && exIn(s, e.name); if (x) x.sets.forEach(t => { if (+t.dur > 0 && L.length < 20) L.push(+t.dur); }); }
  if (L.length >= 2) { L.sort((a, b) => a - b); return { s: Math.round(L[Math.floor(L.length / 2)]), src: 'hist', n: L.length }; }
  const s = e.log[j] || {}, rx = typeof agRxOf === 'function' && state.draft ? agRxOf(state.draft, e) : null;
  const r = +s.r || pgGoalReps(e, j) || 10;
  return { s: Math.max(15, Math.min(180, rx && rx.sec ? r + 5 : r * 3 + 5)), src: 'reps', n: 0 };
}
function g3Dim(on) {
  if (g3.dim === on) return; g3.dim = on;
  let el = document.getElementById('g3-dim');
  if (on && !el) { document.body.insertAdjacentHTML('beforeend', '<div id="g3-dim" role="button" aria-label="Pantalla en reposo: toca para volver a la sesión"></div>'); el = document.getElementById('g3-dim'); }
  if (el) el.hidden = !on;
  const H = g3HA(); if (H && typeof H.dim === 'function') Promise.resolve(H.dim({ on })).catch(() => {});
  if (on) g3.guard = true;   /* la pantalla estuvo sin vigilar: salir de la sesión pedirá tu patrón */
}
function g3Wake(buzz) {
  g3Dim(false); g3.touch = Date.now();
  if (buzz && state.settings.setVibe !== false) { try { navigator.vibrate && navigator.vibrate(180); } catch (e) {} }
}
/* La serie que sigue: la del ejercicio en pantalla */
/* La serie que sigue: la del ejercicio en pantalla; si ya lo terminaste, la del siguiente que te toca */
function g3Next(d) {
  let i = Math.min(d.cur || 0, d.exercises.length - 1), e = d.exercises[i];
  if (e && exComplete(e) && typeof g2NextOf === 'function') { const k = g2NextOf(d, i); e = k == null ? null : d.exercises[k]; }
  const j = e ? e.log.findIndex(x => !x.done) : -1; return j < 0 ? null : { e, j };
}
function g3Loop() {
  const d = state.draft, now = Date.now();
  if (state.rest && !isWatch()) g3.rEnd = state.rest.end;   /* también con la pantalla apagada o la app atrás */
  const live = g3On() && d && typeof sxOpenNow === 'function' && sxOpenNow() && document.visibilityState !== 'hidden' && !document.querySelector('#sheet:not([hidden]) .sheet-card');
  if (!live) { if (g3.dim) g3Dim(false); return; }
  const r = state.rest;
  /* Fin del descanso: desde aquí se cuenta lo que tardas en la serie (aunque la app no lo viera terminar, p. ej. con la pantalla apagada) */
  if (!g3.re && g3.rEnd && g3.rEnd <= now) g3.re = g3.rEnd;
  if (r && !r.rang && r.end > now) {          /* descansando: se oscurece y vuelve a verse justo antes del final */
    if (g3.dim && r.end - now <= 2000) g3Wake(false);
    else if (!g3.dim && !g3.cancel && now - g3.touch >= G3_IDLE && r.end - now > 8000) g3Dim(true);
    return;
  }
  const N = g3Next(d); if (!N) { if (g3.dim) g3Wake(false); return; }
  const from = g3.re || g3.touch, wake = from + g3SetSec(N.e, N.j).s * 1000; g3.wake = wake;
  if (g3.dim && now >= wake) return g3Wake(true);   /* ya toca marcar la serie */
  if (!g3.dim && !g3.cancel && now - g3.touch >= G3_IDLE && wake - now > 5000) g3Dim(true);
}
setInterval(g3Loop, 1000);
/* El fin del descanso se anota al empezarlo (y cada cambio de ±15 s lo vuelve a anotar el ciclo de arriba) */
const _startRestG3 = startRest;
startRest = function () { const r = _startRestG3.apply(this, arguments); if (!isWatch() && state.rest) g3.rEnd = state.rest.end; return r; };
/* Cualquier toque: cuenta como actividad; con la pantalla negra, la vuelve a mostrar y cancela el apagado de esta serie */
['pointerdown', 'touchstart', 'keydown'].forEach(t => document.addEventListener(t, ev => {
  g3.touch = Date.now();
  if (g3.dim) { g3.cancel = true; g3Dim(false); if (ev.cancelable && ev.target && ev.target.id === 'g3-dim') ev.preventDefault(); }
}, { capture: true, passive: false }));
document.addEventListener('click', ev => { if (ev.target && ev.target.id === 'g3-dim') { ev.preventDefault(); ev.stopPropagation(); } }, true);
/* Al marcar una serie: su tiempo (desde el fin del descanso) queda guardado y la siguiente vuelve a tener apagado automático */
const _markSetG3 = markSet;
markSet = function (i, j, v, k) {
  const d = state.draft, s = d && d.exercises[i] && d.exercises[i].log[j], was = !!(s && s.done);
  const r = _markSetG3.apply(this, arguments);
  if (isWatch() || k != null || !s || was || !s.done) return r;
  const re = g3.re || (g3.rEnd && g3.rEnd <= Date.now() ? g3.rEnd : 0), at = s.at || Date.now(), sec = Math.round((at - re) / 1000);
  if (re && sec >= 5 && sec <= 300) { s.dur = sec; saveDraft(); }
  g3.re = 0; g3.rEnd = state.rest ? state.rest.end : 0;   /* el descanso que empieza ahora */
  g3.cancel = false; g3.touch = Date.now(); if (g3.dim) g3Dim(false);
  return r;
};
const _finishG3 = finishSession;
finishSession = function () {
  const d = state.draft, id = d && d.id;
  if (!d || isWatch()) return _finishG3.apply(this, arguments);
  const rows = d.exercises.map(e => ({ name: e.name, ss: (typeof ssOf === 'function' && ssOf(d, e)) || ((typeof agSsDone === 'function' ? agSsDone(d) : []).indexOf(e.name) >= 0 ? 'S' : ''), dur: e.log.filter(s => s.done).map(s => s.dur || 0) }));
  const r = _finishG3.apply(this, arguments);
  const s = !state.draft && state.sessions.find(x => x.id === id);
  if (s) {
    rows.forEach(x => { const e = s.exercises.find(y => y.name === x.name); if (!e) return; if (x.ss) e.ss = x.ss; e.sets.forEach((t, j) => { if (x.dur[j]) t.dur = x.dur[j]; }); });
    saveLocal();
  }
  g3.re = 0; g3.cancel = false; if (g3.dim) g3Dim(false);
  return r;
};
/* "Descanso terminado" dentro de la app: con la pantalla automática se queda 10 s (antes 6) y vuelve a la sesión */
const _tickG3 = tick;
tick = function () {
  const r = state.rest;
  if (g3On() && r && r.rang && Date.now() - r.end > 5500 && Date.now() - r.end < G3_REST_TXT) return;
  return _tickG3.apply(this, arguments);
};
/* La pantalla no se bloquea sola durante la sesión con la pantalla automática (como "Mientras la app está abierta") */
const g3Keep = () => g3On() && !!state.draft && document.visibilityState === 'visible';
const _applyAwakeG3 = applyAwake;
applyAwake = async function () {
  if (g3Keep() && typeof KA !== 'undefined' && KA) { if (awakeOn !== true) { awakeOn = true; try { await KA.keepAwake(); } catch (e) {} } return; }
  return _applyAwakeG3.apply(this, arguments);
};
setInterval(() => { if (!isWatch()) applyAwake(); }, 3000);
/* Salir de la sesión después de oscurecerla: si Android no bloqueó el celular, la app pide tu patrón antes de mostrar nada */
const _g2LockAskG3 = g2LockAsk;
g2LockAsk = function (on) {
  const H = g2HA();
  if (on || !g3.guard || !H) return _g2LockAskG3.apply(this, arguments);
  Promise.resolve(H.sessionLock({ on: false })).then(r => {
    if (r && r.locked) { g3.guard = false; return; }   /* bloqueado: Android ya pide el patrón */
    return g3Confirm();
  }, g3Confirm);
};
function g3Confirm() {
  const H = g3HA();
  if (!H || typeof H.confirmUnlock !== 'function') { g3.guard = false; g2Uncover(); return; }
  return Promise.resolve(H.confirmUnlock()).then(r => {
    if (r && r.ok) { g3.guard = false; g2Uncover(); return; }
    /* Cancelado: de vuelta a la sesión; nada de lo demás se llega a ver */
    if (typeof closeSheet === 'function' && document.querySelector('.fin-sheet')) closeSheet();
    if (state.draft) { state.sessMin = false; state.tab = 'train'; render(); g2LockSync(); }
  }, () => { g2Uncover(); });
}
/* Ajustes → Fin del descanso */
const _alertCardG3 = alertSettingsCard;
alertSettingsCard = function () {
  const h = _alertCardG3.apply(this, arguments); if (isWatch()) return h;
  const on = g3On(), k = h.lastIndexOf('</div>');
  const row = `<div class="row g3-set"><div class="grow"><b>Pantalla automática en la sesión</b><div class="muted" style="font-size:12px">Sin tocar nada 20 s, la pantalla se pone negra con el brillo al mínimo y vuelve a verse sola cuando toca marcar la serie (según lo que sueles tardar). "Descanso terminado" se cierra a los 10 s. Si la oscureció, salir de la sesión pide tu patrón.</div></div><button type="button" class="switch ${on ? 'on' : ''}" data-g3="auto" role="switch" aria-checked="${on}" aria-label="Pantalla automática en la sesión"><i></i></button></div>`;
  return k < 0 ? h : h.slice(0, k) + row + h.slice(k);
};

/* ---------- 2. Tu semana en Hoy ---------- */
function g3WeekInfo() {
  const ws = weekStartOf(new Date()), L = state.sessions.filter(s => !s.approx && new Date(s.date) >= ws);
  const min = Math.round(L.reduce((a, s) => a + (+s.durationSec || 0), 0) / 60);
  let st = null; try { st = streakInfo(); } catch (e) {}
  return { n: L.length, target: st ? st.target : 0, min };
}
const g3Hm = m => (m >= 60 ? Math.floor(m / 60) + ' h' + (m % 60 ? ' ' + (m % 60) + ' min' : '') : m + ' min');
function g3HoyCard() {
  const V = wcVolume(), low = V.rows.filter(r => r.st === 'low').sort((a, b) => a.t - b.t), W = weekSets(0).sets, I = g3WeekInfo();
  return `<div class="card g3-hoy" data-g3="rep" role="button" tabindex="0" aria-label="Tu semana: ver el reporte completo">
    <div class="row g3-hh"><h3 class="grow">${ic('person-standing', 17)} Tu semana</h3><span class="muted num">${I.target > I.n ? I.n + ' de ' + I.target : I.n} ${I.n === 1 && !(I.target > I.n) ? 'entreno' : 'entrenos'} · ${g3Hm(I.min)}</span></div>
    <div class="g3-hb">${bodySVG(W)}<div class="g3-hl">${low.length ? `<div class="label">Te faltan</div><div class="g3-low">${low.slice(0, 4).map(r => `<span class="wc-chip low"><b>${zoneName(r.k)}</b> <span class="num">${Math.ceil(WC_MIN - r.t)}</span></span>`).join('')}${low.length > 4 ? `<span class="muted">y ${low.length - 4} más</span>` : ''}</div>` : `<div class="muted">Vas bien: ningún músculo bajo ${WC_MIN} series, contando lo que aún te toca.</div>`}</div></div>
    ${low.length ? `<button type="button" class="btn small block" data-wc="fill">${ic('dumbbell', 15)} Crear entreno para completar</button>` : ''}</div>`;
}
function g3HoyPut() {
  if (isWatch() || state.draft || state.tab !== 'train' || !state.sessions.some(s => !s.approx)) return;
  const app = document.querySelector('#app.v-hoy'); if (!app || app.querySelector('.g3-hoy')) return;
  const at = app.querySelector('.streak-card.hoy-st') || app.querySelector('.hoy-hero');
  if (at) at.insertAdjacentHTML('afterend', g3HoyCard());
}

/* ---------- 3. Hoy vs anterior ---------- */
const g3Kind = s => (s.planId === 'quick' ? 'Entreno rápido' : sKind(s) === 'fuerza' ? 'Pesado' : 'Bombeo');
const g3Set = x => (+x.w ? fmtKg(+x.w) + '×' + x.r : x.r + (/s$/.test(String(x.r)) ? '' : ' reps')) + (x.rir != null ? '@' + x.rir : '');
/* La sesión anterior para el encabezado: la del mismo día de la rutina en ese gimnasio; si no, la última en ese gimnasio */
function g3PrevSes(s) {
  const g = sGym(s), before = state.sessions.filter(x => x.id !== s.id && !x.approx && x.date < s.date && sGym(x) === g).sort((a, b) => (a.date < b.date ? 1 : -1));
  return before.find(x => s.dayId && x.dayId === s.dayId) || before.find(x => x.exercises.some(e => exIn(s, e.name))) || null;
}
function g3Rows(s) {
  return s.exercises.map(e => {
    const p = g2Prev(s, e.name), now = fsBest(e.sets), bef = p && fsBest(p.sets);
    const t = !p ? 'new' : now.v > bef.v + 0.05 ? 'up' : now.v < bef.v - 0.05 ? 'down' : 'same';
    return { n: e.name, ss: e.ss || '', q: e.sets.some(x => x.q), today: e.sets.map(g3Set).join(' · '), prev: p ? p.sets.map(g3Set).join(' · ') : '', pd: p ? p.date : '', t };
  });
}
const G3_ARROW = { up: '↑', down: '↓', same: '=', new: '' };
function g3CmpData(s) {
  const P = g3PrevSes(s), min = Math.round((+s.durationSec || 0) / 60);
  return { day: s.dayName || 'Sesión', kind: g3Kind(s), gym: s.gymName || gymName(sGym(s)), date: s.date, min, prev: P ? P.date : '', rows: g3Rows(s) };
}
const g3D = d => fmtDate(d, true);
function g3CmpHtml(s) {
  const C = g3CmpData(s);
  return `<div class="g3-cmp" data-sid="${esc(s.id)}"><div class="g3-ch"><b>${esc(C.day)}</b> · ${C.kind} · ${esc(C.gym)}<br><span class="muted">${g3D(C.date)}${C.min ? ' · ' + C.min + ' min' : ''} · ${C.prev ? 'frente a ' + g3D(C.prev) : 'Primera vez aquí'}</span></div>
    <table class="g3-tb"><thead><tr><th>Ejercicio</th><th>Hoy</th><th>Anterior</th><th></th></tr></thead><tbody>${C.rows.map(r => `<tr class="${r.t}"><td>${esc(r.n)}${r.ss ? ` <span class="g3-ss">SS ${esc(r.ss)}</span>` : ''}</td><td class="num">${r.today}</td><td class="num">${r.prev ? r.prev + (r.pd && C.prev && dk(r.pd) !== dk(C.prev) ? `<small> (${g3D(r.pd)})</small>` : '') : '<span class="muted">Primera vez aquí</span>'}</td><td class="g3-t">${G3_ARROW[r.t]}</td></tr>`).join('')}</tbody></table>
    <button type="button" class="btn small" data-g3="copy" data-sid="${esc(s.id)}">${ic('copy', 15)} Copiar como texto</button></div>`;
}
function g3CmpText(s) {
  const C = g3CmpData(s);
  return [`${C.day} · ${C.kind} · ${C.gym} · ${g3D(C.date)}${C.min ? ' · ' + C.min + ' min' : ''}`, C.prev ? `Comparado con: ${g3D(C.prev)}` : 'Primera vez aquí', 'Ejercicio | Hoy | Anterior | Cambio']
    .concat(C.rows.map(r => `${r.n}${r.ss ? ' (superserie ' + r.ss + ')' : ''} | ${r.today} | ${r.prev ? r.prev + (r.pd && C.prev && dk(r.pd) !== dk(C.prev) ? ' (' + g3D(r.pd) + ')' : '') : 'Primera vez aquí'} | ${G3_ARROW[r.t] || '—'}`)).join('\n');
}
/* Al terminar: reemplaza la lista de ejercicios del resumen (dice lo mismo, ahora como cuadro) */
const _fsHtmlG3 = fsHtml;
fsHtml = function (s) {
  const h = _fsHtmlG3.apply(this, arguments); if (isWatch()) return h;
  const a = h.indexOf('<div class="fs-sec">', h.indexOf('fs-stats')), k = h.indexOf('en el orden en que los hiciste'), b = h.indexOf('</div></div></div>', h.indexOf('g2-exl'));
  if (k > 0) { const st = h.lastIndexOf('<div class="fs-sec">', k), en = h.indexOf('<div class="fs-sec">', k); if (st >= 0 && en > st) return h.slice(0, st) + `<div class="fs-sec">${ic('dumbbell', 15)} Hoy vs anterior</div>` + g3CmpHtml(s) + h.slice(en); }
  return a > 0 ? h.slice(0, a) + `<div class="fs-sec">${ic('dumbbell', 15)} Hoy vs anterior</div>` + g3CmpHtml(s) + h.slice(a) : h;
};

/* ---------- 3 y 4. En el detalle del día: el cuadro y el análisis, cada uno con su botón ---------- */
const _daySheetG3 = daySheet;
daySheet = function (k) {
  const r = _daySheetG3.apply(this, arguments); if (isWatch()) return r;
  const list = state.sessions.filter(s => dk(s.date) === k);
  document.querySelectorAll('#sheet .dd-ses').forEach((n, i) => {
    const s = list[i]; if (!s) return;
    const old = n.querySelector('details.ag-an'); if (old) old.remove();
    let an = ''; try { an = agAnalysisHtml(s); } catch (e) { an = ''; }
    const has = /<li>|<tr><td/.test(an);
    n.insertAdjacentHTML('beforeend', `<div class="g3-acts"><button type="button" class="btn small" data-g3="cmp" data-sid="${esc(s.id)}" aria-expanded="false">${ic('dumbbell', 15)} Hoy vs anterior</button>${has ? `<button type="button" class="btn small" data-g3="an" data-sid="${esc(s.id)}" aria-expanded="false">${ic('target', 15)} Análisis de la sesión</button>` : ''}</div><div class="g3-box" data-box="${esc(s.id)}" hidden></div>`);
  });
  return r;
};
function g3Toggle(b, kind) {
  const s = state.sessions.find(x => x.id === b.dataset.sid), box = s && document.querySelector('#sheet .g3-box[data-box="' + CSS.escape(s.id) + '"]'); if (!box) return;
  const open = box.dataset.k === kind && !box.hidden;
  box.closest('.dd-ses').querySelectorAll('[data-g3="cmp"],[data-g3="an"]').forEach(x => x.setAttribute('aria-expanded', 'false'));
  if (open) { box.hidden = true; box.dataset.k = ''; return; }
  let h = ''; try { h = kind === 'cmp' ? g3CmpHtml(s) : agAnalysisHtml(s); } catch (e) { h = '<div class="muted">No se pudo armar con los datos de esta sesión.</div>'; }
  box.innerHTML = h || '<div class="muted">No hay nada que mostrar para esta sesión.</div>'; box.hidden = false; box.dataset.k = kind; b.setAttribute('aria-expanded', 'true');
}
window.addEventListener('click', ev => {
  const b = ev.target.closest && ev.target.closest('[data-g3]'); if (!b) return;
  const a = b.dataset.g3;
  if (a === 'rep') { if (ev.target.closest('[data-wc]')) return; ev.preventDefault(); ev.stopPropagation(); return wcSheet('f'); }
  ev.preventDefault(); ev.stopPropagation();
  if (a === 'auto') { state.settings.autoScr = !g3On(); savePlans(); render(); toast(state.settings.autoScr ? 'Pantalla automática activada para la sesión.' : 'Pantalla automática apagada.'); return; }
  if (a === 'copy') { const s = state.sessions.find(x => x.id === b.dataset.sid); if (s) ddCopy(g3CmpText(s)).then(ok => toast(ok ? 'Cuadro copiado como texto.' : 'No se pudo copiar.')); return; }
  if (a === 'cmp' || a === 'an') return g3Toggle(b, a);
}, true);

/* ---------- Dibujo ---------- */
const _renderG3 = render;
render = function () {
  const r = _renderG3.apply(this, arguments);
  if (isWatch()) return r;
  g3HoyPut();
  return r;
};
bootRender();
