import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { EMPTY_ADDRESS } from '@/api/place';
import {
  ANCHO_CALLE_METROS,
  ANCHO_ZONA_MAX_METROS,
  CAJA_DEL_VALLE,
  CREDITO_LOCATIONIQ_URL,
  CREDITO_OSM_URL,
  LIMITE_MS,
  LOCATIONIQ_AUTOCOMPLETE,
  MIN_LETRAS,
  PAUSA_MS,
  PAUSA_TELEFONO_MS,
  RESPUESTAS_DEL_TELEFONO,
  SUGERENCIAS,
  VALLE_DE_MEXICO,
  anchoPara,
  conLasPuertas,
  preguntaConColonia,
  preguntaConPuerta,
  preguntaDe,
  preguntaDeDireccion,
  preguntaParaElTelefono,
  primeroElTelefono,
  respuestasDe,
  respuestasDelTelefono,
  resultadoDe,
  resultadoDelTelefono,
  sinNumero,
  tokenOf,
  urlDeBusqueda,
  type Respuesta,
  type Resultado,
} from '@/lib/buscar';
import { CLOSE_METRES } from '@/lib/mapa';
import { ES } from '@/strings';

// ============================================================================
// THE MAP'S ADDRESS SEARCH. Plan task `10.4c`, the owner's ruling of 2026-10-31.
//
// ⚠️ WHAT ONLY A PHONE CAN SAY — that the suggestions draw over the map, that a
// pick flies it, that the flat map is the right one — is the `preview` build's
// (a map built on this Mac has no key and never moves). Here: every value sent
// to LocationIQ, every answer read back, the request's failures, and the one rule
// a careless edit could break unseen: AN ANSWER ONLY MOVES THE MAP, and the pin
// is her tap.
//
// The answers below are shaped like LocationIQ's own (read 2026-10-31), with a
// made-up kitchen on a real street.
// ============================================================================

const SRC = fileURLToPath(new URL('../src', import.meta.url));
const code = (path: string) =>
  readFileSync(join(SRC, path), 'utf8')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');

function sources(dir = SRC): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? sources(path) : /\.tsx?$/.test(name) ? [path] : [];
  });
}

const CALLE = {
  place_id: '331520000',
  osm_type: 'way',
  lat: '19.4153',
  lon: '-99.1654',
  boundingbox: ['19.4120', '19.4190', '-99.1660', '-99.1648'],
  class: 'highway',
  type: 'residential',
  display_place: 'Calle Durango',
  display_address: 'Roma Norte, Cuauhtémoc, Ciudad de México, 06700, México',
  address: { name: 'Calle Durango', neighbourhood: 'Roma Norte', suburb: 'Cuauhtémoc', city: 'Ciudad de México', postcode: '06700', country: 'México', country_code: 'mx' },
};

const CASA = {
  ...CALLE,
  place_id: '331520001',
  class: 'place',
  type: 'house',
  boundingbox: ['19.41530', '19.41540', '-99.16545', '-99.16535'],
  address: { ...CALLE.address, house_number: '220', road: 'Calle Durango' },
};

describe('the token', () => {
  it('is LocationIQ’s API kind, trimmed', () => {
    expect(tokenOf(' pk.abc123 \n')).toBe('pk.abc123');
  });

  it('or none — and then no search box is drawn', () => {
    expect(tokenOf(undefined)).toBeNull();
    expect(tokenOf('')).toBeNull();
    expect(tokenOf('   ')).toBeNull();
    expect(tokenOf('pk.')).toBeNull();
    // A value put in the wrong variable is refused rather than sent.
    expect(tokenOf('sb_publishable_abc')).toBeNull();
    expect(tokenOf('525500000000')).toBeNull();
  });
});

describe('what is asked, and when', () => {
  it('what she typed, on one line, from three letters on', () => {
    expect(MIN_LETRAS).toBe(3);
    expect(preguntaDe('Du')).toBeNull();
    expect(preguntaDe('  Du  ')).toBeNull();
    expect(preguntaDe('Dur')).toBe('Dur');
    expect(preguntaDe('  Durango   220,\nRoma  Norte ')).toBe('Durango 220, Roma Norte');
    expect(preguntaDe('Ñu')).toBeNull();
    expect(preguntaDe('Ñuñ')).toBe('Ñuñ');
  });

  // The free plan allows two questions a second; a question goes out only after
  // she pauses, and a late suggestion is no use.
  it('after a pause, never faster than the free plan allows, and given up after eight seconds', () => {
    expect(PAUSA_MS).toBeGreaterThanOrEqual(450);
    expect(LIMITE_MS).toBe(8_000);
    expect(SUGERENCIAS).toBe(5);
  });

  it('Spanish names, Mexico only, and nothing outside the Valle de México', () => {
    const url = new URL(urlDeBusqueda('Durango 220, Roma Norte', 'pk.abc'));
    expect(`${url.origin}${url.pathname}`).toBe(LOCATIONIQ_AUTOCOMPLETE);
    expect(LOCATIONIQ_AUTOCOMPLETE).toBe('https://api.locationiq.com/v1/autocomplete');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      key: 'pk.abc',
      q: 'Durango 220, Roma Norte',
      countrycodes: 'mx',
      limit: '5',
      'accept-language': 'es',
      normalizecity: '1',
      dedupe: '1',
      viewbox: VALLE_DE_MEXICO,
      bounded: '1',
    });
  });

  // min_lon,min_lat,max_lon,max_lat — Mexico City and its conurbation. Without
  // the bound, a Milpa Alta street's first suggestion was in another state.
  it('the Valle de México is a real box around the city', () => {
    const [minLon, minLat, maxLon, maxLat] = VALLE_DE_MEXICO.split(',').map(Number);
    expect(minLon).toBeLessThan(maxLon);
    expect(minLat).toBeLessThan(maxLat);
    const zocalo = { lat: 19.4326, lon: -99.1332 };
    expect(zocalo.lon).toBeGreaterThan(minLon);
    expect(zocalo.lon).toBeLessThan(maxLon);
    expect(zocalo.lat).toBeGreaterThan(minLat);
    expect(zocalo.lat).toBeLessThan(maxLat);
  });

  it('survives the characters a URL would eat', () => {
    const url = new URL(urlDeBusqueda('Niños Héroes 5 & Cía', 'pk.abc', 1));
    expect(url.searchParams.get('q')).toBe('Niños Héroes 5 & Cía');
    expect(url.searchParams.get('limit')).toBe('1');
  });
});

// ⚠️ MEASURED 2026-10-31: a street and number alone found the right street for 4
// of 20 addresses, with the colonia for 12 — and inside the Valle de México a
// street with a number LocationIQ cannot match is "nothing found".
describe('the colonia she gave, and the number LocationIQ cannot find', () => {
  it('adds the colonia from her form when she typed none', () => {
    expect(preguntaConColonia('Durango 220', ' Roma  Norte ')).toBe('Durango 220, Roma Norte');
  });

  it('leaves what she typed alone when she typed a colonia herself, or gave none in the form', () => {
    expect(preguntaConColonia('Durango 220, Condesa', 'Roma Norte')).toBe('Durango 220, Condesa');
    expect(preguntaConColonia('Durango 220', '')).toBe('Durango 220');
    expect(preguntaConColonia('Du', 'Roma Norte')).toBeNull();
  });

  it('asks again without the house number, keeping the colonia', () => {
    expect(sinNumero('Durango 220')).toBe('Durango');
    expect(sinNumero('Durango 220, Roma Norte')).toBe('Durango, Roma Norte');
    expect(sinNumero('Nogal 3B, Tlaxopan')).toBe('Nogal, Tlaxopan');
    expect(sinNumero('Calle 6 46, Progreso Nacional')).toBe('Calle 6, Progreso Nacional');
    expect(sinNumero('Poniente 110 210')).toBe('Poniente 110');
  });

  it('never strips a number that is the street’s name, and has nothing to strip without a number', () => {
    expect(sinNumero('Calle 6')).toBeNull();
    expect(sinNumero('Poniente 110, Defensores de la República')).toBeNull();
    expect(sinNumero('Av. 5')).toBeNull();
    expect(sinNumero('Durango')).toBeNull();
    expect(sinNumero('Durango, Roma Norte 2')).toBeNull();
    expect(sinNumero('220')).toBeNull();
  });
});

describe('the map opens near her kitchen: the address she typed, asked once', () => {
  const lupe = { street: ' Durango ', number: '220', colonia: 'Roma Norte', city: 'Cuauhtémoc', postalCode: '06700' };

  it('street and number, colonia, city — as she wrote them', () => {
    expect(preguntaDeDireccion(lupe)).toBe('Durango 220, Roma Norte, Cuauhtémoc');
  });

  it('the colonia may be empty, as the form allows', () => {
    expect(preguntaDeDireccion({ ...lupe, colonia: '  ' })).toBe('Durango 220, Cuauhtémoc');
  });

  it('nothing is asked while the address is not whole — the map stays on the city', () => {
    expect(preguntaDeDireccion(EMPTY_ADDRESS)).toBeNull();
    expect(preguntaDeDireccion({ ...lupe, number: '' })).toBeNull();
    expect(preguntaDeDireccion({ ...lupe, postalCode: '6700' })).toBeNull();
  });
});

describe('what LocationIQ answers, read', () => {
  it('a street: its name, its colonia without the country, its point and how far it reaches', () => {
    const [r] = respuestasDe([CALLE]);
    expect(r.id).toBe('331520000');
    expect(r.titulo).toBe('Calle Durango');
    expect(r.detalle).toBe('Roma Norte, Cuauhtémoc, Ciudad de México, 06700');
    expect(r.punto).toEqual({ latitude: 19.4153, longitude: -99.1654 });
    expect(r.conNumero).toBe(false);
    expect(r.anchoMetros).toBeGreaterThan(770);
    expect(r.anchoMetros).toBeLessThan(790);
  });

  // Seen on the emulator 2026-10-31: LocationIQ names the city and the state, both "Ciudad de México".
  it('says a part repeated back to back once', () => {
    const [r] = respuestasDe([{ ...CALLE, display_address: 'Roma Norte, Ciudad de México, Ciudad de México, 06700, México' }]);
    expect(r.detalle).toBe('Roma Norte, Ciudad de México, 06700');
  });

  it('a door: the number joins the name, once', () => {
    const [r] = respuestasDe([CASA]);
    expect(r.titulo).toBe('Calle Durango 220');
    expect(r.conNumero).toBe(true);
    expect(respuestasDe([{ ...CASA, display_place: 'Calle Durango 220' }])[0].titulo).toBe('Calle Durango 220');
  });

  // A street is several stretches in the map's data: one row, framing them all.
  it('two rows that read the same are one, in the first’s place, framing both stretches', () => {
    const norte = { ...CALLE, place_id: 'a', lat: '19.4190', boundingbox: ['19.4170', '19.4210', '-99.1660', '-99.1650'] };
    const sur = { ...CALLE, place_id: 'b', lat: '19.4110', boundingbox: ['19.4090', '19.4130', '-99.1662', '-99.1648'] };
    const otra = { ...CALLE, place_id: 'c', display_place: 'Privada Durango' };
    const filas = respuestasDe([norte, otra, sur]);
    expect(filas.map((r) => r.id)).toEqual(['a', 'c']);
    expect(filas[0].caja).toEqual({ sur: 19.409, norte: 19.421, oeste: -99.1662, este: -99.1648 });
    expect(filas[0].punto.latitude).toBeCloseTo(19.415, 6);
    expect(filas[0].punto.longitude).toBeCloseTo(-99.1655, 6);
    expect(filas[0].anchoMetros).toBeGreaterThan(1_300);
    expect(filas[0].anchoMetros).toBeLessThan(1_350);
  });

  it('a door is never merged into a street: its number is the point', () => {
    expect(respuestasDe([CASA, { ...CASA, place_id: 'otra' }]).map((r) => r.id)).toEqual(['331520001']);
    expect(respuestasDe([CASA, { ...CASA, place_id: 'otra' }])[0].punto).toEqual({ latitude: 19.4153, longitude: -99.1654 });
  });

  it('a malformed row is skipped, never shown — and anything but a list is no answer', () => {
    const rows = [CALLE, { ...CALLE, lat: 'x' }, { ...CALLE, lon: undefined }, { ...CALLE, lat: '123' }, null, 'Durango', { ...CALLE, display_place: '', address: {} }];
    expect(respuestasDe(rows).map((r) => r.id)).toEqual(['331520000']);
    expect(respuestasDe({ error: 'Unable to geocode' })).toEqual([]);
    expect(respuestasDe(null)).toEqual([]);
  });

  it('a row with no bounding box reaches nothing, and is framed as a street', () => {
    const [r] = respuestasDe([{ ...CALLE, boundingbox: undefined }]);
    expect(r.anchoMetros).toBe(0);
    expect(anchoPara(r)).toBe(ANCHO_CALLE_METROS);
  });

  // ⚠️ LocationIQ's "nothing found" is a 404, not an empty list.
  it('a 404 is nothing found; 429, a refused token or its own failure are a failure', () => {
    expect(resultadoDe(200, [CALLE])).toMatchObject({ kind: 'respuestas', respuestas: [{ id: '331520000' }] });
    expect(resultadoDe(200, [])).toEqual({ kind: 'ninguna' });
    expect(resultadoDe(404, { error: 'Unable to geocode' })).toEqual({ kind: 'ninguna' });
    expect(resultadoDe(429, { error: 'Rate Limited Second' })).toEqual({ kind: 'falla' });
    expect(resultadoDe(401, { error: 'Invalid key' })).toEqual({ kind: 'falla' });
    expect(resultadoDe(500, null)).toEqual({ kind: 'falla' });
  });
});

describe('how wide the map opens on an answer', () => {
  const con = (anchoMetros: number, conNumero = false): Respuesta => ({
    id: 'x',
    titulo: 'Calle',
    detalle: '',
    punto: { latitude: 19.4, longitude: -99.1 },
    conNumero,
    anchoMetros,
    caja: null,
  });

  it('at block level when it names her number — her first tap is the pin', () => {
    expect(anchoPara(con(10, true))).toBe(CLOSE_METRES);
  });

  // Measured 2026-10-31: LocationIQ found the right street, often a few blocks
  // from her door, and almost never the number.
  it('otherwise about five blocks at least, the stretch it found if longer, and never a whole alcaldía', () => {
    expect(ANCHO_CALLE_METROS).toBe(500);
    expect(anchoPara(con(4))).toBe(ANCHO_CALLE_METROS);
    expect(anchoPara(con(804))).toBe(804);
    expect(anchoPara(con(12_000))).toBe(ANCHO_ZONA_MAX_METROS);
    expect(ANCHO_ZONA_MAX_METROS).toBe(2_000);
  });
});

describe('one question to LocationIQ', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('EXPO_PUBLIC_LOCATIONIQ_TOKEN', 'pk.prueba');
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  const answer = (status: number, body: unknown) => async () =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

  it('sends the token and the question, and reads the answer', async () => {
    const fetchMock = vi.fn(async (_url: string) => answer(200, [CALLE])());
    vi.stubGlobal('fetch', fetchMock);
    const { preguntar } = await import('@/lib/locationiq');
    expect(await preguntar('Durango 220')).toMatchObject({ kind: 'respuestas', respuestas: [{ titulo: 'Calle Durango' }] });
    const sent = new URL(String(fetchMock.mock.calls[0][0]));
    expect(sent.searchParams.get('key')).toBe('pk.prueba');
    expect(sent.searchParams.get('q')).toBe('Durango 220');
  });

  it('nothing found, and a refusal, as LocationIQ sends them', async () => {
    vi.stubGlobal('fetch', vi.fn(answer(404, { error: 'Unable to geocode' })));
    const { preguntar } = await import('@/lib/locationiq');
    expect(await preguntar('Durango 999999')).toEqual({ kind: 'ninguna' });
    vi.stubGlobal('fetch', vi.fn(answer(429, { error: 'Rate Limited Day' })));
    expect(await preguntar('Durango 220')).toEqual({ kind: 'falla' });
  });

  it('a street and number found nothing: asked again without the number, half a second later', async () => {
    vi.useFakeTimers();
    const asked: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        const q = new URL(url).searchParams.get('q') ?? '';
        asked.push(q);
        return q === 'Durango, Roma Norte' ? answer(200, [CALLE])() : answer(404, { error: 'Unable to geocode' })();
      }),
    );
    const { ENTRE_PREGUNTAS_MS, preguntar } = await import('@/lib/locationiq');
    expect(ENTRE_PREGUNTAS_MS).toBeGreaterThanOrEqual(500);
    const pending = preguntar('Durango 220, Roma Norte');
    await vi.advanceTimersByTimeAsync(ENTRE_PREGUNTAS_MS - 1);
    expect(asked).toEqual(['Durango 220, Roma Norte']);
    await vi.advanceTimersByTimeAsync(1);
    expect(await pending).toMatchObject({ kind: 'respuestas', respuestas: [{ titulo: 'Calle Durango' }] });
    expect(asked).toEqual(['Durango 220, Roma Norte', 'Durango, Roma Norte']);
  });

  it('and nothing is asked twice when there is no number to drop, or the first answer was not "nothing"', async () => {
    const fetchMock = vi.fn(async (_url: string) => answer(404, { error: 'Unable to geocode' })());
    vi.stubGlobal('fetch', fetchMock);
    const { preguntar } = await import('@/lib/locationiq');
    expect(await preguntar('Calle 6, Progreso Nacional')).toEqual({ kind: 'ninguna' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const limited = vi.fn(async (_url: string) => answer(429, { error: 'Rate Limited Second' })());
    vi.stubGlobal('fetch', limited);
    expect(await preguntar('Durango 220')).toEqual({ kind: 'falla' });
    expect(limited).toHaveBeenCalledTimes(1);
  });

  it('a question replaced while it waits to ask again is dropped, and the second is never sent', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn(async (_url: string) => answer(404, { error: 'Unable to geocode' })());
    vi.stubGlobal('fetch', fetchMock);
    const { preguntar } = await import('@/lib/locationiq');
    const replaced = new AbortController();
    const pending = preguntar('Durango 220', replaced.signal);
    const settled = pending.catch((failure: unknown) => failure);
    await vi.advanceTimersByTimeAsync(10);
    replaced.abort();
    expect(await settled).toBeInstanceOf(Error);
    await vi.advanceTimersByTimeAsync(5_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('no signal is said as no signal', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('Network request failed'))));
    const { preguntar } = await import('@/lib/locationiq');
    expect(await preguntar('Durango 220')).toEqual({ kind: 'sin-senal' });
  });

  it('no answer in eight seconds is no signal, and the request is dropped', async () => {
    vi.useFakeTimers();
    let aborted = false;
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) =>
            init?.signal?.addEventListener('abort', () => {
              aborted = true;
              reject(new DOMException('aborted', 'AbortError'));
            }),
          ),
      ),
    );
    const { preguntar } = await import('@/lib/locationiq');
    const pending = preguntar('Durango 220');
    await vi.advanceTimersByTimeAsync(LIMITE_MS);
    expect(await pending).toEqual({ kind: 'sin-senal' });
    expect(aborted).toBe(true);
  });

  // TanStack aborts a question a newer one replaced; rethrown, it is dropped
  // silently instead of being shown as "sin conexión".
  it('a question replaced by a newer one fails as replaced, not as no signal', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) =>
            init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError'))),
          ),
      ),
    );
    const { preguntar } = await import('@/lib/locationiq');
    const replaced = new AbortController();
    const pending = preguntar('Durango 2', replaced.signal);
    replaced.abort();
    await expect(pending).rejects.toThrow(/aborted/);
  });

  it('a build with no token asks nothing', async () => {
    vi.stubEnv('EXPO_PUBLIC_LOCATIONIQ_TOKEN', '');
    const fetchMock = vi.fn(answer(200, [CALLE]));
    vi.stubGlobal('fetch', fetchMock);
    const { LOCATIONIQ_TOKEN, preguntar } = await import('@/lib/locationiq');
    expect(LOCATIONIQ_TOKEN).toBeNull();
    expect(await preguntar('Durango 220')).toEqual({ kind: 'falla' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

// ⚠️⚠️ THE RULE THIS ROW EXISTS UNDER: what is stored is what she typed and her
// pin — never a provider's point or text (Apple's licence and Google's terms
// forbid keeping theirs). Since `10.4e` (the owner's ruling of 2026-11-02, as Uber
// does it) her pin is the middle of the map, and only once her own hand put it
// there: after a flight to an answer, no pin until she moves the map. The
// sequences are `test/mapa.test.ts`'s (`alLlegar`); here, read out of the file,
// that the map is wired to them — no suite can move the map.
describe('an answer only moves the map; her pin is the middle she put there herself', () => {
  const map = code('ui/MapaPunto.tsx');

  it('`onPin` hears the middle only through the rule, each time the map settles — and null as a flight leaves', () => {
    expect(map.match(/onPin\(/g)).toHaveLength(2);
    expect(map).toMatch(/const suyo = pinDelCentro\(centro\.current, next, pin\);\s*if \(suyo !== pin\) onPin\(suyo\);/);
    expect(map).toMatch(
      /function volarA\(respuesta: Respuesta\) \{\s*tocado\.current = true;\s*centro\.current = haciaUnPunto\(centro\.current, respuesta\.punto, 'otro', Date\.now\(\)\);\s*onPin\(null\);/,
    );
  });

  it('an answer’s point reaches nothing but the map’s flight, marked as not hers', () => {
    expect(map.match(/\.punto\b/g)).toHaveLength(2);
    expect(map).toMatch(/haciaUnPunto\(centro\.current, respuesta\.punto, 'otro', Date\.now\(\)\)/);
    expect(map).toMatch(/map\.current\?\.animateToRegion\(regionAround\(respuesta\.punto, anchoPara\(respuesta\)\), VOLAR_MS\)/);
    // Only her tap's point is sent on her behalf.
    expect(map.match(/'ella'/g)).toHaveLength(1);
    expect(map).toMatch(/haciaUnPunto\(centro\.current, point, 'ella', Date\.now\(\)\)/);
    expect(map).toMatch(/const point = event\.nativeEvent\.coordinate;/);
  });

  it('a pick, the opening answer and Buscar’s all go through that flight, and the opening one never after her finger', () => {
    expect(map).toMatch(/function elegir\(respuesta: Respuesta\) \{[\s\S]*?volarA\(respuesta\);\s*\}/);
    expect(map).toMatch(/if \(apertura !== null && listo && !tocado\.current\) volarA\(apertura\);/);
    expect(map).toMatch(/onTouchStart=\{\(\) => \{\s*tocado\.current = true;\s*\}\}/);
    expect(map).toMatch(/const buscada = useBuscar\(enviada\);/);
    expect(map).toMatch(/if \(buscada\.kind !== 'respuestas'\) return;\s*const primera = buscada\.respuestas\[0\];[\s\S]*?if \(primera !== undefined\) volarA\(primera\);/);
    expect(map.match(/volarA\(/g)).toHaveLength(4); // its definition and the three above
  });

  it('the screen saves the pin it was handed — nothing when the middle is not hers', () => {
    const screen = code('ui/PantallaPunto.tsx');
    expect(screen).toMatch(/<MapaPunto pin=\{pin\} direccion=\{direccion\} onPin=\{placed\}/);
    expect(screen).toMatch(/if \(pin === null\) \{\s*setProblem\(ES\.mapa\.falta\);\s*return;\s*\}/);
    expect(screen).toMatch(/setProblem\(await onGuardar\(pin, directions\)\);/);
  });

  it('nothing in the data layer reads the search', () => {
    const api = sources(join(SRC, 'api')).map((path) => ({ path, text: readFileSync(path, 'utf8') }));
    expect(api.length).toBeGreaterThan(0);
    for (const file of api) expect(file.text, file.path).not.toMatch(/@\/lib\/(buscar|locationiq|telefono)|@\/ui\/Buscador/);
  });

  it('¿Es aquí? is the phone’s own maps, shown in the map and handed to nobody', () => {
    expect(map).toMatch(/addressForCoordinate\(\{ latitude: lat, longitude: lng \}\)/);
    expect(map).toMatch(/setEsAqui\(lineaDeLugar\(lugar\)\)/);
    expect(map).toMatch(/\{ES\.mapa\.esAqui\(esAqui\)\}/);
    const elsewhere = sources()
      .filter((path) => !path.endsWith(join('ui', 'MapaPunto.tsx')))
      .filter((path) => /addressForCoordinate|esAqui\b|lineaDeLugar\(/.test(readFileSync(path, 'utf8').replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')));
    expect(elsewhere.map((path) => path.slice(SRC.length + 1)).sort()).toEqual(['lib/mapa.ts', 'strings.ts']);
  });
});

describe('the box, and the credit it carries', () => {
  // LocationIQ's free plan: "a prominent link back to us … in this format".
  it('says LocationIQ’s words and links its site, and credits OpenStreetMap', () => {
    expect(ES.mapa.creditoBusqueda).toBe('Search by LocationIQ.com');
    expect(CREDITO_LOCATIONIQ_URL).toBe('https://locationiq.com');
    expect(ES.mapa.creditoDatos).toBe('© OpenStreetMap');
    expect(CREDITO_OSM_URL).toBe('https://www.openstreetmap.org/copyright');
    const box = code('ui/Buscador.tsx');
    expect(box).toMatch(/Linking\.openURL\(CREDITO_LOCATIONIQ_URL\)[\s\S]*?\{ES\.mapa\.creditoBusqueda\}/);
    expect(box).toMatch(/Linking\.openURL\(CREDITO_OSM_URL\)[\s\S]*?\{ES\.mapa\.creditoDatos\}/);
  });

  it('is drawn only on a build that carries the token, and the credit with it', () => {
    expect(code('ui/MapaPunto.tsx')).toMatch(/\{LOCATIONIQ_TOKEN !== null && \(\s*<CampoDeBusqueda/);
    expect(code('lib/locationiq.ts')).toMatch(/tokenOf\(process\.env\.EXPO_PUBLIC_LOCATIONIQ_TOKEN\)/);
    // The suggestions ask only with a token; the phone's two questions ask LocationIQ only with one.
    expect((code('lib/locationiq.ts').match(/enabled: pregunta !== null && LOCATIONIQ_TOKEN !== null/g) ?? []).length).toBe(1);
    expect((code('lib/telefono.ts').match(/LOCATIONIQ_TOKEN === null \? Promise\.resolve\(FALLA\)/g) ?? []).length).toBe(2);
  });

  it('the keyboard’s Buscar key asks for what she typed, with her colonia', () => {
    expect(code('ui/Buscador.tsx')).toMatch(/onSubmitEditing=\{onBuscar\}/);
    expect(code('ui/Buscador.tsx')).toMatch(/returnKeyType="search"/);
    expect(code('ui/MapaPunto.tsx')).toMatch(/const colonia = direccion\?\.colonia \?\? '';/);
    expect(code('ui/MapaPunto.tsx')).toMatch(/function buscar\(\) \{\s*const pregunta = preguntaConColonia\(texto, colonia\);\s*if \(pregunta !== null\) setEnviada\(pregunta\);/);
    expect(code('ui/MapaPunto.tsx')).toMatch(/onBuscar=\{buscar\}/);
  });

  it('keeps the keyboard while she picks — a tap on a suggestion chooses it', () => {
    expect(code('ui/Buscador.tsx')).toMatch(/keyboardShouldPersistTaps="handled"/);
  });
});

// ============================================================================
// THE PHONE'S OWN SEARCH — plan task `10.4d`, the owner's ruling of 2026-11-01.
// Google's geocoder on Android and Apple's on an iPhone answer the search that
// opens the map and the keyboard's *Buscar*, through this app's own module
// (`cocina/modules/geocodificador`); LocationIQ when the phone finds nothing.
// The rows below are shaped like the module's own (2026-11-02, read off the
// emulator and this Mac), with a made-up kitchen on a real street.
// ============================================================================

const PUERTA = {
  latitude: 19.41531,
  longitude: -99.16541,
  calle: 'Calle Durango',
  numero: '220',
  colonia: 'Roma Norte',
  ciudad: 'Ciudad de México',
  estado: 'Ciudad de México',
  cp: '06700',
};

describe('the phone is asked what she typed, inside the Valle de México', () => {
  it('the box is LocationIQ’s own, south, west, north, east', () => {
    const [oeste, sur, este, norte] = VALLE_DE_MEXICO.split(',').map(Number);
    expect(CAJA_DEL_VALLE).toEqual([sur, oeste, norte, este]);
    expect(CAJA_DEL_VALLE).toEqual([19.05, -99.4, 19.75, -98.85]);
    expect(RESPUESTAS_DEL_TELEFONO).toBe(5);
  });

  it('the opening question is all five boxes as she wrote them — the postcode too', () => {
    const form = { street: ' Durango ', number: '220', colonia: 'Roma Norte', city: 'Cuauhtémoc', postalCode: '06700' };
    expect(preguntaParaElTelefono(form)).toBe('Durango 220, Roma Norte, Cuauhtémoc, 06700');
    expect(preguntaParaElTelefono({ ...form, colonia: '' })).toBe('Durango 220, Cuauhtémoc, 06700');
    // LocationIQ is asked without the postcode, as 10.4c measured it.
    expect(preguntaDeDireccion(form)).toBe('Durango 220, Roma Norte, Cuauhtémoc');
  });

  it('nothing is asked while the address is not whole', () => {
    expect(preguntaParaElTelefono(EMPTY_ADDRESS)).toBeNull();
    const form = { street: 'Durango', number: '220', colonia: '', city: 'Cuauhtémoc', postalCode: '0670' };
    expect(preguntaParaElTelefono(form)).toBeNull();
  });
});

describe('what the phone answers, read', () => {
  it('a door: street and number, its colonia, city and postcode, at block level', () => {
    const [door] = respuestasDelTelefono([PUERTA]);
    expect(door).toEqual({
      id: 'telefono-0',
      titulo: 'Calle Durango 220',
      detalle: 'Roma Norte, Ciudad de México, 06700',
      punto: { latitude: 19.41531, longitude: -99.16541 },
      conNumero: true,
      anchoMetros: 0,
      caja: null,
    });
    expect(anchoPara(door)).toBe(CLOSE_METRES);
  });

  it('a street with no number opens about five blocks wide; a colonia alone is its own title', () => {
    const [street] = respuestasDelTelefono([{ ...PUERTA, numero: null }]);
    expect(street.titulo).toBe('Calle Durango');
    expect(street.conNumero).toBe(false);
    expect(anchoPara(street)).toBe(ANCHO_CALLE_METROS);
    const [zone] = respuestasDelTelefono([{ ...PUERTA, calle: null, numero: '220' }]);
    expect(zone.titulo).toBe('Roma Norte');
    expect(zone.detalle).toBe('Ciudad de México, 06700');
    expect(zone.conNumero).toBe(false);
  });

  it('an empty field is nothing — a null, the text "(null)", Google’s Unnamed Road', () => {
    const [a] = respuestasDelTelefono([{ ...PUERTA, numero: '(null)', cp: null }]);
    expect(a.titulo).toBe('Calle Durango');
    expect(a.detalle).toBe('Roma Norte, Ciudad de México');
    const [b] = respuestasDelTelefono([{ ...PUERTA, calle: 'Unnamed Road' }]);
    expect(b.titulo).toBe('Roma Norte');
    expect(b.conNumero).toBe(false);
  });

  it('an answer outside the Valle de México, without a point or a name, or malformed, is never offered', () => {
    expect(respuestasDelTelefono([{ ...PUERTA, latitude: 20.6597, longitude: -103.3496 }])).toEqual([]); // Guadalajara
    expect(respuestasDelTelefono([{ ...PUERTA, latitude: null }])).toEqual([]);
    expect(respuestasDelTelefono([{ ...PUERTA, calle: null, colonia: null }])).toEqual([]);
    expect(respuestasDelTelefono([null, 'x', 7])).toEqual([]);
    expect(respuestasDelTelefono('no es una lista')).toEqual([]);
    const [kept] = respuestasDelTelefono([{ ...PUERTA, latitude: 99 }, PUERTA]);
    expect(kept.id).toBe('telefono-1');
  });

  it('two answers that read the same are one, the first', () => {
    const both = respuestasDelTelefono([PUERTA, { ...PUERTA, latitude: 19.4154 }]);
    expect(both).toHaveLength(1);
    expect(both[0].punto.latitude).toBe(19.41531);
  });

  it('nothing found is nothing found; anything but a list is a failure', () => {
    expect(resultadoDelTelefono([])).toEqual({ kind: 'ninguna' });
    expect(resultadoDelTelefono([{ ...PUERTA, latitude: 25.6866, longitude: -100.3161 }])).toEqual({ kind: 'ninguna' }); // Monterrey
    expect(resultadoDelTelefono(null)).toEqual({ kind: 'falla' });
    expect(resultadoDelTelefono([PUERTA])).toMatchObject({ kind: 'respuestas', respuestas: [{ titulo: 'Calle Durango 220' }] });
  });
});

describe('the phone first, LocationIQ when it has nothing', () => {
  const answer = (titulo: string): Resultado => ({ kind: 'respuestas', respuestas: [{ ...respuestasDelTelefono([PUERTA])[0], titulo }] });
  const of = (r: Resultado) => vi.fn(() => Promise.resolve(r));

  it('the phone’s answers, and LocationIQ is never asked', async () => {
    const locationiq = of(answer('LocationIQ'));
    await expect(primeroElTelefono(of(answer('teléfono')), locationiq)).resolves.toMatchObject({ respuestas: [{ titulo: 'teléfono' }] });
    expect(locationiq).not.toHaveBeenCalled();
  });

  it('nothing found or a failure on the phone: LocationIQ’s answer, whatever it is', async () => {
    for (const phone of [{ kind: 'ninguna' }, { kind: 'falla' }] as const) {
      await expect(primeroElTelefono(of(phone), of(answer('LocationIQ')))).resolves.toMatchObject({ respuestas: [{ titulo: 'LocationIQ' }] });
      await expect(primeroElTelefono(of(phone), of({ kind: 'sin-senal' }))).resolves.toEqual({ kind: 'sin-senal' });
      await expect(primeroElTelefono(of(phone), of({ kind: 'ninguna' }))).resolves.toEqual({ kind: 'ninguna' });
    }
  });

  it('the phone found nothing and LocationIQ could not be asked: she hears nothing found, not a failure', async () => {
    await expect(primeroElTelefono(of({ kind: 'ninguna' }), of({ kind: 'falla' }))).resolves.toEqual({ kind: 'ninguna' });
    await expect(primeroElTelefono(of({ kind: 'falla' }), of({ kind: 'falla' }))).resolves.toEqual({ kind: 'falla' });
  });
});

// ============================================================================
// HER DOOR IN THE LIST AS SHE TYPES — `10.4e`, the owner's ruling of 2026-11-02
// (*"I typed Durango 220 and only saw the street"*). MEASURED FIRST (2026-11-02,
// the plan's status log): the twenty addresses typed as she types them, her
// colonia added — with the number typed, the phone's first answer was a door 18
// times in 20 and on her block 12 (Google) and 11 (Apple); LocationIQ's list
// opened on her block 6 times and never on a door (4 of its 56 rows had a
// number). Before the number the phone did no better than LocationIQ.
// ============================================================================

describe('the phone is asked as she types only once she has typed her number', () => {
  it('what she typed with her colonia — the same question Buscar sends, so one answer serves both', () => {
    expect(preguntaConPuerta('Durango 220', 'Roma Norte')).toBe('Durango 220, Roma Norte');
    expect(preguntaConPuerta('Durango 220', 'Roma Norte')).toBe(preguntaConColonia('Durango 220', 'Roma Norte'));
    expect(preguntaConPuerta('Durango 220, Condesa', 'Roma Norte')).toBe('Durango 220, Condesa');
    expect(preguntaConPuerta('Nogal 3B', '')).toBe('Nogal 3B');
  });

  // Measured: half a street, the phone's first answer was on her block for none of 20.
  it('not while she types the street, nor a street whose name is a number', () => {
    expect(preguntaConPuerta('Dura', 'Roma Norte')).toBeNull();
    expect(preguntaConPuerta('Durango', 'Roma Norte')).toBeNull();
    expect(preguntaConPuerta('Calle 6', 'Progreso Nacional')).toBeNull();
    expect(preguntaConPuerta('Poniente 110', '')).toBeNull();
    expect(preguntaConPuerta('Du', 'Roma Norte')).toBeNull();
  });

  it('but a door on such a street, and her number from its first digit', () => {
    expect(preguntaConPuerta('Calle 6 46', 'Progreso Nacional')).toBe('Calle 6 46, Progreso Nacional');
    expect(preguntaConPuerta('Durango 2', 'Roma Norte')).toBe('Durango 2, Roma Norte');
  });

  // Apple's geocoder is rate-limited per app and asks for one question per action.
  it('after a longer pause than LocationIQ’s: a number typed digit by digit asks once', () => {
    expect(PAUSA_TELEFONO_MS).toBe(600);
    expect(PAUSA_TELEFONO_MS).toBeGreaterThan(PAUSA_MS);
  });
});

describe('the list as she types: the phone’s doors first, LocationIQ’s streets below', () => {
  const puerta = respuestasDelTelefono([PUERTA])[0];
  const calle = respuestasDelTelefono([{ ...PUERTA, numero: null }])[0];
  const deLocationiq = respuestasDe([CALLE, { ...CALLE, place_id: 'p', display_place: 'Privada Durango' }]);
  const liq: Resultado = { kind: 'respuestas', respuestas: deLocationiq };

  it('a door from the phone tops LocationIQ’s list', () => {
    const lista = conLasPuertas({ kind: 'respuestas', respuestas: [puerta] }, liq);
    expect(lista).toEqual({ kind: 'respuestas', respuestas: [puerta, ...deLocationiq] });
    expect(lista.kind === 'respuestas' && lista.respuestas[0].titulo).toBe('Calle Durango 220');
  });

  it('only the phone’s doors: a street from it adds nothing LocationIQ does not show', () => {
    expect(conLasPuertas({ kind: 'respuestas', respuestas: [calle] }, liq)).toBe(liq);
    expect(conLasPuertas({ kind: 'respuestas', respuestas: [calle, puerta] }, liq)).toEqual({ kind: 'respuestas', respuestas: [puerta, ...deLocationiq] });
  });

  it('no door from the phone — not asked, out, nothing found, failed — is LocationIQ’s list as before, its words too', () => {
    for (const telefono of [null, { kind: 'ninguna' }, { kind: 'falla' }, { kind: 'sin-senal' }] as const) {
      expect(conLasPuertas(telefono, liq)).toBe(liq);
      expect(conLasPuertas(telefono, { kind: 'ninguna' })).toEqual({ kind: 'ninguna' });
      expect(conLasPuertas(telefono, { kind: 'buscando' })).toEqual({ kind: 'buscando' });
      expect(conLasPuertas(telefono, { kind: 'nada' })).toEqual({ kind: 'nada' });
    }
  });

  it('the phone’s door stands alone when LocationIQ found nothing, failed or is still out', () => {
    for (const locationiq of [{ kind: 'ninguna' }, { kind: 'falla' }, { kind: 'sin-senal' }, { kind: 'buscando' }, { kind: 'nada' }] as const) {
      expect(conLasPuertas({ kind: 'respuestas', respuestas: [puerta] }, locationiq)).toEqual({ kind: 'respuestas', respuestas: [puerta] });
    }
  });

  it('a LocationIQ row that reads exactly as the phone’s door is dropped', () => {
    const twin = { ...puerta, id: 'liq-twin' };
    const lista = conLasPuertas({ kind: 'respuestas', respuestas: [puerta] }, { kind: 'respuestas', respuestas: [twin, ...deLocationiq] });
    expect(lista.kind === 'respuestas' && lista.respuestas.map((r) => r.id)).toEqual([puerta.id, ...deLocationiq.map((r) => r.id)]);
  });

  it('is what the box draws, with the phone asked on what she types and her colonia', () => {
    const map = code('ui/MapaPunto.tsx');
    expect(map).toMatch(/const puertas = usePuertas\(buscando \? texto : '', colonia\);/);
    expect(map).toMatch(/const calles = useSugerencias\(buscando \? texto : '', colonia\);/);
    expect(map).toMatch(/const sugerencias = conLasPuertas\(puertas, calles\);/);
    expect(map).toMatch(/<ListaDeSugerencias sugerencias=\{enviada !== null \? buscada : sugerencias\} onElegir=\{elegir\} \/>/);
    expect(code('lib/telefono.ts')).toMatch(/const ahora = preguntaConPuerta\(texto, colonia\);\s*const pregunta = useAsentado\(ahora, PAUSA_TELEFONO_MS\);/);
    // An answer always names the number in the box: none while she has typed on since.
    expect(code('lib/telefono.ts')).toMatch(/return ahora === null \|\| pregunta !== ahora \? null : \(data \?\? null\);/);
  });
});

// ⚠️⚠️ THE PHONE'S GEOCODER ASKS NOTHING OF HERS. The ruling: Cocina still asks no
// location permission and never reads her position. `expo-location`'s Android
// geocoder refuses without the permission (57.0.20), which is why the module is
// this app's own — and these lines hold it to the ruling, read out of the files,
// because no suite can compile the native code.
describe('the phone’s own geocoder asks for no permission and reads no position', () => {
  const APP = fileURLToPath(new URL('..', import.meta.url));
  const MOD = join(APP, 'modules', 'geocodificador');
  const kotlin = readFileSync(join(MOD, 'android/src/main/java/mx/wera/cocina/geocodificador/GeocodificadorModule.kt'), 'utf8');
  const swift = readFileSync(join(MOD, 'ios/GeocodificadorModule.swift'), 'utf8');
  const manifest = readFileSync(join(MOD, 'android/src/main/AndroidManifest.xml'), 'utf8');
  const appJson = JSON.parse(readFileSync(join(APP, 'app.json'), 'utf8')) as {
    expo: { android: { blockedPermissions: string[] }; ios: { infoPlist: Record<string, unknown> }; plugins: unknown[] };
  };
  const pkg = JSON.parse(readFileSync(join(APP, 'package.json'), 'utf8')) as { dependencies: Record<string, string> };
  const strip = (text: string) => text.replace(/^\s*\/\/.*$/gm, '').replace(/<!--[\s\S]*?-->/g, '');

  it('one name in the three files — a misspelt one is a build that silently never asks the phone', () => {
    expect(code('lib/telefono.ts')).toMatch(/requireOptionalNativeModule<Geocodificador>\('Geocodificador'\)/);
    expect(kotlin).toMatch(/Name\("Geocodificador"\)/);
    expect(swift).toMatch(/Name\("Geocodificador"\)/);
    const config = JSON.parse(readFileSync(join(MOD, 'expo-module.config.json'), 'utf8'));
    expect(config).toEqual({
      platforms: ['apple', 'android'],
      apple: { modules: ['GeocodificadorModule'] },
      android: { modules: ['mx.wera.cocina.geocodificador.GeocodificadorModule'] },
    });
  });

  it('only `@/lib/telefono` asks it, with the Valle’s box and five answers', () => {
    const askers = sources()
      .filter((path) => /Geocodificador|requireOptionalNativeModule/.test(readFileSync(path, 'utf8').replace(/^\s*\/\/.*$/gm, '')))
      .map((path) => path.slice(SRC.length + 1));
    expect(askers).toEqual(['lib/telefono.ts']);
    expect(code('lib/telefono.ts')).toMatch(/GEOCODIFICADOR\.buscar\(pregunta, CAJA_DEL_VALLE, RESPUESTAS_DEL_TELEFONO\)/);
    // Both of its whole questions — the map's opening and Buscar — ask the phone first,
    // through the one answer kept per question (`alTelefono`), as the list does (10.4e).
    expect((code('lib/telefono.ts').match(/primeroElTelefono\(\s*\(\) => alTelefono\(client, /g) ?? []).length).toBe(2);
    expect(code('lib/telefono.ts')).toMatch(/queryKey: telefonoKey\(pregunta\),\s*queryFn: \(\) => preguntarAlTelefono\(pregunta\),/);
    expect(code('lib/telefono.ts')).toMatch(/queryKey: telefonoKey\(pregunta\),\s*queryFn: \(\) => preguntarAlTelefono\(pregunta as string\),\s*enabled: pregunta !== null && GEOCODIFICADOR !== null,/);
    expect(code('ui/MapaPunto.tsx')).toMatch(/import \{ useApertura, useBuscar, usePuertas \} from '@\/lib\/telefono';/);
  });

  it('Android: Google’s geocoder, in Mexico’s Spanish, inside the box — no permission, no position', () => {
    expect(strip(manifest)).not.toMatch(/uses-permission/);
    expect(kotlin).toMatch(/Geocoder\(context, ESPANOL_DE_MEXICO\)/);
    expect(kotlin).toMatch(/Locale\.Builder\(\)\.setLanguage\("es"\)\.setRegion\("MX"\)\.build\(\)/);
    expect((kotlin.match(/getFromLocationName\(pregunta, limite, sur, oeste, norte, este/g) ?? []).length).toBe(2);
    expect(strip(kotlin)).not.toMatch(/LocationManager|FusedLocation|getLastLocation|requestLocationUpdates|ACCESS_(FINE|COARSE)_LOCATION|requestPermissions/);
  });

  it('iPhone: Apple’s geocoder, in Mexico’s Spanish — no permission, no position', () => {
    expect(swift).toMatch(/geocodeAddressString\(\s*pregunta, in: region, preferredLocale: Locale\(identifier: "es_MX"\)\)/);
    expect(strip(swift)).not.toMatch(/CLLocationManager|requestWhenInUseAuthorization|requestAlwaysAuthorization|startUpdatingLocation/);
  });

  it('the app still blocks every location permission, carries no location sentence and no expo-location', () => {
    for (const permission of ['ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION', 'ACCESS_BACKGROUND_LOCATION']) {
      expect(appJson.expo.android.blockedPermissions).toContain(`android.permission.${permission}`);
    }
    expect(Object.keys(appJson.expo.ios.infoPlist).filter((key) => /Location/i.test(key))).toEqual([]);
    expect(JSON.stringify(appJson.expo.plugins)).not.toMatch(/expo-location/);
    expect(Object.keys(pkg.dependencies)).not.toContain('expo-location');
  });
});
