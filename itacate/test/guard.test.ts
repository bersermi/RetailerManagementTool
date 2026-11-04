import { describe, expect, it } from 'vitest';

import { groupOf, redirectFor, type RouteGroup } from '@/auth/guard';

// ============================================================================
// WHICH OF TWO ROOMS SHE BELONGS IN. Plan task `10.5-iii-a`.
//
// The decision, every case of it. ⚠️ Whether the router lands there is the
// root layout's effect, which no check can see (ADR-035 §2.11): the phone.
// ============================================================================

const GROUPS: readonly RouteGroup[] = ['auth', 'vecino', null];
const at = (ready: boolean, hasSession: boolean, group: RouteGroup) => redirectFor({ ready, hasSession, group });

describe('nobody is moved before the stored session has been looked for', () => {
  it('on every cold start, signed in or not, wherever she is', () => {
    for (const group of GROUPS) {
      for (const hasSession of [true, false]) expect(at(false, hasSession, group)).toBeNull();
    }
  });
});

describe('signed out', () => {
  it('goes to the way in, from anywhere else, and stays there', () => {
    expect(at(true, false, 'vecino')).toBe('/entrar');
    expect(at(true, false, null)).toBe('/entrar');
    expect(at(true, false, 'auth')).toBeNull();
  });
});

describe('signed in — a neighbour, or a shop’s owner or a fonda with her Wera login', () => {
  it('leaves the way in for the app, and is left alone there', () => {
    expect(at(true, true, 'auth')).toBe('/');
    expect(at(true, true, 'vecino')).toBeNull();
    expect(at(true, true, null)).toBeNull();
  });
});

describe('the group of a route', () => {
  it('is its first segment’s', () => {
    expect(groupOf(['(auth)', 'entrar'])).toBe('auth');
    expect(groupOf(['(vecino)'])).toBe('vecino');
    expect(groupOf(['auth', 'callback'])).toBeNull();
    expect(groupOf([])).toBeNull();
  });
});
