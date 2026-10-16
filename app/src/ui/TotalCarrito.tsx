// ============================================================================
// THE TOTAL IN THE CARRITO'S FOOT — *Total* on the left, the figure on the right,
// and a word under the figure when there is something to say about it.
//
// ⚠️ `8g`, THE OWNER'S *BOARD 1* (2026-10-15), ON VENDER: until then the open
// Carrito showed every line's figure and not their sum, because the bar that
// carried it was under the sheet. ⚠️ `R14`: ROUND 4 (2026-10-16) GAVE COMPRAR THE
// SAME FOOT — his drawing of it, and his *"the geometries in common are the same"*
// — so it is the second file. Desperdicio has none: a write-off is counted, not
// charged.
//
// ⚠️ IT IS THE BAR'S OWN FIGURE (`reviewOf`'s `basket`), so the foot and the bar
// are one object in two places and the lines above still sum to it (§2.5 rule 5).
// ============================================================================

import { Text, View } from 'react-native';

import { formatMXN } from '@/format/mxn';
import { ES } from '@/strings';
import { useDensity } from '@/theme/DensityProvider';
import { PALETTE } from '@/theme/palette';

export function TotalCarrito({ centavos, note = null }: { centavos: number; note?: string | null }) {
  const { scale } = useDensity();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Text style={{ fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.tinta }}>{ES.counter.total}</Text>
      <View style={{ alignItems: 'flex-end', gap: scale.rowGap / 4 }}>
        <Text style={{ fontSize: scale.moneySize, fontWeight: '700', color: PALETTE.tinta }}>
          {formatMXN(centavos)}
        </Text>
        {note === null ? null : (
          <Text style={{ fontSize: scale.smallSize, fontWeight: '600', color: PALETTE.atencion }}>{note}</Text>
        )}
      </View>
    </View>
  );
}
