import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { FlatList, Keyboard, Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { catalogLine, search, type CatalogEntry, type UnitFactors } from '@/api/catalog';
import { useCatalog, useUnitFactors, useWorkspace } from '@/api/hooks';
import { basketOf, stepOf, type Basket } from '@/cart/cart';
import { baseFromShown, qtyShown, shownUnitOf } from '@/cart/quantity';
import { useCart, useCartStore } from '@/cart/store';
import { formatMXN } from '@/format/mxn';
import { ES } from '@/strings';
import { useDensity } from '@/theme/DensityProvider';
import { PALETTE } from '@/theme/palette';

// ============================================================================
// VENDER — the counter. Plan task `5f-ii`, the second child of `5f`, and the
// highest-traffic surface in this app.
//
// ⚠️⚠️ IT COMMITS NOTHING AND WRITES NOTHING, AND THAT IS THE SPLIT RATHER THAN
// AN OMISSION. The basket sheet, the slide-to-commit, `Quitar`, `Vaciar` and
// the first call `queueWrite` has ever had are `5f-iii`. What is here is the
// list, the row, the quantity control and the sticky `Total` — everything a
// shopkeeper touches BEFORE she decides the sale is a sale.
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
  const basket: Basket | null =
    workspace === null ? null : basketOf(cart, entries, 'sell', workspace.pricesIncludeTax);

  return (
    <View style={{ flex: 1, backgroundColor: PALETTE.fondo, paddingTop: insets.top }}>
      <Buscador value={typed} onChange={setTyped} box={box} />

      <FlatList
        // ⚠️ A `FlatList` FOR `productos.tsx`'s REASON: C8.3 puts ~100 products
        // in the pilot catalog and C1.1 puts two low-end Androids among its four
        // phones, and a `ScrollView` mounts every row at once.
        data={rows}
        keyExtractor={(entry) => entry.id}
        renderItem={({ item }) => <Fila entry={item} factors={factors} />}
        ItemSeparatorComponent={Separador}
        ListEmptyComponent={<Vacio line={catalogLine(loading, typed, failed)} />}
        contentContainerStyle={{ paddingBottom: scale.space }}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      />

      <Barra basket={basket} />
    </View>
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
function Fila({ entry, factors }: { entry: CatalogEntry; factors: UnitFactors }) {
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

      <Cantidad entry={entry} base={base} factors={factors} />
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
}: {
  entry: CatalogEntry;
  base: number;
  factors: UnitFactors;
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
          onBlur={() => setDraft(null)}
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
 * ⚠️ C3.4's STICKY BAR — `Total`, and the commit control that is `5f-iii`'s.
 *
 * ⚠️ IT IS DRAWN ON AN EMPTY BASKET TOO, which is why `ES.sell.emptyCart`
 * exists: a bar that appeared on the first tap would move the list under a
 * thumb already reaching for the second one.
 *
 * ⚠️⚠️ A BASKET WITH AN UNPRICEABLE LINE SHOWS THE TOTAL **AND SAYS SO**. That
 * is `basketOf`'s `complete`, and it is deliberately not a decision: C3.13
 * blocks a purchase and C3.14 lets a sale through loudly, and those two answers
 * belong to `5g` and `5h`. What this bar owes is that the number is not read as
 * the whole of what the customer owes.
 */
function Barra({ basket }: { basket: Basket | null }) {
  const { scale } = useDensity();
  return (
    <View
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
      </View>
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
