// ============================================================================
// WHAT A FONDA IS TOLD WHEN SIGNING IN FAILS. Plan task `10.4b-iii-a`.
//
// ⚠️ WERA'S MAP, COPIED (`app/src/auth/errors.ts`, plan `5a-iii-a`): supabase-js
// answers with a machine code and an ENGLISH message, and neither is put on a
// screen. The map's values are KEYS of `ES.auth.errors`, so a sentence cannot be
// typed in place (TS2820). A dead connection — the common case — is read from
// the error's shape, since it carries no code. `test/auth-rules.test.ts`.
// ============================================================================

import { ES } from '@/strings';

/** The keys of the message table, so the map below cannot hold a sentence. */
export type AuthMessageKey = keyof typeof ES.auth.errors;

/** Supabase's error codes, as it sends them, and what is said instead. */
const BY_CODE: Readonly<Record<string, AuthMessageKey>> = {
  invalid_credentials: 'badCredentials',
  user_not_found: 'badCredentials',
  email_address_invalid: 'emailInvalid',
  validation_failed: 'emailInvalid',
  user_already_exists: 'emailTaken',
  email_exists: 'emailTaken',
  weak_password: 'passwordShort',
  email_not_confirmed: 'notConfirmed',
  over_request_rate_limit: 'tooMany',
  over_email_send_rate_limit: 'tooMany',
};

/** The Spanish sentence for a failure — always one of `ES.auth.errors`. */
export function authErrorMessage(error: unknown): string {
  return ES.auth.errors[authErrorKey(error)];
}

/** The key chosen for an error. Takes `unknown`: a dead link throws a `TypeError`, not an `AuthError`. */
export function authErrorKey(error: unknown): AuthMessageKey {
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
export const KNOWN_AUTH_CODES: readonly string[] = Object.keys(BY_CODE);
