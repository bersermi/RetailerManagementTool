import { Text, View } from 'react-native';

import type { Barra } from '@/lib/numeros';
import { PALETTE, SIZE } from '@/theme/palette';

// ============================================================================
// A SET OF BARS — *Tus días fuertes*, *Tus horas fuertes*. Plan task `10.9f`, the family-shell page's
// `bars` (round 7): a card with its title, then a row per day or hour — its label, a bar as long as its
// share of the largest, and its count. ⚠️ The count is always written: a bar's length is never the only
// way to read it (ADR-035 §2.11's palette row), and a zero keeps a sliver so the row reads as a row.
// ============================================================================

export function Barras({ titulo, barras }: { titulo: string; barras: readonly Barra[] }) {
  const mayor = Math.max(1, ...barras.map((b) => b.valor));
  return (
    <View
      style={{
        gap: SIZE.rowGap,
        padding: SIZE.space,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: PALETTE.linea,
        backgroundColor: PALETTE.superficie,
      }}
    >
      <Text style={{ fontSize: SIZE.bodySize, fontWeight: '800', color: PALETTE.tinta }}>{titulo}</Text>
      {barras.map((barra) => (
        <View
          key={barra.etiqueta}
          accessible
          accessibilityLabel={`${barra.etiqueta}: ${barra.valor}`}
          style={{ flexDirection: 'row', alignItems: 'center', gap: SIZE.rowGap }}
        >
          <Text style={{ width: 40, fontSize: SIZE.smallSize, color: PALETTE.tintaApagada }}>{barra.etiqueta}</Text>
          <View style={{ flex: 1, height: 10, borderRadius: 5, backgroundColor: PALETTE.accionSuave, overflow: 'hidden' }}>
            <View
              style={{
                width: `${Math.max(3, Math.round((barra.valor / mayor) * 100))}%`,
                height: '100%',
                borderRadius: 5,
                backgroundColor: PALETTE.accion,
              }}
            />
          </View>
          <Text style={{ width: 32, textAlign: 'right', fontSize: SIZE.smallSize, fontWeight: '700', color: PALETTE.tinta }}>
            {barra.valor}
          </Text>
        </View>
      ))}
    </View>
  );
}
