import { useEffect, useRef, type ReactNode } from 'react';
import { Animated } from 'react-native';

import { pulseSequence } from '@/theme/pulse';

// ============================================================================
// THE BLINK THAT SAYS *THIS ONE IS NEW*, AS MARKUP. Plan task `6b`, extracted
// from `productos.tsx` on the day `proveedores.tsx` became the second screen to
// need it — which is `R14`'s trigger and not a moment sooner.
//
// ⚠️ IT MOVES MARKUP ONLY, which is `Buscador`'s own argument: every decision the
// blink obeys already lives in `@/theme/pulse`, a `.ts` module
// `app/test/pulse.test.ts` reads (`R3`). How many times, how far down, how long and
// that it rests at full opacity are all values a suite can assert; what is here is
// the `Animated` call, which no suite in this repository may load (`R2`).
//
// ⚠️⚠️ AND THE TWO LIFECYCLE FACTS ARE WHY IT IS WORTH A FILE RATHER THAN A COPY.
// A `FlatList` recycles rows, so the value must be RESET before the sequence runs
// or some other row is left dimmed; and a native-driver animation must be started
// from an EFFECT rather than from the handler that mounted the view, or it fails
// silently ([[native-driver-needs-the-view-mounted]]). Both are easy to write
// correctly once and easy to drop when copying.
// ============================================================================

/**
 * The row that was just created, blinking once and then resting.
 *
 * ⚠️⚠️ IT DECIDES NOTHING ABOUT THE BLINK — how many times, how far down, how
 * long, and that it rests at full opacity are all `@/theme/pulse`'s, where
 * `app/test/pulse.test.ts` reads them (`R3`). What is here is the `Animated` call,
 * which no suite in this repository may load, and the two lifecycle facts a
 * screen kept getting wrong.
 *
 * ⚠️ IT IS RESET BEFORE IT RUNS. A row can be recycled by a `FlatList`'s
 * virtualiser mid-blink, and a value left at `PULSE_DIM` would leave some OTHER
 * row looking dimmed for no reason.
 *
 * ⚠️ `useNativeDriver` IS TRUE AND THAT IS §2.11's MOTION RULE, not a tuning
 * knob: opacity on the native driver runs on the compositor, and C1.1 puts two
 * low-end Androids among the pilot's phones. A JS-driven opacity would stutter on
 * exactly those two and on nobody's development machine.
 * ⚠️ AND IT IS STARTED IN AN EFFECT rather than in the handler that mounted the
 * row — [[native-driver-needs-the-view-mounted]]: a native-driver animation
 * started before its view exists fails silently.
 *
 * ⚠️ `R14`: it entered `src/ui/` when `proveedores.tsx` became the second screen
 * to draw it — `productos.tsx` had it inline from `5d-ii`. ⚠️ **`R16`: the only
 * difference between the two drawings was `nuevo === entry.id` versus
 * `nuevo === provider.id`, which is `on`.** There is no second prop, because there
 * was no second difference to turn into one.
 */
export function Destello({ on, children }: { on: boolean; children: ReactNode }) {
  const fade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!on) return;
    fade.setValue(1);
    const blink = Animated.sequence(
      pulseSequence().map((step) => Animated.timing(fade, { ...step, useNativeDriver: true })),
    );
    blink.start();
    return () => {
      blink.stop();
      fade.setValue(1);
    };
  }, [on, fade]);

  return <Animated.View style={{ opacity: fade }}>{children}</Animated.View>;
}
