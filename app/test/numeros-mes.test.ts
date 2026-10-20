import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  HOURS_MIN_SALES,
  bestDay,
  compareLine,
  hoursLine,
  hoursOf,
  isQuincena,
  monthPurchases,
  monthSales,
  monthWaste,
  purchasesLine,
  quincenaLine,
  quincenaOf,
  quincenaWay,
  quincenaWhen,
  shopAge,
  standing,
  ticketOf,
  dayWords,
  risesOf,
  yearOf,
  YEAR_MIN_DAYS,
  type RiseRow,
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

describe('descubre — the quincena (round 2)', () => {
  /** Every day since 24 August: `q` on a quincena day, `o` on any other, and today absurd. */
  const months = (q: number, o: number): SoldDay[] =>
    everyDay('2026-08-24', TODAY, 0).map((d) => ({
      ...d,
      centavos: d.day === TODAY ? 99_999_00 : isQuincena(d.day) ? q : o,
    }));

  it('is the 15th and 16th, and the 30th to the 1st — February ends on its last day', () => {
    for (const day of ['2026-10-15', '2026-10-16', '2026-10-30', '2026-10-31', '2026-11-01', '2026-02-28', '2028-02-29']) {
      expect(isQuincena(day), day).toBe(true);
    }
    for (const day of ['2026-10-14', '2026-10-17', '2026-10-29', '2026-11-02', '2026-02-27', '2028-02-28']) {
      expect(isQuincena(day), day).toBe(false);
    }
  });

  it('waits for both paydays, and says the date it opens', () => {
    // Open since the 2nd: the 15th and 16th are in, no month end yet. The 30th
    // and 31st make four — so it opens after the 31st.
    const q = quincenaOf(everyDay('2026-10-02', TODAY, 500_00), TODAY);
    expect(q).toMatchObject({ locked: true, have: 2, need: 4, after: '2026-10-31' });
    if (!q.locked) throw new Error('locked');
    expect(quincenaWhen(q, TODAY)).toBe('Después del 31');
    expect(quincenaWhen({ ...q, after: TODAY }, TODAY)).toBe('Mañana');
  });

  it('a shop that has sold nothing waits for the 15th of next month', () => {
    // From the 20th: 30, 31 and 1 are three days of one payday; the 15th brings the other.
    const q = quincenaOf([], TODAY);
    expect(q).toMatchObject({ locked: true, have: 0, after: '2026-11-15' });
    if (!q.locked) throw new Error('locked');
    // On the 20th, *después del 15* would be ambiguous — the month is named.
    expect(quincenaWhen(q, TODAY)).toBe('Después del 15 de noviembre');
  });

  it('in pesos a day, never a percentage', () => {
    const q = quincenaOf(months(1500_00, 1000_00), TODAY);
    if (q.locked) throw new Error('unlocked');
    expect(q).toMatchObject({ quincenaCentavos: 1500_00, otherCentavos: 1000_00 });
    expect(quincenaLine(q)).toBe('En quincena vendes $500 más al día');
    expect(ES.numbers.descubre.quincenaDetail('$1,500', '$1,000')).toBe('Un día de quincena: $1,500. Otro día: $1,000.');
    expect(q.byDate[14]).toBe(1500_00);
    expect(q.byDate[1]).toBe(1000_00);
    expect(q.byDate).toHaveLength(31);
  });

  it('under a tenth of an ordinary day is *casi igual*; below it says *menos*', () => {
    const same = quincenaOf(months(1050_00, 1000_00), TODAY);
    if (same.locked) throw new Error('unlocked');
    expect(quincenaWay(same)).toBe('igual');
    expect(quincenaLine(same)).toBe('En quincena vendes casi igual');
    const less = quincenaOf(months(700_00, 1000_00), TODAY);
    if (less.locked) throw new Error('unlocked');
    expect(quincenaLine(less)).toBe('En quincena vendes $300 menos al día');
    expect(ES.numbers.descubre.quincenaTip('menos')).not.toBe(ES.numbers.descubre.quincenaTip('mas'));
  });

  it('a day she was shut is no day of zero, and today is left out', () => {
    const days = months(1500_00, 1000_00).map((d) =>
      new Date(`${d.day}T00:00:00Z`).getUTCDay() === 0 ? { ...d, centavos: 0 } : d,
    );
    const q = quincenaOf(days, TODAY);
    if (q.locked) throw new Error('unlocked');
    expect(q).toMatchObject({ quincenaCentavos: 1500_00, otherCentavos: 1000_00 });
    expect(q.byDate[19]).not.toBe(99_999_00);
  });
});

describe('descubre — what each customer leaves (round 2)', () => {
  const sale = (id: string, at: string, net: string, reversal_of: string | null = null): SaleHead => ({
    id,
    occurred_at: at,
    reversal_of,
    total_net: net,
    total_tax: '0.00',
  });
  /** `n` sales of `net` at noon, Mexico City, on `day`. */
  const many = (prefix: string, n: number, day: string, net: string): SaleHead[] =>
    Array.from({ length: n }, (_, i) => sale(`${prefix}${i}`, `${day}T18:00:00Z`, net));

  it('the last two weeks against the two before, in whole pesos', () => {
    const t = ticketOf([...many('a', 20, '2026-10-15', '40.00'), ...many('b', 20, '2026-09-30', '30.00')], TODAY);
    expect(t).toEqual({ locked: false, centavos: 40_00, sales: 20, biggest: 40_00, before: 30_00 });
    expect(ES.numbers.descubre.ticketBig('$40')).toBe('$40 en promedio');
    expect(ES.numbers.descubre.ticketDetail(20, '$40')).toBe('20 ventas en estas 2 semanas. La más grande: $40.');
  });

  it('the two weeks are the SHOP’S days: 9 at night on the 6th is not the 7th', () => {
    // 03:00 UTC on the 7th is 21:00 on the 6th in Mexico City — the half before.
    const rows = [...many('a', 20, '2026-10-15', '40.00'), sale('late', '2026-10-07T03:00:00Z', '1000.00')];
    expect(ticketOf(rows, TODAY)).toMatchObject({ sales: 20, biggest: 40_00, before: null });
  });

  it('a voided sale is no customer', () => {
    const rows = [...many('a', 20, '2026-10-15', '40.00'), sale('v', '2026-10-15T19:00:00Z', '-40.00', 'a0')];
    expect(ticketOf(rows, TODAY)).toEqual({ locked: true, have: HOURS_MIN_SALES - 1, need: HOURS_MIN_SALES });
  });

  it('an average is whole pesos, and too few sales before says nothing about before', () => {
    const rows = [...many('a', 10, '2026-10-15', '33.33'), ...many('b', 10, '2026-10-16', '33.34'), ...many('c', 5, '2026-09-30', '10.00')];
    const t = ticketOf(rows, TODAY);
    if (t === null || t.locked) throw new Error('unlocked');
    expect(t.centavos).toBe(33_00);
    expect(t.before).toBeNull();
  });
});

describe('descubre — what went up, with her own products (round 3)', () => {
  const FACTORS = { kg: '1000.000000', g: '1.000000', pza: '1.000000' };
  const HUEVO = { id: 'huevo', name: 'Huevo blanco', priceUnit: 'kg' };
  const QUESO = { id: 'queso', name: 'Queso Oaxaca', priceUnit: 'kg' };
  const COCA = { id: 'coca', name: 'Coca-Cola 600 ml', priceUnit: 'pza' };
  const ENTRIES = [HUEVO, QUESO, COCA];
  /** A delivery price per BASE unit, as the view sends it: a kilo of egg is grams. */
  const row = (variant_id: string, day: string, perBase: string): RiseRow => ({ variant_id, day, price: perBase });

  it('waits for one product bought on two days, and counts the purchases', () => {
    expect(risesOf([], ENTRIES, FACTORS)).toEqual({ locked: true, have: 0, need: 2 });
    expect(risesOf([row('huevo', '2026-10-01', '0.0330000000')], ENTRIES, FACTORS)).toEqual({ locked: true, have: 1, need: 2 });
    expect(ES.numbers.pronto.risesWhen(1)).toBe('Te falta 1 compra del mismo producto');
  });

  it('per the product\'s own unit, the most against what it cost first, said in pesos', () => {
    const rows = [
      row('huevo', '2026-06-03', '0.0330000000'), // $33 a kilo
      row('huevo', '2026-10-10', '0.0380000000'), // $38: +$5 on $33
      row('queso', '2026-06-05', '0.3000000000'), // $300 a kilo
      row('queso', '2026-10-11', '0.3080000000'), // $308: +$8 on $300
      row('coca', '2026-07-01', '14.0000000000'),
      row('coca', '2026-10-01', '13.5000000000'), // went DOWN: not named
    ];
    const r = risesOf(rows, ENTRIES, FACTORS);
    if (r === null || r.locked) throw new Error('unlocked');
    expect(r.top.map((one) => [one.name, one.from, one.to, one.since])).toEqual([
      ['Huevo blanco', 33_00, 38_00, '2026-06-03'],
      ['Queso Oaxaca', 300_00, 308_00, '2026-06-05'],
    ]);
    expect(r.since).toBe('2026-06-03');
    expect(ES.numbers.descubre.risesBig('Huevo blanco', '$5', ES.numbers.descubre.perUnit('kg'))).toBe('Huevo blanco: +$5 el kilo');
    expect(ES.numbers.descubre.risesDetail('$33', '$38', dayWords('2026-06-03'))).toBe('Lo comprabas a $33 el 3 de junio; ahora, a $38.');
  });

  it('nothing up is said as such, not hidden', () => {
    const rows = [row('coca', '2026-07-01', '14.0000000000'), row('coca', '2026-10-01', '14.0000000000')];
    expect(risesOf(rows, ENTRIES, FACTORS)).toEqual({ locked: false, top: [], since: '2026-07-01' });
    expect(ES.numbers.descubre.risesNoneDetail(dayWords('2026-07-01'))).toBe('Desde el 1 de julio, lo que compras te cuesta igual o menos.');
  });

  it('a product this phone cannot price per its unit is left out, never read per gram', () => {
    const rows = [row('caja', '2026-07-01', '1'), row('caja', '2026-10-01', '2')];
    expect(risesOf(rows, [{ id: 'caja', name: 'Caja', priceUnit: 'caja' }], FACTORS)).toEqual({ locked: true, have: 0, need: 2 });
  });
});

describe('descubre — the squares (round 3)', () => {
  it('waits four weeks', () => {
    expect(yearOf(everyDay('2026-10-01', TODAY, 100_00), TODAY)).toEqual({ locked: true, have: 20, need: YEAR_MIN_DAYS });
  });

  it('a column per week from the Monday before her first sale, four shades by her own quarters', () => {
    // First sale Wednesday 2 September; Sundays shut; sales climb through the weeks.
    const days = everyDay('2026-09-02', TODAY, 0).map((d, i) => ({
      ...d,
      centavos: new Date(`${d.day}T00:00:00Z`).getUTCDay() === 0 ? 0 : 100_00 + i * 10_00,
    }));
    const y = yearOf(days, TODAY);
    if (y.locked) throw new Error('unlocked');
    // 31 August (Monday) to Sunday 25 October: eight weeks.
    expect(y.weeks).toHaveLength(8);
    expect(y.weeks[0]!.slice(0, 2)).toEqual([null, null]);
    expect(y.weeks[0]![6]).toBe(0);
    expect(y.weeks[7]!.slice(2)).toEqual([null, null, null, null, null]);
    const shades = new Set(y.weeks.flat().filter((c): c is number => c !== null && c > 0));
    expect([...shades].sort()).toEqual([1, 2, 3, 4]);
    expect(y.weeks[1]![2]! <= y.weeks[6]![2]!).toBe(true);
    // The first column starts on 31 August: *Ago* would sit on top of *Sep*, so
    // the first column names September, whose 1st it holds.
    expect(y.months).toEqual([
      { column: 0, name: 'Sep' },
      { column: 4, name: 'Oct' },
    ]);
  });
});
