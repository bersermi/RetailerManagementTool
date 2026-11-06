import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { Line, Listing } from '@/api/listing';
import {
  DESHECHA_MS,
  DONDE_SE_HACE,
  PENDIENTES,
  REPETIR_EN_HOY,
  anteriores,
  chipDe,
  deHoy,
  deshecha,
  diaDe,
  estadoDe,
  faltaDeLaPagina,
  faltaTexto,
  faltanDe,
  fraccionDe,
  hastaTexto,
  nombreDe,
  planDeRepetir,
  repetibles,
  ultimaTexto,
} from '@/lib/hoy';
import { clavePuerta, guardarPuerta, puertaCerrada } from '@/lib/puerta';
import type { DeviceStore } from '@/lib/store';
import { ES } from '@/strings';
import { NOTA } from '@/theme/movimiento';

// ============================================================================
// *HOY* AS A HUB, AND *TUS OFERTAS*. Plan task `10.5-v-c-i`, the owner's directions of
// 2026-11-06 (the family-shell page's round 6): what the day's card says, which offers
// are today's, what *Repetir* publishes in one tap, *Anteriores*, her page's checklist
// and the door she closes — pure, against a calendar.
//
// ⚠️ IN MEXICO CITY'S ZONE, ASSERTED TO HAVE TAKEN: "today" is the phone's day, the Mac is
// UTC−6 and CI is UTC, and a local-time boundary checked under UTC proves nothing
// (`test/ventana.test.ts`'s rule). The calendar: Friday 6 November 2026, 16:20 — so
// yesterday is Thursday the 5th and Monday is the 2nd. ⚠️ EVERY LOCAL MOMENT IS BUILT INSIDE
// ITS `it`, after the pin — a `describe`-scope `Date` is made before `beforeAll` runs, in
// whatever zone the machine is in. Run `TZ=UTC npx vitest run` to see CI's side.
// ⚠️ WHAT THIS CANNOT SEE: that the card draws, that a chip publishes, that the toast
// shows — the phone is their instrument (ADR-035 §2.11). The screens' wiring is read as
// text at the foot.
// ============================================================================

let before: string | undefined;
beforeAll(() => {
  before = process.env.TZ;
  process.env.TZ = 'America/Mexico_City';
});
afterAll(() => {
  if (before === undefined) delete process.env.TZ;
  else process.env.TZ = before;
});

/** A local moment in November 2026. */
const nov = (day: number, hour: number, minute = 0) => new Date(2026, 10, day, hour, minute);
/** Friday 6 November 2026, 16:20 — called inside each `it`, never at describe scope. */
const ahora = () => nov(6, 16, 20);

const linea = (name: string, count = 8, priceCentavos = 6500, surprise = false): Line => ({
  name,
  description: null,
  tags: [],
  priceCentavos,
  count,
  surprise,
  usualCentavos: 12000,
  imagePath: null,
});

function oferta(id: string, o: { start: Date; end: Date; createdAt?: Date; withdrawnAt?: Date | null; lines?: Line[] }): Listing {
  return {
    id,
    placeId: 'place-1',
    start: o.start,
    end: o.end,
    createdAt: o.createdAt ?? new Date(o.start.getTime() - 20 * 60_000),
    withdrawnAt: o.withdrawnAt ?? null,
    lines: o.lines ?? [linea('Comida corrida')],
  };
}

describe('the calendar these cases are written against', () => {
  it('is Mexico City’s, and 6 November 2026 is a Friday', () => {
    expect(ahora().getTimezoneOffset()).toBe(360);
    expect(ahora().getDay()).toBe(5);
  });
});

describe('an offer taken back by Deshacer was never published', () => {
  it('withdrawn within a minute of being published — the toast’s 8 seconds and a slow network', () => {
    const at = nov(6, 15);
    expect(DESHECHA_MS).toBe(60_000);
    expect(deshecha(oferta('a', { start: nov(6, 17), end: nov(6, 19), createdAt: at, withdrawnAt: new Date(at.getTime() + 8_000) }))).toBe(true);
    expect(deshecha(oferta('b', { start: nov(6, 17), end: nov(6, 19), createdAt: at, withdrawnAt: new Date(at.getTime() + 60_000) }))).toBe(true);
  });

  it('later, it is Ya se terminó — an offer she made, over; never withdrawn, nothing to tell', () => {
    const at = nov(6, 15);
    expect(deshecha(oferta('c', { start: nov(6, 17), end: nov(6, 19), createdAt: at, withdrawnAt: new Date(at.getTime() + 61_000) }))).toBe(false);
    expect(deshecha(oferta('d', { start: nov(6, 17), end: nov(6, 19), createdAt: at }))).toBe(false);
  });
});

describe('today’s offers — Tus ofertas’ Hoy', () => {
  it('on offer first, the soonest first; then what is over, the latest end first — never yesterday’s, never one taken back', () => {
    const abierta = oferta('abierta', { start: nov(6, 16), end: nov(6, 18) });
    const luego = oferta('luego', { start: nov(6, 17), end: nov(6, 19, 30), lines: [linea('Bolsa de pan', 5, 4500, true)] });
    const termino = oferta('termino', { start: nov(6, 12), end: nov(6, 14) });
    const laQuito = oferta('la-quito', { start: nov(6, 15), end: nov(6, 20), createdAt: nov(6, 14), withdrawnAt: nov(6, 15, 30) });
    const manana = oferta('manana', { start: nov(7, 13), end: nov(7, 14), createdAt: nov(6, 9) });
    const deshechaHoy = oferta('deshecha', { start: nov(6, 17), end: nov(6, 19), createdAt: nov(6, 16), withdrawnAt: nov(6, 16, 0) });
    const ayer = oferta('ayer', { start: nov(5, 17), end: nov(5, 19), createdAt: nov(5, 16, 10) });
    const hoy = deHoy([ayer, termino, luego, deshechaHoy, laQuito, abierta, manana], ahora()).map((l) => l.id);
    expect(hoy).toEqual(['abierta', 'luego', 'manana', 'la-quito', 'termino']);
  });
});

describe('the day’s card', () => {
  it('nothing ever published: her first offer appears here', () => {
    expect(diaDe([], ahora())).toEqual({ kind: 'nada', ultima: null });
    expect(ultimaTexto(null, ahora())).toBe(ES.hoy.nunca);
  });

  it('nothing today: when she last published — yesterday, or the day', () => {
    const ayer = oferta('ayer', { start: nov(5, 17), end: nov(5, 19), createdAt: nov(5, 16, 10) });
    const lunes = oferta('lunes', { start: nov(2, 17), end: nov(2, 19), createdAt: nov(2, 16, 10) });
    expect(diaDe([lunes, ayer], ahora())).toEqual({ kind: 'nada', ultima: nov(5, 16, 10) });
    expect(ultimaTexto(nov(5, 16, 10), ahora())).toBe('Ayer publicaste a las 16:10');
    expect(ultimaTexto(nov(2, 16, 10), ahora())).toBe('Publicaste el lun 2 a las 16:10');
  });

  it('one taken back by Deshacer is not her last, and not today’s', () => {
    const ayer = oferta('ayer', { start: nov(5, 17), end: nov(5, 19), createdAt: nov(5, 16, 10) });
    const deshecha = oferta('d', { start: nov(6, 17), end: nov(6, 19), createdAt: nov(6, 16), withdrawnAt: nov(6, 16) });
    expect(diaDe([deshecha, ayer], ahora())).toEqual({ kind: 'nada', ultima: nov(5, 16, 10) });
  });

  it('what she published today is over: Por hoy ya se terminó — her own end or its hours', () => {
    const termino = oferta('t', { start: nov(6, 12), end: nov(6, 14) });
    const laQuito = oferta('q', { start: nov(6, 15), end: nov(6, 20), createdAt: nov(6, 14), withdrawnAt: nov(6, 15, 30) });
    expect(diaDe([termino], ahora())).toEqual({ kind: 'terminado' });
    expect(diaDe([laQuito], ahora())).toEqual({ kind: 'terminado' });
  });

  it('on offer: every plate, the first start and the last end, each dish on a line — what is over says so', () => {
    const abierta = oferta('a', { start: nov(6, 16), end: nov(6, 18), lines: [linea('Comida corrida', 8), linea('Enchiladas verdes', 4)] });
    const luego = oferta('b', { start: nov(6, 17), end: nov(6, 19, 30), lines: [linea('Bolsa de pan', 5, 4500, true)] });
    const termino = oferta('c', { start: nov(6, 12), end: nov(6, 14), lines: [linea('Pozole', 6)] });
    expect(diaDe([termino, luego, abierta], ahora())).toEqual({
      kind: 'oferta',
      total: 17,
      desde: nov(6, 16),
      hasta: nov(6, 19, 30),
      renglones: [
        { key: 'a:0', nombre: 'Comida corrida', cuantos: 8, terminada: false },
        { key: 'a:1', nombre: 'Enchiladas verdes', cuantos: 4, terminada: false },
        { key: 'b:0', nombre: 'Bolsa de pan', cuantos: 5, terminada: false },
        { key: 'c:0', nombre: 'Pozole', cuantos: 6, terminada: true },
      ],
    });
    expect(ES.hoy.porciones(17)).toBe('17 porciones en oferta');
    expect(ES.hoy.porciones(1)).toBe('1 porción en oferta');
    expect(ES.hoy.enOferta(4)).toBe('4 en oferta');
  });

  it('until when, and the time left — before the first window opens, when it starts', () => {
    expect(hastaTexto(nov(6, 19, 30), ahora())).toBe('hasta las 19:30');
    expect(hastaTexto(nov(7, 1), ahora())).toBe('hasta mañana a las 1:00');
    expect(faltaTexto(nov(6, 16), nov(6, 18), ahora())).toBe('Faltan 1 h 40 min');
    expect(faltaTexto(nov(6, 16), nov(6, 17), ahora())).toBe('Faltan 40 min');
    expect(faltaTexto(nov(6, 16), nov(6, 18, 20), ahora())).toBe('Faltan 2 h');
    expect(faltaTexto(nov(6, 16), new Date(ahora().getTime() + 30_000), ahora())).toBe('Falta menos de un minuto');
    expect(faltaTexto(nov(6, 17), nov(6, 19), ahora())).toBe('Empieza a las 17:00');
    expect(faltaTexto(nov(7, 13), nov(7, 14), ahora())).toBe('Empieza mañana a las 13:00');
  });

  it('the bar: what is left of the time between the first start and the last end, from 1 to 0', () => {
    expect(fraccionDe(nov(6, 16), nov(6, 18), ahora())).toBeCloseTo(100 / 120);
    expect(fraccionDe(nov(6, 17), nov(6, 19), ahora())).toBe(1);
    expect(fraccionDe(nov(6, 12), nov(6, 14), ahora())).toBe(0);
    expect(fraccionDe(nov(6, 14), nov(6, 14), ahora())).toBe(0);
  });
});

describe('Anteriores — one row per offer she made before today, its newest, the newest first', () => {
  const fixtures = () => {
    const lunes = oferta('lunes', { start: nov(2, 17), end: nov(2, 19), lines: [linea('Comida corrida', 6)] });
    const miercoles = oferta('miercoles', { start: nov(4, 17), end: nov(4, 19), lines: [linea('comida corrida ', 9)] });
    const ayerBolsa = oferta('ayer-bolsa', { start: nov(5, 18), end: nov(5, 20), lines: [linea('Bolsa de pan', 5, 4500, true)] });
    const ayerPozole = oferta('ayer-pozole', { start: nov(5, 13), end: nov(5, 15), lines: [linea('Pozole', 6)] });
    const ayerDeshecha = oferta('ayer-deshecha', { start: nov(5, 19), end: nov(5, 21), createdAt: nov(5, 18), withdrawnAt: nov(5, 18), lines: [linea('Tamales', 10)] });
    const hoyBolsa = oferta('hoy-bolsa', { start: nov(6, 18), end: nov(6, 20), lines: [linea('Bolsa de pan', 5, 4500, true)] });
    return { lunes, miercoles, ayerBolsa, ayerPozole, ayerDeshecha, hoyBolsa };
  };

  it('the same dishes twice is one row — the latest; one taken back by Deshacer is none', () => {
    const { lunes, miercoles, ayerBolsa, ayerPozole, ayerDeshecha } = fixtures();
    const filas = anteriores([lunes, miercoles, ayerBolsa, ayerPozole, ayerDeshecha], ahora());
    expect(filas.map((f) => f.listing.id)).toEqual(['ayer-bolsa', 'ayer-pozole', 'miercoles']);
  });

  it('published again today: Hoy where Repetir would be, and today’s own is not a past row', () => {
    const { ayerBolsa, ayerPozole, hoyBolsa } = fixtures();
    const filas = anteriores([hoyBolsa, ayerBolsa, ayerPozole], ahora());
    expect(filas.map((f) => [f.listing.id, f.hoy])).toEqual([
      ['ayer-bolsa', true],
      ['ayer-pozole', false],
    ]);
  });

  it('a dish and a surprise bag of the same name are two offers', () => {
    const plato = oferta('plato', { start: nov(4, 17), end: nov(4, 19), lines: [linea('Pan', 5)] });
    const bolsa = oferta('bolsa', { start: nov(5, 17), end: nov(5, 19), lines: [linea('Pan', 5, 4500, true)] });
    expect(anteriores([plato, bolsa], ahora()).map((f) => f.listing.id)).toEqual(['bolsa', 'plato']);
  });
});

describe('Repetir on Hoy — her last day’s offers, not published again today', () => {
  it('yesterday’s, without the one already published today, at most three', () => {
    const ayer = ['a', 'b', 'c', 'd'].map((id, i) => oferta(id, { start: nov(5, 12 + i), end: nov(5, 13 + i), lines: [linea(`Platillo ${id}`)] }));
    const lunes = oferta('lunes', { start: nov(2, 17), end: nov(2, 19), lines: [linea('Pozole')] });
    const hoyD = oferta('hoy-d', { start: nov(6, 18), end: nov(6, 19), lines: [linea('Platillo d')] });
    expect(REPETIR_EN_HOY).toBe(3);
    expect(repetibles([...ayer, lunes, hoyD], ahora()).map((l) => l.id)).toEqual(['c', 'b', 'a']);
  });

  it('on a Monday, Saturday’s — the last day she published, whatever day it was', () => {
    const lunes = nov(9, 10);
    const sabado = oferta('sabado', { start: nov(7, 13), end: nov(7, 15) });
    const jueves = oferta('jueves', { start: nov(5, 13), end: nov(5, 15), lines: [linea('Pozole')] });
    expect(repetibles([sabado, jueves], lunes).map((l) => l.id)).toEqual(['sabado']);
    expect(repetibles([], lunes)).toEqual([]);
  });

  it('a chip says what, how many and the price of one; several dishes by the first', () => {
    expect(chipDe(oferta('a', { start: nov(5, 17), end: nov(5, 19), lines: [linea('Comida corrida', 8, 6500)] }))).toBe('Comida corrida · 8 · $65');
    const varias = oferta('b', { start: nov(5, 17), end: nov(5, 19), lines: [linea('Comida corrida'), linea('Agua de jamaica'), linea('Flan')] });
    expect(chipDe(varias)).toBe('Comida corrida y 2 más');
    expect(nombreDe(varias)).toBe('Comida corrida y 2 más');
    expect(nombreDe({ lines: [{ name: 'Pozole' }] })).toBe('Pozole');
  });
});

describe('one tap publishes only what the form would have sent untouched', () => {
  const ayerDe = () => oferta('ayer', { start: nov(5, 17), end: nov(5, 19) });
  const ids = () => {
    let n = 0;
    return () => `k${(n += 1)}`;
  };

  it('yesterday’s hours, today — still ahead, or open now', () => {
    const ayer = ayerDe();
    const plan = planDeRepetir(ayer, 'place-1', ahora(), ids());
    expect(plan.kind).toBe('publicar');
    if (plan.kind !== 'publicar') return;
    expect(plan.body.p_location_id).toBe('place-1');
    expect(new Date(plan.body.p_pickup_start)).toEqual(nov(6, 17));
    expect(new Date(plan.body.p_pickup_end)).toEqual(nov(6, 19));
    expect(plan.body.p_lines.map((l) => [l.name, l.quantity, l.unit_price])).toEqual([['Comida corrida', 8, '65.00']]);
    const open = planDeRepetir(ayer, 'place-1', nov(6, 18), ids());
    expect(open.kind === 'publicar' && new Date(open.body.p_pickup_start)).toEqual(nov(6, 17));
  });

  it('today’s hours are over: the form, filled in — she picks, nothing is guessed for her', () => {
    expect(planDeRepetir(ayerDe(), 'place-1', nov(6, 19, 5), ids())).toEqual({ kind: 'formulario' });
  });

  it('a rule the form now checks that the old offer breaks, or no place read yet: the form', () => {
    const larga = oferta('larga', { start: nov(5, 17), end: nov(5, 19), lines: [linea('x'.repeat(81))] });
    expect(planDeRepetir(larga, 'place-1', ahora(), ids())).toEqual({ kind: 'formulario' });
    expect(planDeRepetir(ayerDe(), null, ahora(), ids())).toEqual({ kind: 'formulario' });
  });
});

describe('Tu página en Itacate — its checklist, five things', () => {
  const todo = { giro: 'giro-fonda', direccionCompleta: true, frase: 'Comida casera.', portada: 'k/portada', listings: [oferta('a', { start: new Date(0), end: new Date(3_600_000) })] };

  it('in the page’s order, each with where it is done', () => {
    expect([...PENDIENTES]).toEqual(['nombreGiro', 'direccion', 'frase', 'oferta', 'portada']);
    expect(PENDIENTES.map((p) => ES.pendientes.item[p])).toEqual(['Nombre y giro', 'Tu dirección', 'Tu frase', 'Tu primera oferta', 'Foto de portada']);
    expect(DONDE_SE_HACE).toEqual({ nombreGiro: '/giro', direccion: '/direccion', frase: '/pagina', oferta: '/publicar', portada: '/pagina' });
  });

  it('all done is nothing missing; an empty sentence, no cover, no trade or no address is missing', () => {
    expect(faltanDe(estadoDe(todo))).toEqual([]);
    expect(faltanDe(estadoDe({ ...todo, frase: '   ' }))).toEqual(['frase']);
    expect(faltanDe(estadoDe({ ...todo, giro: null, direccionCompleta: false, frase: null, portada: null, listings: [] }))).toEqual([...PENDIENTES]);
  });

  it('her first offer counts once she published one — never one taken back by Deshacer', () => {
    const deshecha = oferta('d', { start: nov(6, 17), end: nov(6, 19), createdAt: nov(6, 16), withdrawnAt: nov(6, 16) });
    expect(faltanDe(estadoDe({ ...todo, listings: [deshecha] }))).toEqual(['oferta']);
  });

  it('the door’s line names one or two, and counts three or more', () => {
    expect(faltaDeLaPagina(['portada'])).toBe('Falta tu foto de portada');
    expect(faltaDeLaPagina(['frase', 'portada'])).toBe('Faltan tu frase y tu foto de portada');
    expect(faltaDeLaPagina(['direccion', 'frase', 'portada'])).toBe('Faltan 3 cosas');
    expect(ES.pendientes.cuenta(3, 5)).toBe('3 de 5');
  });
});

describe('Tu página closed on Hoy — kept on this phone, per kitchen', () => {
  function memoria(): DeviceStore & { map: Map<string, string> } {
    const map = new Map<string, string>();
    return { map, getItem: (k) => map.get(k) ?? null, setItem: (k, v) => void map.set(k, v), removeItem: (k) => void map.delete(k) };
  }

  it('closed, and opened again by Deshacer; a second kitchen’s door is its own', () => {
    const store = memoria();
    expect(puertaCerrada(store, 'k-1')).toBe(false);
    guardarPuerta(store, 'k-1', true);
    expect(puertaCerrada(store, 'k-1')).toBe(true);
    expect(puertaCerrada(store, 'k-2')).toBe(false);
    expect([...store.map.keys()]).toEqual([clavePuerta('k-1')]);
    guardarPuerta(store, 'k-1', false);
    expect(puertaCerrada(store, 'k-1')).toBe(false);
    expect(store.map.size).toBe(0);
  });

  it('a store that fails reads as open, and a write that fails is swallowed — never a screen that cannot draw', () => {
    const roto: DeviceStore = {
      getItem: () => {
        throw new Error('disk');
      },
      setItem: () => {
        throw new Error('full');
      },
      removeItem: () => {
        throw new Error('disk');
      },
    };
    expect(puertaCerrada(roto, 'k-1')).toBe(false);
    expect(() => guardarPuerta(roto, 'k-1', true)).not.toThrow();
    expect(puertaCerrada(undefined, 'k-1')).toBe(false);
  });
});

describe('the toast: Deshacer for 8 seconds after publishing or Repetir (the ruling of 2026-11-05, call 19)', () => {
  it('stays 8 seconds with Deshacer, and less without', () => {
    expect(NOTA.conDeshacer).toBe(8_000);
    expect(NOTA.solo).toBeLessThan(NOTA.conDeshacer);
    expect(ES.nota.publicaste('Comida corrida')).toBe('Publicaste Comida corrida');
    expect(ES.nota.deshacer).toBe('Deshacer');
  });
});

// ----------------------------------------------------------------------------
// The screens' wiring, read as text — whether they draw it is the phone's to show.
// ----------------------------------------------------------------------------

const SRC = fileURLToPath(new URL('../src', import.meta.url));
const code = (path: string) =>
  readFileSync(join(SRC, path), 'utf8')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');

describe('Hoy — a hub: a number and a door in each zone, nothing edited in place', () => {
  const hoy = code('app/(cocina)/(tabs)/index.tsx');

  it('the day’s card first, opening Tus ofertas; then Publicar with Repetir; then the doors', () => {
    const order = ['<DiaDeHoy', 'ES.publicar.abrir', 'chips.map(', '<Puertas'].map((s) => hoy.indexOf(s));
    expect(order.every((at) => at > 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(hoy).toMatch(/<DiaDeHoy dia=\{diaDe\(listings\.data, ahora\)\} ahora=\{ahora\} onPress=\{\(\) => router\.push\('\/ofertas'\)\} \/>/);
    expect(hoy).toMatch(/onPress=\{\(\) => void repetir\(listing\)\}/);
  });

  it('nothing on it ends, corrects or types: no withdrawal, no box, no page’s head', () => {
    expect(hoy).not.toMatch(/useWithdraw|TextInput|<Campo|<Portada|<Salidas/);
  });

  it('the page’s door waits for every read it counts, and its ✕ closes it with Deshacer', () => {
    expect(hoy).toMatch(/if \(!cerrada && listings\.data !== undefined && place\.data !== undefined && page\.data !== undefined\)/);
    expect(hoy).toMatch(/onCerrar: \(\) => \{\s*setCerrada\(true\);\s*avisar\(ES\.nota\.paginaCerrada, \(\) => setCerrada\(false\)\);\s*\}/);
    expect(hoy).toMatch(/onPress: \(\) => router\.navigate\('\/mi-cocina'\)/);
  });
});

describe('Tus ofertas — today’s, Publicar, then Anteriores', () => {
  const room = code('app/(cocina)/ofertas.tsx');

  it('in that order, with Ya se terminó on today’s and Repetir on the past', () => {
    const order = ['ES.ofertas.hoy', '<OfertaDeHoy', 'ES.publicar.abrir', 'ES.ofertas.anteriores', '<Anterior'].map((s) => room.indexOf(s));
    expect(order.every((at) => at > 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(room).toMatch(/const answer = await withdraw\(listing\.id\);\s*if \(answer === null\) avisar\(ES\.nota\.quitaste\(nombreDe\(listing\)\)\);/);
    expect(room).toMatch(/onRepetir=\{\(\) => void repetir\(fila\.listing\)\}/);
  });

  it('Ya se terminó is asked once inline, its yes in red', () => {
    const card = code('ui/OfertaDeHoy.tsx');
    expect(card).toMatch(/\{ES\.ofertas\.pregunta\}/);
    expect(card).toMatch(/onPress=\{onTerminar\}/);
    expect(card.indexOf('ES.ofertas.si')).toBeGreaterThan(card.indexOf('ES.ofertas.pregunta'));
  });
});
