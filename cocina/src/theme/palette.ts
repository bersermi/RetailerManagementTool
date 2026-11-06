// ============================================================================
// EVERY COLOUR WERA COCINA DRAWS, AND THE SIZES IT DRAWS THEM AT. Plan task
// `10.4b-iii-a`, its first real screens.
//
// ⚠️ WERA'S OWN VALUES (`app/src/theme/palette.ts` and the `normal` row of
// `app/src/theme/density.ts`), the subset these screens use: one brand across
// the three apps, so a value changed there is changed here. Wera's `elder` size
// (C3.18, a shopkeeper's choice in Ajustes) is not here — Cocina has no Ajustes
// yet, and a second size is a decision for the row that gives her one.
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
  /**
   * ⚠️ `10.5-v-c-i`, THIS APP'S OWN, NOT WERA'S: *Hoy*'s day card is the action's green
   * (the family-shell page's green card), so its words are light on it — white for what
   * matters, a pale green for the rest — and its time bar runs on a lighter green. The
   * toast is the ink, with *Deshacer* in the same pale green.
   */
  sobreAccion: '#FFFFFF',
  sobreAccionApagada: '#CDE3D6',
  barraSobreAccion: '#3E8766',
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
