import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { EMPTY_ADDRESS } from '@/api/place';
import {
  ANCHO_CALLE_METROS,
  ANCHO_ZONA_MAX_METROS,
  CREDITO_LOCATIONIQ_URL,
  CREDITO_OSM_URL,
  LIMITE_MS,
  LOCATIONIQ_AUTOCOMPLETE,
  MIN_LETRAS,
  PAUSA_MS,
  SUGERENCIAS,
  VALLE_DE_MEXICO,
  anchoPara,
  preguntaConColonia,
  preguntaDe,
  preguntaDeDireccion,
  respuestasDe,
  resultadoDe,
  sinNumero,
  tokenOf,
  urlDeBusqueda,
  type Respuesta,
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

// ⚠️⚠️ THE RULE THIS ROW EXISTS UNDER: what is stored is what she typed and where
// she tapped — never a provider's point or text (Apple's licence and Google's
// terms forbid keeping theirs). Read out of the files, because no suite can tap
// the map.
describe('an answer only moves the map; her tap is the pin', () => {
  const map = code('ui/MapaPunto.tsx');

  it('`onPin` is called once, from her tap, with the point the tap reports', () => {
    expect(map.match(/onPin\(/g)).toHaveLength(1);
    expect(map).toMatch(/const point = event\.nativeEvent\.coordinate;/);
    expect(map).toMatch(/const tap = tapOn\(point, now\);\s*if \(tap\.kind === 'place'\) onPin\(tap\.pin\);/);
  });

  it('an answer’s point reaches nothing but the map’s flight', () => {
    expect(map.match(/\.punto\b/g)).toHaveLength(1);
    expect(map).toMatch(/map\.current\?\.animateToRegion\(regionAround\(respuesta\.punto, anchoPara\(respuesta\)\), VOLAR_MS\)/);
  });

  it('a pick and the opening answer both go through that flight, and the opening one never after her finger', () => {
    expect(map).toMatch(/function elegir\(respuesta: Respuesta\) \{[\s\S]*?volarA\(respuesta\);\s*\}/);
    expect(map).toMatch(/if \(apertura !== null && listo && !tocado\.current\) volarA\(apertura\);/);
    expect(map).toMatch(/onTouchStart=\{\(\) => \{\s*tocado\.current = true;\s*\}\}/);
  });

  it('nothing in the data layer reads the search', () => {
    const api = sources(join(SRC, 'api')).map((path) => ({ path, text: readFileSync(path, 'utf8') }));
    expect(api.length).toBeGreaterThan(0);
    for (const file of api) expect(file.text, file.path).not.toMatch(/@\/lib\/(buscar|locationiq)|@\/ui\/Buscador/);
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
    expect((code('lib/locationiq.ts').match(/enabled: pregunta !== null && LOCATIONIQ_TOKEN !== null/g) ?? []).length).toBe(2);
  });

  it('keeps the keyboard while she picks — a tap on a suggestion chooses it', () => {
    expect(code('ui/Buscador.tsx')).toMatch(/keyboardShouldPersistTaps="handled"/);
  });
});
