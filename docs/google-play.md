# Forja en Google Play: qué está hecho y qué falta

## Hecho en la app (pareja 6 y Fase 3)
- **AAB firmado** en cada release (`Forja.aab`), con la llave fija como "llave de subida" de *Firma de apps de Google Play*.
- **Android 16 (API 36)**: `ci/patch_store.py` sube compileSdk/targetSdk a 36 (AGP 8.10.1, Gradle 8.13, Kotlin 2.1.21) y **mantiene minSdk 22** para el reloj. Con API 35+ Android obliga a dibujar de borde a borde: MainActivity agrega márgenes con los insets del sistema (barra de estado, navegación, recorte y teclado) solo en Android 15+.
- **Permisos revisados**: se quitó `USE_EXACT_ALARM` (Play solo lo permite a apps de reloj/calendario). Ahora se usa `SCHEDULE_EXACT_ALARM`, que el usuario concede en "Alarmas y recordatorios"; la app ya muestra el botón para pedirlo y, sin él, las alarmas suenan con unos minutos de margen.
- **Google Play Billing 8** con plugin propio (`ci/native/BillingPlugin.java`) y `www/store.js`: precios reales, prueba gratis, compra, restaurar, gestionar y comprobar la suscripción al abrir.
- **Textos legales** (`www/legal.js`, una sola fuente para la app y la web): Política de privacidad según la Ley N.º 29733 y su Reglamento (titular, datos sensibles, finalidad, consentimiento, transferencia internacional a Firebase, plazos, derechos ARCO, reclamo ante la Autoridad Nacional de Protección de Datos Personales, menores) y Términos de uso.
- **Páginas web públicas** (se publican con GitHub Pages en cada "compila"): `/privacidad.html`, `/terminos.html` y `/eliminar-cuenta.html`.
- **Consentimiento expreso** para datos de salud en la bienvenida (casilla obligatoria; se guarda `settings.consent` con versión y fecha). Edad mínima: **14 años** (en Perú, por debajo de 14 se necesita el consentimiento de los padres).
- **Borrar la cuenta y los datos desde la app** y **borrar solo los datos del teléfono**.
- **Reportes de errores anónimos y opcionales** (Ajustes → Reportes de errores), en la colección `errors` de Firestore.
- **Aviso de salud**, cuestionario de salud (PAR-Q) y sin calorías ni dietas para menores.

## Pasos manuales (los haces tú, en este orden)
1. **Completar tus datos legales** en `www/legal.js`: `owner` (nombre del titular) y `contact` (correo de contacto). También en la ficha de Play.
2. **Publicar las reglas de Firestore**: copia `ci/firestore.rules` en Firebase Console → Firestore → Reglas → Publicar.
3. **Borrado automático de reportes**: Firebase Console → Firestore → TTL → política sobre la colección `errors`, campo `exp`.
4. **Activar GitHub Pages** (Settings → Pages → Source: GitHub Actions). Las URLs para Play quedan así:
   - Política: `https://edlop16-dotcom.github.io/cuaderno-hierro/privacidad.html`
   - Eliminar cuenta: `https://edlop16-dotcom.github.io/cuaderno-hierro/eliminar-cuenta.html`
5. **Inscribir el banco de datos personales** ("Usuarios de Forja") en el Registro Nacional de Protección de Datos Personales de la Autoridad Nacional de Protección de Datos Personales (Ministerio de Justicia). El trámite es gratuito.
6. **Cuenta de desarrollador de Google Play**: pago único y verificación de identidad. Las cuentas personales nuevas deben hacer una **prueba cerrada con al menos 12 testers durante 14 días** antes de producción.
7. **Crear la suscripción** en Play Console → Monetizar → Suscripciones:
   - Producto `forja_pro`, con planes base `mensual` (S/ 14.90) y `anual` (S/ 99.90).
   - Opcional: oferta de prueba gratis de 7 días en el plan anual.
   - Cuando esté activa, cambiar `PRO_CFG.enforce` a `true` en `www/ai.js` para cobrar.
8. **Declaraciones en Play Console**:
   - **Seguridad de los datos** (tabla de abajo).
   - **Apps de salud**: categoría "Salud y fitness"; la app no es un dispositivo médico.
   - **Health Connect**: justificar la lectura de sueño, peso, pasos y pulso en reposo.
   - **Pantalla completa** (`USE_FULL_SCREEN_INTENT`): explicar que son recordatorios de hábitos que el usuario programa, como una alarma. Si Play lo rechaza, las alarmas se ven como notificación normal.
   - **Acceso a datos de uso** (`PACKAGE_USAGE_STATS`): estimar el sueño con el celular. Es opcional, se procesa en el teléfono y solo se guarda el resultado.
   - **Ubicación**: solo en primer plano, cuando el usuario toca "guardar ubicación" o al abrir la app para elegir el gimnasio. No hace falta el formulario de ubicación en segundo plano.
   - **Público objetivo**: 13-15, 16-17 y 18+ (la app pide 14+). No está dirigida a niños.
   - **Anuncios**: no tiene.
9. **Nombre y ficha**: no usar nombres ni imágenes de Hevy o Symmetry.

## Respuestas para "Seguridad de los datos"
- **¿Recopila datos?** Sí. **¿Los comparte con terceros?** No. Firebase y Google Play actúan como proveedores de servicios, así que no cuenta como compartir.
- **¿Cifrados en tránsito?** Sí (HTTPS). **¿El usuario puede pedir que se borren?** Sí: desde la app y desde la página de eliminar cuenta.

| Tipo de dato (categoría de Play) | ¿Se recopila? | Obligatorio | Para qué |
|---|---|---|---|
| Información personal → Correo electrónico | Sí, solo con cuenta | Opcional | Gestión de la cuenta |
| Información personal → ID de usuario | Sí, solo con cuenta | Opcional | Gestión de la cuenta, funciones de la app |
| Información personal → Nombre | Sí, solo con cuenta | Opcional | Funciones de la app (saludo) |
| Salud y actividad física → Información de salud (cuestionario, molestias, peso, medidas, pulso, sueño) | Sí, solo con cuenta | Opcional | Funciones de la app |
| Salud y actividad física → Actividad física (entrenamientos, cardio, pasos) | Sí, solo con cuenta | Opcional | Funciones de la app |
| Ubicación → Ubicación precisa | Sí, solo si guarda la ubicación del gimnasio | Opcional | Funciones de la app |
| Información financiera → Historial de compras | Sí, solo si se suscribe (estado de la suscripción) | Opcional | Funciones de la app |
| Información y rendimiento de la app → Registros de fallos | Sí, anónimos | Opcional (se puede desactivar) | Análisis (arreglar errores) |
| Fotos y videos | **No**: las fotos de progreso no salen del teléfono | — | — |
| Contactos, mensajes, publicidad, identificadores de dispositivo | **No** | — | — |

## Pendiente técnico
- **Probar en el celular y en el reloj** la versión con API 36: bordes en Android 15/16, teclado, alarmas exactas (dar el permiso) y compras con un tester de licencia.
- **Verificación de compras en servidor** (recomendada). Hoy la app confía en lo que responde Google Play en el equipo. Más adelante se puede verificar el token con la API de Google Play Developer desde `server/coach-worker.js`.
- En Android 16, el pulso del celular usa el permiso nuevo de Health Connect (`READ_HEART_RATE`). El reloj usa el sensor con `BODY_SENSORS`, así que no le afecta.
