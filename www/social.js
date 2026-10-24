/* ==========================================================================
   Fase 4 · Crecimiento (13-oct-2026)
   1. Logros: medallas por constancia, récords, volumen, cardio y hábitos (Perfil → Progreso).
   2. Amigos y retos: código de 6 letras, ranking semanal (sesiones, series o cardio).
      Solo se comparte un resumen: nombre, objetivo y números de la semana.
   3. Modo entrenador: el alumno comparte su progreso con el código del entrenador; el entrenador
      ve sus sesiones y le envía rutinas, que el alumno acepta o rechaza.
   Firestore: social/{acc}, codes/{code}, share/{acc}, inbox/{acc}/items/{id} (ver ci/firestore.rules).
   ========================================================================== */

/* ---------- 1. Logros ---------- */
const BADGES = [
  ['s1', 'Primer entreno', 'dumbbell', 'total', 1], ['s10', '10 entrenos', 'dumbbell', 'total', 10], ['s25', '25 entrenos', 'dumbbell', 'total', 25],
  ['s50', '50 entrenos', 'medal', 'total', 50], ['s100', '100 entrenos', 'crown', 'total', 100],
  ['w4', '4 semanas cumpliendo', 'flame', 'weeks', 4], ['w12', '12 semanas cumpliendo', 'flame', 'weeks', 12],
  ['p1', 'Primer récord', 'trophy', 'prs', 1], ['p10', '10 récords', 'trophy', 'prs', 10], ['p50', '50 récords', 'trophy', 'prs', 50],
  ['t10', '10 toneladas levantadas', 'layers', 'tons', 10], ['t100', '100 toneladas levantadas', 'layers', 'tons', 100],
  ['c150', '150 min de cardio en una semana', 'heart-pulse', 'cdWeek', 150], ['c1k', '1000 min de cardio', 'footprints', 'cdTotal', 1000],
  ['h7', '7 días seguidos con todos tus hábitos', 'calendar-check', 'habRun', 7], ['e5', 'Madrugador: 5 entrenos antes de las 8', 'sun', 'early', 5],
];
const bdCache = { k: '', st: null };
function badgeStats() {
  const k = state.sessions.length + ':' + Object.keys(state.daily).length + ':' + (state.sessions[0] ? state.sessions[0].date : '');
  if (bdCache.k === k) return bdCache.st;
  const ss = state.sessions.filter(s => !s.approx).slice().sort((a, b) => a.date.localeCompare(b.date));
  const best = {}; let prs = 0, vol = 0, early = 0;
  ss.forEach(s => {
    if (new Date(s.date).getHours() < 8) early++;
    s.exercises.forEach(e => {
      let top = 0; e.sets.forEach(x => { vol += (+x.w || 0) * (+x.r || 0); top = Math.max(top, e1rm(+x.w || 0, +x.r || 0)); });
      if (best[e.name] && top > best[e.name] * 1.001) prs++;
      best[e.name] = Math.max(best[e.name] || 0, top);
    });
  });
  const wk = {}; let cdTotal = 0;
  Object.keys(state.daily).forEach(d => { const c = (state.daily[d].cardio || []).filter(x => !x.del); c.forEach(x => { cdTotal += x.min; const w = wkKey(d + 'T12:00:00'); wk[w] = (wk[w] || 0) + x.min * ({ s: 0, m: 1, v: 2 }[x.z || 'm']); }); });
  const habs = habList().filter(h => !h.hidden); let run = 0, habRun = 0;
  if (habs.length) Object.keys(state.daily).sort().forEach((d, i, arr) => {
    const t = state.daily[d], ok = habs.every(h => t[h.k]), om = !ok && habs.every(h => t[h.k] || (t.skip && t.skip[h.k]));   // con omitidos: pausa (ni suma ni corta)
    const prev = i ? arr[i - 1] : null, cont = prev && (new Date(d) - new Date(prev)) <= 864e5 * 1.5;
    run = ok ? (cont ? run + 1 : 1) : om && cont ? run : 0; habRun = Math.max(habRun, run);
  });
  let weeks = 0; try { weeks = (streakInfo() || {}).weeks || 0; } catch (e) {}
  const lbs = state.settings.unit === 'lb';
  const st = { total: ss.length, weeks, prs, tons: Math.floor(vol / (lbs ? 2204.6 : 1000)), cdWeek: Object.keys(wk).reduce((a, x) => Math.max(a, wk[x]), 0), cdTotal, habRun, early };
  bdCache.k = k; bdCache.st = st; return st;
}
const earned = () => { const st = badgeStats(); return BADGES.filter(b => st[b[3]] >= b[4]).map(b => b[0]); };
function badgeCard() {
  const st = badgeStats(), got = earned();
  return `<div class="card bd-badges"><div class="row"><span class="pb-ic">${ic('medal', 18)}</span><h3 class="grow">Logros</h3><span class="chip">${got.length}/${BADGES.length}</span></div>
    <div class="bdg-grid">${BADGES.map(b => { const on = got.indexOf(b[0]) >= 0, v = Math.min(st[b[3]], b[4]); return `<div class="bdg ${on ? 'on' : ''}" title="${esc(b[1])}"><span class="bdg-ic">${ic(b[2], 20)}</span><small>${esc(b[1])}</small>${on ? '' : `<i class="bdg-p"><b style="width:${Math.round(v / b[4] * 100)}%"></b></i>`}</div>`; }).join('')}</div></div>`;
}
function badgeCheck() {
  const got = earned(), seen = state.settings.badgesSeen;
  if (!Array.isArray(seen)) { state.settings.badgesSeen = got; saveLocal(); return; }
  const nw = got.filter(k => seen.indexOf(k) < 0); if (!nw.length) return;
  state.settings.badgesSeen = seen.concat(nw); savePlans();
  const b = BADGES.find(x => x[0] === nw[nw.length - 1]); setTimeout(() => toast(`🏅 ¡Nuevo logro! ${b[1]}`), 600);
}

/* ---------- Firestore (resúmenes, códigos, bandeja) ---------- */
const SOC = { feed: null, at: 0, inbox: [], busy: false, metric: 'n', err: '' };
const socAuth = () => !!(typeof FIREBASE !== 'undefined' && FIREBASE && typeof fb !== 'undefined' && fb.auth && fb.auth.acc && !fb.auth.watch);
const socMe = () => fb.auth.acc;
const fS = v => ({ stringValue: String(v) });
const fJ = d => { try { return JSON.parse(d.fields.j.stringValue); } catch (e) { return null; } };
const fV = (d, k) => (d && d.fields && d.fields[k] && (d.fields[k].stringValue != null ? d.fields[k].stringValue : d.fields[k].arrayValue ? (d.fields[k].arrayValue.values || []).map(x => x.stringValue) : null));
const CODE_AB = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const newCode = () => { let c = ''; for (let i = 0; i < 6; i++) c += CODE_AB[Math.floor(Math.random() * CODE_AB.length)]; return c; };
async function socCode() {
  if (state.settings.myCode && state.settings.myCodeAcc === socMe()) return state.settings.myCode;
  for (let i = 0; i < 4; i++) {
    const c = newCode();
    try { await fb.fs('PATCH', 'codes/' + c, null, { fields: { acc: fS(socMe()) } }); state.settings.myCode = c; state.settings.myCodeAcc = socMe(); savePlans(); return c; } catch (e) { if (e.st !== 'PERMISSION_DENIED') throw e; }
  }
  throw new Error('No se pudo crear tu código. Intenta otra vez.');
}
async function socLookup(code) {
  const c = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (c.length !== 6) throw new Error('El código tiene 6 letras o números.');
  if (c === state.settings.myCode) throw new Error('Ese es tu propio código.');
  const d = await fb.fs('GET', 'codes/' + c); const acc = fV(d, 'acc');
  if (!acc) throw new Error('No encontramos ese código.');
  return { acc, code: c };
}
const meName = () => { const p = state.settings.prof; return (p && p.name) || HISTORY.name || 'Atleta'; };
function socSummary() {
  const r = weekReport(0), st = badgeStats();
  return { n: r.n, t: r.target, sets: r.sets, prs: r.prs.length, cd: r.cd.act, streak: st.weeks, total: st.total, badges: earned().length, goal: goalNow(), ws: dk(r.ws) };
}
function shareData() {
  const plan = activePlan(), p = state.settings.prof || {}, r = weekReport(0);
  const last = state.sessions.filter(s => !s.approx).slice(0, 8).map(s => ({ d: s.date, n: s.dayName, m: Math.round((s.durationSec || 0) / 60), x: s.exercises.map(e => ({ n: e.name, s: e.sets.map(x => [+x.w || 0, +x.r || 0, x.rir != null ? x.rir : null]), no: e.note || '' })) }));
  const wa = typeof weekAvgs === 'function' ? weekAvgs() : [];
  return { name: meName(), goal: goalNow(), exp: p.exp, days: p.days, plan: plan ? plan.name : '', unit: state.settings.unit || 'kg', week: { n: r.n, t: r.target, sets: r.sets, cd: r.cd.act, sleep: r.sleep, steps: r.steps }, kg: wa.length ? Math.round(wa[wa.length - 1].v * 10) / 10 : null, inj: p.inj || [], last, at: Date.now() };
}
async function socPublish(force) {
  if (!socAuth()) return;
  const S = state.settings, now = Date.now();
  if (!force && now - (S.socPubAt || 0) < 10 * 60000) return;
  S.socPubAt = now; saveLocal();
  if (S.social) await fb.fs('PATCH', 'social/' + socMe(), null, { fields: { name: fS(meName()), j: fS(JSON.stringify(socSummary())), at: { timestampValue: new Date().toISOString() } } });
  if ((S.trainers || []).length) await fb.fs('PATCH', 'share/' + socMe(), null, { fields: { trainers: fb.arr(S.trainers.map(t => t.acc)), j: fS(JSON.stringify(shareData())) } });
}
async function socInbox() {
  if (!socAuth()) return;
  const j = await fb.fs('GET', 'inbox/' + socMe() + '/items'); const docs = (j && j.documents) || [];
  const plans = [];
  for (const d of docs) {
    const t = fV(d, 'type'), from = fV(d, 'from'), id = d.name.split('/').pop();
    if (t === 'client') {
      const cl = state.settings.clients = state.settings.clients || [];
      if (!cl.some(c => c.acc === from)) { cl.push({ acc: from, name: fV(d, 'name') || 'Alumno' }); savePlans(); toast(`${fV(d, 'name') || 'Un alumno'} comparte su progreso contigo.`); }
      fb.fs('DELETE', 'inbox/' + socMe() + '/items/' + id).catch(() => {});
    } else if (t === 'plan') plans.push({ id, from, name: fV(d, 'name') || 'Tu entrenador', plan: fJ(d) });
  }
  SOC.inbox = plans;
}
async function socFeed() {
  const fr = state.settings.friends || [];
  const docs = await Promise.all(fr.map(f => fb.fs('GET', 'social/' + f.acc).catch(() => null)));
  const ws = dk(weekStartOf(new Date()));
  const rows = fr.map((f, i) => { const s = docs[i] && fJ(docs[i]); return { acc: f.acc, name: (docs[i] && fV(docs[i], 'name')) || f.name, s: s && s.ws === ws ? s : (s ? Object.assign({}, s, { n: 0, sets: 0, cd: 0, prs: 0 }) : null) }; });
  rows.push({ acc: socMe(), name: meName() + ' (tú)', s: socSummary(), me: true });
  SOC.feed = rows; SOC.at = Date.now();
}
async function socRefresh(force) {
  if (!socAuth() || SOC.busy || (!force && Date.now() - SOC.at < 5 * 60000)) return;
  SOC.busy = true; SOC.err = '';
  try { await socPublish(force); await socInbox(); if (state.settings.social) await socFeed(); }
  catch (e) { SOC.err = e && e.message || 'Sin conexión'; }
  SOC.busy = false;
  if (state.tab === 'profile' || state.tab === 'train') render();
}

/* ---------- 2. Amigos y retos ---------- */
const MET = { n: ['sesiones', 'Sesiones'], sets: ['series', 'Series'], cd: ['min cardio', 'Cardio'] };
function socialCard() {
  if (!socAuth()) return `<div class="card soc-card"><div class="row"><span class="pb-ic">${ic('trophy', 18)}</span><h3 class="grow">Amigos y retos</h3></div><div class="muted" style="font-size:13px">Compite cada semana con tus amigos del gimnasio. Necesitas una cuenta para usarlo.</div><button type="button" class="btn small" data-so="login">Crear cuenta o iniciar sesión</button></div>`;
  if (!state.settings.social) return `<div class="card soc-card"><div class="row"><span class="pb-ic">${ic('trophy', 18)}</span><h3 class="grow">Amigos y retos</h3></div>
    <div class="muted" style="font-size:13px">Agrega amigos con un código y compitan cada semana en sesiones, series o minutos de cardio. Solo verán tu nombre y esos números, nunca tus pesos, tu cuerpo ni tu salud.</div>
    <button type="button" class="btn small primary" data-so="on">Activar amigos y retos</button></div>`;
  const rows = (SOC.feed || []).slice().sort((a, b) => ((b.s && b.s[SOC.metric]) || 0) - ((a.s && a.s[SOC.metric]) || 0));
  return `<div class="card soc-card"><div class="row"><span class="pb-ic">${ic('trophy', 18)}</span><h3 class="grow">Reto de la semana</h3><button type="button" class="icon-btn" data-so="refresh" aria-label="Actualizar">${ic('refresh-cw', 16)}</button></div>
    <div class="seg seg3">${Object.keys(MET).map(k => `<button type="button" class="${SOC.metric === k ? 'on' : ''}" data-so="met" data-v="${k}">${MET[k][1]}</button>`).join('')}</div>
    ${SOC.feed ? `<div class="soc-list">${rows.map((r, i) => `<div class="soc-row ${r.me ? 'me' : ''}"><span class="soc-pos num">${i + 1}</span><span class="grow"><b>${esc(r.name)}</b>${r.s ? `<small>${r.s.streak ? '🔥 ' + r.s.streak + ' sem · ' : ''}${r.s.badges || 0} logros</small>` : '<small>Aún sin datos</small>'}</span><b class="num">${(r.s && r.s[SOC.metric]) || 0}</b><small class="soc-u">${MET[SOC.metric][0]}</small>${r.me ? '' : `<button type="button" class="icon-btn sm" data-so="del" data-acc="${r.acc}" aria-label="Quitar a ${esc(r.name)}">${ic('x', 14)}</button>`}</div>`).join('')}</div>` : `<div class="muted" style="font-size:13px">${SOC.busy ? 'Cargando…' : SOC.err ? esc(SOC.err) : 'Toca actualizar.'}</div>`}
    ${(state.settings.friends || []).length ? '' : '<div class="muted" style="font-size:12.5px">Aún no tienes amigos agregados. Comparte tu código o escribe el de un amigo.</div>'}
    <div class="row" style="gap:8px;flex-wrap:wrap"><button type="button" class="btn small primary" data-so="add">${ic('plus', 15)} Agregar amigo</button><button type="button" class="btn small" data-so="mycode">Mi código: <b class="num">${esc(state.settings.myCode || '······')}</b></button></div></div>`;
}
function codeSheet(kind) {
  const t = { friend: ['Agregar amigo', 'Escribe el código de tu amigo (lo ve en Perfil → Hoy → Mi código).', 'Agregar'], trainer: ['Compartir con mi entrenador', 'Escribe el código de tu entrenador. Verá tus entrenamientos de las últimas semanas, tu rutina, tu peso promedio y tus molestias, y podrá enviarte rutinas. Puedes dejar de compartir cuando quieras.', 'Compartir'] }[kind];
  openSheet(`<div class="row"><h2 class="grow">${t[0]}</h2><button class="icon-btn" data-act="sheet-close" aria-label="Cerrar">${ic('x', 18)}</button></div>
    <div class="muted" style="font-size:13px">${t[1]}</div>
    <input id="so-code" class="so-code num" maxlength="6" autocapitalize="characters" autocomplete="off" placeholder="ABC123" aria-label="Código">
    <div class="muted" id="so-msg" style="font-size:12.5px"></div>
    <button type="button" class="btn primary block" data-so="${kind === 'friend' ? 'add-go' : 'tr-go'}">${t[2]}</button>`);
}
async function addFriend() {
  const m = $('#so-msg'), v = ($('#so-code') || {}).value;
  try {
    const f = await socLookup(v); const fr = state.settings.friends = state.settings.friends || [];
    if (fr.some(x => x.acc === f.acc)) throw new Error('Ya está en tu lista.');
    const d = await fb.fs('GET', 'social/' + f.acc).catch(() => null);
    fr.push({ acc: f.acc, code: f.code, name: (d && fV(d, 'name')) || 'Amigo' }); savePlans();
    closeSheet(); toast(`${(d && fV(d, 'name')) || 'Tu amigo'} se unió a tu reto.`); SOC.at = 0; socRefresh(true);
  } catch (e) { if (m) m.textContent = e.message; }
}

/* ---------- 3. Modo entrenador ---------- */
function trainerCard() {
  if (!socAuth()) return '';
  const tr = state.settings.trainers || [];
  const offers = SOC.inbox.map(o => `<div class="tr-offer"><b>${esc(o.name)}</b> te envió la rutina <b>${esc(o.plan && o.plan.name || '')}</b> (${o.plan ? o.plan.days.length : 0} días).
    <div class="row" style="gap:8px;margin-top:6px"><button type="button" class="btn small primary" data-so="plan-ok" data-id="${o.id}">Usar esta rutina</button><button type="button" class="btn small" data-so="plan-no" data-id="${o.id}">Rechazar</button></div></div>`).join('');
  return `<div class="card tr-card"><div class="row"><span class="pb-ic">${ic('user', 18)}</span><h3 class="grow">Tu entrenador</h3></div>
    ${offers}
    ${tr.length ? tr.map(t => `<div class="row soc-row"><span class="grow"><b>${esc(t.name || 'Entrenador')}</b><small>Ve tu progreso y te puede enviar rutinas</small></span><button type="button" class="btn small" data-so="tr-del" data-acc="${t.acc}">Dejar de compartir</button></div>`).join('')
    : '<div class="muted" style="font-size:13px">¿Entrenas con un entrenador que usa Forja? Comparte tu progreso con su código y recibe tus rutinas en la app.</div>'}
    <button type="button" class="btn small" data-so="tr-add">${ic('plus', 15)} ${tr.length ? 'Agregar otro entrenador' : 'Compartir con mi entrenador'}</button></div>`;
}
async function linkTrainer() {
  const m = $('#so-msg'), v = ($('#so-code') || {}).value;
  try {
    const t = await socLookup(v); const tr = state.settings.trainers = state.settings.trainers || [];
    if (tr.some(x => x.acc === t.acc)) throw new Error('Ya compartes con este entrenador.');
    const d = await fb.fs('GET', 'social/' + t.acc).catch(() => null);
    tr.push({ acc: t.acc, name: (d && fV(d, 'name')) || 'Entrenador', code: t.code }); savePlans();
    await socPublish(true);
    await fb.fs('POST', 'inbox/' + t.acc + '/items', null, { fields: { type: fS('client'), from: fS(socMe()), name: fS(meName()), at: { timestampValue: new Date().toISOString() } } });
    closeSheet(); toast('Listo: tu entrenador ya puede ver tu progreso.'); render();
  } catch (e) { if (m) m.textContent = e.message; }
}
function coachModeCard() {
  const S = state.settings;
  return `<div class="card coachmode-card"><h3>Modo entrenador</h3>
    <div class="row"><span class="grow muted" style="font-size:13px">Para entrenadores: tus alumnos comparten su progreso con tu código, ves sus sesiones y les envías rutinas.${socAuth() ? '' : ' Necesitas una cuenta.'}</span>
    <button type="button" class="switch ${S.coachMode ? 'on' : ''}" style="border:0;cursor:pointer;margin-left:12px" data-so="cm" role="switch" aria-checked="${!!S.coachMode}" aria-label="Modo entrenador"><i></i></button></div>
    ${S.coachMode && S.myCode ? `<div class="muted" style="font-size:12.5px">Tu código para alumnos: <b class="num">${esc(S.myCode)}</b></div>` : ''}</div>`;
}
function clientsCard() {
  if (!state.settings.coachMode || !socAuth()) return '';
  const cl = state.settings.clients || [];
  return `<div class="card cl-card"><div class="row"><span class="pb-ic">${ic('clipboard-list', 18)}</span><h3 class="grow">Mis alumnos</h3><span class="chip">${cl.length}</span></div>
    ${cl.length ? cl.map(c => `<button type="button" class="set-row" data-so="cl" data-acc="${c.acc}">${ic('user', 16)}<span class="grow">${esc(c.name)}</span>${ic('chevron-right', 16)}</button>`).join('') : '<div class="muted" style="font-size:13px">Aún no tienes alumnos.</div>'}
    <div class="muted" style="font-size:12.5px">Tus alumnos escriben tu código <b class="num">${esc(state.settings.myCode || '')}</b> en Perfil → Hoy → Tu entrenador.</div></div>`;
}
async function clientSheet(acc) {
  const c = (state.settings.clients || []).find(x => x.acc === acc); if (!c) return;
  openSheet(`<div class="row"><h2 class="grow">${esc(c.name)}</h2><button class="icon-btn" data-act="sheet-close" aria-label="Cerrar">${ic('x', 18)}</button></div><div class="muted">Cargando…</div>`);
  let d = null; try { d = await fb.fs('GET', 'share/' + acc); } catch (e) {}
  const s = d && fJ(d);
  if (!s) { openSheet(`<div class="row"><h2 class="grow">${esc(c.name)}</h2><button class="icon-btn" data-act="sheet-close" aria-label="Cerrar">${ic('x', 18)}</button></div><div class="muted">Este alumno dejó de compartir su progreso contigo.</div><button class="btn" data-so="cl-del" data-acc="${acc}">Quitar de mis alumnos</button>`); return; }
  const u = s.unit || 'kg', G = PB_GOALS[s.goal] ? PB_GOALS[s.goal][0] : s.goal;
  openSheet(`<div class="row"><h2 class="grow">${esc(s.name || c.name)}</h2><button class="icon-btn" data-act="sheet-close" aria-label="Cerrar">${ic('x', 18)}</button></div>
    <div class="muted" style="font-size:13px">${esc(G || '')}${s.plan ? ' · Rutina: ' + esc(s.plan) : ''}${s.kg ? ' · ' + fmtKg(s.kg) + ' kg (promedio)' : ''}${(s.inj || []).length ? ' · Molestias: ' + s.inj.map(k => (PB_INJ.find(x => x[0] === k) || [k, k])[1]).join(', ') : ''}</div>
    <div class="wk-grid"><div class="wk-s"><b class="num">${s.week.n}/${s.week.t}</b><small>sesiones</small></div><div class="wk-s"><b class="num">${s.week.sets}</b><small>series</small></div><div class="wk-s"><b class="num">${s.week.cd}</b><small>min cardio</small></div><div class="wk-s"><b class="num">${s.week.sleep ? fmtHM(s.week.sleep).replace(' min', '') : '—'}</b><small>sueño</small></div></div>
    <div class="label">Últimas sesiones</div>
    <div class="cl-ses">${(s.last || []).map(x => `<details><summary><b>${fmtDate(x.d)}</b> · ${esc(x.n || '')}${x.m ? ' · ' + x.m + ' min' : ''}</summary>${x.x.map(e => `<div class="cl-ex"><b>${esc(e.n)}</b> <span class="muted">${e.s.map(y => fmtKg(y[0]) + '×' + y[1] + (y[2] != null ? ' @' + y[2] : '')).join(' · ')} ${u}</span>${e.no ? `<small>“${esc(e.no)}”</small>` : ''}</div>`).join('')}</details>`).join('') || '<div class="muted">Sin sesiones aún.</div>'}</div>
    <div class="label">Enviarle una de tus rutinas</div>
    ${gymPlans().map(p => `<button type="button" class="set-row" data-so="send" data-acc="${acc}" data-pid="${p.id}">${ic('clipboard-list', 16)}<span class="grow">${esc(p.name)} <small class="muted">· ${p.days.length} días</small></span>${ic('arrow-right', 16)}</button>`).join('')}
    <div class="muted" style="font-size:11.5px">Actualizado ${fmtDate(new Date(s.at).toISOString(), true)}. Tu alumno decide si la usa.</div>`);
}
async function sendPlan(acc, pid) {
  const p = state.plans.find(x => x.id === pid); if (!p) return;
  const clean = { name: p.name, days: p.days.map(d => ({ name: d.name, weekday: d.weekday, kind: d.kind, exercises: d.exercises.map(e => ({ name: e.name, type: e.type, weight: e.weight, sets: e.sets, repsMin: e.repsMin, repsMax: e.repsMax, rest: e.rest, bar: e.bar, note: e.note, ss: e.ss ? 1 : undefined })) })) };
  try {
    await fb.fs('POST', 'inbox/' + acc + '/items', null, { fields: { type: fS('plan'), from: fS(socMe()), name: fS(meName()), j: fS(JSON.stringify(clean)), at: { timestampValue: new Date().toISOString() } } });
    toast(`Rutina "${p.name}" enviada.`);
  } catch (e) { toast(e.st === 'PERMISSION_DENIED' ? 'Este alumno ya no comparte contigo.' : (e.message || 'No se pudo enviar.')); }
}
function acceptPlan(id) {
  const o = SOC.inbox.find(x => x.id === id); if (!o || !o.plan) return;
  const g = activeGym().id;
  const plan = { id: 'tr-' + uid(), name: o.plan.name + ' (de ' + o.name + ')', gymId: g, from: o.from, days: o.plan.days.map(d => ({ id: 'd' + uid(), name: d.name, weekday: d.weekday, kind: d.kind || 'fuerza', exercises: d.exercises.map(e => Object.assign({}, e, { id: uid() })) })) };
  state.plans.push(plan); state.settings.planByGym = Object.assign({}, state.settings.planByGym, { [g]: plan.id }); state.settings.activePlanId = plan.id; savePlans();
  SOC.inbox = SOC.inbox.filter(x => x.id !== id); fb.fs('DELETE', 'inbox/' + socMe() + '/items/' + id).catch(() => {});
  toast('Rutina de tu entrenador activada.'); render();
}

/* ---------- Clics ---------- */
document.addEventListener('click', ev => {
  const b = ev.target.closest && ev.target.closest('[data-so]'); if (!b) return;
  ev.preventDefault(); ev.stopPropagation();
  const a = b.dataset.so, S = state.settings;
  if (a === 'login') { state.tab = 'settings'; render(); return; }
  if (a === 'on') { S.social = 1; savePlans(); socCode().then(() => socRefresh(true)).catch(e => toast(e.message)); render(); return; }
  if (a === 'refresh') { SOC.at = 0; socRefresh(true); toast('Actualizando…'); return; }
  if (a === 'met') { SOC.metric = b.dataset.v; render(); return; }
  if (a === 'add') return codeSheet('friend');
  if (a === 'add-go') return addFriend();
  if (a === 'mycode') { const c = S.myCode; if (!c) return; const t = `Compite conmigo en Forja: mi código es ${c}`; if (CAP && CAP.Share) CAP.Share.share({ text: t }).catch(() => {}); else if (navigator.clipboard) navigator.clipboard.writeText(c).then(() => toast('Código copiado.'), () => toast('Tu código: ' + c)); else toast('Tu código: ' + c); return; }
  if (a === 'del') { S.friends = (S.friends || []).filter(f => f.acc !== b.dataset.acc); savePlans(); if (SOC.feed) SOC.feed = SOC.feed.filter(r => r.acc !== b.dataset.acc); render(); return; }
  if (a === 'tr-add') { socCode().catch(() => {}); return codeSheet('trainer'); }
  if (a === 'tr-go') return linkTrainer();
  if (a === 'tr-del') { S.trainers = (S.trainers || []).filter(t => t.acc !== b.dataset.acc); savePlans(); fb.fs('PATCH', 'share/' + socMe(), null, { fields: { trainers: fb.arr(S.trainers.map(t => t.acc)), j: fS(S.trainers.length ? JSON.stringify(shareData()) : '{}') } }).catch(() => {}); toast('Dejaste de compartir con ese entrenador.'); render(); return; }
  if (a === 'cm') { S.coachMode = !S.coachMode; savePlans(); if (S.coachMode && socAuth()) socCode().then(() => { render(); socRefresh(true); }).catch(e => toast(e.message)); render(); return; }
  if (a === 'cl') return clientSheet(b.dataset.acc);
  if (a === 'cl-del') { S.clients = (S.clients || []).filter(c => c.acc !== b.dataset.acc); savePlans(); closeSheet(); render(); return; }
  if (a === 'send') return sendPlan(b.dataset.acc, b.dataset.pid);
  if (a === 'plan-ok') return acceptPlan(b.dataset.id);
  if (a === 'plan-no') { SOC.inbox = SOC.inbox.filter(x => x.id !== b.dataset.id); fb.fs('DELETE', 'inbox/' + socMe() + '/items/' + b.dataset.id).catch(() => {}); render(); return; }
}, true);

/* ---------- Colocar tarjetas ---------- */
const _vSettingsSo = vSettings;
vSettings = function () { return _vSettingsSo() + coachModeCard(); };
SET_ORDER.push(['Modo entrenador', 1.7]);
SET_ORDER.sort((a, b) => a[1] - b[1]);
const _finishSo = finishSession;
finishSession = function () { const r = _finishSo.apply(this, arguments); state.settings.socPubAt = 0; setTimeout(() => socRefresh(true), 1500); return r; };
const _renderSo = render;
render = function () {
  _renderSo();
  const app = $('#app'); if (!app || isWatch()) return;
  if (state.tab === 'profile' && state.profSub === 'hoy' && !app.querySelector('.soc-card')) {
    const wk = app.querySelector('.wk-card') || app.querySelector('.day-strip');
    if (wk) wk.insertAdjacentHTML('afterend', clientsCard() + socialCard() + trainerCard());
  }
  if (state.tab === 'profile' && state.profSub === 'progress' && !app.querySelector('.bd-badges')) {
    const seg = app.querySelector('.prof-seg'); if (seg) seg.insertAdjacentHTML('afterend', badgeCard());
  }
  if (state.tab === 'train' && !state.draft && SOC.inbox.length && !app.querySelector('.tr-card')) {
    const hero = app.querySelector(':scope > .hero'); if (hero) hero.insertAdjacentHTML('beforebegin', trainerCard());
  }
  badgeCheck();
};
setTimeout(() => socRefresh(true), 5000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) setTimeout(() => socRefresh(false), 2000); });
bootRender();
