// Convierte www/ a una versión compatible con WebView antiguos (relojes, Android viejos).
// - JS: esbuild baja ?. ?? ...spread, catch sin variable, etc. a la sintaxis de Chrome antiguo.
// - CSS: inset -> top/right/bottom/left; color-mix() -> color calculado de antemano.
// Uso: node ci/legacy.mjs [carpeta]   (por defecto www, se modifica en el sitio)
import { transformSync } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';

const DIR = process.argv[2] || 'www';
const TARGET = ['chrome51'];

const js = (code, name) => {
  try { return transformSync(code, { loader: 'js', target: TARGET, charset: 'utf8', legalComments: 'none' }).code; }
  catch (e) { console.error('esbuild falló en', name); throw e; }
};

/* ---------- CSS ---------- */
function tokens(css) {
  const t = {};
  for (const m of css.matchAll(/:root\s*\{([^}]*)\}/g))
    for (const d of m[1].matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);?/gi)) t[d[1]] = d[2].trim();
  return t;
}
function parseColor(s, T, depth = 0) {
  s = s.trim();
  const v = s.match(/^var\((--[a-z0-9-]+)\)$/i);
  if (v) return depth < 8 && T[v[1]] ? parseColor(T[v[1]], T, depth + 1) : null;
  if (s === 'transparent') return [0, 0, 0, 0];
  let h = s.match(/^#([0-9a-f]{3,8})$/i);
  if (h) {
    let x = h[1]; if (x.length <= 4) x = x.split('').map(c => c + c).join('');
    return [parseInt(x.slice(0, 2), 16), parseInt(x.slice(2, 4), 16), parseInt(x.slice(4, 6), 16), x.length === 8 ? parseInt(x.slice(6, 8), 16) / 255 : 1];
  }
  const r = s.match(/^rgba?\(([^)]+)\)$/i);
  if (r) { const p = r[1].split(/[\s,\/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; }
  return null;
}
// color-mix(in srgb, A p%, B) con alfa premultiplicado, como el navegador
function mix(a, p, b) {
  const q = 1 - p, al = a[3] * p + b[3] * q;
  if (al === 0) return 'transparent';
  const ch = i => Math.round((a[i] * a[3] * p + b[i] * b[3] * q) / al);
  return `rgba(${ch(0)},${ch(1)},${ch(2)},${+al.toFixed(3)})`;
}
function fixCss(css, T) {
  css = css.replace(/(^|[;{\s])inset:\s*([^;}!]+?)(\s*!important)?\s*(?=[;}])/g, (m, pre, val, imp = '') => {
    const p = val.trim().split(/\s+/); const [t, r = t, b = t, l = r] = p;
    return `${pre}top:${t}${imp};right:${r}${imp};bottom:${b}${imp};left:${l}${imp}`;
  });
  let n = 0, miss = 0;
  css = css.replace(/color-mix\(\s*in srgb\s*,\s*([^,()]+(?:\([^()]*\))?)\s+([\d.]+)%\s*,\s*([^,()]+(?:\([^()]*\))?)\s*\)/g, (m, A, pct, B) => {
    const a = parseColor(A, T), b = parseColor(B, T);
    if (!a || !b) { miss++; return m; }
    n++; return mix(a, pct / 100, b);
  });
  return { css, n, miss };
}

/* ---------- index.html ---------- */
const htmlPath = path.join(DIR, 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8');
const skinPath = path.join(DIR, 'skin.css');
const skin = fs.existsSync(skinPath) ? fs.readFileSync(skinPath, 'utf8') : '';
const T = { ...tokens(html), ...tokens(skin) };

let stats = { n: 0, miss: 0 };
html = html.replace(/<style>([\s\S]*?)<\/style>/g, (m, c) => { const r = fixCss(c, T); stats.n += r.n; stats.miss += r.miss; return `<style>${r.css}</style>`; });
if (skin) { const r = fixCss(skin, T); stats.n += r.n; stats.miss += r.miss; fs.writeFileSync(skinPath, r.css); }

let inl = 0;
html = html.replace(/<script>([\s\S]*?)<\/script>/g, (m, c) => { inl++; return `<script>${js(c, 'index.html#' + inl).replace(/<\/script/gi, '<\\/script')}</script>`; });
fs.writeFileSync(htmlPath, html);

let files = 0;
for (const f of fs.readdirSync(DIR)) if (f.endsWith('.js')) { const p = path.join(DIR, f); fs.writeFileSync(p, js(fs.readFileSync(p, 'utf8'), f)); files++; }

console.log(`legacy: ${inl} scripts en línea + ${files} archivos JS (${TARGET}); color-mix resueltos ${stats.n}, sin resolver ${stats.miss}`);
