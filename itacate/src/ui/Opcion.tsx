import { Pressable, Text, View } from 'react-native';

import { PALETTE, SIZE } from '@/theme/palette';

// ============================================================================
// ONE CHOICE OF SEVERAL — A ROW WITH A RADIO. Plan task `10.5-v-b`: *Ordenar*'s three
// orders and *Dónde buscar*'s two places, as the family-shell page draws them — its
// name, a line under it, and the chosen one in Itacate's blue with its tint.
// ⚠️ NEVER COLOUR ALONE (ADR-035 §2.11's palette row): the chosen row also wears a
// filled radio and a heavier border, and a screen reader hears *checked*.
// ============================================================================

export function Opcion({
  titulo,
  detalle = null,
  elegida,
  onPress,
}: {
  titulo: string;
  detalle?: string | null;
  elegida: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: elegida }}
      accessibilityLabel={detalle === null ? titulo : `${titulo}. ${detalle}`}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: SIZE.tapTarget,
        flexDirection: 'row',
        alignItems: 'center',
        gap: SIZE.space,
        padding: SIZE.space,
        borderRadius: 14,
        borderWidth: elegida ? 2 : 1.5,
        borderColor: elegida ? PALETTE.accion : PALETTE.linea,
        backgroundColor: elegida ? PALETTE.accionSuave : PALETTE.superficie,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: 10,
          borderWidth: elegida ? 6 : 2,
          borderColor: elegida ? PALETTE.accion : PALETTE.linea,
          backgroundColor: PALETTE.superficie,
        }}
      />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontSize: SIZE.bodySize, fontWeight: '700', color: PALETTE.tinta }}>{titulo}</Text>
        {detalle !== null && (
          <Text style={{ fontSize: SIZE.smallSize, lineHeight: 19, color: PALETTE.tintaApagada }}>{detalle}</Text>
        )}
      </View>
    </Pressable>
  );
}
