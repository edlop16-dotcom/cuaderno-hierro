/* ==========================================================================
   Textos legales de Forja (una sola fuente para la app y la web)
   - Política de privacidad conforme a la Ley N.º 29733 de Protección de Datos Personales (Perú)
     y su Reglamento, y a los requisitos de Google Play.
   - Términos de uso.
   Antes de publicar: completar LEGAL.owner y LEGAL.contact.
   ========================================================================== */
var LEGAL = {
  v: '2026-10-13',
  date: '13 de octubre de 2026',
  owner: '[NOMBRE DEL TITULAR]',
  contact: '[CORREO DE CONTACTO]',
  minAge: 14,
};
LEGAL.privacy = '<p class="muted">Última actualización: ' + LEGAL.date + '</p>'
  + '<h4>1. Quién es responsable de tus datos</h4>'
  + '<p>El titular del banco de datos personales de Forja es <b>' + LEGAL.owner + '</b>, desarrollador de la app. Puedes escribirnos a <b>' + LEGAL.contact + '</b> para cualquier consulta sobre tus datos.</p>'
  + '<h4>2. Qué datos tratamos</h4><ul>'
  + '<li><b>Cuenta (opcional):</b> correo electrónico e identificador de usuario.</li>'
  + '<li><b>Perfil:</b> nombre, edad, sexo, estatura, peso, objetivo, experiencia, días y equipo para entrenar.</li>'
  + '<li><b>Datos de salud (datos sensibles):</b> respuestas del cuestionario de salud, molestias o lesiones que marques, peso y medidas corporales, pulso, pasos y horas de sueño.</li>'
  + '<li><b>Entrenamiento y hábitos:</b> rutinas, series, pesos, repeticiones, notas, cardio, agua, proteína y hábitos que marcas.</li>'
  + '<li><b>Ubicación del gimnasio:</b> solo si tocas "guardar ubicación", guardamos las coordenadas de tu gimnasio para elegirlo solo al abrir la app. No seguimos tu ubicación.</li>'
  + '<li><b>Sueño estimado con el celular:</b> si das "Acceso a datos de uso", la app lee en tu teléfono a qué hora se apagó y encendió la pantalla. Solo se guarda el resultado (hora de dormir, de despertar y minutos).</li>'
  + '<li><b>Fotos de progreso:</b> se guardan <b>solo en tu teléfono</b> y nunca se suben a internet.</li>'
  + '<li><b>Reportes de errores (opcional):</b> mensaje del error, versión de la app y tipo de equipo, sin tu nombre ni tu correo.</li>'
  + '<li><b>Suscripción Pro:</b> el estado de tu suscripción. El pago lo procesa Google Play; no recibimos tus datos de pago.</li></ul>'
  + '<h4>3. Para qué los usamos</h4>'
  + '<p>Solo para que la app funcione: armar y ajustar tu plan, mostrar tu progreso, calcular sugerencias, recordatorios y calorías, y sincronizar tus equipos. <b>No vendemos tus datos, no mostramos publicidad, no usamos analítica de terceros y no los usamos para fines comerciales.</b></p>'
  + '<h4>4. Tu consentimiento</h4>'
  + '<p>Tratamos tus datos con tu consentimiento libre, previo, expreso e informado. Para los datos de salud, que son sensibles, te pedimos tu consentimiento expreso al configurar la app. Puedes revocarlo cuando quieras eliminando tus datos o tu cuenta; desde ese momento dejamos de tratarlos.</p>'
  + '<h4>5. Dónde se guardan y quién los procesa</h4>'
  + '<p>Sin cuenta, todo queda solo en tu teléfono. Si creas una cuenta, tus datos (excepto las fotos) se guardan en <b>Google Firebase</b> (Firestore y Firebase Authentication), que actúa como encargado del tratamiento con servidores fuera del Perú, por ejemplo en Estados Unidos. Al crear tu cuenta aceptas esta transferencia internacional, necesaria para sincronizar tu información. Los datos viajan cifrados (HTTPS) y cada cuenta solo puede leer sus propios datos.</p>'
  + '<p>Si conectas Health Connect o Samsung Health, la app lee esos datos dentro de tu teléfono y solo guarda los resúmenes que ves (sueño, peso, pasos, pulso en reposo).</p>'
  + '<h4>6. Cuánto tiempo los guardamos</h4>'
  + '<p>Mientras tengas tu cuenta. Si la eliminas, borramos de inmediato tu cuenta y tus datos en la nube. Los reportes de errores se borran a los 90 días.</p>'
  + '<h4>7. Tus derechos</h4>'
  + '<p>Tienes derecho de <b>acceso, rectificación, cancelación y oposición</b> (derechos ARCO), y a revocar tu consentimiento. Puedes ejercerlos tú mismo en la app: ver y editar tus datos, exportar un respaldo, borrar los datos del teléfono o <b>eliminar tu cuenta y todos sus datos</b> en Ajustes → Privacidad y datos. También puedes escribirnos a ' + LEGAL.contact + '; responderemos dentro de los plazos de ley. Si no estás conforme con la respuesta, puedes presentar un reclamo ante la Autoridad Nacional de Protección de Datos Personales del Ministerio de Justicia y Derechos Humanos.</p>'
  + '<h4>8. Menores de edad</h4>'
  + '<p>Forja es para personas de ' + LEGAL.minAge + ' años o más. Si tienes entre ' + LEGAL.minAge + ' y 17 años, úsala con la guía de tu madre, padre, tutor o un entrenador. A los menores no les mostramos dietas ni calorías. Si sabes que un menor de ' + LEGAL.minAge + ' años nos dio sus datos, escríbenos y los eliminaremos.</p>'
  + '<h4>9. Cambios</h4>'
  + '<p>Si cambiamos esta política te avisaremos en la app. La fecha de arriba indica la última versión.</p>';

LEGAL.terms = '<p class="muted">Última actualización: ' + LEGAL.date + '</p>'
  + '<h4>1. Qué es Forja</h4><p>Forja es una app para organizar tus entrenamientos, hábitos y progreso. Sus rutinas y sugerencias son orientativas y se generan con reglas generales de entrenamiento.</p>'
  + '<h4>2. No es un servicio médico</h4><p>Forja no diagnostica ni trata enfermedades y no reemplaza a un médico, nutricionista o fisioterapeuta. Consulta a un profesional antes de empezar si tienes alguna condición de salud, estás embarazada o respondiste que sí en el cuestionario de salud. Si sientes dolor en el pecho, mareo, falta de aire anormal o dolor en una articulación, detente y busca ayuda.</p>'
  + '<h4>3. Tu responsabilidad</h4><p>Entrenas bajo tu propia responsabilidad: usa pesos que puedas controlar, aprende la técnica y respeta tus límites. Eres responsable de la información que registras y de cuidar el acceso a tu cuenta.</p>'
  + '<h4>4. Forja Pro</h4><p>Algunas funciones pueden requerir una suscripción. El cobro, la renovación automática, los reembolsos y la cancelación los gestiona Google Play según sus condiciones. Puedes cancelar en Play Store → Pagos y suscripciones; la suscripción sigue activa hasta el final del periodo pagado.</p>'
  + '<h4>5. Contenido</h4><p>Las fotos de ejercicios provienen de Free Exercise DB (dominio público). Tus datos son tuyos: puedes exportarlos o eliminarlos cuando quieras.</p>'
  + '<h4>6. Disponibilidad y cambios</h4><p>Trabajamos para que Forja funcione bien, pero puede tener fallas o cambios. Podemos actualizar estos términos; te avisaremos en la app.</p>'
  + '<h4>7. Limitación de responsabilidad</h4><p>En la medida que lo permita la ley, Forja no responde por lesiones o daños derivados de un uso contrario a estos términos o a las recomendaciones de seguridad.</p>'
  + '<h4>8. Ley aplicable y contacto</h4><p>Estos términos se rigen por las leyes del Perú. Contacto: ' + LEGAL.contact + '.</p>';
