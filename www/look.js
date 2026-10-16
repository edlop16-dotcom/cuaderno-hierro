// Pulido visual "Acero y discos" (solo teléfono): el color de un grupo nunca va solo.
// Bajo la barra de colores de "Te toca" va la leyenda con la forma, el nombre y cuántos ejercicios hay de cada grupo.
const _lkRender = render;
render = function () {
  const r = _lkRender.apply(this, arguments);
  if (isWatch()) return r;
  document.querySelectorAll('.hero .bars').forEach(b => {
    const nx = b.nextElementSibling;
    if (nx && nx.classList.contains('lk-leg')) return;
    const n = {};
    [...b.children].forEach(i => { const m = i.className.match(/\bt-(\S+)/); if (m) n[m[1]] = (n[m[1]] || 0) + 1; });
    const ks = TYPE_ORDER.filter(k => n[k]);
    if (ks.length) b.insertAdjacentHTML('afterend', `<div class="rt-leg lk-leg">${ks.map(k => `<span><i class="dot t-${k}"></i>${TYPE_LBL[k]} <b class="num">${n[k]}</b></span>`).join('')}</div>`);
  });
  return r;
};
