// ============================================================================
// A SCREEN'S DRAWING WHEN IT HAS NOTHING YET — `11.10-ii`, row `11.4`'s *vacíos*
// (his call 13, ruled as drawn on 2026-11-26): one of `@/marca/vacios`' pictures at
// the density's `dibujoSize` (96, 120 at `Letra grande`), tinted the screen's own
// colour. `@/ui/Vacio` draws it above its sentence; *Lo último*'s week and
// *Solicitudes*' door draw it above their own. ⚠️ The caller decides WHEN — only on
// *nothing yet* (`@/ui/Vacio`'s header). Hidden from the screen reader: the
// sentence says it.
// ============================================================================

import { Image } from 'react-native';

import { VACIOS, type DibujoDeVacio } from '@/marca/vacios';
import { useDensity } from '@/theme/DensityProvider';

/** A screen's drawing when it has nothing yet, tinted `color` — the screen's own. */
export function DibujoVacio({ dibujo, color }: { dibujo: DibujoDeVacio; color: string }) {
  const { scale } = useDensity();
  return (
    <Image
      source={VACIOS[dibujo]}
      accessibilityElementsHidden
      importantForAccessibility="no"
      resizeMode="contain"
      style={{ width: scale.dibujoSize, height: scale.dibujoSize, tintColor: color }}
    />
  );
}
