import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Tabs } from 'expo-router/js-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TABS } from '@/navigation/tabs';
import { useDensity } from '@/theme/DensityProvider';

// ============================================================================
// THE TAB SHELL. Plan task 5a-ii. The tabs themselves are `src/navigation/
// tabs.ts` — read the header there for why they are data and not JSX.
//
// ⚠️ `tabBarShowLabel` IS SET EXPLICITLY EVEN THOUGH `true` IS THE DEFAULT.
// C12.1 is a decision, and a decision that survives only because nobody changed
// a default is not being kept, it is being got away with. Written down, the
// line that would break it is a line someone has to delete.
//
// ⚠️ THE BAR IS SIZED FROM C3.18's SCALE, not from react-navigation's 49pt
// default. Elder mode is a 32pt icon over a 15pt word, which does not fit a bar
// built for a 24pt icon over a 12pt one — so the height comes from the scale
// and the device's own bottom inset is added to it. Setting `height` takes over
// the inset handling react-navigation would otherwise do, which is why
// `paddingBottom` is here too: without it the labels sit under the home
// indicator on every iPhone the pilot uses (C1.1).
// ============================================================================

export default function TabsLayout() {
  const { scale } = useDensity();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        // C12.1, stated rather than defaulted.
        tabBarShowLabel: true,
        tabBarLabelStyle: { fontSize: scale.tabLabelSize },
        tabBarStyle: {
          height: scale.tabBarHeight + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: scale.rowGap / 2,
        },
        headerTitleStyle: { fontSize: scale.titleSize },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.route}
          name={tab.route}
          options={{
            // The header title and the tab label are the same Spanish word on
            // purpose: the door and the room are called the same thing.
            title: tab.label,
            tabBarIcon: ({ color }) => (
              <MaterialCommunityIcons
                // The glyph names are checked against the shipped map in
                // app/test/tabs.test.ts; a typo here is a blank square on the
                // bar, which is C12.1 broken silently.
                name={tab.icon}
                size={scale.iconSize}
                color={color}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
