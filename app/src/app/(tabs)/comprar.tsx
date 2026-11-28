import { Icono } from '@/ui/Icono';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';

import { catalogLine, initials, priceCentavos, type CatalogEntry, type UnitFactors } from '@/api/catalog';
import { parsePesos } from '@/api/catalogWrite';
import {
  useCatalog,
  useMagnitude,
  useMyRole,
  useProviders,
  useUnitFactors,
  useWorkspace,
} from '@/api/hooks';
import { aislesOf } from '@/api/productPage';
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
  type MemoryRow,
  type Provider,
} from '@/api/providers';
import {
  DECIMALES_COSTO,
  MAX_ENTEROS,
  TECLAS_PUNTO,
  cantidadDe,
  costoDe,
  decimalesDe,
  escribir,
  fichasDeCompra,
} from '@/cart/bascula';
import { cardCost, cardNote, deliveryReady, marginOf, padNote } from '@/cart/buying';
import {
  MAX_PAQUETES,
  baseDeLlegada,
  contenidoBase,
  costoAlCambiar,
  costoDePaquete,
  costoPorBase,
  entran,
  lineaDe,
  modoInicial,
  paqueteDe,
  palabraDe,
  paquetesDe,
  traeDe,
  traeInicial,
  type Modo,
} from '@/cart/paquete';
import { useLlegadas } from '@/cart/useLlegadas';
import { reviewOf, type Basket, type Review, type ReviewRow } from '@/cart/cart';
import { canCommit, commitOf, type Basketful } from '@/cart/commit';
import { ordenDeCompra, porOrden } from '@/cart/orden';
import { qtyShown, shownUnitOf } from '@/cart/quantity';
import { useCart, useCartStore, useCorrects, useProviderId, useTyped } from '@/cart/store';
import { useOrdenDelDia } from '@/cart/useOrdenDelDia';
import { columnasDe, pasilloAlEscribir, vitrinaDe } from '@/cart/vitrina';
import { formatLastBought, formatLastBoughtShort } from '@/format/date';
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
import { Baldosa } from '@/ui/Baldosa';
import { Bascula } from '@/ui/Bascula';
import { Buscador } from '@/ui/Buscador';
import { Cantidad } from '@/ui/Cantidad';
import { CierreCarrito } from '@/ui/CierreCarrito';
import { Hecho } from '@/ui/Hecho';
import { HojaCarrito } from '@/ui/HojaCarrito';
import { Pasillos } from '@/ui/Pasillos';
import { Separador } from '@/ui/Separador';
import { TotalCarrito } from '@/ui/TotalCarrito';
import { Vacio } from '@/ui/Vacio';
import { Corrigiendo } from '@/ui/Corrigiendo';
import { VaciarCarrito } from '@/ui/VaciarCarrito';
import { Velo } from '@/ui/Velo';
import { Vitrina } from '@/ui/Vitrina';
import { ESQUINA } from '@/theme/density';

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
//     ~~a magnifier that opens the search under it,~~ and `Cambiar` (the
//     magnifier left at `14.3`: the search box is on the counter). The drop-down
//     field and its *Comprando a:* label are gone; the picker it opened is the
//     same centred window (`Proveedores`, his ruling of 2026-09-25).
//   * ~~**THE CATALOG IS CARDS, TWO ACROSS** — one across at `Letra grande`, and on
//     a phone too narrow for two of Vender's steppers side by side. Each card: the
//     product's square, its name, the cost box, the caption, the stepper, and the
//     margin pill.~~ Tiles since `14.3`, three across and two — see below.
//   * **EVERY CARD'S BOX HOLDS THIS PROVIDER'S LAST COST**, his ruling: *"The
//     price gets prefilled by the previous price"* — `Anterior · hace N días`,
//     and once changed, `Antes $X` with a blue edge. The rules are
//     `@/cart/buying`'s. ⚠️ This reverses `5g-ii`'s *say it only on a row in the
//     delivery*: he drew *Primera vez con Don Chuy* on cards nobody was receiving.
//   * **A COST COMES FIRST** — *"Same behaviour as Vender: to add something to
//     the carrito, a price must be entered first."* ~~`+` on a card with no cost
//     opens *¿Cuánto te costó?* (`CostoPrimero`), Vender's price sheet's frame.~~
//     Since `14.3` the pad asks it, and adds nothing without it. C3.13's banner
//     stays, for a line left with no cost after the provider changed.
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
// ⚠️⚠️ `14.3`, LA VITRINA — COMPRAR IS THE COUNTER (the owner's ruling of 2026-11-27)
// ----------------------------------------------------------------------------
// Vender, Comprar and Merma's *Tirar* became one counter in three colours (call
// 1). So round 4's cards became Vender's tiles, and what was on each card moved:
//
//   * **THE SEARCH, THE AISLES, THE TILES, THE PAD, THE BAR AND THE BASKET ARE
//     VENDER'S** (`src/ui/`'s `Buscador`, `Pasillos`, `Vitrina`, `Baldosa`,
//     `Bascula`), in Comprar's blue. The blue *Te entrega* card stays — this
//     counter's own part — and its magnifier went: the search box is on the
//     counter, always, as the page drew it. The search is the whole shop (call 13).
//   * **A TILE'S TAG IS THIS PROVIDER'S LAST COST** and the line under its name
//     says when (*Anterior · hace 3 días*), or *Primera vez* — `cardNote`'s answer,
//     the card's caption kept.
//   * **EVERY TAP OPENS THE PAD** (call 4): a delivery always has a cost. The pad
//     holds two boxes — what arrived and what it cost — and keeps a decimal point
//     (call 5: a delivery's kilos come off a note in whole numbers). The cost is
//     filled with this provider's last one (*Anterior · hace N días*), *Antes $X*
//     once she keys another, and *Tu Precio* in its colour under it (call 9). It
//     adds nothing without both (`deliveryReady`) — round 4's *"a price must be
//     entered first"*, so `CostoPrimero`'s sheet and `buyGate` left.
//   * **THE CARD'S COST BOX AND STEPPER ARE GONE**, and with them the phone's
//     `decimal-pad`, `TecladoListo`'s bar and the row scrolled above the keyboard.
//     The Carrito's lines open the pad too: the cost on its chip, the quantity on
//     its box.
//   * **THE ORDER**: what this provider brought first, most recent first (round
//     4's), then what the shop sells most (call 6, `ordenDeCompra`). After the
//     slide the counter is back on *Todo* at the top (call 8).
//   * **WHAT DID NOT MOVE**: the provider first and its re-pricing (C3.11 below),
//     the prefill materialised into the store (below), and C3.13 — the slide is
//     still absent while a line has no cost, which is how a line reaches the
//     basket without one now: a provider changed after it went in.
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

export default function Comprar() {
  const { scale, mode } = useDensity();
  const insets = useSafeAreaInsets();
  // ⚠️ `8g`, 2026-10-22: on Android 15+ the keyboard's room counts from where this counter starts (`@/lib/useDesfaseTeclado`).
  const desfase = useDesfaseTeclado(scale.tabBarHeight + insets.bottom);

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

  // ⚠️⚠️ `14.3`, THE ORDER (call 6): what this provider brought first, most recent
  // first — round 4's rule — then what the shop sells most, the day's order Vender
  // draws (`@/cart/orden`); the aisles in that same order. ⚠️ The day's order is
  // drawn on arriving and after the slide, never under her thumb (`useOrdenDelDia`).
  // The provider's half moves when she changes provider, which is a new delivery.
  const { orden, tomar } = useOrdenDelDia();
  const bought = useMemo(() => lastPurchasedFor(memory, providerId), [memory, providerId]);
  const ordered = useMemo(
    () => ordenDeCompra(entries, orden?.productos ?? [], bought),
    [entries, orden, bought],
  );
  const aisles = useMemo(
    () => porOrden(aislesOf(entries), orden?.pasillos ?? [], (one) => one.familyId),
    [entries, orden],
  );
  // ⚠️ CALL 13, VENDER'S RULE: searching and browsing never mix — a letter typed
  // puts the aisles on *Todo*, an aisle tapped empties the box.
  const [aisle, setAisle] = useState<string | null>(null);
  const shown = vitrinaDe(ordered, typed, aisle);
  const columns = columnasDe(mode);
  const grid = useRef<FlatList<CatalogEntry | null>>(null);
  const strip = useRef<ScrollView>(null);
  const write = useCallback((text: string) => {
    setTyped(text);
    setAisle((now) => pasilloAlEscribir(text, now));
  }, []);
  const choose = useCallback((familyId: string | null) => {
    setAisle(familyId);
    setTyped('');
    box.current?.blur();
    grid.current?.scrollToOffset({ offset: 0, animated: false });
  }, []);
  useFocusEffect(
    useCallback(() => {
      tomar();
    }, [tomar]),
  );

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

  // ⚠️ `14.3`: the product whose pad is open, and the box it opens on — what
  // arrived from a tile or a line's quantity, the cost from a line's cost chip.
  const [pesando, setPesando] = useState<{ entry: CatalogEntry; campo: Campo } | null>(null);
  const openPad = useCallback((entry: CatalogEntry, campo: Campo) => setPesando({ entry, campo }), []);
  const closePad = useCallback(() => setPesando(null), []);

  const [cartOpen, setCartOpen] = useState(false);
  // ⚠️ `14.1`'s lesson on Vender: ANDROID'S BACK REACHES THE CARRITO'S `Modal`, not
  // the pad drawn inside it, so the top sheet goes first.
  const closeCart = useCallback(() => {
    if (pesando !== null) setPesando(null);
    else setCartOpen(false);
  }, [pesando]);
  const openCart = useCallback(() => setCartOpen(true), []);

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
    // ⚠️⚠️ `14.3`, CALL 8: BACK TO *TODO* AT THE TOP, ready for the next delivery —
    // Vender's arrangement: the search emptied, the aisle undone, the grid and the
    // strip at their start, and today's order drawn if it was set meanwhile.
    setTyped('');
    setAisle(null);
    box.current?.blur();
    grid.current?.scrollToOffset({ offset: 0, animated: false });
    strip.current?.scrollTo({ x: 0, animated: false });
    tomar();
    setRecorded(true);
  }, [basketful, clear, pilot, tomar]);

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
        onChange={() => setPicking(true)}
      />
      <Buscador value={typed} onChange={write} box={box} placeholder={ES.catalog.search} />
      <Pasillos aisles={aisles} chosen={aisle} onChoose={choose} strip={strip} tono={PALETTE.compra} />

      <View style={{ flex: 1 }}>
        <Vitrina
          productos={shown}
          columnas={columns}
          grid={grid}
          vacio={catalogLine(loading, typed, failed, online)}
          baldosa={(item) => (
            <BaldosaCompra
              entry={item}
              factors={factors}
              typical={typicals[item.id]}
              memory={memory}
              providerId={providerId}
              boughtAt={bought[item.id]}
              canRead={canRead}
              onPad={openPad}
            />
          )}
        />
      </View>

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
        onPad={openPad}
        hoja={
          pesando !== null && cartOpen ? (
            <BasculaCompra
              bare
              entry={pesando.entry}
              campo={pesando.campo}
              factors={factors}
              typical={typicals[pesando.entry.id]}
              memory={memory}
              providerId={providerId}
              provider={provider}
              canRead={canRead}
              boughtAt={bought[pesando.entry.id]}
              pricesIncludeTax={workspace?.pricesIncludeTax ?? null}
              onClose={closePad}
            />
          ) : null
        }
      />

      {/* ⚠️ OVER THE SCREEN ONLY WHILE THE CARRITO IS CLOSED; with it open the
          pad is drawn inside the Carrito's own `Modal` (`hoja` above) — Vender's
          arrangement, and `VaciarCarrito`'s. */}
      {pesando !== null && !cartOpen ? (
        <BasculaCompra
          entry={pesando.entry}
          campo={pesando.campo}
          factors={factors}
          typical={typicals[pesando.entry.id]}
          memory={memory}
          providerId={providerId}
          provider={provider}
          canRead={canRead}
          boughtAt={bought[pesando.entry.id]}
          pricesIncludeTax={workspace?.pricesIncludeTax ?? null}
          onClose={closePad}
        />
      ) : null}

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

    </KeyboardAvoidingView>
  );
}

/**
 * ⚠️⚠️ WHO IS DELIVERING — ROUND 4's BLUE CARD (2026-10-16), and it replaced the
 * drop-down field of 2026-09-25. *TE ENTREGA* over the provider's name in the
 * titles' face, and `Cambiar`. ~~A magnifier~~ left at `14.3`: the search box is
 * on the counter under this card, always (call 1, as the page drew it).
 *
 * ⚠️ `Cambiar` OPENS THE SAME CENTRED WINDOW THE FIELD DID (`Proveedores`), and a
 * word on a button is the affordance the field's border used to be (C12.1).
 *
 * ⚠️ IT DOES NOT SCROLL, for the old header's reason: a shop with a hundred
 * products is the shop where a scrolled-away provider is a delivery recorded
 * against the wrong one.
 */
function Proveedor({
  provider,
  loading,
  waiting,
  onChange,
}: {
  provider: Provider | null;
  loading: boolean;
  /** What the card says with no supplier to name — `providerPickLine`'s answer. */
  waiting: string;
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
        borderRadius: ESQUINA.hoja,
        backgroundColor: PALETTE.compra,
      }}
    >
      {/* ⚠️ `flexWrap` AND NOT A BRANCH ON THE MODE — Vender's row's rule: where
          the name and the button do not fit (`Letra grande`, a narrow phone),
          the button drops under the name, which keeps the provider readable. */}
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
          accessibilityLabel={`${ES.buy.supplier.change} ${unknown ? '' : provider.name}`}
          accessibilityState={{ disabled: loading }}
          disabled={loading}
          onPress={onChange}
          style={{
            minHeight: scale.tapTarget,
            justifyContent: 'center',
            paddingHorizontal: scale.space,
            borderRadius: ESQUINA.boton,
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
              borderRadius: ESQUINA.hoja,
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
                      <Icono
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

/** Which of the pad's two boxes the keys go into. */
type Campo = 'cantidad' | 'trae' | 'costo';

/**
 * ⚠️⚠️ `14.3`, ONE PRODUCT ON COMPRAR'S COUNTER — round 4's card, as Vender's tile
 * (`src/ui/Baldosa`). The tag is this provider's last cost; the line under the
 * name is the card's caption (`cardNote`): *Anterior · hace 3 días*, *Antes $X*
 * once she typed another, *Primera vez* — and nothing while the memory is out or
 * the role is not known, the 2026-09-25 ruling `unreadable` keeps.
 *
 * ⚠️ EVERY TAP OPENS THE PAD, a long press too (call 4): a delivery always has a
 * cost, so a tap that added *one* would add a line the slide then refuses. There
 * is no `−` on the foot for the same reason — the pad is one tap away, and its
 * *Quitar* is the way out.
 *
 * ⚠️ THE AMBER BAND IS C3.13's *Falta el costo* — a line in the delivery with no
 * cost, which since `14.3` only a change of provider leaves behind — and else
 * §2.8's warning with both halves live. The ground goes amber with the first.
 *
 * ⚠️ THE PREFILL IS NOT WRITTEN HERE AND MUST NOT BE — see `Comprar`'s own effect:
 * a `FlatList` unmounts tiles outside its render window, so a tile cannot remember
 * whether it has already been seeded. This READS the store.
 */
function BaldosaCompra({
  entry,
  factors,
  typical,
  memory,
  providerId,
  boughtAt,
  canRead,
  onPad,
}: {
  entry: CatalogEntry;
  factors: UnitFactors;
  /** What this product usually arrives as — `undefined` when the shop has never
   *  bought it, or when it fell out of `MAGNITUDE_LIMIT`'s window. */
  typical: Typical | undefined;
  memory: readonly MemoryRow[] | null;
  providerId: string | null;
  /** When this provider last delivered it — `lastPurchasedFor`'s, read once. */
  boughtAt: string | undefined;
  canRead: boolean;
  onPad: (entry: CatalogEntry, campo: Campo) => void;
}) {
  const base = useCartStore((state) => {
    for (const line of state.carts.buy) if (line.variantId === entry.id) return line.base;
    return 0;
  });
  const stored = useCartStore((state) => state.typed.buy[entry.id]);
  const llegada = useLlegadas((state) => state.llegadas[entry.id]);
  const inBasket = base > 0;

  const state = memoryState(memory, providerId, entry.id, canRead);
  const remembered = memoryFor(memory, providerId, entry.id, entry.priceUnit, factors);
  const note = cardNote(state, remembered, stored, inBasket, entry, factors);
  // ⚠️ §2.8's MAGNITUDE WARNING, WITH BOTH HALVES LIVE — `stored` is the figure
  // she typed, net per base at scale 6, the denomination the median is in.
  const big = magnitudeNote(outsized(typical, base, typeof stored === 'string' ? stored : null));
  const alarm = note === 'missing';

  const unit = shownUnitOf(entry);
  const word = ES.units[unit as keyof typeof ES.units] ?? unit;
  // ⚠️ `14.5`: A LINE KEYED IN CAJAS SAYS SO — *2 cajas* — while the basket holds exactly it.
  const pack = paqueteDe(entry);
  const enCajas = pack === null ? null : lineaDe(llegada, base, typeof stored === 'string' ? stored : undefined);
  const cajas = enCajas === null ? null : paquetesDe(enCajas.cuantos);
  const qty = !inBasket
    ? ''
    : pack !== null && cajas !== null
      ? `${cajas} ${palabraDe(pack.word, cajas)}`
      : `${qtyShown(base, unit, factors) ?? ''} ${word}`;
  const priceWord = ES.units[entry.priceUnit as keyof typeof ES.units] ?? entry.priceUnit;
  // ⚠️ SHORT ON A TILE (`formatLastBoughtShort`): the full sentence was cut
  // mid-word on Android. The tag above is the cost, so the line says when, or
  // what it cost before without the unit the tag already gives.
  const caption =
    note === 'last-bought'
      ? formatLastBoughtShort(boughtAt)
      : note === 'changed' && remembered !== null && remembered.centavos !== null
        ? ES.buy.tile.before(formatMXN(remembered.centavos))
        : note === 'first-time'
          ? ES.buy.tile.firstTime
          : null;
  const band = alarm ? ES.buy.costMissing : big;

  return (
    <Baldosa
      entry={entry}
      etiqueta={remembered === null || remembered.centavos === null ? null : { centavos: remembered.centavos, per: priceWord }}
      cantidad={qty}
      onMenos={null}
      banda={band}
      alarma={alarm}
      nota={{
        texto: caption,
        // ⚠️ *Primera vez* and *Antes* in the counter's blue, as the card said
        // them; *Anterior* in grey — it is a date, not news.
        tinta: note === 'first-time' || note === 'changed' ? PALETTE.compra : PALETTE.tintaApagada,
      }}
      tono={PALETTE.compra}
      onPress={() => onPad(entry, 'cantidad')}
      onLongPress={() => onPad(entry, 'cantidad')}
      accessibilityLabel={[
        entry.name,
        remembered === null ? '' : remembered.price,
        note === 'last-bought' ? formatLastBought(boughtAt) : (caption ?? ''),
        inBasket ? ES.counter.tile.inCart(qty) : '',
        band,
      ]
        .filter((part) => part !== '')
        .join(', ')}
      accessibilityHint={ES.buy.tile.hint}
    />
  );
}

/**
 * ⚠️⚠️ `14.3`, LA BÁSCULA ON COMPRAR — what arrived and what it cost, on the
 * counter's own pad (`src/ui/Bascula`). The owner's calls 5 and 9 of 2026-11-27:
 * round 4's cost box and stepper moved here, so all three counters have one shape.
 *
 * ⚠️ THE BOXES, AND THE KEYS GO INTO THE ONE CHOSEN: *Llegaron* first (a tile or a
 * line's quantity opens on it), *Costo* from a line's cost chip. A tap on a box
 * chooses it, and its first key replaces what it holds — Vender's *the scale
 * starts again from zero* — while `borrar` takes the last figure off it.
 *
 * ⚠️⚠️ THE COST OPENS FILLED, HIS RULING OF 2026-10-16: the line's own cost if it
 * has one, else this provider's last (`cardCost`) — *Anterior · hace N días* beside
 * it, *Antes $X* once she keys another, *¿Cuánto te costó?* when it is empty
 * (`padNote`). *Tu Precio* under it in its colour (`marginOf`, red below the cost).
 * A box she has not touched follows the memory, so a read that lands while the
 * pad is open fills it.
 *
 * ⚠️ IT ADDS NOTHING WITHOUT BOTH (`deliveryReady`) — round 4's *"a price must be
 * entered first"*, kept by the act itself. What it adds is what the card's two
 * boxes sent: `setPrice` with the cost net per base (`costoDe`, the old box's
 * conversion), then `setQty` — in that order, so `Comprar`'s seeding effect finds
 * a quote and leaves it. The total on the act is `reviewOf`'s over a one-line
 * delivery, so the pad never states a figure the Carrito would not (§2.5 rule 5).
 *
 * ⚠️⚠️ `14.5`, HOW IT ARRIVED (call 10): a product with a pack opens on it —
 * *Caja · Kilos* at the top, then *Llegaron 2 cajas*, *Trae cada caja 13 kg* and
 * *$209.30 por caja*, and *Entran 26 kg · a $16.10 por kg* under them. Every figure
 * is `@/cart/paquete`'s: the phone multiplies, and the line it adds is base units
 * at a cost per base, as before — `record_purchase` never hears of a caja. The mode
 * she used last, and what her last caja held, come back next time (`useLlegadas`);
 * a line keyed in cajas reopens in cajas while the basket holds exactly it.
 */
function BasculaCompra({
  entry,
  campo: abierto,
  factors,
  typical,
  memory,
  providerId,
  provider,
  canRead,
  boughtAt,
  pricesIncludeTax,
  onClose,
  bare = false,
}: {
  entry: CatalogEntry;
  /** The box the pad opens on. */
  campo: Campo;
  factors: UnitFactors;
  typical: Typical | undefined;
  memory: readonly MemoryRow[] | null;
  providerId: string | null;
  provider: Provider | null;
  canRead: boolean;
  boughtAt: string | undefined;
  /** The shop's IVA setting, or `null` while it is not known — the total is then withheld. */
  pricesIncludeTax: boolean | null;
  onClose: () => void;
  /** Drawn inside the Carrito's `Modal` rather than as a `Modal` of its own. */
  bare?: boolean;
}) {
  const { scale, mode: density } = useDensity();
  const base = useCartStore((state) => {
    for (const line of state.carts.buy) if (line.variantId === entry.id) return line.base;
    return 0;
  });
  const stored = useCartStore((state) => state.typed.buy[entry.id]);
  const setQty = useCartStore((state) => state.setQty);
  const setPrice = useCartStore((state) => state.setPrice);
  const remove = useCartStore((state) => state.remove);
  const llegada = useLlegadas((state) => state.llegadas[entry.id]);
  const recordarLlegada = useLlegadas((state) => state.recordar);

  const unit = shownUnitOf(entry);
  const word = ES.units[unit as keyof typeof ES.units] ?? unit;
  const priceWord = ES.units[entry.priceUnit as keyof typeof ES.units] ?? entry.priceUnit;
  const state = memoryState(memory, providerId, entry.id, canRead);
  const remembered = memoryFor(memory, providerId, entry.id, entry.priceUnit, factors);
  const pack = paqueteDe(entry);
  const typedCost = typeof stored === 'string' ? stored : undefined;

  // ⚠️ A LINE KEYED IN CAJAS REOPENS IN CAJAS — while the basket holds exactly it.
  const [enCajas] = useState(() => lineaDe(llegada, base, typedCost));
  const [modo, setModo] = useState<Modo>(() =>
    pack === null ? 'suelto' : base > 0 ? (enCajas === null ? 'suelto' : 'paquete') : modoInicial(entry, llegada),
  );
  const [trae, setTrae] = useState(() => traeInicial(entry, llegada));
  const [campo, setCampo] = useState<Campo>(abierto);
  const [fresco, setFresco] = useState(true);
  // ⚠️ `null` IS A BOX SHE HAS NOT TOUCHED: it shows the line's figure, or the memory's.
  const [cantidad, setCantidad] = useState<string | null>(null);
  const [costo, setCosto] = useState<string | null>(null);

  const porCaja = modo === 'paquete' && pack !== null;
  const memoryCost = cardCost(typedCost, remembered, base > 0);
  const cantidadTexto =
    cantidad ??
    (porCaja ? (enCajas?.cuantos ?? '') : base > 0 ? (qtyShown(base, unit, factors) ?? '') : '');
  const costoTexto =
    costo ??
    (porCaja
      ? (enCajas?.costo ?? (memoryCost === null ? '' : (costoDePaquete(memoryCost, trae, unit, factors) ?? '')))
      : costShown(memoryCost, entry.priceUnit, factors));
  const qtyBase = porCaja ? baseDeLlegada(cantidadTexto, trae, unit, factors) : cantidadDe(cantidadTexto, unit, factors);
  const perBase = porCaja ? costoPorBase(costoTexto, trae, unit, factors) : costoDe(costoTexto, entry.priceUnit, factors);
  const ready = deliveryReady(qtyBase, perBase);

  const centavos =
    pricesIncludeTax === null || !ready || qtyBase === null || perBase === null
      ? null
      : (reviewOf(
          [{ variantId: entry.id, base: qtyBase }],
          [entry],
          'buy',
          pricesIncludeTax,
          undefined,
          { [entry.id]: perBase },
        ).rows[0]?.centavos ?? null);
  const note = padNote(state, remembered, perBase, entry, factors);
  const margin = marginOf(entry, perBase, factors);
  const big = magnitudeNote(outsized(typical, qtyBase ?? 0, perBase));
  const sinPunto = decimalesDe(unit) === 0;
  const packOne = pack === null ? '' : ES.packs[pack.word].one;
  const packs = paquetesDe(cantidadTexto) ?? 0;

  const elegir = (next: Campo) => {
    setCampo(next);
    setFresco(true);
  };
  const cambiar = (next: Modo) => {
    if (next === modo) return;
    // ⚠️ A COST SHE KEYED IS CONVERTED, per caja to per kilo and back; one she has
    // not touched follows the memory in the new unit. Two cajas become 26 kg, and
    // kilos become no count of cajas — she says how many came.
    if (costo !== null) setCosto(costoAlCambiar(costoTexto, next, trae));
    setCantidad(next === 'suelto' && qtyBase !== null ? (qtyShown(qtyBase, unit, factors) ?? null) : null);
    setModo(next);
    elegir('cantidad');
  };
  const act = () => {
    if (!ready || qtyBase === null || perBase === null) return;
    setPrice('buy', entry.id, perBase);
    setQty('buy', entry.id, qtyBase);
    if (pack !== null) {
      recordarLlegada(
        entry.id,
        modo,
        trae,
        porCaja ? { cuantos: cantidadTexto, costo: costoTexto, base: qtyBase, perBase } : null,
      );
    }
    onClose();
  };

  const first = state === 'new-pairing';
  const detail = first
    ? provider === null || provider.isGeneric
      ? ES.buy.newPairing
      : ES.buy.newPairingWith(provider.name)
    : (provider?.name ?? '');
  const before =
    remembered === null
      ? null
      : porCaja
        ? (() => {
            const pesos = costoDePaquete(remembered.perBase, trae, unit, factors);
            const c = pesos === null ? null : parsePesos(pesos);
            return c === null ? null : formatMXN(c);
          })()
        : remembered.price;
  const costLine =
    note === 'last-bought'
      ? formatLastBought(boughtAt)
      : note === 'changed' && before !== null
        ? ES.buy.lastPaid(before)
        : note === 'ask'
          ? ES.buy.pad.ask
          : null;
  const holdsNote =
    pack === null
      ? null
      : llegada !== undefined && llegada.trae !== '' && llegada.trae === trae
        ? ES.buy.pad.holdsLast
        : trae === traeDe(pack)
          ? ES.buy.pad.holdsGuess
          : null;
  const entra = porCaja ? entran(qtyBase, perBase, entry, factors) : null;

  const cajas = (
    <Casilla
      on={campo === 'cantidad'}
      label={ES.buy.pad.arrived}
      reader={`${ES.buy.pad.arrivedOf(entry.name)}: ${packs} ${pack === null ? '' : palabraDe(pack.word, packs)}`}
      figure={cantidadTexto === '' ? '0' : cantidadTexto}
      empty={paquetesDe(cantidadTexto) === null}
      unit={pack === null ? '' : palabraDe(pack.word, packs)}
      onPress={() => elegir('cantidad')}
    />
  );
  const contenido = (
    <Casilla
      on={campo === 'trae'}
      label={ES.buy.pad.holds(packOne)}
      reader={`${ES.buy.pad.holdsOf(packOne, entry.name)}: ${trae === '' ? '0' : trae} ${word}`}
      figure={trae === '' ? '0' : trae}
      empty={contenidoBase(trae, unit, factors) === null}
      unit={word}
      nota={holdsNote}
      onPress={() => elegir('trae')}
    />
  );

  return (
    <Bascula
      bare={bare}
      entry={entry}
      retrato={{ ground: PALETTE.compraSuave, ink: PALETTE.compra }}
      detalle={
        detail === '' ? null : (
          <Text
            numberOfLines={2}
            style={{
              fontSize: scale.smallSize,
              fontWeight: first ? '600' : '400',
              color: first ? PALETTE.compra : PALETTE.tintaApagada,
            }}
          >
            {detail}
          </Text>
        )
      }
      fichas={
        porCaja
          ? ['1', '2', '3', '4', '5', '10'].map((n) => ({
              etiqueta: n,
              onPress: () => {
                setCampo('cantidad');
                setCantidad(n);
                setFresco(false);
              },
            }))
          : fichasDeCompra(unit).map((ficha) => ({
              etiqueta: ficha.etiqueta,
              onPress: () => {
                setCampo('cantidad');
                setCantidad(ficha.digitos);
                setFresco(false);
              },
            }))
      }
      teclas={TECLAS_PUNTO}
      apagada={(tecla) =>
        tecla === 'punto' && ((campo === 'cantidad' && (porCaja || sinPunto)) || (campo === 'trae' && sinPunto))
      }
      onTecla={(tecla) => {
        if (campo === 'trae') {
          setTrae(escribir(fresco && tecla !== 'borrar' ? '' : trae, tecla, decimalesDe(unit), MAX_ENTEROS.cantidad));
          setFresco(false);
          return;
        }
        const now = campo === 'cantidad' ? cantidadTexto : costoTexto;
        const from = fresco && tecla !== 'borrar' ? '' : now;
        if (campo === 'cantidad') {
          setCantidad(
            porCaja
              ? escribir(from, tecla, 0, MAX_PAQUETES)
              : escribir(from, tecla, decimalesDe(unit), MAX_ENTEROS.cantidad),
          );
        } else setCosto(escribir(from, tecla, DECIMALES_COSTO, MAX_ENTEROS.costo));
        setFresco(false);
      }}
      accion={{
        label: `${base > 0 ? ES.counter.done : ES.counter.pad.add}${centavos === null ? '' : ` · ${formatMXN(centavos)}`}`,
        onPress: act,
        off: !ready,
      }}
      onQuitar={
        base > 0
          ? () => {
              remove('buy', entry.id);
              onClose();
            }
          : null
      }
      onClose={onClose}
    >
      {pack === null ? null : (
        <Modos
          modo={modo}
          paquete={packOne}
          suelto={ES.buy.pad.loose[unit as keyof typeof ES.buy.pad.loose] ?? word}
          onChange={cambiar}
        />
      )}
      {porCaja ? (
        density === 'elder' ? (
          <>
            {cajas}
            {contenido}
          </>
        ) : (
          <View style={{ flexDirection: 'row', gap: scale.rowGap }}>
            <View style={{ flex: 1 }}>{cajas}</View>
            <View style={{ flex: 1 }}>{contenido}</View>
          </View>
        )
      ) : (
        <Casilla
          on={campo === 'cantidad'}
          label={ES.buy.pad.arrived}
          reader={`${ES.buy.pad.arrivedOf(entry.name)}: ${cantidadTexto === '' ? '0' : cantidadTexto} ${word}`}
          figure={cantidadTexto === '' ? '0' : cantidadTexto}
          empty={qtyBase === null}
          unit={word}
          onPress={() => elegir('cantidad')}
        />
      )}
      <Casilla
        on={campo === 'costo'}
        label={ES.buy.cost}
        reader={`${ES.buy.pad.costOf(entry.name)}: $${costoTexto === '' ? '0' : costoTexto} ${ES.sell.per(porCaja ? packOne : priceWord)}${costLine === null ? '' : `, ${costLine}`}`}
        figure={`$${costoTexto === '' ? '0' : costoTexto}`}
        empty={perBase === null}
        unit={ES.sell.per(porCaja ? packOne : priceWord)}
        side={
          costLine === null ? null : (
            <Text
              numberOfLines={2}
              style={{
                flexShrink: 1,
                textAlign: 'right',
                fontSize: scale.smallSize,
                fontWeight: note === 'last-bought' ? '400' : '600',
                color: note === 'last-bought' ? PALETTE.tintaApagada : PALETTE.compra,
              }}
            >
              {costLine}
            </Text>
          )
        }
        onPress={() => elegir('costo')}
      />
      {entra === null ? null : (
        <Text style={{ fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.tinta }}>
          {ES.buy.pad.enters(entra.cantidad, word, formatMXN(entra.centavos), priceWord)}
        </Text>
      )}
      {margin === null ? null : <Margen margin={margin} entry={entry} />}
      {/* ⚠️ `R11`: the amber never travels alone — it is a sentence. */}
      {big === '' ? null : (
        <Text style={{ fontSize: scale.smallSize, fontWeight: '600', color: PALETTE.atencion }}>{big}</Text>
      )}
    </Bascula>
  );
}

/**
 * ⚠️ `14.5`: HOW IT ARRIVED — the pack or the product's own unit, *Caja · Kilos*.
 * The chosen one is filled in the counter's blue with a bolder word, and a screen
 * reader hears it selected (`R11`: never the colour alone).
 */
function Modos({
  modo,
  paquete,
  suelto,
  onChange,
}: {
  modo: Modo;
  paquete: string;
  suelto: string;
  onChange: (modo: Modo) => void;
}) {
  const { scale } = useDensity();
  const choices: readonly [Modo, string][] = [
    ['paquete', paquete.charAt(0).toUpperCase() + paquete.slice(1)],
    ['suelto', suelto],
  ];
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={ES.buy.pad.byPack} style={{ flexDirection: 'row', gap: scale.rowGap / 2 }}>
      {choices.map(([m, label]) => {
        const on = m === modo;
        return (
          <Pressable
            key={m}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(m)}
            style={{
              flex: 1,
              minHeight: scale.tapTarget,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: scale.rowGap,
              borderRadius: ESQUINA.chip,
              borderWidth: on ? 2 : 1,
              borderColor: on ? PALETTE.compra : PALETTE.linea,
              backgroundColor: on ? PALETTE.compra : PALETTE.superficie,
            }}
          >
            <Text
              numberOfLines={1}
              style={{ fontSize: scale.bodySize, fontWeight: on ? '700' : '600', color: on ? PALETTE.superficie : PALETTE.tinta }}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * One of the delivery pad's two boxes. ⚠️ Chosen, its edge is two points and blue
 * — a change of width as well as of hue (`R11`) — and a screen reader hears it
 * selected. The figure is what she keyed, as she keyed it (`12.`), in the face
 * money takes in rows, carts and buttons.
 */
function Casilla({
  on,
  label,
  reader,
  figure,
  empty,
  unit,
  side = null,
  nota = null,
  onPress,
}: {
  on: boolean;
  label: string;
  reader: string;
  figure: string;
  empty: boolean;
  unit: string;
  side?: ReactNode;
  /** `14.5`: under the figure, where it came from — *Aproximado*, *La última vez*. */
  nota?: string | null;
  onPress: () => void;
}) {
  const { scale } = useDensity();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={reader}
      accessibilityState={{ selected: on }}
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: scale.rowGap,
        minHeight: scale.tapTarget * 1.2,
        paddingHorizontal: scale.space,
        paddingVertical: scale.rowGap / 2,
        borderRadius: ESQUINA.campo,
        borderWidth: on ? 2 : 1,
        borderColor: on ? PALETTE.compra : PALETTE.linea,
        backgroundColor: PALETTE.superficie,
      }}
    >
      {/* ⚠️ IT GIVES WAY ONLY WHEN NOTHING IS BESIDE IT — half the pad's width,
          *Trae cada caja* beside *Llegaron* (`14.5`), wraps instead of spilling. */}
      <View style={{ flexShrink: side === null ? 1 : 0, gap: scale.rowGap / 8 }}>
        <Text style={{ fontSize: scale.smallSize, fontWeight: on ? '700' : '600', color: PALETTE.tintaApagada }}>
          {label}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: scale.rowGap / 2 }}>
          <Text
            style={{
              fontSize: scale.moneySize,
              fontWeight: '700',
              fontVariant: ['tabular-nums'],
              color: empty ? PALETTE.tintaApagada : PALETTE.tinta,
            }}
          >
            {figure}
          </Text>
          <Text style={{ fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.tintaApagada }}>{unit}</Text>
        </View>
        {nota === null ? null : (
          <Text style={{ fontSize: scale.smallSize, color: PALETTE.tintaApagada }}>{nota}</Text>
        )}
      </View>
      {side}
    </Pressable>
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
        borderRadius: ESQUINA.chip,
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
              <Icono
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
        borderRadius: ESQUINA.chip,
        borderWidth: 1,
        borderColor: PALETTE.atencion,
        backgroundColor: PALETTE.atencionSuave,
      }}
    >
      {/* ⚠️ TWO LINES, NEVER CUT (`14.3`): at *Letra grande* one line read *Falta
          el costo de 1 pro…* beside *Vaciar carrito* (seen on the Simulator) —
          the sentence is the only thing saying why the slide is gone. */}
      <Text
        numberOfLines={2}
        style={{ textAlign: 'center', fontSize: scale.bodySize * 0.9, fontWeight: '700', color: PALETTE.atencion }}
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
 *
 * ⚠️ `14.3`: A LINE'S COST AND QUANTITY OPEN THE PAD, drawn inside this `Modal`
 * (`hoja`) — the phone's keyboard no longer comes up here either.
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
  onPad,
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
  /** `14.3`: a line's cost chip or quantity box opens the counter's pad. */
  onPad: (entry: CatalogEntry, campo: Campo) => void;
  /** The pad, drawn inside this `Modal` while it is open — see `Comprar`. */
  hoja: ReactNode;
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
            onPad={onPad}
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
 * where Vender has the unit price: the name and the line's figure, then the
 * cost, then the stepper and `Quitar`. *"The geometries in common are the
 * same"* (round 4): the first and last rows ARE Vender's. ⚠️ `14.3`: the cost is a
 * chip and the quantity a box, and both open the pad — Vender's line's own shape.
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
  onPad,
}: {
  row: ReviewRow;
  entry: CatalogEntry | undefined;
  factors: UnitFactors;
  typical: Typical | undefined;
  memory: readonly MemoryRow[] | null;
  providerId: string | null;
  canRead: boolean;
  onPad: (entry: CatalogEntry, campo: Campo) => void;
}) {
  const { scale } = useDensity();
  const remove = useCartStore((state) => state.remove);
  const stored = useCartStore((state) => (entry === undefined ? undefined : state.typed.buy[entry.id]));
  const llegada = useLlegadas((state) => state.llegadas[row.variantId]);
  const gone = entry === undefined;
  // ⚠️ `14.5`: a line keyed in cajas reads in cajas — *2 cajas de 13 kg*, *$209.30 por caja*.
  const pack = entry === undefined ? null : paqueteDe(entry);
  const enCajas = pack === null ? null : lineaDe(llegada, row.base, typeof stored === 'string' ? stored : undefined);
  const cajas = enCajas === null ? null : paquetesDe(enCajas.cuantos);
  const porCaja =
    pack === null || enCajas === null || cajas === null || llegada === undefined || entry === undefined
      ? null
      : {
          palabra: palabraDe(pack.word, cajas),
          una: ES.packs[pack.word].one,
          linea: ES.buy.pad.line(
            cajas,
            palabraDe(pack.word, cajas),
            llegada.trae,
            ES.units[shownUnitOf(entry) as keyof typeof ES.units] ?? shownUnitOf(entry),
          ),
          costo: parsePesos(enCajas.costo),
          cifra: String(cajas),
        };

  const state = memoryState(memory, providerId, row.variantId, canRead);
  const alarm = !gone && state !== 'unknown' && typeof stored !== 'string';
  const big = magnitudeNote(outsized(typical, row.base, typeof stored === 'string' ? stored : null));

  return (
    <View
      style={{
        gap: scale.rowGap,
        paddingVertical: scale.space,
        paddingHorizontal: scale.space,
        // ⚠️ `11.6`: the delivery's lines on a white sheet, as Vender's.
        backgroundColor: alarm ? PALETTE.atencionSuave : PALETTE.superficie,
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
      {porCaja === null ? null : (
        <Text style={{ fontSize: scale.smallSize, color: PALETTE.tintaApagada }}>{porCaja.linea}</Text>
      )}

      {/* ⚠️ `R11`: the state never travels as a colour alone. THE MISSING COST
          WINS WHEN BOTH APPLY: C3.13 decides whether this can be sent at all,
          and §2.8 makes the magnitude warning advisory. */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: scale.rowGap }}>
        {gone || entry === undefined ? (
          <Text style={{ fontSize: scale.smallSize, color: PALETTE.tintaApagada }}>{ES.counter.cart.gone}</Text>
        ) : (
          <CostoLinea
            entry={entry}
            factors={factors}
            stored={typeof stored === 'string' ? stored : null}
            porCaja={porCaja === null || porCaja.costo === null ? null : { centavos: porCaja.costo, una: porCaja.una }}
            alarm={alarm}
            onPress={() => onPad(entry, 'costo')}
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
          <Cantidad
            entry={entry}
            base={row.base}
            factors={factors}
            scope="buy"
            onPad={() => onPad(entry, 'cantidad')}
            paquete={porCaja === null ? undefined : { cifra: porCaja.cifra, palabra: porCaja.palabra }}
          />
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
 * ⚠️ `14.3`: A LINE'S COST, ON THE CARRITO — Vender's unit-price chip (`Unitario`)
 * in Comprar's blue: *$16.10 por kg* and a pencil, and a tap opens the pad on its
 * cost box. With no cost it asks, outlined amber — C3.13's line, which the slide
 * waits on; *Falta el costo* is said beside it (`R11`).
 */
function CostoLinea({
  entry,
  factors,
  stored,
  porCaja = null,
  alarm,
  onPress,
}: {
  entry: CatalogEntry;
  factors: UnitFactors;
  /** The cost the line carries, net per base — `null` when it has none. */
  stored: string | null;
  /** `14.5`: a line keyed in cajas shows what she keyed — *$209.30 por caja*. */
  porCaja?: { readonly centavos: number; readonly una: string } | null;
  alarm: boolean;
  onPress: () => void;
}) {
  const { scale } = useDensity();
  const factor = factors[entry.priceUnit];
  const centavos =
    stored === null ? null : porCaja !== null ? porCaja.centavos : factor === undefined ? null : priceCentavos(stored, factor);
  const unit = porCaja !== null ? porCaja.una : (ES.units[entry.priceUnit as keyof typeof ES.units] ?? entry.priceUnit);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={ES.buy.pad.costOf(entry.name)}
      hitSlop={scale.rowGap}
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale.rowGap / 2,
        paddingHorizontal: scale.rowGap,
        paddingVertical: scale.rowGap / 2,
        borderRadius: ESQUINA.boton,
        borderWidth: alarm ? 1 : 0,
        borderColor: PALETTE.atencion,
        backgroundColor: alarm ? PALETTE.atencionSuave : PALETTE.compraSuave,
      }}
    >
      <Text style={{ fontSize: scale.smallSize, fontWeight: centavos === null ? '600' : '400', color: PALETTE.tinta }}>
        {centavos === null ? ES.buy.pad.ask : `${formatMXN(centavos)} ${ES.sell.per(unit)}`}
      </Text>
      <Icono name="pencil-outline" size={scale.smallSize} color={PALETTE.compra} />
    </Pressable>
  );
}
