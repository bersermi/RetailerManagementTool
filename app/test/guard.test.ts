import { describe, expect, it } from 'vitest';

import { groupOf, redirectFor, type RouteGroup } from '@/auth/guard';
import type { Membership } from '@/api/workspace';

// ============================================================================
// WHICH SIDE OF THE DOOR. Plan task 5a-iii-a.
//
// ⚠️ THIS IS THE ADMITTED HALF OF A DELIVERABLE THAT IS PART NAVIGATION, AND
// THE LINE WAS DRAWN BEFORE EITHER HALF WAS WRITTEN. The plan's sizing of
// `5a-iii-b` says it in terms: the testable half is the one that DECIDES —
// a pure function over a stored value and a session, returning a route — and
// the half no test in this repository can see is whether the router actually
// lands there. §2.11 refuses suites over navigation; it does not refuse a
// function that returns a string.
//
// ⚠️ SO WHAT STAYS GREEN WHILE THE APP IS BROKEN: `_layout.tsx` dropping the
// effect, or passing it the wrong segments. `5a-iv` — the owner's own phone —
// is the instrument, and this is the THIRD deliverable in step 5a resting on
// that task alone.
// ============================================================================

const GROUPS: readonly RouteGroup[] = ['auth', 'app', 'onboarding', null];
const MEMBERSHIPS: readonly Membership[] = ['unknown', 'none', 'member'];

describe('nobody is moved until the stored session has been looked for', () => {
  // ⚠️ THE BUG THIS PREVENTS IS THE ONE THAT LOOKS EXACTLY LIKE C1.4 FAILING.
  // Reading the session out of `expo-sqlite` is asynchronous, so for the first
  // frames of EVERY cold start — including a signed-in one — `hasSession` is
  // false because nothing has asked yet. Acting on it sends a shopkeeper who
  // never logged out back to the sign-in screen every single morning.
  it('stays put on a cold start, signed in or not, wherever it is', () => {
    for (const group of GROUPS) {
      for (const membership of MEMBERSHIPS) {
        expect(redirectFor({ ready: false, hasSession: false, membership, group })).toBeNull();
        expect(redirectFor({ ready: false, hasSession: true, membership, group })).toBeNull();
      }
    }
  });
});

describe('once the session is known', () => {
  // ⚠️ A SIGNED-OUT PERSON IS DECIDED WITHOUT THE MEMBERSHIP EVER BEING READ,
  // and asserting it across all three values is the point: the read needs a
  // session to mean anything, so a stranger must never be left waiting on one.
  it('sends a signed-out person to the way in, from anywhere else', () => {
    for (const membership of MEMBERSHIPS) {
      expect(redirectFor({ ready: true, hasSession: false, membership, group: 'app' })).toBe('/entrar');
      expect(redirectFor({ ready: true, hasSession: false, membership, group: 'onboarding' })).toBe('/entrar');
      expect(redirectFor({ ready: true, hasSession: false, membership, group: null })).toBe('/entrar');
    }
  });

  it('leaves a signed-out person alone once they are there — no redirect loop', () => {
    for (const membership of MEMBERSHIPS) {
      expect(redirectFor({ ready: true, hasSession: false, membership, group: 'auth' })).toBeNull();
    }
  });

  it('takes a signed-in shopkeeper off the sign-in screen', () => {
    expect(redirectFor({ ready: true, hasSession: true, membership: 'member', group: 'auth' })).toBe('/');
  });

  it('leaves a signed-in shopkeeper where they are — C1.3 has nothing to fight', () => {
    expect(redirectFor({ ready: true, hasSession: true, membership: 'member', group: 'app' })).toBeNull();
    expect(redirectFor({ ready: true, hasSession: true, membership: 'member', group: null })).toBeNull();
  });

  // Every combination is decided, and no combination sends the app to the place
  // it already is — which is what a redirect loop is made of.
  it('never redirects to the group it is already in', () => {
    for (const ready of [true, false]) {
      for (const hasSession of [true, false]) {
        for (const membership of MEMBERSHIPS) {
          for (const group of GROUPS) {
            const to = redirectFor({ ready, hasSession, membership, group });
            if (to === '/entrar') expect(group).not.toBe('auth');
            if (to === '/') expect(group).not.toBe('app');
            if (to === '/bienvenida') expect(group).not.toBe('onboarding');
          }
        }
      }
    }
  });
});

// ============================================================================
// 5b-i's NAVIGATION STATE — signed in, and belonging to no shop.
//
// ⚠️ THE ONE THIS SUITE IS REALLY FOR IS `unknown`. `none` and `member` are two
// answers; `unknown` is the absence of one, and every bug this state has is the
// same bug: treating "the read has not come back" as "no". On a slow connection
// that is a shopkeeper of six months being offered a screen that creates a shop
// — and if she taps it, a SECOND workspace, because `onboard_workspace` has no
// idempotency key and two calls create two shops.
// ============================================================================
describe('signed in, and the membership read', () => {
  it('moves nobody at all while the read is still out', () => {
    for (const group of GROUPS) {
      expect(redirectFor({ ready: true, hasSession: true, membership: 'unknown', group })).toBeNull();
    }
  });

  it('sends someone who belongs to no shop to the landing, from anywhere else', () => {
    expect(redirectFor({ ready: true, hasSession: true, membership: 'none', group: 'app' })).toBe('/bienvenida');
    expect(redirectFor({ ready: true, hasSession: true, membership: 'none', group: 'auth' })).toBe('/bienvenida');
    expect(redirectFor({ ready: true, hasSession: true, membership: 'none', group: null })).toBe('/bienvenida');
  });

  it('leaves them there once they are — no redirect loop on the landing either', () => {
    expect(
      redirectFor({ ready: true, hasSession: true, membership: 'none', group: 'onboarding' }),
    ).toBeNull();
  });

  // ⚠️ THE OTHER HALF OF THE LOOP, AND IT IS WHAT CLOSES 5b-i's: the shop is
  // created, the membership read is invalidated, it comes back `member`, and
  // this is the line that takes them off the landing and on to Inicio. Nothing
  // in the screen navigates; this does.
  it('takes a shopkeeper off the landing the moment they have a shop', () => {
    expect(
      redirectFor({ ready: true, hasSession: true, membership: 'member', group: 'onboarding' }),
    ).toBe('/');
  });

  // The tabs are a shop's screens. A person with no shop is sent out of them as
  // firmly as a stranger is — Vender cannot sell without one.
  it('never leaves a person with no shop inside the tabs', () => {
    expect(redirectFor({ ready: true, hasSession: true, membership: 'none', group: 'app' })).not.toBeNull();
  });
});

describe('the group is read from the first segment and nothing else', () => {
  it('names the three groups this app has', () => {
    expect(groupOf(['(auth)', 'entrar'])).toBe('auth');
    expect(groupOf(['(tabs)', 'index'])).toBe('app');
    expect(groupOf(['(tabs)'])).toBe('app');
    expect(groupOf(['(onboarding)', 'bienvenida'])).toBe('onboarding');
  });

  // ⚠️ THE DEFAULT IS THE SAFE DIRECTION: anything that is neither group — a
  // not-found route, a modal added in 5b — counts as somewhere a signed-out
  // person may not be, so the guard sends them out rather than leaving them.
  it('treats anything else as neither, and a signed-out person is sent out of it', () => {
    expect(groupOf([])).toBeNull();
    expect(groupOf(['+not-found'])).toBeNull();
    expect(groupOf(['(modal)', 'ajustes'])).toBeNull();
    expect(
      redirectFor({
        ready: true,
        hasSession: false,
        membership: 'unknown',
        group: groupOf(['+not-found']),
      }),
    ).toBe('/entrar');
  });
});
