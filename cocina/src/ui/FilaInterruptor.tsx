import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';
import { Pressable, Text, View } from 'react-native';

import { PALETTE, SIZE } from '@/theme/palette';

// ============================================================================
// A ROW WITH A SWITCH — her settings' screens (`10.5b-iv-c`), the family-shell page's
// `.gr` with its `.switch` (*Cómo te pagan*, *Para llevar o comer aquí*). `@/ui/Fila`'s
// layout, the switch at its end; the WHOLE ROW is the target, as in the drawing.
//
// ⚠️ DRAWN, NOT ANIMATED: Reanimated is let into three modules only (`test/pestanas.test.ts`),
// and a switch that jumps is read at once. ⚠️ A ROW THAT CANNOT CHANGE IS STILL DRAWN — *Efectivo*,
// always on, and the last way a kitchen hands plates over — with `fijo`: no tap, its words say why.
// ============================================================================

export function FilaInterruptor({
  icono,
  titulo,
  detalle = null,
  encendido,
  onCambiar,
  fijo = false,
  disabled = false,
}: {
  icono: ComponentProps<typeof MaterialCommunityIcons>['name'];
  titulo: string;
  detalle?: string | null;
  encendido: boolean;
  onCambiar?: (encendido: boolean) => void;
  /** It cannot be changed here: drawn, never tappable. */
  fijo?: boolean;
  /** A save is out: nothing changes until it answers. */
  disabled?: boolean;
}) {
  const quieto = fijo || disabled || onCambiar === undefined;
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={detalle === null ? titulo : `${titulo}. ${detalle}`}
      accessibilityState={{ checked: encendido, disabled: quieto }}
      disabled={quieto}
      onPress={() => onCambiar?.(!encendido)}
      style={({ pressed }) => ({
        minHeight: SIZE.tapTarget + SIZE.rowGap,
        flexDirection: 'row',
        alignItems: 'center',
        gap: SIZE.space,
        paddingHorizontal: SIZE.space,
        paddingVertical: SIZE.space,
        backgroundColor: pressed ? PALETTE.fondo : PALETTE.superficie,
      })}
    >
      <MaterialCommunityIcons name={icono} size={SIZE.iconSize} color={PALETTE.tintaApagada} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontSize: SIZE.bodySize - 1, fontWeight: '600', color: PALETTE.tinta }}>{titulo}</Text>
        {detalle !== null && (
          <Text style={{ fontSize: SIZE.smallSize - 0.6, lineHeight: 18, color: PALETTE.tintaApagada }}>{detalle}</Text>
        )}
      </View>
      <View
        style={{
          width: 46,
          height: 28,
          borderRadius: 14,
          padding: 3,
          justifyContent: 'center',
          alignItems: encendido ? 'flex-end' : 'flex-start',
          backgroundColor: encendido ? PALETTE.accion : PALETTE.linea,
          opacity: fijo ? 0.55 : disabled ? 0.7 : 1,
        }}
      >
        <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: PALETTE.superficie }} />
      </View>
    </Pressable>
  );
}
