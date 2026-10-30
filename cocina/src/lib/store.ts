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

/** One key removed, with every failure swallowed. */
export function removeKey(store: DeviceStore | undefined, key: string): void {
  if (store === undefined) return;
  try {
    store.removeItem(key);
  } catch {
    // Nothing to do, and nothing the person holding the phone could do either.
  }
}
