// ============================================================================
// WHAT THE SHOPKEEPER IS TOLD WHEN A CALL TO POSTGRES FAILS. Plan task 5b-i.
//
// `auth/errors.ts` for the data layer, deliberately the same shape and for the
// same reason: the map's values are KEYS of `ES.api.errors`, never sentences,
// so a message typed in place at a call site is a typecheck failure (TS2820)
// rather than a second copy of a sentence nobody notices drifting. 5a-ii's F9
// is the defect that argument comes from.
//
// ⚠️ THE CODES ARE POSTGRES'S AND POSTGREST'S, AND ALL THREE WERE MEASURED
// against the applied schema on 2026-09-14 rather than recalled:
//
//     23514      check_violation     — `0027` raises it on a blank shop name
//     42501      insufficient_privilege — the grant is to `authenticated`, so
//                this is what an expired or absent session looks like from the
//                other side. HTTP 401.
//     PGRST202   the function was not FOUND — a wrong argument name, 404
//     PGRST301   "JWT cryptographic operation failed" — the token the phone
//                still holds is no longer one this project will accept. 401,
//                and the same sentence as 42501 because it is the same event
//                seen one layer out.
//
// ⚠️⚠️ AND THE THIRD ONE IS NOT A SHOPKEEPER'S PROBLEM, WHICH IS WHY IT MAPS TO
// `unknown` AND LOGS. `PGRST202` means this app and the database disagree about
// what the RPC is called or what its arguments are — a developer's mistake,
// deployed. Dressing it in a helpful Spanish sentence would hide the one class
// of failure that must be fixed rather than retried, so the sentence is the
// honest catch-all and the detail goes to the console, where the only person
// who can act on it is looking. `docs/checks/5b-i-api-contract.sh` is what
// catches it before a phone does.
// ============================================================================

import { ES } from '@/strings';

/** The keys of the message table, so the map below cannot hold a sentence. */
export type ApiMessageKey = keyof typeof ES.api.errors;

const BY_CODE: Readonly<Record<string, ApiMessageKey>> = {
  '23514': 'nameMissing',
  '42501': 'sessionEnded',
  PGRST301: 'sessionEnded',
};

/**
 * The Spanish sentence for a failed call — always one of `ES.api.errors`, never
 * anything PostgREST said.
 */
export function apiErrorMessage(error: unknown): string {
  return ES.api.errors[apiErrorKey(error)];
}

/** The key chosen for an error. Exported so the suite can assert the choice. */
export function apiErrorKey(error: unknown): ApiMessageKey {
  if (typeof error !== 'object' || error === null) return 'unknown';

  const code = (error as { code?: unknown }).code;
  if (typeof code === 'string' && code in BY_CODE) return BY_CODE[code];

  // ⚠️ OFFLINE IS THE COMMON ONE AND IT CARRIES NO CODE. The pilot store loses
  // its connection routinely — offline is the normal write path here, not the
  // exception — so a call attempted with no network must say so rather than
  // fall to the catch-all. Both shapes are matched, by name and by message,
  // exactly as `auth/errors.ts` matches them: supabase-js surfaces a fetch
  // failure as a `TypeError` whose message names the request.
  const name = (error as { name?: unknown }).name;
  if (name === 'AuthRetryableFetchError') return 'offline';
  const message = (error as { message?: unknown }).message;
  if (typeof message === 'string' && /network request failed|fetch failed/i.test(message)) {
    return 'offline';
  }

  return 'unknown';
}

/**
 * Is this the app and the database disagreeing about the shape of an RPC?
 *
 * ⚠️ IT IS SEPARATE FROM THE MESSAGE ON PURPOSE. A shopkeeper is told the same
 * honest nothing either way; this is what `calls.ts` reads to decide whether to
 * put a developer's sentence in the console.
 */
export function isContractMismatch(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const code = (error as { code?: unknown }).code;
  return code === 'PGRST202' || code === 'PGRST204';
}

/** Every code this file knows, for the suite to walk. Not used by the app. */
export const KNOWN_API_CODES: readonly string[] = Object.keys(BY_CODE);
