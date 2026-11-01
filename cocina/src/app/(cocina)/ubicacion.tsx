import { router } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useKitchen, usePlace, useSavePin } from '@/api/hooks';
import { setStorePinArgs, type Pin } from '@/api/place';
import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';
import { Banda } from '@/ui/Banda';
import { PantallaPunto } from '@/ui/PantallaPunto';

// ============================================================================
// HER KITCHEN ON THE MAP, GIVEN OR MOVED FROM HER KITCHEN'S SCREEN. Plan task
// `10.4b-iii-b` — the second door for a pin the sign-up could not write, and
// the way to move one placed wrong.
//
// ⚠️ THE SIGN-UP'S MAP SCREEN (`@/ui/PantallaPunto`), opened close around her
// pin when she has one — close enough that her first tap moves it — and saved
// through `set_store_pin`, the owner's (`0072`). It is drawn only once her place
// is read, so the map opens where her pin is and not on the city.
// ============================================================================
export default function Ubicacion() {
  const kitchen = useKitchen();
  const place = usePlace(kitchen?.id ?? null);
  const { save, busy } = useSavePin();
  const here = place.data;

  async function guardar(pin: Pin, directions: string): Promise<string | null> {
    if (here === undefined || here === null) return ES.api.errors.unknown;
    const problem = await save(setStorePinArgs(here.id, pin, directions));
    if (problem === null) router.back();
    return problem;
  }

  if (kitchen === null || here === undefined || here === null) {
    return (
      <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
        <Banda titulo={ES.mapa.titulo} volver={{ label: ES.mapa.volver, onPress: () => router.back() }} />
        {here === undefined && <ActivityIndicator color={PALETTE.accion} style={{ marginTop: SIZE.space * 2 }} />}
      </View>
    );
  }

  return (
    <PantallaPunto
      antetitulo={kitchen.displayName}
      pin={here.pin}
      direccion={here.address}
      directions={here.directions ?? ''}
      accion={ES.mapa.guardar}
      busy={busy}
      onVolver={() => router.back()}
      onGuardar={guardar}
    />
  );
}
