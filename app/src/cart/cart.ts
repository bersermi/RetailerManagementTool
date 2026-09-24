// ============================================================================
// THE CART, AND THE ARITHMETIC THAT PRICES IT. Plan task `5f-i`.
//
// ⚠️ NO SCREEN AND NO COMPONENT. `5h.5` owns `src/ui/` and comes after the
// screens that would justify a primitive; everything here has a right answer
// `app/test/cart.test.ts` can read, which is `R3` and is the whole reason this
// child was split off `5f` before a line of the screen was written.
//
// ----------------------------------------------------------------------------
// ⚠️⚠️ THE QUANTITY IS HELD IN BASE UNITS AND NOTHING ELSE IS
// ----------------------------------------------------------------------------
// The owner specified the control on 2026-09-23: *"$45/250gr, when selling he
// can use the stepper to go 250 → 500 → 750 → 1000. But he can also tap to
// enter 288gr if needed."* So there are TWO ways to say how much, and they
// count in two different units — the stepper counts PRICE units and the keypad
// counts BASE units.
//
// Holding either of those as the cart's own number makes the other one lossy.
// Holding BASE units makes both exact: a step is `+ factor_to_base`, a keyed
// figure is itself, and `record_sale` is told whichever spelling is exact —
// `{ qty_display: 3, qty_display_unit: '250g' }` for three taps, and
// `{ qty_display: 288, qty_display_unit: 'g' }` for the keypad. ⚠️ THE SERVER
// RE-DERIVES `qty_base = round(qty_display × factor_to_base, 3)` either way
// (`0016`), so the two spellings agree to the milligram and the ledger never
// sees the difference. What the RECEIPT sees is the difference, which is why
// `288 g` is sent as grams rather than as `1.152` of a quarter-kilo.
//
// ⚠️ SCALE 3, ALWAYS AN INTEGER. `qty_base` and `qty_display` are both
// `numeric(14,3)` (`0003:306`), so a quantity here is thousandths of a base
// unit and never a float — `R5`, and the reason `packages/money` exists.
//
// ----------------------------------------------------------------------------
// ⚠️⚠️ THE PRICE IS GROSS ON A SALE, AND THAT IS NOT WHAT `price_list` HOLDS
// ----------------------------------------------------------------------------
// `record_sale` takes `unit_price_gross_per_base` and `price_list` stores
// `price_per_base` — the number the shopkeeper typed. §2.5 rule 2 makes the
// GROSS unit price authoritative on a sale *"because that is the shelf price,
// and the shelf price is what the customer agreed to"*, and whether the typed
// price already includes IVA is `workspace.prices_include_tax`, asked once at
// setup (*¿Tus precios ya incluyen IVA?*).
//
// ⚠️⚠️ SO THE TWO ARE THE SAME NUMBER ONLY WHILE THAT FLAG IS TRUE, AND `0001`
// DEFAULTS IT TRUE. Every shop in the pilot answers yes, so a module that
// hard-coded the identity would be right on every phone that exists today and
// would understate IVA — silently, in the ledger, permanently — for the first
// shop that answered no. Nothing in this repository would go red. That is why
// `quoted` READS the flag instead of assuming it.
//
// ⚠️⚠️ AND THE RATE IS AN ARGUMENT RATHER THAN A COLUMN, WHICH WAS DECIDED BY A
// CHECK REFUSING THE OTHER ANSWER. This module first widened the catalog read to
// carry `tax_rate`; `docs/checks/5d-i-catalog-contract.sh` went red on it by
// name — it bans `enforce_stock`, `tax_rate` and `pack_size` from the list read,
// because *"a column the app never asks for is a column that never reaches a
// phone"* — and `5e-iii-a` already reads those two per variant when `Editar`
// needs them. **A rate is needed only on the branch no shop takes**, so every
// phone in the pilot would have carried a column for it on every catalog read.
// ⚠️ WHAT THAT COSTS, SAID PLAINLY: a shop that answers *no* cannot be quoted
// until something hands the rate in, and `quoted` returns `null` rather than
// guessing — so the line is unpriced, the basket is `complete: false` and
// `draftOf` refuses. **Loud and stuck beats quiet and wrong in the ledger**, and
// the row that will own supplying it is the one that owns the RPC.
//
// ⚠️ THE CONVERSION IS `grossFromNet` FROM `@tienda/money`, APPLIED AT SCALE 6.
// It is a ratio, so the scale it is handed is the scale it returns; using the
// money package's own rounding rather than a second one here is the same
// argument `priceCentavos` makes one file over.
//
// ----------------------------------------------------------------------------
// ⚠️ WHAT THIS MODULE DOES NOT DO, NAMED SO NOBODY ASSUMES IT
// ----------------------------------------------------------------------------
//   * IT NEVER CALLS POSTGRES. `record_sale` is `5h`'s and `record_purchase` is
//     `5g`'s. This module builds the payload and the `WriteDraft` that
//     `queueWrite` accepts; **the live round trip that proves Postgres accepts
//     this shape is `5h`'s contract check.** A node suite can read every rule
//     here and cannot read that, and saying so is `R9`.
//   * IT DOES NOT QUOTE A PURCHASE, AND IT REFUSES TO RATHER THAN FALLING BACK.
//     C3.11 prefills Comprar from the last price paid TO THAT PROVIDER, which is
//     a read of `purchase_line` that nothing in this app performs; `5g` owns it.
//     The shelf price is right there and taking it would record a delivery at
//     retail — so `quoteFor` hands the buy side `null` until `5g` passes a
//     figure, and the line is plainly unpriced instead of plausibly wrong.
//   * IT DECIDES NOTHING ABOUT WHAT IS DRAWN. The stepper, the keypad, the
//     sticky bar and the sheet are `5f-ii` and `5f-iii`, and the first of those
//     is gated on an ADR amendment.
// ============================================================================

import {
  SCALE,
  divRoundHalfUpAwayFromZero,
  formatDecimal,
  grossFromNet,
  lineAnchorCentavos,
  netFromGross,
  parseDecimal,
  type Kind,
} from '@tienda/money';

import type { CatalogEntry, UnitFactors } from '@/api/catalog';
import type { WriteDraft, WriteKind } from '@/api/outbox';

/** `unit.factor_to_base` is `numeric(14,6)`. Spelled here as in `@/api/catalog`. */
const FACTOR_SCALE = 6;

/** 10^3 — a factor at scale 6 becomes a QUANTITY at scale 3. */
const FACTOR_TO_QUANTITY = 10 ** (FACTOR_SCALE - SCALE.quantity);

/**
 * One line of the basket. **A line exists because its quantity is greater than
 * zero** — C3.3, *"there is no add-to-basket step and no product-detail screen
 * between the list and the line"* — so this type has no `present` flag and no
 * zero-quantity state to represent.
 */
export interface CartLine {
  readonly variantId: string;
  /** Base units at scale 3. An integer, and always greater than zero. */
  readonly base: number;
}

/**
 * The basket, in the order rows were first given a quantity.
 *
 * ⚠️ AN ARRAY AND NOT A RECORD, AND THE ORDER IS THE POINT. The sheet lists
 * what was added in the order it was added; a keyed object would leave that to
 * whatever order the runtime happens to enumerate in, which is a rendering
 * decision made by accident in a module whose whole job is to make them on
 * purpose.
 */
export type Cart = readonly CartLine[];

/** An empty basket. Frozen, because a shared mutable default is a shared bug. */
export const EMPTY_CART: Cart = Object.freeze([]) as Cart;

/**
 * What one tap of `+` adds, in base units at scale 3 — or `null` when this
 * shop's unit table cannot answer.
 *
 * ⚠️⚠️ THE STEP IS `unit.factor_to_base` AND NEVER A NUMBER THIS MODULE PICKS.
 * `@/offline/deadLetters` takes the same map as an argument for the same
 * reason: two answers to *how many grams in a kilo* is one too many, and the
 * one that is right is the one `0001` stores.
 *
 * ⚠️ A `null` IS A UNIT THIS PHONE HAS NOT READ, not a zero. Stepping by zero
 * would look like a dead button; refusing to step at all is what lets the
 * screen say the catalog is still loading.
 */
export function stepOf(priceUnit: string, factors: UnitFactors): number | null {
  const text = factors[priceUnit];
  if (typeof text !== 'string') return null;
  try {
    const step = divRoundHalfUpAwayFromZero(parseDecimal(text, FACTOR_SCALE), FACTOR_TO_QUANTITY);
    return step > 0 ? step : null;
  } catch {
    return null;
  }
}

/**
 * A quantity a shopkeeper KEYED, in base units at scale 3 — or `null` when it
 * is not a quantity at all.
 *
 * ⚠️ IT REFUSES MORE DECIMALS THAN `numeric(14,3)` HOLDS rather than rounding
 * them away. `parseDecimal` is what refuses, and it is the same refusal the
 * price box already makes: a figure the column cannot store must not be
 * accepted and quietly changed, because the number the shopkeeper reads back
 * would not be the number they typed.
 * ⚠️ AND ZERO IS REFUSED, because a zero quantity is not a line (C3.3) — the
 * way to have no line is `remove`, and `record_sale` refuses `qty_display <= 0`
 * outright (`0016`).
 */
export function keyedBase(typed: string): number | null {
  const clean = typed.trim().replace(',', '.');
  if (clean === '') return null;
  try {
    const base = parseDecimal(clean, SCALE.quantity);
    return base > 0 ? base : null;
  } catch {
    return null;
  }
}

/** What this variant's line holds, in base units at scale 3. `0` when there is none. */
export function qtyOf(cart: Cart, variantId: string): number {
  for (const line of cart) if (line.variantId === variantId) return line.base;
  return 0;
}

/**
 * The basket with this variant set to `base`, and **the line removed when that
 * is not a positive quantity** — which is C3.3 read backwards and is the only
 * way a line ever leaves by arithmetic.
 *
 * ⚠️ A NEW LINE GOES ON THE END, and an existing one KEEPS ITS PLACE. A
 * shopkeeper correcting the first item in a ten-line basket must not watch it
 * jump to the bottom.
 */
export function setQty(cart: Cart, variantId: string, base: number): Cart {
  if (!Number.isFinite(base) || base <= 0) return remove(cart, variantId);
  const rounded = Math.trunc(base);
  let found = false;
  const next = cart.map((line) => {
    if (line.variantId !== variantId) return line;
    found = true;
    return { variantId, base: rounded };
  });
  return found ? next : [...cart, { variantId, base: rounded }];
}

/** The basket without this variant. A no-op when it is not in it. */
export function remove(cart: Cart, variantId: string): Cart {
  const next = cart.filter((line) => line.variantId !== variantId);
  return next.length === cart.length ? cart : next;
}

/**
 * One tap of `+` or `−`, in price units.
 *
 * ⚠️ STEPPING DOWN THROUGH ZERO REMOVES THE LINE rather than clamping to it.
 * `Quitar` is `5f-iii`'s labelled control and removes immediately by the ruling
 * of 2026-09-17; this is the same act reached by holding `−`, and a basket that
 * kept a zero-quantity row would be showing the shopkeeper something they had
 * just taken out.
 * ⚠️ A `null` STEP LEAVES THE BASKET EXACTLY AS IT WAS — see `stepOf`.
 */
export function step(cart: Cart, variantId: string, by: number | null, sign: 1 | -1): Cart {
  if (by === null || by <= 0) return cart;
  return setQty(cart, variantId, qtyOf(cart, variantId) + sign * by);
}

/**
 * How `record_sale` and `record_purchase` are told a quantity: the display
 * figure and the unit it is in.
 *
 * ⚠️⚠️ THE PRICE UNIT WINS WHEN IT DIVIDES EXACTLY, AND THE BASE UNIT WINS
 * OTHERWISE. That is the owner's own rule, and both spellings re-derive the
 * SAME `qty_base` server-side, so the choice is about what a person reads later
 * rather than about arithmetic: three taps of a quarter-kilo is `3 × 250g` on a
 * receipt, and a keyed `288` is `288 g` rather than `1.152` of a quarter-kilo.
 *
 * ⚠️ THE FIGURE IS A STRING, NOT A JSON NUMBER. `0016` reads it as
 * `(e.l->>'qty_display')::numeric`, so text arrives exactly; a JSON number
 * arrives through a double, which is the one thing `R5` forbids anywhere near
 * the ledger.
 */
export interface QtySent {
  readonly qty_display: string;
  readonly qty_display_unit: string;
}

export function qtySent(base: number, entry: CatalogEntry, factors: UnitFactors): QtySent | null {
  if (!Number.isInteger(base) || base <= 0) return null;
  const perPriceUnit = stepOf(entry.priceUnit, factors);
  if (perPriceUnit !== null && base % perPriceUnit === 0) {
    return {
      qty_display: formatDecimal(base / perPriceUnit, 0),
      qty_display_unit: entry.priceUnit,
    };
  }
  return { qty_display: formatDecimal(base, SCALE.quantity), qty_display_unit: entry.baseUnit };
}

/**
 * The unit price this line is sent at, per BASE unit, at scale 6 — or `null`
 * when this variant has no price today.
 *
 * ⚠️⚠️ THE DIRECTION FOLLOWS THE DOCUMENT (§2.5 rule 2): a SALE is anchored on
 * the gross and a PURCHASE on the net. `prices_include_tax` says which of those
 * the shopkeeper typed, so exactly one of the four combinations needs
 * converting on each side, and the other is the number itself.
 *
 * ⚠️ IT IS THE SHELF PRICE AND NOT A LOOKUP AT FLUSH TIME. `0016` refuses to
 * read `price_list` itself and says why: the customer agreed to the number the
 * till displayed, and a queued sale may flush days later, after a Monday price
 * change. So this figure is captured with the line and travels with it.
 */
export function quoted(
  perBase: string | null,
  kind: Kind,
  pricesIncludeTax: boolean,
  rate: number | null = null,
): number | null {
  if (perBase === null) return null;
  let typed: number;
  try {
    typed = parseDecimal(perBase, SCALE.unitPrice);
  } catch {
    return null;
  }
  // The typed figure IS the document's anchor on one side of each flag, and
  // needs converting on the other. See the header for why the rate is handed in.
  if (kind === 'sell' ? pricesIncludeTax : !pricesIncludeTax) return typed;
  if (rate === null) return null;
  return kind === 'sell' ? grossFromNet(typed, rate) : netFromGross(typed, rate);
}

/**
 * What a line costs, in centavos — the figure the sticky bar sums and the
 * sheet shows per line.
 *
 * ⚠️ IT IS `lineAnchorCentavos`, WHICH IS §2.5 RULE 3'S ANCHOR AND NOT A
 * SECOND ARITHMETIC. `priceCentavos` in `@/api/catalog` and `valueOf` in
 * `@/offline/deadLetters` both price through it too, which is what makes the
 * catalog's label, the basket's total and the dead-letter banner's peso figure
 * three readings of one rule rather than three opinions.
 * ⚠️ THE TAX SPLIT IS NOT DONE HERE and must not be: `tax_rate` is read from
 * the variant at write time and snapshotted onto the line (`0016`), *"a till
 * that could send its own rate is a till that can understate IVA"*.
 */
export function lineCentavos(quotedPerBase: number, base: number): number | null {
  try {
    return lineAnchorCentavos(quotedPerBase, base);
  } catch {
    return null;
  }
}

/**
 * What the whole basket costs, and **whether every line in it could be priced**.
 *
 * ⚠️⚠️ AN UNPRICED LINE IS NOT A ZERO, AND THE TOTAL SAYS SO RATHER THAN
 * ABSORBING IT. C3.12 — *no memory renders as a DASH, never as `$0.00`* — is
 * about one row; this is the same fact about the sum, and it is what lets
 * `5g` block a purchase commit (C3.13) while `5h` allows a sale to go through
 * loudly (C3.14) **out of one number rather than two rules**. A total that
 * quietly counted a priceless line as nothing would make those two screens
 * disagree about the same basket.
 *
 * ⚠️ THE SUM IS OVER ROUNDED LINES, NEVER A ROUNDING OF THE SUM — §2.5 rule 5,
 * *"the displayed lines fail to sum to the displayed total on the review
 * screen, which is the one screen where a customer is checking the arithmetic
 * by hand."*
 */
export interface Basket {
  /** Centavos over the lines that could be priced. */
  readonly centavos: number;
  /** How many lines are in the basket at all. */
  readonly lines: number;
  /** True when every line carried a price. */
  readonly complete: boolean;
}

export const EMPTY_BASKET: Basket = { centavos: 0, lines: 0, complete: true };

/**
 * `product_variant.tax_rate` at scale 4, keyed by variant id — **empty while
 * `prices_include_tax` is true, which is every shop today.** See the header:
 * the catalog read does not carry a rate and must not, so the one branch that
 * needs one is handed it rather than guessing.
 */
export type TaxRates = Readonly<Record<string, number>>;

export const NO_TAX_RATES: TaxRates = {};

/**
 * A per-base figure, as Postgres spells one, keyed by variant id — what this
 * document is quoted from when it is NOT the shelf price.
 *
 * ⚠️⚠️ IT IS HOW A PURCHASE IS PRICED AT ALL, AND THE DEFAULT IS THE REASON.
 * `quoteFor` below falls back to the catalog price **on a sale only**: §2.8 is
 * explicit that a supplier price is *"a fact about a relationship, not about a
 * product"*, and C3.11 prefills Comprar from the last price paid TO THAT
 * PROVIDER. A purchase that quietly took the shelf price would record a
 * delivery at retail — plausible, syntactically perfect, and wrong in the
 * margin for ever. So the buy side is priceless until `5g` hands a figure in.
 * ⚠️ It is also where C3.15's counter price change will arrive (`5f-iv`), which
 * is why it is a map rather than a flag — but nothing builds one yet.
 */
export type Quotes = Readonly<Record<string, string>>;

export const NO_QUOTES: Quotes = {};

export function quoteFor(entry: CatalogEntry, kind: Kind, quotes: Quotes): string | null {
  const given = quotes[entry.id];
  if (typeof given === 'string') return given;
  return kind === 'sell' ? entry.perBase : null;
}

export function basketOf(
  cart: Cart,
  entries: readonly CatalogEntry[],
  kind: Kind,
  pricesIncludeTax: boolean,
  rates: TaxRates = NO_TAX_RATES,
  quotes: Quotes = NO_QUOTES,
): Basket {
  let centavos = 0;
  let complete = true;
  for (const line of cart) {
    const entry = entries.find((e) => e.id === line.variantId);
    const price =
      entry === undefined
        ? null
        : quoted(
            quoteFor(entry, kind, quotes),
            kind,
            pricesIncludeTax,
            rates[line.variantId] ?? null,
          );
    const value = price === null ? null : lineCentavos(price, line.base);
    if (value === null) {
      complete = false;
      continue;
    }
    centavos += value;
  }
  return { centavos, lines: cart.length, complete };
}

/**
 * One line of `p_lines`, as `0016` and `0018` spell it — or `null` when this
 * line cannot be sent at all.
 *
 * ⚠️ THE TWO FUNCTIONS TAKE DIFFERENT PRICE KEYS AND THAT IS NOT COSMETIC:
 * `record_sale` wants `unit_price_gross_per_base` and `record_purchase` wants
 * `unit_price_net_per_base`, because each names the figure its own document is
 * anchored on. Sending the other key leaves the RPC with no price at all.
 */
export const PRICE_KEY = {
  sell: 'unit_price_gross_per_base',
  buy: 'unit_price_net_per_base',
} as const satisfies Readonly<Record<Kind, string>>;

/** The write kind each document is queued under. `@/api/outbox` owns the list. */
export const WRITE_KIND: Readonly<Record<Kind, WriteKind>> = {
  sell: 'sale',
  buy: 'purchase',
};

export function lineSent(
  line: CartLine,
  entry: CatalogEntry,
  factors: UnitFactors,
  kind: Kind,
  pricesIncludeTax: boolean,
  rate: number | null = null,
  quotes: Quotes = NO_QUOTES,
): Readonly<Record<string, unknown>> | null {
  const qty = qtySent(line.base, entry, factors);
  const price = quoted(quoteFor(entry, kind, quotes), kind, pricesIncludeTax, rate);
  if (qty === null || price === null) return null;
  return {
    variant_id: line.variantId,
    qty_display: qty.qty_display,
    qty_display_unit: qty.qty_display_unit,
    [PRICE_KEY[kind]]: formatDecimal(price, SCALE.unitPrice),
  };
}

/** Why a basket could not be committed. Never shown to anybody — see `draftOf`. */
export type DraftRefusal =
  | 'empty-cart'
  | 'no-location'
  | 'line-cannot-be-priced'
  | 'variant-not-in-catalog';

export type Drafted =
  | { readonly ok: true; readonly draft: WriteDraft }
  | { readonly ok: false; readonly why: DraftRefusal };

/**
 * The basket as something `queueWrite` will accept.
 *
 * ⚠️⚠️ IT RETURNS A DRAFT AND ENQUEUES NOTHING. The slide is `5f-iii`'s, and it
 * is the caller that must ring `queued()` from `@/lib/connectivityMonitor`
 * after `queueWrite` — a rule that has no home in this module because nothing
 * here knows a gesture happened.
 *
 * ⚠️ EVERY REFUSAL IS A PROGRAMMING ERROR AND NONE IS A SHOPKEEPER'S PROBLEM,
 * which is `queueWrite`'s own argument one module over: a commit control that
 * is drawn on an empty basket, a shop with no location resolved, a line for a
 * variant that is not in the catalog this basket was priced against. They are
 * returned rather than thrown so the screen has somewhere to put them other
 * than a crash on the till, and none has a Spanish sentence because none may
 * reach a screen (`R4`).
 *
 * ⚠️ `occurred_at` IS DELIBERATELY ABSENT. `@/api/flush` sends the queue row's
 * own `queuedAt` whenever the payload carries none, and it says why: an offline
 * write that arrives with a null `occurred_at` is stamped with the moment of
 * the FLUSH, so a sale rung up at 09:00 and drained at 14:00 would count on the
 * wrong day. One answer to *when did this happen*, and it is the queue's.
 */
export function draftOf(
  cart: Cart,
  entries: readonly CatalogEntry[],
  factors: UnitFactors,
  kind: Kind,
  pricesIncludeTax: boolean,
  workspaceId: string,
  locationId: string | null,
  rates: TaxRates = NO_TAX_RATES,
  quotes: Quotes = NO_QUOTES,
): Drafted {
  if (cart.length === 0) return { ok: false, why: 'empty-cart' };
  if (locationId === null || locationId === '') return { ok: false, why: 'no-location' };
  const lines: Readonly<Record<string, unknown>>[] = [];
  for (const line of cart) {
    const entry = entries.find((e) => e.id === line.variantId);
    if (entry === undefined) return { ok: false, why: 'variant-not-in-catalog' };
    const sent = lineSent(
      line,
      entry,
      factors,
      kind,
      pricesIncludeTax,
      rates[line.variantId] ?? null,
      quotes,
    );
    if (sent === null) return { ok: false, why: 'line-cannot-be-priced' };
    lines.push(sent);
  }
  return {
    ok: true,
    draft: {
      workspaceId,
      kind: WRITE_KIND[kind],
      payload: { location_id: locationId, lines },
    },
  };
}
