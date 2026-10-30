// ============================================================================
// WHAT IS CHECKED BEFORE THE NETWORK IS ASKED. Plan task `10.4b-iii-a`.
//
// ⚠️ WERA'S RULES, COPIED (`app/src/auth/credentials.ts`, plans `5a-iii-a`,
// `5b.7` and `5R-d-iii`, whose header carries the reasons): the address trimmed
// and lower-cased (a keyboard capitalises the first letter, and two spellings
// would be two accounts), the password never trimmed, Supabase's six-character
// minimum mirrored and not owned; and on *Crear cuenta* only, a name in two
// required boxes — Spanish names do not split on a space — and the aviso ticked.
//
// ⚠️⚠️ `FULL_NAME_KEY` IS THE ONE SPELLING EVERY WAY IN SHARES: Google writes the
// name there, Wera's email sign-up writes it there, and the database copies it
// onto her membership when she makes her kitchen (`auth_full_name`, `0034`). The
// same login is used in both apps, so this app writes the same key, and
// `docs/checks/10.4b-iii-a-cocina-contract.sh` reads it out of this file.
// ============================================================================

import type { AuthMessageKey } from '@/auth/errors';
import { ES } from '@/strings';

/** Supabase's own default minimum. Mirrored, not owned. */
export const MIN_PASSWORD_LENGTH = 6;

/** The metadata key a person's name is stored under — Google's spelling. */
export const FULL_NAME_KEY = 'full_name';

export type CheckRefusal = {
  readonly ok: false;
  readonly key: AuthMessageKey;
  readonly message: string;
};

export type CredentialCheck =
  | { readonly ok: true; readonly email: string; readonly password: string }
  | CheckRefusal;

export type SignUpCheck =
  | { readonly ok: true; readonly email: string; readonly password: string; readonly fullName: string }
  | CheckRefusal;

/** Trimmed and lower-cased. */
export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/** The credentials as they will be sent, or the Spanish reason they will not be. */
export function checkCredentials(rawEmail: string, rawPassword: string): CredentialCheck {
  const email = normalizeEmail(rawEmail);
  const password = rawPassword;
  if (email === '') return refuse('emailMissing');
  if (!looksLikeEmail(email)) return refuse('emailInvalid');
  if (password === '') return refuse('passwordMissing');
  if (password.length < MIN_PASSWORD_LENGTH) return refuse('passwordShort');
  return { ok: true, email, password };
}

/** The two boxes as one string: trimmed, inner spaces collapsed, nothing else. */
export function joinName(rawFirst: string, rawLast: string): string {
  return `${rawFirst} ${rawLast}`.trim().replace(/\s+/g, ' ');
}

/** *Crear cuenta*'s rules, in the screen's order: address, password, name, surname, the aviso. */
export function checkSignUp(
  rawEmail: string,
  rawPassword: string,
  rawFirst: string,
  rawLast: string,
  acceptedAviso: boolean,
): SignUpCheck {
  const checked = checkCredentials(rawEmail, rawPassword);
  if (!checked.ok) return checked;
  if (rawFirst.trim() === '') return refuse('nameMissing');
  if (rawLast.trim() === '') return refuse('surnameMissing');
  if (!acceptedAviso) return refuse('avisoMissing');
  return { ok: true, email: checked.email, password: checked.password, fullName: joinName(rawFirst, rawLast) };
}

function refuse(key: AuthMessageKey): CheckRefusal {
  return { ok: false, key, message: ES.auth.errors[key] };
}

/** Deliberately crude — something, an `@`, something with a dot. The server decides. */
function looksLikeEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
