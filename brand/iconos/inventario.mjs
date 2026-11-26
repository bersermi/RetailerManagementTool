// ============================================================================
// THE GLYPHS THE THREE APPS DRAW, COUNTED BY THE COMPILER — Step 11, row 11.3-i
// (2026-11-21).
//
// Asks TypeScript, app by app (Wera in app/, Wera Cocina in cocina/, Itacate in
// itacate/), for every string literal whose contextual type is
// MaterialCommunityIcons' `name` — a JSX prop, a typed record, a function's
// declared return — so a glyph named in a data file counts as much as one in
// a screen. A grep would also count `'store'` the word; the compiler does not.
//
// Writes brand/iconos/inventario.json: every glyph, the files that name it in
// each app, and the drawing that replaces it (mapa.json), or null while it is
// still MaterialCommunityIcons' — and `marca: true` on a company's own mark,
// which is never ours to draw (mapa.json's `marcas`, row 11.3-ii). Prints the
// totals.
//
//   node brand/iconos/inventario.mjs           # writes inventario.json
//   node brand/iconos/inventario.mjs --check   # exits 1 if it would change
//
// Needs the repository's node_modules (typescript, @expo/vector-icons).
// No workflow runs it (brand/ is read by none).
// ============================================================================

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));
const raiz = join(aqui, '..', '..');
const require = createRequire(join(raiz, 'package.json'));
const ts = require('typescript');
const mapa = require('@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/MaterialCommunityIcons.json');

const APPS = ['app', 'cocina', 'itacate'];

/** A union of string literals this large is the icon set's `name`, and nothing else in the apps. */
function esNombreDeGlifo(tipo) {
  if (!tipo) return false;
  const partes = tipo.isUnion() ? tipo.types : [tipo];
  let literales = 0;
  for (const p of partes) if (p.isStringLiteral() && Object.hasOwn(mapa, p.value)) literales += 1;
  return literales > 1000;
}

const porGlifo = new Map(); // glyph → { app → Set(file) }
let checker;
/** The type a place expects of the node; an identifier that is a name, not a value, expects none. */
function contextual(nodo) {
  try { return checker.getContextualType(nodo); } catch { return undefined; }
}

/** The expressions a value can be handed to `name` as. */
const K = ts.SyntaxKind;
const EXPRESIONES = new Set([
  K.StringLiteral, K.NoSubstitutionTemplateLiteral, K.Identifier, K.PropertyAccessExpression,
  K.ElementAccessExpression, K.ConditionalExpression, K.CallExpression, K.ParenthesizedExpression,
  K.AsExpression, K.BinaryExpression, K.NonNullExpression,
]);

for (const app of APPS) {
  const dir = join(raiz, app);
  const config = ts.getParsedCommandLineOfConfigFile(join(dir, 'tsconfig.json'), {}, {
    ...ts.sys,
    onUnRecoverableConfigFileDiagnostic: (d) => { throw new Error(ts.flattenDiagnosticMessageText(d.messageText, '\n')); },
  });
  const programa = ts.createProgram({ rootNames: config.fileNames, options: config.options });
  checker = programa.getTypeChecker();
  for (const fuente of programa.getSourceFiles()) {
    const ruta = relative(raiz, fuente.fileName);
    if (!ruta.startsWith(`${app}/src/`)) continue;
    if (/\.test\.tsx?$/.test(ruta)) continue;
    const anotar = (nombre) => {
      if (!porGlifo.has(nombre)) porGlifo.set(nombre, {});
      (porGlifo.get(nombre)[app] ??= new Set()).add(ruta);
    };
    const visitar = (nodo) => {
      // Two ways a glyph reaches the icon set's `name`:
      // (a) a literal written where that wide type is expected (a typed record, a prop);
      // (b) any expression handed to it whose own type is a NARROW union of glyphs —
      //     `icon: 'arrow-up' | 'arrow-down'` declared by a screen and passed on.
      if (EXPRESIONES.has(nodo.kind) && esNombreDeGlifo(contextual(nodo))) {
        if ((ts.isStringLiteral(nodo) || ts.isNoSubstitutionTemplateLiteral(nodo)) && Object.hasOwn(mapa, nodo.text)) {
          anotar(nodo.text);
        } else {
          const propio = checker.getTypeAtLocation(nodo);
          if (!esNombreDeGlifo(propio)) {
            for (const p of propio.isUnion() ? propio.types : [propio]) {
              if (p.isStringLiteral() && Object.hasOwn(mapa, p.value)) anotar(p.value);
            }
          }
        }
      }
      // (c) a spread of props — `<BotonLleno {...props} />` — whose `icon` the
      //     receiving component types wide and the sender narrow.
      if (ts.isJsxSpreadAttribute(nodo)) {
        const destino = contextual(nodo.expression);
        const origen = checker.getTypeAtLocation(nodo.expression);
        for (const prop of destino?.getProperties() ?? []) {
          if (!esNombreDeGlifo(checker.getTypeOfSymbolAtLocation(prop, nodo))) continue;
          const suyo = origen.getProperty(prop.name);
          if (!suyo) continue;
          const tipo = checker.getTypeOfSymbolAtLocation(suyo, nodo);
          for (const p of tipo.isUnion() ? tipo.types : [tipo]) {
            if (p.isStringLiteral() && Object.hasOwn(mapa, p.value)) anotar(p.value);
          }
        }
      }
      ts.forEachChild(nodo, visitar);
    };
    visitar(fuente);
  }
}

// Which drawing replaces each glyph: mapa.json, the drawings' own list; and the
// marks that stay their owners' (mapa.json's `marcas`).
const mapaJson = JSON.parse(readFileSync(join(aqui, 'mapa.json'), 'utf8'));
const mapaDibujos = mapaJson.dibujos;
const dibujoDe = new Map();
for (const [dibujo, d] of Object.entries(mapaDibujos)) for (const mci of d.reemplaza) dibujoDe.set(mci, dibujo);
const marcas = new Set(Object.keys(mapaJson.marcas ?? {}).filter((k) => k !== '_'));

const glifos = {};
for (const nombre of [...porGlifo.keys()].sort()) {
  const deApp = porGlifo.get(nombre);
  glifos[nombre] = {
    dibujo: dibujoDe.get(nombre) ?? null,
    ...(marcas.has(nombre) ? { marca: true } : {}),
    apps: Object.fromEntries(APPS.filter((a) => deApp[a]).map((a) => [a, [...deApp[a]].sort()])),
  };
}

const archivos = new Set();
for (const v of Object.values(glifos)) for (const fs of Object.values(v.apps)) for (const f of fs) archivos.add(f);

const salida = {
  _: 'Written by brand/iconos/inventario.mjs — do not edit by hand. Every MaterialCommunityIcons glyph a screen of the three apps names (tests excluded), the files that name it, and the drawing that replaces it (null: not drawn yet; marca: a company\'s own mark, never ours to draw).',
  glifos,
};
const texto = `${JSON.stringify(salida, null, 2)}\n`;
const destino = join(aqui, 'inventario.json');

const cuenta = Object.keys(glifos).length;
const porApp = Object.fromEntries(APPS.map((a) => [a, Object.values(glifos).filter((g) => g.apps[a]).length]));
const dibujados = Object.values(glifos).filter((g) => g.dibujo).length;
const deMarca = Object.values(glifos).filter((g) => g.marca).length;
console.log(`${cuenta} distinct glyphs named in ${archivos.size} files — Wera ${porApp.app}, Wera Cocina ${porApp.cocina}, Itacate ${porApp.itacate}`);
console.log(`${dibujados} of them drawn (${new Set(Object.values(glifos).map((g) => g.dibujo).filter(Boolean)).size} drawings), ${deMarca} a company's own mark; ${cuenta - dibujados - deMarca} still to draw`);
const sobran = [...dibujoDe.keys(), ...marcas].filter((n) => !glifos[n]);
if (sobran.length) console.log(`⚠️ mapa.json names glyphs no app names: ${sobran.join(', ')}`);

if (process.argv.includes('--check')) {
  const antes = existsSync(destino) ? readFileSync(destino, 'utf8') : '';
  if (antes !== texto) { console.log('FAIL: inventario.json is stale — run node brand/iconos/inventario.mjs'); process.exit(1); }
  console.log('inventario.json is current');
} else {
  writeFileSync(destino, texto);
  console.log(`wrote ${relative(raiz, destino)}`);
}
