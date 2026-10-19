import { describe, expect, it } from 'vitest';

import { byDay, clockOf, dayHeading, rowTitle, type ShopDocument } from '@/api/documents';

// ============================================================================
// `8g` (2026-10-19) — LO ÚLTIMO BY DAY, THE OWNER'S OPTION A: the days in groups
// with what they add up to, each day's name, and what a closed line says. The
// screen draws these; nothing here renders. 2026-10-19 is a Monday.
// ============================================================================

const TODAY = '2026-10-19';

function doc(over: Partial<ShopDocument> = {}): ShopDocument {
  return {
    id: 'd-1',
    kind: 'sale',
    at: '2026-10-19T20:11:00',
    day: TODAY,
    counterparty: null,
    providerId: null,
    createdBy: null,
    cause: null,
    causeValue: null,
    amount: '$180',
    grossCentavos: 18000,
    lines: [{ id: 'l-1', name: 'Pan de caja', quantity: '2 pza', amount: '$96', reason: null }],
    ...over,
  } as unknown as ShopDocument;
}

describe('the days, newest first, and what each adds up to', () => {
  it('keeps the order it is given and groups by day', () => {
    const groups = byDay([
      doc({ id: 'a', grossCentavos: 18000 }),
      doc({ id: 'b', grossCentavos: 4500 }),
      doc({ id: 'c', day: '2026-10-18', grossCentavos: 35600 }),
    ]);
    expect(groups.map((g) => [g.day, g.documents.map((d) => d.id), g.grossCentavos])).toEqual([
      [TODAY, ['a', 'b'], 22500],
      ['2026-10-18', ['c'], 35600],
    ]);
  });

  it('withholds a day’s total when one figure could not be read — never a smaller one', () => {
    expect(byDay([doc({ id: 'a' }), doc({ id: 'b', grossCentavos: null })])[0]?.grossCentavos).toBeNull();
  });

  it('a write-off carries no money, so its day carries none', () => {
    expect(byDay([doc({ kind: 'waste', amount: null, grossCentavos: null })])[0]?.grossCentavos).toBeNull();
  });
});

describe('what a day is called', () => {
  it('Hoy and Ayer, then the weekday within the week, then the date', () => {
    expect(dayHeading(TODAY, TODAY)).toBe('Hoy');
    expect(dayHeading('2026-10-18', TODAY)).toBe('Ayer');
    expect(dayHeading('2026-10-16', TODAY)).toBe('viernes 16');
    expect(dayHeading('2026-10-13', TODAY)).toBe('martes 13');
    expect(dayHeading('2026-10-12', TODAY)).toBe('12 de octubre');
  });

  it('an unreadable day is shown as it came, never as a broken date', () => {
    expect(dayHeading('ayer', TODAY)).toBe('ayer');
  });
});

describe('the time and the closed line', () => {
  it('the clock time on this phone, and nothing for an instant it cannot read', () => {
    expect(clockOf('2026-10-19T20:11:00')).toBe('20:11');
    expect(clockOf('2026-10-19T07:05:00')).toBe('07:05');
    expect(clockOf('nunca')).toBe('');
  });

  it('a sale: its first product, and how many more', () => {
    expect(rowTitle(doc())).toEqual({ title: 'Pan de caja', subtitle: null });
    const three = doc({
      lines: [
        { id: '1', name: 'Pan de caja' },
        { id: '2', name: 'Huevo blanco' },
        { id: '3', name: 'Coca-Cola 600 ml' },
      ] as unknown as ShopDocument['lines'],
    });
    expect(rowTitle(three)).toEqual({ title: 'Pan de caja', subtitle: 'y 2 productos más' });
  });

  it('a delivery: who brought it first, and how many products', () => {
    const delivery = doc({
      kind: 'purchase',
      counterparty: 'Don Chuy',
      lines: [
        { id: '1', name: 'Huevo blanco' },
        { id: '2', name: 'Arroz a granel' },
      ] as unknown as ShopDocument['lines'],
    });
    expect(rowTitle(delivery)).toEqual({ title: 'Don Chuy', subtitle: '2 productos' });
    expect(rowTitle(doc({ kind: 'purchase', counterparty: 'Don Chuy' }))).toEqual({
      title: 'Don Chuy',
      subtitle: 'Pan de caja',
    });
  });

  it('the generic supplier heads its line with a capital — Costos writes it beside a name', () => {
    expect(rowTitle(doc({ kind: 'purchase', counterparty: 'compra directa' })).title).toBe('Compra directa');
  });

  it('a write-off: its product, and why', () => {
    expect(rowTitle(doc({ kind: 'waste', cause: 'Caducado', amount: null }))).toEqual({
      title: 'Pan de caja',
      subtitle: 'Caducado',
    });
  });
});
