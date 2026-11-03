// ============================================================================
// HER KITCHEN'S ADDRESS SEARCH, AS A CONTRACT WITH GOOGLE. Plan task `10.4g-i`,
// the owner's ruling of 2026-11-03 (*"go"*): Wera Cocina on Google on both
// phones — Google's map, Google's suggestions as she types, a pick filling her
// five boxes, the map opening on Google's point, and the card over the map naming
// her address and warning when Google puts the pin on another street.
// LocationIQ (`10.4c`) and the phones' own geocoders (`10.4d`) are out of the
// search; the native geocoder (`cocina/modules/geocodificador`) stays in the
// build, asked by nothing.
//
// ⚠️ MEASURED FIRST (2026-11-03, the plan's status log), on the twenty addresses
// at the four moments of her typing: with her number, colonia and alcaldía,
// Google's first suggestion was on her block for 12 (11 of the 12 whose recorded
// point is trusted, the twelfth 284 m off), where Apple's own search was for 8
// and the iPhone's geocoder for 11; the map's opening, her form's four parts
// through Geocoding, 13 (11 of 12); at her own door Google named her street for 14
// (11 of 12). Without her colonia, hers was among the five suggestions for 3 to 5
// of the twenty, with it 11 to 14 — so the map's box adds what she typed in the
// form (`preguntaConSuDireccion`), and the form's own box, *Busca tu dirección*
// above her five boxes (the owner's answer of 2026-11-03), asks for her street,
// number and colonia in its hint and sends what she typed alone (`preguntaDe`):
// the boxes under it are what her pick fills, not what it asks with.
//
// ⚠️⚠️ WHAT IS KEPT: HER FIVE BOXES AND HER PIN, NEVER GOOGLE'S POINT. A
// suggestion she picks fills the boxes — Google lets the address an end user picks
// be hers (*Autocomplete for end user addresses*, its Places policies, read
// 2026-11-03), never the list — and every box stays hers to change. Google's point
// only moves the map: her pin is the centre once her own hand moved it
// (`@/lib/mapa`'s `alLlegar`). What Google calls the street under her pin is shown
// on the card and never kept. `test/buscar.test.ts` reads the screens for it, and
// refuses this module in `src/api/`.
//
// ⚠️ ONE SESSION PER SEARCH (Google's session pricing, read 2026-11-02): every
// suggestion asked while she looks for one address carries one token, and the
// details of her pick end it — then at most its first 12 requests are billed.
// The token is the phone's (`@/lib/useGoogle`); this file only sends it.
//
// ⚠️ THE KEYS ARE LOCKED TO THIS APP (the owner's Google Cloud steps, 2026-11-03):
// an iPhone's request names the bundle id, Android's the package and a signing
// fingerprint the key accepts. Google says anyone can copy those, so a copied key
// is bounded by his project's daily limits and budget alert (the handbook's
// *Google's search for Wera Cocina*), not by these.
//
// ⚠️ PURE, so the suite pins every value sent and every answer read; the
// requests are `@/lib/useGoogle`'s.
// ============================================================================

import { EMPTY_ADDRESS, checkAddress, type AddressForm, type Pin } from '@/api/place';
import { CLOSE_METRES } from '@/lib/mapa';

// ----------------------------------------------------------------------------
// Where it asks, and where it looks
// ----------------------------------------------------------------------------

/** Google's suggestions as she types: Places API (New), Autocomplete. */
export const SUGERENCIAS_URL = 'https://places.googleapis.com/v1/places:autocomplete';

/** The details of the suggestion she picks — Place Details (New); its id follows. */
export const DETALLES_URL = 'https://places.googleapis.com/v1/places/';

/**
 * Geocoding — the map's opening, the keyboard's *Buscar*, and the street under her
 * pin. ⚠️ THE GENERALLY AVAILABLE ONE: Geocoding v4 was still a Preview (its
 * overview, read 2026-11-03); measured both ways the same day, the same 13 of 20.
 */
export const GEOCODING_URL = 'https://maps.googleapis.com/maps/api/geocode/json';

/**
 * ⚠️ ONLY PLACE DETAILS ESSENTIALS' FIELDS: a session ended by them bills its
 * first 12 requests and nothing after; one more field of a dearer tier would bill
 * the whole session at that tier.
 */
export const CAMPOS_DE_DETALLES = 'id,location,viewport,addressComponents';

/** Mexico's Spanish, Mexico only. */
export const IDIOMA = 'es-MX';
export const REGION = 'mx';

/**
 * ⚠️ WHERE THE SEARCH LOOKS: MEXICO CITY AND THE STATE OF MEXICO — the owner's
 * ruling of 2026-11-02 (`10.4f`; the Valle de México alone before), as
 * `min_lon,min_lat,max_lon,max_lat`: INEGI's extreme coordinates of the State of
 * Mexico (*Aspectos Geográficos*, 2021, cuadro 1.1 — N 20°17'09", S 18°22'01",
 * E 98°35'49", W 100°36'47"), a hundredth of a degree wider each way. Mexico City
 * lies inside it whole. A box, so it also takes in the edges of the states around
 * — Pachuca, Cuernavaca, Taxco. Google's suggestions are kept inside it
 * (`locationRestriction`); Geocoding only leans on it (`bounds`), so an answer
 * outside it is dropped here. A kitchen elsewhere finds nothing and places her
 * pin on the map; the other states come later, his word, as an update.
 */
export const ZONA_DE_BUSQUEDA = '-100.62,18.36,-98.59,20.29';

/** The zone as Google's suggestions take it: its south-west and north-east corners. */
export const RECTANGULO = (() => {
  const [oeste, sur, este, norte] = ZONA_DE_BUSQUEDA.split(',').map(Number);
  return { low: { latitude: sur, longitude: oeste }, high: { latitude: norte, longitude: este } } as const;
})();

/** Nothing is asked before she has typed this many letters. */
export const MIN_LETRAS = 3;

/** How long after her last keystroke a question goes out, in ms: a word typed letter by letter asks once. */
export const PAUSA_MS = 450;

/** How long one question may take before it counts as no signal, in ms: a late suggestion is no use. */
export const LIMITE_MS = 8_000;

/** How wide the map opens on an answer with no house number: about five blocks. */
export const ANCHO_CALLE_METROS = 500;

/** And never wider than this, however large the street or colonia answered. */
export const ANCHO_ZONA_MAX_METROS = 2_000;

/** Metres in one degree of latitude (and of longitude at the equator). */
const METRES_PER_DEGREE = 111_320;

// ----------------------------------------------------------------------------
// The key, and what each phone says with it
// ----------------------------------------------------------------------------

/**
 * This phone's key, or `null` — and then no search box is drawn and nothing is
 * asked. Google's API keys are `AIza` and 35 more of these characters: anything
 * else — the build's stand-in `sin-clave` (`app.config.ts`), a value put in the
 * wrong variable — is refused rather than sent.
 */
export function claveDe(raw: unknown): string | null {
  const clave = typeof raw === 'string' ? raw.trim() : '';
  return /^AIza[0-9A-Za-z_-]{35}$/.test(clave) ? clave : null;
}

/** This app's id — the iPhone's bundle and Android's package (`test/identity.test.ts`). */
export const ID_DE_LA_APP = 'mx.wera.cocina';

/**
 * ⚠️ THE SIGNING FINGERPRINT ANDROID'S REQUESTS NAME: the one Expo signs this
 * app's test builds with, read off them on 2026-10-27 — one of the two the Android
 * key accepts (the handbook's *Before the two new apps' first builds*, step 10;
 * Play's own is the other). Google asks for it without colons. Not a secret: it
 * is read off any copy of the app.
 */
export const FIRMA_ANDROID = '4C38476F5A815C5FD57C659F17B3331ECD77F1D0';

/** The headers that say which app asks: the bundle id on an iPhone, the package and fingerprint on Android. */
export function cabecerasDeLaApp(os: string): Readonly<Record<string, string>> {
  return os === 'ios'
    ? { 'X-Ios-Bundle-Identifier': ID_DE_LA_APP }
    : { 'X-Android-Package': ID_DE_LA_APP, 'X-Android-Cert': FIRMA_ANDROID };
}

// ----------------------------------------------------------------------------
// What is asked
// ----------------------------------------------------------------------------

/** What she typed, as it is sent — one line, single spaces — or `null` while it is too short to ask. */
export function preguntaDe(texto: string): string | null {
  const pregunta = texto.replace(/\s+/g, ' ').trim();
  return [...pregunta].length >= MIN_LETRAS ? pregunta : null;
}

/**
 * ⚠️ WHAT THE MAP'S BOX ASKS: what she typed, and — when she typed no comma — the
 * colonia and the city or alcaldía she gave in the form, which is where her
 * kitchen is. Her own words all. MEASURED (2026-11-03): with them, her colonia was
 * among Google's five suggestions for 11 to 14 of the twenty addresses; without
 * them, 3 to 5.
 */
export function preguntaConSuDireccion(
  texto: string,
  direccion: Pick<AddressForm, 'colonia' | 'city'> | null,
): string | null {
  const pregunta = preguntaDe(texto);
  if (pregunta === null || pregunta.includes(',')) return pregunta;
  const suyas = [direccion?.colonia ?? '', direccion?.city ?? '']
    .map((parte) => parte.replace(/\s+/g, ' ').trim())
    .filter((parte) => parte !== '');
  return [pregunta, ...suyas].join(', ');
}

/**
 * ⚠️ THE MAP OPENS NEAR HER KITCHEN: the address she typed in the step before,
 * asked once — street and number, colonia, city or alcaldía, postcode, as she
 * wrote them — or `null` while the address is not whole (`checkAddress`, the
 * owner's four). Measured so on 2026-11-03: on her block for 13 of the twenty.
 */
export function preguntaDeDireccion(form: AddressForm): string | null {
  if (checkAddress(form) !== null) return null;
  const partes = [
    `${form.street.trim()} ${form.number.trim()}`,
    form.colonia.trim(),
    form.city.trim(),
    form.postalCode.trim(),
  ];
  return preguntaDe(partes.filter((parte) => parte !== '').join(', '));
}

/** The suggestions' question: Mexico's Spanish, Mexico only, inside the zone, in her session. */
export function cuerpoDeSugerencias(pregunta: string, sesion: string) {
  return {
    input: pregunta,
    languageCode: IDIOMA,
    regionCode: REGION,
    includedRegionCodes: [REGION],
    locationRestriction: { rectangle: RECTANGULO },
    sessionToken: sesion,
  };
}

/** The details of the suggestion she picked, in the same session — which they end. */
export function urlDeDetalles(id: string, sesion: string): string {
  const params = new URLSearchParams({ languageCode: IDIOMA, regionCode: REGION, sessionToken: sesion });
  return `${DETALLES_URL}${encodeURIComponent(id)}?${params.toString()}`;
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

/** The point under her pin to Geocoding, in Spanish. Six decimals, as her pin is kept. */
export function urlDeLaCalle(punto: Pin, clave: string): string {
  const params = new URLSearchParams({
    latlng: `${punto.latitude.toFixed(6)},${punto.longitude.toFixed(6)}`,
    language: 'es',
    key: clave,
  });
  return `${GEOCODING_URL}?${params.toString()}`;
}

// ----------------------------------------------------------------------------
// What comes back
// ----------------------------------------------------------------------------

/** One of Google's suggestions, as the list shows it. */
export interface Sugerencia {
  /** Google's place id: the list's key, and what her pick's details are asked of. */
  readonly id: string;
  /** Its first line: the street and number, or the place. */
  readonly titulo: string;
  /** Its second line: colonia, alcaldía or municipality, state. */
  readonly detalle: string;
}

/** Where the map flies: a point, and how much of the map it deserves. */
export interface Destino {
  readonly punto: Pin;
  /** Does the answer name a house number? Then it is her door's block, not just her street. */
  readonly conNumero: boolean;
  /** How far the answer reaches, its longer side in metres — a street's stretch, a colonia's extent; 0 for a point. */
  readonly anchoMetros: number;
}

/** The suggestion she picked, read: where the map flies, and her five boxes from Google's parts. */
export interface Lugar extends Destino {
  readonly direccion: AddressForm;
}

/** What the suggestions came back as. No signal is `@/lib/useGoogle`'s: `fetch` fails before any status. */
export type ResultadoDeSugerencias =
  | { readonly kind: 'sugerencias'; readonly sugerencias: readonly Sugerencia[] }
  | { readonly kind: 'ninguna' }
  | { readonly kind: 'sin-senal' }
  | { readonly kind: 'falla' };

/** What the list shows: nothing yet, a question out, or what came back. */
export type Sugerencias = { readonly kind: 'nada' } | { readonly kind: 'buscando' } | ResultadoDeSugerencias;

/** What Geocoding came back with for an address. */
export type ResultadoDeDestino =
  | { readonly kind: 'destino'; readonly destino: Destino }
  | { readonly kind: 'ninguna' }
  | { readonly kind: 'sin-senal' }
  | { readonly kind: 'falla' };

const texto = (value: unknown): string => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '');
const numero = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) ? value : null);
const objeto = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};

/** A name Google gives for no name is no name. */
const sinNombre = (value: string): string => (/^(unnamed road|calle sin nombre|sin nombre)$/i.test(value) ? '' : value);

function puntoDe(value: unknown, lat: string, lng: string): Pin | null {
  const p = objeto(value);
  const latitude = numero(p[lat]);
  const longitude = numero(p[lng]);
  if (latitude === null || longitude === null || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return { latitude, longitude };
}

function enLaZona({ latitude, longitude }: Pin): boolean {
  return (
    latitude >= RECTANGULO.low.latitude &&
    latitude <= RECTANGULO.high.latitude &&
    longitude >= RECTANGULO.low.longitude &&
    longitude <= RECTANGULO.high.longitude
  );
}

/** A box's longer side in metres, from its two corners; 0 without both. */
function anchoEntre(a: Pin | null, b: Pin | null): number {
  if (a === null || b === null) return 0;
  const latitude = (a.latitude + b.latitude) / 2;
  const alto = Math.abs(b.latitude - a.latitude) * METRES_PER_DEGREE;
  const ancho =
    Math.abs(b.longitude - a.longitude) * METRES_PER_DEGREE * Math.max(Math.cos((latitude * Math.PI) / 180), 0.01);
  return Math.max(alto, ancho);
}

/** One suggestion, or `null` when it names no place or no text — a query's own suggestion is not an address. */
function sugerenciaDe(row: unknown): Sugerencia | null {
  const prediction = objeto(objeto(row).placePrediction);
  const id = texto(prediction.placeId);
  const formato = objeto(prediction.structuredFormat);
  const titulo = texto(objeto(formato.mainText).text) || texto(objeto(prediction.text).text);
  if (id === '' || titulo === '') return null;
  return { id, titulo, detalle: texto(objeto(formato.secondaryText).text) };
}

/**
 * ⚠️ PLACES API (NEW) ANSWERS NOTHING FOUND WITH A 200 AND NO `suggestions` —
 * not a 404 — so only a status outside 2xx is a failure: 403 a key it refuses,
 * 429 his project's daily or per-minute limit.
 */
export function sugerenciasDe(status: number, body: unknown): ResultadoDeSugerencias {
  if (status < 200 || status >= 300) return { kind: 'falla' };
  const filas = objeto(body).suggestions;
  const sugerencias = (Array.isArray(filas) ? filas : [])
    .map(sugerenciaDe)
    .filter((s): s is Sugerencia => s !== null);
  return sugerencias.length === 0 ? { kind: 'ninguna' } : { kind: 'sugerencias', sugerencias };
}

/** One address part of Places (New)'s shape, by its type — `''` when absent. */
function parte(componentes: readonly Record<string, unknown>[], tipo: string): string {
  const c = componentes.find((x) => Array.isArray(x.types) && x.types.includes(tipo));
  return c === undefined ? '' : sinNombre(texto(c.longText));
}

/** The last part of a suggestion's second line is its state — *Méx.*, *CDMX* — never a city. */
const ESTADO =
  /^(m[eé]x\.?|m[eé]xico|cdmx|ciudad de m[eé]xico|estado de m[eé]xico|mor\.?|morelos|hgo\.?|hidalgo|pue\.?|puebla|tlax\.?|tlaxcala|gro\.?|guerrero|qro\.?|quer[eé]taro|mich\.?|michoac[aá]n)$/i;

/** Two names that differ only in accents and case are one. */
const igual = (a: string, b: string): boolean => normal(a) === normal(b);

/**
 * ⚠️ HER FIVE BOXES FROM GOOGLE'S PARTS, THE ONES SHE WOULD HAVE TYPED. Read off
 * Google's answers on 2026-11-03: in Mexico City the colonia is
 * `sublocality_level_1` and the alcaldía `administrative_area_level_3` (its
 * `locality` is *Ciudad de México*, or a pueblo); in the State of Mexico the
 * municipality is `locality` — except where Google puts the colonia there too
 * (*Centro*, for Texcoco), and then it is the part of the suggestion's second line
 * before the state (*Texcoco de Mora*). A part Google does not name keeps what she
 * typed; a postcode that is not five digits is none.
 *
 * ⚠️ BUT ANOTHER STREET IS ANOTHER ADDRESS (`10.4g-i`, the address form's *Busca tu
 * dirección*, which fills the five boxes she already has on her kitchen's screen):
 * when Google names a street that is not the one in her box (`otraCalle`), nothing
 * she typed is kept — a number or a colonia left over from the address she had
 * would read as decided. The boxes are hers to check either way.
 */
export function cajasDe(componentes: unknown, detalle: string, escrita: AddressForm): AddressForm {
  const partes = (Array.isArray(componentes) ? componentes : []).map(objeto);
  const ruta = parte(partes, 'route');
  const suya = ruta !== '' && otraCalle(escrita.street, ruta) ? EMPTY_ADDRESS : escrita;
  const colonia = parte(partes, 'sublocality_level_1') || parte(partes, 'neighborhood');
  const localidad = parte(partes, 'locality');
  const delDetalle = detalle
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p !== '' && !ESTADO.test(p) && !/^mz\b/i.test(p) && !/^\d+$/.test(p))
    .pop() ?? '';
  const ciudad =
    parte(partes, 'administrative_area_level_3') ||
    parte(partes, 'administrative_area_level_2') ||
    (localidad !== '' && !igual(localidad, colonia) ? localidad : '') ||
    (delDetalle !== '' && !igual(delDetalle, colonia) ? delDetalle : '');
  const cp = parte(partes, 'postal_code');
  return {
    street: ruta || suya.street,
    number: parte(partes, 'street_number') || suya.number,
    colonia: colonia || suya.colonia,
    city: ciudad || suya.city,
    postalCode: /^\d{5}$/.test(cp) ? cp : suya.postalCode,
  };
}

/**
 * The suggestion she picked, from its details: where the map flies — block level
 * when Google names a house number, else the stretch it found — and her five
 * boxes. `null` without a point, or outside the zone.
 */
export function lugarDe(status: number, body: unknown, sugerencia: Sugerencia, escrita: AddressForm): Lugar | null {
  if (status < 200 || status >= 300) return null;
  const b = objeto(body);
  const punto = puntoDe(b.location, 'latitude', 'longitude');
  if (punto === null || !enLaZona(punto)) return null;
  const viewport = objeto(b.viewport);
  const componentes = Array.isArray(b.addressComponents) ? b.addressComponents : [];
  const conNumero = parte(componentes.map(objeto), 'street_number') !== '';
  return {
    punto,
    conNumero,
    anchoMetros: anchoEntre(puntoDe(viewport.low, 'latitude', 'longitude'), puntoDe(viewport.high, 'latitude', 'longitude')),
    direccion: cajasDe(componentes, sugerencia.detalle, escrita),
  };
}

/** Geocoding's first answer inside the zone, as a flight. */
function destinoDe(row: unknown): Destino | null {
  const r = objeto(row);
  const geometry = objeto(r.geometry);
  const punto = puntoDe(geometry.location, 'lat', 'lng');
  if (punto === null || !enLaZona(punto)) return null;
  const viewport = objeto(geometry.viewport);
  const tipos = Array.isArray(r.types) ? r.types : [];
  return {
    punto,
    conNumero: ['street_address', 'premise', 'subpremise'].some((t) => tipos.includes(t)),
    anchoMetros: anchoEntre(puntoDe(viewport.southwest, 'lat', 'lng'), puntoDe(viewport.northeast, 'lat', 'lng')),
  };
}

/**
 * ⚠️ GEOCODING ANSWERS EVERY QUESTION WITH A 200 and says how it went in
 * `status`: *ZERO_RESULTS* is nothing found; *OVER_QUERY_LIMIT* (his project's
 * daily limit), *REQUEST_DENIED* (a key it refuses) and the rest are a failure.
 * Its first answer inside the zone is the one the map flies to.
 */
export function destinoDeGeocoding(status: number, body: unknown): ResultadoDeDestino {
  if (status < 200 || status >= 300) return { kind: 'falla' };
  const b = objeto(body);
  if (b.status === 'ZERO_RESULTS') return { kind: 'ninguna' };
  if (b.status !== 'OK') return { kind: 'falla' };
  const destino = (Array.isArray(b.results) ? b.results : []).map(destinoDe).find((d) => d !== null);
  return destino === undefined ? { kind: 'ninguna' } : { kind: 'destino', destino };
}

/**
 * ⚠️ THE STREET GOOGLE NAMES UNDER HER PIN: its first answer that is a door — an
 * address, a building — else its first, as measured on 2026-11-03; the street of
 * it, or `null` when Google names none or fails. Shown on the card, never kept.
 */
export function calleDeGeocoding(status: number, body: unknown): string | null {
  if (status < 200 || status >= 300) return null;
  const b = objeto(body);
  if (b.status !== 'OK' || !Array.isArray(b.results)) return null;
  const filas = b.results.map(objeto);
  const puerta =
    filas.find((r) => Array.isArray(r.types) && ['street_address', 'premise', 'subpremise'].some((t) => (r.types as unknown[]).includes(t))) ??
    filas[0];
  const componentes = Array.isArray(puerta?.address_components) ? puerta.address_components.map(objeto) : [];
  const calle = componentes.find((c) => Array.isArray(c.types) && c.types.includes('route'));
  const nombre = calle === undefined ? '' : sinNombre(texto(calle.long_name));
  return nombre === '' ? null : nombre;
}

/**
 * How wide the map opens on an answer: at block level when it names her door's
 * number — her first tap places the pin (`CLOSE_METRES`) — and otherwise wide
 * enough to take in the stretch it found, about five blocks at least, so her
 * door is likely on the screen and her first tap brings it closer.
 */
export function anchoPara(destino: Destino): number {
  if (destino.conNumero) return CLOSE_METRES;
  return Math.min(Math.max(destino.anchoMetros, ANCHO_CALLE_METROS), ANCHO_ZONA_MAX_METROS);
}

// ----------------------------------------------------------------------------
// Her street, and the one Google names under her pin — the card's warning
// ----------------------------------------------------------------------------

/** How a street's kind is written short, and in full. */
const ABREVIATURAS: Readonly<Record<string, string>> = {
  av: 'avenida',
  avda: 'avenida',
  c: 'calle',
  cda: 'cerrada',
  priv: 'privada',
  calz: 'calzada',
  prol: 'prolongacion',
  blvd: 'boulevard',
  cjon: 'callejon',
  and: 'andador',
  cto: 'circuito',
  gral: 'general',
  dr: 'doctor',
  pte: 'poniente',
  ote: 'oriente',
  nte: 'norte',
};

/**
 * Words that say what kind of street it is, or join its name — left out on one
 * side or the other (*San Marcos* is *Calle San Marcos*, *Cerrada de la Cruz* is
 * *Cerrada la Cruz*). ⚠️ NEVER NORTE, SUR, ORIENTE OR PONIENTE: *Poniente 110* and
 * *Oriente 110* are two streets.
 */
const GENERICAS = new Set([
  'calle', 'avenida', 'cerrada', 'privada', 'calzada', 'prolongacion', 'boulevard', 'callejon', 'andador', 'circuito',
  'retorno', 'camino', 'eje', 'general', 'doctor', 'de', 'del', 'la', 'las', 'los', 'el',
]);

/** A name as words: no accents, no case, no punctuation, kinds written in full, then the generic ones dropped. */
function palabras(nombre: string): string[] {
  return normal(nombre)
    .split(' ')
    .filter((p) => p !== '')
    .map((p) => ABREVIATURAS[p] ?? p)
    .filter((p) => !GENERICAS.has(p));
}

/** No accents, no case, punctuation as spaces. */
function normal(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Are `corta`'s words all in `larga`, in order? */
function dentro(corta: readonly string[], larga: readonly string[]): boolean {
  let i = 0;
  for (const palabra of larga) if (i < corta.length && palabra === corta[i]) i += 1;
  return i === corta.length;
}

/**
 * ⚠️ THE CARD WARNS ONLY WHEN GOOGLE NAMES ANOTHER STREET (his ruling of
 * 2026-11-03): `true` when Google named a street under her pin and it is not the
 * one she gave; `false` when it is, when Google named none, and when either name
 * is nothing but kinds of street. Two names are one street when one's words are
 * all in the other, in order — *Lucio Blanco* and *Calzada Lucio Blanco*, *Gustavo
 * Baz* and *Avenida Doctor Gustavo Baz* — but *Calle 6* is never *Calle 16*.
 * Measured on the twenty recorded doors (2026-11-03): Google named her street at
 * 14, another at 6 — at 1 of the 12 whose recorded point is trusted.
 */
export function otraCalle(suya: string, deGoogle: string | null): boolean {
  if (deGoogle === null) return false;
  const a = palabras(suya);
  const b = palabras(deGoogle);
  if (a.length === 0 || b.length === 0) return false;
  return !(dentro(a, b) || dentro(b, a));
}
