import { Platform, Text } from 'react-native';

import { ES } from '@/strings';

// ============================================================================
// *GOOGLE MAPS*, WHERE GOOGLE'S MAP MAY NOT SHOW. Plan task `10.5-iv-b-iii`, the owner's
// ruling D6 of 2026-11-19 (*"agree"*): every distance Itacate shows is worked out from
// Google's point for a kitchen's address, and its attribution is owed *"when displaying
// Content from Google Maps Platform APIs"* — none extra where its map, logo and all, is in
// sight. So the words go where the map is not: at the foot of the list (the list at full
// height hides the map) and under the distance on a kitchen's page and a dish's.
//
// ⚠️ AS GOOGLE'S ATTRIBUTION RULES WRITE IT WHERE ITS LOGO DOES NOT FIT — Wera Cocina's
// credit (`cocina/src/ui/Buscador.tsx`'s `CreditoDeGoogle`, read 2026-11-03): Roboto on
// Android, an iPhone's system sans-serif, weight 400, 12 points, Google's grey on a light
// ground, on one line, untranslated. A bare line: each place sets it where it belongs.
//
// ⚠️ COPIED INTO WERA COCINA WITH THE TWO PAGES (`cocina/src/vecinos/ui/CreditoDeGoogle.tsx`,
// held to this file by `cocina/test/vecinos.test.ts`); there the pages draw no distance, so
// it never shows.
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
