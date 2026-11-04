// ============================================================================
// EVERY COLOUR ITACATE DRAWS, AND THE SIZES IT DRAWS THEM AT. Plan task
// `10.5-iii-a`, its first real screens.
//
// ⚠️ WERA'S OWN VALUES (`app/src/theme/palette.ts` and the `normal` row of
// `app/src/theme/density.ts`), the subset these screens use — the same subset
// Wera Cocina copied (`cocina/src/theme/palette.ts`): one brand across the three
// apps, so a value changed there is changed here. `itacate` is this app's own
// ground, the blue of its Android icon (`app.json`), which the skeleton's
// *Muy pronto* has worn since `10.2a`; Itacate's look is a decision for the row
// that gives it one.
// ============================================================================

export const PALETTE = {
  fondo: '#FFFCF6',
  superficie: '#FFFFFF',
  banda: '#FBF0DE',
  tinta: '#201D16',
  tintaApagada: '#6F675A',
  linea: '#E7E0D2',
  accion: '#1C6B4B',
  accionSuave: '#E6F0EA',
  error: '#A32218',
  marca: '#A9501C',
  itacate: '#24476B',
} as const;

/** Wera's `normal` density, fixed. */
export const SIZE = {
  rowGap: 8,
  space: 12,
  tapTarget: 48,
  bodySize: 16,
  smallSize: 13.6,
  titleSize: 22,
  iconSize: 24,
} as const;
