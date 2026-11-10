import { Pressable, Text, View } from 'react-native';

import { coloresDe, filaTexto, marcaDe, marcaTexto, type Orden } from '@/lib/apartados';
import { ES } from '@/strings';
import { TITULO } from '@/theme/letra';
import { PALETTE, SIZE } from '@/theme/palette';
import { Marca } from '@/ui/TarjetaOrden';

// ============================================================================
// A PAST ORDER, SMALL — *Historial*'s *Anteriores*. Plan task `10.5b-iv-a`, the owner's
// final design of 2026-11-10 (`.f-card.compact`): the number, its mark — *Entregado · 👍*,
// *Canceló*, *No va* — and one line: the day, what it was, the labels of its thumb.
// ⚠️ NEVER THE NEIGHBOUR'S NAME: the name goes once the order is rated, at most 24 hours
// after its window (`reservation_neighbours`). The row opens the order.
// ============================================================================

export function FilaOrden({ orden, ahora, onAbrir }: { orden: Orden; ahora: Date; onAbrir: () => void }) {
  const colores = coloresDe(marcaDe(orden, ahora));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={ES.apartados.abrirAyuda(orden.codigo)}
      onPress={onAbrir}
      style={({ pressed }) => ({
        gap: 3,
        paddingHorizontal: SIZE.space,
        paddingVertical: SIZE.rowGap + 1,
        borderRadius: SIZE.space - 2,
        borderWidth: 1,
        borderColor: PALETTE.linea,
        backgroundColor: pressed ? PALETTE.fondo : PALETTE.superficie,
      })}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: SIZE.rowGap }}>
        <Text style={{ ...TITULO, fontSize: 21, fontVariant: ['tabular-nums'], color: PALETTE.tinta }}>{orden.codigo}</Text>
        <Marca texto={marcaTexto(orden, ahora)} fondo={colores.fondo} tinta={colores.tinta} />
      </View>
      <Text numberOfLines={2} style={{ fontSize: SIZE.smallSize + 0.4, color: PALETTE.tinta }}>
        {filaTexto(orden, ahora)}
      </Text>
    </Pressable>
  );
}
