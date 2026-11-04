import { StyleSheet, Text, View } from 'react-native';
import MapView from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/AuthProvider';
import { quienEntro } from '@/auth/quien';
import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';
import { Formulario } from '@/ui/Formulario';
import { Salidas } from '@/ui/Salidas';

// ============================================================================
// THE SKELETON'S ONE SCREEN, NOW BEHIND THE SIGN-IN. Plan tasks `10.2a` (the
// map and its three lines), `10.5-iii-a` (who is signed in, and *Cerrar
// sesión*) and `10.5-iii-b` (her way out, `@/ui/Salidas`).
//
// ⚠️ THE MAP IS HERE ON PURPOSE: it is how a build shows whether its map key
// works. On Android a build made without the key draws an empty map (the
// placeholder in `app.config.ts`); with the key, the streets. iOS draws Apple's
// map, which needs no key. `10.5-iv` replaces this screen with what is close to her.
//
// ⚠️ HER WAY OUT AT THE FOOT (`@/ui/Salidas`, `10.5-iii-b`): *Cerrar sesión*,
// always, and *Eliminar mi cuenta* once what goes with her account is known —
// Wera Cocina's block. A login that owns a kitchen or a shop types each name at
// the foot, so the screen is a `Formulario`, as Wera Cocina's kitchen is: the
// box being typed in stays above the keyboard. ⚠️ While the deletion is closed
// the map still fills what the lines leave (the content grows to the screen and
// the map takes the rest); opened, the page scrolls and the map keeps
// `MAPA_MINIMO`. A map inside a scroll view keeps its own drags on Android:
// react-native-maps 1.27.2's `MapView.dispatchTouchEvent` asks its parents not to
// intercept from a finger's down to its up. ⚠️ NO CHECK CAN SEE THIS SCREEN
// (ADR-035 §2.11): the phone is its instrument.
// ============================================================================
const CENTRO = { latitude: 19.4326, longitude: -99.1332, latitudeDelta: 0.04, longitudeDelta: 0.04 };

/** How short the map may get once the deletion is open and the page scrolls. */
const MAPA_MINIMO = 240;

export default function Inicio() {
  const { session } = useAuth();
  const quien = quienEntro(session?.user);

  return (
    <Formulario style={styles.pantalla} contentContainerStyle={styles.contenido}>
      <MapView style={styles.mapa} initialRegion={CENTRO} />
      <SafeAreaView edges={['bottom']} style={styles.texto}>
        <Text style={styles.nombre}>{ES.nombre}</Text>
        <Text style={styles.pronto}>{ES.inicio.pronto}</Text>
        <Text style={styles.detalle}>{ES.inicio.detalle}</Text>
        {quien !== null && <Text style={styles.detalle}>{ES.inicio.quien(quien)}</Text>}
        <View style={{ marginTop: SIZE.rowGap }}>
          <Salidas />
        </View>
      </SafeAreaView>
    </Formulario>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: PALETTE.fondo },
  contenido: { flexGrow: 1 },
  mapa: { flex: 1, minHeight: MAPA_MINIMO },
  texto: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 12, gap: 6 },
  nombre: { fontSize: 28, fontWeight: '700', color: PALETTE.tinta },
  pronto: { fontSize: 18, fontWeight: '600', color: PALETTE.itacate },
  detalle: { fontSize: SIZE.bodySize, lineHeight: 22, color: PALETTE.tintaApagada },
});
