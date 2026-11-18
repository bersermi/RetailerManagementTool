import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';
import { Pressable, Text, View } from 'react-native';

import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';

// ============================================================================
// THE ONE QUIET LINE UNDER THE DAY'S CARD (the family-shell page's `nline`). Plan task `10.9a-iii`,
// the owner's nudges (ruled 2026-11-17): her page's next missing part, or — two weeks in — a feature
// she did not pick; never a counter, at most one on *Hoy*, and which one is `@/lib/empujones`'.
// A glyph, the sentence and a chevron as one door; apart from it, a ✕ — so a tap meant for one
// never lands on the other. What closing means is the screen's. It takes no space of its own:
// a line, under a dashed rule, never a card.
// ============================================================================

export function LineaEmpujon({
  icono,
  texto,
  onPress,
  onCerrar,
}: {
  icono: ComponentProps<typeof MaterialCommunityIcons>['name'];
  texto: string;
  onPress: () => void;
  onCerrar: () => void;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderStyle: 'dashed',
        borderColor: PALETTE.linea,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={texto}
        onPress={onPress}
        style={({ pressed }) => ({
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          gap: SIZE.rowGap,
          minHeight: SIZE.tapTarget,
          paddingLeft: 2,
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <MaterialCommunityIcons name={icono} size={18} color={PALETTE.accion} />
        <Text style={{ flex: 1, fontSize: SIZE.bodySize - 1, lineHeight: 20, fontWeight: '600', color: PALETTE.tinta }}>{texto}</Text>
        <MaterialCommunityIcons name="chevron-right" size={18} color={PALETTE.tintaApagada} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${ES.empujon.quitar}: ${texto}`}
        onPress={onCerrar}
        style={{ width: SIZE.tapTarget, height: SIZE.tapTarget, alignItems: 'center', justifyContent: 'center' }}
      >
        <MaterialCommunityIcons name="close" size={16} color={PALETTE.tintaApagada} />
      </Pressable>
    </View>
  );
}
