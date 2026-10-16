import { describe, expect, it } from 'vitest';
import { emblemaDe, GIRO_EMBLEMA, GIROS, principalDe, toggledInOrder } from '@/api/emblema';

// `8g`: the tab screens' band wears the drawing of the shop's MAIN giro — the
// first one picked when the shop was created, stored on the shop (`0056`).

describe('8g — the drawing comes from the shop’s main giro', () => {
  it('names a drawing for every giro the content migrations define', () => {
    expect([...GIROS].sort()).toEqual([
      'giro-abarrotes',
      'giro-carniceria',
      'giro-cremeria',
      'giro-fruteria',
      'giro-materias-primas',
      'giro-polleria',
      'giro-verduleria',
    ]);
    expect(new Set(Object.values(GIRO_EMBLEMA)).size).toBe(7);
  });

  it('maps the stored code to its drawing', () => {
    expect(emblemaDe('giro-polleria')).toBe('polleria');
    expect(emblemaDe('giro-materias-primas')).toBe('materias');
  });

  it('draws nothing for a shop that has not chosen', () => {
    expect(emblemaDe(null)).toBeNull();
  });

  it('draws nothing for a shop restored from the cache before 0056', () => {
    expect(emblemaDe(undefined)).toBeNull();
  });

  it('draws nothing for a giro it has no drawing for, rather than a wrong one', () => {
    expect(emblemaDe('giro-pescaderia')).toBeNull();
  });
});

describe('8g — the first giro picked is the main one', () => {
  it('keeps the order things were picked in', () => {
    let order: string[] = [];
    order = toggledInOrder(order, 'giro-fruteria');
    order = toggledInOrder(order, 'giro-abarrotes');
    order = toggledInOrder(order, 'giro-verduleria');
    expect(order).toEqual(['giro-fruteria', 'giro-abarrotes', 'giro-verduleria']);
    expect(principalDe(order)).toBe('giro-fruteria');
  });

  it('passes the star to the next one picked when the starred one is unpicked', () => {
    const order = toggledInOrder(['giro-fruteria', 'giro-abarrotes', 'giro-verduleria'], 'giro-fruteria');
    expect(order).toEqual(['giro-abarrotes', 'giro-verduleria']);
    expect(principalDe(order)).toBe('giro-abarrotes');
  });

  it('puts a re-picked giro at the end, not back in its old place', () => {
    const order = toggledInOrder(['giro-abarrotes', 'giro-verduleria'], 'giro-fruteria');
    expect(principalDe(order)).toBe('giro-abarrotes');
  });

  it('has no main giro when nothing is picked', () => {
    expect(principalDe([])).toBeNull();
  });
});
