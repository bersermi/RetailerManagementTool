import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

import type { Punto } from '@/api/cocinas';
import { agrupar, alTocarGrupo, camaraDe, DIAMETRO, DIAMETRO_ELEGIDO, type Marca, type Pin } from '@/lib/mapa';
import { ES } from '@/strings';
import { HUES } from '@/theme/colores';
import { DIBUJO } from '@/theme/dibujos';
import { PALETTE, SIZE } from '@/theme/palette';

// ============================================================================
// THE KITCHENS ON GOOGLE'S MAP. Plan task `10.5-iv-b-i`, the owner's answers of
// 2026-11-05 (C: the map, with the list sliding over it; her location or her postal
// code, at her pick) and his rulings of 2026-11-03 (pins that overlap as one bigger pin
// with how many it holds, until she zooms in) and 2026-11-04, night (browsing the map
// across the city — every kitchen the door sends is a pin wherever she moves it).
//
// ⚠️⚠️ GOOGLE'S MAP ON BOTH PHONES (`provider={PROVIDER_GOOGLE}`): every point drawn here
// is Google's point for a kitchen's address unless she set her own, and Google's terms
// let its points be shown on Google's map alone (3.2.3(e)) — so an iPhone draws
// Google's, never Apple's, and its build carries the iPhone key in the map's options
// (`app.config.ts`, `10.5-iv-b-i`). `test/mapa.test.ts` reads this file for it.
//
// ⚠️ EVERY RULE IS `@/lib/mapa`'S, PURE AND PINNED — which kitchens are pins, which
// overlap, where the map opens and when it flies, what a tap on a group does. This file
// wires them to the native map, which no suite can load (ADR-035 §2.11): the phone is its
// instrument, and a build made on this Mac has no key, so its map neither moves nor
// draws a marker (measured 2026-10-30) — the iPhone Simulator, whose map asks with the
// app's own bundle id, was this row's instrument.
//
// ⚠️ HER DOT IS DRAWN BY ITACATE, NOT BY GOOGLE'S *MY LOCATION* LAYER
// (`showsUserLocation` stays off): the layer asks the phone for her location itself,
// inside Google's SDK. Her dot is the point the list already measures from — her
// location, or her postal code's centre where her dot would be (his answer 5) — and
// this file never asks the phone anything (`test/donde.test.ts`).
//
// ⚠️ GOOGLE'S BUSINESSES' LABELS HIDDEN, AS IN WERA COCINA (`SIN_NEGOCIOS`): its places
// are not our kitchens, and a tap on one would be the label's. ⚠️ GOOGLE'S LOGO STAYS IN
// SIGHT: the map's padding puts its foot at the sheet's top (`paddingDelMapa`), and
// nothing of ours is drawn at its foot.
//
// ⚠️ THE PADDING IS HANDED OVER ONLY ONCE GOOGLE'S MAP IS READY (`10.5b-iii-b`): until
// `onMapReady` the map keeps the padding it mounted with. `react-native-maps` 1.27.2's
// `applyBaseMapPadding` calls Google's `map.setPadding` with no null check, so a padding that
// changed after the view was laid out but before the map existed was a red screen — seen twice
// on the emulator by `10.5b-iii-a` (after a restart, after a sign-in), when the sheet moved
// before Google answered. At mount the view has no size yet, so the library keeps that first
// padding and applies it itself once the map is ready.
//
// ⚠️ A CUSTOM MARKER IS A PICTURE GOOGLE TAKES OF A VIEW: it is redrawn while
// `tracksViewChanges` is on, which costs every frame, so each marker turns it off once
// its picture has loaded (`useQuieto`) — and a marker whose look changes (tapped,
// untapped) is a new marker, by its key, so it is taken again.
// ============================================================================

/** Google's map style that hides businesses' labels; roads and their names stay — Wera Cocina's. */
export const SIN_NEGOCIOS = [{ featureType: 'poi', stylers: [{ visibility: 'off' }] }];

/** How long the map takes to fly to her, or closer to a group, in ms. */
const VOLAR_MS = 700;

/** How long a marker keeps redrawing after its picture loads, so Google takes it whole, in ms. */
const UN_MOMENTO_MS = 300;

/** A tap on the map this soon after a tap on a marker was the marker's (Android reports both). */
const DEL_MARCADOR_MS = 400;

export function MapaDeCocinas({
  pines,
  desde,
  claveDeOrigen,
  cp,
  elegidas,
  padding,
  onElegir,
  onSoltar,
}: {
  pines: readonly Pin[];
  /** Where the list is measured from — her location or her postal code's centre — or `null`. */
  desde: Punto | null;
  /** Changes when where she searches from changes (`@/lib/mapa`'s `claveDeOrigen`): the map flies then. */
  claveDeOrigen: string;
  /** Her postal code, while she searches from one. */
  cp: string | null;
  elegidas: ReadonlySet<string>;
  padding: { top: number; right: number; bottom: number; left: number };
  onElegir: (ids: readonly string[]) => void;
  onSoltar: () => void;
}) {
  const map = useRef<MapView>(null);
  const [listo, setListo] = useState(false);
  const [ancho, setAncho] = useState(0);
  const [longitudeDelta, setLongitudeDelta] = useState<number | null>(null);
  const tocoMarcador = useRef(0);
  const [primera] = useState(() => camaraDe(desde));
  // The padding it mounted with, the one object handed to the map until it is ready.
  const [primerPadding] = useState(padding);

  const marcas = useMemo(() => agrupar(pines, longitudeDelta, ancho, elegidas), [pines, longitudeDelta, ancho, elegidas]);

  // ⚠️ It flies to her when where she searches from changes — never as she walks.
  const ultimoVuelo = useRef<string | null>(null);
  useEffect(() => {
    if (!listo || desde === null) return;
    if (ultimoVuelo.current === claveDeOrigen) return;
    ultimoVuelo.current = claveDeOrigen;
    map.current?.animateCamera(camaraDe(desde), { duration: VOLAR_MS });
    // `desde` moves as she walks; only the key decides.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listo, claveDeOrigen, desde === null]);

  function marcador() {
    tocoMarcador.current = Date.now();
  }

  function tocarGrupo(marca: Extract<Marca, { kind: 'grupo' }>) {
    marcador();
    const accion = alTocarGrupo(marca.pines);
    if (accion.kind === 'elegir') {
      onElegir(accion.ids);
      return;
    }
    map.current?.fitToCoordinates([...accion.puntos], {
      edgePadding: {
        top: padding.top + DIAMETRO_ELEGIDO * 2,
        right: DIAMETRO_ELEGIDO * 2,
        bottom: padding.bottom + DIAMETRO_ELEGIDO * 2,
        left: DIAMETRO_ELEGIDO * 2,
      },
      animated: true,
    });
  }

  return (
    <View style={{ flex: 1 }} onLayout={(e) => setAncho(e.nativeEvent.layout.width)}>
      <MapView
        ref={map}
        style={{ flex: 1 }}
        provider={PROVIDER_GOOGLE}
        mapType="standard"
        initialCamera={primera}
        mapPadding={listo ? padding : primerPadding}
        onMapReady={() => setListo(true)}
        onRegionChangeComplete={(region) => setLongitudeDelta(region.longitudeDelta)}
        onPress={() => {
          if (Date.now() - tocoMarcador.current > DEL_MARCADOR_MS) onSoltar();
        }}
        customMapStyle={SIN_NEGOCIOS}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        showsPointsOfInterests={false}
        rotateEnabled={false}
        pitchEnabled={false}
        toolbarEnabled={false}
        moveOnMarkerPress={false}
      >
        {marcas.map((marca) =>
          marca.kind === 'pin' ? (
            <PinDeCocina
              key={`${marca.key}:${elegidas.has(marca.pin.id) ? 'e' : 'n'}`}
              pin={marca.pin}
              elegido={elegidas.has(marca.pin.id)}
              onPress={() => {
                marcador();
                onElegir([marca.pin.id]);
              }}
            />
          ) : (
            <Grupo key={marca.key} marca={marca} onPress={() => tocarGrupo(marca)} />
          ),
        )}
        {desde !== null && <SuPunto key="su-punto" punto={desde} cp={cp} />}
      </MapView>
      {desde !== null && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={cp === null ? ES.mapa.volverATi : ES.mapa.volverAlCodigo(cp)}
          onPress={() => map.current?.animateCamera(camaraDe(desde), { duration: VOLAR_MS })}
          hitSlop={SIZE.rowGap}
          style={{
            position: 'absolute',
            top: padding.top + SIZE.space,
            right: SIZE.space,
            width: SIZE.tapTarget - 4,
            height: SIZE.tapTarget - 4,
            borderRadius: SIZE.tapTarget,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: PALETTE.superficie,
            borderWidth: 1,
            borderColor: PALETTE.linea,
          }}
        >
          <MaterialCommunityIcons name="crosshairs-gps" size={SIZE.iconSize - 2} color={PALETTE.accion} />
        </Pressable>
      )}
    </View>
  );
}

/** A marker redraws until its picture is in, then holds still — Google keeps the last picture. */
function useQuieto(): readonly [boolean, () => void] {
  const [quieto, setQuieto] = useState(false);
  const espera = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (espera.current !== null) clearTimeout(espera.current);
    },
    [],
  );
  const listo = useMemo(
    () => () => {
      if (espera.current !== null) return;
      espera.current = setTimeout(() => setQuieto(true), UN_MOMENTO_MS);
    },
    [],
  );
  return [quieto, listo] as const;
}

/** One kitchen: her colour, her trade's drawing in white, faded when she has nothing on offer. */
function PinDeCocina({ pin, elegido, onPress }: { pin: Pin; elegido: boolean; onPress: () => void }) {
  const [quieto, listo] = useQuieto();
  const d = elegido ? DIAMETRO_ELEGIDO : DIAMETRO;
  return (
    <Marker
      coordinate={pin.punto}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={!quieto}
      zIndex={elegido ? 3 : pin.enOferta ? 2 : 1}
      onPress={onPress}
      accessibilityLabel={ES.mapa.pin(pin.nombre, pin.enOferta)}
    >
      <Circulo d={d} color={HUES[pin.color]} desvanecido={!pin.enOferta}>
        <Image
          source={DIBUJO[pin.dibujo]}
          fadeDuration={0}
          onLoad={listo}
          style={{ width: d * 0.56, height: d * 0.56 }}
          resizeMode="contain"
        />
      </Circulo>
    </Marker>
  );
}

/** Kitchens that overlap at this zoom: one circle with how many it holds. */
function Grupo({ marca, onPress }: { marca: Extract<Marca, { kind: 'grupo' }>; onPress: () => void }) {
  const [quieto, listo] = useQuieto();
  useEffect(listo, [listo]);
  const d = DIAMETRO + 4;
  return (
    <Marker
      coordinate={marca.punto}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={!quieto}
      zIndex={marca.enOferta ? 2 : 1}
      onPress={onPress}
      accessibilityLabel={ES.mapa.grupo(marca.pines.length)}
    >
      <Circulo d={d} color={PALETTE.tintaApagada} desvanecido={!marca.enOferta}>
        <Text style={{ color: PALETTE.superficie, fontSize: SIZE.bodySize, fontWeight: '800' }}>{marca.pines.length}</Text>
      </Circulo>
    </Marker>
  );
}

/** Her dot — her location, or her postal code's centre where her dot would be. */
function SuPunto({ punto, cp }: { punto: Punto; cp: string | null }) {
  const [quieto, listo] = useQuieto();
  useEffect(listo, [listo]);
  return (
    <Marker
      coordinate={punto}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={!quieto}
      zIndex={4}
      tappable={false}
      accessibilityLabel={cp === null ? ES.mapa.estasAqui : ES.mapa.tuCodigo(cp)}
    >
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 17,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(36, 71, 107, 0.18)',
        }}
      >
        <View
          style={{
            width: 16,
            height: 16,
            borderRadius: 8,
            borderWidth: 3,
            borderColor: PALETTE.superficie,
            backgroundColor: PALETTE.accion,
          }}
        />
      </View>
    </Marker>
  );
}

function Circulo({ d, color, desvanecido, children }: { d: number; color: string; desvanecido: boolean; children: ReactNode }) {
  return (
    <View
      style={{
        width: d,
        height: d,
        borderRadius: d / 2,
        borderWidth: 3,
        borderColor: PALETTE.superficie,
        backgroundColor: color,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: desvanecido ? 0.45 : 1,
      }}
    >
      {children}
    </View>
  );
}
