/* ==========================================================================
   Coach semanal (tanda 3, 15-oct-2026)
   1. Reporte del viernes: series por músculo de la semana (meta 10-20), contando lo que aún
      te toca de tu rutina; músculos con exceso y los que faltan, con tu objetivo arriba.
      Se comparte o se copia como texto.
   2. "Crear entreno para completar": arma una sesión para el sábado o el domingo con los
      músculos que faltan (series, peso, fuerza o bombeo). No toca tus rutinas.
   3. Domingo: resumen de la semana y propuesta para la siguiente (peso y series por ejercicio)
      con el coach, el volumen de tu rutina por músculo y la semana del mesociclo (descarga).
      Las rutinas solo cambian con "Aplicar" (y se puede deshacer).
   4. Días del reporte y del resumen en Ajustes (`settings.wcoach`).
   ========================================================================== */
const WC_MIN = 10, WC_MAX = 20;
const WC_FDAYS = [3, 4, 5, 6], WC_SDAYS = [5, 6, 0, 1];   // días de la semana de JS (0 = domingo)
const wcCfg = () => Object.assign({ on: true, fri: 5, sun: 0 }, state.settings.wcoach || {});
const wcIdx = wd => (wd + 6) % 7;   // lunes = 0 … domingo = 6
const wcToday = () => wcIdx(new Date().getDay());
const wcU = () => (state.settings.unit === 'lb' ? 'lb' : 'kg');
const wcPlain = h => String(h || '').replace(/<[^>]+>/g, '');
const wcGoal = () => (typeof ddGoal === 'function' && ddGoal()) || '';
const wcSeen = () => state.settings.wcSeen || {};
const wcMark = (k, v) => { state.settings.wcSeen = Object.assign({}, wcSeen()); state.settings.wcSeen[k] = v; savePlans(); };
const wcMain = name => { const sh = zoneShares(name); for (const k in sh) if (sh[k] === 1) return k; return null; };
const wcDl = at => { const I = typeof mesoInfo === 'function' ? mesoInfo(at) : null; return I && !I.pre ? I : null; };
const wc = { kind: null, day: null, seed: 0 };

/* ---------- 1. Volumen de la semana: lo hecho + lo que aún te toca ---------- */
function wcPending() {
  const plan = activePlan(); if (!plan) return [];
  const ws = weekStartOf(new Date()), ti = wcToday(), tk = dk(new Date());
  const week = state.sessions.filter(s => !s.approx && new Date(s.date) >= ws), done = {};
  week.forEach(s => { done[s.dayId] = 1; });
  const trainedToday = week.some(s => dk(s.date) === tk);
  const left = Math.max(0, plan.days.length - week.length);
  return plan.days.filter(d => !done[d.id] && (wcIdx(d.weekday) > ti || (wcIdx(d.weekday) === ti && !trainedToday)))
    .sort((a, b) => wcIdx(a.weekday) - wcIdx(b.weekday)).slice(0, left);
}
function wcVolume() {
  const done = weekSets(0).sets, plan = {}, pend = wcPending(), I = wcDl(), dl = !!(I && I.deload);
  ZONES.forEach(z => { plan[z.k] = 0; });
  pend.forEach(d => d.exercises.forEach(e => { const sh = zoneShares(e.name), n = dl ? Math.ceil((+e.sets || 0) / 2) : +e.sets || 0; for (const k in sh) plan[k] += sh[k] * n; }));
  const rows = MM_MAIN.map(k => { const t = done[k] + plan[k]; return { k, d: done[k], p: plan[k], t, st: t < WC_MIN ? 'low' : t > WC_MAX ? 'high' : 'ok' }; });
  return { rows, pend, dl, I };
}
const wcR = v => fmtKg(Math.round(v * 2) / 2);

/* ---------- Reporte del viernes ---------- */
function wcReportHtml() {
  const V = wcVolume(), ws = weekStartOf(new Date()), plan = activePlan(), g = wcGoal(), sore = soreMap();
  const n = state.sessions.filter(s => !s.approx && new Date(s.date) >= ws).length, tgt = plan ? plan.days.length : 3, left = 6 - wcToday();
  const low = V.rows.filter(r => r.st === 'low').sort((a, b) => a.t - b.t), high = V.rows.filter(r => r.st === 'high').sort((a, b) => b.t - a.t), ok = V.rows.filter(r => r.st === 'ok');
  const bar = r => `<div class="wc-row ${r.st}"><span class="wc-n">${zoneName(r.k)}</span><span class="wc-tr"><i class="wc-zone"></i><i class="wc-d" style="width:${Math.min(100, r.d / 24 * 100)}%"></i>${r.p ? `<i class="wc-p" style="left:${Math.min(100, r.d / 24 * 100)}%;width:${Math.min(100 - Math.min(100, r.d / 24 * 100), r.p / 24 * 100)}%"></i>` : ''}</span><b class="num wc-v">${wcR(r.t)}</b></div>`;
  const tips = [];
  if (high.length) tips.push(`Más de ${WC_MAX} series por semana suele sumar cansancio más que músculo. En la propuesta del domingo quito series de ${high.map(r => zoneName(r.k).toLowerCase()).join(', ')}.`);
  low.filter(r => sore[r.k] && sore[r.k].lvl >= 2).forEach(r => tips.push(`${zoneName(r.k)} aún te duele fuerte: no lo completes esta semana.`));
  if (V.dl) tips.push('Es tu semana de descarga: quedar por debajo de 10 series es lo normal, no hace falta completar.');
  return `<div class="row"><h2 class="grow">Reporte de la semana</h2><button class="icon-btn" data-act="sheet-close" aria-label="Cerrar">${ic('x', 18)}</button></div>
    ${g ? `<div class="wc-goal">${ic('target', 16)}<span><b>Tu objetivo:</b> ${esc(g)}</span></div>` : ''}
    <div class="muted wc-sub">Semana del lunes ${fmtDate(ws)} · ${n}/${tgt} sesiones${left > 0 ? ` · ${left === 1 ? 'queda 1 día' : 'quedan ' + left + ' días'}` : ' · último día'}. Meta: <b>${WC_MIN} a ${WC_MAX} series</b> por músculo.</div>
    ${V.pend.length ? `<div class="muted wc-sub">Incluye lo que aún te toca (rayado en las barras): ${V.pend.map(d => `${WD[d.weekday]} · ${esc(d.name)}`).join(', ')}.</div>` : ''}
    <div class="fs-sec">${ic('arrow-up', 15)} Faltan</div>
    ${low.length ? `<div class="wc-list">${low.map(r => `<div class="wc-chip low"><b>${zoneName(r.k)}</b><span class="num">${wcR(r.t)}/${WC_MIN} · faltan ${Math.ceil(WC_MIN - r.t)}</span></div>`).join('')}</div>` : '<div class="muted wc-sub">Ningún músculo por debajo de 10. ¡Bien!</div>'}
    <div class="fs-sec">${ic('arrow-down', 15)} Exceso</div>
    ${high.length ? `<div class="wc-list">${high.map(r => `<div class="wc-chip high"><b>${zoneName(r.k)}</b><span class="num">${wcR(r.t)} · ${Math.floor(r.t - WC_MAX)} de más</span></div>`).join('')}</div>` : `<div class="muted wc-sub">Ningún músculo pasa de ${WC_MAX}.</div>`}
    ${ok.length ? `<div class="muted wc-sub">En la meta: ${ok.map(r => `${zoneName(r.k)} ${wcR(r.t)}`).join(', ')}.</div>` : ''}
    <div class="wc-bars">${V.rows.slice().sort((a, b) => b.t - a.t).map(bar).join('')}</div>
    <div class="muted wc-foot">Músculo principal = 1 serie; los que ayudan = ½. Franja verde: de 10 a 20.</div>
    ${tips.length ? `<ul class="wk-tips">${tips.map(t => `<li>${t}</li>`).join('')}</ul>` : ''}
    ${low.length ? `<button type="button" class="btn ${V.dl ? '' : 'primary'} block" data-wc="fill">${ic('dumbbell', 16)} Crear entreno para completar</button>` : ''}
    <div class="dd-acts"><button type="button" class="btn small" data-wc="share-f">${ic('share-2', 15)} Compartir</button><button type="button" class="btn small" data-wc="copy-f">${ic('copy', 15)} Copiar</button></div>`;
}
function wcReportText() {
  const V = wcVolume(), ws = weekStartOf(new Date()), we = new Date(ws); we.setDate(we.getDate() + 6);
  const g = wcGoal(), list = st => V.rows.filter(r => r.st === st);
  const lines = [`Reporte de la semana (${fmtDate(ws)} – ${fmtDate(we)}) · Forja`];
  if (g) lines.push(`Objetivo: ${g}`);
  lines.push(`Meta: ${WC_MIN}-${WC_MAX} series por músculo y semana${V.pend.length ? ` (incluye lo que aún toca: ${V.pend.map(d => WD[d.weekday] + ' ' + d.name).join(', ')})` : ''}.`);
  lines.push('Faltan: ' + (list('low').map(r => `${zoneName(r.k)} ${wcR(r.t)}/${WC_MIN} (faltan ${Math.ceil(WC_MIN - r.t)})`).join(', ') || 'ninguno'));
  lines.push('Exceso: ' + (list('high').map(r => `${zoneName(r.k)} ${wcR(r.t)} (${Math.floor(r.t - WC_MAX)} de más)`).join(', ') || 'ninguno'));
  if (list('ok').length) lines.push('En la meta: ' + list('ok').map(r => `${zoneName(r.k)} ${wcR(r.t)}`).join(', '));
  return lines.join('\n');
}

/* ---------- 2. Entreno para completar (sábado o domingo) ---------- */
const WC_SLOTS = { pecho: ['hpush', 'ipush'], esp: ['hpull', 'vpull'], homb: ['lat', 'vpush', 'rear'], bic: ['bi'], tri: ['tri'], cuad: ['quad', 'squat'], isq: ['ham', 'hinge'], glu: ['glute', 'hinge'], pant: ['calf'] };
const WC_BIG = ['cuad', 'glu', 'isq', 'esp', 'pecho', 'homb', 'bic', 'tri', 'pant'];
const WC_ISO = /elevaciones laterales|pajaros|face pull|curl|extension|abduccion|talones|triceps|crunch|cruces|aperturas/;
function wcPlanEx(name) { for (const p of gymPlans()) for (const d of p.days) for (const e of d.exercises) if (e.name === name) return e; return null; }
/* Ejercicios para un músculo: primero los que ya haces (historial reciente y tus rutinas), luego la biblioteca */
function wcCands(k) {
  const o = pbBase(), g = activeGym().id, lim = Date.now() - 56 * 864e5, seen = {}, out = [];
  const add = n => { if (!n || seen[n]) return; seen[n] = 1; if (!libFind(n) || wcMain(n) !== k || (o.inj || []).some(j => PB_AVOID[j] && PB_AVOID[j].test(normName(n)))) return; out.push(n); };
  state.sessions.forEach(s => { if (!s.approx && sGym(s) === g && new Date(s.date) >= lim) s.exercises.forEach(e => add(e.name)); });
  gymPlans(g).forEach(p => p.days.forEach(d => d.exercises.forEach(e => add(e.name))));
  const eq = o.equip || 'gym';
  (WC_SLOTS[k] || []).forEach(sl => { const S = PB_SLOTS[sl]; if (S) (S[eq] || []).concat(eq === 'gym' || eq === 'basic' ? S.gym || [] : []).forEach(add); });
  return out;
}
/* Peso de trabajo: tu último 1RM estimado de ese ejercicio (cualquier tipo de día) llevado a las reps nuevas con 2 de sobra */
function wcLoad(e) {
  const g = activeGym().id, bar = barOf(e);
  for (const s of state.sessions) {
    if (s.approx || sGym(s) !== g) continue;
    const x = s.exercises.find(y => y.name === e.name); if (!x || !x.sets.length) continue;
    const best = Math.max.apply(null, x.sets.map(z => e1rm((+z.w || 0) + bar, Math.min(12, +z.r || 0))));
    if (!(+x.sets[0].w) && !bar) return 0;
    const raw = best / (1 + (e.repsMax + 2) / 30) - bar, inc = increment(e, raw);
    return Math.max(0, Math.floor(raw / inc) * inc);
  }
  const pe = wcPlanEx(e.name); if (pe && +pe.weight) return +pe.weight;
  const s = typeof startLoad === 'function' ? startLoad(e) : null;
  return s && s.w > 0 ? s.w : 0;
}
function wcBuild(kind, seed) {
  const V = wcVolume(), sore = soreMap(), out = [], skipped = [], used = {};
  const need = V.rows.filter(r => r.st === 'low').map(r => ({ k: r.k, n: Math.ceil(WC_MIN - r.t) }))
    .sort((a, b) => b.n - a.n || WC_BIG.indexOf(a.k) - WC_BIG.indexOf(b.k));
  let total = 0;
  need.forEach(x => {
    if (sore[x.k] && sore[x.k].lvl >= 2) { skipped.push(x.k); return; }
    let left = Math.max(2, Math.min(x.n, 7) - (sore[x.k] ? 1 : 0));
    const cands = qkShuffle(wcCands(x.k), seed).filter(n => !used[n]);
    for (let i = 0; i < cands.length && left >= 2 && out.length < 7 && total < 20; i++) {
      const name = cands[i], fresh = typeof doneBefore === 'function' && !doneBefore(name);   // nunca hecho: 2 series para no quedar adolorido
      const sets = Math.min(fresh ? 2 : i ? 3 : 4, left, 20 - total); if (sets < 2) break;
      const pe = wcPlanEx(name), comp = !WC_ISO.test(normName(name)) && ['bic', 'tri', 'pant'].indexOf(x.k) < 0;
      const rp = kind === 'fuerza' ? (comp ? '6-8' : '8-10') : (comp ? '10-12' : '12-15');
      const e = E(name, pe ? pe.type : pbType(name), 0, sets, rp, kind === 'fuerza' ? (comp ? 2.5 : 1.5) : (comp ? 1.5 : 1));
      delete e.bar;
      const bar = pe && pe.bar != null ? +pe.bar : BAR_DEFAULT[name] != null ? (pbLb() ? 45 : BAR_DEFAULT[name]) : null;
      if (bar != null) e.bar = bar;
      e.weight = wcLoad(e); e.wcZ = x.k; if (fresh) e.wcNew = 1;
      used[name] = 1; out.push(e); total += sets; left -= sets;
    }
  });
  return { list: out, skipped, dl: V.dl };
}
/* Lo que verás en la sesión: el coach decide el peso (con tu historial de ese tipo de día) y en descarga baja series y peso */
function wcPreview(e, kind) {
  let w = +e.weight || 0; try { const c = coachFor(e, activeGym().id, kind); if (c && c.w != null) w = +c.w; } catch (x) {}
  const I = wcDl(), dl = !!(I && I.deload), inc = increment(e, w);
  return { w: dl ? Math.max(0, Math.round(w * 0.9 / inc) * inc) : w, sets: dl ? Math.ceil(e.sets / 2) : e.sets };
}
const wcMins = list => Math.round(list.reduce((a, e) => a + e.sets * (45 + e.rest) + 90, 0) / 60) + 5;
function wcFillDays() {
  const ws = weekStartOf(new Date()), tk = dk(new Date()), out = [];
  [5, 6].forEach(i => { const d = new Date(ws); d.setDate(d.getDate() + i); const k = dk(d); if (k >= tk) out.push({ k, l: k === tk ? 'Hoy' : WDL[d.getDay()] + ' ' + d.getDate() }); });
  if (!out.length) out.push({ k: tk, l: 'Hoy' });
  return out;
}
function wcFill() { const f = state.settings.wcFill; return f && f.wk === wkKey(new Date()) && f.date >= dk(new Date()) && !state.sessions.some(s => s.dayId === f.id) ? f : null; }
function wcFillSheet() {
  if (!wc.kind) wc.kind = goalNow() === 'fuerza' ? 'fuerza' : 'bombeo';
  const days = wcFillDays(); if (!days.some(d => d.k === wc.day)) wc.day = days[0].k;
  const B = wcBuild(wc.kind, wc.seed), u = wcU(), old = wcFill();
  wc.list = B.list;
  const chip = (on, attrs, label) => `<button type="button" class="qk-chip ${on ? 'on' : ''}" ${attrs}>${label}</button>`;
  const dayL = (days.find(d => d.k === wc.day) || days[0]).l;
  openSheet(`<div class="row"><h2 class="grow">Entreno para completar</h2><button class="icon-btn" data-act="sheet-close" aria-label="Cerrar">${ic('x', 18)}</button></div>
    <div class="muted wc-sub">Con los músculos que te faltan para llegar a ${WC_MIN} series esta semana. Tus rutinas no cambian.</div>
    <div class="label">Día</div><div class="qk-chips">${days.map(d => chip(wc.day === d.k, `data-wc="day" data-v="${d.k}"`, d.l)).join('')}</div>
    <div class="label">Tipo</div><div class="qk-chips">${chip(wc.kind === 'fuerza', 'data-wc="kind" data-v="fuerza"', 'Fuerza · pesado, 6-10 reps')}${chip(wc.kind === 'bombeo', 'data-wc="kind" data-v="bombeo"', 'Bombeo · 10-15 reps')}</div>
    ${B.dl ? `<div class="safe meso dl">${ic('battery', 16)}<span>Semana de descarga: al empezar, la app pone la mitad de series y −10 % de peso.</span></div>` : ''}
    <div class="qk-list">${B.list.length ? B.list.map(e => { const p = wcPreview(e, wc.kind); return `<div class="qk-ex">${thumb(e.name)}<span class="grow"><b>${esc(e.name)}</b><small class="muted">${p.sets} × ${reps(e)}${p.w ? ' · ' + fmtKg(p.w) + ' ' + u : ''} · ${zoneName(e.wcZ).toLowerCase()} +${p.sets}${e.wcNew ? ' · nuevo: entra suave' : ''}</small></span></div>`; }).join('')
      : `<div class="muted">${B.skipped.length ? 'Los músculos que faltan aún te duelen: mejor descansa.' : 'No te falta ningún músculo esta semana. ¡Bien!'}</div>`}</div>
    ${B.skipped.length && B.list.length ? `<div class="muted wc-sub">Sin ${B.skipped.map(k => zoneName(k).toLowerCase()).join(', ')}: te duele fuerte.</div>` : ''}
    ${B.list.length ? `<div class="muted wc-sub">≈ ${wcMins(B.list)} min con calentamiento. El peso sale de tu historial; en la sesión el coach lo afina.${old ? ' Reemplaza el entreno que ya tenías guardado.' : ''}</div>
    <div class="grid2"><button type="button" class="btn" data-wc="again">${ic('refresh-cw', 16)} Otra opción</button><button type="button" class="btn" data-wc="go">${ic('play', 16)} Empezar ahora</button></div>
    <button type="button" class="btn primary block" data-wc="save">${ic('calendar-check', 16)} Guardar para ${dayL === 'Hoy' ? 'hoy' : 'el ' + dayL.toLowerCase().replace(/ \d+$/, '')}</button>` : ''}`);
  const c = $('#sheet .sheet-card'); if (c) c.classList.add('wc-sheet');
}
function wcSaveFill() {
  if (!wc.list || !wc.list.length) return;
  state.settings.wcFill = { id: 'wf-' + uid(), wk: wkKey(new Date()), date: wc.day, kind: wc.kind, gym: activeGym().id, list: JSON.parse(JSON.stringify(wc.list)) };
  savePlans(); closeSheet(); render();
  toast(wc.day === dk(new Date()) ? 'Listo: lo tienes en Entrenar.' : 'Guardado: el ' + WDL[new Date(wc.day + 'T12:00:00').getDay()].toLowerCase() + ' lo verás en Entrenar.');
}
/* Empieza como el Entreno rápido: rutina temporal que se quita enseguida (la sesión queda en el historial) */
function wcStart(f) {
  const plan = { id: 'wcfill', name: 'Completar la semana', gymId: f.gym || activeGym().id, days: [{ id: f.id, name: `Completar semana · ${KINDS[f.kind] || 'Bombeo'}`, weekday: new Date().getDay(), kind: f.kind, exercises: JSON.parse(JSON.stringify(f.list)) }] };
  state.plans.push(plan);
  try { closeSheet(); startSession(plan.id, f.id); } finally { state.plans = state.plans.filter(p => p !== plan); LS.set('plans', state.plans); }
  /* Las series ya están contadas: se quita el +1 de las semanas finales del bloque (la descarga sí se respeta) */
  const d = state.draft; if (!d || d.dayId !== f.id || !d.meso || d.meso.deload) return;
  d.exercises.forEach(e => { if (e.mesoNote && /\+1 serie/.test(e.mesoNote) && e.log.length > 1 && !e.log[e.log.length - 1].done) { e.log.pop(); e.target = e.log.length; delete e.mesoNote; } });
  saveDraft(); render();
}
/* Sus pesos (otras reps, fuerza o bombeo) no se copian a tus rutinas al terminar */
const _learnWc = learnWeights;
learnWeights = function (s) { if (s && s.planId === 'wcfill') return; return _learnWc(s); };

/* ---------- 3. Resumen del domingo y propuesta para la semana siguiente ---------- */
/* Semana que se resume: la actual desde el día del resumen (vie/sáb/dom); antes de ese día o con el lunes elegido, la que terminó */
const wcSumOff = () => { const si = wcIdx(wcCfg().sun); return si >= 4 && wcToday() >= si ? 0 : 1; };
const wcSumKey = () => wkKey(new Date(Date.now() - wcSumOff() * 7 * 864e5));
function wcProposal(off) {
  const plan = activePlan(); if (!plan || !plan.days.length) return null;
  const ws = weekStartOf(new Date()); ws.setDate(ws.getDate() - 7 * off);
  const nx = new Date(ws.getTime() + 7 * 864e5 + 12 * 36e5), I = wcDl(nx), dl = !!(I && I.deload);
  const g = plan.gymId || 'rokaz', vol = {}, items = [], notes = [];
  ZONES.forEach(z => { vol[z.k] = 0; });
  plan.days.forEach(d => d.exercises.forEach(e => { const sh = zoneShares(e.name); for (const k in sh) vol[k] += sh[k] * (+e.sets || 0); }));
  plan.days.slice().sort((a, b) => wcIdx(a.weekday) - wcIdx(b.weekday)).forEach(d => d.exercises.forEach(ex => {
    const kind = d.kind || kindOfName(d.name); let c = null; try { c = coachFor(ex, g, kind); } catch (x) {}
    const w1 = c && c.w != null ? +c.w : +ex.weight || 0;
    items.push({ day: d.id, dn: d.name, wd: d.weekday, ex: ex.id, n: ex.name, s0: +ex.sets || 0, s1: +ex.sets || 0, w0: +ex.weight || 0, w1, rp: reps(ex), mode: c ? c.mode : 'hold', why: c ? wcPlain(c.head) : '', bw: !w1 && !(+ex.weight), inc: increment(ex, w1), vr: '' });
  }));
  /* Volumen semanal de la rutina fuera de 10-20 por músculo: ±1 serie por ejercicio (no en la descarga) */
  if (!dl) MM_MAIN.forEach(k => {
    const v = vol[k], mine = items.filter(it => wcMain(it.n) === k);
    if (v < WC_MIN) {
      if (!mine.length) { notes.push(`Tu rutina no tiene un ejercicio principal de ${zoneName(k).toLowerCase()} (${wcR(v)} series por semana). Agrega uno en Rutinas o usa "Crear entreno para completar".`); return; }
      const need0 = Math.ceil(WC_MIN - v); let need = need0;   // como mucho +1 serie por ejercicio y semana: el volumen sube de a poco
      mine.forEach(it => { if (need > 0 && it.s1 < 5) { it.s1++; need--; it.vr = `${zoneName(k)}: ${wcR(v)} series por semana, menos de ${WC_MIN}`; } });
      if (need > 0) notes.push(`${zoneName(k)} seguirá corto (${wcR(v + need0 - need)} de ${WC_MIN} series): súmale un ejercicio en Rutinas o usa "Crear entreno para completar" el fin de semana.`);
    } else if (v > WC_MAX) {
      let extra = Math.floor(v - WC_MAX);
      mine.slice().reverse().forEach(it => { if (extra > 0 && it.s1 > 2) { it.s1--; extra--; it.vr = `${zoneName(k)}: ${wcR(v)} series por semana, más de ${WC_MAX}`; } });
    }
  });
  return { wk: dk(ws), next: dk(nx), plan: plan.id, planName: plan.name, I, dl, items, notes };
}
function wcApplied(P) { const a = state.settings.wcProp; return a && a.wk === P.wk && a.plan === P.plan && a.st === 'ok' ? a : null; }
function wcMesoLine(P) {
  const I = P.I;
  if (!I) return '';
  if (P.dl) return `<div class="safe meso dl">${ic('battery', 16)}<span><b>La próxima semana es de descarga</b> (bloque ${I.n}). Al empezar cada sesión la app pone la mitad de series y −10 % de peso, sin fallo. Tus rutinas no cambian por eso: abajo ves lo que harás.</span></div>`;
  return `<div class="safe meso">${ic('layers', 16)}<span>Próxima semana: <b>bloque ${I.n}, semana ${I.wk + 1} de ${I.total}</b>. Deja ${I.rir === 3 ? '2-3' : I.rir === 2 ? '2' : '0-1'} reps de sobra.${I.plus ? ' La app suma +1 serie en hasta 3 ejercicios principales al empezar (no está en esta tabla).' : ''}</span></div>`;
}
function wcSumHtml() {
  const off = wcSumOff(), r = weekReport(off), done = weekSets(off).sets, g = wcGoal(), u = wcU();
  const P0 = wcProposal(off), A = P0 && wcApplied(P0), P = A || P0;
  const low = MM_MAIN.filter(k => done[k] < WC_MIN), high = MM_MAIN.filter(k => done[k] > WC_MAX);
  const MODE = { up: '⬆', down: '⬇', back: '↺', pain: '⚠', first: '•', hold: '→' };
  let prop = '<div class="muted wc-sub">Activa una rutina para recibir una propuesta.</div>';
  if (P) {
    const byDay = []; P.items.forEach(it => { let d = byDay.find(x => x.id === it.day); if (!d) byDay.push(d = { id: it.day, n: it.dn, wd: it.wd, list: [] }); d.list.push(it); });
    const nCh = P.items.filter(it => it.s1 !== it.s0 || (!it.bw && it.w1 !== it.w0)).length;
    prop = `${wcMesoLine(P)}${P.notes.map(t => `<div class="safe tip">${ic('info', 16)}<span>${esc(t)}</span></div>`).join('')}
      ${byDay.map(d => `<div class="wc-day"><div class="wc-dh">${WD[d.wd]} · ${esc(d.n)}</div>${d.list.map(it => {
        const ws = it.s1 !== it.s0, ww = !it.bw && it.w1 !== it.w0, dlS = Math.ceil(it.s1 / 2), dlW = Math.max(0, Math.round(it.w1 * 0.9 / (it.inc || 1)) * (it.inc || 1));
        return `<div class="wc-px m-${it.mode}"><div class="fs-nxh"><span class="fs-t">${MODE[it.mode] || '→'}</span><b class="grow fs-n">${esc(it.n)}</b><span class="num wc-pw">${it.bw ? 'peso corporal' : `${ww ? `<s>${fmtKg(it.w0)}</s> ` : ''}${fmtKg(it.w1)} ${u}`}</span></div>
          <div class="fs-nxs"><span class="num ${ws ? 'wc-ch' : ''}">${ws ? `<s>${it.s0}</s> → ` : ''}${it.s1} × ${it.rp} reps</span>${P.dl ? ` · <b>descarga:</b> ${dlS} × ${it.bw ? '' : fmtKg(dlW) + ' ' + u}` : ''}${it.vr ? ` · ${esc(it.vr)}` : it.why ? ` · ${esc(it.why.length > 90 ? it.why.slice(0, 87) + '…' : it.why)}` : ''}</div></div>`;
      }).join('')}</div>`).join('')}
      ${A ? `<div class="wc-done">${ic('circle-check', 16)} Aplicada a "${esc(P.planName)}". <button type="button" class="linkbtn" data-wc="undo">Deshacer</button></div>`
        : nCh ? `<div class="muted wc-sub">${nCh} ${nCh === 1 ? 'cambio' : 'cambios'} en "${esc(P.planName)}". Nada cambia hasta que toques Aplicar.</div><div class="grid2"><button type="button" class="btn" data-wc="no">Ahora no</button><button type="button" class="btn primary" data-wc="apply">${ic('check', 16)} Aplicar</button></div>`
        : `<div class="muted wc-sub">Tu rutina ya está bien: no hay cambios que aplicar.</div><button type="button" class="btn block" data-wc="no">Entendido</button>`}`;
  }
  return `<div class="row"><h2 class="grow">${off ? 'Tu semana pasada' : 'Resumen de la semana'}</h2><button class="icon-btn" data-act="sheet-close" aria-label="Cerrar">${ic('x', 18)}</button></div>
    ${g ? `<div class="wc-goal">${ic('target', 16)}<span><b>Tu objetivo:</b> ${esc(g)}</span></div>` : ''}
    ${reportHTML(r, '', true)}
    <div class="muted wc-sub"><b>Músculos:</b> ${low.length ? `faltaron ${low.map(k => `${zoneName(k).toLowerCase()} (${wcR(done[k])})`).join(', ')}` : `todos llegaron a ${WC_MIN}`}${high.length ? `; exceso en ${high.map(k => `${zoneName(k).toLowerCase()} (${wcR(done[k])})`).join(', ')}` : ''}.</div>
    <div class="fs-sec">${ic('clipboard-list', 15)} Propuesta para la semana del ${P ? fmtDate(P.next) : ''}</div>
    ${prop}
    <div class="dd-acts"><button type="button" class="btn small" data-wc="share-s">${ic('share-2', 15)} Compartir</button><button type="button" class="btn small" data-wc="copy-s">${ic('copy', 15)} Copiar</button></div>`;
}
function wcSumText() {
  const off = wcSumOff(), r = weekReport(off), done = weekSets(off).sets, g = wcGoal(), u = wcU();
  const P0 = wcProposal(off), P = P0 && (wcApplied(P0) || P0);
  const lines = [`Resumen de la semana del ${fmtDate(r.ws)} · Forja`];
  if (g) lines.push(`Objetivo: ${g}`);
  lines.push(`Sesiones: ${r.n}/${r.target} · Series: ${r.sets} · Récords: ${r.prs.length ? r.prs.join(', ') : '0'} · Cardio: ${r.cd.act} min`);
  lines.push('Series por músculo: ' + MM_MAIN.map(k => `${zoneName(k)} ${wcR(done[k])}`).join(', '));
  reportTips(r, true).forEach(t => lines.push('- ' + wcPlain(t)));
  if (P) {
    lines.push('', `Propuesta para la semana del ${fmtDate(P.next)}${P.dl ? ' (semana de descarga: mitad de series y −10 %)' : ''}:`);
    let last = '';
    P.items.forEach(it => {
      if (it.day !== last) { lines.push(`${WD[it.wd]} · ${it.dn}`); last = it.day; }
      const s = P.dl ? Math.ceil(it.s1 / 2) : it.s1, w = P.dl ? Math.max(0, Math.round(it.w1 * 0.9 / (it.inc || 1)) * (it.inc || 1)) : it.w1;
      lines.push(`  - ${it.n}: ${s} × ${it.rp}${it.bw ? '' : ' con ' + fmtKg(w) + ' ' + u}${it.s1 !== it.s0 ? ` (antes ${it.s0} series)` : ''}`);
    });
    P.notes.forEach(t => lines.push('* ' + t));
  }
  return lines.join('\n');
}
function wcApply() {
  const P = wcProposal(wcSumOff()); if (!P) return;
  P.items.forEach(it => {
    const f = findDay(P.plan, it.day), ex = f.d && f.d.exercises.find(e => e.id === it.ex); if (!ex) return;
    it.ps = ex.sets; it.pw = ex.weight;
    ex.sets = it.s1; if (!it.bw && it.w1 > 0) ex.weight = it.w1;
  });
  P.st = 'ok'; P.at = Date.now();
  state.settings.wcProp = JSON.parse(JSON.stringify(P));
  wcMark('s', P.wk); toast('Propuesta aplicada a tu rutina.');
}
function wcUndo() {
  const A = state.settings.wcProp; if (!A || A.st !== 'ok') return;
  A.items.forEach(it => { const f = findDay(A.plan, it.day), ex = f.d && f.d.exercises.find(e => e.id === it.ex); if (!ex || it.ps == null) return; ex.sets = it.ps; ex.weight = it.pw; });
  A.st = 'undo'; savePlans(); toast('Cambios deshechos: tu rutina quedó como antes.');
}
function wcSheet(which) {
  openSheet(which === 's' ? wcSumHtml() : wcReportHtml());
  const c = $('#sheet .sheet-card'); if (c) { c.classList.add('wc-sheet'); c.scrollTop = 0; }
}

/* ---------- Tarjetas en Entrenar y en Perfil → Hoy ---------- */
function wcDue() {
  const C = wcCfg(), t = wcToday(), S = wcSeen(), out = {};
  if (!C.on || !state.sessions.length) return out;
  const si = wcIdx(C.sun), sk = wcSumKey();
  if ((si < 4 || t >= si) && S.s !== sk) out.s = sk;
  if (!out.s && t >= wcIdx(C.fri) && S.f !== wkKey(new Date())) out.f = wkKey(new Date());
  return out;
}
function wcCards() {
  let h = '';
  const f = wcFill();
  if (f) {
    const isToday = f.date === dk(new Date()), wd = WDL[new Date(f.date + 'T12:00:00').getDay()].toLowerCase();
    h += `<div class="card wc-card fill"><div class="row"><span class="pb-ic">${ic('dumbbell', 18)}</span><b class="grow">Entreno para completar · ${isToday ? 'hoy' : wd}</b><button type="button" class="icon-btn" data-wc="fill-del" aria-label="Quitar">${ic('x', 16)}</button></div>
      <div class="muted wc-sub">${KINDS[f.kind] || ''} · ${f.list.length} ejercicios · ≈ ${wcMins(f.list)} min: ${f.list.map(e => esc(e.name)).join(', ')}.</div>
      <button type="button" class="btn ${isToday ? 'primary' : ''} small" data-wc="fill-go">${ic('play', 15)} Empezar${isToday ? '' : ' ahora'}</button></div>`;
  }
  const due = wcDue();
  if (due.s) h += `<div class="card wc-card"><div class="row"><span class="pb-ic">${ic('calendar-check', 18)}</span><b class="grow">${wcSumOff() ? 'Tu semana pasada' : 'Tu semana'} y la propuesta para la siguiente</b><button type="button" class="icon-btn" data-wc="seen-s" aria-label="Cerrar">${ic('x', 16)}</button></div>
      <div class="muted wc-sub">Resumen, series por músculo y pesos y series para cada ejercicio${(wcDl(new Date(Date.now() + (7 - wcToday()) * 864e5)) || {}).deload && !wcSumOff() ? ', con tu semana de descarga' : ''}. Tú decides si se aplica.</div>
      <button type="button" class="btn primary small" data-wc="open-s">Ver propuesta</button></div>`;
  else if (due.f) {
    const V = wcVolume(), low = V.rows.filter(r => r.st === 'low'), high = V.rows.filter(r => r.st === 'high');
    h += `<div class="card wc-card"><div class="row"><span class="pb-ic">${ic('clipboard-list', 18)}</span><b class="grow">Reporte de la semana</b><button type="button" class="icon-btn" data-wc="seen-f" aria-label="Cerrar">${ic('x', 16)}</button></div>
      <div class="muted wc-sub">${low.length ? `Faltan series de <b>${low.slice(0, 4).map(r => zoneName(r.k).toLowerCase()).join(', ')}</b>` : 'Todos tus músculos llegan a 10 series'}${high.length ? `; exceso en <b>${high.map(r => zoneName(r.k).toLowerCase()).join(', ')}</b>` : ''}.</div>
      <div class="row wc-btns"><button type="button" class="btn primary small" data-wc="open-f">Ver reporte</button>${low.length ? `<button type="button" class="btn small" data-wc="fill">${ic('dumbbell', 15)} Completar</button>` : ''}</div></div>`;
  }
  return h;
}
const wcLinks = () => `<div class="card wc-links"><div class="row"><span class="pb-ic">${ic('clipboard-list', 18)}</span><h3 class="grow">Coach semanal</h3></div>
  <div class="row wc-btns"><button type="button" class="btn small" data-wc="open-f">Músculos de la semana</button><button type="button" class="btn small" data-wc="open-s">Resumen y propuesta</button></div></div>`;
const _renderWc = render;
render = function () {
  _renderWc();
  const app = $('#app'); if (!app || isWatch()) return;
  if (state.tab === 'train' && !state.draft && !app.querySelector('.wc-card')) {
    const hero = app.querySelector(':scope > .hero'), h = hero && wcCards();
    if (h) hero.insertAdjacentHTML('afterend', h);
  }
  if (state.tab === 'profile' && state.profSub === 'hoy' && !app.querySelector('.wc-links')) {
    const at = app.querySelector('.wk-card') || app.querySelector('.day-strip'); if (at) at.insertAdjacentHTML('afterend', wcLinks());
  }
};

/* ---------- 4. Ajustes: días del reporte y del resumen ---------- */
function wcSetCard() {
  const C = wcCfg(), opt = (list, v) => list.map(d => `<option value="${d}" ${d === v ? 'selected' : ''}>${WDL[d]}</option>`).join('');
  return `<div class="card wc-set"><h3>Coach semanal</h3>
    <div class="row"><span class="grow"><b>Reporte y resumen en Entrenar</b><br><span class="muted" style="font-size:12.5px">Series por músculo, entreno para completar y propuesta para la semana siguiente.</span></span>
      <button type="button" class="switch ${C.on ? 'on' : ''}" style="border:0;cursor:pointer;margin-left:12px" data-wc="cfg-on" role="switch" aria-checked="${C.on}" aria-label="Coach semanal"><i></i></button></div>
    <div class="field"><label class="label" for="wc-fri">Reporte de músculos (faltan y exceso)</label><select id="wc-fri">${opt(WC_FDAYS, C.fri)}</select></div>
    <div class="field"><label class="label" for="wc-sun">Resumen y propuesta para la semana siguiente</label><select id="wc-sun">${opt(WC_SDAYS, C.sun)}</select>
      <div class="muted" style="font-size:12px">El lunes resume la semana que terminó. Tus rutinas solo cambian si tocas "Aplicar".</div></div>
    <div class="row wc-btns"><button type="button" class="btn small" data-wc="open-f">Ver reporte</button><button type="button" class="btn small" data-wc="open-s">Ver resumen</button></div></div>`;
}
const _vSettingsWc = vSettings;
vSettings = function () { return _vSettingsWc() + wcSetCard(); };
SET_ORDER.push(['wc-set', 3.5]);
SET_ORDER.sort((a, b) => a[1] - b[1]);

/* ---------- Toques ---------- */
function wcShare(title, txt) {
  const S = typeof CAP !== 'undefined' && CAP && CAP.Share;
  if (S) S.share({ title, text: txt }).catch(() => {});
  else if (navigator.share) navigator.share({ title, text: txt }).catch(() => {});
  else ddCopy(txt).then(ok => toast(ok ? 'Copiado: pégalo en WhatsApp o en tu IA.' : 'No se pudo compartir.'));
}
document.addEventListener('click', ev => {
  const b = ev.target.closest && ev.target.closest('[data-wc]'); if (!b) return;
  ev.preventDefault(); ev.stopPropagation();
  const a = b.dataset.wc;
  if (a === 'open-f') return wcSheet('f');
  if (a === 'open-s') return wcSheet('s');
  if (a === 'seen-f') { wcMark('f', wkKey(new Date())); return render(); }
  if (a === 'seen-s') { wcMark('s', wcSumKey()); return render(); }
  if (a === 'fill') { wc.seed = 0; return wcFillSheet(); }
  if (a === 'day') { wc.day = b.dataset.v; return wcFillSheet(); }
  if (a === 'kind') { wc.kind = b.dataset.v; return wcFillSheet(); }
  if (a === 'again') { wc.seed = (wc.seed || 0) + 1; return wcFillSheet(); }
  if (a === 'save') return wcSaveFill();
  if (a === 'go') { if (!wc.list || !wc.list.length) return; return wcStart({ id: 'wf-' + uid(), kind: wc.kind, gym: activeGym().id, list: wc.list }); }
  if (a === 'fill-go') { const f = wcFill(); if (f) wcStart(f); return; }
  if (a === 'fill-del') { delete state.settings.wcFill; savePlans(); toast('Entreno para completar quitado.'); return render(); }
  if (a === 'apply') { wcApply(); wcSheet('s'); return render(); }
  if (a === 'undo') { wcUndo(); wcSheet('s'); return render(); }
  if (a === 'no') { wcMark('s', wcSumKey()); closeSheet(); return render(); }
  if (a === 'share-f') return wcShare('Reporte de la semana', wcReportText());
  if (a === 'copy-f') return ddCopy(wcReportText()).then(ok => toast(ok ? 'Reporte copiado.' : 'No se pudo copiar.'));
  if (a === 'share-s') return wcShare('Resumen de la semana', wcSumText());
  if (a === 'copy-s') return ddCopy(wcSumText()).then(ok => toast(ok ? 'Resumen copiado.' : 'No se pudo copiar.'));
  if (a === 'cfg-on') { state.settings.wcoach = Object.assign(wcCfg(), { on: !wcCfg().on }); savePlans(); return render(); }
}, true);
document.addEventListener('change', ev => {
  const id = ev.target.id; if (id !== 'wc-fri' && id !== 'wc-sun') return;
  state.settings.wcoach = Object.assign(wcCfg(), id === 'wc-fri' ? { fri: +ev.target.value } : { sun: +ev.target.value });
  savePlans(); toast(`Listo: ${id === 'wc-fri' ? 'el reporte' : 'el resumen'} llegará el ${WDL[+ev.target.value].toLowerCase()}.`);
});
render();
