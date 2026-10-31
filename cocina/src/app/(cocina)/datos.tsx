import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useKitchen, useKitchenGiros, usePlace, useSaveDatos } from '@/api/hooks';
import type { Giro, Kitchen } from '@/api/kitchen';
import { EMPTY_ADDRESS, checkAddress, sameAddress, type Place } from '@/api/place';
import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';
import { Banda } from '@/ui/Banda';
import { BotonLleno } from '@/ui/BotonLleno';
import { Direccion } from '@/ui/Direccion';
import { Formulario } from '@/ui/Formulario';
import { Giros } from '@/ui/Giros';

// ============================================================================
// HER TRADE AND HER ADDRESS, COMPLETED OR CHANGED FROM HER KITCHEN'S SCREEN.
// Plan task `10.4b-iii-b` — the second door for a trade or an address the
// sign-up could not write, and the way to fix a typo.
//
// ⚠️ THE SIGN-UP FORM'S TWO PARTS (`@/ui/Giros`, `@/ui/Direccion`) holding what
// she gave — her own answers, not a proposal — and the same rules: a trade
// chosen, the owner's four address boxes. *Guardar* writes only what changed:
// the trade by the owner's update, the address through `set_store_address`.
// The form is drawn once both reads have answered, so it opens on her values.
// ============================================================================
export default function Datos() {
  const kitchen = useKitchen();
  const place = usePlace(kitchen?.id ?? null);
  const giros = useKitchenGiros();

  if (kitchen === null || place.data === undefined || giros.data === undefined) {
    return (
      <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
        <Banda titulo={ES.datos.titulo} volver={{ label: ES.datos.volver, onPress: () => router.back() }} />
        <ActivityIndicator color={PALETTE.accion} style={{ marginTop: SIZE.space * 2 }} />
      </View>
    );
  }
  return <Form kitchen={kitchen} place={place.data} giros={giros.data} />;
}

function Form({
  kitchen,
  place,
  giros,
}: {
  kitchen: Kitchen;
  place: Place | null;
  giros: readonly Giro[];
}) {
  const insets = useSafeAreaInsets();
  const { save, busy } = useSaveDatos();
  const [giro, setGiro] = useState<string | null>(kitchen.giroPrincipal);
  const [address, setAddress] = useState(place?.address ?? EMPTY_ADDRESS);
  const [problem, setProblem] = useState<string | null>(null);

  async function guardar() {
    if (busy) return;
    if (giro === null) return setProblem(ES.registro.errores.giro);
    const issue = place === null ? null : checkAddress(address);
    if (issue !== null) return setProblem(ES.address.issues[issue]);
    const answer = await save({
      kitchenId: kitchen.id,
      placeId: place?.id ?? null,
      giro: giro === kitchen.giroPrincipal ? null : giro,
      address: place === null || sameAddress(address, place.address) ? null : address,
    });
    setProblem(answer);
    if (answer === null) router.back();
  }

  const section = { fontSize: SIZE.bodySize, fontWeight: '700', color: PALETTE.tinta, marginTop: SIZE.space } as const;

  return (
    <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
      <Banda
        titulo={ES.datos.titulo}
        antetitulo={kitchen.displayName}
        volver={{ label: ES.datos.volver, onPress: () => router.back() }}
      />
      <Formulario
        contentContainerStyle={{
          paddingHorizontal: SIZE.space * 2,
          paddingTop: SIZE.space,
          paddingBottom: SIZE.space * 2 + insets.bottom,
          gap: SIZE.space,
        }}
      >
        <Text style={section}>{ES.registro.giro}</Text>
        <Giros giros={giros} chosen={giro} onChoose={setGiro} disabled={busy} />
        {place !== null && (
          <>
            <Text style={section}>{ES.registro.donde}</Text>
            <Direccion value={address} onChange={setAddress} editable={!busy} />
          </>
        )}
        {problem !== null && (
          <Text style={{ fontSize: SIZE.bodySize, fontWeight: '600', color: PALETTE.error }}>{problem}</Text>
        )}
        <View style={{ marginTop: SIZE.space }}>
          <BotonLleno variante="principal" label={ES.datos.guardar} busy={busy} onPress={() => void guardar()} />
        </View>
      </Formulario>
    </View>
  );
}
