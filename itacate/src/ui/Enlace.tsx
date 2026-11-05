import { Linking, Pressable, Text } from 'react-native';

import { PALETTE, SIZE } from '@/theme/palette';

// ============================================================================
// A LINK THAT LEAVES ITACATE — *Cómo llegar ›* and *Ver en Google Maps ›*, both of which
// open Google Maps, in its app when the phone has it, else in the browser. Plan task
// `10.5-iv-a-ii`. ⚠️ The address is `@/lib/paginas`' to build and check; this only
// hands it to the phone. A tap the phone cannot open does nothing, and says so to the log.
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
