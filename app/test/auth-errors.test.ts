import { globSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { KNOWN_AUTH_CODES, authErrorKey, authErrorMessage } from '@/auth/errors';
import { ES } from '@/strings';

// ============================================================================
// WHAT A SHOPKEEPER IS TOLD WHEN SIGNING IN FAILS. Plan task 5a-iii-a.
//
// §2.11 admits this suite for the same reason it admits the money formatter:
// every assertion here pins A VALUE A CUSTOMER SEES. Nothing is rendered, no
// component is mounted, and no navigation is asserted.
// ============================================================================

const SPANISH = Object.values(ES.auth.errors);

/** An `AuthError` as supabase-js hands it over: a machine code and English prose. */
function authError(code: string, message: string) {
  return Object.assign(new Error(message), { name: 'AuthApiError', code, status: 400 });
}

describe('nothing the network said ever reaches the screen', () => {
  // ⚠️ THE ASSERTION THE WHOLE FILE IS FOR. "Invalid login credentials" in
  // front of a person with a queue is the failure the owner's own rule refuses:
  // we do the bookkeeping, they do not.
  it('answers every known code with one of the Spanish sentences', () => {
    expect(KNOWN_AUTH_CODES.length).toBeGreaterThan(0);
    for (const code of KNOWN_AUTH_CODES) {
      const said = authErrorMessage(authError(code, 'Invalid login credentials'));
      expect(SPANISH).toContain(said);
      expect(said).not.toContain('Invalid');
      expect(said).not.toContain(code);
    }
  });

  it('maps the three that decide what a person does next', () => {
    expect(authErrorKey(authError('invalid_credentials', 'Invalid login credentials'))).toBe('badCredentials');
    expect(authErrorKey(authError('user_already_exists', 'User already registered'))).toBe('emailTaken');
    expect(authErrorKey(authError('weak_password', 'Password should be at least 6 characters'))).toBe('passwordShort');
  });

  // Wrong password and no-such-account are ONE message on purpose: telling them
  // apart tells a stranger whether an address has an account here.
  it('does not distinguish a wrong password from a missing account', () => {
    expect(authErrorMessage(authError('invalid_credentials', 'x'))).toBe(
      authErrorMessage(authError('user_not_found', 'y')),
    );
  });

  // The pilot store is offline routinely, so this is the common failure, not
  // the exotic one — and it arrives with no code at all.
  it('recognises being offline from both shapes it arrives in', () => {
    expect(authErrorKey(Object.assign(new Error('Load failed'), { name: 'AuthRetryableFetchError' }))).toBe('offline');
    expect(authErrorKey(new TypeError('Network request failed'))).toBe('offline');
    expect(authErrorKey(new TypeError('fetch failed'))).toBe('offline');
    expect(authErrorMessage(new TypeError('Network request failed'))).toBe(ES.auth.errors.offline);
  });

  it('falls back rather than guessing, for anything at all', () => {
    expect(authErrorKey(authError('some_code_added_next_year', 'Whatever'))).toBe('unknown');
    expect(authErrorKey(null)).toBe('unknown');
    expect(authErrorKey(undefined)).toBe('unknown');
    expect(authErrorKey('a string')).toBe('unknown');
    expect(authErrorKey({})).toBe('unknown');
    expect(authErrorMessage({ code: 42 })).toBe(ES.auth.errors.unknown);
  });

  it('says all of it in Spanish', () => {
    for (const sentence of SPANISH) {
      expect(sentence.length).toBeGreaterThan(0);
      // A sentence a person reads, not a machine code: no snake_case anywhere.
      expect(sentence).not.toMatch(/_/);
      expect(sentence).toMatch(/^[A-ZÁÉÍÓÚÑ¿¡]/);
    }
    expect(SPANISH.join(' ')).toMatch(/contraseña/i);
    expect(SPANISH.join(' ')).toMatch(/correo/i);
  });
});

// ============================================================================
// ⚠️ A SOURCE-TEXT CHECK, AND IT IS HERE FOR 5a-ii's F9. That task found an
// assertion that ran, passed, and could not tell a string typed in place from
// the centralised one, because both are the same value once the module loads.
// The map in `errors.ts` is immune by construction — its values are KEYS of
// `ES.auth.errors`, and a sentence is not a key (TS2820). What no type can see
// is a SCREEN reaching past all of it: `<Text>{error.message}</Text>`, or a
// second component calling `supabase.auth` directly and handling its own
// failures in English. That is the §2.11 boundary — "juniors never call
// supabase.rpc directly" — asserted one step early, for auth.
// ============================================================================
describe('the library has exactly one caller', () => {
  const SRC = fileURLToPath(new URL('../src', import.meta.url));

  /** Every `.ts`/`.tsx` under `src/`, read as text. */
  function sources(): ReadonlyArray<readonly [string, string]> {
    const files = globSync('**/*.{ts,tsx}', { cwd: SRC }).sort();
    return files.map((rel) => [rel, readFileSync(`${SRC}/${rel}`, 'utf8')] as const);
  }

  it('reads a source tree, so it cannot pass vacuously', () => {
    const files = sources();
    expect(files.length).toBeGreaterThan(8);
    expect(files.map(([rel]) => rel)).toContain('auth/AuthProvider.tsx');
  });

  it('touches `supabase.auth` in AuthProvider and nowhere else', () => {
    const callers = sources()
      .filter(([, text]) => /supabase\.auth\./.test(text))
      .map(([rel]) => rel);
    expect(callers).toEqual(['auth/AuthProvider.tsx', 'lib/supabase.ts']);
  });

  it('imports the client only where the session is owned', () => {
    const importers = sources()
      .filter(([rel, text]) => rel !== 'lib/supabase.ts' && /from '@\/lib\/supabase'/.test(text))
      .map(([rel]) => rel);
    expect(importers).toEqual(['auth/AuthProvider.tsx']);
  });
});
