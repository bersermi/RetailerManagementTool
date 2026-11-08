// ============================================================================
// THE MAP OF KITCHENS, WITH THE LIST SLIDING OVER IT — EVERY RULE, PURE. Plan task
// `10.5-iv-b-i`, the owner's answers of 2026-11-05 (`10.5-iv-a-iii`'s page,
// https://claude.ai/artifact/M5kESDfKVSy3mFEyT3g7dy): *"I'd prefer option C"* — the
// map, with the list sliding over it — and the family-shell page's *Cerca*, ruled
// "as drawn, polished" the same night.
//
// ⚠️ WHAT THIS FILE DECIDES, EACH PINNED BY `test/mapa.test.ts`:
//   - which kitchens are pins — every kitchen the door sends that has a point (the
//     door's, else where her phone found its address, as the list places it), on
//     offer or faded when quiet (`pinesDe`);
//   - ⚠️ PINS THAT OVERLAP ARE ONE BIGGER PIN WITH HOW MANY KITCHENS IT HOLDS, UNTIL
//     SHE ZOOMS IN (his ruling of 2026-11-03): two pins whose centres are nearer on
//     her screen than a pin is wide are one circle (`agrupar`), worked out again each
//     time the map stops moving; a tap on it comes closer, or — when its kitchens
//     share one spot, so no zoom would part them — shows them all (`alTocarGrupo`);
//   - the sheet's three heights — the list full, half, or only its head — and where a
//     drag or a tap leaves it (`posicionesDe`, `nivelAlSoltar`, `siguienteAlTocar`);
//   - ⚠️ THE MAP'S PADDING KEEPS GOOGLE'S LOGO ABOVE THE LIST (his answer 4, and
//     Google's terms: its logo may not be covered): the map's foot is the sheet's top
//     (`paddingDelMapa`);
//   - where the map opens and when it flies: on her — her location, or the postal
//     code's centre where her dot would be (his answer 5) — close enough to see the
//     kitchens within about a kilometre; over the city while there is neither; and it
//     flies again only when where she searches from CHANGES, never as she walks, so it
//     never pulls the map from under her finger (`camaraDe`, `claveDeOrigen`);
//   - a pin she taps puts its kitchen's cards first, under *En el mapa* (`partir`).
// ⚠️ NOTHING HERE FILTERS OR CUTS OFF BY DISTANCE: every kitchen is a pin wherever she
// moves the map (his ruling of 2026-11-04, night — browsing the city is a way in of its
// own), and the 1.5 and 3 km limits wait for Google's reply (`10.5-iv-b-iii`).
// ============================================================================

import type { Kitchen, Punto } from '@/api/cocinas';
import { colorOf, defaultsFor, type ColorCode, type Dibujo } from '@/api/pagina';
import { metrosEntre } from '@/lib/distancia';
import { puntoDe, vigentes, type Tarjeta } from '@/lib/lista';
import type { Origen } from '@/lib/ubicacion';

// ----------------------------------------------------------------------------
// The pins
// ----------------------------------------------------------------------------

/** A kitchen on the map. */
export interface Pin {
  readonly id: string;
  readonly nombre: string;
  readonly punto: Punto;
  /** Something on offer now — else the pin is faded, as her card is. */
  readonly enOferta: boolean;
  /** Her colour and her trade's drawing, as her card and her page wear them. */
  readonly color: ColorCode;
  readonly dibujo: Dibujo;
}

/** Every kitchen the door sends that has a point — the list's points — in a stable order. */
export function pinesDe(cocinas: readonly Kitchen[], buscados: ReadonlyMap<string, Punto>, ahora: Date): Pin[] {
  const pines: Pin[] = [];
  for (const cocina of cocinas) {
    const punto = puntoDe(cocina, buscados);
    if (punto === null) continue;
    pines.push({
      id: cocina.id,
      nombre: cocina.name,
      punto: { latitude: punto.latitude, longitude: punto.longitude },
      enOferta: vigentes(cocina, ahora).length > 0,
      color: colorOf(cocina.page, cocina.giro),
      dibujo: defaultsFor(cocina.giro).dibujo,
    });
  }
  return pines.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

// ----------------------------------------------------------------------------
// Pins that overlap — his ruling of 2026-11-03
// ----------------------------------------------------------------------------

/** A pin's width on the screen, in points; a pin she tapped is drawn larger. */
export const DIAMETRO = 36;
export const DIAMETRO_ELEGIDO = 46;

/** ⚠️ Two pins whose centres are nearer than a pin is wide overlap, so they are one circle. */
export const JUNTOS = DIAMETRO;

/** Kitchens this close share one spot — no zoom would part them, so a tap shows them all. */
export const MISMO_LUGAR_M = 25;

/** What the map draws: one kitchen, or several that overlap at this zoom. */
export type Marca =
  | { readonly kind: 'pin'; readonly key: string; readonly pin: Pin }
  | {
      readonly kind: 'grupo';
      readonly key: string;
      readonly pines: readonly Pin[];
      /** The middle of its kitchens. */
      readonly punto: Punto;
      /** Something on offer in one of them at least — else the circle is faded too. */
      readonly enOferta: boolean;
    };

/** Mercator's y, in radians — the map Google draws. */
function mercatorY(latitud: number): number {
  const phi = (latitud * Math.PI) / 180;
  return Math.log(Math.tan(Math.PI / 4 + phi / 2));
}

/** How many screen points one radian of longitude spans, at this zoom. */
function puntosPorRadian(anchoDelMapa: number, longitudeDelta: number): number {
  return anchoDelMapa / ((longitudeDelta * Math.PI) / 180);
}

/** How far apart two places are drawn on her screen, in points. */
export function separacionEnPantalla(a: Punto, b: Punto, anchoDelMapa: number, longitudeDelta: number): number {
  const escala = puntosPorRadian(anchoDelMapa, longitudeDelta);
  const dx = (((a.longitude - b.longitude) * Math.PI) / 180) * escala;
  const dy = (mercatorY(a.latitude) - mercatorY(b.latitude)) * escala;
  return Math.hypot(dx, dy);
}

/**
 * The marks for this zoom — `longitudeDelta`, how many degrees of longitude the map's
 * width shows, and that width in points. ⚠️ GREEDY AND STABLE: the kitchens on offer
 * first, then by id, each gathers the ones still loose within `JUNTOS` of it; a group's
 * key is its kitchens' ids, so it is drawn again only when what it holds changes.
 * ⚠️ A KITCHEN SHE TAPPED IS NEVER HIDDEN IN A GROUP (`aparte`): it stays a pin of its own.
 * Before the map has said its size, every pin stands alone.
 */
export function agrupar(
  pines: readonly Pin[],
  longitudeDelta: number | null,
  anchoDelMapa: number,
  aparte: ReadonlySet<string> = new Set(),
): Marca[] {
  const solos = (lista: readonly Pin[]): Marca[] => lista.map((pin) => ({ kind: 'pin', key: `pin:${pin.id}`, pin }));
  if (longitudeDelta === null || !(longitudeDelta > 0) || !(anchoDelMapa > 0)) return solos(pines);
  const marcas: Marca[] = solos(pines.filter((pin) => aparte.has(pin.id)));
  const sueltos = pines
    .filter((pin) => !aparte.has(pin.id))
    .sort((a, b) => Number(b.enOferta) - Number(a.enOferta) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const tomados = new Set<string>();
  for (const semilla of sueltos) {
    if (tomados.has(semilla.id)) continue;
    const juntos = sueltos.filter(
      (otro) =>
        !tomados.has(otro.id) &&
        (otro.id === semilla.id || separacionEnPantalla(semilla.punto, otro.punto, anchoDelMapa, longitudeDelta) < JUNTOS),
    );
    for (const pin of juntos) tomados.add(pin.id);
    if (juntos.length === 1) {
      marcas.push({ kind: 'pin', key: `pin:${semilla.id}`, pin: semilla });
      continue;
    }
    const ids = juntos.map((pin) => pin.id).sort();
    marcas.push({
      kind: 'grupo',
      key: `grupo:${ids.join(',')}`,
      pines: juntos,
      punto: {
        latitude: juntos.reduce((suma, pin) => suma + pin.punto.latitude, 0) / juntos.length,
        longitude: juntos.reduce((suma, pin) => suma + pin.punto.longitude, 0) / juntos.length,
      },
      enOferta: juntos.some((pin) => pin.enOferta),
    });
  }
  return marcas;
}

/**
 * A tap on a group: come closer until its kitchens part — or, when they share one spot
 * (`MISMO_LUGAR_M`, two kitchens in one building), show them all under *En el mapa*,
 * since no zoom would ever part them.
 */
export function alTocarGrupo(
  pines: readonly Pin[],
): { readonly kind: 'acercar'; readonly puntos: readonly Punto[] } | { readonly kind: 'elegir'; readonly ids: readonly string[] } {
  let lejos = 0;
  for (const a of pines) for (const b of pines) lejos = Math.max(lejos, metrosEntre(a.punto, b.punto));
  if (lejos <= MISMO_LUGAR_M) return { kind: 'elegir', ids: pines.map((pin) => pin.id) };
  return { kind: 'acercar', puntos: pines.map((pin) => pin.punto) };
}

// ----------------------------------------------------------------------------
// The sheet — the list sliding over the map
// ----------------------------------------------------------------------------

/** The list full, half, or only its head showing — the family-shell page's three. */
export const NIVELES = ['lleno', 'medio', 'bajo'] as const;
export type Nivel = (typeof NIVELES)[number];

/** It opens half-way: the map above, the first cards below — as drawn. */
export const NIVEL_INICIAL: Nivel = 'medio';

/** Half-way is the sheet's top at this share of the screen, from the top. */
export const MEDIO = 0.42;

/** A flick faster than this, in points a second, goes on to the next height that way. */
export const LANZADA = 700;

/** Where the sheet's top rests at each height, measured from the top of *Cerca*. */
export interface Posiciones {
  readonly lleno: number;
  readonly medio: number;
  readonly bajo: number;
}

/**
 * The three heights, from *Cerca*'s height, the top it must leave free (the phone's
 * clock), and the height of the sheet's head. ⚠️ Low leaves exactly the head showing;
 * half never sits above full or below low, on any phone.
 */
export function posicionesDe(alto: number, arriba: number, cabeza: number): Posiciones {
  const lleno = Math.max(0, Math.round(arriba));
  const bajo = Math.max(lleno, Math.round(alto - cabeza));
  const medio = Math.min(bajo, Math.max(lleno, Math.round(alto * MEDIO)));
  return { lleno, medio, bajo };
}

/**
 * Where a drag lets go: a flick goes on to the next height its way; otherwise the
 * nearest height to where she let go.
 */
export function nivelAlSoltar(y: number, velocidad: number, posiciones: Posiciones): Nivel {
  const ordenados = NIVELES.map((nivel) => ({ nivel, y: posiciones[nivel] })).sort((a, b) => a.y - b.y);
  if (velocidad <= -LANZADA) {
    const arriba = [...ordenados].reverse().find((n) => n.y < y - 1);
    return (arriba ?? ordenados[0]).nivel;
  }
  if (velocidad >= LANZADA) {
    const abajo = ordenados.find((n) => n.y > y + 1);
    return (abajo ?? ordenados[ordenados.length - 1]).nivel;
  }
  return ordenados.reduce((mejor, n) => (Math.abs(n.y - y) < Math.abs(mejor.y - y) ? n : mejor)).nivel;
}

/** A tap on the handle, as drawn: full and low go half-way; half-way goes full. */
export function siguienteAlTocar(nivel: Nivel): Nivel {
  return nivel === 'medio' ? 'lleno' : 'medio';
}

/**
 * The map's padding — its top under the phone's clock, its foot at the sheet's top, so
 * Google's logo and the map's middle stay above the list. ⚠️ With the list full the map
 * is hidden, and its padding stays half-way's: Google's map refuses a padding taller
 * than itself, and coming back down must not move the map.
 */
export function paddingDelMapa(nivel: Nivel, posiciones: Posiciones, alto: number, arriba: number) {
  const tope = nivel === 'lleno' ? posiciones.medio : posiciones[nivel];
  return { top: Math.max(0, Math.round(arriba)), right: 0, bottom: Math.max(0, Math.round(alto - tope)), left: 0 };
}

/** How much of the list hides below the screen at this height — the list's own foot room. */
export function escondido(nivel: Nivel, posiciones: Posiciones): number {
  return Math.max(0, posiciones[nivel] - posiciones.lleno);
}

// ----------------------------------------------------------------------------
// Where the map opens, and when it flies
// ----------------------------------------------------------------------------

/** Close enough to see the kitchens within about a kilometre of her, on a phone. */
export const ZOOM_CERCA = 15;

/** The city, while the map has nowhere to be: before her location, or with neither. */
export const ZOOM_CIUDAD = 11;

/** The middle of Mexico City — the Zócalo — where the map waits for her. */
export const CENTRO_DE_LA_CIUDAD: Punto = { latitude: 19.4326, longitude: -99.1332 };

/** The camera: on her (her location or her postal code's centre), else over the city. */
export function camaraDe(desde: Punto | null): { readonly center: Punto; readonly zoom: number; readonly heading: 0; readonly pitch: 0 } {
  return desde === null
    ? { center: CENTRO_DE_LA_CIUDAD, zoom: ZOOM_CIUDAD, heading: 0, pitch: 0 }
    : { center: desde, zoom: ZOOM_CERCA, heading: 0, pitch: 0 };
}

/**
 * ⚠️ WHEN THE MAP FLIES TO HER: when where she searches from changes — her location
 * found, a postal code picked, back to her location — never as she walks, which only
 * moves her dot. The key changes exactly then.
 */
export function claveDeOrigen(origen: Origen): string {
  if (origen.kind === 'aqui') return 'aqui';
  if (origen.kind === 'codigo') return `codigo:${origen.cp}`;
  return 'ninguno';
}

// ----------------------------------------------------------------------------
// A pin she taps — *En el mapa*, as drawn
// ----------------------------------------------------------------------------

/** The cards of the kitchens she tapped, first — in the list's order — and the rest under them. */
export function partir(
  tarjetas: readonly Tarjeta[],
  elegidas: ReadonlySet<string>,
): { readonly enElMapa: Tarjeta[]; readonly resto: Tarjeta[] } {
  if (elegidas.size === 0) return { enElMapa: [], resto: [...tarjetas] };
  return {
    enElMapa: tarjetas.filter((tarjeta) => elegidas.has(tarjeta.cocina.id)),
    resto: tarjetas.filter((tarjeta) => !elegidas.has(tarjeta.cocina.id)),
  };
}
