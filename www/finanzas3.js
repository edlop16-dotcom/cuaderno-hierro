/* ==========================================================================
   Tanda H3 · Mis finanzas (24-oct-2026), encima de finanzas.js y finanzas2.js. Solo el dueño y solo el teléfono.
   1. "Forja mis sueños" (pestaña Sueños): metas de ahorro con nombre, fecha deseada y 1-3 escenarios (monto objetivo,
      ahorro inicial y, opcional, un préstamo con monto, TEA y plazo → cuota por el sistema francés). Proyección mes a
      mes con el ahorro real promedio de los meses registrados. Supuesto: el préstamo cubre parte del objetivo y su
      cuota se paga desde el primer mes, durante su plazo (ahorro del mes = ahorro promedio − cuota).
   2. Exportar a Excel (.xlsx, xlsxw.js): DASHBOARD, REGISTRO, PROYECCIONES y CONFIG, con fórmulas (SUMIF = SUMAR.SI),
      listas desplegables y formato condicional del semáforo. Sin gráficos (el formato no los arma sin "drawings"):
      barras dentro de las celdas (dataBar) en su lugar.
   3. Importar gastos antiguos: pegar texto/CSV o abrir un archivo (fecha, concepto, categoría, monto [, vale, nota]),
      vista previa y se guardan solo al confirmar; categorías nuevas se crean o se asignan a una existente.
   ========================================================================== */

/* ---------- Ahorro real promedio ---------- */
/* Meses con datos anteriores al actual (el actual está a medias); si no hay, el actual */
function finAvgSaving() {
  const now = finYMnow(), F = fin(), set = {};
  Object.keys(F.m).forEach(m => { set[m] = 1; }); F.ex.forEach(e => { set[e.d.slice(0, 7)] = 1; });
  let ms = Object.keys(set).filter(m => m < now).sort().slice(-12); if (!ms.length) ms = [now];
  const v = ms.map(m => finSum(m).saving);
  return { avg: Math.round(v.reduce((a, b) => a + b, 0) / v.length), ms };
}

/* ---------- 1. Forja mis sueños ---------- */
/* Cuota del sistema francés: tasa mensual equivalente a la TEA; sin tasa, el préstamo en partes iguales */
function finCuota(amt, tea, n) {
  if (!(amt > 0) || !(n > 0)) return 0;
  const i = Math.pow(1 + (+tea || 0) / 100, 1 / 12) - 1;
  return Math.round(i ? amt * i / (1 - Math.pow(1 + i, -n)) : amt / n);
}
function finGoalCalc(sc, avg) {
  const L = sc.loan && sc.loan.amt > 0 && sc.loan.n > 0 ? sc.loan : null, cuota = L ? finCuota(L.amt, L.tea, L.n) : 0;
  const need = Math.max(0, (sc.target || 0) - (L ? L.amt : 0)), rows = [];
  let acc = sc.init || 0, months = acc >= need ? 0 : null;
  const start = finYMadd(finYMnow(), 1);
  for (let k = 1; k <= 120 && (months == null || k <= Math.max(12, months)); k++) {
    const q = L && k <= L.n ? cuota : 0, sav = avg - q; acc += sav;
    rows.push({ ym: finYMadd(start, k - 1), init: k === 1 ? sc.init || 0 : 0, q, sav, acc, falta: Math.max(0, need - acc) });
    if (months == null && acc >= need) months = k;
    if (months == null && k >= 60 && sav <= 0) break;
  }
  return { cuota, need, months, rows, reach: months == null ? null : months === 0 ? finYMnow() : rows[months - 1].ym, L };
}
const finGoals = () => (fin().goals = fin().goals || []);
const finScNew = n => ({ id: finId('s'), name: 'Escenario ' + n, target: 0, init: 0, loan: null });
function finSueHtml() {
  const A = finAvgSaving(), G = finGoals();
  if (state.finGoalEd) return finGoalForm();
  return `<div class="muted fin-hint">Ahorro real promedio: <b>${finS(A.avg)}</b> al mes (${A.ms.map(m => FIN_MES3(m) + ' ' + m.slice(2, 4)).join(', ')}). Las proyecciones empiezan en ${finMesTxt(finYMadd(finYMnow(), 1))}.</div>
    ${G.length ? G.map(g => finGoalCard(g, A.avg)).join('') : '<div class="card fin-empty"><b>Forja mis sueños</b><div class="muted">Crea una meta (por ejemplo, un auto o un viaje), con su monto y su fecha, y compara hasta 3 escenarios: distintos precios o préstamos.</div></div>'}
    <button type="button" class="btn primary block" data-fin="goal-new">${ic('plus', 16)} Nueva meta</button>`;
}
function finGoalCard(g, avg) {
  const C = g.sc.map(s => Object.assign({ s }, finGoalCalc(s, avg))), sel = C.find(c => c.s.id === g.sel) || C[0];
  const late = c => c.reach && g.date && c.reach > g.date, when = c => c.reach ? (c.months === 0 ? 'ya' : FIN_MES3(c.reach) + ' ' + c.reach.slice(0, 4)) : 'no llegas';
  const cell = (c, v) => `<td class="num${c === sel ? ' on' : ''}">${v}</td>`;
  return `<div class="card fin-goal"><div class="row"><h3 class="grow">${esc(g.name)}</h3><button type="button" class="icon-btn sm" data-fin="goal-edit" data-id="${g.id}" aria-label="Editar ${esc(g.name)}">${ic('pencil', 15)}</button></div>
    <div class="muted fin-hint">${g.date ? 'Para ' + finMesTxt(g.date) : 'Sin fecha'}</div>
    <div class="fin-tw"><table class="fin-t fin-sc"><thead><tr><th></th>${C.map(c => `<th class="${c === sel ? 'on' : ''}"><button type="button" class="fin-scb" data-fin="goal-sel" data-id="${g.id}" data-s="${c.s.id}">${esc(c.s.name)}</button></th>`).join('')}</tr></thead><tbody>
      <tr><td>Objetivo</td>${C.map(c => cell(c, finN(c.s.target))).join('')}</tr>
      <tr><td>Préstamo</td>${C.map(c => cell(c, c.L ? `${finN(c.L.amt)}<small>${(+c.L.tea || 0).toFixed(1)} % · ${c.L.n} m</small>` : '—')).join('')}</tr>
      <tr><td>Cuota</td>${C.map(c => cell(c, c.cuota ? finN(c.cuota) : '—')).join('')}</tr>
      <tr><td>Por juntar</td>${C.map(c => cell(c, finN(Math.max(0, c.need - (c.s.init || 0))))).join('')}</tr>
      <tr><td>Ahorro del mes</td>${C.map(c => cell(c, `<span class="${avg - c.cuota <= 0 ? 'neg' : ''}">${avg - c.cuota < 0 ? '−' : ''}${finN(avg - c.cuota)}</span>`)).join('')}</tr>
      <tr><td>Llegas</td>${C.map(c => cell(c, `<b class="${!c.reach || late(c) ? 'neg' : 'pos'}">${when(c)}</b>${c.months ? `<small>${c.months} ${c.months === 1 ? 'mes' : 'meses'}</small>` : ''}`)).join('')}</tr>
    </tbody></table></div>
    ${!sel.reach && avg - sel.cuota <= 0 ? `<div class="ns-dayw fin-alert fin-al100" role="status">Con «${esc(sel.s.name)}» no llegas: tu ahorro promedio (${finS(avg)}) no cubre la cuota (${finS(sel.cuota)}).</div>` : ''}
    <div class="label">Proyección · ${esc(sel.s.name)}</div>
    <div class="fin-tw fin-pj"><table class="fin-t"><thead><tr><th>Mes</th><th>Cuota</th><th>Ahorro</th><th>Acumulado</th><th>Falta</th></tr></thead><tbody>
      <tr class="fin-pj0${sel.months === 0 ? ' fin-goalm' : ''}"><td>Ahora</td><td></td><td class="muted">inicial</td><td class="num">${finN(sel.s.init || 0)}</td><td class="num">${finN(Math.max(0, sel.need - (sel.s.init || 0)))}</td></tr>
      ${sel.rows.map((r, i) => `<tr class="${sel.months === i + 1 ? 'fin-goalm' : ''}${g.date === r.ym ? ' fin-due' : ''}"><td>${FIN_MES3(r.ym)} ${r.ym.slice(2, 4)}</td><td class="num">${r.q ? finN(r.q) : ''}</td><td class="num ${r.sav < 0 ? 'neg' : ''}">${r.sav < 0 ? '−' : ''}${finN(r.sav)}</td><td class="num">${r.acc < 0 ? '−' : ''}${finN(r.acc)}</td><td class="num">${finN(r.falta)}</td></tr>`).join('')}
    </tbody></table></div>
    <div class="muted fin-hint">Por juntar = objetivo − préstamo − ahorro inicial. Ahorro del mes = tu ahorro promedio − la cuota (se paga desde el primer mes, durante el plazo). Montos en S/.</div></div>`;
}
/* Formulario de la meta (borrador en state.finGoalEd; se lee de los campos antes de agregar o quitar escenarios) */
function finGoalForm() {
  const D = state.finGoalEd;
  return `<form id="f-fin-goal" class="fin-cfg" novalidate><div class="card"><h3>${D.isNew ? 'Nueva meta' : 'Editar meta'}</h3>
      <div class="grid2"><label class="field"><span class="label">Nombre</span><input id="fg-name" maxlength="40" value="${esc(D.name)}" placeholder="Ej. Auto"></label>
      <label class="field"><span class="label">Fecha deseada</span><input type="month" id="fg-date" value="${esc(D.date || '')}"></label></div></div>
    ${D.sc.map((s, i) => `<div class="card fin-scf" data-sc="${i}"><div class="row"><input class="fs-name grow" maxlength="24" value="${esc(s.name)}" aria-label="Nombre del escenario">${D.sc.length > 1 ? `<button type="button" class="icon-btn sm" data-fin="sc-rm" data-i="${i}" aria-label="Quitar escenario">${ic('x', 15)}</button>` : ''}</div>
      <div class="grid2"><label class="field"><span class="label">Monto objetivo en soles</span><input class="fs-target" inputmode="decimal" value="${finIn(s.target)}" placeholder="0.00"></label>
        <label class="field"><span class="label">Ahorro inicial en soles</span><input class="fs-init" inputmode="decimal" value="${finIn(s.init)}" placeholder="0.00"></label></div>
      <label class="row fin-vale"><input type="checkbox" class="fs-loan" ${s.loan ? 'checked' : ''}><span class="grow">Con préstamo</span></label>
      <div class="fin-loan" ${s.loan ? '' : 'hidden'}><label class="field"><span class="label">Monto del préstamo</span><input class="fs-lamt" inputmode="decimal" value="${s.loan ? finIn(s.loan.amt) : ''}" placeholder="0.00"></label>
        <div class="grid2"><label class="field"><span class="label">TEA (%)</span><input class="fs-tea" inputmode="decimal" value="${s.loan && s.loan.tea != null ? s.loan.tea : ''}" placeholder="Ej. 14.5"></label>
        <label class="field"><span class="label">Plazo (meses)</span><input class="fs-n" inputmode="numeric" value="${s.loan && s.loan.n ? s.loan.n : ''}" placeholder="Ej. 36"></label></div></div></div>`).join('')}
    ${D.sc.length < 3 ? `<button type="button" class="btn small" data-fin="sc-add">${ic('plus', 15)} Agregar escenario (máx. 3)</button>` : ''}
    <small class="pb-err" id="fg-err" role="alert" hidden></small>
    <div class="grid2"><button type="button" class="btn" data-fin="goal-cancel">Cancelar</button><button type="submit" class="btn primary">Guardar meta</button></div>
    ${D.isNew ? '' : `<button type="button" class="btn danger block" data-fin="goal-del">${state.confirm === 'fin-goal-del' ? '¿Borrar la meta? Toca otra vez' : 'Borrar meta'}</button>`}</form>`;
}
function finGoalRead() {
  const D = state.finGoalEd; if (!D || !$('#f-fin-goal')) return D;
  D.name = ($('#fg-name') || {}).value || ''; D.date = ($('#fg-date') || {}).value || '';
  document.querySelectorAll('#f-fin-goal .fin-scf').forEach(el => {
    const s = D.sc[+el.dataset.sc]; if (!s) return; const q = c => el.querySelector(c), num = c => { const v = q(c).value.trim(); return v === '' ? 0 : finParse(v); };
    s.name = q('.fs-name').value.trim(); s.target = num('.fs-target'); s.init = num('.fs-init');
    s.loan = q('.fs-loan').checked ? { amt: num('.fs-lamt'), tea: parseFloat(String(q('.fs-tea').value).replace(',', '.')), n: parseInt(q('.fs-n').value, 10) } : null;
  });
  return D;
}
function finGoalSave() {
  const D = finGoalRead(), err = $('#fg-err'), say = t => { if (err) { err.textContent = t; err.hidden = false; err.scrollIntoView({ block: 'center' }); } };
  if (!D.name.trim()) return say('Ponle nombre a la meta.');
  if (D.date && !/^\d{4}-\d{2}$/.test(D.date)) return say('Elige el mes deseado.');
  for (const s of D.sc) {
    if (!s.name) return say('Ponle nombre a cada escenario.');
    if (isNaN(s.target) || isNaN(s.init) || !(s.target > 0)) return say(`«${s.name}»: escribe el monto objetivo (mayor que 0) y el ahorro inicial (o déjalo vacío).`);
    if (s.loan && (isNaN(s.loan.amt) || !(s.loan.amt > 0) || !(s.loan.n >= 1 && s.loan.n <= 480) || isNaN(s.loan.tea) || s.loan.tea < 0 || s.loan.tea > 200)) return say(`«${s.name}»: revisa el préstamo (monto, TEA entre 0 y 200 % y plazo de 1 a 480 meses).`);
  }
  const G = finGoals(), g = { id: D.id, name: D.name.trim(), date: D.date, sc: finClone(D.sc), sel: D.sel && D.sc.some(s => s.id === D.sel) ? D.sel : D.sc[0].id };
  const i = G.findIndex(x => x.id === D.id); if (i >= 0) G[i] = g; else G.push(g);
  finSave(); state.finGoalEd = null; finSheet(); toast('Meta guardada.');
}

/* ---------- 2. Exportar a Excel ---------- */
function finXlsxWb(ym) {
  const F = fin(), S = finSum(ym), M = S.M, A = finAvgSaving(), s = XL.s, n = F.cats.length;
  const g = finGoals()[0], sc = g ? (g.sc.find(x => x.id === g.sel) || g.sc[0]) : null, C = sc ? finGoalCalc(sc, A.avg) : null;
  const c0 = 14, cEnd = c0 + n - 1, money = v => ({ v: v / 100, s: s.money });
  /* CONFIG */
  const config = { name: 'CONFIG', cols: [30, 18, 50], rows: [
    [{ v: 'Configuración · ' + finMesTxt(ym), s: s.title }], [],
    [{ v: 'Concepto', s: s.head }, { v: 'Valor', s: s.head }, { v: 'Nota', s: s.head }],
    ['Sueldo del mes', money(S.sal), M.pays.map(p => `${p.name} ${finS(p.amt)}`).join(' · ')],
    ['Vale / fondos aparte', money(S.funds), M.funds.map(f => `${f.name} (${(finCat(f.cat) || { name: '' }).name})`).join(' · ')],
    ['Cuota mensual', money(C ? C.cuota : 0), C && C.L ? `Préstamo ${finS(C.L.amt)}, TEA ${C.L.tea} %, ${C.L.n} meses (sistema francés)` : 'Sin préstamo'],
    ['Meta', g ? g.name + ' · ' + sc.name : 'Sin meta', g && g.date ? 'Para ' + finMesTxt(g.date) : ''],
    ['Monto objetivo', money(sc ? sc.target : 0), ''],
    ['Ahorro inicial', money(sc ? sc.init : 0), ''],
    ['Préstamo para la meta', money(C && C.L ? C.L.amt : 0), ''],
    ['Ahorro mensual promedio', money(A.avg), 'Promedio real de: ' + A.ms.map(finMesTxt).join(', ')],
    ['Plazo del préstamo (meses)', { v: C && C.L ? C.L.n : 0 }, ''],
    [{ v: 'Categoría', s: s.head }, { v: 'Presupuesto', s: s.head }],
  ].concat(F.cats.map(c => [c.name, money(+M.bud[c.id] || 0)])) };
  /* REGISTRO */
  const ex = finExOf(ym).slice().sort((a, b) => a.d.localeCompare(b.d) || (a.at || 0) - (b.at || 0));
  const registro = { name: 'REGISTRO', cols: [12, 30, 20, 14, 18, 36], rows: [['Fecha', 'Concepto', 'Categoría', 'Monto', '¿Pagado con vale?', 'Observación'].map(v => ({ v, s: s.head }))]
    .concat(ex.map(e => [{ v: e.d, t: 'd' }, e.c || '', (finCat(e.cat) || { name: '' }).name, money(e.amt), e.fund ? 'Sí' : 'No', e.note || ''])),
    dv: [{ ref: 'C2:C1000', list: `CONFIG!$A$${c0}:$A$${cEnd}` }, { ref: 'E2:E1000', list: '"Sí,No"' }] };
  /* DASHBOARD */
  const t0 = 9, tEnd = t0 + n - 1, tot = tEnd + 1, r1 = tot + 2;
  const dash = { name: 'DASHBOARD', cols: [30, 16, 16, 16, 14], merges: ['A1:E1'], rows: [] }, R = dash.rows;
  R[0] = [{ v: 'Mis finanzas · ' + finMesTxt(ym), s: s.title }];
  R[2] = [{ v: 'Ingresos', s: s.head }, { v: 'S/', s: s.head }];
  R[3] = ['Sueldo', { f: 'CONFIG!B4', s: s.money }];
  R[4] = ['Vale / fondos aparte', { f: 'CONFIG!B5', s: s.money }];
  R[5] = [{ v: 'Ingreso total', s: s.bold }, { f: 'B4+B5', s: s.moneyB }];
  R[7] = ['Categoría', 'Presupuesto', 'Gastado', 'Saldo', '% ejecutado'].map(v => ({ v, s: s.head }));
  for (let k = 0; k < n; k++) { const r = t0 + k; R[r - 1] = [{ f: `CONFIG!A${c0 + k}` }, { f: `CONFIG!B${c0 + k}`, s: s.money }, { f: `SUMIF(REGISTRO!$C:$C,$A${r},REGISTRO!$D:$D)`, s: s.money }, { f: `B${r}-C${r}`, s: s.money }, { f: `IF(B${r}=0,0,C${r}/B${r})`, s: s.pct }]; }
  R[tot - 1] = [{ v: 'Total', s: s.bold }, { f: `SUM(B${t0}:B${tEnd})`, s: s.moneyB }, { f: `SUM(C${t0}:C${tEnd})`, s: s.moneyB }, { f: `B${tot}-C${tot}`, s: s.moneyB }, { f: `IF(B${tot}=0,0,C${tot}/B${tot})`, s: s.pct }];
  R[r1 - 1] = [{ v: 'Resumen', s: s.head }, { v: 'S/', s: s.head }];
  R[r1] = ['Gastado con el sueldo', { f: 'SUMIF(REGISTRO!$E:$E,"No",REGISTRO!$D:$D)', s: s.money }];
  R[r1 + 1] = ['Gastado con el vale', { f: 'SUMIF(REGISTRO!$E:$E,"Sí",REGISTRO!$D:$D)', s: s.money }];
  R[r1 + 2] = [{ v: 'Ahorro del mes', s: s.bold }, { f: `B4-B${r1 + 1}`, s: s.moneyB }, { v: 'Sueldo − gastado con el sueldo', s: s.note }];
  R[r1 + 3] = ['Cuota', { f: 'CONFIG!B6', s: s.money }];
  R[r1 + 4] = [{ v: 'Saldo', s: s.bold }, { f: `B${r1 + 3}-B${r1 + 4}`, s: s.moneyB }, { v: 'Ahorro del mes − cuota', s: s.note }];
  const ins = r1 + 7;
  ['Instrucciones', '1. Anota cada gasto en REGISTRO (la categoría y "¿Pagado con vale?" se eligen de la lista).', '2. Esta hoja se calcula sola con SUMAR.SI: no escribas sobre las fórmulas.', '3. Cambia el sueldo, el vale, la cuota y los presupuestos en CONFIG.', '4. Semáforo del % ejecutado: verde menos de 80 %, amarillo 80-100 %, rojo más de 100 %.', '5. Para un gráfico: selecciona la tabla de categorías y usa Insertar → Gráfico.']
    .forEach((t, i) => { R[ins - 1 + i] = [{ v: t, s: i ? s.note : s.bold }]; });
  dash.cf = [{ ref: `E${t0}:E${tot}`, rules: [{ op: 'greaterThan', f: ['1'], dxf: XL.dxf.r }, { op: 'between', f: ['0.8', '1'], dxf: XL.dxf.y }, { op: 'lessThan', f: ['0.8'], dxf: XL.dxf.g }] },
    { ref: `C${t0}:C${tEnd}`, rules: [{ type: 'dataBar', color: 'FF3987E5' }] }];
  /* PROYECCIONES */
  const rows = C ? C.rows : [], p0 = 4;
  const proy = { name: 'PROYECCIONES', cols: [12, 16, 14, 16, 16, 16], merges: ['A1:F1'], rows: [[{ v: g ? `Proyección · ${g.name} · ${sc.name}` : 'Proyección (crea una meta en Forja mis sueños)', s: s.title }],
    [{ v: 'Ahorro del mes = ahorro mensual promedio − cuota (durante el plazo). Falta = objetivo − préstamo − acumulado.', s: s.note }],
    ['Mes', 'Ahorro inicial', 'Cuota', 'Ahorro del mes', 'Acumulado', 'Falta'].map(v => ({ v, s: s.head }))] };
  rows.forEach((r, i) => { const x = p0 + i;
    proy.rows.push([`${FIN_MES3(r.ym)} ${r.ym.slice(0, 4)}`, i ? '' : { f: 'CONFIG!B9', s: s.money }, { f: `IF(${i + 1}<=CONFIG!$B$12,CONFIG!$B$6,0)`, s: s.money }, { f: `CONFIG!$B$11-C${x}`, s: s.money },
      { f: i ? `E${x - 1}+D${x}` : `B${x}+D${x}`, s: s.money }, { f: `MAX(0,CONFIG!$B$8-CONFIG!$B$10-E${x})`, s: s.money }]); });
  if (rows.length) proy.cf = [{ ref: `E${p0}:E${p0 + rows.length - 1}`, rules: [{ type: 'dataBar', color: 'FF199E70' }] }];
  return { sheets: [dash, registro, proy, config] };
}
function finXlsx(ym) {
  const bytes = xlsxBuild(finXlsxWb(ym)), name = `forja-finanzas-${ym}.xlsx`, C = typeof CAP !== 'undefined' ? CAP : null;
  if (C && C.Filesystem && C.Share) {
    C.Filesystem.writeFile({ path: name, data: xlB64(bytes), directory: 'CACHE' })
      .then(r => C.Share.share({ title: 'Mis finanzas (Excel)', files: [r.uri], dialogTitle: 'Guardar o enviar el Excel' }))
      .catch(e => { if (!/cancel/i.test(String(e && (e.message || e)))) toast('No se pudo crear el Excel.'); });
    return;
  }
  try { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([bytes], { type: XL_CT })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); toast('Excel guardado.'); } catch (e) { toast('No se pudo crear el Excel.'); }
}

/* ---------- 3. Importar gastos antiguos ---------- */
/* Fecha: AAAA-MM-DD, DD/MM/AAAA, DD-MM-AAAA o DD/MM/AA → AAAA-MM-DD (o null) */
function finDateParse(s) {
  s = String(s || '').trim(); let y, m, d, x;
  if ((x = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/))) { y = +x[1]; m = +x[2]; d = +x[3]; }
  else if ((x = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})$/))) { d = +x[1]; m = +x[2]; y = +x[3]; if (y < 100) y += 2000; }
  else return null;
  const t = new Date(y, m - 1, d); if (t.getFullYear() !== y || t.getMonth() !== m - 1 || t.getDate() !== d) return null;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
/* Una línea CSV con comillas ("Mercado, feria") y el separador dado */
function finCsvCells(l, sep) {
  const out = []; let cur = '', q = false;
  for (let i = 0; i < l.length; i++) { const ch = l[i];
    if (q) { if (ch === '"' && l[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; }
    else if (ch === '"') q = true; else if (ch === sep) { out.push(cur.trim()); cur = ''; } else cur += ch; }
  out.push(cur.trim()); return out;
}
function finCsvParse(txt) {
  const L = String(txt || '').replace(/\r/g, '').split('\n').map(l => l.trim()).filter(l => l && !/^[|\-\s:]+$/.test(l));
  if (!L.length) return { rows: [] };
  const sepOf = l => l.indexOf('\t') >= 0 ? '\t' : l.indexOf(';') >= 0 ? ';' : l.indexOf('|') >= 0 ? '|' : ',';
  let map = { d: 0, c: 1, cat: 2, amt: 3, vale: 4, note: 5 }, start = 0;
  const h = finCsvCells(L[0].replace(/^\||\|$/g, ''), sepOf(L[0])).map(x => normName(x));
  if (h.some(x => /^fecha/.test(x)) && h.some(x => /monto|importe|valor/.test(x))) {
    const at = re => h.findIndex(x => re.test(x));
    map = { d: at(/^fecha/), c: at(/concepto|descrip|detalle|gasto/), cat: at(/categor/), amt: at(/monto|importe|valor/), vale: at(/vale/), note: at(/nota|observ/) }; start = 1;
  }
  const rows = L.slice(start).map((l, i) => {
    const sep = sepOf(l), cells = finCsvCells(l.replace(/^\||\|$/g, ''), sep), g = k => map[k] >= 0 ? cells[map[k]] || '' : '';
    let amtTxt = g('amt');
    /* "12,50" sin comillas en un CSV con comas: la parte decimal queda en la celda siguiente */
    if (sep === ',' && map.amt === 3 && cells.length > 4 && /^\d{1,2}$/.test(cells[4]) && /^\d+$/.test(amtTxt)) { amtTxt += '.' + cells[4]; cells.splice(4, 1); }
    const d = finDateParse(g('d')), amt = finParse(amtTxt), v = normName(g('vale'));
    const err = !d ? 'fecha' : isNaN(amt) || !(amt > 0) ? 'monto' : !g('cat') ? 'categoría' : '';
    return { n: start + i + 1, raw: l, d, c: g('c'), catName: g('cat').replace(/^["']|["']$/g, ''), amt, vale: /^(si|sí|s|x|1|true|yes)$/.test(v), note: g('note'), err };
  });
  return { rows };
}
function finImpHtml() {
  const I = state.finOld || (state.finOld = { txt: '' }), F = fin(), P = I.P;
  let body = '';
  if (P) {
    const unknown = []; P.rows.forEach(r => { if (!r.err && !F.cats.some(c => normName(c.name) === normName(r.catName)) && unknown.indexOf(r.catName) < 0) unknown.push(r.catName); });
    const dup = r => F.ex.some(e => e.d === r.d && e.amt === r.amt && normName(e.c || '') === normName(r.c || '') && normName((finCat(e.cat) || {}).name || '') === normName(r.catName));
    P.rows.forEach(r => { r.dup = !r.err && dup(r); });
    const okN = P.rows.filter(r => !r.err && !r.dup).length, months = {}; P.rows.forEach(r => { if (!r.err && !r.dup) months[r.d.slice(0, 7)] = 1; });
    body = `<div class="card fin-recp"><h3>Vista previa</h3><div class="muted fin-hint">${okN} ${okN === 1 ? 'gasto' : 'gastos'} para guardar${Object.keys(months).length ? ' en ' + Object.keys(months).sort().map(finMesTxt).join(', ') : ''}. Las filas con error o repetidas no se guardan.</div>
      ${unknown.length ? `<div class="label">Categorías que no tienes</div>${unknown.map((u, i) => `<label class="row fin-row"><span class="grow">«${esc(u)}»</span><select class="fin-umap" data-u="${esc(u)}"><option value="__new">Crear «${esc(u)}»</option>${F.cats.map(c => `<option value="${c.id}" ${(I.map || {})[u] === c.id ? 'selected' : ''}>Usar ${esc(c.name)}</option>`).join('')}</select></label>`).join('')}` : ''}
      <div class="fin-tw"><table class="fin-t fin-oldt"><thead><tr><th>Fecha</th><th>Concepto</th><th>Categoría</th><th>Monto</th><th></th></tr></thead><tbody>
        ${P.rows.map(r => `<tr class="${r.err ? 'fin-r' : r.dup ? 'fin-n' : ''}"><td>${r.d ? r.d.slice(8) + '/' + r.d.slice(5, 7) + '/' + r.d.slice(2, 4) : esc(r.raw.slice(0, 10))}</td><td>${esc(r.c || '')}${r.vale ? ' <small class="fin-tag">vale</small>' : ''}</td><td>${esc(r.catName)}</td><td class="num">${isNaN(r.amt) ? '' : finN(r.amt)}</td><td>${r.err ? `<small class="neg">revisa ${r.err}</small>` : r.dup ? '<small class="muted">repetido</small>' : '✓'}</td></tr>`).join('')}
      </tbody></table></div>
      ${okN ? `<button type="button" class="btn primary block" data-fin="old-save">Guardar ${okN} ${okN === 1 ? 'gasto' : 'gastos'}</button>` : ''}</div>`;
  }
  return `<div class="card fin-rec"><h3>Importar gastos antiguos</h3><div class="muted fin-hint">Pega una lista o un CSV, una línea por gasto: <b>fecha; concepto; categoría; monto</b> (opcional: vale sí/no; nota). Acepta coma, punto y coma, tabulación o "|", y fechas 24/10/2026 o 2026-10-24. Revisa la vista previa antes de guardar.</div>
    <textarea id="fin-old-t" class="note-in" rows="6" placeholder="fecha;concepto;categoría;monto&#10;05/09/2026;Mercado;Alimentación;320.00">${esc(I.txt || '')}</textarea>
    <small class="pb-err" id="fin-old-e" role="alert" ${I.err ? '' : 'hidden'}>${esc(I.err || '')}</small>
    <div class="grid2"><button type="button" class="btn" data-fin="old-file">${ic('upload', 16)} Abrir archivo</button><button type="button" class="btn primary" data-fin="old-read">Leer</button></div>
    <button type="button" class="btn block" data-fin="old-cancel">Volver a Gastos</button>
    <input type="file" id="fin-old-f" accept=".csv,.txt,text/csv,text/plain" hidden></div>${body}`;
}
function finOldSave() {
  const I = state.finOld, F = fin(); if (!I || !I.P) return;
  document.querySelectorAll('#sheet .fin-umap').forEach(s => { (I.map = I.map || {})[s.dataset.u] = s.value; });
  const catOf = name => { const c = F.cats.find(x => normName(x.name) === normName(name)); if (c) return c.id;
    const m = (I.map || {})[name]; if (m && m !== '__new' && finCat(m)) return m;
    const nc = { id: finId('c'), name: name.slice(0, 40) }; F.cats.push(nc); return nc.id; };
  let n = 0;
  I.P.rows.forEach(r => { if (r.err || r.dup) return; const cat = catOf(r.catName), M = finM(r.d.slice(0, 7));
    const fund = r.vale ? ((M.funds.find(f => f.cat === cat) || M.funds[0] || {}).id || null) : null;
    F.ex.push({ id: finId('g'), at: Date.now() + n, d: r.d, c: r.c, cat, amt: r.amt, fund, note: r.note || '' }); n++; });
  finSave(); state.finOld = null; state.finT = 'gas'; finSheet(); toast(`${n} ${n === 1 ? 'gasto importado' : 'gastos importados'}.`);
}

/* ---------- Toques (los llama el manejador de finanzas.js) ---------- */
function finClick3(a, b) {
  const G = finGoals();
  if (a === 'goal-new') { state.finGoalEd = { isNew: 1, id: finId('m'), name: '', date: '', sc: [finScNew(1)], sel: null }; finSheet(); return true; }
  if (a === 'goal-edit') { const g = G.find(x => x.id === b.dataset.id); if (g) { state.finGoalEd = finClone(g); state.confirm = null; finSheet(); } return true; }
  if (a === 'goal-cancel') { state.finGoalEd = null; finSheet(); return true; }
  if (a === 'goal-sel') { const g = G.find(x => x.id === b.dataset.id); if (g) { g.sel = b.dataset.s; finSave(); finSheet(); } return true; }
  if (a === 'goal-del') {
    if (state.confirm !== 'fin-goal-del') { finGoalRead(); state.confirm = 'fin-goal-del'; finSheet(); return true; }
    fin().goals = G.filter(x => x.id !== state.finGoalEd.id); state.confirm = null; state.finGoalEd = null; finSave(); finSheet(); toast('Meta borrada.'); return true;
  }
  if (a === 'sc-add') { const D = finGoalRead(); if (D.sc.length < 3) D.sc.push(Object.assign(finScNew(D.sc.length + 1), { target: (D.sc[0] || {}).target || 0, init: (D.sc[0] || {}).init || 0 })); finSheet(); return true; }
  if (a === 'sc-rm') { const D = finGoalRead(); D.sc.splice(+b.dataset.i, 1); finSheet(); return true; }
  if (a === 'xlsx') { finXlsx(state.finYM || finYMnow()); return true; }
  if (a === 'old') { state.finOld = { txt: '' }; state.finT = 'imp'; finSheet(); setTimeout(() => { const t = $('#fin-old-t'); if (t) t.focus(); }, 60); return true; }
  if (a === 'old-cancel') { state.finOld = null; state.finT = 'gas'; finSheet(); return true; }
  if (a === 'old-file') { const i = $('#fin-old-f'); if (i) { i.value = ''; i.click(); } return true; }
  if (a === 'old-read') {
    const txt = ($('#fin-old-t') || {}).value || '', P = finCsvParse(txt);
    state.finOld = { txt, P: P.rows.length ? P : null, map: (state.finOld || {}).map, err: P.rows.length ? '' : 'Pega primero tus gastos: una línea por gasto con fecha, concepto, categoría y monto.' };
    finSheet(); return true;
  }
  if (a === 'old-save') { finOldSave(); return true; }
  return false;
}
document.addEventListener('change', ev => {
  const t = ev.target; if (!t) return;
  if (t.id === 'fin-old-f' && t.files && t.files[0]) { const r = new FileReader(); r.onload = () => { state.finOld = { txt: String(r.result || '') }; finSheet(); const b = document.querySelector('#sheet [data-fin="old-read"]'); if (b) b.click(); }; r.readAsText(t.files[0]); }
  if (t.classList && t.classList.contains('fin-umap') && state.finOld) (state.finOld.map = state.finOld.map || {})[t.dataset.u] = t.value;
  if (t.classList && t.classList.contains('fs-loan')) { const box = t.closest('.fin-scf').querySelector('.fin-loan'); if (box) box.hidden = !t.checked; }
});
document.addEventListener('submit', ev => {
  if (!ev.target || ev.target.id !== 'f-fin-goal') return;
  ev.preventDefault(); ev.stopImmediatePropagation(); finGoalSave();
}, true);
