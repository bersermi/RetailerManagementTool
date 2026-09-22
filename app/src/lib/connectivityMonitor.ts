// ============================================================================
// THE ONLY MODULE IN THIS APP THAT IMPORTS A CONNECTIVITY LIBRARY. Plan task
// 5c-ii-b-2, and the counterpart to `@/lib/flushRunner`: everything with a right
// answer is in `@/api/connectivity`, and what is left here is three timers, two
// native subscriptions and the wire between them.
//
// ⚠️⚠️ ONE MODULE OWNS THE NATIVE IMPORT AND EVERY OTHER FILE READS THE SIGNAL,
// NEVER THE LIBRARY. `5c-iv` draws C10.1's *"Sin conexión a internet"* from the
// same fact this module drains on, so a second `expo-network` subscription
// anywhere is a banner and a drain that can disagree about whether the shop is
// online — and §2.11 keeps rendering out of scope, so nothing in this repository
// would ever see them disagree. `subscribe` below is how the notice reads it.
// ⚠️ Held to one file by the "exactly one caller" block in
// `app/test/auth-errors.test.ts`, the same instrument that pins `supabase.rpc`
// to `api/calls.ts` and `expo-sqlite` to two openers.
//
// ⚠️ THE LIBRARY IS `expo-network`, AND IT WAS MEASURED RATHER THAN CHOSEN.
// `5c-ii-b-1` armed it against `@react-native-community/netinfo` in one process
// on 2026-09-22: on the iOS Simulator netinfo went offline and NEVER came back
// — twelve consecutive polls, fifty-five seconds after the link returned, still
// `none / false / false` — while `expo-network`'s read recovered within five
// seconds. ⚠️ **That is a SIMULATOR finding**, whose network is the host's, so a
// real iPhone may not reproduce it; the choice is bounded by that and ADR-035
// §2.11's row says so too.
//
// ⚠️ IT IS DELIBERATELY UNTESTABLE, for the reason `@/lib/flushRunner` already
// records: it reaches `expo-network` and `react-native`, so no node suite can
// load it, and `app/vitest.config.ts` collects `test/**` only so nothing tries.
// Everything a test could have an opinion about is one import away.
//
// ⚠️⚠️ AND IT IS THE FIRST CALLER OF THE FLUSHER. `@/lib/flushRunner` has sat
// in the tree since `5c-ii-a` with nothing calling it; a queue that nothing
// drains is `5c`'s characteristic failure, and this file is the fix.
// ============================================================================

import * as Network from 'expo-network';
import { AppState, type AppStateStatus } from 'react-native';

import {
  OFFLINE_POLL_MS,
  UNKNOWN,
  polling,
  retryAt,
  settleAt,
  step,
  type Conn,
  type Online,
  type Wake,
} from '@/api/connectivity';
import { flusher } from '@/lib/flushRunner';

type Stop = () => void;

let conn: Conn = UNKNOWN;
let running = false;

/** The three timers, each armed from a pure selector and from nothing else. */
let settleTimer: ReturnType<typeof setTimeout> | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;

const watchers = new Set<(online: Online) => void>();

/**
 * What the app believes about the link. ⚠️ `null` until something has read the
 * network — `5c-iv` must not draw an offline notice for a shop nobody looked at.
 */
export function online(): Online {
  return conn.online;
}

/**
 * Every reader of the signal that is not this file. ⚠️ THIS IS THE WHOLE OF
 * *"reads the signal, never the library"* — a caller that wanted `expo-network`
 * wants this instead. Returns its own unsubscribe.
 */
export function subscribe(watcher: (online: Online) => void): Stop {
  watchers.add(watcher);
  return () => {
    watchers.delete(watcher);
  };
}

/**
 * Start the signal and the drain it triggers.
 *
 * ⚠️ IDEMPOTENT, AND THAT MATTERS ON A ROUTER. React 19 in development mounts
 * effects twice; a second listener over one library is precisely what this
 * module exists to prevent, so a second `start()` is a no-op returning the same
 * stop.
 */
export function start(): Stop {
  if (running) return stop;
  running = true;
  conn = UNKNOWN;

  const netSub = Network.addNetworkStateListener((event) => {
    // ⚠️ `isConnected` AND NOT `isInternetReachable` — finding 3 of the reading:
    // on iOS reachability is `null` for the first ~120 ms of a launch where
    // `isConnected` is already `true`, so keying on it sits out the first fifth
    // of a second of every launch. ⚠️ `undefined` is read as "still there":
    // an absent field is not a report of an outage.
    take({ kind: 'reading', connected: event.isConnected !== false });
  });

  // ⚠️⚠️ `inactive` IS NEITHER, AND IT IS NOT A ROUNDING ERROR. iOS emits it for
  // a notification-centre pull, a control-centre swipe and every incoming call
  // banner — moments when the app is still very much running. Folding it into
  // `background` would cancel the retry timer and then fire a fresh drain on the
  // way back, so a shopkeeper who glances at a notification mid-outage restarts
  // the whole ladder. ⚠️ The session store next door folds it into `background`
  // on purpose, and that is the opposite case rather than a disagreement: it is
  // stopping an auto-refresh, where an extra stop costs nothing.
  const appSub = AppState.addEventListener('change', (state: AppStateStatus) => {
    if (state === 'active') {
      take({ kind: 'foreground' });
      void read();
    } else if (state === 'background') {
      take({ kind: 'background' });
    }
  });

  // The launch reading. ⚠️ Its `true` is a transition out of UNKNOWN, so an app
  // that was killed holding a queue drains it on the way back in.
  void read();

  return () => {
    netSub.remove();
    appSub.remove();
    disarm();
    watchers.clear();
    running = false;
    conn = UNKNOWN;
  };
}

/** The exported stop, for the idempotent second `start()`. */
function stop(): void {
  /* the first caller owns the teardown */
}

/** One read of the network, turned into one event. */
async function read(): Promise<void> {
  try {
    const state = await Network.getNetworkStateAsync();
    take({ kind: 'reading', connected: state.isConnected !== false });
  } catch {
    // ⚠️ A FAILED READ IS NOT AN OUTAGE AND MUST NOT BE REPORTED AS ONE. It is
    // the native module answering badly, and inventing a `false` here would
    // stop the drain and draw an offline notice on a working connection.
  }
}

/** Apply one event: new state, the timers it implies, and at most one drain. */
function take(wake: Wake): void {
  if (!running) return;
  const before = conn.online;
  const next = step(conn, wake, Date.now());
  conn = next.conn;
  arm();
  if (next.changed && conn.online !== before) {
    for (const watcher of watchers) watcher(conn.online);
  }
  if (next.flush) void drain();
}

/**
 * One drain, and its outcome fed back in.
 *
 * ⚠️ THE REPORT IS THE ONLY THING THAT ADVANCES THE LADDER. A drain that
 * stopped on a transient failure schedules the next attempt from
 * `@/api/connectivity`'s table; one that drained clears it. Nothing here
 * decides either.
 */
async function drain(): Promise<void> {
  try {
    const report = await flusher().flush();
    take({ kind: 'flushed', stop: report.stop });
  } catch {
    // ⚠️ `flush()` IS NOT SUPPOSED TO REJECT — every failure inside it is a
    // state change on a row. If it ever does, the queue still has to be tried
    // again, so it is treated as the transient failure it almost certainly is.
    take({ kind: 'flushed', stop: 'failed' });
  }
}

/** Every timer, set from the pure selectors and from nothing else. */
function arm(): void {
  const now = Date.now();

  const settle = settleAt(conn);
  clearTimer(settleTimer);
  settleTimer =
    settle === null ? null : setTimeout(() => take({ kind: 'settle' }), Math.max(0, settle - now));

  const retry = retryAt(conn);
  clearTimer(retryTimer);
  retryTimer =
    retry === null ? null : setTimeout(() => take({ kind: 'due' }), Math.max(0, retry - now));

  // ⚠️ THE POLL IS RE-ARMED ONLY WHEN IT SHOULD BE RUNNING AND IS NOT. Clearing
  // and re-creating it on every event would reset the interval each time a
  // duplicate `NONE` arrived — and duplicates are exactly what the reading
  // found `expo-network` emitting while offline, so the poll would never fire.
  const wanted = polling(conn);
  if (wanted && pollTimer === null) {
    pollTimer = setInterval(() => void read(), OFFLINE_POLL_MS);
  } else if (!wanted && pollTimer !== null) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function disarm(): void {
  clearTimer(settleTimer);
  clearTimer(retryTimer);
  settleTimer = null;
  retryTimer = null;
  if (pollTimer !== null) clearInterval(pollTimer);
  pollTimer = null;
}

function clearTimer(timer: ReturnType<typeof setTimeout> | null): void {
  if (timer !== null) clearTimeout(timer);
}
