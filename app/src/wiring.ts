// ============================================================================
// THE SEAM, AND IT IS THE WHOLE OF 5a-i's APP CODE.
//
// `5a-i` delivers a workspace and the workflow that watches it. Neither of
// those is provable by a file existing: a fourth entry in the root manifest is
// a claim that `@tienda/money` RESOLVES from inside `app/`, and the only way to
// know is to import it and check the number that comes back.
//
// ⚠️ WHY THE NUMBER IS NOT TYPED IN. ADR-035 §2.10 requires `cases.json` to be
// ONE data file with two readers — the pgTAP suite and Vitest — rather than two
// copies of the same expectations. `app/test/wiring.test.ts` reads those same
// bytes and asserts this function against case `M1`. So the app does not carry
// its own idea of what $11.60 inclusive of 16 % IVA decomposes to; it carries a
// dependency on the file that decides, and a red test if that ever stops being
// true.
//
// ⚠️ AND WHY THE ARITHMETIC IS NOT DONE HERE. §2.11: money on screen is
// `Intl.NumberFormat('es-MX')` for RENDERING ONLY, and every value that will be
// compared against Postgres is integer centavos computed in `packages/money`.
// This module calls into that package. It does not reimplement a centavo of it,
// and `packages/money` is owned by the schema owner precisely so that it cannot.
// ============================================================================

import { SCALE, formatDecimal, priceSellLine } from '@tienda/money';

/**
 * Case `M1` of `packages/money/cases.json` — *"§2.10 — 16% inclusive, one item
 * at $11.60"* — priced through the shared money path and formatted for display.
 *
 * ⚠️ NOT A PRODUCT OF THIS APP AND NOT A FIXTURE FOR ONE. It exists so the
 * placeholder route renders a value that came across the workspace boundary
 * rather than a string literal. `5a-ii` replaces both this and the route, and
 * the real formatter it writes — `$1,234.50`, centavos hidden at zero (C12.2) —
 * is a different function with a different rule.
 */
export function placeholderTotal(): string {
  // unit_price scale 6, qty scale 3, rate scale 4 — see SCALE in @tienda/money.
  const line = priceSellLine(11_600_000, 1_000, 1_600);
  return formatDecimal(line.gross, SCALE.money);
}
