// ============================================================================
// ONE SENTENCE IN A BOX, CENTRED — the words a confirmation is made of. Plan
// task `5h.5`, and see `src/ui/Buscador.tsx` for why this directory exists.
//
// ⚠️⚠️ IT IS HERE BECAUSE TWO FILES ALREADY DREW IT IDENTICALLY, WHICH IS THE
// MEASUREMENT AND NOT A PREDICTION. `documentos.tsx`'s local `Frase` (`5h-ii-b`)
// and `vender.tsx`'s *¿Vaciar el carrito?* line agreed on all four of their
// properties — `scale.bodySize`, weight `600`, `PALETTE.tinta`, centred — and
// neither knew about the other. ⚠️ **That is `Vacio`'s drift caught one step
// earlier**: its three copies had already diverged before anybody looked, and
// these two had not yet.
//
// ⚠️ WHY IT IS NOT `Vacio`, WHICH IS THE NEAR MISS WORTH WRITING DOWN. `Vacio`
// is a sentence on an EMPTY SCREEN — it pads itself, it dims its text
// (`tintaApagada`) and it is what a person reads when something has gone quiet.
// This is a sentence being SAID TO HER, at full contrast, inside a box she must
// answer. **Same markup, opposite job**, and folding them would give one
// component two reasons to change.
//
// ⚠️ IT DECIDES NOTHING AND HOLDS NO WORDS: the sentence arrives finished, which
// is `R4` and `R12` — `correctionAsk` and `ES.documents` choose it in
// `documentos.tsx`, `ES.counter.cart` in `vender.tsx`, and
// `app/test/api-documents.test.ts` reads the first of those. ⚠️ **How it looks is
// the half no instrument here can see** (`R9`, §2.11).
// ============================================================================

import { Text } from 'react-native';

import { useDensity } from '@/theme/DensityProvider';
import { PALETTE } from '@/theme/palette';

/**
 * One centred sentence.
 *
 * ⚠️ WEIGHT `600` AND NOT `700`, WHICH IS THE ONE THING THE TWO COPIES AGREED
 * ON THAT COULD HAVE GONE EITHER WAY: the button under it is `700`, so a
 * question set at the same weight as its own answers reads as another button.
 */
export function Frase({ text }: { text: string }) {
  const { scale } = useDensity();
  return (
    <Text
      style={{
        fontSize: scale.bodySize,
        fontWeight: '600',
        color: PALETTE.tinta,
        textAlign: 'center',
      }}
    >
      {text}
    </Text>
  );
}
