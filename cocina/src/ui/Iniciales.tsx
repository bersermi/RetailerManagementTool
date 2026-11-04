import { StyleSheet, Text, View } from 'react-native';

import { kitchenInitials, type ColorCode } from '@/api/pagina';
import { HUES } from '@/theme/colores';
import { PALETTE } from '@/theme/palette';

// ============================================================================
// HER INITIALS ON HER COLOUR — the circle a page wears until she gives a logo.
// Plan task `10.5-ii`, proposal B's default (*"her initials"*): *Fonda Doña Mari*
// is `DM`, as the proposals page drew it (`kitchenInitials`).
//
// ⚠️ IT FILLS ITS FRAME — the frame is the circle and clips — and the logo, once
// she has one, is laid over it (`@/ui/Foto`). `size` is the frame's side, so the
// letters keep their proportion in the page's circle and in the form's.
// Hidden from the screen reader: the kitchen's name is beside it.
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
