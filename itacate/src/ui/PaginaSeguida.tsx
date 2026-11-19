import { Text, View } from 'react-native';

import type { Seguida } from '@/api/siguiendo';
import { queYDondeDe } from '@/lib/paginas';
import { cocinaDeSeguida } from '@/lib/misCocinas';
import { diasAtras, publicoTexto } from '@/lib/lista';
import { ES } from '@/strings';
import { TITULO } from '@/theme/letra';
import { PALETTE, SIZE } from '@/theme/palette';
import { Circulo } from '@/ui/Circulo';
import { PaginaVacia } from '@/ui/PaginaVacia';
import { Seguir } from '@/ui/Seguir';

// ============================================================================
// A KITCHEN SHE FOLLOWS THAT THE DOOR NO LONGER SENDS. Plan task `10.9d-ii` — what `10.9d-i` left
// it, (b): a kitchen quiet for more than two weeks is not in the door (`0078`), yet she still
// follows it (`my_follows` sends every one), so its row in *Mis cocinas* opens this page rather than
// *Esta cocina ya no está en Itacate*. ⚠️ IT SAYS ONLY WHAT `my_follows` KNOWS — her circle, her
// name, trade and colonia, that she has not published in two weeks and when she last did — never
// her full page (`@/ui/PaginaDeCocina`), which would read *Todavía sin calificaciones* of a kitchen
// that has stars. *Seguir* and the bell, so she can stop following it from here.
// NO CHECK CAN SEE THIS (ADR-035 §2.11): the phone is its instrument.
// ============================================================================

/** The door keeps a quiet kitchen 14 days after it last published (`0078`). */
const DIAS_EN_LA_PUERTA = 14;

export function PaginaSeguida({ seguida, giroNombre, ahora }: { seguida: Seguida; giroNombre: string | null; ahora: Date }) {
  const queYDonde = queYDondeDe(giroNombre, cocinaDeSeguida(seguida, null).address);
  const cuando = seguida.ultimoDia === null ? null : publicoTexto(seguida.ultimoDia, ahora);
  const atras = seguida.ultimoDia === null ? null : diasAtras(seguida.ultimoDia, ahora);
  // ⚠️ *No ha publicado …* only when it is true: a list read before her newest publication can send
  // her here for a moment while `my_follows` already knows the day (the review of `10.9d-ii`).
  const callada = atras === null || DIAS_EN_LA_PUERTA < atras;
  return (
    <PaginaVacia texto={callada ? ES.seguir.callada : (cuando ?? '')}>
      <View style={{ alignItems: 'center', gap: SIZE.rowGap }}>
        <Circulo cocina={cocinaDeSeguida(seguida, null)} size={72} />
        <Text accessibilityRole="header" style={{ fontSize: SIZE.titleSize - 2, ...TITULO, color: PALETTE.tinta, textAlign: 'center' }}>
          {seguida.nombre}
        </Text>
        {queYDonde !== null && <Text style={{ fontSize: SIZE.smallSize, color: PALETTE.tintaApagada, textAlign: 'center' }}>{queYDonde}</Text>}
        {callada && cuando !== null && <Text style={{ fontSize: SIZE.smallSize, color: PALETTE.tintaApagada, textAlign: 'center' }}>{cuando}</Text>}
      </View>
      <Seguir cocinaId={seguida.id} nombre={seguida.nombre} />
    </PaginaVacia>
  );
}
