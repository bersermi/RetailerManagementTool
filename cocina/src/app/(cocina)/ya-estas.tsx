import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, BackHandler, Text, View } from 'react-native';
import { SafeAreaInsetsContext, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useKitchen, useKitchenGiros, useListings, usePage, usePlace } from '@/api/hooks';
import { giroLabel } from '@/api/kitchen';
import { cocinaComoLaVen, seVeEnItacate } from '@/lib/comoLaVen';
import { useAhora } from '@/lib/useAhora';
import { useLoQueVen } from '@/lib/useLoQueVen';
import { ES } from '@/strings';
import { TITULO } from '@/theme/letra';
import { PALETTE, SIZE } from '@/theme/palette';
import { BotonLleno } from '@/ui/BotonLleno';
import { Llega } from '@/ui/Llega';
import { PaginaDeCocina } from '@/vecinos/ui/PaginaDeCocina';

// ============================================================================
// THE FIRST RUN ENDS ON HER PAGE, AS HER NEIGHBOURS SEE IT. Plan task `10.5-v-d`, the
// family-shell page's first run (ruled 2026-11-05): *"Tu cocina ya está en Itacate · Así te
// ven los vecinos"*, then *Ir a Hoy*. Reached from *¿Qué ofreces hoy?* — after her first
// offer, or at once with *Después*.
//
// ⚠️ ITACATE'S PAGE, NOT A DRAWING OF IT: *Ver como la ven*'s screen (`/como-la-ven`) —
// `@/vecinos/ui/PaginaDeCocina`, Itacate's file held code for code, fed from her own rows
// (`@/lib/comoLaVen`), with no way back over her cover, her dishes not opening and no
// distance. ⚠️ ITS TITLE IS TRUE OF HER KITCHEN NOW: *Tu cocina ya está en Itacate* only
// while the door would send it (`seVeEnItacate` — something on offer, or a publication in
// the last 14 days, as `0078` counts them, *Deshacer*'s included); after *Después* it is
// what they will see, with the line *Ver como la ven* shows. ⚠️ *IR A HOY* AND ANDROID'S BACK
// BOTH OPEN *HOY* in place of this screen — the first run is over. NO CHECK CAN SEE THIS
// SCREEN (ADR-035 §2.11): the phone is its instrument.
// ============================================================================

/** How often the page is made again while she looks, so an ended window drops from it. */
const CADA_MINUTO = 60_000;

export default function YaEstas() {
  const insets = useSafeAreaInsets();
  const kitchen = useKitchen();
  const giros = useKitchenGiros();
  const place = usePlace(kitchen?.id ?? null);
  const page = usePage(kitchen?.id ?? null);
  const listings = useListings(kitchen?.id ?? null);
  // `10.5b-iv-c`: her settings, her stars and what is taken — the door's defaults until read.
  const loQueVen = useLoQueVen(kitchen?.id ?? null);
  const ahora = useAhora(CADA_MINUTO);

  const irAHoy = () => router.replace('/');
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      router.replace('/');
      return true;
    });
    return () => sub.remove();
  }, []);

  const pie = (
    <View style={{ paddingHorizontal: SIZE.space * 2, paddingTop: SIZE.space, paddingBottom: insets.bottom + SIZE.space, borderTopWidth: 1, borderTopColor: PALETTE.linea, backgroundColor: PALETTE.fondo }}>
      <BotonLleno variante="principal" label={ES.primera.irAHoy} onPress={irAHoy} />
    </View>
  );

  if (kitchen === null || place.data === undefined || page.data === undefined || listings.data === undefined) {
    const fallo = place.isError || page.isError || listings.isError;
    return (
      <View style={{ flex: 1, backgroundColor: PALETTE.fondo, paddingTop: insets.top + SIZE.space * 2 }}>
        <View style={{ flex: 1, padding: SIZE.space * 2, gap: SIZE.space }}>
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
        {pie}
      </View>
    );
  }

  const seVe = seVeEnItacate(listings.data, ahora);
  const cocina = cocinaComoLaVen({ kitchen, place: place.data, page: page.data, listings: listings.data, now: ahora, ...loQueVen });
  return (
    <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
      <Llega
        i={0}
        style={{ paddingTop: insets.top + SIZE.space, paddingHorizontal: SIZE.space * 2, paddingBottom: SIZE.space, gap: SIZE.rowGap / 2, alignItems: 'center' }}
      >
        {seVe && <MaterialCommunityIcons name="check-circle" size={SIZE.iconSize * 1.5} color={PALETTE.accion} />}
        <Text accessibilityRole="header" style={{ fontSize: SIZE.titleSize, ...TITULO, color: PALETTE.tinta, textAlign: 'center' }}>
          {seVe ? ES.primera.yaEsta : ES.primera.asiTeVeran}
        </Text>
        <Text style={{ fontSize: SIZE.smallSize, lineHeight: 19, color: PALETTE.tintaApagada, textAlign: 'center' }}>
          {seVe ? ES.primera.asiTeVen : ES.vista.noSeVe}
        </Text>
      </Llega>
      <View style={{ flex: 1, borderTopWidth: 1, borderTopColor: PALETTE.linea }}>
        {/* The words above took the top inset, and the button below takes the bottom one. */}
        <SafeAreaInsetsContext.Provider value={{ ...insets, top: 0, bottom: 0 }}>
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
      {pie}
    </View>
  );
}
