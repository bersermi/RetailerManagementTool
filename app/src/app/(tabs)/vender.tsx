import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import {
  Animated,
  Easing,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
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
import { baseFromShown, qtyShown, shownUnitOf } from '@/cart/quantity';
import { useCart, useCartStore } from '@/cart/store';
import { formatMXN } from '@/format/mxn';
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
  const { loading, entries, failed } = useCatalog('');
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

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: PALETTE.fondo, paddingTop: insets.top }}
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

      <Barra basket={basket} onOpen={() => setCartOpen(true)} />

      <Carrito
        open={cartOpen}
        onClose={closeCart}
        review={review}
        entries={entries}
        factors={factors}
      />
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
 * ⚠️ C3.4's STICKY BAR — `Total`, and the control that OPENS the review. The
 * commit control is still `5f-iii-b`'s, so nothing here writes anything.
 *
 * ⚠️ IT IS DRAWN ON AN EMPTY BASKET TOO, which is why `ES.sell.emptyCart`
 * exists: a bar that appeared on the first tap would move the list under a
 * thumb already reaching for the second one.
 *
 * ⚠️⚠️ AND THE WHOLE BAR IS THE TAP TARGET ONCE THERE IS SOMETHING TO REVIEW —
 * a strip the width of the screen, which is the largest target this layout can
 * offer the C1.2 hands it is drawn for. ⚠️ It carries `Ver carrito` and a
 * chevron rather than relying on the strip being obviously tappable: C12.1
 * refuses a glyph with no word, and a shopkeeper who has not been told a bar
 * opens does not press it. ⚠️ **On an empty basket it is a `View` and not a
 * disabled `Pressable`** — there is nothing to review, and a control that
 * looks live and does nothing is the shape this repository refuses by name.
 *
 * ⚠️⚠️ A BASKET WITH AN UNPRICEABLE LINE SHOWS THE TOTAL **AND SAYS SO**. That
 * is `reviewOf`'s `complete`, and it is deliberately not a decision: C3.13
 * blocks a purchase and C3.14 lets a sale through loudly, and those two answers
 * belong to `5g` and `5h`. What this bar owes is that the number is not read as
 * the whole of what the customer owes.
 */
function Barra({ basket, onOpen }: { basket: Basket | null; onOpen: () => void }) {
  const { scale } = useDensity();
  const live = basket !== null && basket.lines > 0;
  const Strip = live ? Pressable : View;
  return (
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
        borderTopWidth: 1,
        borderTopColor: PALETTE.linea,
        backgroundColor: PALETTE.banda,
      }}
    >
      <View style={{ gap: scale.rowGap / 4 }}>
        <Text style={{ fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.tinta }}>
          {ES.sell.total}
        </Text>
        <Text style={{ fontSize: scale.bodySize * 0.85, color: PALETTE.tintaApagada }}>
          {basket === null || basket.lines === 0 ? ES.sell.emptyCart : ES.sell.lines(basket.lines)}
        </Text>
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
        {live ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale.rowGap / 4 }}>
            <Text style={{ fontSize: scale.bodySize * 0.85, fontWeight: '600', color: PALETTE.accion }}>
              {ES.sell.cart.open}
            </Text>
            <MaterialCommunityIcons
              name="chevron-right"
              size={scale.iconSize}
              color={PALETTE.accion}
            />
          </View>
        ) : null}
      </View>
    </Strip>
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
}: {
  open: boolean;
  onClose: () => void;
  review: Review | null;
  entries: readonly CatalogEntry[];
  factors: UnitFactors;
}) {
  const { scale } = useDensity();
  const insets = useSafeAreaInsets();
  const clear = useCartStore((state) => state.clear);

  // ⚠️ TWO STATES AND NOT ONE. `asking` is the confirmation; `emptied` is the
  // moment after it, and it exists only so that the animation below has
  // something to run ON. Folding them makes the sheet close before the
  // confirmation the owner asked for has been seen.
  const [asking, setAsking] = useState(false);
  const [emptied, setEmptied] = useState(false);

  const bloom = useRef(new Animated.Value(0)).current;

  // ⚠️⚠️ THE OWNER'S CONFIRMATION ANIMATION — *"another one if we empty the
  // carrito"* (2026-09-21), in place of the change calculation he deferred.
  //
  // ⚠️ `transform` AND `opacity` ONLY (§2.11). That is a performance rule
  // before it is a taste one: C1.1 puts two low-end Androids among the pilot's
  // four phones, and those two properties run on the compositor while layout,
  // colour and shadow do not.
  //
  // ⚠️⚠️ AND IT IS STARTED IN AN EFFECT RATHER THAN IN THE HANDLER THAT MOUNTS
  // THE VIEW, which on the native driver is the difference between motion and
  // silence: a driver attached to a view that is not laid out yet fails with no
  // error and no animation. The handler sets `emptied`; this effect runs after
  // the render that mounts the glyph.
  //
  // ⚠️ THE SHEET CLOSES ON THE ANIMATION'S OWN COMPLETION and not on a timer —
  // one mechanism, and nothing to keep in step with a duration.
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
      onClose();
    });
    return () => run.stop();
  }, [emptied, bloom, onClose]);

  // ⚠️⚠️ THE SHEET DOES NOT CLOSE ITSELF WHEN THE LAST LINE GOES, AND THE FIRST
  // WRITING OF THIS FILE DID — a one-line effect on `cart.length` in `Vender`,
  // which read as tidy and **broke the animation above**: `Vaciar` empties the
  // basket, so that effect unmounted this `Modal` in the same commit that set
  // `emptied`, and the confirmation the owner asked for played on nothing. ⚠️ It
  // is also wrong on its own terms: `Quitar` on the last line is a removal, not
  // a decision to leave, and a sheet that vanished under the thumb would take
  // the list's scroll position with it. The empty state and `Cerrar` say it
  // instead.
  //
  // ⚠️ THE CONFIRMATION IS FORGOTTEN WHEN THE SHEET CLOSES. A `Vaciar` left
  // half-asked and reopened an hour later would put *Sí, vaciar* under a thumb
  // that came back for something else.
  useEffect(() => {
    if (!open) setAsking(false);
  }, [open]);

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
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        {/* ⚠️ THE VELO IS A SEPARATE VIEW UNDER AN `opacity` RATHER THAN A
            TRANSLUCENT FILL ON THE CONTAINER. `opacity` on a parent dims its
            children, so painting it on the wrapper would put the sheet itself
            behind the dimming. ⚠️ And `R11` forbids a translucent literal by
            name — the rule's own page spells the one this would have been:
            the hue is a role, `PALETTE.velo`, and the translucency is a number.
            ⚠️ The spelling is NOT repeated here: `conventions-gate.sh` reads
            this file, and a comment quoting a check's sentinel turns it red,
            which is this repository's *never spell a sentinel in the file it
            reads* caught by the guard it describes.
            ⚠️ IT IS NOT A `Pressable`: tap-to-dismiss would put a dismissal
            under the thumb of a shopkeeper reaching past the sheet for the row
            she can still see, and `Cerrar` is one tap away at the top. */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: 0.4,
            backgroundColor: PALETTE.velo,
          }}
        />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View
            style={{
              maxHeight: '85%',
              borderTopLeftRadius: scale.space,
              borderTopRightRadius: scale.space,
              backgroundColor: PALETTE.fondo,
              paddingBottom: insets.bottom,
            }}
          >
            <Encabezado onClose={onClose} />

            {emptied ? (
              <Vaciado bloom={bloom} />
            ) : (
              <>
                <FlatList
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
                  <Vaciar
                    asking={asking}
                    onAsk={() => setAsking(true)}
                    onCancel={() => setAsking(false)}
                    onConfirm={() => {
                      setAsking(false);
                      clear('sell');
                      setEmptied(true);
                    }}
                  />
                )}
              </>
            )}
          </View>
        </KeyboardAvoidingView>
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
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale.rowGap,
        minHeight: scale.rowHeight,
        paddingVertical: scale.rowGap,
        paddingHorizontal: scale.space,
        backgroundColor: PALETTE.superficie,
      }}
    >
      <View style={{ flex: 1, gap: scale.rowGap / 4 }}>
        <Text
          numberOfLines={1}
          style={{
            fontSize: scale.bodySize,
            fontWeight: '600',
            color: gone ? PALETTE.tintaApagada : PALETTE.tinta,
          }}
        >
          {row.name ?? ES.sell.cart.goneName}
        </Text>
        {/* ⚠️ `R11`: the state never travels as a colour alone. */}
        <Text numberOfLines={1} style={{ fontSize: scale.bodySize * 0.85, color: PALETTE.tintaApagada }}>
          {gone ? ES.sell.cart.gone : (row.familyName ?? '')}
        </Text>
      </View>

      {gone ? null : (
        <Cantidad entry={entry} base={row.base} factors={factors} />
      )}

      <View style={{ alignItems: 'flex-end', minWidth: scale.tapTarget * 1.5 }}>
        <Text style={{ fontSize: scale.bodySize, fontWeight: '700', color: PALETTE.tinta }}>
          {row.centavos === null ? ES.catalog.noPrice : formatMXN(row.centavos)}
        </Text>
        {row.centavos === null && !gone ? (
          <Text style={{ fontSize: scale.bodySize * 0.85, fontWeight: '600', color: PALETTE.atencion }}>
            {ES.sell.noPrice}
          </Text>
        ) : null}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${ES.sell.cart.remove} ${row.name ?? ES.sell.cart.goneName}`}
        onPress={() => remove('sell', row.variantId)}
        style={{
          minWidth: scale.tapTarget,
          minHeight: scale.tapTarget,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* ⚠️ `error` AND NOT A MUTED GREY — the palette's own sentence for that
            role names `Quitar` first: *what DESTROYS*. On a review screen it is
            what separates the control that removes a line from the two beside
            it that only change its size. */}
        <MaterialCommunityIcons name="close" size={scale.iconSize} color={PALETTE.error} />
      </Pressable>
    </View>
  );
}

/**
 * `Vaciar carrito`, and the one removal in this app that asks first.
 *
 * ⚠️ THE CONFIRM WORD IS NOT THE WORD THAT OPENED IT — `solicitudes.tsx`'s
 * arrangement: two taps that read the same are two taps a shopkeeper cannot
 * tell apart once she has made the first one.
 */
function Vaciar({
  asking,
  onAsk,
  onCancel,
  onConfirm,
}: {
  asking: boolean;
  onAsk: () => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { scale } = useDensity();
  const frame = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: scale.rowGap,
    paddingHorizontal: scale.space,
    paddingVertical: scale.space,
    borderTopWidth: 1,
    borderTopColor: PALETTE.linea,
    backgroundColor: PALETTE.banda,
  };

  if (!asking) {
    return (
      <View style={frame}>
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
      </View>
    );
  }

  return (
    <View style={frame}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={ES.sell.cart.emptyConfirm}
        onPress={onConfirm}
        style={{ minHeight: scale.tapTarget, justifyContent: 'center' }}
      >
        <Text style={{ fontSize: scale.bodySize, fontWeight: '700', color: PALETTE.error }}>
          {ES.sell.cart.emptyConfirm}
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={ES.sell.cart.emptyCancel}
        onPress={onCancel}
        style={{ minHeight: scale.tapTarget, justifyContent: 'center' }}
      >
        <Text style={{ fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.accion }}>
          {ES.sell.cart.emptyCancel}
        </Text>
      </Pressable>
    </View>
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
