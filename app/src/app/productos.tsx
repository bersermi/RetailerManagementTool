import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCatalog } from '@/api/hooks';
import { emptyLineKey, type CatalogEntry } from '@/api/catalog';
import { ES } from '@/strings';
import { useDensity } from '@/theme/DensityProvider';
import { PALETTE } from '@/theme/palette';

// ============================================================================
// PRODUCTOS — EVERYTHING THIS SHOP SELLS, IN ONE FLAT LIST. Plan task `5d-ii`,
// the app's THIRD non-tab surface and the first screen whose subject is the
// shop rather than the people in it.
//
// ⚠️⚠️ VARIANT-FIRST, AND IT IS THE OWNER'S OWN CORRECTION OF AN INTERVIEW
// ANSWER. C8.13 was drawn as a grid of family tiles; on 2026-09-15 he ruled
// *"the list of products displayed in Productos should be all the product
// variants"* — so every row here is a VARIANT, and the family is the word
// underneath its name. The family with its variants at sight is `5d-iii`,
// reached by tapping a row, and it is the one surface in this app where that
// structure is visible at all (C3.1 already flattened the transaction screens).
//
// ⚠️⚠️ THE ROWS OPEN THE FAMILY AS OF `5d-iii`, AND THAT IS WHAT THE PREVIOUS
// TASK SAID WOULD HAPPEN. `5d-ii` shipped this list with no `Pressable`, no
// chevron and no ripple on purpose — a row that looked pressable and did
// nothing is worse than one that is plainly not built — and said in this header
// that the day `5d-iii` landed the row would become one. It has, and it did.
// ⚠️ THE AFFORDANCE IS THE INITIALS TILE'S GROUND AND NOT A CHEVRON: `Iniciales`
// moves from `fondo` to `accionSuave`, whose one job is *the resting fill of an
// action, so it reads as tappable at rest* — which is direction B carrying
// affordance with HUE, the thing it was chosen over direction A for. A chevron
// would be an icon with no word beside it, which C12.1 refuses outright.
//
// ⚠️ IT DECIDES NOTHING ABOUT THE CATALOG. Which price is today's, what a peso
// figure comes to, what a row's two letters are and what a typed search matches
// are all in `@/api/catalog`, where `app/test/api-catalog.test.ts` reads them
// and `docs/checks/5d-i-catalog-contract.sh` drives them against a real
// database. This file draws what `useCatalog` returns, in the order it returns
// it.
//
// ⚠️⚠️ THE SEARCH NEVER TOUCHES THE NETWORK, AND THAT IS THE POINT. It filters
// rows TanStack Query already holds, so it works with no signal — which is the
// ordinary condition in the pilot store, not the edge case. A search that asked
// Postgres per keystroke would be a screen that stops working at 11am and looks
// broken rather than offline.
//
// ⚠️ NOT IN `RESTORABLE_ROUTES`, deliberately. C1.3 reopens the screen a person
// was WORKING on; browsing the catalog is not work, and the allow-list one
// module over is what makes that a decision rather than an oversight.
//
// ⚠️ A PUSHED SCREEN AND NOT A SHEET. §2.8 lists `Catálogo` among the screens
// and fixes `Ajustes` alone as a sheet, so this is somewhere you GO — with its
// own `banda` and its own way back, because the root `Stack` draws no header
// (see `app/_layout.tsx`).
//
// ⚠️⚠️ WHAT NO CHECK IN THIS REPOSITORY CAN SEE — `R9`, and on this screen it
// is nearly everything. §2.11 keeps rendering, navigation and layout out of
// scope, so nothing here will ever say whether the list is legible across a
// counter, whether the search box is reachable with one thumb, whether the
// initials tile reads as a product or as a badge, or whether *Letra grande*
// leaves room for a price beside a long name. **The instrument is the owner's
// phone.** The half that is checkable — every string, every peso figure, every
// match — is in `@/api/catalog` on purpose.
// ============================================================================

export default function Productos() {
  const { scale } = useDensity();
  const insets = useSafeAreaInsets();

  // ⚠️ THE TYPED TEXT LIVES HERE AND THE FILTERING DOES NOT. `useCatalog` takes
  // the string and returns the rows that match, so this component holds a
  // keystroke and never an opinion about what it means.
  const [typed, setTyped] = useState('');
  const { loading, entries } = useCatalog(typed);

  return (
    <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
      <Banda />
      <Buscador value={typed} onChange={setTyped} />

      <FlatList
        // ⚠️ A `FlatList` AND NOT A `ScrollView`, AND IT IS A PERFORMANCE
        // DECISION RATHER THAN A HABIT. C8.3 puts ~100 products in the pilot
        // catalog and C1.1 puts two LOW-END ANDROIDS among its four phones; a
        // ScrollView mounts every row at once, which is the scroll that stutters
        // on exactly those two devices and on nobody's development machine.
        data={entries}
        keyExtractor={(entry) => entry.id}
        renderItem={({ item }) => <Fila entry={item} />}
        // ⚠️ A SEPARATOR RATHER THAN A BORDER ON EVERY ROW: one line between two
        // rows, never a line under the last one.
        ItemSeparatorComponent={Separador}
        ListEmptyComponent={<Vacio loading={loading} typed={typed} />}
        contentContainerStyle={{
          paddingBottom: scale.space * 2 + insets.bottom,
        }}
        // The keyboard closes when a thumb reaches the list, rather than the
        // first tap being swallowed by dismissing it.
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
}

/** The room's name and the way back. `solicitudes`' shape, one word different:
 *  this is a pushed screen, so the control says *Volver* and not *Cerrar*. */
function Banda() {
  const { scale } = useDensity();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        backgroundColor: PALETTE.banda,
        paddingTop: insets.top + scale.space,
        paddingBottom: scale.space,
        paddingHorizontal: scale.space,
        borderBottomWidth: 1,
        borderBottomColor: PALETTE.linea,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: scale.space,
      }}
    >
      <Text style={{ fontSize: scale.titleSize, fontWeight: '700', color: PALETTE.tinta }}>
        {ES.catalog.title}
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.back()}
        style={{
          minHeight: scale.tapTarget,
          minWidth: scale.tapTarget,
          justifyContent: 'center',
          alignItems: 'flex-end',
        }}
      >
        <Text style={{ fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.accion }}>
          {ES.catalog.back}
        </Text>
      </Pressable>
    </View>
  );
}

/**
 * The search box, above the list and staying there.
 *
 * ⚠️ IT DOES NOT SCROLL AWAY, which is why it is here rather than inside the
 * list as a header. C3.1 puts the box *above* a scrolling list; a box that
 * scrolled off would mean scrolling back to the top to search, and the shop
 * with a hundred products is exactly the shop that searches.
 *
 * ⚠️⚠️ AND IT CLEARS WITH A WORD RATHER THAN A CROSS. `clearButtonMode` is iOS
 * only and two of the pilot's four phones are Android (C1.1), so the control
 * that exists on both is a labelled one — which is also what C12.1 asks for:
 * never an icon with no word beside it.
 */
function Buscador({ value, onChange }: { value: string; onChange: (text: string) => void }) {
  const { scale } = useDensity();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale.rowGap,
        paddingHorizontal: scale.space,
        paddingVertical: scale.space,
      }}
    >
      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          gap: scale.rowGap,
          minHeight: scale.tapTarget,
          paddingHorizontal: scale.space,
          borderRadius: scale.space / 2,
          borderWidth: 1,
          borderColor: PALETTE.linea,
          backgroundColor: PALETTE.superficie,
        }}
      >
        {/* ⚠️ THE ONE ICON ON THIS SCREEN WITH NO WORD BESIDE IT, AND C12.1 IS
            NOT BENT BY IT: the word is the placeholder inside the same box, in
            the same line, and it is what a person reads first. */}
        <MaterialCommunityIcons name="magnify" size={scale.iconSize} color={PALETTE.tintaApagada} />
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={ES.catalog.search}
          placeholderTextColor={PALETTE.tintaApagada}
          // ⚠️ NO AUTOCORRECT AND NO CAPITALS. A till types `pechuga` and a
          // keyboard that "helps" turns a product search into a guessing game;
          // `@/api/catalog` folds case and accents on both sides anyway.
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          accessibilityLabel={ES.catalog.search}
          style={{
            flex: 1,
            paddingVertical: scale.rowGap,
            fontSize: scale.bodySize,
            color: PALETTE.tinta,
          }}
        />
      </View>

      {value === '' ? null : (
        <Pressable
          accessibilityRole="button"
          onPress={() => onChange('')}
          style={{
            minHeight: scale.tapTarget,
            justifyContent: 'center',
            paddingHorizontal: scale.rowGap,
          }}
        >
          <Text style={{ fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.accion }}>
            {ES.catalog.clear}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

/**
 * One product. Two letters, a name over its family, and a price with its unit —
 * and, as of `5d-iii`, the way into the family behind it.
 *
 * ⚠️⚠️ THE FAMILY IS THE PATH AND THE TAPPED VARIANT IS A QUERY PARAMETER,
 * because that is what each one is: `/familia/<family_id>?variante=<id>` opens
 * the family and marks the row she came from. A link that lost the parameter
 * still opens the right family with nothing marked, which is the failure worth
 * having.
 *
 * ⚠️ `router.push` AND NOT `replace`, like the door on Inicio: you come back
 * from a screen you went into, and *Volver* is the control that does it.
 */
function Fila({ entry }: { entry: CatalogEntry }) {
  const { scale } = useDensity();
  return (
    <Pressable
      // ⚠️ THE WHOLE ROW IS ONE THING TO A SCREEN READER, in the order a person
      // reads it: the product, then the family it belongs to, then what it
      // costs. Three separate labels would be three swipes per product.
      accessible
      accessibilityRole="button"
      accessibilityLabel={[entry.name, entry.familyName, entry.price]
        .filter((part) => part !== '')
        .join('. ')}
      onPress={() =>
        router.push({
          pathname: '/familia/[id]',
          params: { id: entry.familyId, variante: entry.id },
        })
      }
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale.rowGap,
        minHeight: scale.rowHeight,
        paddingVertical: scale.rowGap,
        paddingHorizontal: scale.space,
        backgroundColor: PALETTE.superficie,
      }}
    >
      <Iniciales text={entry.initials} />

      <View style={{ flex: 1, gap: scale.rowGap / 4 }}>
        <Text
          numberOfLines={1}
          style={{ fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.tinta }}
        >
          {entry.name}
        </Text>
        {entry.familyName === '' ? null : (
          <Text
            numberOfLines={1}
            style={{ fontSize: scale.bodySize * 0.85, color: PALETTE.tintaApagada }}
          >
            {entry.familyName}
          </Text>
        )}
      </View>

      {/* ⚠️⚠️ THE PRICE IS `tinta` AND THE DASH IS NOT AMBER, WHICH IS A
          DECISION AND NOT AN OMISSION. `atencion`'s one job is C3.17: a row
          whose missing price BLOCKS a sale, on a screen where the fix is one
          tap away. Nothing on this screen can set a price — `Editar` is `5e` —
          so amber here would be an alarm on a hundred rows that nobody can
          silence, and a colour that means "act" where there is no act is how a
          role acquires a second job. The dash is a secondary label until there
          is something to do about it. */}
      <Text
        style={{
          fontSize: scale.bodySize,
          fontWeight: '600',
          color: entry.centavos === null ? PALETTE.tintaApagada : PALETTE.tinta,
        }}
      >
        {entry.price}
      </Text>
    </Pressable>
  );
}

/**
 * C8.14's two letters, for a product with no picture.
 *
 * ⚠️⚠️ IT MUST NOT LOOK UNFINISHED, WHICH IS THE WHOLE CONSTRAINT. *"A
 * merchant-created product shows initials and is transactable immediately… the
 * merchant is NOT shown a pending-photo state"* — so there is no camera glyph,
 * no dashed outline and no grey placeholder frame anywhere on this screen. A
 * product with initials is a finished product; assigning the picture is our
 * maintenance chore (C8.15), and the shop is never told we owe it one.
 *
 * ⚠️⚠️ THE GROUND IS `accionSuave` AS OF `5d-iii`, AND THE CHANGE IS THE WHOLE
 * AFFORDANCE. `5d-ii` drew it on `fondo` and wrote down why: `accionSuave`'s one
 * job is *"the resting fill behind an action, so it reads as tappable at rest"*,
 * and the rows were not tappable yet. They are now — the tile is what says so,
 * and it says it in HUE, which is what direction B was chosen over direction A
 * for. ⚠️ The alternative was a chevron, and C12.1 refuses an icon with no word.
 */
function Iniciales({ text }: { text: string }) {
  const { scale } = useDensity();
  const side = scale.tapTarget;
  return (
    <View
      // ⚠️ HIDDEN FROM THE SCREEN READER: the row's own label already says the
      // product's name, and these two letters are that name abbreviated. A
      // reader that announced "PE" before "Pechuga" would be reading a picture.
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: side,
        height: side,
        borderRadius: scale.space / 2,
        borderWidth: 1,
        borderColor: PALETTE.linea,
        backgroundColor: PALETTE.accionSuave,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontSize: scale.bodySize, fontWeight: '700', color: PALETTE.tinta }}>
        {text}
      </Text>
    </View>
  );
}

/**
 * One line between two rows, and never under the last one.
 *
 * ⚠️ A BORDER AND NOT A ONE-PIXEL BOX, which is `R6` and not taste: a `height`
 * is a size a person looks at, so the gate refuses a literal one — and it is
 * right to, because `1` here would be the one measurement on this screen that
 * *Letra grande* could not change. A hairline border is what every other file
 * in this app draws a separator with.
 */
function Separador() {
  return <View style={{ borderBottomWidth: 1, borderBottomColor: PALETTE.linea }} />;
}

/**
 * The three things an empty list can mean, and they are three different facts.
 *
 * ⚠️⚠️ *"THIS SHOP HAS NO PRODUCTS"* AND *"NOTHING MATCHES WHAT YOU TYPED"*
 * MUST NOT SHARE A SENTENCE. A shopkeeper with a hundred products who mistypes
 * a name would otherwise be told her catalog is empty — and she is the person
 * C8.2 describes, whose catalog is deliberately incomplete and who is being
 * encouraged to add to it. ⚠️ And the read being still out is a third state:
 * a list that says "no products" for the second before the rows land is a
 * screen that lies on every cold open, on a connection this shop loses.
 */
function Vacio({ loading, typed }: { loading: boolean; typed: string }) {
  const { scale } = useDensity();
  // ⚠️ THE CHOICE IS `emptyLineKey`'s AND THE SENTENCE IS `ES`'s. This component
  // holds neither — `R3` and `R4`, and it is what lets
  // `app/test/api-catalog.test.ts` read a decision that would otherwise live in
  // a ternary no instrument here can see.
  const line = ES.catalog[emptyLineKey(loading, typed)];
  return (
    <View style={{ padding: scale.space * 2, alignItems: 'center' }}>
      <Text style={{ fontSize: scale.bodySize, color: PALETTE.tintaApagada, textAlign: 'center' }}>
        {line}
      </Text>
    </View>
  );
}
