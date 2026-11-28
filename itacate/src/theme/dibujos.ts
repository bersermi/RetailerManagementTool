// ============================================================================
// THE DRAWINGS, AS THE BUNDLE CARRIES THEM. Plan task `10.5-iv-a-i` — proposal
// B's defaults: a dish with no photo wears her trade's drawing on her colour, as in
// Wera Cocina. ⚠️ `11.10-ii`: since then, `brand/dibujos/`'s drawings in the icons'
// line (row `11.4`, his call 13, ruled as drawn on 2026-11-26) — the nine trades,
// drawn ONCE in white (`@/ui/Dibujo`), the drawings of her three screens with
// nothing yet (`@/ui/Dibujo`'s `DibujoVacio`): *Apartados*, *Cerca*, *Mis
// cocinas*; and the reward won (*¡Ganaste …!*).
//
// ⚠️ `brand/dibujos/png/`'S FILES BYTE FOR BYTE (drawn there by `brand/
// render-dibujos.sh`; `cocina/src/theme/dibujos.ts` is this file's twin for the
// trades): black on nothing at 1×, 2× and 3×, TINTED BY THE SCREEN (`tintColor`).
// `test/dibujos.test.ts` holds every one to its source, and `test/gemelos.test.ts`
// the trades' table to Wera Cocina's. They are JavaScript assets: they ride an
// update and move no runtime.
// ⚠️ THE MAP'S PINS KEEP THE OLD FLAT DRAWINGS — `@/theme/pines`, not this file:
// at 20 points a line is a smudge (row `11.4`).
// ============================================================================

import type { ImageSourcePropType } from 'react-native';

import type { Dibujo } from '@/api/pagina';

export const DIBUJO: Readonly<Record<Dibujo, ImageSourcePropType>> = {
  cazuela: require('@/marca/dibujos/cazuela.png') as ImageSourcePropType,
  plato: require('@/marca/dibujos/plato.png') as ImageSourcePropType,
  taza: require('@/marca/dibujos/taza.png') as ImageSourcePropType,
  concha: require('@/marca/dibujos/concha.png') as ImageSourcePropType,
  bolsa: require('@/marca/dibujos/bolsa.png') as ImageSourcePropType,
  pollo: require('@/marca/dibujos/pollo.png') as ImageSourcePropType,
  taco: require('@/marca/dibujos/taco.png') as ImageSourcePropType,
  elote: require('@/marca/dibujos/elote.png') as ImageSourcePropType,
  pescado: require('@/marca/dibujos/pescado.png') as ImageSourcePropType,
};

/** Her screens with nothing yet, each its drawing (`brand/dibujos/dibujos.json`'s `vacio`s placed in this app). */
export const VACIO = {
  boleto: require('@/marca/dibujos/boleto.png') as ImageSourcePropType,
  mapa: require('@/marca/dibujos/mapa.png') as ImageSourcePropType,
  toldo: require('@/marca/dibujos/toldo.png') as ImageSourcePropType,
} as const;
export type Vacio = keyof typeof VACIO;

/** *¡Ganaste …!*: a gift whose lid is coming off, white on her colour. */
export const PREMIO = require('@/marca/dibujos/premio.png') as ImageSourcePropType;
