// ============================================================================
// THE VEIL — `PALETTE.velo` over the whole screen, behind a sheet or a
// question. Plan task `8f`, and `R14`: `CONVENTIONS.md` counted it at seven
// drawings in three files at `5h.5`; there were THIRTEEN in six by `8f`.
//
// ⚠️⚠️ ONE DRIFT, SETTLED ON THE OWNER'S RULING OF 2026-09-30 (`R16`): six of
// the thirteen appeared at once (the confirmation boxes in `documentos`,
// `producto/[id]`, `proveedor/[id]` and the three *¿Vaciar?* questions) and the
// rest arrived with their `Modal`. **It always fades in now**, over
// `VEIL_FADE_MS`. The opacity, `VEIL_OPACITY`, was never in dispute.
//
// ⚠️ `onPress` IS A DECIDED DIFFERENCE, NOT DRIFT: a sheet closes when the
// shopkeeper taps outside it (ruled for the carrito, 2026-09-24), and a question
// does not, because a thumb reaching past it would answer it by accident.
//
// ⚠️ A SEPARATE VIEW UNDER AN `opacity` RATHER THAN A TRANSLUCENT FILL ON THE
// CONTAINER: `opacity` on a parent dims its children, so painting it on the
// wrapper would put the sheet itself behind the dimming.
//
// ⚠️ THE ANIMATION STARTS IN AN EFFECT, on the mounted view — a native-driver
// animation started before its view exists fails silently.
//
// ⚠️ WHAT NO CHECK CAN SEE (`R9`): the fade itself. And inside a `slide` Modal
// (the carrito, Comprar's and Desperdicio's sheets) the veil still rises with
// the sheet, because the Modal moves everything it holds — `8f` left that for
// the owner's screen-by-screen review.
// ============================================================================

import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';

import { PALETTE } from '@/theme/palette';
import { VEIL_FADE_MS, VEIL_OPACITY } from '@/theme/pulse';

export function Velo({ onPress, label }: { onPress?: () => void; label?: string }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const run = Animated.timing(opacity, {
      toValue: VEIL_OPACITY,
      duration: VEIL_FADE_MS,
      useNativeDriver: true,
    });
    run.start();
    return () => run.stop();
  }, [opacity]);

  const veil = (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { opacity, backgroundColor: PALETTE.velo }]}
    />
  );
  if (onPress === undefined) return veil;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={StyleSheet.absoluteFill}
    >
      {veil}
    </Pressable>
  );
}
