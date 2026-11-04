import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/AuthProvider';
import { quienEntro } from '@/auth/quien';
import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';
import { BotonLleno } from '@/ui/BotonLleno';

// ============================================================================
// THE SKELETON'S ONE SCREEN, NOW BEHIND THE SIGN-IN. Plan tasks `10.2a` (the
// map and its three lines) and `10.5-iii-a` (who is signed in, and the way out).
//
// ⚠️ THE MAP IS HERE ON PURPOSE: it is how a build shows whether its map key
// works. On Android a build made without the key draws an empty map (the
// placeholder in `app.config.ts`); with the key, the streets. iOS draws Apple's
// map, which needs no key. `10.5-iv` replaces this screen with what is close to her.
//
// ⚠️ *CERRAR SESIÓN* IS ALWAYS HERE: a person who signed in with the wrong
// account, or the owner trying this app with his Wera login, is never held.
// *Eliminar mi cuenta* joins it with `10.5-iii-b`, her way out.
// ============================================================================
const CENTRO = { latitude: 19.4326, longitude: -99.1332, latitudeDelta: 0.04, longitudeDelta: 0.04 };

export default function Inicio() {
  const { session, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const quien = quienEntro(session?.user);

  async function leave() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <View style={styles.pantalla}>
      <MapView style={styles.mapa} initialRegion={CENTRO} />
      <SafeAreaView edges={['bottom']} style={styles.texto}>
        <Text style={styles.nombre}>{ES.nombre}</Text>
        <Text style={styles.pronto}>{ES.inicio.pronto}</Text>
        <Text style={styles.detalle}>{ES.inicio.detalle}</Text>
        {quien !== null && <Text style={styles.detalle}>{ES.inicio.quien(quien)}</Text>}
        <View style={{ marginTop: SIZE.rowGap }}>
          <BotonLleno variante="discreto" label={ES.auth.signOut} busy={signingOut} onPress={() => void leave()} />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: PALETTE.fondo },
  mapa: { flex: 1 },
  texto: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 12, gap: 6 },
  nombre: { fontSize: 28, fontWeight: '700', color: PALETTE.tinta },
  pronto: { fontSize: 18, fontWeight: '600', color: PALETTE.itacate },
  detalle: { fontSize: SIZE.bodySize, lineHeight: 22, color: PALETTE.tintaApagada },
});
