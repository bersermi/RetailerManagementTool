// ============================================================================
// HER PIN, ON THE FLAT STREET MAP — the map she searches and taps. Plan tasks
// `10.4b-iii-b` and `10.4c` (the owner's ruling of 2026-10-31: as the big apps
// do it, within every provider's terms).
//
// ⚠️ THE RULES ARE `@/lib/mapa`'S AND `@/lib/buscar`'S, PURE AND PINNED: where it
// opens, when a tap places the pin (close enough: about a block across), where a
// tap that is still too far takes the map, and how wide an answer opens it. This
// file only wires them to the native map, which no suite can load (ADR-035
// §2.11) — the phone is its instrument.
//
// ⚠️⚠️ A SEARCH ONLY MOVES THE MAP; HER TAP IS THE PIN. The address she typed is
// searched as the map opens (`useApertura`) and the box above searches as she
// types (`useSugerencias`, with the colonia she typed in the form when she types
// none — measured, it decides the answer); either one flies the map there, and `onPin` is
// called from her tap alone (`tapped`) — never with a point a provider gave,
// which Apple's licence and Google's terms forbid keeping (`test/buscar.test.ts`
// reads this file for it). The opening answer moves the map only if she has not
// touched it first: a late answer must never pull the map from under her finger.
//
// ⚠️ EACH TAP ASKS THE MAP WHERE IT IS (`getMapBoundaries`) and is judged on that,
// not on the last region the map reported: a tap during an animation, or a
// report that never came, would otherwise be judged against an old view.
// Measured 2026-10-30 on the emulator: a map with no key (a local build)
// delivers taps but never moves, so the zoom and the flights are the `preview`
// build's to show.
//
// ⚠️ *¿ES AQUÍ?* is the phone's own maps naming the point she tapped
// (`addressForCoordinate`: Apple's on an iPhone, Google's on Android), shown on
// the card over the map and never kept. No answer, no line.
//
// ⚠️ THE CARD IS AT THE TOP OF THE MAP, NEVER THE FOOT: Google's logo sits at the
// foot of its map on Android (Apple's and its *Legal* link on an iPhone), and the
// maps' terms forbid covering them — measured 2026-10-31, a card at the foot hid
// Google's logo.
//
// ⚠️ BUSINESSES' LABELS HIDDEN, ON PURPOSE: on Android a tap on one is the label's
// tap (`onPoiClick`), not the map's, so her tap at her own door would do nothing;
// and its point is Google's place, not where she tapped. Streets stay named.
// Android hides them by style; an iPhone by `showsPointsOfInterests`.
//
// ⚠️ NO LOCATION: this app asks for none (`app.json` blocks the permission), so
// there is no "you are here" — she finds her kitchen, the search helping.
// ============================================================================

import { useEffect, useRef, useState } from 'react';
import { Keyboard, Platform, Text, View } from 'react-native';
import MapView, { Marker, type MapPressEvent } from 'react-native-maps';

import type { AddressForm, Pin } from '@/api/place';
import { anchoPara, type Respuesta } from '@/lib/buscar';
import { LOCATIONIQ_TOKEN, useApertura, useSugerencias } from '@/lib/locationiq';
import {
  closeEnough,
  lineaDeLugar,
  openingRegion,
  regionAround,
  regionFromBounds,
  tapOn,
  tipoDeMapa,
  type Region,
} from '@/lib/mapa';
import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';
import { CampoDeBusqueda, ListaDeSugerencias } from '@/ui/Buscador';

/** Google's map style that hides businesses' labels; roads and their names stay. */
export const SIN_NEGOCIOS = [{ featureType: 'poi', stylers: [{ visibility: 'off' }] }];

/** How long the map takes to come closer after a tap, in ms. */
const ACERCAR_MS = 600;

/** How long the map takes to fly to an answer, in ms. */
const VOLAR_MS = 900;

export function MapaPunto({
  pin,
  direccion,
  onPin,
  onBuscando,
}: {
  pin: Pin | null;
  /** The address she typed: searched as the map opens, while she has no pin. */
  direccion: AddressForm | null;
  onPin: (pin: Pin) => void;
  /** Told when the search box is in use, so the screen gives it the room the keyboard leaves. */
  onBuscando?: (buscando: boolean) => void;
}) {
  const map = useRef<MapView>(null);
  /** She has moved the map, or it has flown to an answer: the opening answer no longer moves it. */
  const tocado = useRef(false);
  const [listo, setListo] = useState(false);
  const [first] = useState<Region>(() => openingRegion(pin));
  const [region, setRegion] = useState<Region>(first);
  const [texto, setTexto] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [esAqui, setEsAqui] = useState<string | null>(null);
  const sugerencias = useSugerencias(buscando ? texto : '', direccion?.colonia ?? '');
  const apertura = useApertura(pin === null ? direccion : null);

  function cambiarBuscando(next: boolean) {
    setBuscando(next);
    onBuscando?.(next);
  }

  /** Flies the map to an answer. ⚠️ ONLY THE MAP MOVES — the answer is never her pin. */
  function volarA(respuesta: Respuesta) {
    tocado.current = true;
    map.current?.animateToRegion(regionAround(respuesta.punto, anchoPara(respuesta)), VOLAR_MS);
  }

  useEffect(() => {
    if (apertura !== null && listo && !tocado.current) volarA(apertura);
  }, [apertura, listo]);

  // ¿Es aquí? — asked of the phone's own maps each time her pin moves.
  const lat = pin?.latitude ?? null;
  const lng = pin?.longitude ?? null;
  useEffect(() => {
    setEsAqui(null);
    if (lat === null || lng === null || !listo) return;
    let vigente = true;
    map.current?.addressForCoordinate({ latitude: lat, longitude: lng }).then(
      (lugar) => {
        if (vigente) setEsAqui(lineaDeLugar(lugar));
      },
      () => {},
    );
    return () => {
      vigente = false;
    };
  }, [lat, lng, listo]);

  /** Where the map is now — asked of the map; the last region it reported if it cannot say. */
  async function whereNow(): Promise<Region> {
    try {
      const bounds = await map.current?.getMapBoundaries();
      return bounds === undefined ? region : regionFromBounds(bounds);
    } catch {
      return region;
    }
  }

  function elegir(respuesta: Respuesta) {
    setTexto(respuesta.titulo);
    Keyboard.dismiss();
    cambiarBuscando(false);
    volarA(respuesta);
  }

  async function tapped(event: MapPressEvent) {
    // A tap on the map while the box is open closes the box, and does nothing else.
    if (buscando) {
      Keyboard.dismiss();
      cambiarBuscando(false);
      return;
    }
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
      {LOCATIONIQ_TOKEN !== null && (
        <CampoDeBusqueda
          texto={texto}
          onTexto={(next) => {
            setTexto(next);
            if (!buscando) cambiarBuscando(true);
          }}
          onFoco={() => cambiarBuscando(true)}
          onBorrar={() => setTexto('')}
        />
      )}
      <View
        style={{ flex: 1 }}
        onTouchStart={() => {
          tocado.current = true;
        }}
      >
        <MapView
          ref={map}
          style={{ flex: 1 }}
          mapType={tipoDeMapa(Platform.OS)}
          initialRegion={first}
          onMapReady={() => setListo(true)}
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
        {!buscando && (
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
              gap: SIZE.rowGap / 2,
            }}
          >
            {pin !== null && esAqui !== null ? (
              <>
                <Text style={{ fontSize: SIZE.bodySize, fontWeight: '600', color: PALETTE.tinta }}>
                  {ES.mapa.esAqui(esAqui)}
                </Text>
                <Text style={{ fontSize: SIZE.smallSize, color: PALETTE.tintaApagada }}>{ES.mapa.otraVez}</Text>
              </>
            ) : (
              <Text style={{ fontSize: SIZE.bodySize, fontWeight: '600', color: PALETTE.tinta }}>{hint}</Text>
            )}
          </View>
        )}
        {buscando && <ListaDeSugerencias sugerencias={sugerencias} onElegir={elegir} />}
      </View>
    </View>
  );
}
