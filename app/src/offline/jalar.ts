// ============================================================================
// PULLING DOWN TO REFRESH. Plan task `8g`, the offline report's E (ruled
// 2026-10-20 by the owner: *"Do all the fixes"*), over his words before it:
// *"We want to avoid as much as possible a dedicated refresh/update button
// accross all screens."*
//
// ⚠️⚠️ IT IS THE QUIET EXTRA AND NOT THE MECHANISM. Since the same day the app
// refreshes by itself when the signal returns and when she comes back to it
// (`@/api/QueryProvider`), so the pull is rarely needed — it is the gesture a
// person already knows, for the moment she wants to be sure. No button is drawn.
//
// ⚠️ ON THE READING SCREENS ONLY — Inicio, Lo último, Números, Productos,
// Proveedores and Solicitudes. NEVER THE THREE COUNTERS: a pull while selling
// would reload the list under her thumb.
//
// ⚠️ PURE, so `app/test/offline-jalar.test.ts` reads it; the hook is
// `@/offline/useRefresh` and the control is `@/ui/Jalar`.
// ============================================================================

import type { Online } from '@/api/connectivity';

/**
 * How long the spinner may turn before it is let go, in milliseconds.
 *
 * ⚠️ A CAP, BECAUSE ANDROID'S REQUESTS HAVE NO TIMEOUT OF THEIR OWN (the
 * report's notes: OkHttp "No timeouts by default"). On a link that is connected
 * with no internet behind it, a refresh can hang; the spinner must not hang with
 * it. The reads carry on after it is let go and land when they land.
 */
export const REFRESH_CAP_MS = 8_000;

/**
 * Offline, the spinner turns for this long and nothing is asked.
 *
 * ⚠️ LONG ENOUGH TO READ AS AN ANSWER, SHORT ENOUGH NOT TO WAIT: the notice at
 * the bottom already says why, and every read refreshes by itself when the
 * signal returns.
 */
export const OFFLINE_PULL_MS = 600;

/**
 * Does a pull ask the server? ⚠️ `null` — nothing has read the network yet —
 * is asked, the way every read is: unknown is not offline.
 */
export function refetchesOnPull(online: Online): boolean {
  return online !== false;
}
