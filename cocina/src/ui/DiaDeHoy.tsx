import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, Text, View } from 'react-native';

import { RENGLONES_EN_LA_TARJETA, faltaTexto, fraccionDe, hastaTexto, ultimaTexto, type Dia } from '@/lib/hoy';
import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';

// ============================================================================
// *HOY*'S FIRST ZONE — THE DAY AT A GLANCE (the family-shell page's green card, round
// 6). Plan task `10.5-v-c-i`. With something on offer: *Hoy en Itacate* and until when,
// how many plates in all, the time left as a bar, each dish on a line — *4 en oferta*
// or *Terminada* — and *Faltan 1 h 40 min*; since `10.5b-iv-a`, once her reservations are
// read, *Quedan 4 de 8*, *quedan 2 de 5* and *Faltan 1 h 40 min · 1 entregado*. With nothing: *Hoy todavía no has
// publicado* and when she last did; once today's is over, *Por hoy ya se terminó*.
//
// ⚠️ THE WHOLE CARD IS ONE DOOR, TO *TUS OFERTAS* — nothing on it is edited in place
// (his direction: *"for them to easily reach the main actions"*); correcting a count is
// one tap further, in *Tus ofertas* (the page's argument against, told to him).
// ⚠️ STATE FIRST, then the door's word (ADR-035 §2.8). What it says is `@/lib/hoy`'s,
// pinned by `test/hoy.test.ts`; the bar's length is drawn, never animated — it is
// shorter each time the clock is read again (`useAhora`), with no movement of its own.
// ============================================================================

export function DiaDeHoy({ dia, ahora, onPress }: { dia: Dia; ahora: Date; onPress: () => void }) {
  if (dia.kind !== 'oferta') {
    const [titulo, detalle] =
      dia.kind === 'terminado' ? [ES.hoy.terminado, ES.hoy.terminadoDetalle] : [ES.hoy.nada, ultimaTexto(dia.ultima, ahora)];
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={oraciones(titulo, detalle, ES.hoy.verOfertas)}
        onPress={onPress}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: SIZE.space,
          padding: SIZE.space * 1.25,
          borderRadius: SIZE.space * 1.25,
          borderWidth: 1,
          borderColor: PALETTE.linea,
          backgroundColor: pressed ? PALETTE.fondo : PALETTE.superficie,
        })}
      >
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontSize: SIZE.bodySize + 1, fontWeight: '700', color: PALETTE.tinta }}>{titulo}</Text>
          <Text style={{ fontSize: SIZE.smallSize, lineHeight: 19, color: PALETTE.tintaApagada }}>{detalle}</Text>
        </View>
        <Puerta color={PALETTE.accion} />
      </Pressable>
    );
  }

  const quedan = dia.renglones.length - RENGLONES_EN_LA_TARJETA;
  const fraccion = fraccionDe(dia.desde, dia.hasta, ahora);
  // ⚠️ `10.5b-iv-a`: once her reservations are read, what is LEFT of what she offers.
  const grande = dia.de === null ? ES.hoy.porciones(dia.total) : ES.hoy.quedan(dia.total, dia.de);
  const hasta = hastaTexto(dia.hasta, ahora);
  const sinEntregados = faltaTexto(dia.desde, dia.hasta, ahora);
  const falta = dia.entregados === null || dia.entregados === 0 ? sinEntregados : ES.hoy.yEntregados(sinEntregados, dia.entregados);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={oraciones(`${ES.hoy.enItacate}, ${hasta}`, grande, falta, ES.hoy.verOfertas)}
      onPress={onPress}
      style={({ pressed }) => ({
        gap: SIZE.rowGap + 2,
        padding: SIZE.space * 1.25,
        borderRadius: SIZE.space * 1.25,
        backgroundColor: PALETTE.accion,
        opacity: pressed ? 0.92 : 1,
      })}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: SIZE.rowGap }}>
        <Text style={{ fontSize: SIZE.smallSize, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: PALETTE.sobreAccionApagada }}>
          {ES.hoy.enItacate}
        </Text>
        <Text style={{ fontSize: SIZE.smallSize, fontWeight: '600', color: PALETTE.sobreAccionApagada }}>{hasta}</Text>
      </View>
      <Text style={{ fontSize: SIZE.titleSize + 4, fontWeight: '800', color: PALETTE.sobreAccion }}>{grande}</Text>
      <View style={{ height: 6, borderRadius: 3, overflow: 'hidden', backgroundColor: PALETTE.barraSobreAccion }}>
        <View style={{ width: `${Math.round(fraccion * 100)}%`, height: 6, borderRadius: 3, backgroundColor: PALETTE.sobreAccion }} />
      </View>
      <View style={{ gap: 4 }}>
        {dia.renglones.slice(0, RENGLONES_EN_LA_TARJETA).map((renglon) => (
          <View key={renglon.key} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: SIZE.space }}>
            <Text numberOfLines={1} style={{ flex: 1, fontSize: SIZE.bodySize - 1, color: PALETTE.sobreAccion }}>
              {renglon.nombre}
            </Text>
            <Text style={{ fontSize: SIZE.bodySize - 1, fontWeight: '700', color: renglon.terminada ? PALETTE.sobreAccionApagada : PALETTE.sobreAccion }}>
              {renglon.terminada
                ? ES.hoy.terminada
                : renglon.de === null
                  ? ES.hoy.enOferta(renglon.cuantos)
                  : ES.hoy.quedanRenglon(renglon.cuantos, renglon.de)}
            </Text>
          </View>
        ))}
        {quedan > 0 && (
          <Text style={{ fontSize: SIZE.smallSize, color: PALETTE.sobreAccionApagada }}>{ES.hoy.masRenglones(quedan)}</Text>
        )}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: SIZE.rowGap }}>
        <Text style={{ fontSize: SIZE.smallSize, fontWeight: '600', color: PALETTE.sobreAccionApagada }}>{falta}</Text>
        <Puerta color={PALETTE.sobreAccion} />
      </View>
    </Pressable>
  );
}

/** What a screen reader says: each part a sentence, its period added only when it has none. */
function oraciones(...partes: string[]): string {
  return partes.map((parte) => (/[.!?]$/.test(parte) ? parte : `${parte}.`)).join(' ');
}

/** *Tus ofertas ›* — the card's door, in its word. */
function Puerta({ color }: { color: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Text style={{ fontSize: SIZE.smallSize, fontWeight: '700', color }}>{ES.hoy.verOfertas}</Text>
      <MaterialCommunityIcons name="chevron-right" size={18} color={color} />
    </View>
  );
}
