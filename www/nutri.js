/* ==========================================================================
   Proteína y calorías
   - Calculadora según objetivo: recomposición, volumen limpio (+250 kcal) o definición.
   - Registro rápido de gramos de proteína del día (en los hábitos), sincronizado.
   ========================================================================== */
const NU_GOALS = {
  recomp: ['Recomposición', 0, 2.0, 'Comer en mantenimiento: bajas grasa y ganas músculo a la vez. Ideal si estás cerca de tu peso meta.'],
  bulk: ['Volumen limpio', 250, 1.8, 'Un pequeño superávit (+250 kcal) para ganar músculo con la menor grasa posible. Busca subir unos 0,25 kg por semana como máximo.'],
  cut: ['Definición', -400, 2.2, 'Déficit moderado (−400 kcal) para bajar grasa sin perder músculo. Más proteína protege tu masa muscular.'],
};
const NU_ACT = [[1.375, 'Ligera', '1-3 días'], [1.55, 'Moderada', '3-5 días'], [1.725, 'Alta', '6-7 días o trabajo físico']];
const PROT_FOODS = [
  ['batido', 'Batido', '1 scoop', 24], ['pollo', 'Pollo o pescado', 'una palma ~120 g', 30], ['res', 'Carne de res', 'una palma ~120 g', 28],
  ['huevos', '2 huevos', '', 12], ['atun', 'Atún', '1 lata', 25], ['yogur', 'Yogur griego', '1 taza', 15],
  ['leche', 'Leche', '1 vaso', 8], ['queso', 'Queso fresco', '2 tajadas', 8], ['menestra', 'Menestras', '1 taza cocida', 15],
];
function nutri() { const n = state.settings.nutri = state.settings.nutri || {}; if (!n.goal) n.goal = 'recomp'; if (!n.act) n.act = 1.55; return n; }
function nutriCalc() {
  const n = nutri(), b = body(), kg = curWeight(), age = HISTORY.age || 35;
  const bmr = 10 * kg + 6.25 * b.h - 5 * age + (b.sex === 'f' ? -161 : 5);
  const tdee = bmr * n.act, g = NU_GOALS[n.goal];
  const kcal = Math.round((tdee + g[1]) / 10) * 10, prot = Math.round(kg * g[2] / 5) * 5, fat = Math.round(kg * 0.8 / 5) * 5;
  const carbs = Math.max(0, Math.round((kcal - prot * 4 - fat * 9) / 4 / 5) * 5);
  return { kg, bmr, tdee: Math.round(tdee / 10) * 10, kcal, prot, fat, carbs };
}
const protGoal = () => nutriCalc().prot;
function protOf(day) {
  const t = day || {}, list = t.pg || [];
  return list.reduce((a, x) => a + (+x.g || 0), 0) + (t.prot && !list.some(x => x.k === 'batido') ? 24 : 0);
}

/* Fila en "Hábitos de hoy" */
function protRow() {
  const g = protOf(today()), goal = protGoal(), pct = Math.min(1, g / goal);
  return `<div class="hab-water hab-prot"><span class="hab-ic p">${ic('beef', 18)}</span>
    <div class="grow" style="min-width:0"><div class="row" style="justify-content:space-between"><b>Proteína</b><span class="num muted">${g} / ${goal} g</span></div><div class="wbar2 p"><i style="width:${(pct * 100).toFixed(0)}%"></i></div></div>
    <button class="wbtn" data-act="pg-open">+ Comida</button></div>`;
}
const _habitCardN = habitCard;
habitCard = function () { const h = _habitCardN(); const i = h.lastIndexOf('</div>'); return h.slice(0, i) + protRow() + h.slice(i); };
dailyPanel = habitCard;

function protSheet() {
  const t = today(), list = t.pg || [], g = protOf(t), goal = protGoal();
  openSheet(`<div class="row"><h2 class="grow">Proteína de hoy</h2><button class="icon-btn" data-act="sheet-close" aria-label="Cerrar">${ic('x', 18)}</button></div>
    <div class="pg-sum"><div><b class="num">${g}</b><span> / ${goal} g</span></div><div class="wbar2 p"><i style="width:${Math.min(100, g / goal * 100).toFixed(0)}%"></i></div>
      <small class="muted">${g >= goal ? '¡Meta cumplida! 💪' : `Te faltan ${goal - g} g. Reparte en 3-4 comidas de 30-40 g.`}</small></div>
    <div class="pg-grid">${PROT_FOODS.map(([k, n, sub, gr]) => `<button class="pg" data-act="pg-add" data-k="${k}" data-g="${gr}"><b>${n}</b><small>${sub ? sub + ' · ' : ''}${gr} g</small></button>`).join('')}</div>
    <form class="row" id="f-pg" style="gap:8px"><input id="pg-g" inputmode="numeric" placeholder="Otra cantidad (g)" aria-label="Gramos de proteína"><button class="btn" type="submit">Sumar</button></form>
    ${list.length || t.prot ? `<div class="label">Hoy registraste</div><div class="pg-list">${t.prot && !list.some(x => x.k === 'batido') ? `<span class="chip">Batido (hábito) · 24 g</span>` : ''}${list.map((x, i) => `<span class="chip">${esc((PROT_FOODS.find(f => f[0] === x.k) || [0, 'Otro'])[1])} · ${x.g} g <button class="pg-x" data-act="pg-del" data-i="${i}" aria-label="Quitar">${ic('x', 12)}</button></span>`).join('')}</div>` : ''}
    <button class="btn primary block" data-act="sheet-close">Listo</button>`);
}
function addProt(k, g) {
  const t = today(); t.pg = (t.pg || []).concat([{ k, g, at: Date.now() }]);
  if (k === 'batido') t.prot = true;
  t.edited = Date.now(); saveDaily(); protSheet(); render();
}
document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-act^="pg-"],[data-act^="nu-"]'); if (!b) return;
  ev.stopPropagation();
  const a = b.dataset.act;
  if (a === 'pg-open') protSheet();
  else if (a === 'pg-add') addProt(b.dataset.k, +b.dataset.g);
  else if (a === 'pg-del') { const t = today(); const x = (t.pg || []).splice(+b.dataset.i, 1)[0]; if (x && x.k === 'batido' && !t.pg.some(y => y.k === 'batido')) t.prot = false; t.edited = Date.now(); saveDaily(); protSheet(); render(); }
  else if (a === 'nu-goal') { nutri().goal = b.dataset.v; savePlans(); render(); }
  else if (a === 'nu-act') { nutri().act = +b.dataset.v; savePlans(); render(); }
}, true);
document.addEventListener('submit', ev => {
  if (ev.target.id !== 'f-pg') return; ev.preventDefault();
  const g = Math.round(parseFloat(String($('#pg-g').value).replace(',', '.')));
  if (!(g > 0 && g < 300)) { toast('Escribe los gramos, por ejemplo 20'); return; }
  addProt('otro', g);
}, true);

/* Tarjeta en Perfil → Cuerpo */
function nutriCard() {
  const n = nutri(), c = nutriCalc(), g = NU_GOALS[n.goal];
  const days = []; for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); days.push(d); }
  const vals = days.map(d => protOf(state.daily[dk(d)])), mx = Math.max(c.prot, Math.max.apply(null, vals)) || 1;
  const hit = vals.filter(v => v >= c.prot * 0.9).length;
  return `<div class="card bd-card nu-card">
    <h3>${ic('beef', 17)} Calorías y proteína</h3>
    <div class="seg seg3">${Object.keys(NU_GOALS).map(k => `<button class="${n.goal === k ? 'on' : ''}" data-act="nu-goal" data-v="${k}">${NU_GOALS[k][0]}</button>`).join('')}</div>
    <div class="muted bd-tip">${g[3]}</div>
    <div class="nu-kcal"><div><b class="num">${c.kcal}</b><span>kcal al día</span></div><small class="muted">Mantenimiento ≈ ${c.tdee} kcal</small></div>
    <div class="nu-mac"><div class="p"><b class="num">${c.prot} g</b><span>Proteína</span></div><div class="c"><b class="num">${c.carbs} g</b><span>Carbohidratos</span></div><div class="f"><b class="num">${c.fat} g</b><span>Grasas</span></div></div>
    <div class="field"><span class="label">Actividad</span><div class="seg seg3">${NU_ACT.map(([v, l, s]) => `<button class="${n.act === v ? 'on' : ''}" data-act="nu-act" data-v="${v}" title="${s}">${l}</button>`).join('')}</div></div>
    <div class="label">Proteína · últimos 7 días <span class="muted" style="text-transform:none;letter-spacing:0">(${hit}/7 días en meta)</span></div>
    <div class="nu-bars">${days.map((d, i) => `<div><div class="nu-bt"><i style="height:${Math.round(vals[i] / mx * 100)}%" class="${vals[i] >= c.prot * 0.9 ? 'ok' : ''}"></i><span class="nu-goal" style="bottom:${Math.round(c.prot / mx * 100)}%"></span></div><small>${'DLMMJVS'[d.getDay()]}</small><small class="num">${vals[i] || ''}</small></div>`).join('')}</div>
    <div class="muted bd-tip">Calculado con tu peso (${fmtKg(r1(c.kg))} kg), estatura, edad y la fórmula de Mifflin-St Jeor. Es un punto de partida: si en 2-3 semanas tu promedio de peso no va como esperas, ajusta ±150 kcal. Registra la proteína en <b>Hábitos de hoy</b>.</div>
  </div>`;
}
const _vBodyN = vBody;
vBody = function () { const h = _vBodyN(), k = h.indexOf('<div class="card bd-card" id="bd-photos">'); return k < 0 ? h + nutriCard() : h.slice(0, k) + nutriCard() + h.slice(k); };

/* El texto para Claude incluye tu objetivo */
if (typeof claudePrompt === 'function') { const _cpN = claudePrompt; claudePrompt = function () { const c = nutriCalc(); return _cpN() + `\nNutrición: objetivo ${NU_GOALS[nutri().goal][0].toLowerCase()}, ${c.kcal} kcal y ${c.prot} g de proteína al día; proteína registrada hoy: ${protOf(today())} g.`; }; }
render();
