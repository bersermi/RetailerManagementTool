import { Icono } from '@/ui/Icono';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';

import { catalogLine, priceCentavos, type CatalogEntry, type UnitFactors } from '@/api/catalog';
import { aislesOf, type Aisle } from '@/api/productPage';
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
import { TECLAS, baseDe, fichasDe, teclear, tecladoDe, textoDe, type Tecla } from '@/cart/bascula';
import { reviewOf, stepOf, type Basket, type Quotes, type Review, type ReviewRow } from '@/cart/cart';
import { qtyShown, shownUnitOf } from '@/cart/quantity';
import { canCommit, commitOf, type Basketful } from '@/cart/commit';
import { sellGate } from '@/cart/gate';
import { porOrden } from '@/cart/orden';
import { useOrdenDelDia } from '@/cart/useOrdenDelDia';
import { columnasDe, conMenos, pasilloAlEscribir, toqueDe, toqueLargoDe, vitrinaDe, type Toque } from '@/cart/vitrina';
import { useCart, useCartStore, useCorrects, useTyped } from '@/cart/store';
import { formatMXN } from '@/format/mxn';
import { commitToQueue } from '@/lib/commitRunner';
import { newWriteId, nowIso } from '@/lib/ids';
import { usePilotVisit } from '@/pilot/usePilotVisit';
import { correctingLine } from '@/api/corrections';
import { takeArrival } from '@/auth/llegada';
import { useRecorridoPorSiSolo } from '@/navigation/useRecorrido';
import { useOnline } from '@/offline/useOnline';
import { ES } from '@/strings';
import { useDensity } from '@/theme/DensityProvider';
import { PALETTE } from '@/theme/palette';
import { EMPTIED_BLOOM_MS, REFUSED_NOTE_MS } from '@/theme/pulse';
import { Baldosa } from '@/ui/Baldosa';
import { Bascula } from '@/ui/Bascula';
import { Buscador } from '@/ui/Buscador';
import { Cantidad } from '@/ui/Cantidad';
import { CierreCarrito } from '@/ui/CierreCarrito';
import { Hecho } from '@/ui/Hecho';
import { FIRST_SALE_KEY, firstTime } from '@/offline/ensenar';
import { deviceStore } from '@/lib/store';
import { comportamientoTeclado } from '@/lib/teclado';
import { useDesfaseTeclado } from '@/lib/useDesfaseTeclado';
import { HojaCarrito } from '@/ui/HojaCarrito';
import { PrecioRapido } from '@/ui/PrecioRapido';
import { Separador } from '@/ui/Separador';
import { TotalCarrito } from '@/ui/TotalCarrito';
import { Vacio } from '@/ui/Vacio';
import { Corrigiendo } from '@/ui/Corrigiendo';
import { VaciarCarrito } from '@/ui/VaciarCarrito';
import { ESQUINA } from '@/theme/density';
import { letraNumero } from '@/theme/letra';
import { Pasillos } from '@/ui/Pasillos';
import { Vitrina } from '@/ui/Vitrina';

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
// ~~⚠️ THE INITIALS TILE IS ABSENT TOO, and for width rather than for a ruling.~~
// Corrected at `14.2`: every product is a tile now, its photo or its initials
// (C8.14) — see below.
//
// ----------------------------------------------------------------------------
// ⚠️⚠️ `14.2`, LA VITRINA — THE ROWS BECAME TILES (the owner's ruling of 2026-11-27)
// ----------------------------------------------------------------------------
// *"It is very difficult to do it with just one product per row and without
// categories."* So the counter is the aisles across the top as names (`Pasillos`),
// and the products as tiles three across, two at *Letra grande* (`Baldosa`), in
// the order the shop sells them — four weeks of sales, counted as sales, set once
// a day (`@/cart/orden`, `@/cart/useOrdenDelDia`). A tap adds one, a weighed one
// opens the pad, a long press opens it on anything (`@/cart/vitrina`); after the
// slide the counter is back on *Todo* at the top. ~~⚠️ THE PARTS ARE DRAWN HERE
// AND NOT IN `src/ui/` (`R14`)~~ — corrected at `14.3`: Comprar draws them too, so
// the aisles, the tile, the grid and the pad's frame are `src/ui/`'s (`Pasillos`,
// `Baldosa`, `Vitrina`, `Bascula`). What stays here is what only Vender decides:
// what a tap does (`BaldosaVenta`) and how the pad reads (`BasculaVenta`).
//
// ⚠️⚠️ `14.3`, CALL 13 — THE SEARCH IS THE WHOLE SHOP (the owner, after `14.2`
// reached his phone: *"when someone is typing, the filter automatically defaults
// to Todo"*). The first letter moves the aisles to *Todo*, tapping an aisle
// empties the box, and emptying it leaves *Todo* (`@/cart/vitrina`).
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
// ⚠️ `behavior` IS `padding` ON iOS AND NOTHING ON ANDROID 14 OR OLDER, which is
// not a hedge: Expo sets `softwareKeyboardLayoutMode: "resize"`, so an older
// Android's window is already shortened by the system and a second adjustment
// double-counts it. C1.1 puts two Androids among the pilot's four phones.
// ⚠️⚠️ CORRECTED 2026-10-22 (`8g`, the owner's first user): ON ANDROID 15 AND
// NEWER IT IS `padding` TOO. Measured on the emulator, Android 16: the window
// stayed the full screen with the keyboard up — an app targeting API 35+ is
// drawn edge to edge and the system resizes nothing. `@/lib/teclado` decides.
//
// ⚠️ THE OFFSET IS THE TAB BAR'S OWN HEIGHT PLUS THE DEVICE INSET, because this
// screen is inside the tab navigator: without it the avoidance is short by
// exactly the bar and the box still clips.
//
// ⚠️⚠️ SINCE `14.1` (2026-11-27) NO QUANTITY BOX ON THIS SCREEN RAISES THE
// KEYBOARD: the box opens the counter's own pad (`Bascula`, below), so the row
// scrolled to the middle and `onScrollToIndexFailed` left with it. The avoiding
// view stays, for the search box — the one field here the phone still types into.
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

// ⚠️ `14.1`: `PAD_ID` and `TecladoListo`'s bar left with the phone's keyboard —
// the bar was this screen's only way off `decimal-pad` (the owner, 2026-09-25),
// and the counter's own pad has its *Agregar* and *Listo* on it.

export default function Vender() {
  const { scale, mode } = useDensity();
  const insets = useSafeAreaInsets();
  // ⚠️ `8g`, 2026-10-22: on Android 15+ the keyboard's room counts from where this counter starts (`@/lib/useDesfaseTeclado`).
  const desfase = useDesfaseTeclado(scale.tabBarHeight + insets.bottom);

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

  // ⚠️⚠️ `14.2`, LA VITRINA — THE DAY'S ORDER, THE AISLES AND THE TILES (the owner's
  // ruling of 2026-11-27). What sells most comes first, in *Todo* and in every
  // aisle, by four weeks of sales counted as sales (`@/cart/orden`); the aisles
  // come in the same order. ⚠️ The order is drawn when the screen is reached and
  // after a sale — never when the read lands under her thumb (`useOrdenDelDia`).
  const { orden, tomar } = useOrdenDelDia();
  const ordered = useMemo(() => porOrden(entries, orden?.productos ?? [], (entry) => entry.id), [entries, orden]);
  const aisles = useMemo(
    () => porOrden(aislesOf(entries), orden?.pasillos ?? [], (one) => one.familyId),
    [entries, orden],
  );
  // ⚠️ The aisle stays where she left it during a sale, and goes back to *Todo*
  // after one (call 8) — see `commit`.
  const [aisle, setAisle] = useState<string | null>(null);
  const shown = vitrinaDe(ordered, typed, aisle);
  const columns = columnasDe(mode);
  const grid = useRef<FlatList<CatalogEntry | null>>(null);
  const strip = useRef<ScrollView>(null);
  // ⚠️ CALL 13: SEARCHING AND BROWSING NEVER MIX. A letter typed puts the aisles
  // on *Todo*; an aisle tapped empties the box and puts the keyboard away — she
  // is browsing now, and a box still holding a word would hide the aisle's tiles.
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
  // ⚠️ `14.1`: the product whose pad is open, from a row or from a line.
  const [pesando, setPesando] = useState<CatalogEntry | null>(null);
  const openPad = useCallback((entry: CatalogEntry) => setPesando(entry), []);
  const closePad = useCallback(() => setPesando(null), []);
  const setLine = useCartStore((state) => state.setQty);
  // ⚠️ THE PAD'S PRICE DOOR CLOSES THE PAD FIRST: two sheets up at once is the
  // nested presentation `VaciarCarrito`'s arrangement exists to avoid.
  const priceFromPad = useCallback(
    (entry: CatalogEntry) => {
      setPesando(null);
      openPricing(entry, false);
    },
    [openPricing],
  );
  // The cashier's note, by the product's name — see `Nota`.
  const [refused, setRefused] = useState<string | null>(null);
  const forgetRefused = useCallback(() => setRefused(null), []);

  const [cartOpen, setCartOpen] = useState(false);
  // ⚠️ `14.1`: ANDROID'S BACK REACHES THE CARRITO'S `Modal`, NOT THE SHEET DRAWN
  // INSIDE IT — so with the pad or the price sheet up over the Carrito, back closed
  // the Carrito and left the pad standing over the list (seen on the emulator,
  // 2026-11-27). The top sheet goes first.
  const closeCart = useCallback(() => {
    if (pesando !== null) setPesando(null);
    else if (pricing !== null) setPricing(null);
    else setCartOpen(false);
  }, [pesando, pricing]);
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
  // ⚠️ `8g`, 2026-10-21: SHE HAS JUST ARRIVED — opened her shop, or joined one
  // as an Empleado — and is told so once, as the confirmation a sale gets
  // (`@/auth/llegada`). Taken on focus, not on mount: a tab stays mounted.
  const [arrived, setArrived] = useState<string | null>(null);
  useFocusEffect(
    useCallback(() => {
      const arrival = takeArrival();
      if (arrival !== null) setArrived(arrival.word);
      // ⚠️ `14.2`: today's order, if the phone has set it since — on arriving.
      tomar();
    }, [tomar]),
  );
  // ⚠️ `8g`, 2026-10-21: and once that line has been read, *Conoce Wera* — the
  // owner's eight cards, an Empleado's four — opens by itself, once per phone.
  useRecorridoPorSiSolo(arrived !== null, cart.length > 0);
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
    // ⚠️⚠️ `14.2`, CALL 8: BACK TO *TODO* AT THE TOP, ready for the next customer —
    // the search emptied, the aisle undone, the grid and the strip at their
    // start, and today's order drawn if it was set during the sale.
    setTyped('');
    setAisle(null);
    box.current?.blur();
    grid.current?.scrollToOffset({ offset: 0, animated: false });
    strip.current?.scrollTo({ x: 0, animated: false });
    tomar();
    // ⚠️ `8g`, 2026-10-20: THE FIRST SALE ON THIS PHONE CARRIES ONE LINE — Wera
    // works without internet — and no other sale ever does (`@/offline/ensenar`).
    setSoldNote(firstTime(deviceStore(), FIRST_SALE_KEY) ? ES.offline.firstSale : null);
    setSold(true);
  }, [basketful, clear, pilot, tomar]);

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
      behavior={comportamientoTeclado(Platform.OS, Platform.Version)}
      onLayout={desfase.onLayout}
      keyboardVerticalOffset={desfase.offset}
    >
      {corrects === null ? null : (
        <View style={{ paddingHorizontal: scale.space, paddingTop: scale.rowGap }}>
          <Corrigiendo line={correctingLine('sale', corrects)} onCancel={() => setAsking(true)} />
        </View>
      )}
      <Buscador value={typed} onChange={write} box={box} placeholder={ES.catalog.search} />
      <Pasillos aisles={aisles} chosen={aisle} onChoose={choose} strip={strip} tono={PALETTE.accion} />

      {/* ⚠️ A BOX AROUND THE GRID SO THE CASHIER'S NOTE SITS OVER ITS FOOT,
          just above the bar, without moving a tile under a thumb. */}
      <View style={{ flex: 1 }}>
      <Vitrina
        productos={shown}
        columnas={columns}
        grid={grid}
        vacio={catalogLine(loading, typed, failed, online)}
        baldosa={(item) => (
          <BaldosaVenta
            entry={item}
            factors={factors}
            typical={typicals[item.id]}
            onPad={openPad}
            onPrice={mayPrice ? openPricing : null}
            onRefused={(entry) => setRefused(entry.name)}
          />
        )}
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
          workspaceId={workspace.id}
          onSaved={priced}
          onClose={() => setPricing(null)}
        />
      ) : null}

      {pesando !== null && !cartOpen ? (
        <BasculaVenta
          entry={pesando}
          factors={factors}
          typical={typicals[pesando.id]}
          pricesIncludeTax={workspace?.pricesIncludeTax ?? null}
          quotes={quotes}
          onPrice={mayPrice ? priceFromPad : null}
          onSet={(base) => setLine('sell', pesando.id, base)}
          onClose={closePad}
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
        onPad={openPad}
        hoja={
          pricing !== null && workspace !== null && cartOpen ? (
            <PrecioRapido
              bare
              entry={pricing.entry}
              adding={pricing.adding}
              workspaceId={workspace.id}
              onSaved={priced}
              onClose={() => setPricing(null)}
            />
          ) : pesando !== null && cartOpen ? (
            <BasculaVenta
              bare
              entry={pesando}
              factors={factors}
              typical={typicals[pesando.id]}
              pricesIncludeTax={workspace?.pricesIncludeTax ?? null}
              quotes={quotes}
              onPrice={mayPrice ? priceFromPad : null}
              onSet={(base) => setLine('sell', pesando.id, base)}
              onClose={closePad}
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
      <Hecho shown={arrived !== null} word={arrived ?? ''} lingers onDone={() => setArrived(null)} />

    </KeyboardAvoidingView>
  );
}

/**
 * ⚠️⚠️ `14.2`, ONE PRODUCT ON VENDER'S COUNTER — what its tile says and what a touch
 * on it does. The tile is `src/ui/Baldosa` since `14.3`; what is Vender's is here.
 *
 * ⚠️⚠️ C3.3 STILL HOLDS: THE TAP IS THE LINE. A tap adds one piece or bunch, or
 * opens the pad on a weighed product; a long press opens the pad on any product
 * (`@/cart/vitrina`). A weighed line draws no `−` (it would take a whole kilo): its
 * tap opens the pad, where *Quitar* is.
 *
 * ⚠️ THE PRICE IS NOT A BUTTON ON THE TILE (the page's call 5: *Cambiar precio*
 * moves into the pad): a tag is a third of a target high, and a tile tapped to
 * add must never open a sheet instead. The owner and a manager change a price
 * from the pad — a long press, or the tap on a weighed product — and a product
 * with no price opens the price sheet from its tap, as the owner ruled on
 * 2026-10-15 (`sellGate`).
 *
 * ⚠️ THE AMBER BAND SAYS *Sin precio* for a priceless line (which wins), else
 * §2.8's *Más de lo habitual*; the tile's ground goes amber with *Sin precio*, as
 * the row's did.
 */
function BaldosaVenta({
  entry,
  factors,
  typical,
  onPad,
  onPrice,
  onRefused,
}: {
  entry: CatalogEntry;
  factors: UnitFactors;
  /** What this product usually arrives as — `undefined` when the shop has never
   *  bought it, or when it fell out of `MAGNITUDE_LIMIT`'s window. */
  typical: Typical | undefined;
  /** Opens the counter's pad on this product (`14.1`). */
  onPad: (entry: CatalogEntry) => void;
  /** Opens the price sheet — `adding` when the tap asked; `null` for a cashier. */
  onPrice: ((entry: CatalogEntry, adding: boolean) => void) | null;
  /** A cashier's tap on a product with no price: the note saying who can fix it. */
  onRefused: (entry: CatalogEntry) => void;
}) {
  const bump = useCartStore((state) => state.step);
  const base = useCartStore((state) => {
    for (const line of state.carts.sell) if (line.variantId === entry.id) return line.base;
    return 0;
  });
  const unit = shownUnitOf(entry);
  const by = stepOf(entry.priceUnit, factors);
  const counted = base > 0;
  const alarm = entry.centavos === null && counted;
  // ⚠️ §2.8's third guard, `null` for the price — a sale has no typed one.
  const big = magnitudeNote(outsized(typical, base, null));
  const gate = sellGate(entry.centavos, onPrice !== null, counted);
  const word = ES.units[unit as keyof typeof ES.units] ?? unit;
  const qty = counted ? `${qtyShown(base, unit, factors) ?? ''} ${word}` : '';
  const priceWord = ES.units[entry.priceUnit as keyof typeof ES.units] ?? entry.priceUnit;

  const act = (toque: Toque) => {
    if (toque === 'precio') onPrice?.(entry, true);
    else if (toque === 'nota') onRefused(entry);
    else if (toque === 'pesar') onPad(entry);
    // ⚠️ A unit this phone has not read steps nothing, as the old `+` did.
    else if (by !== null) bump('sell', entry.id, by, 1);
  };

  const band = alarm ? ES.sell.noPrice : big;
  return (
    <Baldosa
      entry={entry}
      etiqueta={{ centavos: entry.centavos, per: priceWord }}
      cantidad={qty}
      onMenos={
        counted && conMenos(unit)
          ? () => {
              if (by !== null) bump('sell', entry.id, by, -1);
            }
          : null
      }
      menosLabel={ES.counter.tile.less(entry.name)}
      banda={band}
      alarma={alarm}
      tono={PALETTE.accion}
      onPress={() => act(toqueDe(unit, gate))}
      onLongPress={() => act(toqueLargoDe(gate))}
      accessibilityLabel={[
        entry.name,
        entry.centavos === null ? ES.sell.noPrice : `${formatMXN(entry.centavos)} ${ES.sell.per(priceWord)}`,
        counted ? ES.counter.tile.inCart(qty) : '',
        band,
      ]
        .filter((part) => part !== '')
        .join(', ')}
      accessibilityHint={ES.counter.tile.hint}
    />
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
        borderRadius: ESQUINA.hoja,
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
      <Icono name="information-outline" size={scale.iconSize} color={PALETTE.atencion} />
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
  /** `14.1`: a line's box opens the counter's pad, drawn inside this `Modal`. */
  onPad: (entry: CatalogEntry) => void;
  /** The price sheet or the pad, drawn inside this `Modal` while it is open — see `Vender`. */
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
  onPad,
}: {
  row: ReviewRow;
  entry: CatalogEntry | undefined;
  factors: UnitFactors;
  typical: Typical | undefined;
  onPrice: ((entry: CatalogEntry, adding: boolean) => void) | null;
  onPad: (entry: CatalogEntry) => void;
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
        backgroundColor: PALETTE.superficie,
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
        {gone ? <View /> : <Cantidad entry={entry} base={row.base} factors={factors} scope="sell" onPad={() => onPad(entry)} />}

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
        borderRadius: ESQUINA.boton,
        backgroundColor: PALETTE.accionSuave,
      }}
    >
      {words}
      <Icono name="pencil-outline" size={scale.smallSize} color={PALETTE.accion} />
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

/**
 * ⚠️⚠️ `14.1`, LA BÁSCULA ON VENDER — what the counter's own number pad reads here,
 * opened by a tile or by the quantity box on a line of the Carrito (the owner's
 * ruling of 2026-11-27, Step 14). Its frame — the sheet, the keys, the chips, the
 * act — is `src/ui/Bascula` since `14.3`, shared with Comprar.
 *
 * ⚠️ IT READS LIKE THE SCALE (`@/cart/bascula`, his answer A): 7, 3, 0 is
 * *0.730 kg*. The chips are the best guesses; a count is a count. The figure and
 * what the line comes to are side by side, so she reads back what the customer
 * pays before she adds it.
 *
 * ⚠️⚠️ OPENED ON A LINE, IT SHOWS THE LINE'S QUANTITY AND THE FIRST KEY REPLACES
 * IT, as a scale starts again from zero — and *Listo* untouched changes nothing.
 * *Quitar* is there only for a line; `−` on the tile still takes one away.
 *
 * ⚠️ THE TOTAL IS `reviewOf`'s OWN ARITHMETIC over a one-line basket, with the
 * same quotes the screen prices against — so a corrected line shows the price it
 * was sold at, and the pad never states a figure the Carrito would not (§2.5
 * rule 5). It is withheld while the shop is unknown, as the bar's is.
 *
 * ⚠️ THE MAGNITUDE WARNING IS HERE TOO — §2.8's third guard, on the figure being
 * keyed, before it is a line: it is the moment a slip (7300 for 730) is cheapest.
 */
function BasculaVenta({
  entry,
  factors,
  typical,
  pricesIncludeTax,
  quotes,
  onPrice,
  onSet,
  onClose,
  bare = false,
}: {
  entry: CatalogEntry;
  factors: UnitFactors;
  typical: Typical | undefined;
  /** The shop's IVA setting, or `null` while it is not known — the total is then withheld. */
  pricesIncludeTax: boolean | null;
  /** The prices a corrected sale's lines keep (`useTyped`). */
  quotes: Quotes;
  /** The owner's and a manager's door to the price sheet; `null` for a cashier. */
  onPrice: ((entry: CatalogEntry) => void) | null;
  /** The line's new quantity in base units — `0` takes the line out. */
  onSet: (base: number) => void;
  onClose: () => void;
  /** Drawn inside the Carrito's `Modal` rather than as a `Modal` of its own. */
  bare?: boolean;
}) {
  const { scale } = useDensity();
  const unit = shownUnitOf(entry);
  const teclado = tecladoDe(unit);
  const word = ES.units[unit as keyof typeof ES.units] ?? unit;

  // ⚠️ THE LINE AS IT STANDS, READ FROM THE STORE: the pad may be opened from a
  // tile whose line another surface has just changed.
  const base = useCartStore((state) => {
    for (const line of state.carts.sell) if (line.variantId === entry.id) return line.base;
    return 0;
  });
  const [digitos, setDigitos] = useState('');
  const [keyed, setKeyed] = useState(false);

  const typed = keyed ? baseDe(digitos, unit, factors) : null;
  const shownBase = keyed ? (typed ?? 0) : base;
  const figure = keyed || base === 0 ? textoDe(keyed ? digitos : '', teclado) : (qtyShown(base, unit, factors) ?? '');
  const empty = shownBase === 0;

  const centavos =
    pricesIncludeTax === null || empty
      ? null
      : (reviewOf([{ variantId: entry.id, base: shownBase }], [entry], 'sell', pricesIncludeTax, undefined, quotes)
          .rows[0]?.centavos ?? null);
  const big = magnitudeNote(outsized(typical, shownBase, null));

  const act = () => {
    if (keyed && typed !== null) onSet(typed);
    onClose();
  };

  const unitPrice =
    entry.centavos === null ? ES.catalog.noPrice : `${formatMXN(entry.centavos)} ${ES.sell.per(ES.units[entry.priceUnit as keyof typeof ES.units] ?? entry.priceUnit)}`;

  return (
    <Bascula
      bare={bare}
      entry={entry}
      detalle={
        <>
          <Text style={{ fontSize: scale.smallSize, color: PALETTE.tintaApagada }}>{unitPrice}</Text>
          {onPrice === null ? null : (
            <Pressable accessibilityRole="button" hitSlop={scale.rowGap} onPress={() => onPrice(entry)}>
              <Text style={{ fontSize: scale.smallSize, fontWeight: '600', color: PALETTE.accion }}>
                {ES.counter.pad.changePrice}
              </Text>
            </Pressable>
          )}
        </>
      }
      fichas={fichasDe(unit).map((ficha) => ({
        etiqueta: ficha.etiqueta,
        onPress: () => {
          setDigitos(ficha.digitos);
          setKeyed(true);
        },
      }))}
      teclas={TECLAS}
      onTecla={(tecla) => {
        setDigitos((now) => teclear(keyed ? now : '', tecla, teclado));
        setKeyed(true);
      }}
      accion={{
        label:
          base > 0
            ? ES.counter.done
            : centavos === null
              ? ES.counter.pad.add
              : `${ES.counter.pad.add} · ${formatMXN(centavos)}`,
        onPress: act,
        off: base === 0 && typed === null,
      }}
      onQuitar={
        base > 0
          ? () => {
              onSet(0);
              onClose();
            }
          : null
      }
      onClose={onClose}
    >
      {/* The figure as the scale shows it, and what the line comes to. */}
      <View
        accessible
        accessibilityLabel={`${ES.counter.pad.title(entry.name)}: ${figure} ${word}`}
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: scale.space,
          paddingBottom: scale.rowGap / 2,
          borderBottomWidth: 1,
          borderBottomColor: PALETTE.linea,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: scale.rowGap / 2, flexShrink: 1 }}>
          <Text style={{ ...letraNumero(scale), color: empty ? PALETTE.tintaApagada : PALETTE.tinta }}>{figure}</Text>
          <Text style={{ fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.tintaApagada }}>{word}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: scale.smallSize, color: PALETTE.tintaApagada }}>{ES.counter.pad.total}</Text>
          <Text style={{ fontSize: scale.moneySize, fontWeight: '700', color: PALETTE.tinta, fontVariant: ['tabular-nums'] }}>
            {centavos === null ? ES.catalog.noPrice : formatMXN(centavos)}
          </Text>
        </View>
      </View>

      {/* ⚠️ `R11`: the amber never travels alone — it is a sentence. */}
      {big === '' ? null : (
        <Text style={{ fontSize: scale.smallSize, fontWeight: '600', color: PALETTE.atencion }}>{big}</Text>
      )}
    </Bascula>
  );
}
