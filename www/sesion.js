/* ================== Sesión: cerrar y volver a entrar (rama login) ==================
   Cerrar sesión (solo teléfono; el reloj sigue con "Desvincular" como antes):
   1. Si hay un entreno en curso, no se cierra.
   2. Sincroniza. Sin internet o con error, avisa y NO borra nada.
   3. Muestra lo que solo vive en este teléfono (Mis finanzas, fotos, videos, chat…) y ofrece el Respaldo completo.
   4. Lo que está en la nube (sesiones, rutinas, ajustes, gimnasios, días) se borra del teléfono. Lo que solo vive
      aquí se guarda BLOQUEADO para esa cuenta: en localStorage como `lck.<cuenta>.<clave>` y en IndexedDB
      `forja-guardado`. Ninguna otra cuenta (ni usar sin cuenta) lo ve.
   5. Al volver a entrar con la misma cuenta, después de sincronizar, todo vuelve a su lugar (`lgUnlock`).
   Al entrar en un teléfono que ya tiene entrenos sin cuenta y la cuenta también tiene: "Usar lo de mi cuenta" o "Unir". */

const LG_CLOUD = ['cdh.sessions', 'cdh.plans', 'cdh.settings', 'cdh.gyms', 'cdh.daily'];
const LG_DROP = ['cdh.auth', 'cdh.syncMeta', 'cdh.syncBase', 'cdh.setMeta', 'cdh.syncRevive', 'cdh.updLatest', 'cdh.updCheckedAt', 'cdh.errq', 'cdh.profAsk', 'cdh.rcDone'];
const lgPre = acc => 'lck.' + acc + '.';

/* ---------- Guardado bloqueado en IndexedDB ---------- */
const lgDB = {
  db: null,
  open() {
    if (this.db) return Promise.resolve(this.db);
    return new Promise((res, rej) => {
      try {
        const r = indexedDB.open('forja-guardado', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('items', { keyPath: 'lk' });
        r.onsuccess = () => { this.db = r.result; res(this.db); };
        r.onerror = () => rej(r.error);
      } catch (e) { rej(e); }
    });
  },
  async put(list) {
    if (!list.length) return;
    const db = await this.open();
    await new Promise((res, rej) => { const t = db.transaction('items', 'readwrite'), s = t.objectStore('items'); list.forEach(x => s.put(x)); t.oncomplete = () => res(); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error); });
  },
  async mine(acc) {
    const db = await this.open();
    return new Promise(res => { const out = [], c = db.transaction('items').objectStore('items').openCursor(); c.onsuccess = () => { const cu = c.result; if (cu) { if (cu.value.acc === acc) out.push(cu.value); cu.continue(); } else res(out); }; c.onerror = () => res(out); });
  },
  async del(keys) {
    if (!keys.length) return;
    const db = await this.open();
    await new Promise(res => { const t = db.transaction('items', 'readwrite'), s = t.objectStore('items'); keys.forEach(k => s.delete(k)); t.oncomplete = () => res(); t.onerror = () => res(); });
  },
};
const lgSrc = { p: () => rcOpen(phDB), f: () => rcOpen(myDB), videos: () => VID.open() };
const lgKeyOf = (s, v) => (s === 'f' ? v.k : v.id);

/* Pasa lo que solo vive en el teléfono al guardado bloqueado de `acc`. Si algo falla, no se borra nada. */
async function lgLock(acc) {
  const P = await rcAll(phDB), M = await rcAll(myDB), V = await rcVids().catch(() => []);
  const items = [].concat(P.map(v => ['p', v]), M.map(v => ['f', v]), V.map(v => ['videos', v])).map(([s, v]) => ({ lk: acc + '|' + s + '|' + lgKeyOf(s, v), acc, s, v }));
  await lgDB.put(items);
  const pre = lgPre(acc), S = LS.get('settings', {}), loc = {};
  (typeof SYNC_LOCAL_KEYS !== 'undefined' ? SYNC_LOCAL_KEYS : []).forEach(k => { if (S[k] !== undefined) loc[k] = S[k]; });
  localStorage.setItem(pre + '__settings', JSON.stringify(loc));
  localStorage.setItem(pre + '__at', String(Date.now()));
  Object.keys(localStorage).filter(k => k.indexOf('cdh.') === 0 && LG_CLOUD.indexOf(k) < 0 && LG_DROP.indexOf(k) < 0).forEach(k => {
    localStorage.setItem(pre + k.slice(4), localStorage.getItem(k));
  });
  /* Ya está todo copiado: recién ahora se vacía el teléfono */
  for (const s of ['p', 'f', 'videos']) { const db = await lgSrc[s]().catch(() => null); if (db) await rcClear(db, s); }
  Object.keys(localStorage).filter(k => k.indexOf('cdh.') === 0).forEach(k => localStorage.removeItem(k));
}
const lgHasLock = acc => Object.keys(localStorage).some(k => k.indexOf(lgPre(acc)) === 0);
/* Devuelve lo guardado de `acc` a su lugar. Lo que ya existe en el teléfono no se pisa (y su copia se queda guardada). */
async function lgUnlock(acc) {
  if (!acc || isWatch()) return false;
  const pre = lgPre(acc), keys = Object.keys(localStorage).filter(k => k.indexOf(pre) === 0);
  const items = await lgDB.mine(acc).catch(() => []);
  if (!keys.length && !items.length) return false;
  const P = {}, M = {}, V = {};
  (await rcAll(phDB)).forEach(x => { P[x.id] = 1; }); (await rcAll(myDB)).forEach(x => { M[x.k] = 1; }); (await rcVids().catch(() => [])).forEach(x => { V[x.id] = 1; });
  const back = [];
  for (const it of items) {
    const has = it.s === 'p' ? P : it.s === 'f' ? M : V; if (has[lgKeyOf(it.s, it.v)]) continue;
    if (it.s === 'p') await new Promise(r => phDB.put(it.v, r)); else if (it.s === 'f') await new Promise(r => myDB.put(it.v, r)); else await VID.add(it.v);
    back.push(it.lk);
  }
  await lgDB.del(back);
  keys.forEach(k => {
    const name = k.slice(pre.length);
    if (name === '__at') return localStorage.removeItem(k);
    if (name === '__settings') { try { Object.assign(state.settings, JSON.parse(localStorage.getItem(k) || '{}')); LS.set('settings', state.settings); } catch (e) {} return localStorage.removeItem(k); }
    if (localStorage.getItem('cdh.' + name) == null) localStorage.setItem('cdh.' + name, localStorage.getItem(k));
    else if (/^fin/.test(name) && localStorage.getItem('cdh.' + name) !== localStorage.getItem(k)) return;   // Mis finanzas distintas: se guarda la copia
    localStorage.removeItem(k);   // lo que el arranque ya volvió a crear (versión, avisos…) se queda como está
  });
  return true;
}

/* ---------- Cerrar sesión ---------- */
const lgOut = { st: '', conf: false, err: '' };
async function lgAlarmsOff() {
  try { if (typeof HA !== 'undefined' && HA) await HA.schedule({ items: [], done: [] }); } catch (e) {}
  try { const LN = CAP && CAP.LocalNotifications; if (LN) { const p = await LN.getPending(); if (p && p.notifications && p.notifications.length) await LN.cancel(p); } } catch (e) {}
}
async function lgOutInv() {
  const P = await rcAll(phDB), M = await rcAll(myDB), V = await rcVids().catch(() => []);
  const n = rcLocalCounts(P.length, M.length, V.length); n.sessions = 0; n.fin = localStorage.getItem('cdh.fin') && finOwner() ? 1 : 0;
  return rcCount(n);
}
function lgOutSheet(inv) {
  const t = '<div class="row"><h2 class="grow">Cerrar sesión</h2>' + (lgOut.st === 'busy' || lgOut.st === 'sync' ? '' : `<button class="icon-btn" data-act="sheet-close" aria-label="Cerrar">${ic('x', 18)}</button>`) + '</div>';
  let b = '';
  if (lgOut.st === 'draft') b = '<div class="safe warn" style="font-size:13px">Tienes un entreno en curso. Termínalo o descártalo antes de cerrar sesión.</div><button class="btn block" data-act="sheet-close">Entendido</button>';
  else if (lgOut.st === 'sync') b = `<div class="lg-wait">${ic('refresh-cw', 18)} Guardando tus datos en tu cuenta…</div>`;
  else if (lgOut.st === 'fail') b = `<div class="safe warn" style="font-size:13px">${esc(lgOut.err)} No cerré la sesión para que no pierdas nada. Inténtalo cuando tengas internet.</div><button class="btn block" data-lo="retry">Intentar otra vez</button>`;
  else if (lgOut.st === 'busy') b = `<div class="lg-wait">${ic('refresh-cw', 18)} Cerrando sesión…</div>`;
  else b = `<div class="lg-ok">${ic('check', 16)} Tus entrenos, rutinas y ajustes ya están guardados en tu cuenta.</div>
    ${inv.length ? `<div class="muted" style="font-size:13px">Esto solo está en este teléfono: <b>${esc(inv.join(', '))}</b>. Se guardará bloqueado aquí y volverá cuando entres con tu cuenta. Si vas a desinstalar la app, haz antes el Respaldo completo.</div>
    <button class="btn block" data-lo="bk">${ic('download', 16)} Hacer Respaldo completo primero</button>` : ''}
    <div class="muted" style="font-size:12.5px">Este teléfono quedará vacío, listo para entrar con otra cuenta o empezar de cero.</div>
    <button class="btn danger block" data-lo="go">${lgOut.conf ? '¿Seguro? Toca otra vez' : 'Cerrar sesión'}</button>`;
  openSheet(t + b);
}
async function lgOutStart() {
  lgOut.conf = false; lgOut.err = '';
  if (state.draft) { lgOut.st = 'draft'; return lgOutSheet([]); }
  lgOut.st = 'sync'; lgOutSheet([]);
  await sync.run();
  if (sync.status !== 'ok') {
    lgOut.st = 'fail';
    lgOut.err = sync.status === 'offline' || navigator.onLine === false ? 'Sin internet: no se pudo guardar en tu cuenta.' : 'No se pudo guardar en tu cuenta' + (sync.meta.err ? ' (' + sync.meta.err + ')' : '') + '.';
    return lgOutSheet([]);
  }
  lgOut.st = 'ready'; lgOut.inv = await lgOutInv(); lgOutSheet(lgOut.inv);
}
async function lgOutGo() {
  const acc = fb.auth && fb.auth.acc; if (!acc) return;
  lgOut.st = 'busy'; lgOutSheet([]);
  try {
    await lgLock(acc);
  } catch (e) {
    lgOut.st = 'fail'; lgOut.err = 'No se pudo guardar lo de este teléfono (revisa el espacio libre).'; return lgOutSheet([]);
  }
  await lgAlarmsOff();
  try { account.logout(); } catch (e) {}
  Object.keys(localStorage).filter(k => k.indexOf('cdh.') === 0).forEach(k => localStorage.removeItem(k));
  try { sessionStorage.setItem('lgBye', '1'); } catch (e) {}
  location.reload();
}
document.addEventListener('click', ev => {
  const o = ev.target.closest && ev.target.closest('[data-act="acct-out"]');
  if (o && !isWatch() && fb.auth && fb.auth.acc && !fb.auth.watch) { ev.preventDefault(); ev.stopImmediatePropagation(); lgOutStart(); return; }
  const b = ev.target.closest && ev.target.closest('[data-lo]'); if (!b) return;
  ev.preventDefault(); ev.stopPropagation();
  const a = b.dataset.lo;
  if (a === 'retry') lgOutStart();
  else if (a === 'bk') rcMake();
  else if (a === 'go') { if (lgOut.conf) lgOutGo(); else { lgOut.conf = true; lgOutSheet(lgOut.inv || []); } }
  else if (a === 'acc' || a === 'mix') { const r = lgAsk.res; lgAsk.res = null; closeSheet(); if (r) r(a); }
}, true);

/* ---------- Al entrar: usar lo de la cuenta o unir ---------- */
const lgAsk = { first: null, res: null };
function lgAskSheet(nl, nr) {
  return new Promise(res => {
    lgAsk.res = res;
    openSheet(`<div class="row"><h2 class="grow">Tu cuenta ya tiene datos</h2></div>
      <div class="muted" style="font-size:13px">Tu cuenta tiene <b>${nr} ${nr === 1 ? 'entreno' : 'entrenos'}</b> y este teléfono tiene <b>${nl}</b> que no están en ella.</div>
      <button type="button" class="btn primary block" data-lo="acc">Usar lo de mi cuenta</button>
      <button type="button" class="btn block" data-lo="mix">Unir con lo de este teléfono</button>
      <div class="muted" style="font-size:12px">"Usar lo de mi cuenta" quita del teléfono los entrenos hechos sin cuenta (queda una copia automática).</div>`);
  });
}
async function lgChoose(f) {
  if (f.create || isWatch() || !state.sessions.length) return;
  const got = await sync.readRemote().catch(() => null), R = got && got.doc;
  const rs = (R && R.sessions) || []; if (!rs.length) return;
  const ids = {}; rs.forEach(s => { ids[s.id] = 1; });
  const nl = state.sessions.filter(s => !ids[s.id]).length; if (!nl) return;
  const c = await lgAskSheet(nl, rs.length);
  if (c === 'acc') {
    keepSnapshot('login');
    state.sessions = []; state.daily = {}; LS.set('sessions', []); LS.set('daily', {}); LS.del('profAsk');
  }
}
const _syncRunLg = sync.run;
sync.run = async function () {
  if (lgAsk.first) { const f = lgAsk.first; lgAsk.first = null; try { await lgChoose(f); } catch (e) {} }
  return _syncRunLg.apply(this, arguments);
};
['signIn', 'google'].forEach(k => {
  const f = account[k];
  account[k] = async function () {
    lgAsk.first = { create: k === 'signIn' && !!arguments[2] };
    try { await f.apply(this, arguments); } finally { lgAsk.first = null; }
    /* Lo guardado bloqueado de esta cuenta vuelve a su lugar y la app se recarga con todo */
    if (sync.status === 'ok' && fb.auth && await lgUnlock(fb.auth.acc).catch(() => false)) { try { sessionStorage.setItem('lgBack', '1'); } catch (e) {} location.reload(); await new Promise(() => {}); }
  };
});

try {
  if (sessionStorage.getItem('lgBye')) { sessionStorage.removeItem('lgBye'); setTimeout(() => toast('Sesión cerrada. Tus datos están en tu cuenta.'), 900); }
  if (sessionStorage.getItem('lgBack')) { sessionStorage.removeItem('lgBack'); setTimeout(() => toast('Listo: volvió todo lo que tenías en este teléfono.'), 900); }
} catch (e) {}
bootRender();
