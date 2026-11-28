import { useEffect, useRef, type ReactNode } from 'react';
import Animated, {
  Easing,
  ReduceMotion,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { SELLO, TALON, puntosDe, tramosDe, valoresDe, type Movimiento } from '@/theme/movimiento';

// ============================================================================
// THE COUNTER'S MOTIONS — plan task `11.8-ii`, direction A · *Mostrador* (row `11.2`'s
// `brand/mostrador/movimiento.json`, played byte for byte by the design system's *Movimiento*
// card; his yes at `11.5-ii`, 2026-11-26). Two of its four, for Wera Cocina and the neighbours' app:
//   - `Cae` — *El sello cae*: a stamp pressed, from a little above, larger and turned further, a
//     touch too far, then its resting turn. Around her card's cow and *Entregado* (`@/ui/Mostrador`).
//   - `Arranca` — *El talón se arranca*: a ticket's stub swings off about its corner at the
//     perforation and is gone; `onFin` once it has, so its ticket can let it go. ⚠️ EVERY STUB SITS
//     IN ONE, still until `arranca` turns on (found on the emulator): wrapped only as it tore, the
//     stub's contents remounted — her swipe's thumb jumped back to the start as it went.
// ⚠️ ONE FILE IN BOTH SIBLINGS
// (`cocina/src/ui/Movimientos.tsx`, `itacate/src/ui/Movimientos.tsx`):
// `test/movimiento.test.ts` in each holds the two to each other, and the numbers are
// `@/theme/movimiento`'s, held to the file. ⚠️ Each answers something she did — started from an
// effect when it turns on, never on a screen's arrival — and blocks no touch while it plays (`pointerEvents`).
// `transform` and `opacity` only (ADR-035 §2.11); ⚠️ `ReduceMotion.System` on every timing: a phone
// set to reduce motion shows each motion's last keyframe at once. A turn here is ADDED to the
// object's own (a stamp's resting turn is its child's), as the file says. NO CHECK CAN SEE A FRAME
// MOVE (§2.11): the session's recordings and his look are the evidence.
// ============================================================================

const SISTEMA = ReduceMotion.System;

/** A motion as one value running 0 → 1, leg by leg on each leg's curve, after `retraso` ms; `alFin` once it ends. */
function recorrer(m: Movimiento, retraso: number, alFin?: () => void) {
  const tramos = tramosDe(m);
  const pasos = tramos.map((t, i) =>
    withTiming(
      t.hasta,
      { duration: t.duracion, easing: Easing.bezier(t.curva[0], t.curva[1], t.curva[2], t.curva[3]), reduceMotion: SISTEMA },
      i === tramos.length - 1 && alFin !== undefined
        ? (terminado?: boolean) => {
            'worklet';
            if (terminado === true) runOnJS(alFin)();
          }
        : undefined,
    ),
  );
  return withDelay(retraso, withSequence(SISTEMA, ...pasos), SISTEMA);
}

const SELLO_EN = puntosDe(SELLO);
const SELLO_OPACIDAD = valoresDe(SELLO, 'opacity');
const SELLO_ESCALA = valoresDe(SELLO, 'scale');
const SELLO_GIRO = valoresDe(SELLO, 'rotate');

/**
 * *El sello cae* around a stamp. It lands when `cae` turns on (and on its first frame if it is on then), after
 * `retraso` ms — the handover's 40, as the stub lets go. Off, the stamp is simply there.
 */
export function Cae({ cae, retraso = 0, children }: { cae: boolean; retraso?: number; children: ReactNode }) {
  const p = useSharedValue(cae ? 0 : 1);

  useEffect(() => {
    if (!cae) return;
    p.value = 0;
    p.value = recorrer(SELLO, SELLO.retraso + retraso);
    // Only when it turns on: a stamp that landed does not land again on the next render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cae]);

  const estilo = useAnimatedStyle(() => ({
    opacity: interpolate(p.value, SELLO_EN, SELLO_OPACIDAD),
    transform: [{ scale: interpolate(p.value, SELLO_EN, SELLO_ESCALA) }, { rotate: `${interpolate(p.value, SELLO_EN, SELLO_GIRO)}deg` }],
  }));

  return (
    <Animated.View pointerEvents="none" style={[{ transformOrigin: SELLO.origen }, estilo]}>
      {children}
    </Animated.View>
  );
}

const TALON_EN = puntosDe(TALON);
const TALON_OPACIDAD = valoresDe(TALON, 'opacity');
const TALON_X = valoresDe(TALON, 'translateX');
const TALON_Y = valoresDe(TALON, 'translateY');
const TALON_GIRO = valoresDe(TALON, 'rotate');

/**
 * *El talón se arranca* around a stub: still until `arranca` turns on; then it tears, after `retraso` ms, and calls
 * `onFin` once it has gone — at once on a phone set to reduce motion. Nothing in it can be pressed while it goes.
 */
export function Arranca({ arranca, onFin, retraso = 0, children }: { arranca: boolean; onFin: () => void; retraso?: number; children: ReactNode }) {
  const p = useSharedValue(0);
  const fin = useRef(onFin);
  fin.current = onFin;

  useEffect(() => {
    if (!arranca) return;
    const termino = () => fin.current();
    p.value = recorrer(TALON, TALON.retraso + retraso, termino);
    // When it turns on: a stub tears once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arranca]);

  const estilo = useAnimatedStyle(() => ({
    opacity: interpolate(p.value, TALON_EN, TALON_OPACIDAD),
    transform: [
      { translateX: interpolate(p.value, TALON_EN, TALON_X) },
      { translateY: interpolate(p.value, TALON_EN, TALON_Y) },
      { rotate: `${interpolate(p.value, TALON_EN, TALON_GIRO)}deg` },
    ],
  }));

  return (
    <Animated.View pointerEvents={arranca ? 'none' : 'auto'} style={[{ transformOrigin: TALON.origen }, estilo]}>
      {children}
    </Animated.View>
  );
}
