import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StatusBar } from 'expo-status-bar';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ES } from '@/strings';
import { PALETTE, SIZE } from '@/theme/palette';

// ============================================================================
// THE BAR OVER *ASÍ LA VEN* AND *VER COMO LA VEN*. Plan task `10.5-v-c-ii`, the
// family-shell page's `prevbar`: dark, an eye, what she is looking at — *Así la ven tus
// vecinos en Itacate*, *Tu página, como la ven tus vecinos* — and *Cerrar*, so the page
// under it, Itacate's to the code, is never mistaken for one she can change. It takes the
// phone's top inset; the page under it is handed none (its route sees to it). ⚠️ THE PHONE'S
// CLOCK AND SIGNAL TURN LIGHT WHILE IT IS UP — the root keeps them dark on the app's cream
// (`app/_layout.tsx`), which on this ink would hide them (seen on the emulator); the root's
// style comes back when the preview closes.
// ============================================================================

export function BarraVista({ texto, onCerrar }: { texto: string; onCerrar: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: SIZE.rowGap,
        paddingTop: insets.top + SIZE.rowGap,
        paddingBottom: SIZE.rowGap,
        paddingHorizontal: SIZE.space,
        backgroundColor: PALETTE.tinta,
      }}
    >
      <StatusBar style="light" />
      <MaterialCommunityIcons name="eye-outline" size={18} color={PALETTE.superficie} />
      <Text style={{ flex: 1, fontSize: SIZE.smallSize, fontWeight: '600', color: PALETTE.superficie }}>{texto}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={ES.vista.cerrar}
        onPress={onCerrar}
        hitSlop={SIZE.rowGap}
        style={({ pressed }) => ({
          minHeight: 32,
          justifyContent: 'center',
          paddingHorizontal: SIZE.space - 2,
          borderRadius: SIZE.rowGap,
          backgroundColor: PALETTE.superficie,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Text style={{ fontSize: SIZE.smallSize, fontWeight: '700', color: PALETTE.tinta }}>{ES.vista.cerrar}</Text>
      </Pressable>
    </View>
  );
}
