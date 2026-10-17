import { describe, expect, it } from 'vitest';

import { minutesUntil, nextPickup, untilLabel, type CollectionRequest } from '@/api/collection';
import { weekSavings, weekStartOf, type SavingsLineRow } from '@/api/costs';
import { latestSales, type ShopDocument } from '@/api/documents';
import {
  STREAK_MILESTONES,
  bestSameWeekday,
  dayTotals,
  isStreakMilestone,
  lastSevenDays,
  salesStreak,
  type SoldDay,
} from '@/api/sales';
import { ES } from '@/strings';

// ============================================================================
// `8g` — THE OWNER'S INICIO OF 2026-10-16: the hooks he left switched on, as
// far as they have a right answer. *Tu mejor viernes*, *la racha*, *lo último
// en vivo* and *la próxima recolección*. The motion is the phone's (`R9`).
// 2026-10-16 is a Friday; the Fridays before it are 10-09, 10-02 and 09-25.
// ============================================================================

function sold(day: string, centavos: number, variantId = 'v'): SoldDay {
  return {
    day, variantId, variantName: 'Pechuga', familyId: 'f', familyName: 'Pollo',
    baseUnit: 'g', qty: 1000, centavos,
  };
}

const TODAY = '2026-10-16';

describe('8g — tu mejor viernes', () => {
  const days = [
    sold('2026-10-09', 200000), sold('2026-10-09', 45000, 'w'),
    sold('2026-10-02', 310000),
    sold('2026-09-25', 180000),
    sold('2026-10-15', 900000),
    sold('2026-10-16', 999900),
  ];

  it('sums a day across its products', () => {
    expect(dayTotals(days).get('2026-10-09')).toBe(245000);
  });

  it('is the best day with today\'s weekday, before today — never today, never a Thursday', () => {
    expect(bestSameWeekday(days, TODAY)).toBe(310000);
  });

  it('is nothing for a weekday the shop has never sold on', () => {
    expect(bestSameWeekday(days, '2026-10-18')).toBeNull();
    expect(bestSameWeekday([], TODAY)).toBeNull();
    expect(bestSameWeekday(days, 'hoy')).toBeNull();
  });
});

describe('8g — la racha', () => {
  const run = ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15'].map((d) => sold(d, 1000));

  it('counts days in a row, ending today when today has sold', () => {
    expect(salesStreak(run, TODAY, true)).toBe(5);
  });

  it('⚠️ is not broken in the morning: before the first sale it ends yesterday', () => {
    expect(salesStreak(run, TODAY, false)).toBe(4);
  });

  it('stops at the first day without a sale, and a zero day is not a sale', () => {
    const gap = [...run, sold('2026-10-10', 1000), sold('2026-10-11', 0)];
    expect(salesStreak(gap, TODAY, true)).toBe(5);
    expect(salesStreak([], TODAY, false)).toBe(0);
  });

  it('draws the last seven days, oldest first and today last', () => {
    expect(lastSevenDays(run, TODAY, true)).toEqual([false, false, true, true, true, true, true]);
    expect(lastSevenDays(run, TODAY, false)).toEqual([false, false, true, true, true, true, false]);
  });

  it('celebrates at 7, 30 and 100 days, and only then', () => {
    expect([...STREAK_MILESTONES]).toEqual([7, 30, 100]);
    expect(isStreakMilestone(7) && isStreakMilestone(30) && isStreakMilestone(100)).toBe(true);
    expect(isStreakMilestone(8) || isStreakMilestone(0)).toBe(false);
    expect(ES.home.streak.days(1)).toBe('1 día seguido');
    expect(ES.home.streak.days(12)).toBe('12 días seguidos');
  });
});

function doc(id: string, at: string, names: readonly string[], gross: number | null, kind: ShopDocument['kind'] = 'sale'): ShopDocument {
  return {
    id, kind, at, day: at.slice(0, 10), counterparty: null, providerId: null, createdBy: null,
    cause: null, causeValue: null, amount: null, grossCentavos: gross,
    lines: names.map((name, i) => ({ id: `${id}-${i}`, variantId: `v${i}`, name } as ShopDocument['lines'][number])),
  };
}

describe('8g — lo último, en vivo', () => {
  const docs = [
    doc('a', '2026-10-16T19:31:00Z', ['Huevo'], 3800),
    doc('b', '2026-10-16T19:38:00Z', ['Pechuga', 'Alas', 'Molleja'], 15700),
    doc('c', '2026-10-16T19:22:00Z', ['Alas'], 4500),
    doc('d', '2026-10-16T18:00:00Z', ['Pollo entero'], 13000),
    doc('p', '2026-10-16T19:50:00Z', ['Huevo'], 90000, 'purchase'),
  ];

  it('is the three newest sales, newest first, and never a delivery', () => {
    expect(latestSales(docs).map((r) => r.id)).toEqual(['b', 'a', 'c']);
  });

  it('names the first product and how many more', () => {
    expect(latestSales(docs)[0]!.title).toBe('Pechuga y 2 más');
    expect(latestSales(docs)[1]!.title).toBe('Huevo');
    expect(latestSales(docs)[0]!.grossCentavos).toBe(15700);
  });

  it('draws an hour and minute for each', () => {
    expect(latestSales(docs)[0]!.time).toMatch(/^[0-9]{2}:[0-9]{2}$/);
  });
});

function req(over: Partial<CollectionRequest>): CollectionRequest {
  return {
    id: 'r', status: 'enviada', day: '2026-10-17', from: '09:45', to: '10:00', lines: [],
    photoCount: 0, note: null, createdAt: '2026-10-16T18:00:00Z', cancellable: true, ...over,
  };
}

describe('8g — la próxima recolección', () => {
  it('is the soonest pickup still to come, sent or confirmed', () => {
    const list = [
      req({ id: 'late', day: '2026-10-18', from: '07:00' }),
      req({ id: 'soon', day: '2026-10-17', from: '09:45', status: 'confirmada' }),
      req({ id: 'gone', day: '2026-10-16', from: '09:00' }),
      req({ id: 'off', day: '2026-10-16', from: '18:00', status: 'cancelada' }),
      req({ id: 'no', day: '2026-10-16', from: '18:30', status: 'rechazada' }),
    ];
    expect(nextPickup(list, TODAY, '13:40')?.id).toBe('soon');
  });

  it('is nothing when nothing is still to come — and then Inicio draws no card', () => {
    expect(nextPickup([req({ day: '2026-10-16', from: '09:00' })], TODAY, '13:40')).toBeNull();
    expect(nextPickup([], TODAY, '13:40')).toBeNull();
  });

  it('says how long until it the way a person does', () => {
    expect(minutesUntil('2026-10-17', '09:45', TODAY, '13:40')).toBe(20 * 60 + 5);
    expect(untilLabel(20 * 60 + 5)).toBe('faltan 20 h');
    expect(untilLabel(45)).toBe('faltan 45 min');
    expect(untilLabel(3 * 24 * 60)).toBe('faltan 3 días');
  });
});

function line(id: string, at: string, price: string, qty: string, over: Partial<SavingsLineRow['purchase']> = {}, variant = 'huevo'): SavingsLineRow {
  return {
    id, variant_id: variant, qty_base: qty, unit_price_net_per_base: price,
    purchase: { id: `p-${id}`, occurred_at: at, provider_id: 'don-chuy', reversal_of: null, ...over },
  };
}

describe('8g — ahorro en compras: this week, cheaper than the time before', () => {
  // ⚠️ AN EXPLICIT INSTANT, so the suite reads the same on this Mac and on CI.
  const monday = new Date('2026-10-12T06:00:00Z');

  it('counts the pesos a delivery cost less than the previous one, per kilo times kilos', () => {
    // $100/kg last week, $90/kg this week, 2 kg: $20.
    const rows = [
      line('a', '2026-10-08T15:00:00Z', '0.100000', '2000.000'),
      line('b', '2026-10-14T15:00:00Z', '0.090000', '2000.000'),
    ];
    expect(weekSavings(rows, monday)).toBe(2000);
  });

  it('saves nothing when the price went up, or came from another supplier', () => {
    expect(weekSavings([
      line('a', '2026-10-08T15:00:00Z', '0.090000', '2000.000'),
      line('b', '2026-10-14T15:00:00Z', '0.100000', '2000.000'),
    ], monday)).toBe(0);
    expect(weekSavings([
      line('a', '2026-10-08T15:00:00Z', '0.100000', '2000.000', { provider_id: 'otro' }),
      line('b', '2026-10-14T15:00:00Z', '0.090000', '2000.000'),
    ], monday)).toBe(0);
  });

  it('counts a cheaper delivery after an earlier one THIS week too, and nothing before the week', () => {
    expect(weekSavings([
      line('a', '2026-10-13T15:00:00Z', '0.100000', '1000.000'),
      line('b', '2026-10-15T15:00:00Z', '0.095000', '1000.000'),
    ], monday)).toBe(500);
    expect(weekSavings([
      line('a', '2026-10-01T15:00:00Z', '0.100000', '1000.000'),
      line('b', '2026-10-08T15:00:00Z', '0.050000', '1000.000'),
    ], monday)).toBe(0);
  });

  it('⚠️ a voided delivery is neither a saving nor a previous price — Costos\' rule', () => {
    const rows = [
      line('a', '2026-10-08T15:00:00Z', '0.100000', '2000.000'),
      line('b', '2026-10-14T15:00:00Z', '0.090000', '2000.000'),
      line('v', '2026-10-14T16:00:00Z', '0.090000', '2000.000', { id: 'p-void', reversal_of: 'p-b' }),
    ];
    expect(weekSavings(rows, monday)).toBe(0);
  });

  it('reads the order off the instants, whatever order the rows come in', () => {
    const rows = [
      line('b', '2026-10-14T15:00:00Z', '0.090000', '2000.000'),
      line('a', '2026-10-08T15:00:00Z', '0.100000', '2000.000'),
    ];
    expect(weekSavings(rows, monday)).toBe(2000);
  });

  it('skips a line that will not parse rather than counting it as zero', () => {
    expect(weekSavings([
      line('a', '2026-10-08T15:00:00Z', '0.100000', '2000.000'),
      line('b', '2026-10-14T15:00:00Z', 'no', '2000.000'),
    ], monday)).toBe(0);
  });

  it('starts the week on Monday at the phone\'s midnight', () => {
    const start = weekStartOf(new Date(2026, 9, 16, 13, 40));
    expect([start.getDay(), start.getDate(), start.getHours(), start.getMinutes()]).toEqual([1, 12, 0, 0]);
    const sunday = weekStartOf(new Date(2026, 9, 18, 22, 0));
    expect(sunday.getDate()).toBe(12);
    const monday0 = weekStartOf(new Date(2026, 9, 19, 0, 5));
    expect(monday0.getDate()).toBe(19);
  });

  it('says the owner\'s sentence, light and capitalised', () => {
    expect(ES.home.savings.line).toBe('Esta semana, comprando más barato que la vez pasada.');
  });
});
