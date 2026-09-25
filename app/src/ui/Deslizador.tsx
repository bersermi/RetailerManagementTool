// ============================================================================
// C3.6's SLIDE — §2.11's `PrimaryAction`, and the only commit gesture in this
// app. Plan task `5g-ii`, and see `src/ui/Buscador.tsx` for why this directory
// exists now.
//
// ⚠️⚠️ IT IS A PRIMITIVE BECAUSE FOUR CONTROLS ARE NOW ONE SET OF RULES ABOUT
// *HOW FAR IS FAR ENOUGH*. Vender draws it twice — on the sticky bar and inside
// the basket sheet — and Comprar draws it twice more. `COMMIT_AT` exists so that
// there is ONE answer to that question; a second copy of this file would be a
// second place for that answer to drift, on the gesture that moves money.
//
// ⚠️ THE ONLY THING THE TWO SCREENS DISAGREE ABOUT IS THE VERB, so the word and
// its screen-reader sentence are PROPS and `src/strings.ts` keeps both (`R4`).
// Everything else — the fill, the tap, the thumb, the driver — is identical on
// both sides of the counter.
//
// ⚠️ WHAT COUNTS AS A COMPLETED GESTURE IS NOT DECIDED HERE: `progressOf`,
// `COMMIT_AT`, `releaseTaps` and `releaseCommits` are `@/cart/commit`'s, where
// `app/test/cart-commit.test.ts` reads them (`R3`). This file holds where the
// thumb IS, which no instrument in this repository can look at (`R9`).
// ============================================================================

import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRef, useState } from 'react';
import { Animated, Easing, PanResponder, Text, View } from 'react-native';

import { releaseCommits, releaseTaps } from '@/cart/commit';
import { useDensity } from '@/theme/DensityProvider';
import { PALETTE } from '@/theme/palette';

/**
 * ⚠️⚠️ C3.6's SLIDE — *"commit is a SLIDE, not a tap. The button becomes a
 * slider and the gesture commits."* Plan task `5f-iii-b`.
 *
 * ⚠️⚠️ THE TRACK FILLS BEHIND THE THUMB, RULED BY THE OWNER 2026-09-24 —
 * *"make the slider fill along with the finger swipe."* It is what turns a knob
 * that moves into a gesture with a state: at any moment the amount of green is
 * how much of the sale has been agreed to.
 *
 * ⚠️⚠️ AND THE FILL IS A `translateX`, NOT A WIDTH — §2.11's motion rule
 * honoured rather than bent. A fill animated by growing its `width` is a LAYOUT
 * change every frame, on the phone C1.1 puts two low-end Androids among; a
 * full-width block slid in from the left under `overflow: 'hidden'` is a
 * transform, and transforms composite. **The visible result is identical and
 * the frame cost is not.**
 *
 * ⚠️ THE DRIVER IS THE JS ONE DURING THE DRAG, AND THAT IS NAMED RATHER THAN
 * HIDDEN. A value the native driver owns cannot be `setValue`d from JS, and a
 * `PanResponder` gesture has no native event to map — so the drag is JS-driven
 * and only the release animations use `useNativeDriver`. §2.11's rule is about
 * which PROPERTIES are animated, and both paths animate `transform` only.
 *
 * ⚠️ IT IS NOT DRAWN WHEN THE BASKET CANNOT BE COMMITTED — see `canCommit`. A
 * slide a thumb can complete over a sale that would be refused is worse than no
 * slide at all, and every refusal is a programming error that may never reach a
 * person (`R4`).
 *
 * ⚠️ BUILT ON `PanResponder` AND `Animated`, WHICH IS CORE REACT NATIVE. The
 * measurement that decided it: `react-native-gesture-handler` and
 * `react-native-reanimated` are installed as transitive dependencies and are
 * imported by NOTHING in `src/` — adding them means a babel plugin, a root view
 * and a native surface this app has never exercised, **on a build no CI
 * compiles.** Core RN costs a JS-driven drag and no new wiring.
 */
export function Deslizador({
  word,
  label,
  compact = false,
  onCommit,
  onOpen,
}: {
  /** The verb on the track — the one thing the two counters disagree about. */
  word: string;
  /** The whole control, to a screen reader. It names BOTH gestures (C12.1). */
  label: string;
  compact?: boolean;
  onCommit: () => void;
  /** A TAP opens the basket — ruled 2026-09-24. See the header. */
  onOpen: () => void;
}) {
  const { scale } = useDensity();
  const height = scale.tapTarget;
  const [track, setTrack] = useState(0);
  const travel = Math.max(0, track - height);

  const x = useRef(new Animated.Value(0)).current;
  // ⚠️ THE GESTURE READS REFS AND NOT STATE. `PanResponder` is built once, so a
  // handler closing over `travel` would hold the width measured on the first
  // frame — zero — for the life of the control.
  const span = useRef(0);
  span.current = travel;
  const done = useRef(false);

  const settle = (to: number) => {
    Animated.timing(x, {
      toValue: to,
      duration: 160,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  };

  const pan = useRef(
    PanResponder.create({
      // ⚠️⚠️ IT CLAIMS THE TOUCH, AND THE TAP IS READ ON RELEASE — which is the
      // SECOND design of this. The first wrapped the track in a `Pressable` and
      // spread `panHandlers` onto it; `Pressable` installs its OWN responder
      // handlers on the underlying view, so the two fight over one touch and
      // which wins is not something this file gets to decide.
      // ⚠️ **One responder, two readings, separated by `TAP_SLOP`** — nothing
      // sits behind this control, so claiming the touch costs nothing.
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_e, g) => {
        if (done.current) return;
        x.setValue(Math.min(Math.max(0, g.dx), span.current));
      },
      onPanResponderRelease: (_e, g) => {
        if (done.current) return;
        // ⚠️ A TOUCH THAT NEVER MOVED IS A TAP, AND IT OPENS THE BASKET.
        if (releaseTaps(g.dx)) {
          settle(0);
          onOpen();
          return;
        }
        const at = Math.min(Math.max(0, g.dx), span.current);
        if (releaseCommits(at, span.current)) {
          done.current = true;
          settle(span.current);
          // ⚠️ THE SALE IS COMMITTED WHEN THE GESTURE COMPLETES, not when the
          // animation acknowledging it ends — the thumb has already said so.
          onCommit();
        } else {
          settle(0);
        }
      },
      onPanResponderTerminate: () => settle(0),
    }),
  ).current;

  // ⚠️⚠️ A TAP OPENS THE BASKET — *"Let's make the carrito able to open by
  // tapping the slider as well"* (2026-09-24). ⚠️ **It costs the gesture
  // nothing**, and the reason is in `onMoveShouldSetPanResponder` above: the
  // pan claims the touch only once the finger has moved 4 pt, so a press that
  // never moves is still a press and a drag still cancels it.
  // ⚠️ **It is also what made a bare verb honest as the legend** — see the
  // slide's own strings, which each screen supplies.

  const fill = Animated.subtract(x, travel);

  return (
    <View
      accessibilityRole="button"
      accessibilityLabel={label}
      onLayout={(e) => setTrack(e.nativeEvent.layout.width)}
      style={{
        height,
        borderRadius: height / 2,
        borderWidth: 1,
        borderColor: PALETTE.accion,
        backgroundColor: PALETTE.accionSuave,
        overflow: 'hidden',
        justifyContent: 'center',
      }}
      {...pan.panHandlers}
    >
      {/* The fill — a full-width block slid in from the left. See the header. */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: track,
          backgroundColor: PALETTE.accion,
          transform: [{ translateX: fill }],
        }}
      />

      {/* ⚠️ THE WORD FADES AS THE FILL ARRIVES — `opacity`, so it composites,
          and it is what stops green ink sitting on a green fill.
          ⚠️⚠️ IT IS ABSOLUTELY POSITIONED AND THE FIRST WRITING WAS NOT, which
          clipped it above the track on the simulator: a plain child of the track
          is a FLEX SIBLING of the thumb, so the two stacked in a column instead
          of overlaying. ⚠️ The horizontal padding is a whole `tapTarget` on each
          side so the words never sit under the thumb at either end. */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: height,
          opacity:
            travel === 0 ? 1 : x.interpolate({ inputRange: [0, travel], outputRange: [1, 0] }),
        }}
      >
        <Text
          numberOfLines={1}
          style={{
            textAlign: 'center',
            fontSize: compact ? scale.bodySize * 0.9 : scale.bodySize,
            fontWeight: '700',
            color: PALETTE.accion,
          }}
        >
          {word}
        </Text>
      </Animated.View>

      <Animated.View
        style={{
          width: height,
          height,
          borderRadius: height / 2,
          backgroundColor: PALETTE.accion,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ translateX: x }],
        }}
      >
        <MaterialCommunityIcons
          name="chevron-double-right"
          size={scale.iconSize}
          color={PALETTE.superficie}
        />
      </Animated.View>
    </View>
  );
}