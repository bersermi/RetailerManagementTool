// ============================================================================
// C1.3 — "THE APP OPENS ON THE LAST SCREEN THEY WERE ON. Not a dashboard, not a
// menu." Plan task 5a-iii-b.
//
// ⚠️ THE PLAN DREW THIS LINE BEFORE THE TASK WAS TAKEN, and it is the same line
// `guard.ts` is on: §2.11 refuses suites over navigation, so what lives here is
// the half that DECIDES — a pure function over a stored value and a session,
// returning a route — and what lives in `_layout.tsx` is the effect that acts
// on it. Whether the router actually lands there is `5a-iv`, the owner's own
// phone, and it is the FIFTH deliverable resting on that task alone.
//
// ⚠️ THE RULES ARE SPLIT FROM THE STORAGE, the way `env.ts` is split from
// `supabase.ts` and for the same reason: `globalThis.localStorage` is installed
// by a side effect of importing `expo-sqlite/localStorage/install`, which no
// node suite can load. Passing the store in as an argument is what makes every
// rule below testable — including what happens when there is no store at all.
// ============================================================================

/**
 * The routes a person may be sent back to.
 *
 * ⚠️ IT IS A LIST AND NOT A DERIVATION FROM `TABS`, AND THE TEST IS WHAT KEEPS
 * THEM IN STEP. `app/test/last-screen.test.ts` asserts this equals the tab
 * table's routes exactly, so a fifth tab added in `5d` that nobody may be
 * restored to is a RED TEST rather than a silent omission — and a tab DELETED
 * is a red test rather than a stored path that sends the app nowhere.
 *
 * ⚠️ AND IT IS AN ALLOW-LIST, NOT A DENY-LIST. Whatever is in storage was
 * written by a previous version of this app; `5b` will add routes, `5e` will
 * add more, and a rule phrased as "anything except /entrar" restores a
 * shopkeeper in October to a screen that was deleted in September.
 */
export const RESTORABLE_ROUTES = ['/', '/vender', '/comprar', '/desperdicio'] as const;

export type RestorableRoute = (typeof RESTORABLE_ROUTES)[number];

/** The storage key. Namespaced, because the session shares this store. */
export const LAST_SCREEN_KEY = 'wera.lastScreen';

/** Is this a route this version of the app is willing to reopen on? */
export function isRestorable(path: string | null): path is RestorableRoute {
  return path !== null && (RESTORABLE_ROUTES as readonly string[]).includes(path);
}

export interface RestoreState {
  /**
   * Has the stored session been looked for yet? ⚠️ THE SAME FLAG THE GUARD
   * TAKES, FOR THE SAME REASON (`guard.ts`, K5): acting before the answer is
   * known moves a signed-in shopkeeper on the strength of a `false` that only
   * means "nobody has asked".
   */
  readonly ready: boolean;
  readonly hasSession: boolean;
  /** Has this LAUNCH already restored once? See the rule below. */
  readonly alreadyRestored: boolean;
  /** Whatever is in storage — not trusted, not assumed to be a route. */
  readonly stored: string | null;
  /** Where the router is now. */
  readonly at: string;
}

/**
 * The route to reopen on, or `null` to leave the app where it landed.
 *
 * ⚠️ `null` MEANS INICIO WITHOUT SAYING SO, and that is deliberate. Expo Router
 * starts at `/` on its own; a function that returned `'/'` for "nothing stored"
 * would issue a `replace` to the screen already showing — a wasted navigation
 * on every cold start, and a visible flicker on a slow phone.
 */
export function restoreTarget(state: RestoreState): RestorableRoute | null {
  if (!state.ready) return null;

  // "A signed-out user restores to nothing." The guard is already sending them
  // to /entrar; a restore competing with it is two navigations in one frame.
  if (!state.hasSession) return null;

  // ⚠️ C1.3 IS ABOUT THE LAUNCH, NOT ABOUT EVERY RENDER. Without this the
  // effect re-decides on each navigation and drags a shopkeeper who just tapped
  // Comprar back to Vender — the app fighting the person using it, which is a
  // far worse bug than never restoring at all.
  if (state.alreadyRestored) return null;

  if (state.stored === null || state.stored === '') return null;

  // An unknown route falls back: junk in storage, a route deleted between
  // versions, or `/entrar` itself, which is never somewhere to reopen.
  if (!isRestorable(state.stored)) return null;

  // Already there — see the note on `null` above.
  if (state.stored === state.at) return null;

  return state.stored;
}

// ============================================================================
// THE STORAGE. Three functions, and all three are total: a missing store, a
// store that throws, and a store holding nonsense are ordinary inputs.
//
// ⚠️ NOT DEFENSIVE PROGRAMMING — A NAMED FAILURE MODE. `globalThis.localStorage`
// here is SQLite on a phone in a shop with a full disk, and C1.3 is a
// convenience: the app losing the memory of which screen you were on must cost
// you one tap, never a launch that crashes or hangs on the splash. The session
// is in the same store and `AuthProvider` already takes the same care with it.
// ============================================================================

/** As much of `Storage` as this file uses. `undefined` is a legitimate value. */
export interface RouteMemory {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/**
 * The store, if there is one.
 *
 * ⚠️ IT IS READ LAZILY AND NEVER AT MODULE SCOPE. `globalThis.localStorage` is
 * installed as a side effect of `lib/supabase.ts` importing
 * `expo-sqlite/localStorage/install`; that happens when the root layout's
 * imports are evaluated, which is before any effect runs but NOT necessarily
 * before this module is loaded. Reading it at call time removes the ordering
 * question entirely — and returns `undefined` under node, which is what makes
 * the suite able to load this file at all.
 */
export function routeMemory(): RouteMemory | undefined {
  return (globalThis as { localStorage?: RouteMemory }).localStorage;
}

/** The remembered route, or `null` for "nothing usable". */
export function readLastScreen(memory: RouteMemory | undefined): string | null {
  if (memory === undefined) return null;
  try {
    return memory.getItem(LAST_SCREEN_KEY);
  } catch {
    return null;
  }
}

/** Remember a route. Anything not restorable is not written. */
export function rememberLastScreen(memory: RouteMemory | undefined, path: string): void {
  if (memory === undefined) return;
  // ⚠️ FILTERED ON THE WAY IN AS WELL AS ON THE WAY OUT. `restoreTarget` would
  // refuse it anyway, so this is not the safety — it is that storage should not
  // accumulate `/entrar` and whatever `+not-found` a mistyped deep link
  // produces, where a later reader has to work out which entries meant anything.
  if (!isRestorable(path)) return;
  try {
    memory.setItem(LAST_SCREEN_KEY, path);
  } catch {
    // See the header: losing the memory costs one tap.
  }
}

/**
 * Forget it.
 *
 * ⚠️ CALLED ON AN EXPLICIT LOG-OUT AND NOWHERE ELSE (`AuthProvider.signOut`).
 * Logging out is the one deliberate "I am done" act in this app — C1.4 says
 * nothing else ends a session — and the realistic next person to hold the phone
 * is a different one. A session that merely expired is NOT this: the route
 * survives, and they reopen where they were after signing back in.
 */
export function forgetLastScreen(memory: RouteMemory | undefined): void {
  if (memory === undefined) return;
  try {
    memory.removeItem(LAST_SCREEN_KEY);
  } catch {
    // Nothing to do, and nothing a shopkeeper could do either.
  }
}
