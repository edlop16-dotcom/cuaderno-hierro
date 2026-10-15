/* ==========================================================================
   Agregar / quitar series a la vista (ajustes del gym, tanda 1, 15-oct-2026)
   - Teléfono: bajo la tabla de series de cada ejercicio, botones grandes
     "− Quitar serie" y "+ Agregar serie" (antes eran "+ Serie / − Serie" pequeños
     junto al drop set y no se encontraban).
   - Reloj: − y + a los lados de "Serie 1 de 3" en la pantalla de la serie, y
     "+ Una serie más" cuando el ejercicio está completo (antes solo en "⋯ Más").
   - Quitar borra la última serie sin hacer (nunca una ya marcada). Solo para hoy:
     la rutina no cambia.
   ========================================================================== */
function stAdd(i) {
  const d = state.draft, e = d && d.exercises[i]; if (!e) return;
  const l = e.log[e.log.length - 1];
  e.log.push({ w: l ? l.w : (e.sugg ? e.sugg.w : 0), r: null, done: false, drops: [] });
  e.target = e.log.length; d.lastAct = Date.now(); saveDraft();
  return true;
}
function stRm(i) {
  const d = state.draft, e = d && d.exercises[i]; if (!e) return false;
  if (e.log.length < 2) { toast('Debe quedar al menos una serie.'); return false; }
  let j = e.log.length - 1; while (j >= 0 && e.log[j].done) j--;
  if (j < 0) { toast('Todas las series están hechas. Desmarca una para quitarla.'); return false; }
  e.log.splice(j, 1); e.target = e.log.length; d.lastAct = Date.now(); saveDraft();
  return true;
}
const stCanRm = e => e.log.length > 1 && e.log.some(s => !s.done);

/* ---------- Teléfono ---------- */
function stDecor() {
  const d = state.draft; if (!d || isWatch()) return;
  const cards = document.querySelectorAll('#app .card.ex');
  d.exercises.forEach((e, i) => {
    const c = cards[i]; if (!c || c.querySelector('.st-ctl')) return;
    const sets = c.querySelector('.sets'); if (!sets) return;
    c.querySelectorAll('[data-act="add-set"],[data-act="rm-set"]').forEach(b => b.remove());
    sets.insertAdjacentHTML('afterend', `<div class="st-ctl">
      <button type="button" class="st-b" data-act="st-rm" data-ex="${i}" ${stCanRm(e) ? '' : 'disabled'} aria-label="Quitar una serie de ${esc(e.name)}">${ic('minus', 16)} Quitar serie</button>
      <button type="button" class="st-b add" data-act="st-add" data-ex="${i}" aria-label="Agregar una serie a ${esc(e.name)}">${ic('plus', 16)} Agregar serie</button></div>`);
  });
}
const _renderSt1 = render;
render = function () { _renderSt1(); try { stDecor(); } catch (e) {} };

/* ---------- Reloj ---------- */
const _vWatchSessionSt = vWatchSession;
vWatchSession = function () {
  let h = _vWatchSessionSt();
  const d = state.draft; if (!d || !isWatch() || (typeof w2 !== 'undefined' && (w2.menu || w2.pad))) return h;
  const i = Math.min(d.cur || 0, d.exercises.length - 1), e = d.exercises[i]; if (!e) return h;
  h = h.replace(/<div class="w2-sub">(Serie \d+ de \d+[^<]*)<\/div>/, (m, t) =>
    `<div class="w2-sub w2-subs"><button class="w2-sb" data-act="st-rm" data-ex="${i}" ${stCanRm(e) ? '' : 'disabled'} aria-label="Quitar una serie">−</button><span>${t}</span><button class="w2-sb" data-act="st-add" data-ex="${i}" aria-label="Agregar una serie">+</button></div>`);
  h = h.replace('<div class="w2-big ok">✓ Ejercicio completo</div>', m => m + `<button class="w2-mi w2-more1" data-act="st-add" data-ex="${i}">+ Una serie más</button>`);
  return h;
};

document.addEventListener('click', ev => {
  const b = ev.target.closest && ev.target.closest('[data-act="st-add"],[data-act="st-rm"]'); if (!b) return;
  ev.stopPropagation(); ev.preventDefault();
  if (!state.draft || b.disabled) return;
  const i = +b.dataset.ex, add = b.dataset.act === 'st-add';
  if (!(add ? stAdd(i) : stRm(i))) return;
  try { HAP && HAP.impact({ style: 'LIGHT' }); } catch (x) {}
  render();
  const e = state.draft.exercises[i];
  toast(add ? `Serie agregada: ${e.log.length} en total` : `Serie quitada: quedan ${e.log.length}`);
}, true);
render();
