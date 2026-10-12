/* ==========================================================================
   Coach con IA + Forja Pro
   - Chat en español que conoce tus datos (sesiones, cuerpo, nutrición, bloque, dolor).
   - Con servidor (AI_ENDPOINT, ver server/README.md): responde dentro de la app.
     Sin servidor: abre Claude con tu pregunta y tu resumen ya escritos.
   - Forja Pro: pantalla de planes y control de funciones Pro. Mientras PRO_ENFORCE sea
     false (beta), todo está desbloqueado. El cobro será con Google Play Billing.
   ========================================================================== */
var openExt = u => { location.href = u; };
const AI_CFG = { endpoint: '', maxDay: 20 };          // p. ej. 'https://forja-coach.<tu-usuario>.workers.dev'
const PRO_CFG = { enforce: false, monthly: 'S/ 14.90', yearly: 'S/ 99.90', trialDays: 7 };
const PRO_FEATS = [
  ['brain', 'Coach con IA', 'Pregúntale lo que quieras sobre tu entrenamiento: conoce tus datos.'],
  ['person-standing', 'Mapa muscular y nivel de fuerza', 'Series por músculo cada semana y tu rango en cada ejercicio.'],
  ['ruler', 'Mi cuerpo completo', 'Medidas, fotos de progreso, grasa estimada y tu potencial natural.'],
  ['layers', 'Mesociclos con descarga', 'Bloques que suben el esfuerzo y te recuperan a tiempo.'],
  ['download', 'Importar historial', 'Trae tus entrenamientos de Hevy y Strong.'],
  ['trending-up', 'Gráficas avanzadas', 'Todas las métricas y rangos de tiempo por ejercicio.'],
];
function proState() { return state.settings.pro || null; }
function isPro() { if (!PRO_CFG.enforce) return true; const p = proState(); return !!(p && p.until && p.until > Date.now()); }

/* ---------- Contexto que recibe la IA ---------- */
function aiContext() {
  const parts = [];
  try { parts.push(claudePrompt().split('\n\nDime:')[0].replace(/^Eres mi entrenador[^.]*\.\s*/, '')); } catch (e) {}
  try { const b = body(), bf = bodyFat(); parts.push(`Cuerpo: estatura ${b.h} cm, peso promedio ${fmtKg(r1(curWeight()))} kg${bf != null ? `, grasa estimada ${fmtKg(r1(bf))} %` : ''}.`); } catch (e) {}
  try { const c = nutriCalc(); parts.push(`Nutrición: objetivo ${NU_GOALS[nutri().goal][0].toLowerCase()}, ${c.kcal} kcal y ${c.prot} g de proteína al día; hoy lleva ${protOf(today())} g.`); } catch (e) {}
  try { const I = mesoInfo(); if (I && !I.pre) parts.push(`Bloque de entrenamiento: semana ${I.wk + 1} de ${I.total}${I.deload ? ' (descarga)' : `, RIR objetivo ${I.rir}`}.`); } catch (e) {}
  try { const s = weekSets(0).sets; parts.push('Series esta semana por músculo: ' + ZONES.map(z => `${z.name} ${fmtKg(s[z.k])}`).join(', ') + '.'); } catch (e) {}
  try { const so = soreMap(); const k = Object.keys(so); if (k.length) parts.push('Dolor muscular ahora: ' + k.map(x => `${zoneName(x)} (${LVL[so[x].lvl]})`).join(', ') + '.'); } catch (e) {}
  try { const r = readyToday(); if (r) parts.push(`Hoy: sueño ${r.sleep === -1 ? 'malo' : r.sleep === 1 ? 'bueno' : 'normal'}, energía ${r.energy === -1 ? 'baja' : r.energy === 1 ? 'alta' : 'normal'}.`); } catch (e) {}
  try { const L = Object.keys(LV_STD).map(n => { const b = lvBest(n), l = b && lvOf(n, b.v); return l && l.i >= 0 ? `${n} ${l.name}` : null; }).filter(Boolean); if (L.length) parts.push('Nivel de fuerza: ' + L.join(', ') + '.'); } catch (e) {}
  return parts.join('\n');
}
const AI_SYS = 'Eres el coach de Forja, experto en hipertrofia, fuerza y prevención de lesiones. Respondes en español latino, claro y breve (máximo 180 palabras), con números concretos (kg, reps, series) basados en los datos del usuario. Si algo puede ser una lesión o un tema médico, recomiendas consultar a un profesional. No inventes datos que no estén en el contexto.';
const AI_SUGG = ['¿Por qué me estanqué en Sentadilla Hack?', '¿Qué peso uso hoy en cada ejercicio?', 'Revisa mi semana: ¿me falta algo?', '¿Cómo cuido mis pantorrillas al entrenar pierna?', '¿Necesito una semana de descarga?'];

/* ---------- Chat ---------- */
const aiChat = { list: LS.get('aichat', []), busy: false };
function aiSave() { aiChat.list = aiChat.list.slice(-30); LS.set('aichat', aiChat.list); }
function aiUsedToday() { const t = dk(new Date()); return aiChat.list.filter(m => m.role === 'user' && m.d === t && m.srv).length; }
function aiSheet() {
  const srv = !!AI_CFG.endpoint && typeof fb !== 'undefined' && fb.auth && fb.auth.acc;
  openSheet(`<div class="row"><h2 class="grow" style="display:flex;align-items:center;gap:8px">${ic('brain', 20)} Coach IA ${proBadge()}</h2><button class="icon-btn" data-act="sheet-close" aria-label="Cerrar">${ic('x', 18)}</button></div>
    <div class="ai-log" id="ai-log">${aiChat.list.length ? aiChat.list.map(aiMsg).join('') : `<div class="ai-hi">Hola, soy tu coach. Conozco tus entrenamientos, tu cuerpo, tu bloque y cómo llegas hoy. Pregúntame lo que quieras.</div>`}${aiChat.busy ? '<div class="ai-m bot typing"><i></i><i></i><i></i></div>' : ''}</div>
    <div class="ai-sugg">${AI_SUGG.map(q => `<button class="chip" data-act="ai-q" data-q="${esc(q)}">${esc(q)}</button>`).join('')}</div>
    <form class="ai-form" id="f-ai"><textarea id="ai-in" rows="1" placeholder="Escribe tu pregunta…" aria-label="Pregunta para el coach"></textarea><button class="btn primary" type="submit" aria-label="Enviar">${ic('arrow-up', 18)}</button></form>
    <div class="muted ai-note">${srv ? `Respuestas con IA dentro de la app · ${Math.max(0, AI_CFG.maxDay - aiUsedToday())} preguntas hoy.` : 'Tu pregunta se abrirá en <b>Claude</b> con un resumen de tus datos (usa tu plan de Claude). Cuando Forja tenga su servidor, responderá aquí mismo.'} ${aiChat.list.length ? '<button class="linkbtn" data-act="ai-clear">Borrar chat</button>' : ''}</div>`);
  const s = document.querySelector('#sheet .sheet-card'); if (s) s.classList.add('ai-card');
  const log = document.getElementById('ai-log'); if (log) log.scrollTop = log.scrollHeight;
}
function aiMsg(m) { return `<div class="ai-m ${m.role === 'user' ? 'me' : 'bot'}">${m.role === 'user' ? esc(m.t) : aiFmt(m.t)}</div>`; }
function aiFmt(t) { return esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/^[-•] (.*)$/gm, '<span class="ai-li">• $1</span>').replace(/\n/g, '<br>'); }
function aiAsk(q) {
  q = String(q || '').trim(); if (!q || aiChat.busy) return;
  const srv = !!AI_CFG.endpoint && typeof fb !== 'undefined' && fb.auth && fb.auth.acc;
  if (!srv) {
    const txt = `${AI_SYS}\n\nMis datos de Forja:\n${aiContext()}\n\nMi pregunta: ${q}`;
    aiChat.list.push({ role: 'user', t: q, d: dk(new Date()) }, { role: 'bot', t: 'Abrí Claude con tu pregunta y tus datos. Si no se abre, el texto quedó copiado: pégalo en una conversación nueva.' }); aiSave(); aiSheet();
    try { navigator.clipboard && navigator.clipboard.writeText(txt).catch(() => {}); } catch (e) {}
    setTimeout(() => openExt('https://claude.ai/new?q=' + encodeURIComponent(txt.slice(0, 6000))), 300);
    return;
  }
  if (!isPro()) { proSheet(); return; }
  if (aiUsedToday() >= AI_CFG.maxDay) { toast('Llegaste al límite de preguntas de hoy'); return; }
  aiChat.list.push({ role: 'user', t: q, d: dk(new Date()), srv: 1 }); aiChat.busy = true; aiSave(); aiSheet();
  const hist = aiChat.list.filter(m => m.srv || m.role === 'bot').slice(-10).map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.t }));
  fb.token().then(tok => fetch(AI_CFG.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok }, body: JSON.stringify({ system: AI_SYS, context: aiContext(), messages: hist }) }))
    .then(r => r.json().then(j => { if (!r.ok) throw new Error(j.error || 'El coach no respondió (' + r.status + ')'); return j; }))
    .then(j => { aiChat.list.push({ role: 'bot', t: String(j.text || '').trim() || 'No tengo respuesta para eso.' }); })
    .catch(e => { aiChat.list.push({ role: 'bot', t: '⚠️ ' + (e.message || 'Sin conexión. Intenta de nuevo.') }); })
    .then(() => { aiChat.busy = false; aiSave(); if (document.getElementById('ai-log')) aiSheet(); });
}

/* ---------- Forja Pro ---------- */
function proBadge() { return `<span class="pro-b">PRO</span>`; }
function proSheet() {
  const P = typeof CAP !== 'undefined' && CAP && CAP.Purchases;
  openSheet(`<div class="pro-hero"><span class="pro-crown">${ic('crown', 30)}</span><h2>Forja Pro</h2><div class="muted">Todo lo que necesitas para crecer más rápido y sin lesiones.</div>
      <button class="icon-btn pv-x" data-act="sheet-close" aria-label="Cerrar">${ic('x', 18)}</button></div>
    <div class="pro-feats">${PRO_FEATS.map(([i, t, d]) => `<div>${ic(i, 18)}<span><b>${t}</b><small>${d}</small></span></div>`).join('')}</div>
    ${!PRO_CFG.enforce ? `<div class="safe tip">${ic('sparkles', 16)}<span><b>Pro está gratis durante la beta.</b> Ya tienes todo desbloqueado. Cuando Forja esté en Google Play, los planes serán estos:</span></div>` : ''}
    <div class="pro-plans"><button class="pro-plan on" data-act="pro-buy" data-p="yearly"><span class="pro-save">Ahorra 44 %</span><b>Anual</b><span class="num">${PRO_CFG.yearly}</span><small>${PRO_CFG.trialDays} días gratis</small></button>
      <button class="pro-plan" data-act="pro-buy" data-p="monthly"><b>Mensual</b><span class="num">${PRO_CFG.monthly}</span><small>Cancela cuando quieras</small></button></div>
    <div class="muted" style="font-size:11.5px;text-align:center">El pago y la renovación los gestiona Google Play. Puedes cancelar desde Play Store → Pagos y suscripciones.${P ? '' : ' (Disponible cuando la app esté en la tienda.)'}</div>
    <div class="row" style="justify-content:center;gap:14px"><button class="linkbtn" data-act="pro-restore">Restaurar compra</button><button class="linkbtn" data-act="priv-open">Privacidad</button></div>`);
}
/* Google Play Billing: se conectará con el complemento de compras cuando la app esté publicada. */
function proBuy(plan) {
  const P = typeof CAP !== 'undefined' && CAP && CAP.Purchases;
  if (!PRO_CFG.enforce) { toast('Durante la beta ya tienes Pro gratis 🎉'); return; }
  if (!P) { toast('Las compras estarán disponibles cuando Forja esté en Google Play.'); return; }
  P.purchaseStoreProduct({ product: { identifier: 'forja_pro_' + plan } })
    .then(r => { state.settings.pro = { plan, until: Date.now() + (plan === 'yearly' ? 366 : 31) * 864e5, src: 'play' }; savePlans(); closeSheet(); toast('¡Bienvenido a Forja Pro!'); render(); })
    .catch(e => { if (!/cancel/i.test(String(e && e.message))) toast('No se pudo completar la compra'); });
}

/* ---------- Puntos de entrada ---------- */
const _coachCardAI = coachCard;
coachCard = function (plan, day) {
  return _coachCardAI(plan, day).replace('<button class="btn small" data-act="coach-claude">Analizar con Claude</button>', `<button class="btn small primary" data-act="ai-open">${ic('brain', 15)} Preguntar al coach IA</button>`);
};
const _vSettingsAI = vSettings;
vSettings = function () {
  const h = _vSettingsAI(), p = proState();
  const card = `<button class="card pro-card" data-act="pro-open"><span class="pro-crown sm">${ic('crown', 20)}</span><span class="grow" style="min-width:0"><b>Forja Pro</b><small>${!PRO_CFG.enforce ? 'Gratis durante la beta · todo desbloqueado' : isPro() ? 'Activo' + (p && p.until ? ' hasta ' + fmtDate(new Date(p.until)) : '') : 'Coach IA, mapa muscular, medidas y más'}</small></span>${ic('chevron-right', 18)}</button>`;
  return card + h;
};
const _vTrainAI = vTrain;
vTrain = function () {
  const h = _vTrainAI();
  if (h.indexOf('id="sx"') >= 0 || isWatch() || state.draft || h.indexOf('data-act="ai-open"') >= 0) return h;
  const at = h.indexOf('<div class="card habits2"'), b = `<button class="ai-fab-row" data-act="ai-open">${ic('brain', 18)}<span class="grow">Pregúntale al coach IA</span>${proBadge()}</button>`;
  return at < 0 ? h + b : h.slice(0, at) + b + h.slice(at);
};
document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-act^="ai-"],[data-act^="pro-"]'); if (!b) return;
  ev.stopPropagation(); ev.preventDefault();
  const a = b.dataset.act;
  if (a === 'ai-open') aiSheet();
  else if (a === 'ai-q') aiAsk(b.dataset.q);
  else if (a === 'ai-clear') { aiChat.list = []; aiSave(); aiSheet(); }
  else if (a === 'pro-open') proSheet();
  else if (a === 'pro-buy') { document.querySelectorAll('.pro-plan').forEach(x => x.classList.toggle('on', x === b)); proBuy(b.dataset.p); }
  else if (a === 'pro-restore') toast(PRO_CFG.enforce ? 'Buscando compras…' : 'Durante la beta no hace falta: ya tienes Pro.');
}, true);
document.addEventListener('submit', ev => { if (ev.target.id !== 'f-ai') return; ev.preventDefault(); aiAsk($('#ai-in').value); }, true);
document.addEventListener('keydown', ev => { if (ev.target.id === 'ai-in' && ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); aiAsk(ev.target.value); } });
render();
