import { StyleSheet, Text, View } from 'react-native';

import { kitchenInitials, type ColorCode } from '@/api/pagina';
import { HUES } from '@/theme/colores';
import { PALETTE } from '@/theme/palette';

// ============================================================================
// HER INITIALS ON HER COLOUR — the circle a kitchen wears until she gives a logo.
// Plan task `10.5-iv-a-i`, proposal B's default: *Fonda Doña Mari* is `DM`
// (`kitchenInitials`, held to Wera Cocina's by `test/gemelos.test.ts`).
//
// ⚠️ WERA COCINA'S `Iniciales`, COPIED (`cocina/src/ui/Iniciales.tsx`, plan `10.5-ii`):
// it fills its frame — the circle, which clips — and the logo, once she has one, is
// laid over it (`@/ui/Foto`). Hidden from the screen reader: her name is beside it.
// ============================================================================
export function Iniciales({ nombre, color, size }: { nombre: string; color: ColorCode; size: number }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[StyleSheet.absoluteFill, { backgroundColor: HUES[color], alignItems: 'center', justifyContent: 'center' }]}
    >
      <Text style={{ fontSize: Math.round(size * 0.38), fontWeight: '800', color: PALETTE.superficie }}>{kitchenInitials(nombre)}</Text>
    </View>
  );
}
