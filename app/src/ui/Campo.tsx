// ============================================================================
// A BOX TO TYPE IN, WITH ITS LABEL ABOVE — `8g`, 2026-10-21, for the first
// day's screens: the label small and muted, the box white with a soft edge, the
// shape `Direccion` already draws (the owner's note: regular sizes, Wera's
// styling — the walk found black boxes under body-size labels).
//
// ⚠️ `ref` IS A PROP (React 19), so a screen can move the cursor to the next
// box from the keyboard's own key — the walk counted seven keyboard closes on
// the way to a first sale, because no box led to the next.
// ============================================================================
import type { Ref } from 'react';
import { Text, TextInput, View, type TextInputProps } from 'react-native';

import { useDensity } from '@/theme/DensityProvider';
import { PALETTE } from '@/theme/palette';

export function Campo({
  label,
  ref,
  grows = false,
  ...input
}: TextInputProps & {
  label: string;
  ref?: Ref<TextInput>;
  /** Takes the row's free width, beside another box (Nombre · Apellido). */
  grows?: boolean;
}) {
  const { scale } = useDensity();
  return (
    <View style={{ gap: scale.rowGap / 2, flex: grows ? 1 : undefined }}>
      <Text style={{ fontSize: scale.smallSize, fontWeight: '600', color: PALETTE.tintaApagada }}>
        {label}
      </Text>
      <TextInput
        ref={ref}
        accessibilityLabel={label}
        placeholderTextColor={PALETTE.tintaApagada}
        {...input}
        style={{
          fontSize: scale.bodySize,
          minHeight: scale.tapTarget,
          borderWidth: 1,
          borderColor: PALETTE.linea,
          borderRadius: scale.space * 0.75,
          paddingHorizontal: scale.space,
          backgroundColor: PALETTE.superficie,
          color: PALETTE.tinta,
        }}
      />
    </View>
  );
}
