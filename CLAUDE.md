# Forja — guía para continuar el desarrollo

App personal de gimnasio de Edgar (Edgwr), en español. Celular Android y reloj M99 Pro+ (WebView antiguo, Chrome ~51). Compite con Hevy y Symmetry; quizá se publique en Google Play.

**Versión actual compilada:** v1.0.38 (coach semanal: reporte de músculos del viernes, entreno para completar el fin de semana y propuesta del domingo con Aplicar; antes v1.0.37: círculo "+" para agregar ejercicios en la franja de la sesión, recordatorios a pantalla completa con sonido de alarma y también con el celular en uso; antes v1.0.36: detalle del día con envío a IA, reloj con pantalla que se apaga sola y "Saltar calentamiento" visible; antes v1.0.35: reloj: peso editable en el calentamiento y "Tus series"; antes v1.0.34: modo reloj detectado aunque el WebView no informe el táctil, ir al inicio sin terminar la sesión en el reloj; antes v1.0.33: arreglo del bucle de recargas y sin ubicación en la web; antes v1.0.32: Fases 1-4 de la app pública: bienvenida y rutinas por objetivo, entrenador inteligente, Android 16 y Billing 8, legales, logros, amigos y modo entrenador). Versión web: workflow `.github/workflows/web.yml` publica `www/` en GitHub Pages en cada push a `main` (https://edlop16-dotcom.github.io/cuaderno-hierro/); requiere activar Pages → Source: GitHub Actions y agregar ese origen al cliente OAuth web de Google para entrar con Google.

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
- Orden de scripts: library.js, icons.js, (inline en index.html), coach.js, media.js, native.js, skin.js, config.js, sync.js, undo.js, layout.js, session.js, stats.js, safety.js, imports.js, rir.js, body.js, warm.js, mmap.js, swap.js, ready.js, nutri.js, share.js, meso.js, level.js, play.js, ai.js, web.js, plan2.js, burn.js, routines.js, keep.js, exview.js, picker.js, daydel.js, navord.js, habalarm.js, pulse.js, health.js, sleep.js, train2.js, watch2.js, legal.js, polish.js, pub.js, smart.js, store.js, social.js, daydetail.js, moves.js, load.js, quick.js, ranks.js, quest.js, superset.js, setctl.js, finsum.js, weekly.js. Un archivo nuevo va al final (legal.js va antes de polish.js porque lo usa la bienvenida).
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
- train2.js: al enfocar peso/reps se selecciona todo; lo escrito se copia a las series siguientes no hechas que tenían el mismo valor o estaban vacías (`copyForward`). Anillo de avance y ✓ en la franja `.sx-th`. Botón del ejercicio (antes "cambiar") abre `busySheet`: hacer ahora otro de la rutina (`doNow` reordena el borrador), cambiar por parecido (swap.js) o agregar de la lista (`pkOpenDraft`: el selector en modo borrador; `addToDraft`/`draftExFrom`, solo para hoy). Al final de la franja de miniaturas `#sx-strip` hay un círculo punteado "+" (`.sx-th-add`, `data-act="add-ex"` con el último índice) que abre ese mismo selector, como en Symmetry. `coachBox` respeta la Preparación del día (mid/low). `warmBox` reescrito con explicación y "pon en cada lado". Si el descanso acaba con el pulso > `hrReady()`, `restHold` espera hasta 75 s.
- watch2.js: `watchGeom()` (index.html) activa el modo reloj en pantallas casi cuadradas < 720 px si son táctiles o la pantalla física mide < 900 px (el WebView del M99 puede no informar el táctil), además de < 330 px; migraciones locales `cdh.watchMig1` y `watchMig2` quitan un `watch:false` antiguo. Ajustes → Pantalla muestra el tamaño de la pantalla para diagnosticar. `vWatchSession` nuevo: puntos de avance, calentamiento paso a paso con su peso editable (−/+ o teclado, `e.wuW[k]`) y "Tus series" para cambiar el peso de trabajo desde ahí (`w2-tadj`, recalcula el calentamiento), peso/reps con −/+ y teclado propio (`w2.pad`, sin teclado del sistema), "⋯ Más" (cómo se hace, máquina ocupada, agregar, ±serie, ir al inicio sin terminar (`w2.away`; el inicio muestra "Volver al entrenamiento"), vista completa, terminar). Descanso a pantalla completa en `#rest.w2-rest` (se arma una vez y se actualiza): tiempo, pulso, RIR de la serie (`state.wLast`) y qué sigue. Sin CSS grid ni `gap` en estos estilos (WebView viejo).
- En el reloj no se usa GPS y el sensor de pulso se apaga con la pantalla apagada (batería). La pantalla del reloj ya no se mantiene encendida por defecto (`awakeMode()` = 'off' en el reloj; migración local `cdh.watchAwake1`): se enciende con el gesto de levantar la muñeca del propio reloj.
- daydetail.js: al tocar un día de la tarjeta de racha, `daySheet` muestra cada ejercicio con sus series (peso×reps, @RIR, drops), notas, duración y pulso, y botones Analizar con Claude (claude.ai/new?q=), Compartir (Share: Claude, ChatGPT, WhatsApp…) y Copiar (`sessionText`, `sessionPrompt`).

## Revisión completa del 12-oct-2026 (polish.js) y batería
- Entrenar: la tarjeta "Te toca" + Empezar va justo bajo el saludo (`trainOrder`).
- En la sesión solo se anima la foto de la página visible (`.sx-page.cur`, `sxCur()`); el resto queda en pausa.
- Coach: para ejercicios sin historial, el consejo de RIR usa el de la semana del mesociclo (`rirTipNow`, `rirTarget`), no un "2 reps" fijo.
- Duración estimada realista: por serie 45 s de trabajo + descanso, más 90 s por ejercicio y 5 min de calentamiento.
- Batería y rendimiento: las animaciones `miniLoop` (media.js) y `pvLoop` (session.js) solo corren mientras hay figuras visibles (`miniKick`), y en reposo no queda ningún requestAnimationFrame. El intervalo de 250 ms no hace nada sin descanso ni sesión (`tickIdle`). `Intl.NumberFormat` y `DateTimeFormat` se guardan en caché (`NF_KG`, `DTF`). En modo reloj no hay blur, sombras ni animaciones.
- Fusión de `daily` (sync.js): los booleanos se combinan con OR; `water` y `steps*` toman el mayor.

## App pública · Fase 1 (pub.js, en beta)
- Instalación nueva (sin `cdh.settings`, `cdh.sessions` ni `cdh.plans`) = usuario público: `FRESH` y `PUB_INIT` en index.html marcan `settings.pub=1`, `onb=0` y dan por hechas las migraciones personales de Edgar (importSym*, hevyImport1, weekFix1, planFix2, bedtime1…). Empieza con `starterPlans()`, el gimnasio `{id:'rokaz', name:'Mi gimnasio'}` (el id interno se mantiene para no romper los `|| 'rokaz'`), `HISTORY` genérico, hábitos genéricos (proteína, caminar, frutas y verduras, dormir) y sin recordatorio de creatina.
- La instalación de Edgar queda con `settings.owner=1` (se sincroniza). Usar siempre `pubUser()` (= pub && !owner), nunca `state.settings.pub` directo. Si llega `pub` a una cuenta con owner, `ownerFix()` lo pone en 0 (no borrarlo: un ajuste borrado no se sincroniza y vuelve) y NUNCA se recarga: así se causó un bucle de recargas (parpadeo) en v1.0.32.
- Bienvenida `#onb` (9 pasos): nombre, objetivo (`PB_GOALS`: musculo, fuerza, grasa, salud, mayor), experiencia 0-3, días 2-6 y minutos, equipo (gym, basic, home, body), datos (edad ≥13, sexo, cm, kg, unidad), molestias (`PB_INJ` → `PB_AVOID`), PAR-Q (+ embarazo), resumen. Se guarda en `settings.prof`; llena `body()`, `nutri()` y `HISTORY` (`applyProf`). "Ya tengo cuenta" salta a Ajustes. En el reloj no se muestra.
- `genPlan(o)`: división según días y experiencia (`pbSplit`: cuerpo completo, torso/pierna, empuje/tracción/pierna), ejercicios por patrón y equipo (`PB_SLOTS`), dosis por objetivo (`pbDose`) y tantos ejercicios como quepan en los minutos. Peso inicial 0: el coach explica cómo elegirlo.
- Rutinas: botón "Plantillas por objetivo" (`PB_TPL`). Ajustes: tarjeta "Tu objetivo y plan" (cambiar objetivo, plantillas, kg/lb).
- kg/lb: `settings.unit`; `pbSetUnit` convierte planes, sesiones, borrador y récords; discos 45/35/25/10/5/2,5 y barra 45 lb; incrementos de 5 lb; el texto "kg" se cambia a "lb" en pesas (MutationObserver), el peso corporal sigue en kg (`.bw`, Perfil → Cuerpo).
- Menores de 18 (`prof.minor`): sin calorías ni dietas (`nutriCard`). PAR-Q con algún "sí": tarjeta `.pb-warn` en Entrenar hasta "Ya consulté con un médico". Nivel de fuerza para mujeres con estándares ×0,7.
- Pruebas: `leg/` simula la instalación del dueño (inyecta `{owner:1}`); `legp/` es un usuario nuevo (pubt.py, pubw.py, pubo.py). Algunas pruebas antiguas (qa.py, w2t.py) dependen del día de la semana.

## Alarmas de hábitos (nativo)
- `habalarm.js` + plugin propio `HabitAlarm` en `ci/native/*.java`, que `ci/patch_native.py` copia al proyecto Android y registra en MainActivity (permisos USE_FULL_SCREEN_INTENT, USE_EXACT_ALARM). Recordatorio tipo `hab` con `r.hab` (clave del hábito); los tipos viejos crea/prot/omega también cuentan como hábitos.
- A la hora: pantalla completa nativa (✕, ✓ hecho, aplazar N min). Android solo la abre con el celular bloqueado o la pantalla apagada; con el celular en uso muestra la notificación arriba. Si el usuario da "Aparecer encima de otras apps" (SYSTEM_ALERT_WINDOW, `status().overlay`, `openSettings({type:"overlay"})`), `HabitAlarms.show` abre la actividad igual. Lo marcado con la app cerrada se lee con `HabitAlarm.takeEvents()` al abrir. Con la app abierta o en web se muestra `#hab-alarm`. La pantalla nativa (`HabitAlarmActivity.ring()`) suena en bucle con el tono de alarma del sistema (USAGE_ALARM: se oye aunque el celular esté en silencio) y vibra, como una app de recordatorios; se calla al tocar un botón, con las teclas de volumen o sola a los `ring` segundos del recordatorio: Ajustes → "Cuánto suena la alarma" (`settings.alarmSec`: 10 s por defecto, 30 s o 1 min; `haRing()` lo pone en cada item, también en los aplazados y en Probar). Si el celular está en uso, la abre el permiso "Aparecer encima de otras apps" (`canDrawOverlays`).
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
2. **Entrenador inteligente** — HECHA en beta (smart.js):
   - `coachFor` según `goalNow()` (prof.goal; dueño = musculo): fuerza (repsMax ≤ 6) calcula el peso con el 1RM estimado de la última sesión y el RIR de la semana (máx. +2 incrementos); grasa: "mantener ya es ganar" y estancamiento sin descarga; salud/movilidad: sube solo tras 2 sesiones completas seguidas, movilidad con +2,5 como máximo.
   - Cardio en `daily[dk].cardio` [{at,t,min,z:s/m/v,km,kcal}] (borrar = `del:1`; sync.js lo fusiona por `at` como `pg`). kcal = MET × peso × horas. Meta OMS: min moderados + 2× fuertes ≥ 150. Caminar ≥30 min marca el hábito `hwalk`. Tarjeta `.cd-card` bajo "Te toca".
   - Perfil → Cuerpo: "Tu plato" (método de la mano, por sexo y objetivo, comidas locales); se agregaron trucha, quinua y pavita a PROT_FOODS.
   - Resumen (`weekReport(offset)`): sesiones, series, récords, cardio, pasos, sueño, hábitos, proteína, músculos con menos de 10 series y cambio del peso promedio según el objetivo, con hasta 3 consejos. En Perfil → Hoy: pestañas esta semana, la pasada y el mes. En Entrenar, "Tu semana pasada" hasta cerrarla (`settings.wkSeen`).
   - Reajuste: 10+ días sin entrenar → "sesión de regreso" (`settings.retDay`: −1 serie y −10 % al empezar). 2+ ejercicios del plan estancados (3 sesiones sin mejorar el 1RM) → tarjeta con descarga (mesoSheet) y variantes (`settings.stallSeen` por semana).
3. **Para la tienda** — HECHA en beta (store.js, legal.js, ci/patch_store.py, ci/native/BillingPlugin.java). Ver `docs/google-play.md` (pasos manuales y Seguridad de los datos).
   - API 36 con Capacitor 6: `patch_store.py` (después de patch_native.py) pone compile/target 36, AGP 8.10.1, Gradle 8.13, Kotlin 2.1.21 y minSdk 22. En Android 15+ MainActivity aplica márgenes con los insets (barras, recorte, teclado) porque el borde a borde es obligatorio.
   - Permisos: se quitó USE_EXACT_ALARM; SCHEDULE_EXACT_ALARM sin maxSdk (el usuario lo concede; habalarm.js ya muestra el botón).
   - Billing 8: plugin `Billing` (getProducts{ids} → offers con phases, purchase{productId, offerToken}, getActive, manage). `PRO_CFG.productId='forja_pro'`, planes base `mensual`/`anual`; `settings.pro.until` = ahora + 3 días si está activa, y se revisa al abrir. `PRO_CFG.enforce` sigue en false hasta crear la suscripción.
   - Legales: `LEGAL` (privacy, terms, minAge 14, owner y contact = Edgar y su correo personal por ahora). Páginas `www/privacidad.html`, `terminos.html` y `eliminar-cuenta.html` (web.yml ya no copia docs/).
   - Consentimiento expreso en el paso 8 de la bienvenida (`settings.consent` {v, at}). El aviso de salud de play.js no sale mientras la bienvenida está pendiente.
   - Errores: `errPush` (window error / unhandledrejection, sin errores de red) → `cdh.errq` → Firestore `errors` (solo con cuenta, `settings.errRep` en Ajustes, campo `exp` para TTL de 90 días). Regla create-only en ci/firestore.rules.
4. **Crecimiento** — HECHA en beta salvo el inglés (social.js):
   - Logros (`BADGES`, `badgeStats()` con caché): entrenos, semanas cumpliendo, récords, toneladas, cardio, hábitos y madrugador. Tarjeta en Perfil → Progreso; aviso al ganar uno (`settings.badgesSeen`, la primera vez se marcan sin aviso).
   - Firestore: `codes/{code}` → {acc} (6 letras, se crea una vez); `social/{acc}` {name, j: resumen semanal}; `share/{acc}` {trainers[], j: últimas 8 sesiones, rutina, peso promedio, molestias}; `inbox/{acc}/items` (type `client` o `plan`). Reglas en ci/firestore.rules. Solo con cuenta y no en el reloj (`socAuth()`).
   - Amigos y retos (`settings.social`, `settings.friends`): ranking de la semana por sesiones, series o cardio en Perfil → Hoy. Se publica como máximo cada 10 min y al terminar una sesión.
   - Entrenador: el alumno escribe el código del entrenador (`settings.trainers`) y se crea `share/{acc}` + aviso en la bandeja del entrenador. El entrenador activa "Modo entrenador" en Ajustes (`settings.coachMode`), ve "Mis alumnos" (`settings.clients`), abre la ficha y envía una rutina de su gimnasio activo; el alumno la acepta (se agrega y activa) o la rechaza.
   - Pruebas: soct.py con un Firestore simulado en Python (dos usuarios).
   - Inglés: pendiente; requiere sacar todos los textos a un diccionario (trabajo grande aparte).

## Fase 5 · Lo que le faltaba frente a Symmetry (pedida por Edgar el 15-oct-2026, en beta)
Inspirada en funciones que tiene Symmetry. Solo ideas: los textos, coeficientes, planes y figuras son propios de Forja (no copiar contenido de otras apps).
- moves.js: 24 ejercicios nuevos con figura animada (`MOVES`, `bw:1` = sin peso externo): sentadilla con peso corporal, con salto, isométrica en pared, subida al cajón, puente a una pierna, peso muerto a una pierna, sentarse y pararse de la silla, swing con kettlebell, flexiones de rodillas/inclinadas/diamante/en pica, remo invertido, superman, Y boca abajo, bicho muerto, elevación de piernas tumbado, escaladores, burpees, saltos de tijera, equilibrio en un pie, press de hombro en máquina, remo en máquina, sentadilla en Smith. Se agregan a `PB_SLOTS` (body/home ya tienen hombro, espalda y tríceps), `ALIAS` y `PB_AVOID`. `isBodyweight(name)`. `pbPick`: movilidad usa la silla y el equilibrio y nunca saltos; sin equipo y principiante o movilidad se saltan dominadas y flexiones difíciles (`qkSkip`). Figuras: verificar con capturas (t = 0, 0,5 y 1); `vb` amplía el viewBox si la cabeza se sale.
- load.js: peso inicial sugerido. `SL_COEF` [implemento, 1RM/peso corporal principiante, con experiencia] (mancuernas por mano) + los de `LV_STD` (85 % Bronce / 90 % Plata). Mujer ×0,72 pierna / ×0,58 torso; 50+ ×0,85; 65+ ×0,7; movilidad ×0,8; PAR-Q ×0,85. Epley con reps en reserva (4/3/2 según experiencia). Redondeo: mancuernas `SL_DB_KG`, kettlebells, discos de 5 (solo discos, barra aparte; "solo la barra" si no alcanza), máquinas de 5. `startLoad(ex)`. Manda: historial > peso escrito > sugerido (`e.startLoad` marca el sugerido; se borra al editar el peso en el formulario). genPlan/plantillas/entreno rápido llegan con peso; `suggest` y `coachFor` lo explican la primera vez; el selector de la biblioteca propone el sugerido en vez de 10 kg. El dueño no cambia (sus rutinas tienen peso).
- quick.js: "Entreno rápido" en Entrenar (tarjeta `.qk-card` tras "Te toca"): enfoque (`QK_FOCUS`, incluye Cardio exprés en circuito), 10-45 min (tabla fija de ejercicios/series/descanso) y equipo; "Otra opción" baraja (`seed`). Empieza con una rutina temporal `quick` que se quita al instante (la sesión queda con `planId:'quick'`). Al Entreno rápido no se le aplican la descarga ni el +1 serie de meso.js, los recortes de la Preparación (ready.js) ni la sesión de regreso (smart.js). Plantillas nuevas en `PB_TPL`: glute4 (`split:'glute'`, día `gl`), express3, ppl3, str3, fat4, home4, cal4, mob3.
- ranks.js: más ejercicios con rango (estándares de `SL_COEF`). "Tu cuerpo por rangos" en Progreso: silueta de mmap.js pintada con el mejor rango de cada músculo (`muscleRanks()`, 4 meses, solo músculo principal). Al terminar, si sube un músculo o ejercicio, medalla animada `.rk-reveal` (espera a que se cierre la racha; en el reloj solo toast). Es el único aviso de subida: level.js ya no muestra su toast.
- quest.js: "Misiones de inicio" para `pubUser()` (perfil, peso, 1.er entreno, entreno rápido, hábito, 3 en una semana, primer rango); confeti al completarlas (`settings.questDone`), "Ocultar" (`settings.questOff`). Aviso de peso raro al escribir un peso ≥2,2× o ≤⅓ de la referencia del ejercicio (en libras dice "lb" y los márgenes se pasan a lb).
- Pruebas (Windows de Edgar): Playwright con Edge (`channel:'msedge'`; el Chromium de Playwright no arranca ahí), servidor local sobre la copia transpilada y acorn ES2016. Escenarios: usuario nuevo en gym, mujer 62 sin equipo con rodilla (movilidad), dueño (sin cambios frente a beta) y reloj.
- Fuera de alcance por ahora: escaneo corporal con IA (necesita servidor), widgets/Live Activities y el chat de IA propio (ai.js ya abre Claude).

## Ajustes del gym, tanda 1 (15-oct-2026, en beta)
- setctl.js: botones grandes "− Quitar serie" / "+ Agregar serie" bajo la tabla de series de cada ejercicio (`.st-ctl`; se quitan los viejos `add-set`/`rm-set`). En el reloj, − y + a los lados de "Serie 1 de N" (`.w2-subs`) y "+ Una serie más" con el ejercicio completo. Quitar borra la última serie sin hacer (nunca una marcada) y actualiza `e.target`; solo para hoy.
- daydetail.js: `sessionText` agrega una línea con el tipo de día (`DD_KIND`: fuerza/bombeo, o "Entreno rápido") y el objetivo (`ddGoal()`: `prof.goal` → `PB_GOALS`, si no `HISTORY.goal`). En el texto para la IA (`sessionPrompt`) el objetivo va una sola vez arriba.
- Alarma de hábitos breve: ver "Alarmas de hábitos" (`ring`).
- Pruebas: tg1.mjs (teléfono dueño y nuevo, reloj, copiar y alarma).

## Resumen al terminar, tanda 2 (finsum.js, 15-oct-2026, en beta)
- Al guardar una sesión se abre un resumen (`#sheet .fs-card`, sin grid ni gap: también en el reloj): kg levantados (con la barra de cada ejercicio del borrador), series, ejercicios y duración (se lee a los 450 ms, después de `finishWith`); récords y mejoras de `s.wins` (stats.js); "Frente a la última vez": la sesión anterior con el mismo `dayId` (`fsPrev`), volumen en % y por ejercicio ⬆/⬇/＝/nuevo según el mejor 1RM de la serie (empate → volumen), y lo que no se hizo. Entreno rápido y primera vez lo dicen sin comparar.
- "Para tu próxima sesión": cada ejercicio pasa por `coachFor` (el del plan o uno armado con lo de hoy): peso, series × reps (`goal`) y el motivo.
- Orden: racha (`.celebrate`, si sube) → resumen con `fsChime()` (arpegio propio con WebAudio; `settings.finSound`, y nada si el aviso está en silencio) → medalla de rango (`rkReveal` espera a que se cierre el resumen). Deshacer la sesión cierra el resumen (`removeSessions`).
- Ajustes → "Música y sonidos" (`fs-set`): sonido de logro y `settings.music` (solo https de open.spotify.com, spotify.link, youtube.com o youtu.be). Con enlace: 🎵 en la barra de la sesión, en "⋯ Más" del reloj y en el resumen; se abre con `openExt`.
- Pruebas: tg2.mjs (dueño con dos sesiones del mismo día, usuario nuevo con música y entreno rápido, reloj); trv.mjs comprueba que la medalla espera al resumen.

## Coach semanal, tanda 3 (weekly.js, 15-oct-2026, en beta)
- Volumen: `weekSets(0)` (mmap.js) + lo que aún toca de la rutina activa (`wcPending`: días no hechos esta semana, de hoy en adelante, como máximo los que faltan para la meta; en descarga, la mitad de series). Meta `WC_MIN`-`WC_MAX` = 10-20 series en los músculos de `MM_MAIN`. Músculo principal de un ejercicio: `wcMain` (zoneShares = 1).
- Reporte (día `settings.wcoach.fri`, por defecto viernes; opciones mié-sáb): tarjeta `.wc-card` en Entrenar desde ese día hasta el domingo o hasta cerrarla (`settings.wcSeen.f` = semana). Hoja: objetivo arriba (`ddGoal()`), faltan / exceso / en la meta, barras (rayado = lo que aún toca), Compartir y Copiar (`wcReportText`, Share de Capacitor → navigator.share → portapapeles).
- "Crear entreno para completar" (`wcBuild`): por músculo que falta, primero ejercicios que ya hace (historial de 8 semanas en el gym, luego sus rutinas), luego `PB_SLOTS` según el equipo; evita `PB_AVOID` de sus molestias y músculos con dolor fuerte (leve: −1 serie). Máx. 4 series por ejercicio (3 el segundo), 2 si nunca lo hizo (`doneBefore`), 7 ejercicios y 20 series. Fuerza 6-8 / 8-10 reps, bombeo 10-12 / 12-15. Peso (`wcLoad`): último 1RM estimado de ese ejercicio llevado a las reps nuevas con 2 de sobra; si no, el de la rutina o `startLoad`. Se guarda en `settings.wcFill` {id, wk, date (sáb/dom), kind, gym, list} y sale como tarjeta hasta ese día; empieza con una rutina temporal `wcfill` (como quick.js). meso.js aplica la descarga; el +1 serie de las semanas finales se quita. `learnWeights` no copia sus pesos a las rutinas.
- Resumen y propuesta (día `settings.wcoach.sun`, por defecto domingo; opciones vie, sáb, dom, lun): de viernes a domingo resume la semana actual; el lunes (o antes del día elegido) la que terminó (`wcSumOff`). `reportHTML` de smart.js + series por músculo + propuesta (`wcProposal`): cada ejercicio de la rutina activa pasa por `coachFor` (peso) y, si el volumen semanal de la rutina para su músculo principal está bajo 10, +1 serie por ejercicio (máx. 5); sobre 20, −1 (mín. 2); si aún falta, una nota. `mesoInfo(at)` acepta una fecha: si la semana siguiente es de descarga no cambia series y muestra lo que hará la sesión (mitad de series, −10 %). "Aplicar" escribe series y pesos en la rutina y guarda la foto en `settings.wcProp` (con lo anterior, para "Deshacer"); "Ahora no" solo cierra (`settings.wcSeen.s`). Nada cambia sin Aplicar.
- Ajustes → "Coach semanal" (`.wc-set`, SET_ORDER 3.5): interruptor `settings.wcoach.on` y los dos días. Perfil → Hoy: accesos `.wc-links`. Nada de esto sale en el reloj.
- Pruebas: tw3.mjs (Playwright con Edge, reloj del navegador fijado): dueño viernes (reporte, completar, guardar, empezar y terminar sin tocar rutinas), domingo (Aplicar / Deshacer / Ahora no), domingo antes de una descarga, Ajustes con otros días, usuario nuevo con rodilla y reloj.

## Superseries (superset.js, 15-oct-2026, en beta)
- Plan: campo `ss:1` en el ejercicio = "superserie con el siguiente" (Rutinas → Editar ejercicio, casilla `#fx-ss` bajo el drop set; solo si hay un ejercicio después). Varios seguidos con `ss` forman un grupo (trío o gigante). `ssChain(list)` da A1/A2/B1… por índice; un `ss` en el último ejercicio no cuenta.
- Rutinas y vista previa: los miembros van juntos en `.ss-box` con la etiqueta `.ss-b` (A1, A2). Subir un ejercicio (`ex-up`) intercambia también los `ss` (la pareja queda en su lugar); quitar el último de un grupo borra el `ss` del anterior (no se pega al siguiente). Se escucha en `window` en captura, antes de index.html y routines.js.
- Sesión: al empezar, `d.ssMap` = {exId: letra}. Los grupos van por exId, así que reordenar (`doNow`), cambiar por otro (`swapDo` conserva exId) o agregar ejercicios no rompe la pareja; los agregados en la sesión van después del grupo (`addToDraft`).
- `markSet` (envoltura más externa): mientras marca, `startRest` queda en espera (`ssHold`). Serie de un miembro que no cierra la vuelta → sin descanso (quita el que corría) y `d.cur` al siguiente miembro pendiente; cierra la vuelta → descanso del ejercicio marcado y vuelve al primer miembro pendiente; grupo terminado → como un ejercicio normal, al siguiente pendiente. Con drop pendiente no cambia nada. En el teléfono, `pagerGo` a los 700 ms (después del salto de session.js a los 650 ms).
- Teléfono: en `#sx-strip` los miembros seguidos se envuelven en `.ss-pair` (píldora con `.ss-link`, sin `position`, para no cambiar `offsetLeft`) y cada miniatura lleva `.ss-b`; cada página muestra `.ss-ban` ("pasas a X sin descanso" / "descansas 2:30 y vuelves a Y").
- Reloj: línea `.w2-ss` bajo el nombre y puntos del grupo unidos en `.w2-ssd` (inline-block, sin grid ni gap). El descanso muestra "Sigue: A1…" porque `d.cur` se fija antes de `startRest`.
- Se conserva al duplicar, copiar a otro gimnasio y crear gimnasio (copias JSON), al sincronizar (los planes van enteros en `profile.plans`) y al enviar una rutina a un alumno (`sendPlan` agrega `ss`). El historial no guarda la superserie.
- Pruebas: tss.mjs (Playwright con Edge): dueño (marcar desde Editar, A1→A2→descanso→A1, pareja terminada, copiar/duplicar, subir/quitar), usuario nuevo con trío y vista previa, y reloj 410×500.

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
