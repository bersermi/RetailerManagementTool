import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useKitchen, useKitchenGiros, useSaveGiro } from '@/api/hooks';
import type { Giro, Kitchen } from '@/api/kitchen';
import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';
import { Banda } from '@/ui/Banda';
import { BotonLleno } from '@/ui/BotonLleno';
import { Formulario } from '@/ui/Formulario';
import { Giros } from '@/ui/Giros';

// ============================================================================
// HER TRADE, GIVEN OR CHANGED FROM HER KITCHEN'S SCREEN — *Cambiar giro*, a door
// of its own since `10.4h` (the owner's ruling of 2026-11-03: the address and the
// trade apart, as two doors). Plan task `10.4b-iii-b` made it, with the address
// beside it, as *Giro y dirección*; the address is *Cambiar dirección*'s now
// (`(cocina)/direccion`).
//
// ⚠️ THE SIGN-UP'S TRADES (`@/ui/Giros`) HOLDING HERS — her own answer, not a
// proposal — and the same rule: a trade chosen. *Guardar* writes it by the owner's
// update only when it changed, and the form is drawn once both reads have answered,
// so it opens on her value. It is also the second door for a trade the sign-up
// could not write.
// ============================================================================
export default function CambiarGiro() {
  const kitchen = useKitchen();
  const giros = useKitchenGiros();

  if (kitchen === null || giros.data === undefined) {
    return (
      <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
        <Banda titulo={ES.giro.titulo} volver={{ label: ES.giro.volver, onPress: () => router.back() }} />
        <ActivityIndicator color={PALETTE.accion} style={{ marginTop: SIZE.space * 2 }} />
      </View>
    );
  }
  return <Form kitchen={kitchen} giros={giros.data} />;
}

function Form({ kitchen, giros }: { kitchen: Kitchen; giros: readonly Giro[] }) {
  const insets = useSafeAreaInsets();
  const { save, busy } = useSaveGiro();
  const [giro, setGiro] = useState<string | null>(kitchen.giroPrincipal);
  const [problem, setProblem] = useState<string | null>(null);

  async function guardar() {
    if (busy) return;
    if (giro === null) return setProblem(ES.registro.errores.giro);
    if (giro === kitchen.giroPrincipal) return router.back();
    const answer = await save({ kitchenId: kitchen.id, giro });
    setProblem(answer);
    if (answer === null) router.back();
  }

  return (
    <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
      <Banda
        titulo={ES.giro.titulo}
        antetitulo={kitchen.displayName}
        volver={{ label: ES.giro.volver, onPress: () => router.back() }}
      />
      <Formulario
        contentContainerStyle={{
          paddingHorizontal: SIZE.space * 2,
          paddingTop: SIZE.space * 2,
          paddingBottom: SIZE.space * 2 + insets.bottom,
          gap: SIZE.space,
        }}
      >
        <Giros giros={giros} chosen={giro} onChoose={setGiro} disabled={busy} />
        {problem !== null && (
          <Text style={{ fontSize: SIZE.bodySize, fontWeight: '600', color: PALETTE.error }}>{problem}</Text>
        )}
        <View style={{ marginTop: SIZE.space }}>
          <BotonLleno variante="principal" label={ES.giro.guardar} busy={busy} onPress={() => void guardar()} />
        </View>
      </Formulario>
    </View>
  );
}
