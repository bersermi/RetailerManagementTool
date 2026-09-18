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

import type { Membership } from '@/api/workspace';
import { deviceStore, readKey, removeKey, writeKey, type DeviceStore } from '@/lib/store';

/**
 * The routes a person may be sent back to.
 *
 * ⚠️ IT IS A LIST AND NOT A DERIVATION FROM `TABS`, AND THE TEST IS WHAT KEEPS
 * THEM IN STEP. `app/test/last-screen.test.ts` asserts this equals the tab
 * table's routes exactly, so a tab added later that nobody may be restored to is
 * a RED TEST rather than a silent omission — and a tab DELETED is a red test
 * rather than a stored path that sends the app nowhere.
 *
 * ⚠️ THIS PARAGRAPH USED TO SAY "a fifth tab added in `5d`" AND THAT IS NO LONGER
 * COMING. Area 13, 2026-09-17: `Productos` was drawn as a fifth tab and the
 * tension with C12.1 was visible in the hand — five icon-plus-word tabs across
 * 390 px give each 78 px, and one of the words is `Desperdicio`. The bar is
 * capped at FOUR; `Productos` and `Proveedores` are entered from Inicio. The
 * routes they push are not tabs and are not restorable.
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
  /**
   * Does this person belong to a shop yet? ⚠️ ADDED IN 5b-i, AND THE RULE IT
   * CARRIES IS BELOW. The same three-valued flag `guard.ts` takes, for the
   * same reason: `unknown` is "the read has not come back yet".
   */
  readonly membership: Membership;
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

  // ⚠️ AND NEITHER DOES ANYONE WHOSE SHOP IS NOT ESTABLISHED (5b-i). The same
  // argument, one table further out: every route in `RESTORABLE_ROUTES` is a
  // tab of a shop, and the guard is about to send a person who has none to
  // `/bienvenida`. Restoring first is the flicker where a shopkeeper who signed
  // up last night sees Vender for a frame on the way to the screen that creates
  // the shop Vender needs — and it spends this launch's one restore doing it.
  if (state.membership !== 'member') return null;

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
//
// ⚠️ THE THREE LINES THAT TALK TO THE DEVICE MOVED TO `@/lib/store` AT
// `5b-ii-a`, WHEN THE DENSITY SWITCH BECAME A SECOND READER OF THE SAME STORE.
// Nothing here changed shape: `RouteMemory` is that module's interface under
// this file's name, because "the memory a route is kept in" is what this file
// calls it and `app/test/last-screen.test.ts` spells it. What went is the
// second copy of the try/catch, which is the defect, not the abstraction.
// ============================================================================

/** As much of `Storage` as this file uses. `undefined` is a legitimate value. */
export type RouteMemory = DeviceStore;

/**
 * The store, if there is one. ⚠️ READ LAZILY AND NEVER AT MODULE SCOPE — see
 * `@/lib/store`, which owns that argument and the ordering trap behind it.
 */
export function routeMemory(): RouteMemory | undefined {
  return deviceStore();
}

/** The remembered route, or `null` for "nothing usable". */
export function readLastScreen(memory: RouteMemory | undefined): string | null {
  return readKey(memory, LAST_SCREEN_KEY);
}

/** Remember a route. Anything not restorable is not written. */
export function rememberLastScreen(memory: RouteMemory | undefined, path: string): void {
  // ⚠️ FILTERED ON THE WAY IN AS WELL AS ON THE WAY OUT. `restoreTarget` would
  // refuse it anyway, so this is not the safety — it is that storage should not
  // accumulate `/entrar` and whatever `+not-found` a mistyped deep link
  // produces, where a later reader has to work out which entries meant anything.
  if (!isRestorable(path)) return;
  writeKey(memory, LAST_SCREEN_KEY, path);
}

/**
 * Forget it.
 *
 * ⚠️ CALLED ON AN EXPLICIT LOG-OUT AND NOWHERE ELSE (`AuthProvider.signOut`).
 * Logging out is the one deliberate "I am done" act in this app — C1.4 says
 * nothing else ends a session — and the realistic next person to hold the phone
 * is a different one. A session that merely expired is NOT this: the route
 * survives, and they reopen where they were after signing back in.
 *
 * ⚠️ IT DOES NOT FORGET THE DENSITY (5b-ii-a). `Letra grande` is a property of
 * the EYES holding the phone, not of the account signed into it: clearing it on
 * log-out would reset an elder shopkeeper's text every time she signs back in.
 */
export function forgetLastScreen(memory: RouteMemory | undefined): void {
  removeKey(memory, LAST_SCREEN_KEY);
}
