import { Text, View } from 'react-native';

import type { Dish } from '@/api/cocinas';
import type { ColorCode } from '@/api/pagina';
import { precioTexto, quedanTexto } from '@/lib/lista';
import { ES } from '@/strings';
import { HUES } from '@/theme/colores';
import { PALETTE, SIZE } from '@/theme/palette';

// ============================================================================
// A DISH'S PRICE AND ITS TWO SMALL BADGES — what the list's card, a kitchen's page and
// a dish's page draw alike. Plan task `10.5-iv-a-ii`, taken out of `10.5-iv-a-i`'s card
// (`@/ui/TarjetaPlatillo`) unchanged, so the three show one dish the same way: the
// price, the *vale* struck through and the saving on her colour — the two patterns
// every surplus app of the proposals page shares — *Quedan 2* or *Último*, and
// *Sorpresa* for a bag. ⚠️ Every word and number is `@/lib/lista`'s, pure and pinned.
// ============================================================================

/** The price, the *vale* struck through, the saving on her colour. `grande` is the dish's own page. */
export function Precio({ platillo, color, grande = false }: { platillo: Dish; color: ColorCode; grande?: boolean }) {
  const precio = precioTexto(platillo);
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: SIZE.rowGap }}>
      <Text style={{ fontSize: grande ? SIZE.titleSize : SIZE.bodySize + 1, fontWeight: '800', color: PALETTE.tinta }}>
        {precio.precio}
      </Text>
      {precio.vale !== null && (
        <Text
          style={{
            fontSize: grande ? SIZE.bodySize : SIZE.smallSize,
            color: PALETTE.tintaApagada,
            textDecorationLine: 'line-through',
          }}
        >
          {precio.vale}
        </Text>
      )}
      {precio.ahorro !== null && (
        <Text
          style={{
            fontSize: grande ? SIZE.smallSize : SIZE.smallSize - 2,
            fontWeight: '800',
            color: PALETTE.superficie,
            backgroundColor: HUES[color],
            paddingHorizontal: 5,
            paddingVertical: 2,
            borderRadius: 5,
            overflow: 'hidden',
          }}
        >
          {precio.ahorro}
        </Text>
      )}
    </View>
  );
}

/** *Quedan 2*, *Último* — nothing for a fraction (`quedanTexto`). In a column, put it in a row, or it stretches. */
export function Quedan({ platillo }: { platillo: Dish }) {
  const quedan = quedanTexto(platillo);
  if (quedan === null) return null;
  return (
    <Text
      style={{
        fontSize: SIZE.smallSize - 1,
        fontWeight: '600',
        color: PALETTE.tinta,
        backgroundColor: PALETTE.banda,
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 6,
        overflow: 'hidden',
      }}
    >
      {quedan}
    </Text>
  );
}

/** *Sorpresa*, beside a bag's name. */
export function Sorpresa() {
  return (
    <Text
      style={{
        fontSize: SIZE.smallSize - 2,
        fontWeight: '700',
        color: PALETTE.marca,
        backgroundColor: PALETTE.banda,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        overflow: 'hidden',
      }}
    >
      {ES.cerca.sorpresa}
    </Text>
  );
}
