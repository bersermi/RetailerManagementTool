// ============================================================================
// packages/money — the TypeScript half of the money path (ADR-035 §2.5, §2.6)
//
// This module decides what a customer is told they owe, on the device, without
// waiting for the network (§2.6). The database remains the only thing that
// decides what is STORED — this is the other half of the only duplicated logic
// in the system, and `cases.json` is what makes the two agreeing a test failure
// rather than a hope (§2.10).
//
// ⚠️ JAVASCRIPT HAS NEITHER OF THE TWO THINGS §2.5 RULE 6 NEEDS, so this file
// uses neither of the language's obvious tools:
//
//   * `Math.round` is half-up toward POSITIVE INFINITY. Rule 6 is half-up AWAY
//     FROM ZERO. `Math.round(-36.5)` is -36; the rule says -37. They agree on
//     every positive number, which is why only a negative tie can catch it —
//     cases M8 and B6, and nothing else in the table (07 falsification S23).
//
//   * IEEE754 loses ties. `0.00026 * 250 * 100` is 6.499999999999999, so a
//     line of 250 g at $0.26 the kilo rounds DOWN to 6 centavos in doubles and
//     UP to 7 in exact arithmetic. 436 such lines exist in a sweep of 1.6M
//     shop-sized combinations (plan task 3.6a).
//
//     ⚠️ AND NOT ONE OF THEM IS IN `cases.json`. The four boundaries there —
//     0.365, 6.465 and their reversals — are ties a double happens to hold
//     EXACTLY, so the case table cannot fail for a float. Rule 1 is defended
//     by `07` F5 over the schema, by the integers below, and by the direct
//     measurement in this package's suite — never by the case table. Said out
//     loud because a green over cases.json would otherwise read as a rule 1
//     result, and it is not one.
//
//     The seed's SQL found the matching trap from the other side:
//     `round(2.5::float8)` is 2 because float rounding is BANKER'S, while
//     `round(2.5::numeric)` is 3. Same expression, one cast, one centavo.
//
// SO THERE ARE NO FRACTIONS IN HERE AT ALL. Every value is an integer in its
// column's own scale, and every rounding is one integer division with an
// explicit half-up-away-from-zero rule:
//
//   money       centavos          numeric(12,2)   scale 2      $11.60 -> 1160
//   unit price  micro-pesos/base  numeric(14,6)   scale 6   $0.073000 -> 73000
//   quantity    thousandths       numeric(14,3)   scale 3    250.000 g -> 250000
//   tax rate    basis points      numeric(5,4)    scale 4     0.1600   -> 1600
//
// Nothing here is exported as a `number` of pesos, on purpose: a peso-valued
// float is the bug this module exists to prevent, and the only way to be sure
// one never appears is never to make one.
// ============================================================================

/** Decimal places carried by each kind of value, matching the applied schema. */
export const SCALE = {
  money: 2,
  unitPrice: 6,
  quantity: 3,
  rate: 4,
} as const;

/**
 * `unit_price × qty` lands at scale 6 + 3 = 9, and money is scale 2, so the
 * anchor division is by 10^7. Named because it is the one magic number here.
 */
const ANCHOR_DIVISOR = 10_000_000; // 10^(6+3-2)

/** A rate as an integer: 1 in this unit is 0.0001, so 16% is 1600. */
const RATE_ONE = 10_000; // 10^SCALE.rate

export type Kind = 'sell' | 'buy';

/** A priced line, in centavos. `net + tax === gross`, always and exactly. */
export interface PricedLine {
  gross: number;
  net: number;
  tax: number;
}

// ---------------------------------------------------------------------------
// Integers, and the one rounding rule
// ---------------------------------------------------------------------------

function assertSafe(n: number, what: string): number {
  if (!Number.isSafeInteger(n)) {
    throw new RangeError(
      `${what} is not a safe integer (${n}). The money path is exact integer ` +
        `arithmetic; a value past 2^53 would round silently, which is the ` +
        `failure ADR-035 §2.5 rule 1 exists to make impossible.`,
    );
  }
  return n;
}

/**
 * ADR-035 §2.5 rule 6 — HALF-UP, AWAY FROM ZERO — as one integer division.
 *
 * The sign is taken off first and the rule applied to the magnitude, which is
 * what "away from zero" means and what `Math.round` does not do. The remainder
 * is recomputed from `q * d` rather than trusted from the float division, so a
 * double that landed a hair under an exact quotient cannot move the answer.
 */
export function divRoundHalfUpAwayFromZero(n: number, d: number): number {
  assertSafe(n, 'dividend');
  assertSafe(d, 'divisor');
  if (d <= 0) throw new RangeError(`divisor must be positive, got ${d}`);

  const negative = n < 0;
  const a = negative ? -n : n;

  let q = Math.floor(a / d);
  let r = a - q * d;
  // Correct any drift the double division introduced at the boundary.
  while (r < 0) {
    q -= 1;
    r += d;
  }
  while (r >= d) {
    q += 1;
    r -= d;
  }
  // Half-up on the MAGNITUDE. `d - r <= r` rather than `2 * r >= d` so the
  // comparison itself cannot leave the safe-integer range.
  if (d - r <= r) q += 1;

  assertSafe(q, 'quotient');
  return negative ? -q : q;
}

const DECIMAL = /^-?\d+(\.\d+)?$/;

/**
 * Read a decimal STRING into an integer at `scale`. Exact, and it refuses
 * anything it cannot be exact about.
 *
 * ⚠️ It refuses a `number` argument outright. Every numeric field of
 * `cases.json` is a string for this reason: JSON numbers are doubles, so a
 * bare `0.073` in that file would have put a float in the money path before a
 * line of this module ran.
 */
export function parseDecimal(text: string, scale: number): number {
  if (typeof text !== 'string') {
    throw new TypeError(
      `expected a decimal string, got ${typeof text}. Numbers in the money ` +
        `path are text until they are integers — a JSON number is a double.`,
    );
  }
  if (!DECIMAL.test(text)) {
    throw new RangeError(`"${text}" is not a plain decimal (no exponents, no NaN, no spaces)`);
  }
  const negative = text.startsWith('-');
  const body = negative ? text.slice(1) : text;
  const dot = body.indexOf('.');
  const whole = dot === -1 ? body : body.slice(0, dot);
  const frac = dot === -1 ? '' : body.slice(dot + 1);
  if (frac.length > scale) {
    throw new RangeError(
      `"${text}" carries ${frac.length} decimals but this column holds ${scale}. ` +
        `Truncating here would be a rounding nobody asked for.`,
    );
  }
  const n = assertSafe(Number(whole + frac.padEnd(scale, '0')), `"${text}" at scale ${scale}`);
  return negative ? -n : n;
}

/** Render an integer at `scale` back to a decimal string. Display and diagnostics only. */
export function formatDecimal(value: number, scale: number): string {
  assertSafe(value, 'value');
  const negative = value < 0;
  const digits = String(negative ? -value : value).padStart(scale + 1, '0');
  const whole = digits.slice(0, digits.length - scale);
  const frac = scale === 0 ? '' : '.' + digits.slice(digits.length - scale);
  return (negative ? '-' : '') + whole + frac;
}

// ---------------------------------------------------------------------------
// The rule (ADR-035 §2.5 rules 2–4, as amended 2026-08-26)
// ---------------------------------------------------------------------------

/**
 * Rule 3's anchor: `round(unit_price × qty)`, in centavos.
 *
 * ⚠️ THIS IS THE ONLY PLACE IN THE WHOLE RULE WHERE A HALF-CENTAVO TIE CAN
 * OCCUR. Neither tax step can produce one at the two rates this schema
 * carries — `50G = 29(2m+1)` and `8N = 25(2m+1)` have no integer solutions,
 * proved by exhaustion in 07 F9 and F18 — so every boundary case in
 * `cases.json` sits here, and a case placed in the tax split would look
 * correct and discriminate nothing.
 */
export function lineAnchorCentavos(unitPrice: number, qty: number): number {
  assertSafe(unitPrice, 'unit price');
  assertSafe(qty, 'quantity');
  return divRoundHalfUpAwayFromZero(unitPrice * qty, ANCHOR_DIVISOR);
}

/**
 * A SALE line. The gross is authoritative — it is the shelf price, and the
 * shelf price is what the customer agreed to — so the net is reached by
 * DIVISION and the tax is what is left over.
 *
 * This is the side where rule 4 has teeth: the residual and `round(net × rate)`
 * genuinely differ here, on 118 of the seed's 2 263 sale lines.
 */
export function priceSellLine(unitGross: number, qty: number, rate: number): PricedLine {
  const gross = lineAnchorCentavos(unitGross, qty);
  const net = netFromGross(gross, rate);
  return { gross, net, tax: gross - net };
}

/** The tax DIVISION: net from an authoritative gross. Rule 3, sale row. */
export function netFromGross(gross: number, rate: number): number {
  assertSafe(gross, 'gross');
  return divRoundHalfUpAwayFromZero(gross * RATE_ONE, RATE_ONE + assertSafe(rate, 'rate'));
}

/** The tax MULTIPLICATION: gross from an authoritative net. Rule 3, purchase row. */
export function grossFromNet(net: number, rate: number): number {
  assertSafe(net, 'net');
  return divRoundHalfUpAwayFromZero(net * (RATE_ONE + assertSafe(rate, 'rate')), RATE_ONE);
}

/**
 * A PURCHASE line. The NET is authoritative, because a supplier invoice breaks
 * the tax out and the net is the figure printed on it (settled by the owner
 * 2026-08-26; ADR-035 §2.5 rule 2). The gross is reached by MULTIPLICATION and
 * the tax is still the residual — same sentence as the sell side, which is
 * what keeps rule 4 universal.
 */
export function priceBuyLine(unitNet: number, qty: number, rate: number): PricedLine {
  const net = lineAnchorCentavos(unitNet, qty);
  const gross = grossFromNet(net, rate);
  return { gross, net, tax: gross - net };
}

/** Rule 2: direction follows the document. */
export function priceLine(kind: Kind, unitPrice: number, qty: number, rate: number): PricedLine {
  return kind === 'sell'
    ? priceSellLine(unitPrice, qty, rate)
    : priceBuyLine(unitPrice, qty, rate);
}

/**
 * Rule 5: the document total is the SUM OF THE ROUNDED LINES, never a rounding
 * of its own. Splitting at the document instead makes the displayed lines fail
 * to sum to the displayed total on the §2.8 review screen — which is the one
 * screen where a customer is checking the arithmetic by hand.
 */
export function documentNetPerLine(lines: readonly PricedLine[]): number {
  return lines.reduce((total, line) => assertSafe(total + line.net, 'document net'), 0);
}

/**
 * The FORBIDDEN spelling, kept beside the right one so the difference between
 * them is a measurement rather than a paragraph. Nothing in the app may call
 * this; `cases.json`'s D-block is what it exists for, and D3 is the control
 * where the two agree — without it, "per-line and per-document disagree" would
 * also be satisfied by a rule that always disagrees.
 */
export function documentNetAtDocument(grossTotal: number, rate: number): number {
  return netFromGross(grossTotal, rate);
}

// ---------------------------------------------------------------------------
// Packs (ADR-035 §2.5, the `×24` chip)
// ---------------------------------------------------------------------------

/**
 * A case of 24 at $12.00 is $0.50 the can. The result is a per-base unit price
 * at scale 6 — and it is a DISPLAY figure: `line_net` is the authority, because
 * rule 3 says per line. A pack of 3 at $10.00 does not multiply back and is not
 * supposed to.
 */
export function packUnitPrice(caseNet: number, packSize: number): number {
  assertSafe(caseNet, 'case net');
  assertSafe(packSize, 'pack size');
  if (packSize <= 0) throw new RangeError(`pack size must be positive, got ${packSize}`);
  // caseNet is scale 2, packSize scale 3, result scale 6:
  //   (caseNet/10^2) / (packSize/10^3) × 10^6  =  caseNet × 10^7 / packSize
  return divRoundHalfUpAwayFromZero(caseNet * ANCHOR_DIVISOR, packSize);
}

/** Whether the rounded per-unit price multiplies back to the case net exactly. */
export function packRoundTrips(caseNet: number, packSize: number): boolean {
  const perUnit = packUnitPrice(caseNet, packSize);
  return perUnit * packSize === caseNet * ANCHOR_DIVISOR;
}
