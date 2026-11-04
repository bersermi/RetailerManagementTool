// ============================================================================
// THE NINE TRADES' DRAWINGS, AS THE BUNDLE CARRIES THEM. Plan task `10.5-ii` —
// proposal B's defaults: a page with no cover, and a dish with no photo, wear her
// trade's drawing on her colour.
//
// ⚠️ PNGs, NOT SVGs: no app here has `react-native-svg`, and adding it is a native
// change that waits for the major update. White on nothing, 512 px square, drawn
// by `store/cocina-itacate/render.sh` from `brand/giros.svg` — never by hand.
// `test/pagina.test.ts` holds every drawing in `DIBUJOS` to a file here and a line
// below. ⚠️ They are JavaScript assets: they ride an update and move no runtime
// (measured on both platforms when they were added).
// ============================================================================

import type { ImageSourcePropType } from 'react-native';

import type { Dibujo } from '@/api/pagina';

export const DIBUJO: Readonly<Record<Dibujo, ImageSourcePropType>> = {
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
