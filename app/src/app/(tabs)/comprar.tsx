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
import { parsePesos } from '@/api/catalogWrite';
import {
  useCatalog,
  useMagnitude,
  useMyRole,
  useProviders,
  useUnitFactors,
  useWorkspace,
} from '@/api/hooks';
import { magnitudeNote, outsized, type Typical, type Typicals } from '@/api/magnitude';
import {
  DEFAULT_SORT,
  canReadMemory,
  costNote,
  costShown,
  defaultProvider,
  lastPurchasedFor,
  memoryFor,
  memoryState,
  providerById,
  sortedForBuying,
  typedPerBase,
  type CatalogSort,
  type MemoryRow,
  type Provider,
} from '@/api/providers';
import { reviewOf, type Basket, type Review, type ReviewRow } from '@/cart/cart';
import { canCommit, commitOf, type Basketful } from '@/cart/commit';
import { useCart, useCartStore, useProviderId, useTyped } from '@/cart/store';
import { formatMXN } from '@/format/mxn';
import { commitToQueue } from '@/lib/commitRunner';
import { newWriteId, nowIso } from '@/lib/ids';
import { ES } from '@/strings';
import { useDensity } from '@/theme/DensityProvider';
import { PALETTE } from '@/theme/palette';
import { Buscador } from '@/ui/Buscador';
import { Cantidad } from '@/ui/Cantidad';
import { Deslizador } from '@/ui/Deslizador';
import { Separador } from '@/ui/Separador';
import { TecladoListo } from '@/ui/TecladoListo';
import { Vacio } from '@/ui/Vacio';

// ============================================================================
// COMPRAR — RECEIVING A DELIVERY. Plan task `5g-ii`, and the third of §2.8's
// three capture screens.
//
// ⚠️⚠️ IT IS VENDER PLUS FOUR THINGS, AND NONE OF THE FOUR HAS A PRECEDENT IN
// THIS APP: a provider in the header, an EDITABLE COST per line, three price
// states that must look different, and a commit that **REFUSES**. Everything
// else — the search, the row, the stepper, the sticky bar, the sheet, the slide
// and the two confirmation animations — is the shape `5f-iii` shipped, and this
// file draws none of it twice: it is `src/ui/`'s, minted by this task.
//
// ⚠️⚠️ THE OWNER'S PHONE IS THE WHOLE INSTRUMENT (`R9`, §2.11). Every judgement
// left in this file is rendering, navigation or layout, and no check in this
// repository will ever say it is wrong. The half that IS checkable was pushed
// out deliberately and `5g-i` took it: the reads are `@/api/providers`, the
// arithmetic is `@/cart/cart`, the fence predicate is `canReadMemory`, and all
// three have suites under `app/test/`.
//
// ----------------------------------------------------------------------------
// ⚠️⚠️ THE PROVIDER IS CHOSEN FIRST, AND CHANGING IT RE-PRICES EVERY ROW
// ----------------------------------------------------------------------------
// C3.11, and the second half is the one a session would leave out because the
// basket LOOKS unchanged. A supplier price is a fact about a relationship, so a
// figure entered against one provider is not a figure about the next — and the
// QUANTITIES are untouched, because what arrived is what arrived whoever it
// turns out to have come from.
//
// ⚠️ THE CLEARING IS `openProvider`'s AND NOT THIS FILE'S (`@/cart/store`), so
// `app/test/cart.test.ts`' neighbour reads the rule rather than a reviewer
// hoping for it. What this screen owns is the RE-SEEDING afterwards — see
// `Fila`, where the one subtle piece of state in this file lives.
//
// ⚠️ `Comprando a:` OPENS ON THE GENERIC ROW AND NOT ON *the first one*
// (`defaultProvider`, F6). A market run has no counterparty, and a shop that
// somehow held no generic row would otherwise record it against whichever
// supplier sorted first.
//
// ----------------------------------------------------------------------------
// ⚠️⚠️ THE THREE PRICE STATES, AND THE MIDDLE ONE IS THE ONE THAT MATTERS
// ----------------------------------------------------------------------------
// §2.8 requires them to LOOK different:
//
//   * **remembered** — the box is PREFILLED and editable, with `Antes $8.50 / kg`
//     beside it. The note stays true after she edits the box, which a label
//     reading *último costo* over an edited field would not.
//   * **new pairing** — *you have bought this, but never from THEM* — the box is
//     **EMPTY AND REQUIRED**, visibly not a prefill, carrying `¿Cuánto?` and the
//     sentence `Primera vez con este proveedor`. ⚠️ *"An empty required field
//     asks a question; a wrong prefill answers one nobody asked."*
//   * **brand-new product** — the ADR's own table gives it the *"same
//     treatment"*, and `memoryState` cannot tell the two apart anyway.
//
// ⚠️ C3.12: NO MEMORY IS A DASH AND NEVER `$0.00` — and in a BOX it is neither,
// it is empty (`costShown` returns `''`, and says why: a box holding `—` is a box
// whose first keystroke produces `—8`).
//
// ⚠️⚠️ AND A FOURTH STATE THE ADR DOES NOT LIST, WHICH `5g-i` FOUND AND MEASURED:
// `unreadable`. `provider_price_memory` is manager-and-above (`0003:558`) while
// `record_purchase` fences nobody (`0018:165`), so a cashier reads **200 and an
// empty array** — identical on the wire to a pairing that really is new.
//
// ⚠️⚠️ IT RENDERS AS AN EMPTY REQUIRED BOX WITH **NO SENTENCE AT ALL**, and that
// is the owner's ruling of 2026-09-25 taking effect rather than a style choice:
// *"Comprar should be for any role for now."* Once an Empleada may use this
// screen, `Primera vez con este proveedor` is **false on every row her shop has
// bought before** — see `Costo`, where the whole argument lives. `5g-ii` shipped
// the other way and one sentence from him overturned it.
//
// ⚠️ `unknown` IS NOT DRAWN AS A MISSING COST. A read still in flight gets an
// empty box with no marker and no sentence: *not back yet* must never render as
// *there is nothing*, which is `membershipFrom`'s distinction and the reason
// `memoryState` has four answers rather than three.
//
// ----------------------------------------------------------------------------
// ⚠️⚠️ THE COMMIT IS BLOCKED, WHICH IS THE OPPOSITE OF VENDER
// ----------------------------------------------------------------------------
// C3.13 against C3.14, out of ONE number rather than two rules: `reviewOf`
// returns `complete`, Vender lets an incomplete basket through loudly, and here
// the slide is **not drawn at all** while any row has no cost. A banner says
// which and how many, and **setting the missing cost is fast from where she
// already is** — the box is on the row, and it is on the sheet's row too.
//
// ⚠️ THE SLIDE IS ABSENT RATHER THAN DEAD, which is `canCommit`'s own rule: a
// control a thumb can complete over a write that would be refused is worse than
// no control, and every `draftOf` refusal is a programming error that may never
// reach a person (`R4`).
//
// ⚠️ NO 50-CENTAVO ROUNDING ANYWHERE HERE (C12.3). It is a SELLING convenience
// and a delivery is paid to the centavo, so nothing on this screen touches it —
// which is worth saying because `5h` will put it on the other counter's total.
//
// ⚠️ AND NO EXPIRY DATE, WHICH IS A RULING AND NOT AN OMISSION. ADR-035 §2.8's
// Comprar row still reads *"optional expiry"*; the owner ruled on 2026-09-21
// *"we will not capture expiry date for now"*, intending to DERIVE shelf life
// instead (`7e` was rewritten for it). `purchase_line.expiry_date` exists and
// `record_purchase` has a three-tier policy for it (`0018:112`), so sending
// nothing takes tier 2/3 — the automated default. ⚠️ **The ADR's own cell lags
// that ruling and the one-line amendment is parked in ⛔ DECISIONS OWED.**
//
// ----------------------------------------------------------------------------
// ⚠️ WHAT IS SHARED WITH VENDER AND WHY IT IS NOT COPIED
// ----------------------------------------------------------------------------
// §2.8: *"three capture screens that feel like distinct modes, sharing one
// engine underneath."* The engine is `src/ui/` for the markup and `ES.counter`
// for the words both counters say identically; `ES.buy` holds only what differs.
// ⚠️ The basket is a DIFFERENT basket — `useCart('buy')`, one cart per `Kind`
// (`@/cart/store`), because a delivery half-keyed in the back room must not be
// wiped by ringing up a customer at the front.
// ============================================================================

/**
 * The bar carrying *Listo* above the number pads.
 *
 * ⚠️ A CONSTANT AND NOT A LITERAL AT TWO CALL SITES, for `PRICE_PAD_ID`'s
 * recorded reason: `InputAccessoryView` matches an input to a bar by STRING
 * EQUALITY, so two spellings is a bar that renders and never appears, with
 * nothing anywhere to say why.
 *
 * ⚠️⚠️ THIS SCREEN IS THE FIRST WITH TWO DECIMAL PADS ON ONE ROW — a quantity and
 * a cost — and `decimal-pad` draws no return key on either platform. One bar
 * serves both, because it is the KEYBOARD's furniture rather than a field's.
 */
const PAD_ID = 'wera.buy.pad';

export default function Comprar() {
  const { scale } = useDensity();
  const insets = useSafeAreaInsets();

  // ⚠️ THE CATALOG IS READ UNFILTERED AND NARROWED FOR THE LIST ONLY — Vender's
  // own measurement: pricing a basket against the MATCHING rows would make the
  // `Total` fall every time she typed a different product's name.
  const { loading, entries, failed, locationId } = useCatalog('');
  const factors = useUnitFactors();
  // ⚠️⚠️ ADR-035 §2.8's THIRD GUARD, AND COMPRAR IS THE SCREEN THAT GETS BOTH
  // HALVES OF IT — a delivery is the one place in this app where a person types
  // both a quantity and a price. See `@/api/magnitude`'s header for why Vender
  // gets the quantity half alone.
  const typicals = useMagnitude();
  const workspace = useWorkspace();
  const role = useMyRole();

  const [typed, setTyped] = useState('');
  const box = useRef<TextInput>(null);
  const [sort, setSort] = useState<CatalogSort>(DEFAULT_SORT);
  const searching = typed.trim() !== '';

  const list = useRef<FlatList<CatalogEntry>>(null);
  const editing = useRef<number | null>(null);

  // ⚠️ IT WAITS FOR THE KEYBOARD TO BE UP rather than firing on focus, which is
  // `vender.tsx`'s measurement: scrolling on focus centres the row in a viewport
  // that is about to shrink, and the resize then pushes it back down.
  useEffect(() => {
    const up = Keyboard.addListener('keyboardDidShow', () => {
      const at = editing.current;
      if (at === null || at < 0) return;
      list.current?.scrollToIndex({ index: at, viewPosition: 0.5, animated: true });
    });
    return () => up.remove();
  }, []);

  const cart = useCart('buy');
  const quotes = useTyped('buy');
  const providerId = useProviderId();
  const openShop = useCartStore((state) => state.openShop);
  const openProvider = useCartStore((state) => state.openProvider);
  const clear = useCartStore((state) => state.clear);

  // ⚠️ THE GUARD IS THE WHOLE POINT AND NOT DEFENSIVE — `vender.tsx`'s note:
  // `openShop(null)` on a store restored from disk means *the shop changed* and
  // drops the basket, and `useWorkspace` answers `null` on every cold start.
  useEffect(() => {
    if (workspace !== null) openShop(workspace.id);
  }, [workspace, openShop]);

  const { loading: providersOut, providers, memory } = useProviders(providerId);
  const provider = providerById(providers, providerId);

  // ⚠️⚠️ THE DEFAULT IS STILL CHOSEN, AND THE PICKER IS NOW WHAT CONFIRMS IT. F6
  // makes the generic row the opening answer — *"I bought this at the market this
  // morning"* — so the picker opens with it already marked and one tap away,
  // rather than opening on nothing and making her choose before she can look.
  // ⚠️ `providerId === null` is what stops it re-asserting: `openProvider` CLEARS
  // the typed costs (C3.11), so an effect that ran again would wipe a figure the
  // moment after it was typed. It is also why a provider she picked survives a
  // refetch of the list.
  useEffect(() => {
    if (providerId !== null) return;
    const opening = defaultProvider(providers);
    if (opening !== null) openProvider(opening.id);
  }, [providerId, providers, openProvider]);

  // ⚠️⚠️ THE PICKER OPENS THE SCREEN — the owner, 2026-09-25: *"When opening
  // Comprar, show a small menu that let's you pick the Proveedor."* C3.11 already
  // said the provider comes FIRST; this makes the screen say so rather than
  // leaving it to a header a thumb may never touch.
  //
  // ⚠️⚠️ EXCEPT WHEN A DELIVERY IS ALREADY HALF-KEYED, AND THAT IS A DECISION
  // TAKEN ON HIS BEHALF. §2.11 persists the buy basket because a phone rings in
  // the back room; re-asking *who are you buying from* over a basket that is
  // already priced against an answer would either discard her work or ask a
  // question whose only safe answer is the one already given. **So it opens on
  // the picker when the basket is EMPTY and goes straight to the catalog when it
  // is not.** Reversing that is one condition.
  //
  // ⚠️ IT IS READ ONCE, ON MOUNT, AND THE STORE IS ALREADY HYDRATED BY THEN —
  // `@/lib/store` is synchronous (`expo-sqlite/localStorage`), which `5f-i` chose
  // so that *"the first render of a restored basket"* cannot race the first tap.
  // An async storage here would make this test read an empty cart on every cold
  // start and ask the question over a basket she was halfway through.
  //
  // ⚠️ ONE CASE IT DELIBERATELY DOES NOT COVER, NAMED RATHER THAN MACHINED
  // AROUND: a SHOP switch mid-session drops the basket and the provider
  // (`openShop`), and this does not re-ask — because *opening Comprar* is what he
  // described and a workspace switch is not that. **The drop-down is right there
  // and now looks like one**, which is the affordance that makes leaving it alone
  // defensible. The alternative — reopening whenever the provider is null — would
  // flash the window on every cold start, since `defaultProvider` fills it one
  // render later.
  const [picking, setPicking] = useState(() => cart.length === 0);

  // ⚠️⚠️ MAY SHE READ THE MEMORY AT ALL — and the predicate is `@/api/providers`'
  // rather than a comparison written here, because it is a claim about
  // `0003:558` and `app/test/api-providers.test.ts` is what reads a claim.
  const canRead = canReadMemory(role);


  // -------------------------------------------------------------------------
  // ⚠️⚠️ THE PREFILL, AND IT LIVES HERE BECAUSE A ROW CANNOT HOLD IT
  // -------------------------------------------------------------------------
  // The store holds what `record_purchase` will be SENT and the cost box reads
  // that back through `costShown`, so a prefill has to be MATERIALISED into the
  // store rather than merged in at commit time. ⚠️ **The alternative was measured
  // and refused**: merging the memory UNDER the typed map at commit time means an
  // emptied box silently commits the remembered figure — §2.8's *"a wrong prefill
  // answers one nobody asked"* arriving through the cart store instead of through
  // a fallback.
  //
  // ⚠️⚠️ SO IT IS SEEDED ONCE PER (PROVIDER, LINE), AND THIS REF IS WHAT MAKES
  // *once* TRUE. It is **on the screen and not on the row**, which is a bug this
  // task wrote and then found: a `FlatList` UNMOUNTS rows outside its render
  // window, so a per-row ref resets when a long catalog scrolls — and a box she
  // had deliberately cleared would be refilled the moment the row came back. **A
  // list that virtualises is a list whose rows cannot remember anything.**
  //
  // ⚠️ THE KEY CARRIES THE PROVIDER, so `openProvider` clearing the typed map
  // (C3.11) leaves every key stale and the new provider's memory is written in.
  // **That is the half of C3.11 that would have been left out**, because the
  // basket looks unchanged either way.
  //
  // ⚠️ AND A LINE THAT LEAVES THE BASKET FORGETS IT, so re-adding the product
  // prefills again — which agrees with `remove`'s own rule one module over: a
  // removed line forgets its price.
  const seeded = useRef<Set<string>>(new Set());
  const setPrice = useCartStore((state) => state.setPrice);

  useEffect(() => {
    if (providerId === null) return;
    const live = new Set(cart.map((line) => `${providerId}|${line.variantId}`));
    for (const key of seeded.current) if (!live.has(key)) seeded.current.delete(key);
    for (const line of cart) {
      const key = `${providerId}|${line.variantId}`;
      if (seeded.current.has(key)) continue;
      const entry = entries.find((e) => e.id === line.variantId);
      if (entry === undefined) continue;
      // ⚠️⚠️ `unknown` RETURNS WITHOUT MARKING THE LINE SEEDED, and that is the
      // third case the ref exists for: she added a product while the memory read
      // was still in flight. Marking it here would lose the prefill silently, and
      // only on a slow connection — *not back yet* is not *there is nothing*.
      const state = memoryState(memory, providerId, entry.id, canRead);
      if (state === 'unknown') continue;
      seeded.current.add(key);
      const remembered = memoryFor(memory, providerId, entry.id, entry.priceUnit, factors);
      if (remembered !== null) setPrice('buy', entry.id, remembered.perBase);
    }
  }, [cart, entries, memory, providerId, canRead, factors, setPrice]);

  // ⚠️ THE TOTAL IS WITHHELD RATHER THAN GUESSED WHILE THE SHOP IS UNKNOWN —
  // `reviewOf` needs `prices_include_tax`, and a `?? true` here would be right
  // on every phone in the pilot. ⚠️⚠️ ON THE BUY SIDE THE FLAG CHANGES NOTHING
  // AND IS STILL PASSED: §2.5 rule 2 anchors a purchase on the INVOICE NET
  // whatever it says, and `quoted` was corrected to that by `5g-i` — so reading
  // the flag here keeps one call shape across both counters rather than a branch.
  const review: Review | null =
    workspace === null
      ? null
      : reviewOf(cart, entries, 'buy', workspace.pricesIncludeTax, undefined, quotes);
  const basket: Basket | null = review === null ? null : review.basket;

  // ⚠️⚠️ THE ORDER — and the SEARCH wins over the pill rather than combining with
  // it. `search` ranks by what was typed, which is a third order the pills do not
  // name; running a sort over its result would throw away the ranking, and running
  // it before would be sorted then re-ranked. ⚠️ **So the pills are hidden while
  // typing** (his instruction) and the two orders are never on screen together.
  const rows = searching
    ? search(entries, typed)
    : sortedForBuying(entries, sort, lastPurchasedFor(memory, providerId));

  // ⚠️ HOW MANY ROWS HAVE NO COST — the banner's own figure, counted off the very
  // rows the total is the sum of (`reviewOf`), so the sentence and the arithmetic
  // cannot disagree about which lines are unpriced.
  //
  // ⚠️⚠️ AND A ROW WHOSE PRODUCT HAS LEFT THE CATALOG IS NOT COUNTED, WHICH IS NOT
  // A DETAIL. `reviewOf` prices it `null` like any unpriced line, but **typing a
  // cost into it would not help**: `draftOf` refuses the whole basket on
  // `variant-not-in-catalog`, and the only fix is `Quitar` on the sheet. A banner
  // that said *falta el costo* would send her to the one control that cannot
  // resolve it. ⚠️ `name === null` is `reviewOf`'s own marker for that row, and
  // the honest rendering of what is left is `Bloqueo`'s blank strip — see there.
  const missing =
    review === null
      ? 0
      : review.rows.filter((r) => r.centavos === null && r.name !== null).length;

  const [cartOpen, setCartOpen] = useState(false);
  const closeCart = useCallback(() => setCartOpen(false), []);
  const openCart = useCallback(() => setCartOpen(true), []);

  const [asking, setAsking] = useState(false);
  const [emptied, setEmptied] = useState(false);
  const bloom = useRef(new Animated.Value(0)).current;
  const [recorded, setRecorded] = useState(false);

  const basketful: Basketful | null =
    workspace === null
      ? null
      : {
          cart,
          entries,
          factors,
          kind: 'buy',
          pricesIncludeTax: workspace.pricesIncludeTax,
          workspaceId: workspace.id,
          locationId,
          quotes,
          providerId,
        };

  // ⚠️ `transform` AND `opacity` ONLY (§2.11), AND STARTED IN AN EFFECT rather
  // than in the handler that sets the state — on the native driver the other way
  // round fails silently: no error, no motion.
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

  useEffect(() => {
    if (cart.length === 0) setAsking(false);
  }, [cart.length]);

  const emptyCart = useCallback(() => {
    setAsking(false);
    clear('buy');
    setEmptied(true);
  }, [clear]);

  const commit = useCallback(() => {
    if (basketful === null) return;
    const done = commitOf(basketful, { id: newWriteId(), now: nowIso() });
    // ⚠️ EVERY REFUSAL IS A PROGRAMMING ERROR AND NONE HAS A SENTENCE (`R4`).
    // None can happen here, because `canCommit` is what decided the control was
    // drawn at all — including `no-provider`, which `draftOf` refuses on the buy
    // side rather than letting `record_purchase` raise `22023` into a dead letter.
    if (!done.ok) return;
    commitToQueue(done.write);
    clear('buy');
    setCartOpen(false);
    setRecorded(true);
  }, [basketful, clear]);

  return (
    <KeyboardAvoidingView
      // ⚠️ NO `paddingTop: insets.top` — the tab navigator already draws a header
      // below the notch, and counting the inset again is the dead space the owner
      // reported on Vender on 2026-09-24.
      style={{ flex: 1, backgroundColor: PALETTE.fondo }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={scale.tabBarHeight + insets.bottom}
    >
      <Encabezado
        provider={provider}
        loading={providersOut}
        onPress={() => setPicking(true)}
      />

      <Buscador value={typed} onChange={setTyped} box={box} />

      {/* ⚠️ HIDDEN WHILE TYPING, which is his instruction and also the only
          honest rendering: the list is ranked by the search then, not by a pill. */}
      {searching ? null : <Ordenar sort={sort} onSort={setSort} />}

      <FlatList
        ref={list}
        data={rows}
        keyExtractor={(entry) => entry.id}
        renderItem={({ item, index }) => (
          <Fila
            entry={item}
            factors={factors}
            typical={typicals[item.id]}
            memory={memory}
            providerId={providerId}
            canRead={canRead}
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
        basket={basket}
        missing={missing}
        onOpen={openCart}
        onCommit={commit}
        onEmpty={() => setAsking(true)}
        canBuy={basketful !== null && canCommit(basketful)}
      />

      <Carrito
        open={cartOpen}
        onClose={closeCart}
        review={review}
        entries={entries}
        factors={factors}
        typicals={typicals}
        memory={memory}
        providerId={providerId}
        canRead={canRead}
        missing={missing}
        onCommit={commit}
        onEmpty={() => setAsking(true)}
        canBuy={basketful !== null && canCommit(basketful)}
        asking={asking}
        emptied={emptied}
        bloom={bloom}
        onConfirmEmpty={emptyCart}
        onCancelEmpty={() => setAsking(false)}
      />

      {/* ⚠️ THE SAME QUESTION, ASKED FROM THE BAR — rendered here only while the
          sheet is CLOSED, because the sheet renders its own copy inside its
          `Modal`. `cartOpen` makes the two mount points exclusive, and a second
          `Modal` over the first is what this avoids: nested modals on iOS animate
          against each other. */}
      {!cartOpen ? (
        <Confirmacion
          asking={asking}
          emptied={emptied}
          bloom={bloom}
          onConfirm={emptyCart}
          onCancel={() => setAsking(false)}
        />
      ) : null}

      <Proveedores
        open={picking}
        providers={providers}
        chosen={providerId}
        // ⚠️ THE OPENING QUESTION HAS NO WAY OUT BUT AN ANSWER — see `Proveedores`.
        // An empty buy basket is what makes this the way IN rather than a change of
        // mind, and it is the same condition that decided to show it at all.
        opening={cart.length === 0}
        onClose={() => setPicking(false)}
        onChoose={(id) => {
          openProvider(id);
          setPicking(false);
        }}
      />

      <Registrada shown={recorded} onDone={() => setRecorded(false)} />

      {/* ⚠️ MOUNTED ONCE AND OUTSIDE EVERY CONDITIONAL. `InputAccessoryView`
          renders into the keyboard rather than into the layout, so where it sits
          does not matter — but mounting it in a branch means the bar vanishing
          exactly while a read is out. */}
      <TecladoListo padId={PAD_ID} label={ES.buy.done} />
    </KeyboardAvoidingView>
  );
}

/**
 * ⚠️⚠️ `Comprando a:` — THE HEADER, AND SINCE 2026-09-25 IT LOOKS LIKE THE
 * CONTROL IT IS. The owner: *"You can also change the Proveedor from the
 * drop-down at the top of the screen, make it look more like a drop-down
 * control."*
 *
 * ⚠️ WHAT CHANGED IS AFFORDANCE AND NOT FUNCTION. It was a bare row of text with
 * a chevron after it — tappable, and not visibly so. It is now a bordered,
 * filled field with the chevron inside it, which is the same shape `Buscador`
 * uses one row below: **a box means you can act on it, and this screen now has
 * two boxes that both do.**
 *
 * ⚠️ THE LABEL STAYS OUTSIDE THE BOX. C3.11 makes this a sentence with a blank in
 * it — the provider is who this document is WITH, not a setting — so
 * `Comprando a:` reads as prose and only the ANSWER is a field.
 *
 * ⚠️ IT SITS ABOVE THE SEARCH BOX AND DOES NOT SCROLL, for the search box's own
 * reason: a shop with a hundred products is exactly the shop where a
 * scrolled-away provider would be a delivery recorded against the wrong one.
 */
function Encabezado({
  provider,
  loading,
  onPress,
}: {
  provider: Provider | null;
  loading: boolean;
  onPress: () => void;
}) {
  const { scale } = useDensity();
  const unknown = provider === null;
  return (
    <View style={{ paddingHorizontal: scale.space, paddingTop: scale.space, gap: scale.rowGap / 2 }}>
      <Text style={{ fontSize: scale.bodySize * 0.85, color: PALETTE.tintaApagada }}>
        {ES.buy.buyingFrom}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${ES.buy.buyingFrom} ${unknown ? '' : provider.name}`}
        accessibilityState={{ disabled: loading }}
        disabled={loading}
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
          {unknown ? ES.buy.loadingProviders : provider.name}
        </Text>
        {/* ⚠️ THE GLYPH IS INSIDE THE FIELD, which is what makes it read as a
            drop-down rather than as a link. It carries no word of its own and
            needs none: the provider's name is right beside it (C12.1). */}
        {loading ? null : (
          <MaterialCommunityIcons
            name="chevron-down"
            size={scale.iconSize}
            color={PALETTE.accion}
          />
        )}
      </Pressable>
    </View>
  );
}

/**
 * ⚠️⚠️ THE SORTER PILLS — the owner, 2026-09-25: *"small pill sorters at the top,
 * the preselected sorter is Recientes but you can also pick A-Z."*
 *
 * ⚠️ TWO PILLS AND NO MORE, and the chosen one is filled **and** bolder — never
 * colour alone (`R11`). A segmented control was the alternative and pills are what
 * he asked for; they also degrade better at `Letra grande`, where two segments of a
 * fixed-width control would clip their own words.
 *
 * ⚠️ THEY ARE NOT DRAWN AT ALL WHILE SHE IS TYPING — see `Comprar`. The search is a
 * third order and a pill claiming to own the list while `search` ranks it would be
 * a control that looks live and does nothing, which is the shape this repository
 * refuses by name.
 */
function Ordenar({
  sort,
  onSort,
}: {
  sort: CatalogSort;
  onSort: (next: CatalogSort) => void;
}) {
  const { scale } = useDensity();
  const pills: readonly { readonly key: CatalogSort; readonly word: string }[] = [
    { key: 'recent', word: ES.buy.sort.recent },
    { key: 'az', word: ES.buy.sort.az },
  ];
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={ES.buy.sort.label}
      style={{
        flexDirection: 'row',
        gap: scale.rowGap,
        paddingHorizontal: scale.space,
        paddingBottom: scale.rowGap,
      }}
    >
      {pills.map((pill) => {
        const on = pill.key === sort;
        return (
          <Pressable
            key={pill.key}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={pill.word}
            onPress={() => onSort(pill.key)}
            style={{
              paddingHorizontal: scale.space,
              paddingVertical: scale.rowGap / 2,
              borderRadius: scale.tapTarget / 2,
              borderWidth: 1,
              borderColor: on ? PALETTE.accion : PALETTE.linea,
              backgroundColor: on ? PALETTE.accionSuave : PALETTE.superficie,
            }}
          >
            <Text
              style={{
                fontSize: scale.bodySize * 0.85,
                fontWeight: on ? '700' : '400',
                color: on ? PALETTE.accion : PALETTE.tintaApagada,
              }}
            >
              {pill.word}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * ⚠️⚠️ THE PICKER — A CENTRED WINDOW WITH ITS OWN SCRIM, AND IT WAS A BOTTOM
 * SHEET UNTIL 2026-09-25. The owner: *"show a small menu that let's you pick the
 * Proveedor, the list can be short or long so adapt it, I'm thinking of a small
 * window with a scrim."*
 *
 * ⚠️ A WINDOW AND NOT A SHEET, AND THE DIFFERENCE IS WHAT IT IS FOR. A bottom
 * sheet is a drawer on the surface behind it — the basket is that, correctly. This
 * asks a question the screen cannot proceed without, so it belongs in the middle
 * where `Confirmacion` already puts one, and it has the same shape for that
 * reason: a thumb that has learned one has learned the other.
 *
 * ⚠️⚠️ *"THE LIST CAN BE SHORT OR LONG SO ADAPT IT"* IS A `maxHeight` AND NOT A
 * `height`, WHICH IS THE WHOLE OF IT. Three providers get a window three rows
 * tall; thirty get a window that stops at 70% and scrolls. ⚠️ **This is the one
 * place in this app where a card is NOT fixed**, and it is the opposite of the
 * basket sheet's ruling on purpose: the basket is fixed so `Vaciar` and the slide
 * never move, and nothing in here is a control a thumb reaches for blind.
 *
 * ⚠️ ONE TAP CONFIRMS. *"when confirming the Proveedor you can see the Catalog"* —
 * and a second *Confirmar* button under a list of single-purpose rows is a tap
 * §2.8's budget will not pay for, when the row itself already says what it does.
 *
 * ⚠️⚠️ THE GENERIC ROW IS FIRST AND CARRIES A SENTENCE. `providersFrom` promotes it
 * (F6: a default she has to scroll to is not one) and the owner's own words are
 * what the sentence says — *"a way to allow the user to make purchases from a
 * non-recurrent provider if he wants"* — because `Genérico` alone does not carry
 * that to a shopkeeper.
 *
 * ⚠️ THE CHOSEN ROW IS MARKED WITH A TICK **AND** A FILL, never a colour alone
 * (`R11`), and never a bare glyph without the name beside it (C12.1).
 *
 * ⚠️ THE SCRIM DOES NOT DISMISS WHEN THIS IS THE OPENING QUESTION, and that is
 * the one judgement in this component. Tapping past a window that exists because
 * nothing has been chosen would land on a catalog priced against a provider she
 * never picked — so on the way IN the only exits are the rows. Reopened from the
 * drop-down there IS a previous answer, so the scrim closes it like any sheet.
 */
function Proveedores({
  open,
  providers,
  chosen,
  opening,
  onClose,
  onChoose,
}: {
  open: boolean;
  providers: readonly Provider[];
  chosen: string | null;
  /** Is this the question that opens the screen, or the drop-down reopened? */
  opening: boolean;
  onClose: () => void;
  onChoose: (id: string) => void;
}) {
  const { scale } = useDensity();
  return (
    <Modal visible={open} animationType="fade" transparent onRequestClose={onClose}>
      <View style={{ flex: 1 }}>
        {opening ? (
          <View
            pointerEvents="none"
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
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={ES.buy.pickClose}
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
        )}

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
              // ⚠️ `maxHeight` AND NOT `height` — see this component's header. And
              // no `maxWidth`: `R6`, and the gate caught that once on Vender. A cap
              // in points is a size `Letra grande` cannot change; the wrapper's own
              // padding keeps the window off the edges, and that scales.
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
                  {opening ? ES.buy.pickFirst : ES.buy.pickProvider}
                </Text>
                {/* ⚠️ NO WAY OUT ON THE WAY IN — see the header. Nothing has been
                    chosen yet, so `Cerrar` would leave the screen priced against a
                    provider nobody picked. */}
                {opening ? null : (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={ES.buy.pickClose}
                    onPress={onClose}
                    style={{ minHeight: scale.tapTarget, justifyContent: 'center' }}
                  >
                    <Text
                      style={{ fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.accion }}
                    >
                      {ES.buy.pickClose}
                    </Text>
                  </Pressable>
                )}
              </View>
              {/* ⚠️ IT SAYS WHY IT IS IN THE WAY, and only on the way in: a window
                  she opened herself needs no explanation. */}
              {opening ? (
                <Text style={{ fontSize: scale.bodySize * 0.85, color: PALETTE.tintaApagada }}>
                  {ES.buy.pickWhy}
                </Text>
              ) : null}
            </View>

            <FlatList
              data={providers}
              keyExtractor={(one) => one.id}
              ItemSeparatorComponent={Separador}
              ListEmptyComponent={<Vacio line={ES.buy.loadingProviders} />}
              renderItem={({ item }) => {
                const here = item.id === chosen;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: here }}
                    accessibilityLabel={item.name}
                    onPress={() => onChoose(item.id)}
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
                        {item.name}
                      </Text>
                      {item.isGeneric ? (
                        <Text
                          style={{ fontSize: scale.bodySize * 0.85, color: PALETTE.tintaApagada }}
                        >
                          {ES.buy.genericHint}
                        </Text>
                      ) : null}
                    </View>
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
 * ⚠️⚠️ ONE ROW, AND IT CARRIES A BOX VENDER'S ROW DOES NOT. The variant name,
 * the family beneath it, **the cost — editable** — and the quantity control.
 *
 * ⚠️ THERE IS NO `Pressable` ON THE ROW AND NO DETAIL SCREEN BEHIND IT (C3.3):
 * a quantity greater than zero IS the line. And the row does NOT open La Familia
 * the way Productos' row does — a tap that navigated away mid-delivery would lose
 * her place in the list.
 *
 * ⚠️ THE LINE TOTAL IS DELIBERATELY ABSENT (C3.4). It appears in the sheet and in
 * the sticky bar; this row already carries a cost, a quantity and two buttons.
 *
 * ⚠️ THE PREFILL IS NOT WRITTEN HERE AND MUST NOT BE — see `Comprar`'s own
 * effect, and the bug that put it there: a `FlatList` unmounts rows outside its
 * render window, so a row cannot remember whether it has already been seeded.
 * This component READS the store and never seeds it.
 */
function Fila({
  entry,
  factors,
  typical,
  memory,
  providerId,
  canRead,
  onEdit,
}: {
  entry: CatalogEntry;
  factors: UnitFactors;
  /** What this product usually arrives as — `undefined` when the shop has never
   *  bought it, or when it fell out of `MAGNITUDE_LIMIT`'s window. */
  typical: Typical | undefined;
  memory: readonly MemoryRow[] | null;
  providerId: string | null;
  canRead: boolean;
  onEdit?: (editing: boolean) => void;
}) {
  const { scale } = useDensity();
  const base = useCartStore((state) => {
    for (const line of state.carts.buy) if (line.variantId === entry.id) return line.base;
    return 0;
  });
  const stored = useCartStore((state) => state.typed.buy[entry.id]);

  const state = memoryState(memory, providerId, entry.id, canRead);
  const remembered = memoryFor(memory, providerId, entry.id, entry.priceUnit, factors);

  // ⚠️ THE ALARM IS ON A ROW THAT IS IN THE DELIVERY AND NOT BEFORE, which is
  // `vender.tsx`'s condition and `5d-ii`'s argument: a product with no cost that
  // nobody is receiving is not a problem, and **the same product with a quantity
  // on it is about to be recorded for nothing.** ⚠️ Here it is also the reason a
  // control is missing, so it has to be on the row she must act on.
  //
  // ⚠️⚠️ AND IT WAITS FOR THE MEMORY TO LAND. Without `state !== 'unknown'` every
  // row would flash amber on the tap that creates it and go quiet a moment later
  // when the prefill arrives — an alarm that fires on the normal path, which is
  // `5d-ii`'s *"the alarm nobody can silence"* in miniature.
  const alarm = base > 0 && state !== 'unknown' && typeof stored !== 'string';

  // ⚠️⚠️ §2.8's MAGNITUDE WARNING, WITH BOTH HALVES LIVE — `stored` IS THE FIGURE
  // SHE TYPED, net per base at scale 6, which is the denomination the median is
  // in. Nothing converts on the way (`@/api/providers`' header): the cart already
  // holds what `record_purchase` will be sent.
  // ⚠️ IT IS NOT GATED ON `state !== 'unknown'` the way `alarm` above is. That
  // gate exists because a MISSING cost is normal for the instant before the
  // prefill lands; an outsized one is not a state this screen passes through on
  // the way to being correct, and `outsized` is silent on a `null` anyway.
  const big = magnitudeNote(outsized(typical, base, typeof stored === 'string' ? stored : null));

  return (
    <View
      style={{
        gap: scale.rowGap / 2,
        paddingVertical: scale.rowGap,
        paddingHorizontal: scale.space,
        backgroundColor: alarm ? PALETTE.atencionSuave : PALETTE.superficie,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: scale.rowGap }}>
        <Text
          numberOfLines={1}
          style={{ flex: 1, fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.tinta }}
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
        {/* ⚠️ ON THE NAME LINE BECAUSE THE LINE BELOW IS FULL — the cost box and
            the stepper take the whole of it on this screen, which Vender's row
            does not. ⚠️ AND IT NEVER TINTS THE ROW: `alarm` above does, because
            C3.13 blocks the commit on a missing cost, and §2.8 is explicit that
            this one does not block. Two amber rows meaning *you cannot send
            this* and *have a look at this* would make the first one furniture. */}
        {big === '' ? null : (
          <Text
            numberOfLines={1}
            style={{ fontSize: scale.bodySize * 0.85, fontWeight: '600', color: PALETTE.atencion }}
          >
            {big}
          </Text>
        )}
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: scale.rowGap,
        }}
      >
        <Costo
          entry={entry}
          factors={factors}
          stored={stored}
          remembered={remembered}
          state={state}
          alarm={alarm}
          live={base > 0}
        />
        <Cantidad
          entry={entry}
          base={base}
          factors={factors}
          kind="buy"
          onEdit={onEdit}
          padId={PAD_ID}
        />
      </View>
    </View>
  );
}

/**
 * ⚠️⚠️ THE COST BOX — §2.8's three price states, and the only control in this app
 * where a shopkeeper types money into a list row.
 *
 * ⚠️ WHAT IT DISPLAYS IS DERIVED FROM THE STORE ON EVERY RENDER (`costShown`) AND
 * IS NEVER ITS OWN COPY OF THE FIGURE. The store holds net-per-base at scale 6
 * and she reads pesos per price unit, so `costShown` and `typedPerBase` are exact
 * inverses — and `app/test/api-providers.test.ts` reads the ROUND TRIP, because
 * a one-centavo disagreement between them would show her a figure the ledger did
 * not get, with nothing anywhere to say so.
 *
 * ⚠️ THE DRAFT IS KEPT WHILE SHE IS TYPING, for `Cantidad`'s reason: `8.` is not
 * a price, so committing on every keystroke would forget the line the instant a
 * thumb reached the decimal point. ⚠️ A PARSEABLE keystroke DOES commit, because
 * the `Total` above and the banner beside it must not lag what she can see.
 *
 * ⚠️⚠️ AN EMPTY BOX IS A FORGOTTEN PRICE AND NOT A ZERO — `setPrice(…, null)`.
 * C3.12 is about the dash and this is the same fact about the store: a zero is a
 * cost somebody decided, and nobody decided this one.
 *
 * ⚠️ AND A FIGURE THAT WILL NOT CONVERT IS REFUSED RATHER THAN ROUNDED.
 * `typedPerBase` answers `null` when the unit is not on this phone —
 * *"a null is a unit this phone has not read"*, `stepOf`'s rule — so the line
 * stays unpriced and C3.13 blocks the commit, loudly, instead of sending
 * something.
 */
function Costo({
  entry,
  factors,
  stored,
  remembered,
  state,
  alarm,
  live,
}: {
  entry: CatalogEntry;
  factors: UnitFactors;
  stored: string | undefined;
  remembered: ReturnType<typeof memoryFor>;
  state: ReturnType<typeof memoryState>;
  alarm: boolean;
  /**
   * Is this row actually IN the delivery — a quantity greater than zero (C3.3)?
   *
   * ⚠️⚠️ IT GATES THE SENTENCE UNDER THE BOX AND NOTHING ELSE, and the reason is
   * `5d-ii`'s, applied to language instead of to colour: *"an alarm on a hundred
   * rows is the alarm nobody can silence."* On day one a shop has bought almost
   * nothing from anybody, so `Primera vez con este proveedor` under **every row
   * in the catalog** is a screen shouting a true thing a hundred times.
   * ⚠️ **The BOX itself is drawn on every row regardless**, which is the opposite
   * trade and is deliberate: a box that appeared on the first `+` would reflow the
   * row under a thumb that has just left a button, which is the objection
   * `vender.tsx`'s sticky bar already records about its own second line.
   */
  live: boolean;
}) {
  const { scale } = useDensity();
  const setPrice = useCartStore((s) => s.setPrice);
  const settled = costShown(stored, entry.priceUnit, factors);

  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? settled;

  const typeInto = (text: string) => {
    setDraft(text);
    if (text.trim() === '') {
      setPrice('buy', entry.id, null);
      return;
    }
    const centavos = parsePesos(text);
    const perBase = typedPerBase(centavos, entry.priceUnit, factors);
    if (perBase !== null) setPrice('buy', entry.id, perBase);
  };

  // ⚠️⚠️ THE SENTENCE UNDER THE BOX IS THE STATE, AND IT IS NEVER A COLOUR ALONE
  // (`R11`). `remembered` gets where the figure came from; `new-pairing` gets
  // §2.8's own question in words; ⚠️ `unknown` gets nothing at all, since *not
  // back yet* must not read as *there is nothing*.
  // ⚠️⚠️ AND NONE OF IT IS SAID ON A ROW NOBODY IS RECEIVING — see `live`.
  //
  // ----------------------------------------------------------------------------
  // ⚠️⚠️ `unreadable` IS SILENT, AND THAT CHANGED ON 2026-09-25 BECAUSE OF A RULING
  // ----------------------------------------------------------------------------
  // `5g-ii` shipped it rendering the SAME sentence as `new-pairing`, on the
  // argument that a cashier must type the cost either way and nothing on screen
  // would be false. ⚠️⚠️ **THE OWNER THEN RULED *"Comprar should be for any role
  // for now"*, AND THAT MADE THE SENTENCE A LIE RATHER THAN A SIMPLIFICATION.**
  //
  // `provider_price_memory` is manager-and-above (`0003:558`), so an Empleada's
  // read is **200 and an empty array on every row** — including rows this shop
  // HAS bought from this provider many times. Telling her *Primera vez con este
  // proveedor* there is the app asserting something it knows to be untrue, and
  // the whole point of §2.8's three states is that a screen must not answer a
  // question nobody asked.
  //
  // ⚠️ SO IT SAYS NOTHING, AND THE BOX IS STILL EMPTY AND REQUIRED — which is
  // true for her: **the app genuinely cannot tell her what this cost.** Silence is
  // the one rendering that is accurate for both halves of a state the screen
  // cannot resolve.
  //
  // ⚠️ AND IT DOES NOT EXPLAIN THE FENCE TO HER EITHER. *"No puedes ver los
  // precios anteriores"* is a role boundary she did not ask about and cannot
  // change ([[users-dont-do-bookkeeping]]) — and it would be wrong on the rows
  // that really are new, which nothing here can distinguish.
  //
  // ⚠️⚠️ WHAT IS STILL OPEN IS NOT THIS LINE: it is whether the VIEW should be
  // widened so she gets the prefill at all. That is a migration and it puts every
  // cost this shop has ever paid in front of a cashier, so it is in
  // ⛔ DECISIONS OWED rather than taken here.
  // ⚠️ THE CHOICE IS `costNote`'s AND THE WORDS ARE `ES.buy`'s — this file holds
  // neither (`R3`, `R4`), which is what lets `app/test/api-providers.test.ts` pin
  // the ruling above instead of a reviewer having to spot it in a ternary.
  const which = live ? costNote(state, remembered) : null;
  const note =
    which === 'last-paid' && remembered !== null
      ? ES.buy.lastPaid(remembered.price)
      : which === 'new-pairing'
        ? ES.buy.newPairing
        : null;

  return (
    <View style={{ flex: 1, gap: scale.rowGap / 4 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: scale.rowGap / 2,
          minHeight: scale.tapTarget,
          paddingHorizontal: scale.rowGap,
          borderRadius: scale.space / 2,
          borderWidth: 1,
          borderColor: alarm ? PALETTE.atencion : PALETTE.accion,
          backgroundColor: PALETTE.superficie,
        }}
      >
        <Text style={{ fontSize: scale.bodySize, color: PALETTE.tintaApagada }}>$</Text>
        <TextInput
          value={shown}
          onChangeText={typeInto}
          onFocus={() => setDraft(shown)}
          onBlur={() => setDraft(null)}
          placeholder={ES.buy.costHint}
          placeholderTextColor={PALETTE.tintaApagada}
          // ⚠️ `decimal-pad` AND NOT `numeric`: C12.2 puts the point in `35.50`,
          // and `numeric` carries a minus sign and an exponent on some Android
          // keyboards. Neither is a cost. ⚠️ `parsePesos` is still what READS it —
          // a pad is a convenience, never a validator.
          keyboardType="decimal-pad"
          inputAccessoryViewID={PAD_ID}
          accessibilityLabel={`${ES.buy.cost} ${entry.name}`}
          style={{
            flex: 1,
            minHeight: scale.tapTarget,
            fontSize: scale.bodySize,
            fontWeight: '600',
            color: PALETTE.tinta,
          }}
        />
        {/* ⚠️ WHAT THE COST IS PER, IN C3.10's OWN SEPARATOR. A money box with no
            unit beside it is the one figure a shopkeeper could read two ways. */}
        <Text style={{ fontSize: scale.bodySize * 0.85, color: PALETTE.tintaApagada }}>
          {`${ES.catalog.per} ${entry.priceUnit}`}
        </Text>
      </View>

      {note === null ? null : (
        <Text
          numberOfLines={1}
          style={{
            fontSize: scale.bodySize * 0.85,
            fontWeight: alarm ? '600' : '400',
            color: alarm ? PALETTE.atencion : PALETTE.tintaApagada,
          }}
        >
          {note}
        </Text>
      )}
    </View>
  );
}

/**
 * ⚠️⚠️ C3.4's STICKY BAR — ARRANGEMENT A, the owner's ruling of 2026-09-24, and
 * the same two rows Vender carries: the summary reads, the slide acts.
 *
 * ⚠️⚠️ AND HERE THE SECOND ROW MAY CARRY NO SLIDE AT ALL, WHICH IS C3.13. While
 * any line has no cost the track is **absent** and the banner is in its place —
 * not a dead control, and not a slide that refuses after the thumb has finished.
 * ⚠️ `Vaciar carrito` STAYS, and this is exactly the case where a shopkeeper is
 * most likely to want it.
 *
 * ⚠️ THE BANNER SAYS WHAT IS MISSING AND HOW MANY, never *"no puedes"*: the fix
 * is one box away on the row she is already looking at, which is the owner's own
 * rule and the opposite of Vender's C3.14.
 */
function Barra({
  basket,
  missing,
  onOpen,
  onCommit,
  onEmpty,
  canBuy,
}: {
  basket: Basket | null;
  missing: number;
  onOpen: () => void;
  onCommit: () => void;
  onEmpty: () => void;
  canBuy: boolean;
}) {
  const { scale } = useDensity();
  const live = basket !== null && basket.lines > 0;
  const Strip = live ? Pressable : View;
  return (
    <View
      style={{ borderTopWidth: 1, borderTopColor: PALETTE.linea, backgroundColor: PALETTE.banda }}
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
                fontSize: scale.bodySize * 0.85,
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
              unknown — C3.12's character, on C3.12's reasoning. */}
          <Text style={{ fontSize: scale.moneySize, fontWeight: '700', color: PALETTE.tinta }}>
            {basket === null ? ES.catalog.noPrice : formatMXN(basket.centavos)}
          </Text>
        </View>
      </Strip>

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

          {canBuy ? (
            <View style={{ flex: 1 }}>
              <Deslizador
                word={ES.buy.slide.word}
                label={ES.buy.slide.label}
                onCommit={onCommit}
                onTap={onOpen}
              />
            </View>
          ) : (
            <Bloqueo missing={missing} />
          )}
        </View>
      ) : null}
    </View>
  );
}

/**
 * ⚠️⚠️ WHY THERE IS NO SLIDE — C3.13, and it takes the track's place rather than
 * sitting under it, so the space where a thumb reaches for the commit explains
 * itself instead of being empty.
 *
 * ⚠️ IT IS A COLOUR **AND** A SENTENCE (`R11`), and the sentence names the COST
 * rather than *a price*: the shelf price may be sitting right there and is not
 * the missing number.
 *
 * ⚠️ IT IS DRAWN ON `missing === 0` TOO, and that is not dead code — `canCommit`
 * refuses for four other reasons (`no-location` in a two-store workspace, a
 * variant that has left the catalog, and two that cannot happen here), and every
 * one of them is a programming error with no sentence of its own (`R4`). A blank
 * strip is the honest rendering of *this cannot be committed and we will not
 * guess why*, and it is not reachable in the pilot's one-store shops.
 */
function Bloqueo({ missing }: { missing: number }) {
  const { scale } = useDensity();
  if (missing === 0) return <View style={{ flex: 1 }} />;
  return (
    <View
      style={{
        flex: 1,
        minHeight: scale.tapTarget,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: scale.rowGap,
        borderRadius: scale.tapTarget / 2,
        borderWidth: 1,
        borderColor: PALETTE.atencion,
        backgroundColor: PALETTE.atencionSuave,
      }}
    >
      <Text
        numberOfLines={1}
        style={{ fontSize: scale.bodySize * 0.9, fontWeight: '700', color: PALETTE.atencion }}
      >
        {ES.buy.blocked(missing)}
      </Text>
    </View>
  );
}

/**
 * ⚠️⚠️ C3.5's SHEET — the review before the commit, one of §2.8's three
 * *Error prevention* guards, and on this counter it is also **where the missing
 * costs get typed**: the row here carries the same `Costo` box the list does,
 * because C3.13 requires the fix to be fast from where she already is.
 *
 * ⚠️ A FIXED HEIGHT, RULED 2026-09-24 — *"let's just make the height of the
 * carrito fixed."* The reason it is better is muscle memory rather than tidiness:
 * `Vaciar carrito` and the slide are in the SAME PLACE on every delivery.
 *
 * ⚠️ AN `RN` `Modal` AND NOT A ROUTE — a route would re-read the catalog, the
 * unit factors, the workspace and the provider memory to show a subset of what is
 * already on screen.
 */
function Carrito({
  open,
  onClose,
  review,
  entries,
  factors,
  typicals,
  memory,
  providerId,
  canRead,
  missing,
  onCommit,
  onEmpty,
  canBuy,
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
   *  than read again: `useMagnitude` inside the sheet would be a second
   *  subscriber to one cache entry and a second answer to the same question. */
  typicals: Typicals;
  memory: readonly MemoryRow[] | null;
  providerId: string | null;
  canRead: boolean;
  missing: number;
  onCommit: () => void;
  onEmpty: () => void;
  canBuy: boolean;
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
        {/* ⚠️ THE VELO CLOSES THE SHEET — ruled 2026-09-24. It is a separate view
            under an `opacity` rather than a translucent fill on the container,
            because `opacity` on a parent dims its children and would put the
            sheet itself behind the dimming. The hue is a role (`R11`). */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={ES.counter.cart.close}
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
          <View
            style={{
              height: '72%',
              borderTopLeftRadius: scale.space,
              borderTopRightRadius: scale.space,
              backgroundColor: PALETTE.fondo,
              paddingBottom: insets.bottom,
            }}
          >
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
                  memory={memory}
                  providerId={providerId}
                  canRead={canRead}
                />
              )}
              ItemSeparatorComponent={Separador}
              ListEmptyComponent={<Vacio line={ES.counter.emptyCart} />}
              keyboardShouldPersistTaps="handled"
            />

            {rows.length === 0 ? null : (
              <Vaciar canBuy={canBuy} missing={missing} onCommit={onCommit} onAsk={onEmpty} />
            )}
          </View>
        </KeyboardAvoidingView>

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
 * One line of the delivery, as the sheet draws it.
 *
 * ⚠️⚠️ IT CARRIES THE COST BOX AND VENDER'S ROW DOES NOT, which is C3.13's
 * *"fast from where she already is"* honoured on the surface she is most likely
 * to be on when the banner stops her: the sheet is where she checks the delivery
 * note against the screen.
 *
 * ⚠️ A ROW WHOSE PRODUCT HAS LEFT THE CATALOG IS DRAWN AND NOT HIDDEN — see
 * `reviewOf`. `draftOf` refuses the whole basket for it, and this sheet is the
 * only surface that can remove it, because the list behind it is the catalog and
 * the catalog no longer has the row. It keeps its `Quitar` and loses both
 * controls: there is no price unit to step in and none to cost per.
 *
 * ⚠️ THE LINE TOTAL IS A DASH WHEN IT COULD NOT BE PRICED, never `$0.00` (C3.12).
 *
 * ⚠️ FOUR LINES AND NOT ONE, for `vender.tsx`'s measured reason: at `Letra
 * grande` on a 393 pt iPhone the stepper alone is 222 pt, and this row adds a
 * money box the sale's does not have. A review screen is the one place a product
 * name may not be squeezed — it is what the delivery note is being checked
 * against.
 */
function Renglon({
  row,
  entry,
  factors,
  typical,
  memory,
  providerId,
  canRead,
}: {
  row: ReviewRow;
  entry: CatalogEntry | undefined;
  factors: UnitFactors;
  typical: Typical | undefined;
  memory: readonly MemoryRow[] | null;
  providerId: string | null;
  canRead: boolean;
}) {
  const { scale } = useDensity();
  const remove = useCartStore((state) => state.remove);
  const stored = useCartStore((state) => (entry === undefined ? undefined : state.typed.buy[entry.id]));
  const gone = entry === undefined;

  const state = memoryState(memory, providerId, row.variantId, canRead);
  const remembered =
    entry === undefined
      ? null
      : memoryFor(memory, providerId, entry.id, entry.priceUnit, factors);
  const alarm = !gone && state !== 'unknown' && typeof stored !== 'string';

  // ⚠️⚠️ THE WARNING IS ON THE SHEET **AS WELL AS** ON THE LIST, AND THAT IS NOT
  // A DUPLICATE. §2.8's three guards compound and review-before-commit is the
  // second of them; the sheet is the last surface before the slide, and it is
  // where the delivery note is actually being read against the screen.
  const big = magnitudeNote(outsized(typical, row.base, typeof stored === 'string' ? stored : null));

  return (
    <View
      style={{
        gap: scale.rowGap / 2,
        paddingVertical: scale.rowGap,
        paddingHorizontal: scale.space,
        backgroundColor: alarm ? PALETTE.atencionSuave : PALETTE.superficie,
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
          {gone ? ES.counter.cart.gone : (row.familyName ?? '')}
        </Text>
        {/* ⚠️ THE MISSING COST WINS WHEN BOTH APPLY, which is not arbitrary:
            C3.13 makes it the thing that decides whether this delivery can be
            sent at all, and §2.8 makes this one advisory. */}
        {big === '' || alarm ? null : (
          <Text
            numberOfLines={1}
            style={{ fontSize: scale.bodySize * 0.85, fontWeight: '600', color: PALETTE.atencion }}
          >
            {big}
          </Text>
        )}
        {alarm ? (
          <Text
            style={{ fontSize: scale.bodySize * 0.85, fontWeight: '600', color: PALETTE.atencion }}
          >
            {ES.buy.costMissing}
          </Text>
        ) : null}
      </View>

      {gone || entry === undefined ? null : (
        <Costo
          entry={entry}
          factors={factors}
          stored={stored}
          remembered={remembered}
          state={state}
          alarm={alarm}
          // ⚠️ ALWAYS, because every row in the sheet is a line by construction —
          // `reviewOf` has already narrowed the basket to the lines that exist.
          live
        />
      )}

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        {gone || entry === undefined ? (
          <View />
        ) : (
          <Cantidad
            entry={entry}
            base={row.base}
            factors={factors}
            kind="buy"
            padId={PAD_ID}
          />
        )}

        {/* ⚠️ A WORD AND NOT A GLYPH — an icon plus its word does not fit beside
            the stepper at `Letra grande`, and an icon alone on the one control
            that destroys something is what C12.1 refuses. `error` is the
            palette's own sentence for this role: it names `Quitar` first. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${ES.counter.cart.remove} ${row.name ?? ES.counter.cart.goneName}`}
          onPress={() => remove('buy', row.variantId)}
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
 * ⚠️ THE SHEET'S FOOT — `Vaciar carrito`, and the second slide, ruled by the
 * owner 2026-09-24: *"The slide bar should also be present in the check out if we
 * open the Carrito."* It is the same `Deslizador`, narrower, so there is one
 * answer to *how far is far enough* and `COMMIT_AT` is where it lives.
 *
 * ⚠️ AND HERE TOO IT MAY BE THE BANNER INSTEAD (C3.13). ⚠️ **That is the whole
 * reason the cost box is on the row above**: the sheet is the surface she is on
 * when the block stops her, so the fix has to be reachable without closing it.
 */
function Vaciar({
  onAsk,
  onCommit,
  canBuy,
  missing,
}: {
  onAsk: () => void;
  onCommit: () => void;
  canBuy: boolean;
  missing: number;
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

      {canBuy ? (
        <View style={{ flex: 1 }}>
          {/* ⚠️⚠️ NO `onTap`, AND THAT IS THE 2026-09-25 RULING. It shipped as
              `onOpen={onClose}` — a tap on the track CLOSED the review screen — and
              he refused it: *"when a carrito is open … do not close the carrito."*
              The `Deslizador` still nudges, so the touch is answered. */}
          <Deslizador
            compact
            word={ES.buy.slide.word}
            label={ES.buy.slide.labelInCart}
            onCommit={onCommit}
          />
        </View>
      ) : (
        <Bloqueo missing={missing} />
      )}
    </View>
  );
}

/**
 * ⚠️ THE EMPTYING QUESTION AND ITS ANSWER — a centred box with its own scrim, the
 * owner's specification of 2026-09-24, and ONE component with ONE state rendered
 * from two places. Two copies would be two questions that drift apart.
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
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: scale.space * 2 }}
      >
        <View
          style={{
            width: '100%',
            // ⚠️ NO `maxWidth` — `R6`, and the gate caught it once on Vender. A
            // cap in points is a size `Letra grande` cannot change; the wrapper's
            // own padding keeps the box off the edges, and that scales.
            borderRadius: scale.space,
            backgroundColor: PALETTE.fondo,
            padding: scale.space * 1.5,
            gap: scale.space,
          }}
        >
          {emptied ? (
            <Vaciado bloom={bloom} />
          ) : (
            <Pregunta onConfirm={onConfirm} onCancel={onCancel} />
          )}
        </View>
      </View>
    </View>
  );
}

/**
 * ⚠️ THE QUESTION, IN A BOX OF ITS OWN — the owner's wording of 2026-09-24.
 * `Cancelar` is drawn in `accion` and `Sí, vaciar` in `error`, which is the
 * palette's own sentence applied: `error` is *what DESTROYS*, and the way out of
 * a destructive question is not itself destructive.
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
        {ES.counter.cart.emptyAsk}
      </Text>
      <View style={{ gap: scale.rowGap }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={ES.counter.cart.emptyConfirm}
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
            {ES.counter.cart.emptyConfirm}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={ES.counter.cart.emptyCancel}
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
            {ES.counter.cart.emptyCancel}
          </Text>
        </Pressable>
      </View>
    </>
  );
}

/**
 * ⚠️ THE EMPTYING CONFIRMATION. `opacity` and `scale` and nothing else (§2.11),
 * driven from `Comprar`'s effect — see the argument there for why it is not
 * started where the tap happens. ⚠️ AND IT CARRIES A WORD: motion with no
 * language is a state announced on the one channel a person can miss by looking
 * away.
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
 * ⚠️⚠️ THE DELIVERY'S OWN CONFIRMATION, AND IT FIRES ON **ENQUEUE** RATHER THAN
 * ON THE SERVER'S REPLY. C10.3 says the slide looks identical offline, and `5c-i`
 * made that structural by having `queueWrite` return a ROW rather than a promise.
 * An animation that awaited Postgres would be the offline path looking different
 * in the one place nobody tests, because every desk this was written at has a
 * working connection.
 *
 * ⚠️ `transform` AND `opacity` ONLY (§2.11), and started in an effect rather than
 * in the handler that mounts it — on the native driver the other way round fails
 * silently: no error, no motion.
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
          {ES.buy.recorded}
        </Text>
      </Animated.View>
    </View>
  );
}
