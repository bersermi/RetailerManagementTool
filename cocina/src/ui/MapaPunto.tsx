// ============================================================================
// HER PIN, IN THE MIDDLE OF THE FLAT STREET MAP — the map she searches and moves.
// Plan tasks `10.4b-iii-b`, `10.4c`, `10.4e` (the owner's ruling of 2026-11-02:
// the search shows the door, and the pin stays in the middle while she moves the
// map under it, as Uber does it), `10.4g-i` (his of 2026-11-03: Google on both
// phones) and `10.4h` (his of the same evening, address first: this is *Ajusta el
// punto*, reached only if she wants her own point, and it opens where the small
// map placed her address — `abreEn` — with the centre still not hers).
//
// ⚠️ THE RULES ARE `@/lib/mapa`'S AND `@/lib/google`'S, PURE AND PINNED: where it
// opens, when the centre is close enough to be her pin (about a block across),
// who put the centre where it is, where a tap takes the map, how wide an answer
// opens it, and what the list shows as she types. This file only wires them to
// the native map, which no suite can load (ADR-035 §2.11) — the phone is its
// instrument.
//
// ⚠️⚠️ GOOGLE'S MAP ON BOTH PHONES SINCE `10.4g-i` (the owner's ruling of
// 2026-11-03; an iPhone drew Apple's before): Google's terms let its search be
// shown only with its own map (3.2.3(e)), and Apple's answers only on Apple's.
//
// ⚠️⚠️ A SEARCH ONLY MOVES THE MAP; HER PIN IS THE CENTRE SHE PUT THERE HERSELF.
// The address she typed is searched as the map opens (`useApertura`, Google's
// Geocoding); the box above lists Google's suggestions as she types
// (`useSugerencias`), with the colonia and city she typed in the form when she
// types none, and a pick's details say where it is (`detallar`); and the
// keyboard's *Buscar* asks Geocoding for what she typed (`useBuscar`). Any of
// them flies the map there (`volarA`), and a flight takes the centre from her: the
// middle of the map is then Google's point, which its terms forbid keeping, so
// `onPin` hears `null` until her own hand moves the map — a drag, a pinch, a
// double tap (`onPanDrag`, `onDoublePress`, `isGesture`), or a tap, which brings
// the point she tapped to the middle. `test/buscar.test.ts` reads this file for
// it. The opening answer moves the map only if she has not touched it first: a
// late answer must never pull the map from under her finger.
//
// ⚠️ GOOGLE'S MAP SAYS WHETHER A MOVE WAS HER FINGER ON BOTH PHONES (`isGesture`,
// `react-native-maps` 1.27.2's `AIRGoogleMap.mm` too), but `@/lib/mapa`'s
// `alLlegar` still counts a centre that moved while no move of the app's was
// under way, as it did for Apple's map: nothing else moves this map.
//
// ⚠️ EACH TAP ASKS THE MAP WHERE IT IS (`getMapBoundaries`) and is judged on that,
// not on the last region the map reported: a tap during an animation, or a
// report that never came, would otherwise be judged against an old view.
// Measured 2026-10-30 on the emulator: a map with no key (a local build)
// delivers taps but never moves, so the zoom, the flights and the pin in the
// middle are the `preview` build's to show.
//
// ⚠️ THE CARD NAMES HER OWN ADDRESS ONCE THE PIN IS HERS (`10.4g-i`), and warns
// only when Google names another street under the pin (`useCalleBajoElPin`, then
// `@/lib/google`'s `otraCalle`) — shown, never kept. It no longer asks the phone
// (`addressForCoordinate` is Apple's geocoder on an iPhone whatever the map,
// `react-native-maps` 1.27.2's `RNMapsAirModule.mm`). No answer, no warning.
//
// ⚠️ THE CARD IS AT THE TOP OF THE MAP, NEVER THE FOOT: Google's logo sits at the
// foot of its map, and its terms forbid covering it — measured 2026-10-31, a card
// at the foot hid Google's logo.
//
// ⚠️ BUSINESSES' LABELS HIDDEN, ON PURPOSE: on Android a tap on one is the label's
// tap (`onPoiClick`), not the map's, so her tap at her own door would do nothing;
// and its point is Google's place, not hers. Streets stay named. Google's map hides
// them by style, on both phones.
//
// ⚠️ NO LOCATION: this app asks for none (`app.json` blocks the permission), so
// there is no "you are here" — she finds her kitchen, the search helping.
// ============================================================================

import { useEffect, useRef, useState } from 'react';
import { Keyboard, Text, View } from 'react-native';
import MapView, { PROVIDER_GOOGLE, type MapPressEvent } from 'react-native-maps';

import { EMPTY_ADDRESS, type AddressForm, type Pin } from '@/api/place';
import { anchoPara, otraCalle, preguntaConSuDireccion, type Destino, type Sugerencia, type Sugerencias } from '@/lib/google';
import {
  TIPO_DE_MAPA,
  alLlegar,
  centroAlAbrir,
  closeEnough,
  conGesto,
  haciaUnPunto,
  lineaDeSuDireccion,
  openingRegion,
  pinDelCentro,
  regionAround,
  regionFromBounds,
  tapOn,
  type Centro,
  type Region,
} from '@/lib/mapa';
import { CLAVE, detallar, useApertura, useBuscar, useCalleBajoElPin, useSesion, useSugerencias } from '@/lib/useGoogle';
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
  abreEn = null,
  onPin,
  onBuscando,
}: {
  pin: Pin | null;
  /** The address she typed: searched as the map opens, when the screen opened without a pin or `abreEn`. */
  direccion: AddressForm | null;
  /**
   * ⚠️ WHERE THE SMALL MAP PLACED HER ADDRESS (`10.4h`): with no pin of hers the map
   * opens there, at once, and the centre is Google's — not hers until she moves it.
   */
  abreEn?: Destino | null;
  /** Told each time the map settles: the centre, once she put it there herself and close in — else `null`. */
  onPin: (pin: Pin | null) => void;
  /** Told when the search box is in use, so the screen gives it the room the keyboard leaves. */
  onBuscando?: (buscando: boolean) => void;
}) {
  const map = useRef<MapView>(null);
  /** Where it opens: her pin; else where the small map placed her address; else the city. */
  const [abreAhi] = useState(pin === null && abreEn !== null ? abreEn : null);
  /** She has touched the map, or it has flown to an answer, or it opened on one: the opening answer no longer moves it. */
  const tocado = useRef(abreAhi !== null);
  const [listo, setListo] = useState(false);
  const [first] = useState<Region>(() =>
    abreAhi !== null ? regionAround(abreAhi.punto, anchoPara(abreAhi)) : openingRegion(pin),
  );
  /** The screen opened with neither: only then is the address she typed searched as the map opens. */
  const [sinPin] = useState(pin === null && abreAhi === null);
  const [region, setRegion] = useState<Region>(first);
  /** Who put the map's centre where it is — her pin only when it was her (`@/lib/mapa`). */
  const centro = useRef<Centro>(centroAlAbrir(pin, first));
  const [texto, setTexto] = useState('');
  const [buscando, setBuscando] = useState(false);
  /** What she asked with *Buscar*, until she types again or the map flies to its answer. */
  const [enviada, setEnviada] = useState<string | null>(null);
  /** Her pick's details on their way, or why they never came — shown in the list; `null` otherwise. */
  const [eligiendo, setEligiendo] = useState<Sugerencias | null>(null);
  const sesion = useSesion();
  const sugerencias = useSugerencias(buscando ? texto : '', direccion, sesion);
  const buscada = useBuscar(enviada);
  const apertura = useApertura(sinPin ? direccion : null);
  /** The card: her address as she gave it, and the street Google names under her pin. */
  const linea = lineaDeSuDireccion(direccion);
  const suCalle = linea === null ? null : (direccion?.street.trim() ?? null);
  const bajoElPin = useCalleBajoElPin(pin, suCalle);
  const aviso = pin !== null && suCalle !== null && otraCalle(suCalle, bajoElPin) ? bajoElPin : null;

  function cambiarBuscando(next: boolean) {
    setBuscando(next);
    onBuscando?.(next);
  }

  /**
   * Flies the map to an answer. ⚠️ ONLY THE MAP MOVES — the answer's point is
   * never her pin: the centre is the provider's from the first frame, and hers
   * again only when her own hand moves the map.
   */
  function volarA(destino: Destino) {
    tocado.current = true;
    centro.current = haciaUnPunto(centro.current, destino.punto, 'otro', Date.now());
    onPin(null);
    map.current?.animateToRegion(regionAround(destino.punto, anchoPara(destino)), VOLAR_MS);
  }

  useEffect(() => {
    if (apertura !== null && listo && !tocado.current) volarA(apertura);
  }, [apertura, listo]);

  // *Buscar*'s answer: the map flies there, and the box closes. Nothing found,
  // no signal or a failure stays on the list, said in words.
  useEffect(() => {
    if (buscada.kind !== 'destino') return;
    setEnviada(null);
    cambiarBuscando(false);
    volarA(buscada.destino);
  }, [buscada]);

  /** The keyboard's *Buscar*: what she typed, with her colonia and city when she typed none. */
  function buscar() {
    const pregunta = preguntaConSuDireccion(texto, direccion);
    if (pregunta !== null) setEnviada(pregunta);
  }

  /** Where the map is now — asked of the map; the last region it reported if it cannot say. */
  async function whereNow(): Promise<Region> {
    try {
      const bounds = await map.current?.getMapBoundaries();
      return bounds === undefined ? region : regionFromBounds(bounds);
    } catch {
      return region;
    }
  }

  /**
   * Her pick: its details say where it is, and end her search's session. The
   * list says *Buscando…* meanwhile, and why if they never come; she may type on.
   * On this screen a pick only moves the map — her five boxes are the form's.
   */
  async function elegir(sugerencia: Sugerencia) {
    setTexto(sugerencia.titulo);
    Keyboard.dismiss();
    setEligiendo({ kind: 'buscando' });
    const lugar = await detallar(sugerencia, sesion.token(), direccion ?? EMPTY_ADDRESS);
    sesion.cerrar();
    if (lugar === null || lugar === 'sin-senal') {
      setEligiendo({ kind: lugar === null ? 'falla' : 'sin-senal' });
      return;
    }
    setEligiendo(null);
    cambiarBuscando(false);
    volarA(lugar);
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
      {CLAVE !== null && (
        <CampoDeBusqueda
          texto={texto}
          onTexto={(next) => {
            setTexto(next);
            setEnviada(null);
            setEligiendo(null);
            if (!buscando) cambiarBuscando(true);
          }}
          onFoco={() => cambiarBuscando(true)}
          onBorrar={() => {
            setTexto('');
            setEnviada(null);
            setEligiendo(null);
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
          provider={PROVIDER_GOOGLE}
          mapType={TIPO_DE_MAPA}
          initialRegion={first}
          onMapReady={() => setListo(true)}
          onRegionChangeComplete={(next, details) => llego(next, details?.isGesture === true)}
          onPanDrag={gesto}
          onDoublePress={gesto}
          onPress={(event) => void tapped(event)}
          customMapStyle={SIN_NEGOCIOS}
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
            {pin !== null && linea !== null ? (
              <>
                <Text style={{ fontSize: SIZE.bodySize, fontWeight: '600', color: PALETTE.tinta }}>
                  {ES.mapa.suDireccion(linea)}
                </Text>
                {aviso !== null && suCalle !== null ? (
                  <Text style={{ fontSize: SIZE.smallSize, fontWeight: '600', color: PALETTE.error }}>
                    {ES.mapa.otraCalle(aviso, suCalle)}
                  </Text>
                ) : (
                  <Text style={{ fontSize: SIZE.smallSize, color: PALETTE.tintaApagada }}>{ES.mapa.otraVez}</Text>
                )}
              </>
            ) : (
              <Text style={{ fontSize: SIZE.bodySize, fontWeight: '600', color: PALETTE.tinta }}>{hint}</Text>
            )}
          </View>
        )}
        {buscando && (
          <ListaDeSugerencias
            sugerencias={eligiendo ?? (enviada === null ? sugerencias : buscada.kind === 'destino' || buscada.kind === 'nada' ? { kind: 'buscando' } : buscada)}
            onElegir={(sugerencia) => void elegir(sugerencia)}
          />
        )}
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
export function PinAlCentro({ suyo }: { suyo: boolean }) {
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
