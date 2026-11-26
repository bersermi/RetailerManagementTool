import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useCallback } from 'react';
import { Pressable, Text, View } from 'react-native';

import { asiFuncionaVisible, asiFuncionaVisto, useMemoria } from '@/lib/empujones';
import { PASOS_DE, type Elegible } from '@/lib/loQueUsas';
import { ES } from '@/strings';
import { letraEncabezado } from '@/theme/letra';
import { PALETTE, SIZE } from '@/theme/palette';

// ============================================================================
// *ASÍ FUNCIONA* — THREE PICTURES, THE FIRST TIME SHE OPENS A FEATURE (the family-shell page's
// `strip`). Plan task `10.9a-iii`, the owner's nudges (ruled 2026-11-17: *"he wants to see it
// drawn"*): at the top of the feature's one screen, each step a picture with its number and a line,
// a ✕ — gone after she uses the feature or closes it, on this phone (`@/lib/empujones`).
//
// ⚠️ BUILT HERE, DRAWN BY EACH FEATURE'S ROW (`10.9e`, `10.9f`, `10.9g`): its screen calls
// `useAsiFunciona(kitchenId, servicio)`, draws `<AsiFunciona>` while `visible`, and calls `usado()`
// the first time she does what the feature is for. Nothing draws it today — no feature is built.
// ============================================================================

/** Whether the strip shows on this phone, and the two ways it goes for good. */
export function useAsiFunciona(kitchenId: string, servicio: Elegible) {
  const [memoria, cambiar] = useMemoria(kitchenId);
  const usado = useCallback(() => cambiar((m) => asiFuncionaVisto(m, servicio)), [cambiar, servicio]);
  return { visible: asiFuncionaVisible(memoria, servicio), usado, cerrar: usado } as const;
}

export function AsiFunciona({ servicio, onCerrar }: { servicio: Elegible; onCerrar: () => void }) {
  const pasos = ES.asiFunciona.pasos[servicio];
  return (
    <View
      style={{
        gap: SIZE.rowGap,
        padding: SIZE.space,
        borderRadius: SIZE.space,
        backgroundColor: PALETTE.accionSuave,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ ...letraEncabezado(SIZE), color: PALETTE.accion }}>
          {ES.asiFunciona.titulo}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${ES.asiFunciona.cerrar}: ${ES.asiFunciona.titulo}`}
          onPress={onCerrar}
          hitSlop={SIZE.rowGap}
          style={{ width: SIZE.tapTarget - 12, height: SIZE.tapTarget - 12, alignItems: 'center', justifyContent: 'center' }}
        >
          <MaterialCommunityIcons name="close" size={16} color={PALETTE.tintaApagada} />
        </Pressable>
      </View>
      {pasos.map((texto, n) => (
        <View key={texto} style={{ flexDirection: 'row', alignItems: 'center', gap: SIZE.space }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: PALETTE.superficie,
            }}
          >
            <MaterialCommunityIcons name={PASOS_DE[servicio][n]} size={24} color={PALETTE.accion} />
            <View
              style={{
                position: 'absolute',
                top: -2,
                right: -2,
                width: 18,
                height: 18,
                borderRadius: 9,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: PALETTE.accion,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '800', color: PALETTE.sobreAccion }}>{n + 1}</Text>
            </View>
          </View>
          <Text style={{ flex: 1, fontSize: SIZE.bodySize - 1, lineHeight: 20, color: PALETTE.tinta }}>{texto}</Text>
        </View>
      ))}
    </View>
  );
}
