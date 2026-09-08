// ============================================================================
// C12.2 — WHAT A NUMBER LOOKS LIKE WHEN A SHOPKEEPER READS IT. Plan task 5a-ii.
//
//   "$1,234.50 — comma thousands, point decimals. Centavos are hidden when
//    zero; when there are decimals at all, exactly two are shown."
//
// ⚠️ THIS FILE RENDERS. IT DOES NOT CALCULATE, AND THE DISTINCTION IS ADR-035
// §2.11's: money on screen is `Intl.NumberFormat('es-MX')` for RENDERING ONLY,
// and every value that will be compared against Postgres is integer centavos
// computed in `packages/money`. So the argument here is centavos — an integer,
// the same integer the ledger stores — and the return is a string that nothing
// ever parses back.
//
// ⚠️⚠️ AND IT NEVER MAKES A PESO-VALUED FLOAT, which is the one bug this whole
// money path exists to prevent. The obvious spelling —
// `format(centavos / 100)` — divides an exact integer into a double and hands
// the result to ICU, and `packages/money`'s header is forty lines on why that
// is not a thing this project does. Instead:
//
//   * the peso count and the centavo remainder are separated by INTEGER
//     arithmetic (`Math.floor(abs / 100)` and the remainder recomputed from
//     it), so no fraction is ever constructed;
//   * `Intl` formats the PESO COUNT — an integer — for its grouping;
//   * the currency symbol, the decimal separator, the minus sign and their
//     positions are read out of `formatToParts` of a probe, so the locale
//     still decides the shape and this file hardcodes none of it.
//
// ⚠️ WHY NOT HARDCODE `"$" + n + "." + cc`, given C12.2 fixes the separators.
// Because then C12.2 would be true by assertion and nothing could ever notice
// it stopped being true. Reading the shape from ICU means the two facts C12.2
// promises — comma thousands, point decimals — are properties of a system that
// could change (a Node upgrade, a Hermes ICU, a device locale leaking in), and
// `app/test/mxn.test.ts` pins them. That is the difference between a rule and
// a hope, and this repository has a file's worth of opinions about it.
//
// ⚠️ NOT IN `packages/money`, deliberately — see the decision note in
// docs/PLAN.md under 5a-ii. That package is locale-free and exports no
// peso-valued anything on purpose; this is §2.11's "money on screen" row, and
// it is client architecture.
// ============================================================================

/**
 * The es-MX shape, read once. Two formatters rather than one because they do
 * two different jobs: `SHAPE` is asked only where the symbol, the separator
 * and the sign GO, and `PESOS` does the actual grouping of an integer.
 */
const SHAPE = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const PESOS = new Intl.NumberFormat('es-MX', {
  style: 'decimal',
  useGrouping: true,
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/**
 * `$1,234.50`, `$1,234`, `-$0.05`.
 *
 * @param centavos an INTEGER number of centavos — `PricedLine.gross` and its
 * siblings from `@tienda/money`, or a `numeric(12,2)` column lifted to
 * integers. Never pesos.
 *
 * ⚠️ IT THROWS ON A NON-INTEGER RATHER THAN ROUNDING ONE. `formatMXN(11.6)` is
 * someone passing pesos, and the friendly reading of that call renders `$0.12`
 * — a wrong price, on the screen, silently, in the one place a shopkeeper
 * trusts absolutely. There is no rounding here at all: rounding is §2.5 rule 6
 * and it happens in `packages/money`, before this function is reached.
 */
export function formatMXN(centavos: number): string {
  if (!Number.isSafeInteger(centavos)) {
    throw new RangeError(
      `formatMXN takes integer CENTAVOS, got ${centavos}. A fractional or ` +
        `unsafe argument is a peso value that lost its scale somewhere — ` +
        `ADR-035 §2.11: arithmetic is integer centavos in packages/money, ` +
        `always, and a formatter never touches a value that will be compared ` +
        `against Postgres.`,
    );
  }

  const negative = centavos < 0;
  const abs = negative ? -centavos : centavos;
  const pesos = Math.floor(abs / 100);
  const remainder = abs - pesos * 100;

  const grouped = PESOS.format(pesos);
  // C12.2: hidden at zero, exactly two when present. There is no third case.
  const fraction = remainder === 0 ? null : String(remainder).padStart(2, '0');

  // The probe carries every part a rendered amount can have — sign, symbol,
  // one integer run, separator, fraction — and none of the parts we substitute
  // depend on its value. `-1` / `1` rather than a larger number on purpose: it
  // produces exactly ONE `integer` part and no `group` parts, so the
  // substitution below cannot land in the middle of someone else's grouping.
  let out = '';
  let numberWritten = false;
  for (const part of SHAPE.formatToParts(negative ? -1 : 1)) {
    switch (part.type) {
      case 'integer':
        if (!numberWritten) {
          out += grouped;
          numberWritten = true;
        }
        break;
      case 'group':
        // The probe has none; PESOS.format already grouped the real number.
        break;
      case 'decimal':
        if (fraction !== null) out += part.value;
        break;
      case 'fraction':
        if (fraction !== null) out += fraction;
        break;
      default:
        // currency, minusSign, and any literal the locale puts between them.
        out += part.value;
    }
  }
  return out;
}
