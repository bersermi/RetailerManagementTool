import { describe, expect, it } from 'vitest';

import { groupOf, redirectFor, type RouteGroup } from '@/auth/guard';

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

const GROUPS: readonly RouteGroup[] = ['auth', 'app', null];

describe('nobody is moved until the stored session has been looked for', () => {
  // ⚠️ THE BUG THIS PREVENTS IS THE ONE THAT LOOKS EXACTLY LIKE C1.4 FAILING.
  // Reading the session out of `expo-sqlite` is asynchronous, so for the first
  // frames of EVERY cold start — including a signed-in one — `hasSession` is
  // false because nothing has asked yet. Acting on it sends a shopkeeper who
  // never logged out back to the sign-in screen every single morning.
  it('stays put on a cold start, signed in or not, wherever it is', () => {
    for (const group of GROUPS) {
      expect(redirectFor({ ready: false, hasSession: false, group })).toBeNull();
      expect(redirectFor({ ready: false, hasSession: true, group })).toBeNull();
    }
  });
});

describe('once the session is known', () => {
  it('sends a signed-out person to the way in, from anywhere else', () => {
    expect(redirectFor({ ready: true, hasSession: false, group: 'app' })).toBe('/entrar');
    expect(redirectFor({ ready: true, hasSession: false, group: null })).toBe('/entrar');
  });

  it('leaves a signed-out person alone once they are there — no redirect loop', () => {
    expect(redirectFor({ ready: true, hasSession: false, group: 'auth' })).toBeNull();
  });

  it('takes a signed-in person off the sign-in screen', () => {
    expect(redirectFor({ ready: true, hasSession: true, group: 'auth' })).toBe('/');
  });

  it('leaves a signed-in person where they are — C1.3 has nothing to fight', () => {
    expect(redirectFor({ ready: true, hasSession: true, group: 'app' })).toBeNull();
    expect(redirectFor({ ready: true, hasSession: true, group: null })).toBeNull();
  });

  // Every combination is decided, and no combination sends the app to the place
  // it already is — which is what a redirect loop is made of.
  it('never redirects to the group it is already in', () => {
    for (const ready of [true, false]) {
      for (const hasSession of [true, false]) {
        for (const group of GROUPS) {
          const to = redirectFor({ ready, hasSession, group });
          if (to === '/entrar') expect(group).not.toBe('auth');
          if (to === '/') expect(group).not.toBe('app');
        }
      }
    }
  });
});

describe('the group is read from the first segment and nothing else', () => {
  it('names the two groups this app has', () => {
    expect(groupOf(['(auth)', 'entrar'])).toBe('auth');
    expect(groupOf(['(tabs)', 'index'])).toBe('app');
    expect(groupOf(['(tabs)'])).toBe('app');
  });

  // ⚠️ THE DEFAULT IS THE SAFE DIRECTION: anything that is neither group — a
  // not-found route, a modal added in 5b — counts as somewhere a signed-out
  // person may not be, so the guard sends them out rather than leaving them.
  it('treats anything else as neither, and a signed-out person is sent out of it', () => {
    expect(groupOf([])).toBeNull();
    expect(groupOf(['+not-found'])).toBeNull();
    expect(groupOf(['(modal)', 'ajustes'])).toBeNull();
    expect(redirectFor({ ready: true, hasSession: false, group: groupOf(['+not-found']) })).toBe('/entrar');
  });
});
