// ============================================================================
// *Listo*, ABOVE THE NUMBER PAD — the only keyboard in this app with no return
// key. Plan task `5g-ii`, and see `src/ui/Buscador.tsx` for why this directory
// exists now.
//
// ⚠️⚠️ THERE WERE ALREADY TWO COPIES OF THIS AND COMPRAR WOULD HAVE BEEN THE
// THIRD, WHICH IS THE MEASUREMENT RATHER THAN A PREDICTION. `nuevo.tsx` and
// `producto/[id].tsx` drew it identically apart from the `nativeID` and the
// string key — and both of those keys held the same word. **So the delta is two
// props**, which is a primitive rather than a coincidence.
//
// ⚠️ WHY IT IS NEEDED AT ALL: `keyboardType="decimal-pad"` draws NO return key
// on either platform, and it is not optional — C12.2 puts the point in `35.50`
// and a pad without one is a shopkeeper who cannot type half a peso. ⚠️ Comprar
// is the first screen with TWO decimal pads on one row (a quantity and a cost),
// so this stopped being a form's detail and became the keypad's own furniture.
//
// ⚠️⚠️ iOS ONLY, AND THE `Platform` CHECK IS THE HONEST HALF OF THE RULE RATHER
// THAN A GAP IN IT. `InputAccessoryView` does not exist on Android in React
// Native; Android's own keyboard draws a dismiss control the platform owns, so a
// shopkeeper has a way off the pad on both of C1.1's kinds of phone — by two
// different routes, which is what `nuevo.tsx` recorded when it first hit this.
//
// ⚠️ THE WORD IS A PROP AND NOT THIS FILE'S, which is `R4` obeyed rather than
// bent: each screen keeps its own key in `src/strings.ts` and hands the sentence
// in. Collapsing three keys holding one word is a strings decision and `5h.5`
// owns the conventions that would settle it.
// ============================================================================

import { InputAccessoryView, Keyboard, Platform, Pressable, Text, View } from 'react-native';

import { useDensity } from '@/theme/DensityProvider';
import { PALETTE } from '@/theme/palette';

/**
 * ⚠️ MOUNT IT ONCE, OUTSIDE ANY SCROLLING OR CONDITIONAL BRANCH.
 * `InputAccessoryView` renders into the KEYBOARD rather than into the layout, so
 * where it sits in the tree does not matter — but mounting it inside a branch
 * means the bar disappearing exactly while a read is out, which `nuevo.tsx`
 * recorded as the one moment the box behind it cannot be reached anyway.
 */
export function TecladoListo({ padId, label }: { padId: string; label: string }) {
  const { scale } = useDensity();
  if (Platform.OS !== 'ios') return null;
  return (
    <InputAccessoryView nativeID={padId}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'flex-end',
          paddingHorizontal: scale.space,
          borderTopWidth: 1,
          borderTopColor: PALETTE.linea,
          backgroundColor: PALETTE.banda,
        }}
      >
        <Pressable
          accessibilityRole="button"
          onPress={() => Keyboard.dismiss()}
          style={{
            minHeight: scale.tapTarget,
            paddingHorizontal: scale.space,
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: scale.bodySize, fontWeight: '700', color: PALETTE.accion }}>
            {label}
          </Text>
        </Pressable>
      </View>
    </InputAccessoryView>
  );
}
