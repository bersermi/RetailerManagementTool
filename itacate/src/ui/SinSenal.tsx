import { Icono } from '@/ui/Icono';
import { Text, View } from 'react-native';

import { sinSenalTexto } from '@/lib/apartados';
import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';
import { ESQUINA } from '@/theme/density';

// ============================================================================
// WHAT HER TICKETS SAY WHEN HER PHONE IS ALL SHE HAS. Plan task `10.9j-ii-a` — the owner's J1
// of 2026-11-20: *"with no signal Itacate opens on her ticket under Sin señal. Lo que ves se leyó
// a las 13:40."* — Wera Cocina's line for its counter (`cocina/src/ui/SinSenal.tsx`, `10.5b-iv-b`),
// its first half: at the top of *Apartados*, state first, before anything she taps (ADR-035
// §2.8, §2.6: reads from the phone with visible staleness). Nothing when there is signal. Quiet,
// never red: nothing here is wrong. Her *Ya lo tengo* still waiting says so itself, under *Ya lo
// tienes*. NO CHECK CAN SEE THIS LINE (ADR-035 §2.11): the phone is its instrument.
// ============================================================================

export function SinSenal({ sinSenal, leidoEn, ahora }: { sinSenal: boolean; leidoEn: Date | null; ahora: Date }) {
  if (!sinSenal) return null;
  return (
    <View
      accessibilityRole="summary"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: SIZE.rowGap,
        padding: SIZE.space,
        borderRadius: ESQUINA.hoja,
        backgroundColor: PALETTE.superficie,
      }}
    >
      <Icono name="wifi-off" size={18} color={PALETTE.tintaApagada} />
      <Text style={{ flex: 1, fontSize: SIZE.smallSize, lineHeight: 18, fontWeight: '600', color: PALETTE.tinta }}>
        {leidoEn === null ? ES.senal.sinDatos : sinSenalTexto(leidoEn, ahora)}
      </Text>
    </View>
  );
}
