import { Tabs } from 'expo-router/js-tabs';

import { AbrirBoleto } from '@/lib/AbrirBoleto';
import { Festejos } from '@/lib/Festejos';
import { Recordatorios } from '@/lib/Recordatorios';
import { EN_USO } from '@/navigation/pestanas';
import { Pestanas } from '@/ui/Pestanas';

// ============================================================================
// ITACATE'S TABS. Plan task `10.5-v-b`, the owner's ruling of 2026-11-05: *Cerca …
// Tú*, Wera's JavaScript tabs (`expo-router/js-tabs`, as `app/src/app/(tabs)/_layout.tsx`),
// not the phone's native ones. Which tabs, in what order, with which word and glyph
// is `@/navigation/pestanas`' (pinned by `test/pestanas.test.ts`); the bar is
// `@/ui/Pestanas`. Each tab draws its own head (`@/ui/Cabeza`), so the navigator's is
// off. A kitchen's page, a dish's and *Dónde buscar* are pushed OVER the tabs, from
// the root's stack, with their *Volver*.
//
// ⚠️ A TAB STAYS MOUNTED WHEN SHE LEAVES IT (Wera's measured trap): *Cerca* keeps its
// list — and the distances it hands the two pages — while she is on *Tú*.
// ⚠️ SINCE `10.5b-iii-b` HER REMINDERS LIVE HERE (`@/lib/Recordatorios`, which draws nothing):
// told again at each read of her reservations, and cancelled when the tabs leave.
// ⚠️ SINCE `10.9e-iii` HER *¡GANASTE!* TOO (`@/lib/Festejos`, which draws nothing): at each read of her cards, a
// reward won since the last one celebrated on this phone opens its screen over the tabs — once.
// ⚠️ SINCE `10.9j-ii-a` HER TICKET WHEN THE APP OPENS WITH NO SIGNAL (`@/lib/AbrirBoleto`, which draws nothing):
// *Apartados* over the tabs, once a run, while her phone keeps a ticket still to collect (J1).
// ============================================================================
export default function TabsDeItacate() {
  return (
    <>
      <Recordatorios />
      <Festejos />
      <AbrirBoleto />
      <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <Pestanas {...props} />}>
        {EN_USO.map((pestana) => (
          <Tabs.Screen key={pestana.ruta} name={pestana.ruta} options={{ title: pestana.label }} />
        ))}
      </Tabs>
    </>
  );
}
