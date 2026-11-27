// ============================================================================
// THE BAND AT THE TOP OF A SCREEN: a small line above, the title below. Plan tasks
// `10.4b-iii-a` and `10.4b-iii-b` (*Volver*).
//
// ⚠️ WERA'S `Banda` (`app/src/ui/Banda.tsx`), and since `10.5-v-c-i` its title face
// too: Nunito, loaded before the first screen (`@/theme/letra`), the owner's ruling of
// 2026-11-05 (*"Nunito titles in both apps, as Wera"*). Drawn by every screen of this app.
//
// ⚠️ *VOLVER* IS WERA'S TOO: a word with an arrow, top left, above the title —
// an iPhone has no back button, and a screen pushed on top needs a way back that
// a person can see. Without it the band is exactly what `10.4b-iii-a` drew.
// ============================================================================

import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { letraEncabezado, letraTitulo } from '@/theme/letra';
import { PALETTE, SIZE } from '@/theme/palette';

export function Banda({
  titulo,
  antetitulo = null,
  volver = null,
}: {
  titulo: string;
  antetitulo?: string | null;
  volver?: { readonly label: string; readonly onPress: () => void } | null;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        backgroundColor: PALETTE.banda,
        paddingTop: insets.top + (volver !== null ? SIZE.rowGap : SIZE.space * 2),
        paddingBottom: SIZE.space + SIZE.rowGap,
        paddingHorizontal: SIZE.space * 2,
        gap: SIZE.rowGap / 2,
      }}
    >
      {volver !== null && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={volver.label}
          onPress={volver.onPress}
          hitSlop={SIZE.rowGap}
          style={{ minHeight: SIZE.tapTarget, justifyContent: 'center', alignSelf: 'flex-start' }}
        >
          <Text style={{ fontSize: SIZE.bodySize, fontWeight: '600', color: PALETTE.accion }}>{`‹ ${volver.label}`}</Text>
        </Pressable>
      )}
      {antetitulo !== null && (
        <Text
          style={{ ...letraEncabezado(SIZE), color: PALETTE.marca }}
        >
          {antetitulo}
        </Text>
      )}
      <Text accessibilityRole="header" style={{ ...letraTitulo(SIZE), color: PALETTE.tinta }}>
        {titulo}
      </Text>
    </View>
  );
}
