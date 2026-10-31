// ============================================================================
// WHAT HER KITCHEN IS — one choice from the kitchens' own trades. Plan task
// `10.4b-iii-b`.
//
// ⚠️ ONE, NOT SEVERAL: a kitchen's trade is her main giro and only that
// (`workspace.giro_principal`, `0072`) — Wera's shop picks several because they
// bring products; a kitchen's trade brings none. ⚠️ NOTHING IS CHOSEN FOR HER:
// a choice she never made is one she will not re-read (the owner's rule, `8g`:
// a proposal must not look decided). The list is the database's, in its order
// (`kitchen_giros()`); a row the list no longer has is simply not drawn.
// Drawn by the sign-up form and by *Giro y dirección*.
// ============================================================================

import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, Text, View } from 'react-native';

import type { Giro } from '@/api/kitchen';
import { PALETTE, SIZE } from '@/theme/palette';

export function Giros({
  giros,
  chosen,
  onChoose,
  disabled = false,
}: {
  giros: readonly Giro[];
  chosen: string | null;
  onChoose: (code: string) => void;
  disabled?: boolean;
}) {
  return (
    <View accessibilityRole="radiogroup" style={{ gap: SIZE.rowGap }}>
      {giros.map((giro) => {
        const on = giro.code === chosen;
        return (
          <Pressable
            key={giro.code}
            accessibilityRole="radio"
            accessibilityLabel={giro.label}
            accessibilityState={{ checked: on, disabled }}
            disabled={disabled}
            onPress={() => onChoose(giro.code)}
            style={{
              minHeight: SIZE.tapTarget,
              flexDirection: 'row',
              alignItems: 'center',
              gap: SIZE.space,
              paddingHorizontal: SIZE.space,
              borderRadius: SIZE.space * 0.75,
              borderWidth: on ? 2 : 1,
              borderColor: on ? PALETTE.accion : PALETTE.linea,
              backgroundColor: on ? PALETTE.accionSuave : PALETTE.superficie,
            }}
          >
            <MaterialCommunityIcons
              name={on ? 'radiobox-marked' : 'radiobox-blank'}
              size={SIZE.iconSize}
              color={on ? PALETTE.accion : PALETTE.tintaApagada}
            />
            <Text style={{ flexShrink: 1, fontSize: SIZE.bodySize, fontWeight: on ? '700' : '400', color: PALETTE.tinta }}>
              {giro.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
