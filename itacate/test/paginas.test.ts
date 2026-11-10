import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { Dish, Kitchen, Offer, Summary } from '@/api/cocinas';
import { EMPTY_PAGE, mapsLinkOk } from '@/api/pagina';
import {
  DIRECCIONES_URL,
  alergiaDe,
  calleDe,
  cocinaDe,
  comoLlegarUrl,
  consulta,
  etiquetasDe,
  hoyDe,
  lineaDe,
  parametro,
  platilloDe,
  queYDondeDe,
  repetidosDe,
  verEnMapsUrl,
} from '@/lib/paginas';

// ============================================================================
// A KITCHEN'S PAGE AND A DISH'S. Plan task `10.5-iv-a-ii`.
//
// ⚠️ THE RULED WORDS ARE ASSERTED WORD FOR WORD, NOT READ BACK FROM `ES` — *Hoy no ha
// publicado* (his ruling of 2026-11-01, late), *Lo que suele ofrecer* and *Por hoy ya se
// terminó* (his of 2026-11-05, `10.5-v-a`: *Lo que suele publicar* and *Ya no tiene nada
// por hoy* before), the allergy line (the proposals page, ruled 2026-11-01): a sentence compared with itself would
// pass whatever it said. What Wera Cocina also says — the tags, *Ver en Google Maps* —
// is held to its file by `test/gemelos.test.ts`.
//
// ⚠️ EVERY DAY HERE IS A LOCAL DAY, the zone pinned to Mexico City's as the list's
// tests pin it; every local moment is made inside its `it`, after the pin. Run
// `TZ=UTC npx vitest run` for CI's side.
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
    llevar: true,
    aqui: false,
    ...over,
  };
}

const oferta = (id: string, start: Date, end: Date, dishes: Dish[]): Offer => ({ id, start, end, dishes, desechableCentavos: null });

const SIN_RESUMEN: Summary = { weekdays: [0, 0, 0, 0, 0, 0, 0], usualHour: null, lastDay: null, repeats: [] };

function cocina(over: Partial<Kitchen> = {}): Kitchen {
  return {
    id: 'k-1',
    name: 'Fonda Doña Mari',
    giro: 'giro-fonda',
    address: { street: 'Sabino', number: '12', colonia: 'Santa María la Ribera', city: 'Cuauhtémoc', postalCode: '06400' },
    directions: 'Portón verde, junto a la farmacia',
    point: { latitude: 19.452301, longitude: -99.159876, source: 'pin' },
    page: EMPTY_PAGE,
    offers: [],
    summary: SIN_RESUMEN,
    pagos: ['efectivo'],
    comeres: ['llevar'],
    minScore: null,
    estrellas: null,
    ...over,
  };
}

describe('the zone is pinned', () => {
  it('to Mexico City’s, six hours behind UTC in November', () => {
    expect(local(2026, 11, 5, 17).getTimezoneOffset()).toBe(360);
  });
});

describe('which kitchen and which dish a page is about', () => {
  it('a route’s parameter as one string, and a line’s number only when it is one', () => {
    expect(parametro('k-1')).toBe('k-1');
    expect(parametro(['k-1', 'k-2'])).toBe('k-1');
    expect(parametro(undefined)).toBe('');
    expect(lineaDe('1')).toBe(1);
    expect(lineaDe('10')).toBe(10);
    for (const malo of ['', '0', '-1', '1.5', '01', 'uno', '12345']) expect(lineaDe(malo), malo).toBeNull();
  });

  it('her kitchen, by her id in the door’s answer — none once the door no longer sends her', () => {
    const una = cocina();
    expect(cocinaDe([una], 'k-1')).toBe(una);
    expect(cocinaDe([una], 'k-2')).toBeNull();
    expect(cocinaDe(undefined, 'k-1')).toBeNull();
  });

  it('a dish on offer — its kitchen, its publication and its line', () => {
    const ahora = local(2026, 11, 5, 16);
    const o = oferta('o-1', local(2026, 11, 5, 17, 30), local(2026, 11, 5, 18, 15), [plato(1), plato(2, { surprise: true })]);
    const una = cocina({ offers: [o] });
    const estado = platilloDe([una], 'k-1', 'o-1', 2, ahora);
    expect(estado.kind).toBe('en-oferta');
    if (estado.kind === 'en-oferta') {
      expect(estado.cocina).toBe(una);
      expect(estado.oferta).toBe(o);
      expect(estado.platillo.lineNo).toBe(2);
    }
  });

  it('⚠️ over the moment its window ends, ya no está en oferta — with her kitchen, while the door sends her', () => {
    const o = oferta('o-1', local(2026, 11, 5, 17, 30), local(2026, 11, 5, 18, 15), [plato(1)]);
    const una = cocina({ offers: [o] });
    expect(platilloDe([una], 'k-1', 'o-1', 1, local(2026, 11, 5, 18, 14)).kind).toBe('en-oferta');
    expect(platilloDe([una], 'k-1', 'o-1', 1, local(2026, 11, 5, 18, 15))).toEqual({ kind: 'terminado', cocina: una });
  });

  it('taken down (the door asked again), a line she never had, or her kitchen gone: ya no está en oferta', () => {
    const ahora = local(2026, 11, 5, 16);
    const una = cocina({ offers: [oferta('o-1', local(2026, 11, 5, 17), local(2026, 11, 5, 18), [plato(1)])] });
    expect(platilloDe([una], 'k-1', 'o-2', 1, ahora)).toEqual({ kind: 'terminado', cocina: una });
    expect(platilloDe([una], 'k-1', 'o-1', 2, ahora)).toEqual({ kind: 'terminado', cocina: una });
    expect(platilloDe([una], 'k-1', 'o-1', null, ahora)).toEqual({ kind: 'terminado', cocina: una });
    expect(platilloDe([una], 'k-9', 'o-1', 1, ahora)).toEqual({ kind: 'terminado', cocina: null });
  });
});

describe('*Hoy*, on her page', () => {
  it('what she has on offer now, the earliest window first — less what ended', () => {
    const ahora = local(2026, 11, 5, 16);
    const tarde = oferta('o-2', local(2026, 11, 5, 19), local(2026, 11, 5, 20), [plato(1)]);
    const pronto = oferta('o-1', local(2026, 11, 5, 17), local(2026, 11, 5, 18), [plato(1)]);
    const acabada = oferta('o-0', local(2026, 11, 5, 13), local(2026, 11, 5, 15), [plato(1)]);
    const hoy = hoyDe(cocina({ offers: [tarde, acabada, pronto] }), ahora);
    expect(hoy.kind).toBe('oferta');
    if (hoy.kind === 'oferta') expect(hoy.ofertas.map((o) => o.id)).toEqual(['o-1', 'o-2']);
  });

  it('⚠️ his words: Hoy no ha publicado, then her pattern — Suele tener ofertas entre semana, hacia las 17:00', () => {
    const ahora = local(2026, 11, 5, 13, 30); // a Thursday
    const resumen: Summary = { weekdays: [2, 1, 1, 1, 1, 0, 0], usualHour: 17, lastDay: '2026-11-04', repeats: [] };
    expect(hoyDe(cocina({ summary: resumen }), ahora)).toEqual({
      kind: 'quieta',
      titulo: 'Hoy no ha publicado',
      linea: 'Suele tener ofertas entre semana, hacia las 17:00',
    });
  });

  it('with no pattern yet, Hoy no ha publicado and when she last did — as her card in the list says it', () => {
    const ahora = local(2026, 11, 5, 13, 30);
    const ayer: Summary = { ...SIN_RESUMEN, weekdays: [0, 0, 1, 0, 0, 0, 0], lastDay: '2026-11-04', usualHour: 17 };
    expect(hoyDe(cocina({ summary: ayer }), ahora)).toEqual({ kind: 'quieta', titulo: 'Hoy no ha publicado', linea: 'Publicó ayer' });
    const martes: Summary = { ...ayer, lastDay: '2026-11-03' };
    expect(hoyDe(cocina({ summary: martes }), ahora)).toEqual({ kind: 'quieta', titulo: 'Hoy no ha publicado', linea: 'Publicó el martes' });
    expect(hoyDe(cocina(), ahora)).toEqual({ kind: 'quieta', titulo: 'Hoy no ha publicado', linea: null });
  });

  it('⚠️ she did publish for today and it is over: Por hoy ya se terminó — never Hoy no ha publicado, never Publicó hoy', () => {
    const ahora = local(2026, 11, 5, 16);
    const acabada = oferta('o-0', local(2026, 11, 5, 13), local(2026, 11, 5, 15), [plato(1)]);
    const sinPatron: Summary = { ...SIN_RESUMEN, weekdays: [0, 0, 0, 1, 0, 0, 0], usualHour: 13, lastDay: '2026-11-05' };
    expect(hoyDe(cocina({ offers: [acabada], summary: sinPatron }), ahora)).toEqual({
      kind: 'quieta',
      titulo: 'Por hoy ya se terminó',
      linea: null,
    });
    const conPatron: Summary = { weekdays: [1, 1, 1, 1, 1, 0, 0], usualHour: 13, lastDay: '2026-11-05', repeats: [] };
    expect(hoyDe(cocina({ summary: conPatron }), ahora)).toEqual({
      kind: 'quieta',
      titulo: 'Por hoy ya se terminó',
      linea: 'Suele tener ofertas entre semana, hacia las 13:00',
    });
  });

  it('a publication for tomorrow she took down is not "Hoy no ha publicado" either', () => {
    const ahora = local(2026, 11, 5, 21);
    const manana: Summary = { ...SIN_RESUMEN, weekdays: [0, 0, 0, 0, 1, 0, 0], usualHour: 9, lastDay: '2026-11-06' };
    expect(hoyDe(cocina({ summary: manana }), ahora)).toEqual({ kind: 'quieta', titulo: 'Por hoy ya se terminó', linea: null });
  });
});

describe('*Lo que suele ofrecer*', () => {
  it('⚠️ each dish she repeats, how often over four weeks and the price she usually gives it, in the door’s order', () => {
    const resumen: Summary = {
      ...SIN_RESUMEN,
      repeats: [
        { name: 'Comida corrida', times: 3, usualCentavos: 6000 },
        { name: 'Bolsa de guisados', times: 2, usualCentavos: null },
        { name: 'Pozole', times: 1, usualCentavos: 9550 },
      ],
    };
    expect(repetidosDe(resumen).map((r) => [r.nombre, r.detalle])).toEqual([
      ['Comida corrida', '3 veces en las últimas 4 semanas · normalmente a $60'],
      ['Bolsa de guisados', '2 veces en las últimas 4 semanas'],
      ['Pozole', '1 vez en las últimas 4 semanas · normalmente a $95.50'],
    ]);
    expect(new Set(repetidosDe(resumen).map((r) => r.key)).size).toBe(3);
  });

  it('none, and the section is not drawn', () => {
    expect(repetidosDe(SIN_RESUMEN)).toEqual([]);
  });
});

describe('who she is and where', () => {
  const direccion = cocina().address;

  it('under her name: her trade’s name and her colonia', () => {
    expect(queYDondeDe('Fonda o cocina económica', direccion)).toBe('Fonda o cocina económica · Santa María la Ribera');
    expect(queYDondeDe(null, direccion)).toBe('Santa María la Ribera');
    expect(queYDondeDe('Taquería', { ...direccion, colonia: '' })).toBe('Taquería');
    expect(queYDondeDe(null, { ...direccion, colonia: '' })).toBeNull();
  });

  it('her street and number as she wrote them — none with no street', () => {
    expect(calleDe(direccion)).toBe('Sabino 12');
    expect(calleDe({ ...direccion, number: '' })).toBe('Sabino');
    expect(calleDe({ ...direccion, street: 'Av.  Insurgentes', number: '1605 ' })).toBe('Av. Insurgentes 1605');
    expect(calleDe({ ...direccion, street: '' })).toBeNull();
  });

  it('the tags in Wera Cocina’s words, in the door’s order', () => {
    expect(etiquetasDe(plato(1, { tags: ['pica', 'lacteos', 'gluten'] }))).toEqual(['Pica', 'Lácteos', 'Gluten']);
    expect(etiquetasDe(plato(1))).toEqual([]);
  });

  it('⚠️ the allergy line, word for word, for a surprise bag only', () => {
    expect(alergiaDe(plato(1, { surprise: true }))).toBe('Es sorpresa: si tienes alergia, pregunta antes o elige otro');
    expect(alergiaDe(plato(1))).toBeNull();
  });
});

describe('*Cómo llegar* — Google Maps’ directions, never a request of Itacate’s', () => {
  it('a query as the phone writes one — encodeURIComponent, a space as +', () => {
    expect(consulta({ api: '1', destination: 'Sabino 12, Santa María' })).toBe('api=1&destination=Sabino+12%2C+Santa+Mar%C3%ADa');
    expect(consulta({ a: "O'Higgins (norte)" })).toBe("a=O'Higgins+(norte)");
  });

  it('to her own point when she set one — Maps URLs, api=1, no origin', () => {
    expect(DIRECCIONES_URL).toBe('https://www.google.com/maps/dir/');
    expect(comoLlegarUrl(cocina())).toBe('https://www.google.com/maps/dir/?api=1&destination=19.452301%2C-99.159876');
  });

  it('⚠️ to her address as she wrote it — never to Google’s copy of her point, which is only drawn', () => {
    const google = cocina({ point: { latitude: 19.43261, longitude: -99.133208, source: 'google' } });
    const url = comoLlegarUrl(google) as string;
    expect(url).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=Sabino+12%2C+Santa+Mar%C3%ADa+la+Ribera%2C+Cuauht%C3%A9moc%2C+06400',
    );
    expect(url).not.toMatch(/19\.43261|99\.133208/);
    expect(comoLlegarUrl(cocina({ point: null }))).toBe(url);
  });

  it('nothing to go to with neither a point of her own nor a street — no link', () => {
    expect(comoLlegarUrl(cocina({ point: null, address: { ...cocina().address, street: '' } }))).toBeNull();
  });

  it('never an origin, never anything of the neighbour’s: the destination is all it carries', () => {
    for (const url of [comoLlegarUrl(cocina()), comoLlegarUrl(cocina({ point: null }))]) {
      const query = new URL(url as string).searchParams;
      expect([...query.keys()]).toEqual(['api', 'destination']);
    }
  });
});

describe('*Ver en Google Maps* — her own link, only when it is one', () => {
  it('a link the database takes is opened as it is', () => {
    for (const link of ['https://maps.app.goo.gl/AbC123', 'https://www.google.com/maps/place/Fonda', 'https://g.page/fonda-mari', 'https://maps.google.com.mx/?cid=1']) {
      expect(verEnMapsUrl({ ...EMPTY_PAGE, mapsLink: link }), link).toBe(link);
    }
  });

  it('⚠️ anything else is never handed to the phone', () => {
    for (const link of [
      'http://maps.app.goo.gl/AbC123',
      'javascript:alert(1)',
      'intent://maps.app.goo.gl/#Intent;end',
      'https://maps.app.goo.gl.evil.mx/x',
      'https://evil.mx/maps.app.goo.gl/',
      'https://www.google.com/mapsevil',
      'https://maps.app.goo.gl/../x',
      'https://maps.app.goo.gl/%2e%2e/x',
      'https://maps.app.goo.gl/a b',
      `https://maps.app.goo.gl/${'a'.repeat(1000)}`,
    ]) {
      expect(mapsLinkOk(link), link).toBe(false);
      expect(verEnMapsUrl({ ...EMPTY_PAGE, mapsLink: link }), link).toBeNull();
    }
    expect(verEnMapsUrl(EMPTY_PAGE)).toBeNull();
  });
});
