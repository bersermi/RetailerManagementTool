import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { DONDE_SE_HACE, PENDIENTES, type Pendiente } from '@/lib/hoy';
import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';

// ============================================================================
// *TU PÁGINA EN ITACATE* — ITS CHECKLIST, IN *MI COCINA* UNDER HER PAGE (the
// family-shell page's `pageCard`). Plan task `10.5-v-c-i`: five things, how many are
// done and a bar, each one a row — done with a check, missing as a door to the screen
// where it is done (`@/lib/hoy`'s `DONDE_SE_HACE`). Drawn until all five are done; the
// same count is *Hoy*'s door, which she may close — closing it loses nothing, because
// this stays.
// ============================================================================

export function Pendientes({ faltan }: { faltan: readonly Pendiente[] }) {
  const hechos = PENDIENTES.length - faltan.length;
  return (
    <View
      style={{
        gap: SIZE.rowGap,
        padding: SIZE.space,
        borderRadius: SIZE.space,
        borderWidth: 1,
        borderColor: PALETTE.linea,
        backgroundColor: PALETTE.superficie,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Text style={{ fontSize: SIZE.bodySize, fontWeight: '700', color: PALETTE.tinta }}>{ES.pendientes.titulo}</Text>
        <Text style={{ fontSize: SIZE.smallSize, color: PALETTE.tintaApagada }}>{ES.pendientes.cuenta(hechos, PENDIENTES.length)}</Text>
      </View>
      <View style={{ height: 6, borderRadius: 3, overflow: 'hidden', backgroundColor: PALETTE.accionSuave }}>
        <View style={{ width: `${Math.round((hechos / PENDIENTES.length) * 100)}%`, height: 6, backgroundColor: PALETTE.accion }} />
      </View>
      {PENDIENTES.map((pendiente) => {
        const nombre = ES.pendientes.item[pendiente];
        if (!faltan.includes(pendiente)) {
          return (
            <View key={pendiente} accessibilityLabel={ES.pendientes.hecho(nombre)} style={{ flexDirection: 'row', alignItems: 'center', gap: SIZE.rowGap, minHeight: 32 }}>
              <MaterialCommunityIcons name="checkbox-marked-circle" size={20} color={PALETTE.accion} />
              <Text style={{ fontSize: SIZE.bodySize - 1, color: PALETTE.tintaApagada }}>{nombre}</Text>
            </View>
          );
        }
        return (
          <Pressable
            key={pendiente}
            accessibilityRole="button"
            accessibilityLabel={nombre}
            onPress={() => router.push(DONDE_SE_HACE[pendiente])}
            style={{ flexDirection: 'row', alignItems: 'center', gap: SIZE.rowGap, minHeight: SIZE.tapTarget }}
          >
            <MaterialCommunityIcons name="checkbox-blank-circle-outline" size={20} color={PALETTE.tintaApagada} />
            <Text style={{ flex: 1, fontSize: SIZE.bodySize - 1, fontWeight: '600', color: PALETTE.tinta }}>{nombre}</Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color={PALETTE.tintaApagada} />
          </Pressable>
        );
      })}
    </View>
  );
}
