import { router } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaInsetsContext, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useKitchen, useKitchenGiros, useListings, usePage, usePlace } from '@/api/hooks';
import { giroLabel } from '@/api/kitchen';
import { cocinaComoLaVen, seVeEnItacate } from '@/lib/comoLaVen';
import { useAhora } from '@/lib/useAhora';
import { useLoQueVen } from '@/lib/useLoQueVen';
import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';
import { BarraVista } from '@/ui/BarraVista';
import { BotonLleno } from '@/ui/BotonLleno';
import { PaginaDeCocina } from '@/vecinos/ui/PaginaDeCocina';

// ============================================================================
// *VER COMO LA VEN* — HER PAGE, AS ITACATE DRAWS IT. Plan task `10.5-v-c-ii`, the owner's
// direction of 2026-11-06 (*Así te ven los vecinos* left *Hoy* for *Mi cocina*) and the
// family-shell page's *A kitchen's page*: *"what Doña Mari sees from Ver como la ven in Mi
// cocina, one and the same screen"*. Pushed from *Mi cocina*'s *Ver como la ven*.
//
// ⚠️ ITACATE'S SCREEN, NOT A DRAWING OF IT: `@/vecinos/ui/PaginaDeCocina` is Itacate's
// `itacate/src/ui/PaginaDeCocina.tsx`, held to it code for code (`test/vecinos.test.ts`),
// fed from her own rows as the door would answer for her (`@/lib/comoLaVen`). As the page
// draws a preview: the dark bar on top with *Cerrar*, no way back over her cover, her
// dishes not opening, and no distance — she is in her kitchen. While the door would not
// send her (nothing on offer, nothing published in 14 days) a line under the bar says
// neighbours will see it once she publishes. NO CHECK CAN SEE THIS SCREEN (ADR-035
// §2.11): the phone is its instrument.
// ============================================================================

/** How often the page is made again while she looks, so an ended window drops from *Hoy*. */
const CADA_MINUTO = 60_000;

export default function ComoLaVen() {
  const insets = useSafeAreaInsets();
  const kitchen = useKitchen();
  const giros = useKitchenGiros();
  const place = usePlace(kitchen?.id ?? null);
  const page = usePage(kitchen?.id ?? null);
  const listings = useListings(kitchen?.id ?? null);
  // `10.5b-iv-c`: her settings, her stars and what is taken — the door's defaults until read.
  const loQueVen = useLoQueVen(kitchen?.id ?? null);
  const ahora = useAhora(CADA_MINUTO);

  const cerrar = () => (router.canGoBack() ? router.back() : router.replace('/mi-cocina'));
  const barra = <BarraVista texto={ES.vista.pagina} onCerrar={cerrar} />;

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
              <Text style={{ fontSize: SIZE.bodySize, color: PALETTE.tintaApagada }}>{ES.cocina.leyendo}</Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  const cocina = cocinaComoLaVen({ kitchen, place: place.data, page: page.data, listings: listings.data, now: ahora, ...loQueVen });
  return (
    <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
      {barra}
      {!seVeEnItacate(listings.data, ahora) && (
        <Text
          style={{
            fontSize: SIZE.smallSize,
            lineHeight: 19,
            color: PALETTE.tinta,
            backgroundColor: PALETTE.banda,
            paddingHorizontal: SIZE.space * 1.5,
            paddingVertical: SIZE.rowGap,
          }}
        >
          {ES.vista.noSeVe}
        </Text>
      )}
      {/* The bar took the top inset; the page under it starts right below. */}
      <SafeAreaInsetsContext.Provider value={{ ...insets, top: 0 }}>
        <PaginaDeCocina
          cocina={cocina}
          giroNombre={giroLabel(giros.data, kitchen.giroPrincipal)}
          distancia={null}
          ahora={ahora}
          onPlatillo={() => {}}
          atras={false}
        />
      </SafeAreaInsetsContext.Provider>
    </View>
  );
}
