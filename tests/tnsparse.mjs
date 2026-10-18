// Pruebas del lector de "Importar recomendación" (next.js: nsParse + nsMatch), sin navegador.
// Uso: node tests/tnsparse.mjs [carpeta www]   (por defecto www; sirve también con la copia transpilada)
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WWW = process.argv[2] || path.join(HERE, '..', 'www');
const src = fs.readFileSync(path.join(WWW, 'next.js'), 'utf8');
const a = src.indexOf('const NS_DAYS'), b = src.indexOf('function nsDays');
if (a < 0 || b < 0) throw new Error('No encontré el lector en next.js');

const ctx = {
  normName: s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''),
  WDL: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
  state: { settings: { unit: 'kg' } },
};
vm.createContext(ctx);
vm.runInContext(src.slice(a, b).replace(/^(const|let) /gm, 'var ').replace(/^function (\w+)/gm, 'var $1 = function'), ctx);

let fail = 0;
const ok = (c, msg) => { if (c) console.log('  ok  ', msg); else { fail++; console.log('  FALLA', msg); } };
const LUNES = ['Prensa 45°', 'Sentadilla Hack', 'Hip Thrust', 'Curl Femoral Tumbado', 'Press Banca Inclinado (Barra)', 'Remo Sentado con Cable', 'Extensión de Pierna']
  .map((name, i) => ({ id: 'e' + i, name }));
const run = txt => { const P = ctx.nsParse(txt); return { P, M: ctx.nsMatch(P.rows, LUNES) }; };
const show = (P, M) => P.rows.map((r, i) => `${r.raw} → ${(LUNES.find(e => e.id === M[i].exId) || {}).name || '¿?'} · ${r.w} kg · ${r.rMin === r.rMax ? r.rMax : r.rMin + '-' + r.rMax} · RIR ${r.rir ? r.rir.join(',') : r.rirAll}`);

const REAL = fs.readFileSync(path.join(HERE, 'importar-ejemplo-sintetico.txt'), 'utf8');
const WANT = [['Prensa 45°', 'Prensa 45°', 82.5, 10, 10], ['Sentadilla Hack', 'Sentadilla Hack', 27.5, 8, 10], ['Hip Thrust', 'Hip Thrust', 42.5, 9, 11],
  ['Curl Femoral', 'Curl Femoral Tumbado', 17.5, 11, 13], ['Remo Cable', 'Remo Sentado con Cable', 32.5, 8, 10], ['Extensión', 'Extensión de Pierna', 22.5, 12, 14]];
const checkReal = (label, txt) => {
  console.log(label);
  ok(REAL.indexOf('\t') >= 0, 'el archivo de prueba conserva sus tabulaciones');
  const { P, M } = run(txt);
  console.log('     ' + show(P, M).join('\n     '));
  ok(P.day === 1, 'día: lunes');
  ok(P.rows.length === 6, `6 ejercicios (salieron ${P.rows.length}): no toma las tablas de series, progreso, aciertos ni datos del reloj`);
  WANT.forEach(([raw, name, w, a, b], i) => {
    const r = P.rows[i] || {}, e = LUNES.find(x => x.id === (M[i] || {}).exId) || {};
    ok(r.raw === raw && e.name === name && M[i].sure && r.w === w && r.rMin === a && r.rMax === b && String(r.rir) === '2,1,0', `${raw} → ${name} · ${w} kg · ${a === b ? a : a + '-' + b} · RIR 2,1,0`);
  });
};
checkReal('A. Texto sintético (tabulaciones)', REAL);
checkReal('B. Texto sintético con espacios simples en vez de tabulaciones', REAL.replace(/\t/g, ' '));
checkReal('C. Texto sintético con una celda por línea', REAL.replace(/\t/g, '\n'));
checkReal('D. Texto sintético con 2 espacios y saltos \\r\\n', REAL.replace(/\t/g, '  ').replace(/\n/g, '\r\n'));

console.log('E. Tabla con "|" (markdown), título del viernes, lb, rangos de RIR y "Series"');
{
  const T = `Mi análisis...\n\n| Serie | Peso | Reps | RIR |\n|---|---|---|---|\n| 1 | 180 kg | 15 | @2 |\n\n**Recomendación para el próximo viernes**\n\n` +
    `| Ejercicio | Series | Peso | Reps | RIR |\n|---|---|---|---|---|\n| **Prensa 45°** | 3 | 195 kg | 15 | 2,1,0 |\n| Hack | 4 | 60 | 12 | 1-2 |\n| Ext. pierna | 3 | 100 lb | 14-16 | 2 |\n| Remo | 2 | 35,5 | 10 a 12 | - |\n`;
  const { P, M } = run(T);
  console.log('     ' + show(P, M).join('\n     '));
  ok(P.day === 5, 'día: viernes (el del título de la tabla)');
  ok(P.rows.length === 4, '4 ejercicios');
  ok(String(P.rows[0].rir) === '2,1,0' && P.rows[0].w === 195, 'Prensa 195 · 2,1,0 (negritas quitadas)');
  ok(P.rows[1].rirAll === 2 && P.rows[1].n === 4, 'Hack: RIR "1-2" → 2 (el más prudente) en sus 4 series');
  ok(P.rows[2].w === 45.5 && P.rows[2].rirAll === 2, 'Ext. pierna: 100 lb → 45,5 kg, RIR 2 en todas');
  ok(P.rows[3].w === 35.5 && P.rows[3].rMin === 10 && P.rows[3].rMax === 12 && P.rows[3].rir === null && P.rows[3].rirAll === null, 'Remo: 35,5 kg, 10 a 12, sin RIR');
  ok(M.every(m => m.sure), 'los 4 se emparejan solos (Hack, Ext. pierna, Remo)');
}
console.log('F. Líneas sueltas del formato de la exportación (sin encabezado)');
{
  const { P, M } = run('Recomendaciones para el próximo lunes\nPrensa 45° | 190 | 15 | 2,1,0\nSentadilla Hack | 60 | 11-12 | 2,1,0\nNota | algo | 3 | texto\n- Extensión de Pierna: 45×14 @1, 45×14 @0');
  ok(P.rows.length === 2 && P.day === 1 && M[0].sure && M[1].sure, '2 líneas, lunes; la línea "Nota" y la exportación se ignoran');
}
console.log('G. Texto sin datos');
{
  const P = ctx.nsParse('¡Buen trabajo! Sigue así.\nDescansa bien y come proteína.');
  ok(P.rows.length === 0 && !P.bad, 'nada que leer');
  const Q = ctx.nsParse('Serie\tPeso\tReps\tRIR\n1\t180 kg\t15\t@2\n2\t190 kg\t12\t@?');
  ok(Q.rows.length === 0 && Q.bad, 'solo tabla de análisis: nada que leer y avisa que era análisis');
}
console.log('H. Usuario en libras');
{
  ctx.state.settings.unit = 'lb';
  const P = ctx.nsParse('Ejercicio\tPeso\tReps\tRIR\nPrensa 45°\t100 kg\t15\t2,1,0\nHip Thrust\t135\t12\t1');
  ok(P.rows[0].w === 220 && P.rows[1].w === 135, '100 kg → 220 lb; 135 sin unidad queda en lb');
  ctx.state.settings.unit = 'kg';
}
console.log(fail ? `\n${fail} FALLAS` : '\nTodo OK');
process.exit(fail ? 1 : 0);
