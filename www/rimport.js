/* ==========================================================================
   Importar rutinas de otra IA (18-oct-2026)
   - "Nueva rutina" pregunta: "Crear desde cero" (lo de siempre) o "Importar rutinas".
   - Importar: pegar texto o subir un archivo. Cada día (Día 1, Lunes, Push, Pierna…) = una rutina.
     Lee series, reps, RIR (o RPE), peso y descanso si vienen, en listas, tablas o líneas sueltas.
   - Cada ejercicio se empareja con el catálogo (también en inglés). Si no es seguro, se marca y se elige
     uno de la lista, se busca otro o se crea el tuyo (myex.js). Nunca se inventa.
   - Vista previa: nombre, día, series, reps, RIR y kg editables; quitar ejercicios o rutinas.
   - Etiqueta de origen (DeepSeek azul, ChatGPT negro, Claude naranja u otra con su color) en `d.src`;
     se ve como chip en Rutinas y se cambia tocándolo.
   - Nunca reemplaza ni borra: los nombres repetidos llevan "(Claude)" o "2". Los ejercicios son los del
     catálogo (mismo nombre = mismo historial, récords y sugerencias).
   - Solo teléfono; el reloj entrena las rutinas importadas como cualquier otra.
   ========================================================================== */
const RI_SRC = [['deepseek', 'DeepSeek', '#4d6bfe'], ['chatgpt', 'ChatGPT', '#000000'], ['claude', 'Claude', '#d97757']];
const RI_COLORS = ['#35b26a', '#e8466e', '#f2c230', '#9b6bff', '#22b8cf', '#ff6a2b', '#8d9399', '#ffffff'];
const RI_WD = { lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6, domingo: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6, sunday: 0 };
const RI_SPREAD = { 1: [1], 2: [1, 4], 3: [1, 3, 5], 4: [1, 2, 4, 5], 5: [1, 2, 3, 4, 5], 6: [1, 2, 3, 4, 5, 6], 7: [1, 2, 3, 4, 5, 6, 0] };

/* ---------- Leer el texto ---------- */
const RI_SXR = /(\d+)\s*(?:x|×|\*)\s*(\d+)(?:\s*(?:-|–|a|to)\s*(\d+))?/i;
const RI_SER = /(\d+)\s*(?:series|sets?|rondas)\b(?:\s*(?:de|of|x|×|,)?\s*(\d+)(?:\s*(?:-|–|a|to)\s*(\d+))?)?/i;
const RI_REPS = /(\d+)(?:\s*(?:-|–|a|to)\s*(\d+))?\s*(?:reps?\b|repeticiones|rep\.)/i;
const RI_DAYRE = /^(d[ií]a|day|sesi[oó]n|session|workout|entreno|entrenamiento|rutina)\s*(\d+|[a-f]\b)/i;
const RI_SPLIT = /^(push|pull|legs?|pierna|piernas|torso|upper|lower|full ?body|cuerpo completo|empuje|tracci[oó]n|espalda|pecho|hombros?|brazos|gl[uú]teos?|core|abdomen|fullbody)\b/i;
const RI_SKIP = /^(calentamiento|warm.?up|enfriamiento|cool.?down|estiramientos?|stretch\w*|notas?|notes?|consejos?|tips?|progresi[oó]n|progression|cardio|observaciones|recomendaciones|importante|nutrici[oó]n)\b/i;
const RI_NOISE = /cada|por lado|lado|each|per |opcional|optional|superserie|superset|biserie|drop|al fallo|failure/i;
const riWdOf = s => { const w = normName(s).split(/[^a-z]+/)[0]; return RI_WD[w] != null ? RI_WD[w] : null; };
function riClean(l) {
  return String(l).replace(/[\uD83C-\uDBFF][\uDC00-\uDFFF]|[☀-➿️‍]/g, '').replace(/\*\*|__|`/g, '').replace(/^\s*#+\s*/, '')
    .replace(/^\s*(?:[-*•·▪►>]+|\d+[.)])\s+/, '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
}
const riIsEx = c => RI_SXR.test(c) || RI_SER.test(c) || RI_REPS.test(c);
function riName(c) {
  let s = c.replace(/\(([^)]*)\)/g, (m, t) => (/\d/.test(t) || RI_NOISE.test(t) ? ' ' : ' ' + t + ' '));
  const cut = s.search(/\s[-–—|]\s|:|,\s|;|\s\d+\s*(?:x|×|\*|series|sets?|rondas)\b|\s\d+\s*[x×]|\s@|\s(?:rir|rpe)\b/i);
  let n = cut > 0 ? s.slice(0, cut) : s;
  if (/^\s*\d/.test(n)) n = s.replace(RI_SXR, ' ').replace(RI_SER, ' ').replace(/^[\s:–—-]+/, '').split(/\s[-–—|]\s|:|,|;|\s@|\s\d/)[0];
  return n.replace(/\s+/g, ' ').replace(/[\s.:–—-]+$/, '').trim();
}
function riNum(s) { const n = parseFloat(String(s).replace(',', '.')); return isFinite(n) ? n : null; }
function riRestOf(c) {
  const m = c.match(/(?:descanso|descansa|rest|desc\.|pausa)\s*[:=]?\s*([\d.,:]+(?:\s*[-–a]\s*[\d.,:]+)?\s*(?:s|seg|segundos|sec|secs|seconds|min|mins|minutos|minutes|'|")?)/i)
    || c.match(/([\d.,:]+\s*(?:s|seg|segundos|min|minutos|'))\s*(?:de\s*)?(?:descanso|rest)/i);
  if (!m) return null;
  const t = m[1].replace(/'$/, ' min').replace(/"$/, ' s');
  const v = typeof aixRestParse === 'function' ? aixRestParse(t) : null;
  return v && v >= 10 && v <= 600 ? v : null;
}
/* Datos de una línea (o de una fila de tabla ya armada como texto) */
function riExOf(c, name) {
  const e = { raw: name || riName(c), sets: null, rMin: null, rMax: null, rir: [], w: null, rest: null };
  let m = c.match(RI_SXR);
  if (m) { e.sets = +m[1]; e.rMin = +m[2]; e.rMax = m[3] ? +m[3] : +m[2]; }
  else {
    m = c.match(RI_SER); if (m) { e.sets = +m[1]; if (m[2]) { e.rMin = +m[2]; e.rMax = m[3] ? +m[3] : +m[2]; } }
    if (e.rMin == null) { m = c.match(RI_REPS); if (m) { e.rMin = +m[1]; e.rMax = m[2] ? +m[2] : +m[1]; } }
  }
  if (e.rMin != null && e.rMax < e.rMin) { const t = e.rMin; e.rMin = e.rMax; e.rMax = t; }
  m = c.match(/RIR\s*[:=]?\s*(\d(?:\s*[,/]\s*\d)*)(?:\s*(?:-|–|a)\s*(\d))?/i);
  if (m) e.rir = m[2] ? [Math.max(+m[1], +m[2])] : m[1].split(/[,/]/).map(x => +x);
  else { m = c.match(/RPE\s*[:=]?\s*(\d+(?:[.,]5)?)/i); if (m) e.rir = [Math.max(0, Math.min(5, Math.round(10 - riNum(m[1]))))]; }
  m = c.match(/(\d+(?:[.,]\d+)?)\s*(kg|kgs|kilos?|lb|lbs|libras)\b/i);
  if (m) {
    let w = riNum(m[1]); const lb = /^l/i.test(m[2]), uLb = state.settings.unit === 'lb';
    if (lb && !uLb) w = Math.round(w / 2.2046 * 2) / 2; else if (!lb && uLb) w = Math.round(w * 2.2046);
    e.w = w;
  }
  e.rest = riRestOf(c);
  return e;
}
/* Tablas: | Ejercicio | Series | Reps | RIR | … | (o separadas por tabulación) */
const riCells = l => (l.indexOf('|') >= 0 ? l.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|') : l.split('\t')).map(x => riClean(x));
const riIsRow = l => (l.match(/\|/g) || []).length >= 2 || (l.match(/\t/g) || []).length >= 2;
function riHead(cells) {
  const col = {}; let ok = false;
  cells.forEach((c, i) => {
    const n = normName(c);
    if (/ejercicio|exercise|movimiento|nombre/.test(n)) { col.name = i; ok = true; }
    else if (/^(series|sets?|serie)$/.test(n)) col.sets = i;
    else if (/rep/.test(n)) col.reps = i;
    else if (/rir|rpe/.test(n)) col.rir = i;
    else if (/peso|weight|carga|kg|lb/.test(n)) col.w = i;
    else if (/descanso|rest|pausa/.test(n)) col.rest = i;
  });
  return ok ? col : null;
}
function riParse(text) {
  const lines = String(text || '').replace(/\r/g, '').split('\n');
  const days = []; let day = null, skip = false, head = null;
  const newDay = t => { day = { title: t, ex: [] }; days.push(day); skip = false; head = null; };
  const add = e => { if (!day) newDay(''); if (!e.raw || e.raw.length < 2) return; const last = day.ex[day.ex.length - 1];
    if (e.merge && last && last.merge && normName(last.raw) === normName(e.raw)) { last.sets++; if (e.rMin != null) { last.rMin = Math.min(last.rMin == null ? e.rMin : last.rMin, e.rMin); last.rMax = Math.max(last.rMax || 0, e.rMax); } if (e.rir.length) last.rir.push(e.rir[0]); if (e.w != null && (last.w == null || e.w > last.w)) last.w = e.w; return; }
    day.ex.push(e); };
  for (const l of lines) {
    if (!l.trim()) continue;
    if (riIsRow(l)) {
      const cells = riCells(l);
      if (cells.every(c => /^[\s:-]*$/.test(c))) continue;
      const h = riHead(cells); if (h) { head = h; continue; }
      if (head && cells[head.name]) {
        if (skip) continue;
        const g = k => (head[k] != null ? cells[head[k]] || '' : '');
        const nm = riName(cells[head.name]); if (!nm) continue;
        const reps = g('reps');
        const e = riExOf(`${head.sets != null ? g('sets') + ' series de ' : ''}${reps ? reps + ' reps' : ''} ${g('rir') && !/rir|rpe/i.test(g('rir')) ? 'RIR ' + g('rir') : g('rir')} ${g('w') && /\d/.test(g('w')) && !/kg|lb/i.test(g('w')) ? g('w') + ' kg' : g('w')} ${g('rest') ? 'descanso ' + g('rest') : ''}`, nm);
        if (head.sets == null) { e.sets = 1; e.merge = true; if (e.rir.length > 1) e.rir = [e.rir[0]]; }
        else if (e.rir.length > 1 && e.sets && e.rir.length !== e.sets) e.rir = [Math.max.apply(null, e.rir)];
        add(e);
        continue;
      }
    }
    const heading = /^\s*#/.test(l) || /^\s*\*\*[^*]+\*\*\s*:?\s*$/.test(l) || /^\s*__[^_]+__\s*:?\s*$/.test(l);
    const bullet = /^\s*(?:[-*•·▪►]|\d+[.)])\s+/.test(l);
    const c = riClean(l); if (!c) continue;
    const ex = riIsEx(c);
    const short = c.length <= 70;
    if (!ex && short && (RI_DAYRE.test(c) || riWdOf(c) != null || ((heading || /:$/.test(c) || !bullet) && RI_SPLIT.test(c)))) { newDay(c.replace(/:$/, '')); continue; }
    if (!ex && RI_SKIP.test(c)) { if (heading || /:$/.test(c) || !bullet) { skip = true; head = null; } continue; }
    if (!ex && heading && short) { if (day && day.ex.length) newDay(c.replace(/:$/, '')); else if (day) day.title = day.title || c.replace(/:$/, ''); else newDay(c.replace(/:$/, '')); continue; }
    if (skip) continue;
    if (ex) { const e = riExOf(c); if (e.raw && /[a-záéíóúñ]/i.test(e.raw)) add(e); continue; }
    if (bullet && day && short && !/[.!?]$/.test(c) && c.split(' ').length <= 9) { const e = riExOf(c); e.loose = true; add(e); }
  }
  return days.filter(d => d.ex.length);
}

/* ---------- Emparejar con el catálogo ---------- */
const RI_STOP = new Set('de del con en la el los las al a y o para sobre por the with on of and to in at for'.split(' '));
const riStem = w => (w.length > 3 ? w.replace(/(es|s)$/, '') : w);
const riToks = s => normName(s).replace(/[^a-z0-9]+/g, ' ').split(' ').filter(w => w && !RI_STOP.has(w)).map(riStem);
function riDice(a, b) { if (!a.length || !b.length) return 0; const B = b.slice(); let n = 0; a.forEach(t => { const i = B.indexOf(t); if (i >= 0) { n++; B.splice(i, 1); } }); return 2 * n / (a.length + b.length); }
/* Nombres en inglés frecuentes → ejercicio de Forja */
const RI_DICT_SRC = {
  'Press Banca Plano (Barra)': 'bench press|barbell bench press|flat bench press|flat barbell bench press|press de banca|press banca plano',
  'Press Banca Inclinado (Barra)': 'incline bench press|incline barbell bench press|incline barbell press|press inclinado con barra',
  'Press Banca con Mancuernas': 'dumbbell bench press|db bench press|flat dumbbell press|dumbbell press',
  'Press Inclinado con Mancuernas': 'incline dumbbell press|incline db press|incline dumbbell bench press',
  'Aperturas con Mancuernas': 'dumbbell fly|dumbbell flyes|dumbbell flies|chest fly|flat dumbbell fly',
  'Cruce de Poleas': 'cable crossover|cable fly|cable flyes|cable flies|cable chest fly',
  'Pec Deck (Contractora)': 'pec deck|machine fly|pec deck fly|butterfly',
  'Press de Pecho en Máquina': 'chest press|machine chest press|chest press machine',
  'Fondos en Paralelas': 'dips|chest dips|parallel bar dips|fondos',
  'Flexiones': 'push ups|pushups|push up|pushup|lagartijas',
  'Dominadas': 'pull ups|pullups|pull up|pullup|dominada',
  'Dominadas Supinas': 'chin ups|chinups|chin up',
  'Jalón al Pecho': 'pulldown|lat pulldowns|cable pulldown|jalon|jalon al pecho|jalon frontal',
  'Remo Sentado con Cable': 'seated cable row|cable row|seated row|low row|remo sentado en polea|remo sentado|remo en polea sentado|remo sentado con polea',
  'Remo con Barra': 'barbell row|bent over row|bent over barbell row|barbell bent over row',
  'Remo con Mancuerna a una Mano': 'dumbbell row|one arm dumbbell row|single arm dumbbell row|db row',
  'Remo en T': 't bar row|tbar row',
  'Remo en Máquina': 'machine row|seated machine row',
  'Pullover en Polea': 'straight arm pulldown|cable pullover',
  'Peso Muerto Convencional': 'deadlift|conventional deadlift|barbell deadlift',
  'Peso Muerto Rumano': 'romanian deadlift|rdl|barbell rdl',
  'Hiperextensiones': 'back extension|back extensions|hyperextension|hyperextensions',
  'Press Militar con Barra': 'overhead press|military press|barbell overhead press|standing barbell press|ohp',
  'Press Militar (Mancuernas)': 'dumbbell shoulder press|seated dumbbell press|seated dumbbell shoulder press|shoulder press',
  'Press de Hombro en Máquina': 'machine shoulder press|shoulder press machine',
  'Press Arnold': 'arnold press',
  'Elevaciones Laterales': 'lateral raise|lateral raises|dumbbell lateral raise|side lateral raise|side raises',
  'Elevaciones Frontales': 'front raise|front raises|dumbbell front raise',
  'Pájaros (Deltoide Posterior)': 'rear delt fly|reverse fly|reverse flyes|bent over reverse fly|rear delt raise|pajaros|pajaros con mancuernas|pajaro|vuelos posteriores|aperturas invertidas',
  'Encogimientos (Trapecio)': 'shrugs|shrug|dumbbell shrug|dumbbell shrugs',
  'Curl Bíceps': 'bicep curl|biceps curl|dumbbell curl|dumbbell bicep curl|dumbbell biceps curl',
  'Curl con Barra': 'barbell curl|barbell bicep curl',
  'Curl Martillo': 'hammer curl|hammer curls|dumbbell hammer curl',
  'Curl Predicador (Scott)': 'preacher curl|preacher curls',
  'Curl Concentrado': 'concentration curl',
  'Press Francés': 'skull crusher|skullcrusher|skull crushers|lying triceps extension|ez bar skull crusher',
  'Extensión de Tríceps sobre la Cabeza': 'overhead triceps extension|overhead tricep extension|dumbbell overhead extension',
  'Tríceps Polea': 'triceps pushdown|tricep pushdown|cable pushdown|pushdown|straight bar pushdown',
  'Tríceps con Cuerda': 'rope pushdown|triceps rope pushdown|rope triceps pushdown|tricep rope pushdown|extension de triceps en polea con cuerda|extension de triceps con cuerda|jalon de triceps con cuerda|triceps en polea con cuerda',
  'Fondos en Banco': 'bench dips|bench dip',
  'Sentadilla con Barra': 'squat|back squat|barbell squat|barbell back squat|sentadilla|sentadillas|sentadilla trasera|sentadilla libre',
  'Sentadilla Goblet': 'goblet squat',
  'Sentadilla Búlgara': 'bulgarian split squat|bulgarian split squats',
  'Zancadas': 'lunges|lunge|dumbbell lunges',
  'Prensa 45°': 'leg press|45 degree leg press|prensa de piernas|prensa',
  'Sentadilla Hack': 'hack squat|machine hack squat',
  'Extensión de Pierna': 'leg extensions|leg extension machine|extension de cuadriceps|extensiones de cuadriceps',
  'Curl Femoral Tumbado': 'leg curl|lying leg curl|leg curls|hamstring curl',
  'Hip Thrust': 'hip thrust|barbell hip thrust|hip thrusts',
  'Puente de Glúteo': 'glute bridge|glute bridges',
  'Abducción de Cadera': 'hip abduction|abductor machine|hip abductor|abductores',
  'Aducción de Cadera': 'hip adduction|adductor machine|hip adductor|aductores',
  'Elevación de Talones de Pie': 'calf raise|calf raises|standing calf raises|pantorrillas|gemelos|elevacion de talones',
  'Elevación de Talones Sentado': 'seated calf raise|seated calf raises',
  'Patada de Glúteo en Polea': 'cable kickback|glute kickback cable|cable glute kickback',
  'Plancha': 'plank|planks',
  'Crunch Abdominal': 'crunch|crunches|abdominales|crunch abdominal',
  'Crunch en Polea': 'cable crunch|kneeling cable crunch',
  'Elevación de Piernas Colgado': 'hanging leg raise|hanging leg raises',
  'Elevación de Piernas Tumbado': 'leg raise|lying leg raise|leg raises',
  'Rueda Abdominal': 'ab wheel|ab rollout|ab wheel rollout',
  'Swing con Kettlebell': 'kettlebell swing|kettlebell swings|kb swing',
  'Subida al Cajón': 'step up|step ups|box step up',
  'Escaladores': 'mountain climbers|mountain climber',
  'Bicho Muerto': 'dead bug|dead bugs',
  'Burpees': 'burpee',
  'Remo Invertido': 'inverted row|inverted rows',
  'Flexiones Diamante': 'diamond push ups|diamond pushups',
  'Sentadilla en Multipower (Smith)': 'smith machine squat|smith squat',
  'Face Pull': 'face pulls|cable face pull',
};
const RI_EN_SRC = 'calf press on the leg press machine=calfpress|triceps pushdown v bar attachment=vbarpush|smith machine bench press=smithbench|wide grip barbell bench press=widebench|one arm dumbbell bench press=db1bench|dumbbell bench press with neutral grip=dbneutral|dumbbell floor press=floorpress|svend press=svend|standing cable chest press=cablepress|smith machine incline bench press=smithincline|incline dumbbell bench with palms facing in=dbinclneutral|incline cable chest press=cableincline|decline barbell bench press=declbench|decline dumbbell bench press=dbdecline|decline smith press=smithdecline|incline dumbbell flyes=dbinclinefly|decline dumbbell flyes=dbdeclfly|cable crossover=crosshl|low cable crossover=crosslh|incline cable flye=inclcablefly|flat bench cable flyes=cableflybench|single arm cable crossover=cablefly1|cross over with bands=bandfly|push up wide=widepush|push ups with feet elevated=declpush|suspended push up=trxpush|chin up=chinup|band assisted pull up=bandpull|weighted pull ups=weightpull|scapular pull up=scappull|close grip front lat pulldown=closepull|underhand cable pulldowns=suppull|v bar pulldown=neutralpd|one arm lat pulldown=onearmpd|rope straight arm pulldown=ropepullover|seated one arm cable pulley rows=onearmrow|kneeling single arm high pulley row=kneelrow1|reverse grip bent over rows=yates|smith machine bent over row=smithrow|bent over two dumbbell row=dbrow2|dumbbell incline row=csrow|lying t bar row=ctrow|bent over one arm long bar row=meadows|leverage high row=highrowmach|suspended row=trxrow|barbell shrug=bbshrug|cable shrugs=cableshrug|barbell shrug behind the back=bbshrugback|rack pulls=rackpull|deficit deadlift=deficitdl|seated barbell military press=seatbbohp|smith machine overhead shoulder press=smithohp|standing palms in dumbbell press=neutralohp|dumbbell one arm shoulder press=db1ohp|seated cable shoulder press=cableohp|push press=pushpress|standing bradford press=bradford|cuban press=cuban|handstand push ups=hspu|seated side lateral raise=seatlat|lying one arm lateral raise=lyinglat|lateral raise with bands=bandlat|front plate raise=platefront|front cable raise=cablefront|front incline dumbbell raise=inclfront|dumbbell lying rear lateral raise=csrear|cable rear delt fly=cablerear|reverse machine flyes=revpecdeck|band pull apart=pullapart|barbell rear delt row=bbrearrow|upright barbell row=bbupright|upright cable row=cableupright|standing dumbbell upright row=dbupright|smith machine upright row=smithupright|upright row with bands=bandupright|external rotation with cable=cableextrot|cable internal rotation=cableintrot|external rotation with band=bandextrot|kettlebell halo=kbhalo|ez bar curl=ezcurl|close grip standing barbell curl=closecurl|wide grip standing barbell curl=widecurl|drag curl=dragcurl|seated dumbbell curl=altcurl0|cross body hammer curl=crosshammer|incline hammer curls=inclhammer|preacher hammer dumbbell curl=scotthammer|cable hammer curls rope attachment=cablehammer|one arm dumbbell preacher curl=dbpreacher|cable preacher curl=cablepreacher|machine preacher curls=machpreacher|machine bicep curl=machcurl|incline dumbbell curl=inclinecurl|dumbbell prone incline curl=spidercurl|zottman curl=zottman|standing biceps cable curl=cablecurl|standing one arm cable curl=cablecurl1|lying cable curl=lyingcablecurl|high cable curls=highcablecurl|reverse barbell curl=revcurl|reverse barbell preacher curls=revezscott|standing dumbbell reverse curl=revdbcurl|reverse cable curl=revcablecurl|reverse grip triceps pushdown=revpush|triceps overhead extension with rope=ohcablerope|cable incline triceps extension=incltricable|cable lying triceps extension=lyingtricable|standing one arm dumbbell triceps extension=oh1|kettlebell overhead triceps extension=kboh|lying dumbbell tricep extension=dbskull|decline ez bar triceps extension=declskull|jm press=jmpress|tate press=tatepress|close grip barbell bench press=closebench|smith machine close grip bench press=smithclose|close grip dumbbell press=dbclose|tricep dumbbell kickback=dbkick|machine triceps extension=machtri|dip machine=machdip|weighted bench dip=weightbenchdip|dips triceps version=tridips|palms up barbell wrist curl over a bench=wristcurl|palms down wrist curl over a bench=revwrist|palms up dumbbell wrist curl over a bench=dbwrist|cable wrist curl=cablewrist|standing palms up barbell behind the back wrist curl=behindwrist|wrist roller=roller|plate pinch=pinch|finger curls=fingercurl|narrow stance leg press=narrowpress|narrow stance hack squats=narrowhack|barbell hack squat=bbhack|single leg leg extension=sllegext|front barbell squat=frontsquat|front squats with two kettlebells=kbfrontsquat|zercher squats=zercher|box squat=boxsquat|wide stance barbell squat=sumobb|dumbbell squat=dbsquat|barbell lunge=bblunge|smith single leg split squat=smithbulg|split squat with dumbbells=splitsquat|dumbbell rear lunge=revlunge|dumbbell step ups=dbstepup|barbell step ups=bbstepup|standing leg curl=standcurl|ball leg curl=ballcurl|platform hamstring slides=sliders|natural glute ham raise=nordic|glute ham raise=ghr|stiff legged barbell deadlift=sldl|stiff legged dumbbell deadlift=dbsldl|good morning=goodmorning|barbell glute bridge=bbbridge|smith machine hip raise=smithbridge|glute kickback=quadkick|monster walk=monsterwalk|pull through=pullthrough|sumo deadlift=sumodl|trap bar deadlift=hexdl|plie dumbbell squat=sumosquat|cable hip adduction=cableadd|band hip adductions=bandadd|smith machine calf raise=smithcalf|standing barbell calf raise=bbcalf|standing dumbbell calf raise=dbcalf|calf raises with bands=bandcalf|barbell seated calf raise=bbseatcalf|dumbbell seated one leg calf raise=dbseatcalf1|donkey calf raises=donkeycalf|ab crunch machine=machcrunch|kneeling cable crunch with alternating oblique twists=cabletwist|decline crunch=declcrunch|oblique crunches on the floor=obliquecrunch|reverse crunch=revcrunch|decline reverse crunch=declrevcrunch|flat bench leg pull in=benchtuck|air bike=bikecrunch|sit up=situp|jackknife sit up=vup|alternate heel touchers=heeltouch|knee hip raise on parallel bars=captain|side bridge=sideplank|barbell ab rollout on knees=rollout|russian twist=russian|standing cable wood chop=woodchop|standing cable lift=woodchoplh|pallof press=pallof|pallof press with rotation=pallofrot|dumbbell side bend=dbsidebend|kettlebell windmill=kbwindmill|farmers walk=farmer|power clean=powerclean|one arm kettlebell snatch=kbsnatch|sled push=sledpush|sled drag harness=sleddrag|battling ropes=battlerope';
let RI_DICT = null, RI_ENK = null, RI_IX = null, RI_IXN = 0;
function riDict() {
  if (RI_DICT) return RI_DICT;
  RI_DICT = {}; RI_ENK = {};
  Object.keys(RI_DICT_SRC).forEach(n => RI_DICT_SRC[n].split('|').forEach(p => { RI_DICT[p] = n; }));
  RI_EN_SRC.split('|').forEach(s => { const i = s.lastIndexOf('='); const en = s.slice(0, i), k = s.slice(i + 1); const x = LIB.find(y => y.key === k); if (x) { if (!RI_DICT[en]) RI_DICT[en] = x.name; RI_ENK[k] = riToks(en); } });
  return RI_DICT;
}
/* Palabras sueltas en inglés → español (para comparar con el catálogo) */
const RI_WORDS = [[/\bdumbbells?\b|\bdb\b/g, 'mancuernas'], [/\bbarbell\b/g, 'barra'], [/\bez[ -]?bar\b/g, 'barra z'], [/\bsmith machine\b/g, 'smith'], [/\bcable\b/g, 'polea'], [/\bmachine\b/g, 'maquina'],
  [/\bkettlebells?\b|\bkb\b/g, 'kettlebell'], [/\bbands?\b/g, 'banda'], [/\bincline\b/g, 'inclinado'], [/\bdecline\b/g, 'declinado'], [/\bflat\b/g, 'plano'], [/\bseated\b/g, 'sentado'],
  [/\bstanding\b/g, 'de pie'], [/\blying\b/g, 'tumbado'], [/\b(single|one)[ -](arm|hand)\b/g, 'a una mano'], [/\b(single|one)[ -]leg\b/g, 'a una pierna'], [/\bclose[ -]grip\b/g, 'agarre cerrado'],
  [/\bwide[ -]grip\b/g, 'agarre ancho'], [/\bneutral[ -]grip\b/g, 'agarre neutro'], [/\b(reverse[ -]grip|underhand|supinated)\b/g, 'supino'], [/\bbench press\b/g, 'press banca'],
  [/\b(overhead|shoulder|military) press\b/g, 'press militar'], [/\bchest press\b/g, 'press de pecho'], [/\bpush[ -]?ups?\b/g, 'flexiones'], [/\bpull[ -]?ups?\b/g, 'dominadas'], [/\bchin[ -]?ups?\b/g, 'dominadas supinas'],
  [/\bpull[ -]?downs?\b/g, 'jalon'], [/\bpullovers?\b/g, 'pullover'], [/\brows?\b/g, 'remo'], [/\bromanian deadlifts?\b|\brdl\b/g, 'peso muerto rumano'], [/\bstiff[ -]leg(ged)?\b/g, 'piernas rigidas'],
  [/\bdeadlifts?\b/g, 'peso muerto'], [/\bfront squats?\b/g, 'sentadilla frontal'], [/\bsplit squats?\b/g, 'sentadilla dividida'], [/\bsquats?\b/g, 'sentadilla'], [/\blunges?\b/g, 'zancadas'],
  [/\bleg press\b/g, 'prensa'], [/\bleg extensions?\b/g, 'extension de pierna'], [/\bleg curls?\b/g, 'curl femoral'], [/\bcalf raises?\b/g, 'elevacion de talones'], [/\blateral raises?\b/g, 'elevaciones laterales'],
  [/\bfront raises?\b/g, 'elevacion frontal'], [/\braises?\b/g, 'elevacion'], [/\bfl(y|ys|yes|ies)\b/g, 'aperturas'], [/\bcrossovers?\b/g, 'cruce de poleas'], [/\bshrugs?\b/g, 'encogimientos'],
  [/\bhammer\b/g, 'martillo'], [/\bpreacher\b/g, 'scott'], [/\bskull ?crushers?\b/g, 'press frances'], [/\bkickbacks?\b/g, 'patada'], [/\bropes?\b/g, 'cuerda'], [/\btriceps?\b/g, 'triceps'],
  [/\bbiceps?\b/g, 'biceps'], [/\bextensions?\b/g, 'extension'], [/\boverhead\b/g, 'sobre la cabeza'], [/\bglutes?\b/g, 'gluteo'], [/\bbridges?\b/g, 'puente'], [/\bhip\b/g, 'cadera'], [/\bchest\b/g, 'pecho'],
  [/\bshoulders?\b/g, 'hombro'], [/\brear delts?\b/g, 'deltoide posterior'], [/\bwrist\b/g, 'muneca'], [/\bplanks?\b/g, 'plancha'], [/\bdips?\b/g, 'fondos'], [/\bstep[ -]?ups?\b/g, 'subida al cajon'],
  [/\btwists?\b/g, 'giro'], [/\bwalking\b/g, 'caminando'], [/\bhanging\b/g, 'colgado'], [/\blegs?\b/g, 'pierna'], [/\bwith\b/g, 'con'], [/\bon\b/g, 'en']];
function riTrans(n) { let s = ' ' + n + ' '; RI_WORDS.forEach(([r, t]) => { s = s.replace(r, t); }); return s.replace(/\s+/g, ' ').trim(); }
function riIndex() {
  if (RI_IX && RI_IXN === LIB.length) return RI_IX;
  RI_IXN = LIB.length; riDict();
  RI_IX = LIB.filter(x => !x.hidden).map(x => ({ x, f: [riToks(x.name)].concat((x.al || []).map(riToks)), en: RI_ENK[x.key] || null }));
  return RI_IX;
}
const riNorm = s => normName(s).replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
function riMatch(raw) {
  const D = riDict(), q = String(raw || '').trim(), n = riNorm(q), tr = riTrans(n), byName = nm => LIB.find(x => x.name === nm);
  if (!n) return { name: null, sure: false, sugg: [] };
  const exact = LIB.find(x => riNorm(x.name) === n || (x.al || []).some(a => riNorm(a) === n));
  if (exact) return { name: exact.name, sure: true, sugg: [] };
  if (D[n] && byName(D[n])) return { name: D[n], sure: true, sugg: [] };
  if (D[tr] && byName(D[tr])) return { name: D[tr], sure: true, sugg: [] };
  const best = (x, t) => Math.max.apply(null, riIndex().find(o => o.x === x).f.map(f => riDice(t, f)));
  const qa = riToks(n), qb = riToks(tr);
  const sc = riIndex().map(o => ({ x: o.x, s: Math.max(Math.max.apply(null, o.f.map(f => Math.max(riDice(qa, f), riDice(qb, f)))), o.en ? riDice(qa, o.en) : 0) }))
    .filter(o => o.s > 0).sort((a, b) => b.s - a.s || (a.x.cat ? 1 : 0) - (b.x.cat ? 1 : 0) || a.x.name.length - b.x.name.length);
  const top = sc[0];
  /* Lo de siempre (libFind), salvo que otro del catálogo se parezca más */
  for (const s of [q, q.replace(/\(.*?\)/g, ' '), tr]) {
    const x = libFind(s), bx = x && !x.hidden ? best(x, riToks(s)) : 0;
    if (bx >= 0.75 && (!top || top.x === x || top.s <= bx)) return { name: x.name, sure: true, sugg: [] };
  }
  if (top && top.s >= 0.9 && (!sc[1] || top.s - sc[1].s >= 0.15)) return { name: top.x.name, sure: true, sugg: [] };
  return { name: null, sure: false, sugg: sc.filter(o => o.s >= 0.34).slice(0, 4).map(o => o.x.name), top: top ? top.s : 0 };
}

/* ---------- Del texto a la vista previa ---------- */
function riBuild(text) {
  const days = riParse(text).map(d => {
    const ex = d.ex.map(e => { const m = riMatch(e.raw); return Object.assign(e, { name: m.sure ? m.name : null, sure: m.sure, sugg: m.sugg, on: true, top: m.top || (m.sure ? 1 : 0) }); })
      .filter(e => !e.loose || e.sure || e.top >= 0.5);
    const t = d.title || '';
    let name = t.replace(/\s*[–—]\s*|\s+-\s+|:\s*/, ' · ').replace(/\s+/g, ' ').trim();
    if (name.length > 40) name = name.replace(/\s*\(.*?\)\s*/g, ' ').trim();
    if (name.length > 40) name = name.slice(0, 40).trim();
    return { name: name || 'Rutina importada', wd: riWdOf(t), on: true, ex };
  }).filter(d => d.ex.length);
  days.forEach((d, i) => { if (!/[a-záéíóúñ]/i.test(d.name)) d.name = 'Día ' + (i + 1); });
  const free = [1, 2, 3, 4, 5, 6, 0].filter(w => !days.some(d => d.wd === w));
  if (days.every(d => d.wd == null)) { const sp = RI_SPREAD[Math.min(7, days.length)] || []; days.forEach((d, i) => { d.wd = sp[i] != null ? sp[i] : free[i % free.length]; }); }
  else days.forEach(d => { if (d.wd == null) d.wd = free.length ? free.shift() : 1; });
  return days;
}
const riPend = F => F.days.filter(d => d.on).reduce((a, d) => a + d.ex.filter(e => e.on && !e.name).length, 0);
const riSrcOf = F => (F.src === 'other' ? { n: (F.on || '').trim() || 'Otra IA', c: F.oc || RI_COLORS[0] } : (s => ({ n: s[1], c: s[2] }))(RI_SRC.find(s => s[0] === F.src) || RI_SRC[2]));
function riUniq(base, taken, tag) {
  const has = s => taken.some(t => normName(t) === normName(s));
  if (!has(base)) return base;
  if (tag && !has(`${base} (${tag})`)) return `${base} (${tag})`;
  let i = 2; while (has(`${base} ${i}`)) i++;
  return `${base} ${i}`;
}

/* ---------- Pantallas ---------- */
const riDot = (c, cls) => `<i class="ri-dot ${cls || ''}" style="background:${c}"></i>`;
function riChoose() {
  openSheet(`<div class="row"><h2 class="grow">Nueva rutina</h2><button class="icon-btn" data-act="sheet-close" aria-label="Cerrar">${ic('x', 18)}</button></div>
    <div class="ri-choose">
      <button type="button" class="ri-opt" data-ri="scratch"><span class="ri-oi">${ic('plus', 22)}</span><span class="grow"><b>Crear desde cero</b><small>Le pones nombre y eliges los ejercicios de la Biblioteca.</small></span>${ic('chevron-right', 18)}</button>
      <button type="button" class="ri-opt" data-ri="import"><span class="ri-oi">${ic('clipboard-list', 22)}</span><span class="grow"><b>Importar rutinas</b><small>Pega lo que te dio ChatGPT, Claude, DeepSeek u otra IA. Se crea una rutina por cada día, sin tocar las que ya tienes.</small></span>${ic('chevron-right', 18)}</button>
    </div>`);
}
function riPaste() {
  const T = state.riT || { txt: '', err: '' }; state.riT = T;
  openSheet(`<div class="pk-top"><button class="linkbtn" data-ri="cancel">Cancelar</button><b>Importar rutinas</b><span></span></div>
    <div class="muted ri-help">Pega el texto de tu IA. Cada día (Día 1, Lunes, Push, Pierna…) se convierte en una rutina; se leen series, reps, RIR, peso y descanso si vienen.</div>
    <textarea id="ri-txt" class="ri-txt" rows="12" placeholder="Día 1 – Empuje&#10;Press banca 4x6-8 RIR 2&#10;Elevaciones laterales 3x12-15&#10;&#10;Día 2 – Tirón&#10;Dominadas 4x6-10&#10;…">${esc(T.txt)}</textarea>
    ${T.err ? `<div class="se-err" role="alert">${esc(T.err)}</div>` : ''}
    <label class="btn block ri-file">${ic('download', 16)} Subir un archivo (.txt o .md)<input id="ri-file" type="file" accept=".txt,.md,.csv,text/plain,text/markdown" hidden></label>
    <div class="pk-bottom"><button class="btn primary block" data-ri="read">Leer rutinas</button></div>`);
  const c = document.querySelector('#sheet .sheet-card'); if (c) c.classList.add('pk-sheet', 'ri-sheet');
}
function riRead() {
  const T = state.riT, i = document.getElementById('ri-txt'); if (i) T.txt = i.value;
  if (!T.txt.trim()) { T.err = 'Pega el texto de tu IA o sube un archivo.'; return riPaste(); }
  const days = riBuild(T.txt);
  if (!days.length) { T.err = 'No encontré ejercicios con series o repeticiones. Revisa que el texto traiga, por ejemplo, "Press banca 4x8".'; return riPaste(); }
  T.err = '';
  const g = activeGym().id;
  state.rI = { days, src: state.riLast || 'claude', on: '', oc: RI_COLORS[0], plan: 'new', gym: g, at: Date.now() };
  riView(true);
}
function riExRow(e, i, j) {
  const x = e.name ? LIB.find(y => y.name === e.name) : null, reps = e.rMin == null ? '' : e.rMin === e.rMax ? String(e.rMin) : `${e.rMin}-${e.rMax}`;
  const diff = e.name && riNorm(e.raw) !== riNorm(e.name);
  const hw = x ? exFromLib(x).weight : 0;   /* sin peso en el texto: se usa tu último peso */
  const f = (k, v, ph, w, im, pl) => `<label class="ri-f" style="width:${w}px"><span>${ph}</span><input class="ri-in" data-d="${i}" data-e="${j}" data-f="${k}" value="${esc(v)}" ${pl ? `placeholder="${esc(pl)}"` : ''} inputmode="${im || 'decimal'}" autocomplete="off"></label>`;
  return `<div class="ri-ex ${e.on ? '' : 'off'} ${e.on && !e.name ? 'doubt' : ''}" id="ri-${i}-${j}">
    <div class="row ri-exh"><span class="ri-th">${x ? luThumb(x, true) : `<span class="th-l">?</span>`}</span>
      <span class="grow" style="min-width:0">${e.name ? `<b>${esc(e.name)}</b>${diff ? `<small class="muted">Texto: ${esc(e.raw)}</small>` : ''}` : `<b class="ri-q">¿Cuál es «${esc(e.raw)}»?</b><small class="muted">No estoy seguro: elige el correcto.</small>`}</span>
      <button type="button" class="icon-btn sm" data-ri="xtog" data-d="${i}" data-e="${j}" aria-label="${e.on ? 'Quitar' : 'Volver a incluir'} ${esc(e.name || e.raw)}">${ic(e.on ? 'x' : 'plus', 15)}</button></div>
    ${e.on && !e.name ? `<div class="ri-sugg">${e.sugg.map(s => `<button type="button" class="gchip" data-ri="pick" data-d="${i}" data-e="${j}" data-name="${esc(s)}">${esc(s)}</button>`).join('')}
      <button type="button" class="gchip" data-ri="search" data-d="${i}" data-e="${j}">${ic('search', 14)} Buscar otro</button>
      <button type="button" class="gchip" data-ri="create" data-d="${i}" data-e="${j}">${ic('plus', 14)} Crear «${esc(e.raw)}»</button></div>` : ''}
    ${e.on ? `<div class="row ri-fs">${f('sets', e.sets == null ? '' : e.sets, 'Series', 58, 'numeric')}${f('reps', reps, 'Reps', 70)}${f('rir', e.rir.join(','), 'RIR', 64)}${f('w', e.w == null ? '' : String(e.w).replace('.', ','), unitL(), 64, null, hw ? fmtKg(hw) : '')}
      ${e.name ? `<button type="button" class="linkbtn ri-chg" data-ri="search" data-d="${i}" data-e="${j}">Cambiar</button>` : ''}</div>` : ''}</div>`;
}
const unitL = () => (state.settings.unit === 'lb' ? 'lb' : 'kg');
function riView(top) {
  const F = state.rI; if (!F) return;
  const g = activeGym(), plans = gymPlans(g.id), src = riSrcOf(F), pend = riPend(F), on = F.days.filter(d => d.on);
  const nEx = on.reduce((a, d) => a + d.ex.filter(e => e.on).length, 0);
  openSheet(`<div class="pk-top"><button class="linkbtn" data-ri="back">Atrás</button><b>Revisa y guarda</b><button class="linkbtn" data-ri="save">Guardar</button></div>
    <div class="label">¿De qué IA viene?</div>
    <div class="gymbar ri-srcs">${RI_SRC.map(([k, n, c]) => `<button type="button" class="gchip ${F.src === k ? 'on' : ''}" data-ri="src" data-v="${k}">${riDot(c, k)}${n}</button>`).join('')}<button type="button" class="gchip ${F.src === 'other' ? 'on' : ''}" data-ri="src" data-v="other">${riDot(F.oc)}Otra IA</button></div>
    ${F.src === 'other' ? `<div class="ri-other"><input id="ri-on" maxlength="20" placeholder="Nombre (Gemini, Grok…)" value="${esc(F.on)}" autocomplete="off"><div class="ri-cols">${RI_COLORS.map(c => `<button type="button" class="ri-col ${F.oc === c ? 'on' : ''}" data-ri="col" data-v="${c}" style="background:${c}" aria-label="Color ${c}"></button>`).join('')}</div></div>` : ''}
    <label class="field"><span class="label">Guardar en</span><select id="ri-plan">
      <option value="new" ${F.plan === 'new' ? 'selected' : ''}>Plan nuevo «${esc(riUniq('Rutinas de ' + src.n, plans.map(p => p.name)))}»</option>
      ${plans.filter(p => !p.custom).map(p => `<option value="${p.id}" ${F.plan === p.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}
      <option value="__mine" ${F.plan === '__mine' ? 'selected' : ''}>Mis rutinas (aparte)</option></select></label>
    <div class="muted ri-help">${ic('shield', 14)} Tus rutinas de ahora no se tocan: si un nombre ya existe, la nueva lleva «(${esc(src.n)})» o un número.</div>
    ${F.days.map((d, i) => `<div class="card ri-day ${d.on ? '' : 'off'}">
      <div class="row ri-dh">${riDot(src.c)}<input class="ri-dn" data-d="${i}" maxlength="40" value="${esc(d.name)}" aria-label="Nombre de la rutina">
        <select class="ri-wd" data-d="${i}" aria-label="Día">${[1, 2, 3, 4, 5, 6, 0].map(w => `<option value="${w}" ${d.wd === w ? 'selected' : ''}>${WD[w]}</option>`).join('')}</select>
        <button type="button" class="btn small" data-ri="dtog" data-d="${i}">${d.on ? 'Quitar' : 'Incluir'}</button></div>
      ${d.on ? d.ex.map((e, j) => riExRow(e, i, j)).join('') : `<div class="muted" style="font-size:12.5px">No se guardará.</div>`}</div>`).join('')}
    <div class="pk-bottom">${pend ? `<button class="btn block ri-pend" data-ri="save">Elige ${pend} ejercicio${pend === 1 ? '' : 's'} marcado${pend === 1 ? '' : 's'}</button>` : `<button class="btn primary block" data-ri="save">Guardar ${on.length} rutina${on.length === 1 ? '' : 's'} · ${nEx} ejercicios</button>`}</div>`);
  const c = document.querySelector('#sheet .sheet-card');
  if (c) { c.classList.add('pk-sheet', 'ri-sheet'); c.scrollTop = top ? 0 : F.scroll || 0; luLazy(c); }
}
function riKeep() { const c = document.querySelector('#sheet .ri-sheet'); if (c && state.rI) state.rI.scroll = c.scrollTop; }
function riSearch(i, j) {
  const F = state.rI, e = F.days[i].ex[j]; F.tgt = [i, j]; F.q = F.q != null && F.qFor === `${i}-${j}` ? F.q : e.raw; F.qFor = `${i}-${j}`;
  openSheet(`<div class="pk-top"><button class="linkbtn" data-ri="sback">Volver</button><b>Elegir ejercicio</b><span></span></div>
    <div class="pk-search">${ic('search', 17)}<input id="ri-q" placeholder="Buscar ejercicio" value="${esc(F.q)}" autocomplete="off"></div>
    <div id="ri-list" class="ri-list">${riList(F.q)}</div>
    <div class="pk-bottom"><button class="btn block" data-ri="create" data-d="${i}" data-e="${j}">${ic('plus', 15)} Crear «${esc(e.raw)}» como ejercicio mío</button></div>`);
  const c = document.querySelector('#sheet .sheet-card'); if (c) { c.classList.add('pk-sheet', 'ri-sheet'); luLazy(c); }
}
function riList(q) {
  const L = String(q || '').trim() ? luFilter({ q }).slice(0, 40) : [];
  const tr = riTrans(riNorm(q || ''));
  const extra = tr && tr !== riNorm(q || '') ? luFilter({ q: tr }).slice(0, 20).filter(x => L.indexOf(x) < 0) : [];
  const rows = L.concat(extra);
  return rows.map(x => `<button type="button" class="ri-row" data-ri="pick" data-name="${esc(x.name)}"><span class="ri-th">${luThumb(x, true)}</span><span class="grow"><b>${esc(x.name)}</b><small class="muted">${esc((x.musc || []).slice(0, 2).join(' · '))}</small></span></button>`).join('')
    || `<div class="muted" style="padding:12px 0">${String(q || '').trim() ? 'Sin resultados. Prueba con otra palabra o créalo.' : 'Escribe para buscar.'}</div>`;
}
function riSave() {
  const F = state.rI; if (!F) return;
  const pend = riPend(F);
  if (pend) { const d = F.days.findIndex(x => x.on && x.ex.some(e => e.on && !e.name)), j = d >= 0 ? F.days[d].ex.findIndex(e => e.on && !e.name) : -1; const el = document.getElementById(`ri-${d}-${j}`); if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' }); toast('Elige el ejercicio de los marcados en naranja (o quítalos).'); return; }
  const days = F.days.filter(d => d.on && d.ex.some(e => e.on));
  if (!days.length) { toast('No hay rutinas para guardar.'); return; }
  const g = activeGym().id, src = riSrcOf(F), taken = [];
  gymPlans(g).forEach(p => p.days.forEach(d => taken.push(d.name)));
  let p;
  if (F.plan === 'new') { p = { id: uid(), name: riUniq('Rutinas de ' + src.n, gymPlans(g).map(x => x.name)), gymId: g, days: [], src }; state.plans.push(p); }
  else if (F.plan === '__mine') { p = state.plans.find(x => x.gymId === g && x.custom); if (!p) { p = { id: uid(), name: 'Mis rutinas', gymId: g, custom: true, days: [] }; state.plans.push(p); } }
  else p = state.plans.find(x => x.id === F.plan) || state.plans.find(x => x.gymId === g);
  const made = days.map(d => {
    const name = riUniq(d.name.trim() || 'Rutina importada', taken, src.n); taken.push(name);
    const exercises = d.ex.filter(e => e.on && e.name).map(e => {
      const x = LIB.find(y => y.name === e.name);
      const ex = x ? exFromLib(x) : { id: uid(), name: e.name, type: typeOf(e.name), weight: 0, sets: 3, repsMin: 8, repsMax: 12, rest: 90 };
      if (e.sets) ex.sets = Math.max(1, Math.min(10, Math.round(e.sets)));
      if (e.rMin != null) { ex.repsMin = e.rMin; ex.repsMax = e.rMax != null ? e.rMax : e.rMin; }
      if (e.rest) ex.rest = e.rest;
      if (e.w != null) ex.weight = e.w;
      if (e.rir.length) ex.rirT = Array.from({ length: ex.sets }, (_, k) => Math.max(0, Math.min(5, e.rir[Math.min(k, e.rir.length - 1)])));
      return ex;
    });
    const mx = exercises.map(e => +e.repsMax || 12), avg = mx.reduce((a, b) => a + b, 0) / (mx.length || 1);
    return { id: uid(), name, weekday: d.wd, kind: avg <= 10 ? 'fuerza' : 'bombeo', exercises, src: { n: src.n, c: src.c }, imp: Date.now() };
  });
  made.forEach(d => p.days.push(d));
  p.days.sort((x, y) => ((x.weekday + 6) % 7) - ((y.weekday + 6) % 7));
  state.riLast = F.src;
  savePlans(); state.rI = null; state.riT = null; closeSheet();
  state.tab = 'plans'; if (made[0]) state.rtOpen[made[0].id] = true; render();
  toast(`${made.length} rutina${made.length === 1 ? '' : 's'} importada${made.length === 1 ? '' : 's'} en «${p.name}».`);
}
/* Cambiar la etiqueta de una rutina */
function riSrcSheet(did) {
  const { d } = riFindDay(did); if (!d) return;
  const S = state.riS = state.riS && state.riS.did === did ? state.riS : (s => ({ did, src: s ? (RI_SRC.find(x => x[1] === s.n) || ['other'])[0] : 'claude', on: s && !RI_SRC.some(x => x[1] === s.n) ? s.n : '', oc: s && !RI_SRC.some(x => x[1] === s.n) ? s.c : RI_COLORS[0] }))(d.src);
  openSheet(`<div class="row"><h2 class="grow">Origen de «${esc(d.name)}»</h2><button class="icon-btn" data-act="sheet-close" aria-label="Cerrar">${ic('x', 18)}</button></div>
    <div class="gymbar ri-srcs">${RI_SRC.map(([k, n, c]) => `<button type="button" class="gchip ${S.src === k ? 'on' : ''}" data-ri="ssrc" data-v="${k}">${riDot(c, k)}${n}</button>`).join('')}<button type="button" class="gchip ${S.src === 'other' ? 'on' : ''}" data-ri="ssrc" data-v="other">${riDot(S.oc)}Otra IA</button></div>
    ${S.src === 'other' ? `<div class="ri-other"><input id="ri-son" maxlength="20" placeholder="Nombre (Gemini, Grok…)" value="${esc(S.on)}" autocomplete="off"><div class="ri-cols">${RI_COLORS.map(c => `<button type="button" class="ri-col ${S.oc === c ? 'on' : ''}" data-ri="scol" data-v="${c}" style="background:${c}" aria-label="Color ${c}"></button>`).join('')}</div></div>` : ''}
    <div class="grid2"><button type="button" class="btn" data-ri="snone">Quitar etiqueta</button><button type="button" class="btn primary" data-ri="ssave">Guardar</button></div>`);
}
function riFindDay(did) { for (const p of state.plans) { const d = p.days.find(x => x.id === did); if (d) return { p, d }; } return {}; }

/* ---------- Eventos ---------- */
window.addEventListener('click', ev => {
  if (isWatch()) return;
  const nb = ev.target.closest && ev.target.closest('[data-act="rt-new"]');
  if (nb) { ev.preventDefault(); ev.stopPropagation(); riChoose(); return; }
  /* Volver de "Crear ejercicio" sin crearlo */
  const my = ev.target.closest && ev.target.closest('[data-my="cancel"]');
  if (my && state.rI && state.rI.my) { state.rI.my = false; setTimeout(() => riView(), 0); return; }
  const b = ev.target.closest && ev.target.closest('[data-ri]'); if (!b) return;
  ev.preventDefault(); ev.stopPropagation();
  const a = b.dataset.ri, F = state.rI, i = +b.dataset.d, j = +b.dataset.e;
  if (a === 'scratch') { closeSheet(); return rtNewSheet(); }
  if (a === 'import') { state.riT = { txt: '', err: '' }; return riPaste(); }
  if (a === 'cancel') { state.riT = null; state.rI = null; return closeSheet(); }
  if (a === 'read') return riRead();
  if (a === 'chip') return riSrcSheet(b.dataset.day);
  if (a === 'ssrc' || a === 'scol' || a === 'snone' || a === 'ssave') {
    const S = state.riS; if (!S) return; const n = document.getElementById('ri-son'); if (n) S.on = n.value;
    if (a === 'ssrc') { S.src = b.dataset.v; return riSrcSheet(S.did); }
    if (a === 'scol') { S.oc = b.dataset.v; return riSrcSheet(S.did); }
    const { d } = riFindDay(S.did); if (!d) return;
    if (a === 'snone') delete d.src; else d.src = (s => ({ n: s.n, c: s.c }))(riSrcOf(S));
    state.riS = null; savePlans(); closeSheet(); render(); toast(a === 'snone' ? 'Etiqueta quitada.' : `Etiqueta: ${d.src.n}.`); return;
  }
  if (!F) return;
  const n = document.getElementById('ri-on'); if (n) F.on = n.value;
  riKeep();
  if (a === 'back') { state.rI = null; return riPaste(); }
  if (a === 'save') return riSave();
  if (a === 'src') { F.src = b.dataset.v; return riView(); }
  if (a === 'col') { F.oc = b.dataset.v; return riView(); }
  if (a === 'dtog') { F.days[i].on = !F.days[i].on; return riView(); }
  if (a === 'xtog') { const e = F.days[i].ex[j]; e.on = !e.on; return riView(); }
  if (a === 'search') { F.q = null; return riSearch(i, j); }
  if (a === 'sback') { F.tgt = null; return riView(); }
  if (a === 'pick') {
    const t = b.dataset.d != null ? [i, j] : F.tgt; if (!t) return;
    const e = F.days[t[0]].ex[t[1]]; e.name = b.dataset.name; e.sure = true; e.on = true; F.tgt = null; return riView();
  }
  if (a === 'create') {
    const t = b.dataset.d != null ? [i, j] : F.tgt; F.tgt = t; F.my = true;
    return mySheet({ ret: 'ri', name: F.days[t[0]].ex[t[1]].raw });
  }
}, true);
/* Ejercicio creado (o "Usar este") desde la importación */
const _myReturnRi = myReturn;
myReturn = function (ret, name) {
  if (ret !== 'ri' || !state.rI) return _myReturnRi(ret, name);
  const F = state.rI, t = F.tgt; F.my = false;
  if (t) { const e = F.days[t[0]].ex[t[1]]; e.name = name; e.sure = true; e.on = true; }
  F.tgt = null; riView();
};
let riQT = 0;
window.addEventListener('input', ev => {
  const t = ev.target, F = state.rI;
  if (t.id === 'ri-q' && F) { F.q = t.value; clearTimeout(riQT); riQT = setTimeout(() => { const l = document.getElementById('ri-list'); if (l) { l.innerHTML = riList(F.q); luLazy(l); } }, 110); return; }
  if (t.id === 'ri-txt' && state.riT) { state.riT.txt = t.value; return; }
  if (t.id === 'ri-son' && state.riS) { state.riS.on = t.value; return; }
  if (!F) return;
  if (t.id === 'ri-on') { F.on = t.value; return; }
  if (t.classList.contains('ri-dn')) { F.days[+t.dataset.d].name = t.value; return; }
  if (t.classList.contains('ri-in')) {
    const e = F.days[+t.dataset.d].ex[+t.dataset.e], v = t.value.trim();
    if (t.dataset.f === 'sets') e.sets = v ? Math.max(1, Math.min(10, parseInt(v, 10) || 0)) || null : null;
    else if (t.dataset.f === 'reps') { const m = v.match(/(\d+)(?:\s*[-–a]\s*(\d+))?/); e.rMin = m ? +m[1] : null; e.rMax = m ? +(m[2] || m[1]) : null; if (m && e.rMax < e.rMin) e.rMax = e.rMin; }
    else if (t.dataset.f === 'rir') e.rir = (v.match(/\d/g) || []).map(Number).slice(0, 10);
    else if (t.dataset.f === 'w') e.w = v ? riNum(v) : null;
  }
}, true);
window.addEventListener('change', ev => {
  const t = ev.target;
  if (t.id === 'ri-plan' && state.rI) { state.rI.plan = t.value; return; }
  if (t.classList && t.classList.contains('ri-wd') && state.rI) { state.rI.days[+t.dataset.d].wd = +t.value; return; }
  if (t.id === 'ri-file' && t.files && t.files[0]) {
    const f = t.files[0];
    if (f.size > 300000) { state.riT.err = 'El archivo es muy grande (máx. 300 KB).'; return riPaste(); }
    const r = new FileReader();
    r.onload = () => { state.riT.txt = String(r.result || ''); state.riT.err = ''; riPaste(); };
    r.onerror = () => { state.riT.err = 'No se pudo leer el archivo.'; riPaste(); };
    r.readAsText(f);
  }
}, true);

/* ---------- Etiqueta en Rutinas (solo teléfono) ---------- */
function riChips() {
  if (isWatch() || state.tab !== 'plans') return;
  document.querySelectorAll('#app .rt-head[data-day]').forEach(h => {
    if (h.querySelector('.ri-chip')) return;
    const { d } = riFindDay(h.dataset.day); if (!d || !d.src) return;
    const b = h.querySelector('b'); if (!b) return;
    b.insertAdjacentHTML('afterend', `<span class="ri-chip" data-ri="chip" data-day="${d.id}" role="button" tabindex="0" aria-label="Origen: ${esc(d.src.n)}. Toca para cambiarlo">${riDot(d.src.c, d.src.c === '#000000' ? 'chatgpt' : '')}${esc(d.src.n)}</span>`);
  });
}
const _renderRi = render;
render = function () { _renderRi.apply(this, arguments); try { riChips(); } catch (e) {} };

/* ---------- Al entrenar: el RIR importado por serie ---------- */
const _startSessionRi = startSession;
startSession = function (planId, dayId) {
  _startSessionRi.apply(this, arguments);
  const D = state.draft; if (!D || D.dayId !== dayId) return;
  const { d } = riFindDay(dayId); if (!d) return;
  let ch = false;
  D.exercises.forEach(e => {
    if (e.rirT) return;
    const pe = d.exercises.find(x => x.id === e.exId && x.rirT); if (!pe) return;
    e.rirT = Array.from({ length: e.log.length }, (_, k) => pe.rirT[Math.min(k, pe.rirT.length - 1)]); ch = true;
  });
  if (ch) { saveDraft(); render(); }
};
bootRender();
