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
// ============================================================================

import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Text, View } from 'react-native';

import { useDensity } from '@/theme/DensityProvider';
import { PALETTE } from '@/theme/palette';
import { DONE_HOLD_MS, DONE_IN_MS, DONE_NOTE_HOLD_MS, DONE_OUT_MS } from '@/theme/pulse';

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
  const bloom = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!shown) return;
    bloom.setValue(0);
    const run = Animated.sequence([
      Animated.timing(bloom, {
        toValue: 1,
        duration: DONE_IN_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.delay(note === null && !lingers ? DONE_HOLD_MS : DONE_NOTE_HOLD_MS),
      Animated.timing(bloom, {
        toValue: 0,
        duration: DONE_OUT_MS,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]);
    run.start(({ finished }) => {
      if (finished) onDone();
    });
    return () => run.stop();
  }, [shown, bloom, onDone, note, lingers]);

  if (!shown) return null;

  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}
    >
      <Animated.View
        style={{
          alignItems: 'center',
          gap: scale.rowGap,
          paddingHorizontal: scale.space * 2,
          paddingVertical: scale.space * 1.5,
          borderRadius: scale.space,
          borderWidth: 1,
          borderColor: PALETTE.linea,
          backgroundColor: PALETTE.superficie,
          // ⚠️ ANDROID'S ELEVATION AND iOS'S SHADOW, the second without an offset:
          // an offset is a literal `R6` refuses.
          elevation: 6,
          shadowColor: PALETTE.velo,
          shadowOpacity: 0.18,
          shadowRadius: scale.space,
          opacity: bloom,
          transform: [{ scale: bloom.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }],
        }}
      >
        <MaterialCommunityIcons name="check-circle-outline" size={scale.iconSize * 2} color={PALETTE.accion} />
        <Text style={{ fontSize: scale.bodySize, fontWeight: '700', color: PALETTE.tinta }}>{word}</Text>
        {note === null ? null : (
          <Text style={{ maxWidth: scale.space * 18, fontSize: scale.smallSize, color: PALETTE.tintaApagada, textAlign: 'center' }}>
            {note}
          </Text>
        )}
      </Animated.View>
    </View>
  );
}
