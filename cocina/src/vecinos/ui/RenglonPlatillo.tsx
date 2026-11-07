import { Pressable, Text, View } from 'react-native';

import type { Dish, Kitchen, Offer } from '@/vecinos/cocinas';
import { colorOf, defaultsFor } from '@/api/pagina';
import { ventanaTexto } from '@/vecinos/lista';
import { HUES } from '@/theme/colores';
import { PALETTE, SIZE } from '@/theme/palette';
import { Dibujo } from '@/ui/Dibujo';
import { Foto } from '@/vecinos/ui/Foto';
import { Precio, Quedan, Sorpresa } from '@/vecinos/ui/Precio';

// ============================================================================
// ONE DISH UNDER *HOY*, ON HER PAGE.
// ⚠️ ITACATE'S `itacate/src/ui/RenglonPlatillo.tsx`, COPIED — plan task `10.5-v-c-ii`:
// *Así la ven* and *Ver como la ven* are Itacate's two pages inside Wera Cocina, one
// and the same screen, so this file is Itacate's below its imports, and
// `test/vecinos.test.ts` holds it there code for code. A change is made in Itacate's
// file and copied here in the same PR, or that test is red. Only its imports differ:
// Itacate's parts and words live under `@/vecinos/` and `VECINOS` here.
// ============================================================================

const CUADRO = 76;

export function RenglonPlatillo({
  cocina,
  oferta,
  platillo,
  ahora,
  onPress,
}: {
  cocina: Kitchen;
  oferta: Offer;
  platillo: Dish;
  ahora: Date;
  onPress: () => void;
}) {
  const color = colorOf(cocina.page, cocina.giro);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={platillo.name}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: SIZE.space,
        paddingVertical: SIZE.space,
        borderBottomWidth: 1,
        borderBottomColor: PALETTE.linea,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View style={{ flex: 1, gap: SIZE.rowGap / 2 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: SIZE.rowGap }}>
          <Text style={{ flexShrink: 1, fontSize: SIZE.bodySize, fontWeight: '700', color: PALETTE.tinta }}>{platillo.name}</Text>
          {platillo.surprise && <Sorpresa />}
        </View>
        <Text style={{ fontSize: SIZE.smallSize, color: PALETTE.tintaApagada }}>{ventanaTexto(oferta, ahora)}</Text>
        <Precio platillo={platillo} color={color} />
        <View style={{ flexDirection: 'row' }}>
          <Quedan platillo={platillo} />
        </View>
      </View>
      <View style={{ width: CUADRO, height: CUADRO, borderRadius: SIZE.space, overflow: 'hidden', backgroundColor: HUES[color] }}>
        <Dibujo dibujo={defaultsFor(cocina.giro).dibujo} color={color} modo="cuadro" />
        <Foto path={platillo.photo} cocinaId={cocina.id} size="chica" />
      </View>
    </Pressable>
  );
}
