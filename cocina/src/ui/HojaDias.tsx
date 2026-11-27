import { useEffect, useRef, useState } from 'react';
import { BackHandler, Keyboard, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DIAS_MAX, DIAS_MIN } from '@/api/tarjeta';
import { diasDeTexto, diasQueCaben, ejemploDeDias, empujarDias, soloDigitos } from '@/lib/tarjeta';
import { ES } from '@/strings';
import { TITULO } from '@/theme/letra';
import { PALETTE, SIZE } from '@/theme/palette';
import { ESQUINA } from '@/theme/density';

// ============================================================================
// *OTRO…* — HOW MANY DAYS WITHOUT A VISIT, TYPED. Plan task `10.9k`, the owner's rulings of 2026-11-19
// (*"the user should be able to type the number instead of using endless clicks"*) as the proposals page
// draws them (https://claude.ai/artifact/TcLcAcHLDiCZ4QPgWKfVxX, version 3):
//   - *¿Cuántos días sin venir?*, THE CURSOR IN THE BOX AND THE NUMBER KEYPAD UP on opening; three digits
//     at most, no decimals (`soloDigitos`); − / + beside it nudge by one (`empujarDias`);
//   - a live line, *Se borran si pasan* **21 días** *sin venir.*, and *Si su último sello fuera hoy, se
//     borrarían el 10 de diciembre.* (`ejemploDeDias`);
//   - out of range, *Elige de 14 a 365 días.* in words, and *Listo* off until it fits — no shake, no sound;
//   - reopened with her days in the box, all of it selected, so what she types replaces it.
//
// ⚠️ NOT A `Modal`: on Android a `Modal` is a window of its own, and Wera's price sheet measured that the
// number pad then waits for a tap on the box whatever asks for focus (`app/src/ui/HojaPrecio.tsx`, R9) —
// the opposite of the ruling. So this sheet is drawn OVER THE SCREEN, in its window: its box takes focus
// as it mounts, and the sheet stands on the keyboard by its height — on Android with the gesture bar
// under the keys added back (`@/ui/PantallaPunto`'s measurement, 2026-10-30), on an Android older than 15
// with nothing, since the system shortens the window itself there (`app/src/lib/teclado.ts`).
// The hardware back closes it, the keyboard first. NO CHECK CAN SEE IT (ADR-035 §2.11): the emulator,
// with the keypad up, is its instrument.
// ============================================================================

/** The first Android that no longer shortens the window for the keyboard (Wera's `ANDROID_EDGE_TO_EDGE_API`). */
const ANDROID_EDGE_TO_EDGE_API = 35;

export function HojaDias({
  visible,
  inicial,
  onCerrar,
  onListo,
}: {
  visible: boolean;
  /** Her days when *Otro…* already holds them, else `null` — the box opens empty. */
  inicial: number | null;
  onCerrar: () => void;
  onListo: (dias: number) => void;
}) {
  const insets = useSafeAreaInsets();
  const teclado = useAlturaDelTeclado();
  const [texto, setTexto] = useState('');
  const caja = useRef<TextInput>(null);

  // Each time it opens: her days, or an empty box.
  useEffect(() => {
    if (visible) setTexto(inicial === null ? '' : String(inicial));
  }, [visible, inicial]);

  // The hardware back closes the sheet, never the screen under it (Android closes the keyboard first).
  useEffect(() => {
    if (!visible) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onCerrar();
      return true;
    });
    return () => sub.remove();
  }, [visible, onCerrar]);

  if (!visible) return null;

  const dias = diasDeTexto(texto);
  const cabe = diasQueCaben(dias);
  const fuera = dias !== null && !cabe;
  const vivo = cabe ? ES.prepararTarjeta.hojaDias.vivo(dias) : null;
  const hace = Platform.OS === 'android' && Number(Platform.Version) < ANDROID_EDGE_TO_EDGE_API;
  const sitio = teclado > 0 && !hace ? teclado + (Platform.OS === 'android' ? insets.bottom : 0) : 0;
  const empujar = (paso: 1 | -1) => setTexto(String(empujarDias(dias, paso)));
  const listo = () => {
    if (!cabe) return;
    Keyboard.dismiss();
    onListo(dias);
  };

  const signo = (paso: 1 | -1) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={paso === 1 ? ES.prepararTarjeta.hojaDias.mas : ES.prepararTarjeta.hojaDias.menos}
      onPress={() => empujar(paso)}
      style={({ pressed }) => ({
        width: SIZE.tapTarget,
        height: SIZE.tapTarget,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: ESQUINA.boton,
        borderWidth: 1,
        borderColor: PALETTE.accion,
        backgroundColor: pressed ? PALETTE.accion : PALETTE.accionSuave,
      })}
    >
      {({ pressed }) => (
        <Text style={{ fontSize: 24, fontWeight: '700', color: pressed ? PALETTE.superficie : PALETTE.accion }}>{paso === 1 ? '+' : '−'}</Text>
      )}
    </Pressable>
  );

  return (
    <View style={[StyleSheet.absoluteFill, { justifyContent: 'flex-end' }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={ES.prepararTarjeta.hojaDias.cerrar}
        onPress={onCerrar}
        style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(32, 29, 22, 0.45)' }]}
      />
      <View
        style={{
          backgroundColor: PALETTE.fondo,
          borderTopLeftRadius: ESQUINA.hoja,
          borderTopRightRadius: ESQUINA.hoja,
          paddingHorizontal: SIZE.space * 1.5,
          paddingTop: SIZE.rowGap,
          paddingBottom: (sitio > 0 ? sitio : insets.bottom) + SIZE.space * 1.5,
          gap: SIZE.space,
        }}
      >
        <View style={{ alignSelf: 'center', width: 36, height: 4, borderRadius: ESQUINA.marca, backgroundColor: PALETTE.linea }} />
        <Text accessibilityRole="header" style={{ fontSize: SIZE.titleSize - 2, ...TITULO, color: PALETTE.tinta }}>
          {ES.prepararTarjeta.hojaDias.titulo}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SIZE.rowGap }}>
          {signo(-1)}
          <Pressable
            onPress={() => caja.current?.focus()}
            style={{
              flex: 1,
              height: SIZE.tapTarget + 8,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              borderRadius: ESQUINA.campo,
              borderWidth: 2,
              borderColor: fuera ? PALETTE.error : PALETTE.accion,
              backgroundColor: PALETTE.superficie,
            }}
          >
            <TextInput
              ref={caja}
              accessibilityLabel={ES.prepararTarjeta.hojaDias.titulo}
              value={texto}
              onChangeText={(nuevo) => setTexto(soloDigitos(nuevo))}
              keyboardType="number-pad"
              inputMode="numeric"
              maxLength={3}
              autoFocus
              selectTextOnFocus
              returnKeyType="done"
              onSubmitEditing={listo}
              cursorColor={fuera ? PALETTE.error : PALETTE.accion}
              selectionColor={fuera ? PALETTE.error : PALETTE.accion}
              style={{
                minWidth: 56,
                paddingVertical: 0,
                textAlign: 'right',
                fontSize: 28,
                ...TITULO,
                color: PALETTE.tinta,
                fontVariant: ['tabular-nums'],
              }}
            />
            <Text style={{ fontSize: SIZE.bodySize - 2, fontWeight: '600', color: PALETTE.tintaApagada }}>{ES.prepararTarjeta.hojaDias.unidad}</Text>
          </Pressable>
          {signo(1)}
        </View>
        <View accessibilityLiveRegion="polite" style={{ gap: 4, minHeight: 40 }}>
          {vivo !== null && (
            <>
              <Text style={{ fontSize: SIZE.bodySize - 1, color: PALETTE.tinta }}>
                {vivo.antes}
                <Text style={{ fontWeight: '700', color: PALETTE.marca }}>{vivo.cuanto}</Text>
                {vivo.despues}
              </Text>
              <Text style={{ fontSize: SIZE.smallSize, color: PALETTE.tintaApagada }}>{ejemploDeDias(dias as number, new Date())}</Text>
            </>
          )}
          {fuera && (
            <Text style={{ fontSize: SIZE.smallSize, fontWeight: '600', color: PALETTE.error }}>
              {ES.prepararTarjeta.hojaDias.rango(DIAS_MIN, DIAS_MAX)}
            </Text>
          )}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={ES.prepararTarjeta.hojaDias.listo}
          accessibilityState={{ disabled: !cabe }}
          disabled={!cabe}
          onPress={listo}
          style={{
            minHeight: SIZE.tapTarget,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: ESQUINA.boton,
            borderWidth: 1,
            borderColor: cabe ? PALETTE.accion : PALETTE.linea,
            backgroundColor: cabe ? PALETTE.accion : PALETTE.linea,
          }}
        >
          <Text style={{ fontSize: SIZE.bodySize, fontWeight: '700', color: cabe ? PALETTE.superficie : PALETTE.tintaApagada }}>
            {ES.prepararTarjeta.hojaDias.listo}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

/** The keyboard's height while it is up, else 0. An iPhone says so before it moves; Android after. */
function useAlturaDelTeclado(): number {
  const [alto, setAlto] = useState(0);
  useEffect(() => {
    const up = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', (e) =>
      setAlto(e.endCoordinates.height),
    );
    const down = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setAlto(0));
    return () => {
      up.remove();
      down.remove();
    };
  }, []);
  return alto;
}
