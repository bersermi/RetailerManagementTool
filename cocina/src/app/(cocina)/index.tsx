import { router } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useKitchenGiros, useMyKitchens, usePlace } from '@/api/hooks';
import { giroLabel, openKitchen } from '@/api/kitchen';
import { addressComplete, addressLine } from '@/api/place';
import { useAuth } from '@/auth/AuthProvider';
import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';
import { Banda } from '@/ui/Banda';
import { BotonLleno } from '@/ui/BotonLleno';
import { Formulario } from '@/ui/Formulario';
import { MapaFijo } from '@/ui/MapaFijo';
import { Publicaciones } from '@/ui/Publicaciones';
import { Salidas } from '@/ui/Salidas';

// ============================================================================
// HER KITCHEN. Plan tasks `10.4b-iii-a` (the screen every launch opens on),
// `10.4b-iii-b` (what she gave, and the second door for what is missing) and
// `10.4b-iv-a` (what she publishes, on top).
//
// ⚠️ THREE THINGS IT DRAWS, AND ONLY ONE IS HER KITCHEN:
//   - nobody signed in yet, or her kitchens not read yet: the band and a wheel
//     (the guard moves her the moment it knows — `@/auth/guard`);
//   - the read FAILED (no signal at launch): a sentence and *Intentar de
//     nuevo*, never *Registra tu cocina* — `unknown` is not `none`;
//   - her kitchen: *Publicar lo que te sobra* and her list (`@/ui/Publicaciones`)
//     first — what she opens the app for every day — then its name, what it is,
//     where she hands food over: the address, the pin on the satellite view and
//     her line of directions.
//
// ⚠️⚠️ THE SECOND DOOR. Making a kitchen is four writes and only the first can
// fail the sign-up (`@/api/registro`): a trade, an address or a pin that did not
// reach the database is said here — *Falta …* — with the button that gives it.
// Wera's onboarding has Ajustes for that; this screen is Cocina's. And the same
// buttons change what she gave: *Cambiar el punto*, *Cambiar giro o dirección*.
// ⚠️ Publishing does not wait on them: nothing she publishes is shown to anyone
// until slice 2's door, which will need her pin.
//
// ⚠️ HER WAY OUT AT THE FOOT (`@/ui/Salidas`, `10.4b-iii-c`): *Cerrar sesión*,
// and *Eliminar mi cuenta*, which names this kitchen first and every other
// business she alone owns — a shop of hers in Wera too — and asks each name.
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
  const here = place.data;
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

        <View style={{ marginTop: SIZE.space, borderTopWidth: 1, borderTopColor: PALETTE.linea }} />
        {missingGiro && <Text style={missing}>{ES.cocina.sinGiro}</Text>}

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
              <Text style={{ fontSize: SIZE.bodySize, lineHeight: 22, color: PALETTE.tinta }}>{line}</Text>
            ) : (
              <Text style={missing}>{ES.cocina.sinDireccion}</Text>
            )}
            {here !== null && here.pin !== null ? (
              <>
                <MapaFijo pin={here.pin} />
                {here.directions !== null && <Text style={quiet}>{ES.cocina.indicaciones(here.directions)}</Text>}
                <BotonLleno icon="map-marker" label={ES.cocina.cambiarPunto} onPress={() => router.push('/ubicacion')} />
              </>
            ) : (
              <>
                <Text style={missing}>{ES.cocina.sinPunto}</Text>
                {here !== null && (
                  <BotonLleno
                    variante="principal"
                    icon="map-marker-plus"
                    label={ES.cocina.ponerPunto}
                    onPress={() => router.push('/ubicacion')}
                  />
                )}
              </>
            )}
          </>
        )}

        {missingGiro || missingAddress ? (
          <BotonLleno variante="principal" label={ES.cocina.completarDatos} onPress={() => router.push('/datos')} />
        ) : (
          here !== undefined && <BotonLleno label={ES.cocina.cambiarDatos} onPress={() => router.push('/datos')} />
        )}

        <View style={{ marginTop: SIZE.space, paddingTop: SIZE.space, borderTopWidth: 1, borderTopColor: PALETTE.linea, gap: SIZE.space }}>
          <Salidas openKitchenId={kitchen.id} />
        </View>
      </Formulario>
    </View>
  );
}
