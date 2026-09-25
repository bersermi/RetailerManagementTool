import { describe, expect, it } from 'vitest';

import { costsFrom, matrixOf, type CostLineRow } from '@/api/costs';
import { costsHtml } from '@/export/costsPdf';
import type { Provider } from '@/api/providers';
import { ES } from '@/strings';
import { PALETTE, SERIE } from '@/theme/palette';

// ============================================================================
// THE DOCUMENT A SHOPKEEPER SHARES. Plan tasks `5g-iii` and `5g-iii-a`.
//
// ⚠️⚠️ THIS SUITE IS THE REASON THE PDF IS NOT AN UNCHECKABLE DELIVERABLE. A
// *"share the view as a PDF"* feature looks like exactly what §2.11 fences out —
// a rendering, on a device, that nothing here can see. Splitting the DOCUMENT
// (pure, a string) from the SHARING (two native calls in `@/export/share`) moves
// almost all of it back inside: every figure, every date, every provider name
// and the escaping are asserted below.
//
// ⚠️⚠️ AND THE FIRST THING TO SAY IS WHAT THIS SUITE PROVED AND WHAT IT COULD
// NOT. `5g-iii` shipped with a CHART in the document and twenty-two green
// assertions over it: the figures, the dates, the names, the escaping, and that
// the cheapest delivery was drawn lowest. **Every one of them was right and the
// artefact was wrong** — *"A chart in PDF doesn't make a lot of sense"* — because
// a chart earns its place through interactions a printed page does not have.
// **A check cannot tell you that a correct document is the wrong document.** So
// the four geometry assertions are gone with the renderer they read, and what
// replaced them is the claim that would catch it coming back: **no series colour
// appears in this file at all.**
//
// ⚠️ WHAT IS STILL LEFT OUTSIDE, said once: whether a web view on a five-year-old
// Android lays this out as intended, and whether the share sheet opens. That is
// an `R9` reading on the owner's phone and ADR-035 §2.11's stack row says so.
// ============================================================================

const GEN: Provider = { id: 'p-generic', name: 'Genérico', isGeneric: true };
const CENTRO: Provider = { id: 'p-centro', name: 'Bodega del Centro', isGeneric: false };
const PROVIDERS: readonly Provider[] = [GEN, CENTRO];
const FACTORS = { kg: '1000.000000' };

let serial = 0;
function line(providerId: string, perBase: string, occurredAt: string): CostLineRow {
  serial += 1;
  return {
    unit_price_net_per_base: perBase,
    purchase: {
      id: `doc-${serial}`,
      occurred_at: occurredAt,
      provider_id: providerId,
      reversal_of: null,
    },
  };
}

const ROWS: readonly CostLineRow[] = [
  line(CENTRO.id, '0.020000', '2026-09-24T09:00:00+00:00'),
  line(GEN.id, '0.018500', '2026-09-20T09:00:00+00:00'),
  line(GEN.id, '0.016000', '2026-09-10T09:00:00+00:00'),
];

const COSTS = costsFrom(ROWS, PROVIDERS, 'kg', FACTORS);
const HTML = costsHtml(COSTS, 'Jitomate saladet', '2026-09-25');

/**
 * FOURTEEN DELIVERY DAYS, ONE PROVIDER, **NEWEST FIRST — WHICH IS THE ORDER THE
 * WIRE ACTUALLY USES.**
 *
 * ⚠️⚠️ THE FIRST SPELLING OF THIS BUILT THEM OLDEST-FIRST AND EVERY ASSERTION
 * BELOW STILL PASSED, BECAUSE THEY COMPARED THE DOCUMENT AGAINST `costs.days`
 * RATHER THAN AGAINST A CALENDAR. `COSTS_ORDER` sorts `occurred_at` DESCENDING
 * and `costsFrom` reverses that once to oldest-first — so a fixture in ascending
 * order comes out of it DESCENDING, and the rendered document had *14 agosto* in
 * its first column. It was caught by rendering the file and looking at it, not by
 * this suite. **A fixture that disagrees with the wire makes a whole block of
 * assertions self-consistent and wrong**, which is why the ascending check below
 * is spelled out separately.
 */
const LONG = (): readonly CostLineRow[] =>
  Array.from({ length: 14 }, (_, at) =>
    line(CENTRO.id, '0.020000', `2026-09-${String(14 - at).padStart(2, '0')}T09:00:00+00:00`),
  );

/** How many `<table>` blocks the document emitted. */
const tables = (html: string): number => (html.match(/<table>/g) ?? []).length;

/** The `<th>` day headings of one block, in order. */
const headings = (html: string): readonly string[] =>
  [...html.matchAll(/<th><b>(\d+)<\/b><span>([^<]+)<\/span><span>(\d+)<\/span><\/th>/g)].map(
    (m) => `${m[1]} ${m[2]} ${m[3]}`,
  );

describe('the document is self-contained, which is a correctness rule', () => {
  it('is a complete HTML document', () => {
    expect(HTML.startsWith('<!doctype html>')).toBe(true);
    expect(HTML).toContain('<meta charset="utf-8">');
    expect(HTML.trimEnd().endsWith('</html>')).toBe(true);
  });

  // ⚠️⚠️ NOTHING IS FETCHED, AND THAT IS NOT ABOUT FILE SIZE. The pilot store is
  // offline half the day and `printToFileAsync` renders through a web view: a
  // `<link>` or an `<img>` would come back MISSING in the shop, so the PDF would
  // lay out differently there than wherever it was tested — and nobody would find
  // out until a shopkeeper shared a broken page.
  it('references nothing over the network', () => {
    for (const forbidden of ['<link', '<img', '<script', 'http://', 'https://', '@import']) {
      expect(HTML).not.toContain(forbidden);
    }
  });

  // ⚠️ THE TYPE IS THE SYSTEM'S OWN FACE, which is §2.11's rule for the screen
  // applied to the document: a brand face is a download, and a shop without
  // signal cannot afford one.
  it('asks for no webfont', () => {
    expect(HTML).toContain('-apple-system');
    expect(HTML).not.toContain('@font-face');
  });
});

describe('every colour is a named role and every word is centralised', () => {
  // ⚠️ `R11` AND `R4` APPLY TO THIS FILE AS THEY DO TO A SCREEN, and the
  // conventions gate reads the source — but only this suite can check the
  // OUTPUT, which is the string that actually goes out.
  it('paints with the palette and with nothing else', () => {
    const used = new Set(HTML.match(/#[0-9A-Fa-f]{3,8}/g) ?? []);
    expect(used.size).toBeGreaterThan(0);
    const allowed = new Set<string>(Object.values(PALETTE));
    for (const colour of used) expect(allowed.has(colour)).toBe(true);
  });

  // ⚠️⚠️ AND NOT ONE SERIES COLOUR, WHICH IS THE ASSERTION `5g-iii-a` COULD MAKE
  // AND `5g-iii` COULD NOT. The ring answers *"which provider is this line"* and
  // this document has no lines; the stub carries the name in words instead. **A
  // hex from `SERIE` reappearing here is a chart creeping back into a file the
  // owner took one out of**, which nothing else in this repository would notice.
  it('carries no series colour at all, because it draws no series', () => {
    for (const colour of SERIE) expect(HTML).not.toContain(colour);
    expect(HTML).not.toContain('rotate(');
    expect(HTML).not.toContain('class="dot"');
    expect(HTML).not.toContain('class="seg"');
  });

  it('takes its own headings from `ES.costs` and never from a literal', () => {
    expect(HTML).toContain(ES.costs.fileTitle);
    expect(HTML).toContain(ES.costs.subtitle);
    expect(HTML).toContain(ES.costs.providerColumn);
    expect(HTML).toContain(ES.costs.fileMadeOn);
  });

  // ⚠️ THE DOCUMENT NAMES ITSELF, because it is read AWAY from the phone and away
  // from the banda that named the product.
  it('names the product it is about, in the title and on the page', () => {
    expect(HTML).toContain('<title>');
    expect(HTML).toContain('Jitomate saladet');
    expect(HTML).toContain('2026-09-25');
  });
});

describe('the figures in the file are the figures on the screen', () => {
  it('carries every provider that delivered, with its own name', () => {
    for (const one of COSTS.series) expect(HTML).toContain(one.name);
  });

  // ⚠️⚠️ THE GENERIC MARK MOVED OUT OF THE LEGEND AND ONTO THE STUB, and it had
  // to: the legend existed to pair a hue with a name and `5g-iii-a` removed the
  // hues. A document that dropped the word with the legend would put a market run
  // and a supplier relationship under one label, which is the distinction
  // `ES.costs.generic`'s own docstring exists for.
  it('marks the generic row on the row itself, without renaming it', () => {
    expect(HTML).toContain('Genérico');
    expect(HTML).toContain(`<th class="who">Genérico<em>${ES.costs.generic}</em></th>`);
  });

  it('carries every price as a cell', () => {
    for (const row of matrixOf(COSTS)) {
      for (const cell of row.cells) {
        if (cell.price !== null) expect(HTML).toContain(cell.price);
      }
    }
  });

  // ⚠️⚠️ A GAP IS A DASH AND NEVER A ZERO, on paper as on the screen. A `$0.00` in
  // a shared document would tell whoever reads it that a supplier gave the shop
  // something free — and a document is forwarded to people who cannot ask.
  it('draws a day a provider did not deliver as a dash', () => {
    expect(HTML).toContain(`<td class="gap">${ES.catalog.noPrice}</td>`);
    expect(HTML).not.toContain('$0.00');
  });

  // ⚠️ EVERY ROW IS AS LONG AS THE HEAD. A provider row one cell short would slide
  // every figure after the gap one column to the left — a table that still looks
  // like a table and attributes each price to the wrong day.
  it('gives every provider row a cell for every day in the block', () => {
    // ⚠️ SCOPED TO `<tbody>` ON PURPOSE: the head's CORNER cell is a stub too and
    // carries the same class, so a match on the markup alone counts it as a third
    // provider. That is the corner being a stub rather than a defect — the rows
    // are the ones with figures in them.
    const body = HTML.slice(HTML.indexOf('<tbody>'), HTML.indexOf('</tbody>'));
    const bodyRows = [...body.matchAll(/<tr><th class="who">.*?<\/tr>/g)].map((m) => m[0]);
    expect(bodyRows.length).toBe(COSTS.series.length);
    for (const row of bodyRows) {
      expect((row.match(/<td/g) ?? []).length).toBe(COSTS.days.length);
    }
  });
});

describe('the days are headings a person reads, and they are the ledger’s own days', () => {
  // ⚠️⚠️ `2026-09-24` IS THE LEDGER'S LABEL AND NOT A HEADING. It was in the
  // document because a chart above it was what a reader was meant to look at;
  // with the table carrying the whole reading it is the first thing the eye lands
  // on. Three lines — the day, the month, the year.
  it('prints each delivery day as a day, a month and a year', () => {
    expect(headings(HTML)).toEqual([
      `10 ${ES.dates.months[8]} 2026`,
      `20 ${ES.dates.months[8]} 2026`,
      `24 ${ES.dates.months[8]} 2026`,
    ]);
  });

  // ⚠️⚠️ AND THE RAW LABEL IS GONE, WHICH IS THE HALF THAT WOULD OTHERWISE PASS
  // VACUOUSLY. A renderer that printed BOTH spellings would satisfy the
  // assertion above and still hand a shopkeeper the machine string.
  it('does not also print the ISO label it was given', () => {
    for (const day of COSTS.days) expect(HTML).not.toContain(`<th>${day}</th>`);
  });

  // ⚠️⚠️ MEASURED, NOT ARGUED: `new Date('2026-09-24').getDate()` IS **23** ON
  // THIS PROJECT'S MAC (UTC−6) AND **24** ON `ubuntu-latest` (UTC). `CostPoint.day`
  // is `occurred_at.slice(0, 10)` — a day Postgres already chose — so a heading
  // built through a `Date` would disagree with the ledger for a reader holding a
  // PDF who can check neither. `formatLedgerDay` slices the string, so this is
  // TZ-independent by construction rather than by a pinned `TZ`
  // ([[local-time-tests-need-a-pinned-tz]], answered by removing the dependency).
  it('names the day the ledger named, whatever timezone the machine is in', () => {
    const late = costsFrom(
      [line(CENTRO.id, '0.020000', '2026-09-24T02:00:00+00:00') as CostLineRow],
      PROVIDERS,
      'kg',
      FACTORS,
    );
    expect(late.days).toEqual(['2026-09-24']);
    expect(headings(costsHtml(late, 'x', '2026-09-25'))).toEqual([`24 ${ES.dates.months[8]} 2026`]);
  });

  it('falls back to the label itself rather than to a rendered NaN', () => {
    const broken = { ...COSTS, days: ['not-a-day'] as readonly string[] };
    const html = costsHtml(broken, 'x', '2026-09-25');
    expect(html).toContain('<th>not-a-day</th>');
    expect(html).not.toContain('NaN');
    expect(html).not.toContain('undefined');
  });
});

describe('the table stays on the page, which is the reason it is not one table', () => {
  // ⚠️⚠️ `expo-print` RENDERS AT **612 × 792** BY DEFAULT — US Letter at 72 PPI,
  // documented in `PrintOptions` — and `@/export/share` passes neither width nor
  // height. With a 24 px margin a side that is **564 px** of page. A matrix is one
  // column per delivery day, so a product bought weekly for three months is twelve
  // of them and there is no legible size at which they fit. **A table that runs
  // off the page loses data silently**, so the days are cut into blocks instead.
  it('emits one table while the days fit, and another when they do not', () => {
    expect(COSTS.days.length).toBe(3);
    expect(tables(HTML)).toBe(1);
  });

  it('never puts more than a page of day columns in one table', () => {
    const many = costsFrom(LONG(), PROVIDERS, 'kg', FACTORS);
    const html = costsHtml(many, 'x', '2026-09-25');
    expect(many.days.length).toBe(14);
    expect(tables(html)).toBe(3);
    for (const block of html.split('<table>').slice(1)) {
      expect((block.match(/<th><b>/g) ?? []).length).toBeLessThanOrEqual(6);
      expect((block.match(/<th><b>/g) ?? []).length).toBeGreaterThan(0);
    }
  });

  // ⚠️⚠️ EVERY DAY APPEARS IN EXACTLY ONE BLOCK, IN ORDER. The failure a blocking
  // renderer invites is an off-by-one at the seam: a day printed twice reads as
  // two deliveries, and one dropped hides a delivery that happened. Neither would
  // look like a broken document.
  it('prints every day exactly once, oldest first, across the blocks', () => {
    const many = costsFrom(LONG(), PROVIDERS, 'kg', FACTORS);
    const html = costsHtml(many, 'x', '2026-09-25');
    // ⚠️ THE CALENDAR AND NOT `costs.days`, for the reason `LONG`'s docstring
    // records: comparing the document against the same array it was built from is
    // an assertion that a reversed document satisfies.
    expect(headings(html)).toEqual(
      Array.from({ length: 14 }, (_, at) => `${at + 1} ${ES.dates.months[8]} 2026`),
    );
    // ⚠️ AND `costs.days` IS ASCENDING, which is the claim the line above rests
    // on and the one a wrong-order fixture would have hidden.
    expect([...many.days]).toEqual([...many.days].sort());
    expect(many.days[0]).toBe('2026-09-01');
  });

  // ⚠️ AND EVERY BLOCK REPEATS THE STUB, which is what makes a block readable on
  // its own — nobody has to hold a provider column from an earlier table in their
  // head, and it is why the document needs no *continued* label and therefore no
  // new Spanish word.
  it('repeats the provider stub in every block', () => {
    const many = costsFrom(LONG(), PROVIDERS, 'kg', FACTORS);
    const html = costsHtml(many, 'x', '2026-09-25');
    expect((html.match(new RegExp(ES.costs.providerColumn, 'g')) ?? []).length).toBe(3);
    expect((html.match(/<th class="who">Bodega del Centro/g) ?? []).length).toBe(3);
  });

  // ⚠️ THE CONTENT IS BOUNDED BY THE PAGE AND NOT BY THE VIEWPORT, which is a
  // no-op inside `printToFileAsync` and is what keeps the file laying out the
  // same way in a browser — which is how the owner read the first version.
  it('bounds itself to the printable width', () => {
    expect(HTML).toContain('max-width: 564px');
    expect(HTML).toContain('table-layout: fixed');
  });

  // ⚠️⚠️ A PRICE CELL IS ALLOWED TO WRAP, AND `DAYS_PER_BLOCK`'s ARITHMETIC
  // DEPENDS ON IT. `MatrixCell.price` is C3.10's whole sentence — `$18.50 / kg` —
  // and held on one line a four-digit figure makes a column 109 px wide, which is
  // four columns to a page instead of six. The unit clause drops to a second line;
  // the figure has no space in it, so it can never break itself. ⚠️ **A `nowrap`
  // reintroduced here would not look like a bug — it would quietly narrow the
  // document to four days a page, or push the table off it.**
  it('lets a cell break before its unit and never inside its figure', () => {
    expect(HTML).not.toContain('white-space: nowrap');
    // The sentence itself is intact, unit clause and all — one source with the screen.
    expect(HTML).toContain(`$18.50 ${ES.catalog.per} ${ES.units.kg}`);
  });
});

describe('what a shopkeeper typed cannot break the document', () => {
  // ⚠️⚠️ PROVIDER AND PRODUCT NAMES ARE TYPED BY A PERSON, and a hardware shop
  // called `Ferretería "El Águila" & Hijos` carries three characters that end an
  // attribute early or silently swallow the rest of a row. This is not
  // defensiveness — it is the ordinary case in a shop that names its suppliers.
  it('escapes a name with quotes, ampersands and angle brackets', () => {
    const nasty: Provider = {
      id: CENTRO.id,
      name: 'Ferretería "El Águila" & <Hijos>',
      isGeneric: false,
    };
    const costs = costsFrom(ROWS, [GEN, nasty], 'kg', FACTORS);
    const html = costsHtml(costs, 'Tornillo <1/2"> & más', '2026-09-25');

    expect(html).toContain('&amp;');
    expect(html).toContain('&lt;Hijos&gt;');
    expect(html).toContain('&quot;El Águila&quot;');
    // ⚠️ THE RAW FORMS ARE ABSENT, which is the half that actually matters.
    expect(html).not.toContain('<Hijos>');
    expect(html).not.toContain('& <');
  });

  // ⚠️ THE ACCENTS SURVIVE, which the escaping must not eat: `Genérico` and
  // `Águila` are the shop's own words and `charset=utf-8` is what carries them.
  it('leaves accented characters alone', () => {
    expect(HTML).toContain('Genérico');
  });

  it('escapes the ampersand before the escapes it introduces', () => {
    const costs = costsFrom(ROWS, PROVIDERS, 'kg', FACTORS);
    const html = costsHtml(costs, '&lt;', '2026-09-25');
    // ⚠️ IF `&` WERE ESCAPED LAST, `&lt;` WOULD BECOME `&lt;` AGAIN rather than
    // `&amp;lt;` — the classic double-escape bug, pointing the wrong way.
    expect(html).toContain('&amp;lt;');
  });

  it('emits no NaN and no undefined into the page', () => {
    expect(HTML).not.toContain('NaN');
    expect(HTML).not.toContain('Infinity');
    expect(HTML).not.toContain('undefined');
  });
});

describe('the thin states reach the document too', () => {
  // ⚠️⚠️ AND THEY ARE ABOVE THE TABLE, WHICH IS THE ONE ORDERING CHANGE
  // `5g-iii-a` MAKES. The sentence used to follow the chart, which had already
  // shown the reader how little there was. Six columns of one price each look
  // like a record until somebody says otherwise — a caveat read after the figures
  // is a correction, and read before them it is an instruction for how to read.
  it('puts the thin-state sentence above the table and not under it', () => {
    const one = costsFrom([ROWS[1] as CostLineRow], PROVIDERS, 'kg', FACTORS);
    const html = costsHtml(one, 'x', '2026-09-25');
    expect(html.indexOf(ES.costs.single)).toBeGreaterThan(-1);
    expect(html.indexOf(ES.costs.single)).toBeLessThan(html.indexOf('<table>'));
  });

  it('says so when a shop has bought this only once', () => {
    const one = costsFrom([ROWS[1] as CostLineRow], PROVIDERS, 'kg', FACTORS);
    expect(costsHtml(one, 'x', '2026-09-25')).toContain(ES.costs.single);
  });

  it('says so when no provider has two deliveries', () => {
    const two = [ROWS[0], ROWS[1]] as CostLineRow[];
    const costs = costsFrom(two, PROVIDERS, 'kg', FACTORS);
    expect(costs.state).toBe('unlinked');
    expect(costsHtml(costs, 'x', '2026-09-25')).toContain(ES.costs.unlinked);
  });

  // ⚠️ AND A DOCUMENT FOR A PRODUCT WITH NO DELIVERIES IS STILL A VALID DOCUMENT.
  // The screen does not offer the share control in that state (`Cuerpo` returns a
  // `Vacio` before reaching it), so this is a claim about robustness rather than
  // about a reachable path — and it is asserted because an empty `costs` is
  // exactly what a future caller would hand this function by accident.
  it('renders an empty product without crashing or inventing a figure', () => {
    const none = costsFrom([], PROVIDERS, 'kg', FACTORS);
    const html = costsHtml(none, 'x', '2026-09-25');
    expect(html).toContain(ES.costs.nothing);
    expect(html).not.toContain('NaN');
  });

  // ⚠️⚠️ NO DAYS IS NO TABLE, AND NOT ONE EMPTY TABLE. A `<table>` with a stub and
  // no columns is a grid asserting the shop has suppliers and no prices — which is
  // the opposite of what `nothing` means, and it would render as a stray box under
  // a sentence saying there is nothing to show.
  it('emits no table at all for a product with no deliveries', () => {
    const none = costsFrom([], PROVIDERS, 'kg', FACTORS);
    expect(tables(costsHtml(none, 'x', '2026-09-25'))).toBe(0);
  });
});
