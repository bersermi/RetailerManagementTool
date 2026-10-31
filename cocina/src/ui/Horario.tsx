// ============================================================================
// WHEN NEIGHBOURS MAY COME — *Desde* and *Hasta*, a quarter of an hour a tap.
// Plan task `10.4b-iv-a`.
//
// ⚠️ EVERY RULE IS `@/lib/ventana`'s: this draws two rows and asks it what a tap
// does and whether a button can be pressed. Moving *Desde* moves *Hasta* with it,
// so the window keeps its length; *Hasta* stops a quarter after *Desde* and
// twelve hours after it. Each tap is judged against the clock at that moment.
// No keyboard, and no native picker — none is in this build.
// ============================================================================

import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, Text, View } from 'react-native';

import { canMoveEnd, canMoveStart, momentOf, moveEnd, moveStart, type Ventana } from '@/lib/ventana';
import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';

type Step = -1 | 1;

export function Horario({
  ventana,
  onChange,
  disabled = false,
}: {
  ventana: Ventana;
  onChange: (move: (v: Ventana) => Ventana) => void;
  disabled?: boolean;
}) {
  const now = new Date();

  const button = (label: string, step: Step, can: boolean, onPress: () => void) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || !can }}
      disabled={disabled || !can}
      onPress={onPress}
      style={{
        width: SIZE.tapTarget,
        height: SIZE.tapTarget,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: SIZE.space * 0.75,
        borderWidth: 1,
        borderColor: can ? PALETTE.accion : PALETTE.linea,
        backgroundColor: can ? PALETTE.accionSuave : PALETTE.superficie,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <MaterialCommunityIcons
        name={step < 0 ? 'minus' : 'plus'}
        size={SIZE.iconSize}
        color={can ? PALETTE.accion : PALETTE.tintaApagada}
      />
    </Pressable>
  );

  const row = (which: string, at: Date, can: (step: Step) => boolean, move: (step: Step) => void) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: SIZE.rowGap }}>
      <Text style={{ width: SIZE.tapTarget + SIZE.space, fontSize: SIZE.bodySize, color: PALETTE.tintaApagada }}>{which}</Text>
      {button(ES.publicar.mover(which, false), -1, can(-1), () => move(-1))}
      <Text
        accessibilityLiveRegion="polite"
        style={{ flex: 1, textAlign: 'center', fontSize: SIZE.bodySize + 2, fontWeight: '700', color: PALETTE.tinta }}
      >
        {momentOf(at, now)}
      </Text>
      {button(ES.publicar.mover(which, true), 1, can(1), () => move(1))}
    </View>
  );

  return (
    <View style={{ gap: SIZE.rowGap }}>
      {row(
        ES.publicar.desde,
        ventana.start,
        (step) => canMoveStart(ventana, step, now),
        (step) => onChange((v) => moveStart(v, step, new Date())),
      )}
      {row(
        ES.publicar.hasta,
        ventana.end,
        (step) => canMoveEnd(ventana, step, now),
        (step) => onChange((v) => moveEnd(v, step, new Date())),
      )}
    </View>
  );
}
