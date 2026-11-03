import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { EMPTY_ADDRESS, type AddressForm } from '@/api/place';
import {
  ANCHO_CALLE_METROS,
  ANCHO_ZONA_MAX_METROS,
  CAMPOS_DE_DETALLES,
  DETALLES_URL,
  FIRMA_ANDROID,
  GEOCODING_URL,
  ID_DE_LA_APP,
  LIMITE_MS,
  MIN_LETRAS,
  PAUSA_MS,
  RECTANGULO,
  SUGERENCIAS_URL,
  ZONA_DE_BUSQUEDA,
  anchoPara,
  cabecerasDeLaApp,
  cajasDe,
  calleDeGeocoding,
  claveDe,
  cuerpoDeSugerencias,
  destinoDeGeocoding,
  lugarDe,
  otraCalle,
  preguntaConSuDireccion,
  preguntaDe,
  preguntaDeDireccion,
  sugerenciasDe,
  urlDeDetalles,
  urlDeGeocodificar,
  urlDeLaCalle,
  type Sugerencia,
} from '@/lib/google';
import { CLOSE_METRES } from '@/lib/mapa';
import { ES } from '@/strings';

// ============================================================================
// HER KITCHEN'S ADDRESS SEARCH, ON GOOGLE. Plan task `10.4g-i`, the owner's
// ruling of 2026-11-03 (LocationIQ's since `10.4c` and the phones' own since
// `10.4d` until then).
//
// ⚠️ WHAT ONLY A PHONE CAN SAY — that Google's map draws on an iPhone, that the
// suggestions draw over it, that a pick flies it, that the card reads well — is
// the `preview` build's (a map built on this Mac has no key and never moves).
// Here: every value sent to Google, every answer read back, her five boxes from
// Google's parts, the street the card compares, and the rule a careless edit could
// break unseen: AN ANSWER ONLY MOVES THE MAP, and the pin is the middle she put
// there herself.
//
// The answers below are shaped like Google's own (Places API (New), Geocoding),
// read on 2026-11-03 with the iPhone key — the streets and towns are real, the
// coordinates rounded.
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

const LUPE: AddressForm = { street: 'General Anaya', number: '17', colonia: 'San Bartolo Ameyalco', city: 'La Magdalena Contreras', postalCode: '10010' };

const SUGERENCIA: Sugerencia = {
  id: 'ChIJ-anaya-17',
  titulo: 'General Anaya 17',
  detalle: 'San Bartolo Ameyalco, La Magdalena Contreras, Ciudad de México, CDMX',
};

/** Places Autocomplete (New)'s answer: a place, then a query's own suggestion. */
const SUGERENCIAS = {
  suggestions: [
    {
      placePrediction: {
        place: 'places/ChIJ-anaya-17',
        placeId: 'ChIJ-anaya-17',
        text: { text: 'General Anaya 17, San Bartolo Ameyalco, La Magdalena Contreras, Ciudad de México, CDMX' },
        structuredFormat: {
          mainText: { text: 'General Anaya 17', matches: [{ endOffset: 16 }] },
          secondaryText: { text: 'San Bartolo Ameyalco, La Magdalena Contreras, Ciudad de México, CDMX' },
        },
        types: ['premise', 'geocode'],
      },
    },
    { queryPrediction: { text: { text: 'general anaya 17 restaurantes' } } },
  ],
};

const componente = (longText: string, ...types: string[]) => ({ longText, shortText: longText, types, languageCode: 'es' });

/** Place Details (New), Essentials, for the door above. */
const DETALLES = {
  id: 'ChIJ-anaya-17',
  location: { latitude: 19.3302, longitude: -99.2658 },
  viewport: { low: { latitude: 19.3289, longitude: -99.2671 }, high: { latitude: 19.3316, longitude: -99.2645 } },
  addressComponents: [
    componente('17', 'street_number'),
    componente('General Anaya', 'route'),
    componente('San Bartolo Ameyalco', 'sublocality_level_1', 'sublocality', 'political'),
    componente('Ciudad de México', 'locality', 'political'),
    componente('La Magdalena Contreras', 'administrative_area_level_3', 'political'),
    componente('Ciudad de México', 'administrative_area_level_1', 'political'),
    componente('México', 'country', 'political'),
    componente('10010', 'postal_code'),
  ],
};

const v3 = (long_name: string, ...types: string[]) => ({ long_name, short_name: long_name, types });

/** Geocoding's answer for her four parts. */
const GEOCODIFICADA = {
  status: 'OK',
  results: [
    {
      types: ['street_address'],
      formatted_address: 'General Anaya 17, San Bartolo Ameyalco, La Magdalena Contreras, 10010 Ciudad de México, CDMX, México',
      geometry: {
        location: { lat: 19.3302, lng: -99.2658 },
        location_type: 'ROOFTOP',
        viewport: { northeast: { lat: 19.3315, lng: -99.2645 }, southwest: { lat: 19.3289, lng: -99.2671 } },
      },
      address_components: [v3('17', 'street_number'), v3('General Anaya', 'route')],
    },
  ],
};

/** Geocoding's answer for the point under her pin: a door, then the street, then the colonia. */
const BAJO_EL_PIN = {
  status: 'OK',
  results: [
    { types: ['street_address'], address_components: [v3('17', 'street_number'), v3('General Anaya', 'route'), v3('San Bartolo Ameyalco', 'sublocality_level_1')] },
    { types: ['route'], address_components: [v3('Rosa Blanca', 'route')] },
    { types: ['sublocality_level_1', 'political'], address_components: [v3('San Bartolo Ameyalco', 'sublocality_level_1')] },
  ],
};

describe('the key', () => {
  it('is Google’s kind — AIza and 35 more — trimmed', () => {
    const clave = `AIza${'A1b2C3d4E5'.repeat(3)}x_-y5`;
    expect(clave).toHaveLength(39);
    expect(claveDe(` ${clave}\n`)).toBe(clave);
  });

  it('or none — the build’s placeholder, nothing, a value put in the wrong variable — and then no box is drawn', () => {
    expect(claveDe('sin-clave')).toBeNull();
    expect(claveDe(undefined)).toBeNull();
    expect(claveDe(null)).toBeNull();
    expect(claveDe('')).toBeNull();
    expect(claveDe('AIza')).toBeNull();
    expect(claveDe('pk.abc123')).toBeNull(); // LocationIQ's, before 10.4g-i
    expect(claveDe(`AIza${'x'.repeat(36)}`)).toBeNull();
    expect(claveDe(42)).toBeNull();
  });

  it('is sent with the app’s own name: the bundle id on an iPhone, the package and a fingerprint the key accepts on Android', () => {
    const appJson = JSON.parse(readFileSync(new URL('../app.json', import.meta.url), 'utf8')).expo;
    expect(ID_DE_LA_APP).toBe(appJson.ios.bundleIdentifier);
    expect(ID_DE_LA_APP).toBe(appJson.android.package);
    expect(cabecerasDeLaApp('ios')).toEqual({ 'X-Ios-Bundle-Identifier': 'mx.wera.cocina' });
    expect(cabecerasDeLaApp('android')).toEqual({ 'X-Android-Package': 'mx.wera.cocina', 'X-Android-Cert': FIRMA_ANDROID });
    // Expo's test-build fingerprint, as the handbook lists it for the key (step 10), without its colons.
    expect(FIRMA_ANDROID).toBe('4C:38:47:6F:5A:81:5C:5F:D5:7C:65:9F:17:B3:33:1E:CD:77:F1:D0'.replaceAll(':', ''));
  });

  it('reaches the search only from the config, each phone its own', () => {
    const hooks = code('lib/useGoogle.ts');
    expect(hooks).toMatch(/Constants\.expoConfig\?\.extra/);
    expect(hooks).toMatch(/export const CLAVE: string \| null = claveDe\(Platform\.OS === 'ios' \? CLAVES\.ios : CLAVES\.android\);/);
    expect(hooks).toMatch(/const APP = cabecerasDeLaApp\(Platform\.OS\);/);
    expect(hooks).not.toMatch(/process\.env/);
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

  it('after she pauses, and given up after eight seconds — a late suggestion is no use', () => {
    expect(PAUSA_MS).toBe(450);
    expect(LIMITE_MS).toBe(8_000);
  });

  it('the suggestions: Mexico’s Spanish, Mexico only, inside the zone, in her session', () => {
    expect(SUGERENCIAS_URL).toBe('https://places.googleapis.com/v1/places:autocomplete');
    expect(cuerpoDeSugerencias('General Anaya 17, San Bartolo Ameyalco', 'sesion-1')).toEqual({
      input: 'General Anaya 17, San Bartolo Ameyalco',
      languageCode: 'es-MX',
      regionCode: 'mx',
      includedRegionCodes: ['mx'],
      locationRestriction: { rectangle: { low: { latitude: 18.36, longitude: -100.62 }, high: { latitude: 20.29, longitude: -98.59 } } },
      sessionToken: 'sesion-1',
    });
  });

  // ⚠️ A session ended by Essentials bills its first 12 requests and nothing after;
  // a field of a dearer tier bills it all at that tier.
  it('her pick’s details: Essentials’ fields alone, in the same session', () => {
    expect(CAMPOS_DE_DETALLES).toBe('id,location,viewport,addressComponents');
    const url = new URL(urlDeDetalles('ChIJ/anaya 17', 'sesion-1'));
    expect(`${url.origin}${url.pathname}`).toBe(`${DETALLES_URL}ChIJ%2Fanaya%2017`);
    expect(Object.fromEntries(url.searchParams)).toEqual({ languageCode: 'es-MX', regionCode: 'mx', sessionToken: 'sesion-1' });
  });

  it('Geocoding: the generally available one, in Spanish, Mexico only, leaning on the zone', () => {
    expect(GEOCODING_URL).toBe('https://maps.googleapis.com/maps/api/geocode/json');
    const url = new URL(urlDeGeocodificar('Niños Héroes 5 & Cía, Centro', 'AIza-clave'));
    expect(`${url.origin}${url.pathname}`).toBe(GEOCODING_URL);
    expect(Object.fromEntries(url.searchParams)).toEqual({
      address: 'Niños Héroes 5 & Cía, Centro',
      language: 'es',
      region: 'mx',
      components: 'country:MX',
      bounds: '18.36,-100.62|20.29,-98.59',
      key: 'AIza-clave',
    });
  });

  it('the point under her pin, at the six decimals her pin is kept at', () => {
    const url = new URL(urlDeLaCalle({ latitude: 19.33021234, longitude: -99.2658 }, 'AIza-clave'));
    expect(Object.fromEntries(url.searchParams)).toEqual({ latlng: '19.330212,-99.265800', language: 'es', key: 'AIza-clave' });
  });

  // min_lon,min_lat,max_lon,max_lat. 10.4f, the owner's ruling of 2026-11-02: Mexico City and the
  // State of Mexico (until then the Valle de México alone). Without a bound, a Milpa Alta street's
  // first suggestion came from another state, 344 km away (measured 2026-10-31).
  describe('the search’s zone: Mexico City and the State of Mexico', () => {
    const [minLon, minLat, maxLon, maxLat] = ZONA_DE_BUSQUEDA.split(',').map(Number);
    const dentro = (lat: number, lon: number) => lat > minLat && lat < maxLat && lon > minLon && lon < maxLon;
    const dms = (g: number, m: number, s: number) => g + m / 60 + s / 3600;

    it('holds INEGI’s extremes of the State of Mexico, a hundredth of a degree to spare (cuadro 1.1, 2021)', () => {
      expect(ZONA_DE_BUSQUEDA).toBe('-100.62,18.36,-98.59,20.29');
      expect(maxLat).toBeGreaterThan(dms(20, 17, 9));
      expect(minLat).toBeLessThan(dms(18, 22, 1));
      expect(maxLon).toBeGreaterThan(-dms(98, 35, 49));
      expect(minLon).toBeLessThan(-dms(100, 36, 47));
      expect(maxLat - dms(20, 17, 9)).toBeLessThan(0.02);
      expect(dms(18, 22, 1) - minLat).toBeLessThan(0.02);
    });

    it('is the rectangle Google’s suggestions are kept inside', () => {
      expect(RECTANGULO).toEqual({ low: { latitude: minLat, longitude: minLon }, high: { latitude: maxLat, longitude: maxLon } });
    });

    it('and Mexico City whole — INEGI’s extremes of it too', () => {
      expect(dentro(dms(19, 36, 0), -99.2)).toBe(true); // its north
      expect(dentro(dms(19, 3, 0), -99.1)).toBe(true); // its south
      expect(dentro(19.4, -dms(98, 57, 0))).toBe(true); // its east
      expect(dentro(19.4, -dms(99, 22, 0))).toBe(true); // its west
      expect(dentro(19.4326, -99.1332)).toBe(true); // the Zócalo
    });

    it('the State of Mexico’s towns are in it', () => {
      for (const [lat, lon] of [
        [19.2826, -99.6557], // Toluca
        [19.1951, -100.1309], // Valle de Bravo
        [19.8, -99.8742], // Atlacomulco
        [18.6836, -100.1861], // Amatepec
        [19.7969, -99.0997], // Zumpango
      ]) {
        expect(dentro(lat, lon)).toBe(true);
      }
    });

    it('the other states’ cities are out of it', () => {
      for (const [lat, lon] of [
        [20.6597, -103.3496], // Guadalajara
        [25.6866, -100.3161], // Monterrey
        [19.0414, -98.2063], // Puebla
        [20.5888, -100.3899], // Querétaro
        [19.3182, -98.2375], // Tlaxcala
      ]) {
        expect(dentro(lat, lon)).toBe(false);
      }
    });

    // A rectangle: the honest cost of not drawing the state's outline.
    it('a box, so the edges of the states around come with it', () => {
      expect(dentro(20.1011, -98.7591)).toBe(true); // Pachuca, Hidalgo
      expect(dentro(18.9242, -99.2216)).toBe(true); // Cuernavaca, Morelos
    });

    // A fonda elsewhere must not read her own address as wrong.
    it('and when nothing is found, the box says where it looked', () => {
      expect(ES.mapa.ninguna).toBe(
        'No encontramos esa calle en la Ciudad de México ni en el Estado de México. Escríbela de otra forma, o busca tu cocina en el mapa.',
      );
    });
  });
});

// ⚠️ MEASURED 2026-11-03: without her colonia, hers was among Google's five
// suggestions for 3 to 5 of the twenty addresses; with her colonia and alcaldía,
// 11 to 14 — and the first row on her block for 12.
describe('the colonia and city she gave', () => {
  it('are added from her form when she typed none', () => {
    expect(preguntaConSuDireccion('General Anaya 17', { colonia: ' San Bartolo  Ameyalco ', city: ' La Magdalena Contreras ' })).toBe(
      'General Anaya 17, San Bartolo Ameyalco, La Magdalena Contreras',
    );
  });

  // 10.4f, measured 2026-11-02: most of the State of Mexico's town centres have no colonia, and
  // across a state a street and number alone name a dozen towns — the city decides it.
  it('a town with no colonia: her city alone', () => {
    expect(preguntaConSuDireccion('Constitución 11', { colonia: '', city: 'Coyotepec' })).toBe('Constitución 11, Coyotepec');
  });

  it('what she typed is left alone when she typed a comma herself, or gave no form', () => {
    expect(preguntaConSuDireccion('Durango 220, Condesa', { colonia: 'Roma Norte', city: 'Cuauhtémoc' })).toBe('Durango 220, Condesa');
    expect(preguntaConSuDireccion('Durango 220', null)).toBe('Durango 220');
    expect(preguntaConSuDireccion('Durango 220', { colonia: '  ', city: '' })).toBe('Durango 220');
    expect(preguntaConSuDireccion('Du', { colonia: 'Roma Norte', city: 'Cuauhtémoc' })).toBeNull();
  });
});

describe('the map opens near her kitchen: the address she typed, asked once', () => {
  const lupe = { ...LUPE, street: ' General  Anaya ' };

  it('street and number, colonia, city, postcode — as she wrote them, as measured', () => {
    expect(preguntaDeDireccion(lupe)).toBe('General Anaya 17, San Bartolo Ameyalco, La Magdalena Contreras, 10010');
  });

  it('the colonia may be empty, as the form allows', () => {
    expect(preguntaDeDireccion({ ...lupe, colonia: '  ' })).toBe('General Anaya 17, La Magdalena Contreras, 10010');
  });

  it('nothing is asked while the address is not whole — the map stays on the city', () => {
    expect(preguntaDeDireccion(EMPTY_ADDRESS)).toBeNull();
    expect(preguntaDeDireccion({ ...lupe, number: '' })).toBeNull();
    expect(preguntaDeDireccion({ ...lupe, postalCode: '6700' })).toBeNull();
  });
});

describe('what Google suggests, read', () => {
  it('a place: its first line and its second, under its id', () => {
    expect(sugerenciasDe(200, SUGERENCIAS)).toEqual({ kind: 'sugerencias', sugerencias: [SUGERENCIA] });
  });

  it('a query’s own suggestion is no address, and a malformed row is skipped, never shown', () => {
    const body = {
      suggestions: [
        { queryPrediction: { text: { text: 'tacos' } } },
        { placePrediction: { placeId: '', structuredFormat: { mainText: { text: 'Sin id' } } } },
        { placePrediction: { placeId: 'ChIJ-x' } },
        null,
        { placePrediction: { placeId: 'ChIJ-y', text: { text: 'Morelos 2, San Antonio Culhuacán' } } },
      ],
    };
    expect(sugerenciasDe(200, body)).toEqual({
      kind: 'sugerencias',
      sugerencias: [{ id: 'ChIJ-y', titulo: 'Morelos 2, San Antonio Culhuacán', detalle: '' }],
    });
  });

  // Places (New) says "nothing" with a 200 and no list — not LocationIQ's 404.
  it('nothing found is a 200 with no list; a refused key or his project’s limit is a failure', () => {
    expect(sugerenciasDe(200, {})).toEqual({ kind: 'ninguna' });
    expect(sugerenciasDe(200, { suggestions: [] })).toEqual({ kind: 'ninguna' });
    expect(sugerenciasDe(200, null)).toEqual({ kind: 'ninguna' });
    expect(sugerenciasDe(403, { error: { status: 'PERMISSION_DENIED' } })).toEqual({ kind: 'falla' });
    expect(sugerenciasDe(429, { error: { status: 'RESOURCE_EXHAUSTED' } })).toEqual({ kind: 'falla' });
    expect(sugerenciasDe(400, {})).toEqual({ kind: 'falla' });
  });
});

describe('her pick: where the map flies, and her five boxes', () => {
  it('a door: block level, and the five boxes she would have typed — Mexico City’s alcaldía', () => {
    const lugar = lugarDe(200, DETALLES, SUGERENCIA, EMPTY_ADDRESS);
    expect(lugar).toEqual({
      punto: { latitude: 19.3302, longitude: -99.2658 },
      conNumero: true,
      anchoMetros: expect.any(Number),
      direccion: LUPE,
    });
    expect(anchoPara(lugar!)).toBe(CLOSE_METRES);
  });

  it('a street with no number: about five blocks at least, and her number kept', () => {
    const calle = { ...DETALLES, addressComponents: DETALLES.addressComponents.filter((c) => !c.types.includes('street_number')) };
    const lugar = lugarDe(200, calle, SUGERENCIA, { ...EMPTY_ADDRESS, number: '17-B' })!;
    expect(lugar.conNumero).toBe(false);
    expect(lugar.direccion.number).toBe('17-B');
    expect(anchoPara(lugar)).toBe(ANCHO_CALLE_METROS);
  });

  it('outside the zone, without a point, or refused: nothing — the map stays where it is', () => {
    expect(lugarDe(200, { ...DETALLES, location: { latitude: 20.6597, longitude: -103.3496 } }, SUGERENCIA, EMPTY_ADDRESS)).toBeNull();
    expect(lugarDe(200, { ...DETALLES, location: undefined }, SUGERENCIA, EMPTY_ADDRESS)).toBeNull();
    expect(lugarDe(200, { ...DETALLES, location: { latitude: '19.33', longitude: -99.26 } }, SUGERENCIA, EMPTY_ADDRESS)).toBeNull();
    expect(lugarDe(403, DETALLES, SUGERENCIA, EMPTY_ADDRESS)).toBeNull();
  });

  // Read off Google's answers on 2026-11-03, five State of Mexico towns.
  describe('the State of Mexico’s municipality', () => {
    it('is Google’s locality — Tepetlixpa, Toluca de Lerdo', () => {
      const tepetlixpa = [
        componente('5', 'street_number'),
        componente('Hidalgo', 'route'),
        componente('031', 'sublocality_level_3', 'sublocality', 'political'),
        componente('Tepetlixpa', 'locality', 'political'),
        componente('Estado de México', 'administrative_area_level_1', 'political'),
        componente('56880', 'postal_code'),
      ];
      expect(cajasDe(tepetlixpa, 'MZ 031, Tepetlixpa, Méx.', EMPTY_ADDRESS)).toEqual({
        street: 'Hidalgo',
        number: '5',
        colonia: '',
        city: 'Tepetlixpa',
        postalCode: '56880',
      });
    });

    it('but where Google puts the colonia there too, the town of the suggestion’s second line — Texcoco', () => {
      const texcoco = [
        componente('10', 'street_number'),
        componente('Calle Fray Pedro de Gante', 'route'),
        componente('020', 'sublocality_level_3', 'sublocality', 'political'),
        componente('Centro', 'sublocality_level_1', 'sublocality', 'political'),
        componente('Centro', 'locality', 'political'),
        componente('Estado de México', 'administrative_area_level_1', 'political'),
        componente('56100', 'postal_code'),
      ];
      expect(cajasDe(texcoco, 'MZ 020, Centro, Texcoco de Mora, Méx.', EMPTY_ADDRESS)).toEqual({
        street: 'Calle Fray Pedro de Gante',
        number: '10',
        colonia: 'Centro',
        city: 'Texcoco de Mora',
        postalCode: '56100',
      });
    });

    it('and none at all keeps the city she typed — Chalco’s pueblo is its colonia twice', () => {
      const chalco = [
        componente('15', 'street_number'),
        componente('Calle Morelos', 'route'),
        componente('Santa Maria Huexoculco', 'sublocality_level_1', 'sublocality', 'political'),
        componente('Santa María Huexoculco', 'locality', 'political'),
        componente('Estado de México', 'administrative_area_level_1', 'political'),
        componente('56646', 'postal_code'),
      ];
      const cajas = cajasDe(chalco, 'MZ 007, Santa Maria Huexoculco, Santa María Huexoculco, Méx.', { ...EMPTY_ADDRESS, city: 'Chalco' });
      expect(cajas.city).toBe('Chalco');
      expect(cajas.colonia).toBe('Santa Maria Huexoculco');
    });
  });

  it('a part Google does not name keeps what she typed; a postcode that is not five digits is none', () => {
    const pocas = [componente('Unnamed Road', 'route'), componente('1001', 'postal_code')];
    expect(cajasDe(pocas, '', LUPE)).toEqual(LUPE);
    expect(cajasDe('nada', '', LUPE)).toEqual(LUPE);
  });
});

describe('what Geocoding answers, read', () => {
  it('her door: the first answer inside the zone, at block level', () => {
    const r = destinoDeGeocoding(200, GEOCODIFICADA);
    expect(r).toEqual({ kind: 'destino', destino: { punto: { latitude: 19.3302, longitude: -99.2658 }, conNumero: true, anchoMetros: expect.any(Number) } });
    if (r.kind === 'destino') expect(anchoPara(r.destino)).toBe(CLOSE_METRES);
  });

  it('a street: as wide as the stretch it found, five blocks at least, never a whole alcaldía', () => {
    const calle = (sw: number, ne: number) => ({
      status: 'OK',
      results: [{ types: ['route'], geometry: { location: { lat: 19.33, lng: -99.26 }, viewport: { southwest: { lat: sw, lng: -99.26 }, northeast: { lat: ne, lng: -99.26 } } } }],
    });
    const ancho = (body: unknown) => {
      const r = destinoDeGeocoding(200, body);
      return r.kind === 'destino' ? anchoPara(r.destino) : null;
    };
    expect(ancho(calle(19.3299, 19.3301))).toBe(ANCHO_CALLE_METROS);
    expect(ancho(calle(19.325, 19.335))).toBeCloseTo(1113.2, 0);
    expect(ancho(calle(19.2, 19.5))).toBe(ANCHO_ZONA_MAX_METROS);
  });

  it('an answer outside the zone is dropped — Geocoding only leans on it', () => {
    const fuera = { location: { lat: 20.6597, lng: -103.3496 } };
    expect(destinoDeGeocoding(200, { status: 'OK', results: [{ geometry: fuera }] })).toEqual({ kind: 'ninguna' });
    expect(destinoDeGeocoding(200, { status: 'OK', results: [{ geometry: fuera }, GEOCODIFICADA.results[0]] }).kind).toBe('destino');
  });

  // Geocoding answers every question with a 200, and says how it went in `status`.
  it('ZERO_RESULTS is nothing found; a limit, a refused key or anything else is a failure', () => {
    expect(destinoDeGeocoding(200, { status: 'ZERO_RESULTS', results: [] })).toEqual({ kind: 'ninguna' });
    expect(destinoDeGeocoding(200, { status: 'OVER_QUERY_LIMIT' })).toEqual({ kind: 'falla' });
    expect(destinoDeGeocoding(200, { status: 'REQUEST_DENIED', error_message: 'This IP, site or mobile application is not authorized' })).toEqual({ kind: 'falla' });
    expect(destinoDeGeocoding(200, null)).toEqual({ kind: 'falla' });
    expect(destinoDeGeocoding(500, GEOCODIFICADA)).toEqual({ kind: 'falla' });
  });
});

describe('the street Google names under her pin', () => {
  it('is its first door’s street — not the street of an answer after it', () => {
    expect(calleDeGeocoding(200, BAJO_EL_PIN)).toBe('General Anaya');
    const sinPuerta = { status: 'OK', results: BAJO_EL_PIN.results.slice(1) };
    expect(calleDeGeocoding(200, sinPuerta)).toBe('Rosa Blanca');
  });

  it('or none: no street named, Google’s nameless road, nothing found, a failure', () => {
    expect(calleDeGeocoding(200, { status: 'OK', results: [BAJO_EL_PIN.results[2]] })).toBeNull();
    expect(calleDeGeocoding(200, { status: 'OK', results: [{ types: ['route'], address_components: [v3('Unnamed Road', 'route')] }] })).toBeNull();
    expect(calleDeGeocoding(200, { status: 'ZERO_RESULTS', results: [] })).toBeNull();
    expect(calleDeGeocoding(200, { status: 'OVER_QUERY_LIMIT' })).toBeNull();
    expect(calleDeGeocoding(403, BAJO_EL_PIN)).toBeNull();
  });
});

// ⚠️ THE CARD WARNS ONLY WHEN GOOGLE NAMES ANOTHER STREET (his ruling of 2026-11-03).
// The pairs are the twenty recorded doors as she typed her street and as Google
// named the street there (Geocoding, 2026-11-03): 14 hers, 6 another — 1 of them
// among the 12 whose recorded point is trusted (*Rey Yupanqui*).
describe('the card’s warning: her street, and the one Google names under her pin', () => {
  const SUYAS: readonly [string, string][] = [
    ['General Anaya', 'General Anaya'],
    ['Morelos', 'Calle Morelos'],
    ['Miguel Hidalgo', 'Miguel Hidalgo'],
    ['Canal del Norte', 'Canal del Norte'],
    ['Calle 30', 'Calle 30'],
    ['Cedral', 'Avenida Cedral'],
    ['Poniente 110', 'Poniente 110'],
    ['Lucio Blanco', 'Calzada Lucio Blanco'],
    ['Calle Lago Colhue', 'Cerrada Lago Colhue'],
    ['Cerrada de la Cruz', 'Cerrada la Cruz'],
    ['Calle 6', 'Calle 6'],
    ['Tulipanes', 'Calle Tulipanes'],
    ['Calzada México Tacuba', 'Calzada México-Tacuba'],
    ['San Marcos', 'Calle San Marcos'],
  ];
  const OTRAS: readonly [string, string][] = [
    ['Yobain', 'Chilpa'],
    ['Minas Zoyopan', 'Mina Etzalan'],
    ['Rey Yupanqui', 'David R. Scott'],
    ['Nogal', 'Atzayacatl'],
    ['Higueras', 'Camino Real'],
    ['Ignacio Molina', 'Avenida 414-A'],
  ];

  it('the measured twenty: her street at fourteen, another at six', () => {
    expect(SUYAS.filter(([suya, deGoogle]) => otraCalle(suya, deGoogle))).toEqual([]);
    expect(OTRAS.filter(([suya, deGoogle]) => !otraCalle(suya, deGoogle))).toEqual([]);
  });

  it('a kind of street written short or left out is the same street, and accents and case do not count', () => {
    expect(otraCalle('Av. Gustavo Baz', 'Avenida Doctor Gustavo Baz')).toBe(false);
    expect(otraCalle('Gral. Anaya', 'General Anaya')).toBe(false);
    expect(otraCalle('Cda. de la Cruz', 'Cerrada de la Cruz')).toBe(false);
    expect(otraCalle('pte. 110', 'Poniente 110')).toBe(false);
    expect(otraCalle('yobaín', 'Yobain')).toBe(false);
    expect(otraCalle('Reforma', 'Paseo de la Reforma')).toBe(false);
  });

  it('but a number or a direction is never dropped: Calle 6 is not Calle 16, Poniente 110 is not Oriente 110', () => {
    expect(otraCalle('Calle 6', 'Calle 16')).toBe(true);
    expect(otraCalle('Calle 6', '16 de Septiembre')).toBe(true);
    expect(otraCalle('Poniente 110', 'Oriente 110')).toBe(true);
    expect(otraCalle('Sur 12', 'Sur 128')).toBe(true);
  });

  it('no warning when Google names no street, or either name is only a kind of street', () => {
    expect(otraCalle('General Anaya', null)).toBe(false);
    expect(otraCalle('Calle', 'Rosa Blanca')).toBe(false);
    expect(otraCalle('General Anaya', 'Avenida')).toBe(false);
    expect(otraCalle('', 'Rosa Blanca')).toBe(false);
  });

  it('says her address, and Google’s street only to warn — never as hers', () => {
    expect(ES.mapa.suDireccion('General Anaya 17, San Bartolo Ameyalco')).toBe('Tu dirección: General Anaya 17, San Bartolo Ameyalco');
    expect(ES.mapa.otraCalle('David R. Scott', 'Rey Yupanqui')).toBe(
      'El pin parece estar en David R. Scott, no en Rey Yupanqui. Mueve el mapa hasta tu puerta.',
    );
  });
});

// ⚠️⚠️ THE RULE A CARELESS EDIT COULD BREAK UNSEEN. What is stored is what she
// typed and her pin — never Google's point or what it names (its terms forbid
// keeping them). Since `10.4e` (the owner's ruling of 2026-11-02, as Uber does
// it) her pin is the middle of the map, and only once her own hand put it there:
// after a flight to an answer, no pin until she moves the map. The sequences are
// `test/mapa.test.ts`'s (`alLlegar`); here, read out of the file, that the map is
// wired to them — no suite can move the map.
describe('an answer only moves the map; her pin is the middle she put there herself', () => {
  const map = code('ui/MapaPunto.tsx');

  it('`onPin` hears the middle only through the rule, each time the map settles — and null as a flight leaves', () => {
    expect(map.match(/onPin\(/g)).toHaveLength(2);
    expect(map).toMatch(/const suyo = pinDelCentro\(centro\.current, next, pin\);\s*if \(suyo !== pin\) onPin\(suyo\);/);
    expect(map).toMatch(
      /function volarA\(destino: Destino\) \{\s*tocado\.current = true;\s*centro\.current = haciaUnPunto\(centro\.current, destino\.punto, 'otro', Date\.now\(\)\);\s*onPin\(null\);/,
    );
  });

  it('an answer’s point reaches nothing but the map’s flight, marked as not hers', () => {
    expect(map.match(/\.punto\b/g)).toHaveLength(2);
    expect(map).toMatch(/map\.current\?\.animateToRegion\(regionAround\(destino\.punto, anchoPara\(destino\)\), VOLAR_MS\)/);
    // Only her tap's point is sent on her behalf.
    expect(map.match(/'ella'/g)).toHaveLength(1);
    expect(map).toMatch(/haciaUnPunto\(centro\.current, point, 'ella', Date\.now\(\)\)/);
    expect(map).toMatch(/const point = event\.nativeEvent\.coordinate;/);
  });

  it('a pick, the opening answer and Buscar’s all go through that flight, and the opening one never after her finger', () => {
    expect(map).toMatch(/async function elegir\(sugerencia: Sugerencia\) \{[\s\S]*?volarA\(lugar\);\s*\}/);
    expect(map).toMatch(/if \(apertura !== null && listo && !tocado\.current\) volarA\(apertura\);/);
    expect(map).toMatch(/onTouchStart=\{\(\) => \{\s*tocado\.current = true;\s*\}\}/);
    expect(map).toMatch(/const buscada = useBuscar\(enviada\);/);
    expect(map).toMatch(/if \(buscada\.kind !== 'destino'\) return;[\s\S]*?volarA\(buscada\.destino\);/);
    expect(map.match(/volarA\(/g)).toHaveLength(4); // its definition and the three above
  });

  it('on the map a pick only moves it: her five boxes are the form’s, never touched here', () => {
    expect(map).not.toMatch(/lugar\.direccion|onCambio|direccion\s*=/);
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
    for (const file of api) expect(file.text, file.path).not.toMatch(/@\/lib\/(google|useGoogle)|@\/ui\/Buscador/);
  });

  it('the card names her address, and Google’s street only to warn — shown in the map and handed to nobody', () => {
    expect(map).toMatch(/const linea = lineaDeSuDireccion\(direccion\);/);
    expect(map).toMatch(/const bajoElPin = useCalleBajoElPin\(pin, suCalle\);/);
    expect(map).toMatch(/const aviso = pin !== null && suCalle !== null && otraCalle\(suCalle, bajoElPin\) \? bajoElPin : null;/);
    expect(map).toMatch(/\{ES\.mapa\.suDireccion\(linea\)\}/);
    expect(map).toMatch(/\{aviso !== null && suCalle !== null \? \(\s*<Text[^>]*>\s*\{ES\.mapa\.otraCalle\(aviso, suCalle\)\}/);
    const elsewhere = sources()
      .filter((path) => !/(ui[/\\]MapaPunto\.tsx|lib[/\\]useGoogle\.ts|lib[/\\]google\.ts)$/.test(path))
      .filter((path) => /useCalleBajoElPin|calleEn\(|calleDeGeocoding/.test(readFileSync(path, 'utf8')));
    expect(elsewhere).toEqual([]);
  });

  // ⚠️ `addressForCoordinate` is Apple's geocoder on an iPhone whatever the map
  // (react-native-maps 1.27.2): Apple's answers may not be shown on Google's map.
  it('asks the phone’s own maps for nothing', () => {
    const askers = sources().filter((path) => /addressForCoordinate/.test(code(path.slice(SRC.length + 1))));
    expect(askers).toEqual([]);
  });
});

describe('Google’s map on both phones, and Google’s credit', () => {
  it('both maps are Google’s, on an iPhone too — its terms keep its search off any other map', () => {
    for (const file of ['ui/MapaPunto.tsx', 'ui/MapaFijo.tsx']) {
      expect(code(file), file).toMatch(/provider=\{PROVIDER_GOOGLE\}/);
      expect(code(file), file).toMatch(/mapType=\{TIPO_DE_MAPA\}/);
    }
    const maps = sources().filter((path) => /<MapView\b/.test(readFileSync(path, 'utf8')));
    expect(maps.map((path) => path.slice(SRC.length + 1)).sort()).toEqual(['ui/MapaFijo.tsx', 'ui/MapaPunto.tsx']);
  });

  it('the box is drawn only on a build that carries this phone’s key', () => {
    expect(code('ui/MapaPunto.tsx')).toMatch(/\{CLAVE !== null && \(\s*<CampoDeBusqueda/);
    for (const hook of ['useSugerencias', 'useApertura', 'useBuscar']) {
      expect(code('lib/useGoogle.ts'), hook).toMatch(new RegExp(`export function ${hook}\\([\\s\\S]*?enabled: pregunta !== null && CLAVE !== null,`));
    }
  });

  it('carries Google’s words at the foot of the suggestions’ own box, untranslated, on one line', () => {
    expect(ES.mapa.creditoGoogle).toBe('Google Maps');
    const box = code('ui/Buscador.tsx');
    expect(box).toMatch(/<\/ScrollView>\s*<CreditoDeGoogle \/>/);
    expect(box).toMatch(/numberOfLines=\{1\}[\s\S]*?\{ES\.mapa\.creditoGoogle\}/);
    expect(box).toMatch(/fontSize: 12,/);
    expect(box).not.toMatch(/LocationIQ|OpenStreetMap|Linking/);
  });

  it('the keyboard’s Buscar key asks for what she typed, with her colonia and city', () => {
    expect(code('ui/Buscador.tsx')).toMatch(/onSubmitEditing=\{onBuscar\}/);
    expect(code('ui/Buscador.tsx')).toMatch(/returnKeyType="search"/);
    expect(code('ui/MapaPunto.tsx')).toMatch(/function buscar\(\) \{\s*const pregunta = preguntaConSuDireccion\(texto, direccion\);\s*if \(pregunta !== null\) setEnviada\(pregunta\);/);
    expect(code('ui/MapaPunto.tsx')).toMatch(/onBuscar=\{buscar\}/);
  });

  it('keeps the keyboard while she picks — a tap on a suggestion chooses it', () => {
    expect(code('ui/Buscador.tsx')).toMatch(/keyboardShouldPersistTaps="handled"/);
  });
});

// ⚠️ ONE SESSION PER SEARCH: the suggestions of one search share a token and her
// pick's details end it — at most its first 12 requests billed (read 2026-11-02).
describe('one session per search', () => {
  const hooks = code('lib/useGoogle.ts');
  const map = code('ui/MapaPunto.tsx');

  it('a token made at the search’s first question, and dropped when it ends', () => {
    expect(hooks).toMatch(/token: \(\) => \(token\.current \?\?= newId\(\)\),/);
    expect(hooks).toMatch(/cerrar: \(\) => \{\s*token\.current = null;\s*\},/);
  });

  it('every suggestion carries it, and her pick’s details carry the same, then end it', () => {
    expect(hooks).toMatch(/queryFn: \(\{ signal \}\) => sugerir\(pregunta as string, sesion\.token\(\), signal\),/);
    expect(map).toMatch(/const lugar = await detallar\(sugerencia, sesion\.token\(\), direccion \?\? EMPTY_ADDRESS\);\s*sesion\.cerrar\(\);/);
    expect(hooks).toMatch(/'X-Goog-FieldMask': CAMPOS_DE_DETALLES/);
  });
});

// ============================================================================
// THE PHONE'S OWN GEOCODER — `10.4d`, the owner's ruling of 2026-11-01 — STAYS IN
// THE BUILD, ASKED BY NOTHING since `10.4g-i`: its answers were Apple's on an
// iPhone, which may not be shown on Google's map. Removing it is a native change,
// so it waits for a build that has another reason. These lines still hold it to
// the ruling that made it — no location permission, no position — read out of the
// files, because no suite can compile the native code.
// ============================================================================
describe('the phone’s own geocoder is asked by nothing, and still asks for no permission', () => {
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

  it('nothing in the app asks it', () => {
    const askers = sources().filter((path) => /Geocodificador|requireOptionalNativeModule/.test(code(path.slice(SRC.length + 1))));
    expect(askers).toEqual([]);
  });

  it('it is still the one module, under its one name', () => {
    expect(kotlin).toMatch(/Name\("Geocodificador"\)/);
    expect(swift).toMatch(/Name\("Geocodificador"\)/);
    const config = JSON.parse(readFileSync(join(MOD, 'expo-module.config.json'), 'utf8'));
    expect(config).toEqual({
      platforms: ['apple', 'android'],
      apple: { modules: ['GeocodificadorModule'] },
      android: { modules: ['mx.wera.cocina.geocodificador.GeocodificadorModule'] },
    });
  });

  it('Android: no permission, no position', () => {
    expect(strip(manifest)).not.toMatch(/uses-permission/);
    expect(strip(kotlin)).not.toMatch(/LocationManager|FusedLocation|getLastLocation|requestLocationUpdates|ACCESS_(FINE|COARSE)_LOCATION|requestPermissions/);
  });

  it('iPhone: no permission, no position', () => {
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
