import { View } from 'react-native';

import type { Kitchen } from '@/vecinos/cocinas';
import { colorOf } from '@/api/pagina';
import { HUES } from '@/theme/colores';
import { PALETTE } from '@/theme/palette';
import { Foto } from '@/vecinos/ui/Foto';
import { Iniciales } from '@/ui/Iniciales';

// ============================================================================
// A KITCHEN'S CIRCLE — her logo, else her initials on her colour.
// ⚠️ ITACATE'S `itacate/src/ui/Circulo.tsx`, COPIED — plan task `10.5-v-c-ii`:
// *Así la ven* and *Ver como la ven* are Itacate's two pages inside Wera Cocina, one
// and the same screen, so this file is Itacate's below its imports, and
// `test/vecinos.test.ts` holds it there code for code. A change is made in Itacate's
// file and copied here in the same PR, or that test is red. Only its imports differ:
// Itacate's parts and words live under `@/vecinos/` and `VECINOS` here.
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
