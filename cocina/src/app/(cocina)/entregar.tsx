import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Falla } from '@/api/apartados';
import { useApartados, useCalificarVecino, useEntregar, useKitchen } from '@/api/hooks';
import { whatsappUrl } from '@/auth/support';
import {
  buscarCodigo,
  calificacionTexto,
  cobrasteTexto,
  cobroLargoTexto,
  coloresDe,
  marcaDe,
  marcaTexto,
  nombreTexto,
  ordenesDe,
  pasaTexto,
  queTexto,
  teclear,
  DIGITOS,
  type Orden,
} from '@/lib/apartados';
import { useNota } from '@/lib/NotaProvider';
import { SUPPORT_WHATSAPP } from '@/lib/supportWhatsapp';
import { useAhora } from '@/lib/useAhora';
import { clockOf } from '@/lib/ventana';
import { ES } from '@/strings';
import { TITULO } from '@/theme/letra';
import { PALETTE, SIZE } from '@/theme/palette';
import { Banda } from '@/ui/Banda';
import { BotonLleno } from '@/ui/BotonLleno';
import { CalificarVecino } from '@/ui/CalificarVecino';
import { Llega } from '@/ui/Llega';
import { Casillas, Teclado } from '@/ui/Teclado';
import { Calificacion, Marca } from '@/ui/TarjetaOrden';

// ============================================================================
// *ENTREGAR UN APARTADO*. Plan task `10.5b-iv-a`: slice 3's handover, ruled 2026-11-05 (the
// family-shell page, stage 2, `codeSheet`), and the final design's *After the handover*
// (2026-11-10). Pushed over the tabs from *Apartados*, from each order's *Entregar* and from
// *Hoy*'s *Lo que sigue*:
//   1. *Escribe el código del vecino* — three boxes and a keypad. ⚠️ THE CODE TYPED IS THE
//      CHECK, from every door: an order she tapped is never handed over without it.
//   2. The order with that code among TODAY's (`buscarCodigo`): what to prepare, *Para llevar:
//      empácala* or *Para comer aquí: sírvela*, and ONE BIG LINE of what to charge — *Cobra $65
//      en efectivo*, *Cobra $60 con tu terminal*, *Dale tus datos y revisa en tu banco que llegó
//      $65* — then *Ya cobré y lo entregué* (or *Ya la serví*), and *Hubo un problema*, which
//      opens WhatsApp to the owner with the code. A code today does not have is *Ese código no
//      está en tus apartados de hoy. Pídeselo otra vez.*
//   3. *Entregado* — *Cobraste $65 en efectivo · 14:31*, the neighbour and her score — and her
//      thumb (`@/ui/CalificarVecino`; the terms once before her first).
// ⚠️ THE PANEL STAYS OPEN ON THE ORDER IT OPENED ON, WITH THE NAME IT OPENED WITH (`panelPara`,
// `nombres`), found on the emulator: her thumb is saved on the tap, the list is read again, and
// once rated the database no longer sends the name (as ruled) — a panel drawn from the live read
// closed before she could add a label.
// ⚠️ *ENTREGAR* IS ALWAYS RECORDED (ruled 2026-11-10): a cancelled order, or one whose window
// ended, is handed over all the same, and the screen says so first. One already handed over
// says when, and offers her thumb if it still waits for one.
// ⚠️ ONLINE ONLY IN THIS ROW: with no signal the handover says so and keeps the code typed —
// the queue that sends it later, and today's orders kept on the phone, are `10.5b-iv-b`'s.
// NO CHECK CAN SEE THIS SCREEN (ADR-035 §2.11): the phone is its instrument.
// ============================================================================

const CADA_MEDIO_MINUTO = 30_000;

export default function Entregar() {
  const insets = useSafeAreaInsets();
  const kitchen = useKitchen();
  const apartados = useApartados(kitchen?.id ?? null);
  const ahora = useAhora(CADA_MEDIO_MINUTO);
  const { entregar, busyId } = useEntregar(kitchen?.id ?? null);
  const { calificar, busyId: calificandoId } = useCalificarVecino(kitchen?.id ?? null);
  const { avisar } = useNota();
  const [codigo, setCodigo] = useState('');
  // The order handed over on THIS screen.
  const [entregadaAqui, setEntregadaAqui] = useState<string | null>(null);
  // The order a handover was last sent for — its reply may be lost while the database wrote it.
  const [intento, setIntento] = useState<string | null>(null);
  // The order whose thumb is being given here, held until she leaves it.
  const [panelPara, setPanelPara] = useState<string | null>(null);
  // Each neighbour's name as last read, so the panel keeps it once the database stops sending it.
  const nombres = useRef(new Map<string, Orden['vecino']>());
  const [falla, setFalla] = useState<Falla | null>(null);

  const volver = () => (router.canGoBack() ? router.back() : router.replace('/apartados'));
  const quiet = { fontSize: SIZE.bodySize, color: PALETTE.tintaApagada } as const;

  const banda = <Banda titulo={ES.entregar.titulo} antetitulo={kitchen?.displayName ?? null} volver={{ label: ES.entregar.volver, onPress: volver }} />;

  if (kitchen === null || apartados.data === undefined) {
    return (
      <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
        {banda}
        <View style={{ padding: SIZE.space * 2, gap: SIZE.space }}>
          {apartados.isError ? (
            <>
              <Text style={{ fontSize: SIZE.bodySize, color: PALETTE.tinta }}>{ES.apartados.sinLeer}</Text>
              <BotonLleno label={ES.cocina.otraVez} busy={apartados.isFetching} onPress={() => void apartados.refetch()} />
            </>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SIZE.rowGap }}>
              <ActivityIndicator color={PALETTE.accion} />
              <Text style={quiet}>{ES.entregar.leyendo}</Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  const ordenes = ordenesDe(apartados.data.reservas, apartados.data.vecinos, ahora);
  for (const o of ordenes) if (o.vecino !== null) nombres.current.set(o.id, o.vecino);
  const orden = buscarCodigo(ordenes, codigo, ahora);
  const mal = codigo.length === DIGITOS && orden === null;
  const vecino = orden === null ? null : (orden.vecino ?? nombres.current.get(orden.id) ?? null);
  // ⚠️ A REPLY LOST AFTER THE DATABASE WROTE IT (the review of `10.5b-iv-a`): the re-read finds it handed
  // over — that is this screen's handover, with no error beside it and her thumb offered.
  const recuperada = orden !== null && intento === orden.id && orden.entregadaEn !== null;
  const aqui = orden !== null && (entregadaAqui === orden.id || recuperada);
  const calificando = orden !== null && (panelPara === orden.id || recuperada) && vecino !== null;

  function tecla(t: string) {
    setFalla(null);
    const siguiente = teclear(codigo.length === DIGITOS && t !== 'borrar' ? '' : codigo, t);
    setCodigo(siguiente);
    // A code typed for an order already handed over and not rated opens her thumb.
    const encontrada = buscarCodigo(ordenes, siguiente, ahora);
    setPanelPara(encontrada !== null && marcaDe(encontrada, ahora) === 'porCalificar' ? encontrada.id : null);
  }

  function otroCodigo() {
    setCodigo('');
    setFalla(null);
    setEntregadaAqui(null);
    setPanelPara(null);
    setIntento(null);
  }

  async function entregarla(o: Orden) {
    setFalla(null);
    setIntento(o.id);
    const respuesta = await entregar(o.id);
    if (respuesta !== null) return setFalla(respuesta);
    setEntregadaAqui(o.id);
    setPanelPara(o.id);
  }

  return (
    <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
      {banda}
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: SIZE.space * 1.5, paddingBottom: SIZE.space * 3 + insets.bottom, gap: SIZE.space * 1.25 }}>
        {orden === null ? (
          <Llega i={0} style={{ gap: SIZE.space * 1.25 }}>
            <Text style={{ ...TITULO, fontSize: 20, textAlign: 'center', color: PALETTE.tinta }}>{ES.entregar.escribe}</Text>
            <Casillas codigo={codigo} mal={mal} />
            <Text style={{ fontSize: SIZE.smallSize + 0.4, lineHeight: 19, textAlign: 'center', color: mal ? PALETTE.error : PALETTE.tintaApagada }}>
              {mal ? ES.entregar.noEsta : ES.entregar.teLoDice}
            </Text>
            <Teclado onTecla={tecla} />
          </Llega>
        ) : (
          <Llega i={0} style={{ gap: SIZE.space }}>
            <Encontrada
              orden={orden}
              vecino={vecino}
              ahora={ahora}
              entregadaAqui={aqui}
              ocupado={busyId === orden.id}
              falla={recuperada ? null : falla}
              onEntregar={() => void entregarla(orden)}
            />
            {calificando && vecino !== null && (
              <CalificarVecino
                nombre={vecino.nombre}
                inicial={orden.pulgar}
                ahora={ahora}
                ocupado={calificandoId === orden.id}
                onCalificar={(pulgar) => calificar(orden.id, pulgar)}
                onListo={() => {
                  avisar(ES.pulgar.calificaste(vecino.nombre));
                  volver();
                }}
                onDespues={volver}
              />
            )}
            {orden.entregadaEn !== null && !calificando && <BotonLleno variante="principal" label={ES.pulgar.listo} onPress={volver} />}
            {SUPPORT_WHATSAPP !== null && (
              <BotonLleno
                variante="discreto"
                icon="whatsapp"
                label={ES.apartado.huboProblema}
                onPress={() => void Linking.openURL(whatsappUrl(SUPPORT_WHATSAPP as string, ES.apartado.problemaMensaje(orden.codigo, kitchen.displayName)))}
              />
            )}
            <BotonLleno variante="discreto" icon="dialpad" label={ES.entregar.otroCodigo} onPress={otroCodigo} />
          </Llega>
        )}
      </ScrollView>
    </View>
  );
}

/**
 * The order the code found: what to prepare and charge, and the one button — or, once handed over,
 * the final design's *After the handover*: *Entregado*, *Cobraste $65 en efectivo · 14:31*, and the
 * neighbour with her score.
 */
function Encontrada({
  orden,
  vecino,
  ahora,
  entregadaAqui,
  ocupado,
  falla,
  onEntregar,
}: {
  orden: Orden;
  vecino: Orden['vecino'];
  ahora: Date;
  entregadaAqui: boolean;
  ocupado: boolean;
  falla: Falla | null;
  onEntregar: () => void;
}) {
  // ⚠️ HANDED OVER BY THE COUNTER, not "collected": a neighbour who swiped *Ya lo tengo* first still has
  // to be charged and handed her plate (the review of `10.5b-iv-a`).
  const recogida = orden.entregadaEn !== null;
  const colores = coloresDe(marcaDe(orden, ahora));
  if (recogida && entregadaAqui) {
    const cobraste = cobrasteTexto(orden);
    return (
      <View style={{ gap: SIZE.space }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: SIZE.rowGap }}>
          <Text style={{ ...TITULO, fontSize: 30, fontVariant: ['tabular-nums'], color: PALETTE.tinta }}>{ES.entregar.codigo(orden.codigo)}</Text>
          <Marca texto={ES.apartado.entregado} fondo={PALETTE.banda} tinta={PALETTE.tinta} />
        </View>
        <View style={{ gap: 4, padding: SIZE.space, borderRadius: SIZE.space - 2, borderWidth: 1, borderColor: PALETTE.linea, backgroundColor: PALETTE.superficie }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: PALETTE.tinta }}>{queTexto(orden)}</Text>
          {cobraste !== null && <Text style={{ fontSize: SIZE.bodySize, color: PALETTE.tinta }}>{cobraste}</Text>}
          {vecino !== null && (
            <>
              <View style={{ height: 1, backgroundColor: PALETTE.linea, marginVertical: 4 }} />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: SIZE.smallSize, fontWeight: '500', color: PALETTE.tintaApagada }}>{nombreTexto(vecino)}</Text>
                <Calificacion texto={calificacionTexto(vecino)} nueva={vecino.calificacion === null} />
              </View>
            </>
          )}
        </View>
      </View>
    );
  }
  const aviso =
    recogida && orden.entregadaEn !== null
      ? ES.entregar.yaSeEntrego(clockOf(orden.entregadaEn))
      : orden.recogidaEn !== null
        ? ES.entregar.yaLoMarco
        : orden.estado === 'cancelado' || orden.estado === 'no_va' || orden.estado === 'cancelado_cocina'
          ? ES.entregar.cancelado
          : orden.estado === 'liberado'
            ? ES.entregar.terminado
            : null;
  return (
    <View style={{ gap: SIZE.space }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: SIZE.rowGap }}>
        <Text style={{ ...TITULO, fontSize: 30, fontVariant: ['tabular-nums'], color: PALETTE.tinta }}>{ES.entregar.codigo(orden.codigo)}</Text>
        {orden.estado === 'apartado' || (orden.estado === 'recogido' && !recogida) ? (
          <Marca texto={ES.entregar.esDeHoy} fondo={PALETTE.accionSuave} tinta={PALETTE.accion} />
        ) : (
          <Marca texto={marcaTexto(orden, ahora)} fondo={colores.fondo} tinta={colores.tinta} />
        )}
      </View>
      <View style={{ gap: 2 }}>
        <Text style={{ fontSize: 18, fontWeight: '600', color: PALETTE.tinta }}>{queTexto(orden)}</Text>
        <Text style={{ fontSize: SIZE.smallSize, color: PALETTE.tintaApagada }}>{pasaTexto(orden.hora, ahora)}</Text>
      </View>
      {aviso !== null && <Text style={{ fontSize: SIZE.bodySize - 1, lineHeight: 21, fontWeight: '600', color: PALETTE.marca }}>{aviso}</Text>}
      {!recogida && (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SIZE.rowGap, padding: SIZE.space, borderRadius: SIZE.space - 2, backgroundColor: PALETTE.banda }}>
            <MaterialCommunityIcons name={orden.comer === 'aqui' ? 'silverware-fork-knife' : 'shopping-outline'} size={22} color={PALETTE.tinta} />
            <Text style={{ fontSize: SIZE.bodySize + 1, fontWeight: '700', color: PALETTE.tinta }}>{ES.entregar.comerGrande[orden.comer]}</Text>
          </View>
          <View style={{ gap: 6, padding: SIZE.space, borderRadius: SIZE.space - 2, borderWidth: 1.5, borderColor: PALETTE.accion, backgroundColor: PALETTE.superficie }}>
            <Text style={{ fontSize: SIZE.smallSize, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: PALETTE.tintaApagada }}>
              {ES.entregar.pago[orden.pago]}
            </Text>
            <Text style={{ fontSize: orden.pago === 'transferencia' ? 19 : 24, lineHeight: orden.pago === 'transferencia' ? 25 : 30, fontWeight: '800', color: PALETTE.tinta }}>
              {cobroLargoTexto(orden)}
            </Text>
            {orden.comer === 'aqui' && <Text style={{ fontSize: SIZE.smallSize, lineHeight: 18, color: PALETTE.tintaApagada }}>{ES.entregar.cobraleAqui}</Text>}
          </View>
          <BotonLleno
            variante="principal"
            icon="check"
            label={orden.comer === 'aqui' ? ES.entregar.yaLaServi : ES.entregar.yaCobre}
            busy={ocupado}
            onPress={onEntregar}
          />
        </>
      )}
      {falla !== null && <Text style={{ fontSize: SIZE.smallSize, lineHeight: 18, color: PALETTE.error }}>{ES.apartados.fallas[falla]}</Text>}
    </View>
  );
}
