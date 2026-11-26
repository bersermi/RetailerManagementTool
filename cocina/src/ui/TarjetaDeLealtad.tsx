import MaterialCommunityIcons from '@/marca/Icono';
import { Text, View } from 'react-native';

import type { ColorCode } from '@/api/pagina';
import { enFrase } from '@/lib/tarjeta';
import { ES } from '@/strings';
import { HUES } from '@/theme/colores';
import { TITULO } from '@/theme/letra';
import { PALETTE, SIZE } from '@/theme/palette';
import { ENCABEZADO } from '@/theme/letra';
import { ES_A, esq } from '@/theme/piel';
import { SelloVaca } from '@/ui/Mostrador';
import { Iniciales } from '@/ui/Iniciales';
import { Foto } from '@/vecinos/ui/Foto';

// ============================================================================
// THE CARD AS HER NEIGHBOURS SEE IT — IN HER KITCHEN'S COLOUR AND LOGO (G41: Itacate is the wallet,
// the kitchen is the brand). Plan task `10.9e-ii`, the family-shell page's `kcardHtml`: her circle and
// *Tarjeta de lealtad* over her name, *3 de 8*, a row of stamps, *8 sellos = una comida corrida*. On the
// card's screen (with three stamps drawn, as the page does) and in the setup's preview (none).
// ⚠️ ITS COLOUR IS HER PAGE'S (`colorOf` — the one Itacate draws her circle in), its logo her page's
// logo, else her initials on that colour. Nothing here is read from the network but the logo, which
// `@/vecinos/ui/Foto` keeps on disk. NO CHECK CAN SEE THIS CARD (ADR-035 §2.11): the phone is its instrument.
// ============================================================================

export function TarjetaDeLealtad({
  cocinaId,
  nombre,
  color,
  logo,
  sellos,
  de,
  premio,
  dias,
}: {
  cocinaId: string;
  nombre: string;
  color: ColorCode;
  logo: string | null;
  /** How many stamps are drawn filled. */
  sellos: number;
  de: number;
  premio: string;
  /** Days without coming before the stamps go; 0 is *Nunca*. */
  dias: number;
}) {
  const hue = HUES[color];
  const claro = 'rgba(255, 255, 255, 0.82)';
  return (
    <View
      accessible
      accessibilityLabel={`${ES.tarjeta.nombre}, ${nombre}. ${ES.tarjeta.cuenta(sellos, de)}. ${ES.tarjeta.igual(de, enFrase(premio))}.`}
      style={{ backgroundColor: hue, borderRadius: esq(18), padding: SIZE.space + 2, gap: SIZE.space }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SIZE.rowGap + 2 }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            overflow: 'hidden',
            borderWidth: 2,
            borderColor: 'rgba(255, 255, 255, 0.55)',
            backgroundColor: hue,
          }}
        >
          <Iniciales nombre={nombre} color={color} size={44} />
          <Foto path={logo} cocinaId={cocinaId} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={ES_A ? { ...ENCABEZADO, color: PALETTE.superficie } : { fontSize: SIZE.bodySize, ...TITULO, color: PALETTE.superficie }}>{ES.tarjeta.nombre}</Text>
          <Text numberOfLines={1} style={{ fontSize: SIZE.smallSize, color: claro }}>
            {nombre}
          </Text>
        </View>
        <Text style={{ fontSize: SIZE.bodySize, fontWeight: '800', color: PALETTE.superficie }}>{ES.tarjeta.cuenta(sellos, de)}</Text>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {Array.from({ length: de }, (_, i) => (
          <View
            key={i}
            style={{
              width: 30,
              height: 30,
              borderRadius: 15,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: i < sellos && ES_A ? 0 : 1.5,
              borderColor: 'rgba(255, 255, 255, 0.6)',
              backgroundColor: i < sellos && !ES_A ? PALETTE.superficie : 'transparent',
            }}
          >
            {i < sellos && (ES_A ? <SelloVaca i={i} tinta={PALETTE.superficie} /> : <MaterialCommunityIcons name="cow" size={17} color={hue} />)}
          </View>
        ))}
      </View>
      <Text style={{ fontSize: SIZE.smallSize + 1, color: PALETTE.superficie }}>
        {ES.tarjeta.igual(de, '')}
        <Text style={{ fontWeight: '800' }}>{enFrase(premio)}</Text>
      </Text>
      {dias > 0 && <Text style={{ fontSize: SIZE.smallSize - 1, color: claro }}>{ES.tarjeta.venceSiNoVienen(dias)}</Text>}
    </View>
  );
}
