import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Dish, Kitchen, Offer } from '@/vecinos/cocinas';
import { ratioOf } from '@/api/fotos';
import { colorOf, defaultsFor } from '@/api/pagina';
import { calleDe, comoLlegarUrl, hoyDe, queYDondeDe, repetidosDe, verEnMapsUrl } from '@/vecinos/paginas';
import { VECINOS as ES } from '@/strings';
import { HUES } from '@/theme/colores';
import { TITULO } from '@/theme/letra';
import { PALETTE, SIZE } from '@/theme/palette';
import { Atras } from '@/vecinos/ui/Atras';
import { Circulo } from '@/vecinos/ui/Circulo';
import { Dibujo } from '@/ui/Dibujo';
import { Enlace } from '@/vecinos/ui/Enlace';
import { Foto } from '@/vecinos/ui/Foto';
import { RenglonPlatillo } from '@/vecinos/ui/RenglonPlatillo';

// ============================================================================
// A KITCHEN'S OWN PAGE, AS IT IS DRAWN — *Ver como la ven*.
// ⚠️ ITACATE'S `itacate/src/ui/PaginaDeCocina.tsx`, COPIED — plan task `10.5-v-c-ii`:
// *Así la ven* and *Ver como la ven* are Itacate's two pages inside Wera Cocina, one
// and the same screen, so this file is Itacate's below its imports, and
// `test/vecinos.test.ts` holds it there code for code. A change is made in Itacate's
// file and copied here in the same PR, or that test is red. Only its imports differ:
// Itacate's parts and words live under `@/vecinos/` and `VECINOS` here.
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
