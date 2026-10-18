import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { FlatList, Keyboard, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCatalog, useMyRole } from '@/api/hooks';
import { catalogLine, type CatalogEntry } from '@/api/catalog';
import { canWriteCatalog, catalogRows, type CatalogRow } from '@/api/catalogWrite';
import { aislesOf, inAisle, type Aisle } from '@/api/productPage';
import { deviceStore, readKey, writeKey } from '@/lib/store';
import { ES } from '@/strings';
import { useDensity } from '@/theme/DensityProvider';
import { PALETTE } from '@/theme/palette';
import { TITULO } from '@/theme/letra';
import { Buscador } from '@/ui/Buscador';
import { Destello } from '@/ui/Destello';
import { Separador } from '@/ui/Separador';
import { Vacio } from '@/ui/Vacio';

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

/** ⚠️ `8g`: list or mosaic, remembered by THIS phone — a way of looking, not the shop's. */
const VISTA_KEY = 'tienda.productos.vista';
type Vista = 'lista' | 'mosaico';
/** A row, or the mosaic's empty half after an odd last card. */
type Celda = CatalogRow | { readonly kind: 'hueco' };
const HUECO: Celda = { kind: 'hueco' };

export default function Productos() {
  const { scale } = useDensity();
  const insets = useSafeAreaInsets();

  // ⚠️ THE TYPED TEXT LIVES HERE AND THE FILTERING DOES NOT. `useCatalog` takes
  // the string and returns the rows that match, so this component holds a
  // keystroke and never an opinion about what it means.
  const [typed, setTyped] = useState('');
  const { loading, entries, failed } = useCatalog(typed);
  const mayCreate = canWriteCatalog(useMyRole());

  // ⚠️⚠️ `8g`, OPTION D — THE AISLES ACROSS THE TOP (the owner's ruling of
  // 2026-10-17). An aisle is a FAMILY, read off the WHOLE catalog rather than
  // the searched one, so typing never makes an aisle vanish from the row.
  const everything = useCatalog('').entries;
  const aisles = aislesOf(everything);
  const [vista, setVista] = useState<Vista>(() => (readKey(deviceStore(), VISTA_KEY) === 'mosaico' ? 'mosaico' : 'lista'));
  function verComo(next: Vista) {
    setVista(next);
    writeKey(deviceStore(), VISTA_KEY, next);
  }

  // ⚠️ THE PRODUCT JUST CREATED ARRIVES AS A ROUTE PARAMETER, not as state this
  // screen kept: it was unmounted-or-not while the form was open, and a variable
  // here would be empty on the path where the form replaced it.
  const { nuevo, pasillo } = useLocalSearchParams<{ nuevo?: string; pasillo?: string }>();
  // ⚠️ *Ver los 126* on a product's page comes back here with its aisle chosen.
  const [aisle, setAisle] = useState<string | null>(pasillo ?? null);
  useEffect(() => {
    if (pasillo !== undefined) setAisle(pasillo);
  }, [pasillo]);

  // ⚠️⚠️ THERE IS NO BANNER ON THIS SCREEN, AND ITS ABSENCE IS A RULING — 2026-09-23,
  // the same day it was added: *"«Una familia de productos debe tener la misma unidad
  // de medida» is showing at the top of the catalog, don't know why, let's get rid of
  // it."* ⚠️ **It appeared when nothing had been released**, and the version that was
  // removed had a defect that guarantees that whatever else was wrong: the dismissal
  // was state re-set to `true` on every arrival, so it never stuck — and the `aviso`
  // parameter could outlive the create that set it. **The banner now lives only on
  // the form, for one second, where the thing it describes actually happens.**
  // ⚠️ A future session adding it back inherits both problems; `5f`'s confirmation
  // animation is the place that question reopens, not this screen.

  // ⚠️⚠️ THE CREATE ROW STILL NEEDS THE WHOLE SHOP TO HAVE NOTHING — the
  // owner's anti-duplicate rule of 2026-09-23. So a search that finds nothing in
  // the chosen aisle but something in another shows THOSE, never *Crear*: a
  // product filed elsewhere is exactly the partial duplicate the rule exists for.
  const inside = inAisle(entries, aisle);
  const shown = inside.length > 0 || typed.trim() === '' ? inside : entries;
  const rows = catalogRows(shown, typed, mayCreate);
  const mosaic = vista === 'mosaico' && rows[0]?.kind !== 'create';
  // ⚠️ AN ODD LAST CARD WOULD STRETCH ACROSS THE ROW, so the mosaic is padded
  // with one empty half — seen on the emulator, 2026-10-17.
  const cells: readonly Celda[] = mosaic && rows.length % 2 === 1 ? [...rows, HUECO] : rows;
  const list = useRef<FlatList<Celda>>(null);
  // ⚠️ THE SEARCH BOX ITSELF, because dismissing the keyboard is not the same as
  // giving up focus — see the effect below.
  const box = useRef<TextInput>(null);

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
    // ⚠️ AND NO AISLE: a product just created must come into sight, whatever
    // aisle the list was showing when he went to create it.
    setAisle(null);
    // ⚠️⚠️ THE BOX IS BLURRED AND NOT ONLY THE KEYBOARD DISMISSED, AND THAT IS THE
    // FIX FOR *"the keyboard is not hidding when redirecting to the Product
    // catalog"*. The cause was not the dismissal — it was that **this screen's search
    // box never lost focus.** He types a name here, taps the create row, and THIS
    // COMPONENT STAYS MOUNTED under the pushed form with its `TextInput` still the
    // focused one; when `dismissTo` pops back, iOS restores the keyboard for it,
    // after the form's `Keyboard.dismiss()` has already run. **Dismissing a keyboard
    // whose input is still focused is a keyboard that comes back.**
    box.current?.blur();
    Keyboard.dismiss();
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
    list.current?.scrollToIndex({ index: mosaic ? Math.floor(at / 2) : at, viewPosition: 0.5, animated: true });
  }, [nuevo, typed, at, mosaic]);

  return (
    <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
      <Banda vista={vista} onVista={verComo} />
      <Buscador value={typed} onChange={setTyped} box={box} placeholder={ES.catalog.search} />
      <Pasillos aisles={aisles} chosen={aisle} onChoose={setAisle} />
      {/* `9d`: the starter catalog's second door — the first is onboarding. Drawn for
          whoever may write the catalog, which is who `import_catalog` admits. */}
      {mayCreate && (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/catalogo')}
          style={{
            minHeight: scale.tapTarget,
            justifyContent: 'center',
            paddingHorizontal: scale.space,
          }}
        >
          <Text style={{ fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.accion }}>
            {ES.starter.entry}
          </Text>
        </Pressable>
      )}

      <FlatList
        ref={list}
        // ⚠️ A `FlatList` AND NOT A `ScrollView`, AND IT IS A PERFORMANCE
        // DECISION RATHER THAN A HABIT. C8.3 puts ~100 products in the pilot
        // catalog and C1.1 puts two LOW-END ANDROIDS among its four phones; a
        // ScrollView mounts every row at once, which is the scroll that stutters
        // on exactly those two devices and on nobody's development machine.
        // ⚠️ A NEW KEY PER SHAPE: `numColumns` cannot change on a mounted list.
        key={mosaic ? 'mosaico' : 'lista'}
        numColumns={mosaic ? 2 : 1}
        data={cells}
        keyExtractor={(row) => (row.kind === 'create' ? 'crear' : row.kind === 'hueco' ? 'hueco' : row.entry.id)}
        renderItem={({ item }) =>
          item.kind === 'hueco' ? (
            <View style={{ flex: 1 }} />
          ) : item.kind === 'create' ? (
            <Crear name={item.name} familyId={aisle} />
          ) : mosaic ? (
            <Tarjeta entry={item.entry} nuevo={item.entry.id === nuevo} />
          ) : (
            <Fila entry={item.entry} nuevo={item.entry.id === nuevo} showAisle={aisle === null || inside.length === 0} />
          )
        }
        // ⚠️ A SEPARATOR RATHER THAN A BORDER ON EVERY ROW: one line between two
        // rows, never a line under the last one. The mosaic's cards carry their own.
        ItemSeparatorComponent={mosaic ? null : Separador}
        columnWrapperStyle={mosaic ? { gap: scale.rowGap, paddingHorizontal: scale.space } : undefined}
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
          paddingTop: mosaic ? scale.rowGap : undefined,
          gap: mosaic ? scale.rowGap : undefined,
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
function Banda({ vista, onVista }: { vista: Vista; onVista: (next: Vista) => void }) {
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
          ...TITULO,
          color: PALETTE.tinta,
        }}
      >
        {ES.catalog.title}
      </Text>

      {/* ⚠️ `8g`: *"list and mosaic switch"* — two glyphs, each with its word
          for a screen reader (C12.1's icon-and-word rule is met by the label). */}
      <View style={{ flexDirection: 'row', borderRadius: scale.space / 2, borderWidth: 1, borderColor: PALETTE.linea, overflow: 'hidden' }}>
        {(['lista', 'mosaico'] as const).map((one) => (
          <Pressable
            key={one}
            accessibilityRole="button"
            accessibilityLabel={one === 'lista' ? ES.products.asList : ES.products.asMosaic}
            accessibilityState={{ selected: vista === one }}
            onPress={() => onVista(one)}
            style={{
              width: scale.tapTarget,
              height: scale.tapTarget * 0.8,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: vista === one ? PALETTE.accion : PALETTE.superficie,
            }}
          >
            <MaterialCommunityIcons
              name={one === 'lista' ? 'view-list' : 'view-grid'}
              size={scale.iconSize}
              color={vista === one ? PALETTE.superficie : PALETTE.tintaApagada}
            />
          </Pressable>
        ))}
      </View>

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
function Fila({ entry, nuevo, showAisle }: { entry: CatalogEntry; nuevo: boolean; showAisle: boolean }) {
  const { scale } = useDensity();

  // ⚠️⚠️ THE BLINK IS `@/ui/Destello`'s SINCE `6b` AND WAS TWENTY LINES HERE
  // BEFORE IT. Every decision in it is still `@/theme/pulse`'s, where
  // `app/test/pulse.test.ts` reads them (`R3`); what moved is the `Animated` call,
  // when `proveedores.tsx` became the second screen to need it (`R14`).

  return (
    <Destello on={nuevo}>
    <Pressable
      // ⚠️ THE WHOLE ROW IS ONE THING TO A SCREEN READER, in the order a person
      // reads it: the product, then the family it belongs to, then what it
      // costs. Three separate labels would be three swipes per product.
      accessible
      accessibilityRole="button"
      accessibilityLabel={[entry.name, entry.familyName, entry.price]
        .filter((part) => part !== '')
        .join('. ')}
      onPress={() => router.push({ pathname: '/ficha/[id]', params: { id: entry.id } })}
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
        {/* ⚠️ `8g`: the aisle under the name only under *Todo* — inside an aisle
            it would say the same word on every row. */}
        {entry.familyName === '' || !showAisle ? null : (
          <Text
            numberOfLines={1}
            style={{ fontSize: scale.smallSize, color: PALETTE.tintaApagada }}
          >
            {entry.familyName}
          </Text>
        )}
      </View>

      {/* ⚠️⚠️ THE PRICE IS `tinta` AND THE DASH IS STILL NOT AMBER, AND AS OF
          `5e-iii-b` THAT IS A DECISION THIS SCREEN MADE AGAIN RATHER THAN ONE IT
          INHERITED. `atencion`'s one job is C3.17: a row whose missing price
          BLOCKS a sale, where the fix is one tap away. ⚠️ `Editar` now exists —
          but it is on LA FAMILIA, two taps from here, and nothing on this screen
          sets a price. ⚠️⚠️ The reason that matters is C8.2: the owner seeds this
          shop's catalog DELIBERATELY SHORT, so a flat list of ~100 products would
          open amber on most of its rows for the pilot's first week. **An alarm on
          a hundred rows is the alarm nobody can silence**, which is the argument
          this comment has carried since `5d-ii` and the one thing `Editar`
          landing did not change. La Familia is where the dash goes amber, for a
          manager, beside the control that answers it. */}
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
    </Destello>
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
function Crear({ name, familyId }: { name: string; familyId: string | null }) {
  const { scale } = useDensity();
  return (
    <Pressable
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${ES.catalog.create.row}. ${name}`}
      onPress={() => {
        // ⚠️⚠️ THE KEYBOARD GOES BEFORE THE FORM ARRIVES, AND THIS IS THE CAUSE-SIDE
        // HALF OF THE FIX. This screen stays mounted under the pushed form; leaving
        // its search box focused is what brings the keyboard back when the form pops
        // off again, however carefully the form dismisses it on the way out.
        Keyboard.dismiss();
        // ⚠️ `8g`: CREATED IN THE AISLE HE IS LOOKING AT, when he is looking at one.
        router.push({
          pathname: '/producto/nuevo',
          params: familyId === null ? { nombre: name } : { nombre: name, familia: familyId },
        });
      }}
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
          style={{ fontSize: scale.smallSize, fontWeight: '600', color: PALETTE.accion }}
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
 * ⚠️ `8g`, OPTION D: THE AISLES ACROSS THE TOP — *Todo* first, then every family
 * the shop sells in, each with its picture (its two letters until `8g`'s second
 * part), and one tap filters the list below. Chosen again, *Todo*.
 */
function Pasillos({
  aisles,
  chosen,
  onChoose,
}: {
  aisles: readonly Aisle[];
  chosen: string | null;
  onChoose: (familyId: string | null) => void;
}) {
  const { scale } = useDensity();
  if (aisles.length < 2) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      // ⚠️ NEITHER GROW NOR SHRINK: a ScrollView's own style shrinks, and the list
      // under it squeezed the aisles' names away (seen on the emulator, 2026-10-17).
      style={{ flexGrow: 0, flexShrink: 0 }}
      contentContainerStyle={{ gap: scale.rowGap, paddingHorizontal: scale.space, paddingBottom: scale.rowGap }}
    >
      <Pasillo name={ES.products.all} initials="" on={chosen === null} onPress={() => onChoose(null)} />
      {aisles.map((one) => (
        <Pasillo
          key={one.familyId}
          name={one.name}
          initials={one.initials}
          on={chosen === one.familyId}
          onPress={() => onChoose(chosen === one.familyId ? null : one.familyId)}
        />
      ))}
    </ScrollView>
  );
}

function Pasillo({ name, initials, on, onPress }: { name: string; initials: string; on: boolean; onPress: () => void }) {
  const { scale } = useDensity();
  const side = scale.tapTarget * 1.25;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={name}
      accessibilityState={{ selected: on }}
      onPress={onPress}
      style={{ width: side + scale.rowGap, alignItems: 'center', gap: scale.rowGap / 3 }}
    >
      <View
        style={{
          width: side,
          height: side,
          borderRadius: scale.space,
          borderWidth: on ? 3 : 1,
          borderColor: on ? PALETTE.accion : PALETTE.linea,
          backgroundColor: initials === '' ? PALETTE.superficie : PALETTE.accionSuave,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {initials === '' ? (
          <MaterialCommunityIcons name="view-grid-outline" size={scale.iconSize} color={PALETTE.tintaApagada} />
        ) : (
          <Text style={{ fontSize: scale.bodySize, fontWeight: '700', color: PALETTE.tinta }}>{initials}</Text>
        )}
      </View>
      <Text
        numberOfLines={2}
        style={{
          fontSize: scale.smallSize * 0.9,
          textAlign: 'center',
          fontWeight: on ? '800' : '600',
          color: on ? PALETTE.accion : PALETTE.tinta,
        }}
      >
        {name}
      </Text>
    </Pressable>
  );
}

/**
 * ⚠️ `8g`: ONE PRODUCT IN THE MOSAIC — the picture large (its two letters until
 * the photos), the name and the price; a tap opens its page, as a row does.
 */
function Tarjeta({ entry, nuevo }: { entry: CatalogEntry; nuevo: boolean }) {
  const { scale } = useDensity();
  return (
    <View style={{ flex: 1 }}>
      <Destello on={nuevo}>
        <Pressable
          accessible
          accessibilityRole="button"
          accessibilityLabel={[entry.name, entry.price].filter((part) => part !== '').join('. ')}
          onPress={() => router.push({ pathname: '/ficha/[id]', params: { id: entry.id } })}
          style={{
            borderRadius: scale.space,
            borderWidth: 1,
            borderColor: PALETTE.linea,
            backgroundColor: PALETTE.superficie,
            overflow: 'hidden',
          }}
        >
          <View style={{ height: scale.tapTarget * 2.4, alignItems: 'center', justifyContent: 'center', backgroundColor: PALETTE.accionSuave }}>
            <Text style={{ fontSize: scale.titleSize * 1.4, fontWeight: '700', color: PALETTE.tinta }}>{entry.initials}</Text>
          </View>
          <View style={{ padding: scale.rowGap, gap: scale.rowGap / 4 }}>
            <Text numberOfLines={2} style={{ fontSize: scale.smallSize, fontWeight: '600', color: PALETTE.tinta }}>
              {entry.name}
            </Text>
            <Text style={{ fontSize: scale.bodySize, fontWeight: '700', color: entry.centavos === null ? PALETTE.tintaApagada : PALETTE.tinta }}>
              {entry.price}
            </Text>
          </View>
        </Pressable>
      </Destello>
    </View>
  );
}
