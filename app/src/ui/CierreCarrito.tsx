// ============================================================================
// THE ROW THAT CLOSES A BASKET — `Vaciar carrito` on the left, the slide on the
// right. Drawn twice per counter: under the sticky bar's summary, and in the
// Carrito's foot. Ruled 2026-09-24: *"Include Vaciar carrito in the closed
// Carrito as well"* — **the two rows are deliberately the same shape**, so the
// thumb that learns one has learned the other.
//
// ⚠️ `R14`: SIX DRAWINGS IN THREE FILES, byte-identical but for the verb, which
// is the screen's (`word`, `label`), and for what stands in the slide's place
// when it cannot be committed — Comprar's banner, nothing elsewhere (`blocked`).
//
// ⚠️ `Vaciar carrito` IS DRAWN EVEN WHEN NOTHING CAN BE COMMITTED: a basket
// that cannot be sent still has to be emptiable, and that is when a shopkeeper
// most wants to.
//
// ⚠️⚠️ THE SLIDE ITSELF LIVES IN THIS FILE SINCE ROUND 4, AND `R14` PUT IT HERE:
// once every counter drew it through this row, this row was its only caller,
// and *a component with one caller belongs in that caller*. It is `Deslizador`,
// moved whole with its own header below — one control, one answer to *how far
// is far enough* (`releaseCommits`).
//
// ⚠️ `onTap` ONLY ON THE BAR: a tap on the track opens the Carrito. In the open
// Carrito there is none — the 2026-09-25 ruling, *"do not close the carrito"* —
// and the `Deslizador` still nudges, so the touch is answered.
// ============================================================================

import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, PanResponder, Pressable, Text, View } from 'react-native';

import { releaseCommits, releaseTaps } from '@/cart/commit';
import { ES } from '@/strings';
import { useDensity } from '@/theme/DensityProvider';
import { PALETTE } from '@/theme/palette';

export function CierreCarrito({
  onEmpty,
  word,
  label,
  onCommit,
  canCommit,
  onTap,
  compact = false,
  blocked = null,
}: {
  onEmpty: () => void;
  word: string;
  label: string;
  onCommit: () => void;
  canCommit: boolean;
  onTap?: () => void;
  /** The Carrito's own, shorter track. */
  compact?: boolean;
  /** What stands where the slide would, when it cannot be committed. */
  blocked?: ReactNode;
}) {
  const { scale } = useDensity();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale.space }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={ES.counter.cart.empty}
        onPress={onEmpty}
        style={{ minHeight: scale.tapTarget, justifyContent: 'center' }}
      >
        <Text style={{ fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.error }}>
          {ES.counter.cart.empty}
        </Text>
      </Pressable>

      {/* ⚠️ `flex: 1` GIVES THE TRACK EVERY POINT `Vaciar carrito` DOES NOT USE —
          the short track by construction, which keeps it honest at `Letra grande`. */}
      {canCommit ? (
        <View style={{ flex: 1 }}>
          <Deslizador compact={compact} word={word} label={label} onCommit={onCommit} onTap={onTap} />
        </View>
      ) : (
        blocked
      )}
    </View>
  );
}

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
function Deslizador({
  word,
  label,
  compact = false,
  onCommit,
  onTap,
}: {
  /** The verb on the track — the one thing the two counters disagree about. */
  word: string;
  /** The whole control, to a screen reader. It names BOTH gestures (C12.1). */
  label: string;
  compact?: boolean;
  onCommit: () => void;
  /**
   * What a TAP does, beyond the nudge — and it is OPTIONAL, which is the whole
   * of the 2026-09-25 ruling.
   *
   * ⚠️⚠️ THE NUDGE IS PLAYED WHETHER OR NOT THIS IS SUPPLIED, and that is the
   * owner's own specification: *"In both cases make a small animation, showing
   * that the slider was touched sliding a bit and bouncing. This same animation
   * happens also when touching the slider while the carrito is closed but in this
   * case it does open the carrito."* So the tap ALWAYS answers, and it opens the
   * basket **only where there is a basket to open** — the bar. ⚠️ Inside the
   * sheet this is `undefined`: it shipped as `onOpen={onClose}` on 2026-09-24,
   * which made a tap CLOSE the review screen, and he refused it.
   */
  onTap?: () => void;
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

  /**
   * ⚠️⚠️ THE TAP'S OWN ANSWER — the owner's specification of 2026-09-25: *"a small
   * animation, showing that the slider was touched sliding a bit and bouncing."*
   *
   * ⚠️ IT IS WHAT MAKES A TAP HONEST ON THE REVIEW SCREEN. Inside the sheet a tap
   * now does nothing to the navigation, so without this the control would be a
   * thing a thumb touches and gets no reply from — which is the same defect as a
   * slide that completes and commits nothing, one step smaller.
   *
   * ⚠️ `translateX` ONLY, AND NO LAYOUT (§2.11): a `timing` out and a `spring`
   * back, both on the same value the drag uses, both `useNativeDriver`. It is the
   * shape `settle` already has, so it adds no driver risk that was not here.
   *
   * ⚠️ THE DISTANCE IS DERIVED FROM THE THUMB AND CLAMPED TO THE TRACK. A third
   * of the thumb reads as *touched* rather than as *dragged*; clamping matters
   * because a compact track inside the sheet is short, and a nudge longer than
   * its travel would look like a failed commit rather than an acknowledgement.
   */
  const nudge = () => {
    const to = Math.max(0, Math.min(height / 3, span.current));
    Animated.sequence([
      Animated.timing(x, {
        toValue: to,
        duration: 110,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(x, {
        toValue: 0,
        friction: 5,
        tension: 140,
        useNativeDriver: true,
      }),
    ]).start();
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
        // ⚠️⚠️ A TOUCH THAT NEVER MOVED IS A TAP, AND IT ALWAYS NUDGES. Whether it
        // also opens the basket is the CALLER's business as of 2026-09-25 — see
        // `onTap`. The bar passes a handler; the sheet passes none.
        if (releaseTaps(g.dx)) {
          nudge();
          onTap?.();
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

  // ⚠️⚠️ A TAP ANSWERS, AND OPENS THE BASKET ONLY WHERE THERE IS ONE TO OPEN —
  // *"Let's make the carrito able to open by tapping the slider as well"*
  // (2026-09-24), **amended 2026-09-25 when he found that inside the sheet it
  // closed the review screen**: *"do not close the carrito."*
  // ⚠️ **It costs the gesture nothing**, and the reason is in
  // `onMoveShouldSetPanResponder` above: the pan claims the touch only once the
  // finger has moved 4 pt, so a press that never moves is still a press and a
  // drag still cancels it.
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
