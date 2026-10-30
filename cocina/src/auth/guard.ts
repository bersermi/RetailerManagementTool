// ============================================================================
// WHICH OF THREE ROOMS SHE BELONGS IN. Plan task `10.4b-iii-a`.
//
// ⚠️ WERA'S DECISION, AS A FUNCTION (`app/src/auth/guard.ts`, plans `5a-iii-a`
// and `5b-i`): the half that decides is pure and pinned by `test/guard.test.ts`;
// whether the router lands there is `_layout.tsx`'s effect, which no check can
// see (ADR-035 §2.11) — the phone is its instrument.
//
// Three rooms: the way in (`(auth)`), where a kitchen is made (`(onboarding)`),
// and her kitchen (`(cocina)`). Until the stored session has been LOOKED FOR,
// and then until her kitchens have been read, nobody is moved: acting on "no
// session yet" is the bug where a signed-in person is shown *Entrar* every
// morning, and on "no answer yet" the one where a fonda with a kitchen is shown
// the screen that makes one.
// ============================================================================

import type { Membership } from '@/api/kitchen';

/** The route group a screen lives in. `null` is anything outside the three. */
export type RouteGroup = 'auth' | 'onboarding' | 'cocina' | null;

/** Where the app is told to go, or `null` for "stay where you are". */
export type Redirect = '/entrar' | '/registro' | '/' | null;

export interface GuardState {
  /** Has the stored session been looked for yet? False on every cold start. */
  readonly ready: boolean;
  readonly hasSession: boolean;
  readonly membership: Membership;
  readonly group: RouteGroup;
}

/**
 * The route to redirect to, or `null` to stay put. The questions are asked in
 * this order because each needs the one before it to mean anything.
 *
 * ⚠️ A SHOP'S OWNER IS `none` HERE (Cocina reads kitchens only, `@/api/kitchen`),
 * so she is sent where a kitchen is made, exactly as a new fonda is — her shop
 * stays Wera's.
 */
export function redirectFor({ ready, hasSession, membership, group }: GuardState): Redirect {
  if (!ready) return null;
  if (!hasSession) return group === 'auth' ? null : '/entrar';
  if (membership === 'unknown') return null;
  if (membership === 'none') return group === 'onboarding' ? null : '/registro';
  return group === 'auth' || group === 'onboarding' ? '/' : null;
}

/** The group a set of Expo Router segments is in — the first segment, nothing else. */
export function groupOf(segments: readonly string[]): RouteGroup {
  switch (segments[0]) {
    case '(auth)':
      return 'auth';
    case '(onboarding)':
      return 'onboarding';
    case '(cocina)':
      return 'cocina';
    default:
      return null;
  }
}
