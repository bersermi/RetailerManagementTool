// ============================================================================
// ONE LABELLED BOX TO TYPE IN. Plan task `10.4b-iii-a`.
//
// ⚠️ WERA'S `Campo` (`app/src/ui/Campo.tsx`, plan `8g`) at Wera's normal size:
// its label always above it, never a placeholder that vanishes as she types,
// and `mostrable` puts an eye beside a password so she can see what she typed
// (Wera's first user could not). `grows` shares a row (*Nombre* · *Apellido*).
// Sign-in draws it now; `10.4b-iii-b`'s kitchen form draws it next.
// ============================================================================

import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useState, type Ref } from 'react';
import { Pressable, Text, TextInput, View, type TextInputProps } from 'react-native';

import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';

export function Campo({
  label,
  ref,
  grows = false,
  mostrable = false,
  ...input
}: TextInputProps & {
  label: string;
  ref?: Ref<TextInput>;
  grows?: boolean;
  mostrable?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const secret = input.secureTextEntry === true && !(mostrable && visible);
  return (
    <View style={{ gap: SIZE.rowGap / 2, flex: grows ? 1 : undefined }}>
      <Text style={{ fontSize: SIZE.smallSize, fontWeight: '600', color: PALETTE.tintaApagada }}>{label}</Text>
      <View style={{ justifyContent: 'center' }}>
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          placeholderTextColor={PALETTE.tintaApagada}
          returnKeyType="done"
          {...input}
          secureTextEntry={secret}
          style={{
            fontSize: SIZE.bodySize,
            minHeight: SIZE.tapTarget,
            borderWidth: 1,
            borderColor: PALETTE.linea,
            borderRadius: SIZE.space * 0.75,
            paddingHorizontal: SIZE.space,
            paddingRight: mostrable ? SIZE.tapTarget + SIZE.space / 2 : SIZE.space,
            backgroundColor: PALETTE.superficie,
            color: PALETTE.tinta,
          }}
        />
        {mostrable ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={visible ? ES.auth.hidePassword : ES.auth.showPassword}
            onPress={() => setVisible((v) => !v)}
            hitSlop={SIZE.rowGap}
            style={{
              position: 'absolute',
              right: 0,
              minWidth: SIZE.tapTarget,
              minHeight: SIZE.tapTarget,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MaterialCommunityIcons
              name={visible ? 'eye-off-outline' : 'eye-outline'}
              size={SIZE.iconSize}
              color={PALETTE.tintaApagada}
            />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
