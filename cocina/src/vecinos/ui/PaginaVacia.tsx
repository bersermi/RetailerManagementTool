import type { ReactNode } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PALETTE, SIZE } from '@/theme/palette';
import { Atras } from '@/vecinos/ui/Atras';

// ============================================================================
// A PAGE WITH NOTHING TO SHOW — once the dish is over while she looks.
// ⚠️ ITACATE'S `itacate/src/ui/PaginaVacia.tsx`, COPIED — plan task `10.5-v-c-ii`:
// *Así la ven* and *Ver como la ven* are Itacate's two pages inside Wera Cocina, one
// and the same screen, so this file is Itacate's below its imports, and
// `test/vecinos.test.ts` holds it there code for code. A change is made in Itacate's
// file and copied here in the same PR, or that test is red. Only its imports differ:
// Itacate's parts and words live under `@/vecinos/` and `VECINOS` here.
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
