import { Icono } from '@/ui/Icono';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { porCalificar, type Apartado } from '@/api/apartados';
import { rechazoDe, recogiEsperando } from '@/api/cola';
import { apiErrorMessage } from '@/api/errors';
import { useApartados, useAvisos, useCancelarApartado, useCocinas, useConsentimiento, useSiguiendo, useYaLoTengo } from '@/api/hooks';
import { useAuth } from '@/auth/AuthProvider';
import { usePermisoDeAvisos } from '@/lib/AvisosDelTelefono';
import { anteriorTexto, conElQueSeArranca, pasaTexto, platoTexto, porConfirmarTexto, puedeCancelar, razonTexto, seccionesDe } from '@/lib/apartados';
import { useCola } from '@/lib/cola';
import { preguntarSeguir } from '@/lib/misCocinas';
import { hayQuePreguntar, preguntadoAqui } from '@/lib/ofertas';
import { deviceStore } from '@/lib/store';
import { useAhora } from '@/lib/useAhora';
import { useSenal } from '@/lib/useSenal';
import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';
import { ESQUINA } from '@/theme/density';
import { Banda } from '@/ui/Banda';
import { BoletoApartado } from '@/ui/BoletoApartado';
import { BotonLleno } from '@/ui/BotonLleno';
import { Calificar, Estrellas } from '@/ui/Calificar';
import { Deslizar } from '@/ui/Deslizar';
import { Formulario } from '@/ui/Formulario';
import { Grupo } from '@/ui/Grupo';
import { Hoja } from '@/ui/Hoja';
import { HojaOfertas } from '@/ui/HojaOfertas';
import { Llega } from '@/ui/Llega';
import { PreguntaSeguir, marcarRespondida, respondida as yaRespondida } from '@/ui/PreguntaSeguir';
import { SinSenal } from '@/ui/SinSenal';
import { DibujoVacio } from '@/ui/Dibujo';

// ============================================================================
// *APARTADOS*. Plan task `10.5b-iii-a` — the second tab from `10.5-v-b`, filled as the
// family-shell page's stage 2 draws it (the owner's rulings of 2026-11-05):
// each reservation still to collect as a whole ticket (`@/ui/BoletoApartado`), soonest
// first; a cancel by the kitchen while its window is open (`0080`'s, switched off — read
// correctly the day it turns on); and *Anteriores*, her last 30 days.
//
// ⚠️ *YA LO TENGO* AND *¿CAMBIO DE PLANES?* ARE HERS ALONE (`0079`): the swipe says it at
// once, *Cancelar* and *No voy a poder ir* ask first in a sheet, since a plate given back
// goes to another neighbour. ⚠️ A TAB STAYS MOUNTED: what she just collected is said until
// she leaves the tab. The list is read again every minute while one is pending
// (`useApartados`), and on a pull. ⚠️ A PLATE THAT *SE LIBERÓ* LESS THAN A DAY AGO keeps
// its swipe (`porConfirmar`): the kitchen may have handed it over without typing her code,
// and her *Ya lo tengo* is taken until a day after the window (`0079`) — found by the review
// of `10.5b-iii-a`, before it shipped.
// ⚠️ SINCE `10.5b-iii-b` (AFTER THE PLATE) HER STARS ABOUT THE KITCHEN (`@/ui/Calificar`): under
// *Ya lo tienes* the moment she swipes, and on a past plate she collected until the day after
// its window (`rate_until`) — *Calificar* opens them under its row; once given, her stars stay on
// the row. The screen is a `Formulario`, so her note stays above the keyboard. NO CHECK CAN SEE
// THIS SCREEN (ADR-035 §2.11).
// ⚠️⚠️ SINCE `10.9d-ii` NOT A TAB (the owner's ruling G39 of 2026-11-17): a screen pushed OVER the
// tabs at the same address, `/apartados` — so her reminder's tap (`@/lib/recordatorio`' `RUTA`)
// and *Ver tu apartado* after reserving still land — with *Volver*. It is reached from her
// reservation pinned on *Cerca* and *Mis cocinas* (`@/ui/ApartadoFijado`) and from *Tus apartados
// anteriores* at the foot of *Mis cocinas*. ⚠️ AND *¿SEGUIR A …?* (G20, `@/ui/PreguntaSeguir`): once,
// after her first pickup at a kitchen she does not follow — under *Ya lo tienes*, and under that
// plate in *Anteriores* while it can still be rated (`@/lib/misCocinas`' `preguntarSeguir`).
// ⚠️⚠️ SINCE `10.9j-ii-a` IT WORKS WITH NO SIGNAL (the owner's J1 and J4 of 2026-11-20): her tickets
// still to collect are her phone's (`@/lib/boletos`), each with its QR (`@/ui/BoletoApartado`), under
// *Sin señal. Lo que ves se leyó a las 13:40.* (`@/ui/SinSenal`, from the app's one signal); and
// *Ya lo tengo* is QUEUED (`@/lib/cola`) — *Ya lo tienes* at once, *Guardado en este teléfono…* and
// *Podrás calificar a la cocina cuando vuelva la señal.* while it waits, her stars once it lands; a
// refusal that comes back later is said under it (`rechazoDe`).
// ⚠️ SINCE `10.5c-iii` *¿TE AVISAMOS DE OFERTAS?* (`@/ui/HojaOfertas`), the design's moment — after a *Ya lo
// tengo*: once she taps her stars' *Listo*, if `@/lib/ofertas`' `hayQuePreguntar` says so (offers offered to her,
// never answered, never asked on this phone, a phone that shows notifications or can still ask). Dark until the
// analyst turns offers on — today only his test accounts are offered them.
// ⚠️⚠️ `11.8-ii`: THE STUB TEARS (*El talón se arranca*, 200 ms). Her queue drops the ticket she swiped from her list at
// once, so it is kept in its place (`conElQueSeArranca`) while the stub holding *Ya lo tengo* tears off it; then the
// ticket goes and *Ya lo tienes* arrives (its `Llega`) — what she did is on her phone from the swipe, and only the
// drawing follows the tear. A plate *por confirmar* is a sheet with no stub: *Ya lo tienes* at once.
// ============================================================================

/** The clock this screen reads — *faltan 25 min*, and *Cancelar* turning into *No voy a poder ir*. */
const CADA_MEDIO_MINUTO = 30_000;

export default function Apartados() {
  const apartados = useApartados();
  const cocinas = useCocinas();
  const siguiendo = useSiguiendo();
  const ahora = useAhora(CADA_MEDIO_MINUTO);
  const { cancelar, busy: cancelando } = useCancelarApartado();
  const { confirmar } = useYaLoTengo();
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const cola = useCola();
  const sinSenal = useSenal() === false;
  const [recogido, setRecogido] = useState<Apartado | null>(null);
  /** ⚠️ `11.8-ii`: the ticket she just swiped, and its place, while its stub tears. */
  const [arrancando, setArrancando] = useState<{ apartado: Apartado; i: number } | null>(null);
  /** A past plate she opened *Calificar* on. */
  const [calificando, setCalificando] = useState<string | null>(null);
  const [cambio, setCambio] = useState<Apartado | null>(null);
  const [falla, setFalla] = useState<string | null>(null);
  /** Plates whose *¿Seguir a …?* she answered while on this screen. */
  const [respondidas, setRespondidas] = useState<ReadonlySet<string>>(new Set());
  const avisos = useAvisos();
  const consentimiento = useConsentimiento();
  const { permiso } = usePermisoDeAvisos();
  const [ofertas, setOfertas] = useState(false);

  /** Her stars given: the plate's card closes, and the offers' sheet rises if it is still to ask. */
  function calificado() {
    setRecogido(null);
    const preguntado = userId !== null && preguntadoAqui(deviceStore(), userId);
    if (hayQuePreguntar({ avisos: avisos.data, consentimiento: consentimiento.data, preguntado, permiso })) setOfertas(true);
  }

  // What she just collected is said while she stays; leaving the tab clears it.
  useFocusEffect(
    useCallback(() => () => {
      setRecogido(null);
      setArrancando(null);
      setCalificando(null);
      setFalla(null);
    }, []),
  );

  const puertaDe = (apartado: Apartado) => cocinas.data?.find((cocina) => cocina.id === apartado.cocina.id);

  // ⚠️ `10.9j-ii-a`: queued, written to her phone before this returns — never awaited (J4). ⚠️ `11.8-ii`: a ticket's
  // place `i` keeps it there while its stub tears; a plate with no stub has none.
  function yaLoTengo(apartado: Apartado, i?: number) {
    setFalla(null);
    if (confirmar(apartado.id)) {
      setRecogido(apartado);
      if (i !== undefined) setArrancando({ apartado, i });
    } else setFalla(ES.apartar.fallas.sesion);
  }

  async function darloDeVuelta() {
    if (cambio === null) return;
    const resultado = await cancelar(cambio.id);
    if (resultado.ok) {
      setCambio(null);
      setFalla(null);
    } else {
      setFalla(ES.apartar.fallas[resultado.falla]);
    }
  }

  const lista = apartados.data;
  const secciones = lista === undefined ? null : seccionesDe(lista, ahora);
  const pendientes = secciones === null ? [] : conElQueSeArranca(secciones.pendientes, arrancando);
  /** Her *Ya lo tengo* for the plate she just swiped, still on the phone. */
  const esperando = recogido !== null && recogiEsperando(cola.envios, recogido.id);
  /** A swipe the database refused for good, said under *Ya lo tienes* — or on its own once she leaves. */
  const rechazado = recogido === null ? null : rechazoDe(cola, userId, recogido.id, ahora);
  const leidoEn = apartados.dataUpdatedAt > 0 ? new Date(apartados.dataUpdatedAt) : null;
  /** Whether to ask *¿Seguir a …?* under a plate — read from the list as it is now, never the copy she swiped. */
  const pregunta = (id: string) => {
    const apartado = lista?.find((a) => a.id === id);
    return apartado !== undefined && !respondidas.has(id) && !yaRespondida(id) && preguntarSeguir(apartado, lista ?? [], siguiendo.data, ahora);
  };
  const respondida = (id: string) => {
    marcarRespondida(id);
    setRespondidas((antes) => new Set(antes).add(id));
  };
  const hoja = cambio !== null && puedeCancelar(cambio, ahora) ? ES.apartados.hojaCancelar : ES.apartados.hojaNoVoy;

  return (
    <View style={styles.pantalla}>
      <Banda
        titulo={ES.apartados.titulo}
        volver={{ label: ES.apartados.volver, onPress: () => (router.canGoBack() ? router.back() : router.replace('/')) }}
      />
      <Formulario
        contentContainerStyle={styles.cuerpo}
        refreshControl={
          <RefreshControl refreshing={apartados.isRefetching} onRefresh={() => void apartados.refetch()} tintColor={PALETTE.accion} />
        }
      >
        <SinSenal sinSenal={sinSenal} leidoEn={secciones === null ? null : leidoEn} ahora={ahora} />
        {secciones === null ? (
          <Llega i={0} style={styles.centro}>
            {sinSenal ? null : apartados.isError ? (
              <Text style={styles.nota}>{apiErrorMessage(apartados.error)}</Text>
            ) : (
              <>
                <ActivityIndicator color={PALETTE.accion} />
                <Text style={styles.nota}>{ES.apartados.cargando}</Text>
              </>
            )}
          </Llega>
        ) : (
          <>
            {recogido !== null && arrancando === null && (
              <Llega i={0} style={styles.recogido}>
                <Icono name="check-circle" size={40} color={PALETTE.accion} />
                <Text style={styles.recogidoTitulo}>{ES.apartados.yaLoTienes}</Text>
                <Text style={styles.nota}>{`${recogido.cocina.nombre} · ${platoTexto(recogido)}`}</Text>
                {rechazado !== null ? (
                  <Text style={styles.falla}>{ES.apartar.fallas[rechazado.falla]}</Text>
                ) : esperando ? (
                  <>
                    <Text style={styles.guardado}>{ES.apartados.guardado}</Text>
                    <Text style={styles.nota}>{ES.apartados.calificarDespues}</Text>
                  </>
                ) : (
                  <Calificar key={recogido.id} apartado={recogido} onListo={calificado} />
                )}
                {!esperando && rechazado === null && pregunta(recogido.id) && (
                  <PreguntaSeguir cocinaId={recogido.cocina.id} nombre={recogido.cocina.nombre} onListo={() => respondida(recogido.id)} />
                )}
              </Llega>
            )}

            {falla !== null && cambio === null && <Text style={styles.falla}>{falla}</Text>}

            {secciones.avisos.map((apartado, i) => (
              <Llega key={apartado.id} i={i} style={styles.aviso}>
                <Text style={styles.avisoTitulo}>{ES.apartados.laCocinaCancelo}</Text>
                {razonTexto(apartado) !== null && <Text style={styles.avisoTexto}>{razonTexto(apartado)}</Text>}
                <Text style={styles.avisoTexto}>{`${apartado.cocina.nombre} · ${platoTexto(apartado)}`}</Text>
                <Text style={styles.avisoTexto}>{pasaTexto(apartado.hora, ahora)}</Text>
              </Llega>
            ))}

            {pendientes.map((apartado, i) => (
              <Llega key={apartado.id} i={secciones.avisos.length + i}>
                <BoletoApartado
                  apartado={apartado}
                  puerta={puertaDe(apartado)}
                  ahora={ahora}
                  arranca={arrancando?.apartado.id === apartado.id}
                  onArrancado={() => setArrancando(null)}
                  onYaLoTengo={() => yaLoTengo(apartado, i)}
                  onCambioDePlanes={() => {
                    setFalla(null);
                    setCambio(apartado);
                  }}
                />
              </Llega>
            ))}

            {secciones.porConfirmar.map((apartado, i) => (
              <Llega key={apartado.id} i={secciones.avisos.length + pendientes.length + i} style={styles.porConfirmar}>
                <Text style={styles.porConfirmarTitulo}>{ES.apartados.porConfirmar.titulo}</Text>
                <Text style={styles.filaTitulo}>{apartado.cocina.nombre}</Text>
                <Text style={styles.filaDetalle}>{platoTexto(apartado)}</Text>
                <Text style={styles.filaDetalle}>{porConfirmarTexto(apartado)}</Text>
                <Deslizar
                  texto={ES.apartados.desliza[apartado.comer]}
                  ayuda={ES.apartados.deslizaAyuda}
                  accion={ES.apartados.yaLoTengo}
                  onListo={() => yaLoTengo(apartado)}
                />
              </Llega>
            ))}

            {pendientes.length === 0 &&
              secciones.avisos.length === 0 &&
              secciones.porConfirmar.length === 0 &&
              recogido === null && (
              <Llega i={0} style={styles.vacio}>
                {/* ⚠️ `11.10-ii`: row `11.4`'s ticket, its code still blank — the one Wera Cocina's *Apartados* shows. */}
                <DibujoVacio dibujo="boleto" />
                <Text style={styles.vacioTitulo}>{ES.apartados.vacio}</Text>
                <Text style={styles.nota}>{ES.apartados.vacioDetalle}</Text>
                <View style={styles.vacioBoton}>
                  <BotonLleno label={ES.apartados.verCocinas} variante="principal" onPress={() => router.navigate('/')} />
                </View>
              </Llega>
            )}

            {secciones.anteriores.length > 0 && (
              <Llega i={secciones.avisos.length + pendientes.length + secciones.porConfirmar.length + 1} style={styles.anteriores}>
                <Text style={styles.seccion}>{ES.apartados.anteriores}</Text>
                <Grupo>
                  {secciones.anteriores.map((apartado) => (
                    <View key={apartado.id} style={styles.fila}>
                      <Text style={styles.filaTitulo}>{apartado.cocina.nombre}</Text>
                      <Text style={styles.filaDetalle}>{platoTexto(apartado)}</Text>
                      <Text style={styles.filaDetalle}>{anteriorTexto(apartado, ahora)}</Text>
                      {/* ⚠️ Open until *Listo*: her one tap is saved at once, and the read that follows must not close it. */}
                      {calificando === apartado.id ? (
                        <View style={styles.calificando}>
                          <Calificar key={apartado.id} apartado={apartado} onListo={() => setCalificando(null)} />
                        </View>
                      ) : apartado.miCalificacion !== null ? (
                        <View style={styles.tuCalificacion}>
                          <Text style={styles.filaDetalle}>{ES.apartados.calificar.tuCalificacion}</Text>
                          <Estrellas n={apartado.miCalificacion.estrellas} size={16} />
                        </View>
                      ) : porCalificar(apartado, ahora) && recogido?.id !== apartado.id ? (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={ES.apartados.calificar.titulo(apartado.cocina.nombre)}
                          onPress={() => setCalificando(apartado.id)}
                          hitSlop={SIZE.rowGap}
                          style={({ pressed }) => [styles.calificar, { opacity: pressed ? 0.6 : 1 }]}
                        >
                          <Text style={styles.calificarTexto}>{ES.apartados.calificar.calificar}</Text>
                        </Pressable>
                      ) : null}
                      {recogido?.id !== apartado.id && pregunta(apartado.id) && (
                        <View style={styles.calificando}>
                          <PreguntaSeguir cocinaId={apartado.cocina.id} nombre={apartado.cocina.nombre} onListo={() => respondida(apartado.id)} />
                        </View>
                      )}
                    </View>
                  ))}
                </Grupo>
              </Llega>
            )}
          </>
        )}
      </Formulario>

      <HojaOfertas visible={ofertas} pregunta onCerrar={() => setOfertas(false)} />

      <Hoja visible={cambio !== null} titulo={hoja.titulo} onCerrar={() => setCambio(null)}>
        <Text style={styles.hojaTexto}>{hoja.texto}</Text>
        {falla !== null && <Text style={styles.falla}>{falla}</Text>}
        <BotonLleno label={hoja.si} variante="principal" busy={cancelando} onPress={() => void darloDeVuelta()} />
        <BotonLleno label={hoja.no} variante="discreto" onPress={() => setCambio(null)} />
      </Hoja>
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: PALETTE.fondo },
  cuerpo: { padding: SIZE.space * 1.5, paddingBottom: SIZE.space * 3, gap: SIZE.space * 1.5 },
  centro: { alignItems: 'center', gap: SIZE.space, paddingTop: SIZE.space * 3 },
  nota: { fontSize: SIZE.smallSize, lineHeight: 19, color: PALETTE.tintaApagada, textAlign: 'center' },
  falla: { fontSize: SIZE.smallSize, lineHeight: 19, fontWeight: '600', color: PALETTE.error },
  recogido: {
    alignItems: 'center',
    gap: SIZE.rowGap,
    padding: SIZE.space * 1.5,
    borderRadius: ESQUINA.hoja,
    backgroundColor: PALETTE.superficie,
  },
  recogidoTitulo: { fontSize: SIZE.bodySize + 1, fontWeight: '700', color: PALETTE.tinta, textAlign: 'center' },
  guardado: {
    fontSize: SIZE.smallSize,
    lineHeight: 19,
    color: PALETTE.tinta,
    textAlign: 'center',
    paddingVertical: SIZE.rowGap / 2,
    paddingHorizontal: SIZE.space,
    borderRadius: ESQUINA.chip,
    backgroundColor: PALETTE.banda,
  },
  aviso: { gap: SIZE.rowGap / 2, padding: SIZE.space, borderRadius: ESQUINA.hoja, backgroundColor: PALETTE.superficie },
  avisoTitulo: { fontSize: SIZE.bodySize, fontWeight: '700', color: PALETTE.error },
  avisoTexto: { fontSize: SIZE.smallSize, lineHeight: 19, color: PALETTE.tinta },
  porConfirmar: {
    gap: SIZE.rowGap / 2,
    padding: SIZE.space * 1.25,
    borderRadius: ESQUINA.hoja,
    backgroundColor: PALETTE.superficie,
  },
  porConfirmarTitulo: { fontSize: SIZE.bodySize, fontWeight: '700', color: PALETTE.accion, paddingBottom: SIZE.rowGap / 2 },
  vacio: { alignItems: 'center', gap: SIZE.rowGap, paddingTop: SIZE.space * 3, paddingHorizontal: SIZE.space },
  vacioTitulo: { fontSize: SIZE.bodySize, fontWeight: '700', color: PALETTE.tinta, textAlign: 'center' },
  vacioBoton: { alignSelf: 'stretch', paddingTop: SIZE.space },
  anteriores: { gap: SIZE.rowGap },
  seccion: { fontSize: SIZE.smallSize, fontWeight: '700', color: PALETTE.tintaApagada },
  fila: { paddingHorizontal: SIZE.space, paddingVertical: SIZE.space, gap: 2 },
  filaTitulo: { fontSize: SIZE.bodySize - 1, fontWeight: '600', color: PALETTE.tinta },
  filaDetalle: { fontSize: SIZE.smallSize, lineHeight: 19, color: PALETTE.tintaApagada },
  hojaTexto: { fontSize: SIZE.bodySize, lineHeight: 22, color: PALETTE.tinta },
  tuCalificacion: { flexDirection: 'row', alignItems: 'center', gap: SIZE.rowGap, paddingTop: 2 },
  calificando: { paddingTop: SIZE.space },
  calificar: { alignSelf: 'flex-start', minHeight: SIZE.tapTarget - SIZE.rowGap, justifyContent: 'center' },
  calificarTexto: { fontSize: SIZE.bodySize - 1, fontWeight: '700', color: PALETTE.accion },
});
