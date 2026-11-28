// ============================================================================
// THE DRAWINGS OF WERA'S SCREENS WITH NOTHING YET, AS THE APP LOADS THEM —
// `11.10-ii`, row `11.4`'s *vacíos* (his call 13, ruled as drawn on 2026-11-26):
// *Lo último*'s receipt, *Números*' chart, *Proveedores*' hand truck and
// *Solicitudes*' door, each above its sentence in the screen's colour
// (`@/ui/Vacio`'s `DibujoVacio`).
//
// ⚠️ `brand/dibujos/png/`'S FILES BYTE FOR BYTE, black on nothing at 1×, 2× and 3×,
// drawn there by `brand/render-dibujos.sh` — never by hand — and TINTED BY THE
// SCREEN (`tintColor`); `test/dibujos.test.ts` holds each copy to its source. A
// new drawing is drawn there, rendered, and copied here in the same PR.
// ⚠️ `require` AND NOT `import`, as `@/marca/dibujos` explains.
// ============================================================================
import type { ImageSourcePropType } from 'react-native';

export const VACIOS = {
  recibo: require('@/marca/vacios/recibo.png') as ImageSourcePropType,
  barras: require('@/marca/vacios/barras.png') as ImageSourcePropType,
  diablito: require('@/marca/vacios/diablito.png') as ImageSourcePropType,
  puerta: require('@/marca/vacios/puerta.png') as ImageSourcePropType,
} as const;
export type DibujoDeVacio = keyof typeof VACIOS;
