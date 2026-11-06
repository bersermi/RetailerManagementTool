import { Tabs } from 'expo-router/js-tabs';

import { useKitchen, usePlace } from '@/api/hooks';
import { useDondeEstaSuCocina } from '@/lib/useGoogle';
import { EN_USO } from '@/navigation/pestanas';
import { Pestanas } from '@/ui/Pestanas';

// ============================================================================
// WERA COCINA'S TABS. Plan task `10.5-v-c-i`, the owner's ruling of 2026-11-05: *Hoy …
// Mi cocina*, Wera's JavaScript tabs (`expo-router/js-tabs`, as Itacate's
// `itacate/src/app/(vecino)/(tabs)/_layout.tsx`), not the phone's native ones. Which
// tabs, in what order, with which word and glyph is `@/navigation/pestanas`' (pinned by
// `test/pestanas.test.ts`); the bar is `@/ui/Pestanas`. Each tab draws its own band
// (`@/ui/Banda`), so the navigator's head is off. *Tus ofertas*, *Publicar*, her page's
// editor and her address's screens are pushed OVER the tabs, from the root's stack.
//
// ⚠️ A TAB STAYS MOUNTED WHEN SHE LEAVES IT (Wera's measured trap): *Hoy* keeps its
// clock and its door's state while she is on *Mi cocina*.
// ⚠️⚠️ GOOGLE'S POINT FOR HER ADDRESS IS ASKED AGAIN HERE, ON EVERY OPEN, WHICHEVER TAB
// SHE IS ON (`10.5-i-b-ii`, his ruling of 2026-11-04, night): the 30-day copy, asked
// again a week on (`useDondeEstaSuCocina`). It ran on her kitchen's screen, the one
// every launch opened on; that screen is *Mi cocina* now, which mounts only when she
// opens it — so the refresh moved to what is always mounted, and *Mi cocina*'s small map
// reads the same answer (one query, one request).
// ============================================================================
export default function TabsDeCocina() {
  useRefrescoDeSuPunto();
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <Pestanas {...props} />}>
      {EN_USO.map((pestana) => (
        <Tabs.Screen key={pestana.ruta} name={pestana.ruta} options={{ title: pestana.label }} />
      ))}
    </Tabs>
  );
}

/** Her kitchen's copy of Google's point, kept fresh — nothing on screen says any of it. */
function useRefrescoDeSuPunto() {
  const kitchen = useKitchen();
  const place = usePlace(kitchen?.id ?? null);
  useDondeEstaSuCocina(place.data);
}
