import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  COCINAS_KEY,
  KITCHEN_GIROS,
  ON_OFFER_NOW,
  POINT_SOURCES,
  TAGS,
  COMERES,
  PAGOS,
  aMilisegundos,
  centavosOf,
  cocinasKey,
  comeresOf,
  countOf,
  desechableOf,
  giroLabel,
  girosFrom,
  girosKey,
  instantOf,
  kitchensFrom,
  minScoreOf,
  pagosOf,
  pointOf,
} from '@/api/cocinas';

// ============================================================================
// THE DOOR'S ANSWER, AS ITACATE READS IT. Plan task `10.5-iv-a-i`, on `0078`'s
// `on_offer_now()`.
//
// ⚠️ WHAT ONLY A REAL POSTGREST CAN SAY — that each key this app reads is one the
// door answers, with a value of the type it expects — is
// `docs/checks/10.5-iv-a-door-contract.sh`'s, which reads the names out of
// `src/api/cocinas.ts` and asks the database as a neighbour (`db.yml`). Here: what
// the app does with an answer, and the first line of that claim — every key named
// in the migration's own text, so a misspelling is red before a database starts.
// ============================================================================

const SRC = fileURLToPath(new URL('../src', import.meta.url));
const MIGRATIONS = fileURLToPath(new URL('../../supabase/migrations', import.meta.url));
const read = (path: string) => readFileSync(join(SRC, path), 'utf8');

/**
 * The door as the database answers it now: its text in whichever migration defines it
 * LAST (`0078`, re-created by `0079` and `0080`) — a later one takes this test with it.
 */
function laPuerta(): { readonly archivo: string; readonly texto: string } {
  const archivos = readdirSync(MIGRATIONS).filter((n) => /^\d{4}_.*\.sql$/.test(n)).sort();
  for (const archivo of [...archivos].reverse()) {
    const sql = readFileSync(join(MIGRATIONS, archivo), 'utf8');
    const at = sql.search(/create (or replace )?function public\.on_offer_now\(\)/);
    if (at >= 0) return { archivo, texto: sql.slice(at, sql.indexOf('$$;', at)) };
  }
  throw new Error('no migration defines on_offer_now');
}

const KITCHEN = 'b1d0c0de-0000-4000-8000-000000000001';
const PHOTO = `${KITCHEN}/c0ffee00-0000-4000-8000-0000000000aa`;

/** One kitchen on offer, as `0078` writes it — money and quantities as text, six decimals of a second. */
function cocina(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: KITCHEN,
    name: 'Fonda Doña Mari',
    giro: 'giro-fonda',
    address: { street: 'Sabino', street_number: '12', colonia: 'Santa María la Ribera', city: 'Cuauhtémoc', postal_code: '06400' },
    directions: 'Portón verde, junto a la farmacia',
    point: { lat: 19.452301, lng: -99.159876, source: 'pin' },
    page: { sentence: 'Comida casera desde 1998.', color: 'chile', cover_path: null, logo_path: null, maps_link: null },
    on_offer: [
      {
        id: 'a0000000-0000-4000-8000-000000000001',
        pickup_start: '2026-11-05T23:30:00.123456+00:00',
        pickup_end: '2026-11-06T00:15:00+00:00',
        container_price: '5.00',
        lines: [
          { line_no: 2, name: 'Bolsa de guisados', description: null, tags: [], unit_price: '50.00', quantity: '3.000', surprise: true, usual_price: '110.00', image_path: null, para_llevar: true, para_aqui: false },
          { line_no: 1, name: 'Comida corrida', description: 'Sopa, arroz y guisado', tags: ['gluten', 'pica'], unit_price: '60.00', quantity: '2.000', surprise: false, usual_price: '120.00', image_path: PHOTO, para_llevar: true, para_aqui: true },
        ],
      },
    ],
    summary: { weekdays: [2, 1, 2, 1, 2, 0, 0], usual_hour: 17, last_day: '2026-11-04', repeats: [{ name: 'Comida corrida', times: 6, usual_price: '60.00' }] },
    payment: ['efectivo', 'transferencia'],
    eat: ['llevar', 'aqui'],
    min_score: 80,
    ...over,
  };
}

describe('the door, by its name', () => {
  it('is `0078`’s, called with no arguments — for the pilot it takes no area', () => {
    expect(ON_OFFER_NOW).toBe('on_offer_now');
    const migration = readdirSync(MIGRATIONS).find((name) => name.startsWith('0078_'));
    expect(migration).toBeDefined();
    const sql = readFileSync(join(MIGRATIONS, migration as string), 'utf8');
    expect(sql).toMatch(/create function public\.on_offer_now\(\)\s*returns jsonb/);
    expect(read('api/calls.ts')).toMatch(/supabase\.rpc\(ON_OFFER_NOW\);/);
  });

  // The first line of the contract: every key this file reads is written, quoted, in
  // the door's own text — the real answer is the contract check's.
  // ⚠️ Since `10.5b-iii-a`, the door as it is defined LAST — `0080`'s, with `0079`'s keys.
  it('reads only keys the door writes', () => {
    const file = read('api/cocinas.ts');
    const door = laPuerta().texto;
    expect(laPuerta().archivo >= '0080').toBe(true);
    const names = ['KitchenRow', 'AddressRow', 'PointRow', 'PageRow', 'OfferRow', 'LineRow', 'SummaryRow', 'RepeatRow'].flatMap((iface) => {
      const body = new RegExp(`export interface ${iface} \\{([\\s\\S]*?)\\n\\}`).exec(file)?.[1] ?? '';
      const fields = [...body.matchAll(/^\s+readonly ([a-z_]+)\??:/gm)].map((m) => m[1]);
      expect(fields.length, iface).toBeGreaterThan(0);
      return fields;
    });
    for (const name of names) expect(door, name).toContain(`'${name}'`);
    for (const source of POINT_SOURCES) expect(door).toContain(`'source', '${source}'`);
  });

  it('caches under the login, in memory', () => {
    expect(cocinasKey('u-1')).toEqual([...COCINAS_KEY, 'u-1']);
    expect(cocinasKey(null)).toEqual([...COCINAS_KEY, '']);
    expect(cocinasKey('u-1')).not.toEqual(cocinasKey('u-2'));
  });
});

describe('a kitchen, read whole', () => {
  const [k] = kitchensFrom([cocina()]);

  it('her name, trade, address in its five parts and her line', () => {
    expect(k.id).toBe(KITCHEN);
    expect(k.name).toBe('Fonda Doña Mari');
    expect(k.giro).toBe('giro-fonda');
    expect(k.address).toEqual({ street: 'Sabino', number: '12', colonia: 'Santa María la Ribera', city: 'Cuauhtémoc', postalCode: '06400' });
    expect(k.directions).toBe('Portón verde, junto a la farmacia');
  });

  it('her point and whose it is', () => {
    expect(k.point).toEqual({ latitude: 19.452301, longitude: -99.159876, source: 'pin' });
  });

  it('her page, its colour a code', () => {
    expect(k.page).toEqual({ sentence: 'Comida casera desde 1998.', color: 'chile', cover: null, logo: null, mapsLink: null });
  });

  it('what she offers: money in centavos, her lines in her order, the tags in the fixed order, the photo’s path', () => {
    expect(k.offers).toHaveLength(1);
    const [offer] = k.offers;
    expect(offer.start.toISOString()).toBe('2026-11-05T23:30:00.123Z');
    expect(offer.end.toISOString()).toBe('2026-11-06T00:15:00.000Z');
    expect(offer.dishes.map((d) => d.lineNo)).toEqual([1, 2]);
    expect(offer.dishes[0]).toEqual({
      lineNo: 1,
      name: 'Comida corrida',
      description: 'Sopa, arroz y guisado',
      tags: ['pica', 'gluten'],
      priceCentavos: 6000,
      count: 2,
      surprise: false,
      usualCentavos: 12000,
      photo: PHOTO,
      llevar: true,
      aqui: true,
    });
    expect(offer.dishes[1]).toMatchObject({ surprise: true, priceCentavos: 5000, usualCentavos: 11000, count: 3, photo: null, description: null, llevar: true, aqui: false });
    expect(offer.desechableCentavos).toBe(500);
  });

  it('`10.5b-iii-a`: how she takes payment, the ways she hands plates over, who may reserve', () => {
    expect(k.pagos).toEqual(['efectivo', 'transferencia']);
    expect(k.comeres).toEqual(['llevar', 'aqui']);
    expect(k.minScore).toBe(80);
  });

  it('what she usually publishes', () => {
    expect(k.summary).toEqual({
      weekdays: [2, 1, 2, 1, 2, 0, 0],
      usualHour: 17,
      lastDay: '2026-11-04',
      repeats: [{ name: 'Comida corrida', times: 6, usualCentavos: 6000 }],
    });
  });
});

describe('money and quantities arrive as text, and only as text', () => {
  it('a price is read exactly, to the centavo', () => {
    expect(centavosOf('65.50')).toBe(6550);
    expect(centavosOf('100000.00')).toBe(10_000_000);
  });

  it('a JSON number is refused — a double never reaches a peso', () => {
    expect(() => centavosOf(65.5)).toThrow();
    expect(() => centavosOf('6.555')).toThrow();
    expect(() => centavosOf('0.00')).toThrow();
  });

  it('a count is a whole number, or `null` for a fraction', () => {
    expect(countOf('4.000')).toBe(4);
    expect(countOf('1.500')).toBeNull();
    expect(() => countOf('0.000')).toThrow();
    expect(() => countOf(4)).toThrow();
  });

  it('an instant with six decimals is cut to three before the engine reads it', () => {
    expect(aMilisegundos('2026-11-05T00:39:37.710721+00:00')).toBe('2026-11-05T00:39:37.710+00:00');
    expect(aMilisegundos('2026-11-05T23:30:00+00:00')).toBe('2026-11-05T23:30:00+00:00');
    expect(instantOf('2026-11-05T00:39:37.710721+00:00').toISOString()).toBe('2026-11-05T00:39:37.710Z');
    expect(() => instantOf('ayer')).toThrow();
  });
});

describe('her point', () => {
  it('her own pin, or Google’s copy; a source this build does not know is held to Google’s rules', () => {
    expect(pointOf({ lat: 19.4, lng: -99.1, source: 'pin' })?.source).toBe('pin');
    expect(pointOf({ lat: 19.4, lng: -99.1, source: 'google' })?.source).toBe('google');
    expect(pointOf({ lat: 19.4, lng: -99.1, source: 'otra' })?.source).toBe('google');
  });

  it('none, when the door sends none — and never a point off the map', () => {
    expect(pointOf(null)).toBeNull();
    expect(pointOf({ lat: 0, lng: 0, source: 'pin' })).toBeNull();
    expect(pointOf({ lat: 91, lng: -99.1, source: 'pin' })).toBeNull();
    expect(pointOf({ lat: '19.4', lng: -99.1, source: 'pin' })).toBeNull();
    expect(kitchensFrom([cocina({ point: null })])[0].point).toBeNull();
  });
});

describe('what cannot be read is left out — never the list', () => {
  it('a kitchen with no id or name is dropped, and the rest stays', () => {
    const list = kitchensFrom([cocina({ id: '' }), cocina({ id: 'b1d0c0de-0000-4000-8000-000000000002', name: '   ' }), cocina()]);
    expect(list.map((k) => k.id)).toEqual([KITCHEN]);
  });

  it('a line it cannot read leaves its publication; a publication left with none leaves her kitchen, which stays — quiet', () => {
    const broken = cocina({
      on_offer: [
        { id: 'p-1', pickup_start: '2026-11-05T23:30:00+00:00', pickup_end: '2026-11-06T00:15:00+00:00', lines: [{ line_no: 1, name: 'Sopa', unit_price: 60, quantity: '1.000' }] },
        { id: 'p-2', pickup_start: '2026-11-05T23:30:00+00:00', pickup_end: '2026-11-06T00:15:00+00:00', lines: [
          { line_no: 1, name: 'Arroz', unit_price: '20.00', quantity: '1.000', surprise: false, usual_price: null, tags: ['desconocida'] },
          { line_no: 2, name: '', unit_price: '20.00', quantity: '1.000' },
        ] },
        { id: 'p-3', pickup_start: 'mañana', pickup_end: '2026-11-06T00:15:00+00:00', lines: [{ line_no: 1, name: 'Pan', unit_price: '5.00', quantity: '1.000' }] },
      ],
    });
    const [k] = kitchensFrom([broken]);
    expect(k.offers.map((o) => o.id)).toEqual(['p-2']);
    expect(k.offers[0].dishes.map((d) => d.name)).toEqual(['Arroz']);
    expect(k.offers[0].dishes[0].tags).toEqual([]);
    expect(kitchensFrom([cocina({ on_offer: null })])[0].offers).toEqual([]);
  });

  it('an unreadable summary is no pattern, not a broken card', () => {
    const [k] = kitchensFrom([cocina({ summary: { weekdays: [1, 2], usual_hour: 25, last_day: 'ayer', repeats: 'x' } })]);
    expect(k.summary).toEqual({ weekdays: [0, 0, 0, 0, 0, 0, 0], usualHour: null, lastDay: null, repeats: [] });
  });

  it('an answer that is not a list is no kitchens', () => {
    expect(kitchensFrom(null)).toEqual([]);
    expect(kitchensFrom({ id: KITCHEN })).toEqual([]);
  });

  it('a colour this build does not know is her trade’s default, not an error', () => {
    expect(kitchensFrom([cocina({ page: { color: 'turquesa' } })])[0].page.color).toBeNull();
    expect(kitchensFrom([cocina({ page: null })])[0].page).toEqual({ sentence: null, color: null, cover: null, logo: null, mapsLink: null });
  });
});

describe('`10.5b-iii-a`: what reserving reads of the door (`0079`, `0080`)', () => {
  it('the codes are the database’s — cash, card, transfer; to go, here', () => {
    const sql = readFileSync(join(MIGRATIONS, readdirSync(MIGRATIONS).find((n) => n.startsWith('0079_')) as string), 'utf8');
    expect([...PAGOS]).toEqual(['efectivo', 'tarjeta', 'transferencia']);
    expect(sql).toContain("p_payment not in ('efectivo', 'tarjeta', 'transferencia')");
    expect([...COMERES]).toEqual(['llevar', 'aqui']);
    expect(sql).toContain("p_eat = 'llevar'");
    expect(sql).toContain("p_eat = 'aqui'");
  });

  it('cash is always taken, and first, whatever the door says', () => {
    expect(pagosOf(['tarjeta'])).toEqual(['efectivo', 'tarjeta']);
    expect(pagosOf(['transferencia', 'tarjeta', 'efectivo'])).toEqual(['efectivo', 'tarjeta', 'transferencia']);
    expect(pagosOf(['bitcoin'])).toEqual(['efectivo']);
    expect(pagosOf(null)).toEqual(['efectivo']);
  });

  it('the ways, para llevar first; none read is para llevar, the door’s own default', () => {
    expect(comeresOf(['aqui', 'llevar'])).toEqual(['llevar', 'aqui']);
    expect(comeresOf(['aqui'])).toEqual(['aqui']);
    expect(comeresOf([])).toEqual(['llevar']);
    expect(comeresOf(undefined)).toEqual(['llevar']);
  });

  it('who may reserve: a whole per cent, else everyone', () => {
    expect(minScoreOf(85)).toBe(85);
    expect(minScoreOf(null)).toBeNull();
    expect(minScoreOf('80')).toBeNull();
    expect(minScoreOf(80.5)).toBeNull();
    expect(minScoreOf(0)).toBeNull();
  });

  it('the desechable: centavos, or none — a charge it cannot read is never invented', () => {
    expect(desechableOf('5.00')).toBe(500);
    expect(desechableOf(null)).toBeNull();
    expect(desechableOf(5)).toBeNull();
    expect(desechableOf('0.00')).toBeNull();
  });

  it('a line from a door before `0079` is to go only', () => {
    const viejo = cocina({
      on_offer: [{ id: 'p-1', pickup_start: '2026-11-05T23:30:00+00:00', pickup_end: '2026-11-06T00:15:00+00:00', lines: [{ line_no: 1, name: 'Sopa', unit_price: '60.00', quantity: '1.000' }] }],
      payment: undefined,
      eat: undefined,
      min_score: undefined,
    });
    const [k] = kitchensFrom([viejo]);
    expect(k.offers[0].dishes[0]).toMatchObject({ llevar: true, aqui: false });
    expect(k.offers[0].desechableCentavos).toBeNull();
    expect([k.pagos, k.comeres, k.minScore]).toEqual([['efectivo'], ['llevar'], null]);
  });
});

describe('the tags', () => {
  it('are `0072`’s six, in the drawing’s order', () => {
    const sql = readFileSync(join(MIGRATIONS, readdirSync(MIGRATIONS).find((n) => n.startsWith('0072_')) as string), 'utf8');
    const known = /tags <@ array\[([^\]]+)\]/.exec(sql)?.[1].split(',').map((t) => t.trim().replace(/'/g, ''));
    expect([...TAGS]).toEqual(known);
  });
});

describe('her trade’s name — `kitchen_giros()`, read beside the door (`10.5-iv-a-ii`)', () => {
  const sql = readFileSync(join(MIGRATIONS, readdirSync(MIGRATIONS).find((n) => n.startsWith('0072_')) as string), 'utf8');

  it('is `0072`’s function, granted to anyone signed in, answering code and label — nothing of a business', () => {
    expect(KITCHEN_GIROS).toBe('kitchen_giros');
    expect(sql).toMatch(/create function public\.kitchen_giros\(\)/);
    expect(sql).toMatch(/grant execute on function public\.kitchen_giros\(\) to authenticated;/);
    expect(sql).toMatch(/jsonb_build_object\('code', t\.code, 'label', t\.label\)/);
    expect(read('api/calls.ts')).toMatch(/supabase\.rpc\(KITCHEN_GIROS\)/);
  });

  it('a row with no code or label is dropped, never drawn blank; the name trimmed', () => {
    expect(girosFrom([{ code: 'giro-fonda', label: ' Fonda o cocina económica ' }, { code: '', label: 'x' }, { code: 'giro-x' }, null, 'giro'])).toEqual([
      { code: 'giro-fonda', label: 'Fonda o cocina económica' },
    ]);
    expect(girosFrom(null)).toEqual([]);
  });

  it('her trade’s name, or none — no trade, a code the list no longer has, or the list not in yet', () => {
    const giros = girosFrom([{ code: 'giro-fonda', label: 'Fonda o cocina económica' }]);
    expect(giroLabel(giros, 'giro-fonda')).toBe('Fonda o cocina económica');
    expect(giroLabel(giros, 'giro-mariscos')).toBeNull();
    expect(giroLabel(giros, null)).toBeNull();
    expect(giroLabel(undefined, 'giro-fonda')).toBeNull();
  });

  it('cached in memory under the login, as every read here', () => {
    expect(girosKey('u-1')).toEqual(['itacate', 'giros', 'u-1']);
    expect(girosKey(null)).toEqual(['itacate', 'giros', '']);
    expect(girosKey('u-1')[0]).toBe(COCINAS_KEY[0]);
  });
});
