import { describe, expect, it } from 'vitest';

import {
  RECORD_RPC,
  createFlusher,
  drainOrder,
  landedFrom,
  occurredAt,
  recordedOffline,
  sendArgs,
  stale,
  type FlushPorts,
} from '@/api/flush';
import { WRITE_KINDS, type OutboxState, type QueuedWrite, type WriteKind } from '@/api/outbox';

// ============================================================================
// THE FLUSH. Plan task 5c-ii-a.
//
// ⚠️⚠️ WHAT THIS SUITE IS FOR AND WHAT IT CANNOT DO, STATED TOGETHER. Like its
// sibling `api-outbox.test.ts`, it pins a decision procedure that is entirely
// ours — ADR-035 §2.11 names the outbox state machine among the three things a
// client unit test may pin, and the drain is that machine being driven. Every
// port is injected, so the whole loop runs here with no device and no network.
//
// ⚠️ IT CANNOT SEE POSTGRES, AND THE HALF IT CANNOT SEE IS THE HALF THAT MOST
// EASILY GOES WRONG. That `record_sale` answers to `p_id`, `p_location_id`,
// `p_lines`, `p_occurred_at` and `p_recorded_offline` is a fact about the
// APPLIED schema, and PostgREST matches an RPC by its parameter names — a
// drifted name is a 404, not a type error (`R13`). `docs/checks/
// 5c-ii-a-flush-contract.sh` is that instrument: a real HTTP round trip that
// sends one uuid to `record_sale` twice.
//
// ⚠️ AND IT CANNOT SEE WHEN A FLUSH RUNS, because nothing here decides that —
// the trigger is `5c-ii-b`. A test that had to mock a connectivity listener
// would be the first sign this module had grown one.
// ============================================================================

/** A queued row in whatever state the assertion needs. */
function row(over: Partial<QueuedWrite> = {}): QueuedWrite {
  return {
    id: '11111111-2222-4333-8444-555555555555',
    kind: 'sale',
    payload: { location_id: '99999999-8888-4777-8666-555555555555', lines: [] },
    state: 'pending',
    attempts: 0,
    queuedAt: '2026-09-20T09:00:00.000Z',
    ...over,
  };
}

/** A queue, a log of what was written back to it, and a scripted server. */
function ports(
  queue: QueuedWrite[],
  send: (kind: WriteKind, args: Readonly<Record<string, unknown>>) => Promise<unknown>,
) {
  const settled: Array<[string, OutboxState, number]> = [];
  const forgotten: string[] = [];
  const sent: Array<[WriteKind, Readonly<Record<string, unknown>>]> = [];
  const p: FlushPorts = {
    read: () => queue.slice(),
    settle: (id, state, attempts) => {
      settled.push([id, state, attempts]);
      const i = queue.findIndex((w) => w.id === id);
      if (i >= 0) queue[i] = { ...queue[i], state, attempts };
    },
    forget: (id) => {
      forgotten.push(id);
      const i = queue.findIndex((w) => w.id === id);
      if (i >= 0) queue.splice(i, 1);
    },
    send: (kind, args) => {
      sent.push([kind, args]);
      return send(kind, args);
    },
  };
  return { p, settled, forgotten, sent };
}

const OK = { already_recorded: false, sale_id: 'x' };
const AGAIN = { already_recorded: true, sale_id: 'x' };

describe('the RPC each kind is sent to', () => {
  it('names one function per kind 0024 allows, and no others', () => {
    expect(Object.keys(RECORD_RPC).sort()).toEqual([...WRITE_KINDS].sort());
    expect(Object.values(RECORD_RPC)).toEqual([
      'record_purchase',
      'record_sale',
      'record_waste',
      'record_transfer',
    ]);
  });
});

describe('recorded_offline is decided at flush', () => {
  // ⚠️ THE WHOLE POINT: it is "was this committed on its first attempt", never
  // "did the phone think it had signal". §2.6 hands the flag to the server,
  // which decides whether occurred_at is overridden with now() — and therefore
  // which day the sale counts on in Números.
  it('is false on a first attempt', () => {
    expect(recordedOffline(row({ state: 'flushing', attempts: 1 }))).toBe(false);
  });

  it('is true on every attempt after the first', () => {
    expect(recordedOffline(row({ state: 'flushing', attempts: 2 }))).toBe(true);
    expect(recordedOffline(row({ state: 'flushing', attempts: 9 }))).toBe(true);
  });

  it('reaches the wire as p_recorded_offline, both ways round', () => {
    expect(sendArgs(row({ attempts: 1 })).p_recorded_offline).toBe(false);
    expect(sendArgs(row({ attempts: 2 })).p_recorded_offline).toBe(true);
  });
});

describe('occurred_at', () => {
  // ⚠️⚠️ 0025's offline branch coalesces a NULL occurred_at into now(), so a
  // queued sale with no time of its own is silently re-dated to the moment of
  // the flush. The queue already knows the answer.
  it('falls back to the moment the write was queued', () => {
    expect(occurredAt(row({ payload: {}, queuedAt: '2026-09-20T09:00:00.000Z' }))).toBe(
      '2026-09-20T09:00:00.000Z',
    );
  });

  it('never invents one when the payload carries it', () => {
    const w = row({ payload: { occurred_at: '2026-09-19T21:30:00.000Z' } });
    expect(occurredAt(w)).toBe('2026-09-19T21:30:00.000Z');
    expect(sendArgs(w).p_occurred_at).toBe('2026-09-19T21:30:00.000Z');
  });

  it('treats a blank one as absent rather than sending it', () => {
    expect(occurredAt(row({ payload: { occurred_at: '   ' } }))).toBe('2026-09-20T09:00:00.000Z');
  });
});

describe('the arguments a queued write is sent with', () => {
  it('prefixes the payload keys, because 0026 stores them bare', () => {
    const args = sendArgs(
      row({ kind: 'purchase', payload: { location_id: 'L', provider_id: 'P', lines: [1] } }),
    );
    expect(args.p_location_id).toBe('L');
    expect(args.p_provider_id).toBe('P');
    expect(args.p_lines).toEqual([1]);
    expect(args.p_id).toBe(row().id);
  });

  it('carries a transfer’s two locations under their own names', () => {
    const args = sendArgs(
      row({ kind: 'transfer', payload: { from_location_id: 'A', to_location_id: 'B', lines: [] } }),
    );
    expect(args.p_from_location_id).toBe('A');
    expect(args.p_to_location_id).toBe('B');
  });

  // ⚠️⚠️ 0025 fences p_replay_of_failed_write_id at manager and exempts the
  // write it marks from BOTH the clamp and the 15-minute void window. A device
  // that could forward one out of a payload would hand a cashier both.
  it('never forwards the replay marker, whatever the payload says', () => {
    const args = sendArgs(row({ payload: { lines: [], replay_of_failed_write_id: 'sneaky' } }));
    expect(args.p_replay_of_failed_write_id).toBeUndefined();
    expect(Object.keys(args)).not.toContain('p_replay_of_failed_write_id');
  });

  it('never lets a stored recorded_offline win over the flush’s own answer', () => {
    const args = sendArgs(row({ attempts: 1, payload: { lines: [], recorded_offline: true } }));
    expect(args.p_recorded_offline).toBe(false);
  });
});

describe('the order a flush takes the queue in', () => {
  it('is oldest first', () => {
    const q = [
      row({ id: 'c', queuedAt: '2026-09-20T12:00:00.000Z' }),
      row({ id: 'a', queuedAt: '2026-09-20T09:00:00.000Z' }),
      row({ id: 'b', queuedAt: '2026-09-20T10:00:00.000Z' }),
    ];
    expect(drainOrder(q).map((w) => w.id)).toEqual(['a', 'b', 'c']);
  });

  it('breaks a tie by id rather than by whatever SQLite returned', () => {
    const q = [row({ id: 'b' }), row({ id: 'a' })];
    expect(drainOrder(q).map((w) => w.id)).toEqual(['a', 'b']);
  });

  it('leaves a claimed row and a dead letter alone', () => {
    const q = [
      row({ id: 'p', state: 'pending' }),
      row({ id: 'f', state: 'flushing' }),
      row({ id: 'd', state: 'dead' }),
    ];
    expect(drainOrder(q).map((w) => w.id)).toEqual(['p']);
  });

  it('does not mutate the queue it was handed', () => {
    const q = [row({ id: 'b' }), row({ id: 'a' })];
    drainOrder(q);
    expect(q.map((w) => w.id)).toEqual(['b', 'a']);
  });
});

describe('a row left flushing by a process that died', () => {
  it('is what stale() finds, and nothing else is', () => {
    const q = [row({ id: 'p' }), row({ id: 'f', state: 'flushing' }), row({ id: 'd', state: 'dead' })];
    expect(stale(q).map((w) => w.id)).toEqual(['f']);
  });

  it('is re-queued before the drain, keeping the attempt it already made', async () => {
    const q = [row({ id: '11111111-2222-4333-8444-555555555555', state: 'flushing', attempts: 1 })];
    const { p, settled } = ports(q, async () => OK);
    const report = await createFlusher(p).flush();
    expect(report.recovered).toBe(1);
    expect(settled[0]).toEqual(['11111111-2222-4333-8444-555555555555', 'pending', 1]);
    // ⚠️ AND IT IS THEN SENT — the crash cost an attempt, not the sale.
    expect(report.landed).toBe(1);
  });

  it('is sent as offline, because it was not committed on its first attempt', async () => {
    const q = [row({ state: 'flushing', attempts: 1 })];
    const { p, sent } = ports(q, async () => OK);
    await createFlusher(p).flush();
    expect(sent[0][1].p_recorded_offline).toBe(true);
  });
});

describe('the drain', () => {
  it('claims, sends and forgets a row that lands', async () => {
    const q = [row()];
    const { p, settled, forgotten, sent } = ports(q, async () => OK);
    const report = await createFlusher(p).flush();
    expect(settled).toEqual([[row().id, 'flushing', 1]]);
    expect(sent[0][0]).toBe('sale');
    expect(forgotten).toEqual([row().id]);
    expect(report).toEqual({
      stop: 'drained',
      recovered: 0,
      landed: 1,
      alreadyRecorded: 0,
      retried: 0,
    });
    expect(q).toEqual([]);
  });

  // ⚠️ §2.6: a re-send under the same uuid is a SUCCESS carrying
  // already_recorded, not a duplicate sale. The row leaves the queue either way
  // — there is no `sent` state, so nothing here records it twice.
  it('treats already_recorded as landed, and the row still leaves', async () => {
    const q = [row({ attempts: 1, state: 'pending' })];
    const { p, forgotten } = ports(q, async () => AGAIN);
    const report = await createFlusher(p).flush();
    expect(report.landed).toBe(1);
    expect(report.alreadyRecorded).toBe(1);
    expect(forgotten).toEqual([row().id]);
  });

  it('puts a failed row back to pending, keeping its attempt count', async () => {
    const q = [row()];
    const { p, settled, forgotten } = ports(q, async () => {
      throw new Error('network');
    });
    const report = await createFlusher(p).flush();
    expect(settled).toEqual([
      [row().id, 'flushing', 1],
      [row().id, 'pending', 1],
    ]);
    expect(forgotten).toEqual([]);
    expect(report.stop).toBe('failed');
    expect(report.retried).toBe(1);
  });

  // ⚠️ THE SECOND ATTEMPT IS THE ONE THAT CARRIES recorded_offline.
  it('sends a row that failed once as offline the next time round', async () => {
    const q = [row()];
    let attempt = 0;
    const { p, sent } = ports(q, async () => {
      attempt += 1;
      if (attempt === 1) throw new Error('no signal');
      return OK;
    });
    const flusher = createFlusher(p);
    await flusher.flush();
    await flusher.flush();
    expect(sent[0][1].p_recorded_offline).toBe(false);
    expect(sent[1][1].p_recorded_offline).toBe(true);
  });

  // ⚠️⚠️ STOP AT THE FIRST FAILURE — see createFlusher's header for the cost.
  it('stops at the first failure rather than hammering the rest', async () => {
    const q = [
      row({ id: 'a', queuedAt: '2026-09-20T09:00:00.000Z' }),
      row({ id: 'b', queuedAt: '2026-09-20T10:00:00.000Z' }),
    ];
    const { p, sent } = ports(q, async () => {
      throw new Error('no signal');
    });
    const report = await createFlusher(p).flush();
    expect(sent.map(([, args]) => args.p_id)).toEqual(['a']);
    expect(report.stop).toBe('failed');
  });

  it('drains everything when the server is answering', async () => {
    const q = [
      row({ id: 'a', queuedAt: '2026-09-20T09:00:00.000Z' }),
      row({ id: 'b', queuedAt: '2026-09-20T10:00:00.000Z' }),
    ];
    const { p, sent } = ports(q, async () => OK);
    const report = await createFlusher(p).flush();
    expect(sent.map(([, args]) => args.p_id)).toEqual(['a', 'b']);
    expect(report.landed).toBe(2);
    expect(q).toEqual([]);
  });

  it('never touches a dead letter', async () => {
    const q = [row({ state: 'dead', attempts: 3 })];
    const { p, sent, settled, forgotten } = ports(q, async () => OK);
    const report = await createFlusher(p).flush();
    expect(sent).toEqual([]);
    expect(settled).toEqual([]);
    expect(forgotten).toEqual([]);
    expect(report.stop).toBe('drained');
  });

  it('is a no-op on an empty queue', async () => {
    const { p } = ports([], async () => OK);
    expect(await createFlusher(p).flush()).toEqual({
      stop: 'drained',
      recovered: 0,
      landed: 0,
      alreadyRecorded: 0,
      retried: 0,
    });
  });
});

describe('single-flight', () => {
  // ⚠️⚠️ TWO DRAINS WOULD BOTH READ THE SAME PENDING ROW, and only one of the
  // two claims can be the one `advance` allows. The second call does nothing.
  it('refuses a second flush while one is running, and sends nothing twice', async () => {
    const q = [row()];
    let release: (() => void) | undefined;
    const held = new Promise<void>((r) => {
      release = r;
    });
    const { p, sent } = ports(q, async () => {
      await held;
      return OK;
    });
    const flusher = createFlusher(p);
    const first = flusher.flush();
    const second = await flusher.flush();
    expect(second.stop).toBe('busy');
    expect(sent.length).toBe(1);
    release?.();
    expect((await first).landed).toBe(1);
  });

  it('opens again once the first flush has finished', async () => {
    const q = [row()];
    const { p } = ports(q, async () => OK);
    const flusher = createFlusher(p);
    await flusher.flush();
    expect((await flusher.flush()).stop).toBe('drained');
  });

  it('opens again after a flush that threw its way to a failure', async () => {
    const q = [row()];
    const { p } = ports(q, async () => {
      throw new Error('no signal');
    });
    const flusher = createFlusher(p);
    expect((await flusher.flush()).stop).toBe('failed');
    expect((await flusher.flush()).stop).toBe('failed');
  });
});

describe('reading the server’s reply', () => {
  it('is landed only when already_recorded is a boolean', () => {
    expect(landedFrom({ already_recorded: false })).toEqual({ landed: true, alreadyRecorded: false });
    expect(landedFrom({ already_recorded: true })).toEqual({ landed: true, alreadyRecorded: true });
  });

  // ⚠️ AN UNREADABLE REPLY IS A RETRY, AND THE UUID MAKES THAT FREE.
  it('is a retry for anything it cannot read', () => {
    for (const reply of [null, undefined, 42, 'ok', [], {}, { already_recorded: 'yes' }]) {
      expect(landedFrom(reply)).toEqual({ landed: false });
    }
  });
});
