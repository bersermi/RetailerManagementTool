// ============================================================================
// WHAT AM I SELLING, AND WHAT DID IT BRING IN. Plan task `7a` — the first of
// ADR-035 §2.9's three questions, and the first read in this app over a VIEW
// that answers a business question rather than a screen's.
//
// ⚠️ NO SCREEN AND NO COMPONENT — the `5g-iii` shape: everything decided here
// has a right answer `app/test/api-sales.test.ts` can read, and
// `docs/checks/7a-sales-contract.sh` puts the read in front of a real
// database. `src/app/numeros.tsx` draws what this module hands it.
//
// ----------------------------------------------------------------------------
// ⚠️⚠️ WHO MAY READ IT — RULED 2026-09-28, AND THE ADR DISAGREED WITH ITSELF
// ----------------------------------------------------------------------------
// §2.7's matrix says *"See quantity sold and revenue (Números) — ● assigned
// locations"* for staff; §2.8's screen table said *"Números — Manager+"*. The
// owner ruled **every role**, the matrix's reading, and §2.8's cell now says so.
// ⚠️ **The database already agreed**: `product_velocity_daily` is
// `security_invoker` over `sale_line`, whose policy is `my_workspaces()` and
// `my_locations()` with no `has_role` (`0003`), and `0031`'s header measured a
// cashier reading it — and `daily_sales` (`0095`), which this read asks since
// `12.2`, is `security invoker` over the same table. So a cashier sees her own
// stores' sales **by policy**, and this module carries no role at all.
//
// ----------------------------------------------------------------------------
// ⚠️⚠️ THE GRAIN IS DAILY AND THE CLIENT ROLLS IT UP — §2.9, VERBATIM
// ----------------------------------------------------------------------------
// *"A period baked into a view is a migration every time he wants a different
// card."* So ONE read covers every bar on every switch: `SALES_MONTHS` calendar
// months of daily rows, and `Día`, `Semana` and `Mes` are three ways of adding
// the same rows up. Switching never re-fetches, which matters in a shop that is
// offline half the day ([[pilot-store-is-offline-a-lot]]).
//
// ⚠️ THE ANSWER'S `day` IS ALREADY THE STORE'S LOCAL DATE (`0031`: `occurred_at at
// time zone l.timezone`, the view's rule and `daily_sales`'), so the bucketing below is calendar arithmetic on a
// date string and never touches an instant. That is why it can use `Date.UTC`
// freely: a date with no time in it has no timezone to get wrong.
//
// ----------------------------------------------------------------------------
// ⚠️ A VOID NETS, IT DOES NOT VANISH
// ----------------------------------------------------------------------------
// `void_transaction` (`0021`) inserts a mirror sale with NEGATIVE lines, so the
// database's sums already net — and since `0064` a void counts on the day of the
// sale it undoes, wherever it was made: a cancelled sale nets its own day to
// zero, never a plus on one day and a minus on the next. **A product whose whole period nets to nothing is dropped from the
// table** — a row reading *0 pza, $0.00* is bookkeeping about a mistake
// ([[users-dont-do-bookkeeping]]).
//
// ----------------------------------------------------------------------------
// ⚠️ CONSOLIDATED, AND NO LOCATION FILTER
// ----------------------------------------------------------------------------
// §2.9: *"consolidated by default, with a location filter"*. C1.5 puts each
// pilot shop at one location, so consolidated and per-location are the same
// rows for every shop that exists — the `@/api/costs` argument, and like there
// **the drill-down is §2.9's and is not built here.**
// ============================================================================

import { SCALE, parseDecimal } from '@tienda/money';

import type { CatalogEntry, UnitBases, UnitFactors } from '@/api/catalog';
import type { Online } from '@/api/connectivity';
import { lineQuantity, shownAmount } from '@/api/documents';
import type { ApiMessageKey } from '@/api/errors';
import { qtyShown, shownUnitOf } from '@/cart/quantity';
import { waitsForSignal } from '@/offline/senal';
import { ES } from '@/strings';

/**
 * The function the rows come off — `0095`, plan `12.2`. Spelled once (`R13`).
 *
 * ⚠️⚠️ ONE REQUEST, AND WHY IT USED TO BE EIGHTEEN. Until `12.2` this read paged
 * `product_velocity_daily` 500 rows at a time, because PostgREST caps a SET of
 * rows at `max_rows` (1000) and truncates without an error. On the hosted demo
 * shop (six months, 51,468 sale lines) page 1 alone took 16–24 s, every page
 * rebuilt the shop's whole history, and the database stops a phone's statement
 * at 8 s: the screen spun and failed (`12.1`, measured). `daily_sales` answers
 * the same rows — exactly the view's with `line_count > 0`, held to the cent by
 * `supabase/tests/0095_sales_in_one_answer.sql` — as ONE json value, and one
 * value is one row, which no `max_rows` truncates. So there is no page, and no
 * order to keep total: `docs/checks/7a-sales-contract.sh` asks for more rows than
 * the cap and gets every one.
 *
 * ⚠️ WHO MAY READ IT DID NOT CHANGE: `security invoker` over `sale_line`, so a
 * cashier reads her own stores' sales by policy, as through the view.
 */
export const SALES_FUNCTION = 'daily_sales';

/** Its arguments: the open shop, and the first day the read covers (`salesSince`). */
export function salesArgs(shopId: string, since: string): {
  readonly p_workspace_id: string;
  readonly p_since: string;
} {
  return { p_workspace_id: shopId, p_since: since };
}

/**
 * The keys each row of the answer carries — `SalesRow`'s, which the compiler
 * holds this list to, and which the contract check holds the database to.
 *
 * ⚠️ `revenue_gross` AND NOT `revenue_net`: §2.9, ruled 2026-09-14 — gross is
 * the figure that reconciles against the cash in the till. The view carries
 * twenty-odd columns (the trailing windows, `days_since_last_sale`,
 * `store_traded`); the function hands over only what this read draws.
 *
 * ⚠️⚠️ BOTH FIGURES ARRIVE AS TEXT — the function casts them, as `::text` in a
 * select did before it: a bare `numeric` arrives as a JSON number, which is a
 * double, and `parseDecimal` refuses a number outright.
 *
 * ⚠️ `base_unit_code` IS READ AND IS NOT TRUSTED ON ITS OWN. `@/api/catalog`'s
 * `UnitBases` records that the variant's column says `250g` on every product
 * this app created, while `qty_base_sold` is really in grams — so the code is
 * looked up in the unit table before it names anything. It is only needed for a
 * product the catalog no longer lists (a retired one), which is the one case the
 * catalog cannot answer.
 *
 * ⚠️⚠️ AND THE ANSWER IS ALREADY A LIST OF SALES, NOT THE VIEW'S SPINE (`0014`
 * gives every stocked product a row for every day, sold or not): the function
 * reads the sale lines themselves, so a day appears only with a sale line on it —
 * **including a day whose only lines are a sale and its void**, which is what
 * makes the netting above right.
 */
export const SALES_KEYS: readonly (keyof SalesRow)[] = [
  'day',
  'variant_id',
  'variant_name',
  'family_id',
  'family_name',
  'base_unit_code',
  'qty_base_sold',
  'revenue_gross',
  'times_sold',
];

/** How many calendar months the read covers — and how many `Mes` bars there are. */
export const SALES_MONTHS = 6;

/**
 * How many bars each switch draws, newest last.
 *
 * ⚠️ `semana` AND `dia` MUST FIT INSIDE `SALES_MONTHS`, or the oldest bars would
 * be drawn empty for want of a read rather than for want of a sale.
 * `app/test/api-sales.test.ts` asserts it.
 */
export const BARS: Readonly<Record<Period, number>> = { dia: 14, semana: 8, mes: SALES_MONTHS };

/** Día, Semana, Mes — the switch the owner asked for (§2.9). */
export type Period = 'dia' | 'semana' | 'mes';
export const PERIODS: readonly Period[] = ['dia', 'semana', 'mes'];

/** Per product or per family (§2.9's *"per variant and per family"*). */
export type Grouping = 'producto' | 'familia';
export const GROUPINGS: readonly Grouping[] = ['producto', 'familia'];

/**
 * The query key the read caches under.
 *
 * ⚠️ THE WINDOW'S FIRST DAY IS IN IT, `costsKey`'s rule applied to time: on the
 * first of the month the window moves, and one key for both would serve last
 * month's six months as this month's.
 */
export function salesKey(since: string): readonly unknown[] {
  return ['sales', 'daily', since];
}

/** One row of `daily_sales`' answer. */
export interface SalesRow {
  readonly day: string;
  readonly variant_id: string;
  readonly variant_name: string;
  readonly family_id: string;
  readonly family_name: string;
  readonly base_unit_code: string;
  readonly qty_base_sold: string;
  readonly revenue_gross: string;
  /**
   * `0100`, plan `14.2`: how many sales carried it that day, a void taking its
   * sale back — a JSON number. ⚠️ Typed as possibly absent: a database not yet
   * given `0100` sends eight keys, and the count is Vender's order, never a
   * figure on a report, so its absence withholds nothing (`timesOf`).
   */
  readonly times_sold?: number;
}

/** One product's sales on one day, parsed. */
export interface SoldDay {
  readonly day: string;
  readonly variantId: string;
  readonly variantName: string;
  readonly familyId: string;
  readonly familyName: string;
  /** What `qty` is counted in — the UNIT TABLE's base code, not the variant's column. */
  readonly baseUnit: string;
  /** Base units at `SCALE.quantity` — an integer, `@/cart/quantity`'s currency. */
  readonly qty: number;
  /** Gross revenue in integer centavos (`R5`). */
  readonly centavos: number;
  /**
   * `0100`: how many sales carried it that day, voids netted — or `null` when
   * the database did not say (`timesOf`). Read by Vender's order alone
   * (`@/cart/orden`).
   */
  readonly times: number | null;
}

/**
 * `unknown` — the read is out, or failed; `unreadable` — it came back and a
 * figure in it did not parse; `nothing` — no sale in the whole window;
 * `sales` — there is something to draw.
 */
export type SalesState = 'unknown' | 'unreadable' | 'nothing' | 'sales';

export interface Sales {
  readonly state: SalesState;
  readonly days: readonly SoldDay[];
}

/**
 * The rows, parsed — or a state saying why there is nothing to draw.
 *
 * ⚠️⚠️ ONE UNPARSABLE FIGURE WITHHOLDS THE WHOLE REPORT, AND IT IS NOT
 * CAUTION FOR ITS OWN SAKE. Dropping the row would draw a total that is short by
 * a day nobody can see is missing — a confident wrong number on the screen whose
 * whole job is the number. `shownAmount`'s rule: a figure this phone could not
 * read never renders as a smaller one.
 */
export function salesFrom(
  rows: readonly SalesRow[] | null | undefined,
  bases: UnitBases,
): Sales {
  if (rows === null || rows === undefined) return { state: 'unknown', days: [] };
  const days: SoldDay[] = [];
  for (const row of rows) {
    let qty: number;
    let centavos: number;
    try {
      qty = parseDecimal(row.qty_base_sold, SCALE.quantity);
      centavos = parseDecimal(row.revenue_gross, SCALE.money);
    } catch {
      return { state: 'unreadable', days: [] };
    }
    days.push({
      day: row.day,
      variantId: row.variant_id,
      variantName: row.variant_name,
      familyId: row.family_id,
      familyName: row.family_name,
      baseUnit: bases[row.base_unit_code] ?? row.base_unit_code,
      qty,
      centavos,
      times: timesOf(row.times_sold),
    });
  }
  return { state: days.length === 0 ? 'nothing' : 'sales', days };
}

/**
 * `times_sold` as the phone keeps it: a whole number, or `null`.
 *
 * ⚠️ AN ABSENT OR UNREADABLE COUNT IS `null` AND WITHHOLDS NOTHING — unlike a
 * figure (`salesFrom`'s rule), because no screen states it: it only orders
 * Vender's tiles, and `@/cart/orden` counts a day it cannot read as one sale. A
 * database still without `0100` (the deploy owed after the merge) then orders
 * by the days each product sold, and Números draws as it did.
 */
export function timesOf(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) ? value : null;
}

/**
 * The sentence that replaces the report, or `''` when the report is the answer.
 *
 * ⚠️ `unknown` WITH NO FAILURE IS `''` AND THE CALLER SHOWS A SPINNER —
 * `costsLine`'s rule. A failure is the `ES.api` sentence, never *no sales*: a
 * shop told it sold nothing on a phone that simply had no signal is the exact
 * lie `takingsFrom` was written to refuse.
 *
 * ⚠️⚠️ `8g`, 2026-10-20, the offline report's round 3 (the owner's *"Do all the
 * fixes"*): THE ROWS ARE ASKED FIRST AND THE FAILURE LAST, signal or not. A
 * refresh that failed over six months already on the phone used to put *Sin
 * conexión…* where the chart was — the last good copy hidden behind a sentence
 * about the attempt. And with nothing read and no signal it is
 * `ES.offline.whenSignal`, never a spinner the library has paused
 * (`@/offline/senal`): the chart arrives by itself when the signal does. Online
 * with nothing read, the spinner and the failure are what they were.
 */
export function salesLine(state: SalesState, failed: ApiMessageKey | null, online: Online): string {
  if (state === 'sales') return '';
  if (state === 'nothing') return ES.numbers.nothing;
  if (state === 'unreadable') return ES.api.errors.unknown;
  if (waitsForSignal(online, false)) return ES.offline.whenSignal;
  if (failed !== null) return ES.api.errors[failed];
  return '';
}

/**
 * The days, if the six months have been READ — `null` while they have not.
 *
 * ⚠️ `8g`, 2026-10-20, round 3: `days` is `[]` both for a shop that has sold
 * nothing and for a read that never arrived, and a card that counts history off
 * it cannot tell the two apart. Offline, Números said *Tu mejor día de la semana
 * · En 7 días* in a shop with months of sales. `nothing` is an answer; `unknown`
 * and `unreadable` are not, and a card handed `null` draws nothing until it is.
 */
export function historyOf(sales: Sales): readonly SoldDay[] | null {
  return sales.state === 'sales' || sales.state === 'nothing' ? sales.days : null;
}

// ----------------------------------------------------------------------------
// THE CALENDAR
// ----------------------------------------------------------------------------

/** `YYYY-MM-DD` → a UTC `Date` at midnight, or `null` when it is not one. */
function dateOf(day: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const date = new Date(
    Date.UTC(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10))),
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

/** A UTC `Date` → `YYYY-MM-DD`. The inverse of `dateOf`. */
function dayOf(date: Date): string {
  const y = String(date.getUTCFullYear()).padStart(4, '0');
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** `day` moved by `days` — negative goes back. `Date.UTC` normalises month ends. */
function shifted(day: string, days: number): string {
  const date = dateOf(day);
  if (date === null) return day;
  return dayOf(new Date(date.getTime() + days * 86_400_000));
}

/**
 * The first day of the period `day` falls in.
 *
 * ⚠️⚠️ A WEEK STARTS ON MONDAY. That is the Mexican calendar (NOM-008 follows
 * ISO 8601, and a printed Mexican calendar starts on *lunes*), and it is the
 * choice that keeps a Saturday and a Sunday — the busiest two days a small shop
 * has — in the SAME week bar rather than splitting them across two.
 * `getUTCDay()` counts Sunday as 0, so `(dow + 6) % 7` is the days since Monday.
 */
export function bucketOf(day: string, period: Period): string {
  if (period === 'dia') return day;
  if (period === 'mes') return `${day.slice(0, 7)}-01`;
  const date = dateOf(day);
  if (date === null) return day;
  return shifted(day, -((date.getUTCDay() + 6) % 7));
}

/**
 * The first days of the last `BARS[period]` periods ending with the one `today`
 * is in, oldest first — the bars, left to right.
 */
export function bucketsEnding(today: string, period: Period): readonly string[] {
  const count = BARS[period];
  const last = bucketOf(today, period);
  const starts: string[] = [];
  for (let back = count - 1; back >= 0; back -= 1) {
    if (period === 'dia') starts.push(shifted(last, -back));
    else if (period === 'semana') starts.push(shifted(last, -7 * back));
    else {
      const date = dateOf(last);
      if (date === null) continue;
      starts.push(dayOf(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - back, 1))));
    }
  }
  return starts;
}

/**
 * The first day the read asks for — the first of the month `SALES_MONTHS - 1`
 * months before `today`'s.
 *
 * ⚠️ IT IS THE OLDEST `Mes` BAR, SO THE READ AND THE BARS CANNOT DISAGREE: both
 * come out of `bucketsEnding`.
 */
export function salesSince(today: string): string {
  return bucketsEnding(today, 'mes')[0] ?? today;
}

/**
 * The word under a bar, and the name of the period in the heading.
 *
 * ⚠️ THE MONTH IS `ES.dates.months` CUT TO THREE LETTERS rather than a second
 * list of abbreviations, `formatLedgerDay`'s rule: one list of month names in
 * the app. *sep*, *oct*, *nov* are the abbreviations a Mexican receipt prints.
 */
export function bucketLabel(start: string, period: Period): string {
  const month = ES.dates.months[Number(start.slice(5, 7)) - 1] ?? '';
  const numeral = String(Number(start.slice(8, 10)));
  if (period === 'mes') return month.slice(0, 3);
  if (period === 'dia') return numeral;
  return `${numeral} ${month.slice(0, 3)}`;
}

/** The heading over the table: *hoy*, *esta semana*, *septiembre*, *28 de septiembre*… */
export function periodTitle(start: string, period: Period, today: string): string {
  if (start === bucketOf(today, period)) return ES.numbers.current[period];
  const month = ES.dates.months[Number(start.slice(5, 7)) - 1] ?? '';
  const numeral = Number(start.slice(8, 10));
  if (period === 'mes') return month;
  const day = ES.dates.dayOfMonth(numeral, month);
  return period === 'dia' ? day : ES.numbers.weekOf(day);
}

// ----------------------------------------------------------------------------
// THE BARS AND THE TABLE
// ----------------------------------------------------------------------------

export interface Bar {
  /** The period's first day — also its key, and what a tap selects. */
  readonly start: string;
  readonly label: string;
  readonly centavos: number;
  /**
   * Height as a share of the tallest bar, in `[0, 1]`.
   *
   * ⚠️ A PERIOD THAT NETS BELOW ZERO — more voided than sold, which a void the
   * day after can do — IS DRAWN AT ZERO HEIGHT, not below the axis. The figure
   * under the table still says what it is.
   */
  readonly share: number;
}

/** Gross revenue per period, for the last `BARS[period]` periods, oldest first. */
export function barsOf(days: readonly SoldDay[], period: Period, today: string): readonly Bar[] {
  const starts = bucketsEnding(today, period);
  const totals = new Map<string, number>(starts.map((start) => [start, 0]));
  for (const one of days) {
    const key = bucketOf(one.day, period);
    const sum = totals.get(key);
    if (sum !== undefined) totals.set(key, sum + one.centavos);
  }
  const tallest = Math.max(0, ...totals.values());
  return starts.map((start) => {
    const centavos = totals.get(start) ?? 0;
    return {
      start,
      label: bucketLabel(start, period),
      centavos,
      share: tallest > 0 ? Math.max(0, centavos) / tallest : 0,
    };
  });
}

/** One row of the table. */
export interface ReportRow {
  /** The variant's or the family's id. Never shown. */
  readonly key: string;
  readonly name: string;
  /** `3 kg`, `12 pza` — or `ES.documents.noFigure` when it cannot be said in one unit. */
  readonly quantity: string;
  readonly amount: string;
  readonly centavos: number;
}

export interface Report {
  readonly total: string;
  readonly totalCentavos: number;
  readonly rows: readonly ReportRow[];
}

/** What a group of lines is counted in — decided per group, never per line. */
interface Tally {
  key: string;
  name: string;
  qty: number;
  centavos: number;
  /** The units the lines in this group are SHOWN in, and the bases they are COUNTED in. */
  shown: Set<string>;
  bases: Set<string>;
}

/**
 * The unit a variant's quantity reads in — `shownUnitOf`, the same answer
 * Vender's quantity field gives, so *3 kg* here is *3* in the box she typed it
 * into. A product the catalog no longer carries reads in its base unit.
 */
function unitFor(one: SoldDay, entries: ReadonlyMap<string, CatalogEntry>): string {
  const entry = entries.get(one.variantId);
  return entry === undefined ? one.baseUnit : shownUnitOf(entry);
}

/**
 * `3 kg`, or the dash.
 *
 * ⚠️⚠️ A FAMILY IS SUMMED ONLY WHEN ITS LINES SHARE A DIMENSION, AND C8.5 IS
 * WHY THIS HAS TO ASK. *One family, one dimension* is held by the unit picker
 * and not by the database ([[c85-one-dimension-is-not-enforced]]), so a family
 * CAN hold a product sold by the kilo beside one sold by the piece — and *4.5
 * kg* made of 3 kg and 1.5 pieces is a number that means nothing. So: one shown
 * unit across the group reads in it; one base unit reads in that; otherwise the
 * quantity is the dash and only the money is summed. **Revenue is always
 * additive; quantity is only additive within a dimension.**
 */
function quantityOf(tally: Tally, factors: UnitFactors): string {
  let unit: string | null = null;
  if (tally.shown.size === 1) unit = [...tally.shown][0] ?? null;
  else if (tally.bases.size === 1) unit = [...tally.bases][0] ?? null;
  if (unit === null) return ES.documents.noFigure;
  const figure = qtyShown(tally.qty, unit, factors);
  return figure === null ? ES.documents.noFigure : lineQuantity(figure, unit);
}

/**
 * The table for one period, per product or per family — biggest earner first.
 *
 * ⚠️ THE ORDER IS REVENUE, DESCENDING, AND A TIE IS BROKEN BY NAME WITH A PLAIN
 * `<` — never `localeCompare`, whose collation is `Intl`'s and `R10` admits only
 * what has been measured on a phone. Two products earning the same centavo is
 * rare enough that byte order is a fine answer to which is drawn first.
 */
export function reportOf(
  days: readonly SoldDay[],
  period: Period,
  start: string,
  grouping: Grouping,
  entries: readonly CatalogEntry[],
  factors: UnitFactors,
): Report {
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const tallies = new Map<string, Tally>();
  let total = 0;
  for (const one of days) {
    if (bucketOf(one.day, period) !== start) continue;
    total += one.centavos;
    const key = grouping === 'producto' ? one.variantId : one.familyId;
    let tally = tallies.get(key);
    if (tally === undefined) {
      tally = {
        key,
        name: grouping === 'producto' ? one.variantName : one.familyName,
        qty: 0,
        centavos: 0,
        shown: new Set(),
        bases: new Set(),
      };
      tallies.set(key, tally);
    }
    tally.qty += one.qty;
    tally.centavos += one.centavos;
    tally.shown.add(unitFor(one, byId));
    tally.bases.add(one.baseUnit);
  }
  const rows = [...tallies.values()]
    .filter((tally) => tally.qty !== 0 || tally.centavos !== 0)
    .sort((a, b) =>
      b.centavos !== a.centavos ? b.centavos - a.centavos : a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
    )
    .map((tally) => ({
      key: tally.key,
      name: tally.name,
      quantity: quantityOf(tally, factors),
      amount: shownAmount(tally.centavos),
      centavos: tally.centavos,
    }));
  return { total: shownAmount(total), totalCentavos: total, rows };
}

// ----------------------------------------------------------------------------
// ⚠️ INICIO'S HOOKS (`8g`, the owner's set of 2026-10-16) — *tu mejor viernes*
// and *la racha* — read off the SAME six months Números already holds, so they
// cost no second read. Pure, and `app/test/inicio-ganchos.test.ts` reads them.
// ----------------------------------------------------------------------------

/** Each day's takings, summed over every product, in centavos. */
export function dayTotals(days: readonly SoldDay[]): ReadonlyMap<string, number> {
  const totals = new Map<string, number>();
  for (const d of days) totals.set(d.day, (totals.get(d.day) ?? 0) + d.centavos);
  return totals;
}

/**
 * The best day with `today`'s weekday, BEFORE today — the owner's *tu mejor
 * viernes*. `null` when the shop has never sold on that weekday.
 */
export function bestSameWeekday(days: readonly SoldDay[], today: string): number | null {
  const now = dateOf(today);
  if (now === null) return null;
  let best: number | null = null;
  for (const [day, centavos] of dayTotals(days)) {
    const date = dateOf(day);
    if (date === null || day >= today || date.getUTCDay() !== now.getUTCDay() || centavos <= 0) continue;
    if (best === null || centavos > best) best = centavos;
  }
  return best;
}

/**
 * Days in a row with at least one sale — the owner's *racha*. ⚠️ IT ENDS TODAY
 * WHEN TODAY HAS SOLD, AND YESTERDAY OTHERWISE: at eight in the morning a streak
 * is not broken because the first customer has not come yet. `soldToday` is
 * `useToday`'s count, the server's own answer for today.
 *
 * ⚠️⚠️ `null` DAYS IS A `null` STREAK — `8g`, 2026-10-20, the offline report's
 * round 3 (the owner's *"Do all the fixes"*). Today's takings are kept on the
 * phone and the six months are not, so offline after a restart a shop thirty
 * days into a streak read *1 día seguido*: today, counted against a history
 * nothing had read. Unread history (`historyOf`) is no streak to draw at all.
 */
export function salesStreak(days: readonly SoldDay[] | null, today: string, soldToday: boolean): number | null {
  if (days === null) return null;
  const sold = new Set<string>();
  for (const [day, centavos] of dayTotals(days)) if (centavos > 0) sold.add(day);
  if (soldToday) sold.add(today);
  let day = soldToday ? today : shifted(today, -1);
  let streak = 0;
  while (sold.has(day)) {
    streak += 1;
    day = shifted(day, -1);
  }
  return streak;
}

/** The last seven days, oldest first and today last: did each one sell? */
export function lastSevenDays(days: readonly SoldDay[], today: string, soldToday: boolean): readonly boolean[] {
  const totals = dayTotals(days);
  const out: boolean[] = [];
  for (let back = 6; back >= 0; back -= 1) {
    const day = shifted(today, -back);
    out.push(back === 0 ? soldToday || (totals.get(day) ?? 0) > 0 : (totals.get(day) ?? 0) > 0);
  }
  return out;
}

/** The streaks worth a celebration — the owner's drawing: 7, 30 and 100 days. */
export const STREAK_MILESTONES = [7, 30, 100] as const;

export function isStreakMilestone(streak: number): boolean {
  return (STREAK_MILESTONES as readonly number[]).includes(streak);
}
