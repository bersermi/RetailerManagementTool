import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, Text, View } from 'react-native';

import type { Kitchen } from '@/vecinos/cocinas';
import { VECINOS as ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';
import { Circulo } from '@/vecinos/ui/Circulo';

// ============================================================================
// THE KITCHEN'S ROW ON A DISH'S PAGE.
// ⚠️ ITACATE'S `itacate/src/ui/FilaCocina.tsx`, COPIED — plan task `10.5-v-c-ii`:
// *Así la ven* and *Ver como la ven* are Itacate's two pages inside Wera Cocina, one
// and the same screen, so this file is Itacate's below its imports, and
// `test/vecinos.test.ts` holds it there code for code. A change is made in Itacate's
// file and copied here in the same PR, or that test is red. Only its imports differ:
// Itacate's parts and words live under `@/vecinos/` and `VECINOS` here.
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
