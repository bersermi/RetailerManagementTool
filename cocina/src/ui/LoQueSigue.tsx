import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, Text, View } from 'react-native';

import { formatMXN } from '@/format/mxn';
import { horaTexto, prontoTexto, queTexto, type Orden } from '@/lib/apartados';
import { ES } from '@/strings';
import { letraEncabezado } from '@/theme/letra';
import { PALETTE, SIZE } from '@/theme/palette';
import { Boleto } from '@/ui/Mostrador';
import { Accion } from '@/ui/TarjetaOrden';

// ============================================================================
// *HOY*'S SECOND ZONE — *LO QUE SIGUE*. Plan task `10.5b-iv-a`, the family-shell page's
// hub (`cHoy`, zone 2): the next handover — its hour, *en 10 min* once it is close, the
// code, the dish, how it is eaten and paid, and *Entregar* on the row — then *Y 2
// apartados más por entregar ›*. *Entregar* opens the code; the row and the line open
// *Apartados*. Drawn only while something is still to hand over. ⚠️ `11.8-i`: a white ticket, *Entregar*
// on its stub (the design system's *Boleto*). NO CHECK CAN SEE IT.
// ============================================================================

export function LoQueSigue({
  siguiente,
  mas,
  ahora,
  onEntregar,
  onApartados,
}: {
  siguiente: Orden;
  mas: number;
  ahora: Date;
  onEntregar: () => void;
  onApartados: () => void;
}) {
  const pronto = prontoTexto(siguiente, ahora);
  const detalle = ES.loQueSigue.detalle(
    queTexto(siguiente),
    ES.loQueSigue.comer[siguiente.comer],
    formatMXN(siguiente.cobroCentavos),
    ES.loQueSigue.pago[siguiente.pago],
  );
  // ⚠️ `11.8-i`: A WHITE TICKET (`@/ui/Mostrador`'s `Boleto`, as `11.5-ii` showed it) — its hour in the
  // headings' face, the code and what to charge on the body, and *Entregar* on the stub that tears.
  return (
    <Boleto
      cuerpo={
        <View style={{ gap: SIZE.rowGap }}>
          <Text style={{ ...letraEncabezado(SIZE), color: PALETTE.tinta }}>
            {ES.loQueSigue.titulo}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: SIZE.rowGap }}>
            <Text style={{ ...letraEncabezado(SIZE), fontVariant: ['tabular-nums'], color: pronto === null ? PALETTE.tinta : PALETTE.marca }}>
              {horaTexto(siguiente.hora, ahora)}
            </Text>
            {pronto !== null && <Text style={{ fontSize: SIZE.smallSize, fontWeight: '700', color: PALETTE.marca }}>{pronto}</Text>}
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={`${ES.entregar.codigo(siguiente.codigo)}. ${detalle}`} onPress={onApartados} style={{ gap: 2 }}>
            <Text style={{ fontSize: SIZE.bodySize, fontWeight: '700', color: PALETTE.tinta }}>{ES.entregar.codigo(siguiente.codigo)}</Text>
            <Text numberOfLines={2} style={{ fontSize: SIZE.smallSize, lineHeight: 18, color: PALETTE.tintaApagada }}>
              {detalle}
            </Text>
          </Pressable>
        </View>
      }
      talon={
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SIZE.space }}>
          {mas > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={ES.loQueSigue.mas(mas)}
              onPress={onApartados}
              style={{ flexShrink: 1, flexDirection: 'row', alignItems: 'center', minHeight: SIZE.tapTarget - 12 }}
            >
              <Text style={{ flexShrink: 1, fontSize: SIZE.smallSize, fontWeight: '700', color: PALETTE.accion }}>{ES.loQueSigue.mas(mas)}</Text>
              <MaterialCommunityIcons name="chevron-right" size={17} color={PALETTE.accion} />
            </Pressable>
          ) : (
            <View />
          )}
          <Accion label={ES.apartados.entregar} tipo="ir" onPress={onEntregar} />
        </View>
      }
    />
  );
}
