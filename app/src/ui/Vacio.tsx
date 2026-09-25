// ============================================================================
// AN EMPTY LIST, WITH THE SENTENCE THAT SAYS WHY — §2.11's `Empty`. Plan task
// `5g-ii`, and see `src/ui/Buscador.tsx` for why this directory exists now.
//
// ⚠️⚠️ THIS ONE IS HERE BECAUSE ITS COPIES HAD ALREADY DRIFTED, WHICH IS THE
// MEASUREMENT AND NOT A PREDICTION. Three files drew it — `productos.tsx`,
// `vender.tsx` and `familia/[id].tsx` — and two of them centred the text while
// **Vender's did not**. Nobody decided that; nothing could see it; and it is a
// state a person only reaches when something has gone quiet, which is exactly
// the kind of state `R11`'s argument says a retrofit misses.
// ⚠️ THE CENTRED ONE WINS because it is two files against one and because a lone
// sentence on an otherwise empty screen reads as a label when it is left-aligned.
//
// ⚠️⚠️ IT TAKES A FINISHED SENTENCE AND NEVER A FAILURE KEY, AND `R12` IS WHY:
// a route may not import `@/api/errors`, the module that decides what a failure
// MEANS — the gate caught exactly that import in `productos.tsx` on 2026-09-22.
// `catalogLine` (`@/api/catalog`) is what CHOOSES between *still loading*, *no
// products* and *nothing matched*, so this component holds neither the choice
// (`R3`) nor the words (`R4`) and `app/test/api-catalog.test.ts` reads both.
// ============================================================================

import { Text, View } from 'react-native';

import { useDensity } from '@/theme/DensityProvider';
import { PALETTE } from '@/theme/palette';

export function Vacio({ line }: { line: string }) {
  const { scale } = useDensity();
  return (
    <View style={{ padding: scale.space * 2, alignItems: 'center' }}>
      <Text style={{ fontSize: scale.bodySize, color: PALETTE.tintaApagada, textAlign: 'center' }}>
        {line}
      </Text>
    </View>
  );
}
