/* ==========================================================================
   Fase 3 · Lista para la tienda (13-oct-2026)
   1. Política de privacidad (Ley 29733) y Términos de uso desde legal.js (igual en la web).
   2. Consentimiento expreso para datos de salud en la bienvenida (se guarda versión y fecha).
   3. Reportes de errores anónimos y opcionales (Firestore `errors`, se borran a los 90 días).
   4. Forja Pro con Google Play Billing 8 (plugin nativo `Billing`): precios reales, compra,
      restaurar y comprobar la suscripción al abrir la app.
   ========================================================================== */

/* ---------- 1. Textos legales ---------- */
privacySheet = function () {
  openSheet(`<div class="row"><h2 class="grow">Política de privacidad</h2><button class="icon-btn" data-act="sheet-close" aria-label="Cerrar">${ic('x', 18)}</button></div><div class="legal">${LEGAL.privacy}</div>`);
};
function termsSheet() {
  openSheet(`<div class="row"><h2 class="grow">Términos de uso</h2><button class="icon-btn" data-act="sheet-close" aria-label="Cerrar">${ic('x', 18)}</button></div><div class="legal">${LEGAL.terms}</div>`);
}

/* ---------- 2. Consentimiento (lo pide la bienvenida de pub.js) ---------- */
const consentOk = () => { const c = state.settings.consent; return !!(c && c.v); };
function saveConsent() { state.settings.consent = { v: LEGAL.v, at: Date.now() }; }

/* ---------- 3. Reportes de errores ---------- */
const errQ = LS.get('errq', []);
const errOn = () => state.settings.errRep !== false;
function errPush(msg, src, line, stack) {
  if (!errOn()) return;
  const m = String(msg || 'Error').slice(0, 300);
  if (errQ.some(e => e.m === m) || errQ.length >= 20) return;
  errQ.push({ m, s: String(src || '').split('/').pop().slice(0, 60), l: +line || 0, st: String(stack || '').slice(0, 1200), v: (typeof upd !== 'undefined' && upd.current && upd.current.name) || 'web', p: typeof IS_WEB !== 'undefined' && IS_WEB ? 'web' : (isWatch() ? 'reloj' : 'android'), ua: navigator.userAgent.slice(0, 160), at: Date.now() });
  LS.set('errq', errQ);
}
window.addEventListener('error', ev => { if (ev && ev.message) errPush(ev.message, ev.filename, ev.lineno, ev.error && ev.error.stack); });
window.addEventListener('unhandledrejection', ev => {
  const r = ev && ev.reason, m = String((r && r.message) || r || '');
  if ((r && (r.auth || r.status)) || /fetch|network|cancel|abort|load failed/i.test(m)) return;
  errPush('Promesa: ' + m, '', 0, r && r.stack);
});
let errBusy = false;
async function errFlush() {
  if (errBusy || !errQ.length || !errOn() || typeof FIREBASE === 'undefined' || !FIREBASE || !fb.auth || !navigator.onLine) return;
  errBusy = true;
  try {
    while (errQ.length) {
      const e = errQ[0], S = v => ({ stringValue: String(v) });
      await fb.fs('POST', 'errors', null, { fields: { m: S(e.m), s: S(e.s), l: { integerValue: String(e.l) }, st: S(e.st), v: S(e.v), p: S(e.p), ua: S(e.ua), at: { timestampValue: new Date(e.at).toISOString() }, exp: { timestampValue: new Date(e.at + 90 * 864e5).toISOString() } } });
      errQ.shift(); LS.set('errq', errQ);
    }
  } catch (x) { /* se reintenta luego */ }
  errBusy = false;
}
setTimeout(errFlush, 8000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) setTimeout(errFlush, 3000); });

/* ---------- 4. Forja Pro con Google Play ---------- */
Object.assign(PRO_CFG, { productId: 'forja_pro', plans: { monthly: 'mensual', yearly: 'anual' } });
const BIL = typeof CAP !== 'undefined' && CAP && CAP.Billing;
const bil = { offers: null, loading: false, err: '' };
/* El plan (base) más barato de cada tipo y, si hay, la oferta con prueba gratis */
function bilPick(plan) {
  const base = PRO_CFG.plans[plan], list = (bil.offers || []).filter(o => o.basePlanId === base);
  return list.find(o => o.offerId && o.phases.some(p => +p.micros === 0)) || list.find(o => !o.offerId) || list[0] || null;
}
const bilPrice = o => { if (!o) return ''; const ph = o.phases.filter(p => +p.micros > 0); return ph.length ? ph[ph.length - 1].price : ''; };
const bilTrial = o => { const f = o && o.phases.find(p => +p.micros === 0); if (!f) return ''; const m = /P(\d+)([DWM])/.exec(f.period || ''); return m ? `${m[1]} ${{ D: 'días', W: 'semanas', M: 'meses' }[m[2]]} gratis` : 'Prueba gratis'; };
function bilLoad() {
  if (!BIL || bil.loading || bil.offers) return Promise.resolve();
  bil.loading = true;
  return BIL.getProducts({ ids: [PRO_CFG.productId] }).then(r => { bil.offers = r.offers || []; bil.err = bil.offers.length ? '' : 'Los planes aún no están publicados en Google Play.'; })
    .catch(e => { bil.err = (e && e.message) || 'Google Play no respondió.'; })
    .then(() => { bil.loading = false; });
}
function proApply(purchases) {
  const act = (purchases || []).find(p => p.active && (p.products || []).indexOf(PRO_CFG.productId) >= 0);
  const was = isPro();
  state.settings.pro = act ? { until: Date.now() + 3 * 864e5, src: 'play', token: act.token, order: act.orderId || '', renew: !!act.autoRenew, chk: Date.now() } : Object.assign({}, state.settings.pro || {}, { until: 0, chk: Date.now() });
  savePlans();
  return { active: !!act, was, pending: (purchases || []).some(p => p.pending) };
}
function proCheck(quiet) {
  if (!BIL) return Promise.resolve(null);
  return BIL.getActive().then(r => { const x = proApply(r.purchases); if (!quiet) toast(x.active ? 'Tu suscripción Pro está activa.' : x.pending ? 'Tu pago está pendiente de confirmación.' : 'No encontramos una suscripción activa en esta cuenta de Google.'); render(); return x; })
    .catch(e => { if (!quiet) toast((e && e.message) || 'No se pudo consultar Google Play.'); return null; });
}
const _proSheetS = proSheet;
proSheet = function () {
  _proSheetS();
  if (!BIL) return;
  const fill = () => {
    const s = $('#sheet'); if (!s || s.hidden) return;
    ['yearly', 'monthly'].forEach(plan => {
      const o = bilPick(plan), btn = s.querySelector(`.pro-plan[data-p="${plan}"]`); if (!btn) return;
      if (o) { const n = btn.querySelector('.num'); if (n) n.textContent = bilPrice(o); const sm = btn.querySelector('small'); if (sm) sm.textContent = bilTrial(o) || (plan === 'monthly' ? 'Cancela cuando quieras' : 'Pago una vez al año'); }
    });
    const p = state.settings.pro;
    if (p && p.src === 'play' && p.until > Date.now()) {
      const plans = s.querySelector('.pro-plans'); if (plans) plans.outerHTML = `<div class="safe tip">${ic('crown', 16)}<span><b>Tu suscripción Pro está activa.</b> Gracias por apoyar Forja.</span></div><button class="btn" data-act="pro-manage">Gestionar suscripción en Google Play</button>`;
    }
    if (bil.err) { const m = s.querySelector('.pro-plans'); if (m && !s.querySelector('.bil-err')) m.insertAdjacentHTML('afterend', `<div class="muted bil-err" style="font-size:12px;text-align:center">${esc(bil.err)}</div>`); }
  };
  if (bil.offers) fill(); else bilLoad().then(fill);
};
proBuy = function (plan) {
  if (!BIL) { toast(PRO_CFG.enforce ? 'Las compras funcionan en la app de Android.' : 'Durante la beta ya tienes Pro gratis 🎉'); return; }
  bilLoad().then(() => {
    const o = bilPick(plan);
    if (!o) { toast(bil.err || 'Este plan aún no está disponible.'); return; }
    return BIL.purchase({ productId: o.productId, offerToken: o.offerToken }).then(r => {
      const x = proApply(r.purchases);
      if (x.active) { closeSheet(); toast('¡Bienvenido a Forja Pro! 👑'); render(); }
      else if (x.pending) toast('Tu pago está pendiente. Te avisaremos cuando se confirme.');
    }).catch(e => { if (!(e && (e.code === 'CANCEL' || /cancel/i.test(e.message)))) toast((e && e.message) || 'No se pudo completar la compra'); });
  });
};
document.addEventListener('click', ev => {
  const b = ev.target.closest && ev.target.closest('[data-act="pro-restore"],[data-act="pro-manage"],[data-act="terms-open"],[data-st]'); if (!b) return;
  const a = b.dataset.act || b.dataset.st;
  ev.stopPropagation(); ev.preventDefault();
  if (a === 'pro-restore') { if (BIL) { toast('Buscando tu suscripción…'); proCheck(false); } else toast(PRO_CFG.enforce ? 'Restaura tu compra desde la app de Android.' : 'Durante la beta no hace falta: ya tienes Pro.'); }
  else if (a === 'pro-manage') { if (BIL) BIL.manage({ productId: PRO_CFG.productId }).catch(() => {}); }
  else if (a === 'terms-open') termsSheet();
  else if (a === 'err-toggle') { state.settings.errRep = !errOn(); savePlans(); render(); if (errOn()) errFlush(); }
}, true);
/* Al abrir: confirmar la suscripción (solo si alguna vez compró, para no consultar de más) */
if (BIL && state.settings.pro && state.settings.pro.src === 'play') setTimeout(() => proCheck(true), 4000);

/* ---------- Ajustes: términos y reportes de errores ---------- */
const _vSettingsSt = vSettings;
vSettings = function () {
  let h = _vSettingsSt();
  h = h.replace('<button class="set-row" data-act="health-open">', `<button class="set-row" data-act="terms-open">${ic('book-open', 16)}<span class="grow">Términos de uso</span>${ic('chevron-right', 16)}</button><button class="set-row" data-act="health-open">`);
  const c = state.settings.consent;
  h += `<div class="card err-card"><h3>Reportes de errores</h3>
    <div class="row"><span class="grow muted" style="font-size:13px">Si algo falla, la app envía un reporte <b>anónimo</b> (sin tu nombre ni tus datos) para poder arreglarlo. Solo con cuenta.</span>
    <button type="button" class="switch ${errOn() ? 'on' : ''}" style="border:0;cursor:pointer;margin-left:12px" data-st="err-toggle" role="switch" aria-checked="${errOn()}" aria-label="Enviar reportes de errores"><i></i></button></div>
    ${c ? `<div class="muted" style="font-size:11.5px">Aceptaste la política de privacidad (versión ${esc(c.v)}) el ${fmtDate(new Date(c.at).toISOString(), true)}.</div>` : ''}</div>`;
  return h;
};
SET_ORDER.push(['Reportes de errores', 13.5]);
SET_ORDER.sort((a, b) => a[1] - b[1]);
