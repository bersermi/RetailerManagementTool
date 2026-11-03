// ============================================================================
// HER PIN, IN THE MIDDLE OF THE FLAT STREET MAP — the map she searches and moves.
// Plan tasks `10.4b-iii-b`, `10.4c` and `10.4e` (the owner's ruling of
// 2026-11-02: the search shows the door, and the pin stays in the middle while
// she moves the map under it, as Uber does it).
//
// ⚠️ THE RULES ARE `@/lib/mapa`'S AND `@/lib/buscar`'S, PURE AND PINNED: where it
// opens, when the centre is close enough to be her pin (about a block across),
// who put the centre where it is, where a tap takes the map, how wide an answer
// opens it, and what the list shows as she types. This file only wires them to
// the native map, which no suite can load (ADR-035 §2.11) — the phone is its
// instrument.
//
// ⚠️⚠️ A SEARCH ONLY MOVES THE MAP; HER PIN IS THE CENTRE SHE PUT THERE HERSELF.
// The address she typed is searched as the map opens (`useApertura`); the box
// above lists, as she types, the phone's door once she has typed her number
// (`usePuertas`) over LocationIQ's streets (`useSugerencias`), both with the
// colonia and city she typed in the form when she types none; and the keyboard's *Buscar*
// asks for what she typed (`useBuscar`). Any of them flies the map there
// (`volarA`), and a flight takes the centre from her: the middle of the map is
// then Apple's, Google's or LocationIQ's point, which Apple's licence and
// Google's terms forbid keeping, so `onPin` hears `null` until her own hand moves
// the map — a drag, a pinch, a double tap (`onPanDrag`, `onDoublePress`, Android's
// `isGesture`), or a tap, which brings the point she tapped to the middle.
// `test/buscar.test.ts` reads this file for it. The opening answer moves the map
// only if she has not touched it first: a late answer must never pull the map
// from under her finger.
//
// ⚠️ AN IPHONE'S MAP NEVER SAYS WHETHER A MOVE WAS HER FINGER (`isGesture` is
// Google's only, `react-native-maps` 1.27.2), so `@/lib/mapa`'s `alLlegar` also
// counts a centre that moved while no move of the app's was under way: nothing
// else moves this map.
//
// ⚠️ EACH TAP ASKS THE MAP WHERE IT IS (`getMapBoundaries`) and is judged on that,
// not on the last region the map reported: a tap during an animation, or a
// report that never came, would otherwise be judged against an old view.
// Measured 2026-10-30 on the emulator: a map with no key (a local build)
// delivers taps but never moves, so the zoom, the flights and the pin in the
// middle are the `preview` build's to show.
//
// ⚠️ *¿ES AQUÍ?* is the phone's own maps naming the point under her pin
// (`addressForCoordinate`: Apple's on an iPhone, Google's on Android), asked once
// the map has settled and shown on the card over the map, never kept. On an
// iPhone it is the same rate-limited geocoder as the search. No answer, no line.
//
// ⚠️ THE CARD IS AT THE TOP OF THE MAP, NEVER THE FOOT: Google's logo sits at the
// foot of its map on Android (Apple's and its *Legal* link on an iPhone), and the
// maps' terms forbid covering them — measured 2026-10-31, a card at the foot hid
// Google's logo.
//
// ⚠️ BUSINESSES' LABELS HIDDEN, ON PURPOSE: on Android a tap on one is the label's
// tap (`onPoiClick`), not the map's, so her tap at her own door would do nothing;
// and its point is Google's place, not hers. Streets stay named. Android hides
// them by style; an iPhone by `showsPointsOfInterests`.
//
// ⚠️ NO LOCATION: this app asks for none (`app.json` blocks the permission), so
// there is no "you are here" — she finds her kitchen, the search helping.
// ============================================================================

import { useEffect, useRef, useState } from 'react';
import { Keyboard, Platform, Text, View } from 'react-native';
import MapView, { type MapPressEvent } from 'react-native-maps';

import type { AddressForm, Pin } from '@/api/place';
import { anchoPara, conLasPuertas, preguntaConSuDireccion, type Respuesta } from '@/lib/buscar';
import { LOCATIONIQ_TOKEN, useSugerencias } from '@/lib/locationiq';
import {
  ES_AQUI_PAUSA_MS,
  alLlegar,
  centroAlAbrir,
  closeEnough,
  conGesto,
  haciaUnPunto,
  lineaDeLugar,
  openingRegion,
  pinDelCentro,
  regionAround,
  regionFromBounds,
  tapOn,
  tipoDeMapa,
  type Centro,
  type Region,
} from '@/lib/mapa';
import { useApertura, useBuscar, usePuertas } from '@/lib/telefono';
import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';
import { CampoDeBusqueda, ListaDeSugerencias } from '@/ui/Buscador';

/** Google's map style that hides businesses' labels; roads and their names stay. */
export const SIN_NEGOCIOS = [{ featureType: 'poi', stylers: [{ visibility: 'off' }] }];

/** How long the map takes to come closer, or to bring her tap to the middle, in ms. */
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
  /** The address she typed: searched as the map opens, when the screen opened without a pin. */
  direccion: AddressForm | null;
  /** Told each time the map settles: the centre, once she put it there herself and close in — else `null`. */
  onPin: (pin: Pin | null) => void;
  /** Told when the search box is in use, so the screen gives it the room the keyboard leaves. */
  onBuscando?: (buscando: boolean) => void;
}) {
  const map = useRef<MapView>(null);
  /** She has touched the map, or it has flown to an answer: the opening answer no longer moves it. */
  const tocado = useRef(false);
  const [listo, setListo] = useState(false);
  const [first] = useState<Region>(() => openingRegion(pin));
  /** The screen opened without a pin: only then is the address she typed searched as the map opens. */
  const [sinPin] = useState(pin === null);
  const [region, setRegion] = useState<Region>(first);
  /** Who put the map's centre where it is — her pin only when it was her (`@/lib/mapa`). */
  const centro = useRef<Centro>(centroAlAbrir(pin, first));
  const [texto, setTexto] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [esAqui, setEsAqui] = useState<string | null>(null);
  /** What she asked with *Buscar*, until she types again or the map flies to its answer. */
  const [enviada, setEnviada] = useState<string | null>(null);
  const puertas = usePuertas(buscando ? texto : '', direccion);
  const calles = useSugerencias(buscando ? texto : '', direccion);
  const sugerencias = conLasPuertas(puertas, calles);
  const buscada = useBuscar(enviada);
  const apertura = useApertura(sinPin ? direccion : null);

  function cambiarBuscando(next: boolean) {
    setBuscando(next);
    onBuscando?.(next);
  }

  /**
   * Flies the map to an answer. ⚠️ ONLY THE MAP MOVES — the answer's point is
   * never her pin: the centre is the provider's from the first frame, and hers
   * again only when her own hand moves the map.
   */
  function volarA(respuesta: Respuesta) {
    tocado.current = true;
    centro.current = haciaUnPunto(centro.current, respuesta.punto, 'otro', Date.now());
    onPin(null);
    map.current?.animateToRegion(regionAround(respuesta.punto, anchoPara(respuesta)), VOLAR_MS);
  }

  useEffect(() => {
    if (apertura !== null && listo && !tocado.current) volarA(apertura);
  }, [apertura, listo]);

  // *Buscar*'s answer: the map flies to the first, and the box closes. Nothing
  // found, no signal or a failure stays on the list, said in words.
  useEffect(() => {
    if (buscada.kind !== 'respuestas') return;
    const primera = buscada.respuestas[0];
    setEnviada(null);
    cambiarBuscando(false);
    if (primera !== undefined) volarA(primera);
  }, [buscada]);

  /** The keyboard's *Buscar*: what she typed, with her colonia and city when she typed none. */
  function buscar() {
    const pregunta = preguntaConSuDireccion(texto, direccion);
    if (pregunta !== null) setEnviada(pregunta);
  }

  // ¿Es aquí? — asked of the phone's own maps once the map has settled on a new pin.
  const lat = pin?.latitude ?? null;
  const lng = pin?.longitude ?? null;
  useEffect(() => {
    setEsAqui(null);
    if (lat === null || lng === null || !listo) return;
    let vigente = true;
    const timer = setTimeout(() => {
      map.current?.addressForCoordinate({ latitude: lat, longitude: lng }).then(
        (lugar) => {
          if (vigente) setEsAqui(lineaDeLugar(lugar));
        },
        () => {},
      );
    }, ES_AQUI_PAUSA_MS);
    return () => {
      vigente = false;
      clearTimeout(timer);
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

  /** Her tap: the point she tapped comes to the middle, under the pin — closer while the map is too far. */
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
    centro.current = haciaUnPunto(centro.current, point, 'ella', Date.now());
    map.current?.animateToRegion(tapOn(point, now), ACERCAR_MS);
  }

  /** Her finger is on the map, moving it: the centre it stops on is hers. */
  function gesto() {
    centro.current = conGesto(centro.current);
  }

  /** The map settled: who put the centre there, and so whether it is her pin. */
  function llego(next: Region, gestoDelMapa: boolean) {
    setRegion(next);
    centro.current = alLlegar(centro.current, next, gestoDelMapa, Date.now());
    const suyo = pinDelCentro(centro.current, next, pin);
    if (suyo !== pin) onPin(suyo);
  }

  const hint = pin !== null ? ES.mapa.puesto : closeEnough(region) ? ES.mapa.cerca : ES.mapa.lejos;

  return (
    <View style={{ flex: 1 }}>
      {LOCATIONIQ_TOKEN !== null && (
        <CampoDeBusqueda
          texto={texto}
          onTexto={(next) => {
            setTexto(next);
            setEnviada(null);
            if (!buscando) cambiarBuscando(true);
          }}
          onFoco={() => cambiarBuscando(true)}
          onBorrar={() => {
            setTexto('');
            setEnviada(null);
          }}
          onBuscar={buscar}
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
          onRegionChangeComplete={(next, details) => llego(next, details?.isGesture === true)}
          onPanDrag={gesto}
          onDoublePress={gesto}
          onPress={(event) => void tapped(event)}
          customMapStyle={SIN_NEGOCIOS}
          showsPointsOfInterests={false}
          showsUserLocation={false}
          rotateEnabled={false}
          pitchEnabled={false}
          toolbarEnabled={false}
        />
        <PinAlCentro suyo={pin !== null} />
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
        {buscando && <ListaDeSugerencias sugerencias={enviada !== null ? buscada : sugerencias} onElegir={elegir} />}
      </View>
    </View>
  );
}

/** The pin's head, stem and point, in px. */
const CABEZA = 26;
const PALO = 14;
const PUNTA = 8;

/**
 * ⚠️ THE PIN, FIXED IN THE MIDDLE OF THE MAP, ITS POINT THE EXACT CENTRE the map
 * reports — drawn in views, not a font's glyph, so the point lands on the centre
 * on both platforms. Solid in the app's green once the centre is her pin; hollow
 * and grey before — after a flight to an answer, or while the map is too far — so
 * a proposal never looks decided (the owner's recurring ruling). It takes no
 * touch: her finger reaches the map through it.
 */
function PinAlCentro({ suyo }: { suyo: boolean }) {
  const tinta = suyo ? PALETTE.accion : PALETTE.tintaApagada;
  return (
    <View
      pointerEvents="none"
      accessible={false}
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        width: CABEZA,
        marginLeft: -CABEZA / 2,
        marginTop: -(CABEZA + PALO + PUNTA / 2),
        alignItems: 'center',
      }}
    >
      <View
        style={{
          width: CABEZA,
          height: CABEZA,
          borderRadius: CABEZA / 2,
          backgroundColor: suyo ? tinta : PALETTE.superficie,
          borderWidth: 3,
          borderColor: suyo ? PALETTE.superficie : tinta,
        }}
      />
      <View style={{ width: 3, height: PALO, backgroundColor: tinta }} />
      <View style={{ width: PUNTA, height: PUNTA, borderRadius: PUNTA / 2, backgroundColor: tinta }} />
    </View>
  );
}
