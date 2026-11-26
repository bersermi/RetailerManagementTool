// ============================================================================
// EVERY COLOUR ITACATE DRAWS, AND THE SIZES IT DRAWS THEM AT. Plan task
// `10.5-iii-a`, its first real screens; `10.5-v-b`, its look.
//
// ⚠️ WERA'S OWN VALUES (`app/src/theme/palette.ts` and the `normal` row of
// `app/src/theme/density.ts`), the subset these screens use — the same subset
// Wera Cocina copied (`cocina/src/theme/palette.ts`): one brand across the three
// apps, so a value changed there is changed here.
//
// ⚠️⚠️ ONE ROLE IS ITACATE'S OWN SINCE `10.5-v-b`: `accion` IS ITACATE'S BLUE, the
// owner's ruling of 2026-11-05 (the family-shell page: *"Itacate in its own blue"*),
// where Wera and Wera Cocina draw their green. It is the ground of Itacate's Android
// icon (`app.json`'s adaptive icon), and `test/pestanas.test.ts` holds the two to one
// value. `accionSuave` is the page's tint of it — the active tab's pill, a chosen row.
// In Itacate the kitchens bring the colour (each one's own, `@/theme/colores`), so its
// chrome stays the counter's grey, ink and this blue (cream until `11.7-i`); `marca`, Wera's terracotta, is the brand's
// line, the *Sorpresa* tag and since `10.9g-iii` a promotion's mark and band — never an action.
//
// ⚠️⚠️ SINCE `11.7-i` THE VALUES ARE DIRECTION A · *MOSTRADOR*'S — the counter's
// grey (`fondo`) with white sheets (`superficie`) and dark ink, as Wera wears it
// since `11.6` (the owner's yes on this app's real screens, 2026-11-26, at
// `11.5-ii`). Each role keeps its one job and this app keeps its own action colour;
// the header sits on the counter, so `banda` is `fondo`'s grey. The values are
// `brand/mostrador/paleta.json`'s `itacate` block, measured there by
// `contraste.mjs` and held to it here — role by role, every ink on every ground at
// 4.5:1 or more — by `test/palette.test.ts`. B's cream (`#FFFCF6`) stays only in the
// native launch screen (`app.json`), which `11.11` changes with Wera's.
// ============================================================================

export const PALETTE = {
  fondo: '#E9E8E3',
  superficie: '#FFFFFF',
  banda: '#E9E8E3',
  tinta: '#1D2230',
  tintaApagada: '#555A66',
  linea: '#D9D6CE',
  accion: '#24476B',
  accionSuave: '#E3EAF2',
  error: '#A32218',
  marca: '#9A4A1A',
  /**
   * ⚠️ `10.9g-iii`: A PROMOTION'S BAND — the terracotta's tint, Wera Cocina's value (`cocina/src/theme/palette.ts`),
   * so the band a fonda was shown is the one her neighbour sees (`@/ui/BandaPromocion`, a copy of hers).
   */
  marcaSuave: '#F7E7DC',
  /**
   * ⚠️ `10.5b-iii-b`: A KITCHEN'S STARS, the family-shell page's amber (`.stars button.on`), and
   * a star not given (`.stars button`). Itacate's, and Wera Cocina's for its copies of the pages.
   */
  estrella: '#D99A1E',
  estrellaApagada: '#C4C2BA',
} as const;

/**
 * Wera's `normal` density, fixed — and held to it, key for key, by `test/palette.test.ts`. ⚠️ Since `11.7-i`
 * with a title's line, a heading's size and line, and the big number's size and line (Wera's since `11.6`), which
 * `@/theme/letra`'s three styles read.
 */
export const SIZE = {
  rowGap: 8,
  space: 12,
  tapTarget: 48,
  bodySize: 16,
  smallSize: 13.6,
  titleSize: 22,
  titleLine: 26,
  headingSize: 16,
  headingLine: 20,
  numeroSize: 34,
  numeroLine: 38,
  iconSize: 24,
} as const;
