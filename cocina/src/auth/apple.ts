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
// ⚠️ AND THE DELETION HALF, `10.4b-iii-c`: deleting the account tells Apple.
// Apple is asked again at that moment for a fresh code, issued to THIS app, and
// `apple-revoke` spends it — told it is Cocina's (`@/api/account`'s
// `revokeBody`). `releaseStep` is every decision in that exchange, Wera's.
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

/** As much of a signed-in user as `hasAppleIdentity` reads. */
export interface IdentityHolder {
  readonly identities?: ReadonlyArray<{ readonly provider?: string | null }> | null;
  readonly app_metadata?: { readonly providers?: unknown } | null;
}

/**
 * Does this login have an Apple link to let go of? ⚠️ BOTH PLACES ARE READ:
 * `identities` is on the user a sign-in returns; `app_metadata.providers` is
 * inside the token, so it is there on a session restored from the phone too.
 * An account can hold Google AND Apple, so this asks about the link, not about
 * how she came in today — and a link made in Wera counts here: one login.
 */
export function hasAppleIdentity(user: IdentityHolder | null | undefined): boolean {
  if (user === null || user === undefined) return false;
  if (user.identities?.some((identity) => identity.provider === APPLE_PROVIDER) === true) {
    return true;
  }
  const providers = user.app_metadata?.providers;
  return Array.isArray(providers) && providers.includes(APPLE_PROVIDER);
}

/**
 * Whether a deletion has to stop at Apple's sheet first. ⚠️ `false` ON ANDROID
 * EVEN FOR AN APPLE-LINKED ACCOUNT: there is no sheet to ask, so no code to
 * spend, and the deletion goes ahead without telling Apple. The right to delete
 * is not held up by a phone's maker.
 */
export function asksAppleFirst(user: IdentityHolder | null | undefined, available: boolean): boolean {
  return available && hasAppleIdentity(user);
}

/** What the deletion does once Apple's sheet has answered, or was never shown. */
export type ReleaseStep =
  /** She backed out of Apple's sheet: nothing is deleted and nothing is said. */
  | { readonly kind: 'stop' }
  /** Hand the code to the function, then delete whatever it answers. */
  | { readonly kind: 'revoke'; readonly code: string }
  /** Delete without telling Apple: no link, no sheet, or the sheet failed. */
  | { readonly kind: 'delete' };

/**
 * ⚠️⚠️ ONLY A CANCELLATION STOPS A DELETION. A sheet that failed, a credential
 * with no code, and a function that cannot be reached all end in the account
 * being deleted: what is lost is Apple's list still naming the app, which she
 * can clear herself; what is kept is that nobody is refused a deletion because
 * a third party was down.
 */
export function releaseStep(asked: AppleReturn | null): ReleaseStep {
  if (asked === null) return { kind: 'delete' };
  if (asked.kind === 'cancelled') return { kind: 'stop' };
  if (asked.kind === 'token' && asked.authorizationCode !== null) {
    return { kind: 'revoke', code: asked.authorizationCode };
  }
  return { kind: 'delete' };
}
