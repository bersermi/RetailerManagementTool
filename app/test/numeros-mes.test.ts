import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  HOURS_MIN_SALES,
  bestDay,
  compareLine,
  hoursLine,
  hoursOf,
  monthPurchases,
  monthSales,
  monthWaste,
  purchasesLine,
  shopAge,
  standing,
  wasteAmount,
  type PurchaseHead,
  type SaleHead,
  type WasteHead,
} from '@/api/month';
import type { SoldDay } from '@/api/sales';
import { ES } from '@/strings';

// ============================================================================
// `8g` (2026-10-20) — TU MES AND DESCUBRE, the owner's Números. Every figure the
// screen draws is decided here; nothing renders. 2026-10-20 is a Tuesday.
// ⚠️ THE HOURS ARE LOCAL, so the zone is pinned — the Mac is UTC−6 and CI is UTC
// ([[local-time-tests-need-a-pinned-tz]], and `api-today.test.ts`'s arrangement).
// ============================================================================

const HOST_TZ = process.env.TZ;
beforeAll(() => {
  process.env.TZ = 'America/Mexico_City';
});
afterAll(() => {
  if (HOST_TZ === undefined) delete process.env.TZ;
  else process.env.TZ = HOST_TZ;
});

const TODAY = '2026-10-20';

function sold(day: string, centavos: number): SoldDay {
  return {
    day,
    variantId: 'v',
    variantName: 'Coca-Cola 600 ml',
    familyId: 'f',
    familyName: 'Refrescos',
    baseUnit: 'pza',
    qty: 1000,
    centavos,
  };
}

/** Every day from `from` to `to` inclusive, at `centavos` each. */
function everyDay(from: string, to: string, centavos: number): SoldDay[] {
  const out: SoldDay[] = [];
  for (let at = Date.parse(`${from}T00:00:00Z`); at <= Date.parse(`${to}T00:00:00Z`); at += 86_400_000) {
    out.push(sold(new Date(at).toISOString().slice(0, 10), centavos));
  }
  return out;
}

describe('what stands', () => {
  it('leaves out a reversal and what it undid — in the window or after it', () => {
    const rows = [
      { id: 'a', occurred_at: '2026-10-02T15:00:00Z', reversal_of: null },
      { id: 'b', occurred_at: '2026-10-03T15:00:00Z', reversal_of: null },
      { id: 'c', occurred_at: '2026-10-04T15:00:00Z', reversal_of: null },
      { id: 'x', occurred_at: '2026-10-05T15:00:00Z', reversal_of: 'a' },
    ];
    expect(standing(rows, [{ reversal_of: 'b' }]).map((r) => r.id)).toEqual(['c']);
  });
});

describe('what the month sold, and against what', () => {
  it('the month under way is compared with the SAME days of the last one', () => {
    const days = [...everyDay('2026-08-01', '2026-09-30', 100_00), ...everyDay('2026-10-01', TODAY, 120_00)];
    const m = monthSales(days, '2026-10-01', TODAY);
    expect(m.centavos).toBe(20 * 120_00);
    expect(m.compare).toEqual({ centavos: 20 * 20_00, previous: '2026-09-01', sameDays: true });
    expect(compareLine(m)).toBe('$400 más que en los mismos días de septiembre');
  });

  it('a finished month is compared with the whole month before', () => {
    const days = [...everyDay('2026-08-01', '2026-08-31', 100_00), ...everyDay('2026-09-01', '2026-09-30', 90_00)];
    const m = monthSales(days, '2026-09-01', TODAY);
    expect(m.compare).toEqual({ centavos: 30 * 90_00 - 31 * 100_00, previous: '2026-08-01', sameDays: false });
    expect(compareLine(m)).toBe('$400 menos que agosto');
  });

  it('the 31st is compared with a 30-day month’s last day, never past it', () => {
    const days = [...everyDay('2026-09-01', '2026-09-30', 100_00), ...everyDay('2026-10-01', '2026-10-31', 100_00)];
    const m = monthSales(days, '2026-10-01', '2026-10-31');
    expect(m.compare?.centavos).toBe(31 * 100_00 - 30 * 100_00);
  });

  it('no comparison for a shop that was not selling through all of last month’s days', () => {
    const days = [...everyDay('2026-09-10', '2026-09-30', 100_00), ...everyDay('2026-10-01', TODAY, 100_00)];
    expect(monthSales(days, '2026-10-01', TODAY).compare).toBeNull();
    expect(compareLine(monthSales(days, '2026-10-01', TODAY))).toBe('');
  });

  it('an even month says so', () => {
    const days = [...everyDay('2026-08-01', '2026-08-31', 100_00), ...everyDay('2026-09-01', '2026-09-30', 100_00)];
    const m = monthSales([...days, sold('2026-09-30', 100_00)], '2026-09-01', TODAY);
    expect(compareLine(m)).toBe('Igual que agosto');
  });
});

describe('what the month bought', () => {
  const head = (id: string, provider: string, net: string, over: Partial<PurchaseHead> = {}): PurchaseHead => ({
    id,
    provider_id: provider,
    occurred_at: '2026-10-05T15:00:00Z',
    reversal_of: null,
    total_net: net,
    total_tax: '0.00',
    ...over,
  });
  const names: Record<string, string> = { chuy: 'Don Chuy', bimbo: 'Bimbo' };
  const nameOf = (id: string | null) => (id === null ? null : (names[id] ?? null));

  it('the deliveries that stand, their money, and who brought the most', () => {
    const p = monthPurchases(
      [head('1', 'chuy', '500.00'), head('2', 'bimbo', '300.00'), head('3', 'chuy', '200.00'), head('4', 'bimbo', '900.00')],
      [{ reversal_of: '4' }],
      nameOf,
    );
    expect(p).toEqual({ centavos: 1000_00, deliveries: 3, top: 'Don Chuy', suppliers: 2 });
    expect(purchasesLine(p!)).toBe('3 entregas · Don Chuy el que más');
  });

  it('one supplier is not called *the one who brought the most*', () => {
    const p = monthPurchases([head('1', 'chuy', '500.00')], [], nameOf);
    expect(purchasesLine(p!)).toBe('1 entrega');
  });

  it('an unreadable figure withholds the total rather than shrinking it', () => {
    expect(monthPurchases([head('1', 'chuy', 'n/a')], [], nameOf)?.centavos).toBeNull();
  });

  it('nothing read yet is not a month with nothing in it', () => {
    expect(monthPurchases(undefined, [], nameOf)).toBeNull();
    expect(purchasesLine(monthPurchases([], [], nameOf)!)).toBe(ES.numbers.mes.noPurchases);
  });
});

describe('what the month threw away', () => {
  const bases: Record<string, string> = { pan: 'pza', huevo: 'g', leche: 'ml' };
  const baseOf = (id: string) => bases[id] ?? null;
  const doc = (id: string, lines: [string, string, string][], over: Partial<WasteHead> = {}): WasteHead => ({
    id,
    occurred_at: '2026-10-05T15:00:00Z',
    reversal_of: null,
    waste_reason_line: lines.map(([variant_id, reason, qty_base]) => ({ variant_id, reason, qty_base })),
    ...over,
  });

  it('pieces, kilos and litres apart — never added — and the commonest cause', () => {
    const w = monthWaste(
      [
        doc('1', [['pan', 'caducado', '9.000'], ['huevo', 'dañado', '2400.000']]),
        doc('2', [['pan', 'caducado', '22.000']]),
        doc('3', [['leche', 'caducado', '1000.000']]),
        doc('4', [['pan', 'dañado', '50.000']]),
      ],
      [{ reversal_of: '4' }],
      baseOf,
    );
    expect(w).toEqual({ pieces: 31, kilos: 2.4, litres: 1, writeOffs: 3, topReason: 'caducado' });
    expect(wasteAmount(w!)).toBe('31 piezas, 2.4 kg y 1 L');
  });

  it('the cause most LINES were filed under — a voided write-off’s causes do not count', () => {
    const w = monthWaste(
      [
        doc('1', [['pan', 'dañado', '1.000'], ['huevo', 'dañado', '100.000']]),
        doc('2', [['pan', 'caducado', '1.000']]),
        doc('3', [['pan', 'caducado', '1.000'], ['pan', 'caducado', '1.000'], ['pan', 'caducado', '1.000']]),
      ],
      [{ reversal_of: '3' }],
      baseOf,
    );
    expect(w?.topReason).toBe('dañado');
  });

  it('one piece, and a month with nothing thrown', () => {
    expect(wasteAmount(monthWaste([doc('1', [['pan', 'caducado', '1.000']])], [], baseOf)!)).toBe('1 pieza');
    expect(wasteAmount(monthWaste([], [], baseOf)!)).toBe('Nada este mes');
  });
});

describe('a shop’s first week', () => {
  it('counts both ends, and nothing before the first sale', () => {
    expect(shopAge([sold('2026-10-18', 100), sold(TODAY, 100)], TODAY)).toBe(3);
    expect(shopAge([], TODAY)).toBeNull();
  });
});

describe('descubre — the hours', () => {
  const sale = (id: string, at: string, net = '100.00', reversal_of: string | null = null): SaleHead => ({
    id,
    occurred_at: at,
    reversal_of,
    total_net: net,
    total_tax: '0.00',
  });

  it('waits for enough sales, and says how many are missing', () => {
    expect(hoursOf([sale('1', '2026-10-19T01:00:00Z')])).toEqual({ locked: true, have: 1, need: HOURS_MIN_SALES });
  });

  it('the two LOCAL hours that sold the most money', () => {
    const rows: SaleHead[] = [];
    // 19:00 and 20:00 in Mexico City are 01:00 and 02:00 UTC the next day.
    for (let i = 0; i < 10; i += 1) rows.push(sale(`n${i}`, '2026-10-19T01:30:00Z', '150.00'));
    for (let i = 0; i < 10; i += 1) rows.push(sale(`m${i}`, '2026-10-19T02:30:00Z', '150.00'));
    for (let i = 0; i < 15; i += 1) rows.push(sale(`d${i}`, '2026-10-18T17:30:00Z', '50.00'));
    const h = hoursOf(rows);
    expect(h).toMatchObject({ locked: false, from: 19, sales: 35 });
    if (h === null || h.locked) throw new Error('unlocked');
    expect(h.bars.map((b) => b.hour)).toEqual([11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
    expect(hoursLine(h.from)).toBe('De 7 a 9 de la noche');
  });

  it('a voided sale is not a sale at that hour', () => {
    const rows: SaleHead[] = [];
    for (let i = 0; i < HOURS_MIN_SALES; i += 1) rows.push(sale(`s${i}`, '2026-10-18T17:30:00Z'));
    rows.push(sale('void', '2026-10-18T18:00:00Z', '-100.00', 's0'));
    expect(hoursOf(rows)).toEqual({ locked: true, have: HOURS_MIN_SALES - 1, need: HOURS_MIN_SALES });
  });

  it('says the hours the way a shopkeeper does', () => {
    expect(ES.numbers.descubre.hoursWindow(17, 19)).toBe('De 5 de la tarde a 7 de la noche');
    expect(ES.numbers.descubre.hoursWindow(11, 13)).toBe('De 11 de la mañana a 1 de la tarde');
    expect(ES.numbers.descubre.hoursWindow(12, 14)).toBe('De 12 a 2 de la tarde');
    expect(ES.numbers.descubre.hoursWindow(7, 9)).toBe('De 7 a 9 de la mañana');
  });
});

describe('descubre — the best day', () => {
  it('waits a week, and counts the days down', () => {
    expect(bestDay(everyDay('2026-10-18', TODAY, 100_00), TODAY)).toEqual({ locked: true, have: 2, need: 7 });
    expect(bestDay([], TODAY)).toEqual({ locked: true, have: 0, need: 7 });
  });

  it('the weekday with the best average, over the days that sold, today left out', () => {
    // Fridays sell 1,050, Mondays 640, everything else 700; Sundays are shut.
    const days = everyDay('2026-08-24', TODAY, 0).map((d) => {
      const dow = new Date(`${d.day}T00:00:00Z`).getUTCDay();
      const c = dow === 0 ? 0 : dow === 5 ? 1050_00 : dow === 1 ? 640_00 : 700_00;
      return { ...d, centavos: d.day === TODAY ? 99_999_00 : c };
    });
    const b = bestDay(days, TODAY);
    expect(b).toMatchObject({ locked: false, best: 5, bestCentavos: 1050_00, worst: 1, worstCentavos: 640_00 });
    if (b === null || b.locked) throw new Error('unlocked');
    expect(b.averages[0]).toBeNull();
  });

  it('an average is whole pesos — a sense of a day, not a receipt', () => {
    const days = everyDay('2026-09-01', TODAY, 0).map((d) => ({ ...d, centavos: d.day < '2026-10-01' ? 190_71 : 190_20 }));
    const b = bestDay(days, TODAY);
    if (b === null || b.locked) throw new Error('unlocked');
    for (const a of b.averages) if (a !== null) expect(a % 100).toBe(0);
  });

  it('names the day in the plural a shopkeeper uses', () => {
    expect(ES.numbers.descubre.dayBig('viernes')).toBe('Los viernes');
    expect(ES.numbers.descubre.dayBig('sábado')).toBe('Los sábados');
    expect(ES.numbers.descubre.dayBig('domingo')).toBe('Los domingos');
  });
});
