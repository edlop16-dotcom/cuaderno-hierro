/* ==========================================================================
   Tanda C · Pantalla del ejercicio durante la sesión (solo teléfono; el reloj no cambia)
   Después de cada dibujo reacomoda la tarjeta del ejercicio sin quitar nada de lo que ya hacía:
   1. Barra de arriba: tiempo, cronómetro (⏱: tocar = iniciar/pausar, mantener = volver a cero) y Terminar.
   2. Franja de círculos (session.js/train2.js) más grandes, con ✓ y el "+" al final.
   3. Figura grande; 4. nombre grande con el equipo entre paréntesis (si el nombre no lo dice ya).
   5. Píldoras deslizables: Técnica · Reemplazar (alternativas de la Tanda B) · Ocupada · Notas ·
      Calentamiento · Descanso · Progreso · 🎵 (si hay música).
   6. Una línea del coach, el calentamiento plegable y la tabla Serie · Anterior · Kg · Reps · ✓
      (check redondo grande, fila hecha en verde); 7. "+ Añadir serie" a lo ancho.
   Debajo, en su orden de siempre: avisos, tu nota, "Anterior en…", el coach completo, barra y discos,
   drop set y notas. 8. Descanso fijo abajo: tiempo grande, −15 s, +15 s y Saltar.
   Sonido al marcar una serie (WebAudio, sin archivos): clic corto; ding si cierra el ejercicio.
   No suena al desmarcar ni encima del fin del descanso; respeta el modo silencio (alertCfg).
   Ajustes → Música y sonidos: `settings.setSound` y `settings.setVibe` (encendidos por defecto).
   ========================================================================== */
function suEqLabel(name) {
  const x = libFind(name); if (!x || !x.eq) return '';
  const nn = normName(name), has = l => { const w = normName(l).split(/\s+/).filter(t => t.length > 2); return !w.length || w.every(t => nn.indexOf(t) >= 0); };
  const spec = x.eq === 'cuerpo' ? 'Peso corporal' : (CAT_EQ[x.eq] ? CAT_EQ[x.eq][0].replace(/\s*\(.*\)$/, '') : ''), fam = (CAT_FAM.find(f => f[0] === equipOf(x)) || [])[1] || '';
  if (spec && !has(spec)) return spec;
  return fam && !has(fam) ? fam : '';
}
const suWarmLbl = 'Calentamiento';
function suCard(card, i) {
  const d = state.draft, e = d && d.exercises[i]; if (!card || !e || card.dataset.su) return;
  card.dataset.su = '1';
  const row0 = card.querySelector(':scope > .row'), h = row0 && row0.querySelector('h3');
  /* 4. Nombre con el equipo */
  const eqL = suEqLabel(e.name);
  if (h && eqL && !h.querySelector('.su-eq')) { const sp = document.createElement('span'); sp.className = 'su-eq'; sp.textContent = ` (${eqL})`; const t0 = Array.prototype.find.call(h.childNodes, n => n.nodeType === 3 && n.textContent.trim()); if (t0) h.insertBefore(sp, t0.nextSibling); else h.appendChild(sp); }
  /* 5. Píldoras: usan los mismos botones de siempre (mismas acciones) */
  const how = row0 && row0.querySelector('.how-btn'), busy = row0 && row0.querySelector('[data-act="busy"],[data-act="swap"]');
  const warm = card.querySelector('details.warm'), restChip = card.querySelector('.rest-chip');
  const p = document.createElement('div'); p.className = 'su-pills'; p.setAttribute('role', 'toolbar'); p.setAttribute('aria-label', 'Acciones del ejercicio');
  p.innerHTML = `<button type="button" class="su-p" data-act="how" data-name="${esc(e.name)}">${ic('book-open', 15)} Técnica</button>
    ${e.log.every(s => s.done) ? '' : `<button type="button" class="su-p" data-act="swap" data-ex="${i}">${ic('refresh-cw', 15)} Reemplazar</button><button type="button" class="su-p" data-act="busy" data-ex="${i}">${ic('timer', 15)} Ocupada</button>`}
    <button type="button" class="su-p" data-act="su-notes" data-ex="${i}">${ic('square-pen', 15)} Notas${e.note ? ' •' : ''}</button>
    ${warm ? `<button type="button" class="su-p" data-act="su-warm" data-ex="${i}">${ic('flame', 15)} ${suWarmLbl}</button>` : ''}
    <button type="button" class="su-p" data-act="ex-stats" data-name="${esc(e.name)}">${ic('trending-up', 15)} Progreso</button>
    ${state.settings.music ? '<button type="button" class="su-p" data-act="fs-music">🎵 Música</button>' : ''}`;
  if (restChip) { restChip.classList.add('su-p', 'su-rest'); p.insertBefore(restChip, p.querySelector('[data-act="ex-stats"]')); }
  if (how) how.classList.add('su-hide'); if (busy) busy.classList.add('su-hide');
  const top = card.querySelector(':scope > .ex-top'); if (top) top.classList.add('su-hide');
  /* 6. Línea del coach (toca para ver el detalle, que queda debajo de la tabla) */
  const cb = card.querySelector(':scope > .coach, :scope > .sugg'), cl = document.createElement('button');
  cl.type = 'button'; cl.className = 'su-coach'; cl.dataset.act = 'su-coach'; cl.dataset.ex = i;
  const ct = cb ? (cb.querySelector('.coach-h span:last-child, span:last-child') || cb).textContent.replace(/\s+/g, ' ').trim() : '';
  cl.innerHTML = `<b class="num">${e.target} × ${reps(e)}</b>${ct ? `<span>${esc(ct)}</span>` : ''}${cb ? ic('chevron-down', 15) : ''}`;
  /* Tabla: encabezado "Anterior" y "✓"; filas hechas en verde */
  const sets = card.querySelector(':scope > .sets');
  if (sets) {
    const hd = sets.querySelectorAll(':scope > .h'); if (hd[1]) hd[1].textContent = 'Anterior'; const last = sets.children[4]; if (last && !last.textContent) { last.textContent = '✓'; last.className = 'h su-ck'; }
    const cells = Array.prototype.slice.call(sets.children, 5);
    for (let k = 0; k + 4 < cells.length; k += 5) if (cells[k + 4].classList.contains('on')) for (let q = 0; q < 5; q++) cells[k + q].classList.add('su-done');
  }
  const ctl = card.querySelector(':scope > .st-ctl');
  if (ctl) { const add = ctl.querySelector('.st-b.add'); if (add) { add.innerHTML = `${ic('plus', 18)} Añadir serie`; ctl.insertBefore(add, ctl.firstChild); } }
  const dropB = card.querySelector('[data-act="drop-add"]'), dropRow = dropB && dropB.closest('.row');
  let at = row0; const put = el => { if (!el || !at) return; at.insertAdjacentElement('afterend', el); at = el; };
  if (warm && !e.wuo) warm.open = false;   /* plegado: la tabla queda a la vista (si lo abres, se respeta) */
  put(p); put(cl); put(warm); put(sets); put(ctl); put(dropRow);
}
/* 1. Cronómetro de la barra de arriba */
const suSw = () => (state.suSw = state.suSw || { run: false, t0: 0, acc: 0 });
const suSwSec = () => { const s = suSw(); return Math.floor((s.acc + (s.run ? Date.now() - s.t0 : 0)) / 1000); };
function suTop() {
  const top = document.querySelector('#sx .sx-top'); if (!top || top.querySelector('.su-sw')) return;
  const fin = top.querySelector('.fs-mbtn') || top.querySelector('.sx-fin'), s = suSw();
  if (fin) fin.insertAdjacentHTML('beforebegin', `<button type="button" class="su-sw ${s.run ? 'on' : ''}" data-act="su-sw" aria-label="Cronómetro: toca para iniciar o pausar; mantén presionado para volver a cero">${ic('timer', 16)}<span class="num" id="su-sw-t">${clock(suSwSec())}</span></button>`);
}
const _renderSu = render;
render = function () {
  _renderSu();
  const on = !!document.getElementById('sx') && !isWatch() && !!state.draft;
  document.body.classList.toggle('su-sess', on);
  if (!on) return;
  suTop();
  document.querySelectorAll('#sx-pager > .sx-page').forEach(pg => suCard(pg.querySelector('.card.ex'), +pg.dataset.i));
};
/* 8. Descanso: −15 s / +15 s (el teléfono; el reloj sigue con su pantalla) y el cronómetro */
const _tickSu = tick;
tick = function () {
  _tickSu();
  if (isWatch()) return;
  const el = document.getElementById('rest');
  if (el && !el.hidden) el.querySelectorAll('[data-act="rest-add"]').forEach(b => { const neg = +b.dataset.d < 0; if (Math.abs(+b.dataset.d) !== 15) { b.dataset.d = neg ? -15 : 15; b.textContent = neg ? '−15 s' : '+15 s'; b.setAttribute('aria-label', neg ? 'Quitar 15 segundos' : 'Agregar 15 segundos'); } });
  const t = document.getElementById('su-sw-t'); if (t && suSw().run) t.textContent = clock(suSwSec());
};

/* ---------- Sonido y vibración al marcar una serie ---------- */
function suChime(last) {
  const S = state.settings;
  if (S.setVibe !== false) { try { navigator.vibrate && navigator.vibrate(last ? [40, 70, 90] : 25); } catch (e) {} }
  if (S.setSound === false || (typeof alertCfg === 'function' && alertCfg().sound === 'silencio')) return;
  const r = state.rest; if (r && r.rang && Date.now() - r.end < 1500) return;   // no encima del fin del descanso
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.resume) actx.resume();
    const t0 = actx.currentTime + 0.01;
    const note = (f, d, dur, vol, type) => { const o = actx.createOscillator(), g = actx.createGain(); o.type = type; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t0 + d); g.gain.exponentialRampToValueAtTime(vol, t0 + d + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d + dur); o.connect(g); g.connect(actx.destination); o.start(t0 + d); o.stop(t0 + d + dur + 0.03); };
    if (last) { note(880, 0, 0.26, 0.2, 'triangle'); note(1760, 0, 0.18, 0.05, 'sine'); note(1318.5, 0.13, 0.34, 0.2, 'triangle'); note(2637, 0.13, 0.2, 0.04, 'sine'); }
    else { note(1568, 0, 0.09, 0.14, 'sine'); note(3136, 0, 0.05, 0.04, 'sine'); }
  } catch (e) {}
}
const _markSetSu = markSet;
markSet = function (i, j, v, k) {
  const d = state.draft, e = d && d.exercises[i], s = e && e.log[j], t = s && (k == null ? s : (s.drops || [])[k]);
  const was = !!(t && t.done), wasAll = !!(e && exComplete(e));
  _markSetSu(i, j, v, k);
  if (isWatch() || !e || was) return;
  const d2 = state.draft, e2 = d2 && d2.exercises[i], s2 = e2 && e2.log[j], t2 = s2 && (k == null ? s2 : (s2.drops || [])[k]);
  if (t2 && t2.done) suChime(!wasAll && exComplete(e2));
};

/* ---------- Ajustes → Música y sonidos ---------- */
const _fsCardSu = fsCard;
fsCard = function () {
  const h = _fsCardSu(), S = state.settings, sw = (act, on, t, sub) => `<div class="row su-set"><span class="grow"><b>${t}</b><br><span class="muted" style="font-size:12.5px">${sub}</span></span>
      <button type="button" class="switch ${on ? 'on' : ''}" style="border:0;cursor:pointer;margin-left:12px" data-act="${act}" role="switch" aria-checked="${on}" aria-label="${t}"><i></i></button></div>`;
  const add = sw('su-snd', S.setSound !== false, 'Sonido al marcar serie', 'Un clic corto; al cerrar el ejercicio, un ding. Respeta el modo silencio.') + sw('su-vib', S.setVibe !== false, 'Vibración al marcar serie', 'Una vibración breve en cada serie.');
  const at = h.indexOf('<div class="field">'); return at < 0 ? h : h.slice(0, at) + add + h.slice(at);
};

/* ---------- Eventos ---------- */
let suHold = null, suHeld = false;
document.addEventListener('pointerdown', ev => {
  const b = ev.target.closest && ev.target.closest('[data-act="su-sw"]'); if (!b) return;
  suHeld = false; clearTimeout(suHold);
  suHold = setTimeout(() => { suHeld = true; state.suSw = { run: false, t0: 0, acc: 0 }; const t = document.getElementById('su-sw-t'); if (t) t.textContent = '0:00'; b.classList.remove('on'); toast('Cronómetro en cero.'); }, 600);
}, true);
['pointerup', 'pointercancel', 'pointerleave'].forEach(n => document.addEventListener(n, () => clearTimeout(suHold), true));
document.addEventListener('click', ev => {
  const b = ev.target.closest && ev.target.closest('[data-act^="su-"]'); if (!b) return;
  ev.preventDefault(); ev.stopPropagation();
  const a = b.dataset.act, card = b.closest('.card.ex'), S = state.settings;
  if (a === 'su-sw') {
    if (suHeld) { suHeld = false; return; }
    const s = suSw(); if (s.run) { s.acc += Date.now() - s.t0; s.run = false; } else { s.t0 = Date.now(); s.run = true; }
    b.classList.toggle('on', s.run); const t = document.getElementById('su-sw-t'); if (t) t.textContent = clock(suSwSec());
  } else if (a === 'su-notes' && card) {
    const ta = card.querySelector('textarea.note-in'); if (ta) { ta.scrollIntoView({ block: 'center', behavior: 'smooth' }); setTimeout(() => { try { ta.focus({ preventScroll: true }); } catch (e) { ta.focus(); } }, 350); }
  } else if (a === 'su-warm' && card) {
    const w = card.querySelector('details.warm'); if (w) { w.open = true; w.scrollIntoView({ block: 'start', behavior: 'smooth' }); }
  } else if (a === 'su-coach' && card) {
    const c = card.querySelector(':scope > .coach, :scope > .sugg'); if (c) c.scrollIntoView({ block: 'center', behavior: 'smooth' });
  } else if (a === 'su-snd') { S.setSound = S.setSound === false; savePlans(); render(); if (S.setSound) suChime(false); }
  else if (a === 'su-vib') { S.setVibe = S.setVibe === false; savePlans(); render(); if (S.setVibe) { try { navigator.vibrate && navigator.vibrate(25); } catch (e) {} } }
}, true);
bootRender();
