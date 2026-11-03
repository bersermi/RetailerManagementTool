// ============================================================================
// HER PIN, SHOWN — a still picture of the map around it on her kitchen's screen.
// Plan tasks `10.4b-iii-b`, `10.4c` and `10.4g-i`.
//
// ⚠️ IT TAKES NO TOUCH: moving the pin is *Cambiar el punto*'s screen, where the
// rules are (`@/ui/MapaPunto`). On Android it is Google's lite mode — a picture,
// not a live map, cheap on the screen she opens most; an iPhone draws a live map
// with every gesture off. The same view as the map she tapped: Google's flat
// street map on both phones (`TIPO_DE_MAPA`, the owner's rulings of 2026-10-31 and
// 2026-11-03), no businesses' labels — and Google's, not Apple's, on an iPhone
// too: Google's terms keep its search off any other map (3.2.3(e)).
// ============================================================================

import { View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

import type { Pin } from '@/api/place';
import { GLANCE_METRES, TIPO_DE_MAPA, regionAround } from '@/lib/mapa';
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
        provider={PROVIDER_GOOGLE}
        liteMode
        mapType={TIPO_DE_MAPA}
        region={regionAround(pin, GLANCE_METRES)}
        customMapStyle={SIN_NEGOCIOS}
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
