import { router } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useKitchen, usePlace, useSavePin } from '@/api/hooks';
import { samePin, setStorePinArgs, type Pin } from '@/api/place';
import { useDondeEsta } from '@/lib/useGoogle';
import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';
import { Banda } from '@/ui/Banda';
import { PantallaPunto } from '@/ui/PantallaPunto';

// ============================================================================
// *AJUSTAR PUNTO*, FROM HER KITCHEN'S SCREEN — her own point, set or moved, saved
// at once. Plan tasks `10.4b-iii-b` and `10.4h` (the owner's ruling of
// 2026-11-03: her own point, if she sets one, is kept and used by every map after).
//
// ⚠️ THE MAP OPENS ON HER POINT, OR WHERE THE SMALL MAP PLACED HER ADDRESS — the
// same answer, from the cache (`useDondeEsta`); there the middle is Google's, and
// *Listo* saves nothing until her own hand has moved the map.
//
// ⚠️⚠️ HER STORED LINE OF DIRECTIONS GOES WITH HER POINT: `set_store_pin` (`0072`)
// writes the line with the pin on every call, and this screen has no box for it —
// a pin sent alone would erase it. `test/direccion.test.ts` reads this file for it.
// It is drawn only once her place is read, so the map opens where it should.
// ============================================================================
export default function Ubicacion() {
  const kitchen = useKitchen();
  const place = usePlace(kitchen?.id ?? null);
  const { save, busy } = useSavePin();
  const here = place.data;
  const donde = useDondeEsta(here === undefined || here === null || here.pin !== null ? null : here.address, null);

  async function listo(pin: Pin | null): Promise<string | null> {
    if (here === undefined || here === null) return ES.api.errors.unknown;
    if (pin === null || samePin(pin, here.pin)) {
      router.back();
      return null;
    }
    const problem = await save(setStorePinArgs(here.id, pin, here.directions ?? ''));
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
      abreEn={donde.kind === 'punto' ? donde.destino : null}
      busy={busy}
      onVolver={() => router.back()}
      onListo={listo}
    />
  );
}
