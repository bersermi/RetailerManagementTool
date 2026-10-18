// ============================================================================
// A PRODUCT'S PHOTO, LAID OVER ITS INITIALS. Plan task `8o`.
//
// ⚠️⚠️ IT DRAWS NOTHING UNTIL THE FILE IS ON THE PHONE, and that is the whole
// design: every square that wears a product's initials keeps drawing them, and
// this sits on top of them, filling the square, once `usePhoto` has a file. No
// signal, a photo never seen, a photo that failed — the initials are already
// there underneath, so there is no third state and never a broken picture (the
// owner's canvas: *"Nunca una foto rota"*; C8.14: never *pending*).
//
// ⚠️ THE SQUARE IT SITS IN MUST CLIP (`overflow: 'hidden'`), so the photo takes
// the square's rounded corners. Hidden from the screen reader: the row's own
// label already says the product's name.
//
// ⚠️ `fit="contain"` FOR A BAND WIDER THAN IT IS TALL — the mosaic's card, the
// product's page: the square photo stands whole in the middle rather than losing
// its top and bottom, which is where a bottle keeps its cap and its label. The
// band turns white behind it, the plain ground the owner's `LEEME.md` asks every
// photo to have, so the square's edges disappear (seen on the emulator).
// ============================================================================

import { Image, StyleSheet, View } from 'react-native';

import { usePhoto } from '@/api/hooks';
import type { Picture, PhotoSize } from '@/api/photos';
import { PALETTE } from '@/theme/palette';

export function Foto({
  picture,
  size = 'thumb',
  fit = 'cover',
}: {
  picture: Picture | null;
  size?: PhotoSize;
  fit?: 'cover' | 'contain';
}) {
  const uri = usePhoto(picture, size);
  if (uri === null) return null;
  const image = <Image accessible={false} source={{ uri }} resizeMode={fit} style={StyleSheet.absoluteFill} />;
  if (fit === 'cover') return image;
  return <View style={[StyleSheet.absoluteFill, { backgroundColor: PALETTE.superficie }]}>{image}</View>;
}
