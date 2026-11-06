import { useEffect, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ES } from '@/strings';
import { TITULO } from '@/theme/letra';
import { HOJA } from '@/theme/movimiento';
import { PALETTE, SIZE } from '@/theme/palette';

// ============================================================================
// A SHEET FROM THE FOOT OF THE SCREEN — ITS NAME, AND ONE CHOICE UNDER IT. Plan task
// `10.5-v-b`: *Ordenar* (the family-shell page draws *Apartar*, *Entregar* and
// *Ordenar* this way; the first two come with `10.5b`).
//
// ⚠️ *SHEET*, THE PAGE'S MOVEMENT: it slides up with a slight spring over a veil that
// fades in — `transform` and `opacity` only (ADR-035 §2.11), the numbers
// `@/theme/movimiento`'s. It leaves at once: a choice made is the list she came for.
// ⚠️ THE SHEET'S GROUND RUNS PAST THE FOOT OF THE SCREEN (`SOBRA`) so the spring's
// overshoot lifts cream, never a gap. ⚠️ A TAP ON THE VEIL, OR ANDROID'S BACK, CLOSES
// IT. NO CHECK CAN SEE IT MOVE (§2.11): the phone is the instrument.
// ============================================================================

/** How far the sheet's ground runs below the screen's foot, in points. */
const SOBRA = 48;

export function Hoja({
  visible,
  titulo,
  onCerrar,
  children,
}: {
  visible: boolean;
  titulo: string;
  onCerrar: () => void;
  children: ReactNode;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onCerrar}
    >
      {visible && (
        <Contenido titulo={titulo} onCerrar={onCerrar}>
          {children}
        </Contenido>
      )}
    </Modal>
  );
}

function Contenido({ titulo, onCerrar, children }: { titulo: string; onCerrar: () => void; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const velo = useSharedValue(0);
  const subida = useSharedValue<number>(HOJA.desde);

  useEffect(() => {
    velo.value = withTiming(1, { duration: HOJA.velo, reduceMotion: ReduceMotion.System });
    subida.value = withSpring(0, { ...HOJA.resorte, reduceMotion: ReduceMotion.System });
    // Once, as the sheet appears.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const estiloVelo = useAnimatedStyle(() => ({ opacity: velo.value * HOJA.veloOpacidad }));
  const estiloHoja = useAnimatedStyle(() => ({ transform: [{ translateY: subida.value }] }));

  return (
    <View style={styles.pantalla}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.velo, estiloVelo]}>
        <Pressable
          style={styles.pantalla}
          accessibilityRole="button"
          accessibilityLabel={ES.hoja.cerrar}
          onPress={onCerrar}
        />
      </Animated.View>
      <Animated.View
        accessibilityViewIsModal
        style={[styles.hoja, { paddingBottom: insets.bottom + SIZE.space * 2 + SOBRA }, estiloHoja]}
      >
        <View style={styles.asa} />
        <Text accessibilityRole="header" style={styles.titulo}>
          {titulo}
        </Text>
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, justifyContent: 'flex-end' },
  velo: { backgroundColor: PALETTE.tinta },
  hoja: {
    marginBottom: -SOBRA,
    backgroundColor: PALETTE.fondo,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: SIZE.space * 1.5,
    paddingTop: SIZE.rowGap,
    gap: SIZE.space,
  },
  asa: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: PALETTE.linea },
  titulo: { fontSize: SIZE.titleSize - 2, ...TITULO, color: PALETTE.tinta },
});
