import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  DEEP_LINK_SCHEME,
  OAUTH_REDIRECT_URI,
  oauthOutcome,
  parseOAuthReturn,
} from '@/auth/oauth';

// ============================================================================
// THE ROUND TRIP, AS FAR AS A MACHINE CAN FOLLOW IT. Plan task 5a-iii-b.
//
// §2.11 admits this suite on the same terms as `auth-errors.test.ts`: every
// assertion pins a VALUE — what the app decides a callback URL meant, and what
// it therefore tells the person holding the phone. Nothing is rendered, no
// browser is opened, and nothing here can prove that the browser comes back.
//
// ⚠️ WHAT STAYS GREEN WHILE SIGN-IN IS BROKEN, NAMED: the Supabase dashboard's
// Redirect URLs list missing `mx.bserafin.wera://**`. That half is in someone
// else's web page, GoTrue does NOT report it as an error — it silently sends
// the browser to the project's Site URL instead — and `5a-iv` is the
// instrument. See docs/PLAN.md: an attempt to assert it over the public API was
// made and FAILED, because `/auth/v1/authorize` returns the same 302 for a
// redirect that is allowed and one that is not.
// ============================================================================

const app = JSON.parse(
  readFileSync(fileURLToPath(new URL('../app.json', import.meta.url)), 'utf8'),
) as { expo: { scheme: string } };

describe('the redirect URI is the string the dashboard also holds', () => {
  // ⚠️ K13 ONE LEVEL UP. `identity.test.ts` ties `app.json`'s scheme to the
  // bundle id; this ties the constant the OAuth call actually sends to the same
  // `app.json`. A scheme "tidied" in either file without the other is a browser
  // that opens and never comes back, and that failure looks like a hang.
  it('builds the callback from app.json’s own scheme', () => {
    expect(DEEP_LINK_SCHEME).toBe(app.expo.scheme);
    expect(OAUTH_REDIRECT_URI.startsWith(`${app.expo.scheme}://`)).toBe(true);
  });

  it('is the exact value that must appear in Supabase’s Redirect URLs', () => {
    expect(OAUTH_REDIRECT_URI).toBe('mx.bserafin.wera://auth/callback');
  });

  // ⚠️ A CUSTOM SCHEME, NOT AN `exp://` OR `https://` ONE. `makeRedirectUri()`
  // from `expo-auth-session` — which the plan's sizing row named and this task
  // did not use — returns a DIFFERENT string depending on how the app was
  // started. A value that varies is the worst possible shape for a value whose
  // other copy was typed into a web page once.
  it('does not vary with how the app was started', () => {
    expect(OAUTH_REDIRECT_URI).not.toMatch(/^exp(o)?(\+|:)/);
    expect(OAUTH_REDIRECT_URI).not.toMatch(/^https?:/);
    expect(OAUTH_REDIRECT_URI).not.toMatch(/localhost|127\.0\.0\.1|\d+\.\d+\.\d+\.\d+/);
  });
});

describe('the callback is read', () => {
  it('finds the PKCE code in the query', () => {
    expect(parseOAuthReturn(`${OAUTH_REDIRECT_URI}?code=abc123`)).toEqual({
      kind: 'code',
      code: 'abc123',
    });
  });

  it('finds it beside other parameters, in any position', () => {
    expect(parseOAuthReturn(`${OAUTH_REDIRECT_URI}?state=xyz&code=abc123`)).toEqual({
      kind: 'code',
      code: 'abc123',
    });
  });

  it('percent-decodes what it finds', () => {
    expect(parseOAuthReturn(`${OAUTH_REDIRECT_URI}?code=a%2Fb%2Bc`)).toEqual({
      kind: 'code',
      code: 'a/b+c',
    });
  });

  // ⚠️ THE FRAGMENT IS READ TOO, AND IT IS NOT BELT AND BRACES. GoTrue reports
  // some failures after the hash because that is where the implicit flow it
  // also serves puts everything. A parser that read only the query would turn a
  // real, reportable error into "no code" — the same message as a bug here.
  it('reads a failure reported after the hash', () => {
    const out = parseOAuthReturn(
      `${OAUTH_REDIRECT_URI}#error=server_error&error_description=Database+error+saving+new+user`,
    );
    expect(out).toEqual({ kind: 'failed', detail: 'Database error saving new user' });
  });

  it('does not read a value across the other separator', () => {
    expect(parseOAuthReturn(`${OAUTH_REDIRECT_URI}?code=abc#state=late`)).toEqual({
      kind: 'code',
      code: 'abc',
    });
    expect(parseOAuthReturn(`${OAUTH_REDIRECT_URI}#state=late&code=abc`)).toEqual({
      kind: 'code',
      code: 'abc',
    });
  });

  // ⚠️ FOUND BY THIS SUITE, AND THE FIXTURE WAS THE THING THAT WAS WRONG. A
  // callback carrying BOTH a code and an error is malformed, and the first
  // spelling of this test simply assumed the code would win. It does not, and
  // it should not: exchanging a code that arrived alongside an error report is
  // acting on half a message. The rule is written down in `oauth.ts` now
  // rather than being whatever the order of two `if`s happened to produce.
  it('lets an error beat a code when a malformed callback carries both', () => {
    expect(parseOAuthReturn(`${OAUTH_REDIRECT_URI}?code=abc#error=server_error`)).toEqual({
      kind: 'failed',
      detail: 'server_error',
    });
  });
});

describe('a person changing their mind is never shown a failure', () => {
  // The owner's rule: we do the bookkeeping, they do not. Somebody who closed
  // the sheet knows they closed it, and a message about it is noise.
  it('treats Google’s access_denied as a cancellation, not an error', () => {
    expect(parseOAuthReturn(`${OAUTH_REDIRECT_URI}?error=access_denied`)).toEqual({
      kind: 'cancelled',
    });
    expect(parseOAuthReturn(`${OAUTH_REDIRECT_URI}#error_code=access_denied`)).toEqual({
      kind: 'cancelled',
    });
  });

  it('treats both shapes of closing the browser as the same thing', () => {
    expect(oauthOutcome({ type: 'cancel' })).toEqual({ kind: 'cancelled' });
    expect(oauthOutcome({ type: 'dismiss' })).toEqual({ kind: 'cancelled' });
  });
});

describe('everything else is a named failure rather than a silence', () => {
  // ⚠️ THE ASSERTION THAT NOTICES A CONFIGURATION CHANGE RATHER THAN A USER.
  // Tokens in the callback mean `flowType: 'pkce'` left `lib/supabase.ts` — and
  // it would still sign people in, while a refresh token that never expires
  // travelled through a URL scheme any app on the phone may claim.
  it('refuses tokens in the callback and says why', () => {
    const out = parseOAuthReturn(
      `${OAUTH_REDIRECT_URI}#access_token=ey.j.w&refresh_token=r&expires_in=3600`,
    );
    expect(out.kind).toBe('failed');
    expect(out).toMatchObject({ detail: expect.stringContaining('PKCE') });
  });

  it('reports a callback carrying nothing at all', () => {
    expect(parseOAuthReturn(OAUTH_REDIRECT_URI).kind).toBe('failed');
    expect(parseOAuthReturn(`${OAUTH_REDIRECT_URI}?code=`).kind).toBe('failed');
  });

  it('reports a browser that succeeded without a url', () => {
    expect(oauthOutcome({ type: 'success' }).kind).toBe('failed');
    expect(oauthOutcome({ type: 'success', url: '' }).kind).toBe('failed');
  });

  it('reports any other browser result rather than assuming it went well', () => {
    for (const type of ['locked', 'opened', 'whatever-expo-adds-next-year']) {
      const out = oauthOutcome({ type });
      expect(out.kind).toBe('failed');
      expect(out).toMatchObject({ detail: expect.stringContaining(type) });
    }
  });

  // Every branch returns one of exactly three kinds — so a call site that
  // handles all three has handled the round trip, and the compiler agrees.
  it('never returns anything but the three kinds', () => {
    const urls = [
      OAUTH_REDIRECT_URI,
      `${OAUTH_REDIRECT_URI}?code=x`,
      `${OAUTH_REDIRECT_URI}?error=access_denied`,
      `${OAUTH_REDIRECT_URI}?error=server_error`,
      `${OAUTH_REDIRECT_URI}#access_token=x`,
      `${OAUTH_REDIRECT_URI}?malformed`,
      `${OAUTH_REDIRECT_URI}?code=%E0%A4%A`,
    ];
    for (const url of urls) {
      expect(['code', 'cancelled', 'failed']).toContain(parseOAuthReturn(url).kind);
    }
  });

  // A malformed percent escape throws out of `decodeURIComponent`. It must not
  // throw out of a sign-in: an exception here surfaces as the app doing nothing.
  it('survives a malformed escape rather than throwing', () => {
    expect(() => parseOAuthReturn(`${OAUTH_REDIRECT_URI}?code=%E0%A4%A`)).not.toThrow();
  });
});

// ============================================================================
// ⚠️ TWO SOURCE-TEXT ASSERTIONS, AND BOTH GUARD A DEFECT THAT WOULD OTHERWISE
// SHIP GREEN. `parseOAuthReturn` reports tokens-in-the-callback as a failure,
// which catches the flow type being changed — but only at runtime, on a phone,
// after a real sign-in. In CI the same defect is a missing line in a file, and
// a check that reads the line costs nothing. This is `5a-ii`'s F9 lesson and
// `auth-errors.test.ts`'s "exactly one caller" applied once more.
// ============================================================================
describe('the two lines the round trip rests on are where they must be', () => {
  const SRC = fileURLToPath(new URL('../src', import.meta.url));
  const read = (rel: string) => readFileSync(`${SRC}/${rel}`, 'utf8');

  it('reads real files, so it cannot pass vacuously', () => {
    expect(read('lib/supabase.ts').length).toBeGreaterThan(500);
    expect(read('auth/AuthProvider.tsx')).toContain('signInWithOAuth');
  });

  // ⚠️ THE SECURITY ONE. Without it GoTrue sends the access AND refresh tokens
  // back through `mx.bserafin.wera://`, a scheme any app on the phone may also
  // register — and a refresh token does not expire. Same shape as the secret
  // key `env.ts` refuses: removing this line does not break sign-in, it works.
  it('keeps the client in PKCE mode', () => {
    expect(read('lib/supabase.ts')).toMatch(/flowType:\s*'pkce'/);
  });

  // `openBrowserAsync` opens a browser and returns immediately, leaving the
  // deep link to find its own way home through the OS. `openAuthSessionAsync`
  // resolves WITH the callback URL. That difference is the whole of "the
  // browser opens and never comes back".
  //
  // ⚠️ IT MATCHES A CALL, NOT A WORD, AND THE FIRST SPELLING DID NOT. It was
  // `not.toContain('openBrowserAsync')`, and it went red against a COMMENT in
  // `AuthProvider` explaining why that function is not used. Same shape as
  // `5i`'s G5 and `5a-ii`'s F9 — an assertion phrased about a specific thing
  // while the code looked at a container holding that thing among others.
  it('returns through an auth session and not a plain browser', () => {
    const provider = read('auth/AuthProvider.tsx');
    expect(provider).toMatch(/WebBrowser\.openAuthSessionAsync\s*\(/);
    expect(provider).not.toMatch(/WebBrowser\.openBrowserAsync\s*\(/);
  });
});
