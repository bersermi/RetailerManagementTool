import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { lineDetail, listingState, type Listing } from '@/api/listing';
import { slotOf } from '@/lib/ventana';
import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';

// ============================================================================
// ONE OF TODAY'S OFFERS, IN *TUS OFERTAS* (the family-shell page's `offerCard`). Plan
// task `10.5-v-c-i`: *En oferta* or *Terminada*, its hours, each dish with its figures,
// and — while it is on offer — *Ya se terminó*. − and + arrive with reserving (`10.5b`),
// *Así la ven* with `10.5-v-c-ii`.
//
// ⚠️ *YA SE TERMINÓ* IS ASKED ONCE INLINE, WERA'S WAY (`desperdicio.tsx`'s
// *¿Cancelarla?*, `8k`): the question, *No* in green and *Sí, ya se terminó* in red —
// quiet words, never a filled button inviting the tap that takes it down. It is
// `withdraw_listing`: a publication is never edited, so to change what she offers she
// ends it and publishes again (`0072`).
// ============================================================================

export function OfertaDeHoy({
  listing,
  ahora,
  busy,
  problema,
  onTerminar,
}: {
  listing: Listing;
  ahora: Date;
  busy: boolean;
  problema: string | null;
  onTerminar: () => void;
}) {
  const [preguntando, setPreguntando] = useState(false);
  const enOferta = listingState(listing, ahora) === 'oferta';
  const quiet = { fontSize: SIZE.bodySize - 1, color: PALETTE.tintaApagada } as const;
  return (
    <View
      style={{
        gap: SIZE.rowGap,
        padding: SIZE.space,
        borderRadius: SIZE.space,
        borderWidth: enOferta ? 2 : 1,
        borderColor: enOferta ? PALETTE.accion : PALETTE.linea,
        backgroundColor: PALETTE.superficie,
      }}
    >
      <Text
        style={{
          fontSize: SIZE.smallSize,
          fontWeight: '700',
          letterSpacing: 1,
          textTransform: 'uppercase',
          color: enOferta ? PALETTE.accion : PALETTE.tintaApagada,
        }}
      >
        {enOferta ? ES.ofertas.estado.oferta : ES.ofertas.estado.terminada}
      </Text>
      <Text style={{ fontSize: SIZE.bodySize, fontWeight: '600', color: PALETTE.tinta }}>{slotOf(listing, ahora)}</Text>
      {listing.lines.map((line, i) => (
        <View key={i} style={{ gap: 2 }}>
          <Text style={{ fontSize: SIZE.bodySize, fontWeight: '700', color: PALETTE.tinta }}>{line.name}</Text>
          <Text style={quiet}>{lineDetail(line)}</Text>
          {line.description !== null && <Text style={quiet}>{line.description}</Text>}
        </View>
      ))}

      {enOferta &&
        (preguntando ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SIZE.space }}>
            <Text style={{ flex: 1, fontSize: SIZE.bodySize, fontWeight: '600', color: PALETTE.tinta }}>{ES.ofertas.pregunta}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={ES.ofertas.no}
              disabled={busy}
              onPress={() => setPreguntando(false)}
              style={{ minHeight: SIZE.tapTarget, justifyContent: 'center', paddingHorizontal: SIZE.rowGap }}
            >
              <Text style={{ fontSize: SIZE.bodySize, fontWeight: '600', color: PALETTE.accion }}>{ES.ofertas.no}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={ES.ofertas.si}
              accessibilityState={{ disabled: busy }}
              disabled={busy}
              onPress={onTerminar}
              style={{ minHeight: SIZE.tapTarget, justifyContent: 'center', paddingHorizontal: SIZE.rowGap, opacity: busy ? 0.6 : 1 }}
            >
              {busy ? (
                <ActivityIndicator color={PALETTE.error} />
              ) : (
                <Text style={{ fontSize: SIZE.bodySize, fontWeight: '700', color: PALETTE.error }}>{ES.ofertas.si}</Text>
              )}
            </Pressable>
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={ES.ofertas.yaSeTermino}
            onPress={() => setPreguntando(true)}
            style={{
              minHeight: SIZE.tapTarget,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: SIZE.space / 2,
              borderWidth: 1,
              borderColor: PALETTE.linea,
              backgroundColor: PALETTE.superficie,
            }}
          >
            <Text style={{ fontSize: SIZE.bodySize, fontWeight: '600', color: PALETTE.error }}>{ES.ofertas.yaSeTermino}</Text>
          </Pressable>
        ))}
      {problema !== null && <Text style={{ fontSize: SIZE.bodySize, fontWeight: '600', color: PALETTE.error }}>{problema}</Text>}
    </View>
  );
}
