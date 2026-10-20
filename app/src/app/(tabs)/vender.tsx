import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { catalogLine, isoDay, priceCentavos, search, type CatalogEntry, type UnitFactors } from '@/api/catalog';
import { checkEdit, editLine, editPlan, editTouches, type EditIssue } from '@/api/catalogEdit';
import { canWriteCatalog } from '@/api/catalogWrite';
import {
  useCatalog,
  useEditProduct,
  useMagnitude,
  useMyRole,
  useUnitFactors,
  useWorkspace,
} from '@/api/hooks';
import { magnitudeNote, outsized, type Typical, type Typicals } from '@/api/magnitude';
import { reviewOf, stepOf, type Basket, type Review, type ReviewRow } from '@/cart/cart';
import { canCommit, commitOf, type Basketful } from '@/cart/commit';
import { sellGate } from '@/cart/gate';
import { useCart, useCartStore, useCorrects, useTyped } from '@/cart/store';
import { formatMXN } from '@/format/mxn';
import { commitToQueue } from '@/lib/commitRunner';
import { newWriteId, nowIso } from '@/lib/ids';
import { usePilotVisit } from '@/pilot/usePilotVisit';
import { correctingLine } from '@/api/corrections';
import { useOnline } from '@/offline/useOnline';
import { ES } from '@/strings';
import { useDensity } from '@/theme/DensityProvider';
import { PALETTE } from '@/theme/palette';
import { EMPTIED_BLOOM_MS, REFUSED_NOTE_MS } from '@/theme/pulse';
import { Buscador } from '@/ui/Buscador';
import { Cantidad } from '@/ui/Cantidad';
import { CierreCarrito } from '@/ui/CierreCarrito';
import { Hecho } from '@/ui/Hecho';
import { FIRST_SALE_KEY, firstTime } from '@/offline/ensenar';
import { deviceStore } from '@/lib/store';
import { HojaCarrito } from '@/ui/HojaCarrito';
import { PrecioRapido } from '@/ui/PrecioRapido';
import { Retrato } from '@/ui/Retrato';
import { Separador } from '@/ui/Separador';
import { TecladoListo } from '@/ui/TecladoListo';
import { TotalCarrito } from '@/ui/TotalCarrito';
import { Vacio } from '@/ui/Vacio';
import { Corrigiendo } from '@/ui/Corrigiendo';
import { VaciarCarrito } from '@/ui/VaciarCarrito';

// ============================================================================
// VENDER — the counter. Plan tasks `5f-ii` (the list, the row, the quantity
// control and the sticky bar) and `5f-iii-a` (the basket sheet), and the
// highest-traffic surface in this app.
//
// ⚠️⚠️ IT STILL COMMITS NOTHING AND WRITES NOTHING, AND THAT IS THE SPLIT
// RATHER THAN AN OMISSION. The slide-to-commit, the first call `queueWrite` has
// ever had and the sale's own confirmation are `5f-iii-b`. What is here is
// everything a shopkeeper touches BEFORE she decides the sale is a sale —
// including the review she decides it ON.
//
// ⚠️ SO C3.4's BAR CARRIES `Total` AND `Ver carrito` AND NO COMMIT CONTROL.
// §2.8 names three guards it calls *Error prevention*, *"none blocking"*:
// unit-aware input (`5f-ii`), **review before commit** (this task's sheet) and
// the magnitude warning (`5f.5`, gated on `5g`). The review is built before the
// thing it reviews, which is the order that split chose deliberately: a commit
// control with nothing in front of it, on the screen that takes a customer's
// money, is the one arrangement worth refusing.
//
// ⚠️ THE OWNER'S PHONE IS THE WHOLE INSTRUMENT (`R9`, §2.11). Every judgement
// left in this file is rendering, navigation or layout, and no check in this
// repository will ever say it is wrong. The half that IS checkable was
// deliberately pushed out: the arithmetic is `@/cart/cart` (`5f-i`) and what
// the quantity box reads is `@/cart/quantity`, both with suites under
// `app/test/`.
//
// ----------------------------------------------------------------------------
// ⚠️⚠️ THE SAME LIST AS PRODUCTOS, READ A SECOND TIME — NOT A SECOND LIST
// ----------------------------------------------------------------------------
// C3.1: *"there are no buy-only or sell-only subsets."* So this screen calls
// `useCatalog` and `search` — `5d-i`'s, the same ones `productos.tsx` draws —
// and holds no opinion about which products may be sold. ⚠️ **The search never
// touches the network**: it filters rows TanStack Query already holds, which is
// what makes this screen work at 11am in a shop with no signal (§2.6, C10.3).
//
// ⚠️⚠️ AND THE BASKET IS PRICED AGAINST THE WHOLE CATALOG RATHER THAN THE
// FILTERED ONE, which is the one thing that would have been easy to get wrong
// here. `useCatalog(typed)` returns the rows that MATCH; pricing a basket
// against those would make the `Total` fall every time she typed a different
// product's name, and rise again when she cleared the box. So this file reads
// the catalog unfiltered and narrows it for the LIST only.
//
// ----------------------------------------------------------------------------
// ⚠️⚠️ THE AMBER IS ON A ROW IN THE BASKET AND NOWHERE ELSE, AND THAT SETTLES
// AN ARGUMENT `5d-ii` AND `5f-ii` LOOKED LIKE THEY WERE HAVING
// ----------------------------------------------------------------------------
// §2.11 fences the `atención` colour to C3.17's unpriced row and gives it no
// second job. But `productos.tsx` refuses to paint its dash amber, and its
// reason is good: C8.2 has the owner seeding this shop's catalog DELIBERATELY
// SHORT, so a flat list of ~100 products would open amber on most of its rows
// for the pilot's first week — **an alarm on a hundred rows is the alarm nobody
// can silence.**
//
// ⚠️ BOTH ARE RIGHT, AND THE CONDITION IS WHAT SEPARATES THEM: a product with
// no price that nobody is selling is not a problem, and **the same product with
// a quantity on it is about to be sold for nothing.** That is one row at a
// time, it is exactly C3.17's *"the fix is one tap away"*, and it is silenced by
// the shopkeeper doing either of the two things she would do anyway. ⚠️ So the
// row goes amber the moment it becomes a line, and not before.
//
// ⚠️ AND NEVER BY COLOUR ALONE — `R11`, enforced by `docs/checks/conventions-
// gate.sh`: `ES.sell.noPrice` rides with the hue on the row and
// `ES.sell.someUnpriced` beside the total, because the users are old and the
// shop is bright.
//
// ⚠️⚠️ WHAT THE SCREEN DOES ABOUT IT IS DELIBERATELY NOT HERE. A purchase is
// BLOCKED on a missing price (C3.13) and a sale goes through LOUDLY (C3.14) —
// two different answers to one basket, owned by `5g` and `5h`, because this
// list is shared by both and must not pick one of them on their behalf.
//
// ----------------------------------------------------------------------------
// ⚠️ NO `...` AT ALL, AND THAT IS A RULING RATHER THAN A GAP
// ----------------------------------------------------------------------------
// C3.2 lists a quick-actions menu on the row. `5f-iv` — the price change behind
// it — was ruled OUT OF THE PILOT on 2026-09-24: *"Any money 'knock-off'
// happens in her head and is out of the scope of the app for now."* ⚠️ It is
// **absent and not drawn dead**, which is the opposite of `Costos` on La
// Familia: that button is dead because a shopkeeper had already SEEN it and an
// affordance that vanishes reads as the app shrinking. Nobody has ever seen a
// `...` here, so there is nothing to preserve — and a permanently dead button
// on the surface she opens four hundred times a day is furniture.
//
// ⚠️ THE INITIALS TILE IS ABSENT TOO, and for width rather than for a ruling.
// C3.2 does not list one, and the row here carries a `−`, a box and a `+` that
// Productos' row does not; C8.14's tile is what an un-pictured product wears in
// the CATALOG, where the row's whole job is to be recognised.
//
// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------
// ⚠️⚠️ THE KEYBOARD MUST NOT SIT ON TOP OF THE BOX BEING TYPED INTO
// ----------------------------------------------------------------------------
// Reported by the owner on 2026-09-24, on his own phone: *"the screen must
// adjust on top of the keypad for us to see what we're tipping, currently it can
// still sit behind the keypad."* ⚠️ **It is two problems and one of them is not
// obvious.** The first is the container: without a `KeyboardAvoidingView` the
// screen keeps its full height and the bottom of the list — and C3.4's sticky
// bar with it — goes under the keyboard. The second is that **shrinking the
// screen does not move the list**: a row that was near the bottom is simply
// outside the new viewport, and RN scrolls nothing into view on its own.
//
// ⚠️ SO THE FOCUSED ROW IS SCROLLED TO THE MIDDLE, AND IT WAITS FOR
// `keyboardDidShow` RATHER THAN FIRING ON FOCUS. Scrolling on focus centres the
// row in the OLD viewport and the resize then pushes it back down — which is
// the same bug with an animation on it. ⚠️ `onScrollToIndexFailed` is the belt
// to that brace: rows here are not a fixed height, so a jump past the render
// window has to fall back to an offset, the arrangement `productos.tsx` already
// uses for the same reason.
//
// ⚠️ `behavior` IS `padding` ON iOS AND NOTHING ON ANDROID, which is not a
// hedge: Expo sets `softwareKeyboardLayoutMode: "resize"`, so Android's window
// is already shortened by the system and a second adjustment double-counts it.
// C1.1 puts two Androids among the pilot's four phones.
//
// ⚠️ THE OFFSET IS THE TAB BAR'S OWN HEIGHT PLUS THE DEVICE INSET, because this
// screen is inside the tab navigator: without it the avoidance is short by
// exactly the bar and the box still clips.
//
// ⚠️⚠️ THE SEARCH BOX, THE STEPPER, THE SLIDE AND THE EMPTY STATES ARE NOW
// `src/ui/`'s — MOVED OUT BY `5g-ii`, AND THIS PARAGRAPH SAID THE OPPOSITE
// ----------------------------------------------------------------------------
// ~~A session that folds these into `src/ui/` before `5h` closes is taking that
// row's decision for it.~~ **That sentence was written here at `5f-ii` and
// `5g`'s sizing overruled it**, so it is corrected rather than left to disagree
// with the file it is now wrong about: two homes for one claim is the defect
// this repository has recorded nine of.
//
// ⚠️ THREE THINGS SETTLE IT AND ALL THREE POINT THE SAME WAY. `5h.5`'s row owns
// the CONVENTIONS and says `src/ui/` is built *"across `5d`–`5h`"*; the owner
// ruled that in those words on 2026-09-13; and ADR-035 §2.11 says the primitives
// should exist *"before step 6 rather than being extracted from Vender
// afterwards by someone who did not write it."* ⚠️ **`5g-ii`'s own row names the
// trigger**: Comprar is the THIRD drawing of a search box, and §2.8's *"three
// capture screens sharing one engine underneath"* is what makes that an
// extraction rather than a tidy-up.
//
// ⚠️ WHAT SURVIVES OF THE OLD PARAGRAPH IS THE OWNER'S REFUSAL IT CITED — *"ten
// primitives guessed at against screens nobody has drawn"* — and it is honoured:
// every one of the five that moved had been drawn TWO OR MORE TIMES first, two
// of them were byte-identical copies, and `Vacio`'s three copies had already
// drifted apart. **None was invented.**
// ============================================================================

/**
 * The bar carrying *Listo* above the quantity pad.
 *
 * ⚠️⚠️ ADDED 2026-09-25, AND VENDER HAD NO WAY OFF THE KEYPAD AT ALL UNTIL NOW.
 * The owner, on his own phone: *"The numerical Keypad isn't easy to hide when
 * you're done typing. Can we replace it with one that has the 'Hide' or 'Done'
 * control?"* ⚠️ **`keyboardType="decimal-pad"` DRAWS NO RETURN KEY ON EITHER
 * PLATFORM** — `nuevo.tsx` measured that — so the `returnKeyType="done"` this
 * screen has always carried was inert, and `onSubmitEditing` could never fire.
 * **The only exits were a tap elsewhere on the list or the keyboard's own
 * dismiss, and on the screen he opens four hundred times a day that is not an
 * exit.**
 *
 * ⚠️ IT SHIPPED FOR COMPRAR AND NOT FOR HERE, which is the half of `5g-ii` that
 * was wrong: `TecladoListo` was extracted into `src/ui/` that day and wired to
 * Comprar's two pads only. **A primitive built and not connected is the shape
 * this repository refuses by name.**
 *
 * ⚠️ A CONSTANT AND NOT A LITERAL AT TWO CALL SITES: `InputAccessoryView` matches
 * an input to a bar by STRING EQUALITY, so two spellings is a bar that renders
 * and never appears with nothing to say why.
 */
const PAD_ID = 'wera.sell.pad';

export default function Vender() {
  const { scale } = useDensity();
  const insets = useSafeAreaInsets();

  // ⚠️ THE CATALOG IS READ UNFILTERED AND NARROWED BELOW — see the header. The
  // empty string is `useCatalog`'s own default and is spelled out here because
  // the argument it is NOT being given is the point.
  const { loading, entries, failed, locationId } = useCatalog('');
  // ⚠️ `8g`'s round 3: an empty list with no catalog and no signal says *Se ve
  // cuando haya señal* rather than *Cargando productos…* for ever (`catalogLine`).
  const online = useOnline();
  const factors = useUnitFactors();
  // ⚠️⚠️ ADR-035 §2.8's THIRD GUARD, AND IT IS ONE READ FOR THE WHOLE SCREEN —
  // never one per row. See `@/api/magnitude`'s header for why this hook takes no
  // argument where `useCosts` takes a variant.
  const typicals = useMagnitude();
  const workspace = useWorkspace();

  const [typed, setTyped] = useState('');
  const box = useRef<TextInput>(null);
  const rows = search(entries, typed);

  // ⚠️ WHICH ROW IS BEING TYPED INTO, HELD IN A REF AND NOT IN STATE. It changes
  // on every focus and nothing renders differently for it; state here would
  // re-render a ~100-row list on the phone C1.1 puts two low-end Androids among.
  const list = useRef<FlatList<CatalogEntry>>(null);
  const editing = useRef<number | null>(null);

  // ⚠️⚠️ IT WAITS FOR THE KEYBOARD TO BE UP — see this file's header. Scrolling
  // on focus centres the row in a viewport that is about to shrink.
  useEffect(() => {
    const up = Keyboard.addListener('keyboardDidShow', () => {
      const at = editing.current;
      if (at === null || at < 0) return;
      list.current?.scrollToIndex({ index: at, viewPosition: 0.5, animated: true });
    });
    return () => up.remove();
  }, []);

  const cart = useCart('sell');
  // ⚠️ `8p`: the sale this basket re-keys, so it counts on that sale's day.
  const corrects = useCorrects('sell');
  // ⚠️ `8g`: while the cart is a correction, which document it is — the strip
  // and the *Vaciar* box say so (`@/ui/Corrigiendo`).
  const correcting = corrects === null ? null : ES.counter.cart.correctionWhat.sale;
  // ⚠️⚠️ `8g` (2026-10-20), *"Original prices"*: A CORRECTED SALE KEEPS THE PRICE
  // EACH LINE WAS RUNG UP AT. `Corregir` loads them as the cart's quotes
  // (`prefillOf`), and until now Vender never read them — the total and the sale
  // sent were today's shelf ($45 came back as $26). A product added to the
  // correction, or any ordinary sale, has no quote and is priced at the shelf.
  const quotes = useTyped('sell');
  const openShop = useCartStore((state) => state.openShop);

  // ⚠️⚠️ THE STORE IS POINTED AT A SHOP ONLY ONCE ONE IS KNOWN, AND THE GUARD IS
  // NOT DEFENSIVE — IT IS THE WHOLE POINT. `openShop(null)` on a store restored
  // from disk means *the shop changed*, and it drops the basket; `useWorkspace`
  // answers `null` while its read is in flight, which is every cold start. So
  // calling it unconditionally would empty a mid-sale basket on exactly the
  // launch §2.11 persisted it for.
  useEffect(() => {
    if (workspace !== null) openShop(workspace.id);
  }, [workspace, openShop]);

  // ⚠️ THE TOTAL IS WITHHELD RATHER THAN GUESSED WHILE THE SHOP IS UNKNOWN.
  // `basketOf` needs `prices_include_tax` to know whether the shelf price is
  // already gross (§2.5 rule 2), and `0001` defaults it TRUE — so a `?? true`
  // here would be right on every phone in the pilot and would understate IVA,
  // silently and in the ledger, for the first shop that answered no. That is
  // the identity `5f-i` refused to hard-code, and a screen is not the place to
  // reintroduce it.
  // ⚠️⚠️ ONE PASS OVER THE BASKET FEEDS BOTH THE BAR AND THE SHEET, AND §2.5
  // RULE 5 IS WHY — *"the displayed lines fail to sum to the displayed total on
  // the review screen."* `reviewOf` returns the rows AND the total those rows
  // sum to; a sheet that priced its own would be a second arithmetic over one
  // basket. See `@/cart/cart`, where `app/test/cart.test.ts` reads the identity.
  const review: Review | null =
    workspace === null ? null : reviewOf(cart, entries, 'sell', workspace.pricesIncludeTax, undefined, quotes);
  const basket: Basket | null = review === null ? null : review.basket;

  // ⚠️ THE SHEET'S OPEN STATE LIVES HERE AND NOT IN THE ROUTER, which is a
  // decision and is recorded as one. `ajustes` and `solicitudes` are `Stack`
  // modals because they are different PLACES; the basket is this place, zoomed —
  // it is priced against the catalog this screen has already read, its rows
  // carry the control the list behind them carries, and C3.5's own recovery is
  // *"two taps on the list behind the sheet"*. A route would re-read the
  // catalog, the unit factors and the workspace to show a subset of what is
  // already on screen.
  // ⚠️⚠️ THE PRICE SHEET, the owner's ruling of 2026-10-14: *"set price directly
  // from there without having to go back to the Productos screen."* A tap on a
  // row's price opens it, for the owner and a manager only — `price_list` is
  // theirs (2026-09-23) and a cashier is shown nothing to tap. It is a `Modal`
  // over this screen, so the sale, the basket and the scroll stay where they are.
  const mayPrice = canWriteCatalog(useMyRole());
  // ⚠️ `adding` SINCE `8g`: the sheet `+` opened on a product with no price,
  // whose saving also puts one in the basket — the owner's *"a product gets its
  // price the first time it is sold"*, 2026-10-15.
  const [pricing, setPricing] = useState<{ entry: CatalogEntry; adding: boolean } | null>(null);
  const openPricing = useCallback(
    (entry: CatalogEntry, adding: boolean) => setPricing({ entry, adding }),
    [],
  );
  const bump = useCartStore((state) => state.step);
  const priced = useCallback(() => {
    if (pricing === null || !pricing.adding) return;
    bump('sell', pricing.entry.id, stepOf(pricing.entry.priceUnit, factors), 1);
  }, [pricing, bump, factors]);
  // The cashier's note, by the product's name — see `Nota`.
  const [refused, setRefused] = useState<string | null>(null);
  const forgetRefused = useCallback(() => setRefused(null), []);

  const [cartOpen, setCartOpen] = useState(false);
  const closeCart = useCallback(() => setCartOpen(false), []);
  const openCart = useCallback(() => setCartOpen(true), []);

  // ⚠️⚠️ THE EMPTYING QUESTION LIVES ON THE SCREEN AND NOT IN THE SHEET, AND
  // THAT MOVED ON 2026-09-24 — *"Include Vaciar carrito in the closed Carrito as
  // well, with the confirmation message also displaying when tapped there."*
  // **So the same question is asked from two places**, and one state answering
  // both is what stops them from becoming two questions that drift apart.
  //
  // ⚠️ IT IS RENDERED IN WHICHEVER OF THE TWO IS ON SCREEN — inside the sheet's
  // `Modal` when the basket is open, over the screen when it is not. `cartOpen`
  // makes those mutually exclusive. **The alternative was a second `Modal` over
  // the first**, and nested modals on iOS animate against each other.
  const [asking, setAsking] = useState(false);
  const [emptied, setEmptied] = useState(false);
  const bloom = useRef(new Animated.Value(0)).current;

  // ⚠️⚠️ THE COMMIT — and this is the first write this app has ever put in the
  // queue. `5c`'s four children have been built entirely against fixtures.
  const clear = useCartStore((state) => state.clear);
  const [sold, setSold] = useState(false);
  const [soldNote, setSoldNote] = useState<string | null>(null);
  // ⚠️ §5's readings (plan `5P-a`) — a no-op on any build made without
  // `EXPO_PUBLIC_PILOT`. Nothing on this screen is drawn differently for it.
  const pilot = usePilotVisit('vender', workspace?.id ?? null, locationId, !loading && entries.length > 0);
  useEffect(() => {
    if (sold) pilot.confirmed();
  }, [sold, pilot]);

  const basketful: Basketful | null =
    workspace === null
      ? null
      : {
          cart,
          entries,
          factors,
          scope: 'sell',
          pricesIncludeTax: workspace.pricesIncludeTax,
          workspaceId: workspace.id,
          locationId,
          quotes,
          corrects,
        };

  // ⚠️⚠️ THE OWNER'S EMPTYING ANIMATION — *"another one if we empty the
  // carrito"* (2026-09-21), and it plays in the box that ASKED rather than in
  // the sheet (2026-09-24). ⚠️ `transform` and `opacity` only (§2.11), and
  // **started in an effect rather than in the handler that sets the state**,
  // which on the native driver is the difference between motion and silence.
  // ⚠️ THE SHEET CLOSES ON THE ANIMATION'S OWN COMPLETION, not on a timer.
  useEffect(() => {
    if (!emptied) return;
    bloom.setValue(0);
    const run = Animated.timing(bloom, {
      toValue: 1,
      duration: EMPTIED_BLOOM_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    run.start(({ finished }) => {
      if (!finished) return;
      setEmptied(false);
      setCartOpen(false);
    });
    return () => run.stop();
  }, [emptied, bloom]);

  // ⚠️ A QUESTION LEFT HALF-ASKED IS FORGOTTEN WHEN THE BASKET EMPTIES OR THE
  // SHEET CLOSES — otherwise *Sí, vaciar* would be waiting under a thumb that
  // came back for something else.
  useEffect(() => {
    if (cart.length === 0) setAsking(false);
  }, [cart.length]);

  const emptyCart = useCallback(() => {
    setAsking(false);
    clear('sell');
    setEmptied(true);
  }, [clear]);

  const commit = useCallback(() => {
    if (basketful === null) return;
    pilot.committed();
    const done = commitOf(basketful, { id: newWriteId(), now: nowIso() });
    // ⚠️ EVERY REFUSAL IS A PROGRAMMING ERROR AND NONE HAS A SENTENCE (`R4`) —
    // and none can happen here, because `canCommit` is what decided the control
    // was drawn at all. This branch is the belt to that brace.
    if (!done.ok) return;
    // ⚠️ THE QUEUE IS REACHED THROUGH `@/lib/commitRunner` AND NOT OPENED HERE.
    // A guard refused the other way round and named the reason: a route that
    // opened the outbox for itself is a sale written by a file that never
    // learned about `pending`, `flushing` or `dead` (§2.6).
    commitToQueue(done.write);
    clear('sell');
    setCartOpen(false);
    // ⚠️ `8g`, 2026-10-20: THE FIRST SALE ON THIS PHONE CARRIES ONE LINE — Wera
    // works without internet — and no other sale ever does (`@/offline/ensenar`).
    setSoldNote(firstTime(deviceStore(), FIRST_SALE_KEY) ? ES.offline.firstSale : null);
    setSold(true);
  }, [basketful, clear, pilot]);

  return (
    <KeyboardAvoidingView
      onTouchStart={pilot.onTouchStart}
      // ⚠️⚠️ NO `paddingTop: insets.top`, AND IT WAS HERE UNTIL 2026-09-24 —
      // *"The search bar is too low and we have a lot of dead space above the
      // product catalog."* **The safe area was being counted twice**: the tab
      // navigator draws a header (`title: tab.label`), which already sits below
      // the notch, and this screen then pushed itself down by the inset again.
      // ⚠️ `productos.tsx` never had it, which is why only this screen had the
      // gap — and is the measurement that found it.
      style={{ flex: 1, backgroundColor: PALETTE.fondo }}
      // See this file's header: `padding` on iOS, nothing on Android, where the
      // system has already resized the window.
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={scale.tabBarHeight + insets.bottom}
    >
      {corrects === null ? null : (
        <View style={{ paddingHorizontal: scale.space, paddingTop: scale.rowGap }}>
          <Corrigiendo line={correctingLine('sale', corrects)} onCancel={() => setAsking(true)} />
        </View>
      )}
      <Buscador value={typed} onChange={setTyped} box={box} placeholder={ES.catalog.search} />

      {/* ⚠️ A BOX AROUND THE LIST SO THE CASHIER'S NOTE SITS OVER ITS FOOT,
          just above the bar, without moving a row under a thumb. */}
      <View style={{ flex: 1 }}>
      <FlatList
        ref={list}
        // ⚠️ A `FlatList` FOR `productos.tsx`'s REASON: C8.3 puts ~100 products
        // in the pilot catalog and C1.1 puts two low-end Androids among its four
        // phones, and a `ScrollView` mounts every row at once.
        data={rows}
        keyExtractor={(entry) => entry.id}
        renderItem={({ item, index }) => (
          <Fila
            entry={item}
            factors={factors}
            typical={typicals[item.id]}
            onEdit={(on) => {
              editing.current = on ? index : null;
            }}
            onPrice={mayPrice ? openPricing : null}
            onRefused={(entry) => setRefused(entry.name)}
          />
        )}
        ItemSeparatorComponent={Separador}
        ListEmptyComponent={<Vacio line={catalogLine(loading, typed, failed, online)} />}
        contentContainerStyle={{ paddingBottom: scale.space }}
        // ⚠️ THE ROWS ARE A FIXED HEIGHT TO THE VIRTUALISER'S EYE ONLY WHEN THE
        // JUMP IS INSIDE THE RENDER WINDOW; past it `scrollToIndex` throws, and
        // a thrown error on the till is a blank screen. `productos.tsx` carries
        // the same fallback for the same reason.
        onScrollToIndexFailed={({ index }) => {
          list.current?.scrollToOffset({
            offset: index * (scale.retratoSize + scale.space * 2),
            animated: true,
          });
        }}
        // ⚠️ NOT `on-drag` ANY MORE, AND THAT IS PART OF THE SAME FIX. Dismissing
        // the keyboard the instant a thumb moves makes a mis-scroll cost the
        // number being typed; the box is committed on every parseable keystroke,
        // so the way out is *Listo* or a tap elsewhere.
        keyboardDismissMode="none"
        keyboardShouldPersistTaps="handled"
      />
      {refused !== null ? <Nota name={refused} onDone={forgetRefused} /> : null}
      </View>

      <Barra
        basket={basket}
        onOpen={openCart}
        onCommit={commit}
        onEmpty={() => setAsking(true)}
        canSell={basketful !== null && canCommit(basketful)}
      />

      {/* ⚠️ OVER THE SCREEN ONLY WHILE THE CARRITO IS CLOSED; with it open the
          sheet is drawn inside the Carrito's own `Modal` (`hoja` below), the
          arrangement `VaciarCarrito` already uses — a second `Modal` over the
          first is two iOS presentations animating against each other. */}
      {pricing !== null && workspace !== null && !cartOpen ? (
        <PrecioRapido
          entry={pricing.entry}
          adding={pricing.adding}
          entries={entries}
          workspaceId={workspace.id}
          locationId={locationId}
          onSaved={priced}
          onClose={() => setPricing(null)}
        />
      ) : null}

      <Carrito
        open={cartOpen}
        onClose={closeCart}
        review={review}
        entries={entries}
        factors={factors}
        typicals={typicals}
        onCommit={commit}
        onEmpty={() => setAsking(true)}
        correcting={correcting}
        canSell={basketful !== null && canCommit(basketful)}
        asking={asking}
        emptied={emptied}
        bloom={bloom}
        onConfirmEmpty={emptyCart}
        onCancelEmpty={() => setAsking(false)}
        onPrice={mayPrice ? openPricing : null}
        hoja={
          pricing !== null && workspace !== null && cartOpen ? (
            <PrecioRapido
              bare
              entry={pricing.entry}
              adding={pricing.adding}
              entries={entries}
              workspaceId={workspace.id}
              locationId={locationId}
              onSaved={priced}
              onClose={() => setPricing(null)}
            />
          ) : null
        }
      />

      {/* ⚠️ THE SAME QUESTION, ASKED FROM THE BAR — rendered here only while the
          sheet is CLOSED, because the sheet renders its own copy inside its
          `Modal`. See the state's comment above for why it is not a second
          modal. */}
      {!cartOpen ? (
        <VaciarCarrito
          asking={asking}
          emptied={emptied}
          bloom={bloom}
          count={basket?.lines ?? 0}
          correcting={correcting}
          onConfirm={emptyCart}
          onCancel={() => setAsking(false)}
        />
      ) : null}

      <Hecho shown={sold} word={ES.sell.sold} note={soldNote} onDone={() => setSold(false)} />

      {/* ⚠️ MOUNTED ONCE AND OUTSIDE EVERY CONDITIONAL. `InputAccessoryView`
          renders into the KEYBOARD rather than into the layout, so where it sits
          in the tree does not matter — but mounting it inside a branch means the
          bar vanishing exactly while a read is out. */}
      <TecladoListo padId={PAD_ID} label={ES.counter.done} />
    </KeyboardAvoidingView>
  );
}

/**
 * ⚠️⚠️ ONE ROW, AND IT IS THE WHOLE CONTROL — C3.2, and the sentence that makes
 * this a screen rather than a list. The variant name, the family beneath it,
 * `Precio` never without its unit (C3.10), the quantity box and the `−`/`+`.
 *
 * ⚠️ THERE IS NO `Pressable` ON THE ROW AND NO DETAIL SCREEN BEHIND IT — C3.3,
 * *"there is no add-to-basket step and no product-detail screen between the list
 * and the line."* A quantity greater than zero IS the basket line. ⚠️ That is
 * also why this row does NOT open La Familia the way Productos' row does: the
 * two screens look alike and answer different questions, and a tap that
 * navigated away mid-sale would lose the counter's place in the list.
 *
 * ⚠️ AND THE LINE TOTAL IS DELIBERATELY ABSENT (C3.4). It appears in the basket
 * sheet and in the sticky bar and nowhere else — the row already carries a
 * price, a quantity and two buttons, and a fourth number on it is the row
 * `5d-ii` said a counter cannot read across a shop.
 */
function Fila({
  entry,
  factors,
  typical,
  onEdit,
  onPrice,
  onRefused,
}: {
  entry: CatalogEntry;
  factors: UnitFactors;
  /** What this product usually arrives as — `undefined` when the shop has never
   *  bought it, or when it fell out of `MAGNITUDE_LIMIT`'s window. */
  typical: Typical | undefined;
  onEdit: (editing: boolean) => void;
  /** Opens the price sheet — `adding` when it was `+` that asked; `null` for a
   *  cashier, who sees nothing to tap. */
  onPrice: ((entry: CatalogEntry, adding: boolean) => void) | null;
  /** A cashier's `+` on a product with no price: the note saying who can fix it. */
  onRefused: (entry: CatalogEntry) => void;
}) {
  const { scale } = useDensity();
  const base = useCartStore((state) => {
    for (const line of state.carts.sell) if (line.variantId === entry.id) return line.base;
    return 0;
  });

  // ⚠️ THE AMBER CONDITION, IN ONE LINE — see this file's header for the whole
  // argument. A priceless product nobody is selling is not a problem. ⚠️ Since
  // `8g` it is reached only by a basket from before that rule: `@/cart/gate`
  // keeps an unpriced product out of the basket in the first place.
  const alarm = entry.centavos === null && base > 0;

  // ⚠️⚠️ §2.8's MAGNITUDE WARNING — `null` FOR THE PRICE, BECAUSE A SALE HAS NO
  // TYPED ONE. `quoteFor` takes the shelf figure off the catalog on the sell
  // side, so there is no keystroke to get wrong and nothing to compare a COST
  // median against. `@/api/magnitude`'s header has the argument; C3.15's counter
  // price change (`5f-iv`) is what would change this one argument.
  const big = magnitudeNote(outsized(typical, base, null));

  // ⚠️⚠️ `8g`, THE OWNER'S RULING OF 2026-10-15 — see `@/cart/gate`.
  const gate = sellGate(entry.centavos, onPrice !== null, base > 0);
  const refusal =
    gate === 'open'
      ? null
      : gate === 'priceFirst'
        ? { dim: false, onTap: () => onPrice?.(entry, true) }
        : { dim: true, onTap: () => onRefused(entry) };

  return (
    <View
      style={{
        flexDirection: 'row',
        gap: scale.space,
        paddingVertical: scale.space,
        paddingHorizontal: scale.space,
        backgroundColor: alarm ? PALETTE.atencionSuave : PALETTE.fondo,
      }}
    >
      <Retrato name={entry.name} picture={entry.picture} />

      {/* ⚠️⚠️ THE OWNER'S *B · MOSTRADOR*, 2026-10-15: the name on top with the
          whole width, the price and the controls beneath it. ⚠️ **`flexWrap` and
          not a branch on the mode**: at `Letra grande`, or with a long price,
          the controls do not fit beside the price and drop under it, which is
          the drawing's three tiers arrived at by measurement rather than by a
          rule about which mode is on. ⚠️ The family line is gone — *"we don't
          need a description per item at all."* */}
      <View style={{ flex: 1, justifyContent: 'space-between', gap: scale.rowGap }}>
        <Text
          numberOfLines={2}
          style={{ fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.tinta }}
        >
          {entry.name}
        </Text>

        {/* ⚠️ `R11`: the hue never travels alone. */}
        {alarm || big !== '' ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: scale.rowGap }}>
            {alarm ? (
              <Pressable
                accessibilityRole={onPrice === null ? undefined : 'button'}
                disabled={onPrice === null}
                hitSlop={scale.rowGap}
                onPress={() => onPrice?.(entry, false)}
              >
                <Text style={{ fontSize: scale.smallSize, fontWeight: '600', color: PALETTE.atencion }}>
                  {onPrice === null ? ES.sell.noPrice : ES.sell.setPrice}
                </Text>
              </Pressable>
            ) : null}
            {/* ⚠️ IT IS A WORD IN THE AMBER ROLE AND NOT A COLOURED ROW (`R11`
                again, and §2.8's *none blocking*). A row that changed colour under
                a thumb mid-sale reads as a refusal; `Sin precio` above does tint
                the row because C3.13 really does block a commit on it, and this
                one never does. */}
            {big === '' ? null : (
              <Text
                numberOfLines={1}
                style={{ fontSize: scale.smallSize, fontWeight: '600', color: PALETTE.atencion }}
              >
                {big}
              </Text>
            )}
          </View>
        ) : null}

        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: scale.rowGap,
          }}
        >
          <Precio entry={entry} onPrice={onPrice === null ? null : () => onPrice(entry, false)} />
          <Cantidad
            entry={entry}
            base={base}
            factors={factors}
            scope="sell"
            onEdit={onEdit}
            padId={PAD_ID}
            refusal={refusal}
          />
        </View>
      </View>
    </View>
  );
}

/**
 * The price on a row: the figure, and its unit beneath it (C3.10 — never one
 * without the other).
 *
 * ⚠️⚠️ FOR THE OWNER AND A MANAGER IT IS A BUTTON AND IS DRAWN AS ONE — `8g`,
 * his ruling of 2026-10-15, replacing the underline of 2026-10-14. A pencil on
 * `accionSuave`, the palette's own sentence for *the resting fill behind an
 * action*, so it reads as tappable at rest. ⚠️ A cashier gets the same words
 * with nothing around them: there is nothing for them to tap.
 *
 * ⚠️ NO AMBER ON A ROW NOBODY IS SELLING. A new shop imports its giro with no
 * prices, so on its first day nearly every row is unpriced, and a thousand
 * amber rows is a shop that looks unfinished; C3.12's dash and *sin precio*
 * say it in grey.
 */
function Precio({ entry, onPrice }: { entry: CatalogEntry; onPrice: (() => void) | null }) {
  const { scale } = useDensity();
  const unit = ES.units[entry.priceUnit as keyof typeof ES.units] ?? entry.priceUnit;
  const priced = entry.centavos !== null;
  const words = (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale.rowGap / 2 }}>
        <Text
          style={{
            fontSize: scale.moneySize,
            fontWeight: '700',
            color: priced ? PALETTE.tinta : PALETTE.tintaApagada,
          }}
        >
          {entry.centavos === null ? ES.catalog.noPrice : formatMXN(entry.centavos)}
        </Text>
        {onPrice === null ? null : (
          <MaterialCommunityIcons name="pencil-outline" size={scale.smallSize} color={PALETTE.accion} />
        )}
      </View>
      <Text style={{ fontSize: scale.smallSize, color: PALETTE.tintaApagada }}>
        {priced ? ES.sell.per(unit) : ES.sell.unpriced}
      </Text>
    </>
  );
  if (onPrice === null) return <View>{words}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={ES.sell.priceSheet.title(entry.name)}
      hitSlop={scale.rowGap}
      onPress={onPrice}
      style={{
        paddingHorizontal: scale.rowGap,
        paddingVertical: scale.rowGap / 2,
        borderRadius: scale.space,
        // ⚠️ A PRODUCT WITH NO PRICE GETS THE CHIP'S OUTLINE AND NOT ITS FILL:
        // on a new shop's first day that is nearly every row, and a list of green
        // chips is a list of shouting. Measured on the emulator, 2026-10-15.
        borderWidth: priced ? 0 : 1,
        borderColor: PALETTE.linea,
        backgroundColor: priced ? PALETTE.accionSuave : undefined,
      }}
    >
      {words}
    </Pressable>
  );
}

/**
 * ⚠️ `8g`: THE NOTE A CASHIER'S `+` BRINGS UP ON A PRODUCT WITH NO PRICE. It
 * says who can fix it and that the rest of the sale still goes through — the
 * reason the rule is at the `+` and not at the slide. It sits over the foot of
 * the list, goes by itself, and a tap sends it sooner.
 */
function Nota({ name, onDone }: { name: string; onDone: () => void }) {
  const { scale } = useDensity();
  useEffect(() => {
    const t = setTimeout(onDone, REFUSED_NOTE_MS);
    return () => clearTimeout(t);
  }, [name, onDone]);
  return (
    <Pressable
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      onPress={onDone}
      style={{
        position: 'absolute',
        left: scale.space,
        right: scale.space,
        bottom: scale.space,
        flexDirection: 'row',
        gap: scale.space,
        padding: scale.space,
        borderRadius: scale.space,
        borderWidth: 1,
        borderColor: PALETTE.linea,
        backgroundColor: PALETTE.superficie,
        // ⚠️ ANDROID'S ELEVATION AND iOS'S SHADOW, the second without an offset:
        // an offset is a literal `R6` refuses, and the default casts it upward,
        // away from the bar it floats over.
        elevation: 6,
        shadowColor: PALETTE.velo,
        shadowOpacity: 0.18,
        shadowRadius: scale.space,
      }}
    >
      <MaterialCommunityIcons name="information-outline" size={scale.iconSize} color={PALETTE.atencion} />
      <View style={{ flex: 1, gap: scale.rowGap / 2 }}>
        <Text style={{ fontSize: scale.bodySize, fontWeight: '700', color: PALETTE.tinta }}>
          {ES.sell.refused.title(name)}
        </Text>
        <Text style={{ fontSize: scale.smallSize, color: PALETTE.tintaApagada }}>
          {ES.sell.refused.body}
        </Text>
      </View>
    </Pressable>
  );
}

/**
 * ⚠️⚠️ C3.4's STICKY BAR — **ARRANGEMENT A, RULED BY THE OWNER 2026-09-24**
 * after three were drawn and measured: *"We'll go with Option A with the
 * barra."* Two rows — the summary reads, the slide acts.
 *
 * ⚠️⚠️ WHY TWO ROWS AND NOT ONE, BECAUSE IT IS ARITHMETIC AND NOT TASTE. On one
 * row the track is whatever is left after the total, so **the gesture gets
 * SHORTER as the sale gets bigger**: measured at `Letra grande` on a 393 pt
 * iPhone 15, `$1,234.50` leaves 189 pt of track and `$12,345.60` leaves 154, of
 * which the thumb itself eats 54. **A hundred points of travel is a long tap**,
 * and C3.6 made commit a gesture precisely so a brush cannot fire it. Here the
 * track gets the full width at every basket size.
 *
 * ⚠️ `Ver carrito` IS GONE AND `N productos ›` IS THE AFFORDANCE — the fourth
 * thing on the owner's list, and the one he said could go *"if things are too
 * cramped."* The count is already a word beside the chevron, so nothing becomes
 * a bare icon (C12.1) and the line is saved.
 *
 * ⚠️⚠️ THE SLIDE ROW APPEARS WITH THE FIRST PRODUCT — a decision taken on his
 * behalf and named here. The alternative is a track drawn dead on an empty
 * basket, which is a control that looks live and does nothing. The cost is that
 * the list shifts once, on the first `+`, **at the moment a thumb has just left
 * a button and is not yet aiming at anything.**
 *
 * ⚠️ THE SUMMARY ROW IS DRAWN ON AN EMPTY BASKET, which is why
 * `ES.counter.emptyCart` exists: a bar that appeared on the first tap would move
 * the list under a thumb already reaching for the second one.
 *
 * ⚠️⚠️ A BASKET WITH AN UNPRICEABLE LINE SHOWS THE TOTAL **AND SAYS SO**. That
 * is `reviewOf`'s `complete`, and it is deliberately not a decision: C3.13
 * blocks a purchase and C3.14 lets a sale through loudly, and those two answers
 * belong to `5g` and `5h`.
 */
function Barra({
  basket,
  onOpen,
  onCommit,
  onEmpty,
  canSell,
}: {
  basket: Basket | null;
  onOpen: () => void;
  onCommit: () => void;
  onEmpty: () => void;
  canSell: boolean;
}) {
  const { scale } = useDensity();
  const live = basket !== null && basket.lines > 0;
  const Strip = live ? Pressable : View;
  return (
    <View
      style={{
        borderTopWidth: 1,
        borderTopColor: PALETTE.linea,
        backgroundColor: PALETTE.banda,
      }}
    >
      <Strip
        {...(live
          ? {
              accessibilityRole: 'button' as const,
              accessibilityLabel: ES.counter.cart.open,
              onPress: onOpen,
            }
          : {})}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: scale.space,
          paddingHorizontal: scale.space,
          paddingVertical: scale.space,
        }}
      >
        <View style={{ gap: scale.rowGap / 4 }}>
          <Text style={{ fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.tinta }}>
            {ES.counter.total}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale.rowGap / 4 }}>
            <Text
              style={{
                fontSize: scale.smallSize,
                fontWeight: live ? '600' : '400',
                color: live ? PALETTE.accion : PALETTE.tintaApagada,
              }}
            >
              {basket === null || basket.lines === 0
                ? ES.counter.emptyCart
                : ES.counter.lines(basket.lines)}
            </Text>
            {live ? (
              <MaterialCommunityIcons
                name="chevron-right"
                size={scale.iconSize}
                color={PALETTE.accion}
              />
            ) : null}
          </View>
        </View>

        <View style={{ alignItems: 'flex-end', gap: scale.rowGap / 4 }}>
          {/* ⚠️ THE FIGURE IS WITHHELD RATHER THAN GUESSED while the shop is
              unknown — C3.12's character, on C3.12's reasoning. See `Vender`. */}
          <Text style={{ fontSize: scale.moneySize, fontWeight: '700', color: PALETTE.tinta }}>
            {basket === null ? ES.catalog.noPrice : formatMXN(basket.centavos)}
          </Text>
          {basket !== null && !basket.complete ? (
            <Text style={{ fontSize: scale.smallSize, fontWeight: '600', color: PALETTE.atencion }}>
              {ES.sell.someUnpriced}
            </Text>
          ) : null}
        </View>
      </Strip>

      {/* ⚠️ THE SECOND ROW, AND ONLY ONCE THERE IS A BASKET. See above.
          ⚠️⚠️ IT IS THE SHEET'S FOOT, ON THE SCREEN — `Vaciar carrito` left, the
          slide right — ruled 2026-09-24: *"Include Vaciar carrito in the closed
          Carrito as well, with the confirmation message also displaying when
          tapped there."* **The two rows are deliberately the same shape**, so
          the thumb that learns one has learned the other.
          ⚠️ `Vaciar carrito` IS DRAWN EVEN WHEN THE SALE CANNOT BE COMMITTED —
          a basket with an unpriced line still has to be emptiable, and that is
          the case where a shopkeeper is most likely to want to. */}
      {live ? (
        <View style={{ paddingHorizontal: scale.space, paddingBottom: scale.space }}>
          <CierreCarrito
            onEmpty={onEmpty}
            word={ES.sell.slide.word}
            label={ES.sell.slide.label}
            onCommit={onCommit}
            canCommit={canSell}
            onTap={onOpen}
          />
        </View>
      ) : null}
    </View>
  );
}

/**
 * ⚠️⚠️ C3.5's SHEET — the review before the commit, one of §2.8's three
 * *Error prevention* guards. Its frame is `src/ui/HojaCarrito` since round 4 of
 * `8g` (2026-10-16), shared with Comprar and Desperdicio; what is Vender's is the
 * line (`Renglon`) and the foot's Total.
 *
 * ⚠️ IT IS NOT A ROUTE, and that is a decision recorded in `Vender`: the basket
 * is this place, zoomed, priced against the catalog this screen already read.
 *
 * ⚠️ THE EMPTYING QUESTION AND THE PRICE SHEET ARE DRAWN INSIDE ITS `Modal`
 * (`over`) — a sibling of the `Modal` would be behind it.
 */
function Carrito({
  open,
  onClose,
  review,
  entries,
  factors,
  typicals,
  onCommit,
  onEmpty,
  correcting,
  canSell,
  asking,
  emptied,
  bloom,
  onConfirmEmpty,
  onCancelEmpty,
  onPrice,
  hoja,
}: {
  open: boolean;
  onClose: () => void;
  review: Review | null;
  entries: readonly CatalogEntry[];
  factors: UnitFactors;
  /** ⚠️ THE SAME MAP THE LIST BEHIND THIS SHEET IS USING, passed down rather
   *  than read again: `useMagnitude` inside the sheet would be a second
   *  subscriber to one cache entry and a second answer to the same question. */
  typicals: Typicals;
  onCommit: () => void;
  onEmpty: () => void;
  /** `8g`: the document a correction re-keys, or `null` — the *Vaciar* box's words. */
  correcting: string | null;
  canSell: boolean;
  asking: boolean;
  emptied: boolean;
  bloom: Animated.Value;
  onConfirmEmpty: () => void;
  onCancelEmpty: () => void;
  /** The price chip on each line, for the owner and a manager — `8g`. */
  onPrice: ((entry: CatalogEntry, adding: boolean) => void) | null;
  /** The price sheet, drawn inside this `Modal` while it is open — see `Vender`. */
  hoja: ReactNode;
}) {
  const rows = review === null ? [] : review.rows;

  return (
    <HojaCarrito
      open={open}
      onClose={onClose}
      lines={rows.length}
      foot={
        rows.length === 0 || review === null ? null : (
          <Pie basket={review.basket} canSell={canSell} onCommit={onCommit} onAsk={onEmpty} />
        )
      }
      over={
        <>
          <VaciarCarrito
            asking={asking}
            emptied={emptied}
            bloom={bloom}
            count={rows.length}
            correcting={correcting}
            onConfirm={onConfirmEmpty}
            onCancel={onCancelEmpty}
          />
          {hoja}
        </>
      }
    >
      <FlatList
        // ⚠️ `flex: 1` BECAUSE THE CARD IS A FIXED HEIGHT: the list takes the
        // room the header and the foot do not, which pins the controls to the
        // same place on every basket.
        style={{ flex: 1 }}
        data={rows}
        keyExtractor={(row) => row.variantId}
        renderItem={({ item }) => (
          <Renglon
            row={item}
            entry={entries.find((e) => e.id === item.variantId)}
            factors={factors}
            typical={typicals[item.variantId]}
            onPrice={onPrice}
          />
        )}
        ItemSeparatorComponent={Separador}
        ListEmptyComponent={<Vacio line={ES.counter.emptyCart} />}
        keyboardShouldPersistTaps="handled"
      />
    </HojaCarrito>
  );
}

/**
 * One line of the basket, as the sheet draws it.
 *
 * ⚠️⚠️ A ROW WHOSE PRODUCT HAS LEFT THE CATALOG IS DRAWN AND NOT HIDDEN — see
 * `reviewOf`, which is where the argument lives. `draftOf` refuses the whole
 * basket for it, and this sheet is the only surface that can remove it, because
 * the list behind it is the catalog and the catalog no longer has the row. It
 * keeps its `Quitar` and loses its quantity control: there is no price unit to
 * step in and no factor to step by.
 *
 * ⚠️ THE LINE TOTAL IS A DASH WHEN IT COULD NOT BE PRICED, never `$0.00` —
 * C3.12 about one row, which is the same fact `reviewOf` keeps out of the sum.
 *
 * ⚠️⚠️ THREE LINES AND NOT ONE, AND THE FIRST WRITING PUT FOUR THINGS ON ONE
 * ROW — the second half of the bug the owner saw on 2026-09-24. Measured rather
 * than eyeballed, at `Letra grande` on his iPhone 15 (393 pt wide): the stepper
 * is `tapTarget + box + tapTarget` = 222 pt, the line total 90, the removal 60,
 * three gaps 36 and the padding 32 — **440 pt before the product name gets
 * anything at all.** The name block is `flex: 1`, so it collapsed to nothing and
 * the row overflowed. ⚠️ A review screen is the one place a name may not be
 * squeezed: it is what the customer is checking the figure against.
 */
function Renglon({
  row,
  entry,
  factors,
  typical,
  onPrice,
}: {
  row: ReviewRow;
  entry: CatalogEntry | undefined;
  factors: UnitFactors;
  typical: Typical | undefined;
  onPrice: ((entry: CatalogEntry, adding: boolean) => void) | null;
}) {
  const { scale } = useDensity();
  const remove = useCartStore((state) => state.remove);
  const gone = entry === undefined;
  // ⚠️ `8g`: A CORRECTED LINE KEEPS THE PRICE IT WAS SOLD AT, so its chip says
  // that price and not the shelf's — and opens no price sheet, which would
  // change the shelf and not this line.
  const quote = useTyped('sell')[row.variantId];
  const kept =
    quote === undefined || entry === undefined
      ? null
      : priceCentavos(quote, factors[entry.priceUnit] ?? '');

  // ⚠️⚠️ THE WARNING IS ON THE SHEET **AS WELL AS** ON THE LIST, AND THAT IS NOT
  // A DUPLICATE. §2.8's three guards compound — review-before-commit is the
  // second of them — and the sheet is the last surface before the slide. A line
  // flagged on a row that has since scrolled away would otherwise be committed
  // having been flagged to nobody.
  const big = magnitudeNote(outsized(typical, row.base, null));
  const unpriced = row.centavos === null && !gone;

  return (
    <View
      style={{
        gap: scale.rowGap,
        paddingVertical: scale.space,
        paddingHorizontal: scale.space,
        backgroundColor: PALETTE.fondo,
      }}
    >
      {/* ⚠️ `8g`, THE OWNER'S *BOARD 1*: A LINE READS LIKE A TICKET — the name,
          and the figure the customer is checking it against, on one line; the
          unit price under the name, so the arithmetic is on the paper. The
          family line went with the row's (*"we don't need a description"*). */}
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: scale.space }}>
        <Text
          numberOfLines={2}
          style={{
            flex: 1,
            fontSize: scale.bodySize,
            fontWeight: '600',
            color: gone ? PALETTE.tintaApagada : PALETTE.tinta,
          }}
        >
          {row.name ?? ES.counter.cart.goneName}
        </Text>
        <Text style={{ fontSize: scale.moneySize, fontWeight: '700', color: PALETTE.tinta }}>
          {row.centavos === null ? ES.catalog.noPrice : formatMXN(row.centavos)}
        </Text>
      </View>

      {/* ⚠️ `R11`: the state never travels as a colour alone. */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: scale.rowGap }}>
        {gone ? (
          <Text style={{ fontSize: scale.smallSize, color: PALETTE.tintaApagada }}>
            {ES.counter.cart.gone}
          </Text>
        ) : (
          <Unitario entry={entry} onPrice={kept === null ? onPrice : null} kept={kept} />
        )}
        {unpriced ? (
          <Text style={{ fontSize: scale.smallSize, fontWeight: '600', color: PALETTE.atencion }}>
            {ES.sell.noPrice}
          </Text>
        ) : null}
        {/* ⚠️ THE PRICELESS LINE WINS WHEN BOTH APPLY, which is not arbitrary:
            C3.13/C3.14 make a missing price the thing that decides whether this
            basket can be committed at all, and §2.8 makes this one advisory. */}
        {big === '' || unpriced ? null : (
          <Text
            numberOfLines={1}
            style={{ fontSize: scale.smallSize, fontWeight: '600', color: PALETTE.atencion }}
          >
            {big}
          </Text>
        )}
      </View>

      {/* The controls, on their own line — see this component's header. */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        {gone ? <View /> : <Cantidad entry={entry} base={row.base} factors={factors} scope="sell" padId={PAD_ID} />}

        {/* ⚠️ A WORD AND NOT A GLYPH, and the width is the reason as much as the
            clarity: an icon plus its word does not fit beside the stepper at
            `Letra grande`, and an icon alone on the one control that destroys
            something is the shape C12.1 refuses. ⚠️ `error` is the palette's own
            sentence for this role — it names `Quitar` first. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${ES.counter.cart.remove} ${row.name ?? ES.counter.cart.goneName}`}
          onPress={() => remove('sell', row.variantId)}
          style={{
            minHeight: scale.tapTarget,
            justifyContent: 'center',
            paddingHorizontal: scale.rowGap,
          }}
        >
          <Text style={{ fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.error }}>
            {ES.counter.cart.remove}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

/**
 * A line's unit price — *$45 por pza* — under its name in the Carrito.
 *
 * ⚠️ THE SAME CHIP AS THE ROW'S, for the owner and a manager (`8g`): a pencil
 * on `accionSuave`, and a tap opens the same price sheet, drawn inside this
 * `Modal`. A cashier reads the words alone.
 */
function Unitario({
  entry,
  onPrice,
  kept = null,
}: {
  entry: CatalogEntry;
  onPrice: ((entry: CatalogEntry, adding: boolean) => void) | null;
  /** `8g`: a corrected line's own price per unit, in place of the shelf's. */
  kept?: number | null;
}) {
  const { scale } = useDensity();
  const shown = kept ?? entry.centavos;
  const words = (
    <Text style={{ fontSize: scale.smallSize, color: onPrice === null ? PALETTE.tintaApagada : PALETTE.tinta }}>
      {shown === null
        ? ES.catalog.noPrice
        : `${formatMXN(shown)} ${ES.sell.per(ES.units[entry.priceUnit as keyof typeof ES.units] ?? entry.priceUnit)}`}
    </Text>
  );
  if (onPrice === null) return words;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={ES.sell.priceSheet.title(entry.name)}
      hitSlop={scale.rowGap}
      onPress={() => onPrice(entry, false)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale.rowGap / 2,
        paddingHorizontal: scale.rowGap,
        paddingVertical: scale.rowGap / 2,
        borderRadius: scale.space,
        backgroundColor: PALETTE.accionSuave,
      }}
    >
      {words}
      <MaterialCommunityIcons name="pencil-outline" size={scale.smallSize} color={PALETTE.accion} />
    </Pressable>
  );
}

/**
 * ⚠️⚠️ THE SHEET'S FOOT — the Total, then `Vaciar carrito` and **the second
 * slide** (`src/ui/CierreCarrito`, the same row the bar draws).
 *
 * ⚠️ THE SLIDE HERE IS THE OWNER'S, RULED 2026-09-24: *"The slide bar should
 * also be present in the check out if we open the Carrito."* So the review
 * screen can complete the sale without being closed first.
 *
 * ⚠️⚠️ `8g`, THE OWNER'S *BOARD 1*: THE TOTAL IS ON THE SHEET, and it is the
 * bar's own figure (`reviewOf`'s `basket`), so the foot and the bar are one
 * object in two places and the lines above still sum to it (§2.5 rule 5).
 */
function Pie({
  basket,
  onAsk,
  onCommit,
  canSell,
}: {
  basket: Basket;
  onAsk: () => void;
  onCommit: () => void;
  canSell: boolean;
}) {
  return (
    <>
      <TotalCarrito centavos={basket.centavos} note={basket.complete ? null : ES.sell.someUnpriced} />
      <CierreCarrito
        onEmpty={onAsk}
        word={ES.sell.slide.word}
        label={ES.sell.slide.labelInCart}
        onCommit={onCommit}
        canCommit={canSell}
        compact
      />
    </>
  );
}

