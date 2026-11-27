import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useApartados } from '@/api/hooks';
import { hayPunto } from '@/lib/misCocinas';
import { useAhora } from '@/lib/useAhora';
import { pestanaDe } from '@/navigation/pestanas';
import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';
import { Trazo } from '@/ui/Mostrador';

// ============================================================================
// THE TAB BAR ITSELF. Plan task `10.5-v-b`, drawn as the family-shell page draws it:
// white, a line above, each tab its icon over its word; the one she is on in Itacate's
// blue, its word heavier and a pill of the blue's tint behind its icon — never the
// colour alone (ADR-035 §2.11's palette row).
//
// ⚠️ WERA'S JAVASCRIPT TABS (`expo-router/js-tabs`), the owner's ruling, with the bar
// drawn here rather than react-navigation's: the pill is the drawing, and the default
// bar has no room for it. ⚠️ IT DOES WHAT THE DEFAULT BAR DOES ON A PRESS — it tells
// the tab first (`tabPress`, which a screen may stop) and moves only if nobody did.
// The device's bottom inset is added under it, so the words never sit under the
// gesture bar or the home indicator. NO CHECK CAN SEE IT (§2.11): the phone is the
// instrument.
// ⚠️ `10.9d-ii` (G39): A DOT ON *MIS COCINAS* WHILE A RESERVATION IS PINNED (`hayPunto`) — her
// reservation is no longer a tab of its own, so the bar says from any tab that one lasts. In the
// drawing's red for what is live (`--pe`, our `PALETTE.error`'s value), ringed in the bar's white.
// ============================================================================

/** The tab that carries the dot. */
const CON_PUNTO = 'mis-cocinas';
/** How often the bar reads the clock — a plate that *se liberó* a day ago drops its dot. */
const CADA_MINUTO = 60_000;

export function Pestanas({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const apartados = useApartados();
  const ahora = useAhora(CADA_MINUTO);
  const punto = hayPunto(apartados.data, ahora);
  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: 'row',
        justifyContent: 'space-around',
        backgroundColor: PALETTE.superficie,
        borderTopWidth: 1,
        borderTopColor: PALETTE.linea,
        paddingTop: SIZE.rowGap - 2,
        paddingBottom: insets.bottom + SIZE.rowGap,
      }}
    >
      {state.routes.map((route, index) => {
        const pestana = pestanaDe(route.name);
        if (pestana === null) return null;
        const enUso = state.index === index;
        const color = enUso ? PALETTE.accion : PALETTE.tintaApagada;
        const tocar = () => {
          const evento = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!enUso && !evento.defaultPrevented) navigation.navigate(route.name, route.params);
        };
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityLabel={punto && pestana.ruta === CON_PUNTO ? `${pestana.label}, ${ES.fijado.ayuda}` : pestana.label}
            accessibilityState={{ selected: enUso }}
            onPress={tocar}
            style={{ flex: 1, maxWidth: 112, minHeight: SIZE.tapTarget, alignItems: 'center', justifyContent: 'center', gap: 3 }}
          >
            <View
              style={{
                width: 56,
                height: 30,
                alignItems: 'center',
                justifyContent: 'center',
                // ⚠️ `11.7-ii`: NO PILL — the tab she is on is its colour, a bolder word and, since
                // `11.8-i`, the marker's stroke under it (`@/ui/Mostrador`'s `Trazo`). The box stays,
                // in the bar's own white, so the dot keeps its place over the icon.
                backgroundColor: PALETTE.superficie,
              }}
            >
              <MaterialCommunityIcons name={pestana.icono} size={SIZE.iconSize} color={color} />
              {punto && pestana.ruta === CON_PUNTO && (
                <View
                  style={{
                    position: 'absolute',
                    top: 2,
                    right: 12,
                    width: 11,
                    height: 11,
                    borderRadius: 5.5,
                    borderWidth: 2,
                    borderColor: PALETTE.superficie,
                    backgroundColor: PALETTE.error,
                  }}
                />
              )}
            </View>
            <Text style={{ fontSize: 12, fontWeight: enUso ? '700' : '500', color }}>{pestana.label}</Text>
            <Trazo on={enUso} color={PALETTE.accion} />
          </Pressable>
        );
      })}
    </View>
  );
}
