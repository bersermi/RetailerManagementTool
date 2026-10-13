import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  APPLE_CANCELLED_CODE,
  APPLE_PROVIDER,
  APPLE_RELAY_DOMAIN,
  appleFullName,
  appleOutcome,
  appleThrown,
  asksAppleFirst,
  hasAppleIdentity,
  isAppleRelay,
  nameToStore,
  releaseStep,
} from '@/auth/apple';
import { ES } from '@/strings';

// ============================================================================
// SIGN IN WITH APPLE, AS FAR AS A MACHINE CAN FOLLOW IT. Plan task `5R-k`.
//
// §2.11 admits this suite on `oauth.test.ts`'s terms: every assertion pins a
// VALUE — what the app decides Apple's sheet meant, what it stores, and what a
// deletion does next.
//
// ⚠️ WHAT STAYS GREEN WHILE SIGN-IN IS BROKEN, NAMED. Nothing here opens
// Apple's sheet and nothing here holds a token Apple signed, so none of these
// can see: the build missing the capability; Supabase's Apple provider off, or
// on without `mx.wera.app` among its client ids; the nonce being refused. No
// workflow compiles the native app. The owner's iPhone is the instrument, and
// the handbook says what to tap.
// ============================================================================

function read(relative: string): string {
  return readFileSync(fileURLToPath(new URL(relative, import.meta.url)), 'utf8');
}

describe('an address Apple invented', () => {
  it('is recognised by its domain, whatever the case or the padding', () => {
    expect(isAppleRelay(`q7x2k9mf4d@${APPLE_RELAY_DOMAIN}`)).toBe(true);
    expect(isAppleRelay('  Q7X2K9@PrivateRelay.AppleID.com ')).toBe(true);
  });

  it('is not any other address, including ones that only contain the domain', () => {
    expect(isAppleRelay('maria@gmail.com')).toBe(false);
    expect(isAppleRelay('maria@icloud.com')).toBe(false);
    expect(isAppleRelay(`${APPLE_RELAY_DOMAIN}@gmail.com`)).toBe(false);
    expect(isAppleRelay(`maria@not${APPLE_RELAY_DOMAIN}`)).toBe(false);
    expect(isAppleRelay('')).toBe(false);
  });
});

describe('the name Apple sends once', () => {
  it('is one string, given name first', () => {
    expect(appleFullName({ givenName: 'María', familyName: 'López Hernández' })).toBe(
      'María López Hernández',
    );
    expect(appleFullName({ givenName: ' María ', middleName: 'del Carmen', familyName: 'López' })).toBe(
      'María del Carmen López',
    );
  });

  // ⚠️ THE CASE THAT WOULD ERASE A NAME. Every sign-in after the first carries
  // a name object whose fields are all null.
  it('is null, never an empty string, when Apple sent nothing', () => {
    expect(appleFullName({ givenName: null, familyName: null })).toBeNull();
    expect(appleFullName({ givenName: '  ', familyName: '' })).toBeNull();
    expect(appleFullName(null)).toBeNull();
    expect(appleFullName(undefined)).toBeNull();
  });

  it('keeps half a name rather than refusing it', () => {
    expect(appleFullName({ givenName: 'María', familyName: null })).toBe('María');
  });

  it('is stored only on a login that has no name yet', () => {
    expect(nameToStore('María López', undefined)).toBe('María López');
    expect(nameToStore('María López', '  ')).toBe('María López');
    // Google's name is already there: Apple joining the login renames nobody.
    expect(nameToStore('María López', 'Maria L.')).toBeNull();
    expect(nameToStore(null, undefined)).toBeNull();
  });
});

describe('what came back from the sheet', () => {
  it('is a token, with the code and the name beside it', () => {
    expect(
      appleOutcome({
        identityToken: 'jwt',
        authorizationCode: 'code',
        fullName: { givenName: 'María', familyName: 'López' },
      }),
    ).toEqual({
      kind: 'token',
      identityToken: 'jwt',
      authorizationCode: 'code',
      fullName: 'María López',
    });
  });

  it('is a failure without a token, and says which', () => {
    expect(appleOutcome({ identityToken: null, authorizationCode: 'code' }).kind).toBe('failed');
    expect(appleOutcome({ identityToken: '' }).kind).toBe('failed');
    expect(appleOutcome(null).kind).toBe('failed');
  });

  it('carries no code rather than an empty one', () => {
    const asked = appleOutcome({ identityToken: 'jwt', authorizationCode: '' });
    expect(asked).toMatchObject({ kind: 'token', authorizationCode: null });
  });

  it('reads the library’s one code as a closed sheet, and nothing else', () => {
    expect(appleThrown({ code: APPLE_CANCELLED_CODE })).toEqual({ kind: 'cancelled' });
    expect(appleThrown({ code: 'ERR_REQUEST_FAILED', message: 'no' })).toEqual({
      kind: 'failed',
      detail: 'ERR_REQUEST_FAILED: no',
    });
    expect(appleThrown(new Error('boom'))).toEqual({ kind: 'failed', detail: 'boom' });
    expect(appleThrown('text').kind).toBe('failed');
  });
});

describe('whether a login has an Apple link to let go of', () => {
  it('reads the identities a sign-in returns', () => {
    expect(hasAppleIdentity({ identities: [{ provider: 'google' }, { provider: APPLE_PROVIDER }] })).toBe(true);
    expect(hasAppleIdentity({ identities: [{ provider: 'google' }] })).toBe(false);
  });

  // A session restored from the phone's disk may carry no identities at all.
  it('reads the token’s own provider list too', () => {
    expect(hasAppleIdentity({ app_metadata: { providers: ['google', 'apple'] } })).toBe(true);
    expect(hasAppleIdentity({ identities: null, app_metadata: { providers: ['email'] } })).toBe(false);
    expect(hasAppleIdentity({ app_metadata: { providers: 'apple' } })).toBe(false);
  });

  it('is false for nobody', () => {
    expect(hasAppleIdentity(null)).toBe(false);
    expect(hasAppleIdentity(undefined)).toBe(false);
    expect(hasAppleIdentity({})).toBe(false);
  });

  it('asks Apple first only where there is a link AND a sheet', () => {
    const linked = { app_metadata: { providers: ['apple'] } };
    expect(asksAppleFirst(linked, true)).toBe(true);
    // An Android phone holding an account that also has an Apple link.
    expect(asksAppleFirst(linked, false)).toBe(false);
    expect(asksAppleFirst({ app_metadata: { providers: ['google'] } }, true)).toBe(false);
  });
});

describe('what a deletion does after Apple answered', () => {
  it('goes straight ahead when Apple was never asked', () => {
    expect(releaseStep(null)).toEqual({ kind: 'delete' });
  });

  // ⚠️⚠️ THE ONE ANSWER THAT STOPS A DELETION.
  it('stops, and only stops, when the person closed the sheet', () => {
    expect(releaseStep({ kind: 'cancelled' })).toEqual({ kind: 'stop' });
  });

  it('hands the code over when there is one', () => {
    expect(
      releaseStep({ kind: 'token', identityToken: 'jwt', authorizationCode: 'code', fullName: null }),
    ).toEqual({ kind: 'revoke', code: 'code' });
  });

  it('deletes anyway when the sheet failed or gave no code', () => {
    expect(releaseStep({ kind: 'failed', detail: 'no apple account' })).toEqual({ kind: 'delete' });
    expect(
      releaseStep({ kind: 'token', identityToken: 'jwt', authorizationCode: null, fullName: null }),
    ).toEqual({ kind: 'delete' });
  });
});

describe('what the build is told', () => {
  const app = JSON.parse(read('../app.json')) as {
    expo: {
      ios: { usesAppleSignIn?: boolean; infoPlist?: Record<string, unknown> };
      android: { blockedPermissions?: string[] };
      plugins: unknown[];
    };
  };

  // Without either the sheet answers with an error on a signed build, and no
  // workflow builds one.
  it('asks for the capability and loads the plugin that writes the entitlement', () => {
    expect(app.expo.ios.usesAppleSignIn).toBe(true);
    expect(app.expo.plugins).toContain('expo-apple-authentication');
  });

  // The owner's answer to App Store Connect's export question, written once so
  // no upload asks it again: Wera uses only HTTPS and hashing, both exempt.
  it('declares no non-exempt encryption', () => {
    expect(app.expo.ios.infoPlist?.ITSAppUsesNonExemptEncryption).toBe(false);
  });

  // `5R-d-iv-a` found three permissions the template declares and Wera never
  // asks for. Play's listing shows them.
  it('blocks the three permissions nothing in this app uses', () => {
    expect(app.expo.android.blockedPermissions).toEqual([
      'android.permission.SYSTEM_ALERT_WINDOW',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
    ]);
  });
});

// ============================================================================
// ⚠️ THE PROVIDER, READ AS TEXT, because no suite can load it and the mistake
// it guards is silent everywhere else: `api-persist.test.ts` does the same to
// `QueryProvider.tsx`. GoTrue compares the SHA-256 of the nonce it is handed
// with the nonce inside Apple's token, so Apple must get the hash and Supabase
// the raw string. The other way round typechecks, bundles, and refuses every
// sign-in on a phone.
// ============================================================================
describe('the nonce goes the right way round', () => {
  const provider = read('../src/auth/AuthProvider.tsx');

  it('gives Apple the hash', () => {
    expect(provider).toMatch(/signInAsync\(\{[^}]*nonce: nonce\.hashed/s);
    expect(provider).not.toMatch(/signInAsync\(\{[^}]*nonce: nonce\.raw/s);
  });

  it('gives Supabase the raw string', () => {
    expect(provider).toMatch(/signInWithIdToken\(\{[^}]*nonce: rawNonce/s);
    expect(provider).toMatch(/rawNonce = nonce\.raw/);
  });

  it('names the provider the way the rules module does', () => {
    expect(APPLE_PROVIDER).toBe('apple');
    expect(provider).toMatch(/signInWithIdToken\(\{\s*provider: APPLE_PROVIDER/);
  });
});

describe('what she is told', () => {
  it('names the button and the way in that still works', () => {
    expect(ES.auth.errors.appleFailed).toContain('Apple');
    expect(ES.auth.errors.appleFailed).toContain('correo');
  });

  it('tells a person deleting their account that the Apple link goes too', () => {
    expect(ES.account.leavesWarning).toContain('Apple');
    expect(ES.account.leavesWarning).toContain('Google');
  });

  // The welcome screen's deletion: a login with no shop has left no name anywhere.
  it('promises a login with no shop nothing about a name staying', () => {
    expect(ES.account.aloneWarning).toContain('Apple');
    expect(ES.account.aloneWarning).not.toContain('nombre');
  });
});

// ============================================================================
// ⚠️ THE WAY OUT OF THE WELCOME SCREEN, READ AS TEXT (the owner, 2026-10-13).
// A login with no shop had no *Cerrar sesión* and no deletion, because both
// lived in Ajustes and Ajustes needs a shop. A screen is not loadable here, so
// this pins that the two acts are still wired on it — which is the whole of
// what Apple's rule 5.1.1(v) asks of an account this app made.
// ============================================================================
describe('a login with no shop can leave', () => {
  const welcome = read('../src/app/(onboarding)/bienvenida.tsx');

  it('can sign out from the welcome screen', () => {
    expect(welcome).toMatch(/const \{ signOut \} = useAuth\(\);/);
    expect(welcome).toMatch(/onPress=\{\(\) => void signOut\(\)\}/);
  });

  it('can delete itself there, with no shop name to type', () => {
    expect(welcome).toMatch(/useDeleteMyAccount\(\)/);
    expect(welcome).toMatch(/remove\(deleteArgs\(\{ kind: 'leaves' \}, ''\)\)/);
  });
});
