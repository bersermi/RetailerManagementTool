import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TITULO } from '@/theme/letra';
import { PALETTE, SIZE } from '@/theme/palette';

// ============================================================================
// A TAB'S HEAD — ITS NAME IN NUNITO, A LINE OF STATE UNDER IT, AND AT MOST ONE THING
// AT ITS RIGHT. Plan task `10.5-v-b`, the family-shell page's head (`.hd`): on the
// screen's own cream, with no *Volver* — a tab is never closed. A screen pushed over
// the tabs keeps `@/ui/Banda`, with its *Volver*.
//
// ⚠️ STATE FIRST, BEFORE ANYTHING TAPPABLE (ADR-035 §2.8): the line under the name says
// where she stands — where the list is measured from, whose account this is — and the
// screen's actions come after it. ⚠️ On *Cerca* it is the head of the sheet that slides
// over the map (`10.5-iv-b-i`, the owner's C) — `enHoja`: under the sheet's handle, so
// with no room for the phone's clock above it.
// ============================================================================

export function Cabeza({
  titulo,
  derecha = null,
  enHoja = false,
  children = null,
}: {
  titulo: string;
  derecha?: ReactNode;
  enHoja?: boolean;
  children?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        backgroundColor: PALETTE.fondo,
        paddingTop: enHoja ? SIZE.rowGap / 2 : insets.top + SIZE.space,
        paddingBottom: SIZE.space,
        paddingHorizontal: SIZE.space * 1.5,
        borderBottomWidth: 1,
        borderBottomColor: PALETTE.linea,
        gap: SIZE.rowGap / 2,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SIZE.rowGap, minHeight: 36 }}>
        <Text
          accessibilityRole="header"
          numberOfLines={1}
          style={{ flex: 1, fontSize: SIZE.titleSize, ...TITULO, color: PALETTE.tinta }}
        >
          {titulo}
        </Text>
        {derecha}
      </View>
      {children}
    </View>
  );
}
