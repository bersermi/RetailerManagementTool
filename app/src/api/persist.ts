// ============================================================================
// THE CACHE THAT SURVIVES THE APP BEING KILLED — what is written to the phone's
// disk, what is deliberately refused, and how long it is trusted. Plan task
// `6d`, and the TWENTY-SEVENTH module of `src/api/` (ADR-035 §2.11, `R12`).
//
// ⚠️⚠️ IT IS A POLICY MODULE AND NOT A WRAPPER: IT REACHES NO POSTGRES AND
// OPENS NO DATABASE. Everything native lives in `@/api/QueryProvider`, which is
// three lines of binding; everything with a right answer is here, where
// `app/test/api-persist.test.ts` reads it. That is `R3` and it is the same
// split `@/api/outbox` has with `@/lib/outboxDb`.
//
// ----------------------------------------------------------------------------
// ⚠️⚠️ WHAT THIS ROW ACTUALLY FIXES, AND IT IS BIGGER THAN *the catalog looks
// empty*: WITHOUT IT A COLD START WITH NO SIGNAL CANNOT SELL AT ALL
// ----------------------------------------------------------------------------
// The row was written as a READ problem — "a shop that opens the app with no
// signal sees no catalog". Measured on the way in, it is a WRITE problem too,
// and the write side is the half everyone believes is solved:
//
//   * `useCatalog` resolves `locationId` out of `LOCATIONS_KEY`. With no signal
//     that read fails, `locationsFrom(undefined)` is `[]`, and `locationId` is
//     `null`.
//   * `draftOf` refuses a `null` location with `no-location`, so `canCommit` is
//     FALSE and **the commit slider is not drawn** on Vender, Comprar and
//     Desperdicio.
//   * `useWorkspace()` reads `MY_WORKSPACES_KEY`. With no signal it is `null`,
//     and every capture screen builds `basketful` as `null` — there is nothing
//     for the slider to commit even if it were drawn.
//
// So the SQLite outbox `5c` built, the drain `5c-ii` built and the queued-note
// list `5h-ii-c` built are all reachable only by an app that was already
// running when the signal died. **A phone put down at 9 p.m. and picked up at
// 7 a.m. in a shop with no signal is a phone that cannot ring up a sale**, and
// nothing in this repository could see it: no suite mounts a screen, and every
// contract check has a database.
//
// ⚠️ THAT is why the list below is not just `['catalog', …]`. Four of the six
// entries are what the COMMIT needs; two are what the SCREEN needs.
//
// ----------------------------------------------------------------------------
// ⚠️⚠️ THE ALLOW-LIST IS THE DELIVERABLE, AND THE RULE IT ENCODES IS ONE LINE:
// A READ IS PERSISTED WHEN A STALE ANSWER BEATS NO ANSWER, AND REFUSED WHEN A
// STALE ANSWER IS A FALSE STATEMENT
// ----------------------------------------------------------------------------
// Persisting the whole cache is the default shape of this library and it is
// wrong here, because half of what this app reads is MONEY THAT MOVED TODAY:
//
//   * `['today', 'takings']` — a figure labelled *today* restored from
//     yesterday's disk is not stale, it is false. Refused.
//   * `['documents', 'recent', …]` — `Lo último` already has an offline answer
//     that is TRUE, and it is `5h-ii-c`'s: `useUnsent` reads the queue itself.
//     A restored server list beside a live queue is two sources disagreeing
//     about what this shop has recorded. Refused.
//   * `['costs', 'history', …]` and `['magnitude', 'typical']` — both are
//     derived from the ledger, and a chart of prices is the shape `@/api/costs`
//     already calls *"a lie that looks exactly like a fact"*. Refused.
//   * `['workspace', 'members' | 'invites' | 'pending-requests']` and
//     `['my-access-requests']` — these answer *who may do what*. A restored
//     roster is a stale answer about permission, and the real fence is RLS on a
//     server this phone cannot currently reach. Refused.
//   * `['catalog', 'prices' | 'settings']` — `Editar`'s per-variant reads.
//     There is no outbox for a catalog write, so `Editar` cannot save offline
//     anyway; persisting the form it would fill is cache for nothing. Refused.
//
// ⚠️ NOTHING DERIVED FROM THE LEDGER IS PERSISTED. That is the sentence to hold
// when a seventh entry is proposed.
//
// ----------------------------------------------------------------------------
// ⚠️⚠️ THE TRAP THAT WOULD HAVE SHIPPED SILENTLY: `gcTime` EVICTS A QUERY FROM
// THE CACHE, AND ONLY WHAT IS IN THE CACHE IS EVER WRITTEN TO DISK
// ----------------------------------------------------------------------------
// Dehydration walks the LIVE cache. TanStack's default `gcTime` is five
// minutes, so a catalog read with no observer is collected five minutes after
// the shopkeeper leaves Productos — and the next persist writes a cache with no
// catalog in it. **The failure is invisible in every way a person would test
// it**: kill the app straight after browsing and it works; put the phone down
// for ten minutes first and the catalog is gone. So `CACHE_GC_TIME` is set on
// the same six keys, from the same list, in `QueryProvider` — one list, two
// consumers, because two hand-maintained lists is how the sixth entry gets
// added to one of them.
//
// ----------------------------------------------------------------------------
// ⚠️⚠️ WHY THE BUSTER IS A SHAPE VERSION AND **NOT** THE PERSON SIGNED IN
// ----------------------------------------------------------------------------
// The obvious use of `buster` is identity — stamp the user's id, and the next
// person to sign in on this phone cannot be served the last one's rows. It does
// not work, and the reason is in `PersistQueryClientProvider`'s own source:
// `didRestore` is a ref, so the restore runs ONCE per mount and the save
// options are frozen the moment restoring finishes. `AuthProvider` reads the
// stored session asynchronously, so at that moment `session` is still `null` —
// the buster would be captured as the signed-out value and every save would
// carry it. A guard that is captured before the thing it guards is known is not
// a guard.
//
// ⚠️⚠️ AND KEYING A CLEAR ON `session === null` IS WORSE THAN USELESS HERE — IT
// IS THE ONE CHANGE THAT WOULD DESTROY EXACTLY WHAT THIS ROW SHIPS.
// `onAuthStateChange` nulls the session on a failed token refresh as well as on
// a log-out, and a failed token refresh is what a shop with no signal HAS. The
// cache would be wiped at the precise moment it is the only catalog there is.
//
// ✅ So identity is handled where the app already handles it: `forgetCache` is
// called from `AuthProvider.signOut`, beside `forgetLastScreen`, which is the
// one deliberate "I am done" act in this app and is NOT reached by an expiry.
// ⚠️ The in-memory half of that handover is older than this row and is not
// widened by it: the `QueryClient` is mounted once for the app's life, so a
// sign-out has never cleared it. Every query is `enabled: session !== null`, so
// nothing refetches while signed out — the exposure is the frames between the
// next sign-in and the first refetch, and it is recorded in `6d`'s plan row
// rather than fixed here.
//
// ⚠️ WHAT THE BUSTER IS FOR INSTEAD is the thing `@/lib/outboxDb` already
// solved with `PRAGMA user_version`: the app is installed on a phone, and the
// shape written to that phone's disk will change. Bump `CACHE_SHAPE` and every
// stored blob is discarded rather than hydrated into code that no longer
// understands it.
//
// ⚠️ IT SHARES THE DEVICE STORE WITH THE SESSION AND THAT IS DELIBERATE, not an
// oversight. `@/lib/store` is the phone's one key-value store and already has
// two writers; a third SQLite file would be a third storage engine to reason
// about, clear and corrupt independently — the trade `@/lib/supabase` refused
// by name when it declined AsyncStorage. The queue keeps its own file because
// losing a queued sale is not recoverable; **losing this cache costs a refetch**,
// which is the whole reason it may live beside something that matters more.
// ============================================================================

import { deviceStore, removeKey, type DeviceStore } from '@/lib/store';

/**
 * The one key the whole dehydrated cache is written under.
 *
 * ⚠️ NAMESPACED, BECAUSE THIS STORE IS SHARED. The library's default is
 * `REACT_QUERY_OFFLINE_CACHE`, which says nothing about which app wrote it and
 * sits in the same table as the Supabase session.
 */
export const CACHE_KEY = 'wera.query-cache';

/**
 * The shape of what is written, as a version.
 *
 * ⚠️ BUMP IT WHENEVER `PERSISTED_KEYS` CHANGES OR A PERSISTED ROW'S COLUMNS DO.
 * A phone holding `v1` then discards it on the next launch instead of hydrating
 * rows the new code will read fields off that were never written.
 */
export const CACHE_SHAPE = 'v1';

/**
 * How long a restored cache is trusted. ⚠️ `Infinity` — there is no staleness
 * fence, and that is a DECISION rather than a default: the library's own
 * default is 24 hours, which would empty the catalog of a shop that spent a
 * weekend without signal. ✅ RULED 2026-09-28 by the owner — *"Leave the catalog
 * unfenced, as recommended"* (the thirty-third ruling). Reversing it is this one
 * constant.
 */
export const CACHE_MAX_AGE = Infinity;

/**
 * How long a persisted query is kept in memory. ⚠️ IT MUST BE AT LEAST
 * `CACHE_MAX_AGE` — see the header: a query collected out of the cache is a
 * query the next save omits.
 */
export const CACHE_GC_TIME = Infinity;

/**
 * How often the cache may be written to disk, in milliseconds.
 *
 * ⚠️ THREE SECONDS AND NOT THE LIBRARY'S ONE. `persistQueryClientSubscribe`
 * fires on every cache event — an observer mounting as a tab is opened counts —
 * and each fire is a `JSON.stringify` plus a synchronous SQLite write on the JS
 * thread. C1.1 puts two low-end Androids in this pilot. The allow-list is the
 * other half of that budget: what is serialised is six entries, not thirty.
 */
export const CACHE_THROTTLE_MS = 3_000;

/**
 * The query keys written to disk, as prefixes. Everything else is refused.
 *
 * ⚠️⚠️ THE FIRST FOUR ARE WHAT A COMMIT NEEDS AND THE LAST TWO ARE WHAT COMPRAR
 * NEEDS — see the header. `['workspace', 'mine']` carries the shop id and the
 * IVA flag `draftOf` takes; `['workspace', 'locations']` is the only source of
 * the `locationId` whose absence refuses the basket outright.
 *
 * ⚠️ `['providers', 'memory']` IS A PREFIX, AND THE PROVIDER'S ID IS THE
 * SEGMENT UNDER IT. Without it every row on Comprar is C3.12's dash, which
 * C3.13 blocks the commit on — so an offline delivery is as unrecordable as an
 * offline sale, for a different reason.
 */
export const PERSISTED_KEYS: readonly (readonly string[])[] = [
  ['workspace', 'mine'],
  ['workspace', 'locations'],
  ['catalog', 'variants'],
  ['catalog', 'units'],
  ['providers', 'list'],
  ['providers', 'memory'],
];

/**
 * Is this key one of the six?
 *
 * ⚠️ A PREFIX MATCH AND NOT AN EQUALITY, because two of the six are families —
 * `memoryKey(id)` appends the provider. ⚠️ And it is a prefix in one direction
 * only: a key SHORTER than a root does not match, so `['workspace']` — which
 * nothing queries, and which an invalidation sweep uses — is not persisted by
 * accident.
 */
export function shouldPersistKey(key: readonly unknown[]): boolean {
  return PERSISTED_KEYS.some((root) => root.every((segment, at) => key[at] === segment));
}

/**
 * As much of a TanStack `Query` as this decision reads.
 *
 * ⚠️ STRUCTURAL ON PURPOSE. Typing this as `Query` would drag four generic
 * parameters and the library's runtime into a pure module, and `api-persist`
 * would then have to build a real query to ask a question about a key.
 */
export interface PersistableQuery {
  readonly queryKey: readonly unknown[];
  readonly state: { readonly status: string };
}

/**
 * Should this query be written to disk?
 *
 * ⚠️⚠️ `success` IS ASSERTED AS WELL AS THE KEY, AND IT IS THE HALF THAT IS
 * EASY TO MISS. A query that has never resolved is `pending` with `data`
 * `undefined`; an `error` query is the shape a shop with no signal produces on
 * every read it makes. Persisting either writes the FAILURE to disk, and the
 * next cold start hydrates it — so the app would restore, verbatim, the empty
 * screen this row exists to prevent, and it would do it from a cache that looks
 * like it is working.
 */
export function shouldPersistQuery(query: PersistableQuery): boolean {
  return query.state.status === 'success' && shouldPersistKey(query.queryKey);
}

/** As much of `Storage` as this file uses. `undefined` is a legitimate value. */
export type CacheMemory = DeviceStore;

/**
 * The store, if there is one. ⚠️ READ LAZILY AND NEVER AT MODULE SCOPE — see
 * `@/lib/store`, which owns that argument and the ordering trap behind it.
 */
export function cacheMemory(): CacheMemory | undefined {
  return deviceStore();
}

/**
 * Forget the persisted cache.
 *
 * ⚠️ CALLED ON AN EXPLICIT LOG-OUT AND NOWHERE ELSE (`AuthProvider.signOut`),
 * for the reason `forgetLastScreen` is: the realistic next person to hold this
 * phone is a different one, and the catalog, the supplier list and what each
 * supplier last charged are that shop's, not this device's.
 *
 * ⚠️⚠️ A SESSION THAT MERELY EXPIRED IS NOT THIS, and the distinction is the
 * whole of the header's argument about `session === null`: an expiry is what a
 * shop with no signal has all day, and it must leave the catalog exactly where
 * it is.
 */
export function forgetCache(memory: CacheMemory | undefined): void {
  removeKey(memory, CACHE_KEY);
}
