import { Pressable, Text, View } from 'react-native';

import type { Dish, Kitchen, Offer } from '@/vecinos/cocinas';
import { colorOf, defaultsFor } from '@/api/pagina';
import { ventanaTexto } from '@/vecinos/lista';
import { VECINOS as ES } from '@/strings';
import { HUES } from '@/theme/colores';
import { PALETTE, SIZE } from '@/theme/palette';
import { Circulo } from '@/vecinos/ui/Circulo';
import { Dibujo } from '@/ui/Dibujo';
import { Foto } from '@/vecinos/ui/Foto';
import { Precio, Quedan, Sorpresa } from '@/vecinos/ui/Precio';

// ============================================================================
// ONE DISH, AS ITACATE'S LIST SHOWS IT — at the foot of *Tu oferta de hoy*, filling in
// as she types. ⚠️ ITACATE'S `itacate/src/ui/TarjetaPlatillo.tsx`, COPIED — plan task
// `10.5-v-d`, as `10.5-v-c-ii` copied Itacate's two pages: this file is Itacate's below
// its imports, and `test/vecinos.test.ts` holds it there code for code. A change is made
// in Itacate's file and copied here in the same PR, or that test is red. Only its imports
// differ: Itacate's parts and words live under `@/vecinos/` and `VECINOS` here.
// ============================================================================

/** The picture's shape on the card — a wide strip, as the drawing's cards. */
const FRANJA = 16 / 7;

export function TarjetaPlatillo({
  cocina,
  oferta,
  platillo,
  distancia,
  ahora,
  onPress,
}: {
  cocina: Kitchen;
  oferta: Offer;
  platillo: Dish;
  distancia: string | null;
  ahora: Date;
  onPress: () => void;
}) {
  const color = colorOf(cocina.page, cocina.giro);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={ES.cerca.abrirPlatillo(platillo.name, cocina.name)}
      onPress={onPress}
      style={({ pressed }) => ({
        borderWidth: 1,
        borderColor: PALETTE.linea,
        borderRadius: SIZE.space,
        overflow: 'hidden',
        backgroundColor: PALETTE.superficie,
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <View style={{ width: '100%', aspectRatio: FRANJA, overflow: 'hidden', backgroundColor: HUES[color] }}>
        <Dibujo dibujo={defaultsFor(cocina.giro).dibujo} color={color} modo="portada" />
        <Foto path={platillo.photo} cocinaId={cocina.id} size="grande" />
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            flexDirection: 'row',
            alignItems: 'center',
            gap: SIZE.rowGap,
            paddingHorizontal: SIZE.space,
            paddingVertical: SIZE.rowGap / 2,
            backgroundColor: 'rgba(0, 0, 0, 0.42)',
          }}
        >
          <Circulo cocina={cocina} size={28} />
          <Text numberOfLines={1} style={{ flex: 1, fontSize: SIZE.smallSize + 1, fontWeight: '700', color: PALETTE.superficie }}>
            {cocina.name}
          </Text>
        </View>
      </View>
      <View style={{ paddingHorizontal: SIZE.space, paddingTop: SIZE.rowGap, paddingBottom: SIZE.space, gap: SIZE.rowGap / 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SIZE.rowGap }}>
          <Text numberOfLines={2} style={{ flexShrink: 1, fontSize: SIZE.bodySize, fontWeight: '700', color: PALETTE.tinta }}>
            {platillo.name}
          </Text>
          {platillo.surprise && <Sorpresa />}
          <View style={{ flex: 1 }} />
          {distancia !== null && <Text style={{ fontSize: SIZE.smallSize, color: PALETTE.tintaApagada }}>{distancia}</Text>}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SIZE.rowGap }}>
          <Precio platillo={platillo} color={color} />
          <View style={{ flex: 1 }} />
          <Quedan platillo={platillo} />
        </View>
        <Text style={{ fontSize: SIZE.smallSize, color: PALETTE.tintaApagada }}>{ventanaTexto(oferta, ahora)}</Text>
      </View>
    </Pressable>
  );
}
