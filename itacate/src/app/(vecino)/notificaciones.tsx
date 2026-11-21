import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, Text, View } from 'react-native';

import { useAvisos, useCambiarAviso, useConsentimiento, useResponderOfertas } from '@/api/hooks';
import { pedirPermisoParaAvisos } from '@/lib/avisos';
import { filasDe } from '@/lib/avisosPush';
import { usePermisoDeAvisos } from '@/lib/AvisosDelTelefono';
import { diaDelSi, siDesde } from '@/lib/ofertas';
import { useSenal } from '@/lib/useSenal';
import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';
import { Banda } from '@/ui/Banda';
import { FilaInterruptor } from '@/ui/FilaInterruptor';
import { Grupo } from '@/ui/Grupo';
import { HojaOfertas } from '@/ui/HojaOfertas';

// ============================================================================
// *NOTIFICACIONES*, FROM *TÚ*. Plan task `10.5c-iii`, as the notifications page of `10.5c-i` draws it (built on
// his ruling of 2026-11-20): a switch per kind, drawn from the database's rows (`0092`–`0094`'s
// `my_notification_kinds`) — its words are the row's, and it is hers on every phone.
//
//   - **The phone's own refusal first**: *Tu teléfono no deja que Itacate te avise.* with *Permitir avisos* — the
//     phone's own question while it still can (Android 13 reads a phone never asked as refusing) — else *Abrir
//     ajustes*, its settings. While it refuses, each switch that is on is drawn
//     off with Wera Cocina's words (*Apagado en los ajustes de tu teléfono*); turned on then, the phone is asked.
//   - **A switch per service or on-request kind** (`set_notification_switch`): the bell's whole kind (*Cocinas que
//     sigues* — each kitchen's bell stays on her page, `@/ui/Seguir`), *Premios*, *Sellos por vencer*, *Cambios en
//     tus tarjetas*.
//   - ⚠️ **OFFERS AS ONE ROW, ONLY WHILE OFFERED** (`@/lib/avisosPush`' `filasDe`): every promotion kind moves with
//     her one answer (`0093`), so one switch — on opens the sheet (`@/ui/HojaOfertas`: her yes is given on its
//     words, never on a switch's), off is her no at once; *Dijiste que sí el 3 de diciembre.* under it. Today only
//     his test accounts see it: the analyst has not turned offers on.
//   - Her reminder before her hour is her own phone's, not a row: said, not switched.
// ⚠️ NOTHING IS DRAWN until the kinds are read — with no signal, no switch, never one that would not save.
// NO CHECK CAN SEE THIS SCREEN (ADR-035 §2.11): the phone is its instrument.
// ============================================================================

export default function Notificaciones() {
  const avisos = useAvisos();
  const consentimiento = useConsentimiento();
  const { cambiar, busy } = useCambiarAviso();
  const { responder, busy: respondiendo } = useResponderOfertas();
  const { permiso, leerOtraVez } = usePermisoDeAvisos();
  const sinSenal = useSenal() === false;
  const [hoja, setHoja] = useState(false);
  const [falla, setFalla] = useState(false);
  const telefonoNoDeja = permiso?.concedido === false;
  const filas = filasDe(avisos.data);
  const desde = siDesde(consentimiento.data);
  const volver = () => (router.canGoBack() ? router.back() : router.replace('/tu'));

  async function pedirAlTelefono() {
    if (permiso?.puedePreguntar === false || (await pedirPermisoParaAvisos(avisos.data ?? [])) === 'ajustes') {
      Linking.openSettings().catch(() => {});
    }
    leerOtraVez();
  }

  async function alCambiar(kind: string, on: boolean, estaba: boolean) {
    setFalla(false);
    if (on && telefonoNoDeja) await pedirAlTelefono();
    if (on !== estaba && !(await cambiar(kind, on))) setFalla(true);
  }

  async function alCambiarOfertas(on: boolean) {
    setFalla(false);
    if (on) {
      setHoja(true);
      return;
    }
    if (!(await responder(false))) setFalla(true);
  }

  return (
    <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
      <Banda titulo={ES.notificaciones.fila} volver={{ label: ES.notificaciones.volver, onPress: volver }} />
      <ScrollView contentContainerStyle={{ padding: SIZE.space * 1.5, paddingBottom: SIZE.space * 6, gap: SIZE.space }}>
        <Text style={{ fontSize: SIZE.bodySize, lineHeight: 22, color: PALETTE.tintaApagada }}>{ES.notificaciones.detalle}</Text>
        {telefonoNoDeja && (
          <View
            style={{
              gap: SIZE.rowGap,
              padding: SIZE.space,
              borderRadius: SIZE.space,
              borderWidth: 1,
              borderColor: PALETTE.marcaSuave,
              backgroundColor: PALETTE.banda,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SIZE.rowGap }}>
              <MaterialCommunityIcons name="bell-off-outline" size={20} color={PALETTE.marca} />
              <Text style={{ flex: 1, fontSize: SIZE.smallSize + 0.4, lineHeight: 19, color: PALETTE.tinta }}>{ES.notificaciones.telefonoNoDeja}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => void pedirAlTelefono()}
              hitSlop={SIZE.rowGap}
              style={({ pressed }) => ({ alignSelf: 'flex-start', opacity: pressed ? 0.6 : 1 })}
            >
              <Text style={{ fontSize: SIZE.smallSize + 0.4, fontWeight: '700', color: PALETTE.accion }}>{permiso?.puedePreguntar === true ? ES.notificaciones.permitir : ES.notificaciones.abrirAjustes}</Text>
            </Pressable>
          </View>
        )}
        {avisos.data === undefined ? (
          <View style={{ alignItems: 'center', gap: SIZE.rowGap, paddingVertical: SIZE.space * 2 }}>
            {sinSenal ? (
              <Text style={{ fontSize: SIZE.smallSize, lineHeight: 19, color: PALETTE.tintaApagada, textAlign: 'center' }}>{ES.notificaciones.sinSenal}</Text>
            ) : (
              <>
                <ActivityIndicator color={PALETTE.accion} />
                <Text style={{ fontSize: SIZE.smallSize, lineHeight: 19, color: PALETTE.tintaApagada }}>{ES.notificaciones.cargando}</Text>
              </>
            )}
          </View>
        ) : (
          <>
            <Grupo>
              {filas.interruptores.map((aviso) => (
                <FilaInterruptor
                  key={aviso.kind}
                  icono={aviso.clase === 'a_pedido' ? 'bell-ring-outline' : 'bell-outline'}
                  titulo={aviso.titulo}
                  detalle={aviso.encendido && telefonoNoDeja ? ES.notificaciones.sinPermiso : aviso.detalle}
                  encendido={aviso.encendido && !telefonoNoDeja}
                  disabled={busy}
                  onCambiar={(on) => void alCambiar(aviso.kind, on, aviso.encendido)}
                />
              ))}
              {filas.ofertas !== null && (
                <FilaInterruptor
                  icono="tag-outline"
                  titulo={filas.ofertas.titulo}
                  detalle={
                    filas.ofertas.encendido && telefonoNoDeja
                      ? ES.notificaciones.sinPermiso
                      : desde !== null
                        ? ES.notificaciones.dijisteQueSi(diaDelSi(desde))
                        : filas.ofertas.detalle
                  }
                  encendido={filas.ofertas.encendido && !telefonoNoDeja}
                  disabled={respondiendo || consentimiento.data === undefined}
                  onCambiar={(on) => void alCambiarOfertas(on)}
                />
              )}
            </Grupo>
            {falla && (
              <Text style={{ fontSize: SIZE.smallSize, lineHeight: 19, fontWeight: '600', color: PALETTE.error }}>{ES.notificaciones.noSeGuardo}</Text>
            )}
            <Text style={{ fontSize: SIZE.smallSize, lineHeight: 19, color: PALETTE.tintaApagada }}>{ES.notificaciones.recordatorio}</Text>
            {filas.ofertas !== null && (
              <Text style={{ fontSize: SIZE.smallSize, lineHeight: 19, color: PALETTE.tintaApagada }}>{ES.notificaciones.pie}</Text>
            )}
          </>
        )}
      </ScrollView>
      <HojaOfertas visible={hoja} pregunta={false} onCerrar={() => setHoja(false)} />
    </View>
  );
}
