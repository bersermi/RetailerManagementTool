import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  GOOGLE_PLACE_ID_MAX,
  GOOGLE_REFRESH_DAYS,
  SET_GOOGLE_POINT,
  googlePointDue,
  instantFrom,
  setGooglePointArgs,
  toMilliseconds,
  toPlace,
  type PlaceRow,
} from '@/api/place';
import {
  CAMPOS_DEL_REFRESCO,
  CAMPOS_DE_DETALLES,
  DETALLES_URL,
  anchoPara,
  destinoGuardado,
  lugarGuardado,
  preguntaDeDireccion,
  preguntaDeRefresco,
  suLugarDe,
  urlDeSuLugar,
} from '@/lib/google';
import { CLOSE_METRES } from '@/lib/mapa';

// ============================================================================
// GOOGLE'S POINT FOR HER ADDRESS, KEPT AS A 30-DAY COPY. Plan task `10.5-i-b-ii`,
// the owner's ruling of 2026-11-04, night (*"Yes, record it and follow your
// recommendation"*): her kitchen is drawn at Google's point for her address —
// written when she registers or changes it, asked again when the app opens and
// the copy is over a week old, and cleared by the database every night once it is
// 29 days old (`0078`) — her own pin winning everywhere.
//
// ⚠️ WHAT ONLY A REAL DATABASE CAN SAY — that the names are ones PostgREST answers,
// that the database stamps the copy, refuses a shop's and clears it under a new
// address — is `docs/checks/10.4b-iii-a-cocina-contract.sh`'s group 12, which reads
// the names OUT OF `src/api/place.ts`. What only Google can say — that the refresh's
// Place Details answers, on a phone's key — is the `preview` build's: a build made
// on this Mac has no key. Here: the values, the 7-day rule, the answers read, and
// the wiring no suite can run, read out of the files.
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
const relative = (path: string) => path.slice(SRC.length + 1).replace(/\\/g, '/');

const MIGRATION = readFileSync(new URL('../../supabase/migrations/0078_the_door_and_googles_point.sql', import.meta.url), 'utf8');

const DAY = 24 * 60 * 60 * 1000;
/** A `timestamptz` as PostgREST sends it — six decimals of a second, and the offset. */
const STAMP = '2026-11-04T23:50:01.123456+00:00';
const STAMPED = Date.UTC(2026, 10, 4, 23, 50, 1, 123);

const ROW: PlaceRow = {
  id: 'her-place',
  name: 'Fonda Doña Lupe',
  street: 'Fresno',
  street_number: '45',
  colonia: 'Santa María la Ribera',
  city: 'Cuauhtémoc',
  postal_code: '06400',
  pin_lat: null,
  pin_lng: null,
  directions: null,
  google_place_id: 'ChIJ-fresno-45',
  google_lat: 19.451332,
  google_lng: -99.160113,
  google_at: STAMP,
};

describe('the copy, as the app reads it', () => {
  it('`0078`’s four columns, one point with its moment and its ID — and none without the point or the moment', () => {
    expect(toPlace(ROW).google).toEqual({ pin: { latitude: 19.451332, longitude: -99.160113 }, placeId: 'ChIJ-fresno-45', at: STAMP });
    // A `numeric` that arrived as text is still a point, as her pin's is.
    expect(toPlace({ ...ROW, google_lat: '19.451332', google_lng: '-99.160113' }).google?.pin).toEqual({ latitude: 19.451332, longitude: -99.160113 });
    expect(toPlace({ ...ROW, google_place_id: null }).google?.placeId).toBeNull();
    expect(toPlace({ ...ROW, google_place_id: '  ' }).google?.placeId).toBeNull();
    expect(toPlace({ ...ROW, google_at: null }).google).toBeNull();
    expect(toPlace({ ...ROW, google_lat: null }).google).toBeNull();
  });

  it('her own pin is read beside it, and stays hers', () => {
    const both = toPlace({ ...ROW, pin_lat: 19.4514, pin_lng: -99.1599 });
    expect(both.pin).toEqual({ latitude: 19.4514, longitude: -99.1599 });
    expect(both.google?.pin).toEqual({ latitude: 19.451332, longitude: -99.160113 });
  });
});

describe('the one door it is written through — `set_google_point`, `0078`', () => {
  it('its four names as the migration declares them; six decimals, as the columns keep them', () => {
    expect(SET_GOOGLE_POINT).toBe('set_google_point');
    expect(MIGRATION).toMatch(
      /create function public\.set_google_point\(\s*p_location_id uuid,\s*p_lat\s+numeric,\s*p_lng\s+numeric,\s*p_place_id\s+text default null\s*\)/,
    );
    expect(setGooglePointArgs('her-place', { pin: { latitude: 19.45133184, longitude: -99.16011291 }, placeId: ' ChIJ-fresno-45 ' })).toEqual({
      p_location_id: 'her-place',
      p_lat: 19.451332,
      p_lng: -99.160113,
      p_place_id: 'ChIJ-fresno-45',
    });
    expect(code('api/calls.ts')).toMatch(/supabase\.rpc\(SET_GOOGLE_POINT, args\)/);
  });

  it('an ID the column would refuse is dropped and the point kept — never a refusal that loses both', () => {
    expect(MIGRATION).toMatch(new RegExp(`char_length\\(google_place_id\\) <= ${GOOGLE_PLACE_ID_MAX}`));
    const pin = { latitude: 19.45, longitude: -99.16 };
    expect(setGooglePointArgs('p', { pin, placeId: 'x'.repeat(GOOGLE_PLACE_ID_MAX) }).p_place_id).toHaveLength(GOOGLE_PLACE_ID_MAX);
    expect(setGooglePointArgs('p', { pin, placeId: 'x'.repeat(GOOGLE_PLACE_ID_MAX + 1) }).p_place_id).toBeNull();
    expect(setGooglePointArgs('p', { pin, placeId: '   ' }).p_place_id).toBeNull();
    expect(setGooglePointArgs('p', { pin, placeId: null }).p_place_id).toBeNull();
  });
});

describe('asked again a week on — by this phone’s clock, inside the database’s 29 days', () => {
  it('the ruling’s 7 days, well inside the 29 at which the nightly job clears the copy', () => {
    expect(GOOGLE_REFRESH_DAYS).toBe(7);
    expect(MIGRATION).toMatch(/where google_at < now\(\) - interval '29 days'/);
    expect(GOOGLE_REFRESH_DAYS).toBeLessThan(29);
  });

  it('⚠️ PostgREST’s six decimals are read, cut to milliseconds — and the other shapes a moment comes in', () => {
    // The cut itself: Node reads six decimals either way, so only this line shows it is there.
    expect(toMilliseconds(` ${STAMP} `)).toBe('2026-11-04T23:50:01.123+00:00');
    expect(toMilliseconds('2026-11-04T23:50:01+00:00')).toBe('2026-11-04T23:50:01+00:00');
    expect(instantFrom(STAMP)).toBe(STAMPED);
    expect(instantFrom('2026-11-04T23:50:01+00:00')).toBe(Date.UTC(2026, 10, 4, 23, 50, 1));
    expect(instantFrom('2026-11-04T23:50:01.5Z')).toBe(Date.UTC(2026, 10, 4, 23, 50, 1, 500));
    expect(instantFrom('2026-11-04T17:50:01.123456-06:00')).toBe(STAMPED);
    expect(instantFrom('ayer')).toBeNull();
    expect(instantFrom(null)).toBeNull();
  });

  it('due once older than 7 days, not before; due with no copy, and with a moment it cannot read', () => {
    const copy = { pin: { latitude: 19.45, longitude: -99.16 }, placeId: null, at: STAMP };
    expect(googlePointDue(copy, STAMPED + 7 * DAY)).toBe(false);
    expect(googlePointDue(copy, STAMPED + 7 * DAY + 1)).toBe(true);
    expect(googlePointDue(copy, STAMPED - DAY)).toBe(false);
    expect(googlePointDue(null, STAMPED)).toBe(true);
    expect(googlePointDue({ ...copy, at: 'ayer' }, STAMPED)).toBe(true);
  });
});

describe('what the refresh asks Google', () => {
  it('⚠️ Place Details Essentials, `id` and `location` alone, outside any search’s session', () => {
    expect(CAMPOS_DEL_REFRESCO).toBe('id,location');
    // Every field asked is one a pick's details already ask — Essentials, never a dearer tier.
    for (const field of CAMPOS_DEL_REFRESCO.split(',')) expect(CAMPOS_DE_DETALLES.split(',')).toContain(field);
    expect(urlDeSuLugar('ChIJ fresno/45')).toBe(`${DETALLES_URL}ChIJ%20fresno%2F45?languageCode=es-MX&regionCode=mx`);
    expect(urlDeSuLugar('ChIJ-fresno-45')).not.toMatch(/sessionToken/);
  });

  it('the place she picked — her address beside it — else her stored address, as the small map asks it', () => {
    const address = toPlace(ROW).address;
    const direccion = preguntaDeDireccion(address);
    expect(direccion).toBe('Fresno 45, Santa María la Ribera, Cuauhtémoc, 06400');
    expect(preguntaDeRefresco(' ChIJ-fresno-45 ', address)).toEqual({ kind: 'lugar', placeId: 'ChIJ-fresno-45', direccion });
    expect(preguntaDeRefresco(null, address)).toEqual({ kind: 'direccion', direccion });
    expect(preguntaDeRefresco('  ', address)).toEqual({ kind: 'direccion', direccion });
  });

  it('nothing while her address is not whole', () => {
    expect(preguntaDeRefresco('ChIJ-fresno-45', { ...toPlace(ROW).address, number: '' })).toBeNull();
  });
});

describe('what Google answers, read', () => {
  it('a point in the zone, kept with Google’s current ID for the place — the one asked, when it sends none', () => {
    const body = { id: 'ChIJ-fresno-45-nuevo', location: { latitude: 19.4513318, longitude: -99.1601129 } };
    expect(suLugarDe(200, body, 'ChIJ-fresno-45')).toEqual({
      kind: 'punto',
      google: { pin: { latitude: 19.4513318, longitude: -99.1601129 }, placeId: 'ChIJ-fresno-45-nuevo' },
    });
    expect(suLugarDe(200, { location: body.location }, 'ChIJ-fresno-45')).toMatchObject({ google: { placeId: 'ChIJ-fresno-45' } });
  });

  it('⚠️ a 404 or a 400 is the ID lost — the refresh then asks for her address — and any other failure fails', () => {
    expect(suLugarDe(404, { error: { code: 404, status: 'NOT_FOUND' } }, 'ChIJ-gone')).toEqual({ kind: 'perdido' });
    expect(suLugarDe(400, { error: { code: 400, status: 'INVALID_ARGUMENT' } }, '???')).toEqual({ kind: 'perdido' });
    expect(suLugarDe(403, {}, 'ChIJ-fresno-45')).toEqual({ kind: 'falla' });
    expect(suLugarDe(429, {}, 'ChIJ-fresno-45')).toEqual({ kind: 'falla' });
    expect(suLugarDe(500, {}, 'ChIJ-fresno-45')).toEqual({ kind: 'falla' });
  });

  it('no point, or one outside the zone, is none', () => {
    expect(suLugarDe(200, { id: 'x' }, 'x')).toEqual({ kind: 'ninguna' });
    expect(suLugarDe(200, { id: 'x', location: { latitude: 20.6597, longitude: -103.3496 } }, 'x')).toEqual({ kind: 'ninguna' });
    expect(suLugarDe(200, { id: 'x', location: { latitude: '19.45', longitude: -99.16 } }, 'x')).toEqual({ kind: 'ninguna' });
  });
});

describe('her kitchen’s stored copy, drawn', () => {
  it('at block level — her address always has its number — with her boxes as stored and the ID she picked', () => {
    const place = toPlace(ROW);
    expect(destinoGuardado(place.google!)).toEqual({ punto: place.google!.pin, conNumero: true, anchoMetros: 0 });
    expect(anchoPara(destinoGuardado(place.google!))).toBe(CLOSE_METRES);
    expect(lugarGuardado(place)).toEqual({ punto: place.google!.pin, conNumero: true, anchoMetros: 0, direccion: place.address, placeId: 'ChIJ-fresno-45' });
  });

  it('none with her own pin — hers is drawn instead — and none with no copy', () => {
    expect(lugarGuardado(toPlace({ ...ROW, pin_lat: 19.4514, pin_lng: -99.1599 }))).toBeNull();
    expect(lugarGuardado(toPlace({ ...ROW, google_lat: null, google_lng: null, google_at: null, google_place_id: null }))).toBeNull();
  });
});

// The hooks and the screens no suite can load (ADR-035 §2.11), read for their wiring.
describe('the refresh, as wired', () => {
  const hook = code('lib/useGoogle.ts');

  it('asks only while she has no pin of her own and a whole address, and only once the copy is due', () => {
    expect(hook).toMatch(
      /const suya = place === undefined \|\| place === null \|\| place\.pin !== null \|\| checkAddress\(place\.address\) !== null \? null : place;/,
    );
    expect(hook).toMatch(/const pregunta = suya !== null && googlePointDue\(guardado, ahora\) \? preguntaDeRefresco\(guardado\?\.placeId \?\? null, suya\.address\) : null;/);
    expect(hook).toMatch(/enabled: pregunta !== null && lugarId !== null && CLAVE !== null,/);
  });

  it('⚠️ keeps the answer IN THE SAME STEP THAT ASKED, and is keyed on the copy it replaces — an answer held in memory is never written later as fresh', () => {
    expect(hook).toMatch(/queryKey: \[\.\.\.BUSCAR_KEY, 'su-cocina', lugarId, guardado\?\.at \?\? null, pregunta\]/);
    expect(hook).toMatch(
      /const r = await refrescar\(pregunta as PreguntaDeRefresco, signal\);\s*if \(r\.kind === 'punto'\) save\(setGooglePointArgs\(lugarId as string, r\.google\)\);\s*return r;/,
    );
    expect(hook.match(/save\(/g)).toHaveLength(1);
  });

  it('one question to Places, or to Geocoding when there is no ID or Google lost it — and Geocoding’s answer keeps no ID', () => {
    expect(hook).toMatch(/urlDeSuLugar\(pregunta\.placeId\),\s*\{ headers: \{ \.\.\.APP, 'X-Goog-Api-Key': CLAVE, 'X-Goog-FieldMask': CAMPOS_DEL_REFRESCO \} \}/);
    expect(hook).toMatch(/if \(suyo\.kind !== 'perdido'\) return suyo;\s*\}\s*const g = await geocodificar\(pregunta\.direccion, signal\);/);
    expect(hook).toMatch(/google: \{ pin: g\.destino\.punto, placeId: null \}/);
  });

  it('draws the answer while the copy is due, else the copy — the old one too while the question is out', () => {
    expect(hook).toMatch(
      /if \(pregunta !== null && data\?\.kind === 'punto'\) return data;\s*if \(guardado !== null\) return \{ kind: 'punto', destino: destinoGuardado\(guardado\), google: guardado \};/,
    );
  });

  it('a point found, or none, stands an hour for the same copy; no signal or a refusal is asked again at the next open', () => {
    expect(hook).toMatch(
      /staleTime: \(query\) => \(query\.state\.data\?\.kind === 'punto' \|\| query\.state\.data\?\.kind === 'ninguna' \? REFRESCO_VIGENCIA_MS : 0\),/,
    );
    expect(hook).toMatch(/const REFRESCO_VIGENCIA_MS = 60 \* 60_000;/);
  });

  it('“when the app opens” is its launch and each return to the front', () => {
    expect(hook).toMatch(/const ahora = useAlAbrir\(\);/);
    expect(hook).toMatch(/AppState\.addEventListener\('change', \(state\) => \{\s*if \(state === 'active'\) setAhora\(Date\.now\(\)\);/);
  });

  it('the write reads her place again on success, and only logs a failure — nothing on screen', () => {
    expect(code('api/hooks.ts')).toMatch(
      /mutationFn: \(args: SetGooglePointArgs\) => setPlaceGooglePoint\(args\),\s*onSuccess: \(\) => \{\s*void queries\.invalidateQueries\(\{ queryKey: PLACES_KEY \}\);\s*\},\s*onError: \(thrown\) => \{\s*console\.warn\(/,
    );
  });

  it('her kitchen’s small map and *Ajustar punto* draw the copy; *Cambiar dirección* opens on it', () => {
    for (const route of ['app/(cocina)/index.tsx', 'app/(cocina)/ubicacion.tsx']) {
      expect(code(route), route).toMatch(/const donde = useDondeEstaSuCocina\(here\);/);
      expect(code(route), route).not.toMatch(/useDondeEsta\(/);
    }
    expect(code('app/(cocina)/direccion/_layout.tsx')).toMatch(/conocido=\{lugarGuardado\(place\.data\)\}/);
  });
});

// ⚠️⚠️ THE LINE THE REVERSAL MUST NOT CROSS: Google's point now rides in what
// `@/api/` sends — as a `GooglePoint`, through `set_google_point` alone. Never what
// Google names, and never by a module of the data layer asking Google itself.
describe('Google’s content enters the data layer only as a point and an ID, through one door', () => {
  const files = sources().map((path) => ({ name: relative(path), text: code(relative(path)) }));

  it('the four columns are named in `api/place.ts` and nowhere else', () => {
    const naming = files.filter((f) => /\bgoogle_(place_id|lat|lng|at)\b/.test(f.text)).map((f) => f.name);
    expect(naming).toEqual(['api/place.ts']);
  });

  it('`set_google_point` is sent by one call, and its arguments are made by one function, from three callers', () => {
    expect(files.filter((f) => /\bSET_GOOGLE_POINT\b/.test(f.text)).map((f) => f.name).sort()).toEqual(['api/calls.ts', 'api/place.ts']);
    expect(code('api/calls.ts').match(/supabase\.rpc\(SET_GOOGLE_POINT, args\)/g)).toHaveLength(1);
    const callers = files.filter((f) => /\bsetGooglePointArgs\(/.test(f.text.replace(/export function setGooglePointArgs\(/, ''))).map((f) => f.name);
    expect(callers.sort()).toEqual(['api/direccion.ts', 'api/registro.ts', 'lib/useGoogle.ts']);
  });

  it('nothing in the data layer reads what Google names, nor asks Google', () => {
    for (const file of files.filter((f) => f.name.startsWith('api/'))) {
      expect(file.text, file.name).not.toMatch(/addressComponents|formattedAddress|long_name|calleDeGeocoding|Sugerencia|lugarDe|googleapis/);
      expect(file.text, file.name).not.toMatch(/@\/lib\/(google|useGoogle)|@\/ui\/Buscador/);
    }
  });
});
