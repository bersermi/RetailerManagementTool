import { Pressable, Text, View } from 'react-native';

import { colorOf, defaultsFor } from '@/api/pagina';
import { distanciaTexto } from '@/lib/distancia';
import { ventanaTexto, type Tarjeta } from '@/lib/lista';
import { ES } from '@/strings';
import { HUES } from '@/theme/colores';
import { PALETTE, SIZE } from '@/theme/palette';
import { Circulo } from '@/ui/Circulo';
import { Dibujo } from '@/ui/Dibujo';
import { Foto } from '@/ui/Foto';
import { Precio, Quedan, Sorpresa } from '@/ui/Precio';

// ============================================================================
// ONE DISH ON OFFER, AS THE LIST SHOWS IT. Plan task `10.5-iv-a-i`, proposal B's
// list as the proposals page drew it (https://claude.ai/artifact/EaiMkYqn2skPXn7MiKeULu):
// the dish's photo across the top — else her trade's drawing on her colour — with
// her circle and her kitchen's name over its foot; below, the dish and its
// distance, the price with the *vale* struck through and the saving on her colour,
// *Quedan 2* or *Último*, and the window.
//
// ⚠️ IT DECIDES NOTHING: every word and number is `@/lib/lista`'s, pure and pinned.
// ⚠️ SINCE `10.5-iv-a-ii` THE WHOLE CARD IS ONE BUTTON — it opens the dish's page;
// where it goes is the list's (`onPress`). Its price and badges are `@/ui/Precio`'s,
// drawn alike on both pages. ⚠️ NO CHECK CAN SEE IT (ADR-035 §2.11): the phone is
// its instrument.
// ============================================================================

/** The picture's shape on the card — a wide strip, as the drawing's cards. */
const FRANJA = 16 / 7;

export function TarjetaPlatillo({
  tarjeta,
  ahora,
  onPress,
}: {
  tarjeta: Extract<Tarjeta, { kind: 'platillo' }>;
  ahora: Date;
  onPress: () => void;
}) {
  const { cocina, oferta, platillo, metros } = tarjeta;
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
          {metros !== null && (
            <Text style={{ fontSize: SIZE.smallSize, color: PALETTE.tintaApagada }}>{distanciaTexto(metros)}</Text>
          )}
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
