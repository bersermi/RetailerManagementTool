import { describe, expect, it } from 'vitest';

import { formatMXN } from '@/format/mxn';

import { formatMXN as weraFormatMXN } from '../../app/src/format/mxn';

// ============================================================================
// A PRICE READS THE SAME IN BOTH APPS. Plan task `10.4b-iv-a`.
//
// ⚠️ COCINA'S `formatMXN` IS A COPY OF WERA'S (`app/src/format/mxn.ts`), and this
// runs WERA'S FILE beside it over the same amounts — the file, not a second
// spelling of what it should say. Under node, which has full ICU; Hermes reads
// the same shape through `format()`, which is why both files read it that way.
// ============================================================================

const AMOUNTS = [0, 1, 5, 50, 99, 100, 101, 4500, 6500, 6550, 9000, 99999, 123450, 999999999, -1, -6550];

describe('formatMXN', () => {
  it('is C12.2: comma thousands, point decimals, centavos hidden at zero', () => {
    expect(formatMXN(6500)).toBe('$65');
    expect(formatMXN(6550)).toBe('$65.50');
    expect(formatMXN(5)).toBe('$0.05');
    expect(formatMXN(123450)).toBe('$1,234.50');
  });

  it('answers what Wera’s answers, amount for amount', () => {
    for (const centavos of AMOUNTS) expect(formatMXN(centavos), String(centavos)).toBe(weraFormatMXN(centavos));
  });

  it('refuses a peso-valued float, as Wera’s does', () => {
    expect(() => formatMXN(65.5)).toThrow(/integer CENTAVOS/);
    expect(() => weraFormatMXN(65.5)).toThrow(/integer CENTAVOS/);
  });
});
