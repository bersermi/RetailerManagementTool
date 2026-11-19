import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useEffect, useRef, useState } from 'react';
import { AppState, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { cajaDelEscaner } from '@/lib/escaner';
import { PALETTE, SIZE } from '@/theme/palette';
import { BotonLleno } from '@/ui/BotonLleno';

// ============================================================================
// ⚠️ ITACATE'S COPY OF WERA COCINA'S `cocina/src/ui/Escaner.tsx` (plan `10.9e-iii`: *Escanear* and *Mi código*),
// held to it code for code by `test/gemelos.test.ts` — a fix to one is a fix to both, in one PR.
// THE CAMERA THAT READS A QR CODE, IN A BOX ON THE SCREEN. Plan task `10.9c` (G16: a camera module in the
// first public build; the family-shell page's viewfinder, *Apunta a su código*) — a helper joining
// (`(onboarding)/unirme`), and the card's *Escanear a tu cliente* (`10.9e`).
//
// ⚠️ THE PHONE ASKS FOR THE CAMERA THE FIRST TIME SHE TAPS, NEVER BEFORE (the row): until then the box is a
// button. Allowed once — here or by *Tomar foto*, the same permission — the box opens straight to the
// camera. Refused, the box says so and the typed box under it is the way; once the phone will not ask
// again, *Permitir la cámara en Ajustes* opens the app's settings, and coming back reads the permission
// again. Which of these is drawn is `@/lib/escaner`'s, a pure rule the suite reads. ⚠️ NOTHING IS KEPT:
// the camera's picture never leaves the phone, and only the text of the code it reads is handed to the
// screen (`onLeido`), which says whether it was the code it wanted — a QR that is not reads a line and the
// camera stays open. NO CHECK CAN SEE THIS BOX (ADR-035 §2.11): the phone is its instrument.
// ============================================================================

export interface TextosDelEscaner {
  /** The closed box's button: *Escanear su código*. */
  readonly boton: string;
  /** Over the open camera: *Apunta a su código*. */
  readonly apunta: string;
  /** Refused: what to do instead. */
  readonly sinPermiso: string;
  /** Refused for good: the way to the app's settings. */
  readonly ajustes: string;
  /** A QR that is not the code this screen wants. */
  readonly noEs: string;
  /** The camera would not start. */
  readonly noAbre: string;
}

const ALTO = 210;

export function Escaner({
  textos,
  onLeido,
  activo = true,
}: {
  textos: TextosDelEscaner;
  /** The text of a QR it read; `true` when it was the code wanted, and the screen closes the camera. */
  onLeido: (texto: string) => boolean;
  /** `false` closes the camera — the code is already whole. */
  activo?: boolean;
}) {
  const [permiso, pedir, releer] = useCameraPermissions();
  const [noEs, setNoEs] = useState(false);
  const [noAbre, setNoAbre] = useState(false);
  const leido = useRef(false);
  const rechazado = useRef<string | null>(null);

  // Back from the phone's settings: the permission may have changed there.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') void releer();
    });
    return () => sub.remove();
  }, [releer]);

  // Opened again (a code cleared): it reads again.
  useEffect(() => {
    if (activo) {
      leido.current = false;
      rechazado.current = null;
      setNoEs(false);
    }
  }, [activo]);

  if (!activo) return null;
  const caja = noAbre ? 'no-abre' : cajaDelEscaner(permiso);

  const marco = { height: ALTO, borderRadius: 16, overflow: 'hidden' as const, borderWidth: 1, borderColor: PALETTE.linea };

  if (caja === 'camara') {
    return (
      <View style={[marco, { backgroundColor: PALETTE.tinta }]}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onMountError={() => setNoAbre(true)}
          onBarcodeScanned={({ data }) => {
            // It fires for every frame that holds the code: one answer per code.
            if (leido.current || data === rechazado.current) return;
            if (onLeido(data)) {
              leido.current = true;
              setNoEs(false);
            } else {
              rechazado.current = data;
              setNoEs(true);
            }
          }}
        />
        <Esquinas />
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: SIZE.rowGap, backgroundColor: 'rgba(32, 29, 22, 0.6)' }}>
          <Text style={{ textAlign: 'center', fontSize: SIZE.smallSize, fontWeight: '600', color: PALETTE.superficie }}>
            {noEs ? textos.noEs : textos.apunta}
          </Text>
        </View>
      </View>
    );
  }

  if (caja === 'negada' || caja === 'ajustes' || caja === 'no-abre') {
    return (
      <View style={[marco, { backgroundColor: PALETTE.superficie, justifyContent: 'center', padding: SIZE.space * 1.5, gap: SIZE.space }]}>
        <Text style={{ fontSize: SIZE.bodySize, lineHeight: 22, color: PALETTE.tinta, textAlign: 'center' }}>
          {caja === 'no-abre' ? textos.noAbre : textos.sinPermiso}
        </Text>
        {caja === 'negada' && <BotonLleno label={textos.boton} onPress={() => void pedir()} />}
        {caja === 'ajustes' && (
          <BotonLleno variante="discreto" label={textos.ajustes} onPress={() => void Linking.openSettings().catch(() => {})} />
        )}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={textos.boton}
      disabled={caja === 'leyendo'}
      onPress={() => void pedir()}
      style={({ pressed }) => [
        marco,
        { backgroundColor: pressed ? PALETTE.accionSuave : PALETTE.superficie, alignItems: 'center', justifyContent: 'center', gap: SIZE.rowGap },
      ]}
    >
      <MaterialCommunityIcons name="qrcode-scan" size={54} color={PALETTE.accion} />
      <Text style={{ fontSize: SIZE.bodySize, fontWeight: '600', color: PALETTE.accion }}>{textos.boton}</Text>
    </Pressable>
  );
}

/** The four corners of the viewfinder (the family-shell page's `vfc`), drawn over the camera. */
function Esquinas() {
  const lado = 34;
  const grosor = 4;
  const caja = { position: 'absolute' as const, width: lado, height: lado, borderColor: PALETTE.superficie };
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', width: 150, height: 150, top: (ALTO - 150) / 2 - 14, alignSelf: 'center' }}
    >
      <View style={[caja, { top: 0, left: 0, borderTopWidth: grosor, borderLeftWidth: grosor, borderTopLeftRadius: 8 }]} />
      <View style={[caja, { top: 0, right: 0, borderTopWidth: grosor, borderRightWidth: grosor, borderTopRightRadius: 8 }]} />
      <View style={[caja, { bottom: 0, left: 0, borderBottomWidth: grosor, borderLeftWidth: grosor, borderBottomLeftRadius: 8 }]} />
      <View style={[caja, { bottom: 0, right: 0, borderBottomWidth: grosor, borderRightWidth: grosor, borderBottomRightRadius: 8 }]} />
    </View>
  );
}
