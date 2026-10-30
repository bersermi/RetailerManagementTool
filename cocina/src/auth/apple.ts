// ============================================================================
// SIGN IN WITH APPLE, AS THE HALF THAT DECIDES. Plan task `10.4b-iii-a`.
//
// ⚠️ WERA'S RULES, COPIED (`app/src/auth/apple.ts`, plan `5R-k`, whose header
// carries the reasons) — the sign-in half. On an iPhone the system sheet hands
// back a token Apple signed and `AuthProvider` gives it to Supabase; no browser,
// no deep link. Nothing here imports the native module, so `test/apple.test.ts`
// can load it.
//
// ⚠️ ONE LOGIN ACROSS THE APPS (ADR-035 §2.7): Apple gives one person the same
// user id in every app of one developer team, and the hosted project accepts
// tokens issued to `mx.wera.app` and `mx.wera.cocina` (its client ids since
// 2026-10-30), so a person who made her account in Wera with Apple is the same
// login here.
//
// ⚠️ NOT HERE YET: the deletion half (`hasAppleIdentity`, `releaseStep` in Wera)
// — telling Apple when an account goes is `10.4b-iii-c`'s, with `apple-revoke`
// learning which app a code came from.
// ============================================================================

/** Supabase's name for the provider. */
export const APPLE_PROVIDER = 'apple';

/** The parts of a name as Apple's credential carries them. Any may be absent. */
export interface AppleNameParts {
  readonly givenName?: string | null;
  readonly middleName?: string | null;
  readonly familyName?: string | null;
}

/**
 * One string, in the order a Mexican name is written, or `null` — NEVER `''`:
 * every sign-in after the first carries a name whose fields are all null, and
 * writing an empty string would erase the one the first stored.
 */
export function appleFullName(name: AppleNameParts | null | undefined): string | null {
  if (name === null || name === undefined) return null;
  const parts = [name.givenName, name.middleName, name.familyName]
    .map((part) => (typeof part === 'string' ? part.replace(/\s+/g, ' ').trim() : ''))
    .filter((part) => part !== '');
  return parts.length === 0 ? null : parts.join(' ');
}

/**
 * The name to write to the login after a sign-in, or `null` to write nothing.
 * ⚠️ A NAME ALREADY ON THE LOGIN WINS — her Wera account's, or Google's.
 */
export function nameToStore(fromApple: string | null, existing: unknown): string | null {
  if (fromApple === null) return null;
  if (typeof existing === 'string' && existing.trim() !== '') return null;
  return fromApple;
}

/** As much of the library's credential as this app reads. */
export interface AppleCredential {
  readonly identityToken?: string | null;
  readonly authorizationCode?: string | null;
  readonly fullName?: AppleNameParts | null;
}

/** What came back from Apple's sheet, once. `cancelled` owes no message. */
export type AppleReturn =
  | {
      readonly kind: 'token';
      readonly identityToken: string;
      readonly authorizationCode: string | null;
      readonly fullName: string | null;
    }
  | { readonly kind: 'cancelled' }
  | { readonly kind: 'failed'; readonly detail: string };

/** The credential, as one of the things that can have happened. */
export function appleOutcome(credential: AppleCredential | null | undefined): AppleReturn {
  const token = credential?.identityToken;
  if (typeof token !== 'string' || token === '') {
    return { kind: 'failed', detail: 'apple returned no identity token' };
  }
  const code = credential?.authorizationCode;
  return {
    kind: 'token',
    identityToken: token,
    authorizationCode: typeof code === 'string' && code !== '' ? code : null,
    fullName: appleFullName(credential?.fullName),
  };
}

/** The library's code for *the person closed the sheet*. */
export const APPLE_CANCELLED_CODE = 'ERR_REQUEST_CANCELED';

/** A rejected `signInAsync`: only the one code is a cancellation. */
export function appleThrown(thrown: unknown): AppleReturn {
  if (typeof thrown === 'object' && thrown !== null) {
    const code = (thrown as { code?: unknown }).code;
    if (code === APPLE_CANCELLED_CODE) return { kind: 'cancelled' };
    const message = (thrown as { message?: unknown }).message;
    const text = typeof message === 'string' ? message : 'no message';
    return { kind: 'failed', detail: typeof code === 'string' ? `${code}: ${text}` : text };
  }
  return { kind: 'failed', detail: String(thrown) };
}
