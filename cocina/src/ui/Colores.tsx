import { Pressable, Text, View } from 'react-native';

import { COLORS, type ColorCode } from '@/api/pagina';
import { ES } from '@/strings';
import { HUES } from '@/theme/colores';
import { PALETTE, SIZE } from '@/theme/palette';

// ============================================================================
// *TU COLOR* — the six, each with its name. Plan task `10.5-ii`, proposal B (the
// owner's ruling of 2026-11-01): Chile, Mole, Nopal, Talavera, Cempasúchil and
// Jamaica, codes in the database and hues in `@/theme/colores`.
//
// ⚠️ THREE TO A ROW, EACH NAME UNDER ITS CIRCLE, NOT THE DRAWING'S SIX IN ONE:
// on a phone's width at a size she can read, *Cempasúchil* does not fit a sixth
// of the line (the drawing shrank its labels to 8.5 px). One is always chosen —
// hers, or her trade's until she picks.
// ============================================================================
export function Colores({
  chosen,
  onChoose,
  disabled,
}: {
  chosen: ColorCode;
  onChoose: (color: ColorCode) => void;
  disabled: boolean;
}) {
  const DOT = 34;
  return (
    <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: SIZE.rowGap }}>
      {COLORS.map((code) => {
        const on = code === chosen;
        return (
          <Pressable
            key={code}
            accessibilityRole="radio"
            accessibilityLabel={ES.pagina.colores[code]}
            accessibilityState={{ checked: on, disabled }}
            disabled={disabled}
            onPress={() => onChoose(code)}
            style={{ width: '33.333%', minHeight: SIZE.tapTarget, alignItems: 'center', gap: SIZE.rowGap / 2 }}
          >
            <View
              style={{
                width: DOT + 8,
                height: DOT + 8,
                borderRadius: (DOT + 8) / 2,
                borderWidth: 2,
                borderColor: on ? PALETTE.tinta : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <View style={{ width: DOT, height: DOT, borderRadius: DOT / 2, backgroundColor: HUES[code] }} />
            </View>
            <Text
              numberOfLines={1}
              style={{ fontSize: SIZE.smallSize, fontWeight: on ? '700' : '400', color: on ? PALETTE.tinta : PALETTE.tintaApagada }}
            >
              {ES.pagina.colores[code]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
