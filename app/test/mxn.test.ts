// ============================================================================
// C12.2 — THE MONEY FORMATTER. Plan task 5a-ii.
//
// ⚠️ THIS IS THE SUITE §2.11 WAS AMENDED TO ALLOW, AND IT IS THE WHOLE OF WHAT
// THE AMENDMENT ALLOWS. The line the owner drew on 2026-09-07: a unit test is
// in scope where it pins **a value a customer sees or the ledger stores**, and
// out of scope over rendering, navigation and layout. `formatMXN` decides what
// a shopkeeper is told he is owed. Nothing is rendered here, no component is
// mounted, and there is not an assertion about the tab bar in this file.
//
// WHAT WOULD OTHERWISE BE TRUE BY ASSERTION. C12.2 promises comma thousands and
// point decimals; `src/format/mxn.ts` gets both from `Intl` rather than
// hardcoding them, precisely so that this file can measure them. If a Node
// upgrade, a Hermes ICU or a leaked device locale ever renders `1.234,50` in a
// Mexican shop, it fails HERE — which is not true of an implementation that
// concatenates a comma.
// ============================================================================

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

import { formatDecimal, parseDecimal } from '@tienda/money';

import { formatMXN } from '../src/format/mxn';

// Resolved through the workspace, never path-joined — 5a-i's rule, and its
// reasoning is in app/test/wiring.test.ts.
const require_ = createRequire(import.meta.url);
const CASES_JSON = require_.resolve('@tienda/money/cases.json');

interface LineCase {
  id: string;
  expect: { gross: string; net: string; tax: string };
}
const table = JSON.parse(readFileSync(CASES_JSON, 'utf8')) as { lines: LineCase[] };

/** The locale's own symbol, group separator and decimal separator. */
const shape = (() => {
  const parts = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
  }).formatToParts(-1234.5);
  const of = (type: Intl.NumberFormatPartTypes) => parts.find((p) => p.type === type)?.value;
  return {
    currency: of('currency'),
    group: of('group'),
    decimal: of('decimal'),
    minusSign: of('minusSign'),
  };
})();

describe('C12.2 — what a shopkeeper reads', () => {
  it('renders the decision register entry verbatim: $1,234.50', () => {
    expect(formatMXN(123_450)).toBe('$1,234.50');
  });

  it('hides the centavos when they are zero', () => {
    // "Centavos are hidden when zero" — not `$1,234.00`, and not `$1,234.0`.
    expect(formatMXN(123_400)).toBe('$1,234');
    expect(formatMXN(100)).toBe('$1');
    expect(formatMXN(0)).toBe('$0');
  });

  it('shows exactly two centavos when there are any', () => {
    // "When there are decimals at all, exactly two are shown." The five-centavo
    // case is the one that separates the rule from `String(remainder)`, which
    // would render `$0.5` and be wrong by a factor of ten.
    expect(formatMXN(5)).toBe('$0.05');
    expect(formatMXN(50)).toBe('$0.50');
    expect(formatMXN(123_405)).toBe('$1,234.05');
    expect(formatMXN(1)).toBe('$0.01');
  });

  it('groups thousands at every magnitude a shop can reach', () => {
    expect(formatMXN(100_000_000)).toBe('$1,000,000');
    expect(formatMXN(999_999_999_999)).toBe('$9,999,999,999.99');
  });

  it('puts the sign before the symbol, so a reversal is not read as a charge', () => {
    // Voids and reversals (`0021`) are negative money that reaches a screen.
    expect(formatMXN(-1_160)).toBe('-$11.60');
    expect(formatMXN(-5)).toBe('-$0.05');
  });
});

describe('C12.2 — the separators are measured, not assumed', () => {
  it('is running on a runtime whose es-MX is comma-thousands and point-decimals', () => {
    // ⚠️ THE GUARD FIRST, RULE 4 OF THIS REPOSITORY: if `formatToParts` ever
    // returns a shape without these parts, `of()` yields undefined and every
    // comparison below would be `undefined === undefined`-shaped nonsense.
    expect(shape.currency, 'no currency part in es-MX/MXN output').toBeDefined();
    expect(shape.group, 'no group separator in a four-digit es-MX number').toBeDefined();
    expect(shape.decimal, 'no decimal separator in es-MX output').toBeDefined();

    expect(shape.currency).toBe('$');
    expect(shape.group).toBe(',');
    expect(shape.decimal).toBe('.');
    expect(shape.minusSign).toBe('-');
  });
});

describe('C12.2 against the ledger — the screen loses no digits', () => {
  // ⚠️ THE PROPERTY, AND IT IS THE ONE THAT MATTERS MORE THAN ANY SINGLE
  // EXPECTATION ABOVE: strip the decoration a locale adds and what is left must
  // be the number `packages/money` computed, to the centavo. A formatter that
  // dropped a thousands group, rounded to pesos, or truncated a trailing zero
  // would still look plausible in isolation; it cannot survive this.
  //
  // Read from `cases.json` — the ONE data file §2.10 requires — so these are
  // not this suite's idea of what a price is.
  const strip = (rendered: string) =>
    rendered.split(shape.currency!).join('').split(shape.group!).join('');

  it('has cases to check, so nothing below passes vacuously', () => {
    expect(table.lines.length, 'cases.json carries no line cases').toBeGreaterThan(10);
  });

  for (const c of table.lines) {
    it(`${c.id}: gross, net and tax survive the round trip`, () => {
      for (const field of ['gross', 'net', 'tax'] as const) {
        const ledger = c.expect[field]; // e.g. "11.60" — the numeric(12,2) spelling
        const centavos = parseDecimal(ledger, 2);
        const screen = strip(formatMXN(centavos));
        // Centavos hidden at zero is a DISPLAY rule, so put them back before
        // comparing: `$1,234` and `1234.00` are the same money.
        const normalised = screen.includes(shape.decimal!) ? screen : `${screen}.00`;
        expect(normalised, `${c.id}.${field} rendered as ${formatMXN(centavos)}`).toBe(
          formatDecimal(centavos, 2),
        );
      }
    });
  }
});

describe('it refuses a peso, which is the mistake it exists to catch', () => {
  it('throws on a fractional argument rather than rendering a tenth of it', () => {
    // `formatMXN(11.6)` is someone passing pesos. The friendly reading renders
    // `$0.12` — a wrong price, on the screen, silently.
    expect(() => formatMXN(11.6)).toThrow(RangeError);
    expect(() => formatMXN(0.5)).toThrow(RangeError);
  });

  it('throws past the safe-integer range, where a float path would quietly lie', () => {
    // ⚠️ SAID PLAINLY BECAUSE THE MEASUREMENT WAS MADE: below 2^53 the naive
    // `centavos / 100` spelling agrees with the integer path on all 600 000
    // values probed while writing this file, so the integer arithmetic in
    // `mxn.ts` is discipline rather than a fix for a defect anybody can show at
    // shop scale. Above it the two part company, and this is that boundary —
    // the same boundary `assertSafe` guards throughout `packages/money`.
    expect(() => formatMXN(2 ** 53)).toThrow(RangeError);
    expect(() => formatMXN(Number.NaN)).toThrow(RangeError);
    expect(() => formatMXN(Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });
});
