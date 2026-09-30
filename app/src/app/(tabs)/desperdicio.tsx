import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useCallback, useEffect, useRef, useState } from 'react';
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
import { useCatalog, useMagnitude, useUnitFactors, useWorkspace } from '@/api/hooks';
import { magnitudeNote, outsized, type Typical, type Typicals } from '@/api/magnitude';
import {
  WASTE_REASONS,
  reasonHint,
  reasonLabel,
  type WasteReason,
} from '@/api/waste';
import { reviewOf, type Review, type ReviewRow } from '@/cart/cart';
import { canCommit, commitOf, type Basketful } from '@/cart/commit';
import { useCart, useCartStore, useReason } from '@/cart/store';
import { commitToQueue } from '@/lib/commitRunner';
import { newWriteId, nowIso } from '@/lib/ids';
import { usePilotVisit } from '@/pilot/usePilotVisit';
import { ES } from '@/strings';
import { useDensity } from '@/theme/DensityProvider';
import { PALETTE } from '@/theme/palette';
import { DONE_HOLD_MS, DONE_IN_MS, DONE_OUT_MS, EMPTIED_BLOOM_MS } from '@/theme/pulse';
import { Boton } from '@/ui/Boton';
import { BotonLleno } from '@/ui/BotonLleno';
import { Buscador } from '@/ui/Buscador';
import { Cantidad } from '@/ui/Cantidad';
import { Deslizador } from '@/ui/Deslizador';
import { Frase } from '@/ui/Frase';
import { Separador } from '@/ui/Separador';
import { TecladoListo } from '@/ui/TecladoListo';
import { Vacio } from '@/ui/Vacio';
import { Velo } from '@/ui/Velo';

// ============================================================================
// DESPERDICIO — what the shop lost, and why. Plan task `6a-i`.
//
// ⚠️⚠️ IT IS THE THIRD CAPTURE SCREEN AND THE FIRST CALLER `record_waste` HAS
// EVER HAD. `0019` was applied on 2026-09-05 with 67 behavioural checks and ten
// falsifications against it, and **nothing in this app called it for
// twenty-two days** — the tab has been nine lines of `Pendiente` since `5a-ii`.
// Everything the write needs was already here: `WRITE_KINDS` has held `waste`
// since `5c-i`, `RECORD_RPC` has named the function since `5c-ii-a`, and
// `classify` has known how to dead-letter it since `5c-iii`. **What was missing
// is a basket, a cause and a screen.**
//
// ⚠️ THE OWNER REORDERED THIS AHEAD OF ITS STEP ON 2026-09-21, and the reason is
// commercial rather than technical: waste is the acquisition hook, and until
// this screen exists the tier-2 investigation has no input at all. `7c` (*what
// am I throwing away*) and `7e` (*what is at RISK of becoming waste*) are both
// gated on it, and `7e` needs **weeks** of records before it says anything — so
// the pilot's clock on that signal starts the day this ships.
//
// ----------------------------------------------------------------------------
// ⚠️⚠️ REASON-FIRST, AND IT IS THE ONE THING ABOUT THIS SCREEN THE ADR ACTUALLY
// SPECIFIES
// ----------------------------------------------------------------------------
// §2.8's whole row for this module is six words: *"Reason-first waste entry |
// Feeds the analytics asset."* So the cause is asked BEFORE the catalog is
// shown, which is exactly what C3.11 does to Comprar with the provider — and
// this screen is deliberately built as that screen's shape rather than as a new
// one.
//
// ⚠️⚠️ ONE CAUSE PER DOCUMENT, WHICH IS A DECISION AND NOT A READING OF THE
// SCHEMA. `reason` is a column on `waste_line`, so a document CAN mix causes —
// measured, against a real PostgREST: the same variant twice under `caducado`
// and `dañado` is **two rows and an HTTP 200**, and so is the same variant twice
// under the SAME cause. The database dedupes nothing. **The screen asks once**,
// because *reason-first* describes a question in front of the catalog and not a
// field on every row, and because a bin round is one act. ⚠️ Two shapes of loss
// are two documents. See `CartLine` in `@/cart/cart` for what reversing costs.
//
// ⚠️⚠️ AND THERE IS NO OPENING DEFAULT, WHICH IS WHERE THIS DIVERGES FROM
// COMPRAR ON PURPOSE. `5g-ii`'s picker opens with the generic provider already
// marked, one tap away, because *"I bought this at the market this morning"* is a
// real answer. **There is no generic cause**, and `0019` says why in its own
// header: *"an enum with a default would quietly file every unlabelled loss
// under one cause."* So the window opens on nothing chosen and has no `Cerrar`.
//
// ----------------------------------------------------------------------------
// ⚠️⚠️ THERE IS NO PESO TOTAL ON THIS SCREEN, AND THAT IS ÁREA 9's RULING RATHER
// THAN A SIMPLIFICATION
// ----------------------------------------------------------------------------
// Ruled 2026-09-14 and written into the plan as a constraint on the session that
// builds this: ***"Números and Desperdicio SHOW WASTE AS QUANTITY AND NOT AS
// COST OR AS A RATE, until something fixes `0011`."***
//
// ⚠️ SO C3.4's STICKY BAR COUNTS PRODUCTS WHERE VENDER'S SUMS PESOS, and the
// sheet's rows carry no line total. **That is the half a session would leave in
// by copying `vender.tsx`**, and it would be wrong in the specific way the
// ruling names: C8.2 has the owner seeding this catalog DELIBERATELY SHORT, so a
// peso figure here would read `$0.00` for exactly the products most likely to
// spoil — *"a screen that tells a shopkeeper her waste cost her nothing"*, which
// the ruling calls the one thing worse than a number that is missing.
//
// ⚠️ THE RETAIL VALUE IS STILL RECORDED. `waste.total_net` carries it and
// `waste_line.line_net` carries it per line; what is refused is REPORTING it
// here. When somebody decides it should be shown, the data is already there.
//
// ⚠️⚠️ AND IT IS WHAT MAKES THE UNPRICED LINE INVISIBLE TO A SHOPKEEPER RATHER
// THAN SOMETHING SHE HAS TO UNDERSTAND. `@/cart/cart`'s `UNPRICED_WASTE` sends a
// zero for a product with no shelf price, because `0019` REQUIRES the price key
// and a loss not recorded destroys the only record of it. With no money on
// screen there is no `$0.00` to mislead her and no `Falta un precio` to explain
// — the quantity, which is the number the report reads, is exact either way.
// **The row still shows the catalog's own dash (C3.12), because that is the
// catalog's label and not this screen's arithmetic.**
//
// ----------------------------------------------------------------------------
// ⚠️ WHAT IS DELIBERATELY NOT HERE, AND IT IS `6a-ii`
// ----------------------------------------------------------------------------
// **No list of past write-offs, and no `Corregir` / `Eliminar`.** `5h-ii-a` named
// that gap when it shipped `Lo último` — *"a queued waste is still invisible… it
// closes when `6a` gets a list of its own"* — and the split found why it cannot
// close here: **`waste_line_select` is manager-and-above (`0003:596`) while
// `waste_select` is not**, the only asymmetric pair in this schema. Measured: an
// Empleada reading her own waste document gets **HTTP 200 and
// `"waste_line": []`** — a header with no products, not a refusal. `0003:589`
// already says what fixes it (*"the reason-and-quantity view for Desperdicio
// ships with that screen"*) and that is a MIGRATION and a ruling about who may
// see what, so it is its own row and its own question.
//
// ⚠️ `Eliminar` ALONE WOULD WORK TODAY — `void_transaction` takes `waste` and a
// cashier passed it in a probe — because voiding needs only the header. It is
// held back with `Corregir` rather than shipped alone: half an undo on the one
// screen with no history is a button that cancels something she cannot see.
//
// ----------------------------------------------------------------------------
// ⚠️ THE OWNER'S PHONE IS THE WHOLE INSTRUMENT (`R9`, §2.11). Every judgement
// left in this file is rendering, navigation or layout, and no check in this
// repository will ever say it is wrong. The half that IS checkable was pushed
// out: the vocabulary is `@/api/waste`, the arithmetic and the payload are
// `@/cart/cart`, and the wire is `docs/checks/6a-i-waste-contract.sh`.
//
// ⚠️ THE KEYBOARD, THE SEARCH, THE SHEET, THE SLIDE AND THE TWO ANIMATIONS ARE
// `vender.tsx`'s, primitive for primitive — `Buscador`, `Cantidad`,
// `Deslizador`, `Separador`, `TecladoListo`, `Vacio`, `Boton` and `Frase`, all
// eight of `src/ui/`. **Nothing new was invented for this screen**, which is
// `R14` read from the other end and is the dividend `5h.5` bought the day
// before.
// ============================================================================

/**
 * The bar carrying *Listo* above the quantity pad.
 *
 * ⚠️ ITS OWN ID AND NOT VENDER'S: `InputAccessoryView` matches an input to a bar
 * by STRING EQUALITY, and a shared spelling across two mounted screens is a bar
 * that attaches to whichever mounted last.
 */
const PAD_ID = 'wera.waste.pad';

export default function Desperdicio() {
  const { scale } = useDensity();
  const insets = useSafeAreaInsets();

  // ⚠️ THE SAME LIST AS PRODUCTOS AND VENDER, READ A THIRD TIME — C3.1, *"there
  // are no buy-only or sell-only subsets"*, which holds a third time: anything
  // the shop sells is something the shop can lose. ⚠️ UNFILTERED, and narrowed
  // for the LIST only — `vender.tsx`'s own measurement.
  const { loading, entries, failed, locationId } = useCatalog('');
  const factors = useUnitFactors();
  // ⚠️⚠️ §2.8's THIRD GUARD, AND IT EARNS ITS PLACE HERE MORE THAN ON EITHER
  // OTHER SCREEN. `outsized` compares a quantity against what this shop usually
  // buys, and a write-off is the one document with **nobody on the other side of
  // it**: a customer queries a sale and a supplier queries a delivery, and
  // `9999 kg` of tomato going in the bin is queried by no one. `null` for the
  // price, because a write-off has no typed figure — `quoteFor` takes the shelf
  // price off the catalog, exactly as on a sale.
  const typicals = useMagnitude();
  const workspace = useWorkspace();

  const [typed, setTyped] = useState('');
  const box = useRef<TextInput>(null);
  const rows = search(entries, typed);

  const list = useRef<FlatList<CatalogEntry>>(null);
  const editing = useRef<number | null>(null);

  // ⚠️ IT WAITS FOR THE KEYBOARD TO BE UP rather than firing on focus, which is
  // `vender.tsx`'s measurement: scrolling on focus centres the row in a viewport
  // that is about to shrink, and the resize pushes it back down.
  useEffect(() => {
    const up = Keyboard.addListener('keyboardDidShow', () => {
      const at = editing.current;
      if (at === null || at < 0) return;
      list.current?.scrollToIndex({ index: at, viewPosition: 0.5, animated: true });
    });
    return () => up.remove();
  }, []);

  const cart = useCart('waste');
  const reason = useReason();
  const openShop = useCartStore((state) => state.openShop);
  const openReason = useCartStore((state) => state.openReason);
  const clear = useCartStore((state) => state.clear);

  // ⚠️ THE GUARD IS THE WHOLE POINT AND NOT DEFENSIVE — `vender.tsx`'s note:
  // `openShop(null)` on a store restored from disk means *the shop changed* and
  // drops the basket, and `useWorkspace` answers `null` on every cold start.
  useEffect(() => {
    if (workspace !== null) openShop(workspace.id);
  }, [workspace, openShop]);

  // ⚠️⚠️ THE PICKER OPENS THE SCREEN WHENEVER NO CAUSE IS CHOSEN, AND THE TEST IS
  // THE **REASON** RATHER THAN THE BASKET. Comprar asks `cart.length === 0`
  // because its question can be answered by a default and re-asking it over a
  // priced basket would discard work. Here the question has no default, so
  // *answered or not* is the honest condition — and a restored basket always has
  // one, because a basket cannot be built until the window has been closed.
  //
  // ⚠️ READ ONCE ON MOUNT, AND THE STORE IS ALREADY HYDRATED BY THEN:
  // `@/lib/store` is synchronous (`expo-sqlite/localStorage`), which `5f-i` chose
  // so the first render of a restored basket cannot race the first tap.
  const [picking, setPicking] = useState(() => reason === null);

  // ⚠️⚠️ AND IT FOLLOWS THE CAUSE AFTERWARDS, WHICH `6a-ii-b` HAD TO ADD BECAUSE
  // THIS IS A **TAB**. Mount-once was right while the only thing that could set
  // the cause was the picker on this screen. `Corregir` on a write-off sets it
  // from `documentos.tsx` — and this screen may have been mounted for an hour by
  // then, so its `picking` is whatever she left it as. ⚠️ The two failures are
  // opposite and both bad: she arrives at a picker asking a question the
  // correction already answered, or she arrives at a header reading *pickFirst*
  // with no window open, one tap from a commit the schema will refuse.
  //
  // ⚠️ IT DOES NOT REPLACE `chooseReason`'s OWN `setPicking(false)` AND MUST NOT.
  // `openReason` is a no-op on an unchanged value, so re-choosing the cause
  // already standing changes nothing here and the window would stay open.
  useEffect(() => {
    setPicking(reason === null);
  }, [reason]);

  // ⚠️ THE SHEET'S OPEN STATE LIVES HERE AND NOT IN THE ROUTER —
  // `vender.tsx`'s decision and its reasons: the basket is this place zoomed,
  // priced against a catalog this screen has already read.
  const [cartOpen, setCartOpen] = useState(false);
  const closeCart = useCallback(() => setCartOpen(false), []);
  const openCart = useCallback(() => setCartOpen(true), []);

  const [asking, setAsking] = useState(false);
  const [emptied, setEmptied] = useState(false);
  const [recorded, setRecorded] = useState(false);
  // ⚠️ §5's readings (plan `5P-a`) — a no-op on any build made without
  // `EXPO_PUBLIC_PILOT`. Nothing on this screen is drawn differently for it.
  const pilot = usePilotVisit('desperdicio', workspace?.id ?? null, locationId);
  useEffect(() => {
    if (recorded) pilot.confirmed();
  }, [recorded, pilot]);
  const bloom = useRef(new Animated.Value(0)).current;

  // ⚠️⚠️ `reviewOf` IS CALLED FOR THE ROWS AND ITS TOTAL IS DELIBERATELY UNUSED —
  // see this file's header. It is still the right function: it is the one that
  // knows a line whose variant has left the catalog is a ROW and not a gap, and
  // this sheet is the only surface that can remove such a row.
  // ⚠️ IT NEEDS `prices_include_tax` even though nothing here renders a peso,
  // because `waste` prices on the SALE shape (`MONEY_KIND`) and that flag is what
  // says whether the shelf figure is already gross. A `?? true` would be right on
  // every phone in the pilot and would understate IVA in the ledger for the first
  // shop that answered no — `5f-i`'s refusal, not to be reintroduced here.
  const review: Review | null =
    workspace === null ? null : reviewOf(cart, entries, 'waste', workspace.pricesIncludeTax);

  const basketful: Basketful | null =
    workspace === null
      ? null
      : {
          cart,
          entries,
          factors,
          scope: 'waste',
          pricesIncludeTax: workspace.pricesIncludeTax,
          workspaceId: workspace.id,
          locationId,
          reason,
        };

  // ⚠️ THE EMPTYING ANIMATION — `transform` and `opacity` only (§2.11), and
  // **started in an effect rather than in the handler that sets the state**,
  // which on the native driver is the difference between motion and silence.
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

  // ⚠️ A QUESTION LEFT HALF-ASKED IS FORGOTTEN WHEN THE BASKET EMPTIES.
  useEffect(() => {
    if (cart.length === 0) setAsking(false);
  }, [cart.length]);

  // ⚠️⚠️ `Vaciar carrito` LEAVES THE CAUSE STANDING, AND `commit` BELOW CLEARS
  // IT. That pair is a decision and it is the opposite way round from what
  // copying either screen would give. **Emptying is *I keyed the wrong
  // products*** — putting the opening question back in front of somebody who has
  // just answered it is the one thing `5g-ii`'s picker was measured not to do.
  const emptyCart = useCallback(() => {
    setAsking(false);
    clear('waste');
    setEmptied(true);
  }, [clear]);

  const commit = useCallback(() => {
    if (basketful === null) return;
    pilot.committed();
    const done = commitOf(basketful, { id: newWriteId(), now: nowIso() });
    // ⚠️ EVERY REFUSAL IS A PROGRAMMING ERROR AND NONE HAS A SENTENCE (`R4`) —
    // and none can happen here, because `canCommit` is what decided the control
    // was drawn at all. `no-reason` is the one this screen adds, and the picker
    // is what makes it unreachable. This branch is the belt to that brace.
    if (!done.ok) return;
    commitToQueue(done.write);
    clear('waste');
    // ⚠️⚠️ THE CAUSE IS FORGOTTEN WITH THE DOCUMENT, AND THE WINDOW COMES BACK.
    // A cause left standing after a commit is exactly the DEFAULT `0019` refuses
    // — *"an enum with a default would quietly file every unlabelled loss under
    // one cause"* — created by this screen instead of by the schema. The next
    // write-off is a different document and may be a different cause, and the
    // cost of asking again is one tap on a window already in front of her.
    openReason(null);
    setPicking(true);
    setCartOpen(false);
    setRecorded(true);
  }, [basketful, clear, openReason, pilot]);

  const chooseReason = useCallback(
    (next: WasteReason) => {
      openReason(next);
      setPicking(false);
    },
    [openReason],
  );

  return (
    <KeyboardAvoidingView
      onTouchStart={pilot.onTouchStart}
      // ⚠️ NO `paddingTop: insets.top` — the tab navigator already draws a header
      // below the notch, and counting the inset again is the dead space the owner
      // reported on Vender on 2026-09-24.
      style={{ flex: 1, backgroundColor: PALETTE.fondo }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={scale.tabBarHeight + insets.bottom}
    >
      <Encabezado reason={reason} onPress={() => setPicking(true)} />

      <Buscador value={typed} onChange={setTyped} box={box} placeholder={ES.catalog.search} />

      <FlatList
        ref={list}
        // ⚠️ A `FlatList` FOR `productos.tsx`'s REASON: C8.3 puts ~100 products in
        // the pilot catalog and C1.1 puts two low-end Androids among its phones.
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
          />
        )}
        ItemSeparatorComponent={Separador}
        ListEmptyComponent={<Vacio line={catalogLine(loading, typed, failed)} />}
        contentContainerStyle={{ paddingBottom: scale.space }}
        onScrollToIndexFailed={({ index }) => {
          list.current?.scrollToOffset({ offset: index * scale.rowHeight, animated: true });
        }}
        keyboardDismissMode="none"
        keyboardShouldPersistTaps="handled"
      />

      <Barra
        lines={cart.length}
        onOpen={openCart}
        onCommit={commit}
        onEmpty={() => setAsking(true)}
        canRecord={basketful !== null && canCommit(basketful)}
      />

      <Carrito
        open={cartOpen}
        onClose={closeCart}
        review={review}
        entries={entries}
        factors={factors}
        typicals={typicals}
        onCommit={commit}
        onEmpty={() => setAsking(true)}
        canRecord={basketful !== null && canCommit(basketful)}
        asking={asking}
        emptied={emptied}
        bloom={bloom}
        onConfirmEmpty={emptyCart}
        onCancelEmpty={() => setAsking(false)}
      />

      {/* ⚠️ THE SAME QUESTION, ASKED FROM THE BAR — rendered here only while the
          sheet is CLOSED, because the sheet renders its own copy inside its
          `Modal`. Nested modals on iOS animate against each other. */}
      {!cartOpen ? (
        <Confirmacion
          asking={asking}
          emptied={emptied}
          bloom={bloom}
          onConfirm={emptyCart}
          onCancel={() => setAsking(false)}
        />
      ) : null}

      <Motivos
        open={picking}
        chosen={reason}
        onChoose={chooseReason}
        onClose={() => setPicking(false)}
      />

      <Registrada shown={recorded} onDone={() => setRecorded(false)} />

      {/* ⚠️ MOUNTED ONCE AND OUTSIDE EVERY CONDITIONAL. `InputAccessoryView`
          renders into the KEYBOARD rather than into the layout. */}
      <TecladoListo padId={PAD_ID} label={ES.counter.done} />
    </KeyboardAvoidingView>
  );
}

/**
 * ⚠️⚠️ THE CAUSE, AT THE TOP, AS A DROP-DOWN — §2.8's *reason-first* made
 * visible, and `Comprando a:`'s shape character for character.
 *
 * ⚠️ IT IS NEVER `loading`, WHICH IS THE ONE WAY IT DIFFERS FROM COMPRAR'S
 * HEADER. That one is disabled while the provider list is in flight, because
 * providers are ROWS and a read can fail. **The five causes are an enum in a
 * TypeScript tuple** — no query, no cache, no failure mode — so there is no
 * state in which this control cannot be opened, and no `Cargando…` for it to
 * show. ⚠️ That is also why the placeholder below is a question rather than a
 * progress word.
 */
function Encabezado({
  reason,
  onPress,
}: {
  reason: WasteReason | null;
  onPress: () => void;
}) {
  const { scale } = useDensity();
  const unknown = reason === null;
  return (
    <View style={{ paddingHorizontal: scale.space, paddingTop: scale.space, gap: scale.rowGap / 2 }}>
      <Text style={{ fontSize: scale.smallSize, color: PALETTE.tintaApagada }}>
        {ES.waste.reasonFor}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${ES.waste.reasonFor} ${unknown ? '' : reasonLabel(reason)}`}
        onPress={onPress}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: scale.rowGap,
          minHeight: scale.tapTarget,
          paddingHorizontal: scale.space,
          borderRadius: scale.space / 2,
          borderWidth: 1,
          borderColor: unknown ? PALETTE.linea : PALETTE.accion,
          backgroundColor: PALETTE.superficie,
        }}
      >
        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            fontSize: scale.bodySize,
            fontWeight: '700',
            color: unknown ? PALETTE.tintaApagada : PALETTE.tinta,
          }}
        >
          {unknown ? ES.waste.pickFirst : reasonLabel(reason)}
        </Text>
        {/* ⚠️ THE GLYPH IS INSIDE THE FIELD, which is what makes it read as a
            drop-down rather than as a link. It carries no word of its own and
            needs none: the cause is right beside it (C12.1). */}
        <MaterialCommunityIcons name="chevron-down" size={scale.iconSize} color={PALETTE.accion} />
      </Pressable>
    </View>
  );
}

/**
 * ⚠️⚠️ THE FIVE CAUSES — Comprar's provider window, with two differences that
 * are both rulings rather than taste.
 *
 * ⚠️ **NO WAY OUT ON THE WAY IN, AND NO DEFAULT TO FALL BACK ON.** Comprar's
 * window has no `Cerrar` on the way in either, but it opens with the generic
 * provider already marked — so a thumb that wants past it has one tap. Here
 * `0019` refuses a default in its own words, so the only way past is an answer.
 * ⚠️ That makes this the one modal in this app with no dismissal at all on first
 * open: Android's back is wired to `onRequestClose` and it is a **no-op** while
 * `opening`, deliberately, because the alternative is a screen priced against a
 * cause nobody chose.
 *
 * ⚠️ **THE ORDER IS THE ENUM'S** and not this file's — `WASTE_REASONS`, which is
 * `0003`'s declaration order, which is also the order a reason breakdown will
 * come back in. `@/api/waste` has the argument and
 * `docs/checks/6a-i-waste-contract.sh` asserts it against the database.
 *
 * ⚠️ TWO ROWS CARRY A LINE UNDER THE NAME AND THREE DO NOT — `reasonHint`, and
 * its reason: a hint under an obvious row is furniture, and the two that are not
 * obvious are the two `0003` argues at length.
 */
function Motivos({
  open,
  chosen,
  onChoose,
  onClose,
}: {
  open: boolean;
  chosen: WasteReason | null;
  onChoose: (reason: WasteReason) => void;
  onClose: () => void;
}) {
  const { scale } = useDensity();
  const opening = chosen === null;
  return (
    <Modal
      visible={open}
      animationType="fade"
      transparent
      // ⚠️ ANDROID'S BACK CLOSES IT ONLY ONCE A CAUSE IS CHOSEN — see the header.
      onRequestClose={opening ? () => {} : onClose}
    >
      <View style={{ flex: 1 }}>
        {opening ? (
          <Velo />
        ) : (
          <Velo label={ES.waste.pickClose} onPress={onClose} />
        )}

        <View
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: scale.space * 2 }}
        >
          <View
            style={{
              width: '100%',
              // ⚠️ `maxHeight` AND NOT `height`, and no `maxWidth` — `R6`, and the
              // gate caught that once on Vender. A cap in points is a size `Letra
              // grande` cannot change; the wrapper's padding keeps the window off
              // the edges, and that scales.
              maxHeight: '70%',
              borderRadius: scale.space,
              backgroundColor: PALETTE.fondo,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                gap: scale.rowGap / 2,
                paddingHorizontal: scale.space,
                paddingVertical: scale.space,
                borderBottomWidth: 1,
                borderBottomColor: PALETTE.linea,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: scale.rowGap,
                }}
              >
                <Text
                  style={{ flex: 1, fontSize: scale.bodySize, fontWeight: '700', color: PALETTE.tinta }}
                >
                  {opening ? ES.waste.pickFirst : ES.waste.pickReason}
                </Text>
                {opening ? null : (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={ES.waste.pickClose}
                    onPress={onClose}
                    style={{ minHeight: scale.tapTarget, justifyContent: 'center' }}
                  >
                    <Text style={{ fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.accion }}>
                      {ES.waste.pickClose}
                    </Text>
                  </Pressable>
                )}
              </View>
              {/* ⚠️ IT SAYS WHY IT IS IN THE WAY, and only on the way in: a window
                  she opened herself needs no explanation. */}
              {opening ? (
                <Text style={{ fontSize: scale.smallSize, color: PALETTE.tintaApagada }}>
                  {ES.waste.pickWhy}
                </Text>
              ) : null}
            </View>

            {/* ⚠️ A `FlatList` OVER FIVE ROWS IS DELIBERATE AND IT IS NOT ABOUT
                VIRTUALISATION. It is the same component, the same separator and the
                same row geometry as Comprar's provider window, so the two windows
                are one thing a thumb has learned rather than two that resemble each
                other. Five rows fit; `maxHeight` is what makes that a fact rather
                than an assumption at `Letra grande`. */}
            <FlatList
              data={WASTE_REASONS}
              keyExtractor={(one) => one}
              ItemSeparatorComponent={Separador}
              renderItem={({ item }) => {
                const here = item === chosen;
                const hint = reasonHint(item);
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: here }}
                    accessibilityLabel={reasonLabel(item)}
                    onPress={() => onChoose(item)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: scale.rowGap,
                      minHeight: scale.rowHeight,
                      paddingHorizontal: scale.space,
                      paddingVertical: scale.rowGap,
                      backgroundColor: here ? PALETTE.accionSuave : PALETTE.superficie,
                    }}
                  >
                    <View style={{ flex: 1, gap: scale.rowGap / 4 }}>
                      <Text
                        numberOfLines={1}
                        style={{
                          fontSize: scale.bodySize,
                          fontWeight: here ? '700' : '600',
                          color: PALETTE.tinta,
                        }}
                      >
                        {reasonLabel(item)}
                      </Text>
                      {hint === '' ? null : (
                        <Text style={{ fontSize: scale.smallSize, color: PALETTE.tintaApagada }}>
                          {hint}
                        </Text>
                      )}
                    </View>
                    {/* ⚠️ `R11`: the chosen row is filled AND ticked AND bolder,
                        never colour alone. */}
                    {here ? (
                      <MaterialCommunityIcons
                        name="check"
                        size={scale.iconSize}
                        color={PALETTE.accion}
                      />
                    ) : null}
                  </Pressable>
                );
              }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

/**
 * ⚠️⚠️ ONE ROW, AND IT IS THE WHOLE CONTROL — C3.2, and C3.3's *"there is no
 * add-to-basket step and no product-detail screen between the list and the
 * line."* A quantity greater than zero IS the line.
 *
 * ⚠️⚠️ THERE IS NO AMBER HERE AND VENDER'S ROW HAS ONE, WHICH IS THE DIFFERENCE
 * WORTH READING TWICE. §2.11 fences the `atención` colour to C3.17's unpriced
 * row, and Vender paints it because a missing price is about to decide what a
 * customer pays. **On this screen the price decides nothing a shopkeeper can act
 * on**: there is no money on the bar to be wrong (see this file's header), and
 * the write goes through either way. An alarm on a row that needs no action is
 * `5d-ii`'s *"alarm on a hundred rows nobody can silence"*, and C8.2's
 * deliberately short catalog is exactly the condition that would produce one.
 *
 * ⚠️ THE PRICE IS STILL SHOWN, AND IT IS THE CATALOG'S OWN LABEL. C3.10 —
 * never without its unit — computed by `5d-i`, the same string Productos and
 * Vender draw. It helps her know she has the right product; it is not this
 * screen's arithmetic, and C3.12's dash is what a missing one reads as.
 *
 * ⚠️ THE MAGNITUDE WORD IS KEPT, and it is the one advisory that survives here:
 * `9999 kg` in the bin is the typo with nobody on the other side of it to catch.
 */
function Fila({
  entry,
  factors,
  typical,
  onEdit,
}: {
  entry: CatalogEntry;
  factors: UnitFactors;
  typical: Typical | undefined;
  onEdit: (editing: boolean) => void;
}) {
  const { scale } = useDensity();
  const base = useCartStore((state) => {
    for (const line of state.carts.waste) if (line.variantId === entry.id) return line.base;
    return 0;
  });

  const big = magnitudeNote(outsized(typical, base, null));

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
          style={{ fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.tinta }}
        >
          {entry.name}
        </Text>
        {entry.familyName === '' ? null : (
          <Text
            numberOfLines={1}
            style={{ fontSize: scale.smallSize, color: PALETTE.tintaApagada }}
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
          {/* ⚠️ `R11`: the hue never travels alone, and this is the only amber
              word on the screen. */}
          {big === '' ? null : (
            <Text
              numberOfLines={1}
              style={{ fontSize: scale.smallSize, fontWeight: '600', color: PALETTE.atencion }}
            >
              {big}
            </Text>
          )}
        </View>
      </View>

      <Cantidad
        entry={entry}
        base={base}
        factors={factors}
        scope="waste"
        onEdit={onEdit}
        padId={PAD_ID}
      />
    </View>
  );
}

/**
 * ⚠️⚠️ C3.4's STICKY BAR, ARRANGEMENT A — the owner's ruling of 2026-09-24,
 * *"We'll go with Option A with the barra"*: two rows, the summary reads and the
 * slide acts.
 *
 * ⚠️⚠️ AND IT COUNTS INSTEAD OF SUMMING, WHICH IS THE ONE STRUCTURAL DIFFERENCE
 * FROM VENDER'S BAR AND IS ÁREA 9's RULING — see this file's header. There is no
 * `Total`, no peso figure and no `Falta un precio`. ⚠️ **The two-row shape is
 * kept anyway, and that is deliberate**: the arithmetic that made two rows
 * necessary on Vender was about a total eating the track, and there is no total
 * here — but the thumb that has learned `Vaciar carrito` bottom-left and the
 * slide bottom-right on two screens must find them in the same place on the
 * third. Muscle memory is the argument, exactly as it was for the sheet's fixed
 * height.
 */
function Barra({
  lines,
  onOpen,
  onCommit,
  onEmpty,
  canRecord,
}: {
  lines: number;
  onOpen: () => void;
  onCommit: () => void;
  onEmpty: () => void;
  canRecord: boolean;
}) {
  const { scale } = useDensity();
  const live = lines > 0;
  const Strip = live ? Pressable : View;
  return (
    <View style={{ borderTopWidth: 1, borderTopColor: PALETTE.linea, backgroundColor: PALETTE.banda }}>
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
        <Text style={{ fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.tinta }}>
          {ES.waste.counted}
        </Text>

        {/* ⚠️ THE COUNT SITS WHERE VENDER'S TOTAL SITS — right-aligned, in the
            money weight — because it is the figure this screen is reporting. The
            chevron is beside the word, so nothing becomes a bare icon (C12.1). */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale.rowGap / 2 }}>
          <Text
            style={{
              fontSize: scale.bodySize,
              fontWeight: live ? '700' : '400',
              color: live ? PALETTE.accion : PALETTE.tintaApagada,
            }}
          >
            {live ? ES.counter.lines(lines) : ES.counter.emptyCart}
          </Text>
          {live ? (
            <MaterialCommunityIcons
              name="chevron-right"
              size={scale.iconSize}
              color={PALETTE.accion}
            />
          ) : null}
        </View>
      </Strip>

      {/* ⚠️ THE SECOND ROW, AND ONLY ONCE THERE IS A BASKET — `Vaciar carrito`
          left, the slide right, which is the sheet's foot on the screen (ruled
          2026-09-24). ⚠️ `Vaciar carrito` IS DRAWN EVEN WHEN THE WRITE-OFF CANNOT
          BE COMMITTED: a basket carrying a retired product still has to be
          emptiable, and that is the case where she is most likely to want to. */}
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
            accessibilityLabel={ES.counter.cart.empty}
            onPress={onEmpty}
            style={{ minHeight: scale.tapTarget, justifyContent: 'center' }}
          >
            <Text style={{ fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.error }}>
              {ES.counter.cart.empty}
            </Text>
          </Pressable>

          {canRecord ? (
            <View style={{ flex: 1 }}>
              <Deslizador
                word={ES.waste.slide.word}
                label={ES.waste.slide.label}
                onCommit={onCommit}
                onTap={onOpen}
              />
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

/**
 * ⚠️⚠️ C3.5's REVIEW SHEET — the second of §2.8's three *Error prevention*
 * guards, *"none blocking"*, and `vender.tsx`'s component with its money taken
 * out.
 *
 * ⚠️ A FIXED HEIGHT, ruled 2026-09-24: *"let's just make the height of the
 * carrito fixed."* The reason is muscle memory rather than tidiness — with a
 * fixed card `Vaciar carrito` and the slide are in the same place on every
 * write-off.
 *
 * ⚠️ `Quitar` REMOVES A LINE IMMEDIATELY — no undo and no dialog, ruled
 * 2026-09-17 against a session's own recommendation of a timed *Deshacer*. The
 * recovery is re-adding the item, two taps on the list behind this sheet.
 * `Vaciar carrito` keeps its confirmation because its recovery is not two taps.
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
  canRecord,
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
  /** ⚠️ THE SAME MAP THE LIST BEHIND THIS SHEET IS USING, passed down rather
   *  than read again: a second `useMagnitude` inside the sheet is a second
   *  subscriber to one cache entry and a second answer to one question. */
  typicals: Typicals;
  onCommit: () => void;
  onEmpty: () => void;
  canRecord: boolean;
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
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1 }}>
        {/* ⚠️ THE VELO CLOSES THE SHEET WHEN TAPPED — ruled 2026-09-24. It is a
            separate view under an `opacity` rather than a translucent fill on the
            container, because `opacity` on a parent dims its children and would
            put the sheet itself behind the dimming. The hue is a role and the
            translucency is a number (`R11`). */}
        <Velo label={ES.counter.cart.close} onPress={onClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, justifyContent: 'flex-end' }}
        >
          <View
            style={{
              height: '72%',
              borderTopLeftRadius: scale.space,
              borderTopRightRadius: scale.space,
              backgroundColor: PALETTE.fondo,
              paddingBottom: insets.bottom,
            }}
          >
            <Cabecera onClose={onClose} />

            <FlatList
              style={{ flex: 1 }}
              data={rows}
              keyExtractor={(row) => row.variantId}
              renderItem={({ item }) => (
                <Renglon
                  row={item}
                  entry={entries.find((e) => e.id === item.variantId)}
                  factors={factors}
                  typical={typicals[item.variantId]}
                />
              )}
              ItemSeparatorComponent={Separador}
              ListEmptyComponent={<Vacio line={ES.counter.emptyCart} />}
              keyboardShouldPersistTaps="handled"
            />

            {rows.length === 0 ? null : (
              <Vaciar canRecord={canRecord} onCommit={onCommit} onAsk={onEmpty} />
            )}
          </View>
        </KeyboardAvoidingView>

        {/* ⚠️ THE SAME QUESTION AS THE BAR ASKS, rendered inside this `Modal`
            because a sibling of the `Modal` would be behind it. */}
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

/**
 * The sheet's heading, and the way out that is not a gesture.
 *
 * ⚠️ IT IS NAMED `Cabecera` AND NOT `Encabezado` BECAUSE THIS FILE ALREADY HAS AN
 * `Encabezado` — the cause at the top of the screen. `vender.tsx` and
 * `comprar.tsx` each use that name for exactly one of the two things this screen
 * has both of. ⚠️ **It is a local component and stays local**: `R14` admits one
 * into `src/ui/` when a SECOND file draws it, and the two existing copies are
 * each shaped by their own screen.
 */
function Cabecera({ onClose }: { onClose: () => void }) {
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
        {ES.counter.cart.title}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={ES.counter.cart.close}
        onPress={onClose}
        style={{
          minHeight: scale.tapTarget,
          justifyContent: 'center',
          paddingHorizontal: scale.rowGap,
        }}
      >
        <Text style={{ fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.accion }}>
          {ES.counter.cart.close}
        </Text>
      </Pressable>
    </View>
  );
}

/**
 * One line of the basket, as the sheet draws it.
 *
 * ⚠️⚠️ NO LINE TOTAL, WHICH IS ÁREA 9's RULING REACHING THE ONE SURFACE WHERE IT
 * IS HARDEST TO LEAVE OUT. On Vender the line total is HERE and nowhere else
 * (C3.4), *"the one place a customer is reading the arithmetic over the
 * shopkeeper's shoulder."* **Nobody is reading a write-off over her shoulder**,
 * and the number she is checking is the quantity — which the control on this row
 * already shows and lets her fix.
 *
 * ⚠️ A ROW WHOSE PRODUCT HAS LEFT THE CATALOG IS DRAWN AND NOT HIDDEN — see
 * `reviewOf`, where the argument lives. `draftOf` refuses the whole basket for
 * it, and this sheet is the only surface that can remove it, because the list
 * behind it is the catalog and the catalog no longer has the row.
 *
 * ⚠️ TWO LINES AND NOT THREE. Vender's row needs three because the stepper, the
 * line total and `Quitar` measured 440 pt before the name got anything; with the
 * total gone the name and `Quitar` share one line and the control takes the
 * second. ⚠️ **That was arithmetic there and it is arithmetic here**: at `Letra
 * grande` on a 393 pt screen the stepper is 222 pt and `Quitar` 60, which is why
 * they still do not share a line with the name.
 */
function Renglon({
  row,
  entry,
  factors,
  typical,
}: {
  row: ReviewRow;
  entry: CatalogEntry | undefined;
  factors: UnitFactors;
  typical: Typical | undefined;
}) {
  const { scale } = useDensity();
  const remove = useCartStore((state) => state.remove);
  const gone = entry === undefined;

  // ⚠️ THE WARNING IS ON THE SHEET AS WELL AS ON THE LIST AND THAT IS NOT A
  // DUPLICATE — §2.8's guards compound, and the sheet is the last surface before
  // the slide. A line flagged on a row that has since scrolled away would be
  // committed having been flagged to nobody.
  const big = magnitudeNote(outsized(typical, row.base, null));

  return (
    <View
      style={{
        gap: scale.rowGap / 2,
        paddingVertical: scale.rowGap,
        paddingHorizontal: scale.space,
        backgroundColor: PALETTE.superficie,
      }}
    >
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
          {row.name ?? ES.counter.cart.goneName}
        </Text>
        {/* ⚠️ A WORD AND NOT A GLYPH — the width is the reason as much as the
            clarity: an icon plus its word does not fit beside the stepper at
            `Letra grande`, and an icon alone on the one control that destroys
            something is the shape C12.1 refuses. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${ES.counter.cart.remove} ${row.name ?? ES.counter.cart.goneName}`}
          onPress={() => remove('waste', row.variantId)}
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

      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: scale.rowGap }}>
        <Text
          numberOfLines={1}
          style={{ flex: 1, fontSize: scale.smallSize, color: PALETTE.tintaApagada }}
        >
          {gone ? ES.counter.cart.gone : (row.familyName ?? '')}
        </Text>
        {/* ⚠️ `R11`: the state never travels as a colour alone. */}
        {big === '' ? null : (
          <Text
            numberOfLines={1}
            style={{ fontSize: scale.smallSize, fontWeight: '600', color: PALETTE.atencion }}
          >
            {big}
          </Text>
        )}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {gone ? (
          <View />
        ) : (
          <Cantidad entry={entry} base={row.base} factors={factors} scope="waste" padId={PAD_ID} />
        )}
      </View>
    </View>
  );
}

/**
 * ⚠️ THE SHEET'S FOOT — `Vaciar carrito` and the second slide, ruled 2026-09-24:
 * the review screen can complete the document without being closed first.
 *
 * ⚠️ NO `onTap`, which is the 2026-09-25 ruling: *"when a carrito is open … do
 * not close the carrito."* The `Deslizador` still nudges, so the touch is
 * answered. ⚠️ `flex: 1` gives the track every point `Vaciar carrito` does not
 * use, which keeps it honest at `Letra grande` where the words are wider.
 */
function Vaciar({
  onAsk,
  onCommit,
  canRecord,
}: {
  onAsk: () => void;
  onCommit: () => void;
  canRecord: boolean;
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
        accessibilityLabel={ES.counter.cart.empty}
        onPress={onAsk}
        style={{ minHeight: scale.tapTarget, justifyContent: 'center' }}
      >
        <Text style={{ fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.error }}>
          {ES.counter.cart.empty}
        </Text>
      </Pressable>

      {canRecord ? (
        <View style={{ flex: 1 }}>
          <Deslizador compact word={ES.waste.slide.word} label={ES.waste.slide.labelInCart} onCommit={onCommit} />
        </View>
      ) : null}
    </View>
  );
}

/**
 * ⚠️ THE EMPTYING QUESTION AND ITS ANSWER — a centred box with its own scrim,
 * the owner's specification of 2026-09-24.
 *
 * ⚠️ IT IS RENDERED FROM TWO PLACES AND IS ONE COMPONENT WITH ONE STATE: the bar
 * asks it when the basket is closed, the sheet when it is open, and
 * `Desperdicio` owns `asking`/`emptied` so the two can never disagree.
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
      <Velo />
      <View
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: scale.space * 2 }}
      >
        <View
          style={{
            width: '100%',
            // ⚠️ NO `maxWidth` — `R6`, and the gate caught it once on Vender.
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
 * ⚠️ THE QUESTION, IN A BOX OF ITS OWN — the owner's specification of
 * 2026-09-24. The confirm word is not the word that opened it
 * (`solicitudes.tsx`'s arrangement): two taps that read the same are two taps a
 * shopkeeper cannot tell apart once she has made the first one.
 *
 * ⚠️ `Cancelar` IS DRAWN IN `accion` AND `Sí, vaciar` IN `error`, which is the
 * palette's own sentence: `error` is *what DESTROYS*, and the way out of a
 * destructive question is not itself destructive.
 */
function Pregunta({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  const { scale } = useDensity();
  return (
    <>
      <Frase text={ES.counter.cart.emptyAsk} />
      <View style={{ gap: scale.rowGap }}>
        {/* ⚠️ `Boton` IS `src/ui/`'s — `5h.5` made it a primitive off THREE
            drawings, and this is the fourth. `Cancelar` below is `src/ui/BotonLleno`
            since `8f`, which gave it the border the other ten drawings had. */}
        <Boton label={ES.counter.cart.emptyConfirm} tone={PALETTE.error} onPress={onConfirm} />
        <BotonLleno label={ES.counter.cart.emptyCancel} onPress={onCancel} />
      </View>
    </>
  );
}

/**
 * ⚠️ THE CONFIRMATION WHEN THE BASKET IS EMPTIED. The animation is driven from
 * `Desperdicio`'s effect — started there rather than in the tap's handler,
 * because on the native driver the other way round fails silently.
 *
 * ⚠️ `opacity` AND `scale` AND NOTHING ELSE (§2.11), and it carries a WORD:
 * motion with no language is a state announced on the one channel a person can
 * miss by looking away.
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
          {ES.counter.cart.emptied}
        </Text>
      </Animated.View>
    </View>
  );
}

/**
 * ⚠️⚠️ THE WRITE-OFF'S OWN CONFIRMATION, AND IT FIRES ON **ENQUEUE**, NEVER ON
 * THE SERVER'S REPLY. C10.3 says the slide looks identical offline, and `5c-i`
 * made that structural by having `queueWrite` return a ROW rather than a promise.
 * **An animation that awaited Postgres would be the offline path looking
 * different in the one place nobody tests it** — and this is the screen where
 * that matters most, because [[pilot-store-is-offline-a-lot]] and a bin round
 * happens in the back room.
 *
 * ⚠️ `transform` AND `opacity` ONLY (§2.11), started in an effect rather than in
 * the handler that mounts it — on the native driver the other way round fails
 * silently: no error, no motion.
 *
 * ⚠️ IT TAKES NO TOUCHES. The basket is already gone by the time it draws, and
 * the cause window is opening behind it — a shopkeeper's next tap belongs to
 * that window and must not be swallowed here.
 */
function Registrada({ shown, onDone }: { shown: boolean; onDone: () => void }) {
  const { scale } = useDensity();
  const bloom = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!shown) return;
    bloom.setValue(0);
    const run = Animated.sequence([
      Animated.timing(bloom, {
        toValue: 1,
        duration: DONE_IN_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.delay(DONE_HOLD_MS),
      Animated.timing(bloom, {
        toValue: 0,
        duration: DONE_OUT_MS,
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
          {ES.waste.recorded}
        </Text>
      </Animated.View>
    </View>
  );
}
