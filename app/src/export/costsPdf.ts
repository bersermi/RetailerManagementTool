// ============================================================================
// THE COSTOS VIEW AS A DOCUMENT SOMEBODY CAN SEND. Plan tasks `5g-iii` and
// `5g-iii-a`, and the first thing this app has ever produced that leaves the
// phone as a FILE.
//
// ⚠️⚠️ IT IS PURE AND IT RETURNS A STRING, WHICH IS THE WHOLE POINT OF ITS BEING
// ITS OWN MODULE. The owner asked for *"You can share the 'view' as a PDF"* —
// and a PDF is, on the face of it, exactly the kind of deliverable §2.11 fences
// out of this repository: a rendering, on a device, that no check here can look
// at. **Splitting the document from the sharing moves most of it back inside.**
// `costsHtml` has a right answer and `app/test/costs-pdf.test.ts` reads it; what
// is left outside is `@/export/share`, which is two native calls and nothing
// else.
//
// ⚠️ SO THE BOUND ON THIS FEATURE IS NARROW AND IT IS STATED RATHER THAN
// IMPLIED: a suite here can prove **what the document says**, and only a phone
// can prove that a phone will render and send it. That second half is an `R9`
// reading and ADR-035 §2.11's stack row says so.
//
// ----------------------------------------------------------------------------
// ⚠️⚠️ THE DOCUMENT IS A TABLE AND NOT A CHART — THE OWNER'S RULING, 2026-09-25
// ----------------------------------------------------------------------------
// `5g-iii` shipped this file with the screen's chart in it: `plotted`'s geometry
// rendered as absolutely-positioned `<div>`s and a rotation, one legend of
// colour swatches, an axis column printing the range. **Twenty-two assertions
// proved every figure in it and the artefact was still wrong.** His words,
// minutes after the merge and from his own phone: *"The Chart doesn't survive the
// Web view. Let's turn the PDF export into a nice tabular view. A chart in PDF
// doesn't make a lot of sense."*
//
// ⚠️⚠️ THE REASON GENERALISES AND IT IS WORTH KEEPING: A CHART EARNS ITS PLACE
// THROUGH INTERACTIONS A PRINTED OR FORWARDED PAGE DOES NOT HAVE. On the screen
// a person taps a point, reads the banda, scrolls the matrix open. A PDF is read
// away from the phone, printed, or forwarded to somebody who cannot tap it at
// all — and the rows underneath are what a person checks a notebook against.
//
// ⚠️ IT IS NOT A REVERT. `plotted` stays in `@/api/costs` and keeps serving
// `costos/[id].tsx`, which he confirmed reads fine. What left this file is the
// renderer over it.
//
// ----------------------------------------------------------------------------
// ⚠️⚠️ AND THE CHART WAS WIDER THAN THE PAGE, WHICH NOBODY HAD MEASURED
// ----------------------------------------------------------------------------
// `expo-print`'s `PrintOptions` documents its defaults: **`width: 612`,
// `height: 792` — US Letter at 72 PPI** — and `@/export/share` passes neither.
// `5g-iii` sized the plot at 660 px on a comment that said *"A4 at 96 dpi is
// ~794 px; this leaves the margins room"*. **A4 was never the page.** With
// `PAGE.edge` of 24 a side, the drawable width is **564 px**, and the chart plus
// its axis column was about 130 px past it. Whether a web view clips that or
// shrinks the whole page to fit differs by platform, and neither is a document a
// person can read — so *"doesn't survive the Web view"* may well have been
// exactly that, arithmetic rather than taste.
//
// ⚠️⚠️ WHICH IS WHY THE TABLE SPLITS INTO PAGE-WIDTH BLOCKS INSTEAD OF GETTING
// WIDER. A matrix is one column per delivery DAY: a product bought weekly for
// three months is twelve of them, and there is no legible type size at which
// twelve price columns and a provider stub fit in 564 px. A table that runs off
// the page loses data silently, which is the failure this repository refuses
// everywhere else. **So `DAYS_PER_BLOCK` days go in one table and the next ones
// go in the next**, each block repeating the stub, and every block is a complete
// readable table. ⚠️ For the pilot's ordinary case — a product with six
// deliveries or fewer — it emits exactly ONE table and is indistinguishable from
// the naive version, which is the property that makes this safe rather than
// clever.
//
// ⚠️ THE SCREEN'S MATRIX HAS THE SAME PROBLEM AND SOLVES IT DIFFERENTLY: it
// scrolls sideways, which a phone can do and paper cannot. Two media, two
// answers, one set of rows (`matrixOf`).
//
// ----------------------------------------------------------------------------
// ⚠️ EVERY COLOUR COMES FROM `@/theme/palette` AND EVERY WORD FROM `@/strings`
// ----------------------------------------------------------------------------
// `R11` and `R4` apply to this file exactly as they do to a screen, and they
// should: a document that went out in colours nobody named, saying sentences
// nobody centralised, would be the one surface in this app where both rules had
// quietly stopped applying — and it is the surface that gets forwarded to other
// people.
//
// ⚠️⚠️ AND WITH THE CHART GONE, `SERIE` AND `serieColour` LEAVE THIS FILE
// ALTOGETHER. The series ring answers *"which provider is this line"*, and there
// are no lines: the stub carries the name, in words, on every block. **That
// turns a weak assertion into a strong one** — the suite no longer checks that
// the document's colours are all *allowed*, it checks that **not one series
// colour appears in it at all**, which is what would catch a chart creeping back
// in. It is also §2.11's *no state is ever announced by colour alone* satisfied
// by having no colour-borne state to announce.
// ============================================================================

import { matrixOf, type Costs } from '@/api/costs';
import { formatLedgerDay } from '@/format/date';
import { ES } from '@/strings';
import { PALETTE } from '@/theme/palette';

/**
 * THE DOCUMENT'S OWN SCALE, and it is deliberately NOT `useDensity()`'s.
 *
 * ⚠️⚠️ `R6` REQUIRES EVERY SIZE ON A SCREEN TO COME FROM THE DENSITY SCALE, AND
 * THIS IS NOT A SCREEN — SO THE RULE IS SATISFIED IN ITS OWN TERMS RATHER THAN
 * BENT. C3.18's two modes exist because a React Native screen **cannot be
 * zoomed**: an elderly shopkeeper holding a 390 pt phone at arm's length has no
 * pinch gesture to reach for, so the app has to offer *Letra grande*. **A PDF can
 * be zoomed, by every viewer on both platforms**, and a page typeset at
 * `scale.bodySize` in elder mode would be four words to a line. Different medium,
 * different constraint, and the reason is written here rather than left as an
 * exemption somebody has to trust.
 *
 * ⚠️ WHAT THE RULE'S REAL ARGUMENT BUYS US ANYWAY: every size is named ONCE, in
 * one table, so the document's typography is adjustable in one place instead of
 * being scattered through a template. That is `density.ts`'s actual point, and it
 * is what keeps this file passing the gate with no rule change at all.
 *
 * ⚠️⚠️ `pageWidth` IS MEASURED AND NOT CHOSEN. It is `expo-print`'s documented
 * default and what `@/export/share` gets by passing nothing — see the header. The
 * previous version of this table guessed A4, and the guess was 182 px out.
 */
const PAGE = {
  /**
   * `expo-print`'s default page, in CSS px: US Letter at 72 PPI.
   * ⚠️ It bounds the body's width and it is what `DAYS_PER_BLOCK`'s arithmetic
   * is against — so it is a MEASUREMENT this file acts on, not a note.
   */
  pageWidth: 612,
  /** The body margin, each side. */
  edge: 24,
  titleSize: 20,
  subtitleSize: 13,
  bodySize: 12,
  /** The month and the year under a day heading, and the made-on line. */
  smallSize: 10,
  /**
   * The table fills the page. ⚠️ IT IS IN THIS TABLE AND NOT TYPED INTO THE CSS,
   * and the reason is `R6`'s argument rather than its pattern: the gate reads a
   * literal `width: 100%` as a hardcoded size and it is **right to** — this is a
   * width, and this file's whole stance is that every size it has is named here
   * once. A percentage is no more exempt than a pixel.
   */
  full: '100%',
  cellPadY: 6,
  cellPadX: 8,
  hairline: 1,
  headGap: 18,
  blockGap: 14,
  tableGap: 16,
  footGap: 24,
  titleGap: 2,
} as const;

/**
 * ⚠️⚠️ HOW MANY DAY COLUMNS GO IN ONE TABLE, AND THE ARITHMETIC IS HERE BECAUSE
 * IT IS THE ONLY THING KEEPING THE DOCUMENT ON ITS PAGE.
 *
 *   * the page is `PAGE.pageWidth` = 612 px, less `PAGE.edge` twice → **564 px**
 *   * the provider stub takes `STUB_PERCENT` of it → about **135 px**, which
 *     holds *Bodega del Centro* on two lines at `bodySize`
 *   * that leaves about **429 px** for the day columns
 *   * the widest thing a day column has to hold is a price, and the widest price
 *     a shop's purchase line realistically carries is `$1,234.50` — nine glyphs
 *     at `bodySize`, about **62 px** — plus `cellPadX` twice → **78 px**
 *   * 429 / 78 → **5.5**, so **six** columns is one block that fits with the
 *     four-digit case, and seven is one that does not
 *
 * ⚠️⚠️ AND THE NUMBER IS 62 px BECAUSE A CELL IS ALLOWED TO WRAP, WHICH IS THE
 * ONE THING THIS ARITHMETIC DEPENDS ON THAT IS NOT A CONSTANT IN THIS FILE.
 * `MatrixCell.price` is C3.10's whole sentence — `$18.50 / kg` — and on ONE line
 * that is 11 glyphs, not 9, and with a four-digit figure it is **109 px**, which
 * would leave room for four columns. **The unit clause drops to a second line
 * instead**, and a money figure has no space in it so it can never break itself.
 * ⚠️ The alternative was to strip the unit and state it once above the table;
 * that was refused because `MatrixCell.price` is the sentence the SCREEN's matrix
 * draws, and re-rendering it here would be a second answer to *what did this cost*
 * in the one document a shopkeeper forwards to somebody who cannot ask.
 *
 * ⚠️ A DAY HEADING IS NARROWER THAN A PRICE AND DOES NOT DRIVE THE NUMBER:
 * *septiembre* at `smallSize` is about 50 px.
 *
 * ⚠️ AND IF A LATER SIZE CHANGE MAKES THIS WRONG, IT IS WRONG QUIETLY — there is
 * no instrument in this repository that can measure a rendered page (`R9`). What
 * the suite CAN hold is the blocking itself: that no table carries more than this
 * many day columns, and that every day still appears in exactly one of them.
 */
const DAYS_PER_BLOCK = 6;

/** The stub's share of the table, as a percentage. See `DAYS_PER_BLOCK`. */
const STUB_PERCENT = 24;

/**
 * HTML-escape. ⚠️⚠️ IT IS NOT OPTIONAL AND IT IS NOT DEFENSIVE: a provider's
 * name and a product's name are **typed by the shopkeeper**, and `Ferretería
 * "El Águila" & Hijos` carries three characters that end a document early or
 * silently swallow the rest of a row. ⚠️ `&` goes first, or the escapes escape
 * each other.
 */
function safe(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * The days, cut into runs of `DAYS_PER_BLOCK`.
 *
 * ⚠️ AN EMPTY LIST GIVES NO BLOCKS AT ALL AND NOT ONE EMPTY BLOCK, which is the
 * `nothing` state reaching the document: a product with no deliveries has no
 * table, only the sentence that says so. A `<table>` with a stub and no columns
 * would be a grid asserting that the shop has suppliers and no prices.
 */
function blocks(days: readonly string[]): readonly (readonly string[])[] {
  const out: string[][] = [];
  for (let at = 0; at < days.length; at += DAYS_PER_BLOCK) {
    out.push(days.slice(at, at + DAYS_PER_BLOCK));
  }
  return out;
}

/**
 * ONE DAY AS A HEADING A PERSON READS — `24`, then *septiembre*, then `2026`, on
 * three lines.
 *
 * ⚠️⚠️ *THE DAYS AS REAL HEADINGS* IS THE ROW'S OWN PHRASE AND `2026-09-24` IS
 * NOT ONE. It is the ledger's label, correct and machine-shaped, and it was in
 * the document because the chart above it was what a reader was meant to look
 * at. With the table carrying the whole reading, the heading is the thing the eye
 * lands on first.
 *
 * ⚠️ THREE LINES RATHER THAN `24 sep 2026` ON ONE, AND THE REASON IS THE PAGE.
 * A one-line heading is as wide as its longest word plus two spaces, which would
 * cost a day column about 80 px and a block one of its six slots. Stacked, the
 * column is as wide as *septiembre* and the year sits under it for free.
 *
 * ⚠️⚠️ AND THE YEAR IS PRINTED, WHICH `formatExpiry` DELIBERATELY DOES NOT DO.
 * That function renders an invite's expiry — seven days out, where a year is
 * noise. **This is a document somebody opens in a folder next March**, and a
 * purchase history whose columns say *24 septiembre* with no year is one a reader
 * cannot place. Same app, opposite call, both written down.
 *
 * ⚠️ AN UNREADABLE LABEL FALLS BACK TO THE LABEL ITSELF and never to a rendered
 * `NaN` — `formatLedgerDay` returns `null` and the raw string is at least true.
 */
function dayHeading(day: string): string {
  const parts = formatLedgerDay(day);
  if (parts === null) return `<th>${safe(day)}</th>`;
  return (
    `<th><b>${safe(parts.day)}</b>` +
    `<span>${safe(parts.month)}</span>` +
    `<span>${safe(parts.year)}</span></th>`
  );
}

/**
 * The document, as `expo-print` wants it: one self-contained HTML string with
 * no external reference of any kind.
 *
 * ⚠️⚠️ NO `<link>`, NO `<img>`, NO WEBFONT — AND THAT IS A CORRECTNESS RULE
 * RATHER THAN A SIZE ONE. The pilot store is offline half the day
 * ([[pilot-store-is-offline-a-lot]]), and `printToFileAsync` renders through a
 * web view: anything fetched over the network would come back missing, so the
 * PDF would lay out differently in the shop than it did wherever it was tested.
 * ⚠️ The type is the system's own stack, which is also §2.11's rule for the
 * screen — *"Type is the operating system's own face"*.
 *
 * ⚠️ `title` IS THE PRODUCT'S NAME AND IT IS PASSED IN. This module reads no
 * catalog: it is handed the name the banda is already showing, so the file and
 * the screen cannot disagree about which product they are about.
 *
 * ⚠️ `madeOn` IS PASSED IN TOO, AND `R3` IS WHY. A function that called
 * `new Date()` itself could not be asserted at a boundary, and this string is
 * the only thing in the document that is not derived from the ledger.
 *
 * ⚠️⚠️ THE THIN-STATE SENTENCE SITS ABOVE THE TABLE AND NOT BELOW IT, which is
 * the one ordering change `5g-iii-a` makes to the page rather than to its
 * contents. It used to follow the legend, under a chart that had already told the
 * reader how little there was to see. **A table does not do that**: six columns
 * of one price each look like a record until somebody says *cada proveedor te ha
 * vendido esto una vez*. A caveat read after the figures is a correction; read
 * before them it is an instruction for how to read.
 */
export function costsHtml(costs: Costs, title: string, madeOn: string): string {
  const rows = matrixOf(costs);

  // ⚠️ THE STUB CARRIES THE GENERIC MARK NOW THAT THERE IS NO LEGEND TO CARRY
  // IT. *compra directa* beside the row's own name, never instead of it — the
  // word `ES.costs.generic`'s own docstring insists on, and `MatrixRow.isGeneric`
  // is what makes it a field lookup rather than an index into a second array.
  const stub = (at: number): string => {
    const row = rows[at];
    if (row === undefined) return '';
    const mark = row.isGeneric ? `<em>${safe(ES.costs.generic)}</em>` : '';
    return `<th class="who">${safe(row.name)}${mark}</th>`;
  };

  // ⚠️ ONE TABLE PER BLOCK OF DAYS, EACH WITH ITS OWN HEAD AND EVERY PROVIDER
  // ROW REPEATED. The repetition is what makes a block self-describing: nobody
  // has to hold a stub from an earlier table in their head, and no *continued*
  // label is needed — so this costs the document no new Spanish word.
  const tables = blocks(costs.days)
    .map((block) => {
      const head = block.map((day) => dayHeading(day)).join('');
      const body = rows
        .map((row, at) => {
          const cells = block
            .map((day) => {
              const cell = row.cells.find((one) => one.day === day);
              const price = cell === undefined ? null : cell.price;
              // ⚠️⚠️ A GAP IS C3.12's DASH AND NEVER A ZERO. A `$0.00` in a
              // shared document says a supplier gave the shop something free,
              // to a reader who cannot ask. The class is what makes it read as
              // absence rather than as a figure.
              return price === null
                ? `<td class="gap">${safe(ES.catalog.noPrice)}</td>`
                : `<td>${safe(price)}</td>`;
            })
            .join('');
          return `<tr>${stub(at)}${cells}</tr>`;
        })
        .join('');
      const spare = block.map(() => `<col>`).join('');
      return (
        `<table><colgroup><col class="stubcol">${spare}</colgroup>` +
        `<thead><tr><th class="who">${safe(ES.costs.providerColumn)}</th>${head}</tr></thead>` +
        `<tbody>${body}</tbody></table>`
      );
    })
    .join('');

  const note =
    costs.state === 'single'
      ? `<p class="note">${safe(ES.costs.single)}</p>`
      : costs.state === 'unlinked'
        ? `<p class="note">${safe(ES.costs.unlinked)}</p>`
        : costs.state === 'nothing'
          ? `<p class="note">${safe(ES.costs.nothing)}</p>`
          : '';

  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<title>${safe(ES.costs.fileTitle)} — ${safe(title)}</title>
<style>
  /* THE CONTENT IS BOUNDED BY THE PAGE, NOT BY THE VIEWPORT. printToFileAsync
     renders at 612px so the bound is a no-op there — it is what keeps the file
     laying out the same way when somebody opens it in a browser instead, which
     is how the owner read the first version of this document. */
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
         background: ${PALETTE.fondo}; color: ${PALETTE.tinta}; margin: ${PAGE.edge}px;
         max-width: ${PAGE.pageWidth - PAGE.edge * 2}px; }
  h1 { font-size: ${PAGE.titleSize}px; margin-top: 0;
       margin-bottom: ${PAGE.titleGap}px; }
  h2 { font-size: ${PAGE.subtitleSize}px; font-weight: 600; color: ${PALETTE.tintaApagada};
       margin-top: 0; margin-bottom: ${PAGE.headGap}px; }
  .note { font-size: ${PAGE.bodySize}px; color: ${PALETTE.tintaApagada};
          margin-top: 0; margin-bottom: ${PAGE.blockGap}px; }
  /* ⚠️ FIXED LAYOUT AND A FULL-WIDTH TABLE: the columns are decided by the
     colgroup rather than by the longest price in them, so a four-digit figure
     cannot widen the table past the page. See DAYS_PER_BLOCK above. */
  table { border-collapse: collapse; table-layout: fixed; width: ${PAGE.full};
          font-size: ${PAGE.bodySize}px; margin-bottom: ${PAGE.tableGap}px;
          page-break-inside: avoid; }
  .stubcol { width: ${STUB_PERCENT}%; }
  th, td { border: ${PAGE.hairline}px solid ${PALETTE.linea};
           padding: ${PAGE.cellPadY}px ${PAGE.cellPadX}px; text-align: right;
           vertical-align: bottom; }
  thead th { background: ${PALETTE.banda}; font-weight: 600; }
  /* ⚠️ THE DAY IS THE LINE THE EYE LANDS ON; the month and the year are under it
     and quieter. Three lines, one column's width — see dayHeading above. */
  thead th b { display: block; font-size: ${PAGE.bodySize}px; }
  thead th span { display: block; font-size: ${PAGE.smallSize}px; font-weight: 400;
                  color: ${PALETTE.tintaApagada}; }
  /* EVERYTHING WRAPS, AND A FIGURE STILL CANNOT BREAK. A long supplier name on
     one unbreakable line would push the grid off the page. A price cell is a
     money figure and its unit clause, and the figure contains no space at all —
     so the only place a cell can break is BEFORE the unit, which is a second
     line a reader does not have to reassemble. See DAYS_PER_BLOCK above: this is
     what keeps a column as wide as the money rather than as wide as the
     sentence. */
  th.who { text-align: left; background: ${PALETTE.superficie}; font-weight: 600;
           white-space: normal; overflow-wrap: break-word; }
  th.who em { display: block; font-style: normal; font-weight: 400;
              font-size: ${PAGE.smallSize}px; color: ${PALETTE.tintaApagada}; }
  td { background: ${PALETTE.superficie}; }
  /* ⚠️ A QUIET ZEBRA, IN TWO ROLES THAT ALREADY EXIST. Six price columns is
     where an eye loses its row, and on paper there is no finger to follow. */
  tbody tr:nth-child(even) td { background: ${PALETTE.fondo}; }
  tbody tr:nth-child(even) th.who { background: ${PALETTE.fondo}; }
  td.gap { color: ${PALETTE.tintaApagada}; }
  .made { font-size: ${PAGE.smallSize}px; color: ${PALETTE.tintaApagada};
          margin-top: ${PAGE.footGap}px; }
</style></head><body>
<h1>${safe(title)}</h1>
<h2>${safe(ES.costs.subtitle)}</h2>
${note}${tables}
<p class="made">${safe(ES.costs.fileMadeOn)} ${safe(madeOn)}</p>
</body></html>`;
}
