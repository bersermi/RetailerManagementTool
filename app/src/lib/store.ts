// ============================================================================
// THE DEVICE'S OWN KEY-VALUE STORE, AND THE ONE DEFINITION OF IT. Plan task
// 5b-ii-a.
//
// ⚠️ IT EXISTS BECAUSE THERE ARE NOW TWO READERS, NOT BECAUSE ONE NEEDED A
// LAYER. `navigation/lastScreen.ts` has held this interface and this lazy
// accessor since `5a-iii-b`; `theme/densityMemory.ts` needs exactly the same
// two lines, and the alternatives were both worse than a shared module. A
// SECOND COPY is the defect this repository has recorded thirteen times. An
// import of `@/navigation/lastScreen` FROM `@/theme` is the theme layer
// depending on the navigation layer to remember what a phone is.
//
// ⚠️ WHAT IS STORED HERE IS A DEVICE'S, NEVER A SHOP'S. Both readers keep a
// per-phone preference — which screen this phone was on, how big this phone's
// text is — and C1.5 is why that distinction is load-bearing: an elder
// shopkeeper and their twenty-year-old nephew share a workspace and do not
// share a pair of eyes. Anything belonging to the SHOP belongs in Postgres,
// where `workspace_setting` already holds it.
//
// ⚠️ EVERY READER TREATS IT AS TOTAL. A missing store, a store that throws and
// a store holding nonsense are ordinary inputs, not error states — this is
// SQLite on a phone in a shop with a full disk, and nothing kept here is worth
// a launch that hangs on the splash screen.
// ============================================================================

/**
 * As much of `Storage` as this app uses. ⚠️ `undefined` IS A LEGITIMATE VALUE
 * of every accessor below — it is what node sees, and it is what makes the
 * modules built on this loadable by the suite at all.
 */
export interface DeviceStore {
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
 * question entirely — and returns `undefined` under node, which is what lets
 * `app/test/` load every module that persists anything.
 */
export function deviceStore(): DeviceStore | undefined {
  return (globalThis as { localStorage?: DeviceStore }).localStorage;
}

/**
 * One key read, with every failure flattened to `null`.
 *
 * ⚠️ THE `try` IS NOT DEFENSIVE PROGRAMMING, IT IS A NAMED FAILURE MODE. The
 * store is SQLite; a device out of disk throws here, and both callers are
 * conveniences whose loss must cost a tap, never a crash.
 */
export function readKey(store: DeviceStore | undefined, key: string): string | null {
  if (store === undefined) return null;
  try {
    return store.getItem(key);
  } catch {
    return null;
  }
}

/** One key written, with every failure swallowed. See `readKey`. */
export function writeKey(store: DeviceStore | undefined, key: string, value: string): void {
  if (store === undefined) return;
  try {
    store.setItem(key, value);
  } catch {
    // Nothing to do, and nothing the person holding the phone could do either.
  }
}

/** One key removed, with every failure swallowed. See `readKey`. */
export function removeKey(store: DeviceStore | undefined, key: string): void {
  if (store === undefined) return;
  try {
    store.removeItem(key);
  } catch {
    // See above.
  }
}
