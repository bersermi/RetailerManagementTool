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
// ⚠️⚠️ AND THE FIRST SPELLING OF THAT IDEA USED `formatToParts`, WHICH CRASHED
// THE APP ON LAUNCH. Measured on the owner's iPhone 15, 2026-09-13, plan task
// `5a-iv-a`: `TypeError: undefined is not a function` at `formatMXN`, an
// uncaught JS exception that terminates the process. `Intl.NumberFormat`
// CONSTRUCTS on Hermes and `.format()` returns `$1,234.50` correctly — the
// device said so — but `.formatToParts()` is not there.
//
// ⚠️ THE TWENTY-SIX ASSERTIONS IN `app/test/mxn.test.ts` WERE ALL GREEN THROUGH
// THIS. They run under node, which ships full ICU; the app runs under Hermes,
// which does not. A green CI run is evidence about the runtime CI used, and
// this file is the proof that the two are not the same machine. `env.ts`
// already wrote that warning down — "⚠️ HAND-ROLLED, AND THE REASON IS THE TWO
// RUNTIMES" about `atob` — and this function was written in the same step and
// did not take its own advice.
//
// ✅ SO THE SHAPE IS STILL READ FROM ICU, THROUGH THE ONE DOOR HERMES OPENS:
// `format()` is called on two probe values at module load and the symbol, the
// decimal separator, the suffix and the sign's POSITION are read back out of
// the strings. Nothing about the shape is typed in here, C12.2 stays a
// measurement rather than an assertion, and no method outside
// `format` / `resolvedOptions` is touched.
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

/** Where the locale puts everything that is not a digit. */
interface Shape {
  /** What precedes the number — the currency symbol, plus any locale spacing. */
  readonly prefix: string;
  /** The character between pesos and centavos. C12.2 expects `.` for es-MX. */
  readonly decimal: string;
  /** Anything the locale puts after the digits. Empty for es-MX. */
  readonly suffix: string;
  /** What a negative amount gains at the front, and at the back. */
  readonly negativePrefix: string;
  readonly negativeSuffix: string;
}

/**
 * Read the shape out of ICU using `format` alone.
 *
 * ⚠️ THE PROBES ARE `1` AND `-1` ON PURPOSE. One integer digit and no
 * grouping, so the only non-digit characters in the result are the ones this
 * function is looking for. A larger probe would put a group separator in the
 * middle and there would be two candidates for `decimal`.
 */
function readShape(): Shape {
  const positive = SHAPE.format(1); // es-MX: "$1.00"
  const negative = SHAPE.format(-1); // es-MX: "-$1.00"

  const first = positive.search(/\d/);
  let last = -1;
  for (let i = positive.length - 1; i >= 0; i -= 1) {
    if (positive[i] >= '0' && positive[i] <= '9') {
      last = i;
      break;
    }
  }

  // ⚠️ IT DOES NOT THROW, AND THAT IS THE WHOLE LESSON OF THIS FILE. This runs
  // at module load on a phone; throwing here is the crash we are fixing, in a
  // new place. If ICU ever returns something unreadable the app still renders
  // a correct, if plain, amount — and `app/test/mxn.test.ts` is what notices
  // the shape stopped matching C12.2.
  if (first < 0 || last < first) {
    return { prefix: '$', decimal: '.', suffix: '', negativePrefix: '-', negativeSuffix: '' };
  }

  const prefix = positive.slice(0, first);
  const suffix = positive.slice(last + 1);
  // "1.00" → every non-digit in the core is the decimal separator.
  const decimal = positive.slice(first, last + 1).replace(/\d/g, '');

  // The sign is whatever the negative rendering gains. Both positions are
  // handled because the locale, not this file, decides which one it uses.
  let negativePrefix = '';
  let negativeSuffix = '';
  if (negative.endsWith(positive)) {
    negativePrefix = negative.slice(0, negative.length - positive.length);
  } else if (negative.startsWith(positive)) {
    negativeSuffix = negative.slice(positive.length);
  } else {
    negativePrefix = '-';
  }

  return { prefix, decimal, suffix, negativePrefix, negativeSuffix };
}

const SHAPE_OF = readShape();

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

  return (
    (negative ? SHAPE_OF.negativePrefix : '') +
    SHAPE_OF.prefix +
    grouped +
    (fraction === null ? '' : SHAPE_OF.decimal + fraction) +
    SHAPE_OF.suffix +
    (negative ? SHAPE_OF.negativeSuffix : '')
  );
}
