// ============================================================================
// THE SEARCH BOX — the first primitive in `src/ui/`, and the reason it exists
// now rather than later. Plan task `5g-ii`.
//
// ⚠️⚠️ THIS DIRECTORY IS MINTED BY THIS TASK AND THE MOMENT IS NOT ARBITRARY.
// ADR-035 §2.11 lists ~10 primitives and says exactly when they should appear:
// *"the point is that they exist before step 6 rather than being extracted from
// Vender afterwards by someone who did not write it."* §3 requires them before
// step 6; the owner ruled on 2026-09-13 that `src/api/` and `src/ui/` are built
// *"across `5d`–`5h`"*, and `5h.5` writes their CONVENTIONS once real patterns
// exist. **This is the third capture screen, so the pattern is real.**
//
// ⚠️ §2.8's OWN SENTENCE IS WHAT MAKES THIS DUE RATHER THAN TIDY: *"three
// capture screens that feel like distinct modes, sharing one engine
// underneath."* Productos drew this box, Vender drew it again, and Comprar is
// the third — at which point a fourth copy is not a cost, it is a divergence
// waiting to happen.
//
// ⚠️⚠️ AND IT WAS MEASURED RATHER THAN ASSUMED. `productos.tsx`'s and
// `vender.tsx`'s copies were **identical markup, character for character**,
// differing only in their comments. `Vacio`'s three copies had ALREADY
// DIVERGED — two centred their text and Vender's did not — which is the drift
// this extraction is for, found by looking rather than predicted.
//
// ⚠️ `vender.tsx` CARRIED A SENTENCE SAYING THE OPPOSITE — *"a session that
// folds these into `src/ui/` before `5h` closes is taking that row's decision
// for it"* — written at `5f-ii` before `5g`'s sizing ruled on it. **It is
// corrected in that file rather than left to disagree with this one**: two homes
// for one claim is the defect this repository has recorded nine of.
//
// ⚠️ NO SUITE CAN LOAD THIS FILE (`R2`: the suite is `.ts` and reaches no
// component), so the extraction moves MARKUP ONLY. Every decision this box
// obeys already lives in a `.ts` module the suite reads — the sizes are
// `useDensity`'s (`R6`), the colours are the palette's (`R11`), and what a typed
// term MATCHES is `@/api/catalog`'s. ⚠️ THE SENTENCE USED TO BE NAMED HERE AS
// `ES.catalog`'s AND IS NOW THE CALLER'S, since `6b`: it is the `placeholder`
// prop, and a component that spelled one screen's word inside itself was a
// component that could not be drawn over anything else (`R16`).
// ============================================================================

import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { RefObject } from 'react';
import { Keyboard, Pressable, Text, TextInput, View } from 'react-native';

import { ES } from '@/strings';
import { useDensity } from '@/theme/DensityProvider';
import { PALETTE } from '@/theme/palette';

/**
 * The box above a catalog list, on all three capture screens and on Productos.
 *
 * ⚠️ IT DOES NOT SCROLL AWAY. C3.1 puts the box ABOVE a scrolling list, and a
 * shop with a hundred products is exactly the shop that searches — so it is a
 * sibling of the list rather than its header.
 */
export function Buscador({
  value,
  onChange,
  box,
  placeholder,
}: {
  value: string;
  onChange: (text: string) => void;
  box: RefObject<TextInput | null>;
  /**
   * The word inside the box, and what a screen reader announces it as.
   *
   * ⚠️⚠️ A PROP SINCE `6b`, AND IT IS `R16` RATHER THAN A TIDY-UP: this component
   * spelled `ES.catalog.search` inside itself, which was correct while every
   * caller searched the catalog and became a false claim the moment one searched
   * suppliers. The difference between the copies becomes a prop.
   *
   * ⚠️ IT IS REQUIRED AND CARRIES NO DEFAULT. A default of *Buscar producto* on a
   * box drawn over a list of suppliers is exactly the stale-word defect with
   * nothing able to see it — and `R16`'s second half says the difference nobody
   * decided becomes a DECISION, which a default would hide.
   */
  placeholder: string;
}) {
  const { scale } = useDensity();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale.rowGap,
        paddingHorizontal: scale.space,
        paddingVertical: scale.space,
      }}
    >
      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          gap: scale.rowGap,
          minHeight: scale.tapTarget,
          paddingHorizontal: scale.space,
          borderRadius: scale.space / 2,
          borderWidth: 1,
          borderColor: PALETTE.linea,
          backgroundColor: PALETTE.superficie,
        }}
      >
        {/* ⚠️ THE ONE ICON IN THIS APP WITH NO WORD BESIDE IT, AND C12.1 IS NOT
            BENT BY IT: the word is the placeholder inside the same box, on the
            same line, and it is what a person reads first. */}
        <MaterialCommunityIcons name="magnify" size={scale.iconSize} color={PALETTE.tintaApagada} />
        <TextInput
          ref={box}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={PALETTE.tintaApagada}
          // ⚠️ NO AUTOCORRECT AND NO CAPITALS. A till types `pechuga` and a
          // keyboard that "helps" turns a product search into a guessing game;
          // `@/api/catalog` folds case and accents on both sides anyway.
          autoCorrect={false}
          autoCapitalize="none"
          // ⚠️⚠️ *Listo* AND NOT *Buscar* — ruled 2026-09-23. This search is
          // LIVE: it filters rows the phone already holds, on every keystroke,
          // so a *Buscar* key promises an action that has already happened. The
          // one thing a person actually wants from that key here is the keyboard
          // out of the way, and now it says so.
          returnKeyType="done"
          onSubmitEditing={() => Keyboard.dismiss()}
          accessibilityLabel={placeholder}
          style={{
            flex: 1,
            paddingVertical: scale.rowGap,
            fontSize: scale.bodySize,
            color: PALETTE.tinta,
          }}
        />
      </View>

      {value === '' ? null : (
        <Pressable
          accessibilityRole="button"
          onPress={() => onChange('')}
          style={{
            minHeight: scale.tapTarget,
            justifyContent: 'center',
            paddingHorizontal: scale.rowGap,
          }}
        >
          <Text style={{ fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.accion }}>
            {ES.catalog.clear}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
