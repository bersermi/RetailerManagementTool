import { describe, expect, it } from 'vitest';

import type { Membership } from '@/api/kitchen';
import { groupOf, redirectFor, type RouteGroup } from '@/auth/guard';

// ============================================================================
// WHICH OF THREE ROOMS SHE BELONGS IN. Plan task `10.4b-iii-a`.
//
// The decision, every case of it. ⚠️ Whether the router lands there is the
// root layout's effect, which no check can see (ADR-035 §2.11): the phone.
// ============================================================================

const GROUPS: readonly RouteGroup[] = ['auth', 'onboarding', 'cocina', null];
const at = (ready: boolean, hasSession: boolean, membership: Membership, group: RouteGroup) =>
  redirectFor({ ready, hasSession, membership, group });

describe('nobody is moved before the answers are in', () => {
  it('not before the stored session has been looked for — every cold start, signed in or not', () => {
    for (const group of GROUPS) {
      for (const hasSession of [true, false]) expect(at(false, hasSession, 'unknown', group)).toBeNull();
    }
  });

  it('not before her kitchens have been read, and not when the read failed', () => {
    for (const group of GROUPS) expect(at(true, true, 'unknown', group)).toBeNull();
  });
});

describe('signed out', () => {
  // ⚠️ `10.5-v-d`: to the opening (`/hola`), which opens the way in on the half she picks.
  it('goes to the opening, from anywhere else — and is left alone in the way in', () => {
    expect(at(true, false, 'unknown', 'cocina')).toBe('/hola');
    expect(at(true, false, 'unknown', 'onboarding')).toBe('/hola');
    expect(at(true, false, 'member', null)).toBe('/hola');
    expect(at(true, false, 'unknown', 'auth')).toBeNull();
  });
});

describe('signed in with no kitchen — a new fonda, or a shop’s owner with her Wera login', () => {
  it('goes where a kitchen is made, and stays there', () => {
    expect(at(true, true, 'none', 'auth')).toBe('/registro');
    expect(at(true, true, 'none', 'cocina')).toBe('/registro');
    expect(at(true, true, 'none', null)).toBe('/registro');
    expect(at(true, true, 'none', 'onboarding')).toBeNull();
  });
});

describe('signed in with a kitchen', () => {
  it('leaves the way in for her kitchen, and is left alone there', () => {
    expect(at(true, true, 'member', 'auth')).toBe('/');
    expect(at(true, true, 'member', 'cocina')).toBeNull();
    expect(at(true, true, 'member', null)).toBeNull();
  });

  // ⚠️ `10.5-v-d`, the first run: only *Registrar mi cocina* has her in the sign-up with a kitchen.
  it('made in the sign-up a moment ago: on to *¿Qué ofreces hoy?*, never straight to *Hoy*', () => {
    expect(at(true, true, 'member', 'onboarding')).toBe('/que-ofreces');
  });
});

describe('the group of a route', () => {
  it('is its first segment’s', () => {
    expect(groupOf(['(auth)', 'entrar'])).toBe('auth');
    expect(groupOf(['(onboarding)', 'registro'])).toBe('onboarding');
    expect(groupOf(['(cocina)'])).toBe('cocina');
    expect(groupOf(['auth', 'callback'])).toBeNull();
    expect(groupOf([])).toBeNull();
  });
});
