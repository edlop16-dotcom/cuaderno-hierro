/* ==========================================================================
   Mi cuerpo (Perfil → Cuerpo)
   - Peso corporal con promedio semanal (el número del día varía 1-2 kg por agua y sal).
   - Medidas mensuales con cinta, cada una con su gráfica.
   - Fotos de progreso (frente, perfil, espalda): solo en este teléfono (IndexedDB), no se suben.
   - Grasa estimada (método de la Marina de EE. UU.), FFMI y tu potencial natural
     (Casey Butt, con muñeca y tobillo). Todo es una estimación orientativa.
   ========================================================================== */
const MEAS = [
  ['neck', 'Cuello', 'Debajo de la nuez, cinta recta.'],
  ['chest', 'Pecho', 'Por los pezones, brazos abajo, sin inflar.'],
  ['waist', 'Cintura', 'A la altura del ombligo, relajado, al final de exhalar.'],
  ['hip', 'Cadera', 'En la parte más ancha de los glúteos.'],
  ['arm', 'Brazo', 'Contraído, en la parte más gruesa del bíceps.'],
  ['thigh', 'Muslo', 'Parte más gruesa, justo bajo el glúteo.'],
  ['calf', 'Pantorrilla', 'Parte más gruesa, de pie.'],
];
const MEAS_NAME = k => (MEAS.find(m => m[0] === k) || [k, k])[1];
const num = v => { const n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isFinite(n) && n > 0 ? n : null; };
const r1 = v => Math.round(v * 10) / 10;
/* Estatura: acepta cm (170) o metros con punto o coma (1,70 · 1.7) y devuelve cm; null si no está entre 120 y 230 cm */
const parseCm = v => { const n = num(v); if (!n) return null; const cm = n >= 1 && n <= 2.5 ? Math.round(n * 100) : n; return cm >= 120 && cm <= 230 ? r1(cm) : null; };
const CM_MSG = 'Escribe tu estatura en cm, ej. 170 (o en metros, 1,70)';

function body() {
  const b = state.settings.body = state.settings.body || {};
  if (!b.h) b.h = HISTORY.cm || 170;
  if (!b.sex) b.sex = 'm';
  b.w = b.w || []; b.m = b.m || [];
  return b;
}
const saveBody = () => { syncHistory(); savePlans(); };

/* Peso: promedios por semana (lunes a domingo) */
function weekAvgs() {
  const by = {};
  body().w.forEach(x => { const k = dk(weekStartOf(x.d + 'T12:00:00')); (by[k] = by[k] || []).push(x.kg); });
  return Object.keys(by).sort().map(k => ({ d: k, v: by[k].reduce((a, b) => a + b, 0) / by[k].length, n: by[k].length }));
}
function curWeight() { const wa = weekAvgs(); return wa.length ? wa[wa.length - 1].v : HISTORY.kg; }
function lastMeas() { const o = {}; body().m.slice().sort((a, b) => a.d.localeCompare(b.d)).forEach(x => MEAS.forEach(([k]) => { if (x[k]) o[k] = { v: x[k], d: x.d }; })); return o; }
function firstMeas(k) { const x = body().m.slice().sort((a, b) => a.d.localeCompare(b.d)).find(y => y[k]); return x ? x[k] : null; }
function syncHistory() { const b = body(); HISTORY.cm = b.h; if (b.w.length) HISTORY.kg = r1(curWeight()); }

/* Grasa (Marina de EE. UU., en cm), FFMI y potencial (Casey Butt) */
function bodyFat() {
  const b = body(), m = lastMeas(), h = b.h;
  if (!m.waist || !m.neck) return null;
  let bf;
  if (b.sex === 'f') { if (!m.hip) return null; bf = 495 / (1.29579 - 0.35004 * Math.log10(m.waist.v + m.hip.v - m.neck.v) + 0.221 * Math.log10(h)) - 450; }
  else { if (m.waist.v <= m.neck.v) return null; bf = 495 / (1.0324 - 0.19077 * Math.log10(m.waist.v - m.neck.v) + 0.15456 * Math.log10(h)) - 450; }
  return Math.max(3, Math.min(50, bf));
}
function ffmiOf(kg, bf, hcm) { const h = hcm / 100, lean = kg * (1 - bf / 100); return { lean, ffmi: lean / (h * h), adj: lean / (h * h) + 6.1 * (1.8 - h) }; }
function potential() {
  const b = body(); if (!b.wrist || !b.ankle) return null;
  const H = b.h / 2.54, W = b.wrist / 2.54, A = b.ankle / 2.54, inch = v => v * 2.54;
  const lbm = bf => Math.pow(H, 1.5) * (Math.sqrt(W) / 22.667 + Math.sqrt(A) / 17.0104) * (bf / 224 + 1) * 0.4536;
  return {
    lean10: lbm(10), kg10: lbm(10) / 0.9, kg12: lbm(12) / 0.88,
    meas: { chest: inch(1.6817 * W + 1.3759 * A + 0.3314 * H), arm: inch(1.2033 * W + 0.1236 * H), neck: inch(1.1424 * W + 0.1236 * H), thigh: inch(1.3868 * A + 0.1805 * H), calf: inch(0.9298 * A + 0.121 * H) },
  };
}

/* Gráfica simple de línea */
function bodyChart(pts, unit, extra) {
  if (!pts.length) return '';
  const W = 340, H = 140, L = 38, R = 10, T = 12, B = 20;
  const all = pts.concat(extra || []), vals = all.map(p => p.v);
  let lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
  const pad = Math.max(0.5, (hi - lo) * 0.2); lo = Math.floor((lo - pad) * 2) / 2; hi = Math.ceil((hi + pad) * 2) / 2;
  const ts = all.map(p => new Date(p.d + 'T12:00:00').getTime()), t0 = Math.min.apply(null, ts), t1 = Math.max.apply(null, ts);
  const x = p => t1 === t0 ? (L + W - R) / 2 : L + (new Date(p.d + 'T12:00:00').getTime() - t0) / (t1 - t0) * (W - L - R);
  const y = v => T + (1 - (v - lo) / Math.max(0.1, hi - lo)) * (H - T - B);
  const line = ps => ps.map((p, i) => `${i ? 'L' : 'M'}${x(p).toFixed(1)},${y(p.v).toFixed(1)}`).join('');
  const ticks = [lo, (lo + hi) / 2, hi];
  return `<svg class="chart bd-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Gráfica en ${unit}">
    ${ticks.map(t => `<line x1="${L}" x2="${W - R}" y1="${y(t)}" y2="${y(t)}" stroke="var(--line)"/><text x="${L - 5}" y="${y(t) + 3}" text-anchor="end">${fmtKg(r1(t))}</text>`).join('')}
    ${extra && extra.length ? extra.map(p => `<circle cx="${x(p).toFixed(1)}" cy="${y(p.v).toFixed(1)}" r="2.5" fill="var(--muted)" opacity=".55"/>`).join('') : ''}
    ${pts.length > 1 ? `<path d="${line(pts)}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>` : ''}
    ${pts.map(p => `<circle cx="${x(p).toFixed(1)}" cy="${y(p.v).toFixed(1)}" r="3.5" fill="var(--accent)" stroke="var(--surface)" stroke-width="1.5"/>`).join('')}
    <text x="${L}" y="${H - 4}">${fmtDate(all.reduce((a, p) => p.d < a ? p.d : a, all[0].d) + 'T12:00:00')}</text>
    <text x="${W - R}" y="${H - 4}" text-anchor="end">${fmtDate(all.reduce((a, p) => p.d > a ? p.d : a, all[0].d) + 'T12:00:00')}</text></svg>`;
}
const delta = (v, unit, good) => { if (v == null || Math.abs(v) < 0.05) return `<span class="bd-d">=</span>`; const up = v > 0; return `<span class="bd-d ${good == null ? '' : (up === good ? 'g' : 'b')}">${up ? '+' : '−'}${fmtKg(r1(Math.abs(v)))}${unit}</span>`; };

/* ---------- Vista ---------- */
function vBody() {
  const b = body(), wa = weekAvgs(), lm = lastMeas(), todayK = dk(new Date());
  const tw = b.w.find(x => x.d === todayK);
  const cur = wa[wa.length - 1], prev = wa[wa.length - 2];
  const daily = b.w.slice().sort((a, c) => a.d.localeCompare(c.d)).slice(-60).map(x => ({ d: x.d, v: x.kg }));
  const thisWk = cur && cur.d === dk(weekStartOf(new Date()));
  const sel = state.bodyM && MEAS.some(m => m[0] === state.bodyM) ? state.bodyM : 'waist';
  const mPts = b.m.filter(x => x[sel]).sort((a, c) => a.d.localeCompare(c.d)).map(x => ({ d: x.d, v: x[sel] }));
  const lastMd = b.m.reduce((a, x) => x.d > a ? x.d : a, '');
  const dueM = !lastMd || (Date.now() - new Date(lastMd + 'T12:00:00')) / 864e5 >= 28;
  const bf = bodyFat(), kg = curWeight(), f = bf != null ? ffmiOf(kg, bf, b.h) : null, pot = potential();
  const whr = lm.waist ? lm.waist.v / b.h : null;
  const realKg = 22 * Math.pow(b.h / 100, 2) / 0.88;
  const scale = v => Math.max(0, Math.min(100, (v - 16) / 10 * 100));

  return `
  <div class="card bd-card">
    <div class="row" style="justify-content:space-between"><h3>${ic('activity', 17)} Peso corporal</h3><button class="btn small ghost" data-act="bd-data">${ic('settings', 14)} Tus datos</button></div>
    <div class="bd-big"><div><b class="num">${cur ? fmtKg(r1(cur.v)) : '—'}</b><span> kg</span></div>
      <div class="muted">${cur ? `Promedio ${thisWk ? 'de esta semana' : 'de tu última semana'} · ${cur.n} ${cur.n === 1 ? 'pesaje' : 'pesajes'}` : 'Aún no registras tu peso'}${prev ? `<br>vs semana anterior ${delta(cur.v - prev.v, ' kg')}` : ''}</div></div>
    <form class="row bd-wform" id="f-bdw"><span class="bd-in grow"><input id="bd-kg" inputmode="decimal" placeholder="${tw ? fmtKg(tw.kg) : fmtKg(HISTORY.kg)}" aria-label="Peso de hoy en kg" aria-describedby="bd-e-kg"><i class="pb-u bw" aria-hidden="true">kg</i></span><button class="btn primary" type="submit">${tw ? 'Cambiar hoy' : 'Guardar peso de hoy'}</button></form><small class="bd-err" id="bd-e-kg" role="alert" hidden></small>
    <div class="muted bd-tip">Pésate 3-4 veces por semana, en ayunas y después del baño. Mira el <b>promedio semanal</b>: el número de un día sube o baja 1-2 kg por agua y sal.</div>
    ${wa.length ? bodyChart(wa.map(x => ({ d: x.d, v: r1(x.v) })), 'kg', daily) + '<div class="bd-leg"><span><i class="a"></i>Promedio semanal</span><span><i class="m"></i>Pesajes</span></div>' : ''}
  </div>

  <div class="card bd-card">
    <div class="row" style="justify-content:space-between"><h3>${ic('ruler', 17)} Medidas</h3>${lastMd ? `<span class="chip">${fmtDate(lastMd + 'T12:00:00')}</span>` : ''}</div>
    ${dueM ? `<div class="safe tip">${ic('info', 16)}<span>${lastMd ? 'Ya pasó un mes: toca medirte de nuevo.' : 'Mídete una vez al mes con una cinta métrica, a la misma hora y relajado.'}</span></div>` : ''}
    <div class="bd-grid">${MEAS.map(([k, n]) => { const v = lm[k], f0 = firstMeas(k); return `<button class="bd-m ${sel === k ? 'on' : ''}" data-act="bd-msel" data-k="${k}"><span>${n}</span><b class="num">${v ? fmtKg(v.v) : '—'}</b>${v && f0 != null && f0 !== v.v ? delta(v.v - f0, '', k !== 'waist') : '<span class="bd-d">cm</span>'}</button>`; }).join('')}</div>
    ${mPts.length ? `<div class="label">${MEAS_NAME(sel)} (cm)</div>${bodyChart(mPts, 'cm')}` : ''}
    <button class="btn ${dueM ? 'primary' : ''} block" data-act="bd-meas">${ic('plus', 16)} Registrar medidas</button>
  </div>

  <div class="card bd-card">
    <h3>${ic('gauge', 17)} Composición estimada</h3>
    ${bf == null ? `<div class="muted">Registra <b>cintura</b> y <b>cuello</b>${b.sex === 'f' ? ' y <b>cadera</b>' : ''} para estimar tu grasa corporal.</div>` : `
    <div class="bd-3"><div><b class="num">${fmtKg(r1(bf))}%</b><span>Grasa</span></div><div><b class="num">${fmtKg(r1(f.lean))}</b><span>kg magros</span></div><div><b class="num">${fmtKg(r1(f.adj))}</b><span>FFMI</span></div></div>
    <div class="ffmi"><div class="ffmi-bar"><i style="left:${scale(f.adj)}%"></i></div>
      <div class="ffmi-ticks"><span style="left:${scale(18)}%">18<br>promedio</span><span style="left:${scale(20)}%">20<br>entrenado</span><span style="left:${scale(22)}%">22<br>avanzado</span><span style="left:${scale(25)}%">25<br>tope natural</span></div></div>
    <div class="muted bd-tip">El FFMI es tu masa magra según tu estatura. Sin esteroides, casi nadie pasa de 25. La grasa se estima con el método de la Marina de EE. UU. (cintura, cuello y estatura): puede fallar ±3-4 %, pero sirve para ver si baja o sube.</div>`}
    ${whr ? `<div class="bd-row"><span>Cintura / estatura</span><b class="num ${whr < 0.5 ? 'okc' : 'badc'}">${whr.toFixed(2)}</b><small class="muted">${whr < 0.5 ? 'Saludable (menos de 0,50)' : 'Meta: menos de 0,50 → cintura < ' + fmtKg(Math.round(b.h * 0.5)) + ' cm'}</small></div>` : ''}
  </div>

  <div class="card bd-card">
    <h3>${ic('target', 17)} Tu potencial</h3>
    <div class="bd-row"><span>Meta realista (FFMI 22 con 12 % de grasa)</span><b class="num">${fmtKg(r1(realKg))} kg</b></div>
    <div class="muted bd-tip">${Math.abs(realKg - kg) <= 3 ? `Estás cerca de ese peso: tu meta no es subir de peso sino <b>cambiar grasa por músculo</b> (recomposición). Mira la cintura y las medidas, no solo la balanza.` : realKg > kg ? `Te faltan unos <b>${fmtKg(Math.round(realKg - kg))} kg</b> de músculo: un volumen limpio (unas 250 kcal sobre tu mantenimiento) te ayudaría.` : `Estás por encima: prioriza bajar grasa poco a poco (0,5 % de tu peso por semana) sin dejar de entrenar fuerte.`}</div>
    ${pot ? `<div class="label" style="margin-top:4px">Máximo natural estimado (a largo plazo)</div>
      <div class="bd-row"><span>Peso con 10 % de grasa</span><b class="num">${fmtKg(r1(pot.kg10))} kg</b></div>
      ${['chest', 'arm', 'neck', 'thigh', 'calf'].map(k => { const mx = pot.meas[k], v = lm[k] && lm[k].v, pc = v ? Math.min(100, v / mx * 100) : 0;
        return `<div class="pot"><div class="row" style="justify-content:space-between"><span>${MEAS_NAME(k)}</span><span class="num">${v ? fmtKg(v) + ' / ' : ''}<b>${fmtKg(r1(mx))} cm</b></span></div>
        <div class="pot-bar"><i style="width:${pc}%"></i></div>${v ? `<small class="muted">${pc >= 97 ? 'Ya estás en tu máximo estimado' : `Te faltan ${fmtKg(r1(mx - v))} cm (${Math.round(pc)} % de tu potencial)`}</small>` : ''}</div>`; }).join('')}
      <div class="muted bd-tip">Fórmulas de Casey Butt según tu estructura ósea (muñeca y tobillo), para alguien natural con muchos años de entrenamiento. El pecho y el muslo dependen también de la grasa: compáralos con la cintura.</div>`
    : `<div class="muted">Para calcular tus medidas máximas naturales, mide una vez tu <b>muñeca</b> (bajo el hueso, del lado de la mano) y tu <b>tobillo</b> (la parte más delgada) en <b>Tus datos</b>.</div><button class="btn small" data-act="bd-data">Agregar muñeca y tobillo</button>`}
    <div class="safe tip">${ic('info', 16)}<span>Son estimaciones orientativas, no un diagnóstico. Si tienes dudas de salud o nutrición, consulta a un profesional.</span></div>
  </div>

  <div class="card bd-card" id="bd-photos">
    <div class="row" style="justify-content:space-between"><h3>${ic('camera', 17)} Fotos de progreso</h3><span class="chip">${ic('lock', 12)} Solo en tu teléfono</span></div>
    <div id="bd-ph-list"><div class="muted">Cargando…</div></div>
    <div class="row"><button class="btn primary grow" data-act="bd-ph-add">${ic('camera', 16)} Fotos de hoy</button><button class="btn grow" data-act="bd-ph-cmp" id="bd-cmp-btn" hidden>${ic('columns-2', 16)} Comparar</button></div>
    <div class="muted bd-tip">Cada 4 semanas, con la misma luz, ropa y distancia: frente, perfil y espalda. No se suben a la nube.</div>
  </div>`;
}

/* ---------- Fotos (IndexedDB, solo en el equipo) ---------- */
const POSES = [['front', 'Frente'], ['side', 'Perfil'], ['back', 'Espalda']];
const phDB = {
  db: null,
  open(cb) {
    if (this.db) return cb(this.db);
    if (!window.indexedDB) return cb(null);
    try {
      const rq = indexedDB.open('forja-fotos', 1);
      rq.onupgradeneeded = () => rq.result.createObjectStore('p', { keyPath: 'id' });
      rq.onsuccess = () => { this.db = rq.result; cb(this.db); };
      rq.onerror = () => cb(null);
    } catch (e) { cb(null); }
  },
  all(cb) { this.open(db => { if (!db) return cb([]); const out = [], c = db.transaction('p').objectStore('p').openCursor(); c.onsuccess = () => { const cu = c.result; if (cu) { out.push(cu.value); cu.continue(); } else cb(out); }; c.onerror = () => cb(out); }); },
  put(o, cb) { this.open(db => { if (!db) return cb && cb(false); const t = db.transaction('p', 'readwrite'); t.objectStore('p').put(o); t.oncomplete = () => cb && cb(true); t.onerror = () => cb && cb(false); }); },
  del(id, cb) { this.open(db => { if (!db) return cb && cb(); const t = db.transaction('p', 'readwrite'); t.objectStore('p').delete(id); t.oncomplete = () => cb && cb(); }); },
};
function phByDate(list) { const by = {}; list.forEach(p => { (by[p.d] = by[p.d] || {})[p.pose] = p; }); return Object.keys(by).sort().reverse().map(d => ({ d, p: by[d] })); }
function fillPhotos() {
  const box = document.getElementById('bd-ph-list'); if (!box) return;
  phDB.all(list => {
    const g = phByDate(list), btn = document.getElementById('bd-cmp-btn');
    if (btn) btn.hidden = g.length < 2;
    box.innerHTML = g.length ? g.slice(0, 4).map(x => `<div class="ph-day"><div class="label">${fmtDate(x.d + 'T12:00:00')}</div><div class="ph-row">${POSES.map(([k, n]) => x.p[k] ? `<img src="${x.p[k].img}" alt="${n} ${x.d}">` : `<span class="ph-none">${n}</span>`).join('')}</div></div>`).join('')
      : `<div class="muted">Aún no tienes fotos. La primera es la más importante: es tu punto de partida.</div>`;
  });
}
function shrink(file, cb) {
  const fr = new FileReader();
  fr.onload = () => { const im = new Image(); im.onload = () => {
    const M = 900, k = Math.min(1, M / Math.max(im.width, im.height)), c = document.createElement('canvas');
    c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
    c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); cb(c.toDataURL('image/jpeg', 0.8));
  }; im.onerror = () => cb(null); im.src = fr.result; };
  fr.onerror = () => cb(null); fr.readAsDataURL(file);
}
function photoSheet() {
  const d = dk(new Date());
  phDB.all(list => {
    const mine = {}; list.filter(p => p.d === d).forEach(p => mine[p.pose] = p);
    openSheet(`<div class="row"><h2 class="grow">Fotos de hoy</h2><button class="icon-btn" data-act="sheet-close" aria-label="Cerrar">${ic('x', 18)}</button></div>
      <div class="muted" style="font-size:12.5px">Misma luz y distancia, de pie y relajado. Se guardan solo en este teléfono.</div>
      <div class="ph-slots">${POSES.map(([k, n]) => `<label class="ph-slot ${mine[k] ? 'has' : ''}">${mine[k] ? `<img src="${mine[k].img}" alt="${n}">` : `${ic('camera', 22)}`}<span>${n}</span>
        <input type="file" accept="image/*" data-pose="${k}" hidden>${mine[k] ? `<button type="button" class="ph-x" data-act="bd-ph-del" data-id="${d}|${k}" aria-label="Borrar foto ${n}">${ic('x', 14)}</button>` : ''}</label>`).join('')}</div>
      <button class="btn primary block" data-act="sheet-close">Listo</button>`);
  });
}
function compareSheet() {
  phDB.all(list => {
    const g = phByDate(list); if (g.length < 2) return;
    const a = state.phA && g.some(x => x.d === state.phA) ? state.phA : g[g.length - 1].d, b = state.phB && g.some(x => x.d === state.phB) ? state.phB : g[0].d;
    const pose = state.phPose || 'front', A = g.find(x => x.d === a), B = g.find(x => x.d === b);
    const sel = (id, v) => `<select id="${id}">${g.map(x => `<option value="${x.d}" ${x.d === v ? 'selected' : ''}>${fmtDate(x.d + 'T12:00:00')}</option>`).join('')}</select>`;
    const im = (x, k) => x.p[k] ? `<img src="${x.p[k].img}" alt="">` : `<span class="ph-none">Sin foto</span>`;
    openSheet(`<div class="row"><h2 class="grow">Comparar</h2><button class="icon-btn" data-act="sheet-close" aria-label="Cerrar">${ic('x', 18)}</button></div>
      <div class="seg seg3">${POSES.map(([k, n]) => `<button class="${pose === k ? 'on' : ''}" data-act="bd-ph-pose" data-k="${k}">${n}</button>`).join('')}</div>
      <div class="ph-cmp"><div>${sel('ph-a', a)}${im(A, pose)}</div><div>${sel('ph-b', b)}${im(B, pose)}</div></div>`);
  });
}
document.addEventListener('change', ev => {
  const t = ev.target;
  if (t.matches && t.matches('.ph-slot input[type=file]') && t.files && t.files[0]) {
    const pose = t.dataset.pose, d = dk(new Date());
    toast('Guardando foto…');
    shrink(t.files[0], img => {
      if (!img) { toast('No pude leer esa imagen.'); return; }
      phDB.put({ id: d + '|' + pose, d, pose, img, at: Date.now() }, ok => { toast(ok ? 'Foto guardada en tu teléfono' : 'No se pudo guardar la foto'); photoSheet(); fillPhotos(); });
    });
  }
  if (t.id === 'ph-a' || t.id === 'ph-b') { state[t.id === 'ph-a' ? 'phA' : 'phB'] = t.value; compareSheet(); }
});

/* ---------- Hojas: datos y medidas ---------- */
/* Validación con mensaje bajo el campo (estatura en cm o metros, muñeca, tobillo y peso de hoy) */
const BD_CHK = {
  h: [v => parseCm(v) != null, CM_MSG],
  wr: [v => { const n = num(v); return !!n && n < 30; }, 'Escribe la muñeca en cm, ej. 17'],
  an: [v => { const n = num(v); return !!n && n < 40; }, 'Escribe el tobillo en cm, ej. 22'],
  kg: [v => { const n = num(v); return !!n && n >= 25 && n <= 300; }, 'Escribe tu peso en kg, ej. 72,5'],
};
/* Vacío no es error salvo en el peso al guardarlo (estatura vacía = se deja la que había) */
const bdErr = k => { const el = $('#bd-' + k); if (!el) return ''; const v = el.value.trim(); if (!v) return k === 'kg' ? BD_CHK.kg[1] : ''; return BD_CHK[k][0](v) ? '' : BD_CHK[k][1]; };
function bdShowErr(k, force) {
  const el = $('#bd-e-' + k), inp = $('#bd-' + k); if (!el || !inp) return;
  const m = bdErr(k), show = !!m && (force || !!inp.value.trim());
  el.textContent = show ? m : ''; el.hidden = !show; inp.setAttribute('aria-invalid', show ? 'true' : 'false');
}
document.addEventListener('input', ev => { const k = { 'bd-h': 'h', 'bd-wr': 'wr', 'bd-an': 'an', 'bd-kg': 'kg' }[ev.target.id]; if (k && !bdErr(k)) bdShowErr(k); });
document.addEventListener('focusout', ev => {
  const k = { 'bd-h': 'h', 'bd-wr': 'wr', 'bd-an': 'an' }[ev.target.id]; if (!k) return;
  if (k === 'h') { const c = parseCm(ev.target.value); if (c != null) ev.target.value = String(c).replace('.', ','); }
  bdShowErr(k);
});
function dataSheet() {
  const b = body();
  openSheet(`<div class="row"><h2 class="grow">Tus datos</h2><button class="icon-btn" data-act="sheet-close" aria-label="Cerrar">${ic('x', 18)}</button></div>
    <form id="f-bdd" class="bd-form">
      <label class="field"><span class="label">Estatura</span><span class="bd-in"><input id="bd-h" inputmode="decimal" maxlength="5" value="${b.h ? String(b.h).replace('.', ',') : ''}" placeholder="170" aria-describedby="bd-e-h"><i class="pb-u" aria-hidden="true">cm</i></span><small class="bd-err" id="bd-e-h" role="alert" hidden></small></label>
      <div class="field"><span class="label">Sexo (para la fórmula de grasa)</span><div class="seg"><button type="button" class="${b.sex !== 'f' ? 'on' : ''}" data-act="bd-sex" data-v="m">Hombre</button><button type="button" class="${b.sex === 'f' ? 'on' : ''}" data-act="bd-sex" data-v="f">Mujer</button></div></div>
      <label class="field"><span class="label">Muñeca (cm) · bajo el hueso, del lado de la mano</span><span class="bd-in"><input id="bd-wr" inputmode="decimal" value="${b.wrist || ''}" placeholder="Ej. 17" aria-describedby="bd-e-wr"><i class="pb-u" aria-hidden="true">cm</i></span><small class="bd-err" id="bd-e-wr" role="alert" hidden></small></label>
      <label class="field"><span class="label">Tobillo (cm) · la parte más delgada</span><span class="bd-in"><input id="bd-an" inputmode="decimal" value="${b.ankle || ''}" placeholder="Ej. 22" aria-describedby="bd-e-an"><i class="pb-u" aria-hidden="true">cm</i></span><small class="bd-err" id="bd-e-an" role="alert" hidden></small></label>
      <button class="btn primary block" type="submit">Guardar</button></form>
    ${b.w.length || b.m.length ? `<div class="label" style="margin-top:6px">Tus registros</div><div class="bd-recs">
      ${b.w.slice().sort((x, y) => y.d.localeCompare(x.d)).map(x => `<div class="bd-rec"><span>${fmtDate(x.d + 'T12:00:00')}</span><b class="num">${fmtKg(x.kg)} kg</b><button class="icon-btn" data-act="bd-del" data-t="w" data-d="${x.d}" aria-label="Borrar peso">${ic('trash-2', 14)}</button></div>`).join('')}
      ${b.m.slice().sort((x, y) => y.d.localeCompare(x.d)).map(x => `<div class="bd-rec"><span>${fmtDate(x.d + 'T12:00:00')}</span><small class="muted">${MEAS.filter(([k]) => x[k]).map(([k, n]) => n + ' ' + fmtKg(x[k])).join(' · ')}</small><button class="icon-btn" data-act="bd-del" data-t="m" data-d="${x.d}" aria-label="Borrar medidas">${ic('trash-2', 14)}</button></div>`).join('')}</div>` : ''}`);
}
function measSheet() {
  const lm = lastMeas(), d = dk(new Date()), td = body().m.find(x => x.d === d) || {};
  openSheet(`<div class="row"><h2 class="grow">Medidas de hoy</h2><button class="icon-btn" data-act="sheet-close" aria-label="Cerrar">${ic('x', 18)}</button></div>
    <div class="muted" style="font-size:12.5px">En centímetros, con la cinta pegada a la piel sin apretar. Deja vacío lo que no midas.</div>
    <form id="f-bdm" class="bd-form">${MEAS.map(([k, n, how]) => `<label class="field bd-mf"><span class="label">${n}</span><input id="bdm-${k}" inputmode="decimal" value="${td[k] || ''}" placeholder="${lm[k] ? fmtKg(lm[k].v) : 'cm'}"><small class="muted">${how}</small></label>`).join('')}
      <button class="btn primary block" type="submit">Guardar medidas</button></form>`);
}

document.addEventListener('submit', ev => {
  const f = ev.target;
  if (f.id === 'f-bdw') {
    ev.preventDefault();
    const kg = num($('#bd-kg').value); if (bdErr('kg')) { bdShowErr('kg', true); $('#bd-kg').focus(); return; }
    const b = body(), d = dk(new Date()); b.w = b.w.filter(x => x.d !== d).concat([{ d, kg: r1(kg) }]);
    saveBody(); toast(`Peso guardado: ${fmtKg(r1(kg))} kg`); render();
  } else if (f.id === 'f-bdm') {
    ev.preventDefault();
    const b = body(), d = dk(new Date()), o = { d }; let n = 0;
    MEAS.forEach(([k]) => { const v = num($('#bdm-' + k).value); if (v && v < 250) { o[k] = r1(v); n++; } });
    if (!n) { toast('Escribe al menos una medida'); return; }
    b.m = b.m.filter(x => x.d !== d).concat([o]); saveBody(); closeSheet(); toast('Medidas guardadas'); render();
  } else if (f.id === 'f-bdd') {
    ev.preventDefault();
    const bad = ['h', 'wr', 'an'].filter(k => bdErr(k)); if (bad.length) { bad.forEach(k => bdShowErr(k, true)); $('#bd-' + bad[0]).focus(); return; }
    const b = body(), h = parseCm($('#bd-h').value), wr = num($('#bd-wr').value), an = num($('#bd-an').value);
    if (h) b.h = h;
    if (wr && wr < 30) b.wrist = r1(wr); else if (!$('#bd-wr').value.trim()) delete b.wrist;
    if (an && an < 40) b.ankle = r1(an); else if (!$('#bd-an').value.trim()) delete b.ankle;
    saveBody(); closeSheet(); toast('Datos guardados'); render();
  }
}, true);

document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-act]'); if (!b) return;
  const a = b.dataset.act;
  if (a === 'prof-sub') { ev.stopPropagation(); state.tab = 'profile'; state.profSub = b.dataset.sub; render(); return; }
  if (a.indexOf('bd-') !== 0) return;
  ev.stopPropagation();
  if (a === 'bd-data') dataSheet();
  else if (a === 'bd-meas') measSheet();
  else if (a === 'bd-msel') { state.bodyM = b.dataset.k; render(); }
  else if (a === 'bd-sex') { body().sex = b.dataset.v; b.parentNode.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); saveBody(); }
  else if (a === 'bd-del') { const bd = body(), k = b.dataset.t; bd[k] = bd[k].filter(x => x.d !== b.dataset.d); saveBody(); dataSheet(); render(); }
  else if (a === 'bd-ph-add') photoSheet();
  else if (a === 'bd-ph-cmp') compareSheet();
  else if (a === 'bd-ph-pose') { state.phPose = b.dataset.k; compareSheet(); }
  else if (a === 'bd-ph-del') { ev.preventDefault(); phDB.del(b.dataset.id, () => { photoSheet(); fillPhotos(); }); }
}, true);

/* ---------- Perfil: nueva pestaña "Cuerpo" ---------- */
const _vProfileB = vProfile;
vProfile = function (sub) {
  const isBody = sub === 'body';
  const h = _vProfileB(isBody ? 'progress' : sub);
  if (isBody) state.profSub = 'body';
  const cur = isBody ? 'body' : state.profSub;
  const i = h.indexOf('<div class="seg seg3"'); if (i < 0) return h;
  const j = h.indexOf('</div>', i) + 6;
  const tabs = [['progress', 'Progreso', 'trending-up'], ['body', 'Cuerpo', 'activity'], ['history', 'Historial', 'history'], ['settings', 'Ajustes', 'settings']];
  const seg = `<div class="seg seg4" role="tablist">${tabs.map(([k, l, ico]) => `<button role="tab" class="${cur === k ? 'on' : ''}" aria-selected="${cur === k}" ${k === 'body' ? 'data-act="prof-sub" data-sub="body"' : `data-act="tab" data-tab="${k}"`}>${ic(ico, 14)} ${l}</button>`).join('')}</div>`;
  return h.slice(0, i) + seg + (isBody ? vBody() : h.slice(j));
};
const _renderBody = render;
render = function () { _renderBody(); if (document.getElementById('bd-photos')) fillPhotos(); };

syncHistory();
render();
