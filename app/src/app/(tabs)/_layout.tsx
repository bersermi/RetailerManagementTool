import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Tabs } from 'expo-router/js-tabs';
import { Image, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useShopEmblem, useWorkspace } from '@/api/hooks';
import { DIBUJOS } from '@/marca/dibujos';

import { TABS } from '@/navigation/tabs';
import { useDensity } from '@/theme/DensityProvider';
import { PALETTE } from '@/theme/palette';

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
        // ⚠️ `8g`, 2026-10-15: THE ACTIVE TAB IN `accion`, NOT iOS'S BLUE. `8f`
        // left it for the owner's review; it was drawn green on every board he
        // ruled on, and blue was the one hue on screen no role had chosen.
        // `palette.ts` names *the active tab* in `accion`'s own sentence.
        tabBarActiveTintColor: PALETTE.accion,
        tabBarInactiveTintColor: PALETTE.tintaApagada,
        tabBarStyle: {
          height: scale.tabBarHeight + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: scale.rowGap / 2,
        },
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
            header: () => <Banda title={tab.label} />,
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

/**
 * How faint the shop's drawing is. ⚠️ A NUMBER AND NOT A SIZE OR A COLOUR, so
 * neither `R6` nor `R11` owns it — it lives beside the one view that reads it.
 */
const SELLO_OPACITY = 0.14;

/**
 * ⚠️⚠️ THE FOUR TABS' HEADER — `8g`, THE OWNER'S RULINGS OF 2026-10-15. *Option
 * 1*: the cream `banda` with the title on the left, which the other fourteen
 * screens already draw, in place of the system's white header (centred on an
 * iPhone, so the two halves of the app had two headers). *Option C* on top of
 * it: **the shop's name in small capitals under the title, and a drawing of its
 * giro, faint, cut off at the band's right edge** — *"a nice detail in case
 * someone pays attention, shouldn't be noisy."* He chose it knowing old eyes
 * may not see it.
 *
 * ⚠️ THE TABS ONLY. A pushed screen keeps its own band with *Volver* or
 * *Cerrar* where the drawing would sit.
 *
 * ⚠️ NO PICTURE UNTIL ONE IS KNOWN (`useShopEmblem`), and the name alone until
 * the shop is: nothing here is drawn from a guess.
 */
function Banda({ title }: { title: string }) {
  const { scale } = useDensity();
  const insets = useSafeAreaInsets();
  const workspace = useWorkspace();
  const emblema = useShopEmblem(workspace?.id ?? null);
  return (
    <View
      style={{
        overflow: 'hidden',
        backgroundColor: PALETTE.banda,
        paddingTop: insets.top + scale.space,
        paddingBottom: scale.space,
        paddingHorizontal: scale.space,
        borderBottomWidth: 1,
        borderBottomColor: PALETTE.linea,
        gap: scale.rowGap / 4,
      }}
    >
      {emblema === null ? null : (
        <Image
          source={DIBUJOS[emblema]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{
            position: 'absolute',
            right: -scale.space * 1.5,
            top: insets.top,
            width: scale.selloSize,
            height: scale.selloSize,
            opacity: SELLO_OPACITY,
          }}
        />
      )}
      <Text
        accessibilityRole="header"
        numberOfLines={1}
        style={{ fontSize: scale.titleSize, fontWeight: '700', color: PALETTE.tinta }}
      >
        {title}
      </Text>
      {workspace === null ? null : (
        <Text
          numberOfLines={1}
          style={{
            fontSize: scale.smallSize,
            fontWeight: '700',
            letterSpacing: scale.rowGap / 8,
            textTransform: 'uppercase',
            color: PALETTE.marca,
          }}
        >
          {workspace.displayName}
        </Text>
      )}
    </View>
  );
}
