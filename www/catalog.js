/* ==========================================================================
   Catálogo ampliado de ejercicios (propio de Forja: nombres, textos y figuras).
   - Los ejercicios que ya existían no cambian de clave ni de nombre: aquí solo se les agrega
     su equipo (`eq`), patrón (`pat`), aislamiento (`iso`), unilateral (`uni`) y lo que necesitan (`req`).
   - Los nuevos solo se reconocen por su nombre exacto o un alias exacto (`al`): así un nombre de tu
     historial que ya emparejaba con un ejercicio sigue emparejando con el mismo.
   - Músculo principal (`zm`) y secundarios (`zs`) con las zonas del coach semanal (safety.js ZONES):
     el principal cuenta 1 serie y cada secundario ½, como siempre.
   - Figura: propia (`F`) o la de su patrón (`f` = ejercicio base) con el equipo dibujado encima.
   - libFind guarda en caché el resultado de cada nombre (se llama muchas veces al dibujar).
   ========================================================================== */

/* ---------- Equipo: tipo para los filtros y equipo concreto (se marca por gimnasio) ---------- */
const CAT_FAM = [['barra', 'Barra'], ['manc', 'Mancuernas'], ['kb', 'Kettlebell'], ['polea', 'Polea'], ['smith', 'Smith'], ['maq', 'Máquina'], ['cuerpo', 'Peso corporal'], ['banda', 'Bandas'], ['otros', 'Otros']];
const CAT_EQ = {
  barra: ['Barra olímpica', 'barra'], barraz: ['Barra Z', 'barra'], hexbar: ['Barra hexagonal', 'barra'], landmine: ['Landmine (barra en esquina)', 'barra'],
  manc: ['Mancuernas', 'manc'], kb: ['Kettlebell', 'kb'], disco: ['Discos', 'otros'],
  polea_alta: ['Polea alta', 'polea'], polea_baja: ['Polea baja', 'polea'], cruce: ['Cruce de poleas (doble polea)', 'polea'], jalon: ['Estación de jalón', 'polea'], remo_polea: ['Remo sentado en polea', 'polea'],
  smith: ['Smith (multipower)', 'smith'],
  prensa: ['Prensa 45°', 'maq'], prensa_h: ['Prensa horizontal', 'maq'], hack: ['Sentadilla hack', 'maq'], pendulo: ['Sentadilla péndulo', 'maq'], vsquat: ['Sentadilla V (V-squat)', 'maq'], beltsq: ['Belt squat (cinturón)', 'maq'],
  ext: ['Extensión de pierna', 'maq'], curl_tum: ['Curl femoral tumbado', 'maq'], curl_sen: ['Curl femoral sentado', 'maq'], curl_pie: ['Curl femoral de pie', 'maq'],
  abductor: ['Abductor', 'maq'], aductor: ['Aductor', 'maq'], ht_maq: ['Hip thrust en máquina', 'maq'], patada_maq: ['Patada de glúteo en máquina', 'maq'],
  gem_pie: ['Gemelos de pie', 'maq'], gem_sen: ['Gemelos sentado', 'maq'], gem_burro: ['Gemelos burro', 'maq'],
  press_pecho: ['Press de pecho', 'maq'], pecho_conv: ['Press de pecho convergente', 'maq'], press_incl: ['Press inclinado en máquina', 'maq'], press_decl: ['Press declinado en máquina', 'maq'], pecdeck: ['Pec deck / contractora', 'maq'],
  press_homb: ['Press de hombro', 'maq'], homb_conv: ['Press de hombro convergente', 'maq'], lat_maq: ['Laterales en máquina', 'maq'],
  remo_maq: ['Remo sentado en máquina', 'maq'], remo_conv: ['Remo convergente', 'maq'], remo_t: ['Remo en T con pecho apoyado', 'maq'], remo_alto: ['Remo alto en máquina', 'maq'],
  jalon_conv: ['Jalón convergente', 'maq'], pullover_maq: ['Pullover en máquina', 'maq'], encog_maq: ['Máquina de encogimientos', 'maq'], asistida: ['Dominadas y fondos asistidos', 'maq'],
  curl_maq: ['Curl de bíceps / Scott en máquina', 'maq'], tri_maq: ['Extensión de tríceps en máquina', 'maq'], fondos_maq: ['Fondos en máquina', 'maq'],
  crunch_maq: ['Crunch en máquina', 'maq'], rot_maq: ['Rotación de torso', 'maq'], lumbar_maq: ['Extensión lumbar', 'maq'],
  banco: ['Banco plano', 'otros'], banco_incl: ['Banco inclinable', 'otros'], banco_decl: ['Banco declinado', 'otros'], scott: ['Banco Scott', 'otros'],
  hiper45: ['Banco de hiperextensiones 45°', 'cuerpo'], ghd: ['Banco GHD (glúteo-femoral)', 'cuerpo'], silla_romana: ['Silla romana', 'cuerpo'], dominadas: ['Barra de dominadas', 'cuerpo'], paralelas: ['Paralelas', 'cuerpo'], cajon: ['Cajón o step', 'otros'],
  banda: ['Bandas elásticas', 'banda'], rueda: ['Rueda abdominal', 'otros'], trx: ['Suspensión (TRX)', 'otros'], fitball: ['Fitball', 'otros'], sliders: ['Discos deslizantes', 'otros'],
  rodillo: ['Rodillo de muñeca', 'otros'], trineo: ['Trineo', 'otros'], cuerdas: ['Cuerdas de batalla', 'otros'],
  cuerpo: ['Peso corporal', 'cuerpo'],
};
/* ---------- Músculos para filtrar y agrupar (principal) ---------- */
const CAT_MUS = [['pecho', 'Pecho'], ['esp', 'Espalda'], ['lumb', 'Espalda baja'], ['homb', 'Hombros'], ['bic', 'Bíceps'], ['tri', 'Tríceps'], ['ante', 'Antebrazos'], ['abd', 'Abdomen y core'],
  ['cuad', 'Cuádriceps'], ['isq', 'Isquiotibiales'], ['glu', 'Glúteos'], ['adu', 'Aductores'], ['pant', 'Pantorrillas'], ['full', 'Cuerpo completo']];
const CAT_ZONES = ['pecho', 'esp', 'lumb', 'homb', 'bic', 'tri', 'abd', 'cuad', 'isq', 'glu', 'pant'];

/* ---------- Patrones de movimiento: nombre, pasos y errores comunes (textos de Forja) ---------- */
const CAT_PT = {
  hpush: ['Empuje horizontal', ['Junta las escápulas y apoya bien los pies; la espalda baja conserva su curva natural.', 'Baja controlando (2-3 s) hasta rozar el pecho o hasta que los codos queden un poco por debajo del torso.', 'Empuja hasta casi estirar los brazos, sin bloquear los codos.'], ['Abrir los codos a 90° del cuerpo.', 'Rebotar el peso en el pecho.']],
  ipush: ['Empuje inclinado', ['Junta las escápulas y deja el pecho alto contra el respaldo.', 'Baja controlando hasta la parte alta del pecho, con los codos un poco por debajo de los hombros.', 'Empuja hacia arriba y un poco atrás, sin bloquear los codos.'], ['Despegar la espalda del respaldo.', 'Bajar al cuello en vez de al pecho alto.']],
  dpush: ['Empuje declinado', ['Asegura bien los pies o las piernas antes de quitar el peso.', 'Baja controlando hacia la parte baja del pecho.', 'Empuja hasta casi estirar los brazos.'], ['Rebotar el peso abajo.', 'Bajar demasiado rápido con la cabeza hacia abajo.']],
  fly: ['Aperturas', ['Codos un poco doblados y fijos en todo el recorrido.', 'Abre los brazos en arco hasta sentir el estiramiento del pecho, sin pasar de la línea de los hombros.', 'Cierra apretando el pecho como si abrazaras un barril.'], ['Doblar y estirar los codos: se vuelve un press.', 'Abrir de más y forzar el hombro.']],
  dip: ['Fondos', ['Hombros abajo y lejos de las orejas.', 'Baja doblando los codos hasta unos 90°.', 'Sube empujando hasta estirar los brazos.'], ['Bajar de más y forzar el hombro.', 'Encoger los hombros.']],
  pullover: ['Brazos rectos', ['Brazos casi rectos y codos fijos.', 'Lleva el agarre en arco apretando los dorsales.', 'Vuelve despacio hasta sentir el estiramiento.'], ['Doblar los codos y convertirlo en jalón o press.', 'Arquear la espalda baja.']],
  vpull: ['Jalón vertical', ['Hombros abajo y lejos de las orejas antes de jalar.', 'Lleva los codos hacia abajo y atrás hasta que el agarre llegue cerca del pecho.', 'Sube controlado hasta estirar los brazos sin soltar la tensión de la espalda.'], ['Balancear el cuerpo para subir.', 'Jalar con los brazos encogiendo los hombros.']],
  row: ['Remo', ['Espalda recta, pecho alto y abdomen firme.', 'Jala llevando los codos hacia atrás y junta las escápulas 1 s.', 'Vuelve despacio hasta estirar los brazos sin redondear la espalda.'], ['Tirar con impulso del torso.', 'Encoger los hombros hacia las orejas.']],
  shrug: ['Encogimiento', ['Brazos estirados y relajados; la cabeza neutra.', 'Sube los hombros hacia las orejas en línea recta y aprieta 1 s.', 'Baja despacio hasta estirar el trapecio.'], ['Girar los hombros en círculos.', 'Doblar los codos para ayudarte.']],
  vpush: ['Empuje vertical', ['Abdomen y glúteos firmes para no arquear la espalda.', 'Empuja hacia arriba hasta casi estirar los brazos, con el peso sobre la cabeza.', 'Baja controlado hasta la altura de la barbilla o de los hombros.'], ['Arquear la espalda baja para empujar.', 'Bajar solo a medias.']],
  lat: ['Elevación lateral', ['Codos un poco doblados y el torso quieto.', 'Sube los brazos hacia los lados hasta la altura de los hombros, guiando con los codos.', 'Baja en 2-3 s sin dejar caer el peso.'], ['Subir con impulso del cuerpo.', 'Subir los hombros hacia las orejas.']],
  front: ['Elevación frontal', ['Torso quieto y abdomen firme.', 'Sube el peso al frente hasta la altura de los ojos con los brazos casi rectos.', 'Baja despacio sin balancearte.'], ['Echar el cuerpo atrás para subir.', 'Subir más alto de la cabeza.']],
  rear: ['Deltoide posterior', ['Pecho fijo y cuello neutro.', 'Abre los brazos hacia atrás llevando los codos hacia afuera.', 'Aprieta un instante arriba y vuelve despacio.'], ['Juntar las escápulas en vez de mover el hombro.', 'Usar demasiado peso y balancearte.']],
  upright: ['Remo al mentón', ['Agarre a la anchura de los hombros o un poco más.', 'Sube el peso pegado al cuerpo llevando los codos hacia afuera, hasta la parte baja del pecho.', 'Baja controlado.'], ['Subir las manos más alto que los codos.', 'Agarre muy cerrado: molesta al hombro.']],
  rot: ['Manguito rotador', ['Codo pegado al costado y doblado a 90°.', 'Gira el antebrazo sin mover el codo.', 'Vuelve despacio.'], ['Despegar el codo del cuerpo.', 'Usar demasiado peso.']],
  curl: ['Curl', ['Codos pegados a los costados y quietos.', 'Sube doblando el codo hasta contraer el bíceps; aprieta 1 s.', 'Baja en 2-3 s hasta estirar el brazo.'], ['Balancear el cuerpo.', 'Adelantar los codos al subir.']],
  triext: ['Extensión de tríceps', ['Codos fijos: solo se mueve el antebrazo.', 'Estira el brazo por completo y aprieta el tríceps 1 s.', 'Vuelve despacio hasta unos 90° o hasta sentir el estiramiento.'], ['Abrir o mover los codos.', 'Ayudarte con el cuerpo.']],
  wrist: ['Muñeca', ['Antebrazos apoyados: solo se mueve la muñeca.', 'Sube el peso doblando la muñeca lo más que puedas.', 'Baja despacio hasta estirar.'], ['Levantar los antebrazos.', 'Mucho peso con un movimiento corto.']],
  grip: ['Agarre', ['Hombros activos, sin colgarte de las articulaciones.', 'Aprieta fuerte con toda la mano durante el tiempo indicado.', 'Suelta controlado.'], ['Soltar de golpe.', 'Encoger los hombros.']],
  squat: ['Sentadilla', ['Pies a la anchura de los hombros y el peso repartido en todo el pie.', 'Baja llevando la cadera atrás y abajo, rodillas en la línea de las puntas, hasta donde mantengas la espalda neutra.', 'Sube empujando el suelo y aprieta los glúteos arriba.'], ['Rodillas que se cierran hacia adentro.', 'Levantar los talones.', 'Redondear la espalda abajo.']],
  lunge: ['Unilateral de pierna', ['Paso largo y estable; el torso alto.', 'Baja hasta que la rodilla de atrás casi toque el suelo, con la de adelante sobre el pie.', 'Sube empujando con el talón de la pierna que trabaja.'], ['Rodilla de adelante hacia adentro.', 'Paso muy corto: la rodilla se pasa mucho de la punta.']],
  kext: ['Extensión de rodilla', ['Espalda pegada al respaldo y agarrado a las asas.', 'Estira las rodillas hasta casi bloquear y aprieta el cuádriceps 1 s.', 'Baja en 2-3 s sin que el peso choque.'], ['Despegar la cadera del asiento.', 'Dar patadas con impulso.']],
  kflex: ['Curl femoral', ['Cadera firme: no la levantes.', 'Lleva los talones hacia los glúteos y aprieta 1 s.', 'Estira despacio (2-3 s).'], ['Levantar la cadera.', 'Soltar el peso de golpe.']],
  hinge: ['Bisagra de cadera', ['Rodillas un poco dobladas, espalda recta y el peso cerca del cuerpo.', 'Lleva la cadera hacia atrás hasta sentir el estiramiento detrás del muslo.', 'Sube empujando la cadera adelante y aprieta los glúteos.'], ['Redondear la espalda.', 'Convertirlo en sentadilla.']],
  hipext: ['Extensión de cadera', ['Barbilla hacia el pecho y costillas abajo.', 'Empuja con los talones y sube la cadera hasta alinear rodillas, cadera y hombros; aprieta 1-2 s.', 'Baja controlado sin perder la tensión.'], ['Arquear la espalda baja arriba.', 'Empujar con la punta de los pies.']],
  abd: ['Abducción', ['Torso quieto: el movimiento sale de la cadera.', 'Abre la pierna hacia afuera y aprieta el glúteo medio 1 s.', 'Vuelve despacio sin que el peso choque.'], ['Balancear el torso.', 'Ir demasiado rápido.']],
  add: ['Aducción', ['Torso quieto y espalda apoyada.', 'Junta las piernas apretando la parte interna del muslo 1 s.', 'Abre despacio hasta un estiramiento cómodo.'], ['Abrir más de lo que controlas.', 'Rebotar al final.']],
  calf: ['Pantorrilla', ['La parte delantera del pie sobre el borde; rodillas firmes.', 'Baja los talones hasta sentir el estiramiento y haz una pausa de 1 s.', 'Sube lo más alto que puedas y aprieta 1 s.'], ['Rebotar abajo.', 'Recorrido corto.']],
  tib: ['Tibial', ['Talones apoyados y piernas firmes.', 'Sube las puntas de los pies lo más que puedas.', 'Baja despacio.'], ['Rebotar.', 'Doblar las rodillas para ayudarte.']],
  flex: ['Flexión de tronco', ['Costillas hacia la cadera y el cuello relajado.', 'Encoge el abdomen redondeando la espalda alta, sin jalar con los brazos.', 'Vuelve despacio sin descansar abajo.'], ['Jalar el cuello.', 'Usar impulso.']],
  legraise: ['Elevación de piernas', ['Espalda baja controlada y sin balanceo.', 'Sube las piernas o las rodillas enrollando la pelvis hacia arriba.', 'Baja despacio sin que se arquee la espalda.'], ['Balancearte.', 'Subir solo con la cadera, sin enrollar la pelvis.']],
  antiext: ['Estabilidad del core', ['Cuerpo en línea; glúteos y abdomen firmes.', 'Mantén la posición respirando corto, sin hundir la cadera.', 'Termina antes de perder la postura.'], ['Hundir la cadera.', 'Subir demasiado los glúteos.']],
  rotc: ['Rotación y oblicuos', ['Cadera estable: el giro o la inclinación sale del torso.', 'Haz el movimiento controlado con el abdomen firme.', 'Vuelve al centro despacio.'], ['Moverlo con los brazos solamente.', 'Ir rápido sin control.']],
  lumbar: ['Extensión lumbar', ['Cadera apoyada y espalda neutra.', 'Sube extendiendo la cadera y la espalda hasta quedar en línea recta.', 'Baja despacio.'], ['Echar la espalda de más arriba.', 'Hacerlo con impulso.']],
  carry: ['Cargar y caminar', ['Hombros abajo y el torso recto.', 'Camina con pasos cortos y firmes sin inclinarte.', 'Respira y mantén el abdomen firme.'], ['Inclinarte hacia un lado.', 'Encoger los hombros.']],
  full: ['Cuerpo completo', ['Empieza ligero hasta dominar la técnica.', 'Haz el movimiento de forma explosiva pero controlada, con la espalda neutra.', 'Recibe el peso con las rodillas suaves y vuelve a la posición inicial.'], ['Jalar con los brazos antes de extender la cadera.', 'Redondear la espalda.']],
  sled: ['Trineo', ['Cuerpo inclinado y brazos firmes.', 'Empuja o jala con pasos cortos y potentes.', 'Mantén la espalda neutra todo el recorrido.'], ['Pasos largos que te desequilibran.', 'Redondear la espalda.']],
  cardio: ['Acondicionamiento', ['Postura firme y respiración constante.', 'Mantén el ritmo durante el tiempo indicado.', 'Descansa lo justo y repite.'], ['Perder la técnica por ir más rápido.']],
  balance: ['Equilibrio', ['Mira un punto fijo.', 'Mantén la posición sin apoyarte.', 'Cambia de lado.'], ['Bloquear la rodilla de apoyo.']],
};
const CAT_TYPE = { hpush: 'Empuje', ipush: 'Empuje', dpush: 'Empuje', fly: 'Empuje', dip: 'Empuje', vpush: 'Empuje', lat: 'Empuje', front: 'Empuje', triext: 'Empuje',
  pullover: 'Tracción', vpull: 'Tracción', row: 'Tracción', shrug: 'Tracción', rear: 'Tracción', upright: 'Tracción', rot: 'Tracción', curl: 'Tracción', wrist: 'Tracción', grip: 'Tracción', lumbar: 'Tracción',
  squat: 'Piernas', lunge: 'Piernas', kext: 'Piernas', kflex: 'Piernas', hinge: 'Piernas', hipext: 'Piernas', abd: 'Piernas', add: 'Piernas', calf: 'Piernas', tib: 'Piernas', sled: 'Piernas',
  flex: 'Core', legraise: 'Core', antiext: 'Core', rotc: 'Core', carry: 'Core', full: 'Core', cardio: 'Core', balance: 'Core' };
const CAT_GROUP = { pecho: 'Pecho', esp: 'Espalda', lumb: 'Espalda', homb: 'Hombros', bic: 'Brazos', tri: 'Brazos', ante: 'Brazos', cuad: 'Piernas', isq: 'Piernas', pant: 'Piernas', adu: 'Piernas', glu: 'Glúteos', abd: 'Core' };

/* ---------- Los que ya existían: equipo, patrón, banderas (i = aislamiento, u = unilateral) y lo que necesitan ---------- */
const CAT_META = {
  prensa: 'prensa squat', hack: 'hack squat', hipthrust: 'barra hipext - banco', incline: 'barra ipush - banco_incl', rowcable: 'remo_polea row', rowlow: 'remo_polea row',
  legext: 'ext kext i', bench: 'barra hpush - banco', pulldown: 'jalon vpull', lateral: 'manc lat i', curl: 'manc curl i', triceps: 'polea_alta triext i', bbrow: 'barra row',
  abduct: 'abductor abd i', ohp: 'manc vpush - banco', facepull: 'polea_alta rear i', legcurl: 'curl_tum kflex i', rdl: 'barra hinge',
  dbbench: 'manc hpush - banco', dbincline: 'manc ipush - banco_incl', dbfly: 'manc fly i banco', cablecross: 'cruce fly i', pecdeck: 'pecdeck fly i', dips: 'paralelas dip', pushup: 'cuerpo hpush',
  chestpress: 'press_pecho hpush', pullup: 'dominadas vpull', dbrow: 'manc row u banco', trow: 'landmine row', cablepullover: 'polea_alta pullover i', deadlift: 'barra hinge', hyperext: 'hiper45 lumbar',
  bbohp: 'barra vpush', frontraise: 'manc front i', reardelt: 'manc rear i', shrug: 'manc shrug i', arnold: 'manc vpush - banco', hammer: 'manc curl i', bbcurl: 'barra curl i',
  preacher: 'barraz curl i scott', concentration: 'manc curl iu banco', skull: 'barraz triext i banco', ohtri: 'manc triext i banco', benchdip: 'cuerpo dip - banco', ropepush: 'polea_alta triext i',
  squat: 'barra squat', goblet: 'manc squat', bulgarian: 'manc lunge u banco', lunge: 'manc lunge u', seatedlegcurl: 'curl_sen kflex i', calfstand: 'gem_pie calf i', calfseat: 'gem_sen calf i',
  adduct: 'aductor add i', cablekick: 'polea_baja hipext iu', glutebridge: 'cuerpo hipext', plank: 'cuerpo antiext', crunch: 'cuerpo flex', hangraise: 'dominadas legraise',
  cablecrunch: 'polea_alta flex', abwheel: 'rueda antiext',
  bwsquat: 'cuerpo squat', jumpsquat: 'cuerpo squat', wallsit: 'cuerpo squat', stepup: 'cajon lunge u', slbridge: 'cuerpo hipext u', slrdl: 'manc hinge u', sitstand: 'cuerpo squat',
  kbswing: 'kb hinge', kneepush: 'cuerpo hpush', inclinepush: 'cuerpo hpush - banco', diamond: 'cuerpo hpush', pikepush: 'cuerpo vpush', invrow: 'cuerpo row - barra',
  superman: 'cuerpo lumbar', yraise: 'cuerpo rear i', deadbug: 'cuerpo antiext', legraise: 'cuerpo legraise', mountain: 'cuerpo cardio - - full', burpee: 'cuerpo cardio - - full',
  jumpjack: 'cuerpo cardio - - full', balance: 'cuerpo balance - - full', machshoulder: 'press_homb vpush', machrow: 'remo_maq row', smithsquat: 'smith squat',
};

/* ---------- Dibujo del equipo sobre la figura de su patrón ---------- */
const catHands = p => (p.rig === 'front' ? [p.handL, p.handR] : [p.hand]);
const catBarF = p => fL(fadd(p.handL, 180, 18), fadd(p.handR, 0, 18), 4) + fC(fadd(p.handL, 180, 18), 6) + fC(fadd(p.handR, 0, 18), 6);
const catBarS = p => (p.rig === 'front' ? catBarF(p) : fPlate(p.hand));
const catCable = to => p => (p.rig === 'front' ? fCable(p.handL, [16, to]) + fCable(p.handR, [184, to]) + fC(p.handL, 3.5) + fC(p.handR, 3.5) : fCable(p.hand, [171, to]) + fC(p.hand, 3.5));
const catPost = y => p => (p.rig === 'front' ? fL([12, 4], [12, 147], 6) + fL([188, 4], [188, 147], 6) : fPost(176) + fC([171, y], 4));
const catKb = h => fL(fadd(h, 90, 2), fadd(h, 90, 6), 3) + fC([h[0], h[1] + 11], 7);
const catBand = p => catHands(p).map(h => fL(h, [h[0], 141], 1.5, 'var(--accent2)')).join('');
const CAT_DRAW = {
  barra: catBarS, barraz: catBarS, hexbar: catBarS, smith: catBarS,
  landmine: p => fL(catHands(p)[0], [22, 140], 4) + fPlate(catHands(p)[0]),
  manc: p => catHands(p).map(h => fDumb(h, 0)).join(''),
  kb: p => catHands(p).map(catKb).join(''),
  disco: p => catHands(p).map(h => fC(h, 9) + fC(h, 2.5, 'var(--eq)')).join(''),
  polea_alta: catCable(8), cruce: catCable(8), polea_baja: catCable(134),
  banda: catBand,
  trx: p => catHands(p).map(h => fL(h, [44, 2], 1.5)).join(''),
};
const CAT_BACK = {
  polea_alta: catPost(8), cruce: catPost(8), polea_baja: catPost(134),
  smith: p => (p.rig === 'front' ? fL([40, 4], [40, 147], 2.5, 'var(--line)') + fL([160, 4], [160, 147], 2.5, 'var(--line)') : fL([p.hand[0], 4], [p.hand[0], 141], 2.5, 'var(--line)')),
};
/* Utilería de figuras propias */
const cfSeat = (x, y, back) => fFloor() + fSeat(x, y, back);
const cfIncl = () => fFloor() + fL([78, 116], [44, 72], 8) + fL([78, 120], [100, 120], 6) + fL([62, 112], [62, 140], 4);
const cfDecl = () => fFloor() + fL([104, 106], [36, 124], 6) + fL([60, 118], [60, 140], 4) + fL([100, 108], [100, 140], 4) + fC([142, 108], 5);
const cfProne = () => fFloor() + fL([110, 110], [64, 82], 7) + fL([92, 100], [92, 141], 4);
const cfWall = x => fL([x, 6], [x, 141], 6, 'var(--line)');
const cfFrontLegs = { tL: 94, sL: 90, tR: 86, sR: 90 };

/* ---------- Constructor de los nuevos ----------
   catC(clave, nombre, equipo, patrón, 'principal:sec1,sec2', 'Músculo 1|Músculo 2', 'alias 1|alias 2', opciones)
   opciones: s = cómo colocarte (1.er paso, propio de cada ejercicio), e = error extra, f = figura base (clave) o F = figura propia,
   fr/bk = dibujo extra delante/detrás, i/u/bw = aislamiento/unilateral/peso corporal, req = 'banco,...', bar = kg de la barra,
   reps/rest, g = grupo para mostrar (p. ej. 'full'). */
const CAT_ROWS = [];
function catC(key, name, eq, pat, z, musc, al, o) {
  o = o || {};
  const zz = z.split(':'), zm = zz[0], zs = zz[1] ? zz[1].split(',').filter(Boolean) : [];
  CAT_ROWS.push(Object.assign({ key, name, eq, pat, zm, zs, musc: musc.split('|'), al: al ? al.split('|') : [] }, o));
}

/* =========================== PECHO =========================== */
catC('smithbench', 'Press de Banca en Smith', 'smith', 'hpush', 'pecho:homb,tri', 'Pecho|Hombro frontal|Tríceps', 'press banca en smith|press de banca en multipower|press plano en smith|smith bench press', { f: 'bench', req: 'banco', s: 'Coloca el banco para que la barra del Smith baje a la mitad del pecho; agarre un poco más ancho que los hombros.' });
catC('widebench', 'Press Banca Agarre Ancho', 'barra', 'hpush', 'pecho:homb,tri', 'Pecho|Hombro frontal|Tríceps', 'press banca abierto|wide grip bench press|press de banca agarre ancho', { f: 'bench', req: 'banco', s: 'Agarre claramente más ancho que los hombros, sin pasar de lo que tus hombros toleren.', e: 'Abrir tanto el agarre que el hombro molesta.' });
catC('db1bench', 'Press Banca con Mancuerna a una Mano', 'manc', 'hpush', 'pecho:tri,abd', 'Pecho|Tríceps|Core', 'press a una mano con mancuerna|single arm dumbbell bench press|press unilateral en banco', { f: 'dbbench', u: 1, req: 'banco', s: 'Una sola mancuerna; la otra mano sujeta el banco y el abdomen evita que gires.' });
catC('dbneutral', 'Press de Banca Agarre Neutro con Mancuernas', 'manc', 'hpush', 'pecho:tri,homb', 'Pecho|Tríceps|Hombro frontal', 'press neutro con mancuernas|press martillo con mancuernas|neutral grip dumbbell press', { f: 'dbbench', req: 'banco', s: 'Palmas mirándose entre sí y codos cerca del cuerpo, a unos 30°.' });
catC('floorpress', 'Press en el Suelo con Mancuernas', 'manc', 'hpush', 'pecho:tri', 'Pecho|Tríceps', 'floor press|press en el piso|press en suelo', { s: 'Acostado en el suelo con las rodillas dobladas; los codos se detienen al tocar el piso.',
  F: { k: -1, e: 1, hi: ['torso', 'uarm'], A: { hip: [100, 132], torso: 180, ankle: [134, 138], hand: [58, 84], foot: 0 }, B: { hip: [100, 132], torso: 180, ankle: [134, 138], hand: [62, 118], foot: 0 }, back: () => fFloor(), front: p => fDumb(p.hand, 0) } });
catC('kbfloor', 'Press en el Suelo con Kettlebell', 'kb', 'hpush', 'pecho:tri', 'Pecho|Tríceps', 'kettlebell floor press|press en el piso con kettlebell', { f: 'floorpress', s: 'Acostado en el suelo con la kettlebell apoyada en el antebrazo y la muñeca recta.' });
catC('svend', 'Press Svend con Disco', 'disco', 'hpush', 'pecho:homb', 'Pecho|Hombro frontal', 'svend press|press con disco', { i: 1, s: 'De pie, aprieta un disco entre las palmas a la altura del pecho.',
  F: { k: -1, e: 1, hi: ['torso', 'uarm'], A: { hip: [95, 68], torso: -90, ankle: [98, 141], hand: [112, 40], foot: 0 }, B: { hip: [95, 68], torso: -90, ankle: [98, 141], hand: [142, 38], foot: 0 }, back: () => fFloor(), front: p => fC(p.hand, 9) + fC(p.hand, 2.5, 'var(--eq)') } });
catC('cablepress', 'Press de Pecho en Polea de Pie', 'cruce', 'hpush', 'pecho:homb,tri', 'Pecho|Hombro frontal|Tríceps', 'press en polea de pie|cable chest press|press de pie en poleas', { s: 'Poleas a la altura del pecho, un pie adelantado y los manerales junto al pecho.',
  F: { k: -1, e: 1, hi: ['torso', 'uarm'], A: { hip: [92, 70], torso: -86, ankle: [98, 141], hand: [112, 36], foot: 0 }, B: { hip: [92, 70], torso: -86, ankle: [98, 141], hand: [143, 30], foot: 0 },
    back: () => fFloor() + fL([14, 4], [14, 141], 6) + fC([20, 34], 4), front: p => fCable(p.hand, [20, 34]) + fC(p.hand, 4) } });
catC('seatcablepress', 'Press de Pecho Sentado en Polea', 'cruce', 'hpush', 'pecho:tri', 'Pecho|Tríceps|Hombro frontal', 'press sentado en poleas|seated cable chest press', { f: 'chestpress', req: 'banco', s: 'Banco en medio de las poleas, poleas a la altura del pecho y la espalda apoyada.', fr: p => fCable(p.hand, [20, p.hand[1]]) + fC(p.hand, 4) });
catC('pechoconv', 'Press de Pecho en Máquina Convergente', 'pecho_conv', 'hpush', 'pecho:tri,homb', 'Pecho|Tríceps|Hombro frontal', 'press convergente|press de pecho convergente|converging chest press|press hammer de pecho', { f: 'chestpress', s: 'Ajusta el asiento para que los agarres queden a la altura de la mitad del pecho.' });
catC('machincline', 'Press Inclinado en Máquina', 'press_incl', 'ipush', 'pecho:homb,tri', 'Pecho superior|Hombro frontal|Tríceps', 'press inclinado maquina|press superior en maquina|incline machine press', { s: 'Asiento a una altura en la que los agarres salgan desde la parte alta del pecho.',
  F: { k: -1, e: 1, hi: ['torso', 'uarm'], A: { hip: [76, 112], torso: -110, ankle: [112, 140], hand: [84, 62], foot: 0 }, B: { hip: [76, 112], torso: -110, ankle: [112, 140], hand: [98, 38], foot: 0 },
    back: () => fFloor() + fL([60, 118], [96, 118], 6) + fL([78, 118], [78, 140], 4) + fL([62, 114], [46, 72], 8), front: p => fBar(p.hand, 90, 16, 4) } });
catC('inclconv', 'Press Inclinado en Máquina Convergente', 'pecho_conv', 'ipush', 'pecho:homb,tri', 'Pecho superior|Hombro frontal|Tríceps', 'press inclinado convergente|incline converging press', { f: 'machincline', s: 'Asiento bajo para que el empuje vaya hacia arriba y adelante, al pecho alto.' });
catC('smithincline', 'Press Inclinado en Smith', 'smith', 'ipush', 'pecho:homb,tri', 'Pecho superior|Hombro frontal|Tríceps', 'press inclinado en multipower|incline smith press', { f: 'incline', req: 'banco_incl', s: 'Banco a 30-45° colocado para que la barra baje a la parte alta del pecho.' });
catC('dbinclneutral', 'Press Inclinado Agarre Neutro con Mancuernas', 'manc', 'ipush', 'pecho:tri,homb', 'Pecho superior|Tríceps|Hombro frontal', 'press inclinado neutro|incline neutral grip dumbbell press', { f: 'dbincline', req: 'banco_incl', s: 'Banco a 30-45°, palmas mirándose entre sí y codos cerca del cuerpo.' });
catC('cableincline', 'Press Inclinado en Polea', 'polea_baja', 'ipush', 'pecho:homb,tri', 'Pecho superior|Hombro frontal|Tríceps', 'press inclinado con cable|incline cable press', { f: 'dbincline', req: 'banco_incl', s: 'Banco inclinado entre dos poleas bajas; empuja los manerales hacia arriba como un press inclinado.' });
catC('declbench', 'Press Banca Declinado (Barra)', 'barra', 'dpush', 'pecho:tri,homb', 'Pecho bajo|Tríceps|Hombro frontal', 'press declinado|press declinado con barra|decline bench press', { req: 'banco_decl', s: 'Engancha bien los pies en el banco declinado; la barra baja a la parte baja del pecho.',
  F: { k: -1, e: 1, hi: ['torso', 'uarm'], A: { hip: [100, 100], torso: 165, ankle: [138, 116], hand: [60, 64], foot: -60 }, B: { hip: [100, 100], torso: 165, ankle: [138, 116], hand: [66, 102], foot: -60 }, back: cfDecl, front: p => fPlate(p.hand) } });
catC('dbdecline', 'Press Declinado con Mancuernas', 'manc', 'dpush', 'pecho:tri,homb', 'Pecho bajo|Tríceps|Hombro frontal', 'decline dumbbell press|press declinado mancuernas', { f: 'declbench', req: 'banco_decl', s: 'En el banco declinado, sube las mancuernas sobre la parte baja del pecho.' });
catC('smithdecline', 'Press Declinado en Smith', 'smith', 'dpush', 'pecho:tri,homb', 'Pecho bajo|Tríceps|Hombro frontal', 'press declinado en multipower|decline smith press', { f: 'declbench', req: 'banco_decl', s: 'Banco declinado colocado para que la barra baje a la parte baja del pecho.' });
catC('machdecline', 'Press Declinado en Máquina', 'press_decl', 'dpush', 'pecho:tri,homb', 'Pecho bajo|Tríceps|Hombro frontal', 'press declinado maquina|press de pecho bajo en maquina|decline machine press', { s: 'Ajusta el asiento para que los agarres queden a la altura de la parte baja del pecho; empuja hacia abajo y adelante.',
  F: { k: -1, e: 1, hi: ['torso', 'uarm'], A: { hip: [76, 112], torso: -95, ankle: [112, 140], hand: [92, 80], foot: 0 }, B: { hip: [76, 112], torso: -95, ankle: [112, 140], hand: [116, 92], foot: 0 }, back: () => cfSeat(78, 118), front: p => fBar(p.hand, 90, 16, 4) } });
catC('dbinclinefly', 'Aperturas Inclinadas con Mancuernas', 'manc', 'fly', 'pecho:homb', 'Pecho superior|Hombro frontal', 'aperturas inclinadas|incline dumbbell fly|aperturas en banco inclinado', { i: 1, req: 'banco_incl', s: 'Banco a 30°; mancuernas sobre el pecho alto con las palmas mirándose.',
  F: { k: -1, e: -1, hi: ['torso'], A: { hip: [80, 110], torso: -150, ankle: [118, 140], hand: [50, 40], foot: 0 }, B: { hip: [80, 110], torso: -150, ankle: [118, 140], hand: [30, 112], foot: 0 }, back: cfIncl, front: p => fDumb(p.hand, 0) } });
catC('dbdeclfly', 'Aperturas Declinadas con Mancuernas', 'manc', 'fly', 'pecho:homb', 'Pecho bajo|Pecho', 'decline dumbbell fly|aperturas declinadas', { i: 1, req: 'banco_decl', s: 'En el banco declinado, mancuernas sobre el pecho con los codos un poco doblados.',
  F: { k: -1, e: -1, hi: ['torso'], A: { hip: [100, 100], torso: 165, ankle: [138, 116], hand: [60, 64], foot: -60 }, B: { hip: [100, 100], torso: 165, ankle: [138, 116], hand: [44, 116], foot: -60 }, back: cfDecl, front: p => fDumb(p.hand, 0) } });
catC('crosshl', 'Cruce de Poleas de Alto a Bajo', 'cruce', 'fly', 'pecho:homb', 'Pecho bajo|Pecho', 'cruce alto a bajo|crossover alto|high to low cable fly', { i: 1, f: 'cablecross', s: 'Poleas arriba, un pie adelantado; los manerales bajan en arco hasta juntarse frente a la cadera.' });
catC('crosslh', 'Cruce de Poleas de Bajo a Alto', 'cruce', 'fly', 'pecho:homb', 'Pecho superior|Hombro frontal', 'cruce bajo a alto|crossover bajo|low to high cable fly', { i: 1, s: 'Poleas abajo; sube los manerales en arco hasta juntarlos a la altura de la barbilla.',
  F: { rig: 'front', hi: ['torso'], A: Object.assign({ hip: [100, 74], uL: 130, fL: 125, uR: 50, fR: 55 }, cfFrontLegs), B: Object.assign({ hip: [100, 74], uL: -25, fL: -45, uR: -155, fR: -135 }, cfFrontLegs),
    back: () => fFloor(147) + fL([12, 4], [12, 147], 6) + fL([188, 4], [188, 147], 6) + fC([16, 140], 4) + fC([184, 140], 4), front: p => fCable(p.handL, [16, 140]) + fCable(p.handR, [184, 140]) + fC(p.handL, 4) + fC(p.handR, 4) } });
catC('inclcablefly', 'Aperturas Inclinadas en Polea', 'polea_baja', 'fly', 'pecho:homb', 'Pecho superior|Hombro frontal', 'aperturas inclinadas con cable|incline cable fly', { i: 1, f: 'dbinclinefly', req: 'banco_incl', s: 'Banco inclinado entre dos poleas bajas; abre y cierra en arco sobre el pecho alto.' });
catC('cableflybench', 'Aperturas en Polea Tumbado', 'polea_baja', 'fly', 'pecho:homb', 'Pecho|Hombro frontal', 'aperturas con cable acostado|cable fly en banco|lying cable fly', { i: 1, f: 'dbfly', req: 'banco', s: 'Banco plano entre dos poleas bajas; los manerales suben en arco hasta juntarse sobre el pecho.' });
catC('cablefly1', 'Apertura en Polea a una Mano', 'cruce', 'fly', 'pecho:homb', 'Pecho|Hombro frontal', 'apertura unilateral en polea|single arm cable fly', { i: 1, u: 1, f: 'cablecross', s: 'De lado a la polea, lleva el maneral en arco hasta cruzar un poco la línea del cuerpo.' });
catC('bandfly', 'Aperturas con Banda', 'banda', 'fly', 'pecho:homb', 'Pecho|Hombro frontal', 'aperturas con liga|band chest fly', { i: 1, f: 'cablecross', s: 'Banda anclada detrás de ti a la altura del pecho; cierra los brazos en arco al frente.' });
catC('bandpress', 'Press de Pecho con Banda', 'banda', 'hpush', 'pecho:tri', 'Pecho|Tríceps', 'press con liga|band chest press', { f: 'cablepress', s: 'Banda por detrás de la espalda o anclada atrás; empuja al frente a la altura del pecho.' });
catC('widepush', 'Flexiones Agarre Abierto', 'cuerpo', 'hpush', 'pecho:homb,tri', 'Pecho|Hombro frontal|Tríceps', 'flexiones abiertas|wide push up|lagartijas abiertas', { bw: 1, f: 'pushup', s: 'Manos más abiertas que los hombros y el cuerpo en línea.' });
catC('declpush', 'Flexiones con Pies Elevados', 'cuerpo', 'ipush', 'pecho:homb,tri', 'Pecho superior|Hombro frontal|Tríceps', 'flexiones declinadas|decline push up|flexiones pies en banco', { bw: 1, req: 'banco', s: 'Pies sobre un banco o cajón, manos al ancho de los hombros y el cuerpo en línea.',
  F: { k: 1, e: -1, hi: ['torso', 'uarm'], A: { hip: [104, 96], torso: -173, ankle: [176, 102], hand: [61, 140], foot: 100 }, B: { hip: [104, 112], torso: -160, ankle: [176, 102], hand: [61, 140], foot: 100 }, back: () => fFloor() + fR(152, 104, 36, 37) } });
catC('bandpush', 'Flexiones con Banda', 'banda', 'hpush', 'pecho:tri', 'Pecho|Tríceps|Core', 'flexiones con liga|banded push up', { f: 'pushup', s: 'Banda por la espalda sujeta bajo cada mano; haz la flexión con el cuerpo en línea.', fr: p => fL(p.hand, p.sh, 1.5, 'var(--accent2)') });
catC('trxpush', 'Flexiones en Suspensión (TRX)', 'trx', 'hpush', 'pecho:abd,tri', 'Pecho|Core|Tríceps', 'flexiones en trx|trx push up|flexiones en anillas', { bw: 1, f: 'pushup', s: 'Manos en las asas de la suspensión; cuanto más horizontal, más difícil.' });
catC('weightdip', 'Fondos en Paralelas Lastrados', 'paralelas', 'dip', 'pecho:tri,homb', 'Pecho bajo|Tríceps|Hombro frontal', 'fondos con peso|weighted dips|fondos lastrados', { f: 'dips', s: 'Cinturón con disco o mancuerna entre los pies; inclínate un poco adelante.', fr: p => fC([p.hip[0], p.hip[1] + 16], 8) });
catC('assistdip', 'Fondos Asistidos en Máquina', 'asistida', 'dip', 'pecho:tri,homb', 'Pecho bajo|Tríceps|Hombro frontal', 'fondos asistidos|assisted dip', { f: 'dips', s: 'Rodillas sobre la plataforma: más peso = más ayuda.' });
catC('dbpullover', 'Pullover con Mancuerna', 'manc', 'pullover', 'pecho:esp,tri', 'Pecho|Dorsales|Tríceps', 'pull over|pullover mancuerna|dumbbell pullover', { i: 1, req: 'banco', s: 'Acostado en el banco, sujeta una mancuerna con las dos manos sobre el pecho.',
  F: { k: -1, e: -1, hi: ['torso', 'uarm'], A: { hip: [100, 106], torso: 180, ankle: [142, 140], hand: [58, 58], foot: 0 }, B: { hip: [100, 106], torso: 180, ankle: [142, 140], hand: [12, 112], foot: 0 }, back: () => fFloor() + fBench(30, 112), front: p => fDumb(p.hand, 90) } });
catC('bbpullover', 'Pullover con Barra', 'barra', 'pullover', 'pecho:esp', 'Pecho|Dorsales', 'barbell pullover|pullover barra', { i: 1, f: 'dbpullover', req: 'banco', s: 'Acostado en el banco, barra sobre el pecho con agarre a la anchura de los hombros.' });

/* =========================== ESPALDA =========================== */
catC('widepull', 'Dominadas Agarre Ancho', 'dominadas', 'vpull', 'esp:bic', 'Dorsales|Bíceps|Espalda alta', 'wide grip pull up|dominadas abiertas', { bw: 1, f: 'pullup', s: 'Agarre prono más ancho que los hombros.' });
catC('chinup', 'Dominadas Supinas', 'dominadas', 'vpull', 'esp:bic', 'Dorsales|Bíceps|Espalda media', 'chin up|chin-up|dominadas agarre supino|dominada supina', { bw: 1, f: 'pullup', s: 'Palmas hacia ti, a la anchura de los hombros.' });
catC('neutralpull', 'Dominadas Agarre Neutro', 'dominadas', 'vpull', 'esp:bic', 'Dorsales|Bíceps|Braquial', 'dominadas neutras|neutral grip pull up|dominadas martillo', { bw: 1, f: 'pullup', s: 'Agarres paralelos, palmas mirándose.' });
catC('assistpull', 'Dominadas Asistidas en Máquina', 'asistida', 'vpull', 'esp:bic', 'Dorsales|Bíceps', 'dominadas asistidas|assisted pull up|maquina de dominadas asistidas', { f: 'pullup', s: 'Rodillas sobre la plataforma: más peso = más ayuda. Anota el peso de ayuda.' });
catC('bandpull', 'Dominadas con Banda', 'banda', 'vpull', 'esp:bic', 'Dorsales|Bíceps', 'dominadas asistidas con banda|dominadas con liga|band assisted pull up', { bw: 1, req: 'dominadas', f: 'pullup', s: 'Banda atada a la barra y bajo una rodilla o los pies para que te ayude.', fr: p => fL([100, 8], p.ankleL, 1.5, 'var(--accent2)') });
catC('weightpull', 'Dominadas Lastradas', 'dominadas', 'vpull', 'esp:bic', 'Dorsales|Bíceps|Espalda alta', 'dominadas con peso|weighted pull up|dominadas con lastre', { f: 'pullup', s: 'Cinturón con disco o mancuerna entre las piernas; mismo recorrido completo.', fr: p => fC([p.hip[0], p.hip[1] + 16], 8) });
catC('scappull', 'Dominadas Escapulares', 'dominadas', 'vpull', 'esp:homb', 'Dorsales|Trapecio inferior', 'scapular pull up|dominadas de escapulas|retracciones escapulares', { bw: 1, reps: '8-12', s: 'Colgado con los brazos estirados; solo bajas y juntas las escápulas, sin doblar los codos.',
  F: { rig: 'front', hi: ['torso'], A: { hip: [100, 104], uL: -100, fL: -95, uR: -80, fR: -85, tL: 94, sL: 100, tR: 86, sR: 80 }, B: { hip: [100, 96], uL: -108, fL: -100, uR: -72, fR: -80, tL: 94, sL: 100, tR: 86, sR: 80 }, back: () => fL([30, 8], [170, 8], 5), front: p => fC(p.handL, 3.5) + fC(p.handR, 3.5) } });
catC('closepull', 'Jalón Agarre Cerrado', 'jalon', 'vpull', 'esp:bic', 'Dorsales|Espalda media|Bíceps', 'jalon con triangulo|jalon agarre cerrado|jalon barra v|jalon en v|close grip pulldown', { f: 'pulldown', s: 'Agarre en V (triángulo); lleva el agarre al pecho alto inclinándote apenas atrás.' });
catC('suppull', 'Jalón Agarre Supino', 'jalon', 'vpull', 'esp:bic', 'Dorsales|Bíceps', 'jalon supino|reverse grip pulldown|jalon agarre invertido', { f: 'pulldown', s: 'Barra recta con las palmas hacia ti, a la anchura de los hombros.' });
catC('neutralpd', 'Jalón Agarre Neutro', 'jalon', 'vpull', 'esp:bic', 'Dorsales|Bíceps|Espalda media', 'jalon neutro|neutral grip pulldown|jalon con barra neutra', { f: 'pulldown', s: 'Barra de agarres paralelos, palmas mirándose.' });
catC('onearmpd', 'Jalón a una Mano', 'polea_alta', 'vpull', 'esp:bic', 'Dorsales|Bíceps', 'jalon unilateral|jalon a un brazo|single arm pulldown', { u: 1, f: 'pulldown', s: 'Maneral en una mano; lleva el codo hacia la cadera girando apenas el torso.' });
catC('kneelpd', 'Jalón de Rodillas en Polea Alta', 'polea_alta', 'vpull', 'esp:bic', 'Dorsales|Bíceps', 'jalon arrodillado|kneeling pulldown|jalon de rodillas', { s: 'De rodillas frente a la polea alta, con el torso apenas inclinado hacia atrás.',
  F: { k: -1, e: 1, hi: ['torso', 'uarm'], A: { hip: [92, 102], torso: -100, ankle: [56, 140], hand: [100, 14], foot: 0 }, B: { hip: [92, 102], torso: -104, ankle: [56, 140], hand: [100, 60], foot: 0 },
    back: () => fFloor() + fPost(176) + fC([171, 8], 4), front: p => fCable(p.hand, [171, 8]) + fBar(p.hand, 0, 16, 4) } });
catC('convpd', 'Jalón en Máquina Convergente', 'jalon_conv', 'vpull', 'esp:bic', 'Dorsales|Bíceps|Espalda media', 'jalon convergente|jalon en maquina|machine pulldown|jalon hammer', { f: 'pulldown', s: 'Muslos fijos bajo el rodillo; jala los agarres hacia abajo y afuera.' });
catC('ropepullover', 'Pullover en Polea con Cuerda', 'polea_alta', 'pullover', 'esp:tri', 'Dorsales|Tríceps (cabeza larga)', 'pullover con cuerda|rope pullover|jalon con brazos rectos con cuerda', { i: 1, f: 'cablepullover', s: 'Cuerda en la polea alta, torso inclinado; al final separa las puntas junto a los muslos.' });
catC('machpullover', 'Pullover en Máquina', 'pullover_maq', 'pullover', 'esp:pecho', 'Dorsales|Pecho', 'pullover maquina|machine pullover', { i: 1, s: 'Codos sobre las almohadillas; llévalos desde arriba de la cabeza hasta el abdomen.',
  F: { k: -1, e: -1, hi: ['torso', 'uarm'], A: { hip: [76, 112], torso: -95, ankle: [112, 140], hand: [74, 20], foot: 0 }, B: { hip: [76, 112], torso: -95, ankle: [112, 140], hand: [110, 96], foot: 0 }, back: () => cfSeat(78, 118), front: p => fBar(p.hand, 90, 12, 4) } });
catC('widecablerow', 'Remo en Polea Agarre Ancho', 'remo_polea', 'row', 'esp:homb,bic', 'Espalda media|Espalda alta|Deltoide posterior', 'remo agarre ancho en polea|wide grip cable row|remo con barra recta en polea', { f: 'rowcable', s: 'Barra recta con agarre ancho; lleva los codos hacia afuera y atrás.' });
catC('onearmrow', 'Remo en Polea a una Mano', 'remo_polea', 'row', 'esp:bic', 'Dorsales|Espalda media|Bíceps', 'remo unilateral en polea|remo a un brazo en polea|single arm cable row', { u: 1, f: 'rowcable', s: 'Maneral en una mano; jala el codo hacia la cadera sin girar el torso.' });
catC('suprow', 'Remo en Polea Baja Agarre Supino', 'remo_polea', 'row', 'esp:bic', 'Dorsales|Bíceps|Espalda media', 'remo supino en polea|underhand cable row', { f: 'rowcable', s: 'Barra recta con las palmas hacia arriba; lleva los codos pegados hacia atrás.' });
catC('highrow', 'Remo en Polea Alta con Cuerda', 'polea_alta', 'row', 'esp:homb', 'Espalda alta|Deltoide posterior|Trapecio', 'remo alto con cuerda|high cable row|remo polea alta', { f: 'facepull', s: 'Cuerda en la polea a la altura del pecho o más alta; jala hacia el pecho alto con los codos abiertos.' });
catC('kneelrow1', 'Remo en Polea Alta a una Mano Arrodillado', 'polea_alta', 'row', 'esp:bic', 'Dorsales|Bíceps', 'remo arrodillado a una mano|half kneeling cable row', { u: 1, f: 'kneelpd', s: 'De rodillas de lado a la polea alta; jala el maneral en diagonal hacia la cadera.' });
catC('widebbrow', 'Remo con Barra Agarre Ancho', 'barra', 'row', 'esp:homb', 'Espalda media|Deltoide posterior|Espalda alta', 'wide grip barbell row|remo abierto con barra', { f: 'bbrow', s: 'Agarre ancho; lleva la barra a la parte baja del pecho con los codos abiertos.' });
catC('pendlay', 'Remo Pendlay', 'barra', 'row', 'esp:lumb', 'Espalda media|Dorsales|Espalda baja', 'pendlay row|remo pendlay', { f: 'bbrow', s: 'Torso casi paralelo al suelo; cada repetición empieza con la barra apoyada en el piso.' });
catC('yates', 'Remo con Barra Supino', 'barra', 'row', 'esp:bic', 'Dorsales|Espalda media|Bíceps', 'remo yates|remo supino con barra|reverse grip barbell row', { f: 'bbrow', s: 'Palmas hacia arriba, torso a unos 45°; la barra va al ombligo.' });
catC('smithrow', 'Remo en Smith', 'smith', 'row', 'esp:bic', 'Espalda media|Dorsales|Bíceps', 'remo en multipower|smith row', { f: 'bbrow', s: 'Barra del Smith a media pierna; inclínate con la espalda recta y jala hacia el ombligo.' });
catC('dbrow2', 'Remo con Dos Mancuernas Inclinado', 'manc', 'row', 'esp:bic', 'Espalda media|Dorsales|Bíceps', 'remo inclinado con mancuernas|remo con dos mancuernas|bent over dumbbell row', { f: 'bbrow', s: 'Inclinado a unos 45° con la espalda recta, una mancuerna en cada mano.' });
catC('csrow', 'Remo con Pecho Apoyado', 'manc', 'row', 'esp:bic,homb', 'Espalda media|Dorsales|Deltoide posterior', 'remo en banco inclinado|remo apoyado con mancuernas|chest supported row', { req: 'banco_incl', s: 'Boca abajo sobre un banco a 30-45°, mancuernas colgando bajo los hombros.',
  F: { k: -1, e: 1, hi: ['torso', 'uarm'], A: { hip: [104, 104], torso: -140, ankle: [124, 141], hand: [72, 124], foot: 0 }, B: { hip: [104, 104], torso: -140, ankle: [124, 141], hand: [90, 96], foot: 0 }, back: cfProne, front: p => fDumb(p.hand, 0) } });
catC('sealrow', 'Remo Foca', 'barra', 'row', 'esp:homb', 'Espalda media|Dorsales|Deltoide posterior', 'seal row|remo seal con barra|remo foca con barra|remo en banco alto boca abajo', { req: 'banco', s: 'Boca abajo sobre un banco alto; la barra cuelga bajo el pecho y sube hasta tocar el banco.',
  F: { k: -1, e: 1, hi: ['torso', 'uarm'], A: { hip: [112, 78], torso: 180, ankle: [170, 82], hand: [70, 126], foot: 0 }, B: { hip: [112, 78], torso: 180, ankle: [170, 82], hand: [80, 96], foot: 0 },
    back: () => fFloor() + fL([40, 86], [176, 86], 7) + fL([60, 86], [60, 141], 4) + fL([160, 86], [160, 141], 4), front: p => fPlate(p.hand) } });
catC('krocrow', 'Remo Kroc con Mancuerna', 'manc', 'row', 'esp:bic', 'Dorsales|Bíceps|Antebrazo (agarre)', 'kroc row|remo kroc', { u: 1, f: 'dbrow', req: 'banco', reps: '15-20', s: 'Remo a una mano pesado y con muchas repeticiones; se permite un poco de impulso, sin perder la espalda recta.' });
catC('renegade', 'Remo Renegado con Mancuernas', 'manc', 'row', 'esp:abd', 'Espalda media|Core|Dorsales', 'renegade row|remo renegado', { u: 1, s: 'En posición de flexión sobre dos mancuernas, pies abiertos; rema una sin girar la cadera.',
  F: { k: 1, e: 1, hi: ['torso', 'uarm'], A: { hip: [104, 106], torso: -162, ankle: [170, 132], hand: [62, 134], foot: 100 }, B: { hip: [104, 106], torso: -162, ankle: [170, 132], hand: [80, 112], foot: 100 }, back: p => fFloor() + armBack(p, [62, 134]), front: p => fDumb(p.hand, 0) } });
catC('gorillarow', 'Remo Gorila con Kettlebells', 'kb', 'row', 'esp:abd', 'Espalda media|Dorsales|Core', 'gorilla row|remo gorila', { u: 1, f: 'bbrow', s: 'Pies abiertos, dos kettlebells en el suelo; rema una y luego la otra sin levantarte.' });
catC('kbrow', 'Remo con Kettlebell', 'kb', 'row', 'esp:bic', 'Dorsales|Espalda media|Bíceps', 'kettlebell row|remo kettlebell', { u: 1, f: 'dbrow', req: 'banco', s: 'Una mano y una rodilla en el banco; la kettlebell sube junto a la cadera.' });
catC('ctrow', 'Remo en T con Pecho Apoyado', 'remo_t', 'row', 'esp:bic,homb', 'Espalda media|Dorsales|Deltoide posterior', 'remo t maquina|remo en t apoyado|chest supported t bar row', { f: 'trow', s: 'Pecho contra el apoyo y pies firmes; jala los agarres hacia el abdomen.', bk: () => fL([86, 62], [70, 92], 7) });
catC('meadows', 'Remo Landmine a una Mano', 'landmine', 'row', 'esp:bic', 'Dorsales|Espalda media|Bíceps', 'remo meadows|meadows row|remo landmine', { u: 1, f: 'dbrow', s: 'De lado a la punta de la barra en esquina, agarra el extremo con una mano y jala hacia la cadera.' });
catC('convrow1', 'Remo en Máquina Convergente a una Mano', 'remo_conv', 'row', 'esp:bic', 'Espalda media|Dorsales|Bíceps', 'remo convergente unilateral|single arm machine row', { u: 1, f: 'machrow', s: 'Pecho contra el apoyo; jala un agarre llevando el codo atrás y pegado.' });
catC('highrowmach', 'Remo Alto en Máquina', 'remo_alto', 'row', 'esp:bic', 'Dorsales|Espalda alta|Bíceps', 'high row|remo alto hammer|remo alto maquina', { f: 'machrow', s: 'Muslos fijos bajo el rodillo; jala los agarres desde arriba hacia el pecho bajo.' });
catC('bandrow', 'Remo con Banda', 'banda', 'row', 'esp:bic', 'Espalda media|Bíceps', 'remo con liga|band row', { f: 'rowcable', s: 'Banda anclada a la altura del pecho o en los pies; jala junto las escápulas.' });
catC('trxrow', 'Remo en Suspensión (TRX)', 'trx', 'row', 'esp:bic,abd', 'Espalda media|Dorsales|Core', 'remo trx|trx row|remo en anillas', { bw: 1, f: 'invrow', s: 'Cuerpo en línea colgado de las asas; cuanto más horizontal, más difícil.' });
catC('bbshrug', 'Encogimientos con Barra', 'barra', 'shrug', 'esp:', 'Trapecio', 'encogimientos barra|barbell shrug|trapecio con barra', { i: 1, f: 'shrug', s: 'Barra delante de los muslos con agarre a la anchura de los hombros.' });
catC('smithshrug', 'Encogimientos en Smith', 'smith', 'shrug', 'esp:', 'Trapecio', 'encogimientos multipower|smith shrug', { i: 1, f: 'shrug', s: 'Barra del Smith a la altura de los muslos; sube los hombros en línea recta.' });
catC('hexshrug', 'Encogimientos con Barra Hexagonal', 'hexbar', 'shrug', 'esp:', 'Trapecio', 'trap bar shrug|encogimientos trap bar', { i: 1, f: 'shrug', s: 'De pie dentro de la barra hexagonal, brazos estirados a los lados.' });
catC('cableshrug', 'Encogimientos en Polea', 'polea_baja', 'shrug', 'esp:', 'Trapecio', 'cable shrug|encogimientos con cable', { i: 1, f: 'shrug', s: 'Barra recta en la polea baja; sube los hombros sin doblar los codos.' });
catC('machshrug', 'Encogimientos en Máquina', 'encog_maq', 'shrug', 'esp:', 'Trapecio', 'shrug machine|encogimientos maquina', { i: 1, f: 'shrug', s: 'En la máquina de encogimientos (o en la de gemelos de pie con los hombros bajo las almohadillas).' });
catC('bbshrugback', 'Encogimientos con Barra tras la Espalda', 'barra', 'shrug', 'esp:', 'Trapecio', 'behind the back shrug|encogimientos por detras', { i: 1, f: 'shrug', s: 'Barra detrás de los glúteos, palmas hacia atrás; sube los hombros apenas hacia atrás.' });
catC('rackpull', 'Rack Pull', 'barra', 'hinge', 'esp:lumb,glu', 'Espalda alta|Trapecio|Espalda baja|Glúteos', 'peso muerto parcial|peso muerto desde rack|rack pull', { f: 'deadlift', s: 'Barra en los soportes a la altura de las rodillas; levanta como un peso muerto.' });

/* =========================== ESPALDA BAJA =========================== */
catC('deficitdl', 'Peso Muerto Déficit', 'barra', 'hinge', 'lumb:isq,glu', 'Espalda baja|Isquiotibiales|Glúteos', 'deficit deadlift|peso muerto con deficit', { f: 'deadlift', s: 'De pie sobre un disco o plataforma baja para empezar más abajo; espalda recta.' });
catC('dbdeadlift', 'Peso Muerto con Mancuernas', 'manc', 'hinge', 'lumb:glu,isq', 'Espalda baja|Glúteos|Isquiotibiales', 'dumbbell deadlift|peso muerto mancuernas', { f: 'deadlift', s: 'Mancuernas a los lados de los pies; sube con la espalda recta.' });
catC('smithdl', 'Peso Muerto en Smith', 'smith', 'hinge', 'lumb:glu,isq', 'Espalda baja|Glúteos|Isquiotibiales', 'smith deadlift|peso muerto multipower', { f: 'deadlift', s: 'Barra del Smith a media pierna; la barra va pegada a las piernas.' });
catC('weighthyper', 'Hiperextensiones con Peso', 'hiper45', 'lumbar', 'lumb:glu', 'Espalda baja|Glúteos', 'hiperextensiones con disco|weighted back extension|lumbares con peso', { f: 'hyperext', s: 'Abraza un disco contra el pecho; sube hasta quedar en línea.' });
catC('lumbarmach', 'Extensión Lumbar en Máquina', 'lumbar_maq', 'lumbar', 'lumb:glu', 'Espalda baja|Glúteos', 'lumbar en maquina|maquina de lumbares|back extension machine', { i: 1, s: 'Sentado con la almohadilla en la espalda alta y los pies firmes.',
  F: { k: -1, e: -1, hi: ['torso'], A: { hip: [80, 112], torso: -40, ankle: [116, 140], handRel: [8, 8], foot: 0 }, B: { hip: [80, 112], torso: -100, ankle: [116, 140], handRel: [8, 8], foot: 0 }, back: () => cfSeat(80, 118, false) } });
catC('birddog', 'Bird Dog', 'cuerpo', 'antiext', 'lumb:abd,glu', 'Espalda baja|Core|Glúteos', 'perro pajaro|bird-dog|cuadrupedia alterna', { bw: 1, reps: '8-12', s: 'En cuatro apoyos, estira un brazo y la pierna contraria sin mover la cadera.',
  F: { k: 1, e: 1, hi: ['torso', 'glute'], A: { hip: [116, 100], torso: 180, ankle: [152, 141], hand: [72, 140], foot: 0 }, B: { hip: [116, 100], torso: 180, ankle: [186, 98], hand: [24, 96], foot: 0 }, back: p => fFloor() + legBack(p, [150, 141], 1) + armBack(p, [72, 140]) } });

/* =========================== HOMBROS =========================== */
catC('seatbbohp', 'Press Militar Sentado con Barra', 'barra', 'vpush', 'homb:tri', 'Hombro frontal|Hombro lateral|Tríceps', 'press militar sentado|press de hombro sentado con barra|seated barbell press', { f: 'bbohp', req: 'banco', s: 'Sentado con respaldo vertical; la barra sale desde la clavícula.', bk: () => fR(84, 70, 32, 70) });
catC('smithohp', 'Press Militar en Smith', 'smith', 'vpush', 'homb:tri', 'Hombro frontal|Hombro lateral|Tríceps', 'press militar en multipower|press de hombro en smith|smith shoulder press', { f: 'bbohp', req: 'banco', s: 'Banco vertical bajo el Smith para que la barra pase delante de la cara.' });
catC('neutralohp', 'Press de Hombro de Pie Agarre Neutro con Mancuernas', 'manc', 'vpush', 'homb:tri', 'Hombro frontal|Tríceps', 'press neutro de hombro|neutral grip shoulder press|press de hombro martillo', { f: 'ohp', s: 'De pie, palmas mirándose y codos al frente; empuja sin arquear la espalda.' });
catC('db1ohp', 'Press de Hombro a una Mano', 'manc', 'vpush', 'homb:tri,abd', 'Hombro frontal|Tríceps|Core', 'press de hombro unilateral|press unilateral con mancuerna|single arm shoulder press', { u: 1, f: 'ohp', s: 'Una mancuerna; el abdomen firme para no inclinarte al lado contrario.' });
catC('kbpress', 'Press con Kettlebell', 'kb', 'vpush', 'homb:tri', 'Hombro frontal|Tríceps', 'kettlebell press|press kettlebell', { u: 1, f: 'ohp', s: 'Kettlebell apoyada en el antebrazo a la altura del hombro, muñeca recta.' });
catC('cableohp', 'Press de Hombro Sentado en Polea', 'cruce', 'vpush', 'homb:tri', 'Hombro frontal|Tríceps', 'press de hombro con cables|seated cable shoulder press', { f: 'ohp', req: 'banco', s: 'Banco vertical entre dos poleas bajas; empuja los manerales hacia arriba.' });
catC('hombconv', 'Press de Hombro en Máquina Convergente', 'homb_conv', 'vpush', 'homb:tri', 'Hombro frontal|Tríceps', 'press de hombro convergente|converging shoulder press', { f: 'machshoulder', s: 'Asiento para que los agarres salgan a la altura de los hombros.' });
catC('landpress', 'Press Landmine', 'landmine', 'vpush', 'homb:pecho,tri', 'Hombro frontal|Pecho superior|Tríceps', 'landmine press|press en mina', { u: 1, s: 'De pie con un pie adelantado; sujeta la punta de la barra en esquina a la altura del hombro.',
  F: { k: -1, e: 1, hi: ['delt', 'uarm'], A: { hip: [95, 70], torso: -84, ankle: [100, 141], hand: [112, 34], foot: 0 }, B: { hip: [95, 70], torso: -84, ankle: [100, 141], hand: [140, 14], foot: 0 }, back: () => fFloor(), front: p => fL([20, 141], p.hand, 4) + fPlate(fadd(p.hand, -30, 8)) } });
catC('pushpress', 'Push Press', 'barra', 'vpush', 'homb:tri,cuad', 'Hombros|Tríceps|Cuádriceps', 'push press|press con impulso', { f: 'bbohp', s: 'Barra en la clavícula; flexiona un poco las rodillas y usa ese impulso para subirla.' });
catC('bradford', 'Press Bradford', 'barra', 'vpush', 'homb:tri', 'Hombro frontal|Hombro lateral', 'bradford press|press bradford', { f: 'bbohp', reps: '8-12', s: 'Pasa la barra por encima de la cabeza de adelante hacia atrás sin estirar del todo; peso ligero.', e: 'Bajar demasiado detrás de la nuca si tu hombro no lo tolera.' });
catC('zpress', 'Press Z', 'barra', 'vpush', 'homb:tri,abd', 'Hombros|Tríceps|Core', 'z press|press sentado en el suelo', { s: 'Sentado en el suelo con las piernas estiradas; empuja la barra sin apoyar la espalda.',
  F: { k: -1, e: 1, hi: ['delt', 'uarm'], A: { hip: [80, 132], torso: -90, ankle: [150, 138], hand: [94, 84], foot: -60 }, B: { hip: [80, 132], torso: -90, ankle: [150, 138], hand: [84, 40], foot: -60 }, back: () => fFloor(), front: p => fPlate(p.hand) } });
catC('cuban', 'Press Cubano', 'manc', 'rot', 'homb:', 'Manguito rotador|Deltoide posterior|Hombros', 'cuban press|press cubano', { i: 1, reps: '10-12', s: 'Mancuernas ligeras: sube los codos a la altura de los hombros, gira los antebrazos hacia arriba y empuja.',
  F: { rig: 'front', hi: ['delt'], A: Object.assign({ hip: [100, 72], uL: 98, fL: 92, uR: 82, fR: 88 }, cfFrontLegs), B: Object.assign({ hip: [100, 72], uL: 180, fL: -90, uR: 0, fR: -90 }, cfFrontLegs), back: () => fFloor(147), front: p => fDumb(p.handL, 0) + fDumb(p.handR, 0) } });
catC('hspu', 'Flexiones en Pino contra la Pared', 'cuerpo', 'vpush', 'homb:tri', 'Hombros|Tríceps', 'handstand push up|flexiones en pino|press en parada de manos', { bw: 1, reps: '3-8', s: 'Manos a un palmo de la pared; sube las piernas a la pared y baja la cabeza hacia el suelo controlando.',
  F: { k: 1, e: 1, vb: '-30 -46 260 196', hi: ['delt', 'uarm'], A: { hip: [100, 46], torso: 90, ankle: [102, -26], hand: [98, 140], foot: -90 }, B: { hip: [100, 64], torso: 90, ankle: [102, -8], hand: [94, 140], foot: -90 }, back: () => fFloor() + fL([124, -44], [124, 141], 5, 'var(--line)') } });
catC('seatlat', 'Elevaciones Laterales Sentado', 'manc', 'lat', 'homb:', 'Hombro lateral', 'laterales sentado|seated lateral raise', { i: 1, f: 'lateral', req: 'banco', s: 'Sentado al borde del banco con la espalda recta.' });
catC('cablelat', 'Elevación Lateral en Polea', 'polea_baja', 'lat', 'homb:', 'Hombro lateral', 'laterales en polea|elevacion lateral con cable|cable lateral raise', { i: 1, u: 1, f: 'lateral', s: 'De lado a la polea baja, maneral en la mano más lejana; sube el brazo en arco hacia afuera.', fr: p => fCable(p.handL, [184, 140]) + fDumb(p.handR, 0) });
catC('cablelatback', 'Elevación Lateral en Polea por Detrás', 'polea_baja', 'lat', 'homb:', 'Hombro lateral', 'lateral en polea por detras|behind the back cable lateral raise', { i: 1, u: 1, f: 'lateral', s: 'El cable pasa por detrás de tu cuerpo; sube el brazo hacia el lado.', fr: p => fCable(p.handL, [184, 140]) });
catC('machlat', 'Elevaciones Laterales en Máquina', 'lat_maq', 'lat', 'homb:', 'Hombro lateral', 'laterales en maquina|machine lateral raise', { i: 1, f: 'lateral', s: 'Codos contra las almohadillas; sube hasta la altura de los hombros.' });
catC('leanlat', 'Elevación Lateral Inclinada a una Mano', 'manc', 'lat', 'homb:', 'Hombro lateral', 'lateral inclinada|leaning lateral raise|lateral agarrado al poste', { i: 1, u: 1, f: 'lateral', s: 'Agárrate de un poste e inclínate hacia el lado contrario; sube la mancuerna en arco.' });
catC('lyinglat', 'Elevación Lateral Tumbado de Lado', 'manc', 'lat', 'homb:', 'Hombro lateral', 'lateral tumbado|elevacion lateral acostado|lying lateral raise', { i: 1, u: 1, f: 'lateral', req: 'banco_incl', s: 'Acostado de lado sobre un banco inclinado; sube la mancuerna desde la cadera hasta arriba.' });
catC('bandlat', 'Elevaciones Laterales con Banda', 'banda', 'lat', 'homb:', 'Hombro lateral', 'laterales con liga|band lateral raise', { i: 1, f: 'lateral', s: 'Pisa la banda con los pies; sube los brazos hacia los lados.' });
catC('cabley', 'Elevación en Y en Polea', 'polea_baja', 'lat', 'homb:esp', 'Hombro lateral|Deltoide posterior|Trapecio inferior', 'y raise en polea|cable y raise', { i: 1, s: 'Cables cruzados desde las poleas bajas; sube los brazos en diagonal formando una Y.',
  F: { rig: 'front', hi: ['delt'], A: Object.assign({ hip: [100, 74], uL: 60, fL: 70, uR: 120, fR: 110 }, cfFrontLegs), B: Object.assign({ hip: [100, 74], uL: -130, fL: -125, uR: -50, fR: -55 }, cfFrontLegs),
    back: () => fFloor(147) + fL([12, 4], [12, 147], 6) + fL([188, 4], [188, 147], 6) + fC([16, 140], 4) + fC([184, 140], 4), front: p => fCable(p.handL, [184, 140]) + fCable(p.handR, [16, 140]) + fC(p.handL, 3.5) + fC(p.handR, 3.5) } });
catC('platefront', 'Elevación Frontal con Disco', 'disco', 'front', 'homb:', 'Hombro frontal', 'frontal con disco|elevacion frontal disco|plate front raise', { i: 1, f: 'frontraise', s: 'Sujeta un disco por los lados, brazos casi rectos.' });
catC('bbfront', 'Elevación Frontal con Barra', 'barra', 'front', 'homb:', 'Hombro frontal', 'frontal con barra|barbell front raise', { i: 1, f: 'frontraise', s: 'Barra con agarre prono a la anchura de los hombros.' });
catC('cablefront', 'Elevación Frontal en Polea', 'polea_baja', 'front', 'homb:', 'Hombro frontal', 'frontal en polea|elevacion frontal con cuerda|cable front raise', { i: 1, f: 'frontraise', s: 'De espaldas a la polea baja con cuerda o barra recta entre las piernas.', fr: p => fCable(p.hand, [24, 134]) + fC(p.hand, 3.5) });
catC('inclfront', 'Elevación Frontal en Banco Inclinado', 'manc', 'front', 'homb:', 'Hombro frontal', 'frontal en banco inclinado|incline front raise', { i: 1, req: 'banco_incl', s: 'Espalda apoyada en el banco inclinado; sube las mancuernas al frente.',
  F: { k: -1, e: -1, hi: ['delt'], A: { hip: [80, 110], torso: -130, ankle: [118, 140], hand: [56, 126], foot: 0 }, B: { hip: [80, 110], torso: -130, ankle: [118, 140], hand: [96, 50], foot: 0 }, back: () => fFloor() + fL([80, 116], [46, 74], 8) + fL([62, 112], [62, 140], 4), front: p => fDumb(p.hand, 90) } });
catC('bandfront', 'Elevación Frontal con Banda', 'banda', 'front', 'homb:', 'Hombro frontal', 'frontal con liga|band front raise', { i: 1, f: 'frontraise', s: 'Pisa la banda; sube los brazos al frente hasta la altura de los ojos.' });
catC('csrear', 'Pájaros con Pecho Apoyado', 'manc', 'rear', 'homb:esp', 'Deltoide posterior|Espalda alta', 'pajaros en banco inclinado|pajaros apoyado|chest supported reverse fly', { i: 1, f: 'csrow', req: 'banco_incl', s: 'Boca abajo en un banco inclinado; abre los brazos hacia los lados con los codos suaves.' });
catC('cablerear', 'Pájaros en Polea', 'cruce', 'rear', 'homb:esp', 'Deltoide posterior|Espalda alta', 'cruce inverso|pajaros en cruce de poleas|deltoide posterior en polea|reverse cable fly', { i: 1, s: 'Cables cruzados a la altura de los hombros; abre los brazos hacia atrás.',
  F: { rig: 'front', hi: ['delt'], A: Object.assign({ hip: [100, 74], uL: 20, fL: 15, uR: 160, fR: 165 }, cfFrontLegs), B: Object.assign({ hip: [100, 74], uL: 180, fL: 182, uR: 0, fR: -2 }, cfFrontLegs),
    back: () => fFloor(147) + fL([12, 4], [12, 147], 6) + fL([188, 4], [188, 147], 6), front: p => fCable(p.handL, [184, 30]) + fCable(p.handR, [16, 30]) + fC(p.handL, 3.5) + fC(p.handR, 3.5) } });
catC('revpecdeck', 'Pec Deck Inverso', 'pecdeck', 'rear', 'homb:esp', 'Deltoide posterior|Espalda alta', 'contractora inversa|pajaros en maquina|deltoide posterior en maquina|reverse pec deck', { i: 1, s: 'Pecho contra el respaldo; agarres a la altura de los hombros y abre los brazos hacia atrás.',
  F: { rig: 'front', thighLen: 16, hi: ['delt'], A: { hip: [100, 96], uL: 150, fL: -55, uR: 30, fR: -125, tL: 100, sL: 90, tR: 80, sR: 90 }, B: { hip: [100, 96], uL: 180, fL: 180, uR: 0, fR: 0, tL: 100, sL: 90, tR: 80, sR: 90 },
    back: () => fFloor(147) + fR(84, 26, 32, 70) + fR(74, 96, 52, 8), front: p => fBar(p.handL, 90, 14, 4) + fBar(p.handR, 90, 14, 4) } });
catC('pullapart', 'Separación con Banda', 'banda', 'rear', 'homb:esp', 'Deltoide posterior|Espalda alta', 'pull apart|band pull apart|separacion de banda', { i: 1, f: 'revpecdeck', s: 'Brazos al frente a la altura de los hombros; separa la banda hasta tocar el pecho.', fr: p => fL(p.handL, p.handR, 1.5, 'var(--accent2)') });
catC('bbrearrow', 'Remo de Deltoide Posterior con Barra', 'barra', 'rear', 'homb:esp', 'Deltoide posterior|Espalda alta', 'rear delt row|remo para deltoide posterior', { f: 'bbrow', s: 'Inclinado con agarre ancho; jala la barra al pecho alto con los codos bien abiertos.' });
catC('bbupright', 'Remo al Mentón con Barra', 'barra', 'upright', 'homb:esp', 'Hombro lateral|Trapecio', 'remo al menton|remo vertical|remo al cuello|upright row', { s: 'Barra delante de los muslos con agarre a la anchura de los hombros o algo más.',
  F: { rig: 'front', hi: ['delt'], A: Object.assign({ hip: [100, 76], uL: 98, fL: 92, uR: 82, fR: 88 }, cfFrontLegs), B: Object.assign({ hip: [100, 76], uL: 200, fL: 60, uR: -20, fR: 120 }, cfFrontLegs), back: () => fFloor(147), front: catBarF } });
catC('cableupright', 'Remo al Mentón en Polea', 'polea_baja', 'upright', 'homb:esp', 'Hombro lateral|Trapecio', 'remo al menton en polea|cable upright row', { f: 'bbupright', s: 'Barra recta en la polea baja, de pie cerca de la polea.' });
catC('dbupright', 'Remo al Mentón con Mancuernas', 'manc', 'upright', 'homb:esp', 'Hombro lateral|Trapecio', 'remo al menton con mancuernas|dumbbell upright row', { f: 'bbupright', s: 'Mancuernas delante de los muslos; sube los codos hacia los lados.' });
catC('smithupright', 'Remo al Mentón en Smith', 'smith', 'upright', 'homb:esp', 'Hombro lateral|Trapecio', 'remo al menton multipower|smith upright row', { f: 'bbupright', s: 'Barra del Smith delante de los muslos.' });
catC('bandupright', 'Remo al Mentón con Banda', 'banda', 'upright', 'homb:esp', 'Hombro lateral|Trapecio', 'remo al menton con liga|band upright row', { f: 'bbupright', s: 'Pisa la banda con los dos pies y sube las manos pegadas al cuerpo.' });
catC('cableextrot', 'Rotación Externa en Polea', 'cruce', 'rot', 'homb:', 'Manguito rotador|Deltoide posterior', 'rotacion externa|manguito rotador en polea|external rotation', { i: 1, u: 1, reps: '12-15', s: 'Polea a la altura del codo, de lado; codo pegado y una toalla entre el codo y el costado.',
  F: { rig: 'front', hi: ['delt'], A: Object.assign({ hip: [100, 74], uL: 95, fL: 0, uR: 85, fR: 85 }, cfFrontLegs), B: Object.assign({ hip: [100, 74], uL: 95, fL: 180, uR: 85, fR: 85 }, cfFrontLegs),
    back: () => fFloor(147) + fL([188, 4], [188, 147], 6), front: p => fCable(p.handL, [186, 60]) + fC(p.handL, 3.5) } });
catC('cableintrot', 'Rotación Interna en Polea', 'cruce', 'rot', 'homb:', 'Manguito rotador|Pecho', 'rotacion interna|internal rotation', { i: 1, u: 1, reps: '12-15', s: 'Polea a la altura del codo, de lado; lleva el antebrazo hacia el abdomen con el codo pegado.',
  F: { rig: 'front', hi: ['delt'], A: Object.assign({ hip: [100, 74], uL: 95, fL: 180, uR: 85, fR: 85 }, cfFrontLegs), B: Object.assign({ hip: [100, 74], uL: 95, fL: 0, uR: 85, fR: 85 }, cfFrontLegs),
    back: () => fFloor(147) + fL([12, 4], [12, 147], 6), front: p => fCable(p.handL, [14, 60]) + fC(p.handL, 3.5) } });
catC('dbextrot', 'Rotación Externa con Mancuerna Tumbado', 'manc', 'rot', 'homb:', 'Manguito rotador|Deltoide posterior', 'rotacion externa acostado|side lying external rotation', { i: 1, u: 1, reps: '12-15', f: 'cableextrot', s: 'Acostado de lado, codo pegado a la cintura; gira el antebrazo hacia arriba.' });
catC('bandextrot', 'Rotación Externa con Banda', 'banda', 'rot', 'homb:', 'Manguito rotador', 'rotacion externa con liga|band external rotation', { i: 1, u: 1, reps: '12-15', f: 'cableextrot', s: 'Banda anclada a la altura del codo; codo pegado y gira el antebrazo hacia afuera.' });
catC('kbhalo', 'Halo con Kettlebell', 'kb', 'rot', 'homb:abd', 'Hombros|Core', 'halo|kettlebell halo', { reps: '6-10 por lado', s: 'Kettlebell por los cuernos frente al pecho; rodea la cabeza despacio, cerca del cuello.',
  F: { rig: 'front', vb: '-10 -30 220 180', hi: ['delt'], A: Object.assign({ hip: [100, 74], uL: -60, fL: -20, uR: -120, fR: -160 }, cfFrontLegs), B: Object.assign({ hip: [100, 74], uL: -140, fL: -60, uR: -150, fR: -60 }, cfFrontLegs), back: () => fFloor(147), front: p => catKb([(p.handL[0] + p.handR[0]) / 2, (p.handL[1] + p.handR[1]) / 2 - 6]) } });

/* =========================== BÍCEPS =========================== */
catC('ezcurl', 'Curl con Barra Z', 'barraz', 'curl', 'bic:ante', 'Bíceps|Braquial', 'curl barra z|curl con barra ez|ez bar curl', { i: 1, f: 'bbcurl', s: 'Agarre en la parte inclinada de la barra Z, codos pegados.' });
catC('closecurl', 'Curl con Barra Agarre Cerrado', 'barra', 'curl', 'bic:', 'Bíceps', 'curl agarre cerrado|close grip curl', { i: 1, f: 'bbcurl', bar: 10, s: 'Manos más juntas que los hombros.' });
catC('widecurl', 'Curl con Barra Agarre Ancho', 'barra', 'curl', 'bic:', 'Bíceps', 'curl agarre ancho|wide grip curl', { i: 1, f: 'bbcurl', bar: 10, s: 'Manos más abiertas que los hombros.' });
catC('dragcurl', 'Curl de Arrastre', 'barra', 'curl', 'bic:', 'Bíceps', 'drag curl|curl arrastrado', { i: 1, bar: 10, s: 'Sube la barra rozando el torso llevando los codos hacia atrás.',
  F: { k: -1, e: 1, hi: ['uarm'], A: { hip: [100, 68], torso: -90, ankle: [101, 141], hand: [104, 73], foot: 0 }, B: { hip: [100, 68], torso: -90, ankle: [101, 141], hand: [106, 42], foot: 0 }, back: () => fFloor(), front: p => fPlate(p.hand) } });
catC('altcurl0', 'Curl con Mancuernas Sentado', 'manc', 'curl', 'bic:', 'Bíceps', 'seated dumbbell curl|curl sentado', { i: 1, f: 'concentration', req: 'banco', s: 'Sentado al borde del banco con la espalda recta, brazos colgando.' });
catC('crosshammer', 'Curl Martillo Cruzado', 'manc', 'curl', 'bic:ante', 'Braquial|Bíceps|Antebrazo', 'cross body hammer curl|martillo cruzado', { i: 1, f: 'hammer', s: 'Sube la mancuerna en diagonal hacia el hombro contrario, palma mirando al cuerpo.' });
catC('inclhammer', 'Curl Martillo Inclinado', 'manc', 'curl', 'bic:ante', 'Braquial|Bíceps', 'incline hammer curl|martillo en banco inclinado', { i: 1, f: 'inclinecurl', req: 'banco_incl', s: 'Espalda en el banco inclinado, palmas mirándose.' });
catC('scotthammer', 'Curl Martillo en Banco Scott', 'manc', 'curl', 'bic:ante', 'Braquial|Bíceps', 'martillo en scott|preacher hammer curl', { i: 1, u: 1, f: 'preacher', req: 'scott', s: 'Brazo sobre el banco Scott, palma mirando hacia adentro.' });
catC('cablehammer', 'Curl Martillo en Polea', 'polea_baja', 'curl', 'bic:ante', 'Braquial|Bíceps|Antebrazo', 'martillo en polea con cuerda|curl con cuerda|rope hammer curl', { i: 1, f: 'hammer', s: 'Cuerda en la polea baja; sube con las palmas mirándose.', fr: p => fCable(p.hand, [150, 134]) + fRope(p.hand) });
catC('dbpreacher', 'Curl Scott con Mancuerna', 'manc', 'curl', 'bic:', 'Bíceps', 'scott con mancuerna|predicador con mancuerna|scott a una mano|dumbbell preacher curl', { i: 1, u: 1, f: 'preacher', req: 'scott', s: 'Un brazo sobre el banco Scott, axila pegada al borde.' });
catC('cablepreacher', 'Curl Scott en Polea', 'polea_baja', 'curl', 'bic:', 'Bíceps', 'scott en polea|cable preacher curl', { i: 1, f: 'preacher', req: 'scott', s: 'Banco Scott frente a la polea baja con barra recta o Z.' });
catC('machpreacher', 'Curl Scott en Máquina', 'curl_maq', 'curl', 'bic:', 'Bíceps', 'scott en maquina|predicador en maquina|machine preacher curl', { i: 1, f: 'preacher', s: 'Brazos sobre la almohadilla y el codo alineado con el eje de la máquina.' });
catC('machcurl', 'Curl de Bíceps en Máquina', 'curl_maq', 'curl', 'bic:', 'Bíceps', 'curl en maquina|biceps en maquina|machine curl', { i: 1, f: 'preacher', s: 'Asiento a una altura en la que el codo quede en el eje de giro.' });
catC('inclinecurl', 'Curl Inclinado con Mancuernas', 'manc', 'curl', 'bic:', 'Bíceps (cabeza larga)', 'curl inclinado|curl en banco inclinado|incline dumbbell curl', { i: 1, req: 'banco_incl', s: 'Banco a 45-60°, brazos colgando detrás de la línea del cuerpo.',
  F: { k: -1, e: 1, hi: ['uarm'], arc: ['hand'], A: { hip: [80, 110], torso: -130, ankle: [118, 140], hand: [53, 126], foot: 0 }, B: { hip: [80, 110], torso: -130, ankle: [118, 140], hand: [72, 86], foot: 0 }, back: () => fFloor() + fL([80, 116], [46, 74], 8) + fL([62, 112], [62, 140], 4), front: p => fDumb(p.hand, 90) } });
catC('spidercurl', 'Curl Araña', 'manc', 'curl', 'bic:', 'Bíceps (cabeza corta)', 'spider curl|curl arana|curl en banco boca abajo', { i: 1, req: 'banco_incl', s: 'Boca abajo en un banco inclinado, brazos colgando rectos.',
  F: { k: -1, e: 1, hi: ['uarm'], arc: ['hand'], A: { hip: [104, 104], torso: -140, ankle: [124, 141], hand: [72, 124], foot: 0 }, B: { hip: [104, 104], torso: -140, ankle: [124, 141], hand: [92, 90], foot: 0 }, back: cfProne, front: p => fDumb(p.hand, 90) } });
catC('zottman', 'Curl Zottman', 'manc', 'curl', 'bic:ante', 'Bíceps|Braquial|Antebrazo', 'zottman curl', { i: 1, f: 'curl', s: 'Sube con las palmas hacia arriba, gira arriba y baja con las palmas hacia abajo.' });
catC('cablecurl', 'Curl en Polea con Barra Recta', 'polea_baja', 'curl', 'bic:', 'Bíceps', 'curl en polea|curl con barra en polea baja|curl de biceps en polea|cable curl', { i: 1, f: 'bbcurl', s: 'Frente a la polea baja con barra recta; codos pegados.', fr: p => fCable(p.hand, [150, 134]) + fBar(p.hand, 90, 10, 4) });
catC('cableezcurl', 'Curl en Polea con Barra Z', 'polea_baja', 'curl', 'bic:ante', 'Bíceps|Braquial', 'curl en polea con barra z|ez cable curl', { i: 1, f: 'bbcurl', s: 'Barra Z en la polea baja; codos pegados.', fr: p => fCable(p.hand, [150, 134]) + fBar(p.hand, 90, 10, 4) });
catC('cablecurl1', 'Curl en Polea a una Mano', 'polea_baja', 'curl', 'bic:', 'Bíceps', 'curl unilateral en polea|single arm cable curl', { i: 1, u: 1, f: 'curl', s: 'Maneral en la polea baja, de lado o de frente; codo pegado.', fr: p => fCable(p.hand, [150, 134]) + fC(p.hand, 4) });
catC('lyingcablecurl', 'Curl en Polea Tumbado', 'polea_alta', 'curl', 'bic:', 'Bíceps', 'curl tumbado en polea|lying cable curl', { i: 1, s: 'Acostado en el suelo bajo la polea alta, brazos apuntando al techo.',
  F: { k: -1, e: 1, hi: ['uarm'], arc: ['hand'], A: { hip: [120, 134], torso: 180, ankle: [160, 138], hand: [72, 86], foot: 0 }, B: { hip: [120, 134], torso: 180, ankle: [160, 138], hand: [60, 108], foot: 0 }, back: () => fFloor() + fPost(30) + fC([36, 8], 4), front: p => fCable(p.hand, [36, 8]) + fBar(p.hand, 0, 10, 4) } });
catC('bayescurl', 'Curl en Polea por Detrás', 'polea_baja', 'curl', 'bic:', 'Bíceps (cabeza larga)', 'curl bayesiano|curl en polea desde atras|bayesian curl', { i: 1, u: 1, s: 'De espaldas a la polea baja, un paso adelante; el brazo empieza detrás del cuerpo.',
  F: { k: -1, e: 1, hi: ['uarm'], arc: ['hand'], A: { hip: [95, 68], torso: -88, ankle: [98, 141], hand: [84, 72], foot: 0 }, B: { hip: [95, 68], torso: -88, ankle: [98, 141], hand: [108, 34], foot: 0 }, back: () => fFloor() + fL([12, 4], [12, 141], 6) + fC([16, 134], 4), front: p => fCable(p.hand, [16, 134]) + fC(p.hand, 4) } });
catC('highcablecurl', 'Curl en Polea Alta', 'cruce', 'curl', 'bic:', 'Bíceps', 'doble biceps en polea|curl en cruce de poleas|curl crucifijo|high cable curl', { i: 1, s: 'En medio del cruce de poleas, brazos abiertos a la altura de los hombros.',
  F: { rig: 'front', hi: ['uarm'], A: Object.assign({ hip: [100, 74], uL: 180, fL: 180, uR: 0, fR: 0 }, cfFrontLegs), B: Object.assign({ hip: [100, 74], uL: 180, fL: -90, uR: 0, fR: -90 }, cfFrontLegs),
    back: () => fFloor(147) + fL([12, 4], [12, 147], 6) + fL([188, 4], [188, 147], 6), front: p => fCable(p.handL, [14, 30]) + fCable(p.handR, [186, 30]) + fC(p.handL, 3.5) + fC(p.handR, 3.5) } });
catC('bandcurl', 'Curl con Banda', 'banda', 'curl', 'bic:', 'Bíceps', 'curl con liga|band curl', { i: 1, f: 'curl', s: 'Pisa la banda con los pies; codos pegados.' });
catC('revcurl', 'Curl Invertido con Barra', 'barra', 'curl', 'bic:ante', 'Braquial|Antebrazo|Bíceps', 'curl invertido|curl agarre prono|reverse curl', { i: 1, f: 'bbcurl', bar: 10, s: 'Palmas hacia abajo a la anchura de los hombros.' });
catC('revezscott', 'Curl Inverso con Barra Z en Scott', 'barraz', 'curl', 'bic:ante', 'Braquial|Antebrazo', 'curl inverso en scott|reverse preacher curl', { i: 1, f: 'preacher', req: 'scott', s: 'Brazos en el banco Scott, palmas hacia abajo sobre la barra Z.' });
catC('revdbcurl', 'Curl Inverso con Mancuernas', 'manc', 'curl', 'bic:ante', 'Braquial|Antebrazo', 'reverse dumbbell curl|curl invertido con mancuernas', { i: 1, f: 'curl', s: 'Palmas hacia abajo, codos pegados.' });
catC('revcablecurl', 'Curl Inverso en Polea', 'polea_baja', 'curl', 'bic:ante', 'Braquial|Antebrazo', 'reverse cable curl|curl invertido en polea', { i: 1, f: 'bbcurl', s: 'Barra recta en la polea baja con las palmas hacia abajo.', fr: p => fCable(p.hand, [150, 134]) + fBar(p.hand, 90, 10, 4) });

/* =========================== TRÍCEPS =========================== */
catC('ezpush', 'Tríceps en Polea con Barra Z', 'polea_alta', 'triext', 'tri:', 'Tríceps', 'triceps barra z|extension de triceps con barra z|ez bar pushdown', { i: 1, f: 'triceps', s: 'Barra Z en la polea alta, codos pegados al cuerpo.' });
catC('revpush', 'Tríceps en Polea Agarre Supino', 'polea_alta', 'triext', 'tri:', 'Tríceps', 'triceps agarre invertido|triceps supino|reverse grip pushdown', { i: 1, f: 'triceps', s: 'Barra recta con las palmas hacia arriba; codos pegados.' });
catC('onearmpush', 'Extensión de Tríceps a una Mano en Polea', 'polea_alta', 'triext', 'tri:', 'Tríceps', 'triceps unilateral en polea|triceps a una mano|single arm pushdown', { i: 1, u: 1, f: 'triceps', s: 'Maneral en la polea alta; estira el brazo con el codo pegado.' });
catC('ohcablerope', 'Extensión sobre la Cabeza en Polea con Cuerda', 'polea_alta', 'triext', 'tri:', 'Tríceps (cabeza larga)', 'extension sobre la cabeza con cuerda|triceps tras nuca en polea|french press en polea|overhead cable extension', { i: 1, s: 'De espaldas a la polea, un pie adelante y la cuerda detrás de la cabeza.',
  F: { k: -1, e: -1, hi: ['uarm'], A: { hip: [100, 72], torso: -70, ankle: [104, 141], hand: [106, 18], foot: 0 }, B: { hip: [100, 72], torso: -70, ankle: [104, 141], hand: [146, 6], foot: 0 }, back: () => fFloor() + fL([14, 4], [14, 141], 6) + fC([20, 20], 4), front: p => fCable(p.hand, [20, 20]) + fRope(p.hand) } });
catC('ohcablebar', 'Extensión sobre la Cabeza en Polea con Barra', 'polea_alta', 'triext', 'tri:', 'Tríceps (cabeza larga)', 'extension sobre la cabeza con barra en polea|overhead bar cable extension', { i: 1, f: 'ohcablerope', s: 'Barra recta en la polea, de espaldas a ella; estira los brazos al frente y arriba.' });
catC('incltricable', 'Extensión de Tríceps Inclinada en Polea', 'polea_baja', 'triext', 'tri:', 'Tríceps (cabeza larga)', 'incline cable triceps extension|triceps inclinado en polea', { i: 1, f: 'ohtri', req: 'banco_incl', s: 'Banco inclinado de espaldas a la polea baja; estira los brazos sobre la cabeza.' });
catC('lyingtricable', 'Extensión de Tríceps Tumbado en Polea', 'polea_baja', 'triext', 'tri:', 'Tríceps', 'lying cable triceps extension|press frances en polea', { i: 1, f: 'skull', req: 'banco', s: 'Acostado con la cabeza hacia la polea baja y barra recta.' });
catC('oh1', 'Extensión sobre la Cabeza a una Mano', 'manc', 'triext', 'tri:', 'Tríceps (cabeza larga)', 'extension unilateral sobre la cabeza|nuca a una mano|single arm overhead extension', { i: 1, u: 1, f: 'ohtri', s: 'Una mancuerna detrás de la cabeza, codo apuntando al techo.' });
catC('ezohsit', 'Extensión sobre la Cabeza con Barra Z Sentado', 'barraz', 'triext', 'tri:', 'Tríceps (cabeza larga)', 'nuca con barra z|seated ez overhead extension', { i: 1, f: 'ohtri', req: 'banco', s: 'Sentado con respaldo, barra Z detrás de la cabeza.' });
catC('kboh', 'Extensión sobre la Cabeza con Kettlebell', 'kb', 'triext', 'tri:', 'Tríceps (cabeza larga)', 'kettlebell overhead extension|nuca con kettlebell', { i: 1, f: 'ohtri', s: 'Kettlebell por los cuernos detrás de la cabeza.' });
catC('dbskull', 'Press Francés con Mancuernas', 'manc', 'triext', 'tri:', 'Tríceps', 'press frances con mancuernas|rompecraneos con mancuernas|dumbbell skull crusher', { i: 1, f: 'skull', req: 'banco', s: 'Acostado, mancuernas sobre los hombros con las palmas mirándose.' });
catC('inclskull', 'Press Francés Inclinado con Barra Z', 'barraz', 'triext', 'tri:', 'Tríceps (cabeza larga)', 'press frances inclinado|incline skull crusher', { i: 1, f: 'skull', req: 'banco_incl', s: 'En un banco inclinado; baja la barra detrás de la cabeza.' });
catC('declskull', 'Press Francés Declinado', 'barraz', 'triext', 'tri:', 'Tríceps', 'press frances declinado|decline skull crusher', { i: 1, f: 'skull', req: 'banco_decl', s: 'En el banco declinado con los pies enganchados; baja la barra a la frente.' });
catC('jmpress', 'Press JM', 'barra', 'triext', 'tri:pecho', 'Tríceps|Pecho', 'jm press|press jm', { f: 'bench', req: 'banco', s: 'Agarre cerrado; baja la barra hacia la barbilla doblando los codos al frente, mitad press y mitad francés.' });
catC('tatepress', 'Press Tate', 'manc', 'triext', 'tri:', 'Tríceps', 'tate press|press tate', { i: 1, req: 'banco', s: 'Acostado, mancuernas sobre el pecho con las palmas hacia los pies; baja las puntas hacia el pecho abriendo los codos.',
  F: { k: -1, e: -1, hi: ['uarm'], arc: ['hand'], A: { hip: [100, 106], torso: 180, ankle: [142, 140], hand: [60, 58], foot: 0 }, B: { hip: [100, 106], torso: 180, ankle: [142, 140], hand: [74, 94], foot: 0 }, back: () => fFloor() + fBench(30, 112), front: p => fDumb(p.hand, 0) } });
catC('closebench', 'Press de Banca Agarre Cerrado', 'barra', 'hpush', 'tri:pecho,homb', 'Tríceps|Pecho|Hombro frontal', 'press cerrado|press banca agarre cerrado|press agarre estrecho|close grip bench press', { f: 'bench', req: 'banco', s: 'Manos a la anchura de los hombros y codos pegados al bajar.' });
catC('smithclose', 'Press Agarre Cerrado en Smith', 'smith', 'hpush', 'tri:pecho,homb', 'Tríceps|Pecho|Hombro frontal', 'press cerrado en multipower|smith close grip press', { f: 'bench', req: 'banco', s: 'Barra del Smith sobre la mitad del pecho, manos a la anchura de los hombros.' });
catC('dbclose', 'Press Agarre Cerrado con Mancuernas', 'manc', 'hpush', 'tri:pecho', 'Tríceps|Pecho', 'press cerrado con mancuernas|close grip dumbbell press|press de tricep con mancuernas', { f: 'dbbench', req: 'banco', s: 'Mancuernas juntas sobre el pecho, palmas mirándose y codos pegados.' });
catC('closefloor', 'Press en el Suelo Agarre Cerrado', 'barra', 'hpush', 'tri:pecho', 'Tríceps|Pecho', 'close grip floor press|floor press cerrado', { f: 'floorpress', s: 'Acostado en el suelo, barra con agarre cerrado; los codos tocan el piso y empujas.' });
catC('dbkick', 'Patada de Tríceps con Mancuerna', 'manc', 'triext', 'tri:', 'Tríceps', 'patada de triceps|kickback con mancuerna|triceps kickback', { i: 1, u: 1, req: 'banco', s: 'Inclinado con una mano en el banco; el brazo pegado al cuerpo y paralelo al suelo.',
  F: { k: -1, e: 1, hi: ['uarm'], arc: ['hand'], A: { hip: [70, 84], torso: -6, ankle: [76, 141], hand: [90, 108], foot: 0 }, B: { hip: [70, 84], torso: -6, ankle: [76, 141], hand: [66, 86], foot: 0 }, back: () => fFloor() + fL([88, 104], [150, 104], 6) + fL([96, 104], [96, 140], 4) + fL([142, 104], [142, 140], 4), front: p => fDumb(p.hand, 90) } });
catC('dbkick2', 'Patada de Tríceps con Dos Mancuernas', 'manc', 'triext', 'tri:', 'Tríceps', 'patada de triceps doble|double dumbbell kickback', { i: 1, f: 'dbkick', s: 'Inclinado con la espalda recta, los dos brazos pegados al cuerpo.' });
catC('cablekickt', 'Patada de Tríceps en Polea', 'polea_baja', 'triext', 'tri:', 'Tríceps', 'kickback en polea|cable kickback triceps', { i: 1, u: 1, f: 'dbkick', s: 'Inclinado frente a la polea baja, maneral sin agarre o cable directo.' });
catC('machtri', 'Extensión de Tríceps en Máquina', 'tri_maq', 'triext', 'tri:', 'Tríceps', 'triceps en maquina|machine triceps extension', { i: 1, f: 'preacher', s: 'Codos sobre la almohadilla, alineados con el eje; empuja hacia abajo.' });
catC('machdip', 'Fondos en Máquina', 'fondos_maq', 'dip', 'tri:pecho,homb', 'Tríceps|Pecho bajo|Hombro frontal', 'fondos sentado|dip en maquina|seated dip machine', { s: 'Sentado con la espalda apoyada; empuja los agarres hacia abajo hasta estirar los brazos.',
  F: { k: -1, e: -1, hi: ['uarm'], A: { hip: [76, 112], torso: -95, ankle: [112, 140], hand: [80, 94], foot: 0 }, B: { hip: [76, 112], torso: -95, ankle: [112, 140], hand: [80, 116], foot: 0 }, back: () => cfSeat(78, 118), front: p => fBar(p.hand, 0, 10, 4) } });
catC('weightbenchdip', 'Fondos en Banco con Peso', 'cuerpo', 'dip', 'tri:pecho', 'Tríceps|Pecho', 'fondos en banco con disco|weighted bench dips', { f: 'benchdip', req: 'banco', s: 'Disco sobre los muslos; baja hasta unos 90° de codo.', fr: p => fC([p.hip[0] + 20, p.hip[1] - 6], 8) });
catC('tridips', 'Fondos para Tríceps', 'paralelas', 'dip', 'tri:pecho,homb', 'Tríceps|Pecho|Hombro frontal', 'fondos de triceps|fondos torso recto|triceps dips', { bw: 1, f: 'dips', s: 'Torso recto y codos hacia atrás; baja hasta 90°.' });
catC('bandtri', 'Extensión de Tríceps con Banda', 'banda', 'triext', 'tri:', 'Tríceps', 'triceps con liga|band pushdown', { i: 1, f: 'triceps', s: 'Banda anclada arriba; estira los brazos con los codos pegados.' });

/* =========================== ANTEBRAZOS =========================== */
catC('wristcurl', 'Curl de Muñeca con Barra', 'barra', 'wrist', 'ante:', 'Antebrazo (flexores)', 'curl de muneca|antebrazo con barra|wrist curl', { i: 1, bar: 10, reps: '12-20', s: 'Sentado, antebrazos sobre los muslos y palmas hacia arriba; las muñecas por fuera de las rodillas.',
  F: { k: -1, e: 1, hi: ['farm'], A: { hip: [80, 112], torso: -80, ankle: [118, 140], hand: [114, 108], foot: 0 }, B: { hip: [80, 112], torso: -80, ankle: [118, 140], hand: [116, 96], foot: 0 }, back: () => cfSeat(80, 118, false), front: p => fPlate(p.hand) } });
catC('revwrist', 'Curl de Muñeca Invertido', 'barra', 'wrist', 'ante:', 'Antebrazo (extensores)', 'curl de muneca invertido|extensores de antebrazo|reverse wrist curl', { i: 1, bar: 10, reps: '12-20', f: 'wristcurl', s: 'Igual que el curl de muñeca pero con las palmas hacia abajo; peso ligero.' });
catC('dbwrist', 'Curl de Muñeca con Mancuernas', 'manc', 'wrist', 'ante:', 'Antebrazo (flexores)', 'dumbbell wrist curl|curl de muneca mancuerna', { i: 1, reps: '12-20', f: 'wristcurl', s: 'Antebrazos sobre los muslos o un banco, una mancuerna en cada mano.' });
catC('cablewrist', 'Curl de Muñeca en Polea', 'polea_baja', 'wrist', 'ante:', 'Antebrazo (flexores)', 'cable wrist curl|curl de muneca con cable', { i: 1, reps: '12-20', f: 'wristcurl', s: 'Barra corta en la polea baja; antebrazos apoyados en los muslos.' });
catC('behindwrist', 'Curl de Muñeca tras la Espalda con Barra', 'barra', 'wrist', 'ante:', 'Antebrazo (flexores)', 'behind the back wrist curl|curl de muneca por detras', { i: 1, reps: '12-20', f: 'bbshrugback', s: 'De pie, barra detrás de los glúteos; sube solo doblando las muñecas.' });
catC('roller', 'Rodillo de Muñeca', 'rodillo', 'wrist', 'ante:homb', 'Antebrazo|Hombros', 'wrist roller|rodillo de antebrazo|enrollador', { i: 1, reps: '2-4 subidas', s: 'Brazos estirados al frente; enrolla la cuerda girando las muñecas hasta subir el peso y bájalo igual.',
  F: { k: -1, e: 1, hi: ['farm'], A: { hip: [95, 68], torso: -90, ankle: [98, 141], hand: [142, 30], foot: 0 }, B: { hip: [95, 68], torso: -90, ankle: [98, 141], hand: [142, 26], foot: 0 }, back: () => fFloor(), front: p => fBar(p.hand, 90, 12, 4) + fL(p.hand, [p.hand[0], 108 - (30 - p.hand[1]) * 6], 1.5) + fC([p.hand[0], 116 - (30 - p.hand[1]) * 6], 7) } });
catC('pinch', 'Pinza con Discos', 'disco', 'grip', 'ante:', 'Antebrazo (agarre)', 'plate pinch|pinza de discos|agarre de pinza', { i: 1, reps: '20-40 s', f: 'farmer', s: 'Sujeta dos discos lisos juntos con la punta de los dedos, brazo estirado al costado.' });
catC('pronation', 'Pronación y Supinación con Mancuerna', 'manc', 'wrist', 'ante:', 'Antebrazo', 'pronacion y supinacion|giro de antebrazo|forearm rotation', { i: 1, reps: '10-15', f: 'wristcurl', s: 'Antebrazo apoyado, sujeta la mancuerna por un extremo y gírala lento a cada lado.' });
catC('fingercurl', 'Curl de Dedos con Barra', 'barra', 'grip', 'ante:', 'Antebrazo (agarre)', 'finger curl|curl de dedos', { i: 1, bar: 10, reps: '12-20', f: 'wristcurl', s: 'Deja rodar la barra hasta la punta de los dedos y ciérralos para subirla.' });
catC('deadhang', 'Colgarse de la Barra', 'dominadas', 'grip', 'ante:esp', 'Antebrazo (agarre)|Dorsales', 'dead hang|colgado en barra|agarre en barra', { bw: 1, reps: '20-45 s', s: 'Cuélgate con los brazos estirados y los hombros activos.',
  F: { rig: 'front', hi: ['farm'], A: { hip: [100, 104], uL: -100, fL: -95, uR: -80, fR: -85, tL: 94, sL: 100, tR: 86, sR: 80 }, B: { hip: [100, 104], uL: -100, fL: -95, uR: -80, fR: -85, tL: 96, sL: 98, tR: 84, sR: 82 }, back: () => fL([30, 8], [170, 8], 5), front: p => fC(p.handL, 3.5) + fC(p.handR, 3.5) } });

/* =========================== CUÁDRICEPS =========================== */
catC('hlegpress', 'Prensa Horizontal', 'prensa_h', 'squat', 'cuad:glu', 'Cuádriceps|Glúteos', 'prensa horizontal|prensa sentado|seated leg press', { s: 'Espalda pegada al respaldo, pies en el centro de la plataforma a la anchura de los hombros.',
  F: { k: -1, e: 1, hi: ['thigh', 'glute'], A: { hip: [70, 110], torso: -110, ankle: [116, 90], hand: [84, 112], foot: -90 }, B: { hip: [70, 110], torso: -110, ankle: [140, 98], hand: [84, 112], foot: -90 },
    back: () => fFloor() + fL([66, 116], [50, 72], 8) + fL([60, 118], [92, 118], 6) + fL([75, 118], [75, 140], 4), front: p => fBar(fadd(p.ankle, 0, 4), 90, 40, 6) } });
catC('slpress', 'Prensa a una Pierna', 'prensa', 'squat', 'cuad:glu', 'Cuádriceps|Glúteos', 'prensa unilateral|single leg press', { u: 1, f: 'prensa', s: 'Un pie en el centro de la plataforma; baja solo hasta donde la cadera no se despegue.' });
catC('narrowpress', 'Prensa Pies Juntos', 'prensa', 'squat', 'cuad:', 'Cuádriceps', 'prensa pies juntos|narrow stance leg press', { f: 'prensa', s: 'Pies juntos en la parte baja de la plataforma para cargar más el cuádriceps.' });
catC('highpress', 'Prensa con Pies Altos', 'prensa', 'squat', 'glu:isq,cuad', 'Glúteos|Isquiotibiales|Cuádriceps', 'prensa pies altos|high foot leg press', { f: 'prensa', s: 'Pies en la parte alta de la plataforma y algo más abiertos: trabaja más glúteo e isquios.' });
catC('pendulum', 'Sentadilla Péndulo', 'pendulo', 'squat', 'cuad:glu', 'Cuádriceps|Glúteos', 'sentadilla pendulo|pendulo|pendulum squat', { f: 'hack', s: 'Hombros bajo las almohadillas, pies en el centro; baja profundo con la espalda apoyada.' });
catC('vsquat', 'Sentadilla V en Máquina', 'vsquat', 'squat', 'cuad:glu', 'Cuádriceps|Glúteos', 'v squat|sentadilla v|maquina v squat', { f: 'hack', s: 'De frente a la máquina, hombros bajo las almohadillas; baja con el torso inclinado y estable.' });
catC('narrowhack', 'Sentadilla Hack Pies Juntos', 'hack', 'squat', 'cuad:', 'Cuádriceps', 'hack pies juntos|narrow hack squat', { f: 'hack', s: 'Pies juntos y algo más abajo en la plataforma.' });
catC('bbhack', 'Sentadilla Hack con Barra', 'barra', 'squat', 'cuad:glu', 'Cuádriceps|Glúteos', 'barbell hack squat|hack con barra', { f: 'deadlift', s: 'La barra va detrás de las piernas; sube como un peso muerto con el torso más recto.' });
catC('beltsquat', 'Sentadilla con Cinturón', 'beltsq', 'squat', 'cuad:glu', 'Cuádriceps|Glúteos', 'belt squat|sentadilla belt|sentadilla con cinturon', { f: 'bwsquat', s: 'Cinturón con el peso colgando de la cadera; baja sin carga en la espalda.', fr: p => fL(p.hip, [p.hip[0], 128], 2) + fPlate([p.hip[0], 132]) });
catC('sllegext', 'Extensión de Pierna a una Pierna', 'ext', 'kext', 'cuad:', 'Cuádriceps', 'extension unilateral|extension a una pierna|single leg extension', { i: 1, u: 1, f: 'legext', s: 'Igual que la extensión, una pierna a la vez.' });
catC('frontsquat', 'Sentadilla Frontal', 'barra', 'squat', 'cuad:glu,abd', 'Cuádriceps|Glúteos|Core', 'sentadilla delantera|front squat|sentadilla frontal con barra', { s: 'Barra sobre la parte delantera de los hombros con los codos altos.',
  F: { k: -1, e: 1, hi: ['thigh', 'glute'], A: { hip: [95, 68], torso: -88, ankle: [100, 141], handRel: [14, -2], foot: 0 }, B: { hip: [84, 102], torso: -72, ankle: [100, 141], handRel: [14, -2], foot: 0 }, back: () => fFloor(), front: p => fPlate(fadd(p.sh, 30, 10)) } });
catC('kbfrontsquat', 'Sentadilla Frontal con Kettlebells', 'kb', 'squat', 'cuad:glu', 'Cuádriceps|Glúteos', 'double kettlebell front squat|sentadilla con kettlebells', { f: 'frontsquat', s: 'Dos kettlebells apoyadas en los antebrazos, frente a los hombros.' });
catC('zercher', 'Sentadilla Zercher', 'barra', 'squat', 'cuad:abd,glu', 'Cuádriceps|Core|Glúteos', 'zercher squat|sentadilla zercher', { s: 'La barra en el pliegue de los codos, pegada al cuerpo.',
  F: { k: -1, e: -1, hi: ['thigh', 'torso'], A: { hip: [95, 68], torso: -88, ankle: [100, 141], handRel: [20, 18], foot: 0 }, B: { hip: [84, 102], torso: -70, ankle: [100, 141], handRel: [20, 18], foot: 0 }, back: () => fFloor(), front: p => fPlate(p.hand) } });
catC('boxsquat', 'Sentadilla al Cajón', 'barra', 'squat', 'cuad:glu', 'Cuádriceps|Glúteos', 'box squat|sentadilla a la caja|sentadilla al banco', { f: 'squat', req: 'cajon', s: 'Cajón detrás de ti a la altura de la rodilla; siéntate apenas y sube sin rebotar.', bk: () => fR(52, 106, 26, 35) });
catC('sumobb', 'Sentadilla Sumo con Barra', 'barra', 'squat', 'cuad:glu', 'Cuádriceps|Aductores|Glúteos', 'sumo squat con barra|barbell sumo squat', { f: 'squat', s: 'Pies muy abiertos y puntas hacia afuera; las rodillas siguen a las puntas.' });
catC('landsquat', 'Sentadilla en Landmine', 'landmine', 'squat', 'cuad:glu', 'Cuádriceps|Glúteos', 'landmine squat|sentadilla landmine', { f: 'goblet', s: 'Sujeta la punta de la barra en esquina frente al pecho y baja con el torso recto.' });
catC('heelgoblet', 'Sentadilla Goblet con Talones Elevados', 'manc', 'squat', 'cuad:', 'Cuádriceps', 'goblet talones elevados|heels elevated goblet squat', { f: 'goblet', s: 'Talones sobre un disco o cuña; baja con el torso recto y las rodillas al frente.' });
catC('dbsquat', 'Sentadilla con Mancuernas', 'manc', 'squat', 'cuad:glu', 'Cuádriceps|Glúteos', 'dumbbell squat|sentadilla mancuernas', { s: 'Una mancuerna en cada mano, a los lados.',
  F: { k: -1, e: 1, hi: ['thigh', 'glute'], A: { hip: [95, 68], torso: -86, ankle: [100, 141], handRel: [3, 47], foot: 0 }, B: { hip: [80, 102], torso: -62, ankle: [100, 141], handRel: [8, 46], foot: 0 }, back: () => fFloor(), front: p => fDumbV(p.hand) } });
catC('bblunge', 'Zancadas con Barra', 'barra', 'lunge', 'cuad:glu', 'Cuádriceps|Glúteos', 'zancadas con barra|estocadas con barra|barbell lunge', { u: 1, s: 'Barra sobre la espalda alta; da un paso largo y baja.',
  F: { k: -1, e: 1, hi: ['thigh', 'glute'], A: { hip: [92, 70], torso: -90, ankle: [118, 141], handRel: [-14, 4], foot: 0 }, B: { hip: [86, 100], torso: -88, ankle: [118, 141], handRel: [-14, 4], foot: 0 }, back: p => fFloor() + legBack(p, [44, 140]), front: p => fPlate(fadd(p.sh, 180, 4)) } });
catC('smithlunge', 'Zancadas en Smith', 'smith', 'lunge', 'cuad:glu', 'Cuádriceps|Glúteos', 'zancadas multipower|smith lunge', { u: 1, f: 'bblunge', s: 'Barra del Smith sobre la espalda alta, pies separados adelante y atrás.' });
catC('bbrevlunge', 'Zancada Inversa con Barra', 'barra', 'lunge', 'cuad:glu', 'Cuádriceps|Glúteos', 'reverse lunge con barra|estocada inversa con barra', { u: 1, f: 'bblunge', s: 'Barra sobre la espalda alta; da el paso hacia atrás.' });
catC('smithrevlunge', 'Zancada Inversa en Smith', 'smith', 'lunge', 'cuad:glu', 'Cuádriceps|Glúteos', 'reverse lunge en smith|zancada atras multipower', { u: 1, f: 'bblunge', s: 'Barra del Smith en la espalda; baja la rodilla de atrás hacia el suelo.' });
catC('smithbulg', 'Sentadilla Búlgara en Smith', 'smith', 'lunge', 'cuad:glu', 'Cuádriceps|Glúteos', 'bulgara en smith|bulgara multipower', { u: 1, req: 'banco', s: 'Barra del Smith en la espalda y el pie de atrás sobre un banco.',
  F: { k: -1, e: 1, hi: ['thigh', 'glute'], A: { hip: [96, 70], torso: -88, ankle: [118, 141], handRel: [-14, 4], foot: 0 }, B: { hip: [90, 98], torso: -82, ankle: [118, 141], handRel: [-14, 4], foot: 0 }, back: p => fFloor() + fL([22, 110], [58, 110], 7) + fL([30, 110], [30, 140], 4) + legBack(p, [52, 106]), front: p => fPlate(fadd(p.sh, 180, 4)) } });
catC('bbbulg', 'Sentadilla Búlgara con Barra', 'barra', 'lunge', 'cuad:glu', 'Cuádriceps|Glúteos', 'bulgara con barra|barbell bulgarian split squat', { u: 1, f: 'smithbulg', req: 'banco', s: 'Barra en la espalda alta y el pie de atrás sobre un banco.' });
catC('splitsquat', 'Sentadilla Dividida', 'manc', 'lunge', 'cuad:glu', 'Cuádriceps|Glúteos', 'split squat|zancada estatica|sentadilla estatica', { u: 1, f: 'lunge', s: 'Pies separados adelante y atrás; sube y baja sin mover los pies.' });
catC('revlunge', 'Zancada Inversa', 'manc', 'lunge', 'cuad:glu', 'Cuádriceps|Glúteos', 'zancada hacia atras|estocada inversa|reverse lunge', { u: 1, f: 'lunge', s: 'Da el paso hacia atrás y baja; vuelve empujando con la pierna de adelante.' });
catC('deficitlunge', 'Zancada con Déficit', 'manc', 'lunge', 'cuad:glu', 'Cuádriceps|Glúteos', 'deficit lunge|zancada desde step', { u: 1, f: 'lunge', req: 'cajon', s: 'Pie de adelante sobre un step bajo para bajar más.' });
catC('walklunge', 'Zancadas Caminando', 'manc', 'lunge', 'cuad:glu', 'Cuádriceps|Glúteos', 'walking lunge|zancadas caminando|estocadas caminando', { u: 1, f: 'lunge', s: 'Avanza con pasos largos alternando las piernas.' });
catC('latlunge', 'Zancada Lateral', 'manc', 'lunge', 'cuad:adu,glu', 'Cuádriceps|Aductores|Glúteos', 'lateral lunge|estocada lateral', { u: 1, s: 'Da un paso amplio al lado y baja sobre esa pierna; la otra queda estirada.',
  F: { rig: 'front', hi: ['thigh'], A: { hip: [100, 70], uL: 80, fL: 85, uR: 100, fR: 95, tL: 108, sL: 100, tR: 72, sR: 80 }, B: { hip: [84, 92], uL: 80, fL: 85, uR: 100, fR: 95, tL: 125, sL: 80, tR: 40, sR: 40 }, back: () => fFloor(147), front: p => fDumbV([(p.handL[0] + p.handR[0]) / 2, (p.handL[1] + p.handR[1]) / 2]) } });
catC('cossack', 'Sentadilla Cosaca', 'cuerpo', 'lunge', 'cuad:adu', 'Cuádriceps|Aductores', 'cossack squat|sentadilla cosaca', { u: 1, bw: 1, f: 'latlunge', s: 'Pies muy abiertos; baja a un lado hasta abajo con la otra pierna estirada y la punta hacia arriba.' });
catC('curtsy', 'Zancada Cruzada', 'manc', 'lunge', 'glu:cuad', 'Glúteos|Cuádriceps|Glúteo medio', 'curtsy lunge|zancada de reverencia', { u: 1, f: 'lunge', s: 'Lleva la pierna de atrás cruzada en diagonal por detrás de la de adelante.' });
catC('dbstepup', 'Subida al Cajón con Mancuernas', 'manc', 'lunge', 'cuad:glu', 'Cuádriceps|Glúteos', 'step up con mancuernas|subida al banco con mancuernas', { u: 1, f: 'stepup', req: 'cajon', s: 'Un pie entero sobre el cajón; sube empujando con esa pierna, sin impulso de la de abajo.', fr: p => fDumbV([p.sh[0] + 3, p.sh[1] + 47]) });
catC('bbstepup', 'Subida al Cajón con Barra', 'barra', 'lunge', 'cuad:glu', 'Cuádriceps|Glúteos', 'barbell step up|step up con barra', { u: 1, f: 'stepup', req: 'cajon', s: 'Barra en la espalda alta; cajón a la altura de la rodilla o más bajo.', fr: p => fPlate(fadd(p.sh, 180, 4)) });
catC('latstepup', 'Subida al Cajón Lateral', 'cajon', 'lunge', 'cuad:glu', 'Cuádriceps|Glúteo medio', 'lateral step up|step up lateral', { u: 1, bw: 1, f: 'stepup', s: 'De lado al cajón; sube con la pierna cercana.' });
catC('sissy', 'Sentadilla Sissy', 'cuerpo', 'squat', 'cuad:', 'Cuádriceps', 'sissy squat|sentadilla sissy', { i: 1, bw: 1, reps: '8-15', s: 'Agárrate de un soporte; lleva las rodillas al frente y el cuerpo hacia atrás en línea recta.',
  F: { k: -1, e: 1, hi: ['thigh'], A: { hip: [96, 68], torso: -90, ankle: [100, 141], handRel: [12, 8], foot: 0 }, B: { hip: [104, 98], torso: -112, ankle: [100, 141], handRel: [12, 8], foot: 40 }, back: () => fFloor() + fL([150, 40], [150, 141], 4) } });
catC('pistol', 'Sentadilla a una Pierna Asistida', 'cuerpo', 'squat', 'cuad:glu', 'Cuádriceps|Glúteos', 'sentadilla a una pierna con apoyo|assisted pistol squat', { u: 1, bw: 1, f: 'bwsquat', s: 'Agárrate de un soporte y baja sobre una pierna con la otra al frente.', bk: () => fL([150, 40], [150, 141], 4) });
catC('pistolfree', 'Sentadilla Pistol', 'cuerpo', 'squat', 'cuad:glu', 'Cuádriceps|Glúteos', 'pistol squat|sentadilla pistola', { u: 1, bw: 1, f: 'bwsquat', reps: '3-8', s: 'Sin apoyo: baja sobre una pierna con la otra estirada al frente; puedes sostener una kettlebell como contrapeso.' });

/* =========================== ISQUIOTIBIALES =========================== */
catC('sllegcurl', 'Curl Femoral Tumbado a una Pierna', 'curl_tum', 'kflex', 'isq:', 'Isquiotibiales', 'curl femoral unilateral tumbado|single leg lying curl', { i: 1, u: 1, f: 'legcurl', s: 'Igual que el curl tumbado, con una pierna a la vez.' });
catC('slseatcurl', 'Curl Femoral Sentado a una Pierna', 'curl_sen', 'kflex', 'isq:', 'Isquiotibiales', 'curl femoral unilateral sentado|single leg seated curl', { i: 1, u: 1, f: 'seatedlegcurl', s: 'Igual que el curl sentado, con una pierna a la vez.' });
catC('standcurl', 'Curl Femoral de Pie', 'curl_pie', 'kflex', 'isq:', 'Isquiotibiales', 'curl femoral parado|standing leg curl', { i: 1, u: 1, s: 'De pie en la máquina con el rodillo sobre el talón; el muslo queda fijo.',
  F: { k: 1, e: 1, hi: ['thigh'], A: { hip: [95, 68], torso: -84, ankle: [97, 141], hand: [124, 50], foot: 0 }, B: { hip: [95, 68], torso: -84, ankle: [70, 100], hand: [124, 50], foot: 60 }, back: p => fFloor() + legBack(p, [104, 141]) + fL([128, 30], [128, 141], 6), front: p => fC(fadd(p.ankle, -90, 6), 5) } });
catC('cablelegcurl', 'Curl Femoral en Polea', 'polea_baja', 'kflex', 'isq:', 'Isquiotibiales', 'curl femoral con cable|cable leg curl', { i: 1, u: 1, f: 'standcurl', s: 'Tobillera en la polea baja, de frente a ella; lleva el talón al glúteo.', fr: p => fCable(p.ankle, [171, 134]) });
catC('dblegcurl', 'Curl Femoral con Mancuerna', 'manc', 'kflex', 'isq:', 'Isquiotibiales', 'curl femoral con mancuerna|dumbbell leg curl', { i: 1, f: 'legcurl', req: 'banco', s: 'Boca abajo en un banco con una mancuerna sujeta entre los pies.', fr: p => fDumbV(fadd(p.ankle, 0, 4)) });
catC('bandlegcurl', 'Curl Femoral con Banda', 'banda', 'kflex', 'isq:', 'Isquiotibiales', 'curl femoral con liga|band leg curl', { i: 1, f: 'legcurl', s: 'Boca abajo con la banda anclada delante de los pies y en los tobillos.' });
catC('ballcurl', 'Curl Femoral con Fitball', 'fitball', 'kflex', 'isq:glu', 'Isquiotibiales|Glúteos', 'stability ball leg curl|curl femoral en pelota|curl con fitball', { bw: 1, s: 'Acostado con los talones sobre la pelota y la cadera arriba; acerca la pelota doblando las rodillas.',
  F: { k: -1, e: 1, hi: ['thigh', 'glute'], A: { hip: [100, 120], torso: 175, ankle: [168, 116], hand: [70, 138], foot: 0 }, B: { hip: [104, 106], torso: 165, ankle: [136, 116], hand: [70, 138], foot: 0 }, back: () => fFloor(), front: p => fC([p.ankle[0] + 8, 128], 13) } });
catC('sliders', 'Deslizamientos de Femoral', 'sliders', 'kflex', 'isq:glu', 'Isquiotibiales|Glúteos', 'slider leg curl|deslizamientos femoral|curl con toalla', { bw: 1, f: 'ballcurl', s: 'Talones sobre discos deslizantes o una toalla, cadera arriba; acerca y aleja los talones.' });
catC('nordic', 'Curl Nórdico', 'cuerpo', 'kflex', 'isq:', 'Isquiotibiales', 'nordic curl|curl nordico|nordicos', { bw: 1, reps: '3-8', s: 'De rodillas con los tobillos sujetos; déjate caer adelante lo más lento que puedas con el cuerpo recto.',
  F: { k: 1, e: 1, hi: ['thigh'], A: { hip: [92, 100], torso: -90, ankle: [56, 138], handRel: [8, 8], foot: 0 }, B: { hip: [119, 111], torso: -45, ankle: [56, 138], handRel: [10, 12], foot: 0 }, back: () => fFloor() + fC([52, 132], 5) } });
catC('bandnordic', 'Curl Nórdico Asistido con Banda', 'banda', 'kflex', 'isq:', 'Isquiotibiales', 'nordic con banda|banded nordic curl', { bw: 1, reps: '5-8', f: 'nordic', s: 'Banda anclada arriba y sujeta al pecho para que te frene al caer.' });
catC('ghr', 'Glúteo-Femoral (GHR)', 'ghd', 'kflex', 'isq:glu', 'Isquiotibiales|Glúteos', 'glute ham raise|ghr|elevacion gluteo femoral', { bw: 1, f: 'nordic', s: 'Tobillos bajo los rodillos del GHD y rodillas sobre la almohadilla.' });
catC('dbrdl', 'Peso Muerto Rumano con Mancuernas', 'manc', 'hinge', 'isq:glu', 'Isquiotibiales|Glúteos', 'rumano con mancuernas|peso muerto rumano mancuernas|dumbbell rdl', { f: 'rdl', s: 'Mancuernas delante de los muslos; bajan rozando las piernas.' });
catC('kbrdl', 'Peso Muerto Rumano con Kettlebell', 'kb', 'hinge', 'isq:glu', 'Isquiotibiales|Glúteos', 'rumano con kettlebell|kettlebell rdl', { f: 'rdl', s: 'Una o dos kettlebells frente a los muslos.' });
catC('smithrdl', 'Peso Muerto Rumano en Smith', 'smith', 'hinge', 'isq:glu', 'Isquiotibiales|Glúteos', 'rumano en smith|rumano multipower|smith rdl', { f: 'rdl', s: 'Barra del Smith frente a los muslos; la barra sube y baja en vertical.' });
catC('cablerdl', 'Peso Muerto Rumano en Polea', 'polea_baja', 'hinge', 'isq:glu', 'Isquiotibiales|Glúteos', 'rumano en polea|cable rdl', { f: 'rdl', s: 'Barra recta en la polea baja, un paso alejado de ella.', fr: p => fCable(p.hand, [171, 134]) + fBar(p.hand, 90, 10, 4) });
catC('sldl', 'Peso Muerto Piernas Rígidas', 'barra', 'hinge', 'isq:lumb,glu', 'Isquiotibiales|Espalda baja|Glúteos', 'piernas rigidas|peso muerto piernas rectas|stiff leg deadlift|sldl', { f: 'rdl', s: 'Rodillas casi rectas; la barra baja hasta donde la espalda siga recta.' });
catC('dbsldl', 'Peso Muerto Piernas Rígidas con Mancuernas', 'manc', 'hinge', 'isq:lumb', 'Isquiotibiales|Espalda baja', 'piernas rigidas con mancuernas|dumbbell stiff leg deadlift', { f: 'rdl', s: 'Mancuernas frente a los muslos y rodillas casi rectas.' });
catC('goodmorning', 'Buenos Días', 'barra', 'hinge', 'isq:lumb,glu', 'Isquiotibiales|Espalda baja|Glúteos', 'good morning|buenos dias con barra', { reps: '8-12', s: 'Barra sobre la espalda alta; inclínate llevando la cadera atrás con la espalda recta.',
  F: { k: -1, e: 1, hi: ['thigh', 'torso'], A: { hip: [95, 68], torso: -88, ankle: [100, 141], handRel: [-14, 4], foot: 0 }, B: { hip: [80, 74], torso: -14, ankle: [100, 141], handRel: [-6, -10], foot: 0 }, back: () => fFloor(), front: p => fPlate(fadd(p.sh, -90, 6)) } });
catC('smithgm', 'Buenos Días en Smith', 'smith', 'hinge', 'isq:lumb', 'Isquiotibiales|Espalda baja', 'good morning en smith|buenos dias multipower', { f: 'goodmorning', s: 'Barra del Smith sobre la espalda alta; inclínate llevando la cadera atrás.' });

/* =========================== GLÚTEOS =========================== */
catC('machht', 'Hip Thrust en Máquina', 'ht_maq', 'hipext', 'glu:isq', 'Glúteos|Isquiotibiales', 'hip thrust maquina|empuje de cadera en maquina|machine hip thrust', { f: 'hipthrust', s: 'Espalda alta en el respaldo y el cinturón sobre la cadera.' });
catC('smithht', 'Hip Thrust en Smith', 'smith', 'hipext', 'glu:isq', 'Glúteos|Isquiotibiales', 'hip thrust multipower|smith hip thrust', { f: 'hipthrust', req: 'banco', s: 'Banco detrás bajo el Smith; la barra sobre la cadera con una almohadilla.' });
catC('dbht', 'Hip Thrust con Mancuerna', 'manc', 'hipext', 'glu:isq', 'Glúteos|Isquiotibiales', 'dumbbell hip thrust|hip thrust mancuerna', { f: 'hipthrust', req: 'banco', s: 'Mancuerna sobre la cadera, sujeta con las manos.' });
catC('bandht', 'Hip Thrust con Banda', 'banda', 'hipext', 'glu:', 'Glúteos', 'banded hip thrust|hip thrust con liga', { f: 'hipthrust', req: 'banco', s: 'Banda sobre la cadera sujeta bajo las manos o en el banco.' });
catC('slht', 'Hip Thrust a una Pierna', 'cuerpo', 'hipext', 'glu:isq', 'Glúteos|Isquiotibiales', 'hip thrust unilateral|single leg hip thrust', { u: 1, bw: 1, f: 'hipthrust', req: 'banco', s: 'Espalda alta en el banco y un pie en el suelo; la otra pierna doblada arriba.', fr: () => '' });
catC('bbbridge', 'Puente de Glúteo con Barra', 'barra', 'hipext', 'glu:isq', 'Glúteos|Isquiotibiales', 'puente con barra|barbell glute bridge', { f: 'glutebridge', s: 'Acostado en el suelo con la barra sobre la cadera.', fr: p => fPlate([p.hip[0] + 1, p.hip[1] - 11]) });
catC('smithbridge', 'Puente de Glúteo en Smith', 'smith', 'hipext', 'glu:', 'Glúteos', 'puente en smith|smith glute bridge', { f: 'glutebridge', s: 'Acostado bajo el Smith con la barra sobre la cadera.', fr: p => fPlate([p.hip[0] + 1, p.hip[1] - 11]) });
catC('frogpump', 'Frog Pump', 'cuerpo', 'hipext', 'glu:', 'Glúteos', 'frog pump|puente de rana', { bw: 1, reps: '15-30', f: 'glutebridge', s: 'Acostado con las plantas de los pies juntas y las rodillas abiertas.' });
catC('machkick', 'Patada de Glúteo en Máquina', 'patada_maq', 'hipext', 'glu:', 'Glúteos', 'patada de gluteo maquina|maquina de patada|glute kickback machine', { i: 1, u: 1, f: 'cablekick', s: 'Torso apoyado y el pie en la plataforma; empuja hacia atrás sin arquear la espalda.' });
catC('smithkick', 'Patada de Glúteo en Smith', 'smith', 'hipext', 'glu:', 'Glúteos', 'smith kickback|patada en multipower', { i: 1, u: 1, f: 'quadkick', s: 'En cuatro apoyos bajo el Smith, el talón empuja la barra hacia arriba.' });
catC('bandkick', 'Patada de Glúteo con Banda', 'banda', 'hipext', 'glu:', 'Glúteos', 'band kickback|patada con liga', { i: 1, u: 1, bw: 1, f: 'quadkick', s: 'En cuatro apoyos con la banda en el pie y sujeta bajo las manos.' });
catC('quadkick', 'Patada de Glúteo en Cuadrupedia', 'cuerpo', 'hipext', 'glu:', 'Glúteos', 'patada de burro|patada en cuatro|donkey kick', { i: 1, u: 1, bw: 1, s: 'En cuatro apoyos, sube una pierna doblada hacia atrás y arriba sin arquear la espalda.',
  F: { k: 1, e: 1, hi: ['glute', 'thigh'], A: { hip: [116, 100], torso: 180, ankle: [150, 141], hand: [72, 140], foot: 0 }, B: { hip: [116, 100], torso: 180, ankle: [152, 62], hand: [72, 140], foot: -90 }, back: p => fFloor() + legBack(p, [150, 141], 1) } });
catC('cableabd', 'Abducción en Polea', 'polea_baja', 'abd', 'glu:', 'Glúteo medio', 'abduccion con cable|patada lateral en polea|cable hip abduction', { i: 1, u: 1, s: 'Tobillera en la polea baja en la pierna más lejana; ábrela hacia afuera.',
  F: { rig: 'front', hi: ['glute'], A: { hip: [100, 70], uL: 100, fL: 95, uR: 40, fR: -10, tL: 92, sL: 90, tR: 88, sR: 90 }, B: { hip: [100, 70], uL: 100, fL: 95, uR: 40, fR: -10, tL: 128, sL: 122, tR: 88, sR: 90 },
    back: () => fFloor(147) + fL([188, 4], [188, 147], 6), front: p => fCable(p.ankleL, [184, 140]) + fC(p.ankleL, 3) } });
catC('fwdabduct', 'Abducción en Máquina Inclinado hacia Delante', 'abductor', 'abd', 'glu:', 'Glúteo medio|Glúteo mayor', 'abduccion inclinado|forward lean hip abduction', { i: 1, f: 'abduct', s: 'En el abductor, inclina el torso adelante con la espalda recta.' });
catC('bandwalk', 'Caminata Lateral con Banda', 'banda', 'abd', 'glu:', 'Glúteo medio', 'caminata lateral|paso lateral con liga|band walk|lateral band walk', { bw: 1, reps: '10-15 pasos', s: 'Banda en las rodillas o los tobillos, semisentadilla; da pasos laterales sin juntar los pies.',
  F: { rig: 'front', hi: ['glute'], A: { hip: [100, 84], uL: 100, fL: 70, uR: 80, fR: 110, tL: 110, sL: 80, tR: 70, sR: 100 }, B: { hip: [100, 84], uL: 100, fL: 70, uR: 80, fR: 110, tL: 124, sL: 90, tR: 58, sR: 92 }, back: () => fFloor(147), front: p => fL(p.kneeL, p.kneeR, 2, 'var(--accent2)') } });
catC('monsterwalk', 'Caminata Monstruo con Banda', 'banda', 'abd', 'glu:', 'Glúteo medio', 'monster walk|caminata monstruo', { bw: 1, reps: '10-15 pasos', f: 'bandwalk', s: 'Banda en los tobillos; avanza en diagonal con pasos amplios y la cadera baja.' });
catC('clam', 'Almeja con Banda', 'banda', 'abd', 'glu:', 'Glúteo medio', 'clamshell|almeja|concha con liga', { i: 1, u: 1, bw: 1, reps: '15-20', s: 'Acostado de lado con las rodillas dobladas y la banda sobre ellas; abre la rodilla de arriba sin mover la cadera.',
  F: { rig: 'front', thighLen: 26, hi: ['glute'], A: { hip: [100, 96], uL: 100, fL: 80, uR: 80, fR: 100, tL: 96, sL: 60, tR: 84, sR: 120 }, B: { hip: [100, 96], uL: 100, fL: 80, uR: 80, fR: 100, tL: 140, sL: 60, tR: 84, sR: 120 }, back: () => fFloor(147), front: p => fL(p.kneeL, p.kneeR, 2, 'var(--accent2)') } });
catC('hydrant', 'Abducción en Cuadrupedia', 'cuerpo', 'abd', 'glu:', 'Glúteo medio', 'hidrante|fire hydrant|abduccion en cuatro', { i: 1, u: 1, bw: 1, f: 'quadkick', s: 'En cuatro apoyos, abre la rodilla doblada hacia el lado sin girar el torso.' });
catC('sidelegraise', 'Elevación Lateral de Pierna', 'cuerpo', 'abd', 'glu:', 'Glúteo medio', 'patada lateral acostado|abduccion acostado|side lying leg raise', { i: 1, u: 1, bw: 1, f: 'cableabd', fr: () => '', s: 'Acostado de lado, sube la pierna de arriba recta, sin girar la cadera.' });
catC('pullthrough', 'Pull-Through en Polea', 'polea_baja', 'hinge', 'glu:isq', 'Glúteos|Isquiotibiales', 'pull through|tiron entre piernas', { f: 'rdl', s: 'De espaldas a la polea baja con la cuerda entre las piernas; extiende la cadera.', fr: p => fCable(p.hand, [16, 134]) + fRope(p.hand), bk: () => fL([12, 4], [12, 141], 6) });
catC('revhyper', 'Hiperextensión Inversa', 'cuerpo', 'hipext', 'glu:isq,lumb', 'Glúteos|Isquiotibiales|Espalda baja', 'reverse hyper|hiper inversa|hiperextension inversa', { req: 'banco', s: 'Boca abajo con la cadera en el borde de un banco alto; sube las piernas hasta la línea del cuerpo.',
  F: { k: 1, e: 1, vb: '0 0 200 170', hi: ['glute'], A: { hip: [100, 92], torso: 180, ankle: [126, 160], hand: [50, 104], foot: 90 }, B: { hip: [100, 92], torso: 180, ankle: [172, 84], hand: [50, 104], foot: 0 }, back: () => fFloor(168) + fL([40, 100], [106, 100], 7) + fL([48, 100], [48, 168], 4) + fL([98, 100], [98, 168], 4) } });
catC('sumodl', 'Peso Muerto Sumo', 'barra', 'hinge', 'glu:cuad,isq,lumb', 'Glúteos|Aductores|Cuádriceps|Espalda baja', 'sumo deadlift|peso muerto sumo', { f: 'deadlift', s: 'Pies muy abiertos y manos por dentro de las piernas; rodillas hacia afuera.' });
catC('hexdl', 'Peso Muerto con Barra Hexagonal', 'hexbar', 'hinge', 'glu:cuad,isq,lumb', 'Glúteos|Cuádriceps|Isquiotibiales|Espalda baja', 'trap bar deadlift|peso muerto trap bar|peso muerto hexagonal', { f: 'deadlift', s: 'De pie dentro de la barra, agarres a los lados; sube empujando el suelo.' });
catC('sumosquat', 'Sentadilla Sumo con Mancuerna', 'manc', 'squat', 'glu:cuad', 'Glúteos|Aductores|Cuádriceps', 'sumo squat|sentadilla sumo|sentadilla plie', { s: 'Pies muy abiertos con las puntas afuera; una mancuerna colgando entre las piernas.',
  F: { rig: 'front', hi: ['glute', 'thigh'], A: { hip: [100, 70], uL: 65, fL: 80, uR: 115, fR: 100, tL: 115, sL: 95, tR: 65, sR: 85 }, B: { hip: [100, 96], uL: 65, fL: 80, uR: 115, fR: 100, tL: 160, sL: 95, tR: 20, sR: 85 }, back: () => fFloor(147), front: p => fDumb([(p.handL[0] + p.handR[0]) / 2, (p.handL[1] + p.handR[1]) / 2 + 5], 90) } });

/* =========================== ADUCTORES =========================== */
catC('cableadd', 'Aducción en Polea', 'polea_baja', 'add', 'adu:', 'Aductores', 'aduccion con cable|cable hip adduction', { i: 1, u: 1, s: 'Tobillera en la pierna cercana a la polea baja; crúzala por delante de la otra.',
  F: { rig: 'front', hi: ['thigh'], A: { hip: [100, 70], uL: 140, fL: 190, uR: 80, fR: 85, tL: 128, sL: 122, tR: 88, sR: 90 }, B: { hip: [100, 70], uL: 140, fL: 190, uR: 80, fR: 85, tL: 82, sL: 70, tR: 88, sR: 90 },
    back: () => fFloor(147) + fL([12, 4], [12, 147], 6), front: p => fCable(p.ankleL, [16, 140]) + fC(p.ankleL, 3) } });
catC('bandadd', 'Aducción con Banda', 'banda', 'add', 'adu:', 'Aductores', 'aduccion con liga|band adduction', { i: 1, u: 1, f: 'cableadd', s: 'Banda anclada a un lado a la altura del tobillo; cruza la pierna por delante.' });
catC('sideadd', 'Aducción Tumbado de Lado', 'cuerpo', 'add', 'adu:', 'Aductores', 'side lying adduction|aduccion acostado', { i: 1, u: 1, bw: 1, f: 'cableadd', fr: () => '', s: 'Acostado de lado, la pierna de arriba doblada al frente; sube la de abajo recta.' });
catC('copenhagen', 'Plancha Copenhague', 'cuerpo', 'add', 'adu:abd', 'Aductores|Core|Oblicuos', 'copenhagen plank|plancha de aductores', { bw: 1, reps: '15-30 s', f: 'plank', req: 'banco', s: 'Plancha lateral con la pierna de arriba sobre un banco; la de abajo sube a tocarlo.', bk: () => fR(150, 116, 30, 25) });
catC('smithsumopause', 'Sentadilla Sumo con Pausa en Smith', 'smith', 'squat', 'adu:cuad,glu', 'Aductores|Cuádriceps|Glúteos', 'sumo con pausa en smith|smith pause sumo squat', { f: 'smithsquat', s: 'Pies muy abiertos bajo el Smith; pausa de 2 s abajo antes de subir.' });

/* =========================== PANTORRILLAS =========================== */
catC('hackcalf', 'Elevación de Talones en Hack', 'hack', 'calf', 'pant:', 'Pantorrillas', 'gemelos en hack|pantorrillas en hack|hack calf raise', { i: 1, reps: '12-20', s: 'En la hack con las piernas estiradas y la parte delantera del pie en el borde bajo.',
  F: { k: -1, e: 1, hi: ['shin'], A: { hip: [100, 66], torso: -112, ankle: [120, 135], handRel: [9, 3], foot: -12 }, B: { hip: [100, 58], torso: -112, ankle: [120, 127], handRel: [9, 3], foot: 40 }, back: () => fFloor() + fL([66, 18], [112, 128], 5), front: p => fC(fadd(p.sh, -22, 7), 5) } });
catC('smithcalf', 'Elevación de Talones en Smith', 'smith', 'calf', 'pant:', 'Pantorrillas', 'gemelos en smith|pantorrillas en multipower|smith calf raise', { i: 1, reps: '12-20', f: 'calfstand', s: 'Barra del Smith en la espalda alta y la punta de los pies sobre un step.', fr: p => fPlate(fadd(p.sh, 180, 4)) });
catC('bbcalf', 'Elevación de Talones de Pie con Barra', 'barra', 'calf', 'pant:', 'Gemelos', 'gemelos con barra|barbell calf raise', { i: 1, reps: '12-20', f: 'calfstand', req: 'cajon', s: 'Barra en la espalda alta y la punta de los pies sobre un step.', fr: p => fPlate(fadd(p.sh, 180, 4)) });
catC('dbcalf', 'Elevación de Talones con Mancuernas', 'manc', 'calf', 'pant:', 'Pantorrillas', 'gemelos con mancuernas|pantorrillas con mancuernas|dumbbell calf raise', { i: 1, reps: '12-20', f: 'calfstand', s: 'Una mancuerna en cada mano, la punta de los pies sobre un step.', fr: p => fDumbV(p.hand) });
catC('slcalf', 'Elevación de Talones a una Pierna con Mancuerna', 'manc', 'calf', 'pant:', 'Pantorrillas', 'gemelos a una pierna|pantorrilla unilateral|single leg calf raise', { i: 1, u: 1, reps: '10-15', f: 'calfstand', s: 'Un pie sobre el step y la mancuerna del mismo lado; la otra mano se apoya.', fr: p => fDumbV(p.hand) });
catC('machcalf1', 'Elevación de Talones en Máquina a una Pierna', 'gem_pie', 'calf', 'pant:', 'Gemelos', 'gemelos unilateral en maquina|single leg machine calf raise', { i: 1, u: 1, reps: '10-15', f: 'calfstand', s: 'En la de gemelos de pie, un pie en el borde y el otro en el aire.' });
catC('stepcalf', 'Elevación de Talones en Escalón', 'cuerpo', 'calf', 'pant:', 'Pantorrillas', 'gemelos en escalon|pantorrillas en escalon|gemelos sin peso|calf raise en escalon', { i: 1, bw: 1, reps: '15-25', f: 'calfstand', s: 'La punta de los pies sobre un escalón y una mano en la pared.' });
catC('bandcalf', 'Elevación de Talones con Banda', 'banda', 'calf', 'pant:', 'Gemelos', 'gemelos con liga|band calf raise', { i: 1, reps: '15-25', f: 'calfstand', s: 'Banda bajo la punta de los pies y sobre los hombros o en las manos.' });
catC('calfpress1', 'Elevación de Talones en Prensa a una Pierna', 'prensa', 'calf', 'pant:', 'Gemelos', 'gemelos en prensa unilateral|single leg calf press', { i: 1, u: 1, reps: '10-15', f: 'calfpress', s: 'En la prensa, un solo pie en el borde bajo de la plataforma.' });
catC('bbseatcalf', 'Elevación de Talones Sentado con Barra', 'barra', 'calf', 'pant:', 'Sóleo (pantorrilla)', 'gemelos sentado con barra|seated barbell calf raise', { i: 1, reps: '15-20', f: 'calfseat', req: 'banco', s: 'Sentado con la barra acolchada sobre las rodillas y la punta de los pies en un step.' });
catC('dbseatcalf1', 'Elevación de Talones Sentado con Mancuerna a una Pierna', 'manc', 'calf', 'pant:', 'Sóleo (pantorrilla)', 'gemelo sentado con mancuerna|seated single leg calf raise', { i: 1, u: 1, reps: '15-20', f: 'calfseat', req: 'banco', s: 'Sentado, la mancuerna sobre una rodilla y esa punta del pie en un step.' });
catC('smithseatcalf', 'Elevación de Talones Sentado en Smith', 'smith', 'calf', 'pant:', 'Sóleo (pantorrilla)', 'gemelos sentado en smith|smith seated calf raise', { i: 1, reps: '15-20', f: 'calfseat', req: 'banco', s: 'Sentado bajo el Smith con la barra acolchada sobre las rodillas.' });
catC('donkeycalf', 'Elevación de Talones Burro', 'gem_burro', 'calf', 'pant:', 'Pantorrillas', 'gemelos burro|pantorrillas burro|donkey calf raise', { i: 1, reps: '12-20', s: 'Cadera doblada y el torso apoyado; la carga va sobre la cadera.',
  F: { k: -1, e: 1, hi: ['shin'], A: { hip: [100, 70], torso: -168, ankle: [104, 136], hand: [58, 96], foot: -15 }, B: { hip: [100, 60], torso: -168, ankle: [104, 126], hand: [58, 90], foot: 50 }, back: () => fFloor() + fR(100, 136, 34, 5) + fL([40, 98], [72, 98], 6) + fL([50, 98], [50, 141], 4) } });
catC('tibraise', 'Elevación de Tibial', 'cuerpo', 'tib', 'pant:', 'Tibial anterior', 'tibialis raise|tibial anterior|elevacion de puntas', { i: 1, bw: 1, reps: '15-25', s: 'Espalda contra la pared y los talones a un pie de ella; sube las puntas.',
  F: { k: -1, e: 1, hi: ['shin'], A: { hip: [90, 68], torso: -94, ankle: [110, 134], handRel: [2, 46], foot: 0 }, B: { hip: [90, 68], torso: -94, ankle: [110, 134], handRel: [2, 46], foot: -38 }, back: () => fFloor() + cfWall(80) } });

/* =========================== ABDOMEN Y CORE =========================== */
catC('machcrunch', 'Crunch en Máquina', 'crunch_maq', 'flex', 'abd:', 'Abdomen', 'abdominal en maquina|crunch maquina|ab crunch machine', { s: 'Sentado con los agarres junto al pecho; encoge el torso hacia las rodillas.',
  F: { k: -1, e: -1, hi: ['torso'], A: { hip: [76, 112], torso: -95, ankle: [112, 140], handRel: [10, 4], foot: 0 }, B: { hip: [76, 112], torso: -45, ankle: [112, 140], handRel: [10, 4], foot: 0 }, back: () => cfSeat(78, 118, false), front: p => fC(p.hand, 4) } });
catC('cabletwist', 'Crunch en Polea con Giro Oblicuo', 'polea_alta', 'flex', 'abd:', 'Oblicuos|Abdomen', 'crunch oblicuo en polea|cable oblique crunch', { f: 'cablecrunch', s: 'De rodillas frente a la polea alta; al encogerte lleva un codo hacia la rodilla contraria.' });
catC('declcrunch', 'Crunch Declinado', 'banco_decl', 'flex', 'abd:', 'Abdomen', 'abdominales declinados|crunch en banco declinado|decline crunch', { bw: 1, s: 'Pies enganchados en el banco declinado; encoge el torso sin sentarte del todo.',
  F: { k: -1, e: -1, hi: ['torso'], A: { hip: [104, 100], torso: 160, ankle: [140, 114], handRel: [-4, -8], foot: -60 }, B: { hip: [104, 100], torso: -150, ankle: [140, 114], handRel: [-4, -8], foot: -60 }, back: () => fFloor() + fL([108, 106], [40, 128], 6) + fL([60, 120], [60, 140], 4) + fL([100, 108], [100, 140], 4) + fC([144, 110], 5) } });
catC('obliquecrunch', 'Crunch Oblicuo', 'cuerpo', 'rotc', 'abd:', 'Oblicuos|Abdomen', 'oblique crunch|abdominal oblicuo', { bw: 1, f: 'crunch', s: 'Acostado con las rodillas dobladas; sube un hombro hacia la rodilla contraria.' });
catC('revcrunch', 'Crunch Inverso', 'cuerpo', 'legraise', 'abd:', 'Abdomen bajo', 'reverse crunch|crunch invertido|encogimiento inverso', { bw: 1, s: 'Acostado con las rodillas dobladas a 90°; enrolla la pelvis llevando las rodillas al pecho.',
  F: { k: 1, e: 1, hi: ['torso', 'thigh'], A: { hip: [100, 134], torso: 180, ankle: [130, 108], hand: [70, 138], foot: 0 }, B: { hip: [104, 124], torso: 176, ankle: [110, 88], hand: [70, 138], foot: 0 }, back: () => fFloor() } });
catC('declrevcrunch', 'Crunch Inverso en Banco Declinado', 'banco_decl', 'legraise', 'abd:', 'Abdomen bajo', 'reverse crunch declinado|decline reverse crunch', { bw: 1, f: 'revcrunch', s: 'Acostado en el banco declinado con la cabeza arriba, agarrado detrás de la cabeza.' });
catC('benchtuck', 'Rodillas al Pecho en Banco', 'banco', 'legraise', 'abd:', 'Abdomen bajo', 'knee tucks en banco|rodillas al pecho sentado', { bw: 1, f: 'revcrunch', s: 'Sentado al borde del banco, inclinado atrás; lleva las rodillas al pecho.' });
catC('bikecrunch', 'Crunch Bicicleta', 'cuerpo', 'rotc', 'abd:', 'Oblicuos|Abdomen', 'bicicleta|abdominal bicicleta|bicycle crunch', { bw: 1, f: 'crunch', s: 'Acostado, alterna codo hacia la rodilla contraria mientras estiras la otra pierna.' });
catC('situp', 'Abdominal Completo', 'cuerpo', 'flex', 'abd:', 'Abdomen|Flexores de cadera', 'sit up|sit-up|abdominales completos', { bw: 1, s: 'Rodillas dobladas y pies firmes; sube el torso hasta sentarte.',
  F: { k: -1, e: -1, hi: ['torso'], A: { hip: [100, 134], torso: 180, ankle: [134, 138], handRel: [-6, -8], foot: 0 }, B: { hip: [100, 134], torso: -80, ankle: [134, 138], handRel: [6, 6], foot: 0 }, back: () => fFloor() } });
catC('weightsitup', 'Abdominal con Peso', 'disco', 'flex', 'abd:', 'Abdomen', 'sit up con disco|weighted sit up|abdominal con disco', { f: 'situp', s: 'Un disco abrazado contra el pecho.', fr: p => fC(fadd(p.sh, 0, 4), 7) });
catC('vup', 'Abdominal en V', 'cuerpo', 'flex', 'abd:', 'Abdomen', 'v up|v-up|abdominal en v|navaja|navaja (jackknife)|jackknife', { bw: 1, s: 'Acostado con brazos y piernas estirados; sube ambos a la vez hasta tocarte los pies.',
  F: { k: 1, e: 1, hi: ['torso', 'thigh'], A: { hip: [100, 134], torso: 180, ankle: [172, 132], hand: [26, 130], foot: 0 }, B: { hip: [100, 134], torso: -135, ankle: [148, 86], hand: [116, 92], foot: 0 }, back: () => fFloor() } });
catC('heeltouch', 'Toque de Talones', 'cuerpo', 'rotc', 'abd:', 'Oblicuos', 'heel touches|toques de talon', { bw: 1, f: 'crunch', s: 'Acostado con los hombros despegados; inclina el torso a cada lado para tocar los talones.' });
catC('hangknee', 'Elevación de Rodillas Colgado', 'dominadas', 'legraise', 'abd:', 'Abdomen bajo|Flexores de cadera', 'rodillas al pecho colgado|elevacion de rodillas en barra|hanging knee raise', { bw: 1, s: 'Colgado de la barra; sube las rodillas al pecho enrollando la pelvis.',
  F: { k: -1, e: 1, vb: '-20 -2 240 180', hi: ['torso', 'thigh'], A: { hip: [96, 100], torso: -90, ankle: [100, 172], hand: [96, 8], foot: 0 }, B: { hip: [96, 100], torso: -90, ankle: [124, 128], hand: [96, 8], foot: 0 }, back: () => fL([40, 8], [160, 8], 5) } });
catC('captain', 'Elevación de Rodillas en Silla Romana', 'silla_romana', 'legraise', 'abd:', 'Abdomen bajo|Flexores de cadera', 'silla romana|captain chair|rodillas al pecho en silla romana|elevacion de piernas en paralelas', { bw: 1, f: 'hangknee', s: 'Antebrazos en los apoyos y la espalda contra el respaldo.', bk: () => fL([74, 30], [74, 141], 6) });
catC('plankw', 'Plancha con Peso', 'disco', 'antiext', 'abd:', 'Core|Abdomen', 'weighted plank|plancha con disco', { reps: '20-45 s', f: 'plank', s: 'Plancha normal con un disco sobre la espalda alta (alguien te lo coloca).', fr: p => fC(fadd(p.sh, 0, 12), 8) });
catC('shouldertap', 'Plancha con Toque de Hombros', 'cuerpo', 'antiext', 'abd:homb', 'Core|Hombros', 'shoulder taps|plancha toque de hombro', { bw: 1, reps: '10-20', f: 'pushup', s: 'En posición de flexión, toca el hombro contrario sin mover la cadera.' });
catC('sideplank', 'Plancha Lateral', 'cuerpo', 'antiext', 'abd:', 'Oblicuos|Abdomen|Glúteo medio', 'side plank|plancha de lado', { bw: 1, reps: '20-45 s', f: 'plank', s: 'Apoyado en un antebrazo y el borde del pie; cadera alta y el cuerpo en línea.' });
catC('hollow', 'Hollow', 'cuerpo', 'antiext', 'abd:', 'Abdomen|Core', 'hollow hold|cuerpo hueco|hollow body', { bw: 1, reps: '20-40 s', s: 'Acostado, espalda baja pegada al suelo; despega hombros y piernas estiradas.',
  F: { k: 1, e: 1, hi: ['torso'], A: { hip: [100, 132], torso: 174, ankle: [172, 124], hand: [16, 118], foot: 0 }, B: { hip: [100, 132], torso: 172, ankle: [172, 122], hand: [16, 116], foot: 0 }, back: () => fFloor() } });
catC('rollout', 'Rollout con Barra', 'barra', 'antiext', 'abd:', 'Abdomen|Core', 'barbell rollout|rueda con barra', { reps: '6-12', f: 'abwheel', s: 'De rodillas, sujeta una barra con discos redondos y rueda al frente como con la rueda abdominal.' });
catC('russian', 'Giro Ruso', 'cuerpo', 'rotc', 'abd:', 'Oblicuos|Abdomen', 'russian twist|giros rusos|giro ruso con disco', { bw: 1, reps: '10-20 por lado', s: 'Sentado con el torso inclinado atrás y los pies despegados; gira el torso a cada lado.',
  F: { rig: 'front', thighLen: 16, hi: ['torso'], A: { hip: [100, 94], uL: 60, fL: 20, uR: 60, fR: 30, tL: 100, sL: 90, tR: 80, sR: 90 }, B: { hip: [100, 94], uL: 120, fL: 160, uR: 120, fR: 150, tL: 100, sL: 90, tR: 80, sR: 90 }, back: () => fFloor(147), front: p => fC([(p.handL[0] + p.handR[0]) / 2, (p.handL[1] + p.handR[1]) / 2], 6) } });
catC('woodchop', 'Leñador en Polea', 'polea_alta', 'rotc', 'abd:homb', 'Oblicuos|Abdomen|Hombros', 'lenador|lenador en polea|woodchopper|cable woodchop', { s: 'De lado a la polea alta; baja el maneral en diagonal hasta la cadera contraria girando el torso.',
  F: { rig: 'front', hi: ['torso'], A: Object.assign({ hip: [100, 74], uL: -135, fL: -135, uR: -160, fR: -150 }, cfFrontLegs), B: Object.assign({ hip: [100, 74], uL: 40, fL: 50, uR: 60, fR: 60 }, cfFrontLegs),
    back: () => fFloor(147) + fL([12, 4], [12, 147], 6), front: p => fCable(p.handL, [16, 10]) + fC(p.handL, 4) } });
catC('woodchoplh', 'Leñador de Bajo a Alto en Polea', 'polea_baja', 'rotc', 'abd:homb', 'Oblicuos|Abdomen|Hombros', 'lenador bajo a alto|low to high woodchop', { f: 'woodchop', s: 'De lado a la polea baja; sube el maneral en diagonal hasta arriba del hombro contrario.' });
catC('pallof', 'Press Pallof', 'cruce', 'rotc', 'abd:', 'Abdomen|Oblicuos', 'pallof press|antirrotacion con polea', { reps: '8-12 por lado', s: 'De lado a la polea a la altura del pecho; empuja el maneral al frente sin dejar que te gire.',
  F: { k: -1, e: 1, hi: ['torso'], A: { hip: [95, 68], torso: -90, ankle: [98, 141], hand: [110, 42], foot: 0 }, B: { hip: [95, 68], torso: -90, ankle: [98, 141], hand: [144, 40], foot: 0 }, back: () => fFloor() + fL([186, 4], [186, 141], 6) + fC([182, 42], 4), front: p => fCable(p.hand, [182, 42]) + fC(p.hand, 4) } });
catC('pallofrot', 'Press Pallof con Rotación', 'cruce', 'rotc', 'abd:', 'Oblicuos|Abdomen', 'pallof con rotacion|pallof press rotation', { f: 'pallof', s: 'Igual que el Pallof; con los brazos estirados, gira el torso lejos de la polea y vuelve.' });
catC('dbsidebend', 'Flexión Lateral con Mancuerna', 'manc', 'rotc', 'abd:', 'Oblicuos', 'flexion lateral|side bend|inclinacion lateral', { u: 1, f: 'farmer', s: 'De pie con una mancuerna en una mano; inclínate hacia ese lado y sube con los oblicuos del otro.' });
catC('cablesidebend', 'Flexión Lateral en Polea', 'polea_baja', 'rotc', 'abd:', 'Oblicuos', 'cable side bend|flexion lateral con cable', { u: 1, f: 'farmer', s: 'De lado a la polea baja con el maneral en la mano cercana.', fr: p => fCable(p.hand, [171, 134]) + fC(p.hand, 4) });
catC('kbwindmill', 'Molino con Kettlebell', 'kb', 'rotc', 'abd:homb', 'Oblicuos|Hombros|Isquiotibiales', 'kettlebell windmill|molino', { u: 1, reps: '5-8 por lado', s: 'Kettlebell arriba con el brazo estirado; inclínate al lado contrario mirando la pesa.',
  F: { rig: 'front', hi: ['torso', 'delt'], A: { hip: [100, 72], uL: 100, fL: 95, uR: -88, fR: -90, tL: 110, sL: 95, tR: 70, sR: 85 }, B: { hip: [96, 86], uL: 120, fL: 110, uR: -70, fR: -75, tL: 116, sL: 95, tR: 64, sR: 85 }, back: () => fFloor(147), front: p => catKb([p.handR[0], p.handR[1] - 14]) } });
catC('wipers', 'Limpiaparabrisas', 'cuerpo', 'rotc', 'abd:', 'Oblicuos|Abdomen', 'windshield wipers|limpiaparabrisas colgado', { bw: 1, reps: '6-10 por lado', s: 'Acostado con brazos en cruz y piernas arriba (o colgado de la barra); bájalas a cada lado sin despegar los hombros.',
  F: { rig: 'front', thighLen: 30, hi: ['torso'], A: { hip: [100, 110], uL: 180, fL: 180, uR: 0, fR: 0, tL: -100, sL: -100, tR: -80, sR: -80 }, B: { hip: [100, 110], uL: 180, fL: 180, uR: 0, fR: 0, tL: -150, sL: -160, tR: -140, sR: -150 }, back: () => fFloor(147) } });
catC('rotmach', 'Rotación de Torso en Máquina', 'rot_maq', 'rotc', 'abd:', 'Oblicuos|Abdomen', 'maquina de giro|rotary torso|torso rotation machine', { f: 'russian', s: 'Sentado con el pecho contra la almohadilla; gira el torso a cada lado con la cadera fija.' });
catC('farmer', 'Paseo del Granjero', 'manc', 'carry', 'abd:esp', 'Core|Trapecio|Antebrazo (agarre)', 'farmer walk|paseo del granjero|caminata del granjero|farmers carry', { reps: '30-40 m', s: 'Una mancuerna pesada en cada mano a los costados; camina erguido.',
  F: { k: -1, e: 1, hi: ['torso', 'farm'], A: { hip: [95, 68], torso: -90, ankle: [86, 141], hand: [99, 116], foot: 0 }, B: { hip: [99, 68], torso: -90, ankle: [112, 141], hand: [103, 116], foot: 0 }, back: p => fFloor() + legBack(p, [p.ankle[0] < 100 ? 112 : 86, 141]), front: p => fDumbV(p.hand) } });

/* =========================== CUERPO COMPLETO =========================== */
catC('powerclean', 'Cargada de Potencia', 'barra', 'full', 'glu:isq,esp,homb', 'Glúteos|Isquiotibiales|Trapecio|Hombros', 'power clean|cargada|cargada de potencia', { g: 'full', reps: '3-5', rest: 150, s: 'Barra sobre la mitad del pie; extiende la cadera de forma explosiva y recibe la barra sobre los hombros.',
  F: { k: -1, e: 1, hi: ['glute', 'thigh', 'delt'], A: { hip: [76, 96], torso: -38, ankle: [100, 141], hand: [114, 126], foot: 0 }, B: { hip: [92, 76], torso: -86, ankle: [100, 141], hand: [109, 30], foot: 0 }, back: () => fFloor(), front: p => fPlate(p.hand) } });
catC('dbthruster', 'Thruster con Mancuernas', 'manc', 'full', 'cuad:homb,glu,tri', 'Cuádriceps|Hombros|Glúteos|Tríceps', 'dumbbell thruster|thruster mancuernas', { g: 'full', reps: '8-12', s: 'Mancuernas en los hombros; baja en sentadilla y al subir empújalas sobre la cabeza.',
  F: { k: -1, e: 1, hi: ['thigh', 'delt'], A: { hip: [80, 102], torso: -66, ankle: [100, 141], hand: [104, 46], foot: 0 }, B: { hip: [95, 68], torso: -90, ankle: [100, 141], hand: [100, 2], foot: 0 }, vb: '-10 -14 220 166', back: () => fFloor(), front: p => fDumb(p.hand, 0) } });
catC('bbthruster', 'Thruster con Barra', 'barra', 'full', 'cuad:homb,glu,tri', 'Cuádriceps|Hombros|Glúteos|Tríceps', 'barbell thruster|thruster', { g: 'full', reps: '6-10', f: 'dbthruster', s: 'Barra en la clavícula; sentadilla frontal y al subir empújala sobre la cabeza.' });
catC('kbclean', 'Cargada con Kettlebell', 'kb', 'full', 'glu:isq,homb', 'Glúteos|Isquiotibiales|Hombros', 'kettlebell clean|cargada kettlebell', { g: 'full', u: 1, reps: '6-10', f: 'kbswing', s: 'Desde un swing corto, lleva la kettlebell al hombro girando la mano para que no golpee el antebrazo.' });
catC('kbsnatch', 'Arranque con Kettlebell', 'kb', 'full', 'glu:homb,isq', 'Glúteos|Hombros|Isquiotibiales', 'kettlebell snatch|arranque kettlebell', { g: 'full', u: 1, reps: '6-10', s: 'Desde un swing, lleva la kettlebell en un solo movimiento hasta arriba con el brazo estirado.',
  F: { k: -1, e: 1, vb: '-10 -14 220 166', hi: ['glute', 'delt'], A: { hip: [80, 74], torso: -22, ankle: [100, 141], hand: [100, 106], foot: 0 }, B: { hip: [95, 68], torso: -90, ankle: [100, 141], hand: [104, 0], foot: 0 }, back: () => fFloor(), front: p => catKb([p.hand[0], p.hand[1] - 14]) } });
catC('sledpush', 'Empuje de Trineo', 'trineo', 'sled', 'cuad:glu,pant', 'Cuádriceps|Glúteos|Pantorrillas', 'sled push|empujar trineo|prowler', { g: 'full', reps: '15-25 m', s: 'Brazos estirados en los postes, cuerpo inclinado a 45°; empuja con pasos cortos.',
  F: { k: -1, e: 1, hi: ['thigh', 'glute'], A: { hip: [80, 84], torso: -30, ankle: [100, 141], hand: [150, 66], foot: 0 }, B: { hip: [96, 84], torso: -30, ankle: [74, 141], hand: [150, 66], foot: 40 }, back: p => fFloor() + legBack(p, [p.ankle[0] > 90 ? 74 : 100, 141]), front: () => fL([152, 50], [152, 126], 5) + fR(140, 124, 48, 12) } });
catC('sleddrag', 'Arrastre de Trineo', 'trineo', 'sled', 'isq:glu,esp', 'Isquiotibiales|Glúteos|Espalda', 'sled drag|arrastre de trineo|jalar trineo', { g: 'full', reps: '15-25 m', s: 'Cuerda o arnés al trineo; camina hacia atrás con la cadera baja jalando.',
  F: { k: -1, e: 1, hi: ['thigh', 'torso'], A: { hip: [100, 80], torso: -70, ankle: [104, 141], hand: [128, 70], foot: 0 }, B: { hip: [110, 82], torso: -70, ankle: [128, 141], hand: [138, 74], foot: 0 }, back: p => fFloor() + legBack(p, [p.ankle[0] > 110 ? 104 : 128, 141]), front: p => fL(p.hand, [176, 128], 1.5) + fR(170, 124, 26, 12) } });
catC('battlerope', 'Cuerdas de Batalla', 'cuerdas', 'cardio', 'homb:abd', 'Hombros|Core', 'battle ropes|cuerdas|ondas con cuerdas', { g: 'full', reps: '20-40 s', s: 'Semisentadilla, una cuerda en cada mano; haz ondas alternando los brazos rápido.',
  F: { k: -1, e: 1, hi: ['delt', 'uarm'], A: { hip: [86, 86], torso: -70, ankle: [100, 141], hand: [124, 70], foot: 0 }, B: { hip: [86, 86], torso: -70, ankle: [100, 141], hand: [124, 96], foot: 0 }, back: () => fFloor(), front: p => `<path d="M${f1(p.hand[0])} ${f1(p.hand[1])} Q 140 ${f1(p.hand[1] + 30)} 156 120 T 190 128" fill="none" stroke="var(--eq)" stroke-width="2.5"/>` } });

/* =========================== Agregados en la Tanda 0 (misma clave y nombre) =========================== */
const CAT_OBJ = [
  { key: 'calfpress', name: 'Elevación de Talones en Prensa', type: 'Piernas', group: 'Piernas', musc: ['Pantorrillas'], reps: '12-20', rest: 60, eq: 'prensa', pat: 'calf', zm: 'pant', zs: [], i: 1,
    al: ['gemelos en prensa', 'pantorrillas en prensa', 'elevacion de talones en la prensa', 'calf press', 'leg press calf raise'],
    steps: ['Siéntate en la prensa con la espalda pegada y apoya solo la parte delantera de los pies en el borde bajo de la plataforma.', 'Estira las piernas sin bloquear las rodillas y deja que los talones bajen hasta sentir el estiramiento.', 'Empuja con la punta de los pies lo más lejos que puedas y aprieta 1 s arriba.', 'Baja despacio (2 s); las rodillas no se mueven.'],
    errs: ['Doblar y estirar las rodillas: se vuelve prensa.', 'Rebotar abajo sin pausa.', 'Quitar los seguros sin tener los pies bien apoyados.'],
    F: { k: -1, e: 1, hi: ['shin'],
      A: { hip: [70, 110], torso: -125, ankle: [122, 61], hand: [80, 110], foot: -158 },
      B: { hip: [70, 110], torso: -125, ankle: [122, 61], hand: [80, 110], foot: -105 },
      back: () => fFloor() + fL([64, 116], [37, 78], 8) + fL([62, 119], [86, 119], 6) + fL([75, 119], [75, 140], 4),
      front: p => fBar(fadd(p.toe, 47, 2), 47, 40, 6) } },
  { key: 'vbarpush', name: 'Extensión de Tríceps con Barra V en Polea', type: 'Empuje', group: 'Brazos', musc: ['Tríceps'], reps: '10-15', rest: 60, eq: 'polea_alta', pat: 'triext', zm: 'tri', zs: [], i: 1,
    al: ['triceps con barra v', 'triceps en polea con barra v', 'extension de triceps con barra v', 'jalon de triceps con barra v', 'triceps barra v', 'pushdown barra v', 'v-bar pushdown', 'v bar pushdown'],
    steps: ['Frente a la polea alta con la barra en V, agarre neutro y codos pegados a los costados.', 'Empuja hacia abajo hasta estirar los brazos y aprieta el tríceps 1 s.', 'Sube controlado hasta unos 90° sin que los codos se despeguen.'],
    errs: ['Abrir los codos o llevarlos hacia adelante.', 'Echar el cuerpo encima del agarre para mover más peso.'],
    F: { k: -1, e: 1, hi: ['uarm'], arc: ['hand'],
      A: { hip: [95, 68], torso: -80, ankle: [98, 141], hand: [122, 42], foot: 0 },
      B: { hip: [95, 68], torso: -80, ankle: [98, 141], hand: [110, 72], foot: 0 },
      back: () => fFloor() + fPost(168) + fC([163, 8], 4),
      front: p => fCable([p.hand[0], p.hand[1] - 5], [163, 8]) + fL([p.hand[0] - 5, p.hand[1] + 3], [p.hand[0], p.hand[1] - 5], 3) + fL([p.hand[0], p.hand[1] - 5], [p.hand[0] + 5, p.hand[1] + 3], 3) } },
];
/* Alias de ejercicios que ya existían (variantes que en el gimnasio se llaman distinto) */
const CAT_META_AL = {
  curl: 'curl alterno con mancuernas|curl alterno|alternating dumbbell curl',
  hyperext: 'hiperextension para gluteo|hiperextensiones para gluteo|glute back extension',
  triceps: 'triceps en polea con barra recta|pushdown con barra recta|straight bar pushdown',
  pulldown: 'jalon al pecho agarre ancho|lat pulldown|wide grip lat pulldown',
  rowcable: 'remo gironda|seated cable row',
  calfstand: 'elevacion de talones de pie en maquina|standing calf raise',
  pecdeck: 'aperturas en maquina|pec fly machine',
  legext: 'leg extension',
  legcurl: 'lying leg curl',
  seatedlegcurl: 'seated leg curl',
};

/* =========================== Armado =========================== */
const CAT_LEGS = { cuad: 1, isq: 1, glu: 1, pant: 1, adu: 1 };
function catDefaults(x) {
  const fam = (CAT_EQ[x.eq] || [])[1], heavy = (fam === 'barra' || fam === 'smith') && /^(squat|hinge|hpush|ipush|dpush|vpush|row)$/.test(x.pat);
  if (/^(antiext)$/.test(x.pat)) return ['20-45 s', 45];
  if (/^(flex|legraise|rotc)$/.test(x.pat)) return ['12-20', 45];
  if (/^(calf|tib)$/.test(x.pat)) return ['12-20', 60];
  if (x.pat === 'carry' || x.pat === 'sled') return ['20-30 m', 90];
  if (x.pat === 'cardio') return ['20-40 s', 45];
  if (x.i) return ['10-15', 60];
  if (x.bw) return ['8-15', 75];
  return heavy ? ['6-10', 150] : ['8-12', 90];
}
function catType(x) {
  if (x.pat === 'full' || x.pat === 'cardio' || x.pat === 'sled') return CAT_LEGS[x.zm] ? 'Piernas' : x.zm === 'homb' ? 'Empuje' : 'Core';
  return CAT_TYPE[x.pat] || 'Core';
}
const CAT_NEW = CAT_OBJ.concat(CAT_ROWS.map(r => {
  const PT = CAT_PT[r.pat] || CAT_PT.cardio, d = catDefaults(r);
  return Object.assign(r, {
    type: catType(r), group: CAT_GROUP[r.zm] || 'Core', reps: r.reps || d[0], rest: r.rest || d[1],
    steps: [r.s].concat(PT[1]).filter(Boolean), errs: (r.e ? [r.e] : []).concat(PT[2]).slice(0, 3),
  });
}));
CAT_NEW.forEach(x => { x.re = /(?!)/; x.cat = 1; if (x.i) x.iso = 1; if (x.u) x.uni = 1; });
/* Los que ya existían: equipo, patrón y banderas (no cambian clave, nombre, músculos ni figura) */
LIB.forEach(x => {
  const m = CAT_META[x.key]; if (!m) return;
  const t = m.split(' ');
  x.eq = t[0]; x.pat = t[1];
  if (t[2] && t[2] !== '-') { if (t[2].indexOf('i') >= 0) x.iso = 1; if (t[2].indexOf('u') >= 0) x.uni = 1; }
  if (t[3] && t[3] !== '-') x.req = t[3];
  if (t[4]) x.g = t[4];
});
LIB.push(...CAT_NEW);

/* Figuras: propia (F) o la de su patrón (f) con el equipo de este ejercicio dibujado encima */
const CAT_FIGS = { own: 0, pattern: 0 };
function catFigOf(x, seen) {
  if (x.fig) return x.fig;
  if (x.F) { CAT_FIGS.own++; return (x.fig = x.F); }
  const b = LIB.find(y => y.key === x.f);
  seen = seen || {}; if (!b || seen[x.key]) return null; seen[x.key] = 1;
  const bf = catFigOf(b, seen); if (!bf) return null;
  CAT_FIGS.pattern++;
  const same = b.eq === x.eq, draw = x.fr || (!same && CAT_DRAW[x.eq]) || bf.front, back = !same && CAT_BACK[x.eq];
  return (x.fig = Object.assign({}, bf, { front: draw, back: back || x.bk ? p => (bf.back ? bf.back(p) : '') + (back ? back(p) : '') + (x.bk ? x.bk(p) : '') : bf.back }));
}
CAT_NEW.forEach(x => catFigOf(x));

/* Barra: se anotan los discos y la barra va aparte (como los de barra que ya existían) */
CAT_NEW.forEach(x => {
  const bar = x.bar != null ? x.bar : (x.eq === 'barra' || x.eq === 'hexbar') && x.pat !== 'antiext' ? 20 : x.eq === 'barraz' ? 10 : 0;
  if (!bar) return;
  if (typeof BAR_KG !== 'undefined') BAR_KG[x.name] = bar;
  BAR_DEFAULT[x.name] = state.settings.unit === 'lb' && bar === 20 ? 45 : bar;
});

/* =========================== Búsqueda por nombre =========================== */
const CAT_ALIAS = {};
CAT_NEW.forEach(x => (x.al || []).forEach(a => { CAT_ALIAS[normName(a)] = x; }));
Object.keys(CAT_META_AL).forEach(k => { const x = LIB.find(y => y.key === k); if (x) { x.al = (x.al || []).concat(CAT_META_AL[k].split('|')); CAT_META_AL[k].split('|').forEach(a => { CAT_ALIAS[normName(a)] = x; }); } });
const _libFindCat = libFind, LF_CACHE = { n: 0, m: {} };
libFind = function (name) {
  if (LF_CACHE.n !== LIB.length) { LF_CACHE.n = LIB.length; LF_CACHE.m = {}; }
  const key = String(name);
  if (key in LF_CACHE.m) return LF_CACHE.m[key];
  const n = normName(name);
  /* 1) nombre exacto (como antes)  2) alias exacto de un ejercicio del catálogo  3) todo lo de antes */
  const r = LIB.find(x => normName(x.name) === n) || CAT_ALIAS[n.trim()] || _libFindCat(name);
  return (LF_CACHE.m[key] = r || null);
};

/* =========================== Músculos y equipo de los nuevos =========================== */
/* Zonas explícitas: el principal cuenta 1 serie y cada secundario ½ (Aductores y Antebrazos no cuentan, como antes) */
const _zoneSharesCat = zoneShares;
zoneShares = function (name) {
  const x = libFind(name); if (!x || !x.cat) return _zoneSharesCat(name);
  const o = {}; (x.zs || []).forEach(k => { if (CAT_ZONES.indexOf(k) >= 0) o[k] = 0.5; }); if (CAT_ZONES.indexOf(x.zm) >= 0) o[x.zm] = 1; return o;
};
const _zonesOfCat = zonesOf;
zonesOf = function (name) {
  const x = libFind(name); if (!x || !x.cat) return _zonesOfCat(name);
  return [x.zm].concat(x.zs || []).filter(k => CAT_ZONES.indexOf(k) >= 0);
};
const _isBwCat = isBodyweight;
isBodyweight = function (name) { const x = libFind(name); return x && x.cat ? !!x.bw : _isBwCat(name); };
/* Tipo de equipo para los filtros */
const _equipOfCat = equipOf;
equipOf = function (x) { return x && x.eq && CAT_EQ[x.eq] ? CAT_EQ[x.eq][1] : _equipOfCat(x); };
/* Músculo principal para agrupar y filtrar (en los de antes, el que ya usa el coach) */
function catMain(x) {
  if (!x) return 'full';
  if (x.g) return x.g;
  if (x.zm) return x.zm;
  if (x._zm) return x._zm;
  const sh = zoneShares(x.name); let m = null; for (const k in sh) if (sh[k] === 1) m = k;
  if (!m) m = /aduc/.test(normName(x.name + ' ' + (x.musc || []).join(' '))) ? 'adu' : 'full';
  return (x._zm = m);
}
/* Texto para buscar: nombre, alias, músculos, equipo y patrón, sin tildes ni mayúsculas */
function catHay(x) {
  if (x._hay) return x._hay;
  const eq = CAT_EQ[x.eq] ? CAT_EQ[x.eq][0] + ' ' + (CAT_FAM.find(f => f[0] === CAT_EQ[x.eq][1]) || [])[1] : '';
  const mus = (CAT_MUS.find(m => m[0] === catMain(x)) || [])[1] || '';
  return (x._hay = normName([x.name, (x.al || []).join(' '), (x.musc || []).join(' '), mus, x.group || '', eq, (CAT_PT[x.pat] || [])[0] || ''].join(' ')));
}
