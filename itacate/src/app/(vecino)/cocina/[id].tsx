import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { giroLabel } from '@/api/cocinas';
import { apiErrorMessage } from '@/api/errors';
import { ratioOf } from '@/api/fotos';
import { useCocinas, useGiros } from '@/api/hooks';
import { colorOf, defaultsFor } from '@/api/pagina';
import { distanciaTexto } from '@/lib/distancia';
import { useDistancia } from '@/lib/DistanciasProvider';
import { calleDe, cocinaDe, comoLlegarUrl, hoyDe, parametro, queYDondeDe, repetidosDe, verEnMapsUrl } from '@/lib/paginas';
import { useAhora } from '@/lib/useAhora';
import { ES } from '@/strings';
import { HUES } from '@/theme/colores';
import { TITULO } from '@/theme/letra';
import { PALETTE, SIZE } from '@/theme/palette';
import { Atras } from '@/ui/Atras';
import { Circulo } from '@/ui/Circulo';
import { Dibujo } from '@/ui/Dibujo';
import { Enlace } from '@/ui/Enlace';
import { Foto } from '@/ui/Foto';
import { PaginaVacia } from '@/ui/PaginaVacia';
import { RenglonPlatillo } from '@/ui/RenglonPlatillo';

// ============================================================================
// A KITCHEN'S OWN PAGE. Plan task `10.5-iv-a-ii`, proposal B (the owner's ruling of
// 2026-11-01, https://claude.ai/artifact/EaiMkYqn2skPXn7MiKeULu), opened from the
// list — a quiet kitchen's card — or from a dish's page.
//
// ⚠️ ITS HEAD IS WERA COCINA'S PREVIEW OF IT (`cocina/src/ui/Portada.tsx`, *Así te ven
// tus vecinos*): her cover, her circle over its edge, her name — in Nunito since
// `10.5-v-c-i`, the page's title, as in Wera Cocina's — and trade, her sentence
// and *Ver en Google Maps ›* in her colour — what she was shown is what a neighbour
// sees. Then what only Itacate has: how far she is, where and *Cómo llegar*; *Hoy* —
// what she has on offer now, each dish opening its page — else *Hoy no ha publicado*
// and her pattern; and *Lo que suele ofrecer*. Every word is `@/lib/paginas`'.
//
// ⚠️ NOTHING NEW IS ASKED OF THE DATABASE: the kitchen is the list's, found by her id in
// the door's answer (in memory); a pull asks the door again, as the list's does. Her
// trade's name is `kitchen_giros()`'s. The distance is the list's (`useDistancia`): this
// screen never learns where the neighbour is. ⚠️ NO CHECK CAN SEE THIS SCREEN (ADR-035
// §2.11): the phone is its instrument.
// ============================================================================

/** How often the page is made again while she reads, so an ended window drops from *Hoy*. */
const CADA_MINUTO = 60_000;

/** Her circle's size, half of it over the cover's edge, as in Wera Cocina's preview. */
const CIRCULO = 60;

const MARGEN = SIZE.space * 1.5;

export default function PaginaDeLaCocina() {
  const insets = useSafeAreaInsets();
  const id = parametro(useLocalSearchParams<{ id: string }>().id);
  const cocinas = useCocinas();
  const giros = useGiros();
  const ahora = useAhora(CADA_MINUTO);
  const metros = useDistancia(id);
  const [jalando, setJalando] = useState(false);

  const cocina = cocinaDe(cocinas.data, id);
  if (cocina === null) {
    if (cocinas.data === undefined && cocinas.isPending) return <PaginaVacia texto={ES.pagina.cargando} esperando />;
    if (cocinas.data === undefined && cocinas.isError) return <PaginaVacia texto={apiErrorMessage(cocinas.error)} />;
    return <PaginaVacia texto={ES.pagina.yaNoEsta} />;
  }

  async function refrescar() {
    setJalando(true);
    try {
      await cocinas.refetch();
    } finally {
      setJalando(false);
    }
  }

  const color = colorOf(cocina.page, cocina.giro);
  const queYDonde = queYDondeDe(giroLabel(giros.data, cocina.giro), cocina.address);
  const mapas = verEnMapsUrl(cocina.page);
  const calle = calleDe(cocina.address);
  const llegar = comoLlegarUrl(cocina);
  const hoy = hoyDe(cocina, ahora);
  const repetidos = repetidosDe(cocina.summary);
  const titulo = { fontSize: SIZE.smallSize, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', color: HUES[color] } as const;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: PALETTE.fondo }}
      contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + SIZE.space * 3 }}
      refreshControl={<RefreshControl refreshing={jalando} onRefresh={() => void refrescar()} />}
    >
      <View style={{ width: '100%', aspectRatio: ratioOf('portada'), overflow: 'hidden', backgroundColor: HUES[color] }}>
        <Dibujo dibujo={defaultsFor(cocina.giro).dibujo} color={color} modo="portada" />
        <Foto path={cocina.page.cover} cocinaId={cocina.id} size="grande" />
        <Atras />
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
            {metros !== null && (
              <Text style={{ fontSize: SIZE.smallSize, fontWeight: '600', color: PALETTE.tinta }}>{distanciaTexto(metros)}</Text>
            )}
          </View>
        </View>
        {cocina.page.sentence !== null && (
          <Text style={{ fontSize: SIZE.bodySize, lineHeight: 22, color: PALETTE.tinta }}>{cocina.page.sentence}</Text>
        )}
        {mapas !== null && <Enlace texto={ES.pagina.verEnMaps} ayuda={ES.pagina.verEnMapsAyuda} url={mapas} color={HUES[color]} />}
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
                  onPress={() =>
                    router.push({
                      pathname: '/platillo/[cocina]/[oferta]/[linea]',
                      params: { cocina: cocina.id, oferta: oferta.id, linea: String(platillo.lineNo) },
                    })
                  }
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
