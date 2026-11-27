// ============================================================================
// THE SIZES' TYPE — `11.7-i`. `@/theme/letra` is Wera's file code for code, and
// Wera's reads its sizes off a `DensityScale` (`app/src/theme/density.ts`, its two
// modes, *Normal* and *Letra grande*). This app has ONE scale, `@/theme/palette`'s
// `SIZE` — Wera's `normal` row, fixed, and held to it by `test/palette.test.ts` —
// so the type is that table's. Nothing else lives here: no second mode, which
// would be a decision for the row that gives her a *Letra grande*.
// ============================================================================

import type { SIZE } from '@/theme/palette';

/** The one scale this app draws at: `SIZE`. */
export type DensityScale = typeof SIZE;

// ============================================================================
// A CORNER PER ROLE — `11.7-ii`, WERA'S BLOCK CODE FOR CODE (`app/src/theme/
// density.ts`'s `ESQUINA`, `11.6`; the design system's *Esquinas*):
// a sheet, a button, a field and a chip at 3 — paper, barely rounded; a tag's
// square end 2; a ticket 0 (its notches are `11.8`'s); a mark too small to be
// paper (a bar, a handle, a square in a grid) 1. No pills anywhere. A circle stays
// a circle — a stamp, a kitchen's initials, a dot, a disc — half its own side.
// `test/esquinas.test.ts` holds this block to Wera's and every corner to a role.
// ============================================================================
export const ESQUINA = {
  /** A sheet: a list, a card, a bottom sheet's top corners, a band of colour. */
  hoja: 3,
  /** A button, filled or not, and a door. */
  boton: 3,
  /** A field she types in, and the search box. */
  campo: 3,
  /** A chip she picks from a short set, and a badge. No pills. */
  chip: 3,
  /** A price tag's square end (its point is `11.9`'s). */
  etiqueta: 2,
  /** A ticket — a sale, a code handed over: square, its notches `11.9`'s. */
  boleto: 0,
  /** A mark too small to be paper: a bar, a column, a square in a grid. */
  marca: 1,
} as const;
