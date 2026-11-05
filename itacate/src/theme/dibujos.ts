// ============================================================================
// THE NINE TRADES' DRAWINGS, AS THE BUNDLE CARRIES THEM. Plan task `10.5-iv-a-i`
// — proposal B's defaults: a dish with no photo wears her trade's drawing on her
// colour, as in Wera Cocina.
//
// ⚠️ WERA COCINA'S FILES, COPIED BYTE FOR BYTE (`cocina/src/marca/giros/`, drawn by
// `store/cocina-itacate/render.sh` from `brand/giros.svg`; `cocina/src/theme/
// dibujos.ts` is this file's twin): each app's `@/` is its own `src/`, so the PNGs
// live in both. `test/gemelos.test.ts` holds every one to Wera Cocina's by its
// bytes — ⚠️ a re-drawing there copies here in the same PR, or that test is red.
// They are JavaScript assets: they ride an update and move no runtime (measured
// when Wera Cocina added them, and for this app by `10.5-iv-a-i`).
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
