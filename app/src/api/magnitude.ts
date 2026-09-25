// ============================================================================
// WHAT THIS SHOP USUALLY BUYS, SO A TYPED NUMBER CAN BE CHECKED AGAINST IT.
// Plan task `5f.5`, and the twenty-second module of `src/api/` — §2.11's
// boundary, `R12`, `R13`.
//
// ⚠️ NO SCREEN AND NO COMPONENT — the `5d-i`, `5e-i`, `5d-iv-a`, `5f-i`, `5g-i`
// and `5g-iii` shape, for the reason all six gave: everything decided here has
// a right answer `app/test/api-magnitude.test.ts` can read. The screens own the
// amber and nothing else.
//
// ----------------------------------------------------------------------------
// ⚠️⚠️ WHAT ADR-035 §2.8 ACTUALLY ASKS FOR, QUOTED, BECAUSE IT IS THE THIRD OF
// THREE GUARDS AND WAS THE ONE NO ROW IN THE PLAN HELD
// ----------------------------------------------------------------------------
// *"In open mode with prefilled prices, a cashier meaning 1.5 kg who types 15
// produces a transaction that is syntactically perfect, prices plausibly, and
// silently corrupts stock, margin and waste analytics. Three guards, none
// blocking: … **Magnitude warning** — flag any quantity or unit price beyond
// ~3× the trailing median for that product. Seeded from *purchase* history
// rather than sales, so it works from day one."*
//
// The other two shipped: unit-aware input is `Cantidad` (`5f-ii`, `5g-ii`) and
// review-before-commit is the sheet and the slide (`5f-iii`). This is the third.
//
// ⚠️⚠️ IT IS A WARNING AND NEVER A BLOCK, and §2.8 says so in the same breath as
// what it refuses next: *"Deliberately excluded: confirmation dialogs on every
// entry. Dismissed reflexively within a day, then provide only the appearance of
// a check."* C3.9 is the sharper half — *precision is the shop's, not ours* — so
// 2 kg on a scale reading 2.050 is CORRECT behaviour and nothing here may
// reconcile it. **Every rule below that chooses silence over a sentence is that
// paragraph being obeyed rather than a gap.**
//
// ----------------------------------------------------------------------------
// ⚠️⚠️ THE READ IS SHOP-WIDE AND FIRES ONCE — IT IS **NOT** `costsKey`'s SHAPE,
// AND THAT IS THE WHOLE FINDING OF THIS ROW'S SIZING
// ----------------------------------------------------------------------------
// `@/api/costs` keys per VARIANT because `Costos` is a per-product screen: you
// tap one product and read its history. This guard fires while a BASKET is being
// keyed, and a basket is many products — so the same shape would be one round
// trip per line added, on the screen where a thumb is moving fastest and (the
// pilot store being what it is, [[pilot-store-is-offline-a-lot]]) the signal is
// worst. **`MAGNITUDE_KEY` takes no argument.** One read, cached like the
// catalog's, and the typical figure for every product the shop buys comes out of
// it at once.
//
// ⚠️ WHAT THAT COSTS IS A BOUND, AND IT IS STATED RATHER THAN HIDDEN:
// `MAGNITUDE_LIMIT` rows, newest document first. *Trailing* therefore means
// **within this shop's most recent `MAGNITUDE_LIMIT` purchase lines**, not
// *ever*. See that constant for the arithmetic behind the number.
//
// ----------------------------------------------------------------------------
// ⚠️⚠️ THE PRICE HALF IS COMPRAR'S ALONE, AND THAT IS NOT A SCOPE CUT
// ----------------------------------------------------------------------------
// §2.8 names *"any quantity or unit price"*. **Vender has no typed price**:
// `quoteFor` (`@/cart/cart`) falls back to `entry.perBase` on a sale, so the
// figure comes off the catalog and there is no keystroke to get wrong. Worse,
// comparing a SHELF price against a purchase COST median would flag every
// product in the shop — by exactly the margin — which is the furniture §2.8
// refuses, arrived at by being thorough.
//
// ⚠️ C3.15's counter price change (`5f-iv`) is what would give Vender a typed
// price, and nothing builds one yet. **`outsized` takes a `perBase` of `null`
// and answers on quantity alone**, so the day that row lands the guard needs one
// argument passed and no new rule.
//
// ----------------------------------------------------------------------------
// ⚠️⚠️ `0040` IS WHAT MAKES THIS GUARD REACH THE PERSON IT IS WRITTEN FOR, AND
// IT LANDED HOURS BEFORE THIS FILE
// ----------------------------------------------------------------------------
// §2.8's paragraph is about **a cashier**. Until 2026-09-25 `purchase_line_select`
// carried `has_role(…, 'manager')` (`0003:564`), so an Empleada's read was
// **200 and an empty array** — never a 403 — every median would have been absent,
// every call to `outsized` would have answered `none`, and the guard would have
// been silently dead for the only role the ADR names. **Nothing would have gone
// red.** `0040` dropped the role gate on both purchase policies and kept the
// location wall, on the decision maker's instruction; that is why there is no
// `canRead…` predicate in this file, and `docs/checks/5f.5-magnitude-contract.sh`
// asserts the Empleada read rather than trusting this comment.
//
// ----------------------------------------------------------------------------
// ⚠️ EVERY FIGURE IS AN INTEGER AND EVERY WIRE FIELD IS CAST — `R5`
// ----------------------------------------------------------------------------
// `qty_base::text` and `unit_price_net_per_base::text`. A bare `numeric` arrives
// as a JSON number, which is a double; `parseDecimal` refuses a number argument
// outright. ⚠️ **The quantity cast is this module's own new claim about the
// wire** — `@/api/costs` measured `qty_display` coming back as `2.000` and then
// simply did not ask for it, so nothing in this app had yet read a quantity off
// `purchase_line`. The contract check is what settles it.
// ============================================================================

import { SCALE, divRoundHalfUpAwayFromZero, parseDecimal } from '@tienda/money';

import { ES } from '@/strings';

/** The table the history comes off. Spelled once (`R13`). */
export const MAGNITUDE_TABLE = 'purchase_line';

/**
 * The columns the guard needs, and nothing else (C8.8, `R13`).
 *
 * ⚠️ `qty_base` AND NOT `qty_display`. The cart holds `line.base` — base units
 * at scale 3 — and a median has to be in the denomination it is compared
 * against. `qty_display` is what somebody TYPED, in whatever unit they typed it
 * in, so a shop that bought a case last month and kilos this week would have its
 * median taken over two different things.
 *
 * ⚠️ `purchase!inner(…)` FOR `COSTS_COLUMNS`' REASON — a line whose document is
 * unreadable has no order and no void status, which is not a sample.
 *
 * ⚠️⚠️ `occurred_at` IS SELECTED AND **NOTHING READS IT**, WHICH LOOKS LIKE DEAD
 * WEIGHT AND IS THE OPPOSITE. This module was written without it — the guard
 * needs the id and the reversal link and genuinely nothing else off the document
 * — and `docs/checks/5f.5-magnitude-contract.sh` answered **400,
 * `42703: column purchase_line_purchase_1.occurred_at does not exist`** on the
 * first run. ⚠️ **PostgREST will only order a PARENT by an embedded column that
 * is in the embed's select list.** `COSTS_COLUMNS` never met this because it
 * renders the date; this read does not, so it is the first in the app to order
 * by a column it does not want. ⚠️⚠️ **Nothing in TypeScript, in Vitest or in
 * `MagnitudeRow` can see that rule** — the column is absent from the interface on
 * purpose, because no code may start depending on a field that is here to satisfy
 * the planner. **Removing it is a 400 on both capture screens.**
 *
 * ⚠️ NO `provider_id`: this guard is about what a product usually weighs and
 * usually costs, and a supplier price is `@/api/providers`' question.
 */
export const MAGNITUDE_COLUMNS =
  'variant_id,qty_base::text,unit_price_net_per_base::text,purchase!inner(id,occurred_at,reversal_of)';

/**
 * The order the database applies — newest document first.
 *
 * ⚠️⚠️ THE COLUMN-EXPRESSION SPELLING AND NEVER `{ referencedTable }`, which is
 * the trap `COSTS_ORDER` documents in full and measured against a real
 * PostgREST: the option form sets `purchase.order`, sorts the embedded row
 * *inside* each parent, and on a to-one embed is a silent no-op. **Here it
 * would be worse than a wrong chart** — the order is what `MAGNITUDE_LIMIT`
 * slices, so an unordered read would take an arbitrary `MAGNITUDE_LIMIT` lines
 * out of the shop's whole history and call them *trailing*.
 */
export const MAGNITUDE_ORDER = 'purchase(occurred_at)';

/** Descending. Its own constant so the contract check can compose the wire
 *  spelling out of the same two values the app sends. */
export const MAGNITUDE_ORDER_ASCENDING = false;

/**
 * How many purchase lines *trailing* means.
 *
 * ⚠️⚠️ IT IS A BOUND ON A PHONE AND NOT A STATISTICAL WINDOW, and the arithmetic
 * is worth writing down because the number is otherwise a taste. C8.2 has the
 * owner seeding the pilot catalog deliberately short; a shop buying two or three
 * deliveries a week at ten lines each lays down roughly 120 lines a month, so
 * **400 is about a quarter of trading** and every product bought monthly carries
 * three or four samples in it. The payload is four small fields a row.
 *
 * ⚠️ A PRODUCT THAT FALLS OUT OF THE WINDOW GETS NO WARNING AT ALL, which is the
 * right failure. See `MAGNITUDE_SAMPLES`.
 *
 * ⚠️⚠️ AND ADR-035 §7 LISTS *"magnitude thresholds"* UNDER **Reversible**, BY
 * NAME — this constant, `MAGNITUDE_MULTIPLE` and `MAGNITUDE_SAMPLES` are all
 * one-line edits with no migration behind them. That is why this row took them
 * rather than parking three questions.
 */
export const MAGNITUDE_LIMIT = 400;

/**
 * §2.8's *~3×*. An integer, so the comparison is a multiplication and never a
 * division (`R5`: nothing in this path makes a float).
 */
export const MAGNITUDE_MULTIPLE = 3;

/**
 * How many standing deliveries a product needs before the guard will speak.
 *
 * ⚠️⚠️ THREE, AND THE REASON IS THAT A MEDIAN OF TWO IS NOT A MEDIAN. With one
 * sample the *median* is that delivery, so the second time a shop ever buys a
 * product a perfectly ordinary order flags. With two it is their mean — which is
 * not robust, and robustness is the entire reason §2.8 says median rather than
 * average. **Three is the smallest count at which the middle value is a real
 * middle value and one freak delivery cannot be it.**
 *
 * ⚠️ WHAT IT COSTS IS THE HONEST HALF OF *"works from day one"*: in week one
 * most products have fewer than three deliveries and this guard says nothing
 * about them. ADR-035's own *Weakest points* names that — *"Purchase-history
 * seeding makes them functional from day one, but weakly. The pilot is when
 * errors are most likely and the guard is thinnest."* **Silence is what this
 * file chooses there**, because the alternative is an amber that fires on
 * ordinary deliveries in the one week a shopkeeper is deciding whether to
 * believe this app at all — which is §2.8's own confirmation-dialog argument,
 * relocated.
 */
export const MAGNITUDE_SAMPLES = 3;

/**
 * The query key the shop's typical figures cache under.
 *
 * ⚠️⚠️ IT TAKES NO ARGUMENT, AND THAT IS THE DIFFERENCE FROM `costsKey` AND
 * `memoryKey` RATHER THAN AN OMISSION — see this file's header. Those two put an
 * id in the key because serving one product's or one provider's answer under
 * another's would be a lie that looks like a fact. There is no such id here:
 * this read is *everything this shop has bought lately*, and the row a caller
 * wants is picked out of the map it returns.
 */
export const MAGNITUDE_KEY = ['magnitude', 'typical'] as const;

/** The document a line belongs to, as PostgREST embeds it under `MAGNITUDE_COLUMNS`. */
export interface MagnitudeDocumentRow {
  readonly id: string;
  /** Set when this document VOIDS another one. */
  readonly reversal_of: string | null;
  // ⚠️⚠️ `occurred_at` IS ON THE WIRE AND DELIBERATELY NOT HERE. It is selected
  // only because PostgREST refuses to order a parent by an embedded column that
  // is not in the embed's select list — see `MAGNITUDE_COLUMNS`. Typing it would
  // invite a reader to use it, and this guard has no business knowing WHEN a
  // delivery happened: the order is the database's and the median is over
  // whatever the order and the limit hand back.
}

/** A `purchase_line` row as PostgREST sends it, under `MAGNITUDE_COLUMNS`. */
export interface MagnitudeRow {
  readonly variant_id: string;
  /** Base units, a decimal string at scale 3. See `MAGNITUDE_COLUMNS`. */
  readonly qty_base: string;
  /** Net, per BASE unit, a decimal string at scale 6. */
  readonly unit_price_net_per_base: string;
  readonly purchase: MagnitudeDocumentRow;
}

/** What one product usually arrives as. */
export interface Typical {
  /** The median delivered quantity, in base units at scale 3. */
  readonly base: number;
  /** The median net cost per base unit, an integer at scale 6. */
  readonly perBase: number;
  /** How many standing deliveries that median was taken over. */
  readonly deliveries: number;
}

/** One `Typical` per variant the shop has bought, keyed by variant id. */
export type Typicals = Readonly<Record<string, Typical>>;

/** Nothing read, which is not nothing bought. */
export const NOTHING_TYPICAL: Typicals = Object.freeze({}) as Typicals;

/**
 * What every product in this shop usually costs and usually weighs, out of one
 * read.
 *
 * ⚠️⚠️ THE VOID RULE, AND IT MATTERS MORE HERE THAN IT DOES ON A CHART. A
 * reversal line carries **the opposite sign** of the line it cancels
 * (`purchase_line_money_follows_qty`, `0003:203`), so a voided delivery left in
 * would put a NEGATIVE quantity into the sample and drag the median down — and a
 * median dragged down makes the threshold *tighter*, which is a guard that starts
 * crying wolf because somebody corrected a mistake. Both halves go, which is
 * `costsFrom`'s rule and `takingsFrom`'s two passes before it: the document a
 * reversal cancels can appear anywhere in the response, including after it.
 *
 * ⚠️ A ROW THIS PHONE CANNOT PARSE IS DROPPED AND NEVER GUESSED. `parseDecimal`
 * throws on a JSON number and on more decimals than the column holds; a sample
 * it refuses is one sample, and a median is exactly the statistic that does not
 * care. ⚠️ **The alternative — letting one unreadable row empty a product's
 * history — would turn a cast regression into a silently disarmed guard**, which
 * is the failure this whole file is trying not to be.
 *
 * ⚠️ NON-POSITIVE QUANTITIES ARE DROPPED TOO, after the void rule has run. The
 * table permits a negative `qty_base` only on a reversal line, so anything still
 * negative here is a document shape nothing in this schema writes — and a zero is
 * refused by `purchase_line_qty_non_zero`. It costs one comparison and it means
 * no arithmetic below has to think about a sign.
 */
export function typicalFrom(rows: readonly MagnitudeRow[] | null | undefined): Typicals {
  if (rows === null || rows === undefined) return NOTHING_TYPICAL;

  const reversed = new Set<string>();
  for (const row of rows) {
    const of = row.purchase?.reversal_of;
    if (typeof of === 'string' && of !== '') reversed.add(of);
  }

  const bases = new Map<string, number[]>();
  const prices = new Map<string, number[]>();

  for (const row of rows) {
    const doc = row.purchase;
    if (doc === null || doc === undefined) continue;
    if (typeof doc.reversal_of === 'string' && doc.reversal_of !== '') continue;
    if (reversed.has(doc.id)) continue;
    if (typeof row.variant_id !== 'string' || row.variant_id === '') continue;

    let base: number;
    let perBase: number;
    try {
      base = parseDecimal(row.qty_base, SCALE.quantity);
      perBase = parseDecimal(row.unit_price_net_per_base, SCALE.unitPrice);
    } catch {
      continue;
    }
    if (base <= 0 || perBase < 0) continue;

    push(bases, row.variant_id, base);
    push(prices, row.variant_id, perBase);
  }

  const typicals: Record<string, Typical> = {};
  for (const [variantId, samples] of bases) {
    const costs = prices.get(variantId) ?? [];
    typicals[variantId] = {
      base: medianOf(samples),
      perBase: medianOf(costs),
      deliveries: samples.length,
    };
  }
  return typicals;
}

function push(into: Map<string, number[]>, key: string, value: number): void {
  const list = into.get(key);
  if (list === undefined) into.set(key, [value]);
  else list.push(value);
}

/**
 * The middle value, half-up away from zero when there are two of them.
 *
 * ⚠️ IT SORTS A COPY. The caller's array is built in the database's order and
 * nothing downstream depends on it, but a helper that reorders its argument is
 * one refactor away from being the bug ([[assert-against-a-calendar-not-the-array]]
 * is the same shape: an answer that is self-consistent with the thing it
 * rearranged).
 *
 * ⚠️ THE EVEN CASE ROUNDS WITH `@tienda/money`'S OWN DIVISION AND NOT WITH
 * `Math.round` — §2.5 rule 6 is half-up AWAY FROM ZERO, `Math.round` is half-up
 * towards positive infinity, and `R5` is that this repository has exactly one
 * rounding rule. It cannot bite today (every sample is positive by the guard
 * above) and it is written this way so it cannot start to.
 */
function medianOf(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  const middle = sorted.length >> 1;
  if (sorted.length % 2 === 1) return sorted[middle] as number;
  return divRoundHalfUpAwayFromZero((sorted[middle - 1] as number) + (sorted[middle] as number), 2);
}

/**
 * Which half of a line looks wrong, if either does.
 *
 * ⚠️ `both` EXISTS BECAUSE THE TWO MISTAKES HAVE ONE CAUSE more often than not:
 * a delivery note read off the wrong line gives a quantity and a price that are
 * both somebody else's.
 */
export type Outsized = 'none' | 'quantity' | 'price' | 'both';

/**
 * §2.8's comparison, for one line.
 *
 * @param typical  what this product usually is — `undefined` when the shop has
 *                 never bought it, or when it fell out of the read's window.
 * @param base     the quantity keyed, in base units at scale 3. `0` for a
 *                 product not in the basket.
 * @param perBase  the net cost keyed, per base unit at scale 6, or `null` when
 *                 this screen has no typed price — which is every sale today.
 *                 See this file's header.
 *
 * ⚠️⚠️ IT IS `>` AND NOT `>=`, SO A DELIVERY OF EXACTLY THREE TIMES THE USUAL
 * DOES NOT FLAG. §2.8 says *"beyond ~3×"*, and the case this protects is real
 * and common: a shop that usually takes one case takes three at the end of the
 * month. The mistyped figure this guard exists for is a factor of TEN.
 *
 * ⚠️ A MISSING `typical` IS `none` AND NEVER A FLAG. A product with no history
 * is `nothing to compare against`, which is not `this looks wrong` — the
 * distinction `CostsState` spends five states on, and the same one
 * [[users-dont-do-bookkeeping]] records: a shopkeeper must never be shown our
 * missing data as her mistake.
 *
 * ⚠️ AND A ZERO MEDIAN IS `none` ON THAT FIELD. A product genuinely delivered
 * free (`unit_price_net_per_base >= 0` permits it) would otherwise make every
 * subsequent price *beyond 3× zero* and flag for ever.
 */
export function outsized(
  typical: Typical | undefined,
  base: number,
  perBase: string | number | null,
): Outsized {
  if (typical === undefined) return 'none';
  if (typical.deliveries < MAGNITUDE_SAMPLES) return 'none';

  const bigQty =
    typical.base > 0 && Number.isFinite(base) && base > typical.base * MAGNITUDE_MULTIPLE;

  const keyed = keyedPerBase(perBase);
  const bigPrice =
    typical.perBase > 0 && keyed !== null && keyed > typical.perBase * MAGNITUDE_MULTIPLE;

  if (bigQty && bigPrice) return 'both';
  if (bigQty) return 'quantity';
  if (bigPrice) return 'price';
  return 'none';
}

/**
 * The typed cost as an integer at scale 6 — or `null` when there is nothing to
 * compare.
 *
 * ⚠️ IT ACCEPTS THE STRING THE CART ACTUALLY HOLDS. `Quotes` (`@/cart/cart`) is
 * keyed per base *"exactly as Postgres sent it"*, so a caller has a decimal
 * string in hand and converting it in a screen would be a second arithmetic over
 * the same figure.
 */
function keyedPerBase(perBase: string | number | null): number | null {
  if (perBase === null) return null;
  if (typeof perBase === 'number') return Number.isFinite(perBase) ? perBase : null;
  try {
    return parseDecimal(perBase, SCALE.unitPrice);
  } catch {
    return null;
  }
}

/**
 * The amber word a screen puts beside an outsized line — `''` when there is
 * nothing to say.
 *
 * ⚠️⚠️ IT IS A STRING CHOSEN HERE AND NOT A TERNARY IN A SCREEN, which is
 * `costsLine`'s and `costNote`'s arrangement and the reason `5g-ii`'s
 * `unreadable` bug was fixable in one place. `R4` puts the words in
 * `src/strings.ts`; this is which of them applies.
 */
export function magnitudeNote(flag: Outsized): string {
  if (flag === 'quantity') return ES.counter.outsizedQty;
  if (flag === 'price') return ES.counter.outsizedPrice;
  if (flag === 'both') return ES.counter.outsizedBoth;
  return '';
}
