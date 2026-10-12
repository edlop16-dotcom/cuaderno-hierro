/* Servidor del Coach IA de Forja (Cloudflare Worker).
   - Verifica que quien pregunta tenga sesión en Firebase (idToken).
   - Limita las preguntas por usuario y por día (KV "LIMITS").
   - Llama a la API de Claude con la clave guardada como secreto (nunca va dentro de la app).
   Variables: ANTHROPIC_API_KEY (secreto), FIREBASE_API_KEY, MODEL (opcional), MAX_DAY (opcional), PRO_UIDS (opcional, lista separada por comas). */
export default {
  async fetch(req, env) {
    const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
    const out = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (req.method !== 'POST') return out({ error: 'Método no permitido' }, 405);

    /* 1. ¿Quién pregunta? */
    const tok = (req.headers.get('Authorization') || '').replace(/^Bearer /, '');
    if (!tok) return out({ error: 'Inicia sesión para usar el coach' }, 401);
    const lk = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${env.FIREBASE_API_KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken: tok }) });
    const lj = await lk.json().catch(() => ({}));
    const uid = lk.ok && lj.users && lj.users[0] && lj.users[0].localId;
    if (!uid) return out({ error: 'Tu sesión venció: vuelve a entrar' }, 401);
    if (env.PRO_UIDS && !env.PRO_UIDS.split(',').map(s => s.trim()).includes(uid)) return out({ error: 'El coach IA es parte de Forja Pro' }, 403);

    /* 2. Límite diario */
    const day = new Date().toISOString().slice(0, 10), key = `${uid}:${day}`, max = +(env.MAX_DAY || 20);
    const used = env.LIMITS ? +(await env.LIMITS.get(key) || 0) : 0;
    if (used >= max) return out({ error: 'Llegaste al límite de preguntas de hoy' }, 429);

    /* 3. Pregunta a Claude */
    const b = await req.json().catch(() => null);
    if (!b || !Array.isArray(b.messages) || !b.messages.length) return out({ error: 'Pregunta vacía' }, 400);
    const messages = b.messages.slice(-10).map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content || '').slice(0, 2000) }));
    while (messages.length && messages[0].role !== 'user') messages.shift();
    const system = `${String(b.system || '').slice(0, 1500)}\n\nDatos del usuario (de su app Forja):\n${String(b.context || '').slice(0, 9000)}`;
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: env.MODEL || 'claude-haiku-5-5', max_tokens: 700, system, messages }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return out({ error: 'El coach no está disponible ahora' }, 502);
    if (env.LIMITS) await env.LIMITS.put(key, String(used + 1), { expirationTtl: 172800 });
    return out({ text: (j.content || []).filter(c => c.type === 'text').map(c => c.text).join('\n'), left: max - used - 1 });
  },
};
