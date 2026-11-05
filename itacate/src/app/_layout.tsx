import { Stack, router, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { QueryProvider } from '@/api/QueryProvider';
import { AuthProvider, useAuth } from '@/auth/AuthProvider';
import { groupOf, redirectFor } from '@/auth/guard';
import { DistanciasProvider } from '@/lib/DistanciasProvider';

// ============================================================================
// THE ROOT OF ITACATE. Plan tasks `10.2a` (one screen), `10.5-iii-a` (signing
// in) and `10.5-iv-a-ii` (a kitchen's page and a dish's).
//
// ⚠️ THE ORDER OF THE PROVIDERS IS WERA'S AND IT IS THE DESIGN (Wera Cocina's
// root is `cocina/src/app/_layout.tsx`): the query layer is INSIDE the session,
// because every read is scoped to whoever holds it. ⚠️ Since `10.5-iv-a-ii` the
// screens sit inside `DistanciasProvider` too: the list hands it each kitchen's
// distance and the two pages read it — a number per kitchen, never her location.
// ============================================================================
export default function RootLayout() {
  return (
    <AuthProvider>
      <QueryProvider>
        <Gate />
        {/* Dark icons, always: the app is light only, as Wera (`8g`). */}
        <StatusBar style="dark" />
        <DistanciasProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </DistanciasProvider>
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
  const segments = useSegments();

  useEffect(() => {
    const to = redirectFor({ ready, hasSession: session !== null, group: groupOf(segments) });
    if (to !== null) router.replace(to);
  }, [ready, session, segments]);

  return null;
}
