// ============================================================================
// THE SIX COLOURS A KITCHEN'S PAGE CAN WEAR. Plan task `10.5-ii` — proposal B's
// *Tu color*, the owner's ruling of 2026-11-01.
//
// ⚠️ THE DATABASE KEEPS A CODE, NEVER A HUE (`0076`): the hues are the apps', the
// ones the proposals page drew (https://claude.ai/artifact/EaiMkYqn2skPXn7MiKeULu),
// so a hue can be tuned in an update and every page follows. Itacate draws the
// same six (`10.5-iv`); its copy names this file.
//
// ⚠️ WHITE IS DRAWN ON EVERY ONE — her initials, the trade's drawing, the
// discount — so each holds white text at 4.5 : 1 or better (WCAG AA), which
// `test/pagina.test.ts` measures.
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
