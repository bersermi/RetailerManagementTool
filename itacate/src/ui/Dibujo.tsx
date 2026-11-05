import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import type { ColorCode, Dibujo as Nombre } from '@/api/pagina';
import { HUES } from '@/theme/colores';
import { DIBUJO } from '@/theme/dibujos';

// ============================================================================
// HER TRADE'S DRAWING ON HER COLOUR — what a dish with no photo shows. Plan task
// `10.5-iv-a-i`, proposal B's defaults (the owner's ruling of 2026-11-01): a
// neighbour sees the slot Wera Cocina filled for her, so a card nobody gave a photo
// still looks finished.
//
// ⚠️ WERA COCINA'S `Dibujo`, COPIED (`cocina/src/ui/Dibujo.tsx`, plan `10.5-ii`, whose
// header has the measurements): its two ways — `portada`, her colour with the
// drawing faint across it and once large at the right, the card's picture here;
// `cuadro`, the drawing in the middle. `test/gemelos.test.ts` holds the code below
// this header to Wera Cocina's file, word for word.
//
// ⚠️ IT FILLS ITS FRAME, which must clip; the frame decides the shape. Hidden from
// the screen reader: it is decoration.
// ============================================================================

/** Where the faint drawings sit across a cover, as fractions of its width and height. */
const PATRON: readonly (readonly [number, number])[] = Array.from({ length: 4 }, (_, row) =>
  Array.from({ length: 7 }, (_, col) => [col * 0.15 + (row % 2 === 0 ? 0.02 : 0.095), row * 0.26 + 0.04] as const),
).flat();

export function Dibujo({ dibujo, color, modo }: { dibujo: Nombre; color: ColorCode; modo: 'portada' | 'cuadro' }) {
  const source = DIBUJO[dibujo];
  if (modo === 'cuadro') {
    return (
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[StyleSheet.absoluteFill, { backgroundColor: HUES[color], alignItems: 'center', justifyContent: 'center' }]}
      >
        <Image source={source} resizeMode="contain" style={{ width: '64%', height: '64%' }} />
      </View>
    );
  }
  return <Portada source={source} color={color} />;
}

function Portada({ source, color }: { source: (typeof DIBUJO)[Nombre]; color: ColorCode }) {
  const [size, setSize] = useState<{ readonly w: number; readonly h: number } | null>(null);
  const small = size === null ? 0 : Math.round(size.w * 0.09);
  const large = size === null ? 0 : Math.round(size.h * 0.8);
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      onLayout={(event) => setSize({ w: event.nativeEvent.layout.width, h: event.nativeEvent.layout.height })}
      style={[StyleSheet.absoluteFill, { backgroundColor: HUES[color], overflow: 'hidden' }]}
    >
      {size !== null &&
        PATRON.map(([x, y]) => (
          <Image
            key={`${x}-${y}`}
            source={source}
            resizeMode="contain"
            style={{ position: 'absolute', left: Math.round(x * size.w), top: Math.round(y * size.h), width: small, height: small, opacity: 0.14 }}
          />
        ))}
      {size !== null && (
        <Image
          source={source}
          resizeMode="contain"
          style={{ position: 'absolute', left: Math.round(size.w * 0.95) - large, top: Math.round(size.h * 0.1), width: large, height: large, opacity: 0.95 }}
        />
      )}
    </View>
  );
}
