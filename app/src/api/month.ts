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
// first days — the strongest hours and the best day of the week. Round 2 (the
// same night) adds the quincena and what each customer leaves, both off reads
// round 1 already makes; round 3 what went up in price, with her own products,
// and her days as squares. Everything is read off what the ledger already
// holds; nothing here writes.
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

import { isoDay, type UnitFactors } from '@/api/catalog';
import { shownAmount } from '@/api/documents';
import { monthShift } from '@/api/monthExport';
import { pointsFrom } from '@/api/prices';
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

/**
 * ⚠️ WHOLE PESOS: an average is a sense of a day, and *$190.71* reads as a
 * receipt. Rounded to the peso by its remainder — integer centavos throughout,
 * never a peso-valued float (`R5`).
 */
function toPeso(centavos: number): number {
  const rest = centavos % 100;
  return rest >= 50 ? centavos - rest + 100 : centavos - rest;
}

/** The mean of some centavos, to the whole peso. */
function averageOf(values: readonly number[]): number {
  let sum = 0;
  for (const v of values) sum += v;
  return toPeso(Math.round(sum / Math.max(1, values.length)));
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

// ----------------------------------------------------- descubre: quincena ----

/** Quincena days that sold before the card compares anything — two of each payday. */
export const QUINCENA_MIN_DAYS = 4;

/**
 * A quincena day: the 15th and 16th, and the 30th to the 1st — each payday and
 * the day after it, when the money is spent.
 *
 * ⚠️ BY THE DATE, NOT BY WHEN A PAYDAY ON A SUNDAY WAS MOVED: a rule she can
 * check on a calendar, said on the card (`quincenaBasis`), beats a better one
 * she cannot. February's last day counts, since it has no 30th.
 */
export function isQuincena(day: string): boolean {
  const dom = Number(day.slice(8, 10));
  return dom === 1 || dom === 15 || dom === 16 || dom >= 30 || day === lastDayOf(`${day.slice(0, 7)}-01`);
}

function isMidMonth(day: string): boolean {
  const dom = Number(day.slice(8, 10));
  return dom === 15 || dom === 16;
}

export interface Quincena {
  readonly locked: false;
  /** A quincena day's average and every other day's, whole pesos. */
  readonly quincenaCentavos: number;
  readonly otherCentavos: number;
  /** Each date's average, the 1st first; `null` for a date that never sold. */
  readonly byDate: readonly (number | null)[];
}

/** Locked, and the day after which it opens if she sells every day until then. */
export type QuincenaLocked = Locked & { readonly after: string };

/**
 * How much more a quincena day sells than any other, over everything the sales
 * read holds (six months).
 *
 * ⚠️ IN PESOS PER DAY, NEVER A PERCENTAGE — the owner's ruling (*pesos and
 * words*). ⚠️ THE DAYS THAT SOLD, as `bestDay` counts: a day she was shut is no
 * day of zero. ⚠️ BOTH PAYDAYS BEFORE IT SPEAKS — a shop that opened on the 2nd
 * has only seen the 15th, and one payday is an anecdote.
 */
export function quincenaOf(days: readonly SoldDay[], today: string): Quincena | QuincenaLocked {
  const quincena: number[] = [];
  const other: number[] = [];
  const sums = new Array<number>(31).fill(0);
  const counts = new Array<number>(31).fill(0);
  let mid = 0;
  let end = 0;
  for (const [day, centavos] of dayTotals(days)) {
    if (day >= today || centavos <= 0) continue;
    const at = Number(day.slice(8, 10)) - 1;
    sums[at] = (sums[at] ?? 0) + centavos;
    counts[at] = (counts[at] ?? 0) + 1;
    if (!isQuincena(day)) other.push(centavos);
    else {
      quincena.push(centavos);
      if (isMidMonth(day)) mid += 1;
      else end += 1;
    }
  }
  if (quincena.length < QUINCENA_MIN_DAYS || mid === 0 || end === 0 || other.length === 0) {
    // Walk forward until both paydays and enough days would be in: the card
    // opens the day after that one.
    let n = quincena.length;
    let after = today;
    for (let i = 0; i < 62; i += 1) {
      after = daysBefore(today, -i);
      if (isQuincena(after)) {
        n += 1;
        if (isMidMonth(after)) mid += 1;
        else end += 1;
      }
      if (n >= QUINCENA_MIN_DAYS && mid > 0 && end > 0) break;
    }
    return { locked: true, have: Math.min(quincena.length, QUINCENA_MIN_DAYS - 1), need: QUINCENA_MIN_DAYS, after };
  }
  return {
    locked: false,
    quincenaCentavos: averageOf(quincena),
    otherCentavos: averageOf(other),
    byDate: sums.map((s, i) => ((counts[i] ?? 0) === 0 ? null : toPeso(Math.round(s / (counts[i] ?? 1))))),
  };
}

/** Which way the quincena goes. Under a tenth of an ordinary day is *casi igual*. */
export function quincenaWay(q: Quincena): 'mas' | 'igual' | 'menos' {
  const diff = q.quincenaCentavos - q.otherCentavos;
  if (Math.abs(diff) * 10 < q.otherCentavos) return 'igual';
  return diff > 0 ? 'mas' : 'menos';
}

/** *En quincena vendes $400 más al día*. */
export function quincenaLine(q: Quincena): string {
  const way = quincenaWay(q);
  return ES.numbers.descubre.quincenaBig(way, shownAmount(Math.abs(q.quincenaCentavos - q.otherCentavos)));
}

/** *Después del 31*, *Después del 15 de noviembre* — or *Mañana*. */
export function quincenaWhen(state: QuincenaLocked, today: string): string {
  if (state.after <= today) return ES.numbers.pronto.tomorrow;
  const month = state.after.slice(0, 7) === today.slice(0, 7) ? null : (ES.dates.months[Number(state.after.slice(5, 7)) - 1] ?? null);
  return ES.numbers.pronto.quincenaWhen(Number(state.after.slice(8, 10)), month);
}

// ------------------------------------------------------- descubre: ticket ----

/** Days in each half the average ticket compares: two weeks, every weekday twice. */
export const TICKET_DAYS = 14;

export interface Ticket {
  readonly locked: false;
  /** What a sale left in the last two weeks, on average — whole pesos. */
  readonly centavos: number;
  readonly sales: number;
  /** The biggest of those sales, whole pesos. */
  readonly biggest: number;
  /** The two weeks before, or `null` when they had too few sales to say. */
  readonly before: number | null;
}

/**
 * What each customer leaves — the average sale — over the last two weeks, and
 * against the two before.
 *
 * ⚠️ OFF THE HOURS' READ (four weeks of sale headers), so the card costs no
 * request: two halves of it, each with every weekday twice, so a comparison is
 * never a week of Fridays against one without. ⚠️ A VOIDED SALE IS NO CUSTOMER
 * (`standing`). ⚠️ The day of a sale is the PHONE'S day — the shop's.
 */
export function ticketOf(rows: readonly SaleHead[] | null | undefined, today: string): Ticket | Locked | null {
  if (rows === null || rows === undefined) return null;
  const recentFrom = daysBefore(today, TICKET_DAYS - 1);
  const earlierFrom = daysBefore(today, TICKET_DAYS * 2 - 1);
  const recent: number[] = [];
  const earlier: number[] = [];
  for (const sale of standing(rows, [])) {
    const gross = grossOf(sale);
    const at = new Date(sale.occurred_at);
    if (gross === null || Number.isNaN(at.getTime())) continue;
    const day = isoDay(at);
    if (day >= recentFrom) recent.push(gross);
    else if (day >= earlierFrom) earlier.push(gross);
  }
  if (recent.length < HOURS_MIN_SALES) return { locked: true, have: recent.length, need: HOURS_MIN_SALES };
  return {
    locked: false,
    centavos: averageOf(recent),
    sales: recent.length,
    biggest: toPeso(Math.max(...recent)),
    before: earlier.length < HOURS_MIN_SALES ? null : averageOf(earlier),
  };
}

// ------------------------------------------------- descubre: what went up ----

/**
 * Every product's delivery price per day, con IVA — `Precios`' purchase side
 * (the forty-first ruling: both of its lines with IVA), read for every product
 * at once. ⚠️ Off `product_purchases_daily`, which a cashier reads since `0040`,
 * so the card is the same in every hand.
 */
export const RISE_COLUMNS = 'variant_id,day,price:purchase_price_last_gross::text';

/**
 * The read's whole order. ⚠️ With every product read at once, `(day, variant,
 * location)` is the view's grain, so the order is total and the pages reassemble.
 */
export const RISE_ORDER = 'day,variant_id,location_id';

/** How many whole months back the deliveries are read, besides this one. */
export const RISE_MONTHS = 6;

export function risesKey(since: string): readonly unknown[] {
  return ['month', 'rises', since];
}

/** The first day the read reaches. */
export function risesSince(today: string): string {
  return monthShift(`${today.slice(0, 7)}-01`, -RISE_MONTHS);
}

export interface RiseRow {
  readonly variant_id: string;
  readonly day: string;
  readonly price: string | null;
}

export interface Rise {
  readonly variantId: string;
  readonly name: string;
  readonly priceUnit: string;
  /** Centavos per price unit, con IVA: the first delivery in the window, and the last. */
  readonly from: number;
  readonly to: number;
  /** The day of `from`. */
  readonly since: string;
}

export interface Rises {
  readonly locked: false;
  /** What went up, the most first — by how much against what it cost, said in pesos. Empty: nothing did. */
  readonly top: readonly Rise[];
  /** The first delivery the window holds. */
  readonly since: string;
}

/** How many products the card names. */
export const RISES_SHOWN = 4;

/**
 * What she buys that costs more now than at the first delivery the window holds.
 *
 * ⚠️ RANKED BY HOW MUCH AGAINST WHAT IT COST, SAID IN PESOS: $5 on a $33 kilo of
 * egg is the news, $8 on a $300 kilo of cheese is not — but the card says *+$5
 * el kilo*, never a percentage (the owner's ruling). ⚠️ The price is per the
 * product's PRICE unit (`pointsFrom`, `Precios`' arithmetic), so a kilo bought
 * as grams reads per kilo. ⚠️ It waits for one product bought on two days —
 * there is no *up* before that.
 */
export function risesOf(
  rows: readonly RiseRow[] | null | undefined,
  entries: readonly { readonly id: string; readonly name: string; readonly priceUnit: string }[],
  factors: UnitFactors,
): Rises | Locked | null {
  if (rows === null || rows === undefined) return null;
  const byVariant = new Map<string, RiseRow[]>();
  for (const row of rows) {
    const list = byVariant.get(row.variant_id) ?? [];
    list.push(row);
    byVariant.set(row.variant_id, list);
  }
  let have = 0;
  let since: string | null = null;
  const up: Rise[] = [];
  for (const entry of entries) {
    const points = pointsFrom(byVariant.get(entry.id) ?? [], entry.priceUnit, factors);
    if (points === null || points.length === 0) continue;
    have = Math.max(have, Math.min(points.length, 2));
    const first = points[0]!;
    const last = points[points.length - 1]!;
    if (since === null || first.day < since) since = first.day;
    if (points.length < 2 || last.centavos <= first.centavos || first.centavos <= 0) continue;
    up.push({ variantId: entry.id, name: entry.name, priceUnit: entry.priceUnit, from: first.centavos, to: last.centavos, since: first.day });
  }
  if (have < 2 || since === null) return { locked: true, have, need: 2 };
  // ⚠️ CROSS-MULTIPLIED, never divided: integer centavos throughout (`R5`).
  up.sort((a, b) => (b.to - b.from) * a.from - (a.to - a.from) * b.from || a.name.localeCompare(b.name));
  return { locked: false, top: up.slice(0, RISES_SHOWN), since };
}

/** *el 3 de junio*. */
export function dayWords(day: string): string {
  return ES.numbers.descubre.dayWords(Number(day.slice(8, 10)), ES.dates.months[Number(day.slice(5, 7)) - 1] ?? '');
}

// ------------------------------------------------- descubre: the squares ----

/** Days of history before the squares say anything — four columns. */
export const YEAR_MIN_DAYS = 28;

export interface Year {
  readonly locked: false;
  /**
   * One column per week, Monday first. A cell is 0 (nothing sold) to 4 (her
   * busiest quarter of days), or `null` before her first sale and after today.
   */
  readonly weeks: readonly (readonly (number | null)[])[];
  /** A month's short name over the column its first day falls in. */
  readonly months: readonly { readonly column: number; readonly name: string }[];
}

/**
 * Every day since her first sale as a square, darker the more it sold — her
 * seasons, without a word of explanation.
 *
 * ⚠️ SHADES BY HER OWN QUARTERS, never by fixed amounts: a shop that sells $800
 * a day and one that sells $8,000 both get four shades. ⚠️ As far as the sales
 * read reaches (six months), which is why the canvas drew six.
 */
export function yearOf(days: readonly SoldDay[], today: string): Year | Locked {
  const age = shopAge(days, today);
  if (age === null || age < YEAR_MIN_DAYS) return { locked: true, have: age ?? 0, need: YEAR_MIN_DAYS };
  const totals = dayTotals(days);
  let first = today;
  for (const [day, c] of totals) if (c > 0 && day < first) first = day;
  const sold = [...totals.values()].filter((c) => c > 0).sort((a, b) => a - b);
  const cut = (q: number): number => sold[Math.min(sold.length - 1, Math.floor((sold.length * q) / 4))] ?? 0;
  const q1 = cut(1);
  const q2 = cut(2);
  const q3 = cut(3);
  const level = (c: number): number => (c <= 0 ? 0 : c <= q1 ? 1 : c <= q2 ? 2 : c <= q3 ? 3 : 4);
  // Back to the Monday on or before her first sale.
  const dow = (new Date(`${first}T00:00:00Z`).getUTCDay() + 6) % 7;
  let day = daysBefore(first, dow);
  const weeks: (number | null)[][] = [];
  const months: { column: number; name: string }[] = [];
  while (day <= today) {
    const week: (number | null)[] = [];
    for (let i = 0; i < 7; i += 1) {
      if (day.endsWith('-01') || (weeks.length === 0 && i === 0)) {
        const name = ES.dates.months[Number(day.slice(5, 7)) - 1] ?? '';
        const short = name.charAt(0).toUpperCase() + name.slice(1, 3);
        // The first column names its month only when the next name is far enough off.
        if (weeks.length > 0 || Number(day.slice(8, 10)) <= 21) months.push({ column: weeks.length, name: short });
      }
      week.push(day < first || day > today ? null : level(totals.get(day) ?? 0));
      day = daysBefore(day, -1);
    }
    weeks.push(week);
  }
  return { locked: false, weeks, months };
}
