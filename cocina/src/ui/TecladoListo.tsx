// ============================================================================
// *Listo*, ABOVE THE NUMBER PAD. Plan task `10.4b-iii-b` — the postal code's.
//
// ⚠️ WERA'S `TecladoListo`, COPIED (`app/src/ui/TecladoListo.tsx`, plan `5g-ii`,
// whose header has the reasons): `keyboardType="number-pad"` draws no return key
// on an iPhone, so without this bar she cannot put the keyboard away. iOS only —
// `InputAccessoryView` does not exist on Android, whose keyboard draws its own.
// Mount it once, outside any branch: it renders into the keyboard.
// ============================================================================

import { InputAccessoryView, Keyboard, Platform, Pressable, Text, View } from 'react-native';

import { PALETTE, SIZE } from '@/theme/palette';

export function TecladoListo({ padId, label }: { padId: string; label: string }) {
  if (Platform.OS !== 'ios') return null;
  return (
    <InputAccessoryView nativeID={padId}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'flex-end',
          paddingHorizontal: SIZE.space,
          borderTopWidth: 1,
          borderTopColor: PALETTE.linea,
          backgroundColor: PALETTE.banda,
        }}
      >
        <Pressable
          accessibilityRole="button"
          onPress={() => Keyboard.dismiss()}
          style={{ minHeight: SIZE.tapTarget, justifyContent: 'center', paddingHorizontal: SIZE.space }}
        >
          <Text style={{ fontSize: SIZE.bodySize, fontWeight: '700', color: PALETTE.accion }}>{label}</Text>
        </Pressable>
      </View>
    </InputAccessoryView>
  );
}
