import type { NombreIcono } from '@/marca/glifos';
import { Icono } from '@/ui/Icono';
import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { esDuena } from '@/api/equipo';
import { useElegirServicios, useKitchen, useNumeros, useServicios, useSuRol, useTarjeta } from '@/api/hooks';
import { PERIODOS, type Periodo } from '@/api/numeros';
import { conTarjeta } from '@/lib/ayudante';
import { ICONO_DE } from '@/lib/loQueUsas';
import { useNota } from '@/lib/NotaProvider';
import {
  diasFuertes,
  horasFuertes,
  leidoHoy,
  PERIODO_INICIAL,
  respuestasDe,
  resumenDe,
  subtituloDe,
  tarjetaDe,
  type DelResumen,
  type Respuesta,
} from '@/lib/numeros';
import { useAhora } from '@/lib/useAhora';
import { ES } from '@/strings';
import { FAMILIA_NUMERO } from '@/theme/letra';
import { PALETTE, SIZE } from '@/theme/palette';
import { ESQUINA } from '@/theme/density';
import { AsiFunciona, useAsiFunciona } from '@/ui/AsiFunciona';
import { Banda } from '@/ui/Banda';
import { Barras } from '@/ui/Barras';
import { BotonLleno } from '@/ui/BotonLleno';
import { Llega } from '@/ui/Llega';
import { Segmento } from '@/ui/Segmento';

// ============================================================================
// *TUS NÚMEROS* — HER NUMBERS' ONE SCREEN. Plan task `10.9f`, the owner's rulings G24–G27 of 2026-11-17
// and the family-shell page's `cNumeros` (round 7). Its tile on *Hoy* opens it, as does *Lo que usas*
// while she uses them (the shell's rule: a service never lives in two places).
//   - *Así funciona* the first time (`PASOS_DE`), gone when she picks a period or closes it;
//   - what is counted, true today — her reservations, and the stamps only while she uses the card;
//   - *Día · Semana · Mes*, *Semana* first (the drawing's);
//   - ⚠️ since `10.9l` (his ruling of 2026-11-19, night: *"Yes to everything"*), ONE SCROLL: on top the
//     summary row, *platos · visitas · sellos* (*vecinos* without the card), each against the period before;
//   - *Tus apartados*: five questions answered, each against the whole period before (`@/lib/numeros`'
//     `respuestasDe`): plates, visits (*N sin apartar, con su sello*), neighbours and how many came back —
//     *Aparece desde cinco vecinos* under the floor, which is the database's — and pesos *a precio publicado*;
//   - *Tu tarjeta de lealtad*, only while her kitchen uses the card (`10.9l`, `tarjetaDe`): six answers —
//     visits that got a stamp, rewards, cards going, new cards, how often they come back, cards erased with
//     *Cambiar cuándo se borran ›* (`10.9k`'s setup);
//   - *Tus días fuertes* (a week or a month) and *Tus horas fuertes*, as bars;
//   - *Cuentas de tus entregas, sin nombres.* and *Dejar de ver tus números* — off from its own screen,
//     back to *Hoy* with *Deshacer*.
// ⚠️ THE OWNER'S (G18): a helper never has its tile, and one who reaches it is sent to *Hoy*. Until her
// role is read, nothing is asked. ⚠️ BEFORE HER FIRST VISIT EVER: *Empiezan con tu primera entrega*.
// ⚠️ A READ FROM ANOTHER DAY is read again (`leidoHoy`), never drawn as today's.
// NO CHECK CAN SEE THIS SCREEN (ADR-035 §2.11): the phone is its instrument.
// ============================================================================

export default function TusNumeros() {
  const kitchen = useKitchen();
  const kitchenId = kitchen?.id ?? null;
  const rol = useSuRol(kitchenId).data;
  const duena = esDuena(rol);
  const servicios = useServicios(kitchenId);
  const numeros = useNumeros(kitchenId, { activa: duena });
  const usaTarjeta = conTarjeta(servicios.data);
  // Her rule for erasing stamps, said under *¿Cuántas tarjetas se borraron?* — read only while she uses the card.
  const tarjeta = useTarjeta(kitchenId, { activa: duena && usaTarjeta });
  const diasSinVenir = tarjeta.data?.terms != null ? tarjeta.data.terms.expiry_days : undefined;
  const { elegir, busy: quitando } = useElegirServicios(kitchenId);
  const { avisar } = useNota();
  const ahora = useAhora(60_000);
  const asi = useAsiFunciona(kitchenId ?? '', 'numeros');
  const [periodo, setPeriodo] = useState<Periodo>(PERIODO_INICIAL);
  const [problema, setProblema] = useState<string | null>(null);

  // A read from another day is read again — never yesterday's week drawn as this one. ⚠️ Not while a read
  // failed: the screen says so and offers to try again, rather than ask again for ever with no signal.
  const hoy = numeros.data !== undefined && leidoHoy(numeros.dataUpdatedAt, ahora) ? numeros.data : undefined;
  // ⚠️ With no signal the read PAUSES (TanStack's online mode) rather than fail: said, never *Leyendo* for ever.
  const sinLeer = numeros.isError || numeros.fetchStatus === 'paused';
  const otraVez = numeros.data !== undefined && hoy === undefined && !numeros.isFetching && !sinLeer;
  const { refetch } = numeros;
  useEffect(() => {
    if (otraVez) void refetch();
  }, [otraVez, refetch]);

  const volver = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const banda = <Banda titulo={ES.numeros.titulo} antetitulo={kitchen?.displayName ?? null} volver={{ label: ES.numeros.volver, onPress: volver }} />;
  const quiet = { fontSize: SIZE.bodySize, color: PALETTE.tintaApagada } as const;

  // A helper's: never hers to read (G18).
  if (rol !== undefined && !duena) return <Redirect href="/" />;

  async function dejar() {
    setProblema(null);
    const fallo = await elegir({ numeros: 'off' });
    if (fallo !== null) return setProblema(fallo);
    router.dismissTo('/');
    avisar(ES.numeros.dejados, () => elegir({ numeros: 'on' }), { hecho: ES.numeros.deshecho, fallo: ES.numeros.noSeDeshizo });
  }

  return (
    <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
      {banda}
      <ScrollView contentContainerStyle={{ padding: SIZE.space * 1.5, paddingBottom: SIZE.space * 6, gap: SIZE.space * 1.5 }}>
        {asi.visible && kitchenId !== null && (
          <Llega i={0}>
            <AsiFunciona servicio="numeros" onCerrar={asi.cerrar} />
          </Llega>
        )}
        <Text style={{ fontSize: SIZE.smallSize, lineHeight: 19, color: PALETTE.tintaApagada }}>{subtituloDe(usaTarjeta, hoy)}</Text>
        <Segmento<Periodo>
          mitades={PERIODOS.map((p) => ({ valor: p, label: ES.numeros.periodos[p] }))}
          valor={periodo}
          onCambio={(p) => {
            setPeriodo(p);
            asi.usado();
          }}
        />

        {hoy !== undefined ? (
          hoy.since === null ? (
            <Llega i={1} style={{ alignItems: 'center', gap: SIZE.rowGap, padding: SIZE.space * 2, borderRadius: ESQUINA.hoja, borderWidth: 1.5, borderStyle: 'dashed', borderColor: PALETTE.accion }}>
              <Text style={{ fontSize: SIZE.bodySize + 1, fontWeight: '800', color: PALETTE.tinta, textAlign: 'center' }}>{ES.numeros.vacioTitulo}</Text>
              <Text style={{ fontSize: SIZE.bodySize, color: PALETTE.tintaApagada, textAlign: 'center' }}>{ES.numeros.vacioTexto}</Text>
            </Llega>
          ) : (
            <>
              <Llega i={1}>
                <Resumen numeros={resumenDe(hoy, periodo, usaTarjeta)} />
              </Llega>
              <Seccion icono="silverware-fork-knife" titulo={ES.numeros.apartados} tono="apartados" />
              {respuestasDe(hoy, periodo).map((r, i) => (
                <Llega key={r.clave} i={2 + i}>
                  <Tarjeta respuesta={r} />
                </Llega>
              ))}
              {usaTarjeta && (
                <>
                  <Seccion icono={ICONO_DE.tarjeta} titulo={ES.numeros.tarjeta} tono="tarjeta" />
                  {tarjetaDe(hoy, periodo, diasSinVenir).map((r, i) => (
                    <Llega key={r.clave} i={7 + i}>
                      <Tarjeta respuesta={r} onCambiar={r.cambiar ? () => router.push('/preparar-tarjeta') : undefined} />
                    </Llega>
                  ))}
                </>
              )}
              {diasFuertes(hoy, periodo).length > 0 && <Barras titulo={ES.numeros.diasFuertes} barras={diasFuertes(hoy, periodo)} />}
              {horasFuertes(hoy, periodo).length > 0 && <Barras titulo={ES.numeros.horasFuertes} barras={horasFuertes(hoy, periodo)} />}
              <Text style={{ fontSize: SIZE.smallSize, color: PALETTE.tintaApagada }}>{usaTarjeta ? ES.numeros.sinNombresConSellos : ES.numeros.sinNombres}</Text>
            </>
          )
        ) : sinLeer ? (
          <View style={{ gap: SIZE.space }}>
            <Text style={{ fontSize: SIZE.bodySize, color: PALETTE.tinta }}>{ES.numeros.sinLeer}</Text>
            <BotonLleno label={ES.numeros.otraVez} busy={numeros.isFetching} onPress={() => void numeros.refetch()} />
          </View>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SIZE.rowGap }}>
            <ActivityIndicator color={PALETTE.accion} />
            <Text style={quiet}>{ES.numeros.leyendo}</Text>
          </View>
        )}

        {problema !== null && <Text style={{ fontSize: SIZE.bodySize, fontWeight: '600', color: PALETTE.error }}>{problema}</Text>}
        {duena && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={ES.numeros.dejar}
            accessibilityState={{ disabled: quitando }}
            disabled={quitando}
            onPress={() => void dejar()}
            style={({ pressed }) => ({ alignSelf: 'flex-start', minHeight: SIZE.tapTarget, justifyContent: 'center', opacity: pressed || quitando ? 0.6 : 1 })}
          >
            <Text style={{ fontSize: SIZE.bodySize - 1, fontWeight: '600', color: PALETTE.tintaApagada, textDecorationLine: 'underline' }}>
              {quitando ? ES.numeros.dejando : ES.numeros.dejar}
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

/**
 * One question answered: what it asks, small; the answer, large; what is under it; a share as a bar; a second line (the
 * card's); and *Cambiar cuándo se borran ›*, a link of its own, outside the card's reading.
 */
function Tarjeta({ respuesta, onCambiar }: { respuesta: Respuesta; onCambiar?: () => void }) {
  return (
    <View style={{ borderRadius: ESQUINA.hoja, backgroundColor: PALETTE.superficie }}>
      <View
        accessible
        accessibilityLabel={[`${respuesta.pregunta} ${respuesta.respuesta}`, respuesta.detalle, respuesta.debajo].filter(Boolean).join('. ')}
        style={{ gap: 2, padding: SIZE.space }}
      >
        <Text style={{ fontSize: SIZE.smallSize, fontWeight: '700', color: PALETTE.tintaApagada }}>{respuesta.pregunta}</Text>
        <Text style={{ fontSize: SIZE.titleSize + 4, lineHeight: SIZE.titleSize + 8, fontFamily: FAMILIA_NUMERO, fontVariant: ['tabular-nums'], color: PALETTE.tinta }}>{respuesta.respuesta}</Text>
        <Text style={{ fontSize: SIZE.smallSize, lineHeight: 18, color: PALETTE.tintaApagada }}>{respuesta.detalle}</Text>
        {respuesta.barra !== null && (
          <View style={{ marginTop: 6, height: 8, borderRadius: ESQUINA.marca, backgroundColor: PALETTE.accionSuave, overflow: 'hidden' }}>
            <View style={{ width: `${Math.round(respuesta.barra * 100)}%`, height: '100%', borderRadius: ESQUINA.marca, backgroundColor: PALETTE.accion }} />
          </View>
        )}
        {respuesta.debajo !== undefined && (
          <Text style={{ marginTop: 4, fontSize: SIZE.smallSize, lineHeight: 18, color: PALETTE.tintaApagada }}>{respuesta.debajo}</Text>
        )}
      </View>
      {onCambiar !== undefined && (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={ES.numeros.cambiarCuando}
          onPress={onCambiar}
          style={({ pressed }) => ({
            minHeight: SIZE.tapTarget,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 2,
            paddingHorizontal: SIZE.space,
            borderTopWidth: 1,
            borderTopColor: PALETTE.linea,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Text style={{ fontSize: SIZE.bodySize - 1, fontWeight: '700', color: PALETTE.accion }}>{ES.numeros.cambiarCuando}</Text>
          <Icono name="chevron-right" size={18} color={PALETTE.accion} />
        </Pressable>
      )}
    </View>
  );
}

/** The summary row on top: three numbers side by side, each with what it counts and the period before (`10.9l`). */
function Resumen({ numeros }: { numeros: readonly DelResumen[] }) {
  return (
    <View style={{ flexDirection: 'row', gap: SIZE.rowGap }}>
      {numeros.map((n) => (
        <View
          key={n.clave}
          accessible
          accessibilityLabel={`${n.cifra} ${n.que}, ${n.antes}`}
          style={{
            flex: 1,
            alignItems: 'center',
            gap: 1,
            paddingVertical: SIZE.space - 2,
            paddingHorizontal: 6,
            borderRadius: ESQUINA.hoja,
            // `11.7-ii`: no edge on the counter but the stamps', its green sign.
            borderWidth: n.clave === 'sellos' ? 1 : 0,
            borderColor: PALETTE.accion,
            backgroundColor: PALETTE.superficie,
          }}
        >
          <Text style={{ fontSize: SIZE.titleSize + 4, lineHeight: SIZE.titleSize + 8, fontFamily: FAMILIA_NUMERO, fontVariant: ['tabular-nums'], color: PALETTE.tinta }}>{n.cifra}</Text>
          <Text style={{ fontSize: SIZE.smallSize, fontWeight: '600', color: PALETTE.tinta }}>{n.que}</Text>
          <Text style={{ fontSize: SIZE.smallSize - 1.6, color: PALETTE.tintaApagada, textAlign: 'center' }}>{n.antes}</Text>
        </View>
      ))}
    </View>
  );
}

/** A section's head: its icon on its tint, and its name — *Tus apartados*, *Tu tarjeta de lealtad* (`10.9l`). */
function Seccion({
  icono,
  titulo,
  tono,
}: {
  icono: NombreIcono;
  titulo: string;
  tono: 'apartados' | 'tarjeta';
}) {
  const [fondo, tinta] = tono === 'tarjeta' ? [PALETTE.accionSuave, PALETTE.accion] : [PALETTE.marcaSuave, PALETTE.marca];
  return (
    <View accessibilityRole="header" style={{ flexDirection: 'row', alignItems: 'center', gap: SIZE.rowGap, marginTop: 4 }}>
      <View style={{ width: 26, height: 26, borderRadius: ESQUINA.chip, alignItems: 'center', justifyContent: 'center', backgroundColor: fondo }}>
        <Icono name={icono} size={16} color={tinta} />
      </View>
      <Text style={{ fontSize: SIZE.bodySize + 2, fontWeight: '800', color: PALETTE.tinta }}>{titulo}</Text>
    </View>
  );
}
