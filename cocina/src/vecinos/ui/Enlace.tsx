import { Linking, Pressable, Text } from 'react-native';

import { PALETTE, SIZE } from '@/theme/palette';

// ============================================================================
// A LINK THAT LEAVES THE APP — *Cómo llegar ›* and *Ver en Google Maps ›*.
// ⚠️ ITACATE'S `itacate/src/ui/Enlace.tsx`, COPIED — plan task `10.5-v-c-ii`:
// *Así la ven* and *Ver como la ven* are Itacate's two pages inside Wera Cocina, one
// and the same screen, so this file is Itacate's below its imports, and
// `test/vecinos.test.ts` holds it there code for code. A change is made in Itacate's
// file and copied here in the same PR, or that test is red. Only its imports differ:
// Itacate's parts and words live under `@/vecinos/` and `VECINOS` here.
// ============================================================================

export function Enlace({
  texto,
  ayuda,
  url,
  color = PALETTE.accion,
}: {
  texto: string;
  /** What a screen reader says: where the link goes. */
  ayuda: string;
  url: string;
  color?: string;
}) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={ayuda}
      onPress={() => {
        Linking.openURL(url).catch((falla: unknown) => console.warn(`[enlace] the phone could not open it: ${String(falla)}`));
      }}
      hitSlop={SIZE.rowGap}
      style={({ pressed }) => ({ minHeight: SIZE.tapTarget, justifyContent: 'center', alignSelf: 'flex-start', opacity: pressed ? 0.6 : 1 })}
    >
      <Text style={{ fontSize: SIZE.bodySize, fontWeight: '700', color }}>{texto}</Text>
    </Pressable>
  );
}
