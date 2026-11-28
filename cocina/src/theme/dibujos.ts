// ============================================================================
// THE DRAWINGS, AS THE BUNDLE CARRIES THEM. Plan task `10.5-ii` — proposal B's
// defaults: a page with no cover, and a dish with no photo, wear her trade's
// drawing on her colour. ⚠️ `11.10-ii`: since then, `brand/dibujos/`'s drawings in
// the icons' line (row `11.4`, his call 13, ruled as drawn on 2026-11-26) — the
// nine trades, drawn ONCE in white (`@/ui/Dibujo`), and the drawings of her three
// screens with nothing yet (`@/ui/Dibujo`'s `DibujoVacio`): *Tus ofertas*, *Tus
// calificaciones*, *Apartados*.
//
// ⚠️ PNGs, NOT SVGs: no app here has `react-native-svg`, and adding it is a native
// change that waits for the major update. Black on nothing, at 1×, 2× and 3×,
// TINTED BY THE SCREEN (`tintColor`) — `brand/dibujos/png/`'s files byte for byte,
// drawn there by `brand/render-dibujos.sh`, never by hand; `test/dibujos.test.ts`
// holds every one to its source and every name below to a file. ⚠️ They are
// JavaScript assets: they ride an update and move no runtime.
// ⚠️ THE OLD FLAT DRAWINGS (`brand/giros.svg`) LEFT THIS APP: only Itacate's map
// pins still draw them (`itacate/src/marca/giros/`).
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
  pizarron: require('@/marca/dibujos/pizarron.png') as ImageSourcePropType,
  estrellas: require('@/marca/dibujos/estrellas.png') as ImageSourcePropType,
  boleto: require('@/marca/dibujos/boleto.png') as ImageSourcePropType,
} as const;
export type Vacio = keyof typeof VACIO;
