/* ==========================================================================
   Catálogo ampliado de ejercicios (propio de Forja: nombres, textos y figuras).
   - Los ejercicios que ya existían no cambian de clave ni de nombre.
   - Los nuevos solo se reconocen por su nombre exacto o un alias exacto (`al`): así un nombre
     de tu historial que ya emparejaba con un ejercicio sigue emparejando con el mismo.
   - libFind guarda en caché el resultado de cada nombre (se llama muchas veces al dibujar).
   ========================================================================== */
const CAT_NEW = [
  /* ---------- PANTORRILLAS ---------- */
  { key: 'calfpress', name: 'Elevación de Talones en Prensa', type: 'Piernas', group: 'Piernas', musc: ['Pantorrillas'], reps: '12-20', rest: 60,
    al: ['gemelos en prensa', 'pantorrillas en prensa', 'elevacion de talones en la prensa', 'calf press', 'leg press calf raise'],
    steps: ['Siéntate en la prensa con la espalda pegada y apoya solo la parte delantera de los pies en el borde bajo de la plataforma.', 'Estira las piernas sin bloquear las rodillas y deja que los talones bajen hasta sentir el estiramiento.', 'Empuja con la punta de los pies lo más lejos que puedas y aprieta 1 s arriba.', 'Baja despacio (2 s); las rodillas no se mueven.'],
    errs: ['Doblar y estirar las rodillas: se vuelve prensa.', 'Rebotar abajo sin pausa.', 'Quitar los seguros sin tener los pies bien apoyados.'],
    fig: { k: -1, e: 1, hi: ['shin'],
      A: { hip: [70, 110], torso: -125, ankle: [122, 61], hand: [80, 110], foot: -158 },
      B: { hip: [70, 110], torso: -125, ankle: [122, 61], hand: [80, 110], foot: -105 },
      back: () => fFloor() + fL([64, 116], [37, 78], 8) + fL([62, 119], [86, 119], 6) + fL([75, 119], [75, 140], 4),
      front: p => fBar(fadd(p.toe, 47, 2), 47, 40, 6) } },
  /* ---------- TRÍCEPS ---------- */
  { key: 'vbarpush', name: 'Extensión de Tríceps con Barra V en Polea', type: 'Empuje', group: 'Brazos', musc: ['Tríceps'], reps: '10-15', rest: 60,
    al: ['triceps con barra v', 'triceps en polea con barra v', 'extension de triceps con barra v', 'jalon de triceps con barra v', 'triceps barra v', 'pushdown barra v', 'v-bar pushdown', 'v bar pushdown'],
    steps: ['Frente a la polea alta con la barra en V, agarre neutro y codos pegados a los costados.', 'Empuja hacia abajo hasta estirar los brazos y aprieta el tríceps 1 s.', 'Sube controlado hasta unos 90° sin que los codos se despeguen.'],
    errs: ['Abrir los codos o llevarlos hacia adelante.', 'Echar el cuerpo encima del agarre para mover más peso.'],
    fig: { k: -1, e: 1, hi: ['uarm'], arc: ['hand'],
      A: { hip: [95, 68], torso: -80, ankle: [98, 141], hand: [122, 42], foot: 0 },
      B: { hip: [95, 68], torso: -80, ankle: [98, 141], hand: [110, 72], foot: 0 },
      back: () => fFloor() + fPost(168) + fC([163, 8], 4),
      front: p => fCable([p.hand[0], p.hand[1] - 5], [163, 8]) + fL([p.hand[0] - 5, p.hand[1] + 3], [p.hand[0], p.hand[1] - 5], 3) + fL([p.hand[0], p.hand[1] - 5], [p.hand[0] + 5, p.hand[1] + 3], 3) } },
];
CAT_NEW.forEach(x => { x.re = /(?!)/; x.cat = 1; });
LIB.push(...CAT_NEW);

const CAT_ALIAS = {};
CAT_NEW.forEach(x => (x.al || []).forEach(a => { CAT_ALIAS[normName(a)] = x; }));
const _libFindCat = libFind, LF_CACHE = { n: 0, m: {} };
libFind = function (name) {
  if (LF_CACHE.n !== LIB.length) { LF_CACHE.n = LIB.length; LF_CACHE.m = {}; }
  const key = String(name);
  if (key in LF_CACHE.m) return LF_CACHE.m[key];
  const n = normName(name);
  /* 1) nombre exacto (como antes)  2) alias exacto de un ejercicio nuevo  3) todo lo de antes */
  const r = LIB.find(x => normName(x.name) === n) || CAT_ALIAS[n.trim()] || _libFindCat(name);
  return (LF_CACHE.m[key] = r || null);
};
