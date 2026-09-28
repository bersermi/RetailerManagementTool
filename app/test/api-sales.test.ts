import { describe, expect, it } from 'vitest';

import type { CatalogEntry } from '@/api/catalog';
import {
  BARS,
  SALES_ACTIVE_COLUMN,
  SALES_COLUMNS,
  SALES_DAY_COLUMN,
  SALES_MONTHS,
  SALES_PAGE,
  SALES_TIEBREAK,
  SALES_VIEW,
  barsOf,
  bucketLabel,
  bucketOf,
  bucketsEnding,
  periodTitle,
  reportOf,
  salesFrom,
  salesKey,
  salesLine,
  salesSince,
  type SalesRow,
} from '@/api/sales';
import { ES } from '@/strings';

// ============================================================================
// NÚMEROS' DATA LAYER. Plan task `7a`.
//
// ⚠️ §2.11 allows a suite *"where a test pins a VALUE a customer sees or the
// ledger stores"* and refuses one over rendering. Everything below is the first
// kind: which period a day falls in, what a period added up to, what a product
// is counted in, and which sentence replaces the report.
//
// ⚠️ EVERY FUNCTION TAKES `today` AS A DATE STRING, so no assertion here depends
// on the machine's timezone ([[local-time-tests-need-a-pinned-tz]] is the defect
// that would otherwise follow: the Mac is UTC−6 and CI is UTC).
//
// ⚠️⚠️ THE CALENDAR ASSERTIONS ARE AGAINST A CALENDAR, NOT AGAINST THE ARRAY
// THE FUNCTION BUILT ([[assert-against-a-calendar-not-the-array]]). 2026-09-28
// is a Monday — read off a printed calendar — so every week expectation below
// can be checked by a person holding one.
// ============================================================================

/** `unit.factor_to_base` — `0001`'s rows for the three units these fixtures use. */
const FACTORS = { kg: '1000.000000', g: '1.000000', pza: '1.000000', '250g': '250.000000' };
const BASES = { kg: 'g', g: 'g', pza: 'pza', '250g': 'g' };

/** A catalog entry — only the fields `reportOf` reads are meaningful. */
function entry(id: string, priceUnit: string, baseUnit: string): CatalogEntry {
  return { id, priceUnit, baseUnit } as unknown as CatalogEntry;
}

/**
 * One view row as PostgREST sends it.
 *
 * ⚠️ BOTH FIGURES ARE DECIMAL STRINGS, which is what `SALES_COLUMNS`' `::text`
 * casts exist for; a number here would test a wire shape this app never gets.
 */
function row(
  day: string,
  variant: string,
  qty: string,
  gross: string,
  extra: Partial<SalesRow> = {},
): SalesRow {
  return {
    day,
    variant_id: variant,
    variant_name: `Producto ${variant}`,
    family_id: 'fam-verdura',
    family_name: 'Verdura',
    base_unit_code: 'g',
    qty_base_sold: qty,
    revenue_gross: gross,
    ...extra,
  };
}

describe('the read, as the contract check will send it', () => {
  it('asks the view for named columns, both figures cast to text', () => {
    expect(SALES_VIEW).toBe('product_velocity_daily');
    expect(SALES_COLUMNS).not.toContain('*');
    expect(SALES_COLUMNS).toContain('qty_base_sold::text');
    // §2.9, ruled 2026-09-14: GROSS is the headline, because it is the cash in the till.
    expect(SALES_COLUMNS).toContain('revenue_gross::text');
    expect(SALES_COLUMNS).not.toContain('revenue_net');
  });

  it('filters the spine down to rows with a sale line, on the store date', () => {
    expect(SALES_ACTIVE_COLUMN).toBe('line_count');
    expect(SALES_DAY_COLUMN).toBe('day');
  });

  it('pages below max_rows, over the view grain, so a short page can only mean the end', () => {
    // supabase/config.toml's max_rows is 1000 and PostgREST truncates silently.
    expect(SALES_PAGE).toBeLessThan(1000);
    expect([SALES_DAY_COLUMN, ...SALES_TIEBREAK]).toEqual(['day', 'variant_id', 'location_id']);
  });

  it('puts the window in the key, so a new month is a new read', () => {
    expect(salesKey('2026-04-01')).not.toEqual(salesKey('2026-05-01'));
  });
});

describe('the calendar — 2026-09-28 is a Monday', () => {
  it('starts a week on Monday, and keeps a Saturday and a Sunday together', () => {
    expect(bucketOf('2026-09-28', 'semana')).toBe('2026-09-28'); // lunes
    expect(bucketOf('2026-09-27', 'semana')).toBe('2026-09-21'); // domingo
    expect(bucketOf('2026-09-26', 'semana')).toBe('2026-09-21'); // sábado
    expect(bucketOf('2026-10-04', 'semana')).toBe('2026-09-28'); // domingo, next month
  });

  it('crosses a year boundary without knowing how long December is', () => {
    expect(bucketOf('2027-01-01', 'semana')).toBe('2026-12-28'); // viernes → lunes 28
    expect(bucketOf('2027-01-01', 'mes')).toBe('2027-01-01');
    expect(bucketOf('2026-12-31', 'dia')).toBe('2026-12-31');
  });

  it('draws the last N periods, oldest first, ending with the one today is in', () => {
    expect(bucketsEnding('2026-09-28', 'dia')).toHaveLength(BARS.dia);
    expect(bucketsEnding('2026-09-28', 'dia').at(-1)).toBe('2026-09-28');
    expect(bucketsEnding('2026-09-28', 'dia')[0]).toBe('2026-09-15');
    expect(bucketsEnding('2026-09-30', 'semana')).toEqual([
      '2026-08-10',
      '2026-08-17',
      '2026-08-24',
      '2026-08-31',
      '2026-09-07',
      '2026-09-14',
      '2026-09-21',
      '2026-09-28',
    ]);
    expect(bucketsEnding('2026-02-14', 'mes')).toEqual([
      '2025-09-01',
      '2025-10-01',
      '2025-11-01',
      '2025-12-01',
      '2026-01-01',
      '2026-02-01',
    ]);
  });

  it('reads exactly as far back as the oldest bar on every switch', () => {
    const since = salesSince('2026-09-28');
    expect(since).toBe('2026-04-01');
    expect(bucketsEnding('2026-09-28', 'mes')).toHaveLength(SALES_MONTHS);
    // The oldest week and the oldest day must be inside the read, or their bars
    // would be empty for want of a read rather than for want of a sale.
    expect(bucketsEnding('2026-09-28', 'semana')[0] >= since).toBe(true);
    expect(bucketsEnding('2026-09-28', 'dia')[0] >= since).toBe(true);
    // And on the worst day for it — the 1st, when the month bar is youngest.
    const first = salesSince('2026-10-01');
    expect(bucketsEnding('2026-10-01', 'semana')[0] >= first).toBe(true);
  });

  it('labels a bar the way a receipt does', () => {
    expect(bucketLabel('2026-09-01', 'mes')).toBe('sep');
    expect(bucketLabel('2026-09-07', 'dia')).toBe('7');
    expect(bucketLabel('2026-09-21', 'semana')).toBe('21 sep');
  });

  it('names the period happening now in words, and any other by its date', () => {
    expect(periodTitle('2026-09-28', 'dia', '2026-09-28')).toBe(ES.numbers.current.dia);
    expect(periodTitle('2026-09-28', 'semana', '2026-09-30')).toBe(ES.numbers.current.semana);
    expect(periodTitle('2026-09-01', 'mes', '2026-09-30')).toBe(ES.numbers.current.mes);
    expect(periodTitle('2026-08-01', 'mes', '2026-09-30')).toBe('agosto');
    expect(periodTitle('2026-09-21', 'semana', '2026-09-30')).toBe('Semana del 21 de septiembre');
    expect(periodTitle('2026-09-07', 'dia', '2026-09-30')).toBe('7 de septiembre');
  });
});

describe('the rows, parsed — and the states that replace them', () => {
  it('withholds everything while the read is out, and never says "no sales"', () => {
    expect(salesFrom(undefined, BASES).state).toBe('unknown');
    expect(salesLine('unknown', null)).toBe('');
    expect(salesLine('unknown', 'offline')).toBe(ES.api.errors.offline);
  });

  it('says there is nothing only when the read came back empty', () => {
    expect(salesFrom([], BASES).state).toBe('nothing');
    expect(salesLine('nothing', null)).toBe(ES.numbers.nothing);
  });

  it('withholds the whole report when one figure does not parse', () => {
    const rows = [row('2026-09-28', 'a', '1000.000', '35.00'), row('2026-09-28', 'b', '2', '1.234')];
    expect(salesFrom(rows, BASES).state).toBe('unreadable');
    expect(salesLine('unreadable', null)).toBe(ES.api.errors.unknown);
  });

  it('counts in integer centavos and scale-3 base units', () => {
    const { state, days } = salesFrom([row('2026-09-28', 'a', '1500.000', '52.50')], BASES);
    expect(state).toBe('sales');
    expect(days[0]?.qty).toBe(1_500_000);
    expect(days[0]?.centavos).toBe(5250);
  });

  it("trusts the unit table over the variant's own base column", () => {
    // `unitColumns` writes base_unit_code = the PRICE unit, so a product priced
    // per 250 g says it is stored in `250g`; the ledger holds grams.
    const { days } = salesFrom([row('2026-09-28', 'a', '500.000', '10.00', { base_unit_code: '250g' })], BASES);
    expect(days[0]?.baseUnit).toBe('g');
  });
});

describe('the bars', () => {
  const { days } = salesFrom(
    [
      row('2026-09-28', 'a', '1000.000', '100.00'),
      row('2026-09-27', 'a', '1000.000', '300.00'),
      row('2026-09-26', 'b', '2.000', '50.00', { base_unit_code: 'pza' }),
      // Outside every day bar and every week bar — inside the month bars.
      row('2026-06-10', 'a', '1000.000', '999.00'),
    ],
    BASES,
  );

  it('adds a week up across products and draws it against the tallest', () => {
    const bars = barsOf(days, 'semana', '2026-09-28');
    expect(bars.at(-1)).toMatchObject({ start: '2026-09-28', centavos: 10000 });
    expect(bars.at(-2)).toMatchObject({ start: '2026-09-21', centavos: 35000, share: 1 });
    expect(bars.at(-1)?.share).toBeCloseTo(10000 / 35000);
  });

  it('draws a period with no sales as an empty bar rather than leaving it out', () => {
    const bars = barsOf(days, 'dia', '2026-09-28');
    expect(bars).toHaveLength(BARS.dia);
    expect(bars[0]).toMatchObject({ centavos: 0, share: 0 });
  });

  it('drops what falls outside the bars without folding it into the oldest one', () => {
    expect(barsOf(days, 'semana', '2026-09-28').reduce((sum, bar) => sum + bar.centavos, 0)).toBe(45000);
    expect(barsOf(days, 'mes', '2026-09-28').reduce((sum, bar) => sum + bar.centavos, 0)).toBe(144900);
  });

  it('draws a period that nets below zero at zero height', () => {
    const voided = salesFrom([row('2026-09-28', 'a', '-1000.000', '-100.00'), row('2026-09-27', 'a', '1000.000', '100.00')], BASES).days;
    const bars = barsOf(voided, 'dia', '2026-09-28');
    expect(bars.at(-1)).toMatchObject({ centavos: -10000, share: 0 });
    expect(bars.at(-2)?.share).toBe(1);
  });
});

describe('the table', () => {
  const entries = [
    entry('jitomate', 'kg', 'g'),
    entry('cebolla', 'kg', 'g'),
    entry('huevo', 'pza', 'pza'),
    entry('cafe', '250g', 'g'),
  ];

  it('says each product in the unit it is sold by, biggest earner first', () => {
    const { days } = salesFrom(
      [
        row('2026-09-28', 'jitomate', '1500.000', '52.50', { variant_name: 'Jitomate' }),
        row('2026-09-27', 'jitomate', '1000.000', '35.00', { variant_name: 'Jitomate' }),
        row('2026-09-28', 'huevo', '12.000', '36.00', { variant_name: 'Huevo', base_unit_code: 'pza', family_id: 'fam-abarrotes', family_name: 'Abarrotes' }),
      ],
      BASES,
    );
    const report = reportOf(days, 'semana', '2026-09-28', 'producto', entries, FACTORS);
    // ⚠️ Sunday the 27th belongs to the week before, so only Monday's jitomate counts.
    expect(report.rows.map((r) => [r.name, r.quantity, r.amount])).toEqual([
      ['Jitomate', '1.500 kg', '$52.50'],
      ['Huevo', '12 pza', '$36'],
    ]);
    expect(report.totalCentavos).toBe(8850);
  });

  it('adds the same product across the days of a week', () => {
    const { days } = salesFrom(
      [
        row('2026-09-21', 'jitomate', '1500.000', '52.50', { variant_name: 'Jitomate' }),
        row('2026-09-27', 'jitomate', '1000.000', '35.00', { variant_name: 'Jitomate' }),
      ],
      BASES,
    );
    const report = reportOf(days, 'semana', '2026-09-21', 'producto', entries, FACTORS);
    expect(report.rows).toHaveLength(1);
    expect(report.rows[0]).toMatchObject({ quantity: '2.500 kg', amount: '$87.50', centavos: 8750 });
  });

  it('sums a family in its shared unit, and refuses to sum across dimensions', () => {
    const { days } = salesFrom(
      [
        row('2026-09-28', 'jitomate', '1500.000', '52.50'),
        row('2026-09-28', 'cebolla', '500.000', '10.00'),
        row('2026-09-28', 'huevo', '12.000', '36.00', { base_unit_code: 'pza', family_id: 'fam-mixta', family_name: 'Mixta' }),
        row('2026-09-28', 'cafe', '500.000', '80.00', { family_id: 'fam-mixta', family_name: 'Mixta' }),
      ],
      BASES,
    );
    const report = reportOf(days, 'dia', '2026-09-28', 'familia', entries, FACTORS);
    const byName = Object.fromEntries(report.rows.map((r) => [r.name, r]));
    expect(byName.Verdura).toMatchObject({ quantity: '2 kg', centavos: 6250 });
    // Twelve pieces and half a kilo of coffee are not one number (C8.5).
    expect(byName.Mixta).toMatchObject({ quantity: ES.documents.noFigure, centavos: 11600 });
  });

  it('falls back to the base unit when a family mixes a kilo and a pack of the same thing', () => {
    const { days } = salesFrom(
      [row('2026-09-28', 'jitomate', '1000.000', '35.00'), row('2026-09-28', 'cafe', '500.000', '80.00')],
      BASES,
    );
    const report = reportOf(days, 'dia', '2026-09-28', 'familia', entries, FACTORS);
    // `gr` is `ES.units.g` — the word a shopkeeper reads, never the code.
    expect(report.rows[0]?.quantity).toBe('1500 gr');
  });

  it("says a product the catalog no longer lists in its base unit rather than dropping it", () => {
    const { days } = salesFrom([row('2026-09-28', 'retirado', '750.000', '20.00', { variant_name: 'Retirado' })], BASES);
    const report = reportOf(days, 'dia', '2026-09-28', 'producto', entries, FACTORS);
    expect(report.rows[0]).toMatchObject({ name: 'Retirado', quantity: '750 gr', amount: '$20' });
  });

  it('drops a product whose period nets to nothing — a sale and its void', () => {
    const { days } = salesFrom(
      [
        row('2026-09-28', 'jitomate', '1000.000', '35.00'),
        row('2026-09-28', 'jitomate', '-1000.000', '-35.00'),
        row('2026-09-28', 'huevo', '6.000', '18.00', { base_unit_code: 'pza' }),
      ],
      BASES,
    );
    const report = reportOf(days, 'dia', '2026-09-28', 'producto', entries, FACTORS);
    expect(report.rows.map((r) => r.key)).toEqual(['huevo']);
    expect(report.totalCentavos).toBe(1800);
  });

  it('is empty for a period with no sales, and the total says so in pesos', () => {
    const { days } = salesFrom([row('2026-09-01', 'jitomate', '1000.000', '35.00')], BASES);
    const report = reportOf(days, 'dia', '2026-09-28', 'producto', entries, FACTORS);
    expect(report.rows).toEqual([]);
    // `formatMXN` drops the centavos of a whole peso — the figure is a zero, never a dash.
    expect(report.total).toBe('$0');
  });
});
