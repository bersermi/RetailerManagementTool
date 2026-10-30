// ============================================================================
// THE SIGN-IN A PHONE STILL HOLDS WHEN IT CANNOT RENEW IT. Plan task `10.4b-iii-a`.
//
// ⚠️ WERA'S RULE, COPIED (`app/src/auth/held.ts`, plan `8g`, read in `auth-js`
// 2.116): opened with an access token over an hour old and no signal, the library
// cannot renew it, KEEPS it stored — and `getSession()` answers `null`. The
// guard would then send her to *Entrar* in her own kitchen until the signal came
// back. The rule is the library's own storage: the session the app holds is the
// one `auth-js` has not thrown away; it removes it exactly when the sign-in is
// over, and says `SIGNED_OUT` when it does. The fence does not move — every
// request still goes through supabase-js, which renews before it sends.
//
// ⚠️ PURE, so `test/auth-held.test.ts` reads it; the storage read is in `AuthProvider`.
// ============================================================================

import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

/**
 * The key `supabase-js` stores the session under, for a project's URL — the
 * library's default, re-derived (the client keeps it `protected`).
 */
export function sessionKeyOf(url: string): string {
  return `sb-${new URL(url).hostname.split('.')[0]}-auth-token`;
}

/** The stored session, if the text is one: the fields `auth-js` checks, and the user's id. */
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

/** What the app holds after the library speaks. Only `SIGNED_OUT`'s `null` is taken at its word. */
export function sessionToHold(
  event: AuthChangeEvent | 'LOADED',
  next: Session | null,
  stored: string | null,
): Session | null {
  if (next !== null) return next;
  if (event === 'SIGNED_OUT') return null;
  return heldSession(stored);
}
