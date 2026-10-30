// ============================================================================
// THE BAND AT THE TOP OF A SCREEN: a small line above, the title below. Plan task
// `10.4b-iii-a`.
//
// ⚠️ WERA'S `Banda` (`app/src/ui/Banda.tsx`), its look without its title face:
// Wera loads its own letters before the first screen (`@/theme/letra`), Cocina
// draws the phone's bold for now — a face is a decision for the row that gives
// Cocina its look. Drawn by every screen of this app.
// ============================================================================

import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PALETTE, SIZE } from '@/theme/palette';

export function Banda({ titulo, antetitulo = null }: { titulo: string; antetitulo?: string | null }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        backgroundColor: PALETTE.banda,
        paddingTop: insets.top + SIZE.space * 2,
        paddingBottom: SIZE.space + SIZE.rowGap,
        paddingHorizontal: SIZE.space * 2,
        borderBottomWidth: 1,
        borderBottomColor: PALETTE.linea,
        gap: SIZE.rowGap / 2,
      }}
    >
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
      <Text accessibilityRole="header" style={{ fontSize: SIZE.titleSize, fontWeight: '700', color: PALETTE.tinta }}>
        {titulo}
      </Text>
    </View>
  );
}
