import { Stack, router, useSegments } from 'expo-router';
import { useEffect } from 'react';

import { AuthProvider, useAuth } from '@/auth/AuthProvider';
import { groupOf, redirectFor } from '@/auth/guard';
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
// ============================================================================
function Gate() {
  const { session, ready } = useAuth();
  const segments = useSegments();

  useEffect(() => {
    const to = redirectFor({
      ready,
      hasSession: session !== null,
      group: groupOf(segments),
    });
    if (to !== null) router.replace(to);
  }, [ready, session, segments]);

  return null;
}
