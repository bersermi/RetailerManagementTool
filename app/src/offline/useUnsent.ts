// ============================================================================
// THE UNSENT LIST'S EFFECTFUL HALF — the queue on this phone, read, and one row
// taken out of it. Plan task `5h-ii-c`.
//
// ⚠️⚠️ IT DECIDES NOTHING. Which rows are shown, in what order, what each one is
// worth, what its lines say and whether one may be dropped are every one of them
// in `@/offline/unsent`, where `app/test/unsent.test.ts` reads them. This file is
// `useState`, `useEffect` and two calls into `@/lib/outboxDb` — the part no node
// suite can load, and deliberately the part with no judgement in it.
//
// ⚠️⚠️ AND IT IS A MODULE RATHER THAN CODE INSIDE `documentos.tsx`, WHICH IS A
// GUARD'S RULING AND NOT A PREFERENCE. `app/test/auth-errors.test.ts` pins the
// list of modules that reach `@/lib/outboxDb` and says what the property really
// is: **none of the entries is a screen.** `5f-iii-b` tried the other way —
// `vender.tsx` calling `enqueue(outboxDb())` itself — and that assertion refused
// it. So the queue now has four verbs: `commitRunner` FILLS it, `flushRunner`
// DRAINS it, `DeadLetterBanner` COUNTS it, and this one SHOWS it.
//
// ⚠️ IT DOES NOT IMPORT `expo-sqlite`. `@/lib/outboxDb` stays the one module that
// opens the file, which the same suite pins as an equality of two.
//
// ----------------------------------------------------------------------------
// ⚠️⚠️ WHEN IT RE-READS, AND WHY THOSE THREE MOMENTS
// ----------------------------------------------------------------------------
//   * ON ARRIVAL. `usePathname()` is `DeadLetterBanner`'s own trigger: nothing in
//     this app announces *the queue changed*, so the moment somebody opens a
//     screen that shows it is the moment to look.
//   * ON A RECONNECT, through `subscribe()` — *"reads the signal, never the
//     library"*. The link coming back is what makes the drain run, so it is the
//     one event that empties this list without anybody touching it. ⚠️ Without
//     this the screen would show a delivery as unsent for as long as she stood
//     there after it had landed, with the two controls on it refusing.
//   * AFTER A DROP, because the row she just removed must leave the screen. The
//     re-read is what makes that true rather than a local filter that would then
//     be a second opinion about what the queue holds.
//
// ⚠️ THERE IS A FOURTH MOMENT IT DELIBERATELY DOES NOT WATCH, AND THE LIST IS
// STILL CORRECT WITHOUT IT: a flush that lands while she is looking, with the
// signal already up. `unsentDocuments` takes the SERVER's documents and drops any
// queued row whose id is among them — the client uuid is the server row's id — so
// the row disappears the moment `useDocuments` refetches, with no SQLite read at
// all. **The dedupe is what makes a missed re-read harmless**, which is why it is
// on the queued side rather than on the server's.
// ============================================================================

import { usePathname } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import type { DocumentKind, ShopDocument } from '@/api/documents';
import { useCatalog, useProviders, useUnitFactors } from '@/api/hooks';
import type { QueuedWrite } from '@/api/outbox';
import { subscribe } from '@/lib/connectivityMonitor';
import { drop, outboxDb, readQueue } from '@/lib/outboxDb';
import { unsentDocuments } from '@/offline/unsent';

/** Nothing read yet. Frozen — a shared mutable default is a shared bug. */
const NO_WRITES: readonly QueuedWrite[] = Object.freeze([]) as readonly QueuedWrite[];

/**
 * The unsent documents of one kind, and the way to remove one.
 *
 * @param kind   which list is on screen.
 * @param landed what the server answered for that kind — the dedupe. See the
 *               header, and `UnsentInput.landed`.
 */
export function useUnsent(
  kind: DocumentKind,
  landed: readonly ShopDocument[],
): {
  readonly documents: readonly ShopDocument[];
  /**
   * Take one row out of the queue. `false` means it was no longer `pending` when
   * the statement ran — the drain claimed it, or it had already gone.
   *
   * ⚠️⚠️ THE ANSWER COMES FROM THE DELETE'S OWN ROW COUNT AND NOT FROM
   * `droppable`, which is the property that makes the confirmation honest. A
   * check above the statement has a window the drain walks through; see `drop`.
   */
  readonly remove: (id: string) => boolean;
} {
  const pathname = usePathname();
  const factors = useUnitFactors();
  // ⚠️ ONE CATALOG READ, AND IT IS FOR THE NAMES ALONE. It is `CATALOG_KEY` —
  // the same round trip Productos, La Familia and `Costos` already make — so
  // arriving here from any of them costs nothing. ⚠️⚠️ AND IT IS ALLOWED TO COME
  // BACK EMPTY: `QueryProvider` persists nothing, so a phone restarted with no
  // signal has no catalog at all and every unsent line reads
  // `ES.documents.unknownProduct` while still carrying its amount. That is the
  // degradation `lineOf` describes, and it is the likely case on the phone this
  // list is for.
  const { entries } = useCatalog();
  const { providers } = useProviders(null);
  const [queue, setQueue] = useState<readonly QueuedWrite[]>(NO_WRITES);

  const reread = useCallback(() => {
    setQueue(readQueue(outboxDb()));
  }, []);

  useEffect(() => {
    reread();
  }, [reread, pathname]);

  // ⚠️ ONE SUBSCRIPTION, TORN DOWN WITH THE MOUNT — `OfflineSurfaces`' rule. The
  // monitor hands back its own unsubscribe, which is the only way to remove a
  // watcher.
  useEffect(() => subscribe(() => reread()), [reread]);

  return {
    // ⚠️ COMPUTED ON EVERY RENDER RATHER THAN MEMOISED, DELIBERATELY. Three of
    // the six inputs are fresh objects out of TanStack on each pass — `factors`
    // is built by `unitFactorsFrom` every time — so a `useMemo` over them would
    // never hit and would only hide that. `DOCUMENTS_LIMIT` is 60 documents.
    documents: unsentDocuments({ queue, kind, factors, entries, providers, landed }),
    remove: (id: string) => {
      const done = drop(outboxDb(), id);
      reread();
      return done;
    },
  };
}
