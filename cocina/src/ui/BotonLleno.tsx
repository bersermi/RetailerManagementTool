// ============================================================================
// THE FILLED BUTTON. Plan task `10.4b-iii-a`.
//
// ⚠️ WERA'S `BotonLleno` (`app/src/ui/BotonLleno.tsx`) at Wera's normal size:
// `principal` is the one thing a screen is for, `suave` beside it, `discreto` a
// way out (*Cerrar sesión*). `busy` shows a wheel and takes no second tap — a
// second tap is a second round trip. Drawn by every screen of this app.
// ============================================================================

import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';
import { ActivityIndicator, Pressable, Text } from 'react-native';

import { PALETTE, SIZE } from '@/theme/palette';

export function BotonLleno({
  label,
  onPress,
  icon,
  busy = false,
  variante = 'suave',
}: {
  label: string;
  onPress: () => void;
  icon?: ComponentProps<typeof MaterialCommunityIcons>['name'];
  busy?: boolean;
  variante?: 'suave' | 'principal' | 'discreto';
}) {
  const ground =
    variante === 'principal' ? PALETTE.accion : variante === 'discreto' ? PALETTE.superficie : PALETTE.accionSuave;
  const edge = variante === 'discreto' ? PALETTE.linea : PALETTE.accion;
  const ink = variante === 'principal' ? PALETTE.superficie : variante === 'discreto' ? PALETTE.tinta : PALETTE.accion;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: busy }}
      disabled={busy}
      onPress={onPress}
      style={{
        minHeight: SIZE.tapTarget,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SIZE.rowGap,
        paddingHorizontal: SIZE.space,
        borderRadius: SIZE.space / 2,
        borderWidth: 1,
        borderColor: edge,
        backgroundColor: ground,
        opacity: busy ? 0.6 : 1,
      }}
    >
      {busy ? (
        <ActivityIndicator color={ink} />
      ) : icon ? (
        <MaterialCommunityIcons name={icon} size={SIZE.iconSize} color={ink} />
      ) : null}
      <Text style={{ fontSize: SIZE.bodySize, fontWeight: variante === 'principal' ? '700' : '600', color: ink }}>
        {label}
      </Text>
    </Pressable>
  );
}
