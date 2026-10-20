// ============================================================================
// INICIO'S SMALL CAPITALS — a group's name over a band: *HOY*, *LO ÚLTIMO*,
// *TU MES*. Plan task `8g`.
//
// ⚠️ `R14`, LATE: Inicio and Lo último each drew an identical copy, and Números'
// centre (2026-10-20) would have been a third — so it moved here when the third
// caller arrived, and the two copies went. The ink is the only difference a
// caller makes: a counter's colour, or amber for something waiting.
// ============================================================================

import { Text } from 'react-native';

import { useDensity } from '@/theme/DensityProvider';
import { PALETTE } from '@/theme/palette';

export function Rotulo({ text, ink = PALETTE.tintaApagada }: { text: string; ink?: string }) {
  const { scale } = useDensity();
  return (
    <Text
      style={{
        fontSize: scale.smallSize,
        fontWeight: '700',
        color: ink,
        textTransform: 'uppercase',
        letterSpacing: scale.rowGap / 8,
      }}
    >
      {text}
    </Text>
  );
}
