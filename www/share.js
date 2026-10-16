/* ==========================================================================
   Tarjetas para compartir: imagen vertical (1080×1920, para historias de Instagram
   y estados de WhatsApp) con tu sesión, récords, racha y el logo de Forja.
   ========================================================================== */
const SH_W = 1080, SH_H = 1920;
function rrect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function fitText(c, t, max) { if (c.measureText(t).width <= max) return t; while (t.length > 1 && c.measureText(t + '…').width > max) t = t.slice(0, -1); return t + '…'; }
function wrap2(c, t, max) {
  const w = t.split(' '), lines = ['']; w.forEach(x => { const l = lines[lines.length - 1]; const n = l ? l + ' ' + x : x; if (c.measureText(n).width > max && l) lines.push(x); else lines[lines.length - 1] = n; });
  if (lines.length > 2) { lines[1] = fitText(c, lines.slice(1).join(' '), max); lines.length = 2; }
  return lines;
}
function sessStats(s) {
  const sets = s.exercises.reduce((a, e) => a + e.sets.length, 0);
  const vol = s.exercises.reduce((a, e) => a + e.sets.reduce((b, x) => b + (+x.w || 0) * (+x.r || 0), 0), 0);
  return { sets, vol, min: Math.max(1, Math.round((s.durationSec || 0) / 60)) };
}
function bestSet(e) { return e.sets.reduce((a, x) => !a || e1rm(x.w, x.r) > e1rm(a.w, a.r) ? x : a, null); }
function loadImg(src) { return new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; }); }
function fontsReady() {
  try { if (document.fonts && document.fonts.load) return Promise.all(['800 90px Poppins', '700 44px Poppins', '600 40px Inter', '700 40px Inter'].map(f => document.fonts.load(f))).catch(() => {}); } catch (e) {}
  return Promise.resolve();
}

function drawShare(s) {
  const cv = document.createElement('canvas'); cv.width = SH_W; cv.height = SH_H;
  const c = cv.getContext('2d'), st = sessStats(s), wins = s.wins || {};
  const logo = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="256" height="256">${LOGO_INNER}</svg>`);
  return Promise.all([fontsReady(), loadImg(logo)]).then(([, lg]) => {
    const P = 'Poppins, Arial, sans-serif', I = 'Inter, Arial, sans-serif', M = 84;
    /* fondo */
    const bg = c.createLinearGradient(0, 0, 0, SH_H); bg.addColorStop(0, '#12151d'); bg.addColorStop(1, '#0a0c11'); c.fillStyle = bg; c.fillRect(0, 0, SH_W, SH_H);
    const gl = c.createRadialGradient(SH_W * 0.9, 120, 10, SH_W * 0.9, 120, 900); gl.addColorStop(0, 'rgba(255,106,31,.42)'); gl.addColorStop(1, 'rgba(255,106,31,0)'); c.fillStyle = gl; c.fillRect(0, 0, SH_W, SH_H);
    const gl2 = c.createRadialGradient(80, SH_H - 200, 10, 80, SH_H - 200, 700); gl2.addColorStop(0, 'rgba(255,176,32,.16)'); gl2.addColorStop(1, 'rgba(255,176,32,0)'); c.fillStyle = gl2; c.fillRect(0, 0, SH_W, SH_H);
    const grad = c.createLinearGradient(0, 0, SH_W, 0); grad.addColorStop(0, '#ff4d1f'); grad.addColorStop(.55, '#ff7a1a'); grad.addColorStop(1, '#ffb020');
    /* cabecera */
    if (lg) c.drawImage(lg, M, 96, 112, 112);
    c.fillStyle = grad; c.font = `800 64px ${P}`; c.textBaseline = 'middle'; c.fillText('FORJA', M + 140, 154);
    c.fillStyle = '#8b94a8'; c.font = `600 34px ${I}`; c.textAlign = 'right';
    c.fillText(fmtDate(s.date, true), SH_W - M, 154); c.textAlign = 'left';
    /* título */
    c.textBaseline = 'alphabetic';
    c.fillStyle = '#ffb020'; c.font = `700 34px ${I}`; c.fillText((KINDS[sKind(s)] || 'Entrenamiento').toUpperCase() + ' · ' + (s.gymName || gymName(sGym(s))).toUpperCase(), M, 360);
    c.fillStyle = '#f3f5f9'; c.font = `800 96px ${P}`;
    const tl = wrap2(c, s.dayName || 'Entrenamiento', SH_W - 2 * M); tl.forEach((l, i) => c.fillText(l, M, 470 + i * 108));
    let y = 470 + tl.length * 108 + 40;
    /* números */
    const box = [[st.min + ' min', 'Duración'], [st.vol >= 1000 ? fmtKg(Math.round(st.vol / 100) / 10) + ' t' : fmtKg(st.vol) + ' kg', 'Volumen'], [String(st.sets), 'Series']];
    const bw = (SH_W - 2 * M - 2 * 28) / 3;
    box.forEach(([v, l], i) => {
      const x = M + i * (bw + 28); rrect(c, x, y, bw, 190, 36); c.fillStyle = 'rgba(255,255,255,.06)'; c.fill(); c.strokeStyle = 'rgba(255,255,255,.08)'; c.lineWidth = 2; c.stroke();
      c.fillStyle = '#f3f5f9'; c.font = `800 62px ${P}`; c.textAlign = 'center'; c.fillText(fitText(c, v, bw - 30), x + bw / 2, y + 100);
      c.fillStyle = '#8b94a8'; c.font = `600 30px ${I}`; c.fillText(l, x + bw / 2, y + 152); c.textAlign = 'left';
    });
    y += 190 + 70;
    /* récords */
    const pr = Object.keys(wins).filter(k => wins[k] === 'pr').length, up = Object.keys(wins).length - pr;
    if (pr || up) {
      rrect(c, M, y, SH_W - 2 * M, 112, 56); c.fillStyle = grad; c.fill();
      c.fillStyle = '#1a0a00'; c.font = `800 44px ${P}`; c.textAlign = 'center';
      c.fillText(`🛡️ ${pr ? pr + (pr === 1 ? ' récord' : ' récords') : ''}${pr && up ? ' · ' : ''}${up ? up + (up === 1 ? ' mejora' : ' mejoras') : ''}`, SH_W / 2, y + 72); c.textAlign = 'left';
      y += 112 + 60;
    }
    /* ejercicios */
    const exs = s.exercises.filter(e => e.sets.length), maxN = Math.max(3, Math.floor((SH_H - 270 - y) / 100));
    exs.slice(0, maxN).forEach((e, i) => {
      const yy = y + i * 100, b = bestSet(e), w = wins[e.name];
      c.fillStyle = 'rgba(255,255,255,.07)'; c.fillRect(M, yy + 92, SH_W - 2 * M, 2);
      const right = b ? `${fmtKg(b.w)} kg × ${b.r}` : '';
      c.font = `800 44px ${P}`; const rw = c.measureText(right).width;
      c.fillStyle = w === 'pr' ? '#ffb020' : '#f3f5f9'; c.textAlign = 'right'; c.fillText(right, SH_W - M, yy + 56); c.textAlign = 'left';
      c.fillStyle = '#f3f5f9'; c.font = `600 40px ${I}`;
      const badge = w ? (w === 'pr' ? ' 🏆' : ' ⬆') : '';
      c.fillText(fitText(c, e.name, SH_W - 2 * M - rw - 60) + badge, M, yy + 46);
      c.fillStyle = '#8b94a8'; c.font = `500 30px ${I}`; c.fillText(`${e.sets.length} ${e.sets.length === 1 ? 'serie' : 'series'}`, M, yy + 82);
    });
    if (exs.length > maxN) { c.fillStyle = '#8b94a8'; c.font = `600 32px ${I}`; c.fillText(`+ ${exs.length - maxN} ejercicios más`, M, y + maxN * 100 + 46); }
    /* racha y pie */
    const sk = streakInfo().count;
    if (sk > 1) { c.fillStyle = '#f3f5f9'; c.font = `800 52px ${P}`; c.textAlign = 'center'; c.fillText(`🔥 ${sk} entrenamientos en racha`, SH_W / 2, SH_H - 170); }
    c.fillStyle = '#5d6579'; c.font = `600 30px ${I}`; c.textAlign = 'center'; c.fillText('Entrenado con Forja', SH_W / 2, SH_H - 96); c.textAlign = 'left';
    return cv;
  });
}

function shareText(s) { const st = sessStats(s); return `${s.dayName} · ${st.sets} series · ${st.min} min 💪 #Forja`; }
function shareOut(cv, s) {
  const data = cv.toDataURL('image/png'), text = shareText(s);
  const C = typeof CAP !== 'undefined' ? CAP : null;
  if (C && C.Filesystem && C.Share) {
    C.Filesystem.writeFile({ path: 'forja-entreno.png', data: data.split(',')[1], directory: 'CACHE' })
      .then(r => C.Share.share({ title: 'Mi entrenamiento', text, files: [r.uri], dialogTitle: 'Compartir entrenamiento' }))
      .catch(e => { if (!/cancel/i.test(String(e && (e.message || e)))) toast('No se pudo compartir la imagen'); });
    return;
  }
  if (navigator.share && navigator.canShare && cv.toBlob) {
    cv.toBlob(bl => {
      let f = null; try { f = new File([bl], 'forja-entreno.png', { type: 'image/png' }); } catch (e) {}
      if (f && navigator.canShare({ files: [f] })) navigator.share({ files: [f], text }).catch(() => {});
      else saveImg(data);
    });
  } else saveImg(data);
}
function saveImg(data) { const a = document.createElement('a'); a.href = data; a.download = 'forja-entreno.png'; document.body.appendChild(a); a.click(); a.remove(); toast('Imagen descargada'); }

function shareSheet(id) {
  const s = state.sessions.find(x => x.id === id); if (!s) return;
  openSheet(`<div class="row"><h2 class="grow">Compartir</h2><button class="icon-btn" data-act="sheet-close" aria-label="Cerrar">${ic('x', 18)}</button></div>
    <div class="sh-prev" id="sh-prev"><div class="muted">Creando tu tarjeta…</div></div>
    <button class="btn primary block" data-act="share-go" data-id="${s.id}" disabled>${ic('share-2', 17)} Compartir en Instagram o WhatsApp</button>`);
  drawShare(s).then(cv => {
    shareSheet.cv = cv;
    const p = document.getElementById('sh-prev'); if (!p) return;
    p.innerHTML = `<img src="${cv.toDataURL('image/png')}" alt="Tarjeta de tu entrenamiento">`;
    const b = document.querySelector('[data-act="share-go"]'); if (b) b.disabled = false;
  });
}

/* Entrenar: invitación a compartir tu última sesión (12 h) */
const _vTrainSh = vTrain;
vTrain = function () {
  const h = _vTrainSh();
  if (h.indexOf('id="sx"') >= 0 || isWatch() || state.draft) return h;
  const s = state.sessions[0];
  if (!s || s.source || Date.now() - new Date(s.date).getTime() - (s.durationSec || 0) * 1000 > 12 * 36e5 || state.settings.shareSeen === s.id) return h;
  const st = sessStats(s);
  const card = `<div class="card sh-card"><div class="row" style="gap:12px"><span class="sh-ic">${ic('share-2', 20)}</span><div class="grow" style="min-width:0"><b>¡Buen entrenamiento!</b><div class="muted" style="font-size:12.5px">${esc(s.dayName)} · ${st.sets} series · ${st.min} min</div></div>
    <button class="icon-btn sm" data-act="share-x" data-id="${s.id}" aria-label="Ocultar">${ic('x', 15)}</button></div>
    <button class="btn primary block" data-act="share-sess" data-id="${s.id}">${ic('share-2', 16)} Compartir tarjeta</button></div>`;
  const at = h.indexOf('<div class="card habits2"');
  return at < 0 ? h + card : h.slice(0, at) + card + h.slice(at);
};
/* Historial: botón Compartir en cada sesión */
const _vHistorySh = vHistory;
vHistory = function () {
  return _vHistorySh().replace(/(<button class="btn small danger" data-act="sess-del" data-id="([^"]+)")/g, '<button class="btn small" data-act="share-sess" data-id="$2" style="align-self:flex-start">' + ic('share-2', 15) + ' Compartir</button>$1');
};
document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-act="share-sess"],[data-act="share-go"],[data-act="share-x"]'); if (!b) return;
  ev.stopPropagation(); ev.preventDefault();
  const a = b.dataset.act;
  if (a === 'share-sess') shareSheet(b.dataset.id);
  else if (a === 'share-x') { state.settings.shareSeen = b.dataset.id; saveLocal(); render(); }
  else if (a === 'share-go' && shareSheet.cv) { const s = state.sessions.find(x => x.id === b.dataset.id); state.settings.shareSeen = b.dataset.id; saveLocal(); shareOut(shareSheet.cv, s); }
}, true);
bootRender();
