// ============================================================================
// THE STRIP A COUNTER SHOWS WHILE IT HOLDS A CORRECTION — *Corrigiendo la venta
// de ayer, 20:41 · $45* and *Cancelar corrección*. Plan task `8g`, the owner's
// ruling of 2026-10-20 over the review's problem 1: a cart handed back by
// `Corregir` looked like any other, so a new customer's products could join it
// and be recorded as yesterday's sale, and emptying it lost the sale for good.
//
// ⚠️ `R14`: Vender, Comprar and Desperdicio each draw it. The line is
// `correctingLine`'s (`@/api/corrections`); *Cancelar corrección* opens the
// counter's own *Vaciar carrito* box, which then asks in the correction's words.
// ============================================================================

import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, Text, View } from 'react-native';

import { ES } from '@/strings';
import { useDensity } from '@/theme/DensityProvider';
import { PALETTE } from '@/theme/palette';

export function Corrigiendo({ line, onCancel }: { line: string; onCancel: () => void }) {
  const { scale } = useDensity();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale.rowGap,
        backgroundColor: PALETTE.atencionSuave,
        borderRadius: scale.space * 0.75,
        paddingHorizontal: scale.space,
        paddingVertical: scale.rowGap / 2,
      }}
    >
      <MaterialCommunityIcons name="pencil-outline" size={scale.iconSize * 0.8} color={PALETTE.atencion} />
      <Text style={{ flex: 1, fontSize: scale.smallSize, fontWeight: '600', color: PALETTE.tinta }}>{line}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={onCancel}
        style={{ minHeight: scale.tapTarget, justifyContent: 'center' }}
      >
        <Text style={{ fontSize: scale.smallSize, fontWeight: '700', color: PALETTE.error }}>{ES.correcting.cancel}</Text>
      </Pressable>
    </View>
  );
}
