import MaterialCommunityIcons from '@/marca/Icono';
import { Pressable, Text, View } from 'react-native';

import type { Dish, Kitchen, Offer } from '@/api/cocinas';
import { colorOf, defaultsFor } from '@/api/pagina';
import { ventanaTexto } from '@/lib/lista';
import { marcaDeOferta } from '@/lib/paginas';
import { ES } from '@/strings';
import { HUES } from '@/theme/colores';
import { PALETTE, SIZE } from '@/theme/palette';
import { borde, esq } from '@/theme/piel';
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
// ⚠️ SINCE `10.5-v-d` WERA COCINA DRAWS IT TOO — at the foot of *Tu oferta de hoy*, the
// card filling in as she types — as a copy of this file (`cocina/src/vecinos/ui/
// TarjetaPlatillo.tsx`, held code for code by its `test/vecinos.test.ts`). So it takes
// its kitchen, offer and dish one by one and the distance already in words, as
// `@/ui/FilaCocina` does: a fonda's preview has no neighbour to measure from.
// ⚠️ SINCE `10.5b-iii-b` HER STARS, from five ratings, at the right of her name over the
// photo's foot — the owner's answer 10 of 2026-11-05: *the stars go on the card*.
// ⚠️ SINCE `10.9g-iii` AN OFFER THAT JOINED ONE OF HER PROMOTIONS WEARS ITS MARK at the photo's top left (G38, the
// family-shell page's `.badge-promo`): terracotta words on white, as drawn — the solid mark of her page and her rows
// vanished on a kitchen's warm colour (seen on the emulator, on *chile*); with her card's *5/8*, two marks at most.
// The list's order never reads it: a promotion never moves a dish up.
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
  marca = null,
}: {
  cocina: Kitchen;
  oferta: Offer;
  platillo: Dish;
  distancia: string | null;
  ahora: Date;
  onPress: () => void;
  /**
   * `10.9e-iii` (G38): her progress on that kitchen's loyalty card — *5/8* — at the window's right, its words on the
   * card's own label (a screen reader reads that, never a child's); the list's to hand it (Itacate's `@/lib/tarjeta`'
   * `marcaDeCocina`), none in Wera Cocina — where the window's line is drawn exactly as before.
   */
  marca?: { readonly texto: string; readonly ayuda: string } | null;
}) {
  const color = colorOf(cocina.page, cocina.giro);
  const promocion = marcaDeOferta(cocina, oferta);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[ES.cerca.abrirPlatillo(platillo.name, cocina.name), promocion?.ayuda, marca?.ayuda].filter(Boolean).join('. ')}
      onPress={onPress}
      style={({ pressed }) => ({
        borderWidth: borde(1),
        borderColor: PALETTE.linea,
        borderRadius: esq(SIZE.space),
        overflow: 'hidden',
        backgroundColor: PALETTE.superficie,
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <View style={{ width: '100%', aspectRatio: FRANJA, overflow: 'hidden', backgroundColor: HUES[color] }}>
        <Dibujo dibujo={defaultsFor(cocina.giro).dibujo} color={color} modo="portada" />
        <Foto path={platillo.photo} cocinaId={cocina.id} size="grande" />
        {promocion !== null && (
          <View
            style={{
              position: 'absolute',
              top: SIZE.rowGap,
              left: SIZE.rowGap,
              maxWidth: '80%',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              paddingHorizontal: 7,
              paddingVertical: 4,
              borderRadius: esq(6),
              backgroundColor: PALETTE.superficie,
            }}
          >
            <MaterialCommunityIcons name={promocion.icono} size={13} color={PALETTE.marca} />
            <Text numberOfLines={1} style={{ fontSize: SIZE.smallSize - 2, fontWeight: '700', color: PALETTE.marca }}>
              {promocion.texto}
            </Text>
          </View>
        )}
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
          {cocina.estrellas !== null && (
            <View
              accessible
              accessibilityLabel={ES.pagina.estrellasAyuda(cocina.estrellas.promedio, cocina.estrellas.cuantas)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}
            >
              <MaterialCommunityIcons name="star" size={SIZE.smallSize + 2} color={PALETTE.estrella} />
              <Text style={{ fontSize: SIZE.smallSize + 1, fontWeight: '700', color: PALETTE.superficie }}>{cocina.estrellas.promedio}</Text>
            </View>
          )}
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
        {marca === null ? (
          <Text style={{ fontSize: SIZE.smallSize, color: PALETTE.tintaApagada }}>{ventanaTexto(oferta, ahora)}</Text>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SIZE.rowGap }}>
            <Text style={{ flex: 1, fontSize: SIZE.smallSize, color: PALETTE.tintaApagada }}>{ventanaTexto(oferta, ahora)}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <MaterialCommunityIcons name="stamper" size={13} color={PALETTE.accion} />
              <Text style={{ fontSize: SIZE.smallSize - 1, fontWeight: '700', color: PALETTE.accion }}>{marca.texto}</Text>
            </View>
          </View>
        )}
      </View>
    </Pressable>
  );
}
