import { Image, StyleSheet, View } from 'react-native';

import type { ColorCode, Dibujo as Nombre } from '@/api/pagina';
import { HUES } from '@/theme/colores';
import { DIBUJO, VACIO, type Vacio } from '@/theme/dibujos';
import { PALETTE } from '@/theme/palette';

// ============================================================================
// HER TRADE'S DRAWING ON HER COLOUR — what an empty slot shows. Plan task
// `10.5-ii`, proposal B's defaults (the owner's ruling of 2026-11-01): *"every
// part has a default (a drawing for her trade on her colour, her initials)"*, so
// a page nobody touched still looks finished.
//
// ⚠️ `11.10-ii` — ROW `11.4`'S DRAWINGS, AS HE RULED THEM (call 13, 2026-11-26, *as
// drawn*): her colour and her trade's drawing ONCE, in white, centred, at 60% of
// the frame's height (`portada`: a cover, a dish's card or its page) or 64% of a
// dish row's square (`cuadro`) — in place of the wallpaper it was until then, 28
// faint copies and a large one (`brand/dibujos/README.md`). The drawing is a
// picture in black, tinted white here: one colour, no SVG library in the build.
// Its box is the share of BOTH sides and the picture is fitted into it, so on a
// wide frame its height decides, on a square both.
//
// ⚠️ AND A SCREEN WITH NOTHING YET (`DibujoVacio`): its drawing above its sentence,
// 96 points, in `accion` (`brand/dibujos/dibujos.json`'s `vacio`) — never while it
// loads, without signal or on a failure; the screen decides when.
//
// ⚠️ IT FILLS ITS FRAME, which must clip; the frame decides the shape. Hidden from
// the screen reader: it is decoration, and the slot's label says what it is.
// `itacate/test/gemelos.test.ts` holds the neighbours' copy to the code below.
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
