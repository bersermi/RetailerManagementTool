import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { apartadoOf, type Apartado } from '@/api/apartados';
import { siguiendoFrom, type Siguiendo } from '@/api/siguiendo';
import {
  cocinaDeSeguida,
  cuandoTexto,
  detalleDe,
  fijadoDe,
  fijadoTextos,
  hayPunto,
  misCocinasDe,
  preguntarSeguir,
} from '@/lib/misCocinas';
import { ES } from '@/strings';

// ============================================================================
// *MIS COCINAS*, HER PINNED RESERVATION AND *¿SEGUIR A …?* — plan task `10.9d-ii`, the owner's
// rulings G20–G23 and G39 of 2026-11-17 (the family-shell page, stage 3). Every rule of
// `@/lib/misCocinas`, in Mexico City's zone (the suite runs at `TZ=UTC` in CI too: each moment
// below is written as UTC and read for its calendar day the way the phone does).
//
// ⚠️ WHAT THIS CANNOT SEE: that the pin sits in *Cerca*'s head, the dot on the tab, *Mis
// cocinas*' rows or *Seguir*'s two buttons draw — the phone is their instrument (ADR-035 §2.11).
// It reads the screens as text only where a wrong wire would be invisible otherwise.
// ============================================================================

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const code = (path: string) =>
  readFileSync(join(ROOT, 'itacate/src', path), 'utf8')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');

const LUPE = 'b1d0c0de-0000-4000-8000-000000000001';
const MARI = 'b1d0c0de-0000-4000-8000-000000000002';

/** One of `my_reservations`' rows, as `0080` writes it. */
function fila(over: Record<string, unknown> = {}): Apartado {
  const { kitchenId = LUPE, kitchenName = 'Fonda Doña Lupe', ...rest } = over;
  return apartadoOf({
    id: 'r-1',
    code: 347,
    state: 'apartado',
    pickup_at: '2026-11-10T20:30:00+00:00',
    held_until: '2026-11-10T22:00:00+00:00',
    cancel_until: '2026-11-10T19:30:00+00:00',
    payment: 'efectivo',
    eat: 'llevar',
    cancel_reason: null,
    rate_until: null,
    my_rating: null,
    kitchen: {
      id: kitchenId,
      name: kitchenName,
      giro: 'giro-fonda',
      address: { street: 'Sabino', street_number: '12', colonia: 'Santa María la Ribera', city: 'Cuauhtémoc', postal_code: '06400' },
      directions: null,
      page: { color: 'chile', logo_path: null },
    },
    lines: [{ line_no: 1, name: 'Mole con arroz', surprise: false, quantity: '1.000', unit_price: '60.00', container_price: '5.00' }],
    ...rest,
  });
}

/** `my_follows`' answer, as `0084` writes it. */
function follows(kitchens: Record<string, unknown>[], gone: Record<string, unknown>[] = []): Siguiendo {
  const s = siguiendoFrom({ kitchens, gone });
  if (s === null) throw new Error('fixture');
  return s;
}

function sigue(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: LUPE,
    name: 'Fonda Doña Lupe',
    giro: 'giro-fonda',
    colonia: 'Santa María la Ribera',
    page: { color: 'chile', logo_path: null, cover_path: null },
    following: true,
    bell: false,
    since: '2026-11-01T18:00:00.123456+00:00',
    last_day: null,
    ...over,
  };
}

/** 13:00 in Mexico City, 2026-11-10 — the phone's clock. */
const AHORA = new Date('2026-11-10T19:00:00Z');
/** The phone's calendar day as `YYYY-MM-DD`, in whatever zone the suite runs. */
const diaDe = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const HOY = diaDe(AHORA);
const AYER = diaDe(new Date(AHORA.getTime() - 86_400_000));
const HACE_5 = diaDe(new Date(AHORA.getTime() - 5 * 86_400_000));

describe('the reservation pinned at the top of Cerca and of Mis cocinas (G39)', () => {
  it('nothing pinned with nothing to act on — nor before her list is read', () => {
    expect(fijadoDe(undefined, AHORA)).toBeNull();
    expect(fijadoDe([], AHORA)).toBeNull();
    expect(fijadoDe([fila({ state: 'recogido' }), fila({ id: 'r-2', state: 'cancelado' })], AHORA)).toBeNull();
    expect(hayPunto([fila({ state: 'recogido' })], AHORA)).toBe(false);
  });

  it('the soonest still to collect, and how many more she holds', () => {
    const tarde = fila({ id: 'tarde', pickup_at: '2026-11-11T01:00:00+00:00' });
    const pronto = fila({ id: 'pronto', pickup_at: '2026-11-10T20:00:00+00:00' });
    const fijado = fijadoDe([tarde, pronto], AHORA);
    expect(fijado?.kind).toBe('pendiente');
    expect(fijado?.apartado.id).toBe('pronto');
    expect(fijado?.mas).toBe(1);
    expect(hayPunto([tarde], AHORA)).toBe(true);
  });

  it('a cancel by the kitchen comes first — she must not walk over for nothing', () => {
    const cancelada = fila({ id: 'c', state: 'cancelado_cocina' });
    const fijado = fijadoDe([fila(), cancelada], AHORA);
    expect(fijado?.kind).toBe('aviso');
    expect(fijado?.apartado.id).toBe('c');
    expect(fijado?.mas).toBe(1);
  });

  it('a plate that se liberó less than a day ago is pinned too: her swipe is still taken', () => {
    const liberada = fila({ state: 'liberado', held_until: '2026-11-10T18:00:00+00:00' });
    expect(fijadoDe([liberada], AHORA)?.kind).toBe('porConfirmar');
    // A day after its window, it is a past plate only.
    expect(fijadoDe([liberada], new Date('2026-11-11T18:00:01Z'))).toBeNull();
  });

  it('its words: the hour today, tomorrow or another day; the kitchen and the code; and y N más', () => {
    const hoy = fijadoDe([fila()], AHORA);
    if (hoy === null) throw new Error('pinned');
    const { titulo, detalle } = fijadoTextos(hoy, AHORA);
    expect(titulo).toBe(ES.fijado.tuApartado(cuandoTexto(hoy.apartado.hora, AHORA)));
    expect(titulo.startsWith('Tu apartado · hoy a ')).toBe(true);
    expect(detalle).toBe('Fonda Doña Lupe · código 347');
    const dos = fijadoDe([fila(), fila({ id: 'r-2', pickup_at: '2026-11-11T01:00:00+00:00' })], AHORA);
    if (dos === null) throw new Error('pinned');
    expect(fijadoTextos(dos, AHORA).detalle).toBe('Fonda Doña Lupe · código 347 · y 1 más');
    const manana = new Date(AHORA.getTime() + 86_400_000);
    expect(cuandoTexto(manana, AHORA).startsWith('mañana a ')).toBe(true);
    // A window past midnight still holds yesterday's hour: its time alone, never *hoy*.
    const ayer = new Date(AHORA.getTime() - 86_400_000);
    expect(cuandoTexto(ayer, AHORA).startsWith('a ')).toBe(true);
    const aviso = fijadoDe([fila({ state: 'cancelado_cocina' })], AHORA);
    if (aviso === null) throw new Error('pinned');
    expect(fijadoTextos(aviso, AHORA)).toEqual({ titulo: 'La cocina canceló tu apartado', detalle: 'Fonda Doña Lupe · Mole con arroz · 1 · para llevar' });
  });

  it('pinned in Cerca’s sheet head, heading Mis cocinas, and a dot on that tab — each opening Apartados', () => {
    const cerca = code('app/(vecino)/(tabs)/index.tsx');
    expect(cerca).toMatch(/const fijado = fijadoDe\(apartados\.data, ahora\);/);
    // In the head (`Cabeza`), so it shows at every height of the list.
    expect(cerca).toMatch(/<Cabeza[\s\S]*?<ApartadoFijado[\s\S]*?<\/Cabeza>/);
    expect(cerca).toMatch(/onPress=\{\(\) => router\.push\('\/apartados'\)\}/);
    const mis = code('app/(vecino)/(tabs)/mis-cocinas.tsx');
    expect(mis.indexOf('<ApartadoFijado')).toBeGreaterThan(-1);
    expect(mis.indexOf('<ApartadoFijado')).toBeLessThan(mis.indexOf('ES.misCocinas.tusCocinas'));
  });
});

describe('Tus cocinas — the kitchens she follows, and those that left (G21, G23)', () => {
  it('only those she follows — a bell alone is no row (G21 as drawn)', () => {
    const { filas } = misCocinasDe(follows([sigue(), sigue({ id: MARI, name: 'Fonda Doña Mari', following: false, bell: true })]), AHORA);
    expect(filas.map((f) => f.seguida.nombre)).toEqual(['Fonda Doña Lupe']);
  });

  it('published for today first, then the most recent, then by name; none in four weeks last', () => {
    const lista = follows([
      sigue({ id: 'a', name: 'Antojitos Rosy', last_day: null }),
      sigue({ id: 'b', name: 'Birria Don Beto', last_day: HACE_5 }),
      sigue({ id: 'c', name: 'Cocina Chela', last_day: AYER }),
      sigue({ id: 'd', name: 'Doña Mari', last_day: HOY }),
      sigue({ id: 'e', name: 'El Güero', last_day: AYER }),
    ]);
    const { filas } = misCocinasDe(lista, AHORA);
    expect(filas.map((f) => f.seguida.nombre)).toEqual(['Doña Mari', 'Cocina Chela', 'El Güero', 'Birria Don Beto', 'Antojitos Rosy']);
    expect(filas.map((f) => f.publicoHoy)).toEqual([true, false, false, false, false]);
    expect(detalleDe(filas[0])).toBe('Publicó hoy');
    expect(detalleDe(filas[1])).toBe('Publicó ayer');
    // Nothing in four weeks: where it is, else that.
    expect(detalleDe(filas[4])).toBe('Santa María la Ribera');
    const sinColonia = misCocinasDe(follows([sigue({ colonia: null })]), AHORA).filas[0];
    expect(detalleDe(sinColonia)).toBe(ES.misCocinas.sinOfertas);
  });

  it('a day it published FOR that is still to come reads as today — the door counts her pickup day', () => {
    const manana = diaDe(new Date(AHORA.getTime() + 86_400_000));
    expect(misCocinasDe(follows([sigue({ last_day: manana })]), AHORA).filas[0].publicoHoy).toBe(true);
  });

  it('a kitchen that left reads dejó Wera while its 30 days last', () => {
    const lista = follows([], [
      { id: 'x', name: 'Tacos Lalo', gone_at: '2026-11-01T12:00:00+00:00' },
      { id: 'y', name: 'Antes', gone_at: '2026-10-01T12:00:00+00:00' },
    ]);
    expect(misCocinasDe(lista, AHORA).seFueron).toEqual([{ id: 'x', nombre: 'Tacos Lalo' }]);
    expect(ES.misCocinas.dejoItacate).toBe('dejó Wera');
  });

  it('nothing before her list is read — never a list that says she follows nothing', () => {
    expect(misCocinasDe(undefined, AHORA)).toEqual({ filas: [], seFueron: [] });
    const mis = code('app/(vecino)/(tabs)/mis-cocinas.tsx');
    expect(mis).toMatch(/siguiendo\.data === undefined \? \(/);
    expect(mis).toMatch(/useSiguiendo\(\)/);
  });
});

describe('¿Seguir a …? — once, after her first pickup at a kitchen (G20)', () => {
  const recogido = (over: Record<string, unknown> = {}) =>
    fila({ state: 'recogido', rate_until: '2026-11-11T22:00:00+00:00', ...over });
  const nadie = follows([]);

  it('asked under her first collected plate at a kitchen she does not follow', () => {
    const plato = recogido();
    expect(preguntarSeguir(plato, [plato], nadie, AHORA)).toBe(true);
  });

  it('rated or not, while its rating window lasts — her first star must not hide it', () => {
    const calificado = recogido({ my_rating: { stars: 5, tags: [] } });
    expect(preguntarSeguir(calificado, [calificado], nadie, AHORA)).toBe(true);
    expect(preguntarSeguir(calificado, [calificado], nadie, new Date('2026-11-11T22:00:01Z'))).toBe(false);
    const sinVentana = recogido({ rate_until: null });
    expect(preguntarSeguir(sinVentana, [sinVentana], nadie, AHORA)).toBe(false);
  });

  it('never a second plate there — so Ahora no is never asked again', () => {
    const primero = recogido({ id: 'p1', pickup_at: '2026-11-08T20:30:00+00:00', rate_until: '2026-11-09T22:00:00+00:00' });
    const segundo = recogido({ id: 'p2' });
    expect(preguntarSeguir(segundo, [primero, segundo], nadie, AHORA)).toBe(false);
    // A plate at another kitchen is its own first.
    const otra = recogido({ id: 'p3', kitchenId: MARI, kitchenName: 'Fonda Doña Mari' });
    expect(preguntarSeguir(otra, [primero, segundo, otra], nadie, AHORA)).toBe(true);
  });

  it('never when she follows it, nor before her list of kitchens is read, nor a plate she did not collect', () => {
    const plato = recogido();
    expect(preguntarSeguir(plato, [plato], follows([sigue()]), AHORA)).toBe(false);
    expect(preguntarSeguir(plato, [plato], undefined, AHORA)).toBe(false);
    // A bell alone is not following: she is asked.
    expect(preguntarSeguir(plato, [plato], follows([sigue({ following: false, bell: true })]), AHORA)).toBe(true);
    const liberado = fila({ state: 'liberado', rate_until: '2026-11-11T22:00:00+00:00' });
    expect(preguntarSeguir(liberado, [liberado], nadie, AHORA)).toBe(false);
  });

  it('under Ya lo tienes and under a past plate — read from the list as it is now', () => {
    const tab = code('app/(vecino)/apartados.tsx');
    expect(tab).toMatch(/preguntarSeguir\(apartado, lista \?\? \[\], siguiendo\.data, ahora\)/);
    // ⚠️ `10.9j-ii-a`: once her *Ya lo tengo* has landed — never while it waits on her phone, nor after a refusal.
    expect(tab).toMatch(/\{!esperando && rechazado === null && pregunta\(recogido\.id\) && \(\s*<PreguntaSeguir/);
    expect(tab).toMatch(/\{recogido\?\.id !== apartado\.id && pregunta\(apartado\.id\) && \(/);
    // Seguir follows and leaves the bell as it is (`0084` stores it off).
    expect(code('ui/PreguntaSeguir.tsx')).toMatch(/cambiar\(cocinaId, \{ siguiendo: true \}\)/);
    // *Ahora no* outlives the screen while the app runs — memory only.
    expect(tab).toMatch(/!yaRespondida\(id\)/);
    expect(tab).toMatch(/marcarRespondida\(id\);/);
    expect(code('ui/PreguntaSeguir.tsx')).not.toMatch(/AsyncStorage|SecureStore|expo-sqlite|@\/lib\/store/);
  });
});

describe('Seguir and its bell on a kitchen’s page (G21) — and a followed kitchen out of the door', () => {
  it('two switches: each tap changes one, the other left as it is (`null`)', () => {
    const seguir = code('ui/Seguir.tsx');
    expect(seguir).toMatch(/que === 'seguir' \? \{ siguiendo: !ahora\.siguiendo \} : \{ campana: !ahora\.campana \}/);
    // Not read yet, nothing to tap: a Seguir drawn before her list is known could undo a follow.
    expect(seguir).toMatch(/if \(siguiendo\.data === undefined && vigente === null\) return null;/);
    // ⚠️ Her tap's answer gives way to the next read of her list (another page of the kitchen may change it).
    expect(seguir).toMatch(/const vigente = ultimo !== null && siguiendo\.dataUpdatedAt <= ultimo\.at \? ultimo\.valor : null;/);
    // The page takes it as the route hands it; Wera Cocina's copy hands nothing.
    expect(code('app/(vecino)/cocina/[id].tsx')).toMatch(/seguir=\{<Seguir cocinaId=\{cocina\.id\} nombre=\{cocina\.name\} \/>\}/);
    expect(code('ui/PaginaDeCocina.tsx')).toMatch(/\{seguir\}/);
  });

  it('a kitchen she follows that the door no longer sends opens a page of its own, never Ya no está', () => {
    const ruta = code('app/(vecino)/cocina/[id].tsx');
    expect(ruta.indexOf('<PaginaSeguida')).toBeGreaterThan(-1);
    expect(ruta.indexOf('<PaginaSeguida')).toBeLessThan(ruta.indexOf('ES.pagina.yaNoEsta'));
    // ⚠️ Kept once seen — she may stop following it there — and a failed read said as itself.
    expect(ruta).toMatch(/const seguida = leida \?\? vista;/);
    expect(ruta).toMatch(/siguiendo\.isError\) return <PaginaVacia texto=\{apiErrorMessage\(siguiendo\.error\)\} \/>;/);
    // *No ha publicado …* only when it is true.
    expect(code('ui/PaginaSeguida.tsx')).toMatch(/const callada = atras === null \|\| DIAS_EN_LA_PUERTA < atras;/);
    // ⚠️ Its full page would say *Todavía sin calificaciones* of a kitchen that has stars.
    expect(code('ui/PaginaSeguida.tsx')).not.toMatch(/<PaginaDeCocina/);
    const seguida = follows([sigue({ last_day: AYER })]).cocinas[0];
    const cocina = cocinaDeSeguida(seguida, null);
    expect(cocina).toMatchObject({ id: LUPE, name: 'Fonda Doña Lupe', offers: [], estrellas: null, point: null });
    expect(cocina.summary.lastDay).toBe(AYER);
    expect(cocina.address.colonia).toBe('Santa María la Ribera');
  });
});
