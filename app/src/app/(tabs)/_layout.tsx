import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Tabs } from 'expo-router/js-tabs';
import { Image, Text, View, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { emblemaDe } from '@/api/emblema';
import { useWorkspace } from '@/api/hooks';
import { DIBUJOS } from '@/marca/dibujos';

import { TABS } from '@/navigation/tabs';
import { currentTabGuard } from '@/navigation/salida';
import { useDensity } from '@/theme/DensityProvider';
import { PALETTE } from '@/theme/palette';
import { letraTitulo } from '@/theme/letra';
import { OBJETOS } from '@/theme/mostrador';

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
        // ⚠️ `11.6`: THE BAR IS A SHEET ON THE COUNTER — white, with a `linea` top edge
        // (the design system's *Inicio*), stated rather than left to the theme.
        tabBarStyle: {
          height: scale.tabBarHeight + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: scale.rowGap / 2,
          backgroundColor: PALETTE.superficie,
          borderTopColor: PALETTE.linea,
        },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.route}
          name={tab.route}
          // ⚠️ `8g`'s review (2026-10-20): A FOCUSED SCREEN WITH WORK IN IT IS ASKED
          // FIRST — *Te lo compro* resets on leaving, after its question
          // (`@/navigation/salida`). Without a guard the press switches as ever.
          listeners={({ navigation, route }) => ({
            tabPress: (event) => {
              const guard = currentTabGuard();
              if (guard === null) return;
              event.preventDefault();
              guard.onLeave(() => navigation.navigate(route.name));
            },
          })}
          options={{
            // The header title and the tab label are the same Spanish word on
            // purpose: the door and the room are called the same thing.
            title: tab.label,
            // ⚠️ ROUND 4 OF `8g` (2026-10-16): COMPRAR'S TAB IS BLUE WHILE IT IS
            // OPEN — the owner's drawing, and `compra`'s own sentence. ⚠️ `8l`:
            // AND DESPERDICIO'S IS BERENJENA, his drawing again. Inicio and
            // Vender stay `accion`.
            tabBarActiveTintColor:
              tab.route === 'comprar'
                ? PALETTE.compra
                : tab.route === 'desperdicio'
                  ? PALETTE.desperdicio
                  : PALETTE.accion,
            header: () => <Banda title={tab.label} />,
            // ⚠️ `11.6`: NEVER THE COLOUR ALONE — the tab she is on is its colour AND a
            // heavier word (the design system's *Pestanas*); ⚠️ `11.9`: and the
            // marker's stroke under it, in the same colour (`Trazo`).
            tabBarLabel: ({ focused, color }) => (
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: scale.tabLabelSize, fontWeight: focused ? '700' : '500', color }}>{tab.label}</Text>
                <Trazo on={focused} color={color} />
              </View>
            ),
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

/** The marker's stroke — `brand/mostrador/png/trazo-pestana.png`, byte for byte. */
const TRAZO = require('@/marca/mostrador/trazo-pestana.png') as number;

/**
 * ⚠️ `11.9`: THE MARKER'S STROKE UNDER THE TAB SHE IS ON (`brand/mostrador/
 * objetos.json`'s *pestana*), tinted the tab's own colour — `accion`, `compra` on
 * Comprar, `desperdicio` on Merma — at its drawing's size, a little larger at
 * *Letra grande*. Under the other tabs an empty space of the same height, so no
 * word moves when she changes tab. NO CHECK CAN SEE IT (§2.11): the session's
 * shots and his look (`R9`).
 */
function Trazo({ on, color }: { on: boolean; color: ColorValue }) {
  const { mode } = useDensity();
  const [ancho, alto] = mode === 'elder' ? OBJETOS.trazo.grande : OBJETOS.trazo.normal;
  return (
    <Image
      source={TRAZO}
      tintColor={color}
      fadeDuration={0}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: ancho, height: alto, marginTop: OBJETOS.trazo.aire, opacity: on ? 1 : 0 }}
    />
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
 * ⚠️ SINCE `11.6` (direction A, his yes of 2026-11-26) THE BAND IS THE COUNTER:
 * `banda` is `fondo`'s grey, no line under it, the title in Archivo with its
 * line, and the shop's name in its own case — no capitals, no spacing — in the
 * rust, its one sign.
 *
 * ⚠️ THE TABS ONLY. A pushed screen keeps its own band with *Volver* or
 * *Cerrar* where the drawing would sit.
 *
 * ⚠️ THE DRAWING IS THE SHOP'S MAIN GIRO (`workspace.giro_principal`, `0056`):
 * the first giro picked when the shop was created, changed by the owner in
 * Ajustes. A shop that has none shows its name alone — nothing is guessed.
 */
function Banda({ title }: { title: string }) {
  const { scale } = useDensity();
  const insets = useSafeAreaInsets();
  const workspace = useWorkspace();
  // ⚠️ `?? null` INSIDE `emblemaDe`: a shop restored from before `0056` has no field.
  const emblema = emblemaDe(workspace?.giroPrincipal);
  return (
    <View
      style={{
        overflow: 'hidden',
        backgroundColor: PALETTE.banda,
        paddingTop: insets.top + scale.space,
        paddingBottom: scale.space,
        paddingHorizontal: scale.space,
        gap: scale.rowGap / 4,
      }}
    >
      {emblema === null ? null : (
        <Image
          source={DIBUJOS[emblema]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          // ⚠️ ANCHORED TO THE BAND'S FOOT AND NOT ITS TOP: the band is shorter
          // than the drawing, and hung from the top it showed only the upper
          // half — Carnicería's cow with no pig, which is the pair the owner
          // asked for. From the foot it rises into the band's own status-bar
          // ground, faint enough for the clock to read over it. Measured on the
          // emulator, 2026-10-16.
          style={{
            position: 'absolute',
            right: -scale.space,
            bottom: -scale.rowGap,
            width: scale.selloSize,
            height: scale.selloSize,
            opacity: SELLO_OPACITY,
          }}
        />
      )}
      <Text
        accessibilityRole="header"
        numberOfLines={1}
        style={{ ...letraTitulo(scale), color: PALETTE.tinta }}
      >
        {title}
      </Text>
      {workspace === null ? null : (
        <Text
          numberOfLines={1}
          style={{
            fontSize: scale.smallSize,
            fontWeight: '600',
            color: PALETTE.marca,
          }}
        >
          {workspace.displayName}
        </Text>
      )}
    </View>
  );
}
