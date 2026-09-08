import { Pressable, Text, View } from 'react-native';

import { formatMXN } from '@/format/mxn';
import { ES } from '@/strings';
import { DENSITY_MODES } from '@/theme/density';
import { useDensity } from '@/theme/DensityProvider';
import { placeholderGrossCentavos } from '@/wiring';

// ============================================================================
// ⚠️ NOT HOME. §2.8's Inicio is today's takings, today's count, and anything
// expiring within 48 hours — none of which exists yet, because none of it has a
// query behind it in this app.
//
// WHAT THIS IS: the two things 5a-ii can only claim on a machine and can be
// LOOKED AT on a phone.
//
//   * `formatMXN()` on a real value from `@tienda/money` — C12.2's rule
//     rendered at whatever size the mode says, which is the whole point of
//     having both a formatter and a scale.
//   * a switch between C3.18's two modes.
//
// ⚠️⚠️ THE SWITCH IS TEMPORARY AND IT IS IN THE WRONG PLACE ON PURPOSE. The
// density choice belongs in Ajustes — a sheet, §2.8 — which arrives with 5b's
// Configuración, and it belongs in storage, which arrives with 5a-iii. It is
// here because `5a-iv` puts this app on the owner's own iPhone and an elder
// mode he cannot switch to is an elder mode he cannot judge. WHOEVER BUILDS
// AJUSTES DELETES THIS BLOCK.
// ============================================================================

export default function Inicio() {
  const { mode, scale, setMode } = useDensity();

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: scale.space * 2 }}>
      <Text style={{ fontSize: scale.moneySize, fontWeight: '700' }}>
        {formatMXN(placeholderGrossCentavos())}
      </Text>

      <View style={{ flexDirection: 'row', gap: scale.rowGap }}>
        {DENSITY_MODES.map((candidate) => (
          <Pressable
            key={candidate}
            onPress={() => setMode(candidate)}
            style={{
              minHeight: scale.tapTarget,
              justifyContent: 'center',
              paddingHorizontal: scale.space * 1.5,
              borderRadius: scale.space / 2,
              borderWidth: candidate === mode ? 2 : 1,
              opacity: candidate === mode ? 1 : 0.5,
            }}
          >
            <Text style={{ fontSize: scale.bodySize }}>{ES.density[candidate]}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
