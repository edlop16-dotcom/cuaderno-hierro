/* ================== Sonido y vibración al terminar el descanso ================== */
const ALERT_SOUNDS = {
  corto: 'Pitido corto',
  largo: 'Pitido largo',
  campana: 'Campana',
  alarma: 'Alarma',
  silbato: 'Silbato',
  silencio: 'Sin sonido',
};
function alertCfg() {
  return Object.assign({ sound: 'largo', rep: 2, vib: 3, fig: true }, state.settings.alert || {});
}
function setAlertCfg(patch) {
  state.settings.alert = Object.assign(alertCfg(), patch);
  saveLocal();
}
function audioCtx() {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended' && actx.resume) actx.resume();
    return actx;
  } catch (e) { return null; }
}
/* Dibuja un tono con envolvente; devuelve cuándo termina */
function tone(ctx, t, freq, dur, opt = {}) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = opt.type || 'sine';
  o.frequency.setValueAtTime(freq, t);
  if (opt.to) o.frequency.linearRampToValueAtTime(opt.to, t + dur);
  const v = opt.vol ?? 0.22, a = opt.attack ?? 0.01;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(v, t + a);
  if (opt.decay) g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  else { g.gain.setValueAtTime(v, t + Math.max(a, dur - 0.04)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); }
  o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + dur + 0.02);
  return t + dur;
}
/* Cada patrón devuelve su duración en segundos */
const PATTERNS = {
  corto(ctx, t) { tone(ctx, t, 880, 0.18); tone(ctx, t + 0.25, 880, 0.18); tone(ctx, t + 0.5, 1320, 0.22); return 0.8; },
  largo(ctx, t) {
    for (let i = 0; i < 6; i++) tone(ctx, t + i * 0.26, i % 2 ? 1175 : 880, 0.24, { type: 'triangle', vol: 0.25 });
    tone(ctx, t + 1.6, 1320, 0.6, { type: 'triangle', vol: 0.25 });
    return 2.3;
  },
  campana(ctx, t) {
    [[0, 660], [0.55, 880], [1.1, 1320]].forEach(([d, f]) => {
      tone(ctx, t + d, f, 1.4, { decay: true, vol: 0.28, attack: 0.005 });
      tone(ctx, t + d, f * 2.76, 0.8, { decay: true, vol: 0.06, attack: 0.005 });
    });
    return 2.5;
  },
  alarma(ctx, t) { for (let i = 0; i < 10; i++) tone(ctx, t + i * 0.18, i % 2 ? 1400 : 1000, 0.15, { type: 'square', vol: 0.12 }); return 1.9; },
  silbato(ctx, t) { tone(ctx, t, 2100, 0.35, { to: 2600, vol: 0.18 }); tone(ctx, t + 0.45, 2100, 0.9, { to: 2700, vol: 0.18 }); return 1.4; },
  silencio() { return 0; },
};
function playAlert(cfg = alertCfg()) {
  const p = PATTERNS[cfg.sound] || PATTERNS.largo;
  if (cfg.sound !== 'silencio') {
    const ctx = audioCtx();
    if (ctx) { let t = ctx.currentTime + 0.05; for (let i = 0; i < Math.max(1, cfg.rep); i++) t += p(ctx, t) + 0.35; }
  }
  vibrateTimes(cfg.vib);
}
function vibrateTimes(n) {
  n = Math.max(0, Math.min(10, n | 0)); if (!n) return;
  if (window.nativeVibrate) { window.nativeVibrate(n); return; }
  try { const pat = []; for (let i = 0; i < n; i++) pat.push(400, 200); navigator.vibrate && navigator.vibrate(pat); } catch (e) {}
}
beep = function () { playAlert(); };

/* ================== Figura animada dentro de la sesión ================== */
function miniFig(name) {
  const x = libFind(name); if (!x || !alertCfg().fig) return '';
  return `<button class="fig-mini" data-act="how" data-name="${esc(name)}" data-fig="${x.key}" aria-label="Ver cómo se hace ${esc(name)}">${figSVG(x, 0, false)}</button>`;
}
let miniT0 = performance.now(), miniLast = 0;
function miniLoop(now) {
  requestAnimationFrame(miniLoop);
  if (now - miniLast < 40 || document.hidden || reduceMotion()) return;
  miniLast = now;
  const els = document.querySelectorAll('#app .fig-mini[data-fig]'); if (!els.length) return;
  const vh = innerHeight;
  els.forEach((el, i) => {
    const r = el.getBoundingClientRect(); if (r.bottom < 0 || r.top > vh) return;
    const x = LIB.find(l => l.key === el.dataset.fig); if (!x) return;
    el.innerHTML = figSVG(x, figT(now - miniT0 + i * 450), false);
  });
}
requestAnimationFrame(miniLoop);

/* ================== Videos guardados en el teléfono (sin internet) ================== */
const VID = {
  db: null,
  index: new Set(),
  open() {
    if (this.db) return Promise.resolve(this.db);
    return new Promise((res, rej) => {
      try {
        const r = indexedDB.open('cdh-media', 1);
        r.onupgradeneeded = () => { const s = r.result.createObjectStore('videos', { keyPath: 'id' }); s.createIndex('ex', 'ex'); };
        r.onsuccess = () => { this.db = r.result; res(this.db); };
        r.onerror = () => rej(r.error);
      } catch (e) { rej(e); }
    });
  },
  async tx(mode, fn) {
    const db = await this.open();
    return new Promise((res, rej) => { const t = db.transaction('videos', mode); const out = fn(t.objectStore('videos')); t.oncomplete = () => res(out && out.result !== undefined ? out.result : out); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error); });
  },
  list(ex) { return this.open().then(db => new Promise((res, rej) => { const q = db.transaction('videos').objectStore('videos').index('ex').getAll(ex); q.onsuccess = () => res(q.result || []); q.onerror = () => rej(q.error); })); },
  add(rec) { return this.tx('readwrite', s => s.put(rec)).then(() => this.index.add(rec.ex)); },
  del(id) { return this.tx('readwrite', s => s.delete(id)); },
  /* Qué ejercicios tienen videos, sin cargar los videos en memoria */
  async loadIndex() {
    try {
      const db = await this.open(); const set = new Set();
      const cur = db.transaction('videos').objectStore('videos').index('ex').openKeyCursor();
      cur.onsuccess = () => { const c = cur.result; if (c) { set.add(c.key); c.continue(); } else { this.index = set; safeRender(); } };
    } catch (e) {}
  },
};
const exKey = name => { const x = libFind(name); return x ? x.key : 'n:' + normName(name); };
const LINKS = () => LS.get('links', {});
const fmtMB = b => (b / 1048576).toFixed(b > 1048576 * 10 ? 0 : 1) + ' MB';
let vidUrls = [];
const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];
function freeVidUrls() { vidUrls.forEach(u => URL.revokeObjectURL(u)); vidUrls = []; }

async function renderVideos(name) {
  const box = document.getElementById('my-vids'); if (!box) return;
  const key = exKey(name);
  let vids = [];
  try { vids = await VID.list(key); } catch (e) { box.innerHTML = `<div class="muted">No se pudo abrir el almacenamiento de videos en este equipo.</div>`; return; }
  freeVidUrls();
  const links = LINKS()[key] || [];
  box.innerHTML = `
    ${vids.length ? vids.map(v => { const u = URL.createObjectURL(v.blob); vidUrls.push(u); return `<div class="vidcard"><video src="${u}" controls playsinline preload="metadata" loop data-vid="${v.id}"></video>
      <div class="speeds" role="group" aria-label="Velocidad">${SPEEDS.map(r => `<button class="spd ${r === 1 ? 'on' : ''}" data-act="vid-rate" data-id="${v.id}" data-rate="${r}" aria-pressed="${r === 1}">${r === 1 ? 'Normal' : r + '×'}</button>`).join('')}</div>
      <div class="row"><span class="grow muted" style="font-size:12px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(v.name)} · ${fmtMB(v.size)}</span>
      <button class="btn small danger" data-act="vid-del" data-id="${v.id}" data-name="${esc(name)}">${state.confirm === 'vdel-' + v.id ? '¿Borrar?' : 'Borrar'}</button></div></div>`; }).join('')
      : `<div class="muted" style="font-size:13px">Aún no guardas videos de este ejercicio. Se guardan dentro de la app y se ven sin internet.</div>`}
    <label class="btn block" for="vid-file">+ Agregar video del teléfono</label>
    <input type="file" id="vid-file" accept="video/*" data-name="${esc(name)}" hidden>
    ${links.length ? `<div class="label" style="margin-top:4px">Enlaces guardados (necesitan internet)</div>${links.map((l, i) => `<div class="row"><a class="vid grow" href="${esc(l)}" target="_blank" rel="noopener" style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(l.replace(/^https?:\/\/(www\.)?/, ''))}</a><button class="icon-btn" data-act="link-del" data-i="${i}" data-name="${esc(name)}" aria-label="Quitar enlace">✕</button></div>`).join('')}` : ''}
    <div class="muted" style="font-size:12.5px">Para tenerlo sin internet: en TikTok toca <b>Compartir → Guardar video</b>; también puedes grabar a tu entrenador haciendo el ejercicio. Luego agrégalo aquí desde la galería.</div>
    <div class="row" style="flex-wrap:wrap;gap:8px"><a class="btn small" href="https://www.youtube.com/results?search_query=${encodeURIComponent(name + ' técnica correcta')}" target="_blank" rel="noopener">Buscar en YouTube ↗</a><a class="btn small" href="https://www.tiktok.com/search?q=${encodeURIComponent(name + ' técnica')}" target="_blank" rel="noopener">Buscar en TikTok ↗</a></div>
    <form id="f-link" class="row" data-name="${esc(name)}"><input id="link-url" type="url" placeholder="Pega un enlace de YouTube o TikTok" inputmode="url"><button class="btn small" type="submit">Guardar</button></form>`;
}
async function addVideo(file, name) {
  if (!file) return;
  if (!/^video\//.test(file.type) && !/\.(mp4|webm|mov|3gp|mkv)$/i.test(file.name)) { toast('Ese archivo no es un video.'); return; }
  if (file.size > 150 * 1048576) { toast('El video pesa más de 150 MB. Recórtalo o elige uno más corto.'); return; }
  toast('Guardando video…');
  try {
    await VID.add({ id: uid(), ex: exKey(name), name: file.name, type: file.type, size: file.size, blob: file, added: Date.now() });
    toast('Video guardado. Ya puedes verlo sin internet.');
  } catch (e) { toast('No se pudo guardar: el teléfono no tiene espacio suficiente.'); }
  renderVideos(name);
}

/* El panel "Cómo se hace" ahora incluye tus videos */
const _howSheet = howSheet;
howSheet = function (name) {
  const x = libFind(name);
  if (!x) {
    openSheet(`<div class="row"><div class="grow"><div class="label">Videos</div><h2>${esc(name)}</h2></div><button class="icon-btn" data-act="sheet-close" aria-label="Cerrar">✕</button></div>
      <div class="vids" id="my-vids"></div><button class="btn" data-act="sheet-close">Cerrar</button>`);
  } else {
    _howSheet(name);
    const card = document.querySelector('#sheet .sheet-card');
    const fig = card && card.querySelector('.fig-ctrl');
    if (fig) fig.insertAdjacentHTML('afterend', `<div><div class="label" style="margin-bottom:6px">Mis videos</div><div class="vids" id="my-vids"></div></div>`);
  }
  renderVideos(name);
};
const _closeSheet = closeSheet;
closeSheet = function () { freeVidUrls(); _closeSheet(); };

document.addEventListener('change', ev => {
  const t = ev.target;
  if (t.id === 'vid-file') addVideo(t.files && t.files[0], t.dataset.name);
  if (t.id === 'al-sound') { setAlertCfg({ sound: t.value }); }
  if (t.id === 'al-rep') { setAlertCfg({ rep: +t.value }); }
  if (t.id === 'al-vib') { setAlertCfg({ vib: +t.value }); }
});
document.addEventListener('submit', ev => {
  const f = ev.target; if (f.id !== 'f-link') return;
  ev.preventDefault(); ev.stopImmediatePropagation();
  const url = f.querySelector('#link-url').value.trim();
  if (!/^https?:\/\//i.test(url)) { toast('Pega un enlace completo que empiece con https://'); return; }
  const all = LINKS(), key = exKey(f.dataset.name); all[key] = (all[key] || []).concat(url); LS.set('links', all);
  renderVideos(f.dataset.name);
}, true);
document.addEventListener('click', async ev => {
  const b = ev.target.closest('[data-act]'); if (!b) return;
  const a = b.dataset.act;
  if (a === 'vid-del') {
    ev.stopPropagation();
    if (state.confirm === 'vdel-' + b.dataset.id) { state.confirm = null; await VID.del(b.dataset.id); VID.loadIndex(); renderVideos(b.dataset.name); toast('Video borrado.'); }
    else { state.confirm = 'vdel-' + b.dataset.id; b.textContent = '¿Borrar?'; }
  }
  if (a === 'link-del') { ev.stopPropagation(); const all = LINKS(), key = exKey(b.dataset.name); (all[key] || []).splice(+b.dataset.i, 1); LS.set('links', all); renderVideos(b.dataset.name); }
  if (a === 'vid-rate') {
    ev.stopPropagation();
    const v = document.querySelector(`video[data-vid="${b.dataset.id}"]`); if (!v) return;
    v.playbackRate = +b.dataset.rate; v.defaultPlaybackRate = +b.dataset.rate;
    b.parentElement.querySelectorAll('.spd').forEach(x => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); });
    if (v.paused) v.play().catch(() => {});
  }
  if (a === 'al-test') { ev.stopPropagation(); playAlert(); }
  if (a === 'fig-tog') { ev.stopPropagation(); setAlertCfg({ fig: !alertCfg().fig }); render(); }
}, true);

/* Ajustes: sonido, vibración y figura */
function alertSettingsCard() {
  const c = alertCfg();
  return `<div class="card"><h3>Fin del descanso</h3>
    <div class="muted" style="font-size:12.5px">Cómo te avisa la app cuando termina el descanso entre series.</div>
    <div class="grid2"><div class="field"><label class="label" for="al-sound">Sonido</label><select id="al-sound">${Object.entries(ALERT_SOUNDS).map(([k, v]) => `<option value="${k}" ${k === c.sound ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
    <div class="field"><label class="label" for="al-rep">Repetir sonido</label><select id="al-rep">${[1, 2, 3, 4, 5].map(n => `<option value="${n}" ${n === c.rep ? 'selected' : ''}>${n} ${n === 1 ? 'vez' : 'veces'}</option>`).join('')}</select></div></div>
    <div class="field"><label class="label" for="al-vib">Vibrar</label><select id="al-vib">${[0, 1, 2, 3, 4, 5, 6, 8, 10].map(n => `<option value="${n}" ${n === c.vib ? 'selected' : ''}>${n ? n + (n === 1 ? ' vez' : ' veces') : 'No vibrar'}</option>`).join('')}</select></div>
    <button class="btn" data-act="al-test">▶ Probar aviso</button>
    <div class="muted" style="font-size:12px">Con la pantalla apagada, Android usa el sonido de notificación del teléfono.</div></div>`;
}

VID.loadIndex();
