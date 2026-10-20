import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { CatalogEntry } from '@/api/catalog';
import type { SaleHead, WasteHead } from '@/api/month';
import { salesFrom, type SalesRow } from '@/api/sales';
import { lastWeek, mondayOf, offersWeek, spoken, weekCompare, weekRange, weekStory } from '@/api/semana';
import { ES } from '@/strings';

// ============================================================================
// `8g`, round 4 (2026-10-20) — TU SEMANA, last week as four cards on Mondays.
// Every figure and sentence the story draws is decided here; nothing renders.
// ⚠️ AGAINST A CALENDAR ([[assert-against-a-calendar-not-the-array]]): Monday
// 19 October 2026, so last week is Monday the 12th to Sunday the 18th.
// ⚠️ A SALE'S DAY IS LOCAL, so the zone is pinned — the Mac is UTC−6 and CI is UTC.
// ============================================================================

const HOST_TZ = process.env.TZ;
beforeAll(() => {
  process.env.TZ = 'America/Mexico_City';
});
afterAll(() => {
  if (HOST_TZ === undefined) delete process.env.TZ;
  else process.env.TZ = HOST_TZ;
});

const MONDAY = '2026-10-19';
const FACTORS = { kg: '1000.000000', g: '1.000000', pza: '1.000000' };
const BASES = { kg: 'g', g: 'g', pza: 'pza' };
const ENTRIES = [
  { id: 'coca', name: 'Coca-Cola 600 ml', priceUnit: 'pza', baseUnit: 'pza' },
  { id: 'pan', name: 'Pan de caja', priceUnit: 'pza', baseUnit: 'pza' },
  { id: 'jitomate', name: 'Jitomate', priceUnit: 'kg', baseUnit: 'g' },
] as unknown as CatalogEntry[];

function row(day: string, variant: string, qty: string, gross: string): SalesRow {
  const e = ENTRIES.find((one) => one.id === variant)!;
  return {
    day,
    variant_id: variant,
    variant_name: e.name,
    family_id: 'f',
    family_name: 'Abarrotes',
    base_unit_code: e.baseUnit,
    qty_base_sold: qty,
    revenue_gross: gross,
  };
}

/** Every day from `from` to `to`, `gross` of Coca-Cola each — Fridays `friday`. */
function weeks(from: string, to: string, gross: number, friday = gross): SalesRow[] {
  const out: SalesRow[] = [];
  for (let at = Date.parse(`${from}T00:00:00Z`); at <= Date.parse(`${to}T00:00:00Z`); at += 86_400_000) {
    const day = new Date(at).toISOString().slice(0, 10);
    const amount = new Date(at).getUTCDay() === 5 ? friday : gross;
    out.push(row(day, 'coca', String(amount / 20), String(amount)));
  }
  return out;
}

const sale = (id: string, at: string): SaleHead => ({ id, occurred_at: at, reversal_of: null, total_net: '20.00', total_tax: '0.00' });

describe('which week, and when Inicio offers it', () => {
  it('last week is Monday to Sunday before this one', () => {
    expect(mondayOf('2026-10-21')).toBe(MONDAY);
    expect(mondayOf('2026-10-25')).toBe(MONDAY);
    expect(lastWeek('2026-10-21')).toEqual({ from: '2026-10-12', to: '2026-10-18' });
    expect(weekRange('2026-10-12', '2026-10-18')).toBe('12 al 18 de octubre');
    expect(weekRange('2026-09-28', '2026-10-04')).toBe('28 de septiembre al 4 de octubre');
  });

  it('Monday to Wednesday, when last week sold, until this phone opens it', () => {
    const { days } = salesFrom(weeks('2026-10-12', '2026-10-18', 100), BASES);
    expect(offersWeek(days, MONDAY, null)).toBe(true);
    expect(offersWeek(days, '2026-10-21', null)).toBe(true);
    expect(offersWeek(days, '2026-10-22', null)).toBe(false);
    expect(offersWeek(days, MONDAY, MONDAY)).toBe(false);
    expect(offersWeek(days, MONDAY, '2026-10-12')).toBe(true);
    expect(offersWeek(salesFrom(weeks('2026-10-01', '2026-10-11', 100), BASES).days, MONDAY, null)).toBe(false);
  });
});

describe('the story', () => {
  const sold = salesFrom(
    [
      ...weeks('2026-09-01', '2026-10-11', 400, 600),
      ...weeks('2026-10-12', '2026-10-18', 500, 900),
      row('2026-10-14', 'jitomate', '1500.000', '45.00'),
    ],
    BASES,
  ).days;

  it('what she sold, against the week before', () => {
    const s = weekStory(sold, null, null, ENTRIES, FACTORS, MONDAY);
    // Six days at $500, a Friday at $900 and a kilo and a half of jitomate.
    expect(s).toMatchObject({ from: '2026-10-12', to: '2026-10-18', centavos: 3945_00 });
    // The week before: six at $400 and a Friday at $600.
    expect(s?.compare).toBe(3945_00 - 3000_00);
    expect(weekCompare(s!)).toBe('$945 más que la semana pasada');
  });

  it('her strongest day, its sales, and whether it is her best of that weekday', () => {
    const rows = [sale('a', '2026-10-16T20:00:00Z'), sale('b', '2026-10-17T03:00:00Z'), sale('c', '2026-10-17T07:00:00Z')];
    // 03:00 UTC on the 17th is 21:00 on Friday the 16th; 07:00 UTC is 01:00 on Saturday.
    const s = weekStory(sold, rows, null, ENTRIES, FACTORS, MONDAY);
    expect(s?.best).toEqual({ day: '2026-10-16', centavos: 900_00, sales: 2, record: true });
    expect(ES.numbers.semana.bestDetail('$900', 2)).toBe('$900 en 2 ventas');
    expect(ES.numbers.semana.bestRecord('viernes')).toBe('Tu mejor viernes desde que usas Wera.');
  });

  it('not a record when an earlier Friday sold as much', () => {
    const flat = salesFrom([...weeks('2026-09-01', '2026-10-11', 400, 900), ...weeks('2026-10-12', '2026-10-18', 500, 900)], BASES).days;
    expect(weekStory(flat, null, null, ENTRIES, FACTORS, MONDAY)?.best.record).toBe(false);
  });

  it('the star by money, said the way a sentence says it', () => {
    const s = weekStory(sold, null, null, ENTRIES, FACTORS, MONDAY);
    expect(s?.star).toEqual({ id: 'coca', name: 'Coca-Cola 600 ml', quantity: '195 piezas' });
    expect(spoken('1 pza')).toBe('1 pieza');
    expect(spoken('1.500 kg')).toBe('1.500 kg');
  });

  it('what was thrown away most often, in its own unit, with a tip about her own shop', () => {
    const doc = (id: string, lines: [string, string, string][], reversal_of: string | null = null): WasteHead => ({
      id,
      occurred_at: '2026-10-14T18:00:00Z',
      reversal_of,
      waste_reason_line: lines.map(([variant_id, reason, qty_base]) => ({ variant_id, reason, qty_base })),
    });
    const waste = {
      rows: [
        doc('w1', [['pan', 'caducado', '4.000'], ['jitomate', 'dañado', '1500.000']]),
        doc('w2', [['pan', 'caducado', '2.000']]),
        doc('w3', [['jitomate', 'dañado', '800.000']]),
        doc('w4', [['jitomate', 'dañado', '900.000']]),
      ],
      // w4 was voided, so jitomate has two lines, as many as pan; the tie goes to the larger base quantity.
      reversals: [{ reversal_of: 'w4' }],
    };
    const s = weekStory(sold, null, waste, ENTRIES, FACTORS, MONDAY);
    expect(s?.thrown).toEqual({ name: 'Jitomate', quantity: '2.3 kg', reason: 'dañado' });
    expect(ES.numbers.semana.thrownBig('2.3 kg', 'Jitomate')).toBe('Se tiró 2.3 kg de Jitomate');
    const onlyPan = { rows: [doc('w2', [['pan', 'caducado', '6.000']])], reversals: [] };
    expect(weekStory(sold, null, onlyPan, ENTRIES, FACTORS, MONDAY)?.thrown).toEqual({
      name: 'Pan de caja',
      quantity: '6 piezas',
      reason: 'caducado',
    });
    expect(ES.numbers.semana.thrownTip('caducado')).toBe('Revisa las fechas al acomodar: lo más viejo, adelante.');
  });

  it('nothing thrown is said as such, and a week that sold nothing has no story', () => {
    expect(weekStory(sold, null, { rows: [], reversals: [] }, ENTRIES, FACTORS, MONDAY)?.thrown).toBeNull();
    expect(weekStory(salesFrom(weeks('2026-09-01', '2026-10-11', 400), BASES).days, null, null, ENTRIES, FACTORS, MONDAY)).toBeNull();
  });

  it('a shop that was not selling the week before has no comparison', () => {
    const young = salesFrom(weeks('2026-10-08', '2026-10-18', 500), BASES).days;
    expect(weekStory(young, null, null, ENTRIES, FACTORS, MONDAY)?.compare).toBeNull();
  });
});
