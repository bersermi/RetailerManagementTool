// ============================================================================
// THE EMPTYING QUESTION AND ITS ANSWER — a centred box with its own scrim, the
// owner's specification of 2026-09-24: *"¿Seguro de que quieres vaciar el
// carrito? Si, vaciar / Cancelar."* Asked from the bar while the Carrito is
// closed and from inside the Carrito while it is open; each counter owns ONE
// `asking`/`emptied` state, so the two places can never disagree.
//
// ⚠️⚠️ `R14`/`R16`, AND THE DRIFT WAS SETTLED BY A RULING, NOT A COUNT. Three
// copies: Vender's carried round 1's line under the question (*Se quitan los N
// productos*, `8g` 2026-10-15) and `Frase`/`Boton`; Comprar's and Desperdicio's
// did not. Two against one — but Vender's is the version the owner ruled on, and
// round 4 is his *"the geometries in common are the same."* So Comprar and
// Desperdicio gain the line. Said in the status log by name.
//
// ⚠️ `Cancelar` IS THE QUIET BUTTON AND `Sí, vaciar` THE SOLID RED ONE — *option
// 2* (`8g`, 2026-10-16): the destructive answer solid, the way out quiet.
//
// ⚠️ THE ANSWER IS A BLOOM — `opacity` and `scale` only (§2.11), driven by the
// counter's own effect on the native driver, and it carries a word: motion with
// no language is a state a person misses by looking away.
// ============================================================================

import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Animated, Text, View } from 'react-native';

import { ES } from '@/strings';
import { useDensity } from '@/theme/DensityProvider';
import { PALETTE } from '@/theme/palette';
import { Boton } from '@/ui/Boton';
import { BotonLleno } from '@/ui/BotonLleno';
import { Frase } from '@/ui/Frase';
import { Velo } from '@/ui/Velo';

export function VaciarCarrito({
  asking,
  emptied,
  bloom,
  count,
  correcting = null,
  onConfirm,
  onCancel,
}: {
  asking: boolean;
  emptied: boolean;
  bloom: Animated.Value;
  /** How many lines *Sí, vaciar* takes. */
  count: number;
  /**
   * ⚠️ `8g` (2026-10-20): when the cart is a CORRECTION, which document it is
   * (*Esta venta*) — the box then says the original is already gone and asks in
   * the owner's words (*¿Vaciar la corrección?*). `null` for an ordinary cart.
   */
  correcting?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { scale } = useDensity();
  if (!asking && !emptied) return null;

  return (
    <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}>
      <Velo />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: scale.space * 2 }}>
        <View
          style={{
            width: '100%',
            // ⚠️ NO `maxWidth` — `R6`: a cap in points is a size `Letra grande`
            // cannot change; the wrapper's padding keeps the box off the edges.
            borderRadius: scale.space,
            backgroundColor: PALETTE.fondo,
            padding: scale.space * 1.5,
            gap: scale.space,
          }}
        >
          {emptied ? (
            <View style={{ alignItems: 'center', gap: scale.rowGap, padding: scale.space * 2 }}>
              <Animated.View
                style={{
                  opacity: bloom,
                  transform: [{ scale: bloom.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }],
                  alignItems: 'center',
                  gap: scale.rowGap,
                }}
              >
                <MaterialCommunityIcons name="check-circle-outline" size={scale.iconSize * 2} color={PALETTE.accion} />
                <Text style={{ fontSize: scale.bodySize, fontWeight: '600', color: PALETTE.tinta }}>
                  {ES.counter.cart.emptied}
                </Text>
              </Animated.View>
            </View>
          ) : (
            <>
              <Frase text={correcting === null ? ES.counter.cart.emptyAsk : ES.counter.cart.correctionAsk} />
              {correcting !== null ? (
                <Text style={{ fontSize: scale.smallSize, color: PALETTE.tintaApagada, textAlign: 'center' }}>
                  {ES.counter.cart.correctionGone(correcting)}
                </Text>
              ) : count > 0 ? (
                <Text style={{ fontSize: scale.smallSize, color: PALETTE.tintaApagada, textAlign: 'center' }}>
                  {ES.counter.cart.emptyCount(count)}
                </Text>
              ) : null}
              <View style={{ gap: scale.rowGap }}>
                <Boton
                  label={correcting === null ? ES.counter.cart.emptyConfirm : ES.counter.cart.correctionConfirm}
                  tone={PALETTE.error}
                  onPress={onConfirm}
                  lleno
                />
                <BotonLleno
                  label={correcting === null ? ES.counter.cart.emptyCancel : ES.counter.cart.correctionKeep}
                  onPress={onCancel}
                  variante="discreto"
                />
              </View>
            </>
          )}
        </View>
      </View>
    </View>
  );
}
