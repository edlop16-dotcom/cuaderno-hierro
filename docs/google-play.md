# Forja en Google Play: qué está hecho y qué falta

## Ya está en la app (pareja 6)
- **Formato AAB:** cada compilación publica `Forja.aab` junto a `Forja.apk` en el release de GitHub. El AAB va firmado con la llave fija de la app; en Play se usa como "llave de subida" con *Firma de apps de Google Play*.
- **Política de privacidad dentro de la app:** Perfil → Ajustes → Privacidad y datos. La versión web está en `docs/privacidad.html`.
- **Borrar la cuenta y los datos desde la app:** es obligatorio en Play.
  - Elimina la cuenta de Firebase Authentication y el documento `accounts/{uid}` en Firestore.
  - Pide confirmar la identidad (contraseña o Google) y escribir BORRAR.
- **Borrar solo los datos del teléfono:** también en Ajustes.
- **Aviso de salud:** se muestra al abrir la app la primera vez y está siempre disponible en Ajustes.
- **Importar desde Hevy y Strong**, para atraer usuarios que se cambian de app.

## Pasos manuales que faltan
1. **Publicar las reglas nuevas de Firestore.**
   - Copia `ci/firestore.rules` en Firebase Console → Firestore → Reglas → Publicar.
   - La regla nueva permite que el dueño borre su documento.
   - Mientras no se publique, al eliminar la cuenta los datos se vacían, pero el documento queda vacío en la nube.
2. **Correo de contacto:** decidir cuál usar.
   - Ponerlo en `docs/privacidad.html`, en `PRIVACY_CONTACT` (www/play.js) y en la ficha de Play.
3. **URL pública de la política.** Una opción es activar GitHub Pages en el repo (rama `main`, carpeta `/docs`). Las URLs quedarían así:
   - `https://edlop16-dotcom.github.io/cuaderno-hierro/privacidad.html`
   - Esa misma página sirve como "URL para solicitar la eliminación de la cuenta".
4. **Nivel de API de destino.** Desde el 31 de agosto de 2026, las apps nuevas deben apuntar a **Android 16 (API 36)**.
   - Forja usa Capacitor 6, que apunta a API 34.
   - Antes de subirla hay que migrar a una versión de Capacitor que apunte a API 36, y probar de nuevo celular y reloj.
5. **Cuenta de desarrollador de Google Play.** Hay un pago único, y es necesaria la verificación de identidad.
   - Las cuentas personales nuevas deben hacer una **prueba cerrada con al menos 12 testers durante 14 días** antes de publicar en producción. Tus amigos del gimnasio pueden ser los testers.
6. **Nombre en la tienda.** No usar nombres ni imágenes de Hevy o Symmetry. Las fotos de ejercicios son de dominio público (Free Exercise DB).

## Respuestas para el formulario "Seguridad de los datos"
- **¿Recopila o comparte datos?** Recopila: sí. Comparte con terceros: **no**. Firebase actúa como proveedor de servicios, así que no cuenta como compartir.
- **¿Los datos están cifrados en tránsito?** Sí (HTTPS).
- **¿El usuario puede pedir que se borren?** Sí, desde la app y desde la URL de la política.

| Tipo de dato (categoría de Play) | ¿Se recopila? | Obligatorio | Para qué |
|---|---|---|---|
| Información personal → Dirección de correo | Sí, solo con cuenta | Opcional | Gestión de la cuenta |
| Información personal → ID de usuario | Sí, solo con cuenta | Opcional | Gestión de la cuenta, funciones de la app |
| Salud y actividad física → Actividad física (entrenamientos) | Sí, solo con cuenta (sincronización) | Opcional | Funciones de la app |
| Salud y actividad física → Información de salud (peso, medidas) | Sí, solo con cuenta | Opcional | Funciones de la app |
| Fotos y videos | **No**: las fotos de progreso nunca salen del teléfono | — | — |
| Ubicación, contactos, mensajes, finanzas, identificadores de dispositivo, publicidad, analítica | **No** | — | — |

**Otras respuestas:** sin anuncios. Público objetivo: 18 años o más. La app no es médica; en la categoría "Salud y fitness" hay que declarar el aviso de salud.
