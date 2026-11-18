import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { guardada } from '@/api/fotos';
import { miCocinaPara, type Rol } from '@/api/equipo';
import {
  useAjustes,
  useCalificaciones,
  useKitchen,
  useKitchenGiros,
  useListings,
  usePage,
  usePlace,
  useSalirDeLaCocina,
  useServicios,
  useSuRol,
} from '@/api/hooks';
import { giroLabel, type Kitchen } from '@/api/kitchen';
import { colorOf } from '@/api/pagina';
import { addressComplete, addressLine } from '@/api/place';
import { useAuth } from '@/auth/AuthProvider';
import { AVISO_URL } from '@/auth/aviso';
import { cuentaDe } from '@/auth/quien';
import { calificacionesFila, cobroTexto, comerTexto, desechableFila, quienTexto } from '@/lib/ajustes';
import { ayudasAqui } from '@/lib/ayudante';
import { ayudaUrl } from '@/auth/support';
import { estadoDe, faltanDe } from '@/lib/hoy';
import { useRecordatorio } from '@/lib/RecordatorioProvider';
import { cuandoTexto } from '@/lib/recordatorio';
import { SUPPORT_WHATSAPP } from '@/lib/supportWhatsapp';
import { useDondeEstaSuCocina } from '@/lib/useGoogle';
import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';
import { Banda } from '@/ui/Banda';
import { BotonLleno } from '@/ui/BotonLleno';
import { Fila } from '@/ui/Fila';
import { Formulario } from '@/ui/Formulario';
import { Grupo } from '@/ui/Grupo';
import { HojaConfirmar } from '@/ui/HojaConfirmar';
import { LeyendoCocina } from '@/ui/LeyendoCocina';
import { Falta } from '@/ui/Falta';
import { Llega } from '@/ui/Llega';
import { LoQueUsas } from '@/ui/LoQueUsas';
import { MapaFijo } from '@/ui/MapaFijo';
import { sinPuntoPara } from '@/ui/PantallaDireccion';
import { Portada } from '@/ui/Portada';
import { QuienTrabajaAqui } from '@/ui/QuienTrabajaAqui';
import { Salidas } from '@/ui/Salidas';

// ============================================================================
// *MI COCINA* — WHAT SHE SETS ONCE. Plan task `10.5-v-c-i`, the owner's rulings of
// 2026-11-05 and his directions of 2026-11-06 (the family-shell page's `cMi`): her page
// as neighbours see its head (*Así te ven los vecinos* left *Hoy* for here) with *Editar
// tu página*, what is missing of it under it (`10.9a-iii`: a *Falta* row each, no count — `@/ui/Falta`), where she hands food over,
// her trade, help and her account. Since `10.5-v-c-ii`: *Ver como la ven* beside *Editar tu
// página* — her page as Itacate draws it (`/como-la-ven`) — and *Recordatorio diario* under her
// trade once she has one to set (`@/lib/RecordatorioProvider`), which opens its sheet.
//
// ⚠️ WHERE SHE HANDS FOOD OVER IS HER KITCHEN'S SCREEN'S, AS BUILT (`10.4h`, which he
// looked at on his iPhone on 2026-11-05: *"work very good"*): her address, the small map
// under it, her line of directions, *Cambiar dirección* and *Ajustar punto*. ⚠️⚠️ THE
// SMALL MAP IS HER OWN POINT, OR THE COPY OF GOOGLE'S POINT THE DATABASE KEEPS
// (`10.5-i-b-ii`); the copy is asked again from the tabs' layout on every open, and this
// map reads the same answer (`useDondeEstaSuCocina`). It takes no touch: *Ajustar punto*
// is beside it.
//
// ⚠️⚠️ THE SECOND DOOR STAYS: a trade or an address that did not reach the database at the
// sign-up is said here in red — *Falta …* — with its door (`@/api/registro`: only the
// first write can fail the sign-up). Publishing does not wait on them.
//
// ⚠️⚠️ `10.5b-iv-c`: HER SETTINGS, ROWS AMONG THE ONES SHE SETS ONCE (`10.5b-ii`'s final design,
// *Mi cocina*): her trade, *Cómo te pagan*, *Cómo se come*, *El desechable*, her reminder, *Tus
// calificaciones* and *Ajustes de apartados* — each saying what is set under its name (`@/lib/
// ajustes`), each opening its screen. A read that failed still opens the screen, which says so.
// *Ajustes de apartados* is named only here (*"nothing on Hoy or Apartados naming it"*).
//
// ⚠️ HER WAY OUT AT THE FOOT (`@/ui/Salidas`): *Cerrar sesión*, *Eliminar esta cocina* and
// *Eliminar mi cuenta* — one tap from anywhere, the tab (Apple's 5.1.1(v)). The block is
// KEYED ON THE KITCHEN, so when one goes and her next-made kitchen opens here, nothing
// typed for the first is left in its boxes; the boxes are typed at the foot, so the
// screen is a `Formulario`. *Escríbenos por WhatsApp* is drawn only on a build that
// carries the owner's number, as *¿Olvidaste tu contraseña?* is. NO CHECK CAN SEE THIS
// SCREEN (ADR-035 §2.11): the phone is its instrument.
//
// ⚠️ `10.9a-ii`: *LO QUE USAS* AT ITS TOP, above her page (`@/ui/LoQueUsas`; the family-shell page,
// round 7, took *"at the top"* literally) — absent while Wera offers nothing this build carries
// and no *Próximamente* may show, which is every kitchen today.
//
// ⚠️⚠️ `10.9b-ii`: TWO *MI COCINA*S, BY HER ROLE AT THIS KITCHEN (`@/api/equipo`' `miCocinaPara`; G18):
//   - THE OWNER'S, above — and, after her settings, *Quién trabaja aquí* (`@/ui/QuienTrabajaAqui`),
//     always, with *Invitar a alguien* under the list since `10.9b-iii` (`@/ui/HojaInvitar`);
//   - A HELPER'S (the family-shell page's `cMiAyudante`): her account — her name, her address, how she
//     signs in (`@/auth/quien`' `cuentaDe`) —, the kitchen with what she does there (`@/lib/ayudante`'
//     `ayudasAqui`: true today, the card's stamps once it exists), help, and *Salir de esta cocina*
//     (`leave_kitchen`, a sheet first; her phone loses the kitchen at once and the guard sends her where
//     a kitchen is made) above *Cerrar sesión* and *Eliminar mi cuenta* — which names nothing: she owns
//     no business (`@/api/account`' `businessesThatGo`), and *Eliminar esta cocina* is never hers;
//   - while her role is not read yet, a wheel — or, failed, *Intentar de nuevo* — and her way out
//     under it, never one of the two drawn and then swapped.
// ============================================================================

export default function MiCocina() {
  const kitchen = useKitchen();
  const rol = useSuRol(kitchen?.id ?? null);
  if (kitchen === null) return <LeyendoCocina titulo={ES.miCocina.titulo} />;
  switch (miCocinaPara(rol.data)) {
    case 'duena':
      return <MiCocinaDe kitchen={kitchen} rol={rol.data} />;
    case 'ayudante':
      return <MiCocinaDeAyudante key={kitchen.id} kitchen={kitchen} />;
    default:
      return <LeyendoSuRol kitchen={kitchen} fallo={rol.isError} leyendo={rol.isFetching} otraVez={() => void rol.refetch()} />;
  }
}

function MiCocinaDe({ kitchen, rol }: { kitchen: Kitchen; rol: Rol | null | undefined }) {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const giros = useKitchenGiros();
  const place = usePlace(kitchen.id);
  const page = usePage(kitchen.id);
  const listings = useListings(kitchen.id);
  const ajustes = useAjustes(kitchen.id);
  const calificaciones = useCalificaciones(kitchen.id);
  // A row's line while her settings are out or failed: nothing, or *No se pudo leer*.
  const deAjustes = (texto: (a: NonNullable<typeof ajustes.data>) => string) =>
    ajustes.data !== undefined ? texto(ajustes.data) : ajustes.isError ? ES.miCocina.sinLeer : null;
  const here = place.data;
  // ⚠️ Her kitchen's copy of Google's point — the same answer the tabs' layout keeps fresh.
  const donde = useDondeEstaSuCocina(here);
  const numero = SUPPORT_WHATSAPP;
  const recordatorio = useRecordatorio();
  // Her reminder's row: once she answered on this phone, or once the rule has one for her.
  const filaRecordatorio =
    recordatorio.guardado === null && recordatorio.propuesta === null
      ? null
      : recordatorio.guardado === null || !recordatorio.guardado.encendido
        ? ES.recordatorio.apagado
        : recordatorio.permiso === false
          ? ES.recordatorio.sinPermiso
          : cuandoTexto(recordatorio.guardado);

  const trade = giroLabel(giros.data, kitchen.giroPrincipal);
  const line = here === undefined ? null : addressLine(here);
  // ⚠️ A trade the list no longer has still counts as given: it is only not named.
  const missingGiro = kitchen.giroPrincipal === null;
  const missingAddress = here !== undefined && !addressComplete(here);
  const faltan =
    here === undefined || page.data === undefined || listings.data === undefined
      ? []
      : faltanDe(
          estadoDe({
            giro: kitchen.giroPrincipal,
            direccionCompleta: addressComplete(here),
            frase: page.data.sentence,
            portada: page.data.cover,
            listings: listings.data,
          }),
        );

  const seccion = { fontSize: SIZE.smallSize, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: PALETTE.tintaApagada } as const;
  const quiet = { fontSize: SIZE.bodySize, color: PALETTE.tintaApagada } as const;
  const missing = { fontSize: SIZE.bodySize, fontWeight: '600', color: PALETTE.error } as const;
  const wheel = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: SIZE.rowGap }}>
      <ActivityIndicator color={PALETTE.accion} />
      <Text style={quiet}>{ES.cocina.leyendo}</Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
      <Banda titulo={ES.miCocina.titulo} antetitulo={kitchen.displayName} />
      <Formulario
        contentContainerStyle={{ padding: SIZE.space * 1.5, paddingBottom: SIZE.space * 3 + insets.bottom, gap: SIZE.space * 1.5 }}
      >
        <LoQueUsas kitchenId={kitchen.id} i={0} />

        <Llega i={0} style={{ gap: SIZE.rowGap + 2 }}>
          {page.data === undefined ? (
            wheel
          ) : (
            <>
              <Pressable accessibilityRole="button" accessibilityLabel={ES.cocina.editarPagina} onPress={() => router.push('/pagina')}>
                <Portada
                  nombre={kitchen.displayName}
                  giro={kitchen.giroPrincipal}
                  giroNombre={trade}
                  color={colorOf(page.data, kitchen.giroPrincipal)}
                  frase={page.data.sentence}
                  enlace={page.data.mapsLink}
                  cover={guardada(page.data.cover)}
                  logo={guardada(page.data.logo)}
                />
              </Pressable>
              <View style={{ flexDirection: 'row', gap: SIZE.rowGap }}>
                <View style={{ flex: 1 }}>
                  <BotonLleno icon="eye-outline" label={ES.vista.verComoLaVen} onPress={() => router.push('/como-la-ven')} />
                </View>
                <View style={{ flex: 1 }}>
                  <BotonLleno icon="pencil-outline" label={ES.cocina.editarPagina} onPress={() => router.push('/pagina')} />
                </View>
              </View>
            </>
          )}
        </Llega>

        {faltan.length > 0 && (
          <Llega i={1}>
            <Falta faltan={faltan} />
          </Llega>
        )}

        <Llega i={2} style={{ gap: SIZE.space }}>
          <Text style={seccion}>{ES.cocina.donde}</Text>
          {here === undefined ? (
            place.isError ? (
              <>
                <Text style={{ fontSize: SIZE.bodySize, color: PALETTE.tinta }}>{ES.cocina.sinLeer}</Text>
                <BotonLleno label={ES.cocina.otraVez} busy={place.isFetching} onPress={() => void place.refetch()} />
              </>
            ) : (
              wheel
            )
          ) : (
            <>
              {line !== null ? (
                <Text style={{ fontSize: SIZE.bodySize, lineHeight: 22, fontWeight: '600', color: PALETTE.tinta }}>{line}</Text>
              ) : (
                <Text style={missing}>{ES.cocina.sinDireccion}</Text>
              )}
              {here !== null && (
                <>
                  <MapaFijo
                    punto={here.pin ?? (donde.kind === 'punto' ? donde.destino.punto : null)}
                    sinPunto={sinPuntoPara(donde, false)}
                  />
                  {here.directions !== null && <Text style={quiet}>{ES.cocina.indicaciones(here.directions)}</Text>}
                  <View style={{ flexDirection: 'row', gap: SIZE.rowGap }}>
                    <View style={{ flex: 1 }}>
                      <BotonLleno
                        variante={missingAddress ? 'principal' : 'suave'}
                        label={ES.cocina.cambiarDireccion}
                        onPress={() => router.push('/direccion')}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <BotonLleno label={ES.cocina.ajustarPunto} onPress={() => router.push('/ubicacion')} />
                    </View>
                  </View>
                </>
              )}
            </>
          )}
        </Llega>

        <Llega i={3}>
          <Grupo>
            <Fila
              icono="silverware-fork-knife"
              titulo={ES.miCocina.giro}
              detalle={missingGiro ? ES.cocina.sinGiro : trade}
              falta={missingGiro}
              onPress={() => router.push('/giro')}
            />
            <Fila icono="cash-multiple" titulo={ES.miCocina.cobro} detalle={deAjustes(cobroTexto)} onPress={() => router.push('/cobro')} />
            <Fila
              icono="shopping-outline"
              titulo={ES.miCocina.comer}
              detalle={deAjustes(comerTexto)}
              onPress={() => router.push('/como-se-come')}
            />
            <Fila
              icono="package-variant-closed"
              titulo={ES.miCocina.desechable}
              detalle={deAjustes(desechableFila)}
              onPress={() => router.push('/desechable')}
            />
            {filaRecordatorio !== null && (
              <Fila
                icono="bell-outline"
                titulo={ES.recordatorio.titulo}
                detalle={filaRecordatorio}
                onPress={recordatorio.abrirHoja}
              />
            )}
            <Fila
              icono="star-outline"
              titulo={ES.miCocina.calificaciones}
              detalle={
                calificaciones.data !== undefined
                  ? calificacionesFila(calificaciones.data)
                  : calificaciones.isError
                    ? ES.miCocina.sinLeer
                    : null
              }
              onPress={() => router.push('/calificaciones')}
            />
            <Fila
              icono="tune-variant"
              titulo={ES.miCocina.ajustesApartados}
              detalle={deAjustes(quienTexto)}
              onPress={() => router.push('/ajustes-apartados')}
            />
          </Grupo>
        </Llega>

        <QuienTrabajaAqui kitchenId={kitchen.id} cocina={kitchen.displayName} rol={rol} />

        <Llega i={4} style={{ gap: SIZE.rowGap }}>
          <Text style={seccion}>{ES.miCocina.ayuda}</Text>
          <Grupo>
            {numero !== null && (
              <Fila
                icono="whatsapp"
                titulo={ES.miCocina.whatsapp}
                detalle={ES.miCocina.whatsappDetalle}
                onPress={() => {
                  Linking.openURL(ayudaUrl(numero, session?.user.email)).catch(() => {});
                }}
              />
            )}
            <Fila
              icono="shield-lock-outline"
              titulo={ES.miCocina.aviso}
              onPress={() => {
                WebBrowser.openBrowserAsync(AVISO_URL).catch(() => {});
              }}
            />
          </Grupo>
        </Llega>

        <Llega i={5} style={{ gap: SIZE.space }}>
          <Text style={seccion}>{ES.miCocina.cuenta}</Text>
          <Salidas key={kitchen.id} openKitchenId={kitchen.id} />
        </Llega>
      </Formulario>
    </View>
  );
}

/** Her role not read yet: a wheel, or the failure and *Intentar de nuevo* — and her way out under it. */
function LeyendoSuRol({ kitchen, fallo, leyendo, otraVez }: { kitchen: Kitchen; fallo: boolean; leyendo: boolean; otraVez: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
      <Banda titulo={ES.miCocina.titulo} antetitulo={kitchen.displayName} />
      <Formulario contentContainerStyle={{ padding: SIZE.space * 1.5, paddingBottom: SIZE.space * 3 + insets.bottom, gap: SIZE.space * 1.5 }}>
        {fallo ? (
          <View style={{ gap: SIZE.rowGap }}>
            <Text style={{ fontSize: SIZE.bodySize, color: PALETTE.tinta }}>{ES.cocina.sinLeer}</Text>
            <BotonLleno variante="principal" label={ES.cocina.otraVez} busy={leyendo} onPress={otraVez} />
          </View>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SIZE.rowGap }}>
            <ActivityIndicator color={PALETTE.accion} />
            <Text style={{ fontSize: SIZE.bodySize, color: PALETTE.tintaApagada }}>{ES.cocina.leyendo}</Text>
          </View>
        )}
        <Salidas key={kitchen.id} openKitchenId={kitchen.id} />
      </Formulario>
    </View>
  );
}

/** A helper's *Mi cocina* — the family-shell page's *Ayudante*. */
function MiCocinaDeAyudante({ kitchen }: { kitchen: Kitchen }) {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const servicios = useServicios(kitchen.id);
  const { salir, busy } = useSalirDeLaCocina(kitchen.id);
  const [hoja, setHoja] = useState(false);
  const cuenta = cuentaDe(session?.user);
  const numero = SUPPORT_WHATSAPP;
  const seccion = { fontSize: SIZE.smallSize, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: PALETTE.tintaApagada } as const;

  return (
    <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
      <Banda titulo={ES.miCocina.titulo} antetitulo={ES.ayudante.enCocina(kitchen.displayName)} />
      <Formulario
        contentContainerStyle={{ padding: SIZE.space * 1.5, paddingBottom: SIZE.space * 3 + insets.bottom, gap: SIZE.space * 1.5 }}
      >
        <Llega i={0}>
          <Grupo>
            {cuenta !== null && <Fila icono="account-outline" titulo={cuenta.titulo} detalle={cuenta.detalle} />}
            <Fila icono="storefront-outline" titulo={kitchen.displayName} detalle={ayudasAqui(servicios.data)} />
          </Grupo>
        </Llega>

        <Llega i={1} style={{ gap: SIZE.rowGap }}>
          <Text style={seccion}>{ES.miCocina.ayuda}</Text>
          <Grupo>
            {numero !== null && (
              <Fila
                icono="whatsapp"
                titulo={ES.miCocina.whatsapp}
                detalle={ES.miCocina.whatsappDetalle}
                onPress={() => {
                  Linking.openURL(ayudaUrl(numero, session?.user.email)).catch(() => {});
                }}
              />
            )}
            <Fila
              icono="shield-lock-outline"
              titulo={ES.miCocina.aviso}
              onPress={() => {
                WebBrowser.openBrowserAsync(AVISO_URL).catch(() => {});
              }}
            />
          </Grupo>
        </Llega>

        <Llega i={2} style={{ gap: SIZE.space }}>
          <Text style={seccion}>{ES.miCocina.cuenta}</Text>
          <Grupo>
            <Fila icono="exit-run" titulo={ES.ayudante.salir} onPress={() => setHoja(true)} />
          </Grupo>
          <Salidas key={kitchen.id} openKitchenId={kitchen.id} />
        </Llega>
      </Formulario>
      <HojaConfirmar
        visible={hoja}
        titulo={ES.ayudante.salirTitulo(kitchen.displayName)}
        texto={ES.ayudante.salirTexto}
        confirmar={ES.ayudante.salir}
        confirmando={ES.ayudante.saliendo}
        cancelar={ES.ayudante.cancelar}
        ocupado={busy}
        onConfirmar={async () => {
          const problema = await salir();
          if (problema === null) setHoja(false);
          return problema;
        }}
        onCerrar={() => setHoja(false)}
      />
    </View>
  );
}
