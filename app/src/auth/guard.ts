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
// ============================================================================

/** The route group a screen lives in. `null` is anything outside both. */
export type RouteGroup = 'auth' | 'app' | null;

/** Where the app is told to go, or `null` for "stay where you are". */
export type Redirect = '/entrar' | '/' | null;

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
  readonly group: RouteGroup;
}

/**
 * The route to redirect to, or `null` to stay put.
 *
 * The whole of C1.4's guard, as a value: a signed-out person belongs at the way
 * in, a signed-in one does not, and until the session has been LOOKED FOR
 * nobody is moved anywhere.
 */
export function redirectFor({ ready, hasSession, group }: GuardState): Redirect {
  if (!ready) return null;
  if (!hasSession) return group === 'auth' ? null : '/entrar';
  return group === 'auth' ? '/' : null;
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
    default:
      return null;
  }
}
