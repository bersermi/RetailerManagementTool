// ============================================================================
// EVERY REQUEST HAS A TIME LIMIT. Plan task `10.5-iii-a`.
//
// ⚠️ WERA'S RULE, COPIED (`app/src/lib/plazo.ts`, plan `8g`, whose header has
// the measurements; Wera Cocina's copy is `cocina/src/lib/plazo.ts`): React
// Native's Android client sets no timeout at all, so a request on a link that
// dies under it waits for ever — a sign-in that never answers looks like a
// frozen app. Over its limit a request fails as a lost link does (`Network
// request failed`, named `AbortError` so postgrest-js does not retry it three
// more times), and the sentence for a lost link already exists (`@/auth/errors`'s
// `offline`).
//
// One limit, Wera's 30 s, for everything this app sends: the sign-in, its
// renewal and every read after it. Itacate sends no photo (it carries no
// camera), so Wera's and Wera Cocina's 90 s upload limit has no twin here.
// ⚠️ PURE, so `test/data-layer.test.ts` drives it with a fake `fetch` and fake
// timers; `@/lib/supabase` is the one caller.
// ============================================================================

/** Every request: the sign-in, its renewal, every read. */
export const LIMIT_MS = 30_000;

/** The message a request over its limit fails with. */
export function timedOutMessage(limitMs: number): string {
  return `Network request failed: no answer in ${Math.round(limitMs / 1000)} s`;
}

/** What a request over its limit fails with: an `AbortError` that reads as a lost link. */
export function timedOutError(limitMs: number): Error {
  const error = new Error(timedOutMessage(limitMs));
  error.name = 'AbortError';
  return error;
}

/** Did this failure come from the limit? By message: postgrest-js re-wraps the error. */
export function isTimedOut(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const message = (error as { message?: unknown }).message;
  return typeof message === 'string' && /network request failed: no answer in \d+ s/i.test(message);
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
 * `fetch`, with a time limit on every request. A caller's own `signal` still
 * aborts it (and the failure is the caller's); the timer is cleared the moment
 * the request settles.
 */
export function withLimit(base: Fetch, timers: Timers = REAL_TIMERS): Fetch {
  return (input, init) => {
    const limit = LIMIT_MS;
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
