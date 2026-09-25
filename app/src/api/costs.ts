// ============================================================================
// WHAT EACH PROVIDER HAS CHARGED THIS SHOP FOR ONE PRODUCT, THROUGH TIME. Plan
// task `5g-iii`, and the twentieth module of `src/api/` — §2.11's boundary,
// `R12`, `R13`.
//
// ⚠️ NO SCREEN AND NO COMPONENT — the `5d-i`, `5e-i`, `5d-iv-a`, `5f-i` and
// `5g-i` shape, for the reason all five gave: everything decided here has a
// right answer `app/test/api-costs.test.ts` can read. `Costos` itself is
// `app/src/app/costos/[id].tsx`, and §2.11 fences its whole judgement out of
// this repository (`R9`).
//
// ⚠️⚠️ AND THIS MODULE CARRIES MORE OF THE SCREEN THAN ANY OF ITS PREDECESSORS,
// DELIBERATELY: `plotted` puts the CHART'S GEOMETRY on this side of the line as
// fractions of a box. A chart is arithmetic wearing a picture's clothes, and the
// arithmetic is the half that can be wrong in a way nobody sees — a y-axis that
// silently clips the highest price still draws a perfectly plausible line. The
// screen multiplies fractions by pixels it has measured and decides nothing.
// ⚠️ It is also what lets the PDF be the SAME chart rather than a second drawing
// of it: `@/export/costsPdf` calls this function and emits `<div>`s where the
// screen emits `<View>`s. Two geometries for one picture is how the file a
// shopkeeper shares stops matching the screen she shared it from.
//
// ----------------------------------------------------------------------------
// ⚠️⚠️ §2.9's PRICE-OVER-TIME VIEW IS APPLIED AND IT CANNOT SERVE THIS SCREEN
// ----------------------------------------------------------------------------
// `product_purchases_daily` (`0031`, `0032`) already answers §2.9's *"How have
// my prices moved?"* — `purchase_price_net`, `purchase_price_gross` and both
// `purchase_price_last_*` columns, per variant per day, with the ordered
// `array_agg` idiom and a three-deep tiebreak so the same database always
// answers the same price. Reading it here would be the obvious design.
//
// ⚠️⚠️ IT HAS NO `provider_id`, AND THAT WAS MEASURED OFF THE WIRE ON 2026-09-25
// RATHER THAN READ OFF THE MIGRATION. Its keys come back as `base_unit_code`,
// `day`, `family_id`, `family_name`, `location_id`, `purchase_line_count`, the
// four `purchase_price_*`, the four `purchases_*`, `tax_paid`, `variant_id`,
// `variant_name`, `workspace_id` — and nothing else. It groups by
// (workspace, location, variant, day), which is §2.9's question: *what is this
// SHOP paying*. **The owner's question is a different one** — *"the price that
// each provider (colors) is charging you for that product"* — so the view's
// grain is wrong by exactly the dimension this screen is about. Widening it is a
// migration and Números reads it; this screen ships none.
//
// So the series comes off `purchase_line` joined to its document, which the plan
// row said and which is now measured rather than assumed.
//
// ----------------------------------------------------------------------------
// ⚠️ THE PRICE IS THE INVOICE NET, BECAUSE THAT IS WHAT COMPRAR SHOWS
// ----------------------------------------------------------------------------
// `purchase_line.unit_price_net_per_base` is net of IVA — §2.5 rule 2 scopes
// `prices_include_tax` to the SALE side in its own parenthesis, and
// `docs/checks/5g-i-purchase-contract.sh` assertion 6 reads the figure back out
// of the ledger to prove it is stored verbatim. `provider_price_memory` offers
// that same net figure back as Comprar's prefill.
//
// ⚠️ SO THIS SCREEN SHOWS NET TOO, AND NOT BECAUSE NET IS THE BETTER NUMBER. It
// is because **Costos and Comprar must not disagree about what a provider
// charges.** A shopkeeper who reads `$18.00 / kg` in the chart and is prefilled
// `$20.88 / kg` on the next delivery would be looking at one provider wearing
// two prices, with nothing on either screen saying which is which. `tax_rate` is
// therefore NOT in the column list at all (`R13`: a column the app never asks
// for is a column that never reaches a phone).
//
// ----------------------------------------------------------------------------
// ⚠️⚠️ A VOIDED DELIVERY IS TWO DOCUMENTS AND NEITHER OF THEM IS A POINT
// ----------------------------------------------------------------------------
// `0021`'s answer to a void is a SECOND `purchase` with negated totals and
// `reversal_of` pointing at the first, and `purchase_line_price_non_negative`
// (`0003`) keeps `unit_price_net_per_base` non-negative on both. `0032`'s own
// comment says what that means for a chart: *"The price survives it — negative
// money over negative quantity is the price it always was."*
//
// ⚠️ TRUE OF A SUM, AND WRONG OF A SERIES. A sum self-corrects because the two
// documents cancel; a chart would draw the reversal as a SECOND POINT at the
// same price on the day the void was recorded — a delivery that never stood,
// plotted as though it had. So `reversal_of` is read and `costsFrom` drops both
// halves, which is `takingsFrom`'s rule about the count applied to a series.
//
// ----------------------------------------------------------------------------
// ⚠️ EVERY LOCATION SHE MAY READ, AND NO FILTER
// ----------------------------------------------------------------------------
// §2.9: *"consolidated by default, with a location filter"* — and RLS is what
// scopes it, since `0040` kept `my_locations()` on both policies while dropping
// the role gate. C1.5 puts each pilot shop at one location, so consolidated and
// per-location are the same rows for every shop that exists. **The drill-down is
// §2.9's and is not built here.**
// ============================================================================

import { priceCentavos, priceLabel, type UnitFactors } from '@/api/catalog';
import type { ApiMessageKey } from '@/api/errors';
import type { Provider } from '@/api/providers';
import { ES } from '@/strings';

/** The table the series comes off. Spelled once (`R13`). */
export const COSTS_TABLE = 'purchase_line';

/** The column one product's lines are filtered by. */
export const COSTS_VARIANT_COLUMN = 'variant_id';

/**
 * The columns a client may ask `purchase_line` for, and the document embedded
 * with them.
 *
 * ⚠️ NAMED AND NEVER `*` (`R13`). `purchase_line` carries `qty_base`,
 * `qty_display`, `line_net`, `tax_amount`, `tax_rate` and `expiry_date`, and
 * this screen draws none of them: the owner asked for **time and price**, one
 * colour per provider. ⚠️ A quantity would need `::text` for `SALE_COLUMNS`'
 * reason — measured 2026-09-25, `qty_display` comes off the wire as the JSON
 * number `2.000` — which is a trap this read simply does not walk into, because
 * it does not ask.
 *
 * ⚠️⚠️ `unit_price_net_per_base::text` — THE CAST IS THE SAME ONE `MEMORY_COLUMNS`
 * AND `SALE_COLUMNS` BOTH CARRY, FOR THE SAME MEASURED REASON. A bare `numeric`
 * arrives as a JSON number, which is a double; `@tienda/money`'s `parseDecimal`
 * refuses a number argument outright, and a price that went through a float is
 * the one thing `R5` forbids anywhere near the ledger.
 *
 * ⚠️⚠️ `purchase!inner(…)` IS AN EMBED OVER A **COMPOSITE** FOREIGN KEY, AND
 * THAT IT WORKS AT ALL WAS MEASURED BEFORE THIS MODULE WAS WRITTEN.
 * `purchase_line_header_fk` is `(purchase_id, workspace_id, location_id)` →
 * `purchase (id, workspace_id, location_id)`, which is not the single-column
 * shape every other embed in this app uses (`FAMILY_COLUMNS` one table over).
 * Driven against a real PostgREST on 2026-09-25 it answers **200** with the
 * document as a nested object — and it could as easily have been a 400 about an
 * ambiguous relationship, which is why it was asked rather than assumed.
 *
 * ⚠️ `!inner` AND NOT A PLAIN EMBED: a line whose document is unreadable is a
 * line with no date and no provider, which is not a point on any chart. Making
 * the database drop it is one fewer branch here and one fewer row on the phone.
 *
 * ⚠️ `id` AND `reversal_of` ARE READ FOR THE VOID RULE AND NOTHING RENDERS
 * EITHER — see this file's header. `SALE_COLUMNS` carries the identical pair for
 * the identical reason.
 */
export const COSTS_COLUMNS =
  'unit_price_net_per_base::text,purchase!inner(id,occurred_at,provider_id,reversal_of)';

/**
 * The order the database applies — newest document first.
 *
 * ⚠️⚠️ IT IS AN ORDER ON AN **EMBEDDED** COLUMN, WHICH IS THE SECOND THING THIS
 * READ HAD TO ASK PERMISSION FOR. `purchase_line` has no `occurred_at` of its
 * own — only `created_at`, the write moment, which `recorded_offline` makes
 * differ from the trading moment by up to 72 hours (§2.6, and `0010` is the
 * migration that exists because an allocator confused the two). So the sort key
 * lives on the document, and `order=purchase(occurred_at).desc` was driven
 * against a real PostgREST on 2026-09-25: **200, and correctly ordered.**
 *
 * ⚠️⚠️ AND IT IS SPELLED AS A **COLUMN EXPRESSION**, NOT AS `{ referencedTable }`,
 * WHICH IS THE TRAP THIS CONSTANT EXISTS TO NOT WALK INTO. `postgrest-js` offers
 * two shapes and its OWN doc-comments say they do different things:
 *
 *   * `.order('occurred_at', { referencedTable: 'purchase' })` sets the query
 *     parameter **`purchase.order`**, which sorts the EMBEDDED rows *inside*
 *     each parent — *"Ordering with `referencedTable` doesn't affect the
 *     ordering of the parent table."*
 *   * `.order('purchase(occurred_at)', …)` sets **`order`**, and — *"Ordering
 *     with `referenced_table(col)` affects the ordering of the parent table."*
 *
 * ⚠️⚠️ THE FIRST ONE IS A SILENT NO-OP HERE AND IT IS THE ONE A PERSON REACHES
 * FOR. `purchase` is a TO-ONE embed, so there is exactly one child per parent and
 * sorting within it does nothing at all — the lines would come back **in
 * whatever order the planner chose**, the chart's points would be strung
 * together in that order, and a re-plan would redraw the line differently with
 * nothing anywhere going red. Read off the installed library rather than
 * remembered: `PostgrestTransformBuilder.order` builds
 * `key = referencedTable ? `${referencedTable}.order` : 'order'`.
 *
 * ⚠️ NEWEST FIRST MATCHES EVERY OTHER READ IN THIS APP AND IS **REVERSED** FOR
 * THE CHART. `costsFrom` walks it backwards, because a line is drawn left to
 * right in time and a reader's eye goes the same way. The database's order is
 * still the one that decides ties — see `costsFrom`.
 */
export const COSTS_ORDER = 'purchase(occurred_at)';

/**
 * Descending — and it is its own constant so the CHECK can compose the wire
 * spelling (`order=purchase(occurred_at).desc`) out of the same two values the
 * app sends, rather than carrying a second copy of the string.
 */
export const COSTS_ORDER_ASCENDING = false;

/**
 * The query key one product's cost history caches under.
 *
 * ⚠️ THE VARIANT IS IN THE KEY, the rule `memoryKey` was written for. One key
 * for every product would serve the last product's deliveries to the next one —
 * and on a screen whose whole job is *what did this cost*, a borrowed series is
 * a lie that looks exactly like a fact.
 */
export function costsKey(variantId: string | null): readonly unknown[] {
  return ['costs', 'history', variantId ?? ''];
}

/** The document a line belongs to, as PostgREST embeds it. */
export interface CostDocumentRow {
  readonly id: string;
  /** ISO-8601, as PostgREST sends a `timestamptz`. */
  readonly occurred_at: string;
  readonly provider_id: string;
  /** Set when this document VOIDS another one. See the header. */
  readonly reversal_of: string | null;
}

/** A `purchase_line` row as PostgREST sends it, under `COSTS_COLUMNS`. */
export interface CostLineRow {
  /** Net, per BASE unit — a decimal string at scale 6. See `COSTS_COLUMNS`. */
  readonly unit_price_net_per_base: string;
  readonly purchase: CostDocumentRow;
}

/** One delivery, as the chart and the matrix both need it. */
export interface CostPoint {
  /** The document's own instant, verbatim. Kept for the tooltip-less legend. */
  readonly at: string;
  /**
   * `YYYY-MM-DD` — the matrix's column and the axis's label.
   *
   * ⚠️ IT IS THE FIRST TEN CHARACTERS OF THE ISO STRING AND NOT A `Date`'S DAY,
   * WHICH IS A DELIBERATE DISAGREEMENT WITH `today.ts` AND IS THE SMALLER
   * CLAIM. That module needs the DEVICE's midnight because it is deciding which
   * rows belong to today; this one is only LABELLING a row the database already
   * chose, and Postgres renders every `timestamptz` in UTC. Converting to the
   * phone's zone would move a delivery recorded at 19:00 in Mexico City onto the
   * previous day's column on a phone set to UTC — a column heading that
   * disagrees with the ledger for a reader who cannot see either.
   */
  readonly day: string;
  /** Net per BASE unit, exactly as Postgres sent it. */
  readonly perBase: string;
  /** What ONE PRICE UNIT cost, in centavos — or `null`, see `priceCentavos`. */
  readonly centavos: number | null;
  /** C3.10's sentence for that figure, ready to render. */
  readonly price: string;
}

/** One provider's line on the chart, and one row of the matrix. */
export interface CostSeries {
  readonly providerId: string;
  /** The provider's own name, or the word for a provider this phone cannot name. */
  readonly name: string;
  /** `Genérico` — a series like any other. See `costsFrom`. */
  readonly isGeneric: boolean;
  /**
   * Which colour of `SERIE` draws this line. An INDEX and never a hex: `R11`
   * keeps colours in `src/theme/palette.ts`, and a series that carried its own
   * colour would be a palette role invented in a data module.
   */
  readonly hue: number;
  /** ⚠️ OLDEST FIRST — the chart's direction, not the database's. */
  readonly points: readonly CostPoint[];
  /** The most recent delivery from this provider, or `null` for an empty series. */
  readonly latest: CostPoint | null;
}

/**
 * Which of the five things this screen can be looking at.
 *
 * ⚠️⚠️ THE THIN STATES ARE MOST OF THIS SCREEN'S REAL WORK AND THE PLAN ROW SAID
 * SO BEFORE A LINE WAS WRITTEN. The owner took a time axis over the brief's
 * objection that *"a chart over three deliveries says very little"*, and he took
 * it knowing that — so the honest handling of *very little* is the deliverable,
 * not a caveat on it. Four of these five states are that handling.
 *
 *   * `unknown`    — the read is out or it failed. **Never rendered as empty**:
 *                    *not back yet* must not look like *there is nothing*, the
 *                    distinction `memoryState`, `takingsFrom` and
 *                    `familyLineKey` each make in their own words.
 *                    ⚠️⚠️ **AND IT IS ALSO WHAT DELIVERIES WITH NO READABLE PRICE
 *                    ARE**, which is not an obvious fold and is the honest one.
 *                    `priceCentavos` needs `unit.factor_to_base` for this
 *                    variant's price unit, and that factor comes off the SAME
 *                    catalog read (`useUnitFactors`) — so it is missing for the
 *                    whole screen or for none of it, never for one row. A
 *                    screen that drew a chart with no dots and a matrix of
 *                    dashes would be reporting *this shop pays nothing* when
 *                    what happened is *this phone has not been told what a kilo
 *                    is yet* — `stepOf`'s rule, and the reason it says *"a null
 *                    is a unit this phone has not read"* rather than treating it
 *                    as a zero.
 *   * `nothing`    — zero deliveries. The shop has never bought this product,
 *                    which on a pilot's first week is most products (C8.2 has
 *                    the owner seeding the catalog deliberately short).
 *   * `single`     — exactly one delivery anywhere. **A dot, and no line.**
 *   * `unlinked`   — several deliveries, but no PROVIDER has two. Still no line
 *                    anywhere: a segment between two providers would be drawing
 *                    a negotiation that never happened.
 *   * `series`     — at least one provider has two deliveries, so at least one
 *                    line is a real claim about a real relationship.
 *
 * ⚠️ `single` AND `unlinked` ARE KEPT APART EVEN THOUGH THE CHART TREATS THEM
 * THE SAME. What a person is TOLD differs: one dot is *you have bought this
 * once*, and five dots in five colours is *you have bought this from five
 * suppliers once each* — which is a different and more interesting fact.
 */
export type CostsState = 'unknown' | 'nothing' | 'single' | 'unlinked' | 'series';

/** Everything `Costos` draws, out of one read. */
export interface Costs {
  readonly state: CostsState;
  /** ⚠️ ONE PER PROVIDER THAT ACTUALLY DELIVERED — see `costsFrom`. */
  readonly series: readonly CostSeries[];
  /** How many deliveries stand, across every provider. */
  readonly deliveries: number;
  /** The cheapest and dearest figures on the chart, in centavos, or `null`. */
  readonly low: number | null;
  readonly high: number | null;
  /** C3.10's sentences for those two, for the axis. `''` when there is no axis. */
  readonly lowLabel: string;
  readonly highLabel: string;
  /** ⚠️ OLDEST FIRST. Every day that carries a delivery — the matrix's columns. */
  readonly days: readonly string[];
}

/** Nothing read, which is not nothing bought. */
const NOTHING_READ: Costs = Object.freeze({
  state: 'unknown',
  series: Object.freeze([]) as readonly CostSeries[],
  deliveries: 0,
  low: null,
  high: null,
  lowLabel: '',
  highLabel: '',
  days: Object.freeze([]) as readonly string[],
}) as Costs;

/**
 * The whole screen's data, out of the rows the query already narrowed to one
 * product.
 *
 * ⚠️⚠️ A PROVIDER WITH NO DELIVERIES IS NOT A SERIES, WHICH IS THE OPPOSITE CALL
 * FROM COMPRAR'S HEADER AND IS RIGHT FOR THE OPPOSITE REASON. `providersFrom`
 * lists every supplier a shop COULD buy from, because the header is a choice
 * about the future. This screen is a record of the past, and an empty line in
 * the legend of a chart is a supplier who looks like they charge nothing.
 * ⚠️ **So the legend is built from the LEDGER and merely NAMED from the
 * directory** — which is also why a provider the directory cannot name still
 * draws: her shop bought from them, and dropping the row would hide a delivery
 * because a second read was slow.
 *
 * ⚠️ `Genérico` IS A SERIES LIKE ANY OTHER, IN THE OWNER'S OWN WORDS: *"You can
 * also look at it in Costos if there are records."* It takes its colour from the
 * same ring and sorts by the same rule — which is what makes an unplanned market
 * run visible BESIDE the suppliers rather than hidden among them. ⚠️ `isGeneric`
 * is carried so the screen can say which line is *the market* without a second
 * read, and for nothing else: it is **not** a sort key, and putting the generic
 * row first here would be `providersFrom`'s promotion applied where F6's *"a
 * default she has to scroll to is not one"* has no meaning at all.
 *
 * ⚠️⚠️ THE SERIES ARE ORDERED BY MOST RECENT DELIVERY, NEWEST FIRST, AND THE
 * COLOUR FOLLOWS THAT ORDER. So the supplier she bought from this morning is
 * always the first colour in the ring, and a shop with one supplier always draws
 * the same colour. ⚠️ **The order is STABLE across a re-read** — the tiebreak is
 * the order the database sent, never a second sort — which is `providersFrom`'s
 * recorded argument: a second sort in this runtime is a second answer to *which
 * comes first*, decided by whatever collation Hermes has.
 *
 * ⚠️ AN UNPARSEABLE PRICE IS A POINT WITH `centavos: null`, NOT A DROPPED ROW.
 * It is `takingsFrom`'s rule pointing the other way, and the difference is that
 * a series is not a sum: dropping a line from a TOTAL makes a smaller number
 * indistinguishable from a correct one, while dropping a point from a SERIES
 * hides a delivery that happened. The point is counted, it is in the matrix as
 * C3.12's dash, and `plotted` leaves it off the line — so the chart never draws
 * a price it could not read and the matrix never denies a delivery it can see.
 */
export function costsFrom(
  rows: readonly CostLineRow[] | null | undefined,
  providers: readonly Provider[],
  priceUnit: string,
  factors: UnitFactors,
): Costs {
  if (rows === null || rows === undefined) return NOTHING_READ;

  // ⚠️ BOTH HALVES OF A VOID, AND THE REVERSAL IS FOUND BEFORE ANYTHING IS
  // PLOTTED — `takingsFrom`'s two passes, and for its reason: the document a
  // reversal cancels can appear anywhere in the response, including after it.
  const reversed = new Set<string>();
  for (const row of rows) {
    const of = row.purchase?.reversal_of;
    if (typeof of === 'string' && of !== '') reversed.add(of);
  }

  const factor = factors[priceUnit];
  const named = new Map<string, Provider>();
  for (const provider of providers) named.set(provider.id, provider);

  // The database's order is newest first; every list below is built in that
  // order and reversed once, at the end.
  const byProvider = new Map<string, CostPoint[]>();
  const order: string[] = [];
  const dayed: string[] = [];
  const seenDay = new Set<string>();
  let deliveries = 0;
  let priced = 0;
  let low: number | null = null;
  let high: number | null = null;

  for (const row of rows) {
    const doc = row.purchase;
    if (doc === null || doc === undefined) continue;
    if (typeof doc.reversal_of === 'string' && doc.reversal_of !== '') continue;
    if (reversed.has(doc.id)) continue;
    if (typeof doc.provider_id !== 'string' || doc.provider_id === '') continue;
    if (typeof doc.occurred_at !== 'string' || doc.occurred_at === '') continue;

    const centavos =
      factor === undefined ? null : priceCentavos(row.unit_price_net_per_base, factor);
    const point: CostPoint = {
      at: doc.occurred_at,
      day: doc.occurred_at.slice(0, 10),
      perBase: row.unit_price_net_per_base,
      centavos,
      price: priceLabel(centavos, priceUnit),
    };

    let points = byProvider.get(doc.provider_id);
    if (points === undefined) {
      points = [];
      byProvider.set(doc.provider_id, points);
      order.push(doc.provider_id);
    }
    points.push(point);

    deliveries += 1;
    if (!seenDay.has(point.day)) {
      seenDay.add(point.day);
      dayed.push(point.day);
    }
    if (centavos !== null) {
      priced += 1;
      if (low === null || centavos < low) low = centavos;
      if (high === null || centavos > high) high = centavos;
    }
  }

  const series: CostSeries[] = order.map((providerId, index) => {
    const points = (byProvider.get(providerId) ?? []).slice().reverse();
    const provider = named.get(providerId);
    return {
      providerId,
      name: provider?.name ?? ES.costs.unnamedProvider,
      isGeneric: provider?.isGeneric ?? false,
      hue: index,
      points,
      latest: points.length === 0 ? null : (points[points.length - 1] as CostPoint),
    };
  });

  let linked = false;
  for (const one of series) if (one.points.length >= 2) linked = true;

  // ⚠️⚠️ DELIVERIES THIS PHONE CANNOT PRICE ARE `unknown` AND NOT `nothing` — see
  // `CostsState`. The factor is per-SCREEN, so this is *the units read has not
  // landed*, and it is the one branch here that would otherwise draw a confident
  // picture of an empty shop.
  if (deliveries > 0 && priced === 0) return NOTHING_READ;

  const state: CostsState =
    deliveries === 0 ? 'nothing' : deliveries === 1 ? 'single' : linked ? 'series' : 'unlinked';

  return {
    state,
    series,
    deliveries,
    low,
    high,
    lowLabel: low === null ? '' : priceLabel(low, priceUnit),
    highLabel: high === null ? '' : priceLabel(high, priceUnit),
    days: dayed.slice().reverse(),
  };
}

/**
 * The one line `Costos` shows when there is nothing to draw — as a STRING and
 * chosen here, which is `catalogLine` and `familyLine`'s own arrangement two
 * modules over.
 *
 * ⚠️⚠️ IT EXISTS SO THE SCREEN NEVER IMPORTS `@/api/errors`. `R12` bans a route
 * from reaching the module that decides what a failure MEANS, and it is right to:
 * a screen that indexed `ES.api.errors` itself would be one edit away from
 * choosing its own sentence for a `42501`. The layer answers the question; the
 * screen renders the answer.
 *
 * ⚠️ A FAILED READ WINS OVER EVERY OTHER STATE, `familyLine`'s rule and for the
 * sharper version of its reason. This screen is reached by TAPPING a product, so
 * a failure that fell through to *todavía no has registrado compras* would tell a
 * shopkeeper she has never bought a product she buys every week — on a phone that
 * simply has no signal, which in the pilot store is half the day.
 *
 * ⚠️ `unknown` WITH NO FAILURE IS `''`, AND THE CALLER SHOWS A SPINNER. *Not back
 * yet* is not a sentence, and writing one would be the app narrating its own
 * plumbing ([[users-dont-do-bookkeeping]]).
 */
export type CostsLineInput = Costs & { readonly failed: ApiMessageKey | null };

export function costsLine(state: CostsState, failed: ApiMessageKey | null): string {
  if (failed !== null) return ES.api.errors[failed];
  if (state === 'nothing') return ES.costs.nothing;
  if (state === 'single') return ES.costs.single;
  if (state === 'unlinked') return ES.costs.unlinked;
  return '';
}

/**
 * One point's place in a unit box — `x` and `y` both in `[0, 1]`, with the
 * origin at the BOTTOM LEFT.
 *
 * ⚠️ THE ORIGIN IS THE ONE A PERSON MEANS AND NOT THE ONE A SCREEN USES. React
 * Native and HTML both measure `top` downwards; a chart's cheap price is at the
 * bottom. Flipping once, here, is one subtraction the suite can read — flipping
 * in each renderer is the same subtraction written twice, and the day one of
 * them is missed the PDF is the screen upside down.
 */
export interface Plot {
  readonly x: number;
  readonly y: number;
}

/** A provider's line, ready to draw. */
export interface PlottedSeries {
  readonly providerId: string;
  readonly hue: number;
  /**
   * The points that can be drawn, oldest first. ⚠️ A point whose price could not
   * be read is ABSENT here and PRESENT in `Costs.series` — see `costsFrom`.
   */
  readonly dots: readonly Plot[];
}

/**
 * Where every line goes, as fractions of a box nobody has measured yet.
 *
 * ⚠️⚠️ THE TIME AXIS IS PROPORTIONAL TO TIME AND NOT TO THE INDEX, WHICH IS THE
 * WHOLE DIFFERENCE BETWEEN A CHART AND A ROW OF DOTS. Deliveries are irregular
 * by nature — twice in a week and then nothing for a month — and an
 * evenly-spaced x-axis would draw that month as one step, which is the shape of
 * a lie a shopkeeper would act on. ⚠️ It needs the instant as a NUMBER, so this
 * is the one place in this module that parses: `new Date(iso).getTime()`, which
 * is ES5 and not ECMA-402 (`R10`), the same arithmetic `formatWaiting` already
 * does one directory over.
 *
 * ⚠️⚠️ THE Y AXIS DOES NOT START AT ZERO, AND THE FIX FOR THAT IS A LABEL RATHER
 * THAN AN ARGUMENT. Purchase prices for one product cluster — `$17.50`, `$18.00`,
 * `$18.20` — so a zero-based axis draws three deliveries as one flat line and
 * the screen says nothing at all. A range-based axis exaggerates instead, which
 * is the ordinary charting sin. ⚠️ **So `Costs` carries `lowLabel` and
 * `highLabel` and the screen prints both on the axis**: a reader who can see
 * that the whole picture spans 70 centavos cannot be misled by its steepness.
 * That is the honest trade and it is recorded rather than assumed.
 *
 * ⚠️ ONE INSTANT, OR ONE PRICE, COLLAPSES TO THE MIDDLE RATHER THAN TO AN EDGE.
 * A single delivery, or several at one price, gives a zero-width or zero-height
 * range and `(v - min) / (max - min)` is then `0/0`. Centring says *this is the
 * only value there is*; pinning it to `0` would draw a flat line along the
 * bottom of the box, which reads as *the cheapest it has ever been*.
 *
 * ⚠️ IT TAKES `Costs` AND NOT THE RAW ROWS, so the void rule, the ordering and
 * the price arithmetic cannot be applied twice or differently. `plotted` is
 * geometry and nothing else.
 */
export function plotted(costs: Costs): readonly PlottedSeries[] {
  let first: number | null = null;
  let last: number | null = null;
  for (const one of costs.series) {
    for (const point of one.points) {
      if (point.centavos === null) continue;
      const t = new Date(point.at).getTime();
      if (Number.isNaN(t)) continue;
      if (first === null || t < first) first = t;
      if (last === null || t > last) last = t;
    }
  }

  const span = first === null || last === null ? 0 : last - first;
  const reach = costs.low === null || costs.high === null ? 0 : costs.high - costs.low;

  return costs.series.map((one) => {
    const dots: Plot[] = [];
    for (const point of one.points) {
      if (point.centavos === null) continue;
      const t = new Date(point.at).getTime();
      if (Number.isNaN(t)) continue;
      const x = span === 0 || first === null ? 0.5 : (t - first) / span;
      const y = reach === 0 || costs.low === null ? 0.5 : (point.centavos - costs.low) / reach;
      dots.push({ x, y });
    }
    return { providerId: one.providerId, hue: one.hue, dots };
  });
}

/**
 * The matrix the owner asked for, behind the collapsible: *"you can get the
 * matrix that shows this data."*
 *
 * ⚠️ IT IS THE SAME ROWS AND NOT A SECOND READ, which is what makes it worth
 * having: a person who distrusts the picture can check the picture, and the two
 * cannot disagree because there is one source.
 *
 * ⚠️⚠️ AND IT IS ALSO THE ANSWER TO §2.11's *NO STATE IS EVER ANNOUNCED BY
 * COLOUR ALONE*. The chart identifies a supplier by hue; a hue on its own is not
 * a signal to the pilot's users, on two low-end Androids in a bright shop. The
 * legend pairs each colour with a NAME, and this matrix is the same data with no
 * colour in it at all — so the rule is satisfied twice, and the second time
 * structurally rather than by care.
 *
 * ⚠️ A CELL IS `null` WHERE THAT PROVIDER DID NOT DELIVER THAT DAY, AND THE
 * SCREEN DRAWS C3.12's DASH. **A gap is not a zero** — the sentence `0032` makes
 * about a day spine and `0008` makes about an absent pairing, met a third time.
 * A `$0.00` in this grid would say a supplier gave the shop something free.
 *
 * ⚠️ THE LAST DELIVERY OF A DAY WINS A CELL, and that is the database's order
 * rather than a rule invented here: `COSTS_ORDER` sorts `occurred_at`
 * descending, `costsFrom` reverses it once to oldest-first, and this walks that
 * sequence — so the point written LAST into a day is the most recent one of it.
 * It is the same pick `product_purchases_daily`'s
 * `array_agg(… order by p.occurred_at desc, pl.created_at desc, pl.id desc)[1]`
 * makes on the server — ⚠️ **without its third tiebreak**, so two deliveries
 * from one provider at the identical instant resolve by response order here and
 * by `pl.id` there. A shop that types two deliveries from one supplier at the
 * same second reads one of two equally true prices in that cell; the matrix has
 * no room for both and the chart draws both dots.
 */
export interface MatrixCell {
  readonly day: string;
  /** C3.10's sentence, or `null` for a day this provider did not deliver. */
  readonly price: string | null;
}

export interface MatrixRow {
  readonly providerId: string;
  readonly name: string;
  readonly cells: readonly MatrixCell[];
}

export function matrixOf(costs: Costs): readonly MatrixRow[] {
  return costs.series.map((one) => {
    const byDay = new Map<string, string>();
    for (const point of one.points) byDay.set(point.day, point.price);
    return {
      providerId: one.providerId,
      name: one.name,
      cells: costs.days.map((day) => ({ day, price: byDay.get(day) ?? null })),
    };
  });
}
