import { describe, expect, it } from 'vitest';

import {
  OUTBOX_STATES,
  WRITE_KINDS,
  advance,
  forgotten,
  isOutboxState,
  isWriteKind,
  isWritePayload,
  moved,
  normalizeUuid,
  queueWrite,
  type OutboxEvent,
  type OutboxState,
  type QueuedWrite,
} from '@/api/outbox';

// ============================================================================
// THE OUTBOX. Plan task 5c-i.
//
// ⚠️⚠️ WHAT THIS SUITE IS FOR AND WHAT IT CANNOT DO, STATED TOGETHER — the
// sentence every sibling module's suite opens with, and here it points the
// other way for once. ADR-035 §2.11 names "the outbox state machine" among the
// three things a client unit test MAY pin, beside the money formatter and unit
// conversion. So unlike every other `src/api/` module, the thing this file
// asserts is not a string sent to PostgREST that only a live database can
// confirm — it is a decision procedure that is entirely ours, and this suite
// is its whole instrument.
//
// IT CANNOT SEE THE SQL. `@/lib/outboxDb` opens `expo-sqlite` and no node
// process can load it. What that half does with these answers — the table, the
// `insert or ignore`, the row it drops rather than throwing on — is unasserted
// here and is named in that file rather than left to be found.
//
// ⚠️ AND IT CANNOT SEE `0026`. The payload shape these rows carry is
// `failed_write.payload`'s shape, keyed by argument name with no `p_` prefix,
// because `replay_failed_write` reads it directly. No line of TypeScript has
// ever read that function; `5c-iii`'s contract check is what will.
// ============================================================================

/** The shop every fixture below belongs to. See `workspaceId`. */
const SHOP = '00000000-1111-4222-8333-444444444444';

/** A row in whatever state the assertion needs. */
function row(over: Partial<QueuedWrite> = {}): QueuedWrite {
  return {
    id: '11111111-2222-4333-8444-555555555555',
    workspaceId: SHOP,
    kind: 'sale',
    payload: { lines: [], occurred_at: '2026-09-20T10:00:00.000Z' },
    state: 'pending',
    attempts: 0,
    queuedAt: '2026-09-20T10:00:00.000Z',
    ...over,
  };
}

describe('the two lists the database already fixed', () => {
  // ⚠️ `failed_write_kind_known` IS THE SOURCE, not a list of screens. A fifth
  // kind here is a write `record_failed_write` refuses outright (`0024`, and
  // its own check: "kind must be one of purchase, sale, waste, transfer").
  it('holds exactly the four kinds 0024 allows', () => {
    expect([...WRITE_KINDS].sort()).toEqual(['purchase', 'sale', 'transfer', 'waste']);
  });

  // ⚠️ §2.6, verbatim: "The outbox has three states — pending, flushing, dead."
  it('holds exactly the three states §2.6 names, in §2.6’s order', () => {
    expect(WRITE_KINDS.length).toBe(4);
    expect([...OUTBOX_STATES]).toEqual(['pending', 'flushing', 'dead']);
  });

  // ⚠️⚠️ THE ASSERTION THAT WOULD CATCH THE OBVIOUS "FIX". A fourth state
  // holding landed writes is a second record of what the ledger already holds,
  // and §2.6 is explicit that the database is the only thing that decides what
  // is stored. `advance` returns `forget` instead, and the two claims have to
  // be asserted together or either one alone reads as an oversight.
  it('has no state for a write that landed — the row leaves instead', () => {
    expect(isOutboxState('sent')).toBe(false);
    expect(isOutboxState('done')).toBe(false);
    expect(forgotten(advance(row({ state: 'flushing' }), 'landed'))).toBe(true);
  });

  it('narrows a kind and a state, and refuses a near miss', () => {
    expect(isWriteKind('sale')).toBe(true);
    expect(isWriteKind('Sale')).toBe(false);
    expect(isWriteKind('adjustment')).toBe(false);
    expect(isWriteKind(undefined)).toBe(false);
    expect(isOutboxState('flushing')).toBe(true);
    expect(isOutboxState('flushed')).toBe(false);
  });
});

describe('the uuid, which is the same key in two Postgres tables', () => {
  it('accepts a canonical uuid unchanged', () => {
    expect(normalizeUuid('11111111-2222-4333-8444-555555555555')).toBe(
      '11111111-2222-4333-8444-555555555555',
    );
  });

  // ⚠️⚠️ THE CASE RULE, AND IT IS NOT COSMETIC. Postgres stores `A1B2…`
  // lower-cased, so two spellings are ONE row on the server and TWO in a
  // SQLite `text` primary key. Lower-casing on the way in is what stops a
  // queue holding a duplicate the server would have deduplicated.
  it('lower-cases, so one uuid cannot become two rows on the device', () => {
    expect(normalizeUuid('AAAAAAAA-BBBB-4CCC-8DDD-EEEEEEEEEEEE')).toBe(
      'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
    );
    expect(normalizeUuid('  11111111-2222-4333-8444-555555555555  ')).toBe(
      '11111111-2222-4333-8444-555555555555',
    );
  });

  it('refuses anything Postgres would not take as a uuid', () => {
    expect(normalizeUuid('11111111-2222-4333-8444-55555555555')).toBeNull();
    expect(normalizeUuid('11111111222243338444555555555555')).toBeNull();
    expect(normalizeUuid('')).toBeNull();
    expect(normalizeUuid('zzzzzzzz-2222-4333-8444-555555555555')).toBeNull();
  });
});

describe('what a payload may be', () => {
  // ⚠️ `failed_write_payload_is_object` IS THE REASON, three tasks away:
  // "check (jsonb_typeof(payload) = 'object')". An array is one RPC's lines
  // and `0026` could not replay it.
  it('is an object, and the two shapes that sneak past a typeof check are not', () => {
    expect(isWritePayload({ lines: [] })).toBe(true);
    expect(isWritePayload({})).toBe(true);
    expect(isWritePayload([])).toBe(false);
    expect(isWritePayload(null)).toBe(false);
    expect(isWritePayload('{"lines":[]}')).toBe(false);
    expect(isWritePayload(42)).toBe(false);
  });
});

describe('queueing a write', () => {
  const stamp = { id: '11111111-2222-4333-8444-555555555555', now: '2026-09-20T10:00:00.000Z' };
  const draft = { workspaceId: SHOP, kind: 'sale' as const, payload: { lines: [] } };

  it('starts pending, at zero attempts, on the instant it was handed', () => {
    const q = queueWrite(draft, stamp);
    expect(q.ok).toBe(true);
    if (!q.ok) return;
    expect(q.write.state).toBe('pending');
    expect(q.write.attempts).toBe(0);
    expect(q.write.queuedAt).toBe('2026-09-20T10:00:00.000Z');
    expect(q.write.id).toBe(stamp.id);
  });

  // ⚠️⚠️ C10.3, AND IT IS ASSERTED AS A TYPE RATHER THAN AS A SCREEN. "The
  // slide looks identical offline" survives only while enqueuing returns a ROW
  // instead of a promise: the moment this function can be awaited, a screen can
  // wait for it, and then there is an offline path that looks different. §2.11
  // means no suite in this repository could see that on a screen — so it is
  // pinned here, at the one place it is structural.
  it('returns a row and never a promise — the confirmation cannot wait for a network', () => {
    const q = queueWrite(draft, stamp);
    expect(q).not.toBeInstanceOf(Promise);
    expect(typeof (q as { then?: unknown }).then).toBe('undefined');
  });

  it('normalises the id on the way in rather than at three call sites', () => {
    const q = queueWrite(
      { workspaceId: SHOP, kind: 'waste', payload: {} },
      { id: 'AAAAAAAA-BBBB-4CCC-8DDD-EEEEEEEEEEEE', now: stamp.now },
    );
    expect(q.ok).toBe(true);
    if (!q.ok) return;
    expect(q.write.id).toBe('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee');
  });

  it('refuses the four things that are programming errors, by name', () => {
    expect(queueWrite({ workspaceId: SHOP, kind: 'adjustment' as never, payload: {} }, stamp)).toEqual({
      ok: false,
      why: 'unknown-kind',
    });
    expect(queueWrite({ workspaceId: SHOP, kind: 'sale', payload: [] as never }, stamp)).toEqual({
      ok: false,
      why: 'payload-not-an-object',
    });
    expect(queueWrite({ ...draft, payload: {} }, { ...stamp, id: 'nope' })).toEqual({
      ok: false,
      why: 'bad-id',
    });
    // ⚠️⚠️ THE FOURTH, ADDED BY `5c-iii`, AND IT IS REFUSED HERE RATHER THAN AT
    // THE DEAD LETTER. A row queued with no workspace can be sent and can land;
    // the only thing it can never do is be REPORTED when it is permanently
    // rejected, because `record_failed_write` takes `p_workspace_id` and
    // validates it. Catching it at the till turns a failure discovered at the
    // worst possible moment into one that cannot be queued at all.
    expect(queueWrite({ ...draft, workspaceId: 'not-a-uuid' }, stamp)).toEqual({
      ok: false,
      why: 'bad-workspace',
    });
  });

  // ⚠️ THE SAME NORMALISATION AS THE ID, AND FOR THE SAME REASON ONE LAYER OUT:
  // Postgres stores a uuid lower-cased, so two spellings of one workspace are
  // one shop on the server and two strings here.
  it('normalises the workspace the same way it normalises the id', () => {
    const q = queueWrite({ ...draft, workspaceId: SHOP.toUpperCase() }, stamp);
    expect(q.ok).toBe(true);
    if (!q.ok) return;
    expect(q.write.workspaceId).toBe(SHOP);
  });

  // ⚠️⚠️ NOT A CONVENIENCE, AND THE COST OF THE ALTERNATIVE IS A SHELF. `0001`
  // admits many shops per person from day one. If the dead letter read "the
  // current shop" at flush instead of this field, a sale queued in shop A and
  // rejected while shop B is open would be filed against B — and `0024` would
  // DOWNGRADE B's shelf for a sale that never happened there.
  it('carries the shop the write was made in, not the shop that is open later', () => {
    const other = '99999999-8888-4777-8666-555555555555';
    const q = queueWrite({ ...draft, workspaceId: other }, stamp);
    expect(q.ok).toBe(true);
    if (!q.ok) return;
    expect(q.write.workspaceId).toBe(other);
  });
});

describe('the transitions, which are the whole of what this module decides', () => {
  it('claims a pending row and counts the attempt', () => {
    expect(advance(row(), 'claim')).toEqual({ move: 'flushing', attempts: 1 });
    expect(advance(row({ attempts: 3 }), 'claim')).toEqual({ move: 'flushing', attempts: 4 });
  });

  it('forgets a flushing row that landed', () => {
    expect(advance(row({ state: 'flushing', attempts: 1 }), 'landed')).toEqual({ forget: true });
  });

  it('puts a flushing row back to pending on a retry, keeping the count', () => {
    expect(advance(row({ state: 'flushing', attempts: 2 }), 'retry')).toEqual({
      move: 'pending',
      attempts: 2,
    });
  });

  it('kills a flushing row that was rejected', () => {
    expect(advance(row({ state: 'flushing', attempts: 1 }), 'reject')).toEqual({
      move: 'dead',
      attempts: 1,
    });
  });

  // ⚠️⚠️ THE RULE THIS FILE EXISTS FOR. Settling a row nothing claimed is two
  // flushers agreeing that one sale both landed and died — and the ledger is
  // where that shows up, days later, as a total nobody can explain.
  it('refuses to settle a row nothing claimed', () => {
    for (const event of ['landed', 'retry', 'reject'] as const) {
      const t = advance(row(), event);
      expect('refused' in t).toBe(true);
    }
  });

  it('refuses to claim a row that is already in flight', () => {
    expect('refused' in advance(row({ state: 'flushing' }), 'claim')).toBe(true);
  });

  // ⚠️ §2.6: "Replay is manual, never automatic." A device that can re-queue
  // its own dead letter is that ruling undone where nobody is looking — the
  // peso figure was never seen and no person decided.
  it('refuses every move out of dead — replay is ours, by hand, one row at a time', () => {
    for (const event of ['claim', 'landed', 'retry', 'reject'] as const) {
      const t = advance(row({ state: 'dead', attempts: 2 }), event);
      expect('refused' in t).toBe(true);
    }
  });

  // ⚠️ RULE 4 APPLIED TO A FUNCTION RATHER THAN TO A CHECK: a transition table
  // that invented a fourth state would pass every assertion above, because
  // each one names the state it expects.
  it('never invents a state outside the three', () => {
    const events: readonly OutboxEvent[] = ['claim', 'landed', 'retry', 'reject'];
    const states: readonly OutboxState[] = OUTBOX_STATES;
    let seen = 0;
    for (const state of states) {
      for (const event of events) {
        const t = advance(row({ state }), event);
        if (moved(t)) {
          expect(OUTBOX_STATES).toContain(t.move);
          expect(t.attempts).toBeGreaterThanOrEqual(0);
          seen += 1;
        }
      }
    }
    expect(seen).toBe(3);
  });
});
