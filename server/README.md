# Servidor del Coach IA (opcional)

Sin servidor, el coach de Forja abre **Claude** con tu pregunta y tus datos ya escritos, y la respuesta sale de tu plan de Claude. Con este servidor, el coach responde **dentro de la app**. Es lo que se cobraría en Forja Pro, porque cada respuesta cuesta dinero de API.

## Pasos (Cloudflare Workers, plan gratuito)
1. Crea una cuenta en cloudflare.com y otra en console.anthropic.com. En Anthropic, crea una **clave de API** y carga saldo.
2. En tu computadora, ejecuta estos comandos:
   ```
   npm i -g wrangler
   wrangler login
   wrangler kv namespace create LIMITS
   ```
3. Crea `server/wrangler.toml` con este contenido. Usa el id del KV que te dio el comando anterior:
   ```toml
   name = "forja-coach"
   main = "coach-worker.js"
   compatibility_date = "2026-10-01"
   [vars]
   FIREBASE_API_KEY = "AIzaSyCeVFdDLMrGItH3-7cGA5FnqYfYVHPWVgE"
   MAX_DAY = "20"
   # PRO_UIDS = "uid1,uid2"   # opcional: solo estas cuentas pueden usarlo
   [[kv_namespaces]]
   binding = "LIMITS"
   id = "<id-del-kv>"
   ```
4. Guarda la clave como secreto y publica el servidor:
   ```
   wrangler secret put ANTHROPIC_API_KEY
   wrangler deploy
   ```
5. Copia la URL que te da el deploy (`https://forja-coach.<usuario>.workers.dev`). Pégala en `AI_CFG.endpoint` en `www/ai.js` y compila.

**Costo aproximado:** con el modelo Haiku, cada pregunta cuesta menos de un centavo de dólar. Con `MAX_DAY` limitas el gasto por usuario.

**Seguridad:** la clave de Anthropic vive solo en Cloudflare, nunca dentro de la app. El servidor solo acepta usuarios con sesión de Firebase.
