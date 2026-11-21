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
import { encabezado } from '@/theme/letra';
import { PALETTE } from '@/theme/palette';
import { ES_A } from '@/theme/piel';

/**
 * ⚠️ 11.5-i: a heading written in capitals, in sentence case — the strings stay as
 * they are; only their case changes on screen (11.1's *Words*).
 */
function oracion(t: string): string {
  if (t !== t.toLocaleUpperCase('es-MX')) return t;
  const l = t.toLocaleLowerCase('es-MX');
  for (let i = 0; i < l.length; i += 1) {
    const c = l.charAt(i);
    if (c.toLocaleUpperCase('es-MX') !== c) return l.slice(0, i) + c.toLocaleUpperCase('es-MX') + l.slice(i + 1);
  }
  return l;
}

export function Rotulo({ text, ink = PALETTE.tintaApagada }: { text: string; ink?: string }) {
  const { scale } = useDensity();
  // ⚠️ 11.5-i (never merged): under A a spaced capital becomes a heading in
  // sentence case, in the titles' face, in ink unless a role was asked for.
  if (ES_A) {
    return (
      <Text accessibilityRole="header" style={{ ...encabezado(scale), color: ink === PALETTE.tintaApagada ? PALETTE.tinta : ink }}>
        {oracion(text)}
      </Text>
    );
  }
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
