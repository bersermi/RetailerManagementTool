// ============================================================================
// THE BAND AT THE TOP OF A SCREEN: a small line above, the title below. Plan tasks
// `10.5-iii-a` and `10.5-iv-a-i` (*Volver*, and one link at its right).
//
// ⚠️ WERA'S `Banda` (`app/src/ui/Banda.tsx`), its look without its title face, as
// Wera Cocina copied it (`cocina/src/ui/Banda.tsx`) — *Volver* included since
// `10.5-iv-a-i`, when *Tu cuenta* became a screen pushed on top of the list: a word
// with an arrow, top left, above the title, because an iPhone has no back button.
// ⚠️ ONE ADDITION OF ITACATE'S, `accion`: a link at the title's right — the list's
// *Tu cuenta*, the way to her account from the one screen she lands on (Apple's
// 5.1.1(v) asks that deleting an account be easy to find). The phone's bold for
// now; a face is a decision for the row that gives Itacate its look.
// ============================================================================

import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PALETTE, SIZE } from '@/theme/palette';

export function Banda({
  titulo,
  antetitulo = null,
  volver = null,
  accion = null,
}: {
  titulo: string;
  antetitulo?: string | null;
  volver?: { readonly label: string; readonly onPress: () => void } | null;
  accion?: {
    readonly label: string;
    readonly icon: ComponentProps<typeof MaterialCommunityIcons>['name'];
    readonly onPress: () => void;
  } | null;
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
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SIZE.space }}>
        <Text
          accessibilityRole="header"
          style={{ flex: 1, fontSize: SIZE.titleSize, fontWeight: '700', color: PALETTE.tinta }}
        >
          {titulo}
        </Text>
        {accion !== null && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={accion.label}
            onPress={accion.onPress}
            hitSlop={SIZE.rowGap}
            style={{ minHeight: SIZE.tapTarget, flexDirection: 'row', alignItems: 'center', gap: SIZE.rowGap / 2 }}
          >
            <MaterialCommunityIcons name={accion.icon} size={SIZE.iconSize} color={PALETTE.accion} />
            <Text style={{ fontSize: SIZE.bodySize, fontWeight: '600', color: PALETTE.accion }}>{accion.label}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
