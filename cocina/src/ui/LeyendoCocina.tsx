import { ActivityIndicator, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useMyKitchens } from '@/api/hooks';
import { useAuth } from '@/auth/AuthProvider';
import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';
import { Banda } from '@/ui/Banda';
import { BotonLleno } from '@/ui/BotonLleno';

// ============================================================================
// WHAT A TAB DRAWS BEFORE HER KITCHEN IS KNOWN. Plan task `10.5-v-c-i` — her kitchen's
// screen's first branch (`10.4b-iii-a`), now each tab's: nobody signed in yet, or her
// kitchens not read yet, the band and a wheel (the guard moves her the moment it knows,
// `@/auth/guard`); the read FAILED (no signal at launch), a sentence and *Intentar de
// nuevo*, never *Registra tu cocina* — `unknown` is not `none`.
// ============================================================================

export function LeyendoCocina({ titulo }: { titulo: string }) {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const kitchens = useMyKitchens();
  const failed = session !== null && kitchens.isError && kitchens.data === undefined;
  return (
    <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
      <Banda titulo={titulo} />
      <View style={{ padding: SIZE.space * 2, paddingBottom: SIZE.space * 2 + insets.bottom, gap: SIZE.space }}>
        {failed ? (
          <>
            <Text style={{ fontSize: SIZE.bodySize, color: PALETTE.tinta }}>{ES.cocina.sinLeer}</Text>
            <BotonLleno variante="principal" label={ES.cocina.otraVez} busy={kitchens.isFetching} onPress={() => void kitchens.refetch()} />
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
