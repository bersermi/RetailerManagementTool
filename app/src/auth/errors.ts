// ============================================================================
// WHAT THE SHOPKEEPER IS TOLD WHEN SIGNING IN FAILS. Plan task 5a-iii-a.
//
// supabase-js reports failures as an `AuthError` carrying a machine `code`
// (`invalid_credentials`, `over_request_rate_limit`) and an ENGLISH `message`.
// Neither is ever put on the screen. The rule this obeys is the owner's, and it
// is older than this task: WE HANDLE THE EDGE CASE, THEY DO NOT — a person
// standing at a counter with a queue does not read "Invalid login credentials"
// and act on it, and a rate-limit code tells them something about our
// infrastructure instead of about their password.
//
// ⚠️ THE MAP'S VALUES ARE KEYS OF `ES.auth.errors`, NOT SENTENCES. That is the
// one structural decision in this file and it is aimed at a defect this
// repository has already shipped once: 5a-ii's F9, where `label: 'Vender'`
// typed in place and `label: ES.tabs.vender` were THE SAME STRING to every
// assertion that looked at the value, so the test whose comment claimed to
// catch a decentralised string could not. A key cannot be typed in place —
// `'La contraseña…'` is not a key of `ES.auth.errors` and TypeScript says so
// (TS2820). The centralisation is enforced by the compiler here rather than by
// a test that reads the source text.
// ============================================================================

import { ES } from '@/strings';

/** The keys of the message table, so the map below cannot hold a sentence. */
export type AuthMessageKey = keyof typeof ES.auth.errors;

/**
 * Supabase's error codes, mapped to what we say instead.
 *
 * ⚠️ THE LIST IS SHORT BECAUSE IT IS THE LIST WE HAVE SEEN, and the fallback is
 * honest rather than inventive. Codes are Supabase's, spelled as it sends them.
 */
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

/**
 * The Spanish sentence for a failure — always one of `ES.auth.errors`, never
 * anything the network said.
 *
 * ⚠️ IT TAKES `unknown` AND NOT `AuthError`. What arrives in a catch block is
 * whatever was thrown, and the case that matters most — the phone being on the
 * wrong side of a dead connection — is a `TypeError: Network request failed`
 * from fetch, which is not an `AuthError` at all. A signature that only
 * admitted Supabase's own type would push that case back to the call site,
 * where it would be handled once and forgotten at the next one.
 */
export function authErrorMessage(error: unknown): string {
  return ES.auth.errors[authErrorKey(error)];
}

/** The key chosen for an error. Exported so the suite can assert the choice. */
export function authErrorKey(error: unknown): AuthMessageKey {
  if (typeof error !== 'object' || error === null) return 'unknown';

  const code = (error as { code?: unknown }).code;
  if (typeof code === 'string' && code in BY_CODE) return BY_CODE[code];

  // ⚠️ OFFLINE IS THE ONE WE CANNOT READ A CODE FOR, AND IT IS THE COMMON ONE.
  // The pilot store loses its connection routinely — offline is the normal
  // write path here, not the exception — so a sign-in attempted with no network
  // must say so rather than fall to "algo salió mal". supabase-js wraps it as
  // `AuthRetryableFetchError`; a bare fetch failure arrives as a `TypeError`
  // whose message names the request. Both are matched, by name and by shape.
  const name = (error as { name?: unknown }).name;
  if (name === 'AuthRetryableFetchError') return 'offline';
  const message = (error as { message?: unknown }).message;
  if (typeof message === 'string' && /network request failed|fetch failed/i.test(message)) {
    return 'offline';
  }

  return 'unknown';
}

/** Every code this file knows, for the suite to walk. Not used by the app. */
export const KNOWN_AUTH_CODES: readonly string[] = Object.keys(BY_CODE);
