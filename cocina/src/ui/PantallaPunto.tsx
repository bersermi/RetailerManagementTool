// ============================================================================
// THE SCREEN WHERE SHE PUTS HER KITCHEN ON THE MAP. Plan tasks `10.4b-iii-b`
// and `10.4c` (the search above the map, which only moves it).
//
// Two routes draw it and differ only in what the button does: the sign-up's
// last step (`(onboarding)/punto`, *Registrar mi cocina* makes the kitchen) and
// her kitchen's *Cambiar el punto* (`(cocina)/ubicacion`, *Guardar* moves it).
//
// ⚠️ THE SENTENCE UNDER THE BOX IS SAID BEFORE SHE SAVES, EVERY TIME: neighbours
// will see this exact spot (the owner's ruling 4 of 2026-10-28), and nobody has
// asked whether a fonda is run from a home — a fonda that is would show that
// home. The proposal on record since 2026-10-28 is that her pin screen says so.
//
// ⚠️ THE KEYBOARD: the line of directions is typed at the foot of the screen,
// so while the keyboard is up the screen gives up its height and the map shrinks
// — the box stays above the keys (Android draws edge to edge, so the window is
// not resized for it).
//
// ⚠️ WHILE SHE SEARCHES, THE FOOT OF THE SCREEN STEPS ASIDE: with the keys up, a
// small phone has no room for the box, the suggestions, the map and the line of
// directions with its button. The foot comes back when she picks a suggestion
// or taps the map (`@/ui/MapaPunto`'s `onBuscando`).
// ============================================================================

import { useEffect, useState } from 'react';
import { Keyboard, Platform, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DIRECTIONS_MAX, type AddressForm, type Pin } from '@/api/place';
import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';
import { Banda } from '@/ui/Banda';
import { BotonLleno } from '@/ui/BotonLleno';
import { Campo } from '@/ui/Campo';
import { MapaPunto } from '@/ui/MapaPunto';

export function PantallaPunto({
  antetitulo,
  pin: firstPin,
  direccion,
  directions: firstDirections,
  accion,
  busy,
  onVolver,
  onCambio,
  onGuardar,
}: {
  antetitulo: string;
  pin: Pin | null;
  /** The address she typed — searched as the map opens, while she has no pin. */
  direccion: AddressForm | null;
  directions: string;
  /** The button's words. */
  accion: string;
  busy: boolean;
  onVolver: () => void;
  /** Told of every change, so a step back and forth keeps them. */
  onCambio?: (pin: Pin | null, directions: string) => void;
  /** Saves; answers `null`, or the sentence to show. */
  onGuardar: (pin: Pin, directions: string) => Promise<string | null>;
}) {
  const insets = useSafeAreaInsets();
  const teclado = useAlturaDelTeclado();
  const [pin, setPin] = useState<Pin | null>(firstPin);
  const [directions, setDirections] = useState(firstDirections);
  const [problem, setProblem] = useState<string | null>(null);
  const [buscando, setBuscando] = useState(false);

  function placed(next: Pin) {
    setPin(next);
    setProblem(null);
    onCambio?.(next, directions);
  }

  function typed(text: string) {
    setDirections(text);
    onCambio?.(pin, text);
  }

  async function guardar() {
    if (busy) return;
    if (pin === null) {
      setProblem(ES.mapa.falta);
      return;
    }
    Keyboard.dismiss();
    setProblem(await onGuardar(pin, directions));
  }

  // ⚠️ ANDROID REPORTS THE KEYBOARD WITHOUT THE GESTURE BAR UNDER IT, AN IPHONE WITH
  // ITS HOME-INDICATOR AREA: measured 2026-10-30 on the emulator, the button sat
  // 13 dp under the keys until the bottom inset was added back on Android.
  const room = teclado > 0 ? teclado + (Platform.OS === 'android' ? insets.bottom : 0) : 0;

  return (
    <View style={{ flex: 1, backgroundColor: PALETTE.fondo, paddingBottom: room }}>
      <Banda titulo={ES.mapa.titulo} antetitulo={antetitulo} volver={{ label: ES.mapa.volver, onPress: onVolver }} />
      <MapaPunto pin={pin} direccion={direccion} onPin={placed} onBuscando={setBuscando} />
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
        <Campo
          label={ES.mapa.indicaciones}
          placeholder={ES.mapa.indicacionesEjemplo}
          value={directions}
          onChangeText={typed}
          maxLength={DIRECTIONS_MAX}
          autoCapitalize="sentences"
          submitBehavior="blurAndSubmit"
          editable={!busy}
        />
        <Text style={{ fontSize: SIZE.bodySize, color: PALETTE.tintaApagada }}>{ES.mapa.vecinos}</Text>
        {problem !== null && (
          <Text style={{ fontSize: SIZE.bodySize, fontWeight: '600', color: PALETTE.error }}>{problem}</Text>
        )}
        <BotonLleno variante="principal" label={accion} busy={busy} onPress={() => void guardar()} />
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
