import MaterialCommunityIcons from '@/marca/Icono';
import { useEffect } from 'react';
import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native';
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ES } from '@/strings';
import { NOTA } from '@/theme/movimiento';
import { PALETTE, SIZE } from '@/theme/palette';

// ============================================================================
// THE TOAST ITSELF — the family-shell page's `.toast`: a dark strip at the foot, a
// check, what just happened, and *Deshacer* when it can be undone. Plan task
// `10.5-v-c-i`; when it shows and what *Deshacer* does are `@/lib/NotaProvider`'s.
//
// ⚠️ ABOVE THE TAB BAR: it sits the bar's height over the phone's bottom inset, so on
// *Hoy* it never covers *Hoy* or *Mi cocina*, and on a screen pushed over the tabs it
// floats a little higher than it would need to — never under the gesture bar.
// ⚠️ IT RISES 12 PX AS IT FADES IN, ONCE, WHEN IT MOUNTS — `transform` and `opacity`
// only (ADR-035 §2.11), from an effect, and at once on a phone set to reduce motion
// (`@/theme/movimiento`'s `NOTA`). A new toast is a new one (keyed), so it arrives again.
// ⚠️ `10.9a-iii`: A FIRST IS CELEBRATED IN THE SAME STRIP (`festejo`): the kitchen's green, and
// Wera's cream cow (`@/marca/vaca-crema.png`, the opening's, untinted) where the check was.
// ============================================================================

const VACA = require('@/marca/vaca-crema.png') as number;

/** The tab bar's height over the bottom inset — `@/ui/Pestanas`: its padding, the pill, the word. */
const SOBRE_LA_BARRA = 72;

export function Nota({
  texto,
  conDeshacer,
  deshaciendo,
  onDeshacer,
  festejo = false,
}: {
  texto: string;
  conDeshacer: boolean;
  deshaciendo: boolean;
  onDeshacer: () => void;
  festejo?: boolean;
}) {
  const tinta = festejo ? PALETTE.sobreAccion : PALETTE.fondo;
  const deshacerColor = festejo ? PALETTE.sobreAccion : PALETTE.sobreAccionApagada;
  const insets = useSafeAreaInsets();
  const llegada = useSharedValue(0);

  useEffect(() => {
    llegada.value = withTiming(1, { duration: NOTA.duracion, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System });
    // Once, when it mounts: a new toast is a new component (keyed by its provider).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const estilo = useAnimatedStyle(() => ({
    opacity: llegada.value,
    transform: [{ translateY: (1 - llegada.value) * NOTA.distancia }],
  }));

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[{ position: 'absolute', left: SIZE.space, right: SIZE.space, bottom: insets.bottom + SOBRE_LA_BARRA }, estilo]}
    >
      <View
        accessibilityLiveRegion="polite"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: SIZE.space,
          minHeight: SIZE.tapTarget + SIZE.rowGap,
          paddingLeft: SIZE.space,
          paddingRight: conDeshacer ? SIZE.rowGap : SIZE.space,
          borderRadius: SIZE.space,
          backgroundColor: festejo ? PALETTE.accion : PALETTE.tinta,
        }}
      >
        {festejo ? (
          <Image source={VACA} accessibilityIgnoresInvertColors style={{ width: 26, height: 26 }} resizeMode="contain" />
        ) : (
          <MaterialCommunityIcons name="check-circle" size={20} color={PALETTE.sobreAccionApagada} />
        )}
        <Text
          style={{
            flex: 1,
            paddingVertical: SIZE.rowGap,
            fontSize: SIZE.bodySize - 1,
            lineHeight: 20,
            fontWeight: festejo ? '700' : '400',
            color: tinta,
          }}
        >
          {texto}
        </Text>
        {conDeshacer && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={ES.nota.deshacer}
            accessibilityState={{ disabled: deshaciendo }}
            disabled={deshaciendo}
            onPress={onDeshacer}
            hitSlop={SIZE.rowGap}
            style={{ minHeight: SIZE.tapTarget, minWidth: SIZE.tapTarget, justifyContent: 'center', paddingHorizontal: SIZE.rowGap }}
          >
            {deshaciendo ? (
              <ActivityIndicator color={deshacerColor} />
            ) : (
              <Text style={{ fontSize: SIZE.bodySize, fontWeight: '700', color: deshacerColor }}>{ES.nota.deshacer}</Text>
            )}
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}
