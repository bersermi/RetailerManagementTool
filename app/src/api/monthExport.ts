// ============================================================================
// THE RAW ROWS — A MONTH OF WHAT HAPPENED, HANDED OVER AS A FILE. Plan task
// `7d`, and the first read in this app of `public.transaction_export` (`0033`),
// applied since 2026-09-14 and never called until this row.
//
// Área 9's `A1`, in the owner's words: *"a download of the transactions
// breakdown — all transactions and waste for a given month."* ADR-035 §2.9:
// *"it is what an owner who has always used a notebook checks the app against."*
//
// ⚠️ NO SCREEN AND NO COMPONENT — the `5g-iii` shape. The read's contract, the
// month arithmetic, the parse, the CSV and the PDF's HTML all have a right
// answer, so they are here (and in `@/export/monthFile`) where
// `app/test/api-month-export.test.ts` reads them, and
// `docs/checks/7d-month-export-contract.sh` puts the read in front of a real
// database. `@/export/share` is the only native half.
//
// ----------------------------------------------------------------------------
// ⚠️⚠️ THREE RULINGS OF 2026-09-28, ASKED BEFORE A LINE WAS WRITTEN
// ----------------------------------------------------------------------------
//   * **BOTH FORMATS** — a CSV a spreadsheet can sum, and a PDF a person reads.
//   * **NO DOWNLOAD FOR A CASHIER.** `0033` fences the view in its own BODY to
//     `has_role('manager')` — *"a partial export is worse than no export"* — so a
//     staff caller reads ZERO rows. `canExport` follows that applied fence rather
//     than leading it (`canReadMemory`'s rule), and the control is not drawn for
//     her. Widening it is a migration and the owner's to ask for.
//   * **A SEPARATE MONTH PICKER**, independent of the chart's bars — `monthShift`
//     and `isLatestMonth` are its arithmetic.
//
// ----------------------------------------------------------------------------
// ⚠️⚠️ WHAT IS DELIBERATELY NOT IN THE FILE
// ----------------------------------------------------------------------------
//   * `unit_cost_net_per_base` — WHAT A WRITE-OFF COST. It is the column that
//     fences the view, and área 9's constraint (2026-09-18) is that waste is
//     shown as QUANTITY, never as cost: on a despiece a shortfall lot's cost is
//     ZERO (C8.6), so a column of it would say throwing away `Pechuga` cost
//     nothing. `EXPORT_COLUMNS` never asks for it, so it never reaches a phone.
//   * `unit_price_net_per_base` — it is per BASE unit, which is per GRAM on a
//     product sold by the kilo: `0.080000` beside *1.5 kg* is a number a
//     shopkeeper cannot read. Quantity and the line's money are enough to
//     divide, and nothing is derived that the ledger did not store.
//   * `created_by` AS A UUID. It is resolved to the member's `display_name`
//     (`0034`), including a member no longer active — this is history.
//   * TOTALS IN THE CSV. `0033`: *"sum within a kind, never across"* — a sale, a
//     delivery and a write-off are three directions of money, and a total row in
//     a spreadsheet is summed with everything above it.
// ============================================================================

import { SCALE, parseDecimal } from '@tienda/money';

import type { ApiMessageKey } from '@/api/errors';
import { ROLES, type MemberRow, type Role } from '@/api/members';
import { isWasteReason, reasonLabel, type WasteReason } from '@/api/waste';
import { ES } from '@/strings';

/** The view the rows come off. Spelled once (`R13`). */
export const EXPORT_VIEW = 'transaction_export';

/**
 * The columns a client may ask the view for.
 *
 * ⚠️ NAMED AND NEVER `*` (`R13`) — and the reason is sharper here than anywhere
 * else in this app: `*` would carry `unit_cost_net_per_base` to the phone. See
 * the header.
 *
 * ⚠️⚠️ EVERY FIGURE IS `::text`, `SALE_COLUMNS`' MEASURED REASON: a bare
 * `numeric` arrives as a JSON number, which is a double, and `parseDecimal`
 * refuses a number outright.
 */
export const EXPORT_COLUMNS =
  'kind,document_id,line_id,day,occurred_at,is_reversal,created_by,location_name,provider_name,variant_name,family_name,qty_display::text,qty_display_unit,line_net::text,tax_amount::text,line_gross::text,waste_reason,expiry_date';

/** The column a month is filtered on — the STORE's own date (`0033`'s comment says so). */
export const EXPORT_DAY_COLUMN = 'day';

/**
 * The tie-breakers after `EXPORT_DAY_COLUMN`, in order, all ascending.
 *
 * ⚠️⚠️ THE ORDER IS TOTAL BECAUSE THE READ PAGES — `SALES_TIEBREAK`'s reason. A
 * line's id is unique within its kind, so `(kind, line_id)` alone is a key;
 * `occurred_at` and `document_id` come first so the file reads in the order
 * things happened, with a document's lines together.
 */
export const EXPORT_TIEBREAK: readonly string[] = ['occurred_at', 'kind', 'document_id', 'line_id'];

/**
 * How many rows one request asks for. ⚠️ BELOW `max_rows` (1000), `SALES_PAGE`'s
 * reason: PostgREST truncates without an error, and the read stops at the first
 * short page — at half the cap, a short page can only mean the end.
 */
export const EXPORT_PAGE = 500;

/** The kinds, in the order the PDF draws them — `0033`'s `kind` values. */
export const EXPORT_KINDS = ['sale', 'purchase', 'waste'] as const;
export type ExportKind = (typeof EXPORT_KINDS)[number];

function isExportKind(value: unknown): value is ExportKind {
  return typeof value === 'string' && (EXPORT_KINDS as readonly string[]).includes(value);
}

/**
 * May the person holding this phone download the month?
 *
 * ⚠️ IT IS NOT `canWriteProviders` AND MUST NOT BE ALIASED TO IT, the lesson
 * `canReadMemory` paid for: two predicates that answer *manager and above* today
 * are two different questions. This one is `0033`'s body predicate.
 *
 * ⚠️ `null` IS "NOT KNOWN" AND IS FENCED OUT, `roleOf`'s distinction — a control
 * drawn before the membership read lands would hand her an empty file.
 */
export function canExport(role: Role | null): boolean {
  if (role === null) return false;
  return ROLES.indexOf(role) <= ROLES.indexOf('manager');
}

// ----------------------------------------------------------------------------
// THE MONTH
// ----------------------------------------------------------------------------

/** `YYYY-MM-01` — the month a day is in. The picker's value is always this shape. */
export function monthOf(day: string): string {
  return `${day.slice(0, 7)}-01`;
}

/**
 * `month` moved by `by` months — negative goes back.
 *
 * ⚠️ ARITHMETIC ON THE TWO NUMBERS AND NEVER A `Date`, which would put a
 * timezone into a value that has none. December plus one is next January.
 */
export function monthShift(month: string, by: number): string {
  const index = Number(month.slice(0, 4)) * 12 + (Number(month.slice(5, 7)) - 1) + by;
  const year = Math.floor(index / 12);
  const m = index - year * 12 + 1;
  return `${String(year).padStart(4, '0')}-${String(m).padStart(2, '0')}-01`;
}

/**
 * Is `month` the one `today` is in? The picker cannot step past it — a month
 * that has not started has nothing in it, and offering it is offering an empty
 * file.
 */
export function isLatestMonth(month: string, today: string): boolean {
  return month >= monthOf(today);
}

/**
 * The half-open window a month is read over: `day >= from` and `day < to`.
 *
 * ⚠️ `lt` THE NEXT MONTH'S FIRST, NEVER `lte` A LAST DAY, so there is no
 * 28-29-30-31 table to get wrong.
 */
export function monthRange(month: string): { readonly from: string; readonly to: string } {
  return { from: month, to: monthShift(month, 1) };
}

/** *septiembre 2026* — the picker's label, the PDF's heading. */
export function monthTitle(month: string): string {
  const name = ES.dates.months[Number(month.slice(5, 7)) - 1] ?? '';
  return `${name} ${month.slice(0, 4)}`;
}

/**
 * The file's name: `movimientos-2026-09.csv`.
 *
 * ⚠️ THE MONTH AS DIGITS AND NOT AS A WORD, so a folder of them sorts in time
 * order — the one place the machine-shaped label is the right one.
 */
export function exportFileName(month: string, extension: 'csv' | 'pdf'): string {
  return `${ES.monthExport.fileStem}-${month.slice(0, 7)}.${extension}`;
}

/**
 * The query key a month's rows cache under.
 *
 * ⚠️ THE MONTH IS IN IT, `costsKey`'s rule applied to time. ⚠️ AND IT IS NOT IN
 * `PERSISTED_KEYS` — `@/api/persist` is an allow-list, so a month of the ledger
 * never lands on the phone's disk.
 */
export function exportKey(month: string): readonly unknown[] {
  return ['export', 'month', month];
}

// ----------------------------------------------------------------------------
// THE ROWS
// ----------------------------------------------------------------------------

/** One row, as PostgREST sends it. */
export interface ExportRow {
  readonly kind: string;
  readonly document_id: string;
  readonly line_id: string;
  readonly day: string;
  readonly occurred_at: string;
  readonly is_reversal: boolean;
  readonly created_by: string | null;
  readonly location_name: string;
  readonly provider_name: string | null;
  readonly variant_name: string;
  readonly family_name: string;
  readonly qty_display: string;
  readonly qty_display_unit: string;
  readonly line_net: string;
  readonly tax_amount: string;
  readonly line_gross: string;
  readonly waste_reason: string | null;
  readonly expiry_date: string | null;
}

/** One line of the file, parsed. */
export interface ExportLine {
  readonly kind: ExportKind;
  readonly documentId: string;
  /** The store's own date, as the view computed it. */
  readonly day: string;
  /** `HH:MM` on this phone's clock — see `hourOf`. `''` when the instant is unreadable. */
  readonly hour: string;
  readonly store: string;
  readonly isReversal: boolean;
  readonly createdBy: string | null;
  readonly provider: string | null;
  readonly product: string;
  readonly family: string;
  /** What the operator typed, as it was stored. */
  readonly qty: string;
  readonly unit: string;
  /** Integer centavos (`R5`). */
  readonly net: number;
  readonly tax: number;
  readonly gross: number;
  readonly reason: WasteReason | null;
  readonly expiry: string | null;
}

/**
 * `unknown` — the read is out, or failed; `unreadable` — a figure or a kind in
 * it did not parse; `nothing` — the month holds no line; `lines` — a file.
 */
export type ExportState = 'unknown' | 'unreadable' | 'nothing' | 'lines';

export interface MonthExport {
  readonly state: ExportState;
  readonly lines: readonly ExportLine[];
}

/**
 * The hour a document happened, on this phone's clock — `HH:MM`.
 *
 * ⚠️ THE DEVICE'S LOCAL GETTERS AND NO `Intl` (`R10`), `@/api/documents`'
 * `dayOf` rule. The view's `day` is in the STORE's timezone and this hour is in
 * the PHONE's; C1.5 puts each pilot shop at one store, and the phone is in it.
 */
export function hourOf(at: string): string {
  if (typeof at !== 'string' || at === '') return '';
  const when = new Date(at);
  if (!Number.isFinite(when.getTime())) return '';
  const h = String(when.getHours()).padStart(2, '0');
  const m = String(when.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * The rows, parsed — or a state saying why there is no file.
 *
 * ⚠️⚠️ ONE UNPARSABLE FIGURE WITHHOLDS THE WHOLE FILE — `salesFrom`'s rule, and
 * sharper here: this is the document somebody reconciles a notebook against. A
 * dropped row is a month that is short by a line nobody can see is missing.
 */
export function exportFrom(rows: readonly ExportRow[] | null | undefined): MonthExport {
  if (rows === null || rows === undefined) return { state: 'unknown', lines: [] };
  const lines: ExportLine[] = [];
  for (const row of rows) {
    if (!isExportKind(row.kind)) return { state: 'unreadable', lines: [] };
    let net: number;
    let tax: number;
    let gross: number;
    try {
      net = parseDecimal(row.line_net, SCALE.money);
      tax = parseDecimal(row.tax_amount, SCALE.money);
      gross = parseDecimal(row.line_gross, SCALE.money);
    } catch {
      return { state: 'unreadable', lines: [] };
    }
    lines.push({
      kind: row.kind,
      documentId: row.document_id,
      day: row.day,
      hour: hourOf(row.occurred_at),
      store: row.location_name,
      isReversal: row.is_reversal === true,
      createdBy: row.created_by,
      provider: row.provider_name,
      product: row.variant_name,
      family: row.family_name,
      qty: row.qty_display,
      unit: row.qty_display_unit,
      net,
      tax,
      gross,
      // ⚠️ A CAUSE THE APP DOES NOT KNOW IS `null` AND THE LINE STAYS. An enum
      // member added by a later migration is still a line that happened; the
      // file says less about it rather than dropping it.
      reason: isWasteReason(row.waste_reason) ? row.waste_reason : null,
      expiry: row.expiry_date,
    });
  }
  return { state: lines.length === 0 ? 'nothing' : 'lines', lines };
}

/**
 * The sentence that replaces the download, or `''` when there is a file.
 *
 * ⚠️ A FAILED READ SAYS SO AND NEVER *nothing this month* — `salesLine`'s rule:
 * a shop told it did nothing in September on a phone that simply had no signal
 * is the exact lie `takingsFrom` was written to refuse.
 */
export function exportLine(state: ExportState, failed: ApiMessageKey | null, month: string): string {
  if (failed !== null) return ES.api.errors[failed];
  if (state === 'unreadable') return ES.api.errors.unknown;
  if (state === 'nothing') return ES.monthExport.nothing(monthTitle(month));
  return '';
}

/**
 * Who wrote a document, by name — or `''`.
 *
 * ⚠️ NOT `nameOf`, WHICH REFUSES AN INACTIVE MEMBER — right for *who is signed
 * in*, wrong for history: the cashier who left in August still rang up August's
 * sales. ⚠️ `''` and never the uuid: a raw id is a string a shopkeeper cannot
 * read and would have to ask about.
 */
export function whoOf(members: readonly MemberRow[] | null | undefined, userId: string | null): string {
  if (members === null || members === undefined || userId === null) return '';
  const row = members.find((one) => one.user_id === userId);
  const name = row?.display_name?.trim() ?? '';
  return name;
}

/** The unit's word — `ES.units`, or the code itself when the table has none. */
export function unitWordOf(code: string): string {
  const words: Readonly<Record<string, string>> = ES.units;
  return words[code] ?? code;
}

/**
 * The short form of a document's id — its first eight characters, upper case.
 *
 * ⚠️ IT EXISTS SO A READER CAN SEE WHICH LINES WERE ONE SALE, which a flat file
 * otherwise cannot say. Eight hex characters is one in four billion per pair,
 * and a month in a small shop is hundreds of documents.
 */
export function shortDocument(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

/**
 * Centavos as a plain decimal a spreadsheet can sum: `1234.50`, `-36.00`.
 *
 * ⚠️ NO `$` AND NO THOUSANDS SEPARATOR, deliberately unlike `formatMXN`: a cell
 * reading `$1,234.50` is TEXT to half the spreadsheets a shopkeeper might open
 * it in, and a column of text sums to zero.
 *
 * ⚠️ THE POINT IS PLACED IN THE DIGITS AND NEVER BY A DIVISION — `R5`: a
 * division by a hundred is how an exact integer becomes a double.
 */
export function plainAmount(centavos: number): string {
  const sign = centavos < 0 ? '-' : '';
  const digits = String(Math.abs(Math.trunc(centavos))).padStart(3, '0');
  return `${sign}${digits.slice(0, -2)}.${digits.slice(-2)}`;
}

/** The word for a line's kind — *Venta*, *Compra*, *Desperdicio*. */
export function kindWord(kind: ExportKind): string {
  return ES.monthExport.kind[kind];
}

/** The word for a waste cause, or `''` on every other kind. */
export function reasonWord(reason: WasteReason | null): string {
  return reason === null ? '' : reasonLabel(reason);
}
