import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, Text, View } from 'react-native';

import { formatMXN } from '@/format/mxn';
import { prontoTexto, queTexto, type Orden } from '@/lib/apartados';
import { clockOf } from '@/lib/ventana';
import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';
import { Accion } from '@/ui/TarjetaOrden';

// ============================================================================
// *HOY*'S SECOND ZONE — *LO QUE SIGUE*. Plan task `10.5b-iv-a`, the family-shell page's
// hub (`cHoy`, zone 2): the next handover — its hour, *en 10 min* once it is close, the
// code, the dish, how it is eaten and paid, and *Entregar* on the row — then *Y 2
// apartados más por entregar ›*. *Entregar* opens the code; the row and the line open
// *Apartados*. Drawn only while something is still to hand over. NO CHECK CAN SEE IT.
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
  return (
    <View style={{ gap: SIZE.rowGap, padding: SIZE.space * 1.25, borderRadius: SIZE.space * 1.25, borderWidth: 1, borderColor: PALETTE.linea, backgroundColor: PALETTE.superficie }}>
      <Text style={{ fontSize: SIZE.smallSize, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: PALETTE.tintaApagada }}>
        {ES.loQueSigue.titulo}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SIZE.space }}>
        <View style={{ alignItems: 'flex-start', minWidth: 52 }}>
          <Text style={{ fontSize: SIZE.bodySize, fontWeight: '700', fontVariant: ['tabular-nums'], color: pronto === null ? PALETTE.tinta : PALETTE.marca }}>
            {clockOf(siguiente.hora)}
          </Text>
          {pronto !== null && <Text style={{ fontSize: 11.5, fontWeight: '700', color: PALETTE.marca }}>{pronto}</Text>}
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={`${ES.entregar.codigo(siguiente.codigo)}. ${detalle}`} onPress={onApartados} style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontSize: SIZE.bodySize, fontWeight: '700', color: PALETTE.tinta }}>{ES.entregar.codigo(siguiente.codigo)}</Text>
          <Text numberOfLines={2} style={{ fontSize: SIZE.smallSize, lineHeight: 18, color: PALETTE.tintaApagada }}>
            {detalle}
          </Text>
        </Pressable>
        <Accion label={ES.apartados.entregar} tipo="ir" onPress={onEntregar} />
      </View>
      {mas > 0 && (
        <Pressable accessibilityRole="button" accessibilityLabel={ES.loQueSigue.mas(mas)} onPress={onApartados} style={{ flexDirection: 'row', alignItems: 'center', minHeight: SIZE.tapTarget - 12 }}>
          <Text style={{ fontSize: SIZE.smallSize, fontWeight: '700', color: PALETTE.accion }}>{ES.loQueSigue.mas(mas)}</Text>
          <MaterialCommunityIcons name="chevron-right" size={17} color={PALETTE.accion} />
        </Pressable>
      )}
    </View>
  );
}
