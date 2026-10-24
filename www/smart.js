/* ==========================================================================
   Fase 2 · Entrenador inteligente (13-oct-2026)
   1. Progresión según el objetivo: fuerza con % del 1RM estimado y RIR; salud y movilidad
      suben solo tras 2 sesiones completas; perder grasa: mantener el peso ya es ganar.
   2. Cardio: registro (tipo, minutos, intensidad, km), kcal estimadas y meta OMS de 150 min.
   3. Alimentación por objetivo: "tu plato" con el método de la mano y comidas de aquí.
   4. Resumen de la semana, de la semana pasada y del mes, con qué cambiar.
   5. Reajuste: sesión de regreso tras 10+ días sin entrenar y aviso de estancamiento.
   ========================================================================== */
const goalNow = () => { const p = state.settings.prof; return p && p.goal ? p.goal : (pubUser() ? 'salud' : 'musculo'); };
const smTip = (c, t) => { if (c.tips.indexOf(t) < 0) c.tips.push(t); };

/* ---------- 1. Progresión según el objetivo ---------- */
const _coachForS = coachFor;
coachFor = function (ex, gymId, kind) {
  const c = _coachForS(ex, gymId, kind), G = goalNow();
  if (!c || !c.last || ['pain', 'back', 'down'].indexOf(c.mode) >= 0) return c;
  const H = exHistory(ex.name, gymId, kind), topW = c.last.w, inc = increment(ex, topW || 1);
  if (G === 'fuerza' && ex.repsMax <= 6 && H.length) {
    const bar = barOf(ex), e1 = Math.max.apply(null, H[0].sets.map(x => e1rm((+x.w || 0) + bar, Math.min(10, x.r || 0))));
    const rir = typeof rirTarget === 'function' ? rirTarget(0) : 2;
    let w = Math.floor((e1 / (1 + (ex.repsMin + rir) / 30) - bar) / inc) * inc;
    w = Math.max(topW - inc, Math.min(topW + 2 * inc, w));
    const pct = Math.round((w + bar) / e1 * 100);
    if (w > topW) { c.w = w; c.mode = 'up'; c.goal = Array(ex.sets).fill(ex.repsMin); c.head = `<b>Sube a ${fmtKg(w)} kg</b> y busca ${ex.repsMin}-${ex.repsMax} reps (≈${pct} % de tu 1RM).`; }
    smTip(c, `Fuerza: tu 1RM estimado es <b>${fmtKg(Math.round(e1))} kg</b>${bar ? ' con la barra' : ''}. Deja ${rir} reps de sobra en la primera serie (RPE ${10 - rir}) y descansa 3 min entre series.`);
  } else if (G === 'grasa') {
    if (c.mode === 'hold') smTip(c, 'Estás en déficit: mantener tus pesos ya es un logro y protege tu músculo. Sube solo cuando completes todas las reps con buena técnica.');
    c.tips = c.tips.map(t => /3 sesiones sin progresar/.test(t) ? 'En déficit es normal estancarse. Si 3 sesiones seguidas bajas reps, quita una serie aquí y revisa sueño y proteína.' : t);
  } else if ((G === 'salud' || G === 'mayor') && c.mode === 'up' && H.length) {
    const full = h => { const w0 = Math.max.apply(null, h.sets.map(x => x.w)), top = h.sets.filter(x => x.w === w0); return w0 >= topW && top.length >= ex.sets && top.every(x => x.r >= ex.repsMax); };
    if (!(H[1] && full(H[1]))) { c.w = topW; c.mode = 'hold'; c.goal = Array(ex.sets).fill(ex.repsMax); c.head = `<b>Mantén ${fmtKg(topW)} kg</b> una sesión más. Si vuelves a completar ${ex.repsMax} reps en todas las series, subes.`; smTip(c, 'Para tu objetivo subimos con calma: primero dominas el peso dos veces seguidas.'); }
    else if (G === 'mayor') { const w = topW + Math.min(inc, 2.5); c.w = w; c.head = `<b>Sube a ${fmtKg(w)} kg</b> y busca ${ex.repsMin}+ reps, despacio y con control.`; }
  }
  return c;
};

/* ---------- 2. Cardio ---------- */
const CARDIO = [
  ['walk', 'Caminar', 'footprints', 3.5, 5], ['run', 'Correr', 'zap', 8, 11], ['bike', 'Bicicleta', 'activity', 6, 9],
  ['ellip', 'Elíptica', 'activity', 5, 7.5], ['stairs', 'Escaladora', 'trending-up', 6, 9], ['swim', 'Natación', 'droplet', 6, 9.5],
  ['class', 'Clase o baile', 'heart-pulse', 5, 7.5], ['other', 'Otro', 'flame', 4, 7],
];
const CZ = { s: ['Suave', 'Puedes cantar', 0], m: ['Moderada', 'Hablas, pero no cantas', 1], v: ['Fuerte', 'Solo unas palabras', 2] };
const cdOf = t => ((t && t.cardio) || []).filter(x => !x.del);
const cdKcal = (k, z, min) => { const c = CARDIO.find(x => x[0] === k) || CARDIO[7]; const met = z === 'v' ? c[4] : z === 's' ? c[3] * 0.75 : c[3]; return Math.round(met * (typeof curWeight === 'function' ? curWeight() : HISTORY.kg) * min / 60); };
function cdWeek(offset) {
  const ws = weekStartOf(new Date()); ws.setDate(ws.getDate() - 7 * (offset || 0));
  let act = 0, min = 0, kcal = 0, n = 0;
  for (let i = 0; i < 7; i++) { const d = new Date(ws); d.setDate(d.getDate() + i); cdOf(state.daily[dk(d)]).forEach(x => { n++; min += x.min; kcal += x.kcal || 0; act += x.min * CZ[x.z || 'm'][2]; }); }
  return { act, min, kcal, n, ws };
}
function cdCard() {
  const w = cdWeek(0), pct = Math.min(100, Math.round(w.act / 150 * 100)), t = cdOf(today()), G = goalNow();
  const rec = G === 'grasa' ? 'Para perder grasa: 2-3 sesiones de 20-40 min por semana y tu meta de pasos diarios.' : G === 'mayor' ? 'Caminar a paso ligero casi todos los días es de lo mejor para tu objetivo.' : 'La OMS recomienda 150-300 min por semana de actividad moderada (o la mitad si es fuerte).';
  return `<div class="card cd-card"><div class="row"><span class="pb-ic">${ic('heart-pulse', 18)}</span><h3 class="grow">Cardio y actividad</h3><button type="button" class="btn small primary" data-sm="cd-new">${ic('plus', 15)} Cardio</button></div>
    <div class="cd-bar"><i style="width:${pct}%"></i></div>
    <div class="row cd-meta"><b class="num">${w.act}</b><span class="muted">de 150 min activos esta semana${w.kcal ? ` · ~${fmtN(w.kcal)} kcal` : ''}</span></div>
    ${t.length ? `<div class="cd-today">${t.map(x => { const c = CARDIO.find(y => y[0] === x.t) || CARDIO[7]; return `<span class="chip">${ic(c[2], 13)} ${c[1]} · ${x.min} min${x.km ? ' · ' + fmtKg(x.km) + ' km' : ''}</span>`; }).join('')}</div>` : ''}
    <div class="muted" style="font-size:12.5px">${rec}</div></div>`;
}
const cd = { t: 'walk', min: 30, z: 'm', km: '' };
function cdSheet() {
  const t = today(), list = cdOf(t);
  openSheet(`<div class="row"><h2 class="grow">Registrar cardio</h2><button class="icon-btn" data-act="sheet-close" aria-label="Cerrar">${ic('x', 18)}</button></div>
    <div class="cd-types">${CARDIO.map(c => `<button type="button" class="cd-t ${cd.t === c[0] ? 'on' : ''}" data-sm="cd-t" data-v="${c[0]}">${ic(c[2], 18)}<span>${c[1]}</span></button>`).join('')}</div>
    <div class="label">Minutos</div>
    <div class="pb-pills">${[10, 20, 30, 45, 60].map(n => `<button type="button" class="pb-pill ${cd.min === n ? 'on' : ''}" data-sm="cd-min" data-v="${n}">${n}</button>`).join('')}<input id="cd-min" class="cd-in" inputmode="numeric" maxlength="3" placeholder="otro" value="${[10, 20, 30, 45, 60].indexOf(cd.min) < 0 ? cd.min : ''}" aria-label="Otros minutos"></div>
    <div class="label">Intensidad</div>
    <div class="seg seg3">${Object.keys(CZ).map(k => `<button type="button" class="${cd.z === k ? 'on' : ''}" data-sm="cd-z" data-v="${k}">${CZ[k][0]}</button>`).join('')}</div>
    <div class="muted" style="font-size:12px">${CZ[cd.z][1]}.${cd.z === 's' ? ' Suma salud y pasos, pero no cuenta para los 150 min.' : cd.z === 'v' ? ' Cada minuto cuenta doble para la meta.' : ''}</div>
    <label class="field"><span class="label">Distancia (opcional)</span><input id="cd-km" inputmode="decimal" maxlength="5" placeholder="km" value="${esc(cd.km)}"></label>
    <div class="muted" id="cd-kcal" style="font-size:12.5px">≈ ${cdKcal(cd.t, cd.z, cd.min)} kcal según tu peso.</div>
    <button type="button" class="btn primary block" data-sm="cd-save">Guardar</button>
    ${list.length ? `<div class="label" style="margin-top:6px">Hoy</div>${list.map(x => { const c = CARDIO.find(y => y[0] === x.t) || CARDIO[7]; return `<div class="row cd-row"><span class="grow">${ic(c[2], 15)} ${c[1]} · ${x.min} min · ${CZ[x.z || 'm'][0].toLowerCase()}${x.km ? ' · ' + fmtKg(x.km) + ' km' : ''}</span><button type="button" class="icon-btn" data-sm="cd-del" data-at="${x.at}" aria-label="Borrar">${ic('trash-2', 15)}</button></div>`; }).join('')}` : ''}`);
}
function cdSave() {
  const m = +String(($('#cd-min') || {}).value || '').replace(/\D/g, '') || cd.min, km = parseFloat(String(($('#cd-km') || {}).value || '').replace(',', '.')) || 0;
  if (!(m > 0 && m <= 600)) { toast('Escribe los minutos.'); return; }
  const t = today(); t.cardio = (t.cardio || []).concat([{ at: Date.now(), t: cd.t, min: m, z: cd.z, km: km > 0 && km < 300 ? km : 0, kcal: cdKcal(cd.t, cd.z, m) }]);
  if (cd.t === 'walk' && cdOf(t).filter(x => x.t === 'walk').reduce((a, x) => a + x.min, 0) >= 30 && habList().some(h => h.k === 'hwalk')) t.hwalk = true;
  t.edited = Date.now(); saveDaily(); cd.km = ''; closeSheet(); render(); toast(`Cardio guardado: ${m} min.`);
}
document.addEventListener('click', ev => {
  const b = ev.target.closest && ev.target.closest('[data-sm]'); if (!b) return;
  ev.preventDefault(); ev.stopPropagation();
  const a = b.dataset.sm;
  const keepMin = () => { const v = +String(($('#cd-min') || {}).value || '').replace(/\D/g, ''); if (v) cd.min = v; const k = $('#cd-km'); if (k) cd.km = k.value; };
  if (a === 'cd-new') return cdSheet();
  if (a === 'cd-t') { keepMin(); cd.t = b.dataset.v; return cdSheet(); }
  if (a === 'cd-min') { cd.min = +b.dataset.v; const k = $('#cd-km'); if (k) cd.km = k.value; return cdSheet(); }
  if (a === 'cd-z') { keepMin(); cd.z = b.dataset.v; return cdSheet(); }
  if (a === 'cd-save') return cdSave();
  if (a === 'cd-del') { const t = today(); (t.cardio || []).forEach(x => { if (String(x.at) === b.dataset.at) x.del = 1; }); t.edited = Date.now(); saveDaily(); cdSheet(); render(); return; }
  if (a === 'wk') { sm.wk = b.dataset.v; return render(); }
  if (a === 'wk-ok') { state.settings.wkSeen = wkKey(new Date()); savePlans(); return render(); }
  if (a === 'ret') { state.settings.retDay = dk(new Date()); savePlans(); toast('Hoy: una serie menos y 10 % menos de peso.'); return render(); }
  if (a === 'ret-no') { state.settings.retSkip = dk(new Date()); savePlans(); return render(); }
  if (a === 'stall-meso') { if (typeof mesoSheet === 'function') mesoSheet(); return; }
  if (a === 'stall-no') { state.settings.stallSeen = wkKey(new Date()); savePlans(); return render(); }
}, true);
document.addEventListener('input', ev => { if (ev.target.id !== 'cd-min') return; const v = +ev.target.value.replace(/\D/g, ''); const k = $('#cd-kcal'); if (k && v) k.textContent = `≈ ${cdKcal(cd.t, cd.z, v)} kcal según tu peso.`; });

/* ---------- 3. Tu plato (método de la mano) ---------- */
[['trucha', 'Trucha', '1 filete ~120 g', 26], ['quinua', 'Quinua', '1 taza cocida', 8], ['pavita', 'Pavita o pechuga', '3 tajadas', 12]].forEach(f => { if (!PROT_FOODS.some(x => x[0] === f[0])) PROT_FOODS.push(f); });
function plateCard() {
  const G = goalNow(), f = body().sex === 'f', n = f ? 1 : 2;
  const carbs = G === 'grasa' ? (f ? '½ a 1' : '1') : G === 'musculo' ? (f ? '1 a 2' : '2 a 3') : String(n);
  const it = (icn, cls, qty, unit, ex) => `<div class="pl-i ${cls}"><span class="pl-q">${qty}</span><span class="grow"><b>${unit}</b><small>${ex}</small></span></div>`;
  return `<div class="card bd-card plate-card"><div class="row"><span class="pb-ic">${ic('target', 18)}</span><h3 class="grow">Tu plato en cada comida</h3></div>
    <div class="muted bd-tip">Sin balanza: usa tu mano. Para ${esc(PB_GOALS[G] ? PB_GOALS[G][0].toLowerCase() : 'tu objetivo')}, en 3-4 comidas al día:</div>
    <div class="pl-list">${it('beef', 'p', n, n > 1 ? 'palmas de proteína' : 'palma de proteína', 'Pollo, pescado o trucha, huevos, carne, menestras, queso')}
    ${it('sun', 'v', n, n > 1 ? 'puños de verduras' : 'puño de verduras', 'Ensalada, brócoli, zanahoria, vainita, tomate')}
    ${it('zap', 'c', carbs, 'manos ahuecadas de carbohidratos', 'Arroz, papa, camote, quinua, fideos, choclo, pan, fruta')}
    ${it('droplet', 'f', n, n > 1 ? 'pulgares de grasas' : 'pulgar de grasas', 'Palta, aceite de oliva, maní, aceitunas')}</div>
    <div class="muted bd-tip">${G === 'grasa' ? 'Si en 2 semanas tu promedio de peso no baja, quita media porción de carbohidratos en la cena.' : G === 'musculo' ? 'Si en 2-3 semanas tu promedio de peso no sube, agrega una porción de carbohidratos en el desayuno o después de entrenar.' : 'Ajusta según tu hambre y tu energía; lo importante es la constancia.'} Toma agua en cada comida.</div></div>`;
}
const _nutriCardS = nutriCard;
nutriCard = function () { const p = state.settings.prof; return _nutriCardS() + (p && p.minor ? '' : plateCard()); };

/* ---------- 4. Resumen de la semana y del mes ---------- */
const sm = { wk: '0' };
function weekReport(offset) {
  const ws = weekStartOf(new Date()); ws.setDate(ws.getDate() - 7 * offset);
  const we = new Date(ws); we.setDate(we.getDate() + 7);
  const now = new Date(), end = we > now ? now : we, ndays = Math.max(1, Math.min(7, Math.ceil((end - ws) / 864e5)));
  const ss = state.sessions.filter(s => !s.approx && new Date(s.date) >= ws && new Date(s.date) < we);
  const plan = activePlan(), target = plan ? plan.days.length : 3;
  const before = state.sessions.filter(s => !s.approx && new Date(s.date) < ws), best = {};
  before.forEach(s => s.exercises.forEach(e => e.sets.forEach(x => { const v = e1rm(+x.w || 0, x.r || 0); if (!best[e.name] || v > best[e.name]) best[e.name] = v; })));
  const prs = {}; ss.forEach(s => s.exercises.forEach(e => e.sets.forEach(x => { const v = e1rm(+x.w || 0, x.r || 0); if (best[e.name] && v > best[e.name] * 1.001) prs[e.name] = 1; })));
  const sets = ss.reduce((a, s) => a + s.exercises.reduce((b, e) => b + e.sets.length, 0), 0);
  const days = []; for (let i = 0; i < ndays; i++) { const d = new Date(ws); d.setDate(d.getDate() + i); days.push(state.daily[dk(d)] || {}); }
  const steps = days.map(t => typeof stepsOf === 'function' ? stepsOf(t) : 0).filter(Boolean), sleep = days.map(t => t.sleepMin).filter(Boolean);
  const habs = habList().filter(h => !h.hidden), hdone = days.reduce((a, t) => a + habs.filter(h => t[h.k]).length, 0);
  const hskip = days.reduce((a, t) => a + habs.filter(h => !t[h.k] && t.skip && t.skip[h.k]).length, 0);   // "Omitir hoy": aparte, no baja el porcentaje
  const pg = typeof protGoal === 'function' ? protGoal() : 0, pdays = pg ? days.filter(t => protOf(t) >= pg * 0.9).length : 0;
  let mm = null; try { mm = typeof weekSets === 'function' ? weekSets(offset).sets : null; } catch (e) {}
  const low = mm ? ZONES.filter(z => z.k[0] !== '~' && mm[z.k] > 0 && mm[z.k] < 10).map(z => z.name) : [];
  const wa = typeof weekAvgs === 'function' ? weekAvgs() : [], wk = dk(ws), i = wa.findIndex(x => x.d === wk);
  const wchg = i > 0 ? wa[i].v - wa[i - 1].v : null, wpct = wchg != null ? wchg / wa[i - 1].v * 100 : null;
  return { ws, ndays, n: ss.length, target, sets, prs: Object.keys(prs), cd: cdWeek(offset), steps: steps.length ? Math.round(steps.reduce((a, b) => a + b, 0) / steps.length) : 0, sleep: sleep.length ? Math.round(sleep.reduce((a, b) => a + b, 0) / sleep.length) : 0, hab: habs.length && habs.length * ndays > hskip ? Math.round(hdone / (habs.length * ndays - hskip) * 100) : 0, hskip, pdays, low, wchg, wpct };
}
function reportTips(r, done) {
  const G = goalNow(), out = [];
  if (done && r.n < r.target) out.push(`Te faltaron ${r.target - r.n} ${r.target - r.n === 1 ? 'sesión' : 'sesiones'}. Elige días y horas fijos y activa el recordatorio "Hoy toca entrenar".`);
  if (r.wpct != null) {
    if (G === 'grasa' && r.wpct > -0.2) out.push('Tu peso no bajó esta semana: revisa porciones de carbohidratos y suma una sesión de cardio o más pasos.');
    else if (G === 'grasa' && r.wpct < -1.2) out.push('Bajas muy rápido (más de 1 % por semana): come un poco más para no perder músculo.');
    else if (G === 'musculo' && r.wpct < 0) out.push('Para ganar músculo tu peso debería subir un poco (0,1-0,5 % por semana). Agrega una porción de carbohidratos.');
    else if (G === 'musculo' && r.wpct > 0.8) out.push('Subes rápido de peso: parte puede ser grasa. Quita media porción de carbohidratos.');
  }
  if (r.low.length && (G === 'musculo' || G === 'fuerza')) out.push(`Pocas series en ${r.low.slice(0, 3).join(', ').toLowerCase()} (menos de 10): suma 2-3 series de esos músculos.`);
  if (done && r.cd.act < 150 && (G === 'grasa' || G === 'salud' || G === 'mayor')) out.push(`Te faltaron ${150 - r.cd.act} min de actividad moderada: una caminata de 30 min a paso ligero suma rápido.`);
  if (r.sleep && r.sleep < 420) out.push('Dormiste menos de 7 h en promedio: el músculo se recupera durmiendo. Adelanta tu hora de dormir 30 min.');
  if (r.pdays < Math.min(4, r.ndays) && done && !(state.settings.prof && state.settings.prof.minor)) out.push('Llegaste a tu meta de proteína pocos días: agrega una palma de proteína en el desayuno.');
  if (!out.length) out.push(r.n ? '¡Buena semana! Repite lo que funcionó y busca mejorar un poco en tus ejercicios principales.' : 'Empieza con tu primera sesión: lo más difícil es arrancar.');
  return out.slice(0, 3);
}
function reportHTML(r, label, done) {
  const st = (v, l, ok) => `<div class="wk-s ${ok ? 'ok' : ''}"><b class="num">${v}</b><small>${l}</small></div>`;
  return `<div class="wk-grid">${st(r.n + '/' + r.target, 'sesiones', r.n >= r.target)}${st(r.sets, 'series', r.sets > 0)}${st(r.prs.length, 'récords', r.prs.length > 0)}${st(r.cd.act, 'min cardio', r.cd.act >= 150)}
    ${r.steps ? st(fmtN(r.steps), 'pasos/día', typeof stepGoal === 'function' && r.steps >= stepGoal()) : ''}${r.sleep ? st(fmtHM(r.sleep).replace(' min', ''), 'sueño', r.sleep >= 420) : ''}${st(r.hab + '%', r.hskip ? `hábitos · ${r.hskip} ${r.hskip === 1 ? 'omitido' : 'omitidos'}` : 'hábitos', r.hab >= 80)}${r.wchg != null ? st((r.wchg > 0 ? '+' : '') + fmtKg(Math.round(r.wchg * 10) / 10) + ' kg', 'peso (promedio)', null) : ''}</div>
    ${r.prs.length ? `<div class="muted" style="font-size:12.5px">🏆 Récords: ${r.prs.slice(0, 4).map(esc).join(', ')}</div>` : ''}
    <div class="label">${done ? 'Para la próxima semana' : 'Para lo que queda de la semana'}</div><ul class="wk-tips">${reportTips(r, done).map(t => `<li>${t}</li>`).join('')}</ul>`;
}
function monthHTML() {
  const rs = [0, 1, 2, 3].map(weekReport), n = rs.reduce((a, r) => a + r.n, 0), tgt = rs.reduce((a, r) => a + r.target, 0);
  const prs = {}; rs.forEach(r => r.prs.forEach(p => prs[p] = 1));
  const wa = typeof weekAvgs === 'function' ? weekAvgs() : [], w4 = wa.length >= 2 ? wa[wa.length - 1].v - wa[Math.max(0, wa.length - 5)].v : null;
  const cdAvg = Math.round(rs.reduce((a, r) => a + r.cd.act, 0) / 4);
  const st = (v, l, ok) => `<div class="wk-s ${ok ? 'ok' : ''}"><b class="num">${v}</b><small>${l}</small></div>`;
  return `<div class="wk-grid">${st(n + '/' + tgt, 'sesiones en 4 semanas', n >= tgt * 0.8)}${st(Math.round(n / tgt * 100 || 0) + '%', 'constancia', n >= tgt * 0.8)}${st(Object.keys(prs).length, 'ejercicios con récord', Object.keys(prs).length > 0)}${st(cdAvg, 'min cardio/semana', cdAvg >= 150)}${w4 != null ? st((w4 > 0 ? '+' : '') + fmtKg(Math.round(w4 * 10) / 10) + ' kg', 'peso en el mes', null) : ''}</div>
    <div class="wk-bars">${rs.slice().reverse().map((r, i) => `<div><i style="height:${Math.min(100, Math.round(r.n / Math.max(1, r.target) * 100))}%" class="${r.n >= r.target ? 'ok' : ''}"></i><small>${i === 3 ? 'Esta' : 'S' + (i + 1)}</small></div>`).join('')}</div>
    <div class="muted" style="font-size:12.5px">${n >= tgt * 0.8 ? 'Vas muy constante: es lo que más resultados da.' : 'La constancia es lo que más resultados da: apunta a no fallar dos semanas seguidas.'}</div>`;
}
function weekCard() {
  const v = sm.wk, r = v === 'm' ? null : weekReport(+v);
  return `<div class="card wk-card"><div class="row"><span class="pb-ic">${ic('calendar-days', 18)}</span><h3 class="grow">Tu resumen</h3></div>
    <div class="seg seg3">${[['0', 'Esta semana'], ['1', 'La pasada'], ['m', 'Este mes']].map(([k, l]) => `<button type="button" class="${v === k ? 'on' : ''}" data-sm="wk" data-v="${k}">${l}</button>`).join('')}</div>
    ${r ? reportHTML(r, '', v === '1') : monthHTML()}</div>`;
}
/* Lunes (o primera vez en la semana): resumen de la semana pasada en Entrenar */
function recapCard() {
  if (state.settings.wkSeen === wkKey(new Date()) || !state.sessions.length) return '';
  const r = weekReport(1); if (!r.n && !r.cd.n) return '';
  return `<div class="card wk-card recap"><div class="row"><span class="pb-ic">${ic('calendar-check', 18)}</span><h3 class="grow">Tu semana pasada</h3><button type="button" class="icon-btn" data-sm="wk-ok" aria-label="Cerrar">${ic('x', 16)}</button></div>${reportHTML(r, '', true)}</div>`;
}

/* ---------- 5. Reajuste: regreso tras una pausa y estancamiento ---------- */
function gapDays() { const s = state.sessions.find(x => !x.approx); return s ? Math.floor((Date.now() - new Date(s.date)) / 864e5) : 0; }
function returnCard() {
  const g = gapDays(), td = dk(new Date());
  if (g < 10 || state.settings.retSkip === td) return '';
  if (state.settings.retDay === td) return `<div class="card ret-card on"><div class="row"><span class="pb-ic">${ic('rotate-ccw', 18)}</span><b class="grow">Sesión de regreso activada</b></div><div class="muted" style="font-size:13px">Hoy harás una serie menos por ejercicio y 10 % menos de peso. En 1-2 semanas vuelves a tu nivel.</div></div>`;
  return `<div class="card ret-card"><div class="row"><span class="pb-ic">${ic('rotate-ccw', 18)}</span><b class="grow">Hace ${g} días que no entrenas</b></div>
    <div class="muted" style="font-size:13px">Volver suave evita lesiones y agujetas fuertes. Te proponemos una sesión de regreso: una serie menos y 10 % menos de peso.</div>
    <div class="row" style="gap:8px"><button type="button" class="btn small primary" data-sm="ret">Hacer sesión de regreso</button><button type="button" class="btn small" data-sm="ret-no">Entrenar normal</button></div></div>`;
}
const _startSessionS = startSession;
startSession = function (planId, dayId) {
  _startSessionS(planId, dayId);
  const d = state.draft; if (!d || state.settings.retDay !== dk(new Date()) || d.ret || d.planId === 'quick') return;
  d.ret = 1;
  d.exercises.forEach(e => {
    if (e.log && e.log.length > 2 && !e.log.some(x => x.done)) e.log.length = e.log.length - 1;
    if (!(e.coach && e.coach.mode === 'back')) (e.log || []).forEach(x => { if (!x.done && +x.w > 0) { const inc = increment(e, x.w); x.w = Math.max(0, Math.round(x.w * 0.9 / inc) * inc); } });
  });
  if (typeof saveDraft === 'function') saveDraft();
  if (typeof render === 'function') render();
};
const stallCache = { k: '', list: [] };
function stalled() {
  const plan = activePlan(); if (!plan) return [];
  const k = state.sessions.length + ':' + plan.id + ':' + (state.sessions[0] ? state.sessions[0].date : '');
  if (stallCache.k === k) return stallCache.list;
  const out = [], seen = {};
  plan.days.forEach(d => d.exercises.forEach(ex => {
    if (seen[ex.name]) return; seen[ex.name] = 1;
    const H = exHistory(ex.name, plan.gymId || 'rokaz', d.kind || kindOfName(d.name));
    if (H.length >= 4) { const recent = Math.max.apply(null, H.slice(0, 3).map(bestE)), before = bestE(H[3]); if (recent <= before * 1.005) out.push(ex.name); }
  }));
  stallCache.k = k; stallCache.list = out; return out;
}
function stallCard() {
  if (state.settings.stallSeen === wkKey(new Date())) return '';
  const s = stalled(); if (s.length < 2) return '';
  const G = goalNow();
  return `<div class="card stall-card"><div class="row"><span class="pb-ic">${ic('gauge', 18)}</span><b class="grow">Te estancaste en ${s.length} ejercicios</b><button type="button" class="icon-btn" data-sm="stall-no" aria-label="Cerrar">${ic('x', 16)}</button></div>
    <div class="muted" style="font-size:13px">${s.slice(0, 4).map(esc).join(', ')}: 3 sesiones sin mejorar. ${G === 'grasa' ? 'En déficit es normal; prioriza mantener.' : 'Suele ser cansancio acumulado.'} Opciones:</div>
    <ul class="wk-tips"><li><b>Semana de descarga</b>: mismos ejercicios, menos series y sin ir al límite. Después sueles superar tus marcas.</li><li><b>Cambiar a una variante</b> del ejercicio (por ejemplo mancuernas en lugar de barra) con el botón del ejercicio en tu sesión.</li><li>Revisa sueño (7-8 h) y proteína.</li></ul>
    <button type="button" class="btn small" data-sm="stall-meso">${ic('layers', 15)} Ver mi bloque y la descarga</button></div>`;
}

/* ---------- Colocar las tarjetas ---------- */
const _renderS = render;
render = function () {
  _renderS();
  const app = $('#app'); if (!app || isWatch()) return;
  if (state.tab === 'train' && !state.draft && !app.querySelector('.cd-card')) {
    const hero = app.querySelector(':scope > .hero');
    const top = returnCard() + stallCard() + recapCard();
    if (hero) { hero.insertAdjacentHTML('afterend', cdCard()); if (top) hero.insertAdjacentHTML('afterend', top); }
  }
  if (state.tab === 'profile' && state.profSub === 'hoy' && !app.querySelector('.wk-card')) {
    const ds = app.querySelector('.day-strip'); if (ds) ds.insertAdjacentHTML('afterend', weekCard());
  }
};
bootRender();
