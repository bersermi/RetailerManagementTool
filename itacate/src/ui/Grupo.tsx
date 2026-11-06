import { Children, Fragment, type ReactNode } from 'react';
import { View } from 'react-native';

import { PALETTE, SIZE } from '@/theme/palette';

// ============================================================================
// ROWS THAT BELONG TOGETHER, IN ONE CARD WITH A LINE BETWEEN EACH. Plan task
// `10.5-v-b`: *Tú*'s rows (`@/ui/Fila`), as the family-shell page draws them (`.grp`).
// A row left out (`null`, `false`) leaves no line behind.
// ============================================================================

export function Grupo({ children }: { children: ReactNode }) {
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
          {i > 0 && <View style={{ height: 1, backgroundColor: PALETTE.linea, marginLeft: SIZE.space + 24 + SIZE.space }} />}
          {fila}
        </Fragment>
      ))}
    </View>
  );
}
