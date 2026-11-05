// ============================================================================
// A KITCHEN'S PICTURES — WHAT THEIR FILES ARE CALLED, AND HOW A NEIGHBOUR'S PHONE
// ASKS FOR ONE. Plan task `10.5-iv-a-i`, on the bucket `0076` made (`10.5-i-a`).
//
// ⚠️ WERA COCINA'S NAMES, CUT TO READING (`cocina/src/api/fotos.ts`, plan `10.5-ii`,
// whose header says *"ITACATE WILL READ THESE NAMES"*): each picture — her cover,
// her logo, a dish — is a PATH, `<kitchen>/<uuid>`, naming a folder of two JPEGs
// made on the phone that took it, `720.jpg` and `160.jpg`, the number the picture's
// shorter side. A name changed there once kitchens have photos is a photo nobody
// can find, so every block below is that file's, word for word, and
// `test/gemelos.test.ts` holds each one to it.
//
// ⚠️ ANYONE SIGNED IN READS THE BUCKET while the kitchen exists (`0076`'s
// `kitchen_folder_ok`), so a neighbour asks Storage's private door with HER OWN
// session — never a public link, and nothing signed out (ADR-035 §2.7). The token
// is handed in (`@/api/calls`' `photoRequest`).
// ============================================================================

/** `0076`'s bucket: her owner and managers write in her folder; anyone signed in reads it while she exists. */
export const PHOTO_BUCKET = 'cocina';

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

/** Width over height — what a frame drawing the kind is given. */
export function ratioOf(forma: Forma): number {
  const [w, h] = FORMAS[forma];
  return w / h;
}

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

/**
 * `picture_in_folder`, the database's rule (`0076`): a picture in THIS kitchen's
 * own folder — her id as Postgres writes a uuid, then one lower-case uuid.
 * ⚠️ HERE IT DECIDES WHAT IS ASKED FOR: a path the door sends that is not in that
 * kitchen's own folder is drawn as her default and never requested.
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
