import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useKitchen, useListings, useWithdraw } from '@/api/hooks';
import type { Listing } from '@/api/listing';
import { anteriores, deHoy, diaDe, hastaTexto, nombreDe } from '@/lib/hoy';
import { useNota } from '@/lib/NotaProvider';
import { useAhora } from '@/lib/useAhora';
import { useRepetir } from '@/lib/useRepetir';
import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';
import { Anterior } from '@/ui/Anterior';
import { Banda } from '@/ui/Banda';
import { BotonLleno } from '@/ui/BotonLleno';
import { Grupo } from '@/ui/Grupo';
import { Llega } from '@/ui/Llega';
import { OfertaDeHoy } from '@/ui/OfertaDeHoy';

// ============================================================================
// *TUS OFERTAS* — A ROOM OF ITS OWN. Plan task `10.5-v-c-i`, the owner's direction of
// 2026-11-06 (*"Looks like a lot of scrolling just to visualize what are the cocinas
// ofering. Perhaps we can make it a module of its own"*), as the family-shell page draws
// it (`cOfertas`): pushed over the tabs from *Hoy*'s day card, *‹ Hoy* to go back.
//   - HOY — today's offers (`@/lib/hoy`'s `deHoy`), each with *Ya se terminó* while it is
//     on offer (`@/ui/OfertaDeHoy`), and *Así la ven* beside it (`10.5-v-c-ii`): an offer of one
//     dish opens that dish's page in Itacate, one of several her page, where each is listed;
//     − and + with `10.5b`;
//   - *PUBLICAR UNA OFERTA*, again, at the foot of today's;
//   - ANTERIORES — one row per offer she made before today, its newest, the newest first,
//     each with *Repetir* (one tap, with *Deshacer*) or *Hoy* when she already published it
//     again (`@/ui/Anterior`). They moved here from her kitchen's screen.
//
// ⚠️ `unknown` IS NOT `none`: a read that failed says so with *Intentar de nuevo*, never
// *Todavía no has publicado nada*. NO CHECK CAN SEE THIS SCREEN (ADR-035 §2.11).
// ============================================================================

/** How often the clock is read again while the room is up. */
const CADA_MEDIO_MINUTO = 30_000;

export default function TusOfertas() {
  const insets = useSafeAreaInsets();
  const kitchen = useKitchen();
  const listings = useListings(kitchen?.id ?? null);
  const ahora = useAhora(CADA_MEDIO_MINUTO);
  const { withdraw, busyId } = useWithdraw(kitchen?.id ?? null);
  const { repetir, busyId: repitiendo } = useRepetir(kitchen);
  const { avisar } = useNota();
  const [problema, setProblema] = useState<{ readonly id: string; readonly text: string } | null>(null);

  const volver = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const quiet = { fontSize: SIZE.bodySize, color: PALETTE.tintaApagada } as const;
  const seccion = { fontSize: SIZE.smallSize, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: PALETTE.tintaApagada } as const;

  async function terminar(listing: Listing) {
    setProblema(null);
    const answer = await withdraw(listing.id);
    if (answer === null) avisar(ES.nota.quitaste(nombreDe(listing)));
    else setProblema({ id: listing.id, text: answer });
  }

  // One dish: its page as a neighbour opens it. Several: her page, where each is listed.
  function asiLaVen(listing: Listing) {
    if (listing.lines.length === 1) {
      router.push({ pathname: '/asi-la-ven/[oferta]/[linea]', params: { oferta: listing.id, linea: '1' } });
    } else {
      router.push('/como-la-ven');
    }
  }

  const banda = (
    <Banda titulo={ES.ofertas.titulo} antetitulo={kitchen?.displayName ?? null} volver={{ label: ES.ofertas.volver, onPress: volver }} />
  );

  if (kitchen === null || listings.data === undefined) {
    return (
      <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
        {banda}
        <View style={{ padding: SIZE.space * 2, gap: SIZE.space }}>
          {listings.isError ? (
            <>
              <Text style={{ fontSize: SIZE.bodySize, color: PALETTE.tinta }}>{ES.publicaciones.sinLeer}</Text>
              <BotonLleno label={ES.cocina.otraVez} busy={listings.isFetching} onPress={() => void listings.refetch()} />
            </>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SIZE.rowGap }}>
              <ActivityIndicator color={PALETTE.accion} />
              <Text style={quiet}>{ES.publicaciones.leyendo}</Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  const hoy = deHoy(listings.data, ahora);
  const pasadas = anteriores(listings.data, ahora);
  const dia = diaDe(listings.data, ahora);
  const resumen =
    dia.kind === 'oferta'
      ? ES.ofertas.enItacate(hastaTexto(dia.hasta, ahora))
      : dia.kind === 'terminado'
        ? ES.hoy.terminado
        : ES.hoy.nada;

  return (
    <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
      {banda}
      <ScrollView contentContainerStyle={{ padding: SIZE.space * 1.5, paddingBottom: SIZE.space * 3 + insets.bottom, gap: SIZE.space * 1.5 }}>
        <Llega i={0}>
          <Text style={quiet}>{resumen}</Text>
        </Llega>

        {hoy.length > 0 && (
          <Llega i={1} style={{ gap: SIZE.space }}>
            <Text style={seccion}>{ES.ofertas.hoy}</Text>
            {hoy.map((listing) => (
              <OfertaDeHoy
                key={listing.id}
                listing={listing}
                ahora={ahora}
                busy={busyId === listing.id}
                problema={problema !== null && problema.id === listing.id ? problema.text : null}
                onTerminar={() => void terminar(listing)}
                onAsiLaVen={() => asiLaVen(listing)}
              />
            ))}
          </Llega>
        )}

        <Llega i={2}>
          <BotonLleno variante="principal" icon="plus" label={ES.publicar.abrir} onPress={() => router.push('/publicar')} />
        </Llega>

        <Llega i={3} style={{ gap: SIZE.space }}>
          <Text style={seccion}>{ES.ofertas.anteriores}</Text>
          {pasadas.length === 0 ? (
            <Text style={quiet}>{ES.ofertas.ninguna}</Text>
          ) : (
            <>
              <Grupo sinIconos>
                {pasadas.map((fila) => (
                  <Anterior
                    key={fila.listing.id}
                    fila={fila}
                    ahora={ahora}
                    busy={repitiendo === fila.listing.id}
                    onRepetir={() => void repetir(fila.listing)}
                  />
                ))}
              </Grupo>
              <Text style={{ fontSize: SIZE.smallSize, lineHeight: 18, color: PALETTE.tintaApagada }}>{ES.ofertas.nota}</Text>
            </>
          )}
        </Llega>
      </ScrollView>
    </View>
  );
}
