import { StyleSheet, Text, View } from 'react-native';
import MapView from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { T } from '@/strings';

// THE SKELETON'S ONE SCREEN. Plan task `10.2a`.
//
// ⚠️ THE MAP IS HERE ON PURPOSE: it is how the first store build shows whether
// its map key works. On Android a build made without the key draws an empty
// map (the placeholder in `app.config.ts`); with the key, the streets. iOS draws
// Apple's map, which needs no key. `10.4` replaces this screen.
const CENTRO = { latitude: 19.4326, longitude: -99.1332, latitudeDelta: 0.04, longitudeDelta: 0.04 };

export default function Inicio() {
  return (
    <View style={styles.pantalla}>
      <MapView style={styles.mapa} initialRegion={CENTRO} />
      <SafeAreaView edges={['bottom']} style={styles.texto}>
        <Text style={styles.nombre}>{T.nombre}</Text>
        <Text style={styles.pronto}>{T.pronto}</Text>
        <Text style={styles.detalle}>{T.detalle}</Text>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: '#FFFCF6' },
  mapa: { flex: 1 },
  texto: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 12, gap: 6 },
  nombre: { fontSize: 28, fontWeight: '700', color: '#201D16' },
  pronto: { fontSize: 18, fontWeight: '600', color: '#1C6B4B' },
  detalle: { fontSize: 16, lineHeight: 22, color: '#6F675A' },
});
