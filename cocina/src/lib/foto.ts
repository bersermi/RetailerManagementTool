// ============================================================================
// THE ONE MODULE THAT OPENS THE CAMERA OR THE GALLERY. Plan task `10.5-ii` — her
// cover, her logo and a photo per dish (proposal B, the owner's ruling of
// 2026-11-01). ⚠️ ITS TWIN IS WERA'S `app/src/capture/photo.ts` (`8m`, `8o`): the
// same arrangement and the same reasons, and three differences, each decided:
//
//   1. ⚠️ THE GALLERY TOO (`elegirFoto`): the drawing's *Tomar foto* and *Elegir*,
//      and the row's *"taken or chosen"*. It opens the phone's own picker — Apple's
//      PHPicker and Android's photo picker — which hands over only the photo she
//      picks and asks for NO permission: `photosPermission` stays `false` in
//      `app.json`, and nothing native changes (`expo-image-picker`'s
//      `launchMultiSelectPicker`, read: no editing means PHPicker).
//   2. ANY SHAPE, NOT ONLY A SQUARE: her cover is 16:9 (`@/api/fotos`'s `FORMAS`),
//      its middle cut without asking (`cropFor`), as Wera cuts a product's square.
//   3. ⚠️ THE BYTES COME BACK AS BASE64, from the manipulator itself: Wera reads
//      them with `expo-file-system`, which this app has only as `expo`'s own
//      dependency and never declared — so it is not imported here.
//
// ⚠️ ONE MODULE HOLDS THE NATIVE IMPORTS AND EVERY SCREEN ASKS IT
// (`test/fotos.test.ts` holds that): the permission prompt, the camera, the picker
// and the re-encoding each fail their own way on each platform, and what a
// failure means is decided here, never in a `.tsx` no suite can read.
//
// ⚠️⚠️ EVERY PHOTO IS RE-ENCODED BEFORE IT LEAVES THE PHONE — cut to its shape,
// made smaller and saved as a new JPEG — which also DROPS ITS METADATA: a phone's
// camera or gallery may carry where the photo was taken, and the aviso says Wera
// Cocina never asks for her location. It would be a lie told by a file.
// ============================================================================

import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { FILE_OF, cropFor, pixelsOf, type Archivo, type Forma, type PhotoSize } from '@/api/fotos';

/** JPEG quality after the resize, 0 to 1 — Wera's. */
export const PHOTO_COMPRESS = 0.7;

/**
 * What a tap came to. ⚠️ `cancelada` IS NOT A FAILURE — she closed the camera or
 * the gallery — and `denegada` is said once, in words, by the screen.
 */
export type FotoOutcome =
  | { readonly kind: 'tomada'; readonly archivos: readonly Archivo[] }
  | { readonly kind: 'cancelada' }
  | { readonly kind: 'denegada' }
  | { readonly kind: 'fallo' };

const SIZES: readonly PhotoSize[] = ['grande', 'chica'];

/** *Tomar foto*: the camera, after its permission. */
export async function tomarFoto(forma: Forma): Promise<FotoOutcome> {
  try {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return { kind: 'denegada' };
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 1,
      exif: false,
    });
    return await prepare(result, forma);
  } catch {
    return { kind: 'fallo' };
  }
}

/** *Elegir*: one photo from the phone's own picker, no permission asked. */
export async function elegirFoto(forma: Forma): Promise<FotoOutcome> {
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      allowsMultipleSelection: false,
      quality: 1,
      exif: false,
    });
    return await prepare(result, forma);
  } catch {
    return { kind: 'fallo' };
  }
}

/**
 * The picture she took or chose, as its two files. ⚠️ DRAWN THROUGH `renderAsync`
 * FIRST, so the cut is made on the picture the way it stands rather than the way
 * the sensor stored it (Wera's reason, `8o`).
 */
async function prepare(result: ImagePicker.ImagePickerResult, forma: Forma): Promise<FotoOutcome> {
  if (result.canceled) return { kind: 'cancelada' };
  const asset = result.assets[0];
  if (asset === undefined) return { kind: 'cancelada' };
  const upright = await ImageManipulator.manipulate(asset.uri).renderAsync();
  const framed = await ImageManipulator.manipulate(upright).crop(cropFor(upright.width, upright.height, forma)).renderAsync();
  const archivos: Archivo[] = [];
  for (const size of SIZES) {
    const image = await ImageManipulator.manipulate(framed).resize(pixelsOf(forma, size)).renderAsync();
    const saved = await image.saveAsync({ compress: PHOTO_COMPRESS, format: SaveFormat.JPEG, base64: true });
    if (typeof saved.base64 !== 'string' || saved.base64 === '') return { kind: 'fallo' };
    archivos.push({ name: FILE_OF[size], uri: saved.uri, base64: saved.base64 });
  }
  return { kind: 'tomada', archivos };
}
