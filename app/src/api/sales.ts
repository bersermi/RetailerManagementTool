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
// cashier reading it. So a cashier sees her own stores' sales **by policy**,
// and this module carries no role at all.
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
// ⚠️ THE VIEW'S `day` IS ALREADY THE STORE'S LOCAL DATE (`0031`: `occurred_at at
// time zone l.timezone`), so the bucketing below is calendar arithmetic on a
// date string and never touches an instant. That is why it can use `Date.UTC`
// freely: a date with no time in it has no timezone to get wrong.
//
// ----------------------------------------------------------------------------
// ⚠️ A VOID NETS, IT DOES NOT VANISH
// ----------------------------------------------------------------------------
// `void_transaction` (`0021`) inserts a mirror sale with NEGATIVE lines, stamped
// at the moment of the void, so the view's sums already net. A sale voided the
// same day contributes nothing to that day; one voided the next day is a plus
// on one day and a minus on the next, and every week or month containing both
// is right. **A product whose whole period nets to nothing is dropped from the
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
import { lineQuantity, shownAmount } from '@/api/documents';
import type { ApiMessageKey } from '@/api/errors';
import { qtyShown, shownUnitOf } from '@/cart/quantity';
import { ES } from '@/strings';

/** The view the rows come off. Spelled once (`R13`). */
export const SALES_VIEW = 'product_velocity_daily';

/**
 * The columns a client may ask the view for.
 *
 * ⚠️ NAMED AND NEVER `*` (`R13`). The view carries twenty-odd columns — the
 * trailing windows, `days_since_last_sale`, `store_traded` — and this screen
 * draws none of them. ⚠️ **`revenue_gross` AND NOT `revenue_net`**: §2.9, ruled
 * 2026-09-14 — gross is the figure that reconciles against the cash in the till.
 *
 * ⚠️⚠️ BOTH FIGURES ARE `::text`, `SALE_COLUMNS`' MEASURED REASON: a bare
 * `numeric` arrives as a JSON number, which is a double, and `parseDecimal`
 * refuses a number outright.
 *
 * ⚠️ `base_unit_code` IS READ AND IS NOT TRUSTED ON ITS OWN. `@/api/catalog`'s
 * `UnitBases` records that the variant's column says `250g` on every product
 * this app created, while `qty_base_sold` is really in grams — so the code is
 * looked up in the unit table before it names anything. It is only needed for a
 * product the catalog no longer lists (a retired one), which is the one case the
 * catalog cannot answer.
 */
export const SALES_COLUMNS =
  'day,variant_id,variant_name,family_id,family_name,base_unit_code,qty_base_sold::text,revenue_gross::text';

/** The column the window is filtered and ordered on — the store's own date. */
export const SALES_DAY_COLUMN = 'day';

/**
 * The column that says a sale line exists on that row.
 *
 * ⚠️⚠️ THE VIEW IS A SPINE AND NOT A LIST OF SALES. `0014` gives every product
 * the store has ever stocked a row for EVERY day from its first stock to the
 * store's last trading day, sold or not — so without this filter the read is
 * products × days, which in a real shop is tens of thousands of zeros. `gt.0`
 * on `line_count` keeps exactly the rows with a sale line, **including a day
 * whose only line is a void**, which is what makes the netting above right.
 */
export const SALES_ACTIVE_COLUMN = 'line_count';

/**
 * The tie-breakers after `SALES_DAY_COLUMN`, in order.
 *
 * ⚠️⚠️ THE ORDER EXISTS FOR THE PAGING AND NOT FOR THE SCREEN. `(day,
 * variant_id, location_id)` is the view's grain, so this order is TOTAL — and a
 * paged read over an order with ties can return one row twice and skip another,
 * silently, whenever the planner breaks a tie differently between two pages.
 */
export const SALES_TIEBREAK: readonly string[] = ['variant_id', 'location_id'];

/**
 * How many rows one request asks for.
 *
 * ⚠️⚠️ BELOW `max_rows`, ON PURPOSE. PostgREST caps every response at
 * `max_rows` (1000 in `supabase/config.toml`) and **truncates without an
 * error**. The read stops when a page comes back short, so a page size ABOVE the
 * cap would stop after the first page every time and report a partial six
 * months as the whole of it. At half the cap, a short page can only mean the end.
 */
export const SALES_PAGE = 500;

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

/** One row, as PostgREST sends it. */
export interface SalesRow {
  readonly day: string;
  readonly variant_id: string;
  readonly variant_name: string;
  readonly family_id: string;
  readonly family_name: string;
  readonly base_unit_code: string;
  readonly qty_base_sold: string;
  readonly revenue_gross: string;
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
    });
  }
  return { state: days.length === 0 ? 'nothing' : 'sales', days };
}

/**
 * The sentence that replaces the report, or `''` when the report is the answer.
 *
 * ⚠️ `unknown` WITH NO FAILURE IS `''` AND THE CALLER SHOWS A SPINNER —
 * `costsLine`'s rule. A failure is the `ES.api` sentence, never *no sales*: a
 * shop told it sold nothing on a phone that simply had no signal is the exact
 * lie `takingsFrom` was written to refuse.
 */
export function salesLine(state: SalesState, failed: ApiMessageKey | null): string {
  if (failed !== null) return ES.api.errors[failed];
  if (state === 'unreadable') return ES.api.errors.unknown;
  if (state === 'nothing') return ES.numbers.nothing;
  return '';
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
