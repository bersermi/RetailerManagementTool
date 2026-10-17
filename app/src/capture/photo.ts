// ============================================================================
// THE ONE MODULE THAT OPENS THE CAMERA. Plan task `8m` — *Te lo compro*'s
// photos of a product, which `0060`'s private bucket `merma` has waited for.
//
// ⚠️⚠️ ONE MODULE HOLDS THE NATIVE IMPORTS AND EVERY SCREEN ASKS IT, `@/export/
// share`'s arrangement and for its reason: `launchCameraAsync`, the permission
// prompt and the resize each fail their own way on each platform, and a screen
// that called them would decide what a failure means inside a `.tsx`, where
// `R9` says no instrument here can look.
//
// ⚠️⚠️ THE DEPENDENCIES ARE NEW AND NO WORKFLOW COMPILES THEM
// ([[no-ci-compiles-the-native-app]]): `expo-image-picker` and
// `expo-image-manipulator` are native modules, so the bound on this file is a
// device build on both platforms, not a green tick — and after it lands no
// over-the-air update reaches a phone that has not installed that build.
//
// ⚠️ THE CAMERA, NEVER THE GALLERY. The owner's canvas draws *📷 Otra foto*, and
// the aviso says Wera asks for the camera only to take a photo for Te lo compro;
// the photo library permission is switched off in `app.json` (`photosPermission:
// false`), and so is the microphone.
//
// ⚠️⚠️ EVERY PHOTO IS RE-ENCODED BEFORE IT LEAVES THE PHONE, FOR TWO REASONS.
// (1) A phone's camera writes four to twelve megapixels, and the pilot store is
// offline a lot; at most `PHOTO_WIDTH` pixels across, a photo is a fraction of
// the upload. (2) **Re-encoding drops the file's metadata**, and on Android the
// system camera app may have written WHERE the photo was taken into it. The
// aviso says Wera does not ask for your location; it would be a lie told by a
// file.
// ============================================================================

import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

/** At most this many pixels across — enough to judge a product by. */
export const PHOTO_WIDTH = 1280;
/** JPEG quality after the resize, 0 to 1. */
export const PHOTO_COMPRESS = 0.7;

export interface TakenPhoto {
  /** A file in the app's cache, already resized and stripped. */
  readonly uri: string;
}

/**
 * What a tap on *Tomar foto* came to. ⚠️ `cancelled` IS NOT A FAILURE — she
 * closed the camera — and `denied` is said once, in words, by the screen.
 */
export type PhotoOutcome =
  | { readonly kind: 'taken'; readonly photo: TakenPhoto }
  | { readonly kind: 'cancelled' }
  | { readonly kind: 'denied' }
  | { readonly kind: 'failed' };

export async function takePhoto(): Promise<PhotoOutcome> {
  try {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return { kind: 'denied' };
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 1,
      exif: false,
    });
    if (result.canceled) return { kind: 'cancelled' };
    const asset = result.assets[0];
    if (asset === undefined) return { kind: 'cancelled' };
    const context = ImageManipulator.manipulate(asset.uri);
    if (asset.width > PHOTO_WIDTH) context.resize({ width: PHOTO_WIDTH });
    const image = await context.renderAsync();
    const saved = await image.saveAsync({ compress: PHOTO_COMPRESS, format: SaveFormat.JPEG });
    return { kind: 'taken', photo: { uri: saved.uri } };
  } catch {
    return { kind: 'failed' };
  }
}

/** The photo's bytes, for the upload. */
export async function photoBytes(photo: TakenPhoto): Promise<Uint8Array> {
  return new File(photo.uri).bytes();
}
