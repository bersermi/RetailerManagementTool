import { Text, View } from 'react-native';

import { distanciaTexto } from '@/lib/distancia';
import { cuandoPublica, type Tarjeta } from '@/lib/lista';
import { PALETTE, SIZE } from '@/theme/palette';
import { Circulo } from '@/ui/Circulo';

// ============================================================================
// A QUIET KITCHEN, AS THE LIST SHOWS IT — faded. Plan task `10.5-iv-a-i`, the owner's
// ruling of 2026-11-01, late: a kitchen that published in the last 14 days and has
// nothing on offer now stays on the list *"as a faded pin, its card saying when it
// usually publishes"* — *Suele publicar entre semana, hacia las 17:00*, else
// *Publicó ayer* or *Publicó el martes* (`@/lib/lista`'s `cuandoPublica`).
//
// ⚠️ SMALLER THAN A DISH'S CARD, ON PURPOSE (decided by `10.5-iv-a-i`): her circle,
// her name, that line and the distance — no picture, so what can be picked up today
// stands out. ⚠️ NOT A BUTTON YET: her page is `10.5-iv-a-ii`. ⚠️ NO CHECK CAN SEE
// IT (ADR-035 §2.11): the phone is its instrument.
// ============================================================================

/** How faded — enough to read, clearly not on offer. */
const APAGADA = 0.6;

export function TarjetaCocina({ tarjeta, ahora }: { tarjeta: Extract<Tarjeta, { kind: 'cocina' }>; ahora: Date }) {
  const { cocina, metros } = tarjeta;
  const linea = cuandoPublica(cocina.summary, ahora);
  return (
    <View
      style={{
        opacity: APAGADA,
        flexDirection: 'row',
        alignItems: 'center',
        gap: SIZE.space,
        padding: SIZE.space,
        borderWidth: 1,
        borderColor: PALETTE.linea,
        borderRadius: SIZE.space,
        backgroundColor: PALETTE.superficie,
      }}
    >
      <Circulo cocina={cocina} size={44} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text numberOfLines={1} style={{ fontSize: SIZE.bodySize, fontWeight: '700', color: PALETTE.tinta }}>
          {cocina.name}
        </Text>
        {linea !== null && <Text style={{ fontSize: SIZE.smallSize, color: PALETTE.tintaApagada }}>{linea}</Text>}
      </View>
      {metros !== null && (
        <Text style={{ fontSize: SIZE.smallSize, color: PALETTE.tintaApagada }}>{distanciaTexto(metros)}</Text>
      )}
    </View>
  );
}
