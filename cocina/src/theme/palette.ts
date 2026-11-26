// ============================================================================
// EVERY COLOUR WERA COCINA DRAWS, AND THE SIZES IT DRAWS THEM AT. Plan task
// `10.4b-iii-a`, its first real screens.
//
// ⚠️ WERA'S OWN VALUES (`app/src/theme/palette.ts` and the `normal` row of
// `app/src/theme/density.ts`), the subset these screens use: one brand across
// the three apps, so a value changed there is changed here. Wera's `elder` size
// (C3.18, a shopkeeper's choice in Ajustes) is not here — Cocina has no Ajustes
// yet, and a second size is a decision for the row that gives her one.
//
// ⚠️⚠️ SINCE `11.7-i` THE VALUES ARE DIRECTION A · *MOSTRADOR*'S — the counter's
// grey (`fondo`) with white sheets (`superficie`) and dark ink, as Wera wears it
// since `11.6` (the owner's yes on this app's real screens, 2026-11-26, at
// `11.5-ii`). Each role keeps its one job and this app keeps its own action colour;
// the header sits on the counter, so `banda` is `fondo`'s grey. The values are
// `brand/mostrador/paleta.json`'s `cocina` block, measured there by
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
  accion: '#1C6B4B',
  accionSuave: '#E6F0EA',
  error: '#A32218',
  marca: '#9A4A1A',
  /**
   * ⚠️ `10.5b-iii-b`: A KITCHEN'S STARS, the family-shell page's amber (`.stars button.on`), and
   * a star not given (`.stars button`). Itacate's, and Wera Cocina's for its copies of the pages.
   */
  estrella: '#D99A1E',
  estrellaApagada: '#C4C2BA',
  /**
   * ⚠️ `10.5-v-c-i`, THIS APP'S OWN, NOT WERA'S: *Hoy*'s day card is the action's green
   * (the family-shell page's green card), so its words are light on it — white for what
   * matters, a pale green for the rest — and its time bar runs on a lighter green. The
   * toast is the ink, with *Deshacer* in the same pale green.
   */
  /**
   * ⚠️ `10.5b-iv-a`, THIS APP'S OWN: an order's marks, the final design's table of states (the page
   * *Names, Records and Stars*, version 5, `.st-*`): rust on its tint for what waits for her thumb,
   * the error's red on its tint for a kitchen's cancel. Green is the action's, grey the line's.
   */
  marcaSuave: '#F7E7DC',
  errorSuave: '#F7DEDA',
  sobreAccion: '#FFFFFF',
  sobreAccionApagada: '#CDE3D6',
  barraSobreAccion: '#3E8766',
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
