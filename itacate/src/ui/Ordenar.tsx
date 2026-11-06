import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { ORDENES, type Orden } from '@/lib/lista';
import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';
import { Hoja } from '@/ui/Hoja';
import { Opcion } from '@/ui/Opcion';

// ============================================================================
// *ORDENAR* — HER PICK OF THE LIST'S ORDER. Plan task `10.5-iv-a-iv`, the owner's
// answer 2 of 2026-11-05 (*"there are many restaurants in the pilot neighborhood and
// we will want the user to be able to sort"*); since `10.5-v-b` drawn as the family-
// shell page draws it: one button at the head of the list saying the order in use
// (*Ordenar: Ahora*), opening a sheet with each order and a line under it.
//
// ⚠️ IT DECIDES NOTHING: which orders exist, the one the list opens on and what each
// does are `@/lib/lista`'s (`ORDENES`, `ORDEN_INICIAL`, `ordenDe`), pure and pinned;
// the pick is the list's state, so it lasts while the list does. A pick closes the
// sheet: the list she came for is under it. ⚠️ NO CHECK CAN SEE IT (ADR-035 §2.11):
// the phone is its instrument.
// ============================================================================

export function Ordenar({ orden, onOrden }: { orden: Orden; onOrden: (orden: Orden) => void }) {
  const [abierta, setAbierta] = useState(false);
  const enUso = ES.cerca.ordenarPor(ES.cerca.orden[orden]);
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={enUso}
        onPress={() => setAbierta(true)}
        hitSlop={{ top: SIZE.rowGap, bottom: SIZE.rowGap }}
        style={({ pressed }) => ({
          minHeight: SIZE.tapTarget - SIZE.rowGap * 2,
          flexDirection: 'row',
          alignItems: 'center',
          gap: SIZE.rowGap / 2 + 2,
          paddingHorizontal: SIZE.space,
          borderRadius: SIZE.tapTarget,
          borderWidth: 1,
          borderColor: PALETTE.linea,
          backgroundColor: PALETTE.superficie,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <MaterialCommunityIcons name="sort" size={16} color={PALETTE.tinta} />
        <Text style={{ fontSize: SIZE.smallSize, fontWeight: '600', color: PALETTE.tinta }}>{enUso}</Text>
      </Pressable>
      <Hoja visible={abierta} titulo={ES.cerca.ordenar} onCerrar={() => setAbierta(false)}>
        <View style={{ gap: SIZE.rowGap }}>
          {ORDENES.map((cual) => (
            <Opcion
              key={cual}
              titulo={ES.cerca.orden[cual]}
              detalle={ES.cerca.ordenDetalle[cual]}
              elegida={cual === orden}
              onPress={() => {
                onOrden(cual);
                setAbierta(false);
              }}
            />
          ))}
        </View>
      </Hoja>
    </>
  );
}
