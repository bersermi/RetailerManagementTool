// ============================================================================
// LA VITRINA — the counter's grid of tiles. Plan tasks `14.2` (drawn on Vender)
// and `14.3` (moved here as Comprar draws it a second time, `R14`). Three across
// at *Normal*, two at *Letra grande* (calls 2 and 11, `columnasDe`), in whatever
// order the screen hands it — the day's order on Vender, this provider's first
// on Comprar. Which tile each product is, is the screen's (`baldosa`).
//
// ⚠️ A `FlatList` FOR `productos.tsx`'s REASON: a giro's catalog runs to
// hundreds, C1.1 puts two low-end Androids among the pilot's phones, and a
// `ScrollView` mounts every tile at once.
// ============================================================================

import type { ReactElement, RefObject } from 'react';
import { FlatList, View } from 'react-native';

import type { CatalogEntry } from '@/api/catalog';
import { useDensity } from '@/theme/DensityProvider';
import { Vacio } from '@/ui/Vacio';

export function Vitrina({
  productos,
  columnas,
  grid,
  vacio,
  baldosa,
}: {
  productos: readonly CatalogEntry[];
  /** `columnasDe`'s answer. */
  columnas: number;
  /** So the screen can bring the grid back to the top after a sale. */
  grid: RefObject<FlatList<CatalogEntry | null> | null>;
  /** What an empty grid says — `catalogLine`'s answer. */
  vacio: string;
  baldosa: (entry: CatalogEntry) => ReactElement;
}) {
  const { scale } = useDensity();
  // ⚠️ AN ODD LAST ROW WOULD STRETCH ITS TILES ACROSS IT, so the grid is padded
  // with empty cells — Productos' mosaic's arrangement.
  const resto = productos.length % columnas;
  const cells: readonly (CatalogEntry | null)[] =
    resto === 0 ? productos : [...productos, ...Array<null>(columnas - resto).fill(null)];
  return (
    <FlatList
      ref={grid}
      // ⚠️ `numColumns` CANNOT CHANGE ON A MOUNTED LIST, and *Letra grande*
      // changes it (three across to two): a new key is a new list.
      key={columnas}
      numColumns={columnas}
      data={cells}
      keyExtractor={(entry, index) => (entry === null ? `hueco-${index}` : entry.id)}
      renderItem={({ item }) => (item === null ? <View style={{ flex: 1 }} /> : baldosa(item))}
      columnWrapperStyle={{ gap: scale.rowGap }}
      ItemSeparatorComponent={Hueco}
      ListEmptyComponent={<Vacio line={vacio} />}
      contentContainerStyle={{ paddingHorizontal: scale.space, paddingBottom: scale.space }}
      initialNumToRender={columnas * 5}
      // ⚠️ `on-drag` SINCE `14.2`: the one field on a counter is its search box,
      // and a scroll means she is looking at the tiles, not typing.
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
    />
  );
}

/** The gap between two rows of tiles. */
function Hueco() {
  const { scale } = useDensity();
  return <View style={{ height: scale.rowGap }} />;
}
