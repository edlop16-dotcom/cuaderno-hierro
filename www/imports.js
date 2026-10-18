/* ==========================================================================
   Importar historial desde Hevy (CSV: Perfil → Configuración → Exportar datos).
   También sirve para Strong (mismo formato básico de columnas).
   ========================================================================== */
const HEVY_MAP = {
  'press de piernas': 'Prensa 45°', 'sentadilla hack (maquina)': 'Sentadilla Hack', 'empuje de caderas (barra)': 'Hip Thrust',
  'extension de pierna': 'Extensión de Pierna', 'abduccion de cadera (maquina)': 'Abducción de Cadera', 'aduccion de cadera (maquina)': 'Aducción de Cadera',
  'curl de pierna sentado': 'Curl Femoral Sentado', 'curl de pierna tumbado': 'Curl Femoral Tumbado',
  'press de banca (barra)': 'Press Banca Plano (Barra)', 'press de banca inclinado (barra)': 'Press Banca Inclinado (Barra)',
  'press de banca inclinado (mancuerna)': 'Press Inclinado con Mancuernas', 'press de banca (mancuerna)': 'Press Banca con Mancuernas',
  'aperturas (maquina)': 'Pec Deck (Contractora)', 'press frances (barra)': 'Press Francés', 'remo en punta': 'Remo en T',
  'curl de biceps (barra)': 'Curl con Barra', 'curl de biceps (mancuerna)': 'Curl Bíceps', 'remo sentado con cable': 'Remo Sentado con Cable',
  'jalon al pecho (cable)': 'Jalón al Pecho', 'elevacion laterales (mancuerna)': 'Elevaciones Laterales', 'elevaciones laterales (mancuerna)': 'Elevaciones Laterales',
  'jalon de triceps con cuerda': 'Tríceps con Cuerda', 'extension de triceps (cable)': 'Tríceps Polea', 'peso muerto rumano (barra)': 'Peso Muerto Rumano',
  'sentadilla (barra)': 'Sentadilla con Barra', 'dominadas': 'Dominadas', 'face pull': 'Face Pull', 'press militar (mancuerna)': 'Press Militar (Mancuernas)',
};
const MES = { ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5, jul: 6, ago: 7, sep: 8, set: 8, oct: 9, nov: 10, dic: 11, jan: 0, apr: 3, aug: 7, dec: 11 };
function parseCSV(text, delim) {
  delim = delim || ',';
  const rows = []; let row = [], f = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === delim) { row.push(f); f = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(f); rows.push(row); row = []; f = ''; }
    else f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  return rows.filter(r => r.length > 1);
}
function parseHevyDate(s) {
  s = String(s).trim();
  let m = s.match(/^(\d{1,2}) ([a-zA-Zé]{3})[a-z]*\.? (\d{4}),? (\d{1,2}):(\d{2})/);      // 9 oct 2026, 18:58
  if (m) { const mo = MES[normName(m[2]).slice(0, 3)]; if (mo != null) return new Date(+m[3], mo, +m[1], +m[4], +m[5]); }
  m = s.match(/^([a-zA-Z]{3})[a-z]* (\d{1,2}),? (\d{4}),? (\d{1,2}):(\d{2})/);              // Oct 9, 2026, 18:58
  if (m) { const mo = MES[normName(m[1]).slice(0, 3)]; if (mo != null) return new Date(+m[3], mo, +m[2], +m[4], +m[5]); }
  const d = new Date(s); return isNaN(d) ? null : d;
}
function mapExName(n) {
  const k = normName(n).trim(); if (HEVY_MAP[k]) return HEVY_MAP[k];
  const x = libFind(n); return x ? x.name : n.replace(/\s*\((maquina|máquina)\)\s*$/i, '');
}
const typeOf = name => { const x = libFind(name); if (x) return x.type; const n = normName(name); return /pierna|sentadilla|prensa|cadera|gluteo|talon|zancada/.test(n) ? P : /remo|jalon|curl|dominada|pull/.test(n) ? TR : /abdom|crunch|plancha/.test(n) ? 'Core' : EM; };
function hevySessions(text, gymFor) {
  const rows = parseCSV(text); if (!rows.length) return [];
  const H = rows[0].map(h => normName(h).trim()), col = n => H.indexOf(n);
  const ci = { title: col('title'), st: col('start_time'), en: col('end_time'), ex: col('exercise_title'), note: col('exercise_notes'), type: col('set_type'), w: col('weight_kg'), r: col('reps'), desc: col('description') };
  if (ci.st < 0 || ci.ex < 0 || ci.w < 0 || ci.r < 0) throw new Error('No reconozco el archivo. Debe ser el CSV que exporta Hevy.');
  const by = new Map();
  rows.slice(1).forEach(r => {
    const st = parseHevyDate(r[ci.st]); if (!st) return;
    const key = st.toISOString();
    if (!by.has(key)) {
      const en = parseHevyDate(r[ci.en]) || st, title = r[ci.title] || 'Entrenamiento';
      by.set(key, { id: 'hevy-' + key, date: key, planId: 'hevy', planName: 'Hevy', dayId: 'hevy-' + normName(title).replace(/\W+/g, '-'), dayName: title,
        gymId: gymFor(st), gymName: gymName(gymFor(st)), kind: /bombeo|pump|ligero/i.test(title) ? 'bombeo' : 'fuerza',
        durationSec: Math.max(60, Math.round((en - st) / 1000)), source: 'Hevy', exercises: [] });
    }
    const s = by.get(key), name = mapExName(r[ci.ex] || '');
    if (!name || /warmup|calentamiento/i.test(r[ci.type] || '')) return;
    const w = parseFloat(String(r[ci.w]).replace(',', '.')) || 0, reps = parseInt(r[ci.r], 10) || 0; if (!reps) return;
    let e = s.exercises.find(x => x.name === name);
    if (!e) { e = { name, type: typeOf(name), sets: [] }; const nt = (r[ci.note] || '').trim(); if (nt) e.note = nt.slice(0, 280); s.exercises.push(e); }
    if (/drop/i.test(r[ci.type] || '') && e.sets.length) { const l = e.sets[e.sets.length - 1]; (l.drops = l.drops || []).push({ w, r: reps }); }
    else e.sets.push({ w, r: reps });
  });
  return [...by.values()].filter(s => s.exercises.length);
}
function importSessions(list, replaceIds) {
  let add = 0, upd = 0;
  list.forEach(s => {
    const same = state.sessions.find(x => x.id === s.id || (replaceIds && replaceIds[s.id] === x.id));
    if (same) { Object.assign(same, s, { id: same.id }); upd++; }
    else if (!state.sessions.some(x => Math.abs(new Date(x.date) - new Date(s.date)) < 30 * 60000 && x.source !== 'Aproximado')) { state.sessions.push(s); add++; }
  });
  state.sessions.sort((a, b) => b.date.localeCompare(a.date)); saveLocal();
  if (typeof sync !== 'undefined') sync.revive(list.map(s => s.id));
  return { add, upd };
}

/* Pantalla para importar (Ajustes) */
function importHevySheet() {
  openSheet(`<div class="row"><h2 class="grow">Importar desde Hevy</h2><button class="icon-btn" data-act="sheet-close" aria-label="Cerrar">${ic('x', 18)}</button></div>
    <ol class="sync-steps"><li>En Hevy: <b>Perfil → ⚙️ Configuración → Exportar e importar datos → Exportar entrenamientos</b>.</li><li>Guarda el archivo <b>workout_data.csv</b>.</li><li>Elige el gimnasio y toca <b>Elegir archivo</b>.</li></ol>
    <div class="field"><span class="label">¿En qué gimnasio hiciste esos entrenamientos?</span><div class="gymbar">${state.gyms.map(g => `<label class="gchip ${g.id === activeGym().id ? 'on' : ''}"><input type="radio" name="imp-gym" value="${g.id}" ${g.id === activeGym().id ? 'checked' : ''} style="display:none" onchange="this.closest('.gymbar').querySelectorAll('.gchip').forEach(x=>x.classList.toggle('on',x===this.parentNode))">${esc(g.name)}</label>`).join('')}</div></div>
    <label class="btn primary block" style="text-align:center">${ic('download', 16)} Elegir archivo<input type="file" id="imp-file" accept=".csv,text/csv,text/plain" hidden></label>
    <div id="imp-res" class="muted" style="font-size:13px"></div>`);
}
document.addEventListener('change', ev => {
  if (ev.target.id !== 'imp-file') return;
  const f = ev.target.files && ev.target.files[0]; if (!f) return;
  const gid = (document.querySelector('input[name="imp-gym"]:checked') || {}).value || activeGym().id;
  const rd = new FileReader();
  rd.onload = () => {
    try {
      const list = hevySessions(String(rd.result), () => gid), r = importSessions(list);
      document.getElementById('imp-res').innerHTML = `<b style="color:var(--ok)">Listo:</b> ${list.length} entrenamientos leídos · ${r.add} nuevos · ${r.upd} actualizados.`;
      render();
    } catch (e) { document.getElementById('imp-res').textContent = e.message; }
  };
  rd.readAsText(f);
});
document.addEventListener('click', ev => { if (ev.target.closest('[data-act="imp-hevy"]')) { ev.stopPropagation(); importHevySheet(); } }, true);
const _vSettingsImp = vSettings;
vSettings = function () {
  const h = _vSettingsImp(), at = h.indexOf('<div class="card"><h3>Respaldo</h3>');
  const card = `<div class="card"><h3>Importar historial</h3><div class="muted" style="font-size:12.5px">Trae tus entrenamientos de Hevy o Strong para ver tus gráficas y que el coach parta de tus pesos reales.</div><button class="btn block" data-act="imp-hevy">${ic('download', 16)} Importar desde Hevy (CSV)</button></div>`;
  return at < 0 ? h + card : h.slice(0, at) + card + h.slice(at);
};

/* Los historiales se importan solo a petición del usuario, nunca desde datos incrustados. */
function symSessions(rows, gymId = activeGym().id) {
  return rows.map(([when, day, exs]) => ({
    id: 'sym-' + when.slice(0, 10), date: new Date(when + ':00-05:00').toISOString(), planId: 'sym', planName: 'Symmetry',
    dayId: 'sym-' + normName(day), dayName: day, gymId, gymName: gymName(gymId), kind: 'fuerza',
    durationSec: exs.length * 900, source: 'Symmetry',
    exercises: exs.map(([name, sets]) => ({ name, type: typeOf(name), sets: sets.split(' ').map(t => { const [w, r] = t.split('x').map(Number); return { w, r }; }) })),
  }));
}
bootRender();
