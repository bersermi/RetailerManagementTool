import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { entregaEsperando } from '@/api/cola';
import { useApartados, useCalificarVecino, useEntregar, useKitchen } from '@/api/hooks';
import { whatsappUrl } from '@/auth/support';
import { formatMXN } from '@/format/mxn';
import {
  calificacionTexto,
  coloresDe,
  estadoTexto,
  horaTexto,
  marcaDe,
  montoTexto,
  marcaTexto,
  nombreTexto,
  ordenesDe,
  pasaTexto,
  prontoTexto,
  queTexto,
  siNoLoCalificasTexto,
  ESPERAN_PULGAR,
  POR_ENTREGAR,
} from '@/lib/apartados';
import { useNota } from '@/lib/NotaProvider';
import { SUPPORT_WHATSAPP } from '@/lib/supportWhatsapp';
import { useAhora } from '@/lib/useAhora';
import { clockOf } from '@/lib/ventana';
import { ES } from '@/strings';
import { TITULO } from '@/theme/letra';
import { PALETTE, SIZE } from '@/theme/palette';
import { AntesDeCalificar, useTerminos } from '@/ui/AntesDeCalificar';
import { Banda } from '@/ui/Banda';
import { BotonLleno } from '@/ui/BotonLleno';
import { CalificarVecino } from '@/ui/CalificarVecino';
import { Llega } from '@/ui/Llega';
import { Accion, Calificacion, Marca } from '@/ui/TarjetaOrden';

// ============================================================================
// AN ORDER, OPENED. Plan task `10.5b-iv-a`, the owner's final design of 2026-11-10 (*An
// order opened*): the number large and its mark; *Pasa a las 14:30 · en 10 min*; what to
// prepare, how, the *desechable* and what to charge; the neighbour and her score with how
// many kitchens' thumbs it counts; when she reserved, her hour and when it is freed — then
// the one action of its state, and *Hubo un problema*, which opens WhatsApp to the owner with
// the code.
//   to hand over         green *Entregar* — the code typed (`/entregar`), from every door
//   not yet rated        her thumb (`@/ui/CalificarVecino`)
//   se liberó            rust *No se presentó*, green *Sí pasó* (the handover recorded late)
//   rated *No se presentó*  *Sí pasó* still corrects it (`hand_over_reservation` clears it)
// ⚠️ THE KITCHEN'S CANCEL HAS ITS PLACE HERE, DRAWN ONLY WHEN ITS SWITCH IS ON — and it is off
// (`cancel_reservation_as_kitchen` refuses `TD023` for everyone), so nothing is drawn.
// ⚠️ `10.5b-iv-b`: *Sí pasó*, *No se presentó* and her thumb are QUEUED and drawn at once
// (`@/api/cola`); while her handover waits on the phone the order says so, and a refusal that
// comes back is drawn here (`rechazoDe`).
// NO CHECK CAN SEE THIS SCREEN (ADR-035 §2.11): the phone is its instrument.
// ============================================================================

const CADA_MEDIO_MINUTO = 30_000;

export default function ApartadoAbierto() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const kitchen = useKitchen();
  const apartados = useApartados(kitchen?.id ?? null);
  const ahora = useAhora(CADA_MEDIO_MINUTO);
  const { entregar } = useEntregar(kitchen?.id ?? null);
  const { calificar } = useCalificarVecino(kitchen?.id ?? null);
  const terminos = useTerminos();
  const { avisar } = useNota();
  const [pidiendoTerminos, setPidiendoTerminos] = useState(false);
  // ⚠️ The name as last read: once rated, the database stops sending it (as ruled), and the panel
  // she is filling must not change its question under her thumb (found on the emulator).
  const nombreVisto = useRef<string | null>(null);

  const volver = () => (router.canGoBack() ? router.back() : router.replace('/apartados'));
  const quiet = { fontSize: SIZE.bodySize, color: PALETTE.tintaApagada } as const;
  const banda = <Banda titulo={ES.apartados.titulo} antetitulo={kitchen?.displayName ?? null} volver={{ label: ES.apartado.volver, onPress: volver }} />;

  if (kitchen === null || apartados.data === undefined) {
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

  const orden = ordenesDe(apartados.data.reservas, apartados.data.vecinos, ahora).find((o) => o.id === id) ?? null;
  if (orden === null) {
    return (
      <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
        {banda}
        <View style={{ padding: SIZE.space * 2 }}>
          <Text style={{ fontSize: SIZE.bodySize, color: PALETTE.tinta }}>{ES.apartado.yaNoEsta}</Text>
        </View>
      </View>
    );
  }

  if (orden.vecino?.nombre) nombreVisto.current = orden.vecino.nombre;
  const marca = marcaDe(orden, ahora);
  const colores = coloresDe(marca);
  const pronto = prontoTexto(orden, ahora);
  const porEntregar = POR_ENTREGAR.includes(marca);
  const aviso = siNoLoCalificasTexto(orden, ahora);
  const falla = apartados.rechazoDe(orden.id);
  const esperando = entregaEsperando(apartados.porEnviar, orden.id);
  // Her thumb's panel — which draws a refusal of its own.
  const panel = marca === 'porCalificar' || (marca === 'entregado' && orden.pulgar !== null);

  function siPaso() {
    if (orden !== null) entregar(orden.id);
  }

  function noSePresento() {
    if (orden !== null) calificar(orden.id, 'noSePresento');
  }

  const filaHora = (etiqueta: string, valor: string) => (
    <View key={etiqueta} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: SIZE.rowGap }}>
      <Text style={{ fontSize: SIZE.smallSize, color: PALETTE.tintaApagada }}>{etiqueta}</Text>
      <Text style={{ fontSize: SIZE.smallSize, fontWeight: '600', fontVariant: ['tabular-nums'], color: PALETTE.tinta }}>{valor}</Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
      {banda}
      <ScrollView contentContainerStyle={{ padding: SIZE.space * 1.5, paddingBottom: SIZE.space * 3 + insets.bottom, gap: SIZE.space }}>
        <Llega i={0} style={{ gap: SIZE.rowGap }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: SIZE.rowGap }}>
            <Text style={{ ...TITULO, fontSize: 40, letterSpacing: 1, fontVariant: ['tabular-nums'], color: PALETTE.tinta }}>{orden.codigo}</Text>
            <Marca texto={marcaTexto(orden, ahora)} fondo={colores.fondo} tinta={colores.tinta} punto={ESPERAN_PULGAR.includes(marca)} />
          </View>
          <Text style={{ fontSize: SIZE.bodySize, fontWeight: '700', color: pronto === null ? PALETTE.tinta : PALETTE.marca }}>
            {porEntregar
              ? pronto === null
                ? pasaTexto(orden.hora, ahora)
                : ES.apartados.junto(pasaTexto(orden.hora, ahora), pronto)
              : estadoTexto(orden, ahora)}
          </Text>
        </Llega>

        <Llega i={1} style={{ gap: SIZE.space }}>
          <View style={{ gap: 4, padding: SIZE.space, borderRadius: SIZE.space - 2, borderWidth: 1, borderColor: PALETTE.linea, backgroundColor: PALETTE.superficie }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: PALETTE.tinta }}>{queTexto(orden)}</Text>
            <Text style={{ fontSize: SIZE.bodySize, color: PALETTE.tinta }}>{ES.apartado.comerLargo[orden.comer]}</Text>
            {orden.desechablesCentavos > 0 && (
              <Text style={{ fontSize: SIZE.bodySize, color: PALETTE.tinta }}>{ES.apartado.conDesechable(formatMXN(orden.desechablesCentavos))}</Text>
            )}
            <View style={{ height: 1, backgroundColor: PALETTE.linea, marginVertical: 4 }} />
            <Text style={{ fontSize: 18, fontWeight: '700', color: PALETTE.tinta }}>{montoTexto(orden, ahora)}</Text>
          </View>

          {orden.vecino !== null && (
            <View style={{ gap: 4, padding: SIZE.space, borderRadius: SIZE.space - 2, borderWidth: 1, borderColor: PALETTE.linea, backgroundColor: PALETTE.superficie }}>
              <Text style={{ fontSize: SIZE.smallSize, color: PALETTE.tintaApagada }}>{ES.apartado.vecina}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SIZE.rowGap }}>
                <Text style={{ fontSize: SIZE.bodySize, fontWeight: '600', color: PALETTE.tinta }}>{nombreTexto(orden.vecino)}</Text>
                <Calificacion texto={calificacionTexto(orden.vecino)} nueva={orden.vecino.calificacion === null} />
              </View>
              {orden.vecino.calificacion !== null && (
                <Text style={{ fontSize: SIZE.smallSize, color: PALETTE.tintaApagada }}>{ES.apartado.calificaciones(orden.vecino.calificacion.total)}</Text>
              )}
            </View>
          )}

          <View style={{ gap: 6, paddingHorizontal: SIZE.space, paddingVertical: SIZE.rowGap + 2, borderRadius: SIZE.space - 2, borderWidth: 1, borderColor: PALETTE.linea, backgroundColor: PALETTE.superficie }}>
            {filaHora(ES.apartado.aparto, clockOf(orden.creadaEn))}
            {filaHora(ES.apartado.pasaFila, horaTexto(orden.hora, ahora))}
            {orden.entregaEn !== null
              ? filaHora(ES.apartado.entregado, clockOf(orden.entregaEn))
              : filaHora(ES.apartado.seLibera, clockOf(orden.guardadaHasta))}
            {esperando && <Text style={{ fontSize: SIZE.smallSize, lineHeight: 18, color: PALETTE.tintaApagada }}>{ES.entregar.guardadaAqui}</Text>}
          </View>
        </Llega>

        <Llega i={2} style={{ gap: SIZE.space }}>
          {porEntregar && <Accion label={ES.apartados.entregar} tipo="ir" onPress={() => router.push('/entregar')} />}

          {panel && (
            <CalificarVecino
              nombre={orden.vecino?.nombre ?? nombreVisto.current}
              inicial={orden.pulgar}
              ahora={ahora}
              rechazo={falla}
              onCalificar={(pulgar) => calificar(orden.id, pulgar)}
              onListo={() => avisar(ES.pulgar.calificaste(orden.vecino?.nombre ?? nombreVisto.current))}
              onDespues={marca === 'porCalificar' ? volver : null}
            />
          )}

          {/* A plate that se liberó takes no other thumb: its mark says it, and the clock's says whose. */}
          {marca === 'noSePresento' && orden.pulgar !== null && orden.pulgar.reloj && (
            <Text style={{ fontSize: SIZE.smallSize, lineHeight: 18, color: PALETTE.tintaApagada }}>{ES.pulgar.reloj}</Text>
          )}
          {marca === 'seLibero' && pidiendoTerminos && !terminos.aceptados && (
            <AntesDeCalificar
              onAcepto={() => {
                terminos.aceptar();
                setPidiendoTerminos(false);
                noSePresento();
              }}
              onDespues={() => setPidiendoTerminos(false)}
            />
          )}
          {(marca === 'seLibero' || marca === 'noSePresento') && !pidiendoTerminos && (
            <View style={{ flexDirection: 'row', gap: SIZE.rowGap }}>
              {marca === 'seLibero' && (
                <View style={{ flex: 1 }}>
                  <Accion
                    label={ES.apartados.noSePresento}
                    tipo="calificar"
                    onPress={() => (terminos.aceptados ? noSePresento() : setPidiendoTerminos(true))}
                  />
                </View>
              )}
              <View style={{ flex: 1 }}>
                {/* Both are queued in the order she taps them, and drawn at once (`@/api/cola`). */}
                <Accion label={ES.apartados.siPaso} tipo="bien" onPress={siPaso} />
              </View>
            </View>
          )}
          {aviso !== null && <Text style={{ fontSize: SIZE.smallSize, lineHeight: 18, color: PALETTE.tintaApagada }}>{aviso}</Text>}
          {falla !== null && !panel && <Text style={{ fontSize: SIZE.smallSize, lineHeight: 18, color: PALETTE.error }}>{ES.apartados.fallas[falla]}</Text>}

          {SUPPORT_WHATSAPP !== null && (
            <BotonLleno
              variante="discreto"
              icon="whatsapp"
              label={ES.apartado.huboProblema}
              onPress={() => void Linking.openURL(whatsappUrl(SUPPORT_WHATSAPP as string, ES.apartado.problemaMensaje(orden.codigo, kitchen.displayName)))}
            />
          )}
        </Llega>
      </ScrollView>
    </View>
  );
}
