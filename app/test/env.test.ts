import { describe, expect, it } from 'vitest';

import { isSecretKey, readSupabaseEnv } from '@/lib/env';

// ============================================================================
// THE KEY THE PHONE IS GIVEN. Plan task 5a-iii-a.
//
// ⚠️ WHY THIS SUITE IS ALLOWED UNDER §2.11, WHICH REFUSES TESTS OVER RENDERING,
// NAVIGATION AND LAYOUT: it is none of those. It pins the decision "this key may
// go into the app binary" — and the wrong answer is not a cosmetic defect but
// the silent removal of every access rule this repository has proved since step
// 3. A `service_role` key in the client does not fail; it WORKS, and returns
// every workspace's rows to whoever is holding the phone.
//
// ⚠️ `docs/checks/5a-iii-gate.sh` MAKES THE SAME ASSERTION AND THIS IS NOT A
// DUPLICATE. The gate reads `app/.env.local`, which is gitignored and needs the
// network, so it CANNOT RUN IN CI — it is the local instrument for the owner's
// own machine. This one runs on every pull request and asserts the RULE rather
// than the current file. The two answer different questions: "is the owner's
// laptop configured right today" and "does the app still refuse the wrong key".
// ============================================================================

const URL = 'https://hweuabcdefghijklmnop.supabase.co';
const PUBLISHABLE = 'sb_publishable_aBcDeFgHiJkLmNoPqRsTuV';

/** A JWT with the given claims, signature ignored — as Supabase's legacy keys are. */
function jwt(claims: Record<string, unknown>): string {
  const b64 = (value: string) =>
    Buffer.from(value, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${b64('{"alg":"HS256","typ":"JWT"}')}.${b64(JSON.stringify(claims))}.notasignature`;
}

const SERVICE_ROLE_JWT = jwt({ iss: 'supabase', ref: 'hweuabcdefghijklmnop', role: 'service_role', iat: 1, exp: 2 });
const ANON_JWT = jwt({ iss: 'supabase', ref: 'hweuabcdefghijklmnop', role: 'anon', iat: 1, exp: 2 });

describe('the key that bypasses RLS is refused', () => {
  it('refuses an sb_secret_ key', () => {
    expect(isSecretKey('sb_secret_aBcDeFgHiJkLmNoPqRsTuV')).toBe(true);
    expect(() =>
      readSupabaseEnv({
        EXPO_PUBLIC_SUPABASE_URL: URL,
        EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_aBcDeFgHiJkLmNoPqRsTuV',
      }),
    ).toThrow(/SECRET key/);
  });

  // ⚠️ THE ONE A PREFIX CHECK CANNOT SEE. A legacy service_role key is a JWT:
  // the words `service_role` are inside a base64url payload and appear nowhere
  // in the token text, so a guard that greps the string passes and has never
  // looked at anything. Projects created before the key change still carry one.
  it('refuses a legacy service_role JWT, whose text contains no such word', () => {
    expect(SERVICE_ROLE_JWT).not.toContain('service_role');
    expect(isSecretKey(SERVICE_ROLE_JWT)).toBe(true);
    expect(() =>
      readSupabaseEnv({ EXPO_PUBLIC_SUPABASE_URL: URL, EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: SERVICE_ROLE_JWT }),
    ).toThrow(/SECRET key/);
  });

  it('accepts the two keys that are meant to ship', () => {
    expect(isSecretKey(PUBLISHABLE)).toBe(false);
    expect(isSecretKey(ANON_JWT)).toBe(false);
    expect(readSupabaseEnv({ EXPO_PUBLIC_SUPABASE_URL: URL, EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: PUBLISHABLE })).toEqual(
      { url: URL, publishableKey: PUBLISHABLE },
    );
  });

  it('does not mistake an ordinary string for a JWT', () => {
    expect(isSecretKey('')).toBe(false);
    expect(isSecretKey('not.a.jwt')).toBe(false);
    expect(isSecretKey('a.b')).toBe(false);
  });
});

describe('a missing or malformed configuration stops the app rather than the first request', () => {
  it('refuses a missing URL, and names the NEXT_PUBLIC_ trap in the message', () => {
    expect(() => readSupabaseEnv({ EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: PUBLISHABLE })).toThrow(
      /EXPO_PUBLIC_SUPABASE_URL is not set/,
    );
    // The hint is load-bearing: Expo drops the NEXT_PUBLIC_ spelling entirely,
    // so this message is all a developer gets to work back from.
    expect(() => readSupabaseEnv({ EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: PUBLISHABLE })).toThrow(/NEXT_PUBLIC_/);
  });

  it('refuses a missing key', () => {
    expect(() => readSupabaseEnv({ EXPO_PUBLIC_SUPABASE_URL: URL })).toThrow(
      /EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY is not set/,
    );
  });

  it('treats whitespace as absent — a copied line with a trailing space is not a value', () => {
    expect(() => readSupabaseEnv({ EXPO_PUBLIC_SUPABASE_URL: '   ', EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: PUBLISHABLE })).toThrow(
      /is not set/,
    );
    expect(
      readSupabaseEnv({ EXPO_PUBLIC_SUPABASE_URL: ` ${URL} `, EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ` ${PUBLISHABLE}\t` }),
    ).toEqual({ url: URL, publishableKey: PUBLISHABLE });
  });

  it('refuses http://, which would carry the session in clear', () => {
    expect(() =>
      readSupabaseEnv({
        EXPO_PUBLIC_SUPABASE_URL: 'http://hweuabcdefghijklmnop.supabase.co',
        EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: PUBLISHABLE,
      }),
    ).toThrow(/https:\/\//);
  });

  // supabase-js appends `/auth/v1`; the doubled slash 404s every request, and
  // the symptom is a message about the network on a correctly configured phone.
  it('refuses a trailing slash', () => {
    expect(() =>
      readSupabaseEnv({ EXPO_PUBLIC_SUPABASE_URL: `${URL}/`, EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: PUBLISHABLE }),
    ).toThrow(/slash/);
  });
});
