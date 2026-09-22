// ============================================================================
// WHEN A FLUSH RUNS — the whole instrument for plan task 5c-ii-b-2.
//
// ⚠️⚠️ THIS SUITE IS THE ONLY THING THAT CAN SEE THIS TASK'S LOGIC, AND THAT IS
// STRUCTURAL RATHER THAN A GAP. There is no migration here, no RPC and no
// server, so there is nothing for a contract check over real HTTP to ask; and
// §2.11 keeps rendering out of scope, so nothing can watch the mount. What is
// left is a machine that is a pure function of `(state, event, now)` — which is
// why `@/api/connectivity` was written that way and why `@/lib/connectivityMonitor`
// holds nothing but timers.
//
// EVERY NUMBER BELOW IS A MEASUREMENT, NOT A PREFERENCE. The blip is
// `5c-ii-b-1`'s finding 1 (`72–324 ms`), the duplicate is its finding 2, the
// reachability rule is its finding 3, and the 90 seconds is `5c.5`'s
// `REFRESH_FAILURE_COOLDOWN_MS` plus its in-call backoff. Change one of those
// constants to a rounder figure and this suite goes red rather than the
// comment beside it going stale.
// ============================================================================

import { describe, expect, it } from 'vitest';

import {
  AUTH_RETRY_CEILING_MS,
  OFFLINE_POLL_MS,
  OFFLINE_SETTLE_MS,
  RETRY_MS,
  RETRY_STEADY_MS,
  UNKNOWN,
  attemptSchedule,
  backoffMs,
  polling,
  retryAt,
  settleAt,
  step,
  type Conn,
  type Wake,
} from '@/api/connectivity';

/** Drive a list of events through the machine, collecting every step. */
function run(from: Conn, events: ReadonlyArray<readonly [Wake, number]>) {
  let conn = from;
  const flushes: number[] = [];
  const changes: Array<[number, boolean | null]> = [];
  for (const [wake, at] of events) {
    const next = step(conn, wake, at);
    conn = next.conn;
    if (next.flush) flushes.push(at);
    if (next.changed) changes.push([at, conn.online]);
  }
  return { conn, flushes, changes };
}

const online = (at: number): readonly [Wake, number] => [{ kind: 'reading', connected: true }, at];
const offline = (at: number): readonly [Wake, number] => [
  { kind: 'reading', connected: false },
  at,
];

/** A machine that has read a good link, so the transitions below are not from UNKNOWN. */
function connected(at = 0): Conn {
  return step(UNKNOWN, { kind: 'reading', connected: true }, at).conn;
}

describe('the constants are the reading, and not a preference', () => {
  it('debounces going offline by more than the worst blip 5c-ii-b-1 measured', () => {
    // The handover blip was `NONE` followed by `CELLULAR` 72–324 ms later, on
    // BOTH libraries. A settle shorter than that is a shop walking to the door
    // and flashing C10.1's notice.
    expect(OFFLINE_SETTLE_MS).toBeGreaterThan(324);
  });

  it('polls at the interval the reading actually observed recovery at', () => {
    expect(OFFLINE_POLL_MS).toBe(5_000);
  });

  it('carries 5c.5s ceiling, which is the auth cooldown and not a network figure', () => {
    // 60s of REFRESH_FAILURE_COOLDOWN_MS plus up to 30s of in-call backoff.
    expect(AUTH_RETRY_CEILING_MS).toBe(90_000);
  });
});

describe('the ladder straddles the 90 seconds the auth layer can spend refusing', () => {
  it('lands attempts at 0, 5, 20, 50 and 110 seconds after a reconnect', () => {
    expect(attemptSchedule(5)).toEqual([0, 5_000, 20_000, 50_000, 110_000]);
  });

  it('tries at least three more times inside the window the cooldown owns', () => {
    // ⚠️ A flush fired the instant the link returns can be refused by an auth
    // layer serving a cached failure. Attempts inside the window are the ones
    // that catch a cooldown that lapsed early.
    const inside = attemptSchedule(8).filter((at) => at > 0 && at <= AUTH_RETRY_CEILING_MS);
    expect(inside.length).toBeGreaterThanOrEqual(3);
  });

  it('makes an attempt AFTER the ceiling, and not minutes after it', () => {
    // ⚠️⚠️ THIS IS THE ASSERTION THE WHOLE CADENCE EXISTS FOR. If every retry
    // fell inside 90s, a queue whose only obstacle was the auth cache would sit
    // there on a working connection until something else woke the app.
    const past = attemptSchedule(8).find((at) => at > AUTH_RETRY_CEILING_MS);
    expect(past).toBeDefined();
    expect(past!).toBeLessThanOrEqual(150_000);
  });

  it('settles to a steady cadence once the table is exhausted', () => {
    expect(backoffMs(RETRY_MS.length - 1)).toBe(RETRY_MS[RETRY_MS.length - 1]);
    expect(backoffMs(RETRY_MS.length)).toBe(RETRY_STEADY_MS);
    expect(backoffMs(99)).toBe(RETRY_STEADY_MS);
  });

  it('drives the same schedule through the machine as the table states', () => {
    // ⚠️ THE TABLE IS NOT DECORATIVE. Without this, `attemptSchedule` could
    // state one ladder while `step` walked another, and every assertion above
    // would be about a function nothing calls.
    let conn = connected();
    const at: number[] = [];
    let now = 0;
    at.push(now); // the reconnect flush itself
    for (let i = 0; i < 4; i += 1) {
      conn = step(conn, { kind: 'flushed', stop: 'failed' }, now).conn;
      expect(conn.dueAt).not.toBeNull();
      now = conn.dueAt!;
      const fired = step(conn, { kind: 'due' }, now);
      expect(fired.flush).toBe(true);
      conn = fired.conn;
      at.push(now);
    }
    expect(at).toEqual(attemptSchedule(5));
  });
});

describe('the blip does not take the shop offline — finding 1', () => {
  it('stays online across a NONE that is followed by a link 324ms later', () => {
    const { conn, changes, flushes } = run(connected(), [offline(10_341), online(10_665)]);
    expect(conn.online).toBe(true);
    expect(changes).toEqual([]);
    expect(flushes).toEqual([]);
  });

  it('goes offline when the settle timer comes due on a real outage', () => {
    const { conn, changes } = run(connected(), [
      offline(10_000),
      [{ kind: 'settle' }, 10_000 + OFFLINE_SETTLE_MS],
    ]);
    expect(conn.online).toBe(false);
    expect(changes).toEqual([[12_000, false]]);
  });

  it('does not go offline on a settle that fires early', () => {
    const { conn } = run(connected(), [offline(10_000), [{ kind: 'settle' }, 10_500]]);
    expect(conn.online).toBe(true);
    expect(conn.offlineSince).toBe(10_000);
  });

  it('keeps the deadline at the FIRST sighting, so a stream of NONEs cannot defer it', () => {
    // ⚠️ `expo-network` emitted two duplicate NONE events as the link returned
    // in the second iOS run. A debounce that restarted on each one would never
    // believe an outage at all.
    const { conn } = run(connected(), [offline(0), offline(1_000), offline(1_999)]);
    expect(conn.online).toBe(true);
    expect(conn.offlineSince).toBe(0);
    expect(step(conn, { kind: 'reading', connected: false }, 2_000).conn.online).toBe(false);
  });
});

describe('an identical reading is not an event — finding 2', () => {
  it('ignores the same WIFI payload arriving twice 2.6s apart', () => {
    const { flushes, changes } = run(connected(), [online(2_600), online(5_200)]);
    expect(flushes).toEqual([]);
    expect(changes).toEqual([]);
  });

  it('ignores a repeated NONE once the signal is already offline', () => {
    const offlineConn = run(connected(), [offline(0), [{ kind: 'settle' }, 2_000]]).conn;
    const again = step(offlineConn, { kind: 'reading', connected: false }, 3_000);
    expect(again.changed).toBe(false);
    expect(again.conn).toEqual(offlineConn);
  });
});

describe('the reconnect is what drains the queue', () => {
  it('flushes on the transition back, and resets the ladder', () => {
    let conn = run(connected(), [offline(0), [{ kind: 'settle' }, 2_000]]).conn;
    conn = { ...conn, attempt: 3 };
    const back = step(conn, { kind: 'reading', connected: true }, 68_000);
    expect(back.flush).toBe(true);
    expect(back.changed).toBe(true);
    expect(back.conn.online).toBe(true);
    expect(back.conn.attempt).toBe(0);
    expect(back.conn.dueAt).toBeNull();
  });

  it('treats the first good reading of a launch as a reconnect', () => {
    // ⚠️ An app killed holding a queue drains it on the way back in. UNKNOWN is
    // not `false`, but it is not `true` either.
    const first = step(UNKNOWN, { kind: 'reading', connected: true }, 0);
    expect(first.flush).toBe(true);
    expect(first.changed).toBe(true);
  });

  it('does not draw an offline notice for a shop nobody has looked at', () => {
    expect(UNKNOWN.online).toBeNull();
    const armed = step(UNKNOWN, { kind: 'reading', connected: false }, 0);
    expect(armed.changed).toBe(false);
    expect(armed.conn.online).toBeNull();
    const settledOff = step(armed.conn, { kind: 'settle' }, OFFLINE_SETTLE_MS);
    expect(settledOff.conn.online).toBe(false);
    expect(settledOff.changed).toBe(true);
  });
});

describe('an enqueue is a trigger too, or the online path is the worse one', () => {
  it('drains immediately when a write is queued on a working link', () => {
    // ⚠️⚠️ A reconnect drains and a wake drains. A sale rung up on a working
    // connection by a cashier who never leaves the app has neither, and would
    // sit in the queue until the link flapped.
    const queued = step(connected(), { kind: 'queued' }, 5_000);
    expect(queued.flush).toBe(true);
    expect(queued.changed).toBe(false);
  });

  it('does nothing when a write is queued with no link — the reconnect owns that', () => {
    const off = run(connected(), [offline(0), [{ kind: 'settle' }, 2_000]]).conn;
    const queued = step(off, { kind: 'queued' }, 3_000);
    expect(queued.flush).toBe(false);
    expect(queued.conn).toEqual(off);
  });

  it('does not drain before anything has read the network', () => {
    expect(step(UNKNOWN, { kind: 'queued' }, 0).flush).toBe(false);
  });

  it('restarts the ladder rather than racing the retry that is already owed', () => {
    const owing = step(connected(), { kind: 'flushed', stop: 'failed' }, 0).conn;
    expect(retryAt(owing)).toBe(5_000);
    const queued = step(owing, { kind: 'queued' }, 1_000);
    expect(queued.flush).toBe(true);
    expect(retryAt(queued.conn)).toBeNull();
  });
});

describe('the app-state wake', () => {
  it('flushes on foreground when the link is up, without waiting for a reading', () => {
    // ⚠️⚠️ A phone that was online the whole time it sat in a pocket produces a
    // reading identical to the last one, which de-duplicates to nothing. A wake
    // that only took a reading would drain nothing on the one event most likely
    // to have a queue behind it.
    const backgrounded = step(connected(), { kind: 'background' }, 100).conn;
    const woken = step(backgrounded, { kind: 'foreground' }, 60_000);
    expect(woken.flush).toBe(true);
    expect(woken.changed).toBe(false);
    expect(woken.conn.foreground).toBe(true);
  });

  it('does not flush on foreground while the signal says offline', () => {
    const off = run(connected(), [offline(0), [{ kind: 'settle' }, 2_000]]).conn;
    const woken = step(step(off, { kind: 'background' }, 3_000).conn, { kind: 'foreground' }, 9_000);
    expect(woken.flush).toBe(false);
  });

  it('drops every timer when the app goes to the background', () => {
    const owing = step(connected(), { kind: 'flushed', stop: 'failed' }, 0).conn;
    expect(retryAt(owing)).toBe(5_000);
    const gone = step(owing, { kind: 'background' }, 100).conn;
    expect(retryAt(gone)).toBeNull();
    expect(gone.foreground).toBe(false);
  });
});

describe('the timers are armed from the state and never decide anything', () => {
  it('polls only while offline and in front of a person', () => {
    expect(polling(UNKNOWN)).toBe(false);
    expect(polling(connected())).toBe(false);
    const off = run(connected(), [offline(0), [{ kind: 'settle' }, 2_000]]).conn;
    expect(polling(off)).toBe(true);
    expect(polling({ ...off, foreground: false })).toBe(false);
  });

  it('arms the settle only while a NONE is pending', () => {
    expect(settleAt(connected())).toBeNull();
    const armed = step(connected(), { kind: 'reading', connected: false }, 10_000).conn;
    expect(settleAt(armed)).toBe(10_000 + OFFLINE_SETTLE_MS);
  });

  it('refuses a retry that comes due after the link dropped', () => {
    const owing = step(connected(), { kind: 'flushed', stop: 'failed' }, 0).conn;
    const dropped = run(owing, [offline(1_000), [{ kind: 'settle' }, 3_000]]).conn;
    const due = step({ ...dropped, dueAt: 5_000 }, { kind: 'due' }, 5_000);
    expect(due.flush).toBe(false);
    expect(due.conn.dueAt).toBeNull();
  });

  it('refuses a retry that comes due in the background', () => {
    const owing = step(connected(), { kind: 'flushed', stop: 'failed' }, 0).conn;
    const hidden = { ...owing, foreground: false, dueAt: 5_000 };
    expect(step(hidden, { kind: 'due' }, 5_000).flush).toBe(false);
  });

  it('is a no-op when nothing is owed', () => {
    const idle = connected();
    const due = step(idle, { kind: 'due' }, 9_000);
    expect(due.flush).toBe(false);
    expect(due.conn).toEqual(idle);
  });
});

describe('what a finished drain does to the ladder', () => {
  it('clears it on a clean drain', () => {
    const owing = step(connected(), { kind: 'flushed', stop: 'failed' }, 0).conn;
    const done = step(owing, { kind: 'flushed', stop: 'drained' }, 6_000).conn;
    expect(done.attempt).toBe(0);
    expect(done.dueAt).toBeNull();
  });

  it('leaves it alone on busy, because the other drain reports its own outcome', () => {
    // ⚠️ `@/api/flush` is single-flight. Scheduling a retry here would double
    // the ladder for one failure.
    const owing = step(connected(), { kind: 'flushed', stop: 'failed' }, 0).conn;
    expect(step(owing, { kind: 'flushed', stop: 'busy' }, 1_000).conn).toEqual(owing);
  });

  it('advances it one rung per transient failure', () => {
    let conn = connected();
    conn = step(conn, { kind: 'flushed', stop: 'failed' }, 0).conn;
    expect([conn.attempt, conn.dueAt]).toEqual([1, 5_000]);
    conn = step(conn, { kind: 'flushed', stop: 'failed' }, 5_000).conn;
    expect([conn.attempt, conn.dueAt]).toEqual([2, 20_000]);
    conn = step(conn, { kind: 'flushed', stop: 'failed' }, 20_000).conn;
    expect([conn.attempt, conn.dueAt]).toEqual([3, 50_000]);
  });

  it('never reports a change of signal, because a drain is not a link', () => {
    // `changed` is `5c-iv`'s only input, and it is about the LINK. A banner
    // that flickered on every failed flush is the notice C10.1 refuses to be.
    for (const stop of ['drained', 'failed', 'busy'] as const) {
      expect(step(connected(), { kind: 'flushed', stop }, 0).changed).toBe(false);
    }
  });
});
