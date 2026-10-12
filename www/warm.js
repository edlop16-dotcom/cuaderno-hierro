/* ==========================================================================
   Calentamiento y discos automáticos
   - Rampa según el peso de trabajo: 40 %×10, 60 %×5, 80 %×3 (barra sola primero si es con barra).
   - Si ya calentaste ese músculo en un ejercicio anterior, basta 1 serie de aproximación.
   - Discos por lado para ejercicios con barra o máquinas de discos (anotas la suma de los discos).
   ========================================================================== */
const PLATES = [20, 15, 10, 5, 2.5];
const PLATE_LOADED = /prensa|hack|remo en t|hip thrust|pantorrilla en prensa|sentadilla con barra|peso muerto|press banca .*barra|press militar con barra|remo con barra|curl con barra|press frances/;
const loadsPlates = e => !!(e && (e.bar || PLATE_LOADED.test(normName(e.name))));

/* Discos por lado para un total de discos (lo que anotas) */
function platesPerSide(total) {
  let side = Math.round((+total || 0) / 2 * 100) / 100; const out = [];
  for (const p of PLATES) while (side >= p - 0.001) { out.push(p); side = Math.round((side - p) * 100) / 100; }
  return { list: out, rest: side };
}
function platesTxt(total) {
  if (!(+total > 0)) return 'sin discos';
  const p = platesPerSide(total), g = {};
  p.list.forEach(x => g[x] = (g[x] || 0) + 1);
  const s = Object.keys(g).map(Number).sort((a, b) => b - a).map(x => (g[x] > 1 ? g[x] + '×' : '') + fmtKg(x)).join(' + ');
  return (s || '—') + (p.rest > 0.01 ? ` (+${fmtKg(p.rest)} sin disco exacto)` : '');
}
const plateChips = total => { const p = platesPerSide(total), g = []; p.list.forEach(x => { const l = g[g.length - 1]; if (l && l.x === x) l.n++; else g.push({ x, n: 1 }); });
  return g.map(({ x, n }) => `<i class="pl p${String(x).replace('.', '_')}">${n > 1 ? `<s>${n}×</s>` : ''}${fmtKg(x)}</i>`).join('') + (p.rest > 0.01 ? `<small>+${fmtKg(p.rest)}</small>` : ''); };

/* Músculo principal del ejercicio (para saber si ya está caliente) */
function mainZone(name) { const z = zonesOf(name).filter(k => k[0] !== '~'); return z[0] || null; }
function warmupFor(e, i, d) {
  const w = +(e.log[0] && e.log[0].w) || (e.coach && e.coach.w) || (e.sugg && e.sugg.w) || 0;
  const bar = e.bar || 0, total = w + bar, plates = loadsPlates(e);
  const round = v => plates ? Math.max(0, Math.round(v / 5) * 5) : Math.max(0, Math.round(v / increment(e, v)) * increment(e, v));
  const z = mainZone(e.name);
  const warmBefore = z && d.exercises.slice(0, i).some(x => zonesOf(x.name).includes(z));
  const compound = e.rest >= 90;
  let steps;
  if (!w && !bar) return null;
  if (warmBefore) steps = [[0.6, 5]];
  else if (!compound) steps = [[0.5, 10]];
  else steps = [[0.4, 10], [0.6, 5], [0.8, 3]];
  const sets = [];
  if (bar && !warmBefore) sets.push({ w: 0, r: 10, bar: true });
  steps.forEach(([pc, r]) => {
    const x = round(total * pc - bar);
    if (x <= 0 && bar) return;
    if (x >= w) return;
    if (sets.some(s => s.w === x)) return;
    sets.push({ w: x, r, pc });
  });
  return { sets, warmBefore, compound, w, plates };
}

function warmBox(e, i, d) {
  const W = warmupFor(e, i, d); if (!W) return '';
  e.wu = e.wu || [];
  const head = W.warmBefore ? 'Ya calentaste este músculo: 1 serie de aproximación' : W.compound ? `Calentamiento · ${W.sets.length} series` : 'Calentamiento · 1 serie';
  const allDone = W.sets.length && W.sets.every((s, k) => e.wu[k]);
  return `<details class="warm ${allDone ? 'done' : ''}" data-ex="${i}" ${e.wuo != null ? (e.wuo ? 'open' : '') : (allDone || e.log.some(s => s.done) ? '' : 'open')}>
    <summary>${ic('flame', 15)} <span class="grow">${head}</span>${allDone ? `<span class="chip ok">${ic('check', 12)} Listo</span>` : ''}${ic('chevron-down', 15)}</summary>
    <div class="wu-list">${W.sets.map((s, k) => `<button type="button" class="wu ${e.wu[k] ? 'on' : ''}" data-act="wu" data-ex="${i}" data-k="${k}" aria-pressed="${!!e.wu[k]}">
      <span class="wu-n">${s.bar ? 'Barra' : Math.round(s.pc * 100) + '%'}</span>
      <span class="wu-w"><b class="num">${s.bar ? fmtKg(e.bar) : fmtKg(s.w)} kg</b> × ${s.r}</span>
      ${W.plates && !s.bar ? `<span class="wu-p">${s.w ? plateChips(s.w) : ''}</span>` : '<span class="wu-p muted">sin discos</span>'}
      <span class="wu-c">${e.wu[k] ? ic('check', 14) : ''}</span></button>`).join('')}</div>
    <div class="muted wu-tip">Descansa 1 min entre series de calentamiento. No cuentan para tu progreso${W.plates ? '; los discos son <b>por lado</b>' : ''}.</div>
  </details>
  ${W.plates ? `<div class="plates-live" data-ex="${i}">${ic('layers', 14)} <span>Series efectivas · por lado:</span> <span class="pl-chips">${plateChips(W.w)}</span></div>` : ''}`;
}

function decorateWarm() {
  const d = state.draft; if (!d || isWatch()) return;
  const cards = document.querySelectorAll('#app .card.ex');
  d.exercises.forEach((e, i) => {
    const c = cards[i]; if (!c || c.querySelector('.warm')) return;
    /* quitar el texto de calentamiento anterior */
    c.querySelectorAll('.muted').forEach(m => { if (/^Calentamiento:/.test(m.textContent.trim())) m.remove(); });
    const bi = c.querySelector('.barinfo'); if (bi) bi.innerHTML = bi.innerHTML.replace(/\s*Calentamiento:[\s\S]*$/, '');
    const sets = c.querySelector('.sets'); if (!sets) return;
    const h = warmBox(e, i, d); if (h) sets.insertAdjacentHTML('beforebegin', h);
  });
}
const _renderWarm = render;
render = function () { _renderWarm(); decorateWarm(); };

document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-act="wu"]'); if (!b) return;
  ev.stopPropagation();
  const d = state.draft, e = d && d.exercises[+b.dataset.ex]; if (!e) return;
  e.wu = e.wu || []; const k = +b.dataset.k; e.wu[k] = !e.wu[k]; d.lastAct = Date.now(); saveDraft();
  b.classList.toggle('on', !!e.wu[k]); b.setAttribute('aria-pressed', !!e.wu[k]); b.querySelector('.wu-c').innerHTML = e.wu[k] ? ic('check', 14) : '';
  const box = b.closest('.warm'), all = [].every.call(box.querySelectorAll('.wu'), x => x.classList.contains('on'));
  if (all) { box.classList.add('done'); setTimeout(() => { box.open = false; e.wuo = false; saveDraft(); }, 400); toast('Calentamiento listo. ¡A las series efectivas!'); }
  else if (e.wu[k]) startRest(60);
}, true);
document.addEventListener('toggle', ev => { const t = ev.target; if (t.classList && t.classList.contains('warm') && state.draft) { const e = state.draft.exercises[+t.dataset.ex]; if (e) { e.wuo = t.open; saveDraft(); } } }, true);
/* Discos en vivo al cambiar el peso de la 1ª serie no hecha */
document.addEventListener('input', ev => {
  const t = ev.target; if (!t.dataset || t.dataset.f !== 'w' || t.dataset.k != null) return;
  const live = document.querySelector(`.plates-live[data-ex="${t.dataset.ex}"] .pl-chips`); if (!live) return;
  const v = parseFloat(String(t.value).replace(',', '.')); live.innerHTML = v > 0 ? plateChips(v) : '';
});
render();
