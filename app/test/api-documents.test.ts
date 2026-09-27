import { describe, expect, it } from 'vitest';

import {
  DOCUMENTS_COLUMNS,
  DOCUMENTS_DAYS,
  DOCUMENTS_HEAD_COLUMNS,
  DOCUMENTS_PROVIDER_COLUMN,
  DOCUMENTS_LIMIT,
  DOCUMENTS_LINE_COLUMNS,
  DOCUMENTS_LINE_ORDER,
  DOCUMENTS_LINE_ORDER_ASCENDING,
  DOCUMENTS_LINE_TABLE,
  DOCUMENTS_ORDER,
  DOCUMENTS_ORDER_ASCENDING,
  DOCUMENTS_SINCE_COLUMN,
  DOCUMENTS_TABLE,
  DOCUMENTS_TIEBREAK,
  DOCUMENT_KINDS,
  NOTHING_READ,
  documentsFrom,
  documentsKey,
  documentsLine,
  sinceISO,
  type DocumentKind,
  type DocumentLineRow,
  type DocumentRow,
} from '@/api/documents';
import type { Provider } from '@/api/providers';
import { ES } from '@/strings';

// ============================================================================
// LO ÚLTIMO — WHAT THE SHOP BOUGHT AND SOLD LATELY. Plan task `5h-ii-a`.
//
// ⚠️ §2.11 allows a suite *"where a test pins a VALUE a customer sees or the
// ledger stores"* and refuses one over rendering. Everything below is the first
// kind: which documents STAND, what each one is worth, what each line says, and
// which day it happened on. **The screen is `app/src/app/documentos.tsx` and no
// instrument here can look at it.**
//
// ⚠️⚠️ WHAT THIS FILE CANNOT ASSERT IS THE WIRE, and on this module that is most
// of the risk. That a **to-many** embed over a **composite** foreign key resolves
// at all, that `::text` holds INSIDE that embed, that a parent `limit` counts
// documents rather than truncating their lines, and that PostgREST will sort the
// lines by a NESTED column are four questions only a real PostgREST answers —
// `docs/checks/5h-ii-a-documents-contract.sh` is where they are asked. A suite
// that feeds itself strings is green on a contract that has started sending
// doubles.
//
// ⚠️ THE CLOCK IS PASSED IN EVERYWHERE (`R3`), and `sinceISO`'s cases are
// deliberately boundaries. ⚠️⚠️ **THEY ARE LOCAL-TIME CASES AND THIS MACHINE IS
// UTC−6 WHILE CI IS UTC** ([[local-time-tests-need-a-pinned-tz]]), so every
// assertion below is written against the DEVICE's own calendar rather than
// against a UTC instant — the two disagree, and a fixture that compared ISO
// strings would be green here and red in CI or the reverse.
// ============================================================================

let serial = 0;

/**
 * One line of a document. `qty` is as keyed, in `unit`; the money is net + tax.
 *
 * ⚠️ `5h-ii-b` ADDED `qty_base` AND `unit_price_net_per_base`, AND THEY DEFAULT
 * TO FIGURES THAT DISAGREE WITH `qty` ON PURPOSE. Nothing renders either one —
 * `prefillOf` is the only reader — so a fixture that made them consistent with
 * the display quantity would let a renderer quietly start using the wrong one
 * and stay green. The cases that care pass their own.
 */
function line(
  name: string | null,
  qty: string,
  unit: string,
  net: string,
  tax = '0.00',
  base = '1.000',
  perBase = '0.010000',
): DocumentLineRow {
  serial += 1;
  return {
    id: `line-${serial}`,
    variant_id: `variant-${serial}`,
    qty_base: base,
    qty_display: qty,
    qty_display_unit: unit,
    unit_price_net_per_base: perBase,
    line_net: net,
    tax_amount: tax,
    product_variant: name === null ? null : { name },
  };
}

/** A standing purchase. */
function purchase(
  id: string,
  at: string,
  net: string,
  lines: readonly DocumentLineRow[],
  providerId: string | null = 'prov-1',
  tax = '0.00',
  createdBy: string | null = 'person-1',
): DocumentRow {
  return {
    id,
    occurred_at: at,
    total_net: net,
    total_tax: tax,
    reversal_of: null,
    created_by: createdBy,
    provider_id: providerId,
    purchase_line: lines,
  };
}

/** A standing sale. */
function sale(
  id: string,
  at: string,
  net: string,
  lines: readonly DocumentLineRow[],
  tax = '0.00',
  createdBy: string | null = 'person-1',
): DocumentRow {
  return {
    id,
    occurred_at: at,
    total_net: net,
    total_tax: tax,
    reversal_of: null,
    created_by: createdBy,
    sale_line: lines,
  };
}

/** The mirror-image document `void_transaction` writes — negated, and pointing back. */
function reversalOf(row: DocumentRow, kind: DocumentKind, id = 'void-1'): DocumentRow {
  const negate = (figure: string) => (figure.startsWith('-') ? figure.slice(1) : `-${figure}`);
  const lines = (kind === 'purchase' ? row.purchase_line : row.sale_line) ?? [];
  const flipped = lines.map((one) => ({
    ...one,
    id: `${one.id}-void`,
    qty_base: negate(one.qty_base),
    qty_display: negate(one.qty_display),
    line_net: negate(one.line_net),
    tax_amount: negate(one.tax_amount),
  }));
  const base = {
    id,
    occurred_at: row.occurred_at,
    total_net: negate(row.total_net),
    total_tax: negate(row.total_tax),
    reversal_of: row.id,
    created_by: row.created_by,
  };
  return kind === 'purchase'
    ? { ...base, provider_id: row.provider_id ?? null, purchase_line: flipped }
    : { ...base, sale_line: flipped };
}

const PROVIDERS: readonly Provider[] = [
  { id: 'prov-1', name: 'Bodega Hernández', isGeneric: false },
  { id: 'prov-generic', name: 'Genérico', isGeneric: true },
];

/** An instant that is unambiguous in both UTC and UTC−6 — midday. */
function middayOf(day: string): string {
  return `${day}T18:00:00+00:00`;
}

// ----------------------------------------------------------------------------
describe('the contract is written once, and the two kinds are the same shape', () => {
  it('names both kinds, purchases first', () => {
    expect(DOCUMENT_KINDS).toEqual(['purchase', 'sale']);
  });

  it('gives every kind a table and a line table', () => {
    for (const kind of DOCUMENT_KINDS) {
      expect(DOCUMENTS_TABLE[kind], `${kind} has no table`).toBeTruthy();
      expect(DOCUMENTS_LINE_TABLE[kind], `${kind} has no line table`).toBeTruthy();
    }
  });

  it('asks for named columns and never a star (R13, C8.8)', () => {
    for (const kind of DOCUMENT_KINDS) {
      expect(DOCUMENTS_COLUMNS[kind]).not.toContain('*');
    }
    expect(DOCUMENTS_LINE_COLUMNS).not.toContain('*');
  });

  it('casts every money and quantity column to text (R5)', () => {
    // ⚠️ A BARE `numeric` ARRIVES AS A DOUBLE and `parseDecimal` refuses a number
    // argument outright. This is the string-level half; the wire is the check's.
    for (const kind of DOCUMENT_KINDS) {
      expect(DOCUMENTS_COLUMNS[kind]).toContain('total_net::text');
      expect(DOCUMENTS_COLUMNS[kind]).toContain('total_tax::text');
    }
    expect(DOCUMENTS_LINE_COLUMNS).toContain('line_net::text');
    expect(DOCUMENTS_LINE_COLUMNS).toContain('tax_amount::text');
    expect(DOCUMENTS_LINE_COLUMNS).toContain('qty_display::text');
  });

  it('embeds each kind’s own line table, and asks for the product’s name', () => {
    for (const kind of DOCUMENT_KINDS) {
      expect(DOCUMENTS_COLUMNS[kind]).toContain(`${DOCUMENTS_LINE_TABLE[kind]}(`);
      expect(DOCUMENTS_COLUMNS[kind]).toContain(DOCUMENTS_LINE_COLUMNS);
    }
    expect(DOCUMENTS_LINE_COLUMNS).toContain('product_variant(name)');
  });

  it('reads the reversal link on both kinds, because the void rule needs it', () => {
    for (const kind of DOCUMENT_KINDS) {
      expect(DOCUMENTS_COLUMNS[kind]).toContain('reversal_of');
    }
  });

  it('asks a purchase for its provider and a sale for nothing of the kind', () => {
    expect(DOCUMENTS_COLUMNS.purchase).toContain(DOCUMENTS_PROVIDER_COLUMN);
    expect(DOCUMENTS_COLUMNS.sale).not.toContain(DOCUMENTS_PROVIDER_COLUMN);
  });

  // ⚠️⚠️ THE TWO KINDS ARE **COMPOSED** FROM FOUR PARTS AND NOT SPELLED TWICE,
  // which is what lets `docs/checks/5h-ii-a-documents-contract.sh` build the same
  // wire strings out of the app's own constants instead of retyping them. A check
  // that retypes a contract is asserting itself.
  it('composes both column lists out of the shared parts', () => {
    expect(DOCUMENTS_COLUMNS.purchase).toBe(
      `${DOCUMENTS_HEAD_COLUMNS},${DOCUMENTS_PROVIDER_COLUMN},` +
        `${DOCUMENTS_LINE_TABLE.purchase}(${DOCUMENTS_LINE_COLUMNS})`,
    );
    expect(DOCUMENTS_COLUMNS.sale).toBe(
      `${DOCUMENTS_HEAD_COLUMNS},${DOCUMENTS_LINE_TABLE.sale}(${DOCUMENTS_LINE_COLUMNS})`,
    );
  });

  // ⚠️⚠️ THIS PAIR WAS PINNED THE OTHER WAY BY `5h-ii-a` AND `5h-ii-b` TURNED IT
  // RED, WHICH IS THE GUARD WORKING. It read *asks for neither `created_by` nor
  // `recorded_offline`*, on the argument that `5h-ii-b` would add the first
  // "with the argument for showing it". **It added it and shows it nowhere**:
  // `mayCorrect` is the only reader, and the argument is the FENCE rather than
  // the display, so `today.ts`'s §2.7 refusal is untouched.
  it('asks for created_by, which nothing renders', () => {
    for (const kind of DOCUMENT_KINDS) {
      expect(DOCUMENTS_COLUMNS[kind]).toContain('created_by');
    }
  });

  // ⚠️⚠️ AND THESE TWO ARE STILL ABSENT, WHICH `5h-ii-b` MEASURED RATHER THAN
  // INHERITED. They are what a client would need to draw the WINDOW half of
  // `0021`'s fence — it is measured from `recorded_at` on an offline write and
  // `occurred_at` otherwise — and drawing it here would be a second answer to
  // *may she void this*, in the one place a wrong answer hides a button she is
  // allowed to press. The database answers it, as `TD003`. A tidying pass that
  // adds either turns this red and has to say why.
  it('asks for neither recorded_offline nor recorded_at', () => {
    for (const kind of DOCUMENT_KINDS) {
      expect(DOCUMENTS_COLUMNS[kind]).not.toContain('recorded_offline');
      expect(DOCUMENTS_COLUMNS[kind]).not.toContain('recorded_at');
    }
  });

  // ⚠️⚠️ THE PARENT ORDER IS A BARE COLUMN AND THAT IS THE POINT: it is the
  // parent's OWN column, so `COSTS_ORDER`'s `table(column)` ceremony is
  // unnecessary here. The LINE order is the opposite — a nested expression.
  it('orders the documents by a plain column of their own table, newest first', () => {
    expect(DOCUMENTS_ORDER).toBe('occurred_at');
    expect(DOCUMENTS_ORDER).not.toContain('(');
    expect(DOCUMENTS_ORDER_ASCENDING).toBe(false);
  });

  it('breaks a tie on the document’s id so the list is reproducible', () => {
    expect(DOCUMENTS_TIEBREAK).toBe('id');
    expect(DOCUMENTS_TIEBREAK).not.toBe(DOCUMENTS_ORDER);
  });

  it('orders the lines by a NESTED embedded column, ascending', () => {
    expect(DOCUMENTS_LINE_ORDER).toBe('product_variant(name)');
    expect(DOCUMENTS_LINE_ORDER).toContain('(');
    expect(DOCUMENTS_LINE_ORDER_ASCENDING).toBe(true);
    // ⚠️ AND THE COLUMN IT SORTS BY IS IN THE EMBED'S SELECT LIST. `5f.5`
    // measured PostgREST refusing to order by an embedded column that is not —
    // 400, `42703` — and this is the string-level half of that lesson.
    expect(DOCUMENTS_LINE_COLUMNS).toContain('product_variant(name)');
  });

  it('filters the window on the column it orders by', () => {
    expect(DOCUMENTS_SINCE_COLUMN).toBe(DOCUMENTS_ORDER);
  });

  it('bounds the read twice — a window and a count', () => {
    expect(DOCUMENTS_DAYS).toBe(7);
    expect(DOCUMENTS_LIMIT).toBeGreaterThan(0);
  });

  it('keys per kind, so one list is never served for the other', () => {
    expect(documentsKey('purchase')).not.toEqual(documentsKey('sale'));
    // ⚠️ AND THE CLOCK IS NOT IN THE KEY — `sinceISO` reads one, and a clock in a
    // key re-fetches this list on every render.
    for (const kind of DOCUMENT_KINDS) {
      for (const part of documentsKey(kind)) expect(String(part)).not.toMatch(/\d{4}-\d{2}/);
    }
  });
});

// ----------------------------------------------------------------------------
describe('sinceISO — the window opens at LOCAL midnight, days ago', () => {
  it('opens at midnight and not at this hour', () => {
    const now = new Date(2026, 8, 26, 14, 7, 33, 500);
    const since = new Date(sinceISO(now, 7));
    expect(since.getHours()).toBe(0);
    expect(since.getMinutes()).toBe(0);
    expect(since.getSeconds()).toBe(0);
    expect(since.getMilliseconds()).toBe(0);
  });

  it('reaches back exactly the number of days asked for', () => {
    const now = new Date(2026, 8, 26, 14, 7, 0, 0);
    const since = new Date(sinceISO(now, 7));
    expect(since.getFullYear()).toBe(2026);
    expect(since.getMonth()).toBe(8);
    expect(since.getDate()).toBe(19);
  });

  // ⚠️ THE `Date` CONSTRUCTOR NORMALISES A NEGATIVE DAY, so this function never
  // has to know how long a month is. Both boundaries are asserted because one
  // arithmetic mistake here silently shortens the window rather than throwing.
  it('crosses a month backwards without knowing how long the month is', () => {
    const since = new Date(sinceISO(new Date(2026, 9, 3, 9, 0, 0, 0), 7));
    expect(since.getMonth()).toBe(8);
    expect(since.getDate()).toBe(26);
  });

  it('crosses a year backwards', () => {
    const since = new Date(sinceISO(new Date(2027, 0, 3, 9, 0, 0, 0), 7));
    expect(since.getFullYear()).toBe(2026);
    expect(since.getMonth()).toBe(11);
    expect(since.getDate()).toBe(27);
  });

  it('is an instant PostgREST can compare — a Z-terminated ISO string', () => {
    expect(sinceISO(new Date(2026, 8, 26, 14, 0, 0, 0), 7)).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    );
  });

  // ⚠️ ZERO DAYS IS TODAY'S MIDNIGHT, which is `dayStartISO`'s answer — asserted
  // so the two functions cannot drift into disagreeing about the same instant.
  it('at zero days is the start of today', () => {
    const now = new Date(2026, 8, 26, 23, 59, 59, 999);
    const since = new Date(sinceISO(now, 0));
    expect(since.getDate()).toBe(26);
    expect(since.getHours()).toBe(0);
  });
});

// ----------------------------------------------------------------------------
describe('documentsFrom — a read in flight is not an empty shop', () => {
  it('is unknown for undefined and for null', () => {
    expect(documentsFrom('purchase', undefined)).toEqual(NOTHING_READ);
    expect(documentsFrom('purchase', null).state).toBe('unknown');
    expect(documentsFrom('sale', undefined).state).toBe('unknown');
  });

  it('is nothing for an empty array, which is a real answer', () => {
    const read = documentsFrom('purchase', []);
    expect(read.state).toBe('nothing');
    expect(read.documents).toEqual([]);
  });

  it('is some for a document that stands', () => {
    const read = documentsFrom(
      'purchase',
      [purchase('p1', middayOf('2026-09-25'), '100.00', [line('Jitomate', '3.000', 'kg', '100.00')])],
      PROVIDERS,
    );
    expect(read.state).toBe('some');
    expect(read.documents).toHaveLength(1);
  });
});

// ----------------------------------------------------------------------------
describe('the void rule — a reversal and the document it cancels both drop', () => {
  // ⚠️⚠️ THE OWNER'S OWN ANSWER RATHER THAN AN INFERENCE, from `5h-i`: asked what
  // a corrected delivery should look like a week later — ***"Just one line,
  // clean"***. No *corregido* mark, no struck-through pair.
  it('drops both halves of a voided purchase', () => {
    const original = purchase('p1', middayOf('2026-09-25'), '100.00', [
      line('Jitomate', '3.000', 'kg', '100.00'),
    ]);
    const read = documentsFrom('purchase', [reversalOf(original, 'purchase'), original], PROVIDERS);
    expect(read.state).toBe('nothing');
    expect(read.documents).toEqual([]);
  });

  it('drops both halves of a voided sale', () => {
    const original = sale('s1', middayOf('2026-09-25'), '40.00', [
      line('Bolillo', '4.000', 'pza', '40.00'),
    ]);
    const read = documentsFrom('sale', [reversalOf(original, 'sale'), original]);
    expect(read.state).toBe('nothing');
  });

  // ⚠️⚠️ THE REVERSAL CAN ARRIVE **BEFORE** OR **AFTER** THE DOCUMENT IT CANCELS,
  // which is why `documentsFrom` collects the reversed ids in a first pass.
  // `takingsFrom` and `typicalFrom` both learned this, and a single pass is green
  // on one ordering and wrong on the other.
  it('drops both halves whichever order they arrive in', () => {
    const original = purchase('p1', middayOf('2026-09-25'), '100.00', [
      line('Jitomate', '3.000', 'kg', '100.00'),
    ]);
    const void_ = reversalOf(original, 'purchase');
    expect(documentsFrom('purchase', [original, void_], PROVIDERS).documents).toEqual([]);
    expect(documentsFrom('purchase', [void_, original], PROVIDERS).documents).toEqual([]);
  });

  it('keeps the OTHER documents when one of them is voided', () => {
    const voided = purchase('p1', middayOf('2026-09-25'), '100.00', [
      line('Jitomate', '3.000', 'kg', '100.00'),
    ]);
    const standing = purchase('p2', middayOf('2026-09-24'), '50.00', [
      line('Cebolla', '2.000', 'kg', '50.00'),
    ]);
    const read = documentsFrom(
      'purchase',
      [reversalOf(voided, 'purchase'), voided, standing],
      PROVIDERS,
    );
    expect(read.documents.map((one) => one.id)).toEqual(['p2']);
  });

  it('drops a document with no id rather than drawing a row nothing can address', () => {
    const read = documentsFrom('purchase', [
      { ...purchase('', middayOf('2026-09-25'), '10.00', []), id: '' },
    ]);
    expect(read.documents).toEqual([]);
  });

  // ⚠️ AN EMPTY STRING IS NOT A LINK. `reversal_of` is nullable, and a `''` from
  // a mangled transport would otherwise make every document a reversal and empty
  // the whole list.
  it('treats an empty reversal_of as no reversal at all', () => {
    const read = documentsFrom('purchase', [
      { ...purchase('p1', middayOf('2026-09-25'), '10.00', []), reversal_of: '' },
    ]);
    expect(read.documents.map((one) => one.id)).toEqual(['p1']);
  });
});

// ----------------------------------------------------------------------------
describe('the order the database gave is the order that comes out', () => {
  // ⚠️ NO SECOND SORT IN THIS RUNTIME — the rule `catalogFrom` and `providersFrom`
  // both wrote down. A sort here would be a second answer to *which came first*,
  // decided by whatever collation Hermes has rather than the one Postgres applied.
  it('preserves the response order and re-sorts nothing', () => {
    const rows = [
      purchase('p3', middayOf('2026-09-26'), '30.00', [line('C', '1.000', 'kg', '30.00')]),
      purchase('p1', middayOf('2026-09-25'), '10.00', [line('A', '1.000', 'kg', '10.00')]),
      purchase('p2', middayOf('2026-09-24'), '20.00', [line('B', '1.000', 'kg', '20.00')]),
    ];
    expect(documentsFrom('purchase', rows, PROVIDERS).documents.map((one) => one.id)).toEqual([
      'p3',
      'p1',
      'p2',
    ]);
  });

  it('preserves the line order the embed gave', () => {
    const read = documentsFrom('purchase', [
      purchase('p1', middayOf('2026-09-25'), '60.00', [
        line('Aguacate', '1.000', 'kg', '10.00'),
        line('Bolillo', '2.000', 'pza', '20.00'),
        line('Cebolla', '3.000', 'kg', '30.00'),
      ]),
    ]);
    expect(read.documents[0]?.lines.map((one) => one.name)).toEqual([
      'Aguacate',
      'Bolillo',
      'Cebolla',
    ]);
  });
});

// ----------------------------------------------------------------------------
describe('the money — gross of IVA, in integer centavos, and never a float', () => {
  it('adds tax to net for the document total', () => {
    const read = documentsFrom('sale', [
      sale('s1', middayOf('2026-09-25'), '100.00', [line('X', '1.000', 'pza', '100.00', '16.00')], '16.00'),
    ]);
    expect(read.documents[0]?.grossCentavos).toBe(11600);
    // ⚠️ `$116` AND NOT `$116.00` — C12.2, which `formatMXN` implements: the
    // centavos are hidden at zero and exactly two when present, and there is no
    // third case. A fixture expecting `.00` is asserting a rule this app refused.
    expect(read.documents[0]?.amount).toBe('$116');
  });

  it('adds tax to net per line too', () => {
    const read = documentsFrom('sale', [
      sale('s1', middayOf('2026-09-25'), '100.00', [line('X', '1.000', 'pza', '100.00', '16.00')], '16.00'),
    ]);
    expect(read.documents[0]?.lines[0]?.amount).toBe('$116');
  });

  it('handles centavos without going through a float', () => {
    const read = documentsFrom('purchase', [
      purchase('p1', middayOf('2026-09-25'), '17.55', [line('X', '1.000', 'kg', '17.55')], 'prov-1', '0.00'),
    ]);
    expect(read.documents[0]?.grossCentavos).toBe(1755);
    expect(read.documents[0]?.amount).toBe('$17.55');
  });

  // ⚠️⚠️ AN UNREADABLE FIGURE WITHHOLDS THE AMOUNT AND KEEPS THE ROW, which is
  // the opposite of `takingsFrom` and is deliberate: a LIST has no sum to spoil,
  // and dropping the row would hide the delivery somebody came here to find.
  it('withholds the figure and keeps the document when a total is unreadable', () => {
    const read = documentsFrom('purchase', [
      { ...purchase('p1', middayOf('2026-09-25'), 'no', [line('X', '1.000', 'kg', '10.00')]) },
    ]);
    expect(read.documents).toHaveLength(1);
    expect(read.documents[0]?.grossCentavos).toBeNull();
    expect(read.documents[0]?.amount).toBe(ES.documents.noFigure);
  });

  it('withholds a LINE’s figure without touching the document’s', () => {
    const read = documentsFrom('purchase', [
      purchase('p1', middayOf('2026-09-25'), '10.00', [line('X', '1.000', 'kg', 'no')]),
    ]);
    expect(read.documents[0]?.amount).toBe('$10');
    expect(read.documents[0]?.lines[0]?.amount).toBe(ES.documents.noFigure);
  });

  // ⚠️ A JSON NUMBER IS WHAT A MISSING `::text` LOOKS LIKE, and `parseDecimal`
  // refuses one outright. This is the branch that keeps a cast regression from
  // rendering a plausible wrong peso figure.
  it('refuses a number where a decimal string belongs', () => {
    const read = documentsFrom('purchase', [
      { ...purchase('p1', middayOf('2026-09-25'), '10.00', []), total_net: 10 as unknown as string },
    ]);
    expect(read.documents[0]?.grossCentavos).toBeNull();
  });

  it('carries a reversal’s own negative figure if one is ever shown', () => {
    // ⚠️ NOTHING SHOWS ONE TODAY — the void rule drops it — and the arithmetic is
    // asserted anyway, because `5h-ii-b` is about to make reversals routine and a
    // sign error found then is a sign error in front of a shopkeeper.
    const read = documentsFrom('purchase', [
      { ...purchase('v1', middayOf('2026-09-25'), '-100.00', []), reversal_of: null },
    ]);
    expect(read.documents[0]?.grossCentavos).toBe(-10000);
  });
});

// ----------------------------------------------------------------------------
describe('the lines — what was keyed, in the unit it was keyed in', () => {
  it('shows the keyed figure and the unit’s own Spanish word', () => {
    const read = documentsFrom('purchase', [
      purchase('p1', middayOf('2026-09-25'), '10.00', [line('Jitomate', '3.000', 'kg', '10.00')]),
    ]);
    expect(read.documents[0]?.lines[0]?.quantity).toBe('3 kg');
  });

  // ⚠️⚠️ C3.8's TWO EXAMPLES, WHICH ARE `qtyShown`'s RULE AND NOT `trimZeros`'.
  // An all-zero fraction goes; a significant one stays. Trimming any trailing
  // zero would turn a quarter kilo into `0.25`.
  it('trims an all-zero fraction and keeps a significant one', () => {
    const read = documentsFrom('purchase', [
      purchase('p1', middayOf('2026-09-25'), '10.00', [
        line('A', '750.000', 'g', '10.00'),
        line('B', '0.250', 'kg', '10.00'),
        line('C', '1.500', 'kg', '10.00'),
      ]),
    ]);
    expect(read.documents[0]?.lines.map((one) => one.quantity)).toEqual([
      '750 gr',
      '0.250 kg',
      '1.500 kg',
    ]);
  });

  it('renders g as gr, the word ES.units gives it', () => {
    const read = documentsFrom('purchase', [
      purchase('p1', middayOf('2026-09-25'), '10.00', [line('A', '288.000', 'g', '10.00')]),
    ]);
    expect(read.documents[0]?.lines[0]?.quantity).toBe(`288 ${ES.units.g}`);
  });

  it('keeps a unit code it does not know rather than dropping it', () => {
    const read = documentsFrom('purchase', [
      purchase('p1', middayOf('2026-09-25'), '10.00', [line('A', '2.000', 'caja', '10.00')]),
    ]);
    expect(read.documents[0]?.lines[0]?.quantity).toBe('2 caja');
  });

  it('names a product this phone could not read, rather than dropping the line', () => {
    const read = documentsFrom('purchase', [
      purchase('p1', middayOf('2026-09-25'), '10.00', [line(null, '2.000', 'kg', '10.00')]),
    ]);
    expect(read.documents[0]?.lines).toHaveLength(1);
    expect(read.documents[0]?.lines[0]?.name).toBe(ES.documents.unknownProduct);
  });

  it('carries the line’s own id, because two lines may share a variant', () => {
    const read = documentsFrom('purchase', [
      purchase('p1', middayOf('2026-09-25'), '20.00', [
        line('Jitomate', '3.000', 'kg', '10.00'),
        line('Jitomate', '1.500', 'kg', '10.00'),
      ]),
    ]);
    const ids = read.documents[0]?.lines.map((one) => one.id) ?? [];
    expect(new Set(ids).size).toBe(2);
  });

  it('is an empty list when the embed is absent, and never a crash', () => {
    const read = documentsFrom('purchase', [
      { id: 'p1', occurred_at: middayOf('2026-09-25'), total_net: '10.00', total_tax: '0.00', reversal_of: null, created_by: 'person-1' },
    ]);
    expect(read.documents[0]?.lines).toEqual([]);
  });

  it('reads a sale’s lines from sale_line and a purchase’s from purchase_line', () => {
    const rows: readonly DocumentRow[] = [
      { ...sale('s1', middayOf('2026-09-25'), '10.00', [line('A', '1.000', 'kg', '10.00')]) },
    ];
    expect(documentsFrom('sale', rows).documents[0]?.lines).toHaveLength(1);
    // ⚠️ THE SAME ROW READ AS THE WRONG KIND FINDS NO LINES, which is what makes
    // the per-kind key in `documentsKey` load-bearing rather than tidy.
    expect(documentsFrom('purchase', rows).documents[0]?.lines).toEqual([]);
  });
});

// ----------------------------------------------------------------------------
describe('the counterparty — who the shop bought from', () => {
  it('names the provider on a purchase', () => {
    const read = documentsFrom(
      'purchase',
      [purchase('p1', middayOf('2026-09-25'), '10.00', [], 'prov-1')],
      PROVIDERS,
    );
    expect(read.documents[0]?.counterparty).toBe('Bodega Hernández');
  });

  // ⚠️ `Genérico` IS A SCHEMA WORD AND NOT SOMETHING A SHOPKEEPER SAYS —
  // `costsFrom`'s own rule, and the owner's: *compra directa*.
  it('calls the generic provider compra directa and never Genérico', () => {
    const read = documentsFrom(
      'purchase',
      [purchase('p1', middayOf('2026-09-25'), '10.00', [], 'prov-generic')],
      PROVIDERS,
    );
    expect(read.documents[0]?.counterparty).toBe(ES.costs.generic);
    expect(read.documents[0]?.counterparty).not.toBe('Genérico');
  });

  it('is null on a sale, which has no supplier', () => {
    const read = documentsFrom('sale', [sale('s1', middayOf('2026-09-25'), '10.00', [])]);
    expect(read.documents[0]?.counterparty).toBeNull();
  });

  // ⚠️ A UUID ON A SCREEN IS WORSE THAN A MISSING LINE OF TEXT, and the provider
  // read may simply still be in flight.
  it('is null rather than an id when the directory cannot name it', () => {
    const read = documentsFrom(
      'purchase',
      [purchase('p1', middayOf('2026-09-25'), '10.00', [], 'prov-unknown')],
      PROVIDERS,
    );
    expect(read.documents[0]?.counterparty).toBeNull();
  });

  it('is null when the providers read has not arrived at all', () => {
    const read = documentsFrom('purchase', [
      purchase('p1', middayOf('2026-09-25'), '10.00', [], 'prov-1'),
    ]);
    expect(read.documents[0]?.counterparty).toBeNull();
  });
});

// ----------------------------------------------------------------------------
describe('the day — the DEVICE’s calendar, which is not the UTC one', () => {
  // ⚠️⚠️ THIS IS THE ASSERTION `@/api/costs` WOULD FAIL. It buckets on
  // `occurred_at.slice(0, 10)`, the UTC date; `today.ts` settles that the phone
  // is in the shop, so the local day is the shop's day. The fixture is built
  // from a LOCAL instant so it holds in CI (UTC) and on this Mac (UTC−6) alike.
  it('uses the local calendar day and not the UTC slice', () => {
    // 19:30 local on the 25th. In UTC−6 that is 01:30 UTC on the 26th.
    const at = new Date(2026, 8, 25, 19, 30, 0, 0).toISOString();
    const read = documentsFrom('purchase', [purchase('p1', at, '10.00', [])]);
    expect(read.documents[0]?.day).toBe('2026-09-25');
  });

  it('pads the month and the day to two digits', () => {
    const at = new Date(2026, 0, 5, 12, 0, 0, 0).toISOString();
    const read = documentsFrom('purchase', [purchase('p1', at, '10.00', [])]);
    expect(read.documents[0]?.day).toBe('2026-01-05');
  });

  it('is the shape formatLedgerDay reads', () => {
    const at = new Date(2026, 8, 25, 12, 0, 0, 0).toISOString();
    const read = documentsFrom('purchase', [purchase('p1', at, '10.00', [])]);
    expect(read.documents[0]?.day).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('keeps the instant verbatim beside the day', () => {
    const at = middayOf('2026-09-25');
    const read = documentsFrom('purchase', [purchase('p1', at, '10.00', [])]);
    expect(read.documents[0]?.at).toBe(at);
  });

  // ⚠️ A DOCUMENT WITH NO READABLE INSTANT IS DROPPED, because every row on this
  // screen is headed by its date and a row headed `Invalid Date` is worse than
  // no row. Nothing in this schema writes one — `occurred_at` is `not null`.
  it('drops a document whose instant cannot be read', () => {
    expect(documentsFrom('purchase', [purchase('p1', 'not a date', '10.00', [])]).documents).toEqual(
      [],
    );
    expect(documentsFrom('purchase', [purchase('p1', '', '10.00', [])]).documents).toEqual([]);
  });
});

// ----------------------------------------------------------------------------
describe('documentsLine — the one sentence that replaces the list', () => {
  const empty = { state: 'nothing' as const, documents: [] };

  it('says which kind is empty, because the two are different facts', () => {
    expect(documentsLine('purchase', { ...empty, failed: null })).toBe(ES.documents.noPurchases);
    expect(documentsLine('sale', { ...empty, failed: null })).toBe(ES.documents.noSales);
  });

  it('says it is still looking while the read is out', () => {
    expect(documentsLine('purchase', { ...NOTHING_READ, failed: null })).toBe(
      ES.documents.loading,
    );
  });

  // ⚠️⚠️ A FAILED READ MUST NEVER SAY *no hay compras*. The two are identical to a
  // screen and opposites to a shopkeeper — one means *you have no deliveries*,
  // the other means *this phone could not ask*. The failure wins over BOTH other
  // states, which is why it is tested against each.
  it('reports a failure rather than an empty shop', () => {
    const failed = documentsLine('purchase', { ...empty, failed: 'offline' });
    expect(failed).toBe(ES.api.errors.offline);
    expect(failed).not.toBe(ES.documents.noPurchases);
  });

  it('reports a failure rather than a spinner’s sentence', () => {
    expect(documentsLine('sale', { ...NOTHING_READ, failed: 'offline' })).toBe(
      ES.api.errors.offline,
    );
  });

  it('is empty when the list itself is the answer', () => {
    const read = documentsFrom('purchase', [purchase('p1', middayOf('2026-09-25'), '10.00', [])]);
    expect(documentsLine('purchase', { ...read, failed: null })).toBe('');
  });

  it('never returns a word this app has not written down (R4)', () => {
    const words = new Set<string>([
      ES.documents.loading,
      ES.documents.noPurchases,
      ES.documents.noSales,
      ...Object.values(ES.api.errors),
      '',
    ]);
    for (const kind of DOCUMENT_KINDS) {
      for (const state of ['unknown', 'nothing', 'some'] as const) {
        const line_ = documentsLine(kind, { state, documents: [], failed: null });
        expect(words.has(line_), `"${line_}" is not in ES`).toBe(true);
      }
    }
  });
});
