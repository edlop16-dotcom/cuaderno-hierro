/* ==========================================================================
   Fase 5 · Más ejercicios con figura animada (15-oct-2026)
   Lo que más le faltaba a Forja frente a Symmetry: ejercicios en casa, con el peso
   del cuerpo, con kettlebell y algunas máquinas. Cada uno con su figura (A → B),
   músculos, pasos y errores. Se agregan a LIB y a los patrones del generador
   (PB_SLOTS), así "Solo mi cuerpo" y "En casa" ya tienen hombro, espalda y tríceps.
   ========================================================================== */
const mvRef = k => LIB.find(x => x.key === k) || { fig: {} };
/* Pierna de atrás alineada con el tronco (peso muerto a una pierna, superman…) */
const mvLegLine = (p, len) => { const dx = p.hip[0] - p.sh[0], dy = p.hip[1] - p.sh[1], d = Math.hypot(dx, dy) || 1; return legBack(p, [p.hip[0] + dx / d * len, p.hip[1] + dy / d * len], 1); };
const mvChair = (x = 50, y = 104) => fL([x, y], [x + 40, y], 6) + fL([x + 4, y], [x + 4, 141], 4) + fL([x + 36, y], [x + 36, 141], 4) + fL([x + 2, y - 2], [x - 2, y - 46], 6);
const mvKb = p => fL(fadd(p.hand, 90, 2), fadd(p.hand, 90, 6), 3) + fC([p.hand[0], p.hand[1] + 11], 7);
const MV_PUSH = { hip: [102.3, 106.3], torso: -159.7, ankle: [171.6, 132], hand: [61, 141], foot: 100 };

const MOVES = [
  /* ---------- PIERNAS Y GLÚTEOS ---------- */
  { key: 'bwsquat', name: 'Sentadilla con peso corporal', type: 'Piernas', group: 'Piernas', bw: 1, musc: ['Cuádriceps', 'Glúteos'], reps: '12-20', rest: 60,
    steps: ['De pie, pies a la anchura de los hombros y puntas un poco hacia afuera.', 'Lleva la cadera atrás y abajo como si te sentaras; los brazos van al frente para equilibrarte.', 'Baja hasta que los muslos queden paralelos al suelo o lo más que puedas sin redondear la espalda.', 'Sube empujando con todo el pie.'],
    errs: ['Levantar los talones.', 'Rodillas que se van hacia adentro.'],
    fig: { k: -1, e: 1, hi: ['thigh', 'glute'], A: { hip: [95, 68], torso: -88, ankle: [100, 141], handRel: [47, 8], foot: 0 }, B: { hip: [80, 104], torso: -62, ankle: [100, 141], handRel: [46, 10], foot: 0 }, back: () => fFloor() } },
  { key: 'jumpsquat', name: 'Sentadilla con Salto', type: 'Piernas', group: 'Piernas', bw: 1, musc: ['Cuádriceps', 'Glúteos', 'Pantorrillas'], reps: '8-12', rest: 75,
    steps: ['Baja a media sentadilla con los brazos atrás.', 'Salta lo más alto que puedas llevando los brazos arriba.', 'Cae suave sobre la parte delantera del pie y vuelve a bajar en la misma sentadilla.'],
    errs: ['Caer con las piernas rectas (golpea las rodillas).', 'Hacerlo con cansancio y perder la técnica.'],
    fig: { k: -1, e: 1, vb: '-10 -26 220 176', hi: ['thigh', 'glute', 'shin'], A: { hip: [82, 102], torso: -64, ankle: [100, 141], handRel: [-14, 44], foot: 0 }, B: { hip: [97, 50], torso: -90, ankle: [100, 122], handRel: [16, -44], foot: 45 }, back: () => fFloor() } },
  { key: 'wallsit', name: 'Sentadilla Isométrica en Pared', type: 'Piernas', group: 'Piernas', bw: 1, musc: ['Cuádriceps', 'Glúteos'], reps: '30-45 s', rest: 60,
    steps: ['Apoya toda la espalda en la pared y adelanta los pies.', 'Baja hasta que las rodillas formen 90° y queden sobre los tobillos.', 'Aguanta el tiempo indicado respirando con calma.'],
    errs: ['Rodillas por delante de las puntas.', 'Apoyar las manos en los muslos para ayudarte.'],
    fig: { k: -1, e: 1, hi: ['thigh'], A: { hip: [70, 104], torso: -90, ankle: [108, 141], handRel: [46, 8], foot: 0 }, B: { hip: [70, 106], torso: -90, ankle: [108, 141], handRel: [46, 10], foot: 0 }, back: () => fFloor() + fL([60, 6], [60, 141], 6, 'var(--line)') } },
  { key: 'stepup', name: 'Subida al Cajón', type: 'Piernas', group: 'Piernas', bw: 1, musc: ['Cuádriceps', 'Glúteos'], reps: '10-12', rest: 75,
    steps: ['Pon un pie completo sobre un cajón, escalón o banco firme (a la altura de la rodilla o menos).', 'Sube empujando con el talón de arriba, sin impulsarte con la pierna de abajo.', 'Baja controlando. Haz todas las reps de una pierna y cambia.'],
    errs: ['Impulsarte con el pie de abajo.', 'Usar una superficie que se mueva.'],
    fig: { k: -1, e: 1, vb: '-10 -26 220 176', hi: ['thigh', 'glute'], A: { hip: [86, 70], torso: -86, ankle: [118, 110], handRel: [6, 46], foot: 0 }, B: { hip: [114, 40], torso: -90, ankle: [118, 110], handRel: [4, 46], foot: 0 },
      back: p => fFloor() + fR(100, 111, 54, 30) + legBack(p, [p.hip[0] - 4, Math.min(140, p.hip[1] + 71)]) } },
  { key: 'slbridge', name: 'Puente de Glúteo a una Pierna', type: 'Piernas', group: 'Glúteos', bw: 1, musc: ['Glúteos', 'Isquiotibiales'], reps: '10-15', rest: 60,
    steps: ['Boca arriba, un pie apoyado cerca de la cadera y la otra pierna estirada.', 'Sube la cadera empujando con el talón hasta alinear hombro, cadera y rodilla.', 'Pausa 1 s arriba y baja lento. Cambia de pierna.'],
    errs: ['Hundir la cadera hacia el lado de la pierna libre.', 'Empujar con la punta del pie.'],
    fig: { k: -1, e: 1, hi: ['glute'], A: { hip: [96, 132], torso: 180, ankle: [134, 138], hand: [70, 138], foot: 0 }, B: { hip: [102, 108], torso: 152, ankle: [134, 138], hand: [70, 138], foot: 0 },
      back: p => fFloor() + legBack(p, [p.hip[0] + 68, p.hip[1] - 22]) } },
  { key: 'slrdl', name: 'Peso Muerto a una Pierna', type: 'Piernas', group: 'Piernas', musc: ['Isquiotibiales', 'Glúteos', 'Equilibrio'], reps: '8-12', rest: 75,
    steps: ['De pie sobre una pierna con la rodilla un poco flexionada; mancuerna en la mano contraria.', 'Inclina el tronco hacia adelante mientras la otra pierna sube atrás, en línea con la espalda.', 'Baja hasta sentir el estiramiento detrás del muslo y vuelve apretando el glúteo.'],
    errs: ['Girar la cadera hacia afuera.', 'Redondear la espalda para bajar más.'],
    fig: { k: -1, e: 1, hi: ['glute', 'thigh'], A: { hip: [95, 68], torso: -90, ankle: [100, 141], handRel: [3, 47], foot: 0 }, B: { hip: [84, 72], torso: -14, ankle: [100, 141], handRel: [0, 48], foot: 0 },
      back: p => fFloor() + mvLegLine(p, 72), front: p => fDumbV(p.hand) } },
  { key: 'sitstand', name: 'Sentarse y Pararse de la Silla', type: 'Piernas', group: 'Piernas', bw: 1, musc: ['Cuádriceps', 'Glúteos', 'Equilibrio'], reps: '8-15', rest: 60,
    steps: ['Siéntate en el borde de una silla firme, pies apoyados y un poco atrás.', 'Inclina el pecho al frente y ponte de pie sin usar las manos.', 'Siéntate despacio, tocando apenas la silla, y repite.'],
    errs: ['Dejarse caer en la silla.', 'Usar una silla con ruedas.'],
    fig: { k: -1, e: 1, hi: ['thigh', 'glute'], A: { hip: [72, 100], torso: -72, ankle: [104, 141], handRel: [34, 18], foot: 0 }, B: { hip: [96, 68], torso: -90, ankle: [104, 141], handRel: [44, 10], foot: 0 },
      back: () => fFloor() + mvChair(44, 104) } },
  { key: 'kbswing', name: 'Swing con Kettlebell', type: 'Piernas', group: 'Glúteos', musc: ['Glúteos', 'Isquiotibiales', 'Espalda baja'], reps: '12-20', rest: 75,
    steps: ['Pies algo más anchos que los hombros, kettlebell con las dos manos y brazos estirados.', 'Lleva la cadera atrás (como en un peso muerto) dejando pasar la pesa entre las piernas.', 'Extiende la cadera con fuerza: la pesa sube sola hasta la altura del pecho.', 'Los brazos solo guían; la fuerza sale de la cadera.'],
    errs: ['Hacer una sentadilla en lugar de llevar la cadera atrás.', 'Subir la pesa con los hombros.'],
    fig: { k: -1, e: 1, hi: ['glute'], A: { hip: [80, 74], torso: -22, ankle: [100, 141], hand: [100, 106], foot: 0 }, B: { hip: [95, 68], torso: -90, ankle: [100, 141], hand: [144, 30], foot: 0 },
      back: () => fFloor(), front: mvKb } },

  /* ---------- PECHO Y TRÍCEPS SIN EQUIPO ---------- */
  { key: 'kneepush', name: 'Flexiones de Rodillas', type: 'Empuje', group: 'Pecho', bw: 1, musc: ['Pecho', 'Tríceps', 'Hombro frontal'], reps: '8-15', rest: 60,
    steps: ['Manos algo más anchas que los hombros y rodillas apoyadas en el suelo.', 'Cuerpo recto desde la cabeza hasta las rodillas.', 'Baja el pecho hasta casi tocar el suelo y empuja hacia arriba.'],
    errs: ['Dejar la cadera arriba (en V).', 'Codos abiertos a 90°.'],
    fig: { k: 1, e: -1, hi: ['torso', 'uarm'], A: { hip: [110, 114], torso: -150, ankle: [170, 118], hand: [62, 141], foot: 0 }, B: { hip: [112, 126], torso: -173, ankle: [170, 118], hand: [62, 141], foot: 0 }, back: () => fFloor() } },
  { key: 'inclinepush', name: 'Flexiones Inclinadas', type: 'Empuje', group: 'Pecho', bw: 1, musc: ['Pecho', 'Tríceps', 'Hombro frontal'], reps: '10-15', rest: 60,
    steps: ['Manos en el borde de un banco, mesa firme o pared, a la anchura de los hombros.', 'Cuerpo recto de la cabeza a los talones.', 'Baja el pecho al borde y empuja. Cuanto más alto el apoyo, más fácil.'],
    errs: ['Hundir la cadera.', 'Usar un apoyo que se deslice.'],
    fig: { k: 1, e: -1, hi: ['torso', 'uarm'], A: { hip: [101, 82], torso: -142, ankle: [170, 136], hand: [58, 100], foot: 100 }, B: { hip: [107, 103], torso: -153, ankle: [170, 136], hand: [58, 100], foot: 100 },
      back: () => fFloor() + fL([24, 101], [66, 101], 6) + fL([30, 101], [30, 141], 4) + fL([60, 101], [60, 141], 4) } },
  { key: 'diamond', name: 'Flexiones Diamante', type: 'Empuje', group: 'Brazos', bw: 1, musc: ['Tríceps', 'Pecho'], reps: '6-12', rest: 75,
    steps: ['Junta las manos bajo el pecho formando un rombo con pulgares e índices.', 'Cuerpo recto, codos pegados al cuerpo.', 'Baja hasta que el pecho roce las manos y empuja.'],
    errs: ['Abrir los codos.', 'Bajar solo la cabeza.'],
    fig: { k: 1, e: -1, hi: ['uarm', 'farm'], A: Object.assign({}, MV_PUSH, { hand: [66, 141] }), B: { hip: [97.7, 128.2], torso: -177.1, ankle: [171.6, 132], hand: [66, 141], foot: 100 }, back: () => fFloor() } },

  /* ---------- HOMBROS Y ESPALDA SIN EQUIPO ---------- */
  { key: 'pikepush', name: 'Flexiones en Pica', type: 'Empuje', group: 'Hombros', bw: 1, musc: ['Hombros', 'Tríceps'], reps: '6-12', rest: 75,
    steps: ['Desde la posición de flexión, sube la cadera hasta formar una V invertida.', 'Dobla los codos llevando la cabeza hacia el suelo, entre las manos.', 'Empuja hasta estirar los brazos. Pies en un escalón = más difícil.'],
    errs: ['Bajar la cadera durante la repetición.', 'Abrir los codos hacia los lados.'],
    fig: { k: 1, e: 1, hi: ['delt', 'uarm'], A: { hip: [100, 70], torso: 133, ankle: [142, 138], hand: [62, 141], foot: 0 }, B: { hip: [100, 84], torso: 128, ankle: [142, 138], hand: [62, 141], foot: 0 }, back: () => fFloor() } },
  { key: 'invrow', name: 'Remo Invertido', type: 'Tracción', group: 'Espalda', bw: 1, musc: ['Dorsales', 'Espalda media', 'Bíceps'], reps: '6-12', rest: 75,
    steps: ['Acuéstate bajo una barra baja o una mesa muy firme y agárrala con los brazos estirados.', 'Cuerpo recto, talones en el suelo.', 'Lleva el pecho hacia la barra juntando las escápulas y baja lento.', 'Más fácil: dobla las rodillas.'],
    errs: ['Dejar caer la cadera.', 'Usar una mesa que pueda volcarse.'],
    fig: { k: 1, e: 1, hi: ['torso', 'uarm'], A: { hip: [99.3, 128.1], torso: -170.7, ankle: [172, 140], hand: [52, 72], foot: -80 }, B: { hip: [103, 108.6], torso: -155.6, ankle: [172, 140], hand: [52, 72], foot: -80 },
      back: () => fFloor() + fL([22, 72], [96, 72], 6) + fL([26, 72], [26, 141], 4, 'var(--line)') + fL([92, 72], [92, 141], 4, 'var(--line)') } },
  { key: 'superman', name: 'Superman', type: 'Tracción', group: 'Espalda', bw: 1, musc: ['Espalda baja', 'Glúteos', 'Espalda alta'], reps: '10-15', rest: 45,
    steps: ['Boca abajo con los brazos estirados al frente.', 'Levanta a la vez brazos, pecho y piernas unos centímetros.', 'Aguanta 2 s mirando al suelo y baja.'],
    errs: ['Echar la cabeza hacia atrás.', 'Subir de golpe.'],
    fig: { k: 1, e: 1, hi: ['torso', 'glute'], A: { hip: [100, 135], torso: 180, ankle: [172, 136], hand: [32, 135], foot: 0 }, B: { hip: [100, 133], torso: -170, ankle: [170, 124], hand: [34, 112], foot: 0 }, back: () => fFloor() } },
  { key: 'yraise', name: 'Elevaciones en Y boca abajo', type: 'Tracción', group: 'Hombros', bw: 1, musc: ['Deltoide posterior', 'Espalda alta'], reps: '10-15', rest: 45,
    steps: ['Boca abajo, brazos estirados al frente formando una Y y pulgares hacia arriba.', 'Junta las escápulas y levanta los brazos sin despegar el pecho.', 'Aguanta 1 s y baja lento.'],
    errs: ['Arquear la zona lumbar.', 'Encoger los hombros hacia las orejas.'],
    fig: { k: 1, e: 1, hi: ['delt'], A: { hip: [100, 135], torso: 180, ankle: [172, 136], hand: [34, 137], foot: 0 }, B: { hip: [100, 135], torso: -176, ankle: [172, 136], hand: [36, 110], foot: 0 }, back: () => fFloor() } },

  /* ---------- CORE Y CARDIO ---------- */
  { key: 'deadbug', name: 'Bicho Muerto', type: 'Core', group: 'Core', bw: 1, musc: ['Abdomen', 'Core'], reps: '8-12', rest: 45,
    steps: ['Boca arriba, brazos al techo y rodillas a 90° sobre la cadera.', 'Pega la zona lumbar al suelo.', 'Estira un brazo atrás y la pierna contraria al frente sin despegar la espalda. Vuelve y cambia de lado.'],
    errs: ['Arquear la espalda al estirar.', 'Ir rápido.'],
    fig: { k: 1, e: 1, hi: ['torso'], A: { hip: [100, 132], torso: 180, ankle: [126, 96], hand: [56, 84], foot: 0 }, B: { hip: [100, 132], torso: 180, ankle: [172, 124], hand: [10, 126], foot: 0 }, back: () => fFloor() } },
  { key: 'legraise', name: 'Elevación de Piernas Tumbado', type: 'Core', group: 'Core', bw: 1, musc: ['Abdomen bajo', 'Flexores de cadera'], reps: '10-15', rest: 45,
    steps: ['Boca arriba, manos junto a la cadera o bajo los glúteos.', 'Con las piernas casi rectas, súbelas hasta la vertical.', 'Bájalas lento sin que la zona lumbar se despegue del suelo.'],
    errs: ['Arquear la espalda al bajar.', 'Dejar caer las piernas.'],
    fig: { k: 1, e: 1, hi: ['torso', 'thigh'], A: { hip: [100, 134], torso: 180, ankle: [172, 132], hand: [102, 139], foot: 0 }, B: { hip: [100, 134], torso: 180, ankle: [108, 62], hand: [102, 139], foot: -60 }, back: () => fFloor() } },
  { key: 'mountain', name: 'Escaladores', type: 'Core', group: 'Core', bw: 1, musc: ['Abdomen', 'Core', 'Hombros'], reps: '20-40 s', rest: 45,
    steps: ['Posición de flexión con los brazos estirados.', 'Lleva una rodilla al pecho y regrésala; alterna rápido.', 'Mantén la cadera baja y los hombros sobre las manos.'],
    errs: ['Subir la cadera.', 'Rebotar con los pies sin mover las rodillas.'],
    fig: { k: 1, e: 1, hi: ['thigh', 'torso'], A: Object.assign({}, MV_PUSH), B: { hip: [102.3, 106.3], torso: -159.7, ankle: [124, 128], hand: [61, 141], foot: 60 }, back: p => fFloor() + legBack(p, [171.6, 132], 1) } },
  { key: 'burpee', name: 'Burpees', type: 'Core', group: 'Core', bw: 1, musc: ['Cuerpo completo', 'Core', 'Pecho'], reps: '6-12', rest: 75,
    steps: ['De pie, baja a cuclillas y apoya las manos en el suelo.', 'Lleva los pies atrás a posición de flexión.', 'Regresa los pies a las manos, ponte de pie y da un pequeño salto con los brazos arriba.'],
    errs: ['Hundir la cadera al saltar atrás.', 'Hacerlo tan rápido que pierdes la técnica.'],
    fig: { k: 1, e: 1, hi: ['thigh', 'torso'], A: { hip: [95, 68], torso: -90, ankle: [100, 141], hand: [97, 70], foot: 0 }, B: Object.assign({}, MV_PUSH), back: () => fFloor() } },
  { key: 'jumpjack', name: 'Saltos de Tijera', type: 'Core', group: 'Core', bw: 1, musc: ['Cardio', 'Pantorrillas', 'Hombros'], reps: '30-45 s', rest: 30,
    steps: ['De pie con los brazos a los lados.', 'Salta abriendo las piernas y subiendo los brazos sobre la cabeza.', 'Salta otra vez para volver al inicio. Sigue a ritmo constante.'],
    errs: ['Caer sobre los talones.', 'Doblar la espalda.'],
    fig: { rig: 'front', hi: ['delt', 'shin'], A: { hip: [100, 67], uL: 100, fL: 95, uR: 80, fR: 85, tL: 92, sL: 90, tR: 88, sR: 90 }, B: { hip: [100, 62], uL: -125, fL: -110, uR: -55, fR: -70, tL: 112, sL: 108, tR: 68, sR: 72 }, back: () => fFloor() } },
  { key: 'balance', name: 'Equilibrio en un Pie', type: 'Core', group: 'Core', bw: 1, musc: ['Equilibrio', 'Glúteos', 'Pantorrillas'], reps: '20-30 s', rest: 30,
    steps: ['De pie junto a una pared o silla por si necesitas apoyo.', 'Levanta un pie y mantén el equilibrio con la mirada fija al frente.', 'Aguanta el tiempo indicado y cambia de pierna. Más difícil: cierra los ojos.'],
    errs: ['Bloquear la rodilla de apoyo.', 'Hacerlo lejos de un apoyo si te cuesta.'],
    fig: { rig: 'front', hi: ['thigh', 'glute'], A: { hip: [100, 67], uL: 170, fL: 175, uR: 10, fR: 5, tL: 92, sL: 90, tR: 88, sR: 90 }, B: { hip: [100, 67], uL: 168, fL: 172, uR: 12, fR: 8, tL: 92, sL: 90, tR: 40, sR: 110 }, back: () => fFloor() } },

  /* ---------- MÁQUINAS ---------- */
  { key: 'machshoulder', name: 'Press de Hombro en Máquina', type: 'Empuje', group: 'Hombros', musc: ['Hombros', 'Tríceps'], reps: '8-12', rest: 90,
    steps: ['Ajusta el asiento para que las asas queden a la altura de los hombros.', 'Espalda apoyada en el respaldo y pies firmes.', 'Empuja hacia arriba sin bloquear los codos y baja controlando hasta la altura de las orejas.'],
    errs: ['Despegar la espalda del respaldo.', 'Bajar demasiado rápido.'],
    fig: { k: -1, e: 1, hi: ['delt', 'uarm'], A: { hip: [76, 112], torso: -95, ankle: [112, 140], hand: [90, 64], foot: 0 }, B: { hip: [76, 112], torso: -95, ankle: [112, 140], hand: [80, 22], foot: 0 },
      back: p => mvRef('chestpress').fig.back ? mvRef('chestpress').fig.back(p) : fFloor(), front: p => fC(p.hand, 4) } },
  { key: 'machrow', name: 'Remo en Máquina', type: 'Tracción', group: 'Espalda', musc: ['Espalda media', 'Dorsales', 'Bíceps'], reps: '8-12', rest: 90,
    steps: ['Pecho apoyado en la almohadilla y pies firmes.', 'Tira de las asas llevando los codos atrás y juntando las escápulas.', 'Vuelve estirando los brazos sin despegar el pecho.'],
    errs: ['Tirar con los brazos y no con la espalda.', 'Despegar el pecho de la almohadilla.'],
    fig: { k: -1, e: 1, hi: ['torso', 'uarm'], A: { hip: [76, 112], torso: -84, ankle: [112, 140], hand: [128, 70], foot: 0 }, B: { hip: [76, 112], torso: -84, ankle: [112, 140], hand: [96, 76], foot: 0 },
      back: () => fFloor() + fL([60, 118], [96, 118], 6) + fL([78, 118], [78, 140], 4) + fR(92, 52, 7, 34) + fL([96, 86], [96, 118], 4), front: p => fC(p.hand, 4) } },
  { key: 'smithsquat', name: 'Sentadilla en Multipower (Smith)', type: 'Piernas', group: 'Piernas', musc: ['Cuádriceps', 'Glúteos'], reps: '8-12', rest: 120,
    steps: ['Barra sobre la parte alta de la espalda y pies un poco por delante de la barra.', 'Gira la barra para soltar los seguros.', 'Baja hasta que los muslos queden paralelos y sube empujando con todo el pie.'],
    errs: ['Pies justo bajo la barra (carga las rodillas).', 'Olvidar poner los seguros a la altura correcta.'],
    fig: { k: -1, e: -1, hi: ['thigh', 'glute'], A: { hip: [95, 68], torso: -86, ankle: [104, 141], handRel: [-6, -3], foot: 0 }, B: { hip: [80, 100], torso: -64, ankle: [104, 141], handRel: [-6, -3], foot: 0 },
      back: () => fFloor() + fL([62, 4], [62, 141], 4, 'var(--line)') + fL([128, 4], [128, 141], 4, 'var(--line)'), front: p => fBar(fadd(p.sh, 180, 2), 0, 72, 5) } },
];
MOVES.forEach(x => { x.re = x.re || /(?!)/; });
/* No duplicar si ya existen (por si otra versión los agregó) */
MOVES.filter(x => !LIB.some(y => y.key === x.key || normName(y.name) === normName(x.name))).forEach(x => LIB.push(x));
Object.assign(ALIAS, { 'sentadilla sin peso': 'bwsquat', 'sentadilla al aire': 'bwsquat', 'step up': 'stepup', 'subida al banco': 'stepup', 'flexiones de rodilla': 'kneepush', 'flexiones inclinadas': 'inclinepush', 'remo australiano': 'invrow', 'dominadas australianas': 'invrow', 'dead bug': 'deadbug', 'mountain climber': 'mountain', 'burpee': 'burpee', 'jumping jack': 'jumpjack', 'kettlebell swing': 'kbswing', 'pike': 'pikepush', 'sit to stand': 'sitstand', 'smith': 'smithsquat', 'multipower': 'smithsquat' });

/* Sin peso externo: ayuda al coach, al peso inicial y a los mensajes */
const MV_BW = /peso corporal|con salto|isometrica en pared|subida al cajon|a una pierna$|flexiones|en pica|remo invertido|superman|elevaciones en y|bicho muerto|elevacion de piernas|escaladores|burpees|saltos de tijera|equilibrio en un pie|sentarse y pararse|plancha|crunch abdominal|dominadas|fondos|puente de gluteo/;
function isBodyweight(name) { const x = libFind(name); return !!(x && x.bw) || MV_BW.test(normName(name)); }

/* ---------- El generador de rutinas usa los nuevos ejercicios ---------- */
(function () {
  const S = PB_SLOTS, add = (slot, eq, list) => { if (!S[slot]) return; S[slot][eq] = list.concat((S[slot][eq] || []).filter(n => !list.includes(n))); };
  add('squat', 'body', ['Sentadilla con peso corporal', 'Sentadilla Búlgara']);
  add('squat', 'home', ['Sentadilla Goblet', 'Sentadilla Búlgara', 'Subida al Cajón']);
  add('squat', 'gym', ['Prensa 45°', 'Sentadilla Hack', 'Sentadilla en Multipower (Smith)']);
  add('hinge', 'body', ['Puente de Glúteo a una Pierna', 'Puente de Glúteo']);
  add('hinge', 'home', ['Peso Muerto Rumano', 'Peso Muerto a una Pierna']);
  add('glute', 'body', ['Puente de Glúteo', 'Puente de Glúteo a una Pierna']);
  add('quad', 'body', ['Zancadas', 'Subida al Cajón', 'Sentadilla con Salto']);
  add('quad', 'home', ['Zancadas', 'Subida al Cajón', 'Sentadilla Búlgara']);
  add('ham', 'body', ['Puente de Glúteo a una Pierna']);
  add('ham', 'home', ['Peso Muerto a una Pierna', 'Peso Muerto Rumano']);
  add('hpush', 'body', ['Flexiones', 'Flexiones Inclinadas']);
  S.hpush.bodyBeg = ['Flexiones Inclinadas', 'Flexiones de Rodillas'];
  add('ipush', 'body', ['Flexiones Diamante']);
  add('vpush', 'body', ['Flexiones en Pica']);
  add('vpush', 'gym', ['Press Militar (Mancuernas)', 'Press de Hombro en Máquina']);
  add('hpull', 'body', ['Remo Invertido']);
  add('hpull', 'home', ['Remo con Mancuerna a una Mano', 'Remo Invertido']);
  add('hpull', 'gym', ['Remo Sentado con Cable', 'Remo en Máquina', 'Remo en Polea Baja']);
  add('vpull', 'body', ['Dominadas']);
  add('rear', 'body', ['Elevaciones en Y boca abajo']);
  add('rear', 'home', ['Pájaros (Deltoide Posterior)', 'Elevaciones en Y boca abajo']);
  add('tri', 'body', ['Fondos en Banco', 'Flexiones Diamante']);
  add('core', 'body', ['Plancha', 'Bicho Muerto']);
  add('core', 'home', ['Plancha', 'Bicho Muerto']);
  add('core2', 'body', ['Elevación de Piernas Tumbado', 'Crunch Abdominal']);
  add('core2', 'home', ['Elevación de Piernas Tumbado', 'Crunch Abdominal']);
  /* Las dominadas en "solo mi cuerpo" necesitan una barra: se agregan con nota */
  Object.assign(PB_AVOID, {
    knee: new RegExp(PB_AVOID.knee.source + '|con salto|subida al cajon|isometrica en pared|escaladores|burpees|saltos de tijera'),
    shoulder: new RegExp(PB_AVOID.shoulder.source + '|en pica|maquina de hombro|press de hombro'),
    back: new RegExp(PB_AVOID.back.source + '|superman|swing|a una pierna$|multipower'),
    wrist: new RegExp(PB_AVOID.wrist.source + '|burpees|escaladores'),
  });
})();
const _pbPickMv = pbPick;
pbPick = function (slot, o, used) {
  const S = PB_SLOTS[slot];
  if (typeof qkSkip === 'function' ? qkSkip(slot, o) : (o.equip === 'body' && (o.goal === 'mayor' || o.exp === 0) && (slot === 'vpull' || slot === 'ipush'))) return null;
  /* Movilidad y equilibrio: levantarse de la silla y equilibrio en lugar de saltos */
  if (o.goal === 'mayor') {
    if (slot === 'squat' && !used.includes('Sentarse y Pararse de la Silla')) return { name: 'Sentarse y Pararse de la Silla', c: true, slot };
    if (slot === 'core2' && !used.includes('Equilibrio en un Pie')) return { name: 'Equilibrio en un Pie', c: false, slot };
  }
  /* Principiantes sin equipo: flexiones más fáciles primero */
  if (S && o.equip === 'body' && o.exp <= 1 && S.bodyBeg) {
    const n = S.bodyBeg.find(x => !used.includes(x) && !(o.inj || []).some(k => PB_AVOID[k] && PB_AVOID[k].test(normName(x))));
    if (n) return { name: n, c: !!S.c, slot };
  }
  const r = _pbPickMv(slot, o, used);
  if (r && o.goal === 'mayor' && /con salto|burpees|saltos de tijera|escaladores/.test(normName(r.name))) return null;
  return r;
};
const _pbDayExMv = pbDayEx;
pbDayEx = function (o, key) {
  const out = _pbDayExMv(o, key);
  out.forEach(e => {
    if (o.equip === 'body' && e.name === 'Dominadas') e.note = 'Necesitas una barra (parque o puerta). Si no tienes, cámbialo por Remo Invertido.';
    /* Ejercicios por tiempo: las "reps" son segundos, como ya pasa con la plancha */
    if (/isometrica|escaladores|saltos de tijera|equilibrio/.test(normName(e.name))) { e.repsMin = 20; e.repsMax = 40; }
  });
  return out;
};
