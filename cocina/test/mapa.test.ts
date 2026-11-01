import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  CIUDAD,
  CLOSE_METRES,
  CLOSE_SLACK,
  GLANCE_METRES,
  TAP_ZOOM,
  closeEnough,
  closerAt,
  lineaDeLugar,
  metresAcross,
  openingRegion,
  regionAround,
  regionFromBounds,
  tapOn,
  tipoDeMapa,
  type Region,
} from '@/lib/mapa';

// ============================================================================
// THE MAP'S ARITHMETIC. Plan tasks `10.4b-iii-b` and `10.4c`.
//
// ⚠️ THE MAP ITSELF IS NATIVE AND NO SUITE CAN LOAD IT (ADR-035 §2.11): whether
// the flat map draws, and whether a tap reaches `onPress`, is the phone's.
// What is pinned here is every number the phone would otherwise decide silently:
// where it opens, when a tap places her pin, where a tap that is too far goes —
// and that the taps from the city end in a pin, never in a loop.
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

  it('close around her pin when she has one — close enough that her first tap moves it', () => {
    const region = openingRegion(DOOR);
    expect(region.latitude).toBe(DOOR.latitude);
    expect(region.longitude).toBe(DOOR.longitude);
    expect(closeEnough(fitted(region))).toBe(true);
    expect(tapOn(DOOR, fitted(region)).kind).toBe('place');
  });
});

describe('when a tap places her pin', () => {
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

  it('places the pin where she tapped, as she tapped it', () => {
    expect(tapOn(DOOR, regionAround(DOOR, 80))).toEqual({ kind: 'place', pin: DOOR });
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

  it('never closer than close enough — so the tap after it places the pin', () => {
    const near = regionAround(DOOR, 300);
    expect(metresAcross(closerAt(DOOR, near))).toBeCloseTo(CLOSE_METRES, 0);
  });

  it('from the city, four taps put the pin down — three to come close, one to place — and never loop', () => {
    let region: Region = CIUDAD;
    let taps = 0;
    for (;;) {
      taps += 1;
      const tap = tapOn(DOOR, region);
      if (tap.kind === 'place') break;
      region = fitted(tap.region);
      expect(taps).toBeLessThan(10);
    }
    expect(taps).toBe(4);
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

describe('her kitchen’s screen shows the block around her pin', () => {
  it('wider than the map she taps, so the streets beside it show', () => {
    expect(GLANCE_METRES).toBeGreaterThan(CLOSE_METRES);
    expect(code('ui/MapaFijo.tsx')).toMatch(/region=\{regionAround\(pin, GLANCE_METRES\)\}/);
  });

  it('on the same flat map as the one she taps', () => {
    expect(code('ui/MapaFijo.tsx')).toMatch(/mapType=\{tipoDeMapa\(Platform\.OS\)\}/);
  });
});

// ⚠️ THE OWNER'S RULING OF 2026-10-31 (`10.4c`): the delivery apps use a standard
// street map, never satellite.
describe('which map she sees', () => {
  it('Apple’s muted street map on an iPhone, Google’s standard one on Android', () => {
    expect(tipoDeMapa('ios')).toBe('mutedStandard');
    expect(tipoDeMapa('android')).toBe('standard');
  });
});

// ⚠️ SHOWN AND NEVER KEPT: the line is Apple's or Google's (`addressForCoordinate`).
describe('¿Es aquí? — what the phone’s own maps call the point she tapped', () => {
  it('the street and number, then the colonia', () => {
    expect(lineaDeLugar({ thoroughfare: 'Calle Durango', subThoroughfare: '220', subLocality: 'Roma Norte' })).toBe(
      'Calle Durango 220, Roma Norte',
    );
  });

  // `react-native-maps` 1.27.2 formats each CLPlacemark field with `%@`, so an
  // iPhone sends a missing one as the text "(null)"; Android sends JSON null.
  it('reads an iPhone’s "(null)" and Android’s null as nothing', () => {
    expect(lineaDeLugar({ thoroughfare: 'Calle Durango', subThoroughfare: '(null)', subLocality: 'Roma Norte' })).toBe(
      'Calle Durango, Roma Norte',
    );
    expect(lineaDeLugar({ thoroughfare: 'Calle Durango', subThoroughfare: null, subLocality: null })).toBe('Calle Durango');
    expect(lineaDeLugar({ thoroughfare: ' Calle 6 ', subThoroughfare: ' 46 ', subLocality: '(null)' })).toBe('Calle 6 46');
  });

  it('says nothing when no street is named — no line is better than a wrong one', () => {
    expect(lineaDeLugar({ thoroughfare: '(null)', subThoroughfare: '220', subLocality: 'Roma Norte' })).toBeNull();
    expect(lineaDeLugar({ thoroughfare: 'Unnamed Road', subLocality: 'Ajusco' })).toBeNull();
    expect(lineaDeLugar({ thoroughfare: '', subLocality: 'Roma Norte' })).toBeNull();
    expect(lineaDeLugar(null)).toBeNull();
    expect(lineaDeLugar(undefined)).toBeNull();
    expect(lineaDeLugar({ thoroughfare: 42 })).toBeNull();
  });
});

describe('the map she taps, as wired — decisions no suite can watch happen', () => {
  const map = code('ui/MapaPunto.tsx');

  it('is the flat street map, and every tap goes through the rules above', () => {
    expect(map).toMatch(/mapType=\{tipoDeMapa\(Platform\.OS\)\}/);
    expect(map).not.toMatch(/hybrid|satellite/);
    expect(map).toMatch(/initialRegion=\{first\}/);
    expect(map).toMatch(/onRegionChangeComplete=\{\(next\) => setRegion\(next\)\}/);
    expect(map).toMatch(/onPress=\{\(event\) => void tapped\(event\)\}/);
  });

  it('judges each tap on where the map is at the tap, asked of the map, not on its last report', () => {
    expect(map).toMatch(/const bounds = await map\.current\?\.getMapBoundaries\(\);/);
    expect(map).toMatch(/const now = await whereNow\(\);\s*setRegion\(now\);\s*const tap = tapOn\(point, now\);/);
  });

  it('hides businesses’ labels on both platforms — a tap on one would not reach the map', () => {
    expect(map).toMatch(/customMapStyle=\{SIN_NEGOCIOS\}/);
    expect(map).toMatch(/showsPointsOfInterests=\{false\}/);
    expect(map).toMatch(/featureType: 'poi', stylers: \[\{ visibility: 'off' \}\]/);
  });

  it('shows no position of hers — this app asks for none', () => {
    expect(map).toMatch(/showsUserLocation=\{false\}/);
    const appJson = JSON.parse(readFileSync(new URL('../app.json', import.meta.url), 'utf8'));
    expect(appJson.expo.android.blockedPermissions).toEqual(
      expect.arrayContaining(['android.permission.ACCESS_COARSE_LOCATION', 'android.permission.ACCESS_FINE_LOCATION']),
    );
  });

  it('and the screen says, before she saves, that neighbours will see this exact spot', () => {
    expect(code('ui/PantallaPunto.tsx')).toMatch(/\{ES\.mapa\.vecinos\}/);
  });
});
