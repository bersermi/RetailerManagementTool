import { Children, Fragment, type ReactNode } from 'react';
import { View } from 'react-native';

import { PALETTE, SIZE } from '@/theme/palette';

// ============================================================================
// ROWS THAT BELONG TOGETHER, IN ONE CARD WITH A LINE BETWEEN EACH. Plan task
// `10.5-v-c-i`: Itacate's part (`itacate/src/ui/Grupo.tsx`, `10.5-v-b`), copied for
// *Mi cocina*'s rows (`@/ui/Fila`), as the family-shell page draws them (`.grp`). A
// row left out (`null`, `false`) leaves no line behind.
// ============================================================================

/** Where a divider starts: under the words, past a row's icon (`@/ui/Fila`). */
const BAJO_LAS_PALABRAS = SIZE.space + 24 + SIZE.space;

export function Grupo({
  children,
  sinIconos = false,
}: {
  children: ReactNode;
  /** Rows with no icon: the divider starts at the edge's padding. */
  sinIconos?: boolean;
}) {
  const filas = Children.toArray(children);
  return (
    <View
      style={{
        backgroundColor: PALETTE.superficie,
        borderWidth: 1,
        borderColor: PALETTE.linea,
        borderRadius: 16,
        overflow: 'hidden',
      }}
    >
      {filas.map((fila, i) => (
        <Fragment key={i}>
          {i > 0 && <View style={{ height: 1, backgroundColor: PALETTE.linea, marginLeft: sinIconos ? SIZE.space : BAJO_LAS_PALABRAS }} />}
          {fila}
        </Fragment>
      ))}
    </View>
  );
}
