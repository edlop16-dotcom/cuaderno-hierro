/* ==========================================================================
   Tanda D · Exportar a una IA como coach, formato obligatorio, descanso e importar para entrenar
   - Cada sesión nueva guarda el descanso de cada ejercicio (`rest`, segundos). En las viejas se usa el
     de tu rutina y se marca "(rutina)".
   - Tres prompts de coach (día, semana, historial) con {} llenados del perfil; si falta un dato se quita
     la frase. Editables en Ajustes → Coach IA (`settings.aiP`), con "Restablecer".
   - Al final de los tres y de "Copiar instrucción para tu IA": el FORMATO OBLIGATORIO (no se puede borrar).
   - "Exportar todo para tu IA" en Progreso (Semana) y Perfil: 4 semanas / 3 meses / todo.
   - Importar: primero los bloques con su día ("LUNES: nombre" dentro del bloque, o el título viejo
     "RECOMENDACIÓN PARA EL PRÓXIMO …" fuera), con Descanso opcional; si no hay, lo de siempre (nsParse). Vista previa por serie; ejercicio nuevo solo para esa
     sesión; "Entrenar ahora" con pesos, reps, RIR y descansos. El plan no cambia.
   - Sin correo, ID de cuenta ni datos de otros usuarios.
   ========================================================================== */

/* ---------- 1. El descanso queda guardado en cada sesión ---------- */
const _finishAix = finishSession;
finishSession = function () {
  const d = state.draft, id = d && d.id, rest = {};
  if (d) d.exercises.forEach(e => { if (e.rest) rest[e.name] = +e.rest; });
  _finishAix.apply(this, arguments);
  const s = id && !state.draft && state.sessions.find(x => x.id === id);
  if (s) { let ch = false; s.exercises.forEach(e => { if (rest[e.name] && e.rest == null) { e.rest = rest[e.name]; ch = true; } }); if (ch) saveLocal(); }
};

/* ---------- 2. Datos ---------- */
const aixU = () => (state.settings.unit === 'lb' ? 'lb' : 'kg');
const aixSec = s => { s = Math.round(+s || 0); return s >= 60 && s % 60 === 0 ? `${s / 60} min` : s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} min` : `${s} s`; };
function aixProfile() {
  const p = state.settings.prof || {}, pub = typeof pubUser === 'function' && pubUser();
  const goal = (typeof ddGoal === 'function' && ddGoal()) || '';
  const age = +p.age || (!pub ? +HISTORY.age : 0) || 0;
  let kg = 0; try { const wa = typeof weekAvgs === 'function' ? weekAvgs() : []; kg = wa.length ? wa[wa.length - 1].v : (+p.kg || (!pub ? +HISTORY.kg : 0)); } catch (e) {}
  const cm = +p.cm || (!pub ? +HISTORY.cm : 0) || 0;
  const inj = (p.inj || []).map(k => (PB_INJ.find(x => x[0] === k) || [k, k])[1]);
  try { const sm = soreMap(); Object.keys(sm).forEach(k => inj.push(`dolor ${LVL[sm[k].lvl] || ''} en ${zoneName(k).toLowerCase()}`.replace('  ', ' '))); } catch (e) {}
  const plan = activePlan();
  return { goal, age, kg: kg ? Math.round(kg * 10) / 10 : 0, cm, inj: inj.join(', '), days: plan ? plan.days.length : (+p.days || 0), gym: activeGym() ? activeGym().name : '' };
}
const AIX_PER = [['4w', 'Últimas 4 semanas', 28], ['3m', 'Últimos 3 meses', 92], ['all', 'Todo', 0]];
function aixFrom(per) { const P = AIX_PER.find(x => x[0] === per) || AIX_PER[1]; return P[2] ? Date.now() - P[2] * 864e5 : 0; }
/* Descanso de un ejercicio de una sesión: el guardado o el de tu rutina */
function aixRest(s, e) {
  if (e.rest) return aixSec(e.rest);
  for (const p of state.plans) for (const d of p.days) { if (d.id !== s.dayId) continue; const x = d.exercises.find(y => y.name === e.name); if (x && x.rest) return aixSec(x.rest) + ' (rutina)'; }
  for (const p of state.plans) for (const d of p.days) { const x = d.exercises.find(y => y.name === e.name); if (x && x.rest) return aixSec(x.rest) + ' (rutina)'; }
  return '';
}
/* Día de la rutina de una sesión (sin suponer otro); null si no está en tus planes (entreno rápido, completar…) */
function aixDayFind(s) { for (const p of state.plans) { const d = p.days.find(x => x.id === s.dayId); if (d) return d; } return null; }
/* Ejercicios hechos en lugar de uno del plan: { nombre: { of, guess } }. `of` se guarda al terminar (exportar.js);
   en sesiones viejas se deduce solo si hay un único faltante del plan con el mismo músculo principal. */
function aixSubsOf(s) {
  const out = {}, d = aixDayFind(s); s.exercises.forEach(e => { if (e.of && e.of !== e.name) out[e.name] = { of: e.of }; });
  if (!d) return out;
  const plan = d.exercises.map(e => e.name), done = s.exercises.map(e => e.name), used = Object.keys(out).map(k => out[k].of);
  const mus = n => { const x = libFind(n); return x ? catMain(x) : null; };
  const miss = plan.filter(n => done.indexOf(n) < 0 && used.indexOf(n) < 0), extra = done.filter(n => plan.indexOf(n) < 0 && !out[n]);
  extra.forEach(n => { const m = mus(n); if (!m || m === 'full') return; const c = miss.filter(p => mus(p) === m), e2 = extra.filter(x => mus(x) === m); if (c.length === 1 && e2.length === 1) out[n] = { of: c[0], guess: 1 }; });
  return out;
}
const aixSubTxt = u => u ? ` (${u.guess ? 'parece que ' : ''}en lugar de ${u.of})` : '';
function aixSessLine(s, o) {
  const d = new Date(s.date), u = aixU(), day = o && o.day ? `DÍA ${WDL[d.getDay()].toUpperCase()} · ${dk(d)}` : `${dk(d)} ${WD[d.getDay()]}`;
  const head = `${day} · ${s.gymName || gymName(sGym(s))} · ${s.dayName} · ${s.planId === 'quick' ? 'entreno rápido' : (KINDS[sKind(s)] || '').toLowerCase()}${s.durationSec ? ' · ' + Math.round(s.durationSec / 60) + ' min' : ''}${s.edited ? ' · editada' : ''}${s.live ? ' · en curso' : ''}`;
  const subs = aixSubsOf(s);
  const ex = s.exercises.map(e => {
    const bar = BAR_DEFAULT[e.name] ? ` (${u} en discos + barra ${fmtKg(BAR_DEFAULT[e.name])})` : '', r = aixRest(s, e);
    return `- ${e.name}${aixSubTxt(subs[e.name])}${bar}: ${e.sets.length ? e.sets.map(x => ddSetTxt(x, e)).join(', ') : 'sin series'}${r ? ' · descanso ' + r : ''}${e.note ? ' · nota: ' + e.note.replace(/\s+/g, ' ') : ''}`;
  });
  return head + '\n' + ex.join('\n') + (s.note ? '\nNota de la sesión: ' + s.note : '');
}
const aixDayTxt = d => `- ${WDL[d.weekday]} · ${d.name} (${KINDS[d.kind || kindOfName(d.name)] || ''}): ` +
    d.exercises.map(e => `${e.name} ${e.sets}×${reps(e)}${+e.weight ? ' ' + fmtKg(+e.weight) + ' ' + aixU() : ''}${e.rest ? ' desc ' + aixSec(e.rest) : ''}`).join('; ');
function aixPlanTxt() {
  const plan = activePlan(); if (!plan) return 'Sin plan activo.';
  return `${plan.name} (${gymName(plan.gymId)})\n` + plan.days.map(aixDayTxt).join('\n');
}
/* Varios días agrupados por su plan ("· plan activo" en el actual) */
function aixDaysTxt(days) {
  if (!days.length) return 'Sin plan activo.';
  const act = activePlan(), by = [];
  days.forEach(d => { const p = state.plans.find(x => x.days.indexOf(d) >= 0); let g = by.find(x => x.p === p); if (!g) by.push(g = { p, days: [] }); g.days.push(d); });
  return by.map(g => `${g.p ? g.p.name : 'Rutina'} (${gymName(g.p && g.p.gymId)})${g.p && g.p === act ? ' · plan activo' : ''}\n` + g.days.map(aixDayTxt).join('\n')).join('\n');
}
function aixRecords(list) {
  const best = {};
  list.forEach(s => { if (s.approx) return; s.exercises.forEach(e => e.sets.forEach(x => { const bar = BAR_DEFAULT[e.name] || 0, v = e1rm((+x.w || 0) + bar, +x.r || 0); if (!best[e.name] || v > best[e.name].v) best[e.name] = { v, x, d: s.date }; })); });
  return Object.keys(best).sort().map(n => `- ${n}: mejor serie ${fmtKg(+best[n].x.w || 0)}×${best[n].x.r} (${fmtDate(best[n].d)}) · 1RM estimado ${fmtKg(Math.round(best[n].v))} ${aixU()}${BAR_DEFAULT[n] ? ' (con la barra)' : ''}`).join('\n');
}
function aixWeeks(from) {
  const out = [], now = new Date();
  for (let off = 0; off < 60; off++) {
    const W = weekSets(off); if (from && W.ws.getTime() + 7 * 864e5 < from) break;
    if (!W.n) { if (!from && off > 0 && !state.sessions.some(s => new Date(s.date) < W.ws)) break; continue; }
    out.push(`- Semana del ${fmtDate(W.ws.toISOString())} (${W.n} sesiones): ` + MM_MAIN.map(k => `${zoneName(k)} ${Math.round(W.sets[k] * 2) / 2}`).join(', '));
  }
  return out.reverse().join('\n');
}
function aixStreak() { try { const s = streakInfo(); return `${s.count} entrenos seguidos en ${s.weeks} semanas cumpliendo la meta de ${s.target} por semana (mejor racha: ${s.best}); esta semana ${s.thisWeek}.`; } catch (e) { return ''; } }

/* ---------- 3. Prompts de coach ---------- */
const AIX_DEF = {
  /* I1 (24-oct-2026): lo que se pide va al final ("LO QUE TE PIDO", con el objetivo y el tipo de sesión) */
  day: `Actúa como mi entrenador personal experto en hipertrofia y fuerza, con criterio basado en evidencia. Abajo van mis datos, mi sesión y, al final, lo que te pido. Sé directo y breve.`,
  week: `Actúa como mi entrenador personal experto en hipertrofia y fuerza, con criterio basado en evidencia. Abajo van mis datos, mi rutina, mis sesiones de la semana y, al final, lo que te pido. Sé directo y breve.`,
  all: `Actúa como mi entrenador personal experto en hipertrofia y fuerza. Analiza mi historial de {período}:
1. Tendencia general: fuerza y volumen a lo largo del tiempo, mejores y peores etapas.
2. Por músculo y por ejercicio principal: progreso real (1RM estimado), estancamientos largos y desequilibrios.
3. Constancia: frecuencia, pausas y cómo me afectaron.
4. Tiempos: duración media de mis sesiones y descansos; qué ajustar.
5. Qué está funcionando y qué no en mi rutina actual.
6. Recomendaciones para las próximas 4-6 semanas: cambios de ejercicios, volumen, rangos de reps, descansos y cuándo hacer descarga.
Mi objetivo es {objetivo}. Considera mi edad ({edad}), mi peso ({peso}) y mis molestias ({molestias}). Sé concreto y prioriza.`,
};
const aixTpl = k => { const t = (state.settings.aiP || {})[k]; return t && t.trim() ? t : AIX_DEF[k]; };
/* Llena los {}; si falta un dato se quita la frase entera (en "Considera mi edad (…), mi peso (…) y …" solo esa parte) */
function aixFill(tpl, v) {
  const val = { objetivo: v.goal, molestias: v.inj, 'días por semana': v.days || '', gym: v.gym, 'período': v.per || '', edad: v.age ? v.age + ' años' : '', peso: v.kg ? fmtKg(v.kg) + ' kg' : '' };
  const has = k => val[k] != null && String(val[k]).trim() !== '';
  return tpl.split('\n').map(line => line.replace(/[^.!?\n]*[.!?]?/g, sen => {
    const ks = (sen.match(/\{([^}]+)\}/g) || []).map(x => x.slice(1, -1)); if (!ks.length) return sen;
    if (ks.every(has)) return sen.replace(/\{([^}]+)\}/g, (m, k) => val[k]);
    const m = sen.match(/^(\s*Considera )(.+?)(\.?)$/);
    if (m && ks.length > 1) {   // lista: quita solo las partes sin dato
      const items = m[2].split(/,\s*|\s+y\s+/).filter(it => { const k = (it.match(/\{([^}]+)\}/) || [])[1]; return !k || has(k); }).map(it => it.replace(/\{([^}]+)\}/g, (x, k) => val[k]));
      if (!items.length) return '';
      return m[1] + (items.length > 1 ? items.slice(0, -1).join(', ') + ' y ' + items[items.length - 1] : items[0]) + (m[3] || '.');
    }
    return '';
  }).replace(/\s{2,}/g, ' ').replace(/\s+$/, '')).filter((l, i, a) => l.trim() || (a[i - 1] && a[i - 1].trim())).join('\n').trim();
}

/* ---------- 4. Formato obligatorio ---------- */
/* Un solo bloque de código; dentro, antes de cada tabla, la línea "DÍA: nombre" (18-oct-2026: algunas IA
   dejaban el título fuera del bloque y su botón Copiar lo perdía). Sin días = para importar rutinas nuevas. */
const aixWdUp = d => WDL[d.weekday].toUpperCase();
/* Tipo de un día de la rutina (fuerza o bombeo) y su etiqueta en el formato: "LUNES (FUERZA): nombre" */
const aixDayKind = d => (d ? d.kind || kindOfName(d.name) : null);
const aixKindUp = k => (KINDS[k] || KINDS.fuerza).toUpperCase();
/* `o.dia`: la línea empieza con "DÍA " ("DÍA LUNES (FUERZA): nombre"), como en la exportación de la semana */
function aixFormat(days, o) {
  days = (days || []).filter(Boolean); const u = aixU(), D = o && o.dia ? 'DÍA ' : '';
  const X = (o && o.extra) || {}, names = d => d.exercises.map(e => e.name).concat(X[d.id] || []).join(', ');
  const list = !days.length ? '' : days.length === 1 ? names(days[0]) : days.map(d => `${aixWdUp(d)} (${aixKindUp(aixDayKind(d))}): ${d.name} → ${names(d)}`).join('; ');
  const exTxt = list ? `Ejercicio: nombre EXACTO de esta lista ${list}, igual en todas sus filas; si es nuevo, nombre completo con el equipo.`
    : 'Ejercicio: nombre completo con el equipo (por ejemplo "Prensa 45°" o "Remo Sentado con Cable"), igual en todas sus filas.';
  const one = days.length === 1 ? ` (aquí: ${D}${aixWdUp(days[0])} (${aixKindUp(aixDayKind(days[0]))}): ${days[0].name})` : '';
  const pat = D ? `'DÍA LUNES (TIPO): nombre' (con LUNES, MARTES, MIÉRCOLES, JUEVES, VIERNES, SÁBADO o DOMINGO` : `'DÍA (TIPO): nombre' (DÍA: LUNES, MARTES, MIÉRCOLES, JUEVES, VIERNES, SÁBADO o DOMINGO`;
  return `FORMATO OBLIGATORIO (lo lee mi app automáticamente):
Al final, UN SOLO bloque de código con todo lo que debo importar. Dentro del bloque, antes de cada tabla, una línea con el día, el tipo de sesión y el nombre de la rutina: ${pat}; TIPO: FUERZA o BOMBEO, el de ese día en mi rutina)${one}. Debajo, el encabezado exacto 'Ejercicio | Peso | Reps | RIR | Descanso' y una fila por SERIE en el orden en que se hacen. ${exTxt} Peso: solo el número en ${u} (0 = peso corporal; mancuernas = una). Reps: número o rango. RIR: 0 a 4. Descanso: segundos. Una línea en blanco entre días. Nada de texto, notas, emojis ni negritas dentro del bloque. ${o && o.scope === 'day' ? 'Es para la sesión del día: un solo día (el próximo de esa rutina).' : o && o.scope === 'week' ? 'Es para la semana: un bloque con todos los días de la lista.' : 'Para la sesión del día: un solo día (el próximo de esa rutina). Para la semana: un bloque con todos los días de la rutina activa.'}
Ejemplo:
\`\`\`
${D}LUNES (FUERZA): Piernas + Torso (Pesado)
Ejercicio | Peso | Reps | RIR | Descanso
Prensa 45° | 180 | 12 | 2 | 150
Prensa 45° | 180 | 12 | 1 | 150

${D}MIÉRCOLES (BOMBEO): Full Body (Bombeo)
Ejercicio | Peso | Reps | RIR | Descanso
Hip Thrust | 45 | 12 | 2 | 120
\`\`\``;
}
const aixPlanDays = () => { const p = activePlan(); return p ? p.days.slice().sort((a, b) => ((a.weekday + 6) % 7) - ((b.weekday + 6) % 7)) : []; };
function aixDayOf(s) { for (const p of state.plans) { const d = p.days.find(x => x.id === s.dayId); if (d) return d; } const p = activePlan(); return p ? nextDay(p) : null; }

/* ---------- 5. Los tres textos ---------- */
const aixHead = (k, per) => aixFill(aixTpl(k), Object.assign(aixProfile(), { per }));
/* Último peso: el último pesaje de Perfil → Cuerpo (con su fecha) o el de Tus datos */
function aixLastKg() {
  try { const w = (body().w || []).filter(x => +x.kg).slice().sort((a, b) => a.d.localeCompare(b.d)), x = w[w.length - 1]; if (x) return { kg: +x.kg, d: x.d }; } catch (e) {}
  const p = state.settings.prof || {}; return +p.kg ? { kg: +p.kg } : null;
}
function aixDatos() {
  const v = aixProfile(), L = aixLastKg(), parts = [v.age ? v.age + ' años' : '', L ? `último peso ${fmtKg(Math.round(L.kg * 10) / 10)} kg${L.d ? ' (' + fmtDate(L.d + 'T12:00:00') + ')' : ''}` : '', v.cm ? v.cm + ' cm' : '', v.goal ? 'objetivo: ' + v.goal : '', v.inj ? 'molestias: ' + v.inj : ''].filter(Boolean);
  return parts.length ? 'MIS DATOS: ' + parts.join(' · ') : '';
}
/* ---------- Lo que se pide al final: objetivo de Tus datos (o que la IA lo pregunte) y el tipo de sesión ---------- */
const AIX_KIND_TIP = {
  fuerza: 'rangos de 6-10 reps con RIR 1-3, descansos de 2-3 min en los compuestos y subir el peso cuando completes el rango; prioriza la técnica y la carga de los ejercicios principales',
  bombeo: 'rangos de 10-15 reps (más en aislamientos) con RIR 0-2, descansos de 60-90 s y progresar primero en reps o series y luego en peso; drop sets o superseries solo si encajan',
};
const aixKindLow = k => (KINDS[k] || KINDS.fuerza).toLowerCase();
function aixGoalLine(goal) {
  return goal ? `Mi objetivo: ${goal}.` : 'Aún no te dije mi objetivo: pregúntamelo antes de recomendarme (ganar músculo, fuerza, bajar grasa, salud…) y no lo supongas.';
}
function aixAskDay(list, d) {
  const v = aixProfile(), s = list[0] || {}, k = sKind(s), kd = aixDayKind(d), live = list.some(x => x.live);
  return ['LO QUE TE PIDO (sesión de ' + aixKindLow(k) + (live ? ', todavía en curso' : '') + '):',
    `1. Un análisis breve de esta sesión (máximo 5 líneas): qué progresó, qué se estancó o bajó y por qué puede ser.`,
    `2. Recomendaciones propias de una sesión de ${aixKindLow(k)}: ${AIX_KIND_TIP[k] || AIX_KIND_TIP.fuerza}.`,
    d ? `3. Los ejercicios de mi próxima sesión del ${WDL[d.weekday].toLowerCase()} (${d.name}, de ${aixKindLow(kd)}): peso, reps, RIR y descanso de cada serie, en el formato obligatorio de abajo.`
      : '3. Los ejercicios de mi próxima sesión de este tipo: peso, reps, RIR y descanso de cada serie, en el formato obligatorio de abajo.',
    aixGoalLine(v.goal), v.inj ? `Considera mis molestias: ${v.inj}.` : ''].filter(Boolean).join('\n');
}
sessionPrompt = function (list) {
  const days = []; list.forEach(s => { const d = aixDayOf(s); if (d && days.indexOf(d) < 0) days.push(d); });
  const live = list.some(s => s.live);
  return [aixHead('day'), aixDatos(), `MI SESIÓN${live ? ' (en curso: solo lo hecho hasta ahora)' : ''} (peso×reps por serie, @ = reps en reserva, ↓ = drop set, pesos en ${aixU()}):`, list.map(s => aixSessLine(s)).join('\n\n'), aixAskDay(list, days[0]), aixFormat(days.slice(0, 1), { scope: 'day', extra: aixDoneExtra(list) })].filter(Boolean).join('\n\n');
};
/* (24-oct-2026) "Copiar" y "Compartir" del reporte y del resumen semanal copian solo eso; el texto completo para la IA
   es "Exportar semana para IA" (aixWeekText, exportar.js) */
function aixAllText(per) {
  const from = aixFrom(per), P = AIX_PER.find(x => x[0] === per) || AIX_PER[1];
  const list = state.sessions.filter(s => !from || new Date(s.date).getTime() >= from).slice().sort((a, b) => a.date.localeCompare(b.date));
  const txt = [aixHead('all', P[1].toLowerCase()), aixDatos(), 'MI PLAN ACTUAL:\n' + aixPlanTxt(),
    list.length ? `MIS SESIONES (${list.length}, ${P[1].toLowerCase()}; peso×reps por serie, @ = reps en reserva, ↓ = drop set, pesos en ${aixU()}):\n` + list.map(aixSessLine).join('\n\n') : 'Aún no tengo sesiones registradas en este período.',
    list.length ? 'RÉCORDS Y 1RM ESTIMADO:\n' + aixRecords(list) : '', list.length ? 'SERIES POR MÚSCULO Y SEMANA (meta 10-20):\n' + aixWeeks(from) : '',
    'RACHA: ' + aixStreak(), aixFormat(aixPlanDays())].filter(Boolean).join('\n\n');
  return { txt, n: list.length };
}
nsAskText = function (d) { return aixFormat(d ? [d] : [], d ? { scope: 'day' } : null); };
/* Nombres hechos que no están en el día de su rutina (con el ejercicio que reemplazaron): { díaId: [texto] } */
function aixDoneExtra(list) {
  const ex = {};
  list.forEach(s => { const d = aixDayFind(s); if (!d) return; const subs = aixSubsOf(s);
    s.exercises.forEach(e => { if (d.exercises.some(x => x.name === e.name)) return; const L = ex[d.id] = ex[d.id] || [];
      if (!L.some(t => t === e.name || t.indexOf(e.name + ' (') === 0)) L.push(e.name + aixSubTxt(subs[e.name])); }); });
  return ex;
}
/* Días de la exportación de la semana: los de las rutinas que usaste (aunque sean de otro plan) y los del plan activo */
function aixWeekDays(W) {
  const out = [], add = d => { if (d && out.indexOf(d) < 0) out.push(d); };
  W.list.forEach(s => add(aixDayFind(s))); aixPlanDays().forEach(add);
  return out.sort((a, b) => ((a.weekday + 6) % 7) - ((b.weekday + 6) % 7));
}
/* ---------- Exportar semana (I1): de lunes a domingo, el día en cada bloque y la próxima semana importable ---------- */
function aixWeekOf(off) {
  const ws = weekStartOf(new Date()); ws.setDate(ws.getDate() - 7 * off); const we = new Date(ws); we.setDate(we.getDate() + 7);
  const list = state.sessions.filter(s => { const t = new Date(s.date); return t >= ws && t < we; }).slice().sort((a, b) => a.date.localeCompare(b.date));
  return { off, ws, we, key: dk(ws), list };
}
function aixWeekText(off) {
  const W = aixWeekOf(off), v = aixProfile(), days = aixWeekDays(W), last = new Date(W.we.getTime() - 864e5), kinds = [];
  days.forEach(d => { const k = aixDayKind(d); if (kinds.indexOf(k) < 0) kinds.push(k); });
  let sets = ''; try { const S = weekSets(off); sets = MM_MAIN.map(k => `${zoneName(k)} ${Math.round(S.sets[k] * 2) / 2}`).join(', '); } catch (e) {}
  const ask = [`LO QUE TE PIDO (semana del lunes ${fmtDate(W.ws.toISOString())} al domingo ${fmtDate(last.toISOString())}):`,
    '1. Un análisis breve de la semana (máximo 6 líneas): constancia, volumen por músculo y qué progresó, se estancó o bajó.',
    '2. Recomendaciones para la próxima semana según el tipo de cada día: ' + (kinds.length ? kinds : ['fuerza', 'bombeo']).map(k => `en los de ${aixKindLow(k)}, ${AIX_KIND_TIP[k] || AIX_KIND_TIP.fuerza}`).join('; ') + '.',
    days.length ? `3. Mis sesiones de la próxima semana, día por día según mi rutina (${days.map(d => `${aixWdUp(d)} (${aixKindUp(aixDayKind(d))}): ${d.name}`).join('; ')}), con peso, reps, RIR y descanso de cada serie, en el formato obligatorio de abajo (lo importo como recomendación o como rutina).`
      : '3. Una propuesta de sesiones para la próxima semana, día por día, con peso, reps, RIR y descanso de cada serie, en el formato obligatorio de abajo.',
    aixGoalLine(v.goal), v.inj ? `Considera mis molestias: ${v.inj}.` : ''].filter(Boolean).join('\n');
  const txt = [aixHead('week'), aixDatos(), 'MI RUTINA (los días que usé esta semana y mi plan activo):\n' + aixDaysTxt(days),
    W.list.length ? `MIS SESIONES DE LA SEMANA (${W.list.length}; peso×reps por serie, @ = reps en reserva, ↓ = drop set, pesos en ${aixU()}):\n` + W.list.map(s => aixSessLine(s, { day: 1 })).join('\n\n') : 'Esa semana no registré sesiones.',
    sets && W.list.length ? 'SERIES POR MÚSCULO ESA SEMANA (meta 10-20): ' + sets : '',
    ask, aixFormat(days, { dia: 1, scope: 'week', extra: aixDoneExtra(W.list) })].filter(Boolean).join('\n\n');
  return { txt, n: W.list.length, W };
}

/* ---------- 6. Hoja "Exportar todo para tu IA" ---------- */
const AIX_LONG = 6000;
function aixOpenClaude(txt) {
  if (txt.length <= AIX_LONG) { nsCopy(txt); toast('Abriendo Claude… (también quedó copiado)'); setTimeout(() => openExt('https://claude.ai/new?q=' + encodeURIComponent(txt)), 300); return; }
  nsCopy(txt).then(ok => { toast(ok ? 'Texto copiado: pégalo en Claude y envíalo.' : 'No se pudo copiar: usa Guardar .txt.'); setTimeout(() => openExt('https://claude.ai/new'), 400); });
}
function aixShare(title, txt) {
  const S = typeof CAP !== 'undefined' && CAP && CAP.Share;
  if (S) S.share({ title, text: txt }).catch(() => {});
  else if (navigator.share) navigator.share({ title, text: txt }).catch(() => {});
  else nsCopy(txt).then(ok => toast(ok ? 'Copiado: pégalo en tu IA o en WhatsApp.' : 'No se pudo compartir.'));
}
function aixSaveTxt(txt) {
  const name = 'forja-para-tu-ia-' + dk(new Date()) + '.txt', C = typeof CAP !== 'undefined' ? CAP : null;
  if (C && C.Filesystem && C.Share) {
    C.Filesystem.writeFile({ path: name, data: txt, directory: 'CACHE', encoding: 'utf8' })
      .then(r => C.Share.share({ title: 'Mis datos de Forja', files: [r.uri], dialogTitle: 'Guardar o enviar el archivo' }))
      .catch(e => { if (!/cancel/i.test(String(e && (e.message || e)))) toast('No se pudo guardar el archivo.'); });
    return;
  }
  try { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'text/plain;charset=utf-8' })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); toast('Archivo guardado.'); } catch (e) { toast('No se pudo guardar el archivo.'); }
}
function aixSheet() {
  const per = state.aixPer || '3m', R = aixAllText(per), long = R.txt.length > AIX_LONG;
  openSheet(`<div class="row"><h2 class="grow">Exportar todo para tu IA</h2><button class="icon-btn" data-act="sheet-close" aria-label="Cerrar">${ic('x', 18)}</button></div>
    <div class="muted" style="font-size:12.5px">Tus datos, tu plan, cada sesión con sus series y descansos, récords, series por músculo y tu racha, con instrucciones de coach. Al final le pide la tabla que lee "Importar recomendación". No incluye tu correo ni tu cuenta.</div>
    <div class="gymbar">${AIX_PER.map(p => `<button class="gchip ${p[0] === per ? 'on' : ''}" data-aix="per" data-v="${p[0]}">${p[1]}</button>`).join('')}</div>
    ${R.n ? '' : '<div class="card aix-empty">Aún no tienes entrenamientos en este período. El texto lleva tus datos y tu plan para que la IA te ayude a empezar; cuando registres sesiones, saldrán aquí.</div>'}
    <div class="aix-meta muted">${R.n} ${R.n === 1 ? 'sesión' : 'sesiones'} · ${R.txt.length.toLocaleString('es-PE')} caracteres${long ? ' · largo: Claude lo recibe pegado' : ''}</div>
    <pre class="aix-pre">${esc(R.txt.slice(0, 1500))}${R.txt.length > 1500 ? '\n…' : ''}</pre>
    <button class="btn primary block" data-aix="claude">${ic('sparkles', 16)} Analizar con Claude</button>
    <div class="dd-acts"><button class="btn small" data-aix="share">${ic('share-2', 15)} Compartir</button><button class="btn small" data-aix="copy">${ic('copy', 15)} Copiar</button>${long ? `<button class="btn small" data-aix="txt">${ic('download', 15)} Guardar .txt</button>` : ''}</div>
    <div class="muted" style="font-size:11.5px">"Compartir" te deja elegir ChatGPT, Gemini, WhatsApp o tu entrenador.</div>`);
}

/* ---------- 7. Ajustes → Coach IA ---------- */
const AIX_NAMES = [['day', 'Sesión del día'], ['week', 'Semana'], ['all', 'Todo el historial']];
function aixCard() {
  const S = state.settings.aiP || {};
  return `<div class="card aix-set"><h3>Coach IA</h3>
    <div class="muted" style="font-size:12.5px">Las instrucciones que van arriba de cada exportación. {objetivo}, {molestias}, {días por semana}, {gym}, {período}, {edad} y {peso} se llenan solos; si falta un dato, esa frase no se manda. El formato obligatorio del final se agrega siempre.</div>
    <details class="aix-ed"><summary>Editar mis instrucciones para la IA</summary>
    ${AIX_NAMES.map(([k, l]) => `<label class="field"><span class="label">${l}${S[k] ? ' · editada' : ''}</span><textarea class="note-in aix-t" id="aix-t-${k}" rows="8">${esc(aixTpl(k))}</textarea></label>
      <div class="row" style="gap:8px"><button type="button" class="btn small" data-aix="reset" data-k="${k}">Restablecer</button><button type="button" class="btn small primary" data-aix="save" data-k="${k}">Guardar</button></div>`).join('')}</details></div>`;
}
const _vSettingsAix = vSettings;
vSettings = function () { return isWatch() ? _vSettingsAix() : _vSettingsAix() + aixCard(); };
if (typeof SET_ORDER !== 'undefined') { SET_ORDER.push(['aix-set', 3.6]); SET_ORDER.sort((a, b) => a[1] - b[1]); }
try { SET_GRP.find(g => g[0] === 'entreno')[4].push('.aix-set'); } catch (e) {}

/* Botones "Exportar todo para tu IA" (Progreso · Semana y Perfil) y "Analizar con Claude" en los reportes semanales */
const aixBtn = () => `<button class="ai-fab-row aix-row" data-aix="open">${ic('download', 18)}<span class="grow">Exportar todo para tu IA</span>${ic('chevron-right', 16)}</button>`;
const _renderAix = render;
render = function () {
  _renderAix();
  if (isWatch() || state.draft && !state.sessMin) return;
  const app = document.getElementById('app'); if (!app || app.querySelector('.aix-row')) return;
  if (state.tab === 'progress' && (state.progSub || 'semana') === 'semana') { const ai = app.querySelector('.ai-fab-row'); if (ai) ai.insertAdjacentHTML('afterend', aixBtn()); else app.insertAdjacentHTML('beforeend', aixBtn()); }
  else if (state.tab === 'profile') { const st = app.querySelector('.pf-set'); if (st) st.insertAdjacentHTML('beforebegin', aixBtn()); else app.insertAdjacentHTML('beforeend', aixBtn()); }
};
const aixClaudeBtn = k => `<button type="button" class="btn small primary" data-xp="week" data-off="${k === 's' && typeof wcSumOff === 'function' ? wcSumOff() : 0}">${ic('sparkles', 15)} Exportar semana para IA</button>`;
const _wcReportHtmlAix = wcReportHtml, _wcSumHtmlAix = wcSumHtml;
wcReportHtml = function () { return _wcReportHtmlAix.apply(this, arguments).replace('<div class="dd-acts"><button type="button" class="btn small" data-wc="share-f">', '<div class="dd-acts">' + aixClaudeBtn('f') + '<button type="button" class="btn small" data-wc="share-f">'); };
wcSumHtml = function () { return _wcSumHtmlAix.apply(this, arguments).replace('<div class="dd-acts"><button type="button" class="btn small" data-wc="share-s">', '<div class="dd-acts">' + aixClaudeBtn('s') + '<button type="button" class="btn small" data-wc="share-s">'); };

document.addEventListener('click', ev => {
  const b = ev.target.closest && ev.target.closest('[data-aix]'); if (!b) return;
  ev.preventDefault(); ev.stopPropagation();
  const a = b.dataset.aix, S = state.settings;
  if (a === 'open') aixSheet();
  else if (a === 'per') { state.aixPer = b.dataset.v; aixSheet(); }
  else if (a === 'claude') aixOpenClaude(aixAllText(state.aixPer || '3m').txt);
  else if (a === 'share') aixShare('Mis datos de Forja', aixAllText(state.aixPer || '3m').txt);
  else if (a === 'copy') nsCopy(aixAllText(state.aixPer || '3m').txt).then(ok => toast(ok ? 'Copiado: pégalo en tu IA.' : 'No se pudo copiar.'));
  else if (a === 'txt') aixSaveTxt(aixAllText(state.aixPer || '3m').txt);
  else if (a === 'save' || a === 'reset') {
    const k = b.dataset.k, P = Object.assign({}, S.aiP || {});
    if (a === 'reset') delete P[k]; else { const t = document.getElementById('aix-t-' + k); const v = t ? t.value.trim() : ''; if (v && v !== AIX_DEF[k]) P[k] = v; else delete P[k]; }
    S.aiP = P; savePlans(); render(); toast(a === 'reset' ? 'Instrucciones restablecidas.' : 'Instrucciones guardadas.');
  }
  else if (a === 'go') { const I = state.aixGo; closeSheet(); if (!I) return; nsSet(I.dayId).pick = 'ia'; savePlans(); state.aixGo = null; startSession(I.planId, I.dayId); }
}, true);
/* "Analizar con Claude" del detalle del día con texto largo: se copia y se pega */
document.addEventListener('click', ev => {
  const b = ev.target.closest && ev.target.closest('[data-dd="claude"]'); if (!b) return;
  const list = state.sessions.filter(s => dk(s.date) === b.dataset.k); if (!list.length) return;
  const txt = sessionPrompt(list); if (txt.length <= AIX_LONG) return;   // corto: lo hace daydetail.js
  ev.preventDefault(); ev.stopPropagation(); aixOpenClaude(txt);
}, true);

/* ---------- 8. Importar: bloque "RECOMENDACIÓN PARA EL PRÓXIMO …" ---------- */
/* Descanso: "90", "90 s", "1:30", "2 min", "90-120" (el alto) */
function aixRestParse(s) {
  const t = normName(String(s || '')).replace(/\s+/g, ' ').trim(); if (!t || /^[-–?]+$/.test(t)) return null;
  let m = t.match(/^(\d{1,2}):(\d{2})/); if (m) return +m[1] * 60 + +m[2];
  m = t.match(/^(\d+(?:[.,]\d+)?)\s*(?:-|–|a)\s*(\d+(?:[.,]\d+)?)\s*(min|m|s|seg|segundos|minutos)?/); if (m) { const v = parseFloat(m[2].replace(',', '.')); return Math.round(/^m/.test(m[3] || '') ? v * 60 : v); }
  m = t.match(/^(\d+(?:[.,]\d+)?)\s*(min|m|minutos?|s|seg|segundos?)?$/); if (m) { const v = parseFloat(m[1].replace(',', '.')); return Math.round(/^m/.test(m[2] || '') ? v * 60 : v); }
  return null;
}
const AIX_TITLE = /recomendacion para el proximo\s+([a-z]+)\s*:?\s*(.*)$/;
/* Línea de día del formato nuevo: "LUNES: Piernas + Torso", "DÍA LUNES: …", "**Lunes – …**", "MIÉRCOLES" */
/* Con el tipo opcional entre paréntesis (I1): "LUNES (FUERZA): …", "DÍA MIÉRCOLES (BOMBEO): …" */
const AIX_WDRE = /^(?:d[ií]a\s+)?(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)(?![a-záéíóúñ])\s*(?:\(\s*(fuerza|bombeo)\s*\)\s*)?(?:[:\-–—·|]\s*(.*?))?\s*$/i;
/* Tipo que dice el texto: la etiqueta "(FUERZA)" / "TIPO: bombeo" o una palabra del nombre ("Pesado", "Bombeo") */
const aixKindWord = s => { const n = normName(String(s || '')); return /\b(bombeo|pump|ligero)\b/.test(n) ? 'bombeo' : /\b(pesado|fuerza|heavy|strength)\b/.test(n) ? 'fuerza' : null; };
/* Nombre corto: máx. 40 letras, cortado en una palabra entera */
function aixCut(s, n) {
  s = String(s || '').replace(/^[\s:–—\-·|,.]+|[\s:–—\-·|,.]+$/g, '').replace(/\s+/g, ' ').trim(); n = n || 40;
  if (s.length <= n) return s;
  const p = s.search(/,\s|\s\(|\s[–—-]\s|;\s/); if (p >= 6 && p <= n) return s.slice(0, p).trim();   // "Pierna y glúteo, con énfasis…" → «Pierna y glúteo»
  const c = s.slice(0, n + 1), k = c.lastIndexOf(' ');
  return (k > 10 ? c.slice(0, k) : s.slice(0, n)).replace(/[\s:–—\-·|,.(]+$/, '').trim();
}
function aixDayLine(raw) {
  const t = String(raw || '').replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, ' ').replace(/[☀-➿️]/g, ' ').replace(/\*\*|__|`/g, '').replace(/^\s*(?:#+|>)\s*/, '').trim();
  const m = t.match(AIX_WDRE); if (!m || (m[3] && m[3].indexOf('|') >= 0)) return null;   // "Lunes | Prensa | …" es una fila con columna Día
  return { day: NS_DAYS.indexOf(normName(m[1])), name: aixCut(m[3] || ''), kind: m[2] ? normName(m[2]) : null };
}
/* ---------- Tablas que llegan sin "|" (al copiar en el celular): se pasan a "|" ----------
   Mismas ideas que nsParse: encabezado con palabras de columna (NS_HWORD) en una línea con tabulaciones,
   2+ espacios o un solo espacio (las cifras de cada fila se leen desde la derecha, como NS_SHAPE),
   o una celda por línea (se juntan de a tantas como columnas). `need`: solo tablas con esa columna. */
const AIX_HW = w => NS_HWORD.test(w) || /^(dia|day|rutina|enfoque|sesion|nombre)$/.test(w);
const AIX_UNIT = /^(kg|kgs|lb|lbs|s|seg|segs|segundos|min|mins|minutos|reps?|"|')$/i;
const aixNumCell = t => /^[~@]?\d/.test(t) || /^[-–?]+$/.test(t);
function aixPeel(toks, n) {   // las n últimas celdas con cifras; el resto (nombre y lo de antes) queda en `rest`
  const out = []; let i = toks.length - 1;
  while (out.length < n && i >= 0) {
    let j = i, t = toks[j];
    if (AIX_UNIT.test(t) && j > 0) { j--; t = toks[j] + ' ' + t; }
    if (j >= 2 && /^(-|–|a)$/i.test(toks[j - 1]) && /^\d/.test(toks[j - 2])) { t = toks[j - 2] + '-' + t; j -= 2; }
    if (!aixNumCell(t)) return null;
    out.unshift(t); i = j - 1;
  }
  return out.length === n && i >= 0 ? { cells: out, rest: toks.slice(0, i + 1) } : null;
}
function aixHeadOf(cells) {
  const w = cells.map(nsWords).filter(x => x && !/^\(?(kg|kgs|lb|lbs|s|seg)\)?$/.test(x));
  if (w.length < 3 || w.length > 10 || !w.every(x => x.split(' ').every(AIX_HW))) return null;
  const at = re => w.findIndex(x => re.test(x));
  const k = { name: at(/^ejercicios?$/), reps: at(/^(reps?|repeticiones)$/), n: w.length, w };
  return k.name >= 0 && k.reps >= 0 ? k : null;
}
function aixPipes(txt, need) {
  const L = String(txt || '').replace(/\r/g, '').split('\n'), out = [];
  let mode = null, H = null, buf = [];
  const row = a => '| ' + a.join(' | ') + ' |', flush = () => { buf.forEach(x => out.push(L[x.i])); buf = []; };   // con bordes: una celda vacía a la izquierda no se pierde
  const ok = h => h && (!need || h.w.some(x => need.test(x)));
  const shapeRow = l => {   // columnas antes del nombre: una palabra cada una ("Día 1" son dos)
    const toks = nsClean(l).trim().split(/\s+/), pre = [];
    let p = 0;
    /* La celda Día puede venir vacía (sigue el día de arriba): entonces tampoco hay celdas antes del nombre */
    const isDay = t => t && (/^(d[ií]a|day)$/i.test(t) || /^\d{1,2}$/.test(t) || NS_DAYS.indexOf(normName(t)) >= 0);
    const hasPre = H.name > 0 && (!/^(dia|day)$/.test(H.w[0]) || isDay(toks[0]));
    for (let c = 0; c < H.name; c++) {
      if (!hasPre) { pre.push(''); continue; }
      if (p >= toks.length) return null; let t = toks[p++]; if (/^(d[ií]a|day)$/i.test(t) && /^\d/.test(toks[p] || '')) t += ' ' + toks[p++]; pre.push(t);
    }
    const P = aixPeel(toks.slice(p), H.n - H.name - 1); if (!P) return null;
    const name = P.rest.join(' '); if (!/[a-záéíóúñ]/i.test(name)) return null;
    return pre.concat([name], P.cells);
  };
  for (let i = 0; i < L.length; i++) {
    const l = L[i], c = nsClean(l);
    if (l.indexOf('|') >= 0) { mode = null; out.push(l); continue; }
    if (!c.trim()) { if (mode !== 'v') mode = null; out.push(l); continue; }
    const cells = nsCells(c);
    if (cells.length >= 2) { const h = aixHeadOf(cells); if (ok(h)) { flush(); mode = 'c'; H = h; out.push(row(cells)); continue; } }
    else {
      const ws = c.trim().split(/\s+/), h = ws.length >= 3 ? aixHeadOf(ws) : null;
      if (ok(h)) { flush(); mode = 's'; H = h; out.push(row(ws.filter(t => !/^\(?(kg|kgs|lb|lbs|s|seg)\)?$/i.test(t)))); continue; }
      if (ws.length <= 2 && AIX_HW(nsWords(c))) {   // ¿encabezado en vertical?
        const hc = [c.trim()]; let j = i + 1;
        for (; j < L.length && hc.length < 10; j++) { const t = nsClean(L[j]).trim(); if (!t) continue; if (nsCells(t).length !== 1 || !nsWords(t).split(' ').every(AIX_HW)) break; hc.push(t); }
        const hv = hc.length >= 3 ? aixHeadOf(hc) : null;
        if (ok(hv)) { flush(); mode = 'v'; H = hv; out.push(row(hc)); i = j - 1; continue; }
      }
    }
    if (mode === 'c' && cells.length === H.n) { out.push(row(cells)); continue; }
    if (mode === 'c' && cells.length < H.n && cells.length >= H.n - H.name) {   // celdas de la izquierda vacías (Día, Rutina): con espacios no se ven
      const cs = cells.filter((x, k) => k || x), cc = Array(Math.max(0, H.n - cs.length)).fill('').concat(cs);
      if (cc.length === H.n && /[a-záéíóúñ]/i.test(cc[H.name]) && cc.slice(H.name + 1).every(aixNumCell)) { out.push(row(cc)); continue; }
    }
    if (mode === 's') { const r = shapeRow(c); if (r) { out.push(row(r)); continue; } }
    if (mode === 'v') {
      buf.push({ i, c: c.trim() });
      if (buf.length < H.n) continue;
      const v = buf.map(x => x.c), nm = v[H.name], rest = v.filter((x, k) => k > H.name);
      if (/[a-záéíóúñ]/i.test(nm) && rest.every(aixNumCell)) { out.push(row(v)); buf = []; continue; }
      i = buf[0].i; out.push(L[i]); buf = []; mode = null; continue;   // ahí terminó la tabla: esas líneas se leen de nuevo
    }
    mode = null; out.push(l);
  }
  flush();
  return out.join('\n');
}
function aixBlocks(txt) {
  txt = aixPipes(txt); // Normalizar cada tabla; una tabla antigua de un solo día sigue en nsParse.
  const L = String(txt || '').replace(/\r/g, '').split('\n'), out = [];
  let cur = null, head = null;
  const close = () => { if (cur && cur.rows.length) out.push(cur); cur = null; head = null; };
  for (let i = 0; i < L.length; i++) {
    const raw = L[i].replace(/\*\*|__/g, '').trim(), n = normName(raw).replace(/[#>]/g, '').trim();
    const tm = n.match(AIX_TITLE);
    if (tm) { close(); const wd = NS_DAYS.indexOf(tm[1]); cur = { day: wd >= 0 ? wd : null, name: raw.replace(/^.*?:\s*/, '').replace(/[`*]+/g, '').trim(), rows: [] }; continue; }
    const dl = raw && aixDayLine(raw);
    if (dl && dl.day >= 0) {
      /* El título de fuera ("RECOMENDACIÓN PARA EL PRÓXIMO LUNES") y la línea "LUNES: …" de dentro son el mismo día */
      if (cur && !cur.rows.length && !cur.untitled && (cur.day == null || cur.day === dl.day)) { cur.day = dl.day; if (dl.name) cur.name = dl.name; if (dl.kind) cur.kind = dl.kind; continue; }
      const h = head; close(); head = h;   // un mismo encabezado puede valer para varios días
      cur = { day: dl.day, name: dl.name, kind: dl.kind, rows: [] }; continue;
    }
    if (!raw || /^`{3}/.test(raw)) continue;
    const tk = n.match(/^tipo\s*:?\s*(fuerza|bombeo)\b/); if (tk) { if (cur) cur.kind = tk[1]; continue; }   // "TIPO: FUERZA" debajo del día
    if (raw.indexOf('|') < 0) { if (cur && cur.rows.length && head) close(); continue; }
    const c = nsCells(nsClean(raw)); if (!c.length) continue;
    const H = nsWords(c.join(' '));
    if (/ejercicio/.test(H) && /peso/.test(H) && /rep/.test(H)) {
      const w = c.map(nsWords); head = { name: w.findIndex(x => /^ejercicio/.test(x)), w: w.findIndex(x => /^(peso|carga)/.test(x)), r: w.findIndex(x => /^rep/.test(x)), rir: w.findIndex(x => /^rir/.test(x)), rest: w.findIndex(x => /^descanso/.test(x)), n: w.findIndex(x => /^(series|sets)$/.test(x)) };
      if (!cur) cur = { day: null, name: '', rows: [], untitled: 1 };
      cur.legacy = head.rest < 0;
      continue;
    }
    if (!cur || !head) continue;
    const r = nsRow(c[head.name], c[head.w], c[head.r], head.rir >= 0 ? c[head.rir] : null, head.n >= 0 ? c[head.n] : null);
    if (!r) continue;
    if (head.rest < 0) {
      cur.legacy = true;
      const last = cur.rows[cur.rows.length - 1];
      if (last && normName(last.raw) === normName(r.raw)) {
        const expand = x => x.sets || Array.from({ length: x.rir ? x.rir.length : x.n || 1 }, (_, i) => ({ w: x.w, rMin: x.rMin, rMax: x.rMax, rir: x.rir ? x.rir[i] : x.rirAll }));
        last.sets = expand(last).concat(expand(r));
      } else cur.rows.push(r);
      continue;
    }
    const rir = r.rir ? r.rir[0] : r.rirAll, rest = head.rest >= 0 ? aixRestParse(c[head.rest]) : null;
    const last = cur.rows[cur.rows.length - 1], set = { w: r.w, rMin: r.rMin, rMax: r.rMax, rir: rir == null ? null : rir, rest };
    if (last && normName(last.raw) === normName(r.raw)) last.sets.push(set);
    else cur.rows.push({ raw: r.raw, w: r.w, rMin: r.rMin, rMax: r.rMax, rir: null, rirAll: null, n: null, sets: [set] });
  }
  close();
  /* Sin título: solo cuenta si la tabla tiene la columna Descanso o va en un bloque de código (si no, lo lee nsParse como siempre) */
  const blocks = out.filter(b => !b.untitled || /```/.test(txt) || /descanso/i.test(txt));
  blocks.forEach(b => { if (!b.kind) b.kind = aixKindWord(b.name); });   // sin etiqueta: "Pesado" / "Bombeo" en el nombre
  return blocks.length > 1 ? blocks : blocks.filter(b => !b.legacy);
}
const _nsParseAix = nsParse;
nsParse = function (txt) {
  const B = aixBlocks(txt);
  if (B.length) return { day: B[0].day, rows: B[0].rows, bad: false, blocks: B };
  return _nsParseAix(txt);
};
/* Series por fila del bloque (peso, reps, RIR y descanso de cada una) */
const _nsRowsFromAix = nsRowsFrom;
nsRowsFrom = function (parsed, d) {
  const out = _nsRowsFromAix(parsed, d);
  out.forEach((o, i) => {
    const r = parsed.rows[i]; if (r && r.sets) o.sets = r.sets.map(s => Object.assign({}, s));
    if (!o.exId) { const x = libFind(r.raw); if (x && !d.exercises.some(e => e.name === x.name)) { o.exId = 'new:' + x.name; o.sure = false; o.isNew = 1; } }
  });
  return out;
};
/* Leer: cada bloque a su día (del título); varios días = una vista previa por día */
/* I1: con tipo (fuerza/bombeo) en el texto, solo un día de ese tipo; si el día de la semana es del otro tipo, no se guarda (`why`) */
function aixDayFor(b, sel) {
  const list = nsDays(sel.planId, sel.dayId), kOk = x => !b.kind || aixDayKind(x.d) === b.kind, same = x => normName(x.d.name) === normName(b.name);
  if (b.day != null) {
    const wd = list.filter(x => x.d.weekday === b.day), hit = wd.find(x => same(x) && kOk(x)) || wd.find(kOk);
    if (hit) return hit;
    if (wd.length) return { why: aixKindWhy(b.kind, wd[0].d) };
  }
  if (b.name) { const x = list.find(y => same(y) && kOk(y)); if (x) return x; }
  return null;
}
const aixKindWhy = (k, d) => `el ${WDL[d.weekday].toLowerCase()} de tu rutina es de ${aixKindLow(aixDayKind(d))} y esta recomendación es de ${aixKindLow(k)}`;
/* Tipo que dice un texto sin bloques (tablas viejas): uno solo en los títulos o líneas de día; si no, null */
function aixKindOfTxt(txt) {
  const ks = []; String(txt || '').split('\n').forEach(l => { const n = normName(l.replace(/[*_#`>]/g, '')).trim(); if (!n || n.indexOf('|') >= 0) return;
    const dl = aixDayLine(l), k = dl && dl.day >= 0 ? (dl.kind || aixKindWord(dl.name)) : /^tipo\s*:?\s*(fuerza|bombeo)\b/.test(n) || AIX_TITLE.test(n) ? aixKindWord(n) : null;
    if (k && ks.indexOf(k) < 0) ks.push(k); });
  return ks.length === 1 ? ks[0] : null;
}
const aixRowsLabel = b => (b.day != null ? WDL[b.day] : '') + (b.name ? (b.day != null ? ' · ' : '') + b.name : '');
const _nsReadAix = nsRead;
nsRead = function () {
  const txt = ($('#ns-txt') || {}).value || '', sel = (($('#ns-day') || {}).value || '').split('|');
  const S = { planId: sel[0], dayId: sel[1] }, selD = findDay(S.planId, S.dayId).d, err = $('#ns-txt-e');
  const B = aixBlocks(txt);
  if (!B.length) {   // tabla vieja: el día lo eliges tú; si el texto es del otro tipo, no se lee
    const k = aixKindOfTxt(txt);
    if (k && selD && aixDayKind(selD) !== k) { if (err) { err.textContent = `La recomendación es de ${aixKindLow(k)} y el ${WDL[selD.weekday].toLowerCase()} (${selD.name}) es de ${aixKindLow(aixDayKind(selD))}. Elige un día de ${aixKindLow(k)} en «Para el día»: solo se aplica a días del mismo tipo.`; err.hidden = false; } return; }
    state.nsEd = null; _nsReadAix();
    if (state.nsEd) { state.nsEd.kind = aixDayKind(findDay(state.nsEd.planId, state.nsEd.dayId).d); state.nsEd.kindTxt = !!k; nsEditSheet(); }
    return;
  }
  const skip = [], skipK = [];
  const q = B.map((b, i) => {
    let m = aixDayFor(b, S);
    if (!m && i === 0 && selD) m = !b.kind || aixDayKind(selD) === b.kind ? { p: { id: S.planId }, d: selD } : { why: aixKindWhy(b.kind, selD) };
    if (m && m.why) { skipK.push(`${aixRowsLabel(b) || 'Sin día'}: ${m.why}`); return null; }
    if (!m || !m.d) { skip.push(aixRowsLabel(b)); return null; }
    return { planId: m.p.id, dayId: m.d.id, rows: nsRowsFrom({ rows: b.rows }, m.d), title: b.name, kind: aixDayKind(m.d), kindTxt: !!b.kind };
  }).filter(Boolean);
  if (!q.length) {
    if (skipK.length && err) { err.textContent = 'No guardé nada: ' + skipK.join('; ') + '. Solo se aplica a días del mismo tipo.'; err.hidden = false; return; }
    return _nsReadAix();
  }
  state.aixQ = q.slice(1).map(x => Object.assign(x, { skipK: [] })); state.aixDone = [];
  state.nsEd = Object.assign({}, q[0], { n: q.length, k: 1, skip, skipK }); nsEditSheet();
};
/* Vista previa: cada serie con peso, reps, RIR y descanso; un ejercicio nuevo se agrega solo para esa sesión */
nsEditSheet = function () {
  const E = state.nsEd; if (!E) return;
  const { d } = findDay(E.planId, E.dayId); if (!d) return closeSheet();
  const used = {}; E.rows.forEach(r => { if (r.exId && r.exId !== 'skip') used[r.exId] = 1; });
  const miss = d.exercises.filter(e => !used[e.id]), u = aixU(), co = E.src === 'coach';
  const nameOf = r => r.exId && r.exId.indexOf('new:') === 0 ? r.exId.slice(4) : (d.exercises.find(e => e.id === r.exId) || {}).name || '';
  const opts = (r, i) => {
    const x = r.raw ? libFind(r.raw) : null, nw = x && !d.exercises.some(e => e.name === x.name) ? x.name : null;
    return `<select class="ns-ex" data-ns="ex" data-i="${i}" aria-label="Ejercicio">${r.exId ? '' : '<option value="" selected>¿Cuál es? Elige…</option>'}${d.exercises.map(e => `<option value="${e.id}" ${r.exId === e.id ? 'selected' : ''}>${esc(e.name)}</option>`).join('')}${nw ? `<option value="new:${esc(nw)}" ${r.exId === 'new:' + nw ? 'selected' : ''}>+ ${esc(nw)} (agregar solo esa sesión)</option>` : ''}<option value="skip" ${r.exId === 'skip' ? 'selected' : ''}>No usar esta línea</option></select>`;
  };
  const setRow = (t, i, j) => `<div class="aix-s"><span class="aix-sn">${j + 1}</span>
    <input inputmode="decimal" data-ns="sw" data-i="${i}" data-j="${j}" value="${String(t.w).replace('.', ',')}" aria-label="Peso serie ${j + 1}">
    <input inputmode="text" data-ns="sreps" data-i="${i}" data-j="${j}" value="${t.rMin === t.rMax ? t.rMax : t.rMin + '-' + t.rMax}" aria-label="Reps serie ${j + 1}">
    <input inputmode="numeric" maxlength="1" data-ns="rir" data-i="${i}" data-j="${j}" value="${t.rir == null ? '' : t.rir}" placeholder="–" aria-label="RIR serie ${j + 1}">
    <input inputmode="numeric" data-ns="srest" data-i="${i}" data-j="${j}" value="${t.rest || ''}" placeholder="plan" aria-label="Descanso serie ${j + 1} en segundos"></div>`;
  openSheet(`<div class="row"><h2 class="grow">${co ? 'Próxima sesión (Coach)' : 'Próxima sesión'} · ${WDL[d.weekday]}</h2><button class="icon-btn" data-act="sheet-close" aria-label="Cerrar">${ic('x', 18)}</button></div>
    <div class="muted ns-help">${esc(d.name)}${E.n > 1 ? ` · día ${E.k} de ${E.n}` : ''} · ${co ? (E.edited ? 'Editada por ti' : 'Armada con tu historial, la semana del bloque y cómo llegas hoy') : E.edit ? 'Importada el ' + nsWhen(E.at) : `Leí ${E.rows.length} ${E.rows.length === 1 ? 'ejercicio' : 'ejercicios'}`}. Revisa y guarda: tu plan no cambia.</div>
    ${E.skip && E.skip.length ? `<div class="ns-dayw aix-skip" role="status">No ${E.skip.length === 1 ? 'está' : 'están'} en tu plan y no se ${E.skip.length === 1 ? 'guarda' : 'guardan'}: <b>${E.skip.map(esc).join(', ')}</b>.</div>` : ''}
    ${E.skipK && E.skipK.length ? `<div class="ns-dayw aix-skip aix-skipk" role="status">No se ${E.skipK.length === 1 ? 'guarda' : 'guardan'} (solo se aplica a días del mismo tipo): <b>${E.skipK.map(esc).join('; ')}</b>.</div>` : ''}
    ${co || E.edit ? '' : E.kindTxt ? `<div class="muted ns-help aix-kind">Recomendación de <b>${aixKindLow(E.kind || aixDayKind(d))}</b>: se aplica solo a tu ${WDL[d.weekday].toLowerCase()} de ${aixKindLow(aixDayKind(d))}.</div>`
      : `<div class="ns-dayw aix-kindw" role="status">El texto no dice si es de fuerza o de bombeo: la tomé como <b>${aixKindLow(aixDayKind(d))}</b>, el tipo de tu ${WDL[d.weekday].toLowerCase()} (${esc(d.name)}).</div>`}
    ${E.rows.map((r, i) => {
      const bad = E.tried && !r.exId;
      return `<div class="ns-ed ${r.exId === 'skip' ? 'off' : ''}" data-i="${i}">
      ${r.raw ? `<div class="ns-raw">Leído: «${esc(r.raw)}»</div>` : ''}
      ${co ? `<b class="ns-name">${esc(nameOf(r))}</b>${r.why ? `<div class="ns-why">${esc(r.why)}</div>` : ''}` : opts(r, i)}
      ${!co && r.exId && r.exId.indexOf('new:') === 0 ? '<small class="ns-ask">No está en tu rutina: se agrega solo para esa sesión (o elige otro).</small>' : !co && !r.sure && r.exId !== 'skip' ? `<small class="ns-ask ${bad ? 'bad' : ''}">${r.exId ? 'Lo elegiste tú.' : 'No estoy seguro de cuál es: elígelo.'}</small>` : ''}
      ${r.exId === 'skip' ? '' : `<div class="ns-f"><label><span>Series</span><span class="ns-n"><button type="button" class="icon-btn" data-ns="n" data-d="-1" data-i="${i}" aria-label="Menos series">−</button><b class="num">${r.sets.length}</b><button type="button" class="icon-btn" data-ns="n" data-d="1" data-i="${i}" aria-label="Más series">+</button></span></label></div>
      <div class="aix-sh muted"><span></span><span>Peso (${u})</span><span>Reps</span><span>RIR</span><span>Desc. (s)</span></div>${r.sets.map((t, j) => setRow(t, i, j)).join('')}`}
    </div>`; }).join('')}
    ${co ? (miss.length ? `<div class="muted ns-help">Sin recomendación (van como en tu plan): ${miss.map(e => esc(e.name)).join(', ')}.</div>` : '')
      : miss.map(e => `<div class="ns-ed nd"><b class="ns-name">${esc(e.name)}</b><div class="ns-raw">Sin dato: va como en tu plan (${e.sets || 3} × ${nsRepTxt({ rMin: +e.repsMin || 0, rMax: +(e.repsMax || e.repsMin) || 0 })}${e.weight ? ' · ' + String(e.weight).replace('.', ',') + ' ' + u : ''}).</div>
        <button type="button" class="ns-imp" data-ns="add" data-ex="${e.id}">${ic('plus', 15)} Poner peso, reps y RIR</button></div>`).join('')}
    <small class="pb-err" id="ns-save-e" role="alert" ${E.tried && E.rows.some(r => !r.exId) ? '' : 'hidden'}>Elige a qué ejercicio corresponde cada línea, o "No usar esta línea".</small>
    <div class="grid2">${E.edit || co ? '<button type="button" class="btn danger" data-ns="drop">Descartar</button>' : '<button type="button" class="btn" data-act="sheet-close">Cancelar</button>'}<button type="button" class="btn primary" data-ns="save">${E.n > 1 && E.k < E.n ? 'Guardar y seguir' : 'Guardar próxima sesión'}</button></div>`);
};
document.addEventListener('input', ev => {
  const t = ev.target, E = state.nsEd, k = t.dataset && t.dataset.ns; if (!E || !k || !t.closest('#sheet')) return;
  const r = E.rows[+t.dataset.i], s = r && r.sets[+t.dataset.j]; if (!s) return;
  const v = t.value.replace(',', '.');
  if (k === 'sw') s.w = parseFloat(v) || 0;
  else if (k === 'sreps') { const R = nsReps(v); if (R) { s.rMin = R.rMin; s.rMax = R.rMax; } }
  else if (k === 'srest') { const n = aixRestParse(v); s.rest = n && n >= 5 && n <= 900 ? n : null; }
});
/* Guardar: con descanso y ejercicios nuevos; luego el día siguiente o "Entrenar ahora" */
nsSaveEd = function () {
  const E = state.nsEd; if (!E) return;
  E.tried = true;
  if (E.rows.some(r => !r.exId)) { nsEditSheet(); const f = document.querySelector('#sheet .ns-ask.bad'); if (f) f.scrollIntoView({ block: 'center' }); return; }
  const { d } = findDay(E.planId, E.dayId); if (!d) return;
  const ex = E.rows.filter(r => r.exId !== 'skip').map(r => {
    const nw = r.exId.indexOf('new:') === 0, e = !nw && d.exercises.find(x => x.id === r.exId);
    return { exId: nw ? 'new' : r.exId, name: nw ? r.exId.slice(4) : e ? e.name : '', why: r.why, sets: r.sets.map(t => ({ w: +t.w || 0, rMin: t.rMin, rMax: t.rMax, rir: t.rir == null || t.rir === '' ? null : +t.rir, rest: t.rest ? +t.rest : null })) };
  });
  if (!ex.length) { toast('No quedó ningún ejercicio para guardar.'); return; }
  const n = nsSet(E.dayId);
  if (E.src === 'coach') { n.co = { at: Date.now(), base: nsKey(E.planId, E.dayId), ex }; n.pick = 'coach'; delete n.coOff; }
  else { ex.forEach(x => delete x.why); n.ia = { at: E.edit ? E.at : Date.now(), plan: E.planId, ex }; delete n.pick; }
  savePlans(); state.nsEd = null;
  (state.aixDone = state.aixDone || []).push({ planId: E.planId, dayId: E.dayId });
  const nx = (state.aixQ || []).shift();
  if (nx && E.src !== 'coach') { state.nsEd = Object.assign({}, nx, { n: E.n, k: (E.k || 1) + 1 }); nsEditSheet(); toast(`Guardada para el ${WDL[d.weekday].toLowerCase()}.`); return; }
  render();
  if (E.src === 'coach' || isWatch()) { closeSheet(); toast(`Próxima sesión (${E.src === 'coach' ? 'Coach' : 'importada'}) guardada para el ${WDL[d.weekday].toLowerCase()}.`); return; }
  const first = state.aixDone[0] || { planId: E.planId, dayId: E.dayId }, fd = findDay(first.planId, first.dayId).d || d, many = state.aixDone.length > 1;
  state.aixGo = first; state.aixDone = [];
  openSheet(`<div class="row"><h2 class="grow">Recomendación guardada</h2><button class="icon-btn" data-act="sheet-close" aria-label="Cerrar">${ic('x', 18)}</button></div>
    <div class="muted" style="font-size:13px">${many ? 'Cada día quedó con su recomendación.' : `Lista para el ${WDL[fd.weekday].toLowerCase()} (${esc(fd.name)}).`} Tu plan no cambia; al empezar ese día se usa la importada con sus pesos, reps, RIR y descansos.</div>
    <button class="btn primary block" data-aix="go">${ic('play', 16)} Entrenar ahora${many ? ` · ${WDL[fd.weekday]}` : ''}</button>
    <button class="btn block" data-act="sheet-close">Listo</button>`);
};

/* ---------- 9. Al empezar con la importada: descanso de cada ejercicio y ejercicios nuevos ---------- */
const _startSessionAix = startSession;
startSession = function (planId, dayId) {
  const r = _startSessionAix.apply(this, arguments);
  const d = state.draft; if (!d || d.dayId !== dayId || d.aixDone || !d.ns || d.ns.src !== 'ia') return r;
  d.aixDone = 1;
  const I = nsIa(dayId); if (!I) return r;
  I.ex.forEach(x => {
    const rest = (x.sets.find(t => t.rest) || {}).rest;
    let e = x.exId !== 'new' && (d.exercises.find(y => y.exId === x.exId) || d.exercises.find(y => y.name === x.name));
    if (!e && x.exId === 'new' && x.name && !d.exercises.some(y => y.name === x.name) && typeof draftExFrom === 'function') {
      e = draftExFrom(x.name); e.added = true;
      const S = x.sets;
      e.log = S.map(t => ({ w: t.w, r: null, done: false, drops: [] })); e.target = S.length;
      e.repsMin = Math.min.apply(null, S.map(t => t.rMin)); e.repsMax = Math.max.apply(null, S.map(t => t.rMax));
      e.rirT = S.map(t => t.rir); e.ns = 'ia'; e.coach = { w: S[0].w, mode: 'ns', goal: S.map(t => t.rMin), tips: [`Viene de tu IA: solo para esta sesión (no está en tu rutina).`], head: `<b>Próxima sesión (importada): ${fmtKg(S[0].w)} kg × ${nsRepTxt(S[0])}</b> · RIR ${nsRirTxt(e.rirT)}` };
      d.exercises.push(e);
    }
    if (e && rest) { e.rest = rest; e.restT = x.sets.map(t => t.rest || rest); }
  });
  saveDraft(); render();
  return r;
};
bootRender();
