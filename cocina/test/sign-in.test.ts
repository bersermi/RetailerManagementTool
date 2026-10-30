import { existsSync, readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  APPLE_CANCELLED_CODE,
  APPLE_PROVIDER,
  appleFullName,
  appleOutcome,
  appleThrown,
  nameToStore,
} from '@/auth/apple';
import { heldSession, sessionKeyOf, sessionToHold } from '@/auth/held';
import { DEEP_LINK_SCHEME, OAUTH_REDIRECT_URI, oauthOutcome, parseOAuthReturn } from '@/auth/oauth';

// ============================================================================
// THE THREE WAYS IN, AS THE HALVES THAT DECIDE. Plan task `10.4b-iii-a`.
//
// ⚠️ COCINA'S COPIES OF WERA'S RULES (`app/test/oauth.test.ts`, `apple.test.ts`,
// `auth-held.test.ts` pin Wera's). WHAT NO CHECK HERE CAN SEE: a sign-in with
// Google or Apple completing on a phone — Google needs the hosted project's
// redirect list, Apple a token Apple signed on a signed build (the owner's
// phones, plan `10.4b-iii-a`'s look). What is held here is every decision made
// on the way, and the three strings that must agree with files: the scheme with
// `app.json`, the redirect with its route, the nonce with the provider.
// ============================================================================

const here = (path: string) => new URL(`../${path}`, import.meta.url);
const read = (path: string) => readFileSync(here(path), 'utf8');
const app = JSON.parse(read('app.json')).expo;

describe('Google comes back to this app, and to a route that exists', () => {
  it('the scheme is app.json’s, which is the bundle id', () => {
    expect(DEEP_LINK_SCHEME).toBe(app.scheme);
    expect(DEEP_LINK_SCHEME).toBe('mx.wera.cocina');
  });

  it('the redirect is <scheme>://auth/callback, and Android finds a route there', () => {
    expect(OAUTH_REDIRECT_URI).toBe('mx.wera.cocina://auth/callback');
    expect(existsSync(here('src/app/auth/callback.tsx'))).toBe(true);
  });
});

describe('what came back from the browser', () => {
  it('a code is the one success', () => {
    expect(oauthOutcome({ type: 'success', url: 'mx.wera.cocina://auth/callback?code=abc-123' })).toEqual({
      kind: 'code',
      code: 'abc-123',
    });
  });

  it('closing it, or backing out of Google, owes no message', () => {
    expect(oauthOutcome({ type: 'cancel' })).toEqual({ kind: 'cancelled' });
    expect(oauthOutcome({ type: 'dismiss' })).toEqual({ kind: 'cancelled' });
    expect(parseOAuthReturn('mx.wera.cocina://auth/callback?error=access_denied')).toEqual({ kind: 'cancelled' });
  });

  it('an error beats a code, and is read from the fragment too', () => {
    expect(parseOAuthReturn('mx.wera.cocina://auth/callback?code=abc#error=server_error&error_description=Oops+here')).toEqual({
      kind: 'failed',
      detail: 'Oops here',
    });
  });

  it('names the two misconfigurations rather than signing her in through them', () => {
    expect(parseOAuthReturn('mx.wera.cocina://auth/callback#access_token=t&refresh_token=r')).toMatchObject({
      kind: 'failed',
      detail: expect.stringMatching(/PKCE/),
    });
    expect(parseOAuthReturn('mx.wera.cocina://auth/callback')).toMatchObject({ kind: 'failed' });
    expect(oauthOutcome({ type: 'success' })).toMatchObject({ kind: 'failed' });
    expect(oauthOutcome({ type: 'locked' })).toMatchObject({ kind: 'failed', detail: 'browser: locked' });
  });
});

describe('the client is in PKCE mode', () => {
  it('asks for the code flow, and reads no session from a URL', () => {
    const client = read('src/lib/supabase.ts');
    expect(client).toMatch(/flowType: 'pkce'/);
    expect(client).toMatch(/detectSessionInUrl: false/);
  });
});

describe('Apple’s sheet', () => {
  it('the name, once, in the order a Mexican name is written — and never an empty string', () => {
    expect(appleFullName({ givenName: ' Lupe ', middleName: null, familyName: 'Gómez  Ruiz' })).toBe('Lupe Gómez Ruiz');
    expect(appleFullName({ givenName: null, familyName: null })).toBeNull();
    expect(appleFullName(null)).toBeNull();
  });

  it('is stored only on a login that has no name yet', () => {
    expect(nameToStore('Lupe Gómez', undefined)).toBe('Lupe Gómez');
    expect(nameToStore('Lupe Gómez', 'Guadalupe Gómez')).toBeNull();
    expect(nameToStore(null, undefined)).toBeNull();
  });

  it('a token, with the code beside it; a failure without one', () => {
    expect(appleOutcome({ identityToken: 't', authorizationCode: 'c', fullName: { givenName: 'Lupe' } })).toEqual({
      kind: 'token',
      identityToken: 't',
      authorizationCode: 'c',
      fullName: 'Lupe',
    });
    expect(appleOutcome({ identityToken: 't', authorizationCode: '' })).toMatchObject({ authorizationCode: null });
    expect(appleOutcome({})).toMatchObject({ kind: 'failed' });
  });

  it('only the library’s one code is a closed sheet', () => {
    expect(appleThrown({ code: APPLE_CANCELLED_CODE })).toEqual({ kind: 'cancelled' });
    expect(appleThrown({ code: 'ERR_REQUEST_FAILED', message: 'no account' })).toEqual({
      kind: 'failed',
      detail: 'ERR_REQUEST_FAILED: no account',
    });
  });

  it('the nonce goes the right way round: the hash to Apple, the raw string to Supabase', () => {
    const provider = read('src/auth/AuthProvider.tsx');
    expect(provider).toMatch(/signInAsync\(\{[^}]*nonce: nonce\.hashed/s);
    expect(provider).not.toMatch(/signInAsync\(\{[^}]*nonce: nonce\.raw/s);
    expect(provider).toMatch(/signInWithIdToken\(\{\s*provider: APPLE_PROVIDER,[^}]*nonce: rawNonce/s);
    expect(provider).toMatch(/rawNonce = nonce\.raw/);
    expect(APPLE_PROVIDER).toBe('apple');
  });

  it('the build asks for the capability and loads the plugin that writes it', () => {
    expect(app.ios.usesAppleSignIn).toBe(true);
    expect(app.plugins).toContain('expo-apple-authentication');
  });
});

describe('the sign-in a phone holds when it cannot renew it', () => {
  const stored = JSON.stringify({ access_token: 'a', refresh_token: 'r', expires_at: 1, user: { id: 'u-1' } });

  it('is stored under the library’s own key for the project', () => {
    expect(sessionKeyOf('https://hweutzjhzvioswnjzqki.supabase.co')).toBe('sb-hweutzjhzvioswnjzqki-auth-token');
  });

  it('is what the library kept, when it answers null without signing out', () => {
    expect(sessionToHold('LOADED', null, stored)?.user.id).toBe('u-1');
    expect(sessionToHold('INITIAL_SESSION', null, stored)?.user.id).toBe('u-1');
  });

  it('is nothing after a sign-out, or when what is stored is not a session', () => {
    expect(sessionToHold('SIGNED_OUT', null, stored)).toBeNull();
    expect(heldSession('not json')).toBeNull();
    expect(heldSession(JSON.stringify({ access_token: 'a' }))).toBeNull();
    expect(heldSession(null)).toBeNull();
  });
});
