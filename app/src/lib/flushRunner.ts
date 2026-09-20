// ============================================================================
// THE ONLY MODULE THAT BINDS THE FLUSH'S FOUR PORTS TO REAL ONES. Plan task
// 5c-ii-a.
//
// ⚠️ IT IS DELIBERATELY UNTESTABLE, AND EVERYTHING IN IT WITH A RIGHT ANSWER IS
// IN `@/api/flush`. It reaches `@/lib/outboxDb`, which opens `expo-sqlite`, and
// `@/api/calls`, which imports the live client — so no node suite can load this
// file, and `app/vitest.config.ts` collects `test/**` only so nothing tries.
// What is left here is four one-line adapters and the decision that there is
// ONE flusher.
//
// ⚠️⚠️ ONE FLUSHER PER APP, AND THAT IS WHAT MAKES SINGLE-FLIGHT MEAN ANYTHING.
// `createFlusher` holds its gate in a closure, so two flushers over one queue
// would be two drains reading the same `pending` row — the exact race the gate
// exists to refuse. Held lazily rather than at module scope for the reason
// `@/lib/store.ts` already records: a module-scope open is a file handle taken
// before the app has decided it needs one.
//
// ⚠️ NOTHING CALLS THIS YET, AND THAT IS `5c-ii-b`. The trigger — connectivity
// as one signal, the reconnect, the cadence — is the next task, and it is
// separate because the dependency behind it is a reading on two devices rather
// than a choice between two changelogs.
// ============================================================================

import { sendQueuedWrite } from '@/api/calls';
import { createFlusher, type Flusher } from '@/api/flush';
import { forget, outboxDb, readQueue, settle } from '@/lib/outboxDb';

let instance: Flusher | undefined;

/** The app's one flusher over the app's one queue. */
export function flusher(): Flusher {
  if (instance === undefined) {
    instance = createFlusher({
      read: () => readQueue(outboxDb()),
      settle: (id, state, attempts) => settle(outboxDb(), id, state, attempts),
      forget: (id) => forget(outboxDb(), id),
      send: sendQueuedWrite,
    });
  }
  return instance;
}
