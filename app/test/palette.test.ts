// ============================================================================
// ÁREA 13 — THE ELEVEN ROLES. Plan task 5b.6.
//
// ⚠️⚠️ READ THE BOUNDARY BEFORE ADDING TO THIS FILE. ADR-035 §2.11, amended
// 2026-09-07, allows a unit test that pins **a value a customer sees or the
// ledger stores** and REFUSES suites over rendering, navigation and layout.
// A test that mounted a row and screenshotted it would be the refused kind,
// and §2.11 bans it by name. No component is imported here.
//
// These are here on the same narrower argument `density.test.ts` makes: the
// palette is a PROMISE ABOUT NUMBERS IN A TABLE — "every word is legible on
// every ground it can land on" — and that is arithmetic, not rendering.
//
// ⚠️ WHAT IT PROTECTS AGAINST, CONCRETELY. Not somebody deleting the palette;
// that is loud. It is somebody nudging one hex to match a drawing, on a good
// screen, in a well-lit room, and dropping a role below the legibility floor
// for the shopkeeper it was bought for. That defect is invisible in review and
// invisible on the developer's own phone. It already happened once, before
// this file existed: the amber the canvas carried was 4.25:1 on its own
// ground, and nothing but this measurement would ever have said so.
//
// ⚠️ NO HEX IS SPELLED IN THIS FILE. Every assertion reads `PALETTE`, so a
// value changed in one place does not have to be changed in two — and a test
// that carried its own copy of the table would be the stale-copy defect this
// repository has now recorded seven times.
// ============================================================================

import { describe, expect, it } from 'vitest';

import {
  GROUND_ROLES,
  INK_ROLES,
  PALETTE,
  PALETTE_ROLES,
  type PaletteRole,
} from '@/theme/palette';

/** WCAG 2.1's floor for normal-size text. The reason área 13 happened. */
const AA_NORMAL_TEXT = 4.5;

/**
 * WCAG 2.1 relative luminance. Written out rather than pulled from a package:
 * it is nine lines, it has no runtime cost, and a dependency that renders
 * nothing is a dependency the pilot's bundle carries for one test file.
 */
function luminance(hex: string): number {
  const channel = (pair: string): number => {
    const v = parseInt(pair, 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const h = hex.slice(1);
  return (
    0.2126 * channel(h.slice(0, 2)) +
    0.7152 * channel(h.slice(2, 4)) +
    0.0722 * channel(h.slice(4, 6))
  );
}

/** Contrast ratio, which is SYMMETRIC — white-on-green is green-on-white. */
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe('área 13 — the palette is a table with eleven complete rows', () => {
  it('has roles to iterate, so every loop below is not vacuous', () => {
    // ⚠️ RULE 4. Empty arrays make every `for` below pass having asserted
    // nothing — the shape of misleading green this repository keeps hitting.
    expect(PALETTE_ROLES).toHaveLength(11);
    expect(INK_ROLES.length, 'no inks to check').toBeGreaterThan(3);
    expect(GROUND_ROLES.length, 'no grounds to check').toBeGreaterThan(3);
  });

  it('names exactly the roles the table defines, in both directions', () => {
    // A role added to the interface and forgotten in `PALETTE_ROLES` is a role
    // no loop here ever looks at — which is how an unmeasured colour ships.
    const defined = Object.keys(PALETTE).sort();
    expect([...PALETTE_ROLES].sort()).toEqual(defined);
  });

  it('gives every role a six-digit hex, because luminance parses one', () => {
    for (const role of PALETTE_ROLES) {
      expect(PALETTE[role], `${role} is not #RRGGBB`).toMatch(/^#[0-9A-F]{6}$/);
    }
  });

  it('gives every role its own value — eleven roles, eleven colours', () => {
    // Two roles sharing a value is one role wearing two hats, and the second
    // hat is the one nobody remembers to change.
    const values = PALETTE_ROLES.map((r) => PALETTE[r]);
    expect(new Set(values).size, 'two roles share a hex').toBe(values.length);
  });
});

describe('área 13 — every word is legible on every ground it can land on', () => {
  it('clears WCAG AA for normal text, ink by ground', () => {
    // ⚠️ THE MATRIX, NOT A SPOT CHECK. The pairing that failed on the canvas
    // was `atencion` on `atencionSuave` — amber words on the amber row, the
    // one combination the role exists for. A spot check of "text on white"
    // would have been green and would have shipped it.
    const failures: string[] = [];
    for (const ink of INK_ROLES) {
      for (const ground of GROUND_ROLES) {
        const ratio = contrast(PALETTE[ink], PALETTE[ground]);
        if (ratio < AA_NORMAL_TEXT) {
          failures.push(`${ink} on ${ground} is ${ratio.toFixed(2)}:1`);
        }
      }
    }
    expect(failures, 'below 4.5:1 — the pilot cannot read these').toEqual([]);
  });

  it('covers the filled action too, by the symmetry of the ratio', () => {
    // A `cobrar` button is `superficie` text on an `accion` fill. That pair is
    // already in the matrix above with the roles the other way round, and
    // contrast does not care which is which — asserted here so the next person
    // does not add a second, redundant loop for "text on a coloured button".
    expect(contrast(PALETTE.superficie, PALETTE.accion)).toBe(
      contrast(PALETTE.accion, PALETTE.superficie),
    );
    expect(contrast(PALETTE.superficie, PALETTE.accion)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
    expect(contrast(PALETTE.superficie, PALETTE.error)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  });

  it('does NOT separate the three state colours by brightness, which is the point', () => {
    // ⚠️⚠️ THIS ASSERTS A WEAKNESS, DELIBERATELY, AND IT IS THE MOST USEFUL
    // LINE IN THIS FILE. `accion` (green) and `atencion` (amber) are 1.18:1
    // apart in LUMINANCE — for a shopkeeper with red-green colour vision
    // deficiency, which is roughly one man in twelve, they are two greys of
    // the same brightness. Green-acts / amber-warns is carried ENTIRELY by
    // hue, and hue is the channel that population does not have.
    //
    // This is the measured basis for the rule the whole palette is written
    // under: NO STATE IS EVER ANNOUNCED BY COLOUR ALONE — always colour and a
    // word, or colour and a border. §2.11 bans the rendering suite that would
    // catch a screen breaking that rule, so this is as close as a machine gets
    // to it: the number that says why the rule exists, pinned so that nobody
    // later "fixes" the palette into a false sense of safety and quietly drops
    // the word.
    //
    // ⚠️ IT IS NOT A DEFECT TO REPAIR BY DARKENING ONE OF THEM. Both already
    // clear 4.5:1 on every ground (above), which is what legibility requires;
    // pulling them apart in brightness would cost that, and would still leave
    // a monochrome viewer guessing. The word is the fix, and the word is free.
    const byBrightness = contrast(PALETTE.accion, PALETTE.atencion);
    expect(byBrightness, 'accion vs atencion, by luminance alone').toBeLessThan(1.6);
  });
});
