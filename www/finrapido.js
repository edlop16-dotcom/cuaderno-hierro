/* ==========================================================================
   Mis finanzas en Hoy (finrapido.js, 14-nov-2026), encima de finanzas.js. Solo el dueño y solo el teléfono
   (`finOwner()`): el reloj y los usuarios públicos no ven nada y su pantalla no cambia.
   1. Barra delgada en Hoy, justo encima de la tarjeta del entrenamiento (se ve al abrir, sin deslizar): mes, gastado,
      ahorro y "+ Gasto". No sale
      con una sesión en curso (`state.draft`). Tocar el texto abre Mis finanzas completo (`data-fin="open"`).
      Si el texto no cabe en una línea se acorta solo (mes en 3 letras, luego sin la palabra "gastado" y sin el icono).
   2. Registro rápido (`fqOpen`): hoja pequeña con el monto ya enfocado, categorías en botones, concepto opcional y,
      si el mes tiene vales, "¿Pagado con vale?". No tiene lógica propia para guardar: usa los mismos campos del
      formulario normal (#fin-d, #fin-amt, #fin-cat, #fin-c, #fin-vale, #fin-fund, #fin-err) y llama a `finExSave()`,
      así que valida, guarda y avisa del presupuesto (80 % / 100 %) igual. Mientras guarda, `finSheet()` no abre la
      pantalla completa y los avisos se juntan en uno solo (`fq.quiet`).
   Los datos siguen solo en `cdh.fin` (nada nuevo se guarda en otra parte).
   ========================================================================== */
const fq = { quiet: false, msgs: [] };
const fqShow = () => finOwner() && state.tab === 'train' && !state.draft;
const fqMes = ym => { const t = FIN_MES[+ym.slice(5, 7) - 1]; return t[0].toUpperCase() + t.slice(1); };

/* ---------- 1. La barra de Hoy ---------- */
function fqBarHtml() {
  const ym = finYMnow(), S = finSum(ym), mes = fqMes(ym);
  return `<div class="fq-bar" role="group" aria-label="Mis finanzas"><button type="button" class="fq-open" data-fin="open" aria-label="Abrir Mis finanzas. ${mes}: ${finS(S.spent)} gastado, ahorro ${finS(S.saving)}">${ic('wallet', 17)}<span class="fq-txt"><b><span class="fq-m1">${mes}</span><span class="fq-m2">${mes.slice(0, 3)}</span>:</b> <span class="num">${finS(S.spent)}</span><span class="fq-w"> gastado</span> · ahorro <span class="num ${S.saving < 0 ? 'neg' : ''}">${finS(S.saving)}</span></span></button><button type="button" class="fq-add" data-fin="quick" aria-label="Agregar un gasto">${ic('plus', 15)} Gasto</button></div>`;
}
/* Una sola línea: si no cabe, primero el mes corto, después sin "gastado" y sin el icono (lo último, puntos suspensivos) */
function fqFit() {
  const b = document.querySelector('#app .fq-bar'), t = b && b.querySelector('.fq-txt'); if (!t || !t.clientWidth) return;
  b.classList.remove('s1', 's2', 's3');
  ['s1', 's2', 's3'].forEach(k => { if (t.scrollWidth > t.clientWidth) b.classList.add(k); });
}
function fqRefresh() {
  const b = document.querySelector('#app .fq-bar'); if (!b) return;
  if (!fqShow()) { b.remove(); return; }
  b.outerHTML = fqBarHtml(); fqFit();
}
const _renderFq = render;
render = function () {
  const r = _renderFq.apply(this, arguments);
  if (!fqShow()) return r;
  const app = document.getElementById('app'); if (!app || app.querySelector('.fq-bar') || app.querySelector('#sx')) return r;
  /* Encima de la tarjeta del entrenamiento (o del aviso de que no hay rutina), bajo el saludo y el gimnasio */
  const top = app.querySelector(':scope > .hero') || app.querySelector(':scope > .card.empty'), at = app.querySelector(':scope > .gympill') || app.querySelector(':scope > .pagehead');
  if (top) top.insertAdjacentHTML('beforebegin', fqBarHtml()); else if (at) at.insertAdjacentHTML('afterend', fqBarHtml()); else app.insertAdjacentHTML('beforeend', fqBarHtml());
  fqFit();
  return r;
};
window.addEventListener('resize', fqFit);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(fqFit, () => {});
/* Al cerrar Mis finanzas (o cualquier hoja), la barra muestra los montos al día */
const _closeSheetFq = closeSheet;
closeSheet = function () { const r = _closeSheetFq.apply(this, arguments); fqRefresh(); return r; };

/* ---------- 2. Registro rápido ---------- */
/* La última categoría usada: la de esta sesión de la app o, recién abierta, la del último gasto anotado */
function fqCatNow() {
  const F = fin();
  if (state.finLastCat && finCat(state.finLastCat)) return state.finLastCat;
  const last = F.ex.reduce((m, e) => (!m || (e.at || 0) >= (m.at || 0) ? e : m), null);
  return last && finCat(last.cat) ? last.cat : (F.cats[0] || {}).id;
}
function fqOpen() {
  if (!finOwner() || state.draft) return;
  const F = fin(), M = finM(finYMnow()), cat = fqCatNow();
  state.finEd = null; state.confirm = null;
  openSheet(`<form id="f-fin-q" class="fq-form" novalidate>
    <div class="row"><h2 class="grow">${ic('wallet', 20)} Nuevo gasto</h2><button type="button" class="icon-btn" data-act="sheet-close" aria-label="Cerrar">${ic('x', 18)}</button></div>
    <label class="fq-amt"><span class="fq-cur">S/</span><input id="fin-amt" class="num" inputmode="decimal" enterkeyhint="done" autocomplete="off" placeholder="0.00" aria-label="Monto en soles"></label>
    <input type="hidden" id="fin-d" value="${dk(new Date())}"><input type="hidden" id="fin-cat" value="${esc(cat || '')}">
    <div class="fq-chips" role="radiogroup" aria-label="Categoría">${F.cats.map(c => `<button type="button" class="fq-chip ${c.id === cat ? 'on' : ''}" role="radio" aria-checked="${c.id === cat}" data-fin="q-cat" data-id="${esc(c.id)}">${esc(c.name)}</button>`).join('')}</div>
    <input id="fin-c" class="fq-c" maxlength="60" autocomplete="off" placeholder="Concepto (opcional)" aria-label="Concepto (opcional)">
    ${M.funds.length ? `<label class="row fq-vale"><span class="grow">¿Pagado con vale?${M.funds.length > 1 ? '' : ` <small class="muted">(${esc(M.funds[0].name)})</small>`}</span>${M.funds.length > 1 ? `<select id="fin-fund" aria-label="Con cuál vale">${M.funds.map(f => `<option value="${esc(f.id)}">${esc(f.name)}</option>`).join('')}</select>` : ''}<input type="checkbox" id="fin-vale" class="fq-sw" role="switch"></label>` : ''}
    <small class="pb-err" id="fin-err" role="alert" hidden></small>
    <button type="submit" class="btn primary block">Guardar</button>
    <button type="button" class="fq-more" data-fin="q-more">Más opciones</button>
  </form>`);
  const c = $('#sheet .sheet-card'); if (c) c.classList.add('fq-sheet');
  const a = $('#fin-amt'); if (a) { a.focus(); a.select(); }
  const on = $('#sheet .fq-chip.on'), row = $('#sheet .fq-chips'); if (on && row) row.scrollLeft = Math.max(0, on.offsetLeft - row.offsetLeft - 12);
}
function fqSave() {
  if (!finOwner()) return;
  const d = $('#fin-d'), n = fin().ex.length; if (d) d.value = dk(new Date());   // la fecha es hoy
  state.finEd = null; fq.msgs = []; fq.quiet = true;
  try { finExSave(); } finally { fq.quiet = false; }
  const msg = fq.msgs.join(' '); fq.msgs = [];
  if (fin().ex.length === n) { if (msg) toast(msg); return; }   // no pasó la validación: el motivo queda bajo el formulario
  closeSheet();
  toast(msg);
  if (state.finAlert) { clearTimeout(toast.t); toast.t = setTimeout(() => { const t = $('#toast'); if (t) t.hidden = true; }, 6000); }   // con alerta de presupuesto, más tiempo para leerla
  state.finAlert = null;   // ya se mostró: que no reaparezca después en la pestaña Gastos
}
/* "Más opciones": el formulario completo (fecha, nota) con lo que ya habías escrito */
function fqMore() {
  const v = { amt: ($('#fin-amt') || {}).value || '', c: ($('#fin-c') || {}).value || '', cat: ($('#fin-cat') || {}).value, vale: !!($('#fin-vale') && $('#fin-vale').checked), fund: ($('#fin-fund') || {}).value };
  fq.quiet = true; try { finOpen(); } finally { fq.quiet = false; }
  state.finT = 'gas'; finSheet();
  const set = (id, val) => { const el = $('#' + id); if (el && val != null) el.value = val; };
  set('fin-amt', v.amt); set('fin-c', v.c); if (finCat(v.cat)) set('fin-cat', v.cat);
  if ($('#fin-vale')) { $('#fin-vale').checked = v.vale; if (v.fund) set('fin-fund', v.fund); }
  const a = $('#fin-amt'); if (a) { a.focus(); if (!v.amt) a.select(); }
}
const _finSheetFq = finSheet;
finSheet = function () { if (fq.quiet) return; return _finSheetFq.apply(this, arguments); };
const _toastFq = toast;
toast = function (m) { if (fq.quiet) { fq.msgs.push(String(m)); return; } return _toastFq.apply(this, arguments); };
/* Los toques pasan por el manejador de finanzas.js (que ya exige `finOwner()`) */
const _finClick3Fq = finClick3;
finClick3 = function (a, b) {
  if (a === 'quick') { fqOpen(); return true; }
  if (a === 'q-more') { fqMore(); return true; }
  if (a === 'q-cat') {
    const h = $('#fin-cat'); if (h) h.value = b.dataset.id;
    document.querySelectorAll('#sheet .fq-chip').forEach(x => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-checked', on ? 'true' : 'false'); });
    return true;
  }
  return _finClick3Fq.apply(this, arguments);
};
/* Elegir la categoría no quita el foco del monto (el teclado numérico se queda abierto) */
document.addEventListener('mousedown', ev => {
  const b = ev.target.closest && ev.target.closest('.fq-chip'), a = document.activeElement;
  if (b && a && (a.id === 'fin-amt' || a.id === 'fin-c')) ev.preventDefault();
}, true);
document.addEventListener('submit', ev => {
  if (!ev.target || ev.target.id !== 'f-fin-q') return;
  ev.preventDefault(); ev.stopImmediatePropagation(); fqSave();
}, true);
/* La sesión encima del bloqueo (ajustesgym2.js) nunca deja ver finanzas: tampoco esta hoja */
if (typeof g2LockWant === 'function') { const _g2LockWantFq = g2LockWant; g2LockWant = function () { return _g2LockWantFq.apply(this, arguments) && !document.querySelector('.fq-sheet'); }; }
bootRender();
