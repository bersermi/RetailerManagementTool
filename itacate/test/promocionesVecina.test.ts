import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { promocionesOf, toKitchen, type Kitchen, type KitchenRow } from '@/api/cocinas';
import { tarjetasDe, type Orden } from '@/lib/lista';
import { promocionesDeMisCocinas } from '@/lib/misCocinas';
import { bandasDe, marcaDeOferta, marcaDeSuPromocion, promocionDe } from '@/lib/paginas';
import { ES } from '@/strings';

// ============================================================================
// PROMOTIONS WHERE A NEIGHBOUR SEES THEM — plan task `10.9g-iii`, on the door's `promotions` and each offer's
// `promotion_id` (`0087`). What the door sends is read (`promocionesOf`, `toKitchen`), and what each screen
// draws is pinned here: her page's band (the newest, *y 2 más*), the mark on an offer that joined one, a quiet
// kitchen's mark, *Mis cocinas*' lines — and that no order reads a promotion (G38: it never moves a dish up).
// The words are Wera Cocina's (`test/gemelos.test.ts` holds them); the screens are read as text below, since
// no check sees a screen (ADR-035 §2.11).
// ============================================================================

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const code = (path: string) => readFileSync(join(ROOT, 'itacate/src', path), 'utf8');

let before: string | undefined;
beforeAll(() => {
  before = process.env.TZ;
  process.env.TZ = 'America/Mexico_City';
});
afterAll(() => {
  if (before === undefined) delete process.env.TZ;
  else process.env.TZ = before;
});

/** A promotion as the door writes it (`0087`'s nine keys). */
const promo = (id: string, kind: string, patch: Record<string, unknown> = {}) => ({
  id,
  kind,
  what: `Lo de ${id}`,
  more: null,
  image_path: null,
  days: [1, 2, 3, 4, 5, 6, 7],
  starts_on: '2026-11-19',
  ends_on: '2026-12-17',
  conditions: 'Todos los días, del 19 de noviembre al 17 de diciembre de 2026, en Fonda Doña Mari, Sabino 12, Santa María la Ribera.',
  ...patch,
});

/** Thursday 19 November 2026, at a local hour. */
const jueves = (hour: number, minute = 0) => new Date(2026, 10, 19, hour, minute);

const linea = (n: number, price = '60.00') => ({
  line_no: n,
  name: `Platillo ${n}`,
  description: null,
  tags: [],
  unit_price: price,
  quantity: '4.000',
  surprise: false,
  usual_price: null,
  image_path: null,
  para_llevar: true,
  para_aqui: false,
});

const oferta = (id: string, promotionId: string | null, desde = jueves(13), hasta = jueves(16), price = '60.00') => ({
  id,
  pickup_start: desde.toISOString(),
  pickup_end: hasta.toISOString(),
  container_price: null,
  promotion_id: promotionId,
  lines: [linea(1, price)],
});

const cocina = (id: string, patch: Partial<Record<keyof KitchenRow, unknown>> = {}): Kitchen =>
  toKitchen({
    id,
    name: `Fonda ${id}`,
    giro: 'giro-fonda',
    address: { street: 'Sabino', street_number: '12', colonia: 'Santa María la Ribera', city: 'Ciudad de México', postal_code: '06400' },
    directions: null,
    point: null,
    page: null,
    on_offer: [],
    summary: null,
    payment: ['efectivo'],
    eat: ['llevar'],
    min_score: null,
    stars: null,
    features: ['promociones'],
    card: null,
    promotions: [],
    ...patch,
  } as KitchenRow);

describe('the door’s promotions, read (`promocionesOf`)', () => {
  it('each kind, its words and days as the door wrote them — the door’s order kept (newest first)', () => {
    const leidas = promocionesOf([
      promo('c', 'clientes'),
      promo('d', 'dia', { days: [4], more: 'Pozole rojo o verde, grande, con tostadas.' }),
      promo('t', 'temporada'),
      promo('n', 'nuevo'),
    ]);
    expect(leidas.map((p) => [p.id, p.tipo])).toEqual([
      ['c', 'clientes'],
      ['d', 'dia'],
      ['t', 'temporada'],
      ['n', 'nuevo'],
    ]);
    expect(leidas[1]).toEqual({
      id: 'd',
      tipo: 'dia',
      loQue: 'Lo de d',
      mas: 'Pozole rojo o verde, grande, con tostadas.',
      dias: [4],
      hasta: '2026-12-17',
      condiciones: 'Todos los días, del 19 de noviembre al 17 de diciembre de 2026, en Fonda Doña Mari, Sabino 12, Santa María la Ribera.',
    });
  });

  it('her conditions keep their line breaks (`0087` allows them); only the ends are trimmed', () => {
    const [p] = promocionesOf([promo('a', 'nuevo', { conditions: '  Solo en la comida.\nNo aplica con otras.  ' })]);
    expect(p.condiciones).toBe('Solo en la comida.\nNo aplica con otras.');
  });

  it('its days in ISO’s order, whatever order the door wrote them in', () => {
    expect(promocionesOf([promo('a', 'dia', { days: [5, 1, 3] })])[0].dias).toEqual([1, 3, 5]);
  });

  it('⚠️ one it cannot read is left out, never the kitchen: a kind it does not know above all', () => {
    const leidas = promocionesOf([
      promo('later', 'cumpleanos'),
      promo('noday', 'dia', { days: [] }),
      promo('badday', 'dia', { days: [8] }),
      promo('nowhat', 'nuevo', { what: '  ' }),
      promo('nocond', 'nuevo', { conditions: '' }),
      promo('noend', 'nuevo', { ends_on: '17/12/2026' }),
      'not a promotion',
      null,
      promo('ok', 'nuevo'),
      promo('ok', 'nuevo', { what: 'twice' }),
    ]);
    expect(leidas.map((p) => p.id)).toEqual(['ok']);
    expect(leidas[0].loQue).toBe('Lo de ok');
    expect(promocionesOf(null)).toEqual([]);
    expect(promocionesOf('[]')).toEqual([]);
  });

  it('a kitchen whose `promotions` the door left out reads as none — an older door, or a later shape', () => {
    expect(cocina('k', { promotions: undefined }).promociones).toEqual([]);
    expect(cocina('k', { promotions: { a: 1 } }).promociones).toEqual([]);
  });
});

describe('the mark an offer wears (`Offer.promocion`)', () => {
  it('kept while its promotion is one of hers the door sends', () => {
    const k = cocina('k', { promotions: [promo('p1', 'dia', { days: [4] })], on_offer: [oferta('o1', 'p1'), oferta('o2', null)] });
    expect(k.offers.map((o) => o.promocion)).toEqual(['p1', null]);
    expect(promocionDe(k, k.offers[0])?.id).toBe('p1');
    expect(promocionDe(k, k.offers[1])).toBeNull();
  });

  it('⚠️ none when its promotion is not among hers — a mark with no band to explain it is never drawn', () => {
    const k = cocina('k', { promotions: [promo('later', 'cumpleanos')], on_offer: [oferta('o1', 'later'), oferta('o2', 'gone')] });
    expect(k.offers.map((o) => o.promocion)).toEqual([null, null]);
    expect(k.offers.map((o) => marcaDeOferta(k, o))).toEqual([null, null]);
  });

  it('its words are its kind’s (call 25) — *Un día especial*’s are its days', () => {
    const k = cocina('k', {
      promotions: [promo('a', 'nuevo'), promo('b', 'temporada'), promo('c', 'dia', { days: [4] }), promo('d', 'dia'), promo('e', 'clientes'), promo('f', 'dia', { days: [1, 3, 5] })],
      on_offer: ['a', 'b', 'c', 'd', 'e', 'f'].map((id, i) => oferta(`o${i}`, id, jueves(13, i), jueves(16, i))),
    });
    expect(k.offers.map((o) => marcaDeOferta(k, o)?.texto)).toEqual([
      'Nuevo',
      'De temporada',
      'Los jueves',
      'Especial',
      'Con tu tarjeta de lealtad',
      'Los lunes, miércoles y viernes',
    ]);
    expect(k.offers.map((o) => marcaDeOferta(k, o)?.icono)).toEqual(['creation', 'leaf', 'calendar-star', 'calendar-star', 'gift-outline', 'calendar-star']);
    expect(marcaDeOferta(k, k.offers[2])?.ayuda).toBe('Promoción: Los jueves');
  });
});

describe('her page’s band (G29: the newest, and *y 2 más*)', () => {
  const k = cocina('k', {
    promotions: [
      promo('newest', 'dia', { what: 'Jueves pozolero', more: 'Pozole rojo o verde, grande, con tostadas.', days: [4] }),
      promo('middle', 'nuevo'),
      promo('oldest', 'temporada', { ends_on: '2027-01-06' }),
    ],
  });

  it('every band in the door’s order, each as Wera Cocina’s preview drew it', () => {
    const bandas = bandasDe(k);
    expect(bandas.map((b) => b.key)).toEqual(['newest', 'middle', 'oldest']);
    expect(bandas[0]).toEqual({
      key: 'newest',
      icono: 'calendar-star',
      marca: 'Los jueves',
      hasta: 'hasta el 17 de diciembre',
      loQue: 'Jueves pozolero',
      mas: 'Pozole rojo o verde, grande, con tostadas.',
      condiciones: promo('x', 'nuevo').conditions,
    });
    expect(bandas[2].hasta).toBe('hasta el 6 de enero');
  });

  it('*y 2 más*, and what a screen reader says of it', () => {
    expect(ES.pagina.yMas(2)).toBe('y 2 más');
    expect(ES.pagina.yMasAyuda(2)).toBe('Ver las otras 2 promociones');
    expect(ES.pagina.yMasAyuda(1)).toBe('Ver la otra promoción');
  });

  it('none, no band — the page draws no *Promoción* at all', () => {
    expect(bandasDe(cocina('quiet'))).toEqual([]);
  });
});

describe('a kitchen with a promotion and nothing on offer (`0087` keeps her in the door)', () => {
  it('her quiet card wears her newest promotion’s mark, so it says why she is there', () => {
    const k = cocina('k', { promotions: [promo('a', 'nuevo'), promo('b', 'temporada')] });
    expect(marcaDeSuPromocion(k)).toEqual({ icono: 'creation', texto: 'Nuevo', ayuda: 'Promoción: Nuevo' });
    expect(marcaDeSuPromocion(cocina('none'))).toBeNull();
  });

  it('and she is one quiet card in the list, among the other quiet kitchens', () => {
    const tarjetas = tarjetasDe([cocina('k', { promotions: [promo('a', 'nuevo')] })], null, new Map(), jueves(12));
    expect(tarjetas.map((t) => t.kind)).toEqual(['cocina']);
  });
});

describe('⚠️ a promotion never moves a dish up the list (G38) — no order reads it', () => {
  const sin = [
    cocina('a', { on_offer: [oferta('a1', null, jueves(13), jueves(16), '50.00')] }),
    cocina('b', { on_offer: [oferta('b1', null, jueves(14), jueves(17), '80.00')] }),
    cocina('c', { on_offer: [oferta('c1', null, jueves(12, 30), jueves(15), '70.00')] }),
    cocina('d'),
  ];
  /** The same kitchens, with ONE promoted — its promotion sent, every offer of it marked. */
  const conUna = (id: string): Kitchen[] =>
    sin.map((k) =>
      k.id !== id
        ? k
        : toKitchen({
            id: k.id,
            name: k.name,
            giro: 'giro-fonda',
            address: null,
            directions: null,
            point: null,
            page: null,
            on_offer: k.offers.map((o) => oferta(o.id, `p-${k.id}`, o.start, o.end, (o.dishes[0].priceCentavos / 100).toFixed(2))),
            summary: null,
            payment: null,
            eat: null,
            min_score: null,
            stars: null,
            features: ['promociones'],
            card: null,
            promotions: [promo(`p-${k.id}`, 'nuevo')],
          }),
    );

  // ⚠️ ONE AT A TIME, each order: an order that put a promoted card first moves at least one of them (the review of
  // `10.9g-iii` — with every kitchen promoted at once, such an order would have kept the same keys).
  for (const orden of ['ahora', 'cerca', 'barato'] as const satisfies readonly Orden[]) {
    it(`*${orden}*: whichever kitchen has the promotion — the quiet one too — the cards keep their order`, () => {
      const llaves = (cocinas: readonly Kitchen[]) => tarjetasDe(cocinas, null, new Map(), jueves(13, 30), orden).map((t) => t.key);
      const antes = llaves(sin);
      for (const k of sin) {
        const con = conUna(k.id);
        expect(con.find((x) => x.id === k.id)?.promociones.map((p) => p.id)).toEqual([`p-${k.id}`]);
        expect(llaves(con), `${orden}, ${k.id} promoted`).toEqual(antes);
      }
      // The baseline is not already sorted every way: a sort by promotion has something to move.
      expect(new Set(antes).size).toBe(4);
    });
  }

  it('and `@/lib/lista` never names a promotion', () => {
    expect(code('lib/lista.ts')).not.toMatch(/promoci/i);
  });
});

describe('*Mis cocinas*: a line per promotion of her kitchens (the page’s `pline`)', () => {
  const cocinas = [
    cocina('mari', { promotions: [promo('m2', 'dia', { what: 'Jueves pozolero', days: [4] }), promo('m1', 'nuevo', { what: 'Enchiladas potosinas', ends_on: '2026-11-30' })] }),
    cocina('espiga', { promotions: [promo('e1', 'temporada', { what: 'Rosca de reyes', ends_on: '2027-01-06' })] }),
    cocina('lejos', { promotions: [promo('x1', 'nuevo')] }),
  ];

  it('her kitchens in *Tus cocinas*’ order, each kitchen’s newest first — and only hers', () => {
    const lineas = promocionesDeMisCocinas(['espiga', 'mari', 'gone', 'mari'], cocinas);
    expect(lineas.map((l) => [l.key, l.cocinaId])).toEqual([
      ['e1', 'espiga'],
      ['m2', 'mari'],
      ['m1', 'mari'],
    ]);
    expect(lineas.map((l) => l.texto)).toEqual([
      'Rosca de reyes en Fonda espiga, hasta el 6 de enero',
      'Jueves pozolero en Fonda mari, hasta el 17 de diciembre',
      'Enchiladas potosinas en Fonda mari, hasta el 30 de noviembre',
    ]);
    expect(lineas[1].marca).toEqual({ icono: 'calendar-star', texto: 'Los jueves', ayuda: 'Promoción: Los jueves' });
    // What she offers in bold, as drawn: the two parts make the whole line.
    expect(lineas.map((l) => l.loQue + l.resto)).toEqual(lineas.map((l) => l.texto));
    expect(lineas[1].loQue).toBe('Jueves pozolero');
  });

  it('none before the door answers, and none for a kitchen it does not send', () => {
    expect(promocionesDeMisCocinas(['mari'], undefined)).toEqual([]);
    expect(promocionesDeMisCocinas(['gone'], cocinas)).toEqual([]);
  });
});

describe('the door’s text — newest first, and an offer’s mark only while its promotion is shown', () => {
  const MIGRATIONS = join(ROOT, 'supabase/migrations');
  const files = readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort();
  const last = files.filter((f) => /create (or replace )?function public\.on_offer_now\(/i.test(readFileSync(join(MIGRATIONS, f), 'utf8'))).pop() as string;
  const text = readFileSync(join(MIGRATIONS, last), 'utf8').replace(/\s+/g, ' ');

  it('`promotions` newest first — the band’s *newest* is the first one read', () => {
    expect(text).toContain("order by p.created_at desc, p.id) from servicio.promotion p where p.workspace_id = k.id and servicio.promotion_shown(p)");
  });

  it('`promotion_id` only while that promotion is shown — the same rule `toKitchen` keeps', () => {
    expect(text).toContain("'promotion_id', (select p.id from servicio.promotion p where p.id = li.promotion_id and servicio.promotion_shown(p))");
  });
});

describe('the screens, read as text', () => {
  it('her page: *Promoción* after *Seguir*, the newest band, the rest behind *y N más*, *Condiciones* opening hers', () => {
    const page = code('ui/PaginaDeCocina.tsx');
    expect(page).toMatch(/import \{ BandaPromocion \} from '@\/ui\/BandaPromocion';/);
    expect(page).toMatch(/const bandas = bandasDe\(cocina\);/);
    expect(page).toMatch(/\(todas \? bandas : bandas\.slice\(0, 1\)\)\.map/);
    expect(page).toMatch(/!todas && bandas\.length > 1 &&/);
    expect(page).toMatch(/\{ES\.pagina\.yMas\(bandas\.length - 1\)\}/);
    expect(page).toMatch(/onCondiciones=\{\(\) => alternar\(banda\.key\)\}/);
    expect(page.indexOf('{seguir}')).toBeLessThan(page.indexOf('{ES.pagina.promocion}'));
    expect(page.indexOf('{ES.pagina.promocion}')).toBeLessThan(page.indexOf('{ES.pagina.hoy}'));
  });

  it('a dish that joined one: its band before the price; its mark on her page’s row and on the list’s card', () => {
    const dish = code('ui/PaginaDePlatillo.tsx');
    expect(dish).toMatch(/const promocion = promocionDe\(cocina, oferta\);/);
    expect(dish.indexOf('<BandaPromocion')).toBeLessThan(dish.indexOf('<Precio platillo={platillo} color={color} grande />'));
    expect(code('ui/RenglonPlatillo.tsx')).toMatch(/<MarcaPromocion icono=\{promocion\.icono\} texto=\{promocion\.texto\} chica \/>/);
    const card = code('ui/TarjetaPlatillo.tsx');
    expect(card).toMatch(/const promocion = marcaDeOferta\(cocina, oferta\);/);
    expect(card).toMatch(/position: 'absolute',\s*top: SIZE\.rowGap,\s*left: SIZE\.rowGap,/);
    // On the photo, terracotta words on white (the drawing's `.badge-promo`): the solid mark vanished on a warm colour.
    expect(card).toMatch(/backgroundColor: PALETTE\.superficie,\s*\}\}\s*>\s*<MaterialCommunityIcons name=\{promocion\.icono\} size=\{13\} color=\{PALETTE\.marca\} \/>/);
  });

  it('a quiet kitchen’s card, and *Mis cocinas*’ lines under *Tus cocinas*', () => {
    expect(code('ui/TarjetaCocina.tsx')).toMatch(/const promocion = marcaDeSuPromocion\(cocina\);/);
    const mis = code('app/(vecino)/(tabs)/mis-cocinas.tsx');
    expect(mis).toMatch(/promocionesDeMisCocinas\(\[\.\.\.filas\.map\(\(fila\) => fila\.seguida\.id\), \.\.\.soloTarjeta\.map\(\(card\) => card\.id\)\], cocinas\.data\)/);
    expect(mis.indexOf('<LineaPromocion')).toBeLessThan(mis.indexOf('ES.misCocinas.anteriores'));
  });

  it('⚠️ terracotta, never the action’s colour (the drawing: a message, not a price)', () => {
    const banda = code('ui/BandaPromocion.tsx');
    expect(banda).toContain('backgroundColor: PALETTE.marca,');
    expect(banda).toContain('backgroundColor: PALETTE.marcaSuave,');
    expect(banda).not.toMatch(/PALETTE\.accion/);
    expect(code('app/(vecino)/(tabs)/mis-cocinas.tsx')).toMatch(/promocion: \{[\s\S]*?backgroundColor: PALETTE\.marcaSuave,/);
  });
});
