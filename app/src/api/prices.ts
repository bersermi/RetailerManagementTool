// ============================================================================
// HOW HAVE MY PRICES MOVED — WHAT ONE PRODUCT SOLD FOR AND WHAT IT COST, DAY BY
// DAY, AND HOW MUCH EACH HAS MOVED OVER SIX WINDOWS. Plan task `7b`, ADR-035
// §2.9's second question, and área 9's A6: *"price changes per product over
// time, purchases and sales, with a small card of the % change over the current
// month, 1, 3, 6, 9 months and YTD."*
//
// ⚠️ NO SCREEN AND NO COMPONENT — `@/api/costs`' and `@/api/sales`' shape, for
// their reason (`R3`): every figure, every window boundary, every percentage and
// the chart's geometry has a right answer `app/test/api-prices.test.ts` can read.
// `Precios` itself is `app/src/app/precios/[id].tsx`.
//
// ----------------------------------------------------------------------------
// ⚠️⚠️ BOTH LINES ARE WITH IVA — THE FORTY-FIRST RULING, 2026-09-28
// ----------------------------------------------------------------------------
// Asked before a line was built: *one chart, both con IVA*. The brief had
// recommended two panels, sale with IVA and purchase WITHOUT, so that the
// purchase figure agreed with Comprar and `Costos`; he chose one chart where the
// gap between the lines reads as margin. ⚠️ **So the same delivery reads about
// 16% higher here than on `Costos`** (`@/api/costs` shows the invoice NET on
// purpose, to agree with Comprar's prefill). The screen says *con IVA* on both
// lines, and says where the net figure is.
//
// ----------------------------------------------------------------------------
// ⚠️ THE PRICE IS THE LAST ONE TYPED ON THE DAY, NOT THE DAY'S AVERAGE
// ----------------------------------------------------------------------------
// `0032` carries two prices per side. The EFFECTIVE one (money over quantity)
// is an average and moves when a price changes halfway through a day; the
// TYPED one (`*_price_last_gross`, off the day's last line by document time with
// a three-deep tiebreak) is the price as a STATE — *what am I charging now* —
// which is what `0032`'s own column comment says *"how have my prices moved"*
// asks. A %-change between two states is the question; a %-change between two
// averages is a question about volume.
//
// ⚠️⚠️ A SALE'S TYPED GROSS IS REBUILT, AND IT LANDS WITHIN A CENTAVO OF THE
// SHELF. `record_sale` (`0016`) stores `round(line_net / qty_base, 6)` — a
// DERIVED net — and `0032` multiplies it back by `1 + tax_rate`. Measured on the
// shapes the pilot sells ($18 a piece, $80 a kilo in grams), it rounds back to
// the keyed shelf price; `docs/checks/7b-prices-contract.sh` holds a keyed
// $120/kg with 16% IVA to exactly that.
//
// ⚠️⚠️ AND IT ARRIVES AT **TEN** DECIMALS, WHICH `priceCentavos` REFUSES. A
// `numeric(14,6)` times `1 + numeric(5,4)` is scale 10 in Postgres, and
// `parseDecimal` at `SCALE.unitPrice` (6) throws on the extra digits — so a
// naive read renders every point as *no price* and the chart as empty, with
// nothing red anywhere. `perBaseText` rounds it once, half-up, to scale 6.
//
// ----------------------------------------------------------------------------
// ⚠️ WHAT A DAY WITH A VOID DOES, SAID ONCE
// ----------------------------------------------------------------------------
// A reversal carries the SAME positive price as the line it cancels (`0032`'s
// own paragraph). The read keeps only days whose net quantity is positive, so a
// day that holds nothing but a reversal — a delivery voided two days later — is
// not a point. ⚠️ **A day with sales AND a late void of an older sale keeps the
// last line's price**, which may be the voided sale's older price. The view
// cannot tell us which line was the reversal; `Costos` can because it reads the
// ledger lines, and that is `R9`-small here: a manager voiding an old sale on a
// day the shelf price changed.
//
// ----------------------------------------------------------------------------
// ⚠️ EVERY ROLE, BY RLS
// ----------------------------------------------------------------------------
// `product_velocity_daily` is member-level (`0003`, `sale_line_select`), and
// `product_purchases_daily` became member-level the day `0040` dropped the role
// gate from `purchase_select` and `purchase_line_select` on the owner's ruling
// of 2026-09-25 — *"Empleada should be able to see the both the purchase
// records and the prices"*. `Costos` already opens for a cashier; this screen
// asks nothing about who holds the phone either.
// ============================================================================

import {
  SCALE,
  divRoundHalfUpAwayFromZero,
  formatDecimal,
  parseDecimal,
} from '@tienda/money';

import { priceCentavos, priceLabel, type UnitFactors } from '@/api/catalog';
import type { Plot } from '@/api/costs';
import type { ApiMessageKey } from '@/api/errors';
import { formatLedgerDay } from '@/format/date';
import { ES } from '@/strings';

/** The two sides of the ledger a price comes off, in the order the legend draws them. */
export type Side = 'venta' | 'compra';
export const SIDES: readonly Side[] = ['venta', 'compra'];

/** The sale side's view — member-level since `0003`. Spelled once (`R13`). */
export const SALE_PRICE_VIEW = 'product_velocity_daily';

/**
 * What the sale read asks for. ⚠️ `price:` IS A POSTGREST ALIAS, so both sides
 * come back as `{ day, price }` and one parser serves both. ⚠️ `::text` for the
 * reason every money column here carries it: a bare `numeric` is a JSON number,
 * which is a double, and `parseDecimal` refuses one.
 */
export const SALE_PRICE_COLUMNS = 'day,price:sale_price_last_gross::text';

/**
 * The column that says the day actually SOLD something, net of voids.
 *
 * ⚠️⚠️ THE SALE VIEW IS A SPINE (`0014`): every stocked product has a row for
 * every day, sold or not, with a NULL price on a quiet day. Filtering on a
 * positive quantity keeps exactly the traded days and drops a day that is only a
 * reversal. `line_count` — `@/api/sales`' filter — would keep that day.
 */
export const SALE_PRICE_TRADED_COLUMN = 'qty_base_sold';

/** The purchase side's view — member-level since `0040`. */
export const PURCHASE_PRICE_VIEW = 'product_purchases_daily';

/** What the purchase read asks for — the same alias, so the same shape. */
export const PURCHASE_PRICE_COLUMNS = 'day,price:purchase_price_last_gross::text';

/** The purchase view has no spine; this drops a day that is only a reversal. */
export const PURCHASE_PRICE_TRADED_COLUMN = 'purchases_qty_base';

/** The column one product is filtered on — the same name on both views. */
export const PRICE_VARIANT_COLUMN = 'variant_id';

/** The column the read is ordered on — the store's own date (`0012`). */
export const PRICE_DAY_COLUMN = 'day';

/**
 * The tie-breaker after the day. ⚠️ With the variant fixed, `(day, location_id)`
 * is each view's whole grain, so the order is TOTAL — which is what makes a
 * paged read reassemble rather than repeat one row and skip another.
 */
export const PRICE_TIEBREAK: readonly string[] = ['location_id'];

/**
 * How many rows one request asks for. ⚠️ BELOW `max_rows` (1000), `@/api/sales`'
 * reason: PostgREST truncates without an error, and the read stops at the first
 * short page. The read is the product's WHOLE history — see `asOfDay`.
 */
export const PRICE_PAGE = 500;

/**
 * The query key one product's prices cache under. ⚠️ The variant is IN the key —
 * one key for every product would serve the last product's prices to the next.
 */
export function pricesKey(variantId: string | null): readonly unknown[] {
  return ['prices', 'history', variantId ?? ''];
}

/** One row of either view, as PostgREST sends it under the alias. */
export interface PriceRow {
  /** `YYYY-MM-DD`, the store's own date. */
  readonly day: string;
  /** Gross per BASE unit, as text at scale 10 — or `null`, which a traded day should never be. */
  readonly price: string | null;
}

/** Both reads, as `@/api/calls` hands them back. */
export type PriceRows = Readonly<Record<Side, readonly PriceRow[]>>;

/** One day's price, denominated in the product's own price unit. */
export interface PricePoint {
  readonly day: string;
  /** Centavos per PRICE unit, with IVA. */
  readonly centavos: number;
}

/**
 * A gross price per base unit, rounded ONCE to the scale `priceCentavos` reads.
 *
 * ⚠️ HALF-UP AWAY FROM ZERO, `@tienda/money`'s one rule (`R5`), and `null` for
 * anything that is not a plain decimal of at most ten places — see the header.
 * The rounding moves a base-unit price by at most half a millionth of a peso,
 * which is below a centavo at every factor this catalog carries (grams to a
 * kilo is ×1000: half a thousandth of a peso).
 */
export function perBaseText(text: string | null | undefined): string | null {
  if (typeof text !== 'string') return null;
  try {
    const tenths = parseDecimal(text, 10);
    return formatDecimal(divRoundHalfUpAwayFromZero(tenths, 10_000), SCALE.unitPrice);
  } catch {
    return null;
  }
}

/**
 * One side's rows as points, OLDEST FIRST, one per day.
 *
 * ⚠️ `null` WHEN THE PRICE UNIT CANNOT BE DENOMINATED — the units read has not
 * landed, so there is no factor. That is *this phone has not been told what a
 * kilo is yet*, never *no trades*, and the caller answers `unknown` for it
 * (`CostsState`'s rule).
 *
 * ⚠️ ONE POINT PER DAY, THE LAST ROW WINS. The read orders by `(day,
 * location_id)`, so on a shop with two stores the second store's price stands
 * for the day. C1.5 puts every pilot shop at one store, where there is nothing
 * to choose; a per-store chart is §2.9's location filter and is not built.
 *
 * ⚠️ A ROW WHOSE PRICE CANNOT BE READ IS DROPPED rather than drawn at zero: a
 * zero point is a line through the floor and a 100% card.
 */
export function pointsFrom(
  rows: readonly PriceRow[],
  priceUnit: string,
  factors: UnitFactors,
): readonly PricePoint[] | null {
  const factor = factors[priceUnit];
  if (factor === undefined) return null;
  const byDay = new Map<string, number>();
  const order: string[] = [];
  for (const row of rows) {
    if (typeof row.day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(row.day)) continue;
    const perBase = perBaseText(row.price);
    if (perBase === null) continue;
    const centavos = priceCentavos(perBase, factor);
    if (centavos === null) continue;
    if (!byDay.has(row.day)) order.push(row.day);
    byDay.set(row.day, centavos);
  }
  // ⚠️ SORTED HERE AND NOT TRUSTED FROM THE WIRE. `YYYY-MM-DD` sorts correctly
  // as bytes, and a card that walked an unsorted list would pick a wrong *before*.
  return order
    .slice()
    .sort()
    .map((day) => ({ day, centavos: byDay.get(day) as number }));
}

// ----------------------------------------------------------------------------
// The six windows
// ----------------------------------------------------------------------------

/** Área 9's cards: the current month, 1, 3, 6 and 9 months, and the year so far. */
export type Window = 'mes' | 'm1' | 'm3' | 'm6' | 'm9' | 'anio';
export const WINDOWS: readonly Window[] = ['mes', 'm1', 'm3', 'm6', 'm9', 'anio'];

const MONTHS_BACK: Readonly<Record<'m1' | 'm3' | 'm6' | 'm9', number>> = {
  m1: 1,
  m3: 3,
  m6: 6,
  m9: 9,
};

function pad(n: number, width: number): string {
  return String(n).padStart(width, '0');
}

/** `YYYY-MM-DD` of a UTC calendar date — pure arithmetic, no time zone involved. */
function ymd(date: Date): string {
  return `${pad(date.getUTCFullYear(), 4)}-${pad(date.getUTCMonth() + 1, 2)}-${pad(date.getUTCDate(), 2)}`;
}

/**
 * The last day BEFORE a window opens — the day whose price the card compares
 * today's against.
 *
 * ⚠️⚠️ THE CARD ASKS *HOW HAS THE PRICE MOVED SINCE THEN*, SO THE BASELINE IS
 * THE PRICE AS IT STOOD AT THE END OF THIS DAY: the last point on or before it,
 * however long ago that was. That is why the read is the product's whole history
 * rather than nine months of it — a product last re-priced in March still has a
 * nine-month baseline in September.
 *
 *   * `mes`  — the last day of the previous month
 *   * `mN`   — the same day N months ago, clamped to that month's length, so
 *              31 May less three months is 28 (or 29) February and not 3 March
 *   * `anio` — 31 December of last year
 *
 * ⚠️ PURE CALENDAR ARITHMETIC IN UTC, on a date that already IS the shop's own
 * day (`isoDay`) — so no zone and no daylight-saving hour can move a boundary.
 */
export function asOfDay(today: string, window: Window): string {
  const y = Number(today.slice(0, 4));
  const m = Number(today.slice(5, 7));
  const d = Number(today.slice(8, 10));
  if (window === 'anio') return `${pad(y - 1, 4)}-12-31`;
  if (window === 'mes') return ymd(new Date(Date.UTC(y, m - 1, 0)));
  const back = MONTHS_BACK[window];
  const first = new Date(Date.UTC(y, m - 1 - back, 1));
  const length = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  return ymd(new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), Math.min(d, length))));
}

/**
 * How far one side's price has moved over one window, in TENTHS OF A PERCENT
 * (`146` is 14.6 %) — or `null` when there is nothing honest to say.
 *
 * ⚠️⚠️ TENTHS AND NOT BASIS POINTS, BECAUSE THE CARD SHOWS TENTHS AND A SECOND
 * ROUNDING WOULD LIE. $11.00 → $12.60 is 14.545…%: rounded to basis points it is
 * 1455, and 1455 rounded to tenths is 14.6 — while the true figure rounds to
 * 14.5. One division, straight to what is shown.
 *
 * ⚠️⚠️ BOTH ENDS MUST EXIST, AND THAT IS WHAT KEEPS A QUIET PRODUCT FROM
 * READING *SIN CAMBIO*. `now` is the latest point INSIDE the window and
 * `before` the latest point on or before `asOfDay`. A product that has not
 * traded since the window opened has no `now`; a product first sold inside it
 * has no `before`. Either way the card is a dash — *we cannot tell* — and never
 * a zero, which would be a claim that nothing moved.
 *
 * ⚠️ ROUNDED ONCE, half-up away from zero, by `@tienda/money`'s rule (`R5`).
 */
export function changeOf(
  points: readonly PricePoint[],
  today: string,
  window: Window,
): number | null {
  const asOf = asOfDay(today, window);
  let before: PricePoint | null = null;
  let now: PricePoint | null = null;
  for (const point of points) {
    if (point.day <= asOf) before = point;
    else if (point.day <= today) now = point;
  }
  if (before === null || now === null || before.centavos <= 0) return null;
  return divRoundHalfUpAwayFromZero((now.centavos - before.centavos) * 1_000, before.centavos);
}

/**
 * A change as a shopkeeper reads it: *Sube 3.4 %*, *Baja 2.0 %*, *Sin cambio*,
 * or C3.12's dash.
 *
 * ⚠️ WORDS AND NOT A SIGN, AND NO COLOUR. A rising sale price is good news and a
 * rising purchase price is bad news, so a green or red card would be wrong for
 * one side of every pair — and §2.11 forbids colour alone anyway. ⚠️ One
 * decimal: a move under 0.05 % is noise, and it reads *sin cambio*.
 */
export function changeLabel(tenths: number | null): string {
  if (tenths === null) return ES.documents.noFigure;
  if (tenths === 0) return ES.prices.same;
  const size = Math.abs(tenths);
  const figure = `${Math.floor(size / 10)}.${size % 10}`;
  return tenths > 0 ? ES.prices.rises(figure) : ES.prices.falls(figure);
}

// ----------------------------------------------------------------------------
// The screen's data
// ----------------------------------------------------------------------------

/**
 * What the screen is looking at.
 *
 *   * `unknown` — the read is out or failed, or the price unit has no factor
 *                 yet. **Never drawn as empty** — *not back yet* is not *never
 *                 traded*, `CostsState`'s rule.
 *   * `nothing` — neither side has a single traded day for this product.
 *   * `shown`   — at least one side has a point.
 */
export type PricesState = 'unknown' | 'nothing' | 'shown';

/** One side, ready to draw. */
export interface SidePrices {
  readonly side: Side;
  /** ⚠️ Only the points inside the chart's span, oldest first. */
  readonly points: readonly PricePoint[];
  /** The latest point this product has on this side, at any date — or `null`. */
  readonly latest: PricePoint | null;
  /** C3.10's sentence for `latest` — `$18 / pza` — or `''`. */
  readonly latestPrice: string;
  /** `27 de septiembre`, the day of `latest` — or `''`. */
  readonly latestDay: string;
  /** One sentence per window — see `changeLabel`. */
  readonly changes: Readonly<Record<Window, string>>;
}

/** Everything `Precios` draws, out of one read. */
export interface Prices {
  readonly state: PricesState;
  readonly sides: Readonly<Record<Side, SidePrices>>;
  /** The cheapest and dearest figures on the chart, in centavos, or `null`. */
  readonly low: number | null;
  readonly high: number | null;
  /** C3.10's sentences for those two, for the axis. `''` when there is no axis. */
  readonly lowLabel: string;
  readonly highLabel: string;
  /** The first and last day on the chart, as `3 de septiembre` — `''` when there is none. */
  readonly fromLabel: string;
  readonly toLabel: string;
}

function emptySide(side: Side): SidePrices {
  const changes = {} as Record<Window, string>;
  for (const window of WINDOWS) changes[window] = ES.documents.noFigure;
  return { side, points: [], latest: null, latestPrice: '', latestDay: '', changes };
}

const NOTHING_READ: Prices = Object.freeze({
  state: 'unknown',
  sides: Object.freeze({ venta: emptySide('venta'), compra: emptySide('compra') }),
  low: null,
  high: null,
  lowLabel: '',
  highLabel: '',
  fromLabel: '',
  toLabel: '',
}) as Prices;

function dayLabel(day: string): string {
  const parts = formatLedgerDay(day);
  return parts === null ? day : ES.dates.dayOfMonth(Number(parts.day), parts.month);
}

/**
 * The day before which nothing is drawn: the longest card's baseline.
 *
 * ⚠️ THE CHART SHOWS EXACTLY WHAT THE CARDS SPEAK ABOUT — the nine-month window
 * or the year so far, whichever reaches further back (the year, from October
 * on). Older points still feed a card's baseline; they are not drawn.
 */
export function chartAsOf(today: string): string {
  const nine = asOfDay(today, 'm9');
  const year = asOfDay(today, 'anio');
  return nine < year ? nine : year;
}

/**
 * The whole screen's data, out of the two reads.
 *
 * ⚠️ ONE Y AXIS FOR BOTH LINES, which is what the ruling bought: both are with
 * IVA and in the same unit, so the gap between them is a real distance — sale
 * price less purchase price, per unit, with tax on both.
 */
export function pricesFrom(
  rows: PriceRows | null | undefined,
  priceUnit: string,
  factors: UnitFactors,
  today: string,
): Prices {
  if (rows === null || rows === undefined) return NOTHING_READ;
  const from = chartAsOf(today);
  const sides = {} as Record<Side, SidePrices>;
  let low: number | null = null;
  let high: number | null = null;
  let first: string | null = null;
  let last: string | null = null;
  let any = false;

  for (const side of SIDES) {
    const all = pointsFrom(rows[side] ?? [], priceUnit, factors);
    if (all === null) return NOTHING_READ;
    const upToToday = all.filter((point) => point.day <= today);
    const points = upToToday.filter((point) => point.day > from);
    const latest = upToToday.length === 0 ? null : (upToToday[upToToday.length - 1] as PricePoint);
    if (latest !== null) any = true;
    for (const point of points) {
      if (low === null || point.centavos < low) low = point.centavos;
      if (high === null || point.centavos > high) high = point.centavos;
      if (first === null || point.day < first) first = point.day;
      if (last === null || point.day > last) last = point.day;
    }
    const changes = {} as Record<Window, string>;
    for (const window of WINDOWS) changes[window] = changeLabel(changeOf(upToToday, today, window));
    sides[side] = {
      side,
      points,
      latest,
      latestPrice: latest === null ? '' : priceLabel(latest.centavos, priceUnit),
      latestDay: latest === null ? '' : dayLabel(latest.day),
      changes,
    };
  }

  return {
    state: any ? 'shown' : 'nothing',
    sides,
    low,
    high,
    lowLabel: low === null ? '' : priceLabel(low, priceUnit),
    highLabel: high === null ? '' : priceLabel(high, priceUnit),
    fromLabel: first === null ? '' : dayLabel(first),
    toLabel: last === null ? '' : dayLabel(last),
  };
}

/**
 * Each side's points in a unit box, origin bottom-left — `plotted`'s contract in
 * `@/api/costs`, so `Grafica` draws both screens the same way.
 *
 * ⚠️ BOTH SIDES SHARE ONE X AND ONE Y, from the first charted day to the last
 * and from the cheapest price to the dearest. A day's `x` is its distance in
 * DAYS, measured on UTC midnights so no clock change stretches a gap. One day
 * alone sits in the middle; one price alone sits halfway up.
 */
export function plottedPrices(prices: Prices): Readonly<Record<Side, readonly Plot[]>> {
  const at = (day: string) => Date.UTC(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10)));
  let first: number | null = null;
  let last: number | null = null;
  for (const side of SIDES) {
    for (const point of prices.sides[side].points) {
      const t = at(point.day);
      if (first === null || t < first) first = t;
      if (last === null || t > last) last = t;
    }
  }
  const span = first === null || last === null ? 0 : last - first;
  const reach = prices.low === null || prices.high === null ? 0 : prices.high - prices.low;
  const out = {} as Record<Side, readonly Plot[]>;
  for (const side of SIDES) {
    out[side] = prices.sides[side].points.map((point) => ({
      x: span === 0 || first === null ? 0.5 : (at(point.day) - first) / span,
      y: reach === 0 || prices.low === null ? 0.5 : (point.centavos - prices.low) / reach,
    }));
  }
  return out;
}

/**
 * The one line `Precios` shows when there is nothing to draw, chosen here so the
 * screen never imports `@/api/errors` (`R12`). A failure wins; *still out* is
 * `''` and the caller shows a spinner.
 */
export function pricesLine(state: PricesState, failed: ApiMessageKey | null): string {
  if (failed !== null) return ES.api.errors[failed];
  if (state === 'nothing') return ES.prices.nothing;
  return '';
}
