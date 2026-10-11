/* ==========================================================================
   Sincronización celular ↔ reloj a través de un gist privado de GitHub.
   - Cada equipo guarda todo localmente (funciona sin internet) y, cuando hay
     conexión, baja la copia de la nube, la mezcla con la suya y sube el resultado.
   - Mezcla de 3 vías con la "base" (lo último que este equipo sincronizó):
     así sabe qué cambió aquí, qué cambió en el otro equipo y qué se borró.
   - Lo propio de cada equipo no se sincroniza: modo reloj, pantalla, sonidos,
     recordatorios y la sesión que esté en curso.
   ========================================================================== */
const SYNC_FILE = 'forja-sync.json';
const SYNC_DESC = 'Forja · sincronización entre celular y reloj (no borrar)';
const SYNC_LOCAL_KEYS = ['watch', 'awake', 'alert'];
const SYNC_TOKEN_URL = 'https://github.com/settings/tokens/new?scopes=gist&description=Forja%20sync';
const TOMB_DAYS = 120;

const syncHash = o => { const s = JSON.stringify(o); let h = 5381; for (let i = 0; i < s.length; i++) h = (h * 33 ^ s.charCodeAt(i)) >>> 0; return h.toString(36) + ':' + s.length; };
const cleanSess = s => { const o = Object.assign({}, s); delete o.synced; return o; };

const sync = {
  cfg: LS.get('sync', null),        // { token, gist, last, err }
  base: LS.get('syncBase', null),   // { s:{id:hash}, d:{fecha:hash} }
  busy: false, again: false, timer: null, applying: false, status: 'idle',
  on() { return !!(this.cfg && this.cfg.token); },
  save() { LS.set('sync', this.cfg); },

  async api(path, opt) {
    opt = opt || {};
    const headers = { Authorization: 'Bearer ' + this.cfg.token, Accept: 'application/vnd.github+json' };
    if (opt.body) headers['Content-Type'] = 'application/json';
    const r = await fetch('https://api.github.com' + path, { method: opt.method || 'GET', body: opt.body, headers, cache: 'no-store' });
    if (r.status === 401) { const e = new Error('La llave no es válida o fue borrada en GitHub.'); e.auth = true; throw e; }
    if (r.status === 403 || r.status === 404) { const e = new Error(r.status === 404 ? 'No encontrado' : 'La llave no tiene permiso "gist".'); e.code = r.status; throw e; }
    if (!r.ok) throw new Error('GitHub respondió ' + r.status);
    return r.json();
  },
  async findGist() {
    for (let p = 1; p <= 5; p++) {
      const list = await this.api('/gists?per_page=100&page=' + p);
      const g = list.find(x => x.files && x.files[SYNC_FILE]);
      if (g) return g.id;
      if (list.length < 100) break;
    }
    return null;
  },
  async readRemote() {
    if (!this.cfg.gist) this.cfg.gist = await this.findGist();
    if (!this.cfg.gist) return null;
    let g;
    try { g = await this.api('/gists/' + this.cfg.gist); }
    catch (e) {
      if (e.code !== 404) throw e;
      this.cfg.gist = await this.findGist();               // el gist se borró: buscar otro o crear uno nuevo
      if (!this.cfg.gist) return null;
      g = await this.api('/gists/' + this.cfg.gist);
    }
    const f = g.files && g.files[SYNC_FILE];
    if (!f) return null;
    const txt = f.truncated ? await (await fetch(f.raw_url, { cache: 'no-store' })).text() : f.content;
    try { return JSON.parse(txt); } catch (e) { return null; }
  },
  async writeRemote(doc) {
    const files = {}; files[SYNC_FILE] = { content: JSON.stringify(doc) };
    if (this.cfg.gist) await this.api('/gists/' + this.cfg.gist, { method: 'PATCH', body: JSON.stringify({ files }) });
    else { const g = await this.api('/gists', { method: 'POST', body: JSON.stringify({ description: SYNC_DESC, public: false, files }) }); this.cfg.gist = g.id; }
  },
  shared() { const o = {}; for (const k in state.settings) if (!SYNC_LOCAL_KEYS.includes(k)) o[k] = state.settings[k]; return o; },

  async run() {
    if (!this.on()) return;
    if (this.busy) { this.again = true; return; }
    if (navigator.onLine === false) { this.status = 'offline'; paintSync(); return; }
    this.busy = true; this.status = 'syncing'; paintSync();
    try {
      const R = await this.readRemote();
      const B = this.base, now = Date.now();
      let changed = false;

      /* --- Sesiones --- */
      const tomb = Object.assign({}, (R && R.tomb) || {});
      const L = {}, Rs = {}, bS = (B && B.s) || {};
      state.sessions.forEach(s => { L[s.id] = cleanSess(s); });
      ((R && R.sessions) || []).forEach(s => { Rs[s.id] = s; });
      const revive = LS.get('syncRevive', []);
      revive.forEach(id => { if (L[id]) delete tomb[id]; });                // "Deshacer" de un borrado
      for (const id in bS) if (!L[id] && !tomb[id]) tomb[id] = now;        // borrada en este equipo
      const out = {};
      new Set(Object.keys(L).concat(Object.keys(Rs))).forEach(id => {
        if (tomb[id]) return;
        const l = L[id], r = Rs[id];
        if (l && r) { const lh = syncHash(l), rh = syncHash(r), bh = bS[id]; out[id] = lh === rh || rh === bh ? l : lh === bh ? r : ((r.mt || 0) > (l.mt || 0) ? r : l); }
        else out[id] = l || r;
      });
      for (const id in tomb) if (now - tomb[id] > TOMB_DAYS * 864e5) delete tomb[id];
      const sessions = Object.keys(out).map(k => out[k]).sort((a, b) => String(b.date).localeCompare(String(a.date)));
      if (syncHash(sessions) !== syncHash(state.sessions.map(cleanSess))) { state.sessions = sessions; changed = true; }

      /* --- Hábitos del día (creatina, proteína, omega 3, agua) --- */
      const Rd = (R && R.daily) || {}, bD = (B && B.d) || {}, daily = {};
      new Set(Object.keys(state.daily).concat(Object.keys(Rd))).forEach(k => {
        const l = state.daily[k], r = Rd[k];
        if (l && r) {
          const lh = syncHash(l), rh = syncHash(r), bh = bD[k];
          if (lh === rh || rh === bh) daily[k] = l;
          else if (lh === bh) daily[k] = r;
          else daily[k] = Object.assign({}, r, l, { crea: !!(l.crea || r.crea), prot: !!(l.prot || r.prot), omega: !!(l.omega || r.omega), water: Math.max(l.water || 0, r.water || 0) });
        } else daily[k] = l || r;
      });
      const dkeys = Object.keys(daily).sort(); while (dkeys.length > 200) delete daily[dkeys.shift()];
      if (syncHash(daily) !== syncHash(state.daily)) { state.daily = daily; changed = true; }

      /* --- Planes, gimnasios y ajustes compartidos --- */
      const rp = R && R.profile, lstamp = state.settings.stamp || 0;
      const takeRemote = rp && (!B ? ((R.sessions || []).length >= state.sessions.length) : (rp.stamp || 0) > lstamp);
      if (takeRemote && syncHash([rp.plans, rp.gyms, rp.settings]) !== syncHash([state.plans, state.gyms, this.shared()])) {
        state.plans = JSON.parse(JSON.stringify(rp.plans));
        if (rp.gyms) state.gyms = JSON.parse(JSON.stringify(rp.gyms));
        const keep = {}; SYNC_LOCAL_KEYS.forEach(k => { if (k in state.settings) keep[k] = state.settings[k]; });
        state.settings = Object.assign({}, state.settings, rp.settings, keep);
        try { if (typeof migrateGyms === 'function') migrateGyms(); } catch (e) {}
        changed = true;
      }

      if (changed) {
        this.applying = true;
        try { LS.set('plans', state.plans); LS.set('settings', state.settings); LS.set('sessions', state.sessions); LS.set('gyms', state.gyms); LS.set('daily', state.daily); }
        finally { this.applying = false; }
      }

      const doc = { app: 'forja', v: 1, profile: { stamp: state.settings.stamp || 0, plans: state.plans, gyms: state.gyms, settings: this.shared() },
        sessions: state.sessions.map(cleanSess), daily: state.daily, tomb };
      const strip = d => d ? { profile: d.profile, sessions: d.sessions, daily: d.daily, tomb: d.tomb } : null;
      if (!R || syncHash(strip(doc)) !== syncHash(strip(R))) { doc.at = new Date().toISOString(); doc.by = isWatch() ? 'reloj' : 'celular'; await this.writeRemote(doc); }

      const s = {}, d = {};
      state.sessions.forEach(x => { s[x.id] = syncHash(cleanSess(x)); });
      Object.keys(state.daily).forEach(k => { d[k] = syncHash(state.daily[k]); });
      this.base = { s, d }; LS.set('syncBase', this.base); LS.del('syncRevive');
      this.cfg.last = Date.now(); this.cfg.err = null; this.save();
      this.status = 'ok'; state.sync = 'cloud';
      if (changed) { if (typeof scheduleSoon === 'function') scheduleSoon(); safeRender(); }
      else paintSync();
    } catch (e) {
      const offline = navigator.onLine === false || (e instanceof TypeError && /fetch|network|load/i.test(e.message));
      this.status = offline ? 'offline' : 'error';
      if (!offline && this.cfg) { this.cfg.err = e.message; this.save(); }
      if (e.auth && this.cfg) { this.cfg.err = e.message; this.save(); }
      paintSync();
    } finally {
      this.busy = false;
      if (this.again) { this.again = false; this.soon(1500); }
    }
  },
  revive(ids) { LS.set('syncRevive', LS.get('syncRevive', []).concat(ids)); },
  soon(ms) { if (!this.on()) return; clearTimeout(this.timer); this.timer = setTimeout(() => this.run(), ms == null ? 3000 : ms); },
};

/* Cada vez que la app guarda algo, se programa una sincronización */
const _saveLocalSync = saveLocal;
saveLocal = function () { _saveLocalSync(); if (!sync.applying) sync.soon(); };
const _saveDailySync = saveDaily;
saveDaily = function () { _saveDailySync(); if (!sync.applying) sync.soon(); };
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') sync.soon(400); else if (sync.on()) sync.run(); });
window.addEventListener('online', () => sync.soon(500));
setInterval(() => { if (document.visibilityState === 'visible') sync.run(); }, 60000);

/* ---------- Interfaz ---------- */
function syncAgo(t) {
  if (!t) return 'nunca';
  const m = Math.round((Date.now() - t) / 60000);
  return m < 1 ? 'hace un momento' : m < 60 ? `hace ${m} min` : m < 1440 ? `hace ${Math.round(m / 60)} h` : fmtDate(new Date(t).toISOString());
}
function syncLine() {
  const c = sync.cfg || {};
  if (sync.status === 'syncing') return { cls: 'cloud', txt: 'Sincronizando…' };
  if (sync.status === 'offline') return { cls: 'local', txt: 'Sin internet · se subirá luego' };
  if (c.err) return { cls: 'local', txt: 'Error: ' + c.err };
  return { cls: 'cloud', txt: 'Sincronizado ' + syncAgo(c.last) };
}
function paintSync() {
  const el = document.getElementById('sync-status'); if (!el) return;
  const l = syncLine(); el.className = 'syncst ' + l.cls; el.innerHTML = `<span class="dot"></span>${esc(l.txt)}`;
}
function syncCard() {
  if (!sync.on()) return `<div class="card" id="sync-card"><h3>${typeof ic === 'function' ? ic('refresh-cw', 18) + ' ' : ''}Celular y reloj sincronizados</h3>
    <div class="muted" style="font-size:12.5px">Tus entrenamientos, planes, notas, creatina y agua se guardan en un archivo privado de tu cuenta de GitHub y se copian a cada equipo donde pongas la misma llave. Sigue funcionando sin internet: lo que registres se sube cuando vuelva la conexión.</div>
    <ol class="sync-steps">
      <li>Crea tu llave en GitHub: marca solo <b>gist</b>, en <i>Expiration</i> elige <b>No expiration</b> y toca <b>Generate token</b>. Copia el código que empieza con <b>ghp_</b>.</li>
      <li>Pégala aquí y toca <b>Conectar</b>. Hazlo primero en el celular.</li>
      <li>En el reloj, abre Ajustes y pon la misma llave.</li></ol>
    <button class="btn block" data-act="sync-gh">Crear llave en GitHub</button>
    <div class="field"><label class="label" for="sync-token">Llave de GitHub</label><input id="sync-token" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="ghp_…"></div>
    <button class="btn primary block" data-act="sync-connect">Conectar</button></div>`;
  const l = syncLine();
  return `<div class="card" id="sync-card"><div class="row" style="justify-content:space-between"><h3>Celular y reloj sincronizados</h3></div>
    <span id="sync-status" class="syncst ${l.cls}"><span class="dot"></span>${esc(l.txt)}</span>
    <div class="muted" style="font-size:12.5px">Para sincronizar otro equipo, pon la misma llave en sus Ajustes. El modo reloj, los sonidos, la pantalla y los recordatorios son propios de cada equipo.</div>
    <div class="grid2"><button class="btn" data-act="sync-now" ${sync.busy ? 'disabled' : ''}>Sincronizar ahora</button>
      <button class="btn danger" data-act="sync-off">${state.confirm === 'sync-off' ? '¿Seguro? Toca otra vez' : 'Desconectar'}</button></div></div>`;
}
const _vSettingsSync = vSettings;
vSettings = function () {
  const h = _vSettingsSync();
  const at = h.indexOf('<div class="card"><h3>Respaldo</h3>');
  return at < 0 ? h + syncCard() : h.slice(0, at) + syncCard() + h.slice(at);
};

document.addEventListener('click', async ev => {
  const b = ev.target.closest('[data-act^="sync-"]'); if (!b) return;
  ev.stopPropagation();
  const a = b.dataset.act;
  if (a === 'sync-gh') { if (window.Capacitor) location.href = SYNC_TOKEN_URL; else window.open(SYNC_TOKEN_URL, '_blank', 'noopener'); }
  if (a === 'sync-connect') {
    const v = (document.getElementById('sync-token').value || '').trim().replace(/\s+/g, '');
    if (!/^(ghp_|github_pat_)[A-Za-z0-9_]{20,}$/.test(v)) { toast('Esa llave no parece válida. Debe empezar con ghp_'); return; }
    sync.cfg = { token: v }; sync.base = null; LS.del('syncBase'); sync.save();
    b.disabled = true; b.textContent = 'Conectando…';
    await sync.run();
    if (sync.cfg && sync.cfg.last) { toast('¡Listo! Este equipo ya está sincronizado.'); }
    else { const err = (sync.cfg && sync.cfg.err) || 'Revisa tu conexión a internet.'; sync.cfg = null; LS.del('sync'); toast('No se pudo conectar: ' + err); }
    state.sync = sync.on() ? 'cloud' : 'local'; render();
  }
  if (a === 'sync-now') { await sync.run(); render(); }
  if (a === 'sync-off') {
    if (state.confirm === 'sync-off') { sync.cfg = null; sync.base = null; LS.del('sync'); LS.del('syncBase'); state.confirm = null; state.sync = 'local'; toast('Desconectado. Tus datos siguen en este equipo.'); render(); }
    else { state.confirm = 'sync-off'; b.textContent = '¿Seguro? Toca otra vez'; }
  }
}, true);

if (sync.on()) { state.sync = 'cloud'; sync.soon(800); }
