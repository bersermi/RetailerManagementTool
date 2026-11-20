import { Platform, Text } from 'react-native';

import { VECINOS as ES } from '@/strings';

// ============================================================================
// *GOOGLE MAPS* UNDER A DISTANCE.
// ⚠️ ITACATE'S `itacate/src/ui/CreditoDeGoogle.tsx`, COPIED — plan task `10.5-iv-b-iii`:
// Itacate's two pages draw it under the distance (the owner's ruling D6 of 2026-11-19), and
// *Así la ven* and *Ver como la ven* are those pages, so this file is Itacate's below its
// imports and `test/vecinos.test.ts` holds it there code for code. Here the pages are handed
// no distance, so it never shows. Wera Cocina's own credit, at the foot of her search's list,
// is `@/ui/Buscador`'s `CreditoDeGoogle`.
// ============================================================================

/** Google's grey, which its attribution rules allow on a light ground. */
const GRIS_DE_GOOGLE = '#5E5E5E';

export function CreditoDeGoogle() {
  return (
    <Text
      numberOfLines={1}
      style={{
        fontFamily: Platform.OS === 'android' ? 'Roboto' : undefined,
        fontWeight: '400',
        fontSize: 12,
        color: GRIS_DE_GOOGLE,
      }}
    >
      {ES.cerca.creditoGoogle}
    </Text>
  );
}
