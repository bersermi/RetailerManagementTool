import { Icono } from '@/ui/Icono';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { diaTexto, type Falla } from '@/api/apartados';
import { entregaEsperando } from '@/api/cola';
import { useApartados, useAvisos, useCalificarVecino, useConsentimiento, useEntregar, useKitchen, useLlavesDeSello } from '@/api/hooks';
import { leerSello, reservaDeSello, revisarSello, versionNueva, type SelloLeido } from '@/api/sello';
import { useAuth } from '@/auth/AuthProvider';
import { whatsappUrl } from '@/auth/support';
import {
  buscarCodigo,
  calificacionTexto,
  cobrasteTexto,
  cobroLargoTexto,
  coloresDe,
  cuandoTexto,
  marcaDe,
  marcaTexto,
  nombreTexto,
  ordenDeSello,
  ordenesDe,
  pasaTexto,
  queTexto,
  teclear,
  DIGITOS,
  type Orden,
} from '@/lib/apartados';
import { useNota } from '@/lib/NotaProvider';
import { hayQuePreguntar, preguntadoAqui } from '@/lib/ofertas';
import { usePermisoDeAvisos } from '@/lib/useAvisosDelTelefono';
import { deviceStore } from '@/lib/store';
import { SUPPORT_WHATSAPP } from '@/lib/supportWhatsapp';
import { useAhora } from '@/lib/useAhora';
import { clockOf, dayOf } from '@/lib/ventana';
import { ES } from '@/strings';
import { TITULO, letraEncabezado } from '@/theme/letra';
import { PALETTE, SIZE } from '@/theme/palette';
import { ESQUINA } from '@/theme/density';
import { Banda } from '@/ui/Banda';
import { BotonLleno } from '@/ui/BotonLleno';
import { CalificarVecino } from '@/ui/CalificarVecino';
import { HojaOfertas } from '@/ui/HojaOfertas';
import { Escaner } from '@/ui/Escaner';
import { Llega } from '@/ui/Llega';
import { Boleto, SelloPalabra } from '@/ui/Mostrador';
import { SinSenal } from '@/ui/SinSenal';
import { Casillas, Teclado } from '@/ui/Teclado';
import { CODIGO, Calificacion, Marca } from '@/ui/TarjetaOrden';

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
// ⚠️⚠️ `10.5b-iv-b`: IT WORKS WITH NO SIGNAL. Her orders are the phone's copy (`@/api/persist`) and
// the screen says when it was read (`@/ui/SinSenal`); *Ya cobré y lo entregué* and her thumb are QUEUED
// and drawn at once (`@/api/cola`) — never a wait at the counter, with signal or without — and
// *Entregado* says *Guardada en este teléfono…* while the handover waits. With no signal a code not on
// the phone may be a reservation made since: *Ese código no está en tus apartados de las 13:05. Sin
// señal no llegan los nuevos.* A refusal that comes back later is drawn on the order (`rechazoDe`).
// ⚠️⚠️ `10.9j-ii-b` — *ESCANEAR SU CÓDIGO* (the owner's J2 and J3 of 2026-11-20): on the keypad, always, *Escanea el
// código de su apartado: tu teléfono lo revisa sin señal.* — the QR on her ticket in Itacate, sealed by the
// database with her kitchen's secret (`0088`), checked HERE with the secrets this phone keeps (`@/api/sello`,
// `useLlavesDeSello`), with signal or without. An order this phone has read is drawn as if typed; one it never read
// — made after its last read, with no signal since — is drawn FROM THE SEAL (`ordenDeSello`) under *Revisado en este
// teléfono* and *Su nombre y su calificación aparecen cuando vuelva la señal.*, and *Ya cobré y lo entregué* queues
// its handover by id, as any (`@/api/cola`). Another kitchen's ticket, an altered one, or one this phone holds no
// secret for: *Ese código no es de un apartado de tu cocina.* — and a secret newer than this phone's, with signal,
// is read again and the same scan checked once more. ⚠️ J3: a typed code it never read is never handed over; with no
// signal the keypad's own line says so, and the QR is the way (no *Entregarlo así*).
// ⚠️ `11.8-i`: THE ORDER IS A TICKET (the design system's *Boleto* and *Sello*): *Ya cobré y lo entregué* on its stub,
// and once handed over the ticket without it, *Entregado* pressed on what is left. The stub tearing and the stamp
// landing are `11.8-ii`'s. NO CHECK CAN SEE THIS SCREEN (ADR-035 §2.11): the phone is its instrument.
// ============================================================================

const CADA_MEDIO_MINUTO = 30_000;

export default function Entregar() {
  const insets = useSafeAreaInsets();
  const kitchen = useKitchen();
  const apartados = useApartados(kitchen?.id ?? null);
  const ahora = useAhora(CADA_MEDIO_MINUTO);
  const { entregar } = useEntregar(kitchen?.id ?? null);
  const { calificar } = useCalificarVecino(kitchen?.id ?? null);
  const llaves = useLlavesDeSello(kitchen?.id ?? null);
  const { avisar } = useNota();
  const [codigo, setCodigo] = useState('');
  // ⚠️ `10.9j-ii-b`: the camera open, the seal she showed once checked, when this phone handed over an order it
  // knows only from its seal, and a seal refused for a secret this phone had not read — checked again when it has.
  const [escaneando, setEscaneando] = useState(false);
  const [sello, setSello] = useState<SelloLeido | null>(null);
  const [entregadaDelSello, setEntregadaDelSello] = useState<Date | null>(null);
  const [pendiente, setPendiente] = useState<SelloLeido | null>(null);
  // The order handed over on THIS screen.
  const [entregadaAqui, setEntregadaAqui] = useState<string | null>(null);
  // The order whose thumb is being given here, held until she leaves it.
  const [panelPara, setPanelPara] = useState<string | null>(null);
  // Each neighbour's name as last read, so the panel keeps it once the database stops sending it.
  const nombres = useRef(new Map<string, Orden['vecino']>());

  const volver = () => (router.canGoBack() ? router.back() : router.replace('/apartados'));

  // ⚠️ `10.5c-iii`: *¿TE MANDAMOS NOVEDADES DE WERA COCINA?* — the design's moment, after a handover: leaving with
  // the plate handed over raises the sheet once (`@/lib/ofertas`' `hayQuePreguntar` — dark until the analyst turns
  // *Novedades* on, his test accounts aside), and she leaves when it closes.
  const avisos = useAvisos();
  const consentimiento = useConsentimiento();
  const { permiso } = usePermisoDeAvisos();
  const [ofertas, setOfertas] = useState(false);
  const { session } = useAuth();
  const terminar = () => {
    const userId = session?.user.id ?? null;
    const preguntado = userId !== null && preguntadoAqui(deviceStore(), userId);
    if (hayQuePreguntar({ avisos: avisos.data, consentimiento: consentimiento.data, preguntado, permiso })) setOfertas(true);
    else volver();
  };

  // ⚠️ `10.9j-ii-b`: a seal refused only because this phone had not read its secret's version is checked again
  // once her kitchen's secrets are read again (`leer`, with signal) — she need not show it a second time.
  useEffect(() => {
    if (pendiente === null || kitchen === null || llaves.data === undefined) return;
    if (revisarSello(pendiente, kitchen.id, llaves.data, new Date()) === 'valido') {
      setSello(pendiente);
      setEscaneando(false);
    }
    setPendiente(null);
  }, [pendiente, kitchen, llaves.data]);
  const quiet = { fontSize: SIZE.bodySize, color: PALETTE.tintaApagada } as const;

  const banda = <Banda titulo={ES.entregar.titulo} antetitulo={kitchen?.displayName ?? null} volver={{ label: ES.entregar.volver, onPress: volver }} />;

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
              <Text style={quiet}>{ES.entregar.leyendo}</Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  const ordenes = ordenesDe(apartados.data.reservas, apartados.data.vecinos, ahora);
  for (const o of ordenes) if (o.vecino !== null) nombres.current.set(o.id, o.vecino);
  // ⚠️ `10.9j-ii-b`: a seal she showed names its order by id — the read's when this phone has it, else the seal's own.
  const leida = sello === null ? null : (ordenes.find((o) => o.id === sello.reservaId) ?? null);
  const revisada = sello !== null && leida === null;
  const orden =
    sello === null
      ? buscarCodigo(ordenes, codigo, ahora)
      : (leida ?? ordenDeSello(reservaDeSello(sello, diaTexto), entregadaDelSello));
  const mal = codigo.length === DIGITOS && orden === null;
  const vecino = orden === null ? null : (orden.vecino ?? nombres.current.get(orden.id) ?? null);
  const aqui = orden !== null && entregadaAqui === orden.id;
  const calificando = orden !== null && panelPara === orden.id && vecino !== null;
  const noEsta =
    apartados.sinSenal && apartados.leidoEn !== null ? ES.entregar.noEstaSinSenal(cuandoTexto(apartados.leidoEn, ahora)) : ES.entregar.noEsta;

  function tecla(t: string) {
    const siguiente = teclear(codigo.length === DIGITOS && t !== 'borrar' ? '' : codigo, t);
    setCodigo(siguiente);
    // A code typed for an order already handed over and not rated opens her thumb.
    const encontrada = buscarCodigo(ordenes, siguiente, ahora);
    setPanelPara(encontrada !== null && marcaDe(encontrada, ahora) === 'porCalificar' ? encontrada.id : null);
  }

  function otroCodigo() {
    setCodigo('');
    setEntregadaAqui(null);
    setPanelPara(null);
    setSello(null);
    setEntregadaDelSello(null);
    setEscaneando(false);
  }

  /**
   * ⚠️ `10.9j-ii-b`: what the camera read. `true` closes it — a seal of this kitchen, checked on this phone. A QR that
   * is no seal, or not this kitchen's, keeps it open under *Ese código no es de un apartado de tu cocina.*; one sealed
   * with a secret newer than this phone's is checked again once it is read (with signal).
   */
  function leer(texto: string): boolean {
    if (kitchen === null) return false;
    const leido = leerSello(texto);
    if (leido === null) return false;
    const guardadas = llaves.data ?? [];
    if (revisarSello(leido, kitchen.id, guardadas, new Date()) !== 'valido') {
      if (versionNueva(leido, guardadas) && !apartados.sinSenal) {
        setPendiente(null);
        void llaves.refetch().then(() => setPendiente(leido));
      }
      return false;
    }
    setCodigo('');
    setEntregadaAqui(null);
    setEntregadaDelSello(null);
    setSello(leido);
    setEscaneando(false);
    const conocida = ordenes.find((o) => o.id === leido.reservaId);
    setPanelPara(conocida !== undefined && marcaDe(conocida, ahora) === 'porCalificar' ? conocida.id : null);
    return true;
  }

  // ⚠️ `10.5b-iv-b`: on the phone before the next frame, drawn as handed over at once (`@/api/cola`).
  function entregarla(o: Orden) {
    entregar(o.id);
    setEntregadaAqui(o.id);
    setPanelPara(o.id);
    // ⚠️ `10.9j-ii-b`: an order known only from its seal is drawn handed over from this moment, as the queue sends it.
    if (revisada) setEntregadaDelSello(new Date());
  }

  return (
    <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
      {banda}
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: SIZE.space * 1.5, paddingBottom: SIZE.space * 3 + insets.bottom, gap: SIZE.space * 1.25 }}>
        <SinSenal sinSenal={apartados.sinSenal} leidoEn={apartados.leidoEn} porEnviar={apartados.porEnviar} ahora={ahora} cola={false} />
        {orden === null ? (
          <Llega i={0} style={{ gap: SIZE.space * 1.25 }}>
            <Text style={{ ...TITULO, fontSize: 20, textAlign: 'center', color: PALETTE.tinta }}>{ES.entregar.escribe}</Text>
            <Casillas codigo={codigo} mal={mal} />
            <Text style={{ fontSize: SIZE.smallSize + 0.4, lineHeight: 19, textAlign: 'center', color: mal ? PALETTE.error : PALETTE.tintaApagada }}>
              {mal ? noEsta : ES.entregar.teLoDice}
            </Text>
            <View style={{ gap: SIZE.rowGap }}>
              <Text style={{ fontSize: SIZE.smallSize, lineHeight: 18, textAlign: 'center', color: PALETTE.tintaApagada }}>{ES.entregar.escanear.ayuda}</Text>
              {escaneando ? (
                <Escaner textos={ES.entregar.escanear.escaner} onLeido={leer} />
              ) : (
                <BotonLleno variante="principal" icon="qrcode-scan" label={ES.entregar.escanear.escaner.boton} onPress={() => setEscaneando(true)} />
              )}
            </View>
            <Teclado onTecla={tecla} />
          </Llega>
        ) : (
          <Llega i={0} style={{ gap: SIZE.space }}>
            <Encontrada
              orden={orden}
              vecino={vecino}
              ahora={ahora}
              revisada={revisada}
              entregadaAqui={aqui}
              esperando={entregaEsperando(apartados.porEnviar, orden.id)}
              falla={apartados.rechazoDe(orden.id)}
              onEntregar={() => entregarla(orden)}
            />
            {calificando && vecino !== null && (
              <CalificarVecino
                nombre={vecino.nombre}
                inicial={orden.pulgar}
                ahora={ahora}
                rechazo={apartados.rechazoDe(orden.id)}
                onCalificar={(pulgar) => calificar(orden.id, pulgar)}
                onListo={() => {
                  avisar(ES.pulgar.calificaste(vecino.nombre));
                  terminar();
                }}
                onDespues={terminar}
              />
            )}
            {orden.entregadaEn !== null && !calificando && <BotonLleno variante="principal" label={ES.pulgar.listo} onPress={terminar} />}
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
      <HojaOfertas
        visible={ofertas}
        pregunta
        onCerrar={() => {
          setOfertas(false);
          volver();
        }}
      />
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
  revisada,
  entregadaAqui,
  esperando,
  falla,
  onEntregar,
}: {
  orden: Orden;
  vecino: Orden['vecino'];
  ahora: Date;
  /** ⚠️ `10.9j-ii-b`: drawn from her ticket's seal — this phone never read it, and checked it itself. */
  revisada: boolean;
  entregadaAqui: boolean;
  /** Her handover of it is still on the phone (`@/api/cola`). */
  esperando: boolean;
  /** The database refused a send about it, or `null`. */
  falla: Falla | null;
  onEntregar: () => void;
}) {
  // ⚠️ HANDED OVER BY THE COUNTER, not "collected": a neighbour who swiped *Ya lo tengo* first still has
  // to be charged and handed her plate (the review of `10.5b-iv-a`).
  const recogida = orden.entregadaEn !== null;
  const colores = coloresDe(marcaDe(orden, ahora));
  const revisadoAqui = revisada && (
    <View style={{ flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center', gap: 6, paddingVertical: 4, paddingHorizontal: 10, borderRadius: ESQUINA.chip, backgroundColor: PALETTE.accionSuave }}>
      <Icono name="check" size={14} color={PALETTE.accion} />
      <Text style={{ fontSize: SIZE.smallSize, fontWeight: '700', color: PALETTE.accion }}>{ES.entregar.revisado}</Text>
    </View>
  );
  const despues = revisada && <Text style={{ fontSize: SIZE.smallSize, lineHeight: 18, color: PALETTE.tintaApagada }}>{ES.entregar.despues}</Text>;
  if (recogida && entregadaAqui) {
    const cobraste = cobrasteTexto(orden);
    // ⚠️ `11.8-i`: WHAT IS LEFT OF THE TICKET ONCE HANDED OVER — its stub gone, *Entregado* pressed on it as a
    // stamp in her green (`@/ui/Mostrador`'s `SelloPalabra`; it lands at `11.8-ii`).
    return (
      <View style={{ gap: SIZE.space }}>
        {revisadoAqui}
        <Boleto
          padding={SIZE.space}
          cuerpo={
            <View style={{ gap: 4 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: SIZE.rowGap, marginBottom: 4 }}>
                <Text style={{ ...CODIGO, color: PALETTE.tinta }}>{ES.entregar.codigo(orden.codigo)}</Text>
                <SelloPalabra texto={ES.apartado.entregado} tinta={PALETTE.accion} />
              </View>
              <Text style={{ fontSize: 18, fontWeight: '600', color: PALETTE.tinta }}>{queTexto(orden)}</Text>
              {cobraste !== null && <Text style={{ fontSize: SIZE.bodySize, color: PALETTE.tinta }}>{cobraste}</Text>}
              {esperando && (
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
                  <Icono name="cloud-upload-outline" size={16} color={PALETTE.tintaApagada} style={{ marginTop: 2 }} />
                  <Text style={{ flex: 1, fontSize: SIZE.smallSize, lineHeight: 18, color: PALETTE.tintaApagada }}>{ES.entregar.guardadaAqui}</Text>
                </View>
              )}
              {despues}
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
          }
        />
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
  // ⚠️ `11.8-i`: THE ORDER HER CODE FOUND IS A TICKET — what to prepare and charge on its body, and *Ya cobré y lo
  // entregué* on the stub that tears (`@/ui/Mostrador`'s `Boleto`). One handed over already has no stub.
  return (
    <View style={{ gap: SIZE.space }}>
      {revisadoAqui}
      <Boleto
        padding={SIZE.space}
        cuerpo={
          <View style={{ gap: SIZE.space }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: SIZE.rowGap }}>
              <Text style={{ ...CODIGO, color: PALETTE.tinta }}>{ES.entregar.codigo(orden.codigo)}</Text>
              {revisada ? (
                // ⚠️ `10.9j-ii-b`: a seal of another day says its day — *Es de hoy* only when it is.
                <Marca
                  texto={diaTexto(orden.hora) === diaTexto(ahora) ? ES.entregar.esDeHoy : dayOf(orden.hora, ahora)}
                  fondo={PALETTE.accionSuave}
                  tinta={PALETTE.accion}
                />
              ) : orden.estado === 'apartado' || (orden.estado === 'recogido' && !recogida) ? (
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
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: SIZE.rowGap, padding: SIZE.space, borderRadius: ESQUINA.hoja, backgroundColor: PALETTE.banda }}>
                  <Icono name={orden.comer === 'aqui' ? 'silverware-fork-knife' : 'shopping-outline'} size={22} color={PALETTE.tinta} />
                  <Text style={{ fontSize: SIZE.bodySize + 1, fontWeight: '700', color: PALETTE.tinta }}>{ES.entregar.comerGrande[orden.comer]}</Text>
                </View>
                <View style={{ gap: 6, padding: SIZE.space, borderRadius: ESQUINA.hoja, borderWidth: 1.5, borderColor: PALETTE.accion, backgroundColor: PALETTE.superficie }}>
                  <Text style={{ ...letraEncabezado(SIZE), color: PALETTE.tinta }}>
                    {ES.entregar.pago[orden.pago]}
                  </Text>
                  <Text style={{ fontSize: orden.pago === 'transferencia' ? 19 : 24, lineHeight: orden.pago === 'transferencia' ? 25 : 30, fontWeight: '800', color: PALETTE.tinta }}>
                    {cobroLargoTexto(orden)}
                  </Text>
                  {orden.comer === 'aqui' && <Text style={{ fontSize: SIZE.smallSize, lineHeight: 18, color: PALETTE.tintaApagada }}>{ES.entregar.cobraleAqui}</Text>}
                </View>
                {despues}
              </>
            )}
            {falla !== null && <Text style={{ fontSize: SIZE.smallSize, lineHeight: 18, color: PALETTE.error }}>{ES.apartados.fallas[falla]}</Text>}
          </View>
        }
        talon={
          recogida ? null : (
            <BotonLleno variante="principal" icon="check" label={orden.comer === 'aqui' ? ES.entregar.yaLaServi : ES.entregar.yaCobre} onPress={onEntregar} />
          )
        }
      />
    </View>
  );
}
