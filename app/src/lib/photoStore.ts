// ============================================================================
// WHERE A PRODUCT'S PICTURE IS KEPT ON THE PHONE. Plan task `8o`, and the
// owner's canvas (*Las fotos · peso y origen*): *"Cada foto se baja una vez y se
// queda en el teléfono, y solo las que llegas a ver en la lista. Sin señal se ve
// la que ya tienes; si nunca la viste, sus iniciales. Nunca una foto rota."*
//
// ⚠️⚠️ THE APP'S OWN FOLDER AND NOT AN IMAGE LIBRARY'S CACHE. `expo-image` is in
// the build, but its iOS cache (SDWebImage) drops a file a week after it was
// written, and the pilot store is offline a lot — a week without signal would
// turn every photo back into initials. A file here stays until the app is
// removed; a picture's path changes whenever its photo does (`@/api/photos`), so
// a kept file is never stale and nothing here ever re-checks one.
//
// ⚠️ A DOWNLOAD LANDS UNDER A TEMPORARY NAME AND IS MOVED INTO PLACE, so a
// download cut by the signal never leaves half a JPEG under the real name — the
// file a row would then draw, broken, for ever. And a refused or failed one is
// not asked for again for a minute: a list of a hundred rows re-renders often.
//
// ⚠️ NATIVE (`expo-file-system`), so no suite can load it. What it decides is in
// `@/api/photos`, where `app/test/photos.test.ts` reads it.
// ============================================================================

import { File, Paths } from 'expo-file-system';

const ROOT = 'fotos';
const RETRY_AFTER_MS = 60_000;

const inFlight = new Map<string, Promise<string | null>>();
const failedAt = new Map<string, number>();

function fileFor(key: string): File {
  return new File(Paths.document, ROOT, ...key.split('/'));
}

/** The kept file's address, or `null` when this phone has never had it. */
export function keptPhoto(key: string): string | null {
  try {
    const file = fileFor(key);
    return file.exists ? file.uri : null;
  } catch {
    return null;
  }
}

/** Is it worth asking for now? `false` for a minute after a failed attempt. */
export function mayFetch(key: string, now: number = Date.now()): boolean {
  const last = failedAt.get(key);
  return last === undefined || now - last >= RETRY_AFTER_MS;
}

/**
 * Downloads one file into the store and answers its address, or `null`. One
 * download per key at a time, whoever asks.
 */
export function fetchPhoto(key: string, url: string, headers: Record<string, string>): Promise<string | null> {
  const known = keptPhoto(key);
  if (known !== null) return Promise.resolve(known);
  const running = inFlight.get(key);
  if (running !== undefined) return running;
  const attempt = (async () => {
    try {
      const target = fileFor(key);
      target.parentDirectory.create({ intermediates: true, idempotent: true });
      const part = new File(`${target.uri}.part`);
      if (part.exists) part.delete();
      await File.downloadFileAsync(url, part, { headers, idempotent: true });
      await part.move(target, { overwrite: true });
      failedAt.delete(key);
      return target.uri;
    } catch {
      failedAt.set(key, Date.now());
      return null;
    } finally {
      inFlight.delete(key);
    }
  })();
  inFlight.set(key, attempt);
  return attempt;
}

/**
 * Keeps a photo this phone just TOOK under the key it was uploaded to, so the
 * phone that took it never downloads it back. A failure here costs one
 * download later, nothing else.
 */
export async function keepPhoto(key: string, localUri: string): Promise<void> {
  try {
    const target = fileFor(key);
    target.parentDirectory.create({ intermediates: true, idempotent: true });
    await new File(localUri).copy(target, { overwrite: true });
  } catch {
    // ⚠️ Deliberately silent: the photo is already on the server.
  }
}
