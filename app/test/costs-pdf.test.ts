import { describe, expect, it } from 'vitest';

import { costsFrom, matrixOf, type CostLineRow } from '@/api/costs';
import { costsHtml } from '@/export/costsPdf';
import type { Provider } from '@/api/providers';
import { ES } from '@/strings';
import { PALETTE, SERIE } from '@/theme/palette';

// ============================================================================
// THE DOCUMENT A SHOPKEEPER SHARES. Plan task `5g-iii`.
//
// ⚠️⚠️ THIS SUITE IS THE REASON THE PDF IS NOT AN UNCHECKABLE DELIVERABLE. A
// *"share the view as a PDF"* feature looks like exactly what §2.11 fences out —
// a rendering, on a device, that nothing here can see. Splitting the DOCUMENT
// (pure, a string) from the SHARING (two native calls in `@/export/share`) moves
// almost all of it back inside: every figure, every date, every provider name,
// the escaping and the geometry are asserted below.
//
// ⚠️ WHAT IS LEFT OUTSIDE, said once: whether a web view on a five-year-old
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
  it('paints with the palette and the series ring, and with nothing else', () => {
    const used = new Set(HTML.match(/#[0-9A-Fa-f]{3,8}/g) ?? []);
    expect(used.size).toBeGreaterThan(0);
    const allowed = new Set<string>([...Object.values(PALETTE), ...SERIE]);
    for (const colour of used) expect(allowed.has(colour)).toBe(true);
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

  it('marks the generic row without renaming it', () => {
    expect(HTML).toContain('Genérico');
    expect(HTML).toContain(ES.costs.generic);
  });

  it('carries every day as a column and every price as a cell', () => {
    for (const day of COSTS.days) expect(HTML).toContain(`<th>${day}</th>`);
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
    expect(HTML).toContain(`<td>${ES.catalog.noPrice}</td>`);
    expect(HTML).not.toContain('$0.00');
  });

  it('prints the axis range, which is what makes a non-zero-based chart honest', () => {
    expect(HTML).toContain(COSTS.highLabel);
    expect(HTML).toContain(COSTS.lowLabel);
  });
});

describe('the chart in the file is the same geometry as the chart on the screen', () => {
  // ⚠️ THREE DELIVERIES IS THREE DOTS AND **ONE** SEGMENT — one inside Genérico's
  // two points, and none for Bodega del Centro's single point. A
  // renderer that connected across providers would draw a negotiation that never
  // happened, and it would show up here as a third segment.
  it('draws one dot per delivery and no segment between two providers', () => {
    const dots = (HTML.match(/class="dot"/g) ?? []).length;
    const segments = (HTML.match(/class="seg"/g) ?? []).length;
    expect(dots).toBe(3);
    expect(segments).toBe(1);
  });

  it('draws no segment at all for a single delivery', () => {
    const one = costsFrom([ROWS[1] as CostLineRow], PROVIDERS, 'kg', FACTORS);
    const html = costsHtml(one, 'Jitomate saladet', '2026-09-25');
    expect((html.match(/class="dot"/g) ?? []).length).toBe(1);
    expect((html.match(/class="seg"/g) ?? []).length).toBe(0);
  });

  // ⚠️⚠️ THE CHEAPEST DELIVERY IS AT THE BOTTOM, WHICH IS THE ONE THING A FLIPPED
  // AXIS WOULD GET WRONG WHILE STILL LOOKING LIKE A CHART. `plotted` answers with
  // the origin at the bottom left and each renderer subtracts once; a document
  // that forgot to would be the screen upside down, and every other assertion
  // here would still pass. The cheapest point must therefore have the LARGEST
  // `top`.
  it('puts the cheapest delivery lowest on the page', () => {
    const tops = [...HTML.matchAll(/class="dot" style="left:([\d.]+)px;top:([\d.]+)px/g)].map(
      (m) => ({ left: Number(m[1]), top: Number(m[2]) }),
    );
    expect(tops.length).toBe(3);
    // The cheapest ($16.00) is also the earliest, so it is leftmost AND lowest.
    const leftmost = tops.reduce((a, b) => (a.left <= b.left ? a : b));
    const dearest = tops.reduce((a, b) => (a.top <= b.top ? a : b));
    expect(leftmost.top).toBe(Math.max(...tops.map((one) => one.top)));
    // And the dearest ($20.00) is the latest, so it is rightmost.
    expect(dearest.left).toBe(Math.max(...tops.map((one) => one.left)));
  });

  // ⚠️ `toFixed` IS NOT USED ANYWHERE ON THIS PATH (`R5`), so the pixel figures
  // are plain numbers rounded by arithmetic. This asserts they are finite rather
  // than `NaN`, which is what a geometry bug produces — and `left:NaNpx` renders
  // as a dot in the corner rather than as an error.
  it('emits no NaN into a style attribute', () => {
    expect(HTML).not.toContain('NaN');
    expect(HTML).not.toContain('Infinity');
    expect(HTML).not.toContain('undefined');
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
});

describe('the thin states reach the document too', () => {
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
    expect((html.match(/class="dot"/g) ?? []).length).toBe(0);
  });

  it('does not print an axis it has no numbers for', () => {
    const none = costsFrom([], PROVIDERS, 'kg', FACTORS);
    expect(costsHtml(none, 'x', '2026-09-25')).not.toContain('class="axis"');
  });
});
