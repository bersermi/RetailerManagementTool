import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from 'react-native';

import { useApartados, useCalificarVecino, useEntregar, useKitchen } from '@/api/hooks';
import type { Kitchen } from '@/api/kitchen';
import { deHoy, historial, ordenesDe, porCalificar, porEntregar, type Orden } from '@/lib/apartados';
import { useAhora } from '@/lib/useAhora';
import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';
import { useTerminos } from '@/ui/AntesDeCalificar';
import { Banda } from '@/ui/Banda';
import { BotonLleno } from '@/ui/BotonLleno';
import { FilaOrden } from '@/ui/FilaOrden';
import { LeyendoCocina } from '@/ui/LeyendoCocina';
import { Llega } from '@/ui/Llega';
import { Segmento } from '@/ui/Segmento';
import { SinSenal } from '@/ui/SinSenal';
import { TarjetaOrden } from '@/ui/TarjetaOrden';

// ============================================================================
// *APARTADOS* — THE TAB. Plan task `10.5b-iv-a`, the owner's final design of 2026-11-10 (the
// page *Names, Records and Stars*, version 5: *Apartados · Hoy* and *Apartados · Historial*),
// the tab drawn since `10.5-v-c-i` and in use from this row.
//   - *HOY*: *3 por entregar · 1 por calificar*, *Entregar un apartado*, then each order still
//     to hand over, her hour first — green *Entregar*, its hour rust 15 minutes before — and
//     what she handed over today and has not rated, rust *Calificar*;
//   - *HISTORIAL*, with a count of what waits for her thumb: *Por calificar*, the soonest to
//     close first — a plate that *se liberó* with *No se presentó* and *Sí pasó* — then
//     *Anteriores*, the newest first, never with a name.
// ⚠️ NOTHING HERE NAMES WHO MAY RESERVE (the final design): that setting is *Mi cocina →
// Ajustes de apartados* (`10.5b-iv-c`).
// ⚠️ READ AGAIN EVERY MINUTE WHILE THE APP IS IN FRONT (`useApartadosAlDia`, in the tabs' layout),
// and on a pull: no notification tells her a neighbour reserved until `10.5b-v`. The clock is read
// every half minute, so an hour turns rust and a window's end moves an order on its own.
// ⚠️ `10.5b-iv-b`: WITH NO SIGNAL IT IS THE PHONE'S COPY, and says when it was read; what waits to go
// is said above the list (`@/ui/SinSenal`); *Sí pasó* and *No se presentó* are queued and drawn at once,
// a refusal on its card (`rechazoDe`).
// ⚠️ `unknown` IS NOT `none`: a read that failed says so with *Intentar de nuevo*. What each
// order says is `@/lib/apartados`', pinned by `test/apartados.test.ts`. NO CHECK CAN SEE
// THIS SCREEN (ADR-035 §2.11): the phone is its instrument.
// ============================================================================

/** How often the clock is read again while the tab is up. */
const CADA_MEDIO_MINUTO = 30_000;

type Mitad = 'hoy' | 'historial';

export default function Apartados() {
  const kitchen = useKitchen();
  if (kitchen === null) return <LeyendoCocina titulo={ES.apartados.titulo} />;
  // Keyed on the kitchen: when one goes and her next-made opens, its orders are its own.
  return <ApartadosDe key={kitchen.id} kitchen={kitchen} />;
}

function ApartadosDe({ kitchen }: { kitchen: Kitchen }) {
  const apartados = useApartados(kitchen.id);
  const ahora = useAhora(CADA_MEDIO_MINUTO);
  const [mitad, setMitad] = useState<Mitad>('hoy');
  const { entregar } = useEntregar(kitchen.id);
  const { calificar } = useCalificarVecino(kitchen.id);
  const terminos = useTerminos();

  const quiet = { fontSize: SIZE.bodySize, color: PALETTE.tintaApagada } as const;
  const seccion = { fontSize: SIZE.smallSize, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: PALETTE.tintaApagada } as const;

  const abrir = (orden: Orden) => router.push({ pathname: '/apartado/[id]', params: { id: orden.id } });

  function noSePresento(orden: Orden) {
    // ⚠️ A no-show is a thumb: the terms first, once — on the order, where they can be read.
    if (!terminos.aceptados) return abrir(orden);
    calificar(orden.id, 'noSePresento');
  }

  const tarjeta = (orden: Orden) => {
    const falla = apartados.rechazoDe(orden.id);
    return (
      <TarjetaOrden
        key={orden.id}
        orden={orden}
        ahora={ahora}
        problema={falla === null ? null : ES.apartados.fallas[falla]}
        onAbrir={() => abrir(orden)}
        onEntregar={() => router.push('/entregar')}
        onCalificar={() => abrir(orden)}
        onNoSePresento={() => noSePresento(orden)}
        onSiPaso={() => entregar(orden.id)}
      />
    );
  };

  const banda = <Banda titulo={ES.apartados.titulo} antetitulo={kitchen.displayName} />;

  if (apartados.data === undefined) {
    return (
      <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
        {banda}
        <View style={{ padding: SIZE.space * 2, gap: SIZE.space }}>
          {apartados.sinSenal ? (
            <Text style={{ fontSize: SIZE.bodySize, color: PALETTE.tinta }}>{ES.cola.sinDatos}</Text>
          ) : apartados.isError ? (
            <>
              <Text style={{ fontSize: SIZE.bodySize, color: PALETTE.tinta }}>{ES.apartados.sinLeer}</Text>
              <BotonLleno label={ES.cocina.otraVez} busy={apartados.isFetching} onPress={() => void apartados.refetch()} />
            </>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SIZE.rowGap }}>
              <ActivityIndicator color={PALETTE.accion} />
              <Text style={quiet}>{ES.apartados.leyendo}</Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  const ordenes = ordenesDe(apartados.data.reservas, apartados.data.vecinos, ahora);
  const hoy = deHoy(ordenes, ahora);
  const pasado = historial(ordenes, ahora);
  const esperan = porCalificar(ordenes, ahora);
  const hoyPorCalificar = hoy.length - porEntregar(ordenes, ahora);

  return (
    <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
      {banda}
      <ScrollView
        contentContainerStyle={{ padding: SIZE.space * 1.5, paddingBottom: SIZE.space * 8, gap: SIZE.space * 1.25 }}
        refreshControl={
          <RefreshControl refreshing={apartados.isRefetching} onRefresh={() => void apartados.refetch()} tintColor={PALETTE.accion} colors={[PALETTE.accion]} />
        }
      >
        <SinSenal sinSenal={apartados.sinSenal} leidoEn={apartados.leidoEn} porEnviar={apartados.porEnviar} ahora={ahora} />
        <Llega i={0}>
          <Segmento<Mitad>
            valor={mitad}
            onCambio={(nueva) => {
              setMitad(nueva);
              // ⚠️ The days before today are read every 30 minutes; opening them asks again, so a plate
              // she confirmed meanwhile never waits here for a *No se presentó* (the review of `10.5b-iv-a`).
              if (nueva === 'historial') void apartados.refetch();
            }}
            mitades={[
              { valor: 'hoy', label: ES.apartados.hoy },
              { valor: 'historial', label: ES.apartados.historial, cuenta: esperan, cuentaAyuda: ES.apartados.cuentaAyuda(esperan) },
            ]}
          />
        </Llega>

        {mitad === 'hoy' ? (
          <Llega i={1} style={{ gap: SIZE.space }}>
            <Text style={{ fontSize: SIZE.smallSize, color: PALETTE.tintaApagada }}>
              {ES.apartados.resumen(porEntregar(ordenes, ahora), hoyPorCalificar)}
            </Text>
            <BotonLleno variante="principal" icon="ticket-confirmation-outline" label={ES.apartados.entregarUno} onPress={() => router.push('/entregar')} />
            {hoy.length === 0 ? (
              <View style={{ gap: 4, paddingVertical: SIZE.space }}>
                <Text style={{ fontSize: SIZE.bodySize, fontWeight: '600', color: PALETTE.tinta }}>{ES.apartados.vacioHoy}</Text>
                <Text style={{ fontSize: SIZE.smallSize, lineHeight: 19, color: PALETTE.tintaApagada }}>{ES.apartados.vacioHoyDetalle}</Text>
              </View>
            ) : (
              hoy.map(tarjeta)
            )}
          </Llega>
        ) : (
          <Llega i={1} style={{ gap: SIZE.space }}>
            {pasado.porCalificar.length > 0 && (
              <>
                <Text style={seccion}>{ES.apartados.porCalificarGrupo(pasado.porCalificar.length)}</Text>
                {pasado.porCalificar.map(tarjeta)}
              </>
            )}
            <Text style={seccion}>{ES.apartados.anteriores}</Text>
            {pasado.anteriores.length === 0 ? (
              <Text style={quiet}>{ES.apartados.vacioHistorial}</Text>
            ) : (
              pasado.anteriores.map((orden) => <FilaOrden key={orden.id} orden={orden} ahora={ahora} onAbrir={() => abrir(orden)} />)
            )}
          </Llega>
        )}
      </ScrollView>
    </View>
  );
}
