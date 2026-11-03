import { Stack, router } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { desdeSuLugar } from '@/api/direccion';
import { useKitchen, usePlace } from '@/api/hooks';
import { SuDireccionProvider } from '@/lib/borrador';
import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';
import { Banda } from '@/ui/Banda';

// ============================================================================
// *CAMBIAR DIRECCIÓN*'S TWO SCREENS, AS ONE STACK. Plan task `10.4h` (the owner's
// ruling of 2026-11-03, address first): her address screen (`/direccion`) and,
// only if she taps its small map, *Ajusta el punto* (`/direccion/punto`).
//
// ⚠️ THE DRAFT LIVES HERE (`@/lib/borrador`'s `SuDireccionProvider`), opened ONCE
// on what is stored (`desdeSuLugar`) — her address, her line, her own point with
// the street and number it belongs to — and written by the address screen's
// *Guardar*. Keyed by her place, so another place starts afresh. It waits for her
// place to be read; her kitchen's screen has read it already, so that is a moment.
// ============================================================================
export default function DireccionLayout() {
  const kitchen = useKitchen();
  const place = usePlace(kitchen?.id ?? null);

  if (kitchen === null || place.data === undefined || place.data === null) {
    return (
      <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
        <Banda titulo={ES.direccion.titulo} volver={{ label: ES.direccion.volver, onPress: () => router.back() }} />
        {place.data === undefined && <ActivityIndicator color={PALETTE.accion} style={{ marginTop: SIZE.space * 2 }} />}
      </View>
    );
  }

  return (
    <SuDireccionProvider key={place.data.id} inicial={desdeSuLugar(place.data)}>
      <Stack screenOptions={{ headerShown: false }} />
    </SuDireccionProvider>
  );
}
