import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { lineDetail } from '@/api/listing';
import { nombreDe, type Anterior as Fila } from '@/lib/hoy';
import { slotOf } from '@/lib/ventana';
import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';

// ============================================================================
// ONE OF HER PAST OFFERS, IN *TUS OFERTAS › ANTERIORES* (the family-shell page's
// `cOfertas`). Plan task `10.5-v-c-i`: what she offered, its first dish's figures and
// when — and *Repetir*, or *Hoy* when she already published it again today. They moved
// here from her kitchen's screen (his ruling of 2026-11-06: *Mi cocina* is what she sets
// once). What *Repetir* does is `@/lib/useRepetir`'s.
// ============================================================================

export function Anterior({ fila, ahora, busy, onRepetir }: { fila: Fila; ahora: Date; busy: boolean; onRepetir: () => void }) {
  const { listing } = fila;
  const [primera] = listing.lines;
  const detalle = [primera === undefined ? null : lineDetail(primera), slotOf(listing, ahora)].filter((p) => p !== null).join(' · ');
  const nombre = nombreDe(listing);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: SIZE.space, paddingHorizontal: SIZE.space, paddingVertical: SIZE.rowGap + 2 }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontSize: SIZE.bodySize - 1, fontWeight: '700', color: PALETTE.tinta }}>{nombre}</Text>
        <Text style={{ fontSize: SIZE.smallSize, lineHeight: 18, color: PALETTE.tintaApagada }}>{detalle}</Text>
      </View>
      {fila.hoy ? (
        <Text
          style={{
            fontSize: SIZE.smallSize,
            fontWeight: '700',
            color: PALETTE.accion,
            backgroundColor: PALETTE.accionSuave,
            borderRadius: 999,
            paddingHorizontal: 10,
            paddingVertical: 3,
            overflow: 'hidden',
          }}
        >
          {ES.ofertas.hoyTag}
        </Text>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={ES.hoy.chipAyuda(nombre)}
          accessibilityState={{ disabled: busy }}
          disabled={busy}
          onPress={onRepetir}
          style={{
            minHeight: SIZE.tapTarget - 8,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingHorizontal: SIZE.space,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: PALETTE.accion,
            backgroundColor: PALETTE.accionSuave,
            opacity: busy ? 0.6 : 1,
          }}
        >
          {busy ? (
            <ActivityIndicator color={PALETTE.accion} />
          ) : (
            <MaterialCommunityIcons name="repeat" size={16} color={PALETTE.accion} />
          )}
          <Text style={{ fontSize: SIZE.smallSize, fontWeight: '700', color: PALETTE.accion }}>{ES.ofertas.repetir}</Text>
        </Pressable>
      )}
    </View>
  );
}
