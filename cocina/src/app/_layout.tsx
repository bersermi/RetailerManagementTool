import { Stack, router, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { QueryProvider } from '@/api/QueryProvider';
import { useMembership } from '@/api/hooks';
import { AuthProvider, useAuth } from '@/auth/AuthProvider';
import { groupOf, redirectFor } from '@/auth/guard';

// ============================================================================
// THE ROOT OF WERA COCINA. Plan tasks `10.2a` (one screen) and `10.4b-iii-a`
// (signing in).
//
// ⚠️ THE ORDER OF THE PROVIDERS IS WERA'S AND IT IS THE DESIGN: the query layer
// is INSIDE the session, because every read is scoped to whoever holds it, and
// `Gate` reads a query, so it is inside both.
// ============================================================================
export default function RootLayout() {
  return (
    <AuthProvider>
      <QueryProvider>
        <Gate />
        {/* Dark icons, always: the app is light only, as Wera (`8g`). */}
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }} />
      </QueryProvider>
    </AuthProvider>
  );
}

// ============================================================================
// ⚠️ THE ONLY PLACE THE APP REDIRECTS ON A SESSION, AND IT DECIDES NOTHING —
// every rule is `@/auth/guard`'s, as a pure function the suite reads. It renders
// nothing: redirecting from inside a screen means every screen has to remember
// to, and from the Stack's own render is a navigation during a render. ⚠️ NO
// CHECK CAN SEE THAT IT FIRES (ADR-035 §2.11): the phone is its instrument.
// ============================================================================
function Gate() {
  const { session, ready } = useAuth();
  const membership = useMembership();
  const segments = useSegments();

  useEffect(() => {
    const to = redirectFor({ ready, hasSession: session !== null, membership, group: groupOf(segments) });
    if (to !== null) router.replace(to);
  }, [ready, session, membership, segments]);

  return null;
}
