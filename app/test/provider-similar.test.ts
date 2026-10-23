// ============================================================================
// THE SUPPLIERS A NEW NAME LOOKS LIKE — `similarProviders`, plan task `8g`
// (2026-10-23, the owner: a *Crear Nuevo Proveedor* button on Proveedores). The
// form reached without searching first shows what it looks like, by shared word.
// ============================================================================

import { describe, expect, it } from 'vitest';

import { matchesProvider, similarProviders } from '@/api/providerDirectory';
import type { Provider } from '@/api/providers';
import { ES } from '@/strings';

const shop: readonly Provider[] = [
  { id: 'g', name: 'Genérico', isGeneric: true },
  { id: 'a', name: 'Central de Abasto', isGeneric: false },
  { id: 'b', name: 'Bodega del Centro', isGeneric: false },
  { id: 'c', name: 'Don Chuy Mayoreo', isGeneric: false },
  { id: 'd', name: 'Hortalizas del Valle', isGeneric: false },
];

const ids = (found: readonly Provider[]) => found.map((p) => p.id);

describe('the suppliers a new name looks like', () => {
  it('finds Bodega del Centro for Bodega Centro — the pair the search alone misses', () => {
    expect(matchesProvider(shop[2]!, 'Bodega Centro')).toBe(false);
    expect(ids(similarProviders(shop, 'Bodega Centro'))).toEqual(['b']);
  });

  it('shows them while the name is still being typed, from three letters', () => {
    expect(ids(similarProviders(shop, 'Ce'))).toEqual([]);
    expect(ids(similarProviders(shop, 'Cen'))).toEqual(['a', 'b']);
    expect(ids(similarProviders(shop, 'Chuy'))).toEqual(['c']);
  });

  it('folds case and accents the way the search does', () => {
    expect(ids(similarProviders(shop, 'HORTALIZAS'))).toEqual(['d']);
    expect(ids(similarProviders(shop, 'Hortalízas'))).toEqual(['d']);
  });

  it('never offers the generic supplier, and ignores the little linking words', () => {
    expect(ids(similarProviders(shop, 'Genérico'))).toEqual([]);
    expect(ids(similarProviders(shop, 'del'))).toEqual([]);
    expect(ids(similarProviders(shop, 'Frutas del Sur'))).toEqual([]);
  });

  it('says nothing for a name like none of them, or an empty box', () => {
    expect(similarProviders(shop, 'Lácteos San Juan')).toEqual([]);
    expect(similarProviders(shop, '')).toEqual([]);
  });

  it('offers three at most', () => {
    const many: Provider[] = Array.from({ length: 6 }, (_, i) => ({ id: `m${i}`, name: `Mercado ${i}`, isGeneric: false }));
    expect(similarProviders(many, 'Mercado')).toHaveLength(3);
  });
});

describe('the words of the new door', () => {
  it('names the button the way the owner spells the create row', () => {
    expect(ES.providers.create.button).toBe('Crear Nuevo Proveedor');
    expect(ES.providers.create.button).toBe(ES.providers.create.row);
  });
});
