// ============================================================================
// THE OUTBOX, AS A DECISION RATHER THAN A DATABASE. Plan task 5c-i, and the
// eighth module of `src/api/` on the pure side of the boundary (ADR-035 §2.11,
// `R12`, `R13`): everything with a right answer is in here, and nothing that
// talks. `@/lib/outboxDb` is the half that opens SQLite; `@/lib/ids` is the
// half that makes a uuid.
//
// ⚠️⚠️ IT HAS NO CALLER TODAY AND THAT IS THE POINT. Nothing in this app writes
// a sale, a purchase or a waste — `5f`, `5g` and `5h` are those screens and
// none of them exists. §2.6 puts EVERY client write behind this queue ("the
// client generates the id, writes to a local queue, renders optimistically,
// flushes on reconnect"), so a screen that learns to `await supabase.rpc`
// first is a screen rewritten when the queue arrives. Built ahead of its
// callers deliberately, and the plan's `5c-i` row says so.
//
// ⚠️⚠️ C10.3 LIVES HERE, WHICH IS NOT WHERE IT SOUNDS LIKE IT LIVES. "The slide
// looks identical offline" reads like a rendering rule, and §2.11 guarantees
// nothing in this repository can hold a rendering rule. It is not one: if
// enqueuing is the ONLY write path then the confirmation NEVER WAITS FOR THE
// NETWORK and cannot look different offline, because the screen is never told
// which it was. `queueWrite` returning a row rather than a promise is that
// sentence made structural.
//
// ⚠️⚠️ THE PAYLOAD SHAPE IS NOT OURS TO CHOOSE — `0026` HAS ALREADY READ IT.
// `failed_write.payload` is "the original call's arguments, KEYED BY ARGUMENT
// NAME" (`0024` decision 5), and `replay_failed_write` reads that object
// directly: `payload->'lines'`, `payload->>'occurred_at'`,
// `payload->>'recorded_offline'`, `payload->>'provider_id'`,
// `payload->>'from_location_id'`, `payload->>'to_location_id'`. Note what is
// NOT there: the `p_` prefix. So a queued write stores the argument object in
// `0026`'s spelling, `5c-iii` hands it to `record_failed_write` untouched, and
// replay works. The `p_` names stay where `R13` already puts them — in the
// wrapper — and the translation happens at the call, not in storage. Storing
// `p_`-keyed arguments instead would typecheck, store, flush and dead-letter
// perfectly, and be discovered on the day somebody tried to replay one.
//
// ⚠️ "THE OUTBOX TABLE" IS A TABLE ON THE PHONE AND NOT A MIGRATION. Step 5
// ships no Postgres migration and this task ships none; the schema here is
// device-local SQLite, created by the app on first open and versioned by
// `PRAGMA user_version`. Nothing in `supabase/migrations/` moves.
//
// ⚠️ BOTH IMPURE INPUTS ARE INJECTED — the uuid and the clock. That is the same
// move `@/lib/store.ts` makes with `deviceStore()`, and it is what lets the
// suite pin every rule below without a device: `queueWrite` is handed the id
// and the instant, so there is nothing in this file a node process cannot run.
// ============================================================================

/**
 * The four kinds `0024` allows, written once (`R13` applied to a CHECK
 * constraint rather than to an argument list).
 *
 * ⚠️ IT IS `failed_write_kind_known`'s LIST, not a list of screens. `transfer`
 * has no screen and `0020`'s idempotency rests on an advisory lock rather than
 * a key — but a queue that cannot hold one is a queue that silently drops the
 * kind `5c-iii` is least able to recover.
 */
export const WRITE_KINDS = ['purchase', 'sale', 'waste', 'transfer'] as const;
export type WriteKind = (typeof WRITE_KINDS)[number];

/**
 * The three states ADR-035 §2.6 names: *"The outbox has three states —
 * `pending`, `flushing`, `dead`."*
 *
 * ⚠️ THERE IS NO `sent`, AND ITS ABSENCE IS THE DESIGN. A write that lands
 * LEAVES the queue — see `advance`. A fourth state holding landed writes is a
 * second record of what the ledger already holds, and the ledger is the only
 * thing that decides what is stored (§2.6).
 */
export const OUTBOX_STATES = ['pending', 'flushing', 'dead'] as const;
export type OutboxState = (typeof OUTBOX_STATES)[number];

/**
 * The RPC's arguments, keyed by argument name, in `0026`'s spelling — see the
 * header. An OBJECT, because `failed_write_payload_is_object` refuses anything
 * else and `replay_failed_write` could not re-run a bare array.
 */
export type WritePayload = Readonly<Record<string, unknown>>;

/** One row of the queue. */
export interface QueuedWrite {
  /**
   * ⚠️ THE CLIENT UUID, AND IT IS LOAD-BEARING TWICE. It is `record_sale`'s
   * `id`, which is what makes a retry a success rather than a second sale
   * (§2.6 idempotency); and it is `failed_write.id`, which is what makes a
   * second report of one failure a no-op rather than a second downgrade
   * (`0024` decision 7). The same eight bytes do both jobs, which is why this
   * module generates it once and never again.
   */
  readonly id: string;
  readonly kind: WriteKind;
  readonly payload: WritePayload;
  readonly state: OutboxState;
  /** How many times something has CLAIMED this row, not how many times it failed. */
  readonly attempts: number;
  /** When the person did the thing, ISO-8601. The device's clock, clamped server-side. */
  readonly queuedAt: string;
}

/** What the caller asks to be queued. */
export interface WriteDraft {
  readonly kind: WriteKind;
  readonly payload: WritePayload;
}

/** The two impure things, handed in rather than read. */
export interface Stamp {
  readonly id: string;
  readonly now: string;
}

/**
 * A canonical uuid, lower-cased.
 *
 * ⚠️ THE CASE MATTERS ON EXACTLY ONE SIDE. Postgres accepts `A1B2…` and stores
 * it lower-cased, so two spellings of one uuid are the SAME row on the server
 * and two DIFFERENT rows in SQLite, whose `text` primary key is byte-compared.
 * That is a duplicate sale in the queue that the server would deduplicate and
 * the device would not — so the normalisation happens here, once, on the way
 * in, rather than being remembered at three call sites.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function normalizeWriteId(value: string): string | null {
  const lower = value.trim().toLowerCase();
  return UUID.test(lower) ? lower : null;
}

/** Is this a kind `0024` would accept? Narrows, so callers need no cast. */
export function isWriteKind(value: unknown): value is WriteKind {
  return typeof value === 'string' && (WRITE_KINDS as readonly string[]).includes(value);
}

/** Is this a state §2.6 named? */
export function isOutboxState(value: unknown): value is OutboxState {
  return typeof value === 'string' && (OUTBOX_STATES as readonly string[]).includes(value);
}

/**
 * Is this a payload `0024`'s constraint would accept — an object, not an array
 * and not a scalar?
 *
 * ⚠️ `typeof null === 'object'` AND `Array.isArray` IS THE OTHER HALF. Both
 * mistakes pass a naive `typeof` check and both are refused by
 * `failed_write_payload_is_object` at a distance of three tasks.
 */
export function isWritePayload(value: unknown): value is WritePayload {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Why a draft was refused. Never shown to anybody — see `queueWrite`. */
export type QueueRefusal = 'unknown-kind' | 'payload-not-an-object' | 'bad-id';

export type Queued =
  | { readonly ok: true; readonly write: QueuedWrite }
  | { readonly ok: false; readonly why: QueueRefusal };

/**
 * A draft becomes a queued write. SYNCHRONOUS, and that is C10.3 — see the
 * header.
 *
 * ⚠️⚠️ EVERY REFUSAL HERE IS A PROGRAMMING ERROR AND NONE OF THEM IS A
 * SHOPKEEPER'S PROBLEM. An unknown kind, a payload that is not an object, a
 * malformed uuid: a person standing at a counter cannot cause any of the
 * three, and none has a Spanish sentence because none may ever reach a screen.
 * They are returned rather than thrown so the caller that WILL exist — the
 * wrapper in `5c-ii` — has somewhere to put them other than a crash on the
 * till. ⚠️ `R4` is also why: a sentence here would be Spanish outside
 * `src/strings.ts`.
 */
export function queueWrite(draft: WriteDraft, stamp: Stamp): Queued {
  if (!isWriteKind(draft.kind)) return { ok: false, why: 'unknown-kind' };
  if (!isWritePayload(draft.payload)) return { ok: false, why: 'payload-not-an-object' };
  const id = normalizeWriteId(stamp.id);
  if (id === null) return { ok: false, why: 'bad-id' };
  return {
    ok: true,
    write: {
      id,
      kind: draft.kind,
      payload: draft.payload,
      state: 'pending',
      attempts: 0,
      queuedAt: stamp.now,
    },
  };
}

/**
 * What can happen to a row that is already in the queue.
 *
 * ⚠️ THESE ARE OUTCOMES, NOT STATES, and `landed` is the one that proves the
 * difference: it is the commonest thing that happens to a queued write and it
 * is not a state, because the row goes away.
 */
export type OutboxEvent = 'claim' | 'landed' | 'retry' | 'reject';

export type Transition =
  /** Stay in the queue, in this state, with this attempt count. */
  | { readonly move: OutboxState; readonly attempts: number }
  /** It is on the server. The row leaves the queue. */
  | { readonly forget: true }
  /** Not a legal move from where this row is. The caller has a bug. */
  | { readonly refused: string };

/**
 * The transition function, and it is ONE function rather than a column
 * somebody sets.
 *
 * ⚠️⚠️ THE RULE THAT MATTERS IS THAT ONLY A `flushing` ROW MAY SETTLE. A
 * `pending` row has nothing in flight, so `landed`, `retry` and `reject` on
 * one are all the same bug wearing three hats: something settled a write it
 * never claimed. Allowing it would let two flushers agree that one sale both
 * landed and died, and §2.11 means no suite outside this file would ever see
 * it.
 *
 * ⚠️ AND `dead` IS TERMINAL FROM HERE. Recovery is `replay_failed_write`, run
 * by us, one row at a time, by a person who has seen the peso figure first
 * (§2.6: "replay is manual, never automatic"). A `dead` row this app could put
 * back on its own is that ruling undone in the one place nobody is looking.
 */
export function advance(write: QueuedWrite, event: OutboxEvent): Transition {
  if (write.state === 'dead') {
    return { refused: 'a dead letter is replayed by us, never re-queued by the device' };
  }
  if (event === 'claim') {
    if (write.state !== 'pending') {
      return { refused: 'only a pending row may be claimed — this one is already in flight' };
    }
    return { move: 'flushing', attempts: write.attempts + 1 };
  }
  if (write.state !== 'flushing') {
    return { refused: `nothing claimed this row, so it cannot ${event}` };
  }
  switch (event) {
    case 'landed':
      return { forget: true };
    case 'retry':
      return { move: 'pending', attempts: write.attempts };
    case 'reject':
      return { move: 'dead', attempts: write.attempts };
  }
}

/** Did this transition keep the row in the queue? Narrows for the storage half. */
export function moved(t: Transition): t is { readonly move: OutboxState; readonly attempts: number } {
  return 'move' in t;
}

/** Did the write land? */
export function forgotten(t: Transition): t is { readonly forget: true } {
  return 'forget' in t;
}
