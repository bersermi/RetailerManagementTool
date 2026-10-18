import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import type { CatalogEntry, UnitFactors, UnitRow } from '@/api/catalog';
import { familyPatch } from '@/api/catalogEdit';
import type { Costs } from '@/api/costs';
import {
  aislesFor,
  aislesOf,
  bestWeekdayOf,
  boughtWhen,
  earningsAt,
  inAisle,
  lastCostOf,
  perHundred,
  siblingsOf,
  weekOfProduct,
} from '@/api/productPage';
import type { SoldDay } from '@/api/sales';
import { ES } from '@/strings';

// ============================================================================
// `8g` — PRODUCTOS REDRAWN, the owner's rulings of 2026-10-17: option D (the
// aisles across the top, list or mosaic), a page per product, and his one hook,
// what a new price would earn as it is typed. 2026-10-16 is a Friday.
// ============================================================================

const FACTORS: UnitFactors = { g: '1.000000', kg: '1000.000000', pza: '1.000000' };
const UNITS: readonly UnitRow[] = [
  { code: 'g', dimension: 'mass', base_code: 'g', factor_to_base: '1.000000', display_order: 1 },
  { code: 'kg', dimension: 'mass', base_code: 'g', factor_to_base: '1000.000000', display_order: 2 },
  { code: 'pza', dimension: 'count', base_code: 'pza', factor_to_base: '1.000000', display_order: 3 },
] as unknown as readonly UnitRow[];

function entry(over: Partial<CatalogEntry> = {}): CatalogEntry {
  return {
    prebuilt: false,
    id: 'coca-600',
    name: 'Coca-Cola 600 ml',
    familyId: 'refrescos',
    familyName: 'Refrescos',
    priceUnit: 'pza',
    baseUnit: 'pza',
    centavos: 2000,
    perBase: '20.000000',
    price: '$20 / pza',
    initials: 'CC',
    term: 'coca-cola 600 ml refrescos',
    ...over,
  };
}

const SHOP: readonly CatalogEntry[] = [
  entry(),
  entry({ id: 'pepsi', name: 'Pepsi 600 ml', initials: 'PE' }),
  entry({ id: 'sprite', name: 'Sprite 600 ml', initials: 'SP' }),
  entry({ id: 'lala', name: 'Leche Lala 1 l', familyId: 'lacteos', familyName: 'Lácteos', initials: 'LL' }),
  entry({ id: 'arroz', name: 'Arroz a granel', familyId: 'basicos', familyName: 'Básicos', priceUnit: 'kg', baseUnit: 'g', initials: 'AG' }),
  entry({ id: 'frijol', name: 'Frijol negro', familyId: 'basicos', familyName: 'Básicos', priceUnit: 'kg', baseUnit: 'g', initials: 'FN' }),
  entry({ id: 'jamaica', name: 'Agua de jamaica', familyId: 'aguas', familyName: 'Aguas frescas', initials: 'AJ' }),
];

describe('8g — the aisles across the top (option D)', () => {
  it('is every family the shop sells in, alphabetical with accents folded, each with its count', () => {
    expect(aislesOf(SHOP).map((a) => [a.name, a.count])).toEqual([
      ['Aguas frescas', 1],
      ['Básicos', 2],
      ['Lácteos', 1],
      ['Refrescos', 3],
    ]);
    expect(aislesOf(SHOP).find((a) => a.familyId === 'aguas')?.initials).toBe('AF');
  });

  it('filters the list to one aisle, and «Todo» is every product', () => {
    expect(inAisle(SHOP, 'refrescos').map((e) => e.id)).toEqual(['coca-600', 'pepsi', 'sprite']);
    expect(inAisle(SHOP, null)).toHaveLength(SHOP.length);
  });

  it('names its first word in the band for every product', () => {
    expect(ES.products.all).toBe('Todo');
  });
});

describe('8g — the product page', () => {
  it('shows more of its aisle, itself left out, and how many there are in all', () => {
    const family = siblingsOf(SHOP, SHOP[0]!, 8);
    expect(family.shown.map((e) => e.id)).toEqual(['pepsi', 'sprite']);
    expect(family.total).toBe(3);
    expect(ES.products.page.seeAll(126)).toBe('Ver los 126');
  });

  it('sums this week, Monday to Sunday, and marks today', () => {
    const days: SoldDay[] = [
      { day: '2026-10-12', variantId: 'coca-600', variantName: 'Coca-Cola 600 ml', familyId: 'refrescos', familyName: 'Refrescos', baseUnit: 'pza', qty: 4000, centavos: 8000 },
      { day: '2026-10-16', variantId: 'coca-600', variantName: 'Coca-Cola 600 ml', familyId: 'refrescos', familyName: 'Refrescos', baseUnit: 'pza', qty: 2000, centavos: 4000 },
      { day: '2026-10-09', variantId: 'coca-600', variantName: 'Coca-Cola 600 ml', familyId: 'refrescos', familyName: 'Refrescos', baseUnit: 'pza', qty: 9000, centavos: 18000 },
      { day: '2026-10-14', variantId: 'pepsi', variantName: 'Pepsi 600 ml', familyId: 'refrescos', familyName: 'Refrescos', baseUnit: 'pza', qty: 1000, centavos: 1800 },
    ];
    const week = weekOfProduct(days, 'coca-600', '2026-10-16', SHOP, FACTORS);
    expect(week.centavos).toBe(12000);
    expect(week.bars).toEqual([8000, 0, 0, 0, 4000, 0, 0]);
    expect(week.today).toBe(4);
    expect(week.quantity).not.toBeNull();
    // ⚠️ A WEEK WITH NOTHING SOLD SAYS SO, rather than *0 pza · $0*.
    expect(weekOfProduct(days, 'sprite', '2026-10-16', SHOP, FACTORS).quantity).toBeNull();
  });

  it('finds the weekday it sells best on, over every day held — Sunday-first, as ES.dates.weekdays', () => {
    const days: SoldDay[] = [
      { day: '2026-10-09', variantId: 'coca-600', variantName: '', familyId: '', familyName: '', baseUnit: 'pza', qty: 1, centavos: 9000 },
      { day: '2026-10-12', variantId: 'coca-600', variantName: '', familyId: '', familyName: '', baseUnit: 'pza', qty: 1, centavos: 4000 },
    ];
    expect(bestWeekdayOf(days, 'coca-600')).toBe(5);
    expect(ES.dates.weekdays[5]).toBe('viernes');
    expect(bestWeekdayOf(days, 'sprite')).toBeNull();
  });

  it('takes the last delivery from whichever supplier brought it, by its instant', () => {
    const costs = {
      state: 'series',
      series: [
        { providerId: 'a', name: 'Don Chuy', isGeneric: false, hue: 0, points: [], latest: { at: '2026-10-14T15:00:00Z', day: '2026-10-14', perBase: '15.200000', centavos: 1520, price: '$15.20' } },
        { providerId: 'b', name: 'Genérico', isGeneric: true, hue: 1, points: [], latest: { at: '2026-10-10T15:00:00Z', day: '2026-10-10', perBase: '14.000000', centavos: 1400, price: '$14' } },
        { providerId: 'c', name: 'Nadie', isGeneric: false, hue: 2, points: [], latest: null },
      ],
      deliveries: 2, low: 1400, high: 1520, lowLabel: '', highLabel: '', days: [],
    } as unknown as Costs;
    expect(lastCostOf(costs)).toEqual({ centavos: 1520, perBase: '15.200000', provider: 'Don Chuy', day: '2026-10-14' });
    expect(lastCostOf({ ...costs, series: [] } as Costs)).toBeNull();
    expect([boughtWhen('2026-10-16', '2026-10-16'), boughtWhen('2026-10-15', '2026-10-16'), boughtWhen('2026-10-14', '2026-10-16')]).toEqual(['hoy', 'ayer', 'hace 2 días']);
  });

  it('⚠️ his one hook: what a new price would earn, as it is typed — and a zero is an answer', () => {
    expect(earningsAt('22', 1520)).toBe(680);
    expect(earningsAt('15.20', 1520)).toBe(0);
    expect(earningsAt('14', 1520)).toBe(-120);
    expect(earningsAt('', 1520)).toBeNull();
    expect(earningsAt('abc', 1520)).toBeNull();
    expect(earningsAt('22', null)).toBeNull();
    expect(ES.products.earns('$15.20', '$6.80', 'pza')).toBe('Te cuesta $15.20 · ganarías $6.80 por pza');
    expect(ES.products.loses('$15.20', '$1.20', 'pza')).toBe('Te cuesta $15.20 · perderías $1.20 por pza');
    expect(perHundred(480, 2000)).toBe(24);
    expect(perHundred(480, 0)).toBeNull();
  });

  it('says Ya no lo vendo, his plainer words for retiring a product', () => {
    expect(ES.catalog.edit.retire).toBe('Ya no lo vendo');
    expect(ES.catalog.edit.retireYes).toBe('Sí, ya no lo vendo');
  });
});

describe('8g — Editar, for the shop’s own product', () => {
  it('⚠️ moves it only to an aisle sold in the same kind of unit (C8.5, which the database does not hold)', () => {
    const jamaica = SHOP.find((e) => e.id === 'jamaica')!;
    const names = aislesFor(SHOP, jamaica, UNITS).map((a) => a.name);
    expect(names).toEqual(['Aguas frescas', 'Lácteos', 'Refrescos']);
    expect(names).not.toContain('Básicos');
  });

  it('writes a move only when the aisle changed', () => {
    expect(familyPatch('aguas', 'refrescos')).toEqual({ family_id: 'refrescos' });
    expect(familyPatch('aguas', 'aguas')).toBeNull();
    expect(familyPatch('aguas', null)).toBeNull();
  });

  it('has no price, no IVA and no pieces per pack any more — the owner’s rulings', () => {
    const form = readFileSync(resolve(__dirname, '../src/app/producto/[id].tsx'), 'utf8');
    expect(form).not.toMatch(/ES\.catalog\.edit\.taxLabel/);
    expect(form).not.toMatch(/ES\.catalog\.edit\.packLabel/);
    expect(form).not.toMatch(/ES\.catalog\.edit\.priceLabel/);
    // ⚠️ AND A PRODUCT FROM WERA'S CATALOG KEEPS ITS NAME.
    expect(form).toMatch(/const locked = settings\?\.is_prebuilt === true \|\| entry\?\.prebuilt === true;/);
  });
});

describe('8g — where a tap lands', () => {
  const read = (path: string) => readFileSync(resolve(__dirname, path), 'utf8');

  it('opens the product’s page from the list and the mosaic, never la Familia', () => {
    const productos = read('../src/app/productos.tsx');
    expect(productos.match(/pathname: '\/ficha\/\[id\]'/g)).toHaveLength(2);
    expect(productos).not.toMatch(/\/familia\/\[id\]/);
  });

  it('offers Ya no lo vendo on a catalog product and Editar on the shop’s own', () => {
    const ficha = read('../src/app/ficha/[id].tsx');
    expect(ficha).toMatch(/entry\.prebuilt \? \(\s*<Accion label=\{ES\.catalog\.edit\.retire\}/);
  });
});
