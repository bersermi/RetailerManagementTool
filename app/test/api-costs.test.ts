import { describe, expect, it } from 'vitest';

import {
  COSTS_COLUMNS,
  COSTS_ORDER,
  COSTS_ORDER_ASCENDING,
  COSTS_TABLE,
  COSTS_VARIANT_COLUMN,
  costsFrom,
  costsKey,
  matrixOf,
  plotted,
  type CostLineRow,
} from '@/api/costs';
import type { Provider } from '@/api/providers';
import { ES } from '@/strings';
import { SERIE, serieColour } from '@/theme/palette';

// ============================================================================
// `Costos`' DATA LAYER. Plan task `5g-iii`.
//
// ⚠️ §2.11 allows a suite *"where a test pins a VALUE a customer sees or the
// ledger stores"* and refuses one over rendering. Everything below is the first
// kind: which deliveries stand, what each one cost per price unit, which of five
// states the screen is in, and where a dot goes in a unit box. ⚠️ **The geometry
// is in here on purpose** — a y-axis that silently clipped the highest price
// would still draw a perfectly plausible line, and no instrument in this
// repository can look at a line.
// ============================================================================

const KG: Provider = { id: 'p-mercado', name: 'Bodega del Centro', isGeneric: false };
const GEN: Provider = { id: 'p-generic', name: 'Genérico', isGeneric: true };
const PROVIDERS: readonly Provider[] = [GEN, KG];

/** `unit.factor_to_base` for a kilo whose base is the gram — `0001`'s own row. */
const FACTORS = { kg: '1000.000000' };

let serial = 0;

/**
 * One `purchase_line` row as PostgREST sends it.
 *
 * ⚠️ `perBase` IS A DECIMAL STRING AT SCALE 6 AND NEVER A NUMBER, which is what
 * `COSTS_COLUMNS`' `::text` cast exists for — measured off a real PostgREST, a
 * bare `numeric` arrives as a double and `parseDecimal` refuses one outright.
 * A fixture that passed a number here would be testing a wire shape this app
 * never receives.
 */
function line(
  providerId: string,
  perBase: string,
  occurredAt: string,
  extra: { id?: string; reversalOf?: string | null } = {},
): CostLineRow {
  serial += 1;
  return {
    unit_price_net_per_base: perBase,
    purchase: {
      id: extra.id ?? `doc-${serial}`,
      occurred_at: occurredAt,
      provider_id: providerId,
      reversal_of: extra.reversalOf ?? null,
    },
  };
}

/** ⚠️ NEWEST FIRST, which is the order `COSTS_ORDER` makes the database apply. */
const THREE: readonly CostLineRow[] = [
  line(KG.id, '0.020000', '2026-09-24T09:00:00+00:00'),
  line(GEN.id, '0.018500', '2026-09-20T09:00:00+00:00'),
  line(GEN.id, '0.016000', '2026-09-10T09:00:00+00:00'),
];

describe('the contract — what this app asks `purchase_line` for', () => {
  it('names its columns and never asks for everything', () => {
    expect(COSTS_TABLE).toBe('purchase_line');
    expect(COSTS_VARIANT_COLUMN).toBe('variant_id');
    expect(COSTS_COLUMNS).not.toContain('*');
  });

  // ⚠️⚠️ THE CAST IS THE ASSERTION, not the column name. `unit_price_net_per_base`
  // is `numeric(14,6)`; without `::text` PostgREST sends a JSON number, which is
  // a double, and `@tienda/money`'s `parseDecimal` refuses a number argument —
  // so a contract that lost this cast would put every price on this screen
  // through a float. `MEMORY_COLUMNS` and `SALE_COLUMNS` carry the identical one.
  it('casts the money column to text', () => {
    expect(COSTS_COLUMNS).toContain('unit_price_net_per_base::text');
  });

  // ⚠️ THE DOCUMENT IS EMBEDDED AND IT IS `!inner`. A line whose `purchase` is
  // unreadable has no date and no provider, which is not a point on any chart;
  // making the database drop it is one fewer branch on the phone.
  it('embeds the document it needs the date and the counterparty from', () => {
    expect(COSTS_COLUMNS).toContain('purchase!inner(');
    for (const column of ['id', 'occurred_at', 'provider_id', 'reversal_of']) {
      expect(COSTS_COLUMNS).toContain(column);
    }
  });

  // ⚠️ THE LINE'S OWN `created_at` MUST NOT BE THE SORT KEY. It is the WRITE
  // moment; `recorded_offline` makes it differ from the trading moment by up to
  // 72 hours (§2.6), and `0010` is the migration that exists because an allocator
  // confused the two. A chart sorted by it would put an offline batch in the
  // order it synced.
  it('does not read or sort by the line write time', () => {
    expect(COSTS_COLUMNS).not.toContain('created_at');
    expect(COSTS_ORDER).not.toContain('created_at');
  });

  // ⚠️⚠️ THE ORDER IS A COLUMN EXPRESSION AND NOT A `referencedTable` OPTION, AND
  // THIS ASSERTION IS THE ONLY THING IN THIS REPOSITORY THAT WOULD CATCH THE
  // SWAP. `postgrest-js` puts `{ referencedTable: 'purchase' }` under the query
  // key `purchase.order`, which sorts the embedded row INSIDE each parent — and
  // `purchase` is a to-one embed, so that is a silent no-op and the lines come
  // back in whatever order the planner chose. The column-expression spelling sets
  // plain `order` and sorts the parent. Both are green to a typechecker.
  it('sorts the PARENT by the embedded instant, descending', () => {
    expect(COSTS_ORDER).toBe('purchase(occurred_at)');
    expect(COSTS_ORDER).toMatch(/^purchase\(/);
    expect(COSTS_ORDER_ASCENDING).toBe(false);
  });

  // ⚠️ THE VARIANT IS IN THE CACHE KEY, `memoryKey`'s rule: one key for every
  // product would serve the last product's deliveries to the next one, and on
  // this screen a borrowed series is a lie that looks exactly like a fact.
  it('keys the cache per variant, and a null variant is not a shared key', () => {
    expect(costsKey('v-1')).not.toEqual(costsKey('v-2'));
    expect(costsKey(null)).not.toEqual(costsKey('v-1'));
    expect(costsKey('v-1')).toEqual(costsKey('v-1'));
  });
});

describe('the five states, and four of them are the real work', () => {
  it('reports `unknown` for a read that is out or has failed, never `nothing`', () => {
    expect(costsFrom(null, PROVIDERS, 'kg', FACTORS).state).toBe('unknown');
    expect(costsFrom(undefined, PROVIDERS, 'kg', FACTORS).state).toBe('unknown');
  });

  it('reports `nothing` for a shop that has genuinely never bought this', () => {
    const costs = costsFrom([], PROVIDERS, 'kg', FACTORS);
    expect(costs.state).toBe('nothing');
    expect(costs.deliveries).toBe(0);
    expect(costs.series).toEqual([]);
  });

  it('reports `single` for one delivery, so the screen draws a dot and no line', () => {
    const costs = costsFrom([THREE[1] as CostLineRow], PROVIDERS, 'kg', FACTORS);
    expect(costs.state).toBe('single');
    expect(costs.deliveries).toBe(1);
  });

  // ⚠️ TWO DELIVERIES, TWO PROVIDERS, AND STILL NO LINE. A segment between two
  // suppliers would draw a negotiation that never happened.
  it('reports `unlinked` when no PROVIDER has two deliveries', () => {
    const rows = [THREE[0] as CostLineRow, THREE[1] as CostLineRow];
    const costs = costsFrom(rows, PROVIDERS, 'kg', FACTORS);
    expect(costs.state).toBe('unlinked');
    expect(costs.deliveries).toBe(2);
    for (const one of costs.series) expect(one.points.length).toBe(1);
  });

  it('reports `series` as soon as one provider has two', () => {
    expect(costsFrom(THREE, PROVIDERS, 'kg', FACTORS).state).toBe('series');
  });

  // ⚠️⚠️ THE FOLD THAT IS NOT OBVIOUS, AND IT IS THE HONEST ONE. `priceCentavos`
  // needs `unit.factor_to_base` for this variant's price unit, and that comes off
  // the SAME catalog read — so it is missing for the whole screen or for none of
  // it. A chart with no dots and a matrix of dashes would report *this shop pays
  // nothing* when what happened is *this phone has not been told what a kilo
  // is*. `stepOf`'s rule: a null is a unit this phone has not read.
  it('reports `unknown`, not `nothing`, for deliveries it cannot denominate', () => {
    const costs = costsFrom(THREE, PROVIDERS, 'caja', FACTORS);
    expect(costs.state).toBe('unknown');
    expect(costs.deliveries).toBe(0);
  });
});

describe('a voided delivery is two documents and neither is a point', () => {
  // ⚠️⚠️ `0021` ANSWERS A VOID WITH A SECOND DOCUMENT, AND
  // `purchase_line_price_non_negative` KEEPS THE PRICE POSITIVE ON BOTH. `0032`
  // says that is fine for a SUM — *"negative money over negative quantity is the
  // price it always was"* — and it is wrong for a SERIES: the reversal would draw
  // a second point at the same price on the day the void was recorded, a delivery
  // that never stood, plotted as though it had.
  const voided: readonly CostLineRow[] = [
    line(KG.id, '0.020000', '2026-09-24T20:00:00+00:00', { id: 'undo', reversalOf: 'orig' }),
    line(KG.id, '0.020000', '2026-09-24T18:00:00+00:00', { id: 'orig' }),
    line(GEN.id, '0.016000', '2026-09-10T09:00:00+00:00', { id: 'stands' }),
  ];

  it('drops the reversal AND the document it cancels', () => {
    const costs = costsFrom(voided, PROVIDERS, 'kg', FACTORS);
    expect(costs.deliveries).toBe(1);
    expect(costs.series.length).toBe(1);
    expect(costs.series[0]?.providerId).toBe(GEN.id);
  });

  // ⚠️ THE REVERSAL CAN ARRIVE BEFORE OR AFTER WHAT IT CANCELS, which is why
  // `costsFrom` makes two passes — `takingsFrom`'s own arrangement. A one-pass
  // version would keep the original whenever the response happened to put the
  // reversal second.
  it('finds the cancelled document wherever the response puts it', () => {
    const reordered = [voided[1], voided[0], voided[2]] as CostLineRow[];
    expect(costsFrom(reordered, PROVIDERS, 'kg', FACTORS).deliveries).toBe(1);
  });

  it('leaves a shop whose only delivery was voided reading `nothing`', () => {
    const both = [voided[0], voided[1]] as CostLineRow[];
    expect(costsFrom(both, PROVIDERS, 'kg', FACTORS).state).toBe('nothing');
  });
});

describe('the price, per PRICE unit and not per base', () => {
  // ⚠️⚠️ THE ROUND TRIP IS THE CLAIM. `0.018500` per gram is `$18.50 / kg`, and
  // this is the same conversion `memoryFor` makes for Comprar's prefill — which
  // is the whole reason both screens must use `priceCentavos` and not two
  // arithmetics. A shopkeeper who read `$18.50` here and was offered something
  // else on the next delivery would be looking at one provider wearing two
  // prices.
  it('turns a per-gram decimal into what a kilo costs', () => {
    const costs = costsFrom(THREE, PROVIDERS, 'kg', FACTORS);
    const gen = costs.series.find((one) => one.providerId === GEN.id);
    expect(gen?.latest?.centavos).toBe(1850);
    expect(gen?.latest?.price).toContain('18.50');
    // C3.10 — a price is never shown without its unit.
    expect(gen?.latest?.price).toContain(ES.units.kg);
  });

  it('keeps the figure Postgres sent, verbatim, beside the converted one', () => {
    const costs = costsFrom(THREE, PROVIDERS, 'kg', FACTORS);
    const gen = costs.series.find((one) => one.providerId === GEN.id);
    expect(gen?.latest?.perBase).toBe('0.018500');
  });

  // ⚠️⚠️ AND THE LABELS OBEY C12.2 — `$16 / kg`, NOT `$16.00 / kg`. The centavos
  // are hidden when they are zero, which is a shipped rule of `formatMXN` and is
  // asserted here because these two strings ARE the axis: they are the whole
  // defence of a chart whose y-axis does not start at zero (`plotted`'s header),
  // so what they actually say is load-bearing rather than cosmetic.
  it('reports the cheapest and the dearest, with C3.10 labels for the axis', () => {
    const costs = costsFrom(THREE, PROVIDERS, 'kg', FACTORS);
    expect(costs.low).toBe(1600);
    expect(costs.high).toBe(2000);
    expect(costs.lowLabel).toBe(`$16 ${ES.catalog.per} ${ES.units.kg}`);
    expect(costs.highLabel).toBe(`$20 ${ES.catalog.per} ${ES.units.kg}`);
    // ⚠️ AND A FIGURE WITH CENTAVOS KEEPS THEM, so the rule above is C12.2 and
    // not a formatter that has quietly lost its decimals.
    const gen = costs.series.find((one) => one.providerId === GEN.id);
    expect(gen?.latest?.price).toBe(`$18.50 ${ES.catalog.per} ${ES.units.kg}`);
  });
});

describe('the series, the legend and the order they come in', () => {
  // ⚠️ MOST RECENT DELIVERY FIRST, so the supplier she bought from this morning
  // is always the first colour and a one-supplier shop always draws the same one.
  it('orders providers by their most recent delivery, newest first', () => {
    const costs = costsFrom(THREE, PROVIDERS, 'kg', FACTORS);
    expect(costs.series.map((one) => one.providerId)).toEqual([KG.id, GEN.id]);
    expect(costs.series.map((one) => one.hue)).toEqual([0, 1]);
  });

  // ⚠️⚠️ THE POINTS ARE OLDEST FIRST, WHICH IS THE OPPOSITE OF THE READ. A line
  // is drawn left to right in time; `plotted` and the matrix both depend on it.
  it('walks each provider oldest first, whatever order the database sent', () => {
    const costs = costsFrom(THREE, PROVIDERS, 'kg', FACTORS);
    const gen = costs.series.find((one) => one.providerId === GEN.id);
    expect(gen?.points.map((one) => one.day)).toEqual(['2026-09-10', '2026-09-20']);
    expect(gen?.latest?.day).toBe('2026-09-20');
  });

  // ⚠️⚠️ A PROVIDER WITH NO DELIVERIES IS NOT A SERIES, the opposite call from
  // Comprar's header and right for the opposite reason: that list is a choice
  // about the future, and an empty line in a chart's legend is a supplier who
  // looks like they charge nothing.
  it('builds the legend from the LEDGER, not from the provider directory', () => {
    const idle: Provider = { id: 'p-never', name: 'Nunca nos vendió', isGeneric: false };
    const costs = costsFrom(THREE, [...PROVIDERS, idle], 'kg', FACTORS);
    expect(costs.series.map((one) => one.providerId)).not.toContain('p-never');
  });

  // ⚠️ AND IT IS *NAMED* FROM THE DIRECTORY, so a delivery whose supplier row is
  // slow, retired or unreadable still draws. Dropping it would hide a purchase
  // because a second read was slow.
  it('still draws a delivery whose provider the directory cannot name', () => {
    const costs = costsFrom(THREE, [], 'kg', FACTORS);
    expect(costs.series.length).toBe(2);
    for (const one of costs.series) expect(one.name).toBe(ES.costs.unnamedProvider);
  });

  // ⚠️ `Genérico` IS A SERIES LIKE ANY OTHER — *"You can also look at it in Costos
  // if there are records"* — and is NOT promoted to the front. `providersFrom`
  // promotes it because F6 makes it Comprar's DEFAULT; there is no default here.
  it('marks the generic row without promoting or renaming it', () => {
    const costs = costsFrom(THREE, PROVIDERS, 'kg', FACTORS);
    const gen = costs.series.find((one) => one.providerId === GEN.id);
    expect(gen?.isGeneric).toBe(true);
    expect(gen?.name).toBe('Genérico');
    expect(costs.series[0]?.providerId).not.toBe(GEN.id);
  });

  // ⚠️ THE DAYS ARE THE MATRIX'S COLUMNS, oldest first, one per day that carries
  // a delivery — and there is NO day spine. `0032`: nothing records a delivery
  // that was due and did not arrive, so a day with no purchase has no column
  // rather than a zero nobody can back.
  it('lists only the days that carry a delivery, oldest first', () => {
    const costs = costsFrom(THREE, PROVIDERS, 'kg', FACTORS);
    expect(costs.days).toEqual(['2026-09-10', '2026-09-20', '2026-09-24']);
  });

  // ⚠️ THE DAY IS THE ISO PREFIX AND NOT A `Date`'s LOCAL DAY, which is a
  // deliberate disagreement with `today.ts` and the smaller claim: that module
  // decides which rows belong to today, this one only LABELS a row the database
  // already chose. Converting would move a 19:00 Mexico City delivery onto the
  // previous column on a phone set to UTC.
  it('labels a day off the instant Postgres sent, with no timezone arithmetic', () => {
    const late = [line(KG.id, '0.020000', '2026-09-24T23:30:00+00:00')];
    expect(costsFrom(late, PROVIDERS, 'kg', FACTORS).days).toEqual(['2026-09-24']);
  });
});

describe('the geometry — fractions of a box, and the origin a person means', () => {
  it('spreads x by TIME and not by index, which is what makes it a chart', () => {
    // Three deliveries on the 10th, the 20th and the 24th, all at 09:00: the
    // middle dot sits ⚠️ TEN FOURTEENTHS along and not half way. An evenly-spaced
    // axis would draw a ten-day gap and a four-day gap as one step each, which is
    // the shape of a lie a shopkeeper would act on.
    const costs = costsFrom(THREE, PROVIDERS, 'kg', FACTORS);
    const gen = plotted(costs).find((one) => one.providerId === GEN.id);
    expect(gen?.dots[0]?.x).toBeCloseTo(0, 6);
    expect(gen?.dots[1]?.x).toBeCloseTo(10 / 14, 6);
    expect(gen?.dots[1]?.x).not.toBeCloseTo(0.5, 2);
    const kg = plotted(costs).find((one) => one.providerId === KG.id);
    expect(kg?.dots[0]?.x).toBeCloseTo(1, 6);
  });

  // ⚠️ `y` RISES WITH PRICE — the origin is BOTTOM LEFT, which is the one a
  // person means. Each renderer flips it once; `plotted` never does.
  it('puts the cheapest delivery at y = 0 and the dearest at y = 1', () => {
    const costs = costsFrom(THREE, PROVIDERS, 'kg', FACTORS);
    const gen = plotted(costs).find((one) => one.providerId === GEN.id);
    const kg = plotted(costs).find((one) => one.providerId === KG.id);
    expect(gen?.dots[0]?.y).toBeCloseTo(0, 6);
    expect(kg?.dots[0]?.y).toBeCloseTo(1, 6);
    // $18.50 between $16.00 and $20.00 is 250/400.
    expect(gen?.dots[1]?.y).toBeCloseTo(0.625, 6);
  });

  // ⚠️⚠️ A ZERO-WIDTH OR ZERO-HEIGHT RANGE CENTRES RATHER THAN PINNING TO AN
  // EDGE. `(v - min) / (max - min)` is `0/0` for one delivery, or for several at
  // one price; pinning to `0` would draw a flat line along the BOTTOM of the box,
  // which reads as *the cheapest it has ever been*.
  it('centres a single delivery instead of dropping it in a corner', () => {
    const one = costsFrom([THREE[1] as CostLineRow], PROVIDERS, 'kg', FACTORS);
    const dots = plotted(one)[0]?.dots;
    expect(dots?.[0]?.x).toBeCloseTo(0.5, 6);
    expect(dots?.[0]?.y).toBeCloseTo(0.5, 6);
  });

  it('centres a price that has never moved, at every point', () => {
    const flat = [
      line(GEN.id, '0.018000', '2026-09-24T09:00:00+00:00'),
      line(GEN.id, '0.018000', '2026-09-10T09:00:00+00:00'),
    ];
    const costs = costsFrom(flat, PROVIDERS, 'kg', FACTORS);
    expect(costs.low).toBe(costs.high);
    for (const dot of plotted(costs)[0]?.dots ?? []) expect(dot.y).toBeCloseTo(0.5, 6);
  });

  // ⚠️ EVERY FRACTION IS INSIDE THE BOX. A dot outside `[0, 1]` would be drawn
  // outside the card, and the card clips — so the delivery would simply be
  // missing, with the chart still looking finished.
  it('never puts a dot outside the unit box', () => {
    for (const one of plotted(costsFrom(THREE, PROVIDERS, 'kg', FACTORS))) {
      for (const dot of one.dots) {
        expect(dot.x).toBeGreaterThanOrEqual(0);
        expect(dot.x).toBeLessThanOrEqual(1);
        expect(dot.y).toBeGreaterThanOrEqual(0);
        expect(dot.y).toBeLessThanOrEqual(1);
      }
    }
  });

  it('plots nothing at all for a read that has not landed', () => {
    expect(plotted(costsFrom(null, PROVIDERS, 'kg', FACTORS))).toEqual([]);
  });
});

describe('the matrix — the same rows, with no colour in them', () => {
  it('gives every provider a cell for every day, in the days` order', () => {
    const costs = costsFrom(THREE, PROVIDERS, 'kg', FACTORS);
    const rows = matrixOf(costs);
    expect(rows.length).toBe(2);
    for (const row of rows) {
      expect(row.cells.map((cell) => cell.day)).toEqual(costs.days);
    }
  });

  // ⚠️⚠️ A GAP IS NOT A ZERO. `null` is *this provider did not deliver that day*
  // and the screen draws C3.12's dash; a `$0.00` in this grid would say a
  // supplier gave the shop something free.
  it('leaves a day this provider did not deliver as null, never as a zero', () => {
    const rows = matrixOf(costsFrom(THREE, PROVIDERS, 'kg', FACTORS));
    const gen = rows.find((row) => row.providerId === GEN.id);
    // Genérico delivered on the 10th and the 20th, not on the 24th.
    expect(gen?.cells[0]?.price).not.toBeNull();
    expect(gen?.cells[1]?.price).not.toBeNull();
    expect(gen?.cells[2]?.price).toBeNull();
    for (const cell of gen?.cells ?? []) {
      if (cell.price !== null) expect(cell.price).not.toContain('0.00');
    }
  });

  // ⚠️ THE LAST DELIVERY OF A DAY WINS THE CELL — the same pick
  // `product_purchases_daily`'s ordered `array_agg` makes on the server, without
  // its third tiebreak. Two deliveries on one day from one provider have no room
  // in a grid; the chart draws both dots.
  it('shows the most recent of two deliveries on one day', () => {
    const twice = [
      line(GEN.id, '0.019000', '2026-09-20T17:00:00+00:00'),
      line(GEN.id, '0.017000', '2026-09-20T09:00:00+00:00'),
    ];
    const rows = matrixOf(costsFrom(twice, PROVIDERS, 'kg', FACTORS));
    // ⚠️ `$19` AND NOT `$19.00` — C12.2 again. What matters is that the cell holds
    // the 17:00 delivery and not the 09:00 one.
    expect(rows[0]?.cells[0]?.price).toBe(`$19 ${ES.catalog.per} ${ES.units.kg}`);
    expect(rows[0]?.cells[0]?.price).not.toContain('17');
    // ⚠️ AND BOTH ARE STILL DELIVERIES AND BOTH ARE STILL DOTS.
    const costs = costsFrom(twice, PROVIDERS, 'kg', FACTORS);
    expect(costs.deliveries).toBe(2);
    expect(plotted(costs)[0]?.dots.length).toBe(2);
  });

  it('carries the provider name, so the table needs no legend', () => {
    const rows = matrixOf(costsFrom(THREE, PROVIDERS, 'kg', FACTORS));
    expect(rows.map((row) => row.name).sort()).toEqual([GEN.name, KG.name].sort());
  });
});

describe('the series ring, and what it is allowed to promise', () => {
  it('has colours to iterate, so every claim below is not vacuous', () => {
    expect(SERIE.length).toBeGreaterThanOrEqual(3);
  });

  it('gives every entry a six-digit hex, because a luminance parser needs one', () => {
    for (const colour of SERIE) expect(colour).toMatch(/^#[0-9A-F]{6}$/);
  });

  it('gives every series its own colour up to the ring', () => {
    expect(new Set(SERIE).size).toBe(SERIE.length);
  });

  // ⚠️⚠️ IT WRAPS RATHER THAN FAILING, AND THAT IS THE DESIGNED WART. A product
  // bought from six suppliers reuses the first colour for the sixth line; the
  // legend still names it and the matrix still carries it. See `SERIE`'s header.
  it('wraps, so a sixth supplier still gets a line', () => {
    expect(serieColour(SERIE.length)).toBe(SERIE[0]);
    expect(serieColour(SERIE.length + 1)).toBe(SERIE[1]);
  });

  // ⚠️ A NEGATIVE INDEX CANNOT ARRIVE — `costsFrom` assigns from `map`'s index —
  // and it still answers a colour rather than `undefined`, because a `hue` that
  // ever went wrong should draw the wrong line and not crash the screen.
  it('answers a colour for any index at all', () => {
    for (const hue of [-1, 0, 4, 99]) expect(serieColour(hue)).toMatch(/^#[0-9A-F]{6}$/);
  });

  it('clears WCAG`s 3:1 non-text floor on every ground a plot can sit on', () => {
    // ⚠️ THE PLOT IS `superficie` ON `fondo` AND THE LEGEND SITS ON `fondo`;
    // `banda` is here because the PDF's table head uses it.
    const grounds = ['#FFFCF6', '#FFFFFF', '#FBF0DE', '#E6F0EA', '#FCF1DE'];
    for (const colour of SERIE) {
      for (const ground of grounds) {
        expect(contrast(colour, ground)).toBeGreaterThanOrEqual(3);
      }
    }
  });

  // ⚠️⚠️ AND THIS ONE ASSERTS THE LIMITATION RATHER THAN A PROPERTY, which is
  // `palette.test.ts`'s own *"does NOT separate the three state colours by
  // brightness, which is the point"* applied here. Five categorical colours on a
  // light ground cannot separate by luminance; if a future edit ever made them,
  // this assertion should be deleted deliberately rather than quietly.
  it('does NOT separate every pair by brightness, and the matrix is why that is survivable', () => {
    let closest = Infinity;
    for (let i = 0; i < SERIE.length; i += 1) {
      for (let j = i + 1; j < SERIE.length; j += 1) {
        closest = Math.min(closest, contrast(SERIE[i] as string, SERIE[j] as string));
      }
    }
    expect(closest).toBeLessThan(1.5);
  });
});

/** WCAG 2.1 relative luminance, the same arithmetic `palette.test.ts` uses. */
function luminance(hex: string): number {
  const channels = [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16) / 255);
  const linear = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * (linear[0] as number) + 0.7152 * (linear[1] as number) + 0.0722 * (linear[2] as number);
}

function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
