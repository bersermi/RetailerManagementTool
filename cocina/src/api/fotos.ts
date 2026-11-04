// ============================================================================
// A KITCHEN'S PICTURES — WHERE THEY GO, WHAT THEIR FILES ARE CALLED, AND HOW A
// PHONE ASKS FOR ONE. Plan task `10.5-ii`, on the bucket `0076` made (`10.5-i-a`).
//
// ⚠️ THREE KINDS, ONE SHAPE ON THE WIRE. Her cover, her logo and each dish's photo
// are each a PATH, `<kitchen>/<uuid>`, naming a folder of two files made on the
// phone that took the picture: `720.jpg` and `160.jpg`, the number being the
// picture's SHORTER side in pixels. A square — a logo, a dish — is 720 × 720 and
// 160 × 160, Wera's product photos to the pixel (`app/src/api/photos.ts`, `0063`);
// her cover is 16:9, 1280 × 720 and 284 × 160.
// ⚠️⚠️ ITACATE WILL READ THESE NAMES (`10.5-iv`), and so will every phone that has
// one: a name changed here once kitchens have photos is a photo nobody can find.
//
// ⚠️ A NEW PICTURE IS A NEW PATH, NEVER AN OVERWRITE: `0076` gives the bucket no
// update and no delete policy. The path is made when the photo is taken, so a
// retry after a weak signal uploads to the same path and finds the file already
// there — a 409, which is a success (`alreadyStored`, Wera's, held to Wera's file).
//
// ⚠️ THE FOLDER IS THE KITCHEN'S OWN, IN LOWER CASE: `picture_in_folder` compares
// with `workspace_id::text`, and the bucket's fence reads the first folder — a
// uuid a phone spells in capitals would be refused.
//
// ⚠️ R13: `docs/checks/10.5-i-a-kitchen-photos-contract.sh` reads the bucket and
// the two files' names OUT OF THIS FILE and puts them into a real Storage API.
// ============================================================================

/** `0076`'s bucket: her owner and managers write in her folder; anyone signed in reads it while she exists. */
export const PHOTO_BUCKET = 'cocina';

/** Every file is a JPEG, whatever the camera or the gallery gave. */
export const PHOTO_TYPE = 'image/jpeg';

/** The large file of every picture — its shorter side, 720 px. ⚠️ One line: the contract check reads it. */
export const LARGE_FILE = '720.jpg';
/** The small one — its shorter side, 160 px. */
export const SMALL_FILE = '160.jpg';

/** Each file's shorter side, in pixels: the large one for a page, the small one for a list. */
export const PHOTO_SIDES = { grande: 720, chica: 160 } as const;
export type PhotoSize = keyof typeof PHOTO_SIDES;

/** The file a size is stored as. */
export const FILE_OF: Readonly<Record<PhotoSize, string>> = { grande: LARGE_FILE, chica: SMALL_FILE };

/**
 * Each kind's shape, width to height. ⚠️ THE COVER IS 16:9 — the banner the
 * peers use (the proposals page, 2026-11-01) and what a phone draws across the
 * top of a page; the logo sits in a circle and a dish in a square, as Wera's
 * products do.
 */
export const FORMAS = { portada: [16, 9], logo: [1, 1], platillo: [1, 1] } as const;
export type Forma = keyof typeof FORMAS;

/** A file's pixels: its shorter side is the size's number, the other follows the shape. */
export function pixelsOf(forma: Forma, size: PhotoSize): { readonly width: number; readonly height: number } {
  const [w, h] = FORMAS[forma];
  const side = PHOTO_SIDES[size];
  return w >= h ? { width: Math.round((side * w) / h), height: side } : { width: side, height: Math.round((side * h) / w) };
}

/** Width over height — what a frame drawing the kind is given. */
export function ratioOf(forma: Forma): number {
  const [w, h] = FORMAS[forma];
  return w / h;
}

/**
 * The middle of a picture in a kind's shape, cut without asking — Wera's square
 * (`app/src/capture/photo.ts`), for any shape: one tap, no crop screen to learn,
 * and the preview shows the result at once (the proposals page: *"cropped to
 * the frame for her"*). Whole pixels, inside the picture.
 */
export function cropFor(
  width: number,
  height: number,
  forma: Forma,
): { readonly originX: number; readonly originY: number; readonly width: number; readonly height: number } {
  const ratio = ratioOf(forma);
  if (width / height > ratio) {
    const w = Math.min(width, Math.round(height * ratio));
    return { originX: Math.floor((width - w) / 2), originY: 0, width: w, height };
  }
  const h = Math.min(height, Math.round(width / ratio));
  return { originX: 0, originY: Math.floor((height - h) / 2), width, height: h };
}

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

/** Where a new picture goes: `<kitchen>/<uuid>`, both in lower case. */
export function newPicturePath(kitchenId: string, id: string): string {
  return `${kitchenId.toLowerCase()}/${id.toLowerCase()}`;
}

/**
 * `picture_in_folder`, the database's rule (`0076`): a picture in THIS kitchen's
 * own folder — her id as Postgres writes a uuid, then one lower-case uuid.
 */
export function isPicturePath(path: string, kitchenId: string): boolean {
  if (!new RegExp(`^${UUID}$`).test(kitchenId.toLowerCase())) return false;
  return new RegExp(`^${kitchenId.toLowerCase()}/${UUID}$`).test(path);
}

/** One file of a picture, as Storage names it inside the bucket. */
export function photoFile(path: string, size: PhotoSize): string {
  return `${path}/${FILE_OF[size]}`;
}

/** Storage's door for a private file, opened with the person's own token. */
export function photoUrl(apiUrl: string, path: string, size: PhotoSize): string {
  return `${apiUrl.replace(/\/+$/, '')}/storage/v1/object/authenticated/${PHOTO_BUCKET}/${photoFile(path, size)}`;
}

/** The headers that open it: her session's token, and the project's publishable key. */
export function photoHeaders(token: string, publishableKey: string): Record<string, string> {
  return { Authorization: `Bearer ${token}`, apikey: publishableKey };
}

/**
 * Storage's answer to a file already at that path — the retry of an upload whose
 * first attempt got through. ⚠️ WERA'S `alreadyStored` (`app/src/api/collection.ts`),
 * copied; `test/fotos.test.ts` holds the copy to Wera's file.
 */
export function alreadyStored(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const { statusCode, message } = error as { statusCode?: unknown; message?: unknown };
  if (statusCode === '409' || statusCode === 409) return true;
  return typeof message === 'string' && /already exists|duplicate/i.test(message);
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/**
 * A file's bytes from the base64 the image manipulator hands back — so the bytes
 * reach Storage without a file-system module this app does not declare. Throws on
 * anything that is not base64.
 */
export function bytesOf(base64: string): Uint8Array {
  const clean = base64.replace(/[\r\n\s]/g, '');
  if (clean.length % 4 !== 0 || /[^A-Za-z0-9+/=]/.test(clean) || /=[^=]/.test(clean)) {
    throw new RangeError('not base64');
  }
  const pad = clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0;
  const out = new Uint8Array((clean.length / 4) * 3 - pad);
  let o = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const n =
      (ALPHABET.indexOf(clean[i]) << 18) |
      (ALPHABET.indexOf(clean[i + 1]) << 12) |
      ((clean[i + 2] === '=' ? 0 : ALPHABET.indexOf(clean[i + 2])) << 6) |
      (clean[i + 3] === '=' ? 0 : ALPHABET.indexOf(clean[i + 3]));
    if (o < out.length) out[o++] = (n >> 16) & 0xff;
    if (o < out.length) out[o++] = (n >> 8) & 0xff;
    if (o < out.length) out[o++] = n & 0xff;
  }
  return out;
}

// ----------------------------------------------------------------------------
// A picture, as a form holds it
// ----------------------------------------------------------------------------

/** One file of a photo just taken: its name in the folder, where it sits on this phone, and its bytes. */
export interface Archivo {
  readonly name: string;
  readonly uri: string;
  readonly base64: string;
}

/**
 * What a slot holds: nothing (its default is drawn), a picture already saved, or
 * one taken on this phone and not yet up. ⚠️ THE NEW ONE ALREADY HAS ITS PATH,
 * made when it was taken, so every retry sends the same one.
 */
export type Foto =
  | { readonly kind: 'ninguna' }
  | { readonly kind: 'guardada'; readonly path: string }
  | { readonly kind: 'nueva'; readonly path: string; readonly archivos: readonly Archivo[] };

export type FotoNueva = Extract<Foto, { kind: 'nueva' }>;

export const NINGUNA: Foto = { kind: 'ninguna' };

/** A stored path as a slot holds it; blank or absent is none. */
export function guardada(path: string | null | undefined): Foto {
  return typeof path === 'string' && path.trim() !== '' ? { kind: 'guardada', path } : NINGUNA;
}

/** The path a slot sends, or `null` for none. */
export function pathOf(foto: Foto): string | null {
  return foto.kind === 'ninguna' ? null : foto.path;
}

/** The pictures that must go up before what points at them is saved, each once. */
export function porSubir(fotos: readonly Foto[]): FotoNueva[] {
  const seen = new Set<string>();
  const out: FotoNueva[] = [];
  for (const foto of fotos) {
    if (foto.kind !== 'nueva' || seen.has(foto.path)) continue;
    seen.add(foto.path);
    out.push(foto);
  }
  return out;
}
