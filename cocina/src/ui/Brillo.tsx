import { useEffect, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { BRILLO } from '@/theme/movimiento';
import { PALETTE, SIZE } from '@/theme/palette';
import { ESQUINA } from '@/theme/density';

// ============================================================================
// *PUBLICAR* GLOWS — A RING OF THE GREEN SPREADING FROM THE BUTTON AND FADING, TWICE. Plan task
// `10.9a-iii`, the owner's nudges (ruled 2026-11-17): until her first offer, *Publicar* glows once
// each time she opens the app, on her first three days without one (`@/lib/empujones`' `brilla`).
// The family-shell page's `breath`, a spreading shadow — drawn here as a ring behind the button,
// grown and faded — a halo of the green, as the shadow spreads there — because a shadow is not a compositor property (ADR-035 §2.11: `transform` and
// `opacity` only, which `test/pestanas.test.ts` holds every animated style to).
//
// ⚠️ IT PLAYS WHEN `activo` TURNS ON AND AGAIN EACH TIME `vez` CHANGES — the moment the app came
// to the front (`useAlAbrir`) — never on a re-render. ⚠️ STARTED FROM AN EFFECT, once the ring is
// measured: a value animated before its view is mounted is dropped in silence (Wera's lesson,
// `app/src/ui/Destello.tsx`). ⚠️ AT REST THE RING IS AT ITS END — spread and invisible — so nothing
// shows before the first pulse or after the last, and a phone set to reduce motion (`ReduceMotion.
// System`) never sees it. NO CHECK CAN SEE A FRAME MOVE: the phone is the instrument.
// ============================================================================


export function Brillo({ activo, vez, children }: { activo: boolean; vez: number; children: ReactNode }) {
  const [tam, setTam] = useState<{ readonly ancho: number; readonly alto: number } | null>(null);
  const pulso = useSharedValue(1);
  const medido = tam !== null;
  const sx = tam === null ? 1 : 1 + (2 * BRILLO.alcance) / Math.max(1, tam.ancho);
  const sy = tam === null ? 1 : 1 + (2 * BRILLO.alcance) / Math.max(1, tam.alto);

  useEffect(() => {
    if (!activo || !medido) return;
    pulso.value = withDelay(
      BRILLO.retraso,
      withRepeat(
        withSequence(
          withTiming(0, { duration: 0, reduceMotion: ReduceMotion.System }),
          withTiming(1, { duration: BRILLO.duracion, easing: Easing.out(Easing.quad), reduceMotion: ReduceMotion.System }),
        ),
        BRILLO.veces,
        false,
        undefined,
        ReduceMotion.System,
      ),
      ReduceMotion.System,
    );
    // Each open, and when it turns on — not on every frame of the screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activo, vez, medido]);

  const estilo = useAnimatedStyle(() => ({
    opacity: (1 - pulso.value) * BRILLO.opacidad,
    transform: [{ scaleX: 1 + pulso.value * (sx - 1) }, { scaleY: 1 + pulso.value * (sy - 1) }],
  }));

  return (
    <View onLayout={(e) => setTam({ ancho: e.nativeEvent.layout.width, alto: e.nativeEvent.layout.height })}>
      <Animated.View
        pointerEvents="none"
        style={[
          { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: ESQUINA.boton, backgroundColor: PALETTE.accion },
          estilo,
        ]}
      />
      {children}
    </View>
  );
}
