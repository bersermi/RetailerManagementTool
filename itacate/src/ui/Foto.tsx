import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';

import type { PhotoSize } from '@/api/fotos';
import { useFotoSource } from '@/api/hooks';

// ============================================================================
// ONE OF A KITCHEN'S PICTURES, LAID OVER ITS DEFAULT. Plan task `10.5-iv-a-i` — a
// dish's photo, her logo. ⚠️ WERA COCINA'S `Foto` (`cocina/src/ui/Foto.tsx`, itself
// Wera's `app/src/ui/Foto.tsx`), cut to pictures already saved, and the design is
// the same: IT DRAWS NOTHING UNTIL THERE IS A PICTURE, and sits on top of the
// slot's default — her trade's drawing on her colour, her initials — which the slot
// already draws underneath. No signal, a picture never seen, one that failed: the
// default shows, so there is never a broken picture (Wera's *"Nunca una foto rota"*).
//
// ⚠️ ONE DIFFERENCE, DECIDED: `memory`, not Wera Cocina's `disk`. A neighbour's
// phone keeps no kitchen's picture after the app closes — so when a kitchen is
// deleted, its photos leave every neighbour's reach at once, as Wera Cocina's
// privacy page promises, and Itacate keeps nothing of any read on the phone.
//
// ⚠️ THE FRAME IT SITS IN MUST CLIP (`overflow: 'hidden'`) so the picture takes
// its rounded corners. Hidden from the screen reader: the card says what it is.
// ============================================================================
export function Foto({ path, cocinaId, size = 'chica' }: { path: string | null; cocinaId: string; size?: PhotoSize }) {
  const source = useFotoSource(path, cocinaId, size);
  if (source === null) return null;
  return (
    <Image
      accessible={false}
      source={source}
      contentFit="cover"
      cachePolicy="memory"
      transition={120}
      style={StyleSheet.absoluteFill}
    />
  );
}
