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

/**
 * A refusal, and the SAME shape on both paths (5b.7). It is named rather than
 * spelled twice so that `checkSignUp` can hand back `checkCredentials`' own
 * refusal untouched — a second literal would make the two unions structurally
 * different and force a re-wrap that could quietly change the key.
 */
export type CheckRefusal = {
  readonly ok: false;
  readonly key: AuthMessageKey;
  readonly message: string;
};

export type CredentialCheck =
  | { readonly ok: true; readonly email: string; readonly password: string }
  | CheckRefusal;

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

function refuse(key: AuthMessageKey): CheckRefusal {
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

// ============================================================================
// ⚠️⚠️ THE NAME, AND IT IS ONLY EVER ASKED FOR ONCE. Plan task 5b.7, instructed
// by the owner 2026-09-18: *"let's include the Name at Sign-in: Nombre y
// Apellido."*
//
// ⚠️ IT IS THE SIGN-UP HALF AND NEVER THE SIGN-IN HALF. `checkCredentials`
// above is untouched, deliberately: a person coming back types an address and a
// password, and nothing else. The two rules below are reachable from exactly
// one button.
//
// ⚠️⚠️ TWO REQUIRED BOXES, NOT A RULE ABOUT SPACES IN ONE (the owner, the same
// day: *"we need to ask for at least one nombre and one apellido"*). A
// split-on-space heuristic is a decision about how a Spanish name is SHAPED,
// and Spanish routinely carries two surnames — `María del Carmen Rodríguez
// Gómez` breaks every such rule anyone would write. Two boxes make the
// requirement structural and assert NOTHING about what goes in either: neither
// may be blank, and that is the whole of it.
//
// ⚠️ STORED AS ONE JOINED STRING, because that is the shape the OTHER way in
// already delivers. Google hands over one string, not two fields, so a schema
// with two columns would have one of them permanently empty for half the people
// in it — and `5b.8` has one column and one reader to write.
// ============================================================================

/**
 * ⚠️⚠️ THE METADATA KEY, AND IT IS SPELLED THIS WAY BECAUSE GOOGLE SPELLS IT
 * THIS WAY — not because we chose it. Supabase's Google provider writes the
 * name it is given into `raw_user_meta_data.full_name`; matching it means
 * `5b.8` has ONE reader for both ways in, rather than a branch on which button
 * a person happened to tap months earlier.
 *
 * ⚠️ IT IS EXPORTED SO THE CONTRACT CHECK CAN READ IT rather than carry a
 * second copy — `docs/checks/5b.7-signup-name-contract.sh`, the same rule
 * `5b-i` established about `p_display_name`.
 */
export const FULL_NAME_KEY = 'full_name';

export type SignUpCheck =
  | {
      readonly ok: true;
      readonly email: string;
      readonly password: string;
      /** The two boxes, joined — what `full_name` will hold. */
      readonly fullName: string;
    }
  | CheckRefusal;

/**
 * The two boxes as one string.
 *
 * ⚠️ TRIMMED AT BOTH ENDS AND COLLAPSED IN THE MIDDLE, AND NOTHING ELSE. No
 * capitalisation, no title-casing, no reordering: `de la Cruz` is a surname and
 * `María DEL CARMEN` is how somebody writes their own name. The autocomplete
 * bar's trailing space is the one thing being removed.
 */
export function joinName(rawFirst: string, rawLast: string): string {
  return `${rawFirst} ${rawLast}`.trim().replace(/\s+/g, ' ');
}

/**
 * Sign-up's four rules: `checkCredentials`' two pairs, and then the name.
 *
 * ⚠️ THE ORDER IS THE SCREEN'S ORDER. The address and the password are the
 * fields both halves share and they sit above; the two name boxes are appended
 * below, so the first refusal a person reads names the topmost empty field.
 */
export function checkSignUp(
  rawEmail: string,
  rawPassword: string,
  rawFirst: string,
  rawLast: string,
): SignUpCheck {
  const checked = checkCredentials(rawEmail, rawPassword);
  if (!checked.ok) return checked;

  if (rawFirst.trim() === '') return refuse('nameMissing');
  if (rawLast.trim() === '') return refuse('surnameMissing');

  return {
    ok: true,
    email: checked.email,
    password: checked.password,
    fullName: joinName(rawFirst, rawLast),
  };
}
