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
//
// ⚠️ `10.5-v-d`, THE FIRST RUN (the family-shell page, ruled 2026-11-05): a stranger is
// sent to the opening (`/hola`, Wera's `8g` rule), never straight to the form; and a
// login whose kitchen appears WHILE SHE IS IN THE SIGN-UP has just made it — *Registrar
// mi cocina* — so she goes on to the first run's last screens (her kitchen's room), not to
// *Hoy*. Nobody else is ever in the sign-up with a kitchen: the guard keeps a login with
// one out of it, and a cold start is never there.
//
// ⚠️ `10.9a-ii` (G32, the owner's ruling of 2026-11-17: no first offer in the first run):
// those screens are *Paso 3 de 3*, *¿Qué más quieres usar?* (`/que-mas`), while this build
// carries a feature to pick (`@/lib/loQueUsas`' `pasos`, the same count *Paso 1 de N* drew),
// else her page as her neighbours see it at once (`/ya-estas`). *¿Qué ofreces hoy?* is gone.
// ============================================================================

import type { Membership } from '@/api/kitchen';
import { pasos } from '@/lib/loQueUsas';

/** The route group a screen lives in. `null` is anything outside the three. */
export type RouteGroup = 'auth' | 'onboarding' | 'cocina' | null;

/** Where the app is told to go, or `null` for "stay where you are". */
export type Redirect = '/hola' | '/registro' | '/que-mas' | '/ya-estas' | '/' | null;

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
  if (!hasSession) return group === 'auth' ? null : '/hola';
  if (membership === 'unknown') return null;
  if (membership === 'none') return group === 'onboarding' ? null : '/registro';
  if (group === 'onboarding') return pasos() === 3 ? '/que-mas' : '/ya-estas';
  return group === 'auth' ? '/' : null;
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
