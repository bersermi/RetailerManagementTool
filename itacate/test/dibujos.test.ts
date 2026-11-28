// ============================================================================
// THE DRAWINGS IN THEIR PLACES — plan task `11.10-ii`, row `11.4`'s drawings (his
// call 13, ruled as drawn on 2026-11-26): a screen with nothing yet draws one above
// its sentence; a kitchen or a dish without a photo wears her trade's drawing once,
// in white, on her colour; and (in the neighbours' app) *¡Ganaste …!* lays the gift
// on a sheet of the kitchen's colour. `brand/dibujos/dibujos.json` names every place.
//
// This file is the same in the two siblings but for `APP` and, in the neighbours'
// copy, the reward and the map's pins at its end.
//
// ⚠️ WHAT THIS CAN AND CANNOT SEE: it reads source and bytes — that every picture is
// `brand/dibujos/png/`'s, that every place the inventory names draws its drawing,
// tinted as the rules say. That the drawing sits well on the screen, at 130 % text and
// on both platforms, is the session's emulator and Simulator shots and his look
// (ADR-035 §2.11); that each picture is its SVG is `brand/dibujos/dibujos.mjs`'s.
// ============================================================================

import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { DIBUJOS, POR_GIRO } from '@/api/pagina';

const APP = 'itacate';
const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const SRC = join(ROOT, APP, 'src');
const sha = (path: string) => createHash('sha256').update(readFileSync(join(ROOT, path))).digest('hex');
/** Source with its comments removed, so a sentence about a thing is not the thing. */
const code = (path: string) =>
  readFileSync(join(ROOT, path), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

function fuentes(dir: string): string[] {
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) return fuentes(ruta);
    return /\.tsx?$/.test(nombre) ? [ruta] : [];
  });
}

interface Lugar {
  readonly app: string;
  readonly archivo: string;
  readonly busca: string;
  readonly textos: readonly string[];
  readonly tinta: readonly string[];
}
interface Entrada {
  readonly tipo: 'vacio' | 'oficio' | 'premio';
  readonly puntos: number;
  readonly giro?: string;
  readonly donde?: readonly Lugar[];
}
interface Inventario {
  readonly reglas: Readonly<Record<'vacio' | 'oficio' | 'premio', string>>;
  readonly dibujos: Readonly<Record<string, Entrada>>;
  readonly sinFoto: { readonly lugares: readonly { readonly archivo: string; readonly modo: 'portada' | 'cuadro' }[]; readonly pines: { readonly archivo: string; readonly busca: string } };
}

const INVENTARIO = JSON.parse(readFileSync(join(ROOT, 'brand/dibujos/dibujos.json'), 'utf8')) as Inventario;
const entradas = Object.entries(INVENTARIO.dibujos);
/** The empty screens' drawings this app draws, and where. */
const VACIOS = entradas.flatMap(([nombre, e]) => (e.donde ?? []).filter((l) => l.app === APP && e.tipo === 'vacio').map((l) => ({ nombre, ...l })));
const OFICIOS = entradas.filter(([, e]) => e.tipo === 'oficio').map(([nombre]) => nombre);
const PREMIOS = entradas.flatMap(([nombre, e]) => (e.donde ?? []).filter((l) => l.app === APP && e.tipo === 'premio').map((l) => ({ nombre, ...l })));
/** Every drawing this app carries: its empty screens', the nine trades, and its reward if it has one. */
const SUYOS = [...new Set([...VACIOS.map((v) => v.nombre), ...OFICIOS, ...PREMIOS.map((p) => p.nombre)])].sort();
const DENSIDADES = ['', '@2x', '@3x'];

describe('`11.10-ii` — the pictures are `brand/dibujos/png/`’s, byte for byte', () => {
  it('`src/marca/dibujos/` holds this app’s drawings at 1×, 2× and 3×, and nothing else', () => {
    expect(SUYOS.length).toBeGreaterThan(OFICIOS.length);
    expect(readdirSync(join(SRC, 'marca/dibujos')).sort()).toEqual(SUYOS.flatMap((d) => DENSIDADES.map((s) => `${d}${s}.png`)).sort());
  });

  it('each one is its source’s bytes — a drawing redrawn there is copied here in the same PR', () => {
    for (const dibujo of SUYOS) {
      for (const s of DENSIDADES) expect(sha(`${APP}/src/marca/dibujos/${dibujo}${s}.png`), `${dibujo}${s}`).toBe(sha(`brand/dibujos/png/${dibujo}${s}.png`));
    }
  });

  it('each one asked for by `@/theme/dibujos`, at 1× and by its name (the phone picks its density)', () => {
    const tabla = code(`${APP}/src/theme/dibujos.ts`);
    for (const dibujo of SUYOS) expect(tabla, dibujo).toContain(`require('@/marca/dibujos/${dibujo}.png') as ImageSourcePropType`);
    expect(tabla).not.toMatch(/@2x|@3x/);
  });
});

describe('a kitchen or a dish without a photo — her trade’s drawing once, white on her colour', () => {
  it('the nine trades the code names are `brand/dibujos/`’s nine, each worn by the trade the inventory says', () => {
    expect([...OFICIOS].sort()).toEqual([...DIBUJOS].sort());
    for (const [nombre, e] of entradas.filter(([, x]) => x.tipo === 'oficio')) expect(POR_GIRO[e.giro as keyof typeof POR_GIRO]?.dibujo, nombre).toBe(nombre);
    const tabla = code(`${APP}/src/theme/dibujos.ts`);
    for (const dibujo of DIBUJOS) expect(tabla, dibujo).toContain(`${dibujo}: require('@/marca/dibujos/${dibujo}.png') as ImageSourcePropType,`);
  });

  it('`Dibujo` draws it once, centred, at 60 % of a cover’s height and 64 % of a dish row’s square, tinted white — no wallpaper', () => {
    expect(INVENTARIO.reglas.oficio).toMatch(/60% of the frame's height \(64% in a dish row's square\)/);
    const dibujo = code(`${APP}/src/ui/Dibujo.tsx`);
    expect(dibujo).toMatch(/const ALTO = \{ portada: '60%', cuadro: '64%' \} as const;/);
    expect(dibujo).toMatch(/<Image source=\{DIBUJO\[dibujo\]\} resizeMode="contain" style=\{\{ width: ALTO\[modo\], height: ALTO\[modo\], tintColor: PALETTE\.superficie \}\} \/>/);
    expect(dibujo).toMatch(/alignItems: 'center', justifyContent: 'center'/);
    expect(dibujo.match(/<Image\b/g)?.length, 'one picture for her trade, one for a screen with nothing yet').toBe(2);
    expect(dibujo).not.toMatch(/PATRON|opacity/);
  });

  it('every place the inventory lists for this app draws it, in the way it lists', () => {
    const suyos = INVENTARIO.sinFoto.lugares.filter((l) => l.archivo.startsWith(`${APP}/`));
    expect(suyos.length).toBeGreaterThan(0);
    for (const lugar of suyos) expect(code(lugar.archivo), lugar.archivo).toMatch(new RegExp(`<Dibujo [^>]*modo="${lugar.modo}"`));
    const hoy = fuentes(SRC).filter((f) => /<Dibujo /.test(code(relative(ROOT, f)))).map((f) => relative(ROOT, f));
    expect(hoy.sort()).toEqual(suyos.map((l) => l.archivo).sort());
  });
});

describe('a screen with nothing yet — its drawing above its sentence, 96 points, in `accion`', () => {
  it('`DibujoVacio` draws the inventory’s size in `accion`, and the rule says 96', () => {
    expect(INVENTARIO.reglas.vacio).toMatch(/Above the sentence, centred, 96 points/);
    const dibujo = code(`${APP}/src/ui/Dibujo.tsx`);
    expect(dibujo).toMatch(/export const LADO_VACIO = 96;/);
    expect(dibujo).toMatch(/source=\{VACIO\[dibujo\]\}[\s\S]*?width: LADO_VACIO, height: LADO_VACIO, tintColor: PALETTE\.accion/);
    for (const v of VACIOS) expect(v.tinta, `${v.nombre} in ${v.archivo}`).toEqual(['accion']);
  });

  it('every empty screen the inventory names for this app draws its drawing, and still says its sentence', () => {
    expect(VACIOS.length).toBe(3);
    const tabla = code(`${APP}/src/theme/dibujos.ts`);
    for (const v of VACIOS) {
      const pantalla = code(v.archivo);
      expect(pantalla, v.archivo).toContain(v.busca);
      expect(pantalla, v.archivo).toMatch(new RegExp(`<(DibujoVacio|Aviso) [^>]*dibujo="${v.nombre}"`));
      expect(tabla, v.nombre).toContain(`${v.nombre}: require('@/marca/dibujos/${v.nombre}.png')`);
    }
  });
});

describe('*¡Ganaste …!* — the gift on a sheet of the kitchen’s colour', () => {
  it('the inventory names one reward, here, and the screen still says it', () => {
    expect(PREMIOS.length).toBe(1);
    expect(code(PREMIOS[0].archivo)).toContain(PREMIOS[0].busca);
    expect(code(`${APP}/src/theme/dibujos.ts`)).toMatch(new RegExp(`export const PREMIO = require\\('@/marca/dibujos/${PREMIOS[0].nombre}\\.png'\\) as ImageSourcePropType;`));
  });

  it('one sheet of her colour holds the gift in white at 150 points, the reward in Mansalva and the sentence, both white', () => {
    expect(INVENTARIO.reglas.premio).toMatch(/a sheet in the kitchen's colour holding the drawing in white, 150 points, above the reward in `premio`/);
    const gano = code(PREMIOS[0].archivo);
    expect(gano).toMatch(/const LADO_PREMIO = 150;/);
    expect(gano).toMatch(/borderRadius: ESQUINA\.hoja, backgroundColor: hue \}\}>\s*<Image\s+source=\{PREMIO\}[\s\S]*?width: LADO_PREMIO, height: LADO_PREMIO, tintColor: PALETTE\.superficie/);
    expect(gano).toMatch(/<Text accessibilityRole="header" style=\{\{ \.\.\.letraPremio\(\), color: PALETTE\.superficie, textAlign: 'center' \}\}>/);
    expect(gano).toMatch(/color: PALETTE\.superficie, textAlign: 'center' \}\}>\{ES\.gano\.detalle\(nombre\)\}/);
  });

  it('and the cow and its three badges are gone from it — the card’s stamps carry the cow', () => {
    const gano = code(PREMIOS[0].archivo);
    expect(gano).not.toMatch(/vaca-oxido|Insignia|<Icono/);
  });
});

describe('the map’s pins keep the old flat drawings (`brand/giros.svg`) — at 20 points a line is a smudge', () => {
  const svg = readFileSync(join(ROOT, 'brand/giros.svg'), 'utf8');
  const simbolos = [...svg.matchAll(/<symbol id="([a-z]+)" viewBox="0 0 64 64">/g)].map((m) => m[1]);

  it('`src/marca/giros/` holds one 512 px white picture per symbol, drawn by `render.sh giros` into this app', () => {
    expect([...simbolos].sort()).toEqual([...DIBUJOS].sort());
    expect(readdirSync(join(SRC, 'marca/giros')).sort()).toEqual(DIBUJOS.map((d) => `${d}.png`).sort());
    for (const dibujo of DIBUJOS) {
      const png = readFileSync(join(SRC, 'marca/giros', `${dibujo}.png`));
      expect(png.subarray(1, 4).toString('latin1'), dibujo).toBe('PNG');
      expect([png.readUInt32BE(16), png.readUInt32BE(20)], dibujo).toEqual([512, 512]);
    }
    const render = readFileSync(join(ROOT, 'store/cocina-itacate/render.sh'), 'utf8');
    expect(render).toMatch(/local out="\$REPO\/itacate\/src\/marca\/giros"/);
    expect(render).toMatch(/if \[\[ "\$\{1:-\}" == "giros" \]\]; then\n  giros\n  exit 0/);
  });

  it('`@/theme/pines` asks for each, and the map — and nothing else — draws them', () => {
    const pines = code(`${APP}/src/theme/pines.ts`);
    for (const dibujo of DIBUJOS) expect(pines, dibujo).toContain(`${dibujo}: require('@/marca/giros/${dibujo}.png') as ImageSourcePropType,`);
    const { archivo, busca } = INVENTARIO.sinFoto.pines;
    expect(code(archivo)).toContain(busca);
    expect(busca).toBe('PIN[pin.dibujo]');
    const usan = fuentes(SRC).filter((f) => /@\/marca\/giros\/|@\/theme\/pines/.test(code(relative(ROOT, f)))).map((f) => relative(ROOT, f));
    expect(usan.sort()).toEqual([archivo, `${APP}/src/theme/pines.ts`].sort());
  });
});
