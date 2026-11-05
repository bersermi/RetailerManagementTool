import { View } from 'react-native';

import type { Kitchen } from '@/api/cocinas';
import { colorOf } from '@/api/pagina';
import { HUES } from '@/theme/colores';
import { PALETTE } from '@/theme/palette';
import { Foto } from '@/ui/Foto';
import { Iniciales } from '@/ui/Iniciales';

// ============================================================================
// A KITCHEN'S CIRCLE — her logo, else her initials on her colour. Plan task
// `10.5-iv-a-i`, proposal B: the round mark beside her name on every card, as the
// proposals page drew it (*DM* on Chile for Fonda Doña Mari). Wera Cocina draws the
// same circle on her page's head (`cocina/src/ui/Portada.tsx`), from the same
// defaults (`@/api/pagina`, held to Wera Cocina's).
// ============================================================================
export function Circulo({ cocina, size }: { cocina: Kitchen; size: number }) {
  const color = colorOf(cocina.page, cocina.giro);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 1.5,
        borderColor: PALETTE.superficie,
        overflow: 'hidden',
        backgroundColor: HUES[color],
      }}
    >
      <Iniciales nombre={cocina.name} color={color} size={size} />
      <Foto path={cocina.page.logo} cocinaId={cocina.id} />
    </View>
  );
}
