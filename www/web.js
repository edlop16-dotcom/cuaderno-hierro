/* ==========================================================================
   Versión web (navegador de PC o celular)
   - Misma app y misma cuenta: se sincroniza con el celular y el reloj por Firebase.
   - Entrar con Google en la web usa "Google Identity Services" (botón oficial de Google).
   - Se puede instalar como app (PWA) y funciona sin internet.
   ========================================================================== */
const IS_WEB = !(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
const IS_PREVIEW = typeof FIREBASE === 'undefined' || !FIREBASE;

if (IS_WEB) {
  document.documentElement.classList.add('is-web');

  /* --- Entrar con Google en el navegador --- */
  const gisLoad = () => new Promise((res, rej) => {
    if (window.google && google.accounts && google.accounts.id) return res();
    const s = document.createElement('script'); s.src = 'https://accounts.google.com/gsi/client'; s.async = true;
    s.onload = () => res(); s.onerror = () => rej(new Error('No se pudo cargar Google. Revisa tu conexión.')); document.head.appendChild(s);
  });
  account.google = function () {
    return gisLoad().then(() => new Promise((resolve, reject) => {
      let done = false;
      google.accounts.id.initialize({
        client_id: FIREBASE.googleClientId, ux_mode: 'popup', auto_select: false, cancel_on_tap_outside: true,
        callback: r => {
          if (done) return; done = true;
          closeSheet();
          fb.idt('signInWithIdp', { postBody: 'id_token=' + encodeURIComponent(r.credential) + '&providerId=google.com', requestUri: 'http://localhost', returnSecureToken: true, returnIdpCredential: true })
            .then(j => { fb.auth = null; fb.setSession(j, { acc: j.localId, email: j.email || '', watch: false }); sync.reset(); return sync.run(); })
            .then(resolve, reject);
        },
      });
      openSheet(`<div class="row"><h2 class="grow">Entrar con Google</h2><button class="icon-btn" data-act="gis-x" aria-label="Cerrar">${ic('x', 18)}</button></div>
        <div class="muted" style="font-size:13px">Usa la misma cuenta de Google que en tu celular: verás tus mismos entrenamientos.</div>
        <div id="gis-btn" class="gis-btn"></div>`);
      google.accounts.id.renderButton(document.getElementById('gis-btn'), { theme: 'filled_black', size: 'large', shape: 'pill', text: 'continue_with', locale: 'es', width: 300 });
      const x = document.querySelector('[data-act="gis-x"]');
      if (x) x.onclick = () => { if (!done) { done = true; closeSheet(); const c = new Error(''); c.silent = true; reject(c); } };
    }));
  };
  /* El botón de Google también en la web */
  const _accountCardW = accountCard;
  accountCard = function () {
    let h = _accountCardW();
    if (FIREBASE && FIREBASE.googleClientId && h.indexOf('id="acct-card"') >= 0 && h.indexOf('acct-google') < 0) {
      const at = h.indexOf('<div class="seg" role="tablist">');
      if (at > 0) h = h.slice(0, at) + `<button class="btn gbtn block" data-act="acct-google">${G_LOGO} Continuar con Google</button><div class="divider"><span>o con tu correo</span></div>` + h.slice(at);
    }
    /* En la web no tiene sentido "¿Es tu reloj?" */
    h = h.replace(/<div class="divider"><span>¿Es tu reloj\?<\/span><\/div>[\s\S]*?(<\/div>\s*)$/, '$1');
    return h;
  };

  /* --- Abrir enlaces externos (Claude) en otra pestaña --- */
  openExt = u => { const w = window.open(u, '_blank'); if (w) { try { w.opener = null; } catch (e) {} } else location.href = u; };

  /* --- Inicio en la web: invitar a entrar con la misma cuenta --- */
  const _vTrainW = vTrain;
  vTrain = function () {
    const h = _vTrainW();
    if (IS_PREVIEW || (fb.auth && fb.auth.acc) || state.settings.webHintOff || h.indexOf('id="sx"') >= 0) return h;
    const card = `<div class="card web-hint"><div class="row" style="gap:12px"><span class="sh-ic">${ic('refresh-cw', 20)}</span><div class="grow" style="min-width:0"><b>Estás en Forja web</b><div class="muted" style="font-size:12.5px">Entra con la misma cuenta de tu celular para ver y editar tus entrenamientos aquí.</div></div><button class="icon-btn sm" data-act="web-hint-x" aria-label="Ocultar">${ic('x', 15)}</button></div>
      <button class="btn primary block" data-act="acct-open">${ic('user', 16)} Entrar con mi cuenta</button></div>`;
    const cands = ['<div class="card sorecard', '<button class="sore-mini', '<button class="meso-strip', '<div class="card habits2"'].map(x => h.indexOf(x)).filter(i => i >= 0);
    const at = cands.length ? Math.min.apply(null, cands) : -1;
    return at < 0 ? card + h : h.slice(0, at) + card + h.slice(at);
  };
  document.addEventListener('click', ev => { if (ev.target.closest('[data-act="web-hint-x"]')) { ev.stopPropagation(); state.settings.webHintOff = 1; saveLocal(); render(); } }, true);

  /* --- Sincronizar al volver a la pestaña y cada pocos minutos --- */
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && sync.on()) sync.soon(300); });
  setInterval(() => { if (document.visibilityState === 'visible' && sync.on() && !state.draft) sync.soon(0); }, 120000);

  /* --- Instalable y sin internet --- */
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});

  render();
}
