import { usePathname } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useMyRole } from '@/api/hooks';
import { formatMXN } from '@/format/mxn';
import { outboxDb, readQueue } from '@/lib/outboxDb';
import {
  NOTHING_DEAD,
  NO_UNIT_FACTORS,
  canSeeDeadLetters,
  showsBanner,
  showsValue,
  valueOf,
  type QueueValue,
} from '@/offline/deadLetters';
import { ES } from '@/strings';
import { PALETTE } from '@/theme/palette';
import { useDensity } from '@/theme/DensityProvider';

// ============================================================================
// C11.9 — THE LEAST INVASIVE THING THAT WORKS, AND IT IS A BANNER AND NOT A
// SCREEN. Plan task 5c-iv-b.
//
// ⚠️⚠️ IT DECIDES NOTHING. Which rows count, what they are worth, whether the
// figure may be shown at all, who may see it and when a dismissal is over are
// every one of them in `@/offline/deadLetters`, where
// `app/test/offline-dead-letters.test.ts` reads them. §2.11 keeps rendering out
// of scope, so this file is the half no check in this repository can look at —
// and it is deliberately the half with no judgement in it. The instrument for
// how it LOOKS is the owner's phone (`R9`).
//
// ⚠️⚠️ IT MAKES NO SERVER READ. `readQueue` is this device's own SQLite outbox
// — `failed_write.id` is the client uuid (`0024` decision 7), so the phone that
// failed already holds everything the banner needs. That is what lets it work
// on the phone that is offline, which is the only phone that has anything to
// show. ⚠️ It does NOT import `expo-sqlite`: `@/lib/outboxDb` stays the one
// module that opens the queue, and `app/test/auth-errors.test.ts` pins that
// list at two.
//
// ⚠️ THE READ IS FENCED BEFORE IT HAPPENS, WHICH IS CORRECTNESS AND NOT
// ECONOMY. A cashier's phone never opens the queue for this banner at all, so
// there is no window in which the rows exist in memory behind a component that
// has decided not to draw them.
//
// ⚠️ IT RE-READS ON A SCREEN CHANGE AND NOWHERE ELSE, WHICH IS A CHOICE AND NOT
// AN OVERSIGHT. Nothing in this app announces "a flush dead-lettered a row" —
// adding that signal belongs to `@/lib/connectivityMonitor`, whose one job
// `5c-ii-b-2` deliberately kept to the link. A dead letter is not urgent
// (C11.9: *"not a priority for the owner at this point"*) and a manager
// navigates constantly, so the next screen is soon enough, and polling would be
// a synchronous SQLite read on a timer for a row that is usually not there.
//
// ⚠️ IT IS NOT UNDER `src/app/` — Expo Router makes every file there a
// navigable URL — and it is not a `src/ui/` primitive either: §2.11's ten
// primitives and `5h.5`'s conventions pass come after there is a pattern to
// describe, and ADR-035 §3 gives that directory to `5d`–`5h`. Same reasoning
// `OfflineSurfaces.tsx` and `Pendiente.tsx` already carry.
// ============================================================================

export function DeadLetterBanner() {
  const pathname = usePathname();
  const role = useMyRole();
  const [value, setValue] = useState<QueueValue>(NOTHING_DEAD);
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);

  useEffect(() => {
    // ⚠️ THE FENCE IS READ FIRST — see the header. `useMyRole` is `null` while
    // the roster read is out, so this also waits rather than guessing.
    if (!canSeeDeadLetters(role)) {
      setValue(NOTHING_DEAD);
      return;
    }
    setValue(valueOf(readQueue(outboxDb()), NO_UNIT_FACTORS));
  }, [role, pathname]);

  if (!showsBanner(role, value, dismissedAt)) return null;
  return <Banner value={value} onDismiss={() => setDismissedAt(value.count)} />;
}

/**
 * A count, a peso figure and one sentence — never a list, never an
 * `error_code`.
 *
 * ⚠️ IT CARRIES NO STATE COLOUR, the same decision `5c-iv-a`'s notice records
 * and for a reason that is stronger here: §2.11's palette row fences `atencion`
 * to C3.17 alone, and `error` is what DESTROYS. A dead letter has already
 * happened and nothing in the shop is about to break because of it — the words
 * carry the whole message, so *"never colour alone"* is satisfied by
 * construction rather than by care.
 *
 * ⚠️ IT SITS AT THE TOP, AND THE REASON IS THE OTHER SURFACE. `OfflineSurfaces`
 * owns the bottom of every screen — the notice pill and the reconnect toast —
 * and two absolutely-positioned strips at one edge is a collision no check here
 * could see. ⚠️ `insets.top` because the root `Stack` draws no header.
 */
function Banner({ value, onDismiss }: { value: QueueValue; onDismiss: () => void }) {
  const { scale } = useDensity();
  const insets = useSafeAreaInsets();
  const line = showsValue(value) ? ES.offline.deadLetters.value(formatMXN(value.centavos)) : null;

  return (
    <View
      // ⚠️ `box-none` IS WHAT KEEPS "LEAST INVASIVE" TRUE: the strip itself
      // takes no taps, so only the pill inside it is pressable and the screen
      // underneath keeps working.
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        top: insets.top + scale.space,
        left: scale.space,
        right: scale.space,
        alignItems: 'center',
      }}
    >
      <Pressable
        onPress={onDismiss}
        accessibilityRole="button"
        accessibilityLabel={[
          ES.offline.deadLetters.count(value.count),
          line,
          ES.offline.deadLetters.hint(value.count),
          ES.offline.dismiss,
        ]
          .filter((part) => part !== null)
          .join('. ')}
        // ⚠️ THE WHOLE PILL IS THE TAP TARGET, at `scale.tapTarget` (`R6`) —
        // the same *"easily dismissed means a thumb, not a close cross"* the
        // offline notice settled.
        style={{
          minHeight: scale.tapTarget,
          width: '100%',
          justifyContent: 'center',
          paddingVertical: scale.space,
          paddingHorizontal: scale.space * 1.5,
          borderRadius: scale.space,
          backgroundColor: PALETTE.superficie,
          borderWidth: 1,
          borderColor: PALETTE.linea,
        }}
      >
        <Text style={{ fontSize: scale.bodySize, color: PALETTE.tinta }}>
          {ES.offline.deadLetters.count(value.count)}
        </Text>
        {line === null ? null : (
          <Text style={{ fontSize: scale.bodySize, color: PALETTE.tinta }}>{line}</Text>
        )}
        <Text style={{ fontSize: scale.bodySize, color: PALETTE.tintaApagada }}>
          {ES.offline.deadLetters.hint(value.count)}
        </Text>
      </Pressable>
    </View>
  );
}
