// ============================================================================
// WHAT A FLUSH DOES, AND NOTHING ABOUT WHEN ONE RUNS. Plan task 5c-ii-a, and
// the tenth module of `src/api/` on the pure side of the boundary (ADR-035
// §2.11, `R12`, `R13`). `@/api/outbox` decides what may be in the queue;
// this decides what leaves it.
//
// ⚠️⚠️ IT NEVER DECIDES WHEN IT RUNS, AND THAT IS THE SEAM THE SPLIT IS MADE
// ON. There is no timer here, no `AppState` listener, no connectivity import
// and no reconnect. Those are `5c-ii-b`, and they are a separate task because
// the answer they need — `expo-network` or `@react-native-community/netinfo` —
// is a READING on two devices rather than a choice between two changelogs, and
// on the day this was written neither iOS instrument was free to take it (this
// Mac has no iOS Simulator; the owner's iPhone is holding the `5a-iv-d` day-8
// reading). A drain that grows its own trigger has taken that task back into a
// sitting where nothing in this repository could measure it.
//
// ⚠️ EVERYTHING THAT TALKS IS AN INJECTED PORT, which is what lets a node suite
// run the whole loop — the claim, the settle, the retry, the forget — with no
// device and no network. It is the same move `@/api/outbox` makes with the uuid
// and the clock, one layer up. `@/lib/flushRunner` is the only module that
// binds the real four.
//
// ⚠️⚠️ THE ARGUMENT NAMES ARE `p_` + THE PAYLOAD'S OWN KEYS, AND THAT IS A
// CONSEQUENCE RATHER THAN A CONVENTION. `0024` decision 5 stores
// `failed_write.payload` as *"the original call's arguments, KEYED BY ARGUMENT
// NAME"* and `replay_failed_write` (`0026`) reads that object directly —
// `payload->'lines'`, `payload->>'location_id'`, `payload->>'provider_id'`,
// `payload->>'from_location_id'`. None of those carries the prefix, so the
// queue stores the bare names and the prefix is added HERE, at the call, which
// is `R13`'s rule applied to a payload the server also reads.
//
// ⚠️⚠️ AND `p_replay_of_failed_write_id` IS NEVER SENT FROM A DEVICE. `0025`
// fences that argument at `manager` and exempts the write it marks from the
// clamp AND from the 15-minute void window — a flush that forwarded one out of
// a payload would hand a cashier both. It is stripped, by name, below.
//
// ⚠️⚠️ IT DEAD-LETTERS AS OF `5c-iii`, AND THE JUDGEMENT IS NOT HERE. This
// module owned no classification until 2026-09-20 — every failure was a retry —
// and what changed is one branch: `classify` in `@/api/deadletter` says whether
// a thrown refusal can ever succeed, and a permanent one is REPORTED to
// `record_failed_write` and then rejected. The reasons live in that module
// beside the codes, because they are claims about `0016`–`0025` rather than
// about the loop.
//
// ⚠️ THE ORDER IS REPORT FIRST, REJECT SECOND, AND IT IS NOT STYLISTIC. `dead`
// is terminal from the device (`advance`: *"replay is manual, never
// automatic"*), so a row marked `dead` before the server confirmed the dead
// letter is a sale that exists nowhere — off the queue, off the ledger, with no
// `failed_write` row for §2.10's nightly check to find. A failed report is
// therefore an ordinary retry: the row goes back to `pending`, and the uuid
// makes the second report a no-op rather than a second downgrade (`0024`
// decision 7).
//
// ⚠️⚠️ AND A DEAD-LETTERED ROW DOES NOT STOP THE DRAIN. A transient failure
// still does — the overwhelmingly common one is no signal, where every later
// row fails identically — but a permanent one has LEFT the queue, so there is
// nothing left to block behind it. That is `5c-ii-a`'s decision 1 paying for
// itself: the cost it named was "a row that can never succeed blocks every
// write behind it", and this is the half that removes the row.
// ============================================================================

import { classify, reportArgs, reportedFrom, type Failure } from '@/api/deadletter';
import {
  advance,
  forgotten,
  moved,
  type OutboxState,
  type QueuedWrite,
  type WriteKind,
} from '@/api/outbox';

/**
 * The RPC each kind is sent to (`R13`: a function's name is written once, in a
 * module the suite can read). ⚠️ All four take `p_id`, `p_lines`,
 * `p_occurred_at` and `p_recorded_offline`; they differ only in the location
 * arguments, and those come out of the payload by name.
 */
export const RECORD_RPC = {
  purchase: 'record_purchase',
  sale: 'record_sale',
  waste: 'record_waste',
  transfer: 'record_transfer',
} as const satisfies Readonly<Record<WriteKind, string>>;

/**
 * Payload keys this module refuses to forward, and neither is an oversight.
 *
 * ⚠️ `recorded_offline` is DECIDED AT FLUSH (below), so a stale one stored at
 * enqueue must not win. `replay_of_failed_write_id` is `0025`'s manager-fenced
 * exemption from the clamp and the void window — see the header.
 */
const NEVER_FROM_A_DEVICE = ['recorded_offline', 'replay_of_failed_write_id'] as const;

/**
 * ⚠️⚠️ `recorded_offline` IS TRUE WHEN THE WRITE WAS NOT COMMITTED ON ITS FIRST
 * ATTEMPT — never from what the phone believed about its signal.
 *
 * `advance(write, 'claim')` increments `attempts` before the send, so a first
 * attempt reaches the wire holding `attempts === 1`. Anything higher is a write
 * that has already been tried and has not landed.
 *
 * ⚠️ WHY IT IS NOT A CONNECTIVITY READING: this flag decides whether the server
 * overrides `occurred_at` with `now()` (§2.6), and therefore WHICH DAY A SALE
 * COUNTS ON in Números. A phone that thinks it has signal and does not would
 * mark the write online, and the server would then re-date a 09:00 sale to
 * 14:00 — the precise harm §2.6's clamp exists to bound, arriving through the
 * client instead. The first-attempt rule needs no oracle and degrades safely:
 * a blip at 09:00:05 flags the write offline, the device's own time is accepted
 * and clamped, and nothing is wrong.
 */
export function recordedOffline(write: QueuedWrite): boolean {
  return write.attempts > 1;
}

/**
 * When the thing happened, as the server must be told it.
 *
 * ⚠️⚠️ THE FALLBACK IS LOAD-BEARING AND IT IS NOT A DEFAULT. `0025`'s offline
 * branch is `greatest(least(coalesce(p_occurred_at, v_now), v_now), v_now -
 * interval '72 hours')` — so an offline write that arrives with a NULL
 * `occurred_at` is silently stamped with the moment of the flush. A sale rung
 * up at 09:00 without signal and drained at 14:00 would count on the wrong day,
 * by omission rather than by override, and nothing on either side would raise.
 * The queue already holds the answer — `queuedAt`, written by `queueWrite` from
 * the device's clock — so it is sent whenever the payload does not carry one.
 */
export function occurredAt(write: QueuedWrite): string {
  const stored = write.payload.occurred_at;
  return typeof stored === 'string' && stored.trim() !== '' ? stored : write.queuedAt;
}

/**
 * The arguments this write is sent with — `p_` + the payload's own keys, plus
 * the three this module owns. See the header for why the prefix is added here.
 */
export function sendArgs(write: QueuedWrite): Readonly<Record<string, unknown>> {
  const args: Record<string, unknown> = { p_id: write.id };
  for (const key of Object.keys(write.payload)) {
    if ((NEVER_FROM_A_DEVICE as readonly string[]).includes(key)) continue;
    if (key === 'occurred_at') continue;
    args[`p_${key}`] = write.payload[key];
  }
  args.p_occurred_at = occurredAt(write);
  args.p_recorded_offline = recordedOffline(write);
  return args;
}

/**
 * The order a flush takes the queue in: PENDING only, oldest first.
 *
 * ⚠️ OLDEST-FIRST IS NOT COSMETIC. Every `record_*` allocates against the shelf
 * — `allocate_fefo` for a sale, a new batch for a purchase — so the order
 * writes land in is the order the ledger attributes cost in. Draining newest
 * first would record a shop's morning against its afternoon's lots.
 *
 * ⚠️ A `flushing` row is NOT here: something claimed it. `dead` is not here
 * either, and `advance` refuses it a second time if this is ever wrong.
 * ⚠️ `queuedAt` ties are broken by id so two sales rung up in the same
 * millisecond drain in a stable order rather than SQLite's.
 */
export function drainOrder(queue: readonly QueuedWrite[]): readonly QueuedWrite[] {
  return queue
    .filter((w) => w.state === 'pending')
    .slice()
    .sort((a, b) => (a.queuedAt === b.queuedAt ? cmp(a.id, b.id) : cmp(a.queuedAt, b.queuedAt)));
}

function cmp(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Rows left `flushing` by a process that is no longer running.
 *
 * ⚠️⚠️ THIS IS THE "SITS IN THE QUEUE WHILE THE APP BELIEVES IT FLUSHED"
 * FAILURE, AND IT IS WHY IT IS SAFE TO UNSTICK THEM. The app is killed mid-send
 * — a phone in a pocket, a crash, a battery — and the row stays claimed
 * forever, which is a sale lost on the device with nobody to notice. Re-queuing
 * it costs nothing because the write may ALREADY have landed: the uuid makes
 * the re-send a success carrying `already_recorded` rather than a second sale
 * (§2.6). This is the whole of *"retries are free"*, applied to a crash.
 *
 * ⚠️ IT IS ONLY EVER SAFE AT THE START OF A FLUSH, which is what the
 * single-flight gate guarantees: one flusher, one process, so a `flushing` row
 * seen here belongs to nobody. `attempts` is kept — the attempt was made.
 */
export function stale(queue: readonly QueuedWrite[]): readonly QueuedWrite[] {
  return queue.filter((w) => w.state === 'flushing');
}

/** What the server said, read from the RPC's reply. */
export type SendResult =
  | { readonly landed: true; readonly alreadyRecorded: boolean }
  | { readonly landed: false };

/**
 * A reply becomes an outcome.
 *
 * ⚠️ AN UNREADABLE REPLY IS A RETRY, AND THE UUID IS WHAT MAKES THAT FREE. If
 * the server committed and we send again, §2.6 answers `already_recorded`; if
 * it did not, the write finally lands. Reading an unrecognisable object as a
 * success is the only version of this that can lose a sale.
 */
export function landedFrom(data: unknown): SendResult {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return { landed: false };
  const row = data as Record<string, unknown>;
  if (typeof row.already_recorded !== 'boolean') return { landed: false };
  return { landed: true, alreadyRecorded: row.already_recorded };
}

/** The four things a flush needs that this module refuses to own. */
export interface FlushPorts {
  /** The queue as it stands. `@/lib/outboxDb`'s `readQueue`. */
  readonly read: () => readonly QueuedWrite[];
  /** A row that stayed in the queue, in its new state. `settle`. */
  readonly settle: (id: string, state: OutboxState, attempts: number) => void;
  /** A row that landed. There is no `sent` state — `forget`. */
  readonly forget: (id: string) => void;
  /**
   * One RPC. ⚠️ It THROWS on failure, like every other wrapper (`R12`), and
   * resolves with the function's `jsonb` reply.
   */
  readonly send: (kind: WriteKind, args: Readonly<Record<string, unknown>>) => Promise<unknown>;
  /**
   * `record_failed_write`, the fifth port and the only one that CHANGES THE
   * LEDGER. ⚠️ It throws like `send`, and a throw here is a retry of the report
   * rather than a dead letter of its own — see the header for why the order is
   * report-then-reject.
   */
  readonly report: (args: Readonly<Record<string, unknown>>) => Promise<unknown>;
}

/** Why a drain stopped. */
export type FlushStop =
  /** Nothing left that is `pending`. */
  | 'drained'
  /**
   * A send failed TRANSIENTLY, so the rest of the queue is not attempted — see
   * `flush`. ⚠️ A permanently rejected write does not stop a drain; it is
   * dead-lettered and the drain continues.
   */
  | 'failed'
  /** Another flush was already running. Nothing was attempted. */
  | 'busy';

export interface FlushReport {
  readonly stop: FlushStop;
  /** Rows re-queued after a crash, before the drain began. */
  readonly recovered: number;
  /** Rows the server accepted, `already_recorded` included. */
  readonly landed: number;
  /** Of those, the ones that were already on the server. */
  readonly alreadyRecorded: number;
  /** Rows put back to `pending` by a failure. At most one — see `flush`. */
  readonly retried: number;
  /**
   * Rows the server accepted as permanently rejected and this drain marked
   * `dead`. ⚠️ Unlike `retried` there may be many: a dead letter leaves the
   * queue, so the drain carries on.
   */
  readonly deadLettered: number;
  /**
   * Of those, the ones whose shelf the server actually moved — `sale` and
   * `waste` only (`0024`, amendment 2). ⚠️ THIS IS THE COUNT §2.6 CALLS LOSSY:
   * every one of them reconciled quantity and carried no revenue, no tax split
   * and no batch attribution.
   */
  readonly downgraded: number;
}

export interface Flusher {
  readonly flush: () => Promise<FlushReport>;
}

/**
 * One flusher over one queue.
 *
 * ⚠️⚠️ SINGLE-FLIGHT, AND IT IS A CLOSURE RATHER THAN A MODULE-SCOPE FLAG. Two
 * concurrent drains would both read the same `pending` row, and only one of the
 * two claims can be the one `advance` allows — the other would be claiming a
 * row already in flight, which is the bug `advance`'s refusals exist to name.
 * A second call while one is running is a NO-OP returning `busy`, not a queue.
 * ⚠️ It is also what makes `stale` safe: inside this gate, a `flushing` row
 * belongs to no live send.
 *
 * ⚠️⚠️ THE DRAIN STOPS AT THE FIRST *TRANSIENT* FAILURE. The overwhelmingly
 * common one is no signal, where every later row would fail identically — and
 * stopping keeps the ledger's order the shop's order, which oldest-first exists
 * for. ⚠️ A PERMANENT one does not stop it: the row is dead-lettered, leaves the
 * queue, and the drain moves on. `5c-ii-a` named the cost of stopping — *"a row
 * that can never succeed blocks every write behind it"* — and `5c-iii` is the
 * half that removes the row rather than the half that loosens the rule.
 */
export function createFlusher(ports: FlushPorts): Flusher {
  let inFlight: Promise<FlushReport> | null = null;

  async function drain(): Promise<FlushReport> {
    let recovered = 0;
    for (const write of stale(ports.read())) {
      const back = advance(write, 'retry');
      if (moved(back)) {
        ports.settle(write.id, back.move, back.attempts);
        recovered += 1;
      }
    }

    let landed = 0;
    let alreadyRecorded = 0;
    let deadLettered = 0;
    let downgraded = 0;
    for (const write of drainOrder(ports.read())) {
      const claim = advance(write, 'claim');
      if (!moved(claim)) continue;
      ports.settle(write.id, claim.move, claim.attempts);
      const claimed: QueuedWrite = { ...write, state: claim.move, attempts: claim.attempts };

      let result: SendResult;
      // ⚠️ `{ permanent: false }` IS ALSO WHAT A SUCCESS LEAVES BEHIND, which is
      // why this is read only on the `!landed` path below.
      let failure: Failure = { permanent: false };
      try {
        result = landedFrom(await ports.send(claimed.kind, sendArgs(claimed)));
      } catch (error) {
        result = { landed: false };
        failure = classify(error);
      }

      if (result.landed) {
        const done = advance(claimed, 'landed');
        if (forgotten(done)) ports.forget(claimed.id);
        landed += 1;
        if (result.alreadyRecorded) alreadyRecorded += 1;
        continue;
      }

      if (failure.permanent) {
        // ⚠️⚠️ REPORT FIRST, REJECT SECOND — see the header. If the report
        // throws, or answers something `reportedFrom` will not read, this falls
        // through to the retry below with the row still in the queue and the
        // ledger untouched.
        let filed = false;
        try {
          const report = reportedFrom(await ports.report(reportArgs(claimed, failure)));
          filed = true;
          if (report.downgraded) downgraded += 1;
        } catch {
          filed = false;
        }
        if (filed) {
          const gone = advance(claimed, 'reject');
          if (moved(gone)) ports.settle(claimed.id, gone.move, gone.attempts);
          deadLettered += 1;
          // ⚠️ AND THE DRAIN CARRIES ON. The row that could never succeed is
          // out of `pending`, so nothing is behind it any more.
          continue;
        }
      }

      const back = advance(claimed, 'retry');
      if (moved(back)) ports.settle(claimed.id, back.move, back.attempts);
      return {
        stop: 'failed',
        recovered,
        landed,
        alreadyRecorded,
        retried: 1,
        deadLettered,
        downgraded,
      };
    }

    return {
      stop: 'drained',
      recovered,
      landed,
      alreadyRecorded,
      retried: 0,
      deadLettered,
      downgraded,
    };
  }

  return {
    flush(): Promise<FlushReport> {
      if (inFlight !== null) {
        return Promise.resolve({
          stop: 'busy',
          recovered: 0,
          landed: 0,
          alreadyRecorded: 0,
          retried: 0,
          deadLettered: 0,
          downgraded: 0,
        });
      }
      const run = drain().finally(() => {
        inFlight = null;
      });
      inFlight = run;
      return run;
    },
  };
}
