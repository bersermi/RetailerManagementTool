import { useState, type ReactNode } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { ESQUINA } from '@/theme/density';
import { letraEncabezado } from '@/theme/letra';
import { PALETTE, SIZE } from '@/theme/palette';

// ============================================================================
// THE COUNTER'S OBJECTS — plan task `11.8-i`, direction A · *Mostrador* (row `11.2`'s objects,
// `brand/mostrador/objetos.json`; his yes at `11.5-ii`, 2026-11-26, as the branch
// `11.5-ii-pantallas-hermanas` drew them). A shape per job: a TICKET is what is handed over or
// kept (her offer, the next handover, an order, her apartado), a STAMP what is earned or done (her
// card's cow, *Entregado*), a TAG a price on a list, the marker's STROKE the tab she is on.
// Drawn as React Native draws today — views, live text, and pictures tinted at runtime
// (`<Image tintColor>`): no build carries an SVG library (`11.12`'s). The pictures are
// `brand/mostrador/png/`'s byte for byte, in `@/marca/mostrador/`; the measures are `OBJETOS`.
//
// ⚠️ ONE FILE IN BOTH SIBLINGS (`cocina/src/ui/Mostrador.tsx` and `itacate/src/ui/Mostrador.tsx`):
// `test/mostrador.test.ts` in each holds the two to each other, the pictures to `brand/`, and
// `OBJETOS` to `objetos.json`. A word is never baked into a picture: it stays the app's string,
// read aloud and sized by the phone. Nothing here moves — the stamp landing and the stub tearing
// are `11.8-ii`'s (`brand/mostrador/movimiento.json`). NO CHECK CAN SEE THESE (ADR-035 §2.11):
// the session's emulator and Simulator shots, and his look, are their evidence.
// ============================================================================

const MUESCA = require('@/marca/mostrador/muesca.png') as number;
const MOTAS = require('@/marca/mostrador/motas.png') as number;
const PUNTA = require('@/marca/mostrador/punta-etiqueta.png') as number;
const TRAZO = require('@/marca/mostrador/trazo-pestana.png') as number;
const VACA = require('@/marca/mostrador/sello-vaca.png') as number;

/** `objetos.json`'s measures, in points — each picture's size is its drawing's. */
export const OBJETOS = {
  /** A ticket's notch: the bite at each end of its band, transparent so the counter shows through. */
  muesca: { ancho: 8, alto: 18 },
  /** The perforation across the band: dashes as views, never `borderStyle: 'dashed'`. */
  perforacion: { raya: 4, hueco: 3, grueso: 1.5 },
  /** Her card's stamp: the Wera cow in its inked double ring (call 9). */
  selloVaca: 32,
  /** A stamp with a word: two rules in the ink, the word live, the whole a little turned. */
  palabra: { bordeFuera: 2.5, entre: 2, bordeDentro: 1.5, rellenoVertical: 4, rellenoHorizontal: 10, giro: -4 },
  /** Each place's resting turn on her card, in degrees — twelve, as many as a card holds (`0085`). */
  giros: [-6, 5, -3, 7, -8, 3, -5, 6, -2, 4, -7, 2],
  /** A price tag: the point half as wide as the tag is tall, 1 point under the price's piece. */
  etiqueta: { proporcion: 0.5, solape: 1, rellenoVertical: 3, rellenoHorizontal: 8 },
  /** The marker's stroke under the tab in use (the siblings have no *Letra grande*: Normal's). */
  trazo: { ancho: 34, alto: 5 },
} as const;

/** The band where a ticket tears: a notch, the perforation across its colour, the notch flipped. */
function Perforacion({ color, raya }: { color: string; raya: string }) {
  const [ancho, setAncho] = useState(0);
  const { raya: largo, hueco, grueso } = OBJETOS.perforacion;
  const rayas = Math.max(0, Math.floor((ancho + hueco) / (largo + hueco)));
  const muesca = { width: OBJETOS.muesca.ancho, height: OBJETOS.muesca.alto };
  return (
    <View style={{ flexDirection: 'row', height: OBJETOS.muesca.alto }}>
      <Image source={MUESCA} tintColor={color} fadeDuration={0} style={muesca} />
      <View
        onLayout={(e) => setAncho(e.nativeEvent.layout.width)}
        style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: hueco, overflow: 'hidden', backgroundColor: color }}
      >
        {Array.from({ length: rayas }, (_, i) => (
          <View key={i} style={{ width: largo, height: grueso, backgroundColor: raya }} />
        ))}
      </View>
      <Image source={MUESCA} tintColor={color} fadeDuration={0} style={[muesca, { transform: [{ scaleX: -1 }] }]} />
    </View>
  );
}

/**
 * A ticket: square corners, its body, and — when it has one — the band where it tears and the stub
 * after it, which holds what she does with it (*Entregar*, *Ya lo tengo*). A ticket with no stub is
 * its body alone. On a white ticket the perforation is `linea`; on her green offer `barraSobreAccion`.
 */
export function Boleto({
  color = PALETTE.superficie,
  raya = PALETTE.linea,
  padding = SIZE.space * 1.25,
  cuerpo,
  talon = null,
}: {
  color?: string;
  raya?: string;
  padding?: number;
  cuerpo: ReactNode;
  talon?: ReactNode;
}) {
  if (talon === null || talon === undefined || talon === false) return <View style={{ padding, borderRadius: ESQUINA.boleto, backgroundColor: color }}>{cuerpo}</View>;
  return (
    <View>
      {/* Each part overlaps the band by a point: views meeting on a fraction of a pixel leave a hairline of the counter (`11.5-ii`). */}
      <View style={{ padding, paddingBottom: padding * 0.75, marginBottom: -1, borderRadius: ESQUINA.boleto, backgroundColor: color }}>{cuerpo}</View>
      <Perforacion color={color} raya={raya} />
      <View
        style={{
          marginTop: -1,
          paddingHorizontal: padding,
          paddingTop: padding * 0.5 + 1,
          paddingBottom: padding * 0.75,
          borderRadius: ESQUINA.boleto,
          backgroundColor: color,
        }}
      >
        {talon}
      </View>
    </View>
  );
}

/** A stamp on her card: the Wera cow in its inked ring, pressed in `tinta`, turned by its place. */
export function SelloVaca({ i, tinta }: { i: number; tinta: string }) {
  const giro = OBJETOS.giros[i % OBJETOS.giros.length];
  return (
    <Image
      source={VACA}
      tintColor={tinta}
      fadeDuration={0}
      accessibilityIgnoresInvertColors
      style={{ width: OBJETOS.selloVaca, height: OBJETOS.selloVaca, transform: [{ rotate: `${giro}deg` }] }}
    />
  );
}

/**
 * A stamp that says what happened — *Entregado*: two rules in its ink, the word live in the
 * headings' face, turned −4°, the specks over it in the colour of the ground it is pressed on.
 */
export function SelloPalabra({ texto, tinta, suelo = PALETTE.superficie }: { texto: string; tinta: string; suelo?: string }) {
  const p = OBJETOS.palabra;
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        padding: p.entre,
        borderWidth: p.bordeFuera,
        borderColor: tinta,
        borderRadius: ESQUINA.hoja,
        transform: [{ rotate: `${p.giro}deg` }],
      }}
    >
      <View style={{ paddingVertical: p.rellenoVertical, paddingHorizontal: p.rellenoHorizontal, borderWidth: p.bordeDentro, borderColor: tinta, borderRadius: ESQUINA.hoja }}>
        <Text style={{ ...letraEncabezado(SIZE), color: tinta }}>{texto}</Text>
      </View>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Image source={MOTAS} tintColor={suelo} resizeMode="cover" fadeDuration={0} style={{ width: '100%', height: '100%' }} />
      </View>
    </View>
  );
}

/**
 * A price tag: the point with its string hole in the counter's grey, then a piece of it holding the
 * price — in the phone's face, as prices in lists stay. Its height is the price's at any text size:
 * the point is stretched to it and keeps its proportion.
 */
export function Etiqueta({ children, color = PALETTE.fondo }: { children: ReactNode; color?: string }) {
  const [alto, setAlto] = useState(0);
  const e = OBJETOS.etiqueta;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'stretch' }} onLayout={(ev) => setAlto(ev.nativeEvent.layout.height)}>
      <Image source={PUNTA} tintColor={color} fadeDuration={0} style={{ height: alto, width: alto * e.proporcion }} />
      <View
        style={{
          marginLeft: -e.solape,
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: e.rellenoVertical,
          paddingLeft: 2,
          paddingRight: e.rellenoHorizontal,
          borderTopRightRadius: ESQUINA.etiqueta,
          borderBottomRightRadius: ESQUINA.etiqueta,
          backgroundColor: color,
        }}
      >
        {children}
      </View>
    </View>
  );
}

/** The marker's stroke under the tab in use; under the others an empty space of its height, so no word moves. */
export function Trazo({ on, color }: { on: boolean; color: string }) {
  return (
    <Image
      source={TRAZO}
      tintColor={color}
      fadeDuration={0}
      style={{ width: OBJETOS.trazo.ancho, height: OBJETOS.trazo.alto, marginTop: 1, opacity: on ? 1 : 0 }}
    />
  );
}
