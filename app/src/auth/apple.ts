// ============================================================================
// SIGN IN WITH APPLE, AS THE HALF THAT DECIDES. Plan task `5R-k`, the owner's
// rulings of 2026-10-10 (add it) and 2026-10-13 (the three below).
//
// Apple's guideline 4.8 asks for it beside Google. It is on iPhone only: the
// system sheet hands back a signed token, and `AuthProvider` gives that token
// to Supabase. No browser, no deep link, so `@/auth/oauth` is not involved.
//
// ⚠️ NOTHING IN THIS FILE IMPORTS `expo-apple-authentication`, `expo-crypto` OR
// THE SUPABASE CLIENT, for `oauth.ts`'s reason: this is the part a node suite
// can load (`app/test/apple.test.ts`). The impure half is in `AuthProvider`.
//
// WHAT APPLE HANDS OVER, AND WHAT IS DIFFERENT FROM GOOGLE:
//   - THE NAME ARRIVES ONCE, on the first sign-in, in the credential and never
//     in the token. Supabase cannot read it, so `AuthProvider` writes it to the
//     key Google already uses (`FULL_NAME_KEY`). An account Apple gave no name
//     for is the roster's existing floor: *Ajustes → Tu nombre* fixes it.
//   - THE EMAIL MAY BE A RELAY ADDRESS. A person who taps *Ocultar mi correo*
//     reaches us as random letters at `privaterelay.appleid.com`. The owner
//     ruled on 2026-10-13 what a request from such an address looks like:
//     `@/api/approvals` asks `isAppleRelay`.
//   - DELETING THE ACCOUNT TELLS APPLE (the owner, 2026-10-13: a small function,
//     nothing stored). Apple is asked again at that moment for a fresh code,
//     and `supabase/functions/apple-revoke` spends it. `releaseStep` is every
//     decision in that exchange.
// ============================================================================

/** Supabase's name for the provider, and the string `auth.identities` carries. */
export const APPLE_PROVIDER = 'apple';

/**
 * The domain of every address Apple makes for a person who hides theirs.
 * Apple's own (developer.apple.com, *Communicating using the private email
 * relay service*); it has had no other since the feature shipped.
 */
export const APPLE_RELAY_DOMAIN = 'privaterelay.appleid.com';

/** Is this the address Apple invented, rather than one a person could read out? */
export function isAppleRelay(email: string): boolean {
  return email.trim().toLowerCase().endsWith(`@${APPLE_RELAY_DOMAIN}`);
}

/** The parts of a name as Apple's credential carries them. Any may be absent. */
export interface AppleNameParts {
  readonly givenName?: string | null;
  readonly middleName?: string | null;
  readonly familyName?: string | null;
}

/**
 * One string, in the order a Mexican name is written, or `null` when Apple
 * sent nothing usable.
 *
 * ⚠️ `null` AND NEVER `''`. Every sign-in after the first carries a name object
 * whose fields are all null, and writing an empty string over the name the
 * first sign-in stored would erase it. `auth_full_name` (`0034`) reads blank as
 * no name, so the two sides agree.
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
 *
 * ⚠️ A NAME ALREADY ON THE LOGIN WINS. An account that came in by Google first
 * carries Google's name; Apple joining it later must not rename the person.
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

/**
 * What came back from Apple's sheet, once.
 *
 * `cancelled` is `oauth.ts`'s rule again: the person closed the sheet, they
 * know they did, and no message is owed.
 */
export type AppleReturn =
  | {
      readonly kind: 'token';
      readonly identityToken: string;
      /** Single use, good for five minutes. Only the deletion path spends it. */
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

/**
 * What a rejected `signInAsync` means. ⚠️ ONLY THE ONE CODE IS A CANCELLATION.
 * Everything else — no Apple account on the phone, the capability missing from
 * the build — is a failure, and its detail is for the console.
 */
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
 * Does this login have an Apple link to let go of?
 *
 * ⚠️ BOTH PLACES ARE READ. `identities` is on the user a sign-in returns;
 * `app_metadata.providers` is inside the token itself, so it is there on a
 * session restored from the phone's disk too. An account can hold Google AND
 * Apple (Supabase joins two logins that share a verified address), which is
 * why this asks about the link and not about how the person came in today.
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
 * Whether a deletion has to stop at Apple's sheet first.
 *
 * ⚠️ `false` ON ANDROID EVEN FOR AN APPLE-LINKED ACCOUNT. There is no sheet to
 * ask there, so there is no code to spend and the deletion goes ahead without
 * telling Apple. The right to delete is not held up by a phone's maker.
 */
export function asksAppleFirst(user: IdentityHolder | null | undefined, available: boolean): boolean {
  return available && hasAppleIdentity(user);
}

/** What the deletion does once Apple's sheet has answered, or was never shown. */
export type ReleaseStep =
  /** They backed out of Apple's sheet: nothing is deleted and nothing is said. */
  | { readonly kind: 'stop' }
  /** Hand the code to the function, then delete whatever it answers. */
  | { readonly kind: 'revoke'; readonly code: string }
  /** Delete without telling Apple: no link, no sheet, or the sheet failed. */
  | { readonly kind: 'delete' };

/**
 * ⚠️⚠️ ONLY A CANCELLATION STOPS A DELETION. A sheet that failed, a credential
 * with no code, and a function that cannot be reached all end in the account
 * being deleted: what is lost is Apple's list still naming Wera, which the
 * person can clear themselves, and what is kept is that nobody is refused a
 * deletion because a third party was down.
 */
export function releaseStep(asked: AppleReturn | null): ReleaseStep {
  if (asked === null) return { kind: 'delete' };
  if (asked.kind === 'cancelled') return { kind: 'stop' };
  if (asked.kind === 'token' && asked.authorizationCode !== null) {
    return { kind: 'revoke', code: asked.authorizationCode };
  }
  return { kind: 'delete' };
}
