import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { pestanaDe } from '@/navigation/pestanas';
import { PALETTE, SIZE } from '@/theme/palette';

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
// ============================================================================

export function Pestanas({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
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
            accessibilityLabel={pestana.label}
            accessibilityState={{ selected: enUso }}
            onPress={tocar}
            style={{ flex: 1, maxWidth: 112, minHeight: SIZE.tapTarget, alignItems: 'center', justifyContent: 'center', gap: 3 }}
          >
            <View
              style={{
                width: 56,
                height: 30,
                borderRadius: 15,
                alignItems: 'center',
                justifyContent: 'center',
                // ⚠️ THE BAR'S OWN WHITE, NEVER `transparent` (`10.5-v-c-i`, measured on the emulator):
                // Android drops a view's rounded corners when its background goes from transparent
                // to a colour, so after the first tab switch every pill drew square.
                backgroundColor: enUso ? PALETTE.accionSuave : PALETTE.superficie,
              }}
            >
              <MaterialCommunityIcons name={pestana.icono} size={SIZE.iconSize} color={color} />
            </View>
            <Text style={{ fontSize: 12, fontWeight: enUso ? '700' : '600', color }}>{pestana.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
