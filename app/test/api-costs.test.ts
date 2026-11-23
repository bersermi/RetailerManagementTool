import { describe, expect, it } from 'vitest';

import {
  COSTS_COLUMNS,
  COSTS_ORDER,
  COSTS_ORDER_ASCENDING,
  COSTS_TABLE,
  COSTS_VARIANT_COLUMN,
  COST_WINDOWS,
  anyDash,
  changeLine,
  changePoints,
  costAsOf,
  costChanges,
  costsFrom,
  costsKey,
  matrixOf,
  picksProvider,
  plotted,
  showsChanges,
  weekPrice,
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

  // ⚠️⚠️ THIS IS THE THIRD PLACE THE OLD ANSWER WAS WRITTEN DOWN, AND THE MOST
  // EXPLICIT — REWRITTEN 2026-09-26 BY `5g-iii-b` ON THE OWNER'S RULING (*"fix the
  // Costos date"*). It read:
  //
  //   *"THE DAY IS THE ISO PREFIX AND NOT A `Date`'s LOCAL DAY, which is a **deliberate
  //   disagreement with `today.ts`** … this one only LABELS a row the database already
  //   chose."*
  //
  // ⚠️⚠️ **THE DATABASE CHOSE NO DAY.** `purchase.occurred_at` is a `timestamptz` — an
  // INSTANT — so "the ISO prefix" is the UTC calendar day, which is a choice and not a
  // fact. **In a UTC−6 shop it is the wrong one after 18:00**, and the owner found it
  // on his own phone: a delivery keyed at 19:30 on the 25th was labelled *26 de
  // septiembre* on this chart and in the PDF. ⚠️ The disagreement was DELIBERATE and
  // documented in three places (this comment, `costs-pdf.test.ts`'s, and the module's)
  // — **which is why nothing went red for a day.**
  // ✅ `costsFrom` now calls `isoDay`, `catalog.ts`'s one answer, and `today.ts`'s
  // header is honoured rather than disagreed with.
  //
  // ⚠️ THE FIXTURE IS BUILT FROM A **LOCAL** INSTANT so this holds on this Mac (UTC−6)
  // and on CI (UTC) without a pinned `TZ` ([[local-time-tests-need-a-pinned-tz]]).
  // ⚠️ **The other day-bearing fixtures in this file are UTC strings at 09:00–23:30Z**,
  // every one of which falls inside its own day in both UTC−6 and UTC — so they agree
  // under either rule and were left alone. **A NEW day fixture should be built
  // locally**, not spelled as a UTC string.
  it('keeps a late-evening delivery on its own day, in any timezone', () => {
    // 7:30pm local on the 25th — the owner's own case. In UTC−6 that is 01:30 UTC on
    // the 26th, which is exactly what the old rule labelled the 26th.
    const evening = new Date(2026, 8, 25, 19, 30, 0, 0);
    const late = [line(KG.id, '0.020000', evening.toISOString())];
    expect(costsFrom(late, PROVIDERS, 'kg', FACTORS).days).toEqual(['2026-09-25']);
  });

  // ⚠️ AND A POINT WHOSE INSTANT DOES NOT PARSE IS DROPPED rather than labelled
  // `NaN-NaN-NaN`. `slice(0, 10)` never cared whether the value was an instant.
  it('drops a point whose instant cannot be read', () => {
    const broken = [line(KG.id, '0.020000', 'not-an-instant')];
    expect(costsFrom(broken, PROVIDERS, 'kg', FACTORS).days).toEqual([]);
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

  // ⚠️⚠️ AND IT CARRIES `isGeneric`, ADDED BY `5g-iii-a` FOR A READER WITH NO
  // LEGEND AT ALL. The owner took the chart out of the PDF and the legend went
  // with it — a legend pairs a HUE with a name and there are no hues left — so
  // *compra directa* has to ride on the row's own stub. ⚠️ It is a FIELD rather
  // than an index into `costs.series` at the call site: this function's order is
  // an implementation detail somebody may reasonably change, and pairing two
  // arrays positionally across a module boundary is how that change becomes a
  // market run labelled as a supplier.
  it('says which row is the market, so a table with no legend still can', () => {
    const rows = matrixOf(costsFrom(THREE, PROVIDERS, 'kg', FACTORS));
    const gen = rows.find((row) => row.providerId === GEN.id);
    const kg = rows.find((row) => row.providerId === KG.id);
    expect(gen?.isGeneric).toBe(true);
    expect(kg?.isGeneric).toBe(false);
  });

  // ⚠️ IT IS `CostSeries.isGeneric` VERBATIM AND NEVER A SECOND OPINION — a
  // `name === 'Genérico'` test at either end would be a second answer to *is this
  // the market*, decided by a word a shopkeeper could rename (`0039`).
  it('takes the flag from the series and does not re-derive it', () => {
    const costs = costsFrom(THREE, PROVIDERS, 'kg', FACTORS);
    const rows = matrixOf(costs);
    expect(rows.map((row) => row.isGeneric)).toEqual(costs.series.map((one) => one.isGeneric));
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

// ============================================================================
// *CUÁNTO HA CAMBIADO* — `5R-t`, drawn with the owner on 2026-11-23. Five rows
// of pesos and percent over the chart; every provider together or one. ⚠️ The
// fixtures are the situations walked through with him, on 23 November 2026.
// Instants at 15:00 UTC, 09:00 in Mexico City: the same calendar day in any
// zone this suite runs in.
// ============================================================================

const TODAY = '2026-11-23';
/** A kilo at `pesos` — the price per gram, at scale 6. */
const kilo = (pesos: number): string => `0.${String(pesos).padStart(3, '0')}000`;
const at = (day: string): string => `${day}T15:00:00+00:00`;
const DON_PEPE: Provider = { id: 'p-pepe', name: 'Don Pepe', isGeneric: false };
const WITH_PEPE: readonly Provider[] = [...PROVIDERS, DON_PEPE];

describe('cuánto ha cambiado — the windows (5R-t)', () => {
  it('opens fifteen days back, and 1, 3, 6 and 12 calendar months back', () => {
    expect(COST_WINDOWS).toEqual(['d15', 'm1', 'm3', 'm6', 'y1']);
    expect(COST_WINDOWS.map((w) => costAsOf(TODAY, w))).toEqual([
      '2026-11-08',
      '2026-10-23',
      '2026-08-23',
      '2026-05-23',
      '2025-11-23',
    ]);
  });

  it('counts a month as Precios does — clamped to the shorter month — and crosses a year', () => {
    expect(costAsOf('2026-03-31', 'm1')).toBe('2026-02-28');
    expect(costAsOf('2026-05-31', 'm3')).toBe('2026-02-28');
    expect(costAsOf('2028-02-29', 'y1')).toBe('2027-02-28');
    expect(costAsOf('2026-03-05', 'd15')).toBe('2026-02-18');
    expect(costAsOf('2026-01-10', 'd15')).toBe('2025-12-26');
    expect(costAsOf('2026-01-10', 'm1')).toBe('2025-12-10');
  });
});

describe('cuánto ha cambiado — the rows she reads (5R-t)', () => {
  it('reads the kilo prices the fixtures mean', () => {
    expect(kilo(24)).toBe('0.024000');
    expect(kilo(19)).toBe('0.019000');
  });

  // Situation 1: jitomate every week from the Central, since mid-October.
  const WEEKLY: readonly CostLineRow[] = [
    line(KG.id, kilo(24), at('2026-11-18')),
    line(KG.id, kilo(23), at('2026-11-11')),
    line(KG.id, kilo(22), at('2026-11-04')),
    line(KG.id, kilo(21), at('2026-10-28')),
    line(KG.id, kilo(20), at('2026-10-21')),
    line(KG.id, kilo(20), at('2026-10-14')),
  ];

  it('compares her last delivery with the last one before each window opened', () => {
    const costs = costsFrom(WEEKLY, PROVIDERS, 'kg', FACTORS);
    const rows = costChanges(changePoints(costs, null), TODAY);
    expect(rows.map((r) => [r.window, r.centavos, r.tenths])).toEqual([
      ['d15', 200, 91],
      ['m1', 400, 200],
      ['m3', null, null],
      ['m6', null, null],
      ['y1', null, null],
    ]);
    expect(rows.map(changeLine)).toEqual([
      { pesos: '+$2', percent: '+9.1 %', same: false },
      { pesos: '+$4', percent: '+20.0 %', same: false },
      { pesos: ES.costs.change.none, percent: ES.costs.change.none, same: false },
      { pesos: ES.costs.change.none, percent: ES.costs.change.none, same: false },
      { pesos: ES.costs.change.none, percent: ES.costs.change.none, same: false },
    ]);
    expect(anyDash(rows)).toBe(true);
  });

  // Situation 2: she switched from the Central to Don Pepe.
  const SWITCHED: readonly CostLineRow[] = [
    line(DON_PEPE.id, kilo(19), at('2026-11-18')),
    line(KG.id, kilo(22), at('2026-11-04')),
    line(KG.id, kilo(20), at('2026-10-21')),
  ];

  it('reads Todos as what she pays, whoever sold it — a cheaper supplier is a fall', () => {
    const costs = costsFrom(SWITCHED, WITH_PEPE, 'kg', FACTORS);
    const rows = costChanges(changePoints(costs, null), TODAY);
    expect(changeLine(rows[0]!)).toEqual({ pesos: '−$3', percent: '−13.6 %', same: false });
    expect(changeLine(rows[1]!)).toEqual({ pesos: '−$1', percent: '−5.0 %', same: false });
  });

  it('reads one supplier by its own deliveries — a dash where it delivered nothing inside the window', () => {
    const costs = costsFrom(SWITCHED, WITH_PEPE, 'kg', FACTORS);
    const central = costChanges(changePoints(costs, KG.id), TODAY);
    // Its last delivery (4 Nov, $22) is older than fifteen days; against 21 Oct it rose $2.
    expect(central.map((r) => r.centavos)).toEqual([null, 200, null, null, null]);
    const pepe = costChanges(changePoints(costs, DON_PEPE.id), TODAY);
    expect(pepe.map((r) => r.centavos)).toEqual([null, null, null, null, null]);
    expect(changePoints(costs, 'nobody')).toEqual([]);
  });

  // Situation 3: rice, once a month.
  it('gives a short window a figure only when something was bought inside it', () => {
    const monthly = [line(KG.id, kilo(32), at('2026-11-20')), line(KG.id, kilo(31), at('2026-10-20')), line(KG.id, kilo(30), at('2026-09-20'))];
    const bought = costChanges(changePoints(costsFrom(monthly, PROVIDERS, 'kg', FACTORS), null), TODAY);
    expect(bought.map((r) => r.centavos)).toEqual([100, 100, null, null, null]);
    const notYet = costChanges(changePoints(costsFrom(monthly.slice(1), PROVIDERS, 'kg', FACTORS), null), TODAY);
    expect(notYet.map((r) => r.centavos)).toEqual([null, null, null, null, null]);
  });

  // Situation 4: the price has not moved.
  it('says Sin cambio across both columns when the price is the same', () => {
    const flat = [line(KG.id, kilo(20), at('2026-11-18')), line(KG.id, kilo(20), at('2026-10-01'))];
    const rows = costChanges(changePoints(costsFrom(flat, PROVIDERS, 'kg', FACTORS), null), TODAY);
    expect(changeLine(rows[0]!)).toEqual({ pesos: ES.costs.change.same, percent: '', same: true });
    expect(anyDash(rows.slice(0, 2))).toBe(false);
  });

  it('averages each end over its last week of deliveries', () => {
    const twice = [
      line(KG.id, kilo(25), '2026-11-18T18:00:00+00:00'),
      line(GEN.id, kilo(21), '2026-11-18T15:00:00+00:00'),
      line(KG.id, kilo(20), at('2026-11-01')),
    ];
    const costs = costsFrom(twice, PROVIDERS, 'kg', FACTORS);
    expect(costs.all.map((p) => p.centavos)).toEqual([2000, 2100, 2500]);
    expect(weekPrice(costs.all, TODAY, null)).toBe(2300);
    expect(costChanges(costs.all, TODAY)[0]!.centavos).toBe(300);
  });

  // Situation 5, found on the emulator: two suppliers on alternate days, $3 apart,
  // neither changing its price. The last delivery alone would read the weekday.
  it('reads two suppliers taking turns as one steady price — Sin cambio, whichever day the window opens', () => {
    const rows: CostLineRow[] = [];
    for (let d = 0; d < 400; d += 1) {
      const day = new Date(Date.UTC(2026, 10, 23 - d));
      const dow = day.getUTCDay();
      if (dow === 0) continue;
      const iso = day.toISOString().slice(0, 10);
      rows.push(line(dow % 2 === 1 ? KG.id : DON_PEPE.id, kilo(dow % 2 === 1 ? 52 : 49), at(iso)));
    }
    const costs = costsFrom(rows, WITH_PEPE, 'kg', FACTORS);
    for (const today of ['2026-11-23', '2026-11-22', '2026-11-20', '2026-11-17']) {
      const all = costChanges(costs.all, today);
      expect(all.map((r) => r.centavos)).toEqual([0, 0, 0, 0, 0]);
      expect(changeLine(all[0]!).same).toBe(true);
    }
    const kg = costChanges(changePoints(costs, KG.id), TODAY);
    expect(kg.map((r) => r.centavos)).toEqual([0, 0, 0, 0, 0]);
  });

  it('never lets now reach back into then', () => {
    const close = [line(KG.id, kilo(30), at('2026-11-10')), line(KG.id, kilo(20), at('2026-11-07'))];
    const costs = costsFrom(close, PROVIDERS, 'kg', FACTORS);
    expect(weekPrice(costs.all, TODAY, '2026-11-08')).toBe(3000);
    expect(weekPrice(costs.all, '2026-11-08', null)).toBe(2000);
    expect(costChanges(costs.all, TODAY)[0]!.centavos).toBe(1000);
  });

  it('leaves a voided delivery out of Todos, as out of the chart', () => {
    const voided = [
      line(KG.id, kilo(40), at('2026-11-19'), { reversalOf: 'doc-wrong' }),
      line(KG.id, kilo(40), at('2026-11-18'), { id: 'doc-wrong' }),
      line(KG.id, kilo(24), at('2026-11-17')),
      line(KG.id, kilo(22), at('2026-11-04')),
    ];
    const costs = costsFrom(voided, PROVIDERS, 'kg', FACTORS);
    expect(costs.all).toHaveLength(costs.deliveries);
    expect(costChanges(costs.all, TODAY)[0]!.centavos).toBe(200);
  });
});

describe('cuánto ha cambiado — when it shows, and its buttons (5R-t)', () => {
  it('shows from the second delivery on, and never for a read not back', () => {
    expect(showsChanges(costsFrom(undefined, PROVIDERS, 'kg', FACTORS))).toBe(false);
    expect(showsChanges(costsFrom([], PROVIDERS, 'kg', FACTORS))).toBe(false);
    expect(showsChanges(costsFrom(THREE.slice(0, 1), PROVIDERS, 'kg', FACTORS))).toBe(false);
    expect(showsChanges(costsFrom(THREE, PROVIDERS, 'kg', FACTORS))).toBe(true);
    const twoOnce = [line(KG.id, kilo(24), at('2026-11-18')), line(GEN.id, kilo(22), at('2026-11-01'))];
    expect(costsFrom(twoOnce, PROVIDERS, 'kg', FACTORS).state).toBe('unlinked');
    expect(showsChanges(costsFrom(twoOnce, PROVIDERS, 'kg', FACTORS))).toBe(true);
  });

  it('draws a button per supplier only when more than one has delivered', () => {
    const one = [line(KG.id, kilo(24), at('2026-11-18')), line(KG.id, kilo(22), at('2026-11-01'))];
    expect(picksProvider(costsFrom(one, PROVIDERS, 'kg', FACTORS))).toBe(false);
    expect(picksProvider(costsFrom(THREE, PROVIDERS, 'kg', FACTORS))).toBe(true);
  });

  it('keeps Todos oldest first and whole — every standing delivery, once', () => {
    const costs = costsFrom(THREE, PROVIDERS, 'kg', FACTORS);
    expect(costs.all.map((p) => p.day)).toEqual(['2026-09-10', '2026-09-20', '2026-09-24']);
    expect(changePoints(costs, null)).toBe(costs.all);
    expect(changePoints(costs, GEN.id).map((p) => p.day)).toEqual(['2026-09-10', '2026-09-20']);
  });
});
