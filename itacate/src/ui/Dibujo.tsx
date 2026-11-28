import { Image, StyleSheet, View } from 'react-native';

import type { ColorCode, Dibujo as Nombre } from '@/api/pagina';
import { HUES } from '@/theme/colores';
import { DIBUJO, VACIO, type Vacio } from '@/theme/dibujos';
import { PALETTE } from '@/theme/palette';

// ============================================================================
// HER TRADE'S DRAWING ON HER COLOUR — what a dish with no photo shows. Plan task
// `10.5-iv-a-i`, proposal B's defaults (the owner's ruling of 2026-11-01): a
// neighbour sees the slot Wera Cocina filled for her, so a card nobody gave a photo
// still looks finished.
//
// ⚠️ WERA COCINA'S `Dibujo`, COPIED (`cocina/src/ui/Dibujo.tsx`, whose header has
// the rules): since `11.10-ii`, row `11.4`'s drawing ONCE, in white, at 60% of a
// cover's or a card's height (`portada`) or 64% of a dish row's square (`cuadro`);
// and `DibujoVacio`, a screen's drawing when it has nothing yet, 96 points in
// `accion`. `test/gemelos.test.ts` holds the code below this header to Wera
// Cocina's file, word for word. ⚠️ The map's pins are not this: `@/theme/pines`.
//
// ⚠️ IT FILLS ITS FRAME, which must clip; the frame decides the shape. Hidden from
// the screen reader: it is decoration.
// ============================================================================

/** Her trade's drawing, as a share of its frame: a cover's or a card's height, a dish row's square. */
const ALTO = { portada: '60%', cuadro: '64%' } as const;

export function Dibujo({ dibujo, color, modo }: { dibujo: Nombre; color: ColorCode; modo: 'portada' | 'cuadro' }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[StyleSheet.absoluteFill, { backgroundColor: HUES[color], alignItems: 'center', justifyContent: 'center' }]}
    >
      <Image source={DIBUJO[dibujo]} resizeMode="contain" style={{ width: ALTO[modo], height: ALTO[modo], tintColor: PALETTE.superficie }} />
    </View>
  );
}

/** The side of a screen's drawing when it has nothing yet, in points (`brand/dibujos/dibujos.json`'s `vacio`). */
export const LADO_VACIO = 96;

export function DibujoVacio({ dibujo }: { dibujo: Vacio }) {
  return (
    <Image
      source={VACIO[dibujo]}
      accessibilityElementsHidden
      importantForAccessibility="no"
      resizeMode="contain"
      style={{ alignSelf: 'center', width: LADO_VACIO, height: LADO_VACIO, tintColor: PALETTE.accion }}
    />
  );
}
