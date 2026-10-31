import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useKitchenGiros } from '@/api/hooks';
import { formIssue } from '@/api/registro';
import { useAuth } from '@/auth/AuthProvider';
import { quienEntro } from '@/auth/quien';
import { useBorrador } from '@/lib/borrador';
import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';
import { Banda } from '@/ui/Banda';
import { BotonLleno } from '@/ui/BotonLleno';
import { Campo } from '@/ui/Campo';
import { Direccion } from '@/ui/Direccion';
import { Formulario } from '@/ui/Formulario';
import { Giros } from '@/ui/Giros';
import { Salidas } from '@/ui/Salidas';

// ============================================================================
// WHERE A LOGIN WITH NO KITCHEN LANDS, AND MAKES ONE — the form. Plan tasks
// `10.4b-iii-a` (the landing) and `10.4b-iii-b` (the kitchen).
//
// Every first sign-in comes here, and so does a shop's owner who opens this app
// with her Wera login: Cocina reads kitchens only (`@/api/kitchen`), so her shop
// is not here and is not touched — it stays Wera's, and the kitchen she makes
// here is a second business, with its own place (`@/api/place`).
//
// ⚠️ THREE QUESTIONS, THEN THE MAP: her kitchen's name, what it is (one of the
// kitchens' own trades, nothing chosen for her) and its address in Wera's five
// boxes. *Siguiente* checks them in the screen's order and says the first one
// missing; nothing is written until the map's *Registrar mi cocina*.
//
// ⚠️ THE WAY OUT STAYS AT THE FOOT (`@/ui/Salidas`): a shop's owner who opened
// the wrong app, or anyone who signed in with the wrong account, is never held
// on a form — *Cerrar sesión*, and since `10.4b-iii-c` *Eliminar mi cuenta*,
// which names her shop when she alone owns one and asks its name (`0073`).
// ============================================================================
export default function Registro() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const giros = useKitchenGiros();
  const { borrador, cambiar } = useBorrador();
  const [problem, setProblem] = useState<string | null>(null);
  const quien = quienEntro(session?.user);
  const lista = giros.data ?? [];

  function next() {
    const issue = formIssue(borrador);
    if (issue === 'name') setProblem(ES.registro.errores.nombre);
    else if (issue === 'giro') setProblem(ES.registro.errores.giro);
    else if (issue !== null) setProblem(ES.address.issues[issue]);
    else {
      setProblem(null);
      router.push('/punto');
    }
  }

  const section = { fontSize: SIZE.bodySize, fontWeight: '700', color: PALETTE.tinta, marginTop: SIZE.space } as const;

  return (
    <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
      <Banda titulo={ES.registro.titulo} antetitulo={ES.registro.antetitulo} />
      <Formulario
        contentContainerStyle={{
          paddingHorizontal: SIZE.space * 2,
          paddingTop: SIZE.space * 2,
          paddingBottom: SIZE.space * 2 + insets.bottom,
          gap: SIZE.space,
        }}
      >
        {quien !== null && (
          <Text style={{ fontSize: SIZE.bodySize, color: PALETTE.tintaApagada }}>{ES.registro.quien(quien)}</Text>
        )}

        <Campo
          label={ES.registro.nombre}
          placeholder={ES.registro.nombreEjemplo}
          value={borrador.name}
          onChangeText={(name) => cambiar({ name })}
          autoCapitalize="words"
          autoCorrect={false}
          submitBehavior="blurAndSubmit"
        />

        <Text style={section}>{ES.registro.giro}</Text>
        {lista.length > 0 ? (
          <Giros giros={lista} chosen={borrador.giro} onChoose={(giro) => cambiar({ giro })} />
        ) : giros.isError ? (
          <>
            <Text style={{ fontSize: SIZE.bodySize, color: PALETTE.tinta }}>{ES.registro.giroSinLeer}</Text>
            <BotonLleno label={ES.cocina.otraVez} busy={giros.isFetching} onPress={() => void giros.refetch()} />
          </>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SIZE.rowGap }}>
            <ActivityIndicator color={PALETTE.accion} />
            <Text style={{ fontSize: SIZE.bodySize, color: PALETTE.tintaApagada }}>{ES.registro.giroLeyendo}</Text>
          </View>
        )}

        <Text style={section}>{ES.registro.donde}</Text>
        <Direccion value={borrador.address} onChange={(address) => cambiar({ address })} />

        {problem !== null && (
          <Text style={{ fontSize: SIZE.bodySize, fontWeight: '600', color: PALETTE.error }}>{problem}</Text>
        )}
        <View style={{ marginTop: SIZE.space }}>
          <BotonLleno variante="principal" label={ES.registro.siguiente} onPress={next} />
        </View>
        <Salidas openKitchenId={null} />
      </Formulario>
    </View>
  );
}
