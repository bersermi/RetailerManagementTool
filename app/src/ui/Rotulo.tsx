// ============================================================================
// A HEADING OVER A BLOCK — *Hoy*, *Lo último*, *Tu mes*. Plan task `8g`, in small
// spaced capitals until `11.6`.
//
// ⚠️ `R14`, LATE: Inicio and Lo último each drew an identical copy, and Números'
// centre (2026-10-20) would have been a third — so it moved here when the third
// caller arrived, and the two copies went. The ink is the only difference a
// caller makes: a counter's colour, or amber for something waiting.
//
// ⚠️⚠️ SINCE `11.6` (direction A · *Mostrador*, the owner's yes of 2026-11-26) IT
// IS A HEADING, NOT A LABEL: the titles' face at a heading's size
// (`@/theme/letra`'s `letraEncabezado`), in `tinta` unless a block's colour is
// asked for, in sentence case and with no letter-spacing — the only words Step 11
// changes, and only their case. The words are written in sentence case in
// `@/strings`; `@/format/oracion` capitalises a heading's FIRST letter only,
// because a date arrives as `lunes 3` and a shop's name must keep its own case.
// Merma's chips' headings and the product page's cards draw this one too since `11.6`.
// ============================================================================

import { Text } from 'react-native';

import { enOracion } from '@/format/oracion';
import { useDensity } from '@/theme/DensityProvider';
import { letraEncabezado } from '@/theme/letra';
import { PALETTE } from '@/theme/palette';

export function Rotulo({ text, ink = PALETTE.tinta }: { text: string; ink?: string }) {
  const { scale } = useDensity();
  return (
    <Text accessibilityRole="header" style={{ ...letraEncabezado(scale), color: ink }}>
      {enOracion(text)}
    </Text>
  );
}
