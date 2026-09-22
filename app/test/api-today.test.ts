import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  SALE_COLUMNS,
  TODAY_COLUMN,
  TODAY_KEY,
  dayStartISO,
  takingsFrom,
  type SaleRow,
} from '@/api/today';

// ============================================================================
// WHAT THE SHOP TOOK TODAY. Plan task `5d-iv-a`.
//
// ⚠️ WHAT THIS FILE CAN SAY AND WHAT IT CANNOT. It proves the app agrees with
// itself: the day boundary, the arithmetic, the count, and the difference
// between a shop that sold nothing and a phone that could not ask. It has never
// read `0003` — so the column names, the `::text` casts and the window's
// behaviour over the wire are `docs/checks/5d-iv-a-takings-contract.sh`, and a
// column renamed on either side is a 400 every assertion here passes over.
//
// ⚠️⚠️ THE DAY BOUNDARY IS ASSERTED AGAINST A FIXED `TZ`, WHICH `app/
// vitest.config.ts` DOES NOT SET AND THIS FILE THEREFORE MUST NOT ASSUME. Every
// boundary case below is expressed as a RELATION between two instants the test
// builds locally — midnight today and one millisecond before it — rather than as
// a literal UTC string, so the file holds on the owner's Mac at UTC−6 and on a
// UTC runner alike. A test that hard-coded `2026-09-22T06:00:00.000Z` would pass
// in exactly one timezone and would be green in CI for the wrong reason.
// ============================================================================

const ZERO = '0.00';

function sale(over: Partial<SaleRow> = {}): SaleRow {
  return {
    id: 's1',
    total_net: '100.00',
    total_tax: '16.00',
    reversal_of: null,
    ...over,
  };
}

describe('the contract, written once', () => {
  it('names every column it asks for, and never a star', () => {
    expect(SALE_COLUMNS).not.toContain('*');
    for (const column of ['id', 'total_net', 'total_tax', 'reversal_of']) {
      expect(SALE_COLUMNS).toContain(column);
    }
  });

  // ⚠️ THE CAST IS THE DIFFERENCE BETWEEN A PESO FIGURE AND A DOUBLE. PostgREST
  // sends a bare `numeric` as a JSON number; `parseDecimal` refuses a number
  // argument outright, so a dropped cast is every sale unreadable and the figure
  // withheld — with the typecheck, the bundler and this file all green were it
  // not for this assertion and assertion 3 of the contract check.
  it('asks for both money columns as text', () => {
    expect(SALE_COLUMNS).toContain('total_net::text');
    expect(SALE_COLUMNS).toContain('total_tax::text');
  });

  // ⚠️ C8.8's shape one table over: a column nothing renders is a column the
  // phone must not be sent. `created_by` is who rang the sale up, and no screen
  // in this pilot shows it.
  it('asks for nothing it does not render or count', () => {
    for (const column of ['payload_hash', 'created_by', 'recorded_offline', 'reversal_reason']) {
      expect(SALE_COLUMNS).not.toContain(column);
    }
  });

  it('filters the day on occurred_at, never on recorded_at', () => {
    expect(TODAY_COLUMN).toBe('occurred_at');
  });

  it('caches under its own key', () => {
    expect(TODAY_KEY).toEqual(['today', 'takings']);
  });
});

describe('when today began', () => {
  // ⚠️⚠️ THE ZONE IS PINNED HERE, AND IT IS THE DIFFERENCE BETWEEN A FIXTURE AND
  // A DECORATION. Measured on 2026-09-22: node re-reads `process.env.TZ` for
  // every `Date` it constructs afterwards, and `app/vitest.config.ts` sets no
  // zone — so on the owner's Mac (UTC−6) these cases tell a LOCAL midnight from
  // a UTC one, and on a UTC runner they cannot, because the two are the same
  // instant. A boundary suite that only falsifies on one of the two machines
  // that matter is the shape `5a-split-coverage.sh` recorded about `mapfile`.
  //
  // ⚠️ `America/Mexico_City` RATHER THAN ANY OLD OFFSET: it is what
  // `location.timezone` defaults to in `0012`, so these assertions are stated in
  // the pilot's own trading day rather than in an abstraction of one.
  const HOST_TZ = process.env.TZ;
  beforeAll(() => {
    process.env.TZ = 'America/Mexico_City';
  });
  afterAll(() => {
    if (HOST_TZ === undefined) delete process.env.TZ;
    else process.env.TZ = HOST_TZ;
  });

  // The device's midnight, built the way a person would read it off a clock.
  const at = (y: number, m: number, d: number, h = 0, min = 0, s = 0, ms = 0) =>
    new Date(y, m - 1, d, h, min, s, ms);

  it('runs in the zone these cases are stated in', () => {
    // ⚠️ THE FIXTURE ASSERTS ITS OWN INSTRUMENT FIRST. If the zone did not take,
    // every case below would be comparing UTC against UTC and passing for it.
    expect(at(2026, 9, 22).toISOString()).toBe('2026-09-22T06:00:00.000Z');
  });

  it('is the local midnight of the day the clock is showing', () => {
    expect(dayStartISO(at(2026, 9, 22, 14, 37, 9, 412))).toBe('2026-09-22T06:00:00.000Z');
  });

  it('does not move for any other instant in the same day', () => {
    expect(dayStartISO(at(2026, 9, 22, 0, 0, 0, 0))).toBe('2026-09-22T06:00:00.000Z');
    expect(dayStartISO(at(2026, 9, 22, 23, 59, 59, 999))).toBe('2026-09-22T06:00:00.000Z');
    expect(dayStartISO(at(2026, 9, 22, 12, 0, 0, 0))).toBe('2026-09-22T06:00:00.000Z');
  });

  // ⚠️⚠️ THE CASE A UTC-SHAPED IMPLEMENTATION GETS WRONG, AND THE ONLY ONE THAT
  // MATTERS. At UTC−6 a sale at 22:00 on the 21st is ALREADY the 22nd in UTC, so
  // a boundary taken from `toISOString()` and truncated at the `T` would sweep
  // last night's late trade into this morning's takings — and the shopkeeper
  // reconciling her till would find the difference, not this repository.
  it('does not begin the day at UTC midnight', () => {
    expect(dayStartISO(at(2026, 9, 22, 9, 0))).not.toBe('2026-09-22T00:00:00.000Z');
  });

  it('puts 22:00 the night before OUTSIDE today', () => {
    const lastNight = at(2026, 9, 21, 22, 0);
    expect(lastNight.toISOString() < dayStartISO(at(2026, 9, 22, 9, 0))).toBe(true);
    // …and a UTC boundary would have let it in, which is the whole fixture.
    expect(lastNight.toISOString() > '2026-09-22T00:00:00.000Z').toBe(true);
  });

  it('changes the instant the clock passes midnight, and not before', () => {
    expect(dayStartISO(at(2026, 9, 21, 23, 59, 59, 999))).toBe('2026-09-21T06:00:00.000Z');
    expect(dayStartISO(at(2026, 9, 22, 0, 0, 0, 0))).toBe('2026-09-22T06:00:00.000Z');
  });

  it('is an instant PostgREST can compare, not a date', () => {
    expect(dayStartISO(at(2026, 9, 22, 9, 0))).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    );
  });

  it('crosses a year end without arithmetic of its own', () => {
    expect(dayStartISO(at(2026, 12, 31, 23, 59))).toBe('2026-12-31T06:00:00.000Z');
    expect(dayStartISO(at(2027, 1, 1, 0, 1))).toBe('2027-01-01T06:00:00.000Z');
  });

  // ⚠️ `R3`: it takes `now` rather than reading the clock, which is the only
  // reason every case above can be stated at all.
  it('reads no clock of its own', () => {
    expect(dayStartISO.length).toBe(1);
  });
});

describe('the takings, out of the rows the window narrowed', () => {
  it('adds net and tax, because revenue is GROSS of IVA', () => {
    // Ruled 2026-09-14: gross, on the ground that `prices_include_tax` defaults
    // true, so gross is what reconciles against the cash in the till.
    expect(takingsFrom([sale()]).grossCentavos).toBe(11_600);
  });

  it('adds every document in the window', () => {
    const rows = [
      sale({ id: 'a', total_net: '100.00', total_tax: '16.00' }),
      sale({ id: 'b', total_net: '50.50', total_tax: '8.08' }),
    ];
    expect(takingsFrom(rows).grossCentavos).toBe(11_600 + 5_858);
  });

  it('counts the documents, not the lines or the pesos', () => {
    expect(takingsFrom([sale({ id: 'a' }), sale({ id: 'b' })]).count).toBe(2);
  });

  it('is exact on a figure a double would round', () => {
    // 0.07 + 0.01 is 0.08000000000000002 as a double. Integers do not care.
    expect(takingsFrom([sale({ total_net: '0.07', total_tax: '0.01' })]).grossCentavos).toBe(8);
  });
});

describe('a void is two rows, not a deleted one', () => {
  // `0021` inserts a SECOND sale with negated totals and `reversal_of` set.
  const original = sale({ id: 'sale-1', total_net: '100.00', total_tax: '16.00' });
  const reversal = sale({
    id: 'void-1',
    total_net: '-100.00',
    total_tax: '-16.00',
    reversal_of: 'sale-1',
  });

  it('leaves the figure at zero without knowing anything about voids', () => {
    expect(takingsFrom([original, reversal]).grossCentavos).toBe(0);
  });

  // ⚠️⚠️ THE ONE A `count(*)` GETS WRONG. *2 ventas* on a morning when she rang
  // one up and undid it is the app doing bookkeeping at a shopkeeper.
  it('counts neither the sale that was undone nor the undoing', () => {
    expect(takingsFrom([original, reversal]).count).toBe(0);
  });

  it('still counts the sales that stand beside it', () => {
    const other = sale({ id: 'sale-2', total_net: '10.00', total_tax: '1.60' });
    const takings = takingsFrom([original, reversal, other]);
    expect(takings.count).toBe(1);
    expect(takings.grossCentavos).toBe(1_160);
  });

  // ⚠️ A VOID THE NEXT MORNING LEAVES TODAY WHOLE, and that is not an
  // approximation — it is what `product_margin_daily` does on the server, which
  // buckets every row by its own `occurred_at`. The two agreeing is worth more
  // than either being clever.
  it('leaves a document whole when its reversal is outside this window', () => {
    const takings = takingsFrom([original]);
    expect(takings.count).toBe(1);
    expect(takings.grossCentavos).toBe(11_600);
  });

  it('takes the money off the day the void landed on', () => {
    const takings = takingsFrom([reversal]);
    expect(takings.grossCentavos).toBe(-11_600);
    expect(takings.count).toBe(0);
  });

  it('does not count a reversal as a sale even with nothing to reverse in view', () => {
    expect(takingsFrom([reversal]).count).toBe(0);
  });
});

describe('a shop that sold nothing, and a phone that could not ask', () => {
  // ⚠️⚠️ THE DISTINCTION PRODUCTOS DID NOT HAVE, and the reason it is here: a
  // confident $0.00 at the top of Inicio is a number a shopkeeper would act on.
  it('reports a real zero for a shop that has genuinely sold nothing', () => {
    expect(takingsFrom([])).toEqual({ grossCentavos: 0, count: 0, complete: true });
  });

  it('withholds the figure when there is no answer yet', () => {
    expect(takingsFrom(undefined)).toEqual({ grossCentavos: null, count: 0, complete: false });
  });

  it('withholds the figure when the read came back null', () => {
    expect(takingsFrom(null).grossCentavos).toBeNull();
    expect(takingsFrom(null).complete).toBe(false);
  });

  it('tells the two apart, which is the whole of this block', () => {
    expect(takingsFrom([]).complete).not.toBe(takingsFrom(undefined).complete);
  });
});

describe('a row this app cannot be exact about', () => {
  // ⚠️ THE RULE `5c-iv-b` ESTABLISHED: a sum that quietly drops a line it could
  // not read is a SMALLER NUMBER INDISTINGUISHABLE FROM A CORRECT ONE, and this
  // one is compared against the cash in the till.
  it('withholds the figure rather than shrinking it', () => {
    const rows = [sale({ id: 'a' }), sale({ id: 'b', total_net: 'cien' })];
    expect(takingsFrom(rows).grossCentavos).toBeNull();
    expect(takingsFrom(rows).complete).toBe(false);
  });

  it('keeps the count, which is never lossy', () => {
    const rows = [sale({ id: 'a' }), sale({ id: 'b', total_net: 'cien' })];
    expect(takingsFrom(rows).count).toBe(2);
  });

  // ⚠️⚠️ A DROPPED `::text` CAST IS THIS CASE, ARRIVING FOR EVERY ROW AT ONCE.
  // PostgREST would send `100` as a JSON number and `parseDecimal` refuses a
  // number argument — so the figure is withheld rather than wrong, which is the
  // behaviour that makes assertion 3 of the contract check the only instrument
  // that can see the cast is gone.
  it('withholds the figure when a number arrives where a decimal string should', () => {
    const rows = [sale({ total_net: 100 as unknown as string })];
    expect(takingsFrom(rows).complete).toBe(false);
  });

  it('withholds the figure on more decimals than the column holds', () => {
    expect(takingsFrom([sale({ total_tax: '16.005' })]).complete).toBe(false);
  });

  it('accepts a whole-peso figure with no decimal point at all', () => {
    expect(takingsFrom([sale({ total_net: '100', total_tax: ZERO })]).grossCentavos).toBe(10_000);
  });
});
