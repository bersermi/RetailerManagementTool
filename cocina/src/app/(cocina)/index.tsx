import { useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useMyKitchens } from '@/api/hooks';
import { openKitchen } from '@/api/kitchen';
import { useAuth } from '@/auth/AuthProvider';
import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';
import { Banda } from '@/ui/Banda';
import { BotonLleno } from '@/ui/BotonLleno';

// ============================================================================
// HER KITCHEN. Plan task `10.4b-iii-a` — and the screen every launch opens on,
// so it is also where the app waits while the guard finds out who is here.
//
// ⚠️ THREE THINGS IT DRAWS, AND ONLY ONE IS HER KITCHEN:
//   - nobody signed in yet, or her kitchens not read yet: the band and a wheel
//     (the guard moves her the moment it knows — `@/auth/guard`);
//   - the read FAILED (no signal at launch): a sentence and *Intentar de
//     nuevo*, never *Registra tu cocina* — `unknown` is not `none`;
//   - her kitchen: its name in the band.
// ⚠️ A PLACEHOLDER UNTIL `10.4b-iii-b` (her kitchen's address and pin) AND
// `10.4b-iv` (publishing): nothing in this app makes a kitchen yet, so no login
// reaches the third state but through the database.
// ============================================================================
export default function TuCocina() {
  const insets = useSafeAreaInsets();
  const { session, signOut } = useAuth();
  const kitchens = useMyKitchens();
  const kitchen = openKitchen(kitchens.data);
  const [leaving, setLeaving] = useState(false);

  async function leave() {
    if (leaving) return;
    setLeaving(true);
    try {
      await signOut();
    } finally {
      setLeaving(false);
    }
  }

  const body = { paddingHorizontal: SIZE.space * 2, paddingTop: SIZE.space * 2, paddingBottom: SIZE.space * 2 + insets.bottom, gap: SIZE.space };

  if (kitchen === null) {
    const failed = session !== null && kitchens.isError && kitchens.data === undefined;
    return (
      <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
        <Banda titulo={ES.nombre} />
        <View style={body}>
          {failed ? (
            <>
              <Text style={{ fontSize: SIZE.bodySize, color: PALETTE.tinta }}>{ES.cocina.sinLeer}</Text>
              <BotonLleno
                variante="principal"
                label={ES.cocina.otraVez}
                busy={kitchens.isFetching}
                onPress={() => void kitchens.refetch()}
              />
            </>
          ) : session !== null ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SIZE.rowGap }}>
              <ActivityIndicator color={PALETTE.accion} />
              <Text style={{ fontSize: SIZE.bodySize, color: PALETTE.tintaApagada }}>{ES.cocina.leyendo}</Text>
            </View>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
      <Banda titulo={kitchen.displayName} antetitulo={ES.cocina.antetitulo} />
      <ScrollView contentContainerStyle={body}>
        <Text style={{ fontSize: SIZE.bodySize, lineHeight: 22, color: PALETTE.tinta }}>{ES.cocina.pronto}</Text>
        <View style={{ marginTop: SIZE.space }}>
          <BotonLleno variante="discreto" label={ES.auth.signOut} busy={leaving} onPress={() => void leave()} />
        </View>
      </ScrollView>
    </View>
  );
}
