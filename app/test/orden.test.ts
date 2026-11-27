// `14.2`: the day's order on Vender — what sells most, first (the owner's calls
// 6 and 7 of 2026-11-27). These pin which product a shopkeeper finds at the top
// of the counter, and that the phone keeps it as it should.
// 2026-11-27 is a Friday; its window is 10-30 to 11-26.
import { describe, expect, it } from 'vitest';

import type { CatalogEntry } from '@/api/catalog';
import type { SoldDay } from '@/api/sales';
import {
  ORDEN_DIAS,
  guardarOrden,
  leerOrden,
  ordenDe,
  ordenDeCompra,
  ordenNuevo,
  paraTienda,
  porOrden,
  ventanaDe,
  vigente,
  type OrdenDelDia,
} from '@/cart/orden';

const TODAY = '2026-11-27';

function sold(
  day: string,
  variantId: string,
  times: number | null,
  centavos: number,
  family = 'verduras',
  name = variantId,
): SoldDay {
  return {
    day,
    variantId,
    variantName: name,
    familyId: family,
    familyName: family,
    baseUnit: 'pza',
    qty: 1000,
    centavos,
    times,
  };
}

describe('the window', () => {
  it('is four weeks, ending yesterday', () => {
    expect(ORDEN_DIAS).toBe(28);
    expect(ventanaDe(TODAY)).toEqual({ desde: '2026-10-30', hasta: '2026-11-26' });
    // across a year
    expect(ventanaDe('2027-01-05')).toEqual({ desde: '2026-12-08', hasta: '2027-01-04' });
  });

  it('leaves out today, and anything older than four weeks', () => {
    const orden = ordenDe(
      [
        sold('2026-11-27', 'hoy', 50, 1),
        sold('2026-10-29', 'viejo', 50, 1),
        sold('2026-10-30', 'primero', 1, 1),
        sold('2026-11-26', 'ayer', 2, 1),
      ],
      TODAY,
      'shop',
    );
    expect(orden.productos).toEqual(['ayer', 'primero']);
  });
});

describe('most sold is most times sold, not most pesos (call 7)', () => {
  it('puts cilantro, sold often for little, before chicken, sold less for more', () => {
    const days = [
      sold('2026-11-25', 'cilantro', 13, 10400, 'hierbas'),
      sold('2026-11-26', 'cilantro', 12, 9600, 'hierbas'),
      sold('2026-11-25', 'pollo-entero', 8, 115200, 'pollo'),
      sold('2026-11-26', 'pollo-entero', 7, 100800, 'pollo'),
    ];
    const orden = ordenDe(days, TODAY, 'shop');
    expect(orden.productos).toEqual(['cilantro', 'pollo-entero']);
    // and the aisles by the same count
    expect(orden.pasillos).toEqual(['hierbas', 'pollo']);
  });

  it('adds every store of the shop: a sale is a sale, whichever till', () => {
    const days = [
      sold('2026-11-26', 'huevo', 3, 1000),
      sold('2026-11-26', 'huevo', 3, 1000),
      sold('2026-11-26', 'jitomate', 5, 1000),
    ];
    expect(ordenDe(days, TODAY, 'shop').productos).toEqual(['huevo', 'jitomate']);
  });

  it('breaks a tie by pesos, then by name with accents folded', () => {
    const days = [
      sold('2026-11-26', 'b', 4, 2000, 'f', 'Ñame'),
      sold('2026-11-26', 'a', 4, 9000, 'f', 'Zanahoria'),
      sold('2026-11-26', 'c', 4, 2000, 'f', 'Ácelga'),
    ];
    expect(ordenDe(days, TODAY, 'shop').productos).toEqual(['a', 'c', 'b']);
  });

  it('leaves out a product whose only sale was voided — sold and taken back is nothing', () => {
    const days = [sold('2026-11-26', 'devuelto', 0, 0), sold('2026-11-26', 'vendido', 1, 500)];
    expect(ordenDe(days, TODAY, 'shop').productos).toEqual(['vendido']);
  });

  it('counts a day as one sale when the database sent no count (before 0100)', () => {
    const days = [
      sold('2026-11-24', 'tres-dias', null, 100),
      sold('2026-11-25', 'tres-dias', null, 100),
      sold('2026-11-26', 'tres-dias', null, 100),
      sold('2026-11-26', 'un-dia', null, 99900),
    ];
    expect(ordenDe(days, TODAY, 'shop').productos).toEqual(['tres-dias', 'un-dia']);
  });
});

describe('the products and the aisles in that order', () => {
  const catalog = [{ id: 'aguacate' }, { id: 'cilantro' }, { id: 'epazote' }, { id: 'pollo' }, { id: 'zanahoria' }];
  const id = (item: { id: string }) => item.id;

  it('puts what sold first, by its place, and the rest after in the catalog order', () => {
    expect(porOrden(catalog, ['pollo', 'cilantro'], id).map(id)).toEqual([
      'pollo',
      'cilantro',
      'aguacate',
      'epazote',
      'zanahoria',
    ]);
  });

  it('is the catalog order for a new shop', () => {
    expect(porOrden(catalog, [], id)).toBe(catalog);
  });

  it('passes over an id the catalog no longer has', () => {
    expect(porOrden(catalog, ['retirado', 'epazote'], id).map(id)[0]).toBe('epazote');
  });
});

describe('set once a day, at the first opening (call 6)', () => {
  const hoy: OrdenDelDia = { dia: TODAY, tienda: 'shop', productos: ['a'], pasillos: ['f'] };
  const ayer: OrdenDelDia = { ...hoy, dia: '2026-11-26' };

  it('is today’s only on its day and for its shop', () => {
    expect(vigente(hoy, TODAY, 'shop')).toBe(true);
    expect(vigente(ayer, TODAY, 'shop')).toBe(false);
    expect(vigente(hoy, TODAY, 'otra')).toBe(false);
    expect(vigente(null, TODAY, 'shop')).toBe(false);
  });

  it('draws yesterday’s while today’s is not set, never another shop’s', () => {
    expect(paraTienda(ayer, 'shop')).toBe(ayer);
    expect(paraTienda(ayer, 'otra')).toBeNull();
    expect(paraTienda(null, 'shop')).toBeNull();
  });

  it('is set only by a read that came back', () => {
    const days = [sold('2026-11-26', 'a', 2, 100)];
    expect(ordenNuevo('sales', days, TODAY, 'shop')?.productos).toEqual(['a']);
    // a shop with no sale yet: its catalog order, kept so it is not asked again today
    expect(ordenNuevo('nothing', [], TODAY, 'shop')).toEqual({ dia: TODAY, tienda: 'shop', productos: [], pasillos: [] });
    // in flight, failed or no signal — and a figure that did not read — set nothing
    expect(ordenNuevo('unknown', [], TODAY, 'shop')).toBeNull();
    expect(ordenNuevo('unreadable', [], TODAY, 'shop')).toBeNull();
    expect(ordenNuevo('sales', days, TODAY, null)).toBeNull();
  });
});

describe('kept on the phone', () => {
  it('reads back what it wrote', () => {
    const orden: OrdenDelDia = { dia: TODAY, tienda: 'shop', productos: ['a', 'b'], pasillos: ['f'] };
    expect(leerOrden(guardarOrden(orden))).toEqual(orden);
  });

  it('reads nonsense as nothing kept', () => {
    expect(leerOrden(null)).toBeNull();
    expect(leerOrden('')).toBeNull();
    expect(leerOrden('{')).toBeNull();
    expect(leerOrden('null')).toBeNull();
    expect(leerOrden('[]')).toBeNull();
    expect(leerOrden(JSON.stringify({ dia: 'ayer', tienda: 's', productos: [], pasillos: [] }))).toBeNull();
    expect(leerOrden(JSON.stringify({ dia: TODAY, tienda: 's', productos: [1], pasillos: [] }))).toBeNull();
    expect(leerOrden(JSON.stringify({ dia: TODAY, tienda: 's', productos: [] }))).toBeNull();
  });
});

describe('Comprar’s order (14.3, call 6)', () => {
  const tile = (id: string) => ({ id, name: id }) as unknown as CatalogEntry;
  const catalog = ['aguacate', 'cilantro', 'jitomate', 'limon', 'pollo'].map(tile);

  it('puts what this provider brought first, most recent first, then the day’s sales order', () => {
    const sales = ['pollo', 'cilantro', 'limon'];
    const bought = { jitomate: '2026-11-20T10:00:00Z', aguacate: '2026-11-25T10:00:00Z' };
    expect(ordenDeCompra(catalog, sales, bought).map((e) => e.id)).toEqual([
      'aguacate', 'jitomate', 'pollo', 'cilantro', 'limon',
    ]);
  });

  it('is the sales order alone for a provider who never brought anything, and the catalog’s for a new shop', () => {
    expect(ordenDeCompra(catalog, ['limon'], {}).map((e) => e.id)).toEqual(['limon', 'aguacate', 'cilantro', 'jitomate', 'pollo']);
    expect(ordenDeCompra(catalog, [], {}).map((e) => e.id)).toEqual(catalog.map((e) => e.id));
  });
});
