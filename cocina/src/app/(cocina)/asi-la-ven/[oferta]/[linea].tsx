import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaInsetsContext, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useKitchen, useListings, usePage, usePlace } from '@/api/hooks';
import { cocinaComoLaVen } from '@/lib/comoLaVen';
import { useAhora } from '@/lib/useAhora';
import { ES, VECINOS } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';
import { BarraVista } from '@/ui/BarraVista';
import { BotonLleno } from '@/ui/BotonLleno';
import { lineaDe, parametro, platilloDe } from '@/vecinos/paginas';
import { PaginaDePlatillo } from '@/vecinos/ui/PaginaDePlatillo';
import { PaginaVacia } from '@/vecinos/ui/PaginaVacia';

// ============================================================================
// *ASÍ LA VEN* — ONE OF TODAY'S DISHES, AS ITACATE DRAWS IT. Plan task `10.5-v-c-ii`, the
// family-shell page's *Managing an offer*: *Así la ven* on each of today's offers in *Tus
// ofertas* opens the dish's page a neighbour opens — `@/vecinos/ui/PaginaDePlatillo`,
// Itacate's `itacate/src/ui/PaginaDePlatillo.tsx` held to it code for code
// (`test/vecinos.test.ts`) — fed from her own rows (`@/lib/comoLaVen`). As the page draws a
// preview: the dark bar with *Cerrar*, no way back over the photo, her kitchen's row not
// opening, no distance. A window that ends while she looks turns it into *Este platillo ya
// no está en oferta*, as it does for a neighbour. NO CHECK CAN SEE THIS SCREEN (ADR-035
// §2.11): the phone is its instrument.
// ============================================================================

/** How often the page is made again while she looks, so an ended window is over on screen. */
const CADA_MINUTO = 60_000;

export default function AsiLaVen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ oferta: string; linea: string }>();
  const kitchen = useKitchen();
  const place = usePlace(kitchen?.id ?? null);
  const page = usePage(kitchen?.id ?? null);
  const listings = useListings(kitchen?.id ?? null);
  const ahora = useAhora(CADA_MINUTO);

  const cerrar = () => (router.canGoBack() ? router.back() : router.replace('/ofertas'));
  const barra = <BarraVista texto={ES.vista.platillo} onCerrar={cerrar} />;

  if (kitchen === null || place.data === undefined || page.data === undefined || listings.data === undefined) {
    const fallo = place.isError || page.isError || listings.isError;
    return (
      <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
        {barra}
        <View style={{ padding: SIZE.space * 2, gap: SIZE.space }}>
          {fallo ? (
            <>
              <Text style={{ fontSize: SIZE.bodySize, color: PALETTE.tinta }}>{ES.cocina.sinLeer}</Text>
              <BotonLleno
                label={ES.cocina.otraVez}
                onPress={() => {
                  void place.refetch();
                  void page.refetch();
                  void listings.refetch();
                }}
              />
            </>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SIZE.rowGap }}>
              <ActivityIndicator color={PALETTE.accion} />
              <Text style={{ fontSize: SIZE.bodySize, color: PALETTE.tintaApagada }}>{ES.publicaciones.leyendo}</Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  const cocina = cocinaComoLaVen({ kitchen, place: place.data, page: page.data, listings: listings.data, now: ahora });
  const estado = platilloDe([cocina], cocina.id, parametro(params.oferta), lineaDe(parametro(params.linea)), ahora);
  return (
    <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
      {barra}
      {/* The bar took the top inset; the page under it starts right below. */}
      <SafeAreaInsetsContext.Provider value={{ ...insets, top: 0 }}>
        {estado.kind === 'terminado' ? (
          <PaginaVacia texto={VECINOS.platillo.terminado} />
        ) : (
          <PaginaDePlatillo
            cocina={estado.cocina}
            oferta={estado.oferta}
            platillo={estado.platillo}
            distancia={null}
            ahora={ahora}
            onCocina={() => {}}
            atras={false}
          />
        )}
      </SafeAreaInsetsContext.Provider>
    </View>
  );
}
