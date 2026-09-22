import { Stack, router, usePathname, useSegments } from 'expo-router';
import { useEffect, useRef } from 'react';
import { View } from 'react-native';

import { QueryProvider } from '@/api/QueryProvider';
import { useMembership } from '@/api/hooks';
import { AuthProvider, useAuth } from '@/auth/AuthProvider';
import { groupOf, redirectFor } from '@/auth/guard';
import {
  readLastScreen,
  rememberLastScreen,
  restoreTarget,
  routeMemory,
} from '@/navigation/lastScreen';
import { start as startConnectivity } from '@/lib/connectivityMonitor';
import { DeadLetterBanner } from '@/offline/DeadLetterBanner';
import { OfflineSurfaces } from '@/offline/OfflineSurfaces';
import { DensityProvider } from '@/theme/DensityProvider';

// The root, and it now does four things: it puts C3.18's density scale in reach
// of every screen, it puts the session there too, it puts TanStack Query — the
// only server-state layer this app has (ADR-035 §2.11) — between the two, and it
// hands navigation to the tab shell.
//
// ⚠️ `QueryProvider` IS INSIDE `AuthProvider` AND OUTSIDE EVERYTHING ELSE
// (5b-i). Every query is scoped to whoever holds the session, so the provider
// that knows who that is has to be above it; and `Gate` reads a query, so it has
// to be below it.
//
// ⚠️ THE STACK'S HEADER IS OFF BECAUSE THE TABS CARRY THEIR OWN. A group like
// `(tabs)` is a screen as far as the Stack is concerned, so leaving both on
// stacks two headers — the outer one showing the group's name, which is not a
// word in this app's vocabulary.
//
// ⚠️⚠️ AND AS OF `5b-ii-a` IT DECLARES SCREENS BY NAME — `ajustes`, the app's
// first non-tab surface, and as of `5b-iii-d-1` `solicitudes`, its second. Expo
// Router still discovers every other route from the
// filesystem — a `Stack.Screen` here is how a route is given OPTIONS, not how it
// is registered — and the option is the deliverable: §2.8 fixed Ajustes as a
// SHEET, and `presentation: 'modal'` is the whole of that sentence in code.
// ⚠️ Both are at the root and in no group deliberately: `groupOf()` returns
// `null` for them, which is the one value `redirectFor` leaves a member sitting
// on. ⚠️ Neither is in `RESTORABLE_ROUTES`: C1.3 reopens the screen a person was
// WORKING on, and a modal over Inicio is not that.
export default function RootLayout() {
  return (
    <AuthProvider>
      <QueryProvider>
        <DensityProvider>
          <Gate />
          <Drain />
          {/* ⚠️ THE STACK IS WRAPPED SO THE OFFLINE SURFACES CAN SIT OVER IT
              (5c-iv-a). They are absolutely positioned and `box-none`, so they
              overlay every screen without the screens knowing — which is what
              C10.1's "surfacing on screen changes" needs, and what putting the
              notice inside each screen would have cost: every screen having to
              remember. ⚠️ They are AFTER the Stack deliberately: a sibling
              earlier in the tree renders underneath it. */}
          <View style={{ flex: 1 }}>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="ajustes" options={{ presentation: 'modal' }} />
              <Stack.Screen name="solicitudes" options={{ presentation: 'modal' }} />
            </Stack>
            <OfflineSurfaces />
            {/* ⚠️ C11.9's banner overlays every screen too (5c-iv-b), and it
                sits at the TOP while the surfaces above own the bottom —
                two absolutely-positioned strips at one edge is a collision
                nothing in this repository could see. ⚠️ It draws for a
                manager and above only, and fences before it reads: a
                cashier's phone never opens the queue for it. */}
            <DeadLetterBanner />
          </View>
        </DensityProvider>
      </QueryProvider>
    </AuthProvider>
  );
}

// ============================================================================
// ⚠️ THE ONLY PLACE THE APP REDIRECTS ON A SESSION, AND IT DECIDES NOTHING.
// Every rule is in `@/auth/guard`, as a pure function the suite can read;
// what is left here is the effect — read where we are, ask, go. Plan task
// 5a-iii-a.
//
// ⚠️ IT RENDERS NOTHING AND IS NOT A LAYOUT. Redirecting from inside a screen
// means every screen has to remember to; redirecting from the `Stack`'s own
// render is a navigation during a render, which Expo Router warns about. A
// sibling with no output has exactly one job and is mounted for as long as the
// app is.
//
// ⚠️ AND NO CHECK IN THIS REPOSITORY CAN SEE THAT IT WORKS — that is written
// down in `@/auth/guard`'s header and it belongs to `5a-iv`, the phone.
//
// ⚠️ IT NOW DOES C1.3 AS WELL (5a-iii-b), AND THE ORDER OF THE THREE STEPS IS
// THE DESIGN: the guard first, because a signed-out person must not be restored
// anywhere; the restore second, once and only once per launch; the recording
// last, so what is written is where the person actually ended up.
// ============================================================================
function Gate() {
  const { session, ready } = useAuth();
  // ⚠️ A SERVER READ, AND IT IS THE FIRST THING IN THIS APP THAT CAN BE SLOW
  // (5b-i). Until it comes back this is `unknown`, and `redirectFor` moves
  // nobody on an `unknown` — see its own note on why that is not a `none`.
  const membership = useMembership();
  const segments = useSegments();
  const pathname = usePathname();

  // ⚠️ A REF AND NOT STATE, ON PURPOSE. Setting state here would re-render the
  // tree to record a fact nothing draws; the ref is read and written inside the
  // effect only, and it resets when the app is killed — which is exactly the
  // lifetime "once per launch" means.
  const restored = useRef(false);

  useEffect(() => {
    const hasSession = session !== null;

    const to = redirectFor({ ready, hasSession, membership, group: groupOf(segments) });
    if (to !== null) {
      router.replace(to);
      return;
    }

    if (!ready || !hasSession || membership !== 'member') return;

    if (!restored.current) {
      restored.current = true;
      const target = restoreTarget({
        ready,
        hasSession,
        membership,
        alreadyRestored: false,
        stored: readLastScreen(routeMemory()),
        at: pathname,
      });
      if (target !== null) {
        router.replace(target);
        return;
      }
    }

    rememberLastScreen(routeMemory(), pathname);
  }, [ready, session, membership, segments, pathname]);

  return null;
}

// ============================================================================
// ⚠️ THE ONLY PLACE THE QUEUE'S DRAIN IS STARTED, AND IT DECIDES NOTHING.
// Plan task 5c-ii-b-2. Every rule about WHEN a flush runs is in
// `@/api/connectivity` as a pure machine the suite can read, and every native
// call is in `@/lib/connectivityMonitor`; what is left here is a lifetime.
//
// ⚠️ IT RENDERS NOTHING, the same shape as `Gate` above and for the same
// reason: starting the monitor from inside a screen means every screen has to
// remember to, and a sibling with no output has exactly one job and is mounted
// for as long as the app is.
//
// ⚠️⚠️ IT IS GATED ON A SESSION, WHICH IS CORRECTNESS RATHER THAN ECONOMY. A
// drain with no session sends `record_sale` as an anonymous caller, gets
// `PGRST301` — which `@/api/deadletter` classifies transient, correctly, since
// the very next launch fixes it — and then walks the whole retry ladder for
// nothing. There is also nothing in the queue to drain before somebody has
// signed in.
//
// ⚠️ AND NO CHECK IN THIS REPOSITORY CAN SEE THAT IT WORKS, which is `5c-iv`'s
// sentence too: §2.11 keeps rendering, navigation and layout out of scope, so
// the instrument for this mount is the owner's own phone (`R9`).
// ============================================================================
function Drain() {
  const { session } = useAuth();

  useEffect(() => {
    if (session === null) return;
    return startConnectivity();
  }, [session]);

  return null;
}
