// ============================================================================
// THE COMMIT'S EFFECTFUL HALF — the row reaching the queue. Plan task
// `5f-iii-b`, and the first thing this app has ever put in the outbox.
//
// ⚠️⚠️ THIS MODULE EXISTS BECAUSE A GUARD REFUSED THE OTHER DESIGN, AND THE
// GUARD WAS RIGHT. `5f-iii-b` first had `vender.tsx` call `enqueue(outboxDb())`
// itself; `app/test/auth-errors.test.ts` went red naming the reason in its own
// comment — *"a third entry is the failure §2.6 cannot survive: the outbox is
// the only write path, so a route that opened it for itself would be a sale
// written by a file that never learned about `pending`, `flushing` or `dead`."*
//
// ⚠️ SO THE QUEUE NOW HAS THREE MODULES AND THEY ARE THREE VERBS. `flushRunner`
// DRAINS it, `DeadLetterBanner` COUNTS it, and this FILLS it. None of the three
// is a screen, which is the property that assertion actually pins.
//
// ----------------------------------------------------------------------------
// ⚠️⚠️ THE ORDER IS THE WHOLE OF WHAT THIS FILE KNOWS
// ----------------------------------------------------------------------------
// `enqueue` first, THEN `queued()`. A drain told before the row is on disk
// drains a queue the sale is not in yet — the sale still goes, on the next
// reconnect or app-state wake, but it sits there until one happens. That is the
// silent half-failure `5c-ii-b-2`'s row describes, and the reason it is a rule
// in a module rather than two lines in a component is that a component is where
// it would be reordered by somebody tidying.
//
// ⚠️ `queued()` IS TOLD, NOT AWAITED. `queueWrite` returns a row rather than a
// promise (C10.3) so the offline path and the online path are one path; calling
// the trigger offline, or before the monitor has started, is a safe no-op. The
// screen never has to ask which it is.
//
// ⚠️ IT DECIDES NOTHING. Whether this basket may be committed at all is
// `@/cart/commit`'s, where a node suite reads it. By the time a `QueuedWrite`
// arrives here there is nothing left to refuse — so this function returns
// nothing and has no failure to report.
// ============================================================================

import type { QueuedWrite } from '@/api/outbox';
import { queued } from '@/lib/connectivityMonitor';
import { enqueue, outboxDb } from '@/lib/outboxDb';

/**
 * Put a committed write in the queue and tell the drain it is there.
 *
 * ⚠️ SYNCHRONOUS ALL THE WAY DOWN, which is what lets the slide's confirmation
 * fire in the same frame the thumb lets go — §2.8's *"the sale confirmation
 * fires on ENQUEUE, never on the server's reply."*
 */
export function commitToQueue(write: QueuedWrite): void {
  enqueue(outboxDb(), write);
  queued();
}
