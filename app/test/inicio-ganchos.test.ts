import { describe, expect, it } from 'vitest';

import { minutesUntil, nextPickup, untilLabel, type CollectionRequest } from '@/api/collection';
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
