// ============================================================================
// *AJUSTA EL PUNTO* — WHERE SHE PUTS HER OWN POINT, IF SHE WANTS ONE. Plan tasks
// `10.4b-iii-b`, `10.4c` (the search above the map, which only moves it), `10.4e`
// (the pin in the middle, the map moved under it) and `10.4h` (the owner's ruling
// of 2026-11-03, address first: the pin is a suggestion she never has to touch,
// and this screen is reached only by a tap on the small map or *Ajustar punto*).
//
// Three routes draw it and differ only in what *Listo* does with her point: the
// sign-up's (`(onboarding)/punto`) and *Cambiar dirección*'s
// (`(cocina)/direccion/punto`) keep it in the address screen's draft, written with
// the rest; her kitchen's *Ajustar punto* (`(cocina)/ubicacion`) saves it at once.
//
// ⚠️ *LISTO* HANDS UP THE MIDDLE OF THE MAP ONLY WHEN IT IS HERS — the pin
// `@/ui/MapaPunto` hands up each time the map settles, which is `null` while the
// middle is Google's (the map opens where the small map placed her address,
// `abreEn`) or the map is too far. Then *Listo* changes nothing: her point is
// optional, and Google's may not be kept.
//
// ⚠️ THE KEYBOARD: the search box at the top lists above the keys, so while the
// keyboard is up the screen gives up its height and the map shrinks (Android
// draws edge to edge, so the window is not resized for it); the foot steps aside
// while she searches, and comes back when she picks a suggestion or taps the map
// (`@/ui/MapaPunto`'s `onBuscando`).
// ============================================================================

import { useEffect, useState } from 'react';
import { Keyboard, Platform, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { AddressForm, Pin } from '@/api/place';
import type { Destino } from '@/lib/google';
import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';
import { Banda } from '@/ui/Banda';
import { BotonLleno } from '@/ui/BotonLleno';
import { MapaPunto } from '@/ui/MapaPunto';

export function PantallaPunto({
  antetitulo,
  pin: firstPin,
  direccion,
  abreEn,
  busy,
  onVolver,
  onListo,
}: {
  antetitulo: string | null;
  /** Her own point, when she has one for this street and number. */
  pin: Pin | null;
  /** Her address: the card names it, and the map looks it up when it opens with nothing else. */
  direccion: AddressForm | null;
  /** Where the small map placed her address — the map opens there when she has no point. */
  abreEn: Destino | null;
  busy: boolean;
  onVolver: () => void;
  /** *Listo*: her own point, or `null` when the middle is not hers. Answers `null`, or the sentence to show. */
  onListo: (pin: Pin | null) => Promise<string | null>;
}) {
  const insets = useSafeAreaInsets();
  const teclado = useAlturaDelTeclado();
  const [pin, setPin] = useState<Pin | null>(firstPin);
  const [problem, setProblem] = useState<string | null>(null);
  const [buscando, setBuscando] = useState(false);

  async function listo() {
    if (busy) return;
    Keyboard.dismiss();
    setProblem(await onListo(pin));
  }

  // ⚠️ ANDROID REPORTS THE KEYBOARD WITHOUT THE GESTURE BAR UNDER IT, AN IPHONE WITH
  // ITS HOME-INDICATOR AREA: measured 2026-10-30 on the emulator, the button sat
  // 13 dp under the keys until the bottom inset was added back on Android.
  const room = teclado > 0 ? teclado + (Platform.OS === 'android' ? insets.bottom : 0) : 0;

  return (
    <View style={{ flex: 1, backgroundColor: PALETTE.fondo, paddingBottom: room }}>
      <Banda titulo={ES.mapa.titulo} antetitulo={antetitulo} volver={{ label: ES.mapa.volver, onPress: onVolver }} />
      <MapaPunto pin={pin} direccion={direccion} abreEn={abreEn} onPin={setPin} onBuscando={setBuscando} />
      <View
        style={{
          display: buscando ? 'none' : 'flex',
          paddingHorizontal: SIZE.space * 2,
          paddingTop: SIZE.space,
          paddingBottom: SIZE.space + (teclado > 0 ? 0 : insets.bottom),
          gap: SIZE.space,
          borderTopWidth: 1,
          borderTopColor: PALETTE.linea,
          backgroundColor: PALETTE.fondo,
        }}
      >
        {problem !== null && (
          <Text style={{ fontSize: SIZE.bodySize, fontWeight: '600', color: PALETTE.error }}>{problem}</Text>
        )}
        <BotonLleno variante="principal" label={ES.mapa.listo} busy={busy} onPress={() => void listo()} />
        <Text style={{ fontSize: SIZE.bodySize, color: PALETTE.tintaApagada, textAlign: 'center' }}>{ES.mapa.guardado}</Text>
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
    const down = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () =>
      setAlto(0),
    );
    return () => {
      up.remove();
      down.remove();
    };
  }, []);
  return alto;
}
