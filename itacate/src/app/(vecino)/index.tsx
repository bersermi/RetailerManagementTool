import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { apiErrorMessage } from '@/api/errors';
import { useCocinas } from '@/api/hooks';
import { SIN_DISTANCIAS, usePonerDistancias } from '@/lib/DistanciasProvider';
import { distanciasDe, tarjetasDe, type Tarjeta } from '@/lib/lista';
import { motivoDe, origenDe, puntoDeOrigen, type Codigo, type Origen } from '@/lib/ubicacion';
import { useAhora } from '@/lib/useAhora';
import { usePuntosBuscados } from '@/lib/useGoogle';
import { useDondeEstoy } from '@/lib/useUbicacion';
import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';
import { Banda } from '@/ui/Banda';
import { BotonLleno } from '@/ui/BotonLleno';
import { CodigoPostal } from '@/ui/CodigoPostal';
import { Formulario } from '@/ui/Formulario';
import { TarjetaCocina } from '@/ui/TarjetaCocina';
import { TarjetaPlatillo } from '@/ui/TarjetaPlatillo';

// ============================================================================
// *CERCA DE TI* — THE KITCHENS CLOSE TO HER, AS A LIST. Plan task `10.5-iv-a-i`; it
// replaced the skeleton's map (`10.2a`), and her way out moved to *Tu cuenta*.
//
// ⚠️ WHAT IT CARRIES OUT, EVERY RULE ELSEWHERE AND PINNED:
//   - where she is — her location while the app is open, never sent anywhere
//     (`@/lib/useUbicacion`); declined or approximate, her postal code
//     (`@/ui/CodigoPostal`), with *Usar mi ubicación* under it as her way back;
//     outside the zone, *Itacate aún no llega a tu zona* (`@/lib/ubicacion`'s `origenDe`);
//   - every kitchen the door sends (`@/api/hooks`' `useCocinas`), placed at the
//     door's point, else where her phone found its address (`@/lib/useGoogle`);
//   - its cards, nearest first, made again as she walks and every minute, so a
//     window that ends turns its kitchen quiet (`@/lib/lista`);
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
  const insets = useSafeAreaInsets();
  const { donde, otraVez, usarUbicacion } = useDondeEstoy();
  const [codigo, setCodigo] = useState<Codigo | null>(null);
  const cocinas = useCocinas();
  const buscados = usePuntosBuscados(cocinas.data);
  const ahora = useAhora(CADA_MINUTO);
  const [jalando, setJalando] = useState(false);

  const origen = origenDe(donde, codigo);
  const desde = puntoDeOrigen(origen);
  const tarjetas = useMemo(
    () => (desde === null || cocinas.data === undefined ? [] : tarjetasDe(cocinas.data, desde, buscados, ahora)),
    [cocinas.data, desde, buscados, ahora],
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

  const banda = (
    <Banda
      titulo={ES.cerca.titulo}
      accion={{ label: ES.cerca.tuCuenta, icon: 'account-circle-outline', onPress: () => router.push('/cuenta') }}
    />
  );

  if (origen.kind === 'buscando') {
    return (
      <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
        {banda}
        <Aviso texto={ES.cerca.buscandote} esperando />
      </View>
    );
  }

  if (origen.kind === 'pide-codigo' || origen.kind === 'fuera') {
    return (
      <Formulario style={{ flex: 1, backgroundColor: PALETTE.fondo }} contentContainerStyle={{ flexGrow: 1 }}>
        {banda}
        <View style={{ padding: SIZE.space * 2, paddingBottom: insets.bottom + SIZE.space * 2, gap: SIZE.space }}>
          {origen.kind === 'fuera' && (
            <View style={{ gap: SIZE.rowGap / 2 }}>
              <Text style={{ fontSize: SIZE.titleSize - 2, fontWeight: '700', color: PALETTE.tinta }}>{ES.cerca.fueraDeZona}</Text>
              <Text style={{ fontSize: SIZE.bodySize, lineHeight: 22, color: PALETTE.tintaApagada }}>{ES.cerca.fueraDeZonaDetalle}</Text>
            </View>
          )}
          <CodigoPostal
            motivo={origen.kind === 'fuera' ? ES.cerca.otroCodigo : motivoDe(origen.porque)}
            onLugar={setCodigo}
          />
          {origen.kind === 'pide-codigo' && (
            <BotonLleno label={ES.cerca.usarUbicacion} icon="crosshairs-gps" variante="discreto" onPress={usarUbicacion} />
          )}
        </View>
      </Formulario>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
      {banda}
      <FlatList<Tarjeta>
        data={tarjetas}
        keyExtractor={(tarjeta) => tarjeta.key}
        renderItem={({ item }) =>
          item.kind === 'platillo' ? (
            <TarjetaPlatillo
              tarjeta={item}
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
          )
        }
        ListHeaderComponent={<Desde origen={origen} onCambiar={() => setCodigo(null)} />}
        ListEmptyComponent={
          cocinas.isPending ? (
            <Aviso texto={ES.cerca.cargando} esperando />
          ) : cocinas.isError ? (
            <Aviso texto={apiErrorMessage(cocinas.error)} />
          ) : (
            <Aviso texto={ES.cerca.vacio} />
          )
        }
        refreshControl={<RefreshControl refreshing={jalando} onRefresh={() => void refrescar()} />}
        contentContainerStyle={{
          paddingHorizontal: SIZE.space * 1.5,
          paddingTop: SIZE.space,
          paddingBottom: insets.bottom + SIZE.space * 2,
          gap: SIZE.space,
        }}
      />
    </View>
  );
}

/** Where the distances are measured from — and, from a postal code, the way back to the box. */
function Desde({ origen, onCambiar }: { origen: Origen; onCambiar: () => void }) {
  if (origen.kind === 'codigo') {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SIZE.rowGap }}>
        <Text style={{ flex: 1, fontSize: SIZE.smallSize, color: PALETTE.tintaApagada }}>{ES.cerca.desdeCodigo(origen.cp)}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={ES.cerca.cambiarCodigo} onPress={onCambiar} hitSlop={SIZE.rowGap}>
          <Text style={{ fontSize: SIZE.smallSize, fontWeight: '700', color: PALETTE.accion }}>{ES.cerca.cambiarCodigo}</Text>
        </Pressable>
      </View>
    );
  }
  return <Text style={{ fontSize: SIZE.smallSize, color: PALETTE.tintaApagada }}>{ES.cerca.desdeTuUbicacion}</Text>;
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
