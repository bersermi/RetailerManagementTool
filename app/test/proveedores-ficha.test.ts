import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { PurchaseHead } from '@/api/month';
import {
  activityLine,
  activityOf,
  broughtOf,
  callUrl,
  chatUrl,
  rankedProviders,
  whatsappNumber,
  type SupplierLine,
} from '@/api/providerPage';
import { ES } from '@/strings';

// ============================================================================
// `8g` (2026-10-20) — A SUPPLIER'S PAGE, the owner's option A: when she last came,
// this month's deliveries, what she brings and how its price moved, and the two
// ways to reach her. Every figure is decided here; nothing renders.
// ⚠️ A DELIVERY'S DAY IS LOCAL, so the zone is pinned — the Mac is UTC−6 and CI
// is UTC. 2026-10-20 is a Tuesday.
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
const money = (c: number) => `$${c / 100}`;

const head = (id: string, provider: string | null, at: string, net: string, reversal_of: string | null = null): PurchaseHead => ({
  id,
  provider_id: provider,
  occurred_at: at,
  reversal_of,
  total_net: net,
  total_tax: '0.00',
});

describe('the list: when she last came, and this month', () => {
  const heads = [
    head('a', 'chuy', '2026-10-17T16:00:00Z', '1500.00'),
    head('b', 'chuy', '2026-10-02T16:00:00Z', '1530.00'),
    head('c', 'bimbo', '2026-09-28T16:00:00Z', '800.00'),
    head('d', 'bimbo', '2026-10-19T16:00:00Z', '400.00'),
    head('void', 'bimbo', '2026-10-19T18:00:00Z', '-400.00', 'd'),
    // 02:00 UTC on the 1st is 20:00 on 30 September in Mexico City: last month.
    head('e', 'sabritas', '2026-10-01T02:00:00Z', '300.00'),
  ];
  // ⚠️ COMPUTED INSIDE EACH TEST AND NEVER AT `describe` SCOPE: collection runs
  // BEFORE `beforeAll` pins the zone, so on CI (UTC) 8 at night on the 30th was
  // read as the 1st — red there, green on the Mac ([[local-time-tests-need-a-pinned-tz]]).
  const act = () => activityOf(heads, [], TODAY);

  it('a cancelled delivery is no visit and no money', () => {
    expect(act().get('bimbo')).toEqual({ lastDay: '2026-09-28', monthCentavos: 0, monthDeliveries: 0 });
  });

  it('the month is the shop’s: 8 at night on the 30th is September', () => {
    expect(act().get('sabritas')).toEqual({ lastDay: '2026-09-30', monthCentavos: 0, monthDeliveries: 0 });
    expect(act().get('chuy')).toEqual({ lastDay: '2026-10-17', monthCentavos: 3030_00, monthDeliveries: 2 });
  });

  it('says it the way a person does, with nothing to explain', () => {
    expect(activityLine(act().get('chuy'), TODAY, money)).toBe('Hace 3 días · $3030 este mes');
    expect(activityLine(act().get('bimbo'), TODAY, money)).toBe('Hace 3 semanas');
    expect(activityLine(undefined, TODAY, money)).toBe('');
    expect(ES.providers.page.ago(0)).toBe('hoy');
    expect(ES.providers.page.ago(1)).toBe('ayer');
    expect(ES.providers.page.ago(45)).toBe('hace más de un mes');
  });

  it('the generic row first, then who sold the most this month, then the most recent, then by name', () => {
    const p = (id: string, name: string, isGeneric = false) => ({ id, name, isGeneric });
    const order = rankedProviders(
      [p('abarrotera', 'Abarrotera'), p('bimbo', 'Bimbo'), p('chuy', 'Don Chuy'), p('gen', 'Genérico', true), p('sabritas', 'Sabritas')],
      act(),
    ).map((x) => x.id);
    expect(order).toEqual(['gen', 'chuy', 'sabritas', 'bimbo', 'abarrotera']);
  });
});

describe('her page: what she brings, and how its price moved', () => {
  const FACTORS = { kg: '1000.000000', g: '1.000000', pza: '1.000000' };
  const ENTRIES = [
    { id: 'huevo', name: 'Huevo blanco', priceUnit: 'kg' },
    { id: 'coca', name: 'Coca-Cola 600 ml', priceUnit: 'pza' },
    { id: 'frijol', name: 'Frijol negro a granel', priceUnit: 'kg' },
  ];
  const line = (id: string, variant: string, perBase: string, doc: string, at: string, reversal_of: string | null = null): SupplierLine => ({
    id,
    variant_id: variant,
    unit_price_net_per_base: perBase,
    purchase: { id: doc, occurred_at: at, provider_id: 'chuy', reversal_of },
  });

  it('the last price per the product’s own unit, and the move against the delivery before', () => {
    const b = broughtOf(
      [
        line('1', 'huevo', '0.038000', 'p2', '2026-10-17T16:00:00Z'),
        line('2', 'huevo', '0.033000', 'p1', '2026-08-25T16:00:00Z'),
        line('3', 'coca', '14.500000', 'p2', '2026-10-17T16:00:00Z'),
        line('4', 'frijol', '0.025000', 'p2', '2026-10-17T16:00:00Z'),
        line('5', 'frijol', '0.026000', 'p1', '2026-08-25T16:00:00Z'),
      ],
      ENTRIES,
      FACTORS,
    );
    expect(b?.map((x) => [x.name, x.last, x.change])).toEqual([
      ['Coca-Cola 600 ml', 14_50, null],
      ['Frijol negro a granel', 25_00, -1_00],
      ['Huevo blanco', 38_00, 5_00],
    ]);
    expect(ES.providers.page.broughtLast('$38', ES.numbers.descubre.perUnit('kg'))).toBe('La última vez: $38 el kilo');
    expect(ES.providers.page.change(5_00, '$5')).toBe('+$5');
    expect(ES.providers.page.change(-1_00, '$1')).toBe('−$1');
  });

  it('a cancelled delivery, and its cancellation, are no price', () => {
    const b = broughtOf(
      [
        line('1', 'huevo', '0.050000', 'bad', '2026-10-18T16:00:00Z'),
        line('2', 'huevo', '0.050000', 'undo', '2026-10-18T17:00:00Z', 'bad'),
        line('3', 'huevo', '0.038000', 'good', '2026-10-17T16:00:00Z'),
      ],
      ENTRIES,
      FACTORS,
    );
    expect(b?.map((x) => [x.last, x.change])).toEqual([[38_00, null]]);
  });

  it('two lines of one product in one delivery count once, the higher', () => {
    const b = broughtOf(
      [line('1', 'coca', '14.000000', 'p', '2026-10-17T16:00:00Z'), line('2', 'coca', '15.000000', 'p', '2026-10-17T16:00:00Z')],
      ENTRIES,
      FACTORS,
    );
    expect(b?.map((x) => [x.last, x.change])).toEqual([[15_00, null]]);
  });

  it('a product this phone cannot price per its unit is left out, never read per gram', () => {
    expect(broughtOf([line('1', 'caja', '1', 'p', '2026-10-17T16:00:00Z')], [{ id: 'caja', name: 'Caja', priceUnit: 'caja' }], FACTORS)).toEqual([]);
    expect(broughtOf(null, ENTRIES, FACTORS)).toBeNull();
  });
});

describe('reaching her', () => {
  it('a Mexican ten-digit number gets its 52 for WhatsApp; one written with it is kept', () => {
    expect(whatsappNumber('55 1234 5678')).toBe('525512345678');
    expect(whatsappNumber('+52 55 1234-5678')).toBe('525512345678');
    expect(whatsappNumber('')).toBeNull();
    expect(chatUrl('55 1234 5678')).toBe('https://wa.me/525512345678');
    expect(callUrl('55 1234-5678')).toBe('tel:5512345678');
    expect(callUrl(null)).toBeNull();
  });
});
