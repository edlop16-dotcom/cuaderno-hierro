/* ==========================================================================
   Tanda H1 · "Mis finanzas" (24-oct-2026). Solo el dueño, solo el teléfono (el reloj y los usuarios públicos no la ven).
   - Los datos viven SOLO en este celular: localStorage `cdh.fin`. No van en `state.settings` (que se sincroniza),
     ni a Firestore, ni en el respaldo de la cuenta. Para no perderlos: Ajustes de la sección → Exportar / Importar archivo.
   - Montos en céntimos (enteros) y en soles (S/) con 2 decimales.
   - Configuración por mes (`m[AAAA-MM]`: pagos del sueldo, fondos aparte y presupuesto por categoría). Lo que se guarda
     para el mes actual o uno siguiente queda también como plantilla (`tpl`) para los meses que vienen; un mes pasado
     se cambia solo a sí mismo. Las categorías (nombres) son las mismas para todos los meses.
   - Ahorro del mes = sueldo − gastos pagados con el sueldo. Los fondos aparte (vale de alimentos) se cuentan aparte:
     lo que se paga con un fondo no toca el sueldo.
   ========================================================================== */
Object.assign(ICONS, {
  wallet: '<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" /><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />',
  'chevron-left': '<path d="m15 18-6-6 6-6" />',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" />',
  pencil: '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" /><path d="m15 5 4 4" />',
});
const finOwner = () => !isWatch() && !!state.settings.owner && !pubUser();
const FIN_CATS = ['Alimentación', 'Servicios', 'Transporte', 'Gustos', 'Imprevistos'];
const finNew = () => ({ app: 'forja-finanzas', v: 1, cats: FIN_CATS.map((n, i) => ({ id: 'c' + (i + 1), name: n })), tpl: { pays: [{ id: 'p1', name: 'Sueldo', amt: 0 }], funds: [], bud: {} }, m: {}, ex: [] });
let FIN = null;
function fin() { if (!FIN) { FIN = LS.get('fin', null); if (!FIN || FIN.app !== 'forja-finanzas') FIN = finNew(); } return FIN; }
function finSave() { LS.set('fin', FIN); }
const finClone = o => JSON.parse(JSON.stringify(o));
const finId = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

/* ---------- Montos ---------- */
const FIN_NF = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const finN = c => FIN_NF.format(Math.abs(c || 0) / 100);
const finS = c => ((c || 0) < 0 ? '−' : '') + 'S/ ' + finN(c);
/* "12,5" / "12.50" / "1,234.50" / "S/ 1 234,50" → céntimos; NaN si no es un monto válido (≥ 0) */
function finParse(v) {
  let s = String(v == null ? '' : v).replace(/s\/|\s/gi, '').trim(); if (!s) return NaN;
  const c = s.lastIndexOf(','), d = s.lastIndexOf('.');
  if (c >= 0 && d >= 0) s = c > d ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  else if (c >= 0) s = /,\d{1,2}$/.test(s) && s.indexOf(',') === c ? s.replace(',', '.') : s.replace(/,/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return NaN;
  return Math.round(parseFloat(s) * 100);
}
const finIn = c => (c ? (c / 100).toFixed(2) : '');   // valor de un campo: "1500.00" (vacío si es 0)

/* ---------- Meses ---------- */
const finYMnow = () => dk(new Date()).slice(0, 7);
const finYMadd = (ym, n) => { const [y, m] = ym.split('-').map(Number), d = new Date(y, m - 1 + n, 1); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); };
const FIN_MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const finMesTxt = ym => { const [y, m] = ym.split('-').map(Number); return FIN_MES[m - 1] + ' ' + y; };
const finM = ym => finClone(fin().m[ym] || fin().tpl);
function finMSet(ym, data) {
  const F = fin(); F.m[ym] = finClone(data);
  if (ym >= finYMnow()) F.tpl = finClone(data);
  finSave();
}
const finExOf = ym => fin().ex.filter(e => e.d.slice(0, 7) === ym);
const finCat = id => fin().cats.find(c => c.id === id);

/* ---------- Resumen del mes ---------- */
function finSum(ym) {
  const M = finM(ym), ex = finExOf(ym), F = fin();
  const rows = F.cats.map(c => {
    const bud = +M.bud[c.id] || 0, spent = ex.filter(e => e.cat === c.id).reduce((a, e) => a + e.amt, 0);
    const pct = bud ? spent / bud * 100 : null, st = !bud ? (spent ? 'r' : 'n') : pct > 100 ? 'r' : pct >= 80 ? 'y' : 'g';
    return { c, bud, spent, saldo: bud - spent, pct, st };
  });
  const sal = M.pays.reduce((a, p) => a + (+p.amt || 0), 0), funds = M.funds.reduce((a, f) => a + (+f.amt || 0), 0);
  const spent = ex.reduce((a, e) => a + e.amt, 0), bySal = ex.filter(e => !e.fund).reduce((a, e) => a + e.amt, 0);
  const fundRows = M.funds.map(f => { const used = ex.filter(e => e.fund === f.id).reduce((a, e) => a + e.amt, 0); return { f, used, left: (+f.amt || 0) - used }; });
  const bud = rows.reduce((a, r) => a + r.bud, 0);
  const tst = !bud ? (spent ? 'r' : 'n') : spent / bud > 1 ? 'r' : spent / bud >= 0.8 ? 'y' : 'g';
  return { M, rows, sal, funds, inc: sal + funds, spent, bySal, byFund: spent - bySal, saving: sal - bySal, fundRows, bud, tst, n: ex.length };
}
const FIN_ST = { g: 'Bien', y: 'Atento', r: 'Pasado', n: 'Sin presupuesto' };
const finPct = r => r.pct == null ? (r.spent ? '—' : '0 %') : Math.round(r.pct) + ' %';
function finResHtml(ym) {
  const S = finSum(ym);
  return `<div class="fin-tiles"><div><small>Ingreso total</small><b class="num">${finS(S.inc)}</b></div><div><small>Gastado</small><b class="num">${finS(S.spent)}</b></div><div class="${S.saving < 0 ? 'neg' : 'pos'}"><small>Ahorro del mes</small><b class="num">${finS(S.saving)}</b></div></div>
    <div class="muted fin-sub">Sueldo ${finS(S.sal)}${S.M.pays.length > 1 ? ` (${S.M.pays.length} pagos)` : ''}${S.funds ? ` · fondos aparte ${finS(S.funds)}` : ''} · pagado con el sueldo ${finS(S.bySal)}${S.byFund ? ` · con fondos ${finS(S.byFund)}` : ''}. Ahorro = sueldo − gastos pagados con el sueldo.</div>
    <div class="fin-tw"><table class="fin-t"><thead><tr><th>Categoría</th><th>Presup.</th><th>Gastado</th><th>Saldo</th><th>%</th></tr></thead><tbody>
      ${S.rows.map(r => `<tr class="fin-${r.st}"><td><i class="fin-dot" title="${FIN_ST[r.st]}"></i>${esc(r.c.name)}</td><td class="num">${finN(r.bud)}</td><td class="num">${finN(r.spent)}</td><td class="num ${r.saldo < 0 ? 'neg' : ''}">${r.saldo < 0 ? '−' : ''}${finN(r.saldo)}</td><td class="num">${finPct(r)}</td></tr>`).join('')}
      <tr class="fin-tot fin-${S.tst}"><td><i class="fin-dot"></i>Total</td><td class="num">${finN(S.bud)}</td><td class="num">${finN(S.spent)}</td><td class="num ${S.bud - S.spent < 0 ? 'neg' : ''}">${S.bud - S.spent < 0 ? '−' : ''}${finN(S.bud - S.spent)}</td><td class="num">${S.bud ? Math.round(S.spent / S.bud * 100) + ' %' : '—'}</td></tr>
    </tbody></table></div>
    <div class="muted fin-leg">Montos en S/. <i class="fin-dot g"></i> menos de 80 % · <i class="fin-dot y"></i> 80-100 % · <i class="fin-dot r"></i> más de 100 %</div>
    ${S.fundRows.length ? `<div class="label">Fondos aparte</div>${S.fundRows.map(x => `<div class="fin-fund"><b>${esc(x.f.name)}</b>${finCat(x.f.cat) ? ` <small class="muted">(${esc(finCat(x.f.cat).name)})</small>` : ''}<div class="muted">${finS(x.f.amt)} · usado ${finS(x.used)} · queda <b class="${x.left < 0 ? 'neg' : ''}">${finS(x.left)}</b></div></div>`).join('')}` : ''}
    <button type="button" class="btn primary block" data-fin="tab" data-t="gas">${ic('plus', 16)} Agregar gasto</button>`;
}

/* ---------- Gastos ---------- */
function finExForm(ym) {
  const F = fin(), M = finM(ym), E = state.finEd ? F.ex.find(e => e.id === state.finEd) : null;
  const day = E ? E.d : ym === finYMnow() ? dk(new Date()) : ym + '-01';
  const cat = E ? E.cat : state.finLastCat && finCat(state.finLastCat) ? state.finLastCat : (F.cats[0] || {}).id;
  return `<form id="f-fin-ex" class="card fin-form" novalidate><h3>${E ? 'Editar gasto' : 'Nuevo gasto'}</h3>
    <div class="grid2"><label class="field"><span class="label">Fecha</span><input type="date" id="fin-d" value="${day}"></label>
      <label class="field"><span class="label">Monto en soles</span><input id="fin-amt" inputmode="decimal" value="${E ? finIn(E.amt) : ''}" placeholder="0.00"></label></div>
    <label class="field"><span class="label">Concepto</span><input id="fin-c" maxlength="60" value="${E ? esc(E.c) : ''}" placeholder="Ej. Mercado"></label>
    <label class="field"><span class="label">Categoría</span><select id="fin-cat">${F.cats.map(c => `<option value="${c.id}" ${c.id === cat ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>
    ${M.funds.length ? `<label class="row fin-vale"><input type="checkbox" id="fin-vale" ${E && E.fund ? 'checked' : ''}><span class="grow">¿Pagado con vale?${M.funds.length > 1 ? '' : ` <small class="muted">(${esc(M.funds[0].name)})</small>`}</span>${M.funds.length > 1 ? `<select id="fin-fund">${M.funds.map(f => `<option value="${f.id}" ${E && E.fund === f.id ? 'selected' : ''}>${esc(f.name)}</option>`).join('')}</select>` : ''}</label>`
      : '<div class="muted fin-hint">Sin fondos aparte este mes: todo se paga con el sueldo. Agrega un vale en Ajustes.</div>'}
    <label class="field"><span class="label">Nota (opcional)</span><input id="fin-note" maxlength="120" value="${E ? esc(E.note || '') : ''}"></label>
    <small class="pb-err" id="fin-err" role="alert" hidden></small>
    ${E ? `<div class="grid2"><button type="button" class="btn" data-fin="ex-cancel">Cancelar</button><button type="submit" class="btn primary">Guardar cambios</button></div>` : '<button type="submit" class="btn primary block">Agregar gasto</button>'}
  </form>`;
}
function finExList(ym) {
  const L = finExOf(ym).slice().sort((a, b) => b.d.localeCompare(a.d) || b.at - a.at), F = fin();
  if (!L.length) return `<div class="muted fin-empty">Aún no hay gastos en ${finMesTxt(ym)}.</div>`;
  return `<div class="label">Gastos de ${finMesTxt(ym)} (${L.length})</div><div class="fin-list">${L.map(e => { const c = finCat(e.cat), f = e.fund && (finM(ym).funds.find(x => x.id === e.fund) || { name: 'vale' });
    return `<div class="fin-ex ${state.finEd === e.id ? 'ed' : ''}"><div class="grow" style="min-width:0"><b>${esc(e.c || (c ? c.name : 'Gasto'))}</b><small class="muted">${fmtDate(e.d + 'T12:00:00')} · ${esc(c ? c.name : 'Sin categoría')}${f ? ` · <span class="fin-tag">${esc(f.name)}</span>` : ''}${e.note ? ' · ' + esc(e.note) : ''}</small></div>
      <b class="num">${finS(e.amt)}</b><button type="button" class="icon-btn sm" data-fin="ex-edit" data-id="${e.id}" aria-label="Editar ${esc(e.c || 'gasto')}">${ic('pencil', 15)}</button>
      <button type="button" class="icon-btn sm ${state.confirm === 'fin-del-' + e.id ? 'bad' : ''}" data-fin="ex-del" data-id="${e.id}" aria-label="${state.confirm === 'fin-del-' + e.id ? '¿Borrar? Toca otra vez' : 'Borrar ' + esc(e.c || 'gasto')}">${state.confirm === 'fin-del-' + e.id ? '¿Borrar?' : ic('trash-2', 15)}</button></div>`; }).join('')}</div>`;
}
function finExSave() {
  const F = fin(), err = $('#fin-err'), say = t => { if (err) { err.textContent = t; err.hidden = false; } };
  const d = ($('#fin-d') || {}).value || '', amt = finParse(($('#fin-amt') || {}).value), cat = ($('#fin-cat') || {}).value;
  const c = (($('#fin-c') || {}).value || '').trim(), note = (($('#fin-note') || {}).value || '').trim(), vale = $('#fin-vale') && $('#fin-vale').checked;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return say('Elige la fecha.');
  if (!(amt > 0)) return say('Escribe un monto mayor que 0 (por ejemplo 12.50).');
  if (!finCat(cat)) return say('Elige una categoría.');
  const M = finM(d.slice(0, 7)), fund = vale ? (($('#fin-fund') || {}).value || (M.funds[0] || {}).id || null) : null;
  const E = state.finEd ? F.ex.find(e => e.id === state.finEd) : null;
  const o = { d, c, cat, amt, fund, note };
  if (E) Object.assign(E, o); else F.ex.push(Object.assign({ id: finId('g'), at: Date.now() }, o));
  if (!F.m[d.slice(0, 7)]) F.m[d.slice(0, 7)] = M;   // el mes queda con su configuración de entonces
  state.finLastCat = cat; state.finEd = null; state.finYM = d.slice(0, 7); finSave(); finSheet();
  toast(E ? 'Gasto actualizado.' : `Gasto agregado: ${finS(amt)}.`);
}

/* ---------- Ajustes del mes: ingresos, fondos y categorías ---------- */
/* Borrador (state.finCfg): se lee de los campos antes de agregar o quitar filas, para no perder lo escrito */
function finCfgDraft(ym) { if (!state.finCfg || state.finCfg.ym !== ym) state.finCfg = { ym, M: finM(ym), cats: finClone(fin().cats) }; return state.finCfg; }
function finCfgRead() {
  const D = state.finCfg; if (!D) return;
  document.querySelectorAll('#f-fin-cfg [data-row]').forEach(r => {
    const k = r.dataset.row, i = +r.dataset.i, nm = r.querySelector('.fin-nm'), am = r.querySelector('.fin-am'), ct = r.querySelector('.fin-ct');
    const amt = am ? finParse(am.value) : 0, A = am && am.value.trim() === '' ? 0 : amt;
    if (k === 'pay' && D.M.pays[i]) { D.M.pays[i].name = nm.value.trim(); D.M.pays[i].amt = A; }
    if (k === 'fund' && D.M.funds[i]) { D.M.funds[i].name = nm.value.trim(); D.M.funds[i].amt = A; D.M.funds[i].cat = ct ? ct.value : D.M.funds[i].cat; }
    if (k === 'cat' && D.cats[i]) { D.cats[i].name = nm.value.trim(); D.M.bud[D.cats[i].id] = A; }
  });
}
function finCfgHtml(ym) {
  const D = finCfgDraft(ym), past = ym < finYMnow(), del = state.confirm || '';
  const row = (k, i, name, amt, extra, rm) => `<div class="row fin-row" data-row="${k}" data-i="${i}"><input class="fin-nm grow" maxlength="40" value="${esc(name || '')}" aria-label="Nombre"><input class="fin-am" inputmode="decimal" value="${finIn(amt)}" placeholder="0.00" aria-label="Monto en soles">${extra || ''}${rm ? `<button type="button" class="icon-btn sm ${del === rm.k ? 'bad' : ''}" data-fin="${rm.a}" data-i="${i}" aria-label="${rm.l}">${del === rm.k ? '¿Borrar?' : ic('x', 15)}</button>` : ''}</div>`;
  const F = fin();
  return `<form id="f-fin-cfg" class="fin-cfg" novalidate>
    <div class="card"><h3>Sueldo de ${finMesTxt(ym)}</h3><div class="muted fin-hint">Divídelo en pagos si te pagan por partes (por ejemplo, dos quincenas). Montos en S/.</div>
      ${D.M.pays.map((p, i) => row('pay', i, p.name, p.amt, '', D.M.pays.length > 1 ? { a: 'pay-rm', k: 'fin-pay-' + i, l: 'Quitar pago' } : null)).join('')}
      <button type="button" class="btn small" data-fin="pay-add">${ic('plus', 15)} Agregar pago</button></div>
    <div class="card"><h3>Fondos aparte</h3><div class="muted fin-hint">Dinero que solo sirve para una categoría y no toca el sueldo, como un vale de alimentos.</div>
      ${D.M.funds.map((f, i) => row('fund', i, f.name, f.amt, `<select class="fin-ct" aria-label="Categoría del fondo">${D.cats.map(c => `<option value="${c.id}" ${c.id === f.cat ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select>`, { a: 'fund-rm', k: 'fin-fund-' + i, l: 'Quitar fondo' })).join('')}
      <button type="button" class="btn small" data-fin="fund-add">${ic('plus', 15)} Agregar fondo</button></div>
    <div class="card"><h3>Categorías y presupuesto</h3><div class="muted fin-hint">Presupuesto mensual de cada una (S/). El nombre vale para todos los meses.</div>
      ${D.cats.map((c, i) => row('cat', i, c.name, D.M.bud[c.id], '', { a: 'cat-rm', k: 'fin-cat-' + i, l: 'Borrar categoría' })).join('')}
      <button type="button" class="btn small" data-fin="cat-add">${ic('plus', 15)} Agregar categoría</button></div>
    <small class="pb-err" id="fin-cfg-err" role="alert" hidden></small>
    <div class="muted fin-hint">${past ? `Se guarda solo para ${finMesTxt(ym)}.` : `Se guarda para ${finMesTxt(ym)} y los meses siguientes.`}</div>
    <button type="submit" class="btn primary block">Guardar</button></form>
    <div class="card fin-bk"><h3>Respaldo</h3><div class="muted fin-hint">Tus finanzas están <b>solo en este celular</b>: no se suben a tu cuenta ni van en el respaldo de Forja. Exporta un archivo de vez en cuando y guárdalo (Drive, correo…).</div>
      ${state.finImp ? `<div class="ns-dayw fin-impw" role="status"><span>El archivo tiene ${state.finImp.ex.length} gastos y ${state.finImp.cats.length} categorías${state.finImp.exported ? ` (exportado el ${fmtDate(state.finImp.exported)})` : ''}. <b>Reemplaza todo lo que tienes aquí.</b></span><div class="row" style="gap:8px"><button type="button" class="btn small" data-fin="imp-no">Cancelar</button><button type="button" class="btn small primary" data-fin="imp-yes">Reemplazar</button></div></div>` : ''}
      <div class="grid2"><button type="button" class="btn" data-fin="exp">${ic('download', 16)} Exportar archivo</button><button type="button" class="btn" data-fin="imp">${ic('upload', 16)} Importar archivo</button></div>
      <input type="file" id="fin-file" accept=".json,application/json,text/plain" hidden></div>`;
}
function finCfgSave() {
  finCfgRead();
  const D = state.finCfg, err = $('#fin-cfg-err'), say = t => { if (err) { err.textContent = t; err.hidden = false; err.scrollIntoView({ block: 'center' }); } };
  const bad = [].concat(D.M.pays, D.M.funds).some(x => isNaN(x.amt)) || D.cats.some(c => isNaN(D.M.bud[c.id]));
  if (bad) return say('Hay un monto que no entiendo: usa solo números, por ejemplo 1500 o 1500.50.');
  if (D.cats.some(c => !c.name) || D.M.pays.some(p => !p.name) || D.M.funds.some(f => !f.name)) return say('Ponle nombre a cada pago, fondo y categoría.');
  const names = D.cats.map(c => normName(c.name)); if (names.some((n, i) => names.indexOf(n) !== i)) return say('Hay dos categorías con el mismo nombre.');
  const F = fin(); F.cats = finClone(D.cats);
  Object.keys(D.M.bud).forEach(k => { if (!D.cats.some(c => c.id === k)) delete D.M.bud[k]; });
  D.M.funds.forEach(f => { if (!D.cats.some(c => c.id === f.cat)) f.cat = (D.cats[0] || {}).id; });
  finMSet(D.ym, D.M); state.finCfg = null; state.confirm = null; finSheet(); toast('Guardado.');
}
/* ---------- Respaldo ---------- */
function finExportText() { return JSON.stringify(Object.assign({}, fin(), { exported: new Date().toISOString() })); }
function finExport() {
  const txt = finExportText(), name = 'forja-finanzas-' + dk(new Date()) + '.json', C = typeof CAP !== 'undefined' ? CAP : null;
  if (C && C.Filesystem && C.Share) {
    C.Filesystem.writeFile({ path: name, data: txt, directory: 'CACHE', encoding: 'utf8' })
      .then(r => C.Share.share({ title: 'Mis finanzas (Forja)', files: [r.uri], dialogTitle: 'Guardar el respaldo de tus finanzas' }))
      .catch(e => { if (!/cancel/i.test(String(e && (e.message || e)))) toast('No se pudo guardar el archivo.'); });
    return;
  }
  try { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'application/json' })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); toast('Archivo guardado.'); } catch (e) { toast('No se pudo guardar el archivo.'); }
}
function finImportText(txt) {
  let d; try { d = JSON.parse(txt); } catch (e) { d = null; }
  const ok = d && d.app === 'forja-finanzas' && Array.isArray(d.cats) && Array.isArray(d.ex) && d.tpl && Array.isArray(d.tpl.pays) && d.m && typeof d.m === 'object'
    && d.ex.every(e => e && /^\d{4}-\d{2}-\d{2}$/.test(e.d) && Number.isInteger(e.amt) && e.amt >= 0);
  if (!ok) { toast('Ese archivo no es un respaldo de Mis finanzas.'); return false; }
  state.finImp = d; state.finT = 'cfg'; finSheet(); return true;
}

/* ---------- La pantalla ---------- */
const FIN_TABS = [['res', 'Resumen'], ['gas', 'Gastos'], ['cfg', 'Ajustes']];
function finSheet() {
  if (!finOwner()) return;
  const ym = state.finYM || (state.finYM = finYMnow()), t = state.finT || 'res', now = finYMnow();
  if (!fin().m[now]) { fin().m[now] = finM(now); finSave(); }   // el mes actual guarda su configuración
  const keep = $('#sheet .fin-sheet'), y = keep && keep.dataset.t === t ? keep.scrollTop : 0;
  openSheet(`<div class="row"><h2 class="grow">${ic('wallet', 20)} Mis finanzas</h2><button class="icon-btn" data-act="sheet-close" aria-label="Cerrar">${ic('x', 18)}</button></div>
    <div class="row fin-mes"><button type="button" class="icon-btn" data-fin="ym" data-d="-1" aria-label="Mes anterior">${ic('chevron-left', 18)}</button><b class="grow">${finMesTxt(ym)}</b><button type="button" class="icon-btn" data-fin="ym" data-d="1" aria-label="Mes siguiente" ${ym >= now ? 'disabled' : ''}>${ic('chevron-right', 18)}</button></div>
    <div class="seg fin-seg" role="tablist">${FIN_TABS.map(([k, l]) => `<button type="button" role="tab" class="${k === t ? 'on' : ''}" aria-selected="${k === t}" data-fin="tab" data-t="${k}">${l}</button>`).join('')}</div>
    <div class="fin-body">${t === 'gas' ? finExForm(ym) + finExList(ym) : t === 'cfg' ? finCfgHtml(ym) : finResHtml(ym)}</div>`);
  const c = $('#sheet .sheet-card'); if (c) { c.classList.add('pk-sheet', 'fin-sheet'); c.dataset.t = t; c.scrollTop = y; }
}
function finOpen() { state.finT = 'res'; state.finYM = finYMnow(); state.finEd = null; state.finCfg = null; state.finImp = null; finSheet(); }

/* ---------- Perfil: acceso (solo el dueño, solo teléfono) ---------- */
function finCard() {
  const ym = finYMnow(), S = finSum(ym);
  return `<button type="button" class="card fin-card" data-fin="open">${ic('wallet', 20)}<span class="grow"><b>Mis finanzas</b><small>${finMesTxt(ym)[0].toUpperCase() + finMesTxt(ym).slice(1, -5)}: gastado ${finS(S.spent)}${S.bud ? ` de ${finS(S.bud)}` : ''} · ahorro ${finS(S.saving)}</small></span>${ic('chevron-right', 16)}</button>`;
}
const _renderFin = render;
render = function () {
  _renderFin();
  if (!finOwner() || state.tab !== 'profile' || state.draft) return;
  const app = document.getElementById('app'); if (!app || app.querySelector('.fin-card')) return;
  const at = app.querySelector('.pf-jump') || app.querySelector('.pcard'); if (at) at.insertAdjacentHTML('afterend', finCard());
};

/* ---------- Toques y formularios ---------- */
document.addEventListener('click', ev => {
  const b = ev.target.closest && ev.target.closest('[data-fin]'); if (!b || !finOwner()) return;
  ev.preventDefault(); ev.stopPropagation();
  const a = b.dataset.fin, F = fin(), ym = state.finYM || finYMnow();
  if (a !== 'ex-del' && a.slice(-3) !== '-rm') state.confirm = null;
  if (a === 'open') finOpen();
  else if (a === 'tab') { if (state.finT === 'cfg') finCfgRead(); state.finT = b.dataset.t; state.finEd = null; finSheet(); if (b.dataset.t === 'gas') setTimeout(() => { const i = $('#fin-amt'); if (i) i.focus(); }, 60); }
  else if (a === 'ym') { const n = finYMadd(ym, +b.dataset.d); if (n <= finYMnow()) { state.finYM = n; state.finCfg = null; state.finEd = null; finSheet(); } }
  else if (a === 'ex-edit') { state.finEd = b.dataset.id; finSheet(); const c = $('#sheet .fin-sheet'); if (c) c.scrollTop = 0; }
  else if (a === 'ex-cancel') { state.finEd = null; finSheet(); }
  else if (a === 'ex-del') {
    const k = 'fin-del-' + b.dataset.id;
    if (state.confirm !== k) { state.confirm = k; finSheet(); return; }
    F.ex = F.ex.filter(e => e.id !== b.dataset.id); if (state.finEd === b.dataset.id) state.finEd = null; state.confirm = null; finSave(); finSheet(); toast('Gasto borrado.');
  }
  else if (/^(pay|fund|cat)-(add|rm)$/.test(a)) {
    finCfgRead(); const D = state.finCfg, i = +b.dataset.i;
    if (a === 'pay-add') D.M.pays.push({ id: finId('p'), name: 'Pago ' + (D.M.pays.length + 1), amt: 0 });
    if (a === 'fund-add') D.M.funds.push({ id: finId('f'), name: D.M.funds.length ? 'Fondo ' + (D.M.funds.length + 1) : 'Vale de alimentos', amt: 0, cat: (D.cats.find(c => /aliment/i.test(c.name)) || D.cats[0] || {}).id });
    if (a === 'cat-add') { const c = { id: finId('c'), name: 'Nueva categoría' }; D.cats.push(c); D.M.bud[c.id] = 0; }
    if (/-rm$/.test(a)) {
      const k = 'fin-' + a.slice(0, -3) + '-' + i;
      if (a === 'cat-rm') { const c = D.cats[i], n = c ? F.ex.filter(e => e.cat === c.id).length : 0; if (n) { state.confirm = null; finSheet(); toast(`«${c.name}» tiene ${n} ${n === 1 ? 'gasto' : 'gastos'}: cámbialos de categoría o bórralos antes.`); return; } }
      if (a === 'fund-rm') { const f = D.M.funds[i], n = f ? F.ex.filter(e => e.fund === f.id && e.d.slice(0, 7) === D.ym).length : 0; if (n) { state.confirm = null; finSheet(); toast(`«${f.name}» pagó ${n} ${n === 1 ? 'gasto' : 'gastos'} este mes: cámbialos antes.`); return; } }
      if (state.confirm !== k) { state.confirm = k; finSheet(); return; }
      state.confirm = null;
      if (a === 'pay-rm') D.M.pays.splice(i, 1);
      if (a === 'fund-rm') D.M.funds.splice(i, 1);
      if (a === 'cat-rm') { delete D.M.bud[D.cats[i].id]; D.cats.splice(i, 1); }
    }
    finSheet();
  }
  else if (a === 'exp') finExport();
  else if (a === 'imp') { const i = $('#fin-file'); if (i) { i.value = ''; i.click(); } }
  else if (a === 'imp-no') { state.finImp = null; finSheet(); }
  else if (a === 'imp-yes' && state.finImp) {
    LS.set('finPrev', fin());   // copia de lo que había, por si acaso
    FIN = state.finImp; delete FIN.exported; state.finImp = null; state.finCfg = null; state.finEd = null; finSave(); finSheet(); render(); toast('Finanzas importadas.');
  }
}, true);
document.addEventListener('change', ev => {
  const t = ev.target; if (!t || t.id !== 'fin-file' || !t.files || !t.files[0]) return;
  const r = new FileReader(); r.onload = () => finImportText(String(r.result || '')); r.onerror = () => toast('No se pudo leer el archivo.'); r.readAsText(t.files[0]);
});
document.addEventListener('submit', ev => {
  const f = ev.target; if (!f || (f.id !== 'f-fin-ex' && f.id !== 'f-fin-cfg')) return;
  ev.preventDefault(); ev.stopImmediatePropagation();
  if (f.id === 'f-fin-ex') finExSave(); else finCfgSave();
}, true);
bootRender();
