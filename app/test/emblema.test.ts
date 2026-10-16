import { describe, expect, it } from 'vitest';
import { emblemaDe, GIRO_EMBLEMA, readEmblema, rememberEmblema } from '@/api/emblema';
import type { ShopHolding, Template, TemplateProduct } from '@/api/starterCatalog';
import type { DeviceStore } from '@/lib/store';

// `8g`, the owner's option C (2026-10-15): the tab screens' band wears a drawing
// of the shop's giro. See `@/api/emblema` for the rule.

const product = (code: string, ...tags: string[]): TemplateProduct => ({
  code,
  family: 'f',
  name: code,
  tags,
});

// A small template shaped like the real one: eggs are shared by three giros.
const TEMPLATE: Template = {
  tags: [],
  families: [],
  products: [
    product('pollo-entero', 'giro-polleria'),
    product('pechuga', 'giro-polleria'),
    product('huevo', 'giro-polleria', 'giro-abarrotes', 'giro-cremeria'),
    product('arroz', 'giro-abarrotes'),
    product('frijol', 'giro-abarrotes'),
    product('azucar', 'giro-abarrotes'),
    product('queso', 'giro-cremeria'),
    product('crema', 'giro-cremeria'),
    product('manzana', 'giro-fruteria'),
    product('platano', 'giro-fruteria'),
  ],
};

const holding = (...codes: string[]): ShopHolding => ({
  templateCodes: new Set(codes),
  names: new Set(),
});

describe('8g — the drawing a shop wears in its band', () => {
  it('names a drawing for every giro the content migrations define', () => {
    expect(Object.keys(GIRO_EMBLEMA).sort()).toEqual([
      'giro-abarrotes',
      'giro-carniceria',
      'giro-cremeria',
      'giro-fruteria',
      'giro-materias-primas',
      'giro-polleria',
      'giro-verduleria',
    ]);
  });

  it('draws the giro a single-giro shop imported', () => {
    expect(emblemaDe(TEMPLATE, holding('pollo-entero', 'pechuga', 'huevo'))).toBe('polleria');
  });

  it('does not let a product two giros share make a second giro', () => {
    // An abarrotes holds the eggs, which are a third of the pollería: not half.
    expect(emblemaDe(TEMPLATE, holding('arroz', 'frijol', 'azucar', 'huevo'))).toBe('abarrotes');
  });

  it('counts a giro at exactly half of its products', () => {
    expect(emblemaDe(TEMPLATE, holding('manzana'))).toBe('fruteria');
  });

  it('draws the storefront for a shop of several giros', () => {
    expect(emblemaDe(TEMPLATE, holding('arroz', 'frijol', 'azucar', 'manzana', 'platano'))).toBe(
      'tienda',
    );
  });

  it('draws the storefront for a shop that imported nothing', () => {
    expect(emblemaDe(TEMPLATE, holding())).toBe('tienda');
  });

  it('says nothing rather than guess when the template is not there', () => {
    expect(emblemaDe({ tags: [], families: [], products: [] }, holding('arroz'))).toBeNull();
  });
});

describe('8g — the drawing is remembered on the phone, per shop', () => {
  const memory = (): DeviceStore => {
    const map = new Map<string, string>();
    return {
      getItem: (k) => map.get(k) ?? null,
      setItem: (k, v) => void map.set(k, v),
      removeItem: (k) => void map.delete(k),
    };
  };

  it('reads back what it wrote, for that shop only', () => {
    const store = memory();
    rememberEmblema(store, 'shop-a', 'cremeria');
    expect(readEmblema(store, 'shop-a')).toBe('cremeria');
    expect(readEmblema(store, 'shop-b')).toBeNull();
  });

  it('refuses a stored word that is not a drawing', () => {
    const store = memory();
    store.setItem('wera.emblema.shop-a', 'pescaderia');
    expect(readEmblema(store, 'shop-a')).toBeNull();
  });

  it('is a no-op with no store, as under node', () => {
    rememberEmblema(undefined, 'shop-a', 'tienda');
    expect(readEmblema(undefined, 'shop-a')).toBeNull();
  });
});
