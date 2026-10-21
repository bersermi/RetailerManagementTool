// ============================================================================
// WHAT AN IMPORT DID NOT BRING, AND WHY, IN ONE LINE — `notAddedOf` in
// `@/api/starterCatalog`, plan task `8g` (the owner's ruling of 2026-10-21:
// *"Say so, in one line"*).
//
// ⚠️ THE FIRST CASE IS HIS SHOP, READ OFF THE HOSTED DATABASE THAT NIGHT: 17
// Pollo products offered and sent, none created, because the shop's *Pollo*
// aisle held five products by weight and *Pollo entero* by the piece — and the
// screen went back as if they had arrived.
// ============================================================================

import { describe, expect, it } from 'vitest';

import { aislesFrom, notAddedOf, type ShopHolding, type Template } from '@/api/starterCatalog';
import { ES } from '@/strings';

const DIMENSION = new Map([
  ['pza', 'count'],
  ['g', 'mass'],
  ['kg', 'mass'],
  ['ml', 'volume'],
]);

/** The catalog's Pollo family and one from another aisle. */
const POLLO = ['pechuga-entera', 'muslo', 'higado'] as const;
const TEMPLATE: Template = {
  tags: [{ code: 'giro-polleria', kind: 'giro', label: 'Pollería' }],
  families: [
    { code: 'pollo', name: 'Pollo' },
    { code: 'huevo', name: 'Huevo' },
  ],
  products: [
    ...POLLO.map((code) => ({ code, family: 'pollo', name: code, tags: ['giro-polleria'] })),
    { code: 'huevo-blanco', family: 'huevo', name: 'Huevo blanco', tags: ['giro-polleria'] },
  ],
};

/** His shop's Pollo aisle: weight products and one by the piece. */
const HIS_ROWS = [
  { base_unit_code: 'g', product_family: { name: 'Pollo' } },
  { base_unit_code: 'g', product_family: { name: 'Pollo' } },
  { base_unit_code: 'pza', product_family: { name: 'Pollo' } },
  { base_unit_code: 'pza', product_family: { name: 'Huevo' } },
];

const held = (...codes: string[]): ShopHolding => ({ templateCodes: new Set(codes), names: new Set() });

describe('the aisles a shop holds', () => {
  it('records every measure an aisle holds, by its folded name', () => {
    const aisles = aislesFrom(HIS_ROWS, DIMENSION);
    expect([...(aisles.get('pollo') ?? [])].sort()).toEqual(['count', 'mass']);
    expect([...(aisles.get('huevo') ?? [])]).toEqual(['count']);
  });

  it('skips a row with no aisle or a unit it does not know', () => {
    const aisles = aislesFrom(
      [
        { base_unit_code: 'g', product_family: null },
        { base_unit_code: 'zz', product_family: { name: 'Pollo' } },
      ],
      DIMENSION,
    );
    expect(aisles.size).toBe(0);
  });
});

describe('what did not arrive', () => {
  it('says his case: none of the Pollo products, in an aisle that mixes both measures', () => {
    const result = notAddedOf(TEMPLATE, [...POLLO], 0, held(), aislesFrom(HIS_ROWS, DIMENSION));
    expect(result).toEqual({ total: 3, aisles: [{ aisle: 'Pollo', count: 3, held: ['count', 'mass'] }] });
    const [line] = (result.aisles ?? []).map((a) =>
      ES.starter.notAdded(a.count, a.aisle, a.held.map((m) => ES.starter.measure[m])),
    );
    expect(line).toBe('No agregamos 3 productos de Pollo: ese pasillo de tu tienda mezcla productos por pieza y por peso.');
  });

  it('counts only what did not arrive when some did', () => {
    const result = notAddedOf(TEMPLATE, [...POLLO, 'huevo-blanco'], 1, held('huevo-blanco'), aislesFrom(HIS_ROWS, DIMENSION));
    expect(result.total).toBe(3);
    expect(result.aisles?.map((a) => a.aisle)).toEqual(['Pollo']);
  });

  it('names the one measure an aisle holds', () => {
    const aisles = aislesFrom([{ base_unit_code: 'pza', product_family: { name: 'Pollo' } }], DIMENSION);
    const [only] = notAddedOf(TEMPLATE, ['muslo'], 0, held(), aisles).aisles ?? [];
    expect(ES.starter.notAdded(only.count, only.aisle, only.held.map((m) => ES.starter.measure[m]))).toBe(
      'No agregamos 1 producto de Pollo: ese pasillo de tu tienda ya tiene productos por pieza.',
    );
  });

  it('is nothing when everything arrived', () => {
    expect(notAddedOf(TEMPLATE, [...POLLO], 3, held(...POLLO), new Map())).toEqual({ total: 0, aisles: [] });
  });

  it('names no aisle when the shop’s read does not account for the count — never a wrong one', () => {
    // The server created one; the shop's read has not caught up and still holds none.
    const result = notAddedOf(TEMPLATE, [...POLLO], 1, held(), aislesFrom(HIS_ROWS, DIMENSION));
    expect(result).toEqual({ total: 2, aisles: null });
    expect(ES.starter.notAddedSome(result.total)).toBe('No agregamos 2 productos.');
  });

  it('says how many and where even when the shop has no such aisle yet', () => {
    const [only] = notAddedOf(TEMPLATE, ['muslo'], 0, held(), new Map()).aisles ?? [];
    expect(ES.starter.notAdded(only.count, only.aisle, only.held)).toBe('No agregamos 1 producto de Pollo.');
  });
});
