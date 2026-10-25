/* ==========================================================================
   Tanda H2 · Mis finanzas (24-oct-2026), encima de finanzas.js. Solo el dueño y solo el teléfono.
   1. Gráficos del mes (Resumen): torta de gastos por categoría y barras de presupuesto vs gastado.
   2. Alertas: al registrar un gasto, aviso cuando una categoría llega al 80 % o pasa el 100 % de su presupuesto
      (una vez por nivel); como notificación del celular solo si se activa en Ajustes (`fin().opt.notif`).
   3. Meses (pestaña nueva): ahorro y gasto por categoría de los últimos 6 meses y la nota "Lecciones del mes".
   4. "Exportar para IA": copia el resumen del mes, sus gastos, la nota y la comparación con el mes anterior, con
      un prompt y el formato PRESUPUESTO AAAA-MM / Categoría | Monto.
   5. "Importar recomendación": pega ese presupuesto, vista previa y se aplica al mes siguiente solo al confirmar.
   Colores de las categorías: 5 tonos validados con el validador de dataviz sobre #1f2226 y #15171a (también como
   anillo de torta); de la 6.ª en adelante, gris "Otras". Rojo, amarillo y verde quedan solo para el semáforo.
   ========================================================================== */
const FIN_PAL = ['#3987e5', '#199e70', '#9085e9', '#c98500', '#d55181'], FIN_OTRAS = '#6b7079';
const FIN_MES3 = m => FIN_MES[+m.slice(5, 7) - 1].slice(0, 3);
const finSpentCat = (ym, cat) => finExOf(ym).filter(e => e.cat === cat).reduce((a, e) => a + e.amt, 0);

/* ---------- 1. Gráficos del mes ---------- */
function finArc(cx, cy, R, r, a0, a1) {
  if (a1 - a0 >= 2 * Math.PI - 1e-6) a1 = a0 + 2 * Math.PI - 1e-4;   // un solo sector: el anillo entero
  const large = a1 - a0 > Math.PI ? 1 : 0, p = (rad, a) => (cx + rad * Math.cos(a)).toFixed(2) + ' ' + (cy + rad * Math.sin(a)).toFixed(2);
  return `M ${p(R, a0)} A ${R} ${R} 0 ${large} 1 ${p(R, a1)} L ${p(r, a1)} A ${r} ${r} 0 ${large} 0 ${p(r, a0)} Z`;
}
/* Partes de la torta en el orden fijo de las categorías (el color sigue a la categoría, no al tamaño) */
function finParts(rows) {
  const parts = []; let otras = 0;
  rows.forEach((r, i) => { if (!r.spent) return; if (i < FIN_PAL.length) parts.push({ name: r.c.name, v: r.spent, col: FIN_PAL[i] }); else otras += r.spent; });
  if (otras) parts.push({ name: 'Otras', v: otras, col: FIN_OTRAS });
  return parts;
}
function finPie(S) {
  const parts = finParts(S.rows);
  if (!parts.length) return '<div class="fin-chart"><div class="label">Gastos por categoría</div><div class="muted fin-empty">Aún no hay gastos este mes.</div></div>';
  const tot = parts.reduce((a, p) => a + p.v, 0); let a0 = -Math.PI / 2;
  const arcs = parts.map(p => { const a1 = a0 + p.v / tot * 2 * Math.PI, d = finArc(80, 80, 72, 46, a0, a1); a0 = a1;
    return `<path class="fin-sl" d="${d}" fill="${p.col}"><title>${esc(p.name)}: ${finS(p.v)} (${Math.round(p.v / tot * 100)} %)</title></path>`; }).join('');
  return `<div class="fin-chart"><div class="label">Gastos por categoría</div><div class="fin-pie">
    <svg viewBox="0 0 160 160" role="img" aria-label="Gastos por categoría: ${parts.map(p => `${esc(p.name)} ${Math.round(p.v / tot * 100)} %`).join(', ')}">${arcs}<text x="80" y="76" text-anchor="middle" class="fin-pt">Gastado</text><text x="80" y="94" text-anchor="middle" class="fin-pv">${finS(tot)}</text></svg>
    <ul class="fin-legend">${parts.map(p => `<li><i style="background:${p.col}"></i><span class="grow">${esc(p.name)}</span><span class="num">${finN(p.v)}</span><b class="num">${Math.round(p.v / tot * 100)} %</b></li>`).join('')}</ul></div></div>`;
}
/* Barras: el riel gris es el presupuesto; la barra de color, lo gastado (color del semáforo + el % escrito) */
function finBars(S) {
  const rows = S.rows.filter(r => r.bud || r.spent); if (!rows.length) return '';
  const mx = Math.max.apply(null, rows.map(r => Math.max(r.bud, r.spent))) || 1, w = v => (v / mx * 100).toFixed(1) + '%';
  return `<div class="fin-chart"><div class="label">Presupuesto vs gastado</div>${rows.map(r => `<div class="fin-bar fin-${r.st}" title="${esc(r.c.name)}: ${finS(r.spent)} de ${finS(r.bud)}">
      <div class="row"><span class="grow">${esc(r.c.name)}</span><small class="num">${finN(r.spent)} / ${finN(r.bud)} · <b>${finPct(r)}</b></small></div>
      <div class="fin-bt"><i class="b" style="width:${w(r.bud)}"></i><i class="s" style="width:${w(r.spent)}"></i></div></div>`).join('')}
    <div class="muted fin-leg">Gris: presupuesto · color: lo gastado (verde, amarillo o rojo según el %). Montos en S/.</div></div>`;
}

/* ---------- 2. Alertas ---------- */
function finCatPct(ym, cat) { const bud = +(finM(ym).bud || {})[cat] || 0; return bud ? finSpentCat(ym, cat) / bud * 100 : null; }
const finLvl = p => p == null ? 0 : p > 100 ? 100 : p >= 80 ? 80 : 0;
function finAlert(ym, cat, pre) {
  const p = finCatPct(ym, cat), lvl = finLvl(p); if (!lvl || lvl <= finLvl(pre)) return;
  const c = finCat(cat) || { name: '' }, bud = +(finM(ym).bud || {})[cat] || 0, sp = finSpentCat(ym, cat);
  const txt = lvl === 100 ? `${c.name} pasó su presupuesto: ${Math.round(p)} % (${finS(sp)} de ${finS(bud)}).` : `${c.name} llegó al ${Math.round(p)} % de su presupuesto (${finS(sp)} de ${finS(bud)}).`;
  state.finAlert = { lvl, txt }; toast(txt);
  const t = state.finT; if (t === 'gas') finSheet();
  const F = fin();
  if (F.opt && F.opt.notif && typeof LN !== 'undefined' && LN && state.notifPerm === 'granted')
    LN.schedule({ notifications: [{ id: 9150 + (Date.now() % 40), title: 'Mis finanzas', body: lvl === 100 ? `${c.name} pasó el 100 % de su presupuesto.` : `${c.name} llegó al 80 % de su presupuesto.`, channelId: 'recordatorios', smallIcon: 'ic_stat_notify', schedule: { at: new Date(Date.now() + 1000), allowWhileIdle: true } }] }).catch(() => {});
}
const finAlertHtml = () => state.finAlert ? `<div class="ns-dayw fin-alert fin-al${state.finAlert.lvl}" role="alert"><span class="grow">${esc(state.finAlert.txt)}</span><button type="button" class="icon-btn sm" data-fin="al-x" aria-label="Cerrar aviso">${ic('x', 15)}</button></div>` : '';
function finAlertCard() {
  const on = !!(fin().opt && fin().opt.notif), native = typeof LN !== 'undefined' && !!LN;
  return `<div class="card fin-al-card"><h3>Alertas</h3><div class="muted fin-hint">Al registrar un gasto te aviso cuando una categoría llega al 80 % y cuando pasa el 100 % de su presupuesto.</div>
    <div class="row fin-swr"><span class="grow"><b>También como notificación del celular</b><small class="muted">${native ? (state.notifPerm === 'granted' ? 'Sin montos: solo la categoría y el %.' : 'Activa las notificaciones de Forja para recibirlas.') : 'Funciona en la app instalada en Android.'}</small></span>
      <button type="button" class="switch ${on ? 'on' : ''}" data-fin="notif" role="switch" aria-checked="${on}" aria-label="Alertas también como notificación"><i></i></button></div></div>`;
}

/* ---------- 3. Comparar meses ---------- */
/* Los últimos n meses que tienen datos (su configuración guardada o algún gasto); el mes elegido siempre */
const finHas = ym => !!fin().m[ym] || finExOf(ym).length > 0;
const finLast = (ym, n) => { const L = []; for (let i = n - 1; i >= 0; i--) { const m = finYMadd(ym, -i); if (m === ym || finHas(m)) L.push(m); } return L; };
function finMesHtml(ym) {
  const F = fin(), L = finLast(ym, 6).map(m => ({ m, S: finSum(m) })), W = 320, H = 150, B = 22, top = 18, bw = 34, gap = (W - L.length * bw) / L.length;
  const x = i => gap / 2 + i * (bw + gap);
  /* Ahorro por mes (una serie, un tono; los negativos bajo la línea de cero) */
  const sv = L.map(o => o.S.saving), hi = Math.max(0, ...sv), lo = Math.min(0, ...sv), span = hi - lo || 1, y0 = top + (H - B - top) * hi / span, k = (H - B - top) / span;
  const sav = `<svg class="fin-cols" viewBox="0 0 ${W} ${H}" role="img" aria-label="Ahorro por mes">
    <line x1="0" x2="${W}" y1="${y0.toFixed(1)}" y2="${y0.toFixed(1)}" class="fin-base"/>
    ${L.map((o, i) => { const v = o.S.saving, h = Math.abs(v) * k, y = v >= 0 ? y0 - h : y0; return `<g><rect x="${x(i).toFixed(1)}" y="${y.toFixed(1)}" width="${bw}" height="${Math.max(h, v ? 1 : 0).toFixed(1)}" rx="4" fill="${FIN_PAL[0]}"><title>${finMesTxt(o.m)}: ahorro ${finS(v)}</title></rect>
      <text x="${(x(i) + bw / 2).toFixed(1)}" y="${(v >= 0 ? y - 4 : y + h + 11).toFixed(1)}" text-anchor="middle" class="fin-cv">${v ? (v < 0 ? '−' : '') + Math.round(Math.abs(v) / 100) : ''}</text>
      <text x="${(x(i) + bw / 2).toFixed(1)}" y="${H - 6}" text-anchor="middle" class="fin-cm ${o.m === ym ? 'on' : ''}">${FIN_MES3(o.m)}</text></g>`; }).join('')}</svg>`;
  /* Gasto por categoría (columnas apiladas, mismo color por categoría que la torta) */
  const tot = L.map(o => o.S.spent), mx = Math.max(1, ...tot), kk = (H - B - top) / mx;
  const cats = F.cats.map((c, i) => ({ id: c.id, name: i < FIN_PAL.length ? c.name : 'Otras', col: i < FIN_PAL.length ? FIN_PAL[i] : FIN_OTRAS }));
  const stack = `<svg class="fin-cols" viewBox="0 0 ${W} ${H}" role="img" aria-label="Gasto por categoría por mes">
    <line x1="0" x2="${W}" y1="${H - B}" y2="${H - B}" class="fin-base"/>
    ${L.map((o, i) => { let y = H - B; const segs = cats.map(c => { const v = (o.S.rows.find(r => r.c.id === c.id) || {}).spent || 0; if (!v) return ''; const h = v * kk; y -= h; return `<rect x="${x(i).toFixed(1)}" y="${y.toFixed(1)}" width="${bw}" height="${Math.max(1, h - 2).toFixed(1)}" rx="2" fill="${c.col}"><title>${finMesTxt(o.m)} · ${esc(c.name)}: ${finS(v)}</title></rect>`; }).join('');
      return `<g>${segs}<text x="${(x(i) + bw / 2).toFixed(1)}" y="${(y - 4).toFixed(1)}" text-anchor="middle" class="fin-cv">${o.S.spent ? Math.round(o.S.spent / 100) : ''}</text><text x="${(x(i) + bw / 2).toFixed(1)}" y="${H - 6}" text-anchor="middle" class="fin-cm ${o.m === ym ? 'on' : ''}">${FIN_MES3(o.m)}</text></g>`; }).join('')}</svg>`;
  const legend = cats.filter((c, i) => (i < FIN_PAL.length || i === FIN_PAL.length) && L.some(o => o.S.rows.some((r, j) => r.spent && (i < FIN_PAL.length ? j === i : j >= FIN_PAL.length))));
  const note = (F.notes || {})[ym] || '';
  return `<div class="fin-chart"><div class="label">Ahorro por mes, en soles${L.length < 2 ? ' · aún no hay meses anteriores con datos' : ''}</div>${sav}</div>
    <div class="fin-chart"><div class="label">Gasto por categoría, en soles</div>${stack}${legend.length ? `<ul class="fin-legend row">${legend.map(c => `<li><i style="background:${c.col}"></i>${esc(c.name)}</li>`).join('')}</ul>` : ''}</div>
    <div class="fin-tw"><table class="fin-t fin-mt"><thead><tr><th>Mes</th><th>Ingreso</th><th>Gastado</th><th>Ahorro</th></tr></thead><tbody>
      ${L.slice().reverse().map(o => `<tr class="${o.m === ym ? 'on' : ''}"><td>${FIN_MES3(o.m)} ${o.m.slice(0, 4)}${(F.notes || {})[o.m] ? ' ✎' : ''}</td><td class="num">${finN(o.S.inc)}</td><td class="num">${finN(o.S.spent)}</td><td class="num ${o.S.saving < 0 ? 'neg' : ''}">${o.S.saving < 0 ? '−' : ''}${finN(o.S.saving)}</td></tr>`).join('')}
    </tbody></table></div>
    <div class="card fin-note"><h3>Lecciones de ${finMesTxt(ym)}</h3><textarea id="fin-nota" class="note-in" rows="4" maxlength="1500" placeholder="Qué funcionó, en qué te pasaste, qué cambiar el próximo mes…">${esc(note)}</textarea>
      <button type="button" class="btn small" data-fin="nota">Guardar nota</button></div>`;
}

/* ---------- 4. Exportar para IA ---------- */
function finAiText(ym) {
  const F = fin(), S = finSum(ym), prev = finYMadd(ym, -1), P = finSum(prev), next = finYMadd(ym, 1), M = S.M;
  const ex = finExOf(ym).slice().sort((a, b) => a.d.localeCompare(b.d));
  const fundOf = e => e.fund ? (M.funds.find(f => f.id === e.fund) || { name: 'vale' }).name : '';
  const hasPrev = P.n > 0 || !!F.m[prev];
  return [`Actúa como mi asesor de finanzas personales: claro, práctico y sin juzgar. Abajo va mi mes y, al final, lo que te pido. Montos en soles (S/).`,
    `MIS FINANZAS · ${finMesTxt(ym).toUpperCase()}`,
    `INGRESOS: sueldo ${finS(S.sal)}${M.pays.length > 1 ? ' (' + M.pays.map(p => `${p.name} ${finS(p.amt)}`).join(', ') + ')' : ''}${M.funds.length ? '; fondos aparte: ' + M.funds.map(f => `${f.name} ${finS(f.amt)} (solo ${(finCat(f.cat) || { name: '?' }).name})`).join(', ') : ''}. Ingreso total ${finS(S.inc)}.`,
    'PRESUPUESTO VS REAL:\n' + S.rows.map(r => `- ${r.c.name}: presupuesto ${finS(r.bud)} · gastado ${finS(r.spent)} (${finPct(r)}) · saldo ${finS(r.saldo)}${r.st === 'r' ? ' · EXCEDIDO' : r.st === 'y' ? ' · cerca del límite' : ''}`).join('\n') +
      `\nTOTAL: presupuesto ${finS(S.bud)} · gastado ${finS(S.spent)} (con el sueldo ${finS(S.bySal)}${S.byFund ? `, con fondos ${finS(S.byFund)}` : ''}) · ahorro (sueldo − gastos con sueldo) ${finS(S.saving)}.`,
    ex.length ? `GASTOS DEL MES (${ex.length}):\n` + ex.map(e => `- ${e.d} · ${(finCat(e.cat) || { name: '?' }).name} · ${e.c || 'sin concepto'} · ${finS(e.amt)}${fundOf(e) ? ' · con ' + fundOf(e) : ''}${e.note ? ' · nota: ' + e.note.replace(/\s+/g, ' ') : ''}`).join('\n') : 'GASTOS DEL MES: ninguno registrado.',
    (F.notes || {})[ym] ? 'MI NOTA DEL MES (lecciones): ' + F.notes[ym].replace(/\s+/g, ' ').trim() : '',
    hasPrev ? `COMPARACIÓN CON ${finMesTxt(prev).toUpperCase()}:\n` + F.cats.map(c => { const a = (P.rows.find(r => r.c.id === c.id) || {}).spent || 0, b = (S.rows.find(r => r.c.id === c.id) || {}).spent || 0; return `- ${c.name}: ${finS(a)} → ${finS(b)} (${b - a >= 0 ? '+' : '−'}${finS(Math.abs(b - a))})`; }).join('\n') + `\n- Gasto total: ${finS(P.spent)} → ${finS(S.spent)} · ahorro: ${finS(P.saving)} → ${finS(S.saving)}` : `COMPARACIÓN: no tengo datos de ${finMesTxt(prev)}.`,
    `LO QUE TE PIDO:
1. Un análisis breve del mes (máximo 6 líneas).
2. Dónde me excedí: categorías sobre su presupuesto o que crecieron frente al mes anterior, y qué pudo pasar (usa los gastos detallados).
3. Un presupuesto realista para ${finMesTxt(next)}: no inventes ingresos (usa los míos) y busca que el ahorro no baje, salvo que me expliques por qué.`,
    `FORMATO OBLIGATORIO (lo lee mi app):
Al final, UN SOLO bloque de código con el presupuesto propuesto y nada más dentro:
\`\`\`
PRESUPUESTO ${next}
Categoría | Monto
${F.cats.map(c => `${c.name} | ${((+(finM(next).bud || {})[c.id] || 0) / 100).toFixed(2)}`).join('\n')}
\`\`\`
Una fila por categoría con el nombre EXACTO de esta lista: ${F.cats.map(c => c.name).join(', ')}. Si propones una categoría nueva, escribe su nombre. Monto: solo el número en soles con punto decimal, sin "S/". (Los montos del ejemplo son mi presupuesto actual.)`].filter(Boolean).join('\n\n');
}

/* ---------- 5. Importar recomendación ---------- */
/* "PRESUPUESTO 2026-11" (opcional) y filas "Categoría | Monto" (también con tabulación, ":" o 2+ espacios) */
function finRecParse(txt) {
  const out = { ym: null, rows: [] };
  const blocks = (String(txt || '').match(/```[\s\S]*?```/g) || []).filter(b => /presupuesto/i.test(b));
  if (blocks.length) txt = blocks[blocks.length - 1];   // el bloque PRESUPUESTO (no las tablas del análisis)
  String(txt || '').replace(/\r/g, '').split('\n').forEach(l => {
    const t = l.replace(/\*\*|__|`/g, '').trim(); if (!t || /^[|:\-\s]+$/.test(t)) return;
    const m = t.match(/presupuesto\s+(?:para\s+)?(\d{4})-(\d{2})/i); if (m) { out.ym = m[1] + '-' + m[2]; return; }
    const cells = (t.indexOf('|') >= 0 ? t.split('|') : t.indexOf('\t') >= 0 ? t.split('\t') : /:\s*(s\/)?\s*\d/i.test(t) ? t.split(':') : t.split(/\s{2,}/)).map(x => x.trim()).filter(Boolean);
    if (cells.length < 2) return;
    const name = cells[0].replace(/^[-•*\d.)\s]+(?=[a-záéíóúñ])/i, '').trim(), amt = finParse(cells[cells.length - 1]);
    if (/categor/i.test(name) && /monto|presupuesto/i.test(cells[cells.length - 1])) return;
    if (!name || isNaN(amt) || /^total$/i.test(name)) return;
    const i = out.rows.findIndex(r => normName(r.name) === normName(name)); if (i >= 0) out.rows[i].amt = amt; else out.rows.push({ name, amt });
  });
  return out;
}
function finRecHtml(ym) {
  const R = state.finRec || (state.finRec = { txt: '' }), next = finYMadd(ym, 1), Mn = finM(next), F = fin();
  const P = R.P, rows = P ? P.rows.map(r => { const c = F.cats.find(x => normName(x.name) === normName(r.name)); return Object.assign({}, r, { c, now: c ? +(Mn.bud || {})[c.id] || 0 : 0 }); }) : [];
  const keep = P ? F.cats.filter(c => !rows.some(r => r.c && r.c.id === c.id)) : [];
  const tot = rows.reduce((a, r) => a + r.amt, 0) + keep.reduce((a, c) => a + (+(Mn.bud || {})[c.id] || 0), 0), inc = Mn.pays.reduce((a, p) => a + (+p.amt || 0), 0);
  return `<div class="card fin-rec"><h3>Importar recomendación</h3><div class="muted fin-hint">Pega la respuesta de tu IA (o solo su bloque PRESUPUESTO). Se aplica a <b>${finMesTxt(next)}</b> y solo si lo confirmas.</div>
    <textarea id="fin-rec-t" class="note-in" rows="6" placeholder="PRESUPUESTO ${next}&#10;Categoría | Monto&#10;Alimentación | 800.00">${esc(R.txt || '')}</textarea>
    <small class="pb-err" id="fin-rec-e" role="alert" ${R.err ? '' : 'hidden'}>${esc(R.err || '')}</small>
    <div class="grid2"><button type="button" class="btn" data-fin="rec-cancel">Cancelar</button><button type="button" class="btn primary" data-fin="rec-read">Leer</button></div></div>
    ${P && rows.length ? `<div class="card fin-recp"><h3>Vista previa · ${finMesTxt(next)}</h3>
      ${P.ym && P.ym !== next ? `<div class="ns-dayw" role="status">El texto dice ${esc(P.ym)}; se aplica a ${finMesTxt(next)}, el mes siguiente.</div>` : ''}
      <div class="fin-tw"><table class="fin-t"><thead><tr><th>Categoría</th><th>Ahora</th><th>Propuesto</th><th>Cambio</th></tr></thead><tbody>
        ${rows.map(r => `<tr${r.c ? '' : ' class="fin-new"'}><td>${esc(r.c ? r.c.name : r.name)}${r.c ? '' : ' <small>(nueva)</small>'}</td><td class="num">${finN(r.now)}</td><td class="num"><b>${finN(r.amt)}</b></td><td class="num">${r.amt - r.now === 0 ? '=' : (r.amt - r.now > 0 ? '+' : '−') + finN(r.amt - r.now)}</td></tr>`).join('')}
        ${keep.map(c => `<tr class="fin-keep"><td>${esc(c.name)} <small>(sin cambio)</small></td><td class="num">${finN(+(Mn.bud || {})[c.id] || 0)}</td><td class="num">${finN(+(Mn.bud || {})[c.id] || 0)}</td><td class="num">=</td></tr>`).join('')}
      </tbody></table></div>
      <div class="muted fin-hint">Presupuesto total ${finS(tot)}${inc ? ` · sueldo de ${finMesTxt(next)} ${finS(inc)}${tot > inc ? ' · <b class="neg">supera el sueldo</b>' : ''}` : ''}. Queda también para los meses siguientes.</div>
      <button type="button" class="btn primary block" data-fin="rec-apply">Aplicar a ${finMesTxt(next)}</button></div>` : ''}`;
}

/* ---------- Toques (los llama el manejador de finanzas.js) ---------- */
function finClick2(a, b) {
  const F = fin(), ym = state.finYM || finYMnow();
  if (a === 'al-x') { state.finAlert = null; finSheet(); return true; }
  if (a === 'notif') { F.opt = Object.assign({}, F.opt, { notif: !(F.opt && F.opt.notif) }); finSave(); finSheet(); toast(F.opt.notif ? 'Las alertas también llegarán como notificación.' : 'Alertas solo dentro de la app.'); return true; }
  if (a === 'nota') { const t = $('#fin-nota'); F.notes = Object.assign({}, F.notes); const v = t ? t.value.trim() : ''; if (v) F.notes[ym] = v; else delete F.notes[ym]; finSave(); finSheet(); toast('Nota guardada.'); return true; }
  if (a === 'ai') { nsCopy(finAiText(ym)).then(ok => toast(ok ? 'Copiado: pégalo en tu IA. Al final pide el presupuesto en el formato que lee "Importar recomendación".' : 'No se pudo copiar.')); return true; }
  if (a === 'rec') { state.finRec = { txt: '' }; state.finT = 'rec'; finSheet(); setTimeout(() => { const t = $('#fin-rec-t'); if (t) t.focus(); }, 60); return true; }
  if (a === 'rec-cancel') { state.finRec = null; state.finT = 'res'; finSheet(); return true; }
  if (a === 'rec-read') {
    const txt = ($('#fin-rec-t') || {}).value || '', P = finRecParse(txt);
    state.finRec = { txt, P: P.rows.length ? P : null, err: P.rows.length ? '' : (!txt.trim() ? 'Pega primero la respuesta de tu IA.' : 'No encontré filas "Categoría | Monto". Usa "Exportar para IA": al final le pide ese formato.') };
    finSheet(); return true;
  }
  if (a === 'rec-apply' && state.finRec && state.finRec.P) {
    const next = finYMadd(ym, 1), M = finM(next);
    M.bud = Object.assign({}, M.bud);
    state.finRec.P.rows.forEach(r => { let c = F.cats.find(x => normName(x.name) === normName(r.name)); if (!c) { c = { id: finId('c'), name: r.name.slice(0, 40) }; F.cats.push(c); } M.bud[c.id] = r.amt; });
    finMSet(next, M); state.finRec = null; state.finT = 'res'; state.finYM = next; finSheet(); toast(`Presupuesto aplicado a ${finMesTxt(next)}.`);
    return true;
  }
  return false;
}
