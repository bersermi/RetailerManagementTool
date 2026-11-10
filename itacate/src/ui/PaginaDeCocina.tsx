import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Dish, Kitchen, Offer } from '@/api/cocinas';
import { ratioOf } from '@/api/fotos';
import { colorOf, defaultsFor } from '@/api/pagina';
import { calificacionDe, calleDe, comoLlegarUrl, hoyDe, pagosDe, queYDondeDe, repetidosDe, verEnMapsUrl } from '@/lib/paginas';
import { ES } from '@/strings';
import { HUES } from '@/theme/colores';
import { TITULO } from '@/theme/letra';
import { PALETTE, SIZE } from '@/theme/palette';
import { Atras } from '@/ui/Atras';
import { Circulo } from '@/ui/Circulo';
import { Dibujo } from '@/ui/Dibujo';
import { Enlace } from '@/ui/Enlace';
import { Foto } from '@/ui/Foto';
import { RenglonPlatillo } from '@/ui/RenglonPlatillo';

// ============================================================================
// A KITCHEN'S OWN PAGE, AS IT IS DRAWN. Plan task `10.5-iv-a-ii`, proposal B (the
// owner's ruling of 2026-11-01, https://claude.ai/artifact/EaiMkYqn2skPXn7MiKeULu);
// taken out of its route by `10.5-v-c-ii`, unchanged, so the same screen draws twice:
// here, opened from the list or a dish's page (`(vecino)/cocina/[id]`, which reads the
// door), and in Wera Cocina's *Ver como la ven* (`cocina/src/vecinos/ui/PaginaDeCocina.tsx`,
// fed from her own rows) — what a fonda is shown is what a neighbour sees.
// `cocina/test/vecinos.test.ts` holds that copy to this file, code for code.
//
// ⚠️ ITS HEAD IS WERA COCINA'S PREVIEW OF IT (`cocina/src/ui/Portada.tsx`, *Así te ven
// tus vecinos*): her cover, her circle over its edge, her name — in Nunito since
// `10.5-v-c-i`, the page's title, as in Wera Cocina's — and trade, her sentence
// and *Ver en Google Maps ›* in her colour. Then what only Itacate has: how far she is,
// where and *Cómo llegar*; *Hoy* — what she has on offer now, each dish opening its
// page — else *Hoy no ha publicado* and her pattern; and *Lo que suele ofrecer*. Every
// word is `@/lib/paginas`'. ⚠️ SINCE `10.5b-iii-b` her stars under her name — *★ 4.8 (23
// calificaciones)* and her most given good tags, else *Todavía sin calificaciones* — and
// *Cómo pagas aquí* with a chip per way she takes payment, after her sentence (the
// family-shell page's call 20).
//
// ⚠️ IT READS NOTHING: the kitchen, her trade's name, the distance and the clock are its
// route's to hand it, so it never learns where the neighbour is (`test/donde.test.ts`).
// A pull asks the route to read again, when the route gives it a way to. NO CHECK CAN
// SEE THIS SCREEN (ADR-035 §2.11): the phone is its instrument.
// ============================================================================

/** Her circle's size, half of it over the cover's edge, as in Wera Cocina's preview. */
const CIRCULO = 60;

const MARGEN = SIZE.space * 1.5;

export function PaginaDeCocina({
  cocina,
  giroNombre,
  distancia,
  ahora,
  onPlatillo,
  onRefrescar,
  atras = true,
}: {
  cocina: Kitchen;
  /** Her trade's name, `kitchen_giros()`'s, or `null` while it is not known. */
  giroNombre: string | null;
  /** How far she is, in words — *350 m* — or `null` when it is not known. */
  distancia: string | null;
  ahora: Date;
  onPlatillo: (oferta: Offer, platillo: Dish) => void;
  /** A pull to read again — none, no pull. */
  onRefrescar?: () => Promise<unknown>;
  /** The way back over her cover — none where a bar above the page closes it. */
  atras?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const [jalando, setJalando] = useState(false);

  async function refrescar() {
    if (onRefrescar === undefined) return;
    setJalando(true);
    try {
      await onRefrescar();
    } finally {
      setJalando(false);
    }
  }

  const color = colorOf(cocina.page, cocina.giro);
  const queYDonde = queYDondeDe(giroNombre, cocina.address);
  const mapas = verEnMapsUrl(cocina.page);
  const calle = calleDe(cocina.address);
  const llegar = comoLlegarUrl(cocina);
  const hoy = hoyDe(cocina, ahora);
  const repetidos = repetidosDe(cocina.summary);
  const calificacion = calificacionDe(cocina);
  const pagos = pagosDe(cocina);
  const titulo = { fontSize: SIZE.smallSize, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', color: HUES[color] } as const;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: PALETTE.fondo }}
      contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + SIZE.space * 3 }}
      refreshControl={
        onRefrescar === undefined ? undefined : <RefreshControl refreshing={jalando} onRefresh={() => void refrescar()} />
      }
    >
      <View style={{ width: '100%', aspectRatio: ratioOf('portada'), overflow: 'hidden', backgroundColor: HUES[color] }}>
        <Dibujo dibujo={defaultsFor(cocina.giro).dibujo} color={color} modo="portada" />
        <Foto path={cocina.page.cover} cocinaId={cocina.id} size="grande" />
        {atras && <Atras />}
      </View>

      <View style={{ paddingHorizontal: MARGEN, gap: SIZE.rowGap }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: SIZE.space }}>
          <View style={{ marginTop: -CIRCULO / 2 }}>
            <Circulo cocina={cocina} size={CIRCULO} />
          </View>
          <View style={{ flex: 1, paddingTop: SIZE.rowGap, gap: 2 }}>
            <Text accessibilityRole="header" style={{ fontSize: SIZE.titleSize - 2, ...TITULO, color: PALETTE.tinta }}>
              {cocina.name}
            </Text>
            {queYDonde !== null && <Text style={{ fontSize: SIZE.smallSize, color: PALETTE.tintaApagada }}>{queYDonde}</Text>}
            {distancia !== null && (
              <Text style={{ fontSize: SIZE.smallSize, fontWeight: '600', color: PALETTE.tinta }}>{distancia}</Text>
            )}
            {calificacion.kind === 'estrellas' ? (
              <View accessible accessibilityLabel={calificacion.ayuda} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <MaterialCommunityIcons name="star" size={SIZE.bodySize} color={PALETTE.estrella} />
                <Text style={{ fontSize: SIZE.smallSize, fontWeight: '700', color: PALETTE.tinta }}>{calificacion.promedio}</Text>
                <Text style={{ fontSize: SIZE.smallSize, color: PALETTE.tintaApagada }}>{calificacion.cuantas}</Text>
              </View>
            ) : (
              <Text style={{ fontSize: SIZE.smallSize, color: PALETTE.tintaApagada }}>{calificacion.texto}</Text>
            )}
            {calificacion.kind === 'estrellas' && calificacion.etiquetas.length > 0 && (
              <Text style={{ fontSize: SIZE.smallSize, color: PALETTE.tintaApagada }}>{calificacion.etiquetas.join(' · ')}</Text>
            )}
          </View>
        </View>
        {cocina.page.sentence !== null && (
          <Text style={{ fontSize: SIZE.bodySize, lineHeight: 22, color: PALETTE.tinta }}>{cocina.page.sentence}</Text>
        )}
        {mapas !== null && <Enlace texto={ES.pagina.verEnMaps} ayuda={ES.pagina.verEnMapsAyuda} url={mapas} color={HUES[color]} />}
        <View style={{ gap: SIZE.rowGap / 2, paddingTop: SIZE.rowGap / 2 }}>
          <Text style={{ fontSize: SIZE.smallSize, fontWeight: '700', color: PALETTE.tintaApagada }}>{ES.pagina.comoPagas}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SIZE.rowGap }}>
            {pagos.map(({ pago, texto }) => (
              <View
                key={pago}
                style={{
                  paddingHorizontal: SIZE.space,
                  paddingVertical: SIZE.rowGap / 2,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: PALETTE.linea,
                  backgroundColor: PALETTE.superficie,
                }}
              >
                <Text style={{ fontSize: SIZE.smallSize, fontWeight: '600', color: PALETTE.tinta }}>{texto}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {(calle !== null || cocina.directions !== null || llegar !== null) && (
        <View
          style={{
            marginTop: SIZE.space,
            marginHorizontal: MARGEN,
            paddingTop: SIZE.space,
            borderTopWidth: 1,
            borderTopColor: PALETTE.linea,
          }}
        >
          {calle !== null && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SIZE.rowGap / 2 }}>
              <MaterialCommunityIcons name="map-marker-outline" size={SIZE.iconSize - 4} color={PALETTE.tintaApagada} />
              <Text style={{ flexShrink: 1, fontSize: SIZE.bodySize, color: PALETTE.tinta }}>{calle}</Text>
            </View>
          )}
          {cocina.directions !== null && (
            <Text style={{ fontSize: SIZE.smallSize, lineHeight: 20, color: PALETTE.tintaApagada, marginTop: 2 }}>
              {cocina.directions}
            </Text>
          )}
          {llegar !== null && <Enlace texto={ES.pagina.comoLlegar} ayuda={ES.pagina.comoLlegarAyuda} url={llegar} />}
        </View>
      )}

      <View style={{ marginTop: SIZE.space * 1.5, paddingHorizontal: MARGEN }}>
        {hoy.kind === 'oferta' ? (
          <>
            <Text accessibilityRole="header" style={titulo}>
              {ES.pagina.hoy}
            </Text>
            {hoy.ofertas.flatMap((oferta) =>
              oferta.dishes.map((platillo) => (
                <RenglonPlatillo
                  key={`${oferta.id}:${platillo.lineNo}`}
                  cocina={cocina}
                  oferta={oferta}
                  platillo={platillo}
                  ahora={ahora}
                  onPress={() => onPlatillo(oferta, platillo)}
                />
              )),
            )}
          </>
        ) : (
          <View
            style={{
              gap: 2,
              padding: SIZE.space,
              borderRadius: SIZE.space,
              borderWidth: 1,
              borderColor: PALETTE.linea,
              backgroundColor: PALETTE.superficie,
            }}
          >
            <Text style={{ fontSize: SIZE.bodySize, fontWeight: '700', color: PALETTE.tinta }}>{hoy.titulo}</Text>
            {hoy.linea !== null && <Text style={{ fontSize: SIZE.smallSize, color: PALETTE.tintaApagada }}>{hoy.linea}</Text>}
          </View>
        )}
      </View>

      {repetidos.length > 0 && (
        <View style={{ marginTop: SIZE.space * 2, paddingHorizontal: MARGEN }}>
          <Text accessibilityRole="header" style={titulo}>
            {ES.pagina.loQueSuele}
          </Text>
          {repetidos.map((repetido) => (
            <View
              key={repetido.key}
              style={{ paddingVertical: SIZE.space - 2, borderBottomWidth: 1, borderBottomColor: PALETTE.linea, gap: 2 }}
            >
              <Text style={{ fontSize: SIZE.bodySize, fontWeight: '600', color: PALETTE.tinta }}>{repetido.nombre}</Text>
              <Text style={{ fontSize: SIZE.smallSize, color: PALETTE.tintaApagada }}>{repetido.detalle}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
