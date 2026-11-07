/* ==========================================================================
   Progreso (rama progreso). Solo el teléfono: el reloj no cambia.
   1. Récords en vivo: el aviso ya existía (stats.js, `setWin`); ahí quedó con el texto corto y sin repetirse.
   2. Meta de peso corporal: usa el peso que ya registras (`weekAvgs`). Tendencia, cuánto falta y, con Ganar músculo, si
      en 3 semanas no subes sugiere comer un poco más. Nunca calorías.
   3. Equilibrio para la postura: series de empuje frente a jalón en el resumen semanal y en el análisis de la sesión.
   4. Agua en sesiones largas: un aviso a los 60 min; se apaga en Ajustes → Fin del descanso.
   ========================================================================== */

/* ---------- 2. Meta de peso corporal ---------- */
const PR_WEEKS = 3;
function prWeightInfo() {
  const wa = weekAvgs(), cur = wa.length ? wa[wa.length - 1].v : null, goal = +body().goalKg || 0;
  const trend = wa.length > 1 ? cur - wa[wa.length - 2].v : null;
  const stuck = goalSet() === 'musculo' && wa.length > PR_WEEKS && cur <= wa[wa.length - 1 - PR_WEEKS].v + 0.1;
  return { cur, goal, trend, stuck };
}
function prWeightHtml() {
  const I = prWeightInfo(), sign = v => (v > 0 ? '+' : v < 0 ? '−' : '') + fmtKg(Math.abs(Math.round(v * 10) / 10));
  const left = I.cur && I.goal ? Math.round(Math.abs(I.goal - I.cur) * 10) / 10 : null;
  return `<div class="pr-w"><div class="row" style="gap:8px"><span class="grow">Meta de peso</span><span class="bd-in"><input id="pr-goal" inputmode="decimal" value="${I.goal ? fmtKg(I.goal) : ''}" placeholder="kg" aria-label="Meta de peso en kg"></span><button type="button" class="btn small" data-pr="goal">Guardar</button></div>
    ${I.trend != null ? `<div class="muted">Esta semana: ${sign(I.trend)} kg de media</div>` : ''}
    ${left != null ? `<div class="muted">${left < 0.1 ? '¡Llegaste a tu meta!' : `Te faltan ${fmtKg(left)} kg para tu meta de ${fmtKg(I.goal)} kg`}</div>` : ''}
    ${I.stuck ? `<div class="safe tip">${ic('info', 16)}<span>Llevas ${PR_WEEKS} semanas sin subir y tu objetivo es ganar músculo: come un poco más, por ejemplo una porción extra al día.</span></div>` : ''}</div>`;
}

/* ---------- 3. Equilibrio para la postura ---------- */
const PR_PUSH = /^(hpush|ipush|dpush|vpush|dip)$/, PR_PULL = /^(row|vpull|rear)$/;
function prSide(name) {
  const x = libFind(name), p = x && x.pat;
  if (p) return PR_PUSH.test(p) ? 'push' : PR_PULL.test(p) ? 'pull' : '';
  const m = typeof pgMain === 'function' ? pgMain(name) : null;
  return m === 'pecho' ? 'push' : m === 'esp' ? 'pull' : '';
}
function prWeek(off) {
  const ws = weekStartOf(new Date()); ws.setDate(ws.getDate() - 7 * (off || 0));
  const we = new Date(ws); we.setDate(we.getDate() + 7);
  const o = { push: 0, pull: 0, '': 0 };
  state.sessions.forEach(s => { const t = new Date(s.date); if (!s.approx && t >= ws && t < we) s.exercises.forEach(e => { o[prSide(e.name)] += e.sets.length; }); });
  const d = state.draft; if (d && !off) d.exercises.forEach(e => { o[prSide(e.name)] += e.log.filter(x => x.done).length; });
  return o;
}
/* Claramente más empuje: al menos 6 series, un 30 % más y 3 de diferencia */
function prBalance(off) {
  const o = prWeek(off); if (o.push < 6 || o.push < o.pull * 1.3 || o.push - o.pull < 3) return null;
  const g = activeGym().id, L = wcCands('esp').concat(wcCands('homb')).filter(n => { const x = libFind(n); return x && /^(row|rear)$/.test(x.pat || '') && exAvail(n, g); });
  return { push: o.push, pull: o.pull, ex: L[0] || null, txt: `${off ? 'Esa semana hubo' : 'Esta semana van'} ${o.push} series de empuje frente a ${o.pull} de jalón: ${L[0] ? 'suma ' + L[0] : 'suma espalda alta o hombro posterior'} para cuidar tu postura.` };
}
const prBalHtml = off => { const B = prBalance(off); return B ? `<div class="safe tip pr-bal">${ic('info', 16)}<span>${esc(B.txt)}</span></div>` : ''; };
const _wcSumHtmlPR = wcSumHtml;
wcSumHtml = function () {
  const h = _wcSumHtmlPR.apply(this, arguments), b = prBalHtml(wcSumOff()), k = h.indexOf('<div class="fs-sec">');
  return b && k >= 0 ? h.slice(0, k) + b + h.slice(k) : h;
};
const _wcReportHtmlPR = wcReportHtml;
wcReportHtml = function () {
  const h = _wcReportHtmlPR.apply(this, arguments), b = prBalHtml(0), k = h.indexOf('<div class="wc-list"');
  return b ? (k >= 0 ? h.slice(0, k) + b + h.slice(k) : h + b) : h;
};
/* En el análisis de la sesión, solo si esa sesión tuvo empuje o jalón. Reemplaza el aviso de espalda y pecho (dicen lo mismo); el fallo sigue primero */
if (typeof agFix === 'function') {
  const _agFixPR = agFix;
  agFix = function (s) {
    const L = _agFixPR.apply(this, arguments).slice(), off = Math.round((weekStartOf(new Date()) - weekStartOf(new Date(s.date))) / (7 * 864e5));
    const B = s.exercises.some(e => prSide(e.name)) ? prBalance(off) : null; if (!B) return L;
    const k = L.findIndex(t => /series de (espalda|pecho) frente a/.test(t));
    if (k >= 0) L[k] = B.txt; else L.splice(/^Llegaste al fallo/.test(L[0] || '') ? 1 : 0, 0, B.txt);
    return L.slice(0, 3);
  };
}

/* ---------- 4. Agua en sesiones largas ---------- */
const PR_WATER_MIN = 60;
const prWaterOn = () => state.settings.waterTip !== false;
const _tickPR = tick;
tick = function () {
  const r = _tickPR.apply(this, arguments), d = state.draft;
  if (d && !d.prW && !isWatch() && prWaterOn() && Date.now() - new Date(d.start).getTime() > PR_WATER_MIN * 60000) { d.prW = 1; saveDraft(); toast('Toma agua; si sudas mucho, con una pizca de sal'); }
  return r;
};
const _alertCardPR = alertSettingsCard;
alertSettingsCard = function () {
  const h = _alertCardPR.apply(this, arguments); if (isWatch()) return h;
  const on = prWaterOn(), k = h.lastIndexOf('</div>');
  const row = `<div class="row pr-wat"><div class="grow"><b>Aviso de agua en sesiones largas</b><div class="muted" style="font-size:12px">Una vez por sesión, al pasar de ${PR_WATER_MIN} min.</div></div><button type="button" class="switch ${on ? 'on' : ''}" data-pr="water" role="switch" aria-checked="${on}" aria-label="Aviso de agua en sesiones largas"><i></i></button></div>`;
  return k < 0 ? h : h.slice(0, k) + row + h.slice(k);
};

/* ---------- Dibujo y toques ---------- */
document.addEventListener('click', ev => {
  const b = ev.target.closest && ev.target.closest('[data-pr]'); if (!b) return;
  ev.preventDefault(); ev.stopPropagation();
  if (b.dataset.pr === 'water') { state.settings.waterTip = !prWaterOn(); savePlans(); render(); return; }
  if (b.dataset.pr === 'goal') {
    const i = document.getElementById('pr-goal'), v = i && i.value.trim() ? num(i.value) : null;
    if (i && i.value.trim() && !(v >= 30 && v <= 300)) { toast('Escribe tu meta en kg, entre 30 y 300.'); return; }
    if (v) body().goalKg = v; else delete body().goalKg;
    saveBody(); render(); toast(v ? 'Meta guardada.' : 'Meta quitada.');
  }
}, true);
const _renderPR = render;
render = function () {
  const r = _renderPR.apply(this, arguments); if (isWatch()) return r;
  const f = document.getElementById('f-bdw');
  if (f && !document.querySelector('.pr-w')) f.insertAdjacentHTML('afterend', prWeightHtml());
  return r;
};
bootRender();
