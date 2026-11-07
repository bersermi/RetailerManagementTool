import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, Text, View } from 'react-native';

import type { Kitchen } from '@/api/cocinas';
import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';
import { Circulo } from '@/ui/Circulo';

// ============================================================================
// THE KITCHEN'S ROW ON A DISH'S PAGE — her circle, her name and how far she is, as the
// proposals page drew it (*Fonda Doña Mari · 350 m*; her rating comes with `10.5b`).
// Plan task `10.5-iv-a-ii`. A tap opens her page. Since `10.5-v-c-ii` it is handed the
// distance in words, so it never measures — Wera Cocina's copy shows none.
// ============================================================================

export function FilaCocina({ cocina, distancia, onPress }: { cocina: Kitchen; distancia: string | null; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={ES.platillo.verCocina(cocina.name)}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: SIZE.tapTarget,
        flexDirection: 'row',
        alignItems: 'center',
        gap: SIZE.rowGap,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Circulo cocina={cocina} size={32} />
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={{ fontSize: SIZE.bodySize - 1, fontWeight: '700', color: PALETTE.tinta }}>
          {cocina.name}
        </Text>
        {distancia !== null && <Text style={{ fontSize: SIZE.smallSize, color: PALETTE.tintaApagada }}>{distancia}</Text>}
      </View>
      <MaterialCommunityIcons name="chevron-right" size={SIZE.iconSize} color={PALETTE.tintaApagada} />
    </Pressable>
  );
}
