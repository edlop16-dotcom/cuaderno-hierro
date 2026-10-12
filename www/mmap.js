/* ==========================================================================
   Mapa muscular semanal: series por músculo de lunes a domingo.
   Músculo principal del ejercicio = 1 serie; otros músculos que trabaja = ½ serie.
   Zona efectiva para hipertrofia: 10 a 20 series por semana.
   ========================================================================== */
const MM_MAIN = ['pecho', 'esp', 'homb', 'bic', 'tri', 'cuad', 'isq', 'glu', 'pant'];
function zoneShares(name) {
  const x = libFind(name), zs = zonesOf(name).filter(k => k[0] !== '~');
  if (!zs.length) return {};
  let main = null;
  if (x && x.musc && x.musc.length) { const z = ZONES.find(q => q.re.test(normName(x.musc[0]))); if (z && zs.includes(z.k)) main = z.k; }
  if (!main) { const n = normName(name), z = ZONES.find(q => zs.includes(q.k) && q.re.test(n)); main = z ? z.k : zs[0]; }
  const o = {}; zs.forEach(k => o[k] = k === main ? 1 : 0.5); return o;
}
function weekSets(offset) {
  const ws = weekStartOf(new Date()); ws.setDate(ws.getDate() - 7 * (offset || 0));
  const we = new Date(ws); we.setDate(we.getDate() + 7);
  const out = {}; ZONES.forEach(z => out[z.k] = 0);
  const list = state.sessions.filter(s => { const t = new Date(s.date); return t >= ws && t < we; });
  list.forEach(s => s.exercises.forEach(e => { const sh = zoneShares(e.name), n = e.sets.length; for (const k in sh) out[k] += sh[k] * n; }));
  return { sets: out, n: list.length, ws };
}
const mmLvl = v => v <= 0 ? 0 : v < 5 ? 1 : v < 10 ? 2 : v <= 20 ? 3 : 4;
const MM_COL = ['var(--mm0)', 'var(--bad)', 'var(--warn)', 'var(--ok)', 'var(--core)'];
const MM_TXT = ['Sin series', 'Muy poco (<5)', 'Poco (5-9)', 'Zona efectiva (10-20)', 'Mucho (>20)'];

function bodySVG(sets) {
  const f = k => `fill="${MM_COL[mmLvl(sets[k] || 0)]}" data-z="${k}"`, N = 'fill="var(--mmb)"';
  const pair = (fn) => fn(0) + fn(1);
  const mir = (cx, i) => i ? 110 - cx : cx;
  const limbs = i => `<ellipse cx="${mir(24, i)}" cy="94" rx="5" ry="13" ${N}/><circle cx="${mir(22, i)}" cy="112" r="4" ${N}/><circle cx="${mir(46, i)}" cy="161" r="5" ${N}/><ellipse cx="${mir(45, i)}" cy="205" rx="6" ry="3.5" ${N}/>`;
  const front = `<g><ellipse cx="55" cy="17" rx="10" ry="12" ${N}/><rect x="50" y="28" width="10" height="9" rx="3" ${N}/>
    <path d="M41 100h28l-5 15H46z" ${N}/>
    ${pair(i => limbs(i) + `<ellipse cx="${mir(34, i)}" cy="47" rx="9" ry="8" ${f('homb')}/><ellipse cx="${mir(46, i)}" cy="53" rx="10" ry="9" ${f('pecho')}/><ellipse cx="${mir(28, i)}" cy="69" rx="6" ry="12" ${f('bic')}/><ellipse cx="${mir(46, i)}" cy="135" rx="9" ry="23" ${f('cuad')}/><ellipse cx="${mir(45, i)}" cy="184" rx="6" ry="15" ${f('pant')}/>`)}
    <rect x="42" y="64" width="26" height="35" rx="8" ${f('abd')}/></g>`;
  const back = `<g transform="translate(120 0)"><ellipse cx="55" cy="17" rx="10" ry="12" ${N}/><rect x="50" y="28" width="10" height="9" rx="3" ${N}/>
    <path d="M55 33L39 44 43 78h24l4-34z" ${f('esp')}/>
    ${pair(i => limbs(i) + `<ellipse cx="${mir(34, i)}" cy="47" rx="9" ry="8" ${f('homb')}/><ellipse cx="${mir(43, i)}" cy="64" rx="8" ry="15" ${f('esp')}/><ellipse cx="${mir(28, i)}" cy="69" rx="6" ry="12" ${f('tri')}/><ellipse cx="${mir(47, i)}" cy="108" rx="9" ry="9" ${f('glu')}/><ellipse cx="${mir(46, i)}" cy="137" rx="8" ry="20" ${f('isq')}/><ellipse cx="${mir(45, i)}" cy="182" rx="7" ry="16" ${f('pant')}/>`)}
    <rect x="47" y="79" width="16" height="19" rx="4" ${f('lumb')}/></g>`;
  return `<svg class="mm-svg" viewBox="0 0 230 214" role="img" aria-label="Mapa de series por músculo">${front}${back}
    <text x="55" y="213" text-anchor="middle">Frente</text><text x="175" y="213" text-anchor="middle">Espalda</text></svg>`;
}
function mmCard(compact) {
  const off = state.mmWeek || 0, W = weekSets(off), s = W.sets;
  const today = new Date(), daysLeft = off ? 0 : 7 - ((today.getDay() + 6) % 7) - 1;
  const short = MM_MAIN.filter(k => s[k] < 10).sort((a, b) => s[a] - s[b]);
  const rows = ZONES.map(z => z.k).sort((a, b) => s[b] - s[a]);
  return `<div class="card mm-card">
    <div class="row" style="justify-content:space-between"><h3>${ic('person-standing', 17)} Mapa muscular</h3>
      <div class="st-range"><button class="${!off ? 'on' : ''}" data-act="mm-wk" data-v="0">Esta semana</button><button class="${off ? 'on' : ''}" data-act="mm-wk" data-v="1">Pasada</button></div></div>
    <div class="muted" style="font-size:12.5px">${W.n} ${W.n === 1 ? 'sesión' : 'sesiones'} · desde el lunes ${fmtDate(W.ws)} · Para crecer, cada músculo necesita <b>10 a 20 series</b> por semana.</div>
    ${bodySVG(s)}
    <div class="mm-leg">${MM_TXT.map((t, i) => `<span><i style="background:${MM_COL[i]}"></i>${t}</span>`).join('')}</div>
    ${short.length && !off ? `<div class="safe ${daysLeft <= 2 ? 'warn' : 'tip'}">${ic('info', 16)}<span>${daysLeft > 0 ? `Quedan ${daysLeft} ${daysLeft === 1 ? 'día' : 'días'}. ` : ''}Te faltan series de <b>${short.slice(0, 4).map(k => zoneName(k).toLowerCase() + ` (${fmtKg(s[k])}/10)`).join(', ')}</b>${short.length > 4 ? ' y más' : ''}.${short.includes('pant') && soreMap().pant ? ' Las pantorrillas aún te duelen: súmalas poco a poco.' : ''}</span></div>` : ''}
    ${compact ? '' : `<div class="mm-rows">${rows.map(k => `<div class="mm-row"><span>${zoneName(k)}</span><div class="vol-track"><div class="zone" style="left:${10 / 24 * 100}%;width:${10 / 24 * 100}%"></div><div class="fill" style="width:${Math.min(100, s[k] / 24 * 100)}%;background:${MM_COL[mmLvl(s[k])]}"></div></div><b class="num">${fmtKg(s[k])}</b></div>`).join('')}</div>
    <div class="muted" style="font-size:11.5px">Músculo principal del ejercicio = 1 serie; los que ayudan = ½ serie.</div>`}
  </div>`;
}

/* Progreso: reemplaza "Series por grupo" por el mapa */
const _vProgressMM = vProgress;
vProgress = function () {
  const h = _vProgressMM();
  const a = h.indexOf('<div class="card"><div class="row" style="justify-content:space-between"><h3>Series por grupo'), b = h.indexOf('<h3 style="margin-top:4px">Por gimnasio</h3>');
  return a >= 0 && b > a ? h.slice(0, a) + mmCard() + h.slice(b) : h + mmCard();
};
/* Entrenar: aviso desde el miércoles si algún músculo va corto */
const _vTrainMM = vTrain;
vTrain = function () {
  const h = _vTrainMM();
  if (h.indexOf('id="sx"') >= 0 || isWatch() || state.draft) return h;
  const dow = (new Date().getDay() + 6) % 7; if (dow < 2) return h;
  const s = weekSets(0).sets, short = MM_MAIN.filter(k => s[k] < 10);
  if (!short.length) return h;
  return h + `<button class="sore-mini mm-mini" data-act="mm-open">${ic('person-standing', 16)}<span class="mm-mt">Esta semana te faltan series de <b>${short.slice(0, 3).map(k => zoneName(k).toLowerCase()).join(', ')}${short.length > 3 ? '…' : ''}</b></span><span class="muted">Ver mapa</span></button>`;
};
document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-act="mm-wk"],[data-act="mm-open"]'); if (!b) return;
  ev.stopPropagation();
  if (b.dataset.act === 'mm-open') { state.tab = 'profile'; state.profSub = 'progress'; render(); setTimeout(() => { const c = document.querySelector('.mm-card'); c && c.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, 60); return; }
  state.mmWeek = +b.dataset.v; const c = document.querySelector('.mm-card'); if (c) c.outerHTML = mmCard();
}, true);
render();
