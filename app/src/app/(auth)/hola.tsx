import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { writePuerta, type Puerta } from '@/auth/puerta';
import { releaseSplash } from '@/lib/splash';
import { deviceStore } from '@/lib/store';
import { OPENING_KEY, firstTime } from '@/offline/ensenar';
import { ES } from '@/strings';
import {
  COW_BOX,
  NOD_DEGREES,
  OPENING,
  SQUARE_CORNER,
  SQUARE_SIDE,
  settledScale,
} from '@/theme/apertura';
import { useDensity } from '@/theme/DensityProvider';
import { TITULO } from '@/theme/letra';
import { OXIDO_DE_LA_VACA, PALETTE } from '@/theme/palette';
import { Puertas } from '@/ui/Puertas';

const VACA_OXIDO = require('@/marca/vaca-oxido.png') as number;
const VACA_CREMA = require('@/marca/vaca-crema.png') as number;

// ============================================================================
// THE FIRST SCREEN — `8g`, the owner's ruling of 2026-10-21: *"We will do the 2
// door version"*, and his note: *"an animation when opening the app for the
// first time with our cow that turns into the logo in the middle of the
// screen."*
//
// Where `@/auth/guard` sends anyone signed out. The two doors (`@/ui/Puertas`)
// and the way back in; the door she picks is kept on the phone
// (`@/auth/puerta`), so the screen after her account is only her half.
//
// ⚠️ THE OPENING PLAYS ONCE PER PHONE (`OPENING_KEY`), and not at all when the
// phone asks for less motion: then, and every later time, the welcome opens
// settled. Its steps and sizes are `@/theme/apertura`'s, which says why the
// first frame is the native splash's and not the density's.
//
// ⚠️ NO CHECK CAN SEE THE MOTION (`R9`): the emulator and his iPhone are the
// instruments. What is pinned is the geometry (`app/test/apertura.test.ts`).
// ============================================================================
export default function Hola() {
  const { scale } = useDensity();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  // ⚠️ ASKED ONCE PER MOUNT: `firstTime` writes as it answers.
  const [plays] = useState(() => firstTime(deviceStore(), OPENING_KEY));
  // ⚠️ THE TWO PICTURES MUST BE IN BEFORE ANYTHING MOVES — measured: the square
  // grew empty while they loaded. Until then the native splash covers her
  // (`@/lib/splash`), so the first frame she sees is the splash's own.
  const [loaded, setLoaded] = useState(0);
  const ready = loaded >= 2;
  useEffect(() => {
    if (ready) releaseSplash();
  }, [ready]);

  const square = useRef(new Animated.Value(plays ? 0 : 1)).current;
  const cream = useRef(new Animated.Value(plays ? 0 : 1)).current;
  const nod = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(plays ? 0 : 1)).current;
  const doors = useRef(new Animated.Value(plays ? 0 : 1)).current;

  // The logo settles at the density's seal size, a third of the way down.
  const settled = scale.selloSize;
  const restY = insets.top + height * 0.24;
  const climb = restY - height / 2;

  useEffect(() => {
    if (!plays || !ready) return;
    let run: Animated.CompositeAnimation | null = null;
    let cancelled = false;
    void AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduce) => {
        if (cancelled) return;
        if (reduce) {
          for (const v of [square, cream, rise, doors]) v.setValue(1);
          return;
        }
        const native = { useNativeDriver: true } as const;
        run = Animated.parallel([
          Animated.timing(square, {
            toValue: 1,
            delay: OPENING.squareFrom,
            duration: OPENING.squareFor,
            easing: Easing.bezier(0.34, 1.56, 0.64, 1),
            ...native,
          }),
          Animated.timing(cream, {
            toValue: 1,
            delay: OPENING.creamFrom,
            duration: OPENING.creamFor,
            easing: Easing.out(Easing.quad),
            ...native,
          }),
          Animated.sequence([
            Animated.delay(OPENING.nodFrom),
            Animated.timing(nod, { toValue: NOD_DEGREES, duration: OPENING.nodFor / 3, ...native }),
            Animated.timing(nod, { toValue: -NOD_DEGREES / 2, duration: OPENING.nodFor / 3, ...native }),
            Animated.timing(nod, { toValue: 0, duration: OPENING.nodFor / 3, ...native }),
          ]),
          Animated.timing(rise, {
            toValue: 1,
            delay: OPENING.riseFrom,
            duration: OPENING.riseFor,
            easing: Easing.bezier(0.2, 0.8, 0.2, 1),
            ...native,
          }),
          Animated.timing(doors, {
            toValue: 1,
            delay: OPENING.doorsFrom,
            duration: OPENING.doorsFor,
            easing: Easing.bezier(0.2, 0.8, 0.2, 1),
            ...native,
          }),
        ]);
        run.start();
      });
    return () => {
      cancelled = true;
      run?.stop();
    };
  }, [plays, ready, square, cream, nod, rise, doors]);

  function go(puerta: Puerta | null) {
    writePuerta(deviceStore(), puerta);
    router.push(puerta === null ? '/entrar' : { pathname: '/entrar', params: { puerta } });
  }

  const step = scale.space + scale.rowGap;

  return (
    <View style={{ flex: 1, backgroundColor: PALETTE.fondo }}>
      <Animated.View
        style={{
          position: 'absolute',
          left: width / 2 - SQUARE_SIDE / 2,
          top: height / 2 - SQUARE_SIDE / 2,
          width: SQUARE_SIDE,
          height: SQUARE_SIDE,
          transform: [
            { translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [0, climb] }) },
            { scale: rise.interpolate({ inputRange: [0, 1], outputRange: [1, settledScale(settled)] }) },
            { rotate: nod.interpolate({ inputRange: [-90, 90], outputRange: ['-90deg', '90deg'] }) },
          ],
        }}
      >
        <Animated.View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: SQUARE_SIDE * SQUARE_CORNER,
            backgroundColor: OXIDO_DE_LA_VACA,
            opacity: square.interpolate({ inputRange: [0, 0.4], outputRange: [0, 1], extrapolate: 'clamp' }),
            transform: [{ scale: square.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }) }],
          }}
        />
        {[VACA_OXIDO, VACA_CREMA].map((source, i) => (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              left: (SQUARE_SIDE - COW_BOX) / 2,
              top: (SQUARE_SIDE - COW_BOX) / 2,
              width: COW_BOX,
              height: COW_BOX,
              opacity: i === 0 ? cream.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) : cream,
            }}
          >
            <Image
              source={source}
              onLoad={() => setLoaded((n) => n + 1)}
              onError={() => setLoaded((n) => n + 1)}
              style={{ width: COW_BOX, height: COW_BOX }}
              accessibilityIgnoresInvertColors
            />
          </Animated.View>
        ))}
      </Animated.View>

      <Animated.Text
        accessibilityRole="header"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: restY + settled / 2 + scale.space,
          textAlign: 'center',
          fontSize: scale.titleSize + scale.space,
          ...TITULO,
          color: PALETTE.tinta,
          opacity: doors,
          transform: [{ translateY: doors.interpolate({ inputRange: [0, 1], outputRange: [scale.rowGap, 0] }) }],
        }}
      >
        {ES.hola.name}
      </Animated.Text>

      <Animated.View
        style={{
          position: 'absolute',
          left: step * 1.5,
          right: step * 1.5,
          bottom: insets.bottom + step * 2,
          opacity: doors,
          transform: [{ translateY: doors.interpolate({ inputRange: [0, 1], outputRange: [step, 0] }) }],
        }}
      >
        <Puertas onAbrir={() => go('abrir')} onInvitada={() => go('invitada')} onEntrar={() => go(null)} />
      </Animated.View>
    </View>
  );
}
