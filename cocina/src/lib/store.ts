// ============================================================================
// THE PHONE'S OWN KEY-VALUE STORE. Plan task `10.4b-iii-a`.
//
// ⚠️ WERA'S ACCESSORS, COPIED (`app/src/lib/store.ts`): `globalThis.localStorage`
// is SQLite, installed by `@/lib/supabase` importing
// `expo-sqlite/localStorage/install`, and it is where supabase-js keeps the
// session. It is read LAZILY and never at module scope, so node — where there is
// none — sees `undefined` and every module built on it stays loadable by the
// suite. Every failure is flattened: a phone with a full disk must cost a tap,
// never a launch that hangs.
// ============================================================================

/** As much of `Storage` as this app uses. `undefined` is what node sees. */
export interface DeviceStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** The store, if there is one — read at call time, never at import. */
export function deviceStore(): DeviceStore | undefined {
  return (globalThis as { localStorage?: DeviceStore }).localStorage;
}

/** One key read, with every failure flattened to `null`. */
export function readKey(store: DeviceStore | undefined, key: string): string | null {
  if (store === undefined) return null;
  try {
    return store.getItem(key);
  } catch {
    return null;
  }
}

/** One key written, with every failure swallowed — `10.5-v-c-i`, *Hoy*'s closed door. */
export function writeKey(store: DeviceStore | undefined, key: string, value: string): void {
  if (store === undefined) return;
  try {
    store.setItem(key, value);
  } catch {
    // A full disk costs her the door coming back once; never a screen that fails.
  }
}

/** One key removed, with every failure swallowed. */
export function removeKey(store: DeviceStore | undefined, key: string): void {
  if (store === undefined) return;
  try {
    store.removeItem(key);
  } catch {
    // Nothing to do, and nothing the person holding the phone could do either.
  }
}

/**
 * Is this the first time — and if so, it no longer will be. `10.5-v-d`, the opening
 * (Wera's `firstTime`, `app/src/offline/ensenar.ts`). ⚠️ IT WRITES AS IT ANSWERS, so two
 * callers in one moment cannot both play it; and a phone that cannot write says no —
 * an opening that would play on every launch is worse than none.
 */
export function firstTime(store: DeviceStore | undefined, key: string): boolean {
  if (store === undefined) return false;
  if (readKey(store, key) !== null) return false;
  writeKey(store, key, '1');
  return readKey(store, key) !== null;
}
