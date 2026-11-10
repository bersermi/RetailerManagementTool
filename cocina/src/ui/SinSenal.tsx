import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Text, View } from 'react-native';

import type { Envio } from '@/api/cola';
import { porEnviarTexto, sinSenalTexto } from '@/lib/apartados';
import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';

// ============================================================================
// WHAT THE COUNTER SAYS WHEN THE PHONE IS ALL SHE HAS. Plan task `10.5b-iv-b`. On
// *Hoy*, *Apartados* and *Entregar un apartado*, at the top — state first, before
// anything she taps (ADR-035 §2.8):
//   - with no signal, when what she sees was read: *Sin señal. Lo que ves se leyó a
//     las 13:05.* (§2.6: reads from the phone with visible staleness);
//   - while anything of hers waits: *2 entregas y 1 calificación por enviar* and
//     Wera's *Todavía están en este teléfono. Se envían solas cuando vuelve la señal.*
// Nothing when neither. Quiet, never red: nothing here is wrong, and nothing waits
// for her. ⚠️ `cola={false}` on *Entregar un apartado*: the order she handed over says
// *Guardada en este teléfono…* itself, and the two together said it twice (found on the
// emulator). NO CHECK CAN SEE THIS LINE (ADR-035 §2.11): the phone is its instrument.
// ============================================================================

export function SinSenal({
  sinSenal,
  leidoEn,
  porEnviar,
  ahora,
  cola = true,
}: {
  sinSenal: boolean;
  leidoEn: Date | null;
  porEnviar: readonly Envio[];
  ahora: Date;
  /** Whether what waits is said here too. */
  cola?: boolean;
}) {
  const espera = cola ? porEnviarTexto(porEnviar) : null;
  if (!sinSenal && espera === null) return null;
  const quiet = { fontSize: SIZE.smallSize, lineHeight: 18, color: PALETTE.tintaApagada } as const;
  return (
    <View
      accessibilityRole="summary"
      style={{ gap: 6, padding: SIZE.space, borderRadius: SIZE.space - 2, borderWidth: 1, borderColor: PALETTE.linea, backgroundColor: PALETTE.superficie }}
    >
      {sinSenal && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SIZE.rowGap }}>
          <MaterialCommunityIcons name="wifi-off" size={18} color={PALETTE.tintaApagada} />
          <Text style={{ ...quiet, flex: 1, fontWeight: '600', color: PALETTE.tinta }}>
            {leidoEn === null ? ES.cola.sinDatos : sinSenalTexto(leidoEn, ahora)}
          </Text>
        </View>
      )}
      {espera !== null && (
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: SIZE.rowGap }}>
          <MaterialCommunityIcons name="cloud-upload-outline" size={18} color={PALETTE.tintaApagada} style={{ marginTop: 1 }} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ ...quiet, fontWeight: '600', color: PALETTE.tinta }}>{espera}</Text>
            <Text style={quiet}>{ES.cola.seEnvian(porEnviar.length)}</Text>
          </View>
        </View>
      )}
    </View>
  );
}
