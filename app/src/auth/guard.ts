// ============================================================================
// WHICH SIDE OF THE DOOR THE APP SHOULD BE ON. Plan task 5a-iii-a.
//
// ⚠️ WHY THIS IS A FUNCTION AND NOT AN `useEffect` FULL OF `router.replace`.
// ADR-035 §2.11 permits a unit test where it pins a VALUE and refuses suites
// over rendering, navigation and layout — and the plan already drew this exact
// line for `5a-iii-b`, before either half was written: the half that is
// testable is the one that DECIDES, "a pure function over (stored, session)
// returning a route", and the half that is not is whether the router actually
// lands there. This is that decision, lifted out of the effect that acts on it.
//
// ⚠️ SO WHAT NO CHECK IN THIS REPOSITORY CAN SEE, NAMED HERE: that the
// redirect fires at all. `_layout.tsx` could drop the effect, or call it with
// the wrong segment, and every assertion in `app/test/guard.test.ts` would stay
// green while the app showed the tab bar to a stranger. That belongs to the
// owner holding the phone in `5a-iv` — which is now the third deliverable in
// step 5a resting on that task alone, after C12.1's tab labels and C1.4's
// "the session persists until an explicit log-out".
//
// ⚠️ 5b-i ADDED A THIRD STATE AND CHANGED NOTHING ELSE. The function still
// decides and still returns a string; what grew is the question it answers —
// "which side of the door" became "which of three rooms", because a signed-in
// person who belongs to no shop is neither a stranger nor a shopkeeper. The
// membership it reads is a SERVER read (`@/api/workspace`), so this is also the
// first time this file's answer depends on something that can be slow, and the
// `unknown` case is the whole of what that costs.
// ============================================================================

import type { Membership } from '@/api/workspace';

/** The route group a screen lives in. `null` is anything outside all three. */
export type RouteGroup = 'auth' | 'app' | 'onboarding' | null;

/** Where the app is told to go, or `null` for "stay where you are". */
export type Redirect = '/entrar' | '/' | '/bienvenida' | null;

export interface GuardState {
  /**
   * Has the stored session been looked for yet? ⚠️ FALSE ON EVERY COLD START,
   * INCLUDING A SIGNED-IN ONE. Reading the session out of `expo-sqlite` is
   * asynchronous, so for the first frames of every launch "no session" and
   * "not yet asked" are the same value — and acting on it is the bug where a
   * signed-in shopkeeper is shown the sign-in screen every morning, which
   * looks exactly like C1.4's persistence being broken.
   */
  readonly ready: boolean;
  readonly hasSession: boolean;
  /**
   * Does this person belong to a shop yet? ⚠️ ADDED IN 5b-i, AND IT HAS THE
   * SAME THREE-VALUED SHAPE AS `ready` FOR THE SAME REASON. `unknown` is "the
   * read has not come back", not "no". Collapsing it into `none` sends a
   * shopkeeper who has had a shop since March to a screen inviting her to
   * create one, every time the app opens on a slow connection — the identical
   * bug to K5 above, one table further out. See `@/api/workspace`.
   */
  readonly membership: Membership;
  readonly group: RouteGroup;
}

/**
 * The route to redirect to, or `null` to stay put.
 *
 * C1.4's guard and 5b-i's landing, as one value. A signed-out person belongs at
 * the way in; a signed-in person who belongs to no shop belongs at the screen
 * that creates one; everybody else belongs where they already are. Until the
 * session has been LOOKED FOR, and then until the membership has, nobody is
 * moved anywhere.
 *
 * ⚠️ THE THREE QUESTIONS ARE ASKED IN THIS ORDER AND THE ORDER IS THE DESIGN.
 * Membership is a read that needs a session to mean anything, so it is asked
 * after one is known to exist — which is also why a signed-out person is never
 * waiting on it.
 */
export function redirectFor({ ready, hasSession, membership, group }: GuardState): Redirect {
  if (!ready) return null;
  if (!hasSession) return group === 'auth' ? null : '/entrar';

  // Signed in, and we do not yet know whether they have a shop. Moving them now
  // is guessing, and both guesses are wrong for half the people who launch.
  if (membership === 'unknown') return null;

  // ⚠️ SIGNED IN AND BELONGING NOWHERE IS A REAL, ORDINARY STATE, NOT AN ERROR.
  // It is every first launch after a sign-up, and from 5b-iii it is also the
  // person waiting for an owner to approve them. They are sent OUT of the tabs
  // as firmly as a stranger is: a shop's screens with no shop behind them is a
  // Vender that cannot sell and a Numeros with nothing in it.
  if (membership === 'none') return group === 'onboarding' ? null : '/bienvenida';

  // They have a shop. The way in and the landing are both behind them now.
  return group === 'auth' || group === 'onboarding' ? '/' : null;
}

/**
 * The group a set of Expo Router segments is in.
 *
 * ⚠️ IT READS THE FIRST SEGMENT AND NOTHING ELSE. `useSegments()` returns the
 * route as an array — `['(auth)', 'entrar']` — and the guard's question is only
 * ever about the group. Anything that is neither group (a not-found route, a
 * modal added later) is `null`, and `redirectFor` treats it as somewhere a
 * signed-out person may not be, which is the safe direction for a default.
 */
export function groupOf(segments: readonly string[]): RouteGroup {
  switch (segments[0]) {
    case '(auth)':
      return 'auth';
    case '(tabs)':
      return 'app';
    case '(onboarding)':
      return 'onboarding';
    default:
      return null;
  }
}
