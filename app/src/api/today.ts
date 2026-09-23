// ============================================================================
// WHAT THE SHOP TOOK TODAY, AS A CONTRACT WITH POSTGRES. Plan task `5d-iv-a`,
// and the twelfth module of `src/api/` — ADR-035 §2.11's boundary, `R12`, `R13`.
//
// ⚠️ IT IS THE READ §2.8's HOME ROW HAS ASKED FOR SINCE THE ADR WAS WRITTEN AND
// NOTHING IN THIS APP HAS EVER PERFORMED. `sale` has been applied since `0003`;
// every screen built so far is about getting into a shop or about what the shop
// sells, and not one line has asked what it SOLD. `5d-iv-b` draws the answer.
// This file ships no screen.
//
// ⚠️ EVERYTHING WITH A RIGHT ANSWER IS IN HERE AND NOTHING THAT TALKS — the
// split `workspace.ts` established and `catalog.ts` repeated. `@/api/calls`
// imports the live client and can never be loaded by the node suite, so the
// column list, the day boundary and the arithmetic live on this side of the
// line, where `app/test/api-today.test.ts` reads them.
//
// ----------------------------------------------------------------------------
// ⚠️⚠️ THE ONE DECISION HERE THAT WOULD HAVE GONE IN WRONG SILENTLY: WHEN IS
// TODAY — AND THE ANSWER IS NOT THE ONE `0012` WOULD SUGGEST.
// ----------------------------------------------------------------------------
// A trading day is LOCAL, and `0012` made the shop what makes it local: it put
// `timezone` on `location` on 2026-08-20 rather than leave the constant in two
// views, and `product_margin_daily` buckets on
// `(s.occurred_at at time zone l.timezone)::date`. The obvious design is
// therefore to read that column and convert on the device.
//
// ⚠️⚠️ THAT DESIGN IS FORBIDDEN TODAY, AND BY THIS REPOSITORY'S OWN RULES RATHER
// THAN BY TASTE. Turning an IANA NAME into an instant needs
// `Intl.DateTimeFormat`, and:
//
//   * `R5` allows NO `Intl.` outside `src/format/mxn.ts` at all, and
//   * `R10` is an ALLOW-LIST of `format` and `resolvedOptions` — the only two
//     ECMA-402 names measured on BOTH runtimes. `DateTimeFormat` is recorded
//     there as *"a function on Android and unasked on iOS"*, which is exactly
//     the state `formatToParts` was in on 2026-09-13 when it terminated this app
//     on the splash screen of the owner's own iPhone.
//
// So this module uses the DEVICE's own midnight, which needs no `Intl` and no
// table — and it is the same call `catalog.ts`'s `isoDay` already made for the
// price window four hours earlier, for the same reason: THE PHONE IS IN THE
// SHOP, so the device's day is the shop's day. Two answers to *what day is it*
// in one app would be the defect this repository has recorded eight shapes of.
//
// ⚠️ WHAT IT COSTS, NAMED RATHER THAN DISCOVERED: for a phone whose zone is not
// its shop's — an owner abroad, or a future store in Hermosillo against a head
// office in Guadalajara — this figure and `product_velocity_daily` will bucket
// differently, and nothing in this repository would say so. C1.5 puts both pilot
// shops in one location each and `location.timezone` defaults to
// `America/Mexico_City`, so the two agree for every shop that exists. **The day
// that stops being true, the fix is a measurement first** — `Intl.DateTimeFormat`
// on an iPhone and on an Android, the `5a-iv-c-2` shape — and only then a code
// change. Adding an ECMA-402 name is not a code change; it is a measurement plus
// a code change.
//
// ----------------------------------------------------------------------------
// ⚠️⚠️ AND A VOID IS TWO ROWS, NOT A DELETED ONE — WHICH THE FIGURE SURVIVES AND
// THE COUNT DOES NOT.
// ----------------------------------------------------------------------------
// `0021` answers a void by INSERTING a second `sale` with negated totals and
// `reversal_of` pointing at the first. So a sum over the window self-corrects and
// needs no special case; a `count(*)` does not, and would tell a shopkeeper she
// made **2 ventas** on a morning when she rang one up and undid it. That is the
// app doing bookkeeping at her, which is the one thing this product refuses.
// `takingsFrom` below counts the documents that STAND.
// ============================================================================

import { SCALE, parseDecimal } from '@tienda/money';

import type { ApiMessageKey } from '@/api/errors';
import { ES } from '@/strings';

/**
 * The columns a client may ask `sale` for.
 *
 * ⚠️ NAMED AND NEVER `*` (`R13`). A `select=*` would ship `payload_hash`,
 * `created_by`, `recorded_offline` and `reversal_reason` to a phone that renders
 * none of them — and `created_by` in particular is who rang the sale up, which
 * no screen in this pilot shows and §2.7 gives nobody a reason to.
 *
 * ⚠️⚠️ `::text` ON BOTH MONEY COLUMNS, AND IT IS THE DIFFERENCE BETWEEN A PESO
 * FIGURE AND A DOUBLE. `total_net` and `total_tax` are `numeric(12,2)`;
 * PostgREST sends a bare numeric as a JSON NUMBER and `JSON.parse` makes that a
 * double. `@tienda/money`'s `parseDecimal` REFUSES a number argument outright
 * for exactly this reason, so the cast is what lets the money path start from
 * the same digits Postgres stored. The same trap `catalog.ts` measured on
 * `price_per_base` the same day.
 *
 * ⚠️ `id` AND `reversal_of` ARE HERE FOR THE COUNT AND NOT FOR DISPLAY. Nothing
 * renders either; `takingsFrom` needs them to tell a document that stands from
 * one that was undone.
 */
export const SALE_COLUMNS = 'id,total_net::text,total_tax::text,reversal_of';

/**
 * The column the day window filters on — spelled once, here.
 *
 * ⚠️⚠️ `occurred_at` AND NEVER `recorded_at`. The pilot store is offline half the
 * day, which is why `5c` exists at all: a sale rung up at 17:00 and synced at
 * 21:00 belongs to 17:00, and `0003` accepts the client's value clamped to
 * `[now() - 72h, now()]` for precisely this. Bucketing on `recorded_at` would
 * move a shop's whole afternoon into the evening it got its signal back, and the
 * shopkeeper reconciling her till at close would be the one to find out.
 */
export const TODAY_COLUMN = 'occurred_at';

/** The query key today's takings cache under. */
export const TODAY_KEY = ['today', 'takings'] as const;

/** A `sale` row as PostgREST sends it, under `SALE_COLUMNS`. */
export interface SaleRow {
  readonly id: string;
  readonly total_net: string;
  readonly total_tax: string;
  readonly reversal_of: string | null;
}

/** What Inicio puts above everything tappable. */
export interface Takings {
  /** Gross of IVA, in integer centavos — or `null` when a row could not be read. */
  readonly grossCentavos: number | null;
  /** How many sale documents STAND today. Never `null`: a count is not lossy. */
  readonly count: number;
  /** False when a row was unreadable and the figure is therefore withheld. */
  readonly complete: boolean;
}

/**
 * The instant today began, for the phone holding this app.
 *
 * ⚠️ NO `Intl`, WHICH IS THE WHOLE CONSTRAINT — see this file's header. `new
 * Date(y, m, d)` constructs at local midnight and `toISOString()` renders the
 * UTC instant PostgREST compares against, and both are ES5 rather than ECMA-402.
 *
 * ⚠️ IT TAKES `now` RATHER THAN READING THE CLOCK (`R3`). A function that calls
 * `new Date()` itself cannot be asserted at a boundary, and every interesting
 * case here IS a boundary.
 */
export function dayStartISO(now: Date): string {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).toISOString();
}

/**
 * Today's takings and today's count, out of the rows the window already
 * narrowed.
 *
 * ⚠️⚠️ THE WINDOW IS THE QUERY'S AND IS NOT REPEATED HERE, WHICH IS A DECISION
 * AND NOT AN OMISSION — the rule `catalog.ts` wrote down for the price window and
 * the reason its contract check exists. A second copy of *"which rows are
 * today's"* in TypeScript would be a second answer to it. The database applies
 * the filter; `docs/checks/5d-iv-a-takings-contract.sh` drives a sale from
 * yesterday and a sale from this morning past a real PostgREST and asserts
 * exactly one comes back.
 *
 * ⚠️ GROSS SUMS EVERY ROW, REVERSALS INCLUDED, AND THAT IS WHAT MAKES IT
 * SELF-CORRECTING. `0021` negates the totals, so a sale voided in the same
 * trading day contributes zero without this function knowing anything about
 * voids. A sale voided the NEXT day leaves today whole and takes the money off
 * tomorrow — which is not an approximation, it is what
 * `product_margin_daily` does on the server, and the two agreeing is worth more
 * than either being clever.
 *
 * ⚠️ THE COUNT IS THE DOCUMENTS THAT STAND: not a reversal, and not reversed by
 * one in this window. See the header — *2 ventas* after one sale and one undo is
 * the app doing bookkeeping at a shopkeeper.
 *
 * ⚠️⚠️ AN UNREADABLE ROW WITHHOLDS THE FIGURE RATHER THAN SHRINKING IT — the rule
 * `5c-iv-b` established for the dead-letter banner's peso figure, and the reason
 * is the same: a sum that quietly drops a line it could not parse is a SMALLER
 * NUMBER INDISTINGUISHABLE FROM A CORRECT ONE, and this one gets compared against
 * the cash in the till. The count is never lossy, so it stands alone.
 *
 * ⚠️⚠️ AND *NO ROWS READ* IS NOT *ZERO ROWS*, WHICH IS THE DISTINCTION THIS
 * SCREEN NEEDS AND PRODUCTOS DID NOT. `undefined` is what TanStack holds while a
 * read is in flight AND what it holds after one has failed; an empty ARRAY is a
 * shop that has genuinely sold nothing yet this morning. Collapsing the two puts
 * a confident **$0.00** at the top of Inicio on a phone that could not reach the
 * database — a number a shopkeeper would act on, and the same shape as the
 * *Cargando productos…* the owner found on his own phone on 2026-09-22, except
 * that this one does not look like it is waiting for anything.
 */
export function takingsFrom(rows: readonly SaleRow[] | null | undefined): Takings {
  if (rows === null || rows === undefined) {
    return { grossCentavos: null, count: 0, complete: false };
  }
  const all = rows;

  const reversed = new Set<string>();
  for (const row of all) {
    if (row.reversal_of !== null) reversed.add(row.reversal_of);
  }

  let count = 0;
  for (const row of all) {
    if (row.reversal_of === null && !reversed.has(row.id)) count += 1;
  }

  let gross = 0;
  for (const row of all) {
    const net = centavos(row.total_net);
    const tax = centavos(row.total_tax);
    if (net === null || tax === null) return { grossCentavos: null, count, complete: false };
    gross += net + tax;
  }

  return { grossCentavos: gross, count, complete: true };
}

/**
 * One `numeric(12,2)` as integer centavos, or `null` when it is not a decimal
 * string this app can be exact about.
 *
 * ⚠️ IT CATCHES RATHER THAN PROPAGATES, and the caller is what decides what a
 * failure means. `parseDecimal` throws on a number, on an exponent and on more
 * decimals than the column holds — all three of which are a wire that stopped
 * matching `SALE_COLUMNS`, not a shop's data being odd. Throwing from here would
 * turn Inicio's figure into an error boundary; returning `null` lets
 * `takingsFrom` withhold one number and keep the other.
 */
function centavos(text: string): number | null {
  try {
    return parseDecimal(text, SCALE.money);
  } catch {
    return null;
  }
}

/**
 * The one line under Inicio's peso figure — `catalogLine`'s shape, and the
 * fourth state is what makes it a different function. Plan task `5d-iv-b`.
 *
 * ⚠️⚠️ FOUR FACTS AND NOT THREE, IN THE ORDER A READ FAILS IN. A read that
 * FAILED and a read still IN FLIGHT are the pair the owner found on his own
 * phone on 2026-09-22 — *Cargando productos…* for ever, because `loading` is
 * `data === undefined` and so is a failure. The fourth is this module's own:
 * `takingsFrom` WITHHOLDS the figure when a row will not parse, and a screen
 * that printed the count beside a blank space would be reporting a total of
 * nothing.
 *
 * ⚠️ AN UNREADABLE ROW TAKES THE COUNT DOWN WITH THE FIGURE, AND THAT IS A
 * DECISION RATHER THAN AN OMISSION — `takingsFrom` still returns a count, and
 * this chooses not to print it. *3 ventas* above a blank space where the pesos
 * should be invites exactly one reading, *three sales that brought in nothing*,
 * which is a shopkeeper doing arithmetic about a wire format. One sentence
 * replaces both numbers, and `complete` is what chooses.
 */
export function takingsLine(
  loading: boolean,
  failed: ApiMessageKey | null,
  takings: Takings,
): string {
  if (failed !== null) return ES.api.errors[failed];
  if (loading) return ES.home.loading;
  if (!takings.complete) return ES.home.partial;
  return ES.home.sales(takings.count);
}

/**
 * Does the peso figure get drawn at all?
 *
 * ⚠️ IT IS `grossCentavos !== null` AND NOTHING CLEVERER, AND IT IS A FUNCTION
 * SO THAT THE SCREEN DOES NOT HAVE TO KNOW THAT. `takingsFrom` already decided
 * — in flight, failed and unreadable all withhold — and a `!== null` typed into
 * `index.tsx` would be that rule's second home, on the one screen where the
 * number is compared against the cash in the till.
 *
 * ⚠️⚠️ IT IS A TYPE GUARD, AND THAT IS LOAD-BEARING RATHER THAN TIDY. Returning
 * a plain `boolean` leaves `grossCentavos` typed `number | null` on the far side
 * of the check, so the screen has to write `?? 0` to satisfy the compiler — a
 * fallback that can never fire until the day it does, and whose value is a
 * confident **$0.00** at the top of Inicio. The guard removes the place that
 * zero could be typed.
 */
export function showsTakings<T extends Takings>(
  takings: T,
): takings is T & { readonly grossCentavos: number } {
  return takings.grossCentavos !== null;
}
