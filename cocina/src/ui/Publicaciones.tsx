// ============================================================================
// HER LIST — WHAT SHE PUBLISHED, ON HER KITCHEN'S SCREEN. Plan task `10.4b-iv-a`.
//
// ⚠️ WHAT IS ON OFFER FIRST, THE SOONEST FIRST, THEN THE REST, THE NEWEST FIRST
// (`inOrder`): *En oferta*, *Terminó*, *Retirada* — `0072`'s meaning of on offer,
// before reservations exist. Her last ten (`LISTING_LIMIT`).
//
// ⚠️ EVERY ONE HAS *REPETIR* — proposal B's *"lists what she published recently,
// ready to publish again"*: this list IS that list. It opens the form filled in
// (`/publicar?repetir=`), and nothing is sent until she presses *Publicar*.
// ⚠️ ONE ON OFFER HAS *RETIRAR*, asked once inline as Wera asks (*¿Cancelarla?*,
// `8k`) — to change what she offers she withdraws and publishes again, which is
// `0072`'s rule: a publication is never edited.
//
// ⚠️ `unknown` IS NOT `none`: a read that failed says so with *Intentar de
// nuevo*, never *Todavía no has publicado nada*.
// ============================================================================

import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { useListings, useWithdraw } from '@/api/hooks';
import { inOrder, lineDetail, listingState, type Listing } from '@/api/listing';
import { slotOf } from '@/lib/ventana';
import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';
import { BotonLleno } from '@/ui/BotonLleno';

export function Publicaciones({ kitchenId }: { kitchenId: string }) {
  const listings = useListings(kitchenId);
  const { withdraw, busyId } = useWithdraw(kitchenId);
  const [asking, setAsking] = useState<string | null>(null);
  const [problem, setProblem] = useState<{ readonly id: string; readonly text: string } | null>(null);
  const now = new Date();
  const quiet = { fontSize: SIZE.bodySize, color: PALETTE.tintaApagada } as const;

  if (listings.data === undefined) {
    return listings.isError ? (
      <>
        <Text style={{ fontSize: SIZE.bodySize, color: PALETTE.tinta }}>{ES.publicaciones.sinLeer}</Text>
        <BotonLleno label={ES.cocina.otraVez} busy={listings.isFetching} onPress={() => void listings.refetch()} />
      </>
    ) : (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SIZE.rowGap }}>
        <ActivityIndicator color={PALETTE.accion} />
        <Text style={quiet}>{ES.publicaciones.leyendo}</Text>
      </View>
    );
  }
  if (listings.data.length === 0) return <Text style={quiet}>{ES.publicaciones.ninguna}</Text>;

  async function retirar(id: string) {
    const answer = await withdraw(id);
    setAsking(null);
    setProblem(answer === null ? null : { id, text: answer });
  }

  function repetir(listing: Listing) {
    router.push({ pathname: '/publicar', params: { repetir: listing.id } });
  }

  return (
    <>
      {inOrder(listings.data, now).map((listing) => {
        const state = listingState(listing, now);
        const onOffer = state === 'oferta';
        const busy = busyId === listing.id;
        return (
          <View
            key={listing.id}
            style={{
              borderWidth: onOffer ? 2 : 1,
              borderColor: onOffer ? PALETTE.accion : PALETTE.linea,
              borderRadius: SIZE.space,
              backgroundColor: PALETTE.superficie,
              padding: SIZE.space,
              gap: SIZE.rowGap,
            }}
          >
            <Text
              style={{
                fontSize: SIZE.smallSize,
                fontWeight: '700',
                letterSpacing: 1,
                textTransform: 'uppercase',
                color: onOffer ? PALETTE.accion : PALETTE.tintaApagada,
              }}
            >
              {ES.publicaciones.estado[state]}
            </Text>
            <Text style={{ fontSize: SIZE.bodySize, fontWeight: '600', color: PALETTE.tinta }}>{slotOf(listing, now)}</Text>
            {listing.lines.map((line, i) => (
              <View key={i} style={{ gap: 2 }}>
                <Text style={{ fontSize: SIZE.bodySize, fontWeight: '700', color: PALETTE.tinta }}>{line.name}</Text>
                <Text style={quiet}>{lineDetail(line)}</Text>
                {line.description !== null && <Text style={quiet}>{line.description}</Text>}
              </View>
            ))}

            {asking === listing.id ? (
              <View style={{ gap: SIZE.rowGap }}>
                <Text style={{ fontSize: SIZE.bodySize, fontWeight: '700', color: PALETTE.tinta }}>
                  {ES.publicaciones.retirarPregunta}
                </Text>
                <View style={{ flexDirection: 'row', gap: SIZE.rowGap }}>
                  <View style={{ flex: 1 }}>
                    <BotonLleno
                      variante="principal"
                      label={ES.publicaciones.retirarSi}
                      busy={busy}
                      onPress={() => void retirar(listing.id)}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <BotonLleno variante="discreto" label={ES.publicaciones.retirarNo} onPress={() => setAsking(null)} />
                  </View>
                </View>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', gap: SIZE.rowGap }}>
                <View style={{ flex: 1 }}>
                  <BotonLleno icon="repeat" label={ES.publicaciones.repetir} onPress={() => repetir(listing)} />
                </View>
                {onOffer && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={ES.publicaciones.retirar}
                    onPress={() => {
                      setProblem(null);
                      setAsking(listing.id);
                    }}
                    style={{
                      flex: 1,
                      minHeight: SIZE.tapTarget,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: SIZE.space / 2,
                      borderWidth: 1,
                      borderColor: PALETTE.linea,
                      backgroundColor: PALETTE.superficie,
                    }}
                  >
                    <Text style={{ fontSize: SIZE.bodySize, fontWeight: '600', color: PALETTE.error }}>
                      {ES.publicaciones.retirar}
                    </Text>
                  </Pressable>
                )}
              </View>
            )}
            {problem !== null && problem.id === listing.id && (
              <Text style={{ fontSize: SIZE.bodySize, fontWeight: '600', color: PALETTE.error }}>{problem.text}</Text>
            )}
          </View>
        );
      })}
    </>
  );
}
