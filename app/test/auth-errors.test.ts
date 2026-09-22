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

  // ⚠️ TWO OWNERS AS OF 5b-i, AND THE SECOND ONE IS §2.11's OTHER HALF. The
  // session is owned by `AuthProvider`; every ROW is owned by `api/calls.ts` —
  // "src/api/: one wrapper per RPC, juniors never call supabase.rpc directly".
  // This list growing a third entry is the boundary going, and it goes the way
  // it always goes: one screen, in a hurry, reading one table for itself.
  it('imports the client only where the session and the rows are owned', () => {
    const importers = sources()
      .filter(([rel, text]) => rel !== 'lib/supabase.ts' && /from '@\/lib\/supabase'/.test(text))
      .map(([rel]) => rel);
    expect(importers).toEqual(['api/calls.ts', 'auth/AuthProvider.tsx']);
  });

  // The write path, asserted the same way the auth path is above.
  it('calls `supabase.rpc` and `supabase.from` in api/calls.ts and nowhere else', () => {
    const callers = sources()
      .filter(([rel, text]) => rel !== 'lib/supabase.ts' && /supabase\.(rpc|from)\(/.test(text))
      .map(([rel]) => rel);
    expect(callers).toEqual(['api/calls.ts']);
  });

  // ⚠️⚠️ THE SECOND STORAGE ENGINE, PINNED THE SAME WAY — ADDED AT 5c-i. There
  // are now two things in this app that reach SQLite: `lib/supabase.ts`
  // installs it as the session's `localStorage`, and `lib/outboxDb.ts` opens
  // the queue's own database file. ⚠️ A THIRD ENTRY HERE IS A SCREEN THAT
  // OPENED THE QUEUE FOR ITSELF, which is the same failure as a screen calling
  // `supabase.rpc` and it is worse: §2.6 makes the outbox the only write path,
  // so a second opener is a sale written by a route that never learned about
  // `pending`, `flushing` or `dead`. It goes the way it always goes — one
  // screen, in a hurry, reading one table for itself.
  it('reaches expo-sqlite in the session store and the outbox, and nowhere else', () => {
    const openers = sources()
      .filter(([, text]) => /from 'expo-sqlite|import 'expo-sqlite/.test(text))
      .map(([rel]) => rel);
    expect(openers).toEqual(['lib/outboxDb.ts', 'lib/supabase.ts']);
  });

  // ⚠️⚠️ THE CONNECTIVITY LIBRARY, PINNED THE SAME WAY — ADDED AT 5c-ii-b-2,
  // AND IT IS THE ONLY INSTRUMENT THIS REPOSITORY HAS FOR THAT TASK'S CENTRAL
  // CONSTRAINT: *one module owns the native import and every other file reads
  // the signal, never the library.* `5c-iv` draws C10.1's "Sin conexión a
  // internet" from the same fact `@/lib/connectivityMonitor` drains on, so a
  // second `expo-network` subscription is a banner and a drain that can
  // disagree about whether the shop is online — and §2.11 keeps rendering out
  // of scope, so nothing else here would ever see them disagree. A second entry
  // in this list is that, and it goes the way it always goes: one screen, in a
  // hurry, asking the library directly because it is one line.
  it('imports expo-network in the connectivity monitor and nowhere else', () => {
    const importers = sources()
      .filter(([, text]) => /from 'expo-network|import 'expo-network/.test(text))
      .map(([rel]) => rel);
    expect(importers).toEqual(['lib/connectivityMonitor.ts']);
  });

  // ⚠️ AND THE MACHINE HAS EXACTLY ONE DRIVER, which is the same claim one
  // layer down. `@/api/connectivity` holds a state — the debounce, the ladder,
  // whether the poll should be running — so two modules stepping it are two
  // answers to "is the shop online?", arrived at from the same events. The
  // offline surfaces read `subscribe()` from the monitor; they do not step the
  // machine for themselves.
  //
  // ⚠️⚠️ `import type` IS EXCLUDED, AND THE EXCLUSION IS THE CLAIM RATHER THAN A
  // CONCESSION. This assertion first read every import and fired on `5c-iv-a`'s
  // `import type { Online }` in `offline/notice.ts` — a line TypeScript erases,
  // which cannot call `step`, cannot hold state and cannot disagree with
  // anything. A guard that goes red on an erased line teaches the next person to
  // loosen it, and the version they would reach for is the one that stops
  // reading imports at all. ⚠️ The word `type` must follow `import` directly:
  // `import { type Online, step }` is a VALUE import and still counts.
  it('steps the connectivity machine from one module only', () => {
    const drivers = sources()
      .filter(([, text]) =>
        /(^|\n)import(?!\s+type\s)[^;]*from '@\/api\/connectivity'/.test(text),
      )
      .map(([rel]) => rel);
    expect(drivers).toEqual(['lib/connectivityMonitor.ts']);
  });

  // ⚠️ `AppState` HAS TWO LEGITIMATE OWNERS AND THAT IS NOT THE SAME CLAIM.
  // `lib/supabase.ts` drives auth auto-refresh off it (5a-iii); the monitor
  // drives the flush wake off it. They are different subjects over one core
  // API, so this is pinned as an EQUALITY at two rather than argued down to
  // one — a third entry is a screen that started its own lifecycle listener.
  it('listens to AppState in the session store and the connectivity monitor only', () => {
    const listeners = sources()
      .filter(([, text]) => /AppState\.addEventListener\(/.test(text))
      .map(([rel]) => rel);
    expect(listeners).toEqual(['lib/connectivityMonitor.ts', 'lib/supabase.ts']);
  });

  // ⚠️⚠️ AND THE QUEUE HAS EXACTLY TWO READERS — ADDED AT 5c-iv-b, WHICH IS
  // WHAT MADE THE LIST TWO. `lib/outboxDb.ts` is pinned as the only module that
  // touches `expo-sqlite` above; this is the list one layer out, of the modules
  // that go through it. The flusher DRAINS the queue and the dead-letter banner
  // COUNTS it, and neither is a screen.
  //
  // ⚠️ A THIRD ENTRY IS THE FAILURE §2.6 CANNOT SURVIVE: the outbox is the only
  // write path, so a route that opened it for itself would be a sale written by
  // a file that never learned about `pending`, `flushing` or `dead`. ⚠️ The
  // banner is `src/offline/`, deliberately not `src/app/` — a reader that
  // appears under `src/app/` is the shape this pins against even though the
  // path alone would still satisfy the equality, so the list is read with its
  // directory attached.
  it('reads the outbox from the flusher and the dead-letter banner only', () => {
    const readers = sources()
      .filter(([, text]) => /from '@\/lib\/outboxDb'/.test(text))
      .map(([rel]) => rel);
    expect(readers).toEqual(['lib/flushRunner.ts', 'offline/DeadLetterBanner.tsx']);
  });

  // ⚠️ AND THE QUEUE HAS EXACTLY ONE TRIGGER. `lib/flushRunner.ts` holds the
  // app's ONE flusher, which is what makes `@/api/flush`'s single-flight gate
  // mean anything; a second caller of it is a second drain over one queue,
  // reading the same `pending` row. ⚠️ It sat with NO caller from 5c-ii-a until
  // this task, which is why the list is one entry and not two.
  it('calls the app flusher from the connectivity monitor and nowhere else', () => {
    const callers = sources()
      .filter(([, text]) => /from '@\/lib\/flushRunner'/.test(text))
      .map(([rel]) => rel);
    expect(callers).toEqual(['lib/connectivityMonitor.ts']);
  });
});
