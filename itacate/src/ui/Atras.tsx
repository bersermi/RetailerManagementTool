import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { Pressable } from 'react-native';

import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';

// ============================================================================
// THE WAY BACK OVER A PICTURE — a round white button at its top left, as the
// proposals page drew a kitchen's page and a dish's (the owner's ruling of
// 2026-11-01). Plan task `10.5-iv-a-ii`. Both pages open on a full-width picture,
// where `@/ui/Banda`'s *Volver* has no room; an iPhone has no back button, and
// Android's goes back the same way. ⚠️ Its parent places it: it sits absolute.
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
