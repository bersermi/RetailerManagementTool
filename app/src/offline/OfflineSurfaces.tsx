import { usePathname } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';

import {
  NOTHING_YET,
  TOAST_FADE_MS,
  TOAST_MS,
  showsNotice,
  showsToast,
  surfaces,
  type Surfaces,
} from '@/offline/notice';
import { ES } from '@/strings';
import { online as linkNow, subscribe } from '@/lib/connectivityMonitor';
import { PALETTE } from '@/theme/palette';
import { useDensity } from '@/theme/DensityProvider';

// ============================================================================
// THE TWO THINGS A PERSON SEES ABOUT THE LINK. Plan task 5c-iv-a — C10.1's
// quiet dismissible notice and C10.2's fading reconnect toast.
//
// ⚠️⚠️ IT DECIDES NOTHING. Every rule — when the notice shows, how long a
// dismissal lasts, what counts as a reconnect, how long the toast lives — is in
// `@/offline/notice`, as a pure function `app/test/offline-notice.test.ts`
// reads. §2.11 keeps rendering out of scope, so this file is the part no check
// in this repository can look at, and it is deliberately the part with no
// judgement in it.
//
// ⚠️ IT READS THE SIGNAL, NEVER THE LIBRARY. `subscribe()` from
// `@/lib/connectivityMonitor` is the whole of its connectivity import. A second
// `expo-network` import here would be a notice and a drain that can disagree
// about whether the shop is online — on iOS, measured, by nearly a minute — and
// `app/test/auth-errors.test.ts` is what holds that to one file.
//
// ⚠️⚠️ AND IT IS NOT UNDER `src/app/`. Expo Router makes every file there a
// navigable URL, which is the reason `src/scaffolding/Pendiente.tsx` already
// gives. ⚠️ It is not a `src/ui/` primitive either: §2.11's ten primitives and
// `5h.5`'s conventions pass are scheduled for after there is a pattern to
// describe, and ADR-035 §3 gives that directory to `5d`–`5h`. A `Banner` built
// here would be *"ten primitives guessed at against screens nobody has drawn"*,
// arriving four tasks early.
//
// ⚠️ MOTION IS `opacity` ONLY, and that is §2.11's performance rule rather than
// a preference: two of the pilot's four phones are low-end Androids, and
// opacity is one of the two properties that runs on the compositor.
// `useNativeDriver` is what actually keeps it off the JS thread.
// ============================================================================

export function OfflineSurfaces() {
  const pathname = usePathname();
  const [state, setState] = useState<Surfaces>(NOTHING_YET);

  // ⚠️ ONE SUBSCRIPTION, TORN DOWN WITH THE MOUNT. The monitor hands back its
  // own unsubscribe, which is the only way to remove a watcher.
  useEffect(() => {
    setState((s) => surfaces(s, { kind: 'link', online: linkNow() }, Date.now()));
    return subscribe((next) => {
      setState((s) => surfaces(s, { kind: 'link', online: next }, Date.now()));
    });
  }, []);

  // C10.1's "surfacing on screen changes" — the event, not the rule. The rule
  // (a dismissal is worth one screen) is in `@/offline/notice`.
  useEffect(() => {
    setState((s) => surfaces(s, { kind: 'screen', at: pathname }, Date.now()));
  }, [pathname]);

  // ⚠️⚠️ A DEADLINE IN STATE IS NOT A RENDER TRIGGER, AND FORGETTING THAT IS
  // HOW A "FADING" TOAST STAYS UP UNTIL THE NEXT UNRELATED RE-RENDER. `showsToast`
  // is a pure comparison against the clock; something has to come back and ask
  // it again at the moment the answer changes. ⚠️ It is a bump and not a stored
  // time, because the time is already in `state.toastUntil` and two copies of
  // one deadline is the defect this repository has recorded ten times.
  const [, bump] = useState(0);
  useEffect(() => {
    if (state.toastUntil === null) return;
    const timer = setTimeout(
      () => bump((n) => n + 1),
      Math.max(0, state.toastUntil - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [state.toastUntil]);

  return (
    <>
      {showsNotice(state) ? (
        <Notice onDismiss={() => setState((s) => surfaces(s, { kind: 'dismiss' }, Date.now()))} />
      ) : null}
      {showsToast(state, Date.now()) ? <Toast key={state.toastUntil ?? 0} /> : null}
    </>
  );
}

/**
 * C10.1 — small, intermittent, non-invasive, easily dismissed.
 *
 * ⚠️⚠️ IT CARRIES NO STATE COLOUR AND THAT IS DELIBERATE. `atencion` is fenced
 * by §2.11's palette row to C3.17 and nothing else — `falta precio` and a line
 * priced `$0.00` — and `error` is what DESTROYS. Being offline is neither: it
 * is the ordinary condition of the pilot shop ([[pilot-store-is-offline-a-lot]]),
 * and a warning colour on a condition that holds half the day teaches a
 * shopkeeper to stop seeing warning colours. Muted ink on a surface, with a
 * line around it, is the quiet C10.1 asks for — and minting a new role for it
 * would be an ADR amendment for a notice whose whole requirement is to be
 * unobtrusive.
 *
 * ⚠️ NEVER COLOUR ALONE (§2.11): the word is the signal here and the colour is
 * doing nothing, which is the rule satisfied by construction rather than by
 * care.
 */
function Notice({ onDismiss }: { onDismiss: () => void }) {
  const { scale } = useDensity();
  return (
    <View
      // ⚠️ `pointerEvents="box-none"` ON THE WRAPPER IS WHAT MAKES "NEVER
      // BLOCKS" TRUE. Without it this strip eats taps meant for the screen
      // underneath it, which is the one thing C10.1 forbids outright.
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: scale.space,
        right: scale.space,
        bottom: scale.space,
        alignItems: 'center',
      }}
    >
      <Pressable
        onPress={onDismiss}
        accessibilityRole="button"
        accessibilityLabel={`${ES.offline.notice}. ${ES.offline.dismiss}`}
        // ⚠️ THE TAP TARGET IS THE DENSITY SCALE'S, NOT A LITERAL (`R6`). It is
        // the whole pill: "easily dismissed" means a thumb, not a close cross.
        style={{
          minHeight: scale.tapTarget,
          justifyContent: 'center',
          paddingHorizontal: scale.space * 1.5,
          borderRadius: scale.tapTarget / 2,
          backgroundColor: PALETTE.superficie,
          borderWidth: 1,
          borderColor: PALETTE.linea,
        }}
      >
        <Text style={{ fontSize: scale.bodySize, color: PALETTE.tintaApagada }}>
          {ES.offline.notice}
        </Text>
      </Pressable>
    </View>
  );
}

/**
 * C10.2 — one fading toast, no acknowledgement, and it does not say how many.
 *
 * ⚠️ IT IS MOUNTED WHEN IT IS SHOWN AND UNMOUNTED WHEN IT IS NOT, keyed on the
 * toast's own deadline, so a second reconnect inside four seconds restarts the
 * fade rather than inheriting a half-faded one.
 */
function Toast() {
  const { scale } = useDensity();
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // ⚠️⚠️ `opacity` AND `useNativeDriver`, AND BOTH HALVES MATTER. §2.11's
    // motion rule names the property; the native driver is what keeps the
    // animation off the JS thread, which is the whole reason the property was
    // named. Animating without it is the rule obeyed in the letter on the two
    // phones it was written for.
    const show = Animated.timing(opacity, {
      toValue: 1,
      duration: TOAST_FADE_MS,
      useNativeDriver: true,
    });
    const hide = Animated.timing(opacity, {
      toValue: 0,
      duration: TOAST_FADE_MS,
      delay: TOAST_MS - TOAST_FADE_MS * 2,
      useNativeDriver: true,
    });
    const run = Animated.sequence([show, hide]);
    run.start();
    return () => run.stop();
  }, [opacity]);

  return (
    <Animated.View
      // ⚠️ IT NEEDS NO ACKNOWLEDGEMENT, so it takes no taps at all — there is
      // nothing here to press and nothing underneath it to block.
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: scale.space,
        right: scale.space,
        bottom: scale.space,
        opacity,
        alignItems: 'center',
      }}
    >
      <View
        style={{
          paddingVertical: scale.space,
          paddingHorizontal: scale.space * 1.5,
          borderRadius: scale.space,
          backgroundColor: PALETTE.superficie,
          borderWidth: 1,
          borderColor: PALETTE.linea,
        }}
      >
        <Text style={{ fontSize: scale.bodySize, color: PALETTE.tinta, textAlign: 'center' }}>
          {ES.offline.restored}
        </Text>
      </View>
    </Animated.View>
  );
}
