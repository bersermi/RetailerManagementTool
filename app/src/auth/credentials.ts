// ============================================================================
// WHAT IS CHECKED BEFORE THE NETWORK IS ASKED. Plan task 5a-iii-a.
//
// Two reasons this is not left to the server, and neither is validation
// theatre. First, the store loses its connection routinely: an empty password
// sent from a shop with no signal fails as "sin conexión", which is true and
// useless. Second, Supabase answers in English with a code — every round trip
// avoided here is one fewer place the mapping in `errors.ts` has to hold.
//
// ⚠️ THE SERVER REMAINS THE AUTHORITY. These rules are a subset of the
// project's Auth settings, deliberately loose: the six-character minimum
// MIRRORS the Supabase default rather than defining it, so a project tightened
// later is enforced by the project, and this file is not a second place the
// rule lives. Anything that passes here can still be refused there, and
// `errors.ts` has `passwordShort` for exactly that.
// ============================================================================

import { ES } from '@/strings';
import type { AuthMessageKey } from '@/auth/errors';

/** Supabase's own default minimum. Mirrored, not owned — see the header. */
export const MIN_PASSWORD_LENGTH = 6;

export type CredentialCheck =
  | { readonly ok: true; readonly email: string; readonly password: string }
  | { readonly ok: false; readonly key: AuthMessageKey; readonly message: string };

/**
 * ⚠️ TRIMMED AND LOWERCASED, AND THE CASE IS THE HALF THAT BITES. A phone
 * keyboard capitalises the first letter of a field by default, so the address
 * typed at sign-up and the one typed a week later differ by one character. The
 * trailing space comes free with the autocomplete bar.
 *
 * ⚠️ WHETHER SUPABASE WOULD ALSO NORMALISE IT IS NOT KNOWN AND IS NOT ASSUMED.
 * It is widely said to treat addresses case-insensitively; that is a claim
 * about somebody else's system and nobody here has measured it. Normalising on
 * this side costs one line and makes the answer not matter — and if the answer
 * is "no", the defect it prevents is two accounts for one shopkeeper, showing
 * up a week later as the app having lost their shop.
 */
export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/** The credentials as they will be sent, or the Spanish reason they will not be. */
export function checkCredentials(rawEmail: string, rawPassword: string): CredentialCheck {
  const email = normalizeEmail(rawEmail);
  // ⚠️ THE PASSWORD IS NOT TRIMMED. A space is a character a person may have
  // chosen on purpose, and silently removing it means the password that was
  // set is not the password that is sent.
  const password = rawPassword;

  if (email === '') return refuse('emailMissing');
  if (!looksLikeEmail(email)) return refuse('emailInvalid');
  if (password === '') return refuse('passwordMissing');
  if (password.length < MIN_PASSWORD_LENGTH) return refuse('passwordShort');

  return { ok: true, email, password };
}

function refuse(key: AuthMessageKey): CredentialCheck {
  return { ok: false, key, message: ES.auth.errors[key] };
}

/**
 * ⚠️ DELIBERATELY CRUDE, AND NOT A VALIDATOR. Something, an `@`, something with
 * a dot in it, no spaces. Every stricter rule in circulation rejects addresses
 * that are legal and in use; the only question worth asking before a round trip
 * is whether this can possibly be an address at all. The server decides.
 */
function looksLikeEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
