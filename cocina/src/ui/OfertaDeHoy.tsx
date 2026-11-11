import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { CANTIDAD_MAXIMA, lineDetail, listingState, type Listing } from '@/api/listing';
import { claveDePlato } from '@/lib/apartados';
import { slotOf } from '@/lib/ventana';
import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';

// ============================================================================
// ONE OF TODAY'S OFFERS, IN *TUS OFERTAS* (the family-shell page's `offerCard`). Plan
// task `10.5-v-c-i`: *En oferta* or *Terminada*, its hours, each dish with its figures,
// and — while it is on offer — *Ya se terminó* and, since `10.5-v-c-ii`, *Así la ven*
// beside it (the family-shell page's `offerCard`): the offer as a neighbour opens it in
// Itacate.
//
// ⚠️ `10.5b-iv-c`: − AND + ON EACH DISH WHILE IT IS ON OFFER (call 17, ruled 2026-11-05): *quedan
// 2 de 5*, as *Hoy* says it, between the two buttons; − stops at what is reserved (`cantidadPedida`,
// the database's `TD019`), + at 999. Each tap is drawn at once and sent (`useCantidades`); a refusal
// is said under its dish. The price and the dish never change.
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
  onAsiLaVen,
  tomados,
  onCantidad,
  ocupadas,
  problemas,
}: {
  listing: Listing;
  ahora: Date;
  busy: boolean;
  problema: string | null;
  onTerminar: () => void;
  /** *Así la ven* — its page in Itacate. */
  onAsiLaVen: () => void;
  /** `10.5b-iv-c`: what is taken of each dish (`tomadosDe`), or `null` while her reservations are not read. */
  tomados: ReadonlyMap<string, number> | null;
  /** − (`-1`) or + (`1`) on one dish, with what it offers and what is taken. */
  onCantidad: (lineNo: number, paso: 1 | -1, count: number, taken: number) => void;
  /** The dishes whose count is being sent, by `claveDePlato`. */
  ocupadas: ReadonlySet<string>;
  /** A refused count's sentence, by `claveDePlato`. */
  problemas: Readonly<Record<string, string>>;
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
      {listing.lines.map((line, i) => {
        const clave = claveDePlato(listing.id, i + 1);
        const taken = tomados?.get(clave) ?? 0;
        const problema = problemas[clave] ?? null;
        return (
          <View key={i} style={{ gap: 2 }}>
            <Text style={{ fontSize: SIZE.bodySize, fontWeight: '700', color: PALETTE.tinta }}>{line.name}</Text>
            <Text style={quiet}>{lineDetail(line)}</Text>
            {line.description !== null && <Text style={quiet}>{line.description}</Text>}
            {enOferta && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: SIZE.rowGap, marginTop: SIZE.rowGap / 2 }}>
                <Paso
                  icono="minus"
                  label={ES.ofertas.menos(line.name)}
                  disabled={line.count <= taken || line.count <= 0}
                  onPress={() => onCantidad(i + 1, -1, line.count, taken)}
                />
                <Text
                  accessibilityLiveRegion="polite"
                  style={{ flex: 1, textAlign: 'center', fontSize: SIZE.bodySize, fontWeight: '700', color: PALETTE.tinta }}
                >
                  {ES.hoy.quedanRenglon(Math.max(0, line.count - taken), line.count)}
                </Text>
                {ocupadas.has(clave) && <ActivityIndicator color={PALETTE.accion} />}
                <Paso
                  icono="plus"
                  label={ES.ofertas.mas(line.name)}
                  disabled={line.count >= CANTIDAD_MAXIMA}
                  onPress={() => onCantidad(i + 1, 1, line.count, taken)}
                />
              </View>
            )}
            {problema !== null && <Text style={{ fontSize: SIZE.bodySize - 1, fontWeight: '600', color: PALETTE.error }}>{problema}</Text>}
          </View>
        );
      })}

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
          <View style={{ flexDirection: 'row', gap: SIZE.rowGap }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={ES.ofertas.yaSeTermino}
              onPress={() => setPreguntando(true)}
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
              <Text style={{ fontSize: SIZE.bodySize, fontWeight: '600', color: PALETTE.error }}>{ES.ofertas.yaSeTermino}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={ES.vista.asiLaVen}
              onPress={onAsiLaVen}
              style={{
                flex: 1,
                minHeight: SIZE.tapTarget,
                flexDirection: 'row',
                gap: 6,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: SIZE.space / 2,
                borderWidth: 1,
                borderColor: PALETTE.linea,
                backgroundColor: PALETTE.superficie,
              }}
            >
              <MaterialCommunityIcons name="eye-outline" size={18} color={PALETTE.accion} />
              <Text style={{ fontSize: SIZE.bodySize, fontWeight: '600', color: PALETTE.accion }}>{ES.vista.asiLaVen}</Text>
            </Pressable>
          </View>
        ))}
      {problema !== null && <Text style={{ fontSize: SIZE.bodySize, fontWeight: '600', color: PALETTE.error }}>{problema}</Text>}
    </View>
  );
}

/** One of the two buttons beside *quedan 2 de 5*: a square the app's tap target, the action's green. */
function Paso({
  icono,
  label,
  disabled,
  onPress,
}: {
  icono: 'minus' | 'plus';
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        width: SIZE.tapTarget,
        height: SIZE.tapTarget,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: SIZE.space / 2,
        borderWidth: 1.5,
        borderColor: disabled ? PALETTE.linea : PALETTE.accion,
        backgroundColor: pressed ? PALETTE.accionSuave : PALETTE.superficie,
      })}
    >
      <MaterialCommunityIcons name={icono} size={22} color={disabled ? PALETTE.linea : PALETTE.accion} />
    </Pressable>
  );
}
