// ============================================================================
// SERVER STATE, AND IT IS THE LIBRARY ADR-035 NAMED. Plan task 5b-i.
//
// §2.11: "Server state: TanStack Query, EXCLUSIVELY. Staleness, refetching and
// invalidation are exactly what hand-rolled fetching gets wrong. §2.6 already
// requires reads served from cache with *visible* staleness; this provides that
// flag rather than reinventing it."
//
// ⚠️ IT ARRIVES AT THE FIRST SERVER READ THIS APP EVER DOES, ON PURPOSE. Nothing
// before `5b-i` read a row from Postgres — `5a` is an auth shell, a theme scale
// and a money formatter — so this is the cheapest moment there will ever be to
// introduce it, and the most expensive thing that could happen instead is that
// `5b-ii` and `5b-iii` each invent their own read and `5b.5` then documents a
// pattern the ADR does not describe. The sizing's own argument for re-pointing
// `5b.5` at this task is this paragraph.
//
// ⚠️ IT IS MOUNTED INSIDE `AuthProvider` AND OUTSIDE EVERYTHING ELSE, and the
// order matters in one direction: every query here is scoped to whoever holds
// the session, so the provider that knows who that is has to be above it.
//
// ⚠️ WHAT THIS DELIBERATELY DOES NOT DO: `onlineManager`, and the
// retry-when-the-signal-returns behaviour a shop with no connection needs. That
// is `5c`, which owns the outbox and the "Sin conexion a internet" line, and
// building half of it here would be a second queue for the one `5c` designs.
// ~~persistence~~ — struck by `6d`, 2026-09-27, and it had been true for
// sixteen days: this file now persists six reads to the phone's disk.
//
// ⚠️⚠️ EVERY DECISION ABOUT THAT IS IN `@/api/persist` AND NONE OF IT IS HERE.
// Which keys are written, what a stale answer is allowed to say, why the buster
// is a shape version rather than the person signed in, and the `gcTime` trap
// that would otherwise write an empty cache — all of it is argued and tested
// there. What is left below is the BINDING: a persister over the store the
// phone already has, and the defaults that keep the six from being collected
// before they can be saved.
// ============================================================================

import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useState } from 'react';
import type { ReactNode } from 'react';

import {
  CACHE_GC_TIME,
  CACHE_KEY,
  CACHE_MAX_AGE,
  CACHE_SHAPE,
  CACHE_THROTTLE_MS,
  PERSISTED_KEYS,
  cacheMemory,
  shouldPersistQuery,
} from '@/api/persist';

/**
 * The client itself. ⚠️ A FUNCTION SO THAT `withPersistedDefaults` HAS SOMETHING
 * TO TAKE — the two are separate because only the second one is about `6d`, and
 * a reader looking for why a query is kept forever should not have to read past
 * the retry policy to find it.
 */
function buildClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // ⚠️ THE PILOT STORE IS OFFLINE A LOT, so a read that fails is far
        // more often a dead connection than a dead server. Two retries cost
        // a few seconds; zero retries put "algo salio mal" on the screen of
        // a shop whose signal came back one second later.
        retry: 2,
        // A shop's own name and IVA flag do not change while the app is
        // open. This is not a cache policy for the ledger — `5d` onwards
        // set their own, against screens that exist.
        staleTime: 60_000,
        refetchOnWindowFocus: false,
      },
      // ⚠️ WRITES ARE NOT RETRIED HERE AND THAT IS NOT AN OVERSIGHT. A
      // retried write is a second row unless something makes it idempotent,
      // and the thing that does — client-generated document uuids, §2.6 —
      // is `5c`'s. `onboard_workspace` has no such key: two calls create two
      // shops.
      mutations: { retry: 0 },
    },
  });
}

/**
 * The six persisted keys, kept in memory for as long as the app runs.
 *
 * ⚠️⚠️ WITHOUT THIS THE PERSISTENCE BELOW IS A NO-OP AFTER FIVE MINUTES, and it
 * fails in the direction nobody tests. Dehydration walks the LIVE cache, and
 * TanStack's default `gcTime` collects a query five minutes after its last
 * observer unmounts — so a catalog browsed and then left is written to disk
 * once and silently written back OUT on the next save. `@/api/persist`'s header
 * carries the argument in full.
 *
 * ⚠️ IT READS THE SAME LIST THE DEHYDRATE PREDICATE DOES, which is the only
 * reason the two cannot drift: a seventh key added to `PERSISTED_KEYS` is
 * persisted AND kept, or neither.
 */
function withPersistedDefaults(client: QueryClient): QueryClient {
  for (const key of PERSISTED_KEYS) client.setQueryDefaults(key, { gcTime: CACHE_GC_TIME });
  return client;
}

/**
 * ⚠️ ONE CLIENT PER MOUNT, HELD IN STATE AND NOT AT MODULE SCOPE. A client
 * built at import time is shared by every render of every fast-refresh in
 * development and survives a sign-out, which is how one shopkeeper's cached
 * rows get served to the next person to sign in on the same phone. `useState`
 * with an initialiser builds it once per mount and lets it go with the tree.
 *
 * ⚠️⚠️ AND SINCE `6d` THE DISK OUTLIVES THE MOUNT, WHICH THAT ARGUMENT DOES NOT
 * REACH. A new client per mount cannot un-write what is already on the phone —
 * `AuthProvider.signOut` calls `forgetCache` for that, and `@/api/persist`'s
 * header says why it is the log-out and never `session === null`.
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(() => withPersistedDefaults(buildClient()));

  // ⚠️ BUILT ONCE PER MOUNT, LIKE THE CLIENT, AND FOR THE SAME REASON — a
  // persister rebuilt on a render re-subscribes and re-throttles.
  //
  // ⚠️⚠️ `cacheMemory()` IS `undefined` UNDER NODE AND ON THE FIRST FRAMES OF
  // THE WEB BUILD, AND THAT IS A SUPPORTED VALUE RATHER THAN A BUG:
  // `createSyncStoragePersister` answers a missing store with a persister whose
  // three methods are no-ops. So this file loads and mounts with no storage at
  // all, which is what keeps the app runnable in a browser and the module
  // graph loadable by anything that is not a phone.
  //
  // ⚠️ `createSyncStoragePersister` IS MARKED DEPRECATED BY THE LIBRARY IN
  // FAVOUR OF THE ASYNC ONE, AND IT IS STILL THE RIGHT CALL HERE: `@/lib/store`
  // is SYNCHRONOUS by construction — `expo-sqlite/localStorage`, the store that
  // already holds the session — so wrapping it in promises would move no work
  // off the JS thread and would buy a second storage abstraction to keep in
  // step. The throttle is what bounds the cost; see `CACHE_THROTTLE_MS`.
  const [persister] = useState(() =>
    createSyncStoragePersister({
      storage: cacheMemory(),
      key: CACHE_KEY,
      throttleTime: CACHE_THROTTLE_MS,
    }),
  );

  return (
    <PersistQueryClientProvider
      client={client}
      persistOptions={{
        persister,
        buster: CACHE_SHAPE,
        maxAge: CACHE_MAX_AGE,
        dehydrateOptions: { shouldDehydrateQuery: shouldPersistQuery },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
