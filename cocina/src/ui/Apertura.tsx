import { useEffect, useState, type ReactNode } from 'react';
import { Image, Platform, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  ReduceMotion,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  COW_BOX,
  NOD_DEGREES,
  OPENING,
  SELLO,
  SQUARE_CORNER,
  SQUARE_SIDE,
  esperaDe,
  settledScale,
} from '@/theme/apertura';
import { PALETTE, SIZE } from '@/theme/palette';

/** Wera's cream cow, byte for byte (`app/src/marca/vaca-crema.png`) — drawn green too, by tint. */
const VACA = require('@/marca/vaca-crema.png') as number;

// ============================================================================
// THE OPENING — THE COW TURNS INTO WERA COCINA'S ICON. Plan task `10.5-v-d`, the first
// run as the family-shell page drew it: *"the cow's opening on Cocina's green"*. Wera's
// opening (`app/src/app/(auth)/hola.tsx`, `8g`) in this app's colours: on the splash's
// own frame the cow in Cocina's green; the green square grows behind her as she turns
// cream; she nods; the icon rises to a third of the screen; then the words and the
// buttons arrive. Its numbers are `@/theme/apertura`'s.
//
// ⚠️ ONE PICTURE, TWO COLOURS: the cream cow is one colour on nothing, so the green one
// is the same file tinted — no new picture in the update.
// ⚠️ AND THEY ARE DRAWN AT ONCE (`fadeDuration={0}`): Android's `Image` fades every picture in over
// 300 ms by default, so on the test build the cow faded in as the splash faded out and blinked pale —
// recorded 2026-11-07, twice; a screen with no transition did not change it.
// ⚠️ THE TWO PICTURES MUST BE IN BEFORE ANYTHING MOVES — on Wera's emulator the square
// grew empty while they loaded — so nothing starts, and the splash is not let go
// (`onCargada`), until both are drawn. ⚠️ AND ON ANDROID NOT UNTIL THE SPLASH HAS FADED
// (`esperaDe`): measured on the emulator, the square and the nod otherwise play under it.
// ⚠️ WITHOUT `plays` IT IS SIMPLY THERE, settled: every later launch, and a phone that
// cannot remember. ⚠️ `ReduceMotion.System`: a phone set to reduce motion is shown the
// end at once. ⚠️ A MOTION PART, AS `@/ui/Llega` AND `@/ui/Nota` ARE: opacity and
// transform only (`test/pestanas.test.ts`). NO CHECK CAN SEE A FRAME MOVE (ADR-035
// §2.11): the emulator and his phones are the instruments.
// ============================================================================

const SISTEMA = ReduceMotion.System;
/** Android's splash fades out over the opening's first frame; the steps start once it is gone. */
const ESPERA = esperaDe(Platform.OS);

export function Apertura({
  plays,
  onCargada,
  palabras,
  botones,
}: {
  plays: boolean;
  /** Both pictures are drawn: the splash may let go. */
  onCargada: () => void;
  /** Her app's name and its line, under the icon. */
  palabras: ReactNode;
  /** At the foot. */
  botones: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [cargadas, setCargadas] = useState(0);
  const listo = cargadas >= 2;

  const cuadro = useSharedValue(plays ? 0 : 1);
  const crema = useSharedValue(plays ? 0 : 1);
  const cabeceo = useSharedValue(0);
  const sube = useSharedValue(plays ? 0 : 1);
  const llegan = useSharedValue(plays ? 0 : 1);

  // Settled a third of the way down, at the seal's size.
  const restY = insets.top + height * 0.24;
  const climb = restY - height / 2;
  const settled = settledScale(SELLO);
  const step = SIZE.space + SIZE.rowGap;

  useEffect(() => {
    if (listo) onCargada();
  }, [listo, onCargada]);

  // Once, when both pictures are in.
  useEffect(() => {
    if (!listo || !plays) return;
    cuadro.value = withDelay(
      ESPERA + OPENING.squareFrom,
      withTiming(1, { duration: OPENING.squareFor, easing: Easing.bezier(0.34, 1.56, 0.64, 1), reduceMotion: SISTEMA }),
      SISTEMA,
    );
    crema.value = withDelay(
      ESPERA + OPENING.creamFrom,
      withTiming(1, { duration: OPENING.creamFor, easing: Easing.out(Easing.quad), reduceMotion: SISTEMA }),
      SISTEMA,
    );
    cabeceo.value = withDelay(
      ESPERA + OPENING.nodFrom,
      withSequence(
        withTiming(NOD_DEGREES, { duration: OPENING.nodFor / 3, reduceMotion: SISTEMA }),
        withTiming(-NOD_DEGREES / 2, { duration: OPENING.nodFor / 3, reduceMotion: SISTEMA }),
        withTiming(0, { duration: OPENING.nodFor / 3, reduceMotion: SISTEMA }),
      ),
      SISTEMA,
    );
    sube.value = withDelay(
      ESPERA + OPENING.riseFrom,
      withTiming(1, { duration: OPENING.riseFor, easing: Easing.bezier(0.2, 0.8, 0.2, 1), reduceMotion: SISTEMA }),
      SISTEMA,
    );
    llegan.value = withDelay(
      ESPERA + OPENING.wordsFrom,
      withTiming(1, { duration: OPENING.wordsFor, easing: Easing.bezier(0.2, 0.8, 0.2, 1), reduceMotion: SISTEMA }),
      SISTEMA,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listo, plays]);

  const logo = useAnimatedStyle(() => ({
    transform: [
      { translateY: sube.value * climb },
      { scale: 1 + sube.value * (settled - 1) },
      { rotate: `${cabeceo.value}deg` },
    ],
  }));
  const fondo = useAnimatedStyle(() => ({
    opacity: interpolate(cuadro.value, [0, 0.4], [0, 1], Extrapolation.CLAMP),
    transform: [{ scale: 0.2 + 0.8 * cuadro.value }],
  }));
  const verde = useAnimatedStyle(() => ({ opacity: 1 - crema.value }));
  const blanca = useAnimatedStyle(() => ({ opacity: crema.value }));
  const arriba = useAnimatedStyle(() => ({
    opacity: llegan.value,
    transform: [{ translateY: (1 - llegan.value) * SIZE.rowGap }],
  }));
  const abajo = useAnimatedStyle(() => ({
    opacity: llegan.value,
    transform: [{ translateY: (1 - llegan.value) * step }],
  }));

  const vaca = { position: 'absolute', left: (SQUARE_SIDE - COW_BOX) / 2, top: (SQUARE_SIDE - COW_BOX) / 2, width: COW_BOX, height: COW_BOX } as const;
  const contar = () => setCargadas((n) => n + 1);

  return (
    <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
      <Animated.View
        accessible={false}
        style={[
          { position: 'absolute', left: width / 2 - SQUARE_SIDE / 2, top: height / 2 - SQUARE_SIDE / 2, width: SQUARE_SIDE, height: SQUARE_SIDE },
          logo,
        ]}
      >
        <Animated.View
          style={[
            { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: SQUARE_SIDE * SQUARE_CORNER, backgroundColor: PALETTE.accion },
            fondo,
          ]}
        />
        <Animated.View style={[vaca, verde]}>
          <Image source={VACA} fadeDuration={0} onLoad={contar} onError={contar} style={{ width: COW_BOX, height: COW_BOX, tintColor: PALETTE.accion }} accessibilityIgnoresInvertColors />
        </Animated.View>
        <Animated.View style={[vaca, blanca]}>
          <Image source={VACA} fadeDuration={0} onLoad={contar} onError={contar} style={{ width: COW_BOX, height: COW_BOX }} accessibilityIgnoresInvertColors />
        </Animated.View>
      </Animated.View>

      <Animated.View style={[{ position: 'absolute', left: step * 1.5, right: step * 1.5, top: restY + SELLO / 2 + SIZE.space * 1.5 }, arriba]}>
        {palabras}
      </Animated.View>

      <Animated.View style={[{ position: 'absolute', left: step * 1.5, right: step * 1.5, bottom: insets.bottom + step * 2 }, abajo]}>
        {botones}
      </Animated.View>
    </View>
  );
}
