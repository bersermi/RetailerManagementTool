import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';
import { Pressable, Text, View } from 'react-native';

import { PALETTE, SIZE } from '@/theme/palette';

// ============================================================================
// ONE ROW OF *MI COCINA* — AN ICON, WHAT IT IS, A LINE UNDER IT, AND A CHEVRON WHEN IT
// OPENS SOMETHING. Plan task `10.5-v-c-i`: Itacate's row (`itacate/src/ui/Fila.tsx`,
// `10.5-v-b`), the family-shell page's `.gr`, copied — and a line under it that can
// say what is missing, in red (`falta`), as her kitchen's screen said it before. A row
// with no `onPress` is state, not a door: no chevron, nothing to tap.
// ============================================================================

export function Fila({
  icono,
  titulo,
  detalle = null,
  falta = false,
  onPress,
  ayuda,
}: {
  icono: ComponentProps<typeof MaterialCommunityIcons>['name'];
  titulo: string;
  detalle?: string | null;
  /** The line under it says what is missing — in the error's red, never the colour alone: its words say it. */
  falta?: boolean;
  onPress?: () => void;
  /** What a screen reader says when the row's words do not say where it goes. */
  ayuda?: string;
}) {
  const contenido = (
    <>
      <MaterialCommunityIcons name={icono} size={SIZE.iconSize} color={PALETTE.tintaApagada} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontSize: SIZE.bodySize - 1, fontWeight: '600', color: PALETTE.tinta }}>{titulo}</Text>
        {detalle !== null && (
          <Text
            style={{
              fontSize: SIZE.smallSize - 0.6,
              lineHeight: 18,
              fontWeight: falta ? '600' : '400',
              color: falta ? PALETTE.error : PALETTE.tintaApagada,
            }}
          >
            {detalle}
          </Text>
        )}
      </View>
      {onPress !== undefined && <MaterialCommunityIcons name="chevron-right" size={20} color={PALETTE.tintaApagada} />}
    </>
  );
  const fila = {
    minHeight: SIZE.tapTarget + SIZE.rowGap,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZE.space,
    paddingHorizontal: SIZE.space,
    paddingVertical: SIZE.space,
  } as const;
  if (onPress === undefined) return <View style={fila}>{contenido}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={ayuda ?? (detalle === null ? titulo : `${titulo}. ${detalle}`)}
      onPress={onPress}
      style={({ pressed }) => [fila, { backgroundColor: pressed ? PALETTE.fondo : PALETTE.superficie }]}
    >
      {contenido}
    </Pressable>
  );
}
