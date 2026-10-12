/* ==========================================================================
   Borrar rutina: botón 🗑 dentro de cada rutina (pestaña Rutinas) y en la vista previa
   que se abre al tocar una rutina en Entrenar. Pide confirmar con un segundo toque.
   ========================================================================== */
function dayDelete(pid, did) {
  const p = state.plans.find(x => x.id === pid); if (!p) return null;
  const d = p.days.find(x => x.id === did); if (!d) return null;
  p.days = p.days.filter(x => x.id !== did);
  if (state.rtOpen) delete state.rtOpen[did];
  savePlans(); return d;
}
const delBtn = (pid, did, cls) => `<button class="btn small danger ${cls || ''}" data-act="day-trash" data-plan="${pid}" data-day="${did}">${state.dayDel === did ? '¿Borrar esta rutina? Toca otra vez' : ic('trash-2', 15) + ' Borrar rutina'}</button>`;

/* Rutinas: en la rutina desplegada */
const _vPlansDel = vPlans;
vPlans = function () {
  return _vPlansDel().replace(/(<button class="btn small" data-act="edit-day" data-plan="([^"]+)" data-day="([^"]+)">[\s\S]*?<\/button>)(<\/div>\s*<\/div>)/g, (m, btn, pid, did, end) => btn + delBtn(pid, did) + end);
};
/* Vista previa (al tocar una rutina en Entrenar) */
const _previewDel = previewSheet;
previewSheet = function (pid, did) {
  _previewDel(pid, did);
  const go = document.querySelector('#sheet .pv-go'); if (go) go.insertAdjacentHTML('afterend', delBtn(pid, did, 'block pv-del'));
};
document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-act="day-trash"]'); if (!b) return;
  ev.stopPropagation(); ev.preventDefault();
  const pid = b.dataset.plan, did = b.dataset.day, inSheet = !!b.closest('#sheet');
  if (state.dayDel !== did) {
    state.dayDel = did; b.textContent = '¿Borrar esta rutina? Toca otra vez';
    clearTimeout(dayDelete.t); dayDelete.t = setTimeout(() => { if (state.dayDel === did) { state.dayDel = null; if (document.body.contains(b)) b.innerHTML = ic('trash-2', 15) + ' Borrar rutina'; } }, 4000);
    return;
  }
  state.dayDel = null;
  const d = dayDelete(pid, did);
  if (inSheet) closeSheet();
  render(); if (d) toast(`Rutina "${d.name}" borrada`);
}, true);
