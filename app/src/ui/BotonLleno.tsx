// ============================================================================
// THE FILLED BUTTON — `accionSuave` ground, an `accion` border, a word in
// weight 600. Plan task `8f`, and `R14`: `docs/CONVENTIONS.md` had it counted
// as the shape most overdue for this directory.
//
// ⚠️⚠️ THIRTEEN DRAWINGS ACROSS ELEVEN FILES WHEN `8f` COLLAPSED THEM, not the
// nine `5h.5` counted — `6a` and `6b` added three and `costos/[id]` had two
// nobody listed. They had drifted four ways, and each one was settled by count
// on the owner's ruling of 2026-09-30, *"majority wins"* (`R16`):
//
//   * THE BORDER — ten had `borderWidth: 1`; Vender's, Comprar's and
//     Desperdicio's `Cancelar` had none. They have one now.
//   * THE WORD'S ALIGNMENT — `familia/[id]` and `costos/[id]` left-aligned it;
//     the other eleven centred it. Centred.
//   * THE BUSY LOOK — seven faded to 0.6 behind a spinner; `costos/[id]`'s
//     *Compartir* greyed its ground, border and word instead. Spinner and 0.6.
//   * THE WIDTH — two of `costos/[id]`'s hug their word. That one is DECIDED
//     (a toggle beside a matrix, not a form's last act), so it is `hug`.
//
// ⚠️ `icon` IS OPTIONAL BECAUSE SIX COPIES HAD ONE AND SEVEN DID NOT, and which
// is a decided difference per screen. When busy the spinner takes the icon's
// place, or stands before the word when there is none.
//
// ⚠️ WHAT NO CHECK CAN SEE (`R9`): the border arriving on the three `Cancelar`
// answers. The instrument is the owner's phone — empty a basket on Vender.
// ============================================================================

import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';
import { ActivityIndicator, Pressable, Text } from 'react-native';

import { useDensity } from '@/theme/DensityProvider';
import { PALETTE } from '@/theme/palette';

export function BotonLleno({
  label,
  onPress,
  icon,
  busy = false,
  hug = false,
}: {
  label: string;
  onPress: () => void;
  icon?: ComponentProps<typeof MaterialCommunityIcons>['name'];
  busy?: boolean;
  hug?: boolean;
}) {
  const { scale } = useDensity();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: busy }}
      disabled={busy}
      onPress={onPress}
      style={{
        minHeight: scale.tapTarget,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: scale.rowGap,
        paddingHorizontal: scale.space,
        borderRadius: scale.space / 2,
        borderWidth: 1,
        borderColor: PALETTE.accion,
        backgroundColor: PALETTE.accionSuave,
        alignSelf: hug ? 'flex-start' : undefined,
        opacity: busy ? 0.6 : 1,
      }}
    >
      {busy ? (
        <ActivityIndicator color={PALETTE.accion} />
      ) : icon ? (
        // C12.1 — the icon NEVER appears without its word.
        <MaterialCommunityIcons name={icon} size={scale.iconSize} color={PALETTE.accion} />
      ) : null}
      <Text style={{ fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.accion }}>
        {label}
      </Text>
    </Pressable>
  );
}
