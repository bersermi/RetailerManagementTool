// ============================================================================
// THE PRICES WAITING ON THIS PHONE, AS THE SCREENS SEE THEM. Plan task `8i`.
//
// ⚠️ IT DECIDES NOTHING. What a waiting price does to the catalog is
// `withWaitingPrices` in `@/api/shelfPrice`, where a suite reads it; this file is
// the store `useCatalog` reads the table through, and nothing else.
//
// ⚠️⚠️ IT IS A MODULE AND NOT CODE IN A SCREEN, for the guard's reason
// (`app/test/auth-errors.test.ts`): the modules that reach `@/lib/outboxDb` are a
// pinned list and none of them is a screen. This is the fifth, and its verb is
// SHOWS THE PRICES — `useUnsent` shows the documents.
//
// ⚠️ IT READS THE TABLE WHEN SOMETHING CHANGED IT, AND ONLY THEN. Two modules
// change it — `@/lib/commitRunner` fills it, `@/lib/flushRunner` empties it — and
// each says so (`@/lib/priceQueueEvents`). So the read is one small SQLite query
// per price set or landed, never one per render of every screen with a catalog.
//
// ⚠️ A TABLE IT CANNOT READ IS NOTHING WAITING. Every screen with a product list
// draws through `useCatalog`, so a throw here would take the catalog down with
// it; the prices still wait in the table and still go when the drain runs.
// ============================================================================

import { useSyncExternalStore } from 'react';

import type { QueuedPrice } from '@/api/shelfPrice';
import { outboxDb, readPrices } from '@/lib/outboxDb';
import { onPricesChanged } from '@/lib/priceQueueEvents';

/** Nothing waiting. Frozen — a shared mutable default is a shared bug. */
const NONE: readonly QueuedPrice[] = Object.freeze([]) as readonly QueuedPrice[];

let snapshot: readonly QueuedPrice[] | null = null;
const listeners = new Set<() => void>();
let stopListening: (() => void) | null = null;

function read(): readonly QueuedPrice[] {
  try {
    const rows = readPrices(outboxDb());
    return rows.length === 0 ? NONE : rows;
  } catch {
    return NONE;
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (stopListening === null) {
    stopListening = onPricesChanged(() => {
      snapshot = read();
      for (const each of listeners) each();
    });
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && stopListening !== null) {
      stopListening();
      stopListening = null;
      // Nobody is listening for changes now, so the next reader reads afresh.
      snapshot = null;
    }
  };
}

function current(): readonly QueuedPrice[] {
  if (snapshot === null) snapshot = read();
  return snapshot;
}

/** Every price waiting on this phone, every shop's — `withWaitingPrices` keeps the open shop's. */
export function useWaitingPrices(): readonly QueuedPrice[] {
  return useSyncExternalStore(subscribe, current, () => NONE);
}
