// ============================================================================
// THE SIX COLOURS A KITCHEN'S PAGE CAN WEAR. Plan task `10.5-iv-a-i` — proposal
// B's *Tu color*, the owner's ruling of 2026-11-01.
//
// ⚠️ WERA COCINA'S HUES, COPIED (`cocina/src/theme/colores.ts`, plan `10.5-ii`,
// whose header says Itacate draws the same six): the database keeps a code, never
// a hue (`0076`), so what a fonda chose in her preview and what a neighbour sees
// here are one colour only while both apps hold one table. `test/gemelos.test.ts`
// compares it with Wera Cocina's file, which measures white on each at 4.5 : 1 or
// better — white is drawn on every one: her initials, her trade's drawing, the saving.
// ============================================================================

import type { ColorCode } from '@/api/pagina';

export const HUES: Readonly<Record<ColorCode, string>> = {
  chile: '#B23A2B',
  mole: '#6E3B26',
  nopal: '#2E6B3A',
  talavera: '#22508F',
  cempasuchil: '#B0530E',
  jamaica: '#8C2457',
};
