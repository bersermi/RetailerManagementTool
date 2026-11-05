// ============================================================================
// WHAT ITACATE ASKS GOOGLE, AND WHAT IT READS IN THE ANSWER — PURE. Plan task
// `10.5-iv-a-i`. The requests are `@/lib/useGoogle`'s.
//
// ⚠️ TWO QUESTIONS, BOTH GEOCODING, BOTH FROM HER PHONE FOR HER ALONE:
//   1. a kitchen the door sends with no point — no pin of her own and no fresh
//      copy of Google's — is placed by its address, so its distance can be shown
//      (Service Specific Terms §6.3.2: for that neighbour alone; the plan's row);
//   2. her postal code, when she declines her location or her phone gives an
//      approximate one (the owner's ruling of 2026-11-03).
// ⚠️⚠️ NOTHING IS KEPT: the answers live in memory while the app is open and die
// with it (`@/lib/useGoogle`) — never on the phone's disk, never sent to the
// database, never shared between neighbours. Google receives the kitchen's
// address or the five digits she typed, never where she is.
//
// ⚠️ WERA COCINA'S RULES, COPIED (`cocina/src/lib/google.ts`, plans `10.4g-i` and
// `10.5-i-b-ii`): the key's shape (`claveDe`), Geocoding's question for an address
// (Spanish, Mexico only, leaning on the zone) and the headers that name the app —
// each with THIS app's values: its id and its test builds' signature, which
// Google's Android key lists for `mx.wera.vecino` (the handbook's *Before the two
// new apps' first builds*, step 10). `test/gemelos.test.ts` holds the shared code
// to Wera Cocina's file.
// ============================================================================

import type { Address, Punto } from '@/api/cocinas';
import { RECTANGULO, enLaZona } from '@/lib/zona';

/** Geocoding API — the GA one, as Wera Cocina asks it. */
export const GEOCODING_URL = 'https://maps.googleapis.com/maps/api/geocode/json';

export const REGION = 'mx';

/** How long a question to Google is waited for before it counts as no signal, in ms — Wera Cocina's. */
export const LIMITE_MS = 8_000;

// ----------------------------------------------------------------------------
// The key, and what each phone says with it
// ----------------------------------------------------------------------------

/**
 * This phone's key, or `null` — and then nothing is asked. Google's API keys are
 * `AIza` and 35 more of these characters: anything else — the build's stand-in
 * `sin-clave` (`app.config.ts`), a value put in the wrong variable — is refused
 * rather than sent.
 */
export function claveDe(raw: unknown): string | null {
  const clave = typeof raw === 'string' ? raw.trim() : '';
  return /^AIza[0-9A-Za-z_-]{35}$/.test(clave) ? clave : null;
}

/** This app's id — the iPhone's bundle and Android's package (`test/identity.test.ts`). */
export const ID_DE_LA_APP = 'mx.wera.vecino';

/**
 * ⚠️ THE SIGNING FINGERPRINT ANDROID'S REQUESTS NAME: the one Expo signs this
 * app's test builds with, read off them on 2026-10-27 — one of the two the Android
 * key accepts for `mx.wera.vecino` (the handbook, step 10; Play's own is the
 * other). Google asks for it without colons. Not a secret: it is read off any copy
 * of the app. ⚠️ MEASURED 2026-11-05 (`10.5-iv-a-i`): with it Google gets past the
 * app's lock (`API_KEY_ANDROID_APP_BLOCKED` with any other), so a refusal after it
 * is the key's list of services — the plan's status log.
 */
export const FIRMA_ANDROID = '86EC1BC6D2B26983F4534DF87138639AA221E22F';

/** The headers that say which app asks: the bundle id on an iPhone, the package and fingerprint on Android. */
export function cabecerasDeLaApp(os: string): Readonly<Record<string, string>> {
  return os === 'ios'
    ? { 'X-Ios-Bundle-Identifier': ID_DE_LA_APP }
    : { 'X-Android-Package': ID_DE_LA_APP, 'X-Android-Cert': FIRMA_ANDROID };
}

// ----------------------------------------------------------------------------
// What is asked
// ----------------------------------------------------------------------------

/**
 * A kitchen's address as one line — street and number, colonia, city or alcaldía,
 * postcode, as she wrote them in Wera Cocina — or `null` without a street, which
 * Google could only place at a colonia's middle.
 */
export function preguntaDeSuDireccion(direccion: Address): string | null {
  if (direccion.street === '') return null;
  const partes = [
    `${direccion.street} ${direccion.number}`.trim(),
    direccion.colonia,
    direccion.city,
    direccion.postalCode,
  ].filter((parte) => parte !== '');
  return partes.join(', ').replace(/\s+/g, ' ').trim();
}

/** Geocoding's bounds: south, west | north, east. */
const BOUNDS = `${RECTANGULO.low.latitude},${RECTANGULO.low.longitude}|${RECTANGULO.high.latitude},${RECTANGULO.high.longitude}`;

/** An address to Geocoding: Spanish, Mexico only, leaning on the zone. */
export function urlDeGeocodificar(pregunta: string, clave: string): string {
  const params = new URLSearchParams({
    address: pregunta,
    language: 'es',
    region: REGION,
    components: 'country:MX',
    bounds: BOUNDS,
    key: clave,
  });
  return `${GEOCODING_URL}?${params.toString()}`;
}

/** Five digits, as a Mexican postal code is written — spaces dropped — or `null`. */
export function codigoPostalDe(escrito: string): string | null {
  const cp = escrito.replace(/\s+/g, '');
  return /^\d{5}$/.test(cp) ? cp : null;
}

/** Her postal code to Geocoding, as a component: the middle of that code's area, in Mexico. */
export function urlDelCodigoPostal(cp: string, clave: string): string {
  const params = new URLSearchParams({
    components: `postal_code:${cp}|country:MX`,
    language: 'es',
    region: REGION,
    key: clave,
  });
  return `${GEOCODING_URL}?${params.toString()}`;
}

// ----------------------------------------------------------------------------
// What comes back
// ----------------------------------------------------------------------------

/** What Geocoding came back with. No signal is `@/lib/useGoogle`'s: `fetch` fails before any status. */
export type Respuesta =
  | { readonly kind: 'punto'; readonly punto: Punto }
  | { readonly kind: 'ninguna' }
  | { readonly kind: 'fuera' }
  | { readonly kind: 'sin-senal' }
  | { readonly kind: 'falla' };

const objeto = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};

function puntoDe(value: unknown): Punto | null {
  const p = objeto(objeto(value).location);
  const latitude = p.lat;
  const longitude = p.lng;
  if (typeof latitude !== 'number' || typeof longitude !== 'number') return null;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    return null;
  }
  return { latitude, longitude };
}

/**
 * ⚠️ GEOCODING ANSWERS EVERY QUESTION WITH A 200 and says how it went in
 * `status`: *ZERO_RESULTS* is nothing found; *REQUEST_DENIED* (a key, an app or a
 * service it refuses), *OVER_QUERY_LIMIT* (his project's daily limit) and the rest
 * are a failure. Its first answer inside the zone is the one used; answers only
 * outside it are `fuera` — a postal code from another state, *Itacate aún no llega
 * a esa zona*.
 */
export function respuestaDeGeocoding(status: number, body: unknown): Respuesta {
  if (status < 200 || status >= 300) return { kind: 'falla' };
  const b = objeto(body);
  if (b.status === 'ZERO_RESULTS') return { kind: 'ninguna' };
  if (b.status !== 'OK') return { kind: 'falla' };
  const puntos = (Array.isArray(b.results) ? b.results : [])
    .map((row) => puntoDe(objeto(row).geometry))
    .filter((punto): punto is Punto => punto !== null);
  if (puntos.length === 0) return { kind: 'ninguna' };
  const dentro = puntos.find(enLaZona);
  return dentro === undefined ? { kind: 'fuera' } : { kind: 'punto', punto: dentro };
}
