// ============================================================================
// THE MAP'S ARITHMETIC — where it opens, when it is close enough for her pin,
// where a tap takes it, who put its centre where it is, which map it is, and
// the line naming her address on the card over it. Plan tasks `10.4b-iii-b`,
// `10.4c`, `10.4e` and `10.4g-i`.
//
// ⚠️ PURE, so `test/mapa.test.ts` pins it: the map itself (`react-native-maps`)
// is native and no suite can load it (ADR-035 §2.11), and every number here is a
// decision a phone would otherwise make silently.
//
// ⚠️⚠️ THE OWNER'S PRECISION IS IN HOW THE PIN IS SET, NOT IN THE COLUMN (`0072`):
// *"as precise as possible"* (2026-10-28), and this app has no GPS until the
// major update (`10.8`). Since `10.4e` (his ruling of 2026-11-02, as Uber does
// it) the pin stays in the middle of the map and she moves the map under it; the
// centre is her pin only when the map shows at most `CLOSE_METRES` across its
// narrower side. Until then a tap brings the map closer, centred where she
// tapped, a few streets at a time, so she can get there without pinching.
//
// ⚠️ ACROSS THE NARROWER SIDE, NOT TOP TO BOTTOM: a phone's map is taller than it
// is wide, and a region asked for is fitted into the view whole — so a region of
// `CLOSE_METRES` each way comes back as that much across and MORE top to bottom.
// Measuring the height would call it "still too far" for ever.
// ============================================================================

import type { AddressForm, Pin } from '@/api/place';

/** `react-native-maps`' region: a centre and how many degrees the view spans. */
export interface Region {
  readonly latitude: number;
  readonly longitude: number;
  readonly latitudeDelta: number;
  readonly longitudeDelta: number;
}

/** Metres in one degree of latitude (and of longitude at the equator). */
const METRES_PER_DEGREE = 111_320;

/**
 * ⚠️ WHERE THE MAP OPENS WHEN SHE HAS NO PIN: MEXICO CITY, its centre, wide
 * enough to see the central alcaldías. This app asks for no location (its
 * `app.json` blocks the permission). Since `10.4c` the address she typed is
 * searched as the map opens and the map flies there (`@/lib/useGoogle`'s
 * `useApertura`, Google's Geocoding since `10.4g-i`); this is where it stays when
 * the search finds nothing, has no signal, or the build has no key. The pilot is in this city.
 */
export const CIUDAD: Region = { latitude: 19.4326, longitude: -99.1332, latitudeDelta: 0.18, longitudeDelta: 0.18 };

/** How close the map must be for a tap to place her pin — about a block, roofs one by one. */
export const CLOSE_METRES = 100;

/**
 * ⚠️ A REGION COMES BACK A HAIR WIDER THAN IT WAS ASKED FOR — the map fits it to
 * the view and rounds — so "close enough" allows a tenth more. Without it, the
 * region a tap asked for could read as still too far, and the next tap would
 * ask for the same region again instead of placing the pin.
 */
export const CLOSE_SLACK = 1.1;

/** How much closer each tap brings the map while it is too far: about three zoom steps. */
export const TAP_ZOOM = 8;

/** How wide her kitchen's screen shows the map around her pin: the block and the streets beside it. */
export const GLANCE_METRES = 250;

const cosOf = (latitude: number) => Math.max(Math.cos((latitude * Math.PI) / 180), 0.01);

/** How many metres the view spans across its NARROWER side. */
export function metresAcross(region: Region): number {
  const tall = region.latitudeDelta * METRES_PER_DEGREE;
  const wide = region.longitudeDelta * METRES_PER_DEGREE * cosOf(region.latitude);
  return Math.min(tall, wide);
}

/** Is the map close enough for a tap to place the pin? */
export function closeEnough(region: Region): boolean {
  return metresAcross(region) <= CLOSE_METRES * CLOSE_SLACK;
}

/** A region `metres` across each way, centred on a point. */
export function regionAround(point: Pin, metres: number): Region {
  return {
    latitude: point.latitude,
    longitude: point.longitude,
    latitudeDelta: metres / METRES_PER_DEGREE,
    longitudeDelta: metres / (METRES_PER_DEGREE * cosOf(point.latitude)),
  };
}

/**
 * Where a tap takes a map that is still too far: centred on the tap, a
 * `TAP_ZOOM`th as wide, and never closer than `CLOSE_METRES` — so the tap that
 * makes it close enough is followed by the one that places the pin.
 */
export function closerAt(point: Pin, region: Region): Region {
  return regionAround(point, Math.max(CLOSE_METRES, metresAcross(region) / TAP_ZOOM));
}

/**
 * Where the map opens: the city, or — when she already has a pin — centred on it
 * and close enough that the centre is her pin until she moves the map.
 */
export function openingRegion(pin: Pin | null): Region {
  return pin === null ? CIUDAD : regionAround(pin, CLOSE_METRES);
}

/** `react-native-maps`' `getMapBoundaries()` answer: two corners of what the map shows. */
export interface Bounds {
  readonly northEast: Pin;
  readonly southWest: Pin;
}

/**
 * The region the map really shows, from its two corners. ⚠️ A TAP IS JUDGED ON
 * THIS, ASKED OF THE MAP AT THE TAP, NOT ON THE LAST REGION IT REPORTED: a tap
 * while the map is still moving — or a report that never came — would otherwise
 * be judged against where the map was. Across the antimeridian the east corner's
 * longitude is the smaller one, so the span wraps.
 */
export function regionFromBounds({ northEast, southWest }: Bounds): Region {
  const lngSpan = northEast.longitude - southWest.longitude;
  const longitudeDelta = lngSpan >= 0 ? lngSpan : lngSpan + 360;
  return {
    latitude: (northEast.latitude + southWest.latitude) / 2,
    longitude: southWest.longitude + longitudeDelta / 2,
    latitudeDelta: northEast.latitude - southWest.latitude,
    longitudeDelta,
  };
}

/**
 * Where a tap takes the map: the point she tapped to the middle, under the pin —
 * at the same zoom when the map is close enough, closer when it is still too far
 * (`closerAt`). Since `10.4e` a tap never places a pin by itself: the pin is the
 * centre, and the tap brings her door to it.
 */
export function tapOn(point: Pin, region: Region): Region {
  if (!closeEnough(region)) return closerAt(point, region);
  return { latitude: point.latitude, longitude: point.longitude, latitudeDelta: region.latitudeDelta, longitudeDelta: region.longitudeDelta };
}

// ----------------------------------------------------------------------------
// The pin is the map's centre, once she has put it there — `10.4e`
// ----------------------------------------------------------------------------

/**
 * ⚠️⚠️ THE PIN STAYS IN THE MIDDLE AND SHE MOVES THE MAP UNDER IT, AS UBER DOES IT
 * (the owner's ruling of 2026-11-02, reversing `10.4c`'s *her tap is the pin*).
 * What is stored is the map's centre — and ONLY ONCE SHE HAS PUT IT THERE
 * HERSELF: after a flight to a search's answer the centre is Google's point
 * (Apple's or LocationIQ's before `10.4g-i`), and Google's terms forbid keeping
 * it, so it is no pin until her own hand moves the map.
 *
 * Who moved it: `ella` — her finger (a drag, a pinch, a double tap), or a tap of
 * hers that brought her door to the middle; `otro` — a flight to an answer, or
 * nobody yet (the city the map opens on).
 */
export type Autor = 'ella' | 'otro';

/**
 * Two centres closer than this are one place: a report of the same view — the
 * map resized under the keyboard, an animation that had nowhere to go — and no
 * move. Also how far a move the app started may land from where it was sent.
 */
export const MISMO_PUNTO_METROS = 2;

/**
 * How long a move the app started may take to arrive (a flight is 900 ms, a tap's
 * 600). After it, a report that does not match it is not that move's.
 */
export const LLEGADA_MS = 1_500;

/** What the map knows of its centre between two of its reports. */
export interface Centro {
  /** Who put the centre where it is now. */
  readonly autor: Autor;
  /** Her finger moved the map since the last report — a drag, a pinch, a double tap. */
  readonly gesto: boolean;
  /** The centre the map last reported. */
  readonly ultimo: Pin;
  /** Where a move the app started is headed, on whose behalf, and until when it can arrive. */
  readonly destino: { readonly punto: Pin; readonly autor: Autor; readonly hasta: number } | null;
}

/** Metres between two points a few hundred metres apart at most (flat-earth, exact enough here). */
export function metrosEntre(a: Pin, b: Pin): number {
  const alto = (a.latitude - b.latitude) * METRES_PER_DEGREE;
  const ancho = (a.longitude - b.longitude) * METRES_PER_DEGREE * cosOf((a.latitude + b.latitude) / 2);
  return Math.hypot(alto, ancho);
}

const centroDe = (region: Region): Pin => ({ latitude: region.latitude, longitude: region.longitude });

/** As the map opens: on her pin, hers already; on the city, nobody's. */
export function centroAlAbrir(pin: Pin | null, abre: Region): Centro {
  return { autor: pin === null ? 'otro' : 'ella', gesto: false, ultimo: centroDe(abre), destino: null };
}

/** Her finger is moving the map (`onPanDrag`, `onDoublePress`). */
export function conGesto(centro: Centro): Centro {
  return centro.gesto ? centro : { ...centro, gesto: true };
}

/**
 * The app sends the map to a point — her tap's (`ella`) or an answer's (`otro`).
 * ⚠️ AN ANSWER'S FLIGHT TAKES THE CENTRE FROM HER AT ONCE: from the first frame the
 * middle of the map is leaving her point for the provider's.
 */
export function haciaUnPunto(centro: Centro, punto: Pin, autor: Autor, ahora: number): Centro {
  return {
    ...centro,
    autor: autor === 'otro' ? 'otro' : centro.autor,
    destino: { punto, autor, hasta: ahora + LLEGADA_MS },
  };
}

/**
 * ⚠️⚠️ THE MAP STOPPED (`onRegionChangeComplete`): who put the centre there. Her
 * gesture, seen on the way or flagged by the map (`isGesture`, Android's only —
 * an iPhone's map always says no) → hers, whatever was under way. Else the arrival
 * of a move the app started → whoever it was for. Else, with no move of the app's
 * under way, a centre that moved → hers: nothing but her finger moves this map.
 * Else (a resize, a report of the same view, a move of the app's cut short) →
 * unchanged: what was not hers stays not hers.
 */
export function alLlegar(centro: Centro, region: Region, gestoDelMapa: boolean, ahora: number): Centro {
  const aqui = centroDe(region);
  const destino = centro.destino !== null && ahora <= centro.destino.hasta ? centro.destino : null;
  if (centro.gesto || gestoDelMapa) return { autor: 'ella', gesto: false, ultimo: aqui, destino: null };
  if (destino !== null && metrosEntre(aqui, destino.punto) <= MISMO_PUNTO_METROS) {
    return { autor: destino.autor, gesto: false, ultimo: aqui, destino: null };
  }
  if (destino === null && metrosEntre(aqui, centro.ultimo) > MISMO_PUNTO_METROS) {
    return { autor: 'ella', gesto: false, ultimo: aqui, destino: null };
  }
  return { ...centro, gesto: false, ultimo: aqui, destino };
}

/**
 * Her pin, as the map now stands: the centre when she put it there and the map
 * is close enough, else `null` — and what she has already, unchanged, while the
 * centre is the same place (a resize must not rewrite her pin to the seventh
 * decimal).
 */
export function pinDelCentro(centro: Centro, region: Region, actual: Pin | null): Pin | null {
  if (centro.autor !== 'ella' || !closeEnough(region)) return null;
  const aqui = centroDe(region);
  return actual !== null && metrosEntre(actual, aqui) <= MISMO_PUNTO_METROS ? actual : aqui;
}

/** How long after the map stops the card asks Google for the street under her pin, in ms: a fling and its correction ask once. */
export const ES_AQUI_PAUSA_MS = 400;

// ----------------------------------------------------------------------------
// Which map, and the card over it — `10.4c`, and `10.4g-i`
// ----------------------------------------------------------------------------

/**
 * ⚠️ THE FLAT STREET MAP, THE OWNER'S RULING OF 2026-10-31 — Google's standard
 * one on both phones since `10.4g-i` (his ruling of 2026-11-03; an iPhone drew
 * Apple's muted map before). The delivery apps use a standard street map and
 * never satellite. Businesses stay hidden (`@/ui/MapaPunto`'s `SIN_NEGOCIOS`).
 */
export const TIPO_DE_MAPA = 'standard';

/**
 * ⚠️ THE CARD NAMES HER OWN ADDRESS (`10.4g-i`, his ruling of 2026-11-03) — street
 * and number, then her colonia, as she gave them in the form — or `null` while she
 * gave no street. Until then the card read the phone's own maps, which named the
 * point under the pin: Apple's answers cannot be shown on Google's map, and hers
 * is the address she will be found by. What Google says is under the pin only
 * warns (`@/lib/google`'s `otraCalle`).
 */
export function lineaDeSuDireccion(direccion: Pick<AddressForm, 'street' | 'number' | 'colonia'> | null): string | null {
  const calle = (direccion?.street ?? '').replace(/\s+/g, ' ').trim();
  if (calle === '') return null;
  const numero = (direccion?.number ?? '').replace(/\s+/g, ' ').trim();
  const colonia = (direccion?.colonia ?? '').replace(/\s+/g, ' ').trim();
  return [numero === '' ? calle : `${calle} ${numero}`, colonia].filter((parte) => parte !== '').join(', ');
}
