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
// ⚠️ THAT is why the list below is not just `['catalog', …]`. Four of the eight
// entries are what the COMMIT needs; two are what the SCREEN needs; one is who
// she is in the shop; one is today's takings.
//
// ----------------------------------------------------------------------------
// ⚠️⚠️ THE ALLOW-LIST IS THE DELIVERABLE, AND THE RULE IT ENCODES IS ONE LINE:
// A READ IS PERSISTED WHEN A STALE ANSWER BEATS NO ANSWER, AND REFUSED WHEN A
// STALE ANSWER IS A FALSE STATEMENT
// ----------------------------------------------------------------------------
// Persisting the whole cache is the default shape of this library and it is
// wrong here, because half of what this app reads is MONEY THAT MOVED TODAY:
//
//   * ~~`['today', 'takings']`~~ — *a figure labelled today restored from
//     yesterday's disk is not stale, it is false.* Refused until 2026-10-20,
//     then PERSISTED, because the sentence is now false by construction:
//     `useToday` withholds rows read on any other device day (`rowsOfToday`),
//     so yesterday's figure is never shown — restored or, as it used to be
//     with the app open past midnight, held in memory. Kept, it is what lets
//     *Hoy* add up the sales still on the phone after an offline restart (the
//     offline report's C, *"Do all the fixes"*).
//   * `['documents', 'recent', …]` — `Lo último` already has an offline answer
//     that is TRUE, and it is `5h-ii-c`'s: `useUnsent` reads the queue itself.
//     A restored server list beside a live queue is two sources disagreeing
//     about what this shop has recorded. Refused.
//   * `['costs', 'history', …]` and `['magnitude', 'typical']` — both are
//     derived from the ledger, and a chart of prices is the shape `@/api/costs`
//     already calls *"a lie that looks exactly like a fact"*. Refused.
//   * `['workspace', 'invites' | 'pending-requests']` and
//     `['my-access-requests']` — these answer *who may do what*, and nothing
//     on a counter needs them. Refused.
//   * ~~`['workspace', 'members']`~~ — refused until 2026-10-20, then
//     PERSISTED by the owner's ruling (*"Go ahead with A and B"*, the offline
//     report's *keep her role on the phone*). Measured from the code that day:
//     `useMyRole` rides this read, so after an offline restart an owner was
//     nobody — her price changes, *Editar*, *Nuevo*, *Tu equipo* and the
//     download vanished with no word why. ⚠️ THE FENCE IS STILL RLS: a restored
//     role can draw a control the server then refuses, and every write behind
//     an owner-only control needs a signal anyway, by which time this read has
//     been refreshed.
//   * `['catalog', 'prices' | 'settings']` — `Editar`'s per-variant reads.
//     There is no outbox for a catalog write, so `Editar` cannot save offline
//     anyway; persisting the form it would fill is cache for nothing. Refused.
//
// ⚠️ NOTHING DERIVED FROM THE LEDGER IS PERSISTED — except today's takings,
// and only behind the day guard above. That is the sentence to hold when a
// ninth entry is proposed: a ledger read joins only with a rule that keeps a
// stale copy from saying something false.
//
// ----------------------------------------------------------------------------
// ⚠️⚠️ A REFRESH THAT FAILS KEEPS THE LAST GOOD COPY — MEASURED 2026-10-20, ON
// THE ANDROID EMULATOR, AFTER A MONTH OF THIS FILE SAYING THE OPPOSITE WAS SAFE
// ----------------------------------------------------------------------------
// Until then a query was written only while its status was `success`. A
// restored catalog refetches on the first screen that reads it; offline, that
// refetch fails, the query turns `error` WITH ITS DATA STILL IN IT, and the
// next save — three seconds later — left it out. So the first offline restart
// sold and the SECOND opened Vender on *Cargando productos…* with the shop's
// name gone: a shop offline across two openings could not sell.
//
// ✅ So `shouldPersistQuery` writes a query that holds data, whatever its last
// attempt said, and `asLastGood` writes it AS the success it last was — because
// `hydrate` restores an `error` status verbatim, and a screen that checks
// `isError` before `data` would draw the failure over the catalog it holds.
// ⚠️ A query that never resolved still has nothing to write and is still
// refused: that half of the old rule was right.
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
// the same eight keys, from the same list, in `QueryProvider` — one list, two
// consumers, because two hand-maintained lists is how the next entry gets
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
// ⚠️⚠️ AND SINCE 2026-10-20 IT EMPTIES THE MEMORY TOO, BECAUSE REMOVING THE
// KEY ALONE NEVER WORKED. Measured on the Android emulator: after *Cerrar
// sesión* the store held `wera.query-cache` again within seconds — the
// `QueryClient` is mounted once for the app's life, a sign-out never cleared
// it, and the persister's next save wrote the whole shop back. The aviso
// promises *"Al cerrar sesión se borra la copia del catálogo y de los
// proveedores"*, so it was false on every phone. `QueryProvider` now registers
// its client's `clear` here (`setMemoryForgetter`), and `forgetCache` runs it
// first — still from the log-out alone, and AFTER the session is gone, so no
// query is enabled to fill the cache again.
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
// ⚠️ `v2` SINCE `9d` (2026-10-01): `['catalog', 'variants']` gained `template_code`.
// ⚠️⚠️ AND STILL `v2` AFTER `0056` (`8g`, 2026-10-16) ADDED `giro_principal` TO
// `['workspace', 'mine']` — ON PURPOSE, AND IT IS THE ONE EXCEPTION TO THE RULE
// ABOVE. A bump throws away the whole cache on the first launch after the
// update, catalog included; in the pilot store, offline a lot, that is a shop
// that cannot sell until it finds signal. The new field is the band's drawing
// and nothing else, every reader takes it with `?? null`, and a restored shop
// without it draws the name alone until the first online read brings it.
// ⚠️ AND STILL `v2` AFTER `['workspace', 'members']` JOINED THE LIST (2026-10-20):
// a NEW key is not a new shape. An old blob simply lacks it, nothing reads a
// field off a row that was never written, and the first online read fills it.
export const CACHE_SHAPE = 'v2';

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
 * other half of that budget: what is serialised is eight entries, not thirty.
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
 *
 * ⚠️ THE SEVENTH IS HER ROLE AND THE EIGHTH TODAY'S TAKINGS (both 2026-10-20) —
 * see the header's two struck bullets.
 */
export const PERSISTED_KEYS: readonly (readonly string[])[] = [
  ['workspace', 'mine'],
  ['workspace', 'locations'],
  ['catalog', 'variants'],
  ['catalog', 'units'],
  ['providers', 'list'],
  ['providers', 'memory'],
  ['workspace', 'members'],
  ['today', 'takings'],
];

/**
 * Is this key one of the eight?
 *
 * ⚠️ A PREFIX MATCH AND NOT AN EQUALITY, because two of the eight are families —
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
  readonly state: { readonly status: string; readonly data?: unknown };
}

/**
 * Should this query be written to disk?
 *
 * ⚠️⚠️ IT ASKS WHETHER THERE IS ANYTHING TO WRITE, NOT HOW THE LAST ATTEMPT
 * WENT — the header's measurement of 2026-10-20. A query that never resolved is
 * `pending` or `error` with `data` `undefined`, and writing that hydrates the
 * empty screen this row exists to prevent: refused. A query that resolved and
 * then failed to REFRESH still holds the catalog, and leaving it out of the next
 * save is how a shop lost its products on the second offline restart: written.
 */
export function shouldPersistQuery(query: PersistableQuery): boolean {
  const { status, data } = query.state;
  const holdsData = status === 'success' || (status === 'error' && data !== undefined);
  return holdsData && shouldPersistKey(query.queryKey);
}

/** As much of a dehydrated client as `asLastGood` rewrites. Structural, as above. */
export interface PersistedShape {
  readonly clientState: {
    readonly queries: readonly { readonly state: { readonly status: string; readonly data?: unknown } }[];
  };
}

/**
 * The client as it is written to disk: every query that failed a refresh is
 * written as the success it last was.
 *
 * ⚠️⚠️ BECAUSE `hydrate` KEEPS AN `error` STATUS VERBATIM. Restored as it was, a
 * catalog that failed one refresh comes back `isError` with its rows in it, and
 * any screen that checks the error first draws the failure over the products it
 * holds. Its `dataUpdatedAt` is untouched, so the copy is exactly as old as it
 * is and the first read that can reach the server replaces it.
 */
export function asLastGood<T extends PersistedShape>(client: T): T {
  return {
    ...client,
    clientState: {
      ...client.clientState,
      queries: client.clientState.queries.map((query) =>
        query.state.status === 'error' && query.state.data !== undefined
          ? {
              ...query,
              state: {
                ...query.state,
                status: 'success',
                error: null,
                fetchFailureCount: 0,
                fetchFailureReason: null,
              },
            }
          : query,
      ),
    },
  };
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
  forgetMemory?.();
  removeKey(memory, CACHE_KEY);
}

/** The live cache's own `clear`, registered by `QueryProvider` while it is mounted. */
let forgetMemory: (() => void) | null = null;

/**
 * Hand `forgetCache` the live cache's `clear`, or `null` on unmount.
 *
 * ⚠️ A REGISTRATION AND NOT AN IMPORT because `AuthProvider` sits ABOVE
 * `QueryProvider` and cannot reach its client — the shape `setTabGuard` has in
 * `@/navigation/volver` for the same reason.
 */
export function setMemoryForgetter(forget: (() => void) | null): void {
  forgetMemory = forget;
}
