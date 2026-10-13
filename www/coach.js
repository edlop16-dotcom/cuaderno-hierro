/* ================== Coach de sobrecarga progresiva (funciona sin internet) ==================
   Analiza tus últimas sesiones de cada ejercicio (mismo gym y mismo tipo de día) y tus notas,
   y te dice qué peso y cuántas reps buscar en la próxima sesión, y por qué. */
const TAG = k => NOTE_TAGS.find(t => t.k === k).re;
const HARD = { test: n => TAG('hard').test(n) || TAG('fail').test(n) };
const EASY = { test: n => TAG('easy').test(n) || TAG('up').test(n) };
const PAIN = { test: n => TAG('pain').test(n) };
const TECH = { test: n => TAG('tech').test(n) };
const DOWN = { test: n => TAG('down').test(n) };

function exHistory(name, gymId, kind, n = 6) {
  const out = [];
  for (const s of state.sessions) {
    if (sGym(s) !== gymId || sKind(s) !== kind) continue;
    const x = s.exercises.find(e => e.name === name);
    if (x && x.sets.length) out.push({ date: s.date, sets: x.sets, note: x.note || '' });
    if (out.length >= n) break;
  }
  return out;
}
const bestE = h => Math.max(...h.sets.map(x => e1rm(x.w, x.r)));
const daysSince = iso => Math.floor((Date.now() - new Date(iso)) / 864e5);
const repsTxt = arr => arr.join(' · ');

function coachFor(ex, gymId, kind) {
  const H = exHistory(ex.name, gymId, kind);
  const tips = [];
  const sg = suggest(gymId, kind, ex);
  let w = sg.w, mode = sg.up ? 'up' : 'hold';
  if (!H.length) {
    const ref = lastPerf(ex.name, gymId, kind);
    if (ref && ref.ref) {
      const rw = Math.max(...ref.sets.map(x => x.w)), rr = ref.sets.filter(x => x.w === rw).map(x => x.r);
      const rn = ref.base ? null : (state.sessions.find(s => s.date === ref.date) || { exercises: [] }).exercises.find(e => e.name === ex.name);
      const t = [ref.base ? `Tu récord en ${esc(gymName(ref.gymId))} (Hevy / Symmetry): ${fmtKg(rw)} kg × ${rr.join(' · ')}.` : `Tu última vez fue en ${esc(gymName(ref.gymId))} (${ago(ref.date)}): ${fmtKg(rw)} kg × ${rr.join(' · ')}.`, 'Las máquinas de cada gym pesan distinto: en la 1ª serie confirma que el peso se sienta igual y ajusta.'];
      if (rn && rn.note) t.push(`Tu nota de allá: “${esc(rn.note)}”.`);
      return { w: rw, mode: 'hold', head: `<b>Referencia de ${esc(gymName(ref.gymId))}: ${fmtKg(rw)} kg</b>. Busca ${reps(ex)} reps.`, goal: rr, tips: t };
    }
    return { w, mode: 'first', head: sg.up ? sg.msg : !(+w) ? (/flexiones|plancha|crunch abdominal|dominadas|fondos|puente de gluteo|peso corporal/.test(normName(ex.name)) ? `Primera vez: con tu peso corporal, busca ${reps(ex)} reps con buena técnica.` : `Primera vez: elige un peso con el que te sobren 3 reps y busca ${reps(ex)} reps.`) : `Primera vez aquí: empieza con <b>${fmtKg(w)} kg</b> y busca ${reps(ex)} reps.`, goal: null,
      tips: ['Serie 1 con 2 reps en reserva, serie 2 con 1 y la última al límite con buena técnica. Así la app aprende tu nivel.'] };
  }
  const last = H[0], note = normName(last.note);
  const topW = Math.max(...last.sets.map(x => x.w));
  const lastReps = last.sets.filter(x => x.w === topW).map(x => x.r);
  let goal = null;

  /* 1. Notas: lo que sentiste manda sobre los números */
  if (PAIN.test(note)) {
    mode = 'pain'; w = Math.max(0, Math.round(topW * 0.85 / increment(ex, topW)) * increment(ex, topW));
    tips.push(`Tu nota menciona dolor o molestia. Baja a <b>${fmtKg(w)} kg</b>, cuida la técnica y si el dolor es en la articulación, para y consúltalo.`);
  } else if (DOWN.test(note)) {
    const inc = increment(ex, topW); mode = 'down'; w = Math.max(0, Math.round(topW * 0.9 / inc) * inc);
    tips.push(`Tu nota pide bajar el peso: usa <b>${fmtKg(w)} kg</b> y busca el rango completo de reps.`);
  } else if (TECH.test(note)) {
    mode = 'hold'; w = topW;
    tips.push(`Tu nota habla de técnica: domina <b>${fmtKg(topW)} kg</b> con buena forma (bajada en 2-3 s, recorrido completo) antes de subir.`);
  } else if (HARD.test(note) && mode === 'up') {
    mode = 'hold'; w = topW;
    tips.push(`Completaste el rango, pero tu nota dice que costó mucho. Consolida <b>${fmtKg(topW)} kg</b> una sesión más antes de subir.`);
  } else if (EASY.test(note) && mode !== 'up') {
    const inc = increment(ex, topW); mode = 'up'; w = topW + inc;
    tips.push(`Tu nota dice que fue fácil: sube a <b>${fmtKg(w)} kg</b> aunque no hayas llegado al tope de reps.`);
  } else if (HARD.test(note)) {
    tips.push('Tu nota dice que costó: mantén el peso y busca la misma cantidad de reps con mejor control.');
  }

  /* 2. Regla principal: doble progresión */
  if (mode === 'hold' && w === topW) {
    goal = lastReps.map(r => Math.min(ex.repsMax, (r || 0) + 1));
    if (lastReps.some(r => r < ex.repsMin)) {
      const lastTwoLow = H[1] && H[1].sets.some(x => x.w >= topW && x.r < ex.repsMin);
      if (lastTwoLow) {
        const inc = increment(ex, topW); w = Math.max(0, Math.round(topW * 0.9 / inc) * inc); mode = 'down';
        goal = Array(ex.sets).fill(ex.repsMin);
        tips.push(`Dos sesiones seguidas por debajo de ${ex.repsMin} reps: baja a <b>${fmtKg(w)} kg</b> y vuelve a subir desde ahí. No es retroceder, es construir.`);
      }
    }
  }
  if (mode === 'up') goal = Array(ex.sets).fill(ex.repsMin);

  /* 3. Estancamiento: 3+ sesiones sin mejorar tu 1RM estimado */
  if (H.length >= 4 && mode !== 'pain') {
    const recent = Math.max(...H.slice(0, 3).map(bestE)), before = bestE(H[3]);
    if (recent <= before * 1.005) tips.push('Llevas 3 sesiones sin progresar en este ejercicio. Prueba subir solo 1 kg, hacer la bajada en 3 s o agregar una pausa abajo. Si sigue igual, toca una semana de descarga.');
  }
  /* 4. Rendimiento bajo */
  if (H.length >= 2 && mode !== 'pain') {
    const prevBest = Math.max(...H.slice(1, 4).map(bestE));
    if (bestE(last) < prevBest * 0.92) tips.push('La última vez rendiste menos de lo normal. Revisa sueño (7-8 h), proteína y la creatina antes de esta sesión.');
  }
  /* 5. Volviste después de mucho tiempo */
  const gap = daysSince(last.date);
  if (gap >= 14 && mode !== 'down') {
    const inc = increment(ex, topW); w = Math.max(0, Math.round(topW * 0.9 / inc) * inc); mode = 'back';
    tips.unshift(`Hace ${gap} días que no haces este ejercicio aquí: empieza con <b>${fmtKg(w)} kg</b> (−10%) y recupera el ritmo.`);
  }
  /* 6. Drop set */
  const lastDrop = last.sets.find(x => x.drops && x.drops.length);
  if (lastDrop) tips.push(`Drop set anterior: ${lastDrop.drops.map(d => fmtKg(d.w) + '×' + d.r).join(', ')}. Intenta 1 rep más en el drop.`);

  const head = mode === 'up' ? `<b>Sube a ${fmtKg(w)} kg</b> y busca ${ex.repsMin}+ reps en cada serie.`
    : mode === 'down' ? `<b>Baja a ${fmtKg(w)} kg</b> y busca ${ex.repsMin}-${ex.repsMax} reps.`
    : mode === 'back' ? `<b>Retoma con ${fmtKg(w)} kg.</b>`
    : mode === 'pain' ? `<b>Prudencia: ${fmtKg(w)} kg</b> con técnica perfecta.`
    : `<b>Mantén ${fmtKg(w)} kg</b> y suma reps: meta <span class="num">${repsTxt(goal)}</span>.`;
  return { w, mode, head, goal, tips, last: { date: last.date, reps: lastReps, w: topW } };
}

/* Bloque del coach dentro de cada ejercicio */
function coachBox(e) {
  const c = e.coach;
  return `<div class="coach ${c.mode}"><div class="coach-h"><span class="coach-ic" aria-hidden="true">🧠</span><span>${c.head}</span></div>
    ${c.tips.length ? `<ul>${c.tips.map(t => `<li>${t}</li>`).join('')}</ul>` : ''}</div>`;
}

/* Al empezar la sesión: aplicar el peso que recomienda el coach */
const _startSessionC = startSession;
startSession = function (planId, dayId) {
  _startSessionC(planId, dayId);
  const d = state.draft; if (!d || d.coached) return;
  const plan = state.plans.find(p => p.id === planId), day = plan && plan.days.find(x => x.id === dayId);
  d.exercises.forEach(e => {
    const pe = day && day.exercises.find(x => x.id === e.exId) || e;
    const c = coachFor(Object.assign({}, pe, { sets: e.target }), d.gymId, d.kind);
    e.coach = c;
    if (c.w !== e.sugg.w) e.log.forEach(s => { if (!s.done) { s.w = c.w; (s.drops || []).forEach(dr => { if (!dr.done) dr.w = dropW(c.w, e); }); } });
  });
  d.coached = true; saveDraft(); render();
};

/* Tarjeta en Entrenar: plan del coach para la próxima sesión */
function coachCard(plan, day) {
  if (!plan || !day || !day.exercises.length) return '';
  const g = plan.gymId || 'rokaz', k = day.kind || kindOfName(day.name);
  const rows = day.exercises.map(ex => ({ ex, c: coachFor(ex, g, k) }));
  const ups = rows.filter(r => r.c.mode === 'up').length;
  const ic = { up: '⬆', down: '⬇', hold: '→', back: '↺', pain: '⚠', first: '•' };
  const st = streakInfo();
  const extra = [];
  if (st.weeks >= 7 && st.weeks % 8 === 7) extra.push('Llevas ' + st.weeks + ' semanas seguidas cumpliendo. La próxima semana considera una <b>descarga</b>: mismos ejercicios, la mitad de series.');
  const t = today(); if (!t.crea && SUPS.some(x => x.k === 'crea')) extra.push('Aún no marcas la creatina de hoy.');
  return `<div class="card coach-card"><div class="row" style="justify-content:space-between"><h3>🧠 Coach · ${esc(day.name)}</h3><span class="chip">${ups ? ups + ' para subir' : 'Consolidar'}</span></div>
    <div class="muted" style="font-size:12.5px">Sobrecarga progresiva: cuando completas el tope de reps en todas las series, subes peso; si no, sumas reps con el mismo peso.</div>
    <div class="coach-rows">${rows.map(({ ex, c }) => `<div class="crow ${c.mode}"><span class="cic">${ic[c.mode] || '→'}</span><span class="grow" style="min-width:0"><b>${esc(ex.name)}</b><small>${c.head.replace(/<[^>]+>/g, '')}</small></span><span class="num">${fmtKg(c.w)} kg</span></div>`).join('')}</div>
    ${extra.map(x => `<div class="muted" style="font-size:12.5px">${x}</div>`).join('')}
    <button class="btn small" data-act="coach-claude">Analizar con Claude</button></div>`;
}
/* Resumen para pegar en Claude (con tu plan Pro), por si quieres un análisis más profundo */
function claudePrompt() {
  const g = activeGym(), plan = activePlan();
  const lines = state.sessions.filter(s => Date.now() - new Date(s.date) < 35 * 864e5).slice(0, 16).reverse().map(s =>
    `${dk(s.date)} · ${s.gymName || gymName(sGym(s))} · ${KINDS[sKind(s)] || ''} · ${s.dayName}\n` + s.exercises.map(e => `  - ${e.name}: ${e.sets.map(x => fmtKg(x.w) + '×' + x.r + ((x.drops || []).map(d => ' ↓' + fmtKg(d.w) + '×' + d.r).join(''))).join(', ')}${e.note ? ' | nota: ' + e.note : ''}`).join('\n'));
  return `Eres mi entrenador experto en hipertrofia y sobrecarga progresiva. Tengo ${HISTORY.age} años, peso ${HISTORY.kg} kg, mido ${HISTORY.cm} cm, objetivo: ${HISTORY.goal}. Entreno en ${g.name} con el plan "${plan ? plan.name : ''}" (RIR 2-1-0, ritmo 2-3 s bajando, 1 s subiendo).
Estas son mis sesiones de las últimas 5 semanas (peso×reps por serie, ↓ = drop set):
${lines.join('\n') || '(sin sesiones registradas aún)'}

Dime: 1) qué peso y reps hacer en la próxima sesión de cada ejercicio, 2) si estoy estancado en algo y cómo romperlo, 3) si necesito una semana de descarga, 4) un consejo de técnica o recuperación. Sé concreto y breve.`;
}
document.addEventListener('click', async ev => {
  const b = ev.target.closest('[data-act="coach-claude"]'); if (!b) return;
  ev.stopPropagation();
  const txt = claudePrompt(); let ok = false;
  try { await navigator.clipboard.writeText(txt); ok = true; } catch (e) {}
  if (ok) toast('Resumen copiado. Abre Claude, pégalo y te dará un análisis detallado.');
  else openSheet(`<h2>Analizar con Claude</h2><div class="muted" style="font-size:13px">Copia este texto y pégalo en una conversación con Claude.</div><textarea class="note-in" rows="12" readonly>${esc(txt)}</textarea><button class="btn" data-act="sheet-close">Cerrar</button>`);
}, true);

/* Mostrar la tarjeta en Entrenar, debajo de "Te toca" */
const _vTrainC = vTrain;
vTrain = function () {
  const html = _vTrainC();
  if (state.draft) return html;
  const plan = activePlan(), nd = nextDay(plan);
  const i = html.indexOf('<div class="card daily">');
  const card = coachCard(plan, nd);
  return i < 0 || !card ? html : html.slice(0, i) + card + html.slice(i);
};
