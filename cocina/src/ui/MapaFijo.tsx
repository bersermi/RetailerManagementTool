// ============================================================================
// HER PIN, SHOWN — a still picture of the map around it on her kitchen's screen.
// Plan tasks `10.4b-iii-b` and `10.4c`.
//
// ⚠️ IT TAKES NO TOUCH: moving the pin is *Cambiar el punto*'s screen, where the
// rules are (`@/ui/MapaPunto`). On Android it is Google's lite mode — a picture,
// not a live map, cheap on the screen she opens most; an iPhone draws a live map
// with every gesture off. The same view as the map she tapped: the flat street
// map (`tipoDeMapa`, the owner's ruling of 2026-10-31), no businesses' labels.
// ============================================================================

import { Platform, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import type { Pin } from '@/api/place';
import { GLANCE_METRES, regionAround, tipoDeMapa } from '@/lib/mapa';
import { PALETTE, SIZE } from '@/theme/palette';
import { SIN_NEGOCIOS } from '@/ui/MapaPunto';

/** How tall the picture is, in points: wide enough to see the block, short enough to read below it. */
const ALTO = 200;

export function MapaFijo({ pin }: { pin: Pin }) {
  return (
    <View
      pointerEvents="none"
      style={{
        height: ALTO,
        borderRadius: SIZE.space * 0.75,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: PALETTE.linea,
      }}
    >
      <MapView
        style={{ flex: 1 }}
        liteMode
        mapType={tipoDeMapa(Platform.OS)}
        region={regionAround(pin, GLANCE_METRES)}
        customMapStyle={SIN_NEGOCIOS}
        showsPointsOfInterests={false}
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
        toolbarEnabled={false}
      >
        <Marker coordinate={pin} />
      </MapView>
    </View>
  );
}
