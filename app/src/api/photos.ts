// ============================================================================
// A PRODUCT'S PICTURE — WHERE IT IS, WHICH ONE A ROW WEARS, AND WHAT IT IS
// CALLED ON THE WIRE AND ON THE PHONE. Plan task `8o`, the owner's rulings of
// 2026-10-17: *"We'll give the photo of existing products, whoever creates a new
// variant/family can provide his own photo or leave the photo with initials.
// Photos stablished by Wera cannot be edited"*.
//
// ⚠️⚠️ TWO KINDS AND TWO BUCKETS (`0063`), AND A ROW CARRIES BOTH COLUMNS:
// `image_path` is the shop's own photo of a product it made, in `producto`;
// `catalog_image_path` is Wera's photo of a starter-catalog product, in
// `catalogo`, reached through the row's `template_code` by a computed column.
// The database never lets a prebuilt row hold the first (`product_variant_wera_
// keeps`), so at most one is ever set — `pictureOf` still says which wins, so a
// phone holding a stale row cannot draw two answers.
//
// ⚠️ A PATH NAMES A PICTURE, NOT A FILE: `<path>/160.jpg` for the lists and
// `<path>/720.jpg` for the product's page and the mosaic, both made on the phone
// that took it (`@/capture/photo`). A new photo is a new path, so a file kept
// on a phone is never stale under its own name — which is what lets the store
// in `@/lib/photoStore` keep a picture for ever without asking again.
//
// ⚠️ R13: every name here is read by `docs/checks/8o-photos-contract.sh`, which
// sends it to a real PostgREST and a real Storage API. A typecheck has never
// read a migration.
// ============================================================================

/** `0063`'s bucket for Wera's photos — every signed-in person reads it. */
export const CATALOG_PHOTO_BUCKET = 'catalogo';
/** `0063`'s bucket for the shop's own — its members read, owner and manager write. */
export const SHOP_PHOTO_BUCKET = 'producto';

/** The shop's own photo, on `product_variant`. */
export const IMAGE_PATH_COLUMN = 'image_path';
/** Wera's, as `0063`'s computed column of `product_variant`. */
export const CATALOG_IMAGE_COLUMN = 'catalog_image_path';

/** Both files are JPEG, whatever the camera wrote. */
export const PRODUCT_PHOTO_TYPE = 'image/jpeg';

/**
 * The two sizes, in pixels on a side — the owner's canvas (*Las fotos · peso y
 * origen*): the small one in every list, the large one on the product's page
 * and in the mosaic, whose card is too wide for 160 px to stay sharp.
 */
export const PHOTO_PX = { thumb: 160, large: 720 } as const;
export type PhotoSize = keyof typeof PHOTO_PX;

/** Where one picture is: a bucket, and the path both of its files sit under. */
export interface Picture {
  readonly bucket: string;
  readonly path: string;
}

/** The two columns as a catalog row carries them. Absent on a row persisted before `8o`. */
export interface PictureColumns {
  readonly image_path?: string | null;
  readonly catalog_image_path?: string | null;
}

function present(text: string | null | undefined): text is string {
  return typeof text === 'string' && text.trim() !== '';
}

/**
 * The picture a row wears, or `null` for its initials (C8.14 — a finished
 * state). ⚠️ THE SHOP'S OWN FIRST: it is the one a person chose for this row.
 */
export function pictureOf(row: PictureColumns): Picture | null {
  if (present(row.image_path)) return { bucket: SHOP_PHOTO_BUCKET, path: row.image_path };
  if (present(row.catalog_image_path)) return { bucket: CATALOG_PHOTO_BUCKET, path: row.catalog_image_path };
  return null;
}

/** One file of a picture, as Storage names it inside its bucket. */
export function photoFile(picture: Picture, size: PhotoSize): string {
  return `${picture.path}/${PHOTO_PX[size]}.jpg`;
}

/** The same file as the phone keeps it — bucket first, so the two kinds never collide. */
export function photoKey(picture: Picture, size: PhotoSize): string {
  return `${picture.bucket}/${photoFile(picture, size)}`;
}

/**
 * Where a new photo of the shop's goes: `<shop>/<uuid>`, which `0063`'s check
 * holds to. ⚠️ LOWER-CASE, because the check compares against `workspace_id::text`
 * and a uuid one platform spells in capitals would be refused 23514.
 */
export function newPhotoPath(workspaceId: string, id: string): string {
  return `${workspaceId.toLowerCase()}/${id.toLowerCase()}`;
}

/** Storage's door for a private object, read with the person's own token. */
export function photoUrl(apiUrl: string, picture: Picture, size: PhotoSize): string {
  return `${apiUrl.replace(/\/+$/, '')}/storage/v1/object/authenticated/${picture.bucket}/${photoFile(picture, size)}`;
}

/** The one-column patch that gives the shop's own product its photo — `null` takes it off. */
export interface ImagePatch {
  readonly image_path: string | null;
}

export function imagePatch(path: string | null): ImagePatch {
  return { [IMAGE_PATH_COLUMN]: path } as ImagePatch;
}
