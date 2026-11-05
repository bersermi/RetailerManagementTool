import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { distanciaTexto, metrosEntre } from '@/lib/distancia';
import {
  FIRMA_ANDROID,
  GEOCODING_URL,
  ID_DE_LA_APP,
  cabecerasDeLaApp,
  claveDe,
  codigoPostalDe,
  preguntaDeSuDireccion,
  respuestaDeGeocoding,
  urlDeGeocodificar,
  urlDelCodigoPostal,
} from '@/lib/google';
import { mensajeDelCodigo, motivoDe, origenDe, permisoDe, puntoDeOrigen } from '@/lib/ubicacion';
import { RECTANGULO, enLaZona } from '@/lib/zona';

// ============================================================================
// WHERE SHE IS, HOW FAR EACH KITCHEN IS, AND WHAT ITACATE ASKS GOOGLE. Plan task
// `10.5-iv-a-i`.
//
// ⚠️ THE RULINGS HELD HERE: her location never leaves the phone (2026-11-04, night);
// declined or approximate, her postal code (2026-11-03); outside Wera Cocina's search
// zone, *Itacate aún no llega a tu zona* (2026-11-04, night); a kitchen with no point
// placed by her phone, for her alone, and nothing of Google's kept (the plan's row,
// Service Specific Terms §6.3.2). What Google answers Itacate's own package and
// signature was measured on 2026-11-05 (the plan's status log) — no suite reaches
// Google.
// ============================================================================

const SRC = fileURLToPath(new URL('../src', import.meta.url));
const read = (path: string) => readFileSync(join(SRC, path), 'utf8');
const code = (path: string) => read(path).replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

function sources(dir = SRC): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? sources(path) : /\.tsx?$/.test(name) ? [path] : [];
  });
}
const files = sources().map((path) => ({ name: path.slice(SRC.length + 1), text: readFileSync(path, 'utf8') }));

const ZOCALO = { latitude: 19.4326, longitude: -99.1332 };

describe('what her answer allows', () => {
  it('no, approximate or precise — read from the permission, not guessed from a fix', () => {
    expect(permisoDe({ granted: false })).toBe('negada');
    expect(permisoDe({ granted: true, ios: { accuracy: 'full' } })).toBe('precisa');
    expect(permisoDe({ granted: true, ios: { accuracy: 'reduced' } })).toBe('aproximada');
    expect(permisoDe({ granted: true, android: { accuracy: 'fine' } })).toBe('precisa');
    expect(permisoDe({ granted: true, android: { accuracy: 'coarse' } })).toBe('aproximada');
  });
});

describe('where the list is measured from', () => {
  const cp = { cp: '06400', punto: { latitude: 19.45, longitude: -99.16 } };

  it('her location inside the zone, first — even after she typed a postal code', () => {
    expect(origenDe({ kind: 'aqui', punto: ZOCALO }, null)).toEqual({ kind: 'aqui', punto: ZOCALO });
    expect(origenDe({ kind: 'aqui', punto: ZOCALO }, cp)).toEqual({ kind: 'aqui', punto: ZOCALO });
  });

  it('declined, approximate or not found: her postal code, and why it is asked', () => {
    expect(origenDe({ kind: 'sin-permiso' }, null)).toEqual({ kind: 'pide-codigo', porque: 'sin-permiso' });
    expect(origenDe({ kind: 'aproximada' }, null)).toEqual({ kind: 'pide-codigo', porque: 'aproximada' });
    expect(origenDe({ kind: 'sin-ubicacion' }, null)).toEqual({ kind: 'pide-codigo', porque: 'sin-ubicacion' });
    expect(origenDe({ kind: 'aproximada' }, cp)).toEqual({ kind: 'codigo', ...cp });
    expect(motivoDe('sin-permiso')).toBe('Sin tu ubicación, escribe tu código postal y te mostramos lo que hay cerca.');
    expect(motivoDe('aproximada')).toMatch(/^Tu teléfono solo nos deja ver tu ubicación aproximada\./);
  });

  it('outside the zone: Itacate aún no llega a tu zona — unless she typed a code inside it', () => {
    const puebla = { latitude: 19.0414, longitude: -98.2063 };
    expect(origenDe({ kind: 'aqui', punto: puebla }, null)).toEqual({ kind: 'fuera' });
    expect(origenDe({ kind: 'aqui', punto: puebla }, cp)).toEqual({ kind: 'codigo', ...cp });
  });

  it('nothing to measure from while her phone is still asked', () => {
    expect(origenDe({ kind: 'buscando' }, null)).toEqual({ kind: 'buscando' });
    expect(puntoDeOrigen({ kind: 'buscando' })).toBeNull();
    expect(puntoDeOrigen({ kind: 'fuera' })).toBeNull();
    expect(puntoDeOrigen({ kind: 'codigo', ...cp })).toEqual(cp.punto);
  });
});

describe('the zone — Wera Cocina’s search zone, his ruling of 2026-11-04, night', () => {
  it('Mexico City and the State of Mexico, and the edges of the states around', () => {
    expect(enLaZona(ZOCALO)).toBe(true);
    expect(enLaZona({ latitude: 19.2826, longitude: -99.6557 })).toBe(true); // Toluca
    expect(enLaZona({ latitude: 20.1011, longitude: -98.7591 })).toBe(true); // Pachuca, Hidalgo
    expect(enLaZona({ latitude: 19.0414, longitude: -98.2063 })).toBe(false); // Puebla
    expect(enLaZona({ latitude: 20.6597, longitude: -103.3496 })).toBe(false); // Guadalajara
    expect(RECTANGULO.low.latitude).toBeLessThan(RECTANGULO.high.latitude);
  });
});

describe('how far — a straight line, on her phone', () => {
  it('a degree of latitude is the mean Earth’s, and the arithmetic is symmetric', () => {
    expect(metrosEntre({ latitude: 0, longitude: 0 }, { latitude: 1, longitude: 0 })).toBeCloseTo(111_195.08, 1);
    const angel = { latitude: 19.427, longitude: -99.1677 };
    expect(metrosEntre(ZOCALO, angel)).toBeCloseTo(metrosEntre(angel, ZOCALO), 6);
    expect(metrosEntre(ZOCALO, angel)).toBeGreaterThan(3600);
    expect(metrosEntre(ZOCALO, angel)).toBeLessThan(3700);
    expect(metrosEntre(ZOCALO, ZOCALO)).toBe(0);
  });

  it('as she reads it: 50 m at least, 350 m, 1.2 km, 12 km', () => {
    expect(distanciaTexto(0)).toBe('50 m');
    expect(distanciaTexto(349)).toBe('350 m');
    expect(distanciaTexto(974)).toBe('950 m');
    expect(distanciaTexto(975)).toBe('1 km');
    expect(distanciaTexto(1250)).toBe('1.3 km');
    expect(distanciaTexto(9940)).toBe('9.9 km');
    expect(distanciaTexto(9960)).toBe('10 km');
    expect(distanciaTexto(12_400)).toBe('12 km');
  });
});

describe('what Itacate asks Google — as Itacate, never as Wera Cocina', () => {
  it('names this app: its id, and its test builds’ signature as the handbook recorded it for the key', () => {
    expect(ID_DE_LA_APP).toBe('mx.wera.vecino');
    expect(cabecerasDeLaApp('ios')).toEqual({ 'X-Ios-Bundle-Identifier': 'mx.wera.vecino' });
    expect(cabecerasDeLaApp('android')).toEqual({ 'X-Android-Package': 'mx.wera.vecino', 'X-Android-Cert': FIRMA_ANDROID });
    const handbook = readFileSync(new URL('../../docs/HANDBOOK.md', import.meta.url), 'utf8');
    const recorded = /`mx\.wera\.vecino` with `([0-9A-F:]{59})`/.exec(handbook)?.[1];
    expect(recorded, 'the handbook’s step 10 lists the signature the key accepts for Itacate').toBeDefined();
    expect((recorded as string).replace(/:/g, '')).toBe(FIRMA_ANDROID);
  });

  it('only with a key that looks like one — the build’s placeholder asks nothing', () => {
    expect(claveDe('sin-clave')).toBeNull();
    expect(claveDe(undefined)).toBeNull();
    expect(claveDe(`AIza${'x'.repeat(35)}`)).toBe(`AIza${'x'.repeat(35)}`);
  });

  it('a kitchen’s address, as she wrote it — never without its street', () => {
    const direccion = { street: 'Sabino', number: '12', colonia: 'Santa María la Ribera', city: 'Cuauhtémoc', postalCode: '06400' };
    expect(preguntaDeSuDireccion(direccion)).toBe('Sabino 12, Santa María la Ribera, Cuauhtémoc, 06400');
    expect(preguntaDeSuDireccion({ ...direccion, number: '', city: '' })).toBe('Sabino, Santa María la Ribera, 06400');
    expect(preguntaDeSuDireccion({ ...direccion, street: '' })).toBeNull();
  });

  it('Geocoding in Spanish, Mexico only, leaning on the zone', () => {
    const url = new URL(urlDeGeocodificar('Sabino 12, 06400', 'CLAVE'));
    expect(`${url.origin}${url.pathname}`).toBe(GEOCODING_URL);
    expect(Object.fromEntries(url.searchParams)).toEqual({
      address: 'Sabino 12, 06400',
      language: 'es',
      region: 'mx',
      components: 'country:MX',
      bounds: `${RECTANGULO.low.latitude},${RECTANGULO.low.longitude}|${RECTANGULO.high.latitude},${RECTANGULO.high.longitude}`,
      key: 'CLAVE',
    });
  });

  it('her postal code: five digits, asked as a component — never her location', () => {
    expect(codigoPostalDe('06400')).toBe('06400');
    expect(codigoPostalDe(' 06 400 ')).toBe('06400');
    expect(codigoPostalDe('6400')).toBeNull();
    expect(codigoPostalDe('0640a')).toBeNull();
    const url = new URL(urlDelCodigoPostal('06400', 'CLAVE'));
    expect(Object.fromEntries(url.searchParams)).toEqual({ components: 'postal_code:06400|country:MX', language: 'es', region: 'mx', key: 'CLAVE' });
  });
});

describe('what Google answers', () => {
  const resultado = (lat: number, lng: number) => ({ geometry: { location: { lat, lng } } });

  it('its first point inside the zone', () => {
    const body = { status: 'OK', results: [resultado(19.04, -98.2), resultado(19.45, -99.16)] };
    expect(respuestaDeGeocoding(200, body)).toEqual({ kind: 'punto', punto: { latitude: 19.45, longitude: -99.16 } });
  });

  it('points only outside it: fuera — Itacate aún no llega a esa zona', () => {
    expect(respuestaDeGeocoding(200, { status: 'OK', results: [resultado(19.04, -98.2)] })).toEqual({ kind: 'fuera' });
    expect(mensajeDelCodigo({ kind: 'fuera' })).toBe('Itacate aún no llega a esa zona.');
  });

  it('nothing found, and Google’s refusals — a 200 whose status says so', () => {
    expect(respuestaDeGeocoding(200, { status: 'ZERO_RESULTS', results: [] })).toEqual({ kind: 'ninguna' });
    expect(respuestaDeGeocoding(200, { status: 'REQUEST_DENIED', error_message: 'not authorized' })).toEqual({ kind: 'falla' });
    expect(respuestaDeGeocoding(200, { status: 'OVER_QUERY_LIMIT' })).toEqual({ kind: 'falla' });
    expect(respuestaDeGeocoding(500, null)).toEqual({ kind: 'falla' });
    expect(respuestaDeGeocoding(200, { status: 'OK', results: [{ geometry: {} }] })).toEqual({ kind: 'ninguna' });
    expect(mensajeDelCodigo({ kind: 'ninguna' })).toBe('No encontramos ese código postal.');
    expect(mensajeDelCodigo({ kind: 'sin-senal' })).toBe('Sin conexión a internet. Intenta de nuevo en un momento.');
    expect(mensajeDelCodigo({ kind: 'falla' })).toBe('No pudimos buscar ese código postal. Intenta de nuevo.');
  });
});

describe('her location never leaves the phone, and nothing of Google’s is kept', () => {
  it('her location is asked by one module, and handed to the list alone', () => {
    const askers = files.filter((f) => /from 'expo-location'/.test(f.text)).map((f) => f.name);
    expect(askers).toEqual(['lib/useUbicacion.ts']);
    const users = files.filter((f) => /from '@\/lib\/useUbicacion'/.test(f.text)).map((f) => f.name);
    expect(users).toEqual(['app/(vecino)/index.tsx']);
  });

  it('only while the app is open — no background location of any kind', () => {
    const ubicacion = code('lib/useUbicacion.ts');
    expect(ubicacion).not.toMatch(/Background|startLocationUpdatesAsync|Geofencing|TaskManager/);
    expect(ubicacion).toMatch(/if \(!enFrente\) return;/);
    const app = JSON.parse(readFileSync(new URL('../app.json', import.meta.url), 'utf8')).expo;
    expect(app.android.blockedPermissions).toEqual(
      expect.arrayContaining(['android.permission.ACCESS_BACKGROUND_LOCATION', 'android.permission.FOREGROUND_SERVICE_LOCATION']),
    );
  });

  it('the data layer sends nothing of hers or of Google’s: no module in `src/api/` reads where she is or what Google said', () => {
    for (const file of files.filter((f) => f.name.startsWith('api/'))) {
      expect(file.text, file.name).not.toMatch(/@\/lib\/(useUbicacion|useGoogle|google|ubicacion|distancia)'/);
    }
  });

  it('Google is asked from one module, and its answers stay in memory', () => {
    const askers = files.filter((f) => /\bfetch\(/.test(code(f.name))).map((f) => f.name);
    expect(askers).toEqual(['lib/useGoogle.ts']);
    const google = code('lib/useGoogle.ts');
    expect(google).toMatch(/staleTime: Infinity,\s*gcTime: Infinity,/);
    for (const file of files.filter((f) => /^(lib\/use|ui\/|app\/\(vecino\))/.test(f.name))) {
      expect(file.text, file.name).not.toMatch(/localStorage|expo-sqlite|persistQueryClient|AsyncStorage/);
    }
  });

  it('a kitchen’s photo is kept in memory, never on the phone’s disk', () => {
    expect(code('ui/Foto.tsx')).toMatch(/cachePolicy="memory"/);
  });

  it('a photo is asked for with her own session, and only from that kitchen’s own folder (`0076`’s rule)', () => {
    const hooks = code('api/hooks.ts');
    expect(hooks).toMatch(/if \(path === null \|\| token === null \|\| !isPicturePath\(path, kitchenId\)\) return null;/);
    expect(hooks).toMatch(/const token = session\?\.access_token \?\? null;/);
  });
});
