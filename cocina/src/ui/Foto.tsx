import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';

import type { Foto as Slot, PhotoSize } from '@/api/fotos';
import { useFotoSource } from '@/api/hooks';

// ============================================================================
// A PICTURE OF HERS, LAID OVER ITS DEFAULT. Plan task `10.5-ii` — her cover, her
// logo, a dish's photo. ⚠️ ITS TWIN IS WERA'S `app/src/ui/Foto.tsx` (`8o`), and the
// design is the same: IT DRAWS NOTHING UNTIL THERE IS A PICTURE, and sits on top
// of the slot's default — her trade's drawing on her colour, her initials — which
// the slot already draws underneath. No signal, a picture never seen, one that
// failed: the default shows, so there is no third state and never a broken
// picture (Wera's *"Nunca una foto rota"*).
//
// ⚠️ ONE DIFFERENCE, DECIDED: `expo-image` keeps the file, not `@/lib/photoStore`
// — this app works online (no persisted cache, `cocina/CLAUDE.md`), and a saved
// picture's path never changes, so the library's disk cache is never stale.
//
// ⚠️ THE FRAME IT SITS IN MUST CLIP (`overflow: 'hidden'`) so the picture takes
// its rounded corners. Hidden from the screen reader: the slot's label says it.
// ============================================================================
export function Foto({ foto, size = 'chica' }: { foto: Slot; size?: PhotoSize }) {
  const source = useFotoSource(foto, size);
  if (source === null) return null;
  return (
    <Image
      accessible={false}
      source={source}
      contentFit="cover"
      cachePolicy="disk"
      transition={120}
      style={StyleSheet.absoluteFill}
    />
  );
}
