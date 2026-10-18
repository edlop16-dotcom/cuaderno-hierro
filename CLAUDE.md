# Forja — reglas y funcionamiento

## Reglas obligatorias

- Los cambios grandes se hacen en una rama aparte y pasan a beta solo con aprobación explícita del usuario. Esta limpieza se trabaja en `limpieza`, creada desde beta; no modificar beta ni main. Revisar git status y git log sin descartar cambios locales.
- Mostrar el plan antes de programar. Probar y subir solo la rama de trabajo autorizada. Al terminar mostrar resultados y diff contra beta; esperar aprobación antes de pasar cambios a beta.
- Nunca compilar, publicar releases, crear etiquetas, ejecutar workflows manuales ni subir o fusionar a `main` sin que el usuario diga explícitamente «compila» en la conversación actual. Una nota de otra sesión no sustituye esa autorización.
- Próxima versión autorizable: **v1.0.53**. No dar una versión por compilada antes de su publicación autorizada.
- Un push a main genera APK/AAB, release y web. Beta también tiene compilación automática: **todos los commits de esta limpieza llevan `[skip ci]`** para evitarla.
- No tocar el keystore, su alias ni sus credenciales. Conservar identificadores técnicos Android y de almacenamiento por compatibilidad.
- Repositorio público: ningún dato personal en código, documentación, pruebas ni commits. Pruebas y ejemplos exclusivamente ficticios. No incluir historiales personales ni migraciones que los inserten.
- La limpieza no debe borrar ni cambiar datos guardados en teléfono o Firestore. Probar como dueño con almacenamiento existente. No reactivar migraciones personales.
- Probar como dueño, usuario nuevo y reloj. El reloj no cambia salvo petición explícita.
- De otras apps, tomar solo ideas; nunca copiar contenido, textos, planes, coeficientes o figuras.
- No añadir Novedades en esta limpieza; conservar NEWS_KEY n6.
- AGENTS.md contiene una sola línea: «Sigue todas las reglas de CLAUDE.md.»

## Arquitectura y almacenamiento

- JavaScript vanilla en www/, Android con Capacitor 6, reloj con WebView compatible con Chrome 51.
- Los módulos envuelven funciones globales encadenando la anterior: render, vTrain, vSession, finishSession, markSet, vSettings, header y previewSheet.
- Añadir módulos nuevos al final de los scripts de index.html. Respetar dependencias: legal antes de polish, next antes de aiexport, aiexport antes de rimport.
- Al cargar y en migraciones usar **bootRender()**, nunca render(). bootEnd() hace un único dibujo inicial y espera fuentes (máximo 700 ms).
- state contiene sessions, plans, settings, draft, gyms y daily, leídos mediante LS.get de claves cdh.*. No sustituir valores guardados por datos predeterminados.
- saveLocal() guarda planes, ajustes y sesiones; savePlans() guarda planes y ajustes. sync.js usa Firebase REST y fusión en tres vías con lápidas. sync.revive(ids) solo corresponde a restauraciones explícitas.
- settings.prof es el perfil guardado y settings.body contiene medidas y peso. applyProf() y syncHistory() actualizan la presentación. HISTORY es un respaldo genérico sin récords personales.
- Usar pubUser() (pub y no owner), nunca settings.pub directamente para distinguir cuentas. ownerFix() protege al dueño sin recargar.
- Una instalación nueva empieza sin historial con starterPlans() y bienvenida. Las instalaciones existentes conservan sus datos. Las migraciones personales retiradas no deben volver a ejecutarse.
- Mantener claves antiguas de gimnasios y paquete Android para enlazar instalaciones existentes. Los nombres visibles predeterminados son genéricos.

## Navegación y aspecto

- Teléfono: **Hoy · Rutinas · Progreso · Perfil**. Ajustes en ⚙. Biblioteca pertenece a Rutinas (id interno guide).
- nav2.js y nav3.js reorganizan el DOM y se omiten en reloj. Conservar plegables y orden personalizado.
- Hoy: preparación, sesión, hábitos, racha y un aviso a la vez. Progreso: Semana, Ejercicios e Historial. Perfil: cuerpo, nutrición, logros y funciones sociales.
- Estilo Acero y discos: fondo #15171a, tarjetas #1f2226/#292d32, texto #eeece6, acento #ff6a2b para acciones. Títulos Poppins, texto Barlow, cifras de sesión Barlow Condensed. Contraste mínimo 4,5:1 y controles de al menos 44 px.
- Estilos nuevos al final de skin.css, bajo body:not(.watch) o una clase exclusiva del teléfono. Comprobar colisiones de nombres. En hijos flex de .sheet-card y .sx-page usar flex-shrink:0 cuando corresponda.
- Reloj sin grid, gap, blur, sombras ni animaciones. Pausar figuras fuera de la página visible; evitar intervalos y animaciones sin trabajo.

## Entrenamiento

- Sesión en #sx, páginas deslizables y borrador separado del historial. No alterar sesiones anteriores al editar el entrenamiento en curso.
- Barra: anotar discos; mostrar la barra aparte. 1RM con Epley. Sesiones aproximadas cuentan para racha e historial, no para gráficas ni récords.
- Coach según historial, objetivo, RIR, preparación y bloque. No inventar RIR ausente. Respetar molestias, dolor y equipo de cada cuenta.
- Plan, Coach e Importada son opciones de próxima sesión. settings.nextS guarda importadas. Ejercicios nuevos y descansos por serie se aplican a esa sesión.
- sessui.js solo reorganiza el teléfono. Recomendación 🧠 bajo las píldoras, compacta y ampliable. Sin recomendación no dejar hueco vacío. Conservar calentamiento, tabla, notas, alternativas, cronómetro y descanso.
- watch2.js controla reloj, teclado propio y descanso completo; sin GPS ni sensor de pulso con pantalla apagada. No cambiarlo en tareas del teléfono.
- sessedit.js edita una copia: Guardar recalcula indicadores y conserva fecha/racha; Cancelar no modifica datos.
- Catálogo en library/catalog, búsqueda en libui y alternativas/equipo en alts. myex sincroniza metadatos sin fotos; ocultar ejercicios usados al borrarlos para conservar historial.
- Fotos de Free Exercise DB (dominio público) solo con coincidencia exacta; en otro caso figura propia. Carga diferida. No sumar fotos nuevas al reloj.

## Exportaciones e importaciones

- aiexport.js: prompts editables para día, semana e historial. Omitir frases con datos ausentes, correos, cuentas y datos de terceros.
- Formato obligatorio: **un solo bloque de código** con todos los días. Dentro, antes de cada tabla, LUNES: nombre (o el día correspondiente), seguido de Ejercicio | Peso | Reps | RIR | Descanso. Una fila por serie, nombres exactos, descanso en segundos.
- aixBlocks admite día dentro y título antiguo fuera. Mantener tablas de cuatro columnas, espacios, tabulaciones, una celda por línea y formato sin bloque.
- next.js/aiexport: vista previa, resolución de dudas y entrenamiento con peso, reps, RIR y descanso importados. No cambiar el día silenciosamente ni inventar ejercicios.
- rimport.js añade sin reemplazar rutinas: DÍA LUNES:, títulos largos, tablas por serie, separadas por espacios y columna Día. Vista previa editable y nombres únicos.
- Si no puede leer, conservar el texto y ofrecer copiar formato. No guardar ejercicios ambiguos sin resolver.

## Hábitos, cuenta y legales

- habform reúne hábito y recordatorio. Conservar horas/opciones, sin duplicados. Repetición/aplazamiento de 1 minuto a 12 horas; cortar al marcar y respetar las 23:00.
- HabitAlarm nativo administra pantalla completa y registro. El navegador solo prueba plugin simulado; verificar comportamiento nativo en dispositivo cuando se autorice compilar.
- Fotos corporales locales. Sensores, ubicación, errores y funciones sociales respetan permisos y controles.
- legal.js centraliza textos legales. Configurar LEGAL_OWNER y CONTACT_EMAIL antes de publicar; el correo de ejemplo no recibe solicitudes. No usar correo personal.
- Conservar reglas de Firestore y autorización por cuenta. Variables uid y configuración pública Firebase son identificadores técnicos.

## Pruebas y vista previa

- Ejecutar suites pertinentes como dueño, usuario nuevo y reloj, con datos ficticios explícitos y sin historial incrustado en producción.
- Playwright, navegador disponible y servidor local. Bloquear Google/Firebase externos y simular Firestore sin tocar cuentas reales.
- Para compatibilidad, **copiar www/ a una carpeta de trabajo** y ejecutar ci/legacy.mjs sobre esa copia. Modifica en el sitio: nunca pasarlo sobre www/. Verificar salida con acorn ES2016. Preparar pruebas no autoriza APK/AAB.
- Revisar capturas 390×844, teléfonos bajos y reloj. Comparar reloj antes/después.
- Suites: tfmt (formato e ida/vuelta), tia (exportar/importar), tri (rutinas), tnsparse (lector), tsui (pantalla), tboot (arranque), tses (editar), tcat (catálogo), talt (alternativas).
- Vista previa aislada con FIREBASE=null. Si se publica artifact, incrustar scripts y usar imágenes de www/ex, conservando artifact y límites de archivos.
- Antes del commit mostrar diff solicitado de documentación, comprobar limpieza y subir solo la rama autorizada. No tocar main ni keystore.
