// ============================================================================
// HER PIN, ON THE SATELLITE VIEW — the map she taps. Plan task `10.4b-iii-b`.
//
// ⚠️ THE RULES ARE `@/lib/mapa`'S, PURE AND PINNED: where it opens (the city, or
// close around her pin), when a tap places the pin (close enough: about a block
// across) and where a tap that is still too far takes the map (closer, centred
// on the tap). This file only wires them to the native map, which no suite can
// load (ADR-035 §2.11) — the phone is its instrument.
//
// ⚠️ EACH TAP ASKS THE MAP WHERE IT IS (`getMapBoundaries`) and is judged on that,
// not on the last region the map reported: a tap during the zoom's animation, or
// a report that never came, would otherwise be judged against an old view. The
// reported region still drives the hint. Measured 2026-10-30 on the emulator: a
// map with no key (a local build) delivers taps but never moves, so the zoom and
// the satellite view are the `preview` build's to show.
//
// ⚠️ SATELLITE WITH THE STREETS' NAMES (`hybrid`), NOT BARE SATELLITE: from the
// whole city, unlabelled roofs give her no way to find her street; the names do,
// and close in the roofs are the precision the owner asked for.
//
// ⚠️ BUSINESSES' LABELS HIDDEN, ON PURPOSE: on Android a tap on one is the label's
// tap (`onPoiClick`), not the map's, so her tap at her own door would do nothing;
// and its point is Google's place, not where she tapped. Streets stay named.
// Android hides them by style; an iPhone by `showsPointsOfInterests`.
//
// ⚠️ NO LOCATION: this app asks for none (`app.json` blocks the permission), so
// there is no "you are here" — she finds her kitchen herself.
// ============================================================================

import { useRef, useState } from 'react';
import { Text, View } from 'react-native';
import MapView, { Marker, type MapPressEvent } from 'react-native-maps';

import type { Pin } from '@/api/place';
import { closeEnough, openingRegion, regionFromBounds, tapOn, type Region } from '@/lib/mapa';
import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';

/** Google's map style that hides businesses' labels; roads and their names stay. */
export const SIN_NEGOCIOS = [{ featureType: 'poi', stylers: [{ visibility: 'off' }] }];

/** How long the map takes to come closer after a tap, in ms. */
const ACERCAR_MS = 600;

export function MapaPunto({ pin, onPin }: { pin: Pin | null; onPin: (pin: Pin) => void }) {
  const map = useRef<MapView>(null);
  const [first] = useState<Region>(() => openingRegion(pin));
  const [region, setRegion] = useState<Region>(first);

  /** Where the map is now — asked of the map; the last region it reported if it cannot say. */
  async function whereNow(): Promise<Region> {
    try {
      const bounds = await map.current?.getMapBoundaries();
      return bounds === undefined ? region : regionFromBounds(bounds);
    } catch {
      return region;
    }
  }

  async function tapped(event: MapPressEvent) {
    const point = event.nativeEvent.coordinate;
    const now = await whereNow();
    setRegion(now);
    const tap = tapOn(point, now);
    if (tap.kind === 'place') onPin(tap.pin);
    else map.current?.animateToRegion(tap.region, ACERCAR_MS);
  }

  const hint = pin !== null ? ES.mapa.puesto : closeEnough(region) ? ES.mapa.cerca : ES.mapa.lejos;

  return (
    <View style={{ flex: 1 }}>
      <MapView
        ref={map}
        style={{ flex: 1 }}
        mapType="hybrid"
        initialRegion={first}
        onRegionChangeComplete={(next) => setRegion(next)}
        onPress={(event) => void tapped(event)}
        customMapStyle={SIN_NEGOCIOS}
        showsPointsOfInterests={false}
        showsUserLocation={false}
        rotateEnabled={false}
        pitchEnabled={false}
        toolbarEnabled={false}
        moveOnMarkerPress={false}
      >
        {pin !== null && <Marker coordinate={pin} />}
      </MapView>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: SIZE.space,
          left: SIZE.space,
          right: SIZE.space,
          paddingVertical: SIZE.rowGap,
          paddingHorizontal: SIZE.space,
          borderRadius: SIZE.space * 0.75,
          backgroundColor: PALETTE.superficie,
          borderWidth: 1,
          borderColor: PALETTE.linea,
        }}
      >
        <Text style={{ fontSize: SIZE.bodySize, fontWeight: '600', color: PALETTE.tinta }}>{hint}</Text>
      </View>
    </View>
  );
}
