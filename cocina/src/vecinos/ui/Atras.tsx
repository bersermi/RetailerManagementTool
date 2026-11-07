import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { Pressable } from 'react-native';

import { VECINOS as ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';

// ============================================================================
// THE WAY BACK OVER A PICTURE.
// ⚠️ ITACATE'S `itacate/src/ui/Atras.tsx`, COPIED — plan task `10.5-v-c-ii`:
// *Así la ven* and *Ver como la ven* are Itacate's two pages inside Wera Cocina, one
// and the same screen, so this file is Itacate's below its imports, and
// `test/vecinos.test.ts` holds it there code for code. A change is made in Itacate's
// file and copied here in the same PR, or that test is red. Only its imports differ:
// Itacate's parts and words live under `@/vecinos/` and `VECINOS` here.
// ============================================================================

const LADO = 44;

/** Back to where she came from — the list when the page was opened any other way. */
function volver() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

export function Atras() {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={ES.pagina.volver}
      onPress={volver}
      hitSlop={SIZE.rowGap}
      style={({ pressed }) => ({
        position: 'absolute',
        top: SIZE.space,
        left: SIZE.space,
        width: LADO,
        height: LADO,
        borderRadius: LADO / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.92)',
        opacity: pressed ? 0.7 : 1,
        elevation: 2,
        shadowColor: '#000000',
        shadowOpacity: 0.18,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 1 },
      })}
    >
      <MaterialCommunityIcons name="chevron-left" size={SIZE.iconSize + 6} color={PALETTE.tinta} />
    </Pressable>
  );
}
