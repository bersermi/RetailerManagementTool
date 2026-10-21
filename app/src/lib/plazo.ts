// ============================================================================
// EVERY REQUEST HAS A TIME LIMIT. Plan task `8g`, ruled 2026-10-20 by the owner:
// *"Go ahead with the request time limit before the Android users."*
//
// ⚠️⚠️ WHAT WAS WRONG, READ IN REACT NATIVE'S OWN CODE: `OkHttpClientProvider`
// builds Android's client with `connectTimeout`, `readTimeout` and
// `writeTimeout` all ZERO — no limit. A request sent on a link that dies under
// it (a weak signal, a dropped tower, wifi with nothing behind it) can wait for
// ever. Measured the same day on the emulator: a Te lo compro request landed
// and the screen never reached *Solicitud guardada*, because the list's read
// it waited for had hung on such a link. Every request of the app's one
// client — reads, writes, the sign-in's renewal, photo uploads, the Apple
// function — goes through `fetch`, so the limit is put on that `fetch` once
// (`@/lib/supabase`'s `global.fetch`). Photo DOWNLOADS go through Expo's own
// downloader, whose client already gives up after OkHttp's default seconds.
//
// ⚠️⚠️ A REQUEST OVER ITS LIMIT FAILS AS A LOST LINK DOES — its message says
// `Network request failed` — because every layer above already knows what to do
// with one: `@/api/errors` says *Sin conexión a internet*, `auth-js` keeps the
// session (a retryable failure), the outbox puts the write back to `pending`
// for the next drain, and Te lo compro holds its send. A new kind of error would
// be a new branch in each, and a missed one is *Algo salió mal* on a phone with
// a weak signal.
//
// ⚠️⚠️ AND IT IS NAMED `AbortError`, WHICH IS WHAT IT IS — measured on the
// emulator with the gateway paused, the same evening. Named a `TypeError`, the
// limit fired at exactly 30 s and postgrest-js then retried the read three more
// times by itself (1, 2, 4 s apart, 30 s each), and the data library retried
// that chain twice: a hung read took about six minutes to say so. postgrest-js
// never retries an `AbortError`, and `QueryProvider` does not retry a read that
// ran out of time (`isTimedOut`), so a hung read now gives up at its limit — and
// it is read again by itself on the reconnect, the return and the pull.
//
// ⚠️ THE LIMITS ARE MEASURED, NOT ROUND (see `limitFor`). The largest answer the
// app receives is the catalog: 382 KB for 841 products, read off the local
// gateway's log; on a weak 100 kbps link that is about 31 s, so it gets 60 s.
// A photo is resized to 1280 px at JPEG 0.7 (`@/capture/photo`), 150–300 KB,
// and an upload over a weak uplink is slower still: 90 s. Everything else is a
// few kilobytes: 30 s.
//
// ⚠️ PURE, so `app/test/plazo.test.ts` drives it with a fake `fetch` and fake
// timers; `@/lib/supabase` is the one caller.
// ============================================================================

/** Writes, small reads, the sign-in's renewal, the Apple function. */
export const LIMIT_MS = 30_000;

/** The catalog read and the catalog import — the two heavy answers. */
export const LONG_LIMIT_MS = 60_000;

/** A photo going up. */
export const UPLOAD_LIMIT_MS = 90_000;

/** The message a request over its limit fails with — see the header. */
export function timedOutMessage(limitMs: number): string {
  return `Network request failed: no answer in ${Math.round(limitMs / 1000)} s`;
}

/** What a request over its limit fails with: an `AbortError` that reads as a lost link. */
export function timedOutError(limitMs: number): Error {
  const error = new Error(timedOutMessage(limitMs));
  error.name = 'AbortError';
  return error;
}

/**
 * Did this failure come from the limit?
 *
 * ⚠️ BY MESSAGE, because the error that reaches a caller is rarely the one
 * thrown here: postgrest-js reports it as `{ message: 'AbortError: Network
 * request failed: no answer in 30 s' }`, and `@/api/calls` passes that on.
 */
export function isTimedOut(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const message = (error as { message?: unknown }).message;
  return typeof message === 'string' && /network request failed: no answer in \d+ s/i.test(message);
}

/** The path of a request, whatever form `fetch` was handed it in. */
function pathOf(input: unknown): string {
  const raw =
    typeof input === 'string'
      ? input
      : typeof (input as { url?: unknown } | null)?.url === 'string'
        ? (input as { url: string }).url
        : String(input);
  const at = raw.indexOf('://');
  const rest = at === -1 ? raw : raw.slice(raw.indexOf('/', at + 3));
  const query = rest.indexOf('?');
  return query === -1 ? rest : rest.slice(0, query);
}

/**
 * How long one request may take, in milliseconds.
 *
 * ⚠️ BY WHAT IT IS, READ OFF ITS PATH AND METHOD — the client builds both and
 * they are stable: `/storage/v1/object/…` for a photo, `/rest/v1/<table>` and
 * `/rest/v1/rpc/<name>` for the database.
 */
export function limitFor(input: unknown, method: string | undefined): number {
  const path = pathOf(input);
  const verb = (method ?? 'GET').toUpperCase();
  if (path.startsWith('/storage/v1/object/') && (verb === 'POST' || verb === 'PUT')) return UPLOAD_LIMIT_MS;
  if (path === '/rest/v1/product_variant' && verb === 'GET') return LONG_LIMIT_MS;
  if (path === '/rest/v1/rpc/import_catalog') return LONG_LIMIT_MS;
  return LIMIT_MS;
}

type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

/** The two timer calls this needs — injected so the suite can drive the clock. */
export interface Timers {
  readonly set: (run: () => void, ms: number) => unknown;
  readonly clear: (handle: unknown) => void;
}

const REAL_TIMERS: Timers = {
  set: (run, ms) => setTimeout(run, ms),
  clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

/**
 * `fetch`, with a time limit on every request.
 *
 * ⚠️ A CALLER'S OWN `signal` STILL WORKS: aborting it aborts the request, and the
 * failure is the caller's abort, not a timeout. ⚠️ The timer is cleared the
 * moment the request settles — React Native's `fetch` settles once the whole
 * body has arrived, so the limit covers the download too.
 */
export function withLimit(base: Fetch, timers: Timers = REAL_TIMERS): Fetch {
  return (input, init) => {
    const limit = limitFor(input, init?.method);
    const controller = new AbortController();
    const outer = init?.signal ?? null;
    const follow = () => controller.abort();
    if (outer !== null) {
      if (outer.aborted) controller.abort();
      else outer.addEventListener('abort', follow);
    }
    let timedOut = false;
    const timer = timers.set(() => {
      timedOut = true;
      controller.abort();
    }, limit);
    const settle = () => {
      timers.clear(timer);
      outer?.removeEventListener('abort', follow);
    };
    return base(input, { ...init, signal: controller.signal }).then(
      (response) => {
        settle();
        return response;
      },
      (failure: unknown) => {
        settle();
        if (timedOut) throw timedOutError(limit);
        throw failure;
      },
    );
  };
}
