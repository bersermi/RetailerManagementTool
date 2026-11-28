// ============================================================================
// THE MAP'S PINS — HER TRADE'S OLD FLAT DRAWING, WHITE ON HER COLOUR. Plan task
// `10.5-iv-a-i`; kept apart from `@/theme/dibujos` by `11.10-ii`, as row `11.4`
// ruled (his call 13, 2026-11-26): *"the map's pins keep today's solid drawings"* —
// at 20 points a line is a smudge.
//
// ⚠️ White on nothing, 512 px square, drawn by `bash store/cocina-itacate/render.sh
// giros` from `brand/giros.svg` into `src/marca/giros/` — never by hand. Until
// `11.10-ii` they were Wera Cocina's files copied here; she draws no pin, so they
// live in this app alone, and `test/dibujos.test.ts` holds each to its symbol.
// ============================================================================

import type { ImageSourcePropType } from 'react-native';

import type { Dibujo } from '@/api/pagina';

export const PIN: Readonly<Record<Dibujo, ImageSourcePropType>> = {
  cazuela: require('@/marca/giros/cazuela.png') as ImageSourcePropType,
  plato: require('@/marca/giros/plato.png') as ImageSourcePropType,
  taza: require('@/marca/giros/taza.png') as ImageSourcePropType,
  concha: require('@/marca/giros/concha.png') as ImageSourcePropType,
  bolsa: require('@/marca/giros/bolsa.png') as ImageSourcePropType,
  pollo: require('@/marca/giros/pollo.png') as ImageSourcePropType,
  taco: require('@/marca/giros/taco.png') as ImageSourcePropType,
  elote: require('@/marca/giros/elote.png') as ImageSourcePropType,
  pescado: require('@/marca/giros/pescado.png') as ImageSourcePropType,
};
