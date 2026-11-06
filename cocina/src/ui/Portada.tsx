import { Text, View } from 'react-native';

import { ratioOf, type Foto as Slot } from '@/api/fotos';
import { defaultsFor, type ColorCode } from '@/api/pagina';
import { ES } from '@/strings';
import { HUES } from '@/theme/colores';
import { TITULO } from '@/theme/letra';
import { PALETTE, SIZE } from '@/theme/palette';
import { Dibujo } from '@/ui/Dibujo';
import { Foto } from '@/ui/Foto';
import { Iniciales } from '@/ui/Iniciales';

// ============================================================================
// *ASÍ TE VEN TUS VECINOS* — her page's head as Itacate will draw it. Plan task
// `10.5-ii`, proposal B: the cover (her photo, or her trade's drawing on her
// colour), the circle (her logo, or her initials on her colour) over its edge,
// her kitchen's name and trade, her sentence, and *Ver en Google Maps* once she
// gave the link — the proposals page's kitchen card, cut to what she sets.
//
// ⚠️ TWO SCREENS DRAW IT (`R14`): the editor, live as she changes each part, and
// *Mi cocina* (her kitchen's screen until `10.5-v-c-i`), as the door to the editor.
// ⚠️ Her kitchen's name is the page's title, so since `10.5-v-c-i` it wears Nunito
// (`@/theme/letra`) — and so does the head of Itacate's copy of this page. ⚠️ ITACATE'S PAGE IS NOT BUILT
// YET (`10.5-iv`): this is the promise of its head, and the cover's 16:9 is what
// `@/api/fotos` stores — the drawing's other parts (the distance, *Hoy*, the
// rating) are Itacate's, and drawn there.
// ============================================================================

const CIRCLE = 52;

export function Portada({
  nombre,
  giro,
  giroNombre,
  color,
  frase,
  enlace,
  cover,
  logo,
}: {
  nombre: string;
  /** Her trade's code — which drawing an empty cover wears. */
  giro: string | null;
  /** Her trade's name, under hers; `null` when the list has not answered. */
  giroNombre: string | null;
  color: ColorCode;
  frase: string | null;
  enlace: string | null;
  cover: Slot;
  logo: Slot;
}) {
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: PALETTE.linea,
        borderRadius: SIZE.space,
        overflow: 'hidden',
        backgroundColor: PALETTE.superficie,
      }}
    >
      <View style={{ width: '100%', aspectRatio: ratioOf('portada') }}>
        <Dibujo dibujo={defaultsFor(giro).dibujo} color={color} modo="portada" />
        <Foto foto={cover} size="grande" />
      </View>
      <View style={{ paddingHorizontal: SIZE.space, paddingBottom: SIZE.space, gap: SIZE.rowGap / 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: SIZE.rowGap }}>
          <View
            style={{
              marginTop: -CIRCLE / 2,
              width: CIRCLE,
              height: CIRCLE,
              borderRadius: CIRCLE / 2,
              borderWidth: 2,
              borderColor: PALETTE.superficie,
              overflow: 'hidden',
              backgroundColor: HUES[color],
            }}
          >
            <Iniciales nombre={nombre} color={color} size={CIRCLE} />
            <Foto foto={logo} />
          </View>
          <View style={{ flex: 1, paddingTop: SIZE.rowGap / 2 }}>
            <Text numberOfLines={2} style={{ fontSize: SIZE.bodySize + 1, ...TITULO, color: PALETTE.tinta }}>
              {nombre}
            </Text>
            {giroNombre !== null && (
              <Text numberOfLines={1} style={{ fontSize: SIZE.smallSize, color: PALETTE.tintaApagada }}>
                {giroNombre}
              </Text>
            )}
          </View>
        </View>
        {frase !== null && <Text style={{ fontSize: SIZE.bodySize - 1, color: PALETTE.tinta }}>{frase}</Text>}
        {enlace !== null && (
          <Text style={{ fontSize: SIZE.smallSize, fontWeight: '700', color: HUES[color] }}>{ES.pagina.verEnMaps}</Text>
        )}
      </View>
    </View>
  );
}
