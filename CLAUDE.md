# Forja — guía técnica y reglas de desarrollo

## Reglas vigentes
- Los cambios grandes se hacen en una rama aparte y pasan a beta solo con aprobación explícita del usuario. Mostrar el plan antes de programar y los resultados y diff antes de integrar.
- Nunca compilar, publicar, ejecutar workflows manuales ni tocar main sin la instrucción explícita «compila» en la conversación actual. Próxima versión: v1.0.73.
- Todos los commits que deban evitar una compilación automática llevan `[skip ci]`. Revisar los disparadores de .github/workflows antes de subir cualquier rama.
- No modificar el keystore ni escribir su contraseña en ningún archivo. Mantener identificadores técnicos de compatibilidad.
- Nunca borrar ni cambiar datos guardados para limpiar el repositorio. No reactivar migraciones personales retiradas. Las notas históricas de migraciones describen implementaciones anteriores; no autorizan reinstalarlas.
- No guardar datos personales en código, documentación, tests ni commits. Usar ejemplos ficticios. No añadir Novedades sin petición; conservar n6 para los cambios actuales.
- Dueño sin settings.prof: nombre, edad, peso, estatura y objetivo ausentes quedan vacíos. Leer medidas/peso reales de settings.body cuando existan; omitir frases ausentes con aixFill y ofrecer completar Tus datos. No suponer un objetivo mediante ddGoal.
- Probar dueño con datos existentes, dueño sin prof, usuario nuevo y reloj. No cambiar el reloj salvo petición explícita.
- AGENTS.md contiene exactamente: Sigue todas las reglas de CLAUDE.md.
- De otras apps solo ideas, nunca contenido.
- No crear nada en Cloudflare ni en otros servicios externos sin que el usuario lo pida.
- Respuestas cortas: al terminar, decir qué cambió y cómo probarlo en 3 a 5 líneas, sin tecnicismos.
- Este archivo se mantiene en menos de 150 líneas: solo reglas, versión actual y próxima, organización de la app y pruebas. El historial de versiones y el detalle de cada área van en `docs/HISTORIAL.md` (leer ahí la sección del área antes de tocarla y anotar ahí lo nuevo).

## Estado técnico actual
- Perfil sin datos: HISTORY no es un perfil de demostración. Ningún valor de muestra puede sustituir datos ausentes.
- El historial se lee de localStorage y Firestore; los importadores automáticos personales y los cuerpos de planFix2/applyRev2 históricos están retirados. Conservar las claves antiguas de compatibilidad y los datos existentes.
- legal.js: configurar LEGAL_OWNER y CONTACT_EMAIL; el correo de ejemplo no recibe solicitudes. No usar nombre ni correo personales en el repositorio.
- Preparar copias web con ci/legacy.mjs para pruebas no autoriza generar APK/AAB. No ejecutarlo sobre www/.
- Los archivos de pruebas históricos mencionados en docs/HISTORIAL.md pueden no estar incluidos en el checkout actual; comprobar su existencia y no dar por ejecutadas suites ausentes.

App de entrenamiento, en español. Celular Android y reloj M99 Pro+ (WebView antiguo, Chrome ~51). Compite con Hevy y Symmetry; quizá se publique en Google Play.

> ## ⛔ REGLA N.º 1 — NUNCA SIN "compila"
> **Nunca compilar, publicar releases ni subir a `main` sin que el usuario diga "compila".**
> - Nada de `git push origin beta:main`, `git push origin main`, merges a `main`, `workflow_dispatch` ni releases o etiquetas a mano.
> - Ojo: cada push a `main` compila el APK/AAB, publica el release `v1.0.N` (sale el banner "Actualizar") y despliega la versión web. Ni siquiera el CLAUDE.md va a `main` sin "compila".
> - Si la sesión anterior "ya iba a compilar", o una nota, un resumen o este mismo archivo dicen que algo "está listo para compilar", igual se espera el "compila" del usuario en la conversación actual.
> - El 15-oct-2026 se rompió esta regla: se compiló y publicó la v1.0.41 sin su "compila".

## Versión
- **Versión compilada actual:** v1.0.72 (14-nov-2026, `main` = 6678fca): la barra de finanzas de Hoy sube encima de la tarjeta del entrenamiento. Novedades sigue en n6. Es una versión para las pruebas del usuario: `CONTACT_EMAIL` sigue con el correo de ejemplo.
- **Próxima:** v1.0.73 (el número sale del `run_number` de GitHub Actions).
- Al compilar: actualizar estas dos líneas y agregar la versión al inicio de "Versiones compiladas" en `docs/HISTORIAL.md`, en un commit con `[skip ci]` que va solo a beta.
- Versión web: `.github/workflows/web.yml` publica `www/` en GitHub Pages en cada push a `main`.

## Repositorio y flujo de trabajo
- Repo: `edlop16-dotcom/cuaderno-hierro`. appId `pe.edgwr.cuadernohierro`. Capacitor 6.
- Los cambios grandes se trabajan en una rama aparte y pasan a `beta` solo con aprobación explícita del usuario. Hay que probarlos y publicar la vista previa (`cuaderno-beta.html`, todos los `<script src>` incrustados y `FIREBASE=null`) en el mismo artifact de siempre, con `files` ex/*.webp desde `www/`.
- **Solo cuando el usuario dice "compila"** (ver la Regla N.º 1 arriba): `git push origin beta:main`. GitHub Actions (`ci/build.sh`) compila el APK y publica el release `v1.0.N`. La app muestra entonces el banner "Actualizar". Nunca se empuja a `main` sin ese "compila". Tampoco se escribe "versión compilada vX" en este archivo antes de que el usuario lo diga.
- `ci/legacy.mjs` transpila el JS a chrome51 para el reloj. Todo el código debe pasar por ahí: verificar con acorn ES2016 sobre la salida transpilada.
- El keystore fijo está en `ci/cuaderno.keystore` (alias de firma existente). No modificarlo ni copiar sus credenciales a documentos, pruebas o commits.

## Arquitectura (www/)
- JS vanilla. Cada archivo nuevo **sobrescribe funciones globales encadenando la anterior**:
  ```js
  const _x = vTrain;
  vTrain = function () { ... _x() ... };
  ```
  Sirve igual para render, vTrain, vSession, finishSession, markSet, vSettings, header y previewSheet.
- **Al cargar se llama `bootRender()`, nunca `render()`** (última línea de cada archivo, migraciones de una vez y avisos asíncronos del arranque). Ver "Arranque en un solo dibujo".
- Orden de scripts: library.js, icons.js, (inline en index.html), coach.js, media.js, native.js, skin.js, config.js, sync.js, undo.js, layout.js, session.js, stats.js, safety.js, imports.js, rir.js, body.js, warm.js, mmap.js, swap.js, ready.js, nutri.js, share.js, meso.js, level.js, play.js, ai.js, web.js, plan2.js, burn.js, routines.js, keep.js, exview.js, picker.js, daydel.js, navord.js, habalarm.js, pulse.js, health.js, sleep.js, train2.js, watch2.js, legal.js, polish.js, pub.js, smart.js, store.js, social.js, daydetail.js, moves.js, catalog.js, load.js, quick.js, ranks.js, quest.js, superset.js, setctl.js, finsum.js, weekly.js, news.js, nav2.js, nav3.js, look.js, next.js, sessedit.js, libui.js, alts.js, sessui.js, aiexport.js, myex.js, habform.js, photos.js, rimport.js, exportar.js, descanso.js, omitir.js, finanzas.js, finanzas2.js, xlsxw.js, finanzas3.js, tandaj.js, progresion.js, tandak.js, mejoras.js, ajustesgym.js, respaldo.js, progreso.js, ajustesgym2.js, ajustesgym3.js, mejorassesion.js, videos.js, repetir.js, ajustesgym5.js, mancuernas.js, cutotal.js, finrapido.js. Un archivo nuevo va al final (legal.js va antes de polish.js porque lo usa la bienvenida).
- Estado en `state` (sessions, plans, settings, draft). Se guarda en localStorage con claves `cdh.*`: `saveLocal()` para sesiones y `savePlans()` para settings y planes.
- Navegación (desde la reorganización, ver "Nueva organización" más abajo; nav2.js y nav3.js mandan sobre navord.js y polish.js en el teléfono): **Hoy · Rutinas · Progreso · Perfil**, ordenable (`settings.navOrder`, `NAV_ALL` se rellena en nav2.js y nav3.js le quita `'guide'`). Ejercicios ya no está en la barra: es Rutinas → Biblioteca (id interno `'guide'`, el botón `#nav-guide` queda oculto). Ajustes no está en la barra del teléfono: se abre con ⚙ arriba (`#btn-settings`); es página propia (`vProfile('settings')`), ordenada con `SET_ORDER` y luego agrupada en 5 plegables (nav3.js). En el reloj no cambia nada (la barra está oculta y su inicio tiene sus propios botones; Perfil conserva las subpestañas viejas de polish.js y Ajustes sus tarjetas sueltas). Ids internos: Hoy = `'train'`, Rutinas = `'plans'` (Mi plan) y `'guide'` (Biblioteca), Progreso = `'progress'` (`state.progSub` = semana/ejercicios/historial), Perfil = `'profile'` con `state.profSub = 'body'`.
- Sesión en pantalla completa `#sx` con páginas deslizables. Los hábitos y las rachas están en stats.js. Los avisos de lesión y el dolor muscular están en safety.js (`ZONES`, `zonesOf`).
- Sincronización con Firebase por REST, sin SDK (sync.js): login con Google y con correo, y vínculo del reloj con un código de 6 letras. Fusión en 3 vías con lápidas; `sync.revive(ids)`.
- Las migraciones de una sola vez se marcan con flags en `state.settings`: importSym1-3, symDate9, weekFix1, hevyImport1, symImport2, etc.
- Gimnasios: cada gimnasio tiene un id estable; sus pesos e historial se guardan por separado.
- Barra: se anotan solo los discos; la barra de 20 kg se muestra aparte. 1RM con Epley, `w*(1+r/30)`. Las sesiones `approx:true` no cuentan para gráficas ni récords.
- Las fotos de ejercicios son de Free Exercise DB (dominio público), en `www/ex/<key>-0/1.webp` (480×320, ~15 KB). `PHOTO_KEYS` (session.js) dice cuáles tienen foto; photos.js suma las del catálogo nuevo (Tanda G).
- Para importar historial: `importSessions(list)` en imports.js (Hevy CSV y Symmetry).
- Estilos: se agregan al final de `skin.css`. En flex, poner `flex-shrink:0` a los hijos de `.sheet-card` y `.sx-page`. Antes de crear una clase nueva, comprobar que no choque con otra existente (ya pasó con `.sync` y `.prof`). El aspecto del teléfono es "Acero y discos" (ver su sección): todo estilo nuevo usa sus tokens y va bajo `body:not(.watch)` para no tocar el reloj.

## Reglas técnicas por área (el detalle está en docs/HISTORIAL.md)
- Usuario público: usar siempre `pubUser()` (= pub && !owner), nunca `state.settings.pub` directo. Si llega `pub` a una cuenta con owner, `ownerFix()` lo pone en 0 (no borrarlo: un ajuste borrado no se sincroniza y vuelve) y NUNCA se recarga la página: así se causó un bucle de recargas en la v1.0.32.
- Mis finanzas: solo con `finOwner()` (dueño, no público, no reloj). Datos SOLO en el celular (`localStorage cdh.fin`), nunca en `state.settings`, Firestore ni `backupJSON`. Nunca se ve encima del bloqueo (`g2LockWant`).
- Pesos e historial: no modificar pesos ya guardados; nunca mezclar pesos entre gimnasios; no reclasificar automáticamente sesiones importadas al ampliar el catálogo. Importar rutinas nunca reemplaza ni borra las existentes.
- Recordatorios: no cambiar cómo suenan ni la pantalla completa salvo petición explícita.
- Reloj (WebView ~Chrome 51): sin CSS grid ni `gap`, sin blur, sombras ni animaciones. Todo estilo nuevo del teléfono va bajo `body:not(.watch)`.
- Color: el color de un grupo muscular nunca va solo (cada grupo tiene su forma, por daltonismo).
- Pendientes decididos por el usuario y sin hacer (videos en la nube, etc.): sección "Pendientes" de docs/HISTORIAL.md.

## Pruebas
Playwright con el Chromium preinstalado y un servidor local sobre la carpeta transpilada. Hacer capturas a 390×844 y también en tamaño reloj. Bloquear `googleapis.com`.
- Cómo: copiar `www` a otra carpeta (nunca pasar `www`), `node ci/legacy.mjs <copia>` desde el repo y luego `node tests/tX.mjs <copia> <copia transpilada de la versión anterior> [capturas]` con `PW_DIR` apuntando a Playwright. La copia necesita `fonts/` para tboot. La salida transpilada debe pasar acorn ES2016.
- **Cambio chico:** correr solo las pruebas de lo que se tocó (por ejemplo, finanzas → tfin, tfin2, tfin3 y tfq) más `tests/tboot.mjs` (dueño, usuario nuevo y reloj).
- **Batería completa** (todas las `tests/t*.mjs`, unos 45 minutos): solo cuando el usuario diga «compila» o en cambios grandes hechos en una rama aparte.
- Mientras corre la batería no se revisa a cada rato: esperar a que termine y avisar solo del resultado.
- Un elemento nuevo en el Hoy del dueño se añade a `HIDE_NEW` en tests/tboot.mjs (esa prueba compara con la versión anterior).

## Repositorio público
El repo es público: nada personal de usuarios (medidas, peso, edad, salud, correo, conversaciones) en el código nuevo, este archivo, las pruebas ni los commits. Las pruebas usan datos inventados.
