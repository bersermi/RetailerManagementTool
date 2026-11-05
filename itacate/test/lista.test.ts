import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { Dish, Kitchen, Offer, Punto, Summary } from '@/api/cocinas';
import { EMPTY_PAGE } from '@/api/pagina';
import {
  PATRON_MINIMO,
  ahorroDe,
  cuandoPublica,
  diasAtras,
  diasTexto,
  distanciasDe,
  mismasDistancias,
  patronDe,
  precioTexto,
  publicoTexto,
  quedanTexto,
  tarjetasDe,
  ventanaTexto,
} from '@/lib/lista';
import { ES } from '@/strings';

// ============================================================================
// THE LIST OF WHAT IS CLOSE TO HER. Plan task `10.5-iv-a-i`.
//
// ⚠️ THE OWNER'S WORDS ARE ASSERTED WORD FOR WORD, NOT READ BACK FROM `ES`: his
// ruling of 2026-11-01, late, wrote the quiet kitchen's line — *Suele publicar entre
// semana, hacia las 17:00*, otherwise *Publicó ayer* or *Publicó el martes* — and a
// sentence compared with itself would pass whatever it said.
//
// ⚠️ EVERY DAY HERE IS A LOCAL DAY: the zone is pinned to Mexico City's, as Wera
// Cocina's window tests pin it, and the first case asserts the pin took; every local
// moment is made inside its `it`, after the pin. Run `TZ=UTC npx vitest run` for CI's side.
// ============================================================================

const ZONE = 'America/Mexico_City';
let before: string | undefined;
beforeAll(() => {
  before = process.env.TZ;
  process.env.TZ = ZONE;
});
afterAll(() => {
  if (before === undefined) delete process.env.TZ;
  else process.env.TZ = before;
});

/** A local moment in Mexico City — month counted from 1. */
const local = (y: number, mo: number, d: number, h = 12, mi = 0) => new Date(y, mo - 1, d, h, mi);

const AQUI: Punto = { latitude: 19.4326, longitude: -99.1332 };
/** About 1.1 km north of `AQUI`, and about 2.2 km. */
const NORTE_1: Punto = { latitude: 19.4426, longitude: -99.1332 };
const NORTE_2: Punto = { latitude: 19.4526, longitude: -99.1332 };

function plato(lineNo: number, over: Partial<Dish> = {}): Dish {
  return {
    lineNo,
    name: `Plato ${lineNo}`,
    description: null,
    tags: [],
    priceCentavos: 6000,
    count: 2,
    surprise: false,
    usualCentavos: null,
    photo: null,
    ...over,
  };
}

function oferta(id: string, start: Date, end: Date, dishes: Dish[]): Offer {
  return { id, start, end, dishes };
}

const SIN_RESUMEN: Summary = { weekdays: [0, 0, 0, 0, 0, 0, 0], usualHour: null, lastDay: null, repeats: [] };

function cocina(id: string, name: string, point: Punto | null, offers: Offer[], summary: Summary = SIN_RESUMEN): Kitchen {
  return {
    id,
    name,
    giro: 'giro-fonda',
    address: { street: 'Sabino', number: '12', colonia: 'Santa María la Ribera', city: 'Cuauhtémoc', postalCode: '06400' },
    directions: null,
    point: point === null ? null : { ...point, source: 'pin' },
    page: EMPTY_PAGE,
    offers,
    summary,
  };
}

describe('the zone is pinned', () => {
  it('to Mexico City’s, six hours behind UTC in November', () => {
    expect(local(2026, 11, 5, 17).getTimezoneOffset()).toBe(360);
  });
});

describe('the cards — one per dish on offer, one per quiet kitchen', () => {
  it('a kitchen on offer is a card per dish, in her order; a quiet one is one card', () => {
    const ahora = local(2026, 11, 5, 16);
    const fonda = cocina('k-1', 'Fonda Doña Mari', NORTE_1, [
      oferta('o-1', local(2026, 11, 5, 17, 30), local(2026, 11, 5, 18, 15), [plato(1), plato(2, { surprise: true })]),
    ]);
    const quieta = cocina('k-2', 'Cocina Lupita', NORTE_2, []);
    const cards = tarjetasDe([quieta, fonda], AQUI, new Map(), ahora);
    expect(cards.map((c) => [c.kind, c.key])).toEqual([
      ['platillo', 'platillo:o-1:1'],
      ['platillo', 'platillo:o-1:2'],
      ['cocina', 'cocina:k-2'],
    ]);
  });

  it('a window that ended while she looked turns its kitchen quiet, without asking the door', () => {
    const fonda = cocina('k-1', 'Fonda Doña Mari', NORTE_1, [
      oferta('o-1', local(2026, 11, 5, 17, 30), local(2026, 11, 5, 18, 15), [plato(1)]),
    ]);
    expect(tarjetasDe([fonda], AQUI, new Map(), local(2026, 11, 5, 18, 14))[0].kind).toBe('platillo');
    expect(tarjetasDe([fonda], AQUI, new Map(), local(2026, 11, 5, 18, 15))[0].kind).toBe('cocina');
  });
});

describe('nearest first — every kitchen the door sends', () => {
  it('by the distance from her, the door’s point else what her phone found', () => {
    const ahora = local(2026, 11, 5, 12);
    const lejos = cocina('k-lejos', 'A Lejos', NORTE_2, []);
    const cerca = cocina('k-cerca', 'Z Cerca', NORTE_1, []);
    const buscada = cocina('k-buscada', 'M Buscada', null, []);
    const cards = tarjetasDe([lejos, buscada, cerca], AQUI, new Map([['k-buscada', AQUI]]), ahora);
    expect(cards.map((c) => c.cocina.id)).toEqual(['k-buscada', 'k-cerca', 'k-lejos']);
    expect(cards[0].metros).toBe(0);
    expect(cards[1].metros).toBeGreaterThan(1050);
    expect(cards[1].metros).toBeLessThan(1150);
  });

  it('a kitchen whose place is not known yet goes last — never left out', () => {
    const ahora = local(2026, 11, 5, 12);
    const cards = tarjetasDe(
      [cocina('k-sin', 'A Sin punto', null, []), cocina('k-con', 'Z Con punto', NORTE_2, [])],
      AQUI,
      new Map(),
      ahora,
    );
    expect(cards.map((c) => [c.cocina.id, c.metros === null])).toEqual([
      ['k-con', false],
      ['k-sin', true],
    ]);
  });

  it('kitchens at one distance by name, accents and case aside; a kitchen’s own cards in her order', () => {
    const ahora = local(2026, 11, 5, 12);
    const tarde = oferta('o-tarde', local(2026, 11, 5, 18), local(2026, 11, 5, 19), [plato(1)]);
    const temprano = oferta('o-temprano', local(2026, 11, 5, 13), local(2026, 11, 5, 14), [plato(1), plato(2)]);
    const cards = tarjetasDe(
      [cocina('k-b', 'Bárbara', NORTE_1, [tarde, temprano]), cocina('k-a', 'alma', NORTE_1, [])],
      AQUI,
      new Map(),
      ahora,
    );
    expect(cards.map((c) => c.key)).toEqual(['cocina:k-a', 'platillo:o-temprano:1', 'platillo:o-temprano:2', 'platillo:o-tarde:1']);
  });
});

describe('what a dish’s card says', () => {
  it('the price, the vale struck through and the saving — the drawing’s $60, $120, −50%', () => {
    expect(precioTexto(plato(1, { priceCentavos: 6000, usualCentavos: 12000 }))).toEqual({ precio: '$60', vale: '$120', ahorro: '−50%' });
    expect(precioTexto(plato(1, { priceCentavos: 6550, usualCentavos: null }))).toEqual({ precio: '$65.50', vale: null, ahorro: null });
  });

  it('a saving as a whole percent of the vale; none under one percent, none without a vale above the price', () => {
    expect(ahorroDe(4500, 9000)).toBe(50);
    expect(ahorroDe(5900, 6000)).toBe(2);
    expect(ahorroDe(9996, 10000)).toBeNull();
    expect(ahorroDe(6000, 6000)).toBeNull();
    expect(ahorroDe(6000, null)).toBeNull();
  });

  it('Quedan 2, Último — and nothing for a fraction', () => {
    expect(quedanTexto(plato(1, { count: 2 }))).toBe('Quedan 2');
    expect(quedanTexto(plato(1, { count: 1 }))).toBe('Último');
    expect(quedanTexto(plato(1, { count: null }))).toBeNull();
  });

  it('the window in Wera Cocina’s words', () => {
    const ahora = local(2026, 11, 5, 16);
    expect(ventanaTexto(oferta('o', local(2026, 11, 5, 17, 30), local(2026, 11, 5, 18, 15), []), ahora)).toBe('Hoy · 17:30 a 18:15');
    expect(ventanaTexto(oferta('o', local(2026, 11, 6, 13), local(2026, 11, 6, 14), []), ahora)).toBe('Mañana · 13:00 a 14:00');
  });
});

describe('what a quiet kitchen’s card says — his words of 2026-11-01, late', () => {
  const resumen = (weekdays: number[], usualHour: number | null, lastDay: string | null): Summary => ({
    weekdays,
    usualHour,
    lastDay,
    repeats: [],
  });

  it('three publications in four weeks make a pattern', () => {
    expect(PATRON_MINIMO).toBe(3);
    const ahora = local(2026, 11, 5, 12);
    expect(cuandoPublica(resumen([1, 1, 1, 1, 1, 0, 0], 17, '2026-11-04'), ahora)).toBe('Suele publicar entre semana, hacia las 17:00');
    expect(cuandoPublica(resumen([0, 1, 0, 1, 0, 0, 0], 17, '2026-11-03'), ahora)).toBe('Publicó el martes');
  });

  it('otherwise, when she last published: Publicó hoy, ayer, el martes, el 26 de octubre', () => {
    const jueves = local(2026, 11, 5, 9);
    expect(publicoTexto('2026-11-05', jueves)).toBe('Publicó hoy');
    expect(publicoTexto('2026-11-04', jueves)).toBe('Publicó ayer');
    expect(publicoTexto('2026-11-03', jueves)).toBe('Publicó el martes');
    expect(publicoTexto('2026-10-30', jueves)).toBe('Publicó el viernes');
    expect(publicoTexto('2026-10-29', jueves)).toBe('Publicó el 29 de octubre');
    expect(publicoTexto('2026-10-26', jueves)).toBe('Publicó el 26 de octubre');
  });

  it('a day after today — a withdrawn publication for tomorrow — is today’s; a day it cannot read, nothing', () => {
    expect(publicoTexto('2026-11-06', local(2026, 11, 5))).toBe('Publicó hoy');
    expect(publicoTexto('ayer', local(2026, 11, 5))).toBeNull();
  });

  it('her days in words', () => {
    expect(diasTexto([1, 1, 1, 1, 1, 1, 1])).toBe('todos los días');
    expect(diasTexto([1, 1, 1, 1, 1, 1, 0])).toBe('todos los días');
    expect(diasTexto([1, 1, 1, 1, 1, 0, 0])).toBe('entre semana');
    expect(diasTexto([1, 1, 1, 1, 0, 0, 0])).toBe('entre semana');
    expect(diasTexto([0, 0, 0, 0, 0, 2, 1])).toBe('los fines de semana');
    expect(diasTexto([0, 0, 0, 0, 0, 3, 0])).toBe('los sábados');
    expect(diasTexto([3, 0, 0, 0, 0, 0, 0])).toBe('los lunes');
    expect(diasTexto([1, 0, 0, 2, 0, 0, 0])).toBe('los lunes y jueves');
    expect(diasTexto([1, 0, 1, 0, 1, 0, 0])).toBe('los lunes, miércoles y viernes');
    expect(diasTexto([1, 1, 1, 0, 0, 1, 0])).toBe('los lunes, martes, miércoles y sábados');
    expect(diasTexto([1, 1, 1, 1, 0, 1, 0])).toBe('casi todos los días');
    expect(diasTexto([0, 0, 0, 0, 0, 0, 0])).toBeNull();
  });

  it('the hour as she says it — la 1:00, las 17:00', () => {
    expect(ES.cerca.hacia(1)).toBe('hacia la 1:00');
    expect(ES.cerca.hacia(13)).toBe('hacia las 13:00');
    expect(cuandoPublica(resumen([0, 0, 0, 0, 0, 2, 1], 13, '2026-11-01'), local(2026, 11, 5))).toBe(
      'Suele publicar los fines de semana, hacia las 13:00',
    );
  });

  it('nothing at all only when the door sent nothing to say', () => {
    expect(cuandoPublica(resumen([0, 0, 0, 0, 0, 0, 0], null, null), local(2026, 11, 5))).toBeNull();
  });

  // `10.5-iv-a-ii`: her page says the pattern alone, and counts the days itself.
  it('the pattern on its own — the card’s first choice, and her page’s line', () => {
    expect(patronDe(resumen([1, 1, 1, 1, 1, 0, 0], 17, '2026-11-04'))).toBe('Suele publicar entre semana, hacia las 17:00');
    expect(patronDe(resumen([0, 1, 0, 1, 0, 0, 0], 17, '2026-11-03'))).toBeNull();
    expect(patronDe(resumen([1, 1, 1, 0, 0, 0, 0], null, '2026-11-03'))).toBeNull();
  });

  it('days back from her last day: 0 today, 1 yesterday, −1 a day still to come, nothing unreadable', () => {
    const jueves = local(2026, 11, 5, 23, 30);
    expect(diasAtras('2026-11-05', jueves)).toBe(0);
    expect(diasAtras('2026-11-04', jueves)).toBe(1);
    expect(diasAtras('2026-11-06', jueves)).toBe(-1);
    expect(diasAtras('2026-10-29', jueves)).toBe(7);
    expect(diasAtras('5 de noviembre', jueves)).toBeNull();
  });
});

describe('what the list hands her two pages — each kitchen’s distance (`10.5-iv-a-ii`)', () => {
  it('one number per kitchen, as its cards were measured; none for a kitchen whose place is not known', () => {
    const ahora = local(2026, 11, 5, 16);
    const fonda = cocina('k-1', 'Fonda Doña Mari', NORTE_1, [
      oferta('o-1', local(2026, 11, 5, 17, 30), local(2026, 11, 5, 18, 15), [plato(1), plato(2)]),
    ]);
    const quieta = cocina('k-2', 'Cocina Lupita', NORTE_2, []);
    const sinPunto = cocina('k-3', 'Taquería', null, []);
    const cards = tarjetasDe([fonda, quieta, sinPunto], AQUI, new Map(), ahora);
    const distancias = distanciasDe(cards);
    expect([...distancias.keys()].sort()).toEqual(['k-1', 'k-2']);
    expect(distancias.get('k-1')).toBe(cards.find((c) => c.cocina.id === 'k-1')?.metros);
    expect(distancias.get('k-2')).toBe(cards.find((c) => c.cocina.id === 'k-2')?.metros);
    expect(distanciasDe([]).size).toBe(0);
  });

  it('the same distances are the same answer — so a page is not drawn again for nothing', () => {
    expect(mismasDistancias(new Map([['k-1', 350]]), new Map([['k-1', 350]]))).toBe(true);
    expect(mismasDistancias(new Map([['k-1', 350]]), new Map([['k-1', 351]]))).toBe(false);
    expect(mismasDistancias(new Map([['k-1', 350]]), new Map([['k-2', 350]]))).toBe(false);
    expect(mismasDistancias(new Map([['k-1', 350]]), new Map([['k-1', 350], ['k-2', 1]]))).toBe(false);
    expect(mismasDistancias(new Map(), new Map())).toBe(true);
  });
});
