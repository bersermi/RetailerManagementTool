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
// ~~WHAT THIS DELIBERATELY DOES NOT DO: `onlineManager`~~ — struck 2026-10-20
// by the owner's *"Go ahead with A and B"*, over the offline report's
// measurement: with nothing telling the library the phone was offline, every
// read FAILED instead of waiting, and when the signal came back nothing read
// again — Números kept *Sin dato* until she left and returned. ⚠️ The outbox is
// still `5c`'s and is not touched: a sale is queued by `@/lib/commitRunner`,
// never through a mutation here, and mutations are pinned to `always` below so
// a write behaves exactly as it did before the library knew about the signal.
//
// ✅ What this file now does with the signal: it READS it, from
// `@/lib/connectivityMonitor`'s `subscribe` — the app's one signal, never a
// second library — and hands it to `onlineManager`, so an offline read is
// PAUSED with its last copy on screen and resumes by itself on the reconnect.
// And `AppState` drives `focusManager`, so a read older than its `staleTime`
// refreshes when she comes back to the app. Between them, no screen needs a
// refresh button.
// ~~persistence~~ — struck by `6d`, 2026-09-27, and it had been true for
// sixteen days: this file now persists eight reads to the phone's disk (six
// until 2026-10-20, when her role and today's takings joined them).
//
// ⚠️⚠️ EVERY DECISION ABOUT THAT IS IN `@/api/persist` AND NONE OF IT IS HERE.
// Which keys are written, what a stale answer is allowed to say, why the buster
// is a shape version rather than the person signed in, and the `gcTime` trap
// that would otherwise write an empty cache — all of it is argued and tested
// there. What is left below is the BINDING: a persister over the store the
// phone already has, and the defaults that keep the eight from being collected
// before they can be saved.
// ============================================================================

import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { QueryClient, focusManager, onlineManager } from '@tanstack/react-query';
import { PersistQueryClientProvider, type PersistedClient } from '@tanstack/react-query-persist-client';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { AppState } from 'react-native';

import {
  CACHE_GC_TIME,
  CACHE_KEY,
  CACHE_MAX_AGE,
  CACHE_SHAPE,
  CACHE_THROTTLE_MS,
  PERSISTED_KEYS,
  asLastGood,
  cacheMemory,
  keyedByShop,
  setMemoryForgetter,
  shouldPersistQuery,
} from '@/api/persist';
import { online, subscribe } from '@/lib/connectivityMonitor';
import { isTimedOut } from '@/lib/plazo';

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
        // ⚠️⚠️ EXCEPT A READ THAT RAN OUT OF TIME (`8g`, 2026-10-20): each
        // attempt already waited its whole limit (`@/lib/plazo`), so two more
        // made a hung read take a minute and a half to say so. It is read again
        // by itself on the reconnect, the return to the app and the pull.
        retry: (failures, error) => failures < 2 && !isTimedOut(error),
        // A shop's own name and IVA flag do not change while the app is
        // open. This is not a cache policy for the ledger — `5d` onwards
        // set their own, against screens that exist.
        staleTime: 60_000,
        // ⚠️ `true` SINCE 2026-10-20, AND BEFORE THAT `false` MEANT NOTHING:
        // in React Native the library's focus is never told anything unless
        // `AppState` drives it, which `QueryProvider` below now does. A read
        // older than `staleTime` refreshes when she returns to the app.
        refetchOnWindowFocus: true,
      },
      // ⚠️ WRITES ARE NOT RETRIED HERE AND THAT IS NOT AN OVERSIGHT. A
      // retried write is a second row unless something makes it idempotent,
      // and the thing that does — client-generated document uuids, §2.6 —
      // is `5c`'s. `onboard_workspace` has no such key: two calls create two
      // shops.
      //
      // ⚠️⚠️ AND `networkMode: 'always'`, BECAUSE THE DEFAULT WOULD HOLD A
      // WRITE IN MEMORY. Once `onlineManager` knows the phone is offline, a
      // mutation in the default mode is PAUSED rather than sent — a *Guardar*
      // that spins with no word and is lost when the app is closed. `always`
      // sends it, it fails, and the screen says *Sin conexión a internet*
      // exactly as it did before the signal was wired.
      mutations: { retry: 0, networkMode: 'always' },
    },
  });
}

/**
 * The eight persisted keys, kept in memory for as long as the app runs.
 *
 * ⚠️⚠️ WITHOUT THIS THE PERSISTENCE BELOW IS A NO-OP AFTER FIVE MINUTES, and it
 * fails in the direction nobody tests. Dehydration walks the LIVE cache, and
 * TanStack's default `gcTime` collects a query five minutes after its last
 * observer unmounts — so a catalog browsed and then left is written to disk
 * once and silently written back OUT on the next save. `@/api/persist`'s header
 * carries the argument in full.
 *
 * ⚠️ IT READS THE SAME LIST THE DEHYDRATE PREDICATE DOES, which is the only
 * reason the two cannot drift: a ninth key added to `PERSISTED_KEYS` is
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
      // ⚠️ A FAILED REFRESH IS WRITTEN AS THE SUCCESS IT LAST WAS — see
      // `asLastGood`, and the measurement in `@/api/persist`'s header.
      serialize: (client) => JSON.stringify(asLastGood(client)),
      // ⚠️ `10.4b-ii`: WHAT AN OLDER UPDATE WROTE IS MOVED UNDER THE SHOP AS IT IS
      // READ BACK, or the first open with no signal after the update finds no
      // catalog — see `keyedByShop`.
      deserialize: (stored: string) => keyedByShop(JSON.parse(stored) as PersistedClient),
    }),
  );

  // ⚠️ *Cerrar sesión* EMPTIES THIS CLIENT, through `forgetCache` — without it
  // the next save wrote the shop back to the phone (`@/api/persist`'s header).
  useEffect(() => {
    setMemoryForgetter(() => client.clear());
    return () => setMemoryForgetter(null);
  }, [client]);

  // ⚠️ THE SIGNAL, HANDED TO THE LIBRARY. `null` — nothing has read the network
  // yet — is taken as online, which is the library's own default and the one
  // that lets a launch read at once. ⚠️ Through `subscribe`, like
  // `OfflineSurfaces`, so the notice and the reads can never disagree about
  // whether the shop is online.
  useEffect(() => {
    onlineManager.setOnline(online() !== false);
    return subscribe((next) => onlineManager.setOnline(next !== false));
  }, []);

  // ⚠️ THE APP COMING BACK TO THE FRONT. `inactive` — a notification pulled
  // down, a call banner — is neither leaving nor returning, and the monitor
  // reads it the same way: folding it into `background` would refresh every
  // stale read each time she glanced at a notification.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') focusManager.setFocused(true);
      else if (state === 'background') focusManager.setFocused(false);
    });
    return () => sub.remove();
  }, []);

  return (
    <PersistQueryClientProvider
      client={client}
      persistOptions={{
        persister,
        buster: CACHE_SHAPE,
        maxAge: CACHE_MAX_AGE,
        // ⚠️ `8g`, 2026-10-20: NO MUTATION IS WRITTEN TO THE PHONE. A send held
        // for the signal (*Te lo compro*'s `networkMode: 'online'`) would be
        // dehydrated by default — her draft, its photo paths and the shop's id
        // on disk — and after a restart it has no function to run, so it could
        // only fail silently. Closing the app loses a waiting request, as it
        // loses a draft; that is said where the request is sent.
        dehydrateOptions: { shouldDehydrateQuery: shouldPersistQuery, shouldDehydrateMutation: () => false },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
