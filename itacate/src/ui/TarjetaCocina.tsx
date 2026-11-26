import MaterialCommunityIcons from '@/marca/Icono';
import { Pressable, Text, View } from 'react-native';

import { distanciaTexto } from '@/lib/distancia';
import { cuandoPublica, type Tarjeta } from '@/lib/lista';
import { distanciaYEstrellas, marcaDeSuPromocion } from '@/lib/paginas';
import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';
import { borde, esq } from '@/theme/piel';
import { MarcaPromocion } from '@/ui/BandaPromocion';
import { Circulo } from '@/ui/Circulo';

// ============================================================================
// A QUIET KITCHEN, AS THE LIST SHOWS IT — faded. Plan task `10.5-iv-a-i`, the owner's
// ruling of 2026-11-01, late: a kitchen that published in the last 14 days and has
// nothing on offer now stays on the list *"as a faded pin, its card saying when it
// usually publishes"* — *Suele tener ofertas entre semana, hacia las 17:00* (his
// words were *Suele publicar …* until `10.5-v-a`), else
// *Publicó ayer* or *Publicó el martes* (`@/lib/lista`'s `cuandoPublica`).
//
// ⚠️ SMALLER THAN A DISH'S CARD, ON PURPOSE (decided by `10.5-iv-a-i`): her circle,
// her name, that line and the distance — no picture, so what can be picked up today
// stands out. ⚠️ SINCE `10.5-iv-a-ii` IT OPENS HER PAGE (`onPress`, the list's), where
// her pattern and *Lo que suele ofrecer* are. ⚠️ NO CHECK CAN SEE IT (ADR-035 §2.11):
// the phone is its instrument.
// ⚠️ SINCE `10.9g-iii` A KITCHEN WITH A PROMOTION AND NOTHING ON OFFER (`0087` keeps her in the door, though quiet
// two weeks or more) WEARS HER NEWEST PROMOTION'S MARK under its line (G38: with her card's *5/8*, two marks at
// most) — so a card with no pattern to say still says why she is here. Her place in the list does not change.
// ============================================================================

/** How faded — enough to read, clearly not on offer. */
const APAGADA = 0.6;

export function TarjetaCocina({
  tarjeta,
  ahora,
  onPress,
  marca = null,
}: {
  tarjeta: Extract<Tarjeta, { kind: 'cocina' }>;
  ahora: Date;
  onPress: () => void;
  /** `10.9e-iii` (G38): her progress on its loyalty card — *5/8* — under its line (the page's `smark`), its words on the card's label. */
  marca?: { readonly texto: string; readonly ayuda: string } | null;
}) {
  const { cocina, metros } = tarjeta;
  const linea = cuandoPublica(cocina.summary, ahora);
  const promocion = marcaDeSuPromocion(cocina);
  // ⚠️ `10.5b-iii-b`: her stars beside the distance, from five ratings (*350 m · ★ 4.8*).
  const derecha = distanciaYEstrellas(metros === null ? null : distanciaTexto(metros), cocina.estrellas);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[ES.cerca.abrirCocina(cocina.name), promocion?.ayuda, marca?.ayuda].filter(Boolean).join('. ')}
      onPress={onPress}
      style={({ pressed }) => ({
        opacity: pressed ? APAGADA * 0.75 : APAGADA,
        flexDirection: 'row',
        alignItems: 'center',
        gap: SIZE.space,
        padding: SIZE.space,
        borderWidth: borde(1),
        borderColor: PALETTE.linea,
        borderRadius: esq(SIZE.space),
        backgroundColor: PALETTE.superficie,
      })}
    >
      <Circulo cocina={cocina} size={44} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text numberOfLines={1} style={{ fontSize: SIZE.bodySize, fontWeight: '700', color: PALETTE.tinta }}>
          {cocina.name}
        </Text>
        {linea !== null && <Text style={{ fontSize: SIZE.smallSize, color: PALETTE.tintaApagada }}>{linea}</Text>}
        {promocion !== null && <MarcaPromocion icono={promocion.icono} texto={promocion.texto} chica />}
        {marca !== null && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <MaterialCommunityIcons name="stamper" size={13} color={PALETTE.accion} />
            <Text style={{ fontSize: SIZE.smallSize - 1, fontWeight: '700', color: PALETTE.accion }}>{marca.texto}</Text>
          </View>
        )}
      </View>
      {derecha !== null && <Text style={{ fontSize: SIZE.smallSize, color: PALETTE.tintaApagada }}>{derecha}</Text>}
    </Pressable>
  );
}
