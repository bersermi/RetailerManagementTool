// ============================================================================
// THE ONLY MODULE IN WERA COCINA THAT IMPORTS A CONNECTIVITY LIBRARY. Plan task
// `10.5b-iv-b`. ⚠️ ITS TWIN IS WERA'S `app/src/lib/connectivityMonitor.ts`
// (`5c-ii-b-2`), copied with two differences: the drain is HANDED IN by `start`
// (`@/lib/cola` passes its own — so neither file imports the other), and its
// header is this one. Everything with a right answer is `@/api/connectivity`
// (Wera's machine, held to Wera's file by `test/senal.test.ts`); what is left here
// is three timers, two native subscriptions and the wire between them.
//
// ⚠️⚠️ ONE MODULE OWNS THE NATIVE IMPORT AND EVERY OTHER FILE READS THE SIGNAL
// (ADR-035 §2.11's connectivity row): the drain of her queue, the data library's
// `onlineManager` and the line that says she has no signal all read `subscribe`
// and `online`, so they can never disagree. `test/senal.test.ts` holds
// `expo-network` to this file.
//
// ⚠️ IT IS DELIBERATELY UNTESTABLE: it reaches `expo-network` and `react-native`,
// so no node suite can load it. The phone is its instrument — and on the Android
// emulator, airplane mode does not cut the local database: `adb reverse --remove`
// its port too (the plan's row).
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
import type { FlushStop } from '@/api/cola';

type Stop = () => void;

let conn: Conn = UNKNOWN;
let running = false;

/** The three timers, each armed from a pure selector and from nothing else. */
let settleTimer: ReturnType<typeof setTimeout> | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;

const watchers = new Set<(online: Online) => void>();

/** What a finished drain reports: how it stopped and how many sends landed. */
export interface Drained {
  readonly stop: FlushStop;
  readonly landed: number;
}

/** The one drain this monitor triggers — handed in by `start`, so the queue and this file never import each other. */
let drainer: (() => Promise<Drained>) | null = null;

const drainWatchers = new Set<(drained: Drained) => void>();

/**
 * What the app believes about the link. ⚠️ `null` until something has read the
 * network — no line may say she has no signal on a phone nobody looked at.
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
 * Every finished drain: how it stopped and how many sends landed — what lets the
 * provider read her reservations again once, after a drain, rather than after each
 * send. Returns its own unsubscribe.
 */
export function onDrain(watcher: (drained: Drained) => void): Stop {
  drainWatchers.add(watcher);
  return () => {
    drainWatchers.delete(watcher);
  };
}

/**
 * Something was just queued — drain it if the link is there.
 *
 * ⚠️⚠️ THIS IS THE ONLINE PATH'S OWN TRIGGER, AND WITHOUT IT THE ONLINE PATH IS
 * THE WORSE OF THE TWO: a reconnect drains and a wake drains, but a handover made
 * on a working connection by a fonda who never leaves the app has nothing else to
 * send it. Its caller is `@/lib/cola`'s `encolarEnvio`, and the provider's when the
 * login changes. ⚠️ Calling it while offline or before `start()` is a safe no-op.
 */
export function queued(): void {
  take({ kind: 'queued' });
}

/**
 * Start the signal and the drain it triggers.
 *
 * ⚠️ IDEMPOTENT, AND THAT MATTERS ON A ROUTER. React 19 in development mounts
 * effects twice; a second listener over one library is precisely what this
 * module exists to prevent, so a second `start()` is a no-op returning the same
 * stop.
 */
export function start(drain: () => Promise<Drained>): Stop {
  if (running) return stop;
  running = true;
  conn = UNKNOWN;
  drainer = drain;

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

  // ⚠️⚠️ THE WATCHERS ARE NOT CLEARED HERE (Wera, until 2026-10-20 they were, and
  // its `onlineManager` went deaf after the first restart). Each reader owns its own
  // unsubscribe; `take` is a no-op while stopped.
  return () => {
    netSub.remove();
    appSub.remove();
    disarm();
    running = false;
    conn = UNKNOWN;
    drainer = null;
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
  let drained: Drained;
  try {
    if (drainer === null) return;
    const report = await drainer();
    take({ kind: 'flushed', stop: report.stop });
    drained = { stop: report.stop, landed: report.landed };
  } catch {
    // ⚠️ `flush()` IS NOT SUPPOSED TO REJECT — every failure inside it is a
    // state change on a row. If it ever does, the queue still has to be tried
    // again, so it is treated as the transient failure it almost certainly is.
    take({ kind: 'flushed', stop: 'failed' });
    drained = { stop: 'failed', landed: 0 };
  }
  if (running) for (const watcher of drainWatchers) watcher(drained);
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
