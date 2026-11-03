// ============================================================================
// THE MAP'S ADDRESS SEARCH, AS A CONTRACT WITH LOCATIONIQ. Plan task `10.4c`,
// the owner's ruling of 2026-10-31: her kitchen's location as the big apps do
// it, within every provider's terms.
//
// ⚠️⚠️ AN ANSWER ONLY MOVES THE MAP. What is stored is what she typed (the
// form's five boxes) and her pin — never a provider's point or text. Apple's
// licence and Google's terms forbid keeping theirs; LocationIQ's allow it, and it
// is still not kept, so the rule holds whichever provider answers. Nothing here
// makes a pin: `@/ui/MapaPunto` turns an answer into a region and flies there, and
// since `10.4e` her pin is the map's centre only once her own hand has moved the
// map after the flight (`@/lib/mapa`'s `alLlegar`) — `test/buscar.test.ts` reads
// that file for it, and refuses this module anywhere in `src/api/`.
//
// ⚠️ MEASURED BEFORE IT WAS BUILT (2026-10-31, the plan's status log): in Mexico
// City LocationIQ knows the streets and almost never the house number (4 of its
// 47 answers carried one). So an answer without a number opens the map wide
// enough to show the blocks around it (`ANCHO_CALLE_METROS`), and her first tap
// brings it closer; one with a number opens at block level, where her first tap
// is the pin. Answers are kept to the search's zone (`bounded`): without it,
// the first suggestion for a street in Milpa Alta was in another state. And
// THE COLONIA DECIDES IT: a street and number alone found the right street for
// 4 of 20 addresses, with the colonia for 12 — so the box adds the colonia she
// typed in the form (`preguntaConSuDireccion`), and asks once more without the
// number when that finds nothing (`sinNumero`). Since `10.4f` the zone is Mexico
// City and the State of Mexico, and the box adds her city too: across a whole
// state a street and number with no colonia names a dozen towns.
//
// ⚠️ SINCE `10.4d` (the owner's ruling of 2026-11-01) THE PHONE'S OWN GEOCODER —
// Google's on Android, Apple's on an iPhone — answers the search that opens the
// map and the box's *Buscar*, and LocationIQ only when it finds nothing. MEASURED
// FIRST (2026-11-02, the plan's status log): on the same twenty addresses, asked
// as this app asks, Google's put the map on her block for 13 and Apple's for 10,
// where LocationIQ's first suggestion did for 6. The same rule holds for their
// answers: they only move the map. The sections at the end of this file read them.
//
// ⚠️ SINCE `10.4e` (his ruling of 2026-11-02: *"the search is failing to show a
// street + number"*) THE LIST AS SHE TYPES OPENS ON THE PHONE'S DOOR once she has
// typed her number, LocationIQ's streets below it (`conLasPuertas`). Measured as
// she types (2026-11-02): with the number, the phone's first answer was a door 18
// times in 20, on her block 12 (Google) and 11 (Apple); LocationIQ's list opened
// on her block 6 times and never on a door.
//
// ⚠️ PURE, so the suite pins every value sent and every answer read; the
// requests are `@/lib/locationiq`'s and `@/lib/telefono`'s.
// ============================================================================

import { CLOSE_METRES, campoDelTelefono } from '@/lib/mapa';
import { checkAddress, type AddressForm } from '@/api/place';

/** LocationIQ's suggestions as she types — its free plan, OpenStreetMap's data. */
export const LOCATIONIQ_AUTOCOMPLETE = 'https://api.locationiq.com/v1/autocomplete';

/**
 * ⚠️ WHERE THE SEARCH LOOKS: MEXICO CITY AND THE STATE OF MEXICO — the owner's
 * ruling of 2026-11-02 (`10.4f`; until then the Valle de México alone,
 * `-99.40,19.05,-98.85,19.75`, since `10.4c`), as `min_lon,min_lat,max_lon,max_lat`:
 * INEGI's extreme coordinates of the State of Mexico (*Aspectos Geográficos*,
 * 2021, cuadro 1.1 — N 20°17'09", S 18°22'01", E 98°35'49", W 100°36'47"), a
 * hundredth of a degree wider each way. Mexico City lies inside it whole. A box,
 * so it also takes in the edges of the states around — Pachuca, Cuernavaca,
 * Taxco. Answers outside it are never offered: without a bound, a Milpa Alta
 * street's first suggestion came from another state, 344 km away (measured
 * 2026-10-31). A kitchen elsewhere finds no answer and places her pin on the
 * map; the other states come later, his word, as an update.
 */
export const ZONA_DE_BUSQUEDA = '-100.62,18.36,-98.59,20.29';

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
 * ⚠️ WHAT THE BOX ASKS: what she typed, and — when she typed no comma — the
 * colonia and the city or alcaldía she gave in the form, which is where her
 * kitchen is. Her own words all; nothing of a provider's. MEASURED: the colonia
 * decides it in Mexico City (2026-10-31: a street and number alone found the
 * right street for 4 of 20, with the colonia 12); the city decides it across the
 * State of Mexico (2026-11-02, `10.4f`: on eleven municipal seats, most with no
 * colonia, the list's first row landed within 300 m for 1 of 11 on Android without
 * the city and 7 with it — and Mexico City's twenty lost nothing).
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

/** The question, as a URL: Spanish names, Mexico only, inside the search's zone. */
export function urlDeBusqueda(pregunta: string, token: string, limite: number = SUGERENCIAS): string {
  const params = new URLSearchParams({
    key: token,
    q: pregunta,
    countrycodes: 'mx',
    limit: String(limite),
    'accept-language': 'es',
    normalizecity: '1',
    dedupe: '1',
    viewbox: ZONA_DE_BUSQUEDA,
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

/** What the box shows under it: nothing yet, a question out, or what came back. */
export type Sugerencias = { readonly kind: 'nada' } | { readonly kind: 'buscando' } | Resultado;

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

// ----------------------------------------------------------------------------
// The phone's own search — `10.4d`, the owner's ruling of 2026-11-01
// ----------------------------------------------------------------------------

/**
 * ⚠️ THE SEARCH'S ZONE AS THE PHONE IS ASKED IT — south, west, north, east —
 * read out of `ZONA_DE_BUSQUEDA`, so LocationIQ's box and the phone's are one.
 * Google's geocoder takes it as a box; Apple's as the circle reaching its longer
 * side's ends (`cocina/modules/geocodificador`), and only as a hint — so an answer
 * outside the box is dropped here, whichever phone gave it.
 */
export const CAJA_DE_BUSQUEDA: readonly [number, number, number, number] = (() => {
  const [oeste, sur, este, norte] = ZONA_DE_BUSQUEDA.split(',').map(Number);
  return [sur, oeste, norte, este] as const;
})();

/** How many answers the phone is asked for. */
export const RESPUESTAS_DEL_TELEFONO = 5;

/**
 * ⚠️ THE ADDRESS SHE TYPED, AS THE PHONE IS ASKED IT: all five boxes — street and
 * number, colonia, city or alcaldía, postcode — as she wrote them, or `null` while
 * the address is not whole. Unlike LocationIQ's question (`preguntaDeDireccion`)
 * the postcode is in it: both phones read one, and it is how they were measured.
 */
export function preguntaParaElTelefono(form: AddressForm): string | null {
  if (checkAddress(form) !== null) return null;
  const partes = [
    `${form.street.trim()} ${form.number.trim()}`,
    form.colonia.trim(),
    form.city.trim(),
    form.postalCode.trim(),
  ];
  return preguntaDe(partes.filter((parte) => parte !== '').join(', '));
}

function enLaZona({ latitude, longitude }: Punto): boolean {
  const [sur, oeste, norte, este] = CAJA_DE_BUSQUEDA;
  return latitude >= sur && latitude <= norte && longitude >= oeste && longitude <= este;
}

/**
 * One of the phone's answers — the module's row: a point, and the street, house
 * number, colonia, city and postcode it names — or `null` when it has no point,
 * names no street and no colonia, or lies outside the search's zone.
 */
function respuestaDelTelefono(fila: unknown, i: number): Respuesta | null {
  if (typeof fila !== 'object' || fila === null) return null;
  const f = fila as Record<string, unknown>;
  const latitude = numero(f.latitude);
  const longitude = numero(f.longitude);
  if (latitude === null || longitude === null || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  const punto = { latitude, longitude };
  if (!enLaZona(punto)) return null;
  const calle = campoDelTelefono(f.calle);
  const casa = campoDelTelefono(f.numero);
  const colonia = campoDelTelefono(f.colonia);
  if (calle === '' && colonia === '') return null;
  const conNumero = calle !== '' && casa !== '';
  const titulo = calle === '' ? colonia : conNumero ? `${calle} ${casa}` : calle;
  const detalle = sinRepetir(
    [calle === '' ? '' : colonia, campoDelTelefono(f.ciudad), campoDelTelefono(f.cp)].filter((parte) => parte !== '').join(', '),
  );
  return { id: `telefono-${i}`, titulo, detalle, punto, conNumero, anchoMetros: 0, caja: null };
}

/** Every well-formed answer the phone gave inside the search's zone, in its order; two that read the same are one. */
export function respuestasDelTelefono(filas: unknown): Respuesta[] {
  if (!Array.isArray(filas)) return [];
  const vistas: Respuesta[] = [];
  filas.forEach((fila, i) => {
    const respuesta = respuestaDelTelefono(fila, i);
    if (respuesta !== null && !vistas.some((v) => v.titulo === respuesta.titulo && v.detalle === respuesta.detalle)) {
      vistas.push(respuesta);
    }
  });
  return vistas;
}

/**
 * What the phone came back with: its answers, or *ninguna* when it found nothing
 * inside the search's zone. A value that is no list — which no build of this
 * app sends — is *falla*, and so is every rejection (`@/lib/telefono`).
 */
export function resultadoDelTelefono(filas: unknown): Resultado {
  if (!Array.isArray(filas)) return { kind: 'falla' };
  const respuestas = respuestasDelTelefono(filas);
  return respuestas.length === 0 ? { kind: 'ninguna' } : { kind: 'respuestas', respuestas };
}

/**
 * ⚠️ THE PHONE FIRST, LOCATIONIQ WHEN IT HAS NOTHING: the phone's answers, or —
 * when it found nothing, failed, or the build carries no geocoder — LocationIQ's.
 * The phone cannot tell no signal from any other failure, so it never says *sin
 * señal*: LocationIQ's own request says it a moment later. And when the phone
 * found nothing and LocationIQ could not be asked, what she is told is the
 * phone's *nothing found*, not a failure.
 */
export async function primeroElTelefono(
  telefono: () => Promise<Resultado>,
  locationiq: () => Promise<Resultado>,
): Promise<Resultado> {
  const suya = await telefono();
  if (suya.kind === 'respuestas') return suya;
  const otra = await locationiq();
  return otra.kind === 'falla' && suya.kind === 'ninguna' ? suya : otra;
}

// ----------------------------------------------------------------------------
// Her door in the list as she types — `10.4e`, the owner's ruling of 2026-11-02
// ----------------------------------------------------------------------------

/**
 * How long after her last keystroke the phone is asked, in ms — longer than
 * LocationIQ's pause: Apple's geocoder is rate-limited per app and asks for at
 * most one question per action (its documentation, read 2026-11-02), and a number
 * typed digit by digit should ask once.
 */
export const PAUSA_TELEFONO_MS = 600;

/**
 * ⚠️ THE PHONE IS ASKED AS SHE TYPES ONLY ONCE SHE HAS TYPED HER NUMBER — what she
 * typed, with her colonia and city as LocationIQ is asked it, when its first part
 * ends in a house number (`sinNumero` finds one to drop: *Calle 6* alone is a
 * street, *Calle 6 46* a door); else `null`. MEASURED 2026-11-02 on the twenty
 * addresses typed as she types them: half a street, the phone's first answer was
 * on her block for none (Google and Apple); the whole street without a number, for
 * 4 and 6 — streets, as LocationIQ's 5; with the number, a door 18 times in 20, on
 * her block 12 and 11.
 */
export function preguntaConPuerta(
  texto: string,
  direccion: Pick<AddressForm, 'colonia' | 'city'> | null,
): string | null {
  const pregunta = preguntaConSuDireccion(texto, direccion);
  return pregunta !== null && sinNumero(pregunta) !== null ? pregunta : null;
}

/**
 * ⚠️ THE LIST AS SHE TYPES: the phone's answers that name a door first — the door
 * is what LocationIQ almost never knows (4 of its 56 rows, measured with the
 * number typed) — then LocationIQ's, a row reading the same as one above dropped.
 * With no door from the phone — not asked yet, still out, nothing found, no
 * signal, a build without the module — LocationIQ's list exactly as before, with
 * its words for nothing found and no signal.
 */
export function conLasPuertas(telefono: Resultado | null, locationiq: Sugerencias): Sugerencias {
  const puertas = telefono?.kind === 'respuestas' ? telefono.respuestas.filter((r) => r.conNumero) : [];
  if (puertas.length === 0) return locationiq;
  const resto =
    locationiq.kind === 'respuestas'
      ? locationiq.respuestas.filter((r) => !puertas.some((p) => p.titulo === r.titulo && p.detalle === r.detalle))
      : [];
  return { kind: 'respuestas', respuestas: [...puertas, ...resto] };
}
