/* ==========================================================================
   Tanda K: "Tu plan de la semana" (rama tanda-k)
   Se apoya en el coach semanal (weekly.js) sin duplicarlo: la misma propuesta (`wcProposal`) y el mismo
   Aplicar / Deshacer (`wcApply` / `wcUndo`). Lo nuevo:
   1. Notificación el día del resumen (`settings.wcoach.sun`) a la hora elegida (`settings.wcoach.hour`, 19:00 por
      defecto; `settings.wcoach.notif` = false la apaga). No sale si ese resumen ya se vio. Al tocarla abre el plan.
   2. Distribución muscular: series por músculo y por día del plan propuesto, y aviso si un músculo cae todo en un día.
   3. "Aplicar a mi rutina": el Aplicar de siempre, con el nombre nuevo y el aviso de que se puede deshacer.
   Nada de esto sale en el reloj.
   ========================================================================== */
const TK_ID = 9100, TK_N = 2, TK_HOUR = 19, TK_HOURS = [7, 8, 9, 12, 17, 18, 19, 20, 21];
const tkCfg = () => { const C = wcCfg(), h = +C.hour; return { on: !!C.on && C.notif !== false, notif: C.notif !== false, hour: TK_HOURS.indexOf(h) >= 0 ? h : TK_HOUR, sun: C.sun }; };

/* ---------- 1. Notificación ---------- */
/* Semana que resume ese día (como wcSumKey, pero para una fecha futura) */
const tkKeyAt = (at, sun) => wkKey(new Date(at.getTime() - (wcIdx(sun) >= 4 ? 0 : 1) * 7 * 864e5));
/* Próximos avisos: los días del resumen de las 2 semanas siguientes, salvo el que ya viste */
function tkTimes(now) {
  const C = tkCfg(), out = [], plan = activePlan();
  if (!C.on || !plan || !plan.days.length || !state.sessions.length) return out;
  for (let d = 0; d < 14; d++) {
    const at = new Date(now.getTime()); at.setDate(at.getDate() + d); at.setHours(C.hour, 0, 0, 0);
    if (at.getDay() !== C.sun || at.getTime() <= now.getTime() + 5000 || wcSeen().s === tkKeyAt(at, C.sun)) continue;
    out.push(at);
  }
  return out.slice(0, TK_N);
}
async function tkSchedule() {
  if (!LN || isWatch()) return;
  try {
    const pend = await LN.getPending(), old = (pend.notifications || []).filter(n => n.id >= TK_ID && n.id < TK_ID + TK_N).map(n => ({ id: n.id }));
    if (old.length) await LN.cancel({ notifications: old });
    if (state.notifPerm !== 'granted') return;
    const list = tkTimes(new Date()).map((at, i) => ({ id: TK_ID + i, title: 'Tu plan de la semana', body: 'Tu resumen y lo que propone el coach para la próxima semana ya están listos.', channelId: 'recordatorios', smallIcon: 'ic_stat_notify', schedule: { at, allowWhileIdle: true } }));
    if (list.length) await LN.schedule({ notifications: list });
  } catch (e) { console.warn('tkSchedule', e); }
}
const _scheduleAllTK = scheduleAll;
scheduleAll = async function () { await _scheduleAllTK.apply(this, arguments); await tkSchedule(); };
/* Al tocarla: abre el plan (si estás entrenando, no te interrumpe) */
function tkOpen() {
  if (isWatch() || state.draft) return;
  state.tab = 'train'; render(); wcSheet('s');
  if (wcSeen().s !== wcSumKey()) { wcMark('s', wcSumKey()); render(); }
}
if (LN) { try { LN.addListener('localNotificationActionPerformed', ev => { const id = ev.notification && ev.notification.id; if (id >= TK_ID && id < TK_ID + TK_N) setTimeout(tkOpen, 300); }); } catch (e) {} }
/* Ver, aplicar o descartar el resumen quita el aviso de esa semana */
window.addEventListener('click', ev => {
  const b = ev.target.closest && ev.target.closest('[data-wc]'); if (b && /^(open-s|apply|no|undo)$/.test(b.dataset.wc || '')) setTimeout(scheduleSoon, 0);
});

/* ---------- 2. Distribución muscular ---------- */
function tkDist(P) {
  const days = [], top = typeof pgMaxSets === 'function' ? pgMaxSets() : Infinity;
  P.items.forEach(it => {
    let d = days.find(x => x.id === it.day); if (!d) days.push(d = { id: it.day, wd: it.wd, n: it.dn, v: {} });
    const s = Math.min(it.s1, top), n = P.dl ? Math.ceil(s / 2) : s, sh = zoneShares(it.n);
    for (const k in sh) if (MM_MAIN.indexOf(k) >= 0) d.v[k] = (d.v[k] || 0) + sh[k] * n;
  });
  const tot = {}; MM_MAIN.forEach(k => { tot[k] = days.reduce((a, d) => a + (d.v[k] || 0), 0); });
  /* Un músculo con sus series en un solo día, teniendo más días: mejor repartirlo */
  const one = days.length > 1 ? MM_MAIN.filter(k => tot[k] >= 6 && days.filter(d => (d.v[k] || 0) >= 1).length === 1) : [];
  /* Descanso muscular (ajustes del gimnasio 4): un músculo grande con 3+ series en dos días con menos de 48 h entre ellos */
  const close = [];
  (typeof REST_BIG !== 'undefined' ? REST_BIG : []).forEach(k => {
    const D = days.filter(d => (d.v[k] || 0) >= 3).sort((a, b) => wcIdx(a.wd) - wcIdx(b.wd));
    for (let i = 0; i < D.length; i++) { const a = D[i], b = D[(i + 1) % D.length]; if (a === b) break; const g = (wcIdx(b.wd) - wcIdx(a.wd) + 7) % 7; if (g < 2) { close.push({ k, a, b }); break; } }
  });
  return { days, tot, one, close };
}
function tkDistHtml(P) {
  const D = tkDist(P); if (!D.days.length) return '';
  const cell = v => (v ? wcR(v) : '·');
  const st = v => (v < WC_MIN ? 'low' : v > WC_MAX ? 'high' : 'ok');
  return `<div class="fs-sec">${ic('person-standing', 15)} Distribución muscular</div>
    <div class="tk-wrap"><table class="tk-dist"><thead><tr><th scope="col">Músculo</th>${D.days.map(d => `<th scope="col" title="${esc(d.n)}">${WD[d.wd]}</th>`).join('')}<th scope="col">Total</th></tr></thead>
    <tbody>${MM_MAIN.map(k => `<tr><th scope="row">${zoneName(k)}</th>${D.days.map(d => `<td class="num">${cell(d.v[k])}</td>`).join('')}<td class="num tk-t ${st(D.tot[k])}">${wcR(D.tot[k])}</td></tr>`).join('')}</tbody></table></div>
    <div class="muted wc-sub">Series por semana con este plan. Meta: ${WC_MIN}-${WC_MAX} por músculo (principal = 1, los que ayudan = ½).</div>
    ${D.one.length ? `<div class="safe tip">${ic('info', 16)}<span>${esc(D.one.map(zoneName).join(', '))}: todo en un solo día. Si puedes, reparte esas series en dos días.</span></div>` : ''}
    ${D.close.length ? `<div class="safe tip tk-rest">${ic('timer', 16)}<span>${esc(D.close.map(c => `${zoneName(c.k)}: ${WDL[c.a.wd].toLowerCase()} y ${WDL[c.b.wd].toLowerCase()}${c.a.wd === c.b.wd ? ' (el mismo día)' : ' seguidos'}`).join('; '))}. Un músculo grande entrenado fuerte necesita 48 h: si puedes, deja un día entre ellos; las series de más ya van al día con más descanso.</span></div>` : ''}`;
}
const _wcSumHtmlTK = wcSumHtml;
wcSumHtml = function () {
  let h = _wcSumHtmlTK.apply(this, arguments);
  if (isWatch()) return h;
  const off = wcSumOff(), P0 = wcProposal(off), P = P0 && (wcApplied(P0) || P0);
  h = h.replace('Propuesta para la semana del', 'Tu plan de la semana del').replace(`${ic('check', 16)} Aplicar</button>`, `${ic('check', 16)} Aplicar a mi rutina</button>`).replace('hasta que toques Aplicar.', 'hasta que toques Aplicar a mi rutina. Después puedes deshacerlo.').replace(/(<div class="wc-done">[\s\S]*?")\. (<button)/, '$1. El cambio queda en tu rutina hasta que lo deshagas. $2');
  if (!P) return h;
  /* Antes de decidir: encima de "Aplicar a mi rutina" (o de "Aplicada" / "ya está bien") */
  let k = h.search(/<div class="wc-done">|<div class="muted wc-sub">\d+ cambios? en |<div class="muted wc-sub">Tu rutina ya está bien/);
  if (k < 0) k = h.lastIndexOf('<div class="dd-acts');
  return k < 0 ? h + tkDistHtml(P) : h.slice(0, k) + tkDistHtml(P) + h.slice(k);
};
const _wcSumTextTK = wcSumText;
wcSumText = function () {
  const t = _wcSumTextTK.apply(this, arguments).replace('Propuesta para la semana del', 'Tu plan de la semana del');
  const off = wcSumOff(), P0 = wcProposal(off), P = P0 && (wcApplied(P0) || P0); if (!P) return t;
  const D = tkDist(P);
  return t + '\n\nDistribución muscular (series por semana):\n' + D.days.map(d => `${WD[d.wd]} · ${d.n}: ${MM_MAIN.filter(k => d.v[k]).map(k => `${zoneName(k)} ${wcR(d.v[k])}`).join(', ') || 'sin series'}`).join('\n') + '\nTotal: ' + MM_MAIN.map(k => `${zoneName(k)} ${wcR(D.tot[k])}`).join(', ')
    + (D.close.length ? '\nDescanso: ' + D.close.map(c => `${zoneName(c.k)} ${WDL[c.a.wd].toLowerCase()} y ${WDL[c.b.wd].toLowerCase()} (menos de 48 h)`).join('; ') : '');
};

/* ---------- Ajustes → Coach semanal: el aviso y su hora ---------- */
const _wcSetCardTK = wcSetCard;
wcSetCard = function () {
  const h = _wcSetCardTK.apply(this, arguments); if (isWatch()) return h;
  const C = tkCfg(), k = h.lastIndexOf('<div class="row wc-btns');
  const add = `<div class="row tk-set"><span class="grow"><b>Aviso "Tu plan de la semana"</b><br><span class="muted" style="font-size:12.5px">Una notificación el día del resumen.</span></span>
      <button type="button" class="switch ${C.notif ? 'on' : ''}" style="border:0;cursor:pointer;margin-left:12px" data-tk="notif" role="switch" aria-checked="${C.notif}" aria-label="Aviso Tu plan de la semana"><i></i></button></div>
    ${C.notif ? `<div class="field"><label class="label" for="tk-hour">Hora del aviso</label><select id="tk-hour">${TK_HOURS.map(x => `<option value="${x}" ${x === C.hour ? 'selected' : ''}>${x}:00</option>`).join('')}</select></div>` : ''}`;
  return k < 0 ? h : h.slice(0, k) + add + h.slice(k);
};
window.addEventListener('click', ev => {
  const b = ev.target.closest && ev.target.closest('[data-tk="notif"]'); if (!b) return;
  ev.preventDefault(); ev.stopPropagation();
  state.settings.wcoach = Object.assign(wcCfg(), { notif: !tkCfg().notif }); savePlans(); scheduleSoon(); render();
}, true);
document.addEventListener('change', ev => {
  if (ev.target.id !== 'tk-hour') return;
  state.settings.wcoach = Object.assign(wcCfg(), { hour: +ev.target.value }); savePlans(); scheduleSoon(); toast(`Te aviso a las ${ev.target.value}:00.`);
});
if (LN && !isWatch()) scheduleSoon();
bootRender();
