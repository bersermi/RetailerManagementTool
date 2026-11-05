import type { ReactNode } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PALETTE, SIZE } from '@/theme/palette';
import { Atras } from '@/ui/Atras';

// ============================================================================
// A PAGE WITH NOTHING TO SHOW — while the door is asked, when it failed, or once the
// kitchen or the dish is gone (a window that ended, a dish she took down, a kitchen
// 14 days quiet). Plan task `10.5-iv-a-ii`. The way back stays where both pages put
// it, and what can still be opened sits under the line (`children`).
// ============================================================================

export function PaginaVacia({ texto, esperando = false, children }: { texto: string; esperando?: boolean; children?: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: PALETTE.fondo, paddingTop: insets.top }}>
      <View style={{ height: SIZE.tapTarget + SIZE.space * 2 }}>
        <Atras />
      </View>
      <View style={{ paddingHorizontal: SIZE.space * 2, paddingVertical: SIZE.space * 2, gap: SIZE.space * 2 }}>
        <View style={{ alignItems: 'center', gap: SIZE.space }}>
          {esperando && <ActivityIndicator color={PALETTE.accion} />}
          <Text style={{ fontSize: SIZE.bodySize, lineHeight: 22, color: PALETTE.tintaApagada, textAlign: 'center' }}>{texto}</Text>
        </View>
        {children}
      </View>
    </View>
  );
}
