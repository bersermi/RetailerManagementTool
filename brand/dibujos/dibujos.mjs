// ============================================================================
// THE APPS' DRAWINGS, CHECKED — Step 11, row 11.4 (2026-11-26).
//
// Reads, beside it: dibujos.json (each drawing, its size, its ink, where it sits),
// the drawings (*.svg) and their pictures (png/, drawn by brand/render-dibujos.sh);
// brand/mostrador/paleta.json; and, in the three apps, the screens and the
// strings.ts each entry names. Asserts, by group:
//   1. the drawings, their pictures and dibujos.json agree — a file per drawing
//      and a drawing per file, each kind known, and three pictures each (1×, 2×,
//      3×) at its size in points and nothing else in png/;
//   2. every drawing keeps the icons' line on its own square (brand/iconos/
//      README.md): the 64-unit square, one stroke of 3 with round ends and joins,
//      ink only, no transform, no style;
//   3. ⚠️ EVERY PICTURE IS ITS SOURCE: Chrome draws each SVG again at 1× and its
//      alpha matches png/<name>.png, and the 2× and 3× pictures, shrunk to 1×,
//      overlap it — a drawing changed and not drawn again, or a picture edited
//      by hand; and every drawing's ink keeps a unit's margin inside its square;
//   4. ⚠️ THE INVENTORY IS STILL THE CODE: every screen named exists and still
//      contains the text it is found by, every sentence named is a key of that
//      app's strings.ts, every ink a token of that app's palette; every trade the
//      two siblings draw (`DIBUJOS` in each `src/api/pagina.ts`) has a drawing, and
//      each trade's `giro` wears it in both apps' `POR_GIRO`; every place that
//      draws a trade today (`<Dibujo`) is listed, and the map's pins are where
//      they were;
//   5. every ink clears 3:1 against what it is drawn on (WCAG 1.4.11, a
//      graphic): each empty screen's ink on the counter, white on the six kitchen
//      colours, and each kitchen colour on the counter (the reward).
//
// It exits 1 on any failure. No workflow runs it (brand/ is read by none). Run:
//   node brand/dibujos/dibujos.mjs
// Needs the repository's node_modules (typescript) and Google Chrome.
// ============================================================================

import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readPng } from '../mostrador/png.mjs';

const aqui = process.env.DIBUJOS_DIR ?? dirname(fileURLToPath(import.meta.url));
const raiz = process.env.DIBUJOS_RAIZ ?? join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const require = createRequire(join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'package.json'));
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const TIPOS = ['vacio', 'oficio', 'premio'];
const PALETA_APP = { app: 'wera', cocina: 'cocina', itacate: 'itacate' };
const MISMO = 0.995; // share of 1× pixels whose alpha is within 8 of the drawing redrawn
const DENSIDAD = 0.9; // intersection over union of a 2× or 3× picture's ink, shrunk, with the 1× ink

let fallos = 0;
let grupo = 0;
function abrir(titulo) { grupo += 1; console.log(`\n${grupo}. ${titulo}`); }
function afirmar(cond, texto) {
  if (cond) console.log(`  ok    ${texto}`);
  else { console.log(`  FAIL  ${texto}`); fallos += 1; }
  return cond;
}
const lista = (xs) => (xs.length ? ` — ${xs.join('; ')}` : '');

const datos = JSON.parse(readFileSync(join(aqui, 'dibujos.json'), 'utf8'));
const linea = datos.linea;
const dibujos = Object.entries(datos.dibujos);
const pngDir = join(aqui, 'png');

// ---------------------------------------------------------------------------
abrir('the drawings, their pictures and dibujos.json agree');
{
  const archivos = readdirSync(aqui).filter((f) => f.endsWith('.svg')).map((f) => f.slice(0, -4)).sort();
  const nombrados = dibujos.map(([n]) => n).sort();
  afirmar(JSON.stringify(archivos) === JSON.stringify(nombrados),
    `a file for each of the ${nombrados.length} drawings, and a drawing for each file` +
    lista([...archivos.filter((a) => !nombrados.includes(a)).map((a) => `${a}.svg not in dibujos.json`),
      ...nombrados.filter((a) => !archivos.includes(a)).map((a) => `${a} has no .svg`)]));
  const malos = dibujos.filter(([, d]) => !TIPOS.includes(d.tipo) || !(Number.isInteger(d.puntos) && d.puntos > 0)).map(([n]) => n);
  afirmar(malos.length === 0, `each a known kind (${TIPOS.join(', ')}) with a size in whole points${lista(malos)}`);
  const cuenta = Object.fromEntries(TIPOS.map((t) => [t, dibujos.filter(([, d]) => d.tipo === t).length]));
  console.log(`        ${cuenta.vacio} empty screens, ${cuenta.oficio} trades, ${cuenta.premio} reward`);
  const esperados = new Map();
  for (const [n, d] of dibujos) for (const s of [1, 2, 3]) esperados.set(`${n}${s > 1 ? `@${s}x` : ''}.png`, d.puntos * s);
  const hay = existsSync(pngDir) ? readdirSync(pngDir).filter((f) => f.endsWith('.png')) : [];
  const problemas = [];
  for (const f of hay) if (!esperados.has(f)) problemas.push(`${f} is no drawing's`);
  for (const [f, lado] of esperados) {
    if (!hay.includes(f)) { problemas.push(`${f} missing`); continue; }
    const { width, height } = readPng(join(pngDir, f));
    if (width !== lado || height !== lado) problemas.push(`${f} is ${width}×${height}, not ${lado}×${lado}`);
  }
  afirmar(problemas.length === 0, `three pictures each, 1×, 2× and 3× at its size, and nothing else in png/ (${esperados.size})${lista(problemas)}`);
}

// ---------------------------------------------------------------------------
abrir(`every drawing keeps the icons' line — a ${linea.cuadricula}-unit square, one stroke of ${linea.trazo}, round ends`);
{
  const PERMITIDOS = new Set(['svg', 'path', 'circle', 'rect', 'ellipse', 'line', 'polyline', 'polygon']);
  const malos = [];
  for (const [nombre] of dibujos) {
    const f = join(aqui, `${nombre}.svg`);
    if (!existsSync(f)) continue;
    const svg = readFileSync(f, 'utf8');
    const raizSvg = svg.match(/<svg\b[^>]*>/)?.[0] ?? '';
    const pide = {
      viewBox: `0 0 ${linea.cuadricula} ${linea.cuadricula}`, fill: 'none', stroke: '#000',
      'stroke-width': String(linea.trazo), 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
    };
    for (const [k, v] of Object.entries(pide)) if (!raizSvg.includes(` ${k}="${v}"`)) malos.push(`${nombre}: the root has no ${k}="${v}"`);
    if (/ (width|height)=/.test(raizSvg)) malos.push(`${nombre}: a size on the root (the render script gives it)`);
    const sinRaiz = svg.replace(raizSvg, '');
    for (const m of svg.matchAll(/<([a-zA-Z]+)\b/g)) if (!PERMITIDOS.has(m[1])) malos.push(`${nombre}: <${m[1]}>`);
    if (/stroke-width=/.test(sinRaiz)) malos.push(`${nombre}: a second stroke width`);
    if (/stroke-line(cap|join)=/.test(sinRaiz)) malos.push(`${nombre}: a part with other ends or joins`);
    if (/\b(transform|style|class|opacity|fill-opacity|stroke-opacity|filter|mask|clip-path)=/.test(svg)) malos.push(`${nombre}: a transform, style or opacity`);
    for (const m of svg.matchAll(/\b(fill|stroke)="([^"]*)"/g)) {
      if (!['#000', 'none', '#fff'].includes(m[2])) malos.push(`${nombre}: ${m[1]}="${m[2]}" (ink is #000, a cut #fff, or none)`);
    }
    const corte = sinRaiz.search(/="#fff"/);
    if (corte >= 0 && !/fill="#000"/.test(sinRaiz.slice(0, corte))) malos.push(`${nombre}: a cut (#fff) with no solid part drawn before it`);
  }
  afirmar(malos.length === 0, `all ${dibujos.length} drawings${lista(malos)}`);
}

// ---------------------------------------------------------------------------
abrir('every picture is its source, and its ink keeps a margin');
{
  const tmp = mkdtempSync(join(tmpdir(), 'dibujos-'));
  const distintos = [];
  const densidades = [];
  const margenes = [];
  try {
    for (const [nombre, d] of dibujos) {
      const f1 = join(pngDir, `${nombre}.png`);
      if (!existsSync(f1) || !existsSync(join(aqui, `${nombre}.svg`))) continue;
      const pt = d.puntos;
      writeFileSync(join(tmp, `${nombre}.html`),
        `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:transparent}svg{display:block;width:${pt}px;height:${pt}px}</style>\n` +
        readFileSync(join(aqui, `${nombre}.svg`), 'utf8'));
      const shot = join(tmp, `${nombre}.png`);
      execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
        '--default-background-color=00000000', '--window-size=600,600', `--screenshot=${shot}`, `file://${join(tmp, `${nombre}.html`)}`],
      { stdio: 'ignore' });
      const nuevo = readPng(shot);
      const viejo = readPng(f1);
      let iguales = 0;
      for (let y = 0; y < pt; y += 1) {
        for (let x = 0; x < pt; x += 1) {
          const a = nuevo.rgba[(y * nuevo.width + x) * 4 + 3];
          const b = viejo.rgba[(y * pt + x) * 4 + 3];
          if (Math.abs(a - b) <= 8) iguales += 1;
        }
      }
      const parte = iguales / (pt * pt);
      if (parte < MISMO) distintos.push(`${nombre} ${parte.toFixed(3)}`);
      // the 2× and 3× pictures, shrunk by averaging, against the 1× ink
      const tinta1 = Array.from({ length: pt * pt }, (_, i) => viejo.rgba[i * 4 + 3] >= 128);
      for (const s of [2, 3]) {
        const fs = join(pngDir, `${nombre}@${s}x.png`);
        if (!existsSync(fs)) continue;
        const g = readPng(fs);
        let inter = 0; let union = 0;
        for (let y = 0; y < pt; y += 1) {
          for (let x = 0; x < pt; x += 1) {
            let suma = 0;
            for (let j = 0; j < s; j += 1) for (let i = 0; i < s; i += 1) suma += g.rgba[((y * s + j) * g.width + (x * s + i)) * 4 + 3];
            const t = suma / (s * s) >= 128;
            const u = tinta1[y * pt + x];
            if (t && u) inter += 1;
            if (t || u) union += 1;
          }
        }
        const iou = union === 0 ? 0 : inter / union;
        if (iou < DENSIDAD) densidades.push(`${nombre}@${s}x ${iou.toFixed(3)}`);
      }
      // a unit's margin: no ink in the outer unit of the square
      const unidad = pt / linea.cuadricula;
      let x0 = pt; let y0 = pt; let x1 = -1; let y1 = -1;
      for (let y = 0; y < pt; y += 1) {
        for (let x = 0; x < pt; x += 1) {
          if (viejo.rgba[(y * pt + x) * 4 + 3] > 0) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
        }
      }
      const margen = Math.min(x0, y0, pt - 1 - x1, pt - 1 - y1) / unidad;
      if (x1 < 0 || margen < 1) margenes.push(`${nombre} ${x1 < 0 ? 'has no ink' : `${margen.toFixed(2)} units`}`);
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
  afirmar(distintos.length === 0, `each 1× picture is its drawing, drawn again (${MISMO * 100}% of pixels or more)${lista(distintos)}`);
  afirmar(densidades.length === 0, `each 2× and 3× picture, shrunk, overlaps the 1× ink by ${DENSIDAD} or more${lista(densidades)}`);
  afirmar(margenes.length === 0, `every drawing's ink at least one unit inside its square${lista(margenes)}`);
}

// ---------------------------------------------------------------------------
abrir('the inventory is still the code');
{
  const ts = require('typescript');
  const textosDe = new Map();
  async function strings(app) {
    if (!textosDe.has(app)) {
      const fuente = readFileSync(join(raiz, app, 'src', 'strings.ts'), 'utf8');
      const js = ts.transpileModule(fuente, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
      const tmp = mkdtempSync(join(tmpdir(), 'strings-'));
      const f = join(tmp, 'strings.mjs');
      writeFileSync(f, js);
      const mod = await import(pathToFileURL(f).href);
      rmSync(tmp, { recursive: true, force: true });
      textosDe.set(app, mod.ES);
    }
    return textosDe.get(app);
  }
  const resuelve = (ES, clave) => clave.split('.').reduce((o, k) => (o == null ? undefined : o[k]), ES);
  const appDe = (archivo) => archivo.split('/')[0];
  const paleta = JSON.parse(readFileSync(join(raiz, 'brand', 'mostrador', 'paleta.json'), 'utf8'));

  const pantallas = []; const textos = []; const tintas = [];
  let lugares = 0;
  for (const [nombre, d] of dibujos) {
    for (const l of d.donde ?? []) {
      lugares += 1;
      const ruta = join(raiz, l.archivo);
      if (!existsSync(ruta)) { pantallas.push(`${nombre}: ${l.archivo} does not exist`); continue; }
      if (!readFileSync(ruta, 'utf8').includes(l.busca)) pantallas.push(`${nombre}: ${l.archivo} no longer contains ${l.busca}`);
      const ES = await strings(l.app);
      for (const t of l.textos) {
        const v = resuelve(ES, t);
        if (!(typeof v === 'string' || typeof v === 'function')) textos.push(`${nombre}: ${l.app} ES.${t}`);
      }
      for (const t of l.tinta) {
        if (t.startsWith('superficie on')) continue; // measured below: white on the six kitchen colours
        if (typeof paleta.apps[PALETA_APP[l.app]]?.[t] !== 'string') tintas.push(`${nombre}: ${t} is no ${l.app} token`);
      }
    }
  }
  for (const s of datos.sinDibujo.lista) {
    if (!existsSync(join(raiz, s.archivo))) pantallas.push(`not drawn: ${s.archivo} does not exist`);
    const app = appDe(s.archivo);
    if (typeof resuelve(await strings(app), s.texto) !== 'string' && typeof resuelve(await strings(app), s.texto) !== 'function') textos.push(`not drawn: ${app} ES.${s.texto}`);
  }
  afirmar(pantallas.length === 0, `every one of the ${lugares} places named exists and still contains what finds it${lista(pantallas)}`);
  afirmar(textos.length === 0, `every sentence named is a key of that app's strings.ts${lista(textos)}`);
  afirmar(tintas.length === 0, `every ink named is a token of that app's palette${lista(tintas)}`);

  // the trades: both siblings' DIBUJOS and POR_GIRO
  const oficios = dibujos.filter(([, d]) => d.tipo === 'oficio');
  const problemas = [];
  for (const app of ['cocina', 'itacate']) {
    const pagina = readFileSync(join(raiz, app, 'src', 'api', 'pagina.ts'), 'utf8');
    const lista1 = [...(pagina.match(/export const DIBUJOS = \[([^\]]*)\]/)?.[1] ?? '').matchAll(/'([^']+)'/g)].map((m) => m[1]).sort();
    const nuestros = oficios.map(([n]) => n).sort();
    if (JSON.stringify(lista1) !== JSON.stringify(nuestros)) problemas.push(`${app}'s DIBUJOS is [${lista1}], the trades drawn [${nuestros}]`);
    const porGiro = Object.fromEntries([...pagina.matchAll(/'(giro-[a-z-]+)': \{ color: '[a-z]+', dibujo: '([a-z]+)' \}/g)].map((m) => [m[1], m[2]]));
    for (const [n, d] of oficios) if (porGiro[d.giro] !== n) problemas.push(`${app}: ${d.giro} wears ${porGiro[d.giro] ?? 'nothing'}, not ${n}`);
  }
  afirmar(problemas.length === 0, `each of the ${oficios.length} trades both siblings draw has its drawing, worn by the same trade in both${lista(problemas)}`);

  const hoy = [];
  for (const app of ['cocina', 'itacate']) {
    const out = execFileSync('grep', ['-rl', '<Dibujo ', join(raiz, app, 'src')], { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
    hoy.push(...out.map((f) => f.slice(join(raiz).length + 1)));
  }
  const listados = datos.sinFoto.lugares.map((l) => l.archivo);
  const faltan = hoy.filter((f) => !listados.includes(f));
  const sobran = listados.filter((f) => !hoy.includes(f));
  afirmar(faltan.length === 0 && sobran.length === 0,
    `every place that draws a trade today is listed (${hoy.length})${lista([...faltan.map((f) => `not listed: ${f}`), ...sobran.map((f) => `listed, no <Dibujo: ${f}`)])}`);
  const pines = datos.sinFoto.pines;
  afirmar(existsSync(join(raiz, pines.archivo)) && readFileSync(join(raiz, pines.archivo), 'utf8').includes(pines.busca),
    `the map's pins still draw today's solid drawing (${pines.archivo})`);
}

// ---------------------------------------------------------------------------
abrir('every ink clears 3:1 against what it is drawn on (a graphic, WCAG 1.4.11)');
{
  const paleta = JSON.parse(readFileSync(join(raiz, 'brand', 'mostrador', 'paleta.json'), 'utf8'));
  const lum = (hex) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const razon = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const medidas = [];
  for (const [nombre, d] of dibujos) {
    for (const l of d.donde ?? []) {
      const pal = paleta.apps[PALETA_APP[l.app]];
      for (const t of l.tinta) {
        if (t.startsWith('superficie on')) continue; // measured below: white on the six kitchen colours
        medidas.push([`${nombre} ${t} on fondo (${l.app})`, razon(pal[t], pal.fondo)]);
      }
    }
  }
  for (const [c, hex] of Object.entries(paleta.cocinas)) {
    medidas.push([`white on ${c}`, razon('#FFFFFF', hex)]);
    medidas.push([`${c} on fondo`, razon(hex, paleta.apps.itacate.fondo)]);
  }
  const bajos = medidas.filter(([, r]) => r < 3).map(([n, r]) => `${n} ${r.toFixed(2)}`);
  const minimo = medidas.reduce((m, x) => (x[1] < m[1] ? x : m), ['', Infinity]);
  afirmar(bajos.length === 0, `${medidas.length} pairs, the lowest ${minimo[0]} at ${minimo[1].toFixed(2)}:1${lista(bajos)}`);
}

console.log(fallos === 0 ? `\nall ${grupo} assertion groups passed` : `\n${fallos} assertion(s) failed`);
process.exit(fallos === 0 ? 0 : 1);
