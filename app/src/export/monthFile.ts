// ============================================================================
// A MONTH OF THE LEDGER AS TWO FILES — A SPREADSHEET AND A PAGE. Plan task `7d`.
//
// ⚠️ PURE AND IT RETURNS STRINGS, `@/export/costsPdf`'s arrangement and for its
// reason: a suite here can prove what the files SAY, and only a phone can prove
// that a phone opens and sends them. `@/export/share` holds the native calls.
//
// ⚠️⚠️ BOTH FORMATS, BY THE OWNER'S RULING OF 2026-09-28, AND THEY ARE NOT ONE
// DOCUMENT TWICE:
//
//   * THE CSV IS THE RAW ROWS — one per line of every sale, delivery and
//     write-off, flat, in the order they happened. It is what a spreadsheet
//     sums and filters, so its money is plain decimals and it carries NO total
//     (`0033`: *"sum within a kind, never across"*).
//   * THE PDF IS THE SAME LINES READ BY A PERSON — one section per kind, four
//     columns that fit `expo-print`'s 564 px of US Letter, and a total per kind
//     where a total is honest.
//
// ⚠️⚠️ THE WRITE-OFF SECTION OF THE PDF CARRIES NO MONEY, AND THE CSV DOES.
// Área 9's constraint (2026-09-18): waste is shown as QUANTITY, never as cost
// and never as a rate. A write-off's `line_gross` is at SHELF price, not cost —
// but a headline *Desperdicio: $840* on a page reads as what the loss cost, and
// that is the number the constraint exists to keep off a page. The CSV is the
// record, and carries what the document stored.
// ============================================================================

import {
  EXPORT_KINDS,
  exportFileName,
  kindWord,
  monthTitle,
  plainAmount,
  reasonWord,
  shortDocument,
  unitWordOf,
  whoOf,
  type ExportKind,
  type ExportLine,
} from '@/api/monthExport';
import { lineQuantity, shownAmount } from '@/api/documents';
import type { MemberRow } from '@/api/members';
import { safe } from '@/export/costsPdf';
import { ES } from '@/strings';
import { PALETTE } from '@/theme/palette';

// ----------------------------------------------------------------------------
// THE CSV
// ----------------------------------------------------------------------------

/**
 * ⚠️⚠️ A BYTE-ORDER MARK, AND WITHOUT IT EVERY ACCENT IS WRONG IN EXCEL. Excel
 * opens a CSV with no BOM in the system's legacy code page, so *Lácteos* reads
 * *LÃ¡cteos* — on the one program a Mexican accountant is most likely to use.
 * Google Sheets and Numbers ignore it.
 */
export const CSV_BOM = '\uFEFF';

/** RFC 4180's line ending. Excel on Windows wants it; everything else accepts it. */
export const CSV_EOL = '\r\n';

/**
 * One text cell, escaped.
 *
 * ⚠️ QUOTED WHEN IT HOLDS A COMMA, A QUOTE OR A LINE BREAK, and a quote is
 * doubled — RFC 4180. *Ferretería "El Águila", Hijos* is one cell.
 *
 * ⚠️⚠️ A NAME THAT STARTS WITH `=`, `+`, `-` OR `@` IS PREFIXED WITH `'`. Those
 * are formula prefixes to every spreadsheet, and a product or supplier name is
 * TYPED BY A PERSON: `=HYPERLINK(…)` as a product name becomes a live link in the
 * accountant's copy. Only TEXT cells go through this — a negative amount is a
 * number and must stay one.
 */
export function csvText(value: string): string {
  const guarded = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(guarded) ? `"${guarded.replace(/"/g, '""')}"` : guarded;
}

/**
 * The month as a CSV: a header row and one row per line.
 *
 * ⚠️ THE HEADERS ARE `ES.monthExport.columns`, IN THAT OBJECT'S ORDER, AND THE
 * ROW BELOW IS BUILT IN THE SAME ORDER — `app/test/api-month-export.test.ts`
 * asserts they have the same length, which is the only thing keeping a column
 * under its own heading.
 */
export function monthCsv(lines: readonly ExportLine[], members: readonly MemberRow[] | null): string {
  const c = ES.monthExport.columns;
  const head = [
    c.day, c.hour, c.store, c.kind, c.document, c.product, c.family, c.qty, c.unit,
    c.net, c.tax, c.gross, c.provider, c.reason, c.expiry, c.reversal, c.who,
  ];
  const rows = lines.map((line) =>
    [
      line.day,
      line.hour,
      csvText(line.store),
      kindWord(line.kind),
      shortDocument(line.documentId),
      csvText(line.product),
      csvText(line.family),
      line.qty,
      csvText(unitWordOf(line.unit)),
      plainAmount(line.net),
      plainAmount(line.tax),
      plainAmount(line.gross),
      csvText(line.provider ?? ''),
      reasonWord(line.reason),
      line.expiry ?? '',
      line.isReversal ? ES.monthExport.yes : '',
      csvText(whoOf(members, line.createdBy)),
    ].join(','),
  );
  return CSV_BOM + [head.map(csvText).join(','), ...rows].join(CSV_EOL) + CSV_EOL;
}

/** How many columns `monthCsv` writes — the header's length. For the suite. */
export function csvColumnCount(): number {
  return Object.keys(ES.monthExport.columns).length;
}

// ----------------------------------------------------------------------------
// THE PDF
// ----------------------------------------------------------------------------

/**
 * The page's own scale — `costsPdf`'s `PAGE` argument, repeated: a PDF can be
 * zoomed, a screen cannot, so this is not `useDensity()`'s.
 *
 * ⚠️ FOUR COLUMNS IN 564 px: the day (a numeral over an hour, ~48 px), the
 * product (the rest), the quantity (~90 px) and the total (~90 px — `$12,345.50`
 * is ten glyphs at `bodySize`). The product column takes what is left and wraps.
 */
const PAGE = {
  pageWidth: 612,
  edge: 24,
  titleSize: 20,
  subtitleSize: 13,
  sectionSize: 15,
  bodySize: 11,
  smallSize: 9,
  full: '100%',
  dayPercent: 11,
  qtyPercent: 20,
  cellPadY: 4,
  cellPadX: 6,
  hairline: 1,
  headGap: 16,
  sectionGap: 20,
  footGap: 24,
  titleGap: 2,
  none: 0,
} as const;

/** The lines of one kind, in the order they came (the read's order is time). */
function ofKind(lines: readonly ExportLine[], kind: ExportKind): readonly ExportLine[] {
  return lines.filter((line) => line.kind === kind);
}

/**
 * The quiet line under a product's name: who delivered it, why it was thrown
 * away, and whether this line is a cancellation. `''` when there is nothing.
 */
function detailOf(line: ExportLine): string {
  const parts: string[] = [];
  if (line.provider !== null && line.provider !== '') parts.push(line.provider);
  const reason = reasonWord(line.reason);
  if (reason !== '') parts.push(reason);
  if (line.isReversal) parts.push(ES.monthExport.reversalMark);
  return parts.join(' · ');
}

/**
 * One kind's section.
 *
 * ⚠️ A KIND WITH NO LINES STILL GETS ITS HEADING AND A SENTENCE — *no hubo
 * compras* — rather than vanishing. A missing section on a page reads as a page
 * that forgot something.
 */
function section(kind: ExportKind, lines: readonly ExportLine[]): string {
  const title = `<h3>${safe(ES.monthExport.section[kind])}</h3>`;
  if (lines.length === 0) {
    return `${title}<p class="note">${safe(ES.monthExport.noneOfKind[kind])}</p>`;
  }
  const money = kind !== 'waste';
  const c = ES.monthExport.columns;
  const head =
    `<tr><th class="d">${safe(c.day)}</th><th class="p">${safe(c.product)}</th>` +
    `<th class="n">${safe(c.qty)}</th>` +
    (money ? `<th class="n">${safe(c.gross)}</th>` : '') +
    `</tr>`;
  const body = lines
    .map((line) => {
      const detail = detailOf(line);
      const qty = lineQuantity(line.qty, line.unit);
      return (
        `<tr${line.isReversal ? ' class="rev"' : ''}>` +
        `<td class="d"><b>${safe(String(Number(line.day.slice(8, 10))))}</b>` +
        `<span>${safe(line.hour)}</span></td>` +
        `<td class="p">${safe(line.product)}` +
        (detail === '' ? '' : `<span>${safe(detail)}</span>`) +
        `</td><td class="n">${safe(qty)}</td>` +
        (money ? `<td class="n">${safe(shownAmount(line.gross))}</td>` : '') +
        `</tr>`
      );
    })
    .join('');
  // ⚠️ THE TOTAL NETS THE CANCELLATIONS, because they are negative lines in the
  // same kind — so it is what the kind came to this month, and a void that fell
  // in the next month leaves this one overstated, which is `0033`'s own warning.
  const total = money
    ? `<p class="total">${safe(ES.monthExport.kindTotal)} ` +
      `<b>${safe(shownAmount(lines.reduce((sum, line) => sum + line.gross, 0)))}</b></p>`
    : '';
  return `${title}<table>${head}${body}</table>${total}`;
}

/**
 * The month as one self-contained HTML page for `expo-print`.
 *
 * ⚠️ NO `<link>`, NO `<img>`, NO WEBFONT — `costsHtml`'s correctness rule: the
 * pilot store is offline half the day and `printToFileAsync` renders through a
 * web view.
 *
 * ⚠️ `madeOn` IS PASSED IN (`R3`), `costsHtml`'s reason: it is the only thing on
 * the page not derived from the ledger, and a suite has to be able to hold it.
 */
export function monthHtml(lines: readonly ExportLine[], month: string, madeOn: string): string {
  const title = monthTitle(month);
  const sections = EXPORT_KINDS.map((kind) => section(kind, ofKind(lines, kind))).join('');
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<title>${safe(exportFileName(month, 'pdf'))}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
         background: ${PALETTE.fondo}; color: ${PALETTE.tinta}; margin: ${PAGE.edge}px;
         max-width: ${PAGE.pageWidth - PAGE.edge * 2}px; }
  h1 { font-size: ${PAGE.titleSize}px; margin-top: ${PAGE.none}px; margin-bottom: ${PAGE.titleGap}px; }
  h2 { font-size: ${PAGE.subtitleSize}px; font-weight: 600; color: ${PALETTE.tintaApagada};
       margin-top: ${PAGE.none}px; margin-bottom: ${PAGE.headGap}px; }
  h3 { font-size: ${PAGE.sectionSize}px; margin-top: ${PAGE.sectionGap}px;
       margin-bottom: ${PAGE.titleGap * 3}px; }
  .note { font-size: ${PAGE.bodySize}px; color: ${PALETTE.tintaApagada}; }
  table { border-collapse: collapse; table-layout: fixed; width: ${PAGE.full};
          font-size: ${PAGE.bodySize}px; }
  th, td { border: ${PAGE.hairline}px solid ${PALETTE.linea};
           padding: ${PAGE.cellPadY}px ${PAGE.cellPadX}px; vertical-align: top; }
  th { background: ${PALETTE.banda}; font-weight: 600; text-align: left; }
  td { background: ${PALETTE.superficie}; }
  tr:nth-child(odd) td { background: ${PALETTE.fondo}; }
  .d { width: ${PAGE.dayPercent}%; }
  .n { width: ${PAGE.qtyPercent}%; text-align: right; }
  .p { overflow-wrap: break-word; }
  td span { display: block; font-size: ${PAGE.smallSize}px; color: ${PALETTE.tintaApagada}; }
  tr.rev td { color: ${PALETTE.tintaApagada}; }
  .total { font-size: ${PAGE.bodySize}px; text-align: right; }
  /* ⚠️ A SECTION'S HEADING NEVER SITS ALONE AT THE FOOT OF A PAGE. */
  h3 { page-break-after: avoid; }
  tr { page-break-inside: avoid; }
  .made { font-size: ${PAGE.smallSize}px; color: ${PALETTE.tintaApagada}; margin-top: ${PAGE.footGap}px; }
</style></head><body>
<h1>${safe(ES.monthExport.fileTitle)}</h1>
<h2>${safe(title)}</h2>
${sections}
<p class="made">${safe(ES.costs.fileMadeOn)} ${safe(madeOn)}</p>
</body></html>`;
}
