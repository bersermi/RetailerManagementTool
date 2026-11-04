// ============================================================================
// WHICH OF TWO ROOMS SHE BELONGS IN. Plan task `10.5-iii-a`.
//
// ⚠️ WERA'S DECISION, AS A FUNCTION (`app/src/auth/guard.ts`, plans `5a-iii-a`
// and `5b-i`; Wera Cocina's copy, with a third room, is `cocina/src/auth/guard.ts`):
// the half that decides is pure and pinned by `test/guard.test.ts`; whether the
// router lands there is `_layout.tsx`'s effect, which no check can see (ADR-035
// §2.11) — the phone is its instrument.
//
// Two rooms: the way in (`(auth)`) and the app (`(vecino)`). A neighbour is no
// business's member (ADR-035 §2.7), so nothing is read to decide: a session is
// the whole answer — a shop's owner or a fonda signing in with her Wera login
// lands where any neighbour does. Until the stored session has been LOOKED FOR,
// nobody is moved: acting on "no session yet" is the bug where a signed-in
// person is shown *Entrar* every morning.
// ============================================================================

/** The route group a screen lives in. `null` is anything outside the two. */
export type RouteGroup = 'auth' | 'vecino' | null;

/** Where the app is told to go, or `null` for "stay where you are". */
export type Redirect = '/entrar' | '/' | null;

export interface GuardState {
  /** Has the stored session been looked for yet? False on every cold start. */
  readonly ready: boolean;
  readonly hasSession: boolean;
  readonly group: RouteGroup;
}

/** The route to redirect to, or `null` to stay put. */
export function redirectFor({ ready, hasSession, group }: GuardState): Redirect {
  if (!ready) return null;
  if (!hasSession) return group === 'auth' ? null : '/entrar';
  return group === 'auth' ? '/' : null;
}

/** The group a set of Expo Router segments is in — the first segment, nothing else. */
export function groupOf(segments: readonly string[]): RouteGroup {
  switch (segments[0]) {
    case '(auth)':
      return 'auth';
    case '(vecino)':
      return 'vecino';
    default:
      return null;
  }
}
