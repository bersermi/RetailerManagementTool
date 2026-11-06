import { router } from 'expo-router';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { guardada } from '@/api/fotos';
import { useKitchenGiros, useMyKitchens, usePage, usePlace } from '@/api/hooks';
import { giroLabel, openKitchen } from '@/api/kitchen';
import { colorOf } from '@/api/pagina';
import { addressComplete, addressLine } from '@/api/place';
import { useAuth } from '@/auth/AuthProvider';
import { useDondeEstaSuCocina } from '@/lib/useGoogle';
import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';
import { Banda } from '@/ui/Banda';
import { BotonLleno } from '@/ui/BotonLleno';
import { Formulario } from '@/ui/Formulario';
import { MapaFijo } from '@/ui/MapaFijo';
import { sinPuntoPara } from '@/ui/PantallaDireccion';
import { Portada } from '@/ui/Portada';
import { Publicaciones } from '@/ui/Publicaciones';
import { Salidas } from '@/ui/Salidas';

// ============================================================================
// HER KITCHEN. Plan tasks `10.4b-iii-a` (the screen every launch opens on),
// `10.4b-iii-b` (what she gave, and the second door for what is missing),
// `10.4b-iv-a` (what she publishes, on top) and `10.4h` (address first: her
// address, the small map under it, two doors).
//
// ⚠️ THREE THINGS IT DRAWS, AND ONLY ONE IS HER KITCHEN:
//   - nobody signed in yet, or her kitchens not read yet: the band and a wheel
//     (the guard moves her the moment it knows — `@/auth/guard`);
//   - the read FAILED (no signal at launch): a sentence and *Intentar de
//     nuevo*, never *Registra tu cocina* — `unknown` is not `none`;
//   - her kitchen: *Publicar una oferta* and her list (`@/ui/Publicaciones`)
//     first — what she opens the app for every day — then where she hands food
//     over: her address, the small map under it and her line of directions.
//
// ⚠️⚠️ THE SMALL MAP IS HER OWN POINT, OR WHERE GOOGLE PLACES HER ADDRESS (`10.4h`,
// the owner's ruling of 2026-11-03: *"The pin is only indicative"*) — ⚠️ since
// `10.5-i-b-ii` THE COPY OF GOOGLE'S POINT THE DATABASE KEEPS (his ruling of
// 2026-11-04, night), so the app no longer asks Google each time it runs: asked
// again only when the copy is a week old or missing, kept again at once, with
// nothing on screen (`useDondeEstaSuCocina`); with her own point nothing is asked.
// It takes no touch here: *Ajustar punto* is beside it.
//
// ⚠️⚠️ THE SECOND DOOR. Making a kitchen is several writes and only the first can
// fail the sign-up (`@/api/registro`): a trade or an address that did not reach
// the database is said here — *Falta …* — and its door is the primary button. Her
// own point is never missing: it is hers to set. Wera's onboarding has Ajustes for
// that; this screen is Cocina's. And the same doors change what she gave:
// *Cambiar dirección* (her address, her line, her point), *Ajustar punto*,
// *Cambiar giro* — two doors since `10.4h`, where one held both.
// ⚠️ Publishing does not wait on them: nothing she publishes is shown to anyone
// until slice 2's door.
//
// ⚠️ `10.5-ii`: HER PAGE IN ITACATE, under her list — the page's head as
// neighbours will see it (`@/ui/Portada`), and *Editar tu página*. A tap on the
// picture opens the editor too. Until the page is read, nothing is drawn there:
// it is not what she opens the app for.
//
// ⚠️ HER WAY OUT AT THE FOOT (`@/ui/Salidas`, `10.4b-iii-c`): *Cerrar sesión*,
// and *Eliminar mi cuenta*, which names this kitchen first and every other
// business she alone owns — a shop of hers in Wera too — and asks each name.
// ⚠️ And *Eliminar esta cocina* (`10.5-iii-c`): this kitchen alone, her account
// kept. The block is KEYED ON THE KITCHEN, so when one goes and her next-made
// kitchen opens here, nothing typed for the first is left in its boxes.
// The boxes are typed at the foot, so the screen is a `Formulario`: the box
// being typed in stays above the keyboard.
// ============================================================================
export default function TuCocina() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const kitchens = useMyKitchens();
  const kitchen = openKitchen(kitchens.data);
  const giros = useKitchenGiros();
  const place = usePlace(kitchen?.id ?? null);
  const page = usePage(kitchen?.id ?? null);
  const here = place.data;
  // ⚠️ Her kitchen's copy of Google's point, asked again a week on — only while she has no point of her own, and a whole address.
  const donde = useDondeEstaSuCocina(here);

  const body = { paddingHorizontal: SIZE.space * 2, paddingTop: SIZE.space * 2, paddingBottom: SIZE.space * 2 + insets.bottom, gap: SIZE.space };
  const wheel = (words: string) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: SIZE.rowGap }}>
      <ActivityIndicator color={PALETTE.accion} />
      <Text style={{ fontSize: SIZE.bodySize, color: PALETTE.tintaApagada }}>{words}</Text>
    </View>
  );

  if (kitchen === null) {
    const failed = session !== null && kitchens.isError && kitchens.data === undefined;
    return (
      <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
        <Banda titulo={ES.nombre} />
        <View style={body}>
          {failed ? (
            <>
              <Text style={{ fontSize: SIZE.bodySize, color: PALETTE.tinta }}>{ES.cocina.sinLeer}</Text>
              <BotonLleno
                variante="principal"
                label={ES.cocina.otraVez}
                busy={kitchens.isFetching}
                onPress={() => void kitchens.refetch()}
              />
            </>
          ) : session !== null ? (
            wheel(ES.cocina.leyendo)
          ) : null}
        </View>
      </View>
    );
  }

  const trade = giroLabel(giros.data, kitchen.giroPrincipal);
  const line = here === undefined ? null : addressLine(here);
  // ⚠️ A trade the list no longer has still counts as given: it is only not named.
  const missingGiro = kitchen.giroPrincipal === null;
  const missingAddress = here !== undefined && !addressComplete(here);
  const quiet = { fontSize: SIZE.bodySize, color: PALETTE.tintaApagada } as const;
  const missing = { fontSize: SIZE.bodySize, fontWeight: '600', color: PALETTE.error } as const;

  return (
    <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
      <Banda titulo={kitchen.displayName} antetitulo={trade ?? ES.cocina.antetitulo} />
      <Formulario contentContainerStyle={body}>
        <BotonLleno
          variante="principal"
          icon="silverware-fork-knife"
          label={ES.publicar.abrir}
          onPress={() => router.push('/publicar')}
        />
        <Text style={{ fontSize: SIZE.bodySize, fontWeight: '700', color: PALETTE.tinta, marginTop: SIZE.rowGap }}>
          {ES.publicaciones.titulo}
        </Text>
        <Publicaciones kitchenId={kitchen.id} />

        {page.data !== undefined && (
          <>
            <View style={{ marginTop: SIZE.space, borderTopWidth: 1, borderTopColor: PALETTE.linea }} />
            <Text style={{ fontSize: SIZE.bodySize, fontWeight: '700', color: PALETTE.tinta }}>{ES.cocina.pagina}</Text>
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
            <BotonLleno label={ES.cocina.editarPagina} onPress={() => router.push('/pagina')} />
          </>
        )}

        <View style={{ marginTop: SIZE.space, borderTopWidth: 1, borderTopColor: PALETTE.linea }} />
        <Text style={{ fontSize: SIZE.bodySize, fontWeight: '700', color: PALETTE.tinta }}>{ES.cocina.donde}</Text>
        {here === undefined ? (
          place.isError ? (
            <>
              <Text style={{ fontSize: SIZE.bodySize, color: PALETTE.tinta }}>{ES.cocina.sinLeer}</Text>
              <BotonLleno label={ES.cocina.otraVez} busy={place.isFetching} onPress={() => void place.refetch()} />
            </>
          ) : (
            wheel(ES.cocina.leyendo)
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

        {missingGiro && <Text style={missing}>{ES.cocina.sinGiro}</Text>}
        <BotonLleno
          variante={missingGiro ? 'principal' : 'suave'}
          label={ES.cocina.cambiarGiro}
          onPress={() => router.push('/giro')}
        />

        <View style={{ marginTop: SIZE.space, paddingTop: SIZE.space, borderTopWidth: 1, borderTopColor: PALETTE.linea, gap: SIZE.space }}>
          <Salidas key={kitchen.id} openKitchenId={kitchen.id} />
        </View>
      </Formulario>
    </View>
  );
}
