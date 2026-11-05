import { Text, View } from 'react-native';

import { colorOf, defaultsFor } from '@/api/pagina';
import { distanciaTexto } from '@/lib/distancia';
import { precioTexto, quedanTexto, ventanaTexto, type Tarjeta } from '@/lib/lista';
import { ES } from '@/strings';
import { HUES } from '@/theme/colores';
import { PALETTE, SIZE } from '@/theme/palette';
import { Circulo } from '@/ui/Circulo';
import { Dibujo } from '@/ui/Dibujo';
import { Foto } from '@/ui/Foto';

// ============================================================================
// ONE DISH ON OFFER, AS THE LIST SHOWS IT. Plan task `10.5-iv-a-i`, proposal B's
// list as the proposals page drew it (https://claude.ai/artifact/EaiMkYqn2skPXn7MiKeULu):
// the dish's photo across the top — else her trade's drawing on her colour — with
// her circle and her kitchen's name over its foot; below, the dish and its
// distance, the price with the *vale* struck through and the saving on her colour,
// *Quedan 2* or *Último*, and the window.
//
// ⚠️ IT DECIDES NOTHING: every word and number is `@/lib/lista`'s, pure and pinned.
// ⚠️ NOT A BUTTON YET: a dish's page is `10.5-iv-a-ii`. ⚠️ NO CHECK CAN SEE IT
// (ADR-035 §2.11): the phone is its instrument.
// ============================================================================

/** The picture's shape on the card — a wide strip, as the drawing's cards. */
const FRANJA = 16 / 7;

export function TarjetaPlatillo({ tarjeta, ahora }: { tarjeta: Extract<Tarjeta, { kind: 'platillo' }>; ahora: Date }) {
  const { cocina, oferta, platillo, metros } = tarjeta;
  const color = colorOf(cocina.page, cocina.giro);
  const precio = precioTexto(platillo);
  const quedan = quedanTexto(platillo);
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: PALETTE.linea,
        borderRadius: SIZE.space,
        overflow: 'hidden',
        backgroundColor: PALETTE.superficie,
      }}
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
          {platillo.surprise && (
            <Text
              style={{
                fontSize: SIZE.smallSize - 2,
                fontWeight: '700',
                color: PALETTE.marca,
                backgroundColor: PALETTE.banda,
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: 6,
                overflow: 'hidden',
              }}
            >
              {ES.cerca.sorpresa}
            </Text>
          )}
          <View style={{ flex: 1 }} />
          {metros !== null && (
            <Text style={{ fontSize: SIZE.smallSize, color: PALETTE.tintaApagada }}>{distanciaTexto(metros)}</Text>
          )}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SIZE.rowGap }}>
          <Text style={{ fontSize: SIZE.bodySize + 1, fontWeight: '800', color: PALETTE.tinta }}>{precio.precio}</Text>
          {precio.vale !== null && (
            <Text style={{ fontSize: SIZE.smallSize, color: PALETTE.tintaApagada, textDecorationLine: 'line-through' }}>
              {precio.vale}
            </Text>
          )}
          {precio.ahorro !== null && (
            <Text
              style={{
                fontSize: SIZE.smallSize - 2,
                fontWeight: '800',
                color: PALETTE.superficie,
                backgroundColor: HUES[color],
                paddingHorizontal: 5,
                paddingVertical: 2,
                borderRadius: 5,
                overflow: 'hidden',
              }}
            >
              {precio.ahorro}
            </Text>
          )}
          <View style={{ flex: 1 }} />
          {quedan !== null && (
            <Text
              style={{
                fontSize: SIZE.smallSize - 1,
                fontWeight: '600',
                color: PALETTE.tinta,
                backgroundColor: PALETTE.banda,
                paddingHorizontal: 7,
                paddingVertical: 3,
                borderRadius: 6,
                overflow: 'hidden',
              }}
            >
              {quedan}
            </Text>
          )}
        </View>
        <Text style={{ fontSize: SIZE.smallSize, color: PALETTE.tintaApagada }}>{ventanaTexto(oferta, ahora)}</Text>
      </View>
    </View>
  );
}
