import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';

import { apiErrorMessage } from '@/api/errors';
import { useCocinas } from '@/api/hooks';
import { SIN_DISTANCIAS, usePonerDistancias } from '@/lib/DistanciasProvider';
import { distanciaTexto } from '@/lib/distancia';
import { useDondeBuscar } from '@/lib/DondeBuscarProvider';
import { ORDEN_INICIAL, distanciasDe, tarjetasDe, type Orden, type Tarjeta } from '@/lib/lista';
import { motivoDe, origenDe, puntoDeOrigen, type Origen } from '@/lib/ubicacion';
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
import { Llega } from '@/ui/Llega';
import { Ordenar } from '@/ui/Ordenar';
import { TarjetaCocina } from '@/ui/TarjetaCocina';
import { TarjetaPlatillo } from '@/ui/TarjetaPlatillo';

// ============================================================================
// *CERCA DE TI* — THE KITCHENS CLOSE TO HER, AS A LIST. Plan task `10.5-iv-a-i`; it
// replaced the skeleton's map (`10.2a`). ⚠️ SINCE `10.5-v-b` IT IS THE FIRST TAB,
// *Cerca*, and its head is the head of the sheet the map will slide under (`10.5-iv-b`,
// the owner's C): her place in the list's name, where it is measured from with
// *Cambiar*, and *Ordenar* — until the map, the sheet fills the screen. Her account and
// her way out moved to the last tab, *Tú*.
//
// ⚠️ WHAT IT CARRIES OUT, EVERY RULE ELSEWHERE AND PINNED:
//   - where she is — her location while the app is open, never sent anywhere
//     (`@/lib/useUbicacion`); declined or approximate, her postal code
//     (`@/ui/CodigoPostal`), with *Usar mi ubicación* under it as her way back;
//     outside the zone, *Itacate aún no llega a tu zona* (`@/lib/ubicacion`'s `origenDe`);
//     ⚠️ since `10.5-v-b`, a postal code AT HER PICK even with her location on
//     (`@/lib/DondeBuscarProvider`, chosen on *Dónde buscar*) — and then her phone is not
//     asked at all;
//   - every kitchen the door sends (`@/api/hooks`' `useCocinas`), placed at the
//     door's point, else where her phone found its address (`@/lib/useGoogle`);
//   - its cards, in her pick of the order — *Ahora* until she picks, with
//     *Ordenar* (`@/ui/Ordenar`, plan `10.5-iv-a-iv`; a button and a sheet since
//     `10.5-v-b`) at the head — made again as she walks and every minute, so a window
//     that opens or ends moves its card (`@/lib/lista`);
//   - one staggered entrance (`@/ui/Llega`, ADR-035 §2.11): the first cards arrive
//     40 ms apart when the list first draws them — never again on a new order or a
//     return to the tab, which stays mounted;
//   - a pull asks the door and her phone again; so does a return to the front;
//   - ⚠️ since `10.5-iv-a-ii` a card opens a page — a dish's card the dish's, a quiet
//     kitchen's card hers — and the list hands both pages each kitchen's distance
//     (`@/lib/DistanciasProvider`), a number and never where she is. It stays mounted
//     under them, so as she walks the pages follow.
// ⚠️ NO KITCHEN IS DRAWN ON A MAP: Google's points go only on Google's map, which
// is `10.5-iv-b`. ⚠️ NO CHECK CAN SEE THIS SCREEN (ADR-035 §2.11): the phone is its
// instrument.
// ============================================================================

/** How often the cards are made again while she looks, so an ended window drops. */
const CADA_MINUTO = 60_000;

export default function Cerca() {
  const { codigo, elegirCodigo } = useDondeBuscar();
  const { donde, otraVez, usarUbicacion } = useDondeEstoy(codigo === null);
  const cocinas = useCocinas();
  const buscados = usePuntosBuscados(cocinas.data);
  const ahora = useAhora(CADA_MINUTO);
  const [jalando, setJalando] = useState(false);
  const [orden, setOrden] = useState<Orden>(ORDEN_INICIAL);

  const origen = origenDe(donde, codigo);
  const desde = puntoDeOrigen(origen);
  const tarjetas = useMemo(
    () => (desde === null || cocinas.data === undefined ? [] : tarjetasDe(cocinas.data, desde, buscados, ahora, orden)),
    [cocinas.data, desde, buscados, ahora, orden],
  );

  // Each kitchen's distance, to her two pages — and none once the list leaves (her sign-out).
  const ponerDistancias = usePonerDistancias();
  const distancias = useMemo(() => distanciasDe(tarjetas), [tarjetas]);
  useEffect(() => ponerDistancias(distancias), [ponerDistancias, distancias]);
  useEffect(() => () => ponerDistancias(SIN_DISTANCIAS), [ponerDistancias]);

  async function refrescar() {
    setJalando(true);
    otraVez();
    try {
      await cocinas.refetch();
    } finally {
      setJalando(false);
    }
  }

  if (origen.kind === 'buscando') {
    return (
      <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
        <Cabeza titulo={ES.cerca.titulo} />
        <Llega i={0}>
          <Aviso texto={ES.cerca.buscandote} esperando />
        </Llega>
      </View>
    );
  }

  if (origen.kind === 'pide-codigo' || origen.kind === 'fuera') {
    return (
      <Formulario style={{ flex: 1, backgroundColor: PALETTE.fondo }} contentContainerStyle={{ flexGrow: 1 }}>
        <Cabeza titulo={ES.cerca.titulo} />
        <Llega i={0} style={{ padding: SIZE.space * 1.5, paddingBottom: SIZE.space * 2, gap: SIZE.space }}>
          {origen.kind === 'fuera' && (
            <View style={{ gap: SIZE.rowGap / 2 }}>
              <Text style={{ fontSize: SIZE.titleSize - 2, ...TITULO, color: PALETTE.tinta }}>{ES.cerca.fueraDeZona}</Text>
              <Text style={{ fontSize: SIZE.bodySize, lineHeight: 22, color: PALETTE.tintaApagada }}>{ES.cerca.fueraDeZonaDetalle}</Text>
            </View>
          )}
          <CodigoPostal
            motivo={origen.kind === 'fuera' ? ES.cerca.otroCodigo : motivoDe(origen.porque)}
            onLugar={elegirCodigo}
          />
          {origen.kind === 'pide-codigo' && (
            <BotonLleno label={ES.cerca.usarUbicacion} icon="crosshairs-gps" variante="discreto" onPress={usarUbicacion} />
          )}
        </Llega>
      </Formulario>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
      <Cabeza
        titulo={ES.cerca.titulo}
        derecha={tarjetas.length > 1 ? <Ordenar orden={orden} onOrden={setOrden} /> : null}
      >
        <Desde origen={origen} onCambiar={() => router.push('/donde')} />
      </Cabeza>
      <FlatList<Tarjeta>
        data={tarjetas}
        keyExtractor={(tarjeta) => tarjeta.key}
        renderItem={({ item, index }) => (
          <Llega i={index}>
            {item.kind === 'platillo' ? (
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
            )}
          </Llega>
        )}
        ListEmptyComponent={
          <Llega i={0}>
            {cocinas.isPending ? (
              <Aviso texto={ES.cerca.cargando} esperando />
            ) : cocinas.isError ? (
              <Aviso texto={apiErrorMessage(cocinas.error)} />
            ) : (
              <Aviso texto={ES.cerca.vacio} />
            )}
          </Llega>
        }
        refreshControl={<RefreshControl refreshing={jalando} onRefresh={() => void refrescar()} />}
        contentContainerStyle={{
          paddingHorizontal: SIZE.space * 1.5,
          paddingTop: SIZE.space,
          paddingBottom: SIZE.space * 2,
          gap: SIZE.space,
        }}
      />
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

/** One line in the middle of the screen — while something is on its way, or why there is nothing. */
function Aviso({ texto, esperando = false }: { texto: string; esperando?: boolean }) {
  return (
    <View style={{ alignItems: 'center', gap: SIZE.space, paddingVertical: SIZE.space * 3, paddingHorizontal: SIZE.space * 2 }}>
      {esperando && <ActivityIndicator color={PALETTE.accion} />}
      <Text style={{ fontSize: SIZE.bodySize, lineHeight: 22, color: PALETTE.tintaApagada, textAlign: 'center' }}>{texto}</Text>
    </View>
  );
}
