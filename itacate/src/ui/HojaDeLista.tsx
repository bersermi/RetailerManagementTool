import { useEffect, type ReactNode } from 'react';
import { Pressable, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { ReduceMotion, runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { nivelAlSoltar, siguienteAlTocar, type Nivel, type Posiciones } from '@/lib/mapa';
import { ES } from '@/strings';
import { HOJA } from '@/theme/movimiento';
import { PALETTE, SIZE } from '@/theme/palette';

// ============================================================================
// THE LIST, SLIDING OVER THE MAP. Plan task `10.5-iv-b-i`, the owner's answer 4 of
// 2026-11-05 (*"I'd prefer option C"*), as the family-shell page draws *Cerca*'s sheet:
// a handle, the list's head, and the list — full, half-way, or only its head showing.
//
// ⚠️ AS DRAWN: THE HANDLE AND THE HEAD MOVE IT, THE LIST SCROLLS INSIDE IT. A drag on the
// handle or the head follows her finger and lets go at a height (`@/lib/mapa`'s
// `nivelAlSoltar`: a flick goes on, otherwise the nearest); a tap on the handle goes
// half-way, or full from half-way (`siguienteAlTocar`). The list scrolls at every height
// and keeps its pull, so a drag on a card is always the list's — the page's sheet works
// this way, and no gesture fights another.
//
// ⚠️ IT RISES WITH THE PAGE'S SLIGHT SPRING (`@/theme/movimiento`'s `HOJA.resorte`),
// `transform` alone (ADR-035 §2.11), and a phone set to reduce motion sees it arrive at
// once. The drag runs on the UI thread (`react-native-gesture-handler`, Reanimated), in
// Itacate's build since `10.2a` (`libgesturehandler.so` read inside the test build's APK).
//
// ⚠️ ITS GROUND RUNS FROM THE FULL HEIGHT TO THE FOOT OF THE SCREEN AT EVERY HEIGHT, so
// half of it hides below the screen at half-way: the list's foot room is that hidden part
// (`@/lib/mapa`'s `escondido`, the caller's), or its last cards could never scroll into view.
// NO CHECK CAN SEE IT MOVE (§2.11): the phone is the instrument.
// ============================================================================

export function HojaDeLista({
  alto,
  posiciones,
  nivel,
  onNivel,
  onCabeza,
  cabeza,
  children,
}: {
  /** *Cerca*'s height — the sheet runs from its full height to this foot. */
  alto: number;
  posiciones: Posiciones;
  nivel: Nivel;
  onNivel: (nivel: Nivel) => void;
  /** The head's height, measured — it sets how much shows at the lowest height. */
  onCabeza: (alto: number) => void;
  cabeza: ReactNode;
  children: ReactNode;
}) {
  const y = useSharedValue<number>(posiciones[nivel]);
  const desde = useSharedValue(0);
  const { lleno, medio, bajo } = posiciones;

  useEffect(() => {
    y.value = withSpring(posiciones[nivel], { ...HOJA.resorte, reduceMotion: ReduceMotion.System });
    // A height chosen, or the screen measured again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nivel, lleno, medio, bajo]);

  const arrastre = Gesture.Pan()
    .activeOffsetY([-6, 6])
    .onStart(() => {
      desde.value = y.value;
    })
    .onUpdate((e) => {
      y.value = Math.min(bajo, Math.max(lleno, desde.value + e.translationY));
    })
    .onEnd((e) => {
      runOnJS(soltar)(y.value, e.velocityY);
    });

  function soltar(donde: number, velocidad: number) {
    const destino = nivelAlSoltar(donde, velocidad, posiciones);
    // The same height again still has to spring back to it.
    if (destino === nivel) y.value = withSpring(posiciones[destino], { ...HOJA.resorte, reduceMotion: ReduceMotion.System });
    onNivel(destino);
  }

  const estilo = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          height: Math.max(0, alto - lleno),
          backgroundColor: PALETTE.fondo,
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
          shadowColor: PALETTE.tinta,
          shadowOpacity: 0.16,
          shadowRadius: 11,
          shadowOffset: { width: 0, height: -6 },
          elevation: 12,
        },
        estilo,
      ]}
    >
      <GestureDetector gesture={arrastre}>
        <View onLayout={(e: LayoutChangeEvent) => onCabeza(e.nativeEvent.layout.height)}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={nivel === 'lleno' ? ES.mapa.bajar : ES.mapa.subir}
            onPress={() => onNivel(siguienteAlTocar(nivel))}
            style={{ alignItems: 'center', paddingTop: SIZE.rowGap, paddingBottom: 2 }}
            hitSlop={{ top: SIZE.rowGap, bottom: SIZE.rowGap, left: SIZE.space * 4, right: SIZE.space * 4 }}
          >
            <View style={{ width: 42, height: 5, borderRadius: 3, backgroundColor: PALETTE.linea }} />
          </Pressable>
          {cabeza}
        </View>
      </GestureDetector>
      <View style={{ flex: 1 }}>{children}</View>
    </Animated.View>
  );
}
