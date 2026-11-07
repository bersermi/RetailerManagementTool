import { Text, View } from 'react-native';

import type { Dish } from '@/vecinos/cocinas';
import type { ColorCode } from '@/api/pagina';
import { precioTexto, quedanTexto } from '@/vecinos/lista';
import { VECINOS as ES } from '@/strings';
import { HUES } from '@/theme/colores';
import { PALETTE, SIZE } from '@/theme/palette';

// ============================================================================
// A DISH'S PRICE AND ITS TWO SMALL BADGES — *Quedan 2*, *Sorpresa*.
// ⚠️ ITACATE'S `itacate/src/ui/Precio.tsx`, COPIED — plan task `10.5-v-c-ii`:
// *Así la ven* and *Ver como la ven* are Itacate's two pages inside Wera Cocina, one
// and the same screen, so this file is Itacate's below its imports, and
// `test/vecinos.test.ts` holds it there code for code. A change is made in Itacate's
// file and copied here in the same PR, or that test is red. Only its imports differ:
// Itacate's parts and words live under `@/vecinos/` and `VECINOS` here.
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
