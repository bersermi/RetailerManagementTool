// `14.2`: what a tile on Vender's counter does, and which products the grid
// holds (the owner's calls 2, 4 and 11 of 2026-11-27, and C3.3: the tap is the
// line). These pin what a shopkeeper's tap puts in the basket — or opens.
// `14.3`: the search is the whole shop, on both counters (his call 13).
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import type { CatalogEntry } from '@/api/catalog';
import { sellGate } from '@/cart/gate';
import { PESADOS, columnasDe, conMenos, pasilloAlEscribir, toqueDe, toqueLargoDe, vitrinaDe } from '@/cart/vitrina';

function entry(over: Partial<CatalogEntry> = {}): CatalogEntry {
  return {
    prebuilt: false,
    picture: null,
    id: 'v-1',
    name: 'Cilantro',
    familyId: 'hierbas',
    familyName: 'Hierbas',
    priceUnit: 'manojo',
    baseUnit: 'pza',
    centavos: 800,
    perBase: '8.000000',
    priceScope: null,
    price: '$8 / manojo',
    initials: 'CI',
    term: 'cilantro hierbas',
    ...over,
  };
}

describe('a tap (call 4)', () => {
  const open = sellGate(800, false, false);

  it('adds one piece or bunch', () => {
    expect(toqueDe('pza', open)).toBe('sumar');
    expect(toqueDe('manojo', open)).toBe('sumar');
  });

  it('opens the pad on anything weighed or measured — a kilo is never the amount', () => {
    for (const unit of ['kg', 'g', 'l', 'ml']) expect(toqueDe(unit, open)).toBe('pesar');
    expect([...PESADOS].sort()).toEqual(['g', 'kg', 'l', 'ml']);
  });

  it('keeps the owner’s ruling on a product with no price: the sheet for the owner, the note for a cashier', () => {
    expect(toqueDe('pza', sellGate(null, true, false))).toBe('precio');
    expect(toqueDe('kg', sellGate(null, true, false))).toBe('precio');
    expect(toqueDe('pza', sellGate(null, false, false))).toBe('nota');
  });

  it('leaves a line already in the basket alone, priced or not', () => {
    expect(toqueDe('pza', sellGate(null, false, true))).toBe('sumar');
    expect(toqueDe('kg', sellGate(null, false, true))).toBe('pesar');
  });
});

describe('a long press', () => {
  it('opens the pad on any product, past the same gate', () => {
    expect(toqueLargoDe(sellGate(800, false, false))).toBe('pesar');
    expect(toqueLargoDe(sellGate(null, true, false))).toBe('precio');
    expect(toqueLargoDe(sellGate(null, false, false))).toBe('nota');
  });
});

describe('the tile in the basket', () => {
  it('draws − on a count, never on a weighed line (− would take a whole kilo)', () => {
    expect(conMenos('pza')).toBe(true);
    expect(conMenos('manojo')).toBe(true);
    expect(conMenos('kg')).toBe(false);
    expect(conMenos('g')).toBe(false);
  });
});

describe('tiles across (calls 2 and 11)', () => {
  it('is three at Normal and two at Letra grande', () => {
    expect(columnasDe('normal')).toBe(3);
    expect(columnasDe('elder')).toBe(2);
  });
});

describe('what the grid holds', () => {
  const cilantro = entry();
  const epazote = entry({ id: 'v-2', name: 'Epazote', term: 'epazote hierbas' });
  const pollo = entry({ id: 'v-3', name: 'Pollo entero', familyId: 'pollo', familyName: 'Pollo', term: 'pollo entero pollo' });
  const pierna = entry({ id: 'v-4', name: 'Pierna con muslo', familyId: 'pollo', familyName: 'Pollo', term: 'pierna con muslo pollo' });
  // the day's order: chicken first
  const ordered = [pollo, cilantro, pierna, epazote];

  it('is every product under Todo, in the day’s order', () => {
    expect(vitrinaDe(ordered, '', null)).toEqual(ordered);
  });

  it('is the aisle’s products in that order', () => {
    expect(vitrinaDe(ordered, '', 'pollo')).toEqual([pollo, pierna]);
  });

  it('is what matches, in the order', () => {
    expect(vitrinaDe(ordered, 'p', null)).toEqual([pollo, pierna, epazote]);
  });

  it('searches the whole shop even with an aisle still chosen (call 13) — never the aisle alone', () => {
    // ⚠️ `14.2` showed only Pollo's matches here; his ruling: typing is *Todo*.
    expect(vitrinaDe(ordered, 'p', 'pollo')).toEqual([pollo, pierna, epazote]);
    expect(vitrinaDe(ordered, 'cilan', 'pollo')).toEqual([cilantro]);
  });

  it('is empty when nothing anywhere matches', () => {
    expect(vitrinaDe(ordered, 'xyz', 'pollo')).toEqual([]);
  });

  it('treats a box of spaces as empty: the aisle still filters', () => {
    expect(vitrinaDe(ordered, '   ', 'pollo')).toEqual([pollo, pierna]);
  });
});

describe('the search and the aisles never mix (call 13)', () => {
  it('moves the aisles to Todo on the first letter typed', () => {
    expect(pasilloAlEscribir('p', 'pollo')).toBeNull();
    expect(pasilloAlEscribir('pie', null)).toBeNull();
  });

  it('leaves Todo when the box is emptied — the aisle she had does not come back', () => {
    const typing = pasilloAlEscribir('p', 'pollo');
    expect(pasilloAlEscribir('', typing)).toBeNull();
  });

  it('keeps the aisle while the box holds no letter', () => {
    expect(pasilloAlEscribir('', 'pollo')).toBe('pollo');
    expect(pasilloAlEscribir('  ', 'pollo')).toBe('pollo');
  });
});

describe('the price tag on a tile (11.2)', () => {
  it('has the design system’s point, byte for byte, at every density', () => {
    // ⚠️ The app draws `brand/mostrador/png/`'s rendering of `punta-etiqueta.svg`;
    // a copy that drifted would be a second tag nobody drew.
    for (const name of ['punta-etiqueta.png', 'punta-etiqueta@2x.png', 'punta-etiqueta@3x.png']) {
      const ours = readFileSync(resolve(__dirname, '../src/marca/mostrador', name));
      const theirs = readFileSync(resolve(__dirname, '../../brand/mostrador/png', name));
      expect(ours.equals(theirs), name).toBe(true);
    }
  });
});
