import { Pressable, Text, View } from 'react-native';

import { PALETTE, SIZE } from '@/theme/palette';

// ============================================================================
// ONE OPTION OF FEW — *Ajustes de apartados › Quién puede apartar* (`10.5b-iv-c`), as
// `10.5b-ii`'s final design draws it (`.p-radio`): a ring, filled green when chosen,
// and its words. The whole row is the target; inside `@/ui/Grupo` with no icons.
// ============================================================================

export function FilaOpcion({
  titulo,
  elegida,
  onElegir,
  disabled = false,
}: {
  titulo: string;
  elegida: boolean;
  onElegir: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={titulo}
      accessibilityState={{ checked: elegida, disabled }}
      disabled={disabled}
      onPress={onElegir}
      style={({ pressed }) => ({
        minHeight: SIZE.tapTarget + SIZE.rowGap,
        flexDirection: 'row',
        alignItems: 'center',
        gap: SIZE.space,
        paddingHorizontal: SIZE.space,
        backgroundColor: pressed ? PALETTE.fondo : PALETTE.superficie,
        opacity: disabled && !elegida ? 0.6 : 1,
      })}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          borderWidth: elegida ? 7 : 2,
          borderColor: elegida ? PALETTE.accion : PALETTE.linea,
          backgroundColor: PALETTE.superficie,
        }}
      />
      <Text style={{ flex: 1, fontSize: SIZE.bodySize, fontWeight: elegida ? '700' : '600', color: PALETTE.tinta }}>{titulo}</Text>
    </Pressable>
  );
}
