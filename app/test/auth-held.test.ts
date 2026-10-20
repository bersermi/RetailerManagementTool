// ============================================================================
// THE SIGN-IN A PHONE STILL HOLDS WHEN IT CANNOT RENEW IT — `@/auth/held`, plan
// task `8g`, the offline report's proposal B (ruled 2026-10-20).
//
// ⚠️ WHAT THIS CAN AND CANNOT SEE. It proves the rule — which `null` is taken at
// its word, which is checked against the store, and that the store is read under
// the key the library actually writes. It cannot see a phone opening offline
// with an hour-old sign-in; that is the emulator's, and the status log records
// the reading.
// ============================================================================

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { createClient, type Session } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

import { heldSession, sessionKeyOf, sessionToHold } from '@/auth/held';

/** A stored session as `auth-js` writes it, an hour past its expiry. */
const STORED = JSON.stringify({
  access_token: 'eyJ.expired',
  refresh_token: 'r3fr3sh',
  expires_at: 1_700_000_000,
  expires_in: 3600,
  token_type: 'bearer',
  user: { id: '6f1c0f8e-0000-4000-8000-000000000001', email: 'marisol@tienda.mx' },
});

describe('the key is the one the library writes', () => {
  // ⚠️⚠️ A WRONG KEY READS NOTHING, AND NOTHING READ IS *Entrar* AGAIN — so
  // the derivation is held to the client's own, not to a literal.
  for (const url of [
    'https://hweutzjhzvioswnjzqki.supabase.co',
    'https://10.0.2.2:54443',
    'http://127.0.0.1:54321',
  ]) {
    it(`matches supabase-js for ${url}`, () => {
      const client = createClient(url, 'sb_publishable_test', {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      expect(sessionKeyOf(url)).toBe(Reflect.get(client, 'storageKey'));
    });
  }

  it('is the hosted project key the persist suite already names', () => {
    expect(sessionKeyOf('https://hweutzjhzvioswnjzqki.supabase.co')).toBe(
      'sb-hweutzjhzvioswnjzqki-auth-token',
    );
  });
});

describe('what counts as a held session', () => {
  it('takes a stored session whose access token has expired', () => {
    // ⚠️ THE WHOLE POINT: expiry is not death. The library kept it because it
    // could not reach the server to renew it.
    expect(heldSession(STORED)?.user.id).toBe('6f1c0f8e-0000-4000-8000-000000000001');
  });

  it('refuses nothing stored, text that is not JSON, and JSON that is not a session', () => {
    expect(heldSession(null)).toBeNull();
    expect(heldSession('')).toBeNull();
    expect(heldSession('{')).toBeNull();
    expect(heldSession('null')).toBeNull();
    expect(heldSession('"text"')).toBeNull();
    expect(heldSession('{"access_token":"a"}')).toBeNull();
  });

  it('refuses a session without the fields the library itself checks, or a user', () => {
    const base = JSON.parse(STORED) as Record<string, unknown>;
    for (const field of ['access_token', 'refresh_token', 'expires_at', 'user']) {
      const { [field]: _gone, ...rest } = base;
      expect(heldSession(JSON.stringify(rest))).toBeNull();
    }
    expect(heldSession(JSON.stringify({ ...base, user: {} }))).toBeNull();
    expect(heldSession(JSON.stringify({ ...base, expires_at: '1700000000' }))).toBeNull();
  });
});

describe('which null is taken at its word', () => {
  const fresh = { access_token: 'new', user: { id: 'u' } } as unknown as Session;

  it('takes a session the library hands over, whatever is stored', () => {
    expect(sessionToHold('TOKEN_REFRESHED', fresh, STORED)).toBe(fresh);
    expect(sessionToHold('LOADED', fresh, null)).toBe(fresh);
  });

  it('keeps the stored sign-in when the launch read or INITIAL_SESSION says null', () => {
    // ⚠️⚠️ THE BUG: offline with an hour-old sign-in, both say `null` while the
    // library keeps the session on disk, and the guard sent her to *Entrar*.
    expect(sessionToHold('LOADED', null, STORED)?.refresh_token).toBe('r3fr3sh');
    expect(sessionToHold('INITIAL_SESSION', null, STORED)?.refresh_token).toBe('r3fr3sh');
  });

  it('is signed out when nothing is stored — the library removed it because the sign-in is over', () => {
    expect(sessionToHold('LOADED', null, null)).toBeNull();
    expect(sessionToHold('INITIAL_SESSION', null, null)).toBeNull();
  });

  it('takes SIGNED_OUT at its word even if something is still stored', () => {
    expect(sessionToHold('SIGNED_OUT', null, STORED)).toBeNull();
  });
});

describe('the provider asks the rule rather than restating it', () => {
  // ⚠️ READ AS TEXT, COMMENTS STRIPPED — `api-persist.test.ts`'s trade: the
  // provider is a component this suite cannot mount.
  const code = readFileSync(
    fileURLToPath(new URL('../src/auth/AuthProvider.tsx', import.meta.url)),
    'utf8',
  )
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');

  it('reads a real file', () => {
    expect(code.length).toBeGreaterThan(400);
  });

  it('passes the launch read and every auth event through `sessionToHold`', () => {
    expect(code).toMatch(/setSession\(sessionToHold\('LOADED', data\.session, storedSession\(\)\)\)/);
    expect(code).toMatch(/onAuthStateChange\(\(event, next\) => \{\s*setSession\(sessionToHold\(event, next, storedSession\(\)\)\)/);
    expect(code).not.toMatch(/setSession\(data\.session\)/);
    expect(code).not.toMatch(/setSession\(next\)/);
  });

  it('reads the store under the derived key', () => {
    expect(code).toMatch(/const SESSION_KEY = sessionKeyOf\(SUPABASE_URL\)/);
    expect(code).toMatch(/readKey\(deviceStore\(\), SESSION_KEY\)/);
  });

  it('forgets the sign-in itself when the library refuses to sign out offline', () => {
    // ⚠️⚠️ WITHOUT THIS, *Cerrar sesión* WOULD DO NOTHING: offline, `_signOut`
    // returns the renewal's failure and removes nothing, and the held session
    // keeps her in.
    expect(code).toMatch(
      /const \{ error \} = await supabase\.auth\.signOut\(\);\s*if \(error\) \{\s*removeKey\(deviceStore\(\), SESSION_KEY\);\s*setSession\(null\);/,
    );
  });
});
