import { Text, View } from 'react-native';

import { ES } from '@/strings';
import { useDensity } from '@/theme/DensityProvider';

// ============================================================================
// ⚠️ SCAFFOLDING. AN EMPTY ROOM WITH THE RIGHT NAME ON THE DOOR.
//
// `5a-ii` ships the SHELL — the tab bar, the density scale, the money formatter
// — and a tab bar needs a route behind every tab. Three of the four are not
// built yet: Vender is `5h`, Comprar is `5g`, Desperdicio is later still. This
// is what stands there until they are, and each of those tasks deletes its own
// route's use of it.
//
// ⚠️ IT IS NOT IN `src/app/`, AND THAT IS NOT A STYLE PREFERENCE. Expo Router
// makes EVERY file under the routes directory a route, so a shared component
// dropped in beside the screens becomes a navigable URL nobody meant to ship.
//
// ⚠️ AND IT IS NOT THE FIRST `src/ui/` PRIMITIVE. §2.11's ten primitives and
// the conventions page that describes them are scheduled after there is a
// pattern to describe (see the ADR conflict recorded in docs/PLAN.md). A
// placeholder that deletes itself is not a pattern.
// ============================================================================

export function Pendiente({ what }: { what: string }) {
  const { scale } = useDensity();
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: scale.rowGap,
        padding: scale.space * 2,
      }}
    >
      <Text style={{ fontSize: scale.titleSize, fontWeight: '600' }}>{what}</Text>
      <Text style={{ fontSize: scale.bodySize, textAlign: 'center' }}>
        {ES.placeholder.pending}
      </Text>
    </View>
  );
}
