// ============================================================================
// EVERY WORD LEGIBLE ON EVERY GROUND — `11.7-i`, direction A · *Mostrador* (the
// owner's yes on this app's real screens, 2026-11-26, at `11.5-ii`). This app's
// copy of Wera's contrast test (`app/test/palette.test.ts`, área 13), which
// neither sibling had until now.
//
// ⚠️ A VALUE A CUSTOMER SEES, NOT A RENDERING (ADR-035 §2.11): the palette is a
// promise about numbers in a table — "every word is legible on every ground it
// can land on" — and that is arithmetic. No component is imported.
//
// ⚠️ NO HEX IS SPELLED HERE. The source is `brand/mostrador/paleta.json`, where
// the design system measured it (`contraste.mjs`), and every assertion reads
// `PALETTE` or that file — so a value nudged to match a drawing, on a good screen
// in a well-lit room, is red here before it is illegible on a low-end phone.
// ============================================================================

import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { DENSITIES } from '../../app/src/theme/density';
import { HUES } from '@/theme/colores';
import { PALETTE, SIZE } from '@/theme/palette';

type Role = keyof typeof PALETTE;

const MOSTRADOR = JSON.parse(
  readFileSync(new URL('../../brand/mostrador/paleta.json', import.meta.url), 'utf8'),
) as {
  apps: Record<string, Record<string, string>>;
  cocinas: Record<string, string>;
  medir: Record<string, { tintas: string[]; fondos: string[]; rellenos: [string, string][] }> & { sobreCocinas: string };
};
const OURS = MOSTRADOR.apps.cocina;
const MEDIR = MOSTRADOR.medir.cocina;
const ROLES = Object.keys(PALETTE) as Role[];

/** WCAG 2.1's floor for normal-size text. */
const AA_NORMAL_TEXT = 4.5;

/** WCAG 2.1 relative luminance — Wera's nine lines, so a number here is that test's number. */
function luminance(hex: string): number {
  const channel = (pair: string): number => {
    const v = parseInt(pair, 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const h = hex.slice(1);
  return 0.2126 * channel(h.slice(0, 2)) + 0.7152 * channel(h.slice(2, 4)) + 0.0722 * channel(h.slice(4, 6));
}

/** Contrast ratio, symmetric — white on green is green on white. */
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** A role the design system lists, which this table must have — else a loop below skips it unseen. */
const of = (role: string): string => {
  expect(ROLES, `${role} is listed by paleta.json but not in PALETTE`).toContain(role);
  return PALETTE[role as Role];
};

describe('`11.7-i` — the table is direction A · Mostrador, as the design system measured it', () => {
  it('is `brand/mostrador/paleta.json`’s `cocina` block, role by role, in both directions', () => {
    expect(ROLES.length, 'no roles to check').toBeGreaterThan(10);
    expect([...ROLES].sort()).toEqual(Object.keys(OURS).sort());
    for (const role of ROLES) expect(PALETTE[role], `${role} is not the design system's`).toBe(OURS[role]);
  });

  it('gives every role a six-digit hex, because luminance parses one', () => {
    for (const role of ROLES) expect(PALETTE[role], `${role} is not #RRGGBB`).toMatch(/^#[0-9A-F]{6}$/);
  });

  it('gives every role its own value — but for the pairs named here, on purpose', () => {
    // Two roles sharing a value is one role wearing two hats, and the second hat is the one nobody
    // remembers to change. ⚠️ The header sits on the counter (call 3 of the design system, as
    // recommended), so `banda` is `fondo`'s grey.
    // ⚠️ And the words on the green (`sobreAccion`) are the sheet's white — one white in the app.
    expect(PALETTE.banda, 'the header no longer sits on the counter').toBe(PALETTE.fondo);
    expect(PALETTE.sobreAccion, 'the words on the green are no longer the sheet’s white').toBe(PALETTE.superficie);
    const named = new Set<Role>(['banda', 'sobreAccion']);
    const values = ROLES.filter((r) => !named.has(r)).map((r) => PALETTE[r]);
    expect(new Set(values).size, 'two roles share a hex').toBe(values.length);
  });

  it('the kitchens’ six colours are the design system’s, one for one', () => {
    expect(Object.keys(HUES).length).toBe(6);
    expect(HUES).toEqual(MOSTRADOR.cocinas);
  });
});

describe('`11.7-i` — every word is legible on every ground it can land on', () => {
  it('clears WCAG AA for normal text, ink by ground — the matrix, not a spot check', () => {
    expect(MEDIR.tintas.length, 'no inks listed').toBeGreaterThan(3);
    expect(MEDIR.fondos.length, 'no grounds listed').toBeGreaterThan(3);
    const failures: string[] = [];
    for (const ink of MEDIR.tintas) {
      for (const ground of MEDIR.fondos) {
        const ratio = contrast(of(ink), of(ground));
        if (ratio < AA_NORMAL_TEXT) failures.push(`${ink} on ${ground} is ${ratio.toFixed(2)}:1`);
      }
    }
    expect(failures, 'below 4.5:1 — these cannot be read').toEqual([]);
  });

  it('every filled button the design system lists: its words on its fill', () => {
    expect(MEDIR.rellenos.length, 'no fills listed').toBeGreaterThan(1);
    for (const [ink, fill] of MEDIR.rellenos) {
      expect(contrast(of(ink), of(fill)), `${ink} on ${fill}`).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
    }
  });

  it('white words on each kitchen’s colour — her name, her card, her band', () => {
    for (const [name, hue] of Object.entries(HUES)) {
      expect(contrast(of(MOSTRADOR.medir.sobreCocinas), hue), name).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
    }
  });
});

describe('`11.7-i` — the sizes are Wera’s `normal` row, fixed', () => {
  it('every size this app draws at is Wera’s, key for key — so `@/theme/letra`’s three styles are Wera’s too', () => {
    const normal = DENSITIES.normal as unknown as Record<string, number>;
    for (const [key, value] of Object.entries(SIZE)) expect(value, key).toBe(normal[key]);
    // The five `letra.ts` reads, present: a scale without them would draw a title with no line.
    for (const key of ['titleSize', 'titleLine', 'headingSize', 'headingLine', 'numeroSize', 'numeroLine']) {
      expect(SIZE, key).toHaveProperty(key);
    }
  });
});
