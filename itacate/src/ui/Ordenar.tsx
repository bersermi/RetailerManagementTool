import { Pressable, Text, View } from 'react-native';

import { ORDENES, type Orden } from '@/lib/lista';
import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';

// ============================================================================
// *ORDENAR* — HER PICK OF THE LIST'S ORDER. Plan task `10.5-iv-a-iv`, the owner's
// answer 2 of 2026-11-05 (*"there are many restaurants in the pilot neighborhood and
// we will want the user to be able to sort"*), drawn as `10.5-iv-a-iii`'s page drew
// it: one row at the head of the list, a button per order, the one in use filled.
//
// ⚠️ IT DECIDES NOTHING: which orders exist, the one the list opens on and what each
// does are `@/lib/lista`'s (`ORDENES`, `ORDEN_INICIAL`, `ordenDe`), pure and pinned;
// the pick is the list's state, so it lasts while the list does. ⚠️ NO CHECK CAN SEE
// IT (ADR-035 §2.11): the phone is its instrument.
// ============================================================================

export function Ordenar({ orden, onOrden }: { orden: Orden; onOrden: (orden: Orden) => void }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: SIZE.rowGap }}>
      <Text style={{ fontSize: SIZE.smallSize, color: PALETTE.tintaApagada }}>{ES.cerca.ordenar}</Text>
      {ORDENES.map((cual) => {
        const elegido = cual === orden;
        return (
          <Pressable
            key={cual}
            accessibilityRole="button"
            accessibilityLabel={ES.cerca.ordenarPor(ES.cerca.orden[cual])}
            accessibilityState={{ selected: elegido }}
            onPress={() => onOrden(cual)}
            hitSlop={{ top: SIZE.rowGap, bottom: SIZE.rowGap }}
            style={({ pressed }) => ({
              minHeight: SIZE.tapTarget - SIZE.rowGap * 2,
              justifyContent: 'center',
              paddingHorizontal: SIZE.space,
              borderRadius: SIZE.tapTarget,
              borderWidth: 1,
              borderColor: elegido ? PALETTE.itacate : PALETTE.linea,
              backgroundColor: elegido ? PALETTE.itacate : PALETTE.superficie,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text style={{ fontSize: SIZE.smallSize, fontWeight: '600', color: elegido ? PALETTE.superficie : PALETTE.tinta }}>
              {ES.cerca.orden[cual]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
