import { useFonts } from 'expo-font';
import { Stack, router, usePathname, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';

import { QueryProvider } from '@/api/QueryProvider';
import { useMembership } from '@/api/hooks';
import { AuthProvider, useAuth } from '@/auth/AuthProvider';
import { groupOf, redirectFor } from '@/auth/guard';
import { NotaProvider } from '@/lib/NotaProvider';
import { holdSplash, releaseSplash } from '@/lib/splash';
import { FUENTES } from '@/theme/letra';

// ============================================================================
// THE ROOT OF WERA COCINA. Plan tasks `10.2a` (one screen), `10.4b-iii-a`
// (signing in) and `10.5-v-c-i` (the shell).
//
// ⚠️ THE ORDER OF THE PROVIDERS IS WERA'S AND IT IS THE DESIGN: the query layer
// is INSIDE the session, because every read is scoped to whoever holds it, and
// `Gate` reads a query, so it is inside both. ⚠️ Since `10.5-v-c-i` the toast and
// its *Deshacer* are inside both too (`@/lib/NotaProvider` takes an offer down), over
// every route — publishing ends on *Volver*, so the screen that published is gone
// when *Publicaste …* shows — and her kitchen's tabs are a group of the stack,
// `(cocina)/(tabs)`, with *Tus ofertas*, *Publicar* and her page pushed over them.
// ⚠️ `10.5-v-d`: THE NATIVE SPLASH IS HELD FROM HERE (`@/lib/splash`, Wera's `8g`) until the
// screen behind it is the one she will see — the opening lets it go once its cow is in,
// `Gate` everywhere else — so a stranger never sees *Hoy* for a frame, nor an empty square.
// ============================================================================
holdSplash();

export default function RootLayout() {
  // ⚠️ `10.5-v-c-i`, WERA'S RULE (`app/src/app/_layout.tsx`, `8g`; Itacate's since
  // `10.5-v-b`): THE TITLES' FACE IS LOADED BEFORE ANY SCREEN DRAWS, so no title paints
  // in the system face and jumps — a file inside the update (`@/theme/letra`), a few
  // milliseconds, offline too. ⚠️ A FAILED LOAD NEVER HOLDS THE APP: on an error the
  // titles fall back to the phone's face and everything else draws.
  const [fontsReady, fontError] = useFonts(FUENTES);
  if (!fontsReady && fontError === null) return null;
  return (
    <AuthProvider>
      <QueryProvider>
        <Gate />
        {/* Dark icons, always: the app is light only, as Wera (`8g`). */}
        <StatusBar style="dark" />
        <View style={{ flex: 1 }}>
          <NotaProvider>
            <Stack screenOptions={{ headerShown: false }} />
          </NotaProvider>
        </View>
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
  const pathname = usePathname();

  useEffect(() => {
    const to = redirectFor({ ready, hasSession: session !== null, membership, group: groupOf(segments) });
    if (to !== null) {
      router.replace(to);
      return;
    }
    // Nowhere to send her, so the screen behind the splash is hers — but the opening's,
    // which lets go once the cow's pictures are in.
    if (ready && pathname !== '/hola') releaseSplash();
  }, [ready, session, membership, segments, pathname]);

  return null;
}
