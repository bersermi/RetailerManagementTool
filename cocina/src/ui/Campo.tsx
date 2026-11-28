// ============================================================================
// ONE LABELLED BOX TO TYPE IN. Plan task `10.4b-iii-a`.
//
// ⚠️ WERA'S `Campo` (`app/src/ui/Campo.tsx`, plan `8g`) at Wera's normal size:
// its label always above it, never a placeholder that vanishes as she types,
// and `mostrable` puts an eye beside a password so she can see what she typed
// (Wera's first user could not). `grows` shares a row (*Nombre* · *Apellido*).
// Sign-in draws it now; `10.4b-iii-b`'s kitchen form draws it next. ⚠️ `10.9m`: `accion` puts one quiet link at the
// label's end (the card's *Condición* · *Quitar*); without it the field is drawn exactly as before.
// ============================================================================

import { Icono } from '@/ui/Icono';
import { useState, type Ref } from 'react';
import { Pressable, Text, TextInput, View, type TextInputProps } from 'react-native';

import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';
import { ESQUINA } from '@/theme/density';

export function Campo({
  label,
  ref,
  grows = false,
  mostrable = false,
  accion = null,
  ...input
}: TextInputProps & {
  label: string;
  ref?: Ref<TextInput>;
  grows?: boolean;
  mostrable?: boolean;
  accion?: { readonly etiqueta: string; readonly onPress: () => void } | null;
}) {
  const [visible, setVisible] = useState(false);
  const secret = input.secureTextEntry === true && !(mostrable && visible);
  return (
    <View style={{ gap: SIZE.rowGap / 2, flex: grows ? 1 : undefined }}>
      {accion === null ? (
        <Text style={{ fontSize: SIZE.smallSize, fontWeight: '600', color: PALETTE.tintaApagada }}>{label}</Text>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SIZE.space }}>
          <Text style={{ fontSize: SIZE.smallSize, fontWeight: '600', color: PALETTE.tintaApagada }}>{label}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={accion.etiqueta} onPress={accion.onPress} hitSlop={SIZE.rowGap}>
            <Text style={{ fontSize: SIZE.smallSize, fontWeight: '600', color: PALETTE.accion }}>{accion.etiqueta}</Text>
          </Pressable>
        </View>
      )}
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
            borderRadius: ESQUINA.campo,
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
            <Icono
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
