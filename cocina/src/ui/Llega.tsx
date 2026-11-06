import { useEffect, type ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { LLEGADA, retrasoDe } from '@/theme/movimiento';

// ============================================================================
// *ARRIVE* — ONE BLOCK OF A SCREEN'S STAGGERED ENTRANCE. Plan task `10.5-v-c-i`,
// Itacate's part (`itacate/src/ui/Llega.tsx`, `10.5-v-b`) copied, the owner's ruling
// of 2026-11-05 (the family-shell page's *Motion*): on a screen's
// first frame its blocks fade in and rise 8 px, 40 ms apart — one orchestrated
// reveal per screen (ADR-035 §2.11), never a movement on every change.
//
// ⚠️ IT RUNS ONCE, WHEN THE BLOCK MOUNTS, AND NEVER AGAIN: a tab stays mounted when
// she leaves it, so coming back is not an arrival; a list that re-sorts keeps its
// cards (keyed), so a new order moves nothing. ⚠️ STARTED FROM AN EFFECT, NOT A
// HANDLER — a value animated before its view is mounted is dropped in silence (Wera's
// lesson, `app/src/ui/Destello.tsx`). ⚠️ `ReduceMotion.System`: a phone set to reduce
// motion shows every block at once. The numbers are `@/theme/movimiento`'s, pinned by
// `test/pestanas.test.ts`, which also refuses any animated key but `opacity` and
// `transform`. NO CHECK CAN SEE A FRAME MOVE (§2.11): the phone is the instrument.
// ============================================================================

export function Llega({ i, children, style }: { i: number; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const retraso = retrasoDe(i);
  const llegada = useSharedValue(retraso === null ? 1 : 0);

  useEffect(() => {
    if (retraso === null) return;
    llegada.value = withDelay(
      retraso,
      withTiming(1, { duration: LLEGADA.duracion, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System }),
      ReduceMotion.System,
    );
    // Once, on the block's first frame: a later position is not a second arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const estilo = useAnimatedStyle(() => ({
    opacity: llegada.value,
    transform: [{ translateY: (1 - llegada.value) * LLEGADA.distancia }],
  }));

  return <Animated.View style={[style, estilo]}>{children}</Animated.View>;
}
