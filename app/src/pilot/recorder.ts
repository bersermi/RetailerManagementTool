// ============================================================================
// THE PILOT'S RECORDER — the effects `@/pilot/readings` decides nothing about.
// Plan task `5P-a`; ADR-035 §5.
//
// It holds the clock, the visit on each capture screen, the readings not yet
// sent (on the phone's disk, so a shop offline all day loses none), and the one
// send in flight. ⚠️ EVERY EXPORT IS A NO-OP ON A BUILD MADE WITHOUT
// `EXPO_PUBLIC_PILOT` — the first line of each — so a store build pays one
// comparison per touch and records nothing.
//
// ⚠️⚠️ NOTHING HERE IS DRAWN. The decision maker ruled on 2026-09-28 that the
// shopkeeper's screens do not change (ruling 42); the only thing that ever
// shows a reading is the owner's panel, which reads them back from the server.
//
// ⚠️ THE CLOCK IS `performance.now()`, never `Date.now()`: a span measured
// across a wall-clock correction is not a span. Only `occurredAt` — WHEN it
// happened, for the owner's *today* — is wall-clock.
//
// WHAT THIS CANNOT SEE, said here rather than discovered:
//   * the cold open is timed from React Native's own start mark, which the
//     native launch before it does not include — so it UNDER-reports slightly;
//   * a launch sent to the background before Vender drew is not detected (no
//     `AppState` listener: that import is pinned at two owners), so such a
//     reading is long, and is dropped only past `LONGEST_SANE_MS`;
//   * the round trip is timed on whatever network the phone had — §5 says *on
//     wifi*, and nothing here knows which it was.
// ============================================================================

import { sendPilotReadings } from '@/api/calls';
import { droppable, SEND_BATCH } from '@/api/pilot';
import type { WriteKind } from '@/api/outbox';
import { newWriteId, nowIso } from '@/lib/ids';
import { PILOT_BUILD } from '@/lib/pilotFlag';
import { deviceStore, readKey, writeKey } from '@/lib/store';
import {
  committed as commitVisit,
  left,
  msOf,
  openVisit,
  tapped,
  type Emitted,
  type Kind,
  type Reading,
  type Screen,
  type Visit,
} from '@/pilot/readings';

const PENDING_KEY = 'wera.pilot.pending.v1';
const DEVICE_KEY = 'wera.pilot.device.v1';

/** Past this the oldest go: a phone that never gets signal must not fill its disk. */
const MOST_PENDING = 2000;

/** The screen each ledger write is committed from. A transfer has none yet. */
const SCREEN_OF: Readonly<Partial<Record<WriteKind, Screen>>> = {
  sale: 'vender',
  purchase: 'comprar',
  waste: 'desperdicio',
};

let context: { workspaceId: string | null; locationId: string | null } = {
  workspaceId: null,
  locationId: null,
};
const visits = new Map<Screen, Visit>();
const commitAt = new Map<Screen, number>();
let pending: Reading[] | null = null;
let sending = false;
let touchedSinceLaunch = false;
let opened = false;

function now(): number {
  return performance.now();
}

function loaded(): Reading[] {
  if (pending !== null) return pending;
  try {
    const raw = readKey(deviceStore(), PENDING_KEY);
    const parsed: unknown = raw === null ? [] : JSON.parse(raw);
    pending = Array.isArray(parsed) ? (parsed as Reading[]) : [];
  } catch {
    pending = [];
  }
  return pending;
}

function saved(next: Reading[]): void {
  pending = next.slice(-MOST_PENDING);
  writeKey(deviceStore(), PENDING_KEY, JSON.stringify(pending));
}

function deviceId(): string {
  const store = deviceStore();
  const known = readKey(store, DEVICE_KEY);
  if (known !== null && known !== '') return known;
  const made = newWriteId();
  writeKey(store, DEVICE_KEY, made);
  return made;
}

function record(kind: Kind, screen: Screen, value: number): void {
  if (context.workspaceId === null) return;
  saved([
    ...loaded(),
    {
      id: newWriteId(),
      workspaceId: context.workspaceId,
      locationId: context.locationId,
      kind,
      screen,
      value,
      occurredAt: nowIso(),
    },
  ]);
}

function emit(screen: Screen, emitted: Emitted): void {
  if (emitted !== null) record(emitted.kind, screen, emitted.value);
}

/** Which shop and store a reading is filed under. Set by the screen being measured. */
export function setContext(workspaceId: string | null, locationId: string | null): void {
  if (PILOT_BUILD === null) return;
  context = { workspaceId, locationId };
}

/** A capture screen gained focus: a visit starts. */
export function focus(screen: Screen): void {
  if (PILOT_BUILD === null) return;
  visits.set(screen, openVisit(screen));
}

/** A capture screen lost focus: the visit ends, abandoned or not. */
export function blur(screen: Screen): void {
  if (PILOT_BUILD === null) return;
  const visit = visits.get(screen);
  visits.delete(screen);
  if (visit !== undefined) emit(screen, left(visit));
}

/** A finger went down on a capture screen. */
export function touch(screen: Screen): void {
  if (PILOT_BUILD === null) return;
  const visit = visits.get(screen);
  if (visit !== undefined) visits.set(screen, tapped(visit));
}

/** A finger went down anywhere — so no later Vender is a cold open that nobody touched. */
export function touchedApp(): void {
  if (PILOT_BUILD === null) return;
  touchedSinceLaunch = true;
}

/** The commit gesture completed. Starts the confirmation clock and files the taps. */
export function commit(screen: Screen): void {
  if (PILOT_BUILD === null) return;
  commitAt.set(screen, now());
  const visit = visits.get(screen) ?? openVisit(screen);
  const { visit: next, emit: taps } = commitVisit(visit);
  visits.set(screen, next);
  emit(screen, taps);
}

/**
 * The confirmation was rendered. ⚠️ Stamped on the NEXT frame, so the span
 * includes the frame that put it on the glass — §5's *on-screen*, not
 * *in the tree*.
 */
export function confirmed(screen: Screen): void {
  if (PILOT_BUILD === null) return;
  const from = commitAt.get(screen);
  commitAt.delete(screen);
  if (from === undefined) return;
  requestAnimationFrame(() => {
    const ms = msOf(from, now());
    if (ms !== null) record('commit_ms', screen, ms);
  });
}

/**
 * Vender has drawn its catalog. Filed once per launch, and only when nothing
 * was touched first — a launch that went through Inicio measures a person, not
 * the app.
 */
export function venderReady(): void {
  if (PILOT_BUILD === null || opened) return;
  opened = true;
  if (touchedSinceLaunch) return;
  const start = (performance as unknown as { rnStartupTiming?: { startTime?: number | null } })
    .rnStartupTiming?.startTime;
  if (typeof start !== 'number') return;
  requestAnimationFrame(() => {
    const ms = msOf(start, now());
    if (ms !== null) record('open_ms', 'vender', ms);
  });
}

/** A ledger write landed. Its round trip is filed, and the phone is evidently online. */
export function landed(kind: WriteKind, ms: number): void {
  if (PILOT_BUILD === null) return;
  const screen = SCREEN_OF[kind];
  const value = msOf(0, ms);
  if (screen !== undefined && value !== null) record('round_trip_ms', screen, value);
  void send();
}

/**
 * Sends what is waiting, a batch at a time, and forgets what landed.
 *
 * ⚠️ A REFUSAL IS FORGOTTEN AND THE NETWORK IS NOT — `droppable`'s rule. One
 * send at a time: a second caller while one is out returns at once, and the
 * next landed write or launch picks up what is left.
 */
export async function send(): Promise<void> {
  if (PILOT_BUILD === null || sending) return;
  sending = true;
  try {
    for (;;) {
      const waiting = loaded();
      if (waiting.length === 0) return;
      const workspaceId = waiting[0].workspaceId;
      const batch = waiting.filter((one) => one.workspaceId === workspaceId).slice(0, SEND_BATCH);
      try {
        await sendPilotReadings(workspaceId, batch, deviceId(), PILOT_BUILD);
      } catch (error) {
        if (!droppable(error)) return;
      }
      const gone = new Set(batch.map((one) => one.id));
      saved(loaded().filter((one) => !gone.has(one.id)));
    }
  } finally {
    sending = false;
  }
}
