// ============================================================================
// WHAT A NEIGHBOUR IS TOLD WHEN A CALL TO THE DATABASE FAILS. Plan task
// `10.5-iii-b`, the first calls this app makes to it.
//
// ⚠️ WERA'S MAP, COPIED AND CUT TO WHAT THESE CALLS CAN ANSWER
// (`app/src/api/errors.ts`; Wera Cocina's copy is `cocina/src/api/errors.ts`):
// PostgREST and Postgres answer with a code and an ENGLISH message, and neither
// is put on a screen. The values are KEYS of `ES.api.errors`, so a sentence
// cannot be typed in place. A dead connection — the common case — carries no
// code and is read from the error's shape. Her way out reads what goes with her
// account and calls `delete_my_account` (`0073`), which can answer a session
// that is gone (`42501`) or a list that moved (`TD007`, `@/api/account`'s own
// sentence); nothing here writes a business, so Wera Cocina's *only the owner*
// and *check what you typed* have no call to answer them. `test/account.test.ts`
// walks it.
// ============================================================================

import { ES } from '@/strings';

/** The keys of the message table, so the map below cannot hold a sentence. */
export type ApiMessageKey = keyof typeof ES.api.errors;

const BY_CODE: Readonly<Record<string, ApiMessageKey>> = {
  // The session is gone: the one failure with a step she can take.
  '42501': 'sessionEnded',
  PGRST301: 'sessionEnded',
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
