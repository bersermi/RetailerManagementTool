// ============================================================================
// WHAT A PRICE LOOKS LIKE WHEN A FONDA READS IT. Plan task `10.4b-iv-a`, the
// first prices this app shows.
//
// ⚠️ WERA'S `formatMXN`, COPIED (`app/src/format/mxn.ts`, plan `5a-ii`, C12.2:
// *"$1,234.50 — comma thousands, point decimals. Centavos are hidden when zero;
// when there are decimals at all, exactly two are shown"*). One person can use
// both apps, so a price reads the same in each. Its header has the reasons, all
// of which hold here:
//   - the argument is INTEGER CENTAVOS and no peso-valued float is ever made —
//     pesos and centavos are split by integer arithmetic;
//   - the symbol, the separator and the sign are READ from ICU through
//     `format()` on two probes, because Hermes has no `formatToParts` — the
//     first spelling crashed Wera on launch on the owner's iPhone (`5a-iv-a`);
//   - it never throws at load: an unreadable shape falls back to `$` and `.`.
// `test/mxn.test.ts` runs both files over the same amounts and requires one
// answer. A fix to one is a fix to both.
// ============================================================================

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

interface Shape {
  readonly prefix: string;
  readonly decimal: string;
  readonly suffix: string;
  readonly negativePrefix: string;
  readonly negativeSuffix: string;
}

/** The es-MX shape, read with `format` alone, on `1` and `-1` (no grouping to confuse the separator). */
function readShape(): Shape {
  const positive = SHAPE.format(1);
  const negative = SHAPE.format(-1);

  const first = positive.search(/\d/);
  let last = -1;
  for (let i = positive.length - 1; i >= 0; i -= 1) {
    if (positive[i] >= '0' && positive[i] <= '9') {
      last = i;
      break;
    }
  }
  if (first < 0 || last < first) {
    return { prefix: '$', decimal: '.', suffix: '', negativePrefix: '-', negativeSuffix: '' };
  }

  const prefix = positive.slice(0, first);
  const suffix = positive.slice(last + 1);
  const decimal = positive.slice(first, last + 1).replace(/\d/g, '');

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

/** Integer centavos as a fonda reads them — `$65`, `$65.50`, `$1,234.50`. */
export function formatMXN(centavos: number): string {
  if (!Number.isSafeInteger(centavos)) {
    throw new RangeError(`formatMXN takes integer CENTAVOS, got ${centavos}.`);
  }
  const negative = centavos < 0;
  const abs = negative ? -centavos : centavos;
  const pesos = Math.floor(abs / 100);
  const remainder = abs - pesos * 100;
  const grouped = PESOS.format(pesos);
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
