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
// chrome stays cream, ink and this blue; `marca`, Wera's terracotta, is the brand's
// line and the *Sorpresa* tag — never an action.
// ============================================================================

export const PALETTE = {
  fondo: '#FFFCF6',
  superficie: '#FFFFFF',
  banda: '#FBF0DE',
  tinta: '#201D16',
  tintaApagada: '#6F675A',
  linea: '#E7E0D2',
  accion: '#24476B',
  accionSuave: '#E3EAF2',
  error: '#A32218',
  marca: '#A9501C',
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
