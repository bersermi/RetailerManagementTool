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
