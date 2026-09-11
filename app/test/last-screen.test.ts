import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  LAST_SCREEN_KEY,
  RESTORABLE_ROUTES,
  forgetLastScreen,
  isRestorable,
  readLastScreen,
  rememberLastScreen,
  restoreTarget,
  type RouteMemory,
} from '@/navigation/lastScreen';
import { TABS } from '@/navigation/tabs';

// ============================================================================
// C1.3 — "THE APP OPENS ON THE LAST SCREEN THEY WERE ON." Plan task 5a-iii-b.
//
// ⚠️ THE PLAN WROTE DOWN WHAT THIS SUITE CAN AND CANNOT PROVE BEFORE THE TASK
// WAS TAKEN, and it holds: the testable half is the one that DECIDES — which
// route, given a stored value and a session — and the half no test in this
// repository can see is whether the router lands there on a cold start.
// `_layout.tsx` could drop the effect and every assertion below stays green.
// `5a-iv`, the owner's own phone, is the instrument.
// ============================================================================

/** A store that behaves. */
function memory(initial?: string): RouteMemory & { readonly seen: Map<string, string> } {
  const seen = new Map<string, string>();
  if (initial !== undefined) seen.set(LAST_SCREEN_KEY, initial);
  return {
    seen,
    getItem: (key) => seen.get(key) ?? null,
    setItem: (key, value) => void seen.set(key, value),
    removeItem: (key) => void seen.delete(key),
  };
}

/** A store on a phone with a full disk. */
const broken: RouteMemory = {
  getItem() {
    throw new Error('SQLITE_FULL');
  },
  setItem() {
    throw new Error('SQLITE_FULL');
  },
  removeItem() {
    throw new Error('SQLITE_FULL');
  },
};

const SIGNED_IN = { ready: true, hasSession: true, alreadyRestored: false, at: '/' } as const;

// ============================================================================
// ⚠️ THE ALLOW-LIST AND THE TAB BAR ARE TWO FILES, AND THIS IS WHAT KEEPS THEM
// IN STEP. `5d` adds Productos; `5e` adds more. A route people can reach and
// cannot be returned to is a silent, partial C1.3 — the app remembering three
// of its five screens, which nobody would ever report as a bug.
// ============================================================================
describe('every screen a person can be on is a screen they can be returned to', () => {
  it('covers exactly the tab bar, in the same order', () => {
    const fromTabs = TABS.map((tab) => (tab.route === 'index' ? '/' : `/${tab.route}`));
    expect(fromTabs).toEqual([...RESTORABLE_ROUTES]);
  });

  it('reads a tab table with something in it, so it cannot pass vacuously', () => {
    expect(TABS.length).toBeGreaterThan(1);
    expect(RESTORABLE_ROUTES.length).toBe(TABS.length);
  });

  // The way in is never somewhere to reopen: a signed-in person restored to
  // /entrar is bounced straight back out by the guard, which is a flicker on
  // every launch and looks like the app failing to start.
  it('refuses the way in, and anything that is not a screen', () => {
    expect(isRestorable('/entrar')).toBe(false);
    expect(isRestorable('/ajustes')).toBe(false);
    expect(isRestorable('+not-found')).toBe(false);
    expect(isRestorable('')).toBe(false);
    expect(isRestorable(null)).toBe(false);
    expect(isRestorable('/vender?x=1')).toBe(false);
  });
});

describe('what the app reopens on', () => {
  it('reopens on the screen they were on — the whole of C1.3', () => {
    expect(restoreTarget({ ...SIGNED_IN, stored: '/vender' })).toBe('/vender');
    expect(restoreTarget({ ...SIGNED_IN, stored: '/desperdicio' })).toBe('/desperdicio');
  });

  // ⚠️ THE SAME `ready` RULE AS THE GUARD, AND THE SAME BUG IF IT GOES. The
  // session is read out of SQLite asynchronously, so on the first frames of
  // every launch `hasSession: false` only means nobody has asked yet.
  it('moves nobody until the stored session has been looked for', () => {
    expect(restoreTarget({ ...SIGNED_IN, ready: false, stored: '/vender' })).toBeNull();
    expect(
      restoreTarget({ ready: false, hasSession: false, alreadyRestored: false, stored: '/vender', at: '/' }),
    ).toBeNull();
  });

  it('restores a signed-out person to nothing', () => {
    expect(restoreTarget({ ...SIGNED_IN, hasSession: false, stored: '/vender' })).toBeNull();
  });

  // ⚠️ THE ONE THAT IS WORSE THAN NEVER RESTORING AT ALL. Without it the effect
  // re-decides on every navigation, so a shopkeeper who taps Comprar is dragged
  // back to Vender — the app fighting the person holding it.
  it('restores once per launch and then leaves them alone', () => {
    expect(restoreTarget({ ...SIGNED_IN, alreadyRestored: true, stored: '/vender' })).toBeNull();
  });

  it('falls back when there is nothing stored', () => {
    expect(restoreTarget({ ...SIGNED_IN, stored: null })).toBeNull();
    expect(restoreTarget({ ...SIGNED_IN, stored: '' })).toBeNull();
  });

  // Whatever is in storage was written by an EARLIER VERSION of this app.
  it('falls back on a route this version no longer has', () => {
    expect(restoreTarget({ ...SIGNED_IN, stored: '/productos' })).toBeNull();
    expect(restoreTarget({ ...SIGNED_IN, stored: '/entrar' })).toBeNull();
    expect(restoreTarget({ ...SIGNED_IN, stored: 'not a route at all' })).toBeNull();
  });

  it('issues no navigation to the screen already showing', () => {
    expect(restoreTarget({ ...SIGNED_IN, stored: '/', at: '/' })).toBeNull();
    expect(restoreTarget({ ...SIGNED_IN, stored: '/vender', at: '/vender' })).toBeNull();
  });

  it('only ever names a route it is willing to restore to', () => {
    for (const stored of [...RESTORABLE_ROUTES, '/entrar', '', 'junk', '/productos']) {
      const to = restoreTarget({ ...SIGNED_IN, stored, at: '/comprar' });
      if (to !== null) expect(RESTORABLE_ROUTES).toContain(to);
    }
  });
});

describe('the storage never costs more than one tap', () => {
  it('remembers and reads back a screen', () => {
    const store = memory();
    rememberLastScreen(store, '/comprar');
    expect(readLastScreen(store)).toBe('/comprar');
  });

  it('writes under a namespaced key, because the session shares this store', () => {
    const store = memory();
    rememberLastScreen(store, '/vender');
    expect([...store.seen.keys()]).toEqual([LAST_SCREEN_KEY]);
    expect(LAST_SCREEN_KEY).toMatch(/^wera\./);
  });

  it('does not store what it would refuse to restore', () => {
    const store = memory();
    rememberLastScreen(store, '/entrar');
    rememberLastScreen(store, '+not-found');
    expect(store.seen.size).toBe(0);
  });

  it('forgets on request — an explicit log-out is a handover', () => {
    const store = memory('/vender');
    forgetLastScreen(store);
    expect(readLastScreen(store)).toBeNull();
  });

  // ⚠️ NOT DEFENSIVENESS. This runs against SQLite on a phone in a shop, and
  // C1.3 is a convenience: losing the memory must cost one tap, never a launch
  // that throws on the splash screen with nothing on it.
  it('survives a store that throws on every call', () => {
    expect(() => rememberLastScreen(broken, '/vender')).not.toThrow();
    expect(() => forgetLastScreen(broken)).not.toThrow();
    expect(readLastScreen(broken)).toBeNull();
  });

  // `globalThis.localStorage` is installed by a side effect of importing
  // `lib/supabase.ts`. Under node — and in any build where that import moved —
  // there is no store, and that is an ordinary input rather than a crash.
  it('survives having no store at all', () => {
    expect(() => rememberLastScreen(undefined, '/vender')).not.toThrow();
    expect(() => forgetLastScreen(undefined)).not.toThrow();
    expect(readLastScreen(undefined)).toBeNull();
  });

  // The round trip the app actually performs, end to end over the rules.
  it('carries a screen from one launch to the next', () => {
    const store = memory();
    rememberLastScreen(store, '/desperdicio');
    expect(
      restoreTarget({ ...SIGNED_IN, stored: readLastScreen(store), at: '/' }),
    ).toBe('/desperdicio');
  });

  it('carries nothing across an explicit log-out', () => {
    const store = memory();
    rememberLastScreen(store, '/desperdicio');
    forgetLastScreen(store);
    expect(restoreTarget({ ...SIGNED_IN, stored: readLastScreen(store), at: '/' })).toBeNull();
  });
});

// ============================================================================
// ⚠️ SOURCE TEXT, AND WHAT IT DOES AND DOES NOT BUY, SAID PLAINLY. It cannot
// prove the router lands anywhere — that is `5a-iv` and it stays `5a-iv`. What
// it CAN see is the one failure the plan named as staying green: the effect
// being dropped, or the log-out quietly ceasing to forget. Both are a call that
// is simply not there any more, and a call that is not there is readable.
// ============================================================================
describe('the rules above are actually wired to something', () => {
  const SRC = fileURLToPath(new URL('../src', import.meta.url));
  const read = (rel: string) => readFileSync(`${SRC}/${rel}`, 'utf8');

  it('reads real files, so it cannot pass vacuously', () => {
    expect(read('app/_layout.tsx')).toContain('redirectFor');
    expect(read('auth/AuthProvider.tsx')).toContain('supabase.auth.signOut');
  });

  it('decides the restore in the root layout and records where they end up', () => {
    const layout = read('app/_layout.tsx');
    expect(layout).toMatch(/restoreTarget\s*\(/);
    expect(layout).toMatch(/rememberLastScreen\s*\(/);
  });

  // An explicit log-out is a handover. Leaving the previous person's screen in
  // storage opens the app on it for whoever signs in next.
  it('forgets the last screen when the session is ended on purpose', () => {
    const provider = read('auth/AuthProvider.tsx');
    expect(provider).toMatch(/forgetLastScreen\s*\(/);
    const signOutBody = provider.slice(provider.indexOf('const signOut'));
    expect(signOutBody.indexOf('forgetLastScreen')).toBeGreaterThan(-1);
    expect(signOutBody.indexOf('forgetLastScreen')).toBeLessThan(
      signOutBody.indexOf('supabase.auth.signOut'),
    );
  });
});
