// ============================================================================
// WHAT A FONDA IS TOLD WHEN A CALL TO THE DATABASE FAILS. Plan task `10.4b-iii-b`,
// the first writes this app makes.
//
// ⚠️ WERA'S MAP, COPIED AND CUT TO WHAT THESE CALLS CAN ANSWER
// (`app/src/api/errors.ts`): PostgREST and Postgres answer with a code and an
// ENGLISH message, and neither is put on a screen. The values are KEYS of
// `ES.api.errors`, so a sentence cannot be typed in place. A dead connection —
// the common case — carries no code and is read from the error's shape.
// `test/registro.test.ts` walks it.
// ============================================================================

import { ES } from '@/strings';

/** The keys of the message table, so the map below cannot hold a sentence. */
export type ApiMessageKey = keyof typeof ES.api.errors;

const BY_CODE: Readonly<Record<string, ApiMessageKey>> = {
  // The session is gone: the one failure with a step she can take.
  '42501': 'sessionEnded',
  PGRST301: 'sessionEnded',
  // ⚠️ *YOU MAY NOT*, NOT *SOMETHING BROKE*: `TD012` from the pin and the address
  // (`0069`, `0072`), and an update that came back with no row (`PGRST116`) from
  // her trade — each means she is not the kitchen's owner. Told *algo salió
  // mal*, she would tap again; told who may, she stops.
  TD012: 'ownerOnly',
  PGRST116: 'ownerOnly',
};

/** The Spanish sentence for a failed call — always one of `ES.api.errors`. */
export function apiErrorMessage(error: unknown): string {
  return ES.api.errors[apiErrorKey(error)];
}

/** The key chosen for an error. Takes `unknown`: a dead link throws a `TypeError`. */
export function apiErrorKey(error: unknown): ApiMessageKey {
  if (typeof error !== 'object' || error === null) return 'unknown';
  const code = (error as { code?: unknown }).code;
  if (typeof code === 'string' && code in BY_CODE) return BY_CODE[code];
  const name = (error as { name?: unknown }).name;
  if (name === 'AuthRetryableFetchError') return 'offline';
  const message = (error as { message?: unknown }).message;
  if (typeof message === 'string' && /network request failed|fetch failed/i.test(message)) return 'offline';
  return 'unknown';
}

/** Every code this file knows, for the suite to walk. */
export const KNOWN_API_CODES: readonly string[] = Object.keys(BY_CODE);
