import { describe, expect, it } from 'vitest';

import {
  PRICE_DAY_COLUMN,
  PRICE_PAGE,
  PRICE_TIEBREAK,
  PRICE_VARIANT_COLUMN,
  PURCHASE_PRICE_COLUMNS,
  PURCHASE_PRICE_TRADED_COLUMN,
  PURCHASE_PRICE_VIEW,
  SALE_PRICE_COLUMNS,
  SALE_PRICE_TRADED_COLUMN,
  SALE_PRICE_VIEW,
  SIDES,
  WINDOWS,
  asOfDay,
  changeLabel,
  changeOf,
  chartAsOf,
  perBaseText,
  plottedPrices,
  pointsFrom,
  pricesFrom,
  pricesKey,
  pricesLine,
  type PricePoint,
  type PriceRow,
} from '@/api/prices';
import { ES } from '@/strings';

// ============================================================================
// PRECIOS' DATA LAYER. Plan task `7b`.
//
// ⚠️ §2.11 allows a suite *"where a test pins a VALUE a customer sees or the
// ledger stores"*. Everything below is that kind: which day a card compares
// against, what percentage it prints, which price a day stands at, and where a
// point sits on the chart.
//
// ⚠️ EVERY FUNCTION TAKES `today` AS A DATE STRING, so nothing here depends on
// the machine's zone ([[local-time-tests-need-a-pinned-tz]]).
//
// ⚠️⚠️ THE WINDOW ASSERTIONS ARE AGAINST A CALENDAR, NOT AGAINST THE FUNCTION'S
// OWN ARITHMETIC ([[assert-against-a-calendar-not-the-array]]): 2026-09-28 is a
// Monday, 2024 is a leap year and 2026 is not — each checkable on paper.
// ============================================================================

/** `unit.factor_to_base` — `0001`'s rows for the units these fixtures use. */
const FACTORS = { kg: '1000.000000', g: '1.000000', pza: '1.000000' };

const TODAY = '2026-09-28';

function row(day: string, price: string | null): PriceRow {
  return { day, price };
}

function pt(day: string, centavos: number): PricePoint {
  return { day, centavos };
}

describe('the read, as a contract', () => {
  it('reads the sale side off the member-level velocity view and the purchase side off the purchases view', () => {
    expect(SALE_PRICE_VIEW).toBe('product_velocity_daily');
    expect(PURCHASE_PRICE_VIEW).toBe('product_purchases_daily');
  });

  it('asks for the TYPED gross price on both sides — the forty-first ruling, both lines with IVA', () => {
    expect(SALE_PRICE_COLUMNS).toContain('sale_price_last_gross');
    expect(PURCHASE_PRICE_COLUMNS).toContain('purchase_price_last_gross');
    expect(SALE_PRICE_COLUMNS).not.toContain('_net');
    expect(PURCHASE_PRICE_COLUMNS).not.toContain('_net');
  });

  it('aliases both to `price`, so one parser reads both sides', () => {
    expect(SALE_PRICE_COLUMNS).toBe('day,price:sale_price_last_gross::text');
    expect(PURCHASE_PRICE_COLUMNS).toBe('day,price:purchase_price_last_gross::text');
  });

  it('casts the price to text — a bare numeric is a double and parseDecimal refuses one', () => {
    for (const columns of [SALE_PRICE_COLUMNS, PURCHASE_PRICE_COLUMNS]) {
      expect(columns).toMatch(/_gross::text$/);
    }
  });

  it('filters on a positive QUANTITY — not line_count, which keeps a day that is only a void', () => {
    expect(SALE_PRICE_TRADED_COLUMN).toBe('qty_base_sold');
    expect(PURCHASE_PRICE_TRADED_COLUMN).toBe('purchases_qty_base');
  });

  it('pages below max_rows (1000) over the view grain with the variant fixed', () => {
    expect(PRICE_PAGE).toBeLessThan(1000);
    expect(PRICE_PAGE).toBeGreaterThan(0);
    expect(PRICE_VARIANT_COLUMN).toBe('variant_id');
    expect(PRICE_DAY_COLUMN).toBe('day');
    expect(PRICE_TIEBREAK).toEqual(['location_id']);
  });

  it('keys the cache by product, so one product never borrows another one\'s prices', () => {
    expect(pricesKey('a')).not.toEqual(pricesKey('b'));
    expect(pricesKey(null)).toEqual(['prices', 'history', '']);
  });
});

describe('perBaseText — a ten-decimal gross, rounded once to the scale priceCentavos reads', () => {
  it('rounds scale 10 to scale 6, half-up', () => {
    expect(perBaseText('18.0032000000')).toBe('18.003200');
    expect(perBaseText('0.0800005600')).toBe('0.080001');
    expect(perBaseText('0.0800004999')).toBe('0.080000');
    expect(perBaseText('0.1200000000')).toBe('0.120000');
  });

  it('takes a figure that already has six places or fewer unchanged', () => {
    expect(perBaseText('2.000000')).toBe('2.000000');
    expect(perBaseText('3')).toBe('3.000000');
  });

  it('rounds a negative away from zero', () => {
    expect(perBaseText('-2.5000005000')).toBe('-2.500001');
  });

  it('refuses what it cannot be exact about — more than ten places, a non-decimal, null', () => {
    expect(perBaseText('1.12345678901')).toBeNull();
    expect(perBaseText('1e3')).toBeNull();
    expect(perBaseText('abc')).toBeNull();
    expect(perBaseText(null)).toBeNull();
    expect(perBaseText(undefined)).toBeNull();
  });
});

describe('pointsFrom — one point per traded day, in the product\'s own price unit', () => {
  it('turns a per-gram price into a per-kilo price', () => {
    expect(pointsFrom([row('2026-09-01', '0.1200000000')], 'kg', FACTORS)).toEqual([
      pt('2026-09-01', 12000),
    ]);
  });

  it('lands a SALE\'s rebuilt gross on the shelf price it was keyed at', () => {
    // ⚠️ `0016` stores round(line_net / qty_base, 6) and `0032` multiplies it back
    // by 1.16. 1.5 kg of queso at $120.00/kg gross: net $155.17, so 0.103447 per
    // gram, times 1.16 is 0.11999852 — which must still read $120.00 a kilo.
    expect(pointsFrom([row('2026-09-01', '0.1199985200')], 'kg', FACTORS)).toEqual([
      pt('2026-09-01', 12000),
    ]);
  });

  it('keeps the LAST row of a day — the read orders by location within a day', () => {
    const rows = [row('2026-09-01', '10.0000000000'), row('2026-09-01', '11.0000000000')];
    expect(pointsFrom(rows, 'pza', FACTORS)).toEqual([pt('2026-09-01', 1100)]);
  });

  it('sorts oldest first whatever order the rows arrived in', () => {
    const rows = [row('2026-09-03', '3'), row('2026-09-01', '1'), row('2026-09-02', '2')];
    expect(pointsFrom(rows, 'pza', FACTORS)?.map((one) => one.day)).toEqual([
      '2026-09-01',
      '2026-09-02',
      '2026-09-03',
    ]);
  });

  it('drops a price it cannot read rather than drawing it at zero', () => {
    const rows = [row('2026-09-01', null), row('2026-09-02', 'x'), row('2026-09-03', '5')];
    expect(pointsFrom(rows, 'pza', FACTORS)).toEqual([pt('2026-09-03', 500)]);
  });

  it('drops a day that is not a date', () => {
    expect(pointsFrom([row('2026-9-1', '5')], 'pza', FACTORS)).toEqual([]);
  });

  it('answers null — not an empty list — when the price unit has no factor on this phone', () => {
    expect(pointsFrom([row('2026-09-01', '5')], 'caja', FACTORS)).toBeNull();
  });
});

describe('asOfDay — the day whose price a card compares against, read off a calendar', () => {
  it('este mes compares against the last day of last month', () => {
    expect(asOfDay(TODAY, 'mes')).toBe('2026-08-31');
    expect(asOfDay('2026-03-05', 'mes')).toBe('2026-02-28');
    expect(asOfDay('2024-03-05', 'mes')).toBe('2024-02-29');
    expect(asOfDay('2026-01-15', 'mes')).toBe('2025-12-31');
  });

  it('1, 3, 6 and 9 months go back to the same day of the month', () => {
    expect(asOfDay(TODAY, 'm1')).toBe('2026-08-28');
    expect(asOfDay(TODAY, 'm3')).toBe('2026-06-28');
    expect(asOfDay(TODAY, 'm6')).toBe('2026-03-28');
    expect(asOfDay(TODAY, 'm9')).toBe('2025-12-28');
  });

  it('clamps to the shorter month rather than spilling into the next one', () => {
    expect(asOfDay('2026-05-31', 'm3')).toBe('2026-02-28');
    expect(asOfDay('2024-05-31', 'm3')).toBe('2024-02-29');
    expect(asOfDay('2026-03-31', 'm1')).toBe('2026-02-28');
    expect(asOfDay('2026-10-31', 'm1')).toBe('2026-09-30');
  });

  it('crosses a year going back', () => {
    expect(asOfDay('2026-01-15', 'm1')).toBe('2025-12-15');
    expect(asOfDay('2026-02-10', 'm9')).toBe('2025-05-10');
  });

  it('en el año compares against the last day of last year', () => {
    expect(asOfDay(TODAY, 'anio')).toBe('2025-12-31');
    expect(asOfDay('2026-01-01', 'anio')).toBe('2025-12-31');
  });

  it('the chart reaches back to whichever card reaches further', () => {
    expect(chartAsOf(TODAY)).toBe('2025-12-28');
    expect(chartAsOf('2026-11-15')).toBe('2025-12-31');
  });
});

describe('changeOf and changeLabel — what a card says', () => {
  const HISTORY = [
    pt('2025-11-02', 1000),
    pt('2026-01-10', 1100),
    pt('2026-07-01', 1200),
    pt('2026-09-05', 1260),
  ];

  it('compares the latest price in the window with the price as it stood before it', () => {
    expect(changeOf(HISTORY, TODAY, 'mes')).toBe(50);
    expect(changeLabel(changeOf(HISTORY, TODAY, 'mes'))).toBe('Sube 5.0 %');
    expect(changeOf(HISTORY, TODAY, 'm1')).toBe(50);
    expect(changeOf(HISTORY, TODAY, 'm9')).toBe(260);
    expect(changeOf(HISTORY, TODAY, 'anio')).toBe(260);
  });

  it('rounds ONCE to what is shown — $11.00 to $12.60 is 14.545…%, which reads 14.5 and not 14.6', () => {
    expect(changeOf(HISTORY, TODAY, 'm3')).toBe(145);
    expect(changeLabel(changeOf(HISTORY, TODAY, 'm3'))).toBe('Sube 14.5 %');
    expect(changeOf(HISTORY, TODAY, 'm6')).toBe(145);
  });

  it('a fall reads as a fall, rounded away from zero', () => {
    const points = [pt('2026-08-01', 1260), pt('2026-09-10', 1200)];
    // 60 / 1260 = 4.7619…% — so 47.6 tenths, which rounds to 48.
    expect(changeOf(points, TODAY, 'mes')).toBe(-48);
    expect(changeLabel(-48)).toBe('Baja 4.8 %');
  });

  it('an identical price reads Sin cambio, and so does a move under 0.05 %', () => {
    expect(changeLabel(changeOf([pt('2026-08-01', 900), pt('2026-09-10', 900)], TODAY, 'mes'))).toBe(
      ES.prices.same,
    );
    expect(changeOf([pt('2026-08-01', 10000), pt('2026-09-10', 10004)], TODAY, 'mes')).toBe(0);
  });

  it('is a dash — never Sin cambio — when nothing traded inside the window', () => {
    expect(changeOf([pt('2026-07-01', 1200)], TODAY, 'mes')).toBeNull();
    expect(changeLabel(null)).toBe(ES.documents.noFigure);
  });

  it('is a dash when there is no price from before the window', () => {
    expect(changeOf([pt('2026-09-05', 1260)], TODAY, 'mes')).toBeNull();
    expect(changeOf([pt('2026-09-01', 1200), pt('2026-09-05', 1260)], TODAY, 'mes')).toBeNull();
  });

  it('treats the baseline day itself as BEFORE the window', () => {
    // 2026-08-31 is este mes's baseline — its price is the one September is measured from.
    expect(changeOf([pt('2026-08-31', 1000), pt('2026-09-01', 1100)], TODAY, 'mes')).toBe(100);
  });

  it('ignores a point dated after today', () => {
    const points = [pt('2026-08-01', 1000), pt('2026-09-10', 1100), pt('2026-10-02', 5000)];
    expect(changeOf(points, TODAY, 'mes')).toBe(100);
  });

  it('refuses to divide by a zero baseline', () => {
    expect(changeOf([pt('2026-08-01', 0), pt('2026-09-10', 1100)], TODAY, 'mes')).toBeNull();
  });
});

describe('pricesFrom — the screen\'s data', () => {
  it('is unknown while nothing is read, and never looks empty', () => {
    expect(pricesFrom(null, 'kg', FACTORS, TODAY).state).toBe('unknown');
    expect(pricesFrom(undefined, 'kg', FACTORS, TODAY).state).toBe('unknown');
  });

  it('is unknown when the price unit cannot be denominated yet', () => {
    const rows = { venta: [row('2026-09-01', '5')], compra: [] };
    expect(pricesFrom(rows, '', FACTORS, TODAY).state).toBe('unknown');
    expect(pricesFrom(rows, 'kg', {}, TODAY).state).toBe('unknown');
  });

  it('is nothing when neither side ever traded', () => {
    expect(pricesFrom({ venta: [], compra: [] }, 'pza', FACTORS, TODAY).state).toBe('nothing');
  });

  it('shows a product that was only ever bought, with the sale side empty and dashed', () => {
    const prices = pricesFrom({ venta: [], compra: [row('2026-09-01', '14.0000000000')] }, 'pza', FACTORS, TODAY);
    expect(prices.state).toBe('shown');
    expect(prices.sides.venta.latest).toBeNull();
    expect(prices.sides.venta.latestPrice).toBe('');
    for (const window of WINDOWS) expect(prices.sides.venta.changes[window]).toBe(ES.documents.noFigure);
    expect(prices.sides.compra.latest).toEqual(pt('2026-09-01', 1400));
  });

  it('names the latest price in its unit and the day it was charged', () => {
    const prices = pricesFrom(
      { venta: [row('2026-09-01', '0.1200000000'), row('2026-09-27', '0.1300000000')], compra: [] },
      'kg',
      FACTORS,
      TODAY,
    );
    expect(prices.sides.venta.latestPrice).toBe('$130 / kg');
    expect(prices.sides.venta.latestDay).toBe('27 de septiembre');
  });

  it('puts both sides on one axis — the cheapest and dearest across both', () => {
    const prices = pricesFrom(
      {
        venta: [row('2026-09-01', '18.0000000000'), row('2026-09-20', '19.0000000000')],
        compra: [row('2026-09-02', '14.0000000000'), row('2026-09-19', '15.0000000000')],
      },
      'pza',
      FACTORS,
      TODAY,
    );
    expect(prices.low).toBe(1400);
    expect(prices.high).toBe(1900);
    expect(prices.fromLabel).toBe('1 de septiembre');
    expect(prices.toLabel).toBe('20 de septiembre');
  });

  it('draws only what the cards speak about, and still uses older prices as a baseline', () => {
    const prices = pricesFrom(
      { venta: [row('2025-06-01', '10'), row('2026-09-01', '12')], compra: [] },
      'pza',
      FACTORS,
      TODAY,
    );
    expect(prices.sides.venta.points).toEqual([pt('2026-09-01', 1200)]);
    expect(prices.sides.venta.changes.m9).toBe('Sube 20.0 %');
    expect(prices.low).toBe(1200);
  });

  it('has a card for each of área 9\'s six windows, on both sides', () => {
    expect(WINDOWS).toEqual(['mes', 'm1', 'm3', 'm6', 'm9', 'anio']);
    expect(SIDES).toEqual(['venta', 'compra']);
    const prices = pricesFrom({ venta: [], compra: [row('2026-09-01', '1')] }, 'pza', FACTORS, TODAY);
    for (const side of SIDES) expect(Object.keys(prices.sides[side].changes)).toEqual([...WINDOWS]);
  });
});

describe('plottedPrices — both lines in one box, origin bottom-left', () => {
  it('shares one x and one y across both sides', () => {
    const prices = pricesFrom(
      {
        venta: [row('2026-09-01', '20'), row('2026-09-11', '20')],
        compra: [row('2026-09-06', '10')],
      },
      'pza',
      FACTORS,
      TODAY,
    );
    const dots = plottedPrices(prices);
    expect(dots.venta).toEqual([
      { x: 0, y: 1 },
      { x: 1, y: 1 },
    ]);
    expect(dots.compra).toEqual([{ x: 0.5, y: 0 }]);
  });

  it('measures x in days, so a gap of a month looks longer than a gap of a day', () => {
    const prices = pricesFrom(
      { venta: [row('2026-08-01', '1'), row('2026-08-02', '2'), row('2026-08-31', '3')], compra: [] },
      'pza',
      FACTORS,
      TODAY,
    );
    const xs = plottedPrices(prices).venta.map((one) => one.x);
    expect(xs[0]).toBe(0);
    expect(xs[1]).toBeCloseTo(1 / 30, 10);
    expect(xs[2]).toBe(1);
  });

  it('puts a lone point in the middle, and a flat price halfway up', () => {
    const prices = pricesFrom({ venta: [row('2026-09-01', '5')], compra: [] }, 'pza', FACTORS, TODAY);
    expect(plottedPrices(prices).venta).toEqual([{ x: 0.5, y: 0.5 }]);
    expect(plottedPrices(prices).compra).toEqual([]);
  });
});

describe('pricesLine — the one sentence instead of a chart', () => {
  it('a failure wins over every state', () => {
    expect(pricesLine('nothing', 'offline')).toBe(ES.api.errors.offline);
  });

  it('says what would fill the screen when nothing has traded', () => {
    expect(pricesLine('nothing', null)).toBe(ES.prices.nothing);
  });

  it('is empty while the read is out and when there is a chart', () => {
    expect(pricesLine('unknown', null)).toBe('');
    expect(pricesLine('shown', null)).toBe('');
  });
});
