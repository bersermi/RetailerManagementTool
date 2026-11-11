import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AJUSTES_COLUMNS, AJUSTES_INICIALES, comeresDe, pagosDe, type Ajustes } from '@/api/ajustes';
import type { Kitchen as SuCocina } from '@/api/kitchen';
import type { Line, Listing } from '@/api/listing';
import { EMPTY_PAGE } from '@/api/pagina';
import type { Place } from '@/api/place';
import {
  SIN_AJUSTES,
  DIAS_A_LA_VISTA,
  DIAS_DEL_PUNTO_DE_GOOGLE,
  DIAS_DEL_RESUMEN,
  REPETIDOS_MAXIMOS,
  VECES_PARA_REPETIR,
  cocinaComoLaVen,
  nombreNormal,
  ofertasDe,
  puntoDe,
  quedanDe,
  resumenDe,
  seVeEnItacate,
} from '@/lib/comoLaVen';
import { claveDePlato } from '@/lib/apartados';
import { hoyDe, comoLlegarUrl, repetidosDe } from '@/vecinos/paginas';
import { patronDe } from '@/vecinos/lista';

// ============================================================================
// HER KITCHEN AS A NEIGHBOUR'S PHONE HOLDS IT, MADE FROM HER OWN ROWS. Plan task
// `10.5-v-c-ii` (`@/lib/comoLaVen`): what *Así la ven* and *Ver como la ven* draw is the
// door's answer (`on_offer_now`) for her kitchen alone, worked out again here because
// Wera Cocina never asks the door.
//
// ⚠️ THE DOOR'S RULES ARE READ OUT OF THE MIGRATION THAT DEFINES IT LAST — every interval,
// limit, order and grouping this module repeats is asserted in that SQL's text, so a later
// migration that changes the door turns this file red until the copy follows. And
// `normalize_name`'s body, out of the migration that defines it last.
// ⚠️ IN MEXICO CITY'S ZONE, as `test/hoy.test.ts`: the weekdays, the hour and the day are
// local. Every local moment is built inside its `it`, after the pin.
// ============================================================================

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const MIGRATIONS = join(ROOT, 'supabase/migrations');

/** The text of the last migration that defines `fn` — the one the database runs. */
function ultimaQueDefine(fn: string): { readonly file: string; readonly body: string } {
  const files = readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort();
  const pattern = new RegExp(`create (or replace )?function public\\.${fn}\\(`, 'i');
  const hits = files.filter((f) => pattern.test(readFileSync(join(MIGRATIONS, f), 'utf8')));
  if (hits.length === 0) throw new Error(`no migration defines ${fn}`);
  const file = hits[hits.length - 1];
  const text = readFileSync(join(MIGRATIONS, file), 'utf8');
  const start = text.search(pattern);
  const end = text.indexOf('$$;', text.indexOf('$$', start) + 2);
  return { file, body: text.slice(start, end).replace(/\s+/g, ' ') };
}

let before: string | undefined;
beforeAll(() => {
  before = process.env.TZ;
  process.env.TZ = 'America/Mexico_City';
});
afterAll(() => {
  if (before === undefined) delete process.env.TZ;
  else process.env.TZ = before;
});

/** A local moment in 2026 — November unless said. */
const at = (day: number, hour: number, minute = 0, month = 10) => new Date(2026, month, day, hour, minute);
/** Friday 6 November 2026, 16:20. */
const ahora = () => at(6, 16, 20);

const linea = (name: string, priceCentavos = 6500, extra: Partial<Line> = {}): Line => ({
  name,
  description: null,
  tags: [],
  priceCentavos,
  count: 8,
  surprise: false,
  usualCentavos: 12000,
  imagePath: null,
  llevar: true,
  aqui: false,
  ...extra,
});

let n = 0;
/** A publication made at `creada`, for `start`–`end`. */
function pub(creada: Date, start: Date, end: Date, lines: Line[], extra: Partial<Listing> = {}): Listing {
  n += 1;
  return { id: `l${String(n).padStart(3, '0')}`, placeId: 'p1', start, end, createdAt: creada, withdrawnAt: null, desechableCentavos: null, lines, ...extra };
}

const COCINA: SuCocina = { id: 'k1', displayName: 'Fonda Doña Mari', giroPrincipal: 'fonda' } as SuCocina;

function lugar(extra: Partial<Place> = {}): Place {
  return {
    id: 'p1',
    name: 'Fonda Doña Mari',
    address: { street: 'Sabino', number: '12', colonia: 'Santa María la Ribera', city: 'Cuauhtémoc', postalCode: '06400' },
    pin: null,
    directions: 'Junto a la tortillería',
    google: null,
    ...extra,
  };
}

describe('the door’s rules, read out of the migration that defines it last', () => {
  it('each number and order this module repeats is in `on_offer_now`’s text', () => {
    const { file, body } = ultimaQueDefine('on_offer_now');
    expect(file).toMatch(/^\d{4}_.*\.sql$/);
    for (const fragment of [
      // seen: something on offer, or published in the last 14 days
      "((li.withdrawn_at is null and li.pickup_end > now()) or li.created_at >= now() - interval '14 days')",
      // the point: her own pin first, else Google's copy under 29 days
      'when k.pin_lat is not null then',
      "when k.google_at > now() - interval '29 days' then k.google_point",
      // on offer, the earliest window first
      'and li.withdrawn_at is null and li.pickup_end > now()',
      'order by li.pickup_start, li.id',
      'order by ll.line_no',
      // the summary, four weeks of what she published — withdrawn too
      "extract(isodow from li.pickup_start at time zone k.timezone)",
      "extract(hour from li.pickup_start at time zone k.timezone)",
      'order by count(*) desc, 1',
      "to_char(max(li.pickup_start at time zone k.timezone), 'YYYY-MM-DD')",
      "li.created_at >= now() - interval '28 days'",
      '(array_agg(ll.name order by li.created_at desc))[1] as name',
      'count(distinct li.id)::int as times',
      'mode() within group (order by ll.unit_price) as usual_price',
      'group by public.normalize_name(ll.name) having count(distinct li.id) >= 2',
      'order by count(distinct li.id) desc, max(li.created_at) desc limit 5',
      'order by r.times desc, r.last_seen desc, r.name',
    ]) {
      expect(body, fragment).toContain(fragment);
    }
    // ⚠️ The summary never filters on withdrawn: what she published is counted, taken back or not.
    const summary = body.slice(body.indexOf("'summary'"));
    expect(summary).not.toMatch(/withdrawn_at/);
  });

  it('and the constants here are those numbers', () => {
    expect(DIAS_A_LA_VISTA).toBe(14);
    expect(DIAS_DEL_PUNTO_DE_GOOGLE).toBe(29);
    expect(DIAS_DEL_RESUMEN).toBe(28);
    expect(VECES_PARA_REPETIR).toBe(2);
    expect(REPETIDOS_MAXIMOS).toBe(5);
  });

  it('`10.5b-iii-a`: until her settings are read, the door’s own defaults — cash, para llevar, no desechable, everyone', () => {
    const { body } = ultimaQueDefine('on_offer_now');
    for (const fragment of [
      'coalesce(kp.accepts_card, false) as accepts_card',
      'coalesce(kp.accepts_transfer, false) as accepts_transfer',
      'coalesce(kp.para_llevar, true) as para_llevar',
      'coalesce(kp.para_aqui, false) as para_aqui',
      "'payment', to_jsonb(array['efectivo']",
      "'min_score', k.min_score",
      // `10.5b-iii-b`: her stars only from five ratings — none for every kitchen today.
      "'stars', (select case when count(*) >= 5 then jsonb_build_object(",
    ]) {
      expect(body, fragment).toContain(fragment);
    }
    expect(SIN_AJUSTES).toEqual({
      pagos: ['efectivo'],
      comeres: ['llevar'],
      minScore: null,
      estrellas: null,
      llevar: true,
      aqui: false,
      desechableCentavos: null,
    });
    // ⚠️ `10.5b-iv-c`: the same defaults as a kitchen with no row of settings (`@/api/ajustes`).
    expect(pagosDe(AJUSTES_INICIALES)).toEqual(SIN_AJUSTES.pagos);
    expect(comeresDe(AJUSTES_INICIALES)).toEqual(SIN_AJUSTES.comeres);
    expect(AJUSTES_INICIALES).toMatchObject({ llevar: SIN_AJUSTES.llevar, aqui: SIN_AJUSTES.aqui, desechableCentavos: null, minScore: null });
    // Since `10.5b-iv-c` her settings are read — apart from her page, whose shape is the door's (`@/vecinos/`).
    const fuente = (f: string) => readFileSync(join(fileURLToPath(new URL('../src', import.meta.url)), f), 'utf8');
    expect(fuente('api/pagina.ts')).not.toMatch(/accepts_card|para_llevar|container_price|min_score/);
    expect(AJUSTES_COLUMNS.split(',')).toEqual(['accepts_card', 'accepts_transfer', 'para_llevar', 'para_aqui', 'container_price', 'min_score']);
  });

  it('`10.5b-iv-c`: what is left, as the door sends it — less what is taken, a dish with none not sent, an offer with none not on offer', () => {
    const { body } = ultimaQueDefine('on_offer_now');
    for (const fragment of [
      "'quantity', (ll.quantity - t.taken)::numeric(12,3)::text,",
      'and ll.quantity > t.taken))',
      'and x.quantity > public.listing_line_taken(x.id))), \'[]\'::jsonb)',
      // each line's ways, each offer's desechable, as published
      "'para_llevar', ll.para_llevar,",
      "'container_price', li.container_price::text,",
      // her settings: cash always and first, then card, then transfer; to go first
      "'payment', to_jsonb(array['efectivo'] || case when k.accepts_card then array['tarjeta'] else '{}'::text[] end || case when k.accepts_transfer then array['transferencia'] else '{}'::text[] end)",
      "'eat', to_jsonb(case when k.para_llevar then array['llevar'] else '{}'::text[] end || case when k.para_aqui then array['aqui'] else '{}'::text[] end)",
    ]) {
      expect(body, fragment).toContain(fragment);
    }
  });

  it('`normalize_name` is lower case, trimmed, every run of spaces one — as the database’s', () => {
    const { body } = ultimaQueDefine('normalize_name');
    expect(body).toContain("select lower(btrim(regexp_replace(p_name, '\\s+', ' ', 'g')))");
    expect(nombreNormal('  Comida   Corrida ')).toBe('comida corrida');
    expect(nombreNormal('Tamales de RAJAS')).toBe('tamales de rajas');
    // Accents are kept, as the database keeps them (`0002` §2).
    expect(nombreNormal('Enchiladas Suizas')).not.toBe(nombreNormal('Enchíladas Suizas'));
  });
});

describe('what she has on offer — the door’s `on_offer`', () => {
  it('not withdrawn, its window not over, the earliest first; each dish numbered as she wrote it', () => {
    const now = ahora();
    const viva = pub(at(6, 12), at(6, 17), at(6, 19), [linea('Comida corrida'), linea('Agua de jamaica', 1500)]);
    const antes = pub(at(6, 11), at(6, 13), at(6, 18), [linea('Tamales de rajas', 2000)]);
    const quitada = pub(at(6, 10), at(6, 13), at(6, 20), [linea('Pozole')], { withdrawnAt: at(6, 14) });
    const pasada = pub(at(5, 12), at(5, 13), at(5, 15), [linea('Mole')]);
    const ofertas = ofertasDe([viva, antes, quitada, pasada], now);
    expect(ofertas.map((o) => o.id)).toEqual([antes.id, viva.id]);
    expect(ofertas[1].dishes.map((d) => [d.lineNo, d.name, d.priceCentavos, d.count])).toEqual([
      [1, 'Comida corrida', 6500, 8],
      [2, 'Agua de jamaica', 1500, 8],
    ]);
  });

  it('an equal start falls back to the id, as the door orders it', () => {
    const now = ahora();
    const b = { ...pub(at(6, 12), at(6, 17), at(6, 19), [linea('B')]), id: 'b' };
    const a = { ...pub(at(6, 13), at(6, 17), at(6, 19), [linea('A')]), id: 'a' };
    expect(ofertasDe([b, a], now).map((o) => o.id)).toEqual(['a', 'b']);
  });
});

describe('her point — her pin, else Google’s copy under 29 days, else none', () => {
  it('her own pin wins', () => {
    const place = lugar({ pin: { latitude: 19.45, longitude: -99.16 }, google: { pin: { latitude: 1, longitude: 2 }, placeId: null, at: '2026-11-05T10:00:00.123456+00:00' } });
    expect(puntoDe(place, ahora())).toEqual({ latitude: 19.45, longitude: -99.16, source: 'pin' });
  });

  it('Google’s copy while it is younger than 29 days — microseconds and all', () => {
    const now = ahora();
    const fresca = lugar({ google: { pin: { latitude: 19.4, longitude: -99.1 }, placeId: 'x', at: '2026-10-09T23:00:00.123456+00:00' } });
    expect(puntoDe(fresca, now)).toEqual({ latitude: 19.4, longitude: -99.1, source: 'google' });
    const vieja = lugar({ google: { pin: { latitude: 19.4, longitude: -99.1 }, placeId: 'x', at: '2026-10-08T00:00:00+00:00' } });
    expect(puntoDe(vieja, now)).toBeNull();
    expect(puntoDe(lugar(), now)).toBeNull();
    expect(puntoDe(null, now)).toBeNull();
  });
});

describe('the summary of her four weeks — the door’s `summary`', () => {
  it('per weekday of the pickup, Monday first; the hour most start, the earliest of equals; the last day she published for', () => {
    const now = ahora();
    const listings = [
      pub(at(6, 9), at(6, 13), at(6, 16), [linea('Comida corrida')]), // Friday 13:00
      pub(at(5, 9), at(5, 17), at(5, 19), [linea('Comida corrida')]), // Thursday 17:00
      pub(at(2, 9), at(2, 13), at(2, 16), [linea('Comida corrida')]), // Monday 13:00
      pub(at(31, 9, 0, 9), at(31, 17, 0, 9), at(31, 19, 0, 9), [linea('Tamales')]), // Saturday 31 Oct 17:00
      pub(at(1, 20), at(7, 10), at(7, 12), [linea('Tamales')]), // made Sunday the 1st for Saturday the 7th, 10:00
    ];
    const resumen = resumenDe(listings, now);
    expect(resumen.weekdays).toEqual([1, 0, 0, 1, 1, 2, 0]);
    expect(resumen.usualHour).toBe(13); // 13 twice, 17 twice: the earlier
    expect(resumen.lastDay).toBe('2026-11-07'); // a day she published FOR
  });

  it('only what she made in the last 28 days — and what she took back counts, as the door counts it', () => {
    const now = ahora();
    const dentro = pub(at(9, 17, 0, 9), at(9, 18, 0, 9), at(9, 20, 0, 9), [linea('Pozole')]); // 9 Oct 17:00, 28 days less 23 h 20 min
    const fuera = pub(at(8, 16, 0, 9), at(8, 18, 0, 9), at(8, 20, 0, 9), [linea('Pozole')]); // 8 Oct 16:00, over 28 days
    const quitada = pub(at(4, 12), at(4, 13), at(4, 15), [linea('Pozole')], { withdrawnAt: at(4, 12, 0) });
    const resumen = resumenDe([dentro, fuera, quitada], now);
    expect(resumen.weekdays.reduce((a, b) => a + b, 0)).toBe(2);
    expect(resumen.repeats).toEqual([{ name: 'Pozole', times: 2, usualCentavos: 6500 }]);
  });

  it('a dish repeats in two publications or more, grouped as `normalize_name` groups, under its newest spelling', () => {
    const now = ahora();
    const resumen = resumenDe(
      [
        pub(at(6, 9), at(6, 13), at(6, 16), [linea('Comida Corrida', 7000)]),
        pub(at(5, 9), at(5, 13), at(5, 16), [linea('comida  corrida', 6500)]),
        pub(at(4, 9), at(4, 13), at(4, 16), [linea(' COMIDA CORRIDA', 6500)]),
        pub(at(3, 9), at(3, 13), at(3, 16), [linea('Mole', 8000)]),
      ],
      now,
    );
    expect(resumen.repeats).toEqual([{ name: 'Comida Corrida', times: 3, usualCentavos: 6500 }]);
  });

  it('the price she gave it most — the lowest of equals, as `mode()` takes it — each line counted', () => {
    const now = ahora();
    const resumen = resumenDe(
      [
        pub(at(6, 9), at(6, 13), at(6, 16), [linea('Tamales', 2500)]),
        pub(at(5, 9), at(5, 13), at(5, 16), [linea('Tamales', 2000)]),
      ],
      now,
    );
    expect(resumen.repeats[0].usualCentavos).toBe(2000);
  });

  it('at most five, the most often first, then the most recent, then by name', () => {
    const now = ahora();
    const dias = [6, 5, 4, 3, 2, 1];
    const listings = dias.map((d, i) =>
      pub(at(d, 9 + i), at(d, 13), at(d, 16), [
        linea('A'),
        linea('B'),
        ...(i < 3 ? [linea('C')] : []),
        ...(i < 2 ? [linea('D'), linea('E'), linea('F')] : []),
      ]),
    );
    const resumen = resumenDe(listings, now);
    expect(resumen.repeats.map((r) => [r.name, r.times])).toEqual([
      ['A', 6],
      ['B', 6],
      ['C', 3],
      ['D', 2],
      ['E', 2],
    ]);
  });

  it('nothing in four weeks: an empty summary', () => {
    expect(resumenDe([], ahora())).toEqual({ weekdays: [0, 0, 0, 0, 0, 0, 0], usualHour: null, lastDay: null, repeats: [] });
  });
});

describe('seen in Itacate — while something is on offer, or 14 days after a publication', () => {
  it('as the door decides who it sends', () => {
    const now = ahora();
    expect(seVeEnItacate([], now)).toBe(false);
    expect(seVeEnItacate([pub(at(23, 16, 21, 9), at(23, 17, 0, 9), at(23, 19, 0, 9), [linea('Mole')])], now)).toBe(true);
    expect(seVeEnItacate([pub(at(23, 16, 19, 9), at(23, 17, 0, 9), at(23, 19, 0, 9), [linea('Mole')])], now)).toBe(false);
    // Made long ago for a window still open — on offer, so seen.
    expect(seVeEnItacate([pub(at(1, 9, 0, 9), at(6, 15), at(6, 18), [linea('Mole')])], now)).toBe(true);
  });
});

describe('her kitchen, whole, through Itacate’s own rules', () => {
  it('her page’s *Hoy* lists today’s offer, *Lo que suele ofrecer* her repeats, *Cómo llegar* her address', () => {
    const now = ahora();
    const listings = [
      pub(at(6, 12), at(6, 17), at(6, 19), [linea('Comida corrida')]),
      pub(at(5, 12), at(5, 17), at(5, 19), [linea('Comida corrida')]),
      pub(at(4, 12), at(4, 17), at(4, 19), [linea('Comida corrida')]),
    ];
    const cocina = cocinaComoLaVen({ kitchen: COCINA, place: lugar(), page: EMPTY_PAGE, listings, now });
    expect(cocina).toMatchObject({ id: 'k1', name: 'Fonda Doña Mari', giro: 'fonda', directions: 'Junto a la tortillería', point: null });
    const hoy = hoyDe(cocina, now);
    expect(hoy.kind).toBe('oferta');
    expect(repetidosDe(cocina.summary).map((r) => r.detalle)).toEqual(['3 veces en las últimas 4 semanas · normalmente a $65']);
    expect(patronDe(cocina.summary)).toBe('Suele tener ofertas los miércoles, jueves y viernes, hacia las 17:00');
    expect(comoLlegarUrl(cocina)).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=Sabino+12%2C+Santa+Mar%C3%ADa+la+Ribera%2C+Cuauht%C3%A9moc%2C+06400',
    );
  });

  it('no place yet: no address, no point — the page still draws', () => {
    const cocina = cocinaComoLaVen({ kitchen: COCINA, place: null, page: EMPTY_PAGE, listings: [], now: ahora() });
    expect(cocina.address).toEqual({ street: '', number: '', colonia: '', city: '', postalCode: '' });
    expect(comoLlegarUrl(cocina)).toBeNull();
    expect(hoyDe(cocina, ahora())).toEqual({ kind: 'quieta', titulo: 'Hoy no ha publicado', linea: null });
  });
});

describe('`10.5b-iv-c`: her preview with what is left, her settings and her stars', () => {
  it('each dish counts what is left; one with nothing left is not sent; its number stays its own', () => {
    const now = ahora();
    const o = pub(at(6, 12), at(6, 17), at(6, 19), [linea('Comida corrida'), linea('Agua de jamaica', 1500), linea('Flan', 3000)]);
    const tomados = new Map([
      [claveDePlato(o.id, 1), 3],
      [claveDePlato(o.id, 2), 8],
    ]);
    expect(quedanDe(o, 0, tomados)).toBe(5);
    expect(quedanDe(o, 1, tomados)).toBe(0);
    expect(quedanDe(o, 2, null)).toBe(8);
    const [oferta] = ofertasDe([o], now, tomados);
    expect(oferta.dishes.map((d) => [d.lineNo, d.name, d.count])).toEqual([
      [1, 'Comida corrida', 5],
      [3, 'Flan', 8],
    ]);
  });

  it('an offer with nothing left is not on offer — and her kitchen is still seen while it is open, as the door says', () => {
    const now = ahora();
    const o = pub(at(6, 12), at(6, 17), at(6, 19), [linea('Comida corrida')]);
    const todo = new Map([[claveDePlato(o.id, 1), 8]]);
    expect(ofertasDe([o], now, todo)).toEqual([]);
    expect(ofertasDe([o], now, null)).toHaveLength(1);
    expect(seVeEnItacate([o], now)).toBe(true);
  });

  it('a dish keeps its own ways; an offer the desechable it was published with', () => {
    const now = ahora();
    const o = pub(at(6, 12), at(6, 17), at(6, 19), [linea('Comida corrida', 6500, { llevar: false, aqui: true })], { desechableCentavos: 500 });
    const [oferta] = ofertasDe([o], now);
    expect(oferta.desechableCentavos).toBe(500);
    expect(oferta.dishes[0]).toMatchObject({ llevar: false, aqui: true });
  });

  it('an offer kept on the phone by the build before — no ways, no desechable — reads as the columns’ defaults, never undefined', () => {
    const now = ahora();
    // As the phone's copy holds it: written before these fields existed.
    const { llevar: _l, aqui: _a, ...viejaLinea } = linea('Comida corrida');
    const { desechableCentavos: _d, ...vieja } = pub(at(6, 12), at(6, 17), at(6, 19), [viejaLinea as unknown as Line]);
    const [oferta] = ofertasDe([vieja as unknown as Listing], now);
    expect(oferta.desechableCentavos).toBeNull();
    expect(oferta.dishes[0]).toMatchObject({ llevar: true, aqui: false });
  });

  it('her settings and her stars reach the kitchen the pages draw; unread, the door’s defaults', () => {
    const now = ahora();
    const ajustes: Ajustes = { tarjeta: true, transferencia: false, llevar: true, aqui: true, desechableCentavos: 500, minScore: 80 };
    const estrellas = { promedio: '4.6', cuantas: 7, etiquetas: ['lista_a_tiempo' as const] };
    const base = { kitchen: COCINA, place: lugar(), page: EMPTY_PAGE, listings: [], now };
    const leida = cocinaComoLaVen({ ...base, ajustes, estrellas });
    expect(leida).toMatchObject({ pagos: ['efectivo', 'tarjeta'], comeres: ['llevar', 'aqui'], minScore: 80, estrellas });
    const sinLeer = cocinaComoLaVen(base);
    expect(sinLeer).toMatchObject({ pagos: ['efectivo'], comeres: ['llevar'], minScore: null, estrellas: null });
  });
});
