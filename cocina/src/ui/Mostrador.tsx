// ============================================================================
// ⚠️ 11.5-ii (never merged): the counter's objects (row 11.2, brand/mostrador/objetos.json),
// as React Native draws them today — views, live text and pictures tinted at runtime. Wera's
// twin is 11.5-i's `app/src/ui/Mostrador.tsx`. No paper: his ruling of 2026-11-26.
// ============================================================================
import { useState, type ReactNode } from 'react';
import { Image, Text, View, type ViewStyle } from 'react-native';

import { ENCABEZADO, oracion } from '@/theme/letra';
import { PALETTE } from '@/theme/palette';

const MUESCA = require('@/marca/mostrador/muesca.png') as number;
const PUNTA = require('@/marca/mostrador/punta-etiqueta.png') as number;
const TRAZO = require('@/marca/mostrador/trazo-pestana.png') as number;
const VACA = require('@/marca/mostrador/sello-vaca.png') as number;

/** objetos.json's `sello.giros`: each stamp's resting turn, by its place. */
export const GIROS = [-6, 5, -3, 7, -8, 3, -5, 6, -2, 4, -7, 2];

/** A heading that was a spaced capital: sentence case, in the titles' face (11.1's *Words*). */
export function Encabezado({ texto, color = PALETTE.tinta, style }: { texto: string; color?: string; style?: object }) {
  return (
    <Text accessibilityRole="header" style={[{ ...ENCABEZADO, color }, style]}>
      {oracion(texto)}
    </Text>
  );
}

/**
 * A ticket's band, where it tears: the notch tinted the ticket's colour, a view of that colour holding
 * the perforation's dashes (4 long, 3 apart, 1.5 thick), and the notch flipped. Its bite is transparent.
 */
export function Banda({ color, raya }: { color: string; raya: string }) {
  const [ancho, setAncho] = useState(0);
  const n = Math.max(0, Math.floor((ancho + 3) / 7));
  return (
    <View style={{ flexDirection: 'row', height: 18 }}>
      <Image source={MUESCA} tintColor={color} style={{ width: 8, height: 18 }} fadeDuration={0} />
      <View
        style={{ flex: 1, backgroundColor: color, flexDirection: 'row', alignItems: 'center', gap: 3, overflow: 'hidden', paddingHorizontal: 2 }}
        onLayout={(e) => setAncho(e.nativeEvent.layout.width - 4)}
      >
        {Array.from({ length: n }, (_, i) => (
          <View key={i} style={{ width: 4, height: 1.5, backgroundColor: raya }} />
        ))}
      </View>
      <Image source={MUESCA} tintColor={color} style={{ width: 8, height: 18, transform: [{ scaleX: -1 }] }} fadeDuration={0} />
    </View>
  );
}

/** A ticket: square corners, its body, the band where it tears, and the stub after it. */
export function Boleto({
  color = PALETTE.superficie,
  raya = PALETTE.linea,
  cuerpo,
  talon,
  padding,
  style,
}: {
  color?: string;
  raya?: string;
  cuerpo: ReactNode;
  talon: ReactNode;
  padding: number;
  style?: ViewStyle;
}) {
  return (
    <View style={style}>
      {/* Each part overlaps the band by a point: views meeting on a fractional pixel leave a hairline of the counter. */}
      <View style={{ backgroundColor: color, padding, paddingBottom: padding * 0.75, marginBottom: -1 }}>{cuerpo}</View>
      <Banda color={color} raya={raya} />
      <View style={{ backgroundColor: color, marginTop: -1, paddingHorizontal: padding, paddingTop: padding * 0.5 + 1, paddingBottom: padding * 0.75 }}>{talon}</View>
    </View>
  );
}

/** A stamp on her card: the Wera cow in its inked double ring (call 9), a little turned by its place. */
export function SelloVaca({ i, tinta, lado = 32 }: { i: number; tinta: string; lado?: number }) {
  return (
    <Image
      source={VACA}
      tintColor={tinta}
      fadeDuration={0}
      style={{ width: lado, height: lado, transform: [{ rotate: `${GIROS[i % GIROS.length]}deg` }] }}
    />
  );
}

/** A price tag: the point in the counter's colour, then the price in the phone's face. */
export function Etiqueta({ children, color = PALETTE.fondo }: { children: ReactNode; color?: string }) {
  // Its height is the price's, at any text size: the point is stretched to it and keeps its proportion.
  const [alto, setAlto] = useState(0);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'stretch' }} onLayout={(e) => setAlto(e.nativeEvent.layout.height)}>
      <Image source={PUNTA} tintColor={color} style={{ height: alto, width: alto / 2 }} fadeDuration={0} />
      <View
        style={{
          marginLeft: -1,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          paddingLeft: 2,
          paddingRight: 8,
          backgroundColor: color,
          borderTopRightRadius: 2,
          borderBottomRightRadius: 2,
        }}
      >
        {children}
      </View>
    </View>
  );
}

/** The marker's stroke under the active tab's word; an empty space under the others, so nothing moves. */
export function Trazo({ on, color }: { on: boolean; color: string }) {
  return <Image source={TRAZO} tintColor={color} fadeDuration={0} style={{ width: 34, height: 5, marginTop: 1, opacity: on ? 1 : 0 }} />;
}
