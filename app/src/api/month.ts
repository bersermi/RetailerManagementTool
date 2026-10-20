// ============================================================================
// TU MES AND DESCUBRE — what Números says first. Plan task `8g`, the owner's
// rulings of 2026-10-20 over the canvas (*Números · una propuesta para que den
// ganas de verlos*):
//
//   *"I want numbers that are clean and helpful yes, but also appealing and that
//   encourage users to see their numbers from the very first moment … covering
//   the basics for them to check their monthly report of sales, purchases and
//   waste but also something to nourish the curiosity"* — and, to the session's
//   suggestion (the centre, built in four rounds; tips only about her own
//   patterns; the same Números for everyone; pesos and words, no percentages):
//   *"Let's do."*
//
// Round 1 is here: the month in three colours (what was SOLD, BOUGHT and THROWN
// AWAY), a shop's first week, and the two discoveries that are true from the
// first days — the strongest hours and the best day of the week. Everything is
// read off what the ledger already holds; nothing here writes.
//
// ----------------------------------------------------------------------------
// ⚠️⚠️ A CORRECTION COUNTS ON THE DAY OF WHAT IT CORRECTS (`8p`, `0064`)
// ----------------------------------------------------------------------------
// Sales come off `product_velocity_daily`, which already follows that rule. The
// purchase and write-off DOCUMENTS read here do not: a void is a second row
// stamped when it was made. So a month counts the documents that STAND — never a
// reversal, never an original that has one (`standing`) — which is the same
// answer: a cancelled delivery is in no month, and a corrected one is the
// re-keyed document on its own day. A reversal can be dated after the month, so
// its rows are read from the month's first day to now (`reversalsSince`).
//
// ⚠️ WHO SEES IT: every role, as Números always has (rulings 31 and 32). A
// cashier reads purchase headers since `0040` and write-off lines through
// `waste_reason_line` (`0041`, quantities and causes, never money) — so the
// month looks the same in every hand at a store, and no new rule was needed.
// ============================================================================

import { SCALE, parseDecimal } from '@tienda/money';

import { shownAmount } from '@/api/documents';
import { monthShift } from '@/api/monthExport';
import { dayTotals, type SoldDay } from '@/api/sales';
import { isWasteReason, WASTE_REASONS, type WasteReason } from '@/api/waste';
import { ES } from '@/strings';

// ---------------------------------------------------------------- the reads --

/** A delivery's header, as the month reads it. Named columns, never `*` (`R13`). */
export const MONTH_PURCHASE_COLUMNS = 'id,provider_id,occurred_at,reversal_of,total_net::text,total_tax::text';

/**
 * A write-off and its lines. ⚠️ The lines come off `waste_reason_line` (`0041`),
 * the view a cashier can read — `waste_line` itself is manager-only — and it
 * carries quantity and cause, never money.
 */
export const MONTH_WASTE_COLUMNS = 'id,occurred_at,reversal_of,waste_reason_line(variant_id,reason,qty_base::text)';

/** A sale's header, for the hour it happened. */
export const SALE_TIME_COLUMNS = 'id,occurred_at,reversal_of,total_net::text,total_tax::text';

/** The one column a reversal is asked for: which document it undoes. */
export const REVERSAL_COLUMN = 'reversal_of';

/** The column every window here is cut on — when it happened, never when it landed. */
export const MONTH_TIME_COLUMN = 'occurred_at';

/** The second key of the order, so two documents of one instant page stably. */
export const MONTH_TIEBREAK = 'id';

/** Rows per request — under PostgREST's `max_rows`, so a short page is the end. */
export const MONTH_PAGE = 500;

/** How far back the hours are read. Four weeks: every weekday four times. */
export const HOURS_WINDOW_DAYS = 28;

/** Sales the hours card waits for before it says anything. */
export const HOURS_MIN_SALES = 20;

/** Days of sales the best-weekday card waits for: each weekday once. */
export const WEEKDAY_MIN_DAYS = 7;

/** How many weeks back the weekday averages reach. */
export const WEEKDAY_WEEKS = 8;

/** How long a shop is new — the first-week card's dots. */
export const FIRST_WEEK_DAYS = 7;

export function monthPurchasesKey(month: string): readonly unknown[] {
  return ['month', 'purchases', month];
}
export function monthWasteKey(month: string): readonly unknown[] {
  return ['month', 'waste', month];
}
export function saleHoursKey(since: string): readonly unknown[] {
  return ['month', 'hours', since];
}

/** Every document header shares these three. */
export interface DocumentHead {
  readonly id: string;
  readonly occurred_at: string;
  readonly reversal_of: string | null;
}

export interface PurchaseHead extends DocumentHead {
  readonly provider_id: string | null;
  readonly total_net: string;
  readonly total_tax: string;
}

export interface SaleHead extends DocumentHead {
  readonly total_net: string;
  readonly total_tax: string;
}

export interface WasteLineRow {
  readonly variant_id: string;
  readonly reason: string;
  readonly qty_base: string;
}

export interface WasteHead extends DocumentHead {
  readonly waste_reason_line: readonly WasteLineRow[] | null;
}

export interface ReversalRow {
  readonly reversal_of: string | null;
}

// ----------------------------------------------------------- time, locally --

/** The instant a local day begins, for a filter — the phone is in the shop (`today.ts`). */
export function dayStartOf(day: string): string {
  return new Date(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10))).toISOString();
}

/** The local day `days` before `day`, as `YYYY-MM-DD`. */
export function daysBefore(day: string, days: number): string {
  const at = new Date(Date.UTC(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10))));
  at.setUTCDate(at.getUTCDate() - days);
  return at.toISOString().slice(0, 10);
}

/** Whole days from `from` to `to`, both `YYYY-MM-DD`. */
function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/** The last day of a month given as its first day. */
function lastDayOf(month: string): string {
  return daysBefore(monthShift(month, 1), 1);
}

// ---------------------------------------------------- what stands, and when --

/**
 * The documents that STAND: not a reversal, and not undone by one.
 *
 * ⚠️ `reversals` is every reversal since the window opened, wherever its
 * original is, so an original in the window undone next month is still caught.
 */
export function standing<T extends DocumentHead>(rows: readonly T[], reversals: readonly ReversalRow[]): T[] {
  const undone = new Set<string>();
  for (const r of reversals) if (r.reversal_of !== null) undone.add(r.reversal_of);
  for (const r of rows) if (r.reversal_of !== null) undone.add(r.reversal_of);
  return rows.filter((r) => r.reversal_of === null && !undone.has(r.id));
}

function grossOf(row: { readonly total_net: string; readonly total_tax: string }): number | null {
  try {
    return parseDecimal(row.total_net, SCALE.money) + parseDecimal(row.total_tax, SCALE.money);
  } catch {
    return null;
  }
}

// ------------------------------------------------------------------ sold ----

export interface MonthSales {
  /** Gross takings in the month (to today, for the month under way), centavos. */
  readonly centavos: number;
  /**
   * Against the month before, or `null` when there is nothing fair to compare:
   * the shop did not sell through the whole of the days it would be compared with.
   */
  readonly compare: { readonly centavos: number; readonly previous: string; readonly sameDays: boolean } | null;
}

/**
 * What the month sold, and how it went against the month before.
 *
 * ⚠️⚠️ THE MONTH UNDER WAY IS COMPARED WITH THE SAME DAYS OF THE LAST ONE. The
 * 20th of October against the whole of September would say *$6,000 menos* every
 * month until the last day — the app frightening her with arithmetic. So the
 * month under way runs from the 1st to today, against the 1st to the same date
 * last month; a finished month against the whole of the one before.
 * ⚠️ And only when the shop was selling with Wera from the first of those days:
 * a shop that started on the 10th of September has no fair September.
 */
export function monthSales(days: readonly SoldDay[], month: string, today: string): MonthSales {
  const totals = dayTotals(days);
  const current = month === `${today.slice(0, 7)}-01`;
  const end = current ? today : lastDayOf(month);
  const sum = (from: string, to: string): number => {
    let total = 0;
    for (const [day, centavos] of totals) if (day >= from && day <= to) total += centavos;
    return total;
  };
  const centavos = sum(month, end);
  const previous = monthShift(month, -1);
  // The same date last month — or that month's last day, when it is shorter
  // (the 31st of October against the 30th of September).
  const sameDate = daysBefore(previous, -daysBetween(month, today));
  const previousEnd = current && sameDate < lastDayOf(previous) ? sameDate : lastDayOf(previous);
  let first: string | null = null;
  for (const [day, c] of totals) if (c !== 0 && (first === null || day < first)) first = day;
  if (first === null || first > previous) return { centavos, compare: null };
  return { centavos, compare: { centavos: centavos - sum(previous, previousEnd), previous, sameDays: current } };
}

/** The line under the month's sales: *$1,320 más que agosto*, or nothing. */
export function compareLine(sales: MonthSales): string {
  if (sales.compare === null) return '';
  const name = ES.dates.months[Number(sales.compare.previous.slice(5, 7)) - 1] ?? '';
  return ES.numbers.mes.compare(sales.compare.centavos, shownAmount(Math.abs(sales.compare.centavos)), name, sales.compare.sameDays);
}

// ---------------------------------------------------------------- bought ----

export interface MonthPurchases {
  /** `null` when a header could not be read — never a smaller figure. */
  readonly centavos: number | null;
  readonly deliveries: number;
  /** The supplier with the most money, or `null` with no deliveries. */
  readonly top: string | null;
  readonly suppliers: number;
}

export function monthPurchases(
  rows: readonly PurchaseHead[] | null | undefined,
  reversals: readonly ReversalRow[] | null | undefined,
  nameOf: (providerId: string | null) => string | null,
): MonthPurchases | null {
  if (rows === null || rows === undefined || reversals === null || reversals === undefined) return null;
  const kept = standing(rows, reversals);
  const bySupplier = new Map<string, number>();
  let centavos: number | null = 0;
  for (const row of kept) {
    const gross = grossOf(row);
    if (gross === null) {
      centavos = null;
      continue;
    }
    if (centavos !== null) centavos += gross;
    const key = row.provider_id ?? '';
    bySupplier.set(key, (bySupplier.get(key) ?? 0) + gross);
  }
  let top: string | null = null;
  let most = -1;
  for (const [id, amount] of bySupplier) {
    if (amount > most) {
      most = amount;
      top = nameOf(id === '' ? null : id);
    }
  }
  return { centavos, deliveries: kept.length, top, suppliers: bySupplier.size };
}

/** The line under the month's purchases. */
export function purchasesLine(p: MonthPurchases): string {
  if (p.deliveries === 0) return ES.numbers.mes.noPurchases;
  return ES.numbers.mes.purchases(p.deliveries, p.suppliers > 1 ? p.top : null);
}

// ---------------------------------------------------------------- thrown ----

export interface MonthWaste {
  /** Pieces, kilos and litres thrown away — each in its own dimension, never added. */
  readonly pieces: number;
  readonly kilos: number;
  readonly litres: number;
  readonly writeOffs: number;
  /** The cause most write-off lines were filed under. */
  readonly topReason: WasteReason | null;
}

export function monthWaste(
  rows: readonly WasteHead[] | null | undefined,
  reversals: readonly ReversalRow[] | null | undefined,
  baseOf: (variantId: string) => string | null,
): MonthWaste | null {
  if (rows === null || rows === undefined || reversals === null || reversals === undefined) return null;
  const kept = standing(rows, reversals);
  let pieces = 0;
  let grams = 0;
  let ml = 0;
  const causes = new Map<WasteReason, number>();
  for (const doc of kept) {
    for (const line of doc.waste_reason_line ?? []) {
      let qty: number;
      try {
        qty = parseDecimal(line.qty_base, SCALE.quantity);
      } catch {
        continue;
      }
      const base = baseOf(line.variant_id);
      if (base === 'g') grams += qty;
      else if (base === 'ml') ml += qty;
      else if (base !== null) pieces += qty;
      if (isWasteReason(line.reason)) causes.set(line.reason, (causes.get(line.reason) ?? 0) + 1);
    }
  }
  // ⚠️ Ties go to the enum's own order (`0003`), so the answer never flickers.
  let topReason: WasteReason | null = null;
  let most = 0;
  for (const reason of WASTE_REASONS) {
    const n = causes.get(reason) ?? 0;
    if (n > most) {
      most = n;
      topReason = reason;
    }
  }
  const unit = 10 ** SCALE.quantity;
  return {
    pieces: pieces / unit,
    kilos: grams / unit / 1000,
    litres: ml / unit / 1000,
    writeOffs: kept.length,
    topReason,
  };
}

/** *31 piezas y 2.4 kg* — or *Nada este mes*. */
export function wasteAmount(w: MonthWaste): string {
  const parts: string[] = [];
  if (w.pieces > 0) parts.push(ES.numbers.mes.pieces(oneDecimal(w.pieces)));
  if (w.kilos > 0) parts.push(`${oneDecimal(w.kilos)} kg`);
  if (w.litres > 0) parts.push(`${oneDecimal(w.litres)} L`);
  if (parts.length === 0) return ES.numbers.mes.nothingThrown;
  return parts.length === 1 ? parts[0]! : `${parts.slice(0, -1).join(', ')} y ${parts[parts.length - 1]}`;
}

/**
 * A quantity to one decimal, by integer tenths. ⚠️ Never `toFixed` (`R5`): it is
 * how a peso becomes a float elsewhere, and a kilo does not need the exception.
 */
function oneDecimal(value: number): string {
  const tenths = Math.round(value * 10);
  const rest = tenths % 10;
  return rest === 0 ? String(tenths / 10) : `${(tenths - rest) / 10}.${rest}`;
}

// ---------------------------------------------------------- the first week --

/** Days since the first sale, counting both ends — `null` before the first. */
export function shopAge(days: readonly SoldDay[], today: string): number | null {
  let first: string | null = null;
  for (const [day, c] of dayTotals(days)) if (c > 0 && (first === null || day < first)) first = day;
  return first === null ? null : daysBetween(first, today) + 1;
}

// ------------------------------------------------------- descubre: hours ----

export type Locked = { readonly locked: true; readonly have: number; readonly need: number };

export interface Hours {
  readonly locked: false;
  /** The two-hour window that sold the most: `from` to `from + 2`, local hours. */
  readonly from: number;
  /** One bar per hour that sold anything, earliest to latest. */
  readonly bars: readonly { readonly hour: number; readonly centavos: number }[];
  readonly sales: number;
}

/**
 * Which two hours of the day sell the most, over the last four weeks.
 *
 * ⚠️ IN MONEY AND NOT IN TICKETS: two big baskets at 7 beat five chicles at 3,
 * and *ten la tienda lista* is about what walks out. ⚠️ LOCAL HOURS — the phone
 * is in the shop, `today.ts`'s argument.
 */
export function hoursOf(rows: readonly SaleHead[] | null | undefined): Hours | Locked | null {
  if (rows === null || rows === undefined) return null;
  const kept = standing(rows, []);
  if (kept.length < HOURS_MIN_SALES) return { locked: true, have: kept.length, need: HOURS_MIN_SALES };
  const byHour = new Array<number>(24).fill(0);
  for (const sale of kept) {
    const gross = grossOf(sale);
    const at = new Date(sale.occurred_at);
    if (gross === null || Number.isNaN(at.getTime())) continue;
    byHour[at.getHours()] = (byHour[at.getHours()] ?? 0) + gross;
  }
  let from = 0;
  let best = -1;
  for (let h = 0; h < 23; h += 1) {
    const two = (byHour[h] ?? 0) + (byHour[h + 1] ?? 0);
    if (two > best) {
      best = two;
      from = h;
    }
  }
  const sold = byHour.map((c, hour) => ({ hour, centavos: c })).filter((b) => b.centavos > 0);
  const first = sold[0]?.hour ?? from;
  const last = sold[sold.length - 1]?.hour ?? from + 1;
  const bars = byHour.slice(first, last + 1).map((centavos, i) => ({ hour: first + i, centavos }));
  return { locked: false, from, bars, sales: kept.length };
}

/** *De 7 a 9 de la noche*. */
export function hoursLine(from: number): string {
  return ES.numbers.descubre.hoursWindow(from, from + 2);
}

// --------------------------------------------------------- descubre: days ----

export interface BestDay {
  readonly locked: false;
  /** 0 is Sunday, as `Date.getUTCDay` and `ES.dates.weekdays` count. */
  readonly best: number;
  readonly bestCentavos: number;
  readonly worst: number;
  readonly worstCentavos: number;
  /** Each weekday's average, Sunday first; `null` for a weekday with no sales. */
  readonly averages: readonly (number | null)[];
}

/**
 * The weekday that sells the most, on average over the last eight weeks.
 *
 * ⚠️ AN AVERAGE OF THE DAYS THAT SOLD, NOT OF THE CALENDAR: a shop shut on
 * Sundays has no Sunday, rather than a Sunday of zero dragging it to the bottom.
 * ⚠️ TODAY IS LEFT OUT — it is half a day.
 */
export function bestDay(days: readonly SoldDay[], today: string): BestDay | Locked | null {
  const age = shopAge(days, today);
  if (age === null) return { locked: true, have: 0, need: WEEKDAY_MIN_DAYS };
  if (age <= WEEKDAY_MIN_DAYS) return { locked: true, have: age - 1, need: WEEKDAY_MIN_DAYS };
  const since = daysBefore(today, WEEKDAY_WEEKS * 7);
  const sums = new Array<number>(7).fill(0);
  const counts = new Array<number>(7).fill(0);
  for (const [day, centavos] of dayTotals(days)) {
    if (day < since || day >= today || centavos <= 0) continue;
    const dow = new Date(`${day}T00:00:00Z`).getUTCDay();
    sums[dow] = (sums[dow] ?? 0) + centavos;
    counts[dow] = (counts[dow] ?? 0) + 1;
  }
  // ⚠️ WHOLE PESOS: an average is a sense of a day, and *$190.71* reads as a
  // receipt. Rounded to the peso by its remainder — integer centavos throughout,
  // never a peso-valued float (`R5`).
  const toPeso = (centavos: number): number => {
    const rest = centavos % 100;
    return rest >= 50 ? centavos - rest + 100 : centavos - rest;
  };
  const averages = sums.map((s, i) =>
    (counts[i] ?? 0) === 0 ? null : toPeso(Math.round(s / (counts[i] ?? 1))),
  );
  let best = -1;
  let worst = -1;
  for (let i = 0; i < 7; i += 1) {
    const a = averages[i];
    if (a === null || a === undefined) continue;
    if (best < 0 || a > (averages[best] ?? 0)) best = i;
    if (worst < 0 || a < (averages[worst] ?? 0)) worst = i;
  }
  if (best < 0) return { locked: true, have: 0, need: WEEKDAY_MIN_DAYS };
  return {
    locked: false,
    best,
    bestCentavos: averages[best] ?? 0,
    worst,
    worstCentavos: averages[worst] ?? 0,
    averages,
  };
}
