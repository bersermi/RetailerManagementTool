// ============================================================================
// THE SIGN-IN A PHONE STILL HOLDS WHEN IT CANNOT RENEW IT. Plan task `8g`, the
// offline report's proposal B, ruled 2026-10-20 by the owner: *"Go ahead with A
// and B before the Android users"* — opening offline never shows *Entrar*.
//
// ⚠️⚠️ WHAT WAS WRONG, READ IN `auth-js` 2.116 (`__loadSession`,
// `_callRefreshToken`): an access token lives an hour. Opened with an older one
// and no signal, the library tries to renew it, the request fails RETRYABLY, and
// it KEEPS the session in storage — but `getSession()` answers `null`, and so
// does `onAuthStateChange`'s `INITIAL_SESSION`. `@/auth/guard` then sent a
// shopkeeper standing in her own shop to *Entrar* until the signal came back.
//
// ✅ THE RULE IS THE LIBRARY'S OWN STORAGE: the session the app holds is the one
// `auth-js` has not thrown away. It removes it in exactly the cases where the
// sign-in is over — the server refused the renewal, or the stored shape is
// invalid — and emits `SIGNED_OUT` when it does. A session still on disk after
// a `null` is one that could not be renewed for lack of a signal, and the
// renewal happens by itself when the signal returns (`TOKEN_REFRESHED`), which
// replaces it.
//
// ⚠️ THE FENCE DOES NOT MOVE. An expired access token reaches nothing on the
// server; every request still goes through `supabase-js`, which renews before
// it sends. What the held session buys is the app on her screen — the catalog,
// the counters and the queue — not a single row she could not read before.
//
// ⚠️ PURE, so `app/test/auth-held.test.ts` reads it: the storage read and the
// state live in `AuthProvider`.
// ============================================================================

import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

/**
 * The key `supabase-js` stores the session under, for a project's URL.
 *
 * ⚠️ IT IS THE LIBRARY'S DEFAULT, RE-DERIVED, BECAUSE THE CLIENT KEEPS IT
 * `protected`. Passing an explicit key instead would move every phone's session
 * to a new key on the next update and sign every pilot shop out at once; the
 * suite holds this to the library's own derivation instead.
 */
export function sessionKeyOf(url: string): string {
  return `sb-${new URL(url).hostname.split('.')[0]}-auth-token`;
}

/**
 * The stored session, if the text is one.
 *
 * ⚠️ THE SAME THREE FIELDS `auth-js`'s `_isValidSession` ASKS FOR, plus the
 * user's id, which every read here is scoped by. Anything else — absent, not
 * JSON, a different shape — is no session, which is what the library would say.
 */
export function heldSession(stored: string | null): Session | null {
  if (stored === null) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(stored);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const s = parsed as Record<string, unknown>;
  const user = s.user as Record<string, unknown> | null | undefined;
  const valid =
    typeof s.access_token === 'string' &&
    typeof s.refresh_token === 'string' &&
    typeof s.expires_at === 'number' &&
    typeof user === 'object' &&
    user !== null &&
    typeof user.id === 'string';
  return valid ? (parsed as Session) : null;
}

/**
 * What the app holds after the library speaks.
 *
 * ⚠️ `SIGNED_OUT` IS THE ONLY `null` TAKEN AT ITS WORD — it is what the library
 * emits after it has removed the session. Every other `null` (the read at
 * launch, `INITIAL_SESSION`) is checked against what is still stored.
 */
export function sessionToHold(
  event: AuthChangeEvent | 'LOADED',
  next: Session | null,
  stored: string | null,
): Session | null {
  if (next !== null) return next;
  if (event === 'SIGNED_OUT') return null;
  return heldSession(stored);
}
