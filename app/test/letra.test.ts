// ============================================================================
// THE LETTERING — `11.6`, direction A · *Mostrador* (the owner's yes of
// 2026-11-26): Archivo for titles, headings and the one big number.
//
// ⚠️ A VALUE A CUSTOMER SEES, NOT A RENDERING (ADR-035 §2.11): which file a phone
// draws its titles in, and that it is the file the design system measured. No
// component is imported. The files are read as bytes, so a font swapped for a
// "similar" one — another version, another cut — is red here, not on a phone.
// ============================================================================

import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { DENSITIES, DENSITY_MODES } from '@/theme/density';
import { FAMILIA_NUMERO, FAMILIA_TITULO, letraEncabezado, letraNumero, letraTitulo } from '@/theme/letra';

const bytes = (path: string) => readFileSync(new URL(path, import.meta.url)).toString('base64');

describe('`11.6` — Archivo, the design system’s files byte for byte', () => {
  it('the two cuts and their licence are `brand/letras/`’s', () => {
    for (const file of ['ArchivoSemiExpanded-ExtraBold.ttf', 'ArchivoCondensed-Bold.ttf', 'OFL-Archivo.txt']) {
      expect(bytes(`../src/marca/letras/${file}`), file).toBe(bytes(`../../brand/letras/${file}`));
    }
  });

  it('loads exactly those two, and Nunito no more', () => {
    // Read as text: `@/marca/fuentes` requires the `.ttf` files, which Vitest cannot load.
    const fuentes = readFileSync(new URL('../src/marca/fuentes.ts', import.meta.url), 'utf8');
    const loaded = [...fuentes.matchAll(/require\('@\/marca\/letras\/([^']+)'\)/g)].map((m) => m[1]);
    expect(loaded).toEqual(['ArchivoSemiExpanded-ExtraBold.ttf', 'ArchivoCondensed-Bold.ttf']);
    expect(fuentes).toMatch(/\[FAMILIA_TITULO\]: require\('@\/marca\/letras\/ArchivoSemiExpanded-ExtraBold\.ttf'\)/);
    expect(fuentes).toMatch(/\[FAMILIA_NUMERO\]: require\('@\/marca\/letras\/ArchivoCondensed-Bold\.ttf'\)/);
    // A family name is the file's name, so Android finds it the same way iOS does.
    expect(FAMILIA_TITULO).toBe('ArchivoSemiExpanded-ExtraBold');
    expect(FAMILIA_NUMERO).toBe('ArchivoCondensed-Bold');
  });
});

describe('`11.6` — each style says its size and its line, and never a weight', () => {
  it('a title, a heading and the big number, in both modes', () => {
    for (const mode of DENSITY_MODES) {
      const scale = DENSITIES[mode];
      for (const style of [letraTitulo(scale), letraEncabezado(scale), letraNumero(scale)]) {
        // ⚠️ On Android a custom family asked for a weight it lacks falls back to the
        // phone's face — so a weight here would undo the face on half the phones.
        expect(style, `${mode}: a weight beside the family`).not.toHaveProperty('fontWeight');
        expect(style.lineHeight, `${mode}: a line shorter than its letters`).toBeGreaterThan(style.fontSize);
      }
    }
  });

  it('the big number asks for figures in columns', () => {
    // ⚠️ Archivo's figures are proportional by default; `11.5-i` measured a column
    // held on both platforms with `tabular-nums` and not without.
    expect(letraNumero(DENSITIES.normal).fontVariant).toEqual(['tabular-nums']);
  });
});
