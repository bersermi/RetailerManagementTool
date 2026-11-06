import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { ActivityIndicator, Linking, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { guardada } from '@/api/fotos';
import { useKitchen, useKitchenGiros, useListings, usePage, usePlace } from '@/api/hooks';
import { giroLabel, type Kitchen } from '@/api/kitchen';
import { colorOf } from '@/api/pagina';
import { addressComplete, addressLine } from '@/api/place';
import { useAuth } from '@/auth/AuthProvider';
import { AVISO_URL } from '@/auth/aviso';
import { ayudaUrl } from '@/auth/support';
import { estadoDe, faltanDe } from '@/lib/hoy';
import { SUPPORT_WHATSAPP } from '@/lib/supportWhatsapp';
import { useDondeEstaSuCocina } from '@/lib/useGoogle';
import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';
import { Banda } from '@/ui/Banda';
import { BotonLleno } from '@/ui/BotonLleno';
import { Fila } from '@/ui/Fila';
import { Formulario } from '@/ui/Formulario';
import { Grupo } from '@/ui/Grupo';
import { LeyendoCocina } from '@/ui/LeyendoCocina';
import { Llega } from '@/ui/Llega';
import { MapaFijo } from '@/ui/MapaFijo';
import { sinPuntoPara } from '@/ui/PantallaDireccion';
import { Pendientes } from '@/ui/Pendientes';
import { Portada } from '@/ui/Portada';
import { Salidas } from '@/ui/Salidas';

// ============================================================================
// *MI COCINA* — WHAT SHE SETS ONCE. Plan task `10.5-v-c-i`, the owner's rulings of
// 2026-11-05 and his directions of 2026-11-06 (the family-shell page's `cMi`): her page
// as neighbours see its head (*Así te ven los vecinos* left *Hoy* for here) with *Editar
// tu página*, its checklist under it until all five are done, where she hands food over,
// her trade, help and her account. *Ver como la ven* and her reminder are `10.5-v-c-ii`'s.
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
// ⚠️ HER WAY OUT AT THE FOOT (`@/ui/Salidas`): *Cerrar sesión*, *Eliminar esta cocina* and
// *Eliminar mi cuenta* — one tap from anywhere, the tab (Apple's 5.1.1(v)). The block is
// KEYED ON THE KITCHEN, so when one goes and her next-made kitchen opens here, nothing
// typed for the first is left in its boxes; the boxes are typed at the foot, so the
// screen is a `Formulario`. *Escríbenos por WhatsApp* is drawn only on a build that
// carries the owner's number, as *¿Olvidaste tu contraseña?* is. NO CHECK CAN SEE THIS
// SCREEN (ADR-035 §2.11): the phone is its instrument.
// ============================================================================

export default function MiCocina() {
  const kitchen = useKitchen();
  if (kitchen === null) return <LeyendoCocina titulo={ES.miCocina.titulo} />;
  return <MiCocinaDe kitchen={kitchen} />;
}

function MiCocinaDe({ kitchen }: { kitchen: Kitchen }) {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const giros = useKitchenGiros();
  const place = usePlace(kitchen.id);
  const page = usePage(kitchen.id);
  const listings = useListings(kitchen.id);
  const here = place.data;
  // ⚠️ Her kitchen's copy of Google's point — the same answer the tabs' layout keeps fresh.
  const donde = useDondeEstaSuCocina(here);
  const numero = SUPPORT_WHATSAPP;

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
              <BotonLleno icon="pencil-outline" label={ES.cocina.editarPagina} onPress={() => router.push('/pagina')} />
            </>
          )}
        </Llega>

        {faltan.length > 0 && (
          <Llega i={1}>
            <Pendientes faltan={faltan} />
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
          </Grupo>
        </Llega>

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
