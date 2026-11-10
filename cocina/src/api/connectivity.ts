// ============================================================================
// WHEN A FLUSH RUNS — WERA'S MACHINE, COPIED. Plan task `10.5b-iv-b` (the handover
// with no signal). ⚠️ ITS TWIN IS `app/src/api/connectivity.ts` (Wera, `5c-ii-b-2`):
// `test/senal.test.ts` holds this file's code below the imports to that file's,
// comments and spacing folded, so a fix to one is a fix to both — and
// `cocina-itacate.yml` fires on Wera's file for it.
//
// ⚠️⚠️ WHY A COPY AND NOT A SECOND DESIGN: every number below is a measurement
// Wera made on two devices (2026-09-22) — `expo-network`'s listener missing a
// reconnect on iOS (so a listener PLUS a poll PLUS the app-state wake), the
// spurious `isConnected: false` of a wifi→cellular handover (so a drop is
// believed after two seconds), and `auth-js` serving a cached failed refresh
// for up to 90 seconds after the link returns (so the retry ladder straddles
// it). A fonda's counter has the same phone, the same library and the same
// auth layer; ADR-035 §2.11 makes `expo-network`, read through ONE module, the
// connectivity row for every app.
//
// What it drains here is the queue of her handovers and thumbs (`@/api/cola`),
// whose `FlushStop` is Wera's word for word. ⚠️ NOTHING HERE RENDERS AND NOTHING
// TALKS: the binder is `@/lib/connectivityMonitor`, the only module in this app
// that imports `expo-network` (`test/senal.test.ts` holds it to one).
// ============================================================================

import type { FlushStop } from '@/api/cola';

/**
 * How long a `connected: false` must persist before the signal believes it.
 *
 * ⚠️⚠️ THIS IS FINDING 1 OF THE READING AND IT IS NOT A ROUND NUMBER PICKED FOR
 * COMFORT. BOTH libraries emit a spurious `isConnected: false` during the
 * wifi→cellular handover — a `NONE` blip at `10341 ms` followed by `CELLULAR`
 * `72–324 ms` later. Un-debounced, a shopkeeper walking from the counter to the
 * door flashes C10.1's *"Sin conexión a internet"*. Two seconds is roughly six
 * times the worst observed blip, and it costs only that the quiet, dismissible,
 * non-blocking notice appears two seconds late.
 *
 * ⚠️ IT DEBOUNCES GOING DOWN ONLY. Coming back up is taken immediately: a flush
 * fired while the link is in fact still dead fails transiently, the row goes
 * back to `pending`, and the ladder below tries again. Being early is free;
 * being late is a queue nobody drains.
 */
export const OFFLINE_SETTLE_MS = 2_000;

/**
 * How often the signal re-READS the network while it believes it is offline.
 *
 * Five seconds is the interval `5c-ii-b-1`'s instrument polled at, and the
 * interval at which it observed recovery: the link returned at `68 s` and
 * `expo-network`'s read was `WIFI / isConnected: true` at `75 s`. It is the
 * measured number rather than a chosen one.
 */
export const OFFLINE_POLL_MS = 5_000;

/**
 * The ceiling `5c.5` measured on how long a dropped connection can keep the
 * auth layer answering from cache — 60 s of `REFRESH_FAILURE_COOLDOWN_MS` plus
 * up to 30 s of in-call backoff, and `EXPIRY_MARGIN_MS` is exactly this with
 * zero slack.
 *
 * ⚠️ IT IS NOT A DELAY. Nothing waits this long; it is the number the ladder
 * below is required to STRADDLE, which `attemptSchedule` states and the suite
 * asserts.
 */
export const AUTH_RETRY_CEILING_MS = 90_000;

/**
 * The gap before each retry after a drain that failed transiently, then
 * `RETRY_STEADY_MS` forever.
 *
 * ⚠️⚠️ READ IT AS THE SCHEDULE IT PRODUCES, WHICH IS WHAT `attemptSchedule`
 * IS FOR: attempts land at 0 s, 5 s, 20 s, 50 s and 110 s after a reconnect.
 * Four of them inside the 90 s the auth layer may spend refusing from cache,
 * and the fifth — the first that can possibly succeed if the cooldown was the
 * reason — twenty seconds past it. A ladder that stopped at 50 s would leave a
 * shop's queue sitting on a working connection because of a cache.
 */
export const RETRY_MS = [5_000, 15_000, 30_000, 60_000] as const;

/** The gap once the ladder above is exhausted. */
export const RETRY_STEADY_MS = 120_000;

/**
 * What the signal believes. ⚠️ `null` is UNKNOWN and is not `false`: at launch
 * nothing has read the network yet, and `5c-iv` must draw an offline notice for
 * an offline shop, never for a shop the app has not looked at. It is also what
 * makes the first good reading of a launch a RECONNECT, which is how an app
 * that was killed holding a full queue drains it.
 */
export type Online = boolean | null;

export interface Conn {
  /** The debounced, de-duplicated signal. Everything downstream reads this. */
  readonly online: Online;
  /** Whether the app is in front of a person. No timer runs when it is not. */
  readonly foreground: boolean;
  /** When a `connected: false` was first seen, while the debounce is armed. */
  readonly offlineSince: number | null;
  /** Consecutive transient failures since the last reconnect or clean drain. */
  readonly attempt: number;
  /** When the next drain is due, or `null` for none owed. */
  readonly dueAt: number | null;
}

/** A monitor that has not read anything yet. */
export const UNKNOWN: Conn = {
  online: null,
  foreground: true,
  offlineSince: null,
  attempt: 0,
  dueAt: null,
};

/**
 * Everything that can move the machine.
 *
 * ⚠️ `reading` IS KEYED ON `isConnected` AND REACHABILITY IS ADVISORY — finding
 * 3 of the reading. On iOS `isInternetReachable` is `null` for the first
 * ~120 ms of a launch where `isConnected` is already `true`, so a trigger
 * written `=== true` over reachability sits out the first fifth of a second of
 * every launch. The binder passes `isConnected` and nothing else.
 */
export type Wake =
  | { readonly kind: 'reading'; readonly connected: boolean }
  /** The debounce timer came due. */
  | { readonly kind: 'settle' }
  /** The retry timer came due. */
  | { readonly kind: 'due' }
  | { readonly kind: 'foreground' }
  | { readonly kind: 'background' }
  /**
   * ⚠️⚠️ SOMETHING WAS JUST PUT IN THE QUEUE. Without this the ONLINE path is
   * worse than the offline one: a reconnect drains, a wake drains, and a sale
   * rung up on a working connection by a cashier who never leaves the app has
   * NOTHING to trigger it — it would sit until the link flapped or the phone
   * was backgrounded. ⚠️ Its caller arrives with the slide-to-commit at `5f`;
   * `queueWrite` returns a row rather than a promise (C10.3), so the trigger
   * has to be told rather than awaited.
   */
  | { readonly kind: 'queued' }
  /** A drain finished. `@/api/flush`'s own word for how it stopped. */
  | { readonly kind: 'flushed'; readonly stop: FlushStop };

export interface Step {
  readonly conn: Conn;
  /** Drain now. The binder calls the app's one flusher and reports back. */
  readonly flush: boolean;
  /** `online` is not what it was. ⚠️ This, and only this, is `5c-iv`'s input. */
  readonly changed: boolean;
}

/** The gap before the retry that follows `attempt` consecutive failures. */
export function backoffMs(attempt: number): number {
  return attempt < RETRY_MS.length ? RETRY_MS[attempt] : RETRY_STEADY_MS;
}

/**
 * When the first `count` attempts after a reconnect land, in ms from it.
 *
 * ⚠️ IT EXISTS SO THE 90-SECOND CLAIM IS READ OFF THE TABLE RATHER THAN
 * RESTATED BESIDE IT. The suite asserts the straddle against this function, so
 * editing `RETRY_MS` to something that gives up before the auth cooldown can
 * lapse turns the suite red rather than turning a comment stale.
 */
export function attemptSchedule(count: number): readonly number[] {
  const at: number[] = [];
  let elapsed = 0;
  for (let i = 0; i < count; i += 1) {
    at.push(elapsed);
    elapsed += backoffMs(i);
  }
  return at;
}

/** When the debounce is due, or `null` if it is not armed. */
export function settleAt(conn: Conn): number | null {
  return conn.offlineSince === null ? null : conn.offlineSince + OFFLINE_SETTLE_MS;
}

/** Whether the offline poll should be running. See the header for the asymmetry. */
export function polling(conn: Conn): boolean {
  return conn.online === false && conn.foreground;
}

/** When the next drain is due, or `null`. */
export function retryAt(conn: Conn): number | null {
  return conn.dueAt;
}

const STAY: (conn: Conn) => Step = (conn) => ({ conn, flush: false, changed: false });

/**
 * One event, one new state, and at most one drain.
 *
 * ⚠️ IT IS TOTAL AND IT NEVER THROWS. A monitor that threw on an event it did
 * not expect would stop the only thing in this app that drains the queue, on a
 * device with no console attached to it.
 */
export function step(conn: Conn, wake: Wake, now: number): Step {
  switch (wake.kind) {
    case 'reading':
      return wake.connected ? sawLink(conn) : lostLink(conn, now);

    case 'settle':
      return lostLink(conn, now);

    case 'due': {
      // ⚠️ THE TIMER DOES NOT DECIDE — the state does. A retry that comes due
      // after the link dropped, or after the app went to the background, is
      // cancelled here rather than fired into a connection that is not there.
      if (conn.dueAt === null) return STAY(conn);
      const owed = { ...conn, dueAt: null };
      if (conn.online !== true || !conn.foreground) return STAY(owed);
      return { conn: owed, flush: true, changed: false };
    }

    case 'foreground': {
      // ⚠️⚠️ THE APP-STATE WAKE, AND IT FIRES ON ITS OWN RATHER THAN WAITING
      // FOR THE READING THAT FOLLOWS IT. A phone that was online the whole time
      // it sat in a pocket produces a reading identical to the last one, which
      // de-duplicates to nothing — so a wake that only took a reading would
      // drain nothing on the one event most likely to have a queue behind it.
      const awake = { ...conn, foreground: true, dueAt: null };
      if (conn.online !== true) return STAY(awake);
      return { conn: awake, flush: true, changed: false };
    }

    case 'queued': {
      // ⚠️ AN ENQUEUE HAPPENS IN THE FOREGROUND BY DEFINITION — a person slid
      // the control. What it cannot be sure of is the link, and offline is the
      // case the reconnect already owns.
      if (conn.online !== true) return STAY(conn);
      return { conn: { ...conn, dueAt: null }, flush: true, changed: false };
    }

    case 'background':
      // ⚠️ EVERY TIMER IS DROPPED. iOS suspends them anyway, and a due time
      // surviving a night in a pocket fires a drain the `foreground` above has
      // already done.
      return STAY({ ...conn, foreground: false, dueAt: null });

    case 'flushed':
      return settled(conn, wake.stop, now);
  }
}

/**
 * A reading, or a poll, saying the link is there.
 *
 * ⚠️ AN IDENTICAL READING IS NOT AN EVENT — finding 2. `expo-network` repeats
 * itself: the same `WIFI` payload twice, `2.6 s` apart, twice in one run. Cheap
 * to ignore, and it is the difference between one flush and two.
 */
function sawLink(conn: Conn): Step {
  const disarmed = { ...conn, offlineSince: null };
  if (conn.online === true) return STAY(disarmed);
  return {
    conn: { ...disarmed, online: true, attempt: 0, dueAt: null },
    flush: true,
    changed: true,
  };
}

/** A reading saying the link is gone, or the debounce coming due on one. */
function lostLink(conn: Conn, now: number): Step {
  if (conn.online === false) return STAY(conn);

  const since = conn.offlineSince ?? now;
  if (now - since < OFFLINE_SETTLE_MS) {
    // Armed, not yet believed. ⚠️ `offlineSince` is kept at its FIRST sighting,
    // so a stream of `NONE` events cannot push the deadline out forever.
    return STAY({ ...conn, offlineSince: since });
  }

  return {
    conn: { ...conn, online: false, offlineSince: null, attempt: 0, dueAt: null },
    flush: false,
    changed: true,
  };
}

/** What a finished drain does to the ladder. */
function settled(conn: Conn, stop: FlushStop, now: number): Step {
  // ⚠️ `busy` IS NOT AN OUTCOME. Another drain is in flight over the same queue
  // — single-flight, `@/api/flush` — and it will report its own. Scheduling a
  // retry here would double the ladder for one failure.
  if (stop === 'busy') return STAY(conn);

  if (stop === 'drained') return STAY({ ...conn, attempt: 0, dueAt: null });

  return STAY({
    ...conn,
    attempt: conn.attempt + 1,
    dueAt: now + backoffMs(conn.attempt),
  });
}
