// ============================================================================
// THE OUTLINED BUTTON — one tone, a border of it, a word in it. Plan task
// `5h.5`, and see `src/ui/Buscador.tsx` for why this directory exists at all.
//
// ⚠️⚠️ IT IS THE FIRST PRIMITIVE IN HERE THAT COLLAPSES A NEAR-DUPLICATE RATHER
// THAN A COPY, WHICH IS WHY `5h.5` NAMED IT. `5h-ii-b` put `Boton` and `Control`
// into `documentos.tsx` — two local components, one screen — and `Control`'s own
// doc comment said *"whether they should become one primitive in `src/ui/` is
// `5h.5`'s"*. They differed in exactly two things, and one of them was a drift
// nobody decided.
//
// ⚠️⚠️ THREE DRAWINGS ACROSS TWO FILES, MEASURED RATHER THAN ASSUMED, AND THE
// THIRD IS THE ONE THAT MAKES THIS A PRIMITIVE UNDER `R14`:
//
//   * `documentos.tsx`'s `Boton`   — `Corregir` / `Eliminar`, sharing a row
//   * `documentos.tsx`'s `Control` — the answers inside the confirmation box
//   * `vender.tsx`'s `Vaciar carrito` confirm — **byte-identical in style to
//     `Control`**, which `Boton`'s own comment had already half-noticed:
//     *"which is `Vaciar carrito`'s own arrangement one screen over."*
//
// **Two components in one route would NOT have been enough** — `R14` is *reached
// from two or more files under `src/app/`*, and a same-file extraction would have
// broken the rule on the day it was written. The third drawing is what turned a
// tidy-up into an extraction, and it was found by grepping for the shape rather
// than by reading the row.
//
// ----------------------------------------------------------------------------
// ⚠️⚠️ THE BORDER RADIUS WAS THE DRIFT, AND IT IS DECIDED HERE RATHER THAN
// CARRIED ON BOTH SIDES — `R16`
// ----------------------------------------------------------------------------
// `Boton` rounded by `scale.rowGap` (8 / 12) and the other two by
// `scale.space / 2` (6 / 8). Nobody decided that; nothing could see it; it is
// `Vacio`'s centring one task later, and the same argument settles it —
// **majority, counted**: `scale.space / 2` is **42 of the 61 `borderRadius`
// spellings under `src/app/` and `src/ui/`** and appears in **12 of the 13 route
// files**, while `scale.rowGap` appears three times and all three are in
// `documentos.tsx`, the newest file in the app.
//
// ⚠️ **So `documentos.tsx`'s two row buttons get 2 px less corner than they had**
// — the one thing on this row a person can see, and it is named in `5h.5`'s
// status-log entry rather than left to be noticed. Reversing it is this one line.
//
// ⚠️ THE LAYOUT DIFFERENCE IS A PROP AND NOT A SECOND COMPONENT (`R16` again):
// `inRow` is `flex: 1`, which is what two of these sharing a `flexDirection:
// 'row'` need and what one alone in a column must not have — in a column `flex:
// 1` stretches it to the whole height of the box.
//
// ⚠️ IT DECIDES NOTHING. The word is a prop (`R4` — `src/strings.ts` keeps it,
// and this file imports neither), the tone is a prop out of `PALETTE` (`R11`),
// the sizes are `useDensity`'s (`R6`), and whether the button should be there at
// all is the screen's. ⚠️ **What no instrument in this repository can see is how
// it looks** (`R9`, §2.11): the suite is `.ts` and reaches no component, so the
// only reading of this file is the owner's phone.
// ============================================================================

import { Pressable, Text } from 'react-native';

import { useDensity } from '@/theme/DensityProvider';

/**
 * One outlined button.
 *
 * ⚠️ `tone` COLOURS THE BORDER AND THE WORD AND NOTHING ELSE, which is the
 * arrangement all three drawings already had: `PALETTE.error` on a destructive
 * answer is the only thing that distinguishes it at a glance, and it is the
 * distinction `Vaciar carrito` uses one screen over.
 *
 * ⚠️ `accessibilityLabel` IS THE VISIBLE WORD rather than a second sentence —
 * a label that disagrees with the text is a screen reader saying something the
 * shopkeeper cannot see, which is worse than no label.
 */
export function Boton({
  label,
  tone,
  onPress,
  inRow = false,
}: {
  label: string;
  tone: string;
  onPress: () => void;
  inRow?: boolean;
}) {
  const { scale } = useDensity();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={{
        flex: inRow ? 1 : undefined,
        minHeight: scale.tapTarget,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: scale.space / 2,
        borderWidth: 1,
        borderColor: tone,
      }}
    >
      <Text style={{ fontSize: scale.bodySize, fontWeight: '700', color: tone }}>{label}</Text>
    </Pressable>
  );
}
