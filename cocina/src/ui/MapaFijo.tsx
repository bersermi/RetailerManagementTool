// ============================================================================
// HER KITCHEN ON A SMALL MAP — a still picture around a point. Plan tasks
// `10.4b-iii-b`, `10.4c`, `10.4g-i` and `10.4h` (the owner's ruling of
// 2026-11-03, address first: *"the pin seems set in the map in small (the user
// can change it if he clicks on the map) but he doesn't have to tap the map at
// all"*).
//
// ⚠️ THE POINT IS HER OWN, OR WHERE GOOGLE PLACES HER ADDRESS — drawn the same,
// because the address is what is kept and the pin is only indicative (his words).
// Google's point is the one the address screen is shown for the boxes as she types
// (`@/lib/useGoogle`'s `useDondeEsta`), and on her kitchen's screen the copy of it
// the database keeps for 30 days (`useDondeEstaSuCocina`, `10.5-i-b-ii`); hers is
// `0072`'s pin. The screen decides which and says what to do (`Si el punto no es tu
// puerta, toca el mapa.`).
//
// ⚠️ THE MAP ITSELF TAKES NO TOUCH: moving the pin is *Ajusta el punto*'s screen,
// where the rules are (`@/ui/MapaPunto`). With `onAjustar` the whole picture is one
// button that opens it, and says so in a tag at its top — never at its foot, where
// Google's logo is (its terms forbid covering it). On Android it is Google's lite
// mode — a picture, not a live map; an iPhone draws a live map with every gesture
// off. Google's flat street map on both phones (`TIPO_DE_MAPA`), no businesses'
// labels — Google's on an iPhone too: its terms keep its search off any other map
// (3.2.3(e)).
//
// ⚠️ THE PIN IS DRAWN IN VIEWS AT THE CENTRE (`PinAlCentro`, the full map's own),
// not a marker: the region is centred on the point, and lite mode and both phones
// then draw the same pin in the app's green.
//
// ⚠️ NO POINT — her address not whole yet, being looked up, not found, no signal,
// or a build with no key — draws a quiet box of the same size with the sentence
// the screen hands in; still a button when `onAjustar` is given, so a kitchen
// Google cannot place can set her own point.
// ============================================================================

import { Pressable, Text, View } from 'react-native';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';

import type { Pin } from '@/api/place';
import { GLANCE_METRES, TIPO_DE_MAPA, regionAround } from '@/lib/mapa';
import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';
import { PinAlCentro, SIN_NEGOCIOS } from '@/ui/MapaPunto';

/** How tall the picture is, in points: the block around her door, and room to read below it. */
const ALTO = 160;

export function MapaFijo({
  punto,
  sinPunto = null,
  onAjustar,
}: {
  /** Her own point, or where Google places her address; `null` when there is none to draw. */
  punto: Pin | null;
  /** What the box says when there is no point. */
  sinPunto?: string | null;
  /** Opens *Ajusta el punto*; without it the picture takes no touch. */
  onAjustar?: () => void;
}) {
  const caja = {
    height: ALTO,
    borderRadius: SIZE.space * 0.75,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: PALETTE.linea,
  } as const;

  const dibujo =
    punto === null ? (
      <View
        style={{
          ...caja,
          backgroundColor: PALETTE.banda,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: SIZE.space * 2,
        }}
      >
        {sinPunto !== null && (
          <Text style={{ fontSize: SIZE.bodySize, color: PALETTE.tintaApagada, textAlign: 'center' }}>{sinPunto}</Text>
        )}
      </View>
    ) : (
      <View pointerEvents="none" style={caja}>
        <MapView
          style={{ flex: 1 }}
          provider={PROVIDER_GOOGLE}
          liteMode
          mapType={TIPO_DE_MAPA}
          region={regionAround(punto, GLANCE_METRES)}
          customMapStyle={SIN_NEGOCIOS}
          scrollEnabled={false}
          zoomEnabled={false}
          rotateEnabled={false}
          pitchEnabled={false}
          toolbarEnabled={false}
        />
        <PinAlCentro suyo />
        {onAjustar !== undefined && (
          <View
            style={{
              position: 'absolute',
              top: SIZE.rowGap,
              right: SIZE.rowGap,
              paddingVertical: SIZE.rowGap / 2,
              paddingHorizontal: SIZE.rowGap,
              borderRadius: SIZE.rowGap,
              backgroundColor: PALETTE.superficie,
              borderWidth: 1,
              borderColor: PALETTE.linea,
            }}
          >
            <Text style={{ fontSize: SIZE.smallSize, fontWeight: '700', color: PALETTE.accion }}>{ES.direccion.ajustarEtiqueta}</Text>
          </View>
        )}
      </View>
    );

  if (onAjustar === undefined) return dibujo;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={ES.direccion.ajustarNombre} onPress={onAjustar}>
      {dibujo}
    </Pressable>
  );
}
