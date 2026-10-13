// ============================================================================
// A BOX A PERSON TICKS, AND THE WORDS BESIDE IT. Plan task `5R-d-iii`, and
// `R14`: `SelectorCatalogo` drew it first (one row per starter product, `9d`)
// and `Entrar` is the second file to need it, for *"Acepto el Aviso de
// privacidad"* on the sign-up half.
//
// ⚠️ EXTRACTED BYTE-FOR-BYTE FROM `SelectorCatalogo`, SO THERE WAS NO DRIFT TO
// SETTLE (`R16`). The two differences are DECIDED and are props: what the words
// are (`children`, because the aviso's words carry a link inside them and a
// product's do not), and `disabled`, which `Entrar`'s every control obeys while
// a sign-up is out. Nothing on the starter catalog's screen changed.
//
// ⚠️ TICKED IS SAID BY THE GLYPH'S SHAPE **AND** BY `accessibilityState`, never
// by colour alone (`R11`). The colour agrees with the shape: `accion` for a box
// that will act, `tintaApagada` for one that will not.
//
// ⚠️ `label` IS WHAT A SCREEN READER SAYS, AND IT IS REQUIRED. The whole row is
// one control, so its children's text is not announced on its own; a row with
// a link inside it would otherwise be read as two fragments.
// ============================================================================

import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ReactNode } from 'react';
import { Pressable } from 'react-native';

import { useDensity } from '@/theme/DensityProvider';
import { PALETTE } from '@/theme/palette';

export function Casilla({
  ticked,
  onToggle,
  label,
  disabled = false,
  children,
}: {
  ticked: boolean;
  onToggle: () => void;
  label: string;
  disabled?: boolean;
  children: ReactNode;
}) {
  const { scale } = useDensity();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: ticked, disabled }}
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onToggle}
      style={{
        minHeight: scale.tapTarget,
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale.rowGap,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <MaterialCommunityIcons
        name={ticked ? 'checkbox-marked' : 'checkbox-blank-outline'}
        size={scale.iconSize}
        color={ticked ? PALETTE.accion : PALETTE.tintaApagada}
      />
      {children}
    </Pressable>
  );
}
