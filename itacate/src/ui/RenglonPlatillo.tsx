import { Pressable, Text, View } from 'react-native';

import type { Dish, Kitchen, Offer } from '@/api/cocinas';
import { colorOf, defaultsFor } from '@/api/pagina';
import { ventanaTexto } from '@/lib/lista';
import { HUES } from '@/theme/colores';
import { PALETTE, SIZE } from '@/theme/palette';
import { Dibujo } from '@/ui/Dibujo';
import { Foto } from '@/ui/Foto';
import { Precio, Quedan, Sorpresa } from '@/ui/Precio';

// ============================================================================
// ONE DISH UNDER *HOY*, ON HER PAGE — a row that opens the dish's page. Plan task
// `10.5-iv-a-ii`, proposal B's kitchen page as drawn: the dish's name (*Sorpresa* for
// a bag), its window, the price with the *vale* struck through and the saving,
// *Quedan 2*, and a square picture at the right — its photo, else her trade's drawing
// on her colour. ⚠️ It decides nothing: the words are `@/lib/lista`'s.
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
