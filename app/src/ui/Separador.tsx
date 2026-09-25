// ============================================================================
// ONE LINE BETWEEN TWO ROWS, AND NEVER UNDER THE LAST ONE. Plan task `5g-ii`,
// and see `src/ui/Buscador.tsx` for why this directory exists now.
//
// ⚠️ A BORDER AND NOT A ONE-PIXEL BOX, WHICH IS `R6` AND NOT TASTE. A `height`
// is a size a person looks at, so `height: 1` would be the one measurement on
// these screens that *Letra grande* could not change. `productos.tsx` recorded
// that refusal and `conventions-gate.sh` caught `vender.tsx` making the mistake
// a second time — which is the argument for there being one of these rather
// than one per screen.
//
// ⚠️ `borderWidth` IS DELIBERATELY ABSENT FROM `R6`'s SIZE LIST: it is a hairline
// the platform owns, not a size elder mode scales.
// ============================================================================

import { View } from 'react-native';

import { PALETTE } from '@/theme/palette';

export function Separador() {
  return <View style={{ borderBottomWidth: 1, borderBottomColor: PALETTE.linea }} />;
}
