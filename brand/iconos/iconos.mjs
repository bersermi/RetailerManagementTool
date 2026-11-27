// ============================================================================
// THE DRAWN ICONS AND THEIR FONT, CHECKED — Step 11, rows 11.3-i (2026-11-21)
// and 11.3-ii (2026-11-26: the whole font, the cuts, the two marks).
//
// Reads, beside it: mapa.json (each drawing, its code point, the names it
// replaces), the drawings (*.svg), WeraIconos.ttf and WeraIconos.json (built from
// them by brand/render-fuente-iconos.sh), inventario.json (written by
// inventario.mjs); and MaterialCommunityIcons' own font and glyph map from
// node_modules. Asserts, by group:
//   1. the drawings and their map agree — a file per drawing and a drawing per
//      file, one code point each in the Private Use Area, every name it replaces
//      a real MaterialCommunityIcons glyph replaced once, WeraIconos.json
//      exactly the map mapa.json implies, and every mark (`marcas`) a real glyph
//      no drawing replaces;
//   2. every drawing keeps the line (README.md): the 24-unit grid, one stroke of
//      2 with round ends and joins, ink only, no transform, no style — and a
//      cut (white) only over a solid part drawn before it;
//   3. ⚠️ THE FONT SITS WHERE MaterialCommunityIcons' DOES — the same em, ascent,
//      descent, line gap and Windows metrics, every glyph as wide as the em —
//      so a glyph lands in the same box of the same <Text> on both platforms;
//   4. the font has a glyph at every code point, and every glyph keeps a margin
//      inside the grid's square;
//   5. ⚠️ THE FONT DRAWS ITS SOURCES: Chrome draws each SVG and its glyph in the
//      same 96-pixel square, and their ink overlaps (intersection over union)
//      — a glyph missing, misplaced, or not rebuilt after a drawing changed;
//      and in a drawing with a cut, its holes (the ground the outside cannot
//      reach) overlap too: a filled disc that lost its check still overlaps
//      in ink (row 11.3-ii);
//   6. the inventory is current, every drawing replaces a glyph some app names,
//      the first half is whole — every glyph the three tab bars, Wera's Inicio
//      and Wera Cocina's Hoy name is drawn — and ⚠️ SO IS THE FONT: every glyph
//      the three apps draw is drawn here or is a company's own mark, none
//      waiting (row 11.10's gate).
//
// It exits 1 on any failure. No workflow runs it (brand/ is read by none). Run:
//   node brand/iconos/iconos.mjs
// Needs the repository's node_modules and Google Chrome.
// ============================================================================

import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync, copyFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readPng } from '../mostrador/png.mjs';

const aqui = process.env.ICONOS_DIR ?? dirname(fileURLToPath(import.meta.url));
const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const require = createRequire(join(raiz, 'package.json'));
const MCI_MAPA = require('@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/MaterialCommunityIcons.json');
const MCI_TTF = require.resolve('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const UMBRAL = 0.9; // intersection over union of a glyph's ink and its drawing's, at 96 px
const HUECO_MIN = 24; // pixels at 96 px (about 1.2 units square): a smaller hole is antialiasing's

let fallos = 0;
let grupo = 0;
function abrir(titulo) { grupo += 1; console.log(`\n${grupo}. ${titulo}`); }
function afirmar(cond, texto) {
  if (cond) console.log(`  ok    ${texto}`);
  else { console.log(`  FAIL  ${texto}`); fallos += 1; }
  return cond;
}

const mapa = JSON.parse(readFileSync(join(aqui, 'mapa.json'), 'utf8'));
const dibujos = Object.entries(mapa.dibujos);
const linea = mapa.linea;

// ---------------------------------------------------------------------------
abrir('the drawings and their map agree');
{
  const archivos = readdirSync(aqui).filter((f) => f.endsWith('.svg')).map((f) => f.slice(0, -4)).sort();
  const nombrados = dibujos.map(([n]) => n).sort();
  afirmar(JSON.stringify(archivos) === JSON.stringify(nombrados),
    `a file for each of the ${nombrados.length} drawings, and a drawing for each file` +
    (JSON.stringify(archivos) === JSON.stringify(nombrados) ? '' : ` — files without a drawing: ${archivos.filter((a) => !nombrados.includes(a)).join(', ') || 'none'}; drawings without a file: ${nombrados.filter((a) => !archivos.includes(a)).join(', ') || 'none'}`));
  const codigos = dibujos.map(([, d]) => parseInt(d.codigo, 16));
  afirmar(new Set(codigos).size === codigos.length, 'one code point per drawing');
  afirmar(codigos.every((c) => c >= 0xe000 && c <= 0xf8ff), 'every code point in the Private Use Area (U+E000–U+F8FF)');
  const reemplazos = dibujos.flatMap(([, d]) => d.reemplaza);
  const falsos = reemplazos.filter((n) => !Object.hasOwn(MCI_MAPA, n));
  afirmar(falsos.length === 0, `every name replaced is a MaterialCommunityIcons glyph${falsos.length ? ` — not one: ${falsos.join(', ')}` : ''}`);
  afirmar(new Set(reemplazos).size === reemplazos.length, 'each name replaced by one drawing only');
  const esperado = Object.fromEntries(dibujos.flatMap(([, d]) => d.reemplaza.map((n) => [n, parseInt(d.codigo, 16)])).sort(([a], [b]) => (a < b ? -1 : 1)));
  const escrito = JSON.parse(readFileSync(join(aqui, 'WeraIconos.json'), 'utf8'));
  afirmar(JSON.stringify(escrito) === JSON.stringify(esperado), `WeraIconos.json is the glyph map mapa.json implies (${Object.keys(esperado).length} names)`);
  const marcas = Object.keys(mapa.marcas ?? {}).filter((k) => k !== '_');
  const marcaFalsa = marcas.filter((n) => !Object.hasOwn(MCI_MAPA, n));
  const marcaDibujada = marcas.filter((n) => reemplazos.includes(n));
  afirmar(marcaFalsa.length === 0 && marcaDibujada.length === 0,
    `each of the ${marcas.length} marks kept as their owners draw them (${marcas.join(', ')}) is a MaterialCommunityIcons glyph no drawing replaces` +
    `${marcaFalsa.length ? ` — not a glyph: ${marcaFalsa.join(', ')}` : ''}${marcaDibujada.length ? ` — also drawn: ${marcaDibujada.join(', ')}` : ''}`);
}

// ---------------------------------------------------------------------------
abrir(`every drawing keeps the line — a ${linea.cuadricula}-unit grid, one stroke of ${linea.trazo}, round ends`);
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
    for (const [k, v] of Object.entries(pide)) {
      if (!raizSvg.includes(` ${k}="${v}"`)) malos.push(`${nombre}: the root has no ${k}="${v}"`);
    }
    const sinRaiz = svg.replace(raizSvg, '');
    for (const m of svg.matchAll(/<([a-zA-Z]+)\b/g)) if (!PERMITIDOS.has(m[1])) malos.push(`${nombre}: <${m[1]}>`);
    if (/stroke-width=/.test(sinRaiz)) malos.push(`${nombre}: a second stroke width`);
    if (/stroke-line(cap|join)=/.test(sinRaiz)) malos.push(`${nombre}: a part with other ends or joins`);
    if (/\b(transform|style|class|opacity|fill-opacity|stroke-opacity|filter|mask|clip-path)=/.test(svg)) malos.push(`${nombre}: a transform, style or opacity`);
    for (const m of svg.matchAll(/\b(fill|stroke)="([^"]*)"/g)) {
      if (!['#000', 'none', '#fff'].includes(m[2])) malos.push(`${nombre}: ${m[1]}="${m[2]}" (ink is #000, a cut #fff, or none)`);
    }
    // A cut is a hole in a solid part, so a solid part comes first.
    const corte = sinRaiz.search(/="#fff"/);
    if (corte >= 0 && !/fill="#000"/.test(sinRaiz.slice(0, corte))) malos.push(`${nombre}: a cut (#fff) with no solid part drawn before it`);
  }
  afirmar(malos.length === 0, `all ${dibujos.length} drawings${malos.length ? ` — ${malos.join('; ')}` : ''}`);
}

// ---------------------------------------------------------------------------
/** The parts of a TrueType file the checks read. */
function leerTtf(ruta) {
  const b = readFileSync(ruta);
  const tablas = {};
  const n = b.readUInt16BE(4);
  for (let i = 0; i < n; i += 1) {
    const at = 12 + i * 16;
    tablas[b.toString('latin1', at, at + 4)] = { off: b.readUInt32BE(at + 8), len: b.readUInt32BE(at + 12) };
  }
  const t = (tag) => tablas[tag].off;
  const head = t('head'); const hhea = t('hhea'); const os2 = t('OS/2'); const maxp = t('maxp');
  const metricas = {
    unitsPerEm: b.readUInt16BE(head + 18),
    ascent: b.readInt16BE(hhea + 4), descent: b.readInt16BE(hhea + 6), lineGap: b.readInt16BE(hhea + 8),
    typoAscender: b.readInt16BE(os2 + 68), typoDescender: b.readInt16BE(os2 + 70), typoLineGap: b.readInt16BE(os2 + 72),
    winAscent: b.readUInt16BE(os2 + 74), winDescent: b.readUInt16BE(os2 + 76),
  };
  const numGlyphs = b.readUInt16BE(maxp + 4);
  const numH = b.readUInt16BE(hhea + 34);
  const avance = (g) => b.readUInt16BE(t('hmtx') + 4 * Math.min(g, numH - 1));
  const largo = b.readInt16BE(head + 50) === 1;
  const loca = (g) => (largo ? b.readUInt32BE(t('loca') + 4 * g) : 2 * b.readUInt16BE(t('loca') + 2 * g));
  const caja = (g) => {
    const a = loca(g); const z = loca(g + 1);
    if (z === a) return null; // an empty glyph
    const o = t('glyf') + a;
    return { xMin: b.readInt16BE(o + 2), yMin: b.readInt16BE(o + 4), xMax: b.readInt16BE(o + 6), yMax: b.readInt16BE(o + 8) };
  };
  // cmap: the Windows Unicode BMP subtable, format 4
  const cmap = t('cmap');
  let sub = -1;
  for (let i = 0; i < b.readUInt16BE(cmap + 2); i += 1) {
    const r = cmap + 4 + i * 8;
    if (b.readUInt16BE(r) === 3 && b.readUInt16BE(r + 2) === 1) sub = cmap + b.readUInt32BE(r + 4);
  }
  const glifoDe = (cp) => {
    if (sub < 0 || b.readUInt16BE(sub) !== 4) return 0;
    const segX2 = b.readUInt16BE(sub + 6);
    const ends = sub + 14; const starts = ends + segX2 + 2; const deltas = starts + segX2; const ranges = deltas + segX2;
    for (let i = 0; i < segX2 / 2; i += 1) {
      const fin = b.readUInt16BE(ends + 2 * i); const ini = b.readUInt16BE(starts + 2 * i);
      if (cp < ini || cp > fin) continue;
      const delta = b.readInt16BE(deltas + 2 * i); const ro = b.readUInt16BE(ranges + 2 * i);
      if (ro === 0) return (cp + delta) & 0xffff;
      const g = b.readUInt16BE(ranges + 2 * i + ro + 2 * (cp - ini));
      return g === 0 ? 0 : (g + delta) & 0xffff;
    }
    return 0;
  };
  return { metricas, numGlyphs, avance, caja, glifoDe };
}

const ttfRuta = join(aqui, mapa.fuente.archivo);
const ttf = leerTtf(ttfRuta);
const mci = leerTtf(MCI_TTF);

abrir('the font sits where MaterialCommunityIcons does');
{
  for (const [k, v] of Object.entries(mci.metricas)) {
    afirmar(ttf.metricas[k] === v, `${k} ${ttf.metricas[k]}${ttf.metricas[k] === v ? '' : `, MaterialCommunityIcons ${v}`}`);
  }
  const em = mci.metricas.unitsPerEm;
  const anchos = dibujos.map(([, d]) => ttf.avance(ttf.glifoDe(parseInt(d.codigo, 16))));
  afirmar(anchos.every((a) => a === em), `every glyph ${em} units wide, the em`);
}

// ---------------------------------------------------------------------------
abrir(`a glyph at every code point, each at least ${linea.margen} unit inside the grid's square`);
{
  const em = ttf.metricas.unitsPerEm;
  const unidad = em / linea.cuadricula;
  const borde = { x0: 0, x1: em, y0: ttf.metricas.descent, y1: ttf.metricas.ascent };
  const faltan = []; const fuera = [];
  let menor = Infinity;
  for (const [nombre, d] of dibujos) {
    const g = ttf.glifoDe(parseInt(d.codigo, 16));
    const c = g ? ttf.caja(g) : null;
    if (!c) { faltan.push(nombre); continue; }
    const margen = Math.min(c.xMin - borde.x0, borde.x1 - c.xMax, c.yMin - borde.y0, borde.y1 - c.yMax) / unidad;
    menor = Math.min(menor, margen);
    if (margen < linea.margen) fuera.push(`${nombre} (${margen.toFixed(2)})`);
  }
  afirmar(faltan.length === 0, `${dibujos.length - faltan.length} of ${dibujos.length} code points draw something${faltan.length ? ` — empty or missing: ${faltan.join(', ')}` : ''}`);
  afirmar(fuera.length === 0, `the closest any glyph comes to the square's edge: ${menor.toFixed(2)} units${fuera.length ? ` — too close: ${fuera.join(', ')}` : ''}`);
}

// ---------------------------------------------------------------------------
abrir(`the font draws its sources — each glyph's ink against its drawing's, in Chrome at 96 px (at least ${UMBRAL})`);
{
  const LADO = 96; const CELDA = 100; const POR_FILA = 8;
  const filas = Math.ceil(dibujos.length / POR_FILA);
  const dir = mkdtempSync(join(tmpdir(), 'iconos-'));
  copyFileSync(ttfRuta, join(dir, 'f.ttf'));
  const celda = (i, contenido) => `<div style="position:absolute;left:${(i % POR_FILA) * CELDA}px;top:${Math.floor(i / POR_FILA) * CELDA}px;width:${LADO}px;height:${LADO}px">${contenido}</div>`;
  let html = `<!doctype html><meta charset="utf-8"><style>@font-face{font-family:W;src:url(f.ttf)}body{margin:0;background:#fff}
    .g{-webkit-font-smoothing:antialiased;font-family:W;font-size:${LADO}px;line-height:${LADO}px;height:${LADO}px;color:#000;display:block}</style>`;
  html += `<div style="position:absolute;left:0;top:0">`;
  dibujos.forEach(([nombre], i) => {
    const f = join(aqui, `${nombre}.svg`);
    if (!existsSync(f)) return; // group 1 names it; an empty square scores 0 here
    html += celda(i, `<img width="${LADO}" height="${LADO}" src="data:image/svg+xml;base64,${readFileSync(f).toString('base64')}">`);
  });
  html += `</div><div style="position:absolute;left:0;top:${filas * CELDA}px">`;
  dibujos.forEach(([, d], i) => { html += celda(i, `<span class="g">&#x${d.codigo};</span>`); });
  html += '</div>';
  writeFileSync(join(dir, 'a.html'), html);
  const ancho = Math.max(600, POR_FILA * CELDA); const alto = 2 * filas * CELDA;
  execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
    '--allow-file-access-from-files', '--virtual-time-budget=3000', `--window-size=${ancho},${alto}`,
    `--screenshot=${join(dir, 'a.png')}`, `file://${join(dir, 'a.html')}`], { stdio: 'ignore' });
  const png = readPng(join(dir, 'a.png'));
  if (process.env.ICONOS_VER) copyFileSync(join(dir, 'a.png'), process.env.ICONOS_VER);
  rmSync(dir, { recursive: true, force: true });
  const tinta = (x, y) => { const o = 4 * (y * png.width + x); return png.rgba[o] + png.rgba[o + 1] + png.rgba[o + 2] < 3 * 128; };
  const bajos = []; let peor = 1; let peorNombre = '';
  const bajosFondo = []; let peorFondo = 1; let peorFondoNombre = '';
  // The drawings with a cut (a part in white): their holes are the cut, compared on their own.
  const conCorte = new Set(dibujos.map(([n]) => n).filter((n) => existsSync(join(aqui, `${n}.svg`)) && /="#fff"/.test(readFileSync(join(aqui, `${n}.svg`), 'utf8'))));
  dibujos.forEach(([nombre], i) => {
    const x0 = (i % POR_FILA) * CELDA; const y0 = Math.floor(i / POR_FILA) * CELDA;
    let ambos = 0; let alguno = 0; let a = 0; let f = 0;
    for (let y = 0; y < LADO; y += 1) {
      for (let x = 0; x < LADO; x += 1) {
        const s = tinta(x0 + x, y0 + y); const g = tinta(x0 + x, y0 + filas * CELDA + y);
        if (s) a += 1; if (g) f += 1;
        if (s && g) ambos += 1; if (s || g) alguno += 1;
      }
    }
    // The holes: ground the outside cannot reach — a ring's middle, a box's inside, a cut.
    const huecos = (dy) => {
      const fuera = new Uint8Array(LADO * LADO); const pila = [];
      for (let k = 0; k < LADO; k += 1) pila.push([k, 0], [k, LADO - 1], [0, k], [LADO - 1, k]);
      while (pila.length) {
        const [x, y] = pila.pop();
        if (x < 0 || y < 0 || x >= LADO || y >= LADO || fuera[y * LADO + x] || tinta(x0 + x, y0 + dy + y)) continue;
        fuera[y * LADO + x] = 1;
        pila.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
      }
      const h = new Uint8Array(LADO * LADO);
      for (let y = 0; y < LADO; y += 1) for (let x = 0; x < LADO; x += 1) h[y * LADO + x] = !fuera[y * LADO + x] && !tinta(x0 + x, y0 + dy + y) ? 1 : 0;
      // A pocket under HUECO_MIN pixels is antialiasing's to open or close (where an
      // arrowhead meets its arc, between a sparkle's points), not a shape: dropped.
      const visto = new Uint8Array(LADO * LADO);
      for (let k = 0; k < LADO * LADO; k += 1) {
        if (!h[k] || visto[k]) continue;
        const parte = []; const cola = [k]; visto[k] = 1;
        while (cola.length) {
          const q = cola.pop(); parte.push(q);
          const x = q % LADO; const y = (q - x) / LADO;
          for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
            const n = ny * LADO + nx;
            if (nx >= 0 && ny >= 0 && nx < LADO && ny < LADO && h[n] && !visto[n]) { visto[n] = 1; cola.push(n); }
          }
        }
        if (parte.length < HUECO_MIN) for (const q of parte) h[q] = 0;
      }
      return h;
    };
    const hs = huecos(0); const hg = huecos(filas * CELDA);
    let fondoAmbos = 0; let fondoAlguno = 0;
    for (let k = 0; k < LADO * LADO; k += 1) { if (hs[k] && hg[k]) fondoAmbos += 1; if (hs[k] || hg[k]) fondoAlguno += 1; }
    const iou = alguno ? ambos / alguno : 0;
    const fondo = fondoAlguno ? fondoAmbos / fondoAlguno : 1; // no hole in either: nothing to compare
    if (a === 0 || f === 0 || iou < UMBRAL) bajos.push(`${nombre} ${iou.toFixed(3)}${f === 0 ? ' (the glyph drew nothing)' : ''}`);
    if (conCorte.has(nombre) && fondo < UMBRAL) bajosFondo.push(`${nombre} ${fondo.toFixed(3)}`);
    if (iou < peor) { peor = iou; peorNombre = nombre; }
    if (conCorte.has(nombre) && fondo < peorFondo) { peorFondo = fondo; peorFondoNombre = nombre; }
    if (process.env.ICONOS_VER) console.log(`        ${nombre} ${iou.toFixed(3)} ${fondo.toFixed(3)}`);
  });
  afirmar(bajos.length === 0, `all ${dibujos.length} — the lowest ${peor.toFixed(3)} (${peorNombre})${bajos.length ? ` — under: ${bajos.join(', ')}` : ''}`);
  afirmar(conCorte.size > 0 && bajosFondo.length === 0, `the holes of the ${conCorte.size} drawings with a cut (${[...conCorte].join(', ')}): the cut is where it was drawn — the lowest ${peorFondo.toFixed(3)} (${peorFondoNombre})${bajosFondo.length ? ` — under: ${bajosFondo.join(', ')}` : ''}`);
}

// ---------------------------------------------------------------------------
abrir('the inventory is current, and the first half is whole');
{
  let actual = true;
  try {
    execFileSync(process.execPath, [join(raiz, 'brand/iconos/inventario.mjs'), '--check'], { stdio: 'pipe' });
  } catch { actual = false; }
  afirmar(actual, 'inventario.json is what the compiler finds in the three apps today (inventario.mjs --check)');
  const inv = JSON.parse(readFileSync(join(raiz, 'brand/iconos/inventario.json'), 'utf8')).glifos;
  // ⚠️ A glyph a later row retired from every app keeps its drawing in the font (the page serves this font and its
  // map byte for byte); each is named here with the row and why. `11.8-i` (2026-11-27): her card's stamps are the
  // cow PICTURE (`brand/mostrador/objetos/sello-vaca.svg`, `@/ui/Mostrador`'s `SelloVaca`), as the brand book said.
  const RETIRADOS = { cow: '11.8-i — her card’s stamps are the cow picture, sello-vaca' };
  const reemplazos = dibujos.flatMap(([, d]) => d.reemplaza).filter((n) => !(n in RETIRADOS));
  const nadie = reemplazos.filter((n) => !inv[n]);
  const vuelto = Object.keys(RETIRADOS).filter((n) => inv[n]);
  afirmar(vuelto.length === 0, `a glyph named retired is drawn by no app${vuelto.length ? ` — an app names it again: ${vuelto.join(', ')}` : ''}`);
  afirmar(nadie.length === 0, `every name a drawing replaces is one an app draws${nadie.length ? ` — no app names: ${nadie.join(', ')}` : ''}`);
  const dibujado = new Set(reemplazos);
  for (const [superficie, archivos] of Object.entries(mapa.primera)) {
    if (superficie === '_') continue;
    const pide = new Set();
    for (const [glifo, v] of Object.entries(inv)) {
      if (Object.values(v.apps).flat().some((f) => archivos.includes(f))) pide.add(glifo);
    }
    if (superficie === 'Hoy de Wera Cocina') {
      const lqu = readFileSync(join(raiz, 'cocina/src/lib/loQueUsas.ts'), 'utf8');
      const cuerpo = lqu.match(/export const ICONO_DE\b[^=]*=\s*\{([^}]*)\}/)?.[1] ?? '';
      const suyos = [...cuerpo.matchAll(/'([a-z0-9-]+)'/g)].map((m) => m[1]);
      afirmar(suyos.length >= 4, `Hoy's features read from loQueUsas.ts's ICONO_DE: ${suyos.join(', ')}`);
      for (const s of suyos) pide.add(s);
    }
    const sinDibujo = [...pide].filter((g) => !dibujado.has(g));
    const sinArchivo = archivos.filter((f) => !existsSync(join(raiz, f)));
    afirmar(sinDibujo.length === 0 && sinArchivo.length === 0,
      `${superficie}: all ${pide.size} glyphs drawn${sinDibujo.length ? ` — not drawn: ${sinDibujo.join(', ')}` : ''}${sinArchivo.length ? ` — no such file: ${sinArchivo.join(', ')}` : ''}`);
  }
  const total = Object.keys(inv).length;
  const marcas = new Set(Object.keys(mapa.marcas ?? {}).filter((k) => k !== '_'));
  const esperan = Object.keys(inv).filter((g) => !dibujado.has(g) && !marcas.has(g));
  afirmar(esperan.length === 0,
    `the font is whole: ${total - esperan.length - [...marcas].filter((m) => inv[m]).length} of the ${total} glyphs the three apps draw are drawn here and ${[...marcas].filter((m) => inv[m]).length} are a company's own mark` +
    (esperan.length ? ` — ${esperan.length} not drawn: ${esperan.join(', ')}` : ', none waiting'));
}

console.log(fallos ? `\n${fallos} assertion(s) FAILED` : `\nall ${grupo} assertion groups passed`);
process.exit(fallos ? 1 : 0);
