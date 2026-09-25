// ============================================================================
// THE COSTOS VIEW AS A DOCUMENT SOMEBODY CAN SEND. Plan task `5g-iii`, and the
// first thing this app has ever produced that leaves the phone as a FILE.
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
// ⚠️⚠️ THE CHART IN THE FILE IS THE SAME ARITHMETIC AS THE CHART ON THE SCREEN
// ----------------------------------------------------------------------------
// `plotted` (`@/api/costs`) returns fractions of a unit box, and it is called
// ONCE per picture — here for `<div>`s and in `costos/[id].tsx` for `<View>`s.
// A second geometry would be a second answer to *how steep is this line*, and
// the two would diverge on exactly the input nobody tested: the day a shopkeeper
// shares a PDF that disagrees with the screen she shared it from is the day this
// screen stops being worth having.
//
// ⚠️ IT DRAWS WITH ABSOLUTELY-POSITIONED BLOCKS AND A ROTATION, NOT WITH SVG.
// That is not a cleverness — it is the same decision the screen made, and for a
// harder reason there: `react-native-svg` is not a dependency of this app and
// adding one to draw five lines would be a native module and a device build
// ([[no-ci-compiles-the-native-app]]). Keeping both renderers on the same
// primitive is what lets one geometry serve both.
//
// ----------------------------------------------------------------------------
// ⚠️ EVERY COLOUR COMES FROM `@/theme/palette` AND EVERY WORD FROM `@/strings`
// ----------------------------------------------------------------------------
// `R11` and `R4` apply to this file exactly as they do to a screen, and they
// should: a document that went out in colours nobody named, saying sentences
// nobody centralised, would be the one surface in this app where both rules had
// quietly stopped applying — and it is the surface that gets forwarded to other
// people.
// ============================================================================

import { matrixOf, plotted, type Costs } from '@/api/costs';
import { ES } from '@/strings';
import { PALETTE, serieColour } from '@/theme/palette';

/**
 * THE DOCUMENT'S OWN SCALE, and it is deliberately NOT `useDensity()`'s.
 *
 * ⚠️⚠️ `R6` REQUIRES EVERY SIZE ON A SCREEN TO COME FROM THE DENSITY SCALE, AND
 * THIS IS NOT A SCREEN — SO THE RULE IS SATISFIED IN ITS OWN TERMS RATHER THAN
 * BENT. C3.18's two modes exist because a React Native screen **cannot be
 * zoomed**: an elderly shopkeeper holding a 390 pt phone at arm's length has no
 * pinch gesture to reach for, so the app has to offer *Letra grande*. **A PDF can
 * be zoomed, by every viewer on both platforms**, and an A4 page typeset at
 * `scale.bodySize` in elder mode would be four words to a line. Different medium,
 * different constraint, and the reason is written here rather than left as an
 * exemption somebody has to trust.
 *
 * ⚠️ WHAT THE RULE'S REAL ARGUMENT BUYS US ANYWAY: every size is named ONCE, in
 * one table, so the document's typography is adjustable in one place instead of
 * being scattered through a template. That is `density.ts`'s actual point, and it
 * is what keeps this file passing the gate with no rule change at all.
 */
const PAGE = {
  /** How tall the chart is, in CSS pixels. */
  plotHeight: 180,
  /** How wide. ⚠️ A4 at 96 dpi is ~794 px; this leaves the margins room. */
  plotWidth: 660,
  /** The dot's diameter, and the line's thickness. */
  dot: 7,
  stroke: 2,
  edge: 24,
  titleSize: 20,
  subtitleSize: 13,
  bodySize: 12,
  axisSize: 11,
  swatchGap: 7,
  swatch: 11,
  swatchRadius: 3,
  cardRadius: 6,
  cellPadY: 5,
  cellPadX: 9,
  legendGap: 4,
  blockGap: 14,
  headGap: 18,
  footGap: 26,
  titleGap: 2,
} as const;

const PLOT_HEIGHT = PAGE.plotHeight;
const PLOT_WIDTH = PAGE.plotWidth;
const DOT = PAGE.dot;
const STROKE = PAGE.stroke;

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
 */
export function costsHtml(costs: Costs, title: string, madeOn: string): string {
  const rows = matrixOf(costs);
  const lines = plotted(costs);

  // ⚠️ THE AXIS PRINTS ITS RANGE, WHICH IS WHAT MAKES A NON-ZERO-BASED CHART
  // HONEST. See `plotted`: purchase prices for one product cluster, so a
  // zero-based axis draws three deliveries as one flat line and says nothing —
  // and a range-based axis exaggerates unless the reader can see the range.
  const axis =
    costs.highLabel === ''
      ? ''
      : `<div class="axis"><span>${safe(costs.highLabel)}</span>` +
        `<span>${safe(costs.lowLabel)}</span></div>`;

  const plot = lines.map((one) => segments(one.dots, serieColour(one.hue))).join('');

  const legend = costs.series
    .map(
      (one) =>
        `<li><i style="background:${serieColour(one.hue)}"></i>${safe(one.name)}` +
        (one.isGeneric ? ` <em>(${safe(ES.costs.generic)})</em>` : '') +
        `</li>`,
    )
    .join('');

  // ⚠️ THE TABLE IS THE DOCUMENT'S REAL PAYLOAD AND THE CHART IS THE SUMMARY.
  // On paper the collapsible has no meaning — there is nothing to tap — so the
  // matrix is simply always open, which is the one place this document
  // deliberately differs from the screen.
  const head = costs.days.map((day) => `<th>${safe(day)}</th>`).join('');
  const body = rows
    .map(
      (row) =>
        `<tr><th class="who">${safe(row.name)}</th>` +
        row.cells
          .map(
            (cell) =>
              `<td>${cell.price === null ? safe(ES.catalog.noPrice) : safe(cell.price)}</td>`,
          )
          .join('') +
        `</tr>`,
    )
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
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
         background: ${PALETTE.fondo}; color: ${PALETTE.tinta}; margin: ${PAGE.edge}px; }
  h1 { font-size: ${PAGE.titleSize}px; margin-top: 0;
       margin-bottom: ${PAGE.titleGap}px; }
  h2 { font-size: ${PAGE.subtitleSize}px; font-weight: 600; color: ${PALETTE.tintaApagada};
       margin-top: 0; margin-bottom: ${PAGE.headGap}px; }
  .plot { position: relative; width: ${PLOT_WIDTH}px; height: ${PLOT_HEIGHT}px;
          background: ${PALETTE.superficie}; border: 1px solid ${PALETTE.linea};
          border-radius: ${PAGE.cardRadius}px; overflow: hidden; }
  .seg { position: absolute; height: ${STROKE}px; transform-origin: 0 50%; }
  .dot { position: absolute; width: ${DOT}px; height: ${DOT}px; border-radius: 50%; }
  .axis { display: flex; flex-direction: column; justify-content: space-between;
          height: ${PLOT_HEIGHT}px; font-size: ${PAGE.axisSize}px;
          color: ${PALETTE.tintaApagada}; margin-left: ${PAGE.swatchGap}px; }
  .chart { display: flex; align-items: stretch; }
  ul { list-style: none; padding-inline-start: 0; margin-top: ${PAGE.blockGap}px;
       margin-bottom: 0; font-size: ${PAGE.bodySize}px; }
  li { display: flex; align-items: center; gap: ${PAGE.swatchGap}px;
       margin-bottom: ${PAGE.legendGap}px; }
  li i { width: ${PAGE.swatch}px; height: ${PAGE.swatch}px;
         border-radius: ${PAGE.swatchRadius}px; display: inline-block; }
  li em { color: ${PALETTE.tintaApagada}; font-style: normal; }
  table { border-collapse: collapse; margin-top: ${PAGE.footGap}px;
          font-size: ${PAGE.bodySize}px; }
  th, td { border: 1px solid ${PALETTE.linea};
           padding: ${PAGE.cellPadY}px ${PAGE.cellPadX}px; text-align: right;
           white-space: nowrap; }
  thead th { background: ${PALETTE.banda}; font-weight: 600; }
  th.who { text-align: left; background: ${PALETTE.superficie}; font-weight: 600; }
  td { background: ${PALETTE.superficie}; }
  .note { font-size: ${PAGE.bodySize}px; color: ${PALETTE.tintaApagada};
          margin-top: ${PAGE.blockGap}px; margin-bottom: 0; }
  .made { font-size: ${PAGE.axisSize}px; color: ${PALETTE.tintaApagada};
          margin-top: ${PAGE.footGap}px; }
</style></head><body>
<h1>${safe(title)}</h1>
<h2>${safe(ES.costs.subtitle)}</h2>
<div class="chart"><div class="plot">${plot}</div>${axis}</div>
<ul>${legend}</ul>
${note}
<table><thead><tr><th class="who">${safe(ES.costs.providerColumn)}</th>${head}</tr></thead>
<tbody>${body}</tbody></table>
<p class="made">${safe(ES.costs.fileMadeOn)} ${safe(madeOn)}</p>
</body></html>`;
}

/**
 * One provider's dots, and the straight runs between them.
 *
 * ⚠️⚠️ A SEGMENT IS A ROTATED BLOCK, AND THE ROTATION IS WHY THE Y AXIS IS
 * FLIPPED HERE AND NOT IN `plotted`. `plotted` answers in the coordinates a
 * PERSON means — origin bottom-left, `y` rising with price. CSS `top` grows
 * downward, so each `y` becomes `1 - y` exactly once, on this line. ⚠️ The
 * screen does the same subtraction on its own line, and both are reading one
 * source: a flip applied in `plotted` would have to be UNDONE by whichever
 * renderer wanted the human orientation, which is the same bug with more steps.
 *
 * ⚠️ `atan2` AND NOT `atan(dy/dx)`: two deliveries at the identical instant give
 * `dx === 0`, and `atan` of infinity is a segment drawn at a right angle by
 * accident rather than on purpose. `atan2(0, 0)` is `0`, and a zero-length
 * segment is invisible, which is the correct picture of two points in one place.
 *
 * ⚠️ A SINGLE DOT DRAWS NO SEGMENT AT ALL, which is `CostsState`'s `single` and
 * `unlinked` made geometric: the loop starts at index 1, so a one-point series
 * simply has nothing to connect.
 */
function segments(dots: readonly { readonly x: number; readonly y: number }[], colour: string): string {
  const px = (x: number) => x * (PLOT_WIDTH - DOT) + DOT / 2;
  const py = (y: number) => (1 - y) * (PLOT_HEIGHT - DOT) + DOT / 2;

  let out = '';
  for (let i = 1; i < dots.length; i += 1) {
    const from = dots[i - 1] as { x: number; y: number };
    const to = dots[i] as { x: number; y: number };
    const x1 = px(from.x);
    const y1 = py(from.y);
    const dx = px(to.x) - x1;
    const dy = py(to.y) - y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    out +=
      `<div class="seg" style="left:${round(x1)}px;top:${round(y1 - STROKE / 2)}px;` +
      `width:${round(length)}px;background:${colour};` +
      `transform:rotate(${round(angle)}deg)"></div>`;
  }
  for (const dot of dots) {
    out +=
      `<div class="dot" style="left:${round(px(dot.x) - DOT / 2)}px;` +
      `top:${round(py(dot.y) - DOT / 2)}px;background:${colour}"></div>`;
  }
  return out;
}

/**
 * ⚠️⚠️ WHOLE PIXELS, AND NEITHER `toFixed` NOR A DIVISION APPEARS ANYWHERE ON THIS
 * PATH. `R5` bans both outright — *"no `toFixed`, no division by 100"* — because
 * they are how a peso-valued float gets made, and the gate does not know these
 * are pixels rather than money. ⚠️ **The rule was obeyed rather than argued with,
 * and it cost nothing**: the first version of this function rounded to two
 * decimals via `Math.round(v * 100) / 100`, and at 96 dpi on an A4 page a
 * hundredth of a pixel is not a distinction any renderer honours. Integer pixels
 * are the honest precision for this medium.
 */
function round(value: number): number {
  return Math.round(value);
}
