import { describe, expect, it } from 'vitest';

import {
  BUDGETS,
  KINDS,
  LONGEST_SANE_MS,
  SCREENS,
  committed,
  left,
  msOf,
  openVisit,
  percentile,
  pilotBuildOf,
  summaryOf,
  tapped,
  tenthsText,
  type Row,
  type Visit,
} from '@/pilot/readings';

// ============================================================================
// @/pilot/readings — plan task `5P-a`, ADR-035 §5.
//
// ⚠️ THE KINDS AND SCREENS ARE `0043`'s CHECK CONSTRAINTS, READ HERE AS TEXT.
// A kind the phone sends and the table refuses is a batch that `droppable`
// throws away — every reading in it lost, with nothing red anywhere. So the
// lists are compared to the migration itself, not to a copy of it.
// ============================================================================

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const MIGRATION = readFileSync(
  resolve(__dirname, '../../supabase/migrations/0043_pilot_reading.sql'),
  'utf8',
);

function checkList(constraint: string): string[] {
  const at = MIGRATION.indexOf(`constraint ${constraint}`);
  expect(at).toBeGreaterThan(-1);
  const body = MIGRATION.slice(at, MIGRATION.indexOf(')', MIGRATION.indexOf('in (', at)) + 1);
  return [...body.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
}

describe('the vocabulary is 0043’s own', () => {
  it('sends exactly the kinds pilot_reading_kind_known accepts, in its order', () => {
    expect([...KINDS]).toEqual(checkList('pilot_reading_kind_known'));
  });

  it('measures exactly the screens pilot_reading_screen_known accepts', () => {
    expect([...SCREENS]).toEqual(checkList('pilot_reading_screen_known'));
  });

  it('never sends a value past 0043’s own ceiling of a day', () => {
    expect(LONGEST_SANE_MS).toBeLessThanOrEqual(86_400_000);
    expect(MIGRATION).toMatch(/value >= 0 and value <= 86400000/);
  });
});

describe('§5’s budgets, written once', () => {
  it('are the four numbers the ADR writes down', () => {
    expect(BUDGETS.commit_ms).toEqual({ at: 95, ceiling: 300 });
    expect(BUDGETS.round_trip_ms).toEqual({ at: 95, ceiling: 1000 });
    expect(BUDGETS.open_ms).toEqual({ at: 95, ceiling: 2000 });
    // ⚠️ A MEDIAN, not a p95 — §5's rule 2 says *median taps per sale above 5*.
    expect(BUDGETS.taps).toEqual({ at: 50, ceiling: 5 });
  });

  it('agree with ADR-035 §5 as it is written', () => {
    const adr = readFileSync(
      resolve(__dirname, '../../docs/adr/ADR-035-target-architecture-postgres-react-native.md'),
      'utf8',
    );
    expect(adr).toMatch(/p95 commit gesture → on-screen confirmation \| \*\*300 ms\*\*/);
    expect(adr).toMatch(/p95 `record_sale` round trip on wifi \| \*\*1 s\*\*/);
    expect(adr).toMatch(/p95 cold open → \*\*Vender\*\* interactive \| \*\*2 s\*\*/);
    expect(adr).toMatch(/Median taps per sale above 5/);
  });
});

describe('the flag', () => {
  it('is off when unset, empty or blank — a person switching it off', () => {
    expect(pilotBuildOf(undefined)).toBeNull();
    expect(pilotBuildOf('')).toBeNull();
    expect(pilotBuildOf('   ')).toBeNull();
  });

  it('is on, and names the build, when set', () => {
    expect(pilotBuildOf('a1b2c3d')).toBe('a1b2c3d');
    expect(pilotBuildOf(' piloto-1 ')).toBe('piloto-1');
  });
});

describe('msOf — a span, or nothing', () => {
  it('rounds once to the millisecond', () => {
    expect(msOf(100, 342.4)).toBe(242);
    expect(msOf(100, 342.5)).toBe(243);
    expect(msOf(5, 5)).toBe(0);
  });

  it('drops a span that ran backwards rather than clamping it to zero', () => {
    expect(msOf(500, 499)).toBeNull();
  });

  it('drops a span past a minute — a clock that jumped, not a reading', () => {
    expect(msOf(0, LONGEST_SANE_MS)).toBe(LONGEST_SANE_MS);
    expect(msOf(0, LONGEST_SANE_MS + 1)).toBeNull();
  });

  it('drops NaN and infinity', () => {
    expect(msOf(0, Number.NaN)).toBeNull();
    expect(msOf(0, Number.POSITIVE_INFINITY)).toBeNull();
  });
});

function tap(visit: Visit, times: number): Visit {
  let next = visit;
  for (let i = 0; i < times; i += 1) next = tapped(next);
  return next;
}

describe('a visit — taps per transaction', () => {
  it('files the taps of one sale, the slide among them, and starts counting again', () => {
    // A product, a quantity, the slide: three fingers on the glass.
    const visit = tap(openVisit('vender'), 3);
    const { visit: after, emit } = committed(visit);
    expect(emit).toEqual({ kind: 'taps', value: 3 });
    expect(after).toEqual({ screen: 'vender', taps: 0, commits: 1 });
  });

  it('counts each sale of a queue separately', () => {
    let visit = openVisit('vender');
    const filed: number[] = [];
    for (const taps of [2, 4, 5]) {
      const step = committed(tap(visit, taps));
      filed.push(step.emit?.value ?? -1);
      visit = step.visit;
    }
    expect(filed).toEqual([2, 4, 5]);
    expect(visit.commits).toBe(3);
  });
});

describe('a visit — abandonment', () => {
  it('opened and left without a touch: abandoned, value 0 — passing through', () => {
    expect(left(openVisit('comprar'))).toEqual({ kind: 'abandoned', value: 0 });
  });

  it('started and left with no commit: abandoned, with the taps it took', () => {
    expect(left(tap(openVisit('comprar'), 4))).toEqual({ kind: 'abandoned', value: 4 });
  });

  it('committed and then left untouched: NOT abandoned — a finished visit says nothing', () => {
    const { visit } = committed(tap(openVisit('vender'), 3));
    expect(left(visit)).toBeNull();
  });

  it('committed, began a second, and left: abandoned with the second one’s taps', () => {
    const { visit } = committed(tap(openVisit('desperdicio'), 3));
    expect(left(tap(visit, 2))).toEqual({ kind: 'abandoned', value: 2 });
  });
});

describe('percentile — nearest rank, never interpolated', () => {
  it('is null for an empty sample', () => {
    expect(percentile([], 95)).toBeNull();
  });

  it('answers a reading somebody actually took', () => {
    const twenty = Array.from({ length: 20 }, (_, i) => (i + 1) * 10); // 10..200
    expect(percentile(twenty, 95)).toBe(190); // rank ceil(19) = 19th
    expect(percentile(twenty, 50)).toBe(100);
    expect(percentile([7], 95)).toBe(7);
  });

  it('does not care what order the readings arrived in', () => {
    expect(percentile([300, 10, 250, 40], 50)).toBe(40);
    expect(percentile([300, 10, 250, 40], 95)).toBe(300);
  });

  it('does not reorder the caller’s array', () => {
    const values = [3, 1, 2];
    percentile(values, 50);
    expect(values).toEqual([3, 1, 2]);
  });
});

function rows(kind: string, screen: string, values: number[]): Row[] {
  return values.map((value) => ({ kind, screen, value }));
}

describe('summaryOf — one screen against §5', () => {
  it('draws a measure with no readings as none, never within', () => {
    const summary = summaryOf([], 'vender');
    for (const measure of summary.measures) {
      expect(measure.verdict).toBe('none');
      expect(measure.value).toBeNull();
      expect(measure.n).toBe(0);
    }
    expect(summary.abandonment.rateTenths).toBeNull();
  });

  it('puts a p95 at the ceiling inside it and one past it outside', () => {
    const at = summaryOf(rows('commit_ms', 'vender', [300]), 'vender');
    expect(at.measures.find((m) => m.kind === 'commit_ms')?.verdict).toBe('within');
    const past = summaryOf(rows('commit_ms', 'vender', [301]), 'vender');
    expect(past.measures.find((m) => m.kind === 'commit_ms')?.verdict).toBe('over');
  });

  it('judges taps by the MEDIAN — one slow sale in five does not fail it', () => {
    const summary = summaryOf(rows('taps', 'vender', [2, 3, 3, 4, 12]), 'vender');
    const taps = summary.measures.find((m) => m.kind === 'taps');
    expect(taps?.value).toBe(3);
    expect(taps?.verdict).toBe('within');
  });

  it('reads only its own screen', () => {
    const summary = summaryOf(
      [...rows('commit_ms', 'comprar', [900]), ...rows('commit_ms', 'vender', [100])],
      'vender',
    );
    expect(summary.measures.find((m) => m.kind === 'commit_ms')).toMatchObject({ n: 1, value: 100 });
  });

  it('counts abandonment out of every start — gave up over gave up plus committed', () => {
    const summary = summaryOf(
      [
        ...rows('taps', 'vender', [3, 3, 3, 3, 3, 3, 3]), // seven sales
        ...rows('abandoned', 'vender', [2, 5, 1]), // three started and left
        ...rows('abandoned', 'vender', [0, 0]), // two passed through
      ],
      'vender',
    );
    expect(summary.abandonment).toEqual({
      gaveUp: 3,
      passedThrough: 2,
      committed: 7,
      rateTenths: 300, // 3 of 10 = 30.0 %
    });
  });

  it('rounds the rate once, to a tenth of a percent', () => {
    const summary = summaryOf(
      [...rows('taps', 'vender', [1, 1]), ...rows('abandoned', 'vender', [1])],
      'vender',
    );
    expect(summary.abandonment.rateTenths).toBe(333); // 1 of 3
  });
});

describe('tenthsText', () => {
  it('writes a tenth only when there is one', () => {
    expect(tenthsText(300)).toBe('30');
    expect(tenthsText(333)).toBe('33.3');
    expect(tenthsText(5)).toBe('0.5');
    expect(tenthsText(0)).toBe('0');
    expect(tenthsText(1000)).toBe('100');
  });
});
