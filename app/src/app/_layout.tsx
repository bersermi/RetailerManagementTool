import { Stack, router, usePathname, useSegments } from 'expo-router';
import { useEffect, useRef } from 'react';

import { AuthProvider, useAuth } from '@/auth/AuthProvider';
import { groupOf, redirectFor } from '@/auth/guard';
import {
  readLastScreen,
  rememberLastScreen,
  restoreTarget,
  routeMemory,
} from '@/navigation/lastScreen';
import { DensityProvider } from '@/theme/DensityProvider';

// The root, and it now does three things: it puts C3.18's density scale in
// reach of every screen, it puts the session there too, and it hands navigation
// to the tab shell.
//
// ⚠️ THE STACK'S HEADER IS OFF BECAUSE THE TABS CARRY THEIR OWN. A group like
// `(tabs)` is a screen as far as the Stack is concerned, so leaving both on
// stacks two headers — the outer one showing the group's name, which is not a
// word in this app's vocabulary.
export default function RootLayout() {
  return (
    <AuthProvider>
      <DensityProvider>
        <Gate />
        <Stack screenOptions={{ headerShown: false }} />
      </DensityProvider>
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
  const segments = useSegments();
  const pathname = usePathname();

  // ⚠️ A REF AND NOT STATE, ON PURPOSE. Setting state here would re-render the
  // tree to record a fact nothing draws; the ref is read and written inside the
  // effect only, and it resets when the app is killed — which is exactly the
  // lifetime "once per launch" means.
  const restored = useRef(false);

  useEffect(() => {
    const hasSession = session !== null;

    const to = redirectFor({ ready, hasSession, group: groupOf(segments) });
    if (to !== null) {
      router.replace(to);
      return;
    }

    if (!ready || !hasSession) return;

    if (!restored.current) {
      restored.current = true;
      const target = restoreTarget({
        ready,
        hasSession,
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
  }, [ready, session, segments, pathname]);

  return null;
}
