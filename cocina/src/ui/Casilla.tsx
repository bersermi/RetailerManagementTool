// ============================================================================
// A BOX SHE TICKS — the aviso's, on *Crear cuenta*. Plan task `10.4b-iii-a`.
//
// ⚠️ WERA'S `Casilla` (`app/src/ui/Casilla.tsx`, plan `5R-d-iii`): the whole row
// is the target, and what sits beside the box is the caller's (the aviso's words
// open the page; a tap anywhere else ticks). It starts unticked and only she
// ticks it — a box that arrived ticked would be the app agreeing for her.
// ============================================================================

import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ReactNode } from 'react';
import { Pressable } from 'react-native';

import { PALETTE, SIZE } from '@/theme/palette';

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
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: ticked, disabled }}
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onToggle}
      style={{ minHeight: SIZE.tapTarget, flexDirection: 'row', alignItems: 'center', gap: SIZE.rowGap, opacity: disabled ? 0.6 : 1 }}
    >
      <MaterialCommunityIcons
        name={ticked ? 'checkbox-marked' : 'checkbox-blank-outline'}
        size={SIZE.iconSize}
        color={ticked ? PALETTE.accion : PALETTE.tintaApagada}
      />
      {children}
    </Pressable>
  );
}
