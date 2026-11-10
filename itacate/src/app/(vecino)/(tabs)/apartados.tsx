import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { Apartado } from '@/api/apartados';
import { apiErrorMessage } from '@/api/errors';
import { useApartados, useCancelarApartado, useCocinas, useYaLoTengo } from '@/api/hooks';
import { anteriorTexto, pasaTexto, platoTexto, porConfirmarTexto, puedeCancelar, razonTexto, seccionesDe } from '@/lib/apartados';
import { useAhora } from '@/lib/useAhora';
import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';
import { BoletoApartado } from '@/ui/BoletoApartado';
import { BotonLleno } from '@/ui/BotonLleno';
import { Cabeza } from '@/ui/Cabeza';
import { Deslizar } from '@/ui/Deslizar';
import { Grupo } from '@/ui/Grupo';
import { Hoja } from '@/ui/Hoja';
import { Llega } from '@/ui/Llega';

// ============================================================================
// *APARTADOS*, THE SECOND TAB. Plan task `10.5b-iii-a` — the tab drawn since `10.5-v-b`,
// filled as the family-shell page's stage 2 draws it (the owner's rulings of 2026-11-05):
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
// of `10.5b-iii-a`, before it shipped. NO CHECK CAN SEE THIS SCREEN (ADR-035 §2.11).
// ============================================================================

/** The clock this screen reads — *faltan 25 min*, and *Cancelar* turning into *No voy a poder ir*. */
const CADA_MEDIO_MINUTO = 30_000;

export default function Apartados() {
  const apartados = useApartados();
  const cocinas = useCocinas();
  const ahora = useAhora(CADA_MEDIO_MINUTO);
  const { cancelar, busy: cancelando } = useCancelarApartado();
  const { confirmar } = useYaLoTengo();
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [recogido, setRecogido] = useState<Apartado | null>(null);
  const [cambio, setCambio] = useState<Apartado | null>(null);
  const [falla, setFalla] = useState<string | null>(null);

  // What she just collected is said while she stays; leaving the tab clears it.
  useFocusEffect(
    useCallback(() => () => {
      setRecogido(null);
      setFalla(null);
    }, []),
  );

  const puertaDe = (apartado: Apartado) => cocinas.data?.find((cocina) => cocina.id === apartado.cocina.id);

  async function yaLoTengo(apartado: Apartado) {
    setConfirmando(apartado.id);
    setFalla(null);
    const resultado = await confirmar(apartado.id);
    setConfirmando(null);
    if (resultado.ok) setRecogido(apartado);
    else setFalla(ES.apartar.fallas[resultado.falla]);
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
  const hoja = cambio !== null && puedeCancelar(cambio, ahora) ? ES.apartados.hojaCancelar : ES.apartados.hojaNoVoy;

  return (
    <View style={styles.pantalla}>
      <Cabeza titulo={ES.apartados.titulo}>
        <Text style={styles.detalle}>{ES.apartados.detalle}</Text>
      </Cabeza>
      <ScrollView
        contentContainerStyle={styles.cuerpo}
        refreshControl={
          <RefreshControl refreshing={apartados.isRefetching} onRefresh={() => void apartados.refetch()} tintColor={PALETTE.accion} />
        }
      >
        {secciones === null ? (
          <Llega i={0} style={styles.centro}>
            {apartados.isError ? (
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
            {recogido !== null && (
              <Llega i={0} style={styles.recogido}>
                <MaterialCommunityIcons name="check-circle" size={40} color={PALETTE.accion} />
                <Text style={styles.recogidoTitulo}>{ES.apartados.yaLoTienes}</Text>
                <Text style={styles.nota}>{`${recogido.cocina.nombre} · ${platoTexto(recogido)}`}</Text>
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

            {secciones.pendientes.map((apartado, i) => (
              <Llega key={apartado.id} i={secciones.avisos.length + i}>
                <BoletoApartado
                  apartado={apartado}
                  puerta={puertaDe(apartado)}
                  ahora={ahora}
                  confirmando={confirmando === apartado.id}
                  onYaLoTengo={() => void yaLoTengo(apartado)}
                  onCambioDePlanes={() => {
                    setFalla(null);
                    setCambio(apartado);
                  }}
                />
              </Llega>
            ))}

            {secciones.porConfirmar.map((apartado, i) => (
              <Llega key={apartado.id} i={secciones.avisos.length + secciones.pendientes.length + i} style={styles.porConfirmar}>
                <Text style={styles.porConfirmarTitulo}>{ES.apartados.porConfirmar.titulo}</Text>
                <Text style={styles.filaTitulo}>{apartado.cocina.nombre}</Text>
                <Text style={styles.filaDetalle}>{platoTexto(apartado)}</Text>
                <Text style={styles.filaDetalle}>{porConfirmarTexto(apartado)}</Text>
                <Deslizar
                  texto={ES.apartados.desliza[apartado.comer]}
                  ayuda={ES.apartados.deslizaAyuda}
                  accion={ES.apartados.yaLoTengo}
                  ocupado={confirmando === apartado.id}
                  onListo={() => void yaLoTengo(apartado)}
                />
              </Llega>
            ))}

            {secciones.pendientes.length === 0 &&
              secciones.avisos.length === 0 &&
              secciones.porConfirmar.length === 0 &&
              recogido === null && (
              <Llega i={0} style={styles.vacio}>
                <MaterialCommunityIcons name="ticket-confirmation-outline" size={52} color={PALETTE.linea} />
                <Text style={styles.vacioTitulo}>{ES.apartados.vacio}</Text>
                <Text style={styles.nota}>{ES.apartados.vacioDetalle}</Text>
                <View style={styles.vacioBoton}>
                  <BotonLleno label={ES.apartados.verCocinas} variante="principal" onPress={() => router.navigate('/')} />
                </View>
              </Llega>
            )}

            {secciones.anteriores.length > 0 && (
              <Llega i={secciones.avisos.length + secciones.pendientes.length + secciones.porConfirmar.length + 1} style={styles.anteriores}>
                <Text style={styles.seccion}>{ES.apartados.anteriores}</Text>
                <Grupo>
                  {secciones.anteriores.map((apartado) => (
                    <View key={apartado.id} style={styles.fila}>
                      <Text style={styles.filaTitulo}>{apartado.cocina.nombre}</Text>
                      <Text style={styles.filaDetalle}>{platoTexto(apartado)}</Text>
                      <Text style={styles.filaDetalle}>{anteriorTexto(apartado, ahora)}</Text>
                    </View>
                  ))}
                </Grupo>
              </Llega>
            )}
          </>
        )}
      </ScrollView>

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
  detalle: { fontSize: SIZE.smallSize, color: PALETTE.tintaApagada },
  cuerpo: { padding: SIZE.space * 1.5, paddingBottom: SIZE.space * 3, gap: SIZE.space * 1.5 },
  centro: { alignItems: 'center', gap: SIZE.space, paddingTop: SIZE.space * 3 },
  nota: { fontSize: SIZE.smallSize, lineHeight: 19, color: PALETTE.tintaApagada, textAlign: 'center' },
  falla: { fontSize: SIZE.smallSize, lineHeight: 19, fontWeight: '600', color: PALETTE.error },
  recogido: {
    alignItems: 'center',
    gap: SIZE.rowGap,
    padding: SIZE.space * 1.5,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: PALETTE.linea,
    backgroundColor: PALETTE.superficie,
  },
  recogidoTitulo: { fontSize: SIZE.bodySize + 1, fontWeight: '700', color: PALETTE.tinta, textAlign: 'center' },
  aviso: { gap: SIZE.rowGap / 2, padding: SIZE.space, borderRadius: 14, backgroundColor: PALETTE.banda },
  avisoTitulo: { fontSize: SIZE.bodySize, fontWeight: '700', color: PALETTE.error },
  avisoTexto: { fontSize: SIZE.smallSize, lineHeight: 19, color: PALETTE.tinta },
  porConfirmar: {
    gap: SIZE.rowGap / 2,
    padding: SIZE.space * 1.25,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: PALETTE.linea,
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
});
