import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { MyCardRow } from '@/api/tarjeta';
import { cocinaDeTarjeta } from '@/lib/tarjeta';
import { ES } from '@/strings';
import { TITULO } from '@/theme/letra';
import { PALETTE, SIZE } from '@/theme/palette';
import { Atras } from '@/ui/Atras';
import { Circulo } from '@/ui/Circulo';
import { SeccionTarjeta } from '@/ui/SeccionTarjeta';
import { Seguir } from '@/ui/Seguir';

// ============================================================================
// A KITCHEN WHOSE CARD SHE HOLDS, WHICH THE DOOR NO LONGER SENDS. Plan task `10.9e-iii` (found re-reading the
// route): a kitchen quiet for two weeks is not in the door (`0078`), yet her stamps and rewards there are hers
// (`my_cards`) and *Mis cocinas* lists it — so its row must open something true, never *Esta cocina ya no está en
// Itacate*. What `my_cards` says of it — its circle in its colour and logo, its name and colonia —, *No ha publicado
// en las últimas dos semanas*, *Seguir*, and her card (`@/ui/SeccionTarjeta`, which reads her cards by its id).
// `@/ui/PaginaSeguida` is the same page for a kitchen she follows and holds no card at. Scrolls: the card is tall.
// NO CHECK CAN SEE THIS PAGE (ADR-035 §2.11): the phone is its instrument.
// ============================================================================

export function PaginaDeTarjeta({ card }: { card: MyCardRow }) {
  const insets = useSafeAreaInsets();
  const cocina = cocinaDeTarjeta(card, null);
  return (
    <View style={{ flex: 1, backgroundColor: PALETTE.fondo, paddingTop: insets.top }}>
      <View style={{ height: SIZE.tapTarget + SIZE.space * 2 }}>
        <Atras />
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: SIZE.space * 2, paddingBottom: insets.bottom + SIZE.space * 3, gap: SIZE.space * 2 }}>
        <View style={{ alignItems: 'center', gap: SIZE.rowGap }}>
          <Circulo cocina={cocina} size={72} />
          <Text accessibilityRole="header" style={{ fontSize: SIZE.titleSize - 2, ...TITULO, color: PALETTE.tinta, textAlign: 'center' }}>
            {card.name}
          </Text>
          {card.colonia !== null && <Text style={{ fontSize: SIZE.smallSize, color: PALETTE.tintaApagada, textAlign: 'center' }}>{card.colonia}</Text>}
          <Text style={{ fontSize: SIZE.bodySize, lineHeight: 22, color: PALETTE.tintaApagada, textAlign: 'center' }}>{ES.seguir.callada}</Text>
        </View>
        <Seguir cocinaId={card.id} nombre={card.name} />
        <SeccionTarjeta cocina={cocina} />
      </ScrollView>
    </View>
  );
}
