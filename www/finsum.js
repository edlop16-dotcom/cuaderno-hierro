/* ==========================================================================
   Resumen al terminar (ajustes del gym, tanda 2, 15-oct-2026)
   - Pantalla de resumen: kg levantados (con la barra), series, ejercicios y duración;
     comparación con la última vez que hiciste ese mismo día (qué subió o bajó) y récords.
   - "Para tu próxima sesión": peso, series y reps de cada ejercicio según coachFor.
   - Sonido corto de logro propio (sintetizado con WebAudio, sin música con derechos).
   - "Mi música motivacional": enlace de Spotify o YouTube que se configura en Ajustes;
     se abre desde el resumen, la barra de la sesión y "⋯ Más" del reloj.
   ========================================================================== */
const fsU = () => (state.settings.unit === 'lb' ? 'lb' : 'kg');
const FS_MUSIC = /^https:\/\/(open\.spotify\.com|spotify\.link|(www\.|m\.|music\.)?youtube\.com|youtu\.be)\/\S+$/i;
const fsMusic = () => { const u = String(state.settings.music || '').trim(); return FS_MUSIC.test(u) ? u : ''; };
const fsVol = (sets, bar) => sets.reduce((a, x) => a + ((+x.w || 0) + (bar || 0)) * (+x.r || 0) + (x.drops || []).reduce((b, y) => b + ((+y.w || 0) + (bar || 0)) * (+y.r || 0), 0), 0);
const fsBest = sets => sets.reduce((b, x) => { const v = e1rm(+x.w || 0, +x.r || 0); return !b || v > b.v ? { v, w: +x.w || 0, r: +x.r || 0 } : b; }, null);
const fsSetTxt = b => b ? (b.w ? `${fmtKg(b.w)}×${b.r}` : `${b.r} reps`) : '—';

/* La última vez que hiciste este mismo día (antes de esta sesión) */
function fsPrev(s) {
  if (!s.dayId || s.planId === 'quick') return null;
  return state.sessions.find(x => x.id !== s.id && !x.approx && x.dayId === s.dayId && x.date < s.date) || null;
}
function fsCompare(s, prev, bars) {
  if (!prev) return null;
  const rows = s.exercises.map(e => {
    const p = exIn(prev, e.name);
    const now = fsBest(e.sets), bef = p && fsBest(p.sets), vn = fsVol(e.sets, bars[e.name]), vb = p ? fsVol(p.sets, bars[e.name]) : 0;
    let t = 'new';
    if (bef) t = now.v > bef.v + 0.05 ? 'up' : now.v < bef.v - 0.05 ? 'down' : vn > vb ? 'up' : vn < vb ? 'down' : 'same';
    return { n: e.name, t, now, bef };
  });
  const skipped = prev.exercises.filter(x => !exIn(s, x.name)).map(x => x.name);
  const vol = s.exercises.reduce((a, e) => a + fsVol(e.sets, bars[e.name]), 0), volB = prev.exercises.reduce((a, e) => a + fsVol(e.sets, bars[e.name]), 0);
  return { rows, skipped, vol, volB, date: prev.date };
}
/* Para la próxima: el ejercicio del plan (o uno armado con lo de hoy) pasa por coachFor */
function fsNext(s) {
  const day = s.planId !== 'quick' ? findDay(s.planId, s.dayId).d : null, g = sGym(s), k = sKind(s);
  return s.exercises.map(e => {
    const pe = (day && day.exercises.find(x => x.name === e.name)) || { id: 'fs-' + e.name, name: e.name, type: e.type, sets: e.target || e.sets.length, repsMin: e.repsMin || 8, repsMax: e.repsMax || 12, rest: 90, weight: 0 };
    let c = null; try { c = coachFor(pe, g, k); } catch (x) {}
    const sets = +pe.sets || e.sets.length, w = c && c.w != null ? +c.w : 0;
    const goal = c && Array.isArray(c.goal) && c.goal.length ? c.goal.slice(0, sets) : null;
    const rp = goal && goal.every(r => r === goal[0]) ? goal[0] : goal ? goal.join('/') : reps(pe);
    return { n: e.name, w, sets, rp, mode: c ? c.mode : 'hold', why: c ? String(c.head || '').replace(/<[^>]+>/g, '') : '' };
  });
}

function fsHtml(s, bars) {
  const u = fsU(), prev = fsPrev(s), cmp = fsCompare(s, prev, bars), nx = fsNext(s);
  const vol = s.exercises.reduce((a, e) => a + fsVol(e.sets, bars[e.name]), 0), sets = s.exercises.reduce((a, e) => a + e.sets.length, 0);
  const wins = s.wins || {}, prs = Object.keys(wins).filter(n => wins[n] === 'pr'), ups = Object.keys(wins).filter(n => wins[n] === 'up');
  const ICO = { up: '⬆', down: '⬇', same: '＝', new: '✦' }, MODE = { up: '⬆', down: '⬇', back: '↺', pain: '⚠', first: '•', hold: '→' };
  const pct = cmp && cmp.volB ? Math.round((cmp.vol - cmp.volB) / cmp.volB * 100) : null;
  const nUp = cmp ? cmp.rows.filter(r => r.t === 'up').length : 0, nDown = cmp ? cmp.rows.filter(r => r.t === 'down').length : 0;
  const mus = fsMusic();
  return `<div class="fs-head"><span class="fs-ic">${ic('trophy', 26)}</span><div class="grow"><h2>¡Entrenamiento completado!</h2><div class="muted fs-sub">${esc(s.dayName || '')}${s.gymName ? ' · ' + esc(s.gymName) : ''}</div></div></div>
    <div class="fs-stats"><div><b class="num">${fmtKg(Math.round(vol))}</b><span>${u} levantados</span></div><div><b class="num">${sets}</b><span>series</span></div><div><b class="num">${s.exercises.length}</b><span>ejercicios</span></div><div><b class="num">${hm((s.durationSec || 0) / 60)}</b><span>duración</span></div></div>
    ${prs.length || ups.length ? `<div class="fs-rec">${prs.length ? `<div>🏆 <b>${prs.length === 1 ? 'Récord' : prs.length + ' récords'}:</b> ${prs.map(esc).join(', ')}</div>` : ''}${ups.length ? `<div>${ic('shield', 14)} <b>Mejoraste:</b> ${ups.map(esc).join(', ')}</div>` : ''}</div>` : ''}
    <div class="fs-sec">${ic('trending-up', 15)} Frente a la última vez</div>
    ${cmp ? `<div class="fs-cmpt">${fmtDate(cmp.date, true)} (${ago(cmp.date)}): <b class="num ${pct > 0 ? 'okc' : pct < 0 ? 'badc' : ''}">${pct == null ? '' : (pct > 0 ? '+' : '') + pct + ' %'}</b> de volumen${pct == null ? '' : ` (${fmtKg(Math.round(cmp.volB))} → ${fmtKg(Math.round(cmp.vol))} ${u})`}. ${nUp ? `Subiste en <b>${nUp}</b>` : 'No subiste en ninguno'}${nDown ? `, bajaste en <b>${nDown}</b>` : ''}.</div>
      <div class="fs-list">${cmp.rows.map(r => `<div class="fs-row ${r.t}"><span class="fs-t">${ICO[r.t]}</span><span class="grow fs-n">${esc(r.n)}</span><span class="num fs-v">${r.t === 'new' ? 'nuevo · ' + fsSetTxt(r.now) : `${fsSetTxt(r.bef)} → ${fsSetTxt(r.now)}`}</span></div>`).join('')}</div>
      ${cmp.skipped.length ? `<div class="muted fs-note">Esta vez no hiciste: ${cmp.skipped.map(esc).join(', ')}.</div>` : ''}`
    : `<div class="muted fs-note">${s.planId === 'quick' ? 'Entreno rápido: no hay una sesión igual para comparar.' : 'Es la primera vez que haces este día: la próxima podrás comparar.'}</div>`}
    <div class="fs-sec">${ic('target', 15)} Para tu próxima sesión</div>
    <div class="fs-list">${nx.map(x => `<div class="fs-nx m-${x.mode}"><div class="fs-nxh"><span class="fs-t">${MODE[x.mode] || '→'}</span><b class="grow fs-n">${esc(x.n)}</b><span class="num fs-w">${x.w ? `${fmtKg(x.w)} ${u}` : 'peso corporal'}</span></div><div class="fs-nxs"><span class="num">${x.sets} × ${x.rp} reps</span>${x.why ? ` · ${esc(x.why.length > 110 ? x.why.slice(0, 107) + '…' : x.why)}` : ''}</div></div>`).join('')}</div>
    ${mus ? `<button type="button" class="btn block fs-mus" data-act="fs-music">${'🎵'} Mi música motivacional</button>` : ''}
    <button type="button" class="btn primary block" data-act="fs-close">Listo</button>`;
}

/* Sonido de logro: arpegio corto (do-mi-sol-do) con campanita, hecho aquí mismo */
function fsChime() {
  if (state.settings.finSound === false || (typeof alertCfg === 'function' && alertCfg().sound === 'silencio')) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.resume) actx.resume();
    const t0 = actx.currentTime + 0.03;
    [[523.25, 0], [659.25, 0.11], [783.99, 0.22], [1046.5, 0.34]].forEach(([f, d], k) => {
      [1, 2].forEach(h => {
        const o = actx.createOscillator(), g = actx.createGain(), dur = k === 3 ? 0.7 : 0.22;
        o.type = h === 1 ? 'triangle' : 'sine'; o.frequency.value = f * h;
        g.gain.setValueAtTime(0.0001, t0 + d); g.gain.exponentialRampToValueAtTime(h === 1 ? 0.22 : 0.06, t0 + d + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d + dur);
        o.connect(g); g.connect(actx.destination); o.start(t0 + d); o.stop(t0 + d + dur + 0.05);
      });
    });
  } catch (e) {}
  try { navigator.vibrate && navigator.vibrate([60, 60, 60, 60, 160]); } catch (e) {}
}

/* Orden al terminar: racha (si sube) → este resumen con su sonido → medalla de rango al cerrarlo */
let fsOpenId = null;
const fsOpen = () => !!document.querySelector('#sheet .fs-card');
function fsShow(id, bars, tries) {
  const s = state.sessions.find(x => x.id === id); if (!s || state.draft) return;
  if (document.querySelector('.celebrate') && (tries || 0) < 300) { setTimeout(() => fsShow(id, bars, (tries || 0) + 1), 400); return; }
  fsOpenId = id;
  openSheet(fsHtml(s, bars || {}));
  const c = document.querySelector('#sheet .sheet-card'); if (c) { c.classList.add('fs-card'); c.scrollTop = 0; }
  fsChime();
}
const _rkRevealFs = rkReveal;
rkReveal = function (ups, tries) {
  if (fsOpen() && (tries || 0) < 1000) { setTimeout(() => rkReveal(ups, (tries || 0) + 1), 600); return; }
  return _rkRevealFs(ups, tries);
};
const _finishFs = finishSession;
finishSession = function () {
  const d = state.draft, id = d && d.id, bars = {};
  if (d) d.exercises.forEach(e => { if (e.bar) bars[e.name] = +e.bar || 0; });
  const r = _finishFs.apply(this, arguments);
  if (id && !state.draft && state.sessions.some(x => x.id === id)) setTimeout(() => fsShow(id, bars), 450);   // tras ajustar la duración (finishWith)
  return r;
};
/* Deshacer la sesión cierra su resumen */
const _removeSessionsFs = removeSessions;
removeSessions = function (ids) { _removeSessionsFs(ids); if (fsOpenId && ids.indexOf(fsOpenId) >= 0 && document.querySelector('#sheet .fs-card')) { fsOpenId = null; closeSheet(); } };

/* ---------- Música: botón en la sesión (teléfono) y en "⋯ Más" (reloj) ---------- */
function fsMusicGo() { const u = fsMusic(); if (!u) { toast('Configura tu enlace en Ajustes → Música y sonidos.'); return; } try { openExt(u); } catch (e) { location.href = u; } }
const _renderFs = render;
render = function () {
  _renderFs();
  try {
    const top = document.querySelector('#sx .sx-top'), mus = fsMusic();
    if (top && mus && !top.querySelector('.fs-mbtn')) { const fin = top.querySelector('.sx-fin'); if (fin) fin.insertAdjacentHTML('beforebegin', `<button class="sx-ic fs-mbtn" data-act="fs-music" aria-label="Mi música motivacional">🎵</button>`); }
  } catch (e) {}
};
const _vWatchSessionFs = vWatchSession;
vWatchSession = function () {
  const h = _vWatchSessionFs();
  if (!fsMusic() || typeof w2 === 'undefined' || w2.menu !== 'main') return h;
  return h.replace('<button class="w2-mi" data-act="w2-away">', '<button class="w2-mi" data-act="fs-music">🎵 Mi música</button><button class="w2-mi" data-act="w2-away">');
};

/* ---------- Ajustes: Música y sonidos ---------- */
function fsCard() {
  const S = state.settings, on = S.finSound !== false;
  return `<div class="card fs-set"><h3>Música y sonidos</h3>
    <div class="row"><span class="grow"><b>Sonido de logro al terminar</b><br><span class="muted" style="font-size:12.5px">Un arpegio corto hecho por la app, sin música con derechos.</span></span>
      <button type="button" class="switch ${on ? 'on' : ''}" style="border:0;cursor:pointer;margin-left:12px" data-act="fs-snd" role="switch" aria-checked="${on}" aria-label="Sonido de logro"><i></i></button></div>
    <div class="field"><label class="label" for="fs-url">Mi música motivacional (Spotify o YouTube)</label>
      <input id="fs-url" type="url" inputmode="url" autocomplete="off" placeholder="https://open.spotify.com/playlist/…" value="${esc(S.music || '')}">
      <div class="muted" style="font-size:12px">Pega el enlace de tu playlist o video. Aparece como 🎵 en la sesión y en el resumen.</div></div>
    <div class="row fs-btns"><button type="button" class="btn small" data-act="fs-test">Probar sonido</button>${S.music ? '<button type="button" class="btn small" data-act="fs-open">Abrir enlace</button><button type="button" class="btn small" data-act="fs-del">Quitar</button>' : ''}<button type="button" class="btn small primary" data-act="fs-save">Guardar enlace</button></div></div>`;
}
const _vSettingsFs = vSettings;
vSettings = function () { return _vSettingsFs() + fsCard(); };
SET_ORDER.push(['fs-set', 7.5]);
SET_ORDER.sort((a, b) => a[1] - b[1]);

document.addEventListener('click', ev => {
  const b = ev.target.closest && ev.target.closest('[data-act^="fs-"]'); if (!b) return;
  ev.stopPropagation(); ev.preventDefault();
  const a = b.dataset.act, S = state.settings;
  if (a === 'fs-close') { fsOpenId = null; closeSheet(); }
  else if (a === 'fs-music' || a === 'fs-open') fsMusicGo();
  else if (a === 'fs-snd') { S.finSound = S.finSound === false; savePlans(); render(); if (S.finSound) fsChime(); }
  else if (a === 'fs-test') { const was = S.finSound; S.finSound = true; fsChime(); S.finSound = was; }
  else if (a === 'fs-del') { S.music = ''; savePlans(); render(); toast('Enlace quitado.'); }
  else if (a === 'fs-save') {
    const i = document.getElementById('fs-url'), v = i ? i.value.trim() : '';
    if (!v) { S.music = ''; savePlans(); render(); return; }
    if (!FS_MUSIC.test(v)) { toast('Usa un enlace https de Spotify (open.spotify.com) o YouTube.'); return; }
    S.music = v; savePlans(); render(); toast('Enlace guardado: 🎵 aparece en tu sesión.');
  }
}, true);
bootRender();
