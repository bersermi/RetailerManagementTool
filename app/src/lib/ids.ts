// ============================================================================
// WHERE A CLIENT UUID COMES FROM, AND THE ONLY PLACE IT DOES. Plan task 5c-i.
//
// ⚠️ IT IS THREE LINES AND IT IS ITS OWN MODULE ON PURPOSE. `expo-crypto` is a
// NATIVE module: importing it under node throws, which would make every suite
// that touches the outbox unloadable. Keeping it alone here is what lets
// `@/api/outbox` be pure and fully tested — the same split
// `env.ts` / `supabase.ts` already makes one layer down, and the same reason
// `@/lib/store.ts` reads its store lazily.
//
// ⚠️⚠️ IT IS `randomUUID`, NOT SOMETHING BUILT FROM `Math.random`, AND THE
// REASON IS NOT SECURITY. This uuid is a PRIMARY KEY in two Postgres tables —
// the document's `id` and `failed_write.id` — across every phone in every shop
// this app ever runs in. A collision is not a failed write; it is `on conflict
// (id) do nothing` deciding that somebody else's sale is this one, silently,
// and returning `already_recorded: true` for it. React Native ships no `crypto`
// global (checked on 0.86.3), so there is nothing here to fall back to.
// ============================================================================

import * as Crypto from 'expo-crypto';

/** One uuid, canonical and lower-case. See `normalizeWriteId` in `@/api/outbox`. */
export function newWriteId(): string {
  return Crypto.randomUUID();
}

/** The instant a write was made, ISO-8601, from this device's clock. */
export function nowIso(): string {
  return new Date().toISOString();
}
