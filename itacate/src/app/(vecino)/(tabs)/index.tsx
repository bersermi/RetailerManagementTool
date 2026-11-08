import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Keyboard, Pressable, RefreshControl, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { apiErrorMessage } from '@/api/errors';
import { useCocinas } from '@/api/hooks';
import { SIN_DISTANCIAS, usePonerDistancias } from '@/lib/DistanciasProvider';
import { distanciaTexto } from '@/lib/distancia';
import { useDondeBuscar } from '@/lib/DondeBuscarProvider';
import { ORDEN_INICIAL, distanciasDe, tarjetasDe, type Orden, type Tarjeta } from '@/lib/lista';
import {
  NIVEL_INICIAL,
  claveDeOrigen,
  escondido,
  paddingDelMapa,
  partir,
  pinesDe,
  posicionesDe,
  type Nivel,
} from '@/lib/mapa';
import { motivoDe, origenDe, puntoDeOrigen, type Codigo, type Origen } from '@/lib/ubicacion';
import { useAhora } from '@/lib/useAhora';
import { usePuntosBuscados } from '@/lib/useGoogle';
import { useDondeEstoy } from '@/lib/useUbicacion';
import { ES } from '@/strings';
import { TITULO } from '@/theme/letra';
import { PALETTE, SIZE } from '@/theme/palette';
import { BotonLleno } from '@/ui/BotonLleno';
import { Cabeza } from '@/ui/Cabeza';
import { CodigoPostal } from '@/ui/CodigoPostal';
import { Formulario } from '@/ui/Formulario';
import { HojaDeLista } from '@/ui/HojaDeLista';
import { Llega } from '@/ui/Llega';
import { MapaDeCocinas } from '@/ui/MapaDeCocinas';
import { Ordenar } from '@/ui/Ordenar';
import { TarjetaCocina } from '@/ui/TarjetaCocina';
import { TarjetaPlatillo } from '@/ui/TarjetaPlatillo';

// ============================================================================
// *CERCA DE TI* — THE KITCHENS CLOSE TO HER: GOOGLE'S MAP, WITH THE LIST SLIDING OVER
// IT. Plan tasks `10.5-iv-a-i` (the list) and `10.5-iv-b-i` (the map — the owner's
// answer 4 of 2026-11-05: *"I'd prefer option C"*, as the family-shell page draws it).
// The first tab since `10.5-v-b`; her account and her way out are on the last, *Tú*.
//
// ⚠️ THE SCREEN IS TWO LAYERS:
//   - the map, the whole screen (`@/ui/MapaDeCocinas`): every kitchen the door sends as
//     a pin — on offer, or faded when quiet — wherever she moves it, pins that overlap
//     as one circle with how many it holds, and her dot where the list is measured from
//     — her location, or her postal code's centre (his answer 5);
//   - the sheet over it (`@/ui/HojaDeLista`): the head that was this screen's head —
//     *Cerca de ti*, where it is measured from with *Cambiar*, *Ordenar* — and the list,
//     at three heights (`@/lib/mapa`). It opens half-way. The map's foot is the sheet's
//     top, so Google's logo stays in sight above the list (`paddingDelMapa`).
//   A pin she taps puts that kitchen's cards first, under *En el mapa*, with *Quitar*,
//   and brings the sheet half-way; a tap on the map's ground lets go of it — as drawn.
//
// ⚠️ WHAT IT CARRIES OUT, EVERY RULE ELSEWHERE AND PINNED:
//   - where she is — her location while the app is open, never sent anywhere
//     (`@/lib/useUbicacion`); declined or approximate, her postal code
//     (`@/ui/CodigoPostal`) IN THE SHEET, the map beside it over the city (his ruling of
//     2026-11-03), with *Usar mi ubicación* under it as her way back; outside the zone,
//     *Itacate aún no llega a tu zona* (`@/lib/ubicacion`'s `origenDe`); ⚠️ since
//     `10.5-v-b`, a postal code AT HER PICK even with her location on
//     (`@/lib/DondeBuscarProvider`, chosen on *Dónde buscar*) — and then her phone is not
//     asked at all;
//   - every kitchen the door sends (`@/api/hooks`' `useCocinas`), placed at the door's
//     point, else where her phone found its address (`@/lib/useGoogle`) — the list and
//     the map alike;
//   - its cards, in her pick of the order — *Ahora* until she picks, with *Ordenar*
//     (`@/ui/Ordenar`, plan `10.5-iv-a-iv`) at the head — made again as she walks and
//     every minute, so a window that opens or ends moves its card and fades its pin
//     (`@/lib/lista`, `@/lib/mapa`);
//   - one staggered entrance (`@/ui/Llega`, ADR-035 §2.11): the first cards arrive
//     40 ms apart when the list first draws them — never again on a new order or a
//     return to the tab, which stays mounted;
//   - a pull asks the door and her phone again; so does a return to the front;
//   - a card opens a page — a dish's card the dish's, a quiet kitchen's card hers — and
//     the list hands both pages each kitchen's distance (`@/lib/DistanciasProvider`), a
//     number and never where she is. It stays mounted under them, so as she walks the
//     pages follow.
// ⚠️ NOTHING IS CUT OFF BY DISTANCE: the 1.5 and 3 km limits wait for Google's reply
// (`10.5-iv-b-iii`). ⚠️ NO CHECK CAN SEE THIS SCREEN (ADR-035 §2.11): the phone is its
// instrument.
// ============================================================================

/** How often the cards are made again while she looks, so an ended window drops. */
const CADA_MINUTO = 60_000;

/** Before the sheet's head is measured, its height on a phone, in points. */
const CABEZA_ANTES = 112;

const NINGUNA: ReadonlySet<string> = new Set();

export default function Cerca() {
  const { codigo, elegirCodigo } = useDondeBuscar();
  const { donde, otraVez, usarUbicacion } = useDondeEstoy(codigo === null);
  const cocinas = useCocinas();
  const buscados = usePuntosBuscados(cocinas.data);
  const ahora = useAhora(CADA_MINUTO);
  const insets = useSafeAreaInsets();
  const [jalando, setJalando] = useState(false);
  const [orden, setOrden] = useState<Orden>(ORDEN_INICIAL);
  const [alto, setAlto] = useState(0);
  const [cabeza, setCabeza] = useState(CABEZA_ANTES);
  const [nivel, setNivel] = useState<Nivel>(NIVEL_INICIAL);
  const [elegidas, setElegidas] = useState<ReadonlySet<string>>(NINGUNA);
  const lista = useRef<FlatList<Tarjeta>>(null);

  const origen = origenDe(donde, codigo);
  const desde = puntoDeOrigen(origen);
  const tarjetas = useMemo(
    () => (desde === null || cocinas.data === undefined ? [] : tarjetasDe(cocinas.data, desde, buscados, ahora, orden)),
    [cocinas.data, desde, buscados, ahora, orden],
  );
  const pines = useMemo(
    () => (cocinas.data === undefined ? [] : pinesDe(cocinas.data, buscados, ahora)),
    [cocinas.data, buscados, ahora],
  );
  const { enElMapa, resto } = useMemo(() => partir(tarjetas, elegidas), [tarjetas, elegidas]);

  // The sheet's three heights: full leaves the phone's clock free.
  const arriba = insets.top + SIZE.rowGap;
  const posiciones = useMemo(() => posicionesDe(alto, arriba, cabeza), [alto, arriba, cabeza]);
  const padding = useMemo(() => paddingDelMapa(nivel, posiciones, alto, insets.top), [nivel, posiciones, alto, insets.top]);

  // Each kitchen's distance, to her two pages — and none once the list leaves (her sign-out).
  const ponerDistancias = usePonerDistancias();
  const distancias = useMemo(() => distanciasDe(tarjetas), [tarjetas]);
  useEffect(() => ponerDistancias(distancias), [ponerDistancias, distancias]);
  useEffect(() => () => ponerDistancias(SIN_DISTANCIAS), [ponerDistancias]);

  // A kitchen she tapped that the door no longer sends is let go.
  useEffect(() => {
    if (elegidas.size === 0) return;
    const quedan = [...elegidas].filter((id) => pines.some((pin) => pin.id === id));
    if (quedan.length !== elegidas.size) setElegidas(quedan.length === 0 ? NINGUNA : new Set(quedan));
  }, [pines, elegidas]);

  function elegir(ids: readonly string[]) {
    setElegidas(new Set(ids));
    setNivel('medio');
    lista.current?.scrollToOffset({ offset: 0, animated: true });
  }

  function soltar() {
    if (elegidas.size > 0) setElegidas(NINGUNA);
  }

  function enCodigo(nuevo: Codigo) {
    Keyboard.dismiss();
    elegirCodigo(nuevo);
    setNivel('medio');
  }

  async function refrescar() {
    setJalando(true);
    otraVez();
    try {
      await cocinas.refetch();
    } finally {
      setJalando(false);
    }
  }

  const hayLista = origen.kind === 'aqui' || origen.kind === 'codigo';
  const pie = SIZE.space * 2 + escondido(nivel, posiciones);

  const tarjeta = (item: Tarjeta) =>
    item.kind === 'platillo' ? (
      <TarjetaPlatillo
        cocina={item.cocina}
        oferta={item.oferta}
        platillo={item.platillo}
        distancia={item.metros === null ? null : distanciaTexto(item.metros)}
        ahora={ahora}
        onPress={() =>
          router.push({
            pathname: '/platillo/[cocina]/[oferta]/[linea]',
            params: { cocina: item.cocina.id, oferta: item.oferta.id, linea: String(item.platillo.lineNo) },
          })
        }
      />
    ) : (
      <TarjetaCocina
        tarjeta={item}
        ahora={ahora}
        onPress={() => router.push({ pathname: '/cocina/[id]', params: { id: item.cocina.id } })}
      />
    );

  return (
    <View style={{ flex: 1, backgroundColor: PALETTE.fondo, overflow: 'hidden' }} onLayout={(e) => setAlto(e.nativeEvent.layout.height)}>
      <MapaDeCocinas
        pines={pines}
        desde={desde}
        claveDeOrigen={claveDeOrigen(origen)}
        cp={origen.kind === 'codigo' ? origen.cp : null}
        elegidas={elegidas}
        padding={padding}
        onElegir={elegir}
        onSoltar={soltar}
      />
      {alto > 0 && (
        <HojaDeLista
          alto={alto}
          posiciones={posiciones}
          nivel={nivel}
          onNivel={setNivel}
          onCabeza={setCabeza}
          cabeza={
            <Cabeza
              titulo={ES.cerca.titulo}
              enHoja
              derecha={hayLista && tarjetas.length > 1 ? <Ordenar orden={orden} onOrden={setOrden} /> : null}
            >
              {hayLista && <Desde origen={origen} onCambiar={() => router.push('/donde')} />}
            </Cabeza>
          }
        >
          {origen.kind === 'buscando' && (
            <Llega i={0}>
              <Aviso texto={ES.cerca.buscandote} esperando />
            </Llega>
          )}

          {(origen.kind === 'pide-codigo' || origen.kind === 'fuera') && (
            <Formulario style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: pie }}>
              <Llega i={0} style={{ padding: SIZE.space * 1.5, gap: SIZE.space }}>
                {origen.kind === 'fuera' && (
                  <View style={{ gap: SIZE.rowGap / 2 }}>
                    <Text style={{ fontSize: SIZE.titleSize - 2, ...TITULO, color: PALETTE.tinta }}>{ES.cerca.fueraDeZona}</Text>
                    <Text style={{ fontSize: SIZE.bodySize, lineHeight: 22, color: PALETTE.tintaApagada }}>
                      {ES.cerca.fueraDeZonaDetalle}
                    </Text>
                  </View>
                )}
                <CodigoPostal
                  motivo={origen.kind === 'fuera' ? ES.cerca.otroCodigo : motivoDe(origen.porque)}
                  onLugar={enCodigo}
                  onFocus={() => setNivel('lleno')}
                />
                {origen.kind === 'pide-codigo' && (
                  <BotonLleno label={ES.cerca.usarUbicacion} icon="crosshairs-gps" variante="discreto" onPress={usarUbicacion} />
                )}
              </Llega>
            </Formulario>
          )}

          {hayLista && (
            <FlatList<Tarjeta>
              ref={lista}
              data={resto}
              keyExtractor={(item) => item.key}
              renderItem={({ item, index }) => (
                <Llega i={index}>{tarjeta(item)}</Llega>
              )}
              ListHeaderComponent={
                enElMapa.length > 0 ? (
                  <View style={{ gap: SIZE.space, paddingBottom: SIZE.space }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: SIZE.smallSize, fontWeight: '700', color: PALETTE.tintaApagada }}>
                        {ES.mapa.enElMapa}
                      </Text>
                      <Pressable accessibilityRole="button" onPress={soltar} hitSlop={SIZE.rowGap}>
                        <Text style={{ fontSize: SIZE.smallSize, fontWeight: '700', color: PALETTE.accion }}>{ES.mapa.quitar}</Text>
                      </Pressable>
                    </View>
                    {enElMapa.map((item) => (
                      <View key={item.key}>{tarjeta(item)}</View>
                    ))}
                    {resto.length > 0 && <View style={{ height: 1, backgroundColor: PALETTE.linea, marginTop: SIZE.rowGap / 2 }} />}
                  </View>
                ) : null
              }
              ListEmptyComponent={
                enElMapa.length > 0 ? null : (
                  <Llega i={0}>
                    {cocinas.isPending ? (
                      <Aviso texto={ES.cerca.cargando} esperando />
                    ) : cocinas.isError ? (
                      <Aviso texto={apiErrorMessage(cocinas.error)} />
                    ) : (
                      <Aviso texto={ES.cerca.vacio} />
                    )}
                  </Llega>
                )
              }
              refreshControl={<RefreshControl refreshing={jalando} onRefresh={() => void refrescar()} />}
              contentContainerStyle={{
                paddingHorizontal: SIZE.space * 1.5,
                paddingTop: SIZE.space,
                paddingBottom: pie,
                gap: SIZE.space,
              }}
            />
          )}
        </HojaDeLista>
      )}
    </View>
  );
}

/**
 * Where the distances are measured from, and *Cambiar* — which opens *Dónde buscar*,
 * the same screen as *Tú*'s row (`10.5-v-b`), from her location as from a postal code.
 */
function Desde({ origen, onCambiar }: { origen: Origen; onCambiar: () => void }) {
  const desde = origen.kind === 'codigo' ? ES.cerca.desdeCodigo(origen.cp) : ES.cerca.desdeTuUbicacion;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: SIZE.rowGap }}>
      <Text style={{ flex: 1, fontSize: SIZE.smallSize, color: PALETTE.tintaApagada }}>{desde}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={ES.cerca.cambiarDonde} onPress={onCambiar} hitSlop={SIZE.rowGap}>
        <Text style={{ fontSize: SIZE.smallSize, fontWeight: '700', color: PALETTE.accion }}>{ES.cerca.cambiarCodigo}</Text>
      </Pressable>
    </View>
  );
}

/** One line in the middle of the sheet — while something is on its way, or why there is nothing. */
function Aviso({ texto, esperando = false }: { texto: string; esperando?: boolean }) {
  return (
    <View style={{ alignItems: 'center', gap: SIZE.space, paddingVertical: SIZE.space * 3, paddingHorizontal: SIZE.space * 2 }}>
      {esperando && <ActivityIndicator color={PALETTE.accion} />}
      <Text style={{ fontSize: SIZE.bodySize, lineHeight: 22, color: PALETTE.tintaApagada, textAlign: 'center' }}>{texto}</Text>
    </View>
  );
}
