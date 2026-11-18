import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { DONDE_SE_HACE, ICONO_DE_PENDIENTE, type Pendiente } from '@/lib/hoy';
import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';

// ============================================================================
// *TU PÁGINA EN ITACATE* — WHAT IS MISSING, IN *MI COCINA* UNDER HER PAGE (the family-shell page's
// `faltaRows`, round 7). Plan task `10.9a-iii`, the owner's ruling of 2026-11-17: *Tu página · N de 5*
// and every count of what she has not done go — so no count and no bar any more (`10.5-v-c-i`'s
// checklist): each part still missing is one row, its name, *Para tu página en Itacate* and a *Falta*
// tag, opening where it is done (`@/lib/hoy`'s `DONDE_SE_HACE`). Done parts are not listed. Drawn
// while anything is missing; *Hoy*'s quiet line points at the same parts, one at a time.
// ============================================================================

export function Falta({ faltan }: { faltan: readonly Pendiente[] }) {
  return (
    <View style={{ borderRadius: SIZE.space, borderWidth: 1, borderColor: PALETTE.linea, backgroundColor: PALETTE.superficie }}>
      {faltan.map((pendiente, i) => {
        const nombre = ES.pendientes.item[pendiente];
        return (
          <Pressable
            key={pendiente}
            accessibilityRole="button"
            accessibilityLabel={`${nombre}, ${ES.pendientes.paraTuPagina}. ${ES.pendientes.falta}`}
            onPress={() => router.push(DONDE_SE_HACE[pendiente])}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: SIZE.space,
              minHeight: SIZE.tapTarget + SIZE.rowGap,
              paddingHorizontal: SIZE.space,
              borderTopWidth: i === 0 ? 0 : 1,
              borderColor: PALETTE.linea,
              backgroundColor: pressed ? PALETTE.fondo : 'transparent',
            })}
          >
            <MaterialCommunityIcons name={ICONO_DE_PENDIENTE[pendiente]} size={20} color={PALETTE.tintaApagada} />
            <View style={{ flex: 1, paddingVertical: SIZE.rowGap }}>
              <Text style={{ fontSize: SIZE.bodySize - 1, fontWeight: '600', color: PALETTE.tinta }}>{nombre}</Text>
              <Text style={{ fontSize: SIZE.smallSize, color: PALETTE.tintaApagada }}>{ES.pendientes.paraTuPagina}</Text>
            </View>
            <View style={{ paddingHorizontal: 6, paddingVertical: 4, borderRadius: 6, backgroundColor: PALETTE.marcaSuave }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: PALETTE.marca }}>{ES.pendientes.falta}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
