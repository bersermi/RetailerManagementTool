// ============================================================================
// A BOX TO TYPE IN, WITH ITS LABEL ABOVE — `8g`, 2026-10-21, for the first
// day's screens: the label small and muted, the box white with a soft edge, the
// shape `Direccion` already draws (the owner's note: regular sizes, Wera's
// styling — the walk found black boxes under body-size labels).
//
// ⚠️ `ref` IS A PROP (React 19), so a screen can move the cursor to the next
// box from the keyboard's own key — the walk counted seven keyboard closes on
// the way to a first sale, because no box led to the next.
//
// ⚠️ `8g`, 2026-10-22 — the owner's first user, *"he cannot see what he's typing
// as a password"*, and the owner, *"a keyboard … that has a tick or 'ok' symbol
// to confirm what we just inputted and hide"*: a one-line box now asks for that
// key unless its screen asks for *Siguiente*, and a password box carries
// *Mostrar* / *Ocultar* (`mostrable`), the dots by default.
// ============================================================================
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useState, type Ref } from 'react';
import { Pressable, Text, TextInput, View, type TextInputProps } from 'react-native';

import { ES } from '@/strings';
import { useDensity } from '@/theme/DensityProvider';
import { PALETTE } from '@/theme/palette';

export function Campo({
  label,
  ref,
  grows = false,
  mostrable = false,
  ...input
}: TextInputProps & {
  label: string;
  ref?: Ref<TextInput>;
  /** Takes the row's free width, beside another box (Nombre · Apellido). */
  grows?: boolean;
  /** A password box: a switch beside it shows or hides what she typed. */
  mostrable?: boolean;
}) {
  const { scale } = useDensity();
  const [visible, setVisible] = useState(false);
  const secret = input.secureTextEntry === true && !(mostrable && visible);
  return (
    <View style={{ gap: scale.rowGap / 2, flex: grows ? 1 : undefined }}>
      <Text style={{ fontSize: scale.smallSize, fontWeight: '600', color: PALETTE.tintaApagada }}>
        {label}
      </Text>
      <View style={{ justifyContent: 'center' }}>
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          placeholderTextColor={PALETTE.tintaApagada}
          returnKeyType={input.multiline === true ? undefined : 'done'}
          {...input}
          secureTextEntry={secret}
          style={{
            fontSize: scale.bodySize,
            minHeight: scale.tapTarget,
            borderWidth: 1,
            borderColor: PALETTE.linea,
            borderRadius: scale.space * 0.75,
            paddingHorizontal: scale.space,
            paddingRight: mostrable ? scale.tapTarget + scale.space / 2 : scale.space,
            backgroundColor: PALETTE.superficie,
            color: PALETTE.tinta,
          }}
        />
        {mostrable ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={visible ? ES.auth.hidePassword : ES.auth.showPassword}
            onPress={() => setVisible((v) => !v)}
            hitSlop={scale.rowGap}
            style={{
              position: 'absolute',
              right: 0,
              minWidth: scale.tapTarget,
              minHeight: scale.tapTarget,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MaterialCommunityIcons
              name={visible ? 'eye-off-outline' : 'eye-outline'}
              size={scale.iconSize}
              color={PALETTE.tintaApagada}
            />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
