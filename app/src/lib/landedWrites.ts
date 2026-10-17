// ============================================================================
// A WRITE LANDED — the one signal Inicio listens for. Plan task `8g`, the
// owner's Inicio of 2026-10-16: the total that rolls when a sale lands.
//
// ⚠️ IT EXISTS BECAUSE NOTHING ELSE SAID SO. `useToday` is a server read with a
// minute's staleness and no refetch on focus (`QueryProvider`), so a sale rung
// up on Vender reached Inicio only when the cache aged out — measured on the
// Android emulator: the ledger had the sale, Inicio still read the old total.
// `@/lib/flushRunner` announces each write the server accepted, and
// `useFreshAfterWrites` (`@/api/hooks`) re-reads what Inicio draws from it.
//
// ⚠️ A REPLY THAT LANDED, NEVER A WRITE THAT WAS QUEUED: the figure is the
// server's, so it is re-read only once the server has the row.
// ============================================================================

import type { WriteKind } from '@/api/outbox';

type Listener = (kind: WriteKind) => void;

const listeners = new Set<Listener>();

/** Listen for writes the server accepted; returns the way to stop. */
export function onLanded(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Called by the flusher once a write's reply has landed. */
export function announceLanded(kind: WriteKind): void {
  for (const listener of listeners) listener(kind);
}
