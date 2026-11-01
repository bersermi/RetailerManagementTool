// ============================================================================
// THE MAP'S ARITHMETIC — where it opens, when it is close enough for her pin,
// where a tap takes it, which map it is, and what the phone says her pin is.
// Plan tasks `10.4b-iii-b` and `10.4c`.
//
// ⚠️ PURE, so `test/mapa.test.ts` pins it: the map itself (`react-native-maps`)
// is native and no suite can load it (ADR-035 §2.11), and every number here is a
// decision a phone would otherwise make silently.
//
// ⚠️⚠️ THE OWNER'S PRECISION IS IN HOW THE PIN IS SET, NOT IN THE COLUMN (`0072`):
// *"as precise as possible"* (2026-10-28), and this app has no GPS until the
// major update (`10.8`) — so a tap on the map, close in. A pin is
// placed only when the map shows at most `CLOSE_METRES` across its narrower
// side; until then a tap brings the map closer to where she tapped, a few
// streets at a time, so she can get there without pinching.
//
// ⚠️ ACROSS THE NARROWER SIDE, NOT TOP TO BOTTOM: a phone's map is taller than it
// is wide, and a region asked for is fitted into the view whole — so a region of
// `CLOSE_METRES` each way comes back as that much across and MORE top to bottom.
// Measuring the height would call it "still too far" for ever.
// ============================================================================

import type { Pin } from '@/api/place';

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
 * searched as the map opens and the map flies there (`@/lib/locationiq`'s
 * `useApertura`); this is where it stays when the search finds nothing, has no
 * signal, or the build has no token. The pilot is in this city.
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
 * Where the map opens: the city, or — when she already has a pin — close around
 * it, close enough that her first tap moves it.
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

/** What a tap does: place the pin, or bring the map closer. */
export type Tap = { readonly kind: 'place'; readonly pin: Pin } | { readonly kind: 'closer'; readonly region: Region };

export function tapOn(point: Pin, region: Region): Tap {
  return closeEnough(region) ? { kind: 'place', pin: point } : { kind: 'closer', region: closerAt(point, region) };
}

// ----------------------------------------------------------------------------
// Which map, and what the phone's own maps say her pin is — `10.4c`
// ----------------------------------------------------------------------------

/**
 * ⚠️ THE FLAT STREET MAP, THE OWNER'S RULING OF 2026-10-31: the delivery apps use
 * a standard street map and never satellite. An iPhone draws Apple's muted
 * version, which lets her pin stand out; Android draws Google's standard one —
 * `mutedStandard` is Apple's alone. Businesses stay hidden on both
 * (`@/ui/MapaPunto`'s `SIN_NEGOCIOS`, and `showsPointsOfInterests`).
 */
export function tipoDeMapa(os: string): 'mutedStandard' | 'standard' {
  return os === 'ios' ? 'mutedStandard' : 'standard';
}

/** `react-native-maps`' `addressForCoordinate` answer, the fields read here. */
export interface LugarDelTelefono {
  readonly thoroughfare?: unknown;
  readonly subThoroughfare?: unknown;
  readonly subLocality?: unknown;
}

/**
 * ⚠️ AN IPHONE SENDS A MISSING FIELD AS THE TEXT `(null)`: `react-native-maps`
 * 1.27.2 formats each `CLPlacemark` field with `%@` (`RNMapsAirModule.mm`), so a
 * pin with no house number arrives as `subThoroughfare: "(null)"`. Android sends
 * a JSON null. Both are nothing here — and so is Google's `Unnamed Road`.
 */
function campo(value: unknown): string {
  const text = typeof value === 'string' ? value.trim() : '';
  return /^(\(null\)|null|unnamed road|calle sin nombre)$/i.test(text) ? '' : text;
}

/**
 * *¿Es aquí? …* — what the phone's own maps call the point she tapped, as one
 * line: *Durango 220, Roma Norte*. `null` when they name no street, and then no
 * line is shown. ⚠️ SHOWN AND NEVER KEPT: the answer is Apple's or Google's, whose
 * terms forbid keeping it; what is saved is her tap and the address she typed.
 */
export function lineaDeLugar(lugar: LugarDelTelefono | null | undefined): string | null {
  const calle = campo(lugar?.thoroughfare);
  if (calle === '') return null;
  const numero = campo(lugar?.subThoroughfare);
  const colonia = campo(lugar?.subLocality);
  return [numero === '' ? calle : `${calle} ${numero}`, colonia].filter((parte) => parte !== '').join(', ');
}
