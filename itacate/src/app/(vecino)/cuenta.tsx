import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/AuthProvider';
import { quienEntro } from '@/auth/quien';
import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';
import { Banda } from '@/ui/Banda';
import { Formulario } from '@/ui/Formulario';
import { Salidas } from '@/ui/Salidas';

// ============================================================================
// *TU CUENTA* — who is signed in, and her way out. Plan task `10.5-iv-a-i`: the list
// of kitchens replaced the one screen her way out stood at the foot of
// (`10.5-iii-b`), so it moved here, behind *Tu cuenta* at the top of the list.
//
// ⚠️ HER WAY OUT IS UNCHANGED (`@/ui/Salidas`, Wera Cocina's block): *Cerrar sesión*,
// always, and *Eliminar mi cuenta* once what goes with her account is known; a
// login that owns a kitchen or a shop types each name. So the screen is a
// `Formulario`, as before: the box being typed in stays above the keyboard.
// ⚠️ NO CHECK CAN SEE THIS SCREEN (ADR-035 §2.11): the phone is its instrument.
// ============================================================================
export default function Cuenta() {
  const { session } = useAuth();
  const quien = quienEntro(session?.user);

  return (
    <Formulario style={styles.pantalla} contentContainerStyle={styles.contenido}>
      <Banda titulo={ES.cuenta.titulo} volver={{ label: ES.cuenta.volver, onPress: () => router.back() }} />
      <SafeAreaView edges={['bottom']} style={styles.texto}>
        {quien !== null && <Text style={styles.quien}>{ES.cuenta.quien(quien)}</Text>}
        <Text style={styles.detalle}>{ES.cuenta.version}</Text>
        <View style={{ marginTop: SIZE.space }}>
          <Salidas />
        </View>
      </SafeAreaView>
    </Formulario>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: PALETTE.fondo },
  contenido: { flexGrow: 1 },
  texto: { paddingHorizontal: SIZE.space * 2, paddingTop: SIZE.space * 2, paddingBottom: SIZE.space, gap: SIZE.rowGap },
  quien: { fontSize: SIZE.bodySize, fontWeight: '600', color: PALETTE.tinta },
  detalle: { fontSize: SIZE.bodySize, lineHeight: 22, color: PALETTE.tintaApagada },
});
