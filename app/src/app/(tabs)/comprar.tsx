import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { catalogLine, initials, search, type CatalogEntry, type UnitFactors } from '@/api/catalog';
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
  canReadMemory,
  costShown,
  defaultProvider,
  lastPurchasedFor,
  memoryFor,
  memoryState,
  providerById,
  providerPickLine,
  sortedForBuying,
  typedPerBase,
  type MemoryRow,
  type Provider,
} from '@/api/providers';
import { cardCost, cardNote, marginOf } from '@/cart/buying';
import { reviewOf, stepOf, type Basket, type Review, type ReviewRow } from '@/cart/cart';
import { canCommit, commitOf, type Basketful } from '@/cart/commit';
import { buyGate } from '@/cart/gate';
import { useCart, useCartStore, useCorrects, useProviderId, useTyped } from '@/cart/store';
import { formatLastBought } from '@/format/date';
import { formatMXN } from '@/format/mxn';
import { commitToQueue } from '@/lib/commitRunner';
import { newWriteId, nowIso } from '@/lib/ids';
import { comportamientoTeclado } from '@/lib/teclado';
import { useDesfaseTeclado } from '@/lib/useDesfaseTeclado';
import { usePilotVisit } from '@/pilot/usePilotVisit';
import { correctingLine } from '@/api/corrections';
import { useOnline } from '@/offline/useOnline';
import { ES } from '@/strings';
import { useDensity } from '@/theme/DensityProvider';
import { TITULO } from '@/theme/letra';
import { PALETTE } from '@/theme/palette';
import { EMPTIED_BLOOM_MS } from '@/theme/pulse';
import { Buscador } from '@/ui/Buscador';
import { Cantidad } from '@/ui/Cantidad';
import { CierreCarrito } from '@/ui/CierreCarrito';
import { Hecho } from '@/ui/Hecho';
import { HojaCarrito } from '@/ui/HojaCarrito';
import { HojaPrecio } from '@/ui/HojaPrecio';
import { Retrato } from '@/ui/Retrato';
import { Separador } from '@/ui/Separador';
import { TecladoListo } from '@/ui/TecladoListo';
import { TotalCarrito } from '@/ui/TotalCarrito';
import { Vacio } from '@/ui/Vacio';
import { Corrigiendo } from '@/ui/Corrigiendo';
import { VaciarCarrito } from '@/ui/VaciarCarrito';
import { Velo } from '@/ui/Velo';

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
// ⚠️⚠️ ROUND 4 OF `8g` (2026-10-16) — THE OWNER'S CARD GRID, IN COMPRAR'S BLUE
// ----------------------------------------------------------------------------
// He chose it off the canvas (*"Colors are amazing"*, *"Looks good. Proceed"*)
// over four arrangements, and it supersedes the row this file drew since `5g-ii`:
//
//   * **WHO IS DELIVERING IS A BLUE CARD AT THE TOP** — *TE ENTREGA · Don Chuy*,
//     a magnifier that opens the search under it, and `Cambiar`. The drop-down
//     field and its *Comprando a:* label are gone; the picker it opened is the
//     same centred window (`Proveedores`, his ruling of 2026-09-25).
//   * **THE CATALOG IS CARDS, TWO ACROSS** — one across at `Letra grande`, and on
//     a phone too narrow for two of Vender's steppers side by side. Each card: the
//     product's square, its name, the cost box, the caption, the stepper, and the
//     margin pill.
//   * **EVERY CARD'S BOX HOLDS THIS PROVIDER'S LAST COST**, his ruling: *"The
//     price gets prefilled by the previous price"* — `Anterior · hace N días`,
//     and once changed, `Antes $X` with a blue edge. The rules are
//     `@/cart/buying`'s. ⚠️ This reverses `5g-ii`'s *say it only on a row in the
//     delivery*: he drew *Primera vez con Don Chuy* on cards nobody was receiving.
//   * **A COST COMES FIRST** — *"Same behaviour as Vender: to add something to
//     the carrito, a price must be entered first."* `+` on a card with no cost
//     opens *¿Cuánto te costó?* (`CostoPrimero`), Vender's price sheet's frame.
//     C3.13's banner stays, for a cost emptied after the line went in.
//   * **THE ORDER IS ONE ORDER** — bought from this provider, most recent first,
//     then the rest; no sections. ⚠️ So the *Recientes / A-Z* pills are gone, a
//     decision taken on his behalf: his drawing had none, and the search finds
//     by name.
//   * **THE CARRITO IS THE SIMPLE ONE** — *"editable fields for both price and
//     quantity … and few insights."* Each line: name and total, the cost box, the
//     stepper and `Quitar`. Its frame, foot and questions are Vender's
//     (`src/ui/`), on *"make sure the geometries in common are the same."*
//
// ⚠️ R9: whether two cards read at a glance on a small Android, whether the
// prefilled box reads as last time's figure rather than as today's, and whether
// the blue card is noticed as the way to change provider are his phone's.
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
// `Comprar`'s seeding effect, where the one subtle piece of state in this file lives.
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
// bought before** — `@/cart/buying`'s `cardNote` says nothing to her. `5g-ii` shipped
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
// nothing takes tier 2/3 — the automated default. ⚠️ **The ADR's own cell lagged
// that ruling; it has since been marked LATENT in the ADR and the question is no
// longer in the plan's decisions block (corrected 2026-10-13).**
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
  const { scale, mode } = useDensity();
  const insets = useSafeAreaInsets();
  // ⚠️ `8g`, 2026-10-22: on Android 15+ the keyboard's room counts from where this counter starts (`@/lib/useDesfaseTeclado`).
  const desfase = useDesfaseTeclado(scale.tabBarHeight + insets.bottom);
  const { width } = useWindowDimensions();

  // ⚠️ THE CATALOG IS READ UNFILTERED AND NARROWED FOR THE LIST ONLY — Vender's
  // own measurement: pricing a basket against the MATCHING rows would make the
  // `Total` fall every time she typed a different product's name.
  const { loading, entries, failed, locationId } = useCatalog('');
  // ⚠️ `8g`'s round 3: with no catalog or no suppliers in hand and no signal, the
  // list, the blue card and the picker say *Se ve cuando haya señal* rather than
  // *Cargando…* for ever (`catalogLine`, `providerPickLine`).
  const online = useOnline();
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
  const searching = typed.trim() !== '';
  // ⚠️ ROUND 4: THE SEARCH IS BEHIND THE BLUE CARD'S MAGNIFIER, and closing it
  // forgets what was typed — a list still filtered by a box nobody can see is a
  // catalog that has silently lost its products.
  const [lookingUp, setLookingUp] = useState(false);
  const toggleSearch = useCallback(() => {
    setLookingUp((open) => {
      if (open) {
        setTyped('');
        Keyboard.dismiss();
      }
      return !open;
    });
  }, []);
  useEffect(() => {
    if (lookingUp) box.current?.focus();
  }, [lookingUp]);

  // ⚠️⚠️ TWO CARDS ACROSS ONLY WHERE TWO OF VENDER'S STEPPERS FIT — the round
  // buttons are `tapTarget` and stay so (*"the geometries in common are the
  // same"*), so a card needs two of them and a box at least one wide. At
  // `Letra grande`, or on a phone narrower than that, it is one card across.
  // ⚠️ Layout, not a rule with a right answer, so it is here and untested (§2.11).
  const across =
    mode === 'elder' ||
    (width - scale.space * 2 - scale.rowGap) / 2 - scale.rowGap * 2 < scale.tapTarget * 3 + scale.rowGap
      ? 1
      : 2;
  const cardWidth = (width - scale.space * 2 - scale.rowGap * (across - 1)) / across;

  const list = useRef<FlatList<CatalogEntry>>(null);
  const editing = useRef<number | null>(null);

  // ⚠️ IT WAITS FOR THE KEYBOARD TO BE UP rather than firing on focus, which is
  // `vender.tsx`'s measurement: scrolling on focus centres the row in a viewport
  // that is about to shrink, and the resize then pushes it back down.
  useEffect(() => {
    const up = Keyboard.addListener('keyboardDidShow', () => {
      const at = editing.current;
      if (at === null || at < 0) return;
      // ⚠️ A ROW OF CARDS, NOT A CARD: with `numColumns` the list's index is the
      // row's, so the card's own index is divided down to it.
      list.current?.scrollToIndex({ index: Math.floor(at / across), viewPosition: 0.5, animated: true });
    });
    return () => up.remove();
  }, [across]);

  const cart = useCart('buy');
  // ⚠️ `8p`: the delivery this basket re-keys, so it counts on that day.
  const corrects = useCorrects('buy');
  // ⚠️ `8g`: while the cart is a correction, which document it is — the strip
  // and the *Vaciar* box say so (`@/ui/Corrigiendo`).
  const correcting = corrects === null ? null : ES.counter.cart.correctionWhat.purchase;
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

  const { loading: providersOut, providers, memory, failed: providersFailed } = useProviders(providerId);
  const provider = providerById(providers, providerId);
  const pickLine = providerPickLine(providersOut, providersFailed, online);

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
      // ⚠️⚠️ A LINE THAT ALREADY CARRIES A TYPED QUOTE IS LEFT ALONE, AND THIS
      // ARRIVED WITH `5h-ii-b`. `seeded` is a ref on the SCREEN, so it is empty
      // on every mount — which means a cart that came from somewhere other than
      // this render had its prices overwritten by the provider's memory before
      // they were ever seen. **Two ways in:** `Corregir` loads a voided
      // delivery's own prices and pushes straight here, and a persisted cart
      // (`CART_KEY`) restores typed prices across an app restart. In both the
      // memory read is a STALER answer than the one already in hand.
      // ⚠️ It is marked seeded, not merely skipped, so this does not re-decide
      // every render.
      if (quotes[line.variantId] !== undefined) {
        seeded.current.add(key);
        continue;
      }
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
  }, [cart, entries, memory, providerId, canRead, factors, quotes, setPrice]);

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
  const bought = useMemo(() => lastPurchasedFor(memory, providerId), [memory, providerId]);
  const rows = searching ? search(entries, typed) : sortedForBuying(entries, 'recent', bought);

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

  // ⚠️⚠️ ROUND 4: `+` ON A CARD WITH NO COST OPENS THE COST QUESTION, and saving
  // it puts the cost in the cart's typed map and one step in the delivery — in
  // that order, so `seeded` above finds a quote and leaves it (`5h-ii-b`'s rule).
  const [costing, setCosting] = useState<CatalogEntry | null>(null);
  const bump = useCartStore((state) => state.step);
  const costed = useCallback(
    (entry: CatalogEntry, perBase: string) => {
      setPrice('buy', entry.id, perBase);
      bump('buy', entry.id, stepOf(entry.priceUnit, factors), 1);
      setCosting(null);
    },
    [setPrice, bump, factors],
  );

  const [asking, setAsking] = useState(false);
  const [emptied, setEmptied] = useState(false);
  const bloom = useRef(new Animated.Value(0)).current;
  const [recorded, setRecorded] = useState(false);
  // ⚠️ §5's readings (plan `5P-a`) — a no-op on any build made without
  // `EXPO_PUBLIC_PILOT`. Nothing on this screen is drawn differently for it.
  const pilot = usePilotVisit('comprar', workspace?.id ?? null, locationId);
  useEffect(() => {
    if (recorded) pilot.confirmed();
  }, [recorded, pilot]);

  const basketful: Basketful | null =
    workspace === null
      ? null
      : {
          cart,
          entries,
          factors,
          scope: 'buy',
          pricesIncludeTax: workspace.pricesIncludeTax,
          workspaceId: workspace.id,
          locationId,
          quotes,
          providerId,
          corrects,
        };

  // ⚠️ `transform` AND `opacity` ONLY (§2.11), AND STARTED IN AN EFFECT rather
  // than in the handler that sets the state — on the native driver the other way
  // round fails silently: no error, no motion.
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
    pilot.committed();
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
  }, [basketful, clear, pilot]);

  return (
    <KeyboardAvoidingView
      onTouchStart={pilot.onTouchStart}
      // ⚠️ NO `paddingTop: insets.top` — the tab navigator already draws a header
      // below the notch, and counting the inset again is the dead space the owner
      // reported on Vender on 2026-09-24.
      style={{ flex: 1, backgroundColor: PALETTE.compraFondo }}
      behavior={comportamientoTeclado(Platform.OS, Platform.Version)}
      onLayout={desfase.onLayout}
      keyboardVerticalOffset={desfase.offset}
    >
      {corrects === null ? null : (
        <View style={{ paddingHorizontal: scale.space, paddingTop: scale.rowGap }}>
          <Corrigiendo line={correctingLine('purchase', corrects)} onCancel={() => setAsking(true)} />
        </View>
      )}
      <Proveedor
        provider={provider}
        loading={providersOut}
        waiting={pickLine}
        lookingUp={lookingUp}
        onSearch={toggleSearch}
        onChange={() => setPicking(true)}
      />

      {lookingUp ? (
        <Buscador value={typed} onChange={setTyped} box={box} placeholder={ES.catalog.search} />
      ) : null}

      <FlatList
        ref={list}
        // ⚠️ `key` CHANGES WITH THE COLUMN COUNT: a `FlatList` cannot change
        // `numColumns` in place, and `Letra grande` switched on mid-delivery is
        // exactly that.
        key={across}
        numColumns={across}
        data={rows}
        keyExtractor={(entry) => entry.id}
        renderItem={({ item, index }) => (
          <Tarjeta
            entry={item}
            width={cardWidth}
            factors={factors}
            typical={typicals[item.id]}
            memory={memory}
            providerId={providerId}
            provider={provider}
            boughtAt={bought[item.id]}
            canRead={canRead}
            onEdit={(on) => {
              editing.current = on ? index : null;
            }}
            onCostFirst={setCosting}
          />
        )}
        columnWrapperStyle={across > 1 ? { gap: scale.rowGap } : undefined}
        ListEmptyComponent={<Vacio line={catalogLine(loading, typed, failed, online)} />}
        contentContainerStyle={{ padding: scale.space, gap: scale.rowGap }}
        onScrollToIndexFailed={({ index }) => {
          list.current?.scrollToOffset({ offset: index * scale.retratoSize * 3, animated: true });
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
        provider={provider}
        canRead={canRead}
        missing={missing}
        onCommit={commit}
        onEmpty={() => setAsking(true)}
        correcting={correcting}
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
        <VaciarCarrito
          asking={asking}
          emptied={emptied}
          bloom={bloom}
          count={cart.length}
          correcting={correcting}
          onConfirm={emptyCart}
          onCancel={() => setAsking(false)}
        />
      ) : null}

      {costing !== null ? (
        <CostoPrimero
          entry={costing}
          factors={factors}
          provider={provider}
          first={memoryState(memory, providerId, costing.id, canRead) === 'new-pairing'}
          onSave={costed}
          onClose={() => setCosting(null)}
        />
      ) : null}

      <Proveedores
        open={picking}
        providers={providers}
        waiting={pickLine}
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

      <Hecho shown={recorded} word={ES.buy.recorded} onDone={() => setRecorded(false)} />

      {/* ⚠️ MOUNTED ONCE AND OUTSIDE EVERY CONDITIONAL. `InputAccessoryView`
          renders into the keyboard rather than into the layout, so where it sits
          does not matter — but mounting it in a branch means the bar vanishing
          exactly while a read is out. */}
      <TecladoListo padId={PAD_ID} label={ES.buy.done} />
    </KeyboardAvoidingView>
  );
}

/**
 * ⚠️⚠️ WHO IS DELIVERING — ROUND 4's BLUE CARD (2026-10-16), and it replaced the
 * drop-down field of 2026-09-25. *TE ENTREGA* over the provider's name in the
 * titles' face, a magnifier, and `Cambiar`.
 *
 * ⚠️ `Cambiar` OPENS THE SAME CENTRED WINDOW THE FIELD DID (`Proveedores`), and a
 * word on a button is the affordance the field's border used to be (C12.1).
 *
 * ⚠️ THE MAGNIFIER HAS NO WORD BESIDE IT, AND C12.1 IS BENT ONCE, KNOWINGLY: the
 * owner drew it bare. Its screen-reader label is the word, and pressed it is
 * filled, so open and closed are not a colour alone.
 *
 * ⚠️ IT DOES NOT SCROLL, for the old header's reason: a shop with a hundred
 * products is the shop where a scrolled-away provider is a delivery recorded
 * against the wrong one.
 */
function Proveedor({
  provider,
  loading,
  waiting,
  lookingUp,
  onSearch,
  onChange,
}: {
  provider: Provider | null;
  loading: boolean;
  /** What the card says with no supplier to name — `providerPickLine`'s answer. */
  waiting: string;
  lookingUp: boolean;
  onSearch: () => void;
  onChange: () => void;
}) {
  const { scale } = useDensity();
  const unknown = provider === null;
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: scale.rowGap,
        marginHorizontal: scale.space,
        marginTop: scale.space,
        paddingHorizontal: scale.space,
        paddingVertical: scale.rowGap,
        borderRadius: scale.space * 1.5,
        backgroundColor: PALETTE.compra,
      }}
    >
      {/* ⚠️ `flexWrap` AND NOT A BRANCH ON THE MODE — Vender's row's rule: where
          the name and both buttons do not fit (`Letra grande`, a narrow phone),
          the buttons drop under the name, which keeps the provider readable. */}
      <View
        style={{
          flexGrow: 1,
          flexBasis: scale.tapTarget * 3.5,
          flexDirection: 'row',
          alignItems: 'center',
          gap: scale.rowGap,
        }}
      >
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{
            width: scale.tapTarget,
            height: scale.tapTarget,
            borderRadius: scale.tapTarget / 2,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: PALETTE.compraSuave,
          }}
        >
          <Text style={{ fontSize: scale.bodySize, fontWeight: '800', color: PALETTE.compra }}>
            {unknown ? '' : initials(provider.name)}
          </Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text
            style={{ fontSize: scale.smallSize * 0.8, fontWeight: '700', color: PALETTE.superficie, opacity: 0.8 }}
          >
            {ES.buy.supplier.label}
          </Text>
          <Text numberOfLines={1} style={{ fontSize: scale.titleSize * 0.9, ...TITULO, color: PALETTE.superficie }}>
            {unknown ? waiting : provider.name}
          </Text>
        </View>
      </View>

      <View style={{ flexGrow: 1, flexDirection: 'row', justifyContent: 'flex-end', gap: scale.rowGap }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={lookingUp ? ES.buy.supplier.searchClose : ES.buy.supplier.search}
          accessibilityState={{ expanded: lookingUp }}
          onPress={onSearch}
          style={{
            width: scale.tapTarget,
            height: scale.tapTarget,
            borderRadius: scale.tapTarget / 2,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: PALETTE.superficie,
            backgroundColor: lookingUp ? PALETTE.superficie : undefined,
          }}
        >
          <MaterialCommunityIcons
            name={lookingUp ? 'close' : 'magnify'}
            size={scale.iconSize}
            color={lookingUp ? PALETTE.compra : PALETTE.superficie}
          />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${ES.buy.supplier.change} ${unknown ? '' : provider.name}`}
          accessibilityState={{ disabled: loading }}
          disabled={loading}
          onPress={onChange}
          style={{
            minHeight: scale.tapTarget,
            justifyContent: 'center',
            paddingHorizontal: scale.space,
            borderRadius: scale.tapTarget / 2,
            borderWidth: 1,
            borderColor: PALETTE.superficie,
          }}
        >
          <Text style={{ fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.superficie }}>
            {ES.buy.supplier.change}
          </Text>
        </Pressable>
      </View>
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
 * where `VaciarCarrito` already puts one, and it has the same shape for that
 * reason: a thumb that has learned one has learned the other.
 *
 * ⚠️⚠️ *"THE LIST CAN BE SHORT OR LONG SO ADAPT IT"* IS A `maxHeight` AND NOT A
 * `height`, WHICH IS THE WHOLE OF IT. Three providers get a window three rows
 * tall; thirty get a window that stops at 70% and scrolls. ⚠️ **This is the one
 * place in this app where a card is NOT fixed**, and it is the opposite of the
 * basket sheet's ruling on purpose: the basket is fixed so `Vaciar carrito` and the slide
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
  waiting,
  chosen,
  opening,
  onClose,
  onChoose,
}: {
  open: boolean;
  providers: readonly Provider[];
  /** What the empty list says — `providerPickLine`'s answer, the blue card's own. */
  waiting: string;
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
          <Velo />
        ) : (
          <Velo label={ES.buy.pickClose} onPress={onClose} />
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
                <Text style={{ fontSize: scale.smallSize, color: PALETTE.tintaApagada }}>
                  {ES.buy.pickWhy}
                </Text>
              ) : null}
            </View>

            <FlatList
              data={providers}
              keyExtractor={(one) => one.id}
              ItemSeparatorComponent={Separador}
              ListEmptyComponent={<Vacio line={waiting} />}
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
                          style={{ fontSize: scale.smallSize, color: PALETTE.tintaApagada }}
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
 * ⚠️⚠️ ONE PRODUCT, AS A CARD — round 4's grid. The square and the name, the
 * cost box, the line under it, the stepper, and the margin.
 *
 * ⚠️ THERE IS NO `Pressable` ON THE CARD AND NO DETAIL SCREEN BEHIND IT (C3.3): a
 * quantity greater than zero IS the line, and a tap that navigated away
 * mid-delivery would lose her place. What a tap on the product or the provider
 * should do is deferred by the owner (2026-10-16).
 *
 * ⚠️ IN THE DELIVERY IT WEARS `accion`'s EDGE, two points wide, and never the
 * colour alone (`R11`): the stepper beside it shows the quantity.
 *
 * ⚠️ THE PREFILL IS NOT WRITTEN HERE AND MUST NOT BE — see `Comprar`'s own
 * effect: a `FlatList` unmounts cards outside its render window, so a card
 * cannot remember whether it has already been seeded. This READS the store.
 */
function Tarjeta({
  entry,
  width,
  factors,
  typical,
  memory,
  providerId,
  provider,
  boughtAt,
  canRead,
  onEdit,
  onCostFirst,
}: {
  entry: CatalogEntry;
  width: number;
  factors: UnitFactors;
  /** What this product usually arrives as — `undefined` when the shop has never
   *  bought it, or when it fell out of `MAGNITUDE_LIMIT`'s window. */
  typical: Typical | undefined;
  memory: readonly MemoryRow[] | null;
  providerId: string | null;
  provider: Provider | null;
  /** When this provider last delivered it — `lastPurchasedFor`'s, read once. */
  boughtAt: string | undefined;
  canRead: boolean;
  onEdit: (editing: boolean) => void;
  onCostFirst: (entry: CatalogEntry) => void;
}) {
  const { scale } = useDensity();
  const base = useCartStore((state) => {
    for (const line of state.carts.buy) if (line.variantId === entry.id) return line.base;
    return 0;
  });
  const stored = useCartStore((state) => state.typed.buy[entry.id]);
  const inBasket = base > 0;

  const state = memoryState(memory, providerId, entry.id, canRead);
  const remembered = memoryFor(memory, providerId, entry.id, entry.priceUnit, factors);
  const note = cardNote(state, remembered, stored, inBasket, entry, factors);
  const shown = cardCost(stored, remembered, inBasket);
  const margin = marginOf(entry, shown, factors);

  // ⚠️ §2.8's MAGNITUDE WARNING, WITH BOTH HALVES LIVE — `stored` is the figure
  // she typed, net per base at scale 6, the denomination the median is in.
  const big = magnitudeNote(outsized(typical, base, typeof stored === 'string' ? stored : null));

  const gate = buyGate(state, remembered !== null, typeof stored === 'string', inBasket);
  const refusal = gate === 'open' ? null : { dim: false, onTap: () => onCostFirst(entry) };

  const alarm = note === 'missing';
  const caption =
    note === 'last-bought'
      ? formatLastBought(boughtAt)
      : note === 'changed' && remembered !== null
        ? ES.buy.lastPaid(remembered.price)
        : note === 'first-time'
          ? provider === null || provider.isGeneric
            ? ES.buy.newPairing
            : ES.buy.newPairingWith(provider.name)
          : note === 'missing'
            ? ES.buy.costMissing
            : null;

  return (
    <View
      style={{
        width,
        gap: scale.rowGap,
        padding: scale.rowGap,
        borderRadius: scale.space,
        borderWidth: inBasket ? 2 : 1,
        borderColor: alarm ? PALETTE.atencion : inBasket ? PALETTE.accion : PALETTE.linea,
        backgroundColor: alarm ? PALETTE.atencionSuave : PALETTE.superficie,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale.rowGap }}>
        <Retrato name={entry.name} picture={entry.picture} small ground={PALETTE.compraSuave} ink={PALETTE.compra} />
        <Text numberOfLines={2} style={{ flex: 1, fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.tinta }}>
          {entry.name}
        </Text>
      </View>

      <View style={{ gap: scale.rowGap / 4 }}>
        <CajaCosto
          entry={entry}
          factors={factors}
          shown={shown}
          changed={note === 'changed'}
          alarm={alarm}
          onEdit={onEdit}
        />
        {caption === null ? null : (
          <Text
            numberOfLines={2}
            style={{
              fontSize: scale.smallSize,
              fontWeight: note === 'last-bought' || note === 'changed' ? '400' : '600',
              color: alarm ? PALETTE.atencion : note === 'first-time' ? PALETTE.compra : PALETTE.tintaApagada,
            }}
          >
            {caption}
          </Text>
        )}
        {/* ⚠️ A WORD IN THE AMBER ROLE AND NEVER A TINTED CARD: §2.8 is explicit
            that this guard does not block, and C3.13's missing cost does. */}
        {big === '' ? null : (
          <Text numberOfLines={2} style={{ fontSize: scale.smallSize, fontWeight: '600', color: PALETTE.atencion }}>
            {big}
          </Text>
        )}
      </View>

      <Cantidad
        entry={entry}
        base={base}
        factors={factors}
        scope="buy"
        onEdit={onEdit}
        padId={PAD_ID}
        refusal={refusal}
        fill
      />

      {margin === null ? null : <Margen margin={margin} entry={entry} />}
    </View>
  );
}

/**
 * ⚠️⚠️ THE COST BOX — §2.8's price states, and the one control in this app where a
 * shopkeeper types money into the list. Drawn on every card and on every
 * Carrito line.
 *
 * ⚠️ WHAT IT DISPLAYS IS DERIVED ON EVERY RENDER (`costShown` over `cardCost`'s
 * figure) AND IS NEVER ITS OWN COPY. The store holds net-per-base at scale 6 and
 * she reads pesos per price unit; `costShown` and `typedPerBase` are exact
 * inverses, and `app/test/api-providers.test.ts` reads the round trip.
 *
 * ⚠️ THE DRAFT IS KEPT WHILE SHE IS TYPING: `8.` is not a price, so committing on
 * every keystroke would forget the line at the decimal point. A PARSEABLE
 * keystroke does commit, because the Total must not lag what she can see.
 *
 * ⚠️⚠️ AN EMPTY BOX IS A FORGOTTEN PRICE AND NOT A ZERO — `setPrice(…, null)`. On a
 * card off the delivery that brings back the provider's last cost, which is what
 * the box said before she touched it; on a line in the delivery it stays empty,
 * and C3.13 says so.
 *
 * ⚠️ A FIGURE THAT WILL NOT CONVERT IS REFUSED RATHER THAN ROUNDED (`typedPerBase`
 * answers `null` for a unit this phone has not read).
 *
 * ⚠️ ITS EDGE: blue and two points once she changed the provider's figure — the
 * owner's drawing, and `Antes $X` says it in words (`R11`); amber with C3.13's
 * missing cost; a hairline otherwise.
 */
function CajaCosto({
  entry,
  factors,
  shown,
  changed,
  alarm,
  onEdit,
  compact = false,
}: {
  entry: CatalogEntry;
  factors: UnitFactors;
  shown: string | null;
  changed: boolean;
  alarm: boolean;
  onEdit?: (editing: boolean) => void;
  /** The Carrito's line: a box three targets wide rather than the card's. */
  compact?: boolean;
}) {
  const { scale } = useDensity();
  const setPrice = useCartStore((s) => s.setPrice);
  const settled = costShown(shown, entry.priceUnit, factors);

  const [draft, setDraft] = useState<string | null>(null);
  const value = draft ?? settled;

  const typeInto = (text: string) => {
    setDraft(text);
    if (text.trim() === '') {
      setPrice('buy', entry.id, null);
      return;
    }
    const perBase = typedPerBase(parsePesos(text), entry.priceUnit, factors);
    if (perBase !== null) setPrice('buy', entry.id, perBase);
  };

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale.rowGap / 2,
        width: compact ? scale.tapTarget * 3 : undefined,
        minHeight: scale.tapTarget,
        paddingHorizontal: scale.rowGap,
        borderRadius: scale.space / 2,
        borderWidth: changed ? 2 : 1,
        borderColor: alarm ? PALETTE.atencion : changed ? PALETTE.compra : PALETTE.linea,
        backgroundColor: PALETTE.superficie,
      }}
    >
      <Text style={{ fontSize: scale.bodySize, color: PALETTE.tintaApagada }}>$</Text>
      <TextInput
        value={value}
        onChangeText={typeInto}
        onFocus={() => {
          setDraft(value);
          onEdit?.(true);
        }}
        onBlur={() => {
          setDraft(null);
          onEdit?.(false);
        }}
        placeholder={ES.buy.costHint}
        placeholderTextColor={PALETTE.tintaApagada}
        // ⚠️ `decimal-pad` AND NOT `numeric`: C12.2 puts the point in `35.50`, and
        // `numeric` carries a minus sign on some Android keyboards. `parsePesos`
        // is still what READS it — a pad is a convenience, never a validator.
        keyboardType="decimal-pad"
        returnKeyType="done"
        inputAccessoryViewID={PAD_ID}
        accessibilityLabel={`${ES.buy.cost} ${entry.name}`}
        style={{
          flex: 1,
          minHeight: scale.tapTarget,
          fontSize: scale.bodySize,
          fontWeight: '700',
          color: PALETTE.tinta,
        }}
      />
      {/* ⚠️ WHAT THE COST IS PER, IN C3.10's OWN SEPARATOR. */}
      <Text style={{ fontSize: scale.smallSize, color: PALETTE.tintaApagada }}>
        {`${ES.catalog.per} ${entry.priceUnit}`}
      </Text>
    </View>
  );
}

/**
 * ⚠️⚠️ *TU PRECIO*, COLOURED BY THE MARGIN — the owner's ruling of 2026-10-16
 * replaced round 4's *Margen $18 / kg*: the pill shows the SHELF price and the
 * margin is only its colour, *"the user would read and understand himself
 * what's the margin."* `@/cart/buying`'s `marginOf` still decides the colour.
 *
 * ⚠️⚠️ SOLID RED BELOW THE COST, green otherwise — a zero margin is green, as it
 * was. ⚠️ `R11`: with the minus sign gone, the red is no longer the only thing
 * saying *loss* because the fill is: a solid pill against a tint, and a screen
 * reader hears `ES.buy.belowCost`. Nothing on the pill can be pressed.
 */
function Margen({ margin, entry }: { margin: number | 'no-sale-price'; entry: CatalogEntry }) {
  const { scale } = useDensity();
  const unit = ES.units[entry.priceUnit as keyof typeof ES.units] ?? entry.priceUnit;
  const none = margin === 'no-sale-price';
  const loss = !none && margin < 0;
  const words =
    none || entry.centavos === null ? ES.buy.noSalePrice : ES.buy.yourPrice(formatMXN(entry.centavos), unit);
  return (
    <View
      accessible
      accessibilityLabel={loss ? `${words}, ${ES.buy.belowCost}` : words}
      style={{
        alignSelf: 'flex-start',
        paddingHorizontal: scale.rowGap,
        paddingVertical: scale.rowGap / 4,
        borderRadius: scale.tapTarget / 2,
        backgroundColor: none ? PALETTE.fondo : loss ? PALETTE.error : PALETTE.accionSuave,
        borderWidth: none ? 1 : 0,
        borderColor: PALETTE.linea,
      }}
    >
      <Text
        style={{
          fontSize: scale.smallSize,
          fontWeight: '700',
          color: none ? PALETTE.tintaApagada : loss ? PALETTE.superficie : PALETTE.accion,
        }}
      >
        {words}
      </Text>
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
              unknown — C3.12's character, on C3.12's reasoning. */}
          <Text style={{ fontSize: scale.moneySize, fontWeight: '700', color: PALETTE.tinta }}>
            {basket === null ? ES.catalog.noPrice : formatMXN(basket.centavos)}
          </Text>
        </View>
      </Strip>

      {live ? (
        <View style={{ paddingHorizontal: scale.space, paddingBottom: scale.space }}>
          <CierreCarrito
            onEmpty={onEmpty}
            word={ES.buy.slide.word}
            label={ES.buy.slide.label}
            onCommit={onCommit}
            canCommit={canBuy}
            onTap={onOpen}
            blocked={<Bloqueo missing={missing} />}
          />
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
 * ⚠️⚠️ C3.5's SHEET — the review before the commit, and on this counter also
 * **where a cost is corrected**: every line carries the same cost box the card
 * does. Its frame, heading, foot and question are Vender's since round 4
 * (`src/ui/HojaCarrito`); the heading names the provider — *Don Chuy · 3
 * productos* — because a delivery is a document WITH somebody.
 *
 * ⚠️ ROUND 4, THE OWNER: *"a simpler version with editable fields for both
 * price and quantity … and few insights."* So no `Antes` and no margin here —
 * the card behind it carries both. §2.8's guards stay: they are not insights.
 *
 * ⚠️ AN `RN` `Modal` AND NOT A ROUTE — a route would re-read the catalog, the unit
 * factors, the workspace and the provider memory to show a subset of what is
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
  provider,
  canRead,
  missing,
  onCommit,
  onEmpty,
  correcting,
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
  provider: Provider | null;
  canRead: boolean;
  missing: number;
  onCommit: () => void;
  onEmpty: () => void;
  /** `8g`: the document a correction re-keys, or `null` — the *Vaciar* box's words. */
  correcting: string | null;
  canBuy: boolean;
  asking: boolean;
  emptied: boolean;
  bloom: Animated.Value;
  onConfirmEmpty: () => void;
  onCancelEmpty: () => void;
}) {
  const rows = review === null ? [] : review.rows;

  return (
    <HojaCarrito
      open={open}
      onClose={onClose}
      lines={rows.length}
      detail={provider === null ? null : provider.name}
      foot={
        rows.length === 0 || review === null ? null : (
          <>
            <TotalCarrito centavos={review.basket.centavos} />
            <CierreCarrito
              onEmpty={onEmpty}
              word={ES.buy.slide.word}
              label={ES.buy.slide.labelInCart}
              onCommit={onCommit}
              canCommit={canBuy}
              compact
              blocked={<Bloqueo missing={missing} />}
            />
          </>
        )
      }
      over={
        <VaciarCarrito
          asking={asking}
          emptied={emptied}
          bloom={bloom}
          count={rows.length}
          correcting={correcting}
          onConfirm={onConfirmEmpty}
          onCancel={onCancelEmpty}
        />
      }
    >
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
    </HojaCarrito>
  );
}

/**
 * One line of the delivery, as the sheet draws it — Vender's line with the cost
 * box where Vender has the unit price: the name and the line's figure, then the
 * cost, then the stepper and `Quitar`. *"The geometries in common are the
 * same"* (round 4): the first and last rows ARE Vender's.
 *
 * ⚠️ A ROW WHOSE PRODUCT HAS LEFT THE CATALOG IS DRAWN AND NOT HIDDEN — see
 * `reviewOf`. `draftOf` refuses the whole delivery for it, and this sheet is the
 * only surface that can remove it. It keeps its `Quitar` and loses both
 * controls: there is no price unit to step in and none to cost per.
 *
 * ⚠️ THE LINE'S FIGURE IS A DASH WHEN IT COULD NOT BE PRICED, never `$0.00` (C3.12).
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
  const alarm = !gone && state !== 'unknown' && typeof stored !== 'string';
  const big = magnitudeNote(outsized(typical, row.base, typeof stored === 'string' ? stored : null));

  return (
    <View
      style={{
        gap: scale.rowGap,
        paddingVertical: scale.space,
        paddingHorizontal: scale.space,
        backgroundColor: alarm ? PALETTE.atencionSuave : PALETTE.fondo,
      }}
    >
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

      {/* ⚠️ `R11`: the state never travels as a colour alone. THE MISSING COST
          WINS WHEN BOTH APPLY: C3.13 decides whether this can be sent at all,
          and §2.8 makes the magnitude warning advisory. */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: scale.rowGap }}>
        {gone || entry === undefined ? (
          <Text style={{ fontSize: scale.smallSize, color: PALETTE.tintaApagada }}>{ES.counter.cart.gone}</Text>
        ) : (
          <CajaCosto
            entry={entry}
            factors={factors}
            shown={typeof stored === 'string' ? stored : null}
            changed={false}
            alarm={alarm}
            compact
          />
        )}
        {alarm ? (
          <Text style={{ fontSize: scale.smallSize, fontWeight: '600', color: PALETTE.atencion }}>
            {ES.buy.costMissing}
          </Text>
        ) : big === '' ? null : (
          <Text numberOfLines={2} style={{ flex: 1, fontSize: scale.smallSize, fontWeight: '600', color: PALETTE.atencion }}>
            {big}
          </Text>
        )}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        {gone || entry === undefined ? (
          <View />
        ) : (
          <Cantidad entry={entry} base={row.base} factors={factors} scope="buy" padId={PAD_ID} />
        )}

        {/* ⚠️ A WORD AND NOT A GLYPH — an icon alone on the one control that
            destroys something is what C12.1 refuses. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${ES.counter.cart.remove} ${row.name ?? ES.counter.cart.goneName}`}
          onPress={() => remove('buy', row.variantId)}
          style={{ minHeight: scale.tapTarget, justifyContent: 'center', paddingHorizontal: scale.rowGap }}
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
 * ⚠️⚠️ *¿CUÁNTO TE COSTÓ?* — ROUND 4's COST-FIRST QUESTION, the owner's *"to add
 * something to the carrito, a price must be entered first"* (2026-10-16). Opened
 * by `+` on a card whose box is empty; `Agregar al carrito` puts the cost in the
 * delivery and the product in the Carrito, one step of it.
 *
 * ⚠️ IT IS VENDER'S PRICE SHEET'S FRAME (`src/ui/HojaPrecio`) AND WRITES NOTHING
 * TO THE CATALOG: a cost is a fact about this delivery, and it reaches the ledger
 * when the slide does, offline like every other line (§2.6).
 *
 * ⚠️ *Primera vez con …* ONLY WHEN THE MEMORY SAYS SO (`first`): to a cashier,
 * who cannot read it, the same words would be false on every product her shop has
 * bought before — `5g-ii`'s ruling of 2026-09-25, kept.
 *
 * ⚠️ THE MARGIN UPDATES AS SHE TYPES — his drawing, and the one place a cost can
 * be checked against the shelf before it is in the delivery at all.
 */
function CostoPrimero({
  entry,
  factors,
  provider,
  first,
  onSave,
  onClose,
}: {
  entry: CatalogEntry;
  factors: UnitFactors;
  provider: Provider | null;
  first: boolean;
  onSave: (entry: CatalogEntry, perBase: string) => void;
  onClose: () => void;
}) {
  const [typed, setTyped] = useState('');
  const [line, setLine] = useState<string | null>(null);
  const perBase = typed.trim() === '' ? null : typedPerBase(parsePesos(typed), entry.priceUnit, factors);
  const margin = marginOf(entry, perBase, factors);
  const unit = ES.units[entry.priceUnit as keyof typeof ES.units] ?? entry.priceUnit;

  const sells = entry.centavos === null ? ES.buy.costSheet.unpriced : ES.buy.costSheet.sells(entry.price);
  const detail =
    first && provider !== null && !provider.isGeneric
      ? `${ES.buy.newPairingWith(provider.name)} · ${sells}`
      : sells;

  return (
    <HojaPrecio
      name={entry.name}
      picture={entry.picture}
      detail={detail}
      question={ES.buy.costSheet.ask}
      value={typed}
      onChange={(text) => {
        setTyped(text);
        setLine(null);
      }}
      per={ES.sell.per(unit)}
      inputLabel={`${ES.buy.cost} ${entry.name}`}
      note={margin === null ? null : <Margen margin={margin} entry={entry} />}
      line={line}
      act={ES.buy.costSheet.add}
      onAct={() => {
        if (perBase === null) {
          setLine(ES.buy.costSheet.needsCost);
          return;
        }
        Keyboard.dismiss();
        onSave(entry, perBase);
      }}
      cancel={ES.buy.costSheet.cancel}
      onClose={onClose}
      tone={PALETTE.compra}
      tile={{ ground: PALETTE.compraSuave, ink: PALETTE.compra }}
    />
  );
}
