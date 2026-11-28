// ============================================================================
// THE DRAWN ICONS — plan task `11.10-i`, direction A · *Mostrador* (the drawings of
// rows `11.3-i` and `11.3-ii`, his word on their line of 2026-11-26). The three
// apps draw every icon from one font built in `brand/iconos/`, through one file,
// `@/ui/Icono`; Google's G is Google's own picture (`brand/marcas/`).
//
// This file is the same in the three apps but for `APP` (its siblings' copies
// say `cocina` and `itacate`).
//
// ⚠️ WHAT THIS CAN AND CANNOT SEE: it reads source and bytes. That a drawing sits
// where the old glyph sat, in the same box at every size, is `brand/iconos/iconos.mjs`'s
// comparison of the two fonts and the screens' — the session's emulator and
// Simulator shots and his look (ADR-035 §2.11).
// ============================================================================

import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

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

const GLIFOS = JSON.parse(readFileSync(join(SRC, 'marca/iconos/WeraIconos.json'), 'utf8')) as Record<string, number>;

describe('`11.10-i` — the font and its map are `brand/iconos/`’s, byte for byte', () => {
  it('`WeraIconos.ttf` and `WeraIconos.json`', () => {
    for (const file of ['WeraIconos.ttf', 'WeraIconos.json']) {
      expect(sha(`${APP}/src/marca/iconos/${file}`), file).toBe(sha(`brand/iconos/${file}`));
    }
  });

  it('every name in the map is a drawing’s, in the private-use code points', () => {
    expect(Object.keys(GLIFOS).length).toBeGreaterThan(100);
    for (const [nombre, punto] of Object.entries(GLIFOS)) {
      expect(punto >= 0xe000 && punto <= 0xf8ff, nombre).toBe(true);
    }
    // The two companies' marks are never in it (`brand/marcas/README.md`).
    expect(GLIFOS).not.toHaveProperty('google');
    expect(GLIFOS).not.toHaveProperty('whatsapp');
  });

  it('`@/ui/Icono` and `@/marca/glifos` are one file each in the three apps', () => {
    expect(sha(`${APP}/src/ui/Icono.tsx`)).toBe(sha('app/src/ui/Icono.tsx'));
    expect(sha(`${APP}/src/marca/glifos.ts`)).toBe(sha('app/src/marca/glifos.ts'));
  });
});

describe('`11.10-i` — every icon goes through `@/ui/Icono`', () => {
  it('no other file imports `@expo/vector-icons`', () => {
    const quien = fuentes(SRC)
      .filter((f) => /from '@expo\/vector-icons/.test(readFileSync(f, 'utf8')))
      .map((f) => relative(ROOT, f));
    expect(quien).toEqual([`${APP}/src/ui/Icono.tsx`]);
  });

  it('it draws the font, and MaterialCommunityIcons only for `whatsapp`, until Meta’s glyph is in `brand/marcas/`', () => {
    const glifos = code(`${APP}/src/marca/glifos.ts`);
    expect(glifos).toContain("export const FAMILIA_ICONOS = 'WeraIconos';");
    expect(glifos).toContain("import GLIFOS from '@/marca/iconos/WeraIconos.json';");
    expect(glifos).toContain("export type NombreIcono = keyof typeof GLIFOS | 'whatsapp';");
    const icono = code(`${APP}/src/ui/Icono.tsx`);
    expect(icono).toContain("createIconSet(GLIFOS, FAMILIA_ICONOS, require('@/marca/iconos/WeraIconos.ttf') as number)");
    expect([...icono.matchAll(/<MaterialCommunityIcons\b[^>]*>/g)].map((m) => m[0])).toEqual([
      '<MaterialCommunityIcons name="whatsapp" {...props} />',
    ]);
    expect(icono).toContain("if (name === 'whatsapp') return");
  });

  it('the root layout loads the font with the others, so no icon draws blank while it loads', () => {
    // Read as text: `@/marca/fuentes` requires the `.ttf` files, which Vitest cannot load.
    const f = code(`${APP}/src/marca/fuentes.ts`);
    expect(f).toMatch(/import \{ FAMILIA_ICONOS \} from '@\/marca\/glifos';/);
    expect(f).toMatch(/\[FAMILIA_ICONOS\]: require\('@\/marca\/iconos\/WeraIconos\.ttf'\) as number,/);
    expect(code(`${APP}/src/app/_layout.tsx`)).toMatch(/useFonts\(\{?\s*(\.\.\.)?FUENTES/);
  });
});

describe('`11.10-i` — Google’s G is Google’s own, in its colours, by its rules', () => {
  it('the three densities are `brand/marcas/google/`’s, byte for byte', () => {
    for (const file of ['g.png', 'g@2x.png', 'g@3x.png']) {
      expect(sha(`${APP}/src/marca/google/${file}`), file).toBe(sha(`brand/marcas/google/${file}`));
    }
  });

  it('*Continuar con Google* draws the picture at half the button’s height, on white, never a glyph', () => {
    const entrar = code(`${APP}/src/app/(auth)/entrar.tsx`);
    expect(entrar).not.toMatch(/name="google"/);
    expect(entrar).toMatch(
      /<Image source=\{require\('@\/marca\/google\/g\.png'\)\} style=\{\{ width: (scale|SIZE)\.tapTarget \/ 2, height: \1\.tapTarget \/ 2 \}\} accessibilityIgnoresInvertColors \/>/,
    );
    // Google: "It must be the standard color version … and appear on a white background."
    const boton = entrar.slice(entrar.indexOf('accessibilityLabel={ES.auth.google}'), entrar.indexOf("require('@/marca/google/g.png')"));
    expect(boton).toContain('backgroundColor: PALETTE.superficie');
    expect(code(`${APP}/src/theme/palette.ts`)).toMatch(/superficie: '#FFFFFF'/);
  });
});
