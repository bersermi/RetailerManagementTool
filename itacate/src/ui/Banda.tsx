// ============================================================================
// THE BAND AT THE TOP OF A SCREEN: a small line above, the title below. Plan tasks
// `10.5-iii-a`, `10.5-iv-a-i` (*Volver*) and `10.5-v-b` (Nunito).
//
// ⚠️ WERA'S `Banda` (`app/src/ui/Banda.tsx`), as Wera Cocina copied it
// (`cocina/src/ui/Banda.tsx`) — *Volver* included since `10.5-iv-a-i`: a word with an
// arrow, top left, above the title, because an iPhone has no back button. It heads
// the way in and every screen pushed OVER the tabs (a kitchen's page, a dish's,
// *Dónde buscar*); a tab draws `@/ui/Cabeza`, which has no *Volver*. ⚠️ SINCE
// `10.5-v-b` ITS TITLE IS IN NUNITO (`@/theme/letra`, the owner's ruling of
// 2026-11-05, as Wera's is), and the link `10.5-iv-a-i` put at its right — the list's
// *Tu cuenta* — is gone: *Tú*, a tab, is the way to her account.
// ============================================================================

import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TITULO } from '@/theme/letra';
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
        borderBottomWidth: 1,
        borderBottomColor: PALETTE.linea,
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
          style={{
            fontSize: SIZE.smallSize,
            fontWeight: '700',
            letterSpacing: 1,
            textTransform: 'uppercase',
            color: PALETTE.marca,
          }}
        >
          {antetitulo}
        </Text>
      )}
      <Text accessibilityRole="header" style={{ fontSize: SIZE.titleSize, ...TITULO, color: PALETTE.tinta }}>
        {titulo}
      </Text>
    </View>
  );
}
