// ============================================================================
// ⚠️ 11.5-i (never merged): the counter's objects (row 11.2,
// brand/mostrador/objetos.json and movimiento.json), as React Native draws them
// today — views, live text and pictures tinted at runtime.
// ============================================================================
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';

import { useReduceMotion } from '@/lib/movimiento';
import { useDensity } from '@/theme/DensityProvider';
import { encabezado } from '@/theme/letra';
import { PALETTE } from '@/theme/palette';
import { CON_PAPEL, esGrande } from '@/theme/piel';

const PAPEL = require('@/marca/mostrador/mostrador.png') as number;
const PUNTA = require('@/marca/mostrador/punta-etiqueta.png') as number;
const TRAZO = require('@/marca/mostrador/trazo-pestana.png') as number;
const MOTAS = require('@/marca/mostrador/motas.png') as number;

/** The counter's paper: white specks over the ground, never tinted. */
export function Papel() {
  if (!CON_PAPEL) return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Image source={PAPEL} resizeMode="repeat" style={StyleSheet.absoluteFill} />
    </View>
  );
}

/** A price tag: the point in `fondo`, then the price in the phone's face. */
export function Etiqueta({ children, alto }: { children: ReactNode; alto: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'stretch', height: alto }}>
      <Image source={PUNTA} tintColor={PALETTE.fondo} style={{ height: alto, aspectRatio: 0.5 }} />
      <View
        style={{
          marginLeft: -1,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          paddingLeft: 2,
          paddingRight: 8,
          backgroundColor: PALETTE.fondo,
          borderTopRightRadius: 2,
          borderBottomRightRadius: 2,
        }}
      >
        {children}
      </View>
    </View>
  );
}

/** A receipt's foot: turned squares of `superficie`, 12 apart, 6 deep. */
export function Dientes() {
  const [width, setWidth] = useState(0);
  const lado = 12 / Math.SQRT2;
  const n = Math.ceil(width / 12) + 1;
  return (
    <View style={{ height: 6, overflow: 'hidden' }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {Array.from({ length: n }, (_, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: i * 12 + 6 - lado / 2,
            top: -lado / 2,
            width: lado,
            height: lado,
            backgroundColor: PALETTE.superficie,
            transform: [{ rotate: '45deg' }],
          }}
        />
      ))}
    </View>
  );
}

/** The marker's stroke under the active tab's word; an empty space under the others. */
export function Trazo({ on, color }: { on: boolean; color: string }) {
  const { scale } = useDensity();
  const [w, h] = esGrande(scale) ? [40, 6] : [34, 5];
  return <Image source={TRAZO} tintColor={color} style={{ width: w, height: h, marginTop: 1, opacity: on ? 1 : 0 }} />;
}

// *El sello cae* (movimiento.json): 260 ms, scale 1.6 → 0.94 → 1, turn −12 → 2 → 0, opacity 0 → 1.
const SELLO_MS = 260;

/**
 * A stamp with a word: two rules in the ink, the word live in the heading face,
 * the specks in the ground's colour over it, turned −4°, and pressed in.
 */
export function SelloPalabra({ word, ink, suelo, play }: { word: string; ink: string; suelo: string; play: number }) {
  const { scale } = useDensity();
  const reduce = useReduceMotion();
  const t = useRef(new Animated.Value(reduce ? 1 : 0)).current;
  useEffect(() => {
    if (reduce) {
      t.setValue(1);
      return;
    }
    t.setValue(0);
    const run = Animated.sequence([
      Animated.timing(t, { toValue: 0.55, duration: SELLO_MS * 0.55, easing: Easing.bezier(0.5, 0, 0.9, 0.45), useNativeDriver: true }),
      Animated.timing(t, { toValue: 1, duration: SELLO_MS * 0.45, easing: Easing.bezier(0.2, 0.8, 0.3, 1), useNativeDriver: true }),
    ]);
    run.start();
    return () => run.stop();
  }, [play, reduce, t]);
  return (
    <Animated.View
      style={{
        opacity: t.interpolate({ inputRange: [0, 0.55, 1], outputRange: [0, 1, 1] }),
        transform: [
          { scale: t.interpolate({ inputRange: [0, 0.55, 1], outputRange: [1.6, 0.94, 1] }) },
          { rotate: t.interpolate({ inputRange: [0, 0.55, 1], outputRange: ['-16deg', '-2deg', '-4deg'] }) },
        ],
      }}
    >
      <View style={{ borderWidth: 2.5, borderColor: ink, borderRadius: 3, padding: 2 }}>
        <View style={{ borderWidth: 1.5, borderColor: ink, borderRadius: 2, paddingVertical: 4, paddingHorizontal: 10 }}>
          <Text style={{ ...encabezado(scale), color: ink }}>{word}</Text>
        </View>
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Image source={MOTAS} tintColor={suelo} resizeMode="cover" style={StyleSheet.absoluteFill} />
        </View>
      </View>
    </Animated.View>
  );
}
