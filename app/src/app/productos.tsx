import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, FlatList, Keyboard, Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCatalog, useMyRole } from '@/api/hooks';
import { catalogLine, type CatalogEntry } from '@/api/catalog';
import { avisoLine, canWriteCatalog, catalogRows, type CatalogRow } from '@/api/catalogWrite';
import { pulseSequence } from '@/theme/pulse';
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
// ⚠️⚠️ THE SEARCH IS THE WAY A PRODUCT GETS CREATED, AND THERE IS NO `Agregar`
// BUTTON — ruled by the owner on 2026-09-23, after he held the version that had
// one. He types a name; while anything matches he is looking at what the shop
// ALREADY sells; and only when nothing matches does the typed name become a row
// with *Crear Nuevo Producto* under it. ⚠️⚠️ **THE POINT IS FEWER PARTIAL
// DUPLICATES, NOT FEWER BUTTONS** — in his words, *"this allows us to discard
// partially duplicate product creation"*. A button in the banda is reachable
// without ever reading the list; this door can only be reached THROUGH the list.
// ⚠️ It is also closer to C8.12 than the button was: that constraint says *"From
// Productos → type the name"*, which is now literally the gesture.
//
// ⚠️ THE ROWS ARE `catalogRows`' AND THE FENCE IS IN IT (`R3`). A cashier is
// handed a list with no create row: all three catalog INSERT policies are
// `has_role(…, 'manager')` in `0002`, the refusal is a bare `42501` with no
// sentence of its own, and plainly absent beats looking live and refusing
// silently — the shape [[shift-cover-is-a-reassignment]] records.
//
// ⚠️⚠️ AND A PRODUCT JUST CREATED COMES BACK INTO SIGHT AND BLINKS. The form
// pops back here with `?nuevo=<variant id>`; this screen scrolls that row into
// view and pulses its OPACITY a few times. ⚠️ The owner asked for *"an
// intermitent animation… don't [add] any other indicator like a line or
// anything"*, so there is no rule, no badge and no colour on that row — and the
// list stays in the database's alphabetical order, which is what makes the scroll
// necessary in the first place. ⚠️ §2.11's motion rule allows `transform` and
// `opacity` only (C1.1 puts two low-end Androids in the pilot); this is opacity,
// on the native driver.
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
  const { loading, entries, failed } = useCatalog(typed);
  const mayCreate = canWriteCatalog(useMyRole());

  // ⚠️ THE PRODUCT JUST CREATED ARRIVES AS A ROUTE PARAMETER, not as state this
  // screen kept: it was unmounted-or-not while the form was open, and a variable
  // here would be empty on the path where the form replaced it.
  const { nuevo, aviso } = useLocalSearchParams<{ nuevo?: string; aviso?: string }>();

  // ⚠️⚠️ THE RELEASED-FAMILY BANNER PERSISTS HERE, WHICH IS THE WHOLE POINT OF
  // CARRYING IT — ruled 2026-09-23: *"show the banner for a second in the form
  // screen but it should persist in the catalog screen once we go back there."* The
  // form's copy is a one-second glimpse on a screen that is about to disappear;
  // this one has nothing about to navigate away from it, so it does not fade and
  // nothing has to be caught. `avisoLine` chooses the sentence (`R3`, `R4`).
  const [avisoShown, setAvisoShown] = useState(true);
  const line = avisoShown ? avisoLine(aviso) : null;

  const rows = catalogRows(entries, typed, mayCreate);
  const list = useRef<FlatList<CatalogRow>>(null);

  // ⚠️⚠️ THE SEARCH BOX IS CLEARED FIRST, AND WITHOUT THIS THE WHOLE FEATURE IS
  // POINTLESS. `router.dismissTo` pops back to the Productos ALREADY IN THE STACK
  // rather than mounting a new one, so `typed` survives — and the word he typed to
  // reach the create row is a word the product he just made MATCHES. He would land
  // on a filtered list of exactly one row, where "sorted and in sight" and the
  // scroll both mean nothing. The owner asked for the product *"in the catalog
  // sorted and in sight"*, which is the whole catalog with the row found in it.
  useEffect(() => {
    if (nuevo === undefined) return;
    setTyped('');
    // ⚠️ AND THE KEYBOARD GOES — ruled 2026-09-23. The form dismisses it on its way
    // out; this is the belt to that braces, because a keyboard still up covers the
    // bottom of the list and the row that blinks may be under it.
    Keyboard.dismiss();
    setAvisoShown(true);
  }, [nuevo]);

  // ⚠️⚠️ THE SCROLL WAITS FOR THE ROW TO EXIST, AND THAT IS NOT A DETAIL. The
  // create invalidates `CATALOG_KEY`, so on the frame this screen comes back the
  // new product is usually NOT in `entries` yet — a `scrollToIndex` fired then
  // throws on an out-of-range index. This runs again on every render until the row
  // is there, and then once. ⚠️ It also waits for the box to be EMPTY, or it would
  // scroll to the row's position in the filtered list and then the list would
  // change underneath it.
  const scrolled = useRef<string | null>(null);
  const at =
    nuevo === undefined
      ? -1
      : rows.findIndex((row) => row.kind === 'product' && row.entry.id === nuevo);
  useEffect(() => {
    if (nuevo === undefined || typed !== '' || at < 0 || scrolled.current === nuevo) return;
    scrolled.current = nuevo;
    list.current?.scrollToIndex({ index: at, viewPosition: 0.5, animated: true });
  }, [nuevo, typed, at]);

  return (
    <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
      <Banda />
      {line === null ? null : <Aviso line={line} onDismiss={() => setAvisoShown(false)} />}
      <Buscador value={typed} onChange={setTyped} />

      <FlatList
        ref={list}
        // ⚠️ A `FlatList` AND NOT A `ScrollView`, AND IT IS A PERFORMANCE
        // DECISION RATHER THAN A HABIT. C8.3 puts ~100 products in the pilot
        // catalog and C1.1 puts two LOW-END ANDROIDS among its four phones; a
        // ScrollView mounts every row at once, which is the scroll that stutters
        // on exactly those two devices and on nobody's development machine.
        data={rows}
        keyExtractor={(row) => (row.kind === 'create' ? 'crear' : row.entry.id)}
        renderItem={({ item }) =>
          item.kind === 'create' ? (
            <Crear name={item.name} />
          ) : (
            <Fila entry={item.entry} nuevo={item.entry.id === nuevo} />
          )
        }
        // ⚠️ A SEPARATOR RATHER THAN A BORDER ON EVERY ROW: one line between two
        // rows, never a line under the last one.
        ItemSeparatorComponent={Separador}
        ListEmptyComponent={<Vacio line={catalogLine(loading, typed, failed)} />}
        // ⚠️ THE ROWS ARE A FIXED HEIGHT TO THE VIRTUALISER'S EYE, WHICH IS WHAT
        // MAKES `scrollToIndex` REACH A ROW IT HAS NOT DRAWN YET. Without it a
        // jump past the render window fails; `onScrollToIndexFailed` is the belt
        // to that braces, because a row two screens down is exactly the case the
        // owner asked for and a thrown error there is a blank screen.
        onScrollToIndexFailed={({ index }) => {
          list.current?.scrollToOffset({ offset: index * scale.rowHeight, animated: true });
        }}
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
      <Text
        numberOfLines={1}
        style={{
          flex: 1,
          fontSize: scale.titleSize,
          fontWeight: '700',
          color: PALETTE.tinta,
        }}
      >
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
          // ⚠️⚠️ *Listo* AND NOT *Buscar* — ruled 2026-09-23. This search is LIVE: it
          // filters rows the phone already holds on every keystroke, so a *Buscar*
          // key promises an action that has already happened. The one thing a person
          // actually wants from that key here is the keyboard out of the way, and
          // now it says so.
          returnKeyType="done"
          onSubmitEditing={() => Keyboard.dismiss()}
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
function Fila({ entry, nuevo }: { entry: CatalogEntry; nuevo: boolean }) {
  const { scale } = useDensity();

  // ⚠️⚠️ THE BLINK, AND EVERY DECISION IN IT IS `@/theme/pulse`'s RATHER THAN
  // THIS FILE'S (`R3`). How many times, how far down, how long, and that it rests
  // at full opacity are all values `app/test/pulse.test.ts` reads; what is here is
  // the `Animated` call, which no suite in this repository may load.
  //
  // ⚠️ `useNativeDriver` IS TRUE AND THAT IS §2.11's MOTION RULE, not a tuning
  // knob: opacity on the native driver runs on the compositor, and C1.1 puts two
  // low-end Androids among the pilot's phones. A JS-driven opacity would stutter
  // on exactly those two and on nobody's development machine.
  const fade = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!nuevo) return;
    // ⚠️ IT IS RESET BEFORE IT RUNS. The row can be recycled by the virtualiser
    // mid-blink, and a value left at `PULSE_DIM` would leave some OTHER product
    // looking dimmed for no reason.
    fade.setValue(1);
    const blink = Animated.sequence(
      pulseSequence().map((step) =>
        Animated.timing(fade, { ...step, useNativeDriver: true }),
      ),
    );
    blink.start();
    return () => {
      blink.stop();
      fade.setValue(1);
    };
  }, [nuevo, fade]);

  return (
    <Animated.View style={{ opacity: fade }}>
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
    </Animated.View>
  );
}

/**
 * The released-family banner, and it is the copy that is actually READ.
 *
 * ⚠️⚠️ IT DOES NOT FADE, AND THAT ABSENCE IS THE RULING. The form flashes the same
 * sentence for a second and then saves and leaves; the owner ruled that the readable
 * copy belongs here, where nothing is about to navigate away from it. So there is no
 * `Animated` value in this component and no timer — and `@/theme/pulse` deliberately
 * exports no timing for it, with an equality over its surface asserting so.
 *
 * ⚠️ IT HAS A WAY OUT, because *persists* cannot mean *for ever* on the one screen a
 * shopkeeper keeps open. **A word and not a cross** (C12.1), and it is the only
 * control on it; it also clears on the next create.
 *
 * ⚠️ `atencionSuave` AND `atencion`: nothing failed and nothing was refused — one
 * field moved under his thumb — so `error` would be a lie about it and
 * `accionSuave` would claim it is tappable in the way an action is. ⚠️ The state is
 * carried by the SENTENCE and not by the colour, which is the rule direction C left
 * behind.
 */
function Aviso({ line, onDismiss }: { line: string; onDismiss: () => void }) {
  const { scale } = useDensity();
  return (
    <View
      accessible
      accessibilityRole="alert"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale.rowGap,
        paddingHorizontal: scale.space,
        paddingVertical: scale.rowGap,
        borderBottomWidth: 1,
        borderBottomColor: PALETTE.atencion,
        backgroundColor: PALETTE.atencionSuave,
      }}
    >
      <Text style={{ flex: 1, fontSize: scale.bodySize, color: PALETTE.tinta }}>{line}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={onDismiss}
        style={{
          minHeight: scale.tapTarget,
          justifyContent: 'center',
          paddingHorizontal: scale.rowGap,
        }}
      >
        <Text style={{ fontSize: scale.bodySize, fontWeight: '700', color: PALETTE.atencion }}>
          {ES.catalog.avisoDismiss}
        </Text>
      </Pressable>
    </View>
  );
}

/**
 * The door to making a product, and it is a ROW rather than a button — the
 * owner's ruling of 2026-09-23.
 *
 * ⚠️⚠️ IT ONLY EXISTS WHEN THE SEARCH FOUND NOTHING, AND `catalogRows` IS WHAT
 * DECIDES THAT (`R3`). While anything matched, he was reading what the shop
 * already sells; this appears once that list has nothing left to offer him, which
 * is the whole of *"discard partially duplicate product creation"*.
 *
 * ⚠️ IT WEARS THE PRODUCT ROW'S SHAPE — the same initials tile, the same height,
 * the typed name where a product's name goes — because that is the claim: *this
 * is what the product would be.* The legend underneath is what keeps it from
 * reading as a product the shop already has.
 *
 * ⚠️ `accionSuave` ON THE TILE AND `accion` ON THE LEGEND: the palette's one job
 * for those two roles is *this is tappable, this acts*, which is exactly true
 * here and deliberately NOT true of the three dead buttons on La Familia.
 *
 * ⚠️ NO ICON WITHOUT A WORD (C12.1). The plus glyph sits beside *Crear Nuevo
 * Producto*, never alone.
 */
function Crear({ name }: { name: string }) {
  const { scale } = useDensity();
  return (
    <Pressable
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${ES.catalog.create.row}. ${name}`}
      onPress={() =>
        router.push({ pathname: '/producto/nuevo', params: { nombre: name } })
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
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{
          width: scale.tapTarget,
          height: scale.tapTarget,
          borderRadius: scale.space / 2,
          borderWidth: 1,
          borderColor: PALETTE.accion,
          backgroundColor: PALETTE.accionSuave,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <MaterialCommunityIcons name="plus" size={scale.iconSize} color={PALETTE.accion} />
      </View>

      <View style={{ flex: 1, gap: scale.rowGap / 4 }}>
        <Text
          numberOfLines={1}
          style={{ fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.tinta }}
        >
          {name}
        </Text>
        <Text
          numberOfLines={1}
          style={{ fontSize: scale.bodySize * 0.85, fontWeight: '600', color: PALETTE.accion }}
        >
          {ES.catalog.create.row}
        </Text>
      </View>
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
 * ⚠️⚠️ AND AS OF 2026-09-22 THERE ARE FOUR OF THEM, BECAUSE THE OWNER FOUND THE
 * MISSING ONE ON HIS PHONE: a read that FAILED was indistinguishable from one
 * still in flight — `loading` is `data === undefined` and so is an error — so
 * this screen sat on *Cargando productos…* for ever against a project whose
 * schema had never been deployed. **A failed read now says so**, and it says it
 * even while TanStack retries.
 *
 * ⚠️⚠️ *"THIS SHOP HAS NO PRODUCTS"* AND *"NOTHING MATCHES WHAT YOU TYPED"*
 * MUST NOT SHARE A SENTENCE. A shopkeeper with a hundred products who mistypes
 * a name would otherwise be told her catalog is empty — and she is the person
 * C8.2 describes, whose catalog is deliberately incomplete and who is being
 * encouraged to add to it. ⚠️ And the read being still out is a third state:
 * a list that says "no products" for the second before the rows land is a
 * screen that lies on every cold open, on a connection this shop loses.
 */
function Vacio({ line }: { line: string }) {
  const { scale } = useDensity();
  // ⚠️ THE CHOICE IS `catalogLine`'s AND THE SENTENCE IS `ES`'s. This component
  // is handed the finished line and holds neither — `R3` and `R4`, and it is
  // what lets `app/test/api-catalog.test.ts` read a decision that would
  // otherwise live in a ternary no instrument here can see.
  //
  // ⚠️ IT TAKES A SENTENCE RATHER THAN THE FAILURE KEY, AND `R12` IS WHY: a
  // route may not import `@/api/errors`, the module that decides what a failure
  // MEANS. The gate caught exactly that import here on 2026-09-22 and it was
  // right to — the fix is that no route names that type at all.
  return (
    <View style={{ padding: scale.space * 2, alignItems: 'center' }}>
      <Text style={{ fontSize: scale.bodySize, color: PALETTE.tintaApagada, textAlign: 'center' }}>
        {line}
      </Text>
    </View>
  );
}
