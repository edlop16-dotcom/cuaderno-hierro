/* ==========================================================================
   Cuenta Forja + sincronización celular ↔ reloj (Firebase, sin SDK: REST).
   - Celular: cuenta con correo y contraseña.
   - Reloj: se vincula con un código de 6 letras que escribes en el celular.
   - Cada equipo guarda todo localmente (funciona sin internet) y, cuando hay
     conexión, baja la copia de la nube, la mezcla con la suya y sube el resultado.
   - Mezcla de 3 vías con la "base" (lo último que este equipo sincronizó):
     así sabe qué cambió aquí, qué cambió en el otro equipo y qué se borró.
   - Lo propio de cada equipo no se sincroniza: modo reloj, pantalla, sonidos,
     recordatorios y la sesión que esté en curso.
   ========================================================================== */
const SYNC_LOCAL_KEYS = ['watch', 'awake', 'alert'];
const TOMB_DAYS = 120;
const PAIR_ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const syncHash = o => { const s = JSON.stringify(o); let h = 5381; for (let i = 0; i < s.length; i++) h = (h * 33 ^ s.charCodeAt(i)) >>> 0; return h.toString(36) + ':' + s.length; };
const cleanSess = s => { const o = Object.assign({}, s); delete o.synced; return o; };

const AUTH_ERR = {
  EMAIL_EXISTS: 'Ese correo ya tiene cuenta. Toca "Iniciar sesión".',
  EMAIL_NOT_FOUND: 'No hay cuenta con ese correo.',
  INVALID_PASSWORD: 'Contraseña incorrecta.',
  INVALID_LOGIN_CREDENTIALS: 'Correo o contraseña incorrectos.',
  INVALID_EMAIL: 'Ese correo no es válido.',
  WEAK_PASSWORD: 'La contraseña debe tener al menos 6 caracteres.',
  MISSING_PASSWORD: 'Escribe tu contraseña.',
  TOO_MANY_ATTEMPTS_TRY_LATER: 'Demasiados intentos. Prueba en unos minutos.',
  USER_DISABLED: 'Esta cuenta está desactivada.',
  OPERATION_NOT_ALLOWED: 'El inicio de sesión no está activado en el servidor.',
  ADMIN_ONLY_OPERATION: 'El acceso de relojes no está activado en el servidor.',
};

/* ---------- Firebase por REST ---------- */
const fb = {
  auth: LS.get('auth', null),   // { uid, acc, email, refresh, token, exp, watch }
  saveAuth() { this.auth ? LS.set('auth', this.auth) : LS.del('auth'); },
  async idt(method, body) {
    const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:${method}?key=${FIREBASE.apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { const code = ((j.error && j.error.message) || 'ERROR').split(/[ :]/)[0]; const e = new Error(AUTH_ERR[code] || 'No se pudo: ' + code); e.code = code; throw e; }
    return j;
  },
  setSession(j, extra) {
    this.auth = Object.assign({}, this.auth || {}, { uid: j.localId || j.user_id, token: j.idToken || j.id_token, refresh: j.refreshToken || j.refresh_token, exp: Date.now() + (+(j.expiresIn || j.expires_in || 3600) - 120) * 1000 }, extra || {});
    this.saveAuth();
  },
  async token() {
    if (!this.auth) throw Object.assign(new Error('Sin sesión'), { auth: true });
    if (this.auth.token && Date.now() < this.auth.exp) return this.auth.token;
    const r = await fetch(`https://securetoken.googleapis.com/v1/token?key=${FIREBASE.apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=refresh_token&refresh_token=' + encodeURIComponent(this.auth.refresh) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error('Tu sesión venció. Vuelve a iniciar sesión.'), { auth: true });
    this.setSession(j); return this.auth.token;
  },
  url(path) { return `https://firestore.googleapis.com/v1/projects/${FIREBASE.projectId}/databases/(default)/documents/${path}`; },
  async fs(method, path, query, body) {
    const r = await fetch(this.url(path) + (query ? '?' + query : ''), { method, cache: 'no-store', headers: Object.assign({ Authorization: 'Bearer ' + await this.token() }, body ? { 'Content-Type': 'application/json' } : {}), body: body ? JSON.stringify(body) : undefined });
    if (r.status === 404 && method === 'GET') return null;
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      const st = (j.error && j.error.status) || '';
      const e = new Error(st === 'PERMISSION_DENIED' ? 'Sin permiso para estos datos.' : 'El servidor respondió ' + r.status);
      e.status = r.status; e.st = st; e.retry = /FAILED_PRECONDITION|ALREADY_EXISTS|ABORTED/.test(st);
      if (r.status === 401) e.auth = true;
      throw e;
    }
    return j;
  },
  str: v => ({ stringValue: String(v) }),
  arr: a => (a.length ? { arrayValue: { values: a.map(v => ({ stringValue: v })) } } : { arrayValue: {} }),
  fval(f, k) { const v = f && f[k]; if (!v) return null; if ('stringValue' in v) return v.stringValue; if ('integerValue' in v) return +v.integerValue; if ('arrayValue' in v) return (v.arrayValue.values || []).map(x => x.stringValue); return null; },
};
const mask = keys => keys.map(k => 'updateMask.fieldPaths=' + k).join('&');

const sync = {
  meta: LS.get('syncMeta', {}),     // { last, err }
  base: LS.get('syncBase', null),   // { s:{id:hash}, d:{fecha:hash} }
  busy: false, again: false, timer: null, applying: false, status: 'idle',
  on() { return !!(FIREBASE && fb.auth && fb.auth.acc); },
  saveMeta() { LS.set('syncMeta', this.meta); },
  async readRemote() {
    const j = await fb.fs('GET', 'accounts/' + fb.auth.acc);
    if (!j) return { doc: null, ut: null };
    const raw = fb.fval(j.fields, 'data');
    let doc = null; try { doc = raw ? JSON.parse(raw) : null; } catch (e) {}
    return { doc, ut: j.updateTime };
  },
  async writeRemote(doc, ut) {
    const fields = { data: fb.str(JSON.stringify(doc)), at: { integerValue: String(Date.now()) } };
    let q;
    if (ut) q = mask(['data', 'at']) + '&currentDocument.updateTime=' + encodeURIComponent(ut);
    else { fields.members = fb.arr([]); q = mask(['data', 'at', 'members']) + '&currentDocument.exists=false'; }
    await fb.fs('PATCH', 'accounts/' + fb.auth.acc, q, { fields });
  },
  shared() { const o = {}; for (const k in state.settings) if (!SYNC_LOCAL_KEYS.includes(k)) o[k] = state.settings[k]; return o; },

  async run() {
    if (!this.on()) return;
    if (this.busy) { this.again = true; return; }
    if (navigator.onLine === false) { this.status = 'offline'; paintSync(); return; }
    this.busy = true; this.status = 'syncing'; paintSync();
    try {
      const got = await this.readRemote(), R = got.doc;
      const B = this.base, now = Date.now();
      let changed = false;

      /* --- Sesiones --- */
      const tomb = Object.assign({}, (R && R.tomb) || {});
      const L = {}, Rs = {}, bS = (B && B.s) || {};
      state.sessions.forEach(s => { L[s.id] = cleanSess(s); });
      ((R && R.sessions) || []).forEach(s => { Rs[s.id] = s; });
      LS.get('syncRevive', []).forEach(id => { if (L[id]) delete tomb[id]; });   // "Deshacer" de un borrado
      for (const id in bS) if (!L[id] && !tomb[id]) tomb[id] = now;             // borrada en este equipo
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
      // Primera vez en este equipo: manda la nube, salvo que este equipo tenga más historial
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
      if (!R || syncHash(strip(doc)) !== syncHash(strip(R))) { doc.at = new Date().toISOString(); doc.by = isWatch() ? 'reloj' : 'celular'; await this.writeRemote(doc, got.ut); }

      const s = {}, d = {};
      state.sessions.forEach(x => { s[x.id] = syncHash(cleanSess(x)); });
      Object.keys(state.daily).forEach(k => { d[k] = syncHash(state.daily[k]); });
      this.base = { s, d }; LS.set('syncBase', this.base); LS.del('syncRevive');
      this.meta = { last: Date.now(), err: null }; this.saveMeta();
      this.status = 'ok'; state.sync = 'cloud';
      if (changed) { if (typeof scheduleSoon === 'function') scheduleSoon(); safeRender(); }
      else paintSync();
    } catch (e) {
      if (e.retry) { this.again = true; this.status = 'syncing'; }   // el otro equipo escribió justo antes: repetir
      else {
        const offline = navigator.onLine === false || (e instanceof TypeError && /fetch|network|load/i.test(e.message));
        this.status = offline ? 'offline' : 'error';
        if (!offline) { this.meta.err = e.message; this.saveMeta(); }
      }
      paintSync();
    } finally {
      this.busy = false;
      if (this.again) { this.again = false; this.soon(1200); }
    }
  },
  revive(ids) { LS.set('syncRevive', LS.get('syncRevive', []).concat(ids)); },
  soon(ms) { if (!this.on()) return; clearTimeout(this.timer); this.timer = setTimeout(() => this.run(), ms == null ? 3000 : ms); },
  reset() { this.base = null; LS.del('syncBase'); this.meta = {}; this.saveMeta(); },
};

/* Cada vez que la app guarda algo, se programa una sincronización */
const _saveLocalSync = saveLocal;
saveLocal = function () { _saveLocalSync(); if (!sync.applying) sync.soon(); };
const _saveDailySync = saveDaily;
saveDaily = function () { _saveDailySync(); if (!sync.applying) sync.soon(); };
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { sync.soon(400); if (pair.code) pair.poll(); } else if (sync.on()) sync.run(); });
window.addEventListener('online', () => sync.soon(500));
setInterval(() => { if (document.visibilityState === 'visible') sync.run(); }, 60000);

/* ---------- Cuenta ---------- */
const account = {
  async signIn(email, password, create) {
    const j = await fb.idt(create ? 'signUp' : 'signInWithPassword', { email, password, returnSecureToken: true });
    fb.auth = null; fb.setSession(j, { acc: j.localId, email: j.email || email, watch: false });
    sync.reset(); await sync.run();
  },
  async reset(email) { await fb.idt('sendOobCode', { requestType: 'PASSWORD_RESET', email }); },
  logout() { fb.auth = null; fb.saveAuth(); sync.reset(); pair.stop(); state.sync = 'local'; },
  // Celular: vincula el reloj que muestra este código
  async link(code) {
    code = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length !== 6) throw new Error('El código tiene 6 letras o números.');
    const p = await fb.fs('GET', 'pairs/' + code);
    if (!p) throw new Error('No encontré ese código. Revisa que el reloj lo siga mostrando.');
    const w = fb.fval(p.fields, 'watch'), at = fb.fval(p.fields, 'at') || 0;
    if (!w || Date.now() - at > 15 * 60000) throw new Error('Ese código ya venció. Pide uno nuevo en el reloj.');
    if (!(await fb.fs('GET', 'accounts/' + fb.auth.acc))) await sync.run();          // asegurar que exista la cuenta
    const a = await fb.fs('GET', 'accounts/' + fb.auth.acc);
    const members = (fb.fval(a && a.fields, 'members') || []).filter(x => x !== w).concat([w]).slice(-5);
    await fb.fs('PATCH', 'accounts/' + fb.auth.acc, mask(['members']), { fields: { members: fb.arr(members) } });
    await fb.fs('PATCH', 'pairs/' + code, mask(['acc', 'email']), { fields: { acc: fb.str(fb.auth.acc), email: fb.str(fb.auth.email || '') } });
  },
  async unlinkWatches() { await fb.fs('PATCH', 'accounts/' + fb.auth.acc, mask(['members']), { fields: { members: fb.arr([]) } }); },
};

/* Reloj: pide un código y espera a que el celular lo confirme */
const pair = {
  code: null, timer: null, until: 0, err: null,
  async start() {
    this.err = null;
    if (!fb.auth || !fb.auth.watch) { const j = await fb.idt('signUp', { returnSecureToken: true }); fb.auth = null; fb.setSession(j, { acc: null, watch: true }); }
    let code = '';
    for (let i = 0; i < 6; i++) code += PAIR_ABC[Math.floor(Math.random() * PAIR_ABC.length)];
    await fb.fs('PATCH', 'pairs/' + code, 'currentDocument.exists=false', { fields: { watch: fb.str(fb.auth.uid), at: { integerValue: String(Date.now()) } } });
    this.code = code; this.until = Date.now() + 14 * 60000; this.poll();
  },
  stop() { clearTimeout(this.timer); this.code = null; },
  async poll() {
    clearTimeout(this.timer);
    if (!this.code) return;
    if (Date.now() > this.until) { this.stop(); this.err = 'El código venció. Pide otro.'; safeRender(); return; }
    try {
      const p = await fb.fs('GET', 'pairs/' + this.code);
      const acc = p && fb.fval(p.fields, 'acc');
      if (acc) {
        const code = this.code; this.stop();
        fb.auth.acc = acc; fb.auth.email = fb.fval(p.fields, 'email') || ''; fb.saveAuth();
        fb.fs('DELETE', 'pairs/' + code).catch(() => {});
        sync.reset(); await sync.run();
        toast('¡Reloj vinculado! Ya tienes tus datos aquí.'); render(); return;
      }
    } catch (e) {}
    this.timer = setTimeout(() => this.poll(), 3000);
  },
};

/* ---------- Interfaz ---------- */
function syncAgo(t) {
  if (!t) return 'nunca';
  const m = Math.round((Date.now() - t) / 60000);
  return m < 1 ? 'hace un momento' : m < 60 ? `hace ${m} min` : m < 1440 ? `hace ${Math.round(m / 60)} h` : fmtDate(new Date(t).toISOString());
}
function syncLine() {
  if (sync.status === 'syncing') return { cls: 'cloud', txt: 'Sincronizando…' };
  if (sync.status === 'offline') return { cls: 'local', txt: 'Sin internet · se subirá luego' };
  if (sync.meta.err) return { cls: 'local', txt: sync.meta.err };
  return { cls: 'cloud', txt: 'Sincronizado ' + syncAgo(sync.meta.last) };
}
function paintSync() {
  const el = document.getElementById('sync-status'); if (!el) return;
  const l = syncLine(); el.className = 'syncst ' + l.cls; el.innerHTML = `<span class="dot"></span>${esc(l.txt)}`;
}
const statusPill = () => { const l = syncLine(); return `<span id="sync-status" class="syncst ${l.cls}"><span class="dot"></span>${esc(l.txt)}</span>`; };
function pairView() {
  return `<div class="pair-code num" aria-label="Código ${pair.code.split('').join(' ')}">${pair.code.slice(0, 3)}<i></i>${pair.code.slice(3)}</div>
    <div class="muted" style="font-size:12.5px;text-align:center">En tu celular: <b>Ajustes → Tu cuenta → Vincular reloj</b> y escribe este código.</div>
    <div class="pair-wait">${ic('refresh-cw', 14)} Esperando al celular…</div>
    <button class="btn small block" data-act="acct-pair-cancel">Cancelar</button>`;
}
function accountCard() {
  const title = `<h3 style="display:flex;align-items:center;gap:8px">${ic('shield', 18)} Tu cuenta</h3>`;
  if (!FIREBASE) return `<div class="card">${title}<div class="muted" style="font-size:12.5px">Las cuentas se activan en la próxima versión. Mientras tanto, tus datos se guardan en este equipo.</div></div>`;
  if (pair.code) return `<div class="card">${title}${pairView()}</div>`;
  const a = fb.auth;
  if (a && a.acc && a.watch) return `<div class="card">${title}
    <div class="row"><div class="avatar sm" aria-hidden="true">${esc((a.email || 'F')[0].toUpperCase())}</div><div class="grow" style="min-width:0"><div style="font-weight:700">Reloj vinculado</div><div class="muted" style="font-size:12.5px;overflow:hidden;text-overflow:ellipsis">${esc(a.email || 'Tu cuenta')}</div></div></div>
    ${statusPill()}
    <div class="grid2"><button class="btn" data-act="acct-sync">Sincronizar</button><button class="btn danger" data-act="acct-out">${state.confirm === 'acct-out' ? '¿Seguro? Toca otra vez' : 'Desvincular'}</button></div></div>`;
  if (a && a.acc) return `<div class="card">${title}
    <div class="row"><div class="avatar sm" aria-hidden="true">${esc((a.email || 'F')[0].toUpperCase())}</div><div class="grow" style="min-width:0"><div style="font-weight:700;overflow:hidden;text-overflow:ellipsis">${esc(a.email)}</div><div class="muted" style="font-size:12.5px">Tus datos se guardan en tu cuenta y se copian a tu reloj.</div></div></div>
    ${statusPill()}
    <button class="btn primary block" data-act="acct-link">${ic('plus', 16)} Vincular reloj</button>
    <div class="grid2"><button class="btn" data-act="acct-sync">Sincronizar ahora</button><button class="btn danger" data-act="acct-out">${state.confirm === 'acct-out' ? '¿Seguro? Toca otra vez' : 'Cerrar sesión'}</button></div>
    <button class="btn small" data-act="acct-unlink" style="align-self:flex-start">${state.confirm === 'acct-unlink' ? '¿Quitar todos los relojes? Toca otra vez' : 'Desvincular relojes'}</button></div>`;
  const signup = state.authMode !== 'login';
  return `<div class="card" id="acct-card">${title}
    <div class="muted" style="font-size:12.5px">Con tu cuenta tus entrenamientos quedan guardados en la nube y se comparten con tu reloj, como en Symmetry. Sigue funcionando sin internet.</div>
    <div class="seg" role="tablist"><button role="tab" class="${signup ? 'on' : ''}" aria-selected="${signup}" data-act="acct-mode" data-m="signup">Crear cuenta</button><button role="tab" class="${signup ? '' : 'on'}" aria-selected="${!signup}" data-act="acct-mode" data-m="login">Iniciar sesión</button></div>
    <div class="field"><label class="label" for="acct-email">Correo</label><input id="acct-email" type="email" autocomplete="email" autocapitalize="off" spellcheck="false" placeholder="tucorreo@gmail.com" value="${esc(state.authEmail || '')}"></div>
    <div class="field"><label class="label" for="acct-pass">Contraseña</label><input id="acct-pass" type="password" autocomplete="${signup ? 'new-password' : 'current-password'}" placeholder="${signup ? 'Mínimo 6 caracteres' : ''}"></div>
    <button class="btn primary block" data-act="acct-go">${signup ? 'Crear cuenta' : 'Entrar'}</button>
    ${signup ? '' : '<button class="btn small" data-act="acct-forgot" style="align-self:flex-start">¿Olvidaste tu contraseña?</button>'}
    <div class="divider"><span>¿Es tu reloj?</span></div>
    <button class="btn block" data-act="acct-pair">Vincular con mi celular</button>
    ${pair.err ? `<div class="muted" style="font-size:12.5px">${esc(pair.err)}</div>` : ''}</div>`;
}
function linkSheet(err) {
  openSheet(`<h2>Vincular reloj</h2>
    <div class="muted" style="font-size:13px">En el reloj abre Forja y toca <b>Vincular con mi celular</b>. Escribe aquí el código que aparece.</div>
    <form id="f-wlink" class="grid2" style="grid-template-columns:1fr">
      <input id="wlink-code" class="code-in num" maxlength="7" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="ABC123" aria-label="Código del reloj">
      ${err ? `<div class="err">${esc(err)}</div>` : ''}
      <div class="grid2"><button type="button" class="btn" data-act="sheet-close">Cancelar</button><button class="btn primary" type="submit">Vincular</button></div></form>`);
}

/* Ajustes: tarjeta de cuenta arriba */
const _vSettingsSync = vSettings;
vSettings = function () {
  const h = _vSettingsSync();
  const at = h.indexOf('<div class="card">');
  return at < 0 ? h + accountCard() : h.slice(0, at) + accountCard() + h.slice(at);
};
/* Inicio: invitación a crear cuenta (se puede cerrar) */
const _vTrainSync = vTrain;
vTrain = function () {
  const h = _vTrainSync();
  if (!FIREBASE || (fb.auth && fb.auth.acc) || state.draft || LS.get('acctNudge', 0) > Date.now()) return h;
  const card = `<div class="card nudge"><div class="row"><span class="hi">${ic('shield', 18)}</span><div class="grow"><b>Guarda tus datos en tu cuenta</b><div class="muted" style="font-size:12.5px">Así no los pierdes y los ves también en tu reloj.</div></div>
    <button class="icon-btn" data-act="acct-nudge-x" aria-label="Cerrar">${ic('x', 16)}</button></div>
    <button class="btn primary small" data-act="acct-open" style="align-self:flex-start">Crear cuenta</button></div>`;
  const at = h.indexOf('<div class="card');
  return at < 0 ? h + card : h.slice(0, at) + card + h.slice(at);
};
/* Reloj: inicio con botón para vincular, y pantalla del código */
const _vWatchHomeSync = vWatchHome;
vWatchHome = function () {
  if (FIREBASE && pair.code) return `<div class="w-set">Vincular reloj</div>${pairView()}`;
  const h = _vWatchHomeSync();
  if (!FIREBASE || (fb.auth && fb.auth.acc)) return h;
  const btn = `<button class="btn small block" data-act="acct-pair">${ic('refresh-cw', 14)} Vincular con mi celular</button>${pair.err ? `<div class="w-hint">${esc(pair.err)}</div>` : ''}`;
  const at = h.indexOf('<div class="w-nav">'), end = at < 0 ? -1 : h.indexOf('</div>', at);
  return end < 0 ? h + btn : h.slice(0, end + 6) + btn + h.slice(end + 6);
};

document.addEventListener('click', async ev => {
  const b = ev.target.closest('[data-act^="acct-"]'); if (!b) return;
  ev.stopPropagation();
  const a = b.dataset.act;
  const busy = t => { b.disabled = true; b.textContent = t; };
  try {
    if (a === 'acct-mode') { state.authEmail = (document.getElementById('acct-email') || {}).value || state.authEmail; state.authMode = b.dataset.m; render(); }
    if (a === 'acct-open') { state.tab = 'settings'; state.authMode = 'signup'; render(); scrollTo(0, 0); }
    if (a === 'acct-nudge-x') { LS.set('acctNudge', Date.now() + 7 * 864e5); render(); }
    if (a === 'acct-go') {
      const email = document.getElementById('acct-email').value.trim(), pass = document.getElementById('acct-pass').value;
      state.authEmail = email;
      if (!/^\S+@\S+\.\S+$/.test(email)) { toast('Escribe un correo válido.'); return; }
      if (pass.length < 6) { toast('La contraseña debe tener al menos 6 caracteres.'); return; }
      busy(state.authMode === 'login' ? 'Entrando…' : 'Creando…');
      await account.signIn(email, pass, state.authMode !== 'login');
      toast(state.authMode === 'login' ? '¡Hola de nuevo! Tus datos están al día.' : '¡Cuenta creada! Tus datos ya están en la nube.');
      render();
    }
    if (a === 'acct-forgot') {
      const email = document.getElementById('acct-email').value.trim();
      if (!/^\S+@\S+\.\S+$/.test(email)) { toast('Escribe tu correo arriba y vuelve a tocar.'); return; }
      await account.reset(email); toast('Te enviamos un correo para cambiar tu contraseña.');
    }
    if (a === 'acct-pair') { busy('Pidiendo código…'); await pair.start(); render(); }
    if (a === 'acct-pair-cancel') { const c = pair.code; pair.stop(); if (c) fb.fs('DELETE', 'pairs/' + c).catch(() => {}); render(); }
    if (a === 'acct-link') linkSheet();
    if (a === 'acct-sync') { busy('Sincronizando…'); await sync.run(); render(); }
    if (a === 'acct-out') {
      if (state.confirm === 'acct-out') { state.confirm = null; account.logout(); toast('Sesión cerrada. Tus datos siguen en este equipo.'); render(); }
      else { state.confirm = 'acct-out'; b.textContent = '¿Seguro? Toca otra vez'; }
    }
    if (a === 'acct-unlink') {
      if (state.confirm === 'acct-unlink') { state.confirm = null; await account.unlinkWatches(); toast('Relojes desvinculados.'); render(); }
      else { state.confirm = 'acct-unlink'; b.textContent = '¿Quitar todos los relojes? Toca otra vez'; }
    }
  } catch (e) {
    const msg = (e instanceof TypeError) ? 'Sin conexión a internet.' : e.message;
    if (a === 'acct-pair') pair.err = msg;
    toast(msg); render();
  }
}, true);
document.addEventListener('submit', async ev => {
  if (ev.target.id !== 'f-wlink') return;
  ev.preventDefault(); ev.stopPropagation();
  const code = document.getElementById('wlink-code').value, btn = ev.target.querySelector('[type=submit]');
  btn.disabled = true; btn.textContent = 'Vinculando…';
  try { await account.link(code); closeSheet(); toast('¡Reloj vinculado!'); render(); }
  catch (e) { linkSheet(e instanceof TypeError ? 'Sin conexión a internet.' : e.message); }
}, true);
document.addEventListener('input', ev => { if (ev.target.id === 'wlink-code') ev.target.value = ev.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6); });

if (sync.on()) { state.sync = 'cloud'; sync.soon(800); }
