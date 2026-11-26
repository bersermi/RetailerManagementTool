import { useFonts } from 'expo-font';
import { Stack, router, useGlobalSearchParams, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { QueryProvider } from '@/api/QueryProvider';
import { AuthProvider, useAuth } from '@/auth/AuthProvider';
import { groupOf, paraDespues, redirectFor } from '@/auth/guard';
import { ColaProvider } from '@/lib/ColaProvider';
import { DistanciasProvider } from '@/lib/DistanciasProvider';
import { DondeBuscarProvider } from '@/lib/DondeBuscarProvider';
import { FUENTES } from '@/marca/fuentes';

// ============================================================================
// THE ROOT OF ITACATE. Plan tasks `10.2a` (one screen), `10.5-iii-a` (signing
// in), `10.5-iv-a-ii` (a kitchen's page and a dish's) and `10.5-v-b` (the shell).
//
// ⚠️ THE ORDER OF THE PROVIDERS IS WERA'S AND IT IS THE DESIGN (Wera Cocina's
// root is `cocina/src/app/_layout.tsx`): the query layer is INSIDE the session,
// because every read is scoped to whoever holds it. ⚠️ Since `10.5-iv-a-ii` the
// screens sit inside `DistanciasProvider` too: the list hands it each kitchen's
// distance and the two pages read it — a number per kitchen, never her location.
// ⚠️ Since `10.5-v-b` inside `DondeBuscarProvider` as well — her pick, her location
// or a postal code, set on *Tú* and read by *Cerca* — and the tabs are a group of the
// stack, `(vecino)/(tabs)`, with the pages pushed over them.
// ============================================================================
export default function RootLayout() {
  // ⚠️ `10.5-v-b`, WERA'S RULE (`app/src/app/_layout.tsx`, `8g`): THE TITLES' FACE IS
  // LOADED BEFORE ANY SCREEN DRAWS, so no title paints in the system face and jumps —
  // a file inside the update (`@/theme/letra`), a few milliseconds, offline too. ⚠️ A
  // FAILED LOAD NEVER HOLDS THE APP: on an error the titles fall back to the phone's
  // face and everything else draws.
  const [fontsReady, fontError] = useFonts(FUENTES);
  if (!fontsReady && fontError === null) return null;
  // ⚠️ `10.5-iv-b-i`: THE GESTURES' ROOT, for the list that slides over the map
  // (`@/ui/HojaDeLista`) — `react-native-gesture-handler` is in every Itacate build since
  // `10.2a`, and a gesture outside this root is never heard.
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <QueryProvider>
          {/* ⚠️ `10.9j-ii-a`: the signal and her *Ya lo tengo* queue, for the app's life (`@/lib/ColaProvider`). */}
          <ColaProvider>
            <Gate />
            {/* Dark icons, always: the app is light only, as Wera (`8g`). */}
            <StatusBar style="dark" />
            <DistanciasProvider>
              <DondeBuscarProvider>
                <Stack screenOptions={{ headerShown: false }} />
              </DondeBuscarProvider>
            </DistanciasProvider>
          </ColaProvider>
        </QueryProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

// ============================================================================
// ⚠️ THE ONLY PLACE THE APP REDIRECTS ON A SESSION, AND IT DECIDES NOTHING —
// every rule is `@/auth/guard`'s, as a pure function the suite reads. It renders
// nothing: redirecting from inside a screen means every screen has to remember
// to, and from the Stack's own render is a navigation during a render. ⚠️ NO
// CHECK CAN SEE THAT IT FIRES (ADR-035 §2.11): the phone is its instrument.
// ⚠️ `10.9c`: A KITCHEN'S LINK OPENED WHILE SIGNED OUT is remembered as she is sent
// to *Entrar* (`paraDespues`) and opened, once, when she is in — in memory only.
// ============================================================================
function Gate() {
  const { session, ready } = useAuth();
  const segments = useSegments();
  const { id } = useGlobalSearchParams<{ id?: string }>();
  const despues = useRef<string | null>(null);

  useEffect(() => {
    const to = redirectFor({ ready, hasSession: session !== null, group: groupOf(segments) });
    if (to === null) return;
    if (to === '/entrar') despues.current = paraDespues(segments, id);
    const destino = to === '/' && despues.current !== null ? despues.current : to;
    if (to === '/') despues.current = null;
    router.replace(destino as typeof to);
  }, [ready, session, segments, id]);

  return null;
}
