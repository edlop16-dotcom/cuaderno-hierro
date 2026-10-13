# Forja — guía para continuar el desarrollo

App personal de gimnasio de Edgar (Edgwr), en español. Celular Android y reloj M99 Pro+ (WebView antiguo, Chrome ~51). Compite con Hevy y Symmetry; quizá se publique en Google Play.

**Versión actual compilada:** v1.0.35 (reloj: peso editable en el calentamiento y "Tus series"; antes v1.0.34: modo reloj detectado aunque el WebView no informe el táctil, ir al inicio sin terminar la sesión en el reloj; antes v1.0.33: arreglo del bucle de recargas y sin ubicación en la web; antes v1.0.32: Fases 1-4 de la app pública: bienvenida y rutinas por objetivo, entrenador inteligente, Android 16 y Billing 8, legales, logros, amigos y modo entrenador). Versión web: workflow `.github/workflows/web.yml` publica `www/` en GitHub Pages en cada push a `main` (https://edlop16-dotcom.github.io/cuaderno-hierro/); requiere activar Pages → Source: GitHub Actions y agregar ese origen al cliente OAuth web de Google para entrar con Google.

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
- Orden de scripts: library.js, icons.js, (inline en index.html), coach.js, media.js, native.js, skin.js, config.js, sync.js, undo.js, layout.js, session.js, stats.js, safety.js, imports.js, rir.js, body.js, warm.js, mmap.js, swap.js, ready.js, nutri.js, share.js, meso.js, level.js, play.js, ai.js, web.js, plan2.js, burn.js, routines.js, keep.js, exview.js, picker.js, daydel.js, navord.js, habalarm.js, pulse.js, health.js, sleep.js, train2.js, watch2.js, legal.js, polish.js, pub.js, smart.js, store.js, social.js, daydetail.js. Un archivo nuevo va al final (legal.js va antes de polish.js porque lo usa la bienvenida).
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
