import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  CIUDAD,
  CLOSE_METRES,
  CLOSE_SLACK,
  ES_AQUI_PAUSA_MS,
  GLANCE_METRES,
  LLEGADA_MS,
  MISMO_PUNTO_METROS,
  TAP_ZOOM,
  TIPO_DE_MAPA,
  alLlegar,
  centroAlAbrir,
  closeEnough,
  closerAt,
  conGesto,
  haciaUnPunto,
  lineaDeSuDireccion,
  metresAcross,
  metrosEntre,
  openingRegion,
  pinDelCentro,
  regionAround,
  regionFromBounds,
  tapOn,
  type Centro,
  type Region,
} from '@/lib/mapa';
import { ES } from '@/strings';

// ============================================================================
// THE MAP'S ARITHMETIC. Plan tasks `10.4b-iii-b`, `10.4c`, `10.4e` and `10.4g-i`.
//
// ⚠️ THE MAP ITSELF IS NATIVE AND NO SUITE CAN LOAD IT (ADR-035 §2.11): whether
// the flat map draws, and whether a drag reaches `onPanDrag`, is the phone's.
// What is pinned here is every number the phone would otherwise decide silently:
// where it opens, when the centre is close enough to be her pin, where a tap
// takes the map, who put the centre where it is — and that the taps from the
// city end in her pin, never in a loop.
// ============================================================================

const SRC = new URL('../src/', import.meta.url);
const code = (path: string) =>
  readFileSync(new URL(path, SRC), 'utf8')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');

const DOOR = { latitude: 19.451234, longitude: -99.159876 };

/** What a portrait phone's map reports for a region it fitted: the width it asked for, and taller. */
function fitted(region: Region, tallerBy = 1.6): Region {
  return { ...region, latitudeDelta: region.latitudeDelta * tallerBy };
}

describe('where the map opens', () => {
  it('on Mexico City, wide enough for the central alcaldías, when she has no pin — this app asks no location', () => {
    expect(CIUDAD.latitude).toBeCloseTo(19.43, 2);
    expect(CIUDAD.longitude).toBeCloseTo(-99.13, 2);
    expect(metresAcross(CIUDAD)).toBeGreaterThan(15_000);
    expect(openingRegion(null)).toBe(CIUDAD);
    expect(closeEnough(CIUDAD)).toBe(false);
  });

  it('centred on her pin when she has one — close enough that the centre is her pin until she moves the map', () => {
    const region = openingRegion(DOOR);
    expect(region.latitude).toBe(DOOR.latitude);
    expect(region.longitude).toBe(DOOR.longitude);
    expect(closeEnough(fitted(region))).toBe(true);
    expect(pinDelCentro(centroAlAbrir(DOOR, region), fitted(region), DOOR)).toBe(DOOR);
  });
});

describe('when the centre is close enough to be her pin', () => {
  it('about a block across its narrower side, with a tenth of slack for the fitting', () => {
    expect(CLOSE_METRES).toBe(100);
    expect(CLOSE_SLACK).toBe(1.1);
    expect(closeEnough(regionAround(DOOR, 100))).toBe(true);
    expect(closeEnough(regionAround(DOOR, 109))).toBe(true);
    expect(closeEnough(regionAround(DOOR, 115))).toBe(false);
  });

  it('measured across the NARROWER side: a phone’s map is taller than wide, and a taller view of the same width is as close', () => {
    const asked = regionAround(DOOR, 100);
    expect(metresAcross(fitted(asked, 2))).toBeCloseTo(metresAcross(asked), 0);
    expect(closeEnough(fitted(asked, 2))).toBe(true);
  });

  // 10.4e: a tap no longer places a pin — it brings the point she tapped under the pin.
  it('a tap close in brings the point she tapped to the middle, at the same zoom', () => {
    const view = regionAround({ latitude: DOOR.latitude + 0.0003, longitude: DOOR.longitude }, 80);
    expect(tapOn(DOOR, view)).toEqual({ ...view, latitude: DOOR.latitude, longitude: DOOR.longitude });
  });
});

describe('where a tap that is still too far takes the map', () => {
  it('centred on the tap, an eighth as wide', () => {
    const wide = regionAround(DOOR, 8000);
    const next = closerAt(DOOR, wide);
    expect(TAP_ZOOM).toBe(8);
    expect(next.latitude).toBe(DOOR.latitude);
    expect(next.longitude).toBe(DOOR.longitude);
    expect(metresAcross(next)).toBeCloseTo(1000, 0);
  });

  it('never closer than close enough — so that tap leaves her door under the pin, close in', () => {
    const near = regionAround(DOOR, 300);
    expect(metresAcross(closerAt(DOOR, near))).toBeCloseTo(CLOSE_METRES, 0);
    expect(tapOn(DOOR, near)).toEqual(closerAt(DOOR, near));
  });

  it('from the city, three taps bring her door to the middle close in — and the centre is then her pin; never a loop', () => {
    let region: Region = CIUDAD;
    let centro: Centro = centroAlAbrir(null, CIUDAD);
    let taps = 0;
    let t = 0;
    while (!closeEnough(region)) {
      taps += 1;
      centro = haciaUnPunto(centro, DOOR, 'ella', t);
      region = fitted(tapOn(DOOR, region));
      centro = alLlegar(centro, region, false, t + 600);
      t += 5_000;
      expect(taps).toBeLessThan(10);
    }
    expect(taps).toBe(3);
    expect(pinDelCentro(centro, region, null)).toEqual(DOOR);
  });
});

// ============================================================================
// THE PIN IS THE CENTRE, ONCE SHE HAS PUT IT THERE — `10.4e`, the owner's ruling
// of 2026-11-02 (as Uber does it), reversing 10.4c's *her tap is the pin*.
// ⚠️⚠️ After a flight to a search's answer the centre is Apple's, Google's or
// LocationIQ's point, which their terms forbid keeping: no pin until her hand
// moves the map. Each case is a sequence of what the native map reports.
// ============================================================================
describe('who put the centre where it is', () => {
  const ANSWER = { latitude: 19.4153, longitude: -99.1654 }; // a provider's door
  const near = (p: { latitude: number; longitude: number }, metres = CLOSE_METRES) => fitted(regionAround(p, metres));
  const north = (p: { latitude: number; longitude: number }, metres: number) => ({ latitude: p.latitude + metres / 111_320, longitude: p.longitude });
  /** The map opened on the city, then flew to the provider's answer and arrived, untouched. */
  function afterTheFlight(): Centro {
    const opened = centroAlAbrir(null, CIUDAD);
    return alLlegar(haciaUnPunto(opened, ANSWER, 'otro', 0), near(ANSWER), false, 900);
  }

  it('opens on her pin as hers, on the city as nobody’s — no pin there even close in', () => {
    expect(centroAlAbrir(DOOR, openingRegion(DOOR)).autor).toBe('ella');
    const city = centroAlAbrir(null, CIUDAD);
    expect(city.autor).toBe('otro');
    expect(pinDelCentro(city, near(DOOR), null)).toBeNull();
  });

  it('a flight to an answer takes the centre from her at once, and its arrival is not hers: no pin', () => {
    const mine = centroAlAbrir(DOOR, openingRegion(DOOR));
    expect(haciaUnPunto(mine, ANSWER, 'otro', 0).autor).toBe('otro');
    const arrived = afterTheFlight();
    expect(arrived.autor).toBe('otro');
    expect(arrived.destino).toBeNull();
    expect(pinDelCentro(arrived, near(ANSWER), null)).toBeNull();
  });

  it('her drag after it makes the centre hers — the point she left under the pin', () => {
    const dragged = alLlegar(conGesto(afterTheFlight()), near(north(ANSWER, 6)), false, 5_000);
    expect(dragged.autor).toBe('ella');
    expect(pinDelCentro(dragged, near(north(ANSWER, 6)), null)).toEqual(north(ANSWER, 6));
  });

  it('her finger counts even when she does not move the centre, and Android’s gesture flag alone counts', () => {
    expect(alLlegar(conGesto(afterTheFlight()), near(ANSWER), false, 5_000).autor).toBe('ella');
    expect(alLlegar(afterTheFlight(), near(north(ANSWER, 30)), true, 5_000).autor).toBe('ella');
  });

  // An iPhone's map never flags a gesture (react-native-maps 1.27.2): a centre that moved
  // while no move of the app's was under way is her finger — nothing else moves this map.
  it('on an iPhone, no flag and no drag seen: a centre that moved with nothing of the app’s under way is hers', () => {
    expect(alLlegar(afterTheFlight(), near(north(ANSWER, 30)), false, 5_000).autor).toBe('ella');
  });

  it('but a flight cut short with no finger seen is not hers — wherever it stopped', () => {
    const flying = haciaUnPunto(centroAlAbrir(null, CIUDAD), ANSWER, 'otro', 0);
    const stopped = alLlegar(flying, near(north(ANSWER, 400)), false, 300);
    expect(stopped.autor).toBe('otro');
    expect(pinDelCentro(stopped, near(north(ANSWER, 400)), null)).toBeNull();
    // …and its arrival, still expected, is not hers either.
    expect(alLlegar(stopped, near(ANSWER), false, 900).autor).toBe('otro');
  });

  it('a move of the app’s that never reports stops explaining reports after LLEGADA_MS', () => {
    const flying = haciaUnPunto(afterTheFlight(), north(ANSWER, 200), 'otro', 10_000);
    expect(alLlegar(flying, near(north(ANSWER, 50)), false, 10_000 + LLEGADA_MS).autor).toBe('otro');
    expect(alLlegar(flying, near(north(ANSWER, 50)), false, 10_000 + LLEGADA_MS + 1).autor).toBe('ella');
  });

  it('her tap brings her door to the middle, and its arrival is hers', () => {
    const tapped = haciaUnPunto(afterTheFlight(), DOOR, 'ella', 5_000);
    expect(tapped.autor).toBe('otro'); // not yet: the map is still on the answer
    const arrived = alLlegar(tapped, near(DOOR), false, 5_600);
    expect(arrived.autor).toBe('ella');
    expect(pinDelCentro(arrived, near(DOOR), null)).toEqual(DOOR);
  });

  it('a report of the same view — the map resized under the keyboard — changes nothing', () => {
    const theirs = afterTheFlight();
    expect(alLlegar(theirs, fitted(near(north(ANSWER, 1)), 0.6), false, 5_000).autor).toBe('otro');
    const mine = centroAlAbrir(DOOR, openingRegion(DOOR));
    expect(alLlegar(mine, fitted(near(north(DOOR, 1)), 0.6), false, 5_000).autor).toBe('ella');
    // …and her pin stays the same object, not rewritten to the seventh decimal.
    expect(pinDelCentro(mine, near(north(DOOR, 1)), DOOR)).toBe(DOOR);
  });

  it('hers, but the map too far: no pin until she brings it close', () => {
    const wide = near(DOOR, 400);
    const mine = alLlegar(conGesto(centroAlAbrir(null, CIUDAD)), wide, false, 0);
    expect(mine.autor).toBe('ella');
    expect(pinDelCentro(mine, wide, null)).toBeNull();
  });

  it('two centres within MISMO_PUNTO_METROS are one place; a move of the app’s may take LLEGADA_MS to arrive', () => {
    expect(MISMO_PUNTO_METROS).toBe(2);
    expect(metrosEntre(DOOR, north(DOOR, 100))).toBeCloseTo(100, 6);
    expect(metrosEntre(DOOR, { latitude: DOOR.latitude, longitude: DOOR.longitude + 100 / (111_320 * Math.cos((DOOR.latitude * Math.PI) / 180)) })).toBeCloseTo(100, 3);
    // The slowest move the app starts is its flight; LLEGADA_MS must outlast it.
    const map = code('ui/MapaPunto.tsx');
    const volar = Number(/const VOLAR_MS = (\d+);/.exec(map)?.[1]);
    const acercar = Number(/const ACERCAR_MS = (\d+);/.exec(map)?.[1]);
    expect(volar).toBe(900);
    expect(acercar).toBe(600);
    expect(LLEGADA_MS).toBeGreaterThan(Math.max(volar, acercar));
  });

  // On an iPhone ¿Es aquí? is Apple's geocoder, rate-limited per app: one question per settled map.
  it('¿Es aquí? waits for the map to settle', () => {
    expect(ES_AQUI_PAUSA_MS).toBe(400);
  });
});

describe('where the map is, from its two corners', () => {
  it('the centre and the spans', () => {
    const region = regionFromBounds({
      northEast: { latitude: 19.46, longitude: -99.15 },
      southWest: { latitude: 19.44, longitude: -99.17 },
    });
    expect(region.latitude).toBeCloseTo(19.45, 6);
    expect(region.longitude).toBeCloseTo(-99.16, 6);
    expect(region.latitudeDelta).toBeCloseTo(0.02, 6);
    expect(region.longitudeDelta).toBeCloseTo(0.02, 6);
  });

  it('round-trips a region the map was asked for, so a tap reads the view it is in', () => {
    const asked = regionAround(DOOR, CLOSE_METRES);
    const back = regionFromBounds({
      northEast: { latitude: asked.latitude + asked.latitudeDelta / 2, longitude: asked.longitude + asked.longitudeDelta / 2 },
      southWest: { latitude: asked.latitude - asked.latitudeDelta / 2, longitude: asked.longitude - asked.longitudeDelta / 2 },
    });
    expect(metresAcross(back)).toBeCloseTo(CLOSE_METRES, 3);
    expect(closeEnough(back)).toBe(true);
  });

  it('across the antimeridian the span wraps instead of going negative', () => {
    const region = regionFromBounds({
      northEast: { latitude: 1, longitude: -179 },
      southWest: { latitude: -1, longitude: 179 },
    });
    expect(region.longitudeDelta).toBeCloseTo(2, 6);
  });
});

describe('the small map shows the block around her point — hers, or where Google places her address', () => {
  it('wider than the map she moves, so the streets beside it show', () => {
    expect(GLANCE_METRES).toBeGreaterThan(CLOSE_METRES);
    expect(code('ui/MapaFijo.tsx')).toMatch(/region=\{regionAround\(punto, GLANCE_METRES\)\}/);
  });

  it('the pin drawn at its centre is the full map’s own, solid — the region is centred on the point', () => {
    const fijo = code('ui/MapaFijo.tsx');
    expect(fijo).toMatch(/<PinAlCentro suyo \/>/);
    expect(fijo).not.toMatch(/<Marker\b/);
  });

  it('on the same flat map as the one she taps', () => {
    expect(code('ui/MapaFijo.tsx')).toMatch(/mapType=\{TIPO_DE_MAPA\}/);
  });
});

// ⚠️ THE OWNER'S RULINGS OF 2026-10-31 (`10.4c`: the delivery apps use a standard
// street map, never satellite) and 2026-11-03 (`10.4g-i`: Google's, on both phones).
describe('which map she sees', () => {
  it('Google’s standard street map, on an iPhone too', () => {
    expect(TIPO_DE_MAPA).toBe('standard');
  });
});

// ⚠️ HER ADDRESS, AS SHE GAVE IT — the card's first line since `10.4g-i`. What
// Google says is under the pin only warns (`test/buscar.test.ts`).
describe('the card names her address', () => {
  it('the street and number, then the colonia, as she typed them', () => {
    expect(lineaDeSuDireccion({ street: ' General  Anaya ', number: ' 17 ', colonia: 'San Bartolo Ameyalco' })).toBe(
      'General Anaya 17, San Bartolo Ameyalco',
    );
  });

  it('a colonia or a number she left empty is left out', () => {
    expect(lineaDeSuDireccion({ street: 'Hidalgo', number: '5', colonia: '' })).toBe('Hidalgo 5');
    expect(lineaDeSuDireccion({ street: 'Hidalgo', number: ' ', colonia: 'Centro' })).toBe('Hidalgo, Centro');
  });

  it('says nothing while she gave no street — the card keeps its hint', () => {
    expect(lineaDeSuDireccion({ street: '  ', number: '5', colonia: 'Centro' })).toBeNull();
    expect(lineaDeSuDireccion(null)).toBeNull();
  });
});

describe('the map she moves, as wired — decisions no suite can watch happen', () => {
  const map = code('ui/MapaPunto.tsx');

  it('is the flat street map, and every tap and every stop goes through the rules above', () => {
    expect(map).toMatch(/mapType=\{TIPO_DE_MAPA\}/);
    expect(map).not.toMatch(/hybrid|satellite/);
    expect(map).toMatch(/initialRegion=\{first\}/);
    expect(map).toMatch(/onRegionChangeComplete=\{\(next, details\) => llego\(next, details\?\.isGesture === true\)\}/);
    expect(map).toMatch(
      /function llego\(next: Region, gestoDelMapa: boolean\) \{\s*setRegion\(next\);\s*centro\.current = alLlegar\(centro\.current, next, gestoDelMapa, Date\.now\(\)\);/,
    );
    expect(map).toMatch(/onPress=\{\(event\) => void tapped\(event\)\}/);
  });

  it('her finger on the map — a drag, a pinch, a double tap — is seen on both platforms', () => {
    expect(map).toMatch(/onPanDrag=\{gesto\}/);
    expect(map).toMatch(/onDoublePress=\{gesto\}/);
    expect(map).toMatch(/function gesto\(\) \{\s*centro\.current = conGesto\(centro\.current\);\s*\}/);
  });

  it('judges each tap on where the map is at the tap, asked of the map, and brings that point to the middle', () => {
    expect(map).toMatch(/const bounds = await map\.current\?\.getMapBoundaries\(\);/);
    expect(map).toMatch(
      /const now = await whereNow\(\);\s*setRegion\(now\);\s*centro\.current = haciaUnPunto\(centro\.current, point, 'ella', Date\.now\(\)\);\s*map\.current\?\.animateToRegion\(tapOn\(point, now\), ACERCAR_MS\);/,
    );
  });

  it('draws the pin fixed in the middle, taking no touch — and no marker the map would move', () => {
    expect(map).toMatch(/<PinAlCentro suyo=\{pin !== null\} \/>/);
    expect(map).toMatch(/function PinAlCentro[\s\S]*?pointerEvents="none"[\s\S]*?left: '50%',\s*top: '50%',/);
    // the point's centre is the map's: the head and the stem above it, half the point below
    expect(map).toMatch(/marginTop: -\(CABEZA \+ PALO \+ PUNTA \/ 2\)/);
    expect(map).not.toMatch(/<Marker\b/);
  });

  it('hides businesses’ labels on both platforms — a tap on one would not reach the map', () => {
    // Google's map on both phones since `10.4g-i`: its style hides them on each.
    expect(map).toMatch(/customMapStyle=\{SIN_NEGOCIOS\}/);
    expect(code('ui/MapaFijo.tsx')).toMatch(/customMapStyle=\{SIN_NEGOCIOS\}/);
    expect(map).toMatch(/featureType: 'poi', stylers: \[\{ visibility: 'off' \}\]/);
  });

  it('shows no position of hers — this app asks for none', () => {
    expect(map).toMatch(/showsUserLocation=\{false\}/);
    const appJson = JSON.parse(readFileSync(new URL('../app.json', import.meta.url), 'utf8'));
    expect(appJson.expo.android.blockedPermissions).toEqual(
      expect.arrayContaining(['android.permission.ACCESS_COARSE_LOCATION', 'android.permission.ACCESS_FINE_LOCATION']),
    );
  });

  // ⚠️ `10.4h`: she registers on her address screen now, so the line is said there.
  it('and her address screen says, before she saves, that neighbours will see her address and this point', () => {
    expect(code('ui/PantallaDireccion.tsx')).toMatch(/\{ES\.direccion\.vecinos\}/);
    expect(ES.direccion.vecinos).toBe('Los vecinos verán tu dirección y este punto en el mapa.');
  });
});
