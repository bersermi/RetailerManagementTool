// ============================================================================
// A ROW OF SIDE-BY-SIDE CHOICES, ONE OF THEM PICKED. Plan task `7a`, and `R14`:
// `documentos.tsx` drew it first (Ventas / Compras / Desperdicio, `5h-ii-a`) and
// `numeros.tsx` is the second file to need it — twice, for Día / Semana / Mes
// and for Por producto / Por familia.
//
// ⚠️ EXTRACTED BYTE-FOR-BYTE, SO THERE WAS NO DRIFT TO SETTLE (`R16`). The one
// difference between the copies is DECIDED — which choices, and their words —
// and it is the two props `options` and `labels`. Nothing a shopkeeper sees on
// `Lo último` changed.
//
// ⚠️ THE SELECTED SIDE IS SAID BY A FILL **AND** BY `accessibilityState`, never
// by colour alone — §2.11: *"No state is ever announced by colour ALONE."* Two
// of the pilot's four phones are low-end Android and the shop is bright.
//
// ⚠️ `tapTarget` AND NOT `bodySize` FOR THE HEIGHT: this is the control a thumb
// hits first on the screen, and C3.18's argument about taller rows applies to
// the thing above them too.
//
// ⚠️ `options` IS AN ARRAY OF KEYS AND THE STATE IS A KEY, NEVER AN INDEX — the
// argument `documentos.tsx` made: an index would let a re-ordering of the list
// silently swap which choice a tap picks.
// ============================================================================

import { Pressable, Text, View } from 'react-native';

import { useDensity } from '@/theme/DensityProvider';
import { PALETTE } from '@/theme/palette';

export function Interruptor<K extends string>({
  options,
  labels,
  picked,
  onPick,
}: {
  options: readonly K[];
  labels: Readonly<Record<K, string>>;
  picked: K;
  onPick: (key: K) => void;
}) {
  const { scale } = useDensity();
  return (
    <View style={{ flexDirection: 'row', gap: scale.rowGap }}>
      {options.map((one) => {
        const on = one === picked;
        return (
          <Pressable
            key={one}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => onPick(one)}
            style={{
              flex: 1,
              minHeight: scale.tapTarget,
              justifyContent: 'center',
              alignItems: 'center',
              borderRadius: scale.rowGap,
              borderWidth: 1,
              borderColor: on ? PALETTE.accion : PALETTE.linea,
              backgroundColor: on ? PALETTE.accionSuave : PALETTE.superficie,
            }}
          >
            <Text
              style={{
                fontSize: scale.bodySize,
                fontWeight: on ? '700' : '600',
                color: on ? PALETTE.accion : PALETTE.tintaApagada,
              }}
            >
              {labels[one]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
