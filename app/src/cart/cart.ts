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
//   * IT DOES NOT PREFILL A PURCHASE, AND IT REFUSES TO RATHER THAN FALLING
//     BACK. C3.11 prefills Comprar from the last price paid TO THAT PROVIDER;
//     `@/api/providers` performs that read and `5g-i` built it. The shelf price
//     is right there and taking it would record a delivery at retail — so
//     `quoteFor` still hands the buy side `null` when no quote is supplied, and
//     the line is plainly unpriced instead of plausibly wrong.
//   * ⚠️⚠️ AND WHAT IT DOES TO A SUPPLIED PURCHASE QUOTE CHANGED ON 2026-09-24:
//     it sends it VERBATIM. `quoted` had read `prices_include_tax` on both sides
//     and §2.5 rule 2 scopes that flag to the SALE — see `quoted`.
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
  parseDecimal,
  type Kind,
} from '@tienda/money';

import type { CatalogEntry, UnitFactors } from '@/api/catalog';
import type { WriteDraft, WriteKind } from '@/api/outbox';
import { WASTE_REASON_KEY, type WasteReason } from '@/api/waste';

// ----------------------------------------------------------------------------
// ⚠️⚠️ THREE DOCUMENTS, TWO MONEY SHAPES — AND `Scope` IS WHAT KEEPS THEM APART
// ----------------------------------------------------------------------------
// Added by `6a-i`. `@tienda/money`'s `Kind` is `'sell' | 'buy'` and it is a
// claim about ARITHMETIC: which side of the IVA split a figure is anchored on
// (§2.5 rule 2). **Desperdicio is a third document and not a third arithmetic**
// — `0019`'s header is explicit that waste follows the SALE shape, gross-first,
// *"because a retail value is a shelf price"* — so widening `Kind` would put a
// third member on a type whose whole job is to name two directions of tax, in a
// published package with its own `cases.json`.
//
// ⚠️ SO THERE ARE TWO TYPES AND `MONEY_KIND` IS THE ONE-WAY DOOR BETWEEN THEM.
// `Scope` names WHICH BASKET and WHICH RPC; `Kind` names HOW THE MONEY WORKS.
// Everything in this file that touches a peso still takes a `Kind`.
//
// ⚠️⚠️ AND `Scope` IS A SUPERSET OF `Kind` AS A STRING UNION, WHICH IS WHY NO
// EXISTING CALL SITE CHANGED. `reviewOf(cart, entries, 'sell', …)` type-checks
// against a `Scope` exactly as it did against a `Kind`, so Vender's and
// Comprar's 1,400 and 2,000 lines are untouched by this — a property worth
// naming, because the alternative was a rename across two screens nobody has a
// check for (`R9`, §2.11).

/** `unit.factor_to_base` is `numeric(14,6)`. Spelled here as in `@/api/catalog`. */
const FACTOR_SCALE = 6;

/** 10^3 — a factor at scale 6 becomes a QUANTITY at scale 3. */
const FACTOR_TO_QUANTITY = 10 ** (FACTOR_SCALE - SCALE.quantity);

/**
 * Which of the three capture screens a basket belongs to — see the block above
 * for why this is not `Kind` and why `Kind` was not widened.
 *
 * ⚠️ THE ORDER IS THE TAB BAR'S (§2.8, C12.1), which is the order a shopkeeper
 * meets them in and the order `WRITE_KIND` and `MONEY_KIND` are written in below.
 */
export const SCOPES = ['sell', 'buy', 'waste'] as const;
export type Scope = (typeof SCOPES)[number];

/**
 * How each document's money works, which is the ONLY thing `@tienda/money`
 * needs to know about it.
 *
 * ⚠️⚠️ `waste` IS `'sell'` AND THAT IS A RULING RATHER THAN A CONVENIENCE,
 * settled by the owner on 2026-08-26 and binding on `0019` by name: *"The tax
 * split: `record_sale` gross-first, `record_purchase` net-first, tax the
 * residual on both. `record_waste` follows the sale shape."* The figure on a
 * waste line is **what the shop failed to EARN** — a shelf price — and a shelf
 * price is agreed gross.
 *
 * ⚠️ WHICH ALSO SETTLES `prices_include_tax`: it scopes the sale side (§2.5
 * rule 2), so it scopes waste too, and a shop that answered *no* cannot price a
 * write-off any more than it can price a sale. That is `5f-i`'s trade inherited
 * rather than a new one — see `quoted`.
 */
export const MONEY_KIND: Readonly<Record<Scope, Kind>> = {
  sell: 'sell',
  buy: 'buy',
  waste: 'sell',
};

/**
 * What an unpriced WASTE line is sent at, and **this is the one decision in this
 * file that writes a number into the ledger nobody typed.**
 *
 * ⚠️⚠️ IT IS ZERO BECAUSE SILENCE IS NOT AVAILABLE — measured, not assumed.
 * `unit_price_gross_per_base` is REQUIRED by `0019`: omitting it answers **HTTP
 * 400 `22023` — "record_waste: line 1 — unit_price_gross_per_base is
 * required"**. So the three options are a zero, a guess, or no row at all.
 *
 * ⚠️⚠️ AND NO ROW AT ALL IS THE WORST OF THE THREE, WHICH IS WHY THIS IS THE
 * OPPOSITE OF WHAT VENDER AND COMPRAR DO. C3.13 blocks a purchase on a missing
 * price and C3.14 lets a sale through loudly — but **a sale not rung costs the
 * shop nothing, and a loss not recorded destroys the only record of it.** That
 * is `record_waste`'s own argument, owner-ruled on 2026-09-04 for the
 * availability check: *"the loss already happened, and refusing it discards the
 * only record of it."* This is the same argument about the price.
 *
 * ⚠️ AND IT COSTS THE REPORT NOTHING, WHICH IS WHY IT IS DEFENSIBLE RATHER THAN
 * MERELY CONVENIENT. Área 9's ruling of 2026-09-14 already fixed what
 * Desperdicio and Números may show: **waste as QUANTITY, never as cost and
 * never as a rate**, until something repairs `0011`. The quantity on this line
 * is exact. The peso figure it would have carried is one the screen is not
 * allowed to report anyway.
 *
 * ⚠️⚠️ WHAT IT IS **NOT**: it is not a price rendered as `$0.00`. C3.12 is
 * untouched — `reviewOf` still answers `centavos: null` for this line, the row
 * still reads a DASH and the basket still reports `complete: false`, so the
 * screen says `Sin precio` out loud (`R11`). **What is sent and what is shown
 * are deliberately different here**, and that asymmetry is the whole of this
 * decision: the shopkeeper is told, and the loss is still recorded.
 */
export const UNPRICED_WASTE = 0;

/**
 * One line of the basket. **A line exists because its quantity is greater than
 * zero** — C3.3, *"there is no add-to-basket step and no product-detail screen
 * between the list and the line"* — so this type has no `present` flag and no
 * zero-quantity state to represent.
 *
 * ⚠️⚠️ AND IT CARRIES NO REASON, WHICH IS `6a-i`'s LOUDEST DECISION. The
 * database puts `reason` on `waste_line`, so a document CAN mix causes —
 * measured: the same variant twice under `caducado` and `dañado` is **two rows,
 * HTTP 200**. §2.8 nevertheless calls Desperdicio *reason-first*, *"the column
 * the screen asks for BEFORE the product"*, and the shape that sentence
 * describes is **one cause per document, chosen before the catalog is even
 * shown** — which is exactly what `Comprando a:` is to Comprar.
 *
 * ⚠️ SO THE REASON LIVES ON THE STORE BESIDE `providerId` AND NOT ON THE LINE,
 * and two shapes of loss are two documents rather than one mixed one. **That is
 * also the honest shape at a bin**: a shopkeeper clearing expired stock is doing
 * one thing, and a screen that asked her to label each product separately would
 * be the book-keeping C3.18 refuses. ⚠️ **Reversing it is a `reason` on this
 * interface and a key on the line identity — no migration, because the schema
 * already allows both.**
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
 * the gross and a PURCHASE on the net. **`prices_include_tax` scopes the SALE
 * side only**, and the rule says so in its own words: *"`prices_include_tax` is
 * a workspace flag, so the earlier wording read as though it governed deliveries
 * too; it does not."*
 *
 * ⚠️⚠️ CORRECTED BY `5g-i` ON 2026-09-24, AND IT WAS A DISAGREEMENT WITH THE ADR
 * RATHER THAN A SLIP. This function read the flag on BOTH sides —
 * `kind === 'sell' ? pricesIncludeTax : !pricesIncludeTax` — which made a
 * purchase need a tax rate whenever the flag was true. **It is true by `0001`'s
 * default and true in every shop that exists**, so the buy side could never be
 * priced at all, and `5f-i` recorded that as *"the buy side is priceless until
 * `5g` hands a figure in"* when the figure was never the missing half.
 * ⚠️ `0018`'s own header settles it in one line, binding since 2026-08-26: *"a
 * shelf price is agreed gross and a supplier invoice is quoted net"*, and the
 * payload key it reads is `unit_price_net_per_base` — *the INVOICE net*. **So a
 * purchase quote is sent exactly as it arrived**: read back out of
 * `provider_price_memory`, which is a net column, or typed into a box whose
 * label says what it is. ⚠️ Converting it would have netted a net.
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
  // ⚠️⚠️ A PURCHASE IS ANCHORED ON THE INVOICE NET WHATEVER THE FLAG SAYS, AND
  // THE FLAG IS NOT ABOUT DELIVERIES AT ALL. See the header: corrected by
  // `5g-i` against ADR-035 §2.5 rule 2, which says so in its own parenthesis.
  if (kind === 'buy') return typed;
  // A SALE is anchored on the gross, and the flag says whether she typed one.
  if (pricesIncludeTax) return typed;
  if (rate === null) return null;
  return grossFromNet(typed, rate);
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

/**
 * A whole basket, ready to be put in the store in one `set()` — what `Corregir`
 * hands back after it has voided a document. Plan task `5h-ii-b`, widened by
 * `6a-ii-b`.
 *
 * ⚠️⚠️ IT IS AN OBJECT AND NOT FOUR ARGUMENTS, AND THE THIRD CART IS WHY.
 * `load` took `(scope, lines, quotes, providerId)` until `6a-ii-b`, and a
 * write-off has to carry its CAUSE as well — a fifth positional parameter, the
 * second of them nullable and the two adjacent. **`load(scope, lines, quotes,
 * null, reason)` and `load(scope, lines, quotes, reason, null)` both typecheck
 * the day `WasteReason` and a provider id are both strings**, and the symptom
 * is a delivery filed against no supplier rather than a compiler error. One
 * object has no order.
 *
 * ⚠️ IT LIVES HERE AND NOT IN `@/api/corrections` SO THE STORE CAN NAME IT.
 * `@/cart/store` may not import the data layer — the dependency runs the other
 * way, and `corrections.ts` already reads `CartLine` and `Quotes` off this file.
 * `Prefill` is this plus what the correction DROPPED.
 */
export interface Loaded {
  /** ⚠️ WHICH CART, and that is `Scope` and never `@tienda/money`'s `Kind` —
   *  `MONEY_KIND` above is the difference, and it is not a renaming. */
  readonly scope: Scope;
  readonly lines: Cart;
  readonly quotes: Quotes;
  /** ⚠️ `null` OFF THE BUY SIDE, and the store writes it on the buy side ONLY. */
  readonly providerId: string | null;
  /**
   * ⚠️ `null` OFF THE WASTE SIDE — **and on a write-off whose lines disagree**,
   * which is a document a cart cannot represent: one basket holds one cause.
   * The store writes it on the waste side only, which is `providerId`'s rule a
   * second time and for the same reason: a corrected DELIVERY must not blank
   * the cause standing over a half-keyed bin round.
   */
  readonly reason: WasteReason | null;
}

export function quoteFor(entry: CatalogEntry, kind: Kind, quotes: Quotes): string | null {
  const given = quotes[entry.id];
  if (typeof given === 'string') return given;
  return kind === 'sell' ? entry.perBase : null;
}

/**
 * One row of the basket sheet — what the review screen draws, and the figure
 * the total is the sum of.
 *
 * ⚠️ `centavos` IS `null` FOR A LINE THAT COULD NOT BE PRICED, never a zero.
 * C3.12's dash is about one row and `Basket.complete` is the same fact about
 * the sum; this is the pair of them said once, so a sheet cannot render a
 * priceless line as free while the bar beside it says a price is missing.
 */
export interface ReviewRow {
  readonly variantId: string;
  /** The variant's name — or `null` when the catalog no longer has it. */
  readonly name: string | null;
  /** Its family, `''` when the variant is loose. `null` with the name. */
  readonly familyName: string | null;
  /** Base units at scale 3, straight off the line. */
  readonly base: number;
  /** What this line costs, or `null`. */
  readonly centavos: number | null;
}

/** The sheet's rows and the bar's total, out of one pass over one basket. */
export interface Review {
  readonly rows: readonly ReviewRow[];
  readonly basket: Basket;
}

/**
 * The basket, as the review screen shows it AND as the sticky bar sums it.
 *
 * ⚠️⚠️ ONE FUNCTION RETURNS BOTH, AND §2.5 RULE 5 IS THE WHOLE REASON —
 * *"the displayed lines fail to sum to the displayed total on the review
 * screen, which is the one screen where a customer is checking the arithmetic
 * by hand."* `basketOf` returned a total and a COUNT of lines and never the
 * lines themselves, so the sheet had nothing to draw a row from and the
 * obvious move was for it to price its own. **That is two arithmetics over one
 * basket**: they agree for every shop today, because `prices_include_tax` is
 * true and no rate is ever handed in, and they part by a centavo the first time
 * one is. ⚠️ **The total here is the sum of the very numbers the rows carry**,
 * so the identity is structural and `app/test/cart.test.ts` reads it rather
 * than a reviewer hoping for it.
 *
 * ⚠️⚠️ A LINE WHOSE VARIANT HAS LEFT THE CATALOG IS A ROW AND NOT A GAP, and
 * that is the one judgement in this function. `draftOf` refuses the WHOLE
 * basket on `variant-not-in-catalog`, and a retired product does leave the
 * catalog under a basket that is already open — a manager on another phone,
 * mid-sale. ⚠️ **The sheet is then the only surface that can remove it**: the
 * list behind it is the catalog, and the catalog no longer has the row. A sheet
 * that hid what it could not name would leave a shopkeeper with a commit that
 * refuses and nothing on screen to act on, which is `C3.18`'s users handed a
 * piece of book-keeping. So the row appears, unnamed and unpriced, with the
 * `Quitar` every other row has.
 */
export function reviewOf(
  cart: Cart,
  entries: readonly CatalogEntry[],
  scope: Scope,
  pricesIncludeTax: boolean,
  rates: TaxRates = NO_TAX_RATES,
  quotes: Quotes = NO_QUOTES,
): Review {
  const kind = MONEY_KIND[scope];
  const rows: ReviewRow[] = [];
  let centavos = 0;
  let complete = true;
  for (const line of cart) {
    const entry = entries.find((e) => e.id === line.variantId);
    // ⚠️⚠️ A WASTE LINE WITH NO SHELF PRICE IS `null` HERE AND A ZERO AT THE
    // WIRE — see `UNPRICED_WASTE`. This function reports what is KNOWN, so the
    // row keeps C3.12's dash and the basket reports `complete: false`;
    // `lineSent` is where the zero is decided. **Substituting the zero here
    // instead would make the screen tell a shopkeeper the thing she threw away
    // was worth nothing**, which is the one outcome área 9 named as worse than
    // a missing number.
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
    rows.push({
      variantId: line.variantId,
      name: entry === undefined ? null : entry.name,
      familyName: entry === undefined ? null : entry.familyName,
      base: line.base,
      centavos: value,
    });
    if (value === null) {
      complete = false;
      continue;
    }
    centavos += value;
  }
  return { rows, basket: { centavos, lines: cart.length, complete } };
}

/**
 * What the whole basket costs. ⚠️ **It is `reviewOf`'s total and not a second
 * pass** — see that function for why the two may never be written twice.
 */
export function basketOf(
  cart: Cart,
  entries: readonly CatalogEntry[],
  scope: Scope,
  pricesIncludeTax: boolean,
  rates: TaxRates = NO_TAX_RATES,
  quotes: Quotes = NO_QUOTES,
): Basket {
  return reviewOf(cart, entries, scope, pricesIncludeTax, rates, quotes).basket;
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

/**
 * The write kind each document is queued under. `@/api/outbox` owns the list.
 *
 * ⚠️ `waste` ADDED BY `6a-i`, AND NOTHING IN THE QUEUE NEEDED WIDENING FOR IT:
 * `WRITE_KINDS` has held all four since `5c-i`, and `RECORD_RPC` has named
 * `record_waste` since `5c-ii-a`. **This map is the last link that was
 * missing**, which is why a write-off reaches Postgres through the same drain,
 * the same dead-letter classification and the same idempotency as a sale.
 *
 * ⚠️ IT IS NOW OVER `Scope` AND `@/api/corrections`' `CART_KIND` IS **NOT** ITS
 * FULL INVERSE ANY MORE — it is the inverse restricted to `DocumentKind`, which
 * is `'purchase' | 'sale'` because `Lo último` cannot show a waste yet (`6a-ii`).
 * `app/test/api-corrections.test.ts` asserts that correspondence and it now
 * asserts it **one way**, with the third entry named. See that test.
 */
export const WRITE_KIND: Readonly<Record<Scope, WriteKind>> = {
  sell: 'sale',
  buy: 'purchase',
  waste: 'waste',
};

export function lineSent(
  line: CartLine,
  entry: CatalogEntry,
  factors: UnitFactors,
  scope: Scope,
  pricesIncludeTax: boolean,
  rate: number | null = null,
  quotes: Quotes = NO_QUOTES,
  reason: WasteReason | null = null,
): Readonly<Record<string, unknown>> | null {
  const kind = MONEY_KIND[scope];
  const qty = qtySent(line.base, entry, factors);
  if (qty === null) return null;
  const known = quoted(quoteFor(entry, kind, quotes), kind, pricesIncludeTax, rate);
  // ⚠️⚠️ THE ONLY PLACE A PRICE IS INVENTED IN THIS APP, AND IT IS FENCED TO
  // WASTE BY THE LINE ABOVE IT. See `UNPRICED_WASTE` for the whole argument:
  // `0019` requires the key, a loss not recorded is worse than a loss valued at
  // nothing, and área 9 has already ruled that Desperdicio reports quantity.
  const price = known === null && scope === 'waste' ? UNPRICED_WASTE : known;
  if (price === null) return null;
  return {
    variant_id: line.variantId,
    qty_display: qty.qty_display,
    qty_display_unit: qty.qty_display_unit,
    [PRICE_KEY[kind]]: formatDecimal(price, SCALE.unitPrice),
    // ⚠️ THE CAUSE RIDES ON THE LINE BECAUSE `waste_line` IS WHERE THE COLUMN IS
    // (`0003:451`), even though the SCREEN asks it once per document — see
    // `CartLine`. `0019` reads `(e.l->>'reason')::public.waste_reason` per line
    // and has no document-level argument for it, so one answer is written onto
    // every line here rather than sent once.
    ...(scope === 'waste' && reason !== null ? { [WASTE_REASON_KEY]: reason } : {}),
  };
}

/** Why a basket could not be committed. Never shown to anybody — see `draftOf`. */
export type DraftRefusal =
  | 'empty-cart'
  | 'no-location'
  | 'no-provider'
  /**
   * ⚠️ `6a-i`, AND IT IS `no-provider`'s MIRROR ON THE THIRD SCREEN. `0019`
   * refuses a line with no cause as `22023`; refused here it is a slide that was
   * never drawn, which is `canCommit`'s whole argument in `@/cart/commit`.
   */
  | 'no-reason'
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
 * ⚠️⚠️ A PURCHASE CARRIES A COUNTERPARTY AND A SALE DOES NOT, WHICH IS WHY THE
 * PAYLOAD FORKS ON `kind` RATHER THAN CARRYING A NULLABLE KEY EITHER WAY. Added
 * by `5g-i`: `record_purchase` raises `22023` — *"a delivery has a counterparty,
 * and the generic provider is a real row"* — on a null `p_provider_id`
 * (`0018:200`), and `@/api/flush` builds its arguments as `p_` plus the
 * payload's own keys, so a `provider_id` the sale side did not need would reach
 * `record_sale` as an argument it does not take. **The fork is what keeps one
 * draft function honest about two documents.**
 *
 * ⚠️ AND `no-provider` IS REFUSED HERE RATHER THAN SENT AND REFUSED THERE. A
 * delivery that reaches Postgres without one comes back as a dead letter with a
 * SQLSTATE on it; refused here it is a control that was never drawn, which is
 * `canCommit`'s whole argument in `@/cart/commit`.
 *
 * ⚠️ EVERY REFUSAL IS A PROGRAMMING ERROR AND NONE IS A SHOPKEEPER'S PROBLEM,
 * which is `queueWrite`'s own argument one module over: a commit control that
 * is drawn on an empty basket, a shop with no location resolved, a delivery with
 * nobody to have come from, a line for a variant that is not in the catalog this
 * basket was priced against. They are returned rather than thrown so the screen
 * has somewhere to put them other than a crash on the till, and none has a
 * Spanish sentence because none may reach a screen (`R4`).
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
  scope: Scope,
  pricesIncludeTax: boolean,
  workspaceId: string,
  locationId: string | null,
  rates: TaxRates = NO_TAX_RATES,
  quotes: Quotes = NO_QUOTES,
  providerId: string | null = null,
  reason: WasteReason | null = null,
): Drafted {
  if (cart.length === 0) return { ok: false, why: 'empty-cart' };
  if (locationId === null || locationId === '') return { ok: false, why: 'no-location' };
  if (scope === 'buy' && (providerId === null || providerId === ''))
    return { ok: false, why: 'no-provider' };
  // ⚠️ REASON-FIRST, ENFORCED WHERE THE SUITE READS IT (§2.8, `0019`). The
  // picker has no way past it either, and this is the brace to that belt.
  if (scope === 'waste' && reason === null) return { ok: false, why: 'no-reason' };
  const lines: Readonly<Record<string, unknown>>[] = [];
  for (const line of cart) {
    const entry = entries.find((e) => e.id === line.variantId);
    if (entry === undefined) return { ok: false, why: 'variant-not-in-catalog' };
    const sent = lineSent(
      line,
      entry,
      factors,
      scope,
      pricesIncludeTax,
      rates[line.variantId] ?? null,
      quotes,
      reason,
    );
    if (sent === null) return { ok: false, why: 'line-cannot-be-priced' };
    lines.push(sent);
  }
  return {
    ok: true,
    draft: {
      workspaceId,
      kind: WRITE_KIND[scope],
      // ⚠️ WASTE TAKES THE SALE'S PAYLOAD — `location_id` and `lines`, no
      // counterparty. Measured against a real PostgREST rather than read off
      // `0019`: `record_waste` has no `p_provider_id`, and `@/api/flush` builds
      // its arguments as `p_` plus the payload's own keys, so a `provider_id`
      // here would reach the RPC as an argument it does not take.
      payload:
        scope === 'buy'
          ? { location_id: locationId, provider_id: providerId, lines }
          : { location_id: locationId, lines },
    },
  };
}
