# Forja — guía para continuar el desarrollo

App personal de gimnasio de Edgar (Edgwr), en español. Celular Android y reloj M99 Pro+ (WebView antiguo, Chrome ~51). Compite con Hevy y Symmetry; quizá se publique en Google Play.

**Versión actual compilada:** v1.0.31 (ajustes tras el primer entreno real y revisión completa: modo reloj nuevo, copiar pesos a las series siguientes, máquina ocupada, Perfil → Hoy, Ajustes ordenados, menos consumo de batería). Versión web: workflow `.github/workflows/web.yml` publica `www/` en GitHub Pages en cada push a `main` (https://edlop16-dotcom.github.io/cuaderno-hierro/); requiere activar Pages → Source: GitHub Actions y agregar ese origen al cliente OAuth web de Google para entrar con Google.

## Repositorio y flujo de trabajo
- Repo: `edlop16-dotcom/cuaderno-hierro`. appId `pe.edgwr.cuadernohierro`. Capacitor 6.
- Los cambios se trabajan **solo en la rama `beta`**. Hay que probarlos y publicar la vista previa (`cuaderno-beta.html`, todos los `<script src>` incrustados y `FIREBASE=null`) en el mismo artifact de siempre, con `files` ex/*.webp desde `www/`.
- **Cuando Edgar dice "compila"**: `git push origin beta:main`. GitHub Actions (`ci/build.sh`) compila el APK y publica el release `v1.0.N`. La app muestra entonces el banner "Actualizar". Nunca se empuja a `main` sin ese "compila".
- `ci/legacy.mjs` transpila el JS a chrome51 para el reloj. Todo el código debe pasar por ahí: verificar con acorn ES2016 sobre la salida transpilada.
- El keystore es fijo (`ci/cuaderno.keystore`, alias `cuaderno`, clave `cuaderno2026`). No cambiarlo: rompería las actualizaciones.

## Arquitectura (www/)
- JS vanilla. Cada archivo nuevo **sobrescribe funciones globales encadenando la anterior**:
  ```js
  const _x = vTrain;
  vTrain = function () { ... _x() ... };
  ```
  Sirve igual para render, vTrain, vSession, finishSession, markSet, vSettings, header y previewSheet.
- Orden de scripts: library.js, icons.js, (inline en index.html), coach.js, media.js, native.js, skin.js, config.js, sync.js, undo.js, layout.js, session.js, stats.js, safety.js, imports.js, rir.js, body.js, warm.js, mmap.js, swap.js, ready.js, nutri.js, share.js, meso.js, level.js, play.js, ai.js, web.js, plan2.js, burn.js, routines.js, keep.js, exview.js, picker.js, daydel.js, navord.js, habalarm.js, pulse.js, health.js, sleep.js, train2.js, watch2.js, polish.js, pub.js. Un archivo nuevo va al final.
- Estado en `state` (sessions, plans, settings, draft). Se guarda en localStorage con claves `cdh.*`: `saveLocal()` para sesiones y `savePlans()` para settings y planes.
- Navegación de 4 pestañas, ordenable (navord.js, `settings.navOrder`; por defecto Perfil · Entrenar · Rutinas · Ejercicios · Ajustes; Ajustes es el 5.º botón para el reloj). Los hábitos solo se muestran en Perfil. Perfil tiene las subpestañas Hoy · Progreso · Cuerpo · Historial (`state.profSub` = hoy/progress/body/history; polish.js): "Hoy" muestra `dayStrip()` (hábitos x/y, entreno, pasos, sueño) y la tarjeta de hábitos. Ajustes es página propia (`vProfile('settings')`), ordenada con `SET_ORDER`: cuenta y recordatorios primero, privacidad al final.
- Sesión en pantalla completa `#sx` con páginas deslizables. Los hábitos y las rachas están en stats.js. Los avisos de lesión y el dolor muscular están en safety.js (`ZONES`, `zonesOf`).
- Sincronización con Firebase por REST, sin SDK (sync.js): login con Google y con correo, y vínculo del reloj con un código de 6 letras. Fusión en 3 vías con lápidas; `sync.revive(ids)`.
- Las migraciones de una sola vez se marcan con flags en `state.settings`: importSym1-3, symDate9, weekFix1, hevyImport1, symImport2, etc.
- Gimnasios: `rokaz` (desde el 5 de octubre de 2026) y `raydac` (antes). Los pesos se guardan por gimnasio.
- Barra: se anotan solo los discos; la barra de 20 kg se muestra aparte. 1RM con Epley, `w*(1+r/30)`. Las sesiones `approx:true` no cuentan para gráficas ni récords.
- Las fotos de ejercicios son de Free Exercise DB (dominio público), en `www/ex/<key>-0/1.webp`.
- Para importar historial: `importSessions(list)` en imports.js (Hevy CSV y Symmetry).
- Estilos: se agregan al final de `skin.css`. En flex, poner `flex-shrink:0` a los hijos de `.sheet-card` y `.sx-page`. Antes de crear una clase nueva, comprobar que no choque con otra existente (ya pasó con `.sync` y `.prof`).

## Entreno: ajustes tras el primer uso real (train2.js) y modo reloj (watch2.js)
- train2.js: al enfocar peso/reps se selecciona todo; lo escrito se copia a las series siguientes no hechas que tenían el mismo valor o estaban vacías (`copyForward`). Anillo de avance y ✓ en la franja `.sx-th`. Botón del ejercicio (antes "cambiar") abre `busySheet`: hacer ahora otro de la rutina (`doNow` reordena el borrador), cambiar por parecido (swap.js) o agregar de la lista (`pkOpenDraft`: el selector en modo borrador; `addToDraft`/`draftExFrom`, solo para hoy). `coachBox` respeta la Preparación del día (mid/low). `warmBox` reescrito con explicación y "pon en cada lado". Si el descanso acaba con el pulso > `hrReady()`, `restHold` espera hasta 75 s.
- watch2.js: `watchGeom()` (index.html) activa el modo reloj en pantallas táctiles casi cuadradas < 720 px (M99) además de < 330 px; migración local `cdh.watchMig1` quita un `watch:false` antiguo. `vWatchSession` nuevo: puntos de avance, calentamiento paso a paso, peso/reps con −/+ y teclado propio (`w2.pad`, sin teclado del sistema), "⋯ Más" (cómo se hace, máquina ocupada, agregar, ±serie, vista completa, terminar). Descanso a pantalla completa en `#rest.w2-rest` (se arma una vez y se actualiza): tiempo, pulso, RIR de la serie (`state.wLast`) y qué sigue. Sin CSS grid ni `gap` en estos estilos (WebView viejo).
- En el reloj no se usa GPS y el sensor de pulso se apaga con la pantalla apagada (batería).

## Revisión completa del 12-oct-2026 (polish.js) y batería
- Entrenar: la tarjeta "Te toca" + Empezar va justo bajo el saludo (`trainOrder`).
- En la sesión solo se anima la foto de la página visible (`.sx-page.cur`, `sxCur()`); el resto queda en pausa.
- Coach: para ejercicios sin historial, el consejo de RIR usa el de la semana del mesociclo (`rirTipNow`, `rirTarget`), no un "2 reps" fijo.
- Duración estimada realista: por serie 45 s de trabajo + descanso, más 90 s por ejercicio y 5 min de calentamiento.
- Batería y rendimiento: las animaciones `miniLoop` (media.js) y `pvLoop` (session.js) solo corren mientras hay figuras visibles (`miniKick`), y en reposo no queda ningún requestAnimationFrame. El intervalo de 250 ms no hace nada sin descanso ni sesión (`tickIdle`). `Intl.NumberFormat` y `DateTimeFormat` se guardan en caché (`NF_KG`, `DTF`). En modo reloj no hay blur, sombras ni animaciones.
- Fusión de `daily` (sync.js): los booleanos se combinan con OR; `water` y `steps*` toman el mayor.

## App pública · Fase 1 (pub.js, en beta)
- Instalación nueva (sin `cdh.settings`, `cdh.sessions` ni `cdh.plans`) = usuario público: `FRESH` y `PUB_INIT` en index.html marcan `settings.pub=1`, `onb=0` y dan por hechas las migraciones personales de Edgar (importSym*, hevyImport1, weekFix1, planFix2, bedtime1…). Empieza con `starterPlans()`, el gimnasio `{id:'rokaz', name:'Mi gimnasio'}` (el id interno se mantiene para no romper los `|| 'rokaz'`), `HISTORY` genérico, hábitos genéricos (proteína, caminar, frutas y verduras, dormir) y sin recordatorio de creatina.
- La instalación de Edgar queda con `settings.owner=1` (se sincroniza). Si un equipo nuevo inicia sesión en su cuenta y llega `owner`, se quita `pub` y se recarga.
- Bienvenida `#onb` (9 pasos): nombre, objetivo (`PB_GOALS`: musculo, fuerza, grasa, salud, mayor), experiencia 0-3, días 2-6 y minutos, equipo (gym, basic, home, body), datos (edad ≥13, sexo, cm, kg, unidad), molestias (`PB_INJ` → `PB_AVOID`), PAR-Q (+ embarazo), resumen. Se guarda en `settings.prof`; llena `body()`, `nutri()` y `HISTORY` (`applyProf`). "Ya tengo cuenta" salta a Ajustes. En el reloj no se muestra.
- `genPlan(o)`: división según días y experiencia (`pbSplit`: cuerpo completo, torso/pierna, empuje/tracción/pierna), ejercicios por patrón y equipo (`PB_SLOTS`), dosis por objetivo (`pbDose`) y tantos ejercicios como quepan en los minutos. Peso inicial 0: el coach explica cómo elegirlo.
- Rutinas: botón "Plantillas por objetivo" (`PB_TPL`). Ajustes: tarjeta "Tu objetivo y plan" (cambiar objetivo, plantillas, kg/lb).
- kg/lb: `settings.unit`; `pbSetUnit` convierte planes, sesiones, borrador y récords; discos 45/35/25/10/5/2,5 y barra 45 lb; incrementos de 5 lb; el texto "kg" se cambia a "lb" en pesas (MutationObserver), el peso corporal sigue en kg (`.bw`, Perfil → Cuerpo).
- Menores de 18 (`prof.minor`): sin calorías ni dietas (`nutriCard`). PAR-Q con algún "sí": tarjeta `.pb-warn` en Entrenar hasta "Ya consulté con un médico". Nivel de fuerza para mujeres con estándares ×0,7.
- Pruebas: `leg/` simula la instalación del dueño (inyecta `{owner:1}`); `legp/` es un usuario nuevo (pubt.py, pubw.py, pubo.py). Algunas pruebas antiguas (qa.py, w2t.py) dependen del día de la semana.

## Alarmas de hábitos (nativo)
- `habalarm.js` + plugin propio `HabitAlarm` en `ci/native/*.java`, que `ci/patch_native.py` copia al proyecto Android y registra en MainActivity (permisos USE_FULL_SCREEN_INTENT, USE_EXACT_ALARM). Recordatorio tipo `hab` con `r.hab` (clave del hábito); los tipos viejos crea/prot/omega también cuentan como hábitos.
- A la hora: pantalla completa nativa (✕, ✓ hecho, aplazar N min). Lo marcado con la app cerrada se lee con `HabitAlarm.takeEvents()` al abrir. Con la app abierta o en web se muestra `#hab-alarm`.
- `.github/workflows/android-beta.yml` compila en cada push a `beta` sin publicar release (solo comprueba).
- Para Google Play: USE_EXACT_ALARM y pantalla completa requieren justificar el uso (o quitarlos).

## Versión web
- `web.js`: solo actúa fuera de la app nativa (`IS_WEB`). Google con Google Identity Services → `signInWithIdp`; botón Google en la tarjeta de cuenta; `openExt` abre enlaces en otra pestaña; sincroniza al volver a la pestaña y cada 2 min; PWA (`manifest.webmanifest`, `sw.js` red primero).
- La política de privacidad queda en `/privacidad.html` del mismo sitio.

## Pruebas
Playwright con el Chromium preinstalado y un servidor local sobre la carpeta transpilada. Hacer capturas a 390×844 y también en tamaño reloj. Bloquear `googleapis.com`.

## Datos de Edgar
Estatura: en la app 173 cm (HISTORY.cm); en un chat dijo 1,70 m, por confirmar (se edita en Perfil → Cuerpo → Tus datos). ~73 kg, 40 años. Nivel principiante-intermedio. Entrena con entrenador en Roka'z. Pantorrillas sensibles: el 5 de octubre las llevó al fallo y quedaron con dolor.

## Parejas de funciones (una versión por pareja; Edgar pide "pareja N")
1. Mi cuerpo + RIR por serie — HECHA en beta (body.js, rir.js)
2. Calentamiento y discos + Mapa muscular semanal — HECHA en beta (warm.js, mmap.js)
3. Reemplazo de ejercicio + Preparación del día — HECHA en beta (swap.js, ready.js)
4. Proteína y calorías + Tarjetas para compartir — HECHA en beta (nutri.js, share.js; plugins @capacitor/share y @capacitor/filesystem)
5. Mesociclos con descarga + Nivel de fuerza — HECHA en beta (meso.js, level.js)
6. Importar Strong + Requisitos de Google Play — HECHA en beta (play.js, AAB en CI, docs/privacidad.html, docs/google-play.md). Falta: publicar reglas Firestore, correo de contacto, GitHub Pages, migrar a API 36
8. Pulso en la sesión + Pasos del día — HECHA en beta (pulse.js; plugin nativo `BodySensors` en ci/native: BODY_SENSORS y ACTIVITY_RECOGNITION; pasos en `daily.stepsP`/`stepsW`, se toma el mayor; resumen `s.hr` {avg,max,min,kcal,s} con Keytel). Pendiente: comprobar si el M99 deja leer el pulso (Ajustes → Pulso y pasos → Probar).
9. Samsung Health + gimnasio automático — HECHA en beta (health.js; plugin Kotlin `Health` en ci/native/HealthPlugin.kt con connect-client 1.1.0-alpha07, Kotlin 1.9.22 y `tools:overrideLibrary` para mantener minSdk 22; lee sueño → `daily.sleepMin` y llena Preparación, pulso en reposo → `daily.rhr` (5+ sobre la media resta 1 al puntaje), peso → `body().w` con `src:'sh'`, pasos → `daily.stepsH`. Gimnasio: `settings.gymLoc[gymId]` y `settings.autoGym`; se revisa al abrir la app, radio de 200 m)
10. Sueño con el celular + Hora de dormir — HECHA en beta (sleep.js; plugin `PhoneSleep` con UsageStatsManager, permiso especial PACKAGE_USAGE_STATS "Acceso a datos de uso"; `sleepNight()` toma el bloque de pantalla apagada que cubre 2-4 am, vistazos <2 min no cortan, despertares ≤45 min antes de 5:30 y ≤10 min después; guarda `daily.sleepPh` {s,e,min,w} y `sleepMin` con `sleepSrc:'ph'` (Samsung Health 'sh' tiene prioridad). Hábito `hsleep` "Dormir a tiempo" + recordatorio 22:30 a pantalla completa (migración `bedtime1`), se marca solo si se durmió antes de 23:15. Cerrar TikTok: se recomendó Bienestar digital / Modos y rutinas de Samsung, no se implementó)
7. Coach con IA + Suscripción Pro — HECHA en beta (ai.js; server/coach-worker.js para Cloudflare; sin AI_CFG.endpoint abre Claude con el contexto; PRO_CFG.enforce=false durante la beta; falta complemento de Google Play Billing al publicar)

## App pública: 4 fases (pedidas por Edgar el 13-oct-2026)
1. **Base pública** — HECHA en beta (pub.js): bienvenida con objetivo, quitar lo personal, plantillas por objetivo, kg/lb y cuestionario de salud.
2. **Entrenador inteligente**: progresión distinta según objetivo (fuerza con %1RM/RPE), registro de cardio, nutrición según objetivo con porciones locales, resumen semanal y mensual, reajuste si falta una semana o se estanca.
3. **Para la tienda**: Ley 29733 y textos legales, Seguridad de los datos y declaración de app de salud en Play, justificar o quitar permisos sensibles, API 36, reglas de Firestore, Crashlytics, Google Play Billing (plan Pro).
4. **Crecimiento**: modo entrenador (clientes con código), amigos y retos, logros, inglés.

## Hoja de ruta (pedida por Edgar el 11-oct-2026)
**Próximas versiones**
1. **Mi cuerpo** (en Perfil):
   - Peso corporal, con el promedio semanal.
   - Medidas mensuales: cuello, pecho, cintura, cadera, brazo, muslo y pantorrilla, cada una con su gráfica.
   - Fotos de progreso (frente, perfil y espalda), guardadas solo en el teléfono, con comparación lado a lado.
   - Grasa estimada con el método de la Marina de EE. UU.
   - Tu potencial: FFMI y medidas objetivo según muñeca y tobillo.
   - Mostrarlo todo como estimación orientativa.
2. **RIR por serie** (0/1/2/3+) al marcar cada serie. El coach lo usa para decidir subidas.
3. **Calentamiento y discos automáticos**: 40 %×10, 60 %×5, 80 %×3, y qué poner por lado.
4. Importar Strong y Symmetry, además de Hevy (que ya existe).

**Después**
- Mapa muscular semanal: series por músculo (<10, 10-20, >20), con alertas.
- Reemplazo de ejercicio por un equivalente, con el peso convertido.
- Mesociclos con semana de descarga.
- Preparación del día: sueño, energía y dolor.
- Calculadora de proteína y calorías, con registro en gramos.
- Tarjetas para compartir en Instagram y WhatsApp.

**Para la tienda**
- Coach con IA en español.
- Nivel de fuerza.
- Amigos y retos.
- Modo entrenador.
- Registro por voz en el reloj.
- Suscripción Pro con Google Play Billing.
- Requisitos de Play: AAB, política de privacidad, borrar la cuenta desde la app, formulario de Seguridad de datos y aviso de salud.
- Revisión de seguridad y privacidad.
