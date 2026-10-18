/* ==========================================================================
   Fase 1 · Forja para todos (13-oct-2026)
   1. Bienvenida para usuarios nuevos: nombre, objetivo, experiencia, días y minutos, equipo,
      datos (edad, sexo, estatura, peso, kg/lb), molestias y cuestionario de salud (tipo PAR-Q).
   2. Generador de rutinas según objetivo, experiencia, tiempo, equipo y molestias.
   3. Plantillas listas en Rutinas y tarjeta "Tu objetivo y plan" en Ajustes.
   4. Pesas en kg o lb (los datos se convierten; el peso corporal sigue en kg).
   Las cuentas owner conservan sus datos guardados.
   ========================================================================== */
const PB_GOALS = {
  musculo: ['Ganar músculo', 'Más músculo y mejor forma física.', 'dumbbell', 'bulk'],
  fuerza: ['Ganar fuerza', 'Levantar más en los ejercicios básicos.', 'trophy', 'recomp'],
  grasa: ['Perder grasa', 'Bajar grasa sin perder músculo.', 'flame', 'cut'],
  salud: ['Salud y energía', 'Sentirte mejor, dormir mejor y moverte más.', 'heart-pulse', 'recomp'],
  mayor: ['Movilidad y equilibrio', 'Fuerza suave, articulaciones sanas y menos caídas.', 'person-standing', 'recomp'],
};
const PB_EXP = ['Nunca he entrenado', 'Menos de 6 meses', 'De 6 meses a 2 años', 'Más de 2 años'];
const PB_SINCE = ['menos de 1 mes', 'menos de 6 meses', '6 meses a 2 años', 'más de 2 años'];
const PB_EQ = {
  gym: ['Gimnasio completo', 'Máquinas, poleas, barras y mancuernas'],
  basic: ['Gimnasio básico', 'Barras, mancuernas y banco; pocas máquinas'],
  home: ['En casa con mancuernas', 'Un par de mancuernas y una silla o banco'],
  body: ['Solo mi cuerpo', 'Sin equipo, en casa o en el parque'],
};
const PB_INJ = [['knee', 'Rodilla'], ['shoulder', 'Hombro'], ['back', 'Espalda baja'], ['hip', 'Cadera'], ['wrist', 'Muñeca o codo']];
const PB_AVOID = {
  knee: /sentadilla|zancada|bulgara|hack|extension de pierna/,
  shoulder: /press militar|fondos|press frances|elevaciones frontales|press arnold|dominadas/,
  back: /peso muerto|remo con barra|sentadilla con barra|hiperextension|remo en t/,
  hip: /bulgara|zancada|sentadilla con barra/,
  wrist: /flexiones|press frances|curl con barra|fondos/,
};
/* Bienvenida: consentimiento expreso para datos de salud (Ley 29733) en el paso del cuestionario */
const PARQ = [
  '¿Algún médico te dijo que tienes un problema del corazón o presión alta?',
  '¿Sientes dolor en el pecho en reposo, en tu día a día o al hacer actividad física?',
  '¿Pierdes el equilibrio por mareos o perdiste el conocimiento en los últimos 12 meses?',
  '¿Tienes otra enfermedad crónica diagnosticada (por ejemplo diabetes o asma)?',
  '¿Tomas medicamentos para una enfermedad crónica?',
  '¿Tienes un problema de huesos, articulaciones o músculos que pueda empeorar con el ejercicio?',
  '¿Algún médico te dijo que solo hagas actividad física con supervisión médica?',
];
const PB_DAYS = { 2: [1, 4], 3: [1, 3, 5], 4: [1, 2, 4, 5], 5: [1, 2, 3, 5, 6], 6: [1, 2, 3, 4, 5, 6] };
const PB_BW = /flexiones|plancha|crunch abdominal|dominadas|fondos|puente de gluteo|peso corporal|elevacion de piernas/;

/* ---------- Ejercicios por patrón de movimiento y equipo ---------- */
const PB_SLOTS = {
  squat: { gym: ['Prensa 45°', 'Sentadilla Hack', 'Sentadilla Goblet'], basic: ['Sentadilla Goblet', 'Sentadilla con Barra', 'Prensa 45°'], home: ['Sentadilla Goblet', 'Sentadilla Búlgara'], body: ['Sentadilla con peso corporal', 'Zancadas'], str: ['Sentadilla con Barra', 'Prensa 45°'], c: 1 },
  hinge: { gym: ['Peso Muerto Rumano', 'Hip Thrust'], basic: ['Peso Muerto Rumano', 'Hip Thrust'], home: ['Peso Muerto Rumano', 'Puente de Glúteo'], body: ['Puente de Glúteo'], str: ['Peso Muerto Convencional', 'Peso Muerto Rumano'], c: 1 },
  glute: { gym: ['Hip Thrust', 'Puente de Glúteo'], basic: ['Hip Thrust', 'Puente de Glúteo'], home: ['Puente de Glúteo'], body: ['Puente de Glúteo'], c: 1 },
  quad: { gym: ['Extensión de Pierna', 'Zancadas'], basic: ['Zancadas', 'Sentadilla Búlgara'], home: ['Zancadas', 'Sentadilla Búlgara'], body: ['Zancadas'] },
  ham: { gym: ['Curl Femoral Sentado', 'Curl Femoral Tumbado'], basic: ['Peso Muerto Rumano'], home: ['Peso Muerto Rumano'], body: ['Puente de Glúteo'] },
  calf: { gym: ['Elevación de Talones de Pie', 'Elevación de Talones Sentado'], basic: ['Elevación de Talones de Pie'], home: ['Elevación de Talones de Pie'], body: ['Elevación de Talones de Pie'] },
  hpush: { gym: ['Press Banca Plano (Barra)', 'Press de Pecho en Máquina', 'Press Banca con Mancuernas'], beg: ['Press de Pecho en Máquina', 'Press Banca con Mancuernas'], basic: ['Press Banca Plano (Barra)', 'Press Banca con Mancuernas'], home: ['Press Banca con Mancuernas', 'Flexiones'], body: ['Flexiones'], str: ['Press Banca Plano (Barra)'], c: 1 },
  ipush: { gym: ['Press Inclinado con Mancuernas', 'Press Banca Inclinado (Barra)'], basic: ['Press Inclinado con Mancuernas', 'Press Banca Inclinado (Barra)'], home: ['Press Inclinado con Mancuernas'], body: [], c: 1 },
  vpush: { gym: ['Press Militar (Mancuernas)', 'Press de Pecho en Máquina'], basic: ['Press Militar (Mancuernas)', 'Press Militar con Barra'], home: ['Press Militar (Mancuernas)', 'Press Arnold'], body: [], str: ['Press Militar con Barra', 'Press Militar (Mancuernas)'], c: 1 },
  hpull: { gym: ['Remo Sentado con Cable', 'Remo en Polea Baja', 'Remo con Mancuerna a una Mano'], basic: ['Remo con Mancuerna a una Mano', 'Remo con Barra'], home: ['Remo con Mancuerna a una Mano'], body: ['Remo con Mancuerna a una Mano'], str: ['Remo con Barra', 'Remo Sentado con Cable'], c: 1 },
  vpull: { gym: ['Jalón al Pecho', 'Dominadas'], basic: ['Jalón al Pecho', 'Dominadas'], home: [], body: [], c: 1 },
  lat: { gym: ['Elevaciones Laterales'], basic: ['Elevaciones Laterales'], home: ['Elevaciones Laterales'], body: [] },
  rear: { gym: ['Face Pull', 'Pájaros (Deltoide Posterior)'], basic: ['Pájaros (Deltoide Posterior)'], home: ['Pájaros (Deltoide Posterior)'], body: [] },
  bi: { gym: ['Curl Bíceps', 'Curl Martillo'], basic: ['Curl con Barra', 'Curl Martillo'], home: ['Curl Martillo', 'Curl Concentrado'], body: [] },
  tri: { gym: ['Tríceps Polea', 'Tríceps con Cuerda'], basic: ['Press Francés', 'Extensión de Tríceps sobre la Cabeza'], home: ['Extensión de Tríceps sobre la Cabeza'], body: ['Fondos en Banco'] },
  core: { gym: ['Plancha', 'Crunch en Polea'], basic: ['Plancha'], home: ['Plancha'], body: ['Plancha'] },
  core2: { gym: ['Crunch en Polea', 'Crunch Abdominal'], basic: ['Crunch Abdominal'], home: ['Crunch Abdominal'], body: ['Crunch Abdominal'] },
};
const PB_DAY = {
  fa: ['Cuerpo completo A', ['squat', 'hpush', 'hpull', 'hinge', 'lat', 'tri', 'core']],
  fb: ['Cuerpo completo B', ['glute', 'vpush', 'vpull', 'quad', 'rear', 'bi', 'calf']],
  fc: ['Cuerpo completo C', ['squat', 'ipush', 'vpull', 'ham', 'lat', 'bi', 'core2']],
  ua: ['Torso A', ['hpush', 'hpull', 'vpush', 'vpull', 'lat', 'tri', 'bi']],
  la: ['Pierna A', ['squat', 'hinge', 'quad', 'ham', 'calf', 'core']],
  ub: ['Torso B', ['ipush', 'vpull', 'hpull', 'lat', 'rear', 'bi', 'tri']],
  lb: ['Pierna B', ['hinge', 'glute', 'squat', 'ham', 'quad', 'calf', 'core2']],
  push: ['Empuje', ['hpush', 'vpush', 'ipush', 'lat', 'tri', 'core']],
  pull: ['Tracción', ['vpull', 'hpull', 'rear', 'bi', 'core2']],
  legs: ['Pierna', ['squat', 'hinge', 'quad', 'ham', 'glute', 'calf']],
};
const PB_FILL = ['hpush', 'hpull', 'squat', 'glute', 'quad', 'core', 'core2', 'calf'];

function pbSplit(o) {
  const n = Math.max(2, Math.min(6, +o.days || 3)), big = o.exp >= 2 && (o.goal === 'musculo' || o.goal === 'fuerza');
  if (o.split === 'fb' || o.goal === 'mayor' || o.exp === 0 || n <= 3) return ['fa', 'fb', 'fc', 'fa', 'fb', 'fc'].slice(0, n);
  if (o.split === 'ppl' || (n === 6 && big)) return ['push', 'pull', 'legs', 'push', 'pull', 'legs'].slice(0, n);
  if (n === 4 || o.split === 'ul') return ['ua', 'la', 'ub', 'lb', 'ua', 'lb'].slice(0, n);
  if (n === 5) return big ? ['ua', 'la', 'push', 'pull', 'legs'] : ['ua', 'la', 'ub', 'lb', 'fc'];
  return ['ua', 'la', 'ub', 'lb', 'ua', 'lb'];
}
function pbPick(slot, o, used) {
  const S = PB_SLOTS[slot]; if (!S) return null;
  let list = (o.goal === 'fuerza' && o.exp >= 1 && S.str && (o.equip === 'gym' || o.equip === 'basic')) ? S.str
    : (o.exp <= 1 && S.beg && o.equip === 'gym') ? S.beg : (S[o.equip] || S.gym);
  list = list.filter(n => !used.includes(n) && !(o.inj || []).some(k => PB_AVOID[k] && PB_AVOID[k].test(normName(n))));
  return list[0] ? { name: list[0], c: !!S.c, slot } : null;
}
/* Series, reps y descanso según objetivo, experiencia y si es un ejercicio principal */
function pbDose(o, it, idx) {
  const g = o.goal, main = it.c && idx < 2, core = /core/.test(it.slot);
  let sets = o.exp === 0 ? 2 : o.exp === 3 && it.c ? 4 : 3;
  if (g === 'mayor') sets = 2;
  if (!it.c && o.exp <= 1) sets = Math.min(sets, 2);
  if (core) return { sets: Math.min(sets, 3), reps: /plancha/i.test(it.name) ? '20-40' : '12-15', rest: 1 };
  if (g === 'fuerza') return main ? { sets: o.exp >= 2 ? 4 : 3, reps: '4-6', rest: 3 } : it.c ? { sets, reps: '6-10', rest: 2 } : { sets, reps: '10-15', rest: 1 };
  if (g === 'musculo') return it.c ? { sets, reps: main ? '6-10' : '8-12', rest: main ? 2.5 : 2 } : { sets, reps: '10-15', rest: 1.5 };
  if (g === 'grasa') return it.c ? { sets, reps: '10-12', rest: 1.5 } : { sets, reps: '12-15', rest: 1 };
  return it.c ? { sets, reps: '10-15', rest: 1.5 } : { sets, reps: '12-15', rest: 1 };
}
const pbType = name => { const l = libFind(name); return l ? l.type : /plancha|crunch/i.test(name) ? 'Core' : P; };
function pbDayEx(o, key) {
  const budget = Math.max(20, +o.mins || 60) * 60 - 300, used = [], out = [];
  let t = 0, slots = PB_DAY[key][1].slice();
  PB_FILL.forEach(s => { if (!slots.includes(s)) slots.push(s); });
  for (const s of slots) {
    if (out.length >= 8) break;
    const it = pbPick(s, o, used); if (!it) continue;
    const d = pbDose(o, it, out.length), cost = d.sets * (45 + d.rest * 60) + 90;
    if (out.length >= 3 && (t + cost > budget || (PB_FILL.includes(s) && !PB_DAY[key][1].includes(s) && out.length >= 4))) break;
    used.push(it.name); t += cost;
    const e = E(it.name, pbType(it.name), 0, d.sets, d.reps, d.rest);
    delete e.bar;
    if ((o.equip === 'gym' || o.equip === 'basic') && BAR_DEFAULT[it.name] != null) e.bar = pbLb() ? 45 : BAR_DEFAULT[it.name];
    if (o.equip === 'body' && /mancuerna/i.test(it.name)) e.note = 'Sin mancuerna: usa una mochila o un galón de agua.';
    out.push(e);
  }
  return out;
}
function genPlan(o, name) {
  const keys = pbSplit(o), wd = PB_DAYS[keys.length] || PB_DAYS[3];
  const days = keys.map((k, i) => ({ id: 'd' + uid(), name: PB_DAY[k][0], weekday: wd[i], kind: 'fuerza', exercises: pbDayEx(o, k) }));
  const splitName = { fa: 'Cuerpo completo', ua: 'Torso / Pierna', push: 'Empuje / Tracción / Pierna' }[keys[0]] || 'Rutina';
  return { id: 'tpl-' + uid(), name: name || `${splitName} · ${keys.length} días`, auto: 1, goal: o.goal, gymId: activeGym().id, days };
}

/* ---------- Perfil del usuario ---------- */
const pbLb = () => state.settings.unit === 'lb';
function pbProf() { return state.settings.prof || null; }
function applyProf() {
  const p = pbProf() || {}, b = body();
  Object.assign(HISTORY, { name: p.name || '', age: +p.age || null, goal: (PB_GOALS[p.goal] || [''])[0], since: p.exp != null ? PB_SINCE[p.exp] || '' : '', cm: +b.h || +p.cm || null, kg: curWeight() });
  if (!b.h && p.cm) b.h = +p.cm;
  if (!b.sex && p.sex) b.sex = p.sex;
}
/* Cuenta del dueño: si por sincronización llegan valores de una instalación nueva (pub, goals vacíos,
   rutina de inicio), se corrigen en el lugar y sin recargar. `pub` se pone en 0 (no se borra): un ajuste
   borrado no se sincroniza y volvería a llegar desde la nube. */
function ownerFix() {
  const S = state.settings; if (!S.owner) return;
  let ch = false;
  if (S.pub) { S.pub = 0; ch = true; }
  if (ch) savePlans();
}
/* Compatibilidad de cuentas existentes; nunca reinsertar datos ni eliminar planes. */
if (!state.settings.pub && !state.settings.owner) { state.settings.owner = 1; savePlans(); }
ownerFix();
applyProf();
if (pubUser()) defaultPlans = () => [genPlan(Object.assign({ goal: 'salud', exp: 1, days: 3, mins: 60, equip: 'gym' }, pbProf() || {}))];

/* ---------- Bienvenida (pantalla completa, por pasos) ---------- */
const pb = { step: 0, o: null, edit: false };
const PB_STEPS = 9;
function pbStart(step, edit) {
  const p = pbProf() || {}, b = body();
  pb.o = Object.assign({ name: p.name || '', goal: null, exp: null, days: 3, mins: 60, equip: 'gym', age: '', sex: b.sex || 'm', cm: b.h || '', kg: curWeight() ? r1(curWeight()) : '', unit: state.settings.unit || 'kg', inj: [], parq: [], preg: false }, JSON.parse(JSON.stringify(p)));
  if (!p.age) pb.o.age = '';
  const o = pb.o;
  o.cmIn = o.cm === '' || o.cm == null ? '' : String(o.cm).replace('.', ',');
  o.kgIn = o.kg === '' || o.kg == null ? '' : String(o.unit === 'lb' ? r1(o.kg * PB_LB) : o.kg).replace('.', ',');
  o.kgTyped = false; pb.showErr = false;
  pb.step = step || 0; pb.edit = !!edit; pbRender();
}
function pbClose() { const el = $('#onb'); if (el) el.remove(); document.body.classList.remove('onb-open'); }
const pbChip = (on, attrs, label, sub, icon) => `<button type="button" class="pb-opt ${on ? 'on' : ''}" ${attrs}>${icon ? `<span class="pb-ic">${ic(icon, 20)}</span>` : ''}<span class="grow"><b>${label}</b>${sub ? `<small>${sub}</small>` : ''}</span>${on ? `<span class="pb-ck">${ic('check', 16)}</span>` : ''}</button>`;
function pbOk() {
  const o = pb.o;
  if (pb.step === 1) return !!o.goal;
  if (pb.step === 2) return o.exp != null;
  if (pb.step === 7) return !!o.consent;
  if (pb.step === 5) return !pbErr('age') && !pbErr('cm') && !pbErr('kg');
  return true;
}
/* Tus datos (paso 6): el peso se escribe en la unidad elegida y se guarda siempre en kg; la estatura acepta cm o metros */
const PB_LB = 2.20462;
const pbKg = (v, unit) => { const n = num(v); if (!n) return null; if (unit === 'lb') return n >= 66 && n <= 660 ? r1(n / PB_LB) : null; return n >= 30 && n <= 300 ? r1(n) : null; };
function pbErr(k) {
  const o = pb.o;
  if (k === 'age') return +o.age >= LEGAL.minAge && +o.age <= 100 ? '' : o.age !== '' && +o.age > 0 && +o.age < LEGAL.minAge ? `Forja es para personas de ${LEGAL.minAge} años o más` : 'Escribe tu edad en años, ej. 30';
  if (k === 'cm') return o.cm !== '' && o.cm != null ? '' : CM_MSG;
  if (k === 'kg') return o.kg !== '' && o.kg != null ? '' : o.unit === 'lb' ? 'Escribe tu peso en lb, ej. 165' : 'Escribe tu peso en kg, ej. 70';
  return '';
}
/* El mensaje sale al salir del campo o al tocar Siguiente; mientras escribes solo se quita si ya es válido */
function pbShowErr(k, force) {
  const el = $('#pb-e-' + k); if (!el) return;
  const raw = k === 'age' ? pb.o.age : pb.o[k + 'In'], m = pbErr(k), show = !!m && (force || pb.showErr || String(raw || '') !== '');
  if (k === 'age' && +pb.o.age > 0 && +pb.o.age < LEGAL.minAge) { el.hidden = true; return; }
  el.textContent = show ? m : ''; el.hidden = !show;
  const inp = $('#pb-' + k); if (inp) inp.setAttribute('aria-invalid', show ? 'true' : 'false');
}
function pbNextState() { const btn = $('#onb [data-pb="next"]'); if (!btn) return; if (pb.step === 5) { btn.disabled = false; btn.dataset.off = pbOk() ? 0 : 1; } else btn.disabled = !pbOk(); }
function pbBody() {
  const o = pb.o, s = pb.step;
  if (s === 0) return `<div class="pb-hero"><div class="pb-logo">${ic('dumbbell', 34)}</div><h1>Te damos la bienvenida</h1>
    <p>Tu entrenador de bolsillo. Responde unas preguntas cortas y armamos un plan para tu objetivo, tu tiempo y tu equipo.</p></div>
    <label class="pb-f"><span>¿Cómo te llamas?</span><input id="pb-name" maxlength="24" autocomplete="given-name" placeholder="Tu nombre" value="${esc(o.name || '')}"></label>
    ${pb.edit ? '' : '<button type="button" class="pb-link" data-pb="have">Ya tengo cuenta: iniciar sesión</button>'}`;
  if (s === 1) return `<h2>¿Cuál es tu objetivo principal?</h2><p class="pb-sub">Puedes cambiarlo cuando quieras.</p>
    <div class="pb-list">${Object.keys(PB_GOALS).map(k => pbChip(o.goal === k, `data-pb="set" data-k="goal" data-v="${k}"`, PB_GOALS[k][0], PB_GOALS[k][1], PB_GOALS[k][2])).join('')}</div>`;
  if (s === 2) return `<h2>¿Cuánta experiencia tienes con pesas?</h2><p class="pb-sub">Así elegimos ejercicios y volumen seguros para ti.</p>
    <div class="pb-list">${PB_EXP.map((t, i) => pbChip(o.exp === i, `data-pb="set" data-k="exp" data-v="${i}" data-n="1"`, t)).join('')}</div>`;
  if (s === 3) return `<h2>¿Cuántos días a la semana?</h2><div class="pb-pills">${[2, 3, 4, 5, 6].map(n => `<button type="button" class="pb-pill ${+o.days === n ? 'on' : ''}" data-pb="set" data-k="days" data-v="${n}" data-n="1">${n}</button>`).join('')}</div>
    ${o.exp === 0 && o.days > 3 ? '<p class="pb-note">Para empezar, 3 días bien hechos rinden más que 5 a medias. Armaremos cuerpo completo para que descanses entre sesiones.</p>' : ''}
    <h2 style="margin-top:22px">¿Cuánto tiempo por sesión?</h2><div class="pb-pills">${[30, 45, 60, 90].map(n => `<button type="button" class="pb-pill ${+o.mins === n ? 'on' : ''}" data-pb="set" data-k="mins" data-v="${n}" data-n="1">${n}<small>min</small></button>`).join('')}</div>`;
  if (s === 4) return `<h2>¿Dónde vas a entrenar?</h2><div class="pb-list">${Object.keys(PB_EQ).map(k => pbChip(o.equip === k, `data-pb="set" data-k="equip" data-v="${k}"`, PB_EQ[k][0], PB_EQ[k][1], { gym: 'dumbbell', basic: 'layers', home: 'user', body: 'person-standing' }[k])).join('')}</div>`;
  if (s === 5) return `<h2>Tus datos</h2><p class="pb-sub">Sirven para calcular calorías, proteína y tu nivel de fuerza. Se guardan en tu cuenta.</p>
    <div class="pb-grid pb-data">${[['age', 'Edad', 'años', 'numeric', 3, o.age, '30'], ['cm', 'Estatura', 'cm', 'decimal', 5, o.cmIn, '170'], ['kg', 'Peso corporal', o.unit === 'lb' ? 'lb' : 'kg', 'decimal', 5, o.kgIn, o.unit === 'lb' ? '165' : '70']].map(([k, l, u, im, ml, v, ph]) => `<label class="pb-f"><span>${l}</span><span class="pb-in"><input id="pb-${k}" inputmode="${im}" maxlength="${ml}" value="${esc(v == null ? '' : v)}" placeholder="${ph}" aria-describedby="pb-e-${k}"><i class="pb-u" aria-hidden="true">${u}</i></span><small class="pb-err" id="pb-e-${k}" role="alert" hidden></small></label>`).join('')}</div>
    ${o.age !== '' && +o.age < LEGAL.minAge ? `<p class="pb-note bad">Forja es para personas de ${LEGAL.minAge} años o más.</p>` : +o.age >= LEGAL.minAge && +o.age < 18 ? '<p class="pb-note">Como eres menor de edad, entrena con la guía de un adulto o un entrenador. No te mostraremos dietas ni calorías.</p>' : ''}
    <div class="pb-lab">Sexo (para las fórmulas de calorías y fuerza)</div><div class="pb-pills">${[['m', 'Hombre'], ['f', 'Mujer']].map(([k, l]) => `<button type="button" class="pb-pill wide ${o.sex === k ? 'on' : ''}" data-pb="set" data-k="sex" data-v="${k}">${l}</button>`).join('')}</div>
    <div class="pb-lab">Pesas y máquinas en</div><div class="pb-pills">${[['kg', 'Kilos (kg)'], ['lb', 'Libras (lb)']].map(([k, l]) => `<button type="button" class="pb-pill wide ${o.unit === k ? 'on' : ''}" data-pb="set" data-k="unit" data-v="${k}">${l}</button>`).join('')}</div>`;
  if (s === 6) return `<h2>¿Tienes alguna molestia o lesión?</h2><p class="pb-sub">Evitaremos los ejercicios que suelen cargar esa zona. Si el dolor es fuerte o reciente, consulta a un profesional.</p>
    <div class="pb-list">${pbChip(!o.inj.length, 'data-pb="inj" data-v=""', 'Ninguna')}${PB_INJ.map(([k, l]) => pbChip(o.inj.includes(k), `data-pb="inj" data-v="${k}"`, l)).join('')}</div>`;
  if (s === 7) return `<h2>Cuestionario de salud</h2><p class="pb-sub">Basado en el PAR-Q. Responde con sinceridad: si respondes que sí a algo, te recomendaremos hablar con un médico antes de subir la intensidad.</p>
    <div class="pb-q">${PARQ.concat(o.sex === 'f' ? ['¿Estás embarazada o diste a luz en los últimos 6 meses?'] : []).map((q, i) => `<div class="pb-qr"><span class="grow">${q}</span><span class="pb-yn"><button type="button" class="${o.parq.includes(i) ? '' : 'on'}" data-pb="parq" data-i="${i}" data-v="0">No</button><button type="button" class="${o.parq.includes(i) ? 'on yes' : ''}" data-pb="parq" data-i="${i}" data-v="1">Sí</button></span></div>`).join('')}</div>
    <p class="pb-fine">Forja te ayuda a organizar tu entrenamiento, pero no es un servicio médico ni reemplaza a un médico o fisioterapeuta. Si sientes dolor en el pecho, mareo o falta de aire anormal, detente y busca ayuda.</p>
    <div class="pb-consent ${o.consent ? 'on' : ''}" data-pb="consent" role="checkbox" tabindex="0" aria-checked="${!!o.consent}"><span class="pb-box">${o.consent ? ic('check', 14) : ''}</span><span class="grow">Acepto que Forja trate mis datos de salud (respuestas, molestias, peso, medidas, pulso, pasos y sueño) para armar y ajustar mi plan, según la <a href="#" data-pb="priv">Política de privacidad</a> y los <a href="#" data-pb="terms">Términos de uso</a>. Puedo retirar mi consentimiento borrando mis datos.</span></div>`;
  const plan = genPlan(o), mins = d => Math.round((d.exercises.reduce((a, e) => a + e.sets * (45 + (e.rest || 90)) + 90, 0) + 300) / 60);
  pb.plan = plan;
  return `<h2>Tu plan está listo${o.name ? ', ' + esc(o.name) : ''}</h2><p class="pb-sub">${PB_GOALS[o.goal][0]} · ${PB_EQ[o.equip][0]} · ${plan.days.length} días</p>
    ${o.parq.length ? '<p class="pb-note">Respondiste que sí en el cuestionario de salud: habla con un médico antes de subir la intensidad. Mientras tanto, entrena suave y deja 3-4 reps de sobra en cada serie.</p>' : ''}
    <div class="pb-plan">${plan.days.map(d => `<div class="pb-day"><div class="row"><b class="grow">${WDL[d.weekday]} · ${esc(d.name)}</b><small>~${mins(d)} min</small></div><small>${d.exercises.map(e => esc(e.name)).join(' · ')}</small></div>`).join('')}</div>
    <p class="pb-fine">La primera semana es para aprender: elige pesos con los que te sobren 2-3 reps. La app sube el peso cuando completes todas las reps.</p>`;
}
function pbRender() {
  let el = $('#onb');
  if (!el) { el = document.createElement('div'); el.id = 'onb'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); document.body.appendChild(el); }
  document.body.classList.add('onb-open');
  const s = pb.step, last = s === PB_STEPS - 1;
  el.innerHTML = `<div class="pb-top">${s ? `<button type="button" class="icon-btn" data-pb="back" aria-label="Atrás">${ic('arrow-left', 20)}</button>` : (pb.edit ? `<button type="button" class="icon-btn" data-pb="x" aria-label="Cerrar">${ic('x', 20)}</button>` : '<span></span>')}
    <div class="pb-bar"><i style="width:${Math.round((s + 1) / PB_STEPS * 100)}%"></i></div><small class="num">${s + 1}/${PB_STEPS}</small></div>
    <div class="pb-body">${pbBody()}</div>
    <div class="pb-foot"><button type="button" class="btn primary block" data-pb="next" ${s === 5 ? `data-off="${pbOk() ? 0 : 1}"` : pbOk() ? '' : 'disabled'}>${s === 0 ? 'Empezar' : last ? (pb.edit ? 'Usar este plan' : 'Empezar a entrenar') : 'Siguiente'}</button></div>`;
  const sc = el.querySelector('.pb-body'); if (sc) sc.scrollTop = 0;
  if (s === 5) ['age', 'cm', 'kg'].forEach(k => pbShowErr(k));
}
function pbFinish() {
  const o = pb.o, S = state.settings, wasPub = !!S.pub;
  const prof = { name: (o.name || '').trim(), goal: o.goal, exp: o.exp, days: +o.days, mins: +o.mins, equip: o.equip, age: +o.age, sex: o.sex, cm: +o.cm, kg: +o.kg, inj: o.inj, parq: o.parq, minor: +o.age < 18 ? 1 : 0, at: Date.now() };
  S.prof = prof;
  const b = body(); b.sex = o.sex; b.h = +o.cm;
  const today0 = dk(new Date());
  if (+o.kg && !b.w.some(x => x.d === today0) && (!b.w.length || Math.abs(+o.kg - curWeight()) > 0.05)) b.w.push({ d: today0, kg: +o.kg });
  const n = nutri(); n.goal = PB_GOALS[o.goal][3]; n.act = o.days >= 6 ? 1.725 : o.days >= 3 ? 1.55 : 1.375;
  if (o.unit !== (S.unit || 'kg')) pbSetUnit(o.unit, true);
  const plan = pb.plan || genPlan(o), g = activeGym().id;
  if (wasPub) state.plans = state.plans.filter(p => !(p.auto && p.gymId === g && !state.sessions.some(s => s.planId === p.id)));
  state.plans.push(plan);
  S.planByGym = Object.assign({}, S.planByGym, { [g]: plan.id }); S.activePlanId = plan.id;
  S.onb = 1; S.healthOk = S.healthOk || 1; if (o.consent) saveConsent();
  applyProf(); savePlans(); pbClose();
  const sh = $('#sheet'); if (sh && !sh.hidden && sh.querySelector('[data-act="health-ok"]')) closeSheet();
  state.tab = 'train'; render();
  toast(wasPub && !pb.edit ? '¡Listo! Este es tu plan. Empieza cuando quieras.' : 'Nuevo plan activado. El anterior sigue en Rutinas.');
}
document.addEventListener('input', ev => {
  const t = ev.target; if (!pb.o || !t.closest || !t.closest('#onb')) return;
  const k = { 'pb-name': 'name', 'pb-age': 'age', 'pb-cm': 'cm', 'pb-kg': 'kg' }[t.id]; if (!k) return;
  if (k === 'cm') { pb.o.cmIn = t.value; const c = parseCm(t.value); pb.o.cm = c == null ? '' : c; }
  else if (k === 'kg') { pb.o.kgIn = t.value; pb.o.kgTyped = true; const g = pbKg(t.value, pb.o.unit); pb.o.kg = g == null ? '' : g; }
  else pb.o[k] = k === 'name' ? t.value : t.value.replace(/[^\d]/g, '');
  if (k !== 'name' && !pbErr(k)) pbShowErr(k);
  pbNextState();
  if (k === 'age') { const notes = $('#onb .pb-note'); const want = +pb.o.age > 0 && +pb.o.age < 18; if (!!notes !== want && pb.o.age.length >= 2) { const pos = t.selectionStart; pbRender(); const ni = $('#pb-age'); if (ni) { ni.focus(); try { ni.setSelectionRange(pos, pos); } catch (e) {} } } }
});
document.addEventListener('focusout', ev => {
  const t = ev.target; if (!pb.o || !t.closest || !t.closest('#onb')) return;
  const k = { 'pb-age': 'age', 'pb-cm': 'cm', 'pb-kg': 'kg' }[t.id]; if (!k) return;
  /* Estatura escrita en metros: al salir del campo se muestra en cm (1,70 → 170) */
  if (k === 'cm' && pb.o.cm !== '' && t.value !== String(pb.o.cm)) { pb.o.cmIn = String(pb.o.cm).replace('.', ','); t.value = pb.o.cmIn; }
  pbShowErr(k);
});
document.addEventListener('click', ev => {
  const b = ev.target.closest && ev.target.closest('[data-pb]'); if (!b) return;
  ev.preventDefault(); ev.stopPropagation();
  const a = b.dataset.pb, o = pb.o;
  if (a === 'next') { if (!pbOk()) { if (pb.step === 5) { pb.showErr = true; const bad = ['age', 'cm', 'kg'].filter(k => pbErr(k)); bad.forEach(k => pbShowErr(k, true)); const f = $('#pb-' + bad[0]); if (f) f.focus(); } return; } if (pb.step >= PB_STEPS - 1) return pbFinish(); pb.step++; return pbRender(); }
  if (a === 'back') { pb.step = Math.max(0, pb.step - 1); return pbRender(); }
  if (a === 'x') return pbClose();
  if (a === 'have') { state.settings.onb = 1; savePlans(); pbClose(); state.tab = 'settings'; render(); toast('Inicia sesión en "Tu cuenta" para traer tus datos.'); if (!state.settings.healthOk) setTimeout(() => healthSheet(true), 400); return; }
  if (a === 'set') {
    if (b.dataset.k === 'unit' && o.unit !== b.dataset.v) {
      /* El peso escrito a mano se lee en la unidad nueva; el que venía guardado se convierte para mostrarlo */
      if (o.kgTyped) { const g = pbKg(o.kgIn, b.dataset.v); o.kg = g == null ? '' : g; }
      else if (o.kg !== '' && o.kg != null) o.kgIn = String(b.dataset.v === 'lb' ? r1(o.kg * PB_LB) : o.kg).replace('.', ',');
    }
    o[b.dataset.k] = b.dataset.n ? +b.dataset.v : b.dataset.v; if (b.dataset.k === 'sex' && o.sex !== 'f') o.parq = o.parq.filter(i => i < PARQ.length); return pbRender(); }
  if (a === 'inj') { const v = b.dataset.v; o.inj = !v ? [] : o.inj.includes(v) ? o.inj.filter(x => x !== v) : o.inj.concat([v]); return pbRender(); }
  if (a === 'consent') { o.consent = !o.consent; return pbRender(); }
  if (a === 'priv') return privacySheet();
  if (a === 'terms') return termsSheet();
  if (a === 'parq') { const i = +b.dataset.i; o.parq = o.parq.filter(x => x !== i); if (b.dataset.v === '1') o.parq.push(i); return pbRender(); }
  /* Plantillas y ajustes */
  if (a === 'tpl') return pbTemplates();
  if (a === 'tpl-add') return pbAddTemplate(b.dataset.v);
  if (a === 'redo') { closeSheet(); return pbStart(1, true); }
  if (a === 'unit') return pbSetUnit(b.dataset.v);
  if (a === 'parq-ok') { const p = pbProf(); if (p) { p.parqOk = 1; savePlans(); render(); } }
}, true);

/* ---------- Plantillas listas (Rutinas) ---------- */
const PB_TPL = [
  ['me', 'Armada para ti', 'Según tu objetivo, días, tiempo y equipo', {}],
  ['fb2', 'Cuerpo completo · 2 días', 'Para empezar o con poco tiempo', { days: 2, split: 'fb' }],
  ['fb3', 'Cuerpo completo · 3 días', 'La más recomendada para principiantes', { days: 3, split: 'fb' }],
  ['ul4', 'Torso / Pierna · 4 días', 'Cada músculo 2 veces por semana', { days: 4, split: 'ul', exp: 2 }],
  ['ppl6', 'Empuje / Tracción / Pierna · 6 días', 'Para avanzados con buena recuperación', { days: 6, split: 'ppl', exp: 2 }],
  ['home3', 'En casa con mancuernas · 3 días', 'Mancuernas y una silla', { days: 3, split: 'fb', equip: 'home' }],
  ['body3', 'Peso corporal · 3 días', 'Sin equipo, en casa o en el parque', { days: 3, split: 'fb', equip: 'body' }],
];
const pbBase = () => Object.assign({ goal: 'salud', exp: 1, days: 3, mins: 60, equip: 'gym', inj: [] }, pbProf() || {}, !pbProf() && !pubUser() ? { goal: 'musculo', exp: 2, days: 4 } : {});
function pbTemplates() {
  const p = pbBase();
  openSheet(`<div class="row"><h2 class="grow">Plantillas</h2><button class="icon-btn" data-act="sheet-close" aria-label="Cerrar">${ic('x', 18)}</button></div>
    <p class="muted" style="font-size:13px;margin:0">Se ajustan a tu objetivo (${esc(PB_GOALS[p.goal][0].toLowerCase())}), tu experiencia y ${p.mins} min por sesión. Se agrega como una rutina nueva; las tuyas no cambian.</p>
    <div class="pb-list">${PB_TPL.map(([k, t, d]) => pbChip(false, `data-pb="tpl-add" data-v="${k}"`, t, d, k === 'me' ? 'sparkles' : k === 'body3' ? 'person-standing' : k === 'home3' ? 'user' : 'clipboard-list')).join('')}</div>
    <button type="button" class="btn" data-pb="redo">${ic('target', 16)} Cambiar mi objetivo o mis datos</button>`);
}
function pbAddTemplate(k) {
  const t = PB_TPL.find(x => x[0] === k); if (!t) return;
  const base = pbBase(), o = Object.assign({}, base, t[3]);
  if (t[3].exp) o.exp = Math.max(base.exp, t[3].exp);
  const plan = genPlan(o, k === 'me' ? null : t[1]);
  state.plans.push(plan);
  const g = activeGym().id; state.settings.planByGym = Object.assign({}, state.settings.planByGym, { [g]: plan.id }); state.settings.activePlanId = plan.id;
  savePlans(); closeSheet(); state.tab = 'plans'; render(); toast(`"${plan.name}" agregada y activada.`);
}

/* ---------- kg / lb ---------- */
const LB = 2.20462;
const PLATES_KG = PLATES.slice(), PLATES_LB = [45, 35, 25, 10, 5, 2.5], BAR_KG = Object.assign({}, BAR_DEFAULT);
function pbApplyUnit() {
  const lb = pbLb();
  PLATES.length = 0; (lb ? PLATES_LB : PLATES_KG).forEach(x => PLATES.push(x));
  Object.keys(BAR_KG).forEach(k => { BAR_DEFAULT[k] = lb && BAR_KG[k] === 20 ? 45 : BAR_KG[k]; });
  document.body.classList.toggle('u-lb', lb);
}
function pbSetUnit(u, quiet) {
  const from = state.settings.unit || 'kg'; if (u === from) return;
  const f = u === 'lb' ? LB : 1 / LB, step = u === 'lb' ? 2.5 : 0.5;
  const cv = w => (+w ? Math.round(+w * f / step) * step : w), cb = b => (+b === 20 && u === 'lb' ? 45 : +b === 45 && u === 'kg' ? 20 : cv(b));
  state.plans.forEach(p => p.days.forEach(d => d.exercises.forEach(e => { e.weight = cv(e.weight); if (e.bar) e.bar = cb(e.bar); })));
  state.sessions.forEach(s => { s.exercises.forEach(e => (e.sets || []).forEach(x => { x.w = cv(x.w); (x.drops || []).forEach(y => y.w = cv(y.w)); })); s.mt = Date.now(); });
  const d = state.draft; if (d) d.exercises.forEach(e => { if (e.bar) e.bar = cb(e.bar); if (e.sugg) e.sugg.w = cv(e.sugg.w); if (e.coach) e.coach.w = cv(e.coach.w); (e.log || []).forEach(x => { x.w = cv(x.w); (x.drops || []).forEach(y => y.w = cv(y.w)); }); });
  HISTORY.records.forEach(r => { r.w = cv(r.w); if (r.start) r.start = cv(r.start); });
  state.settings.unit = u; pbApplyUnit();
  saveLocal(); if (d && typeof saveDraft === 'function') saveDraft(); savePlans();
  if (!quiet) { render(); toast(u === 'lb' ? 'Pesas en libras. Convertí tus pesos guardados.' : 'Pesas en kilos. Convertí tus pesos guardados.'); }
}
pbApplyUnit();
const _incrementPb = increment;
increment = function (ex, w) { if (!pbLb()) return _incrementPb(ex, w); if (w <= 30) return 2.5; return ex.type === P && w >= 100 ? 10 : 5; };
/* Nivel de fuerza en lb y para mujeres (estándares ~30 % menores) */
const _lvOfPb = lvOf;
lvOf = function (name, v) {
  const k = (pbLb() ? LB : 1) * (body().sex === 'f' ? 0.7 : 1); if (k === 1) return _lvOfPb(name, v);
  const keep = curWeight; curWeight = () => keep() * k;
  try { return _lvOfPb(name, v); } finally { curWeight = keep; }
};
/* Mostrar "lb" en lugar de "kg" en pesas (el peso corporal sigue en kg) */
const PB_KG = /(\d|\s|\))kg\b/g;
function pbLbText(root) {
  if (!pbLb() || !root || !root.querySelectorAll) return;
  const skipAll = state.tab === 'profile' && state.profSub === 'body' && root.id === 'app';
  if (skipAll) return;
  const skip = n => { const p = n.parentElement; return !p || !!p.closest('.bw, #onb, .bd-card, .nu-card, script, style') || /tu peso|corporal|peso de hoy/i.test(n.nodeValue); };
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false); let n;
  while ((n = w.nextNode())) if (n.nodeValue.indexOf('kg') >= 0 && !skip(n)) n.nodeValue = n.nodeValue.trim() === 'kg' ? n.nodeValue.replace('kg', 'lb') : n.nodeValue.replace(PB_KG, '$1lb');
  root.querySelectorAll('[placeholder*="kg"],[aria-label*="kg"]').forEach(el => { if (el.closest('.bw, #onb, .bd-card')) return; ['placeholder', 'aria-label'].forEach(a => { const v = el.getAttribute(a); if (v && /kg\b/.test(v) && !/corporal|de hoy/i.test(v)) el.setAttribute(a, v.replace(/kg\b/g, 'lb')); }); });
}
let pbMo = null;
function pbWatchLb() {
  if (pbMo) { pbMo.disconnect(); pbMo = null; }
  if (!pbLb() || typeof MutationObserver === 'undefined') return;
  let q = false;
  pbMo = new MutationObserver(() => { if (q) return; q = true; setTimeout(() => { q = false; ['#app', '#sheet', '#sx', '#rest', '#toast'].forEach(s => pbLbText($(s))); }, 0); });
  pbMo.observe(document.body, { childList: true, subtree: true, characterData: true });
}

/* ---------- Primera serie sin peso: cómo elegirlo ---------- */
const _suggestPb = suggest;
suggest = function (gymId, kind, ex) {
  const r = _suggestPb(gymId, kind, ex);
  if (r && !r.ref && !(+ex.weight) && /^Primera vez/.test(r.msg || '')) r.msg = PB_BW.test(normName(ex.name))
    ? 'Con tu peso corporal: anota 0 y concéntrate en la técnica y las reps.'
    : 'Primera vez: elige un peso con el que podrías hacer <b>3 reps más</b> de las indicadas, con buena técnica. Anótalo y la app ajusta desde ahí.';
  return r;
};

/* ---------- Menores: sin calorías ni dietas ---------- */
const _nutriCardPb = nutriCard;
nutriCard = function () {
  const p = pbProf(); if (!p || !p.minor) return _nutriCardPb();
  return `<div class="card nu-card"><h3>Alimentación</h3><div class="muted" style="font-size:13px">Come variado: proteína en cada comida (huevo, pollo, pescado, menestras, lácteos), frutas, verduras y agua. Para un plan de alimentación, habla con un nutricionista y tu familia.</div></div>`;
};

/* ---------- Tarjetas: aviso de salud, objetivo y plantillas ---------- */
function pbHealthCard() {
  const p = pbProf(); if (!p || !p.parq || !p.parq.length || p.parqOk) return '';
  return `<div class="card pb-warn"><div class="row"><span class="pb-ic">${ic('heart-pulse', 18)}</span><b class="grow">Antes de subir la intensidad</b></div>
    <div class="muted" style="font-size:13px">En el cuestionario de salud respondiste que sí a algo. Habla con un médico antes de entrenar fuerte. Mientras tanto, entrena suave y deja 3-4 reps de sobra.</div>
    <button type="button" class="btn small" data-pb="parq-ok">Ya consulté con un médico</button></div>`;
}
function pbGoalCard() {
  const p = pbProf(), u = state.settings.unit || 'kg';
  const line = p ? `${esc(PB_GOALS[p.goal][0])} · ${esc(PB_EXP[p.exp])} · ${p.days} días de ${p.mins} min · ${esc(PB_EQ[p.equip][0])}` : 'Aún no elegiste un objetivo.';
  return `<div class="card pb-card"><h3>Tu objetivo y plan</h3><div class="muted" style="font-size:13px">${line}</div>
    <div class="row" style="gap:8px;flex-wrap:wrap"><button type="button" class="btn small" data-pb="redo">${ic('target', 15)} ${p ? 'Cambiar objetivo' : 'Elegir objetivo'}</button><button type="button" class="btn small" data-pb="tpl">${ic('clipboard-list', 15)} Plantillas</button></div>
    <div class="label" style="margin-top:4px">Pesas y máquinas en</div>
    <div class="seg pb-unit"><button type="button" class="${u === 'kg' ? 'on' : ''}" data-pb="unit" data-v="kg">Kilos (kg)</button><button type="button" class="${u === 'lb' ? 'on' : ''}" data-pb="unit" data-v="lb">Libras (lb)</button></div>
    <div class="muted" style="font-size:12px">Al cambiar, se convierten tus pesos guardados. El peso corporal sigue en kg.</div></div>`;
}
const _vSettingsPb = vSettings;
vSettings = function () { return _vSettingsPb() + pbGoalCard(); };
SET_ORDER.push(['Tu objetivo', 1.5]);
SET_ORDER.sort((a, b) => a[1] - b[1]);

/* ---------- Después de cada dibujo ---------- */
const _renderPb = render;
render = function () {
  /* Si un equipo nuevo se vinculó a la cuenta del dueño, vuelve al modo normal */
  ownerFix();
  _renderPb();
  const app = $('#app'); if (!app) return;
  if (state.tab === 'train' && !state.draft && !isWatch()) {
    const hc = pbHealthCard();
    if (hc && !app.querySelector('.pb-warn')) { const h = app.querySelector(':scope > .hero'); h ? h.insertAdjacentHTML('beforebegin', hc) : app.insertAdjacentHTML('afterbegin', hc); }
  }
  if (state.tab === 'plans' && !app.querySelector('.pb-tplbar')) {
    const bar = `<div class="pb-tplbar"><button type="button" class="btn" data-pb="tpl">${ic('sparkles', 16)} Plantillas por objetivo</button></div>`;
    const head = app.querySelector(':scope > .pagehead') || app.querySelector(':scope > .top');
    head ? head.insertAdjacentHTML('afterend', bar) : app.insertAdjacentHTML('afterbegin', bar);
  }
  if (pbLb()) pbLbText(app);
};
pbWatchLb();
const _setUnitPb = pbSetUnit;
pbSetUnit = function (u, q) { _setUnitPb(u, q); pbWatchLb(); };

/* Usuario nuevo: bienvenida (en el reloj se configura desde el celular) */
if (pubUser() && !state.settings.onb && !isWatch()) pbStart(0);
bootRender();
