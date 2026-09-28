import { describe, expect, it } from 'vitest';

import type { MemberRow } from '@/api/members';
import {
  EXPORT_COLUMNS,
  EXPORT_DAY_COLUMN,
  EXPORT_KINDS,
  EXPORT_PAGE,
  EXPORT_TIEBREAK,
  EXPORT_VIEW,
  canExport,
  exportFileName,
  exportFrom,
  exportKey,
  exportLine,
  hourOf,
  isLatestMonth,
  monthOf,
  monthRange,
  monthShift,
  monthTitle,
  plainAmount,
  shortDocument,
  whoOf,
  type ExportLine,
  type ExportRow,
} from '@/api/monthExport';
import { shouldPersistKey } from '@/api/persist';
import { CSV_BOM, CSV_EOL, csvColumnCount, csvText, monthCsv, monthHtml } from '@/export/monthFile';
import { ES } from '@/strings';

// ============================================================================
// THE MONTH DOWNLOAD. Plan task `7d`.
//
// ⚠️ §2.11 allows a suite that pins a VALUE a customer sees or the ledger
// stores. Everything below is that: which days a month covers, who may ask,
// what a row parses to, and what the two files SAY. Whether a phone opens and
// shares them is `R9`'s and is the owner's to look at.
//
// ⚠️ THE CALENDAR IS ASSERTED AGAINST A CALENDAR — literal dates, never the
// array the function built ([[assert-against-a-calendar-not-the-array]]).
// ============================================================================

const SALE_DOC = '3fa85f64-5717-4562-b3fc-2c963f66afa6';
const BUY_DOC = 'a1b2c3d4-0000-4000-8000-000000000001';
const WASTE_DOC = 'b1b2c3d4-0000-4000-8000-000000000002';
const ANA = '11111111-1111-4111-8111-111111111111';
const GONE = '22222222-2222-4222-8222-222222222222';

function row(over: Partial<ExportRow>): ExportRow {
  return {
    kind: 'sale',
    document_id: SALE_DOC,
    line_id: 'l1',
    day: '2026-09-03',
    occurred_at: new Date(2026, 8, 3, 9, 14).toISOString(),
    is_reversal: false,
    created_by: ANA,
    location_name: 'Centro',
    provider_name: null,
    variant_name: 'Queso fresco',
    family_name: 'Lácteos',
    qty_display: '1.500',
    qty_display_unit: 'kg',
    line_net: '155.17',
    tax_amount: '24.83',
    line_gross: '180.00',
    waste_reason: null,
    expiry_date: null,
    ...over,
  };
}

const MEMBERS: MemberRow[] = [
  { user_id: ANA, role: 'staff', is_active: true, display_name: 'Ana' },
  { user_id: GONE, role: 'staff', is_active: false, display_name: 'Beto' },
] as unknown as MemberRow[];

function lines(rows: ExportRow[]): readonly ExportLine[] {
  const got = exportFrom(rows);
  expect(got.state).toBe('lines');
  return got.lines;
}

describe('the contract', () => {
  it('reads transaction_export, filtered and ordered on the store day', () => {
    expect(EXPORT_VIEW).toBe('transaction_export');
    expect(EXPORT_DAY_COLUMN).toBe('day');
  });

  it('never asks for the cost column — the one number a write-off must not carry', () => {
    expect(EXPORT_COLUMNS.split(',')).not.toContain('unit_cost_net_per_base');
    expect(EXPORT_COLUMNS).not.toContain('*');
  });

  it('never asks for the per-base-unit price, which reads per GRAM', () => {
    expect(EXPORT_COLUMNS).not.toContain('unit_price_net_per_base');
  });

  it('asks for every figure as text, so parseDecimal is never handed a double', () => {
    for (const column of ['qty_display', 'line_net', 'tax_amount', 'line_gross']) {
      expect(EXPORT_COLUMNS.split(',')).toContain(`${column}::text`);
    }
  });

  it('pages below max_rows, over an order that ends on a key', () => {
    expect(EXPORT_PAGE).toBeLessThan(1000);
    // (kind, line_id) is a key: a line's id is unique within its kind.
    expect(EXPORT_TIEBREAK).toContain('kind');
    expect(EXPORT_TIEBREAK.at(-1)).toBe('line_id');
  });

  it('keeps a month of the ledger off the phone\'s disk', () => {
    expect(shouldPersistKey(exportKey('2026-09-01'))).toBe(false);
  });

  it('keys the cache on the month', () => {
    expect(exportKey('2026-09-01')).not.toEqual(exportKey('2026-08-01'));
  });
});

describe('who may download — 0033 gives a cashier zero rows', () => {
  it('lets the owner and a manager, and not a cashier', () => {
    expect(canExport('owner')).toBe(true);
    expect(canExport('manager')).toBe(true);
    expect(canExport('staff')).toBe(false);
  });

  it('fences out a role not yet known', () => {
    expect(canExport(null)).toBe(false);
  });
});

describe('the month', () => {
  it('is the first of the month a day is in', () => {
    expect(monthOf('2026-09-28')).toBe('2026-09-01');
  });

  it('steps back across a year', () => {
    expect(monthShift('2026-01-01', -1)).toBe('2025-12-01');
    expect(monthShift('2026-09-01', -12)).toBe('2025-09-01');
  });

  it('steps forward across a year', () => {
    expect(monthShift('2025-12-01', 1)).toBe('2026-01-01');
  });

  it('reads half-open, up to the next month\'s first — February has no 30th to get wrong', () => {
    expect(monthRange('2026-02-01')).toEqual({ from: '2026-02-01', to: '2026-03-01' });
    expect(monthRange('2026-12-01')).toEqual({ from: '2026-12-01', to: '2027-01-01' });
  });

  it('stops the picker at the month today is in', () => {
    expect(isLatestMonth('2026-09-01', '2026-09-28')).toBe(true);
    expect(isLatestMonth('2026-08-01', '2026-09-28')).toBe(false);
  });

  it('names a month the way a person says it', () => {
    expect(monthTitle('2026-09-01')).toBe('septiembre 2026');
    expect(monthTitle('2027-01-01')).toBe('enero 2027');
  });

  it('names the file so a folder of them sorts in time order', () => {
    expect(exportFileName('2026-09-01', 'csv')).toBe('movimientos-2026-09.csv');
    expect(exportFileName('2026-09-01', 'pdf')).toBe('movimientos-2026-09.pdf');
  });
});

describe('the rows', () => {
  it('is unknown while the read is out', () => {
    expect(exportFrom(undefined).state).toBe('unknown');
    expect(exportFrom(null).state).toBe('unknown');
  });

  it('is nothing when the month holds no line', () => {
    expect(exportFrom([]).state).toBe('nothing');
  });

  it('parses the money to centavos', () => {
    const [one] = lines([row({})]);
    expect(one).toMatchObject({ net: 15517, tax: 2483, gross: 18000, kind: 'sale' });
  });

  it('withholds the whole file when one figure does not parse', () => {
    const got = exportFrom([row({}), row({ line_id: 'l2', line_gross: 'NaN' })]);
    expect(got).toEqual({ state: 'unreadable', lines: [] });
  });

  it('withholds the whole file when a figure arrives as a JSON number', () => {
    const got = exportFrom([row({ line_net: 155.17 as unknown as string })]);
    expect(got.state).toBe('unreadable');
  });

  it('withholds the whole file on a kind it does not know', () => {
    expect(exportFrom([row({ kind: 'transfer' })]).state).toBe('unreadable');
  });

  it('keeps a line whose cause the app does not know, and says less about it', () => {
    const [one] = lines([row({ kind: 'waste', waste_reason: 'algo_nuevo' })]);
    expect(one?.reason).toBeNull();
  });

  it('reads the hour off the phone\'s clock', () => {
    expect(hourOf(new Date(2026, 8, 3, 9, 4).toISOString())).toBe('09:04');
    expect(hourOf('')).toBe('');
    expect(hourOf('not a date')).toBe('');
  });
});

describe('the sentence in place of a file', () => {
  it('says the month was empty, naming it', () => {
    expect(exportLine('nothing', null, '2026-08-01')).toBe('No hubo movimientos en agosto 2026.');
  });

  it('says a failed read failed, never that the month was empty', () => {
    expect(exportLine('unknown', 'offline', '2026-08-01')).toBe(ES.api.errors.offline);
    expect(exportLine('nothing', 'offline', '2026-08-01')).toBe(ES.api.errors.offline);
  });

  it('is empty when there is a file', () => {
    expect(exportLine('lines', null, '2026-08-01')).toBe('');
  });
});

describe('the small parts', () => {
  it('writes money a spreadsheet can sum — no sign, no comma', () => {
    expect(plainAmount(123450)).toBe('1234.50');
    expect(plainAmount(5)).toBe('0.05');
    expect(plainAmount(0)).toBe('0.00');
    expect(plainAmount(-3600)).toBe('-36.00');
  });

  it('names a member who has since left — this is history', () => {
    expect(whoOf(MEMBERS, GONE)).toBe('Beto');
    expect(whoOf(MEMBERS, ANA)).toBe('Ana');
  });

  it('never writes a uuid in place of a name', () => {
    expect(whoOf(MEMBERS, '99999999-9999-4999-8999-999999999999')).toBe('');
    expect(whoOf(null, ANA)).toBe('');
  });

  it('shortens a document to eight characters so a reader can group its lines', () => {
    expect(shortDocument(SALE_DOC)).toBe('3FA85F64');
  });
});

describe('the CSV', () => {
  const month = lines([
    row({}),
    row({
      kind: 'purchase',
      document_id: BUY_DOC,
      line_id: 'p1',
      provider_name: 'Ferretería "El Águila", Hijos',
      qty_display: '20',
      line_net: '1900.00',
      tax_amount: '0.00',
      line_gross: '1900.00',
      expiry_date: '2026-09-10',
    }),
    row({
      kind: 'sale',
      document_id: 'c0000000-0000-4000-8000-000000000003',
      line_id: 'l9',
      is_reversal: true,
      qty_display: '-1.500',
      line_net: '-155.17',
      tax_amount: '-24.83',
      line_gross: '-180.00',
      created_by: GONE,
    }),
    row({
      kind: 'waste',
      document_id: WASTE_DOC,
      line_id: 'w1',
      waste_reason: 'caducado',
      variant_name: '=HYPERLINK("x")',
    }),
  ]);
  const csv = monthCsv(month, MEMBERS);
  const rows = csv.slice(CSV_BOM.length).split(CSV_EOL);

  it('opens with a byte-order mark, or Excel reads every accent wrong', () => {
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv.startsWith('\uFEFF\uFEFF')).toBe(false);
  });

  it('ends every row, the last included, with CRLF', () => {
    expect(csv.endsWith(CSV_EOL)).toBe(true);
    expect(rows.at(-1)).toBe('');
  });

  it('heads its columns in Spanish, in order', () => {
    expect(rows[0]?.split(',')).toEqual(Object.values(ES.monthExport.columns).map(csvText));
  });

  it('writes one row per line, and no total row', () => {
    expect(rows.length - 2).toBe(4);
  });

  it('keeps every row under its own headings — the cells count matches', () => {
    // Only the unquoted rows split cleanly on commas; the purchase row quotes a comma.
    for (const at of [1, 3, 4]) expect(rows[at]?.split(',')).toHaveLength(csvColumnCount());
  });

  it('writes a sale line the way a notebook would', () => {
    expect(rows[1]).toBe(
      '2026-09-03,09:14,Centro,Venta,3FA85F64,Queso fresco,Lácteos,1.500,kg,155.17,24.83,180.00,,,,,Ana',
    );
  });

  it('quotes a supplier whose name holds a comma and doubles its quotes', () => {
    expect(rows[2]).toContain('"Ferretería ""El Águila"", Hijos"');
    expect(rows[2]).toContain(',Compra,');
    expect(rows[2]).toContain(',2026-09-10,');
  });

  it('marks a cancellation, keeps its negative figures as numbers, and names who has left', () => {
    expect(rows[3]).toContain(',-1.500,');
    expect(rows[3]).toContain(',-155.17,-24.83,-180.00,');
    expect(rows[3]?.endsWith(',Sí,Beto')).toBe(true);
  });

  it('writes a write-off\'s cause in words, not the wire value', () => {
    expect(rows[4]).toContain(`,${ES.waste.reason.caducado},`);
    expect(rows[4]).not.toContain(',caducado,');
  });

  it('defuses a name that would be a formula', () => {
    expect(rows[4]).toContain(',"\'=HYPERLINK(""x"")",');
  });

  it('never carries a uuid', () => {
    expect(csv).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-/);
  });
});

describe('the PDF', () => {
  const month = lines([
    row({}),
    row({ line_id: 'l2', is_reversal: true, line_gross: '-180.00', line_net: '-155.17', tax_amount: '-24.83' }),
    row({ kind: 'waste', document_id: WASTE_DOC, line_id: 'w1', waste_reason: 'caducado', line_gross: '840.00', line_net: '840.00', tax_amount: '0.00', variant_name: 'Pan <dulce> & más' }),
  ]);
  const html = monthHtml(month, '2026-09-01', '2026-10-01');

  it('is headed by the month', () => {
    expect(html).toContain('<h2>septiembre 2026</h2>');
  });

  it('draws the kinds in order, a section each', () => {
    const at = EXPORT_KINDS.map((kind) => html.indexOf(`<h3>${ES.monthExport.section[kind]}</h3>`));
    expect(at.every((one) => one >= 0)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
  });

  it('says a kind was empty rather than leaving it out', () => {
    expect(html).toContain(ES.monthExport.noneOfKind.purchase);
  });

  it('totals the sales net of the cancellation', () => {
    expect(html).toContain(`${ES.monthExport.kindTotal} <b>$0</b>`);
  });

  it('carries no money at all in the write-off section — área 9', () => {
    const waste = html.slice(html.indexOf(`<h3>${ES.monthExport.section.waste}</h3>`));
    expect(waste).not.toContain('$840');
    expect(waste).not.toContain(ES.monthExport.kindTotal);
    expect(waste).toContain(ES.waste.reason.caducado);
  });

  it('marks the cancellation in words, not by colour alone', () => {
    expect(html).toContain(ES.monthExport.reversalMark);
  });

  it('escapes a name a shopkeeper typed', () => {
    expect(html).toContain('Pan &lt;dulce&gt; &amp; más');
    expect(html).not.toContain('<dulce>');
  });

  it('fetches nothing — the shop is offline half the day', () => {
    expect(html).not.toMatch(/<link|<img|<script|https?:/);
  });

  it('says when it was made', () => {
    expect(html).toContain(`${ES.costs.fileMadeOn} 2026-10-01`);
  });
});
