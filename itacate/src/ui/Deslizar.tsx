import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { ReduceMotion, runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { alSoltarConfirma } from '@/lib/deslizar';
import { HOJA } from '@/theme/movimiento';
import { PALETTE, SIZE } from '@/theme/palette';

// ============================================================================
// *YA LO TENGO*, A SWIPE. Plan task `10.5b-iii-a`, the family-shell page's stage 2: a
// track with its words, a thumb she drags to the right, the track filling behind it in
// Itacate's blue. A release past `@/lib/deslizar`'s 85 % says it; short of it, the thumb
// springs back.
//
// ⚠️ THE FILL IS A `translateX`, NOT A WIDTH (ADR-035 §2.11, Wera's slide's reasoning): a
// full-width block slid in under `overflow: 'hidden'`, `transform` alone. The drag runs on
// the UI thread (`react-native-gesture-handler`, Reanimated — in Itacate's build since
// `10.2a`, used by the list's sheet since `10.5-iv-b-i`).
// ⚠️ WHAT IT SAYS IS READ THROUGH A REF (Wera's defect of 2026-10-16: a gesture that called
// the handler of the render it was built in). ⚠️ A SCREEN READER CANNOT SWIPE: the track
// carries one action, *Ya lo tengo*, which says it at once. NO CHECK CAN SEE IT MOVE
// (§2.11): the phone is the instrument.
// ============================================================================

const ALTO = SIZE.tapTarget + SIZE.rowGap;
const PULGAR = ALTO - 8;

export function Deslizar({
  texto,
  ayuda,
  accion,
  ocupado = false,
  onListo,
}: {
  /** The words on the track. */
  texto: string;
  /** What a screen reader hears for the whole control. */
  ayuda: string;
  /** The one action a screen reader may take instead of the swipe. */
  accion: string;
  ocupado?: boolean;
  onListo: () => void;
}) {
  const [ancho, setAncho] = useState(0);
  const recorrido = Math.max(0, ancho - PULGAR - 8);
  const x = useSharedValue(0);
  const desde = useSharedValue(0);
  const listo = useRef(onListo);
  listo.current = onListo;

  // Back to the start once a confirmation is no longer under way — refused, or done.
  useEffect(() => {
    if (!ocupado) x.value = withSpring(0, { ...HOJA.resorte, reduceMotion: ReduceMotion.System });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ocupado]);

  function soltar(donde: number) {
    if (alSoltarConfirma(donde, recorrido)) {
      x.value = withSpring(recorrido, { ...HOJA.resorte, reduceMotion: ReduceMotion.System });
      listo.current();
    } else {
      x.value = withSpring(0, { ...HOJA.resorte, reduceMotion: ReduceMotion.System });
    }
  }

  const arrastre = Gesture.Pan()
    .enabled(!ocupado && recorrido > 0)
    .activeOffsetX([-6, 6])
    .onStart(() => {
      desde.value = x.value;
    })
    .onUpdate((e) => {
      x.value = Math.min(recorrido, Math.max(0, desde.value + e.translationX));
    })
    .onEnd(() => {
      runOnJS(soltar)(x.value);
    });

  const estiloPulgar = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const estiloRelleno = useAnimatedStyle(() => ({ transform: [{ translateX: x.value - ancho + PULGAR + 8 }] }));

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={ayuda}
      accessibilityState={{ busy: ocupado }}
      accessibilityActions={[{ name: 'activate', label: accion }]}
      onAccessibilityAction={(evento) => {
        if (evento.nativeEvent.actionName === 'activate' && !ocupado) listo.current();
      }}
      onLayout={(e: LayoutChangeEvent) => setAncho(e.nativeEvent.layout.width)}
      style={{
        height: ALTO,
        borderRadius: ALTO / 2,
        backgroundColor: PALETTE.accionSuave,
        overflow: 'hidden',
        justifyContent: 'center',
      }}
    >
      <Animated.View
        style={[
          { position: 'absolute', left: 0, top: 0, bottom: 0, width: ancho, borderRadius: ALTO / 2, backgroundColor: PALETTE.accion },
          estiloRelleno,
        ]}
      />
      <Text
        numberOfLines={1}
        style={{ textAlign: 'center', paddingHorizontal: PULGAR + SIZE.space, fontSize: SIZE.bodySize - 1, fontWeight: '700', color: PALETTE.accion }}
      >
        {texto}
      </Text>
      <GestureDetector gesture={arrastre}>
        <Animated.View
          style={[
            {
              position: 'absolute',
              left: 4,
              top: 4,
              width: PULGAR,
              height: PULGAR,
              borderRadius: PULGAR / 2,
              backgroundColor: PALETTE.accion,
              alignItems: 'center',
              justifyContent: 'center',
            },
            estiloPulgar,
          ]}
        >
          {ocupado ? (
            <ActivityIndicator color={PALETTE.superficie} />
          ) : (
            <MaterialCommunityIcons name="chevron-double-right" size={SIZE.iconSize + 4} color={PALETTE.superficie} />
          )}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
