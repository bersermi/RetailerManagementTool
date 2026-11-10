import { Tabs } from 'expo-router/js-tabs';

import { useApartadosAlDia, useKitchen, usePlace } from '@/api/hooks';
import { ordenesDe, porCalificar } from '@/lib/apartados';
import { RecordatorioProvider } from '@/lib/RecordatorioProvider';
import { useAhora } from '@/lib/useAhora';
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
//
// ⚠️ `10.5b-iv-a`: *APARTADOS* IS A TAB, AND ITS COUNT IS READ HERE (`useCuentas`): what waits for
// her thumb, handed to the bar.
// ⚠️⚠️ `10.5b-iv-b`: AND HER RESERVATIONS KEEP TIME HERE, AND ONLY HERE (`useApartadosAlDia`): read
// every minute while something can change, both lists again when the day turns, who reserved each
// again when today's orders change. Every other screen reads the same queries and asks nothing again:
// a `refetch()` cancels a read in flight and sends a new one, so from every screen each would go out
// once per screen (`@/api/hooks`).
//
// ⚠️ `10.5-v-c-ii`: HER REMINDER LIVES HERE TOO (`@/lib/RecordatorioProvider`) — *Hoy* asks
// its question and *Mi cocina* keeps its row, both tabs mounted at once, so her answer, the
// one sheet both open, what her phone schedules and a tap that opens *Publicar* are held
// above the two. When the tabs leave — she signed out, her kitchen was deleted — her
// reminders are cancelled with them.
// ============================================================================
export default function TabsDeCocina() {
  useRefrescoDeSuPunto();
  const kitchen = useKitchen();
  const cuentas = useCuentas(kitchen?.id ?? null);
  return (
    <RecordatorioProvider kitchenId={kitchen?.id ?? null}>
      <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <Pestanas {...props} cuentas={cuentas} />}>
        {EN_USO.map((pestana) => (
          <Tabs.Screen key={pestana.ruta} name={pestana.ruta} options={{ title: pestana.label }} />
        ))}
      </Tabs>
    </RecordatorioProvider>
  );
}

/**
 * ⚠️ `10.5b-iv-a`: THE COUNT ON *APARTADOS* — what waits for her thumb (the final design: *Por
 * calificar with a count on the tab*). Read here, always mounted, from the same query the tab
 * reads — one request — and with the clock, so a window's end adds to it on its own.
 */
function useCuentas(kitchenId: string | null): { readonly apartados: number } {
  const apartados = useApartadosAlDia(kitchenId);
  const ahora = useAhora(60_000);
  const datos = apartados.data;
  return { apartados: datos === undefined ? 0 : porCalificar(ordenesDe(datos.reservas, datos.vecinos, ahora), ahora) };
}

/** Her kitchen's copy of Google's point, kept fresh — nothing on screen says any of it. */
function useRefrescoDeSuPunto() {
  const kitchen = useKitchen();
  const place = usePlace(kitchen?.id ?? null);
  useDondeEstaSuCocina(place.data);
}
