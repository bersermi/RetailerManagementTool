// ============================================================================
// THE MAP'S ADDRESS SEARCH, AS A CONTRACT WITH LOCATIONIQ. Plan task `10.4c`,
// the owner's ruling of 2026-10-31: her kitchen's location as the big apps do
// it, within every provider's terms.
//
// ⚠️⚠️ AN ANSWER ONLY MOVES THE MAP. What is stored is what she typed (the
// form's five boxes) and where she tapped (her pin) — never a provider's point
// or text. Apple's licence and Google's terms forbid keeping theirs; LocationIQ's
// allow it, and it is still not kept, so the rule holds whichever provider
// answers. Nothing here makes a pin: `@/ui/MapaPunto` turns an answer into a
// region and flies there, and only her tap calls `onPin` — `test/buscar.test.ts`
// reads that file for it, and refuses this module anywhere in `src/api/`.
//
// ⚠️ MEASURED BEFORE IT WAS BUILT (2026-10-31, the plan's status log): in Mexico
// City LocationIQ knows the streets and almost never the house number (4 of its
// 47 answers carried one). So an answer without a number opens the map wide
// enough to show the blocks around it (`ANCHO_CALLE_METROS`), and her first tap
// brings it closer; one with a number opens at block level, where her first tap
// is the pin. Answers are kept to the Valle de México (`bounded`): without it,
// the first suggestion for a street in Milpa Alta was in another state. And
// THE COLONIA DECIDES IT: a street and number alone found the right street for
// 4 of 20 addresses, with the colonia for 12 — so the box adds the colonia she
// typed in the form (`preguntaConColonia`), and asks once more without the
// number when that finds nothing (`sinNumero`).
//
// ⚠️ PURE, so the suite pins every value sent and every answer read; the
// request itself is `@/lib/locationiq`'s.
// ============================================================================

import { CLOSE_METRES } from '@/lib/mapa';
import { checkAddress, type AddressForm } from '@/api/place';

/** LocationIQ's suggestions as she types — its free plan, OpenStreetMap's data. */
export const LOCATIONIQ_AUTOCOMPLETE = 'https://api.locationiq.com/v1/autocomplete';

/**
 * ⚠️ THE VALLE DE MÉXICO — Mexico City and the towns joined to it, as
 * `min_lon,min_lat,max_lon,max_lat` — and answers outside it are never offered.
 * The pilot is in this city; a kitchen outside the box finds no answer and
 * places her pin on the map, as before this row. Widen it with the pilot.
 */
export const VALLE_DE_MEXICO = '-99.40,19.05,-98.85,19.75';

/** Nothing is asked before she has typed this many letters. */
export const MIN_LETRAS = 3;

/** How long after her last keystroke the question goes out, in ms — and the free plan allows two a second. */
export const PAUSA_MS = 450;

/** How many suggestions are listed. */
export const SUGERENCIAS = 5;

/** How long one question may take before it counts as no signal, in ms: a late suggestion is no use. */
export const LIMITE_MS = 8_000;

/** How wide the map opens on an answer with no house number: about five blocks. */
export const ANCHO_CALLE_METROS = 500;

/** And never wider than this, however large the street or colonia answered. */
export const ANCHO_ZONA_MAX_METROS = 2_000;

/**
 * ⚠️ THE CREDIT LOCATIONIQ'S FREE PLAN REQUIRES — *"a prominent link back to us
 * on your website or app in this format: Search by LocationIQ.com"* (its pricing
 * page, read 2026-10-31) — and OpenStreetMap's, whose data it answers with.
 */
export const CREDITO_LOCATIONIQ_URL = 'https://locationiq.com';
export const CREDITO_OSM_URL = 'https://www.openstreetmap.org/copyright';

/** Metres in one degree of latitude (and of longitude at the equator). */
const METRES_PER_DEGREE = 111_320;

/**
 * The access token, or `null` when the build has none — and then no search box
 * is drawn. LocationIQ's API tokens start `pk.`: anything else is a value put in
 * the wrong variable, refused rather than sent.
 */
export function tokenOf(raw: string | undefined): string | null {
  const token = (raw ?? '').trim();
  return token.startsWith('pk.') && token.length > 3 ? token : null;
}

/** What she typed, as it is sent — one line, single spaces — or `null` while it is too short to ask. */
export function preguntaDe(texto: string): string | null {
  const pregunta = texto.replace(/\s+/g, ' ').trim();
  return [...pregunta].length >= MIN_LETRAS ? pregunta : null;
}

/**
 * ⚠️ WHAT THE BOX ASKS: what she typed, and — when she typed no colonia (no
 * comma) — the colonia she gave in the form, which is where her kitchen is. Her
 * own words both; nothing of a provider's.
 */
export function preguntaConColonia(texto: string, colonia: string): string | null {
  const pregunta = preguntaDe(texto);
  if (pregunta === null) return null;
  const suya = colonia.replace(/\s+/g, ' ').trim();
  return suya === '' || pregunta.includes(',') ? pregunta : `${pregunta}, ${suya}`;
}

/** Words that name a kind of street, not a street: what is left of *Calle 6* without its 6. */
const TIPO_DE_CALLE =
  /^(calle|c|avenida|av|cerrada|cda|privada|priv|callejón|callejon|cjon|andador|and|prolongación|prolongacion|prol|calzada|calz|boulevard|blvd|camino|retorno|circuito|cto|eje|norte|sur|oriente|ote|poniente|pte)\.?$/i;

/**
 * The same question without its house number, or `null`. ⚠️ MEASURED 2026-10-31:
 * inside the Valle de México LocationIQ answers *nothing found* to *Durango 220*
 * — Mexico City's map data has almost no house numbers, and it does not drop the
 * one it cannot match — while *Durango* finds the street. Only the last number of
 * the first part goes, and only when what is left still names a street: *Calle 6*
 * and *Poniente 110* are streets, and stay as they are.
 */
export function sinNumero(pregunta: string): string | null {
  const coma = pregunta.indexOf(',');
  const primera = (coma === -1 ? pregunta : pregunta.slice(0, coma)).trim();
  const resto = coma === -1 ? '' : pregunta.slice(coma);
  const partes = /^(.*\S)\s+\d+\s?[A-Za-z]?$/.exec(primera);
  if (partes === null) return null;
  const calle = partes[1];
  if (calle.split(' ').every((palabra) => TIPO_DE_CALLE.test(palabra))) return null;
  return preguntaDe(`${calle}${resto}`);
}

/** The question, as a URL: Spanish names, Mexico only, inside the Valle de México. */
export function urlDeBusqueda(pregunta: string, token: string, limite: number = SUGERENCIAS): string {
  const params = new URLSearchParams({
    key: token,
    q: pregunta,
    countrycodes: 'mx',
    limit: String(limite),
    'accept-language': 'es',
    normalizecity: '1',
    dedupe: '1',
    viewbox: VALLE_DE_MEXICO,
    bounded: '1',
  });
  return `${LOCATIONIQ_AUTOCOMPLETE}?${params.toString()}`;
}

/**
 * ⚠️ THE MAP OPENS NEAR HER KITCHEN: the address she typed in the step before,
 * asked once — street and number, colonia, city, as she wrote them — or `null`
 * while the address is not whole (`checkAddress`, the owner's four).
 */
export function preguntaDeDireccion(form: AddressForm): string | null {
  if (checkAddress(form) !== null) return null;
  const partes = [`${form.street.trim()} ${form.number.trim()}`, form.colonia.trim(), form.city.trim()];
  return preguntaDe(partes.filter((parte) => parte !== '').join(', '));
}

/** A point an answer names — where the map flies, and nothing else. */
export interface Punto {
  readonly latitude: number;
  readonly longitude: number;
}

/** One suggestion, as this app reads it. */
export interface Respuesta {
  /** LocationIQ's id for it: the list's key. */
  readonly id: string;
  /** Its first line: the street, or the place, with the number when LocationIQ has it. */
  readonly titulo: string;
  /** Its second line: colonia, alcaldía, city and postcode, without the country. */
  readonly detalle: string;
  readonly punto: Punto;
  /** Does the answer carry a house number? Then it is her door's block, not just her street. */
  readonly conNumero: boolean;
  /** How far the answer reaches, its longer side in metres — a street's stretch, a colonia's extent. */
  readonly anchoMetros: number;
  /** The box it reaches over, when LocationIQ gives one. */
  readonly caja: Caja | null;
}

/** A bounding box, in degrees. */
export interface Caja {
  readonly sur: number;
  readonly norte: number;
  readonly oeste: number;
  readonly este: number;
}

const texto = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');
const numero = (value: unknown): number | null => {
  const n = typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN;
  return Number.isFinite(n) ? n : null;
};

/** `boundingbox` is south, north, west, east, as strings; `null` when it is not one. */
function cajaDe(box: unknown): Caja | null {
  if (!Array.isArray(box) || box.length !== 4) return null;
  const [sur, norte, oeste, este] = box.map(numero);
  if (sur === null || norte === null || oeste === null || este === null) return null;
  return { sur: Math.min(sur, norte), norte: Math.max(sur, norte), oeste: Math.min(oeste, este), este: Math.max(oeste, este) };
}

/** A box's longer side in metres, or 0 with no box. */
function anchoDe(caja: Caja | null): number {
  if (caja === null) return 0;
  const latitude = (caja.sur + caja.norte) / 2;
  const alto = (caja.norte - caja.sur) * METRES_PER_DEGREE;
  const ancho = (caja.este - caja.oeste) * METRES_PER_DEGREE * Math.max(Math.cos((latitude * Math.PI) / 180), 0.01);
  return Math.max(alto, ancho);
}

/** *Roma Norte, Ciudad de México, Ciudad de México, 06700* — the city and the state — said once. */
function sinRepetir(linea: string): string {
  const partes = linea.split(',').map((parte) => parte.trim()).filter((parte) => parte !== '');
  return partes.filter((parte, i) => i === 0 || parte.toLowerCase() !== partes[i - 1].toLowerCase()).join(', ');
}

/** One row, or `null` when it lacks a point or a name — a malformed row is skipped, never shown. */
function respuestaDe(row: unknown): Respuesta | null {
  if (typeof row !== 'object' || row === null) return null;
  const r = row as Record<string, unknown>;
  const latitude = numero(r.lat);
  const longitude = numero(r.lon);
  if (latitude === null || longitude === null || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  const address = typeof r.address === 'object' && r.address !== null ? (r.address as Record<string, unknown>) : {};
  const casa = texto(address.house_number);
  const lugar = texto(r.display_place) || texto(address.name) || texto(address.road);
  if (lugar === '') return null;
  const titulo = casa !== '' && !lugar.includes(casa) ? `${lugar} ${casa}` : lugar;
  const detalle = sinRepetir(texto(r.display_address).replace(/,\s*(México|Mexico)$/i, ''));
  const caja = cajaDe(r.boundingbox);
  return {
    id: texto(r.place_id) || `${latitude},${longitude}`,
    titulo,
    detalle,
    punto: { latitude, longitude },
    conNumero: casa !== '',
    anchoMetros: anchoDe(caja),
    caja,
  };
}

/**
 * ⚠️ TWO ROWS THAT READ THE SAME ARE ONE: a street is several stretches in the
 * map's data, and *Calle Durango — Roma Norte* twice gives her no way to choose.
 * They become one row, in the first one's place, framing every stretch together —
 * so the map shows her whole street in her colonia, not one stretch of it.
 */
function unir(a: Respuesta, b: Respuesta): Respuesta {
  if (a.caja === null || b.caja === null || a.conNumero || b.conNumero) return a;
  const caja = {
    sur: Math.min(a.caja.sur, b.caja.sur),
    norte: Math.max(a.caja.norte, b.caja.norte),
    oeste: Math.min(a.caja.oeste, b.caja.oeste),
    este: Math.max(a.caja.este, b.caja.este),
  };
  const punto = { latitude: (caja.sur + caja.norte) / 2, longitude: (caja.oeste + caja.este) / 2 };
  return { ...a, punto, caja, anchoMetros: anchoDe(caja) };
}

/** Every well-formed suggestion, in LocationIQ's order, rows that read the same made one. */
export function respuestasDe(body: unknown): Respuesta[] {
  if (!Array.isArray(body)) return [];
  const filas: Respuesta[] = [];
  for (const respuesta of body.map(respuestaDe)) {
    if (respuesta === null) continue;
    const igual = filas.findIndex((f) => f.titulo === respuesta.titulo && f.detalle === respuesta.detalle);
    if (igual === -1) filas.push(respuesta);
    else filas[igual] = unir(filas[igual], respuesta);
  }
  return filas;
}

/** What one question came back as. No signal is `@/lib/locationiq`'s: `fetch` fails before any status. */
export type Resultado =
  | { readonly kind: 'respuestas'; readonly respuestas: readonly Respuesta[] }
  | { readonly kind: 'ninguna' }
  | { readonly kind: 'sin-senal' }
  | { readonly kind: 'falla' };

/**
 * ⚠️ LOCATIONIQ ANSWERS "NOTHING FOUND" WITH A 404 (`Unable to geocode`), not an
 * empty list — so a 404 is *ninguna*, and only the rest is a failure: 429 is its
 * limit (two a second, 5,000 a day on the free plan), 401 or 403 a token it refuses.
 */
export function resultadoDe(status: number, body: unknown): Resultado {
  if (status === 404) return { kind: 'ninguna' };
  if (status < 200 || status >= 300) return { kind: 'falla' };
  const respuestas = respuestasDe(body);
  return respuestas.length === 0 ? { kind: 'ninguna' } : { kind: 'respuestas', respuestas };
}

/**
 * How wide the map opens on an answer: at block level when it names her door's
 * number — her first tap places the pin (`CLOSE_METRES`) — and otherwise wide
 * enough to take in the stretch it found, about five blocks at least, so her
 * door is likely on the screen and her first tap brings it closer.
 */
export function anchoPara(respuesta: Respuesta): number {
  if (respuesta.conNumero) return CLOSE_METRES;
  return Math.min(Math.max(respuesta.anchoMetros, ANCHO_CALLE_METROS), ANCHO_ZONA_MAX_METROS);
}
