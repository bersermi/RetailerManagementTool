// ============================================================================
// THE PHONE'S OWN *REDUCE MOTION*, READ ONCE AND FOLLOWED.
//
// Inicio's figures roll and its streak blooms; `8g`'s tutorial moves a finger
// over the Vender screen. Each stands still when the person has asked her phone
// for less motion, and the switch is followed live: turning it on in Settings
// while Wera is open stops the next animation, not the next launch.
//
// ⚠️ IT STARTS `false` AND LEARNS: the first frame may move before the answer
// arrives, which is why every caller starts its animation in an effect that
// re-runs when this flips, never once on mount.
//
// ⚠️ `11.9`: AND IT PLAYS THE COUNTER'S MOTIONS — `recorrer` runs one of
// `@/theme/mostrador`'s keyframed motions (*El sello cae*, *Sale el recibo*) on
// React Native's `Animated`, leg by leg on each leg's curve, on the native
// driver, as every motion in Wera already runs.
// ============================================================================

import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing } from 'react-native';

import { tramosDe, type Movimiento } from '@/theme/mostrador';

/** `true` while the phone asks for reduced motion. */
export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let live = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((on) => {
      if (live) setReduce(on);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => {
      live = false;
      sub.remove();
    };
  }, []);
  return reduce;
}

/**
 * A motion as `valor` running 0 → 1 — the caller interpolates each property over
 * `puntosDe(m)` — after `retraso` ms. Started by the caller, from an effect.
 */
export function recorrer(valor: Animated.Value, m: Movimiento, retraso = 0): Animated.CompositeAnimation {
  const tramos = tramosDe(m).map((t) =>
    Animated.timing(valor, {
      toValue: t.hasta,
      duration: t.duracion,
      easing: Easing.bezier(t.curva[0], t.curva[1], t.curva[2], t.curva[3]),
      useNativeDriver: true,
    }),
  );
  const espera = m.retraso + retraso;
  return Animated.sequence(espera > 0 ? [Animated.delay(espera), ...tramos] : tramos);
}
