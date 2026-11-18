import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { groupOf, paraDespues, redirectFor, type RouteGroup } from '@/auth/guard';

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

describe('`10.9c`: a kitchen’s page she was sent away from, opened once she is in', () => {
  const ID = '3f2a9c1e-5b7d-4e8f-9a0b-1c2d3e4f5a6b';
  it('a kitchen’s page, by its id — as a link opened it', () => {
    expect(paraDespues(['(vecino)', 'cocina', '[id]'], ID)).toBe(`/cocina/${ID}`);
    expect(paraDespues(['(vecino)', 'cocina', '[id]'], [ID.toUpperCase()])).toBe(`/cocina/${ID}`);
  });
  it('nothing else: the tabs, a dish, a page with no id or a made-up one', () => {
    expect(paraDespues(['(vecino)', '(tabs)'], undefined)).toBeNull();
    expect(paraDespues(['(vecino)', 'platillo', '[cocina]', '[oferta]', '[linea]'], undefined)).toBeNull();
    expect(paraDespues(['(vecino)', 'cocina', '[id]'], undefined)).toBeNull();
    expect(paraDespues(['(vecino)', 'cocina', '[id]'], 'abc')).toBeNull();
    expect(paraDespues(['(auth)', 'entrar'], ID)).toBeNull();
  });
  it('the root layout keeps it as she is sent to *Entrar*, and spends it once she is in', () => {
    const raiz = readFileSync(new URL('../src/app/_layout.tsx', import.meta.url), 'utf8').replace(/\s+/g, ' ');
    expect(raiz).toContain("if (to === '/entrar') despues.current = paraDespues(segments, id);");
    expect(raiz).toContain("const destino = to === '/' && despues.current !== null ? despues.current : to;");
    expect(raiz).toContain("if (to === '/') despues.current = null;");
  });
});
