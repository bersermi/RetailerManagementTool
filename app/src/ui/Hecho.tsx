// ============================================================================
// THE CARD THAT SAYS A COUNTER'S DOCUMENT IS DONE — *Venta registrada*, *Compra
// registrada*, *Merma registrada*. The owner, 2026-09-21: *"a simple
// confirmation animation if the sale is done."*
//
// ⚠️⚠️ `R14`/`R16`: THREE COPIES, AND ONE HAD MOVED. Round 1 of `8g` gave
// Vender's card `superficie`, an edge and a shadow — the rows had become `fondo`
// and a `fondo` card was words floating on the list, seen on the emulator. Comprar
// and Desperdicio kept the bare `fondo` card. Settled to Vender's (round 4, the
// owner's *"the geometries in common are the same"*), which on Comprar's white
// cards is also the only one that reads as a card at all.
//
// ⚠️⚠️ IT FIRES ON **ENQUEUE**, NEVER ON THE SERVER'S REPLY (C10.3): an
// animation that awaited Postgres would be the offline path looking different in
// the place nobody tests it.
//
// ⚠️ `transform` AND `opacity` ONLY (§2.11), STARTED IN AN EFFECT — on the
// native driver, starting it in the handler that mounts it fails silently. It
// takes no touches: a thumb reaching for the next product must not lose its tap.
//
// ⚠️⚠️ `11.9`: THE CARD IS A STAMP — direction A's word stamp (`brand/mostrador/
// objetos.json`'s *sello · palabra*, his yes at `11.5-i`), pressed with *El sello
// cae* (`movimiento.json`, 260 ms, inside the 300 ms a tap may wait). Two rules in
// `accion` around the word, live text in the headings' face — never baked into a
// picture — the whole turned −4°, its inside white and worn by the specks
// (`motas`, tinted `superficie`). No sheet behind it, no edge, no shadow: the
// stamp is the paper. A note sits under it on a white sheet with a `linea` edge,
// so it reads over Vender's white tiles and the counter's grey alike. The same
// stamp for every word it is given — the three counters', *Ya estás en …* and
// Inicio's *¡Récord de …!* — and every caller's props as they were. On a phone
// set to reduce motion it is simply there, and leaves without fading.
// NO CHECK CAN SEE IT LAND (§2.11): the session's recordings and his look (`R9`).
// ============================================================================

import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';

import { recorrer, useReduceMotion } from '@/lib/movimiento';
import { useDensity } from '@/theme/DensityProvider';
import { ESQUINA } from '@/theme/density';
import { letraEncabezado } from '@/theme/letra';
import { OBJETOS, SELLO, puntosDe, valoresDe } from '@/theme/mostrador';
import { PALETTE } from '@/theme/palette';
import { DONE_HOLD_MS, DONE_NOTE_HOLD_MS, DONE_OUT_MS } from '@/theme/pulse';

/** The specks over the stamp — `brand/mostrador/png/motas.png`, byte for byte. */
const MOTAS = require('@/marca/mostrador/motas.png') as number;

const EN = [...puntosDe(SELLO)];
const OPACIDAD = [...valoresDe(SELLO, 'opacity')];
const ESCALA = [...valoresDe(SELLO, 'scale')];
/** The motion's turn, added to the stamp's resting one. */
const GIRO = valoresDe(SELLO, 'rotate').map((g) => `${g + OBJETOS.palabra.giro}deg`);

export function Hecho({
  shown,
  word,
  onDone,
  note = null,
  lingers = false,
}: {
  shown: boolean;
  word: string;
  onDone: () => void;
  /**
   * ⚠️ `8g`, 2026-10-20: a line under the word, and the confirmation stays long
   * enough to read it — Vender's first sale on a phone (`@/offline/ensenar`).
   */
  note?: string | null;
  /**
   * ⚠️ `8g`, 2026-10-21: the word IS the message — *Ya estás en Abarrotes Ana*
   * on arrival (`@/auth/llegada`) — so it stays as long as a note would.
   */
  lingers?: boolean;
}) {
  const { scale } = useDensity();
  const reduce = useReduceMotion();
  /** The stamp's fall, 0 → 1. */
  const cae = useRef(new Animated.Value(0)).current;
  /** The whole, fading as it leaves. */
  const queda = useRef(new Animated.Value(1)).current;
  // ⚠️ THE CALLER'S `onDone` IS A NEW FUNCTION ON EVERY RENDER (`() => setSold(false)`), and
  // Vender re-renders as the sale empties the cart: kept in a ref, so a re-render never
  // restarts a stamp already falling (seen on the emulator, `11.9`).
  const fin = useRef(onDone);
  fin.current = onDone;

  useEffect(() => {
    if (!shown) return;
    const hold = note === null && !lingers ? DONE_HOLD_MS : DONE_NOTE_HOLD_MS;
    queda.setValue(1);
    cae.setValue(reduce ? 1 : 0);
    const run = reduce
      ? Animated.delay(hold)
      : Animated.sequence([
          recorrer(cae, SELLO),
          Animated.delay(hold),
          Animated.timing(queda, {
            toValue: 0,
            duration: DONE_OUT_MS,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
        ]);
    run.start(({ finished }) => {
      if (!finished) return;
      // ⚠️ LEFT READY FOR THE NEXT ONE — still above, unseen. Left landed, the next sale's
      // stamp showed landed for a frame before it fell (seen on the emulator, `11.9`).
      cae.setValue(0);
      queda.setValue(1);
      fin.current();
    });
    return () => run.stop();
  }, [shown, cae, queda, note, lingers, reduce]);

  if (!shown) return null;

  const p = OBJETOS.palabra;
  const ancho = scale.space * 18;
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}
    >
      <Animated.View style={{ alignItems: 'center', gap: scale.space, opacity: queda }}>
        <Animated.View
          style={{
            opacity: cae.interpolate({ inputRange: EN, outputRange: OPACIDAD }),
            transform: [
              { scale: cae.interpolate({ inputRange: EN, outputRange: ESCALA }) },
              { rotate: cae.interpolate({ inputRange: EN, outputRange: GIRO }) },
            ],
          }}
        >
          <View
            style={{
              maxWidth: ancho,
              padding: p.entre,
              borderWidth: p.bordeFuera,
              borderColor: PALETTE.accion,
              borderRadius: ESQUINA.hoja,
              backgroundColor: PALETTE.superficie,
            }}
          >
            <View
              style={{
                paddingVertical: p.rellenoVertical,
                paddingHorizontal: p.rellenoHorizontal,
                borderWidth: p.bordeDentro,
                borderColor: PALETTE.accion,
                borderRadius: ESQUINA.hoja,
              }}
            >
              <Text style={{ ...letraEncabezado(scale), textAlign: 'center', color: PALETTE.accion }}>{word}</Text>
            </View>
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              <Image
                source={MOTAS}
                tintColor={PALETTE.superficie}
                resizeMode="cover"
                fadeDuration={0}
                style={{ width: '100%', height: '100%' }}
              />
            </View>
          </View>
        </Animated.View>
        {note === null ? null : (
          <View
            style={{
              maxWidth: ancho,
              padding: scale.rowGap,
              borderRadius: ESQUINA.hoja,
              borderWidth: 1,
              borderColor: PALETTE.linea,
              backgroundColor: PALETTE.superficie,
            }}
          >
            <Text style={{ fontSize: scale.smallSize, color: PALETTE.tintaApagada, textAlign: 'center' }}>{note}</Text>
          </View>
        )}
      </Animated.View>
    </View>
  );
}
