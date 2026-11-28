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
//
// ⚠️ `11.10-ii` — A DRAWING ABOVE THE SENTENCE WHEN THE SCREEN HAS NOTHING YET (row
// `11.4`'s *vacíos*, his call 13, ruled as drawn on 2026-11-26; the family shell's
// *one sentence, one drawing and the button that fills it*): `@/ui/DibujoVacio`, at the
// density's `dibujoSize` (96, 120 at `Letra grande`), in the screen's own colour —
// `accion`, and on *Lo último* its counter's. ⚠️ THE CALLER PASSES `dibujo` ONLY
// FOR *NOTHING YET*, never while it loads, without signal, on a failure or when a
// search matched nothing — the same `@/api` function that chose the line says so
// (`providerNothingYet` beside `providerLine`). Hidden from the screen reader: the
// sentence says it.
// ============================================================================

import { Text, View } from 'react-native';

import type { DibujoDeVacio } from '@/marca/vacios';
import { useDensity } from '@/theme/DensityProvider';
import { PALETTE } from '@/theme/palette';
import { DibujoVacio } from '@/ui/DibujoVacio';

export function Vacio({ line, dibujo }: { line: string; dibujo?: DibujoDeVacio }) {
  const { scale } = useDensity();
  return (
    <View style={{ padding: scale.space * 2, alignItems: 'center', gap: scale.space }}>
      {dibujo === undefined ? null : <DibujoVacio dibujo={dibujo} color={PALETTE.accion} />}
      <Text style={{ fontSize: scale.bodySize, color: PALETTE.tintaApagada, textAlign: 'center' }}>
        {line}
      </Text>
    </View>
  );
}
