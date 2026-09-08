// ============================================================================
// THE WORKSPACE-BOUNDARY SUITE — plan task 5a-i.
//
// ⚠️ THIS IS THE FIRST TEST IN THIS REPOSITORY THAT RUNS OVER `app/**`, AND IT
// EXISTS BECAUSE OF WHAT `app.yml`'s GREEN WOULD OTHERWISE MEAN. Until 5a-i,
// `db.yml` watched `supabase/**` and `money.yml` watched `packages/**`; nothing
// watched the client. A typecheck-only workflow would close that gap with a
// check that cannot fail on an app that charges the wrong amount — it asks
// whether the code compiles, not whether it is right. ADR-035 §2.10/§2.11 were
// amended on 2026-09-07 to permit exactly this and no more: a unit test that
// pins a value a customer sees or the ledger stores, never one over rendering,
// navigation or layout. There is not an assertion about a component here and
// there should not be.
//
// WHAT IT ASSERTS. That `@tienda/money` resolves from inside `app/` and that
// the value crossing that boundary is the one `cases.json` pins. The fourth
// workspace entry in the root manifest is a CLAIM; this is the measurement.
// ============================================================================

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

import { SCALE, formatDecimal, priceSellLine } from '@tienda/money';

import { placeholderTotal } from '../src/wiring';

// ⚠️ RESOLVED, NOT PATH-JOINED. `../../packages/money/cases.json` would pass
// while proving nothing about the workspace: it reads the file through the
// filesystem, which works whether or not npm ever linked the package. Going
// through require.resolve means a missing or misnamed workspace entry fails
// HERE, loudly, instead of leaving a green that measured a relative path.
const require_ = createRequire(import.meta.url);
const CASES_JSON = require_.resolve('@tienda/money/cases.json');

interface LineCase {
  id: string;
  kind: string;
  label: string;
  unit_price: string;
  qty: string;
  rate: string;
  expect: { gross: string; net: string; tax: string };
}

const table = JSON.parse(readFileSync(CASES_JSON, 'utf8')) as { lines: LineCase[] };
const M1 = table.lines.find((line) => line.id === 'M1');

// A scaled decimal string ("11.600000") to the integer the money path takes.
const scaled = (text: string, scale: number) =>
  Math.round(Number.parseFloat(text) * 10 ** scale);

describe('the workspace boundary — @tienda/money resolves from app/', () => {
  it('finds case M1 in the shared table, so the assertions below are not vacuous', () => {
    // ⚠️ THE GUARD, AND IT IS RULE 4 OF THIS REPOSITORY. `find` returns
    // undefined for an id that is not there, and every expectation below would
    // then be asserted against `undefined?.expect` — which is how a suite goes
    // green having checked nothing. Falsified: renaming M1 in a copy of
    // cases.json turns this red before it turns anything else red.
    expect(M1, 'case M1 is missing from packages/money/cases.json').toBeDefined();
    expect(M1?.kind).toBe('sell');
  });

  it('prices M1 to the centavo the case table pins, across the workspace edge', () => {
    const c = M1!;
    const line = priceSellLine(
      scaled(c.unit_price, SCALE.unitPrice),
      scaled(c.qty, SCALE.quantity),
      scaled(c.rate, SCALE.rate),
    );

    expect(formatDecimal(line.gross, SCALE.money)).toBe(c.expect.gross);
    expect(formatDecimal(line.net, SCALE.money)).toBe(c.expect.net);
    expect(formatDecimal(line.tax, SCALE.money)).toBe(c.expect.tax);

    // net + tax === gross, exactly. The invariant the package exists for.
    expect(line.net + line.tax).toBe(line.gross);
  });

  it('renders the same number through the app module the route imports', () => {
    // ⚠️ The point of asserting this against the CASE TABLE rather than against
    // "11.60" is that a hardcoded expectation here would be a second copy of
    // the expectations, which is the exact thing §2.10 forbids.
    expect(placeholderTotal()).toBe(M1!.expect.gross);
  });
});
