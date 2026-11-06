import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Image, Linking, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { AVISO_URL } from '@/auth/aviso';
import { useDondeBuscar } from '@/lib/DondeBuscarProvider';
import { SUPPORT_WHATSAPP } from '@/lib/supportWhatsapp';
import { ayudaUrl, cuentaDe } from '@/lib/tu';
import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';
import { Cabeza } from '@/ui/Cabeza';
import { Fila } from '@/ui/Fila';
import { Formulario } from '@/ui/Formulario';
import { Grupo } from '@/ui/Grupo';
import { Llega } from '@/ui/Llega';
import { Salidas } from '@/ui/Salidas';

// ============================================================================
// *TÚ* — WHAT SHE SETS ONCE. Plan task `10.5-v-b`, the owner's ruling of 2026-11-05,
// drawn on the family-shell page: her account, *Dónde buscar*, the aviso, help by
// WhatsApp, her way out, and *Itacate, de Wera*. It replaced *Tu cuenta*
// (`10.5-iv-a-i`), a screen pushed from the list's band; the tab is now the way there,
// one tap from anywhere (Apple's 5.1.1(v): deleting an account easy to find).
//
// ⚠️ STATE FIRST (ADR-035 §2.8): who is signed in and how, a row with nothing to tap,
// then the doors. ⚠️ HER WAY OUT IS UNCHANGED (`@/ui/Salidas`, Wera Cocina's block):
// a sole owner types each business's name, so the screen is a `Formulario` that keeps
// the box above the keyboard. *Ayuda por WhatsApp* is drawn only on a build that
// carries the owner's number, as *¿Olvidaste tu contraseña?* is. NO CHECK CAN SEE
// THIS SCREEN (§2.11): the phone is its instrument.
// ============================================================================

/** The cow, Wera's mark, in its rust — `app/src/marca/vaca-oxido.png`, byte for byte. */
const VACA = require('@/marca/vaca-oxido.png') as number;

export default function Tu() {
  const { session } = useAuth();
  const cuenta = cuentaDe(session?.user);
  const { codigo } = useDondeBuscar();
  const numero = SUPPORT_WHATSAPP;

  return (
    <Formulario style={styles.pantalla} contentContainerStyle={styles.contenido}>
      <Cabeza titulo={ES.tu.titulo}>
        <Text style={styles.detalle}>{ES.tu.detalle}</Text>
      </Cabeza>
      <View style={styles.cuerpo}>
        <Llega i={0}>
          <Grupo>
            {cuenta.titulo !== null && <Fila icono="account-outline" titulo={cuenta.titulo} detalle={cuenta.detalle} />}
            <Fila
              icono="map-marker-outline"
              titulo={ES.tu.dondeBuscar}
              detalle={codigo === null ? ES.tu.miUbicacion : ES.tu.codigoPostal(codigo.cp)}
              onPress={() => router.push('/donde')}
            />
            <Fila
              icono="shield-lock-outline"
              titulo={ES.tu.aviso}
              onPress={() => {
                WebBrowser.openBrowserAsync(AVISO_URL).catch(() => {});
              }}
            />
            {numero !== null && (
              <Fila
                icono="whatsapp"
                titulo={ES.tu.ayuda}
                onPress={() => {
                  Linking.openURL(ayudaUrl(numero, session?.user.email)).catch(() => {});
                }}
              />
            )}
          </Grupo>
        </Llega>
        <Llega i={1}>
          <Salidas />
        </Llega>
        <Llega i={2} style={styles.pie}>
          <View style={styles.firma}>
            <Image source={VACA} style={styles.vaca} accessibilityIgnoresInvertColors />
            <Text style={styles.deWera}>{ES.tu.deWera}</Text>
          </View>
          <Text style={styles.version}>{ES.tu.version}</Text>
        </Llega>
      </View>
    </Formulario>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: PALETTE.fondo },
  contenido: { flexGrow: 1 },
  detalle: { fontSize: SIZE.smallSize, color: PALETTE.tintaApagada },
  cuerpo: { padding: SIZE.space * 1.5, paddingBottom: SIZE.space * 3, gap: SIZE.space * 1.5 },
  pie: { alignItems: 'center', gap: SIZE.rowGap, paddingTop: SIZE.rowGap },
  firma: { flexDirection: 'row', alignItems: 'center', gap: SIZE.rowGap },
  vaca: { width: 24, height: 24 },
  deWera: { fontSize: SIZE.smallSize - 1, fontWeight: '600', color: PALETTE.tintaApagada },
  version: { fontSize: SIZE.smallSize - 1, lineHeight: 18, color: PALETTE.tintaApagada, textAlign: 'center' },
});
