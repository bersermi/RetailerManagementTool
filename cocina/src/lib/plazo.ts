// ============================================================================
// EVERY REQUEST HAS A TIME LIMIT. Plan task `10.4b-iii-a`.
//
// ⚠️ WERA'S RULE, COPIED (`app/src/lib/plazo.ts`, plan `8g`, whose header has
// the measurements): React Native's Android client sets no timeout at all, so a
// request on a link that dies under it waits for ever — a sign-in that never
// answers looks like a frozen app. Over its limit a request fails as a lost link
// does (`Network request failed`, named `AbortError` so postgrest-js does not
// retry it three more times), and the sentence for a lost link already exists
// (`@/auth/errors`'s `offline`).
//
// The limits are Wera's: 30 s for everything this app sends today, 90 s for a
// photo going up (`10.4b-iv`'s, a fonda's dish). Wera's 60 s catalog read has no
// twin here. ⚠️ PURE, so `test/plazo.test.ts` drives it with a fake `fetch` and
// fake timers; `@/lib/supabase` is the one caller.
// ============================================================================

/** Writes, small reads, the sign-in's renewal. */
export const LIMIT_MS = 30_000;
/** A photo going up. */
export const UPLOAD_LIMIT_MS = 90_000;

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

/** How long one request may take, in milliseconds, by its path and method. */
export function limitFor(input: unknown, method: string | undefined): number {
  const path = pathOf(input);
  const verb = (method ?? 'GET').toUpperCase();
  if (path.startsWith('/storage/v1/object/') && (verb === 'POST' || verb === 'PUT')) return UPLOAD_LIMIT_MS;
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
 * `fetch`, with a time limit on every request. A caller's own `signal` still
 * aborts it (and the failure is the caller's); the timer is cleared the moment
 * the request settles.
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
