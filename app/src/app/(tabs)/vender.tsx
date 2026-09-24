import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import {
  Animated,
  Easing,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { catalogLine, search, type CatalogEntry, type UnitFactors } from '@/api/catalog';
import { useCatalog, useUnitFactors, useWorkspace } from '@/api/hooks';
import { reviewOf, stepOf, type Basket, type Review, type ReviewRow } from '@/cart/cart';
import { canCommit, commitOf, releaseCommits, releaseTaps, type Basketful } from '@/cart/commit';
import { baseFromShown, qtyShown, shownUnitOf } from '@/cart/quantity';
import { useCart, useCartStore } from '@/cart/store';
import { formatMXN } from '@/format/mxn';
import { commitToQueue } from '@/lib/commitRunner';
import { newWriteId, nowIso } from '@/lib/ids';
import { ES } from '@/strings';
import { useDensity } from '@/theme/DensityProvider';
import { PALETTE } from '@/theme/palette';

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
// ⚠️ THE SEARCH BOX AND THE EMPTY STATES ARE `productos.tsx`'s, COPIED
// ----------------------------------------------------------------------------
// Deliberately, and it is `5h.5`'s row that resolves it: §2.11 lists ~10
// primitives and §3 requires them before step 6, and the owner refused *"ten
// primitives guessed at against screens nobody has drawn"* on 2026-09-13. This
// is the second drawing of a search box and the first of a sticky bar — **the
// real pattern `5h.5` extracts**, rather than a component invented from one
// instance. ⚠️ A session that folds these into `src/ui/` before `5h` closes is
// taking that row's decision for it.
// ============================================================================

export default function Vender() {
  const { scale } = useDensity();
  const insets = useSafeAreaInsets();

  // ⚠️ THE CATALOG IS READ UNFILTERED AND NARROWED BELOW — see the header. The
  // empty string is `useCatalog`'s own default and is spelled out here because
  // the argument it is NOT being given is the point.
  const { loading, entries, failed, locationId } = useCatalog('');
  const factors = useUnitFactors();
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
    workspace === null ? null : reviewOf(cart, entries, 'sell', workspace.pricesIncludeTax);
  const basket: Basket | null = review === null ? null : review.basket;

  // ⚠️ THE SHEET'S OPEN STATE LIVES HERE AND NOT IN THE ROUTER, which is a
  // decision and is recorded as one. `ajustes` and `solicitudes` are `Stack`
  // modals because they are different PLACES; the basket is this place, zoomed —
  // it is priced against the catalog this screen has already read, its rows
  // carry the control the list behind them carries, and C3.5's own recovery is
  // *"two taps on the list behind the sheet"*. A route would re-read the
  // catalog, the unit factors and the workspace to show a subset of what is
  // already on screen.
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

  const basketful: Basketful | null =
    workspace === null
      ? null
      : {
          cart,
          entries,
          factors,
          kind: 'sell',
          pricesIncludeTax: workspace.pricesIncludeTax,
          workspaceId: workspace.id,
          locationId,
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
      duration: 420,
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
    setSold(true);
  }, [basketful, clear]);

  return (
    <KeyboardAvoidingView
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
      <Buscador value={typed} onChange={setTyped} box={box} />

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
            onEdit={(on) => {
              editing.current = on ? index : null;
            }}
          />
        )}
        ItemSeparatorComponent={Separador}
        ListEmptyComponent={<Vacio line={catalogLine(loading, typed, failed)} />}
        contentContainerStyle={{ paddingBottom: scale.space }}
        // ⚠️ THE ROWS ARE A FIXED HEIGHT TO THE VIRTUALISER'S EYE ONLY WHEN THE
        // JUMP IS INSIDE THE RENDER WINDOW; past it `scrollToIndex` throws, and
        // a thrown error on the till is a blank screen. `productos.tsx` carries
        // the same fallback for the same reason.
        onScrollToIndexFailed={({ index }) => {
          list.current?.scrollToOffset({ offset: index * scale.rowHeight, animated: true });
        }}
        // ⚠️ NOT `on-drag` ANY MORE, AND THAT IS PART OF THE SAME FIX. Dismissing
        // the keyboard the instant a thumb moves makes a mis-scroll cost the
        // number being typed; the box is committed on every parseable keystroke,
        // so the way out is *Listo* or a tap elsewhere.
        keyboardDismissMode="none"
        keyboardShouldPersistTaps="handled"
      />

      <Barra
        basket={basket}
        onOpen={openCart}
        onCommit={commit}
        onEmpty={() => setAsking(true)}
        canSell={basketful !== null && canCommit(basketful)}
      />

      <Carrito
        open={cartOpen}
        onClose={closeCart}
        review={review}
        entries={entries}
        factors={factors}
        onCommit={commit}
        onEmpty={() => setAsking(true)}
        canSell={basketful !== null && canCommit(basketful)}
        asking={asking}
        emptied={emptied}
        bloom={bloom}
        onConfirmEmpty={emptyCart}
        onCancelEmpty={() => setAsking(false)}
      />

      {/* ⚠️ THE SAME QUESTION, ASKED FROM THE BAR — rendered here only while the
          sheet is CLOSED, because the sheet renders its own copy inside its
          `Modal`. See the state's comment above for why it is not a second
          modal. */}
      {!cartOpen ? (
        <Confirmacion
          asking={asking}
          emptied={emptied}
          bloom={bloom}
          onConfirm={emptyCart}
          onCancel={() => setAsking(false)}
        />
      ) : null}

      <Vendido shown={sold} onDone={() => setSold(false)} />
    </KeyboardAvoidingView>
  );
}

/**
 * The search box. `productos.tsx`'s, one screen over — see this file's header
 * for why it is copied rather than shared, and `5h.5` for who resolves it.
 *
 * ⚠️ IT DOES NOT SCROLL AWAY. C3.1 puts the box ABOVE a scrolling list, and a
 * shop with a hundred products is exactly the shop that searches.
 */
function Buscador({
  value,
  onChange,
  box,
}: {
  value: string;
  onChange: (text: string) => void;
  box: RefObject<TextInput | null>;
}) {
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
        {/* C12.1 is not bent: the word is the placeholder inside the same box. */}
        <MaterialCommunityIcons name="magnify" size={scale.iconSize} color={PALETTE.tintaApagada} />
        <TextInput
          ref={box}
          value={value}
          onChangeText={onChange}
          placeholder={ES.catalog.search}
          placeholderTextColor={PALETTE.tintaApagada}
          autoCorrect={false}
          autoCapitalize="none"
          // ⚠️ *Listo* AND NOT *Buscar*: the filtering has already happened on
          // every keystroke, so the only thing that key can still do is put the
          // keyboard away.
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
  onEdit,
}: {
  entry: CatalogEntry;
  factors: UnitFactors;
  onEdit: (editing: boolean) => void;
}) {
  const { scale } = useDensity();
  const base = useCartStore((state) => {
    for (const line of state.carts.sell) if (line.variantId === entry.id) return line.base;
    return 0;
  });

  // ⚠️ THE AMBER CONDITION, IN ONE LINE — see this file's header for the whole
  // argument. A priceless product nobody is selling is not a problem.
  const alarm = entry.centavos === null && base > 0;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale.rowGap,
        minHeight: scale.rowHeight,
        paddingVertical: scale.rowGap,
        paddingHorizontal: scale.space,
        backgroundColor: alarm ? PALETTE.atencionSuave : PALETTE.superficie,
      }}
    >
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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale.rowGap }}>
          {/* C3.10's sentence, computed by `5d-i` and never assembled here. */}
          <Text
            numberOfLines={1}
            style={{
              fontSize: scale.bodySize,
              fontWeight: '600',
              color: entry.centavos === null ? PALETTE.tintaApagada : PALETTE.tinta,
            }}
          >
            {entry.price}
          </Text>
          {/* ⚠️ `R11`: the hue never travels alone. */}
          {alarm ? (
            <Text style={{ fontSize: scale.bodySize * 0.85, fontWeight: '600', color: PALETTE.atencion }}>
              {ES.sell.noPrice}
            </Text>
          ) : null}
        </View>
      </View>

      <Cantidad entry={entry} base={base} factors={factors} onEdit={onEdit} />
    </View>
  );
}

/**
 * ⚠️⚠️ THE QUANTITY CONTROL, AND IT IS A STEPPER **AND** A KEYPAD ON EVERY
 * PRODUCT — never a switch between them.
 *
 * ADR-035 §2.8 and §2.11 said the opposite until 2026-09-24 (*"stepper for
 * discrete units, decimal keypad for weight and volume… never the same control
 * for both"*, and `QtyInput` named as the switch). The owner amended both:
 * *"Amend it to say both, this should be easily switchable and configurable…
 * If a user wants to sell 15 manojos of cilantro, he shouldn't have to click the
 * stepper 14 times."* ⚠️ **A keypad is about MAGNITUDE and not precision**,
 * which is why counts get one too — there is no 288th of a `pza`, and there are
 * fifteen manojos.
 *
 * ⚠️ THE TWO ARE DISTINGUISHABLE AND ONE TAP APART, which is what survives of
 * the original rule: `−` and `+` are for *one more of the usual amount* and the
 * box is for *this exact number*. The box IS the keypad — `decimal-pad` is what
 * C3.7's *"tapping the quantity field opens a numeric keypad"* means on a phone.
 *
 * ⚠️⚠️ THE STEP IS `price_unit_code`'s FACTOR AND NOT A NUMBER THIS FILE PICKS
 * (C3.8), and *configurable* needs no new affordance: the shopkeeper chooses
 * that unit in `Agregar` and `Editar`, so pricing *por cuarto* makes the step
 * 250 g. **A step set INDEPENDENTLY of the price unit is a different thing and
 * is not built here** — `5f-ii`'s row records that reading.
 *
 * ⚠️ WHICH UNIT THE BOX SPEAKS IN IS `@/cart/quantity`'s DECISION, not this
 * file's, and `app/test/cart-quantity.test.ts` reads it.
 */
function Cantidad({
  entry,
  base,
  factors,
  onEdit,
}: {
  entry: CatalogEntry;
  base: number;
  factors: UnitFactors;
  // ⚠️ OPTIONAL BECAUSE THE SHEET HAS NO LIST TO SCROLL. On the list this tells
  // the screen which row the keyboard is about to cover; inside the sheet there
  // are only the lines already in the basket, and nothing virtualises them.
  onEdit?: (editing: boolean) => void;
}) {
  const { scale } = useDensity();
  const setQty = useCartStore((state) => state.setQty);
  const bump = useCartStore((state) => state.step);

  const unit = shownUnitOf(entry);
  const by = stepOf(entry.priceUnit, factors);
  const settled = base === 0 ? '' : (qtyShown(base, unit, factors) ?? '');

  // ⚠️⚠️ THE BOX KEEPS WHAT WAS TYPED WHILE IT IS BEING TYPED, AND THAT IS NOT
  // A CONVENIENCE. `0.` is not a quantity, so committing on every keystroke
  // would delete the line the instant a thumb reached the decimal point and the
  // digit after it would land on an empty row. ⚠️ A parseable keystroke DOES
  // commit, because the sticky `Total` a customer is watching must not lag the
  // number she is reading. ⚠️ And `null` means *the store is the truth*, which
  // is what makes `−` and `+` show up in the box while it is untouched.
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? settled;

  const typeInto = (text: string) => {
    setDraft(text);
    if (text.trim() === '') {
      setQty('sell', entry.id, 0);
      return;
    }
    const next = baseFromShown(text, unit, factors);
    if (next !== null) setQty('sell', entry.id, next);
  };

  // ⚠️ THE UNIT'S WORD IS `ES.units`' AND NEVER THE CODE (`R4`): `250g` is what
  // the database calls it and *250 gr* is what a shopkeeper reads.
  const word = ES.units[unit as keyof typeof ES.units] ?? unit;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale.rowGap / 2 }}>
      <Paso
        label={ES.sell.less}
        glyph="minus"
        // ⚠️ DISABLED RATHER THAN DEAD AT ZERO. Stepping down through zero
        // removes a line that is not there; a control that looks live and does
        // nothing is the shape this repository refuses by name.
        disabled={by === null || base === 0}
        onPress={() => {
          setDraft(null);
          bump('sell', entry.id, by, -1);
        }}
      />

      <View style={{ alignItems: 'center', minWidth: scale.tapTarget * 1.5 }}>
        <TextInput
          value={shown}
          onChangeText={typeInto}
          // ⚠️ THE ROW TELLS THE SCREEN IT IS THE ONE BEING TYPED INTO, and the
          // screen scrolls it into view once the keyboard is actually up — see
          // this file's header.
          onFocus={() => onEdit?.(true)}
          onBlur={() => {
            onEdit?.(false);
            setDraft(null);
          }}
          editable={by !== null}
          // ⚠️ `decimal-pad` AND NOT `numeric`: `numeric` carries a minus sign
          // and an exponent on some Android keyboards, and neither is a
          // quantity. A comma is read as a decimal point one module over.
          keyboardType="decimal-pad"
          returnKeyType="done"
          onSubmitEditing={() => Keyboard.dismiss()}
          accessibilityLabel={`${ES.sell.qty} ${word}`}
          textAlign="center"
          style={{
            minWidth: scale.tapTarget * 1.5,
            minHeight: scale.tapTarget,
            paddingHorizontal: scale.rowGap / 2,
            borderRadius: scale.space / 2,
            borderWidth: 1,
            borderColor: base === 0 ? PALETTE.linea : PALETTE.accion,
            backgroundColor: PALETTE.superficie,
            fontSize: scale.bodySize,
            fontWeight: '600',
            color: PALETTE.tinta,
          }}
        />
        {/* ⚠️ THE UNIT IS RENDERED BESIDE THE FIELD AND ALWAYS — the half of
            §2.8's *Unit-aware input* row that was never in question. */}
        <Text style={{ fontSize: scale.bodySize * 0.85, color: PALETTE.tintaApagada }}>{word}</Text>
      </View>

      <Paso
        label={ES.sell.more}
        glyph="plus"
        disabled={by === null}
        onPress={() => {
          setDraft(null);
          bump('sell', entry.id, by, 1);
        }}
      />
    </View>
  );
}

/** One half of the stepper. The glyph carries the word as its label (C12.1). */
function Paso({
  label,
  glyph,
  disabled,
  onPress,
}: {
  label: string;
  glyph: 'minus' | 'plus';
  disabled: boolean;
  onPress: () => void;
}) {
  const { scale } = useDensity();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={{
        minWidth: scale.tapTarget,
        minHeight: scale.tapTarget,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: scale.space / 2,
        backgroundColor: disabled ? PALETTE.fondo : PALETTE.accionSuave,
      }}
    >
      <MaterialCommunityIcons
        name={glyph}
        size={scale.iconSize}
        color={disabled ? PALETTE.tintaApagada : PALETTE.accion}
      />
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
 * `ES.sell.emptyCart` exists: a bar that appeared on the first tap would move
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
              accessibilityLabel: ES.sell.cart.open,
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
            {ES.sell.total}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale.rowGap / 4 }}>
            <Text
              style={{
                fontSize: scale.bodySize * 0.85,
                fontWeight: live ? '600' : '400',
                color: live ? PALETTE.accion : PALETTE.tintaApagada,
              }}
            >
              {basket === null || basket.lines === 0
                ? ES.sell.emptyCart
                : ES.sell.lines(basket.lines)}
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
            <Text style={{ fontSize: scale.bodySize * 0.85, fontWeight: '600', color: PALETTE.atencion }}>
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
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: scale.space,
            paddingHorizontal: scale.space,
            paddingBottom: scale.space,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={ES.sell.cart.empty}
            onPress={onEmpty}
            style={{ minHeight: scale.tapTarget, justifyContent: 'center' }}
          >
            <Text style={{ fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.error }}>
              {ES.sell.cart.empty}
            </Text>
          </Pressable>

          {canSell ? (
            <View style={{ flex: 1 }}>
              <Deslizador onCommit={onCommit} onOpen={onOpen} />
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

/**
 * ⚠️⚠️ C3.6's SLIDE — *"commit is a SLIDE, not a tap. The button becomes a
 * slider and the gesture commits."* Plan task `5f-iii-b`.
 *
 * ⚠️⚠️ THE TRACK FILLS BEHIND THE THUMB, RULED BY THE OWNER 2026-09-24 —
 * *"make the slider fill along with the finger swipe."* It is what turns a knob
 * that moves into a gesture with a state: at any moment the amount of green is
 * how much of the sale has been agreed to.
 *
 * ⚠️⚠️ AND THE FILL IS A `translateX`, NOT A WIDTH — §2.11's motion rule
 * honoured rather than bent. A fill animated by growing its `width` is a LAYOUT
 * change every frame, on the phone C1.1 puts two low-end Androids among; a
 * full-width block slid in from the left under `overflow: 'hidden'` is a
 * transform, and transforms composite. **The visible result is identical and
 * the frame cost is not.**
 *
 * ⚠️ THE DRIVER IS THE JS ONE DURING THE DRAG, AND THAT IS NAMED RATHER THAN
 * HIDDEN. A value the native driver owns cannot be `setValue`d from JS, and a
 * `PanResponder` gesture has no native event to map — so the drag is JS-driven
 * and only the release animations use `useNativeDriver`. §2.11's rule is about
 * which PROPERTIES are animated, and both paths animate `transform` only.
 *
 * ⚠️ IT IS NOT DRAWN WHEN THE BASKET CANNOT BE COMMITTED — see `canCommit`. A
 * slide a thumb can complete over a sale that would be refused is worse than no
 * slide at all, and every refusal is a programming error that may never reach a
 * person (`R4`).
 *
 * ⚠️ BUILT ON `PanResponder` AND `Animated`, WHICH IS CORE REACT NATIVE. The
 * measurement that decided it: `react-native-gesture-handler` and
 * `react-native-reanimated` are installed as transitive dependencies and are
 * imported by NOTHING in `src/` — adding them means a babel plugin, a root view
 * and a native surface this app has never exercised, **on a build no CI
 * compiles.** Core RN costs a JS-driven drag and no new wiring.
 */
function Deslizador({
  compact = false,
  onCommit,
  onOpen,
}: {
  compact?: boolean;
  onCommit: () => void;
  /** A TAP opens the basket — ruled 2026-09-24. See the header. */
  onOpen: () => void;
}) {
  const { scale } = useDensity();
  const height = scale.tapTarget;
  const [track, setTrack] = useState(0);
  const travel = Math.max(0, track - height);

  const x = useRef(new Animated.Value(0)).current;
  // ⚠️ THE GESTURE READS REFS AND NOT STATE. `PanResponder` is built once, so a
  // handler closing over `travel` would hold the width measured on the first
  // frame — zero — for the life of the control.
  const span = useRef(0);
  span.current = travel;
  const done = useRef(false);

  const settle = (to: number) => {
    Animated.timing(x, {
      toValue: to,
      duration: 160,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  };

  const pan = useRef(
    PanResponder.create({
      // ⚠️⚠️ IT CLAIMS THE TOUCH, AND THE TAP IS READ ON RELEASE — which is the
      // SECOND design of this. The first wrapped the track in a `Pressable` and
      // spread `panHandlers` onto it; `Pressable` installs its OWN responder
      // handlers on the underlying view, so the two fight over one touch and
      // which wins is not something this file gets to decide.
      // ⚠️ **One responder, two readings, separated by `TAP_SLOP`** — nothing
      // sits behind this control, so claiming the touch costs nothing.
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_e, g) => {
        if (done.current) return;
        x.setValue(Math.min(Math.max(0, g.dx), span.current));
      },
      onPanResponderRelease: (_e, g) => {
        if (done.current) return;
        // ⚠️ A TOUCH THAT NEVER MOVED IS A TAP, AND IT OPENS THE BASKET.
        if (releaseTaps(g.dx)) {
          settle(0);
          onOpen();
          return;
        }
        const at = Math.min(Math.max(0, g.dx), span.current);
        if (releaseCommits(at, span.current)) {
          done.current = true;
          settle(span.current);
          // ⚠️ THE SALE IS COMMITTED WHEN THE GESTURE COMPLETES, not when the
          // animation acknowledging it ends — the thumb has already said so.
          onCommit();
        } else {
          settle(0);
        }
      },
      onPanResponderTerminate: () => settle(0),
    }),
  ).current;

  // ⚠️⚠️ A TAP OPENS THE BASKET — *"Let's make the carrito able to open by
  // tapping the slider as well"* (2026-09-24). ⚠️ **It costs the gesture
  // nothing**, and the reason is in `onMoveShouldSetPanResponder` above: the
  // pan claims the touch only once the finger has moved 4 pt, so a press that
  // never moves is still a press and a drag still cancels it.
  // ⚠️ **It is also what made the word *Cobrar* honest** — see `ES.sell.slide`.

  const fill = Animated.subtract(x, travel);

  return (
    <View
      accessibilityRole="button"
      accessibilityLabel={ES.sell.slide.label}
      onLayout={(e) => setTrack(e.nativeEvent.layout.width)}
      style={{
        height,
        borderRadius: height / 2,
        borderWidth: 1,
        borderColor: PALETTE.accion,
        backgroundColor: PALETTE.accionSuave,
        overflow: 'hidden',
        justifyContent: 'center',
      }}
      {...pan.panHandlers}
    >
      {/* The fill — a full-width block slid in from the left. See the header. */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: track,
          backgroundColor: PALETTE.accion,
          transform: [{ translateX: fill }],
        }}
      />

      {/* ⚠️ THE WORD FADES AS THE FILL ARRIVES — `opacity`, so it composites,
          and it is what stops green ink sitting on a green fill.
          ⚠️⚠️ IT IS ABSOLUTELY POSITIONED AND THE FIRST WRITING WAS NOT, which
          clipped it above the track on the simulator: a plain child of the track
          is a FLEX SIBLING of the thumb, so the two stacked in a column instead
          of overlaying. ⚠️ The horizontal padding is a whole `tapTarget` on each
          side so the words never sit under the thumb at either end. */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: height,
          opacity:
            travel === 0 ? 1 : x.interpolate({ inputRange: [0, travel], outputRange: [1, 0] }),
        }}
      >
        <Text
          numberOfLines={1}
          style={{
            textAlign: 'center',
            fontSize: compact ? scale.bodySize * 0.9 : scale.bodySize,
            fontWeight: '700',
            color: PALETTE.accion,
          }}
        >
          {ES.sell.slide.word}
        </Text>
      </Animated.View>

      <Animated.View
        style={{
          width: height,
          height,
          borderRadius: height / 2,
          backgroundColor: PALETTE.accion,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ translateX: x }],
        }}
      >
        <MaterialCommunityIcons
          name="chevron-double-right"
          size={scale.iconSize}
          color={PALETTE.superficie}
        />
      </Animated.View>
    </View>
  );
}

/**
 * ⚠️⚠️ C3.5's BASKET SHEET — the review before the commit, and one of the three
 * guards ADR-035 §2.8 calls *Error prevention*, *"none blocking"*. Plan task
 * `5f-iii-a`.
 *
 * ⚠️ IT LISTS ONLY THE ROWS CARRYING A QUANTITY, which is C3.3 read from the
 * other end: a quantity greater than zero IS the line, so the basket IS the
 * list. `reviewOf` has already narrowed it; this component narrows nothing.
 *
 * ⚠️ THE SAME FIELD AND THE SAME STEPPER AS THE LIST BEHIND IT — `Cantidad`,
 * the one this file already draws. A second quantity control on the review
 * screen would be a second set of rules about what a tap of `+` adds, and C3.8
 * is exacting about that. ⚠️ **It is also why the line total is here and not on
 * the list's row** (C3.4): this is the one surface where a customer is reading
 * the arithmetic over the shopkeeper's shoulder.
 *
 * ⚠️⚠️ AND THE ROWS SUM TO THE BAR BECAUSE THEY ARE THE BAR'S OWN ADDENDS,
 * not because two functions agree — see `reviewOf`. §2.5 rule 5 is written
 * about this screen by name.
 *
 * ⚠️ AN `RN` `Modal` AND NOT A ROUTE, decided here and recorded in `Vender`.
 *
 * ⚠️⚠️ `Quitar` REMOVES A LINE IMMEDIATELY — NO UNDO AND NO DIALOG, ruled by
 * the owner on 2026-09-17 against a session's own recommendation of a timed
 * *Deshacer*. The recovery is re-adding the item, two taps on the list behind
 * this sheet. ⚠️ **`Vaciar carrito` KEEPS its confirmation** and it is not an
 * inconsistency: emptying is a different act, and its recovery is not two taps.
 * The confirm word differs from the word that opens it, which is
 * `solicitudes.tsx`'s arrangement and its reason.
 */
function Carrito({
  open,
  onClose,
  review,
  entries,
  factors,
  onCommit,
  onEmpty,
  canSell,
  asking,
  emptied,
  bloom,
  onConfirmEmpty,
  onCancelEmpty,
}: {
  open: boolean;
  onClose: () => void;
  review: Review | null;
  entries: readonly CatalogEntry[];
  factors: UnitFactors;
  onCommit: () => void;
  onEmpty: () => void;
  canSell: boolean;
  asking: boolean;
  emptied: boolean;
  bloom: Animated.Value;
  onConfirmEmpty: () => void;
  onCancelEmpty: () => void;
}) {
  const { scale } = useDensity();
  const insets = useSafeAreaInsets();

  const rows = review === null ? [] : review.rows;

  return (
    <Modal
      visible={open}
      animationType="slide"
      transparent
      // ⚠️ ANDROID'S HARDWARE BACK CLOSES IT. Without this the button does
      // nothing on the one platform C1.1 puts two of in the pilot.
      onRequestClose={onClose}
    >
      <View style={{ flex: 1 }}>
        {/* ⚠️⚠️ THE VELO CLOSES THE SHEET WHEN TAPPED — ruled 2026-09-24:
            *"Make the Carrito close if the user taps in the scrim outside the
            carrito, not only in the Cerrar button."* ⚠️ **It shipped
            deliberately inert and the argument for that is now overruled**: a
            thumb reaching past the sheet for a row it can still see would
            dismiss it. He has the app in his hand and took the trade —
            tap-outside is what a sheet does, and `Cerrar` is still there.
            ⚠️ THE VELO IS A SEPARATE VIEW UNDER AN `opacity` RATHER THAN A
            TRANSLUCENT FILL ON THE CONTAINER: `opacity` on a parent dims its
            children, so painting it on the wrapper would put the sheet itself
            behind the dimming. ⚠️ And `R11` forbids a translucent literal by
            name — the hue is a role, `PALETTE.velo`, and the translucency is a
            number. The spelling is NOT repeated here: `conventions-gate.sh`
            reads this file, and a comment quoting a check's sentinel turns it
            red. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={ES.sell.cart.close}
          onPress={onClose}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
            opacity: 0.4,
            backgroundColor: PALETTE.velo,
          }}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, justifyContent: 'flex-end' }}
        >
          {/* ⚠️⚠️ A FIXED HEIGHT, RULED BY THE OWNER 2026-09-24 — *"let's just make
              the height of the carrito fixed and we just display the items there
              regardless of the number of items."* It shipped as `maxHeight`, so
              the sheet grew and shrank with the basket.
              ⚠️ **The reason it is better is muscle memory, not tidiness**: with
              a fixed card, `Vaciar carrito` and the slide are in the SAME PLACE
              on every sale, and the thumb that reaches for them at a counter does
              not have to look first. A sheet that resized put the commit control
              somewhere new on every basket.
              ⚠️ The cost is a mostly-empty card on a one-line basket, and that is
              the trade he took. */}
          <View
            style={{
              height: '72%',
              borderTopLeftRadius: scale.space,
              borderTopRightRadius: scale.space,
              backgroundColor: PALETTE.fondo,
              paddingBottom: insets.bottom,
            }}
          >
            <Encabezado onClose={onClose} />

            {/* ⚠️⚠️ THE SHEET STAYS PUT WHILE THE DIALOG IS UP. It shipped with
                the emptying confirmation REPLACING the sheet's body, and the
                owner refused that on 2026-09-24: the question and its answer
                belong in a box of their own, over everything, with its own
                scrim. See `Pregunta` below. */}
            <>
              <>
                <FlatList
                  // ⚠️ `flex: 1` NOW THAT THE CARD IS A FIXED HEIGHT. It was
                  // `flexGrow: 0 / flexShrink: 1` while the sheet sized to its
                  // content; with a fixed card the list takes the room the
                  // header and the foot do not, which is what pins the controls
                  // to the same place on every basket.
                  style={{ flex: 1 }}
                  data={rows}
                  keyExtractor={(row) => row.variantId}
                  renderItem={({ item }) => (
                    <Renglon
                      row={item}
                      entry={entries.find((e) => e.id === item.variantId)}
                      factors={factors}
                    />
                  )}
                  ItemSeparatorComponent={Separador}
                  ListEmptyComponent={<Vacio line={ES.sell.emptyCart} />}
                  keyboardShouldPersistTaps="handled"
                />

                {rows.length === 0 ? null : (
                  <Vaciar canSell={canSell} onCommit={onCommit} onAsk={onEmpty} onOpen={onClose} />
                )}
              </>
            </>
          </View>
        </KeyboardAvoidingView>

        {/* ⚠️ THE SAME QUESTION AS THE BAR ASKS, rendered inside this `Modal`
            because a sibling of the `Modal` would be behind it. `Vender` owns
            the state; `cartOpen` makes the two mount points exclusive. */}
        <Confirmacion
          asking={asking}
          emptied={emptied}
          bloom={bloom}
          onConfirm={onConfirmEmpty}
          onCancel={onCancelEmpty}
        />
      </View>
    </Modal>
  );
}

/** The sheet's heading, and the way out that is not a gesture. */
function Encabezado({ onClose }: { onClose: () => void }) {
  const { scale } = useDensity();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: scale.space,
        paddingVertical: scale.space,
        borderBottomWidth: 1,
        borderBottomColor: PALETTE.linea,
      }}
    >
      <Text style={{ fontSize: scale.bodySize, fontWeight: '700', color: PALETTE.tinta }}>
        {ES.sell.cart.title}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={ES.sell.cart.close}
        onPress={onClose}
        style={{ minHeight: scale.tapTarget, justifyContent: 'center', paddingHorizontal: scale.rowGap }}
      >
        <Text style={{ fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.accion }}>
          {ES.sell.cart.close}
        </Text>
      </Pressable>
    </View>
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
}: {
  row: ReviewRow;
  entry: CatalogEntry | undefined;
  factors: UnitFactors;
}) {
  const { scale } = useDensity();
  const remove = useCartStore((state) => state.remove);
  const gone = entry === undefined;

  return (
    <View
      style={{
        gap: scale.rowGap / 2,
        paddingVertical: scale.rowGap,
        paddingHorizontal: scale.space,
        backgroundColor: PALETTE.superficie,
      }}
    >
      {/* The name, and the figure the customer is checking it against. */}
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: scale.rowGap }}>
        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            fontSize: scale.bodySize,
            fontWeight: '600',
            color: gone ? PALETTE.tintaApagada : PALETTE.tinta,
          }}
        >
          {row.name ?? ES.sell.cart.goneName}
        </Text>
        <Text style={{ fontSize: scale.bodySize, fontWeight: '700', color: PALETTE.tinta }}>
          {row.centavos === null ? ES.catalog.noPrice : formatMXN(row.centavos)}
        </Text>
      </View>

      {/* ⚠️ `R11`: the state never travels as a colour alone. */}
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: scale.rowGap }}>
        <Text
          numberOfLines={1}
          style={{ flex: 1, fontSize: scale.bodySize * 0.85, color: PALETTE.tintaApagada }}
        >
          {gone ? ES.sell.cart.gone : (row.familyName ?? '')}
        </Text>
        {row.centavos === null && !gone ? (
          <Text style={{ fontSize: scale.bodySize * 0.85, fontWeight: '600', color: PALETTE.atencion }}>
            {ES.sell.noPrice}
          </Text>
        ) : null}
      </View>

      {/* The controls, on their own line — see this component's header. */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        {gone ? <View /> : <Cantidad entry={entry} base={row.base} factors={factors} />}

        {/* ⚠️ A WORD AND NOT A GLYPH, and the width is the reason as much as the
            clarity: an icon plus its word does not fit beside the stepper at
            `Letra grande`, and an icon alone on the one control that destroys
            something is the shape C12.1 refuses. ⚠️ `error` is the palette's own
            sentence for this role — it names `Quitar` first. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${ES.sell.cart.remove} ${row.name ?? ES.sell.cart.goneName}`}
          onPress={() => remove('sell', row.variantId)}
          style={{
            minHeight: scale.tapTarget,
            justifyContent: 'center',
            paddingHorizontal: scale.rowGap,
          }}
        >
          <Text style={{ fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.error }}>
            {ES.sell.cart.remove}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

/**
 * ⚠️⚠️ THE SHEET'S FOOT — `Vaciar carrito`, and **the second slide**.
 *
 * ⚠️ THE SLIDE HERE IS THE OWNER'S, RULED 2026-09-24: *"The slide bar should
 * also be present in the check out if we open the Carrito, to the right of the
 * Vaciar Carrito option, of course it will be shorter than the big one in the
 * default version but it should also show there to confirm the transaction."*
 * **So the review screen can complete the sale without being closed first** —
 * which is what makes the sheet a step in the sale rather than a detour from it.
 *
 * ⚠️ IT IS THE SAME `Deslizador`, NARROWER — one control, one set of rules about
 * what counts as a completed gesture. Two would be two answers to *how far is
 * far enough*, and `COMMIT_AT` exists so there is one.
 *
 * ⚠️ `Vaciar carrito` KEEPS ITS CONFIRMATION and `Quitar` does not: emptying is
 * a different act from removing one line, and its recovery is not two taps.
 * ⚠️ **The question itself is not here** — it is a centred box with its own
 * scrim, which is `Pregunta`, and the owner's specification.
 */
function Vaciar({
  onAsk,
  onCommit,
  onOpen,
  canSell,
}: {
  onAsk: () => void;
  onCommit: () => void;
  /** ⚠️ A TAP ON THE TRACK INSIDE THE SHEET CLOSES IT, because the basket it
   *  would open is already open — the same gesture, read where it is. */
  onOpen: () => void;
  canSell: boolean;
}) {
  const { scale } = useDensity();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale.space,
        paddingHorizontal: scale.space,
        paddingVertical: scale.space,
        borderTopWidth: 1,
        borderTopColor: PALETTE.linea,
        backgroundColor: PALETTE.banda,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={ES.sell.cart.empty}
        onPress={onAsk}
        style={{ minHeight: scale.tapTarget, justifyContent: 'center' }}
      >
        <Text style={{ fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.error }}>
          {ES.sell.cart.empty}
        </Text>
      </Pressable>

      {/* ⚠️ `flex: 1` GIVES THE TRACK EVERY POINT `Vaciar carrito` DOES NOT USE.
          It is the short track by construction rather than by a fixed width,
          which is what keeps it honest at `Letra grande`, where the words are
          wider and the track is correspondingly shorter. */}
      {canSell ? (
        <View style={{ flex: 1 }}>
          <Deslizador compact onCommit={onCommit} onOpen={onOpen} />
        </View>
      ) : null}
    </View>
  );
}

/**
 * ⚠️⚠️ THE EMPTYING QUESTION AND ITS ANSWER — a centred box with its own scrim,
 * the owner's specification of 2026-09-24.
 *
 * ⚠️ IT IS RENDERED FROM TWO PLACES AND IS ONE COMPONENT WITH ONE STATE: the
 * bar asks it when the basket is closed, the sheet asks it when the basket is
 * open, and `Vender` owns `asking`/`emptied` so the two can never disagree.
 * **Two copies of this would be two questions that drift apart**, which is the
 * defect this repository has recorded six of in its own documents.
 *
 * ⚠️ ITS OWN SCRIM IS A SECOND `velo`, so the sheet behind it dims the way the
 * list behind the sheet does — the depth reads as depth.
 */
function Confirmacion({
  asking,
  emptied,
  bloom,
  onConfirm,
  onCancel,
}: {
  asking: boolean;
  emptied: boolean;
  bloom: Animated.Value;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { scale } = useDensity();
  if (!asking && !emptied) return null;

  return (
    <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          opacity: 0.4,
          backgroundColor: PALETTE.velo,
        }}
      />
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: scale.space * 2,
        }}
      >
        <View
          style={{
            width: '100%',
            // ⚠️ NO `maxWidth` — `R6`, and the gate caught it once. A cap in
            // points is a size `Letra grande` cannot change; the wrapper's own
            // padding is what keeps the box off the edges, and that scales.
            borderRadius: scale.space,
            backgroundColor: PALETTE.fondo,
            padding: scale.space * 1.5,
            gap: scale.space,
          }}
        >
          {emptied ? <Vaciado bloom={bloom} /> : <Pregunta onConfirm={onConfirm} onCancel={onCancel} />}
        </View>
      </View>
    </View>
  );
}

/**
 * ⚠️⚠️ THE QUESTION, IN A BOX OF ITS OWN — the owner's specification of
 * 2026-09-24, replacing the inline strip that shipped with `5f-iii-a`:
 * *"¿Seguro de que quieres vaciar el carrito? Si, vaciar / Cancelar."*
 *
 * ⚠️ THE CONFIRM WORD IS NOT THE WORD THAT OPENED IT — `solicitudes.tsx`'s
 * arrangement: two taps that read the same are two taps a shopkeeper cannot
 * tell apart once she has made the first one.
 *
 * ⚠️ `Cancelar` IS DRAWN IN `accion` AND `Sí, vaciar` IN `error`, which is the
 * palette's own sentence applied rather than a preference: `error` is *what
 * DESTROYS*, and the way out of a destructive question is not itself
 * destructive.
 */
function Pregunta({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  const { scale } = useDensity();
  return (
    <>
      <Text
        style={{
          fontSize: scale.bodySize,
          fontWeight: '600',
          color: PALETTE.tinta,
          textAlign: 'center',
        }}
      >
        {ES.sell.cart.emptyAsk}
      </Text>
      <View style={{ gap: scale.rowGap }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={ES.sell.cart.emptyConfirm}
          onPress={onConfirm}
          style={{
            minHeight: scale.tapTarget,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: scale.space / 2,
            borderWidth: 1,
            borderColor: PALETTE.error,
          }}
        >
          <Text style={{ fontSize: scale.bodySize, fontWeight: '700', color: PALETTE.error }}>
            {ES.sell.cart.emptyConfirm}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={ES.sell.cart.emptyCancel}
          onPress={onCancel}
          style={{
            minHeight: scale.tapTarget,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: scale.space / 2,
            backgroundColor: PALETTE.accionSuave,
          }}
        >
          <Text style={{ fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.accion }}>
            {ES.sell.cart.emptyCancel}
          </Text>
        </Pressable>
      </View>
    </>
  );
}

/**
 * ⚠️⚠️ THE CONFIRMATION THE OWNER ASKED FOR WHEN THE BASKET IS EMPTIED. The
 * animation is driven from `Carrito`'s effect — see the argument there for why
 * it is not started where the tap happens.
 *
 * ⚠️ `opacity` AND `scale` AND NOTHING ELSE (§2.11). ⚠️ AND IT CARRIES A WORD:
 * motion with no language is a state announced on the one channel a person can
 * miss by looking away, which is `R11`'s argument about colour applied where
 * there is no text at all.
 */
function Vaciado({ bloom }: { bloom: Animated.Value }) {
  const { scale } = useDensity();
  return (
    <View style={{ alignItems: 'center', gap: scale.rowGap, padding: scale.space * 2 }}>
      <Animated.View
        style={{
          opacity: bloom,
          transform: [{ scale: bloom.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }],
          alignItems: 'center',
          gap: scale.rowGap,
        }}
      >
        <MaterialCommunityIcons
          name="check-circle-outline"
          size={scale.iconSize * 2}
          color={PALETTE.accion}
        />
        <Text style={{ fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.tinta }}>
          {ES.sell.cart.emptied}
        </Text>
      </Animated.View>
    </View>
  );
}

/**
 * ⚠️⚠️ THE SALE'S OWN CONFIRMATION — the first of the two animations the owner
 * asked for on 2026-09-21 in place of the change calculation he deferred:
 * *"a simple confirmation animation if the sale is done."*
 *
 * ⚠️⚠️ IT FIRES ON **ENQUEUE**, NEVER ON THE SERVER'S REPLY. C10.3 says the
 * slide looks identical offline, and `5c-i` made that structural by having
 * `queueWrite` return a ROW rather than a promise. **An animation that awaited
 * Postgres would be the offline path looking different — the one thing that
 * design exists to prevent, undone in the place nobody would test it**, because
 * every desk this was written at has a working connection.
 *
 * ⚠️ `transform` AND `opacity` ONLY (§2.11), and **started in an effect rather
 * than in the handler that mounts it** — on the native driver the other way
 * round fails silently: no error, no motion.
 *
 * ⚠️ IT SITS OVER THE WHOLE SCREEN AND TAKES NO TOUCHES. The basket is already
 * gone by the time it draws, so there is nothing behind it to protect — but a
 * shopkeeper mid-reach for the next product must not have this swallow the tap.
 */
function Vendido({ shown, onDone }: { shown: boolean; onDone: () => void }) {
  const { scale } = useDensity();
  const bloom = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!shown) return;
    bloom.setValue(0);
    const run = Animated.sequence([
      Animated.timing(bloom, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.delay(520),
      Animated.timing(bloom, {
        toValue: 0,
        duration: 220,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]);
    run.start(({ finished }) => {
      if (finished) onDone();
    });
    return () => run.stop();
  }, [shown, bloom, onDone]);

  if (!shown) return null;

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Animated.View
        style={{
          alignItems: 'center',
          gap: scale.rowGap,
          paddingHorizontal: scale.space * 2,
          paddingVertical: scale.space * 1.5,
          borderRadius: scale.space,
          backgroundColor: PALETTE.fondo,
          opacity: bloom,
          transform: [{ scale: bloom.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }],
        }}
      >
        <MaterialCommunityIcons
          name="check-circle-outline"
          size={scale.iconSize * 2}
          color={PALETTE.accion}
        />
        <Text style={{ fontSize: scale.bodySize, fontWeight: '700', color: PALETTE.tinta }}>
          {ES.sell.sold}
        </Text>
      </Animated.View>
    </View>
  );
}

/**
 * One line between two rows, and never under the last one.
 *
 * ⚠️ A BORDER AND NOT A ONE-PIXEL BOX, which is `R6` and not taste — a `height`
 * is a size a person looks at, and `1` here would be the one measurement on
 * this screen that *Letra grande* could not change. `productos.tsx` records the
 * same refusal; the gate caught this file making it a second time.
 */
function Separador() {
  return <View style={{ borderBottomWidth: 1, borderBottomColor: PALETTE.linea }} />;
}

/**
 * The three empty states, which are three different facts — a catalog still
 * loading, a shop with no products, and a search that matched none. The
 * sentence is `catalogLine`'s (`5d-i`), so this screen and Productos never
 * disagree about which one it is.
 */
function Vacio({ line }: { line: string }) {
  const { scale } = useDensity();
  return (
    <View style={{ padding: scale.space * 2 }}>
      <Text style={{ fontSize: scale.bodySize, color: PALETTE.tintaApagada, textAlign: 'center' }}>
        {line}
      </Text>
    </View>
  );
}
