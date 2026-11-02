// ============================================================================
// THE WAITING PRICES CHANGED, OR ONE SETTLED — the two signals the screens and
// the cache listen for. Plan task `8i`, `@/api/shelfPrice`.
//
// ⚠️ IT EXISTS BECAUSE ONLY TWO MODULES CHANGE THE PRICE TABLE AND NEITHER IS A
// SCREEN: `@/lib/commitRunner` fills it and `@/lib/flushRunner` empties it. Each
// says so here, and `@/offline/waitingPrices` (what the screens draw) and
// `QueryProvider` (the cached catalog) listen — `@/lib/landedWrites`' shape.
// It imports nothing native, so either side may import it.
// ============================================================================

import type { PriceOutcome, QueuedPrice } from '@/api/shelfPrice';

type Changed = () => void;
type Settled = (price: QueuedPrice, outcome: PriceOutcome) => void;

const changed = new Set<Changed>();
const settled = new Set<Settled>();

/** Listen for the table changing — a price waiting, or leaving. Returns the way to stop. */
export function onPricesChanged(listener: Changed): () => void {
  changed.add(listener);
  return () => {
    changed.delete(listener);
  };
}

/** Called once a price was put in the table or taken out of it. */
export function announcePricesChanged(): void {
  for (const listener of changed) listener();
}

/**
 * Listen for what the shop did with a price. ⚠️ It fires BEFORE the price leaves
 * the table (`PriceFlushPorts.settled`). Returns the way to stop.
 */
export function onPriceSettled(listener: Settled): () => void {
  settled.add(listener);
  return () => {
    settled.delete(listener);
  };
}

/** Called by the drain once the shop has answered for a price. */
export function announcePriceSettled(price: QueuedPrice, outcome: PriceOutcome): void {
  for (const listener of settled) listener(price, outcome);
}
